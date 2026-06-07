// POST /api/project/[slug]/mint — chainless primary mint.
//
// Assigns the next Output of the Project to the SIWE-auth'd caller: writes a
// holders row, a MINT event, bumps projects.minted_count, and debits the
// caller's sim ETH balance by the Project's mint price. No chain, no wallet tx.
//
// Supply + price are read from the Project registry (source of truth for those
// static fields); minted_count comes from the DB.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

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

    const projRes = await supabase
      .from('projects')
      .select('minted_count')
      .eq('id', slug)
      .maybeSingle();
    if (projRes.error) return serverError(projRes.error.message);
    const minted = (projRes.data as { minted_count?: number } | null)?.minted_count ?? 0;

    const remaining = def.outputs - minted;
    if (remaining <= 0) return badRequest('Sold out');
    qty = Math.min(qty, remaining);
    const price = def.mintPriceEth;
    const cost = price * qty;

    // Balance gate (lenient: unknown wallet with no row may still mint in sim).
    const userRes = await supabase
      .from('users')
      .select('sim_eth_balance')
      .eq('address', address)
      .maybeSingle();
    const hasRow = !!userRes.data;
    const balance = Number((userRes.data as { sim_eth_balance?: number } | null)?.sim_eth_balance ?? 10);
    if (hasRow && balance < cost) return badRequest('Insufficient balance');

    const ids: number[] = [];
    for (let i = 1; i <= qty; i++) ids.push(minted + i);

    const holderRows = ids.map((id) => ({ project_id: slug, token_id: String(id), owner_address: address }));
    const insH = await supabase.from('holders').insert(holderRows as never);
    if (insH.error) return serverError(insH.error.message);

    const ts = Math.floor(Date.now() / 1000);
    const eventRows = ids.map((id) => ({
      type: 'MINT', project_id: slug, token_id: String(id),
      from_address: null, to_address: address, price_eth: price, timestamp: ts,
    }));
    await supabase.from('events').insert(eventRows as never);

    await supabase.from('projects').update({ minted_count: minted + qty } as never).eq('id', slug);

    let newBalance = balance;
    if (hasRow) {
      newBalance = balance - cost;
      await supabase.from('users').update({ sim_eth_balance: newBalance } as never).eq('address', address);
    }

    return NextResponse.json({
      project_id: slug,
      minted: ids,
      count: qty,
      balance: newBalance,
      sold_out: minted + qty >= def.outputs,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
