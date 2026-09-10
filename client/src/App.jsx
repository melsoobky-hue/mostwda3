import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState, useEffect, createContext, useContext, useRef, useCallback, lazy, Suspense } from 'react';
import { ToastProvider } from './components/Toast';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import ShortcutsHelp from './components/ShortcutsHelp';
import GlobalSearch from './components/GlobalSearch';
import Login from './pages/Login';

const Dashboard  = lazy(() => import('./pages/Dashboard'));
const Orders     = lazy(() => import('./pages/Orders'));
const Products   = lazy(() => import('./pages/Products'));
const Analytics  = lazy(() => import('./pages/Analytics'));
const SyncPage   = lazy(() => import('./pages/SyncPage'));
const Settings   = lazy(() => import('./pages/Settings'));
const Customers  = lazy(() => import('./pages/Customers'));
const PnL        = lazy(() => import('./pages/PnL'));
const Inventory  = lazy(() => import('./pages/Inventory'));
const Shipping   = lazy(() => import('./pages/Shipping'));
const Rules      = lazy(() => import('./pages/Rules'));

/* ── Context ───────────────────────────────── */
const ThemeContext = createContext();
export function useTheme() { return useContext(ThemeContext); }

const THEMES = [
  { id: 'heritage', name: 'Heritage', color: '#8a6e2f' },
  { id: 'sage',     name: 'Sage',     color: '#607b56' },
  { id: 'indigo',   name: 'Indigo',   color: '#5b5ea6' },
  { id: 'stone',    name: 'Stone',    color: '#6a7c87' },
  { id: 'teal',     name: 'Teal',     color: '#2d8f7e' },
  { id: 'emerald',  name: 'Emerald',  color: '#2d7d5a' },
  { id: 'rose',     name: 'Rose',     color: '#a64458' },
  { id: 'amber',    name: 'Amber',    color: '#a06020' },
  { id: 'cyan',     name: 'Cyan',     color: '#2878a0' },
];

