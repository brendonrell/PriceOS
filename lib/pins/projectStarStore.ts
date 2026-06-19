'use client';

/*
 * projectStarStore — STARRED PROJECTS (the +More → Starred "Projects" surface).
 * Long-press a Project's name on its page to favourite it; it shows as its own
 * row in Starred with a "View Project" action. Works like the soundtrack/trait
 * stars.
 *
 * Keyed by Project slug (one entry per project). Display name comes from the
 * registry at render time, so the store only needs the slug — an ordered list,
 * same shape as artistStarStore. Account-backed via the settings envelope
 * (`projectStars`), same write-through + login-hydration as the other stars.
 */

import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.projectStars;

type Listener = (slugs: readonly string[]) => void;

let slugs: string[] = [];
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
    slugs = loadFromCache();
}

function persist(): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
        } catch {
            /* ignore */
        }
    }
    pushSettings({ projectStars: [...slugs] });
}

function emit(): void {
    const snap = [...slugs];
    listeners.forEach((l) => l(snap));
}

if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        slugs = loadFromCache();
        emit();
    });
}

export type ToggleProjectStarResult = 'starred' | 'unstarred';

/** Ordered list of starred Project slugs. */
export function getProjectStars(): readonly string[] {
    hydrate();
    return slugs;
}

export function isProjectStarred(slug: string): boolean {
    hydrate();
    return slugs.includes(slug);
}

/** Toggle a Project's star. Caller owns the toast + float. */
export function toggleProjectStar(slug: string): ToggleProjectStarResult {
    hydrate();
    if (slugs.includes(slug)) {
        slugs = slugs.filter((s) => s !== slug);
        persist();
        emit();
        return 'unstarred';
    }
    slugs = [...slugs, slug];
    persist();
    emit();
    return 'starred';
}

/** Remove (used by the Starred list's unstar / multi-select). */
export function removeProjectStar(slug: string): void {
    hydrate();
    if (!slugs.includes(slug)) return;
    slugs = slugs.filter((s) => s !== slug);
    persist();
    emit();
}

export function subscribeProjectStars(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
