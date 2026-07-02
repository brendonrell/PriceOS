'use client';

/*
 * usePriceDay — the LIVE PriceDay almanac for the built modals. Returns the
 * seeded placeholder instantly (the popover is never empty), then swaps in
 * the real day from /api/priceday/[n]: real mints, real arrivals, the real
 * biggest sale, and THE DAY — the day's own written line. Cached per day
 * number for the session; past days are immutable so the cache never lies.
 */

import { useEffect, useState } from 'react';
import { priceDayContents, priceDayNumber, type PriceDayContents } from './priceday';

export interface LivePriceDay extends PriceDayContents {
    flavor?: string | null;
    live: boolean;
}

const cache = new Map<number, LivePriceDay>();

export function usePriceDay(d: Date = new Date()): LivePriceDay {
    const n = priceDayNumber(d);
    const [state, setState] = useState<LivePriceDay | null>(() => cache.get(n) ?? null);

    useEffect(() => {
        const hit = cache.get(n);
        if (hit) { setState(hit); return; }
        let cancelled = false;
        fetch(`/api/priceday/${n}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => {
                if (cancelled || !j) return;
                const live: LivePriceDay = {
                    number: j.number ?? n,
                    minted: Array.isArray(j.minted) ? j.minted : [],
                    uploaded: Array.isArray(j.uploaded) ? j.uploaded : [],
                    biggestSale: j.biggestSale ?? null,
                    flavor: j.flavor ?? null,
                    live: true,
                };
                cache.set(n, live);
                setState(live);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [n]);

    if (state) return state;
    return { ...priceDayContents(d), flavor: null, live: false };
}
