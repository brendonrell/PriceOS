// EQUIP — what the owner wears, and which of it hangs
// (default-off: nothing shows until the owner equips).
//
// TWO LISTS (Brendon, 2026-07-31): the worn POOL is however many charms you
// like; the TOP is the three of those that actually hang off the profile tag
// row. `{ id }` toggles pool membership, `{ id, list: 'top' }` toggles a
// hanging slot (a fourth pick pushes the oldest out), `{ shuffle }` sets the
// draw-fresh-every-load switch, and `{ id: null }` takes everything off.

import { type NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { sanitizeCharms } from '@/lib/keychains/engine';
import { idList, TOP_SLOTS } from '@/lib/keychains/engine';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req: NextRequest, _ctx, address: string): Promise<NextResponse> => {
    try {
        const body = (await req.json().catch(() => null)) as
            { id?: unknown; list?: unknown; shuffle?: unknown } | null;
        const hasId = body != null && 'id' in body;
        const id = !hasId ? undefined : body?.id == null ? null : typeof body.id === 'number' ? body.id : NaN;
        if (typeof id === 'number' && Number.isNaN(id)) return badRequest('id must be a charm id or null');
        const wantsShuffle = typeof body?.shuffle === 'boolean' ? body.shuffle : null;
        if (id === undefined && wantsShuffle === null) return badRequest('Nothing to change');
        const list = body?.list === 'top' ? 'top' : 'pool';

        const db = getSupabaseService();
        const { data: row, error } = await db
            .from('users')
            .select('keychains:settings->keychains, equipped:settings->keychainEquipped, top:settings->keychainTop')
            .eq('address', address)
            .maybeSingle();
        if (error) return serverError(error.message);

        const r = (row ?? {}) as { keychains?: unknown; equipped?: unknown; top?: unknown };
        const owned = new Set(sanitizeCharms(r.keychains).map((c) => c.id));
        let pool = idList(r.equipped).filter((n) => owned.has(n));
        let top = idList(r.top, TOP_SLOTS).filter((n) => pool.includes(n));
        if (!top.length) top = pool.slice(0, TOP_SLOTS);

        if (id === null) {
            pool = [];
            top = [];
        } else if (typeof id === 'number') {
            if (!owned.has(id)) return badRequest('No such charm');
            if (list === 'top') {
                if (top.includes(id)) {
                    top = top.filter((n) => n !== id);
                } else {
                    /* A fourth pick pushes the oldest one out — the row wears
                       three, and choosing a new one is never blocked. */
                    if (!pool.includes(id)) pool = [...pool, id];
                    top = [...top, id].slice(-TOP_SLOTS);
                }
            } else if (pool.includes(id)) {
                pool = pool.filter((n) => n !== id);
                top = top.filter((n) => n !== id);
            } else {
                pool = [...pool, id];
                /* Your first three fill the hanging slots on their own — you
                   only have to choose a top three once more than three are
                   on. */
                if (top.length < TOP_SLOTS) top = [...top, id];
            }
        }

        const patch: Record<string, unknown> = { keychainEquipped: pool, keychainTop: top };
        if (wantsShuffle !== null) patch.keychainShuffle = wantsShuffle;

        const { error: mergeErr } = await (db.rpc as (
            fn: string,
            args: Record<string, unknown>
        ) => PromiseLike<{ data: unknown; error: { message: string } | null }>)(
            'app_merge_user_state',
            { p_address: address, p_patch: { settings: patch } },
        );
        if (mergeErr) return serverError(mergeErr.message);

        return NextResponse.json({ ok: true, equipped: pool, top, shuffle: wantsShuffle });
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
});
