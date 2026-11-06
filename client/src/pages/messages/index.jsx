import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft, CheckCheck, MessageSquare, MessageSquarePlus, Search, Send, Users,
} from 'lucide-react';
import {
  Avatar, Badge, Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, Select, Spinner, Textarea,
} from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { useLookups } from '../../lib/lookups';
import { useAuth } from '../../contexts/AuthContext';
import { api, unwrap } from '../../lib/api';
import { cn, formatDateTime, timeAgo, titleCase } from '../../lib/utils';

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'clients', label: 'Clients' },
  { value: 'team', label: 'Team' },
  { value: 'groups', label: 'Groups' },
];

const TYPE_TONE = { client: 'info', team: 'primary', group: 'warning', direct: 'neutral' };
const CONVERSATION_TYPES = [
  { value: 'client', label: 'Client conversation' },
  { value: 'team', label: 'Team channel' },
  { value: 'group', label: 'Group' },
  { value: 'direct', label: 'Direct message' },
];

function ConversationItem({ conversation, active, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(conversation.id)}
      className={cn(
        'flex w-full items-start gap-3 border-b border-line px-3.5 py-3 text-left transition last:border-0',
        active ? 'bg-primary-soft/60' : 'hover:bg-surface2/70',
      )}
    >
      <span className="relative mt-0.5">
        <Avatar name={conversation.name} size="md" />
        {conversation.members?.some((member) => member.online) ? (
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-surface" />
        ) : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-xs font-semibold text-ink">{conversation.name}</span>
          <span className="ml-auto shrink-0 text-[10px] text-muted">{timeAgo(conversation.last_message?.created_at || conversation.last_message_at)}</span>
        </span>
        <span className="mt-1 flex items-center gap-2">
          <span className="line-clamp-1 flex-1 text-[11px] text-muted">
            {conversation.last_message
              ? `${conversation.last_message.sender_name?.split(' ')[0] || ''}: ${conversation.last_message.body}`
              : 'No messages yet'}
          </span>
          {conversation.unread ? (
            <span className="grid h-4 min-w-4 shrink-0 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
              {conversation.unread > 9 ? '9+' : conversation.unread}
            </span>
          ) : null}
        </span>
        <span className="mt-1 flex items-center gap-1.5">
          <Badge tone={TYPE_TONE[conversation.type] || 'neutral'} className="px-1.5 py-0 text-[9px]">{titleCase(conversation.type)}</Badge>
          <span className="truncate text-[10px] text-muted">{conversation.members?.length || 0} members</span>
        </span>
      </span>
    </button>
  );
}

