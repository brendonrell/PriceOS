'use client';

/*
 * accountClient — client-side helpers for the Real User Accounts v0
 * surfaces (AccountCreateModal + anything else that needs to read or
 * mutate the SIWE-auth'd user's account row).
 *
 * Mirrors the style of lib/wallet/siweClient.ts: thin fetch wrappers,
 * one helper per route, response types re-exported from the route
 * modules so the API contract has a single source of truth.
 *
 * Exports:
 *   fetchUserRow(address) — GET /api/user/{address} → UserProfileResponse
 *                           | null (null on 404 — "no row for this
 *                           address yet"). Throws on network / 5xx.
 *   checkHandle(handle)   — GET /api/handle/check?handle=... →
 *                           HandleCheckResponse. Throws on network /
 *                           5xx; format-failure + uniqueness-failure
 *                           are 200s with available=false + reason.
 *   createUser({...})     — POST /api/users/create →
 *                           CreateUserResponse. Returns the full union
 *                           (ok-success | ok-false-with-reason); the
 *                           caller distinguishes by `ok`.
 *
 * All three use credentials: 'same-origin' so the iron-session cookie
 * rides along on the requests that read it (POST /api/users/create
 * is auth-gated via requireAuth; the GETs are public anon reads).
 */

import type { UserProfileResponse } from '@/app/api/user/[address]/route';
import type { HandleCheckResponse } from '@/app/api/handle/check/route';
import type {
    CreateUserBody,
    CreateUserResponse,
} from '@/app/api/users/create/route';
import type { UserRow, UserStatePatch } from '@/lib/supabase';

/**
 * GET /api/me — the SIWE-auth'd user's own full row, including private state
 * columns (settings, calendar_state, workspaces, setup_codes, …). This is the
 * hydration source for "log in anywhere, exactly as you left it." Identity is
 * the iron-session cookie, so no address is sent. Returns null on 404 (no row
 * yet); throws on network / 5xx. Unlike fetchUserRow() this is service-role
 * server-side and carries no follows join, so it works for handled users.
 */
export async function fetchMe(): Promise<UserRow | null> {
    const r = await fetch('/api/me', {
        method: 'GET',
        credentials: 'same-origin',
    });
    if (r.status === 401 || r.status === 404) return null;
    if (!r.ok) throw new Error(`fetchMe failed: ${r.status}`);
    return (await r.json()) as UserRow;
}

/**
 * PATCH /api/me — write the caller's own persisted state. Body is a partial
 * UserStatePatch; the server whitelists writable columns and enforces ownership
 * from the session address (price_sprite/handle are never touched here).
 * Returns the updated row. Throws on network / 5xx; 4xx surfaces as a thrown
 * error too since callers fire-and-forget and only care about success.
 */
export async function patchUserState(patch: UserStatePatch): Promise<UserRow> {
    const r = await fetch('/api/me', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
    });
    if (!r.ok) throw new Error(`patchUserState failed: ${r.status}`);
    return (await r.json()) as UserRow;
}

/**
 * Fetch the user row for an address. Returns null when the row does
 * not exist yet (the server returns 404 in that case via
 * notFound('User not found')). Throws on any other non-2xx response
 * so the caller doesn't conflate "no row" with "server failure."
 */
export async function fetchUserRow(
    address: string
): Promise<UserProfileResponse | null> {
    const r = await fetch(`/api/user/${address.toLowerCase()}`, {
        method: 'GET',
        credentials: 'same-origin',
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`fetchUserRow failed: ${r.status}`);
    return (await r.json()) as UserProfileResponse;
}

/**
 * Fetch the user row for a handle. Handles are permanently 1:1 with a
 * wallet and never change, so this is the stable lookup for the public
 * profile page (which is addressed by handle, e.g. /cto). Returns null
 * when no row matches the handle (server returns 404); throws on any
 * other non-2xx so callers don't conflate "no user" with "server error."
 */
export async function fetchUserByHandle(
    handle: string
): Promise<UserProfileResponse | null> {
    const r = await fetch(`/api/user/by-handle/${handle.toLowerCase()}`, {
        method: 'GET',
        credentials: 'same-origin',
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`fetchUserByHandle failed: ${r.status}`);
    return (await r.json()) as UserProfileResponse;
}

/**
 * Live handle availability check. Server validates format first
 * (cheap), then falls through to a uniqueness lookup. Both failure
 * modes come back as 200 with available=false + a `reason` token;
 * only network / 5xx errors throw.
 *
 * Caller is expected to pass an AbortSignal when typeahead-driven so
 * stale responses for earlier keystrokes can be cancelled.
 */
export async function checkHandle(
    handle: string,
    signal?: AbortSignal
): Promise<HandleCheckResponse> {
    const r = await fetch(
        `/api/handle/check?handle=${encodeURIComponent(handle)}`,
        {
            method: 'GET',
            credentials: 'same-origin',
            signal,
        }
    );
    if (!r.ok) throw new Error(`checkHandle failed: ${r.status}`);
    return (await r.json()) as HandleCheckResponse;
}

/**
 * Claim a handle + PriceSprite for the SIWE-auth'd address. Identity
 * is established server-side via the iron-session cookie; the body
 * carries the user's chosen values only.
 *
 * Returns the full CreateUserResponse union. The caller branches on
 * `res.ok`: success exposes the persisted UserRow; failure carries a
 * `reason` token (handle_invalid / handle_taken / sprite_invalid /
 * already_claimed) the UI surfaces to the user.
 */
export async function createUser(
    body: CreateUserBody
): Promise<CreateUserResponse> {
    const r = await fetch('/api/users/create', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    /* 200 (idempotent match) / 201 (new) / 400 / 409 all return JSON
       bodies in the CreateUserResponse shape. Only treat 5xx /
       network as throw-worthy. */
    if (r.status >= 500) {
        throw new Error(`createUser failed: ${r.status}`);
    }
    return (await r.json()) as CreateUserResponse;
}
