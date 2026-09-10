import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

export default function Invoices() {
  const { toast } = useToast();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ customer_id: '', status: 'draft', date: new Date().toISOString().slice(0,10), due_date: '', tax_percent: 14, discount_percent: 0, shipping_cost: 0, notes: '', terms: '', items: [{ product_name: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 14, total: 0 }] });

  const fetchInvoices = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (statusFilter) p.set('status', statusFilter);
    fetch(`/api/erp/invoices?${p}`).then(r => r.json()).then(d => { setInvoices(d.invoices || []); setLoading(false); }).catch(() => setLoading(false));
  };

  const fetchMeta = () => {
    fetch('/api/erp/customers?limit=500').then(r => r.json()).then(d => setCustomers(d.customers || []));
    fetch('/api/erp/products?limit=500').then(r => r.json()).then(d => setProducts(d.products || []));
  };

  useEffect(() => { fetchInvoices(); fetchMeta(); }, [search, statusFilter]);

  const calcItem = (item) => {
    const sub = (item.quantity || 0) * (item.unit_price || 0);
    const disc = sub * ((item.discount_percent || 0) / 100);
    const afterDisc = sub - disc;
    const tax = afterDisc * ((item.tax_percent || 0) / 100);
    return Math.round((afterDisc + tax) * 100) / 100;
  };

  const calcTotals = () => {
    let subtotal = 0, taxTotal = 0;
    form.items.forEach(it => {
      const sub = (it.quantity || 0) * (it.unit_price || 0);
      const disc = sub * ((it.discount_percent || 0) / 100);
      const afterDisc = sub - disc;
      subtotal += afterDisc;
      taxTotal += afterDisc * ((it.tax_percent || 0) / 100);
    });
    const discount = subtotal * ((form.discount_percent || 0) / 100);
    const total = subtotal - discount + taxTotal + (form.shipping_cost || 0);
    return { subtotal: Math.round(subtotal * 100) / 100, discount: Math.round(discount * 100) / 100, tax: Math.round(taxTotal * 100) / 100, total: Math.round(total * 100) / 100 };
  };

  const updateItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    items[idx].total = calcItem(items[idx]);
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { product_name: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 14, total: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleCreate = (e) => {
    e.preventDefault();
    const totals = calcTotals();
    const payload = { ...form, ...totals, balance_due: totals.total, customer_id: form.customer_id || null };
    fetch('/api/erp/invoices', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      .then(r => r.json()).then(d => { toast.success(`Invoice created: ${d.id}`); setShowCreate(false); fetchInvoices(); })
      .catch(() => toast.error('Failed'));
  };

  const handleStatus = (id, status) => {
    fetch(`/api/erp/invoices/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
      .then(() => { toast.success('Updated'); fetchInvoices(); if (viewInvoice?.id === id) fetchInvoice(id); });
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this invoice?')) return;
    fetch(`/api/erp/invoices/${id}`, { method: 'DELETE' }).then(() => { toast.success('Deleted'); fetchInvoices(); setViewInvoice(null); });
  };

  const fetchInvoice = (id) => {
    fetch(`/api/erp/invoices/${id}`).then(r => r.json()).then(d => setViewInvoice(d));
  };

  const selectProduct = (idx, productId) => {
    const p = products.find(x => x.id === parseInt(productId));
    if (p) {
      updateItem(idx, 'product_id', p.id);
      updateItem(idx, 'product_name', p.name);
      updateItem(idx, 'unit_price', p.price || 0);
      updateItem(idx, 'description', p.name_ar || '');
    }
  };

  const totals = calcTotals();
  const statusColors = { draft: 'var(--text-muted)', sent: 'var(--accent)', partial: 'var(--warning)', paid: 'var(--success)', cancelled: 'var(--danger)' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Invoices</h1>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{invoices.length} invoices</p>
        </div>
        <button onClick={() => { setShowCreate(true); fetchMeta(); }} className="btn btn-primary btn-sm">+ New Invoice</button>
      </div>

      <div className="card anim-fade-up stagger-1">
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search invoice, customer..." value={search} onChange={e => setSearch(e.target.value)} className="input-field flex-1" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))', minWidth: 120 }}>
            <option value="">All Status</option>
            <option value="draft">Draft</option><option value="sent">Sent</option><option value="partial">Partial</option><option value="paid">Paid</option><option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-36"><div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div></div>
      ) : (
        <div className="card anim-fade-up stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.015)' }}>
                {['Number', 'Customer', 'Date', 'Due', 'Total', 'Paid', 'Balance', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} className="table-row" style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => fetchInvoice(inv.id)}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,115,85,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td className="py-3 px-4 text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>{inv.invoice_number}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{inv.customer_name || '—'}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{inv.date}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{inv.due_date || '—'}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>EGP {(inv.total || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--success)' }}>EGP {(inv.amount_paid || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: inv.balance_due > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>EGP {(inv.balance_due || 0).toLocaleString()}</td>
                    <td className="py-3 px-4"><span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${statusColors[inv.status]}20`, color: statusColors[inv.status] }}>{inv.status}</span></td>
                    <td className="py-3 px-4"><button onClick={e => { e.stopPropagation(); fetchInvoice(inv.id); }} className="btn btn-secondary btn-sm text-[10px]">View</button></td>
                  </tr>
                ))}
                {invoices.length === 0 && <tr><td colSpan="9" className="py-14 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No invoices</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setViewInvoice(null)}>
          <div className="w-full max-w-2xl card max-h-[85vh] overflow-y-auto" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{viewInvoice.invoice_number}</h2>
                <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{viewInvoice.customer_name || 'No customer'} · {viewInvoice.date}</p>
              </div>
              <div className="flex items-center gap-2">
                {viewInvoice.status === 'draft' && <button onClick={() => handleStatus(viewInvoice.id, 'sent')} className="btn btn-primary btn-sm text-[10px]">Send</button>}
                {viewInvoice.status === 'sent' && <button onClick={() => handleStatus(viewInvoice.id, 'paid')} className="btn btn-sm text-[10px]" style={{ background: 'var(--success)', color: '#fff' }}>Mark Paid</button>}
                <button onClick={() => handleDelete(viewInvoice.id)} className="btn btn-secondary btn-sm text-[10px]" style={{ color: 'var(--danger)' }}>Delete</button>
                <button onClick={() => setViewInvoice(null)} className="btn btn-secondary btn-sm">Close</button>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3 mb-5">
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Subtotal</p><p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>EGP {(viewInvoice.subtotal || 0).toLocaleString()}</p></div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Tax</p><p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>EGP {(viewInvoice.tax_amount || 0).toLocaleString()}</p></div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Total</p><p className="text-sm font-bold mt-1" style={{ color: 'var(--accent)' }}>EGP {(viewInvoice.total || 0).toLocaleString()}</p></div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Balance Due</p><p className="text-sm font-bold mt-1" style={{ color: viewInvoice.balance_due > 0 ? 'var(--danger)' : 'var(--success)' }}>EGP {(viewInvoice.balance_due || 0).toLocaleString()}</p></div>
            </div>
            <table className="w-full mb-4">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Item', 'Qty', 'Price', 'Disc%', 'Tax%', 'Total'].map(h => <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {(viewInvoice.items || []).map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 px-3 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{it.product_name}</td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-primary)' }}>{it.quantity}</td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-primary)' }}>EGP {(it.unit_price || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>{it.discount_percent || 0}%</td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>{it.tax_percent || 0}%</td>
                    <td className="py-2 px-3 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>EGP {(it.total || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {viewInvoice.notes && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}><strong>Notes:</strong> {viewInvoice.notes}</p>}
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-3xl card max-h-[85vh] overflow-y-auto" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>New Invoice</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Customer</label>
                  <select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }}>
                    <option value="">No customer</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label>
                  <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Due Date</label>
                  <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Items</h3><button type="button" onClick={addItem} className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>+ Add Item</button></div>
                <div className="space-y-2">
                  {form.items.map((it, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                      <div className="col-span-4">
                        <select value={it.product_id || ''} onChange={e => selectProduct(i, e.target.value)} className="input-field text-[11px]" style={{ background: 'var(--bg-secondary)' }}>
                          <option value="">Custom item</option>
                          {products.map(p => <option key={p.id} value={p.id}>{p.name} - EGP {p.price}</option>)}
                        </select>
                      </div>
                      <div className="col-span-2"><input placeholder="Name" value={it.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} className="input-field text-[11px]" style={{ background: 'var(--bg-secondary)' }} /></div>
                      <div className="col-span-1"><input type="number" placeholder="Qty" value={it.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="input-field text-[11px]" style={{ background: 'var(--bg-secondary)' }} /></div>
                      <div className="col-span-2"><input type="number" placeholder="Price" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="input-field text-[11px]" style={{ background: 'var(--bg-secondary)' }} /></div>
                      <div className="col-span-1"><input type="number" placeholder="Disc%" value={it.discount_percent} onChange={e => updateItem(i, 'discount_percent', parseFloat(e.target.value) || 0)} className="input-field text-[11px]" style={{ background: 'var(--bg-secondary)' }} /></div>
                      <div className="col-span-1"><span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>EGP {(it.total || 0).toLocaleString()}</span></div>
                      <div className="col-span-1">{form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-[11px]" style={{ color: 'var(--danger)' }}>x</button>}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-4 gap-3 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Disc%</label><input type="number" value={form.discount_percent} onChange={e => setForm({ ...form, discount_percent: parseFloat(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-secondary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Tax%</label><input type="number" value={form.tax_percent} onChange={e => setForm({ ...form, tax_percent: parseFloat(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-secondary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Shipping</label><input type="number" value={form.shipping_cost} onChange={e => setForm({ ...form, shipping_cost: parseFloat(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-secondary)' }} /></div>
                <div className="flex items-end"><span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>Total: EGP {totals.total.toLocaleString()}</span></div>
              </div>

              <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Notes</label><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="input-field w-full" rows="2" style={{ background: 'var(--bg-tertiary)' }} /></div>

              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
