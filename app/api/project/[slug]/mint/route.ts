// POST /api/project/[slug]/mint — chainless primary mint.
//
// Assigns the next Output of the Project to the SIWE-auth'd caller: writes a
// holders row, a MINT event, bumps projects.minted_count, and debits the
// caller's sim ETH balance by the Project's mint price. No chain, no wallet tx.
//
// Supply + price are read from the Project registry (source of truth for those
// static fields); minted_count comes from the DB.

import { NextResponse } from 'next/server';
import { getSupabaseService, type MoneyOpResult } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { withIdempotency } from '@/lib/api/idempotency';
import { badRequest, serverError } from '@/lib/errors';
import { getProject, MINT_FEE_ETH } from '@/lib/project/registry';
import { MINTING_NOW_THRESHOLD } from '@/lib/home/homeData';
import { PROJECT_MILESTONES } from '@/lib/home/milestones';
import { createPing } from '@/lib/pings/createPing';
import { fanOutMarketPings } from '@/lib/pings/fanout';
import { persistEvaluation } from '@/lib/achievements/engine';
import { pingAchievements } from '@/lib/pings/pingAchievements';

export const dynamic = 'force-dynamic';

const MAX_PER_MINT = 22; // per-tx cap (PDProject contract). Confirm exact value vs pd-contracts.

// Mint-count milestones worth pinging the artist about. Below 1000: notable
// round numbers; at/above 1000: every full thousand. Returns the highest
// milestone crossed by going from `prev` → `now`, or null if none.
const MINT_MILESTONES = [1, 10, 25, 50, 100, 250, 500, 1000];
function milestoneCrossed(prev: number, now: number): number | null {
  let crossed: number | null = null;
  for (const m of MINT_MILESTONES) if (m > prev && m <= now) crossed = m;
  const kPrev = Math.floor(prev / 1000);
  const kNow = Math.floor(now / 1000);
  if (now >= 1000 && kNow > kPrev) crossed = kNow * 1000;
  return crossed;
}

