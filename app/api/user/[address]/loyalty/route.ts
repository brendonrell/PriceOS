// /api/user/[address]/loyalty — the loyalty dashboard read: how long this
// wallet has stood by its pieces, its artists, and the platform. Everything is
// DERIVED from ledgers that already exist — holders tenure (acquired_at), the
// events ledger (pieces that ever arrived / ever left), active listings, and
// the users progression fields (streak, member-since, user number). No new
// tables, no writes.
//
// Public read keyed on the address in the path (the profile Loyalty tab shows
// for everyone — the Counterparties precedent). Service client: holders /
// events aren't anon-readable.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;
const ZERO = '0x0000000000000000000000000000000000000000';
const MAX_TENURE_ROWS = 10;
const MAX_ARTIST_ROWS = 10;

export interface LoyaltyTenureRow {
  slug: string;
  token_id: number;
  /** ISO — when the current tenure started (holders.acquired_at). */
  acquired_at: string;
  held_days: number;
}

export interface LoyaltyArtistRow {
  /** The artist's platform handle (the registry's artistHandle). */
  handle: string;
  pieces: number;
  projects: number;
  /** ISO of the wallet's FIRST acquisition from this artist still held. */
  since: string | null;
}

export interface LoyaltyPurity {
  /** 0–100 — hands (50) + unlisted (25) + tenure-vs-account-age (25). */
  score: number;
  /** The verdict word (toast-cased by the UI). */
  verdict: 'DIAMOND' | 'STEADFAST' | 'TEMPERED' | 'RESTLESS' | 'MERCENARY';
  /** Lifetime pieces that ever arrived in this wallet (mints + buys + xfers in). */
  arrived: number;
  /** Pieces that ever left (sales, trades, transfers out). */
  let_go: number;
  /** Pieces held right now. */
  kept: number;
  /** Held pieces sitting on an active listing right now. */
  listed_now: number;
}

export interface LoyaltyResponse {
  address: string;
  /** users.created_at (ISO) — member since. Null = never signed in. */
  member_since: string | null;
  user_number: number | null;
  streak: number;
  streak_best: number;
  held: number;
  /** Mean tenure of the held pieces, in whole days. Null = nothing held. */
  avg_hold_days: number | null;
  /** Longest-held pieces, oldest bond first. */
  oldest: LoyaltyTenureRow[];
  /** Artists ranked by pieces held. */
  artists: LoyaltyArtistRow[];
  /** Null when the ledger has no acquisitions to read. */
  purity: LoyaltyPurity | null;
}

