import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import { CopyButton } from '../components/QuickActions';

export default function Shipping() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [shipments, setShipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ source: '', source_order_id: '', shipping_company: 'Bosta', tracking_number: '', status: 'Pending', notes: '' });

  const fetchShipments = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter) params.set('status', filter);
    if (companyFilter) params.set('company', companyFilter);
    fetch(`/api/shipments?${params}`).then(r => r.json()).then(d => {
      setShipments(d.shipments || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchShipments(); }, [filter, companyFilter]);

  const handleAdd = (e) => {
    e.preventDefault();
    fetch('/api/shipments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(r => r.json()).then(() => {
        toast.success('Shipment added');
        setShowAddModal(false);
        setForm({ source: '', source_order_id: '', shipping_company: 'Bosta', tracking_number: '', status: 'Pending', notes: '' });
        fetchShipments();
      });
  };

  const openWhatsApp = (phone, order) => {
    const msg = `Hello ${order}! Your order has been ${form.status || 'updated'}. Track here: https://bosta.co/track/${form.tracking_number || ''}`;
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const getStatusBadge = (status) => {
    const map = { 'Pending': 'badge-yellow', 'Picked Up': 'badge-blue', 'In Transit': 'badge-cyan', 'Delivered': 'badge-green', 'Returned': 'badge-purple', 'Failed': 'badge-red' };
    return map[status] || 'badge-gray';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Shipping</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{shipments.length} shipments tracked</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Shipment
        </button>
      </div>

      <div className="card anim-fade-up stagger-1">
        <div className="flex items-center gap-3">
          <select value={filter} onChange={e => setFilter(e.target.value)} className="input-field">
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Picked Up">Picked Up</option>
            <option value="In Transit">In Transit</option>
            <option value="Delivered">Delivered</option>
            <option value="Returned">Returned</option>
            <option value="Failed">Failed</option>
          </select>
          <select value={companyFilter} onChange={e => setCompanyFilter(e.target.value)} className="input-field">
            <option value="">All Companies</option>
            <option value="Bosta">Bosta</option>
            <option value="J&T">J&T</option>
            <option value="Aramex">Aramex</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="card anim-fade-up stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                  {['Order', 'Company', 'Tracking', 'Status', 'Pickup', 'Delivery', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shipments.map(s => (
                  <tr key={s.id} className="table-row">
                    <td className="py-3 px-4 text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>#{s.source_order_id}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{s.shipping_company}</td>
                    <td className="py-3 px-4 flex items-center gap-1">
                      <span className="text-[11px] font-mono" style={{ color: 'var(--text-primary)' }}>{s.tracking_number || '-'}</span>
                      {s.tracking_number && <CopyButton text={s.tracking_number} label="Tracking" />}
                    </td>
                    <td className="py-3 px-4"><span className={`badge ${getStatusBadge(s.status)}`}>{s.status}</span></td>
                    <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.pickup_date || '-'}</td>
                    <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{s.delivery_date || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="flex gap-1">
                        {s.tracking_number && (
                          <a href={`https://bosta.co/track/${s.tracking_number}`} target="_blank" rel="noopener noreferrer"
                            className="btn btn-ghost btn-sm p-1.5" title="Track on Bosta">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          </a>
                        )}
                        <button onClick={() => openWhatsApp(s.customer_phone || '201000000000', s.source_order_id)}
                          className="btn btn-ghost btn-sm p-1.5" title="WhatsApp" style={{ color: '#25D366' }}>
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {shipments.length === 0 && <tr><td colSpan="7" className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No shipments found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md card anim-scale" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add Shipment</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Source</label>
                  <select value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="input-field" required>
                    <option value="">Select</option>
                    <option value="mostwda3">Mostwda3</option>
                    <option value="chichomz">Chichomz</option>
                    <option value="raneen">Raneen</option>
                    <option value="saraydecore">Saray Decore</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Order ID</label>
                  <input required value={form.source_order_id} onChange={e => setForm({ ...form, source_order_id: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Company</label>
                  <select value={form.shipping_company} onChange={e => setForm({ ...form, shipping_company: e.target.value })} className="input-field">
                    <option value="Bosta">Bosta</option>
                    <option value="J&T">J&T</option>
                    <option value="Aramex">Aramex</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Tracking #</label>
                  <input value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} className="input-field" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field">
                  {['Pending', 'Picked Up', 'In Transit', 'Delivered', 'Returned', 'Failed'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Shipment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
