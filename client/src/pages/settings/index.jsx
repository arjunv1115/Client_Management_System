import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  AlertTriangle, Bell, Building2, CalendarDays, Check, CheckCircle2, Database, Download,
  FileJson, FileSpreadsheet, KeyRound, Lock, Mail, Monitor, Moon, Palette, Plug, Save,
  ShieldCheck, Sparkles, Sun, Upload, UserRound, Zap,
} from 'lucide-react';
import { api, downloadExport, unwrap } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useUpload } from '../../lib/hooks';
import {
  Avatar, Badge, Button, Card, CardHeader, CopyButton, Input, PageHeader, Select,
  Skeleton, Switch, Textarea,
} from '../../components/ui';
import { settingsTabs } from '../../components/layout/nav';
import { cn, formatDate, formatDateTime, statusTone } from '../../lib/utils';

const TONES = {
  ready: 'success', connected: 'success', local_fallback: 'info', log_only: 'warning',
  not_configured: 'neutral', disconnected: 'danger', not_connected: 'neutral', error: 'danger',
};
const LABELS = {
  ready: 'Ready', connected: 'Connected', local_fallback: 'Local fallback',
  log_only: 'Log only', not_configured: 'Not configured', disconnected: 'Disconnected',
  not_connected: 'Not connected', error: 'Error',
};

const PROVIDERS = [
  {
    id: 'google_calendar',
    name: 'Google Calendar & Meet',
    icon: CalendarDays,
    description: 'Create calendar events and generate Google Meet links from the meetings module.',
    requirement: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET',
  },
  {
    id: 'razorpay',
    name: 'Razorpay',
    icon: Zap,
    description: 'Accept live subscription and invoice payments from the billing module.',
    requirement: 'RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET',
  },
  {
    id: 'ai',
    name: 'AI provider',
    icon: Sparkles,
    description: 'Drafts, summaries, scoring and insights. Without a key, a deterministic local rules engine is used.',
    requirement: 'AI_API_KEY (OpenAI-compatible endpoint)',
  },
  {
    id: 'email',
    name: 'Transactional email',
    icon: Mail,
    description: 'Invitations and password-reset delivery. Without a key, email content is logged on the server.',
    requirement: 'EMAIL_SERVICE_API_KEY and EMAIL_FROM',
  },
];

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', description: 'Bright, crisp workspace', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Low-light, high contrast', icon: Moon },
  { value: 'system', label: 'System', description: 'Match your device', icon: Monitor },
];

const EXPORT_RESOURCES = [
  { resource: 'leads', label: 'Leads', roles: ['super_admin', 'admin', 'manager', 'team_member'] },
  { resource: 'clients', label: 'Clients', roles: ['super_admin', 'admin', 'manager', 'team_member', 'client'] },
  { resource: 'projects', label: 'Projects', roles: ['super_admin', 'admin', 'manager', 'team_member', 'client'] },
  { resource: 'tasks', label: 'Tasks', roles: ['super_admin', 'admin', 'manager', 'team_member'] },
  { resource: 'meetings', label: 'Meetings', roles: ['super_admin', 'admin', 'manager', 'team_member', 'client'] },
  { resource: 'documents', label: 'Documents', roles: ['super_admin', 'admin', 'manager', 'team_member', 'client'] },
  { resource: 'payments', label: 'Payments', roles: ['super_admin', 'admin', 'manager', 'client'] },
  { resource: 'transactions', label: 'Transactions', roles: ['super_admin', 'admin', 'manager'] },
  { resource: 'expenses', label: 'Expenses', roles: ['super_admin', 'admin', 'manager'] },
  { resource: 'invoices', label: 'Invoices', roles: ['super_admin', 'admin', 'manager', 'client'] },
  { resource: 'retainers', label: 'Retainers', roles: ['super_admin', 'admin', 'manager'] },
  { resource: 'referrals', label: 'Referrals', roles: ['super_admin', 'admin', 'manager', 'team_member'] },
  { resource: 'quotations', label: 'Quotations', roles: ['super_admin', 'admin', 'manager'] },
  { resource: 'contracts', label: 'Contracts', roles: ['super_admin', 'admin', 'manager'] },
  { resource: 'payroll', label: 'Payroll', roles: ['super_admin', 'admin'] },
  { resource: 'team_members', label: 'Team members', roles: ['super_admin', 'admin', 'manager', 'team_member'] },
];

