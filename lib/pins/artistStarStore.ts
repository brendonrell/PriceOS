'use client';

/*
 * artistStarStore — STARRED ARTISTS, the same pinned-artist set the Artists
 * A–Z list manages (`pd_artist_pinned`), surfaced as a filter on the
 * +More → Starred list.
 *
 * Artists were already starrable in the Artists list (the ★ pin). This store
 * is the shared read/write layer so the Starred surface and the Artists list
 * stay in lockstep: a pin in either place shows in the other live, and an
 * unstar from Starred drops the pin in the Artists list.
 *
 * Stored as an ordered array of artist handles ("@brendon"), keyed by the same
 * cache key the Artists list uses. Account-backed via the settings envelope
 * (`artistStars`). Cross-surface sync rides a custom event
 * (`pd:artist-stars-changed`) plus the shared login-hydration event — the
 * factory reloads on both; neither path re-dispatches, so there's no loop.
 *
 * Persistence protocol lives in createPinStore (2026-07-06 factory).
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringList } from './createPinStore';

export const ARTIST_STARS_CHANGED_EVENT = 'pd:artist-stars-changed';

const store = createPinStore<string[]>({
    storageKey: STATE_CACHE_KEYS.artistStars,
    empty: () => [],
    decode: decodeStringList,
    encode: (names) => [...names],
    push: (encoded) => pushSettings({ artistStars: encoded as string[] }),
    extraReloadEvents: [ARTIST_STARS_CHANGED_EVENT],
});

function notifyCrossSurface(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(ARTIST_STARS_CHANGED_EVENT));
    }
}

/** Ordered list of starred artist handles ("@name"). */
export function getArtistStars(): readonly string[] {
    return store.get();
}

export function isArtistStarred(name: string): boolean {
    return store.get().includes(name);
}

/** Remove an artist from the starred set (the only mutation the Starred surface
 *  needs — adding happens by pinning in the Artists list). Writes through and
 *  notifies the Artists list to re-read. */
export function removeArtistStar(name: string): void {
    const cur = store.get();
    if (!cur.includes(name)) return;
    store.set(cur.filter((n) => n !== name));
    notifyCrossSurface();
}

/** Toggle an artist's star (used by long-press on an artist's profile name).
 *  Mirrors removeArtistStar's write-through + cross-surface notify. */
export function toggleArtistStar(name: string): 'starred' | 'removed' {
    const cur = store.get();
    if (cur.includes(name)) { removeArtistStar(name); return 'removed'; }
    store.set([...cur, name]);
    notifyCrossSurface();
    return 'starred';
}

export function subscribeArtistStars(cb: (names: readonly string[]) => void): () => void {
    return store.subscribe(cb);
}
