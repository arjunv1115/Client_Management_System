import express from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { all, find, getById, insert, update } from '../db/store.js';
import { authRequired, authorize } from '../middleware/auth.js';
import { asyncHandler, ok, created, ApiError } from '../utils/http.js';
import { ADMIN_ROLES, ROLES, ROLE_LABELS } from '../config/roles.js';
import { recordActivity, recordAudit, notify } from '../utils/audit.js';
import { getUsage } from '../utils/plan.js';
import { getPlanWidget } from '../services/analytics.js';

const router = express.Router();
router.use(authRequired, authorize(...ADMIN_ROLES));

function orgProfiles(user, orgId) {
  if (user.role === 'super_admin' && orgId) return all('profiles', (p) => p.org_id === orgId);
  return all('profiles', (p) => p.org_id === user.org_id);
}

router.get('/dashboard', asyncHandler((req, res) => {
  const orgs = req.user.role === 'super_admin' ? all('organizations') : all('organizations', (o) => o.id === req.user.org_id);
  const orgIds = new Set(orgs.map((o) => o.id));
  const paid = all('subscriptions', (s) => orgIds.has(s.org_id) && s.status === 'active');
  const revenue = all('billing_records', (b) => orgIds.has(b.org_id) && b.status === 'paid')
    .reduce((total, row) => total + Number(row.amount || 0), 0);
  const platformRevenue = all('payments', (p) => orgIds.has(p.org_id) && p.status === 'completed')
    .reduce((total, row) => total + Number(row.amount || 0), 0);
  const revenueByPlan = paid.reduce((acc, sub) => {
    acc[sub.plan_name] = (acc[sub.plan_name] || 0) + 1;
    return acc;
  }, {});
  const audit = all('audit_logs', (log) => orgIds.has(log.org_id))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, 10);

  ok(res, {
    stats: {
      organizations: orgs.length,
      users: all('profiles', (p) => orgIds.has(p.org_id)).length,
      activeUsers: all('profiles', (p) => orgIds.has(p.org_id) && p.status === 'active').length,
      activeSubscriptions: paid.length,
      billingRevenue: Math.round(revenue * 100) / 100,
      platformRevenue: Math.round(platformRevenue * 100) / 100,
      aiUsage: all('ai_usage_logs', (u) => orgIds.has(u.org_id)).length,
    },
    revenueByPlan: Object.entries(revenueByPlan).map(([name, value]) => ({ name, value })),
    recentAudit: audit,
    organizations: orgs,
    plan: getPlanWidget(req.user.org_id).usage,
  });
}));

router.get('/users', asyncHandler((req, res) => {
  let rows = orgProfiles(req.user, req.query.org_id);
  if (req.query.q) {
    const needle = String(req.query.q).toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(needle) || p.email.toLowerCase().includes(needle));
  }
  if (req.query.role) rows = rows.filter((p) => p.role === req.query.role);
  if (req.query.status) rows = rows.filter((p) => p.status === req.query.status);
  rows = rows
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .map(({ password_hash: _p, ...profile }) => ({
      ...profile,
      role_label: ROLE_LABELS[profile.role] || profile.role,
      last_login_at: profile.last_login_at || null,
    }));
  ok(res, rows, { pagination: { page: 1, limit: rows.length, total: rows.length, totalPages: 1 } });
}));

router.get('/users/:id', asyncHandler((req, res) => {
  const profile = getById('profiles', req.params.id);
  if (!profile || (req.user.role !== 'super_admin' && profile.org_id !== req.user.org_id)) {
    throw new ApiError(404, 'User not found.');
  }
  const { password_hash: _p, ...safe } = profile;
  ok(res, {
    user: { ...safe, role_label: ROLE_LABELS[safe.role] },
    memberships: all('organization_members', (m) => m.profile_id === safe.id),
    audit: all('audit_logs', (l) => l.user_id === safe.id).slice(-20),
    preferences: find('user_preferences', (p) => p.user_id === safe.id),
  });
}));

router.patch('/users/:id/status', asyncHandler((req, res) => {
  const profile = getById('profiles', req.params.id);
  if (!profile || (req.user.role !== 'super_admin' && profile.org_id !== req.user.org_id)) {
    throw new ApiError(404, 'User not found.');
  }
  if (profile.id === req.user.id) throw new ApiError(400, 'You cannot change your own account status.');
  if (profile.role === 'super_admin' && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Only a Super Admin can manage this account.');
  }
  const status = req.body.status;
  if (!['active', 'inactive', 'suspended'].includes(status)) throw new ApiError(400, 'Invalid status.');
  const updated = update('profiles', profile.id, { status });
  recordAudit({ orgId: profile.org_id, user: req.user, action: 'admin.user_status_changed', entity: 'profiles', entityId: profile.id, changes: { from: profile.status, to: status }, ip: req.ip });
  ok(res, updated);
}));

router.patch('/users/:id/role', asyncHandler((req, res) => {
  const profile = getById('profiles', req.params.id);
  if (!profile || (req.user.role !== 'super_admin' && profile.org_id !== req.user.org_id)) {
    throw new ApiError(404, 'User not found.');
  }
  const role = req.body.role;
  if (!ROLES.includes(role)) throw new ApiError(400, 'Invalid role.');
  if (profile.id === req.user.id) throw new ApiError(400, 'You cannot change your own role.');
  if (role === 'super_admin' && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Only a Super Admin can grant Super Admin access.');
  }
  if (profile.role === 'super_admin' && req.user.role !== 'super_admin') {
    throw new ApiError(403, 'Only a Super Admin can modify a Super Admin.');
  }
  const updated = update('profiles', profile.id, { role });
  all('organization_members', (m) => m.profile_id === profile.id)
    .forEach((m) => update('organization_members', m.id, { role }));
  const team = find('team_members', (t) => t.profile_id === profile.id && t.org_id === profile.org_id);
  if (team) update('team_members', team.id, { role });
  recordAudit({ orgId: profile.org_id, user: req.user, action: 'admin.user_role_changed', entity: 'profiles', entityId: profile.id, changes: { from: profile.role, to: role }, ip: req.ip });
  ok(res, updated);
}));

