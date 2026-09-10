import { useState } from 'react';
import { useToast } from './Toast';

export function CopyButton({ text, label }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(`${label || 'Text'} copied!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  return (
    <button onClick={handleCopy} className={`p-1.5 rounded-lg transition-all duration-200 active:scale-90 ${copied ? 'bg-[var(--success-bg)]' : 'hover:bg-[var(--bg-hover)] hover:scale-110'}`} title={`Copy ${label || 'text'}`}>
      {copied ? (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      ) : (
        <svg className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
      )}
    </button>
  );
}

export function RefreshIndicator({ lastUpdated, onRefresh, loading }) {
  return (
    <div className="flex items-center gap-2">
      {lastUpdated && (
        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Updated {lastUpdated}
        </span>
      )}
      <button onClick={onRefresh} className="btn btn-ghost btn-sm p-1.5 rounded-lg" title="Refresh data">
        <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
      </button>
    </div>
  );
}

export function ColumnToggle({ columns, visible, onToggle }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="btn btn-secondary btn-sm p-2" title="Toggle columns">
        <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-card-solid)] border border-[var(--border)] rounded-2xl z-50 p-2.5 anim-fade-down" style={{ boxShadow: 'var(--shadow-lg)' }}>
          {columns.map(col => (
            <label key={col.key} className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-pointer hover:bg-[var(--bg-hover)] transition-colors">
              <input
                type="checkbox"
                checked={visible.has(col.key)}
                onChange={() => onToggle(col.key)}
                className="rounded"
                style={{ accentColor: 'var(--accent)' }}
              />
              <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{col.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}