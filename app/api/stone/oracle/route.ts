import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stone/oracle — the Command Stone's ledger questions, one door
 * (the abilities pass, 2026-07-28). Every read is the same anon (RLS-bound)
 * grant the tag-members route rides; aggregation is in-memory over the
 * young platform's small tables (the /api/tags/members precedent).
 *
 *   ?kind=first-mint[&me=0x…]   — the platform's first mint ever, or yours
 *   ?kind=release&slug=…        — when a project first minted (+ count since)
 *   ?kind=spenders&n=15         — top spenders on the platform (mints + buys)
 *   ?kind=rank&cohort=mutuals|followers&me=0x…&by=spent|age&n=20
 *   ?kind=holders&slug=…        — who holds each piece of a project
 *
 * The superpower pass (2026-07-28):
 *   &holding=<slug>             — composes spenders/rank with ownership
 *                                 ("top 5 spenders who hold teletext")
 *   ?kind=pace&slug=…           — sellout arithmetic: mint count + 7-day rate
 *   ?kind=mutuals&me=0x…        — the viewer's full mutual list (for slices)
 */

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;
const SLUG_RE = /^[a-z0-9-]{1,64}$/;

export interface OracleMint {
  project_id: string;
  token_id: number | null;
  to_address: string;
  handle: string | null;
  price_eth: number | null;
  /** Unix seconds. */
  timestamp: number;
}

export interface OracleFirstMintResponse {
  mine: boolean;
  mint: OracleMint | null;
}

export interface OracleReleaseResponse {
  slug: string;
  /** Unix seconds of the first mint, or null (nothing minted yet). */
  first_ts: number | null;
  minted: number;
}

export interface OracleRankRow {
  address: string;
  handle: string | null;
  /** ETH spent (by=spent) — absent for by=age. */
  spent_eth?: number;
  /** Account creation ISO (by=age) — absent for by=spent. */
  created_at?: string | null;
}

export interface OracleRankResponse {
  cohort: 'spenders' | 'mutuals' | 'followers';
  by: 'spent' | 'age';
  rows: OracleRankRow[];
}

export interface OracleHolderRow {
  token_id: number;
  owner_address: string;
  handle: string | null;
}

export interface OracleHoldersResponse {
  slug: string;
  rows: OracleHolderRow[];
}

export interface OraclePaceResponse {
  slug: string;
  minted: number;
  /** Unix seconds of the first mint, or null. */
  first_ts: number | null;
  /** Mints inside the trailing 7 days. */
  last7: number;
}

export interface OracleMutualsResponse {
  rows: Array<{ address: string; handle: string | null }>;
}

type DB = ReturnType<typeof getSupabaseAnon>;

/** ETH paid out per wallet across mints + priced buys — the tag-members
    route's exact aggregation (the receiving side of MINT/SALE). */
async function spentByAddress(db: DB): Promise<Map<string, number>> {
  const res = await db.from('events').select('type, to_address, price_eth');
  if (res.error) throw new Error(res.error.message);
  const spent = new Map<string, number>();
  for (const e of (res.data ?? []) as Array<{ type: string; to_address: string | null; price_eth: string | number | null }>) {
    if (e.type !== 'MINT' && e.type !== 'SALE') continue;
    const a = (e.to_address ?? '').toLowerCase();
    const v = e.price_eth == null ? NaN : Number(e.price_eth);
    if (!a || !Number.isFinite(v) || v <= 0) continue;
    spent.set(a, (spent.get(a) ?? 0) + v);
  }
  return spent;
}

async function handlesFor(db: DB, addresses: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (addresses.length === 0) return out;
  const res = await db.from('users').select('address, handle').in('address', addresses);
  for (const u of (res.data ?? []) as Array<{ address: string; handle: string | null }>) {
    out.set(u.address.toLowerCase(), u.handle);
  }
  return out;
}

async function handleOf(db: DB, address: string): Promise<string | null> {
  const { data } = await db.from('users').select('handle').eq('address', address).maybeSingle();
  return (data as { handle: string | null } | null)?.handle ?? null;
}

/** The wallets holding ≥1 piece of a project — the `holding=` composer. */
async function holderSetOf(db: DB, slug: string): Promise<Set<string>> {
  const res = await db.from('holders').select('owner_address').eq('project_id', slug);
  if (res.error) throw new Error(res.error.message);
  const out = new Set<string>();
  for (const r of (res.data ?? []) as Array<{ owner_address: string | null }>) {
    if (r.owner_address) out.add(r.owner_address.toLowerCase());
  }
  return out;
}

