import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BadgeCheck, BriefcaseBusiness, MailPlus, ShieldCheck, UserCheck, UserCog, UserPlus, Users, XCircle,
} from 'lucide-react';
import CrudPage from '../../components/common/CrudPage';
import ResourceForm from '../../components/common/ResourceForm';
import { Avatar, Badge, Button, Modal, StatCard } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { api, unwrap } from '../../lib/api';
import { useModuleStats } from '../../lib/hooks';
import { formatDate, statusTone } from '../../lib/utils';

const ROLES = [
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'team_member', label: 'Team member' },
];

export default function TeamPage() {
  const { isAdmin } = useAuth();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.team || {};
  const [inviteOpen, setInviteOpen] = useState(false);

  const invite = useMutation({
    mutationFn: async (values) => unwrap(await api.post('/admin/invitations', values)),
    onSuccess: (payload) => {
      setInviteOpen(false);
      toast.success(payload?.message || 'Invitation created.');
      if (payload?.inviteLink) {
        navigator.clipboard?.writeText(payload.inviteLink).then(
          () => toast.success('Invite link copied to your clipboard.'),
          () => {},
        );
      }
    },
    onError: (error) => toast.error(error.message || 'Could not create the invitation.'),
  });

  const columns = useMemo(() => [
    {
      key: 'name', header: 'Team member', sortable: true,
      render: (row) => (
        <div className="flex min-w-[220px] items-center gap-2.5">
          <Avatar name={row.name} src={row.avatar_url} size="sm" status={row.status === 'active' ? 'online' : undefined} />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.name}</p>
            <p className="truncate text-[10px] text-muted">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'designation', header: 'Role', sortable: true,
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-ink">{row.designation || '—'}</p>
          <p className="text-[10px] capitalize text-muted">{String(row.role || '').replace(/_/g, ' ')}</p>
        </div>
      ),
    },
    { key: 'department', header: 'Department', sortable: true, render: (row) => <Badge tone="neutral">{row.department || 'General'}</Badge> },
    { key: 'phone', header: 'Phone', render: (row) => <span className="whitespace-nowrap text-xs text-muted">{row.phone || '—'}</span> },
    { key: 'joining_date', header: 'Joined', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.joining_date)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
  ], []);

  const fields = [
    { name: 'name', label: 'Full name', required: true, placeholder: 'Aarti Menon' },
    { name: 'email', label: 'Work email', type: 'email', required: true, placeholder: 'aarti@cms.dev' },
    { name: 'phone', label: 'Phone', placeholder: '+91 98100 10000' },
    { name: 'designation', label: 'Designation', placeholder: 'Product Designer' },
    { name: 'department', label: 'Department', placeholder: 'Design' },
    { name: 'role', label: 'System role', type: 'select', required: true, options: ROLES },
    { name: 'joining_date', label: 'Joining date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: ['active', 'invited', 'inactive'] },
    { name: 'avatar_url', label: 'Avatar URL', placeholder: 'https://…' },
  ];

  return (
    <>
      <CrudPage
        title="Team"
        subtitle="Your studio roster, roles and departments. Only admins can add or edit teammates."
        eyebrow="Manage"
        resource="team_members"
        columns={columns}
        fields={fields}
        initialValues={{ role: 'team_member', status: 'active', joining_date: new Date().toISOString().slice(0, 10) }}
        addLabel="Add teammate"
        editLabel="Edit teammate"
        searchPlaceholder="Search teammates, roles, departments…"
        canWrite={isAdmin}
        canDelete={isAdmin}
        headerActions={isAdmin ? (
          <Button variant="secondary" onClick={() => setInviteOpen(true)}><MailPlus className="h-4 w-4" /> Invite by email</Button>
        ) : null}
        filterDefs={[
          { key: 'role', label: 'Role', options: ROLES },
          { key: 'status', label: 'Status', options: ['active', 'invited', 'inactive'] },
          { key: 'department', label: 'Department', options: [...new Set(['Leadership', 'Delivery', 'Design', 'Engineering', 'Marketing'])] },
        ]}
        stats={(
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Team size" value={stats.total ?? 0} hint="All records" icon={Users} tone="primary" loading={statsQuery.isLoading} />
            <StatCard label="Active" value={stats.active ?? 0} hint="Currently working" icon={UserCheck} tone="success" loading={statsQuery.isLoading} />
            <StatCard label="Pending" value={stats.pending ?? 0} hint="Invited teammates" icon={UserPlus} tone="warning" loading={statsQuery.isLoading} />
            <StatCard label="Inactive" value={stats.inactive ?? 0} hint="Former teammates" icon={XCircle} tone="danger" loading={statsQuery.isLoading} />
          </div>
        )}
        emptyTitle="No teammates found"
        emptyDescription="Invite your first teammate to collaborate on client work."
        emptyIcon={UserCog}
      />

      <Modal
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        title="Invite a teammate"
        description="We'll create a secure invite link you can share. Email delivery is optional in local demo mode."
      >
        <ResourceForm
          fields={[
            { name: 'name', label: 'Name', placeholder: 'Aarti Menon' },
            { name: 'email', label: 'Email', type: 'email', required: true, placeholder: 'aarti@cms.dev' },
            { name: 'role', label: 'Role', type: 'select', required: true, options: ROLES.slice(0, 3), span: 2 },
          ]}
          defaultValues={{ role: 'team_member' }}
          onSubmit={async (values) => { await invite.mutateAsync(values); }}
          onCancel={() => setInviteOpen(false)}
          loading={invite.isPending}
          submitLabel="Create invite"
        />
      </Modal>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { icon: ShieldCheck, title: 'Role-based access', text: 'Admins manage billing and payroll. Managers own delivery. Team members collaborate.' },
          { icon: BriefcaseBusiness, title: 'Department structure', text: 'Group the team by department and filter the roster instantly.' },
          { icon: BadgeCheck, title: 'Audited changes', text: 'Every role and status change is recorded in the admin audit log.' },
        ].map((item) => (
          <div key={item.title} className="card flex items-start gap-3 p-4">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><item.icon className="h-4 w-4" /></span>
            <div>
              <p className="text-xs font-semibold text-ink">{item.title}</p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{item.text}</p>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
