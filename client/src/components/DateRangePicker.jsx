import { useState, useRef, useEffect } from 'react';

const PRESETS = [
  { label: 'All Time', value: 'all', from: null, to: null },
  { label: 'Today', value: 'today', from: () => new Date().toISOString().split('T')[0], to: () => new Date().toISOString().split('T')[0] },
  { label: 'Yesterday', value: 'yesterday', from: () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; }, to: () => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().split('T')[0]; } },
  { label: 'Last 7 Days', value: '7', from: () => { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0]; }, to: () => new Date().toISOString().split('T')[0] },
  { label: 'Last 30 Days', value: '30', from: () => { const d = new Date(); d.setDate(d.getDate()-30); return d.toISOString().split('T')[0]; }, to: () => new Date().toISOString().split('T')[0] },
  { label: 'Last 90 Days', value: '90', from: () => { const d = new Date(); d.setDate(d.getDate()-90); return d.toISOString().split('T')[0]; }, to: () => new Date().toISOString().split('T')[0] },
  { label: 'This Month', value: 'thisMonth', from: () => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], to: () => new Date().toISOString().split('T')[0] },
  { label: 'Last Month', value: 'lastMonth', from: () => new Date(new Date().getFullYear(), new Date().getMonth()-1, 1).toISOString().split('T')[0], to: () => new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0] },
  { label: 'This Week', value: 'thisWeek', from: () => { const d = new Date(); d.setDate(d.getDate() - d.getDay()); return d.toISOString().split('T')[0]; }, to: () => new Date().toISOString().split('T')[0] },
  { label: 'Custom', value: 'custom', from: null, to: null },
];

export default function DateRangePicker({ from, to, onChange }) {
  const [open, setOpen] = useState(false);
  const [customFrom, setCustomFrom] = useState(from || '');
  const [customTo, setCustomTo] = useState(to || '');
  const [activePreset, setActivePreset] = useState('all');
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const applyPreset = (preset) => {
    setActivePreset(preset.value);
    if (preset.value === 'custom') return;
    const f = preset.from ? (typeof preset.from === 'function' ? preset.from() : preset.from) : '';
    const t = preset.to ? (typeof preset.to === 'function' ? preset.to() : preset.to) : '';
    setCustomFrom(f);
    setCustomTo(t);
    onChange({ from: f, to: t });
    setOpen(false);
  };

  const applyCustom = () => {
    setActivePreset('custom');
    onChange({ from: customFrom, to: customTo });
    setOpen(false);
  };

  const displayLabel = () => {
    if (activePreset !== 'custom') {
      const p = PRESETS.find(p => p.value === activePreset);
      return p ? p.label : 'All Time';
    }
    if (customFrom && customTo) return `${customFrom} → ${customTo}`;
    if (customFrom) return `From ${customFrom}`;
    if (customTo) return `Until ${customTo}`;
    return 'Custom Range';
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="btn btn-secondary btn-sm flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
        <span className="text-xs font-medium">{displayLabel()}</span>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 w-72 bg-[var(--bg-card-solid)] border border-[var(--border)] rounded-xl shadow-lg z-50 p-3 anim-fade-down" style={{ backdropFilter: 'blur(16px)' }}>
          <div className="space-y-1 mb-3">
            {PRESETS.map(p => (
              <button
                key={p.value}
                onClick={() => applyPreset(p)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activePreset === p.value
                    ? 'text-white'
                    : 'hover:bg-[var(--bg-hover)]'
                }`}
                style={activePreset === p.value ? { background: 'var(--gradient-1)', color: '#fff' } : { color: 'var(--text-secondary)' }}
              >
                {p.label}
              </button>
            ))}
          </div>
          {activePreset === 'custom' && (
            <div className="border-t pt-3 space-y-2" style={{ borderColor: 'var(--border)' }}>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} className="input-field text-xs" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider block mb-1" style={{ color: 'var(--text-muted)' }}>To</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} className="input-field text-xs" />
              </div>
              <button onClick={applyCustom} className="btn btn-primary btn-sm w-full">Apply Range</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
