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

/** An album a graph member shelved — the feed's album block. Albums are
 *  numbered, never named (the shelf position IS the identity). */
export interface SocialAlbumRow {
  owner_handle: string;
  owner_address: string;
  relation: SocialRelation;
  /** 1-based position on the owner's shelf. */
  position: number;
  /** Total pieces in the album. */
  count: number;
  /** Leading members, `${slug}:${id}` (≤8) — the strip the feed shows. */
  keys: string[];
  /** Shelved moment (Unix ms). */
  created_at: number;
}

export interface SocialFeedResponse {
  events: SocialEventRow[];
  /** Recent albums shelved by the same wallets — merged into the timeline
      client-side by their shelved moment. */
  albums: SocialAlbumRow[];
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
/* Album blocks per page + strip length; an album needs ≥2 pieces to show
   (a one-piece shelf isn't a story yet). */
const ALBUM_CAP = 8;
const ALBUM_STRIP = 8;
const ALBUM_MIN_PIECES = 2;

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

/** Recent albums shelved by the wallets — read out of each user's settings
 *  envelope (`settings->albums`). Album sharing ships HERE (Brendon,
 *  2026-07-26): the feed is the first surface where a friend's shelf shows. */
async function albumsFor(
  db: Db,
  addrs: string[],
  relationOf: (addr: string) => SocialRelation,
): Promise<SocialAlbumRow[]> {
  const { data, error } = await db
    .from('users')
    .select('address, handle, albums:settings->albums')
    .in('address', addrs)
    .not('handle', 'is', null);
  if (error) throw new Error(error.message);

  const out: SocialAlbumRow[] = [];
  for (const row of (data ?? []) as {
    address: string;
    handle: string | null;
    albums: unknown;
  }[]) {
    if (!row.handle || !Array.isArray(row.albums)) continue;
    const addr = row.address.toLowerCase();
    (row.albums as { keys?: unknown; created_at?: unknown }[]).forEach((a, i) => {
      const keys = Array.isArray(a?.keys) ? (a.keys as string[]).filter((k) => typeof k === 'string') : [];
      const created = typeof a?.created_at === 'number' ? a.created_at : 0;
      if (keys.length < ALBUM_MIN_PIECES || created <= 0) return;
      out.push({
        owner_handle: row.handle!,
        owner_address: addr,
        relation: relationOf(addr),
        position: i + 1,
        count: keys.length,
        keys: keys.slice(0, ALBUM_STRIP),
        created_at: created,
      });
    });
  }
  return out.sort((a, b) => b.created_at - a.created_at).slice(0, ALBUM_CAP);
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

/* Anonymous default page — the top-collectors fallback, extracted so the
   home page's server render can seed SocialFeed with it directly (Brendon,
   2026-08-26: the client always opened on ghost rows on a fresh page load,
   even though this exact page always has content — same "seed the first
   paint" fix already applied to the rest of the home data). GET's own
   logged-out/empty-graph branch below just calls this now. */
export async function buildAnonymousSocialFeed(limit: number = DEFAULT_LIMIT): Promise<SocialFeedResponse> {
  const db = getSupabaseService();
  const top = await topAddresses(db);
  const [rows, albums] = top.size > 0
    ? await Promise.all([
        eventsFor(db, [...top]),
        albumsFor(db, [...top], () => null),
      ])
    : [[] as EventRow[], [] as SocialAlbumRow[]];
  const page: SocialEventRow[] = rows
    .filter((e) => {
      const actor = actorAddr(e);
      return actor !== null && top.has(actor);
    })
    .slice(0, limit)
    .map((e) => ({ ...e, relation: null as SocialRelation }));
  await attachHandles(db, page);
  return { events: page, albums, mode: 'top' };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT))));
  const viewer = url.searchParams.get('viewer')?.toLowerCase() ?? null;
  if (viewer !== null && !ADDRESS_RE.test(viewer)) {
    return badRequest('Invalid `?viewer=` address');
  }
  /* Scoped lenses (Brendon, 2026-08-02 — "the social version of the feed" on
     project galleries; 2026-08-03 — the artist showcase): `?actor=` narrows to
     ONE wallet's story, `?project=` to one project's outputs activity — or a
     comma list of slugs (the artist showcase: activity across ALL of that
     artist's projects). The relationship badges still read against the
     viewer's own graph. */
  const actor = url.searchParams.get('actor')?.toLowerCase() ?? null;
  const projectParam = url.searchParams.get('project') ?? null;
  const projectSlugs = projectParam ? projectParam.split(',').filter(Boolean).slice(0, 50) : null;
  if (actor !== null && !ADDRESS_RE.test(actor)) {
    return badRequest('Invalid `?actor=` address');
  }
  if (projectSlugs !== null && (projectSlugs.length === 0 || projectSlugs.some((s) => !/^[a-z0-9-]{1,64}$/.test(s)))) {
    return badRequest('Invalid `?project=` slug');
  }

  try {
    const db = getSupabaseService();

    if (actor || projectSlugs) {
      /* Best-effort graph read — badges only; a scoped lens never fails
         because the viewer's graph can't be read. */
      const graph = viewer ? await graphAddresses(db, viewer).catch(() => null) : null;
      const relationOf = (a: string): SocialRelation =>
        graph ? (graph.mutual.has(a) ? 'mutual' : graph.follow.has(a) ? 'follow' : null) : null;

      let rows: EventRow[];
      let albums: SocialAlbumRow[] = [];
      if (actor) {
        [rows, albums] = await Promise.all([
          eventsFor(db, [actor]),
          albumsFor(db, [actor], relationOf),
        ]);
      } else {
        const { data, error } = await db
          .from('events')
          .select(EVENT_SELECT)
          .in('project_id', projectSlugs!)
          .order('timestamp', { ascending: false })
          .limit(WINDOW);
        if (error) throw new Error(error.message);
        rows = ((data ?? []) as DbEvent[])
          .map(toEventRow)
          .filter((e): e is EventRow => e !== null);
      }
      const page: SocialEventRow[] = rows.slice(0, limit).map((e) => {
        const a = actorAddr(e);
        return { ...e, relation: a ? relationOf(a) : null };
      });
      await attachHandles(db, page);
      return NextResponse.json(
        { events: page, albums, mode: graph ? 'graph' : 'top' } satisfies SocialFeedResponse,
      );
    }

    const graph = viewer ? await graphAddresses(db, viewer) : null;

    if (graph) {
      const graphAddrs = [...graph.mutual, ...graph.follow];
      const relationOf = (a: string): SocialRelation =>
        graph.mutual.has(a) ? 'mutual' : graph.follow.has(a) ? 'follow' : null;
      const [rows, albums] = await Promise.all([
        eventsFor(db, graphAddrs),
        albumsFor(db, graphAddrs, relationOf),
      ]);
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
      return NextResponse.json({ events: page, albums, mode: 'graph' } satisfies SocialFeedResponse);
    }

    // Top-users fallback — logged out, unclaimed, or an empty graph.
    const anon = await buildAnonymousSocialFeed(limit);
    return NextResponse.json(anon satisfies SocialFeedResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
