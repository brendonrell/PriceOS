/*
 * /api/fx — edge-cached ETH→fiat rate source (USD · CAD · GBP · EUR · AUD · JPY).
 *
 * This price is READ BLIND: a buyer spends a known amount of ETH trusting the
 * fiat conversion we show. So the bar is reliability, not just "a number":
 *
 *   1. Primary  — CoinGecko gives ETH priced in all six fiats in one call.
 *   2. Anchor   — Chainlink ETH/USD (via Alchemy, the exact read the gas
 *                 tracker already trusts) is an INDEPENDENT second opinion on
 *                 the USD leg. If CoinGecko's USD and Chainlink's USD disagree
 *                 by more than 2%, we do NOT trust the number — `trusted:false`,
 *                 and the UI hides the ~$ rather than show a figure we can't
 *                 stand behind.
 *   3. Fallback — if CoinGecko is down, we anchor on Chainlink USD and derive
 *                 the five crosses from ECB reference rates (frankfurter.app).
 *
 * One global number set, shared by every client and cached 60s at the edge —
 * so this is free at any scale (a handful of upstream fetches per hour total,
 * regardless of how many people are viewing prices).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/errors';
import type { FiatCode, FxResponse } from '@/lib/fx/types';

export const revalidate = 60;

/* Chainlink ETH/USD aggregator proxy on Ethereum mainnet — int256, 8 decimals.
   Same feed the /api/gas route reads; kept independent here as the cross-check. */
const CHAINLINK_ETHUSD_AGGREGATOR = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';
const LATEST_ANSWER_SELECTOR = '0x50d25bcd'; // keccak256("latestAnswer()")[:10]

/* Agreement band between the two independent USD reads. Beyond this, one of the
   sources is wrong/manipulated and we refuse to vouch for the conversion. */
const AGREE_TOLERANCE = 0.02;

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), ms);
    try {
        return await fetch(url, { ...init, signal: abort.signal });
    } finally {
        clearTimeout(timer);
    }
}

/** CoinGecko — ETH in all six fiats in a single request. */
async function coingecko(): Promise<Partial<Record<FiatCode, number>> | null> {
    try {
        const res = await fetchWithTimeout(
            'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd,cad,gbp,eur,aud,jpy',
            7000,
            { next: { revalidate: 60 }, headers: { accept: 'application/json' } },
        );
        if (!res.ok) return null;
        const j = (await res.json()) as { ethereum?: Record<string, number> };
        const e = j.ethereum;
        if (!e) return null;
        const out: Partial<Record<FiatCode, number>> = {};
        if (typeof e.usd === 'number') out.USD = e.usd;
        if (typeof e.cad === 'number') out.CAD = e.cad;
        if (typeof e.gbp === 'number') out.GBP = e.gbp;
        if (typeof e.eur === 'number') out.EUR = e.eur;
        if (typeof e.aud === 'number') out.AUD = e.aud;
        if (typeof e.jpy === 'number') out.JPY = e.jpy;
        return Object.keys(out).length ? out : null;
    } catch {
        return null;
    }
}

/** Chainlink ETH/USD via Alchemy — the independent USD anchor. */
async function chainlinkUsd(): Promise<number | null> {
    const url = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
    if (!url) return null;
    try {
        const res = await fetchWithTimeout(url, 7000, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{ to: CHAINLINK_ETHUSD_AGGREGATOR, data: LATEST_ANSWER_SELECTOR }, 'latest'],
            }),
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        const j = (await res.json()) as { result?: string; error?: unknown };
        if (!j.result || j.error) return null;
        const v = Number(BigInt(j.result)) / 1e8;
        return v > 0 ? v : null;
    } catch {
        return null;
    }
}

/** ECB reference cross-rates USD→{CAD,GBP,EUR,AUD,JPY} — fallback for the crosses. */
async function ecbCrosses(): Promise<Partial<Record<FiatCode, number>> | null> {
    try {
        const res = await fetchWithTimeout(
            'https://api.frankfurter.dev/v1/latest?from=USD&to=CAD,GBP,EUR,AUD,JPY',
            7000,
            { next: { revalidate: 3600 }, headers: { accept: 'application/json' } },
        );
        if (!res.ok) return null;
        const j = (await res.json()) as { rates?: Record<string, number> };
        return j.rates ?? null;
    } catch {
        return null;
    }
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
    try {
        const [cg, anchorUsd] = await Promise.all([coingecko(), chainlinkUsd()]);

        let rates: Partial<Record<FiatCode, number>> = {};
        let trusted = false;
        let source = 'none';

        if (cg && typeof cg.USD === 'number') {
            rates = cg;
            source = 'coingecko';
            if (anchorUsd) {
                const diff = Math.abs(cg.USD - anchorUsd) / anchorUsd;
                trusted = diff <= AGREE_TOLERANCE;
                source = trusted ? 'coingecko+chainlink' : 'coingecko(disagrees-chainlink)';
            } else {
                // Single reputable source, no anchor available — usable but unverified.
                trusted = true;
                source = 'coingecko(unanchored)';
            }
        } else if (anchorUsd) {
            // CoinGecko down — anchor on Chainlink USD, derive crosses from ECB.
            const crosses = await ecbCrosses();
            rates = { USD: anchorUsd };
            if (crosses) {
                if (typeof crosses.CAD === 'number') rates.CAD = anchorUsd * crosses.CAD;
                if (typeof crosses.GBP === 'number') rates.GBP = anchorUsd * crosses.GBP;
                if (typeof crosses.EUR === 'number') rates.EUR = anchorUsd * crosses.EUR;
                if (typeof crosses.AUD === 'number') rates.AUD = anchorUsd * crosses.AUD;
                if (typeof crosses.JPY === 'number') rates.JPY = anchorUsd * crosses.JPY;
            }
            trusted = true;
            source = crosses ? 'chainlink+ecb' : 'chainlink';
        }

        const body: FxResponse = { rates, trusted, source, fetchedAt: Date.now() };
        return NextResponse.json(body, {
            headers: {
                'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
