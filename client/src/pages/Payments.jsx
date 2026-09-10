import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

export default function Payments() {
  const { toast } = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({ customer_id: '', invoice_id: '', amount: 0, payment_method: 'cash', payment_date: new Date().toISOString().slice(0,10), reference: '', notes: '', bank_name: '', cheque_number: '' });

  const fetchPayments = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (methodFilter) p.set('payment_method', methodFilter);
    fetch(`/api/erp/payments?${p}`).then(r => r.json()).then(d => { setPayments(d.payments || []); setLoading(false); }).catch(() => setLoading(false));
  };

  const fetchMeta = () => {
    fetch('/api/erp/customers?limit=500').then(r => r.json()).then(d => setCustomers(d.customers || []));
    fetch('/api/erp/invoices?limit=500&status=sent').then(r => r.json()).then(d => setInvoices(d.invoices || []));
  };

  useEffect(() => { fetchPayments(); fetchMeta(); }, [search, methodFilter]);

  const handleCreate = (e) => {
    e.preventDefault();
    fetch('/api/erp/payments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, customer_id: form.customer_id || null, invoice_id: form.invoice_id || null }) })
      .then(r => r.json()).then(d => { toast.success('Payment recorded'); setShowCreate(false); setForm({ customer_id: '', invoice_id: '', amount: 0, payment_method: 'cash', payment_date: new Date().toISOString().slice(0,10), reference: '', notes: '', bank_name: '', cheque_number: '' }); fetchPayments(); });
  };

  const handleDelete = (id) => {
    if (!confirm('Delete payment?')) return;
    fetch(`/api/erp/payments/${id}`, { method: 'DELETE' }).then(() => { toast.success('Deleted'); fetchPayments(); });
  };

  const totalAmount = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div><h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Payments</h1><p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{payments.length} payments · EGP {totalAmount.toLocaleString()}</p></div>
        <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ Record Payment</button>
      </div>

      <div className="card anim-fade-up stagger-1">
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search payment, customer..." value={search} onChange={e => setSearch(e.target.value)} className="input-field flex-1" style={{ background: 'var(--bg-tertiary)' }} />
          <select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="input-field" style={{ background: 'var(--bg-tertiary)', minWidth: 120 }}>
            <option value="">All Methods</option>
            <option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="online">Online</option>
          </select>
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center h-36"><div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div></div> : (
        <div className="card anim-fade-up stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.015)' }}>
                {['Number', 'Customer', 'Invoice', 'Amount', 'Method', 'Date', 'Reference', 'Actions'].map(h => <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,115,85,0.03)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td className="py-3 px-4 text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>{p.payment_number}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.customer_name || '—'}</td>
                    <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{p.invoice_number || '—'}</td>
                    <td className="py-3 px-4 text-[11px] font-bold" style={{ color: 'var(--success)' }}>EGP {(p.amount || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.payment_method}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.payment_date}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                    <td className="py-3 px-4"><button onClick={() => handleDelete(p.id)} className="btn btn-secondary btn-sm text-[10px]" style={{ color: 'var(--danger)' }}>Delete</button></td>
                  </tr>
                ))}
                {payments.length === 0 && <tr><td colSpan="8" className="py-14 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No payments</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-md card" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Record Payment</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Customer</label><select value={form.customer_id} onChange={e => setForm({ ...form, customer_id: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }}><option value="">Select</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Invoice</label><select value={form.invoice_id} onChange={e => setForm({ ...form, invoice_id: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }}><option value="">None</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.invoice_number} - EGP {(i.balance_due || 0).toLocaleString()}</option>)}</select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Amount (EGP) *</label><input type="number" step="0.01" required value={form.amount} onChange={e => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Method</label><select value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }}><option value="cash">Cash</option><option value="bank_transfer">Bank Transfer</option><option value="card">Card</option><option value="cheque">Cheque</option><option value="online">Online</option></select></div>
              </div>
              <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Date</label><input type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Reference</label><input value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Bank</label><input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowCreate(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
