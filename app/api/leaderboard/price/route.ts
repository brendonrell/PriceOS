import { NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard/price — the Top 100 by $PRICE held.
 *
 * The sibling of /api/leaderboard (PriceScore), same anon (RLS-bound) read off
 * `users`, same row grammar (@handle + sprite via the client's by-handle sprite
 * cache) — but ranked purely by the wallet's $PRICE balance. Both the amount and
 * the rank are maintained by the price-holdings sweep (app/api/cron/price-
 * holdings); this route just reads the stored rank so the board and the "$PRICE
 * Top N" tag always agree. Only named, ranked wallets chart.
 */
export interface PriceHolderRow {
  handle: string;
  address: string;
  /** $PRICE held, in whole tokens (display + ordering). */
  priceHeld: number;
  /** Position among named holders (1 = most). */
  priceHoldRank: number;
}

export interface PriceLeaderboardResponse {
  rows: PriceHolderRow[];
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = getSupabaseAnon();
    const res = await supabase
      .from('users')
      .select('address, handle, price_held, price_hold_rank')
      .not('handle', 'is', null)
      .not('price_hold_rank', 'is', null)
      .order('price_hold_rank', { ascending: true })
      .limit(100);

    if (res.error) return serverError(res.error.message);

    const rows: PriceHolderRow[] = ((res.data ?? []) as Array<{
      address: string;
      handle: string | null;
      price_held: number | string | null;
      price_hold_rank: number | null;
    }>)
      .filter((u) => u.handle !== null && u.price_hold_rank != null)
      .map((u) => ({
        handle: u.handle as string,
        address: u.address.toLowerCase(),
        priceHeld: Number(u.price_held ?? 0),
        priceHoldRank: u.price_hold_rank as number,
      }));

    return NextResponse.json({ rows } satisfies PriceLeaderboardResponse);
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'price leaderboard failed');
  }
}
