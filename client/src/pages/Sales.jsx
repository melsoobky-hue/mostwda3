import { useState, useEffect } from 'react';

export default function Sales() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('');

  const fetchSales = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (period) p.set('period', period);
    fetch(`/api/erp/sales/summary?${p}`).then(r => r.json()).then(d => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchSales(); }, [period]);

  if (loading) return <div className="flex items-center justify-center h-36"><div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div></div>;
  if (!data) return null;

  const cards = [
    { label: 'Total Invoiced', value: `EGP ${(data.invoices?.total || 0).toLocaleString()}`, color: 'var(--accent)', sub: `${data.invoices?.count || 0} invoices` },
    { label: 'Amount Collected', value: `EGP ${(data.payments?.total || 0).toLocaleString()}`, color: 'var(--success)', sub: `${data.payments?.count || 0} payments` },
    { label: 'Outstanding', value: `EGP ${(data.invoices?.outstanding || 0).toLocaleString()}`, color: data.invoices?.outstanding > 0 ? 'var(--danger)' : 'var(--text-muted)', sub: 'Balance due' },
    { label: 'Estimates', value: `EGP ${(data.estimates?.total || 0).toLocaleString()}`, color: 'var(--warning)', sub: `${data.estimates?.count || 0} estimates` },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div><h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Sales</h1><p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>Overview of your sales activity</p></div>
        <select value={period} onChange={e => setPeriod(e.target.value)} className="input-field" style={{ background: 'var(--bg-tertiary)' }}>
          <option value="">All Time</option>
          <option value="today">Today</option><option value="week">This Week</option><option value="month">This Month</option><option value="quarter">This Quarter</option><option value="year">This Year</option>
        </select>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 anim-fade-up stagger-1">
        {cards.map((c, i) => (
          <div key={i} className="card">
            <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{c.label}</p>
            <p className="text-xl font-bold mt-2" style={{ color: c.color }}>{c.value}</p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 anim-fade-up stagger-2">
        <div className="card">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Monthly Revenue</h3>
          <div className="space-y-2">
            {(data.monthly || []).slice(0, 8).map((m, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] w-16" style={{ color: 'var(--text-muted)' }}>{m.month}</span>
                <div className="flex-1 h-6 rounded-lg overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="h-full rounded-lg" style={{ width: `${Math.min(100, ((m.total || 0) / Math.max(...data.monthly.map(x => x.total || 1))) * 100)}%`, background: 'var(--accent)' }}></div>
                </div>
                <span className="text-[11px] font-medium w-24 text-right" style={{ color: 'var(--text-primary)' }}>EGP {(m.total || 0).toLocaleString()}</span>
              </div>
            ))}
            {(!data.monthly || data.monthly.length === 0) && <p className="text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>No data</p>}
          </div>
        </div>

        <div className="card">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-4" style={{ color: 'var(--text-muted)' }}>Top Customers</h3>
          <div className="space-y-2">
            {(data.topCustomers || []).map((c, i) => (
              <div key={i} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--bg-secondary)', color: 'var(--accent)' }}>{(c.name || 'U')[0]}</div>
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.orders} orders</p>
                  </div>
                </div>
                <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>EGP {(c.total || 0).toLocaleString()}</span>
              </div>
            ))}
            {(!data.topCustomers || data.topCustomers.length === 0) && <p className="text-center text-xs py-6" style={{ color: 'var(--text-muted)' }}>No data</p>}
          </div>
        </div>
      </div>

      {data.creditNotes && data.creditNotes.count > 0 && (
        <div className="card anim-fade-up stagger-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Credit Notes</h3>
          <div className="flex items-center gap-4">
            <div><span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Count</span><p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{data.creditNotes.count}</p></div>
            <div><span className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Total</span><p className="text-sm font-bold" style={{ color: 'var(--danger)' }}>EGP {(data.creditNotes.total || 0).toLocaleString()}</p></div>
          </div>
        </div>
      )}
    </div>
  );
}
