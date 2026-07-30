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
 * Built on the shared warm cache (lib/net/warmCache), which every sliding
 * panel's reads now go through.
 */

import { createWarmCache, getJson } from '../net/warmCache';

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

const store = createWarmCache<CompletionismData>(async (addr) => {
    const d = await getJson<{ months?: CompletionismMonth[]; sheet_qty?: Record<string, number> }>(
        `/api/completionism?address=${encodeURIComponent(addr)}`,
    );
    if (!d) return null;
    return { months: d.months ?? [], sheetQty: d.sheet_qty ?? {} };
});

/** What the panel can paint immediately, or null if it has never been read. */
export const readCompletionism = store.read;
export const warmCompletionism = store.warm;
/** Warm it without competing with the page it sits on. */
export const warmCompletionismIdle = store.warmIdle;
export const onCompletionism = store.subscribe;
/** After a write that could change what's collected. */
export const bustCompletionism = store.bust;
/** Re-read in the background while the cached copy stays on screen. */
export const refreshCompletionism = store.refresh;
