/*
 * /api/auth/dev-login — DEV-PREVIEW-ONLY shortcut to log in as Brendon
 * without a wallet signature.
 *
 * Brendon needs to test the logged-in app on desktop without round-
 * tripping a wallet. The normal SIWE flow (/api/auth/nonce +
 * /api/auth/siwe) is UNTOUCHED — this is an additional door, not a
 * replacement, so mobile wallet testing keeps working exactly as before.
 *
 * SECURITY GATE — this must NEVER work on production:
 *   The door exists ONLY where DEV_LOGIN_ENABLED=1 is explicitly set in
 *   the environment (Cloudflare dev deploy during the build phase;
 *   localhost via .env.local). Anywhere the flag is absent the route
 *   404s as if it doesn't exist. At launch, deleting the variable IS
 *   the lock. (The old gate keyed off VERCEL_ENV — a Vercel-ism that
 *   doesn't exist on Cloudflare, which left the door open on the
 *   workers.dev deploy; caught in the 2026-07-03 wallet review.) The
 *   button that calls it rides the same flag (layout gate), but this
 *   server check is the real boundary — a hand-crafted POST to the
 *   live site still gets nothing.
 *
 * (Build-phase note: the S-A1 secret gate was rolled back — it made
 * desktop testing on the public preview impossible, which was net-
 * counterproductive during the build. Production remains hard-walled.)
 *
 * It simply stamps Brendon's address into the same iron-session cookie
 * the real SIWE flow writes, so every downstream surface (user-row
 * fetch, handle, level, sprite) hydrates identically to a real sign-in.
 * No nonce, no signature — the signature only ever existed to PROVE the
 * address, and on the dev preview we already trust it's Brendon.
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/siwe';

export const dynamic = 'force-dynamic';

/* Brendon's address — the only identity this shortcut ever logs in as. */
const BRENDON_ADDR = '0x65c34afda745c12745db70ffa809311339279395';

function devLoginAllowed(): boolean {
    return process.env.DEV_LOGIN_ENABLED === '1';
}

export async function POST() {
    if (!devLoginAllowed()) {
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
