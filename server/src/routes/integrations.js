import crypto from 'node:crypto';
import express from 'express';
import { all, find, insert, update } from '../db/store.js';
import { config, isConfigured } from '../config.js';
import { authRequired } from '../middleware/auth.js';
import { asyncHandler, ok, ApiError } from '../utils/http.js';
import { ADMIN_ROLES } from '../config/roles.js';
import { recordAudit } from '../utils/audit.js';

const router = express.Router();
const oauthStates = new Map();

const PROVIDERS = ['google_calendar', 'razorpay', 'ai', 'email'];

function providerStatus(provider) {
  if (provider === 'google_calendar') return isConfigured.google ? 'ready' : 'not_configured';
  if (provider === 'razorpay') return isConfigured.razorpay ? 'ready' : 'not_configured';
  if (provider === 'ai') return isConfigured.ai ? 'ready' : 'local_fallback';
  if (provider === 'email') return isConfigured.email ? 'ready' : 'log_only';
  return 'unknown';
}

function publicIntegration(row) {
  if (!row) return null;
  const safeConfig = { ...(row.config || {}) };
  delete safeConfig.access_token;
  delete safeConfig.refresh_token;
  delete safeConfig.key_secret;
  return { ...row, config: safeConfig };
}

router.use((req, res, next) => {
  // The OAuth callback is opened by Google in the browser and is validated by state instead.
  if (req.path === '/google/callback') return next();
  return authRequired(req, res, next);
});

router.get('/', asyncHandler((req, res) => {
  const rows = all('integrations', (i) => i.org_id === req.user.org_id);
  const integrations = PROVIDERS.map((provider) => {
    const existing = rows.find((r) => r.provider === provider) || null;
    return {
      id: existing?.id || `virtual_${provider}`,
      provider,
      status: providerStatus(provider),
      connected: existing?.status === 'connected',
      config: publicIntegration(existing)?.config || {},
      configured_on_server: provider === 'google_calendar' ? isConfigured.google
        : provider === 'razorpay' ? isConfigured.razorpay
          : provider === 'ai' ? isConfigured.ai : isConfigured.email,
      updated_at: existing?.updated_at || null,
    };
  });
  ok(res, { integrations, capabilities: isConfigured });
}));

router.get('/status', asyncHandler(async (_req, res) => {
  ok(res, isConfigured);
}));

router.put('/:provider', asyncHandler((req, res) => {
  if (!ADMIN_ROLES.includes(req.user.role)) throw new ApiError(403, 'Only administrators can manage integrations.');
  if (!PROVIDERS.includes(req.params.provider)) throw new ApiError(404, 'Unknown integration.');
  const existing = find('integrations', (i) => i.org_id === req.user.org_id && i.provider === req.params.provider);
  const patch = {};
  if (req.body?.status && ['connected', 'disconnected', 'not_connected', 'error', 'local_fallback', 'log_only'].includes(req.body.status)) {
    patch.status = req.body.status;
  }
  if (req.body?.config && typeof req.body.config === 'object') {
    patch.config = { ...(existing?.config || {}), ...req.body.config };
  }
  const row = existing
    ? update('integrations', existing.id, patch)
    : insert('integrations', { org_id: req.user.org_id, provider: req.params.provider, status: 'not_connected', config: {}, ...patch });
  recordAudit({ orgId: req.user.org_id, user: req.user, action: 'integrations.updated', entity: 'integrations', entityId: row.id, changes: { provider: row.provider, status: row.status }, ip: req.ip });
  ok(res, publicIntegration(row));
}));

router.post('/:provider/disconnect', asyncHandler((req, res) => {
  if (!ADMIN_ROLES.includes(req.user.role)) throw new ApiError(403, 'Only administrators can manage integrations.');
  const existing = find('integrations', (i) => i.org_id === req.user.org_id && i.provider === req.params.provider);
  if (!existing) throw new ApiError(404, 'Integration not found.');
  ok(res, publicIntegration(update('integrations', existing.id, {
    status: 'disconnected',
    config: { ...(existing.config || {}), access_token: null, refresh_token: null, connected_at: null },
  })));
}));