function verdictFor(score: number): LoyaltyPurity['verdict'] {
  if (score >= 90) return 'DIAMOND';
  if (score >= 75) return 'STEADFAST';
  if (score >= 50) return 'TEMPERED';
  if (score >= 25) return 'RESTLESS';
  return 'MERCENARY';
}

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();
    const now = Date.now();

    const [userRes, heldRes, arrivedRes, leftRes, listedRes] = await Promise.all([
      db.from('users')
        .select('created_at, user_number, price_streak, streak_best')
        .eq('address', address)
        .maybeSingle(),
      db.from('holders')
        .select('project_id, token_id, acquired_at')
        .eq('owner_address', address)
        .limit(1000),
      // Arrivals: mints to this wallet + pieces bought/traded/received in.
      // (LIST/OFFER rows carry to_address null, so they never count here.)
      db.from('events')
        .select('*', { count: 'exact', head: true })
        .in('type', ['MINT', 'XFER'])
        .eq('to_address', address),
      // Departures: pieces sold, traded, or transferred away (burns excluded).
      db.from('events')
        .select('*', { count: 'exact', head: true })
        .eq('type', 'XFER')
        .eq('from_address', address)
        .neq('to_address', ZERO),
      db.from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('seller_address', address)
        .eq('active', true),
    ]);
    if (heldRes.error) return serverError(heldRes.error.message);

    const user = userRes.data as {
      created_at: string | null;
      user_number: number | null;
      price_streak: number | null;
      streak_best: number | null;
    } | null;

    const held = (heldRes.data ?? []) as {
      project_id: string;
      token_id: string | number;
      acquired_at: string | null;
    }[];

    // ── Tenure — the pieces that stayed, oldest bond first ──────────────────
    const dated = held
      .filter((h) => h.acquired_at != null)
      .map((h) => ({
        slug: h.project_id,
        token_id: Number(h.token_id),
        acquired_at: h.acquired_at as string,
        at: Date.parse(h.acquired_at as string),
      }))
      .filter((h) => Number.isFinite(h.at))
      .sort((a, b) => a.at - b.at);

    const oldest: LoyaltyTenureRow[] = dated.slice(0, MAX_TENURE_ROWS).map((h) => ({
      slug: h.slug,
      token_id: h.token_id,
      acquired_at: h.acquired_at,
      held_days: Math.max(0, Math.floor((now - h.at) / 86400_000)),
    }));

    const avgHoldDays = dated.length > 0
      ? Math.round(dated.reduce((s, h) => s + (now - h.at), 0) / dated.length / 86400_000)
      : null;

    // ── Patronage — pieces per artist, via the static registry ──────────────
    const byArtist = new Map<string, { pieces: number; slugs: Set<string>; since: number | null }>();
    for (const h of held) {
      const p = getProject(h.project_id);
      if (!p) continue;
      const a = byArtist.get(p.artistHandle) ?? { pieces: 0, slugs: new Set<string>(), since: null };
      a.pieces += 1;
      a.slugs.add(h.project_id);
      const at = h.acquired_at ? Date.parse(h.acquired_at) : NaN;
      if (Number.isFinite(at) && (a.since === null || at < a.since)) a.since = at;
      byArtist.set(p.artistHandle, a);
    }
    const artists: LoyaltyArtistRow[] = [...byArtist.entries()]
      .map(([handle, a]) => ({
        handle,
        pieces: a.pieces,
        projects: a.slugs.size,
        since: a.since !== null ? new Date(a.since).toISOString() : null,
      }))
      .sort((a, b) => (b.pieces - a.pieces) || (b.projects - a.projects) || a.handle.localeCompare(b.handle))
      .slice(0, MAX_ARTIST_ROWS);

    // ── Purity — the clean-hands read ───────────────────────────────────────
    const arrived = arrivedRes.count ?? 0;
    const letGo = leftRes.count ?? 0;
    const kept = held.length;
    const listedNow = Math.min(listedRes.count ?? 0, kept);

    let purity: LoyaltyPurity | null = null;
    if (arrived > 0 || kept > 0) {
      // Hands: of everything that ever passed through, how much never left.
      const hands = letGo + kept > 0 ? kept / (letGo + kept) : 1;
      // Unlisted: held pieces not sitting on the market right now.
      const unlisted = kept > 0 ? 1 - listedNow / kept : 1;
      // Tenure: average hold vs the account's own age — a young wallet holding
      // since day one scores full marks; flip-and-rebuy can't.
      const accountAge = user?.created_at ? Math.max(1, now - Date.parse(user.created_at)) : null;
      const avgHoldMs = dated.length > 0 ? dated.reduce((s, h) => s + (now - h.at), 0) / dated.length : 0;
      const tenure = accountAge ? Math.min(1, avgHoldMs / accountAge) : hands;
      const score = Math.round(50 * hands + 25 * unlisted + 25 * tenure);
      purity = { score, verdict: verdictFor(score), arrived, let_go: letGo, kept, listed_now: listedNow };
    }

    const response: LoyaltyResponse = {
      address,
      member_since: user?.created_at ?? null,
      user_number: user?.user_number ?? null,
      streak: user?.price_streak ?? 0,
      streak_best: user?.streak_best ?? 0,
      held: kept,
      avg_hold_days: avgHoldDays,
      oldest,
      artists,
      purity,
    };
    return NextResponse.json(response, { headers: { 'cache-control': 'public, max-age=30' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
