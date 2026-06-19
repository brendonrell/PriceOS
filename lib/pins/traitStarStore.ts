'use client';

/*
 * traitStarStore — STARRED TRAITS (the +More → Starred "Traits" surface).
 *
 * A starred trait is a (Project, trait category, trait value) tuple — e.g.
 * Prisms · Palette · Hothurt. You long-press a trait value pill on a Project
 * page to favourite it; it then shows as its own row in your Starred list with
 * a "Trait Offer" action (offer flow lands later).
 *
 * Same module-singleton + localStorage + account-envelope pattern as
 * starStore / wishlistStore — the only difference is the composite key carries
 * three parts. Keys are `${slug}|${category}|${value}` (none of those parts
 * contain a pipe), parsed back by walking the first two separators so a value
 * with a stray pipe still round-trips.
 *
 * PRIVATE (owner-only), account-backed via the settings envelope (`traitStars`)
 * so starred traits follow the viewer across devices, exactly like starred
 * Outputs.
 */

import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.traitStars;
const SEP = '|';

export interface TraitStar {
    slug: string;
    category: string;
    value: string;
}

type Listener = (keys: ReadonlySet<string>) => void;

let keys: Set<string> = new Set();
let hydrated = false;
const listeners = new Set<Listener>();

function keyOf(slug: string, category: string, value: string): string {
    return `${slug}${SEP}${category}${SEP}${value}`;
}

function parseKey(k: string): TraitStar | null {
    const i1 = k.indexOf(SEP);
    if (i1 < 0) return null;
    const i2 = k.indexOf(SEP, i1 + 1);
    if (i2 < 0) return null;
    return {
        slug: k.slice(0, i1),
        category: k.slice(i1 + 1, i2),
        value: k.slice(i2 + 1),
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
                // Only accept composite keys with both separators present.
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
    // Account write-through — rides the settings envelope. No-op until an authed
    // snapshot has hydrated (userState guards this), so a logged-out star stays
    // on-device and never clobbers the account.
    pushSettings({ traitStars: Array.from(keys) });
}

function emit(): void {
    const snapshot: ReadonlySet<string> = new Set(keys);
    listeners.forEach((l) => l(snapshot));
}

/* Server snapshot landed (login on any device) — re-read the cache userState
   just overwrote with the account's trait stars and refresh subscribers. */
if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        keys = loadFromCache();
        emit();
    });
}

export type ToggleTraitStarResult = 'starred' | 'unstarred';

/** Snapshot of currently starred trait keys. */
export function getTraitStarKeys(): ReadonlySet<string> {
    hydrate();
    return keys;
}

/** Parsed starred traits — for the Starred list. Insertion-ordered. */
export function getTraitStarItems(): ReadonlyArray<TraitStar> {
    hydrate();
    return Array.from(keys)
        .map(parseKey)
        .filter((t): t is TraitStar => t != null);
}

export function isTraitStarred(slug: string, category: string, value: string): boolean {
    hydrate();
    return keys.has(keyOf(slug, category, value));
}

/** Toggle a trait's star state. Caller owns the toast + the float animation. */
export function toggleTraitStar(
    slug: string,
    category: string,
    value: string,
): ToggleTraitStarResult {
    hydrate();
    const k = keyOf(slug, category, value);
    if (keys.has(k)) {
        keys.delete(k);
        persist();
        emit();
        return 'unstarred';
    }
    keys.add(k);
    persist();
    emit();
    return 'starred';
}

export function traitStarKey(slug: string, category: string, value: string): string {
    return keyOf(slug, category, value);
}

export function subscribeTraitStarred(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
