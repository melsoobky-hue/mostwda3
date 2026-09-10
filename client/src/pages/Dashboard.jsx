import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useApi } from '../hooks/useApi';

/* ── Palette ──────────────────────────────────────── */
const CHART_COLORS = ['#8a6e2f','#607b56','#5b5ea6','#2d8f7e','#a64458','#a06020','#2878a0','#2d7d5a'];

const CHANNEL_META = {
  mostwda3:    { label: 'Mostwda3',     color: '#8a6e2f', icon: '🏪' },
  saraydecore: { label: 'Saray Decore', color: '#5b5ea6', icon: '🏛️' },
  chichomz:    { label: 'Chichomz',     color: '#2878a0', icon: '🛒' },
  raneen:      { label: 'Raneen',       color: '#607b56', icon: '📦' },
};
const STATUS_DOT = {
  Delivered: 'var(--success)', Shipped: 'var(--info)',
  Processing: '#5b5ea6',       Pending: 'var(--warning)',
  'On Hold':  '#b86000',       Cancelled: 'var(--danger)',
  Rejected:   'var(--danger)', Failed: 'var(--danger)',
};
function ch(name)  { return CHANNEL_META[name] || { label: name, color: '#9c8c78', icon: '🔗' }; }
function dot(st)   { return STATUS_DOT[st] || 'var(--text-muted)'; }
function badge(st) {
  const m = { Delivered:'badge-green', Shipped:'badge-cyan', Processing:'badge-blue',
               Pending:'badge-yellow', 'On Hold':'badge-orange', Cancelled:'badge-red',
               Rejected:'badge-red', Failed:'badge-red' };
  return m[st] || 'badge-gray';
}

