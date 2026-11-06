import express from 'express';
import { all, find, getById, insert, update, remove } from '../db/store.js';
import { getResource } from '../config/resources.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ApiError, ok, created } from '../utils/http.js';
import { queryRows, toCsv } from '../utils/query.js';
import { recordActivity, recordAudit, notify } from '../utils/audit.js';

const router = express.Router();
router.use(authRequired);

const isClient = (user) => user.role === 'client';

function canRead(config, user) {
  if (user.role === 'super_admin') return true;
  if (config.readRoles.includes(user.role)) return true;
  if (user.role === 'client' && (config.clientScoped || config.clientSelf)) return true;
  return false;
}

function canWrite(config, user, action = 'write') {
  if (user.role === 'super_admin') return true;
  const roles = action === 'delete' ? config.deleteRoles : config.writeRoles;
  return (roles || config.writeRoles).includes(user.role);
}

function applyVisibility(rows, config, user) {
  let result = rows.filter((row) => row.org_id === user.org_id);
  if (isClient(user)) {
    if (config.clientSelf) {
      result = result.filter((row) => row.id === user.client_id);
    }
    if (config.clientScoped) {
      result = result.filter((row) => row[config.clientScoped] === user.client_id);
    }
    if (config.clientFilter) {
      result = result.filter((row) => config.clientFilter(row, user));
    }
  } else if (config.ownerField && config.ownerRoles?.includes(user.role)) {
    result = result.filter((row) => row[config.ownerField] === user.id);
  }
  return result;
}

function isRowVisible(row, config, user) {
  if (!row || row.org_id !== user.org_id) return false;
  if (isClient(user)) {
    if (config.clientSelf && row.id !== user.client_id) return false;
    if (config.clientScoped && row[config.clientScoped] !== user.client_id) return false;
    if (config.clientFilter && !config.clientFilter(row, user)) return false;
  }
  if (config.ownerField && config.ownerRoles?.includes(user.role) && row[config.ownerField] !== user.id) return false;
  return true;
}

function validatePayload(config, data) {
  for (const field of config.required || []) {
    const value = data[field];
    if (value === undefined || value === null || value === '') {
      throw new ApiError(400, `${field.replace(/_/g, ' ')} is required.`);
    }
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(data.email))) {
    throw new ApiError(400, 'Enter a valid email address.');
  }
  if (data.amount !== undefined && (Number.isNaN(Number(data.amount)) || Number(data.amount) < 0)) {
    throw new ApiError(400, 'Amount must be a valid positive number.');
  }
}

function cleanBody(body = {}) {
  const data = { ...body };
  delete data.id;
  delete data.org_id;
  delete data.created_at;
  delete data.updated_at;
  delete data.deleted_at;
  delete data.password_hash;
  return data;
}

function auditChange({ config, user, action, row, changes, req }) {
  recordActivity({
    orgId: user.org_id,
    user,
    action,
    module: config.table,
    recordId: row.id,
    description: `${action[0].toUpperCase() + action.slice(1)} ${config.singular}${config.label?.(row) ? ` “${config.label(row)}”` : ''}`,
  });
  recordAudit({
    orgId: user.org_id,
    user,
    action: `${config.table}.${action}`,
    entity: config.table,
    entityId: row.id,
    changes,
    ip: req.ip,
  });
}

function maybeNotify(config, user, row) {
  if (!config.notifyType) return;
  if (config.notifyOnlyWhen && !config.notifyOnlyWhen(row)) return;
  notify({
    orgId: user.org_id,
    userId: config.notifyTarget?.(row) || null,
    type: config.notifyType,
    title: config.notifyTitle?.(row) || `New ${config.singular}`,
    message: config.notifyMessage?.(row) || `${config.singular} “${config.label?.(row) || ''}” was created.`,
    link: config.notifyLink || '',
  });
}

function loadConfig(req) {
  const config = getResource(req.params.resource);
  if (!config) throw new ApiError(404, 'Unknown module.');
  if (!canRead(config, req.user)) throw new ApiError(403, 'You do not have access to this module.');
  return config;
}

