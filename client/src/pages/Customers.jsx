import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import OrderTimeline from '../components/OrderTimeline';

export default function Customers() {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [sortBy, setSortBy] = useState('total_spent');
  const [sortDir, setSortDir] = useState('desc');

  const fetchCustomers = () => {
    const params = new URLSearchParams({ page, limit: 20, sortBy, sortDir });
    if (search) params.set('search', search);
    fetch(`/api/customers?${params}`).then(r => r.json()).then(data => {
      setCustomers(data.customers || []);
      setTotal(data.total || 0);
      setLoading(false);
    });
  };

  useEffect(() => { fetchCustomers(); }, [page, sortBy, sortDir]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchCustomers(); };

  const viewCustomer = async (phone) => {
    const [ordersRes, detailRes] = await Promise.all([
      fetch(`/api/customers/${phone}/orders`).then(r => r.json()),
      fetch(`/api/customers/${phone}`).then(r => r.json()),
    ]);
    setSelected(detailRes);
    setCustomerOrders(ordersRes);
  };

  const handleSort = (field) => { setSortBy(field); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); };

  const totalRevenue = customers.reduce((s, c) => s + (c.total_spent || 0), 0);
  const totalProfit = customers.reduce((s, c) => s + (c.total_profit || 0), 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('customers')}</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} customers · EGP {totalRevenue.toLocaleString()} revenue</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="stat-card anim-fade-up stagger-1">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: 'var(--gradient-2)' }}></div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Total Customers</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{total}</p>
        </div>
        <div className="stat-card anim-fade-up stagger-2">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: 'var(--gradient-3)' }}></div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Total Revenue</p>
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>EGP {totalRevenue.toLocaleString()}</p>
        </div>
        <div className="stat-card anim-fade-up stagger-3">
          <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: 'var(--gradient-1)' }}></div>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Total Profit</p>
          <p className="text-xl font-bold" style={{ color: 'var(--success)' }}>EGP {totalProfit.toLocaleString()}</p>
        </div>
      </div>

      <div className="card anim-fade-up stagger-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input data-search-input type="text" placeholder="Search by name, phone, or email..." value={search} onChange={e => setSearch(e.target.value)} className="input-field flex-1" />
          <button type="submit" className="btn btn-primary btn-sm">{t('filter')}</button>
        </form>
      </div>

      <div className="card anim-fade-up stagger-5" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {[{ key: 'customer_name', label: 'Name' }, { key: 'customer_phone', label: 'Phone' }, { key: 'total_orders', label: 'Orders' }, { key: 'total_spent', label: 'Total Spent' }, { key: 'total_profit', label: 'Profit' }, { key: 'last_order_date', label: 'Last Order' }].map(col => (
                    <th key={col.key} onClick={() => handleSort(col.key)} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider cursor-pointer hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
                      {col.label} {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c, i) => (
                  <tr key={c.phone || i} className="table-row cursor-pointer" onClick={() => viewCustomer(c.phone)}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: 'var(--gradient-1)' }}>
                          {(c.name || c.phone || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{c.name || '-'}</p>
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.email || '-'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{c.phone}</td>
                    <td className="py-3 px-4"><span className="badge badge-blue">{c.total_orders}</span></td>
                    <td className="py-3 px-4 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>EGP {(c.total_spent || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-xs font-semibold" style={{ color: (c.total_profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>EGP {(c.total_profit || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{c.last_order_date || '-'}</td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan="6" className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('noData')}</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {total > 20 && (
          <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm disabled:opacity-30">{t('prev')}</button>
              <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn btn-secondary btn-sm disabled:opacity-30">{t('next')}</button>
            </div>
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }} onClick={() => setSelected(null)}>
          <div className="card w-full max-w-3xl max-h-[90vh] overflow-y-auto anim-scale" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selected.name || selected.phone}</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{selected.email || selected.phone}</p>
              </div>
              <button onClick={() => setSelected(null)} className="btn btn-ghost btn-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Total Orders', value: selected.total_orders, badge: 'badge-blue' },
                { label: 'Total Spent', value: `EGP ${(selected.total_spent || 0).toLocaleString()}` },
                { label: 'Avg Order', value: `EGP ${(selected.avg_order_value || 0).toLocaleString()}` },
                { label: 'Profit', value: `EGP ${(selected.total_profit || 0).toLocaleString()}`, color: 'var(--success)' },
              ].map((item, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  {item.badge ? <span className={`badge ${item.badge}`}>{item.value}</span> :
                   <p className="text-sm font-bold" style={{ color: item.color || 'var(--text-primary)' }}>{item.value}</p>}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Order History ({customerOrders.length})</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {customerOrders.map((o, i) => (
                    <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>#{o.source_order_id}</span>
                        <span className={`badge ${o.status === 'Delivered' ? 'badge-green' : o.status === 'Cancelled' ? 'badge-red' : 'badge-yellow'}`}>{o.status}</span>
                      </div>
                      <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{o.product_name}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] font-bold" style={{ color: 'var(--text-primary)' }}>EGP {o.total_price?.toLocaleString()}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{o.order_date}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Timeline</h3>
                <div className="max-h-64 overflow-y-auto">
                  {customerOrders.slice(0, 5).map((o, i) => (
                    <div key={i} className="mb-3">
                      <p className="text-[10px] font-mono font-semibold mb-1" style={{ color: 'var(--accent)' }}>#{o.source_order_id}</p>
                      <OrderTimeline order={o} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
