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
import { badRequest, serverError } from '@/lib/errors';
import { getProject, MINT_FEE_ETH } from '@/lib/project/registry';
import { MINTING_NOW_THRESHOLD } from '@/lib/home/homeData';
import { PROJECT_MILESTONES } from '@/lib/home/milestones';
import { createPing } from '@/lib/pings/createPing';

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

    return NextResponse.json({
      project_id: slug,
      minted: r.minted,
      count: r.count,
      balance: r.balance,
      sold_out: r.sold_out,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
