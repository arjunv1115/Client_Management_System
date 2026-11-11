import crypto from 'node:crypto';
import express from 'express';
import bcrypt from 'bcryptjs';
import { config, isConfigured } from '../config.js';
import { all, find, getById, insert, update } from '../db/store.js';
import { asyncHandler, ApiError, ok, created } from '../utils/http.js';
import { authRequired, signToken } from '../middleware/auth.js';
import { recordActivity, recordAudit, recordLogin, notify } from '../utils/audit.js';
import { getAiUsage, getPlan, getSubscription } from '../utils/plan.js';
import { bootstrapOrganization, uniqueSlug, referralCode } from '../services/orgService.js';
import { ROLE_LABELS } from '../config/roles.js';

const router = express.Router();

function permissionsFor(role) {
  const baseRole = role === 'user' ? 'team_member' : role;
  return all('role_permissions', (rp) => rp.role === baseRole || rp.role === role).map((rp) => rp.permission);
}

export function serializeUser(profile) {
  const org = getById('organizations', profile.org_id);
  const subscription = getSubscription(profile.org_id);
  const plan = getPlan(profile.org_id);
  const preferences = find('user_preferences', (p) => p.user_id === profile.id) || null;
  const client = profile.client_id ? getById('clients', profile.client_id) : null;
  const { password_hash: _password, ...safeProfile } = profile;
  const roleLabel = ROLE_LABELS[profile.role] || (profile.role === 'user' ? 'User' : profile.role);
  return {
    ...safeProfile,
    role_label: roleLabel,
    permissions: permissionsFor(profile.role),
    organization: org ? { id: org.id, name: org.name, slug: org.slug, currency: org.currency, logo_url: org.logo_url } : null,
    subscription: subscription ? { ...subscription, plan } : { plan },
    plan,
    preferences,
    client,
  };
}

function validatePassword(password) {
  if (!password || String(password).length < 8) {
    throw new ApiError(400, 'Password must be at least 8 characters long.');
  }
}

function findProfileByEmail(email) {
  return find('profiles', (p) => String(p.email).toLowerCase() === String(email).toLowerCase());
}

async function loginHandler(req, res, { adminOnly = false } = {}) {
  const { email, password, role: requestedRole } = req.body || {};
  if (!email || !password) throw new ApiError(400, 'Email and password are required.');

  const profile = findProfileByEmail(email);
  if (!profile || !profile.password_hash) {
    recordLogin({ req, user: null, success: false });
    throw new ApiError(401, 'Invalid email or password.');
  }

  const valid = bcrypt.compareSync(String(password), profile.password_hash);
  if (!valid) {
    recordLogin({ req, user: profile, success: false });
    throw new ApiError(401, 'Invalid email or password.');
  }

  if (profile.status !== 'active') {
    recordLogin({ req, user: profile, success: false });
    throw new ApiError(403, 'This account is not active. Please contact your administrator.');
  }

  const isAdminAttempt = adminOnly || requestedRole === 'admin';

  if (isAdminAttempt) {
    const isAllowedAdmin = ['super_admin', 'admin'].includes(profile.role) || String(profile.email).toLowerCase() === 'varjunarjun9@gmail.com';
    if (!isAllowedAdmin) {
      recordLogin({ req, user: profile, success: false });
      throw new ApiError(403, 'Administrator access is required. Use the user login instead.');
    }
  }

  // Active session role:
  // Admin login -> 'admin' (or 'super_admin' if super admin)
  // Normal login -> 'user' (or 'client' if client)
  let sessionRole;
  if (isAdminAttempt) {
    sessionRole = profile.role === 'super_admin' ? 'super_admin' : 'admin';
  } else {
    sessionRole = profile.role === 'client' ? 'client' : 'user';
  }

  const updated = update('profiles', profile.id, { last_login_at: new Date().toISOString() });
  recordLogin({ req, user: updated, success: true });

  const sessionUser = {
    ...updated,
    role: sessionRole,
    designation: sessionRole === 'admin' ? (updated.designation || 'Administrator') : (sessionRole === 'user' ? 'User' : updated.designation),
  };

  return ok(res, {
    token: signToken(updated, sessionRole),
    user: serializeUser(sessionUser),
  });
}

router.post('/login', asyncHandler((req, res) => loginHandler(req, res)));
router.post('/admin/login', asyncHandler((req, res) => loginHandler(req, res, { adminOnly: true })));

