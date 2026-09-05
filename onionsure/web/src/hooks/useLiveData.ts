import { useCallback, useEffect, useRef, useState } from 'react';
import { realtime, useRealtimeEvent, markDataUpdated, setGlobalRefreshing, type RealtimeStatus } from '../lib/realtime';

export interface LiveState<T> {
  data: T | null;
  error: string | null;
  /** True only for the very first load (used to show a skeleton). */
  loading: boolean;
  /** True for any in-flight fetch after the first (used for a subtle pulse). */
  refreshing: boolean;
  lastUpdated: number | null;
  refresh: () => void;
  setData: React.Dispatch<React.SetStateAction<T | null>>;
}

interface Options {
  /** Event names that should trigger a refetch. */
  events?: string[];
  /** Always poll at this interval (ms) as a safety net / WS fallback. */
  pollMs?: number;
  /** Poll only while the socket is down. Default true. */
  pollWhenOffline?: boolean;
  /** Extra values that should force a refetch when they change. */
  deps?: any[];
  enabled?: boolean;
}

/**
 * Fetch data and keep it live.
 *
 * Refetches when a matching realtime event arrives, and (optionally) polls as a
 * fallback so the UI stays correct even if the socket drops.
 */
export function useLiveData<T = any>(fetcher: () => Promise<T>, opts: Options = {}): LiveState<T> {
  const {
    events = [],
    pollMs,
    pollWhenOffline = true,
    deps = [],
    enabled = true,
  } = opts;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const mounted = useRef(true);
  const inFlight = useRef<Promise<void> | null>(null);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const run = useCallback(async (opts2?: { silent?: boolean }) => {
    const silent = opts2?.silent ?? false;
    if (!enabled) return;
    if (inFlight.current) {
      // Coalesce concurrent triggers; the in-flight one will pick up new data.
      try { await inFlight.current; } catch {}
    }
    const p = (async () => {
      if (!silent && !loading) { setRefreshing(true); setGlobalRefreshing(true); }
      try {
        const result = await fetcherRef.current();
        if (!mounted.current) return;
        setData(result);
        setError(null);
        setLastUpdated(Date.now());
        markDataUpdated();
      } catch (e: any) {
        if (!mounted.current) return;
        // Keep showing stale data rather than blanking the screen.
        setError(e?.message || 'Failed to load');
      } finally {
        if (mounted.current) {
          setLoading(false);
          setRefreshing(false);
          setGlobalRefreshing(false);
        }
      }
    })();
    inFlight.current = p;
    await p;
    inFlight.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps]);

  // Initial + dependency-driven load
  useEffect(() => { run(); }, [run]);

  // Realtime-driven refresh
  useRealtimeEvent(events.length ? events : '__never__', () => { run({ silent: true }); }, 300);

  // Fallback polling
  useEffect(() => {
    if (!enabled) return;
    const shouldPoll = pollMs && (!pollWhenOffline || realtime.status !== 'live');
    if (!shouldPoll) return;
    const iv = setInterval(() => run({ silent: true }), pollMs);
    return () => clearInterval(iv);
  }, [pollMs, pollWhenOffline, enabled, run]);

  return {
    data,
    error,
    loading,
    refreshing,
    lastUpdated,
    refresh: useCallback(() => { run({ silent: true }); }, [run]),
    setData,
  };
}

/** Merge several live sources into one loading flag. */
export function useAllLoading(...states: { loading: boolean }[]) {
  return states.some((s) => s.loading);
}

export { useRealtimeEvent, realtime };
export type { RealtimeStatus };
