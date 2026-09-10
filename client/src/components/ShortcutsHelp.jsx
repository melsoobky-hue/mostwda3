import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

export default function ShortcutsHelp({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <div className="card w-full max-w-md anim-scale" style={{ boxShadow: 'var(--shadow-lg)' }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Keyboard Shortcuts</h2>
          <button onClick={onClose} className="btn btn-ghost btn-sm rounded-lg">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="space-y-3">
          {SHORTCUTS.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2.5 px-3.5 rounded-xl hover:bg-[var(--bg-hover)] transition-colors">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{s.label}</span>
              <div className="flex gap-1.5">
                {s.keys.map((k, j) => (
                  <span key={j}>
                    <kbd className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-semibold inline-block" style={{ background: 'linear-gradient(180deg, var(--bg-secondary), var(--bg-hover))', border: '1px solid var(--border-hover)', borderBottom: '2px solid var(--border-strong)', color: 'var(--text-primary)', boxShadow: '0 1px 2px rgba(60,40,10,0.06)' }}>
                      {k === ' ' ? 'Space' : k === '/' ? '/' : k.toUpperCase()}
                    </kbd>
                    {j < s.keys.length - 1 && <span className="text-[10px] mx-1" style={{ color: 'var(--text-muted)' }}>+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] mt-5 text-center" style={{ color: 'var(--text-muted)' }}>Press <kbd className="px-2 py-0.5 rounded-md text-[9px] font-mono" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)', boxShadow: '0 1px 2px rgba(60,40,10,0.05)' }}>?</kbd> to toggle this panel</p>
      </div>
    </div>
  );
}