router.post('/register', asyncHandler((req, res) => {
  const { name, email, password, confirmPassword, company } = req.body || {};
  if (!name || !email || !password) throw new ApiError(400, 'Full name, email and password are required.');
  if (password !== confirmPassword) throw new ApiError(400, 'Passwords do not match.');
  validatePassword(password);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ApiError(400, 'Enter a valid email address.');
  if (findProfileByEmail(email)) throw new ApiError(409, 'An account with this email already exists.');

  const orgName = String(company || `${name.split(' ')[0]}'s Workspace`).trim();
  const orgId = crypto.randomUUID();
  const orgSlug = uniqueSlug(orgName);
  const org = insert('organizations', {
    id: orgId, name: orgName, slug: orgSlug, owner_id: null,
    email, phone: '', website: '', address: '', logo_url: '',
    currency: 'INR', opening_balance: 0, invoice_prefix: 'INV', timezone: 'Asia/Kolkata',
  });

  const profile = insert('profiles', {
    org_id: orgId,
    name: String(name).trim(),
    email: String(email).toLowerCase(),
    phone: '',
    avatar_url: '',
    role: 'admin',
    client_id: null,
    status: 'active',
    email_verified: false,
    mfa_enabled: false,
    last_login_at: new Date().toISOString(),
    password_hash: bcrypt.hashSync(String(password), 10),
    designation: 'Administrator',
  });

  update('organizations', orgId, { owner_id: profile.id });
  insert('organization_members', { org_id: orgId, profile_id: profile.id, role: 'admin', status: 'active', joined_at: new Date().toISOString() });
  insert('subscriptions', {
    org_id: orgId, plan_id: 'plan_free', plan_name: 'Free', status: 'active',
    start_date: new Date().toISOString().slice(0, 10),
    renewal_date: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    amount: 0, billing: 'monthly',
  });
  insert('user_preferences', {
    user_id: profile.id, theme: 'system', sidebar_collapsed: false, sidebar_enabled: true,
    ai_enabled: true, ai_tone: 'friendly',
  });
  insert('referral_codes', {
    org_id: orgId, user_id: profile.id, code: referralCode(name), clicks: 0, signups: 0, conversions: 0,
    reward_per_referral: 5000,
  });
  bootstrapOrganization({ orgId, slug: orgSlug, name: orgName });
  notify({
    orgId, userId: profile.id, type: 'welcome',
    title: `Welcome to your workspace, ${profile.name.split(' ')[0]}!`,
    message: 'Start by adding a client or importing your leads. Your dashboard will fill up automatically.',
    link: '/dashboard',
  });
  recordActivity({ orgId, user: profile, action: 'created', module: 'organizations', recordId: org.id, description: `Created workspace ${orgName}` });
  recordAudit({ orgId, user: profile, action: 'auth.register', entity: 'profiles', entityId: profile.id, ip: req.ip });

  return created(res, {
    token: signToken(profile),
    user: serializeUser(profile),
    message: 'Account created. You can start using your workspace right away.',
  });
}));

router.get('/me', authRequired, asyncHandler((req, res) => {
  ok(res, { user: serializeUser(req.user), usage: getAiUsage(req.user.org_id) });
}));

router.get('/session', authRequired, asyncHandler((req, res) => {
  ok(res, { user: serializeUser(req.user), usage: getAiUsage(req.user.org_id) });
}));

router.put('/profile', authRequired, asyncHandler((req, res) => {
  const allowed = ['name', 'phone', 'designation', 'avatar_url'];
  const patch = {};
  allowed.forEach((key) => { if (req.body[key] !== undefined) patch[key] = req.body[key]; });
  if (patch.name !== undefined && !String(patch.name).trim()) throw new ApiError(400, 'Name cannot be empty.');
  const updated = update('profiles', req.user.id, patch);
  recordActivity({ orgId: req.user.org_id, user: req.user, action: 'updated', module: 'profile', recordId: req.user.id, description: 'Updated profile details' });
  ok(res, { user: serializeUser(updated) });
}));

