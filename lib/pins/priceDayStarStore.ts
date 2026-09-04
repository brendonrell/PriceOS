'use client';

/*
 * priceDayStarStore — STARRED PRICEDAYS (the +More → Starred "PriceDays"
 * surface). Long-press a PriceDay's title in its popover (PriceDaySlot /
 * PriceDayDateLink) to favourite it — same gesture as Project and Output
 * names.
 *
 * Keyed by PriceDay number (a stable per-day id), ordered. Account-backed
 * via the settings envelope (`priceDayStars`).
 *
 * Persistence protocol lives in createPinStore (2026-07-06 factory).
 */

import { pushSettings, STATE_CACHE_KEYS } from '../state/userState';
import { createPinStore, decodeStringList } from './createPinStore';

const store = createPinStore<string[]>({
    storageKey: STATE_CACHE_KEYS.priceDayStars,
    empty: () => [],
    decode: decodeStringList,
    encode: (nums) => [...nums],
    push: (encoded) => pushSettings({ priceDayStars: encoded as string[] }),
});

export type TogglePriceDayStarResult = 'starred' | 'unstarred';

function keyOf(number: number): string {
    return String(number);
}

/** Ordered list of starred PriceDay numbers. */
export function getPriceDayStars(): readonly string[] {
    return store.get();
}

export function isPriceDayStarred(number: number): boolean {
    return store.get().includes(keyOf(number));
}

/** Toggle a PriceDay's star. Caller owns the toast + float. */
export function togglePriceDayStar(number: number): TogglePriceDayStarResult {
    const k = keyOf(number);
    const cur = store.get();
    if (cur.includes(k)) {
        store.set(cur.filter((s) => s !== k));
        return 'unstarred';
    }
    store.set([...cur, k]);
    return 'starred';
}

/** Remove (used by the Starred list's unstar / multi-select). */
export function removePriceDayStar(number: number): void {
    const k = keyOf(number);
    const cur = store.get();
    if (!cur.includes(k)) return;
    store.set(cur.filter((s) => s !== k));
}

export function subscribePriceDayStars(cb: (nums: readonly string[]) => void): () => void {
    return store.subscribe(cb);
}
