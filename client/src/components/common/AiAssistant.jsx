import { useState } from 'react';
import { Check, Copy, Sparkles, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../lib/api';
import { Badge, Button, Card, CardHeader, Spinner } from '../ui';
import { cn } from '../../lib/utils';

export function AiButton({ children = 'Generate with AI', loading = false, className, ...props }) {
  return (
    <Button variant="soft" size="sm" loading={loading} className={cn(className)} {...props}>
      {!loading ? <Sparkles className="h-3.5 w-3.5" /> : null}
      {children}
    </Button>
  );
}

export function AiResult({
  result,
  loading = false,
  error,
  onRetry,
  onUse,
  useLabel = 'Use suggestion',
  feature = 'business_assistant',
  entity = null,
  entityId = null,
  compact = false,
  children,
}) {
  const [accepted, setAccepted] = useState(false);
  const [copied, setCopied] = useState(false);

  const accept = async () => {
    try {
      await api.post('/ai/suggestions/accept', {
        feature, entity, entity_id: entityId, content: result?.content || '',
      });
      setAccepted(true);
      toast.success('Suggestion approved and logged.');
      onUse?.(result);
    } catch (err) {
      toast.error(err.message || 'Could not log this suggestion.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result?.content || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-line bg-surface2/60 px-4 py-6 text-sm text-muted">
        <Spinner /> Generating a reviewable suggestion…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-4 text-sm">
        <p className="font-semibold text-danger">The assistant could not complete this request.</p>
        <p className="mt-1 text-muted">{error.message}</p>
        {onRetry ? <Button size="sm" variant="secondary" className="mt-3" onClick={onRetry}>Try again</Button> : null}
      </div>
    );
  }

  if (!result) return children || null;

  return (
    <div className={cn('rounded-xl border border-primary/20 bg-primary-soft/35 p-4', compact && 'p-3')}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="grid h-6 w-6 place-items-center rounded-lg bg-primary/15 text-primary">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <span className="text-xs font-semibold text-ink">{result.label || 'AI suggestion'}</span>
        <Badge tone={result.provider === 'ai' ? 'primary' : 'info'}>{result.provider === 'ai' ? 'Live AI' : 'Local rules'}</Badge>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={copy} className="icon-btn h-7 w-7" aria-label="Copy suggestion">
            {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button type="button" onClick={accept} className="icon-btn h-7 w-7" aria-label="Approve suggestion">
            <Wand2 className={cn('h-3.5 w-3.5', accepted && 'text-success')} />
          </button>
        </div>
      </div>
      <div className="max-h-[420px] overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-ink scrollbar-thin">
        {result.content}
      </div>
      {result.notice ? <p className="mt-2 text-[11px] text-warning">{result.notice}</p> : null}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-primary/10 pt-3">
        <p className="text-[11px] text-muted">{result.disclaimer || 'AI output is a suggestion. Review before acting.'}</p>
        <Button size="sm" variant={accepted ? 'secondary' : 'primary'} onClick={accept} disabled={accepted}>
          {accepted ? <Check className="h-3.5 w-3.5" /> : <Wand2 className="h-3.5 w-3.5" />}
          {accepted ? 'Approved' : useLabel}
        </Button>
      </div>
    </div>
  );
}

export function AiCard({ title = 'AI assistant', subtitle, action, children, className, icon = Sparkles }) {
  return (
    <Card className={cn('overflow-hidden border-primary/20', className)}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} action={action} />
      <div className="p-4 sm:p-5">{children}</div>
    </Card>
  );
}
