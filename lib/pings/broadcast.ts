// lib/pings/broadcast.ts — server-only. The follow-feed firehose.
//
// "People and projects you follow did X." This stream is NEVER materialised —
// it's computed at read time off the shared `events` table joined to the
// viewer's follow graph, so a high-follower account acting writes ZERO rows.
// Unread is a single per-user watermark (ping_cursors.broadcast_seen_at), not a
// row per (viewer × event).

import { getSupabaseService } from '@/lib/supabase';
import type { FeedItem, RenderKind } from '@/lib/pings/render';

type DB = ReturnType<typeof getSupabaseService>;

export interface BroadcastContext {
  /** Addresses of people the viewer follows (for events.from_address). */
  followingAddresses: string[];
  /** Project ids the viewer follows (for events.project_id). */
  followedProjectIds: string[];
  /** Addresses the viewer muted (excluded from the feed). */
  mutedAddresses: string[];
  /** Unread watermark — unix seconds. Events newer than this are unread. */
  cursor: number;
  /** True when the viewer follows nothing → no broadcast feed at all. */
  empty: boolean;
}

const EVENT_KIND: Record<string, RenderKind> = {
  MINT: 'MINT',
  LIST: 'LIST',
  OFFER: 'OFFER',
  XFER: 'XFER',
};

/** Resolve everything needed to assemble the viewer's broadcast feed. */
export async function getBroadcastContext(db: DB, viewer: string): Promise<BroadcastContext> {
  // (a) Who I follow — the follows graph is keyed by @name, so resolve my
  //     handle → following @names → their addresses.
  const { data: meRow } = await db.from('users').select('handle').eq('address', viewer).maybeSingle();
  const myHandle = (meRow as { handle: string | null } | null)?.handle ?? null;

  let followingAddresses: string[] = [];
  if (myHandle) {
    const { data: fRows } = await db
      .from('follows')
      .select('following_name')
      .eq('follower_name', myHandle);
    const names = ((fRows ?? []) as Array<{ following_name: string | null }>)
      .map((r) => r.following_name)
      .filter((n): n is string => !!n);
    if (names.length > 0) {
      const { data: uRows } = await db.from('users').select('address').in('handle', names);
      followingAddresses = ((uRows ?? []) as Array<{ address: string }>).map((r) => r.address.toLowerCase());
    }
  }

  // (b) Projects I follow — keyed by address, works even pre-@name.
  const { data: pfRows } = await db
    .from('project_follows')
    .select('project_id')
    .eq('follower_address', viewer);
  const followedProjectIds = ((pfRows ?? []) as Array<{ project_id: string }>).map((r) => r.project_id);

  // (c) Muted actors.
  const { data: mRows } = await db.from('muted').select('muted_address').eq('user_address', viewer);
  const mutedAddresses = ((mRows ?? []) as Array<{ muted_address: string }>).map((r) => r.muted_address.toLowerCase());

  // (d) Unread watermark. Default to NOW for a user with no cursor row yet, so
  //     a brand-new viewer doesn't see their entire follow history as unread on
  //     first load — only activity from this moment forward counts as unread.
  const { data: cRow } = await db
    .from('ping_cursors')
    .select('broadcast_seen_at')
    .eq('user_address', viewer)
    .maybeSingle();
  const cursor =
    (cRow as { broadcast_seen_at: number } | null)?.broadcast_seen_at ??
    Math.floor(Date.now() / 1000);

  return {
    followingAddresses,
    followedProjectIds,
    mutedAddresses,
    cursor,
    empty: followingAddresses.length === 0 && followedProjectIds.length === 0,
  };
}

/** Build the OR filter: a followed person acted (as sender OR receiver), OR the
 *  event is on a followed project. Matching `to_address` is what lets "someone
 *  you follow just BOUGHT this" surface (a buy writes XFER from=seller,to=buyer). */
function visibilityOr(ctx: BroadcastContext): string | null {
  const parts: string[] = [];
  if (ctx.followingAddresses.length > 0) {
    parts.push(`from_address.in.(${ctx.followingAddresses.join(',')})`);
    parts.push(`to_address.in.(${ctx.followingAddresses.join(',')})`);
  }
  if (ctx.followedProjectIds.length > 0) {
    parts.push(`project_id.in.(${ctx.followedProjectIds.join(',')})`);
  }
  return parts.length > 0 ? parts.join(',') : null;
}

