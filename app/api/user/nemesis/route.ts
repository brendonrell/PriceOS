// /api/user/nemesis — declare (POST) or renounce (DELETE) YOUR nemesis: the
// one wallet pinned as your rival on the profile Counterparties tab. SIWE-
// gated writes to the caller's own users row only; the declaration itself is
// public (that's the point).

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;

export const POST = requireAuth(async (req, _ctx, address) => {
  let target = '';
  try {
    const body = (await req.json()) as { address?: string };
    target = String(body.address ?? '').toLowerCase();
  } catch {
    return badRequest('Bad body');
  }
  if (!ADDRESS_RE.test(target)) return badRequest('Invalid Ethereum address');
  if (target === address.toLowerCase()) return badRequest('You cannot be your own nemesis');
  try {
    const db = getSupabaseService();
    const up = await db
      .from('users')
      .update({ nemesis_address: target } as never)
      .eq('address', address.toLowerCase());
    if (up.error) return serverError(up.error.message);
    return NextResponse.json({ ok: true, nemesis_address: target });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export const DELETE = requireAuth(async (_req, _ctx, address) => {
  try {
    const db = getSupabaseService();
    const up = await db
      .from('users')
      .update({ nemesis_address: null } as never)
      .eq('address', address.toLowerCase());
    if (up.error) return serverError(up.error.message);
    return NextResponse.json({ ok: true, nemesis_address: null });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
