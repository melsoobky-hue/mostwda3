import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import { RefreshIndicator, ColumnToggle, CopyButton } from '../components/QuickActions';
import { usePersistedFilters } from '../hooks/usePersistedFilters';
import DateRangePicker from '../components/DateRangePicker';
import OrderTimeline from '../components/OrderTimeline';

export default function Orders() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const { filters, setFilters, resetFilters } = usePersistedFilters('orders', { source: '', status: '', search: '', mirror_type: '', minPrice: '', maxPrice: '', isDelayed: '' });
  const [dateRange, setDateRange] = useState(() => {
    try { return JSON.parse(localStorage.getItem('filters_orders_dates') || '{"from":"","to":""}'); } catch { return { from: '', to: '' }; }
  });
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('order_date');
  const [sortDir, setSortDir] = useState('desc');
  const [view, setView] = useState('table');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showTimeline, setShowTimeline] = useState(false);

  const allColumns = useMemo(() => [
    { key: 'source_order_id', label: 'Order' },
    { key: 'customer_name', label: 'Customer' },
    { key: 'channel', label: 'Channel' },
    { key: 'mirror_type', label: 'Mirror' },
    { key: 'total_price', label: 'Price' },
    { key: 'profit', label: 'Profit' },
    { key: 'status', label: 'Status' },
    { key: 'order_date', label: 'Date' },
  ], []);

  const [visibleCols, setVisibleCols] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('orders_cols') || 'null') || allColumns.map(c => c.key)); } catch { return new Set(allColumns.map(c => c.key)); }
  });

  const toggleCol = useCallback((key) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      localStorage.setItem('orders_cols', JSON.stringify([...next]));
      return next;
    });
  }, []);

  const fetchOrders = useCallback(() => {
    const params = new URLSearchParams({ page, limit: 20, sortBy, sortDir });
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    if (dateRange.from) params.set('dateFrom', dateRange.from);
    if (dateRange.to) params.set('dateTo', dateRange.to);
    setLoading(true);
    fetch(`/api/orders?${params}`).then(r => r.json()).then(data => {
      setOrders(data.orders || []);
      setTotal(data.total || 0);
      setLastUpdated(new Date().toLocaleTimeString());
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [page, sortBy, sortDir, filters, dateRange]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { localStorage.setItem('filters_orders_dates', JSON.stringify(dateRange)); }, [dateRange]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); };
  const handleSort = (field) => { setSortBy(field); setSortDir(sortDir === 'asc' ? 'desc' : 'asc'); };
  const handleExport = () => { const p = new URLSearchParams(); Object.entries(filters).forEach(([k, v]) => { if (v) p.set(k, v); }); window.open(`/api/export/orders?${p}`, '_blank'); };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === orders.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(orders.map(o => o.id)));
  };

  const bulkExport = () => {
    const p = new URLSearchParams({ ids: Array.from(selectedIds).join(',') });
    window.open(`/api/export/orders?${p}`, '_blank');
    toast.success(`Exporting ${selectedIds.size} orders`);
  };

  const getStatusBadge = (st) => {
    const m = { 'Delivered': 'badge-green', 'Shipped': 'badge-blue', 'Processing': 'badge-yellow', 'Pending': 'badge-yellow', 'On Hold': 'badge-red', 'Cancelled': 'badge-red', 'Rejected': 'badge-red', 'Failed': 'badge-red', 'Returned': 'badge-purple' };
    return m[st] || 'badge-gray';
  };
  const getChannelBadge = (ch) => {
    const m = { mostwda3: 'badge-blue', chichomz: 'badge-cyan', raneen: 'badge-yellow', saraydecore: 'badge-purple' };
    return m[ch] || 'badge-gray';
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between anim-fade-up">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{t('orders')}</h1>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{total} orders total {selectedIds.size > 0 && `· ${selectedIds.size} selected`}</p>
          </div>
          <RefreshIndicator lastUpdated={lastUpdated} onRefresh={fetchOrders} loading={loading} />
        </div>
        <div className="flex items-center gap-2">
          <ColumnToggle columns={allColumns} visible={visibleCols} onToggle={toggleCol} />
          {selectedIds.size > 0 && (
            <button onClick={bulkExport} className="btn btn-primary btn-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Export ({selectedIds.size})
            </button>
          )}
          <button onClick={() => setView(view === 'table' ? 'grid' : 'table')} className="btn btn-secondary btn-sm">
            {view === 'table' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>}
          </button>
          <button onClick={handleExport} className="btn btn-primary btn-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            {t('exportExcel')}
          </button>
        </div>
      </div>

      <div className="card anim-fade-up stagger-1">
        <form onSubmit={handleSearch} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
          <input data-search-input type="text" placeholder={t('searchOrders')} value={filters.search} onChange={e => setFilters({ ...filters, search: e.target.value })} className="input-field col-span-2" />
          <select value={filters.source} onChange={e => setFilters({ ...filters, source: e.target.value })} className="input-field">
            <option value="">All Channels</option>
            <option value="mostwda3">Mostwda3</option>
            <option value="chichomz">Chichomz</option>
            <option value="raneen">Raneen</option>
            <option value="saraydecore">Saray Decore</option>
          </select>
          <select value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })} className="input-field">
            <option value="">All Statuses</option>
            <option value="Processing">Processing</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="On Hold">On Hold</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Returned">Returned</option>
          </select>
          <select value={filters.mirror_type} onChange={e => setFilters({ ...filters, mirror_type: e.target.value })} className="input-field">
            <option value="">All Mirror Types</option>
            <option value="LED">LED</option>
            <option value="Touch LED">Touch LED</option>
            <option value="Saba">Saba</option>
          </select>
          <DateRangePicker from={dateRange.from} to={dateRange.to} onChange={setDateRange} />
          <button type="submit" className="btn btn-primary btn-sm col-span-2 lg:col-span-1">{t('filter')}</button>
        </form>
      </div>

      <div className="card anim-fade-up stagger-2" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="py-3 px-4 w-10">
                      <input type="checkbox" checked={selectedIds.size === orders.length && orders.length > 0} onChange={toggleSelectAll} className="rounded" style={{ accentColor: 'var(--accent)' }} />
                    </th>
                    {allColumns.filter(c => visibleCols.has(c.key)).map(col => (
                      <th key={col.key} onClick={() => handleSort(col.key)} className="text-left py-3 px-4 text-[10px] font-semibold uppercase tracking-wider cursor-pointer hover:opacity-80" style={{ color: 'var(--text-muted)' }}>
                        {col.label} {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <tr key={order.id} className={`table-row cursor-pointer ${selectedIds.has(order.id) ? 'bg-[var(--accent-glow)]' : ''}`} onClick={() => setSelectedOrder(order)}>
                      <td className="py-3 px-4" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(order.id)} onChange={() => toggleSelect(order.id)} className="rounded" style={{ accentColor: 'var(--accent)' }} />
                      </td>
                      {visibleCols.has('source_order_id') && <td className="py-3 px-4 flex items-center gap-1"><span className="text-xs font-mono font-semibold" style={{ color: 'var(--accent)' }}>#{order.source_order_id}</span><CopyButton text={String(order.source_order_id)} label="Order ID" /></td>}
                      {visibleCols.has('customer_name') && <td className="py-3 px-4 text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{order.customer_name || '-'}</td>}
                      {visibleCols.has('channel') && <td className="py-3 px-4"><span className={`badge ${getChannelBadge(order.channel)}`}>{order.channel || order.source}</span></td>}
                      {visibleCols.has('mirror_type') && <td className="py-3 px-4">{order.mirror_type ? <span className="badge badge-purple">{order.mirror_type}</span> : order.mirror_dimensions ? <span className="badge badge-gray">{order.mirror_dimensions}</span> : <span className="text-xs" style={{ color: 'var(--text-muted)' }}>-</span>}</td>}
                      {visibleCols.has('total_price') && <td className="py-3 px-4 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>EGP {order.total_price?.toLocaleString()}</td>}
                      {visibleCols.has('profit') && <td className="py-3 px-4 text-xs font-semibold" style={{ color: (order.profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>EGP {order.profit?.toLocaleString() || 0}</td>}
                      {visibleCols.has('status') && <td className="py-3 px-4"><span className={`badge ${getStatusBadge(order.status)}`}>{order.status}</span></td>}
                      {visibleCols.has('order_date') && <td className="py-3 px-4 text-[11px]" style={{ color: 'var(--text-muted)' }}>{order.order_date}</td>}
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={allColumns.filter(c => visibleCols.has(c.key)).length + 1} className="py-12 text-center text-xs" style={{ color: 'var(--text-muted)' }}>{t('noData')}</td></tr>}
                </tbody>
              </table>
            </div>
            {total > 20 && (
              <div className="flex items-center justify-between px-4 py-3 border-t" style={{ borderColor: 'var(--border)' }}>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Page {page} of {Math.ceil(total / 20)}</span>
                <div className="flex gap-1.5">
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn btn-secondary btn-sm disabled:opacity-30">{t('prev')}</button>
                  <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 20)} className="btn btn-secondary btn-sm disabled:opacity-30">{t('next')}</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,.6)', backdropFilter: 'blur(8px)' }} onClick={() => { setSelectedOrder(null); setShowTimeline(false); }}>
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto anim-scale" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)' }}>

            {/* ── Header with status stripe ── */}
            <div className="relative overflow-hidden rounded-t-[var(--radius-xl)]">
              <div className="h-1.5 w-full" style={{ background: (selectedOrder.profit || 0) >= 0 ? 'var(--gradient-3)' : 'linear-gradient(135deg, #ef4444, #dc2626)' }}></div>
              <div className="p-6 pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'var(--accent-glow)' }}>
                      <svg className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>#{selectedOrder.source_order_id}</h2>
                        <span className={`badge ${getStatusBadge(selectedOrder.status)}`}>{selectedOrder.status}</span>
                        <span className={`badge ${getChannelBadge(selectedOrder.channel)}`}>{selectedOrder.channel || selectedOrder.source}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{selectedOrder.order_date}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setShowTimeline(!showTimeline)} className={`btn btn-sm ${showTimeline ? 'btn-primary' : 'btn-secondary'}`}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      Timeline
                    </button>
                    <button onClick={() => { setSelectedOrder(null); setShowTimeline(false); }} className="btn btn-ghost btn-sm p-2">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                {/* ── Quick KPIs ── */}
                <div className="grid grid-cols-4 gap-3 mt-5">
                  {[
                    { label: 'Total', value: `EGP ${(selectedOrder.total_price || 0).toLocaleString()}`, gradient: 'var(--gradient-2)' },
                    { label: 'Profit', value: `EGP ${(selectedOrder.profit || 0).toLocaleString()}`, gradient: 'var(--gradient-3)', color: (selectedOrder.profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' },
                    { label: 'Margin', value: selectedOrder.profit_margin ? `${selectedOrder.profit_margin.toFixed(1)}%` : '-', gradient: 'var(--gradient-1)', color: (selectedOrder.profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' },
                    { label: 'COD', value: `EGP ${(selectedOrder.cod_amount || 0).toLocaleString()}`, gradient: 'var(--gradient-4)' },
                  ].map((kpi, i) => (
                    <div key={i} className="relative overflow-hidden rounded-xl p-3" style={{ background: 'var(--bg-secondary)' }}>
                      <div className="absolute top-0 left-0 right-0 h-[2px]" style={{ background: kpi.gradient }}></div>
                      <p className="text-[9px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
                      <p className="text-sm font-bold" style={{ color: kpi.color || 'var(--text-primary)' }}>{kpi.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Content ── */}
            <div className="px-6 pb-6">
              {showTimeline ? (
                <div className="py-4">
                  <OrderTimeline order={selectedOrder} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  {/* Customer Card */}
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.15)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Customer</h3>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Name', value: selectedOrder.customer_name, bold: true },
                        { label: 'Phone', value: selectedOrder.customer_phone, mono: true },
                        { label: 'Email', value: selectedOrder.customer_email, truncate: true },
                        { label: 'Governorate', value: selectedOrder.customer_governorate, icon: '📍' },
                        { label: 'Address', value: selectedOrder.customer_address, truncate: true },
                      ].filter(item => item.value).map((item, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <span className="text-[10px] font-medium w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                          <span className={`text-[12px] ${item.mono ? 'font-mono' : ''} ${item.bold ? 'font-semibold' : 'font-medium'} ${item.truncate ? 'truncate' : ''}`} style={{ color: 'var(--text-primary)' }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Product Card */}
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139,92,246,0.15)' }}>
                        <svg className="w-4 h-4" style={{ color: '#a78bfa' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Product</h3>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Name', value: selectedOrder.product_name, bold: true },
                        { label: 'SKU', value: selectedOrder.product_sku, mono: true },
                        { label: 'Type', value: selectedOrder.mirror_type, badge: selectedOrder.mirror_type ? 'badge-purple' : null },
                        { label: 'Dimensions', value: selectedOrder.mirror_dimensions || selectedOrder.mirror_size },
                        { label: 'Qty', value: selectedOrder.quantity || 1 },
                      ].filter(item => item.value).map((item, j) => (
                        <div key={j} className="flex items-start gap-3">
                          <span className="text-[10px] font-medium w-20 flex-shrink-0 pt-0.5" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                          {item.badge ? <span className={`badge ${item.badge}`}>{item.value}</span> :
                           <span className={`text-[12px] ${item.mono ? 'font-mono' : ''} ${item.bold ? 'font-semibold' : 'font-medium'}`} style={{ color: 'var(--text-primary)' }}>{item.value}</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Financial Card */}
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.15)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--success)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Financial</h3>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Price', value: `EGP ${(selectedOrder.total_price || 0).toLocaleString()}`, bold: true, color: 'var(--text-primary)' },
                        { label: 'Cost', value: `EGP ${(selectedOrder.cost || 0).toLocaleString()}`, color: 'var(--text-secondary)' },
                        { label: 'Profit', value: `EGP ${(selectedOrder.profit || 0).toLocaleString()}`, color: (selectedOrder.profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' },
                        { label: 'Margin', value: selectedOrder.profit_margin ? `${selectedOrder.profit_margin.toFixed(1)}%` : '-', color: (selectedOrder.profit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' },
                        { label: 'Shipping', value: `EGP ${(selectedOrder.shipping_cost || 0).toLocaleString()}` },
                        { label: 'Discount', value: `EGP ${(selectedOrder.discount_amount || 0).toLocaleString()}` },
                      ].map((item, j) => (
                        <div key={j} className="flex items-center justify-between">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                          <span className={`text-[12px] ${item.bold ? 'font-bold' : 'font-medium'}`} style={{ color: item.color || 'var(--text-primary)' }}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Details Card */}
                  <div className="rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.15)' }}>
                        <svg className="w-4 h-4" style={{ color: 'var(--warning)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>Details</h3>
                    </div>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Payment', value: selectedOrder.payment_method },
                        { label: 'Referral', value: selectedOrder.referral_source },
                        { label: 'Delayed', value: selectedOrder.is_delayed ? 'Yes' : 'No', color: selectedOrder.is_delayed ? 'var(--danger)' : 'var(--success)' },
                        { label: 'Attempts', value: selectedOrder.delivery_attempts || 0 },
                        { label: 'Return', value: selectedOrder.return_reason || '-', color: selectedOrder.return_reason ? 'var(--danger)' : 'var(--text-muted)' },
                      ].map((item, j) => (
                        <div key={j} className="flex items-center justify-between">
                          <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                          <span className="text-[12px] font-medium" style={{ color: item.color || 'var(--text-primary)' }}>{item.value || '-'}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
