'use client';

/*
 * artistStarStore — STARRED ARTISTS, the same pinned-artist set the Artists
 * A–Z list manages (`pd_artist_pinned`), surfaced as a third filter on the
 * +More → Starred list.
 *
 * Artists were already starrable in the Artists list (the ★ pin). This store
 * is the shared read/write layer so the Starred surface and the Artists list
 * stay in lockstep: a pin in either place shows in the other live, and an
 * unstar from Starred drops the pin in the Artists list.
 *
 * Stored as an ordered array of artist handles ("@brendon"), keyed by the same
 * cache key the Artists list uses. Account-backed via the settings envelope
 * (`artistStars`), like starStore. Cross-surface sync rides a custom event
 * (`pd:artist-stars-changed`) plus the shared login-hydration event.
 */

import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.artistStars;
export const ARTIST_STARS_CHANGED_EVENT = 'pd:artist-stars-changed';

type Listener = (names: readonly string[]) => void;

let names: string[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function loadFromCache(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    names = loadFromCache();
}

function persist(): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
        } catch {
            /* ignore */
        }
    }
    // Account write-through — no-op until an authed snapshot has hydrated.
    pushSettings({ artistStars: [...names] });
}

function emit(): void {
    const snap = [...names];
    listeners.forEach((l) => l(snap));
}

/* Re-read on login (server snapshot) and on a cross-surface change from the
   Artists list. Neither path re-dispatches, so there's no loop. */
if (typeof window !== 'undefined') {
    const reload = () => {
        hydrated = true;
        names = loadFromCache();
        emit();
    };
    window.addEventListener(USERSTATE_HYDRATED_EVENT, reload);
    window.addEventListener(ARTIST_STARS_CHANGED_EVENT, reload);
}

/** Ordered list of starred artist handles ("@name"). */
export function getArtistStars(): readonly string[] {
    hydrate();
    return names;
}

export function isArtistStarred(name: string): boolean {
    hydrate();
    return names.includes(name);
}

/** Remove an artist from the starred set (the only mutation the Starred surface
 *  needs — adding happens by pinning in the Artists list). Writes through and
 *  notifies the Artists list to re-read. */
export function removeArtistStar(name: string): void {
    hydrate();
    if (!names.includes(name)) return;
    names = names.filter((n) => n !== name);
    persist();
    emit();
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(ARTIST_STARS_CHANGED_EVENT));
    }
}

/** Toggle an artist's star (used by long-press on an artist's profile name).
 *  Mirrors removeArtistStar's write-through + cross-surface notify. */
export function toggleArtistStar(name: string): 'starred' | 'removed' {
    hydrate();
    if (names.includes(name)) { removeArtistStar(name); return 'removed'; }
    names = [...names, name];
    persist();
    emit();
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(ARTIST_STARS_CHANGED_EVENT));
    }
    return 'starred';
}

export function subscribeArtistStars(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
