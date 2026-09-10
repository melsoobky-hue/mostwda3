import { useState, useCallback, useRef } from 'react';

const cache = new Map();

export function useCache(key, fetcher, ttlMs = 60000) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const fetchingRef = useRef(false);

  const get = useCallback(async (force = false) => {
    const now = Date.now();
    const cached = cache.get(key);

    if (!force && cached && (now - cached.timestamp) < ttlMs) {
      setData(cached.data);
      setLastUpdated(new Date(cached.timestamp).toLocaleTimeString());
      return cached.data;
    }

    if (fetchingRef.current) return data;
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fetcher();
      cache.set(key, { data: result, timestamp: now });
      setData(result);
      setLastUpdated(new Date(now).toLocaleTimeString());
      return result;
    } catch (err) {
      setError(err.message || 'Failed to fetch');
      throw err;
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [key, fetcher, ttlMs]);

  const invalidate = useCallback(() => {
    cache.delete(key);
  }, [key]);

  const invalidateAll = useCallback(() => {
    cache.clear();
  }, []);

  return { data, loading, error, lastUpdated, get, invalidate, invalidateAll };
}

export function invalidateCache(pattern) {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) cache.delete(key);
  }
}
