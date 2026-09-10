import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

export default function SyncPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const fetchData = () => {
    Promise.all([
      fetch('/api/sync/status').then(r => r.json()),
      fetch('/api/sync/logs').then(r => r.json())
    ]).then(([s, l]) => { setStatus(s); setLogs(l); setLoading(false); });
  };

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 10000); return () => clearInterval(i); }, []);

  const syncAll = async () => { setSyncing(true); await fetch('/api/sync/run', { method: 'POST' }); fetchData(); setSyncing(false); };
  const syncOne = async (src) => { setSyncing(true); await fetch(`/api/sync/run/${src}`, { method: 'POST' }); fetchData(); setSyncing(false); };

  const sources = [
    { key: 'mostwda3', name: 'Mostwda3', sub: 'WooCommerce API', icon: '🏪', gradient: 'var(--gradient-2)', method: 'API' },
    { key: 'saraydecore', name: 'Saray Decore', sub: 'WooCommerce API', icon: '🏛️', gradient: 'var(--gradient-1)', method: 'API' },
    { key: 'chichomz', name: 'Chichomz', sub: 'Browser Scraping', icon: '🛒', gradient: 'var(--gradient-3)', method: 'Scraper' },
    { key: 'raneen', name: 'Raneen', sub: 'Browser Scraping', icon: '📦', gradient: 'var(--gradient-4)', method: 'Scraper' },
  ];

  const getStatusColor = (st) => {
    const m = { running: 'var(--warning)', success: 'var(--success)', failed: 'var(--danger)', skipped: 'var(--text-muted)', idle: 'var(--text-muted)' };
    return m[st] || 'var(--text-muted)';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('sync')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Data synchronization and status</p>
        </div>
        <button onClick={syncAll} disabled={syncing} className="btn btn-primary">
          <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          {syncing ? t('running') : 'Sync All'}
        </button>
      </div>

      {/* Auto-Sync Status */}
      <div className="card anim-fade-up stagger-1" style={{ borderLeft: '3px solid var(--success)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-3)' }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Auto-Sync Active</h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Every 60 minutes + on server startup</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full anim-pulse" style={{ background: 'var(--success)' }}></div>
            <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>Active</span>
          </div>
        </div>
      </div>

      {/* Source Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {sources.map((src, i) => (
          <div key={src.key} className={`card anim-fade-up stagger-${i + 2}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: src.gradient }}>{src.icon}</div>
              <div>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{src.name}</h3>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{src.sub}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mb-3">
              <span className="badge" style={{ background: `${getStatusColor(status?.status?.[src.key])}20`, color: getStatusColor(status?.status?.[src.key]), border: `1px solid ${getStatusColor(status?.status?.[src.key])}30` }}>
                {status?.status?.[src.key] === 'running' && <span className="w-1 h-1 rounded-full anim-pulse mr-1" style={{ background: 'currentColor' }}></span>}
                {status?.status?.[src.key] || 'idle'}
              </span>
              <span className="badge badge-gray">{src.method}</span>
            </div>
            <button onClick={() => syncOne(src.key)} disabled={syncing} className="btn btn-secondary btn-sm w-full disabled:opacity-30">
              {syncing ? <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9" /></svg> : 'Sync Now'}
            </button>
          </div>
        ))}
      </div>

      {/* Last Sync */}
      <div className="card anim-fade-up stagger-6" style={{ padding: '14px 20px' }}>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full anim-pulse" style={{ background: 'var(--success)' }}></div>
          <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Last sync: {status?.lastRun ? new Date(status.lastRun).toLocaleString() : 'Waiting...'}</span>
        </div>
      </div>

      {/* Logs */}
      <div className="card anim-fade-up stagger-7" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sync History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                {['Source', 'Status', 'Orders', 'Products', 'Duration', 'Error', 'Time'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="table-row">
                  <td className="py-3 px-4 text-xs font-medium capitalize" style={{ color: 'var(--text-primary)' }}>{log.source}</td>
                  <td className="py-3 px-4"><span className={`badge ${log.status === 'success' ? 'badge-green' : 'badge-red'}`}>{log.status}</span></td>
                  <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{log.orders_synced || 0}</td>
                  <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{log.products_synced || 0}</td>
                  <td className="py-3 px-4 text-xs" style={{ color: 'var(--text-muted)' }}>{log.duration_ms ? `${(log.duration_ms / 1000).toFixed(1)}s` : '-'}</td>
                  <td className="py-3 px-4 text-[11px] max-w-[200px] truncate" style={{ color: 'var(--danger)' }}>{log.error_message || '-'}</td>
                  <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{log.completed_at}</td>
                </tr>
              ))}
              {logs.length === 0 && <tr><td colSpan="7" className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('noData')}</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
