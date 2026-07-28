// /api/user/[address]/sigil — the Sigil tab read: the mark's kin (the other
// forged sigils closest to this one) + the wallet's faction record and what
// its comrades have been doing (the Book, filtered to the flag).
//
// Kinship is pure derivation: every forged, visible mark is decomposed with
// sigilAnatomy (the exact sigilFor draw sequence) and scored on shared parts —
// same core is blood, then form, edges, companions, accents. Nothing is
// stored; the marks are deterministic from the addresses.
//
// Public read keyed on the address in the path (the Counterparties precedent).
// sigil_hidden stays a render-time gate exactly like everywhere else: hidden
// marks are excluded from every kin/roster read here, and the profile's own
// hidden flag is returned so the client can keep the mark owner-only.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { sigilAnatomy, type SigilAnatomy } from '@/lib/sigil/sigil';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;
const MAX_KIN = 8;
const MAX_BOOK = 20;
const MAX_COMRADES = 12;
/** A lone shared form isn't kin — blood starts at a shared core or better. */
const KIN_FLOOR = 3;

export interface SigilKinRow {
  address: string;
  handle: string | null;
  score: number;
  /** Reader-facing shared parts, strongest first — e.g. "CORE ✦". */
  shared: string[];
}

export interface SigilComradeRow {
  address: string;
  handle: string | null;
  sworn_at: string;
  /** Their mark is forged AND shown — the roster row may wear it. */
  forged: boolean;
}

export interface SigilFactionBlock {
  key: string;
  sworn_at: string | null;
  defections: number;
  members: number;
  /** Collections this faction currently leads. */
  held: number;
  strongholds: number;
  /** Sieges this faction is pressing right now. */
  sieges: number;
  /** Conquests written into the Book under this flag, all ages. */
  conquests: number;
  /** The Book, filtered to lines where this faction stood on either side. */
  book: { kind: string; line: string; ts: string; project: string | null }[];
  /** Longest-sworn first — the old guard. */
  comrades: SigilComradeRow[];
}

export interface SigilTabResponse {
  address: string;
  forged: boolean;
  hidden: boolean;
  /** Forged, visible marks on the platform (the kinship population). */
  forged_total: number;
  /** Share of that population wearing this mark's core / form (incl. self). */
  core_share: number | null;
  form_share: number | null;
  kin: SigilKinRow[];
  faction: SigilFactionBlock | null;
}

