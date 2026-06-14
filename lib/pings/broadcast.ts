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

  // (d) Unread watermark (default 0 → everything unread until first open).
  const { data: cRow } = await db
    .from('ping_cursors')
    .select('broadcast_seen_at')
    .eq('user_address', viewer)
    .maybeSingle();
  const cursor = (cRow as { broadcast_seen_at: number } | null)?.broadcast_seen_at ?? 0;

  return {
    followingAddresses,
    followedProjectIds,
    mutedAddresses,
    cursor,
    empty: followingAddresses.length === 0 && followedProjectIds.length === 0,
  };
}

/** Build the OR filter "from a followed person OR on a followed project". */
function visibilityOr(ctx: BroadcastContext): string | null {
  const parts: string[] = [];
  if (ctx.followingAddresses.length > 0) {
    parts.push(`from_address.in.(${ctx.followingAddresses.join(',')})`);
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
    .select('id, type, project_id, token_id, from_address, price_eth, timestamp')
    .or(or)
    .neq('from_address', viewer)
    .order('timestamp', { ascending: false })
    .limit(limit);
  if (ctx.mutedAddresses.length > 0) {
    q = q.not('from_address', 'in', `(${ctx.mutedAddresses.join(',')})`);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  const events = data as unknown as EventRowLite[];
  if (events.length === 0) return [];

  // Batch-resolve actor + project @names (one query each).
  const actorAddrs = Array.from(new Set(events.map((e) => e.from_address).filter((a): a is string => !!a)));
  const projIds = Array.from(new Set(events.map((e) => e.project_id).filter(Boolean)));

  const [actorRes, projRes] = await Promise.all([
    actorAddrs.length
      ? db.from('users').select('address, handle').in('address', actorAddrs)
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

  return events.map((e) => ({
    id: `bcast:${e.id}`,
    kind: (EVENT_KIND[e.type] ?? 'XFER') as RenderKind,
    source: 'broadcast' as const,
    actor_name: e.from_address ? actorName.get(e.from_address.toLowerCase()) ?? null : null,
    project_id: e.project_id,
    token_id: e.token_id,
    amount_eth: e.price_eth != null ? String(e.price_eth) : null,
    data: { project_handle: projHandle.get(e.project_id) ?? null },
    read: e.timestamp <= ctx.cursor,
    created_at: new Date(e.timestamp * 1000).toISOString(),
  }));
}

/** Cheap unread count for the broadcast stream (events newer than the cursor). */
export async function countBroadcastUnread(db: DB, viewer: string, ctx: BroadcastContext): Promise<number> {
  const or = visibilityOr(ctx);
  if (!or) return 0;

  let q = db
    .from('events')
    .select('id', { count: 'exact', head: true })
    .or(or)
    .neq('from_address', viewer)
    .gt('timestamp', ctx.cursor);
  if (ctx.mutedAddresses.length > 0) {
    q = q.not('from_address', 'in', `(${ctx.mutedAddresses.join(',')})`);
  }
  const { count, error } = await q;
  return error ? 0 : count ?? 0;
}
