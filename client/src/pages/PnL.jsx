import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';

const COLORS = ['#22d3a0', '#6366f1', '#f59e0b', '#f87171', '#38bdf8', '#a78bfa', '#14b8a6'];

export default function PnL() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().split('T')[0]);
  const [period, setPeriod] = useState('month');

  const fetchReport = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    fetch(`/api/pnl?${params}`).then(r => r.json()).then(d => {
      setData(d);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, []);

  const setQuickPeriod = (p) => {
    const now = new Date();
    let from;
    if (p === 'today') { from = new Date(now); }
    else if (p === 'week') { from = new Date(now); from.setDate(now.getDate() - 7); }
    else if (p === 'month') { from = new Date(now); from.setMonth(now.getMonth() - 1); }
    else if (p === 'quarter') { from = new Date(now); from.setMonth(now.getMonth() - 3); }
    else if (p === 'year') { from = new Date(now); from.setFullYear(now.getFullYear() - 1); }
    setDateFrom(from.toISOString().split('T')[0]);
    setDateTo(now.toISOString().split('T')[0]);
    setPeriod(p);
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>
      </div>
    );
  }

  const { summary, expensesByCategory, monthly } = data;

  return (
    <div className="space-y-7">
      {/* Header */}
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Profit & Loss</h1>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Financial overview and expenses breakdown</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--bg-secondary)' }}>
            {['today', 'week', 'month', 'quarter', 'year'].map(p => (
              <button key={p} onClick={() => setQuickPeriod(p)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-semibold transition-all duration-200 ${period === p ? 'text-white shadow-sm' : 'hover:bg-[var(--bg-hover)]'}`}
                style={period === p
                  ? { background: 'var(--gradient-1)', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }
                  : { color: 'var(--text-muted)' }}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="input-field text-[11px]" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="input-field text-[11px]" />
          <button onClick={fetchReport} className="btn btn-primary btn-sm">Refresh</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 anim-fade-up stagger-1">
        {[
          { label: 'Revenue', value: `EGP ${(summary.revenue || 0).toLocaleString()}`, gradient: 'var(--gradient-2)', color: 'var(--text-primary)' },
          { label: 'COGS', value: `EGP ${(summary.cogs || 0).toLocaleString()}`, gradient: 'var(--gradient-4)', color: 'var(--text-secondary)' },
          { label: 'Gross Profit', value: `EGP ${(summary.grossProfit || 0).toLocaleString()}`, gradient: 'var(--gradient-3)', color: (summary.grossProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' },
          { label: 'Net Profit', value: `EGP ${(summary.netProfit || 0).toLocaleString()}`, gradient: 'var(--gradient-1)', color: (summary.netProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)' },
        ].map((kpi, i) => (
          <div key={i} className="relative overflow-hidden rounded-xl p-5 transition-all duration-200 hover:shadow-md" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }}>
            <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: kpi.gradient }}></div>
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
            <p className="text-lg font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 anim-fade-up stagger-2">
        {[
          { label: 'Expenses', value: `EGP ${(summary.totalExpenses || 0).toLocaleString()}`, color: 'var(--danger)' },
          { label: 'Net Margin', value: `${summary.netMargin || 0}%`, color: (summary.netMargin || 0) >= 0 ? 'var(--success)' : 'var(--danger)' },
          { label: 'Shipping', value: `EGP ${(summary.shippingCost || 0).toLocaleString()}`, color: 'var(--text-secondary)' },
          { label: 'Discounts', value: `EGP ${(summary.discounts || 0).toLocaleString()}`, color: 'var(--warning)' },
          { label: 'Orders', value: summary.totalOrders || 0, color: 'var(--text-primary)' },
          { label: 'Delivered', value: summary.delivered || 0, color: 'var(--success)' },
        ].map((kpi, i) => (
          <div key={i} className="rounded-xl p-3.5 text-center transition-all duration-200 hover:shadow-sm cursor-default" style={{ background: 'color-mix(in srgb, var(--bg-secondary) 80%, var(--bg-card-solid) 20%)', border: '1px solid var(--border)' }}>
            <p className="text-[9px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{kpi.label}</p>
            <p className="text-sm font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        {monthly.length > 0 && (
          <div className="card anim-fade-up stagger-3">
            <div className="section-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <span className="section-title">Monthly Trend</span>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Revenue, Profit & COGS</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthly}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
                <Legend />
                <Bar dataKey="revenue" name="Revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#22d3a0" radius={[4, 4, 0, 0]} />
                <Bar dataKey="cogs" name="COGS" fill="#f87171" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Expenses by Category */}
        {expensesByCategory.length > 0 && (
          <div className="card anim-fade-up stagger-4">
            <div className="section-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <span className="section-title">Expenses by Category</span>
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{expensesByCategory.length} categories</span>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={expensesByCategory} dataKey="total" nameKey="category" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={3} label={({ category, total }) => `${category}: EGP ${total.toLocaleString()}`}>
                  {expensesByCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 mt-3">
              {expensesByCategory.map((cat, i) => (
                <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg transition-colors duration-150" style={{ background: 'color-mix(in srgb, var(--bg-secondary) 70%, transparent 30%)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--bg-secondary) 100%, transparent 0%)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--bg-secondary) 70%, transparent 30%)'}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></div>
                    <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{cat.category}</span>
                  </div>
                  <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>EGP {cat.total.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* P&L Breakdown Table */}
      <div className="card anim-fade-up stagger-5">
        <div className="section-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
          <span className="section-title">P&L Breakdown</span>
        </div>
        <div className="space-y-0 overflow-hidden rounded-xl" style={{ border: '1px solid color-mix(in srgb, var(--border) 60%, transparent 40%)' }}>
          {[
            { label: 'Revenue (Sales)', value: summary.revenue, color: 'var(--text-primary)', bold: true },
            { label: 'Cost of Goods Sold (COGS)', value: -summary.cogs, color: 'var(--danger)' },
            { label: 'Gross Profit', value: summary.grossProfit, color: (summary.grossProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)', bold: true, border: true },
            ...expensesByCategory.map(e => ({ label: `  ${e.category}`, value: -e.total, color: 'var(--text-secondary)' })),
            { label: 'Total Expenses', value: -summary.totalExpenses, color: 'var(--danger)', bold: true },
            { label: 'NET PROFIT', value: summary.netProfit, color: (summary.netProfit || 0) >= 0 ? 'var(--success)' : 'var(--danger)', bold: true, border: true },
          ].map((item, i) => (
            <div key={i}
              className={`flex items-center justify-between px-4 py-3 transition-colors duration-150 ${item.border ? 'border-t' : ''}`}
              style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'color-mix(in srgb, var(--bg-secondary) 40%, transparent 60%)' : 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.background = 'color-mix(in srgb, var(--bg-secondary) 80%, transparent 20%)'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'color-mix(in srgb, var(--bg-secondary) 40%, transparent 60%)' : 'transparent'}>
              <span className={`text-[12px] ${item.bold ? 'font-bold' : 'font-medium'}`} style={{ color: 'var(--text-primary)' }}>{item.label}</span>
              <span className={`text-[12px] ${item.bold ? 'font-bold' : 'font-semibold'}`} style={{ color: item.color }}>
                EGP {Math.abs(item.value || 0).toLocaleString()} {item.value < 0 ? '' : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
