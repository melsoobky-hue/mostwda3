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
  const [sourceFilter, setSourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [categories, setCategories] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [showRestockModal, setShowRestockModal] = useState(null);
  const [form, setForm] = useState({ sku: '', name: '', stock_quantity: 0, low_stock_threshold: 5, reorder_point: 10, reorder_quantity: 20, cost: 0, notes: '' });
  const [restockQty, setRestockQty] = useState(0);
  const [view, setView] = useState('table');

  const fetchItems = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (showLowOnly) params.set('lowStock', '1');
    if (sourceFilter) params.set('source', sourceFilter);
    if (categoryFilter) params.set('category', categoryFilter);
    fetch(`/api/inventory?${params}`).then(r => r.json()).then(d => {
      setItems(d.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const fetchCategories = () => {
    fetch('/api/products').then(r => r.json()).then(d => {
      const cats = [...new Set((d.products || []).map(p => p.category).filter(Boolean))];
      setCategories(cats);
    }).catch(() => {});
  };

  const syncFromProducts = () => {
    setSyncing(true);
    fetch('/api/inventory/sync', { method: 'POST' }).then(r => r.json()).then(d => {
      toast.success(`Synced ${d.synced || 0} new products from database`);
      setSyncing(false);
      fetchItems();
    }).catch(() => { toast.error('Sync failed'); setSyncing(false); });
  };

  useEffect(() => { syncFromProducts(); fetchCategories(); }, []);
  useEffect(() => { fetchItems(); }, [search, showLowOnly, sourceFilter, categoryFilter]);

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

  const handleEdit = (e) => {
    e.preventDefault();
    fetch(`/api/inventory/stock`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: editItem.sku, quantity: editItem.stock_quantity, low_stock_threshold: editItem.low_stock_threshold, cost: editItem.cost, notes: editItem.notes }),
    }).then(r => r.json()).then(() => { toast.success('Updated'); setEditItem(null); fetchItems(); });
  };

  const handleRestock = (item) => {
    const newQty = (item.stock_quantity || 0) + restockQty;
    fetch('/api/inventory/stock', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sku: item.sku, quantity: newQty, notes: `Restocked +${restockQty}` }),
    }).then(r => r.json()).then(() => { toast.success(`Restocked ${item.name}: ${newQty} units`); setShowRestockModal(null); setRestockQty(0); fetchItems(); });
  };

  const lowStockCount = items.filter(i => i.stock_quantity <= i.low_stock_threshold).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Inventory</h1>
          <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{items.length} items {lowStockCount > 0 && <span style={{ color: 'var(--danger)' }}>· {lowStockCount} low stock</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(view === 'table' ? 'grid' : 'table')} className="btn btn-secondary btn-sm">
            {view === 'table' ? 'Grid' : 'Table'}
          </button>
          <button onClick={syncFromProducts} disabled={syncing} className="btn btn-secondary btn-sm">
            <svg className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            {syncing ? 'Syncing...' : 'Sync'}
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">+ Add Item</button>
        </div>
      </div>

      <div className="card anim-fade-up stagger-1">
        <div className="flex items-center gap-3 flex-wrap">
          <input type="text" placeholder="Search by name or SKU..." value={search} onChange={e => setSearch(e.target.value)} className="input-field flex-1 min-w-[200px]" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))', minWidth: 120 }}>
            <option value="">All Sources</option>
            <option value="saraydecore">Saray Decore</option>
            <option value="mostwda3">Mostwda3</option>
            <option value="chichomz">Chichomz</option>
            <option value="raneen">Raneen</option>
            <option value="manual">Manual</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))', minWidth: 120 }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showLowOnly} onChange={e => setShowLowOnly(e.target.checked)} style={{ accentColor: 'var(--danger)' }} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>Low stock</span>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-36">
          <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 anim-fade-up stagger-2">
          {items.map(item => {
            const isLow = item.stock_quantity <= item.low_stock_threshold;
            const isOut = item.stock_quantity === 0;
            return (
              <div key={item.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setEditItem({ ...item })}>
                <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
                  ) : null}
                  <div className={`flex items-center justify-center w-full h-full ${item.image_url ? 'hidden' : ''}`} style={{ display: item.image_url ? 'none' : 'flex' }}>
                    <svg className="w-10 h-10" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.sku}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[12px] font-bold" style={{ color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--text-primary)' }}>{item.stock_quantity}</span>
                    {isOut ? <span className="badge badge-red text-[9px]">Out</span> : isLow ? <span className="badge badge-yellow text-[9px]">Low</span> : <span className="badge badge-green text-[9px]">OK</span>}
                  </div>
                  {item.source && <p className="text-[9px] mt-1" style={{ color: 'var(--text-muted)' }}>{item.source}</p>}
                </div>
              </div>
            );
          })}
          {items.length === 0 && <div className="col-span-full py-14 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No items found</div>}
        </div>
      ) : (
        <div className="card anim-fade-up stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.015)' }}>
                  {['', 'SKU', 'Name', 'Source', 'Category', 'Stock', 'Threshold', 'Cost', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const isLow = item.stock_quantity <= item.low_stock_threshold;
                  const isOut = item.stock_quantity === 0;
                  return (
                    <tr key={item.id} className="table-row" style={{ borderBottom: '1px solid var(--border)' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,115,85,0.03)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}>
                      <td className="py-3 px-4 w-10">
                        <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                          {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> :
                            <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>{item.sku}</td>
                      <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</td>
                      <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.source || '—'}</td>
                      <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{item.category || '—'}</td>
                      <td className="py-3 px-4 text-[12px] font-bold" style={{ color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--text-primary)' }}>{item.stock_quantity}</td>
                      <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{item.low_stock_threshold}</td>
                      <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>EGP {(item.cost || 0).toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {isOut ? <span className="badge badge-red">Out</span> : isLow ? <span className="badge badge-yellow">Low</span> : <span className="badge badge-green">OK</span>}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => setEditItem({ ...item })} className="btn btn-secondary btn-sm text-[10px]">Edit</button>
                          <button onClick={() => { setShowRestockModal(item); setRestockQty(item.reorder_quantity || 20); }} className="btn btn-secondary btn-sm text-[10px]">Restock</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {items.length === 0 && <tr><td colSpan="10" className="py-14 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No items found</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-md card" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Add Inventory Item</h2>
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>SKU</label>
                  <input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Name</label>
                  <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Stock</label>
                  <input type="number" value={form.stock_quantity} onChange={e => setForm({ ...form, stock_quantity: parseInt(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Low Threshold</label>
                  <input type="number" value={form.low_stock_threshold} onChange={e => setForm({ ...form, low_stock_threshold: parseInt(e.target.value) || 5 })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Cost (EGP)</label>
                  <input type="number" step="0.01" value={form.cost} onChange={e => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Add Item</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setEditItem(null)}>
          <div className="w-full max-w-md card" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{editItem.name}</h2>
            <p className="text-[11px] mb-5" style={{ color: 'var(--text-muted)' }}>SKU: {editItem.sku}</p>
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Stock</label>
                  <input type="number" value={editItem.stock_quantity} onChange={e => setEditItem({ ...editItem, stock_quantity: parseInt(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Low Threshold</label>
                  <input type="number" value={editItem.low_stock_threshold} onChange={e => setEditItem({ ...editItem, low_stock_threshold: parseInt(e.target.value) || 5 })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
                <div>
                  <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Cost (EGP)</label>
                  <input type="number" step="0.01" value={editItem.cost} onChange={e => setEditItem({ ...editItem, cost: parseFloat(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1 block" style={{ color: 'var(--text-muted)' }}>Notes</label>
                <input value={editItem.notes || ''} onChange={e => setEditItem({ ...editItem, notes: e.target.value })} className="input-field w-full" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => setEditItem(null)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRestockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setShowRestockModal(null)}>
          <div className="w-full max-w-sm card" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-1.5" style={{ color: 'var(--text-primary)' }}>Restock</h2>
            <p className="text-[11px] mb-5" style={{ color: 'var(--text-muted)' }}>{showRestockModal.name} ({showRestockModal.sku})</p>
            <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>Current: <span className="font-bold" style={{ color: 'var(--text-primary)' }}>{showRestockModal.stock_quantity}</span></p>
            <input type="number" value={restockQty} onChange={e => setRestockQty(parseInt(e.target.value) || 0)} className="input-field w-full mb-4" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} placeholder="Qty to add" />
            <p className="text-xs mb-5" style={{ color: 'var(--text-primary)' }}>New: <span className="font-bold" style={{ color: 'var(--success)' }}>{(showRestockModal.stock_quantity || 0) + restockQty}</span></p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRestockModal(null)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={() => handleRestock(showRestockModal)} className="btn btn-primary btn-sm">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
