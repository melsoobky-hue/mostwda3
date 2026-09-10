import { useState } from 'react';

export default function Login({ onLogin }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (pin.length < 4) { setError('PIN must be at least 4 digits'); return; }
    setLoading(true);
    setError('');
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    }).then(r => r.json()).then(data => {
      if (data.error) { setError(data.error); setLoading(false); return; }
      localStorage.setItem('auth_user', JSON.stringify(data.user));
      onLogin(data.user);
    }).catch(() => { setError('Connection failed'); setLoading(false); });
  };

  const handlePinInput = (digit) => {
    if (pin.length >= 6) return;
    const newPin = pin + digit;
    setPin(newPin);
    setError('');
    if (newPin.length >= 4) {
      setLoading(true);
      fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      }).then(r => r.json()).then(data => {
        if (data.error) { setError(data.error); setPin(''); setLoading(false); return; }
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        onLogin(data.user);
      }).catch(() => { setError('Connection failed'); setPin(''); setLoading(false); });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-sm anim-scale" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-lg)' }}>
        {/* Header stripe */}
        <div className="h-1.5 w-full rounded-t-[var(--radius-xl)]" style={{ background: 'var(--gradient-1)' }}></div>

        <div className="p-8 text-center">
          {/* Logo */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: 'var(--accent-glow)' }}>
            <svg className="w-8 h-8" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h1 className="text-lg font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Mostwda3 Dashboard</h1>
          <p className="text-[11px] mb-6" style={{ color: 'var(--text-muted)' }}>Enter your PIN to continue</p>

          {/* PIN display */}
          <div className="flex justify-center gap-2 mb-6">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold transition-all"
                style={{
                  background: i < pin.length ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                  border: `2px solid ${i < pin.length ? 'var(--accent)' : 'var(--border)'}`,
                  color: 'var(--text-primary)',
                }}>
                {i < pin.length ? '•' : ''}
              </div>
            ))}
          </div>

          {/* Numeric keypad */}
          <div className="grid grid-cols-3 gap-2 mb-4 max-w-[240px] mx-auto">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'].map((digit, i) => {
              if (digit === null) return <div key={i}></div>;
              if (digit === 'del') return (
                <button key={i} onClick={() => { setPin(pin.slice(0, -1)); setError(''); }}
                  className="h-12 rounded-xl text-xs font-semibold transition-all hover:bg-[var(--bg-hover)]"
                  style={{ color: 'var(--text-muted)' }}>
                  <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                </button>
              );
              return (
                <button key={i} onClick={() => handlePinInput(String(digit))}
                  className="h-12 rounded-xl text-lg font-bold transition-all hover:bg-[var(--bg-hover)] active:scale-95"
                  style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                  {digit}
                </button>
              );
            })}
          </div>

          {error && <p className="text-[11px] font-medium mb-3" style={{ color: 'var(--danger)' }}>{error}</p>}
          {loading && <div className="w-5 h-5 border-2 rounded-full animate-spin mx-auto" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }}></div>}
        </div>
      </div>
    </div>
  );
}
