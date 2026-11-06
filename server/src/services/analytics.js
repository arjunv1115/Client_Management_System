import { all, find, getById, table } from '../db/store.js';
import { getAiUsage, getPlan, getSubscription, getUsage } from '../utils/plan.js';

const DAY_MS = 86400000;
const isoDay = (date) => new Date(date).toISOString().slice(0, 10);
const today = () => isoDay(new Date());

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}
function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
function shiftDays(date, amount) {
  const d = new Date(date);
  d.setDate(d.getDate() + amount);
  return d;
}

export function resolveRange(query = {}) {
  const now = new Date();
  const range = query.range || '30d';
  let start;
  let end;
  let label;

  switch (range) {
    case 'today':
      start = now; end = now; label = 'Today'; break;
    case 'yesterday':
      start = shiftDays(now, -1); end = start; label = 'Yesterday'; break;
    case '7d':
      start = shiftDays(now, -6); end = now; label = 'Last 7 days'; break;
    case '30d':
      start = shiftDays(now, -29); end = now; label = 'Last 30 days'; break;
    case 'week':
      start = shiftDays(now, -((now.getDay() + 6) % 7)); end = now; label = 'This week'; break;
    case 'this_month':
      start = startOfMonth(now); end = now; label = 'This month'; break;
    case 'last_month':
      start = startOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      end = endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      label = 'Last month'; break;
    case 'this_year':
      start = new Date(now.getFullYear(), 0, 1); end = now; label = 'This year'; break;
    case 'custom':
      start = query.start ? new Date(query.start) : startOfMonth(now);
      end = query.end ? new Date(query.end) : now;
      label = 'Custom range'; break;
    case 'all':
    default:
      start = null; end = now; label = 'All time'; break;
  }

  const startKey = start ? isoDay(start) : null;
  const endKey = end ? isoDay(end) : today();

  let previousStart = null;
  let previousEnd = null;
  if (start) {
    const span = Math.max(1, Math.round((new Date(endKey) - new Date(startKey)) / DAY_MS) + 1);
    previousEnd = isoDay(shiftDays(new Date(startKey), -1));
    previousStart = isoDay(shiftDays(new Date(previousEnd), -(span - 1)));
  }

  return { key: range, label, start: startKey, end: endKey, previousStart, previousEnd };
}

export function inRange(value, start, end) {
  if (!value) return false;
  const key = isoDay(value);
  if (start && key < start) return false;
  if (end && key > end) return false;
  return true;
}

const sum = (rows, pick) => rows.reduce((total, row) => total + Number(pick(row) || 0), 0);
const byOrg = (tableName, orgId) => all(tableName, (row) => row.org_id === orgId && !row.deleted_at);
const percent = (current, previous) => {
  if (previous === 0 || previous == null) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 1000) / 10;
};
const money = (value) => Math.round(Number(value || 0) * 100) / 100;

function orgTransactions(orgId) {
  return byOrg('transactions', orgId);
}
function completedIncome(orgId, range) {
  return orgTransactions(orgId).filter((t) =>
    t.type === 'income' && t.status === 'completed' && inRange(t.transaction_date, range.start, range.end));
}
function completedExpenses(orgId, range) {
  return orgTransactions(orgId).filter((t) =>
    t.type === 'expense' && t.status === 'completed' && inRange(t.transaction_date, range.start, range.end));
}

export function getFinancials(orgId, range) {
  const org = getById('organizations', orgId);
  const income = completedIncome(orgId, range);
  const expenses = completedExpenses(orgId, range);
  const revenue = money(sum(income, (t) => t.amount));
  const expenseTotal = money(sum(expenses, (t) => t.amount));
  const allTime = orgTransactions(orgId).filter((t) => t.status === 'completed');
  const cumulativeIncome = sum(allTime.filter((t) => t.type === 'income'), (t) => t.amount);
  const cumulativeExpenses = sum(allTime.filter((t) => t.type === 'expense'), (t) => t.amount);
  const moneyInAccount = money(Number(org?.opening_balance || 0) + cumulativeIncome - cumulativeExpenses);
  return { revenue, expenses: expenseTotal, netRevenue: money(revenue - expenseTotal), moneyInAccount, income, expensesRows: expenses };
}