/** The viewer's mutual handles (follows both ways), resolved to users rows. */
async function mutualUsers(db: DB, me: string): Promise<Array<{ address: string; handle: string | null; created_at: string | null }>> {
  const myHandle = await handleOf(db, me);
  if (!myHandle) return [];
  const [followersRes, followingRes] = await Promise.all([
    db.from('follows').select('follower_name').eq('following_name', myHandle).limit(1000),
    db.from('follows').select('following_name').eq('follower_name', myHandle).limit(1000),
  ]);
  if (followersRes.error) throw new Error(followersRes.error.message);
  if (followingRes.error) throw new Error(followingRes.error.message);
  const following = new Set(
    ((followingRes.data ?? []) as Array<{ following_name: string }>).map((r) => r.following_name),
  );
  const names = ((followersRes.data ?? []) as Array<{ follower_name: string }>)
    .map((r) => r.follower_name)
    .filter((h) => following.has(h));
  if (names.length === 0) return [];
  const usersRes = await db.from('users').select('address, handle, created_at').in('handle', names);
  if (usersRes.error) throw new Error(usersRes.error.message);
  return ((usersRes.data ?? []) as Array<{ address: string; handle: string | null; created_at: string | null }>)
    .filter((u) => u.handle != null);
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

export async function GET(req: NextRequest): Promise<NextResponse> {
  const p = req.nextUrl.searchParams;
  const kind = p.get('kind') ?? '';
  const n = Math.max(1, Math.min(50, Number(p.get('n')) || 10));

  try {
    const db = getSupabaseAnon();

    /* ── first-mint — the genesis (platform or one wallet's) ─────────── */
    if (kind === 'first-mint') {
      const me = (p.get('me') ?? '').toLowerCase();
      if (me && !ADDRESS_RE.test(me)) return badRequest('Invalid `me` address');
      let q = db
        .from('events')
        .select('project_id, token_id, to_address, price_eth, timestamp')
        .eq('type', 'MINT')
        .order('timestamp', { ascending: true })
        .limit(1);
      if (me) q = q.eq('to_address', me);
      const res = await q;
      if (res.error) return serverError(res.error.message);
      const row = (res.data ?? [])[0] as {
        project_id: string; token_id: number | null; to_address: string | null;
        price_eth: string | number | null; timestamp: number;
      } | undefined;
      let mint: OracleMint | null = null;
      if (row && row.to_address) {
        const addr = row.to_address.toLowerCase();
        mint = {
          project_id: row.project_id,
          token_id: row.token_id,
          to_address: addr,
          handle: await handleOf(db, addr),
          price_eth: row.price_eth != null ? Number(row.price_eth) : null,
          timestamp: row.timestamp,
        };
      }
      return NextResponse.json({ mine: !!me, mint } satisfies OracleFirstMintResponse);
    }

    /* ── release — a project's first mint + the count since ──────────── */
    if (kind === 'release') {
      const slug = (p.get('slug') ?? '').toLowerCase();
      if (!SLUG_RE.test(slug)) return badRequest('Invalid slug');
      const [firstRes, countRes] = await Promise.all([
        db.from('events')
          .select('timestamp')
          .eq('type', 'MINT')
          .eq('project_id', slug)
          .order('timestamp', { ascending: true })
          .limit(1),
        db.from('events')
          .select('timestamp', { count: 'exact', head: true })
          .eq('type', 'MINT')
          .eq('project_id', slug),
      ]);
      if (firstRes.error) return serverError(firstRes.error.message);
      const first = (firstRes.data ?? [])[0] as { timestamp: number } | undefined;
      return NextResponse.json({
        slug,
        first_ts: first?.timestamp ?? null,
        minted: countRes.count ?? 0,
      } satisfies OracleReleaseResponse);
    }

    /* ── spenders — the platform's biggest wallets, by ETH paid out.
       `holding=<slug>` narrows to wallets holding that project. ──────── */
    if (kind === 'spenders') {
      const holdingSlug = (p.get('holding') ?? '').toLowerCase();
      if (holdingSlug && !SLUG_RE.test(holdingSlug)) return badRequest('Invalid holding slug');
      const spent = await spentByAddress(db);
      let entries = Array.from(spent.entries());
      if (holdingSlug) {
        const holders = await holderSetOf(db, holdingSlug);
        entries = entries.filter(([a]) => holders.has(a));
      }
      const top = entries
        .sort((a, b) => b[1] - a[1])
        .slice(0, n);
      const handles = await handlesFor(db, top.map(([a]) => a));
      const rows: OracleRankRow[] = top.map(([address, v]) => ({
        address,
        handle: handles.get(address) ?? null,
        spent_eth: round6(v),
      }));
      return NextResponse.json({ cohort: 'spenders', by: 'spent', rows } satisfies OracleRankResponse);
    }

    /* ── rank — the viewer's mutuals or followers, by spend or age.
       `holding=<slug>` narrows to holders of that project. ───────────── */
    if (kind === 'rank') {
      const cohort = p.get('cohort');
      const by = p.get('by') === 'age' ? 'age' : 'spent';
      const me = (p.get('me') ?? '').toLowerCase();
      const holdingSlug = (p.get('holding') ?? '').toLowerCase();
      if (cohort !== 'mutuals' && cohort !== 'followers') return badRequest('cohort must be mutuals|followers');
      if (!ADDRESS_RE.test(me)) return badRequest('Invalid `me` address');
      if (holdingSlug && !SLUG_RE.test(holdingSlug)) return badRequest('Invalid holding slug');

      let users: Array<{ address: string; handle: string | null; created_at: string | null }>;
      if (cohort === 'mutuals') {
        users = await mutualUsers(db, me);
      } else {
        const myHandle = await handleOf(db, me);
        if (!myHandle) {
          return NextResponse.json({ cohort, by, rows: [] } satisfies OracleRankResponse);
        }
        const followersRes = await db
          .from('follows').select('follower_name').eq('following_name', myHandle).limit(1000);
        if (followersRes.error) return serverError(followersRes.error.message);
        const names = ((followersRes.data ?? []) as Array<{ follower_name: string }>)
          .map((r) => r.follower_name);
        if (names.length === 0) {
          return NextResponse.json({ cohort, by, rows: [] } satisfies OracleRankResponse);
        }
        const usersRes = await db
          .from('users')
          .select('address, handle, created_at')
          .in('handle', names);
        if (usersRes.error) return serverError(usersRes.error.message);
        users = ((usersRes.data ?? []) as Array<{ address: string; handle: string | null; created_at: string | null }>)
          .filter((u) => u.handle != null);
      }
      if (holdingSlug) {
        const holders = await holderSetOf(db, holdingSlug);
        users = users.filter((u) => holders.has(u.address.toLowerCase()));
      }
      if (users.length === 0) {
        return NextResponse.json({ cohort, by, rows: [] } satisfies OracleRankResponse);
      }

      let rows: OracleRankRow[];
      if (by === 'age') {
        rows = users
          .sort((a, b) => (a.created_at ?? '9999').localeCompare(b.created_at ?? '9999'))
          .slice(0, n)
          .map((u) => ({ address: u.address.toLowerCase(), handle: u.handle, created_at: u.created_at }));
      } else {
        const spent = await spentByAddress(db);
        rows = users
          .map((u) => ({ u, v: spent.get(u.address.toLowerCase()) ?? 0 }))
          .sort((a, b) => b.v - a.v)
          .slice(0, n)
          .map(({ u, v }) => ({ address: u.address.toLowerCase(), handle: u.handle, spent_eth: round6(v) }));
      }
      return NextResponse.json({ cohort, by, rows } satisfies OracleRankResponse);
    }

    /* ── holders — every piece of a project + who holds it ───────────── */
    if (kind === 'holders') {
      const slug = (p.get('slug') ?? '').toLowerCase();
      if (!SLUG_RE.test(slug)) return badRequest('Invalid slug');
      const res = await db
        .from('holders')
        .select('token_id, owner_address')
        .eq('project_id', slug);
      if (res.error) return serverError(res.error.message);
      const raw = ((res.data ?? []) as Array<{ token_id: number | string; owner_address: string | null }>)
        .filter((r) => r.owner_address);
      const addrs = Array.from(new Set(raw.map((r) => (r.owner_address as string).toLowerCase())));
      const handles = await handlesFor(db, addrs);
      const rows: OracleHolderRow[] = raw
        .map((r) => {
          const owner = (r.owner_address as string).toLowerCase();
          return { token_id: Number(r.token_id), owner_address: owner, handle: handles.get(owner) ?? null };
        })
        .sort((a, b) => a.token_id - b.token_id);
      return NextResponse.json({ slug, rows } satisfies OracleHoldersResponse);
    }

    /* ── pace — sellout arithmetic: total mints + the trailing-7-day rate ── */
    if (kind === 'pace') {
      const slug = (p.get('slug') ?? '').toLowerCase();
      if (!SLUG_RE.test(slug)) return badRequest('Invalid slug');
      const weekAgo = Math.floor(Date.now() / 1000) - 7 * 86_400;
      const [firstRes, countRes, recentRes] = await Promise.all([
        db.from('events')
          .select('timestamp')
          .eq('type', 'MINT')
          .eq('project_id', slug)
          .order('timestamp', { ascending: true })
          .limit(1),
        db.from('events')
          .select('timestamp', { count: 'exact', head: true })
          .eq('type', 'MINT')
          .eq('project_id', slug),
        db.from('events')
          .select('timestamp', { count: 'exact', head: true })
          .eq('type', 'MINT')
          .eq('project_id', slug)
          .gte('timestamp', weekAgo),
      ]);
      if (firstRes.error) return serverError(firstRes.error.message);
      const first = (firstRes.data ?? [])[0] as { timestamp: number } | undefined;
      return NextResponse.json({
        slug,
        minted: countRes.count ?? 0,
        first_ts: first?.timestamp ?? null,
        last7: recentRes.count ?? 0,
      } satisfies OraclePaceResponse);
    }

    /* ── mutuals — the viewer's full mutual list (powers the overlaps) ── */
    if (kind === 'mutuals') {
      const me = (p.get('me') ?? '').toLowerCase();
      if (!ADDRESS_RE.test(me)) return badRequest('Invalid `me` address');
      const users = await mutualUsers(db, me);
      return NextResponse.json({
        rows: users.map((u) => ({ address: u.address.toLowerCase(), handle: u.handle })),
      } satisfies OracleMutualsResponse);
    }

    return badRequest('Unknown kind');
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'oracle failed');
  }
}
