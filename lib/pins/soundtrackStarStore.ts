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
 * (`soundtrackStars`), same write-through + login-hydration as the other stars.
 */

import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.soundtrackStars;
const SEP = '|';

export interface SoundtrackStar {
    slug: string;
    playlistId: string;
    title: string;
}

type Listener = (keys: ReadonlySet<string>) => void;

let keys: Set<string> = new Set();
let hydrated = false;
const listeners = new Set<Listener>();

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

function loadFromCache(): Set<string> {
    const out = new Set<string>();
    if (typeof window === 'undefined') return out;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return out;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            parsed.forEach((k) => {
                if (typeof k === 'string' && parseKey(k)) out.add(k);
            });
        }
    } catch {
        /* ignore — bad JSON, quota, private mode */
    }
    return out;
}

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    keys = loadFromCache();
}

function persist(): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(keys)));
        } catch {
            /* ignore */
        }
    }
    pushSettings({ soundtrackStars: Array.from(keys) });
}

function emit(): void {
    const snapshot: ReadonlySet<string> = new Set(keys);
    listeners.forEach((l) => l(snapshot));
}

if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        keys = loadFromCache();
        emit();
    });
}

export type ToggleSoundtrackStarResult = 'starred' | 'unstarred';

/** Parsed starred soundtracks — for the Starred list. Insertion-ordered. */
export function getSoundtrackStarItems(): ReadonlyArray<SoundtrackStar> {
    hydrate();
    return Array.from(keys)
        .map(parseKey)
        .filter((s): s is SoundtrackStar => s != null);
}

/** A Project's soundtrack is starred? (membership is by slug — one per project) */
export function isSoundtrackStarred(slug: string): boolean {
    hydrate();
    for (const k of keys) if (k.slice(0, k.indexOf(SEP)) === slug) return true;
    return false;
}

/** Toggle a Project's soundtrack star. Caller owns the toast + float. */
export function toggleSoundtrackStar(
    slug: string,
    playlistId: string,
    title: string,
): ToggleSoundtrackStarResult {
    hydrate();
    // Remove any existing entry for this slug first (one soundtrack per project).
    let had = false;
    for (const k of Array.from(keys)) {
        if (k.slice(0, k.indexOf(SEP)) === slug) { keys.delete(k); had = true; }
    }
    if (had) {
        persist();
        emit();
        return 'unstarred';
    }
    keys.add(`${slug}${SEP}${playlistId}${SEP}${title}`);
    persist();
    emit();
    return 'starred';
}

export function subscribeSoundtrackStars(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
