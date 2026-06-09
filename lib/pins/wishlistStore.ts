'use client';

/*
 * wishlistStore — the profile +More → Wishlists surface.
 *
 * Wishlist is the "what I want to BUY" list — financially focused, distinct from
 * Starred (a neutral personal bookmark). Same module-singleton + composite-key
 * shape as starStore: entries keyed `${slug}:${id}` so the same token number
 * across Projects never collides.
 *
 * Wishlist is PRIVATE (Platform Nomenclature lock) and ACCOUNT-BACKED: it rides
 * in the settings envelope (never returned by the public profile read), with the
 * same write-through + login-hydration pattern as starStore / presetStore.
 * localStorage `pd_wishlist` is the device cache; the server row wins on login.
 */

import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const STORAGE_KEY = STATE_CACHE_KEYS.wishlist;

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
    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(keys)));
        } catch {
            /* ignore */
        }
    }
    // Account write-through — wishlist rides in the settings envelope. No-op until
    // an authed snapshot has hydrated, so a logged-out add stays on-device.
    pushSettings({ wishlist: Array.from(keys) });
}

function emit(): void {
    const snapshot: ReadonlySet<string> = new Set(keys);
    listeners.forEach((l) => l(snapshot));
}

/* Server snapshot landed (login on any device) — re-read the cache userState
   just overwrote with the account's wishlist and refresh subscribers. */
if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        hydrated = true;
        keys = loadFromCache();
        emit();
    });
}

export type ToggleWishlistResult = 'added' | 'removed';

/** Snapshot of currently wishlisted keys (`${slug}:${id}`). */
export function getWishlistKeys(): ReadonlySet<string> {
    hydrate();
    return keys;
}

/** Parsed (slug, id) pairs — for the Wishlist list. Insertion-ordered. */
export function getWishlistItems(): ReadonlyArray<{ slug: string; id: number }> {
    hydrate();
    return Array.from(keys).map((k) => {
        const i = k.indexOf(':');
        return { slug: k.slice(0, i), id: Number(k.slice(i + 1)) };
    });
}

export function isWishlisted(slug: string, id: number): boolean {
    hydrate();
    return keys.has(keyOf(slug, id));
}

/** Toggle an Output's wishlist state. Caller owns the toast + icon flip. */
export function toggleWishlist(slug: string, id: number): ToggleWishlistResult {
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

export function subscribeWishlist(cb: Listener): () => void {
    hydrate();
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
