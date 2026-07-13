// GET /api/war — the war, read whole. Everything here is DERIVED off the
// marks chain + the sweep's war_state cache: collection states (Held / Siege
// / Stronghold / Conquered), grips per faction, the Book of Conquests (the
// game's only leaderboard — narrative, not numbers), titles, and grudges.
//
// Optional ?me=0x… adds that wallet's personal war record: oath, Spread
// (pieces carrying its mark), scars, titles held. The route is public like
// the ledger it derives from — IYKYK gating is a UI concern, not a data one.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export interface WarCollection {
  slug: string;
  status: string;
  leader: string | null;
  leaderSince: string | null;
  siege: string | null;
  siegeSince: string | null;
  conqueredBy: string | null;
  share: number;
  corners: number;
  factions: Record<string, { grip: number; members: number; pieces: number }>;
}

export interface BookEntry {
  age: number;
  kind: string;
  project: string | null;
  token: string | null;
  faction: string | null;
  rival: string | null;
  line: string;
  ts: string;
}

export interface WarResponse {
  age: { n: number; name: string };
  collections: WarCollection[];
  book: BookEntry[];
  titles: {
    wardens: { project: string; address: string; handle: string | null }[];
    firstBlood: { project: string; address: string; handle: string | null }[];
    struck: { address: string; handle: string | null; count: number }[];
  };
  grudges: { a: string; b: string; aTook: number; bTook: number; repelled: number }[];
  me?: {
    faction: string | null;
    swornAt: string | null;
    defections: number;
    cooldownUntil: string | null;
    spread: number;
    /** Collections carrying this wallet's ink (drives the map's Spread glow). */
    markedProjects: string[];
    marksStruck: number;
    inCrypt: number;
  } | null;
}

/** Corner ladder (spec §3: corners fall one at a time as hold lines are
 *  crossed; sweep all 4 = the piece flies one banner):
 *  1 Held · 2 Held 7d+ · 3 Stronghold · 4 Conquest taken or near-total grip. */
