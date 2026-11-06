import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { useTheme } from '../../contexts/ThemeContext';
import { chartColors, currency, number } from '../../lib/utils';
import { Card, CardHeader, EmptyState } from '../ui';

function useChartTheme() {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  return {
    dark,
    grid: dark ? 'rgba(148,163,184,0.16)' : 'rgba(100,116,139,0.14)',
    axis: dark ? '#94a3b8' : '#64748b',
    surface: dark ? '#111420' : '#ffffff',
    ink: dark ? '#f1f5f9' : '#0f172a',
  };
}

export function CurrencyTooltip({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-float">
      {label ? <p className="mb-1 font-semibold text-ink">{label}</p> : null}
      {payload.map((item) => (
        <p key={item.dataKey || item.name} className="flex items-center gap-2 text-muted">
          <span className="h-2 w-2 rounded-full" style={{ background: item.color || item.fill }} />
          <span className="capitalize">{item.name}</span>
          <span className="ml-auto font-semibold text-ink">{currency(item.value)}{suffix}</span>
        </p>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, icon, action, children, className, height = 300 }) {
  return (
    <Card className={className}>
      <CardHeader title={title} subtitle={subtitle} icon={icon} action={action} />
      <div className="p-4 sm:p-5" style={{ height }}>
        {children}
      </div>
    </Card>
  );
}

export function RevenueExpenseChart({ data = [], height = 300 }) {
  const theme = useChartTheme();
  if (!data.length) return <EmptyState title="No financial history yet" description="Completed payments and expenses will appear here." />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="expenseFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.24} />
            <stop offset="100%" stopColor="#f43f5e" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => currency(value, 'INR', true)} />
        <Tooltip content={<CurrencyTooltip />} />
        <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#6366f1" strokeWidth={2.4} fill="url(#revenueFill)" />
        <Area type="monotone" dataKey="expenses" name="Expenses" stroke="#f43f5e" strokeWidth={2} fill="url(#expenseFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TrendLineChart({ data = [], dataKey = 'total', name = 'Total', color = '#6366f1', height = 240, xKey = 'month' }) {
  const theme = useChartTheme();
  if (!data.length) return <EmptyState title="Not enough data yet" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CurrencyTooltip />} />
        <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2.4} dot={{ r: 3, fill: color }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SimpleBarChart({ data = [], xKey = 'name', dataKey = 'value', name = 'Value', color = '#6366f1', height = 260, currencyAxis = false, colors }) {
  const theme = useChartTheme();
  if (!data.length) return <EmptyState title="No data for this period" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey={xKey} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} interval={0} angle={data.length > 5 ? -12 : 0} textAnchor={data.length > 5 ? 'end' : 'middle'} height={data.length > 5 ? 52 : 30} />
        <YAxis tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => (currencyAxis ? currency(value, 'INR', true) : number(value))} />
        <Tooltip content={<CurrencyTooltip />} cursor={{ fill: theme.grid }} />
        <Bar dataKey={dataKey} name={name} radius={[6, 6, 0, 0]} maxBarSize={44}>
          {data.map((entry, index) => (
            <Cell key={entry[xKey] || index} fill={colors?.[index % colors.length] || color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data = [], nameKey = 'name', dataKey = 'value', height = 240, colors = chartColors, showCurrency = true, centerLabel }) {
  const theme = useChartTheme();
  const total = data.reduce((sum, item) => sum + Number(item[dataKey] || 0), 0);
  if (!data.length || total === 0) return <EmptyState title="No breakdown available" description="Add records to see this chart." />;
  return (
    <div className="flex h-full flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative mx-auto w-full max-w-[220px]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey={dataKey} nameKey={nameKey} innerRadius="64%" outerRadius="92%" paddingAngle={3} stroke="none">
              {data.map((entry, index) => <Cell key={entry[nameKey] || index} fill={colors[index % colors.length]} />)}
            </Pie>
            <Tooltip content={<CurrencyTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">{centerLabel || 'Total'}</p>
            <p className="text-base font-bold text-ink">{showCurrency ? currency(total, 'INR', true) : number(total)}</p>
          </div>
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {data.map((item, index) => (
          <div key={item[nameKey] || index} className="flex items-center gap-2 text-xs">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[index % colors.length] }} />
            <span className="min-w-0 flex-1 truncate text-muted">{item[nameKey]}</span>
            <span className="font-semibold text-ink">{showCurrency ? currency(item[dataKey], 'INR', true) : number(item[dataKey])}</span>
            <span className="w-10 text-right text-muted">{total ? Math.round((Number(item[dataKey] || 0) / total) * 100) : 0}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function PaymentHistoryChart({ data = [], height = 260 }) {
  const theme = useChartTheme();
  if (!data.length) return <EmptyState title="No payment history yet" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 6, right: 8, left: -14, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} vertical={false} />
        <XAxis dataKey="month" tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value) => currency(value, 'INR', true)} />
        <Tooltip content={<CurrencyTooltip />} cursor={{ fill: theme.grid }} />
        <Legend wrapperStyle={{ fontSize: 11, color: theme.axis }} iconType="circle" iconSize={8} />
        <Bar dataKey="received" name="Received" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={38} />
        <Bar dataKey="pending" name="Pending" stackId="a" fill="#f59e0b" maxBarSize={38} />
        <Bar dataKey="failed" name="Failed" stackId="a" fill="#f43f5e" radius={[6, 6, 0, 0]} maxBarSize={38} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PipelineFunnel({ stages = [], height = 280 }) {
  const theme = useChartTheme();
  if (!stages.length) return <EmptyState title="No pipeline stages" />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={stages} layout="vertical" margin={{ top: 4, right: 18, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke={theme.grid} horizontal={false} />
        <XAxis type="number" tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={92} tick={{ fill: theme.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip content={<CurrencyTooltip />} cursor={{ fill: theme.grid }} />
        <Bar dataKey="count" name="Leads" radius={[0, 6, 6, 0]} maxBarSize={20}>
          {stages.map((stage, index) => <Cell key={stage.id || index} fill={stage.color || chartColors[index % chartColors.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
