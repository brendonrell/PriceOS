/*
 * /api/studio/vouch — a whitelisted artist's TWO vouch slots (the artist
 * batch, 2026-07-13). A vouch is a name put forward for the filter: it
 * lands in the vouch ledger AND pings @brendon's inbox (the whitelist is
 * his call alone — a vouch is input, never admission).
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { getArtistStatus } from '@/lib/artists/allowlist';
import { createPing } from '@/lib/pings/createPing';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const SLOTS = 2;

export const GET = requireAuth(async (_req, _ctx, address) => {
  try {
    const db = getSupabaseService();
    const { data } = await db
      .from('artist_vouches')
      .select('vouched, note, created_at')
      .eq('voucher_wallet', address.toLowerCase())
      .order('created_at', { ascending: true });
    const rows = (data ?? []) as { vouched: string; note: string | null; created_at: string }[];
    const isArtist = (await getArtistStatus(address)) !== null;
    return NextResponse.json({
      is_artist: isArtist,
      slots: SLOTS,
      used: rows.length,
      vouches: rows,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export const POST = requireAuth(async (req, _ctx, address) => {
  let who = '';
  let note = '';
  try {
    const body = (await req.json()) as { who?: string; note?: string };
    who = String(body.who ?? '').trim();
    note = String(body.note ?? '').trim();
  } catch {
    return badRequest('Bad body');
  }
  if (!who || who.length > 120) return badRequest('Name the artist — a handle, site, or contact');
  if (note.length > 280) return badRequest('Keep the note under 280 characters');

  try {
    if ((await getArtistStatus(address)) === null) {
      return NextResponse.json({ error: 'Vouch slots belong to whitelisted artists' }, { status: 403 });
    }
    const db = getSupabaseService();
    const wallet = address.toLowerCase();
    const { count } = await db
      .from('artist_vouches')
      .select('*', { count: 'exact', head: true })
      .eq('voucher_wallet', wallet);
    if ((count ?? 0) >= SLOTS) {
      return NextResponse.json({ error: 'Both vouch slots are spent' }, { status: 409 });
    }
    const ins = await db
      .from('artist_vouches')
      .insert({ voucher_wallet: wallet, vouched: who, note: note || null } as never);
    if (ins.error) {
      if (String(ins.error.code).includes('23505')) {
        return NextResponse.json({ error: 'You already vouched for them' }, { status: 409 });
      }
      return serverError(ins.error.message);
    }

    // Land it in Brendon's inbox — the filter is his call.
    try {
      const { data: b } = await db.from('users').select('address').eq('handle', 'brendon').maybeSingle();
      const bAddr = (b as { address?: string } | null)?.address;
      if (bAddr) {
        const { data: voucher } = await db.from('users').select('handle').eq('address', wallet).maybeSingle();
        const vHandle = (voucher as { handle?: string | null } | null)?.handle ?? wallet.slice(0, 8);
        await createPing({
          recipientAddress: bAddr,
          kind: 'PING',
          data: { reminder: 'ops', text: `VOUCH — @${vHandle} puts forward: ${who}${note ? ` · "${note}"` : ''}` },
        });
      }
    } catch { /* the vouch row is the record; the ping is best-effort */ }

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
