import express from 'express';
import { all, getById, update } from '../db/store.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError } from '../utils/http.js';

const router = express.Router();
router.use(authRequired);

function visibleNotifications(req) {
  return all('notifications', (notification) =>
    notification.org_id === req.user.org_id
    && !notification.deleted_at
    && (notification.user_id === null || notification.user_id === req.user.id));
}

router.get('/', asyncHandler((req, res) => {
  let rows = visibleNotifications(req).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  if (req.query.unread === 'true') rows = rows.filter((n) => !n.is_read);
  if (req.query.type) rows = rows.filter((n) => n.type === req.query.type);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
  const page = Math.max(1, Number(req.query.page) || 1);
  const total = rows.length;
  const unread = visibleNotifications(req).filter((n) => !n.is_read).length;
  const items = rows.slice((page - 1) * limit, page * limit);
  ok(res, items, { pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) }, unread });
}));

router.put('/read-all', asyncHandler((req, res) => {
  const rows = visibleNotifications(req).filter((n) => !n.is_read);
  rows.forEach((row) => update('notifications', row.id, { is_read: true }));
  ok(res, { updated: rows.length });
}));

router.put('/:id/read', asyncHandler((req, res) => {
  const notification = getById('notifications', req.params.id);
  if (!notification || notification.org_id !== req.user.org_id) throw new ApiError(404, 'Notification not found.');
  if (notification.user_id && notification.user_id !== req.user.id) throw new ApiError(403, 'Not your notification.');
  ok(res, update('notifications', notification.id, { is_read: true }));
}));

router.put('/:id/unread', asyncHandler((req, res) => {
  const notification = getById('notifications', req.params.id);
  if (!notification || notification.org_id !== req.user.org_id) throw new ApiError(404, 'Notification not found.');
  if (notification.user_id && notification.user_id !== req.user.id) throw new ApiError(403, 'Not your notification.');
  ok(res, update('notifications', notification.id, { is_read: false }));
}));

router.delete('/:id', asyncHandler((req, res) => {
  const notification = getById('notifications', req.params.id);
  if (!notification || notification.org_id !== req.user.org_id) throw new ApiError(404, 'Notification not found.');
  if (notification.user_id && notification.user_id !== req.user.id) throw new ApiError(403, 'Not your notification.');
  update('notifications', notification.id, { deleted_at: new Date().toISOString() });
  ok(res, { id: notification.id, deleted: true });
}));

export default router;
