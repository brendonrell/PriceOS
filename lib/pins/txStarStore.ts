'use client';

/*
 * txStarStore — STARRED TX (the +More → Starred "Txs" surface + the
 * long-press star on activity-feed rows). A star captures the event's
 * display essentials at star-time so the Starred row renders without
 * re-deriving ledger state.
 *
 * Envelope shape: an array of JSON strings (matching the string[] shape the
 * other star lists use). PRIVATE, account-backed via the settings envelope
 * (`txStars`). Persistence protocol lives in createPinStore (2026-07-06
 * factory).
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore } from './createPinStore';

export interface TxStar {
    /** The ledger event id — the star's identity. */
    id: string;
    type: 'MINT' | 'LIST' | 'SALE' | 'XFER';
    tokenId: string | null;
    fromAddress: string | null;
    toAddress: string | null;
    priceEth: string | null;
    timestamp: string;
    fromHandle: string | null;
    toHandle: string | null;
}

function decode(parsed: unknown): TxStar[] {
    if (!Array.isArray(parsed)) return [];
    return parsed
        .map((v): TxStar | null => {
            if (typeof v === 'string') { try { v = JSON.parse(v); } catch { return null; } }
            if (!v || typeof v !== 'object') return null;
            const o = v as Record<string, unknown>;
            if (typeof o.id !== 'string' || typeof o.type !== 'string') return null;
            return v as TxStar;
        })
        .filter((s): s is TxStar => s != null);
}

const store = createPinStore<TxStar[]>({
    storageKey: STATE_CACHE_KEYS.txStars,
    empty: () => [],
    decode,
    // Stored as an array of JSON strings, matching the string[] envelope shape
    // the other star lists use (artistStars / soundtrackStars / …).
    encode: (items) => items.map((s) => JSON.stringify(s)),
    push: (encoded) => pushSettings({ txStars: encoded as string[] }),
});

/** Starred tx events, newest-starred last (insertion order). */
export function getTxStarItems(): ReadonlyArray<TxStar> {
    return store.get();
}

export function isTxStarred(id: string): boolean {
    return store.get().some((s) => s.id === id);
}

/** Remove a starred tx by event id. */
export function removeTxStar(id: string): void {
    const cur = store.get();
    if (!cur.some((s) => s.id === id)) return;
    store.set(cur.filter((s) => s.id !== id));
}

/** Toggle a tx event's star (long-press on an activity-feed row). */
export function toggleTxStar(star: TxStar): 'starred' | 'unstarred' {
    const cur = store.get();
    if (cur.some((s) => s.id === star.id)) {
        store.set(cur.filter((s) => s.id !== star.id));
        return 'unstarred';
    }
    store.set([...cur, star]);
    return 'starred';
}

export function subscribeTxStars(cb: (items: readonly TxStar[]) => void): () => void {
    return store.subscribe(cb);
}
