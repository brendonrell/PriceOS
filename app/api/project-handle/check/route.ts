/*
 * GET /api/project-handle/check?handle=foo
 *
 * Live availability check for the project @name during upload. The upload UI
 * calls this on each keystroke (debounced client-side) to tell the Artist
 * whether the derived slug is claimable before they submit.
 *
 * Two failure modes get distinct `reason` values:
 *
 *   - Format failure (regex, reserved, all-digits, length, no-letter)
 *       → from validateProjectHandleFormat() in lib/project/projectHandle.ts
 *   - Uniqueness failure (handle taken anywhere in the shared /@name pool)
 *       → reason: 'taken'
 *
 * Projects share ONE /@name pool with users.handle, so uniqueness is checked
 * across BOTH public.users.handle AND public.projects.handle. The slug is
 * available only if it's free in BOTH tables. No auto-suffix on a collision —
 * a taken slug is rejected outright (anti-impersonation, Brendon's call).
 *
 * Format is checked first because it doesn't require a DB roundtrip and gives
 * a faster response on the common case of mid-typing input that hasn't yet
 * reached the minimum length / character set.
 *
 * Reads use the anon client. Both users.handle and projects.handle are exposed
 * by public SELECT policies (profile and project pages are public, the handle
 * is the URL slug). Anon read is the canonical surface.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import {
    validateProjectHandleFormat,
    normaliseProjectHandle,
    type ProjectHandleValidationReason,
} from '@/lib/project/projectHandle';

export const dynamic = 'force-dynamic';

export type ProjectHandleCheckReason = ProjectHandleValidationReason | 'taken';

export interface ProjectHandleCheckResponse {
    handle: string;
    available: boolean;
    reason: ProjectHandleCheckReason | null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
    const raw = new URL(req.url).searchParams.get('handle');
    if (typeof raw !== 'string' || raw.length === 0) {
        return badRequest('Missing `?handle=` query param');
    }

    const handle = normaliseProjectHandle(raw);
    const format = validateProjectHandleFormat(handle);
    if (!format.valid) {
        const body: ProjectHandleCheckResponse = {
            handle,
            available: false,
            reason: format.reason,
        };
        return NextResponse.json(body);
    }

    /* Uniqueness across the shared pool. citext means the .eq() comparison is
       case-insensitive at the DB on both tables; we still pass the normalised
       lowercase value so the echoed `handle` field stays canonical. Free in
       BOTH → available; taken in either → 'taken'. */
    try {
        const supabase = getSupabaseAnon();
        const [userRes, projectRes] = await Promise.all([
            supabase
                .from('users')
                .select('address')
                .eq('handle', handle)
                .maybeSingle(),
            supabase
                .from('projects')
                .select('id')
                .eq('handle', handle)
                .maybeSingle(),
        ]);

        if (userRes.error) return serverError(userRes.error.message);
        if (projectRes.error) return serverError(projectRes.error.message);

        const taken = userRes.data !== null || projectRes.data !== null;
        const body: ProjectHandleCheckResponse = {
            handle,
            available: !taken,
            reason: taken ? 'taken' : null,
        };
        return NextResponse.json(body);
    } catch (err) {
        return serverError(
            err instanceof Error ? err.message : 'Unknown error'
        );
    }
}
