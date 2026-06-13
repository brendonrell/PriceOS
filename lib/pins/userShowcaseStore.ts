'use client';

/*
 * userShowcaseStore — the "Add to Your Showcase" action (Brendon 2026-06-13).
 *
 * The User Showcase is the set of Outputs a user pins to their OWN profile
 * showcase grid. Same module-singleton + per-surface subscription pattern as
 * starStore / grailStore.
 *
 * State shape:
 *   keys: Set<string>  — keyed `${slug}:${id}` so a pick is Project-exact (a
 *   bare token number collides across Projects). The showcase spans every
 *   Project the user has picked from.
 *
 * Persistence: localStorage `pd_user_showcase` (device-local for now;
 * account-backing can follow starStore's envelope pattern later). The showcase
 * grid that renders these picks is a separate surface — this store is the
 * Add-to-Showcase action's source of truth.
 *
 * Toast text lives in the caller (no ToastContext in the store).
 */

const STORAGE_KEY = 'pd_user_showcase';

type Listener = (keys: ReadonlySet<string>) => void;

let keys: Set<string> = new Set();
let hydrated = false;
const listeners = new Set<Listener>();

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
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
                if (typeof k === 'string' && k.includes(':')) out.add(k);
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
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(keys)));
    } catch {
        /* ignore */
    }
}

function emit(): void {
    const snapshot: ReadonlySet<string> = new Set(keys);
    listeners.forEach((l) => l(snapshot));
}

export type ToggleShowcaseResult = 'added' | 'removed';

/** Snapshot of showcase keys (`${slug}:${id}`). Triggers hydrate. */
export function getShowcaseKeys(): ReadonlySet<string> {
    hydrate();
    return keys;
}

/** Parsed (slug, id) pairs — for the showcase grid. Insertion-ordered. */
export function getShowcaseItems(): ReadonlyArray<{ slug: string; id: number }> {
    hydrate();
    return Array.from(keys).map((k) => {
        const i = k.indexOf(':');
        return { slug: k.slice(0, i), id: Number(k.slice(i + 1)) };
    });
}

export function isInShowcase(slug: string, id: number): boolean {
    hydrate();
    return keys.has(keyOf(slug, id));
}

/** Toggle an Output in the user's showcase. Returns 'added' or 'removed'. */
export function toggleShowcase(slug: string, id: number): ToggleShowcaseResult {
    hydrate();
    const k = keyOf(slug, id);
    if (keys.has(k)) {
        keys.delete(k);
        persist();
        emit();
        return 'removed';
    }
    keys.add(k);
    persist();
    emit();
    return 'added';
}

/** Subscribe to showcase changes. Returns an unsubscribe function. */
export function subscribeShowcase(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
