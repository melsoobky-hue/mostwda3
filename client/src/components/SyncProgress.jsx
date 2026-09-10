import { useState, useEffect } from 'react';

export default function SyncProgress({ source, onComplete }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!source) return;
    setStatus('running');
    setMessage(`Syncing ${source}...`);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return prev; }
        return prev + Math.random() * 15;
      });
    }, 500);

    fetch(`/api/sync/run/${source}`, { method: 'POST' })
      .then(r => r.json())
      .then(data => {
        clearInterval(interval);
        setProgress(100);
        setStatus(data.error ? 'failed' : 'success');
        setMessage(data.error || `Synced ${data.orders_synced || 0} orders, ${data.products_synced || 0} products`);
        if (onComplete) onComplete(data);
      })
      .catch(err => {
        clearInterval(interval);
        setProgress(100);
        setStatus('failed');
        setMessage(err.message || 'Sync failed');
      });

    return () => clearInterval(interval);
  }, [source]);

  if (status === 'idle') return null;

  const colors = {
    running: { bar: 'var(--gradient-1)', bg: 'var(--accent-glow)' },
    success: { bar: 'var(--gradient-3)', bg: 'rgba(16,185,129,0.15)' },
    failed: { bar: 'linear-gradient(135deg, #ef4444, #dc2626)', bg: 'rgba(239,68,68,0.15)' },
  };

  return (
    <div className="card anim-scale" style={{ padding: '16px 20px', borderColor: status === 'success' ? 'var(--success)' : status === 'failed' ? 'var(--danger)' : 'var(--border)' }}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {status === 'running' && <div className="w-2 h-2 rounded-full anim-pulse" style={{ background: 'var(--accent)' }}></div>}
          {status === 'success' && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }}></div>}
          {status === 'failed' && <div className="w-2 h-2 rounded-full" style={{ background: 'var(--danger)' }}></div>}
          <span className="text-xs font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{source}</span>
        </div>
        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>
          {status === 'running' ? `${Math.round(progress)}%` : status === 'success' ? 'Done' : 'Failed'}
        </span>
      </div>
      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${progress}%`,
            background: colors[status].bar,
          }}
        ></div>
      </div>
      <p className="text-[10px] mt-2 font-medium" style={{ color: 'var(--text-muted)' }}>{message}</p>
    </div>
  );
}
