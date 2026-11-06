import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Activity, ArrowUpRight, Building2, ClipboardList, Copy, KeyRound, LayoutDashboard,
  Lock, MailPlus, Plus, Save, Search, ShieldCheck, Sparkles, UserCog, Users, Wallet, Zap,
} from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLookups } from '../../lib/lookups';
import { useDebounce } from '../../hooks/useDebounce';
import { ChartCard, SimpleBarChart } from '../../components/charts/Charts';
import {
  Avatar, Badge, Button, Card, CardHeader, CopyButton, EmptyState, ErrorState, Input, Modal,
  PageHeader, Progress, SearchInput, Select, Skeleton, StatCard, Switch, Tabs, Textarea,
} from '../../components/ui';
import {
  cn, currency, formatDate, formatDateTime, number, statusTone, timeAgo, titleCase,
} from '../../lib/utils';

const ROLE_LABELS = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  manager: 'Manager',
  team_member: 'Team Member',
  client: 'Client',
};
const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_OPTIONS = ['active', 'inactive', 'suspended'];
const INVITE_ROLES = ROLE_OPTIONS.filter((role) => role.value !== 'super_admin');

const AI_FEATURE_COPY = {
  business_assistant: ['Business assistant', 'Ask questions about leads, delivery and money in plain English.'],
  lead_scoring: ['Lead scoring', 'Rank open leads by fit, value and urgency.'],
  follow_up: ['Follow-up drafts', 'Draft the next message for a lead without sending it automatically.'],
  pipeline_insights: ['Pipeline insights', 'Spot stalled stages and concentration risk in the sales pipeline.'],
  client_insights: ['Client insights', 'Summarise account health, revenue and open work for a client.'],
  project_insights: ['Project insights', 'Explain progress, risks and next actions for a project.'],
  task_suggestions: ['Task suggestions', 'Recommend what the team should work on next.'],
  meeting_assistant: ['Meeting assistant', 'Draft agendas and summarise meeting notes.'],
  document_assistant: ['Document assistant', 'Summarise documents and draft quotation copy.'],
  financial_insights: ['Financial insights', 'Explain cash position, runway and collection risk.'],
  natural_search: ['Natural search', 'Turn a plain-English question into matching records.'],
  report_generator: ['Report generator', 'Build a structured business report from workspace data.'],
  data_quality: ['Data quality', 'Find missing fields, stale records and duplicates.'],
  quotation_builder: ['Quotation builder', 'Draft quotation scope and pricing for approval.'],
};

function InviteModal({ open, onClose, onCreated }) {
  const [values, setValues] = useState({ name: '', email: '', role: 'team_member' });
  const [result, setResult] = useState(null);
  const mutation = useMutation({
    mutationFn: async (payload) => unwrap(await api.post('/admin/invitations', payload)),
    onSuccess: (payload) => {
      setResult(payload);
      setValues({ name: '', email: '', role: 'team_member' });
      onCreated?.(payload);
      toast.success('Invitation created. Copy the invite link to share it.');
    },
    onError: (error) => toast.error(error.message || 'Could not create the invitation.'),
  });

  useEffect(() => {
    if (!open) setResult(null);
  }, [open]);

  const link = result?.inviteLink
    || (result?.invitation?.token ? `${window.location.origin}/register?invite=${result.invitation.token}` : '');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={result ? 'Invitation ready' : 'Invite a teammate'}
      description={result ? 'Share this link. In this local demo, email delivery is optional.' : 'The invite creates a pending account. Role permissions are applied server-side.'}
      footer={<Button variant="secondary" onClick={onClose}>Done</Button>}
    >
      {result ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-xs text-success">
            <p className="font-semibold">Invitation for {result.invitation?.email}</p>
            <p className="mt-1">Role: {ROLE_LABELS[result.invitation?.role] || result.invitation?.role}. Status: pending.</p>
          </div>
          <div>
            <p className="label">Invite link</p>
            <div className="flex items-center gap-2">
              <input readOnly value={link} className="input font-mono text-[11px]" />
              <CopyButton value={link} label="Copy" />
            </div>
            <p className="mt-1 text-[11px] text-muted">If email is configured on the server, the same link is emailed automatically.</p>
          </div>
          <Button variant="secondary" className="w-full" onClick={() => setResult(null)}><Plus className="h-4 w-4" /> Invite someone else</Button>
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(event) => { event.preventDefault(); mutation.mutate(values); }}
        >
          <Input label="Full name" value={values.name} onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))} placeholder="Optional" />
          <Input label="Email" type="email" required value={values.email} onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))} placeholder="teammate@studio.com" />
          <Select label="Role" value={values.role} onChange={(event) => setValues((current) => ({ ...current, role: event.target.value }))} options={INVITE_ROLES} help="Super Admin cannot be invited. Only an existing Super Admin can grant that role." />
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={mutation.isPending}><MailPlus className="h-4 w-4" /> Create invitation</Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

