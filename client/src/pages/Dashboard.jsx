import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../components/Toast';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';

const COLORS = ['#6366f1', '#38bdf8', '#22d3a0', '#f59e0b', '#f87171', '#a78bfa', '#fb923c', '#14b8a6'];

const CHANNEL_META = {
  mostwda3:   { label: 'Mostwda3',    color: '#6366f1', bg: 'rgba(99,102,241,.12)',  icon: '🏪' },
  saraydecore:{ label: 'Saray Decore',color: '#a78bfa', bg: 'rgba(167,139,250,.12)', icon: '🏛️' },
  chichomz:   { label: 'Chichomz',   color: '#38bdf8', bg: 'rgba(56,189,248,.12)',  icon: '🛒' },
  raneen:     { label: 'Raneen',     color: '#f59e0b', bg: 'rgba(245,158,11,.12)',  icon: '📦' },
};

const STATUS_META = {
  'Delivered':  { badge: 'badge-green',  dot: 'var(--success)' },
  'Shipped':    { badge: 'badge-cyan',   dot: 'var(--info)' },
  'Processing': { badge: 'badge-blue',   dot: '#6366f1' },
  'Pending':    { badge: 'badge-yellow', dot: 'var(--warning)' },
  'On Hold':    { badge: 'badge-orange', dot: '#fb923c' },
  'Cancelled':  { badge: 'badge-red',   dot: 'var(--danger)' },
  'Rejected':   { badge: 'badge-red',   dot: 'var(--danger)' },
  'Failed':     { badge: 'badge-red',   dot: 'var(--danger)' },
};

function getStatusBadge(st) { return (STATUS_META[st] || { badge: 'badge-gray' }).badge; }
function getChannelMeta(ch) { return CHANNEL_META[ch] || { label: ch, color: '#94a3b8', bg: 'rgba(148,163,184,.12)', icon: '🔗' }; }

