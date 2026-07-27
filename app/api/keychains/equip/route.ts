// EQUIP — pick the one charm worn at the end of the profile tags
// (default-off: nothing shows until the owner equips; null un-equips).

import { type NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { sanitizeCharms } from '@/lib/keychains/engine';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req: NextRequest, _ctx, address: string): Promise<NextResponse> => {
    try {
        const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
        const id = body?.id == null ? null : typeof body.id === 'number' ? body.id : undefined;
        if (id === undefined) return badRequest('id must be a charm id or null');

        const db = getSupabaseService();
        if (id !== null) {
            const { data: row, error } = await db
                .from('users')
                .select('keychains:settings->keychains')
                .eq('address', address)
                .maybeSingle();
            if (error) return serverError(error.message);
            const charms = sanitizeCharms((row as { keychains?: unknown } | null)?.keychains);
            if (!charms.some((c) => c.id === id)) return badRequest('No such charm');
        }

        const { error: mergeErr } = await (db.rpc as (
            fn: string,
            args: Record<string, unknown>
        ) => PromiseLike<{ data: unknown; error: { message: string } | null }>)(
            'app_merge_user_state',
            { p_address: address, p_patch: { settings: { keychainEquipped: id } } },
        );
        if (mergeErr) return serverError(mergeErr.message);

        return NextResponse.json({ ok: true, equipped: id });
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
});
