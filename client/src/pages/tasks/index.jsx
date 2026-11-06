import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CalendarDays, CheckCircle2, CircleDot, Clock, GripVertical, LayoutGrid, List, MessageSquare,
  Plus, Send, Sparkles, Target, Trash2, UserRound,
} from 'lucide-react';
import DataTable from '../../components/common/DataTable';
import ResourceForm from '../../components/common/ResourceForm';
import { AiButton, AiCard, AiResult } from '../../components/common/AiAssistant';
import { MiniStat, PersonCell, SectionCard, SeverityBadge } from '../../components/common/Detail';
import {
  Avatar, Badge, Button, Card, ConfirmDialog, Drawer, EmptyState, ErrorState, Modal, PageHeader,
  Progress, SearchInput, Skeleton, StatCard, Tabs, Textarea,
} from '../../components/ui';
import { useLookups } from '../../lib/lookups';
import { useAiInsight, useModuleStats, useResource, useResourceActions } from '../../lib/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatDate, statusTone, timeAgo } from '../../lib/utils';

const todayKey = () => new Date().toISOString().slice(0, 10);

function TaskFormModal({ open, onClose, task, columns, options, onSubmit, loading }) {
  const fields = useMemo(() => [
    { name: 'title', label: 'Task title', required: true, span: 2, placeholder: 'What needs to be done?' },
    {
      name: 'project_id', label: 'Project', type: 'select',
      options: (options.projects || []).map((p) => ({ value: p.id, label: p.label || p.name })),
    },
    {
      name: 'client_id', label: 'Client', type: 'select',
      options: (options.clients || []).map((c) => ({ value: c.id, label: c.label || c.name })),
    },
    {
      name: 'assigned_to', label: 'Assignee', type: 'select',
      options: (options.profiles || []).map((p) => ({ value: p.id, label: `${p.name} · ${p.role}` })),
    },
    {
      name: 'status', label: 'Status', type: 'select',
      options: (columns || []).map((c) => ({ value: c.name, label: c.name })),
    },
    {
      name: 'priority', label: 'Priority', type: 'select',
      options: [{ value: 'high', label: 'High' }, { value: 'medium', label: 'Medium' }, { value: 'low', label: 'Low' }],
    },
    { name: 'start_date', label: 'Start date', type: 'date' },
    { name: 'due_date', label: 'Due date', type: 'date' },
    { name: 'progress', label: 'Progress (%)', type: 'number', min: 0, max: 100 },
    { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 3 },
  ], [columns, options]);

  const initial = useMemo(() => ({
    status: 'To Do', priority: 'medium', progress: 0, ...task,
  }), [task]);

  return (
    <Modal open={open} onClose={onClose} title={task ? 'Edit task' : 'New task'} description="Assign work, set a due date and keep delivery moving." size="lg">
      <ResourceForm
        fields={fields}
        defaultValues={initial}
        onSubmit={onSubmit}
        onCancel={onClose}
        loading={loading}
        submitLabel={task ? 'Save changes' : 'Create task'}
      />
    </Modal>
  );
}

