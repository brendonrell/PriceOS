// /api/priceday/[n] — the REAL PriceDay almanac (see lib/priceday/
// almanac.server — one engine feeds this route, the global-search PriceDay
// powerup, and the calendar's day column).

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { buildPriceDayAlmanac } from '@/lib/priceday/almanac.server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { n: string } }) {
  const n = Number(params.n);
  if (!Number.isInteger(n) || n < 1 || n > 100_000) return badRequest('Bad day');
  try {
    const db = getSupabaseService();
    const almanac = await buildPriceDayAlmanac(db, n);
    return NextResponse.json(almanac);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
