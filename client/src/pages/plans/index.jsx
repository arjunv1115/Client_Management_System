import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, BadgeCheck, Check, CheckCircle2, CircleDollarSign, Crown, Gauge, HelpCircle,
  Lock, Sparkles, TrendingUp, Users, Wallet, X,
} from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { useBillingOverview } from '../../lib/hooks';
import { useAuth } from '../../contexts/AuthContext';
import {
  Badge, Button, Card, CardHeader, PageHeader, Progress, Skeleton, StatCard,
} from '../../components/ui';
import { cn, currency, formatDate } from '../../lib/utils';

const LIMIT_ROWS = [
  { key: 'clients', label: 'Clients', format: (value) => (value < 0 ? 'Unlimited' : value) },
  { key: 'projects', label: 'Projects', format: (value) => (value < 0 ? 'Unlimited' : value) },
  { key: 'teammates', label: 'Team members', format: (value) => (value < 0 ? 'Unlimited' : value) },
  { key: 'leads', label: 'Active leads', format: (value) => (value < 0 ? 'Unlimited' : value) },
  { key: 'ai_quotes', label: 'AI quotations / month', format: (value) => (value < 0 ? 'Unlimited' : value) },
  { key: 'ai_requests', label: 'AI requests / month', format: (value) => (value < 0 ? 'Unlimited' : value) },
  { key: 'storage_mb', label: 'Storage', format: (value) => (value < 0 ? 'Unlimited' : `${value >= 1024 ? `${(value / 1024).toFixed(0)} GB` : `${value} MB`}`) },
];

const FAQS = [
  ['Can I change plans later?', 'Yes. Upgrade or downgrade at any time. Your new plan starts immediately in demo mode and renews from that date.'],
  ['What happens when I hit a limit?', 'You can keep viewing everything, but creating a record beyond the limit is blocked until you upgrade. We warn you at 80% usage.'],
  ['Is Razorpay required?', 'No. Without Razorpay keys the app activates plans in demo mode. Add keys in server/.env for live checkout in Billing.'],
  ['Do clients need a paid seat?', 'No. Client portal users are not counted against teammate seats unless you add them as team members.'],
  ['Does AI act on its own?', 'Never. AI output is a draft. It must be explicitly approved before it is saved or used.'],
];

