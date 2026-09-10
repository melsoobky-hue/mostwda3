import { useState } from 'react';

export default function Login({ onLogin }) {
  const [pin,     setPin]     = useState('');
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const attemptLogin = (code) => {
    setLoading(true);
    setError('');
    fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: code }),
    })
      .then(r => r.json())
      .then(data => {
        if (data.error) {
          setError(data.error);
          setPin('');
          setLoading(false);
          return;
        }
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        onLogin(data.user);
      })
      .catch(() => {
        setError('Connection failed');
        setPin('');
        setLoading(false);
      });
  };

  const handlePinInput = (digit) => {
    if (loading || pin.length >= 6) return;
    const next = pin + digit;
    setPin(next);
    setError('');
    if (next.length >= 4) attemptLogin(next);
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError('');
  };

  const KEYS = [1, 2, 3, 4, 5, 6, 7, 8, 9, null, 0, 'del'];

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* Subtle background texture rings */}
      <div
        aria-hidden="true"
        style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', overflow: 'hidden',
          zIndex: 0,
        }}
      >
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 700, height: 700, borderRadius: '50%',
          border: '1px solid var(--border)',
          opacity: 0.6,
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 460, height: 460, borderRadius: '50%',
          border: '1px solid var(--border)',
          opacity: 0.5,
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 240, height: 240, borderRadius: '50%',
          background: 'var(--accent-glow)',
          filter: 'blur(48px)',
          opacity: 0.6,
        }} />
      </div>

      {/* Card */}
      <div
        className="relative w-full max-w-[360px] anim-scale"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-2xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
          zIndex: 1,
        }}
      >
        {/* Top accent band */}
        <div style={{
          height: 4,
          background: 'linear-gradient(90deg, var(--accent), var(--accent-light), var(--accent))',
          backgroundSize: '200% 100%',
        }} />

        <div className="px-9 pt-9 pb-10">
          {/* Logo + headline */}
          <div className="text-center mb-8">
            <div
              className="w-14 h-14 mx-auto mb-5 rounded-2xl flex items-center justify-center overflow-hidden"
              style={{
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <img src="/logo.svg" alt="Logo" style={{ width: 38, height: 38, objectFit: 'contain' }} />
            </div>

            <h1
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 24,
                fontWeight: 400,
                color: 'var(--text-primary)',
                lineHeight: 1.2,
                marginBottom: 6,
              }}
            >
              Welcome back
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5 }}>
              Enter your PIN to access the dashboard
            </p>
          </div>

          {/* Ornament */}
          <div style={{
            width: 32, height: 2,
            background: 'linear-gradient(90deg, var(--accent), transparent)',
            borderRadius: 2,
            margin: '0 auto 28px',
          }} />

          {/* PIN dots */}
          <div className="flex justify-center gap-3 mb-8">
            {[0, 1, 2, 3].map(i => {
              const filled = i < pin.length;
              return (
                <div
                  key={i}
                  style={{
                    width: 44, height: 44,
                    borderRadius: 14,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: filled ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                    border: `1.5px solid ${filled ? 'var(--accent)' : 'var(--border-strong)'}`,
                    transition: 'all 0.2s cubic-bezier(0.16,1,0.3,1)',
                    transform: filled ? 'scale(1.05)' : 'scale(1)',
                  }}
                >
                  {filled && (
                    <div style={{
                      width: 9, height: 9, borderRadius: '50%',
                      background: 'var(--accent)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Keypad */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 10,
              maxWidth: 252,
              margin: '0 auto',
            }}
          >
            {KEYS.map((key, i) => {
              if (key === null) return <div key={i} />;

              if (key === 'del') return (
                <button
                  key={i}
                  onClick={handleDelete}
                  disabled={loading || pin.length === 0}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-muted)',
                    cursor: pin.length === 0 ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease',
                    opacity: pin.length === 0 ? 0.4 : 1,
                  }}
                  aria-label="Delete"
                >
                  <svg style={{ width: 18, height: 18 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                  </svg>
                </button>
              );

              return (
                <button
                  key={i}
                  onClick={() => handlePinInput(String(key))}
                  disabled={loading}
                  style={{
                    height: 52,
                    borderRadius: 14,
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    fontFamily: "'DM Serif Display', Georgia, serif",
                    fontSize: 20,
                    fontWeight: 400,
                    cursor: 'pointer',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.15s cubic-bezier(0.16,1,0.3,1)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--accent)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'var(--bg-card)';
                    e.currentTarget.style.borderColor = 'var(--border-strong)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                  }}
                  onMouseDown={e => {
                    e.currentTarget.style.transform = 'scale(0.95)';
                  }}
                  onMouseUp={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                >
                  {key}
                </button>
              );
            })}
          </div>

          {/* Error / loading */}
          <div className="mt-5 text-center" style={{ minHeight: 24 }}>
            {error && (
              <p
                className="anim-fade-up text-xs font-medium"
                style={{ color: 'var(--danger)' }}
              >
                {error}
              </p>
            )}
            {loading && !error && (
              <div className="flex items-center justify-center gap-2">
                <div
                  style={{
                    width: 16, height: 16, borderRadius: '50%',
                    border: '2px solid var(--border-strong)',
                    borderTopColor: 'var(--accent)',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Verifying…</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer strip */}
        <div
          style={{
            padding: '12px 36px',
            borderTop: '1px solid var(--border)',
            background: 'var(--bg-secondary)',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Mostawdaa · Mirrors Operations
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
