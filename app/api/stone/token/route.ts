// THE COIN CARD — the Command Stone's token read (2026-07-28).
//
// One GET serves the whole card: live price in fiat (USD) with trend,
// pool depth, the pair's logo, and the holder's balance. All $0 sources:
//   price   — DEXScreener's free public API, by PINNED address only
//             (native ETH prices via wrapped ETH), highest-liquidity pair
//             on the token's chain. No pool → price 0, said honestly —
//             that is $PRICE until Brendon adds the pool, by design.
//   balance — the same Alchemy mainnet RPC the /api/price route already
//             uses (eth_getBalance for native, balanceOf for ERC-20).
// Cached in-memory 30s per (symbol, holder) so repeated summons collapse.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { TOKENS, WETH_ADDRESS } from '@/lib/stone/tokens';

export const dynamic = 'force-dynamic';

export interface StoneTokenResponse {
    symbol: string;
    name: string;
    priceUsd: number;
    /** 1h · 6h · 24h percentage moves; null when no pool. */
    change: { h1: number | null; h6: number | null; h24: number | null };
    liquidityUsd: number | null;
    volume24Usd: number | null;
    /** The pair's own token image (used when no house logo applies). */
    imageUrl: string | null;
    hasPool: boolean;
    note: string | null;
    /** The holder's balance (whole tokens) — null when no holder given. */
    balance: number | null;
    balanceUsd: number | null;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const BALANCE_OF_SELECTOR = '0x70a08231';

function rpcUrl(chain: 'ethereum' | 'base'): string | null {
    if (chain === 'base') return 'https://mainnet.base.org'; // official free public RPC
    const url = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
    if (url) return url;
    const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (key) return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
    return null;
}

async function rpc(chain: 'ethereum' | 'base', method: string, params: unknown[]): Promise<string | null> {
    const url = rpcUrl(chain);
    if (!url) return null;
    try {
        const r = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        });
        if (!r.ok) return null;
        const d = (await r.json()) as { result?: string };
        return typeof d.result === 'string' ? d.result : null;
    } catch {
        return null;
    }
}

async function readBalance(token: (typeof TOKENS)[number], holder: string): Promise<number | null> {
    let hex: string | null;
    if (token.address == null) {
        hex = await rpc(token.chain, 'eth_getBalance', [holder, 'latest']);
    } else {
        const data = BALANCE_OF_SELECTOR + holder.slice(2).toLowerCase().padStart(64, '0');
        hex = await rpc(token.chain, 'eth_call', [{ to: token.address, data }, 'latest']);
    }
    if (!hex || hex === '0x') return null;
    try {
        return Number(BigInt(hex)) / 10 ** token.decimals;
    } catch {
        return null;
    }
}

interface DexPair {
    chainId?: string;
    priceUsd?: string;
    priceChange?: { h1?: number; h6?: number; h24?: number };
    liquidity?: { usd?: number };
    volume?: { h24?: number };
    info?: { imageUrl?: string };
}

async function readPrice(token: (typeof TOKENS)[number]): Promise<{
    priceUsd: number; change: StoneTokenResponse['change'];
    liquidityUsd: number | null; volume24Usd: number | null;
    imageUrl: string | null; hasPool: boolean;
}> {
    const addr = token.address ?? WETH_ADDRESS;
    try {
        const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${addr}`, {
            headers: { accept: 'application/json' },
        });
        if (r.ok) {
            const d = (await r.json()) as { pairs?: DexPair[] };
            const pairs = (d.pairs ?? []).filter((p) => p.chainId === token.chain);
            pairs.sort((a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0));
            const top = pairs[0];
            const price = top ? parseFloat(top.priceUsd ?? '0') : 0;
            if (top && price > 0) {
                return {
                    priceUsd: price,
                    change: {
                        h1: top.priceChange?.h1 ?? null,
                        h6: top.priceChange?.h6 ?? null,
                        h24: top.priceChange?.h24 ?? null,
                    },
                    liquidityUsd: top.liquidity?.usd ?? null,
                    volume24Usd: top.volume?.h24 ?? null,
                    imageUrl: top.info?.imageUrl ?? null,
                    hasPool: true,
                };
            }
        }
    } catch { /* aggregator unreachable → the honest zero below */ }
    return {
        priceUsd: 0,
        change: { h1: null, h6: null, h24: null },
        liquidityUsd: null,
        volume24Usd: null,
        imageUrl: null,
        hasPool: false,
    };
}

const cache = new Map<string, { at: number; body: StoneTokenResponse }>();
const CACHE_MS = 30_000;

export async function GET(req: NextRequest): Promise<NextResponse> {
    try {
        const symbol = (req.nextUrl.searchParams.get('symbol') ?? '').toUpperCase();
        const holderRaw = req.nextUrl.searchParams.get('holder') ?? '';
        const token = TOKENS.find((t) => t.symbol === symbol);
        if (!token) return badRequest('Unknown token');
        const holder = ADDRESS_RE.test(holderRaw) ? holderRaw : null;

        const key = `${symbol}·${holder ?? '-'}`;
        const hit = cache.get(key);
        if (hit && Date.now() - hit.at < CACHE_MS) return NextResponse.json(hit.body);

        const [price, balance] = await Promise.all([
            readPrice(token),
            holder ? readBalance(token, holder) : Promise.resolve(null),
        ]);
        const body: StoneTokenResponse = {
            symbol: token.symbol,
            name: token.name,
            ...price,
            note: token.note ?? null,
            balance,
            balanceUsd: balance != null && price.priceUsd > 0 ? balance * price.priceUsd : null,
        };
        cache.set(key, { at: Date.now(), body });
        return NextResponse.json(body);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
