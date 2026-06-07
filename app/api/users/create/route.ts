/*
 * POST /api/users/create
 *
 * Claims a handle + PriceSprite for the SIWE-auth'd address. The
 * AccountCreateModal posts here when the user finishes both fields.
 *
 * Behaviour:
 *   1. Validate handle format (regex + reserved + all-digit carve-out)
 *      via lib/handle/validate.
 *   2. Validate price_sprite is one of the four vibe ids.
 *   3. If the auth'd address already has a complete row (handle is
 *      not null), check whether the submitted values match the stored
 *      ones:
 *        - match  → return the existing row (200, idempotent on retry)
 *        - differ → 409 'already_claimed'. Handle is immutable
 *                   post-claim per CEO call; sprite mutations belong
 *                   on a future dedicated endpoint.
 *   4. Otherwise upsert (address, handle, price_sprite). Handle
 *      uniqueness collisions with a different address surface as
 *      Postgres 23505 → 409 'handle_taken'.
 *
 * Writes use the service-role client (bypasses RLS). Identity is
 * established by requireAuth() reading the SIWE session cookie.
 */

import { NextResponse } from 'next/server';
import { getSupabaseService, type UserRow } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import {
    validateHandleFormat,
    normaliseHandle,
    type HandleValidationReason,
} from '@/lib/handle/validate';
import { isPriceSpriteVibe, type PriceSpriteVibe } from '@/lib/sprites/vibes';
import { resolveSprite } from '@/lib/sprites/composer';

export const dynamic = 'force-dynamic';

export interface CreateUserBody {
    handle?: string;
    price_sprite?: string;
}

export type CreateUserFailureReason =
    | 'handle_invalid'
    | 'handle_taken'
    | 'sprite_invalid'
    | 'already_claimed';

export type CreateUserResponse =
    | { ok: true; user: UserRow }
    | {
        ok: false;
        error: string;
        reason: CreateUserFailureReason;
        details?: { handle_reason?: HandleValidationReason };
    };

export const POST = requireAuth(async (req, _ctx, address) => {
    let body: CreateUserBody;
    try {
        body = (await req.json()) as CreateUserBody;
    } catch {
        return badRequest('Invalid JSON body');
    }

    const rawHandle = body.handle;
    const rawSprite = body.price_sprite;
    if (typeof rawHandle !== 'string' || typeof rawSprite !== 'string') {
        return badRequest('Missing `handle` or `price_sprite`');
    }

    const handle = normaliseHandle(rawHandle);
    const formatCheck = validateHandleFormat(handle);
    if (!formatCheck.valid) {
        const res: CreateUserResponse = {
            ok: false,
            error: '@name is not valid',
            reason: 'handle_invalid',
            details: { handle_reason: formatCheck.reason ?? undefined },
        };
        return NextResponse.json(res, { status: 400 });
    }

    if (!isPriceSpriteVibe(rawSprite)) {
        const res: CreateUserResponse = {
            ok: false,
            error: 'Invalid price_sprite value',
            reason: 'sprite_invalid',
        };
        return NextResponse.json(res, { status: 400 });
    }
    const priceSprite: PriceSpriteVibe = rawSprite;

    /* Freeze the sprite ONCE here, at the only moment we have both the
       wallet and the vibe. Stored verbatim on the row so every later
       render reads it instead of re-deriving from the hash. */
    const priceSpriteResolved = resolveSprite(address, priceSprite);
    if (priceSpriteResolved === null) {
        const res: CreateUserResponse = {
            ok: false,
            error: 'Invalid wallet address for sprite resolution',
            reason: 'sprite_invalid',
        };
        return NextResponse.json(res, { status: 400 });
    }

    try {
        const supabase = getSupabaseService();

        /* Idempotency check + immutability enforcement. If a row
           already exists for this address with handle set, allow the
           call to succeed iff the submitted values match what's
           stored. Different values = 409, no mutation. */
        const { data: existingRaw, error: existingError } = await supabase
            .from('users')
            .select('*')
            .eq('address', address)
            .maybeSingle();

        if (existingError) return serverError(existingError.message);

        /* Cast off the typed-client inference (Database['Tables']['users']
           narrows to never in this select call — known issue with
           SupabaseClient<Database> over the upsert path on the same table). */
        const existing = (existingRaw as UserRow | null) ?? null;

        if (existing && existing.handle !== null) {
            const sameHandle = existing.handle.toLowerCase() === handle;
            const sameSprite = existing.price_sprite === priceSprite;
            if (sameHandle && sameSprite) {
                const res: CreateUserResponse = {
                    ok: true,
                    user: existing,
                };
                return NextResponse.json(res);
            }
            const res: CreateUserResponse = {
                ok: false,
                error: 'Account already claimed',
                reason: 'already_claimed',
            };
            return NextResponse.json(res, { status: 409 });
        }

        /* No row yet OR row exists with handle=null. Upsert covers
           both; the existing row case is hypothetical for v0 (nothing
           creates partial rows today) but the merge-friendly write
           future-proofs the next workstream. */
        const { data: upserted, error: upsertError } = await supabase
            .from('users')
            .upsert(
                {
                    address,
                    handle,
                    price_sprite: priceSprite,
                    price_sprite_resolved: priceSpriteResolved,
                } as never,
                { onConflict: 'address' }
            )
            .select()
            .single();

        if (upsertError) {
            /* 23505 = unique_violation. The only unique constraint
               that can fire here (after the address-conflict guard
               above) is users.handle — i.e. the handle is taken by
               a different address. */
            const code = (upsertError as { code?: string }).code;
            if (code === '23505') {
                const res: CreateUserResponse = {
                    ok: false,
                    error: '@name is already taken',
                    reason: 'handle_taken',
                };
                return NextResponse.json(res, { status: 409 });
            }
            return serverError(upsertError.message);
        }

        const res: CreateUserResponse = {
            ok: true,
            user: upserted as UserRow,
        };
        return NextResponse.json(res, { status: 201 });
    } catch (err) {
        return serverError(
            err instanceof Error ? err.message : 'Unknown error'
        );
    }
});
