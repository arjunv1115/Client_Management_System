import express from 'express';
import { all, find, getById, insert, update } from '../db/store.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError } from '../utils/http.js';
import { recordAudit } from '../utils/audit.js';
import { serializeUser } from './auth.js';
import { ADMIN_ROLES } from '../config/roles.js';

const router = express.Router();
router.use(authRequired);

const THEMES = ['light', 'dark', 'system'];
const PREFERENCE_FIELDS = [
  'theme', 'sidebar_collapsed', 'sidebar_enabled', 'ai_enabled', 'ai_tone',
  'density', 'date_format', 'email_notifications', 'weekly_digest',
  'desktop_notifications', 'sound_notifications',
];

function getOrCreatePreferences(userId) {
  const existing = find('user_preferences', (p) => p.user_id === userId);
  if (existing) return existing;
  return insert('user_preferences', {
    user_id: userId,
    theme: 'system',
    sidebar_collapsed: false,
    sidebar_enabled: true,
    ai_enabled: true,
    ai_tone: 'friendly',
    density: 'comfortable',
    date_format: 'dd MMM yyyy',
    email_notifications: true,
    weekly_digest: true,
    desktop_notifications: true,
    sound_notifications: false,
  });
}

function settingsMap(userId) {
  const rows = all('user_settings', (s) => s.user_id === userId);
  return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
}

function orgSettingsMap(orgId) {
  const rows = all('organization_settings', (s) => s.org_id === orgId);
  return rows.reduce((acc, row) => ({ ...acc, [row.key]: row.value }), {});
}

function saveSetting(userId, key, value) {
  const existing = find('user_settings', (s) => s.user_id === userId && s.key === key);
  if (existing) return update('user_settings', existing.id, { value });
  return insert('user_settings', { user_id: userId, key, value });
}

function saveOrgSetting(orgId, key, value, user) {
  const existing = find('organization_settings', (s) => s.org_id === orgId && s.key === key);
  if (existing) return update('organization_settings', existing.id, { value });
  const row = insert('organization_settings', { org_id: orgId, key, value });
  recordAudit({ orgId, user, action: 'settings.organization_updated', entity: 'organization_settings', entityId: row.id, changes: { [key]: value } });
  return row;
}

router.get('/', asyncHandler((req, res) => {
  const preferences = getOrCreatePreferences(req.user.id);
  ok(res, {
    preferences,
    userSettings: settingsMap(req.user.id),
    organizationSettings: orgSettingsMap(req.user.org_id),
    organization: getById('organizations', req.user.org_id),
  });
}));

router.put('/', asyncHandler((req, res) => {
  const preferences = getOrCreatePreferences(req.user.id);
  const patch = {};
  PREFERENCE_FIELDS.forEach((field) => {
    if (req.body?.[field] !== undefined) patch[field] = req.body[field];
  });
  if (patch.theme && !THEMES.includes(patch.theme)) throw new ApiError(400, 'Theme must be light, dark or system.');
  if (patch.ai_tone && !['friendly', 'formal', 'concise', 'persuasive'].includes(patch.ai_tone)) {
    throw new ApiError(400, 'Choose a valid AI tone.');
  }
  const updated = update('user_preferences', preferences.id, patch);
  ok(res, updated);
}));

router.put('/theme', asyncHandler((req, res) => {
  const theme = req.body?.theme;
  if (!THEMES.includes(theme)) throw new ApiError(400, 'Theme must be light, dark or system.');
  const preferences = getOrCreatePreferences(req.user.id);
  ok(res, update('user_preferences', preferences.id, { theme }));
}));

router.get('/settings', asyncHandler((req, res) => {
  ok(res, {
    userSettings: settingsMap(req.user.id),
    organizationSettings: orgSettingsMap(req.user.org_id),
    organization: getById('organizations', req.user.org_id),
  });
}));

router.put('/settings', asyncHandler((req, res) => {
  const settings = req.body?.settings || {};
  Object.entries(settings).forEach(([key, value]) => saveSetting(req.user.id, key, value));

  const organization = req.body?.organization;
  if (organization) {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      throw new ApiError(403, 'Only administrators can change organization settings.');
    }
    const allowed = ['name', 'email', 'phone', 'website', 'address', 'logo_url', 'currency', 'opening_balance', 'invoice_prefix', 'timezone'];
    const patch = {};
    allowed.forEach((field) => {
      if (organization[field] !== undefined) patch[field] = organization[field];
    });
    if (patch.name !== undefined && !String(patch.name).trim()) throw new ApiError(400, 'Organization name is required.');
    if (Object.keys(patch).length) update('organizations', req.user.org_id, patch);
  }

  const orgSettings = req.body?.organizationSettings;
  if (orgSettings) {
    if (!ADMIN_ROLES.includes(req.user.role)) {
      throw new ApiError(403, 'Only administrators can change organization settings.');
    }
    Object.entries(orgSettings).forEach(([key, value]) => saveOrgSetting(req.user.org_id, key, value, req.user));
  }

  const fresh = getById('profiles', req.user.id);
  ok(res, {
    preferences: getOrCreatePreferences(req.user.id),
    userSettings: settingsMap(req.user.id),
    organizationSettings: orgSettingsMap(req.user.org_id),
    organization: getById('organizations', req.user.org_id),
    user: serializeUser(fresh),
  });
}));

export default router;
