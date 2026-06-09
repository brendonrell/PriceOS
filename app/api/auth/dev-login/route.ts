/*
 * /api/auth/dev-login — DEV-PREVIEW-ONLY shortcut to log in as Brendon
 * without a wallet signature.
 *
 * Brendon needs to test the logged-in app on desktop without round-
 * tripping a wallet. The normal SIWE flow (/api/auth/nonce +
 * /api/auth/siwe) is UNTOUCHED — this is an additional door, not a
 * replacement, so mobile wallet testing keeps working exactly as before.
 *
 * SECURITY GATE — this must NEVER work on production (main deploy):
 *   VERCEL_ENV is 'production' on main, 'preview' on the dev preview,
 *   and undefined on localhost. We allow only the non-production case.
 *   On production the route 404s as if it doesn't exist. The button that
 *   calls it is also only rendered on non-production (layout gate), but
 *   this server check is the real boundary — a hand-crafted POST to the
 *   live site still gets nothing.
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
    return process.env.VERCEL_ENV !== 'production';
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
