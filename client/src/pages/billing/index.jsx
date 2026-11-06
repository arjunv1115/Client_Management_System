import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowUpRight, BadgeCheck, CalendarClock, Check, CircleDollarSign, CreditCard, Crown,
  Gauge, History, Lock, RefreshCcw, ShieldCheck, Sparkles, Wallet, X,
} from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { useBillingOverview } from '../../lib/hooks';
import {
  Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, ErrorState, PageHeader, Progress,
  Skeleton, StatCard, Tabs,
} from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { currency, formatDate, statusTone } from '../../lib/utils';

const usageMeta = {
  customers: { label: 'Clients', icon: BadgeCheck },
  clients: { label: 'Clients', icon: BadgeCheck },
  projects: { label: 'Projects', icon: Gauge },
  teammates: { label: 'Team members', icon: Wallet },
  leads: { label: 'Active leads', icon: ArrowUpRight },
  ai_requests: { label: 'AI requests', icon: Sparkles },
  ai_quotes: { label: 'AI quotations', icon: Sparkles },
  storage_mb: { label: 'Storage (MB)', icon: Gauge },
};

function loadRazorpay() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
    return undefined;
  });
}

export default function BillingPage() {
  const { isAdmin, refresh } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useBillingOverview();
  const [billing, setBilling] = useState('monthly');
  const [tab, setTab] = useState('history');
  const [cancelling, setCancelling] = useState(false);
  const [subscribing, setSubscribing] = useState(null);

  const plans = data?.plans || [];
  const currentPlan = data?.plan;
  const subscription = data?.subscription;

  const usageItems = useMemo(() => Object.entries(data?.usage || {}).map(([key, used]) => {
    const limit = currentPlan?.limits?.[key];
    const meta = usageMeta[key] || { label: key, icon: Gauge };
    return { key, used, limit, ...meta };
  }), [data?.usage, currentPlan]);

  const subscribe = useMutation({
    mutationFn: async ({ plan, yearly }) => {
      const response = await api.post('/billing/subscribe', { plan_id: plan.id, billing: yearly ? 'yearly' : 'monthly' });
      const payload = unwrap(response);
      if (!payload?.checkout) return payload;

      const ready = await loadRazorpay();
      if (!ready) return { ...payload, checkoutUnavailable: true };
      return new Promise((resolve, reject) => {
        const checkout = new window.Razorpay({
          key: payload.key_id,
          amount: payload.order.amount,
          currency: payload.order.currency,
          name: 'PixelForge Client OS',
          description: `${payload.plan.name} plan · ${payload.billing}`,
          order_id: payload.order.id,
          prefill: payload.prefill,
          theme: { color: '#6366f1' },
          handler: async (result) => {
            try {
              const verified = unwrap(await api.post('/billing/razorpay/verify', {
                ...result,
                plan_id: payload.plan.id,
                billing: payload.billing,
              }));
              resolve(verified);
            } catch (err) {
              reject(err);
            }
          },
          modal: { ondismiss: () => resolve({ cancelled: true }) },
        });
        checkout.open();
      });
    },
    onSuccess: async (payload) => {
      if (payload?.cancelled) {
        toast.info('Checkout closed. No changes were made.');
      } else if (payload?.checkoutUnavailable) {
        toast.error('Razorpay checkout could not load. Try again or use demo activation.');
      } else {
        toast.success(payload?.message || 'Plan updated.');
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['billing'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        ]);
        await refresh();
      }
      setSubscribing(null);
    },
    onError: (err) => {
      toast.error(err.message || 'Could not change your plan.');
      setSubscribing(null);
    },
  });

  const cancel = useMutation({
    mutationFn: async () => unwrap(await api.post('/billing/cancel')),
    onSuccess: async (payload) => {
      toast.success(payload?.message || 'Subscription cancelled.');
      setCancelling(false);
      await queryClient.invalidateQueries({ queryKey: ['billing'] });
      await refresh();
    },
    onError: (err) => toast.error(err.message || 'Could not cancel the subscription.'),
  });

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-20" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-64" /><Skeleton className="h-64" /><Skeleton className="h-64" /></div></div>;
  }
  if (error) return <ErrorState message={error.message} onRetry={refetch} />;

  const records = data?.billingRecords || [];
  const invoices = data?.invoices || [];
  const history = data?.history || [];

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Billing & subscription"
        subtitle="Manage the workspace plan, payment history and client invoices."
        eyebrow="Manage"
        actions={<Badge tone="primary">{currentPlan?.name || 'Free'} plan</Badge>}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current plan" value={currentPlan?.name || 'Free'} hint={subscription?.renewal_date ? `Renews ${formatDate(subscription.renewal_date)}` : 'No renewal date'} icon={Crown} tone="primary" />
        <StatCard label="Recurring billing" value={currency(subscription?.amount || currentPlan?.price)} hint={subscription?.billing || 'monthly'} icon={CreditCard} tone="info" />
        <StatCard label="Invoice records" value={currency(records.reduce((sum, row) => sum + Number(row.amount || 0), 0))} hint={`${records.length} billing records`} icon={CircleDollarSign} tone="success" />
        <StatCard label="Client invoices" value={invoices.length} hint={`${currency(invoices.filter((i) => i.status === 'pending').reduce((sum, i) => sum + Number(i.total || 0), 0))} pending`} icon={History} tone="warning" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader
            title="Plan usage"
            subtitle="Live usage against the limits of your current plan."
            icon={Gauge}
            action={<button type="button" className="text-xs font-semibold text-primary" onClick={() => document.getElementById('billing-plans')?.scrollIntoView({ behavior: 'smooth' })}>Change plan</button>}
          />
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            {usageItems.map((item) => {
              const unlimited = item.limit === -1 || item.limit == null;
              const pct = unlimited ? 0 : Math.min(100, Math.round((Number(item.used || 0) / Math.max(1, Number(item.limit))) * 100));
              return (
                <div key={item.key} className="rounded-xl border border-line p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-xs font-semibold text-ink"><item.icon className="h-3.5 w-3.5 text-primary" /> {item.label}</span>
                    <span className="text-[11px] text-muted">{item.used}{unlimited ? '' : ` / ${item.limit}`}</span>
                  </div>
                  <Progress value={unlimited ? 8 : pct} tone={pct >= 90 ? 'danger' : pct >= 75 ? 'warning' : 'primary'} />
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <CardHeader title="Subscription" subtitle="Your workspace billing status" icon={ShieldCheck} />
          <div className="space-y-3 p-5">
            <div className="flex items-center justify-between rounded-xl border border-line p-3">
              <div>
                <p className="text-xs font-semibold text-ink">{currentPlan?.name || 'Free'} plan</p>
                <p className="text-[10px] text-muted">{subscription?.billing || 'monthly'} billing</p>
              </div>
              <Badge tone={statusTone(subscription?.status || 'active')} dot>{subscription?.status || 'active'}</Badge>
            </div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted">Started</span><span className="font-semibold text-ink">{formatDate(subscription?.start_date)}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted">Next renewal</span><span className="font-semibold text-ink">{formatDate(subscription?.renewal_date)}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted">Amount</span><span className="font-semibold text-ink">{currency(subscription?.amount || currentPlan?.price)}</span></div>
            <div className="flex items-center justify-between text-xs"><span className="text-muted">Gateway</span><span className="font-semibold capitalize text-ink">{subscription?.gateway || 'demo'}</span></div>
            {!data?.gateways?.razorpay ? (
              <p className="rounded-lg bg-warning/10 px-3 py-2 text-[11px] text-warning">Razorpay is not configured. Plan changes activate in demo mode.</p>
            ) : null}
            {isAdmin && subscription?.status === 'active' ? (
              <Button variant="secondary" size="sm" className="w-full" onClick={() => setCancelling(true)}>Cancel subscription</Button>
            ) : null}
          </div>
        </Card>
      </div>

      <div id="billing-plans" className="mb-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-ink">Plans & pricing</h2>
            <p className="text-xs text-muted">Upgrade or downgrade at any time. Yearly billing includes two months free.</p>
          </div>
          <div className="inline-flex rounded-xl border border-line bg-surface p-1">
            {['monthly', 'yearly'].map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBilling(cycle)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${billing === cycle ? 'bg-primary text-white' : 'text-muted hover:text-ink'}`}
              >
                {cycle}{cycle === 'yearly' ? ' · save 17%' : ''}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => {
            const active = plan.id === currentPlan?.id;
            const price = billing === 'yearly' ? Number(plan.price || 0) * 10 : Number(plan.price || 0);
            return (
              <Card key={plan.id} className={`relative flex flex-col p-5 ${plan.highlight ? 'border-primary/40 shadow-glow' : ''}`}>
                {plan.highlight ? <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Most popular</span> : null}
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold text-ink">{plan.name}</h3>
                  {active ? <Badge tone="success" dot>Current</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-muted">{plan.description}</p>
                <p className="mt-4 text-3xl font-extrabold tracking-tight text-ink">
                  {price === 0 ? 'Free' : currency(price)}
                  {price > 0 ? <span className="text-xs font-medium text-muted">/{billing === 'yearly' ? 'year' : 'month'}</span> : null}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {(plan.features || []).map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-xs text-muted"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />{feature}</li>
                  ))}
                </ul>
                <Button
                  className="mt-5 w-full"
                  variant={active ? 'secondary' : plan.highlight ? 'primary' : 'soft'}
                  disabled={!isAdmin || active || subscribe.isPending}
                  loading={subscribing === plan.id && subscribe.isPending}
                  onClick={() => { setSubscribing(plan.id); subscribe.mutate({ plan, yearly: billing === 'yearly' }); }}
                >
                  {active ? 'Current plan' : isAdmin ? 'Choose plan' : <><Lock className="h-3.5 w-3.5" /> Admin only</>}
                </Button>
              </Card>
            );
          })}
        </div>
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'history', label: 'Subscription history', count: history.length },
          { value: 'invoices', label: 'Client invoices', count: invoices.length },
          { value: 'records', label: 'Billing records', count: records.length },
        ]}
      />

      {tab === 'history' ? (
        <Card className="overflow-hidden">
          {history.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Plan</th><th>Period</th><th>Gateway</th><th>Status</th><th>Paid</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium text-ink">{row.plan_name || currentPlan?.name || 'Subscription'}</td>
                      <td className="text-muted">{row.period || formatDate(row.created_at)}</td>
                      <td className="capitalize text-muted">{row.gateway || 'demo'}</td>
                      <td><Badge tone={statusTone(row.status)} dot>{row.status}</Badge></td>
                      <td className="text-muted">{formatDate(row.paid_at || row.created_at)}</td>
                      <td className="text-right font-semibold text-ink">{currency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No subscription payments" description="Plan payments will appear here." icon={History} />}
        </Card>
      ) : null}

      {tab === 'invoices' ? (
        <Card className="overflow-hidden">
          {invoices.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Invoice</th><th>Issued</th><th>Due</th><th>Status</th><th className="text-right">Total</th></tr></thead>
                <tbody>
                  {invoices.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium text-ink">{row.invoice_number}</td>
                      <td className="text-muted">{formatDate(row.issue_date)}</td>
                      <td className="text-muted">{formatDate(row.due_date)}</td>
                      <td><Badge tone={statusTone(row.status)} dot>{row.status}</Badge></td>
                      <td className="text-right font-semibold text-ink">{currency(row.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No client invoices" description="Invoices raised for clients will be listed here." icon={CreditCard} />}
        </Card>
      ) : null}

      {tab === 'records' ? (
        <Card className="overflow-hidden">
          {records.length ? (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Invoice</th><th>Plan</th><th>Billing date</th><th>Due</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
                <tbody>
                  {records.map((row) => (
                    <tr key={row.id}>
                      <td className="font-medium text-ink">{row.invoice_number}</td>
                      <td className="text-muted">{row.plan}</td>
                      <td className="text-muted">{formatDate(row.billing_date)}</td>
                      <td className="text-muted">{formatDate(row.due_date)}</td>
                      <td><Badge tone={statusTone(row.status)} dot>{row.status}</Badge></td>
                      <td className="text-right font-semibold text-ink">{currency(row.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState title="No billing records" description="Client billing records will appear here." icon={Wallet} />}
        </Card>
      ) : null}

      <p className="mt-4 flex items-center gap-1.5 text-[11px] text-muted">
        <RefreshCcw className="h-3 w-3" /> Billing changes are audited. Razorpay is optional — add keys in <code className="rounded bg-surface2 px-1">server/.env</code> for live checkout.
      </p>

      <ConfirmDialog
        open={cancelling}
        onClose={() => setCancelling(false)}
        onConfirm={() => cancel.mutate()}
        loading={cancel.isPending}
        title="Cancel this subscription?"
        description="Access remains available until the renewal date. You can reactivate by choosing a plan again."
        confirmLabel="Cancel subscription"
        tone="warning"
      />
    </div>
  );
}
