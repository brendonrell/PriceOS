/*
 * /api/gas — edge-cached gas tracker source.
 *
 * Tier 2 cost architecture (page 2kyd6gx6-3234):
 *   Globally-shared data revalidates every 12s — one Alchemy fetch per
 *   12s window regardless of how many clients are polling. Vercel
 *   Hobby ceiling (100k invocations/day) gets nowhere near saturated
 *   at this cadence; the per-user surface (LinksView gas widget +
 *   modal cards) all read the same cache.
 *
 * Single batched JSON-RPC POST to Alchemy holding three calls:
 *   1. eth_feeHistory  (5 blocks, latest, percentiles [50, 75, 95])
 *      → next-block base fee + average priority fee per percentile,
 *        the inputs to Standard / Fast / Rapid pricing.
 *   2. eth_blockNumber → current head block, surfaced in the modal
 *      footer so the user can sanity-check freshness.
 *   3. eth_call → Chainlink ETH/USD aggregator latestAnswer(), used
 *      to derive USD cost per card from the gwei price (gwei × 21000
 *      × ethUsd / 1e9). Chainlink aggregator price is int256 with
 *      8 decimals.
 *
 * One batch = one HTTP round-trip = one Alchemy compute-unit hit per
 * 12s. Routing the Chainlink read through the same JSON-RPC endpoint
 * (instead of a separate Coingecko / CMC fetch) keeps the whole gas
 * tracker on a single budget — Alchemy's free 300M CU/month.
 *
 * Reuses NEXT_PUBLIC_ALCHEMY_API_KEY — no new env vars.
 *
 * Edge runtime keeps cold-starts negligible; `revalidate` on the
 * upstream fetch is what actually drives the 12s cache window
 * (segment-level revalidate is honored under Node runtime but
 * effectively no-ops under edge — kept here as intent documentation).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/errors';

export const runtime = 'edge';
export const revalidate = 12;

/* Chainlink ETH/USD aggregator proxy on Ethereum mainnet.
   8-decimal int256 result. */
const CHAINLINK_ETHUSD_AGGREGATOR = '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419';

/* keccak256("latestAnswer()").slice(0, 10) */
const LATEST_ANSWER_SELECTOR = '0x50d25bcd';

const FEE_HISTORY_BLOCKS = '0x5'; // 5
const FEE_HISTORY_PERCENTILES = [50, 75, 95];

export interface GasResponse {
    baseFeeGwei: number;
    standardGwei: number;
    fastGwei: number;
    rapidGwei: number;
    ethUsd: number;
    blockNumber: number;
    fetchedAt: number;
}

function alchemyUrl(): string {
    const url = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
    if (!url) throw new Error('NEXT_PUBLIC_ALCHEMY_RPC_URL is not set');
    return url;
}

function hexWeiToGwei(hex: string): number {
    /* Gas prices comfortably fit in a JS number (gwei << 2^53). The
       BigInt conversion is here only to safely parse hex of any length;
       the final divide-by-1e9 is plain float arithmetic. */
    return Number(BigInt(hex)) / 1e9;
}

function avgPercentileGwei(reward: string[][], idx: number): number {
    if (reward.length === 0) return 0;
    let sum = 0;
    for (const block of reward) {
        sum += hexWeiToGwei(block[idx]);
    }
    return sum / reward.length;
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
    try {
        const batch = [
            {
                jsonrpc: '2.0',
                id: 1,
                method: 'eth_feeHistory',
                params: [FEE_HISTORY_BLOCKS, 'latest', FEE_HISTORY_PERCENTILES],
            },
            {
                jsonrpc: '2.0',
                id: 2,
                method: 'eth_blockNumber',
                params: [],
            },
            {
                jsonrpc: '2.0',
                id: 3,
                method: 'eth_call',
                params: [
                    { to: CHAINLINK_ETHUSD_AGGREGATOR, data: LATEST_ANSWER_SELECTOR },
                    'latest',
                ],
            },
        ];

        /* 8s abort guard — without it a hung Alchemy connection holds the
           request open indefinitely (and the client's poll with it). On
           timeout the catch below returns the same 500 shape as any other
           upstream failure; pollers already tolerate transient errors. */
        const abort = new AbortController();
        const abortTimer = setTimeout(() => abort.abort(), 8000);
        let res: Response;
        try {
            res = await fetch(alchemyUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(batch),
                next: { revalidate: 12 },
                signal: abort.signal,
            });
        } finally {
            clearTimeout(abortTimer);
        }

        if (!res.ok) return serverError(`Alchemy returned ${res.status}`);

        const json = (await res.json()) as Array<{
            id: number;
            result?: unknown;
            error?: { message: string };
        }>;

        const byId = new Map<number, { result?: unknown; error?: { message: string } }>();
        for (const item of json) byId.set(item.id, item);

        const fee = byId.get(1);
        const blk = byId.get(2);
        const usd = byId.get(3);

        if (!fee || fee.error || !fee.result) {
            return serverError(
                `eth_feeHistory failed: ${fee?.error?.message ?? 'no result'}`
            );
        }
        if (!blk || blk.error || !blk.result) {
            return serverError(
                `eth_blockNumber failed: ${blk?.error?.message ?? 'no result'}`
            );
        }
        if (!usd || usd.error || !usd.result) {
            return serverError(
                `Chainlink ETH/USD failed: ${usd?.error?.message ?? 'no result'}`
            );
        }

        const feeResult = fee.result as {
            baseFeePerGas: string[];
            reward: string[][];
        };
        /* baseFeePerGas has N+1 entries for N blocks — the last entry
           is the predicted base fee for the next block, which is what
           wallets show as "current" gas. */
        const baseFees = feeResult.baseFeePerGas;
        const baseFeeGwei = hexWeiToGwei(baseFees[baseFees.length - 1]);

        const stdPriority = avgPercentileGwei(feeResult.reward, 0);
        const fastPriority = avgPercentileGwei(feeResult.reward, 1);
        const rapidPriority = avgPercentileGwei(feeResult.reward, 2);

        const blockNumber = parseInt(blk.result as string, 16);

        /* Chainlink ETH/USD: int256, 8 decimals. ETH price is always
           positive in practice, so plain Number conversion is fine. */
        const ethUsdRaw = BigInt(usd.result as string);
        const ethUsd = Number(ethUsdRaw) / 1e8;

        const response: GasResponse = {
            baseFeeGwei,
            standardGwei: baseFeeGwei + stdPriority,
            fastGwei: baseFeeGwei + fastPriority,
            rapidGwei: baseFeeGwei + rapidPriority,
            ethUsd,
            blockNumber,
            fetchedAt: Date.now(),
        };

        /* Browser-side cache hint matching the 12s edge window. The data a
           client could be served from its own cache is never staler than
           what the edge cache already serves every other client, so
           freshness semantics are unchanged — repeat polls within the
           window just skip the network round-trip entirely. */
        return NextResponse.json(response, {
            headers: {
                'Cache-Control':
                    'public, max-age=12, s-maxage=12, stale-while-revalidate=24',
            },
        });
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