function NewConversationModal({ open, onClose, onCreated }) {
  const { options } = useLookups();
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ name: '', type: 'team', client_id: '', member_ids: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setValues({ name: '', type: 'team', client_id: '', member_ids: [] });
  }, [open]);

  const toggleMember = (id) => {
    setValues((current) => ({
      ...current,
      member_ids: current.member_ids.includes(id)
        ? current.member_ids.filter((item) => item !== id)
        : [...current.member_ids, id],
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!values.name.trim()) return toast.error('Add a conversation name.');
    setSaving(true);
    try {
      const response = await api.post('/messages/conversations', {
        ...values,
        client_id: values.client_id || null,
        member_ids: values.member_ids,
      });
      const conversation = unwrap(response);
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
      toast.success('Conversation created.');
      onCreated?.(conversation);
      onClose();
    } catch (error) {
      toast.error(error.message || 'Could not create this conversation.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New conversation"
      description="Start a client, team or group conversation."
      size="md"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={submit}><MessageSquarePlus className="h-4 w-4" /> Create conversation</Button>
        </>
      )}
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="Conversation name"
          required
          value={values.name}
          onChange={(event) => setValues((current) => ({ ...current, name: event.target.value }))}
          placeholder="Acme redesign updates"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Type"
            value={values.type}
            onChange={(event) => setValues((current) => ({ ...current, type: event.target.value }))}
            options={CONVERSATION_TYPES}
          />
          <Select
            label="Client (optional)"
            value={values.client_id}
            onChange={(event) => setValues((current) => ({ ...current, client_id: event.target.value }))}
            placeholder="No client linked"
            options={(options.clients || []).map((client) => ({ value: client.id, label: client.label || client.name }))}
          />
        </div>
        <div>
          <p className="label">Members</p>
          <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-line p-2 scrollbar-thin">
            {(options.profiles || []).map((profile) => (
              <label key={profile.id} className="flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm text-ink hover:bg-surface2">
                <input
                  type="checkbox"
                  className="checkbox"
                  checked={values.member_ids.includes(profile.id)}
                  onChange={() => toggleMember(profile.id)}
                />
                <Avatar name={profile.name} src={profile.avatar_url} size="xs" />
                <span className="flex-1 truncate">{profile.name}</span>
                <span className="text-[10px] uppercase tracking-wide text-muted">{profile.role?.replace('_', ' ')}</span>
              </label>
            ))}
          </div>
          <p className="mt-1 text-[11px] text-muted">You are added automatically. Clients can only access conversations they are members of.</p>
        </div>
      </form>
    </Modal>
  );
}

export default function MessagesPage() {
  const { user } = useAuth();
  const { options } = useLookups();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeId, setActiveId] = useState(() => searchParams.get('conversation') || '');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [body, setBody] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [showList, setShowList] = useState(true);
  const typingRef = useRef(0);
  const markedRef = useRef('');

  const conversationsQuery = useQuery({
    queryKey: ['messages', 'conversations', filter, debouncedSearch],
    queryFn: async () => {
      const response = await api.get('/messages/conversations', {
        params: { filter, q: debouncedSearch || undefined },
      });
      return { items: response.data?.data || [], unread: response.data?.unread || 0 };
    },
    refetchInterval: 10_000,
  });

  const conversations = conversationsQuery.data?.items || [];

  useEffect(() => {
    if (!conversations.length) return;
    if (!activeId || !conversations.some((conversation) => conversation.id === activeId)) {
      setActiveId(conversations[0].id);
    }
  }, [conversations, activeId]);

  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    if (activeId) next.set('conversation', activeId);
    else next.delete('conversation');
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId]);

  const activeConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === activeId) || null,
    [conversations, activeId],
  );

  const messagesQuery = useQuery({
    queryKey: ['messages', 'thread', activeId],
    queryFn: async () => {
      const response = await api.get('/messages/messages', { params: { conversation_id: activeId } });
      return response.data?.data || [];
    },
    enabled: Boolean(activeId),
    refetchInterval: 5_000,
  });

  const messages = messagesQuery.data || [];

  useEffect(() => {
    if (!activeId || !messages.length) return;
    const stamp = `${activeId}:${messages.length}:${messages[messages.length - 1]?.id}`;
    if (markedRef.current === stamp) return;
    markedRef.current = stamp;
    api.post(`/messages/conversations/${activeId}/read`)
      .then(() => queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] }))
      .catch(() => {});
  }, [activeId, messages, queryClient]);

  useEffect(() => {
    const ping = () => api.post('/messages/presence/ping').catch(() => {});
    ping();
    const timer = setInterval(ping, 45_000);
    return () => clearInterval(timer);
  }, []);

  const sendMessage = useMutation({
    mutationFn: async () => {
      const response = await api.post('/messages/messages', { conversation_id: activeId, body });
      return unwrap(response);
    },
    onSuccess: () => {
      setBody('');
      messagesQuery.refetch();
      queryClient.invalidateQueries({ queryKey: ['messages', 'conversations'] });
    },
    onError: (error) => toast.error(error.message || 'Could not send this message.'),
  });

  const onBodyChange = (value) => {
    setBody(value);
    const now = Date.now();
    if (activeId && now - typingRef.current > 2500) {
      typingRef.current = now;
      api.post(`/messages/conversations/${activeId}/typing`).catch(() => {});
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (!body.trim()) return;
    sendMessage.mutate();
  };

  const selectConversation = (id) => {
    setActiveId(id);
    setShowList(false);
  };

  const unread = conversationsQuery.data?.unread || 0;

  return (
    <div className="animate-fade-up">
      <PageHeader
        eyebrow="Delivery"
        title="Messages"
        subtitle="Client conversations, team channels and campaign groups in one inbox."
        actions={(
          <>
            <Badge tone={unread ? 'primary' : 'neutral'} dot>{unread} unread</Badge>
            <Button onClick={() => setCreateOpen(true)}><MessageSquarePlus className="h-4 w-4" /> New conversation</Button>
          </>
        )}
      />

      <Card className="overflow-hidden">
        <div className="grid min-h-[620px] grid-cols-1 md:grid-cols-[320px_minmax(0,1fr)]">
          <aside className={cn('border-line md:block md:border-r', showList ? 'block' : 'hidden')}>
            <div className="space-y-3 border-b border-line p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations…"
                  className="input h-9 pl-9 text-xs"
                />
              </div>
              <div className="flex flex-wrap gap-1">
                {FILTERS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFilter(item.value)}
                    className={cn(
                      'rounded-lg px-2.5 py-1 text-[11px] font-semibold transition',
                      filter === item.value ? 'bg-primary text-white' : 'bg-surface2 text-muted hover:text-ink',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[540px] overflow-y-auto scrollbar-thin">
              {conversationsQuery.isLoading ? (
                <div className="grid place-items-center py-16"><Spinner className="h-5 w-5" /></div>
              ) : conversationsQuery.isError ? (
                <ErrorState message={conversationsQuery.error?.message} onRetry={conversationsQuery.refetch} />
              ) : conversations.length ? (
                conversations.map((conversation) => (
                  <ConversationItem
                    key={conversation.id}
                    conversation={conversation}
                    active={conversation.id === activeId}
                    onSelect={selectConversation}
                  />
                ))
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="No conversations"
                  description="Start a conversation with a client or your team."
                  action={<Button size="sm" variant="secondary" onClick={() => setCreateOpen(true)}>New conversation</Button>}
                />
              )}
            </div>
          </aside>

          <section className={cn('flex min-h-[620px] flex-col', showList ? 'hidden md:flex' : 'flex')}>
            {activeConversation ? (
              <>
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <button type="button" className="icon-btn md:hidden" onClick={() => setShowList(true)} aria-label="Back to conversations">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <Avatar name={activeConversation.name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{activeConversation.name}</p>
                    <p className="truncate text-[11px] text-muted">
                      {activeConversation.type === 'client' ? 'Client conversation' : `${activeConversation.members?.length || 0} members`}
                      {activeConversation.members?.some((member) => member.online) ? ' · someone is online' : ''}
                    </p>
                  </div>
                  <Badge tone={TYPE_TONE[activeConversation.type] || 'neutral'}>{titleCase(activeConversation.type)}</Badge>
                </div>

                {activeConversation.typing?.length ? (
                  <p className="border-b border-line bg-primary-soft/30 px-4 py-1.5 text-[11px] font-medium text-primary">
                    {activeConversation.typing.join(', ')} {activeConversation.typing.length > 1 ? 'are' : 'is'} typing…
                  </p>
                ) : null}

                <div className="flex-1 space-y-3 overflow-y-auto bg-canvas/40 p-4 scrollbar-thin" style={{ maxHeight: '520px' }}>
                  {messagesQuery.isLoading ? (
                    <div className="grid place-items-center py-10"><Spinner className="h-5 w-5" /></div>
                  ) : messages.length ? (
                    messages.map((message) => {
                      const own = message.sender_id === user?.id;
                      return (
                        <div key={message.id} className={cn('flex items-end gap-2', own && 'flex-row-reverse')}>
                          {!own ? <Avatar name={message.sender_name} size="xs" /> : null}
                          <div className={cn('max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-soft', own ? 'bg-primary text-white' : 'border border-line bg-surface text-ink')}>
                            {!own ? <p className="mb-0.5 text-[10px] font-semibold text-primary">{message.sender_name}</p> : null}
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{message.body}</p>
                            <p className={cn('mt-1 flex items-center justify-end gap-1 text-[9px]', own ? 'text-white/70' : 'text-muted')}>
                              {formatDateTime(message.created_at)}
                              {own ? <CheckCheck className={cn('h-3 w-3', (message.read_by || []).length > 1 ? 'text-white' : 'text-white/50')} /> : null}
                              {message.edited_at ? ' · edited' : ''}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <EmptyState
                      icon={MessageSquare}
                      title="No messages yet"
                      description={`Say hello to ${activeConversation.name}. Messages are visible to conversation members only.`}
                    />
                  )}
                </div>

                <form onSubmit={submit} className="border-t border-line p-3">
                  <div className="flex items-end gap-2">
                    <Textarea
                      rows={1}
                      value={body}
                      onChange={(event) => onBodyChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault();
                          submit(event);
                        }
                      }}
                      placeholder="Write a message… (Enter to send, Shift+Enter for a new line)"
                      className="min-h-[42px] resize-none"
                    />
                    <Button type="submit" loading={sendMessage.isPending} disabled={!body.trim()} className="h-[42px] shrink-0 px-4">
                      <Send className="h-4 w-4" /> Send
                    </Button>
                  </div>
                  <p className="mt-1.5 text-[10px] text-muted">Messages poll every 5 seconds. Typing and presence indicators are shared with your team.</p>
                </form>
              </>
            ) : (
              <div className="grid flex-1 place-items-center p-6">
                <EmptyState
                  icon={MessageSquare}
                  title="Select a conversation"
                  description="Choose a conversation from the list, or start a new one."
                  action={(
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" className="md:hidden" onClick={() => setShowList(true)}>View conversations</Button>
                      <Button size="sm" onClick={() => setCreateOpen(true)}><MessageSquarePlus className="h-3.5 w-3.5" /> New conversation</Button>
                    </div>
                  )}
                />
              </div>
            )}
          </section>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Conversations</p><p className="mt-1 text-xl font-bold text-ink">{conversations.length}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Unread messages</p><p className="mt-1 text-xl font-bold text-ink">{unread}</p></Card>
        <Card className="p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-muted">Online teammates</p><p className="mt-1 text-xl font-bold text-ink">{activeConversation?.members?.filter((member) => member.online).length ?? 0}</p></Card>
      </div>

      <NewConversationModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(conversation) => { setActiveId(conversation.id); setShowList(false); }}
      />
    </div>
  );
}
