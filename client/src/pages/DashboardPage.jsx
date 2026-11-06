import { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import {
  ArrowRight, ArrowUpRight, CalendarDays, CheckSquare, CircleDollarSign, Clock, FolderKanban,
  HandCoins, IndianRupee, RefreshCw, Sparkles, Target, TrendingUp, Users, Wallet,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { rangeOptions, currency, formatDate, getGreeting, timeAgo, statusTone } from '../lib/utils';
import { useDashboardSummary, useDashboardWidgets } from '../lib/hooks';
import {
  Badge, Button, Card, CardHeader, EmptyState, ErrorState, IconButton, PageHeader, Progress, Skeleton, StatCard,
} from '../components/ui';
import { ChartCard, DonutChart, PaymentHistoryChart, PipelineFunnel, RevenueExpenseChart } from '../components/charts/Charts';

function KpiSkeletons() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="p-5"><Skeleton className="h-3 w-24" /><Skeleton className="mt-4 h-7 w-32" /><Skeleton className="mt-3 h-3 w-20" /></Card>
      ))}
    </div>
  );
}

function ActivityIcon({ module }) {
  const icons = {
    payments: CircleDollarSign, leads: Target, tasks: CheckSquare, documents: FolderKanban,
    meetings: CalendarDays, projects: FolderKanban, clients: Users,
  };
  const Icon = icons[module] || Clock;
  return <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="h-4 w-4" /></span>;
}