/* ── KPI CARD ──────────────────────────────────────── */
function KpiCard({ label, value, sub, icon, change, delay = 1 }) {
  return (
    <div className={`card anim-fade-up stagger-${delay}`} style={{ padding: '16px 20px' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{value}</p>
          {change && (
            <p className="text-[10px] mt-1" style={{ color: change.startsWith('+') ? 'var(--success)' : 'var(--danger)' }}>
              {change} vs last month
            </p>
          )}
          {sub && <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{sub}</p>}
        </div>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
          <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
      </div>
    </div>
  );
}

/* ── MINI STAT ─────────────────────────────────────── */
function MiniStat({ label, value, color, delay = 1 }) {
  return (
    <div className={`card anim-fade-up stagger-${delay}`} style={{ padding: '12px 16px', textAlign: 'center' }}>
      <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-lg font-bold" style={{ color: color || 'var(--text-primary)' }}>{value}</p>
    </div>
  );
}

/* ── TOOLTIP ───────────────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--bg-card-solid)', border: '1px solid var(--border-strong)',
      borderRadius: 12, padding: '10px 14px', fontSize: 12, boxShadow: 'var(--shadow-lg)',
    }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 6, fontSize: 11 }}>{label}</p>
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{p.name}:</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            {typeof p.value === 'number' && p.name !== 'count'
              ? `EGP ${p.value.toLocaleString()}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── MAIN ──────────────────────────────────────────── */
export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [prevAnalytics, setPrevAnalytics] = useState(null);
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

  const fetchCompareData = useCallback(() => {
    fetch('/api/analytics').then(r => r.json()).then(data => setPrevAnalytics(data));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchData();
        toast.info('Dashboard refreshed');
      }, 30000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoRefresh, fetchData, toast]);

  useEffect(() => {
    if (compareMode) fetchCompareData();
  }, [compareMode, fetchCompareData]);

  const getChange = (current, prev) => {
    if (!prev || prev === 0) return null;
    const diff = ((current - prev) / prev * 100).toFixed(1);
    return diff >= 0 ? `+${diff}%` : `${diff}%`;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full animate-spin mx-auto mb-4"
          style={{ border: '2px solid var(--border-strong)', borderTopColor: 'var(--accent)' }} />
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{t('loading')}</p>
      </div>
    </div>
  );

  const s             = analytics || {};
  const byChannel     = s.byChannel     || {};
  const salesTrend    = s.salesTrend    || [];
  const topProducts   = s.topProducts   || [];
  const byStatus      = s.byStatus      || {};

  const channelData = Object.entries(byChannel).map(([name, value]) => ({ name, value }));
  const statusData  = Object.entries(byStatus).map(([name, value]) => ({ name, value }));

  return (
    <div className="page-container">

      {/* ── KPI ROW ──────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4 anim-fade-up">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{t('dashboard')}</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => setCompareMode(!compareMode)} className={`btn btn-sm ${compareMode ? 'btn-primary' : 'btn-secondary'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            {compareMode ? 'Comparing' : 'Compare'}
          </button>
          <button onClick={() => setAutoRefresh(!autoRefresh)} className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}>
            <svg className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {autoRefresh ? 'Auto ON' : 'Auto Refresh'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard delay={1} label={t('totalOrders')}  value={s.totalOrders || 0}
          change={compareMode && prevAnalytics ? getChange(s.totalOrders, prevAnalytics.summary?.total_orders) : '+12%'}
          icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        <KpiCard delay={2} label={t('totalRevenue')} value={`EGP ${(s.totalRevenue || 0).toLocaleString()}`}
          change={compareMode && prevAnalytics ? getChange(s.totalRevenue, prevAnalytics.summary?.total_revenue) : '+8%'}
          icon="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <KpiCard delay={3} label={t('totalProfit')}  value={`EGP ${(s.totalProfit || 0).toLocaleString()}`}
          change={compareMode && prevAnalytics ? getChange(s.totalProfit, prevAnalytics.summary?.total_profit) : '+15%'}
          icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        <KpiCard delay={4} label={t('avgMargin')}    value={`${(s.avgMargin || 0).toFixed(1)}%`}
          change={compareMode && prevAnalytics ? getChange(s.avgMargin, prevAnalytics.summary?.avg_margin) : '+3%'}
          icon="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </div>

      {/* ── SECONDARY STATS ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MiniStat delay={1} label="Products"   value={s.totalProducts  || 0} color="var(--info)"    icon="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        <MiniStat delay={2} label="Customers"  value={s.totalCustomers || 0} color="#a78bfa"        icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        <MiniStat delay={3} label="Delayed"    value={s.delayedOrders  || 0} color="var(--danger)"  icon="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        <MiniStat delay={4} label="Delivered"  value={s.deliveredOrders|| 0} color="var(--success)" icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        <MiniStat delay={5} label="Avg Order"  value={`EGP ${(s.avgOrderValue || 0).toLocaleString()}`} color="var(--warning)" icon="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </div>

      {/* ── CHARTS ROW ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Sales Trend */}
        <div className="card anim-fade-up stagger-6 lg:col-span-2">
          <div className="section-header">
            <span className="section-title">Revenue &amp; Profit Trend</span>
            <span className="badge badge-blue">Last 30 days</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={salesTrend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366f1" stopOpacity={.35} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#22d3a0" stopOpacity={.3} />
                  <stop offset="95%" stopColor="#22d3a0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={.4} />
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#gRev)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="profit"  stroke="#22d3a0" fill="url(#gPro)" strokeWidth={2} dot={false} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Orders by Channel donut */}
        <div className="card anim-fade-up stagger-7">
          <div className="section-header">
            <span className="section-title">By Channel</span>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={channelData} cx="50%" cy="50%" innerRadius={48} outerRadius={72}
                paddingAngle={3} dataKey="value" strokeWidth={0}>
                {channelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip content={<ChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {channelData.map((item, i) => {
              const meta = getChannelMeta(item.name);
              const total = channelData.reduce((a, b) => a + b.value, 0);
              const pct   = total ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="text-base">{meta.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[11px] font-500 capitalize truncate" style={{ color: 'var(--text-secondary)' }}>
                        {meta.label}
                      </span>
                      <span className="text-[11px] font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                        {item.value}
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── BOTTOM ROW ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">

        {/* Top Products */}
        <div className="card anim-fade-up stagger-8 lg:col-span-2">
          <div className="section-header">
            <span className="section-title">Top Products</span>
            <span className="badge badge-gray">{topProducts.length} items</span>
          </div>
          <div className="space-y-3">
            {topProducts.slice(0, 6).map((p, i) => {
              const maxRev = topProducts[0]?.revenue || 1;
              const pct    = Math.round((p.revenue / maxRev) * 100);
              return (
                  <div key={i} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-800 text-white flex-shrink-0"
                    style={{ background: COLORS[i % COLORS.length], fontWeight: 800 }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-500 truncate mb-1" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                    <div className="flex items-center gap-2">
                      <div className="progress-bar flex-1">
                        <div className="progress-fill" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                      </div>
                      <span className="text-[10px] font-600 flex-shrink-0" style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                        {p.count}
                      </span>
                    </div>
                  </div>
                  <span className="text-[11px] font-700 flex-shrink-0" style={{ color: 'var(--success)', fontWeight: 700 }}>
                    EGP {(p.revenue || 0).toLocaleString()}
                  </span>
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>{t('noData')}</p>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="card anim-fade-up stagger-8 lg:col-span-3" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="section-header px-6 pt-5 pb-0 mb-0">
            <span className="section-title">Recent Orders</span>
            <button
              onClick={() => navigate('/orders')}
              className="btn btn-ghost btn-xs flex items-center gap-1"
              style={{ color: 'var(--accent)' }}
            >
              View all
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Order', 'Customer', 'Channel', 'Amount', 'Status'].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-[10px] font-700 uppercase tracking-widest"
                      style={{ color: 'var(--text-muted)', fontWeight: 700 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => {
                  const meta = getChannelMeta(o.channel || o.source);
                  return (
                    <tr
                      key={o.id || i}
                      className="table-row cursor-pointer"
                      onClick={() => navigate('/orders')}
                      style={{ animationDelay: `${i * 0.04}s` }}
                    >
                      <td className="px-6">
                        <span className="text-[12px] font-700" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                          #{o.source_order_id}
                        </span>
                      </td>
                      <td className="px-6">
                        <p className="text-[12px] font-500" style={{ color: 'var(--text-primary)' }}>
                          {o.customer_name || '—'}
                        </p>
                        {o.customer_governorate && (
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{o.customer_governorate}</p>
                        )}
                      </td>
                      <td className="px-6">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{meta.icon}</span>
                          <span className="text-[11px] font-500 capitalize" style={{ color: 'var(--text-secondary)' }}>
                            {meta.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-6">
                        <p className="text-[12px] font-700" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                          EGP {(o.total_price || 0).toLocaleString()}
                        </p>
                        {o.profit != null && (
                          <p className="text-[10px] font-600" style={{ color: o.profit > 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600 }}>
                            +EGP {(o.profit || 0).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-6">
                        <span className={`badge ${getStatusBadge(o.status)}`}>
                          <span className="status-dot" style={{ background: (STATUS_META[o.status] || {}).dot || '#94a3b8', width: 5, height: 5 }} />
                          {o.status || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {orders.length === 0 && (
                  <tr><td colSpan={5} className="px-6 py-10 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('noData')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── STATUS BREAKDOWN ─────────────────────────── */}
      {statusData.length > 0 && (
        <div className="card anim-fade-up stagger-9">
          <div className="section-header">
            <span className="section-title">Orders by Status</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {statusData.map((item, i) => {
              const meta  = STATUS_META[item.name] || { badge: 'badge-gray', dot: '#94a3b8' };
              const total = statusData.reduce((a, b) => a + b.value, 0);
              const pct   = total ? Math.round((item.value / total) * 100) : 0;
              return (
                <div key={i} className="metric-chip text-center">
                  <span className={`badge ${meta.badge} mb-2`}>{item.name}</span>
                  <p className="text-[22px] font-800 leading-tight" style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
                    {item.value}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{pct}% of total</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── RECENT ACTIVITY FEED ─────────────────────────── */}
      {orders.length > 0 && (
        <div className="card anim-fade-up stagger-10">
          <div className="section-header">
            <span className="section-title">Recent Activity</span>
            <button onClick={() => navigate('/orders')} className="btn btn-ghost btn-sm text-[11px]">View all</button>
          </div>
          <div className="space-y-0">
            {orders.slice(0, 8).map((order, i) => {
              const meta = CHANNEL_META[order.channel] || CHANNEL_META.mostwda3;
              const stMeta = STATUS_META[order.status] || { badge: 'badge-gray', dot: '#94a3b8' };
              return (
                <div key={order.id} className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[var(--bg-hover)] transition-colors cursor-pointer" onClick={() => navigate('/orders')}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: meta.bg }}>
                    <span className="text-sm">{meta.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold font-mono" style={{ color: 'var(--accent)' }}>#{order.source_order_id}</span>
                      <span className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{order.customer_name || 'Customer'}</span>
                    </div>
                    <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{order.product_name || 'Order'} · {meta.label}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>EGP {(order.total_price || 0).toLocaleString()}</p>
                    <span className={`badge text-[9px] ${stMeta.badge}`}>{order.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