export default function PlansPage() {
  const { isAdmin, refresh } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useBillingOverview();
  const [billing, setBilling] = useState('monthly');
  const [subscribing, setSubscribing] = useState(null);

  const plans = data?.plans || [];
  const currentPlan = data?.plan;
  const usage = data?.usage || {};

  const subscribe = useMutation({
    mutationFn: async (plan) => unwrap(await api.post('/billing/subscribe', { plan_id: plan.id, billing, demo: true })),
    onSuccess: async (payload) => {
      toast.success(payload?.message || 'Plan updated.');
      setSubscribing(null);
      await queryClient.invalidateQueries({ queryKey: ['billing'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      await refresh();
    },
    onError: (error) => {
      toast.error(error.message || 'Could not change plan.');
      setSubscribing(null);
    },
  });

  const usageRows = useMemo(() => [
    { key: 'clients', label: 'Clients', icon: Users },
    { key: 'projects', label: 'Projects', icon: Gauge },
    { key: 'teammates', label: 'Teammates', icon: Users },
    { key: 'ai_requests', label: 'AI requests', icon: Sparkles },
  ].map((item) => {
    const used = usage[item.key] || 0;
    const limit = currentPlan?.limits?.[item.key] ?? 0;
    return { ...item, used, limit, pct: limit < 0 ? 0 : Math.min(100, Math.round((used / Math.max(1, limit)) * 100)) };
  }), [usage, currentPlan]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Plans & pricing"
        subtitle="Choose the workspace plan that fits your studio. Every plan includes the full client portal."
        eyebrow="Growth"
        actions={<Badge tone="primary"><Crown className="mr-1 h-3 w-3" /> {currentPlan?.name || 'Free'} plan</Badge>}
      />

      {isLoading ? (
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72" /><Skeleton className="h-72" /><Skeleton className="h-72" /></div>
      ) : (
        <>
          <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Current plan" value={currentPlan?.name || 'Free'} hint="Workspace subscription" icon={Crown} tone="primary" />
            <StatCard label="Monthly price" value={currency(currentPlan?.price)} hint={data?.subscription?.billing || 'monthly billing'} icon={CircleDollarSign} tone="info" />
            <StatCard label="Renews" value={formatDate(data?.subscription?.renewal_date)} hint="Auto-renews in demo mode" icon={TrendingUp} tone="success" />
            <StatCard label="Seats used" value={`${usage.teammates || 0}${currentPlan?.limits?.teammates < 0 ? '' : `/${currentPlan?.limits?.teammates}`}`} hint="Team members" icon={Users} tone="warning" />
          </div>

          <div className="mb-8 grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader title="Plan usage" subtitle="Where your workspace stands right now." icon={Gauge} />
              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {usageRows.map((row) => (
                  <div key={row.key}>
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-ink"><row.icon className="h-3.5 w-3.5 text-primary" /> {row.label}</span>
                      <span className="text-muted">{row.used}{row.limit < 0 ? ' · unlimited' : ` / ${row.limit}`}</span>
                    </div>
                    <Progress value={row.limit < 0 ? 10 : row.pct} tone={row.pct >= 90 ? 'danger' : row.pct >= 75 ? 'warning' : 'primary'} />
                  </div>
                ))}
              </div>
            </Card>
            <Card className="flex flex-col justify-between p-5">
              <div>
                <p className="text-xs font-semibold text-ink">Billing preferences</p>
                <p className="mt-1 text-[11px] text-muted">Yearly billing gives you two months free. You can change this any time.</p>
                <div className="mt-4 grid gap-2">
                  {['monthly', 'yearly'].map((cycle) => (
                    <button
                      key={cycle}
                      type="button"
                      onClick={() => setBilling(cycle)}
                      className={cn('flex items-center justify-between rounded-xl border px-3 py-2.5 text-left transition', billing === cycle ? 'border-primary bg-primary-soft/50' : 'border-line hover:border-primary/30')}
                    >
                      <span>
                        <span className="block text-xs font-semibold capitalize text-ink">{cycle} billing</span>
                        <span className="block text-[10px] text-muted">{cycle === 'yearly' ? 'Save ~17%' : 'Pay month to month'}</span>
                      </span>
                      {billing === cycle ? <CheckCircle2 className="h-4 w-4 text-primary" /> : <span className="h-4 w-4 rounded-full border border-line" />}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-4 rounded-lg bg-surface2 p-2.5 text-[10px] text-muted">Plan changes on this page use demo activation. Live Razorpay checkout is available in Billing.</p>
            </Card>
          </div>

          <div className="mb-10 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => {
              const active = plan.id === currentPlan?.id;
              const price = billing === 'yearly' ? Number(plan.price || 0) * 10 : Number(plan.price || 0);
              return (
                <Card key={plan.id} className={cn('relative flex flex-col p-5', plan.highlight && 'border-primary/40 shadow-glow')}>
                  {plan.highlight ? <span className="absolute -top-2.5 right-4 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-white">Best value</span> : null}
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-lg font-bold text-ink">{plan.name}</h3>
                    {active ? <Badge tone="success" dot>Current</Badge> : null}
                  </div>
                  <p className="mt-1 min-h-[32px] text-xs text-muted">{plan.description}</p>
                  <div className="mt-4 flex items-end gap-1">
                    <span className="font-display text-3xl font-extrabold tracking-tight text-ink">{price === 0 ? 'Free' : currency(price)}</span>
                    {price > 0 ? <span className="pb-1 text-xs text-muted">/{billing === 'yearly' ? 'year' : 'month'}</span> : null}
                  </div>
                  <ul className="mt-5 flex-1 space-y-2">
                    {(plan.features || []).map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-xs text-muted"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />{feature}</li>
                    ))}
                  </ul>
                  <Button
                    className="mt-5 w-full"
                    variant={active ? 'secondary' : plan.highlight ? 'primary' : 'soft'}
                    disabled={!isAdmin || active || subscribe.isPending}
                    loading={subscribing === plan.id && subscribe.isPending}
                    onClick={() => { setSubscribing(plan.id); subscribe.mutate(plan); }}
                  >
                    {active ? 'Current plan' : isAdmin ? <>Activate {plan.name} <ArrowRight className="h-3.5 w-3.5" /></> : <><Lock className="h-3.5 w-3.5" /> Admin only</>}
                  </Button>
                  {!isAdmin ? <p className="mt-2 text-center text-[10px] text-muted">Ask an admin to change the plan.</p> : null}
                </Card>
              );
            })}
          </div>

          <Card className="mb-8 overflow-hidden">
            <CardHeader title="Compare plans" subtitle="Every limit, side by side." icon={BadgeCheck} />
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr><th>Feature</th>{plans.map((plan) => <th key={plan.id} className="text-center">{plan.name}</th>)}</tr>
                </thead>
                <tbody>
                  {LIMIT_ROWS.map((row) => (
                    <tr key={row.key}>
                      <td className="font-medium text-ink">{row.label}</td>
                      {plans.map((plan) => {
                        const value = plan.limits?.[row.key];
                        return (
                          <td key={plan.id} className="text-center">
                            {value < 0 ? <Badge tone="success">Unlimited</Badge> : <span className="text-xs text-muted">{row.format(value ?? 0)}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  <tr>
                    <td className="font-medium text-ink">Client portal</td>
                    {plans.map((plan) => <td key={plan.id} className="text-center"><Check className="mx-auto h-4 w-4 text-success" /></td>)}
                  </tr>
                  <tr>
                    <td className="font-medium text-ink">Payroll</td>
                    {plans.map((plan) => <td key={plan.id} className="text-center">{plan.name === 'Pro' || plan.name === 'Ultra' ? <Check className="mx-auto h-4 w-4 text-success" /> : <X className="mx-auto h-4 w-4 text-muted/40" />}</td>)}
                  </tr>
                  <tr>
                    <td className="font-medium text-ink">White label</td>
                    {plans.map((plan) => <td key={plan.id} className="text-center">{plan.name === 'Ultra' ? <Check className="mx-auto h-4 w-4 text-success" /> : <X className="mx-auto h-4 w-4 text-muted/40" />}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>

          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card>
              <CardHeader title="Frequently asked questions" subtitle="Plan, billing and limits." icon={HelpCircle} />
              <div className="divide-y divide-line">
                {FAQS.map(([question, answer], index) => (
                  <details key={question} open={index === 0} className="group p-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-xs font-semibold text-ink">
                      {question}
                      <span className="text-muted transition group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted">{answer}</p>
                  </details>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Wallet className="h-5 w-5" /></span>
              <p className="mt-3 text-sm font-semibold text-ink">Need a custom plan?</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">For larger teams, white-label portals or data migration, talk to us. We can tailor limits and onboarding.</p>
              <Button variant="secondary" className="mt-4 w-full" onClick={() => { window.location.href = 'mailto:hello@pixelforge.studio?subject=Custom%20plan'; }}>
                Contact sales
              </Button>
              <div className="mt-4 space-y-2 border-t border-line pt-4 text-[11px] text-muted">
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" /> No credit card for the demo</p>
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" /> Cancel any time</p>
                <p className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-success" /> Your data stays yours</p>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
