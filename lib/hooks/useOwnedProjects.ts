'use client';

/*
 * useOwnedProjects — the project slugs the SIGNED-IN viewer owns at least one
 * Output of (Brendon, 2026-07-29).
 *
 * The home page has fetched this list inline since the ownership check landed
 * beside project names there; project TAGS need the same fact on every surface
 * they ride, so the fetch lives here once instead of being copied per surface.
 * One module-level cache means the leaderboard, a profile hero and a project
 * by-line share a single request, and a mint/buy refreshes them together.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../state/AuthContext';

let cache: { addr: string; slugs: Set<string> } | null = null;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish() {
    for (const l of listeners) l();
}

function load(addr: string): Promise<void> {
    if (inflight) return inflight;
    inflight = fetch(`/api/user/${addr}/owned-projects`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
            if (Array.isArray(d?.slugs)) {
                cache = { addr, slugs: new Set(d.slugs as string[]) };
                publish();
            }
        })
        .catch(() => {})
        .finally(() => { inflight = null; });
    return inflight;
}

/** Slugs the viewer holds a piece of. Empty set when signed out. */
export function useOwnedProjects(): Set<string> {
    const { siweAddress } = useAuth();
    const addr = siweAddress?.toLowerCase() ?? null;
    const [, setTick] = useState(0);

    useEffect(() => {
        const l = () => setTick((n) => n + 1);
        listeners.add(l);
        return () => { listeners.delete(l); };
    }, []);

    useEffect(() => {
        if (!addr) { cache = null; return; }
        if (cache?.addr !== addr) load(addr);
        /* A mint or a buy can make a project newly owned — same signal the home
           page listens to. */
        const onRefresh = () => load(addr);
        window.addEventListener('pd:project-refresh', onRefresh);
        return () => window.removeEventListener('pd:project-refresh', onRefresh);
    }, [addr]);

    return addr && cache?.addr === addr ? cache.slugs : EMPTY;
}

const EMPTY: Set<string> = new Set();