// GET /api/:resource/export
router.get('/:resource/export', asyncHandler((req, res) => {
  const config = loadConfig(req);
  let rows = applyVisibility(all(config.table), config, req.user);
  if (config.softDelete) rows = rows.filter((row) => (req.query.trash === 'true' ? row.deleted_at : !row.deleted_at));
  const result = queryRows(rows, { ...req.query, all: 'true' }, config.searchFields);
  const format = req.query.format === 'json' ? 'json' : 'csv';
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === 'json') {
    res.setHeader('Content-Disposition', `attachment; filename="${config.table}-${stamp}.json"`);
    res.setHeader('Content-Type', 'application/json');
    return res.send(JSON.stringify(result.rows, null, 2));
  }
  const csv = toCsv(result.rows);
  res.setHeader('Content-Disposition', `attachment; filename="${config.table}-${stamp}.csv"`);
  res.setHeader('Content-Type', 'text/csv');
  return res.send(csv);
}));

// POST /api/:resource/import
router.post('/:resource/import', asyncHandler((req, res) => {
  const config = loadConfig(req);
  if (!canWrite(config, req.user)) throw new ApiError(403, 'You do not have permission to import records.');
  if (req.params.resource !== 'leads') throw new ApiError(400, 'Import is only supported for leads.');

  const rows = Array.isArray(req.body?.rows) ? req.body.rows.slice(0, 500) : [];
  if (!rows.length) throw new ApiError(400, 'Provide at least one row to import.');

  const imported = [];
  const errors = [];
  const defaultStage = find('lead_stages', (s) => s.org_id === req.user.org_id && s.name === 'New');
  rows.forEach((raw, index) => {
    try {
      const data = cleanBody(raw);
      data.name = data.name || data.full_name || data.company;
      if (!data.name) throw new Error('Name is required');
      if (data.estimated_budget) data.estimated_budget = Number(String(data.estimated_budget).replace(/[^\d.]/g, ''));
      const payload = {
        ...data,
        org_id: req.user.org_id,
        source: data.source || 'Import',
        stage_id: defaultStage?.id || null,
        stage: 'New',
        status: 'open',
        assigned_to: req.user.id,
      };
      if (config.beforeCreate) config.beforeCreate({ data: payload, user: req.user, isCreate: true });
      imported.push(insert(config.table, payload));
    } catch (error) {
      errors.push({ row: index + 1, message: error.message });
    }
  });
  if (imported.length) {
    recordActivity({ orgId: req.user.org_id, user: req.user, action: 'imported', module: 'leads', recordId: null, description: `Imported ${imported.length} leads` });
  }
  return created(res, { imported: imported.length, failed: errors.length, errors });
}));

// POST /api/:resource/bulk-delete
router.post('/:resource/bulk-delete', asyncHandler((req, res) => {
  const config = loadConfig(req);
  if (!canWrite(config, req.user, 'delete')) throw new ApiError(403, 'You do not have permission to delete these records.');
  const ids = Array.isArray(req.body?.ids) ? req.body.ids.slice(0, 500) : [];
  if (!ids.length) throw new ApiError(400, 'Select at least one record.');

  const deleted = [];
  const errors = [];
  for (const id of ids) {
    const row = getById(config.table, id);
    if (!isRowVisible(row, config, req.user)) {
      errors.push({ id, message: 'Record not found' });
      continue;
    }
    if (config.afterDelete) config.afterDelete({ row, user: req.user });
    remove(config.table, id, !config.softDelete);
    deleted.push(id);
    auditChange({ config, user: req.user, action: 'deleted', row, changes: { bulk: true }, req });
  }
  ok(res, { deleted: deleted.length, errors });
}));

// GET /api/:resource
router.get('/:resource', asyncHandler((req, res) => {
  const config = loadConfig(req);
  let rows = applyVisibility(all(config.table), config, req.user);
  if (config.softDelete) rows = rows.filter((row) => (req.query.trash === 'true' ? row.deleted_at : !row.deleted_at));
  const { rows: pageRows, pagination } = queryRows(rows, req.query, config.searchFields);
  ok(res, pageRows, pagination ? { pagination } : {});
}));

