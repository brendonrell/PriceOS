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
 * Persistence: ACCOUNT-BACKED (Brendon, 2026-06-15 — "it's a db thing, not
 * localstore"). Writes through to the server `users.showcase` column (the same
 * 6-slot column visitors render) via userState.pushState, and re-hydrates from
 * it on login (USERSTATE_HYDRATED_EVENT). localStorage `pd_user_showcase` is the
 * write-through cache so the UI is instant + works logged-out. The showcase is
 * exactly 6 slots, so picks cap at 6.
 *
 * Toast text lives in the caller (no ToastContext in the store).
 */

import type { Showcase, ShowcaseSlot } from '../supabase';
import { pushState, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';
import { getProject } from '../project/registry';

const STORAGE_KEY = STATE_CACHE_KEYS.showcase;
const MAX_SLOTS = 6;

type Listener = (keys: ReadonlySet<string>) => void;

let keys: Set<string> = new Set();
let hydrated = false;
const listeners = new Set<Listener>();

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

/* A pick only counts if its Project still exists in the registry — the SAME
   filter the showcase grid uses to render. A stale key (a project that was
   later renamed/removed) renders as an empty frame, so it must NOT eat a slot
   or the cap wrongly reads "full" while a frame sits open (Brendon 2026-06-19). */
function keyRenders(k: string): boolean {
    const i = k.indexOf(':');
    if (i < 0) return false;
    return getProject(k.slice(0, i)) != null;
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
                if (typeof k === 'string' && k.includes(':') && keyRenders(k)) out.add(k);
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

/** Map the picks (first 6, insertion order) to the DB's 6-slot showcase shape. */
function keysToShowcase(): Showcase {
    const items = Array.from(keys).slice(0, MAX_SLOTS);
    const slots = Array.from({ length: MAX_SLOTS }, (_, i): ShowcaseSlot | null => {
        const k = items[i];
        if (!k) return null;
        const j = k.indexOf(':');
        return { project_id: k.slice(0, j), token_id: k.slice(j + 1) };
    });
    return { slots } as Showcase;
}

function persist(): void {
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(keys)));
        } catch {
            /* ignore */
        }
    }
    // Write through to the account (users.showcase). pushState is a no-op until
    // an authed snapshot has hydrated, so a logged-out pick never tries to write.
    pushState({ showcase: keysToShowcase() });
}

/* Server snapshot landed (login / sibling device) — re-read the cache userState
   just wrote and refresh live subscribers. Mirrors presetStore's hydrate hook. */
if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        keys = loadFromCache();
        hydrated = true;
        emit();
    });
}

function emit(): void {
    const snapshot: ReadonlySet<string> = new Set(keys);
    listeners.forEach((l) => l(snapshot));
}

export type ToggleShowcaseResult = 'added' | 'removed' | 'full';

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

/** Toggle an Output in the user's showcase. Returns 'added', 'removed', or
 *  'full' when already at the 6-slot cap. */
export function toggleShowcase(slug: string, id: number): ToggleShowcaseResult {
    hydrate();
    const k = keyOf(slug, id);
    if (keys.has(k)) {
        keys.delete(k);
        persist();
        emit();
        return 'removed';
    }
    if (keys.size >= MAX_SLOTS) return 'full';
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
