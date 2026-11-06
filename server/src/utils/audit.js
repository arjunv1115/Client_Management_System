import { insert, table } from '../db/store.js';

export function recordActivity({ orgId, user, action, module, recordId, description }) {
  try {
    insert('activity_logs', {
      org_id: orgId,
      user_id: user?.id || null,
      user_name: user?.name || 'System',
      action,
      module,
      record_id: recordId,
      description,
    });
  } catch (error) {
    console.warn('[audit] activity log failed:', error.message);
  }
}

export function recordAudit({ orgId, user, action, entity, entityId, changes = {}, ip = null }) {
  try {
    insert('audit_logs', {
      org_id: orgId,
      user_id: user?.id || null,
      user_name: user?.name || 'System',
      action,
      entity,
      entity_id: entityId,
      changes,
      ip,
    });
  } catch (error) {
    console.warn('[audit] audit log failed:', error.message);
  }
}

export function notify({ orgId, userId = null, type, title, message, link = '' }) {
  try {
    return insert('notifications', {
      org_id: orgId,
      user_id: userId,
      type,
      title,
      message,
      link,
      is_read: false,
    });
  } catch (error) {
    console.warn('[notify] failed:', error.message);
    return null;
  }
}

export function recordLogin({ req, user, success }) {
  try {
    insert('audit_logs', {
      org_id: user?.org_id || null,
      user_id: user?.id || null,
      user_name: user?.name || req.body?.email || 'Unknown',
      action: success ? 'auth.login' : 'auth.login_failed',
      entity: 'profiles',
      entity_id: user?.id || null,
      changes: { email: req.body?.email },
      ip: req.ip,
    });
  } catch (error) {
    console.warn('[audit] login log failed:', error.message);
  }
}

export function unreadNotificationsFor(orgId, userId) {
  return table('notifications').filter(
    (n) => n.org_id === orgId && !n.is_read && (n.user_id === null || n.user_id === userId),
  );
}
