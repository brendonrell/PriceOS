import { NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseService, type UserRow } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { teamStyleIndex } from '@/lib/tags/catalog';
import { deriveTags } from '@/lib/tags/derive';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tags/members?tag=<id> — everyone wearing one Profile Tag, with the
 * numbers you'd want to slice them by (Brendon, 2026-07-27: "tapping on a
 * profile tag pulls up a modal with all users with that tag that you can splice
 * a million ways").
 *
 * The tag set is worked out the SAME way it is on a profile: the raw facts go
 * through lib/tags/derive, so a colour, label or rule only ever lives in
 * lib/tags/catalog. Crucially that includes `shownTags` — a tag its owner has
 * not switched on is not shown here either, because this list must never
 * surface identity a user chose to keep dark.
 *
 * Numbers per member, all from real rows:
 *   • owned  — pieces held (the `holders` ledger)
 *   • spent  — ETH they've paid out on mints + buys (`events` where they were
 *              the receiving side and a price moved)
 *   • joined — account creation (the client renders it in the VIEWER's zone)
 * The Cabal slice is the viewer's own mutuals and is applied client-side —
 * this route stays public and viewer-agnostic.
 */

/** The platform is young; this bounds the scan without hiding anyone real. */
const USER_CAP = 500;

export interface TagMemberRow {
  handle: string;
  address: string;
  userNumber: number | null;
  createdAt: string | null;
  /** Pieces held right now. */
  owned: number;
  /** ETH paid out on mints + buys, as a number for sorting. */
  spentEth: number;
}

export interface TagMembersResponse {
  tag: string;
  /** The tag's own label, resolved the same way the chip is. */
  label: string | null;
  rows: TagMemberRow[];
}

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const tag = (new URL(req.url).searchParams.get('tag') ?? '').trim();
    if (!tag || tag.length > 64) return badRequest('tag required');

    const supabase = getSupabaseAnon();
    const usersRes = await supabase
      .from('users')
      .select('address, handle, profile_tags, granted_tags, user_number, price_held, price_hold_rank, created_at')
      .not('handle', 'is', null)
      .order('created_at', { ascending: true })
      .limit(USER_CAP);
    if (usersRes.error) return serverError(usersRes.error.message);

    const rows = (usersRes.data ?? []) as Array<Partial<UserRow> & { handle: string | null }>;
    const addresses = rows.map((u) => (u.address ?? '').toLowerCase()).filter(Boolean);
    if (addresses.length === 0) {
      return NextResponse.json({ tag, label: null, rows: [] } satisfies TagMembersResponse);
    }

    /* Artist (earned) — the whitelist, one read for the whole batch. */
    let artistAddrs = new Set<string>();
    try {
      const allow = await supabase.from('artist_allowlist').select('address').in('address', addresses);
      artistAddrs = new Set(((allow.data ?? []) as Array<{ address: string }>).map((a) => a.address.toLowerCase()));
    } catch { /* no allowlist read → nobody gets the Artist tag, never a 500 */ }

    /* Which tags each owner has switched ON — private envelope, service key,
       and only that one array is ever read from it. */
    const shownByAddr = new Map<string, string[]>();
    const offByAddr = new Map<string, string[]>();
    const styleByAddr = new Map<string, number>();
    try {
      const svc = getSupabaseService();
      const s = await svc.from('users').select('address, settings').in('address', addresses);
      for (const r of (s.data ?? []) as Array<{ address: string; settings?: { shownTags?: unknown; tagsOff?: unknown; teamTagStyle?: unknown } | null }>) {
        const a = r.address.toLowerCase();
        shownByAddr.set(a, strList(r.settings?.shownTags));
        offByAddr.set(a, strList(r.settings?.tagsOff));
        styleByAddr.set(a, teamStyleIndex(r.settings?.teamTagStyle));
      }
    } catch { /* leave empty — nobody's automatic tags show, the default anyway */ }

    /* The numbers. Both reads are whole-table scans of small tables; they are
       aggregated in memory rather than per-user round trips. */
    const owned = new Map<string, number>();
    const spent = new Map<string, number>();
    const [holdersRes, eventsRes] = await Promise.all([
      supabase.from('holders').select('owner_address'),
      supabase.from('events').select('type, to_address, price_eth'),
    ]);
    for (const h of ((holdersRes.data ?? []) as Array<{ owner_address: string | null }>)) {
      const a = (h.owner_address ?? '').toLowerCase();
      if (a) owned.set(a, (owned.get(a) ?? 0) + 1);
    }
    for (const e of ((eventsRes.data ?? []) as Array<{ type: string; to_address: string | null; price_eth: string | null }>)) {
      if (e.type !== 'MINT' && e.type !== 'SALE') continue;
      const a = (e.to_address ?? '').toLowerCase();
      const v = e.price_eth == null ? NaN : Number(e.price_eth);
      if (!a || !Number.isFinite(v) || v <= 0) continue;
      spent.set(a, (spent.get(a) ?? 0) + v);
    }

    let label: string | null = null;
    const out: TagMemberRow[] = [];
    for (const u of rows) {
      if (!u.handle) continue;
      const addr = (u.address ?? '').toLowerCase();
      if (!addr) continue;
      const tags = deriveTags({
        profileTags: strList(u.profile_tags),
        grantedTags: strList(u.granted_tags),
        userNumber: u.user_number ?? null,
        isArtist: artistAddrs.has(addr),
        createdAt: u.created_at ?? null,
        address: addr,
        handle: u.handle,
        teamTagStyle: styleByAddr.get(addr) ?? 0,
        priceHoldRank: u.price_hold_rank ?? null,
        priceHeld: u.price_held ?? null,
        shownTags: shownByAddr.get(addr) ?? [],
        tagsOff: offByAddr.get(addr) ?? [],
      });
      const hit = tags.find((t) => t.id === tag);
      if (!hit) continue;
      if (!label) label = hit.label;
      out.push({
        handle: u.handle.toLowerCase(),
        address: addr,
        userNumber: u.user_number ?? null,
        createdAt: u.created_at ?? null,
        owned: owned.get(addr) ?? 0,
        spentEth: Math.round((spent.get(addr) ?? 0) * 1e6) / 1e6,
      });
    }

    return NextResponse.json({ tag, label, rows: out } satisfies TagMembersResponse);
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'tag members failed');
  }
}
