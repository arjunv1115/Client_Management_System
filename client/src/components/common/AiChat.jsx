import { useEffect, useRef, useState } from 'react';
import { Bot, Check, Copy, Send, Sparkles, User } from 'lucide-react';
import { toast } from 'sonner';
import { api, unwrap } from '../../lib/api';
import { cn, timeAgo } from '../../lib/utils';
import { Badge, Button, Spinner } from '../ui';

const DEFAULT_WELCOME = 'Hi! I can summarise your workspace, draft follow-ups, explain your pipeline and surface risks. I only ever suggest — you approve anything that gets saved.';

/**
 * Reusable business assistant chat. Conversations are always scoped by the
 * server to the signed-in user; the component never sends a role or org id.
 */
export default function AiChat({
  conversationId = null,
  onConversationChange,
  onMessageSent,
  quickPrompts = [],
  welcome = DEFAULT_WELCOME,
  className,
  bodyClassName = 'min-h-[360px] max-h-[52vh]',
  autoFocus = false,
}) {
  const [messages, setMessages] = useState([{ id: 'welcome', role: 'assistant', content: welcome, local: true }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [approved, setApproved] = useState({});
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    if (!conversationId) {
      setMessages([{ id: 'welcome', role: 'assistant', content: welcome, local: true }]);
      return () => { cancelled = true; };
    }
    setLoadingConversation(true);
    api.get(`/ai/conversations/${conversationId}`)
      .then((response) => {
        if (cancelled) return;
        const payload = unwrap(response) || {};
        const rows = payload.messages || [];
        setMessages(rows.length ? rows.map((row) => ({ ...row, provider: 'ai' })) : [{ id: 'empty', role: 'assistant', content: welcome, local: true }]);
      })
      .catch((error) => {
        if (!cancelled) toast.error(error.message || 'Could not open this conversation.');
      })
      .finally(() => { if (!cancelled) setLoadingConversation(false); });
    return () => { cancelled = true; };
  }, [conversationId, welcome]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, sending]);

  const send = async (textOverride) => {
    const text = String(textOverride ?? input).trim();
    if (!text || sending) return;
    setInput('');
    setMessages((current) => [...current, { id: `local_${Date.now()}`, role: 'user', content: text, local: true }]);
    setSending(true);
    try {
      const response = await api.post('/ai/chat', { message: text, conversationId: conversationId || undefined });
      const payload = unwrap(response);
      setMessages((current) => [...current, {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: payload?.content || 'No response was returned.',
        provider: payload?.provider,
        label: payload?.label,
        disclaimer: payload?.disclaimer,
      }]);
      if (payload?.conversationId && payload.conversationId !== conversationId) {
        onConversationChange?.(payload.conversationId);
      }
      onMessageSent?.(payload);
    } catch (error) {
      toast.error(error.message || 'The assistant could not answer right now.');
      setMessages((current) => [...current, {
        id: `error_${Date.now()}`,
        role: 'assistant',
        content: error.message || 'The assistant could not answer right now. Try again.',
        error: true,
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const approve = async (message) => {
    try {
      await api.post('/ai/suggestions/accept', {
        feature: 'business_assistant', content: message.content,
      });
      setApproved((current) => ({ ...current, [message.id]: true }));
      toast.success('Suggestion approved and logged for audit.');
    } catch (error) {
      toast.error(error.message || 'Could not log this approval.');
    }
  };

  const copy = async (message) => {
    try {
      await navigator.clipboard.writeText(message.content || '');
      toast.success('Copied to clipboard.');
    } catch {
      toast.error('Clipboard is not available in this browser.');
    }
  };

  return (
    <div className={cn('flex flex-col overflow-hidden rounded-2xl border border-line bg-surface', className)}>
      <div className="flex items-center gap-2 border-b border-line bg-surface2/40 px-4 py-3">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">Business assistant</p>
          <p className="text-[11px] text-muted">Drafts only · human approval required</p>
        </div>
        <Badge tone="primary">AI</Badge>
      </div>

      <div className={cn('flex-1 space-y-3 overflow-y-auto scrollbar-thin p-4', bodyClassName)}>
        {loadingConversation ? (
          <div className="grid h-full place-items-center"><Spinner className="h-5 w-5 text-primary" /></div>
        ) : messages.map((message) => {
          const isUser = message.role === 'user';
          return (
            <div key={message.id} className={cn('flex gap-2.5', isUser ? 'justify-end' : 'justify-start')}>
              {!isUser ? (
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                  <Bot className="h-3.5 w-3.5" />
                </span>
              ) : null}
              <div className={cn('max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed', isUser ? 'bg-primary text-white' : message.error ? 'border border-danger/30 bg-danger/5 text-ink' : 'border border-line bg-surface2/60 text-ink')}>
                <div className="whitespace-pre-wrap break-words">{message.content}</div>
                {!isUser && !message.local ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-line/70 pt-2">
                    <Badge tone={message.provider === 'ai' ? 'primary' : 'info'}>{message.provider === 'ai' ? 'Live AI' : 'Local rules'}</Badge>
                    <span className="text-[10px] text-muted">{timeAgo(message.created_at)}</span>
                    <button type="button" onClick={() => copy(message)} className="ml-auto rounded-md p-1 text-muted transition hover:bg-surface hover:text-ink" aria-label="Copy answer">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => approve(message)}
                      disabled={approved[message.id]}
                      className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold transition', approved[message.id] ? 'text-success' : 'text-primary hover:bg-primary-soft')}
                    >
                      <Check className="h-3 w-3" /> {approved[message.id] ? 'Approved' : 'Approve'}
                    </button>
                  </div>
                ) : null}
              </div>
              {isUser ? (
                <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-surface2 text-muted">
                  <User className="h-3.5 w-3.5" />
                </span>
              ) : null}
            </div>
          );
        })}
        {sending ? (
          <div className="flex items-center gap-2 text-xs text-muted">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary-soft text-primary"><Bot className="h-3.5 w-3.5" /></span>
            <span className="inline-flex items-center gap-1.5 rounded-2xl border border-line bg-surface2/60 px-3 py-2">
              <span className="flex gap-1">
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
              </span>
              Thinking with your workspace data…
            </span>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>

      {messages.length <= 1 && quickPrompts.length ? (
        <div className="flex flex-wrap gap-1.5 border-t border-line px-4 py-3">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => send(prompt)}
              className="rounded-full border border-line bg-surface2/70 px-2.5 py-1 text-[11px] font-medium text-muted transition hover:border-primary/30 hover:text-primary"
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}

      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            autoFocus={autoFocus}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="Ask about revenue, leads, delivery or draft a follow-up…"
            className="textarea min-h-[44px] flex-1 resize-none py-2.5 text-sm"
            aria-label="Message the business assistant"
          />
          <Button onClick={() => send()} disabled={!input.trim() || sending} className="h-11 shrink-0">
            {sending ? <Spinner /> : <Send className="h-4 w-4" />} Send
          </Button>
        </div>
        <p className="mt-2 text-[10px] text-muted">AI responses use only your records in this workspace. Never acts without approval.</p>
      </div>
    </div>
  );
}
