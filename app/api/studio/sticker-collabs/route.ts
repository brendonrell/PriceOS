/*
 * /api/studio/sticker-collabs — collector collabs on sticker sheets
 * (Brendon, 2026-07-16). A sheet with a collab routes the 3% creator share
 * of every secondary trade to the collaborating user (the 2% platform share
 * never moves). Studio-only: writes are gated to the studio seed wallets.
 *
 *   GET            → { collabs: [{ sheet_id, collab_address, collab_handle }] }
 *   POST set       → { action: 'set', sheet, user }   user = @handle or 0x…
 *   POST remove    → { action: 'remove', sheet }
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { STUDIO_ACCESS_SEED } from '@/lib/studio/access';
import { SHEETS } from '@/lib/stickers/catalog';

export const dynamic = 'force-dynamic';

const SHEET_IDS = new Set<string>(SHEETS.map((s) => s.id));
const isStudio = (address: string) =>
  STUDIO_ACCESS_SEED.some((a) => a.toLowerCase() === address.toLowerCase());

export const GET = requireAuth(async (_req, _ctx, address) => {
  try {
    if (!isStudio(address)) return badRequest('Studio only');
    const db = getSupabaseService();
    const { data, error } = await db
      .from('sticker_sheet_collabs')
      .select('sheet_id, collab_address, collab_handle, created_at')
      .order('created_at', { ascending: false });
    if (error) return serverError(error.message);
    return NextResponse.json({ collabs: data ?? [] });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export const POST = requireAuth(async (req, _ctx, address) => {
  try {
    if (!isStudio(address)) return badRequest('Studio only');
    const body = (await req.json().catch(() => ({}))) as { action?: string; sheet?: string; user?: string };
    const sheet = String(body.sheet ?? '');
    if (!SHEET_IDS.has(sheet)) return badRequest('Unknown sheet');
    const db = getSupabaseService();

    if (body.action === 'remove') {
      const { error } = await db.from('sticker_sheet_collabs').delete().eq('sheet_id', sheet);
      if (error) return serverError(error.message);
      return NextResponse.json({ ok: true });
    }

    if (body.action === 'set') {
      // Resolve an EXISTING user — @handle or address — exactly like gifting.
      const raw = String(body.user ?? '').trim().replace(/^@/, '').toLowerCase();
      if (!raw) return badRequest('Missing user');
      const u = raw.startsWith('0x')
        ? await db.from('users').select('address, handle').ilike('address', raw).maybeSingle()
        : await db.from('users').select('address, handle').ilike('handle', raw).maybeSingle();
      const row = u.data as { address?: string; handle?: string | null } | null;
      const collab = row?.address?.toLowerCase() ?? null;
      if (!collab) return badRequest('User not found');
      const { error } = await db.from('sticker_sheet_collabs').upsert(
        {
          sheet_id: sheet,
          collab_address: collab,
          collab_handle: row?.handle ?? null,
          added_by: address.toLowerCase(),
          created_at: new Date().toISOString(),
        } as never,
        { onConflict: 'sheet_id' },
      );
      if (error) return serverError(error.message);
      return NextResponse.json({ ok: true, sheet, collab_address: collab, collab_handle: row?.handle ?? null });
    }

    return badRequest('Unknown action');
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
