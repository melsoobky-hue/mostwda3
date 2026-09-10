import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../components/Toast';

const fmt = (n) => (Number(n) || 0).toLocaleString('en-EG', { minimumFractionDigits: 2 });
const today = () => new Date().toISOString().slice(0, 10);
const thisMonth = () => new Date().toISOString().slice(0, 7);

export default function HR() {
  const { toast } = useToast();
  const [tab, setTab] = useState('employees');
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const [search, setSearch] = useState('');
  const [empForm, setEmpForm] = useState({ name: '', name_ar: '', national_id: '', email: '', phone: '', department: '', job_title: '', hire_date: today(), employment_type: 'full_time', basic_salary: 0, allowances: 0 });
  const [attForm, setAttForm] = useState({ employee_id: '', date: today(), check_in: '', check_out: '', status: 'present', notes: '' });
  const [payForm, setPayForm] = useState({ employee_id: '', period_month: thisMonth(), bonuses: 0, deductions: 0, tax_deduction: 0, social_insurance: 0, notes: '' });
  const [leaveForm, setLeaveForm] = useState({ employee_id: '', leave_type: 'annual', start_date: today(), end_date: today(), days: 1, reason: '' });

  const fetchAll = useCallback(() => {
    setLoading(true);
    const sp = search ? `?search=${encodeURIComponent(search)}` : '';
    Promise.all([
      fetch(`/api/hr/employees${sp}`).then(r => r.json()),
      fetch(`/api/hr/attendance?month=${thisMonth()}`).then(r => r.json()),
      fetch(`/api/hr/payroll?period_month=${thisMonth()}`).then(r => r.json()),
      fetch('/api/hr/leave').then(r => r.json()),
    ]).then(([emp, att, pay, leave]) => {
      setEmployees(emp.employees || []);
      setAttendance(att.attendance || []);
      setPayroll(pay.records || []);
      setLeaveRequests(leave.requests || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [search]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const saveEmployee = async () => {
    const url = editEmp ? `/api/hr/employees/${editEmp.id}` : '/api/hr/employees';
    const method = editEmp ? 'PUT' : 'POST';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(empForm) });
    if (res.ok) { toast.success(editEmp ? 'Updated' : 'Employee added'); setShowForm(false); setEditEmp(null); fetchAll(); }
    else toast.error('Failed');
  };

  const deleteEmployee = async (id) => {
    if (!confirm('Remove employee?')) return;
    await fetch(`/api/hr/employees/${id}`, { method: 'DELETE' });
    toast.success('Removed'); fetchAll();
  };

  const saveAttendance = async () => {
    const res = await fetch('/api/hr/attendance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(attForm) });
    if (res.ok) { toast.success('Attendance saved'); fetchAll(); }
    else toast.error('Failed');
  };

  const createPayroll = async () => {
    const emp = employees.find(e => String(e.id) === String(payForm.employee_id));
    if (!emp) { toast.error('Select an employee'); return; }
    const payload = { ...payForm, basic_salary: emp.basic_salary, allowances: emp.allowances, overtime_pay: 0 };
    const res = await fetch('/api/hr/payroll', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { toast.success('Payroll created'); fetchAll(); }
    else toast.error('Failed');
  };

  const approveLeave = async (id, status) => {
    await fetch(`/api/hr/leave/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
    toast.success(`Leave ${status}`); fetchAll();
  };

  const submitLeave = async () => {
    const res = await fetch('/api/hr/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(leaveForm) });
    if (res.ok) { toast.success('Leave request submitted'); fetchAll(); }
    else toast.error('Failed');
  };

  const TABS = [['employees', 'Employees'], ['attendance', 'Attendance'], ['payroll', 'Payroll'], ['leave', 'Leave']];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between anim-fade-up">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>HR & Payroll</h1>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Employees, attendance, payroll, and leave management</p>
        </div>
        {tab === 'employees' && (
          <button onClick={() => { setShowForm(true); setEditEmp(null); setEmpForm({ name: '', name_ar: '', national_id: '', email: '', phone: '', department: '', job_title: '', hire_date: today(), employment_type: 'full_time', basic_salary: 0, allowances: 0 }); }} className="btn btn-primary btn-sm">+ Employee</button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 anim-fade-up">
        {[
          { label: 'Total Employees', value: employees.length, color: 'var(--accent)' },
          { label: 'Active', value: employees.filter(e => e.is_active).length, color: 'var(--success)' },
          { label: 'On Leave', value: leaveRequests.filter(l => l.status === 'approved').length, color: 'var(--warning)' },
          { label: 'Monthly Payroll', value: `ج.م ${fmt(payroll.reduce((s, p) => s + (p.net_salary || 0), 0))}`, color: 'var(--text-primary)' },
        ].map((k, i) => (
          <div key={i} className="card" style={{ borderLeft: `3px solid ${k.color}` }}>
            <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{k.label}</p>
            <p className="text-xl font-bold mt-1" style={{ color: k.color }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-secondary)', width: 'fit-content' }}>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === key ? 'btn-primary' : ''}`}
            style={tab !== key ? { color: 'var(--text-muted)' } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* Employees Tab */}
      {tab === 'employees' && (
        <div className="card anim-fade-up">
          <div className="flex gap-2 mb-4">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees..." className="input-field text-xs" style={{ width: 240 }} />
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['#', 'Name', 'Department', 'Job Title', 'Type', 'Basic Salary', 'Actions'].map(h => (
                  <th key={h} className="text-left py-2 px-3 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} style={{ borderBottom: '1px solid var(--border)' }} className="hover-row">
                  <td className="py-2.5 px-3 font-mono text-[10px]" style={{ color: 'var(--accent)' }}>{e.employee_number}</td>
                  <td className="py-2.5 px-3 font-semibold">{e.name}</td>
                  <td className="py-2.5 px-3">{e.department || '—'}</td>
                  <td className="py-2.5 px-3">{e.job_title || '—'}</td>
                  <td className="py-2.5 px-3"><span className="badge badge-blue">{e.employment_type}</span></td>
                  <td className="py-2.5 px-3">ج.م {fmt(e.basic_salary)}</td>
                  <td className="py-2.5 px-3">
                    <div className="flex gap-1">
                      <button onClick={() => { setEditEmp(e); setEmpForm(e); setShowForm(true); }} className="btn btn-secondary btn-xs">Edit</button>
                      <button onClick={() => deleteEmployee(e.id)} className="btn btn-danger btn-xs">×</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!employees.length && <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--text-muted)' }}>No employees</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Attendance Tab */}
      {tab === 'attendance' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 anim-fade-up">
          <div className="card">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Record Attendance</h3>
            <div className="space-y-3">
              <div><label className="form-label">Employee</label>
                <select value={attForm.employee_id} onChange={e => setAttForm({ ...attForm, employee_id: e.target.value })} className="input-field text-xs">
                  <option value="">Select...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div><label className="form-label">Date</label><input type="date" value={attForm.date} onChange={e => setAttForm({ ...attForm, date: e.target.value })} className="input-field text-xs" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="form-label">Check In</label><input type="time" value={attForm.check_in} onChange={e => setAttForm({ ...attForm, check_in: e.target.value })} className="input-field text-xs" /></div>
                <div><label className="form-label">Check Out</label><input type="time" value={attForm.check_out} onChange={e => setAttForm({ ...attForm, check_out: e.target.value })} className="input-field text-xs" /></div>
              </div>
              <div><label className="form-label">Status</label>
                <select value={attForm.status} onChange={e => setAttForm({ ...attForm, status: e.target.value })} className="input-field text-xs">
                  {['present', 'absent', 'late', 'half_day', 'holiday'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <button onClick={saveAttendance} className="btn btn-primary btn-sm w-full">Save Attendance</button>
            </div>
          </div>
          <div className="card md:col-span-2">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>This Month's Attendance</h3>
            <div className="overflow-y-auto" style={{ maxHeight: 350 }}>
              <table className="w-full text-xs">
                <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Employee', 'Date', 'Check In', 'Check Out', 'Status'].map(h => <th key={h} className="text-left py-1.5 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {attendance.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-2 px-2">{a.employee_name}</td>
                      <td className="py-2 px-2">{a.date}</td>
                      <td className="py-2 px-2">{a.check_in || '—'}</td>
                      <td className="py-2 px-2">{a.check_out || '—'}</td>
                      <td className="py-2 px-2"><span className={`badge ${a.status === 'present' ? 'badge-green' : a.status === 'absent' ? 'badge-red' : 'badge-yellow'}`}>{a.status}</span></td>
                    </tr>
                  ))}
                  {!attendance.length && <tr><td colSpan={5} className="text-center py-6" style={{ color: 'var(--text-muted)' }}>No records</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Payroll Tab */}
      {tab === 'payroll' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 anim-fade-up">
          <div className="card">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Create Payslip</h3>
            <div className="space-y-3">
              <div><label className="form-label">Employee</label>
                <select value={payForm.employee_id} onChange={e => setPayForm({ ...payForm, employee_id: e.target.value })} className="input-field text-xs">
                  <option value="">Select...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name} — ج.م {fmt(e.basic_salary)}</option>)}
                </select>
              </div>
              <div><label className="form-label">Period</label><input type="month" value={payForm.period_month} onChange={e => setPayForm({ ...payForm, period_month: e.target.value })} className="input-field text-xs" /></div>
              {[['bonuses', 'Bonuses'], ['deductions', 'Deductions'], ['tax_deduction', 'Tax Deduction'], ['social_insurance', 'Social Insurance']].map(([k, label]) => (
                <div key={k}><label className="form-label">{label}</label><input type="number" value={payForm[k]} onChange={e => setPayForm({ ...payForm, [k]: parseFloat(e.target.value) || 0 })} className="input-field text-xs" /></div>
              ))}
              <button onClick={createPayroll} className="btn btn-primary btn-sm w-full">Generate Payslip</button>
            </div>
          </div>
          <div className="card md:col-span-2">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Payroll — {thisMonth()}</h3>
            <table className="w-full text-xs">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Employee', 'Basic', 'Allowances', 'Bonuses', 'Deductions', 'Net Salary', 'Status'].map(h => <th key={h} className="text-left py-1.5 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {payroll.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 px-2 font-semibold">{p.employee_name}</td>
                    <td className="py-2 px-2">ج.م {fmt(p.basic_salary)}</td>
                    <td className="py-2 px-2">ج.م {fmt(p.allowances)}</td>
                    <td className="py-2 px-2 text-green-500">+ج.م {fmt(p.bonuses)}</td>
                    <td className="py-2 px-2 text-red-400">-ج.م {fmt((p.deductions || 0) + (p.tax_deduction || 0) + (p.social_insurance || 0))}</td>
                    <td className="py-2 px-2 font-bold">ج.م {fmt(p.net_salary)}</td>
                    <td className="py-2 px-2"><span className={`badge ${p.status === 'paid' ? 'badge-green' : 'badge-yellow'}`}>{p.status}</span></td>
                  </tr>
                ))}
                {!payroll.length && <tr><td colSpan={7} className="text-center py-6" style={{ color: 'var(--text-muted)' }}>No payroll this month</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Leave Tab */}
      {tab === 'leave' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 anim-fade-up">
          <div className="card">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Submit Leave Request</h3>
            <div className="space-y-3">
              <div><label className="form-label">Employee</label>
                <select value={leaveForm.employee_id} onChange={e => setLeaveForm({ ...leaveForm, employee_id: e.target.value })} className="input-field text-xs">
                  <option value="">Select...</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div><label className="form-label">Leave Type</label>
                <select value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} className="input-field text-xs">
                  {['annual', 'sick', 'unpaid', 'emergency', 'maternity', 'paternity'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="form-label">Start</label><input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} className="input-field text-xs" /></div>
                <div><label className="form-label">End</label><input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} className="input-field text-xs" /></div>
              </div>
              <div><label className="form-label">Reason</label><textarea value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} rows={2} className="input-field text-xs" /></div>
              <button onClick={submitLeave} className="btn btn-primary btn-sm w-full">Submit</button>
            </div>
          </div>
          <div className="card md:col-span-2">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Leave Requests</h3>
            <table className="w-full text-xs">
              <thead><tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Employee', 'Type', 'From', 'To', 'Days', 'Status', 'Actions'].map(h => <th key={h} className="text-left py-1.5 px-2 font-semibold" style={{ color: 'var(--text-muted)' }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {leaveRequests.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2 px-2 font-semibold">{l.employee_name}</td>
                    <td className="py-2 px-2">{l.leave_type}</td>
                    <td className="py-2 px-2">{l.start_date}</td>
                    <td className="py-2 px-2">{l.end_date}</td>
                    <td className="py-2 px-2">{l.days}</td>
                    <td className="py-2 px-2"><span className={`badge ${l.status === 'approved' ? 'badge-green' : l.status === 'rejected' ? 'badge-red' : 'badge-yellow'}`}>{l.status}</span></td>
                    <td className="py-2 px-2">
                      {l.status === 'pending' && (
                        <div className="flex gap-1">
                          <button onClick={() => approveLeave(l.id, 'approved')} className="btn btn-primary btn-xs">✓</button>
                          <button onClick={() => approveLeave(l.id, 'rejected')} className="btn btn-danger btn-xs">✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {!leaveRequests.length && <tr><td colSpan={7} className="text-center py-6" style={{ color: 'var(--text-muted)' }}>No leave requests</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Employee Form Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-panel" style={{ maxWidth: 540 }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{editEmp ? 'Edit Employee' : 'Add Employee'}</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[['name', 'Full Name *'], ['name_ar', 'Arabic Name'], ['national_id', 'National ID'], ['email', 'Email'], ['phone', 'Phone'], ['department', 'Department'], ['job_title', 'Job Title']].map(([k, label]) => (
                <div key={k}>
                  <label className="form-label">{label}</label>
                  <input value={empForm[k] || ''} onChange={e => setEmpForm({ ...empForm, [k]: e.target.value })} className="input-field text-xs" />
                </div>
              ))}
              <div>
                <label className="form-label">Hire Date</label>
                <input type="date" value={empForm.hire_date || ''} onChange={e => setEmpForm({ ...empForm, hire_date: e.target.value })} className="input-field text-xs" />
              </div>
              <div>
                <label className="form-label">Employment Type</label>
                <select value={empForm.employment_type || 'full_time'} onChange={e => setEmpForm({ ...empForm, employment_type: e.target.value })} className="input-field text-xs">
                  {['full_time', 'part_time', 'contract', 'intern'].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Basic Salary</label>
                <input type="number" value={empForm.basic_salary || 0} onChange={e => setEmpForm({ ...empForm, basic_salary: parseFloat(e.target.value) || 0 })} className="input-field text-xs" />
              </div>
              <div>
                <label className="form-label">Allowances</label>
                <input type="number" value={empForm.allowances || 0} onChange={e => setEmpForm({ ...empForm, allowances: parseFloat(e.target.value) || 0 })} className="input-field text-xs" />
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowForm(false)} className="btn btn-secondary btn-sm">Cancel</button>
              <button onClick={saveEmployee} className="btn btn-primary btn-sm">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
