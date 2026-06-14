// GET /api/pings — the signed-in user's full Ping feed.
//
// Merges two streams into one time-ordered list:
//   1. DIRECTED pings — stored rows where recipient === the caller (things done
//      to you: followed/collected/offered/sold/achievement/p2p).
//   2. BROADCAST firehose — computed at read time off the shared `events` table
//      joined to who/what you follow ("people/projects you follow did X"). Never
//      stored, so high-follower accounts cost zero rows.
//
// Private: enforced in app code (recipient === authed address) on the
// service-role client, since SIWE gives us no Supabase-Auth identity for RLS.

import { NextResponse } from 'next/server';
import { getSupabaseService, type PingRow } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { serverError } from '@/lib/errors';
import { fromPingRow, type FeedItem } from '@/lib/pings/render';
import { getBroadcastContext, listBroadcastFeed } from '@/lib/pings/broadcast';

export const dynamic = 'force-dynamic';

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface PingsListResponse {
  /** Directed (to-you) unread — drives the live badge via the count poll. */
  directed_unread: number;
  /** Broadcast (follow-feed) unread — refreshed only on a full fetch. */
  broadcast_unread: number;
  items: FeedItem[];
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

    // ── Directed pings ──
    let q = db
      .from('pings')
      .select('*')
      .eq('recipient_address', address)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (cursor) q = q.lt('created_at', cursor);
    const { data, error } = await q;
    if (error) return serverError(error.message);
    const directed = (data ?? []) as PingRow[];

    const { count: directedUnread, error: countErr } = await db
      .from('pings')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_address', address)
      .eq('read', false);
    if (countErr) return serverError(countErr.message);

    // ── Broadcast firehose (read-time, no stored rows) ──
    const bctx = await getBroadcastContext(db, address);
    const broadcast = bctx.empty ? [] : await listBroadcastFeed(db, address, bctx, limit);
    // Derive broadcast unread from the SAME items we return, so the badge can
    // never show unread that isn't visible (the count + list applied different
    // filters otherwise — viewer's own buys / muted-buyer XFER edge cases).
    const broadcastUnread = broadcast.filter((b) => !b.read).length;

    // ── Merge, newest first, cap to limit ──
    const items: FeedItem[] = [...directed.map(fromPingRow), ...broadcast].sort((a, b) =>
      a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0
    );

    const response: PingsListResponse = {
      directed_unread: directedUnread ?? 0,
      broadcast_unread: broadcastUnread,
      items: items.slice(0, limit),
      // Pagination cursor follows the directed stream (the durable one).
      next_cursor:
        directed.length === limit ? directed[directed.length - 1].created_at : null,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
