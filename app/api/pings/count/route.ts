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
import { getBroadcastContext, countBroadcastUnread } from '@/lib/pings/broadcast';

export const dynamic = 'force-dynamic';

export interface PingsCountResponse {
  unread: number;
}

export const GET = requireAuth(async (_req, _ctx, address) => {
  try {
    const db = getSupabaseService();

    // Directed unread (cheap, index-backed).
    const { count, error } = await db
      .from('pings')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_address', address)
      .eq('read', false);
    if (error) return serverError(error.message);

    // Broadcast unread (events newer than the viewer's watermark).
    const bctx = await getBroadcastContext(db, address);
    const broadcastUnread = bctx.empty ? 0 : await countBroadcastUnread(db, address, bctx);

    const response: PingsCountResponse = { unread: (count ?? 0) + broadcastUnread };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
