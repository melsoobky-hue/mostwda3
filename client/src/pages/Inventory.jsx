import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';

export default function Inventory() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [search, setSearch] = useState('');
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRestockModal, setShowRestockModal] = useState(null);
  const [form, setForm] = useState({ sku: '', name: '', stock_quantity: 0, low_stock_threshold: 5, reorder_point: 10, reorder_quantity: 20, cost: 0, notes: '' });
  const [restockQty, setRestockQty] = useState(0);

  const fetchItems = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (showLowOnly) params.set('lowStock', '1');
    fetch(`/api/inventory?${params}`).then(r => r.json()).then(d => {
      setItems(d.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const syncFromProducts = () => {
    setSyncing(true);
    fetch('/api/inventory/sync', { method: 'POST' }).then(r => r.json()).then(d => {
      toast.success(`Synced ${d.synced || 0} new products from database`);
      setSyncing(false);
      fetchItems();
    }).catch(() => { toast.error('Sync failed'); setSyncing(false); });
  };

  useEffect(() => { syncFromProducts(); }, []);
  useEffect(() => { fetchItems(); }, [search, showLowOnly]);

  const handleAdd = (e) => {
    e.preventDefault();
    fetch('/api/inventory', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(r => r.json()).then(() => {
        toast.success('Inventory item added');
        setShowAddModal(false);
        setForm({ sku: '', name: '', stock_quantity: 0, low_stock_threshold: 5, reorder_point: 10, reorder_quantity: 20, cost: 0, notes: '' });
        fetchItems();
      });
  };

  const handleRestock = (item) => {
    const newQty = (item.stock_quantity || 0) + restockQty;
    fetch('/api/inventory/stock', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: item.sku, quantity: newQty, notes: `Restocked +${restockQty}` }),
    }).then(r => r.json()).then(() => {
      toast.success(`Restocked ${item.name}: ${newQty} units`);
      setShowRestockModal(null);
      setRestockQty(0);
      fetchItems();
    });
  };

  const lowStockCount = items.filter(i => i.stock_quantity <= i.low_stock_threshold).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{items.length} items {lowStockCount > 0 && <span style={{ color: 'var(--danger)' }}>· {lowStockCount} low stock</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={syncFromProducts} disabled={syncing} className="btn btn-secondary btn-sm">
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {syncing ? 'Syncing...' : 'Sync from Products'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Item
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card anim-fade-up stagger-1">
        <div className="flex items-center gap-3">
          <input type="text" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="input-field flex-1" />
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showLowOnly} onChange={e => setShowLowOnly(e.target.checked)} className="rounded" style={{ accentColor: 'var(--danger)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>Low stock only</span>
          </label>
        </div>
      </div>

      {/* Table */}
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
                  {['SKU', 'Name', 'Stock', 'Threshold', 'Reorder Point', 'Cost', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const isLow = item.stock_quantity <= item.low_stock_threshold;
                  const isOut = item.stock_quantity === 0;
                  return (
                    <tr key={item.id} className="table-row">
                      <td className="py-3 px-4 text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>{item.sku}</td>
                      <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                      <td className="py-3 px-4 text-[12px] font-bold" style={{ color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--text-primary)' }}>{item.stock_quantity}</td>
                      <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.low_stock_threshold}</td>
                      <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.reorder_point}</td>
                      <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>EGP {(item.cost || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {isOut ? <span className="badge badge-red">Out of Stock</span> :
                         isLow ? <span className="badge badge-yellow">Low Stock</span> :
                         <span className="badge badge-green">In Stock</span>}
                      </td>
                      <td className="py-3 px-4">
                        <button onClick={() => { setShowRestockModal(item); setRestockQty(item.reorder_quantity || 20); }}
                          className="btn btn-secondary btn-sm text-[10px]">
                          Restock
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td colSpan="8" className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No inventory items found</td></tr>}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }} onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md card anim-scale" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Add Inventory Item</h2>
            <form onSubmit={handleAdd} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>SKU</label>
                  <input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Stock</label>
                  <input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: parseInt(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Low Threshold</label>
                  <input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: parseInt(e.target.value) || 5 })} className="input-field" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Reorder Point</label>
                  <input type="number" value={form.reorder_point} onChange={e => setForm({ ...form, reorder_point: parseInt(e.target.value) || 10 })} className="input-field" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Cost (EGP)</label>
                  <input type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} className="input-field" />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Reorder Qty</label>
                  <input type="number" value={form.reorder_quantity} onChange={e => setForm({ ...form, reorder_quantity: parseInt(e.target.value) || 20 })} className="input-field" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restock Modal */}
      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }} onClick={() => setShowRestockModal(null)}>
          <div className="w-full max-w-sm card anim-scale" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Restock</h2>
            <p className="text-[11px] mb-4" style={{ color: 'var(--text-muted)' }}>{showRestockModal.name} ({showRestockModal.sku})</p>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>Current stock: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{showRestockModal.stock_quantity}</span></p>
            <input type="number" value={restockQty} onChange={e => setRestockQty(parseInt(e.target.value) || 0)} className="input-field w-full mb-4" placeholder="Quantity to add" />
            <p className="text-xs mb-4" style={{ color: 'var(--text-primary)' }}>New stock: <span className="font-bold" style={{ color: 'var(--success)' }}>{(showRestockModal.stock_quantity || 0) + restockQty}</span></p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRestockModal(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={() => handleRestock(showRestockModal)} className="btn btn-primary btn-sm">Confirm Restock</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
