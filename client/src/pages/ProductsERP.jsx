import { useState, useEffect } from 'react';
import { useToast } from '../components/Toast';

export default function ProductsERP() {
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [view, setView] = useState('grid');
  const [form, setForm] = useState({ name: '', name_ar: '', sku: '', barcode: '', category: '', mirror_type: '', mirror_shape: '', mirror_color: '', price: 0, cost: 0, weight: '', dimensions: '', description: '', description_ar: '', image_url: '', images: [] });

  const fetchProducts = () => {
    setLoading(true);
    const p = new URLSearchParams();
    if (search) p.set('search', search);
    if (sourceFilter) p.set('source', sourceFilter);
    if (categoryFilter) p.set('category', categoryFilter);
    fetch(`/api/erp/products?${p}`).then(r => r.json()).then(d => { setProducts(d.products || []); setLoading(false); }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, [search, sourceFilter, categoryFilter]);

  useEffect(() => {
    fetch('/api/erp/products?limit=1000').then(r => r.json()).then(d => {
      const cats = [...new Set((d.products || []).map(p => p.category).filter(Boolean))];
      setCategories(cats);
    });
  }, []);

  const handleCreate = (e) => {
    e.preventDefault();
    fetch('/api/erp/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(r => r.json()).then(d => { toast.success('Product created'); setShowCreate(false); setForm({ name: '', name_ar: '', sku: '', barcode: '', category: '', mirror_type: '', mirror_shape: '', mirror_color: '', price: 0, cost: 0, weight: '', dimensions: '', description: '', description_ar: '', image_url: '', images: [] }); fetchProducts(); });
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    fetch(`/api/erp/products/${editProduct.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editProduct) })
      .then(r => r.json()).then(() => { toast.success('Updated'); setEditProduct(null); fetchProducts(); });
  };

  const handleDelete = (id) => {
    if (!confirm('Delete this product?')) return;
    fetch(`/api/erp/products/${id}`, { method: 'DELETE' }).then(() => { toast.success('Deleted'); fetchProducts(); });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div><h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Products</h1><p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>{products.length} products</p></div>
        <div className="flex items-center gap-2">
          <button onClick={() => setView(view === 'grid' ? 'table' : 'grid')} className="btn btn-secondary btn-sm">{view === 'grid' ? 'Table' : 'Grid'}</button>
          <button onClick={() => setShowCreate(true)} className="btn btn-primary btn-sm">+ Add Product</button>
        </div>
      </div>

      <div className="card anim-fade-up stagger-1">
        <div className="flex items-center gap-3 flex-wrap">
          <input type="text" placeholder="Search name, SKU..." value={search} onChange={e => setSearch(e.target.value)} className="input-field flex-1 min-w-[200px]" style={{ background: 'var(--bg-tertiary)' }} />
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)} className="input-field" style={{ background: 'var(--bg-tertiary)', minWidth: 120 }}>
            <option value="">All Sources</option>
            <option value="saraydecore">Saray Decore</option><option value="mostwda3">Mostwda3</option><option value="manual">Manual</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} className="input-field" style={{ background: 'var(--bg-tertiary)', minWidth: 120 }}>
            <option value="">All Categories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {loading ? <div className="flex items-center justify-center h-36"><div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div></div> : view === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 anim-fade-up stagger-2">
          {products.map(p => (
            <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden', cursor: 'pointer' }} onClick={() => setEditProduct({ ...p })}>
              <div className="aspect-square flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>
                {p.image_url ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" /> : <svg className="w-10 h-10" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}
              </div>
              <div className="p-3">
                <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{p.name}</p>
                <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{p.sku || 'No SKU'}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[12px] font-bold" style={{ color: 'var(--accent)' }}>EGP {(p.price || 0).toLocaleString()}</span>
                  {p.source && <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{p.source}</span>}
                </div>
              </div>
            </div>
          ))}
          {products.length === 0 && <div className="col-span-full py-14 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No products found</div>}
        </div>
      ) : (
        <div className="card anim-fade-up stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead><tr style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.015)' }}>
                {['', 'Name', 'SKU', 'Category', 'Type', 'Price', 'Cost', 'Source', 'Actions'].map(h => <th key={h} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className="table-row" style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => setEditProduct({ ...p })} onMouseEnter={e => e.currentTarget.style.background = 'rgba(139,115,85,0.03)'} onMouseLeave={e => e.currentTarget.style.background = ''}>
                    <td className="py-3 px-4 w-10"><div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center" style={{ background: 'var(--bg-tertiary)' }}>{p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-cover" /> : <svg className="w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}</div></td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                    <td className="py-3 px-4 text-[11px] font-mono" style={{ color: 'var(--accent)' }}>{p.sku || '—'}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.category || '—'}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.mirror_type || '—'}</td>
                    <td className="py-3 px-4 text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>EGP {(p.price || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>EGP {(p.cost || 0).toLocaleString()}</td>
                    <td className="py-3 px-4 text-[10px]" style={{ color: 'var(--text-muted)' }}>{p.source || '—'}</td>
                    <td className="py-3 px-4"><button onClick={e => { e.stopPropagation(); handleDelete(p.id); }} className="btn btn-secondary btn-sm text-[10px]" style={{ color: 'var(--danger)' }}>Delete</button></td>
                  </tr>
                ))}
                {products.length === 0 && <tr><td colSpan="9" className="py-14 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No products</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(showCreate || editProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => { setShowCreate(false); setEditProduct(null); }}>
          <div className="w-full max-w-2xl card max-h-[85vh] overflow-y-auto" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>{editProduct ? 'Edit Product' : 'New Product'}</h2>
            <form onSubmit={editProduct ? handleUpdate : handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Name *</label><input required value={(editProduct || form).name} onChange={e => editProduct ? setEditProduct({ ...editProduct, name: e.target.value }) : setForm({ ...form, name: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Name (AR)</label><input value={(editProduct || form).name_ar || ''} onChange={e => editProduct ? setEditProduct({ ...editProduct, name_ar: e.target.value }) : setForm({ ...form, name_ar: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>SKU</label><input value={(editProduct || form).sku || ''} onChange={e => editProduct ? setEditProduct({ ...editProduct, sku: e.target.value }) : setForm({ ...form, sku: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Barcode</label><input value={(editProduct || form).barcode || ''} onChange={e => editProduct ? setEditProduct({ ...editProduct, barcode: e.target.value }) : setForm({ ...form, barcode: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Category</label><input value={(editProduct || form).category || ''} onChange={e => editProduct ? setEditProduct({ ...editProduct, category: e.target.value }) : setForm({ ...form, category: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
              </div>
              <div className="grid grid-cols-4 gap-3">
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Price (EGP)</label><input type="number" step="0.01" value={(editProduct || form).price || 0} onChange={e => editProduct ? setEditProduct({ ...editProduct, price: parseFloat(e.target.value) || 0 }) : setForm({ ...form, price: parseFloat(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Cost (EGP)</label><input type="number" step="0.01" value={(editProduct || form).cost || 0} onChange={e => editProduct ? setEditProduct({ ...editProduct, cost: parseFloat(e.target.value) || 0 }) : setForm({ ...form, cost: parseFloat(e.target.value) || 0 })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Type</label><input value={(editProduct || form).mirror_type || ''} onChange={e => editProduct ? setEditProduct({ ...editProduct, mirror_type: e.target.value }) : setForm({ ...form, mirror_type: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
                <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Shape</label><input value={(editProduct || form).mirror_shape || ''} onChange={e => editProduct ? setEditProduct({ ...editProduct, mirror_shape: e.target.value }) : setForm({ ...form, mirror_shape: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary)' }} /></div>
              </div>
              <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Image URL</label><input value={(editProduct || form).image_url || ''} onChange={e => editProduct ? setEditProduct({ ...editProduct, image_url: e.target.value }) : setForm({ ...form, image_url: e.target.value })} className="input-field w-full" style={{ background: 'var(--bg-tertiary)' }} /></div>
              <div><label className="text-[10px] font-semibold uppercase mb-1 block" style={{ color: 'var(--text-muted)' }}>Description</label><textarea value={(editProduct || form).description || ''} onChange={e => editProduct ? setEditProduct({ ...editProduct, description: e.target.value }) : setForm({ ...form, description: e.target.value })} className="input-field w-full" rows="2" style={{ background: 'var(--bg-tertiary)' }} /></div>
              <div className="flex justify-end gap-2 pt-3">
                <button type="button" onClick={() => { setShowCreate(false); setEditProduct(null); }} className="btn btn-secondary btn-sm">Cancel</button>
                {editProduct && <button type="button" onClick={() => handleDelete(editProduct.id)} className="btn btn-sm text-[10px]" style={{ color: 'var(--danger)' }}>Delete</button>}
                <button type="submit" className="btn btn-primary btn-sm">{editProduct ? 'Save' : 'Create'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
