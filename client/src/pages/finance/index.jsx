import { useMemo, useState } from 'react';
import {
  ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Banknote, CalendarClock, CircleDollarSign,
  CreditCard, HandCoins, Landmark, Package, ReceiptText, RefreshCcw, TrendingUp, Wallet,
} from 'lucide-react';
import CrudPage from '../../components/common/CrudPage';
import DataTable from '../../components/common/DataTable';
import { ChartCard, DonutChart, RevenueExpenseChart } from '../../components/charts/Charts';
import { Badge, Card, PageHeader, Progress, StatCard } from '../../components/ui';
import { useDebounce } from '../../hooks/useDebounce';
import { useModuleStats, useResource, useRevenueOverview } from '../../lib/hooks';
import { useLookups } from '../../lib/lookups';
import { useAuth } from '../../contexts/AuthContext';
import { currency, formatDate, rangeOptions, statusTone } from '../../lib/utils';
import { CURRENCIES, PAYMENT_METHODS, PAYMENT_STATUSES } from '../../lib/constants';

const rangeSelect = (value, onChange) => (
  <select value={value} onChange={(event) => onChange(event.target.value)} className="select h-9 w-auto min-w-[150px] text-xs" aria-label="Date range">
    {rangeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
  </select>
);

const clientFilterOptions = (clients = []) => clients.map((client) => ({ value: client.id, label: client.label || client.name }));

/* ------------------------------------------------------------------ revenue */
export function RevenuePage() {
  const { isManager } = useAuth();
  const { options } = useLookups();
  const [range, setRange] = useState('30d');
  const overview = useRevenueOverview(range);
  const statsQuery = useModuleStats();
  const stats = statsQuery.data || {};
  const finance = stats.transactions || {};

  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const search = useDebounce(searchInput, 350);
  const [sort, setSort] = useState('-transaction_date');
  const [category, setCategory] = useState('');

  const ledger = useResource('transactions', {
    page, limit: 10, sort, type: 'income', ...(search ? { q: search } : {}), ...(category ? { revenue_category: category } : {}),
  });

  const columns = [
    {
      key: 'title', header: 'Revenue entry', sortable: true,
      render: (row) => (
        <div className="flex min-w-[220px] items-center gap-2.5">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${row.status === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
            <ArrowDownLeft className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.title}</p>
            <p className="truncate text-[10px] text-muted">{row.revenue_category || 'Other Revenue'}</p>
          </div>
        </div>
      ),
    },
    { key: 'transaction_date', header: 'Date', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.transaction_date)}</span> },
    { key: 'method', header: 'Method', sortable: true, render: (row) => <span className="text-xs text-muted">{row.method || '—'}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
    { key: 'amount', header: 'Amount', sortable: true, className: 'text-right', render: (row) => <span className="whitespace-nowrap font-semibold text-success">{currency(row.amount)}</span> },
  ];

  const data = overview.data;
  const breakdown = (data?.breakdown || []).filter((item) => item.amount > 0);

  return (
    <div className="animate-fade-up">
      <PageHeader
        title="Revenue management"
        subtitle="A single view of recognised income, revenue mix and the transaction ledger."
        eyebrow="Finance"
        actions={rangeSelect(range, setRange)}
      />

      <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={currency(data?.revenue)} delta={data?.growth} hint={`vs previous period`} icon={HandCoins} tone="success" loading={overview.isLoading} />
        <StatCard label="Expenses" value={currency(data?.expenses)} hint="Completed expenses" icon={ReceiptText} tone="danger" loading={overview.isLoading} />
        <StatCard label="Net revenue" value={currency(data?.netRevenue)} hint="Revenue less expenses" icon={TrendingUp} tone="primary" loading={overview.isLoading} />
        <StatCard label="Money in account" value={currency(finance.moneyInAccount)} hint="Opening balance + ledger" icon={Landmark} tone="info" loading={statsQuery.isLoading} />
      </div>

      <div className="mb-5 grid gap-4 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Revenue vs expenses" subtitle="Last six months, completed ledger entries" icon={ArrowLeftRight}>
          <RevenueExpenseChart data={data?.history || []} />
        </ChartCard>
        <ChartCard title="Revenue mix" subtitle="Share of income by category" icon={CircleDollarSign}>
          {breakdown.length ? (
            <DonutChart data={breakdown.map((item) => ({ name: item.category, value: item.amount }))} centerLabel="Revenue" />
          ) : (
            <p className="grid h-full place-items-center text-sm text-muted">No revenue in this range.</p>
          )}
        </ChartCard>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-base font-bold text-ink">Revenue breakdown</h2>
          <p className="text-xs text-muted">Amounts and contribution from completed income transactions.</p>
        </div>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {breakdown.map((item) => (
          <Card key={item.category} className="p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-ink">{item.category}</p>
              <Badge tone="primary">{item.percentage}%</Badge>
            </div>
            <p className="mt-2 text-lg font-bold text-ink">{currency(item.amount)}</p>
            <Progress value={item.percentage} className="mt-3" />
            <p className="mt-1.5 text-[10px] text-muted">{item.transactions} transactions</p>
          </Card>
        ))}
        {!breakdown.length && !overview.isLoading ? <p className="text-sm text-muted">No income transactions in this period.</p> : null}
      </div>

      <DataTable
        columns={columns}
        rows={ledger.data?.items || []}
        loading={ledger.isLoading}
        error={ledger.error}
        onRetry={ledger.refetch}
        pagination={ledger.data?.pagination}
        onPageChange={setPage}
        search={searchInput}
        onSearchChange={(value) => { setSearchInput(value); setPage(1); }}
        searchPlaceholder="Search revenue entries…"
        filters={(
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="select h-9 w-auto min-w-[170px] text-xs" aria-label="Revenue category">
            <option value="">All revenue categories</option>
            {(options.revenueCategories || []).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
        )}
        sort={sort}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        exportResource="transactions"
        exportParams={{ type: 'income', ...(category ? { revenue_category: category } : {}) }}
        emptyTitle="No revenue entries"
        emptyDescription="Income appears here when a payment is completed or an income transaction is recorded."
        emptyIcon={HandCoins}
        actions={isManager ? <Badge tone="info">Read-only ledger</Badge> : null}
      />
    </div>
  );
}

/* ---------------------------------------------------------------- payments */
export function PaymentsPage() {
  const { isManager } = useAuth();
  const { options, names } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.payments || {};

  const columns = useMemo(() => [
    {
      key: 'invoice_number', header: 'Payment', sortable: true,
      render: (row) => (
        <div className="flex min-w-[190px] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><CreditCard className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.invoice_number || 'Payment'}</p>
            <p className="truncate text-[10px] text-muted">{names.client(row.client_id)}</p>
          </div>
        </div>
      ),
    },
    { key: 'description', header: 'Description', render: (row) => <span className="line-clamp-1 max-w-[220px] text-xs text-muted">{row.description || '—'}</span> },
    { key: 'method', header: 'Method', sortable: true, render: (row) => <Badge tone="neutral">{row.method || 'Manual'}</Badge> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
    { key: 'payment_date', header: 'Date', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.payment_date)}</span> },
    { key: 'amount', header: 'Amount', sortable: true, className: 'text-right', render: (row) => <span className="whitespace-nowrap font-semibold text-ink">{currency(row.amount)}</span> },
  ], [names]);

  const fields = useMemo(() => [
    { name: 'client_id', label: 'Client', type: 'select', required: true, options: clientFilterOptions(options.clients) },
    { name: 'project_id', label: 'Project', type: 'select', options: (options.projects || []).map((project) => ({ value: project.id, label: project.label || project.name })) },
    { name: 'invoice_number', label: 'Invoice number', placeholder: 'INV-2026-001' },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 0 },
    { name: 'method', label: 'Payment method', type: 'select', options: PAYMENT_METHODS },
    { name: 'status', label: 'Status', type: 'select', options: PAYMENT_STATUSES },
    { name: 'payment_date', label: 'Payment date', type: 'date' },
    { name: 'transaction_id', label: 'Transaction / reference ID' },
    { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 2 },
  ], [options.clients, options.projects]);

  return (
    <CrudPage
      title="Payments"
      subtitle="Record client payments and keep the revenue ledger in sync automatically."
      eyebrow="Finance"
      resource="payments"
      columns={columns}
      fields={fields}
      initialValues={{ status: 'completed', method: 'Bank Transfer', payment_date: new Date().toISOString().slice(0, 10) }}
      addLabel="Record payment"
      searchPlaceholder="Search invoices, clients, references…"
      canWrite={isManager}
      canDelete={isManager}
      filterDefs={[
        { key: 'status', label: 'Status', options: PAYMENT_STATUSES },
        { key: 'method', label: 'Method', options: PAYMENT_METHODS },
        { key: 'client_id', label: 'Client', options: clientFilterOptions(options.clients) },
      ]}
      stats={(
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Received" value={currency(stats.received)} hint={`${stats.count ?? 0} payments`} icon={HandCoins} tone="success" loading={statsQuery.isLoading} />
          <StatCard label="Pending" value={currency(stats.pending)} hint="Awaiting collection" icon={CalendarClock} tone="warning" loading={statsQuery.isLoading} />
          <StatCard label="Failed" value={stats.failed ?? 0} hint="Payments needing attention" icon={RefreshCcw} tone="danger" loading={statsQuery.isLoading} />
          <StatCard label="Refunded" value={currency(stats.refunded)} hint="Returned to clients" icon={ArrowLeftRight} tone="info" loading={statsQuery.isLoading} />
        </div>
      )}
      emptyTitle="No payments recorded"
      emptyDescription="Record your first client payment to start the finance ledger."
      emptyIcon={CreditCard}
    />
  );
}