export default function DashboardPage() {
  const { user, isClient } = useAuth();
  const [range, setRange] = useState('30d');
  const summaryQuery = useDashboardSummary(range);
  const widgetsQuery = useDashboardWidgets(range);
  const summary = summaryQuery.data;
  const widgets = widgetsQuery.data;

  const refresh = () => {
    summaryQuery.refetch();
    widgetsQuery.refetch();
  };

  const stats = summary?.stats || {};
  const comparison = summary?.comparison || {};
  const plan = widgets?.plan;

  const reminders = useMemo(() => widgets?.reminders?.today?.length
    ? widgets.reminders.today
    : (widgets?.reminders?.upcoming || []).slice(0, 4), [widgets]);

  if (isClient) return <Navigate to="/client-portal" replace />;

  if (summaryQuery.isError || widgetsQuery.isError) {
    return (
      <ErrorState
        message={(summaryQuery.error || widgetsQuery.error)?.message}
        onRetry={refresh}
      />
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow={new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={`${getGreeting()}, ${user?.name?.split(' ')[0] || 'there'} 👋`}
        subtitle="Here is the pulse of your studio — pipeline, delivery and money in one view."
        actions={(
          <>
            <div className="relative">
              <select value={range} onChange={(event) => setRange(event.target.value)} className="select h-9 w-auto min-w-[150px] pr-8 text-xs" aria-label="Dashboard range">
                {rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <IconButton label="Refresh dashboard" onClick={refresh} title="Refresh">
              <RefreshCw className={`h-4 w-4 ${summaryQuery.isFetching ? 'animate-spin' : ''}`} />
            </IconButton>
            <Link to="/ai"><Button variant="soft"><Sparkles className="h-4 w-4" /> Ask AI</Button></Link>
          </>
        )}
      />

      {summaryQuery.isLoading ? <KpiSkeletons /> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Revenue"
            value={currency(stats.totalRevenue)}
            delta={comparison.revenue}
            hint="vs previous period"
            icon={IndianRupee}
            tone="primary"
          />
          <StatCard
            label="Net revenue"
            value={currency(stats.netRevenue)}
            delta={comparison.netRevenue}
            hint={`${currency(stats.totalExpenses, 'INR', true)} expenses`}
            icon={TrendingUp}
            tone="success"
          />
          <StatCard
            label="Payments received"
            value={currency(stats.paymentsReceived)}
            delta={comparison.paymentsReceived}
            hint={`${currency(stats.pendingPayments, 'INR', true)} pending`}
            icon={Wallet}
            tone="info"
          />
          <StatCard
            label="Money in account"
            value={currency(stats.moneyInAccount)}
            hint={`${currency(stats.mrr, 'INR', true)} MRR · ${stats.activeRetainers} retainers`}
            icon={HandCoins}
            tone="warning"
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/leads" className="card card-hover flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Target className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Open leads</p>
            <p className="text-xl font-bold text-ink">{stats.openLeads || 0}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted" />
        </Link>
        <Link to="/clients" className="card card-hover flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success"><Users className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Active clients</p>
            <p className="text-xl font-bold text-ink">{stats.totalClients || 0}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted" />
        </Link>
        <Link to="/projects" className="card card-hover flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-info/10 text-info"><FolderKanban className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Ongoing projects</p>
            <p className="text-xl font-bold text-ink">{stats.ongoingProjects || 0}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted" />
        </Link>
        <Link to="/tasks" className="card card-hover flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-warning/10 text-warning"><CheckSquare className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Tasks due</p>
            <p className="text-xl font-bold text-ink">{stats.openTasks || 0} <span className="text-xs font-medium text-danger">{stats.overdueTasks ? `· ${stats.overdueTasks} overdue` : ''}</span></p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-muted" />
        </Link>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Revenue vs expenses"
          subtitle="Last six months of completed ledger activity"
          icon={TrendingUp}
          height={310}
          action={<Link to="/revenue-management" className="text-xs font-semibold text-primary hover:underline">Open revenue →</Link>}
        >
          {widgetsQuery.isLoading ? <Skeleton className="h-full w-full" /> : <RevenueExpenseChart data={widgets?.revenueTrend?.series || []} height={280} />}
        </ChartCard>

        <Card>
          <CardHeader title="Today & next up" subtitle="Reminders and meetings that need you" icon={CalendarDays} action={<Link to="/meetings" className="text-xs font-semibold text-primary">View all</Link>} />
          <div className="p-4">
            {widgetsQuery.isLoading ? (
              <div className="space-y-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-12" />)}</div>
            ) : (
              <div className="space-y-2.5">
                {reminders.slice(0, 3).map((reminder) => (
                  <div key={reminder.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface2/60 p-2.5">
                    <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${reminder.priority === 'high' ? 'bg-danger' : 'bg-warning'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{reminder.title}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{formatDate(reminder.reminder_date)} · {reminder.reminder_time}</p>
                    </div>
                    <Badge tone={statusTone(reminder.type)}>{reminder.type}</Badge>
                  </div>
                ))}
                {(widgets?.upcomingMeetings || []).slice(0, 2).map((meeting) => (
                  <div key={meeting.id} className="flex items-start gap-2.5 rounded-xl border border-line bg-surface2/60 p-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{meeting.title}</p>
                      <p className="mt-0.5 text-[10px] text-muted">{formatDate(meeting.meeting_date)} · {meeting.start_time} · {meeting.client_name}</p>
                    </div>
                    <CalendarDays className="h-3.5 w-3.5 text-muted" />
                  </div>
                ))}
                {!reminders.length && !widgets?.upcomingMeetings?.length ? (
                  <EmptyState title="Nothing scheduled" description="Your day is clear — a good time to work on the pipeline." />
                ) : null}
              </div>
            )}
            <Button variant="secondary" size="sm" className="mt-3 w-full" onClick={() => {}}>
              <Link to="/tasks" className="flex w-full items-center justify-center gap-2">Open task board <ArrowRight className="h-3.5 w-3.5" /></Link>
            </Button>
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
        <ChartCard title="Sales pipeline" subtitle="Open leads by stage" icon={Target} height={320}>
          {widgetsQuery.isLoading ? <Skeleton className="h-full w-full" /> : <PipelineFunnel stages={widgets?.pipeline?.byStage || []} height={280} />}
        </ChartCard>
        <ChartCard title="Revenue mix" subtitle="Income by category" icon={CircleDollarSign} height={320}>
          {widgetsQuery.isLoading ? <Skeleton className="h-full w-full" /> : (
            <DonutChart
              data={(widgets?.revenueByType || []).filter((item) => item.amount > 0)}
              nameKey="category"
              dataKey="amount"
              height={190}
              centerLabel="Period"
            />
          )}
        </ChartCard>
        <ChartCard title="Payment health" subtitle="Received, pending and failed" icon={Wallet} height={320}>
          {widgetsQuery.isLoading ? <Skeleton className="h-full w-full" /> : <PaymentHistoryChart data={widgets?.paymentHistory || []} height={280} />}
        </ChartCard>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Recent clients"
            subtitle="Newest relationships in your workspace"
            icon={Users}
            action={<Link to="/clients" className="text-xs font-semibold text-primary">All clients →</Link>}
          />
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Client</th><th>Status</th><th>Projects</th><th>Added</th><th /></tr></thead>
              <tbody>
                {(widgets?.recentClients || []).map((client) => (
                  <tr key={client.id}>
                    <td>
                      <Link to={`/clients/${client.id}`} className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-xs font-bold text-primary">{client.name.slice(0, 2).toUpperCase()}</span>
                        <span>
                          <span className="block text-xs font-semibold text-ink">{client.name}</span>
                          <span className="block text-[10px] text-muted">{client.company || client.industry}</span>
                        </span>
                      </Link>
                    </td>
                    <td><Badge tone={statusTone(client.status)} dot>{client.status}</Badge></td>
                    <td><span className="text-xs text-muted">{client.ongoing_count} ongoing / {client.project_count}</span></td>
                    <td><span className="text-xs text-muted">{formatDate(client.created_at)}</span></td>
                    <td className="text-right"><Link to={`/clients/${client.id}`} className="icon-btn h-7 w-7"><ArrowRight className="h-3.5 w-3.5" /></Link></td>
                  </tr>
                ))}
                {!widgets?.recentClients?.length && !widgetsQuery.isLoading ? <tr><td colSpan={5}><EmptyState title="No clients yet" description="Add your first client to see them here." /></td></tr> : null}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Upcoming tasks" subtitle="Sorted by due date" icon={CheckSquare} action={<Link to="/tasks" className="text-xs font-semibold text-primary">Board →</Link>} />
            <div className="space-y-2 p-4">
              {(widgets?.upcomingTasks || []).slice(0, 5).map((task) => (
                <Link key={task.id} to="/tasks" className="block rounded-xl border border-line bg-surface2/50 p-2.5 transition hover:border-primary/25">
                  <p className="truncate text-xs font-semibold text-ink">{task.title}</p>
                  <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
                    <span>{task.project_name || 'Internal'}</span>
                    <span className={task.due_date < new Date().toISOString().slice(0, 10) ? 'font-semibold text-danger' : ''}>{formatDate(task.due_date)}</span>
                  </div>
                </Link>
              ))}
              {!widgets?.upcomingTasks?.length && !widgetsQuery.isLoading ? <p className="py-6 text-center text-xs text-muted">No open tasks. Enjoy the calm.</p> : null}
            </div>
          </Card>

          <Card className="border-primary/20">
            <CardHeader title="Plan usage" subtitle={plan?.plan ? `${plan.plan.name} plan` : 'Current plan'} icon={Sparkles} action={<Link to="/plans" className="text-xs font-semibold text-primary">Manage</Link>} />
            <div className="space-y-4 p-4">
              {['clients', 'projects', 'ai_requests'].map((key) => {
                const used = plan?.usage?.[key]?.used ?? 0;
                const limit = plan?.usage?.[key]?.limit ?? -1;
                return (
                  <div key={key}>
                    <div className="mb-1.5 flex justify-between text-[11px]">
                      <span className="font-medium capitalize text-muted">{key.replace('_', ' ')}</span>
                      <span className="font-semibold text-ink">{used}/{limit < 0 ? '∞' : limit}</span>
                    </div>
                    <Progress value={limit < 0 ? 8 : (used / Math.max(1, limit)) * 100} tone={limit >= 0 && used / limit > 0.85 ? 'warning' : 'primary'} />
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent activity" subtitle="What your team has been doing" icon={Clock} />
          <div className="space-y-1 p-3">
            {(widgets?.recentActivity || []).map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-xl p-2.5 hover:bg-surface2/60">
                <ActivityIcon module={log.module} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-ink">{log.description}</p>
                  <p className="mt-0.5 text-[10px] text-muted">{log.user_name} · {timeAgo(log.created_at)}</p>
                </div>
                <Badge tone="neutral">{log.module}</Badge>
              </div>
            ))}
            {!widgets?.recentActivity?.length && !widgetsQuery.isLoading ? <p className="py-6 text-center text-xs text-muted">Activity will appear here as your team works.</p> : null}
          </div>
        </Card>

        <Card>
          <CardHeader title="Active retainers" subtitle="Recurring revenue health" icon={HandCoins} action={<Link to="/active-retainers" className="text-xs font-semibold text-primary">Manage →</Link>} />
          <div className="space-y-2 p-4">
            {(widgets?.activeRetainers || []).map((retainer) => (
              <div key={retainer.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface2/50 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-ink">{retainer.client_name}</p>
                  <p className="truncate text-[10px] text-muted">{retainer.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-ink">{currency(retainer.monthly_equivalent)}<span className="text-[10px] font-medium text-muted">/mo</span></p>
                  <Badge tone={statusTone(retainer.payment_status)} className="mt-1">{retainer.payment_status}</Badge>
                </div>
              </div>
            ))}
            {!widgets?.activeRetainers?.length && !widgetsQuery.isLoading ? <p className="py-6 text-center text-xs text-muted">No active retainers yet.</p> : null}
          </div>
        </Card>
      </div>
    </div>
  );
}