function TaskDetailDrawer({ task, onClose, columns, names, onEdit, onDelete, isManager }) {
  const queryClient = useQueryClient();
  const commentsQuery = useResource('task_comments', { task_id: task?.id, limit: 100, sort: 'created_at' });
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);
  const comments = commentsQuery.data?.items || [];

  const send = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      await api.post('/task_comments', { task_id: task.id, body: comment.trim() });
      setComment('');
      queryClient.invalidateQueries({ queryKey: ['resource', 'task_comments'] });
      toast.success('Comment added.');
    } catch (error) {
      toast.error(error.message || 'Could not add comment.');
    } finally {
      setSending(false);
    }
  };

  if (!task) return null;
  const overdue = task.status !== 'Completed' && task.due_date && task.due_date < todayKey();

  return (
    <Drawer open={Boolean(task)} onClose={onClose} title="Task details" width="w-full max-w-lg">
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(task.status)} dot>{task.status}</Badge>
            <SeverityBadge value={task.priority} />
            {overdue ? <Badge tone="danger">Overdue</Badge> : null}
          </div>
          <h2 className="text-lg font-bold text-ink">{task.title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">{task.description || 'No description added.'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Assignee" value={names.person(task.assigned_to)} icon={UserRound} />
          <MiniStat label="Project" value={names.project(task.project_id)} icon={Target} tone="info" />
          <MiniStat label="Due" value={formatDate(task.due_date)} icon={CalendarDays} tone={overdue ? 'danger' : 'primary'} />
          <MiniStat label="Progress" value={`${task.progress || 0}%`} icon={CheckCircle2} tone="success" />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">Completion</span>
            <span className="text-muted">{task.progress || 0}%</span>
          </div>
          <Progress value={task.progress || 0} tone={(task.progress || 0) >= 100 ? 'success' : 'primary'} />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => onEdit(task)}>Edit task</Button>
          {isManager ? (
            <Button variant="ghost" size="sm" onClick={() => onDelete(task)}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
          ) : null}
        </div>

        <SectionCard title="Comments" subtitle={`${comments.length} comment${comments.length === 1 ? '' : 's'}`} icon={MessageSquare} padded={false}>
          <div className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin p-4">
            {commentsQuery.isLoading ? <Skeleton className="h-16" /> : comments.length ? comments.map((row) => (
              <div key={row.id} className="rounded-xl border border-line bg-surface2/50 p-3">
                <div className="mb-1 flex items-center gap-2">
                  <Avatar name={row.user_name} size="xs" />
                  <span className="text-xs font-semibold text-ink">{row.user_name}</span>
                  <span className="ml-auto text-[10px] text-muted">{timeAgo(row.created_at)}</span>
                </div>
                <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted">{row.body}</p>
              </div>
            )) : <p className="py-4 text-center text-xs text-muted">No comments yet. Start the conversation.</p>}
          </div>
          <div className="flex items-end gap-2 border-t border-line p-3">
            <Textarea value={comment} onChange={(event) => setComment(event.target.value)} rows={2} placeholder="Add a comment…" className="min-h-[52px]" />
            <Button size="sm" onClick={send} loading={sending} disabled={!comment.trim()}><Send className="h-3.5 w-3.5" /></Button>
          </div>
        </SectionCard>
      </div>
    </Drawer>
  );
}

