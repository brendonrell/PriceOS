// GET /api/pings/count — the tiny unread-count poll.
//
// This is what the client hits on the background interval (every ~30s). It
// returns ~30 bytes, NOT the full feed, so a tab left open all day costs almost
// no egress. The full list is fetched only when the panel opens or the count
// ticks up. Keeps the whole system inside the free-tier bandwidth budget.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export interface PingsCountResponse {
  unread: number;
}

export const GET = requireAuth(async (_req, _ctx, address) => {
  try {
    const db = getSupabaseService();
    const { count, error } = await db
      .from('pings')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_address', address)
      .eq('read', false);
    if (error) return serverError(error.message);

    const response: PingsCountResponse = { unread: count ?? 0 };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
