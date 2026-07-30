'use client';

/*
 * Marketplace snapshot cache — the Purchase Pal's market read, warmed before
 * the panel opens (Brendon, 2026-07-30).
 *
 * One entry, no key: the snapshot is the same for everyone. Kept in the same
 * shape as the other warm caches so every sliding panel reads its content the
 * one way.
 */

import type { MarketplaceResponse } from './marketData';
import { createWarmCache, getJson } from '../net/warmCache';

const KEY = 'snapshot';

const store = createWarmCache<MarketplaceResponse>(
    () => getJson<MarketplaceResponse>('/api/marketplace'),
    (k) => k,
);

export const readMarketSnapshot = (): MarketplaceResponse | null => store.read(KEY);
export const warmMarketSnapshot = (): Promise<MarketplaceResponse | null> => store.warm(KEY);
export const warmMarketSnapshotIdle = (): void => store.warmIdle(KEY);
export const onMarketSnapshot = store.subscribe;
export const bustMarketSnapshot = (): void => store.bust(KEY);
/** Re-read in the background while the cached copy stays on screen. */
export const refreshMarketSnapshot = (): void => store.refresh(KEY);
