'use client';

/*
 * Completionism cache — the sheet's payload, fetched ONCE per wallet per
 * session and warmed BEFORE the panel is ever opened.
 *
 * ⛔ WHY (Brendon, 2026-07-30: "it's clearly the content loading the first
 * time"). The read used to start when the panel opened, so the first open sat
 * on a network round trip showing "Reading the calendar…", then re-laid the
 * whole sheet out when the months landed — that double beat IS the hitch, and
 * it never repeated because the data stayed in the component afterwards. The
 * door now warms this while the profile is idle, so the panel opens with its
 * content already in hand and slides over finished content.
 *
 * Same shape as the keychain rack cache (Rule #0): module-level map, one
 * in-flight promise per wallet, listeners for anything already mounted.
 */

export interface CompletionismMonth {
    key: string;
    label: string;
    collected: number;
    total: number;
    complete: boolean;
    projects: { slug: string; title: string; collected: boolean }[];
}

export interface CompletionismData {
    months: CompletionismMonth[];
    sheetQty: Record<string, number>;
}

const cache = new Map<string, CompletionismData>();
const pending = new Map<string, Promise<CompletionismData | null>>();
const listeners = new Set<() => void>();

/** What the panel can paint immediately, or null if it has never been read. */
export function readCompletionism(address: string | null | undefined): CompletionismData | null {
    if (!address) return null;
    return cache.get(address.toLowerCase()) ?? null;
}

export function onCompletionism(cb: () => void): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}

/** Fetch once per wallet per session. Safe to call from anywhere, any number
 *  of times — a second caller joins the first one's request. */
export function warmCompletionism(address: string | null | undefined): Promise<CompletionismData | null> {
    if (!address) return Promise.resolve(null);
    const a = address.toLowerCase();
    const hit = cache.get(a);
    if (hit) return Promise.resolve(hit);
    let p = pending.get(a);
    if (!p) {
        p = fetch(`/api/completionism?address=${encodeURIComponent(a)}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { months?: CompletionismMonth[]; sheet_qty?: Record<string, number> } | null) => {
                pending.delete(a);
                if (!d) return null;
                const data: CompletionismData = {
                    months: d.months ?? [],
                    sheetQty: d.sheet_qty ?? {},
                };
                cache.set(a, data);
                listeners.forEach((cb) => cb());
                return data;
            })
            .catch(() => { pending.delete(a); return null; });
        pending.set(a, p);
    }
    return p;
}

/** Warm it without competing with the page it sits on: the browser runs this
 *  when it has nothing better to do, so a profile still paints first. */
export function warmCompletionismIdle(address: string | null | undefined): void {
    if (!address || typeof window === 'undefined') return;
    const go = () => { void warmCompletionism(address); };
    const ric = (window as unknown as {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    }).requestIdleCallback;
    if (typeof ric === 'function') ric(go, { timeout: 2500 });
    else window.setTimeout(go, 800);
}

/** After a write that could change what's collected. */
export function bustCompletionism(address: string | null | undefined): void {
    if (!address) return;
    const a = address.toLowerCase();
    cache.delete(a);
    pending.delete(a);
}
