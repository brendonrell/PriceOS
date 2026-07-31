'use client';

/*
 * Keychain rack cache — one wallet's charms + equipped pick + the live
 * streak/rank their art renders with, off /api/keychains/{address}.
 * Module-wide cache in the useSpriteFace pattern: one fetch per address per
 * session, shared by every surface; bustRack() after a write (crank /
 * christen / equip) re-primes it.
 */

import { useEffect, useState } from 'react';
import type { CharmRecord } from './engine';

export interface Rack {
    address: string;
    charms: CharmRecord[];
    /** The worn pool — every charm the owner has equipped. */
    equipped: number[];
    /** The ones that hang, in hang order (max three). */
    top: number[];
    /** Draw the hanging three fresh from the pool on every page load. */
    shuffle: boolean;
    streak: number;
    rank: number;
}

/** Belt and braces for a cached response written before three-at-once. */
function normalizeRack(j: Rack | null): Rack | null {
    if (!j) return null;
    const equipped = Array.isArray(j.equipped)
        ? j.equipped
        : typeof j.equipped === 'number' ? [j.equipped] : [];
    const top = Array.isArray(j.top) ? j.top.slice(0, 3) : equipped.slice(0, 3);
    return { ...j, equipped, top, shuffle: j.shuffle === true };
}

const cache = new Map<string, Rack | null>();
const pending = new Map<string, Promise<Rack | null>>();
const listeners = new Set<() => void>();

function fetchRack(address: string): Promise<Rack | null> {
    const a = address.toLowerCase();
    let p = pending.get(a);
    if (!p) {
        p = fetch(`/api/keychains/${a}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((raw: Rack | null) => {
                const j = normalizeRack(raw);
                cache.set(a, j);
                pending.delete(a);
                listeners.forEach((cb) => cb());
                return j;
            })
            .catch(() => {
                cache.set(a, null);
                pending.delete(a);
                return null;
            });
        pending.set(a, p);
    }
    return p;
}

/** Drop + refetch a wallet's rack (after crank/christen/equip). */
export function bustRack(address: string): void {
    const a = address.toLowerCase();
    cache.delete(a);
    void fetchRack(a);
}

/** The same drop + refetch, awaitable — the Depanneur's pull-to-refresh holds
 *  its pill until the rack has actually landed. */
export function refreshRack(address: string): Promise<Rack | null> {
    const a = address.toLowerCase();
    cache.delete(a);
    pending.delete(a);
    return fetchRack(a);
}

export function useKeychainRack(address: string | null | undefined): Rack | null {
    const a = (address ?? '').toLowerCase();
    const [, force] = useState(0);
    useEffect(() => {
        if (!a) return;
        if (!cache.has(a)) void fetchRack(a);
        const cb = () => force((n) => n + 1);
        listeners.add(cb);
        return () => { listeners.delete(cb); };
    }, [a]);
    return a ? cache.get(a) ?? null : null;
}
