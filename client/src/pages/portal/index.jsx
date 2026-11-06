import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ArrowRight, Bell, Building2, CalendarDays, CheckCircle2, Clock, CreditCard, Download,
  ExternalLink, FileArchive, FileText, FolderKanban, Inbox, MapPin, MessageSquare, Paperclip,
  Search, Sparkles, Users, Wallet,
} from 'lucide-react';
import { api, absoluteUrl, unwrap } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import {
  Badge, Button, Card, CardHeader, EmptyState, ErrorState, PageHeader, Progress, SearchInput,
  Skeleton, StatCard,
} from '../../components/ui';
import { cn, currency, formatDate, formatDateTime, statusTone, timeAgo, titleCase } from '../../lib/utils';

const SECTION_META = {
  overview: { title: 'Client portal', eyebrow: 'Your workspace', subtitle: 'Everything your studio is working on, in one calm view.' },
  projects: { title: 'Projects', eyebrow: 'Client portal', subtitle: 'Live progress, deadlines and budgets for your active work.' },
  documents: { title: 'Documents', eyebrow: 'Client portal', subtitle: 'Proposals, contracts and files your studio has shared with you.' },
  invoices: { title: 'Invoices & payments', eyebrow: 'Client portal', subtitle: 'Paid, pending and past payments recorded by your studio.' },
  announcements: { title: 'Announcements', eyebrow: 'Client portal', subtitle: 'Updates and studio news shared with your account.' },
  meetings: { title: 'Meetings', eyebrow: 'Client portal', subtitle: 'Upcoming calls and previous conversations with the team.' },
};

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (!value) return '—';
  if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(0)} KB`;
  return `${value} B`;
}

function fileIcon(document) {
  const name = String(document.name || document.file_url || '').toLowerCase();
  if (name.endsWith('.zip') || name.endsWith('.rar')) return FileArchive;
  return FileText;
}

function downloadDocument(document) {
  const target = absoluteUrl(document.file_url);
  if (!target || (!target.startsWith('/uploads') && !/^https?:/i.test(target))) {
    toast.info('This demo record has no stored file. Ask your studio to upload a fresh copy.');
    return;
  }
  window.open(target, '_blank', 'noopener,noreferrer');
}

function PortalCard({ title, subtitle, icon, action, children, className }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} action={action} />
      {children}
    </Card>
  );
}

function OverviewSection({ data }) {
  const summary = data.summary || {};
  const client = data.client || {};
  const projects = data.projects || [];
  const documents = data.documents || [];
  const invoices = data.invoices || [];
  const announcements = data.announcements || [];
  const meetings = data.meetings || [];
  const activities = data.activities || [];
  const activeProjects = projects.filter((project) => project.status === 'ongoing');
  const pending = invoices.filter((invoice) => invoice.status === 'pending');
  const nextMeeting = meetings.find((meeting) => meeting.status === 'scheduled') || meetings[0];

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-5 shadow-soft sm:p-6">
        <div className="pointer-events-none absolute inset-0 bg-glow" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-primary">Welcome back</p>
            <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-ink">{client.company || client.name}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted">
              {activeProjects.length ? `${activeProjects.length} active project${activeProjects.length === 1 ? '' : 's'}` : 'No active projects'}
              {summary.documents ? ` · ${summary.documents} shared document${summary.documents === 1 ? '' : 's'}` : ''}
              {pending.length ? ` · ${pending.length} pending payment${pending.length === 1 ? '' : 's'}` : ' · payments up to date'}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge tone="primary"><Building2 className="h-3 w-3" /> {client.industry || 'Client'}</Badge>
              {client.manager_id ? <Badge tone="neutral"><Users className="h-3 w-3" /> Dedicated studio team</Badge> : null}
              {client.created_at ? <Badge tone="success" dot>Client since {formatDate(client.created_at)}</Badge> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/client-portal/projects"><Button variant="secondary"><FolderKanban className="h-4 w-4" /> Projects</Button></Link>
            <Link to="/messages"><Button><MessageSquare className="h-4 w-4" /> Message studio</Button></Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active projects" value={summary.ongoing || 0} hint={`${summary.projects || 0} total projects`} icon={FolderKanban} tone="primary" />
        <StatCard label="Shared documents" value={summary.documents || 0} hint="Visible to your account" icon={FileText} tone="info" />
        <StatCard label="Pending payments" value={currency(summary.pendingInvoices)} hint={`${invoices.filter((item) => item.status === 'pending').length} unpaid records`} icon={Wallet} tone="warning" />
        <StatCard label="Completed projects" value={summary.completed || 0} hint="Delivered and closed" icon={CheckCircle2} tone="success" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
        <PortalCard
          title="Active projects"
          subtitle="Progress shared by your studio"
          icon={FolderKanban}
          action={<Link to="/client-portal/projects" className="text-xs font-semibold text-primary hover:underline">View all →</Link>}
        >
          {!activeProjects.length ? (
            <EmptyState icon={FolderKanban} title="No active projects" description="Your studio will share new work here." />
          ) : (
            <div className="divide-y divide-line">
              {activeProjects.slice(0, 4).map((project) => (
                <div key={project.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">{project.name}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{project.category || 'Project'} · Due {formatDate(project.deadline)}</p>
                    </div>
                    <Badge tone={statusTone(project.status)} dot>{titleCase(project.status)}</Badge>
                  </div>
                  <div className="mt-2.5 flex items-center gap-3">
                    <Progress value={project.progress || 0} className="flex-1" />
                    <span className="w-9 text-right text-[11px] font-semibold text-ink">{project.progress || 0}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>

        <PortalCard
          title="Next meeting"
          subtitle="Your upcoming call with the team"
          icon={CalendarDays}
          action={<Link to="/client-portal/meetings" className="text-xs font-semibold text-primary hover:underline">All meetings →</Link>}
        >
          {!nextMeeting ? (
            <EmptyState icon={CalendarDays} title="Nothing scheduled" description="Meeting invites will appear here." />
          ) : (
            <div className="p-5">
              <Badge tone={statusTone(nextMeeting.status)} dot>{titleCase(nextMeeting.status)}</Badge>
              <p className="mt-2 text-sm font-semibold text-ink">{nextMeeting.title}</p>
              <p className="mt-1 text-xs text-muted">{nextMeeting.agenda || nextMeeting.description || 'Agenda will be shared before the call.'}</p>
              <div className="mt-3 grid gap-1.5 text-[11px] text-muted">
                <span className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary" /> {formatDate(nextMeeting.meeting_date)}</span>
                <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5 text-primary" /> {nextMeeting.start_time} – {nextMeeting.end_time}</span>
                <span className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> {nextMeeting.location || 'Online'}</span>
              </div>
              {nextMeeting.meeting_link ? (
                <a href={nextMeeting.meeting_link} target="_blank" rel="noreferrer" className="btn-primary btn-sm mt-4 w-full">
                  <ExternalLink className="h-3.5 w-3.5" /> Join meeting
                </a>
              ) : null}
            </div>
          )}
        </PortalCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <PortalCard
          title="Recent updates"
          subtitle="Milestones and studio activity"
          icon={Sparkles}
          action={<Link to="/client-portal/announcements" className="text-xs font-semibold text-primary hover:underline">News →</Link>}
        >
          {!activities.length ? <EmptyState icon={Sparkles} title="No updates yet" /> : (
            <div className="divide-y divide-line">
              {activities.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-start gap-2.5 p-3.5">
                  <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><CheckCircle2 className="h-3.5 w-3.5" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-ink">{activity.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{activity.description}</p>
                    <p className="mt-0.5 text-[10px] text-muted">{timeAgo(activity.activity_date || activity.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>

        <PortalCard
          title="Shared documents"
          subtitle="Newest files from the studio"
          icon={Paperclip}
          action={<Link to="/client-portal/documents" className="text-xs font-semibold text-primary hover:underline">All →</Link>}
        >
          {!documents.length ? <EmptyState icon={FileText} title="No shared documents" /> : (
            <div className="divide-y divide-line">
              {documents.slice(0, 4).map((document) => {
                const Icon = fileIcon(document);
                return (
                  <button key={document.id} type="button" onClick={() => downloadDocument(document)} className="flex w-full items-center gap-2.5 p-3.5 text-left transition hover:bg-surface2/60">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-info/10 text-info"><Icon className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-ink">{document.name}</p>
                      <p className="text-[10px] text-muted">{document.category || 'Document'} · {formatBytes(document.file_size)}</p>
                    </div>
                    <Download className="h-3.5 w-3.5 shrink-0 text-muted" />
                  </button>
                );
              })}
            </div>
          )}
        </PortalCard>

        <PortalCard
          title="Invoices"
          subtitle="Payment records from your studio"
          icon={CreditCard}
          action={<Link to="/client-portal/invoices" className="text-xs font-semibold text-primary hover:underline">All →</Link>}
        >
          {!invoices.length ? <EmptyState icon={CreditCard} title="No invoices yet" /> : (
            <div className="divide-y divide-line">
              {invoices.slice(0, 4).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between gap-2 p-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-ink">{invoice.invoice_number || invoice.description || 'Payment'}</p>
                    <p className="text-[10px] text-muted">{formatDate(invoice.payment_date || invoice.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-ink">{currency(invoice.amount)}</p>
                    <Badge tone={statusTone(invoice.status)}>{titleCase(invoice.status)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PortalCard>
      </div>

      {announcements.length ? (
        <PortalCard title="Studio announcements" subtitle="News shared with your account" icon={Bell} action={<Link to="/client-portal/announcements" className="text-xs font-semibold text-primary hover:underline">See all →</Link>}>
          <div className="grid gap-3 p-4 sm:grid-cols-2">
            {announcements.slice(0, 2).map((announcement) => (
              <div key={announcement.id} className="rounded-xl border border-line bg-surface2/40 p-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="info">{announcement.category || 'Update'}</Badge>
                  <span className="text-[10px] text-muted">{formatDate(announcement.published_date)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{announcement.title}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted">{announcement.description}</p>
              </div>
            ))}
          </div>
        </PortalCard>
      ) : null}
    </div>
  );
}

function ProjectsSection({ data }) {
  const projects = data.projects || [];
  const [filter, setFilter] = useState('all');
  const visible = projects.filter((project) => filter === 'all' || project.status === filter);

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="All projects" value={data.summary?.projects || 0} icon={FolderKanban} tone="primary" />
        <StatCard label="In progress" value={data.summary?.ongoing || 0} icon={Clock} tone="info" />
        <StatCard label="Completed" value={data.summary?.completed || 0} icon={CheckCircle2} tone="success" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[['all', 'All'], ['ongoing', 'In progress'], ['completed', 'Completed']].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn('rounded-lg border px-3 py-1.5 text-xs font-semibold transition', filter === value ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-muted hover:text-ink')}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-muted">{visible.length} shown</span>
      </div>

      {!visible.length ? (
        <EmptyState icon={FolderKanban} title="No projects here" description="Try a different filter or message your studio." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {visible.map((project) => (
            <Card key={project.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{project.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{project.category || 'Project'} · {project.priority || 'medium'} priority</p>
                </div>
                <Badge tone={statusTone(project.status)} dot>{titleCase(project.status)}</Badge>
              </div>
              <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-muted">{project.description}</p>
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-muted">Progress</span>
                  <span className="font-semibold text-ink">{project.progress || 0}%</span>
                </div>
                <Progress value={project.progress || 0} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-surface2/60 p-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">Deadline</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-ink">{formatDate(project.deadline)}</p>
                </div>
                <div className="rounded-lg bg-surface2/60 p-2.5">
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-muted">Budget</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-ink">{currency(project.budget)}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge tone="neutral">Started {formatDate(project.start_date)}</Badge>
                {project.amount_paid ? <Badge tone="success">{currency(project.amount_paid)} paid</Badge> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentsSection({ data }) {
  const documents = data.documents || [];
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => documents.filter((document) => {
    const needle = search.toLowerCase();
    return !needle || String(document.name || '').toLowerCase().includes(needle) || String(document.category || '').toLowerCase().includes(needle);
  }), [documents, search]);

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-line p-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search shared documents…" className="w-full sm:max-w-xs" />
        <Badge tone="neutral" className="ml-auto">{filtered.length} documents</Badge>
      </div>
      {!filtered.length ? (
        <EmptyState icon={FileText} title="No documents found" description={search ? 'Try a different search.' : 'Your studio has not shared files yet.'} />
      ) : (
        <div className="divide-y divide-line">
          {filtered.map((document) => {
            const Icon = fileIcon(document);
            return (
              <div key={document.id} className="flex flex-wrap items-center gap-3 p-4">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-info/10 text-info"><Icon className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{document.name}</p>
                  <p className="mt-0.5 text-[11px] text-muted">{document.category || 'Document'} · {formatBytes(document.file_size)} · Shared {formatDate(document.updated_at || document.created_at)}</p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => downloadDocument(document)}><Download className="h-3.5 w-3.5" /> Download</Button>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

function InvoicesSection({ data }) {
  const invoices = data.invoices || [];
  const [filter, setFilter] = useState('all');
  const visible = invoices.filter((invoice) => filter === 'all' || invoice.status === filter);
  const totals = invoices.reduce((acc, invoice) => {
    const key = invoice.status || 'pending';
    acc[key] = (acc[key] || 0) + Number(invoice.amount || 0);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total paid" value={currency(totals.completed || 0)} hint="Completed payments" icon={Wallet} tone="success" />
        <StatCard label="Pending" value={currency(totals.pending || 0)} hint="Awaiting payment" icon={Clock} tone="warning" />
        <StatCard label="Records" value={invoices.length} hint="All payment records" icon={CreditCard} tone="info" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[['all', 'All'], ['completed', 'Paid'], ['pending', 'Pending'], ['failed', 'Failed'], ['refunded', 'Refunded']].map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn('rounded-lg border px-3 py-1.5 text-xs font-semibold transition', filter === value ? 'border-primary bg-primary-soft text-primary' : 'border-line bg-surface text-muted hover:text-ink')}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader title="Payment history" subtitle="Invoices and payments recorded by your studio." icon={CreditCard} />
        {!visible.length ? (
          <EmptyState icon={CreditCard} title="No payment records" description="Payments appear here after your studio records them." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Invoice</th><th>Description</th><th>Date</th><th>Method</th><th>Status</th><th className="text-right">Amount</th></tr></thead>
              <tbody>
                {visible.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="whitespace-nowrap font-mono text-[11px] text-ink">{invoice.invoice_number || invoice.id}</td>
                    <td className="max-w-[260px] truncate text-xs text-muted">{invoice.description || 'Professional services'}</td>
                    <td className="whitespace-nowrap text-xs text-muted">{formatDate(invoice.payment_date || invoice.created_at)}</td>
                    <td className="text-xs text-muted">{invoice.method || '—'}</td>
                    <td><Badge tone={statusTone(invoice.status)} dot>{titleCase(invoice.status)}</Badge></td>
                    <td className="whitespace-nowrap text-right text-xs font-semibold text-ink">{currency(invoice.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="flex items-start gap-2 rounded-xl border border-info/25 bg-info/10 p-3 text-[11px] text-info">
        <Wallet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>Payment questions? Message the studio from the Messages page and reference the invoice number above.</p>
      </div>
    </div>
  );
}

function AnnouncementsSection({ data }) {
  const announcements = data.announcements || [];
  return (
    <div className="space-y-4">
      {!announcements.length ? (
        <EmptyState icon={Bell} title="No announcements" description="Studio news and updates will appear here." />
      ) : announcements.map((announcement) => (
        <Card key={announcement.id} className="p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{announcement.category || 'Update'}</Badge>
            <Badge tone={statusTone(announcement.status)} dot>{titleCase(announcement.status)}</Badge>
            <span className="text-[11px] text-muted">{formatDate(announcement.published_date)}</span>
            {announcement.expiry_date ? <span className="ml-auto text-[10px] text-muted">Expires {formatDate(announcement.expiry_date)}</span> : null}
          </div>
          <h3 className="mt-2 text-base font-semibold text-ink">{announcement.title}</h3>
          <p className="mt-1.5 whitespace-pre-wrap text-xs leading-relaxed text-muted">{announcement.description}</p>
        </Card>
      ))}
    </div>
  );
}

function MeetingsSection({ data }) {
  const meetings = data.meetings || [];
  const upcoming = meetings.filter((meeting) => meeting.status === 'scheduled');
  const past = meetings.filter((meeting) => meeting.status !== 'scheduled');

  const row = (meeting) => (
    <div key={meeting.id} className="flex flex-wrap items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><CalendarDays className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-ink">{meeting.title}</p>
          <Badge tone={statusTone(meeting.status)} dot>{titleCase(meeting.status)}</Badge>
        </div>
        <p className="mt-0.5 text-[11px] text-muted">{formatDate(meeting.meeting_date)} · {meeting.start_time}–{meeting.end_time} · {meeting.location || 'Online'}</p>
        {meeting.agenda ? <p className="mt-1 line-clamp-1 text-[11px] text-muted">{meeting.agenda}</p> : null}
      </div>
      {meeting.meeting_link ? (
        <a href={meeting.meeting_link} target="_blank" rel="noreferrer" className="btn-secondary btn-sm"><ExternalLink className="h-3.5 w-3.5" /> Join</a>
      ) : null}
    </div>
  );

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card className="overflow-hidden">
        <CardHeader title="Upcoming" subtitle="Your scheduled calls with the studio." icon={CalendarDays} action={<Badge tone="primary">{upcoming.length}</Badge>} />
        {!upcoming.length ? <EmptyState icon={CalendarDays} title="Nothing scheduled" description="New invites will appear here." /> : <div className="divide-y divide-line">{upcoming.map(row)}</div>}
      </Card>
      <Card className="overflow-hidden">
        <CardHeader title="Previous meetings" subtitle="Completed, cancelled or rescheduled calls." icon={Clock} action={<Badge tone="neutral">{past.length}</Badge>} />
        {!past.length ? <EmptyState icon={Clock} title="No past meetings" /> : <div className="divide-y divide-line">{past.map(row)}</div>}
      </Card>
    </div>
  );
}

export default function ClientPortalPage({ section = 'overview' }) {
  const { user } = useAuth();
  const meta = SECTION_META[section] || SECTION_META.overview;

  const portalQuery = useQuery({
    queryKey: ['portal', 'dashboard'],
    queryFn: async () => unwrap(await api.get('/portal/dashboard')),
  });

  const data = portalQuery.data;

  if (portalQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-40" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /><Skeleton className="h-28" /></div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (portalQuery.isError) {
    return (
      <div className="animate-fade-up">
        <PageHeader title="Client portal" eyebrow="Client portal" subtitle="This portal is linked to a client account." />
        <Card>
          <ErrorState message={portalQuery.error?.message || 'Could not load your portal.'} onRetry={portalQuery.refetch} />
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <PageHeader
        title={meta.title}
        eyebrow={meta.eyebrow}
        subtitle={meta.subtitle}
        actions={(
          <>
            <Badge tone="primary"><Building2 className="h-3 w-3" /> {data?.client?.company || user?.client?.company || 'Client'}</Badge>
            <Link to="/messages"><Button variant="secondary" size="sm"><MessageSquare className="h-3.5 w-3.5" /> Message studio</Button></Link>
          </>
        )}
      />

      {section === 'overview' ? <OverviewSection data={data} /> : null}
      {section === 'projects' ? <ProjectsSection data={data} /> : null}
      {section === 'documents' ? <DocumentsSection data={data} /> : null}
      {section === 'invoices' ? <InvoicesSection data={data} /> : null}
      {section === 'announcements' ? <AnnouncementsSection data={data} /> : null}
      {section === 'meetings' ? <MeetingsSection data={data} /> : null}
    </div>
  );
}
