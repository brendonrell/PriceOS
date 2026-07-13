// GET /api/war/piece?project=<slug>&token=<token_id> — one piece's Marginalia.
//
// The ceremony's data: the ordered margin (every hand that held it — sales
// deep, passes faint), the crypt (struck hands, permanent), the corner state
// (from the collection's war_state + the current holder's faction), and the
// worth reads (Untouched / Relic / Pedigree). Derived, read-only.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { MARGIN_SLOTS } from '@/lib/factions/factions';
import { composeResolved, composeSprite, type ResolvedSprite } from '@/lib/sprites/composer';
import type { PriceSpriteVibe } from '@/lib/sprites/vibes';
import { sigilFor } from '@/lib/sigil/sigil';

export const dynamic = 'force-dynamic';

export interface MarginHand {
  seq: number;
  address: string;
  handle: string | null;
  /** The hand's REAL PriceSprite face (frozen resolution when stored). */
  face: string;
  /** MINT = founding hand · SOLD = deep ink · PASSED = faint ghost. */
  kind: 'MINT' | 'SOLD' | 'PASSED';
  faction: string | null;
  ts: number;
}

export interface PieceWarResponse {
  project: string;
  token: string;
  margin: MarginHand[];
  crypt: { address: string; handle: string | null; originalSeq: number }[];
  slots: number;
  relic: boolean;
  untouched: boolean;
  holder: { address: string; handle: string | null; faction: string | null } | null;
  /** Corner state for THIS piece: how many corners have fallen, and to whom.
   *  Corners fly only when the piece's holder is in the collection's leading
   *  faction — the corner wears the holder's own mark. */
  corners: { count: number; faction: string | null; hex: string | null };
  collection: { status: string; leader: string | null; siege: string | null };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const project = req.nextUrl.searchParams.get('project');
    const token = req.nextUrl.searchParams.get('token');
    if (!project || !token) return badRequest('project and token required');

    const db = getSupabaseService();
    const [marksRes, cryptRes, holderRes, wsRes] = await Promise.all([
      db.from('marks').select('seq, owner_address, kind, struck, ts')
        .eq('project_id', project).eq('token_id', token).order('seq', { ascending: true }),
      db.from('marks_crypt').select('owner_address, original_seq')
        .eq('project_id', project).eq('token_id', token),
      db.from('holders').select('owner_address')
        .eq('project_id', project).eq('token_id', token).maybeSingle(),
      db.from('war_state').select('status, leader_faction, siege_faction, leader_since, conquered_by, grips')
        .eq('project_id', project).maybeSingle(),
    ]);
    if (marksRes.error) return serverError(marksRes.error.message);

    const marks = ((marksRes.data ?? []) as { seq: number; owner_address: string; kind: string; struck: boolean; ts: number }[]);
    const cryptRows = ((cryptRes.data ?? []) as { owner_address: string; original_seq: number }[]);
    const holderAddr = (holderRes.data as { owner_address: string } | null)?.owner_address?.toLowerCase() ?? null;

    // Factions of every hand + the holder, plus handles, in two queries.
    const addrs = new Set<string>(marks.map((m) => m.owner_address));
    for (const c of cryptRows) addrs.add(c.owner_address);
    if (holderAddr) addrs.add(holderAddr);
    const [oathRes, userRes] = addrs.size > 0
      ? await Promise.all([
          db.from('faction_oaths').select('address, faction').in('address', [...addrs]),
          db.from('users').select('address, handle, price_sprite, price_sprite_resolved, sigil_forged_at').in('address', [...addrs]),
        ])
      : [{ data: [] }, { data: [] }];
    const factionBy = new Map(((oathRes.data ?? []) as { address: string; faction: string }[]).map((o) => [o.address.toLowerCase(), o.faction]));
    const userRows = (userRes.data ?? []) as {
      address: string; handle: string | null;
      price_sprite: PriceSpriteVibe | null; price_sprite_resolved: ResolvedSprite | null;
      sigil_forged_at: string | null;
    }[];
    const handleBy = new Map(userRows.map((u) => [u.address.toLowerCase(), u.handle]));
    // Each hand wears its REAL PriceSprite — UPGRADED to the wallet's forged
    // Sigil when one exists (spec §1: stamps default to the sprite and
    // upgrade to the Sigil; nothing breaks for the unforged).
    const faceBy = new Map<string, string>();
    for (const u of userRows) {
      if (u.sigil_forged_at) {
        faceBy.set(u.address.toLowerCase(), sigilFor(u.address));
        continue;
      }
      const composed = u.price_sprite_resolved
        ? composeResolved(u.price_sprite_resolved)
        : composeSprite(u.address, u.price_sprite ?? 'observer');
      if (composed) faceBy.set(u.address.toLowerCase(), composed.fullString);
    }
    const faceFor = (addr: string): string =>
      faceBy.get(addr) ?? composeSprite(addr, 'observer')?.fullString ?? '(·_·)';

    const margin: MarginHand[] = marks.filter((m) => !m.struck).map((m) => ({
      seq: m.seq,
      address: m.owner_address,
      handle: handleBy.get(m.owner_address) ?? null,
      face: faceFor(m.owner_address),
      kind: (m.kind as MarginHand['kind']) ?? 'PASSED',
      faction: factionBy.get(m.owner_address) ?? null,
      ts: m.ts,
    }));

    const ws = wsRes.data as {
      status: string; leader_faction: string | null; siege_faction: string | null;
      leader_since: string | null; conquered_by: string | null;
      grips: { share?: number } | null;
    } | null;

    const holderFaction = holderAddr ? factionBy.get(holderAddr) ?? null : null;
    const leader = ws?.leader_faction ?? null;
    let cornerCount = 0;
    if (leader && holderFaction === leader) {
      cornerCount = 1;
      if (ws?.leader_since && Date.now() - Date.parse(ws.leader_since) >= 7 * 86400_000) cornerCount = 2;
      if (ws?.status === 'STRONGHOLD') cornerCount = 3;
      if ((ws?.conquered_by && ws.conquered_by === leader) || Number(ws?.grips?.share ?? 0) >= 0.85) cornerCount = 4;
    }

    const response: PieceWarResponse = {
      project,
      token,
      margin,
      crypt: cryptRows.map((c) => ({
        address: c.owner_address,
        handle: handleBy.get(c.owner_address) ?? null,
        originalSeq: c.original_seq,
      })),
      slots: MARGIN_SLOTS,
      relic: margin.length >= MARGIN_SLOTS,
      untouched: marks.length === 0,
      holder: holderAddr
        ? { address: holderAddr, handle: handleBy.get(holderAddr) ?? null, faction: holderFaction }
        : null,
      corners: { count: cornerCount, faction: cornerCount > 0 ? leader : null, hex: null },
      collection: { status: ws?.status ?? 'OPEN', leader, siege: ws?.siege_faction ?? null },
    };
    return NextResponse.json(response, { headers: { 'cache-control': 'public, max-age=20' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
