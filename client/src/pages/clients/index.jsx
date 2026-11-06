import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2, CalendarDays, CheckCircle2, CircleDollarSign, Clock, FileText, FolderKanban,
  Mail, MapPin, Pencil, Phone, Plus, Sparkles, TrendingUp, Users, Wallet, Globe2,
} from 'lucide-react';
import CrudPage from '../../components/common/CrudPage';
import ResourceForm from '../../components/common/ResourceForm';
import { AiCard, AiResult, AiButton } from '../../components/common/AiAssistant';
import { DetailHeader, InfoGrid, MiniStat, PersonCell, SectionCard, RecordLink } from '../../components/common/Detail';
import {
  Avatar, Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, Progress, Skeleton, StatCard, Tabs,
} from '../../components/ui';
import { useLookups } from '../../lib/lookups';
import { useAiInsight, useModuleStats, useRecord, useResource, useResourceActions } from '../../lib/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { currency, formatDate, formatDateShort, statusTone, timeAgo } from '../../lib/utils';

export function ClientsPage() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const { options, names } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.clients || {};

  const columns = useMemo(() => [
    {
      key: 'name', header: 'Client', sortable: true,
      render: (row) => (
        <div className="flex min-w-[190px] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-primary to-violet-500 text-[11px] font-bold text-white">
            {(row.name || '?').slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.name}</p>
            <p className="truncate text-[10px] text-muted">{row.company || row.industry || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'email', header: 'Contact', sortable: true, render: (row) => <div className="min-w-[150px]"><p className="truncate text-xs text-ink">{row.email}</p><p className="truncate text-[10px] text-muted">{row.phone}</p></div> },
    { key: 'industry', header: 'Industry', sortable: true, render: (row) => <span className="text-xs text-muted">{row.industry || '—'}</span> },
    { key: 'location', header: 'Location', render: (row) => <span className="text-xs text-muted">{row.location || '—'}</span> },
    { key: 'manager_id', header: 'Manager', render: (row) => <PersonCell name={names.person(row.manager_id)} /> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
    { key: 'created_at', header: 'Client since', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.created_at)}</span> },
  ], [names]);

  const fields = useMemo(() => [
    { name: 'name', label: 'Client name', required: true, placeholder: 'Acme Studios' },
    { name: 'company', label: 'Legal / company name', placeholder: 'Acme Studios Pvt Ltd' },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone' },
    { name: 'website', label: 'Website', placeholder: 'https://…' },
    { name: 'industry', label: 'Industry' },
    { name: 'location', label: 'Location' },
    { name: 'gst_number', label: 'GST / Tax number' },
    { name: 'billing_address', label: 'Billing address', span: 2 },
    {
      name: 'manager_id', label: 'Account manager', type: 'select',
      options: (options.profiles || []).map((p) => ({ value: p.id, label: p.name })),
    },
    {
      name: 'status', label: 'Status', type: 'select',
      options: [{ value: 'active', label: 'Active' }, { value: 'prospect', label: 'Prospect' }, { value: 'inactive', label: 'Inactive' }],
    },
    { name: 'source', label: 'Source' },
    { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 3 },
  ], [options.profiles]);

  return (
    <CrudPage
      title="Clients"
      subtitle="A single source of truth for every relationship, project and invoice."
      eyebrow="Relationships"
      resource="clients"
      columns={columns}
      fields={fields}
      initialValues={{ status: 'active' }}
      searchPlaceholder="Search clients, companies, email…"
      addLabel="New client"
      canWrite={isManager}
      canDelete={isManager}
      onRowClick={(row) => navigate(`/clients/${row.id}`)}
      filterDefs={[
        { key: 'status', label: 'Status', options: ['active', 'prospect', 'inactive'] },
        { key: 'industry', label: 'Industry', options: [...new Set((options.clients || []).map((c) => c.industry).filter(Boolean))] },
      ]}
      stats={(
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total clients" value={stats.total ?? 0} hint="All relationships" icon={Users} tone="primary" loading={statsQuery.isLoading} />
          <StatCard label="Active clients" value={stats.active ?? 0} hint="Currently engaged" icon={CheckCircle2} tone="success" loading={statsQuery.isLoading} />
          <StatCard label="Projects" value={stats.projects ?? 0} hint={`${stats.ongoing ?? 0} ongoing`} icon={FolderKanban} tone="info" loading={statsQuery.isLoading} />
          <StatCard label="Retention" value={`${stats.total ? Math.round(((stats.active || 0) / stats.total) * 100) : 0}%`} hint="Active vs total" icon={TrendingUp} tone="warning" loading={statsQuery.isLoading} />
        </div>
      )}
      emptyTitle="No clients found"
      emptyDescription="Add your first client to unlock projects, invoices and the client portal."
      emptyIcon={Users}
    />
  );
}

