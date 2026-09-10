import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export function useToast() { return useContext(ToastContext); }

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, 'success', dur),
    error: (msg, dur) => addToast(msg, 'error', dur || 6000),
    warning: (msg, dur) => addToast(msg, 'warning', dur),
    info: (msg, dur) => addToast(msg, 'info', dur),
  };

  const icons = {
    success: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    error: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>,
    warning: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>,
    info: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  };

  const colors = {
    success: { bg: 'var(--success)', glow: 'rgba(16,185,129,0.15)' },
    error: { bg: 'var(--danger)', glow: 'rgba(239,68,68,0.15)' },
    warning: { bg: 'var(--warning)', glow: 'rgba(245,158,11,0.15)' },
    info: { bg: 'var(--info)', glow: 'rgba(6,182,212,0.15)' },
  };

  return (
    <ToastContext.Provider value={{ toast, addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2" style={{ direction: 'ltr' }}>
        {toasts.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg anim-fade-up cursor-pointer min-w-[280px] max-w-[400px]"
            style={{
              background: 'var(--bg-card-solid)',
              border: `1px solid ${colors[t.type].bg}`,
              boxShadow: `0 4px 20px ${colors[t.type].glow}`,
            }}
            onClick={() => removeToast(t.id)}
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: colors[t.type].glow, color: colors[t.type].bg }}>
              {icons[t.type]}
            </div>
            <span className="text-xs font-medium flex-1" style={{ color: 'var(--text-primary)' }}>{t.message}</span>
            <svg className="w-3.5 h-3.5 flex-shrink-0 cursor-pointer opacity-50 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
