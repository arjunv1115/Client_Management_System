import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarDays, CheckCircle2, CircleDollarSign, Clock, FileText, FolderKanban, Pencil,
  Plus, Sparkles, Target, Users, Wallet,
} from 'lucide-react';
import CrudPage from '../../components/common/CrudPage';
import ResourceForm from '../../components/common/ResourceForm';
import { AiButton, AiCard, AiResult } from '../../components/common/AiAssistant';
import { DetailHeader, InfoGrid, MiniStat, PersonCell, SectionCard, SeverityBadge } from '../../components/common/Detail';
import {
  Badge, Button, Card, EmptyState, ErrorState, Modal, Progress, Skeleton, StatCard, Tabs,
} from '../../components/ui';
import { useLookups } from '../../lib/lookups';
import { useAiInsight, useModuleStats, useRecord, useResource, useResourceActions } from '../../lib/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { currency, formatDate, statusTone, timeAgo } from '../../lib/utils';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { isManager } = useAuth();
  const { options, names } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.projects || {};

  const columns = useMemo(() => [
    {
      key: 'name', header: 'Project', sortable: true,
      render: (row) => (
        <div className="flex min-w-[210px] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <FolderKanban className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.name}</p>
            <p className="truncate text-[10px] text-muted">{names.client(row.client_id)} · {row.category || 'Project'}</p>
          </div>
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
    {
      key: 'progress', header: 'Progress', sortable: true,
      render: (row) => <div className="w-28"><Progress value={row.progress} showLabel tone={(row.progress || 0) >= 100 ? 'success' : 'primary'} /></div>,
    },
    { key: 'priority', header: 'Priority', sortable: true, render: (row) => <SeverityBadge value={row.priority} /> },
    { key: 'budget', header: 'Budget', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs font-semibold text-ink">{currency(row.budget)}</span> },
    {
      key: 'amount_paid', header: 'Collected',
      render: (row) => {
        const pct = row.budget ? Math.round((Number(row.amount_paid || 0) / Number(row.budget)) * 100) : 0;
        return <div className="min-w-[110px]"><p className="text-xs font-medium text-ink">{currency(row.amount_paid)}</p><p className="text-[10px] text-muted">{pct}% of budget</p></div>;
      },
    },
    { key: 'deadline', header: 'Deadline', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.deadline)}</span> },
  ], [names]);

  const fields = useMemo(() => [
    { name: 'name', label: 'Project name', required: true, placeholder: 'Website redesign' },
    {
      name: 'client_id', label: 'Client', type: 'select', required: true,
      options: (options.clients || []).map((c) => ({ value: c.id, label: c.label || c.name })),
    },
    { name: 'category', label: 'Category', placeholder: 'Web Design' },
    { name: 'budget', label: 'Budget (₹)', type: 'number', min: 0 },
    { name: 'amount_paid', label: 'Amount collected (₹)', type: 'number', min: 0 },
    { name: 'progress', label: 'Progress (%)', type: 'number', min: 0, max: 100 },
    {
      name: 'status', label: 'Status', type: 'select',
      options: [{ value: 'ongoing', label: 'Ongoing' }, { value: 'completed', label: 'Completed' }, { value: 'on_hold', label: 'On hold' }],
    },
    {
      name: 'priority', label: 'Priority', type: 'select',
      options: ['high', 'medium', 'low'],
    },
    { name: 'start_date', label: 'Start date', type: 'date' },
    { name: 'deadline', label: 'Deadline', type: 'date' },
    { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 3 },
  ], [options.clients]);

  return (
    <CrudPage
      title="Projects"
      subtitle="Track scope, budget and delivery across every client engagement."
      eyebrow="Delivery"
      resource="projects"
      columns={columns}
      fields={fields}
      initialValues={{ status: 'ongoing', priority: 'medium', progress: 0, budget: 0, amount_paid: 0 }}
      searchPlaceholder="Search projects, categories…"
      addLabel="New project"
      canWrite={isManager}
      canDelete={isManager}
      onRowClick={(row) => navigate(`/projects/${row.id}`)}
      filterDefs={[
        { key: 'status', label: 'Status', options: ['ongoing', 'completed', 'on_hold'] },
        { key: 'client_id', label: 'Client', options: (options.clients || []).map((c) => ({ value: c.id, label: c.label || c.name })) },
        { key: 'priority', label: 'Priority', options: ['high', 'medium', 'low'] },
      ]}
      stats={(
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total projects" value={stats.total ?? 0} hint={`${stats.ongoing ?? 0} ongoing`} icon={FolderKanban} tone="primary" loading={statsQuery.isLoading} />
          <StatCard label="Contract value" value={currency(stats.budget)} hint="Across all projects" icon={CircleDollarSign} tone="success" loading={statsQuery.isLoading} />
          <StatCard label="Collected" value={currency(stats.paid)} hint={`${currency(stats.remaining)} remaining`} icon={Wallet} tone="info" loading={statsQuery.isLoading} />
          <StatCard label="Completed" value={stats.completed ?? 0} hint="Delivered projects" icon={CheckCircle2} tone="warning" loading={statsQuery.isLoading} />
        </div>
      )}
      emptyTitle="No projects found"
      emptyDescription="Create a project to start tracking tasks, documents and payments."
      emptyIcon={FolderKanban}
    />
  );
}