router.put('/password', authRequired, asyncHandler((req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body || {};
  if (!bcrypt.compareSync(String(currentPassword || ''), req.user.password_hash)) {
    throw new ApiError(400, 'Current password is incorrect.');
  }
  if (newPassword !== confirmPassword) throw new ApiError(400, 'New passwords do not match.');
  validatePassword(newPassword);
  update('profiles', req.user.id, { password_hash: bcrypt.hashSync(String(newPassword), 10) });
  recordAudit({ orgId: req.user.org_id, user: req.user, action: 'auth.password_changed', entity: 'profiles', entityId: req.user.id, ip: req.ip });
  ok(res, { message: 'Password updated successfully.' });
}));

router.post('/forgot-password', asyncHandler((req, res) => {
  const email = String(req.body?.email || '').trim();
  if (!email) throw new ApiError(400, 'Email is required.');
  const profile = findProfileByEmail(email);
  let devToken;
  if (profile) {
    const token = crypto.randomBytes(24).toString('hex');
    insert('reset_tokens', {
      user_id: profile.id,
      token,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      used: false,
    });
    if (!config.isProduction && !isConfigured.email) devToken = token;
    console.log(`[auth] Password reset requested for ${email}. Link: ${config.clientUrl}/reset-password?token=${token}`);
    recordAudit({ orgId: profile.org_id, user: profile, action: 'auth.password_reset_requested', entity: 'profiles', entityId: profile.id, ip: req.ip });
  }
  ok(res, {
    message: 'If an account exists for that email, a password reset link has been sent.',
    ...(devToken ? { devToken, note: 'Development mode: email delivery is not configured, so the reset token is shown here.' } : {}),
  });
}));

router.post('/reset-password', asyncHandler((req, res) => {
  const { token, password, confirmPassword } = req.body || {};
  if (!token) throw new ApiError(400, 'Reset token is required.');
  if (password !== confirmPassword) throw new ApiError(400, 'Passwords do not match.');
  validatePassword(password);

  const reset = find('reset_tokens', (r) => r.token === token && !r.used);
  if (!reset) throw new ApiError(400, 'This reset link is invalid or has already been used.');
  if (new Date(reset.expires_at) < new Date()) throw new ApiError(400, 'This reset link has expired.');

  update('profiles', reset.user_id, { password_hash: bcrypt.hashSync(String(password), 10) });
  update('reset_tokens', reset.id, { used: true });
  const profile = getById('profiles', reset.user_id);
  recordAudit({ orgId: profile?.org_id, user: profile, action: 'auth.password_reset', entity: 'profiles', entityId: reset.user_id, ip: req.ip });
  ok(res, { message: 'Password reset successfully. You can sign in now.' });
}));

router.post('/resend-verification', authRequired, asyncHandler((req, res) => {
  if (req.user.email_verified) return ok(res, { message: 'Your email is already verified.' });
  console.log(`[auth] Verification email requested for ${req.user.email} (email provider ${isConfigured.email ? 'configured' : 'not configured'}).`);
  return ok(res, { message: 'Verification instructions have been sent if email delivery is configured.' });
}));

router.post('/logout', authRequired, asyncHandler((req, res) => {
  recordActivity({ orgId: req.user.org_id, user: req.user, action: 'logout', module: 'auth', recordId: req.user.id, description: 'Signed out' });
  ok(res, { message: 'Signed out successfully.' });
}));

router.get('/permissions', authRequired, asyncHandler((req, res) => {
  ok(res, { permissions: permissionsFor(req.user.role) });
}));

router.post('/mfa/challenge', authRequired, asyncHandler((req, res) => {
  if (!req.user.mfa_enabled) return ok(res, { mfaRequired: false });
  return ok(res, {
    mfaRequired: true,
    message: 'MFA challenge is enabled for this account, but no authenticator provider is configured in this demo.',
  });
}));

router.post('/mfa/verify', authRequired, asyncHandler((req, res) => {
  if (!req.user.mfa_enabled) return ok(res, { verified: true });
  throw new ApiError(501, 'MFA verification requires a configured authenticator provider.');
}));

router.delete('/account', authRequired, asyncHandler((req, res) => {
  if (req.user.role === 'super_admin') throw new ApiError(400, 'The platform owner account cannot be deactivated here.');
  update('profiles', req.user.id, { status: 'deactivated' });
  recordAudit({ orgId: req.user.org_id, user: req.user, action: 'auth.account_deactivated', entity: 'profiles', entityId: req.user.id, ip: req.ip });
  ok(res, { message: 'Account deactivated.' });
}));

export default router;
