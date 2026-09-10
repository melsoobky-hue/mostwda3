import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';

export default function Products() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [view, setView] = useState('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [selectedSkus, setSelectedSkus] = useState(new Set());
  const [showBulkUpdate, setShowBulkUpdate] = useState(false);
  const [bulkPrice, setBulkPrice] = useState('');
  const [bulkCost, setBulkCost] = useState('');

  useEffect(() => {
    const params = new URLSearchParams({ sortBy: 'name', sortDir: 'asc' });
    if (filterType) params.set('mirror_type', filterType);
    if (filterSource) params.set('source', filterSource);
    fetch(`/api/products?${params}`).then(r => r.json()).then(data => { setProducts(data.products || data); setLoading(false); });
  }, [filterType, filterSource]);

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleSelect = (sku) => {
    setSelectedSkus(prev => {
      const next = new Set(prev);
      if (next.has(sku)) next.delete(sku); else next.add(sku);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedSkus.size === filtered.length) setSelectedSkus(new Set());
    else setSelectedSkus(new Set(filtered.map(p => p.sku)));
  };

  const handleBulkUpdate = async () => {
    if (!bulkPrice && !bulkCost) { toast.warning('Enter price or cost to update'); return; }
    try {
      const res = await fetch('/api/bulk/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ skus: Array.from(selectedSkus), price: bulkPrice, cost: bulkCost }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Updated ${data.updated} products`);
        setSelectedSkus(new Set());
        setShowBulkUpdate(false);
        setBulkPrice('');
        setBulkCost('');
        // Refresh
        const params = new URLSearchParams({ sortBy: 'name', sortDir: 'asc' });
        if (filterType) params.set('mirror_type', filterType);
        if (filterSource) params.set('source', filterSource);
        fetch(`/api/products?${params}`).then(r => r.json()).then(d => setProducts(d.products || d));
      }
    } catch (err) { toast.error('Bulk update failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('products')}</h1>
          <p className="text-sm mt-1 font-medium" style={{ color: 'var(--text-muted)' }}>{filtered.length} products {selectedSkus.size > 0 && `· ${selectedSkus.size} selected`}</p>
        </div>
        <div className="flex gap-2">
          {selectedSkus.size > 0 && (
            <button onClick={() => setShowBulkUpdate(true)} className="btn btn-primary btn-sm">
              Update Price ({selectedSkus.size})
            </button>
          )}
          <button onClick={() => setView('grid')} className={`btn btn-sm ${view === 'grid' ? 'btn-primary' : 'btn-secondary'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
          </button>
          <button onClick={() => setView('list')} className={`btn btn-sm ${view === 'list' ? 'btn-primary' : 'btn-secondary'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </button>
        </div>
      </div>

      <div className="card anim-fade-up stagger-1">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input type="text" placeholder={t('searchProducts')} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="input-field" />
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="input-field">
            <option value="">All Mirror Types</option>
            <option value="LED">LED</option>
            <option value="Touch LED">Touch LED</option>
            <option value="Saba">Saba</option>
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="input-field">
            <option value="">All Sources</option>
            <option value="mostwda3">Mostwda3</option>
            <option value="saraydecore">Saray Decore</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((product, i) => (
            <div key={product.id || i} className="card cursor-pointer group anim-fade-up" style={{ animationDelay: `${Math.min(i * 0.05, 0.4)}s`, padding: 0, overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,.06)', transition: 'transform .2s ease, box-shadow .25s ease' }} onClick={() => setSelectedProduct(product)}>
              <div className="relative h-36 overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(245,222,179,.25), rgba(210,180,140,.18), rgba(196,181,148,.12))' }}>
                {product.image_url ? (
                  <img src={product.image_url} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-4xl">🪞</div>
                )}
                <div className="absolute top-2.5 left-2.5" onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedSkus.has(product.sku)} onChange={() => toggleSelect(product.sku)} className="rounded" style={{ accentColor: 'var(--accent)' }} />
                </div>
                <div className="absolute top-2.5 right-2.5">
                  <span className={`badge ${product.stock_status === 'In stock' ? 'badge-green' : 'badge-red'}`} style={{ fontSize: '10px', padding: '3px 8px' }}>
                    {product.stock_status === 'In stock' ? 'In Stock' : 'Out'}
                  </span>
                </div>
              </div>
              <div className="p-4.5" style={{ padding: '1.125rem' }}>
                <h3 className="text-xs font-semibold line-clamp-2 mb-1.5 leading-snug" style={{ color: 'var(--text-primary)' }}>{product.name}</h3>
                <p className="text-[10px] font-mono mb-2.5" style={{ color: 'var(--text-muted)' }}>{product.sku}</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {product.mirror_type && <span className="badge badge-purple" style={{ fontSize: '9px', padding: '2px 6px' }}>{product.mirror_type}</span>}
                  {product.dimensions && <span className="badge badge-gray" style={{ fontSize: '9px', padding: '2px 6px' }}>{product.dimensions}</span>}
                </div>
                <div className="flex items-center justify-between pt-2.5" style={{ borderTop: '1px solid var(--border)' }}>
                  <span className="text-sm font-bold" style={{ color: 'var(--success)' }}>EGP {product.price?.toLocaleString()}</span>
                  <span className="text-[10px] font-medium" style={{ color: product.stock_status === 'In stock' ? 'var(--success)' : 'var(--danger)' }}>{product.stock_quantity} units</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card anim-fade-up stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="w-full">
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, rgba(245,222,179,.15), rgba(210,180,140,.08))' }}>
                <th className="py-3.5 px-4 w-10">
                  <input type="checkbox" checked={selectedSkus.size === filtered.length && filtered.length > 0} onChange={toggleSelectAll} className="rounded" style={{ accentColor: 'var(--accent)' }} />
                </th>
                {['Name', 'SKU', 'Type', 'Dimensions', 'Price', 'Stock', 'Source'].map(h => (
                  <th key={h} className="text-left py-3.5 px-4 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id || i} className="table-row cursor-pointer" style={{ transition: 'background .15s ease' }} onClick={() => setSelectedProduct(p)}>
                  <td className="py-3.5 px-4" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedSkus.has(p.sku)} onChange={() => toggleSelect(p.sku)} className="rounded" style={{ accentColor: 'var(--accent)' }} />
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{p.name}</td>
                  <td className="py-3.5 px-4 text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{p.sku}</td>
                  <td className="py-3.5 px-4">{p.mirror_type ? <span className="badge badge-purple">{p.mirror_type}</span> : '-'}</td>
                  <td className="py-3.5 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{p.dimensions || '-'}</td>
                  <td className="py-3.5 px-4 text-xs font-bold" style={{ color: 'var(--success)' }}>EGP {p.price?.toLocaleString()}</td>
                  <td className="py-3.5 px-4 text-xs" style={{ color: 'var(--text-secondary)' }}>{p.stock_quantity}</td>
                  <td className="py-3.5 px-4"><span className={`badge ${p.source === 'mostwda3' ? 'badge-blue' : 'badge-purple'}`}>{p.source}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }} onClick={() => setSelectedProduct(null)}>
          <div className="card w-full max-w-lg anim-scale" style={{ overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.12)' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, rgba(245,222,179,.3), rgba(210,180,140,.18), rgba(196,181,148,.12))', padding: '1.25rem 1.5rem' }} className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{selectedProduct.name}</h2>
              <button onClick={() => setSelectedProduct(null)} className="btn btn-ghost btn-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {selectedProduct.image_url && <img src={selectedProduct.image_url} alt={selectedProduct.name} className="w-full h-48 object-cover" style={{ borderBottom: '1px solid var(--border)' }} />}
            <div className="grid grid-cols-2 gap-4" style={{ padding: '1.5rem' }}>
              {[
                { label: 'SKU', value: selectedProduct.sku, mono: true },
                { label: 'Price', value: `EGP ${selectedProduct.price?.toLocaleString()}`, color: 'var(--success)', bold: true },
                { label: 'Type', value: selectedProduct.mirror_type || '-' },
                { label: 'Shape', value: selectedProduct.mirror_shape || '-' },
                { label: 'Dimensions', value: selectedProduct.dimensions || '-' },
                { label: 'Stock', value: `${selectedProduct.stock_quantity} (${selectedProduct.stock_status})`, color: selectedProduct.stock_status === 'In stock' ? 'var(--success)' : 'var(--danger)' },
                { label: 'Category', value: selectedProduct.category || '-' },
                { label: 'Source', value: selectedProduct.source, badge: selectedProduct.source === 'mostwda3' ? 'badge-blue' : 'badge-purple' },
              ].map((item, i) => (
                <div key={i} style={{ padding: '0.5rem 0' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  {item.badge ? <span className={`badge ${item.badge}`}>{item.value}</span> :
                   <p className={`text-xs font-medium ${item.mono ? 'font-mono' : ''}`} style={{ color: item.color || 'var(--text-primary)', fontWeight: item.bold ? 700 : 500 }}>{item.value}</p>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkUpdate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }} onClick={() => setShowBulkUpdate(false)}>
          <div className="card w-full max-w-md anim-scale" style={{ overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,.12)' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: 'linear-gradient(135deg, rgba(245,222,179,.3), rgba(210,180,140,.18), rgba(196,181,148,.12))', padding: '1.25rem 1.5rem' }} className="flex items-center justify-between">
              <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Bulk Update Price</h2>
              <button onClick={() => setShowBulkUpdate(false)} className="btn btn-ghost btn-sm">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div style={{ padding: '1.5rem' }}>
              <p className="text-xs mb-5" style={{ color: 'var(--text-muted)' }}>Updating {selectedSkus.size} products</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>New Price (EGP)</label>
                  <input type="number" value={bulkPrice} onChange={e => setBulkPrice(e.target.value)} placeholder="Leave empty to keep current" className="input-field" />
                </div>
                <div>
                  <label className="text-xs font-semibold block mb-1.5" style={{ color: 'var(--text-secondary)' }}>New Cost (EGP)</label>
                  <input type="number" value={bulkCost} onChange={e => setBulkCost(e.target.value)} placeholder="Leave empty to keep current" className="input-field" />
                </div>
                <div className="flex gap-2 pt-3">
                  <button onClick={() => setShowBulkUpdate(false)} className="btn btn-secondary btn-sm flex-1">Cancel</button>
                  <button onClick={handleBulkUpdate} className="btn btn-primary btn-sm flex-1">Update {selectedSkus.size} Products</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
