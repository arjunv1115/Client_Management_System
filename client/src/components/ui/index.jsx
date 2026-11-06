import { forwardRef, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, Check, ChevronDown, ChevronLeft, ChevronRight,
  Copy, Inbox, Loader2, RefreshCw, Search, X,
} from 'lucide-react';
import { cn, initials } from '../../lib/utils';

/* ------------------------------------------------------------------ buttons */
const variants = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
  soft: 'btn-soft',
};
const sizes = { sm: 'btn-sm', md: 'btn-md', lg: 'btn-lg' };

export const buttonStyles = ({ variant = 'primary', size = 'md', className } = {}) =>
  cn(variants[variant] || variants.primary, sizes[size] || sizes.md, className);

export const Button = forwardRef(({
  variant = 'primary', size = 'md', className, loading = false, children, disabled, ...props
}, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={buttonStyles({ variant, size, className })}
    {...props}
  >
    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
    {children}
  </button>
));
Button.displayName = 'Button';

export function IconButton({ label, className, children, ...props }) {
  return (
    <button type="button" aria-label={label} title={label} className={cn('icon-btn', className)} {...props}>
      {children}
    </button>
  );
}

export function Spinner({ className }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />;
}

/* ------------------------------------------------------------------ surfaces */
export function Card({ className, children, hover = false, ...props }) {
  return <div className={cn('card', hover && 'card-hover', className)} {...props}>{children}</div>;
}

