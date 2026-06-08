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

export const dynamic = 'force-dynamic';

const MAX_PER_MINT = 22; // per-tx cap (PDProject contract). Confirm exact value vs pd-contracts.

export const POST = requireAuth<{ slug: string }>(async (req, ctx, address) => {
  const slug = ctx.params.slug?.toLowerCase();
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
