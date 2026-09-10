import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar, Legend, ComposedChart, Line,
} from 'recharts';

const COLORS = ['#6366f1', '#38bdf8', '#22d3a0', '#f59e0b', '#f87171', '#a78bfa', '#fb923c', '#14b8a6'];

const STATUS_COLORS = {
  'Delivered':  '#22d3a0',
  'Shipped':    '#38bdf8',
  'Processing': '#6366f1',
  'Pending':    '#fbbf24',
  'On Hold':    '#fb923c',
  'Cancelled':  '#f87171',
  'Rejected':   '#f87171',
  'Failed':     '#f87171',
};

/* ── SHARED TOOLTIP ────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card-solid)',
      border: '1px solid var(--border-strong)',
      borderRadius: 12,
      padding: '10px 14px',
      fontSize: 12,
      boxShadow: 'var(--shadow-lg)',
      minWidth: 140,
    }}>
      {label && <p style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: 11 }}>{label}</p>}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', flex: 1 }}>{p.name}:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
            {p.name === 'revenue' || p.name === 'profit'
              ? `EGP ${Number(p.value).toLocaleString()}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const axisStyle = { stroke: 'var(--text-muted)', fontSize: 10 };
const gridStyle = { strokeDasharray: '3 3', stroke: 'var(--border)', opacity: 0.5 };

/* ── KPI CARD ──────────────────────────────────────── */
function KpiCard({ label, value, gradient, icon, delay = 1 }) {
  return (
    <div className={`stat-card anim-fade-up stagger-${delay}`} style={{ overflow: 'hidden' }}>
      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: gradient }} />
      <div className="absolute top-0 right-0 w-20 h-20 rounded-full opacity-10 pointer-events-none"
        style={{ background: gradient, filter: 'blur(28px)', transform: 'translate(30%,-30%)' }} />
      <div className="flex items-center justify-between relative">
        <div>
          <p className="text-[10px] font-700 uppercase tracking-widest mb-1.5"
            style={{ color: 'var(--text-muted)', fontWeight: 700, letterSpacing: '0.08em' }}>
            {label}
          </p>
          <p className="text-[22px] font-800 anim-count"
            style={{ color: 'var(--text-primary)', fontWeight: 800, letterSpacing: '-0.02em' }}>
            {value}
          </p>
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: gradient, boxShadow: '0 4px 14px rgba(0,0,0,.2)' }}>
          <span className="text-base">{icon}</span>
        </div>
      </div>
    </div>
  );
}

/* ── CHART CARD ────────────────────────────────────── */
function ChartCard({ title, badge, children, className = '', delay = 1 }) {
  return (
    <div className={`card anim-fade-up stagger-${delay} ${className}`}>
      <div className="section-header">
        <span className="section-title">{title}</span>
        {badge && <span className="badge badge-gray">{badge}</span>}
      </div>
      {children}
    </div>
  );
}

