'use client';

/*
 * starStore — chat #6 D010-star (Card hover overlay icons) + the profile
 * Starred sub-tab.
 *
 * Sim refs:
 *   sim.html 5536-5551    toggleStar handler (DOM-attribute toggle in sim)
 *   sim.html 8045         hi-icon onclick="toggleStar(event, this)"
 *
 * Why a module store and not pure DOM-attribute toggle:
 *   Sim's toggleStar reads/writes data-starred + .active-star directly on
 *   the icon span. That breaks under React + Build 35 virtualization — every
 *   card unmount/remount loses DOM-only state. A module-singleton store +
 *   per-card subscription gives the same end state and survives remount +
 *   cross-surface reads. Same pattern as grailStore + muteStore.
 *
 * State shape:
 *   keys: Set<string>  — starred Outputs, keyed `${slug}:${id}` so a star is
 *   Project-exact. A bare token number collides across Projects (Prisms #5 vs
 *   Oracle #5), and the profile Starred tab spans every Project the viewer has
 *   starred from — so the slug must ride along to render + de-dupe correctly.
 *
 * Persistence: localStorage `pd_starred` (device-local). Stars are PRIVATE
 * (Platform Nomenclature lock), so they are the VIEWER's own set, shown only on
 * their own profile. Account-backed (follow-you-across-devices) is a later step.
 * The legacy bare-number key `pd_starred_ids` is intentionally not migrated —
 * those entries carry no slug, so they can't be placed in a Project; a one-time
 * reset, not data loss.
 *
 * Toast text ("STARRED #22" / "UNSTARRED #22") lives in the caller, same
 * reasoning as grailStore + muteStore — keeps the store free of ToastContext.
 */

import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.starred;

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
                // Only accept composite `slug:id` strings; skip anything else.
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
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(keys)));
        } catch {
            /* ignore */
        }
    }
    // Account write-through — stars ride in the settings envelope. No-op until an
    // authed snapshot has hydrated (userState guards this), so a logged-out star
    // stays on-device and never clobbers the account.
    pushSettings({ starred: Array.from(keys) });
}

function emit(): void {
    const snapshot: ReadonlySet<string> = new Set(keys);
    listeners.forEach((l) => l(snapshot));
}

/* Server snapshot landed (login on any device) — re-read the cache userState
   just overwrote with the account's stars and refresh subscribers. */
if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        keys = loadFromCache();
        emit();
    });
}

export type ToggleStarResult = 'starred' | 'unstarred';

/** Snapshot of currently starred keys (`${slug}:${id}`). Triggers hydrate. */
export function getStarredKeys(): ReadonlySet<string> {
    hydrate();
    return keys;
}

/** Parsed (slug, id) pairs — for the Starred gallery. Insertion-ordered. */
export function getStarredItems(): ReadonlyArray<{ slug: string; id: number }> {
    hydrate();
    return Array.from(keys).map((k) => {
        const i = k.indexOf(':');
        return { slug: k.slice(0, i), id: Number(k.slice(i + 1)) };
    });
}

export function isStarred(slug: string, id: number): boolean {
    hydrate();
    return keys.has(keyOf(slug, id));
}

/**
 * Toggle the star state of an Output. Returns 'starred' (added) or 'unstarred'
 * (removed). Mirrors sim 5536-5551. Caller owns toast text + the icon class flip.
 */
export function toggleStar(slug: string, id: number): ToggleStarResult {
    hydrate();
    const k = keyOf(slug, id);
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

/**
 * Subscribe to star set changes. Returns an unsubscribe function. Listener
 * receives a fresh snapshot Set of keys, never the live one.
 */
export function subscribeStarred(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