function monthlySeries(orgId, months = 6) {
  const now = new Date();
  const buckets = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    buckets.push({
      key,
      month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      revenue: 0,
      expenses: 0,
      net: 0,
    });
  }
  const map = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  orgTransactions(orgId).filter((t) => t.status === 'completed').forEach((transaction) => {
    const key = String(transaction.transaction_date || '').slice(0, 7);
    const bucket = map.get(key);
    if (!bucket) return;
    if (transaction.type === 'income') bucket.revenue += Number(transaction.amount || 0);
    else bucket.expenses += Number(transaction.amount || 0);
  });
  buckets.forEach((bucket) => {
    bucket.revenue = money(bucket.revenue);
    bucket.expenses = money(bucket.expenses);
    bucket.net = money(bucket.revenue - bucket.expenses);
  });
  return buckets;
}

export function getSummary(orgId, range) {
  const leads = byOrg('leads', orgId);
  const clients = byOrg('clients', orgId);
  const projects = byOrg('projects', orgId);
  const tasks = byOrg('tasks', orgId);
  const payments = byOrg('payments', orgId);
  const retainers = byOrg('retainers', orgId);
  const team = byOrg('team_members', orgId);
  const todayKey = today();

  const inPeriod = (rows, field = 'created_at') => rows.filter((row) => inRange(row[field], range.start, range.end));
  const prevPeriod = (rows, field = 'created_at') => rows.filter((row) =>
    inRange(row[field], range.previousStart, range.previousEnd));

  const financials = getFinancials(orgId, range);
  const prevFinancials = range.previousStart
    ? getFinancials(orgId, { start: range.previousStart, end: range.previousEnd })
    : { revenue: 0, expenses: 0, netRevenue: 0 };

  const activeRetainers = retainers.filter((r) => r.status === 'active');
  const cycleFactor = (cycle) => (cycle === 'quarterly' ? 1 / 3 : cycle === 'yearly' ? 1 / 12 : 1);
  const mrr = money(sum(activeRetainers, (r) => Number(r.monthly_amount || 0) * cycleFactor(r.billing_cycle)));

  const openTasks = tasks.filter((t) => t.status !== 'Completed');
  const completedTasks = tasks.filter((t) => t.status === 'Completed');
  const overdueTasks = openTasks.filter((t) => t.due_date && t.due_date < todayKey);
  const paymentsReceived = money(sum(
    payments.filter((p) => p.status === 'completed' && inRange(p.payment_date, range.start, range.end)),
    (p) => p.amount,
  ));
  const prevPaymentsReceived = money(sum(
    payments.filter((p) => p.status === 'completed' && inRange(p.payment_date, range.previousStart, range.previousEnd)),
    (p) => p.amount,
  ));
  const pendingPayments = money(sum(payments.filter((p) => p.status === 'pending'), (p) => p.amount));

  const stats = {
    totalLeads: leads.length,
    newLeads: inPeriod(leads, 'created_at').length,
    openLeads: leads.filter((l) => l.status === 'open').length,
    totalClients: clients.length,
    newClients: inPeriod(clients, 'created_at').length,
    totalProjects: projects.length,
    newProjects: inPeriod(projects, 'created_at').length,
    ongoingProjects: projects.filter((p) => p.status === 'ongoing').length,
    completedProjects: projects.filter((p) => p.status === 'completed').length,
    totalRevenue: financials.revenue,
    totalExpenses: financials.expenses,
    netRevenue: financials.netRevenue,
    moneyInAccount: financials.moneyInAccount,
    paymentsReceived,
    pendingPayments,
    mrr,
    activeRetainers: activeRetainers.length,
    teamMembers: team.filter((t) => t.status === 'active').length,
    totalTasks: tasks.length,
    openTasks: openTasks.length,
    completedTasks: completedTasks.length,
    overdueTasks: overdueTasks.length,
    totalBudget: money(sum(projects, (p) => p.budget)),
    totalPaid: money(sum(projects, (p) => p.amount_paid)),
  };

  const comparison = {
    revenue: percent(financials.revenue, prevFinancials.revenue),
    expenses: percent(financials.expenses, prevFinancials.expenses),
    netRevenue: percent(financials.netRevenue, prevFinancials.netRevenue),
    paymentsReceived: percent(paymentsReceived, prevPaymentsReceived),
    newLeads: percent(inPeriod(leads, 'created_at').length, prevPeriod(leads, 'created_at').length),
    newClients: percent(inPeriod(clients, 'created_at').length, prevPeriod(clients, 'created_at').length),
    newProjects: percent(inPeriod(projects, 'created_at').length, prevPeriod(projects, 'created_at').length),
    previous: { revenue: prevFinancials.revenue, expenses: prevFinancials.expenses, netRevenue: prevFinancials.netRevenue, paymentsReceived: prevPaymentsReceived },
  };

  const currentMonth = new Date().toISOString().slice(0, 7);
  const previousMonth = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().slice(0, 7);
  const monthIncome = (key) => money(sum(
    orgTransactions(orgId).filter((t) => t.type === 'income' && t.status === 'completed' && String(t.transaction_date).startsWith(key)),
    (t) => t.amount,
  ));

  return {
    range,
    stats,
    comparison,
    transactions: {
      received: financials.revenue,
      revenue: financials.revenue,
      expenses: financials.expenses,
      moneyInAccount: financials.moneyInAccount,
      currentMonth: monthIncome(currentMonth),
      previousMonth: monthIncome(previousMonth),
      monthChange: percent(monthIncome(currentMonth), monthIncome(previousMonth)),
      history: monthlySeries(orgId, 6),
      pendingPayments,
    },
  };
}

