import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApi } from '../hooks/useApi';

const TYPE_META = {
  danger:  { color: 'var(--danger)',  bg: 'var(--danger-bg)',  icon: '⚠️' },
  warning: { color: 'var(--warning)', bg: 'var(--warning-bg)', icon: '🔔' },
  info:    { color: 'var(--info)',     bg: 'var(--info-bg)',    icon: 'ℹ️' },
};

export default function NotificationBell() {
  const navigate       = useNavigate();
  const [open, setOpen] = useState(false);
  const ref            = useRef(null);

  // Poll every 2 minutes, serve stale instantly
  const { data, refresh } = useApi('/api/alerts', {
    ttl:             120_000,
    refreshInterval: 120_000,
  });

  const alerts = data?.alerts || [];
  const total  = data?.totalAlerts || 0;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleOpen = useCallback(() => {
    setOpen(o => !o);
    refresh(); // always refresh on open
  }, [refresh]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="btn btn-ghost btn-sm"
        style={{ position: 'relative', padding: '6px 8px' }}
        title="Notifications"
        aria-label={`${total} notifications`}
      >
        <svg style={{ width: 17, height: 17 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>

        {/* Badge */}
        {total > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2,
            minWidth: 16, height: 16, borderRadius: 8,
            background: 'var(--danger)', color: '#fff',
            fontSize: 9, fontWeight: 700, lineHeight: '16px',
            textAlign: 'center', padding: '0 4px',
            fontFamily: "'DM Sans', sans-serif",
            border: '1.5px solid var(--bg-card)',
          }}>
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="anim-fade-down"
          style={{
            position: 'absolute', right: 0, top: 'calc(100% + 10px)',
            width: 340, maxHeight: 480,
            background: 'var(--bg-card-solid)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 200,
            overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div style={{
            padding: '14px 18px 12px',
            borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 15, color: 'var(--text-primary)',
              }}>Alerts</span>
              {total > 0 && (
                <span className="badge badge-red" style={{ fontSize: 10 }}>{total} active</span>
              )}
            </div>
            <button
              onClick={() => { setOpen(false); navigate('/sync'); }}
              className="btn btn-ghost btn-xs"
              style={{ color: 'var(--accent)', fontSize: 11 }}
            >
              View all
            </button>
          </div>

          {/* Alert list */}
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {alerts.length === 0 ? (
              <div style={{ padding: '32px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', fontFamily: "'DM Serif Display', serif" }}>
                  All clear
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  No active alerts
                </p>
              </div>
            ) : (
              alerts.map((alert, i) => {
                const meta = TYPE_META[alert.type] || TYPE_META.info;
                return (
                  <div
                    key={i}
                    style={{
                      padding: '13px 18px',
                      borderBottom: i < alerts.length - 1 ? '1px solid var(--border)' : 'none',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { setOpen(false); navigate('/orders'); }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      {/* Type indicator */}
                      <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: meta.bg,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14,
                      }}>
                        {meta.icon}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{
                            fontSize: 12, fontWeight: 600,
                            color: meta.color,
                          }}>
                            {alert.title}
                          </span>
                          <span style={{
                            fontSize: 9, color: 'var(--text-muted)',
                            padding: '2px 6px', borderRadius: 10,
                            background: 'var(--bg-hover)',
                          }}>
                            {alert.count} {alert.count === 1 ? 'item' : 'items'}
                          </span>
                        </div>
                        <p style={{
                          fontSize: 11, color: 'var(--text-secondary)',
                          lineHeight: 1.45,
                          overflow: 'hidden', textOverflow: 'ellipsis',
                          display: '-webkit-box', WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}>
                          {alert.message}
                        </p>

                        {/* Preview items */}
                        {alert.items?.length > 0 && (
                          <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {alert.items.slice(0, 3).map((item, j) => (
                              <span key={j} style={{
                                fontSize: 10, color: 'var(--text-muted)',
                                padding: '2px 7px', borderRadius: 10,
                                background: 'var(--bg-secondary)',
                                border: '1px solid var(--border)',
                                maxWidth: 120, overflow: 'hidden',
                                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                              }}>
                                {item.name || item.customer_name || item.source_order_id || '—'}
                              </span>
                            ))}
                            {alert.items.length > 3 && (
                              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                +{alert.items.length - 3} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '10px 18px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
              Updates every 2 min
            </span>
            <button
              onClick={() => refresh()}
              className="btn btn-ghost btn-xs"
              style={{ fontSize: 10, gap: 4 }}
            >
              <svg style={{ width: 11, height: 11 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