/* ── MAIN ──────────────────────────────────────────── */
export default function Analytics() {
  const { t }               = useTranslation();
  const [data, setData]     = useState(null);
  const [loading, setLoad]  = useState(true);
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    setLoad(true);
    const p = timeRange !== 'all' ? `?days=${timeRange}` : '';
    fetch(`/api/analytics${p}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoad(false); });
  }, [timeRange]);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-10 h-10 rounded-full animate-spin"
        style={{ border: '2px solid var(--border-strong)', borderTopColor: 'var(--accent)' }} />
    </div>
  );

  const s            = data || {};
  const salesTrend   = s.salesTrend    || [];
  const topProducts  = s.topProducts   || [];
  const hourlyOrders = s.hourlyOrders  || [];

  const channelData = Object.entries(s.byChannel     || {}).map(([name, value]) => ({ name, value }));
  const statusData  = Object.entries(s.byStatus      || {}).map(([name, value]) => ({ name, value }));
  const govData     = Object.entries(s.byGovernorate || {}).map(([name, value]) => ({ name, value })).slice(0, 10);

  const totalOrders = statusData.reduce((a, b) => a + b.value, 0) || 1;

  return (
    <div className="page-container">

      {/* Time range + KPIs */}
      <div className="flex items-center justify-between anim-fade-up">
        <p className="text-[13px]" style={{ color: 'var(--text-muted)' }}>
          Showing data for{' '}
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {timeRange === 'all' ? 'all time' : `last ${timeRange} days`}
          </span>
        </p>
        <div className="flex items-center gap-1.5 p-1 rounded-xl border" style={{ borderColor: 'var(--border-strong)', background: 'var(--bg-hover)' }}>
          {[['all','All'],['7','7d'],['30','30d'],['90','90d']].map(([val, lbl]) => (
            <button key={val} onClick={() => setTimeRange(val)}
              className={`btn btn-xs ${timeRange === val ? 'btn-primary' : 'btn-ghost'}`}
              style={{ minWidth: 38 }}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard delay={1} label={t('totalRevenue')} gradient="var(--gradient-2)" icon="💰"
          value={`EGP ${(s.totalRevenue || 0).toLocaleString()}`} />
        <KpiCard delay={2} label={t('totalProfit')}  gradient="var(--gradient-3)" icon="📈"
          value={`EGP ${(s.totalProfit || 0).toLocaleString()}`} />
        <KpiCard delay={3} label={t('avgMargin')}    gradient="var(--gradient-1)" icon="%" 
          value={`${(s.avgMargin || 0).toFixed(1)}%`} />
        <KpiCard delay={4} label={t('totalOrders')}  gradient="var(--gradient-4)" icon="🧾"
          value={(s.totalOrders || 0).toLocaleString()} />
      </div>

      {/* Revenue trend + channel donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        <ChartCard title="Revenue & Profit Over Time" delay={5} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={salesTrend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="aRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="date" {...axisStyle} tickLine={false} axisLine={false} />
              <YAxis {...axisStyle} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#aRev)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit"  stroke="#22d3a0" strokeWidth={2.5} dot={false} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Orders by Channel" delay={6}>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={channelData} cx="50%" cy="50%"
                innerRadius={52} outerRadius={76} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2.5 mt-3">
            {channelData.map((item, i) => {
              const total = channelData.reduce((a, b) => a + b.value, 0) || 1;
              const pct   = Math.round((item.value / total) * 100);
              return (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="text-[11px] flex-1 capitalize truncate" style={{ color: 'var(--text-secondary)' }}>
                    {item.name}
                  </span>
                  <span className="text-[11px] font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                    {item.value}
                  </span>
                  <span className="text-[10px] w-8 text-right" style={{ color: 'var(--text-muted)' }}>
                    {pct}%
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>

      </div>

      {/* Status + Governorate + Hourly */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Status breakdown */}
        <ChartCard title="Orders by Status" delay={7}>
          <div className="space-y-2.5">
            {statusData.map((item, i) => {
              const color = STATUS_COLORS[item.name] || COLORS[i % COLORS.length];
              const pct   = Math.round((item.value / totalOrders) * 100);
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: color }} />
                      <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{item.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{item.value}</span>
                      <span className="text-[10px] w-7 text-right" style={{ color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
                  </div>
                </div>
              );
            })}
            {statusData.length === 0 && (
              <p className="text-xs text-center py-6" style={{ color: 'var(--text-muted)' }}>{t('noData')}</p>
            )}
          </div>
        </ChartCard>

        {/* Top Governorates */}
        <ChartCard title="Top Governorates" delay={8}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={govData} layout="vertical" margin={{ top: 0, right: 8, left: -8, bottom: 0 }}>
              <CartesianGrid {...gridStyle} horizontal={false} />
              <XAxis type="number" {...axisStyle} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" {...axisStyle} width={72} tickLine={false} axisLine={false} fontSize={9} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" fill="#38bdf8" radius={[0, 6, 6, 0]} maxBarSize={14}>
                {govData.map((_, i) => (
                  <Cell key={i} fill={`rgba(56,189,248,${1 - i * 0.07})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Orders by Hour */}
        <ChartCard title="Orders by Hour" delay={9}>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hourlyOrders} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="aHour" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f59e0b" stopOpacity={.35} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} />
              <XAxis dataKey="hour" {...axisStyle} tickLine={false} axisLine={false} />
              <YAxis {...axisStyle} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="count" stroke="#f59e0b" fill="url(#aHour)" strokeWidth={2} dot={false} name="orders" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* Top Products */}
      <ChartCard title="Top Products by Revenue" delay={9}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {topProducts.slice(0, 10).map((p, i) => {
            const maxRev = topProducts[0]?.revenue || 1;
            const pct    = Math.round((p.revenue / maxRev) * 100);
            return (
              <div key={i}
                className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                style={{ border: '1px solid var(--border)', background: 'var(--bg-hover)' }}
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-800 text-white flex-shrink-0"
                  style={{ background: COLORS[i % COLORS.length], fontWeight: 800 }}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-500 truncate mb-1.5" style={{ color: 'var(--text-primary)' }}>
                    {p.name}
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="progress-bar flex-1">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <span className="text-[10px] font-600 flex-shrink-0" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                      {p.count} orders
                    </span>
                  </div>
                </div>
                <span className="text-[12px] font-700 flex-shrink-0" style={{ color: 'var(--success)', fontWeight: 700 }}>
                  EGP {(p.revenue || 0).toLocaleString()}
                </span>
              </div>
            );
          })}
          {topProducts.length === 0 && (
            <div className="col-span-2">
              <p className="text-xs text-center py-8" style={{ color: 'var(--text-muted)' }}>{t('noData')}</p>
            </div>
          )}
        </div>
      </ChartCard>

      {/* Revenue by channel bar */}
      {channelData.length > 0 && (
        <ChartCard title="Revenue by Channel" delay={9}>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={channelData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="name" {...axisStyle} tickLine={false} axisLine={false} />
              <YAxis {...axisStyle} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="value" name="orders" radius={[6, 6, 0, 0]} maxBarSize={48}>
                {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

    </div>
  );
}
