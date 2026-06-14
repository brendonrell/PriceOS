// GET /api/pings/count — the tiny unread-count poll (DIRECTED only).
//
// This is what the client hits on the background interval (~15s). It counts ONLY
// the caller's directed pings (the index-backed `pings (recipient, read)` partial
// index) — it deliberately does NOT compute the broadcast firehose, which would
// mean a follow-graph + events join on every poll for every user (a CPU cliff at
// scale). The broadcast unread is folded in by the full /api/pings fetch (panel
// open / qualifying actions). Directed pings are the latency-critical financial
// ones and surface live: their event INSERT nudges this poll, the count ticks up,
// and the client pulls the full list.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export interface PingsCountResponse {
  /** Directed unread only (cheap). Broadcast unread comes from /api/pings. */
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
