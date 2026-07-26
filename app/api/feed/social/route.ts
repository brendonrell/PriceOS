// Social activity feed ☻ — "what your friends are doing, in chronological
// order" (Brendon, 2026-07-26). Logged in: ledger events ACTED by the viewer's
// social graph, with mutuals outranking one-way follows whenever the window
// overflows the page. Logged out (or an empty graph): the top collectors by
// PriceScore, so the feed reads as the platform's social pulse out of the box.
// No user options, by design — one optimized feed for everyone.
//
// Event mapping mirrors /api/feed (the global ledger feed): MINT / LIST are
// themselves, a priced XFER presents as SALE, an Exchange settlement stays a
// TRADE-flagged XFER, OFFER stays off the typed feed.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, type EventRow, type EventType } from '@/lib/supabase';
import { attachHandles } from '@/lib/feed/handles';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** How the acting wallet relates to the viewer (null on the top-users feed). */
export type SocialRelation = 'mutual' | 'follow' | null;

export interface SocialEventRow extends EventRow {
  relation: SocialRelation;
}

export interface SocialFeedResponse {
  events: SocialEventRow[];
  /** 'graph' = the viewer's own follows; 'top' = the logged-out/empty-graph
      fallback (top collectors by PriceScore). */
  mode: 'graph' | 'top';
}

/* Caps: graph wallets per read (keeps the in-list queries sane), the raw
   event window the mutual-weighting selects from, the top-users fallback
   pool, and the returned page. */
const GRAPH_CAP = 120;
const WINDOW = 200;
const TOP_USERS = 50;
const DEFAULT_LIMIT = 60;

interface DbEvent {
  id: string;
  type: string;
  project_id: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  price_eth: number | string | null;
  sale_direction?: string | null;
  timestamp: number | string;
}

const EVENT_SELECT =
  'id, type, project_id, token_id, from_address, to_address, price_eth, sale_direction, timestamp';

/** Map a stored event to the typed API row, or null if it has no feed type.
 *  (Mirrors /api/feed — a trade never reads as a SALE.) */
function toEventRow(e: DbEvent): EventRow | null {
  let type: EventType;
  const isTrade = e.type === 'XFER' && e.sale_direction === 'TRADE';
  if (e.type === 'MINT') type = 'MINT';
  else if (e.type === 'LIST') type = 'LIST';
  else if (e.type === 'XFER') type = !isTrade && e.price_eth != null ? 'SALE' : 'XFER';
  else return null; // OFFER and anything else: off the typed feed.
  return {
    id: e.id,
    type,
    project_id: e.project_id,
    token_id: e.token_id != null ? `${e.project_id}-${e.token_id}` : null,
    from_address: e.from_address,
    to_address: e.to_address,
    price_eth: e.price_eth != null ? String(e.price_eth) : null,
    timestamp: new Date(Number(e.timestamp) * 1000).toISOString(),
    ...(isTrade ? { trade: true } : {}),
  };
}

/** The wallet a feed row credits — MINT/SALE credit the recipient, LIST/XFER
 *  the sender (same rule the feed sentences render by). */
function actorAddr(e: EventRow): string | null {
  const a = e.type === 'MINT' || e.type === 'SALE' ? e.to_address : e.from_address;
  return a ? a.toLowerCase() : null;
}

type Db = ReturnType<typeof getSupabaseService>;

/** The viewer's graph as wallet sets: mutuals + one-way follows. Null when the
 *  viewer has no handle or follows no one (→ the top-users fallback). */
async function graphAddresses(
  db: Db,
  viewer: string,
): Promise<{ mutual: Set<string>; follow: Set<string> } | null> {
  const { data: u, error: uErr } = await db
    .from('users')
    .select('handle')
    .eq('address', viewer)
    .maybeSingle();
  if (uErr) throw new Error(uErr.message);
  const handle = (u as { handle: string | null } | null)?.handle ?? null;
  if (!handle) return null;

  const [followingRes, followersRes] = await Promise.all([
    db
      .from('follows')
      .select('following_name')
      .eq('follower_name', handle)
      .order('created_at', { ascending: false })
      .limit(1000),
    db
      .from('follows')
      .select('follower_name')
      .eq('following_name', handle)
      .limit(1000),
  ]);
  if (followingRes.error) throw new Error(followingRes.error.message);
  if (followersRes.error) throw new Error(followersRes.error.message);

  const following = ((followingRes.data ?? []) as { following_name: string }[]).map(
    (r) => r.following_name,
  );
  if (following.length === 0) return null;
  const followerSet = new Set(
    ((followersRes.data ?? []) as { follower_name: string }[]).map((r) => r.follower_name),
  );
  // Mutuals first, then most-recent follows, capped — the cap trims the
  // weakest ties, never a mutual before a one-way follow.
  const mutualNames = following.filter((n) => followerSet.has(n));
  const oneWayNames = following.filter((n) => !followerSet.has(n));
  const names = [...mutualNames, ...oneWayNames].slice(0, GRAPH_CAP);

  const { data: users, error } = await db
    .from('users')
    .select('address, handle')
    .in('handle', names);
  if (error) throw new Error(error.message);

  const mutualNameSet = new Set(mutualNames);
  const mutual = new Set<string>();
  const follow = new Set<string>();
  for (const row of (users ?? []) as { address: string | null; handle: string | null }[]) {
    const a = row.address?.toLowerCase();
    if (!a || !row.handle) continue;
    (mutualNameSet.has(row.handle) ? mutual : follow).add(a);
  }
  return mutual.size + follow.size > 0 ? { mutual, follow } : null;
}

