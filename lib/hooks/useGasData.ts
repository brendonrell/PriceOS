'use client';

/*
 * useGasData — client-side poller for the /api/gas edge route.
 *
 * Polls every 12s while `active` is true, pauses when the tab is
 * hidden, and triggers an immediate refresh when visibility returns.
 * The edge route is itself cached at 12s globally, so coincident
 * polls from many clients collapse to a single Alchemy fetch per
 * window — see Tier 2 cost arch (page 2kyd6gx6-3234).
 *
 * Consumers:
 *   - LinksView gas widget: useGasData(true) while the user dropdown
 *     is open (LinksView only mounts in that state, so the active
 *     flag is effectively "dropdown open").
 *   - GasTrackerModal: useGasData(isOpen) — only polls while the
 *     modal is open.
 *
 * The `active` gate matters: without it, every mounted consumer
 * would tick on its own 12s interval forever, hammering the local
 * route cache and counting against Vercel invocations even when no
 * UI is showing the data.
 */

import { useEffect, useState } from 'react';

export interface GasData {
    baseFeeGwei: number;
    standardGwei: number;
    fastGwei: number;
    rapidGwei: number;
    ethUsd: number;
    blockNumber: number;
    fetchedAt: number;
}

interface UseGasDataReturn {
    data: GasData | null;
    loading: boolean;
    error: string | null;
}

const POLL_MS = 30_000;

export function useGasData(active: boolean): UseGasDataReturn {
    const [data, setData] = useState<GasData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!active) return;
        let cancelled = false;

        const tick = async () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            setLoading(true);
            try {
                const res = await fetch('/api/gas');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json()) as GasData;
                if (cancelled) return;
                setData(json);
                setError(null);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : 'fetch failed');
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        tick();
        const id = setInterval(tick, POLL_MS);

        const onVis = () => {
            if (!document.hidden) tick();
        };
        document.addEventListener('visibilitychange', onVis);

        return () => {
            cancelled = true;
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [active]);

    return { data, loading, error };
}