router.post('/invitations', asyncHandler((req, res) => {
  const { email, role = 'team_member', name = '' } = req.body || {};
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'A valid email is required.');
  if (!ROLES.includes(role) || role === 'super_admin') throw new ApiError(400, 'That role cannot be invited.');
  if (find('profiles', (p) => p.email.toLowerCase() === String(email).toLowerCase())) {
    throw new ApiError(409, 'A user with this email already exists.');
  }
  const token = crypto.randomBytes(20).toString('hex');
  const invitation = insert('invitations', {
    org_id: req.user.org_id, email: String(email).toLowerCase(), name, role,
    status: 'pending', token, invited_by: req.user.id,
  });
  recordAudit({ orgId: req.user.org_id, user: req.user, action: 'admin.invitation_sent', entity: 'invitations', entityId: invitation.id, changes: { email, role }, ip: req.ip });
  return created(res, {
    invitation,
    inviteLink: `${req.protocol}://${req.get('host')}/register?invite=${token}`,
    message: 'Invitation created. Share the invite link with your teammate.',
  });
}));

router.get('/invitations', asyncHandler((req, res) => {
  ok(res, all('invitations', (i) => i.org_id === req.user.org_id).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
}));

router.get('/roles', asyncHandler(async (_req, res) => {
  ok(res, {
    roles: all('roles').sort((a, b) => b.level - a.level),
    permissions: all('permissions'),
    rolePermissions: all('role_permissions'),
  });
}));

router.get('/permissions', asyncHandler(async (_req, res) => {
  ok(res, { permissions: all('permissions'), rolePermissions: all('role_permissions') });
}));

router.put('/roles/:role/permissions', asyncHandler((req, res) => {
  const role = req.params.role;
  if (!ROLES.includes(role)) throw new ApiError(404, 'Role not found.');
  if (role === 'super_admin') throw new ApiError(400, 'Super Admin permissions are fixed.');
  if (req.user.role !== 'super_admin' && req.user.role !== 'admin') throw new ApiError(403, 'Not allowed.');
  const codes = Array.isArray(req.body.permissions) ? req.body.permissions : [];
  const valid = new Set(all('permissions').map((p) => p.code));
  const next = codes.filter((code) => valid.has(code));
  all('role_permissions', (rp) => rp.role === role).forEach((rp) => {
    const index = all('role_permissions').findIndex((row) => row.id === rp.id);
    if (index >= 0) all('role_permissions').splice(index, 1);
  });
  next.forEach((permission) => insert('role_permissions', { role, permission }));
  recordAudit({ orgId: req.user.org_id, user: req.user, action: 'admin.role_permissions_updated', entity: 'role_permissions', entityId: role, changes: { permissions: next }, ip: req.ip });
  ok(res, { role, permissions: next });
}));

router.get('/ai-settings', asyncHandler((req, res) => {
  ok(res, all('ai_feature_settings', (s) => s.org_id === req.user.org_id));
}));

router.put('/ai-settings', asyncHandler((req, res) => {
  const updates = Array.isArray(req.body?.settings) ? req.body.settings : [];
  const results = [];
  updates.forEach((setting) => {
    const existing = find('ai_feature_settings', (s) => s.org_id === req.user.org_id && s.feature === setting.feature);
    if (existing) results.push(update('ai_feature_settings', existing.id, { enabled: Boolean(setting.enabled) }));
  });
  recordAudit({ orgId: req.user.org_id, user: req.user, action: 'admin.ai_settings_updated', entity: 'ai_feature_settings', entityId: null, changes: { updates }, ip: req.ip });
  ok(res, results);
}));

router.get('/audit-logs', asyncHandler((req, res) => {
  let rows = all('audit_logs', (log) => log.org_id === req.user.org_id || req.user.role === 'super_admin');
  if (req.query.action) rows = rows.filter((l) => l.action.includes(req.query.action));
  if (req.query.entity) rows = rows.filter((l) => l.entity === req.query.entity);
  if (req.query.user_id) rows = rows.filter((l) => l.user_id === req.query.user_id);
  rows.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const limit = Math.min(200, Number(req.query.limit) || 50);
  ok(res, rows.slice(0, limit), { pagination: { page: 1, limit, total: rows.length, totalPages: 1 } });
}));

router.get('/activity-logs', asyncHandler((req, res) => {
  const rows = all('activity_logs', (log) => log.org_id === req.user.org_id || req.user.role === 'super_admin')
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, Number(req.query.limit) || 50);
  ok(res, rows);
}));

router.get('/organizations', asyncHandler((req, res) => {
  if (req.user.role !== 'super_admin') throw new ApiError(403, 'Platform access required.');
  ok(res, all('organizations'));
}));

router.get('/usage', asyncHandler((req, res) => {
  ok(res, { usage: getUsage(req.user.org_id), plan: getPlanWidget(req.user.org_id) });
}));

export default router;
