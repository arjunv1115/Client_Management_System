import { all, find, getById, insert, table } from '../db/store.js';
import { ApiError } from './http.js';

const LIMIT_LABELS = {
  clients: 'clients',
  projects: 'projects',
  teammates: 'team members',
  leads: 'active leads',
  ai_quotes: 'AI quotations this month',
  ai_requests: 'AI requests this month',
  storage_mb: 'storage',
};

export function getSubscription(orgId) {
  return find('subscriptions', (s) => s.org_id === orgId && s.status === 'active')
    || all('subscriptions', (s) => s.org_id === orgId).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0]
    || null;
}

export function getPlan(orgId) {
  const subscription = getSubscription(orgId);
  if (!subscription) return find('plans', (p) => p.id === 'plan_free');
  return getById('plans', subscription.plan_id) || find('plans', (p) => p.id === 'plan_free');
}

export function monthlyCount(tableName, orgId, dateField = 'created_at', filter = () => true) {
  const prefix = new Date().toISOString().slice(0, 7);
  return all(tableName, (row) =>
    row.org_id === orgId && !row.deleted_at && filter(row) && String(row[dateField] || '').slice(0, 7) === prefix,
  ).length;
}

export function getUsage(orgId) {
  const active = (row) => !row.deleted_at;
  const storageBytes = all('documents', (d) => d.org_id === orgId && active(d))
    .reduce((sum, d) => sum + Number(d.file_size || 0), 0);
  return {
    clients: all('clients', (c) => c.org_id === orgId && active(c)).length,
    projects: all('projects', (p) => p.org_id === orgId && active(p)).length,
    teammates: all('team_members', (t) => t.org_id === orgId && t.status !== 'inactive').length,
    leads: all('leads', (l) => l.org_id === orgId && active(l) && l.status === 'open').length,
    storage_mb: Math.round((storageBytes / (1024 * 1024)) * 10) / 10,
    ai_quotes: monthlyCount('ai_usage_logs', orgId, 'created_at', (row) => row.feature === 'quotation_builder'),
    ai_requests: monthlyCount('ai_usage_logs', orgId),
  };
}

export function enforcePlanLimit(orgId, resource) {
  const plan = getPlan(orgId);
  const limit = plan?.limits?.[resource];
  if (limit === undefined || limit === null || Number(limit) < 0) return;
  const usage = getUsage(orgId)[resource] ?? 0;
  if (usage >= Number(limit)) {
    throw new ApiError(
      403,
      `Plan limit reached for ${LIMIT_LABELS[resource] || resource}. You are using ${usage} of ${limit}. Upgrade your plan to continue.`,
      { code: 'PLAN_LIMIT', resource, usage, limit, plan: plan?.name },
    );
  }
  if (usage + 1 >= Number(limit) * 0.8) {
    const existing = table('notifications').some(
      (n) => n.org_id === orgId && n.type === 'plan_limit' && n.message?.includes(resource) && !n.is_read,
    );
    if (!existing) {
      insert('notifications', {
        org_id: orgId,
        user_id: null,
        type: 'plan_limit',
        title: 'Approaching plan limit',
        message: `You are close to your ${LIMIT_LABELS[resource] || resource} limit (${usage}/${limit}).`,
        link: '/plans',
        is_read: false,
      });
    }
  }
}

export function getAiUsage(orgId) {
  const plan = getPlan(orgId);
  const usage = getUsage(orgId);
  return {
    plan: plan?.name || 'Free',
    ai_requests: { used: usage.ai_requests, limit: plan?.limits?.ai_requests ?? 25 },
    ai_quotes: { used: usage.ai_quotes, limit: plan?.limits?.ai_quotes ?? 3 },
    storage_mb: { used: usage.storage_mb, limit: plan?.limits?.storage_mb ?? 100 },
    clients: { used: usage.clients, limit: plan?.limits?.clients ?? 3 },
    projects: { used: usage.projects, limit: plan?.limits?.projects ?? 5 },
    teammates: { used: usage.teammates, limit: plan?.limits?.teammates ?? 1 },
    leads: { used: usage.leads, limit: plan?.limits?.leads ?? 20 },
  };
}

export function assertAiAllowed(orgId, feature, { quota = false } = {}) {
  const setting = find('ai_feature_settings', (s) => s.org_id === orgId && s.feature === feature);
  if (setting && setting.enabled === false) {
    throw new ApiError(403, 'This AI feature is disabled for your organization. Contact an administrator.');
  }
  const plan = getPlan(orgId);
  const usage = getUsage(orgId);
  if (quota && Number(plan?.limits?.ai_quotes) >= 0 && usage.ai_quotes >= Number(plan.limits.ai_quotes)) {
    throw new ApiError(403, `You have used all ${plan.limits.ai_quotes} AI quotations included in the ${plan.name} plan this month.`, {
      code: 'AI_QUOTE_LIMIT',
      used: usage.ai_quotes,
      limit: plan.limits.ai_quotes,
    });
  }
  if (Number(plan?.limits?.ai_requests) >= 0 && usage.ai_requests >= Number(plan.limits.ai_requests)) {
    throw new ApiError(403, `You have reached the AI request limit for the ${plan.name} plan this month.`, {
      code: 'AI_LIMIT',
      used: usage.ai_requests,
      limit: plan.limits.ai_requests,
    });
  }
}
