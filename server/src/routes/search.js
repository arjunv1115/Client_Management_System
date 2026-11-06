import express from 'express';
import { all, getById } from '../db/store.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ok } from '../utils/http.js';

const router = express.Router();
router.use(authRequired);

router.get('/', asyncHandler((req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  const orgId = req.user.org_id;
  if (query.length < 2) return ok(res, { results: [], groups: [] });

  const isClient = req.user.role === 'client';
  const clientId = req.user.client_id;
  const match = (value) => String(value || '').toLowerCase().includes(query);

  const groups = [];

  if (!isClient) {
    groups.push({
      module: 'Leads', type: 'leads', items: all('leads', (l) => l.org_id === orgId && !l.deleted_at
        && (match(l.name) || match(l.company) || match(l.email) || match(l.phone)))
        .slice(0, 5)
        .map((l) => ({ id: l.id, title: l.name, subtitle: l.company, link: `/leads/${l.id}` })),
    });
  }

  const clients = all('clients', (c) => c.org_id === orgId && !c.deleted_at
    && (match(c.name) || match(c.company) || match(c.email) || match(c.phone)));
  if (clients.length) {
    groups.push({
      module: 'Clients', type: 'clients',
      items: (isClient ? clients.filter((c) => c.id === clientId) : clients).slice(0, 5)
        .map((c) => ({ id: c.id, title: c.name, subtitle: c.company, link: `/clients/${c.id}` })),
    });
  }

  groups.push({
    module: 'Projects', type: 'projects', items: all('projects', (p) => p.org_id === orgId && !p.deleted_at
      && (!isClient || p.client_id === clientId) && (match(p.name) || match(p.category)))
      .slice(0, 5)
      .map((p) => ({ id: p.id, title: p.name, subtitle: p.category, link: `/projects/${p.id}` })),
  });

  if (!isClient) {
    groups.push({
      module: 'Tasks', type: 'tasks', items: all('tasks', (t) => t.org_id === orgId && !t.deleted_at
        && (match(t.title) || match(t.description)))
        .slice(0, 5)
        .map((t) => ({ id: t.id, title: t.title, subtitle: t.status, link: '/tasks' })),
    });
  }

  groups.push({
    module: 'Documents', type: 'documents', items: all('documents', (d) => d.org_id === orgId && !d.deleted_at
      && (!isClient || (d.client_id === clientId && d.shared_with_client)) && (match(d.name) || match(d.category)))
      .slice(0, 5)
      .map((d) => ({ id: d.id, title: d.name, subtitle: d.category, link: '/documents' })),
  });

  if (!isClient) {
    groups.push({
      module: 'Meetings', type: 'meetings', items: all('meetings', (m) => m.org_id === orgId && !m.deleted_at
        && (match(m.title) || match(m.agenda)))
        .slice(0, 5)
        .map((m) => ({ id: m.id, title: m.title, subtitle: m.meeting_date, link: '/meetings' })),
    });
  }

  const cleaned = groups.filter((group) => group.items.length);
  const results = cleaned.flatMap((group) => group.items.map((item) => ({ ...item, module: group.module, type: group.type })));
  ok(res, { results, groups: cleaned, query });
}));

router.get('/entity/:type/:id', asyncHandler((req, res) => {
  const { type, id } = req.params;
  const allowed = ['leads', 'clients', 'projects', 'tasks', 'meetings', 'documents'];
  if (!allowed.includes(type)) return ok(res, { entity: null });
  const row = getById(type, id);
  if (!row || row.org_id !== req.user.org_id) return ok(res, { entity: null });
  if (req.user.role === 'client' && row.client_id && row.client_id !== req.user.client_id) return ok(res, { entity: null });
  ok(res, { entity: row });
}));

export default router;
