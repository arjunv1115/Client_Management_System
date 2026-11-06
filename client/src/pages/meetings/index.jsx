import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  CalendarDays, CalendarPlus, CheckCircle2, Clock, ExternalLink, MapPin, Sparkles, Users, Video,
} from 'lucide-react';
import CrudPage from '../../components/common/CrudPage';
import { AiButton, AiCard, AiResult } from '../../components/common/AiAssistant';
import { InfoGrid, MiniStat, PersonCell, SectionCard, SeverityBadge } from '../../components/common/Detail';
import {
  Badge, Button, Drawer, Textarea,
} from '../../components/ui';
import { useLookups } from '../../lib/lookups';
import { useAiInsight, useModuleStats } from '../../lib/hooks';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../lib/api';
import { formatDate, statusTone, timeAgo } from '../../lib/utils';

function MeetingDrawer({ meeting, onClose, names }) {
  const [notes, setNotes] = useState('');
  const agenda = useAiInsight({ url: `/ai/meetings/${meeting?.id}/agenda` });
  const summary = useAiInsight({ url: `/ai/meetings/${meeting?.id}/summarize` });
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [googleResult, setGoogleResult] = useState(null);

  if (!meeting) return null;

  const createEvent = async () => {
    setCreatingEvent(true);
    try {
      const response = await api.post('/integrations/google/event', { meeting });
      setGoogleResult(response.data?.data || response.data);
      toast.success('Google Calendar event created.');
    } catch (error) {
      toast.error(error.message || 'Google Calendar is not connected. Add credentials to enable this.');
    } finally {
      setCreatingEvent(false);
    }
  };

  return (
    <Drawer open={Boolean(meeting)} onClose={onClose} title="Meeting details" width="w-full max-w-xl">
      <div className="space-y-5">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={statusTone(meeting.status)} dot>{meeting.status}</Badge>
            <SeverityBadge value={meeting.priority} />
            <Badge tone="neutral">{meeting.type || 'client'}</Badge>
          </div>
          <h2 className="text-lg font-bold text-ink">{meeting.title}</h2>
          <p className="mt-1 text-sm text-muted">{meeting.description || 'No description added.'}</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <MiniStat label="Date" value={formatDate(meeting.meeting_date)} icon={CalendarDays} />
          <MiniStat label="Time" value={`${meeting.start_time} – ${meeting.end_time}`} icon={Clock} tone="info" />
          <MiniStat label="Client" value={names.client(meeting.client_id)} icon={Users} />
          <MiniStat label="Location" value={meeting.location || 'Online'} icon={MapPin} tone="success" />
        </div>

        <SectionCard title="Agenda & participants" icon={CalendarDays}>
          <InfoGrid
            columns={1}
            items={[
              { label: 'Agenda', value: meeting.agenda || meeting.description || '—' },
              { label: 'Participants', value: meeting.participants || '—' },
              { label: 'Project', value: names.project(meeting.project_id) },
              { label: 'Owner', value: names.person(meeting.assigned_to) },
            ]}
          />
        </SectionCard>

        <div className="flex flex-wrap gap-2">
          {meeting.meeting_link || googleResult?.meet_link ? (
            <a
              href={googleResult?.meet_link || meeting.meeting_link}
              target="_blank"
              rel="noreferrer"
              className="btn-secondary btn-sm"
            >
              <Video className="h-3.5 w-3.5" /> Join meeting <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
          <Button variant="secondary" size="sm" onClick={createEvent} loading={creatingEvent}>
            <CalendarPlus className="h-3.5 w-3.5" /> Create Google event
          </Button>
        </div>
        {googleResult?.html_link ? (
          <a href={googleResult.html_link} target="_blank" rel="noreferrer" className="block text-xs font-semibold text-primary hover:underline">
            Open the event in Google Calendar →
          </a>
        ) : null}

        <AiCard
          title="AI meeting assistant"
          subtitle="Prepare an agenda, then turn your notes into a reviewed summary"
          action={<AiButton onClick={() => agenda.mutate({})} loading={agenda.isPending}>Draft agenda</AiButton>}
        >
          <AiResult
            result={agenda.data}
            loading={agenda.isPending}
            error={agenda.error}
            onRetry={() => agenda.mutate({})}
            feature="meeting_assistant"
            entity="meetings"
            entityId={meeting.id}
            useLabel="Use agenda"
          />
          <div className="mt-4 space-y-2">
            <Textarea
              label="Meeting notes"
              rows={4}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              placeholder="Paste rough notes, decisions and owners…"
            />
            <div className="flex justify-end">
              <AiButton onClick={() => summary.mutate({ notes })} loading={summary.isPending} disabled={!notes.trim()}>
                Summarise notes
              </AiButton>
            </div>
          </div>
          {summary.data ? (
            <div className="mt-3">
              <AiResult result={summary.data} feature="meeting_assistant" entity="meetings" entityId={meeting.id} useLabel="Accept summary" />
            </div>
          ) : null}
        </AiCard>

        <p className="text-[11px] text-muted">Last updated {timeAgo(meeting.updated_at)} · Meeting changes are audited.</p>
      </div>
    </Drawer>
  );
}

export function MeetingsPage() {
  const { isManager } = useAuth();
  const { options, names } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.meetings || {};
  const [detail, setDetail] = useState(null);

  const columns = useMemo(() => [
    {
      key: 'title', header: 'Meeting', sortable: true,
      render: (row) => (
        <div className="flex min-w-[220px] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
            <CalendarDays className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.title}</p>
            <p className="truncate text-[10px] text-muted">{names.client(row.client_id)} · {names.project(row.project_id)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'meeting_date', header: 'When', sortable: true,
      render: (row) => (
        <div>
          <p className="whitespace-nowrap text-xs font-medium text-ink">{formatDate(row.meeting_date)}</p>
          <p className="text-[10px] text-muted">{row.start_time} – {row.end_time}</p>
        </div>
      ),
    },
    { key: 'location', header: 'Location', render: (row) => <span className="text-xs text-muted">{row.location || 'Online'}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
    { key: 'priority', header: 'Priority', sortable: true, render: (row) => <SeverityBadge value={row.priority} /> },
    { key: 'assigned_to', header: 'Owner', render: (row) => <PersonCell name={names.person(row.assigned_to)} /> },
  ], [names]);

  const fields = useMemo(() => [
    { name: 'title', label: 'Meeting title', required: true, span: 2, placeholder: 'Acme milestone review' },
    {
      name: 'client_id', label: 'Client', type: 'select',
      options: (options.clients || []).map((c) => ({ value: c.id, label: c.label || c.name })),
    },
    {
      name: 'project_id', label: 'Project', type: 'select',
      options: (options.projects || []).map((p) => ({ value: p.id, label: p.name })),
    },
    {
      name: 'type', label: 'Type', type: 'select',
      options: [{ value: 'client', label: 'Client' }, { value: 'internal', label: 'Internal' }, { value: 'sales', label: 'Sales' }],
    },
    { name: 'meeting_date', label: 'Date', type: 'date', required: true },
    { name: 'start_time', label: 'Start time', type: 'time', required: true },
    { name: 'end_time', label: 'End time', type: 'time', required: true },
    { name: 'location', label: 'Location', placeholder: 'Google Meet, Zoom, office…' },
    { name: 'meeting_link', label: 'Meeting link', placeholder: 'https://meet.google.com/…' },
    {
      name: 'assigned_to', label: 'Owner', type: 'select',
      options: (options.profiles || []).map((p) => ({ value: p.id, label: p.name })),
    },
    {
      name: 'status', label: 'Status', type: 'select',
      options: ['scheduled', 'completed', 'cancelled', 'rescheduled'],
    },
    { name: 'priority', label: 'Priority', type: 'select', options: ['high', 'medium', 'low'] },
    { name: 'participants', label: 'Participants', placeholder: 'Shweta, Rahul', span: 2 },
    { name: 'agenda', label: 'Agenda', type: 'textarea', span: 2, rows: 3 },
    { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 3 },
  ], [options.clients, options.projects, options.profiles]);

  return (
    <>
      <CrudPage
        title="Meetings"
        subtitle="Schedule client calls, prepare agendas and capture decisions with human-reviewed AI notes."
        eyebrow="Delivery"
        resource="meetings"
        columns={columns}
        fields={fields}
        initialValues={{ status: 'scheduled', priority: 'medium', type: 'client' }}
        searchPlaceholder="Search meetings, agendas, locations…"
        addLabel="Schedule meeting"
        canWrite
        canDelete={isManager}
        onRowClick={(row) => setDetail(row)}
        filterDefs={[
          { key: 'status', label: 'Status', options: ['scheduled', 'completed', 'cancelled', 'rescheduled'] },
          { key: 'priority', label: 'Priority', options: ['high', 'medium', 'low'] },
          { key: 'client_id', label: 'Client', options: (options.clients || []).map((c) => ({ value: c.id, label: c.label || c.name })) },
        ]}
        stats={(
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total meetings" value={stats.total ?? 0} hint="All time" icon={CalendarDays} loading={statsQuery.isLoading} />
            <StatCard label="Upcoming" value={stats.upcoming ?? 0} hint="Scheduled ahead" icon={Clock} tone="info" loading={statsQuery.isLoading} />
            <StatCard label="Today" value={stats.today ?? 0} hint="Happening today" icon={Video} tone="warning" loading={statsQuery.isLoading} />
            <StatCard label="Completed" value={stats.completed ?? 0} hint="Notes captured" icon={CheckCircle2} tone="success" loading={statsQuery.isLoading} />
          </div>
        )}
        emptyTitle="No meetings found"
        emptyDescription="Schedule a client call or adjust your filters."
        emptyIcon={CalendarDays}
      />
      <MeetingDrawer meeting={detail} onClose={() => setDetail(null)} names={names} />
    </>
  );
}

// Local import kept at the bottom to avoid a large import block above the component.
import { StatCard } from '../../components/ui';

export default MeetingsPage;