export function getSalesPipeline(orgId) {
  const stages = all('lead_stages', (s) => s.org_id === orgId).sort((a, b) => a.position - b.position);
  const leads = byOrg('leads', orgId);
  const openStages = new Set(stages.filter((s) => !['Won', 'Lost'].includes(s.name)).map((s) => s.id));
  const pipelineLeads = leads.filter((l) => l.status === 'open');
  const byStage = stages.map((stage) => {
    const rows = leads.filter((l) => l.stage_id === stage.id);
    return {
      id: stage.id,
      name: stage.name,
      color: stage.color,
      count: rows.length,
      value: money(sum(rows, (l) => l.estimated_budget)),
      open: openStages.has(stage.id),
    };
  });
  const won = leads.filter((l) => l.status === 'won').length;
  const lost = leads.filter((l) => l.status === 'lost').length;
  const totalValue = money(sum(pipelineLeads, (l) => l.estimated_budget));
  return {
    totalValue,
    totalLeads: leads.length,
    openLeads: pipelineLeads.length,
    won,
    lost,
    conversionRate: won + lost ? Math.round((won / (won + lost)) * 1000) / 10 : 0,
    byStage,
    inactiveLeads: pipelineLeads.filter((l) => {
      const last = new Date(l.updated_at || l.created_at || today());
      return (Date.now() - last.getTime()) / DAY_MS > 7;
    }).length,
  };
}

function revenueCategoriesFor(orgId) {
  const configured = all('revenue_categories', (c) => c.org_id === orgId).map((c) => c.name);
  return configured.length ? configured : ['Project Revenue', 'Monthly Retainer Revenue', 'Consultation Revenue', 'Service Revenue', 'Maintenance Revenue', 'Other Revenue'];
}

