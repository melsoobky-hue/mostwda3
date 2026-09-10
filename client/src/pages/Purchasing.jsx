import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';

const STATUSES = ['draft', 'sent', 'confirmed', 'received', 'cancelled'];
const STATUS_COLORS = { draft: 'badge-gray', sent: 'badge-blue', confirmed: 'badge-yellow', received: 'badge-green', cancelled: 'badge-red' };

function fmt(n) { return (Number(n) || 0).toLocaleString('en-EG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
const today = () => new Date().toISOString().slice(0, 10);

const blankForm = () => ({
  supplier_id: '', status: 'draft', order_date: today(), expected_date: '', tax_percent: 14,
  shipping_cost: 0, notes: '', items: [{ product_name: '', sku: '', quantity: 1, unit_price: 0, tax_percent: 14, total: 0 }],
});

export default function Purchasing() {
  const { toast } = useToast();
  const [tab, setTab] = useState('orders'); // orders | suppliers | receipts
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSupplierForm, setShowSupplierForm] = useState(false);
  const [viewOrder, setViewOrder] = useState(null);
  const [form, setForm] = useState(blankForm());
  const [supplierForm, setSupplierForm] = useState({ name: '', contact_person: '', email: '', phone: '', address: '', payment_terms: 30 });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchAll = useCallback(() => {
    setLoading(true);
    const sp = new URLSearchParams();
    if (search) sp.set('search', search);
    if (statusFilter) sp.set('status', statusFilter);
    Promise.all([
      fetch(`/api/erp/purchase-orders?${sp}`).then(r => r.json()),
      fetch('/api/erp/suppliers?limit=200').then(r => r.json()),
      fetch('/api/erp/goods-receipts?limit=50').then(r => r.json()),
    ]).then(([po, sup, gr]) => {
      setOrders(po.orders || []);
      setSuppliers(sup.suppliers || []);
      setReceipts(gr.receipts || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const calcItem = it => {
    const sub = (it.quantity || 0) * (it.unit_price || 0);
    return Math.round(sub * (1 + (it.tax_percent || 0) / 100) * 100) / 100;
  };
  const calcTotals = () => {
    const subtotal = form.items.reduce((s, it) => s + (it.quantity || 0) * (it.unit_price || 0), 0);
    const tax = form.items.reduce((s, it) => s + (it.quantity || 0) * (it.unit_price || 0) * (it.tax_percent || 0) / 100, 0);
    return { subtotal: Math.round(subtotal * 100) / 100, tax: Math.round(tax * 100) / 100, total: Math.round((subtotal + tax + (Number(form.shipping_cost) || 0)) * 100) / 100 };
  };

  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    items[idx].total = calcItem(items[idx]);
    setForm({ ...form, items });
  };

  const saveOrder = async () => {
    const totals = calcTotals();
    const payload = { ...form, ...totals, balance_due: totals.total, tax_amount: totals.tax };
    const res = await fetch('/api/erp/purchase-orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { toast.success('Purchase order created'); setShowCreate(false); setForm(blankForm()); fetchAll(); }
    else { const err = await res.json(); toast.error(err.error || 'Failed'); }
  };

  const saveSupplier = async () => {
    const res = await fetch('/api/erp/suppliers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(supplierForm) });
    if (res.ok) { toast.success('Supplier added'); setShowSupplierForm(false); setSupplierForm({ name: '', contact_person: '', email: '', phone: '', address: '', payment_terms: 30 }); fetchAll(); }
    else toast.error('Failed to save supplier');
  };

  const updateStatus = async (id, status) => {
    await fetch(`/api/erp/purchase-orders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    toast.success('Status updated'); fetchAll();
  };

  const deleteOrder = async (id) => {
    if (!confirm('Delete this purchase order?')) return;
    await fetch(`/api/erp/purchase-orders/${id}`, { method: 'DELETE' });
    toast.success('Deleted'); fetchAll();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Purchasing</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Suppliers, purchase orders, and goods receipts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSupplierForm(true)} className="btn btn-secondary btn-sm">+ Supplier</button>
          <button onClick={() => { setShowCreate(true); setForm(blankForm()); }} className="btn btn-primary btn-sm">+ Purchase Order</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', width: 'fit-content' }}>
        {[['orders', 'Purchase Orders'], ['suppliers', 'Suppliers'], ['receipts', 'Goods Receipts']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === key ? 'btn-primary' : ''}`}
            style={tab !== key ? { color: 'var(--text-muted)' } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      {tab === 'orders' && (
        <div className="flex gap-2 flex-wrap">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="input-field text-xs" style={{ width: 200 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-xs" style={{ width: 140 }}>
            <option value="">All Status</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Purchase Orders Table */}
      {tab === 'orders' && (
        <div className="card anim-fade-up">
          {loading ? <div className="text-center py-10" style={{ color: 'var(--text-muted)' }}>Loading...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['PO Number', 'Supplier', 'Date', 'Expected', 'Total', 'Status', ''].map(h => (
                      <th key={h} className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(po => (
                    <tr key={po.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover-row">
                      <td className="py-2.5 px-3 font-mono font-semibold" style={{ color: 'var(--accent)' }}>{po.po_number}</td>
                      <td className="py-2.5 px-3">{po.supplier_name || '—'}</td>
                      <td className="py-2.5 px-3">{po.order_date}</td>
                      <td className="py-2.5 px-3">{po.expected_date || '—'}</td>
                      <td className="py-2.5 px-3 font-semibold">ج.م {fmt(po.total)}</td>
                      <td className="py-2.5 px-3"><span className={`badge ${STATUS_COLORS[po.status] || 'badge-gray'}`}>{po.status}</span></td>
                      <td className="py-2.5 px-3">
                        <div className="flex gap-1">
                          <button onClick={() => setViewOrder(po)} className="btn btn-secondary btn-xs">View</button>
                          {po.status === 'confirmed' && (
                            <button onClick={() => updateStatus(po.id, 'received')} className="btn btn-primary btn-xs">Receive</button>
                          )}
                          {po.status === 'draft' && (
                            <button onClick={() => updateStatus(po.id, 'sent')} className="btn btn-secondary btn-xs">Send</button>
                          )}
                          {['draft', 'cancelled'].includes(po.status) && (
                            <button onClick={() => deleteOrder(po.id)} className="btn btn-danger btn-xs">×</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!orders.length && <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No purchase orders</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Suppliers Table */}
      {tab === 'suppliers' && (
        <div className="card anim-fade-up">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Name', 'Contact', 'Phone', 'Email', 'Payment Terms'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover-row">
                  <td className="py-2.5 px-3 font-semibold">{s.name}</td>
                  <td className="py-2.5 px-3">{s.contact_person || '—'}</td>
                  <td className="py-2.5 px-3">{s.phone || '—'}</td>
                  <td className="py-2.5 px-3">{s.email || '—'}</td>
                  <td className="py-2.5 px-3">{s.payment_terms} days</td>
                </tr>
              ))}
              {!suppliers.length && <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No suppliers yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Goods Receipts Table */}
      {tab === 'receipts' && (
        <div className="card anim-fade-up">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['GRN Number', 'PO', 'Supplier', 'Date', 'Notes'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {receipts.map(gr => (
                <tr key={gr.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover-row">
                  <td className="py-2.5 px-3 font-mono font-semibold" style={{ color: 'var(--accent)' }}>{gr.grn_number}</td>
                  <td className="py-2.5 px-3">{gr.po_number || '—'}</td>
                  <td className="py-2.5 px-3">{gr.supplier_name || '—'}</td>
                  <td className="py-2.5 px-3">{gr.receipt_date}</td>
                  <td className="py-2.5 px-3">{gr.notes || '—'}</td>
                </tr>
              ))}
              {!receipts.length && <tr><td colSpan={5} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No receipts</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Create PO Modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-panel" style={{ maxWidth: 780 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>New Purchase Order</h3>
              <button onClick={() => setShowCreate(false)} className="btn-icon">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="form-label">Supplier</label>
                <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} className="input-field text-xs">
                  <option value="">Select supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field text-xs">
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Order Date</label>
                <input type="date" value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} className="input-field text-xs" />
              </div>
              <div>
                <label className="form-label">Expected Date</label>
                <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })} className="input-field text-xs" />
              </div>
            </div>

            {/* Items */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Items</span>
                <button onClick={() => setForm({ ...form, items: [...form.items, { product_name: '', sku: '', quantity: 1, unit_price: 0, tax_percent: 14, total: 0 }] })} className="btn btn-secondary btn-xs">+ Row</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: 'var(--bg-secondary)' }}>
                      {['Product', 'SKU', 'Qty', 'Unit Price', 'Tax%', 'Total', ''].map(h => (
                        <th key={h} className="text-left py-1.5 px-2 font-medium" style={{ color: 'var(--text-muted)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.map((it, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td className="py-1 px-1"><input value={it.product_name} onChange={e => updateItem(idx, 'product_name', e.target.value)} className="input-field text-xs py-1" placeholder="Product name" /></td>
                        <td className="py-1 px-1"><input value={it.sku} onChange={e => updateItem(idx, 'sku', e.target.value)} className="input-field text-xs py-1" placeholder="SKU" style={{ width: 80 }} /></td>
                        <td className="py-1 px-1"><input type="number" value={it.quantity} onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 0)} className="input-field text-xs py-1" style={{ width: 60 }} /></td>
                        <td className="py-1 px-1"><input type="number" value={it.unit_price} onChange={e => updateItem(idx, 'unit_price', parseFloat(e.target.value) || 0)} className="input-field text-xs py-1" style={{ width: 90 }} /></td>
                        <td className="py-1 px-1"><input type="number" value={it.tax_percent} onChange={e => updateItem(idx, 'tax_percent', parseFloat(e.target.value) || 0)} className="input-field text-xs py-1" style={{ width: 60 }} /></td>
                        <td className="py-1.5 px-2 font-semibold">ج.م {fmt(it.total)}</td>
                        <td className="py-1 px-1"><button onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-600 text-xs px-1">✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-4">
              <div className="text-xs space-y-1" style={{ minWidth: 200 }}>
                {(() => { const t = calcTotals(); return (<>
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Subtotal</span><span>ج.م {fmt(t.subtotal)}</span></div>
                  <div className="flex justify-between"><span style={{ color: 'var(--text-muted)' }}>Tax</span><span>ج.م {fmt(t.tax)}</span></div>
                  <div className="flex justify-between font-bold" style={{ borderTop: '1px solid var(--border)', paddingTop: 4 }}><span>Total</span><span>ج.م {fmt(t.total)}</span></div>
                </>); })()}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">Notes</label>
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="input-field text-xs" />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={saveOrder} className="btn btn-primary btn-sm">Create PO</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierForm && (
        <div className="modal-overlay" onClick={() => setShowSupplierForm(false)}>
          <div className="modal-panel" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Add Supplier</h3>
              <button onClick={() => setShowSupplierForm(false)} className="btn-icon">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['name', 'Name *'], ['contact_person', 'Contact Person'], ['email', 'Email'], ['phone', 'Phone'], ['address', 'Address']].map(([k, label]) => (
                <div key={k} className={k === 'address' ? 'col-span-2' : ''}>
                  <label className="form-label">{label}</label>
                  <input value={supplierForm[k] || ''} onChange={e => setSupplierForm({ ...supplierForm, [k]: e.target.value })} className="input-field text-xs" />
                </div>
              ))}
              <div>
                <label className="form-label">Payment Terms (days)</label>
                <input type="number" value={supplierForm.payment_terms} onChange={e => setSupplierForm({ ...supplierForm, payment_terms: parseInt(e.target.value) })} className="input-field text-xs" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowSupplierForm(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={saveSupplier} className="btn btn-primary btn-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