export function CardHeader({ title, subtitle, action, className, icon: Icon }) {
  return (
    <div className={cn('flex items-start justify-between gap-4 border-b border-line px-5 py-4', className)}>
      <div className="flex min-w-0 items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-ink">{title}</h3>
          {subtitle ? <p className="mt-0.5 text-xs text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, eyebrow }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-primary">{eyebrow}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[28px]">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ badges */
export function Badge({ tone = 'neutral', children, className, dot = false, ...props }) {
  const tones = {
    neutral: 'badge-neutral', primary: 'badge-primary', success: 'badge-success',
    warning: 'badge-warning', danger: 'badge-danger', info: 'badge-info',
  };
  const dots = {
    success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger',
    info: 'bg-info', primary: 'bg-primary', neutral: 'bg-muted',
  };
  return (
    <span className={cn(tones[tone] || tones.neutral, className)} {...props}>
      {dot ? <span className={cn('h-1.5 w-1.5 rounded-full', dots[tone] || dots.neutral)} /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ avatar */
export function Avatar({ name, src, size = 'md', className, status }) {
  const sizeClass = { xs: 'h-6 w-6 text-[10px]', sm: 'h-8 w-8 text-xs', md: 'h-10 w-10 text-sm', lg: 'h-12 w-12 text-base', xl: 'h-16 w-16 text-xl' }[size];
  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      {src ? (
        <img src={src} alt={name || 'Avatar'} className={cn('rounded-full object-cover', sizeClass)} />
      ) : (
        <span className={cn('grid place-items-center rounded-full bg-gradient-to-br from-primary to-violet-500 font-semibold text-white', sizeClass)}>
          {initials(name)}
        </span>
      )}
      {status ? (
        <span className={cn(
          'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface',
          status === 'online' ? 'bg-success' : 'bg-muted',
        )} />
      ) : null}
    </span>
  );
}

export function AvatarGroup({ users = [], max = 4, size = 'sm' }) {
  const visible = users.slice(0, max);
  return (
    <div className="flex items-center -space-x-2">
      {visible.map((user) => (
        <Avatar key={user.id || user.name} name={user.name} src={user.avatar_url} size={size} className="ring-2 ring-surface" />
      ))}
      {users.length > max ? (
        <span className="grid h-8 w-8 place-items-center rounded-full bg-surface2 text-[10px] font-semibold text-muted ring-2 ring-surface">
          +{users.length - max}
        </span>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ progress */
export function Progress({ value = 0, className, tone = 'primary', showLabel = false }) {
  const tones = { primary: 'bg-primary', success: 'bg-success', warning: 'bg-warning', danger: 'bg-danger' };
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface2">
        <div
          className={cn('h-full rounded-full transition-all duration-500', tones[tone] || tones.primary)}
          style={{ width: `${Math.max(0, Math.min(100, Number(value)))}%` }}
        />
      </div>
      {showLabel ? <span className="w-9 shrink-0 text-right text-[11px] font-medium text-muted">{Math.round(value)}%</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ fields */
export function Field({ label, error, help, required, children, className, htmlFor }) {
  return (
    <div className={className}>
      {label ? (
        <label className="label" htmlFor={htmlFor}>
          {label}{required ? <span className="ml-0.5 text-danger">*</span> : null}
        </label>
      ) : null}
      {children}
      {error ? <p className="mt-1 text-xs font-medium text-danger">{error}</p> : null}
      {!error && help ? <p className="mt-1 text-xs text-muted">{help}</p> : null}
    </div>
  );
}

export const Input = forwardRef(({ label, error, help, className, id, prefix, suffix, ...props }, ref) => {
  const generated = useId();
  const inputId = id || generated;
  return (
    <Field label={label} error={error} help={help} htmlFor={inputId}>
      <div className="relative">
        {prefix ? <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">{prefix}</span> : null}
        <input ref={ref} id={inputId} className={cn('input', prefix && 'pl-8', suffix && 'pr-10', error && 'border-danger/60', className)} {...props} />
        {suffix ? <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted">{suffix}</span> : null}
      </div>
    </Field>
  );
});
Input.displayName = 'Input';

export const Textarea = forwardRef(({ label, error, help, className, id, ...props }, ref) => {
  const generated = useId();
  const inputId = id || generated;
  return (
    <Field label={label} error={error} help={help} htmlFor={inputId}>
      <textarea ref={ref} id={inputId} className={cn('textarea', error && 'border-danger/60', className)} {...props} />
    </Field>
  );
});
Textarea.displayName = 'Textarea';

export const Select = forwardRef(({ label, error, help, className, id, options = [], placeholder, children, ...props }, ref) => {
  const generated = useId();
  const inputId = id || generated;
  return (
    <Field label={label} error={error} help={help} htmlFor={inputId}>
      <div className="relative">
        <select ref={ref} id={inputId} className={cn('select', error && 'border-danger/60', className)} {...props}>
          {placeholder ? <option value="">{placeholder}</option> : null}
          {options.map((option) => {
            const value = typeof option === 'string' ? option : option.value;
            const optionLabel = typeof option === 'string' ? option : option.label;
            return <option key={value} value={value}>{optionLabel}</option>;
          })}
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      </div>
    </Field>
  );
});
Select.displayName = 'Select';

export function Checkbox({ label, className, id, ...props }) {
  const generated = useId();
  const inputId = id || generated;
  return (
    <label htmlFor={inputId} className={cn('flex cursor-pointer items-center gap-2.5 text-sm text-ink', className)}>
      <input id={inputId} type="checkbox" className="checkbox" {...props} />
      {label}
    </label>
  );
}

export function Switch({ checked, onChange, label, description, disabled = false }) {
  return (
    <label className={cn('flex cursor-pointer items-start justify-between gap-4', disabled && 'cursor-not-allowed opacity-60')}>
      <span>
        {label ? <span className="block text-sm font-medium text-ink">{label}</span> : null}
        {description ? <span className="mt-0.5 block text-xs text-muted">{description}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(checked)}
        disabled={disabled}
        onClick={() => onChange?.(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200',
          checked ? 'bg-primary' : 'bg-line',
        )}
      >
        <span className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )} />
      </button>
    </label>
  );
}

/* ------------------------------------------------------------------ modal */
export function Modal({ open, onClose, title, description, children, footer, size = 'md', className }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;
  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl', full: 'max-w-7xl' };

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn('relative z-10 my-auto w-full animate-scale-in rounded-2xl border border-line bg-surface shadow-float', widths[size], className)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            {description ? <p className="mt-0.5 text-sm text-muted">{description}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>
        <div className="max-h-[72vh] overflow-y-auto scrollbar-thin px-5 py-5">{children}</div>
        {footer ? <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface2/50 px-5 py-3.5">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, title, children, footer, side = 'right', width = 'w-full max-w-md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[120] flex">
      <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} aria-hidden="true" />
      <div className={cn(
        'relative z-10 flex h-full flex-col border-line bg-surface shadow-float',
        side === 'right' ? 'ml-auto border-l' : 'mr-auto border-r',
        width,
      )}>
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-base font-semibold text-ink">{title}</h2>
          <IconButton label="Close" onClick={onClose}><X className="h-4 w-4" /></IconButton>
        </div>
        <div className="flex-1 overflow-y-auto scrollbar-thin p-5">{children}</div>
        {footer ? <div className="border-t border-line p-4">{footer}</div> : null}
      </div>
    </div>,
    document.body,
  );
}

/* ------------------------------------------------------------------ dropdown */
export function Dropdown({ trigger, children, align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, []);
  return (
    <div ref={ref} className={cn('relative inline-flex', className)}>
      <span onClick={() => setOpen((value) => !value)}>{trigger}</span>
      {open ? (
        <div className={cn(
          'absolute top-full z-50 mt-2 min-w-[190px] animate-scale-in rounded-xl border border-line bg-surface p-1.5 shadow-float',
          align === 'right' ? 'right-0' : 'left-0',
        )}>
          <div onClick={() => setOpen(false)}>{children}</div>
        </div>
      ) : null}
    </div>
  );
}

export function DropdownItem({ icon: Icon, children, danger = false, className, ...props }) {
  return (
    <button
      type="button"
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium transition',
        danger ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-surface2',
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0 opacity-80" /> : null}
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ tabs */
export function Tabs({ items, value, onChange, className, variant = 'pill' }) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex gap-1 overflow-x-auto border-b border-line no-scrollbar', className)}>
        {items.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              'relative whitespace-nowrap px-3 py-3 text-sm font-medium transition',
              value === item.value ? 'text-primary' : 'text-muted hover:text-ink',
            )}
          >
            {item.icon ? <item.icon className="mr-1.5 inline h-4 w-4" /> : null}
            {item.label}
            {item.count != null ? <span className="ml-1.5 rounded-full bg-surface2 px-1.5 py-0.5 text-[10px]">{item.count}</span> : null}
            {value === item.value ? <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" /> : null}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={cn('inline-flex flex-wrap gap-1 rounded-xl border border-line bg-surface p-1', className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition',
            value === item.value ? 'bg-primary text-white shadow-sm' : 'text-muted hover:bg-surface2 hover:text-ink',
          )}
        >
          {item.icon ? <item.icon className="h-3.5 w-3.5" /> : null}
          {item.label}
          {item.count != null ? <span className={cn('rounded-full px-1.5 text-[10px]', value === item.value ? 'bg-white/20' : 'bg-surface2')}>{item.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ search */
export function SearchInput({ value, onChange, placeholder = 'Search…', className, onClear }) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input
        value={value}
        onChange={(event) => onChange?.(event.target.value)}
        placeholder={placeholder}
        className="input pl-9 pr-9"
      />
      {value ? (
        <button type="button" aria-label="Clear search" onClick={() => (onClear ? onClear() : onChange?.(''))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-muted hover:bg-surface2 hover:text-ink">
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ states */
export function Skeleton({ className }) {
  return <div className={cn('skeleton', className)} />;
}

export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: cols }).map((_, col) => <Skeleton key={col} className="h-7" />)}
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title = 'Nothing here yet', description, action, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-surface2 text-muted">
        <Icon className="h-6 w-6" />
      </span>
      <h3 className="text-sm font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message = 'We could not load this data.', onRetry, className }) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-6 py-14 text-center', className)}>
      <span className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h3 className="text-sm font-semibold text-ink">Something went wrong</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">{message}</p>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </Button>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ pagination */
export function Pagination({ pagination, onPageChange, className }) {
  if (!pagination || pagination.total === 0) return null;
  const { page = 1, totalPages = 1, total = 0, limit = 10 } = pagination;
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);
  const pages = [];
  const from = Math.max(1, page - 1);
  const to = Math.min(totalPages, page + 1);
  for (let index = from; index <= to; index += 1) pages.push(index);
  if (from > 1) pages.unshift(1);
  if (to < totalPages) pages.push(totalPages);

  return (
    <div className={cn('flex flex-col gap-3 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between', className)}>
      <p className="text-xs text-muted">Showing <span className="font-semibold text-ink">{start}–{end}</span> of <span className="font-semibold text-ink">{total}</span></p>
      <div className="flex items-center gap-1">
        <IconButton label="Previous page" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" />
        </IconButton>
        {pages.map((item, index) => {
          const previous = pages[index - 1];
          return (
            <span key={item} className="flex items-center gap-1">
              {previous && item - previous > 1 ? <span className="px-1 text-xs text-muted">…</span> : null}
              <button
                type="button"
                onClick={() => onPageChange(item)}
                className={cn(
                  'grid h-8 min-w-8 place-items-center rounded-lg px-2 text-xs font-semibold transition',
                  item === page ? 'bg-primary text-white' : 'text-muted hover:bg-surface2 hover:text-ink',
                )}
              >
                {item}
              </button>
            </span>
          );
        })}
        <IconButton label="Next page" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="disabled:opacity-40">
          <ChevronRight className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ stat card */
export function StatCard({
  label, value, icon: Icon, delta, hint, tone = 'primary', loading = false, action, className,
}) {
  const up = Number(delta) >= 0;
  const iconTones = {
    primary: 'bg-primary-soft text-primary', success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning', danger: 'bg-danger/10 text-danger', info: 'bg-info/10 text-info',
  };
  return (
    <Card className={cn('kpi', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</p>
          {loading ? <Skeleton className="mt-3 h-8 w-28" /> : (
            <p className="mt-2 truncate text-2xl font-bold tracking-tight text-ink">{value}</p>
          )}
          <div className="mt-2 flex items-center gap-2">
            {delta != null && !loading ? (
              <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold', up ? 'text-success' : 'text-danger')}>
                {up ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                {Math.abs(Number(delta))}%
              </span>
            ) : null}
            {hint ? <span className="truncate text-xs text-muted">{hint}</span> : null}
          </div>
        </div>
        {Icon ? (
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', iconTones[tone] || iconTones.primary)}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      {action ? <div className="mt-4">{action}</div> : null}
    </Card>
  );
}

/* ------------------------------------------------------------------ misc */
export function CopyButton({ value, label = 'Copy', className }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard unavailable */ }
  };
  return (
    <button type="button" onClick={copy} className={cn('btn-secondary btn-sm', className)}>
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? 'Copied' : label}
    </button>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title = 'Are you sure?', description, confirmLabel = 'Delete', loading = false, tone = 'danger' }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={(
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      )}
    >
      <p className="text-sm text-muted">This action cannot be undone. Please confirm that you want to continue.</p>
    </Modal>
  );
}
