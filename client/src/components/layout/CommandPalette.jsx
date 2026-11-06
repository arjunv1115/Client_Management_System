import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Loader2, Search, Sparkles } from 'lucide-react';
import { api, unwrap } from '../../lib/api';
import { useDebounce } from '../../hooks/useDebounce';
import { Modal } from '../ui';
import { cn } from '../../lib/utils';

const quickLinks = [
  { label: 'Create a lead', to: '/leads', hint: 'Sales' },
  { label: 'Review the pipeline', to: '/sales-pipeline', hint: 'Sales' },
  { label: 'Open the task board', to: '/tasks', hint: 'Delivery' },
  { label: 'Record a payment', to: '/payments', hint: 'Finance' },
  { label: 'Ask the AI assistant', to: '/ai', hint: 'AI' },
  { label: 'Manage integrations', to: '/settings/integrations', hint: 'Settings' },
];

export default function CommandPalette({ open, onClose }) {
  const [query, setQuery] = useState('');
  const debounced = useDebounce(query, 250);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    queryFn: async () => unwrap(await api.get('/search', { params: { q: debounced } })),
    enabled: open && debounced.trim().length >= 2,
    staleTime: 30_000,
  });

  const go = (to) => {
    onClose?.();
    navigate(to);
  };

  const groups = data?.groups || [];

  return (
    <Modal open={open} onClose={onClose} title="Search & quick actions" size="lg" className="!max-w-2xl">
      <div className="-mx-5 -mt-5">
        <div className="flex items-center gap-3 border-b border-line px-5">
          <Search className="h-5 w-5 text-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search leads, clients, projects, documents…"
            className="h-14 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted/70"
          />
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin text-muted" /> : null}
          <kbd className="hidden rounded-md border border-line bg-surface2 px-1.5 py-0.5 text-[10px] font-semibold text-muted sm:block">ESC</kbd>
        </div>

        <div className="max-h-[58vh] overflow-y-auto scrollbar-thin p-3">
          {debounced.trim().length < 2 ? (
            <div>
              <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">Quick actions</p>
              <div className="grid gap-1 sm:grid-cols-2">
                {quickLinks.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => go(item.to)}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface2"
                  >
                    <span>
                      <span className="block text-sm font-medium text-ink">{item.label}</span>
                      <span className="text-[11px] text-muted">{item.hint}</span>
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted" />
                  </button>
                ))}
              </div>
            </div>
          ) : groups.length ? (
            groups.map((group) => (
              <div key={group.type} className="mb-2">
                <p className="px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted">{group.module}</p>
                {group.items.map((item) => (
                  <button
                    key={`${group.type}-${item.id}`}
                    type="button"
                    onClick={() => go(item.link)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-surface2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">{item.title}</span>
                      {item.subtitle ? <span className="block truncate text-[11px] text-muted">{item.subtitle}</span> : null}
                    </span>
                    <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted" />
                  </button>
                ))}
              </div>
            ))
          ) : (
            <div className="px-3 py-8 text-center">
              <Sparkles className="mx-auto h-5 w-5 text-muted" />
              <p className="mt-2 text-sm font-medium text-ink">No matching records</p>
              <p className="mt-1 text-xs text-muted">Try a client name, project, task or document.</p>
              <button
                type="button"
                onClick={() => go(`/ai?search=${encodeURIComponent(query)}`)}
                className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                <Sparkles className="h-3.5 w-3.5" /> Ask AI to find it
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between border-t border-line px-5 py-2.5 text-[11px] text-muted">
          <span>Search runs against records you are allowed to see.</span>
          <span className="hidden sm:block"><kbd className="rounded border border-line bg-surface2 px-1.5 py-0.5 font-sans">Ctrl</kbd> + <kbd className="rounded border border-line bg-surface2 px-1.5 py-0.5 font-sans">K</kbd></span>
        </div>
      </div>
    </Modal>
  );
}