export function getRevenueByType(orgId, range) {
  const income = completedIncome(orgId, range);
  const categories = revenueCategoriesFor(orgId);
  const total = sum(income, (t) => t.amount);
  return categories.map((category) => {
    const rows = income.filter((t) => (t.revenue_category || 'Other Revenue') === category);
    const amount = money(sum(rows, (t) => t.amount));
    return {
      category,
      amount,
      transactions: rows.length,
      percentage: total ? Math.round((amount / total) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.amount - a.amount);
}

export function getRevenueTrend(orgId, months = 6) {
  const series = monthlySeries(orgId, Math.min(24, Math.max(1, Number(months) || 6)));
  const growth = series.length > 1 ? percent(series[series.length - 1].revenue, series[series.length - 2].revenue) : 0;
  return { series, growth, total: money(sum(series, (s) => s.revenue)) };
}

export function getRevenueOverview(orgId, range) {
  const financials = getFinancials(orgId, range);
  const byType = getRevenueByType(orgId, range);
  const monthly = monthlySeries(orgId, 6);
  const previous = range.previousStart
    ? getFinancials(orgId, { start: range.previousStart, end: range.previousEnd })
    : { revenue: 0, expenses: 0, netRevenue: 0 };
  return {
    revenue: financials.revenue,
    expenses: financials.expenses,
    netRevenue: financials.netRevenue,
    growth: percent(financials.revenue, previous.revenue),
    breakdown: byType,
    history: monthly,
  };
}

export function getProjectStatus(orgId) {
  const projects = byOrg('projects', orgId);
  const statuses = [
    { name: 'New', color: '#6366f1' },
    { name: 'Ongoing', color: '#0ea5e9' },
    { name: 'Completed', color: '#10b981' },
  ];
  return statuses.map((status) => {
    const rows = projects.filter((p) => String(p.status).toLowerCase() === status.name.toLowerCase());
    return { ...status, value: rows.length, budget: money(sum(rows, (p) => p.budget)) };
  });
}

export function getLeadSources(orgId) {
  const leads = byOrg('leads', orgId);
  const sources = [...new Set(leads.map((l) => l.source || 'Other'))];
  return sources.map((source) => {
    const rows = leads.filter((l) => (l.source || 'Other') === source);
    const won = rows.filter((l) => l.status === 'won').length;
    return {
      source,
      leads: rows.length,
      value: money(sum(rows, (l) => l.estimated_budget)),
      won,
      conversion: rows.length ? Math.round((won / rows.length) * 1000) / 10 : 0,
    };
  }).sort((a, b) => b.leads - a.leads);
}

export function getClientGrowth(orgId, months = 6) {
  const now = new Date();
  const clients = byOrg('clients', orgId);
  const buckets = [];
  let cumulative = clients.filter((c) => isoDay(c.created_at) < `${new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).toISOString().slice(0, 7)}-01`).length;
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const added = clients.filter((c) => String(c.created_at).slice(0, 7) === key).length;
    cumulative += added;
    buckets.push({
      key,
      month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      added,
      total: cumulative,
    });
  }
  return buckets;
}

export function getPaymentHistory(orgId, months = 6) {
  const payments = byOrg('payments', orgId);
  const now = new Date();
  const buckets = [];
  for (let index = months - 1; index >= 0; index -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const rows = payments.filter((p) => String(p.payment_date || '').slice(0, 7) === key);
    buckets.push({
      key,
      month: date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      received: money(sum(rows.filter((p) => p.status === 'completed'), (p) => p.amount)),
      pending: money(sum(rows.filter((p) => p.status === 'pending'), (p) => p.amount)),
      failed: money(sum(rows.filter((p) => p.status === 'failed'), (p) => p.amount)),
    });
  }
  return buckets;
}

export function getRecentClients(orgId, limit = 5) {
  const projects = byOrg('projects', orgId);
  return byOrg('clients', orgId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit)
    .map((client) => ({
      ...client,
      project_count: projects.filter((p) => p.client_id === client.id).length,
      ongoing_count: projects.filter((p) => p.client_id === client.id && p.status === 'ongoing').length,
    }));
}

export function getReminders(orgId) {
  const reminders = byOrg('reminders', orgId).sort((a, b) =>
    `${a.reminder_date}${a.reminder_time}`.localeCompare(`${b.reminder_date}${b.reminder_time}`));
  const todayKey = today();
  const pending = reminders.filter((r) => r.status === 'pending');
  return {
    upcoming: pending.filter((r) => r.reminder_date >= todayKey).slice(0, 8),
    today: pending.filter((r) => r.reminder_date === todayKey),
    overdue: pending.filter((r) => r.reminder_date < todayKey),
    completed: reminders.filter((r) => r.status === 'completed').slice(0, 8),
    all: reminders,
  };
}

export function getActiveRetainers(orgId) {
  const clients = byOrg('clients', orgId);
  const factor = (cycle) => (cycle === 'quarterly' ? 1 / 3 : cycle === 'yearly' ? 1 / 12 : 1);
  return byOrg('retainers', orgId)
    .filter((r) => r.status === 'active')
    .map((retainer) => ({
      ...retainer,
      client_name: clients.find((c) => c.id === retainer.client_id)?.name || 'Client',
      monthly_equivalent: money(Number(retainer.monthly_amount || 0) * factor(retainer.billing_cycle)),
    }));
}

export function getRecentActivity(orgId, limit = 8) {
  return all('activity_logs', (log) => log.org_id === orgId)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}

export function getUpcomingMeetings(orgId, limit = 5) {
  const clients = byOrg('clients', orgId);
  const todayKey = today();
  return byOrg('meetings', orgId)
    .filter((m) => m.meeting_date >= todayKey && m.status === 'scheduled')
    .sort((a, b) => `${a.meeting_date}${a.start_time}`.localeCompare(`${b.meeting_date}${b.start_time}`))
    .slice(0, limit)
    .map((meeting) => ({ ...meeting, client_name: clients.find((c) => c.id === meeting.client_id)?.name || '' }));
}

export function getUpcomingTasks(orgId, limit = 6) {
  const projects = byOrg('projects', orgId);
  return byOrg('tasks', orgId)
    .filter((t) => t.status !== 'Completed')
    .sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')))
    .slice(0, limit)
    .map((task) => ({ ...task, project_name: projects.find((p) => p.id === task.project_id)?.name || '' }));
}

export function getRecentNotifications(orgId, userId, limit = 6) {
  return all('notifications', (n) => n.org_id === orgId && (n.user_id === null || n.user_id === userId))
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, limit);
}

export function getPlanWidget(orgId) {
  const subscription = getSubscription(orgId);
  const plan = getPlan(orgId);
  return {
    subscription,
    plan,
    usage: getAiUsage(orgId),
    history: all('subscription_payments', (p) => p.org_id === orgId).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))),
  };
}