function Section({ title, description, children, icon: Icon, action }) {
  return (
    <Card>
      <CardHeader title={title} subtitle={description} icon={Icon} action={action} />
      <div className="p-5 sm:p-6">{children}</div>
    </Card>
  );
}

function IntegrationCard({ provider, row, capabilities, isAdmin, onConnect, onDisconnect, busy }) {
  const Icon = provider.icon;
  const status = row?.status || (capabilities?.[provider.id] ? 'ready' : 'not_configured');
  const connected = Boolean(row?.connected);
  const ready = Boolean(capabilities?.[provider.id]);
  const config = row?.config || {};
  const configEntries = Object.entries(config).filter(([key]) => !['access_token', 'refresh_token'].includes(key));

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-ink">{provider.name}</p>
            <Badge tone={TONES[status] || 'neutral'} dot>{LABELS[status] || status}</Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted">{provider.description}</p>
        </div>
      </div>

      <div className="rounded-lg bg-surface2/70 px-3 py-2 text-[11px] text-muted">
        <p>
          {ready ? 'Configured on the server.' : 'Optional. Add'}
          {!ready ? <span className="mx-1 rounded bg-surface px-1 py-0.5 font-mono text-[10px] text-ink">{provider.requirement}</span> : null}
          {!ready ? 'to server/.env to enable it.' : null}
        </p>
        {provider.id === 'ai' && !ready ? (
          <p className="mt-1 text-info">The local rules engine answers from your real workspace records, so AI features still work.</p>
        ) : null}
        {provider.id === 'email' && !ready ? (
          <p className="mt-1 text-info">Invite links are still generated and can be copied. Email delivery is skipped.</p>
        ) : null}
        {config.connected_at ? <p className="mt-1">Connected {formatDateTime(config.connected_at)}</p> : null}
      </div>

      {configEntries.length && provider.id !== 'google_calendar' ? (
        <div className="flex flex-wrap gap-1.5">
          {configEntries.slice(0, 4).map(([key, value]) => (
            <Badge key={key} tone="neutral">{key}: {String(value).slice(0, 28)}</Badge>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {provider.id === 'google_calendar' ? (
          connected ? (
            <Button size="sm" variant="danger" disabled={!isAdmin || busy === provider.id} loading={busy === provider.id} onClick={() => onDisconnect(provider.id)}>
              Disconnect
            </Button>
          ) : (
            <Button size="sm" disabled={!isAdmin || !ready || busy === provider.id} loading={busy === provider.id} onClick={() => onConnect(provider.id)}>
              <CalendarDays className="h-3.5 w-3.5" /> Connect Google
            </Button>
          )
        ) : (
          <Button size="sm" variant="secondary" disabled title="Configure this provider with server environment variables">
            <Plug className="h-3.5 w-3.5" /> Environment managed
          </Button>
        )}
        {!isAdmin ? <span className="self-center text-[10px] text-muted">Admins manage integrations.</span> : null}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { tab = 'profile' } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { user, isAdmin, isManager, refresh } = useAuth();
  const { theme, setTheme } = useTheme();
  const upload = useUpload();

  const [profileForm, setProfileForm] = useState(null);
  const [orgForm, setOrgForm] = useState(null);
  const [orgSettingsForm, setOrgSettingsForm] = useState(null);
  const [prefs, setPrefs] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [avatarFile, setAvatarFile] = useState(null);
  const [busyProvider, setBusyProvider] = useState(null);
  const [saving, setSaving] = useState({});
  const avatarRef = useRef(null);

  const preferencesQuery = useQuery({
    queryKey: ['preferences'],
    queryFn: async () => unwrap(await api.get('/preferences')),
  });

  const integrationsQuery = useQuery({
    queryKey: ['integrations'],
    queryFn: async () => unwrap(await api.get('/integrations')),
  });

  const payload = preferencesQuery.data;

  useEffect(() => {
    if (!payload) return;
    setPrefs((current) => current || {
      theme: payload.preferences?.theme || theme || 'system',
      density: payload.preferences?.density || 'comfortable',
      date_format: payload.preferences?.date_format || 'dd MMM yyyy',
      ai_enabled: payload.preferences?.ai_enabled !== false,
      ai_tone: payload.preferences?.ai_tone || 'friendly',
      email_notifications: payload.preferences?.email_notifications !== false,
      weekly_digest: payload.preferences?.weekly_digest !== false,
      desktop_notifications: payload.preferences?.desktop_notifications !== false,
      sound_notifications: Boolean(payload.preferences?.sound_notifications),
    });
    setOrgForm((current) => current || {
      name: payload.organization?.name || '',
      email: payload.organization?.email || '',
      phone: payload.organization?.phone || '',
      website: payload.organization?.website || '',
      address: payload.organization?.address || '',
      logo_url: payload.organization?.logo_url || '',
      currency: payload.organization?.currency || 'INR',
      opening_balance: payload.organization?.opening_balance ?? 0,
      invoice_prefix: payload.organization?.invoice_prefix || 'INV',
      timezone: payload.organization?.timezone || 'Asia/Kolkata',
    });
    setOrgSettingsForm((current) => current || {
      fiscal_year_start: payload.organizationSettings?.fiscal_year_start || '04-01',
      invoice_due_days: payload.organizationSettings?.invoice_due_days ?? 15,
    });
  }, [payload, theme]);

  useEffect(() => {
    if (!user) return;
    setProfileForm((current) => current || {
      name: user.name || '',
      phone: user.phone || '',
      designation: user.designation || '',
      avatar_url: user.avatar_url || '',
    });
  }, [user]);

  useEffect(() => {
    const result = searchParams.get('google');
    if (!result) return;
    const messages = {
      connected: ['Google Calendar connected.', 'success'],
      denied: ['Google authorisation was cancelled.', 'error'],
      invalid_state: ['The Google connection expired. Please try again.', 'error'],
      token_failed: ['Google rejected the token exchange. Check the server credentials.', 'error'],
      unknown_user: ['The Google account could not be matched to a user.', 'error'],
    };
    const [message, kind] = messages[result] || ['Google connection finished.', 'info'];
    if (kind === 'success') toast.success(message);
    else if (kind === 'error') toast.error(message);
    else toast.info(message);
    integrationsQuery.refetch();
    const next = new URLSearchParams(searchParams);
    next.delete('google');
    setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const activeTab = settingsTabs.some((item) => item.value === tab) ? tab : 'profile';

  const saveProfile = async (event) => {
    event?.preventDefault();
    setSaving((state) => ({ ...state, profile: true }));
    try {
      let avatarUrl = profileForm.avatar_url;
      if (avatarFile) {
        const uploaded = await upload.mutateAsync({ file: avatarFile });
        avatarUrl = uploaded.url || avatarUrl;
      }
      await api.put('/auth/profile', { ...profileForm, avatar_url: avatarUrl });
      setProfileForm((current) => ({ ...current, avatar_url: avatarUrl }));
      setAvatarFile(null);
      await refresh();
      toast.success('Profile updated.');
    } catch (error) {
      toast.error(error.message || 'Could not update your profile.');
    } finally {
      setSaving((state) => ({ ...state, profile: false }));
    }
  };

  const saveOrganization = async (event) => {
    event?.preventDefault();
    setSaving((state) => ({ ...state, organization: true }));
    try {
      await api.put('/preferences/settings', {
        organization: { ...orgForm, opening_balance: Number(orgForm.opening_balance || 0) },
        organizationSettings: {
          ...orgSettingsForm,
          invoice_due_days: Number(orgSettingsForm.invoice_due_days || 0),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['preferences'] }),
        queryClient.invalidateQueries({ queryKey: ['meta'] }),
        refresh(),
      ]);
      toast.success('Organization settings saved.');
    } catch (error) {
      toast.error(error.message || 'Could not save organization settings.');
    } finally {
      setSaving((state) => ({ ...state, organization: false }));
    }
  };

  const savePreferences = async (event, keys) => {
    event?.preventDefault();
    setSaving((state) => ({ ...state, preferences: true }));
    try {
      const body = keys.reduce((acc, key) => ({ ...acc, [key]: prefs[key] }), {});
      await api.put('/preferences', body);
      await queryClient.invalidateQueries({ queryKey: ['preferences'] });
      toast.success('Preferences saved.');
    } catch (error) {
      toast.error(error.message || 'Could not save preferences.');
    } finally {
      setSaving((state) => ({ ...state, preferences: false }));
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    setSaving((state) => ({ ...state, password: true }));
    try {
      await api.put('/auth/password', passwordForm);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      toast.success('Password changed. Keep it somewhere safe.');
    } catch (error) {
      toast.error(error.message || 'Could not change your password.');
    } finally {
      setSaving((state) => ({ ...state, password: false }));
    }
  };

  const connectGoogle = async () => {
    setBusyProvider('google_calendar');
    try {
      const data = unwrap(await api.get('/integrations/google/connect'));
      window.location.href = data.url;
    } catch (error) {
      toast.error(error.message || 'Could not start Google authorisation.');
      setBusyProvider(null);
    }
  };

  const disconnectProvider = async (provider) => {
    setBusyProvider(provider);
    try {
      await api.post(`/integrations/${provider}/disconnect`);
      await queryClient.invalidateQueries({ queryKey: ['integrations'] });
      toast.success('Integration disconnected.');
    } catch (error) {
      toast.error(error.message || 'Could not disconnect the integration.');
    } finally {
      setBusyProvider(null);
    }
  };

  const exportData = async (resource, format) => {
    try {
      await downloadExport(`/${resource}`, { format, filename: `${resource}-${new Date().toISOString().slice(0, 10)}.${format}` });
      toast.success(`${resource.replace(/_/g, ' ')} exported as ${format.toUpperCase()}.`);
    } catch (error) {
      toast.error(error.message || 'Export failed.');
    }
  };

  const exports = useMemo(
    () => EXPORT_RESOURCES.filter((item) => item.roles.includes(user?.role)),
    [user?.role],
  );

  const integrationData = integrationsQuery.data || { integrations: [], capabilities: {} };
  const integrationMap = useMemo(
    () => Object.fromEntries((integrationData.integrations || []).map((row) => [row.provider, row])),
    [integrationData.integrations],
  );

  const initialsName = profileForm?.name || user?.name;

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Settings"
        eyebrow="Workspace"
        subtitle="Personal preferences, organization details, security and the optional integrations connected to this workspace."
        actions={<Badge tone="primary"><ShieldCheck className="h-3 w-3" /> {user?.role_label || 'Member'}</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit overflow-hidden lg:sticky lg:top-24">
          <nav className="flex gap-1 overflow-x-auto p-2 no-scrollbar lg:flex-col">
            {settingsTabs.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => navigate(`/settings/${item.value}`)}
                className={cn('nav-link whitespace-nowrap py-2 text-left text-xs', activeTab === item.value && 'nav-link-active')}
              >
                {item.label}
              </button>
            ))}
          </nav>
          <div className="hidden border-t border-line p-3 lg:block">
            <p className="text-[10px] leading-relaxed text-muted">Changes are stored per user except organization settings, which require an admin.</p>
          </div>
        </Card>

        <div className="min-w-0 space-y-5">
          {preferencesQuery.isLoading ? (
            <>
              <Skeleton className="h-48" />
              <Skeleton className="h-40" />
            </>
          ) : preferencesQuery.isError ? (
            <Card className="p-6">
              <p className="text-sm font-semibold text-ink">Could not load preferences</p>
              <p className="mt-1 text-xs text-muted">{preferencesQuery.error?.message}</p>
              <Button size="sm" className="mt-3" variant="secondary" onClick={() => preferencesQuery.refetch()}>Try again</Button>
            </Card>
          ) : (
            <>
              {activeTab === 'profile' && profileForm ? (
                <>
                  <Section title="Your profile" description="This is how you appear across the workspace, assigned records and messages." icon={UserRound}>
                    <form onSubmit={saveProfile} className="space-y-5">
                      <div className="flex flex-wrap items-center gap-4">
                        <Avatar name={initialsName} src={profileForm.avatar_url} size="xl" />
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" size="sm" variant="secondary" onClick={() => avatarRef.current?.click()}>
                              <Upload className="h-3.5 w-3.5" /> {avatarFile ? avatarFile.name : 'Upload photo'}
                            </Button>
                            {profileForm.avatar_url ? (
                              <Button type="button" size="sm" variant="ghost" onClick={() => { setAvatarFile(null); setProfileForm((current) => ({ ...current, avatar_url: '' })); }}>
                                Remove
                              </Button>
                            ) : null}
                          </div>
                          <p className="mt-1.5 text-[10px] text-muted">PNG, JPG or WEBP up to 10 MB.</p>
                          <input
                            ref={avatarRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => setAvatarFile(event.target.files?.[0] || null)}
                          />
                        </div>
                        <div className="ml-auto grid gap-1 text-right text-[11px] text-muted">
                          <span className="font-semibold text-ink">{user?.role_label}</span>
                          <span>{user?.organization?.name}</span>
                          <span>Joined {formatDate(user?.created_at)}</span>
                        </div>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Full name" required value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} />
                        <Input label="Email" value={user?.email || ''} disabled help="Email is used to sign in. Contact an admin to change it." />
                        <Input label="Phone" value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} placeholder="+91 98100 11000" />
                        <Input label="Designation" value={profileForm.designation} onChange={(event) => setProfileForm((current) => ({ ...current, designation: event.target.value }))} placeholder="Project manager" />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4">
                        <p className="text-[11px] text-muted">Signed in as <span className="font-semibold text-ink">{user?.email}</span></p>
                        <Button type="submit" loading={saving.profile || upload.isPending}><Save className="h-4 w-4" /> Save profile</Button>
                      </div>
                    </form>
                  </Section>

                  <Section title="Account" description="Workspace membership and access." icon={ShieldCheck}>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-line bg-surface2/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Role</p>
                        <p className="mt-1 text-sm font-semibold text-ink">{user?.role_label}</p>
                      </div>
                      <div className="rounded-xl border border-line bg-surface2/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Plan</p>
                        <p className="mt-1 text-sm font-semibold text-ink">{user?.plan?.name || 'Free'}</p>
                      </div>
                      <div className="rounded-xl border border-line bg-surface2/50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted">Status</p>
                        <p className="mt-1 text-sm font-semibold text-success">Active</p>
                      </div>
                    </div>
                  </Section>
                </>
              ) : null}

              {activeTab === 'organization' && orgForm && orgSettingsForm ? (
                <>
                  {!isAdmin ? (
                    <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/10 p-4 text-xs text-warning">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      <p>Organization settings are read-only for your role. Ask a Super Admin or Admin to make changes.</p>
                    </div>
                  ) : null}
                  <Section title="Organization" description="Used on invoices, documents and the public agency page." icon={Building2}>
                    <form onSubmit={saveOrganization} className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Organization name" required value={orgForm.name} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, name: event.target.value }))} />
                        <Input label="Billing email" type="email" value={orgForm.email} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, email: event.target.value }))} />
                        <Input label="Phone" value={orgForm.phone} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, phone: event.target.value }))} />
                        <Input label="Website" value={orgForm.website} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, website: event.target.value }))} placeholder="https://" />
                        <Input label="Logo URL" value={orgForm.logo_url} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, logo_url: event.target.value }))} placeholder="/uploads/logo.png" />
                        <Select label="Currency" value={orgForm.currency} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, currency: event.target.value }))} options={['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD']} />
                        <Input label="Invoice prefix" value={orgForm.invoice_prefix} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, invoice_prefix: event.target.value }))} placeholder="INV" />
                        <Input label="Opening balance" type="number" value={orgForm.opening_balance} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, opening_balance: event.target.value }))} />
                      </div>
                      <Textarea label="Address" rows={3} value={orgForm.address} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, address: event.target.value }))} />
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Select label="Timezone" value={orgForm.timezone} disabled={!isAdmin} onChange={(event) => setOrgForm((current) => ({ ...current, timezone: event.target.value }))} options={['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'America/Los_Angeles', 'Australia/Sydney']} />
                        <Input label="Fiscal year starts" value={orgSettingsForm.fiscal_year_start} disabled={!isAdmin} onChange={(event) => setOrgSettingsForm((current) => ({ ...current, fiscal_year_start: event.target.value }))} placeholder="04-01" help="MM-DD format." />
                        <Input label="Invoice due days" type="number" min="0" value={orgSettingsForm.invoice_due_days} disabled={!isAdmin} onChange={(event) => setOrgSettingsForm((current) => ({ ...current, invoice_due_days: event.target.value }))} />
                      </div>
                      <div className="flex justify-end border-t border-line pt-4">
                        <Button type="submit" disabled={!isAdmin} loading={saving.organization}><Save className="h-4 w-4" /> Save organization</Button>
                      </div>
                    </form>
                  </Section>
                  <Section title="Workspace summary" description="Organization record identifiers." icon={Database}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-line bg-surface2/50 p-3 text-xs">
                        <p className="text-[10px] uppercase tracking-wide text-muted">Organization ID</p>
                        <p className="mt-1 break-all font-mono text-[11px] text-ink">{payload?.organization?.id}</p>
                      </div>
                      <div className="rounded-xl border border-line bg-surface2/50 p-3 text-xs">
                        <p className="text-[10px] uppercase tracking-wide text-muted">Slug</p>
                        <p className="mt-1 font-mono text-[11px] text-ink">{payload?.organization?.slug}</p>
                      </div>
                    </div>
                  </Section>
                </>
              ) : null}

              {activeTab === 'appearance' && prefs ? (
                <>
                  <Section title="Theme" description="Applies instantly and follows you across sessions." icon={Palette}>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {THEME_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => { setTheme(option.value); setPrefs((current) => ({ ...current, theme: option.value })); }}
                          className={cn(
                            'rounded-xl border p-4 text-left transition',
                            theme === option.value ? 'border-primary bg-primary-soft/50 shadow-sm' : 'border-line hover:border-primary/30',
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="grid h-9 w-9 place-items-center rounded-lg bg-surface text-primary"><option.icon className="h-4 w-4" /></span>
                            {theme === option.value ? <CheckCircle2 className="h-4 w-4 text-primary" /> : null}
                          </div>
                          <p className="mt-2 text-sm font-semibold text-ink">{option.label}</p>
                          <p className="text-[11px] text-muted">{option.description}</p>
                        </button>
                      ))}
                    </div>
                  </Section>

                  <Section title="Display & AI" description="Tune density, dates and the tone of AI drafts." icon={Sparkles}>
                    <form onSubmit={(event) => savePreferences(event, ['density', 'date_format', 'ai_enabled', 'ai_tone'])} className="space-y-5">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Select label="Density" value={prefs.density} onChange={(event) => setPrefs((current) => ({ ...current, density: event.target.value }))} options={[{ value: 'comfortable', label: 'Comfortable' }, { value: 'compact', label: 'Compact' }]} />
                        <Select label="Date format" value={prefs.date_format} onChange={(event) => setPrefs((current) => ({ ...current, date_format: event.target.value }))} options={[{ value: 'dd MMM yyyy', label: '12 Nov 2026' }, { value: 'dd/MM/yyyy', label: '12/11/2026' }, { value: 'MM/dd/yyyy', label: '11/12/2026' }, { value: 'yyyy-MM-dd', label: '2026-11-12' }]} />
                        <Select label="AI tone" value={prefs.ai_tone} onChange={(event) => setPrefs((current) => ({ ...current, ai_tone: event.target.value }))} options={[{ value: 'friendly', label: 'Friendly' }, { value: 'formal', label: 'Formal' }, { value: 'concise', label: 'Concise' }, { value: 'persuasive', label: 'Persuasive' }]} />
                      </div>
                      <Switch
                        checked={prefs.ai_enabled}
                        onChange={(checked) => setPrefs((current) => ({ ...current, ai_enabled: checked }))}
                        label="Enable AI assistance"
                        description="Show AI actions across leads, clients, projects, tasks and documents."
                      />
                      <div className="flex justify-end border-t border-line pt-4">
                        <Button type="submit" loading={saving.preferences}><Save className="h-4 w-4" /> Save preferences</Button>
                      </div>
                    </form>
                  </Section>
                </>
              ) : null}

              {activeTab === 'notifications' && prefs ? (
                <Section title="Notification preferences" description="Choose what reaches your inbox and desktop." icon={Bell}>
                  <form onSubmit={(event) => savePreferences(event, ['email_notifications', 'weekly_digest', 'desktop_notifications', 'sound_notifications'])} className="space-y-4">
                    <div className="divide-y divide-line rounded-xl border border-line">
                      <div className="p-4">
                        <Switch checked={prefs.email_notifications} onChange={(checked) => setPrefs((current) => ({ ...current, email_notifications: checked }))} label="Email notifications" description="Assignments, mentions, payments and client replies." />
                      </div>
                      <div className="p-4">
                        <Switch checked={prefs.weekly_digest} onChange={(checked) => setPrefs((current) => ({ ...current, weekly_digest: checked }))} label="Weekly digest" description="Monday summary of pipeline, delivery and money." />
                      </div>
                      <div className="p-4">
                        <Switch checked={prefs.desktop_notifications} onChange={(checked) => setPrefs((current) => ({ ...current, desktop_notifications: checked }))} label="Desktop notifications" description="Browser alerts while the app is open." />
                      </div>
                      <div className="p-4">
                        <Switch checked={prefs.sound_notifications} onChange={(checked) => setPrefs((current) => ({ ...current, sound_notifications: checked }))} label="Sound" description="Play a soft chime for new messages." />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-info/20 bg-info/10 p-3 text-[11px] text-info">
                      <span>Email delivery is optional in this demo. Notification records always appear in the bell menu.</span>
                      <Link to="/notifications" className="font-semibold hover:underline">Open inbox</Link>
                    </div>
                    <div className="flex justify-end">
                      <Button type="submit" loading={saving.preferences}><Save className="h-4 w-4" /> Save notifications</Button>
                    </div>
                  </form>
                </Section>
              ) : null}

              {activeTab === 'security' && (
                <>
                  <Section title="Change password" description="Use at least 8 characters. Demo accounts use Admin@123, Manager@123, Member@123 or Client@123." icon={KeyRound}>
                    <form onSubmit={savePassword} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <Input label="Current password" type="password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} autoComplete="current-password" />
                        <div className="hidden sm:block" />
                        <Input label="New password" type="password" required value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} autoComplete="new-password" />
                        <Input label="Confirm new password" type="password" required value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} autoComplete="new-password" />
                      </div>
                      <div className="flex justify-end border-t border-line pt-4">
                        <Button type="submit" loading={saving.password}><Lock className="h-4 w-4" /> Update password</Button>
                      </div>
                    </form>
                  </Section>

                  <Section title="Session security" description="How this local demo protects your account." icon={ShieldCheck}>
                    <div className="space-y-3 text-xs text-muted">
                      <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Passwords are hashed with bcrypt on the server. Frontend roles are never trusted for authorization.</p>
                      <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> JWT sessions expire after seven days. Signing out clears the local token and React Query cache.</p>
                      <p className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> Every write is authorized again on the server and recorded in the audit log.</p>
                      <div className="rounded-xl border border-line bg-surface2/50 p-3">
                        <p className="font-semibold text-ink">Multi-factor authentication</p>
                        <p className="mt-1">MFA is modelled in the schema but not enabled in this local demo. Enable it in your production identity provider.</p>
                      </div>
                    </div>
                  </Section>
                </>
              )}

              {activeTab === 'integrations' && (
                <>
                  <Section
                    title="Connected services"
                    description="All integrations are optional. The workspace keeps working with local fallbacks."
                    icon={Plug}
                    action={(
                      <Button size="sm" variant="secondary" onClick={() => integrationsQuery.refetch()} disabled={integrationsQuery.isFetching}>
                        Refresh
                      </Button>
                    )}
                  >
                    {integrationsQuery.isLoading ? (
                      <div className="grid gap-3 md:grid-cols-2"><Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" /><Skeleton className="h-44" /></div>
                    ) : integrationsQuery.isError ? (
                      <p className="text-xs text-danger">{integrationsQuery.error?.message || 'Could not load integrations.'}</p>
                    ) : (
                      <div className="grid gap-3 md:grid-cols-2">
                        {PROVIDERS.map((provider) => (
                          <IntegrationCard
                            key={provider.id}
                            provider={provider}
                            row={integrationMap[provider.id]}
                            capabilities={integrationData.capabilities}
                            isAdmin={isAdmin}
                            onConnect={connectGoogle}
                            onDisconnect={disconnectProvider}
                            busy={busyProvider}
                          />
                        ))}
                      </div>
                    )}
                  </Section>

                  <Section title="How configuration works" description="Secrets stay on the server and are never returned to the browser." icon={Lock}>
                    <div className="space-y-2 text-xs leading-relaxed text-muted">
                      <p>Copy <span className="rounded bg-surface2 px-1 py-0.5 font-mono text-[11px] text-ink">.env.example</span> to <span className="rounded bg-surface2 px-1 py-0.5 font-mono text-[11px] text-ink">server/.env</span> and add only the providers you need. Restart the API after changing environment variables.</p>
                      <p>Google is the only provider with an in-app OAuth flow. Razorpay, AI and email are read from the server environment at boot so billing and AI fall back safely when keys are absent.</p>
                      <p>Integration state is scoped to your organization. Client users cannot read or change these settings.</p>
                    </div>
                  </Section>
                </>
              )}

              {activeTab === 'data' && (
                <>
                  <Section title="Export your data" description="Download a portable CSV or JSON copy of each module. Exports respect your role and client scoping." icon={Download}>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {exports.map((item) => (
                        <div key={item.resource} className="flex items-center justify-between gap-2 rounded-xl border border-line bg-surface2/40 px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">{item.label}</p>
                            <p className="text-[10px] text-muted">{item.resource}</p>
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <Button size="sm" variant="ghost" title="Export CSV" onClick={() => exportData(item.resource, 'csv')}><FileSpreadsheet className="h-3.5 w-3.5" /> CSV</Button>
                            <Button size="sm" variant="ghost" title="Export JSON" onClick={() => exportData(item.resource, 'json')}><FileJson className="h-3.5 w-3.5" /> JSON</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>

                  <Section title="Local-first storage" description="What this demo stores and where." icon={Database}>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-line bg-surface2/50 p-4 text-xs">
                        <p className="font-semibold text-ink">Runtime data</p>
                        <p className="mt-1 leading-relaxed text-muted">Records live in <span className="font-mono text-[11px] text-ink">server/data/db.json</span>. Uploaded files live in <span className="font-mono text-[11px] text-ink">server/uploads</span>.</p>
                      </div>
                      <div className="rounded-xl border border-line bg-surface2/50 p-4 text-xs">
                        <p className="font-semibold text-ink">Production schema</p>
                        <p className="mt-1 leading-relaxed text-muted">Supabase SQL for tables, policies, functions and seed data is included under <span className="font-mono text-[11px] text-ink">database/</span>.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-start gap-2 rounded-xl border border-warning/30 bg-warning/10 p-3 text-[11px] text-warning">
                      <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <p>To reset the demo data, run <span className="rounded bg-surface px-1 py-0.5 font-mono text-[10px]">npm run seed</span> from the project root. That replaces the JSON database with the seeded demo records.</p>
                    </div>
                  </Section>

                  {isManager ? (
                    <Section title="Admin shortcuts" description="Jump to the tools that control workspace data." icon={Database}>
                      <div className="flex flex-wrap gap-2">
                        <Link to="/team" className="btn-secondary btn-sm">Team & permissions</Link>
                        {isAdmin ? <Link to="/billing" className="btn-secondary btn-sm">Billing & plan</Link> : null}
                        {isAdmin ? <Link to="/admin" className="btn-secondary btn-sm">Admin console</Link> : null}
                        <Link to="/help" className="btn-secondary btn-sm">Help & support</Link>
                      </div>
                    </Section>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
