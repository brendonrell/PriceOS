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

export const POST = requireAuth<{ slug: string }>(async (_req, ctx, address) => {
  const slug = ctx.params.slug?.toLowerCase();
  const def = slug ? getProject(slug) : null;
  if (!def) return badRequest('Unknown project');

  try {
    const supabase = getSupabaseService();

    const projRes = await supabase
      .from('projects')
      .select('minted_count')
      .eq('id', slug)
      .maybeSingle();
    if (projRes.error) return serverError(projRes.error.message);
    const minted = (projRes.data as { minted_count?: number } | null)?.minted_count ?? 0;

    if (minted >= def.outputs) return badRequest('Sold out');
    const tokenId = minted + 1;
    const price = def.mintPriceEth;

    // Balance gate (lenient: unknown wallet with no row may still mint in sim).
    const userRes = await supabase
      .from('users')
      .select('sim_eth_balance')
      .eq('address', address)
      .maybeSingle();
    const hasRow = !!userRes.data;
    const balance = Number((userRes.data as { sim_eth_balance?: number } | null)?.sim_eth_balance ?? 10);
    if (hasRow && balance < price) return badRequest('Insufficient balance');

    const ins1 = await supabase
      .from('holders')
      .insert({ project_id: slug, token_id: String(tokenId), owner_address: address } as never);
    if (ins1.error) return serverError(ins1.error.message);

    await supabase.from('events').insert({
      type: 'MINT',
      project_id: slug,
      token_id: String(tokenId),
      from_address: null,
      to_address: address,
      price_eth: price,
      timestamp: Math.floor(Date.now() / 1000),
    } as never);

    await supabase.from('projects').update({ minted_count: tokenId } as never).eq('id', slug);

    let newBalance = balance;
    if (hasRow) {
      newBalance = balance - price;
      await supabase.from('users').update({ sim_eth_balance: newBalance } as never).eq('address', address);
    }

    return NextResponse.json({ project_id: slug, token_id: tokenId, balance: newBalance });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