/* ------------------------------------------------------------ transactions */
export function TransactionsPage() {
  const { isManager } = useAuth();
  const { options, names } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data || {};
  const finance = stats.transactions || {};

  const columns = useMemo(() => [
    {
      key: 'title', header: 'Transaction', sortable: true,
      render: (row) => (
        <div className="flex min-w-[240px] items-center gap-2.5">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${row.type === 'income' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'}`}>
            {row.type === 'income' ? <ArrowDownLeft className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.title}</p>
            <p className="truncate text-[10px] text-muted">{row.revenue_category || row.description || 'Ledger entry'}</p>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', sortable: true, render: (row) => <Badge tone={row.type === 'income' ? 'success' : 'danger'}>{row.type}</Badge> },
    { key: 'client_id', header: 'Client', render: (row) => <span className="text-xs text-muted">{row.client_id ? names.client(row.client_id) : '—'}</span> },
    { key: 'transaction_date', header: 'Date', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.transaction_date)}</span> },
    { key: 'method', header: 'Method', render: (row) => <span className="text-xs text-muted">{row.method || '—'}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
    {
      key: 'amount', header: 'Amount', sortable: true, className: 'text-right',
      render: (row) => <span className={`whitespace-nowrap font-semibold ${row.type === 'income' ? 'text-success' : 'text-danger'}`}>{row.type === 'income' ? '+' : '−'}{currency(row.amount)}</span>,
    },
  ], [names]);

  const fields = [
    { name: 'title', label: 'Title', required: true, placeholder: 'Acme Studios — milestone invoice' },
    { name: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }] },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 0 },
    { name: 'revenue_category', label: 'Revenue category', type: 'select', options: (options.revenueCategories || []).map((item) => item.name) },
    { name: 'client_id', label: 'Client', type: 'select', options: clientFilterOptions(options.clients) },
    { name: 'method', label: 'Method', type: 'select', options: PAYMENT_METHODS },
    { name: 'transaction_date', label: 'Transaction date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: ['completed', 'pending', 'failed', 'cancelled'] },
    { name: 'description', label: 'Description', type: 'textarea', span: 2, rows: 2 },
  ];

  return (
    <CrudPage
      title="Transactions"
      subtitle="The finance source of truth. Payments and expenses post here automatically."
      eyebrow="Finance"
      resource="transactions"
      columns={columns}
      fields={fields}
      initialValues={{ type: 'income', status: 'completed', transaction_date: new Date().toISOString().slice(0, 10) }}
      addLabel="Add transaction"
      searchPlaceholder="Search transactions…"
      canWrite={isManager}
      canDelete={isManager}
      filterDefs={[
        { key: 'type', label: 'Type', options: [{ value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }] },
        { key: 'status', label: 'Status', options: ['completed', 'pending', 'failed', 'cancelled'] },
        { key: 'client_id', label: 'Client', options: clientFilterOptions(options.clients) },
      ]}
      stats={(
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Money in" value={currency(finance.revenue)} hint="Completed income" icon={ArrowDownLeft} tone="success" loading={statsQuery.isLoading} />
          <StatCard label="Money out" value={currency(finance.expenses)} hint="Completed expenses" icon={ArrowUpRight} tone="danger" loading={statsQuery.isLoading} />
          <StatCard label="Net position" value={currency(finance.netRevenue)} hint="Income less expenses" icon={TrendingUp} tone="primary" loading={statsQuery.isLoading} />
          <StatCard label="This month" value={currency(finance.currentMonth)} delta={finance.monthChange} hint="vs last month" icon={CalendarClock} tone="info" loading={statsQuery.isLoading} />
        </div>
      )}
      emptyTitle="No transactions yet"
      emptyDescription="Record income or expenses to build your finance ledger."
      emptyIcon={ArrowLeftRight}
    />
  );
}

