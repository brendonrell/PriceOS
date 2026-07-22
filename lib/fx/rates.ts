'use client';

/*
 * lib/fx/rates.ts — on-demand ETH→fiat rates for the INLINE CONVERTER.
 *
 * The converter must work even when fiat mode is OFF (a user just wants a quick
 * "1 eth in usd" without flipping a setting). FiatContext only polls /api/fx
 * while a currency is selected, so this is the standalone reader: fetch once on
 * demand, share the same edge-cached /api/fx (60s, $0 at any scale — free
 * forever), and reuse FiatContext's own localStorage cache key so a warm app
 * answers instantly.
 */

import { useEffect, useState } from 'react';
import type { FxResponse } from './types';

const FX_KEY = 'pd_fiat_fx'; // shared with FiatContext
const STALE_MS = 5 * 60_000;

let mem: FxResponse | null = null;
let inflight: Promise<FxResponse | null> | null = null;

function readStored(): FxResponse | null {
    if (mem) return mem;
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(FX_KEY);
        if (!raw) return null;
        const j = JSON.parse(raw) as FxResponse;
        if (j && j.rates && typeof j.trusted === 'boolean') { mem = j; return j; }
    } catch { /* ignore */ }
    return null;
}

/** Fetch fresh rates if we don't have recent ones; returns the best available. */
export function ensureFx(): Promise<FxResponse | null> {
    const cached = readStored();
    if (cached && Date.now() - cached.fetchedAt < STALE_MS) return Promise.resolve(cached);
    if (inflight) return inflight;
    inflight = fetch('/api/fx')
        .then((r) => (r.ok ? r.json() : null))
        .then((j: FxResponse | null) => {
            if (j && j.rates) {
                mem = j;
                try { localStorage.setItem(FX_KEY, JSON.stringify(j)); } catch { /* ignore */ }
            }
            inflight = null;
            return j ?? cached;
        })
        .catch(() => { inflight = null; return cached; });
    return inflight;
}

/** Live rates for the converter surfaces; fetches on demand while `active`. */
export function useFxRates(active: boolean): FxResponse | null {
    const [fx, setFx] = useState<FxResponse | null>(() => readStored());
    useEffect(() => {
        if (!active) return;
        let cancelled = false;
        ensureFx().then((j) => { if (!cancelled && j) setFx(j); });
        return () => { cancelled = true; };
    }, [active]);
    return fx;
}
