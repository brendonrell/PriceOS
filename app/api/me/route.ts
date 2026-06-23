/*
 * /api/me  — the SIWE-auth'd user's own account row.
 *
 *   GET   → the caller's full row, including the private state columns
 *           (settings, calendar_state, grid_presets, workspaces,
 *           setup_codes). This is the hydration source for the
 *           "log in anywhere, exactly as you left it" feature.
 *
 *   PATCH → write the caller's own persisted state. Body is a partial
 *           UserStatePatch; only whitelisted columns are written. Identity
 *           (address/handle/created_at), curve (account_level/price_rank),
 *           and price_sprite are NOT writable here — they have their own
 *           endpoints. price_sprite in particular is left strictly untouched.
 *
 * Why this exists alongside GET /api/user/[address]:
 *   - /api/user/[address] is the PUBLIC profile read (anon client, RLS).
 *     It must never return private state columns.
 *   - /api/me is the PRIVATE self read/write (service-role, identity from
 *     the iron-session cookie). Ownership is the session address — the
 *     client never sends an address, so a user can only ever read/write
 *     their own row.
 *
 * Both methods use requireAuth(): no session → 401. Writes use the
 * service-role client (bypasses RLS); ownership is enforced in code by
 * keying every query on the session-recovered `address`.
 */

import { NextResponse } from 'next/server';
import {
    getSupabaseService,
    type UserRow,
    type UserStatePatch,
    type Showcase,
} from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { isValidProfileLogo } from '@/lib/profile/profileLogos';
import { badRequest, notFound, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const HEX_RE = /^#[0-9A-F]{6}$/i;

// Anti-impersonation guard for the public-facing identity label (ens_name).
// Rejects invisible / direction-spoofing characters a copycat would use to
// fake a famous artist's name past a naive equality check: C0/C1 control
// chars, zero-width joiners/spaces, bidi overrides/isolates, and the BOM.
// Legitimate ENS / display names never contain these (security sweep S-I1).
// Built via RegExp(string) so the source stays plain ASCII and reviewable.
const UNSAFE_TEXT_RE = new RegExp(
    '[\\u0000-\\u001F\\u007F-\\u009F\\u200B-\\u200F\\u202A-\\u202E' +
        '\\u2060-\\u2064\\u2066-\\u2069\\uFEFF]'
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/me
// ─────────────────────────────────────────────────────────────────────────────

export const GET = requireAuth(async (_req, _ctx, address) => {
    try {
        const supabase = getSupabaseService();
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('address', address)
            .maybeSingle();

        if (error) return serverError(error.message);
        if (!data) return notFound('No account row for this address');

        return NextResponse.json(data as UserRow);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/me  — write own persisted state
// ─────────────────────────────────────────────────────────────────────────────

/** Validate + narrow the raw body to the writable column whitelist. Returns
 *  either the sanitised patch or a human-readable rejection reason. Unknown
 *  keys are dropped silently (forward-compatible). An empty result after
 *  filtering is a 400 — a PATCH that writes nothing is a client bug. */
function sanitisePatch(
    raw: unknown
): { ok: true; patch: UserStatePatch } | { ok: false; reason: string } {
    if (typeof raw !== 'object' || raw === null) {
        return { ok: false, reason: 'Body must be a JSON object' };
    }
    const body = raw as Record<string, unknown>;
    const patch: UserStatePatch = {};

    if ('ens_name' in body) {
        const v = body.ens_name;
        if (v !== null && !(typeof v === 'string' && v.length > 0 && v.length <= 255)) {
            return { ok: false, reason: 'ens_name must be a non-empty string (max 255) or null' };
        }
        if (typeof v === 'string' && UNSAFE_TEXT_RE.test(v)) {
            return { ok: false, reason: 'ens_name contains disallowed characters' };
        }
        patch.ens_name = v === null ? null : (v as string);
    }

    if ('profile_hex' in body) {
        const v = body.profile_hex;
        if (v !== null && !(typeof v === 'string' && HEX_RE.test(v))) {
            return { ok: false, reason: 'profile_hex must be a #RRGGBB hex or null' };
        }
        patch.profile_hex = v === null ? null : (v as string).toUpperCase();
    }

    if ('profile_logo' in body) {
        const v = body.profile_logo;
        if (!isValidProfileLogo(v)) {
            return { ok: false, reason: 'profile_logo must be a known logo id or null' };
        }
        patch.profile_logo = v;
    }

    if ('profile_sprite_hex' in body) {
        const v = body.profile_sprite_hex;
        if (v !== null && !(typeof v === 'string' && HEX_RE.test(v))) {
            return { ok: false, reason: 'profile_sprite_hex must be a #RRGGBB hex or null' };
        }
        patch.profile_sprite_hex = v === null ? null : (v as string).toUpperCase();
    }

    if ('showcase_style' in body) {
        const v = body.showcase_style;
        if (v !== 'static' && v !== 'generative' && v !== 'gen-curated' && v !== 'artist') {
            return { ok: false, reason: "showcase_style must be 'static', 'generative', 'gen-curated' or 'artist'" };
        }
        patch.showcase_style = v;
    }

    if ('showcase' in body) {
        const v = body.showcase as Showcase | undefined;
        const slots = v?.slots;
        if (!Array.isArray(slots) || slots.length !== 6) {
            // Mirrors the Postgres CHECK (jsonb_array_length(slots) = 6) so the
            // client gets a 400 instead of a raw constraint-violation 500.
            return { ok: false, reason: 'showcase.slots must be an array of exactly 6 entries' };
        }
        patch.showcase = v as Showcase;
    }

    // Object-valued envelopes: shallow type guard only; the column owners
    // (contexts) are responsible for internal shape.
    for (const key of [
        'settings',
        'calendar_state',
        'grid_presets',
        'workspaces',
        'setup_codes',
        'familiar_config',
        'sticker_state',
    ] as const) {
        if (key in body) {
            const v = body[key];
            if (key === 'familiar_config' && v === null) {
                patch.familiar_config = null;
                continue;
            }
            if (typeof v !== 'object' || v === null || Array.isArray(v)) {
                return { ok: false, reason: `${key} must be a JSON object` };
            }
            (patch as Record<string, unknown>)[key] = v;
        }
    }

    if (Object.keys(patch).length === 0) {
        return { ok: false, reason: 'No writable fields in body' };
    }
    return { ok: true, patch };
}

export const PATCH = requireAuth(async (req, _ctx, address) => {
    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        return badRequest('Invalid JSON body');
    }

    const result = sanitisePatch(raw);
    if (!result.ok) return badRequest(result.reason);

    try {
        const supabase = getSupabaseService();

        // Ownership: key the update on the session address only. The body
        // never carries an address, so this can only ever write the caller's
        // own row. price_sprite/handle/account_level are not in the patch, so
        // they are physically untouchable through this path.
        const { data, error } = await supabase
            .from('users')
            .update(result.patch as never)
            .eq('address', address)
            .select('*')
            .maybeSingle();

        if (error) return serverError(error.message);
        if (!data) return notFound('No account row for this address');

        return NextResponse.json(data as UserRow);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
});
