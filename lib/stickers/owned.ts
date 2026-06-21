'use client';

/*
 * owned — the simulated ownership ledger for stickers.
 *
 * "Real, as in simulated": buying a sheet actually grants its stickers and they
 * persist (localStorage) + drive your hero, with no backend. Keyed to the device
 * (the current user). The mock seed in catalog.ts still gives Brendon a starting
 * set on his profile for everyone to see; this layer is what YOU buy on top.
 *
 * Real on-chain reads (ERC-1155 balanceOf) replace this module later — the rest
 * of the UI just consumes ownedStickerIds(), so the swap is local.
 */

import { useEffect, useState } from 'react';
import { stickersForSheet, type SheetId } from './catalog';

const KEY = 'pd_owned_stickers';
const EVT = 'pd:stickers-changed';

export function getOwnedIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(KEY);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

function save(ids: string[]) {
    try {
        window.localStorage.setItem(KEY, JSON.stringify(ids));
    } catch {
        /* quota / private mode — ignore, ownership just won't persist */
    }
    window.dispatchEvent(new CustomEvent(EVT));
}

/** True when every sticker in the sheet is already owned. */
export function ownsSheet(sheetId: SheetId, owned: string[] = getOwnedIds()): boolean {
    const set = new Set(owned);
    return stickersForSheet(sheetId).every((s) => set.has(s.id));
}

/** Grant every sticker in a sheet (simulated buy). Returns the new owned set. */
export function buySheet(sheetId: SheetId): string[] {
    const next = new Set(getOwnedIds());
    for (const s of stickersForSheet(sheetId)) next.add(s.id);
    const arr = [...next];
    save(arr);
    return arr;
}

/** Live owned-id list — re-reads on any purchase (this tab or another). */
export function useOwnedStickerIds(): string[] {
    // Start empty so server + first client render agree, then hydrate on mount.
    const [ids, setIds] = useState<string[]>([]);
    useEffect(() => {
        setIds(getOwnedIds());
        const sync = () => setIds(getOwnedIds());
        window.addEventListener(EVT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(EVT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);
    return ids;
}
