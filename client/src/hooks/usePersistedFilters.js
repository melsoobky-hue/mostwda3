import { useState, useCallback } from 'react';

export function usePersistedFilters(key, defaults = {}) {
  const storageKey = `filters_${key}`;

  const getInitial = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    } catch { return defaults; }
  };

  const [filters, setFiltersState] = useState(getInitial);

  const setFilters = useCallback((update) => {
    setFiltersState(prev => {
      const next = typeof update === 'function' ? update(prev) : { ...prev, ...update };
      localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }, [storageKey]);

  const resetFilters = useCallback(() => {
    setFiltersState(defaults);
    localStorage.setItem(storageKey, JSON.stringify(defaults));
  }, [defaults, storageKey]);

  const clearFilters = useCallback(() => {
    const cleared = Object.fromEntries(Object.keys(defaults).map(k => [k, '']));
    setFiltersState(cleared);
    localStorage.setItem(storageKey, JSON.stringify(cleared));
  }, [defaults, storageKey]);

  return { filters, setFilters, resetFilters, clearFilters };
}