/* ---------------------------------------------------------------- expenses */
export function ExpensesPage() {
  const { isManager } = useAuth();
  const { options } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.expenses || {};

  const columns = useMemo(() => [
    {
      key: 'description', header: 'Expense', sortable: true,
      render: (row) => (
        <div className="flex min-w-[230px] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-danger/10 text-danger"><ReceiptText className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.description || row.category}</p>
            <p className="truncate text-[10px] text-muted">{row.category}</p>
          </div>
        </div>
      ),
    },
    { key: 'method', header: 'Method', sortable: true, render: (row) => <Badge tone="neutral">{row.method || '—'}</Badge> },
    { key: 'recurring', header: 'Recurring', render: (row) => (row.recurring ? <Badge tone="info">Recurring</Badge> : <span className="text-xs text-muted">One-off</span>) },
    { key: 'expense_date', header: 'Date', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.expense_date)}</span> },
    { key: 'amount', header: 'Amount', sortable: true, className: 'text-right', render: (row) => <span className="whitespace-nowrap font-semibold text-ink">{currency(row.amount)}</span> },
  ], []);

  const fields = useMemo(() => [
    { name: 'category', label: 'Category', type: 'select', required: true, options: (options.expenseCategories || []).map((item) => item.name) },
    { name: 'description', label: 'Description', placeholder: 'What was this expense for?' },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, min: 0 },
    { name: 'expense_date', label: 'Expense date', type: 'date' },
    { name: 'method', label: 'Payment method', type: 'select', options: PAYMENT_METHODS },
    { name: 'attachment_url', label: 'Receipt URL', placeholder: 'https://…' },
    { name: 'recurring', label: 'Recurring expense', type: 'switch', switchLabel: 'Repeats every month' },
  ], [options.expenseCategories]);

  return (
    <CrudPage
      title="Expenses"
      subtitle="Track operating costs and keep the ledger reconciled with every expense."
      eyebrow="Finance"
      resource="expenses"
      columns={columns}
      fields={fields}
      initialValues={{ expense_date: new Date().toISOString().slice(0, 10), method: 'Card', recurring: false }}
      addLabel="Add expense"
      searchPlaceholder="Search expenses, categories…"
      canWrite={isManager}
      canDelete={isManager}
      filterDefs={[
        { key: 'category', label: 'Category', options: (options.expenseCategories || []).map((item) => item.name) },
        { key: 'method', label: 'Method', options: PAYMENT_METHODS },
      ]}
      stats={(
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total expenses" value={currency(stats.total)} hint={`${stats.count ?? 0} records`} icon={ReceiptText} tone="danger" loading={statsQuery.isLoading} />
          <StatCard label="Recurring" value={stats.recurring ?? 0} hint="Monthly commitments" icon={RefreshCcw} tone="warning" loading={statsQuery.isLoading} />
          <StatCard label="Net revenue" value={currency(statsQuery.data?.transactions?.netRevenue)} hint="After expenses" icon={TrendingUp} tone="success" loading={statsQuery.isLoading} />
          <StatCard label="Money in account" value={currency(statsQuery.data?.transactions?.moneyInAccount)} hint="Live ledger balance" icon={Landmark} tone="info" loading={statsQuery.isLoading} />
        </div>
      )}
      emptyTitle="No expenses yet"
      emptyDescription="Add your studio costs to see accurate profit and cash-flow numbers."
      emptyIcon={ReceiptText}
    />
  );
}

