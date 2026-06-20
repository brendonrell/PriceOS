'use client';

/*
 * spiteStore — the Spite Book's saved list of names.
 *
 * Mirrors muteStore (lib/pins/muteStore.ts): a module-singleton list +
 * subscribe, persisted to localStorage. The Spite Book modal reads + writes
 * this list; a future cross-surface dimming pass (spited wallets render at
 * 20% with a strikethrough) will read the same list.
 *
 * State shape:
 *   names: string[]   — ordered, de-duped (case-insensitive), trimmed.
 *
 * Persistence: localStorage `pd_spite_names`. Written on every mutation.
 * Hydration is lazy — first read/subscribe pulls from storage. SSR stays
 * clean because every entry point runs inside a `'use client'` boundary.
 */

const STORAGE_KEY = 'pd_spite_names';
const MAX_LEN = 40; // a single name can't exceed this many chars

type Listener = (names: readonly string[]) => void;

let names: string[] = [];
let hydrated = false;
const listeners = new Set<Listener>();

function hydrate(): void {
    if (hydrated) return;
    hydrated = true;
    if (typeof window === 'undefined') return;
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            parsed.forEach((n) => {
                const s = typeof n === 'string' ? n.trim() : '';
                if (s) names.push(s.slice(0, MAX_LEN));
            });
        }
    } catch {
        /* ignore — bad JSON, quota, private mode */
    }
}

function persist(): void {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(names));
    } catch {
        /* ignore */
    }
}

function emit(): void {
    const snapshot = names.slice();
    listeners.forEach((l) => l(snapshot));
}

/** Snapshot of the current spite list. Triggers hydrate on first call. */
export function getSpiteNames(): readonly string[] {
    hydrate();
    return names;
}

/**
 * Add a name to the book. Trims, caps length, de-dupes case-insensitively.
 * Returns true if it was added, false if blank or already present.
 */
export function addSpiteName(raw: string): boolean {
    hydrate();
    const name = (raw || '').trim().slice(0, MAX_LEN);
    if (!name) return false;
    const lower = name.toLowerCase();
    if (names.some((n) => n.toLowerCase() === lower)) return false;
    names.push(name);
    persist();
    emit();
    return true;
}

/** Remove a name (exact, case-insensitive match). Returns true if removed. */
export function removeSpiteName(name: string): boolean {
    hydrate();
    const lower = (name || '').trim().toLowerCase();
    const idx = names.findIndex((n) => n.toLowerCase() === lower);
    if (idx === -1) return false;
    names.splice(idx, 1);
    persist();
    emit();
    return true;
}

/** Subscribe to list changes. Returns an unsubscribe function. */
export function subscribeSpite(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
