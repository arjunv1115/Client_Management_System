import { Link } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Avatar, Badge, Card, CardHeader, Skeleton } from '../ui';

export function BackLink({ to, children = 'Back', className }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink', className)}>
      <ArrowLeft className="h-3.5 w-3.5" /> {children}
    </Link>
  );
}

export function DetailHeader({
  backTo, backLabel, title, subtitle, badges, actions, avatar, meta = [], loading = false,
}) {
  return (
    <div className="mb-6 animate-fade-up">
      {backTo ? <BackLink to={backTo} className="mb-3">{backLabel || 'Back'}</BackLink> : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          {avatar}
          <div className="min-w-0">
            {loading ? (
              <>
                <Skeleton className="h-7 w-56" />
                <Skeleton className="mt-2 h-4 w-72" />
              </>
            ) : (
              <>
                <h1 className="truncate text-2xl font-bold tracking-tight text-ink">{title}</h1>
                {subtitle ? <p className="mt-1 text-sm text-muted">{subtitle}</p> : null}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {badges}
                  {meta.map((item) => (
                    <span key={item.label} className="inline-flex items-center gap-1 text-[11px] text-muted">
                      <span className="font-medium text-ink/70">{item.label}</span> {item.value}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

export function InfoGrid({ items = [], columns = 2, className }) {
  return (
    <dl className={cn('grid gap-x-6 gap-y-4', columns === 3 ? 'sm:grid-cols-2 lg:grid-cols-3' : columns === 1 ? '' : 'sm:grid-cols-2', className)}>
      {items.map((item) => (
        <div key={item.label} className="min-w-0">
          <dt className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">{item.label}</dt>
          <dd className="mt-1 break-words text-sm font-medium text-ink">{item.value ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function MiniStat({ label, value, hint, icon: Icon, tone = 'primary' }) {
  const tones = {
    primary: 'bg-primary-soft text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-info/10 text-info',
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line bg-surface2/40 p-3">
      {Icon ? (
        <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg', tones[tone] || tones.primary)}>
          <Icon className="h-4 w-4" />
        </span>
      ) : null}
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</p>
        <p className="truncate text-sm font-bold text-ink">{value}</p>
        {hint ? <p className="truncate text-[10px] text-muted">{hint}</p> : null}
      </div>
    </div>
  );
}

export function SectionCard({ title, subtitle, icon, action, children, className, padded = true, footer }) {
  return (
    <Card className={className}>
      {title ? <CardHeader title={title} subtitle={subtitle} icon={icon} action={action} /> : null}
      <div className={cn(padded && 'p-4 sm:p-5')}>{children}</div>
      {footer ? <div className="border-t border-line px-4 py-3 sm:px-5">{footer}</div> : null}
    </Card>
  );
}

export function PersonCell({ name, subtitle, avatar_url: avatarUrl, size = 'sm' }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar name={name} src={avatarUrl} size={size} />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-ink">{name || '—'}</p>
        {subtitle ? <p className="truncate text-[10px] text-muted">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function RecordLink({ to, children, className }) {
  return (
    <Link to={to} className={cn('group inline-flex items-center gap-1 font-semibold text-ink transition hover:text-primary', className)}>
      {children}
      <ChevronRight className="h-3.5 w-3.5 opacity-0 transition group-hover:opacity-100" />
    </Link>
  );
}

export function SeverityBadge({ value }) {
  const map = { high: 'danger', medium: 'warning', low: 'info', urgent: 'danger', completed: 'success', paid: 'success' };
  return <Badge tone={map[String(value || '').toLowerCase()] || 'neutral'}>{value || '—'}</Badge>;
}
