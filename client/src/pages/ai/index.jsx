import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, ArrowRight, BarChart3, BrainCircuit, CheckCircle2, Database, FileText, Gauge,
  Lightbulb, Plus, RefreshCw, Search, Sparkles, Target, Trash2, TrendingUp, Wand2,
} from 'lucide-react';
import AiChat from '../../components/common/AiChat';
import { AiResult } from '../../components/common/AiAssistant';
import {
  Badge, Button, Card, CardHeader, EmptyState, ErrorState, Input, Modal, PageHeader, Progress,
  SearchInput, Skeleton, StatCard, Tabs,
} from '../../components/ui';
import { api, unwrap } from '../../lib/api';
import { rangeOptions, currency, formatDate, statusTone, timeAgo } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

const INSIGHT_ENDPOINTS = {
  financial: '/ai/financial-insights',
  pipeline: '/ai/pipeline-insights',
  quality: '/ai/data-quality',
};

function ConversationSidebar({ activeId, onSelect, onNew, conversations, loading, onDelete }) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-line p-3">
        <div>
          <p className="text-sm font-semibold text-ink">Conversations</p>
          <p className="text-[10px] text-muted">Scoped to your account</p>
        </div>
        <Button size="sm" variant="soft" onClick={onNew}><Plus className="h-3.5 w-3.5" /> New</Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto scrollbar-thin p-2">
        {loading ? (
          <div className="space-y-2 p-1"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : !conversations.length ? (
          <p className="px-3 py-8 text-center text-xs text-muted">No saved conversations yet. Start a new chat to create one.</p>
        ) : conversations.map((conversation) => (
          <div key={conversation.id} className="group relative">
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              className={`w-full rounded-lg px-2.5 py-2 pr-8 text-left transition ${activeId === conversation.id ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-surface2 hover:text-ink'}`}
            >
              <p className="truncate text-xs font-semibold">{conversation.title || 'Untitled conversation'}</p>
              <p className="mt-0.5 text-[10px] opacity-70">{timeAgo(conversation.updated_at || conversation.created_at)}</p>
            </button>
            <button
              type="button"
              onClick={() => onDelete(conversation)}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted opacity-0 transition hover:bg-danger/10 hover:text-danger group-hover:opacity-100"
              aria-label="Delete conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function AiWorkspacePage() {
  const { isManager } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('assistant');
  const [activeId, setActiveId] = useState(null);
  const [chatKey, setChatKey] = useState(0);
  const [range, setRange] = useState('30d');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [reportType, setReportType] = useState('business');
  const [reportRange, setReportRange] = useState('30d');
  const [reportResult, setReportResult] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  const conversationsQuery = useQuery({
    queryKey: ['ai', 'conversations'],
    queryFn: async () => unwrap(await api.get('/ai/conversations')),
  });
  const usageQuery = useQuery({
    queryKey: ['ai', 'usage'],
    queryFn: async () => unwrap(await api.get('/ai/usage')),
  });
  const reportsQuery = useQuery({
    queryKey: ['ai', 'reports'],
    queryFn: async () => unwrap(await api.get('/ai/reports')),
  });

  const financialQuery = useQuery({
    queryKey: ['ai', 'financial', range],
    queryFn: async () => unwrap(await api.get('/ai/financial-insights', { params: { range } })),
    enabled: tab === 'insights' && isManager,
  });
  const pipelineQuery = useQuery({
    queryKey: ['ai', 'pipeline'],
    queryFn: async () => unwrap(await api.get('/ai/pipeline-insights')),
    enabled: tab === 'insights',
  });
  const qualityQuery = useQuery({
    queryKey: ['ai', 'quality'],
    queryFn: async () => unwrap(await api.get('/ai/data-quality')),
    enabled: tab === 'insights',
  });

  const deleteConversation = useMutation({
    mutationFn: async (id) => unwrap(await api.delete(`/ai/conversations/${id}`)),
    onSuccess: async (_payload, id) => {
      if (activeId === id) {
        setActiveId(null);
        setChatKey((value) => value + 1);
      }
      await queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
      toast.success('Conversation deleted.');
    },
    onError: (error) => toast.error(error.message || 'Could not delete the conversation.'),
  });

  const generateReport = useMutation({
    mutationFn: async () => unwrap(await api.post('/ai/report', { type: reportType, range: reportRange })),
    onSuccess: async (payload) => {
      setReportResult(payload);
      toast.success('Report generated and saved.');
      await queryClient.invalidateQueries({ queryKey: ['ai', 'reports'] });
      await queryClient.invalidateQueries({ queryKey: ['ai', 'usage'] });
    },
    onError: (error) => toast.error(error.message || 'Could not generate the report.'),
  });

  const naturalSearch = useMutation({
    mutationFn: async (query) => unwrap(await api.get('/ai/natural-search', { params: { q: query } })),
    onError: (error) => toast.error(error.message || 'Search could not be understood.'),
  });

  const conversations = conversationsQuery.data || [];
  const usage = usageQuery.data;
  const reports = reportsQuery.data || [];
  const aiUsage = usage?.usage?.ai_requests || {};
  const quoteUsage = usage?.usage?.ai_quotes || {};
  const usagePct = aiUsage.limit < 0 ? 0 : Math.min(100, Math.round((Number(aiUsage.used || 0) / Math.max(1, Number(aiUsage.limit || 1))) * 100));

  const insightCards = useMemo(() => ([
    { key: 'financial', title: 'Financial insights', icon: TrendingUp, query: financialQuery, enabled: isManager, feature: 'financial_insights', description: 'Revenue, expenses, cash and invoice risk from the ledger.' },
    { key: 'pipeline', title: 'Pipeline insights', icon: Target, query: pipelineQuery, enabled: true, feature: 'pipeline_insights', description: 'Stage value, win rate and stale opportunities.' },
    { key: 'quality', title: 'Data quality', icon: Database, query: qualityQuery, enabled: true, feature: 'data_quality', description: 'Duplicates, incomplete records and stale leads.' },
  ]), [financialQuery, pipelineQuery, qualityQuery, isManager]);

  const runSearch = (event) => {
    event?.preventDefault();
    const query = searchInput.trim();
    if (!query) return;
    setSearchQuery(query);
    naturalSearch.mutate(query);
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="AI Workspace"
        subtitle="Ask questions, generate management reports and review suggestions from the AI layer. Every action stays behind human approval."
        eyebrow="Overview"
        actions={(
          <>
            <Badge tone="primary"><Sparkles className="mr-1 h-3 w-3" /> {usage?.provider === 'configured' ? 'Live AI provider' : 'Local rules engine'}</Badge>
            <Button variant="secondary" onClick={() => setTab('reports')}><FileText className="h-4 w-4" /> New report</Button>
          </>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="AI requests" value={`${aiUsage.used || 0}${aiUsage.limit < 0 ? '' : ` / ${aiUsage.limit}`}`} hint="This month across the workspace" icon={Sparkles} tone="primary" action={<Progress value={usagePct} showLabel />} />
        <StatCard label="AI quotations" value={`${quoteUsage.used || 0}${quoteUsage.limit < 0 ? '' : ` / ${quoteUsage.limit}`}`} hint="Drafts require approval" icon={Wand2} tone="info" />
        <StatCard label="Saved reports" value={reports.length} hint="Generated from actual records" icon={FileText} tone="success" />
        <StatCard label="Conversations" value={conversations.length} hint="Private to your account" icon={BrainCircuit} tone="warning" />
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'assistant', label: 'Assistant', icon: Sparkles },
          { value: 'insights', label: 'Insights', icon: Lightbulb },
          { value: 'reports', label: 'Reports', icon: FileText, count: reports.length },
          { value: 'usage', label: 'Usage & settings', icon: Gauge },
        ]}
      />

      {tab === 'assistant' ? (
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <ConversationSidebar
            activeId={activeId}
            conversations={conversations}
            loading={conversationsQuery.isLoading}
            onSelect={(id) => setActiveId(id)}
            onNew={() => { setActiveId(null); setChatKey((value) => value + 1); }}
            onDelete={(conversation) => deleteConversation.mutate(conversation.id)}
          />
          <AiChat
            key={chatKey}
            conversationId={activeId}
            onConversationChange={(id) => {
              setActiveId(id);
              queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
              queryClient.invalidateQueries({ queryKey: ['ai', 'usage'] });
            }}
            onMessageSent={() => {
              queryClient.invalidateQueries({ queryKey: ['ai', 'usage'] });
              queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
            }}
            quickPrompts={[
              'Summarise this month in five bullets',
              'Which clients need attention?',
              'Draft a follow-up for a stale lead',
              'What are my biggest delivery risks?',
              'Explain my cash position',
            ]}
            autoFocus
          />
        </div>
      ) : null}

      {tab === 'insights' ? (
        <div className="space-y-5">
          <Card>
            <CardHeader
              title="Ask in plain English"
              subtitle="Translates your request into safe, permission-scoped filters. AI never runs SQL."
              icon={Search}
              action={<Badge tone="info">Read only</Badge>}
            />
            <div className="p-4 sm:p-5">
              <form onSubmit={runSearch} className="flex flex-col gap-2 sm:flex-row">
                <SearchInput value={searchInput} onChange={setSearchInput} placeholder="e.g. overdue high priority tasks, pending invoices this month…" className="flex-1" />
                <Button type="submit" loading={naturalSearch.isPending} disabled={!searchInput.trim()}>
                  <Search className="h-4 w-4" /> Search
                </Button>
              </form>
              {naturalSearch.data ? (
                <div className="mt-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="primary">{naturalSearch.data.module_label}</Badge>
                    {(naturalSearch.data.applied_filters || []).map((filter) => (
                      <Badge key={`${filter.label}-${filter.value}`} tone="neutral">{filter.label}: {filter.value}</Badge>
                    ))}
                    <span className="text-xs text-muted">{naturalSearch.data.count} matching record(s)</span>
                  </div>
                  <div className="mt-3 divide-y divide-line rounded-xl border border-line">
                    {(naturalSearch.data.results || []).map((result) => (
                      <button key={result.id} type="button" onClick={() => navigate(result.link)} className="flex w-full items-center gap-3 p-3 text-left transition hover:bg-surface2">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs font-semibold text-ink">{result.title}</span>
                          <span className="block truncate text-[10px] text-muted">{result.subtitle || 'Open record'}</span>
                        </span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted" />
                      </button>
                    ))}
                    {!naturalSearch.data.results?.length ? <p className="p-4 text-xs text-muted">No records matched those filters.</p> : null}
                  </div>
                  <p className="mt-2 text-[10px] text-muted">{naturalSearch.data.note}</p>
                </div>
              ) : null}
            </div>
          </Card>

          {insightCards.map((card) => (
            <Card key={card.key} className="overflow-hidden">
              <CardHeader
                title={card.title}
                subtitle={card.description}
                icon={card.icon}
                action={(
                  <Button size="sm" variant="secondary" onClick={() => card.query.refetch()} disabled={!card.enabled || card.query.isFetching}>
                    <RefreshCw className={`h-3.5 w-3.5 ${card.query.isFetching ? 'animate-spin' : ''}`} /> Refresh
                  </Button>
                )}
              />
              <div className="p-4 sm:p-5">
                {!card.enabled ? (
                  <div className="rounded-xl border border-dashed border-line p-4 text-xs text-muted">Financial insights are restricted to managers and administrators.</div>
                ) : card.query.isLoading ? (
                  <div className="space-y-2"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4" /><Skeleton className="h-4 w-5/6" /></div>
                ) : card.query.isError ? (
                  <ErrorState message={card.query.error?.message} onRetry={card.query.refetch} />
                ) : card.key === 'quality' ? (
                  <QualityInsight data={card.query.data} />
                ) : (
                  <>
                    {card.key === 'financial' && card.query.data?.figures ? (
                      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          ['Revenue', card.query.data.figures.revenue],
                          ['Expenses', card.query.data.figures.expenses],
                          ['Net revenue', card.query.data.figures.net],
                          ['MRR', card.query.data.figures.mrr],
                        ].map(([label, value]) => (
                          <div key={label} className="rounded-xl border border-line bg-surface2/40 p-3">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
                            <p className="mt-1 text-sm font-bold text-ink">{currency(value)}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <AiResult result={card.query.data} feature={card.feature} useLabel="Acknowledge insight" />
                    {card.key === 'pipeline' && card.query.data?.stale_leads?.length ? (
                      <div className="mt-3 rounded-xl border border-warning/25 bg-warning/5 p-3">
                        <p className="text-xs font-semibold text-ink">Opportunities to re-engage</p>
                        <div className="mt-2 space-y-1.5">
                          {card.query.data.stale_leads.map((lead) => (
                            <button key={lead.id} type="button" onClick={() => navigate(`/leads/${lead.id}`)} className="flex w-full items-center justify-between gap-2 rounded-lg bg-surface/70 px-2.5 py-1.5 text-left text-[11px] transition hover:bg-surface">
                              <span className="truncate font-medium text-ink">{lead.name}</span>
                              <span className="shrink-0 text-muted">{currency(lead.estimated_budget, 'INR', true)} · {lead.stage}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {tab === 'reports' ? (
        <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
          <Card>
            <CardHeader title="Generate a report" subtitle="Built from deterministic metrics, then explained by AI." icon={BarChart3} />
            <div className="space-y-3 p-4">
              <div>
                <label className="label" htmlFor="report-type">Report type</label>
                <select id="report-type" value={reportType} onChange={(event) => setReportType(event.target.value)} className="select">
                  <option value="business">Business summary</option>
                  <option value="financial" disabled={!isManager}>Financial review {!isManager ? '(managers only)' : ''}</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="report-range">Period</label>
                <select id="report-range" value={reportRange} onChange={(event) => setReportRange(event.target.value)} className="select">
                  {rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <Button className="w-full" onClick={() => generateReport.mutate()} loading={generateReport.isPending}>
                <Sparkles className="h-4 w-4" /> Generate report
              </Button>
              <p className="text-[10px] leading-relaxed text-muted">Generating a report is read-only and saves a private copy to your account. Nothing is sent to clients automatically.</p>
            </div>
          </Card>

          <div className="space-y-4">
            {reportResult ? (
              <Card className="overflow-hidden">
                <CardHeader title="Latest report" subtitle={reportResult.report?.title} icon={Sparkles} />
                <div className="p-4 sm:p-5">
                  <AiResult result={reportResult} feature="report_generator" useLabel="Approve report" />
                </div>
              </Card>
            ) : null}

            <Card className="overflow-hidden">
              <CardHeader title="Saved reports" subtitle="Only you can see reports you generated." icon={FileText} action={<Badge tone="neutral">{reports.length}</Badge>} />
              {reportsQuery.isLoading ? (
                <div className="space-y-2 p-4"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
              ) : reportsQuery.isError ? (
                <ErrorState message={reportsQuery.error?.message} onRetry={reportsQuery.refetch} />
              ) : !reports.length ? (
                <EmptyState icon={FileText} title="No reports yet" description="Generate a business or financial report to see it here." />
              ) : (
                <div className="divide-y divide-line">
                  {reports.map((report) => (
                    <button key={report.id} type="button" onClick={() => setSelectedReport(report)} className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-surface2/50">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><FileText className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-semibold text-ink">{report.title}</span>
                        <span className="mt-0.5 block text-[10px] text-muted">{report.period_start} → {report.period_end} · {timeAgo(report.created_at)}</span>
                      </span>
                      <Badge tone={report.type === 'financial' ? 'success' : 'primary'}>{report.type}</Badge>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'usage' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
          <div className="space-y-4">
            <Card>
              <CardHeader title="This month" subtitle="AI usage is metered per workspace and resets monthly." icon={Gauge} />
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
                {Object.entries(usage?.usage || {}).filter(([key]) => ['ai_requests', 'ai_quotes'].includes(key)).map(([key, item]) => {
                  const pct = item.limit < 0 ? 0 : Math.min(100, Math.round((Number(item.used || 0) / Math.max(1, Number(item.limit || 1))) * 100));
                  return (
                    <div key={key} className="rounded-xl border border-line p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-ink">{key === 'ai_requests' ? 'AI requests' : 'AI quotations'}</p>
                        <Badge tone={pct >= 90 ? 'danger' : pct >= 70 ? 'warning' : 'success'}>{pct}%</Badge>
                      </div>
                      <p className="mt-2 text-lg font-bold text-ink">{item.used || 0}<span className="text-xs font-medium text-muted">{item.limit < 0 ? ' · unlimited' : ` / ${item.limit}`}</span></p>
                      {item.limit >= 0 ? <Progress value={pct} className="mt-3" /> : null}
                    </div>
                  );
                })}
                <div className="rounded-xl border border-line p-4 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold text-ink">Provider status</p>
                    <Badge tone={usage?.provider === 'configured' ? 'success' : 'info'}>{usage?.provider === 'configured' ? 'Live AI configured' : 'Local rules fallback'}</Badge>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-muted">Add AI_API_KEY in server/.env to use an OpenAI-compatible model. Without a key every feature still works using deterministic business rules.</p>
                </div>
              </div>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader title="Recent AI activity" subtitle="Feature-level audit trail for this month." icon={Sparkles} />
              {usageQuery.isLoading ? (
                <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
              ) : !usage?.logs?.length ? (
                <EmptyState icon={Sparkles} title="No AI activity yet" description="Ask the assistant or generate a report to create usage logs." />
              ) : (
                <div className="divide-y divide-line">
                  {usage.logs.map((log) => (
                    <div key={log.id} className="flex items-center gap-3 p-4">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary"><Sparkles className="h-3.5 w-3.5" /></span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-ink">{String(log.feature || '').replace(/_/g, ' ')}</p>
                        <p className="text-[10px] text-muted">{timeAgo(log.created_at)} · {log.tokens || 0} tokens</p>
                      </div>
                      <Badge tone="neutral">{log.feature}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <Card className="h-fit">
            <CardHeader title="Feature settings" subtitle="Enabled by your administrator." icon={CheckCircle2} />
            <div className="space-y-2 p-4">
              {(usage?.features || []).map((feature) => (
                <div key={feature.id || feature.feature} className="flex items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                  <span className="truncate text-xs font-medium text-ink">{String(feature.feature).replace(/_/g, ' ')}</span>
                  <Badge tone={feature.enabled ? 'success' : 'danger'}>{feature.enabled ? 'On' : 'Off'}</Badge>
                </div>
              ))}
              {!usage?.features?.length ? <p className="text-xs text-muted">No feature settings found.</p> : null}
              <p className="pt-2 text-[10px] leading-relaxed text-muted">Administrators can change these in Admin → AI settings. Disabled features cannot be called from any client.</p>
            </div>
          </Card>
        </div>
      ) : null}

      <Modal open={Boolean(selectedReport)} onClose={() => setSelectedReport(null)} title={selectedReport?.title || 'Report'} description={selectedReport ? `${selectedReport.period_start} → ${selectedReport.period_end}` : ''} size="lg">
        {selectedReport ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={selectedReport.type === 'financial' ? 'success' : 'primary'}>{selectedReport.type}</Badge>
              <span className="text-[11px] text-muted">Generated {formatDate(selectedReport.period_end)}</span>
            </div>
            <div className="max-h-[58vh] overflow-y-auto scrollbar-thin whitespace-pre-wrap rounded-xl border border-line bg-surface2/40 p-4 text-sm leading-relaxed text-ink">
              {selectedReport.content}
            </div>
            {selectedReport.metrics ? (
              <details className="rounded-xl border border-line p-3">
                <summary className="cursor-pointer text-xs font-semibold text-ink">Deterministic metrics used</summary>
                <pre className="mt-2 max-h-48 overflow-auto text-[10px] text-muted">{JSON.stringify(selectedReport.metrics, null, 2)}</pre>
              </details>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

function QualityInsight({ data }) {
  if (!data) return <p className="text-xs text-muted">No data quality results.</p>;
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-3 text-xs text-ink">{data.summary}</div>
      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-line p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink"><AlertTriangle className="h-3.5 w-3.5 text-warning" /> Possible duplicates</p>
          <div className="mt-2 space-y-1.5">
            {(data.duplicates || []).map((duplicate, index) => (
              <p key={`${duplicate.key}-${index}`} className="rounded-lg bg-surface2/60 px-2 py-1.5 text-[11px] text-muted">
                <span className="font-medium text-ink">{duplicate.first?.name}</span> ↔ {duplicate.second?.name}
              </p>
            ))}
            {!data.duplicates?.length ? <p className="text-[11px] text-muted">No duplicates found.</p> : null}
          </div>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink"><Database className="h-3.5 w-3.5 text-info" /> Incomplete records</p>
          <div className="mt-2 space-y-1.5">
            {(data.incomplete || []).map((row) => (
              <p key={`${row.type}-${row.id}`} className="rounded-lg bg-surface2/60 px-2 py-1.5 text-[11px] text-muted">
                <span className="font-medium text-ink">{row.name}</span> · missing {row.missing?.join(', ')}
              </p>
            ))}
            {!data.incomplete?.length ? <p className="text-[11px] text-muted">Every record has contact details.</p> : null}
          </div>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-ink"><RefreshCw className="h-3.5 w-3.5 text-danger" /> Stale leads</p>
          <div className="mt-2 space-y-1.5">
            {(data.stale_leads || []).map((lead) => (
              <p key={lead.id} className="rounded-lg bg-surface2/60 px-2 py-1.5 text-[11px] text-muted">
                <span className="font-medium text-ink">{lead.name}</span> · {lead.days_inactive} days inactive
              </p>
            ))}
            {!data.stale_leads?.length ? <p className="text-[11px] text-muted">No stale opportunities.</p> : null}
          </div>
        </div>
      </div>
      <p className="text-[10px] text-muted">{data.note}</p>
    </div>
  );
}
