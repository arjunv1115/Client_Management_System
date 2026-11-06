import express from 'express';
import { all } from '../db/store.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ok } from '../utils/http.js';

const router = express.Router();
router.use(authRequired);

const pick = (row, fields) => Object.fromEntries(fields.map((field) => [field, row[field]]));

router.get('/options', asyncHandler((req, res) => {
  const orgId = req.user.org_id;
  const isClient = req.user.role === 'client';
  const clients = all('clients', (c) => c.org_id === orgId && !c.deleted_at
    && (!isClient || c.id === req.user.client_id));
  const projects = all('projects', (p) => p.org_id === orgId && !p.deleted_at
    && (!isClient || p.client_id === req.user.client_id));
  const team = all('team_members', (t) => t.org_id === orgId && t.status !== 'inactive');
  const profiles = all('profiles', (p) => p.org_id === orgId && p.status === 'active');

  ok(res, {
    clients: clients.map((c) => ({ ...pick(c, ['id', 'name', 'company', 'email', 'status', 'industry']), label: c.company || c.name })),
    projects: projects.map((p) => ({ ...pick(p, ['id', 'name', 'client_id', 'status', 'progress', 'deadline', 'budget']), label: p.name })),
    team: team.map((t) => ({ ...pick(t, ['id', 'name', 'email', 'role', 'designation', 'department', 'profile_id']), label: t.name })),
    profiles: profiles.map((p) => ({ id: p.id, name: p.name, email: p.email, role: p.role })),
    leadStages: all('lead_stages', (s) => s.org_id === orgId).sort((a, b) => a.position - b.position),
    projectStages: all('project_stages', (s) => s.org_id === orgId).sort((a, b) => a.position - b.position),
    taskColumns: all('task_columns', (c) => c.org_id === orgId).sort((a, b) => a.position - b.position),
    leadSources: all('lead_sources', (s) => s.org_id === orgId && s.active !== false),
    expenseCategories: all('expense_categories', (c) => c.org_id === orgId),
    revenueCategories: all('revenue_categories', (c) => c.org_id === orgId),
    plans: all('plans').sort((a, b) => a.position - b.position),
    roles: all('roles').sort((a, b) => b.level - a.level),
    teams: team.map((t) => t.department).filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i),
  });
}));

export default router;
