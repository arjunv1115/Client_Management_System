import { useMemo } from 'react';
import { toast } from 'sonner';
import {
  BadgeCheck, Copy, Gift, Link2, MousePointerClick, Share2, Sparkles, TrendingUp, UserPlus, Wallet,
} from 'lucide-react';
import CrudPage from '../../components/common/CrudPage';
import { Badge, Button, Card, CopyButton, StatCard } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useResource } from '../../lib/hooks';
import { currency, formatDate, statusTone } from '../../lib/utils';

export default function ReferralsPage() {
  const { isAdmin, isManager } = useAuth();
  const codesQuery = useResource('referral_codes', { limit: 20, sort: '-created_at' });
  const codes = codesQuery.data?.items || [];
  const primary = codes[0];

  const columns = useMemo(() => [
    {
      key: 'referred_company', header: 'Referred company', sortable: true,
      render: (row) => (
        <div className="flex min-w-[220px] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Gift className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.referred_company || row.referred_name}</p>
            <p className="truncate text-[10px] text-muted">{row.referred_name} · {row.referred_email}</p>
          </div>
        </div>
      ),
    },
    { key: 'code', header: 'Code', render: (row) => <Badge tone="info">{row.code || 'PIXEL10'}</Badge> },
    { key: 'status', header: 'Stage', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
    { key: 'reward_amount', header: 'Reward', sortable: true, render: (row) => <span className="whitespace-nowrap font-semibold text-ink">{currency(row.reward_amount)}</span> },
    { key: 'reward_status', header: 'Reward status', sortable: true, render: (row) => <Badge tone={row.reward_status === 'paid' ? 'success' : 'warning'}>{row.reward_status}</Badge> },
    { key: 'created_at', header: 'Referred', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.created_at)}</span> },
  ], []);

  const fields = useMemo(() => [
    { name: 'referred_company', label: 'Company', required: true, placeholder: 'Sunrise Digital' },
    { name: 'referred_name', label: 'Contact name', placeholder: 'Maya Rao' },
    { name: 'referred_email', label: 'Contact email', type: 'email', placeholder: 'maya@company.com' },
    { name: 'code', label: 'Referral code', type: 'select', options: codes.map((code) => code.code) },
    { name: 'status', label: 'Stage', type: 'select', options: ['clicked', 'registered', 'successful', 'expired'] },
    { name: 'reward_amount', label: 'Reward (₹)', type: 'number', min: 0 },
    { name: 'reward_status', label: 'Reward status', type: 'select', options: ['pending', 'paid', 'cancelled'] },
    { name: 'referrer_name', label: 'Referrer', placeholder: 'Shweta Kapoor' },
  ], [codes]);

  const referralLink = primary ? `${window.location.origin}/?ref=${primary.code}` : '';

  return (
    <CrudPage
      title="Referrals"
      subtitle="Track partner referrals, reward payouts and the codes driving new business."
      eyebrow="Growth"
      resource="referrals"
      columns={columns}
      fields={fields}
      initialValues={{ status: 'registered', reward_status: 'pending', reward_amount: 0, referrer_name: 'Shweta Kapoor' }}
      addLabel="Add referral"
      searchPlaceholder="Search companies, contacts, codes…"
      canWrite={isAdmin}
      canDelete={isAdmin}
      filterDefs={[
        { key: 'status', label: 'Stage', options: ['clicked', 'registered', 'successful', 'expired'] },
        { key: 'reward_status', label: 'Reward', options: ['pending', 'paid', 'cancelled'] },
      ]}
      stats={(
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Clicks" value={primary?.clicks ?? 0} hint="On your referral link" icon={MousePointerClick} tone="info" loading={codesQuery.isLoading} />
            <StatCard label="Signups" value={primary?.signups ?? 0} hint={`${primary?.conversions ?? 0} converted`} icon={UserPlus} tone="primary" loading={codesQuery.isLoading} />
            <StatCard label="Reward per referral" value={currency(primary?.reward_per_referral)} hint="Paid on conversion" icon={Wallet} tone="success" loading={codesQuery.isLoading} />
            <StatCard label="Programme status" value={primary ? 'Active' : 'Not set up'} hint={primary?.code ? `Code ${primary.code}` : 'Create a referral code'} icon={Sparkles} tone={primary ? 'success' : 'warning'} loading={codesQuery.isLoading} />
          </div>
          {primary ? (
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-white"><Share2 className="h-5 w-5" /></span>
                <div>
                  <p className="text-xs font-semibold text-ink">Your referral link</p>
                  <p className="break-all text-[11px] text-muted">{referralLink}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="primary">{primary.code}</Badge>
                <CopyButton value={referralLink} label="Copy link" />
              </div>
            </Card>
          ) : null}
        </div>
      )}
      rowActions={(row) => (
        <button
          type="button"
          className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-ink transition hover:bg-surface2"
          onClick={() => {
            navigator.clipboard?.writeText(`Referral: ${row.referred_company || row.referred_name} (${row.referred_email})`);
            toast.success('Referral details copied.');
          }}
        >
          <Copy className="h-4 w-4 opacity-80" /> Copy details
        </button>
      )}
      emptyTitle="No referrals yet"
      emptyDescription="Share your referral link to start tracking partner conversions."
      emptyIcon={Gift}
    />
  );
}
