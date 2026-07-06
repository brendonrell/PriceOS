'use client';

/*
 * starStore — chat #6 D010-star (Card hover overlay icons) + the profile
 * Starred sub-tab.
 *
 * State shape: starred Outputs keyed `${slug}:${id}` so a star is
 * Project-exact (a bare token number collides across Projects). PRIVATE,
 * account-backed via the settings envelope (`starred`).
 *
 * Persistence protocol lives in createPinStore (2026-07-06 factory — this
 * file keeps its exact public API as thin wrappers).
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringSet } from './createPinStore';

const store = createPinStore<Set<string>>({
    storageKey: STATE_CACHE_KEYS.starred,
    empty: () => new Set(),
    // Only composite `slug:id` keys; the legacy bare-number key
    // `pd_starred_ids` was never migrated (no slug — a one-time reset).
    decode: (parsed) => decodeStringSet(parsed, (k) => k.includes(':')),
    encode: (keys) => Array.from(keys),
    push: (encoded) => pushSettings({ starred: encoded as string[] }),
});

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

export type ToggleStarResult = 'starred' | 'unstarred';

/** Snapshot of currently starred keys (`${slug}:${id}`). */
export function getStarredKeys(): ReadonlySet<string> {
    return store.get();
}

/** Parsed (slug, id) pairs — for the Starred gallery. Insertion-ordered. */
export function getStarredItems(): ReadonlyArray<{ slug: string; id: number }> {
    return Array.from(store.get()).map((k) => {
        const i = k.indexOf(':');
        return { slug: k.slice(0, i), id: Number(k.slice(i + 1)) };
    });
}

export function isStarred(slug: string, id: number): boolean {
    return store.get().has(keyOf(slug, id));
}

/**
 * Toggle the star state of an Output. Returns 'starred' (added) or 'unstarred'
 * (removed). Mirrors sim 5536-5551. Caller owns toast text + the icon class flip.
 */
export function toggleStar(slug: string, id: number): ToggleStarResult {
    const k = keyOf(slug, id);
    const next = new Set(store.get());
    if (next.has(k)) {
        next.delete(k);
        store.set(next);
        return 'unstarred';
    }
    next.add(k);
    store.set(next);
    return 'starred';
}

/** Subscribe to star set changes. Returns an unsubscribe function. */
export function subscribeStarred(cb: (keys: ReadonlySet<string>) => void): () => void {
    return store.subscribe(cb);
}
