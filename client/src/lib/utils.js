import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const currency = (value, currencyCode = 'INR', compact = false) => {
  const amount = Number(value || 0);
  if (compact) {
    if (Math.abs(amount) >= 10000000) return `₹${(amount / 10000000).toFixed(2)}Cr`;
    if (Math.abs(amount) >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
    if (Math.abs(amount) >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currencyCode || 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const number = (value) => new Intl.NumberFormat('en-IN').format(Number(value || 0));

export const formatDate = (value, options = {}) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', ...options });
};

export const formatDateShort = (value) => formatDate(value, { year: undefined });

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

export const timeAgo = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (Number.isNaN(seconds)) return '—';
  if (seconds < 60) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(value);
};

export const initials = (name = '') =>
  String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || '?';

export const titleCase = (value = '') =>
  String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());

export const percent = (value) => `${Number(value || 0)}%`;

export const truncate = (value, length = 80) =>
  String(value || '').length > length ? `${String(value).slice(0, length).trim()}…` : String(value || '');

export const today = () => new Date().toISOString().slice(0, 10);

export const statusTone = (status) => {
  const value = String(status || '').toLowerCase();
  if (['active', 'completed', 'paid', 'won', 'successful', 'accepted', 'connected', 'published', 'ready'].includes(value)) return 'success';
  if (['pending', 'ongoing', 'in progress', 'review', 'draft', 'invited', 'expiring', 'prospect', 'scheduled', 'in_progress', 'open'].includes(value)) return 'warning';
  if (['failed', 'overdue', 'lost', 'cancelled', 'refunded', 'suspended', 'inactive', 'error'].includes(value)) return 'danger';
  if (['new', 'contacted', 'qualified', 'proposal sent', 'negotiation', 'client', 'team'].includes(value)) return 'info';
  return 'neutral';
};

export const debounce = (fn, delay = 350) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const downloadFile = (content, filename, type = 'text/plain') => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const rangeOptions = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'this_year', label: 'This year' },
  { value: 'all', label: 'All time' },
];

export const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export const chartColors = ['#6366f1', '#8b5cf6', '#0ea5e9', '#14b8a6', '#f59e0b', '#f97316', '#f43f5e', '#10b981'];

export function resolveImage(path) {
  if (!path) return '';
  if (/^https?:/i.test(path) || path.startsWith('data:')) return path;
  if (path.startsWith('/uploads')) {
    const base = import.meta.env.VITE_API_BASE_URL || '/api';
    return base.startsWith('http') ? `${new URL(base).origin}${path}` : path;
  }
  return path;
}