const clientFields = (options) => [
  { name: 'name', label: 'Client name', required: true },
  { name: 'company', label: 'Company' },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone' },
  { name: 'website', label: 'Website' },
  { name: 'industry', label: 'Industry' },
  { name: 'location', label: 'Location' },
  { name: 'gst_number', label: 'GST / Tax number' },
  { name: 'billing_address', label: 'Billing address', span: 2 },
  {
    name: 'manager_id', label: 'Account manager', type: 'select',
    options: (options.profiles || []).map((p) => ({ value: p.id, label: p.name })),
  },
  { name: 'status', label: 'Status', type: 'select', options: ['active', 'prospect', 'inactive'] },
  { name: 'notes', label: 'Notes', type: 'textarea', span: 2, rows: 3 },
];

export function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { options, names, maps } = useLookups();
  const { isManager } = useAuth();
  const query = useRecord('clients', id);
  const client = query.data;
  const { update } = useResourceActions('clients');
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const ai = useAiInsight({ url: `/ai/clients/${id}/summary` });

  const projectsQuery = useResource('projects', { client_id: id, limit: 100 });
  const paymentsQuery = useResource('payments', { client_id: id, limit: 100, sort: '-payment_date' });
  const invoicesQuery = useResource('invoices', { client_id: id, limit: 100 });
  const activitiesQuery = useResource('client_activities', { client_id: id, limit: 30 });
  const documentsQuery = useResource('documents', { client_id: id, limit: 50 });

  const projects = projectsQuery.data?.items || [];
  const payments = paymentsQuery.data?.items || [];
  const invoices = invoicesQuery.data?.items || [];
  const activities = activitiesQuery.data?.items || [];
  const documents = documentsQuery.data?.items || [];

  const totals = useMemo(() => ({
    budget: projects.reduce((sum, p) => sum + Number(p.budget || 0), 0),
    paid: payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount || 0), 0),
    pending: payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount || 0), 0),
    ongoing: projects.filter((p) => p.status === 'ongoing').length,
  }), [projects, payments]);

  const save = async (values) => {
    try {
      await update.mutateAsync({ id, ...values });
      toast.success('Client updated.');
      setEditing(false);
    } catch (error) {
      toast.error(error.message || 'Could not update this client.');
    }
  };

  if (query.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-16" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-80 lg:col-span-2" /><Skeleton className="h-80" /></div></div>;
  }
  if (query.isError || !client) return <ErrorState message={query.error?.message || 'Client not found.'} onRetry={query.refetch} />;

  const manager = names.person(client.manager_id);

  return (
    <div>
      <DetailHeader
        backTo="/clients"
        backLabel="All clients"
        title={client.name}
        subtitle={client.company || client.industry || '—'}
        avatar={<span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-lg font-bold text-white shadow-glow">{(client.name || '?').slice(0, 2).toUpperCase()}</span>}
        badges={<><Badge tone={statusTone(client.status)} dot>{client.status}</Badge>{client.industry ? <Badge tone="neutral">{client.industry}</Badge> : null}</>}
        meta={[{ label: 'Manager', value: manager }, { label: 'Client since', value: formatDate(client.created_at) }]}
        actions={(
          <>
            <Button variant="secondary" onClick={() => ai.mutate({})} loading={ai.isPending}><Sparkles className="h-4 w-4" /> AI summary</Button>
            {isManager ? <Button onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit client</Button> : null}
          </>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Ongoing projects" value={totals.ongoing} hint={`${projects.length} total`} icon={FolderKanban} tone="primary" />
        <MiniStat label="Collected" value={currency(totals.paid)} hint="Completed payments" icon={Wallet} tone="success" />
        <MiniStat label="Pending" value={currency(totals.pending)} hint="Awaiting payment" icon={Clock} tone="warning" />
        <MiniStat label="Contract value" value={currency(totals.budget)} hint="Across projects" icon={CircleDollarSign} tone="info" />
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'projects', label: 'Projects', count: projects.length },
          { value: 'payments', label: 'Payments', count: payments.length },
          { value: 'invoices', label: 'Invoices', count: invoices.length },
          { value: 'documents', label: 'Documents', count: documents.length },
          { value: 'activity', label: 'Activity', count: activities.length },
        ]}
      />

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionCard title="Company & contact" subtitle="Billing and relationship details" icon={Building2}>
              <InfoGrid
                items={[
                  { label: 'Primary contact', value: client.name },
                  { label: 'Company', value: client.company },
                  { label: 'Email', value: <a href={`mailto:${client.email}`} className="text-primary hover:underline">{client.email}</a> },
                  { label: 'Phone', value: client.phone },
                  { label: 'Website', value: client.website ? <a href={client.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{client.website}</a> : '—' },
                  { label: 'GST / Tax', value: client.gst_number },
                  { label: 'Industry', value: client.industry },
                  { label: 'Source', value: client.source },
                  { label: 'Location', value: client.location },
                  { label: 'Account manager', value: manager },
                  { label: 'Billing address', value: client.billing_address },
                  { label: 'Status', value: client.status },
                ]}
              />
            </SectionCard>

            <AiCard title="Client briefing" subtitle="A concise, reviewable summary of this relationship" action={<AiButton onClick={() => ai.mutate({})} loading={ai.isPending}>Summarise</AiButton>}>
              <AiResult result={ai.data} loading={ai.isPending} error={ai.error} onRetry={() => ai.mutate({})} feature="client_insights" entity="clients" entityId={id} useLabel="Accept summary" />
              {ai.data?.stats ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-4">
                  <MiniStat label="Projects" value={ai.data.stats.projects} />
                  <MiniStat label="Paid" value={ai.data.stats.paid == null ? '—' : currency(ai.data.stats.paid)} />
                  <MiniStat label="Pending" value={ai.data.stats.pending == null ? '—' : currency(ai.data.stats.pending)} />
                  <MiniStat label="Open tasks" value={ai.data.stats.open_tasks} />
                </div>
              ) : null}
            </AiCard>

            <SectionCard title="Recent projects" subtitle="Delivery at a glance" icon={FolderKanban} action={<button type="button" className="text-xs font-semibold text-primary" onClick={() => setTab('projects')}>View all</button>}>
              <div className="space-y-2">
                {projects.slice(0, 4).map((project) => (
                  <Link key={project.id} to={`/projects/${project.id}`} className="flex items-center gap-3 rounded-xl border border-line p-3 transition hover:border-primary/30">
                    <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-soft text-primary"><FolderKanban className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{project.name}</p>
                      <p className="text-[10px] text-muted">{project.category} · {currency(project.budget)}</p>
                    </div>
                    <div className="w-20"><Progress value={project.progress} showLabel /></div>
                  </Link>
                ))}
                {!projects.length ? <EmptyState title="No projects yet" description="Create a project for this client to begin delivery." /> : null}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Notes" subtitle="Internal only" icon={FileText}>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{client.notes || 'No notes yet.'}</p>
            </SectionCard>
            <SectionCard title="Quick links" icon={Globe2}>
              <div className="space-y-2">
                <a href={`mailto:${client.email}`} className="btn-secondary btn-md w-full"><Mail className="h-4 w-4" /> Email client</a>
                <a href={`tel:${client.phone}`} className="btn-secondary btn-md w-full"><Phone className="h-4 w-4" /> Call client</a>
                <button type="button" className="btn-secondary btn-md w-full" onClick={() => setTab('invoices')}><FileText className="h-4 w-4" /> View invoices</button>
                <button type="button" className="btn-soft btn-md w-full" onClick={() => navigate('/messages')}><Users className="h-4 w-4" /> Open messages</button>
              </div>
            </SectionCard>
            <SectionCard title="Recent activity" icon={Clock}>
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex gap-2.5">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-ink">{activity.title}</p>
                      <p className="text-[10px] text-muted">{activity.type} · {formatDate(activity.activity_date)}</p>
                    </div>
                  </div>
                ))}
                {!activities.length ? <p className="text-xs text-muted">No activity recorded yet.</p> : null}
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === 'projects' ? <ProjectsTab projects={projects} loading={projectsQuery.isLoading} /> : null}
      {tab === 'payments' ? <PaymentsTab payments={payments} loading={paymentsQuery.isLoading} /> : null}
      {tab === 'invoices' ? <InvoicesTab invoices={invoices} loading={invoicesQuery.isLoading} /> : null}
      {tab === 'documents' ? <DocumentsTab documents={documents} loading={documentsQuery.isLoading} /> : null}
      {tab === 'activity' ? <ActivityTab activities={activities} loading={activitiesQuery.isLoading} /> : null}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit client" description="Update company and billing details." size="lg">
        <ResourceForm
          fields={clientFields(options)}
          defaultValues={client}
          onSubmit={save}
          onCancel={() => setEditing(false)}
          loading={update.isPending}
          submitLabel="Save changes"
        />
      </Modal>
    </div>
  );
}

