import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useApi, invalidateKey } from '../hooks/useApi';

/* ── Source metadata ─────────────────────────────── */
const SOURCES = [
  { key: 'mostwda3',    name: 'Mostwda3',     sub: 'WooCommerce REST API', icon: '🏪', method: 'API',     safe: true  },
  { key: 'saraydecore', name: 'Saray Decore',  sub: 'WooCommerce REST API', icon: '🏛️', method: 'API',     safe: true  },
  { key: 'chichomz',    name: 'Chichomz',     sub: 'Browser Scraping',     icon: '🛒', method: 'Scraper', safe: false },
  { key: 'raneen',      name: 'Raneen',        sub: 'Browser Scraping',     icon: '📦', method: 'Scraper', safe: false },
];

const STATE_META = {
  running: { color: 'var(--warning)',    bg: 'var(--warning-bg)',    label: 'Syncing…' },
  success: { color: 'var(--success)',    bg: 'var(--success-bg)',    label: 'Success'  },
  failed:  { color: 'var(--danger)',     bg: 'var(--danger-bg)',     label: 'Failed'   },
  skipped: { color: 'var(--text-muted)', bg: 'var(--bg-hover)',      label: 'Skipped'  },
  idle:    { color: 'var(--text-muted)', bg: 'var(--bg-hover)',      label: 'Idle'     },
};