/** Top collectors by PriceScore — the logged-out / empty-graph feed source. */
async function topAddresses(db: Db): Promise<Set<string>> {
  const { data, error } = await db
    .from('users')
    .select('address, handle, price_score, created_at')
    .not('handle', 'is', null)
    .gt('price_score', 0)
    .order('price_score', { ascending: false })
    .order('created_at', { ascending: true })
    .limit(TOP_USERS);
  if (error) throw new Error(error.message);
  return new Set(
    ((data ?? []) as { address: string }[]).map((r) => r.address.toLowerCase()),
  );
}

/** Newest ledger events touching any of the wallets, either side, deduped. */
async function eventsFor(db: Db, addrs: string[]): Promise<EventRow[]> {
  const [fromRes, toRes] = await Promise.all([
    db
      .from('events')
      .select(EVENT_SELECT)
      .in('from_address', addrs)
      .order('timestamp', { ascending: false })
      .limit(WINDOW),
    db
      .from('events')
      .select(EVENT_SELECT)
      .in('to_address', addrs)
      .order('timestamp', { ascending: false })
      .limit(WINDOW),
  ]);
  if (fromRes.error) throw new Error(fromRes.error.message);
  if (toRes.error) throw new Error(toRes.error.message);
  const byId = new Map<string, DbEvent>();
  for (const e of [
    ...((fromRes.data ?? []) as DbEvent[]),
    ...((toRes.data ?? []) as DbEvent[]),
  ]) {
    byId.set(e.id, e);
  }
  return [...byId.values()]
    .map(toEventRow)
    .filter((e): e is EventRow => e !== null)
    .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
    .slice(0, WINDOW);
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT))));
  const viewer = url.searchParams.get('viewer')?.toLowerCase() ?? null;
  if (viewer !== null && !ADDRESS_RE.test(viewer)) {
    return badRequest('Invalid `?viewer=` address');
  }

  try {
    const db = getSupabaseService();
    const graph = viewer ? await graphAddresses(db, viewer) : null;

    if (graph) {
      const rows = await eventsFor(db, [...graph.mutual, ...graph.follow]);
      // Only rows the graph ACTED in — "what your friends are doing". A trade
      // has two actors, so either side in the graph qualifies it.
      const kept: SocialEventRow[] = [];
      for (const e of rows) {
        const actor = actorAddr(e);
        const other = (e.type === 'MINT' || e.type === 'SALE' ? e.from_address : e.to_address)?.toLowerCase() ?? null;
        let relation: SocialRelation = null;
        if (actor && graph.mutual.has(actor)) relation = 'mutual';
        else if (actor && graph.follow.has(actor)) relation = 'follow';
        else if (e.trade && other) {
          if (graph.mutual.has(other)) relation = 'mutual';
          else if (graph.follow.has(other)) relation = 'follow';
        }
        if (relation) kept.push({ ...e, relation });
      }
      // Mutual weighting: when the window overflows the page, every mutual row
      // is protected first, one-way follows fill the rest — then the page
      // re-sorts chronological so it always READS as one timeline.
      let page: SocialEventRow[];
      if (kept.length <= limit) {
        page = kept;
      } else {
        const mutualRows = kept.filter((e) => e.relation === 'mutual');
        const followRows = kept.filter((e) => e.relation !== 'mutual');
        page = mutualRows.slice(0, limit);
        if (page.length < limit) page = page.concat(followRows.slice(0, limit - page.length));
        page.sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp));
      }
      await attachHandles(db, page);
      return NextResponse.json({ events: page, mode: 'graph' } satisfies SocialFeedResponse);
    }

    // Top-users fallback — logged out, unclaimed, or an empty graph.
    const top = await topAddresses(db);
    const rows = top.size > 0 ? await eventsFor(db, [...top]) : [];
    const page: SocialEventRow[] = rows
      .filter((e) => {
        const actor = actorAddr(e);
        return actor !== null && top.has(actor);
      })
      .slice(0, limit)
      .map((e) => ({ ...e, relation: null as SocialRelation }));
    await attachHandles(db, page);
    return NextResponse.json({ events: page, mode: 'top' } satisfies SocialFeedResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
