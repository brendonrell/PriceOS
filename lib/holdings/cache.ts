'use client';

/*
 * Holdings cache — a wallet's own pieces, warmed before the panels that need
 * them open (Brendon, 2026-07-30: "make sure all sliding modals get the fix").
 *
 * Two sliding panels read the same endpoint on open — the Purchase Pal and the
 * Exchange's picker — so both waited on the same cold request, twice. One warm
 * read now serves them both, and it happens while the page is idle.
 */

import { createWarmCache, getJson } from '../net/warmCache';

export interface HoldingsData {
    /* Deliberately loose: each panel already has its own row type and casts to
       it — this cache's job is the timing, not the shape. */
    rows: unknown[];
    total: number;
    spent: number;
}

const store = createWarmCache<HoldingsData>(async (addr) => {
    const d = await getJson<{ holdings?: unknown[]; total?: number | string; volume_spent_eth?: number | string }>(
        `/api/user/${addr}/outputs`,
    );
    if (!d) return null;
    return {
        rows: d.holdings ?? [],
        total: Number(d.total) || 0,
        spent: Number(d.volume_spent_eth) || 0,
    };
});

export const readHoldings = store.read;
export const warmHoldings = store.warm;
export const warmHoldingsIdle = store.warmIdle;
export const onHoldings = store.subscribe;
export const bustHoldings = store.bust;
/** Re-read in the background while the cached copy stays on screen. */
export const refreshHoldings = store.refresh;