function ProjectsTab({ projects, loading }) {
  if (loading) return <Skeleton className="h-64" />;
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <Link key={project.id} to={`/projects/${project.id}`} className="card card-hover p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{project.name}</p>
              <p className="text-[11px] text-muted">{project.category}</p>
            </div>
            <Badge tone={statusTone(project.status)}>{project.status}</Badge>
          </div>
          <div className="mt-4 space-y-1.5">
            <div className="flex justify-between text-[11px] text-muted"><span>Progress</span><span className="font-semibold text-ink">{project.progress || 0}%</span></div>
            <Progress value={project.progress} />
          </div>
          <div className="mt-4 flex items-center justify-between text-[11px]">
            <span className="text-muted">Deadline {formatDate(project.deadline)}</span>
            <span className="font-semibold text-ink">{currency(project.budget)}</span>
          </div>
        </Link>
      ))}
      {!projects.length ? <div className="md:col-span-2 xl:col-span-3"><EmptyState title="No projects" description="Projects for this client will appear here." icon={FolderKanban} /></div> : null}
    </div>
  );
}

function PaymentsTab({ payments, loading }) {
  if (loading) return <Skeleton className="h-64" />;
  return (
    <Card className="overflow-hidden">
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Invoice</th><th>Description</th><th>Method</th><th>Status</th><th>Date</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id}>
                <td className="font-medium text-ink">{payment.invoice_number}</td>
                <td className="max-w-[220px] truncate text-muted">{payment.description}</td>
                <td className="text-muted">{payment.method}</td>
                <td><Badge tone={statusTone(payment.status)} dot>{payment.status}</Badge></td>
                <td className="text-muted">{formatDate(payment.payment_date)}</td>
                <td className="text-right font-semibold text-ink">{currency(payment.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!payments.length ? <EmptyState title="No payments" description="Recorded payments will appear here." icon={Wallet} /> : null}
    </Card>
  );
}

