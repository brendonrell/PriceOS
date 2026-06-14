// GET /api/pings — the signed-in user's Ping inbox (directed pings).
//
// Private: returns ONLY the caller's own pings (recipient === authed address),
// enforced in app code on the service-role client — the same trust boundary the
// rest of the API uses, since SIWE gives us no Supabase-Auth identity for RLS.
//
// The BROADCAST firehose ("someone you follow dropped X") is served at read time
// off the shared `events` table and is wired in the next slice; this route is
// the directed inbox that every producer writes to today.

import { NextResponse } from 'next/server';
import { getSupabaseService, type PingRow } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface PingsListResponse {
  unread_count: number;
  pings: PingRow[];
  next_cursor: string | null;
}

export const GET = requireAuth(async (req, _ctx, address) => {
  const url = new URL(req.url);
  const limit = Math.min(
    MAX_LIMIT,
    Math.max(1, Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT))
  );
  const cursor = url.searchParams.get('cursor');

  try {
    const db = getSupabaseService();

    let query = db
      .from('pings')
      .select('*')
      .eq('recipient_address', address)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (cursor) query = query.lt('created_at', cursor);

    const { data, error } = await query;
    if (error) return serverError(error.message);

    const { count, error: countErr } = await db
      .from('pings')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_address', address)
      .eq('read', false);
    if (countErr) return serverError(countErr.message);

    const pings = (data ?? []) as PingRow[];
    const response: PingsListResponse = {
      unread_count: count ?? 0,
      pings,
      next_cursor:
        pings.length === limit ? pings[pings.length - 1].created_at : null,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
