import crypto from 'node:crypto';
import express from 'express';
import { all, find, getById, insert, update } from '../db/store.js';
import { config, isConfigured } from '../config.js';
import { authRequired, authorize } from '../middleware/auth.js';
import { asyncHandler, ok, created, ApiError } from '../utils/http.js';
import { ADMIN_ROLES } from '../config/roles.js';
import { recordAudit, notify } from '../utils/audit.js';
import { getPlan, getSubscription, getUsage, getAiUsage } from '../utils/plan.js';

const router = express.Router();

function billingAmount(plan, billing = 'monthly') {
  return billing === 'yearly' ? Math.round(Number(plan.price || 0) * 10 * 100) / 100 : Number(plan.price || 0);
}

function subscriptionRow(orgId) {
  return getSubscription(orgId);
}

function activatePlan({ orgId, plan, billing = 'monthly', gateway = 'demo', gatewayPaymentId = null, user = null, amount = null }) {
  const now = new Date();
  const renewal = new Date(now);
  if (billing === 'yearly') renewal.setFullYear(renewal.getFullYear() + 1);
  else renewal.setMonth(renewal.getMonth() + 1);
  const current = subscriptionRow(orgId);

  const payload = {
    org_id: orgId,
    plan_id: plan.id,
    plan_name: plan.name,
    status: 'active',
    start_date: now.toISOString().slice(0, 10),
    renewal_date: renewal.toISOString().slice(0, 10),
    amount: amount == null ? billingAmount(plan, billing) : amount,
    billing,
    gateway,
    gateway_subscription_id: gatewayPaymentId,
  };
  const subscription = current && current.org_id === orgId
    ? update('subscriptions', current.id, payload)
    : insert('subscriptions', payload);

  const payment = insert('subscription_payments', {
    org_id: orgId,
    subscription_id: subscription.id,
    plan_id: plan.id,
    plan_name: plan.name,
    amount: payload.amount,
    status: 'completed',
    gateway,
    gateway_id: gatewayPaymentId,
    paid_at: now.toISOString(),
    period: now.toISOString().slice(0, 7),
  });

  notify({
    orgId,
    userId: user?.id || null,
    type: 'subscription',
    title: `Plan upgraded to ${plan.name}`,
    message: `Your workspace is now on the ${plan.name} plan. Renews on ${payload.renewal_date}.`,
    link: '/plans',
  });
  recordAudit({
    orgId, user, action: 'subscription.activated', entity: 'subscriptions', entityId: subscription.id,
    changes: { plan: plan.name, billing, amount: payload.amount },
  });
  return { subscription, payment };
}

/* ---------- Overview (authenticated) ---------- */
router.get('/overview', authRequired, asyncHandler((req, res) => {
  const plans = all('plans').sort((a, b) => a.position - b.position);
  const subscription = subscriptionRow(req.user.org_id);
  const plan = getPlan(req.user.org_id);
  const usage = getUsage(req.user.org_id);
  const aiUsage = getAiUsage(req.user.org_id);
  const history = all('subscription_payments', (p) => p.org_id === req.user.org_id && !p.deleted_at)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const billingRecords = all('billing_records', (b) => b.org_id === req.user.org_id && !b.deleted_at)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const invoices = all('invoices', (i) => i.org_id === req.user.org_id && !i.deleted_at)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  ok(res, {
    plans,
    subscription,
    plan,
    usage,
    aiUsage,
    history,
    billingRecords,
    invoices,
    gateways: { razorpay: isConfigured.razorpay },
    currentPlanPrice: Number(plan?.price || 0),
  });
}));

router.get('/plans', asyncHandler(async (_req, res) => {
  ok(res, all('plans').sort((a, b) => a.position - b.position));
}));

router.get('/history', authRequired, asyncHandler((req, res) => {
  ok(res, all('subscription_payments', (p) => p.org_id === req.user.org_id)
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at))));
}));

router.get('/usage', authRequired, asyncHandler((req, res) => {
  ok(res, { usage: getUsage(req.user.org_id), aiUsage: getAiUsage(req.user.org_id), plan: getPlan(req.user.org_id) });
}));

