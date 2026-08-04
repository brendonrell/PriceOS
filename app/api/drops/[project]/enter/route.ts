/*
 * /api/drops/[project]/enter — entry collection during the window.
 *
 * POST: the mint tap's held order. Body { signedOrder }. The order is a
 * COMPLETE pre-signed mint transaction the app holds — "a signed instruction,
 * never funds". One order per wallet per drop, enforced by the table's unique
 * key; a second tap is a 409, not a replacement (nothing about the moment is
 * gameable, including re-entering).
 *
 * SEATS ARE DERIVED, NEVER DECLARED. The seat count sets the wallet's draw
 * weight and becomes its on-chain mint allowance, so it is read out of the
 * signed order itself (lib/drops/order.ts) — which must be this chain's, aimed
 * at this project, signed by this session's wallet, and calling mint(quantity).
 * Any `seats` in the body is ignored.
 *
 * Entries are SIMULTANEOUS: the response carries nothing positional — no
 * entry number, no count, no queue place — and arrival time is never
 * exposed anywhere. Writes ride the service role; identity is the SIWE
 * session (the client never names its own wallet).
 */

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, notFound, serverError } from '@/lib/errors';
import { OrderRejected, verifyOrder } from '@/lib/drops/order';

export const dynamic = 'force-dynamic';

const ORDER_RE = /^0x[0-9a-f]+$/i;
const MAX_ORDER_BYTES = 8_192;

export const POST = requireAuth<{ project: string }>(async (req, ctx, address) => {
    const { project } = await ctx.params;
    let body: { signedOrder?: string; seats?: number };
    try {
        body = await req.json();
    } catch {
        return badRequest('body must be JSON');
    }
    const signedOrder = body.signedOrder ?? '';
    if (!ORDER_RE.test(signedOrder) || signedOrder.length > MAX_ORDER_BYTES * 2 + 2) {
        return badRequest('signedOrder must be a 0x transaction');
    }

    // The order's own testimony decides the seats — see the header note.
    let seats: number;
    try {
        ({ seats } = await verifyOrder({
            signedOrder: signedOrder as `0x${string}`,
            project,
            wallet: address,
        }));
    } catch (err) {
        if (err instanceof OrderRejected) return badRequest(err.message);
        return serverError(err instanceof Error ? err.message : 'could not read the order');
    }

    const db = getSupabaseService();
    const nowIso = new Date().toISOString();
    const res = await db
        .from('drops')
        .select('id, status, window_open, window_close')
        .eq('project_address', project.toLowerCase())
        .eq('status', 'WINDOW')
        .lte('window_open', nowIso)
        .gt('window_close', nowIso)
        .maybeSingle();
    if (res.error) return serverError(res.error);
    const drop = res.data as unknown as { id: number } | null;
    if (!drop) return notFound('no open entry window');

    const { error: insErr } = await db.from('drop_entries').insert({
        drop_id: drop.id,
        wallet: address.toLowerCase(),
        signed_order: signedOrder.toLowerCase(),
        seats,
    } as never);
    if (insErr) {
        if (insErr.code === '23505') {
            return NextResponse.json({ ok: true, held: true, already: true });
        }
        return serverError(insErr);
    }
    return NextResponse.json({ ok: true, held: true });
});
