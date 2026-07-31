'use client';

/*
 * wishlistStore — the profile +More → Wishlists surface.
 *
 * Wishlist is the "what I want to BUY" list — financially focused, distinct
 * from Starred (a neutral personal bookmark). Entries keyed `${slug}:${id}`.
 * PRIVATE + account-backed via the settings envelope (`wishlist`).
 *
 * Persistence protocol lives in createPinStore (2026-07-06 factory).
 */

import { playSound } from '../sound/engine';
import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringSet } from './createPinStore';

const store = createPinStore<Set<string>>({
    storageKey: STATE_CACHE_KEYS.wishlist,
    empty: () => new Set(),
    decode: (parsed) => decodeStringSet(parsed, (k) => k.includes(':')),
    encode: (keys) => Array.from(keys),
    push: (encoded) => pushSettings({ wishlist: encoded as string[] }),
});

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

export type ToggleWishlistResult = 'added' | 'removed';

/** Snapshot of currently wishlisted keys (`${slug}:${id}`). */
export function getWishlistKeys(): ReadonlySet<string> {
    return store.get();
}

/** Parsed (slug, id) pairs — for the Wishlist list. Insertion-ordered. */
export function getWishlistItems(): ReadonlyArray<{ slug: string; id: number }> {
    return Array.from(store.get()).map((k) => {
        const i = k.indexOf(':');
        return { slug: k.slice(0, i), id: Number(k.slice(i + 1)) };
    });
}

export function isWishlisted(slug: string, id: number): boolean {
    return store.get().has(keyOf(slug, id));
}

/** Toggle an Output's wishlist state. Caller owns the toast + icon flip. */
export function toggleWishlist(slug: string, id: number): ToggleWishlistResult {
    const k = keyOf(slug, id);
    const next = new Set(store.get());
    if (next.has(k)) {
        next.delete(k);
        store.set(next);
        return 'removed';
    }
    next.add(k);
    store.set(next);
    playSound('tuck'); // sound layer — onto your wishlist (no-op when off)
    return 'added';
}

export function subscribeWishlist(cb: (keys: ReadonlySet<string>) => void): () => void {
    return store.subscribe(cb);
}
