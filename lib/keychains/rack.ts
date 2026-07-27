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
    equipped: number | null;
    streak: number;
    rank: number;
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
            .then((j: Rack | null) => {
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
