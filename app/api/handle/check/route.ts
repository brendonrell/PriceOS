/*
 * GET /api/handle/check?handle=foo
 *
 * Live availability check for the AccountCreateModal's handle input.
 * The modal calls this on each keystroke (debounced client-side) to
 * tell the user whether the handle they're typing is claimable before
 * they submit to POST /api/users/create.
 *
 * Two failure modes get distinct `reason` values:
 *
 *   - Format failure (regex, reserved, all-digits, length)
 *       → from validateHandleFormat() in lib/handle/validate.ts
 *   - Uniqueness failure (handle taken by someone else)
 *       → reason: 'taken'
 *
 * Format is checked first because it doesn't require a DB roundtrip
 * and gives a faster response on the common case of mid-typing input
 * that hasn't yet reached the minimum length / character set.
 *
 * Reads use the anon client. users.handle is exposed by the public
 * SELECT policy on users — that's correct: profile pages are public
 * and the handle is the URL slug. Anon read is the canonical surface.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import {
    validateHandleFormat,
    normaliseHandle,
    type HandleValidationReason,
} from '@/lib/handle/validate';

export const dynamic = 'force-dynamic';

export type HandleCheckReason = HandleValidationReason | 'taken';

export interface HandleCheckResponse {
    handle: string;
    available: boolean;
    reason: HandleCheckReason | null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const raw = new URL(req.url).searchParams.get('handle');
    if (typeof raw !== 'string' || raw.length === 0) {
        return badRequest('Missing `?handle=` query param');
    }

    const handle = normaliseHandle(raw);
    const format = validateHandleFormat(handle);
    if (!format.valid) {
        const body: HandleCheckResponse = {
            handle,
            available: false,
            reason: format.reason,
        };
        return NextResponse.json(body);
    }

    /* Uniqueness check. citext means the .eq() comparison is
       case-insensitive at the DB; we still pass the normalised
       lowercase value so the echoed `handle` field in the response
       is in canonical form. */
    try {
        const supabase = getSupabaseAnon();
        const { data, error } = await supabase
            .from('users')
            .select('address')
            .eq('handle', handle)
            .maybeSingle();

        if (error) return serverError(error.message);

        const body: HandleCheckResponse = {
            handle,
            available: data === null,
            reason: data === null ? null : 'taken',
        };
        return NextResponse.json(body);
    } catch (err) {
        return serverError(
            err instanceof Error ? err.message : 'Unknown error'
        );
    }
}