export const POST = requireAuth<{ slug: string }>(async (req, ctx, address) => {
  // Double-submit protection (§5.2): an Idempotency-Key header makes this
  // POST execute at most once; replays get the stored response.
  return withIdempotency(req, address, 'mint', async () => {
  const slug = (await ctx.params).slug?.toLowerCase();
  const def = slug ? getProject(slug) : null;
  if (!def) return badRequest('Unknown project');

  let qty = 1;
  try {
    const body = (await req.json()) as { quantity?: number };
    const q = Math.floor(Number(body?.quantity ?? 1));
    if (Number.isFinite(q) && q >= 1) qty = Math.min(q, MAX_PER_MINT);
  } catch {
    /* no body → mint 1 */
  }

  try {
    const supabase = getSupabaseService();

    // Cutover guard: once a project is ON-CHAIN (projects.contract_address
    // set), the sim mint path is closed for it — the indexer records chain
    // mints, and both paths writing would double-count supply + volume.
    // Inert for every sim-only project (contract_address NULL).
    const { data: cutoverRow } = await supabase
      .from('projects')
      .select('contract_address')
      .eq('id', slug)
      .maybeSingle();
    if ((cutoverRow as { contract_address?: string | null } | null)?.contract_address) {
      return badRequest('Project is on-chain — mint on-chain');
    }

    // One atomic, row-locked DB call so supply + balance can't be raced by
    // two simultaneous mints (no read-then-write gap).
    const { data, error } = await supabase.rpc('app_mint', {
      p_address: address,
      p_slug: slug,
      p_qty: qty,
      p_max_supply: def.outputs,
      p_price: def.mintPriceEth,
      p_fee: MINT_FEE_ETH,
    } as never);
    if (error) return serverError(error.message);
    const r = data as MoneyOpResult;
    if (r.error === 'sold_out') return badRequest('Sold out');
    if (r.error === 'insufficient_balance') return badRequest('Insufficient balance');
    if (r.error) return badRequest(r.error);

    // Interest fan-out per fresh Output: the collector's mutuals, their
    // starred-artist watchers, starred projects/traits, top-rarity holders.
    // Capped at 3 tokens per mint so a max-qty mint can't stall the response
    // (the remainder still lands in feeds via the events table).
    const mintedIds = Array.isArray(r.minted) ? (r.minted as Array<number | string>) : [];
    for (const t of mintedIds.slice(0, 3)) {
      await fanOutMarketPings(supabase, {
        slug,
        tokenId: String(t),
        event: 'minted',
        actorAddress: address,
        amountEth: def.mintPriceEth,
      });
    }

    // Ping the artist on MINT MILESTONES only — not every collect (which would
    // be noise on a hot drop). Fires when this mint crosses a milestone count.
    const mintedNow = Array.isArray(r.minted) ? r.minted.length : qty;
    const total = r.count ?? 0;
    const milestone = milestoneCrossed(total - mintedNow, total);
    if (milestone !== null) {
      const { data: projRow } = await supabase
        .from('projects')
        .select('artist_address, handle')
        .eq('id', slug)
        .maybeSingle();
      const proj = projRow as { artist_address?: string; handle?: string | null } | null;
      const artist = proj?.artist_address ?? null;
      if (artist) {
        await createPing({
          recipientAddress: artist,
          kind: 'MINT',
          actorAddress: null, // project-level milestone, not a single collector
          projectId: slug ?? null,
          projectName: proj?.handle ?? null,
          data: { milestone, count: total },
        });
      }
    }

    // Project milestones (for-fun, count-based): stamp any milestone this mint
    // newly crossed into the projects.milestones JSONB. Read-modify-write,
    // best-effort (never fails the mint); low sim concurrency makes the
    // non-atomic merge fine, and the .key guard prevents a re-stamp.
    const crossedMilestones = PROJECT_MILESTONES.filter(
      (m) => m.count > total - mintedNow && m.count <= total,
    );
    if (crossedMilestones.length > 0) {
      try {
        const { data: msRow } = await supabase
          .from('projects')
          .select('milestones')
          .eq('id', slug)
          .maybeSingle();
        const current = ((msRow as { milestones?: Record<string, string> } | null)?.milestones ?? {}) as Record<string, string>;
        const nowIso = new Date().toISOString();
        let changed = false;
        for (const m of crossedMilestones) {
          if (!current[m.key]) { current[m.key] = nowIso; changed = true; }
        }
        if (changed) {
          await supabase
            .from('projects')
            .update({ milestones: current } as never)
            .eq('id', slug);
        }
      } catch {
        /* best-effort milestone stamp — never fail the mint over it */
      }
    }

    // Graduation (Pump.fun-inspired): the mint that first crosses the threshold
    // graduates the project into Now Minting. Stamp graduated_at on the null→set
    // edge only (the .is(null) guard makes it idempotent), best-effort so it can
    // never block or fail the mint — the home feed's computed fallback covers a
    // miss.
    if (total >= MINTING_NOW_THRESHOLD && total - mintedNow < MINTING_NOW_THRESHOLD) {
      try {
        await supabase
          .from('projects')
          .update({ graduated_at: new Date().toISOString() } as never)
          .eq('id', slug)
          .is('graduated_at', null);
      } catch {
        /* best-effort graduation stamp — never fail the mint over it */
      }
    }

    // Sold out: the mint that fully mints the supply stamps sold_out_at once
    // (idempotent null->set guard, best-effort — once sold out, later mints
    // error out before reaching here). Brendon may surface this as "death" in
    // the UI; the column is just the moment it sold out.
    if (r.sold_out) {
      try {
        await supabase
          .from('projects')
          .update({ sold_out_at: new Date().toISOString() } as never)
          .eq('id', slug)
          .is('sold_out_at', null);
      } catch {
        /* best-effort sold-out stamp — never fail the mint over it */
      }
    }

    // BUGFIX (achievements silently not unlocking on mint): this used to rely
    // entirely on the client — dispatch pd:project-refresh, wait ~2.2s for the
    // reveal to settle, then fire an authenticated POST to
    // /api/achievements/evaluate. Any of tab close, hard navigation, or a
    // transient fetch failure in that window drops the unlock forever (the
    // client swallows evaluate() failures with no retry — next-load evaluate()
    // is the only safety net, and only if the user comes back). The mint
    // itself is the one place we KNOW the qualifying action happened, so
    // evaluate right here, server-side, in the same request — the same
    // guaranteed pattern /api/streak/ping already uses. Best-effort: a failure
    // here must never fail the mint that already succeeded; the client-side
    // path stays in place as a harmless, idempotent redundant check.
    let newlyUnlocked: Awaited<ReturnType<typeof persistEvaluation>>['newlyUnlocked'] = [];
    try {
      const evalResult = await persistEvaluation(supabase, address);
      newlyUnlocked = evalResult.newlyUnlocked;
      await pingAchievements(address, newlyUnlocked);
    } catch {
      /* best-effort — the client's own evaluate()/streak-ping call still
         covers this mint as a fallback. */
    }

    return NextResponse.json({
      project_id: slug,
      minted: r.minted,
      count: r.count,
      balance: r.balance,
      sold_out: r.sold_out,
      newlyUnlocked: newlyUnlocked.map((a) => ({
        id: a.id,
        name: a.name,
        blurb: a.blurb,
        points: a.points,
        category: a.category,
        secret: a.secret,
        icon: a.icon,
      })),
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
  });
});
