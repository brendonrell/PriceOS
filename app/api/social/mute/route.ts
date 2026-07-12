// POST /api/social/mute — toggle a people-mute for the signed-in caller.
//
// The `muted` table has always been the pings/broadcast suppression list
// (createPing, the firehose, wishlist/interest fan-outs and Artist Push all
// honour it) — this route is its first writer: the long-press-to-quiet
// gesture on a ping row. Body: { handle: string }. Toggles: muted → unmuted →
// muted. Returns { muted } — the NEW state.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req, _ctx, address) => {
  let handle = '';
  try {
    handle = String(((await req.json()) as { handle?: string })?.handle ?? '').replace(/^@/, '');
  } catch {
    return badRequest('Invalid JSON body');
  }
  if (!handle) return badRequest('Missing handle');

  try {
    const db = getSupabaseService();
    const me = address.toLowerCase();

    const { data: uRow } = await db
      .from('users')
      .select('address')
      .eq('handle', handle)
      .maybeSingle();
    const target = (uRow as { address: string } | null)?.address?.toLowerCase();
    if (!target) return badRequest('Unknown @name');
    if (target === me) return badRequest('Cannot mute yourself');

    const { data: existing } = await db
      .from('muted')
      .select('muted_address')
      .eq('user_address', me)
      .eq('muted_address', target)
      .maybeSingle();

    if (existing) {
      await db.from('muted').delete().eq('user_address', me).eq('muted_address', target);
      return NextResponse.json({ muted: false });
    }
    const { error } = await db
      .from('muted')
      .insert({ user_address: me, muted_address: target } as never);
    if (error && (error as { code?: string }).code !== '23505') return serverError(error.message);
    return NextResponse.json({ muted: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