/* --------------------------------------------------------------- retainers */
export function RetainersPage() {
  const { isManager, isAdmin } = useAuth();
  const { options, names } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.retainers || {};

  const columns = useMemo(() => [
    {
      key: 'name', header: 'Retainer', sortable: true,
      render: (row) => (
        <div className="flex min-w-[210px] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Package className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.name}</p>
            <p className="truncate text-[10px] text-muted">{names.client(row.client_id)}</p>
          </div>
        </div>
      ),
    },
    { key: 'billing_cycle', header: 'Cycle', sortable: true, render: (row) => <Badge tone="info">{row.billing_cycle}</Badge> },
    { key: 'monthly_amount', header: 'Amount', sortable: true, render: (row) => <span className="whitespace-nowrap font-semibold text-ink">{currency(row.monthly_amount)}</span> },
    { key: 'payment_status', header: 'Payment', sortable: true, render: (row) => <Badge tone={statusTone(row.payment_status)} dot>{row.payment_status}</Badge> },
    { key: 'next_billing_date', header: 'Next billing', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.next_billing_date)}</span> },
    { key: 'end_date', header: 'Ends', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.end_date)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
  ], [names]);

  const fields = useMemo(() => [
    { name: 'name', label: 'Retainer name', required: true, placeholder: 'Growth retainer' },
    { name: 'client_id', label: 'Client', type: 'select', required: true, options: clientFilterOptions(options.clients) },
    { name: 'project_id', label: 'Linked project', type: 'select', options: (options.projects || []).map((project) => ({ value: project.id, label: project.label || project.name })) },
    { name: 'monthly_amount', label: 'Amount (₹)', type: 'number', required: true, min: 0 },
    { name: 'billing_cycle', label: 'Billing cycle', type: 'select', options: ['monthly', 'quarterly', 'yearly'] },
    { name: 'payment_status', label: 'Payment status', type: 'select', options: ['paid', 'pending', 'overdue'] },
    { name: 'start_date', label: 'Start date', type: 'date' },
    { name: 'end_date', label: 'End date', type: 'date' },
    { name: 'next_billing_date', label: 'Next billing date', type: 'date' },
    { name: 'status', label: 'Status', type: 'select', options: ['active', 'paused', 'cancelled', 'completed'] },
    { name: 'description', label: 'Scope', type: 'textarea', span: 2, rows: 3 },
  ], [options.clients, options.projects]);

  return (
    <CrudPage
      title="Retainers"
      subtitle="Recurring revenue, billing cycles and renewal dates in one place."
      eyebrow="Finance"
      resource="retainers"
      columns={columns}
      fields={fields}
      initialValues={{ status: 'active', billing_cycle: 'monthly', payment_status: 'pending' }}
      addLabel="Add retainer"
      searchPlaceholder="Search retainers…"
      canWrite={isManager}
      canDelete={isAdmin}
      filterDefs={[
        { key: 'status', label: 'Status', options: ['active', 'paused', 'cancelled', 'completed'] },
        { key: 'payment_status', label: 'Payment', options: ['paid', 'pending', 'overdue'] },
        { key: 'billing_cycle', label: 'Cycle', options: ['monthly', 'quarterly', 'yearly'] },
      ]}
      stats={(
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Active retainers" value={stats.active ?? 0} hint={`${stats.total ?? 0} total`} icon={Package} tone="primary" loading={statsQuery.isLoading} />
          <StatCard label="Monthly recurring" value={currency(stats.mrr)} hint="Contracted MRR" icon={HandCoins} tone="success" loading={statsQuery.isLoading} />
          <StatCard label="Payment pending" value={stats.pending ?? 0} hint="Needs collection" icon={CalendarClock} tone="warning" loading={statsQuery.isLoading} />
          <StatCard label="Expiring soon" value={stats.expiring ?? 0} hint="Within 30 days" icon={RefreshCcw} tone="danger" loading={statsQuery.isLoading} />
        </div>
      )}
      emptyTitle="No retainers yet"
      emptyDescription="Add a retainer to track recurring client revenue."
      emptyIcon={Package}
    />
  );
}

