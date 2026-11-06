import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  BookOpen, CheckCircle2, Clock3, HelpCircle, LifeBuoy, MessageSquare, Plus, Send,
  ShieldCheck, Sparkles, Ticket, UserRound,
} from 'lucide-react';
import { toast } from 'sonner';
import AiChat from '../../components/common/AiChat';
import ResourceForm from '../../components/common/ResourceForm';
import {
  Badge, Button, Card, CardHeader, EmptyState, ErrorState, Modal, PageHeader, SearchInput,
  Skeleton, StatCard, Tabs, Textarea,
} from '../../components/ui';
import { useResource, useResourceActions } from '../../lib/hooks';
import { useLookups } from '../../lib/lookups';
import { useDebounce } from '../../hooks/useDebounce';
import { cn, formatDateTime, statusTone, timeAgo } from '../../lib/utils';

const STATUSES = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

const statusLabel = (value) => String(value || 'open').replace(/_/g, ' ');

const FAQS = [
  ['How do I invite a client?', 'Open Clients, create the client record, then share their portal login. Client users only see records linked to their client account.'],
  ['Why can I not see finance pages?', 'Payments, expenses and payroll are restricted by role. Ask an administrator to update your role permissions in Admin → Roles.'],
  ['Can AI change my data?', 'No. AI only produces a draft or suggestion. Every saved AI output requires an explicit human approval and is written to the audit log.'],
  ['How do exports work?', 'Every list has a CSV or JSON export. Settings → Data & Export has workspace-wide exports for backup.'],
];

