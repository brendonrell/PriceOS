/*
 * /api/rpc-ping — edge-cached RPC latency probe.
 *
 * Fires eth_blockNumber against Alchemy and returns the server-
 * measured round-trip in ms. The number is what the rpcEngine writes
 * into the ⌁ pill latency display + quality tier class (sim refs
 * 12453-12504, but with real data instead of simulateTick drift now
 * that S3 has landed).
 *
 * Tier 2 cost architecture (page 2kyd6gx6-3234):
 *   revalidate 4s — coincident ticks across many clients collapse to
 *   one Alchemy fetch per 4s window. Each client only ticks every
 *   4-8s anyway (rpcEngine.scheduleNext jitter), so most ticks land
 *   on a cache hit. Edge runtime keeps cold-starts negligible.
 *
 * Reuses NEXT_PUBLIC_ALCHEMY_API_KEY — no new env vars.
 *
 * Why eth_blockNumber: the smallest-payload single-RPC call Alchemy
 * exposes (returns a single hex string). The point here is measuring
 * round-trip wall-clock, not extracting useful data — though we
 * surface blockNumber too so the UI can show head-block freshness
 * if it ever wants to.
 *
 * The server-side `ms` is captured around the upstream fetch; when
 * the response comes from Next.js's revalidate cache it'll be near
 * zero. That's the desired UX: a tracker that mostly reads "fast"
 * because the platform itself is fast for the user (cached), and
 * occasionally bumps up to the true cold-fetch latency when the
 * cache rolls. If a future iteration wants raw upstream latency
 * every tick, drop revalidate to 0 — but that re-introduces per-
 * client Alchemy CU burn that Tier 2 explicitly avoids.
 *
 * Failure path: rpcEngine pins ms at 400 (slow tier) on non-2xx /
 * throw, so this route returning a 500 is acceptable — the engine
 * handles it gracefully.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { serverError } from '@/lib/errors';

export const runtime = 'edge';
export const revalidate = 4;

export interface RpcPingResponse {
    ms: number;
    blockNumber: number;
    fetchedAt: number;
}

function alchemyUrl(): string {
    const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
    if (!key) throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY is not set');
    return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
    try {
        /* 8s abort guard — a hung Alchemy connection must not hold the
           request open indefinitely. On timeout the catch below returns the
           same 500 shape as any other upstream failure; the client engine
           already clamps errors to its 400ms "slow" ceiling. */
        const abort = new AbortController();
        const abortTimer = setTimeout(() => abort.abort(), 8000);
        const start = Date.now();
        let res: Response;
        try {
            res = await fetch(alchemyUrl(), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_blockNumber',
                    params: [],
                }),
                next: { revalidate: 4 },
                signal: abort.signal,
            });
        } finally {
            clearTimeout(abortTimer);
        }
        const ms = Date.now() - start;

        if (!res.ok) return serverError(`Alchemy returned ${res.status}`);

        const json = (await res.json()) as {
            result?: string;
            error?: { message: string };
        };
        if (json.error) return serverError(`Alchemy error: ${json.error.message}`);
        if (!json.result) return serverError('Alchemy returned no result');

        const response: RpcPingResponse = {
            ms,
            blockNumber: parseInt(json.result, 16),
            fetchedAt: Date.now(),
        };

        return NextResponse.json(response);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