function OverviewTab({ dashboard, isLoading, audit, orgs, plan }) {
  const { maps } = useLookups();
  const stats = dashboard?.stats || {};
  const revenueByPlan = dashboard?.revenueByPlan || [];

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Organizations" value={number(stats.organizations)} hint="Active workspaces on this instance" icon={Building2} tone="primary" />
        <StatCard label="Users" value={number(stats.users)} hint={`${number(stats.activeUsers)} active`} icon={Users} tone="info" />
        <StatCard label="Paid subscriptions" value={number(stats.activeSubscriptions)} hint="Active plans" icon={ShieldCheck} tone="success" />
        <StatCard label="AI requests" value={number(stats.aiUsage)} hint="Logged assistant calls" icon={Sparkles} tone="warning" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <ChartCard title="Subscriptions by plan" subtitle="Active workspaces grouped by plan." icon={ShieldCheck} height={300}>
          <SimpleBarChart data={revenueByPlan} xKey="name" dataKey="value" name="Workspaces" height={240} color="#6366f1" />
        </ChartCard>
        <Card className="flex flex-col">
          <CardHeader title="Revenue snapshot" subtitle="Billing and platform collections" icon={Wallet} />
          <div className="flex-1 space-y-3 p-4">
            <div className="rounded-xl border border-line bg-surface2/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Paid billing records</p>
              <p className="mt-1 text-xl font-bold text-ink">{currency(stats.billingRevenue)}</p>
            </div>
            <div className="rounded-xl border border-line bg-surface2/50 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Client payments collected</p>
              <p className="mt-1 text-xl font-bold text-ink">{currency(stats.platformRevenue)}</p>
            </div>
            {plan ? (
              <div className="rounded-xl border border-line bg-surface2/50 p-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-ink">{plan.plan || 'Free'} plan</span>
                  <span className="text-muted">AI {plan.ai_requests?.used ?? 0}/{plan.ai_requests?.limit >= 0 ? plan.ai_requests.limit : '∞'}</span>
                </div>
                <Progress className="mt-2" value={plan.ai_requests?.limit < 0 ? 10 : Math.min(100, ((plan.ai_requests?.used || 0) / Math.max(1, plan.ai_requests?.limit || 1)) * 100)} />
              </div>
            ) : null}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader title="Recent audit activity" subtitle="Who changed what, newest first." icon={ClipboardList} />
          {!audit.length ? <EmptyState icon={ClipboardList} title="No audit events yet" description="Admin actions will appear here." /> : (
            <div className="divide-y divide-line">
              {audit.map((entry) => (
                <div key={entry.id || `${entry.action}-${entry.created_at}`} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Activity className="h-4 w-4" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink">{titleCase(entry.action || '')}</p>
                    <p className="mt-0.5 text-[11px] text-muted">
                      {maps.profiles[entry.user_id]?.name || entry.user_email || 'System'} · {entry.entity || 'record'}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] text-muted">{timeAgo(entry.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader title="Organizations" subtitle="Workspaces visible to your role." icon={Building2} action={<Badge tone="neutral">{orgs.length}</Badge>} />
          <div className="divide-y divide-line">
            {orgs.map((org) => (
              <div key={org.id} className="flex items-center gap-3 px-4 py-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-500 text-xs font-bold text-white">
                  {String(org.name || '?').slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-ink">{org.name}</p>
                  <p className="truncate text-[11px] text-muted">{org.email || org.slug}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-semibold uppercase text-muted">{org.currency || 'INR'}</p>
                  <p className="text-[10px] text-muted">Created {formatDate(org.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function UsersTab({ onInvite }) {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [role, setRole] = useState('');
  const [status, setStatus] = useState('');

  const params = useMemo(() => ({
    ...(search ? { q: search } : {}),
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
  }), [search, role, status]);

  const usersQuery = useQuery({
    queryKey: ['admin', 'users', params],
    queryFn: async () => unwrap(await api.get('/admin/users', { params })),
  });

  const updateRole = useMutation({
    mutationFn: async ({ id, role: next }) => unwrap(await api.patch(`/admin/users/${id}/role`, { role: next })),
    onSuccess: () => {
      toast.success('Role updated. The user should sign in again for the sidebar to refresh.');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => toast.error(error.message || 'Could not update the role.'),
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status: next }) => unwrap(await api.patch(`/admin/users/${id}/status`, { status: next })),
    onSuccess: () => {
      toast.success('Account status updated.');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: (error) => toast.error(error.message || 'Could not update the status.'),
  });

  const rows = usersQuery.data || [];

  return (
    <div className="space-y-4">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
          <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search name or email…" className="w-full sm:max-w-xs" />
          <select value={role} onChange={(event) => setRole(event.target.value)} className="select h-9 w-auto min-w-[130px] text-xs" aria-label="Filter role">
            <option value="">All roles</option>
            {ROLE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="select h-9 w-auto min-w-[130px] text-xs" aria-label="Filter status">
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <Badge tone="neutral">{rows.length} users</Badge>
            <Button size="sm" onClick={onInvite}><Plus className="h-3.5 w-3.5" /> Invite</Button>
          </div>
        </div>

        {usersQuery.isLoading ? (
          <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : usersQuery.isError ? (
          <ErrorState message={usersQuery.error?.message} onRetry={usersQuery.refetch} />
        ) : !rows.length ? (
          <EmptyState icon={Users} title="No users match" description="Try a different search or invite a teammate." action={<Button size="sm" onClick={onInvite}><Plus className="h-3.5 w-3.5" /> Invite teammate</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr><th>User</th><th>Role</th><th>Status</th><th>Last login</th><th>Joined</th></tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelf = row.id === currentUser?.id;
                  const protectedUser = row.role === 'super_admin' && currentUser?.role !== 'super_admin';
                  return (
                    <tr key={row.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={row.name} src={row.avatar_url} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">{row.name} {isSelf ? <span className="text-[10px] text-muted">(you)</span> : null}</p>
                            <p className="truncate text-[11px] text-muted">{row.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <select
                          value={row.role}
                          disabled={isSelf || protectedUser || updateRole.isPending}
                          onChange={(event) => updateRole.mutate({ id: row.id, role: event.target.value })}
                          className="select h-8 w-auto min-w-[130px] py-0 text-xs"
                          aria-label={`Role for ${row.name}`}
                        >
                          {ROLE_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <select
                          value={row.status}
                          disabled={isSelf || protectedUser || updateStatus.isPending}
                          onChange={(event) => updateStatus.mutate({ id: row.id, status: event.target.value })}
                          className="select h-8 w-auto min-w-[120px] py-0 text-xs"
                          aria-label={`Status for ${row.name}`}
                        >
                          {STATUS_OPTIONS.map((item) => <option key={item} value={item}>{titleCase(item)}</option>)}
                        </select>
                      </td>
                      <td className="text-xs text-muted">{row.last_login_at ? formatDateTime(row.last_login_at) : 'Never'}</td>
                      <td className="text-xs text-muted">{formatDate(row.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <p className="text-[11px] text-muted">You cannot change your own role or status. Only a Super Admin can grant or modify Super Admin access.</p>
    </div>
  );
}

function InvitationsTab({ onInvite }) {
  const { maps } = useLookups();
  const invitationsQuery = useQuery({
    queryKey: ['admin', 'invitations'],
    queryFn: async () => unwrap(await api.get('/admin/invitations')),
  });
  const rows = invitationsQuery.data || [];
  const pending = rows.filter((row) => row.status === 'pending').length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total invitations" value={rows.length} hint="All time" icon={MailPlus} tone="primary" />
        <StatCard label="Pending" value={pending} hint="Waiting to be accepted" icon={ArrowUpRight} tone="warning" />
        <StatCard label="Accepted" value={rows.filter((row) => row.status === 'accepted').length} hint="Joined the workspace" icon={ShieldCheck} tone="success" />
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Invitations" subtitle="Share links manually until email delivery is configured." icon={MailPlus} action={<Button size="sm" onClick={onInvite}><Plus className="h-3.5 w-3.5" /> Invite</Button>} />
        {invitationsQuery.isLoading ? (
          <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
        ) : invitationsQuery.isError ? (
          <ErrorState message={invitationsQuery.error?.message} onRetry={invitationsQuery.refetch} />
        ) : !rows.length ? (
          <EmptyState icon={MailPlus} title="No invitations yet" description="Invite a teammate and share the generated link." action={<Button size="sm" onClick={onInvite}><Plus className="h-3.5 w-3.5" /> Invite teammate</Button>} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Email</th><th>Role</th><th>Status</th><th>Invited by</th><th>Created</th><th>Link</th></tr></thead>
              <tbody>
                {rows.map((row) => {
                  const link = `${window.location.origin}/register?invite=${row.token}`;
                  return (
                    <tr key={row.id}>
                      <td>
                        <p className="text-xs font-semibold text-ink">{row.name || row.email}</p>
                        <p className="text-[11px] text-muted">{row.email}</p>
                      </td>
                      <td><Badge tone="info">{ROLE_LABELS[row.role] || row.role}</Badge></td>
                      <td><Badge tone={statusTone(row.status)} dot>{titleCase(row.status)}</Badge></td>
                      <td className="text-xs text-muted">{maps.profiles[row.invited_by]?.name || '—'}</td>
                      <td className="text-xs text-muted">{formatDate(row.created_at)}</td>
                      <td><CopyButton value={link} label="Copy link" /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function RolesTab() {
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState('manager');
  const [selected, setSelected] = useState([]);

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: async () => unwrap(await api.get('/admin/roles')),
  });

  const roles = rolesQuery.data?.roles || [];
  const permissions = rolesQuery.data?.permissions || [];
  const rolePermissions = rolesQuery.data?.rolePermissions || [];

  useEffect(() => {
    const codes = rolePermissions.filter((row) => row.role === selectedRole).map((row) => row.permission);
    setSelected(codes);
  }, [selectedRole, rolePermissions]);

  const save = useMutation({
    mutationFn: async (codes) => unwrap(await api.put(`/admin/roles/${selectedRole}/permissions`, { permissions: codes })),
    onSuccess: () => {
      toast.success('Role permissions saved. Users may need to refresh their session.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'roles'] });
    },
    onError: (error) => toast.error(error.message || 'Could not save permissions.'),
  });

  const grouped = useMemo(() => {
    const map = {};
    permissions.forEach((permission) => {
      const module = permission.module || permission.code.split('.')[0];
      map[module] = map[module] || [];
      map[module].push(permission);
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [permissions]);

  const fixed = selectedRole === 'super_admin';
  const toggle = (code) => setSelected((current) => (current.includes(code)
    ? current.filter((item) => item !== code)
    : [...current, code]));

  if (rolesQuery.isLoading) return <Skeleton className="h-96" />;
  if (rolesQuery.isError) return <ErrorState message={rolesQuery.error?.message} onRetry={rolesQuery.refetch} />;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {roles.map((role) => {
          const count = rolePermissions.filter((row) => row.role === role.slug).length;
          return (
            <button
              key={role.id || role.slug}
              type="button"
              onClick={() => setSelectedRole(role.slug)}
              className={cn('rounded-xl border p-4 text-left transition', selectedRole === role.slug ? 'border-primary bg-primary-soft/40' : 'border-line bg-surface hover:border-primary/30')}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-ink">{role.name}</p>
                <Badge tone={selectedRole === role.slug ? 'primary' : 'neutral'}>{count} permissions</Badge>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{role.description}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-muted">Level {role.level}</p>
            </button>
          );
        })}
      </div>

      <Card>
        <CardHeader
          title={`${ROLE_LABELS[selectedRole] || selectedRole} permissions`}
          subtitle={fixed ? 'Super Admin permissions are fixed and cannot be edited.' : 'Changes apply on the server immediately. Frontend guards are never the source of truth.'}
          icon={KeyRound}
          action={(
            <Button size="sm" disabled={fixed} loading={save.isPending} onClick={() => save.mutate(selected)}>
              <Save className="h-3.5 w-3.5" /> Save permissions
            </Button>
          )}
        />
        <div className="space-y-5 p-5">
          {grouped.map(([module, items]) => (
            <div key={module}>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-muted">{titleCase(module)}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((permission) => {
                  const active = fixed || selected.includes(permission.code);
                  return (
                    <button
                      key={permission.id || permission.code}
                      type="button"
                      disabled={fixed}
                      onClick={() => toggle(permission.code)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition',
                        active ? 'border-primary/40 bg-primary-soft text-primary' : 'border-line bg-surface text-muted hover:border-primary/30 hover:text-ink',
                        fixed && 'cursor-default opacity-80',
                      )}
                    >
                      {active ? <ShieldCheck className="h-3 w-3" /> : <Lock className="h-3 w-3" />}
                      {permission.name || permission.code}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function AiSettingsTab() {
  const queryClient = useQueryClient();
  const [enabled, setEnabled] = useState({});

  const settingsQuery = useQuery({
    queryKey: ['admin', 'ai-settings'],
    queryFn: async () => unwrap(await api.get('/admin/ai-settings')),
  });

  useEffect(() => {
    if (!settingsQuery.data) return;
    setEnabled(Object.fromEntries(settingsQuery.data.map((row) => [row.feature, row.enabled !== false])));
  }, [settingsQuery.data]);

  const save = useMutation({
    mutationFn: async (settings) => unwrap(await api.put('/admin/ai-settings', { settings })),
    onSuccess: () => {
      toast.success('AI feature settings saved.');
      queryClient.invalidateQueries({ queryKey: ['admin', 'ai-settings'] });
      queryClient.invalidateQueries({ queryKey: ['ai'] });
    },
    onError: (error) => toast.error(error.message || 'Could not save AI settings.'),
  });

  const rows = settingsQuery.data || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="AI feature controls"
          subtitle="Disable any capability for the whole workspace. Outputs never change data without human approval."
          icon={Sparkles}
          action={(
            <Button
              size="sm"
              loading={save.isPending}
              onClick={() => save.mutate(rows.map((row) => ({ feature: row.feature, enabled: enabled[row.feature] !== false })))}
            >
              <Save className="h-3.5 w-3.5" /> Save settings
            </Button>
          )}
        />
        {settingsQuery.isLoading ? (
          <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
        ) : settingsQuery.isError ? (
          <ErrorState message={settingsQuery.error?.message} onRetry={settingsQuery.refetch} />
        ) : !rows.length ? (
          <EmptyState icon={Sparkles} title="No AI settings" description="This organization has no AI feature rows yet." />
        ) : (
          <div className="grid gap-0 sm:grid-cols-2">
            {rows.map((row) => {
              const [label, description] = AI_FEATURE_COPY[row.feature] || [titleCase(row.feature), 'AI capability for this workspace.'];
              return (
                <div key={row.id || row.feature} className="border-b border-line p-4 sm:odd:border-r">
                  <Switch
                    checked={enabled[row.feature] !== false}
                    onChange={(checked) => setEnabled((current) => ({ ...current, [row.feature]: checked }))}
                    label={label}
                    description={description}
                  />
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-start gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-success/10 text-success"><ShieldCheck className="h-4 w-4" /></span>
            <div>
              <p className="text-xs font-semibold text-ink">Human approval is always required</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">Quotations, emails and suggestions are drafts. The server records an approval event before saving AI output.</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-start gap-2.5">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-info/10 text-info"><Zap className="h-4 w-4" /></span>
            <div>
              <p className="text-xs font-semibold text-ink">Local rules engine fallback</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">Without an AI key, the assistant still answers from real workspace records. Add AI_API_KEY in server/.env for an LLM provider.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function AuditTab() {
  const { maps } = useLookups();
  const [action, setAction] = useState('');
  const [entity, setEntity] = useState('');

  const auditQuery = useQuery({
    queryKey: ['admin', 'audit-logs'],
    queryFn: async () => unwrap(await api.get('/admin/audit-logs', { params: { limit: 200 } })),
  });

  const rows = auditQuery.data || [];
  const entities = useMemo(() => Array.from(new Set(rows.map((row) => row.entity).filter(Boolean))).sort(), [rows]);
  const filtered = useMemo(() => rows.filter((row) => {
    const matchesAction = !action || String(row.action || '').toLowerCase().includes(action.toLowerCase());
    const matchesEntity = !entity || row.entity === entity;
    return matchesAction && matchesEntity;
  }), [rows, action, entity]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input value={action} onChange={(event) => setAction(event.target.value)} placeholder="Filter action, e.g. auth or admin…" className="input h-9 pl-9 text-xs" />
        </div>
        <select value={entity} onChange={(event) => setEntity(event.target.value)} className="select h-9 w-auto min-w-[150px] text-xs" aria-label="Filter entity">
          <option value="">All entities</option>
          {entities.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <Badge tone="neutral" className="ml-auto">{filtered.length} events</Badge>
      </div>

      {auditQuery.isLoading ? (
        <div className="space-y-2 p-4"><Skeleton className="h-10" /><Skeleton className="h-10" /><Skeleton className="h-10" /></div>
      ) : auditQuery.isError ? (
        <ErrorState message={auditQuery.error?.message} onRetry={auditQuery.refetch} />
      ) : !filtered.length ? (
        <EmptyState icon={ClipboardList} title="No audit events" description="Try clearing the filters." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>When</th><th>Action</th><th>Entity</th><th>User</th><th>IP</th><th>Changes</th></tr></thead>
            <tbody>
              {filtered.slice(0, 100).map((row) => (
                <tr key={row.id}>
                  <td className="whitespace-nowrap text-[11px] text-muted">{formatDateTime(row.created_at)}</td>
                  <td><span className="rounded-md bg-surface2 px-1.5 py-0.5 font-mono text-[10px] text-ink">{row.action}</span></td>
                  <td className="text-xs text-muted">{row.entity || '—'}{row.entity_id ? <span className="block text-[10px] text-muted/70">{row.entity_id}</span> : null}</td>
                  <td className="text-xs text-muted">{maps.profiles[row.user_id]?.name || row.user_email || 'System'}</td>
                  <td className="text-[10px] text-muted">{row.ip || '—'}</td>
                  <td className="max-w-[260px]">
                    {row.changes ? (
                      <details>
                        <summary className="cursor-pointer text-[10px] font-semibold text-primary">View</summary>
                        <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap rounded bg-surface2 p-1.5 text-[9px] text-muted">{JSON.stringify(row.changes, null, 2)}</pre>
                      </details>
                    ) : <span className="text-[10px] text-muted">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ActivityTab() {
  const { maps } = useLookups();
  const activityQuery = useQuery({
    queryKey: ['admin', 'activity-logs'],
    queryFn: async () => unwrap(await api.get('/admin/activity-logs', { params: { limit: 100 } })),
  });
  const rows = activityQuery.data || [];

  return (
    <Card className="overflow-hidden">
      <CardHeader title="Workspace activity" subtitle="Human-readable record of recent work." icon={Activity} />
      {activityQuery.isLoading ? (
        <div className="space-y-2 p-4"><Skeleton className="h-12" /><Skeleton className="h-12" /></div>
      ) : activityQuery.isError ? (
        <ErrorState message={activityQuery.error?.message} onRetry={activityQuery.refetch} />
      ) : !rows.length ? (
        <EmptyState icon={Activity} title="No activity yet" description="Create or update a record to see it here." />
      ) : (
        <div className="divide-y divide-line">
          {rows.map((row) => (
            <div key={row.id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Activity className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-ink">{row.description || titleCase(row.action || '')}</p>
                <p className="mt-0.5 text-[10px] text-muted">
                  {maps.profiles[row.user_id]?.name || 'System'} · {row.module || 'workspace'}{row.record_id ? ` · ${row.record_id}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-[10px] text-muted">{timeAgo(row.created_at)}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function OrganizationsTab() {
  const organizationsQuery = useQuery({
    queryKey: ['admin', 'organizations'],
    queryFn: async () => unwrap(await api.get('/admin/organizations')),
  });
  const rows = organizationsQuery.data || [];

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 rounded-xl border border-info/25 bg-info/10 p-4 text-xs text-info">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0" />
        <p>This platform view is available to Super Admins only. Organization data is read-only in this demo; edit your own workspace in Settings → Organization.</p>
      </div>
      {organizationsQuery.isLoading ? <Skeleton className="h-64" /> : organizationsQuery.isError ? (
        <ErrorState message={organizationsQuery.error?.message} onRetry={organizationsQuery.refetch} />
      ) : !rows.length ? <EmptyState icon={Building2} title="No organizations" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {rows.map((org) => (
            <Card key={org.id} className="p-5">
              <div className="flex items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-500 font-display text-sm font-bold text-white">
                  {String(org.name || '?').slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-semibold text-ink">{org.name}</p>
                    <Badge tone="primary">{org.currency || 'INR'}</Badge>
                  </div>
                  <p className="text-[11px] text-muted">/{org.slug}</p>
                  <div className="mt-3 grid gap-1 text-[11px] text-muted">
                    <p>{org.email || 'No billing email'}</p>
                    <p>{org.phone || 'No phone'}</p>
                    <p className="truncate">{org.website || 'No website'}</p>
                    <p>Created {formatDate(org.created_at)}</p>
                  </div>
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-surface2/60 px-2.5 py-2">
                <p className="break-all font-mono text-[10px] text-muted">{org.id}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('overview');
  const [inviteOpen, setInviteOpen] = useState(false);
  const isSuperAdmin = user?.role === 'super_admin';

  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: async () => unwrap(await api.get('/admin/dashboard')),
  });

  const dashboard = dashboardQuery.data;

  const tabs = useMemo(() => [
    { value: 'overview', label: 'Overview', icon: LayoutDashboard },
    { value: 'users', label: 'Users', icon: Users },
    { value: 'invitations', label: 'Invitations', icon: MailPlus },
    { value: 'roles', label: 'Roles', icon: KeyRound },
    { value: 'ai', label: 'AI settings', icon: Sparkles },
    { value: 'audit', label: 'Audit log', icon: ClipboardList },
    { value: 'activity', label: 'Activity', icon: Activity },
    ...(isSuperAdmin ? [{ value: 'organizations', label: 'Organizations', icon: Building2 }] : []),
  ], [isSuperAdmin]);

  if (!isAdmin) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Admin" subtitle="This area is restricted to administrators." eyebrow="Manage" />
        <EmptyState icon={Lock} title="Administrator access required" description="Ask a Super Admin or Admin to grant you access." />
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Admin console"
        eyebrow="Manage"
        subtitle="Platform health, people, roles, AI controls and the audit trail. Every action is authorized on the server."
        actions={(
          <>
            <Button variant="secondary" onClick={() => { queryClient.invalidateQueries({ queryKey: ['admin'] }); toast.success('Admin data refreshed.'); }}>
              Refresh
            </Button>
            <Button onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4" /> Invite</Button>
          </>
        )}
      />

      <Tabs className="mb-5" items={tabs} value={tab} onChange={setTab} />

      {tab === 'overview' ? (
        <OverviewTab
          dashboard={dashboard}
          isLoading={dashboardQuery.isLoading}
          audit={dashboard?.recentAudit || []}
          orgs={dashboard?.organizations || []}
          plan={dashboard?.plan}
        />
      ) : null}
      {tab === 'users' ? <UsersTab onInvite={() => setInviteOpen(true)} /> : null}
      {tab === 'invitations' ? <InvitationsTab onInvite={() => setInviteOpen(true)} /> : null}
      {tab === 'roles' ? <RolesTab /> : null}
      {tab === 'ai' ? <AiSettingsTab /> : null}
      {tab === 'audit' ? <AuditTab /> : null}
      {tab === 'activity' ? <ActivityTab /> : null}
      {tab === 'organizations' ? <OrganizationsTab /> : null}

      <InviteModal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ['admin', 'invitations'] })}
      />
    </div>
  );
}
