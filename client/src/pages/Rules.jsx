import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../components/Toast';

const RULE_TYPES = [
  { value: 'delayed_alert', label: 'Delayed Order Alert', icon: '⏰', desc: 'Alert when order is pending > X hours' },
  { value: 'low_stock', label: 'Low Stock Alert', icon: '📦', desc: 'Alert when product stock is low' },
  { value: 'loss_order', label: 'Loss Order Alert', icon: '📉', desc: 'Alert when order has negative profit' },
  { value: 'high_value', label: 'High Value Order', icon: '💰', desc: 'Alert for orders above EGP threshold' },
  { value: 'governorate_block', label: 'Block Governorate', icon: '🚫', desc: 'Auto-reject orders from specific areas' },
];

export default function Rules() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'delayed_alert', condition: {}, action: { notify: true } });

  const fetchRules = () => {
    setLoading(true);
    fetch('/api/rules').then(r => r.json()).then(d => {
      setRules(d.rules || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchRules(); }, []);

  const handleAdd = (e) => {
    e.preventDefault();
    fetch('/api/rules', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      .then(r => r.json()).then(() => {
        toast.success('Rule created');
        setShowAddModal(false);
        setForm({ name: '', type: 'delayed_alert', condition: {}, action: { notify: true } });
        fetchRules();
      });
  };

  const toggleRule = (rule) => {
    fetch(`/api/rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !rule.is_active }),
    }).then(() => fetchRules());
  };

  const deleteRule = (rule) => {
    if (!confirm('Delete this rule?')) return;
    fetch(`/api/rules/${rule.id}`, { method: 'DELETE' }).then(() => {
      toast.success('Rule deleted');
      fetchRules();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Automation Rules</h1>
          <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>{rules.length} rules configured</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Rule
        </button>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {rules.map(rule => (
          <div key={rule.id} className="card anim-fade-up" style={{ opacity: rule.is_active ? 1 : 0.55, boxShadow: '0 2px 12px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s ease, transform 0.2s ease' }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.07)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
            <div className="flex items-start justify-between mb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{RULE_TYPES.find(r => r.value === rule.type)?.icon || '📋'}</span>
                <div>
                  <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{rule.name}</h3>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{RULE_TYPES.find(r => r.value === rule.type)?.label}</p>
                </div>
              </div>
              <button onClick={() => toggleRule(rule)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none"
                style={{ background: rule.is_active ? 'var(--success)' : 'var(--bg-hover)', border: `1px solid ${rule.is_active ? 'var(--success)' : 'var(--border)'}` }}>
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out ${rule.is_active ? 'translate-x-[22px]' : 'translate-x-[3px]'}`}></span>
              </button>
            </div>
            <p className="text-[11px] mb-3.5 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{RULE_TYPES.find(r => r.value === rule.type)?.desc}</p>
            <div className="flex items-center justify-between pt-3.5 border-t" style={{ borderColor: 'var(--border)' }}>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Triggered {rule.trigger_count || 0} times</span>
              <button onClick={() => deleteRule(rule)} className="btn btn-ghost btn-sm p-1" style={{ color: 'var(--danger)' }}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            </div>
          </div>
        ))}
        {rules.length === 0 && !loading && (
          <div className="col-span-full text-center py-14">
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>No rules configured yet. Add one to automate your workflow.</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,25,20,0.55)', backdropFilter: 'blur(16px)' }} onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-lg card anim-scale" style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.12)' }} onClick={e => e.stopPropagation()}>
            <h2 className="text-lg font-bold mb-5" style={{ color: 'var(--text-primary)' }}>Create Rule</h2>
            <form onSubmit={handleAdd} className="space-y-5">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Rule Name</label>
                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" style={{ background: 'var(--bg-tertiary, var(--bg-secondary))' }} placeholder="e.g., Alert on pending orders > 24h" />
              </div>
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-wider mb-2.5 block" style={{ color: 'var(--text-muted)' }}>Rule Type</label>
                <div className="grid grid-cols-1 gap-2.5">
                  {RULE_TYPES.map(type => (
                    <label key={type.value} className={`flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all ${form.type === type.value ? 'ring-2' : 'hover:bg-[var(--bg-hover)]'}`}
                      style={form.type === type.value ? { background: 'var(--accent-glow)', ringColor: 'var(--accent)' } : { border: '1px solid var(--border)' }}>
                      <input type="radio" name="type" value={type.value} checked={form.type === type.value} onChange={e => setForm({ ...form, type: e.target.value })} className="hidden" />
                      <span className="text-lg">{type.icon}</span>
                      <div>
                        <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>{type.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{type.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-3">
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary btn-sm">Cancel</button>
                <button type="submit" className="btn btn-primary btn-sm">Create Rule</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
