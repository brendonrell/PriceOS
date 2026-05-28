'use client';

/*
 * useGasData — client-side poller for the /api/gas edge route.
 *
 * Module-level singleton cache — all consumers (LinksView, Footer,
 * GasTrackerModal) share one fetch and one interval. Menu open never
 * triggers a network call if data fetched < 12s ago. Alchemy quota
 * is only consumed by the singleton tick, not once per consumer mount.
 *
 * Singleton behaviour:
 *   - First subscriber starts the 12s interval and fires an immediate
 *     tick ONLY if cache is empty or stale (> 12s old).
 *   - Subsequent subscribers receive the cached value immediately via
 *     useState initialiser — no extra fetch, no loading flash.
 *   - Last subscriber stops the interval.
 *   - visibilitychange shared at module level — one listener total.
 *
 * The `active` flag is preserved so GasTrackerModal can still pause
 * polling when closed. An inactive consumer won't prevent the interval
 * from stopping when all active consumers unmount.
 */

import { useEffect, useState } from 'react';

export interface GasData {
    baseFeeGwei:  number;
    standardGwei: number;
    fastGwei:     number;
    rapidGwei:    number;
    ethUsd:       number;
    blockNumber:  number;
    fetchedAt:    number;
}

interface UseGasDataReturn {
    data:    GasData | null;
    loading: boolean;
    error:   string | null;
}

const POLL_MS   = 12_000;
const STALE_MS  = 12_000;

// ── Module-level singleton ────────────────────────────────────────────

type Listener = (data: GasData | null, loading: boolean, error: string | null) => void;

let _cache:      GasData | null = null;
let _loading                    = false;
let _error:      string | null  = null;
let _interval:   ReturnType<typeof setInterval> | null = null;
let _visAttached                = false;
const _listeners                = new Set<Listener>();
let _activeCount                = 0;  // consumers with active=true

function _notify(): void {
    _listeners.forEach(fn => fn(_cache, _loading, _error));
}

async function _tick(): Promise<void> {
    if (typeof document !== 'undefined' && document.hidden) return;
    // Skip if cache is still fresh
    if (_cache && Date.now() - _cache.fetchedAt < STALE_MS) return;
    _loading = true;
    _notify();
    try {
        const res  = await fetch('/api/gas');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        _cache   = (await res.json()) as GasData;
        _error   = null;
    } catch (err) {
        _error = err instanceof Error ? err.message : 'fetch failed';
    } finally {
        _loading = false;
        _notify();
    }
}

function _onVis(): void {
    if (typeof document !== 'undefined' && !document.hidden) _tick();
}

function _startSingleton(): void {
    if (_interval !== null) return;
    _interval = setInterval(_tick, POLL_MS);
    if (!_visAttached && typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', _onVis);
        _visAttached = true;
    }
    _tick();
}

function _stopSingleton(): void {
    if (_interval !== null) { clearInterval(_interval); _interval = null; }
    if (_visAttached && typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', _onVis);
        _visAttached = false;
    }
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useGasData(active: boolean): UseGasDataReturn {
    // Seed from cache immediately — no loading flash for returning consumers.
    const [data,    setData]    = useState<GasData | null>(_cache);
    const [loading, setLoading] = useState(_loading);
    const [error,   setError]   = useState<string | null>(_error);

    useEffect(() => {
        const listener: Listener = (d, l, e) => {
            setData(d);
            setLoading(l);
            setError(e);
        };
        _listeners.add(listener);

        if (active) {
            _activeCount++;
            if (_activeCount === 1) _startSingleton();
            else if (_cache && Date.now() - _cache.fetchedAt >= STALE_MS) _tick();
        }

        return () => {
            _listeners.delete(listener);
            if (active) {
                _activeCount = Math.max(0, _activeCount - 1);
                if (_activeCount === 0) _stopSingleton();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [active]);

    return { data, loading, error };
}