interface EventRowLite {
  id: string;
  type: string;
  project_id: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  price_eth: number | null;
  timestamp: number;
}

/** The viewer's broadcast feed as FeedItems (already actor/project resolved). */
export async function listBroadcastFeed(
  db: DB,
  viewer: string,
  ctx: BroadcastContext,
  limit: number
): Promise<FeedItem[]> {
  const or = visibilityOr(ctx);
  if (!or) return [];

  let q = db
    .from('events')
    .select('id, type, project_id, token_id, from_address, to_address, price_eth, timestamp')
    .or(or)
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (ctx.mutedAddresses.length > 0) {
    q = q.not('from_address', 'in', `(${ctx.mutedAddresses.join(',')})`);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  const events = data as unknown as EventRowLite[];
  if (events.length === 0) return [];

  const followingSet = new Set(ctx.followingAddresses.map((a) => a.toLowerCase()));
  const mutedSet = new Set(ctx.mutedAddresses.map((a) => a.toLowerCase()));

  // Decide the SOCIAL actor + kind per event. A buy is an XFER (from=seller,
  // to=buyer): if the buyer is someone you follow, surface it as "bought".
  function resolve(e: EventRowLite): { actor: string | null; kind: RenderKind } {
    const from = e.from_address?.toLowerCase() ?? null;
    const to = e.to_address?.toLowerCase() ?? null;
    if (e.type === 'XFER' && to && followingSet.has(to)) {
      return { actor: to, kind: 'SALE' }; // someone you follow bought it
    }
    return { actor: from, kind: (EVENT_KIND[e.type] ?? 'XFER') as RenderKind };
  }

  // Batch-resolve actor + project @names (one query each, both sides covered).
  const addrs = Array.from(
    new Set(events.flatMap((e) => [e.from_address, e.to_address]).filter((a): a is string => !!a).map((a) => a.toLowerCase()))
  );
  const projIds = Array.from(new Set(events.map((e) => e.project_id).filter(Boolean)));

  const [actorRes, projRes] = await Promise.all([
    addrs.length
      ? db.from('users').select('address, handle').in('address', addrs)
      : Promise.resolve({ data: [] as Array<{ address: string; handle: string | null }> }),
    projIds.length
      ? db.from('projects').select('id, handle').in('id', projIds)
      : Promise.resolve({ data: [] as Array<{ id: string; handle: string | null }> }),
  ]);

  const actorName = new Map<string, string | null>();
  ((actorRes.data ?? []) as Array<{ address: string; handle: string | null }>).forEach((u) =>
    actorName.set(u.address.toLowerCase(), u.handle)
  );
  const projHandle = new Map<string, string | null>();
  ((projRes.data ?? []) as Array<{ id: string; handle: string | null }>).forEach((p) =>
    projHandle.set(p.id, p.handle)
  );

  return events
    .map((e) => {
      const { actor, kind } = resolve(e);
      // Never show the viewer's own action, or one whose actor they muted.
      if (!actor || actor === viewer || mutedSet.has(actor)) return null;
      return {
        id: `bcast:${e.id}`,
        kind,
        source: 'broadcast' as const,
        actor_name: actorName.get(actor) ?? null,
        project_id: e.project_id,
        token_id: e.token_id,
        amount_eth: e.price_eth != null ? String(e.price_eth) : null,
        data: { project_handle: projHandle.get(e.project_id) ?? null },
        read: e.timestamp <= ctx.cursor,
        created_at: new Date(e.timestamp * 1000).toISOString(),
      } as FeedItem;
    })
    .filter((x): x is FeedItem => x !== null);
}

// Broadcast unread is derived from listBroadcastFeed's returned items (their
// per-item `read` flag vs the cursor) so the badge always matches what's shown
// — see app/api/pings/route.ts. (A separate count query diverged from the list
// on viewer-own-buy / muted-buyer XFER edge cases.)
