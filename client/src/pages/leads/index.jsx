import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowRight, Building2, CalendarDays, CheckCircle2, CircleDollarSign, Clock, Mail, MapPin,
  Phone, Plus, RefreshCw, Sparkles, Target, TrendingUp, UserPlus, Users, Wand2,
} from 'lucide-react';
import CrudPage from '../../components/common/CrudPage';
import DataTable from '../../components/common/DataTable';
import { AiCard, AiResult, AiButton } from '../../components/common/AiAssistant';
import { InfoGrid, MiniStat, SectionCard, SeverityBadge, DetailHeader, RecordLink } from '../../components/common/Detail';
import {
  Avatar, Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, Progress, Skeleton, StatCard,
} from '../../components/ui';
import { useLookups } from '../../lib/lookups';
import { useAiInsight, useModuleStats, useRecord, useResource, useResourceActions } from '../../lib/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { api, unwrap } from '../../lib/api';
import { currency, formatDate, timeAgo, statusTone } from '../../lib/utils';

const stageDot = (stage) => (
  <span className="h-1.5 w-1.5 rounded-full" style={{ background: stage?.color || '#94a3b8' }} />
);

export function LeadsPage() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const { options, names } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.leads || {};

  const columns = useMemo(() => [
    {
      key: 'name', header: 'Lead', sortable: true,
      render: (row) => (
        <div className="flex min-w-[180px] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-[11px] font-bold text-primary">
            {(row.name || '?').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.name}</p>
            <p className="truncate text-[10px] text-muted">{row.company || row.email || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'stage', header: 'Stage', sortable: true, sortKey: 'stage',
      render: (row) => {
        const stage = options.leadStages?.find((s) => s.id === row.stage_id);
        return <Badge tone={statusTone(row.stage)} className="whitespace-nowrap">{stageDot(stage)}{row.stage || 'New'}</Badge>;
      },
    },
    {
      key: 'estimated_budget', header: 'Value', sortable: true,
      render: (row) => <span className="text-xs font-semibold text-ink">{currency(row.estimated_budget)}</span>,
    },
    {
      key: 'priority', header: 'Priority', sortable: true,
      render: (row) => <SeverityBadge value={row.priority} />,
    },
    {
      key: 'score', header: 'Score', sortable: true,
      render: (row) => (
        <div className="w-20">
          <Progress value={row.score || 0} tone={(row.score || 0) >= 70 ? 'success' : (row.score || 0) >= 40 ? 'primary' : 'warning'} showLabel />
        </div>
      ),
    },
    {
      key: 'assigned_to', header: 'Owner', sortable: true,
      render: (row) => {
        const person = names.person(row.assigned_to);
        return (
          <div className="flex min-w-[110px] items-center gap-2">
            <Avatar name={person} size="xs" />
            <span className="truncate text-xs text-ink">{person}</span>
          </div>
        );
      },
    },
    {
      key: 'created_at', header: 'Added', sortable: true,
      render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.created_at)}</span>,
    },
  ], [options.leadStages, names]);

  const fields = useMemo(() => [
    { name: 'name', label: 'Contact name', required: true, placeholder: 'Rahul Mehta' },
    { name: 'company', label: 'Company', placeholder: 'Nexa Retail' },
    { name: 'email', label: 'Email', type: 'email', placeholder: 'name@company.com' },
    { name: 'phone', label: 'Phone', placeholder: '+91 98…' },
    {
      name: 'source', label: 'Source', type: 'select',
      options: (options.leadSources || []).map((s) => ({ value: s.name, label: s.name })),
    },
    {
      name: 'stage_id', label: 'Stage', type: 'select',
      options: (options.leadStages || []).map((s) => ({ value: s.id, label: s.name })),
    },
    { name: 'service', label: 'Service interested in', placeholder: 'Website redesign' },
    { name: 'estimated_budget', label: 'Estimated budget (₹)', type: 'number', min: 0 },
    {
      name: 'priority', label: 'Priority', type: 'select',
      options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }],
    },
    { name: 'expected_close_date', label: 'Expected close', type: 'date' },
    {
      name: 'assigned_to', label: 'Assigned to', type: 'select',
      options: (options.profiles || []).map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` })),
    },
    { name: 'location', label: 'Location', placeholder: 'Mumbai, India' },
    { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 3 },
  ], [options]);

  return (
    <CrudPage
      title="Leads"
      subtitle="Every opportunity in one place — score, qualify and convert without losing context."
      eyebrow="Sales"
      resource="leads"
      columns={columns}
      fields={fields}
      initialValues={{ priority: 'medium', source: 'Website', status: 'open' }}
      searchPlaceholder="Search name, company, email…"
      addLabel="New lead"
      canWrite={isManager}
      canDelete={isManager}
      onRowClick={(row) => navigate(`/leads/${row.id}`)}
      filterDefs={[
        { key: 'stage_id', label: 'Stage', options: (options.leadStages || []).map((s) => ({ value: s.id, label: s.name })) },
        { key: 'priority', label: 'Priority', options: ['high', 'medium', 'low'] },
        { key: 'status', label: 'Status', options: ['open', 'won', 'lost'] },
      ]}
      headerActions={<Link to="/sales-pipeline"><Button variant="secondary"><Target className="h-4 w-4" /> Pipeline board</Button></Link>}
      stats={(
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Open leads" value={stats.open ?? 0} hint={`${stats.total ?? 0} total leads`} icon={Target} tone="primary" loading={statsQuery.isLoading} />
          <StatCard label="Pipeline value" value={currency(stats.value)} hint="Open opportunities" icon={CircleDollarSign} tone="success" loading={statsQuery.isLoading} />
          <StatCard label="Won" value={stats.won ?? 0} hint="Converted to clients" icon={CheckCircle2} tone="info" loading={statsQuery.isLoading} />
          <StatCard label="Conversion" value={`${stats.conversion ?? 0}%`} hint="Won vs closed" icon={TrendingUp} tone="warning" loading={statsQuery.isLoading} />
        </div>
      )}
      emptyTitle="No leads match these filters"
      emptyDescription="Adjust the filters or add your first lead to start building the pipeline."
      emptyIcon={Target}
    />
  );
}

export function LeadDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { options, maps, names } = useLookups();
  const { isManager } = useAuth();
  const query = useRecord('leads', id);
  const lead = query.data;
  const { update } = useResourceActions('leads');
  const clients = useResourceActions('clients');
  const score = useAiInsight({ url: `/ai/leads/${id}/score` });
  const followUp = useAiInsight({ url: `/ai/leads/${id}/follow-up` });
  const [tone, setTone] = useState('friendly');
  const [notes, setNotes] = useState('');
  const [converting, setConverting] = useState(false);

  const saveNotes = async () => {
    try {
      await update.mutateAsync({ id, notes });
      toast.success('Notes saved.');
    } catch (error) {
      toast.error(error.message || 'Could not save notes.');
    }
  };

  const convert = async () => {
    try {
      setConverting(true);
      const client = await clients.create.mutateAsync({
        name: lead.company || lead.name,
        company: lead.company || lead.name,
        email: lead.email,
        phone: lead.phone,
        website: lead.website,
        location: lead.location,
        industry: lead.service,
        source: lead.source,
        status: 'active',
        notes: `Converted from lead ${lead.name}. ${lead.notes || ''}`.trim(),
      });
      await update.mutateAsync({ id, status: 'won', stage_id: 'ls_won', stage: 'Won' });
      queryClient.invalidateQueries({ queryKey: ['resource', 'leads'] });
      toast.success('Lead converted to a client.');
      navigate(`/clients/${client.id}`);
    } catch (error) {
      toast.error(error.message || 'Could not convert this lead.');
    } finally {
      setConverting(false);
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-72 lg:col-span-2" /><Skeleton className="h-72" /></div>
      </div>
    );
  }
  if (query.isError || !lead) {
    return <ErrorState message={query.error?.message || 'Lead not found.'} onRetry={query.refetch} />;
  }

  const stage = maps.leadStages[lead.stage_id];
  const owner = names.person(lead.assigned_to);

  return (
    <div>
      <DetailHeader
        backTo="/leads"
        backLabel="All leads"
        title={lead.name}
        subtitle={lead.company || lead.service || '—'}
        avatar={(
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-lg font-bold text-white shadow-glow">
            {(lead.name || '?').slice(0, 2).toUpperCase()}
          </span>
        )}
        badges={(
          <>
            <Badge tone={statusTone(lead.stage)} dot>{lead.stage || 'New'}</Badge>
            <SeverityBadge value={lead.priority} />
            <Badge tone={statusTone(lead.status)}>{lead.status}</Badge>
          </>
        )}
        actions={(
          <>
            <Button variant="secondary" onClick={() => score.mutate({})} loading={score.isPending}>
              <Sparkles className="h-4 w-4" /> Score lead
            </Button>
            {isManager ? (
              <Button onClick={convert} loading={converting || clients.create.isPending} disabled={lead.status === 'won'}>
                <UserPlus className="h-4 w-4" /> Convert to client
              </Button>
            ) : null}
          </>
        )}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <SectionCard title="Opportunity details" subtitle="Contact and deal information" icon={Building2}>
            <InfoGrid
              columns={2}
              items={[
                { label: 'Contact', value: lead.name },
                { label: 'Company', value: lead.company },
                { label: 'Email', value: lead.email ? <a className="text-primary hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a> : '—' },
                { label: 'Phone', value: lead.phone ? <a className="text-primary hover:underline" href={`tel:${lead.phone}`}>{lead.phone}</a> : '—' },
                { label: 'Service', value: lead.service },
                { label: 'Source', value: lead.source },
                { label: 'Estimated budget', value: currency(lead.estimated_budget) },
                { label: 'Expected close', value: formatDate(lead.expected_close_date) },
                { label: 'Location', value: lead.location },
                { label: 'Owner', value: owner },
                { label: 'Created', value: formatDate(lead.created_at) },
                { label: 'Last activity', value: timeAgo(lead.updated_at) },
              ]}
            />
          </SectionCard>

          <div className="grid gap-4 sm:grid-cols-3">
            <MiniStat label="Deal value" value={currency(lead.estimated_budget)} icon={CircleDollarSign} tone="success" />
            <MiniStat label="Lead score" value={`${lead.score || 0}%`} icon={TrendingUp} tone="primary" hint="AI + rules estimate" />
            <MiniStat label="Stage" value={stage?.name || lead.stage || 'New'} icon={Target} tone="info" />
          </div>

          <SectionCard title="Notes" subtitle="Internal context for the next conversation" icon={Clock}>
            <textarea
              className="textarea"
              rows={5}
              value={notes || lead.notes || ''}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Add context, objections, next steps…"
            />
            <div className="mt-3 flex justify-end">
              <Button size="sm" variant="secondary" onClick={saveNotes} loading={update.isPending} disabled={!notes}>Save notes</Button>
            </div>
          </SectionCard>

          <div className="grid gap-4 xl:grid-cols-2">
            <AiCard title="Lead score breakdown" subtitle="Explainable scoring, reviewed by you" action={<AiButton onClick={() => score.mutate({})} loading={score.isPending}>Re-score</AiButton>}>
              <AiResult result={score.data} loading={score.isPending} error={score.error} onRetry={() => score.mutate({})} feature="lead_scoring" entity="leads" entityId={id} useLabel="Accept score" />
              {score.data ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <MiniStat label="Readiness" value={score.data.readiness} />
                  <MiniStat label="Suggested stage" value={score.data.suggested_stage || '—'} />
                </div>
              ) : null}
            </AiCard>

            <AiCard title="Follow-up draft" subtitle="Draft a message you can edit before sending" action={<AiButton onClick={() => followUp.mutate({ tone })} loading={followUp.isPending}>Draft</AiButton>}>
              <div className="mb-3 flex items-center gap-2">
                <select value={tone} onChange={(event) => setTone(event.target.value)} className="select h-9 text-xs">
                  <option value="friendly">Friendly</option>
                  <option value="formal">Formal</option>
                  <option value="concise">Concise</option>
                  <option value="persuasive">Persuasive</option>
                </select>
                {followUp.data?.subject ? <span className="truncate text-xs text-muted">{followUp.data.subject}</span> : null}
              </div>
              <AiResult result={followUp.data} loading={followUp.isPending} error={followUp.error} onRetry={() => followUp.mutate({ tone })} feature="follow_up" entity="leads" entityId={id} useLabel="Approve draft" />
            </AiCard>
          </div>
        </div>

        <div className="space-y-4">
          <SectionCard title="Quick actions" subtitle="Keep the deal moving" icon={Wand2}>
            <div className="space-y-3">
              <div>
                <label className="label">Move stage</label>
                <select
                  className="select"
                  value={lead.stage_id || ''}
                  disabled={!isManager}
                  onChange={async (event) => {
                    try {
                      await update.mutateAsync({ id, stage_id: event.target.value });
                      toast.success('Lead stage updated.');
                    } catch (error) {
                      toast.error(error.message || 'Could not update stage.');
                    }
                  }}
                >
                  {(options.leadStages || []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </select>
              </div>
              <a href={`mailto:${lead.email}`} className="btn-secondary btn-md w-full"><Mail className="h-4 w-4" /> Send email</a>
              <a href={`tel:${lead.phone}`} className="btn-secondary btn-md w-full"><Phone className="h-4 w-4" /> Call contact</a>
              {lead.website ? <a href={lead.website} target="_blank" rel="noreferrer" className="btn-secondary btn-md w-full"><ArrowRight className="h-4 w-4" /> Visit website</a> : null}
            </div>
          </SectionCard>

          <SectionCard title="Score" subtitle="Signals from the workspace" icon={TrendingUp}>
            <div className="space-y-3">
              <Progress value={lead.score || 0} tone={(lead.score || 0) >= 70 ? 'success' : (lead.score || 0) >= 40 ? 'primary' : 'warning'} showLabel />
              <div className="space-y-2 text-xs text-muted">
                <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {lead.email ? 'Email captured' : 'Email missing'}</p>
                <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {lead.phone ? 'Phone captured' : 'Phone missing'}</p>
                <p className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5" /> Close target {formatDate(lead.expected_close_date)}</p>
                <p className="flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Owner {owner}</p>
              </div>
            </div>
          </SectionCard>

          <SectionCard title="Recent activity" subtitle="Lead timeline" icon={Clock}>
            <div className="space-y-3">
              {[
                { label: `Added as ${lead.stage || 'New'} lead`, at: lead.created_at },
                { label: `Assigned to ${owner}`, at: lead.created_at },
                { label: 'Last updated', at: lead.updated_at },
              ].map((item, index) => (
                <div key={index} className="flex gap-2.5">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-xs font-medium text-ink">{item.label}</p>
                    <p className="text-[10px] text-muted">{formatDate(item.at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

export function SalesPipelinePage() {
  const navigate = useNavigate();
  const { options, names } = useLookups();
  const { isManager } = useAuth();
  const [dragging, setDragging] = useState(null);
  const [search, setSearch] = useState('');
  const leadsQuery = useResource('leads', { limit: 200, sort: '-created_at' });
  const { update } = useResourceActions('leads');
  const insights = useAiInsight({ url: '/ai/pipeline-insights', method: 'get' });
  const summary = useQueryPipeline();

  const stages = options.leadStages || [];
  const leads = (leadsQuery.data?.items || []).filter((lead) => {
    if (!search) return true;
    const needle = search.toLowerCase();
    return `${lead.name} ${lead.company} ${lead.service}`.toLowerCase().includes(needle);
  });

  const move = async (lead, stageId) => {
    if (!isManager || !stageId || lead.stage_id === stageId) return;
    try {
      await update.mutateAsync({ id: lead.id, stage_id: stageId });
      toast.success(`${lead.name} moved to ${stages.find((s) => s.id === stageId)?.name || 'new stage'}.`);
    } catch (error) {
      toast.error(error.message || 'Could not move this lead.');
    }
  };

  const byStage = (stageId) => leads.filter((lead) => lead.stage_id === stageId);

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Sales"
        title="Sales pipeline"
        subtitle="Drag opportunities between stages. Every move is audited and updates the dashboard instantly."
        actions={(
          <>
            <Button variant="secondary" onClick={() => insights.mutate({})} loading={insights.isPending}><Sparkles className="h-4 w-4" /> Pipeline insights</Button>
            <Link to="/leads"><Button><Plus className="h-4 w-4" /> New lead</Button></Link>
          </>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Open pipeline" value={currency(summary?.totalValue || 0)} hint={`${summary?.openLeads ?? 0} open leads`} icon={Target} tone="primary" />
        <MiniStat label="Won" value={summary?.won ?? 0} hint="Closed won" icon={CheckCircle2} tone="success" />
        <MiniStat label="Lost" value={summary?.lost ?? 0} hint="Closed lost" icon={RefreshCw} tone="danger" />
        <MiniStat label="Conversion" value={`${summary?.conversionRate ?? 0}%`} hint={`${summary?.inactiveLeads ?? 0} stale leads`} icon={TrendingUp} tone="warning" />
      </div>

      {insights.data ? (
        <div className="mb-5">
          <AiResult result={insights.data} feature="pipeline_insights" entity="dashboard" useLabel="Accept insight" />
        </div>
      ) : null}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter leads on this board…" className="input sm:max-w-xs" />
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-primary" /> {leads.length} leads on board
        </div>
      </div>

      {leadsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-72" />)}</div>
      ) : leadsQuery.isError ? (
        <ErrorState message={leadsQuery.error?.message} onRetry={leadsQuery.refetch} />
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-3">
          {stages.map((stage) => {
            const rows = byStage(stage.id);
            const value = rows.reduce((total, row) => total + Number(row.estimated_budget || 0), 0);
            return (
              <div
                key={stage.id}
                className="flex w-[290px] shrink-0 flex-col rounded-2xl border border-line bg-surface2/50"
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => { if (dragging) move(dragging, stage.id); setDragging(null); }}
              >
                <div className="flex items-center justify-between gap-2 border-b border-line px-3.5 py-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: stage.color }} />
                    <span className="truncate text-xs font-bold text-ink">{stage.name}</span>
                    <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted">{rows.length}</span>
                  </div>
                  <span className="text-[10px] font-semibold text-muted">{currency(value, 'INR', true)}</span>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin p-2.5" style={{ minHeight: 160 }}>
                  {rows.map((lead) => (
                    <div
                      key={lead.id}
                      draggable={isManager}
                      onDragStart={() => setDragging(lead)}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="cursor-pointer rounded-xl border border-line bg-surface p-3 shadow-sm transition hover:border-primary/30 hover:shadow-soft"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-ink">{lead.name}</p>
                          <p className="truncate text-[10px] text-muted">{lead.company || lead.service}</p>
                        </div>
                        <Progress value={lead.score || 0} className="w-10 shrink-0" tone={(lead.score || 0) >= 70 ? 'success' : 'primary'} />
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-ink">{currency(lead.estimated_budget, 'INR', true)}</span>
                        <div className="flex items-center gap-1">
                          <SeverityBadge value={lead.priority} />
                          <Avatar name={names.person(lead.assigned_to)} size="xs" />
                        </div>
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-muted"><CalendarDays className="h-3 w-3" /> {formatDate(lead.expected_close_date)}</p>
                    </div>
                  ))}
                  {!rows.length ? (
                    <div className="grid place-items-center rounded-xl border border-dashed border-line px-3 py-8 text-center text-[11px] text-muted">
                      Drop leads here
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function useQueryPipeline() {
  return useQuery({
    queryKey: ['dashboard', 'sales-pipeline'],
    queryFn: async () => unwrap(await api.get('/dashboard/sales-pipeline')),
  });
}