export function getDashboardWidgets(orgId, range, user) {
  return {
    pipeline: getSalesPipeline(orgId),
    revenueByType: getRevenueByType(orgId, range),
    revenueTrend: getRevenueTrend(orgId, 6),
    revenueOverview: getRevenueOverview(orgId, range),
    projectStatus: getProjectStatus(orgId),
    leadSources: getLeadSources(orgId),
    clientGrowth: getClientGrowth(orgId, 6),
    paymentHistory: getPaymentHistory(orgId, 6),
    recentClients: getRecentClients(orgId, 5),
    reminders: getReminders(orgId),
    activeRetainers: getActiveRetainers(orgId),
    recentActivity: getRecentActivity(orgId, 8),
    upcomingMeetings: getUpcomingMeetings(orgId, 5),
    upcomingTasks: getUpcomingTasks(orgId, 6),
    notifications: getRecentNotifications(orgId, user.id, 6),
    plan: getPlanWidget(orgId),
  };
}

export function getModuleStats(orgId, user = null) {
  const leads = byOrg('leads', orgId);
  const clients = byOrg('clients', orgId);
  const projects = byOrg('projects', orgId);
  const tasks = byOrg('tasks', orgId);
  const payments = byOrg('payments', orgId);
  const team = byOrg('team_members', orgId);
  const documents = byOrg('documents', orgId);
  const meetings = byOrg('meetings', orgId);
  const retainers = byOrg('retainers', orgId);
  const payroll = byOrg('payroll', orgId);
  const billing = byOrg('billing_records', orgId);
  const usage = getUsage(orgId);
  const todayKey = today();

  const payrollTotal = money(sum(payroll, (p) => p.net_salary));
  const month = new Date().toISOString().slice(0, 7);
  return {
    leads: {
      total: leads.length, open: leads.filter((l) => l.status === 'open').length,
      won: leads.filter((l) => l.status === 'won').length,
      value: money(sum(leads.filter((l) => l.status === 'open'), (l) => l.estimated_budget)),
      conversion: leads.filter((l) => ['won', 'lost'].includes(l.status)).length
        ? Math.round((leads.filter((l) => l.status === 'won').length / leads.filter((l) => ['won', 'lost'].includes(l.status)).length) * 100) : 0,
    },
    clients: {
      total: clients.length, active: clients.filter((c) => c.status === 'active').length,
      projects: projects.length, ongoing: projects.filter((p) => p.status === 'ongoing').length,
    },
    projects: {
      total: projects.length, ongoing: projects.filter((p) => p.status === 'ongoing').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      budget: money(sum(projects, (p) => p.budget)), paid: money(sum(projects, (p) => p.amount_paid)),
      remaining: money(sum(projects, (p) => Number(p.budget || 0) - Number(p.amount_paid || 0))),
    },
    retainers: {
      active: retainers.filter((r) => r.status === 'active').length,
      mrr: money(sum(retainers.filter((r) => r.status === 'active'), (r) => r.monthly_amount)),
      total: retainers.length,
      pending: retainers.filter((r) => r.payment_status === 'pending').length,
      expiring: retainers.filter((r) => r.end_date && r.end_date <= isoDay(shiftDays(new Date(), 30))).length,
    },
    payments: {
      received: money(sum(payments.filter((p) => p.status === 'completed'), (p) => p.amount)),
      pending: money(sum(payments.filter((p) => p.status === 'pending'), (p) => p.amount)),
      failed: payments.filter((p) => p.status === 'failed').length,
      refunded: money(sum(payments.filter((p) => p.status === 'refunded'), (p) => p.amount)),
      count: payments.length,
    },
    transactions: getFinancials(orgId, { start: null, end: todayKey }),
    expenses: {
      total: money(sum(byOrg('expenses', orgId), (e) => e.amount)),
      count: byOrg('expenses', orgId).length,
      recurring: byOrg('expenses', orgId).filter((e) => e.recurring).length,
    },
    payroll: {
      employees: new Set(payroll.map((p) => p.member_id)).size,
      total: payrollTotal,
      paid: money(sum(payroll.filter((p) => p.status === 'paid'), (p) => p.net_salary)),
      pending: money(sum(payroll.filter((p) => p.status === 'pending'), (p) => p.net_salary)),
      currentMonth: money(sum(payroll.filter((p) => p.month === month), (p) => p.net_salary)),
    },
    tasks: {
      total: tasks.length, open: tasks.filter((t) => t.status !== 'Completed').length,
      completed: tasks.filter((t) => t.status === 'Completed').length,
      overdue: tasks.filter((t) => t.status !== 'Completed' && t.due_date && t.due_date < todayKey).length,
      mine: tasks.filter((t) => t.status !== 'Completed' && t.assigned_to === user?.id).length,
    },
    documents: {
      total: documents.length, shared: documents.filter((d) => d.shared_with_client).length,
      storage: usage.storage_mb,
    },
    team: {
      total: team.length, active: team.filter((t) => t.status === 'active').length,
      inactive: team.filter((t) => t.status === 'inactive').length,
      pending: team.filter((t) => t.status === 'invited' || t.status === 'pending').length,
    },
    meetings: {
      total: meetings.length,
      upcoming: meetings.filter((m) => m.meeting_date >= todayKey && m.status === 'scheduled').length,
      today: meetings.filter((m) => m.meeting_date === todayKey).length,
      completed: meetings.filter((m) => m.status === 'completed').length,
    },
    billing: {
      total: money(sum(billing, (b) => b.amount)),
      paid: money(sum(billing.filter((b) => b.status === 'paid'), (b) => b.amount)),
      pending: money(sum(billing.filter((b) => b.status === 'pending'), (b) => b.amount)),
      failed: billing.filter((b) => b.status === 'failed').length,
      records: billing.length,
    },
    plans: getPlanWidget(orgId).usage,
  };
}