/* ---------- Create a checkout / demo activation ---------- */
router.post('/subscribe', authRequired, authorize(...ADMIN_ROLES), asyncHandler(async (req, res) => {
  const plan = req.body?.plan_id ? getById('plans', req.body.plan_id) : null;
  if (!plan) throw new ApiError(404, 'Choose a valid plan.');
  const billing = req.body?.billing === 'yearly' ? 'yearly' : 'monthly';
  const amount = billingAmount(plan, billing);

  if (amount === 0) {
    const result = activatePlan({ orgId: req.user.org_id, plan, billing, gateway: 'free', user: req.user, amount: 0 });
    return ok(res, { ...result, demo: false, message: `Your workspace is now on the ${plan.name} plan.` });
  }

  if (!isConfigured.razorpay || req.body?.demo === true) {
    const result = activatePlan({ orgId: req.user.org_id, plan, billing, gateway: 'demo', user: req.user, amount });
    return ok(res, {
      ...result,
      demo: true,
      message: isConfigured.razorpay
        ? `Demo activation complete for ${plan.name}.`
        : `Razorpay is not configured, so ${plan.name} was activated in demo mode. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to use live checkout.`,
    });
  }

  const auth = Buffer.from(`${config.razorpay.keyId}:${config.razorpay.keySecret}`).toString('base64');
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      amount: Math.round(amount * 100),
      currency: 'INR',
      receipt: `sub_${req.user.org_id.slice(0, 12)}_${Date.now()}`,
      notes: { org_id: req.user.org_id, plan_id: plan.id, billing, user_id: req.user.id },
    }),
  });
  const order = await response.json();
  if (!response.ok) throw new ApiError(502, order?.error?.description || 'Razorpay order creation failed.');
  ok(res, {
    checkout: true,
    key_id: config.razorpay.keyId,
    order,
    plan,
    billing,
    amount,
    prefill: { name: req.user.name, email: req.user.email },
  });
}));

router.post('/razorpay/verify', authRequired, authorize(...ADMIN_ROLES), asyncHandler((req, res) => {
  if (!isConfigured.razorpay) throw new ApiError(501, 'Razorpay is not configured.');
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id, billing } = req.body || {};
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    throw new ApiError(400, 'Razorpay order, payment and signature are required.');
  }
  const expected = crypto.createHmac('sha256', config.razorpay.keySecret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  if (expected !== razorpay_signature) throw new ApiError(400, 'Payment signature verification failed.');

  const plan = getById('plans', plan_id);
  if (!plan) throw new ApiError(404, 'Plan not found.');
  const existing = find('subscription_payments', (p) => p.gateway_id === razorpay_payment_id);
  if (existing) return ok(res, { alreadyProcessed: true, payment: existing });

  const amount = billingAmount(plan, billing === 'yearly' ? 'yearly' : 'monthly');
  const result = activatePlan({
    orgId: req.user.org_id, plan, billing: billing === 'yearly' ? 'yearly' : 'monthly',
    gateway: 'razorpay', gatewayPaymentId: razorpay_payment_id, user: req.user, amount,
  });
  ok(res, { ...result, verified: true });
}));

router.post('/cancel', authRequired, authorize(...ADMIN_ROLES), asyncHandler((req, res) => {
  const subscription = subscriptionRow(req.user.org_id);
  if (!subscription) throw new ApiError(404, 'No active subscription found.');
  const updated = update('subscriptions', subscription.id, {
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancel_at_period_end: true,
  });
  recordAudit({ orgId: req.user.org_id, user: req.user, action: 'subscription.cancelled', entity: 'subscriptions', entityId: subscription.id, changes: { status: 'cancelled' }, ip: req.ip });
  ok(res, { subscription: updated, message: 'Subscription cancelled. Access remains until the renewal date.' });
}));

/* ---------- Razorpay webhook (raw body captured by app) ---------- */
router.post('/razorpay/webhook', asyncHandler((req, res) => {
  if (!isConfigured.razorpay || !config.razorpay.webhookSecret) {
    throw new ApiError(501, 'Razorpay webhook is not configured.');
  }
  const signature = req.headers['x-razorpay-signature'];
  const raw = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
  const expected = crypto.createHmac('sha256', config.razorpay.webhookSecret).update(raw).digest('hex');
  if (signature !== expected) throw new ApiError(400, 'Invalid webhook signature.');

  const event = req.body?.event;
  const paymentEntity = req.body?.payload?.payment?.entity;
  const eventId = req.body?.event_id || req.headers['x-razorpay-event-id'];
  if (eventId && find('payment_webhook_events', (e) => e.gateway_event_id === eventId)) {
    return ok(res, { received: true, duplicate: true });
  }
  insert('payment_webhook_events', {
    org_id: paymentEntity?.notes?.org_id || null,
    gateway: 'razorpay',
    gateway_event_id: eventId,
    event,
    payload: req.body,
  });
  if (event === 'payment.captured' && paymentEntity) {
    const notes = paymentEntity.notes || {};
    const plan = getById('plans', notes.plan_id);
    if (plan && notes.org_id && !find('subscription_payments', (p) => p.gateway_id === paymentEntity.id)) {
      activatePlan({
        orgId: notes.org_id, plan, billing: notes.billing === 'yearly' ? 'yearly' : 'monthly',
        gateway: 'razorpay', gatewayPaymentId: paymentEntity.id,
        amount: Number(paymentEntity.amount || 0) / 100,
      });
    }
  }
  ok(res, { received: true });
}));

export default router;
