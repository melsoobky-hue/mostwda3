import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

export default function Estimates() {
  const { toast } = useToast();
  const [estimates, setEstimates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [viewEst, setViewEst] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ customer_id: '', status: 'draft', date: new Date().toISOString().slice(0,10), expiry_date: '', tax_percent: 14, discount_percent: 0, shipping_cost: 0, notes: '', terms: '', items: [{ product_name: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 14, total: 0 }] });

  const fetchList = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (statusFilter) p.set('status', statusFilter);
    fetch(`/api/erp/estimates?${p}`).then(r => r.json()).then(d => { setEstimates(d.estimates || []); setLoading(false); }).catch(() => setLoading(false));
  };

  const fetchMeta = () => {
    fetch('/api/erp/customers?limit=500').then(r => r.json()).then(d => setCustomers(d.customers || []));
    fetch('/api/erp/products?limit=500').then(r => r.json()).then(d => setProducts(d.products || []));
  };

  useEffect(() => { fetchList(); fetchMeta(); }, [search, statusFilter]);

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
    const sub = (items[idx].quantity || 0) * (items[idx].unit_price || 0);
    items[idx].total = Math.round(sub * (1 - (items[idx].discount_percent || 0) / 100) * (1 + (items[idx].tax_percent || 0) / 100) * 100) / 100;
    setForm({ ...form, items });
  };

  const addItem = () => setForm({ ...form, items: [...form.items, { product_name: '', description: '', quantity: 1, unit_price: 0, discount_percent: 0, tax_percent: 14, total: 0 }] });
  const removeItem = (idx) => setForm({ ...form, items: form.items.filter((_, i) => i !== idx) });

  const handleCreate = (e) => {
    e.preventDefault();
    const totals = calcTotals();
    fetch('/api/erp/estimates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, ...totals, customer_id: form.customer_id || null }) })
      .then(r => r.json()).then(d => { toast.success(`Estimate created`); setShowCreate(false); fetchList(); });
  };

  const handleConvert = (id) => {
    if (!confirm('Convert this estimate to an invoice?')) return;
    fetch(`/api/erp/estimates/${id}/convert`, { method: 'POST' })
      .then(r => r.json()).then(d => { toast.success(`Converted to invoice ${d.invoice_id}`); fetchList(); setViewEst(null); });
  };

  const handleDelete = (id) => {
    if (!confirm('Delete?')) return;
    fetch(`/api/erp/estimates/${id}`, { method: 'DELETE' }).then(() => { toast.success('Deleted'); fetchList(); setViewEst(null); });
  };

  const selectProduct = (idx, productId) => {
    const p = products.find(x => x.id === parseInt(productId));
    if (p) { updateItem(idx, 'product_id', p.id); updateItem(idx, 'product_name', p.name); updateItem(idx, 'unit_price', p.price || 0); }
  };

  const totals = calcTotals();
  const statusColors = { draft: 'var(--text-muted)', sent: 'var(--accent)', accepted: 'var(--success)', rejected: 'var(--danger)', converted: 'var(--warning)' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div><h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Estimates</h1><p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{estimates.length} estimates</p></div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ New Estimate</button>
      </div>

      <div className="card anim-fade-up stagger-1">
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="input-field flex-1" style={{ background: 'var(--bg-tertiary)' }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field" style={{ background: 'var(--bg-tertiary)', minWidth: 120 }}>
            <option value="">All Status</option>
            <option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="rejected">Rejected</option><option value="converted">Converted</option>
          </select>
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center h-36"><div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div></div> : (
        <div className="card anim-fade-up stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.015)' }}>
                {['Number', 'Customer', 'Date', 'Total', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {estimates.map(e => (
                  <tr key={e.id} className="table-row" style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => { fetch(`/api/erp/estimates/${e.id}`).then(r => r.json()).then(d => setViewEst(d)); }} onMouseEnter={ev => ev.currentTarget.style.background = 'rgba(139,115,85,0.03)'} onMouseLeave={ev => ev.currentTarget.style.background = ''}>
                    <td className="py-3 px-4 text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>{e.estimate_number}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{e.customer_name || '—'}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{e.date}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>EGP {(e.total || 0).toLocaleString()}</td>
                    <td className="py-3 px-4"><span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: `${statusColors[e.status]}20`, color: statusColors[e.status] }}>{e.status}</span></td>
                    <td className="py-3 px-4"><button onClick={ev => { ev.stopPropagation(); handleConvert(e.id); }} className="btn btn-secondary btn-sm text-[10px]" disabled={e.status === 'converted'}>Convert</button></td>
                  </tr>
                ))}
                {estimates.length === 0 && <tr><td colSpan="6" className="py-14 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No estimates</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {viewEst && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setViewEst(null)}>
          <div className="w-full max-w-2xl card max-h-[85vh] overflow-y-auto" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-5">
              <div><h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{viewEst.estimate_number}</h2><p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>{viewEst.customer_name || 'No customer'} · {viewEst.date}</p></div>
              <div className="flex items-center gap-2">
                {viewEst.status !== 'converted' && <button onClick={() => handleConvert(viewEst.id)} className="btn btn-primary btn-sm text-[10px]">Convert to Invoice</button>}
                <button onClick={() => handleDelete(viewEst.id)} className="btn btn-secondary btn-sm text-[10px]" style={{ color: 'var(--danger)' }}>Delete</button>
                <button onClick={() => setViewEst(null)} className="btn btn-secondary btn-sm">Close</button>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Subtotal</p><p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>EGP {(viewEst.subtotal || 0).toLocaleString()}</p></div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Tax</p><p className="text-sm font-bold mt-1" style={{ color: 'var(--text-primary)' }}>EGP {(viewEst.tax_amount || 0).toLocaleString()}</p></div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}><p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>Total</p><p className="text-sm font-bold mt-1" style={{ color: 'var(--accent)' }}>EGP {(viewEst.total || 0).toLocaleString()}</p></div>
            </div>
            <table className="w-full mb-4">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>{['Item', 'Qty', 'Price', 'Total'].map(h => <th key={h} className="text-left py-2 px-3 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>)}</tr></thead>
              <tbody>
                {(viewEst.items || []).map((it, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 px-3 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{it.product_name}</td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-primary)' }}>{it.quantity}</td>
                    <td className="py-2 px-3 text-[11px]" style={{ color: 'var(--text-primary)' }}>EGP {(it.unit_price || 0).toLocaleString()}</td>
                    <td className="py-2 px-3 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>EGP {(it.total || 0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-3xl card max-h-[85vh] overflow-y-auto" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>New Estimate</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Customer</label><select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }}><option value="">No customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label><input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Expiry</label><input type="date" value={form.expiry_date} onChange={e => setForm({ ...form, expiry_date: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2"><h3 className="text-[11px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>Items</h3><button type="button" onClick={addItem} className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>+ Add</button></div>
                {form.items.map((it, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 rounded-lg mb-2" style={{ background: 'var(--bg-tertiary)' }}>
                    <div className="col-span-4"><select value={it.product_id || ''} onChange={e => selectProduct(i, e.target.value)} className="input-field text-[11px]" style={{ background: 'var(--bg-secondary)' }}><option value="">Custom</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                    <div className="col-span-3"><input placeholder="Name" value={it.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} className="input-field text-[11px]" style={{ background: 'var(--bg-secondary)' }} /></div>
                    <div className="col-span-1"><input type="number" placeholder="Qty" value={it.quantity} onChange={e => updateItem(i, 'quantity', parseFloat(e.target.value) || 0)} className="input-field text-[11px]" style={{ background: 'var(--bg-secondary)' }} /></div>
                    <div className="col-span-2"><input type="number" placeholder="Price" value={it.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)} className="input-field text-[11px]" style={{ background: 'var(--bg-secondary)' }} /></div>
                    <div className="col-span-1"><span className="text-[11px] font-medium" style={{ color: 'var(--accent)' }}>{(it.total || 0).toLocaleString()}</span></div>
                    <div className="col-span-1">{form.items.length > 1 && <button type="button" onClick={() => removeItem(i)} className="text-[11px]" style={{ color: 'var(--danger)' }}>x</button>}</div>
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-3"><button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancel</button><button type="submit" className="btn btn-primary btn-sm">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
