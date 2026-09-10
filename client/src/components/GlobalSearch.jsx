import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CopyButton } from './QuickActions';

export default function GlobalSearch({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ orders: [], products: [], customers: [] });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const inputRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
  }, [open]);

  useEffect(() => {
    if (!query || query.length < 2) { setResults({ orders: [], products: [], customers: [] }); return; }
    const timer = setTimeout(() => {
      setLoading(true);
      Promise.all([
        fetch(`/api/orders?search=${encodeURIComponent(query)}&limit=5`).then(r => r.json()),
        fetch(`/api/products?search=${encodeURIComponent(query)}&limit=5`).then(r => r.json()),
        fetch(`/api/customers?search=${encodeURIComponent(query)}&limit=5`).then(r => r.json()),
      ]).then(([orders, products, customers]) => {
        setResults({
          orders: orders.orders || [],
          products: products.products || [],
          customers: customers.customers || [],
        });
        setLoading(false);
      }).catch(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  if (!open) return null;

  const tabs = [
    { key: 'all', label: 'All' },
    { key: 'orders', label: 'Orders', count: results.orders.length },
    { key: 'products', label: 'Products', count: results.products.length },
    { key: 'customers', label: 'Customers', count: results.customers.length },
  ];

  const filtered = activeTab === 'all' ? results : { [activeTab]: results[activeTab] || [] };
  const totalResults = results.orders.length + results.products.length + results.customers.length;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center pt-[10vh] px-4" style={{ background: 'rgba(0,0,0,.5)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-2xl anim-scale" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)' }}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-6 py-5 border-b rounded-t-[var(--radius-xl)]" style={{ borderColor: 'var(--border)', background: 'var(--bg-input)' }}>
          <svg className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search orders, products, customers..."
            className="flex-1 bg-transparent border-none outline-none text-sm font-medium placeholder:opacity-70"
            style={{ color: 'var(--text-primary)' }}
          />
          <div className="flex items-center gap-2">
            {loading && <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>}
            <kbd className="px-2 py-0.5 rounded-lg text-[9px] font-mono" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)', boxShadow: '0 1px 2px rgba(60,40,10,0.05)' }}>ESC</kbd>
          </div>
        </div>

        {/* Tabs */}
        {query.length >= 2 && (
          <div className="flex gap-1.5 px-6 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 rounded-lg text-[11px] font-semibold transition-all duration-200 ${activeTab === tab.key ? 'text-white' : 'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}`}
                style={activeTab === tab.key ? { background: 'var(--gradient-1)', boxShadow: '0 3px 12px var(--accent-glow)' } : { color: 'var(--text-muted)' }}>
                {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">({tab.count})</span>}
              </button>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto p-4">
          {query.length < 2 ? (
            <div className="text-center py-10">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Type at least 2 characters to search</p>
            </div>
          ) : totalResults === 0 && !loading ? (
            <div className="text-center py-10">
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No results found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Orders */}
              {filtered.orders && filtered.orders.length > 0 && (activeTab === 'all' || activeTab === 'orders') && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider px-3 mb-2" style={{ color: 'var(--accent)' }}>Orders</p>
                  {filtered.orders.map(order => (
                    <div key={order.id} className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-[var(--bg-hover)] transition-all duration-200"
                      onClick={() => { navigate('/orders'); onClose(); }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-glow)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>#{order.source_order_id}</span>
                          <span className="text-[11px] truncate" style={{ color: 'var(--text-primary)' }}>{order.customer_name}</span>
                        </div>
                        <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>{order.product_name}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>EGP {(order.total_price || 0).toLocaleString()}</span>
                        <CopyButton text={order.source_order_id} label="Order ID" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Products */}
              {filtered.products && filtered.products.length > 0 && (activeTab === 'all' || activeTab === 'products') && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider px-3 mb-2" style={{ color: '#a78bfa' }}>Products</p>
                  {filtered.products.map(product => (
                    <div key={product.id} className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-[var(--bg-hover)] transition-all duration-200"
                      onClick={() => { navigate('/products'); onClose(); }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(139,92,246,0.15)' }}>
                        <svg className="w-4 h-4" style={{ color: '#a78bfa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate" style={{ color: 'var(--text-primary)' }}>{product.name}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{product.sku}</p>
                      </div>
                      <span className="text-[11px] font-bold flex-shrink-0" style={{ color: 'var(--success)' }}>EGP {(product.price || 0).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Customers */}
              {filtered.customers && filtered.customers.length > 0 && (activeTab === 'all' || activeTab === 'customers') && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider px-3 mb-2" style={{ color: 'var(--info)' }}>Customers</p>
                  {filtered.customers.map((customer, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer hover:bg-[var(--bg-hover)] transition-all duration-200"
                      onClick={() => { navigate('/customers'); onClose(); }}>
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white shadow-md" style={{ background: 'var(--gradient-2)' }}>
                        {(customer.name || customer.phone || '?')[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{customer.name || '-'}</p>
                        <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{customer.phone}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{customer.total_orders} orders</span>
                        <CopyButton text={customer.phone} label="Phone" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}