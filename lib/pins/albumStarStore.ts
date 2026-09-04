'use client';

/*
 * albumStarStore — STARRED ALBUMS (the +More → Starred "Albums" surface).
 * Long-press an album's label on its cover tile to favourite it — same
 * gesture as Project, Output and PriceDay names. Albums are public
 * (2026-08-02), so this stars ANY album on PD, not just your own.
 *
 * Keyed `${ownerAddress}:${albumId}` — album ids are already globally
 * unique (Date.now + random suffix), but the owner prefix keeps this
 * store shaped like starStore's composite keys and makes a starred row
 * resolvable back to a profile without a lookup table.
 *
 * Persistence protocol lives in createPinStore (2026-07-06 factory).
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringSet } from './createPinStore';

const store = createPinStore<Set<string>>({
    storageKey: STATE_CACHE_KEYS.albumStars,
    empty: () => new Set(),
    decode: (parsed) => decodeStringSet(parsed, (k) => k.includes(':')),
    encode: (keys) => Array.from(keys),
    push: (encoded) => pushSettings({ albumStars: encoded as string[] }),
});

export type ToggleAlbumStarResult = 'starred' | 'unstarred';

function keyOf(ownerAddress: string, albumId: string): string {
    return `${ownerAddress.toLowerCase()}:${albumId}`;
}

/** Parsed (ownerAddress, albumId) pairs — for the Starred gallery. */
export function getAlbumStarItems(): ReadonlyArray<{ ownerAddress: string; albumId: string }> {
    return Array.from(store.get()).map((k) => {
        const i = k.indexOf(':');
        return { ownerAddress: k.slice(0, i), albumId: k.slice(i + 1) };
    });
}

export function isAlbumStarred(ownerAddress: string, albumId: string): boolean {
    return store.get().has(keyOf(ownerAddress, albumId));
}

/** Toggle an Album's star. Caller owns the toast + float. */
export function toggleAlbumStar(ownerAddress: string, albumId: string): ToggleAlbumStarResult {
    const k = keyOf(ownerAddress, albumId);
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

export function subscribeAlbumStars(cb: (keys: ReadonlySet<string>) => void): () => void {
    return store.subscribe(cb);
}
