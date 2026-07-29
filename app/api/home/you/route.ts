/*
 * GET /api/home/you?address=0x… — the news rail's VIEWER-SCOPED signals.
 *
 * Everything else on the rail is the same for everyone, so it rides the shared
 * (cached) home payload. These three are about YOU, so they can't:
 *
 *   KIN          — the collector whose holdings overlap yours most. Taste
 *                  closeness measured the only honest way we have: how many of
 *                  the same PROJECTS you both hold.
 *   RAREST       — the rarest piece you own, by the same PD Rarity rank the
 *                  character sheet leads with.
 *   ARTIST WINDOW— if you're an artist in cooldown, when your next upload
 *                  window opens.
 *
 * Public-read semantics keyed on a wallet address, exactly like the profile
 * and artist routes: no session needed, nothing private leaves.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest } from '@/lib/errors';
import { getUserHoldings, getUserOwnedSlugs } from '@/lib/profile/getUserHoldings';
import { pdRarityRank } from '@/lib/output/rarity';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;

/* Rarity ranks are computed per project and memoised, but the first call on a
   project walks its whole edition set — so cap how many of your pieces we rank
   in one request. Your rarest is almost always inside any healthy sample, and
   the cap keeps a 1,000-piece wallet from stalling the rail. */
const RARITY_SCAN_LIMIT = 400;

/* Ceiling on the co-holder scan behind KIN. */
const KIN_SCAN_LIMIT = 5000;

export interface HomeYouResponse {
  /** The collector closest to your taste, by shared projects held. */
  kin: { handle: string; shared: number } | null;
  /** Your rarest piece — "#3 rarest of 105". */
  rarest: { slug: string; token_id: number; rank: number; total: number } | null;
  /** Your next upload window, when you're an artist inside the cooldown. */
  artist_window: { opens_at: number; days: number } | null;
}

const EMPTY: HomeYouResponse = { kin: null, rarest: null, artist_window: null };

export async function GET(req: NextRequest): Promise<NextResponse> {
  const address = (req.nextUrl.searchParams.get('address') ?? '').toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();
    const [mySlugs, myHoldings, coolRes] = await Promise.all([
      getUserOwnedSlugs(address).catch(() => null),
      getUserHoldings(address).catch(() => null),
      db.from('projects').select('cooldown_until').eq('artist_address', address),
    ]);

    /* ── KIN ── the wallet sharing the most projects with you. */
    let kin: HomeYouResponse['kin'] = null;
    if (mySlugs && mySlugs.length > 0) {
      const { data } = await db
        .from('holders')
        .select('owner_address, project_id')
        .in('project_id', mySlugs)
        .limit(KIN_SCAN_LIMIT);
      const sharedBy = new Map<string, Set<string>>();
      for (const r of (data ?? []) as { owner_address: string; project_id: string }[]) {
        const owner = r.owner_address.toLowerCase();
        if (owner === address) continue;
        const set = sharedBy.get(owner) ?? new Set<string>();
        set.add(r.project_id);
        sharedBy.set(owner, set);
      }
      /* Most overlap wins; the address itself breaks ties so the answer is
         stable between reads instead of flickering between equals. */
      let best: { addr: string; shared: number } | null = null;
      for (const [addr, set] of sharedBy) {
        const shared = set.size;
        if (!best || shared > best.shared || (shared === best.shared && addr < best.addr)) {
          best = { addr, shared };
        }
      }
      if (best) {
        const { data: u } = await db
          .from('users').select('handle').eq('address', best.addr).maybeSingle();
        const handle = (u as { handle: string | null } | null)?.handle ?? null;
        // An unclaimed wallet has no profile to send anyone to — no pill.
        if (handle) kin = { handle, shared: best.shared };
      }
    }

    /* ── RAREST ── your best PD Rarity rank, as a share of the edition set so
       a #4-of-1000 correctly beats a #2-of-10. */
    let rarest: HomeYouResponse['rarest'] = null;
    let bestPct = Infinity;
    for (const h of (myHoldings ?? []).slice(0, RARITY_SCAN_LIMIT)) {
      const rr = pdRarityRank(h.slug, h.token_id);
      if (!rr || rr.total <= 0) continue;
      const pct = rr.rank / rr.total;
      if (pct < bestPct) {
        bestPct = pct;
        rarest = { slug: h.slug, token_id: h.token_id, rank: rr.rank, total: rr.total };
      }
    }

    /* ── ARTIST WINDOW ── the latest cooldown across your projects is the one
       that gates your next upload. */
    let opensAt = 0;
    for (const p of (coolRes.data ?? []) as { cooldown_until: string | null }[]) {
      const t = p.cooldown_until ? Date.parse(p.cooldown_until) : NaN;
      if (Number.isFinite(t) && t > opensAt) opensAt = t;
    }
    const now = Date.now();
    const artistWindow = opensAt > now
      ? { opens_at: opensAt, days: Math.ceil((opensAt - now) / 86_400_000) }
      : null;

    return NextResponse.json({ kin, rarest, artist_window: artistWindow } satisfies HomeYouResponse);
  } catch (e) {
    // The rail is decoration — never fail the home page over it.
    void e;
    return NextResponse.json(EMPTY satisfies HomeYouResponse);
  }
}
