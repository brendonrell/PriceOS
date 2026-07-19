// /api/gnomes/list — hang or take down the sign (Brendon, 2026-07-19).
//
// SIWE-guarded: only a gnome's keeper may list it. Body:
//   { project_id, ask_eth }  — ask_eth > 0 lists at that price (ETH, ≤4dp);
//                              ask_eth null takes the sign down.
// Listing moves no money — it's the standing offer on the door. The paid
// deal (the counting house) is a separate, later mechanic.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface Body {
  project_id?: string;
  ask_eth?: number | null;
}

const MAX_ASK_ETH = 10000;

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return badRequest('Invalid JSON body');
  }
  const slug = (body.project_id ?? '').toLowerCase();
  if (!slug) return badRequest('Missing project_id');

  let ask: number | null = null;
  if (body.ask_eth != null) {
    ask = Number(body.ask_eth);
    if (!Number.isFinite(ask) || ask <= 0 || ask > MAX_ASK_ETH) {
      return badRequest('Invalid ask');
    }
    ask = Number(ask.toFixed(4));
  }

  try {
    const db = getSupabaseService();
    const owned = await db.from('gnomes').select('project_id')
      .eq('project_id', slug)
      .eq('owner_address', address.toLowerCase())
      .maybeSingle();
    if (owned.error) return serverError(owned.error.message);
    if (!owned.data) return badRequest('Not your gnome');

    const patch = { ask_eth: ask, listed_at: ask == null ? null : new Date().toISOString() };
    const upd = await db.from('gnomes').update(patch as never)
      .eq('project_id', slug)
      .eq('owner_address', address.toLowerCase());
    if (upd.error) return serverError(upd.error.message);

    return NextResponse.json({ ok: true, ask_eth: ask });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
