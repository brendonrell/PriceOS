/*
 * /api/auth/dev-login — DEV-ONLY shortcut to log in as Brendon without a
 * wallet signature.
 *
 * Brendon needs to test the logged-in app on desktop without round-tripping a
 * wallet. The normal SIWE flow (/api/auth/nonce + /api/auth/siwe) is UNTOUCHED
 * — this is an additional door, not a replacement, so mobile wallet testing
 * keeps working exactly as before.
 *
 * SECURITY GATE (hardened 2026-06-14, security sweep S-A1) — three layers:
 *   1. NEVER on production (main): VERCEL_ENV==='production' → 404, always.
 *   2. Local development (NODE_ENV==='development', i.e. localhost) → allowed
 *      with no secret. Not internet-reachable, so convenience is safe there.
 *   3. Anywhere else — crucially the PUBLIC dev PREVIEW — it is DISABLED unless
 *      DEV_LOGIN_SECRET is set in the environment AND the caller presents the
 *      matching value in the `x-dev-login-secret` header. Without that it 404s.
 *
 * Why the change: the preview is publicly reachable, so the old "any
 * non-production env" gate meant ANY anonymous visitor could POST here and get
 * a full session as Brendon — the highest-value identity, with no admin tier
 * above it. A secret can't live in client code (the preview page is public, so
 * a button-embedded secret would leak), hence the header-secret design: re-enable
 * by setting DEV_LOGIN_SECRET in Vercel and calling with the header (e.g. a
 * bookmarklet/fetch you keep the secret in), never via a rendered button.
 *
 * It stamps Brendon's address into the same iron-session cookie the real SIWE
 * flow writes, so every downstream surface hydrates identically to a real
 * sign-in. No nonce, no signature — the signature only ever existed to PROVE
 * the address, and here we've already proven it's Brendon via the secret.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/siwe';

export const dynamic = 'force-dynamic';

/* Brendon's address — the only identity this shortcut ever logs in as. */
const BRENDON_ADDR = '0x65c34afda745c12745db70ffa809311339279395';

/* Constant-time string compare so the secret check can't be timing-probed. */
function safeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

/** Decide whether this request may use dev-login. Returns true only for the
 *  three allowed cases described in the file header. */
function devLoginAllowed(req: NextRequest): boolean {
    // 1. Never on production.
    if (process.env.VERCEL_ENV === 'production') return false;

    // 2. Local development: allowed, no secret (not internet-reachable).
    if (process.env.NODE_ENV === 'development') return true;

    // 3. Everywhere else (the public preview): require the env secret AND a
    //    matching header. Disabled entirely when the secret isn't configured.
    const required = process.env.DEV_LOGIN_SECRET;
    if (!required || required.length < 16) return false;
    const provided = req.headers.get('x-dev-login-secret');
    if (!provided) return false;
    return safeEqual(provided, required);
}

export async function POST(req: NextRequest) {
    if (!devLoginAllowed(req)) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const session = await getSession();
    session.address = BRENDON_ADDR.toLowerCase();
    session.issuedAt = new Date().toISOString();
    /* Clear any pending nonce so a later real SIWE attempt starts clean. */
    session.nonce = undefined;
    await session.save();

    return NextResponse.json({ address: session.address });
}
