'use client';

/*
 * createPinStore — the ONE implementation of the pin-store persistence
 * protocol (2026-07-06 tech-debt factory; replaces seven hand-cloned copies
 * of the same skeleton across the lib/pins star/wishlist family).
 *
 * The protocol, verbatim from the originals:
 *   - module-singleton state, lazy-hydrated from the localStorage cache on
 *     first read (SSR-safe: no window → empty state);
 *   - persist() = write-through to localStorage (best-effort; quota/private
 *     mode ignored) + pushSettings() into the account settings envelope —
 *     which is a no-op until an authed snapshot has hydrated, so logged-out
 *     changes stay on-device and never clobber the account;
 *   - subscribers get the current state after every change;
 *   - on USERSTATE_HYDRATED_EVENT (login on any device) the store re-reads
 *     the cache userState just overwrote with the account's values and
 *     refreshes subscribers — that's what makes a second device come up
 *     "exactly as you left it".
 *
 * Stores keep their exact public APIs as thin wrappers over an instance;
 * ops MUST treat state as immutable (clone-and-set), so every emit hands
 * subscribers a fresh reference.
 */

import { USERSTATE_HYDRATED_EVENT } from '../state/userState';

export interface PinStore<T> {
    /** Current state (hydrating on first call). Treat as read-only. */
    get(): T;
    /** Replace state, persist (cache + envelope) and notify subscribers. */
    set(next: T): void;
    /** Subscribe to changes. Returns the unsubscribe function. */
    subscribe(cb: (state: T) => void): () => void;
}

export function createPinStore<T>(opts: {
    /** localStorage cache key (one of STATE_CACHE_KEYS). */
    storageKey: string;
    /** Fresh empty state. */
    empty: () => T;
    /** Parse the raw JSON.parse()d cache value into state. Must tolerate any
     *  shape (bad JSON is already caught outside) and never throw. */
    decode: (parsed: unknown) => T;
    /** State → the JSON value written to the cache AND the envelope. */
    encode: (state: T) => unknown;
    /** Merge the encoded value into the settings envelope (a pushSettings
     *  call with this store's envelope key). */
    push: (encoded: unknown) => void;
    /** Extra window events that should trigger a cache re-read + emit
     *  (e.g. a legacy cross-surface changed event). */
    extraReloadEvents?: readonly string[];
}): PinStore<T> {
    let state: T = opts.empty();
    let hydrated = false;
    const listeners = new Set<(state: T) => void>();

    function loadFromCache(): T {
        if (typeof window === 'undefined') return opts.empty();
        try {
            const raw = window.localStorage.getItem(opts.storageKey);
            if (!raw) return opts.empty();
            return opts.decode(JSON.parse(raw));
        } catch {
            /* ignore — bad JSON, quota, private mode */
            return opts.empty();
        }
    }

    function hydrate(): void {
        if (hydrated) return;
        hydrated = true;
        state = loadFromCache();
    }

    function persist(): void {
        const encoded = opts.encode(state);
        if (typeof window !== 'undefined') {
            try {
                window.localStorage.setItem(opts.storageKey, JSON.stringify(encoded));
            } catch {
                /* ignore */
            }
        }
        opts.push(encoded);
    }

    function emit(): void {
        listeners.forEach((l) => l(state));
    }

    if (typeof window !== 'undefined') {
        const reload = () => {
            hydrated = true;
            state = loadFromCache();
            emit();
        };
        window.addEventListener(USERSTATE_HYDRATED_EVENT, reload);
        for (const ev of opts.extraReloadEvents ?? []) {
            window.addEventListener(ev, reload);
        }
    }

    return {
        get(): T {
            hydrate();
            return state;
        },
        set(next: T): void {
            hydrate();
            state = next;
            persist();
            emit();
        },
        subscribe(cb: (state: T) => void): () => void {
            hydrate();
            listeners.add(cb);
            return () => {
                listeners.delete(cb);
            };
        },
    };
}

/** Shared decoder: a JSON array of strings, filtered by a per-store guard. */
export function decodeStringSet(parsed: unknown, accept: (k: string) => boolean): Set<string> {
    const out = new Set<string>();
    if (Array.isArray(parsed)) {
        parsed.forEach((k) => {
            if (typeof k === 'string' && accept(k)) out.add(k);
        });
    }
    return out;
}

/** Shared decoder: a JSON array of strings → ordered string[]. */
export function decodeStringList(parsed: unknown): string[] {
    return Array.isArray(parsed)
        ? parsed.filter((x): x is string => typeof x === 'string')
        : [];
}