function kinship(mine: SigilAnatomy, theirs: SigilAnatomy): { score: number; shared: string[] } {
  let score = 0;
  const shared: string[] = [];
  const myCores = [mine.core, mine.core2].filter(Boolean) as string[];
  const theirCores = [theirs.core, theirs.core2].filter(Boolean) as string[];
  const coreHits = myCores.filter((c) => theirCores.includes(c));
  if (coreHits.length > 0) {
    score += 4 * coreHits.length;
    shared.push(...coreHits.map((c) => `CORE ${c}`));
  }
  if (mine.form === theirs.form) {
    score += 2;
    shared.push(`FORM ${mine.formName}`);
  }
  if (mine.edges && theirs.edges && mine.edges[0] === theirs.edges[0]) {
    score += 2;
    shared.push(`EDGES ${mine.edges[0]}${mine.edges[1]}`);
  }
  if (mine.side && theirs.side && mine.side === theirs.side) {
    score += 1;
    shared.push(`COMPANION ${mine.side}`);
  }
  if (mine.above && mine.above === theirs.above) score += 1;
  if (mine.below && mine.below === theirs.below) score += 1;
  return { score, shared };
}

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();

    const [meRes, forgedRes, oathRes] = await Promise.all([
      db.from('users')
        .select('sigil_forged_at, sigil_hidden')
        .eq('address', address)
        .maybeSingle(),
      db.from('users')
        .select('address, handle, sigil_hidden')
        .not('sigil_forged_at', 'is', null)
        .limit(1000),
      db.from('faction_oaths')
        .select('faction, sworn_at, defections')
        .eq('address', address)
        .maybeSingle(),
    ]);

    const me = meRes.data as { sigil_forged_at: string | null; sigil_hidden: boolean } | null;
    const forged = me?.sigil_forged_at != null;
    const hidden = me?.sigil_hidden === true;

    // ── Kinship — the marks closest to this one ─────────────────────────────
    const visible = ((forgedRes.data ?? []) as { address: string; handle: string | null; sigil_hidden: boolean }[])
      .filter((u) => !u.sigil_hidden);
    const forgedTotal = visible.length;

    let coreShare: number | null = null;
    let formShare: number | null = null;
    let kin: SigilKinRow[] = [];
    if (forged && forgedTotal > 0) {
      const mine = sigilAnatomy(address);
      let coreCount = 0;
      let formCount = 0;
      const scored: SigilKinRow[] = [];
      for (const u of visible) {
        const other = u.address.toLowerCase();
        const an = sigilAnatomy(other);
        if (an.core === mine.core || an.core2 === mine.core) coreCount += 1;
        if (an.form === mine.form) formCount += 1;
        if (other === address) continue;
        const { score, shared } = kinship(mine, an);
        if (score >= KIN_FLOOR) scored.push({ address: other, handle: u.handle, score, shared });
      }
      // Population shares include this mark itself; a hidden own mark joins
      // the population count without ever being listed for others.
      const selfVisible = visible.some((u) => u.address.toLowerCase() === address);
      const pop = selfVisible ? forgedTotal : forgedTotal + 1;
      coreShare = (coreCount + (selfVisible ? 0 : 1)) / pop;
      formShare = (formCount + (selfVisible ? 0 : 1)) / pop;
      kin = scored.sort((a, b) => (b.score - a.score) || a.address.localeCompare(b.address)).slice(0, MAX_KIN);
    }

    // ── The faction record ──────────────────────────────────────────────────
    const oath = oathRes.data as { faction: string; sworn_at: string | null; defections: number } | null;
    let faction: SigilFactionBlock | null = null;
    if (oath?.faction) {
      const key = oath.faction;
      const [membersRes, warRes, bookRes, conquestsRes, comradesRes] = await Promise.all([
        db.from('faction_oaths')
          .select('*', { count: 'exact', head: true })
          .eq('faction', key),
        db.from('war_state')
          .select('project_id, status, leader_faction, siege_faction'),
        db.from('book_of_conquests')
          .select('kind, line, ts, project_id, faction, rival')
          .or(`faction.eq.${key},rival.eq.${key}`)
          .order('ts', { ascending: false })
          .limit(MAX_BOOK),
        db.from('book_of_conquests')
          .select('*', { count: 'exact', head: true })
          .eq('kind', 'CONQUEST')
          .eq('faction', key),
        db.from('faction_oaths')
          .select('address, sworn_at')
          .eq('faction', key)
          .order('sworn_at', { ascending: true })
          .limit(MAX_COMRADES),
      ]);

      let held = 0, strongholds = 0, sieges = 0;
      for (const w of ((warRes.data ?? []) as { status: string | null; leader_faction: string | null; siege_faction: string | null }[])) {
        if (w.leader_faction === key) {
          held += 1;
          if (w.status === 'STRONGHOLD') strongholds += 1;
        }
        if (w.siege_faction === key) sieges += 1;
      }

      const comradeRows = (comradesRes.data ?? []) as { address: string; sworn_at: string }[];
      const comrades: SigilComradeRow[] = comradeRows.map((c) => ({
        address: c.address.toLowerCase(),
        handle: null,
        sworn_at: c.sworn_at,
        forged: false,
      }));
      if (comrades.length > 0) {
        const { data: users } = await db
          .from('users')
          .select('address, handle, sigil_forged_at, sigil_hidden')
          .in('address', comrades.map((c) => c.address));
        const byAddr = new Map(((users ?? []) as { address: string; handle: string | null; sigil_forged_at: string | null; sigil_hidden: boolean }[])
          .map((u) => [u.address.toLowerCase(), u]));
        for (const c of comrades) {
          const u = byAddr.get(c.address);
          c.handle = u?.handle ?? null;
          c.forged = u?.sigil_forged_at != null && u?.sigil_hidden !== true;
        }
      }

      faction = {
        key,
        sworn_at: oath.sworn_at ?? null,
        defections: oath.defections ?? 0,
        members: membersRes.count ?? 0,
        held,
        strongholds,
        sieges,
        conquests: conquestsRes.count ?? 0,
        book: ((bookRes.data ?? []) as { kind: string; line: string; ts: string; project_id: string | null }[])
          .map((b) => ({ kind: b.kind, line: b.line, ts: b.ts, project: b.project_id ?? null })),
        comrades,
      };
    }

    // Kin handles may be stale-null on users rows created pre-handle; they
    // arrive from the same users read, so nothing extra to resolve.
    const response: SigilTabResponse = {
      address,
      forged,
      hidden,
      forged_total: forgedTotal,
      core_share: coreShare,
      form_share: formShare,
      kin,
      faction,
    };
    return NextResponse.json(response, { headers: { 'cache-control': 'public, max-age=30' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