/* ── Nav structure ──────────────────────────── */
const NAV_SECTIONS = [
  {
    label: 'Overview',
    links: [
      { to: '/',          icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6', labelKey: 'dashboard' },
      { to: '/analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', labelKey: 'analytics' },
      { to: '/pnl',       icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', labelKey: 'pnl' },
    ],
  },
  {
    label: 'Commerce',
    links: [
      { to: '/orders',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01', labelKey: 'orders' },
      { to: '/products',  icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4', labelKey: 'products' },
      { to: '/customers', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', labelKey: 'customers' },
      { to: '/inventory', icon: 'M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4', labelKey: 'inventory' },
      { to: '/shipping',  icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0', labelKey: 'shipping' },
    ],
  },
  {
    label: 'System',
    links: [
      { to: '/rules',    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2', labelKey: 'rules' },
      { to: '/sync',     icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15', labelKey: 'sync' },
      { to: '/settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z', labelKey: 'settings' },
    ],
  },
];

/* ── Sidebar ────────────────────────────────── */
function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const NavContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className="sidebar-logo-area flex items-center gap-3 flex-shrink-0">
        <div className="flex-shrink-0 rounded-xl overflow-hidden"
          style={{ width: 38, height: 38, boxShadow: '0 2px 10px rgba(0,0,0,0.35)' }}>
          <img src="/logo.svg" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        {!collapsed && (
          <div className="anim-fade-up">
            <div className="sidebar-brand-name">Mostawdaa</div>
            <div className="sidebar-brand-sub">Mirrors Dashboard</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            {!collapsed && (
              <div className="sidebar-section-label">{section.label}</div>
            )}
            {collapsed && <div style={{ height: 12 }} />}
            {section.links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? t(link.labelKey) : undefined}
                className={({ isActive }) =>
                  `sidebar-nav-link ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-0 mx-auto w-11' : ''}`
                }
              >
                <svg
                  className="flex-shrink-0"
                  style={{ width: 17, height: 17 }}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={link.icon} />
                </svg>
                {!collapsed && <span>{t(link.labelKey)}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Bottom collapse toggle (desktop) */}
      <div className="flex-shrink-0 p-3 border-t" style={{ borderColor: 'rgba(255,240,210,0.07)' }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex w-full items-center justify-center gap-2 py-2 rounded-xl transition-all duration-200"
          style={{ color: 'rgba(200,180,140,0.5)' }}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg
            className={`transition-transform duration-300 ${isRtl ? (collapsed ? '' : 'rotate-180') : (collapsed ? 'rotate-180' : '')}`}
            style={{ width: 15, height: 15 }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>
    </div>
  );

  const sidebarStyle = {
    background: 'var(--gradient-sidebar)',
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="fixed top-4 left-4 z-[70] lg:hidden btn btn-secondary btn-sm p-2"
        style={{ borderRadius: 10 }}
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Open menu"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] lg:hidden"
          style={{ background: 'rgba(20,15,5,0.55)', backdropFilter: 'blur(4px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`fixed top-0 h-full z-[65] flex flex-col transition-transform duration-300 ease-out lg:hidden w-64 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={sidebarStyle}
      >
        <NavContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`fixed top-0 h-full z-50 hidden lg:flex flex-col transition-all duration-300 ease-out ${isRtl ? 'right-0' : 'left-0'} ${collapsed ? 'w-[70px]' : 'w-64'}`}
        style={sidebarStyle}
      >
        <NavContent />
      </aside>
    </>
  );
}

/* ── Theme Picker ───────────────────────────── */
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
      <button
        onClick={() => setOpen(!open)}
        className="btn btn-ghost btn-sm flex items-center gap-2"
        title="Change accent colour"
      >
        <div
          className="w-3.5 h-3.5 rounded-full"
          style={{ background: current.color, boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }}
        />
        <svg className="w-3 h-3" style={{ color: 'var(--text-muted)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="theme-picker-dropdown anim-fade-down">
          <div className="theme-section-label">Dark</div>
          <div className="space-y-0.5 mb-3">
            {THEMES.map(t => (
              <button
                key={`d-${t.id}`}
                className={`theme-swatch ${colorTheme === t.id ? 'active' : ''}`}
                style={{ background: colorTheme === t.id ? undefined : 'transparent' }}
                onClick={() => { setColorTheme(t.id); setOpen(false); }}
              >
                <div className="swatch-accent" style={{ background: t.color }} />
                <span>{t.name}</span>
                {colorTheme === t.id && (
                  <svg className="w-3 h-3 ml-auto" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
          <div className="theme-section-label">Light</div>
          <div className="space-y-0.5">
            {THEMES.map(t => (
              <button
                key={`l-${t.id}`}
                className={`theme-swatch ${colorTheme === t.id ? 'active' : ''}`}
                style={{ background: colorTheme === t.id ? undefined : 'transparent' }}
                onClick={() => { setColorTheme(t.id); setOpen(false); }}
              >
                <div className="swatch-accent" style={{ background: t.color }} />
                <span>{t.name}</span>
                {colorTheme === t.id && (
                  <svg className="w-3 h-3 ml-auto" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Breadcrumb ─────────────────────────────── */
const ROUTE_LABELS = {
  '/':          'Dashboard',
  '/orders':    'Orders',
  '/products':  'Products',
  '/customers': 'Customers',
  '/analytics': 'Analytics',
  '/pnl':       'Profit & Loss',
  '/inventory': 'Inventory',
  '/shipping':  'Shipping',
  '/rules':     'Rules',
  '/sync':      'Sync',
  '/settings':  'Settings',
};

function Breadcrumb() {
  const location = useLocation();
  const label = ROUTE_LABELS[location.pathname] || 'Page';
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Mostawdaa</span>
      <svg className="w-3 h-3" style={{ color: 'var(--border-hover)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{label}</span>
    </div>
  );
}

/* ── Header ─────────────────────────────────── */
function Header({ onSearchClick }) {
  const { i18n } = useTranslation();
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
    <header className="header-root">
      {/* Left: breadcrumb + status */}
      <div className="flex items-center gap-4 pl-12 lg:pl-0">
        <div className="flex items-center gap-2">
          <span
            className="anim-pulse"
            style={{
              display: 'inline-block', width: 7, height: 7,
              borderRadius: '50%', background: 'var(--success)',
              boxShadow: '0 0 0 2px var(--success-bg)',
            }}
          />
        </div>
        <Breadcrumb />
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1">
        {/* Search trigger */}
        <button
          onClick={onSearchClick}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs transition-all"
          style={{
            border: '1px solid var(--border-strong)',
            color: 'var(--text-muted)',
            background: 'var(--bg-input)',
          }}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <span>Search</span>
          <kbd
            className="px-1.5 py-0.5 rounded text-[9px] font-mono"
            style={{ background: 'var(--bg-hover)', border: '1px solid var(--border-strong)' }}
          >
            Ctrl+K
          </kbd>
        </button>

        <ThemePicker />

        {/* Dark / light */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost btn-sm"
          title="Toggle theme"
          aria-label="Toggle dark/light mode"
        >
          {theme === 'dark' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        {/* Language */}
        <button
          onClick={toggleLang}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: 12, fontWeight: 600, minWidth: 36 }}
        >
          {lang === 'en' ? 'عربي' : 'EN'}
        </button>

        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ml-1"
          style={{
            background: 'var(--accent)',
            boxShadow: '0 2px 8px var(--accent-glow)',
            fontFamily: "'DM Serif Display', serif",
            fontSize: 14,
          }}
        >
          M
        </div>
      </div>
    </header>
  );
}

/* ── Page loading skeleton ──────────────────── */
function PageSkeleton() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="text-center">
        <div
          className="mx-auto mb-5"
          style={{
            width: 40, height: 40,
            borderRadius: '50%',
            border: '2px solid var(--border-strong)',
            borderTopColor: 'var(--accent)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p
          className="text-serif text-base"
          style={{ color: 'var(--text-muted)', fontFamily: "'DM Serif Display', serif" }}
        >
          Loading…
        </p>
      </div>
    </div>
  );
}

/* ── Layout (state owner) ───────────────────── */
function Layout() {
  const { i18n } = useTranslation();
  const [collapsed,       setCollapsed]       = useState(false);
  const [theme,           setTheme]           = useState(() => localStorage.getItem('theme')      || 'light');
  const [colorTheme,      setColorThemeState] = useState(() => localStorage.getItem('colorTheme') || 'heritage');
  const [showShortcuts,   setShowShortcuts]   = useState(false);
  const [mobileOpen,      setMobileOpen]      = useState(false);
  const [isDesktop,       setIsDesktop]       = useState(() => window.innerWidth >= 1024);
  const isRtl = i18n.language === 'ar';

  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color', colorTheme);
    localStorage.setItem('theme', theme);
    localStorage.setItem('colorTheme', colorTheme);
  }, [theme, colorTheme]);

  const toggleTheme    = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const setColorTheme  = (c) => setColorThemeState(c);
  const sidebarWidth   = isDesktop ? (collapsed ? 70 : 256) : 0;
  const handleShowShortcuts = useCallback(() => setShowShortcuts(s => !s), []);

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

function LayoutInner({
  collapsed, setCollapsed, mobileOpen, setMobileOpen,
  isDesktop, isRtl, sidebarWidth,
  showShortcuts, setShowShortcuts,
}) {
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
    <div
      className="min-h-screen"
      style={{ background: 'var(--bg-primary)' }}
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <Sidebar
        collapsed={collapsed} setCollapsed={setCollapsed}
        mobileOpen={mobileOpen} setMobileOpen={setMobileOpen}
      />

      <div
        className="transition-all duration-300"
        style={{
          [isRtl ? 'marginRight' : 'marginLeft']: `${sidebarWidth}px`,
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        <Header onSearchClick={() => setSearchOpen(true)} />

        <main className="p-5 lg:p-7 xl:p-9">
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              <Route path="/"          element={<Dashboard />} />
              <Route path="/orders"    element={<Orders />} />
              <Route path="/products"  element={<Products />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/pnl"       element={<PnL />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/shipping"  element={<Shipping />} />
              <Route path="/rules"     element={<Rules />} />
              <Route path="/sync"      element={<SyncPage />} />
              <Route path="/settings"  element={<Settings />} />
            </Routes>
          </Suspense>
        </main>
      </div>

      <ShortcutsHelp open={showShortcuts} onClose={() => setShowShortcuts(false)} />
      <GlobalSearch  open={searchOpen}    onClose={() => setSearchOpen(false)} />
    </div>
  );
}

/* ── App root ───────────────────────────────── */
export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('auth_user')); } catch { return null; }
  });

  const handleLogin  = (u) => setUser(u);
  const handleLogout = () => { localStorage.removeItem('auth_user'); setUser(null); };

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div>
      <Layout />
      {/* Logout button — floating bottom-right */}
      <button
        onClick={handleLogout}
        className="fixed bottom-5 right-5 z-[100] flex items-center justify-center rounded-full transition-all duration-200 hover:scale-105"
        style={{
          width: 38, height: 38,
          background: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-md)',
          color: 'var(--danger)',
        }}
        title="Sign out"
        aria-label="Sign out"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
      </button>
    </div>
  );
}
