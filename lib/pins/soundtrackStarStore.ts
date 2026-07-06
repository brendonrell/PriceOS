'use client';

/*
 * soundtrackStarStore — STARRED SOUNDTRACKS (the +More → Starred "Soundtracks"
 * surface). Works exactly like the trait/artist stars, but for a Project's
 * YouTube-playlist soundtrack.
 *
 * The soundtrack link is DB-driven (not in the static registry), so — unlike
 * Output/trait stars — we capture the playlist id AND the display title AT
 * STAR-TIME and persist them in the key, so the Starred row can render the
 * title and the Listen link without re-deriving DB state.
 *
 * Key format: `${slug}|${playlistId}|${title}` — slug + playlistId never
 * contain a pipe; title is the remainder (parsed off the 2nd separator, so it
 * may contain anything). One soundtrack per Project, so membership is by slug.
 *
 * PRIVATE (owner-only), account-backed via the settings envelope
 * (`soundtrackStars`). Persistence protocol lives in createPinStore
 * (2026-07-06 factory).
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringSet } from './createPinStore';

const SEP = '|';

export interface SoundtrackStar {
    slug: string;
    playlistId: string;
    title: string;
}

function parseKey(k: string): SoundtrackStar | null {
    const i1 = k.indexOf(SEP);
    if (i1 < 0) return null;
    const i2 = k.indexOf(SEP, i1 + 1);
    if (i2 < 0) return null;
    return {
        slug: k.slice(0, i1),
        playlistId: k.slice(i1 + 1, i2),
        title: k.slice(i2 + 1),
    };
}

const store = createPinStore<Set<string>>({
    storageKey: STATE_CACHE_KEYS.soundtrackStars,
    empty: () => new Set(),
    decode: (parsed) => decodeStringSet(parsed, (k) => parseKey(k) != null),
    encode: (keys) => Array.from(keys),
    push: (encoded) => pushSettings({ soundtrackStars: encoded as string[] }),
});

export type ToggleSoundtrackStarResult = 'starred' | 'unstarred';

/** Parsed starred soundtracks — for the Starred list. Insertion-ordered. */
export function getSoundtrackStarItems(): ReadonlyArray<SoundtrackStar> {
    return Array.from(store.get())
        .map(parseKey)
        .filter((s): s is SoundtrackStar => s != null);
}

/** A Project's soundtrack is starred? (membership is by slug — one per project) */
export function isSoundtrackStarred(slug: string): boolean {
    for (const k of store.get()) if (k.slice(0, k.indexOf(SEP)) === slug) return true;
    return false;
}

/** Toggle a Project's soundtrack star. Caller owns the toast + float. */
export function toggleSoundtrackStar(
    slug: string,
    playlistId: string,
    title: string,
): ToggleSoundtrackStarResult {
    const next = new Set(store.get());
    // Remove any existing entry for this slug first (one soundtrack per project).
    let had = false;
    for (const k of Array.from(next)) {
        if (k.slice(0, k.indexOf(SEP)) === slug) { next.delete(k); had = true; }
    }
    if (had) {
        store.set(next);
        return 'unstarred';
    }
    next.add(`${slug}${SEP}${playlistId}${SEP}${title}`);
    store.set(next);
    return 'starred';
}

export function subscribeSoundtrackStars(cb: (keys: ReadonlySet<string>) => void): () => void {
    return store.subscribe(cb);
}
