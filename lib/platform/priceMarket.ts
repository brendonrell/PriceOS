/*
 * priceMarket — the live ETH↔$PRICE market rate for the @price profile's
 * Volume Spent stat (Brendon, 2026-08-24). $PRICE has no volume of its own
 * to spend — the stat repurposes the same slot to show what $PRICE is
 * actually worth in ETH, once a market exists.
 *
 * Two sources, tried in order, same posture as /api/fx:
 *   1. CoinGecko — token price lookup by contract address, priced in ETH.
 *      Works the moment CoinGecko indexes a pool for the token.
 *   2. Uniswap V3 pool — a direct slot0 read against a configured pool
 *      address (UNISWAP_PRICE_POOL_ADDRESS), for the window before
 *      CoinGecko has picked the token up.
 *
 * Until a third party LPs $PRICE and a pool exists, both come back empty
 * and this resolves to 0 — a real, honest reading, not a placeholder.
 */

import { PRICE_TOKEN_ADDRESS } from './accounts';

async function fetchWithTimeout(url: string, ms: number, init?: RequestInit): Promise<Response> {
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), ms);
    try {
        return await fetch(url, { ...init, signal: abort.signal });
    } finally {
        clearTimeout(timer);
    }
}

/** CoinGecko token price, by contract address, priced directly in ETH. */
async function coingeckoTokenPriceEth(): Promise<number | null> {
    try {
        const res = await fetchWithTimeout(
            `https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${PRICE_TOKEN_ADDRESS}&vs_currencies=eth`,
            7000,
            { next: { revalidate: 60 }, headers: { accept: 'application/json' } },
        );
        if (!res.ok) return null;
        const j = (await res.json()) as Record<string, { eth?: number }>;
        const v = j[PRICE_TOKEN_ADDRESS.toLowerCase()]?.eth;
        return typeof v === 'number' && v > 0 ? v : null;
    } catch {
        return null;
    }
}

/* Uniswap V3 slot0() — sqrtPriceX96 is the first word back. Pool address is
   an env var because it doesn't exist yet; set it the day a pool goes live. */
const SLOT0_SELECTOR = '0x3850c7bd'; // keccak256("slot0()")[:10]

/** Direct Uniswap V3 pool read — the pre-CoinGecko-listing fallback. */
async function uniswapPoolPriceEth(): Promise<number | null> {
    const pool = process.env.UNISWAP_PRICE_POOL_ADDRESS;
    const rpc = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
    if (!pool || !rpc) return null;
    try {
        const res = await fetchWithTimeout(rpc, 7000, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_call',
                params: [{ to: pool, data: SLOT0_SELECTOR }, 'latest'],
            }),
            next: { revalidate: 60 },
        });
        if (!res.ok) return null;
        const j = (await res.json()) as { result?: string; error?: unknown };
        if (!j.result || j.error) return null;
        const sqrtPriceX96 = BigInt(j.result.slice(0, 66));
        // price = (sqrtPriceX96 / 2^96)^2 — token1/token0, direction depends on
        // which side of the pool $PRICE sits on; whichever pool gets deployed
        // sets that constant here once its token ordering is known.
        const ratio = Number(sqrtPriceX96) / 2 ** 96;
        const price = ratio * ratio;
        return price > 0 ? price : null;
    } catch {
        return null;
    }
}

export interface PriceMarketRate {
    /** ETH per $PRICE. 0 when no pool/listing exists yet. */
    priceEth: number;
    source: 'coingecko' | 'uniswap' | 'none';
}

/** The live $PRICE→ETH rate, or the honest 0 while no pool exists. */
export async function fetchPriceMarketRate(): Promise<PriceMarketRate> {
    const cg = await coingeckoTokenPriceEth();
    if (cg !== null) return { priceEth: cg, source: 'coingecko' };
    const uni = await uniswapPoolPriceEth();
    if (uni !== null) return { priceEth: uni, source: 'uniswap' };
    return { priceEth: 0, source: 'none' };
}
