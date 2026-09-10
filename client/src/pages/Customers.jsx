import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';

export default function Customers() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '', city: '', governorate: '', type: 'individual', notes: '' });

  const fetchCustomers = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (typeFilter) params.set('type', typeFilter);
    fetch(`/api/customers?${params}`).then(r => r.json()).then(d => {
      setCustomers(d.customers || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchCustomers(); }, [search, typeFilter]);

  const fetchOrders = (phone) => {
    fetch(`/api/customers/${encodeURIComponent(phone)}/orders`).then(r => r.json()).then(d => setOrders(d || [])).catch(() => setOrders([]));
  };

  const handleAdd = (e) => {
    e.preventDefault();
    fetch('/api/customers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(r => r.json()).then(() => {
        toast.success('Customer added');
        setShowAddModal(false);
        setForm({ name: '', phone: '', email: '', address: '', city: '', governorate: '', type: 'individual', notes: '' });
        fetchCustomers();
      }).catch(() => toast.error('Failed to add customer'));
  };

  const handleDelete = (customer) => {
    if (!confirm(`Delete ${customer.name || customer.phone}?`)) return;
    fetch(`/api/customers/${encodeURIComponent(customer.phone)}`, { method: 'DELETE' })
      .then(r => r.json()).then(() => { toast.success('Customer deleted'); fetchCustomers(); setSelectedCustomer(null); })
      .catch(() => toast.error('Delete failed'));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Customers</h1>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{customers.length} customers</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">+ Add Customer</button>
      </div>

      <div className="card anim-fade-up stagger-1">
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search name, phone, email..." value={search} onChange={e => setSearch(e.target.value)} className="input-field flex-1" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))', minWidth: 120 }}>
            <option value="">All Types</option>
            <option value="individual">Individual</option>
            <option value="business">Business</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-36">
          <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
        </div>
      ) : (
        <div className="card anim-fade-up stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.015)' }}>
                  {['Name', 'Phone', 'Orders', 'Total Spent', 'Last Order', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map(c => (
                  <tr key={c.phone} className="table-row" style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => { setSelectedCustomer(c); fetchOrders(c.phone); }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,115,85,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: 'var(--bg-tertiary)', color: 'var(--accent)' }}>
                          {(c.name || 'U')[0].toUpperCase()}
                        </div>
                        <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.name || '—'}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{c.phone || '—'}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{c.total_orders}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--accent)' }}>EGP {(c.total_spent || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{c.last_order_date || '—'}</td>
                    <td className="py-3 px-4">
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(c); }} className="btn btn-secondary btn-sm text-[10px]" style={{ color: 'var(--danger)' }}>Delete</button>
                    </td>
                  </tr>
                ))}
                {customers.length === 0 && <tr><td colSpan="6" className="py-14 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No customers found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setSelectedCustomer(null)}>
          <div className="w-full max-w-lg card max-h-[80vh] overflow-y-auto" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedCustomer.name || selectedCustomer.phone}</h2>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{selectedCustomer.phone} · {selectedCustomer.total_orders} orders</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="btn btn-secondary btn-sm">Close</button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Total Spent</p>
                <p className="text-sm font-bold mt-1" style={{ color: 'var(--accent)' }}>EGP {(selectedCustomer.total_spent || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Avg Order</p>
                <p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>EGP {(selectedCustomer.avg_order_value || 0).toLocaleString()}</p>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Delivered</p>
                <p className="text-sm font-bold mt-1" style={{ color: 'var(--success)' }}>{selectedCustomer.delivered_count || 0}</p>
              </div>
            </div>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Order History</h3>
            <div className="space-y-2">
              {orders.slice(0, 10).map(o => (
                <div key={o.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                  <div>
                    <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{o.source_order_id || o.id}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{o.order_date || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>EGP {(o.total_price || 0).toLocaleString()}</p>
                    <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full ${o.status === 'Delivered' ? 'bg-green-100 text-green-700' : o.status === 'Cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>No orders</p>}
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md card" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Add Customer</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Name *</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Phone *</label>
                  <input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Type</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }}>
                    <option value="individual">Individual</option>
                    <option value="business">Business</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Address</label>
                <input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} className="input-field w-full" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>City</label>
                  <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Governorate</label>
                  <input value={form.governorate} onChange={e => setForm({ ...form, governorate: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Customer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