function TicketDetail({ ticket, onClose }) {
  const queryClient = useQueryClient();
  const { maps } = useLookups();
  const [reply, setReply] = useState('');
  const [status, setStatus] = useState(ticket?.status || 'open');
  const messagesQuery = useResource('support_messages', { ticket_id: ticket?.id, limit: 100, sort: 'created_at' }, { enabled: Boolean(ticket?.id) });
  const ticketActions = useResourceActions('support_tickets');
  const messageActions = useResourceActions('support_messages');
  const messages = messagesQuery.data?.items || [];

  const send = async () => {
    const body = reply.trim();
    if (!body) return;
    try {
      await messageActions.create.mutateAsync({ ticket_id: ticket.id, body });
      setReply('');
      toast.success('Reply added to the ticket.');
    } catch (error) {
      toast.error(error.message || 'Could not add the reply.');
    }
  };

  const updateStatus = async (next) => {
    setStatus(next);
    try {
      await ticketActions.update.mutateAsync({ id: ticket.id, status: next });
      toast.success(`Ticket marked ${statusLabel(next)}.`);
      queryClient.invalidateQueries({ queryKey: ['resource', 'support_tickets'] });
    } catch (error) {
      toast.error(error.message || 'Could not update the ticket.');
    }
  };

  return (
    <Modal
      open={Boolean(ticket)}
      onClose={onClose}
      title={ticket?.subject || 'Support ticket'}
      description={`${statusLabel(ticket?.status)} · ${ticket?.priority || 'medium'} priority`}
      size="lg"
      footer={(
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] text-muted">Opened {formatDateTime(ticket?.created_at)}</span>
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      )}
    >
      {ticket ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(ticket.status)}>{statusLabel(ticket.status)}</Badge>
            <Badge tone={statusTone(ticket.priority)}>{ticket.priority || 'medium'} priority</Badge>
            <span className="text-[11px] text-muted">ID {ticket.id}</span>
          </div>

          <div className="rounded-xl border border-line bg-surface2/40 p-4">
            <p className="text-sm leading-relaxed text-ink whitespace-pre-wrap">{ticket.message}</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Conversation</p>
            {messagesQuery.isLoading ? (
              <div className="space-y-2"><Skeleton className="h-14" /><Skeleton className="h-14" /></div>
            ) : messagesQuery.isError ? (
              <ErrorState message={messagesQuery.error?.message} onRetry={messagesQuery.refetch} />
            ) : !messages.length ? (
              <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-xs text-muted">No replies yet. Add the first update below.</p>
            ) : (
              <div className="max-h-72 space-y-3 overflow-y-auto scrollbar-thin pr-1">
                {messages.map((message) => {
                  const author = maps.profiles[message.user_id]?.name || maps.team[message.user_id]?.name || 'Support';
                  return (
                    <div key={message.id} className="rounded-xl border border-line bg-surface p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink"><UserRound className="h-3.5 w-3.5 text-primary" /> {author}</span>
                        <span className="text-[10px] text-muted">{timeAgo(message.created_at)}</span>
                      </div>
                      <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted">{message.body}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <Textarea
              label="Add a reply"
              rows={3}
              value={reply}
              onChange={(event) => setReply(event.target.value)}
              placeholder="Share an update, ask a question or confirm the fix…"
            />
            <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted">Status</span>
                <select value={status} onChange={(event) => updateStatus(event.target.value)} className="select h-8 w-auto py-0 text-xs" aria-label="Ticket status">
                  {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
              </div>
              <Button size="sm" onClick={send} loading={messageActions.create.isPending} disabled={!reply.trim()}>
                <Send className="h-3.5 w-3.5" /> Send reply
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}

export default function HelpPage() {
  const [tab, setTab] = useState('tickets');
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 300);
  const [status, setStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const { options } = useLookups();

  const params = useMemo(() => ({ limit: 50, sort: '-created_at', ...(search ? { q: search } : {}), ...(status ? { status } : {}) }), [search, status]);
  const ticketsQuery = useResource('support_tickets', params);
  const allQuery = useResource('support_tickets', { limit: 200, sort: '-created_at' });
  const actions = useResourceActions('support_tickets');
  const tickets = ticketsQuery.data?.items || [];
  const allTickets = allQuery.data?.items || [];

  const counts = useMemo(() => ({
    open: allTickets.filter((ticket) => ticket.status === 'open').length,
    progress: allTickets.filter((ticket) => ticket.status === 'in_progress').length,
    resolved: allTickets.filter((ticket) => ['resolved', 'closed'].includes(ticket.status)).length,
  }), [allTickets]);

  const createTicket = async (values) => {
    try {
      await actions.create.mutateAsync({
        subject: values.subject,
        message: values.message,
        priority: values.priority || 'medium',
        status: 'open',
      });
      setCreateOpen(false);
      toast.success('Ticket created. Our team will pick it up shortly.');
    } catch (error) {
      toast.error(error.message || 'Could not create the ticket.');
    }
  };

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Help & Support"
        subtitle="Find quick answers, raise a support ticket, or ask the AI assistant to explain your workspace."
        eyebrow="Support"
        actions={(
          <>
            <Button variant="secondary" onClick={() => setTab('assistant')}><Sparkles className="h-4 w-4" /> Ask AI</Button>
            <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> New ticket</Button>
          </>
        )}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-3">
        <StatCard label="Open tickets" value={counts.open} hint="Waiting for a first response" icon={Ticket} tone="warning" />
        <StatCard label="In progress" value={counts.progress} hint="Being worked on now" icon={Clock3} tone="info" />
        <StatCard label="Resolved" value={counts.resolved} hint="Closed or fixed" icon={CheckCircle2} tone="success" />
      </div>

      <Tabs
        className="mb-4"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'tickets', label: 'Support tickets', icon: LifeBuoy, count: allTickets.length },
          { value: 'assistant', label: 'AI assistant', icon: Sparkles },
          { value: 'faq', label: 'Quick answers', icon: HelpCircle },
        ]}
      />

      {tab === 'tickets' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
              <SearchInput value={searchInput} onChange={setSearchInput} placeholder="Search tickets…" className="w-full sm:max-w-xs" />
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="select h-9 w-auto min-w-[140px] text-xs" aria-label="Ticket status">
                <option value="">All statuses</option>
                {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>
            {ticketsQuery.isLoading ? (
              <div className="space-y-2 p-4"><Skeleton className="h-16" /><Skeleton className="h-16" /><Skeleton className="h-16" /></div>
            ) : ticketsQuery.isError ? (
              <ErrorState message={ticketsQuery.error?.message} onRetry={ticketsQuery.refetch} />
            ) : !tickets.length ? (
              <EmptyState
                icon={LifeBuoy}
                title="No support tickets"
                description="Create a ticket and the studio team will follow up. Most questions can also be answered by the AI assistant."
                action={<Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" /> New ticket</Button>}
              />
            ) : (
              <div className="divide-y divide-line">
                {tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => setSelected(ticket)}
                    className="flex w-full items-start gap-3 p-4 text-left transition hover:bg-surface2/50"
                  >
                    <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', ticket.status === 'open' ? 'bg-warning/10 text-warning' : 'bg-primary-soft text-primary')}>
                      <MessageSquare className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-ink">{ticket.subject}</p>
                        <Badge tone={statusTone(ticket.status)}>{statusLabel(ticket.status)}</Badge>
                        <Badge tone={statusTone(ticket.priority)}>{ticket.priority || 'medium'}</Badge>
                      </div>
                      <p className="mt-1 line-clamp-1 text-xs text-muted">{ticket.message}</p>
                      <p className="mt-1 text-[10px] text-muted">Updated {timeAgo(ticket.updated_at || ticket.created_at)}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader title="Need a human?" subtitle="Support hours: 10:00–19:00 IST" icon={LifeBuoy} />
              <div className="space-y-3 p-4 text-xs text-muted">
                <p>For billing or access issues, raise a ticket with screenshots. We reply inside one business day.</p>
                <div className="rounded-xl border border-primary/20 bg-primary-soft/40 p-3 text-primary">
                  <p className="flex items-center gap-1.5 font-semibold"><ShieldCheck className="h-3.5 w-3.5" /> Server-side permissions</p>
                  <p className="mt-1 leading-relaxed">Tickets and replies are scoped to your account. Clients only see their own conversations.</p>
                </div>
                <p>You can also start a conversation in <span className="font-semibold text-ink">Messages</span> for project-specific questions.</p>
              </div>
            </Card>
            <Card>
              <CardHeader title="Popular guides" subtitle="Short reads from the studio handbook" icon={BookOpen} />
              <div className="divide-y divide-line">
                {FAQS.slice(0, 3).map(([question]) => (
                  <button key={question} type="button" onClick={() => setTab('faq')} className="flex w-full items-center gap-2 p-3 text-left text-xs font-medium text-ink transition hover:bg-surface2">
                    <HelpCircle className="h-3.5 w-3.5 text-primary" /> {question}
                  </button>
                ))}
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'assistant' ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
          <AiChat
            quickPrompts={[
              'How do I invite a client?',
              'Summarise my workspace this month',
              'Which tasks are overdue?',
              'Explain my cash position',
            ]}
            autoFocus
          />
          <div className="space-y-4">
            <Card>
              <CardHeader title="How AI works here" icon={Sparkles} />
              <ul className="space-y-2.5 p-4 text-xs leading-relaxed text-muted">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Answers use your actual records, not fabricated numbers.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Financial answers are restricted to managers and admins.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Nothing is created or sent without your approval.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Falls back to a local rules engine if no AI key is configured.</li>
              </ul>
            </Card>
            <Card>
              <CardHeader title="Escalate to a ticket" subtitle="AI can miss context" icon={LifeBuoy} />
              <div className="p-4">
                <p className="text-xs leading-relaxed text-muted">If the assistant cannot resolve it, create a ticket and include the answer you received.</p>
                <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={() => setCreateOpen(true)}><Plus className="h-3.5 w-3.5" /> New support ticket</Button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {tab === 'faq' ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {FAQS.map(([question, answer]) => (
            <Card key={question} className="p-5">
              <div className="flex items-start gap-2.5">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><HelpCircle className="h-4 w-4" /></span>
                <div>
                  <p className="text-sm font-semibold text-ink">{question}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted">{answer}</p>
                </div>
              </div>
            </Card>
          ))}
          <Card className="p-5 sm:col-span-2">
            <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-semibold text-ink">Still stuck?</p>
                <p className="mt-1 text-xs text-muted">Raise a ticket with your workspace role and the page you were on. Never share passwords.</p>
              </div>
              <Button onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Create ticket</Button>
            </div>
          </Card>
        </div>
      ) : null}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New support ticket" description="Give us enough detail to reproduce or understand the issue.">
        <ResourceForm
          fields={[
            { name: 'subject', label: 'Subject', required: true, span: 2, placeholder: 'Short summary of the issue' },
            { name: 'priority', label: 'Priority', type: 'select', options: PRIORITIES, placeholder: 'Medium' },
            { name: 'status', label: 'Status', type: 'select', options: STATUSES, placeholder: 'Open', disabled: true },
            { name: 'message', label: 'What happened?', type: 'textarea', required: true, span: 2, rows: 5, placeholder: 'Steps to reproduce, what you expected and any error message…' },
          ]}
          defaultValues={{ subject: '', priority: 'medium', status: 'open', message: '' }}
          onSubmit={createTicket}
          onCancel={() => setCreateOpen(false)}
          loading={actions.create.isPending}
          submitLabel="Create ticket"
        />
      </Modal>

      {selected ? <TicketDetail ticket={selected} onClose={() => setSelected(null)} /> : null}
    </div>
  );
}