/* ----------------------------------------------------------------- payroll */
export function PayrollPage() {
  const { options } = useLookups();
  const statsQuery = useModuleStats();
  const stats = statsQuery.data?.payroll || {};

  const columns = [
    {
      key: 'employee_name', header: 'Employee', sortable: true,
      render: (row) => (
        <div className="flex min-w-[190px] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><Wallet className="h-4 w-4" /></span>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-ink">{row.employee_name}</p>
            <p className="truncate text-[10px] text-muted">{row.designation || 'Team member'}</p>
          </div>
        </div>
      ),
    },
    { key: 'month', header: 'Month', sortable: true, render: (row) => <span className="whitespace-nowrap text-xs text-muted">{row.month}</span> },
    { key: 'basic_salary', header: 'Basic', sortable: true, render: (row) => <span className="text-xs text-muted">{currency(row.basic_salary)}</span> },
    { key: 'allowances', header: 'Allowances', render: (row) => <span className="text-xs text-muted">{currency(row.allowances)}</span> },
    { key: 'deductions', header: 'Deductions', render: (row) => <span className="text-xs text-muted">{currency(Number(row.deductions || 0) + Number(row.tax_deduction || 0))}</span> },
    { key: 'net_salary', header: 'Net pay', sortable: true, className: 'text-right', render: (row) => <span className="whitespace-nowrap font-semibold text-ink">{currency(row.net_salary)}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (row) => <Badge tone={statusTone(row.status)} dot>{row.status}</Badge> },
    { key: 'payment_date', header: 'Paid on', render: (row) => <span className="whitespace-nowrap text-xs text-muted">{formatDate(row.payment_date)}</span> },
  ];

  const fields = [
    {
      name: 'member_id', label: 'Employee', type: 'select', required: true,
      options: (options.team || []).map((member) => ({ value: member.id, label: `${member.name}${member.designation ? ` · ${member.designation}` : ''}` })),
    },
    { name: 'month', label: 'Payroll month', type: 'month', required: true },
    { name: 'basic_salary', label: 'Basic salary (₹)', type: 'number', required: true, min: 0 },
    { name: 'allowances', label: 'Allowances (₹)', type: 'number', min: 0 },
    { name: 'bonus', label: 'Bonus (₹)', type: 'number', min: 0 },
    { name: 'deductions', label: 'Deductions (₹)', type: 'number', min: 0 },
    { name: 'tax_deduction', label: 'Tax deducted (₹)', type: 'number', min: 0 },
    { name: 'status', label: 'Status', type: 'select', options: ['pending', 'paid'] },
    { name: 'payment_method', label: 'Payment method', type: 'select', options: ['bank', 'upi', 'cash', 'cheque'] },
    { name: 'payment_date', label: 'Payment date', type: 'date' },
  ];

  const beforeSubmit = (values) => {
    const member = (options.team || []).find((item) => item.id === values.member_id);
    return {
      ...values,
      employee_name: member?.name || values.employee_name || 'Team member',
      designation: member?.designation || values.designation || '',
    };
  };

  return (
    <CrudPage
      title="Payroll"
      subtitle="Monthly salary records, deductions and payouts for your team."
      eyebrow="Finance"
      resource="payroll"
      columns={columns}
      fields={fields}
      initialValues={{ month: new Date().toISOString().slice(0, 7), status: 'pending', allowances: 0, bonus: 0, deductions: 0, tax_deduction: 0, payment_method: 'bank' }}
      addLabel="Add payroll record"
      searchPlaceholder="Search employees, months…"
      canWrite
      canDelete
      filterDefs={[
        { key: 'status', label: 'Status', options: ['pending', 'paid'] },
        { key: 'month', label: 'Month', options: [...new Set([new Date().toISOString().slice(0, 7)])] },
      ]}
      beforeSubmit={beforeSubmit}
      stats={(
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Employees" value={stats.employees ?? 0} hint="On payroll" icon={Wallet} tone="primary" loading={statsQuery.isLoading} />
          <StatCard label="Current month" value={currency(stats.currentMonth)} hint="Net payroll" icon={Banknote} tone="info" loading={statsQuery.isLoading} />
          <StatCard label="Paid" value={currency(stats.paid)} hint="Settled this cycle" icon={HandCoins} tone="success" loading={statsQuery.isLoading} />
          <StatCard label="Pending" value={currency(stats.pending)} hint="Awaiting payout" icon={CalendarClock} tone="warning" loading={statsQuery.isLoading} />
        </div>
      )}
      emptyTitle="No payroll records"
      emptyDescription="Add a payroll entry to track monthly salaries and deductions."
      emptyIcon={Wallet}
      modalSize="lg"
    />
  );
}