/* ---------- Google Calendar / Meet OAuth ---------- */
router.get('/google/connect', asyncHandler((req, res) => {
  if (!isConfigured.google) {
    throw new ApiError(501, 'Google Calendar is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to server/.env.');
  }
  const state = crypto.randomBytes(18).toString('hex');
  oauthStates.set(state, { userId: req.user.id, expires: Date.now() + 10 * 60 * 1000 });
  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.redirectUri,
    response_type: 'code',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email',
    ].join(' '),
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  ok(res, { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` });
}));

router.get('/google/callback', asyncHandler(async (req, res) => {
  const redirectBase = `${config.clientUrl}/settings/integrations`;
  const state = oauthStates.get(String(req.query.state || ''));
  oauthStates.delete(String(req.query.state || ''));
  if (!state || state.expires < Date.now()) {
    return res.redirect(`${redirectBase}?google=invalid_state`);
  }
  if (!req.query.code) return res.redirect(`${redirectBase}?google=denied`);

  const profile = find('profiles', (p) => p.id === state.userId);
  if (!profile) return res.redirect(`${redirectBase}?google=unknown_user`);

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: String(req.query.code),
      client_id: config.google.clientId,
      client_secret: config.google.clientSecret,
      redirect_uri: config.google.redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  const tokens = await tokenResponse.json();
  if (!tokenResponse.ok) {
    console.warn('[integrations] Google token exchange failed:', tokens);
    return res.redirect(`${redirectBase}?google=token_failed`);
  }

  const existing = find('integrations', (i) => i.org_id === profile.org_id && i.provider === 'google_calendar');
  const payload = {
    status: 'connected',
    config: {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || existing?.config?.refresh_token || null,
      expires_at: Date.now() + Number(tokens.expires_in || 3600) * 1000,
      scope: tokens.scope,
      connected_at: new Date().toISOString(),
    },
  };
  if (existing) update('integrations', existing.id, payload);
  else insert('integrations', { org_id: profile.org_id, provider: 'google_calendar', ...payload });
  recordAudit({ orgId: profile.org_id, user: profile, action: 'integrations.google_connected', entity: 'integrations', entityId: existing?.id || null, changes: { status: 'connected' } });
  return res.redirect(`${redirectBase}?google=connected`);
}));

router.post('/google/event', asyncHandler(async (req, res) => {
  if (!isConfigured.google) throw new ApiError(501, 'Google Calendar is not configured.');
  const integration = find('integrations', (i) => i.org_id === req.user.org_id && i.provider === 'google_calendar');
  let token = integration?.config?.access_token;
  if (!token) throw new ApiError(400, 'Connect Google Calendar first.');

  if (integration?.config?.expires_at && Number(integration.config.expires_at) < Date.now() + 60000 && integration.config.refresh_token) {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.google.clientId,
        client_secret: config.google.clientSecret,
        refresh_token: integration.config.refresh_token,
        grant_type: 'refresh_token',
      }),
    });
    const refreshed = await response.json();
    if (response.ok) {
      token = refreshed.access_token;
      update('integrations', integration.id, {
        config: {
          ...integration.config,
          access_token: refreshed.access_token,
          expires_at: Date.now() + Number(refreshed.expires_in || 3600) * 1000,
        },
      });
    }
  }

  const meeting = req.body?.meeting || {};
  const start = `${meeting.meeting_date || new Date().toISOString().slice(0, 10)}T${meeting.start_time || '10:00'}:00`;
  const end = `${meeting.meeting_date || new Date().toISOString().slice(0, 10)}T${meeting.end_time || '11:00'}:00`;
  const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: meeting.title || 'Client meeting',
      description: meeting.description || meeting.agenda || '',
      start: { dateTime: start, timeZone: 'Asia/Kolkata' },
      end: { dateTime: end, timeZone: 'Asia/Kolkata' },
      conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
    }),
  });
  const event = await response.json();
  if (!response.ok) throw new ApiError(502, event?.error?.message || 'Google Calendar event creation failed.');
  ok(res, {
    event_id: event.id,
    html_link: event.htmlLink,
    meet_link: event.hangoutLink || '',
    start: event.start,
    end: event.end,
  });
}));

export default router;
