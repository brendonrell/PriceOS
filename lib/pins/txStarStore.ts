'use client';

/*
 * txStarStore — STARRED TX (the +More → Starred "Tx" surface, the very last
 * filter after Soundtracks). The viewer long-presses any on-chain event row in
 * an activity feed (project or profile) to star/unstar it — the same gesture as
 * the artist @name / project-title / soundtrack stars.
 *
 * On-chain events are DB-driven (simulated for now), so — like soundtrack stars
 * — we capture the event's display essentials AT STAR-TIME and persist them, so
 * the Starred Tx row can re-render the event (actor · verb · #id · price · time)
 * without re-fetching the feed. Each entry is a JSON blob; identity is the
 * event id (stable UUID from the `events` ledger).
 *
 * PRIVATE (owner-only), account-backed via the settings envelope (`txStars`),
 * same write-through + login-hydration as the other stars.
 */

import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.txStars;

/** The event essentials captured at star-time — enough to re-render the row.
 *  Mirrors the subset of the ledger EventRow that eventToFeedEvent() reads. */
export interface TxStar {
    id: string;
    type: 'MINT' | 'LIST' | 'SALE' | 'XFER';
    tokenId: string | null;
    fromAddress: string | null;
    toAddress: string | null;
    fromHandle: string | null;
    toHandle: string | null;
    priceEth: string | null;
    timestamp: string;
}

type Listener = (items: ReadonlyArray<TxStar>) => void;

let items: TxStar[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function parse(raw: string): TxStar[] {
    try {
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed
            .map((v): TxStar | null => {
                if (typeof v === 'string') { try { v = JSON.parse(v); } catch { return null; } }
                if (!v || typeof v !== 'object' || typeof v.id !== 'string' || typeof v.type !== 'string') return null;
                return v as TxStar;
            })
            .filter((s): s is TxStar => s != null);
    } catch {
        return [];
    }
}

function loadFromCache(): TxStar[] {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? parse(raw) : [];
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    items = loadFromCache();
}

function persist(): void {
    // Stored as an array of JSON strings, matching the string[] envelope shape
    // the other star lists use (artistStars / soundtrackStars / …).
    const encoded = items.map((s) => JSON.stringify(s));
    if (typeof window !== 'undefined') {
        try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(encoded)); } catch { /* ignore */ }
    }
    pushSettings({ txStars: encoded });
}

function emit(): void {
    const snap = [...items];
    listeners.forEach((l) => l(snap));
}

if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        items = loadFromCache();
        emit();
    });
}

/** Starred tx events, newest-starred last (insertion order). */
export function getTxStarItems(): ReadonlyArray<TxStar> {
    hydrate();
    return items;
}

export function isTxStarred(id: string): boolean {
    hydrate();
    return items.some((s) => s.id === id);
}

/** Remove a starred tx by event id. */
export function removeTxStar(id: string): void {
    hydrate();
    if (!items.some((s) => s.id === id)) return;
    items = items.filter((s) => s.id !== id);
    persist();
    emit();
}

/** Toggle a tx event's star (long-press on an activity-feed row). */
export function toggleTxStar(star: TxStar): 'starred' | 'unstarred' {
    hydrate();
    if (items.some((s) => s.id === star.id)) {
        removeTxStar(star.id);
        return 'unstarred';
    }
    items = [...items, star];
    persist();
    emit();
    return 'starred';
}

export function subscribeTxStars(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}
