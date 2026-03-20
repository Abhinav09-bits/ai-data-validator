// frontend/src/hooks/useApi.js
import { useState, useEffect, useCallback } from 'react';

/**
 * Generic hook for API calls
 * Usage: const { data, loading, error, refetch } = useApi(getStats)
 */
export function useApi(apiFn, args = [], options = {}) {
  const { immediate = true } = options;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (...callArgs) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFn(...(callArgs.length ? callArgs : args));
      setData(res.data);
      return res.data;
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Request failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);  // eslint-disable-line

  useEffect(() => {
    if (immediate) fetch();
  }, []); // eslint-disable-line

  return { data, loading, error, refetch: fetch };
}

/**
 * Polling hook — refetches every `interval` ms
 * Usage: const { data } = usePolling(getStats, [], 5000)
 */
export function usePolling(apiFn, args = [], interval = 5000) {
  const { data, loading, error, refetch } = useApi(apiFn, args);

  useEffect(() => {
    const timer = setInterval(() => refetch(), interval);
    return () => clearInterval(timer);
  }, [interval]); // eslint-disable-line

  return { data, loading, error, refetch };
}