/* ── Shared tooltip ───────────────────────────────── */
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--bg-card-solid)', border:'1px solid var(--border-strong)',
      borderRadius:'var(--radius-md)', padding:'10px 16px', fontSize:12,
      boxShadow:'var(--shadow-lg)', fontFamily:"'DM Sans',sans-serif" }}>
      <p style={{ color:'var(--text-muted)', marginBottom:7, fontSize:11,
        fontWeight:600, letterSpacing:'0.04em', textTransform:'uppercase' }}>{label}</p>
      {payload.map((p,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
          <span style={{ width:8,height:8,borderRadius:'50%',background:p.color,display:'inline-block',flexShrink:0 }}/>
          <span style={{ color:'var(--text-secondary)', textTransform:'capitalize' }}>{p.name}:</span>
          <span style={{ color:'var(--text-primary)', fontWeight:600, marginLeft:'auto', paddingLeft:8 }}>
            {typeof p.value==='number' && p.name!=='count' ? `EGP ${p.value.toLocaleString()}` : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/* ── KPI Card ─────────────────────────────────────── */
function KpiCard({ label, value, change, iconPath, accentColor, delay=1 }) {
  const pos = change?.startsWith('+');
  const neg = change?.startsWith('-');
  return (
    <div className={`stat-card anim-fade-up stagger-${delay}`} style={{ paddingTop:24 }}>
      <div style={{ position:'absolute', top:20, right:20, width:38, height:38, borderRadius:12,
        background: accentColor ? `${accentColor}18` : 'var(--accent-glow)',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg style={{ width:17, height:17, color: accentColor||'var(--accent)' }}
          fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={iconPath}/>
        </svg>
      </div>
      <p className="kpi-label" style={{ marginBottom:8 }}>{label}</p>
      <p className="kpi-value">{value}</p>
      {change && (
        <div style={{ display:'flex', alignItems:'center', gap:5, marginTop:8 }}>
          <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:11,
            fontWeight:600, padding:'2px 7px', borderRadius:20,
            background: pos ? 'var(--success-bg)' : neg ? 'var(--danger-bg)' : 'var(--bg-hover)',
            color: pos ? 'var(--success)' : neg ? 'var(--danger)' : 'var(--text-muted)' }}>
            {pos ? '↑' : neg ? '↓' : ''}{change}
          </span>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>vs prev period</span>
        </div>
      )}
    </div>
  );
}

/* ── Today Banner ─────────────────────────────────── */
function TodayBanner({ data }) {
  if (!data) return null;
  const items = [
    { label: "Today's Orders",   value: data.orders,   color: '#8a6e2f' },
    { label: "Today's Revenue",  value: `EGP ${(data.revenue||0).toLocaleString()}`, color: '#607b56' },
    { label: "Today's Profit",   value: `EGP ${(data.profit||0).toLocaleString()}`,  color: '#2d7d5a' },
    { label: 'Delivered Today',  value: data.delivered, color: 'var(--success)' },
    { label: 'Delayed',          value: data.delayed,   color: 'var(--warning)' },
  ];
  return (
    <div className="anim-fade-up" style={{ background:'var(--bg-card)', border:'1px solid var(--border)',
      borderRadius:'var(--radius-xl)', padding:'14px 22px', boxShadow:'var(--shadow-card)',
      display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
      borderLeft:'3px solid var(--accent)' }}>
      <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase',
        letterSpacing:'0.08em', color:'var(--text-muted)', marginRight:8 }}>Today</span>
      {items.map((it,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:6,
          padding:'5px 14px', borderRadius:20,
          background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>
          <span style={{ fontSize:11, color:'var(--text-muted)' }}>{it.label}</span>
          <span style={{ fontFamily:"'DM Serif Display',serif", fontSize:16, fontWeight:400,
            color: it.color, lineHeight:1 }}>{it.value}</span>
        </div>
      ))}
      <span style={{ marginLeft:'auto', fontSize:10, color:'var(--text-muted)' }}>
        {new Date().toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
      </span>
    </div>
  );
}

/* ── Alerts Banner ────────────────────────────────── */
function AlertsBanner({ alerts, onNavigate }) {
  const [dismissed, setDismissed] = useState(false);
  if (!alerts?.alerts?.length || dismissed) return null;
  const danger  = alerts.alerts.filter(a => a.type === 'danger').reduce((s,a)=>s+a.count,0);
  const warning = alerts.alerts.filter(a => a.type === 'warning').reduce((s,a)=>s+a.count,0);
  return (
    <div className="anim-fade-up" style={{ background:'var(--warning-bg)',
      border:'1px solid rgba(184,115,51,0.2)', borderRadius:'var(--radius-xl)',
      padding:'12px 18px', display:'flex', alignItems:'center', gap:12 }}>
      <svg style={{ width:18, height:18, color:'var(--warning)', flexShrink:0 }}
        fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
      <span style={{ fontSize:13, color:'var(--text-primary)', flex:1 }}>
        {danger > 0 && <strong style={{ color:'var(--danger)' }}>{danger} critical</strong>}
        {danger > 0 && warning > 0 && ' · '}
        {warning > 0 && <strong style={{ color:'var(--warning)' }}>{warning} warnings</strong>}
        {' '}need attention
      </span>
      <div style={{ display:'flex', gap:6 }}>
        <button onClick={() => onNavigate('/sync')} className="btn btn-xs btn-secondary">
          View Alerts
        </button>
        <button onClick={() => setDismissed(true)} className="btn btn-ghost btn-xs"
          style={{ padding:'4px 6px' }}>✕</button>
      </div>
    </div>
  );
}

/* ── Sync Status Widget ───────────────────────────── */
function SyncWidget({ status, onSync }) {
  const sources = ['mostwda3','saraydecore','chichomz','raneen'];
  const STATE_COLOR = { running:'var(--warning)', success:'var(--success)',
    failed:'var(--danger)', skipped:'var(--text-muted)', idle:'var(--border-hover)' };
  return (
    <div className="card card-sm" style={{ display:'flex', flexDirection:'column', gap:10 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:2 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:3, height:14, borderRadius:2, background:'var(--accent)', flexShrink:0 }}/>
          <span className="section-title">Sync Status</span>
        </div>
        <button onClick={onSync} disabled={status?.isRunning}
          className="btn btn-xs btn-secondary" style={{ gap:5 }}>
          <svg style={{ width:12, height:12,
            animation: status?.isRunning ? 'spin 1s linear infinite' : 'none' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          {status?.isRunning ? 'Syncing…' : 'Sync Now'}
        </button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:6 }}>
        {sources.map(src => {
          const s = status?.sources?.[src] || {};
          const stateColor = STATE_COLOR[s.state] || STATE_COLOR.idle;
          const meta = CHANNEL_META[src] || { icon:'🔗', label: src };
          return (
            <div key={src} style={{ display:'flex', alignItems:'center', gap:8,
              padding:'7px 10px', borderRadius:'var(--radius-md)',
              background:'var(--bg-secondary)', border:'1px solid var(--border)' }}>
              <span style={{ fontSize:14 }}>{meta.icon}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)',
                  overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                  {meta.label}
                </p>
                {s.lastSuccess && (
                  <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:1 }}>
                    {new Date(s.lastSuccess).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
                  </p>
                )}
              </div>
              <div style={{ width:8, height:8, borderRadius:'50%', flexShrink:0,
                background: stateColor,
                boxShadow: s.state==='running' ? `0 0 6px ${stateColor}` : 'none',
                animation: s.state==='running' ? 'pulse 1.2s ease-in-out infinite' : 'none' }}/>
            </div>
          );
        })}
      </div>
      {status?.lastRun && (
        <p style={{ fontSize:10, color:'var(--text-muted)', textAlign:'center' }}>
          Last sync: {new Date(status.lastRun).toLocaleString([],{hour:'2-digit',minute:'2-digit',month:'short',day:'numeric'})}
        </p>
      )}
    </div>
  );
}

/* ── Section wrapper ──────────────────────────────── */
function Section({ title, badge, action, children, style={} }) {
  return (
    <div className="card" style={style}>
      {(title || action) && (
        <div className="section-header">
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:3, height:14, borderRadius:2, background:'var(--accent)', flexShrink:0 }}/>
            <span className="section-title">{title}</span>
            {badge && <span className="badge badge-gray" style={{ fontSize:10 }}>{badge}</span>}
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Main ─────────────────────────────────────────── */
export default function Dashboard() {
  const { t }    = useTranslation();
  const navigate = useNavigate();

  // ── Data fetching via useApi (stale-while-revalidate) ──────────────────
  const { data: analytics, loading: analyticsLoading, background: analyticsBg, refresh: refreshAnalytics } =
    useApi('/api/analytics', { ttl: 120_000 });

  const { data: today, refresh: refreshToday } =
    useApi('/api/analytics/today', { ttl: 60_000, refreshInterval: 60_000 });

  const { data: recentOrders } =
    useApi('/api/orders?limit=8&sortBy=order_date&sortDir=desc', { ttl: 90_000 });

  const { data: syncStatus, refresh: refreshSync } =
    useApi('/api/sync/status', { ttl: 15_000, refreshInterval: 15_000 });

  const { data: alerts } =
    useApi('/api/alerts', { ttl: 120_000, refreshInterval: 120_000 });

  // ── Compare mode (proper prev-period logic) ────────────────────────────
  const [compareMode,  setCompareMode]  = useState(false);
  const [prevData,     setPrevData]     = useState(null);
  const [autoRefresh,  setAutoRefresh]  = useState(false);
  const autoRef = useRef(null);

  useEffect(() => {
    if (compareMode) {
      // Fetch previous 30-day window for real comparison
      const to   = new Date(); to.setDate(to.getDate() - 30);
      const from = new Date(to); from.setDate(from.getDate() - 30);
      const fmt  = d => d.toISOString().split('T')[0];
      fetch(`/api/analytics?dateFrom=${fmt(from)}&dateTo=${fmt(to)}`)
        .then(r => r.json()).then(setPrevData);
    } else {
      setPrevData(null);
    }
  }, [compareMode]);

  useEffect(() => {
    if (autoRefresh) {
      autoRef.current = setInterval(() => {
        refreshAnalytics(); refreshToday(); refreshSync();
      }, 30_000);
    }
    return () => clearInterval(autoRef.current);
  }, [autoRefresh, refreshAnalytics, refreshToday, refreshSync]);

  const getChange = (curr, prev) => {
    if (prev == null || prev === 0) return null;
    const d = ((curr - prev) / prev * 100).toFixed(1);
    return d >= 0 ? `+${d}%` : `${d}%`;
  };

  const handleSyncNow = async () => {
    await fetch('/api/sync/run', { method: 'POST' });
    setTimeout(refreshSync, 1000);
  };

  // ── Loading skeleton ────────────────────────────────────────────────────
  if (analyticsLoading && !analytics) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div className="mx-auto mb-5" style={{ width:40, height:40, borderRadius:'50%',
          border:'2px solid var(--border-strong)', borderTopColor:'var(--accent)',
          animation:'spin 0.8s linear infinite' }}/>
        <p style={{ fontFamily:"'DM Serif Display',serif", fontSize:16, color:'var(--text-muted)' }}>
          {t('loading')}
        </p>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  const s           = analytics || {};
  const channelData = Object.entries(s.byChannel || {}).map(([name,value]) => ({ name,value }));
  const statusData  = Object.entries(s.byStatus  || {}).map(([name,value]) => ({ name,value }));
  const salesTrend  = s.salesTrend  || [];
  const topProducts = s.topProducts || [];
  const orders      = (recentOrders?.orders || recentOrders || []);
  const channelTotal = channelData.reduce((a,b) => a+b.value, 0);
  const p           = prevData;

  return (
    <div className="page-container">
      <style>{`
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>

      {/* ── Header ───────────────────────────────────── */}
      <div className="page-header anim-fade-up">
        <div>
          <h1 className="page-title">{t('dashboard')}</h1>
          <p className="page-subtitle">
            {new Date().toLocaleDateString('en-US',{ weekday:'long', year:'numeric', month:'long', day:'numeric' })}
            {analyticsBg && <span style={{ marginLeft:10, fontSize:11,
              color:'var(--accent)', opacity:0.7 }}>· updating…</span>}
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => setCompareMode(!compareMode)}
            className={`btn btn-sm ${compareMode ? 'btn-primary' : 'btn-secondary'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
            </svg>
            {compareMode ? 'Comparing vs prev 30d' : 'Compare'}
          </button>
          <button onClick={() => setAutoRefresh(!autoRefresh)}
            className={`btn btn-sm ${autoRefresh ? 'btn-primary' : 'btn-secondary'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
              style={autoRefresh ? { animation:'spin 2s linear infinite' } : {}}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {autoRefresh ? 'Live' : 'Auto Refresh'}
          </button>
        </div>
      </div>

      {/* ── Today banner ─────────────────────────────── */}
      <TodayBanner data={today} />

      {/* ── Alerts banner ────────────────────────────── */}
      <AlertsBanner alerts={alerts} onNavigate={navigate} />

      {/* ── KPI Row ──────────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))', gap:16 }}>
        <KpiCard delay={1} label={t('totalOrders')}
          value={s.totalOrders||0} accentColor="#8a6e2f"
          change={compareMode && p ? getChange(s.totalOrders, p.totalOrders) : null}
          iconPath="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
        <KpiCard delay={2} label={t('totalRevenue')}
          value={`EGP ${(s.totalRevenue||0).toLocaleString()}`} accentColor="#607b56"
          change={compareMode && p ? getChange(s.totalRevenue, p.totalRevenue) : null}
          iconPath="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
        <KpiCard delay={3} label={t('totalProfit')}
          value={`EGP ${(s.totalProfit||0).toLocaleString()}`} accentColor="#2d7d5a"
          change={compareMode && p ? getChange(s.totalProfit, p.totalProfit) : null}
          iconPath="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/>
        <KpiCard delay={4} label={t('avgMargin')}
          value={`${(s.avgMargin||0).toFixed(1)}%`} accentColor="#5b5ea6"
          change={compareMode && p ? getChange(s.avgMargin, p.avgMargin) : null}
          iconPath="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
      </div>

      {/* ── Secondary stats ──────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:12 }}>
        {[
          { label:'Products',  value:s.totalProducts||0,  color:'#2878a0',
            icon:'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
          { label:'Customers', value:s.totalCustomers||0, color:'#5b5ea6',
            icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
          { label:'Delayed',   value:s.delayedOrders||0,  color:'var(--danger)',
            icon:'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' },
          { label:'Delivered', value:s.deliveredOrders||0,color:'var(--success)',
            icon:'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
          { label:'Avg Order', value:`EGP ${(s.avgOrderValue||0).toLocaleString()}`,color:'var(--warning)',
            icon:'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
        ].map((item,i) => (
          <div key={i} className={`card card-sm anim-fade-up stagger-${i+1}`}
            style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
              background:`${item.color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg style={{ width:16, height:16, color:item.color }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon}/>
              </svg>
            </div>
            <div>
              <p className="kpi-label" style={{ marginBottom:2, fontSize:10 }}>{item.label}</p>
              <p style={{ fontFamily:"'DM Serif Display',serif", fontSize:20, fontWeight:400,
                color:item.color, lineHeight:1 }}>{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts + Sync Widget ─────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(0,1fr)', gap:20 }}>

        {/* Revenue & Profit Trend */}
        <Section title="Revenue & Profit Trend" badge="All time">
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={salesTrend} margin={{ top:6, right:6, left:-12, bottom:0 }}>
              <defs>
                <linearGradient id="gRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8a6e2f" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#8a6e2f" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gPro" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#607b56" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#607b56" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} vertical={false}/>
              <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false} dy={6}/>
              <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} axisLine={false}
                tickFormatter={v => v>=1000 ? `${(v/1000).toFixed(0)}k` : v}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Area type="monotone" dataKey="revenue" stroke="#8a6e2f" fill="url(#gRev)" strokeWidth={2.5} dot={false}/>
              <Area type="monotone" dataKey="profit"  stroke="#607b56" fill="url(#gPro)" strokeWidth={2.5} dot={false}/>
              <Legend wrapperStyle={{ fontSize:12, paddingTop:14, fontFamily:"'DM Sans',sans-serif",
                color:'var(--text-muted)' }}/>
            </AreaChart>
          </ResponsiveContainer>
        </Section>

        {/* Right column: donut + sync widget */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Section title="By Channel">
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={channelData} cx="50%" cy="50%"
                  innerRadius={46} outerRadius={68} paddingAngle={3}
                  dataKey="value" strokeWidth={0}>
                  {channelData.map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
                </Pie>
                <Tooltip content={<ChartTooltip/>}/>
              </PieChart>
            </ResponsiveContainer>
            <div style={{ marginTop:6 }}>
              {channelData.map((item,i) => {
                const meta = ch(item.name);
                const pct  = channelTotal ? Math.round((item.value/channelTotal)*100) : 0;
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:8,
                    padding:'5px 0', borderBottom: i<channelData.length-1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ fontSize:15, flexShrink:0 }}>{meta.icon}</span>
                    <span style={{ fontSize:12, flex:1, color:'var(--text-secondary)', fontWeight:500 }}>
                      {meta.label}
                    </span>
                    <span style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{item.value}</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)', width:28, textAlign:'right' }}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </Section>

          <SyncWidget status={syncStatus} onSync={handleSyncNow}/>
        </div>
      </div>

      {/* ── Bottom Row ───────────────────────────────── */}
      <div style={{ display:'grid', gridTemplateColumns:'minmax(0,2fr) minmax(0,3fr)', gap:20 }}>

        {/* Top Products */}
        <Section title="Top Products" badge={`${topProducts.length} items`}>
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            {topProducts.slice(0,6).map((prod,i) => {
              const maxRev = topProducts[0]?.revenue||1;
              const pct    = Math.round((prod.revenue/maxRev)*100);
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:28, height:28, borderRadius:8, flexShrink:0,
                    background:CHART_COLORS[i%CHART_COLORS.length],
                    display:'flex', alignItems:'center', justifyContent:'center',
                    fontFamily:"'DM Serif Display',serif", fontSize:13, color:'#fff' }}>
                    {i+1}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:500, color:'var(--text-primary)',
                      marginBottom:4, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                      {prod.name}
                    </p>
                    <div className="progress-bar">
                      <div className="progress-fill"
                        style={{ width:`${pct}%`, background:CHART_COLORS[i%CHART_COLORS.length] }}/>
                    </div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:'var(--success)' }}>
                      EGP {(prod.revenue||0).toLocaleString()}
                    </p>
                    <p style={{ fontSize:10, color:'var(--text-muted)' }}>{prod.count} sold</p>
                  </div>
                </div>
              );
            })}
            {topProducts.length === 0 && (
              <p style={{ textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:'16px 0' }}>
                {t('noData')}
              </p>
            )}
          </div>
        </Section>

        {/* Recent Orders */}
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <div style={{ padding:'24px 24px 0' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:3, height:14, borderRadius:2, background:'var(--accent)', flexShrink:0 }}/>
                <span className="section-title">Recent Orders</span>
              </div>
              <button onClick={() => navigate('/orders')} className="btn btn-ghost btn-xs"
                style={{ color:'var(--accent)' }}>
                View all
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--border)' }}>
                  {['Order','Customer','Channel','Amount','Status'].map(h => (
                    <th key={h} style={{ padding:'8px 20px', textAlign:'left', fontSize:10,
                      fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em',
                      color:'var(--text-muted)', background:'var(--bg-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((order,i) => {
                  const meta = ch(order.source);
                  return (
                    <tr key={i} className="table-row" style={{ cursor:'pointer' }}
                      onClick={() => navigate('/orders')}>
                      <td><span style={{ fontSize:12, fontWeight:600, color:'var(--accent)' }}>
                        #{order.order_number||order.source_order_id||order.id}
                      </span></td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <div style={{ width:26, height:26, borderRadius:8, flexShrink:0,
                            background:'var(--bg-hover)', border:'1px solid var(--border)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            fontSize:11, fontWeight:700, color:'var(--text-secondary)',
                            fontFamily:"'DM Serif Display',serif", fontSize:14 }}>
                            {(order.customer_name||'U')[0].toUpperCase()}
                          </div>
                          <span style={{ fontSize:12, color:'var(--text-primary)', fontWeight:500,
                            maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {order.customer_name||'—'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize:12 }}>{meta.icon}</span>
                        <span style={{ fontSize:11, marginLeft:5, color:'var(--text-muted)', fontWeight:500 }}>
                          {meta.label}
                        </span>
                      </td>
                      <td><span style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)' }}>
                        EGP {(order.total_price||0).toLocaleString()}
                      </span></td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <span className="status-dot" style={{ background:dot(order.status) }}/>
                          <span className={`badge ${badge(order.status)}`}>{order.status||'Unknown'}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {orders.length===0 && (
                  <tr><td colSpan={5} style={{ textAlign:'center', padding:32,
                    color:'var(--text-muted)', fontSize:13 }}>{t('noData')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ height:8 }}/>
        </div>
      </div>

      {/* ── Status breakdown ─────────────────────────── */}
      {statusData.length > 0 && (
        <Section title="Orders by Status">
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:12 }}>
            {statusData.map((item,i) => (
              <div key={i} className="metric-chip">
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center',
                  gap:5, marginBottom:6 }}>
                  <span className="status-dot" style={{ background:dot(item.name) }}/>
                  <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase',
                    letterSpacing:'0.06em', color:'var(--text-muted)' }}>{item.name}</span>
                </div>
                <p style={{ fontFamily:"'DM Serif Display',serif", fontSize:24, fontWeight:400,
                  color:'var(--text-primary)', lineHeight:1, textAlign:'center' }}>{item.value}</p>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
