// CHRISTEN — name the charm once, ever (2–12 chars, A–Z 0–9 space), the
// contract's charset guard enforced app-side for the test phase. The name is
// the charm's OWN identity and survives transfers — so once set, it's set.

import { type NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { isValidCharmName, sanitizeCharms } from '@/lib/keychains/engine';

export const dynamic = 'force-dynamic';

export const POST = requireAuth(async (req: NextRequest, _ctx, address: string): Promise<NextResponse> => {
    try {
        const body = (await req.json().catch(() => null)) as { id?: unknown; name?: unknown } | null;
        const id = typeof body?.id === 'number' ? body.id : null;
        const name = typeof body?.name === 'string' ? body.name : '';
        if (id == null) return badRequest('Missing charm id');
        if (!isValidCharmName(name)) return badRequest('Name must be 2–12 chars, A–Z 0–9 space');

        const db = getSupabaseService();
        const { data: row, error } = await db
            .from('users')
            .select('keychains:settings->keychains')
            .eq('address', address)
            .maybeSingle();
        if (error) return serverError(error.message);

        const charms = sanitizeCharms((row as { keychains?: unknown } | null)?.keychains);
        const charm = charms.find((c) => c.id === id);
        if (!charm) return badRequest('No such charm');
        if (charm.name) return badRequest('Already christened — a name is once, ever');

        charm.name = name;
        const { error: mergeErr } = await (db.rpc as (
            fn: string,
            args: Record<string, unknown>
        ) => PromiseLike<{ data: unknown; error: { message: string } | null }>)(
            'app_merge_user_state',
            { p_address: address, p_patch: { settings: { keychains: charms } } },
        );
        if (mergeErr) return serverError(mergeErr.message);

        return NextResponse.json({ ok: true, charm });
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
});
