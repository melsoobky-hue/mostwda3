import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';

const PRESET_INTERVALS = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
  { label: '6 hours', value: 360 },
  { label: '12 hours', value: 720 },
  { label: '24 hours', value: 1440 },
];

export default function Settings() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState(null);
  const [syncInfo, setSyncInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [interval, setInterval_] = useState(60);
  const [customInterval, setCustomInterval] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/sync/profiles').then(r => r.json()),
      fetch('/api/sync/interval').then(r => r.json()),
      fetch('/api/sync/status').then(r => r.json()),
    ]).then(([p, i, s]) => {
      setProfiles(p);
      setSyncInfo(s);
      setInterval_(i.interval || 60);
      setLoading(false);
    });
  }, []);

  const saveInterval = async (mins) => {
    setSaving(true);
    try {
      const res = await fetch('/api/sync/interval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes: mins }),
      });
      const data = await res.json();
      if (data.success) {
        setInterval_(mins);
        toast.success(`Sync interval set to ${data.label}`);
        const status = await fetch('/api/sync/status').then(r => r.json());
        setSyncInfo(status);
      }
    } catch (err) {
      toast.error('Failed to update interval');
    }
    setSaving(false);
  };

  const handleCustomInterval = () => {
    const mins = parseInt(customInterval, 10);
    if (isNaN(mins) || mins < 1 || mins > 1440) {
      toast.error('Enter a value between 1 and 1440 minutes');
      return;
    }
    saveInterval(mins);
    setCustomInterval('');
  };

  const sources = [
    { key: 'mostwda3', name: 'Mostwda3', sub: 'WooCommerce REST API', method: 'API Key Auth', icon: '🏪', gradient: 'var(--gradient-2)', safe: true },
    { key: 'saraydecore', name: 'Saray Decore', sub: 'WooCommerce REST API', method: 'API Key Auth', icon: '🏛️', gradient: 'var(--gradient-1)', safe: true },
    { key: 'chichomz', name: 'Chichomz', sub: 'Headless Browser (Playwright)', method: 'Session Cookies', icon: '🛒', gradient: 'var(--gradient-3)', safe: false },
    { key: 'raneen', name: 'Raneen', sub: 'Headless Browser (Playwright)', method: 'Session Cookies', icon: '📦', gradient: 'var(--gradient-4)', safe: false },
  ];

  return (
    <div className="space-y-8">
      <div className="anim-fade-up">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('settings')}</h1>
        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>Connection profiles, sync schedule, and system info</p>
      </div>

      {/* Sync Interval */}
      <div className="card anim-fade-up stagger-1" style={{ borderLeft: '3px solid var(--accent)', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s ease, transform 0.2s ease' }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'var(--gradient-1)' }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Sync Schedule</h3>
            <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>Current: <span className="font-semibold" style={{ color: 'var(--accent)' }}>{syncInfo?.nextSync || 'Every 1 hour'}</span></p>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-2.5" style={{ color: 'var(--text-muted)' }}>Quick Select</p>
          <div className="grid grid-cols-4 gap-2.5">
            {PRESET_INTERVALS.map(p => (
              <button
                key={p.value}
                onClick={() => saveInterval(p.value)}
                disabled={saving}
                className={`btn btn-sm text-xs transition-all ${interval === p.value ? 'btn-primary' : 'btn-secondary'} disabled:opacity-50`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <div className="flex-1">
            <input
              type="number"
              min="1"
              max="1440"
              value={customInterval}
              onChange={e => setCustomInterval(e.target.value)}
              placeholder="Custom (1-1440 min)"
              className="input-field text-xs"
              style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }}
              onKeyDown={e => e.key === 'Enter' && handleCustomInterval()}
            />
          </div>
          <button onClick={handleCustomInterval} disabled={saving || !customInterval} className="btn btn-primary btn-sm disabled:opacity-50">
            Set
          </button>
        </div>

        <div className="mt-4 p-3.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Auto-sync on startup</span>
            <span className="badge badge-green">Always runs</span>
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Saved sessions</span>
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>Chichomz + Raneen skip if no cookies</span>
          </div>
        </div>
      </div>

      {/* Source Profiles */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {sources.map((src, i) => {
          const profile = profiles?.profiles?.[src.key] || {};
          const status = profile.status || 'idle';
          const hasCreds = profile.hasCredentials || status === 'active';
          const statusColor = status === 'active' ? 'var(--success)' : status === 'configured' ? 'var(--warning)' : 'var(--text-muted)';
          return (
            <div key={src.key} className={`card anim-fade-up stagger-${i + 2}`}
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s ease, transform 0.2s ease' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: src.gradient }}>{src.icon}</div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{src.name}</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{src.sub}</p>
                </div>
              </div>

              <div className="space-y-3.5">
                <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>Authentication Method</span>
                  </div>
                  <span className="badge badge-blue">{src.method}</span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>Connection Status</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full anim-pulse" style={{ background: statusColor, boxShadow: `0 0 6px ${statusColor}55` }}></div>
                    <span className="text-xs font-medium" style={{ color: statusColor }}>{hasCreds ? 'Active' : 'No credentials'}</span>
                  </div>
                </div>

                {src.safe && (
                  <div className="p-3.5 rounded-xl border border-dashed" style={{ borderColor: 'var(--success)', background: 'rgba(16,185,129,0.04)' }}>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--success)' }}>API credentials are stored securely in server config</p>
                  </div>
                )}
                {!src.safe && (
                  <div className="p-3.5 rounded-xl border border-dashed" style={{ borderColor: 'var(--warning)', background: 'rgba(245,158,11,0.04)' }}>
                    <p className="text-[10px] font-medium" style={{ color: 'var(--warning)' }}>Requires manual login via browser. Cookies are saved locally.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* System Info */}
      <div className="card anim-fade-up stagger-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
        <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>System Info</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Node.js', value: 'v18+' },
            { label: 'Database', value: 'SQLite (sql.js)' },
            { label: 'Scheduler', value: `${syncInfo?.nextSync || 'Every 1 hour'}` },
            { label: 'Browser', value: 'Playwright (Chromium)' },
          ].map((item, i) => (
            <div key={i} className="p-3.5 rounded-xl" style={{ background: 'var(--bg-secondary)', transition: 'background 0.2s ease' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