export function ProjectDetailPage() {
  const { id } = useParams();
  const { names, maps } = useLookups();
  const { isManager } = useAuth();
  const query = useRecord('projects', id);
  const project = query.data;
  const { update } = useResourceActions('projects');
  const [tab, setTab] = useState('overview');
  const [editing, setEditing] = useState(false);
  const insights = useAiInsight({ url: `/ai/projects/${id}/insights` });

  const tasksQuery = useResource('tasks', { project_id: id, limit: 100, sort: 'due_date' });
  const documentsQuery = useResource('documents', { project_id: id, limit: 100 });
  const paymentsQuery = useResource('payments', { project_id: id, limit: 100, sort: '-payment_date' });
  const membersQuery = useResource('project_members', { project_id: id, limit: 50 });

  const tasks = tasksQuery.data?.items || [];
  const documents = documentsQuery.data?.items || [];
  const payments = paymentsQuery.data?.items || [];
  const members = membersQuery.data?.items || [];

  const metrics = useMemo(() => ({
    openTasks: tasks.filter((t) => t.status !== 'Completed').length,
    completedTasks: tasks.filter((t) => t.status === 'Completed').length,
    overdue: tasks.filter((t) => t.status !== 'Completed' && t.due_date && t.due_date < new Date().toISOString().slice(0, 10)).length,
    collected: payments.filter((p) => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount || 0), 0),
    pending: payments.filter((p) => p.status === 'pending').reduce((sum, p) => sum + Number(p.amount || 0), 0),
  }), [tasks, payments]);

  const save = async (values) => {
    try {
      await update.mutateAsync({ id, ...values });
      toast.success('Project updated.');
      setEditing(false);
    } catch (error) {
      toast.error(error.message || 'Could not update this project.');
    }
  };

  if (query.isLoading) {
    return <div className="space-y-4"><Skeleton className="h-16" /><div className="grid gap-4 lg:grid-cols-3"><Skeleton className="h-80 lg:col-span-2" /><Skeleton className="h-80" /></div></div>;
  }
  if (query.isError || !project) return <ErrorState message={query.error?.message || 'Project not found.'} onRetry={query.refetch} />;

  const teamRows = members.length
    ? members.map((member) => ({ ...names.person(member.profile_id), id: member.profile_id, role: member.role }))
    : (project.team || []).map((profileId) => ({ ...names.person(profileId), id: profileId }));

  return (
    <div>
      <DetailHeader
        backTo="/projects"
        backLabel="All projects"
        title={project.name}
        subtitle={`${names.client(project.client_id)} · ${project.category || 'Project'}`}
        avatar={<span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-500 text-white shadow-glow"><FolderKanban className="h-6 w-6" /></span>}
        badges={<><Badge tone={statusTone(project.status)} dot>{project.status}</Badge><SeverityBadge value={project.priority} /></>}
        meta={[{ label: 'Deadline', value: formatDate(project.deadline) }, { label: 'Budget', value: currency(project.budget) }]}
        actions={(
          <>
            <Button variant="secondary" onClick={() => insights.mutate({})} loading={insights.isPending}><Sparkles className="h-4 w-4" /> AI insights</Button>
            {isManager ? <Button onClick={() => setEditing(true)}><Pencil className="h-4 w-4" /> Edit project</Button> : null}
          </>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniStat label="Progress" value={`${project.progress || 0}%`} hint={`${metrics.completedTasks}/${tasks.length} tasks done`} icon={Target} tone="primary" />
        <MiniStat label="Open tasks" value={metrics.openTasks} hint={`${metrics.overdue} overdue`} icon={Clock} tone={metrics.overdue ? 'danger' : 'info'} />
        <MiniStat label="Collected" value={currency(metrics.collected)} hint={`${currency(metrics.pending)} pending`} icon={Wallet} tone="success" />
        <MiniStat label="Team" value={teamRows.length} hint="Assigned members" icon={Users} tone="info" />
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'overview', label: 'Overview' },
          { value: 'tasks', label: 'Tasks', count: tasks.length },
          { value: 'documents', label: 'Documents', count: documents.length },
          { value: 'payments', label: 'Payments', count: payments.length },
          { value: 'team', label: 'Team', count: teamRows.length },
        ]}
      />

      {tab === 'overview' ? (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <SectionCard title="Project details" subtitle="Scope, timeline and commercials" icon={FolderKanban}>
              <InfoGrid
                items={[
                  { label: 'Client', value: names.client(project.client_id) },
                  { label: 'Category', value: project.category },
                  { label: 'Status', value: project.status },
                  { label: 'Priority', value: project.priority },
                  { label: 'Start date', value: formatDate(project.start_date) },
                  { label: 'Deadline', value: formatDate(project.deadline) },
                  { label: 'Budget', value: currency(project.budget) },
                  { label: 'Collected', value: currency(project.amount_paid) },
                  { label: 'Remaining', value: currency(Number(project.budget || 0) - Number(project.amount_paid || 0)) },
                  { label: 'Created', value: formatDate(project.created_at) },
                ]}
              />
              <p className="mt-4 whitespace-pre-wrap border-t border-line pt-4 text-sm leading-relaxed text-muted">{project.description || 'No description yet.'}</p>
            </SectionCard>

            <AiCard title="Project health" subtitle="Risk, blockers and next actions reviewed by your team" action={<AiButton onClick={() => insights.mutate({})} loading={insights.isPending}>Analyse</AiButton>}>
              <AiResult result={insights.data} loading={insights.isPending} error={insights.error} onRetry={() => insights.mutate({})} feature="project_insights" entity="projects" entityId={id} useLabel="Accept insight" />
              {insights.data ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <MiniStat label="Risk" value={insights.data.risk || '—'} />
                  <MiniStat label="Open tasks" value={insights.data.open_tasks} />
                  <MiniStat label="Overdue" value={insights.data.overdue_tasks} />
                </div>
              ) : null}
            </AiCard>

            <SectionCard title="Recent tasks" subtitle="What the team is working on" icon={CheckCircle2} action={<button type="button" className="text-xs font-semibold text-primary" onClick={() => setTab('tasks')}>View all</button>}>
              <div className="space-y-2">
                {tasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center gap-3 rounded-xl border border-line p-3">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${task.status === 'Completed' ? 'bg-success' : 'bg-primary'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{task.title}</p>
                      <p className="text-[10px] text-muted">{task.status} · due {formatDate(task.due_date)}</p>
                    </div>
                    <Progress value={task.progress} className="w-20" />
                  </div>
                ))}
                {!tasks.length ? <EmptyState title="No tasks yet" description="Tasks linked to this project will appear here." icon={CheckCircle2} /> : null}
              </div>
            </SectionCard>
          </div>

          <div className="space-y-4">
            <SectionCard title="Delivery progress" icon={Target}>
              <div className="space-y-4">
                <Progress value={project.progress} showLabel tone={(project.progress || 0) >= 100 ? 'success' : 'primary'} />
                <div className="grid grid-cols-2 gap-2">
                  <MiniStat label="Tasks" value={tasks.length} />
                  <MiniStat label="Done" value={metrics.completedTasks} />
                  <MiniStat label="Documents" value={documents.length} />
                  <MiniStat label="Payments" value={payments.length} />
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Budget health" icon={CircleDollarSign}>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs"><span className="text-muted">Budget</span><span className="font-semibold text-ink">{currency(project.budget)}</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted">Collected</span><span className="font-semibold text-success">{currency(project.amount_paid)}</span></div>
                <div className="flex items-center justify-between text-xs"><span className="text-muted">Outstanding</span><span className="font-semibold text-warning">{currency(Number(project.budget || 0) - Number(project.amount_paid || 0))}</span></div>
                <Progress value={project.budget ? (Number(project.amount_paid || 0) / Number(project.budget)) * 100 : 0} tone="success" />
              </div>
            </SectionCard>
            <SectionCard title="Quick actions" icon={Plus}>
              <div className="space-y-2">
                <Link to="/tasks" className="btn-secondary btn-md w-full"><CheckCircle2 className="h-4 w-4" /> Open task board</Link>
                <Link to="/documents" className="btn-secondary btn-md w-full"><FileText className="h-4 w-4" /> Project documents</Link>
                <Link to="/payments" className="btn-soft btn-md w-full"><Wallet className="h-4 w-4" /> Record a payment</Link>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}

      {tab === 'tasks' ? (
        <Card className="overflow-hidden">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Task</th><th>Status</th><th>Priority</th><th>Owner</th><th>Due</th><th>Progress</th></tr></thead>
              <tbody>
                {tasks.map((task) => (
                  <tr key={task.id}>
                    <td className="font-medium text-ink">{task.title}</td>
                    <td><Badge tone={statusTone(task.status)}>{task.status}</Badge></td>
                    <td><SeverityBadge value={task.priority} /></td>
                    <td><PersonCell name={names.person(task.assigned_to)} /></td>
                    <td className="text-muted">{formatDate(task.due_date)}</td>
                    <td><div className="w-24"><Progress value={task.progress} showLabel /></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!tasks.length ? <EmptyState title="No tasks" description="Add tasks to this project from the task board." icon={CheckCircle2} /> : null}
        </Card>
      ) : null}

      {tab === 'documents' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((document) => (
            <div key={document.id} className="card flex items-center gap-3 p-4">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><FileText className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-ink">{document.name}</p>
                <p className="text-[10px] text-muted">{document.category} · {formatDate(document.created_at)}</p>
              </div>
              {document.shared_with_client ? <Badge tone="success">Shared</Badge> : null}
            </div>
          ))}
          {!documents.length ? <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="No documents" description="Upload documents from the Documents module." icon={FileText} /></div> : null}
        </div>
      ) : null}

      {tab === 'payments' ? (
        <Card className="overflow-hidden">
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Invoice</th><th>Description</th><th>Method</th><th>Status</th><th>Date</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="font-medium text-ink">{payment.invoice_number}</td>
                    <td className="max-w-[240px] truncate text-muted">{payment.description}</td>
                    <td className="text-muted">{payment.method}</td>
                    <td><Badge tone={statusTone(payment.status)} dot>{payment.status}</Badge></td>
                    <td className="text-muted">{formatDate(payment.payment_date)}</td>
                    <td className="text-right font-semibold text-ink">{currency(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!payments.length ? <EmptyState title="No payments" description="Payments linked to this project will appear here." icon={Wallet} /> : null}
        </Card>
      ) : null}

      {tab === 'team' ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {teamRows.map((member) => (
            <div key={member.id} className="card flex items-center justify-between gap-3 p-4">
              <PersonCell name={member.name || '—'} subtitle={member.role || 'Team member'} />
              <Badge tone="neutral">{names.person(member.id)}</Badge>
            </div>
          ))}
          {!teamRows.length ? <div className="sm:col-span-2 xl:col-span-3"><EmptyState title="No team assigned" description="Edit the project to bring teammates onboard." icon={Users} /></div> : null}
        </div>
      ) : null}

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit project" description="Update scope, budget and timeline." size="lg">
        <ResourceForm
          fields={[
            { name: 'name', label: 'Project name', required: true },
            { name: 'client_id', label: 'Client', type: 'select', required: true, options: (maps.clients ? Object.values(maps.clients) : []).map((c) => ({ value: c.id, label: c.label || c.name })) },
            { name: 'category', label: 'Category' },
            { name: 'status', label: 'Status', type: 'select', options: ['ongoing', 'completed', 'on_hold'] },
            { name: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'] },
            { name: 'progress', label: 'Progress (%)', type: 'number', min: 0, max: 100 },
            { name: 'budget', label: 'Budget (₹)', type: 'number', min: 0 },
            { name: 'amount_paid', label: 'Collected (₹)', type: 'number', min: 0 },
            { name: 'start_date', label: 'Start date', type: 'date' },
            { name: 'deadline', label: 'Deadline', type: 'date' },
            { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 3 },
          ]}
          defaultValues={project}
          onSubmit={save}
          onCancel={() => setEditing(false)}
          loading={update.isPending}
          submitLabel="Save changes"
        />
      </Modal>

      <p className="mt-5 text-[11px] text-muted">Last updated {timeAgo(project.updated_at)} · Changes are audited automatically.</p>
    </div>
  );
}
