import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const SHORTCUTS = [
  { keys: ['g', 'd'], action: 'dashboard', path: '/', label: 'Go to Dashboard' },
  { keys: ['g', 'o'], action: 'orders', path: '/orders', label: 'Go to Orders' },
  { keys: ['g', 'p'], action: 'products', path: '/products', label: 'Go to Products' },
  { keys: ['g', 'a'], action: 'analytics', path: '/analytics', label: 'Go to Analytics' },
  { keys: ['g', 's'], action: 'sync', path: '/sync', label: 'Go to Sync' },
  { keys: ['g', 'c'], action: 'customers', path: '/customers', label: 'Go to Customers' },
  { keys: ['g', 't'], action: 'settings', path: '/settings', label: 'Go to Settings' },
  { keys: ['/'], action: 'search', label: 'Focus search' },
  { keys: ['?'], action: 'help', label: 'Show shortcuts' },
];

export function useKeyboardShortcuts(onShowHelp) {
  const navigate = useNavigate();
  const buffer = useCallback((() => {
    let keys = [];
    let timer = null;
    return {
      push(key) {
        keys.push(key);
        clearTimeout(timer);
        timer = setTimeout(() => { keys = []; }, 800);
        return keys;
      },
      reset() { keys = []; clearTimeout(timer); }
    };
  })(), []);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();
      const seq = buffer.push(key);

      const match = SHORTCUTS.find(s => {
        if (s.keys.length === 1) return seq[seq.length - 1] === s.keys[0];
        if (s.keys.length === 2) return seq.slice(-2).join(',') === s.keys.join(',');
        return false;
      });

      if (match) {
        e.preventDefault();
        buffer.reset();
        if (match.path) navigate(match.path);
        if (match.action === 'search') {
          const input = document.querySelector('[data-search-input]');
          if (input) input.focus();
        }
        if (match.action === 'help' && onShowHelp) onShowHelp();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, buffer, onShowHelp]);
}

export { SHORTCUTS };