export function TasksPage() {
  const { isManager } = useAuth();
  const { options, names } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.tasks || {};
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'list' ? 'list' : 'board';
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ assigned_to: '', priority: '', project_id: '', client_id: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [detail, setDetail] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dropColumn, setDropColumn] = useState(null);

  const columns = useMemo(() => [...(options.taskColumns || [])].sort((a, b) => a.position - b.position), [options.taskColumns]);
  const query = useResource('tasks', {
    limit: 300, sort: 'due_date',
    ...(search ? { q: search } : {}),
    ...Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
  });
  const tasks = query.data?.items || [];
  const { create, update, remove } = useResourceActions('tasks');
  const suggestions = useAiInsight({ url: '/ai/tasks/suggestions' });
  const queryClient = useQueryClient();

  const setView = (next) => {
    const params = new URLSearchParams(searchParams);
    if (next === 'board') params.delete('view'); else params.set('view', next);
    setSearchParams(params, { replace: true });
  };

  const columnFor = (name) => columns.find((column) => column.name === name)?.id || null;

  const save = async (values) => {
    const payload = {
      ...values,
      board_id: 'tb_main',
      column_id: columnFor(values.status),
      progress: values.status === 'Completed' ? 100 : Number(values.progress || 0),
    };
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, ...payload });
        toast.success('Task updated.');
      } else {
        await create.mutateAsync(payload);
        toast.success('Task created.');
      }
      setModalOpen(false);
      setEditing(null);
      setDetail(null);
    } catch (error) {
      toast.error(error.message || 'Could not save this task.');
    }
  };

  const moveTask = async (task, column) => {
    if (!task || task.status === column.name) return;
    try {
      await update.mutateAsync({
        id: task.id,
        status: column.name,
        column_id: column.id,
        progress: column.name === 'Completed' ? 100 : task.progress,
      });
      toast.success(`Moved to ${column.name}.`);
    } catch (error) {
      toast.error(error.message || 'Could not move this task.');
    }
  };

  const confirmDelete = async () => {
    try {
      await remove.mutateAsync(deleting.id);
      toast.success('Task deleted.');
      setDeleting(null);
      setDetail(null);
    } catch (error) {
      toast.error(error.message || 'Could not delete this task.');
    }
  };

  const quickStatus = async (task, status) => {
    try {
      await update.mutateAsync({ id: task.id, status, column_id: columnFor(status), progress: status === 'Completed' ? 100 : task.progress });
      toast.success(`Task moved to ${status}.`);
      queryClient.invalidateQueries({ queryKey: ['resource', 'tasks'] });
    } catch (error) {
      toast.error(error.message || 'Could not update this task.');
    }
  };

  const listColumns = useMemo(() => [
    {
      key: 'title', header: 'Task', sortable: true,
      render: (row) => (
        <div className="min-w-[220px]">
          <p className="truncate text-xs font-semibold text-ink">{row.title}</p>
          <p className="truncate text-[10px] text-muted">{names.project(row.project_id)} · {names.client(row.client_id)}</p>
        </div>
      ),
    },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
    { key: 'priority', header: 'Priority', sortable: true, render: (row) => <SeverityBadge value={row.priority} /> },
    { key: 'assigned_to', header: 'Assignee', render: (row) => <PersonCell name={names.person(row.assigned_to)} /> },
    {
      key: 'due_date', header: 'Due', sortable: true,
      render: (row) => {
        const overdue = row.status !== 'Completed' && row.due_date && row.due_date < todayKey();
        return <span className={`whitespace-nowrap text-xs ${overdue ? 'font-semibold text-danger' : 'text-muted'}`}>{formatDate(row.due_date)}</span>;
      },
    },
    { key: 'progress', header: 'Progress', sortable: true, render: (row) => <div className="w-24"><Progress value={row.progress} showLabel /></div> },
  ], [names]);

  const grouped = useMemo(() => Object.fromEntries(columns.map((column) => [
    column.id,
    tasks.filter((task) => task.status === column.name || (!columns.some((c) => c.name === task.status) && column.position === 1)),
  ])), [columns, tasks]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Tasks"
        subtitle="A shared delivery board with owners, due dates, comments and AI prioritisation."
        eyebrow="Delivery"
        actions={(
          <>
            <Tabs
              value={view}
              onChange={setView}
              items={[{ value: 'board', label: 'Board', icon: LayoutGrid }, { value: 'list', label: 'List', icon: List }]}
            />
            <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-4 w-4" /> New task</Button>
          </>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open tasks" value={stats.open ?? 0} hint={`${stats.total ?? 0} total tasks`} icon={CircleDot} loading={statsQuery.isLoading} />
        <StatCard label="My open tasks" value={stats.mine ?? 0} hint="Assigned to you" icon={UserRound} tone="info" loading={statsQuery.isLoading} />
        <StatCard label="Overdue" value={stats.overdue ?? 0} hint="Need attention" icon={Clock} tone={stats.overdue ? 'danger' : 'success'} loading={statsQuery.isLoading} />
        <StatCard label="Completed" value={stats.completed ?? 0} hint="Delivered" icon={CheckCircle2} tone="success" loading={statsQuery.isLoading} />
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Search tasks…" className="w-full sm:max-w-xs" />
        <div className="flex flex-wrap items-center gap-2">
          <select className="select h-9 w-auto min-w-[140px] text-xs" value={filters.assigned_to} onChange={(e) => setFilters((f) => ({ ...f, assigned_to: e.target.value }))} aria-label="Filter by assignee">
            <option value="">All assignees</option>
            {(options.profiles || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="select h-9 w-auto min-w-[130px] text-xs" value={filters.priority} onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {['high', 'medium', 'low'].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className="select h-9 w-auto min-w-[150px] text-xs" value={filters.project_id} onChange={(e) => setFilters((f) => ({ ...f, project_id: e.target.value }))} aria-label="Filter by project">
            <option value="">All projects</option>
            {(options.projects || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select className="select h-9 w-auto min-w-[140px] text-xs" value={filters.client_id} onChange={(e) => setFilters((f) => ({ ...f, client_id: e.target.value }))} aria-label="Filter by client">
            <option value="">All clients</option>
            {(options.clients || []).map((c) => <option key={c.id} value={c.id}>{c.label || c.name}</option>)}
          </select>
        </div>
      </div>

      {query.isError ? (
        <ErrorState message={query.error?.message} onRetry={query.refetch} />
      ) : view === 'list' ? (
        <DataTable
          columns={listColumns}
          rows={tasks}
          loading={query.isLoading}
          error={query.error}
          onRetry={query.refetch}
          exportResource="tasks"
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search tasks…"
          sort="due_date"
          onSortChange={() => {}}
          onRowClick={(row) => setDetail(row)}
          emptyTitle="No tasks found"
          emptyDescription="Create a task or adjust the filters above."
          emptyIcon={CheckCircle2}
          emptyAction={<Button variant="secondary" size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus className="h-3.5 w-3.5" /> New task</Button>}
        />
      ) : query.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => <Skeleton key={column.id} className="h-72" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((column) => {
            const rows = grouped[column.id] || [];
            return (
              <div
                key={column.id}
                onDragOver={(event) => { event.preventDefault(); setDropColumn(column.id); }}
                onDragLeave={() => setDropColumn((current) => (current === column.id ? null : current))}
                onDrop={(event) => {
                  event.preventDefault();
                  setDropColumn(null);
                  moveTask(dragging, column);
                  setDragging(null);
                }}
                className={`flex min-h-[300px] flex-col rounded-2xl border bg-surface2/40 transition ${dropColumn === column.id ? 'border-primary/60 bg-primary-soft/40' : 'border-line'}`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: column.color || '#6366f1' }} />
                    <span className="text-xs font-bold text-ink">{column.name}</span>
                    <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold text-muted">{rows.length}</span>
                  </div>
                  <button type="button" aria-label={`Add task to ${column.name}`} onClick={() => { setEditing({ status: column.name }); setModalOpen(true); }} className="icon-btn h-6 w-6">
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="flex-1 space-y-2 p-2">
                  {rows.map((task) => {
                    const overdue = task.status !== 'Completed' && task.due_date && task.due_date < todayKey();
                    return (
                      <article
                        key={task.id}
                        draggable
                        onDragStart={() => setDragging(task)}
                        onDragEnd={() => setDragging(null)}
                        onClick={() => setDetail(task)}
                        className="group cursor-pointer rounded-xl border border-line bg-surface p-3 shadow-soft transition hover:-translate-y-0.5 hover:shadow-float"
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted/40" />
                          <div className="min-w-0 flex-1">
                            <p className="line-clamp-2 text-xs font-semibold text-ink">{task.title}</p>
                            <p className="mt-1 truncate text-[10px] text-muted">{names.project(task.project_id) || 'Internal task'}</p>
                          </div>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <SeverityBadge value={task.priority} />
                          {overdue ? <Badge tone="danger">Overdue</Badge> : null}
                        </div>
                        <div className="mt-2.5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <Avatar name={names.person(task.assigned_to)} size="xs" />
                            <span className="max-w-[80px] truncate text-[10px] text-muted">{names.person(task.assigned_to)}</span>
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[10px] ${overdue ? 'font-semibold text-danger' : 'text-muted'}`}>
                            <CalendarDays className="h-3 w-3" /> {formatDate(task.due_date)}
                          </span>
                        </div>
                        <div className="mt-2"><Progress value={task.progress} /></div>
                      </article>
                    );
                  })}
                  {!rows.length ? <p className="px-2 py-6 text-center text-[11px] text-muted">Drop tasks here</p> : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AiCard
            title="AI task prioritisation"
            subtitle="Ranked from due dates, priority and ownership — review before reordering your day"
            action={<AiButton onClick={() => suggestions.mutate({ board_id: 'tb_main' })} loading={suggestions.isPending}>Suggest priorities</AiButton>}
          >
            <AiResult
              result={suggestions.data}
              loading={suggestions.isPending}
              error={suggestions.error}
              onRetry={() => suggestions.mutate({ board_id: 'tb_main' })}
              feature="task_suggestions"
              entity="tasks"
              useLabel="Accept plan"
            />
            {suggestions.data?.suggested_order?.length ? (
              <div className="mt-3 space-y-1.5">
                {suggestions.data.suggested_order.slice(0, 6).map((row, index) => (
                  <div key={row.id} className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary-soft text-[10px] font-bold text-primary">{index + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{row.title}</span>
                    <SeverityBadge value={row.priority} />
                    <span className="whitespace-nowrap text-[10px] text-muted">{formatDate(row.due_date)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </AiCard>
        </div>
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-ink">Quick moves</h3>
          <p className="mt-1 text-xs text-muted">Jump the most urgent task forward without opening the board.</p>
          <div className="mt-3 space-y-2">
            {tasks.filter((task) => task.status !== 'Completed').slice(0, 4).map((task) => (
              <div key={task.id} className="rounded-xl border border-line p-2.5">
                <p className="truncate text-xs font-semibold text-ink">{task.title}</p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {columns.filter((column) => column.name !== task.status).slice(0, 2).map((column) => (
                    <button key={column.id} type="button" onClick={() => quickStatus(task, column.name)} className="rounded-md bg-surface2 px-2 py-1 text-[10px] font-semibold text-muted transition hover:bg-primary-soft hover:text-primary">
                      {column.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {!tasks.filter((task) => task.status !== 'Completed').length ? <p className="py-6 text-center text-xs text-muted">Everything is complete.</p> : null}
          </div>
        </Card>
      </div>

      <TaskFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditing(null); }}
        task={editing?.id ? editing : null}
        columns={columns}
        options={options}
        onSubmit={save}
        loading={create.isPending || update.isPending}
      />

      <TaskDetailDrawer
        task={detail}
        onClose={() => setDetail(null)}
        columns={columns}
        names={names}
        isManager={isManager}
        onEdit={(task) => { setDetail(null); setEditing(task); setModalOpen(true); }}
        onDelete={(task) => setDeleting(task)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title="Delete this task?"
        description="The task and its comments will be removed from the active board."
      />
    </div>
  );
}

export default TasksPage;
