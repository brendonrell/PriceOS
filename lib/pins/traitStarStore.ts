'use client';

/*
 * traitStarStore — STARRED TRAITS (the +More → Starred "Traits" surface +
 * the long-press star on trait value pills). A star is a (Project, category,
 * value) tuple.
 *
 * Key format: `${slug}|${category}|${value}` — slug + category never contain
 * a pipe; value is the remainder. PRIVATE, account-backed via the settings
 * envelope (`traitStars`). Persistence protocol lives in createPinStore
 * (2026-07-06 factory).
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringSet } from './createPinStore';

const SEP = '|';

export interface TraitStar {
    slug: string;
    category: string;
    value: string;
}

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

const store = createPinStore<Set<string>>({
    storageKey: STATE_CACHE_KEYS.traitStars,
    empty: () => new Set(),
    decode: (parsed) => decodeStringSet(parsed, (k) => parseKey(k) != null),
    encode: (keys) => Array.from(keys),
    push: (encoded) => pushSettings({ traitStars: encoded as string[] }),
});

export type ToggleTraitStarResult = 'starred' | 'unstarred';

/** Snapshot of currently starred trait keys. */
export function getTraitStarKeys(): ReadonlySet<string> {
    return store.get();
}

/** Parsed starred traits — for the Starred list. Insertion-ordered. */
export function getTraitStarItems(): ReadonlyArray<TraitStar> {
    return Array.from(store.get())
        .map(parseKey)
        .filter((t): t is TraitStar => t != null);
}

export function isTraitStarred(slug: string, category: string, value: string): boolean {
    return store.get().has(keyOf(slug, category, value));
}

/** Toggle a trait's star state. Caller owns the toast + the float animation. */
export function toggleTraitStar(
    slug: string,
    category: string,
    value: string,
): ToggleTraitStarResult {
    const k = keyOf(slug, category, value);
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

export function traitStarKey(slug: string, category: string, value: string): string {
    return keyOf(slug, category, value);
}

export function subscribeTraitStarred(cb: (keys: ReadonlySet<string>) => void): () => void {
    return store.subscribe(cb);
}
