/*
 * /api/token/price — the @price profile's Volume Spent stat, repurposed as
 * the live ETH↔$PRICE rate (Brendon, 2026-08-24). See lib/platform/priceMarket
 * for the CoinGecko → Uniswap-pool → 0 chain. Edge-cached 60s, same posture
 * as /api/fx.
 */

import { NextResponse } from 'next/server';
import { serverError } from '@/lib/errors';
import { fetchPriceMarketRate } from '@/lib/platform/priceMarket';

export const revalidate = 60;

export async function GET(): Promise<NextResponse> {
    try {
        const rate = await fetchPriceMarketRate();
        return NextResponse.json(rate, {
            headers: {
                'Cache-Control': 'public, max-age=60, s-maxage=60, stale-while-revalidate=120',
            },
        });
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
