import { NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/leaderboard — the Top 100 by PriceScore.
 *
 * Anon (RLS-bound) read off `users`, same grant the achievements profile
 * route rides. Rows are the social leaderboard surface: @handle + score +
 * rank tier (the client pairs each handle with its PriceSprite via the
 * existing by-handle sprite cache). Only named, scored accounts chart —
 * an unclaimed wallet can lurk, not rank.
 *
 * Ties break by account age (earlier joiner charts higher — the OG wins).
 */
export interface LeaderboardRow {
  handle: string;
  address: string;
  priceScore: number;
  priceRank: number;
}

export interface LeaderboardResponse {
  rows: LeaderboardRow[];
}

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = getSupabaseAnon();
    const res = await supabase
      .from('users')
      .select('address, handle, price_score, price_rank, created_at')
      .not('handle', 'is', null)
      .gt('price_score', 0)
      .order('price_score', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(100);

    if (res.error) return serverError(res.error.message);

    const rows: LeaderboardRow[] = ((res.data ?? []) as Array<{
      address: string;
      handle: string | null;
      price_score: number | null;
      price_rank: number | null;
    }>)
      .filter((u) => u.handle !== null)
      .map((u) => ({
        handle: u.handle as string,
        address: u.address.toLowerCase(),
        priceScore: u.price_score ?? 0,
        priceRank: u.price_rank ?? 0,
      }));

    return NextResponse.json({ rows } satisfies LeaderboardResponse);
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'leaderboard failed');
  }
}
