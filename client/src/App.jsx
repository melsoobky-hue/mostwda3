import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { ToastProvider } from './components/Toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import ShortcutsHelp from './components/ShortcutsHelp';
import GlobalSearch from './components/GlobalSearch';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Orders from './pages/Orders';
import Products from './pages/Products';
import Analytics from './pages/Analytics';
import SyncPage from './pages/SyncPage';
import Settings from './pages/Settings';
import Customers from './pages/Customers';
import PnL from './pages/PnL';
import Inventory from './pages/Inventory';
import Shipping from './pages/Shipping';
import Rules from './pages/Rules';

const ThemeContext = createContext();
export function useTheme() { return useContext(ThemeContext); }

const THEMES = [
  { id: 'indigo', name: 'Indigo', color: '#6366f1' },
  { id: 'teal', name: 'Teal', color: '#14b8a6' },
  { id: 'emerald', name: 'Emerald', color: '#10b981' },
  { id: 'rose', name: 'Rose', color: '#f43f5e' },
  { id: 'amber', name: 'Amber', color: '#f59e0b' },
  { id: 'cyan', name: 'Cyan', color: '#06b6d4' },
];

const NAV_LINKS = [
  { to: '/', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', labelKey: 'dashboard' },
  { to: '/orders', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', labelKey: 'orders' },
  { to: '/products', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', labelKey: 'products' },
  { to: '/customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', labelKey: 'customers' },
  { to: '/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', labelKey: 'analytics' },
  { to: '/pnl', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', labelKey: 'pnl' },
  { to: '/inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', labelKey: 'inventory' },
  { to: '/shipping', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', labelKey: 'shipping' },
  { to: '/rules', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 0h6', labelKey: 'rules' },
  { to: '/sync', icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', labelKey: 'sync' },
  { to: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426-1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', labelKey: 'settings' },
];

function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const isRtl = i18n.language === 'ar';

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 px-5 h-16 border-b flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <div className="flex-shrink-0" style={{ width: 36, height: 36, borderRadius: 10, overflow: 'hidden' }}>
          <img src="/logo.svg" alt="Mostawdaa" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {!collapsed && (
          <div className="anim-fade-up">
            <h1 className="text-base font-bold gradient-text">Mostawdaa</h1>
            <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>Mirrors Dashboard</p>
          </div>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map(link => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 ${isActive ? 'text-white' : 'hover:bg-[var(--bg-hover)]'}`
            }
            end={link.to === '/'}
            style={({ isActive }) => isActive ? { background: 'var(--gradient-1)', boxShadow: '0 4px 14px rgba(99,102,241,.3)' } : { color: 'var(--text-secondary)' }}
          >
            <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={link.icon} /></svg>
            {!collapsed && <span>{t(link.labelKey)}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'var(--border)' }}>
        <button onClick={() => setCollapsed(!collapsed)} className="w-full hidden lg:flex items-center justify-center gap-2 px-3 py-2 rounded-xl transition-all duration-200" style={{ color: 'var(--text-muted)' }}>
          <svg className={`w-4 h-4 transition-transform duration-200 ${isRtl ? (collapsed ? '' : 'rotate-180') : (collapsed ? 'rotate-180' : '')}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" /></svg>
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-3 left-3 z-[70] lg:hidden btn btn-secondary btn-sm p-2"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)}></div>
      )}

      {/* Mobile sidebar */}
      <aside className={`fixed top-0 left-0 h-full z-[65] flex flex-col transition-transform duration-300 lg:hidden w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} style={{ background: theme === 'dark' ? 'rgba(10,14,26,.98)' : 'rgba(255,255,255,.98)', backdropFilter: 'blur(20px)' }}>
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside className={`fixed top-0 h-full z-50 hidden lg:flex flex-col transition-all duration-300 border-r ${isRtl ? 'right-0 border-r-0 border-l' : 'left-0 border-r'} ${collapsed ? 'w-[72px]' : 'w-64'}`} style={{ background: theme === 'dark' ? 'rgba(10,14,26,.95)' : 'rgba(255,255,255,.95)', backdropFilter: 'blur(20px)', borderColor: 'var(--border)' }}>
        <NavContent />
      </aside>
    </>
  );
}

function ThemePicker() {
  const { colorTheme, setColorTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const current = THEMES.find(t => t.id === colorTheme) || THEMES[0];

  return (
    <div className="theme-picker" ref={ref}>
      <button onClick={() => setOpen(!open)} className="btn btn-ghost btn-sm flex items-center gap-2" title="Change color theme">
        <div className="w-4 h-4 rounded-full border-2 border-white/20" style={{ background: current.color }}></div>
        <svg className="w-3 h-3" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="theme-picker-dropdown">
          <div className="theme-section-label">Dark</div>
          <div className="space-y-2 mb-3">
            {THEMES.map(t => (
              <button key={`dark-${t.id}`} className={`theme-swatch ${colorTheme === t.id ? 'active' : ''}`} style={{ background: '#111827' }} onClick={() => { setColorTheme(t.id); setOpen(false); }}>
                <div className="swatch-accent" style={{ background: t.color }}></div>
                <span className="swatch-label">{t.name}</span>
                <div className="swatch-check"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
              </button>
            ))}
          </div>
          <div className="theme-section-label">Light</div>
          <div className="space-y-2">
            {THEMES.map(t => (
              <button key={`light-${t.id}`} className={`theme-swatch ${colorTheme === t.id ? 'active' : ''}`} style={{ background: '#f1f5f9' }} onClick={() => { setColorTheme(t.id); setOpen(false); }}>
                <div className="swatch-accent" style={{ background: t.color }}></div>
                <span className="swatch-label">{t.name}</span>
                <div className="swatch-check"><svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ onSearchClick }) {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();
  const [lang, setLang] = useState(i18n.language);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'ar' : 'en';
    setLang(newLang);
    i18n.changeLanguage(newLang);
    localStorage.setItem('lang', newLang);
    document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
  };

  return (
    <header className="h-14 flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40 border-b" style={{ background: theme === 'dark' ? 'rgba(10,14,26,.8)' : 'rgba(255,255,255,.8)', backdropFilter: 'blur(12px)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-3 pl-12 lg:pl-0">
        <div className="w-2 h-2 rounded-full anim-pulse" style={{ background: 'var(--success)' }}></div>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t('dashboard')}</h2>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onSearchClick} className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] transition-all hover:bg-[var(--bg-hover)]" style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <span>Search</span>
          <kbd className="px-1 py-0.5 rounded text-[8px] font-mono" style={{ background: 'var(--bg-hover)', border: '1px solid var(--border)' }}>Ctrl+K</kbd>
        </button>
        <ThemePicker />
        <button onClick={toggleTheme} className="btn btn-ghost btn-sm" title="Toggle theme">
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
        <button onClick={toggleLang} className="btn btn-ghost btn-sm text-xs font-medium">
          {lang === 'en' ? 'عربي' : 'EN'}
        </button>
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: 'var(--gradient-1)' }}>M</div>
      </div>
    </header>
  );
}

function Layout() {
  const { i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
  const [colorTheme, setColorThemeState] = useState(localStorage.getItem('colorTheme') || 'indigo');
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= 1024);
  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleShowShortcuts = useCallback(() => setShowShortcuts(s => !s), []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color', colorTheme);
    localStorage.setItem('theme', theme);
    localStorage.setItem('colorTheme', colorTheme);
  }, [theme, colorTheme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const setColorTheme = (c) => setColorThemeState(c);

  const sidebarWidth = collapsed ? 72 : 256;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, colorTheme, setColorTheme }}>
      <ToastProvider>
        <BrowserRouter>
          <LayoutInner
            collapsed={collapsed} setCollapsed={setCollapsed}
            mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
            isDesktop={isDesktop} isRtl={isRtl} sidebarWidth={sidebarWidth}
            showShortcuts={showShortcuts} setShowShortcuts={setShowShortcuts}
            handleShowShortcuts={handleShowShortcuts}
          />
        </BrowserRouter>
      </ToastProvider>
    </ThemeContext.Provider>
  );
}

function LayoutInner({ collapsed, setCollapsed, mobileOpen, setMobileOpen, isDesktop, isRtl, sidebarWidth, showShortcuts, setShowShortcuts, handleShowShortcuts }) {
  const [searchOpen, setSearchOpen] = useState(false);

  useKeyboardShortcuts(() => setShowShortcuts(s => !s));

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setSearchOpen(s => !s); }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }} dir={isRtl ? 'rtl' : 'ltr'}>
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

      <div
        className="transition-all duration-300"
        style={{ [isRtl ? 'marginRight' : 'marginLeft']: isDesktop ? `${sidebarWidth}px` : '0px' }}
      >
        <Header onSearchClick={() => setSearchOpen(true)} />
        <main className="p-4 lg:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/products" element={<Products />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/pnl" element={<PnL />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/shipping" element={<Shipping />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/sync" element={<SyncPage />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
      <ShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; }
  });

  const handleLogin = (u) => setUser(u);
  const handleLogout = () => { localStorage.removeItem('auth_user'); setUser(null); };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div>
      <Layout />
      <button onClick={handleLogout} className="fixed bottom-4 right-4 z-[100] btn btn-ghost btn-sm p-2 rounded-full" style={{ background: 'var(--bg-card-solid)', border: '1px solid var(--border)' }} title="Logout">
        <svg className="w-4 h-4" style={{ color: 'var(--danger)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
      </button>
    </div>
  );
}