function cornersFor(status: string, leaderSince: string | null, share: number, conqueredBy: string | null, leader: string | null): number {
  if (!leader) return 0;
  let c = 1;
  if (leaderSince && Date.now() - Date.parse(leaderSince) >= 7 * 86400_000) c = 2;
  if (status === 'STRONGHOLD') c = 3;
  if ((conqueredBy && conqueredBy === leader) || share >= 0.85) c = 4;
  return c;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const db = getSupabaseService();
    const me = req.nextUrl.searchParams.get('me')?.toLowerCase() ?? null;

    const [wsRes, bookRes, ageRes] = await Promise.all([
      db.from('war_state').select('*'),
      db.from('book_of_conquests').select('age, kind, project_id, token_id, faction, rival, line, ts').order('ts', { ascending: false }).limit(120),
      db.from('war_meta').select('key, value').eq('key', 'age').maybeSingle(),
    ]);
    if (wsRes.error) return serverError(wsRes.error.message);

    const ageVal = (ageRes.data as { value?: { n?: number; name?: string } } | null)?.value;
    const age = { n: ageVal?.n ?? 1, name: ageVal?.name ?? 'THE FOUNDING' };

    const collections: WarCollection[] = ((wsRes.data ?? []) as Record<string, unknown>[]).map((w) => {
      const grips = (w.grips ?? {}) as { total?: number; share?: number; factions?: Record<string, { grip: number; members: number; pieces: number }> };
      const status = String(w.status ?? 'OPEN');
      const leader = (w.leader_faction as string | null) ?? null;
      const share = Number(grips.share ?? 0);
      return {
        slug: String(w.project_id),
        status,
        leader,
        leaderSince: (w.leader_since as string | null) ?? null,
        siege: (w.siege_faction as string | null) ?? null,
        siegeSince: (w.siege_since as string | null) ?? null,
        conqueredBy: (w.conquered_by as string | null) ?? null,
        share,
        corners: cornersFor(status, (w.leader_since as string | null) ?? null, share, (w.conquered_by as string | null) ?? null, leader),
        factions: grips.factions ?? {},
      };
    });

    const book: BookEntry[] = ((bookRes.data ?? []) as Record<string, unknown>[]).map((b) => ({
      age: Number(b.age ?? 1),
      kind: String(b.kind),
      project: (b.project_id as string | null) ?? null,
      token: (b.token_id as string | null) ?? null,
      faction: (b.faction as string | null) ?? null,
      rival: (b.rival as string | null) ?? null,
      line: String(b.line),
      ts: String(b.ts),
    }));

    // ── Titles (derived, never assigned) ────────────────────────────────────
    // Warden: the longest-standing holder anchoring each Stronghold.
    const strongholds = collections.filter((c) => c.status === 'STRONGHOLD' && c.leader);
    const wardens: WarResponse['titles']['wardens'] = [];
    if (strongholds.length > 0) {
      const slugs = strongholds.map((c) => c.slug);
      const [holdRes, oathRes] = await Promise.all([
        db.from('holders').select('project_id, owner_address, acquired_at').in('project_id', slugs),
        db.from('faction_oaths').select('address, faction'),
      ]);
      const oathBy = new Map(((oathRes.data ?? []) as { address: string; faction: string }[]).map((o) => [o.address.toLowerCase(), o.faction]));
      for (const c of strongholds) {
        let best: { address: string; at: number } | null = null;
        for (const h of ((holdRes.data ?? []) as { project_id: string; owner_address: string; acquired_at: string | null }[])) {
          if (h.project_id !== c.slug) continue;
          const addr = h.owner_address.toLowerCase();
          if (oathBy.get(addr) !== c.leader) continue;
          const at = h.acquired_at ? Date.parse(h.acquired_at) : Date.now();
          if (!best || at < best.at) best = { address: addr, at };
        }
        if (best) wardens.push({ project: c.slug, address: best.address, handle: null });
      }
    }

    // First Blood: the first SOLD mark struck in each collection's margins.
    const { data: fbData } = await db
      .from('marks')
      .select('project_id, owner_address, ts')
      .eq('kind', 'SOLD')
      .order('ts', { ascending: true })
      .limit(1000);
    const fbBy = new Map<string, { address: string }>();
    for (const m of ((fbData ?? []) as { project_id: string; owner_address: string }[])) {
      if (!fbBy.has(m.project_id)) fbBy.set(m.project_id, { address: m.owner_address });
    }
    const firstBlood = [...fbBy.entries()].map(([project, v]) => ({ project, address: v.address, handle: null as string | null }));

    // The Struck: crypt members — a badge of honour in reverse.
    const { data: cryptData } = await db.from('marks_crypt').select('owner_address');
    const struckCount = new Map<string, number>();
    for (const c of ((cryptData ?? []) as { owner_address: string }[])) {
      struckCount.set(c.owner_address, (struckCount.get(c.owner_address) ?? 0) + 1);
    }
    const struck = [...struckCount.entries()].map(([address, count]) => ({ address, handle: null as string | null, count }));

    // Resolve handles for every titled wallet in one users query.
    const addrs = new Set<string>();
    for (const w of wardens) addrs.add(w.address);
    for (const f of firstBlood) addrs.add(f.address);
    for (const s of struck) addrs.add(s.address);
    if (me) addrs.add(me);
    if (addrs.size > 0) {
      const { data: users } = await db.from('users').select('address, handle').in('address', [...addrs]);
      const handleBy = new Map(((users ?? []) as { address: string; handle: string | null }[]).map((u) => [u.address.toLowerCase(), u.handle]));
      for (const w of wardens) w.handle = handleBy.get(w.address) ?? null;
      for (const f of firstBlood) f.handle = handleBy.get(f.address) ?? null;
      for (const s of struck) s.handle = handleBy.get(s.address) ?? null;
    }

    // ── Grudges — head-to-head, pure derivation over the Book ───────────────
    const pair = new Map<string, { a: string; b: string; aTook: number; bTook: number; repelled: number }>();
    const { data: allBook } = await db.from('book_of_conquests').select('kind, faction, rival');
    for (const b of ((allBook ?? []) as { kind: string; faction: string | null; rival: string | null }[])) {
      if (!b.faction || !b.rival) continue;
      const [a, z] = [b.faction, b.rival].sort();
      const key = `${a}|${z}`;
      const g = pair.get(key) ?? { a, b: z, aTook: 0, bTook: 0, repelled: 0 };
      if (b.kind === 'CONQUEST') {
        if (b.faction === a) g.aTook += 1;
        else g.bTook += 1;
      } else if (b.kind === 'SIEGE_REPELLED') g.repelled += 1;
      pair.set(key, g);
    }

    // ── Personal war record ─────────────────────────────────────────────────
    let meOut: WarResponse['me'] = null;
    if (me) {
      const [oath, spread, crypt] = await Promise.all([
        db.from('faction_oaths').select('faction, sworn_at, defections, defected_at').eq('address', me).maybeSingle(),
        db.from('marks').select('project_id').eq('owner_address', me).eq('struck', false),
        db.from('marks_crypt').select('project_id', { count: 'exact', head: true }).eq('owner_address', me),
      ]);
      const o = oath.data as { faction: string; sworn_at: string; defections: number; defected_at: string | null } | null;
      const cooldownUntil = o?.defected_at
        ? new Date(Date.parse(o.defected_at) + 30 * 86400_000).toISOString()
        : null;
      const spreadRows = (spread.data ?? []) as { project_id: string }[];
      meOut = {
        faction: o?.faction ?? null,
        swornAt: o?.sworn_at ?? null,
        defections: o?.defections ?? 0,
        cooldownUntil: cooldownUntil && Date.parse(cooldownUntil) > Date.now() ? cooldownUntil : null,
        spread: spreadRows.length,
        markedProjects: [...new Set(spreadRows.map((r) => r.project_id))],
        marksStruck: 0,
        inCrypt: crypt.count ?? 0,
      };
    }

    const response: WarResponse = {
      age,
      collections,
      book,
      titles: { wardens, firstBlood, struck },
      grudges: [...pair.values()],
      me: meOut,
    };
    return NextResponse.json(response, { headers: { 'cache-control': 'public, max-age=30' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
