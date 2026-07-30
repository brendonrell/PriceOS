'use client';

/*
 * warmCache — the ONE way a sliding panel gets its content before it opens.
 *
 * ⛔ WHY THIS EXISTS (Brendon, 2026-07-30: "it's clearly the content loading
 * the first time… make sure all sliding modals get the fix"). Every panel of
 * the house slide-up style started its reads when it OPENED, so the first open
 * sat on the network showing a loading line and then re-laid itself out when
 * the data landed. That double beat is the hitch, and it never repeated —
 * which is exactly why it always read as "only the first time".
 *
 * The shape, lifted from the keychain rack cache (Rule #0): one entry per key,
 * one in-flight request per key, listeners for anything already mounted, and
 * an idle warm-up so a panel's read never competes with the page it sits on.
 *
 * A panel then does two things: seed its state from `read()` synchronously so
 * an open paints finished content in the same frame, and call `warmIdle()`
 * from the mounted component so the read has already happened by then.
 */

export interface WarmCache<T> {
    /** What a panel can paint right now, or null if never read. */
    read(key: string | null | undefined): T | null;
    /** Fetch once per key. Repeat callers join the request in flight. */
    warm(key: string | null | undefined): Promise<T | null>;
    /** Warm when the browser has nothing better to do. */
    warmIdle(key: string | null | undefined): void;
    /** Anything mounted re-reads when an entry lands. */
    subscribe(cb: () => void): () => void;
    /** Drop an entry after a write that could change it. */
    bust(key: string | null | undefined): void;
    /** Re-read in the background while the cached copy stays on screen. The
     *  panel paints instantly from `read()` and quietly updates if anything
     *  moved — so a purchase made this session is never stale. */
    refresh(key: string | null | undefined): void;
}

export function createWarmCache<T>(
    fetcher: (key: string) => Promise<T | null>,
    /** Keys are lowercased by default — they are usually wallet addresses. */
    normalize: (key: string) => string = (k) => k.toLowerCase(),
): WarmCache<T> {
    const cache = new Map<string, T>();
    const pending = new Map<string, Promise<T | null>>();
    const listeners = new Set<() => void>();

    const warm = (key: string | null | undefined): Promise<T | null> => {
        if (!key) return Promise.resolve(null);
        const k = normalize(key);
        const hit = cache.get(k);
        if (hit !== undefined) return Promise.resolve(hit);
        let p = pending.get(k);
        if (!p) {
            p = fetcher(k)
                .then((v) => {
                    pending.delete(k);
                    if (v != null) {
                        cache.set(k, v);
                        listeners.forEach((cb) => cb());
                    }
                    return v;
                })
                .catch(() => { pending.delete(k); return null; });
            pending.set(k, p);
        }
        return p;
    };

    return {
        read(key) {
            if (!key) return null;
            return cache.get(normalize(key)) ?? null;
        },
        warm,
        warmIdle(key) {
            if (!key || typeof window === 'undefined') return;
            const go = () => { void warm(key); };
            const ric = (window as unknown as {
                requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
            }).requestIdleCallback;
            if (typeof ric === 'function') ric(go, { timeout: 2500 });
            else window.setTimeout(go, 800);
        },
        subscribe(cb) {
            listeners.add(cb);
            return () => { listeners.delete(cb); };
        },
        bust(key) {
            if (!key) return;
            const k = normalize(key);
            cache.delete(k);
            pending.delete(k);
        },
        refresh(key) {
            if (!key) return;
            const k = normalize(key);
            if (pending.has(k)) return;         // one already on the way
            if (!cache.has(k)) { void warm(key); return; }
            const p = fetcher(k)
                .then((v) => {
                    pending.delete(k);
                    if (v != null) {
                        cache.set(k, v);
                        listeners.forEach((cb) => cb());
                    }
                    return v;
                })
                .catch(() => { pending.delete(k); return null; });
            pending.set(k, p);
        },
    };
}

/** The shared JSON read every one of these caches makes. */
export async function getJson<T>(url: string): Promise<T | null> {
    try {
        const r = await fetch(url, { cache: 'no-store' });
        return r.ok ? ((await r.json()) as T) : null;
    } catch {
        return null;
    }
}