function InvoicesTab({ invoices, loading }) {
  if (loading) return <Skeleton className="h-64" />;
  return (
    <Card className="overflow-hidden">
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Invoice</th><th>Issue date</th><th>Due date</th><th>Status</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {invoices.map((invoice) => (
              <tr key={invoice.id}>
                <td className="font-medium text-ink">{invoice.invoice_number}</td>
                <td className="text-muted">{formatDate(invoice.issue_date)}</td>
                <td className="text-muted">{formatDate(invoice.due_date)}</td>
                <td><Badge tone={statusTone(invoice.status)} dot>{invoice.status}</Badge></td>
                <td className="text-right font-semibold text-ink">{currency(invoice.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!invoices.length ? <EmptyState title="No invoices" description="Invoices will appear here once created." icon={FileText} /> : null}
    </Card>
  );
}

function DocumentsTab({ documents, loading }) {
  if (loading) return <Skeleton className="h-64" />;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {documents.map((document) => (
        <div key={document.id} className="card flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><FileText className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">{document.name}</p>
            <p className="text-[10px] text-muted">{document.category} · {formatDate(document.created_at)}</p>
          </div>
          {document.shared_with_client ? <Badge tone="success">Shared</Badge> : <Badge tone="neutral">Internal</Badge>}
        </div>
      ))}
      {!documents.length ? <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="No documents" description="Shared and internal documents will appear here." icon={FileText} /></div> : null}
    </div>
  );
}

function ActivityTab({ activities, loading }) {
  if (loading) return <Skeleton className="h-64" />;
  return (
    <SectionCard title="Client activity" subtitle="Every meaningful touchpoint" icon={Clock}>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex gap-3">
            <span className="mt-1 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Clock className="h-4 w-4" /></span>
            <div className="min-w-0 flex-1 border-b border-line/70 pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">{activity.title}</p>
                <Badge tone={statusTone(activity.status)}>{activity.status}</Badge>
              </div>
              <p className="mt-0.5 text-xs text-muted">{activity.description}</p>
              <p className="mt-1 text-[10px] text-muted">{activity.type} · {formatDate(activity.activity_date)}</p>
            </div>
          </div>
        ))}
        {!activities.length ? <EmptyState title="No activity" description="Client touchpoints will be recorded here." icon={Clock} /> : null}
      </div>
    </SectionCard>
  );
}