// POST /api/:resource
router.post('/:resource', asyncHandler((req, res) => {
  const config = loadConfig(req);
  if (!canWrite(config, req.user)) throw new ApiError(403, 'You do not have permission to create records here.');
  const data = cleanBody(req.body);
  validatePayload(config, data);
  data.org_id = req.user.org_id;
  data.created_by = req.user.id;
  if (config.beforeCreate) config.beforeCreate({ data, user: req.user, isCreate: true });
  const row = insert(config.table, data);
  if (config.afterCreate) config.afterCreate({ row, user: req.user });
  auditChange({ config, user: req.user, action: 'created', row, changes: data, req });
  maybeNotify(config, req.user, row);
  return created(res, row);
}));

// GET /api/:resource/:id
router.get('/:resource/:id', asyncHandler((req, res) => {
  const config = loadConfig(req);
  const row = getById(config.table, req.params.id);
  if (!isRowVisible(row, config, req.user)) throw new ApiError(404, 'Record not found.');
  ok(res, row);
}));

// PUT/PATCH /api/:resource/:id
const updateHandler = asyncHandler((req, res) => {
  const config = loadConfig(req);
  if (!canWrite(config, req.user)) throw new ApiError(403, 'You do not have permission to update this record.');
  const existing = getById(config.table, req.params.id);
  if (!isRowVisible(existing, config, req.user)) throw new ApiError(404, 'Record not found.');

  const data = cleanBody(req.body);
  const merged = { ...existing, ...data };
  validatePayload(config, merged);
  if (config.beforeUpdate) config.beforeUpdate({ data, existing, user: req.user });
  const row = update(config.table, existing.id, data);
  if (config.afterUpdate) config.afterUpdate({ row, existing, user: req.user });

  const changes = {};
  Object.keys(data).forEach((key) => {
    if (JSON.stringify(existing[key]) !== JSON.stringify(row[key])) changes[key] = { from: existing[key], to: row[key] };
  });
  auditChange({ config, user: req.user, action: 'updated', row, changes, req });

  if (config.table === 'leads' && existing.stage_id !== row.stage_id) {
    notify({
      orgId: req.user.org_id, userId: row.assigned_to || null, type: 'lead_stage',
      title: 'Lead stage updated', message: `${row.name} moved from ${existing.stage} to ${row.stage}.`,
      link: `/leads/${row.id}`,
    });
  }
  ok(res, row);
});

router.put('/:resource/:id', updateHandler);
router.patch('/:resource/:id', updateHandler);

// POST /api/:resource/:id/restore
router.post('/:resource/:id/restore', asyncHandler((req, res) => {
  const config = loadConfig(req);
  if (!canWrite(config, req.user, 'delete')) throw new ApiError(403, 'You do not have permission to restore records.');
  const row = getById(config.table, req.params.id);
  if (!isRowVisible(row, config, req.user)) throw new ApiError(404, 'Record not found.');
  const restored = update(config.table, row.id, { deleted_at: null });
  auditChange({ config, user: req.user, action: 'restored', row: restored, changes: {}, req });
  ok(res, restored);
}));

// DELETE /api/:resource/:id
router.delete('/:resource/:id', asyncHandler((req, res) => {
  const config = loadConfig(req);
  if (!canWrite(config, req.user, 'delete')) throw new ApiError(403, 'You do not have permission to delete this record.');
  const row = getById(config.table, req.params.id);
  if (!isRowVisible(row, config, req.user)) throw new ApiError(404, 'Record not found.');

  const hard = req.query.hard === 'true';
  if (hard && !['super_admin', 'admin'].includes(req.user.role)) {
    throw new ApiError(403, 'Only administrators can permanently delete records.');
  }
  if (config.afterDelete) config.afterDelete({ row, user: req.user });
  remove(config.table, row.id, hard || !config.softDelete);
  auditChange({ config, user: req.user, action: hard ? 'permanently deleted' : 'deleted', row, changes: {}, req });
  ok(res, { id: row.id, deleted: true, hard });
}));

export default router;
