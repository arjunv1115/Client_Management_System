import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Bell, BellOff, CalendarDays, CheckCheck, CreditCard, FileText, Gift, Inbox, MessageSquare,
  Package, Sparkles, Target, Trash2, Users,
} from 'lucide-react';
import { api } from '../../lib/api';
import {
  Badge, Button, Card, EmptyState, ErrorState, IconButton, PageHeader, Pagination, Skeleton, Tabs,
} from '../../components/ui';
import { cn, timeAgo } from '../../lib/utils';

const TYPE_ICONS = {
  lead: Target, client: Users, payment: CreditCard, task: CheckCheck, meeting: CalendarDays,
  document: FileText, retainer: Package, referral: Gift, subscription: Sparkles,
  support: MessageSquare, team: Users, invoice: CreditCard, billing: CreditCard, expense: CreditCard,
  project: Inbox, announcement: Bell, message: MessageSquare, plan_limit: Sparkles,
};

const TYPE_TONES = {
  payment: 'success', task: 'info', meeting: 'primary', document: 'primary', referral: 'warning',
  subscription: 'primary', support: 'info', lead: 'primary', plan_limit: 'warning',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('all');
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);

  const query = useQuery({
    queryKey: ['notifications', 'page', { tab, type, page }],
    queryFn: async () => {
      const response = await api.get('/notifications', {
        params: { page, limit: 15, ...(tab === 'unread' ? { unread: 'true' } : {}), ...(type ? { type } : {}) },
      });
      return {
        items: response.data?.data || [],
        pagination: response.data?.pagination || null,
        unread: response.data?.unread || 0,
      };
    },
    placeholderData: (previous) => previous,
  });

  const allQuery = useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: async () => {
      const response = await api.get('/notifications', { params: { limit: 100 } });
      return { items: response.data?.data || [], unread: response.data?.unread || 0 };
    },
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });

  const markAll = async () => {
    try {
      await api.put('/notifications/read-all');
      await invalidate();
      toast.success('All notifications marked as read.');
    } catch (error) {
      toast.error(error.message || 'Could not mark notifications as read.');
    }
  };

  const toggleRead = async (item) => {
    try {
      await api.put(`/notifications/${item.id}/${item.is_read ? 'unread' : 'read'}`);
      await invalidate();
    } catch (error) {
      toast.error(error.message || 'Could not update this notification.');
    }
  };

  const remove = async (item) => {
    try {
      await api.delete(`/notifications/${item.id}`);
      await invalidate();
      toast.success('Notification removed.');
    } catch (error) {
      toast.error(error.message || 'Could not remove this notification.');
    }
  };

  const open = async (item) => {
    if (!item.is_read) {
      try { await api.put(`/notifications/${item.id}/read`); } catch { /* keep navigation */ }
      invalidate();
    }
    if (item.link) navigate(item.link);
  };

  const items = query.data?.items || [];
  const summary = allQuery.data?.items || [];
  const unread = allQuery.data?.unread ?? query.data?.unread ?? 0;
  const types = useMemo(() => [...new Set(summary.map((item) => item.type))].sort(), [summary]);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Notifications"
        subtitle="Every alert across leads, projects, finance and team activity."
        eyebrow="Workspace"
        actions={<Button variant="secondary" onClick={markAll} disabled={!unread}><CheckCheck className="h-4 w-4" /> Mark all read</Button>}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary-soft text-primary"><Bell className="h-5 w-5" /></span>
          <div><p className="text-[10px] uppercase tracking-wide text-muted">Total</p><p className="text-xl font-bold text-ink">{summary.length}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-warning/10 text-warning"><Inbox className="h-5 w-5" /></span>
          <div><p className="text-[10px] uppercase tracking-wide text-muted">Unread</p><p className="text-xl font-bold text-ink">{unread}</p></div>
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-success/10 text-success"><CheckCheck className="h-5 w-5" /></span>
          <div><p className="text-[10px] uppercase tracking-wide text-muted">Read</p><p className="text-xl font-bold text-ink">{Math.max(0, summary.length - unread)}</p></div>
        </Card>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          value={tab}
          onChange={(value) => { setTab(value); setPage(1); }}
          items={[{ value: 'all', label: 'All', count: summary.length }, { value: 'unread', label: 'Unread', count: unread }]}
        />
        <select value={type} onChange={(event) => { setType(event.target.value); setPage(1); }} className="select h-9 w-auto min-w-[170px] text-xs" aria-label="Notification type">
          <option value="">All types</option>
          {types.map((item) => <option key={item} value={item}>{item.replace(/_/g, ' ')}</option>)}
        </select>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-20" />)}</div>
      ) : query.isError ? (
        <ErrorState message={query.error?.message} onRetry={query.refetch} />
      ) : !items.length ? (
        <Card><EmptyState icon={BellOff} title="Nothing to catch up on" description="New alerts about leads, projects and payments will appear here." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="divide-y divide-line">
            {items.map((item) => {
              const Icon = TYPE_ICONS[item.type] || Bell;
              return (
                <div key={item.id} className={cn('group flex items-start gap-3 p-4 transition hover:bg-surface2/40', !item.is_read && 'bg-primary-soft/25')}>
                  <button type="button" onClick={() => open(item)} className="flex min-w-0 flex-1 items-start gap-3 text-left">
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', item.is_read ? 'bg-surface2 text-muted' : 'bg-primary-soft text-primary')}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className={cn('text-xs', item.is_read ? 'font-medium text-ink' : 'font-semibold text-ink')}>{item.title}</p>
                        <Badge tone={TYPE_TONES[item.type] || 'neutral'}>{String(item.type || 'alert').replace(/_/g, ' ')}</Badge>
                        {!item.is_read ? <span className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{item.message}</p>
                      <p className="mt-1 text-[10px] text-muted/80">{timeAgo(item.created_at)}</p>
                    </div>
                  </button>
                  <div className="flex shrink-0 items-center gap-1">
                    <IconButton label={item.is_read ? 'Mark unread' : 'Mark read'} onClick={() => toggleRead(item)}>
                      <CheckCheck className={cn('h-4 w-4', item.is_read ? 'text-primary' : 'text-muted')} />
                    </IconButton>
                    <IconButton label="Delete notification" onClick={() => remove(item)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
          {query.data?.pagination ? <Pagination pagination={query.data.pagination} onPageChange={setPage} /> : null}
        </Card>
      )}

      <p className="mt-4 text-[11px] text-muted">Notifications refresh every minute in the top bar. Marking one as read updates all tabs instantly.</p>
    </div>
  );
}
