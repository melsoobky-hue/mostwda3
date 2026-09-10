/**
 * useApi — unified data-fetching hook with:
 *   • Stale-while-revalidate (serve cached data instantly, refresh in background)
 *   • Per-key TTL configuration
 *   • In-flight deduplication (one request per key at a time)
 *   • Manual invalidation (single key or pattern)
 *   • Auto-refresh interval support
 *   • Cross-component cache sharing via module-level Map
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ── Module-level shared cache ──────────────────────────────────────────────
const cache   = new Map(); // key → { data, timestamp, error }
const inflight = new Map(); // key → Promise

export function invalidateKey(key) {
  cache.delete(key);
}

export function invalidatePattern(pattern) {
  for (const k of cache.keys()) {
    if (k.includes(pattern)) cache.delete(k);
  }
}

export function invalidateAll() {
  cache.clear();
}

export function primeCache(key, data) {
  cache.set(key, { data, timestamp: Date.now(), error: null });
}

// ── Hook ───────────────────────────────────────────────────────────────────
/**
 * @param {string|null}   url        – fetch URL. Pass null to skip.
 * @param {object}        options
 * @param {number}        options.ttl          – cache TTL in ms (default 60 000)
 * @param {number|null}   options.refreshInterval – auto-refresh in ms (null = off)
 * @param {boolean}       options.revalidate   – stale-while-revalidate (default true)
 * @param {function}      options.transform    – transform raw response before storing
 * @param {any}           options.deps         – extra deps that bust the cache
 */
export function useApi(url, {
  ttl             = 60_000,
  refreshInterval = null,
  revalidate      = true,
  transform       = null,
  deps            = [],
} = {}) {
  const [data,        setData]        = useState(() => cache.get(url)?.data ?? null);
  const [loading,     setLoading]     = useState(false);
  const [background,  setBackground]  = useState(false); // silent background refresh
  const [error,       setError]       = useState(null);
  const [updatedAt,   setUpdatedAt]   = useState(() => cache.get(url)?.timestamp ?? null);
  const mountedRef = useRef(true);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const fetchData = useCallback(async (force = false) => {
    if (!url) return;

    const now    = Date.now();
    const cached = cache.get(url);
    const fresh  = cached && (now - cached.timestamp) < ttl;

    // Serve stale data immediately while refreshing in background
    if (cached && !force) {
      if (mountedRef.current) {
        setData(cached.data);
        setUpdatedAt(cached.timestamp);
      }
      if (fresh) return cached.data; // still fresh, no refetch needed
    }

    // Deduplicate — if a request for this key is already in-flight, wait for it
    if (inflight.has(url)) {
      try {
        const result = await inflight.get(url);
        if (mountedRef.current) { setData(result); setLoading(false); setBackground(false); }
        return result;
      } catch (_) { return; }
    }

    // Decide spinner visibility: show spinner only if no stale data to show
    if (mountedRef.current) {
      if (revalidate && cached) setBackground(true);
      else setLoading(true);
    }

    const promise = (async () => {
      const res  = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      let json = await res.json();
      if (transform) json = transform(json);
      return json;
    })();

    inflight.set(url, promise);

    try {
      const result = await promise;
      cache.set(url, { data: result, timestamp: Date.now(), error: null });
      if (mountedRef.current) {
        setData(result);
        setUpdatedAt(Date.now());
        setError(null);
      }
      return result;
    } catch (err) {
      if (mountedRef.current) setError(err.message);
      throw err;
    } finally {
      inflight.delete(url);
      if (mountedRef.current) { setLoading(false); setBackground(false); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ttl, revalidate, transform, ...deps]);

  // Initial fetch + re-fetch when url/deps change
  useEffect(() => {
    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, ...deps]);

  // Auto-refresh interval
  useEffect(() => {
    if (!refreshInterval || !url) return;
    const id = setInterval(() => fetchData(), refreshInterval);
    return () => clearInterval(id);
  }, [url, refreshInterval, fetchData]);

  const refresh = useCallback(() => fetchData(true), [fetchData]);

  const mutate  = useCallback((updater) => {
    setData(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      cache.set(url, { data: next, timestamp: Date.now(), error: null });
      return next;
    });
  }, [url]);

  return {
    data,
    loading,      // full-screen spinner (no stale data)
    background,   // silent background refresh indicator
    error,
    updatedAt,
    refresh,      // force re-fetch
    mutate,       // optimistic local update
  };
}
