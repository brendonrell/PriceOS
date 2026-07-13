'use client';

/*
 * useApi — THE data-fetch convention for new surfaces (Architect Report §4.3).
 *
 * The app grew ~170 hand-rolled fetch+loading+error blocks; this hook is the
 * one shared implementation new code reaches for instead. It deliberately
 * does the boring 90%: in-flight de-dupe across components, a small
 * stale-while-revalidate cache, abort-on-unmount, and a refetch handle.
 * Existing surfaces migrate opportunistically when touched — never as a
 * mass rewrite (contract: fix the named thing, nothing else).
 *
 *   const { data, error, loading, refetch } = useApi<HomePayload>('/api/home');
 *   const { data } = useApi<Stats>(slug ? `/api/project/${slug}` : null); // null = paused
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface CacheEntry {
  at: number;
  data: unknown;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();
const DEFAULT_STALE_MS = 15_000;

async function fetchJson(url: string): Promise<unknown> {
  const existing = inflight.get(url);
  if (existing) return existing;
  const p = (async () => {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = (await r.json()) as unknown;
      cache.set(url, { at: Date.now(), data: j });
      return j;
    } finally {
      inflight.delete(url);
    }
  })();
  inflight.set(url, p);
  return p;
}

export interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useApi<T>(url: string | null, opts?: { staleMs?: number }): UseApiResult<T> {
  const staleMs = opts?.staleMs ?? DEFAULT_STALE_MS;
  const cached = url ? cache.get(url) : undefined;
  const [data, setData] = useState<T | null>((cached?.data as T) ?? null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!!url && !cached);
  const alive = useRef(true);

  const load = useCallback(
    (force = false) => {
      if (!url) return;
      const entry = cache.get(url);
      if (entry && !force && Date.now() - entry.at < staleMs) {
        setData(entry.data as T);
        setLoading(false);
        return;
      }
      // Stale-while-revalidate: keep showing the old data while refetching.
      if (entry) setData(entry.data as T);
      setLoading(!entry);
      fetchJson(url)
        .then((j) => {
          if (!alive.current) return;
          setData(j as T);
          setError(null);
        })
        .catch((e: unknown) => {
          if (!alive.current) return;
          setError(e instanceof Error ? e.message : 'fetch failed');
        })
        .finally(() => {
          if (alive.current) setLoading(false);
        });
    },
    [url, staleMs]
  );

  useEffect(() => {
    alive.current = true;
    load();
    return () => {
      alive.current = false;
    };
  }, [load]);

  const refetch = useCallback(() => load(true), [load]);

  return { data, error, loading, refetch };
}
