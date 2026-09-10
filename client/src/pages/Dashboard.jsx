import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

/* ── Palette ──────────────────────────────────────── */
const CHART_COLORS = ['#8a6e2f', '#607b56', '#5b5ea6', '#2d8f7e', '#a64458', '#a06020', '#2878a0', '#2d7d5a'];

const CHANNEL_META = {
  mostwda3:    { label: 'Mostwda3',     color: '#8a6e2f', bg: 'rgba(138,110,47,.12)',  icon: '🏪' },
  saraydecore: { label: 'Saray Decore', color: '#5b5ea6', bg: 'rgba(91,94,166,.12)',   icon: '🏛️' },
  chichomz:    { label: 'Chichomz',     color: '#2878a0', bg: 'rgba(40,120,160,.12)',  icon: '🛒' },
  raneen:      { label: 'Raneen',       color: '#607b56', bg: 'rgba(96,123,86,.12)',   icon: '📦' },
};

const STATUS_META = {
  'Delivered':  { badge: 'badge-green',  dot: 'var(--success)' },
  'Shipped':    { badge: 'badge-cyan',   dot: 'var(--info)' },
  'Processing': { badge: 'badge-blue',   dot: '#5b5ea6' },
  'Pending':    { badge: 'badge-yellow', dot: 'var(--warning)' },
  'On Hold':    { badge: 'badge-orange', dot: '#b86000' },
  'Cancelled':  { badge: 'badge-red',    dot: 'var(--danger)' },
  'Rejected':   { badge: 'badge-red',    dot: 'var(--danger)' },
  'Failed':     { badge: 'badge-red',    dot: 'var(--danger)' },
};

function getStatusBadge(st)   { return (STATUS_META[st] || { badge: 'badge-gray' }).badge; }
function getStatusDot(st)     { return (STATUS_META[st] || { dot: 'var(--text-muted)' }).dot; }
function getChannelMeta(ch)   { return CHANNEL_META[ch] || { label: ch, color: '#9c8c78', bg: 'rgba(156,140,120,.12)', icon: '🔗' }; }

/* ── Custom Tooltip ───────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card-solid)',
      border: '1px solid var(--border-strong)',
      borderRadius: 'var(--radius-md)',
      padding: '10px 16px',
      fontSize: 12,
      boxShadow: 'var(--shadow-lg)',
      fontFamily: "'DM Sans', sans-serif",
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 7, fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.name}:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600, marginLeft: 'auto', paddingLeft: 8 }}>
            {typeof p.value === 'number' && p.name !== 'count'
              ? `EGP ${p.value.toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── KPI Card ─────────────────────────────────────── */
function KpiCard({ label, value, sub, iconPath, change, accentColor, delay = 1 }) {
  const isPositive = change && change.startsWith('+');
  const isNegative = change && change.startsWith('-');
  return (
    <div
      className={`stat-card anim-fade-up stagger-${delay}`}
      style={{ paddingTop: 24 }}
    >
      {/* Icon */}
      <div style={{
        position: 'absolute', top: 20, right: 20,
        width: 38, height: 38, borderRadius: 12,
        background: accentColor ? `${accentColor}18` : 'var(--accent-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg style={{ width: 17, height: 17, color: accentColor || 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={iconPath} />
        </svg>
      </div>

      <p className="kpi-label" style={{ marginBottom: 8 }}>{label}</p>
      <p className="kpi-value">{value}</p>

      {change && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20,
            background: isPositive ? 'var(--success-bg)' : isNegative ? 'var(--danger-bg)' : 'var(--bg-hover)',
            color: isPositive ? 'var(--success)' : isNegative ? 'var(--danger)' : 'var(--text-muted)',
          }}>
            {isPositive ? '↑' : isNegative ? '↓' : ''}
            {change}
          </span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs last month</span>
        </div>
      )}
      {sub && !change && (
        <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{sub}</p>
      )}
    </div>
  );
}

/* ── Mini Stat ────────────────────────────────────── */
function MiniStat({ label, value, color, iconPath, delay = 1 }) {
  return (
    <div
      className={`card card-sm anim-fade-up stagger-${delay}`}
      style={{ display: 'flex', alignItems: 'center', gap: 14 }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: color ? `${color}15` : 'var(--accent-glow)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg style={{ width: 16, height: 16, color: color || 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={iconPath} />
        </svg>
      </div>
      <div>
        <p className="kpi-label" style={{ marginBottom: 2, fontSize: 10 }}>{label}</p>
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, fontWeight: 400, color: color || 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
      </div>
    </div>
  );
}

/* ── Section wrapper ──────────────────────────────── */
function Section({ title, badge, action, children, delay = 1, style = {} }) {
  return (
    <div className={`card anim-fade-up stagger-${delay}`} style={style}>
      <div className="section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="ornament" style={{ margin: 0, height: 14, width: 3, borderRadius: 2, background: 'var(--accent)' }} />
          <span className="section-title">{title}</span>
          {badge && <span className="badge badge-gray" style={{ fontSize: 10 }}>{badge}</span>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

/* ── Channel legend row ───────────────────────────── */
function ChannelRow({ item, index, total }) {
  const meta = getChannelMeta(item.name);
  const pct  = total ? Math.round((item.value / total) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 0' }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>{meta.icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
            {meta.label}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }}>{item.value}</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${pct}%`, background: CHART_COLORS[index % CHART_COLORS.length] }}
          />
        </div>
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, width: 30, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

/* ── Top Product Row ──────────────────────────────── */
function ProductRow({ product, index, maxRevenue }) {
  const pct = maxRevenue ? Math.round((product.revenue / maxRevenue) * 100) : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        background: CHART_COLORS[index % CHART_COLORS.length],
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Serif Display', serif", fontSize: 13, color: '#fff', fontWeight: 400,
      }}>
        {index + 1}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.name}
        </p>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%`, background: CHART_COLORS[index % CHART_COLORS.length] }} />
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)' }}>EGP {(product.revenue || 0).toLocaleString()}</p>
        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>{product.count} sold</p>
      </div>
    </div>
  );
}