export function getPortalDashboard(orgId, clientId) {
  const projects = byOrg('projects', orgId).filter((p) => p.client_id === clientId);
  const documents = byOrg('documents', orgId).filter((d) => d.client_id === clientId && d.shared_with_client);
  const invoices = byOrg('payments', orgId).filter((p) => p.client_id === clientId);
  const announcements = all('announcements', (a) => a.org_id === orgId && a.status === 'published'
    && (a.client_id === null || a.client_id === clientId));
  const activities = all('client_activities', (a) => a.org_id === orgId && a.client_id === clientId);
  const meetings = byOrg('meetings', orgId).filter((m) => m.client_id === clientId);
  return {
    client: getById('clients', clientId),
    projects,
    documents,
    invoices,
    announcements,
    activities: activities.sort((a, b) => String(b.activity_date).localeCompare(String(a.activity_date))).slice(0, 6),
    meetings: meetings.sort((a, b) => String(a.meeting_date).localeCompare(String(b.meeting_date))).slice(0, 5),
    summary: {
      projects: projects.length,
      ongoing: projects.filter((p) => p.status === 'ongoing').length,
      completed: projects.filter((p) => p.status === 'completed').length,
      documents: documents.length,
      pendingInvoices: money(sum(invoices.filter((i) => i.status === 'pending'), (i) => i.amount)),
      invoiceCount: invoices.length,
    },
  };
}