function fmtDuration(ms) {
  if (!ms) return null;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtRelative(isoStr) {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/* ── Source Card ─────────────────────────────────── */
function SourceCard({ src, sourceStatus, onSync, syncing }) {
  const s    = sourceStatus || {};
  const meta = STATE_META[s.state] || STATE_META.idle;
  const isRunning = s.state === 'running';

  return (
    <div className="card" style={{
      transition: 'box-shadow .2s, transform .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}
    >
      {/* Running progress bar */}
      {isRunning && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
          overflow: 'hidden', background: 'var(--bg-hover)',
        }}>
          <div style={{
            height: '100%', background: 'var(--warning)',
            animation: 'syncProgress 2s ease-in-out infinite',
            borderRadius: 3,
          }}/>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <div style={{
          width: 42, height: 42, borderRadius: 13, flexShrink: 0,
          background: isRunning ? meta.bg : 'var(--bg-secondary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, transition: 'background .3s',
          border: `1px solid ${isRunning ? meta.color + '40' : 'var(--border)'}`,
        }}>
          {src.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}>{src.name}</p>
          <p style={{ fontSize: 10.5, color: 'var(--text-muted)', marginTop: 1 }}>{src.sub}</p>
        </div>
        <span className="badge" style={{ background: meta.bg, color: meta.color, flexShrink: 0 }}>
          {isRunning && (
            <span style={{
              display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
              background: meta.color, marginRight: 5,
              animation: 'pulse 1s ease-in-out infinite',
            }}/>
          )}
          {meta.label}
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
        {[
          { label: 'Last sync',    value: fmtRelative(s.lastRun)     || '—' },
          { label: 'Last success', value: fmtRelative(s.lastSuccess) || '—' },
          { label: 'Records',      value: s.count != null ? s.count  : '—' },
          { label: 'Duration',     value: fmtDuration(s.duration)    || '—' },
        ].map((item, i) => (
          <div key={i} style={{
            padding: '8px 10px', borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          }}>
            <p style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: 3 }}>
              {item.label}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)',
              fontFamily: "'DM Serif Display', serif" }}>
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Error */}
      {s.lastError && s.state === 'failed' && (
        <div style={{
          padding: '8px 12px', borderRadius: 'var(--radius-sm)', marginBottom: 12,
          background: 'var(--danger-bg)', border: '1px solid rgba(192,57,43,0.18)',
        }}>
          <p style={{ fontSize: 11, color: 'var(--danger)', lineHeight: 1.45 }}>
            {s.lastError}
          </p>
        </div>
      )}

      {/* Method + action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className={`badge ${src.safe ? 'badge-green' : 'badge-yellow'}`}>
          {src.method}
        </span>
        <button
          onClick={() => onSync(src.key)}
          disabled={syncing}
          className="btn btn-secondary btn-sm"
          style={{ flex: 1 }}
        >
          {s.state === 'running' ? (
            <>
              <svg style={{ width: 13, height: 13, animation: 'spin 0.9s linear infinite' }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9"/>
              </svg>
              Syncing…
            </>
          ) : s.state === 'failed' ? (
            <>
              <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Retry
            </>
          ) : (
            <>
              <svg style={{ width: 13, height: 13 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Sync Now
            </>
          )}
        </button>
      </div>
    </div>
  );
}

/* ── Main ────────────────────────────────────────── */
export default function SyncPage() {
  const { t } = useTranslation();

  // Poll status every 5 s via useApi
  const { data: status, refresh: refreshStatus } = useApi('/api/sync/status', {
    ttl: 5_000, refreshInterval: 5_000,
  });
  const { data: logs, refresh: refreshLogs } = useApi('/api/sync/logs', { ttl: 10_000 });

  // SSE live stream
  const [liveEvents, setLiveEvents]   = useState([]);
  const [sseConnected, setSseConnected] = useState(false);
  const esRef = useRef(null);

  const connectSse = useCallback(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource('/api/sync/stream');
    esRef.current = es;

    es.addEventListener('open', () => setSseConnected(true));
    es.addEventListener('error', () => setSseConnected(false));

    es.addEventListener('init', e => {
      // Initial state — handled by useApi polling
      setSseConnected(true);
    });

    es.addEventListener('sync_start', e => {
      const data = JSON.parse(e.data);
      setLiveEvents(prev => [{
        type: 'start', message: 'Full sync started',
        time: data.startedAt, id: Date.now(),
      }, ...prev.slice(0, 49)]);
    });

    es.addEventListener('source_update', e => {
      const data = JSON.parse(e.data);
      setLiveEvents(prev => [{
        type: data.state,
        source: data.source,
        message: data.state === 'success'
          ? `${data.source}: ${data.orders||0} orders, ${data.products||0} products in ${fmtDuration(data.durationMs)}`
          : data.state === 'failed'
            ? `${data.source}: ${data.error}`
            : data.state === 'running'
              ? `${data.source}: syncing…`
              : `${data.source}: ${data.message || data.state}`,
        time: data.startedAt || data.completedAt || new Date().toISOString(),
        id: Date.now() + Math.random(),
      }, ...prev.slice(0, 49)]);
      // invalidate caches after a source finishes
      if (data.state === 'success') {
        invalidateKey('/api/analytics');
        invalidateKey('/api/analytics/today');
        invalidateKey('/api/orders?limit=8&sortBy=order_date&sortDir=desc');
        refreshLogs();
      }
      refreshStatus();
    });

    es.addEventListener('sync_complete', e => {
      const data = JSON.parse(e.data);
      setLiveEvents(prev => [{
        type: 'complete', message: 'Sync completed',
        time: data.completedAt, id: Date.now(),
      }, ...prev.slice(0, 49)]);
      refreshStatus();
      refreshLogs();
    });

    // Scraper progress lines (streamed from chichomz / raneen during scrape)
    es.addEventListener('scraper_log', e => {
      const data = JSON.parse(e.data);
      setLiveEvents(prev => [{
        type: 'log',
        source: data.source,
        message: `[${data.source}] ${data.msg}`,
        time: data.time || new Date().toISOString(),
        id: Date.now() + Math.random(),
      }, ...prev.slice(0, 99)]);
    });

    return () => es.close();
  }, [refreshStatus, refreshLogs]);

  useEffect(() => {
    const cleanup = connectSse();
    return () => { cleanup?.(); esRef.current?.close(); };
  }, [connectSse]);

  const [syncing, setSyncing] = useState(false);

  // ── Credentials & browser-login state ───────────────────────────────────
  const [creds, setCreds]               = useState({});
  const [credEdit, setCredEdit]         = useState(null);   // null | 'chichomz' | 'raneen'
  const [credForm, setCredForm]         = useState({ email: '', password: '' });
  const [savingCred, setSavingCred]     = useState(false);
  const [loginStatus, setLoginStatus]   = useState({});     // { chichomz: {running,success,error,logs,hasCookies} }
  const loginPollRef                    = useRef({});

  const fetchCreds = async () => {
    try {
      const d = await fetch('/api/sync/credentials').then(r => r.json());
      setCreds(d);
    } catch (_) {}
  };

  useEffect(() => { fetchCreds(); }, []);

  const saveCred = async () => {
    if (!credEdit) return;
    setSavingCred(true);
    try {
      await fetch('/api/sync/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: credEdit, ...credForm }),
      });
      await fetchCreds();
      setCredEdit(null);
    } finally {
      setSavingCred(false);
    }
  };

  const clearSession = async (source) => {
    await fetch(`/api/sync/cookies/${source}`, { method: 'DELETE' });
    await fetchCreds();
    setLoginStatus(prev => ({ ...prev, [source]: null }));
  };

  const startBrowserLogin = async (source) => {
    // Start the login process
    await fetch(`/api/sync/login/${source}`, { method: 'POST' });
    setLoginStatus(prev => ({ ...prev, [source]: { running: true, logs: [] } }));

    // Poll status every second
    if (loginPollRef.current[source]) clearInterval(loginPollRef.current[source]);
    loginPollRef.current[source] = setInterval(async () => {
      try {
        const d = await fetch(`/api/sync/login/${source}/status`).then(r => r.json());
        setLoginStatus(prev => ({ ...prev, [source]: d }));
        if (!d.running) {
          clearInterval(loginPollRef.current[source]);
          if (d.success) fetchCreds();
        }
      } catch (_) {}
    }, 1000);
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => Object.values(loginPollRef.current).forEach(t => clearInterval(t));
  }, []);

  const syncAll = async () => {
    setSyncing(true);
    try {
      await fetch('/api/sync/run', { method: 'POST' });
    } finally {
      setSyncing(false);
      refreshStatus();
      refreshLogs();
    }
  };

  const syncOne = async (src) => {
    setSyncing(true);
    try {
      await fetch(`/api/sync/run/${src}`, { method: 'POST' });
    } finally {
      setSyncing(false);
      refreshStatus();
      refreshLogs();
    }
  };

  const isRunning = status?.isRunning;
  const sources   = status?.sources || {};

  const EVENT_META = {
    start:    { color: 'var(--info)',       icon: '▶' },
    running:  { color: 'var(--warning)',    icon: '⟳' },
    success:  { color: 'var(--success)',    icon: '✓' },
    failed:   { color: 'var(--danger)',     icon: '✗' },
    skipped:  { color: 'var(--text-muted)', icon: '—' },
    complete: { color: 'var(--accent)',     icon: '★' },
    log:      { color: 'var(--text-muted)', icon: '·' },
  };

  return (
    <div className="page-container">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes syncProgress {
          0%   { width: 0%;   margin-left: 0; }
          50%  { width: 60%;  margin-left: 20%; }
          100% { width: 0%;   margin-left: 100%; }
        }
      `}</style>

      {/* ── Page header ──────────────────────────────── */}
      <div className="page-header anim-fade-up">
        <div>
          <h1 className="page-title">{t('sync')}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <p className="page-subtitle">Data synchronisation across all channels</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5,
              padding: '2px 8px', borderRadius: 20,
              background: sseConnected ? 'var(--success-bg)' : 'var(--bg-hover)',
              border: `1px solid ${sseConnected ? 'rgba(61,140,92,.2)' : 'var(--border)'}`,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%',
                background: sseConnected ? 'var(--success)' : 'var(--text-muted)',
                display: 'inline-block',
                animation: sseConnected ? 'pulse 2s ease-in-out infinite' : 'none',
              }}/>
              <span style={{ fontSize: 10, fontWeight: 600, color: sseConnected ? 'var(--success)' : 'var(--text-muted)' }}>
                {sseConnected ? 'Live' : 'Connecting…'}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={syncAll}
          disabled={isRunning || syncing}
          className="btn btn-primary"
          style={{ gap: 8 }}
        >
          <svg style={{ width: 16, height: 16,
            animation: (isRunning || syncing) ? 'spin 0.9s linear infinite' : 'none' }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          {(isRunning || syncing) ? 'Syncing…' : 'Sync All Sources'}
        </button>
      </div>

      {/* ── Auto-sync status bar ──────────────────────── */}
      <div className="card card-sm anim-fade-up stagger-1" style={{
        borderLeft: `3px solid ${isRunning ? 'var(--warning)' : 'var(--success)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11, flexShrink: 0,
            background: isRunning ? 'var(--warning-bg)' : 'var(--success-bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg style={{ width: 18, height: 18, color: isRunning ? 'var(--warning)' : 'var(--success)',
              animation: isRunning ? 'spin 1.2s linear infinite' : 'none' }}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
          </div>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
              {isRunning ? 'Sync in progress…' : 'Auto-Sync Active'}
            </p>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {status?.nextSync || 'Every hour'} · starts on server boot
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {status?.lastRun && (
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Last run: {new Date(status.lastRun).toLocaleString([], {
                month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </span>
          )}
          <span style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20,
            background: isRunning ? 'var(--warning-bg)' : 'var(--success-bg)',
            color: isRunning ? 'var(--warning)' : 'var(--success)',
            fontSize: 11, fontWeight: 600,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'currentColor', display: 'inline-block',
              animation: 'pulse 1.5s ease-in-out infinite',
            }}/>
            {isRunning ? 'Running' : 'Healthy'}
          </span>
        </div>
      </div>

      {/* ── Source cards ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(260px,1fr))', gap: 18 }}>
        {SOURCES.map((src, i) => (
          <div key={src.key} className={`anim-fade-up stagger-${i + 2}`}>
            <SourceCard
              src={src}
              sourceStatus={sources[src.key]}
              onSync={syncOne}
              syncing={isRunning || syncing}
            />
          </div>
        ))}
      </div>

      {/* ── Live event feed + Logs ────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: 20 }}>

        {/* Live event feed */}
        <div className="card anim-fade-up stagger-6" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--accent)' }}/>
              <span className="section-title">Live Events</span>
            </div>
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: sseConnected ? 'var(--success)' : 'var(--border-hover)',
              display: 'inline-block',
              animation: sseConnected ? 'pulse 2s ease-in-out infinite' : 'none',
            }}/>
          </div>
          <div style={{ maxHeight: 380, overflowY: 'auto', padding: '8px 0' }}>
            {liveEvents.length === 0 ? (
              <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                <p style={{ fontSize: 24, marginBottom: 8 }}>📡</p>
                <p style={{ fontSize: 12, color: 'var(--text-muted)',
                  fontFamily: "'DM Serif Display', serif" }}>Waiting for events…</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Events appear here during sync
                </p>
              </div>
            ) : liveEvents.map(ev => {
              const meta = EVENT_META[ev.type] || EVENT_META.running;
              return (
                <div key={ev.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 16px',
                }}>
                  <span style={{
                    width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                    background: meta.color + '20',
                    color: meta.color, fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginTop: 1,
                  }}>
                    {meta.icon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11.5, color: 'var(--text-primary)',
                      lineHeight: 1.4, wordBreak: 'break-word' }}>
                      {ev.message}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                      {ev.time ? new Date(ev.time).toLocaleTimeString([], {
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      }) : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Sync history table */}
        <div className="card anim-fade-up stagger-7" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{
            padding: '16px 20px 14px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 3, height: 14, borderRadius: 2, background: 'var(--accent)' }}/>
            <span className="section-title">Sync History</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  {['Source', 'Status', 'Orders', 'Products', 'Duration', 'Error', 'Time'].map(h => (
                    <th key={h} style={{
                      padding: '10px 18px', textAlign: 'left',
                      fontSize: 10, fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: 'var(--text-muted)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(logs || []).map((log, i) => (
                  <tr key={log.id || i} className="table-row">
                    <td>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>
                        {log.source}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${log.status === 'success' ? 'badge-green' : 'badge-red'}`}>
                        {log.status}
                      </span>
                    </td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.orders_synced || 0}</span></td>
                    <td><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{log.products_synced || 0}</span></td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {log.duration_ms ? fmtDuration(log.duration_ms) : '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{
                        fontSize: 11, color: 'var(--danger)',
                        maxWidth: 160, display: 'inline-block',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }} title={log.error_message}>
                        {log.error_message || '—'}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                        {log.completed_at ? new Date(log.completed_at).toLocaleString([], {
                          month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
                {(!logs || logs.length === 0) && (
                  <tr>
                    <td colSpan={7} style={{
                      textAlign: 'center', padding: '40px',
                      color: 'var(--text-muted)', fontSize: 13,
                      fontFamily: "'DM Serif Display', serif",
                    }}>
                      {t('noData')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