/* ── Main ─────────────────────────────────────────── */
export default function Dashboard() {
  const { t }    = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [analytics,    setAnalytics]    = useState(null);
  const [orders,       setOrders]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [autoRefresh,  setAutoRefresh]  = useState(false);
  const [compareMode,  setCompareMode]  = useState(false);
  const [prevData,     setPrevData]     = useState(null);
  const intervalRef = useRef(null);

  const fetchData = useCallback(() => {
    Promise.all([
      fetch('/api/analytics').then(r => r.json()),
      fetch('/api/orders?limit=8&sortBy=order_date&sortDir=desc').then(r => r.json()),
    ]).then(([a, o]) => {
      setAnalytics(a);
      setOrders(o.orders || o);
      setLoading(false);
    });
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchData();
        toast.info('Dashboard refreshed');
      }, 30000);
    }
    return () => clearInterval(intervalRef.current);
  }, [autoRefresh, fetchData, toast]);

  useEffect(() => {
    if (compareMode) {
      fetch('/api/analytics').then(r => r.json()).then(setPrevData);
    }
  }, [compareMode]);

  const getChange = (curr, prev) => {
    if (!prev || prev === 0) return null;
    const d = ((curr - prev) / prev * 100).toFixed(1);
    return d >= 0 ? `+${d}%` : `${d}%`;
  };

  /* Loading */
  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div
          className="mx-auto mb-5"
          style={{
            width: 40, height: 40, borderRadius: '50%',
            border: '2px solid var(--border-strong)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--text-muted)' }}>
          {t('loading')}
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const s           = analytics || {};
  const byChannel   = s.byChannel   || {};
  const salesTrend  = s.salesTrend  || [];
  const topProducts = s.topProducts || [];
  const byStatus    = s.byStatus    || {};

  const channelData = Object.entries(byChannel).map(([name, value]) => ({ name, value }));
  const statusData  = Object.entries(byStatus).map(([name, value]) => ({ name, value }));
  const channelTotal = channelData.reduce((a, b) => a + b.value, 0);

  return (
    <div className="page-container">
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* ── Page Header ─────────────────────────────── */}
      <div className="page-header anim-fade-up">
        <div>
          <h1 className="page-title">{t('dashboard')}</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`btn btn-sm ${compareMode ? 'btn-primary' : 'btn-secondary'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {compareMode ? 'Comparing' : 'Compare'}
          </button>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}
          >
            <svg className={`w-4 h-4 ${autoRefresh ? 'anim-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={autoRefresh ? { animation: 'spin 1.4s linear infinite' } : {}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {autoRefresh ? 'Live' : 'Auto Refresh'}
          </button>
        </div>
      </div>

      {/* ── KPI Row ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <KpiCard
          delay={1} label={t('totalOrders')} value={s.totalOrders || 0}
          change={compareMode && prevData ? getChange(s.totalOrders, prevData.summary?.total_orders) : '+12%'}
          iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
          accentColor="#8a6e2f"
        />
        <KpiCard
          delay={2} label={t('totalRevenue')} value={`EGP ${(s.totalRevenue || 0).toLocaleString()}`}
          change={compareMode && prevData ? getChange(s.totalRevenue, prevData.summary?.total_revenue) : '+8%'}
          iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          accentColor="#607b56"
        />
        <KpiCard
          delay={3} label={t('totalProfit')} value={`EGP ${(s.totalProfit || 0).toLocaleString()}`}
          change={compareMode && prevData ? getChange(s.totalProfit, prevData.summary?.total_profit) : '+15%'}
          iconPath="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
          accentColor="#2d7d5a"
        />
        <KpiCard
          delay={4} label={t('avgMargin')} value={`${(s.avgMargin || 0).toFixed(1)}%`}
          change={compareMode && prevData ? getChange(s.avgMargin, prevData.summary?.avg_margin) : '+3%'}
          iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          accentColor="#5b5ea6"
        />
      </div>

      {/* ── Secondary Stats ──────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <MiniStat delay={1} label="Products"  value={s.totalProducts  || 0} color="#2878a0"
          iconPath="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        <MiniStat delay={2} label="Customers" value={s.totalCustomers || 0} color="#5b5ea6"
          iconPath="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        <MiniStat delay={3} label="Delayed"   value={s.delayedOrders  || 0} color="var(--danger)"
          iconPath="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        <MiniStat delay={4} label="Delivered" value={s.deliveredOrders || 0} color="var(--success)"
          iconPath="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <MiniStat delay={5} label="Avg Order" value={`EGP ${(s.avgOrderValue || 0).toLocaleString()}`} color="var(--warning)"
          iconPath="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </div>

      {/* ── Charts Row ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)', gap: 20 }}>

          {/* Revenue & Profit Trend */}
          <Section
            title="Revenue & Profit Trend"
            badge="Last 30 days"
            delay={6}
          >
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={salesTrend} margin={{ top: 6, right: 6, left: -12, bottom: 0 }}>
                <defs>
                  <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#8a6e2f" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8a6e2f" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#607b56" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#607b56" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  dy={6}
                />
                <YAxis
                  stroke="var(--text-muted)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#8a6e2f" fill="url(#gRev)" strokeWidth={2.5} dot={false} />
                <Area type="monotone" dataKey="profit"  stroke="#607b56" fill="url(#gPro)" strokeWidth={2.5} dot={false} />
                <Legend
                  wrapperStyle={{ fontSize: 12, paddingTop: 14, fontFamily: "'DM Sans', sans-serif", color: 'var(--text-muted)' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Section>

          {/* By Channel donut */}
          <Section title="By Channel" delay={7}>
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={channelData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {channelData.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<ChartTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop: 4 }}>
              {channelData.map((item, i) => (
                <ChannelRow key={i} item={item} index={i} total={channelTotal} />
              ))}
              {channelData.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>
                  {t('noData')}
                </p>
              )}
            </div>
          </Section>
        </div>

        {/* ── Bottom Row ─────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(0,3fr)', gap: 20 }}>

          {/* Top Products */}
          <Section
            title="Top Products"
            badge={`${topProducts.length} items`}
            delay={8}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {topProducts.slice(0, 6).map((p, i) => (
                <ProductRow
                  key={i}
                  product={p}
                  index={i}
                  maxRevenue={topProducts[0]?.revenue || 1}
                />
              ))}
              {topProducts.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 12, padding: '16px 0' }}>
                  {t('noData')}
                </p>
              )}
            </div>
          </Section>

          {/* Recent Orders */}
          <Section
            title="Recent Orders"
            delay={8}
            style={{ padding: 0 }}
            action={
              <button
                onClick={() => navigate('/orders')}
                className="btn btn-ghost btn-xs"
                style={{ color: 'var(--accent)' }}
              >
                View all
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            }
          >
            {/* Override section-header padding since card has padding 0 */}
            <div style={{ padding: '24px 24px 0', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--accent)', flexShrink: 0 }} />
                  <span className="section-title">Recent Orders</span>
                </div>
                <button onClick={() => navigate('/orders')} className="btn btn-ghost btn-xs" style={{ color: 'var(--accent)' }}>
                  View all
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Order', 'Customer', 'Channel', 'Amount', 'Status'].map(h => (
                      <th
                        key={h}
                        style={{
                          padding: '8px 20px', textAlign: 'left',
                          fontSize: 10, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.08em',
                          color: 'var(--text-muted)',
                          background: 'var(--bg-secondary)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, i) => {
                    const ch = getChannelMeta(order.source);
                    return (
                      <tr key={i} className="table-row" style={{ cursor: 'pointer' }} onClick={() => navigate('/orders')}>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--accent)' }}>
                            #{order.order_number || order.id}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                              background: 'var(--bg-hover)',
                              border: '1px solid var(--border)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)',
                              fontFamily: "'DM Serif Display', serif",
                            }}>
                              {(order.customer_name || 'U')[0].toUpperCase()}
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {order.customer_name || '—'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: 12 }}>{ch.icon}</span>
                          <span style={{ fontSize: 11, marginLeft: 5, color: 'var(--text-muted)', fontWeight: 500 }}>{ch.label}</span>
                        </td>
                        <td>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>
                            EGP {(order.total || 0).toLocaleString()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span
                              className="status-dot"
                              style={{ background: getStatusDot(order.status) }}
                            />
                            <span className={`badge ${getStatusBadge(order.status)}`}>
                              {order.status || 'Unknown'}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {orders.length === 0 && (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: 32, color: 'var(--text-muted)', fontSize: 13 }}>
                        {t('noData')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {/* Padding bottom */}
            <div style={{ height: 8 }} />
          </Section>
        </div>
      </div>

      {/* ── Status Breakdown ─────────────────────────── */}
      {statusData.length > 0 && (
        <Section title="Orders by Status" delay={9}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
            {statusData.map((item, i) => (
              <div
                key={i}
                className="metric-chip"
                style={{ cursor: 'default' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginBottom: 6 }}>
                  <span className="status-dot" style={{ background: getStatusDot(item.name) }} />
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                    {item.name}
                  </span>
                </div>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1, textAlign: 'center' }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
