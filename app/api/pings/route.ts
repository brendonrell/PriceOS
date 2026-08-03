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

/** Gap (ms) that counts as "away" — a summary rolls up what mattered. */
const AWAY_GAP_MS = 36 * 3600_000;
/** Don't bother summarizing fewer than this many unread pings. */
const AWAY_MIN_ITEMS = 5;

/** On the first read after a 36h-plus gap, drop ONE rollup ping on top of the
 *  inbox ("While you were away: …") summarizing the unread that piled up.
 *  Inbox-only by design — the user is already here, so it never pushes.
 *  The gap clock is ping_cursors.updated_at (bumped by read actions and by
 *  this summary itself, so at most one rollup per gap). Best-effort. */
async function maybeAwaySummary(db: ReturnType<typeof getSupabaseService>, address: string): Promise<void> {
  try {
    const { data: cRow } = await db
      .from('ping_cursors')
      .select('updated_at')
      .eq('user_address', address)
      .maybeSingle();
    const lastSeen = (cRow as { updated_at: string } | null)?.updated_at ?? null;
    if (!lastSeen) return; // brand-new user — nothing to summarize against
    if (Date.now() - Date.parse(lastSeen) < AWAY_GAP_MS) return;

    const { data: rows } = await db
      .from('pings')
      .select('kind, data')
      .eq('recipient_address', address)
      .eq('read', false)
      .gt('created_at', lastSeen)
      .limit(500);
    const unread = (rows ?? []) as Array<{ kind: string; data: Record<string, unknown> | null }>;
    // Never count a previous rollup, and stamp the clock even when quiet so
    // the check doesn't re-run every fetch.
    const counted = unread.filter((r) => !(r.kind === 'PING' && r.data?.away === true));

    if (counted.length >= AWAY_MIN_ITEMS) {
      const offers = counted.filter((r) => ['OFFER', 'OFFER_ACCEPTED', 'COUNTER'].includes(r.kind)).length;
      const sales = counted.filter((r) => r.kind === 'SALE').length;
      const interest = counted.filter((r) => r.kind === 'WATCH_HIT' || r.kind === 'WISHLIST_HIT').length;
      const social = counted.filter((r) => ['FOLLOW', 'PROJECT_FOLLOW', 'OUTPUT_FOLLOW'].includes(r.kind)).length;
      const parts: string[] = [];
      if (offers) parts.push(`${offers} offer${offers === 1 ? '' : 's'}`);
      if (sales) parts.push(`${sales} sale${sales === 1 ? '' : 's'}`);
      if (interest) parts.push(`${interest} starred move${interest === 1 ? '' : 's'}`);
      if (social) parts.push(`${social} social`);
      const rest = counted.length - offers - sales - interest - social;
      if (rest > 0) parts.push(`${rest} more`);
      const text = `While you were away: ${parts.slice(0, 3).join(' · ')}`;

      const { error } = await db.from('pings').insert({
        recipient_address: address,
        kind: 'PING',
        data: { away: true, text, count: 1 },
        group_key: 'AWAY',
        read: false,
      } as never);
      // An unread AWAY rollup already on the pile → refresh it instead.
      if (error && (error as { code?: string }).code === '23505') {
        await db
          .from('pings')
          .update({ data: { away: true, text, count: 1 }, created_at: new Date().toISOString() } as never)
          .eq('recipient_address', address)
          .eq('group_key', 'AWAY')
          .eq('read', false);
      }
    }

    // Stamp the away clock WITHOUT touching the broadcast watermark.
    await db
      .from('ping_cursors')
      .update({ updated_at: new Date().toISOString() } as never)
      .eq('user_address', address);
  } catch {
    /* best-effort */
  }
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

    // One rollup ping tops the inbox after a long time away (inbox-only).
    await maybeAwaySummary(db, address);

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

    // Achievements never light the badge (Brendon, 2026-08-03: "no badge") —
    // the rolled row still rides `items` and waits in the inbox.
    const { count: directedUnread, error: countErr } = await db
      .from('pings')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_address', address)
      .eq('read', false)
      .neq('kind', 'ACHIEVEMENT');
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
