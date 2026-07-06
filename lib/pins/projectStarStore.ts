'use client';

/*
 * projectStarStore — STARRED PROJECTS (the +More → Starred "Projects" surface).
 * Long-press a Project's name on its page to favourite it; it shows as its own
 * row in Starred with a "View Project" action.
 *
 * Keyed by Project slug (one entry per project), ordered. Account-backed via
 * the settings envelope (`projectStars`).
 *
 * Persistence protocol lives in createPinStore (2026-07-06 factory).
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringList } from './createPinStore';

const store = createPinStore<string[]>({
    storageKey: STATE_CACHE_KEYS.projectStars,
    empty: () => [],
    decode: decodeStringList,
    encode: (slugs) => [...slugs],
    push: (encoded) => pushSettings({ projectStars: encoded as string[] }),
});

export type ToggleProjectStarResult = 'starred' | 'unstarred';

/** Ordered list of starred Project slugs. */
export function getProjectStars(): readonly string[] {
    return store.get();
}

export function isProjectStarred(slug: string): boolean {
    return store.get().includes(slug);
}

/** Toggle a Project's star. Caller owns the toast + float. */
export function toggleProjectStar(slug: string): ToggleProjectStarResult {
    const cur = store.get();
    if (cur.includes(slug)) {
        store.set(cur.filter((s) => s !== slug));
        return 'unstarred';
    }
    store.set([...cur, slug]);
    return 'starred';
}

/** Remove (used by the Starred list's unstar / multi-select). */
export function removeProjectStar(slug: string): void {
    const cur = store.get();
    if (!cur.includes(slug)) return;
    store.set(cur.filter((s) => s !== slug));
}

export function subscribeProjectStars(cb: (slugs: readonly string[]) => void): () => void {
    return store.subscribe(cb);
}
