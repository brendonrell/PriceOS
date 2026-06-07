/*
 * /api/auth/siwe — three verbs, one route file:
 *
 *   GET    → returns { address: string | null }
 *            Read the current session cookie and return the
 *            authenticated address (lowercased), or null if no SIWE
 *            session is active. Used by the wallet provider on
 *            mount to hydrate after a full-page reload.
 *
 *   POST   → { message, signature } → { address }
 *            Verify a SIWE { message, signature } pair against the
 *            nonce stashed during /api/auth/nonce AND against the
 *            request's host (domain binding). On success, write the
 *            recovered address into the session cookie and return
 *            it. On failure, 400 / 401.
 *
 *   DELETE → { ok: true }
 *            Destroy the session cookie. Wallet disconnect is the
 *            client's responsibility (AuthContext.signOut() also
 *            calls wagmi's disconnect()).
 *
 * iron-session is the storage layer (signed + encrypted cookie, no
 * server-side store). `verifySiweMessage()` in lib/auth/siwe.ts wraps
 * the `siwe` package's verifier and enforces nonce + domain +
 * (when present in the message) expirationTime.
 *
 * The route is force-dynamic because every verb mutates or reads the
 * session cookie — caching or static optimization here is wrong.
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSession, verifySiweMessage } from '@/lib/auth/siwe';
import { badRequest, unauthorized } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
    const session = await getSession();
    if (!session.address) {
        return NextResponse.json({ address: null });
    }
    return NextResponse.json({
        address: session.address.toLowerCase(),
    });
}

interface VerifyBody {
    message?: string;
    signature?: string;
}

export async function POST(req: NextRequest) {
    let body: VerifyBody;
    try {
        body = (await req.json()) as VerifyBody;
    } catch {
        return badRequest('Invalid JSON body');
    }

    const { message, signature } = body ?? {};
    if (typeof message !== 'string' || typeof signature !== 'string') {
        return badRequest('Missing message or signature');
    }

    const session = await getSession();
    const expectedNonce = session.nonce;
    if (!expectedNonce) {
        return badRequest('No nonce on session — call /api/auth/nonce first');
    }

    /* Domain binding. The signed SIWE message carries a `domain` field
       the client populated from `window.location.host`; passing this
       request's host to siwe.verify() forces the two to match, which
       blocks a signature minted against one origin from being replayed
       against another. `req.headers.get('host')` is the user-agent's
       view of the host — same value the browser used when populating
       the message — so the comparison is symmetric. Behind a proxy
       Next.js still surfaces the host the request was made against;
       no x-forwarded-host massaging needed for our deploy. */
    const expectedDomain = req.headers.get('host') ?? undefined;

    const result = await verifySiweMessage(
        message,
        signature,
        expectedNonce,
        expectedDomain
    );
    if (!result) {
        return unauthorized('SIWE verification failed');
    }

    session.address = result.address.toLowerCase();
    session.issuedAt = new Date().toISOString();
    // Single-use nonce — clear after success so a replay of the same
    // (message, signature) pair against a fresh request fails with
    // "No nonce on session".
    session.nonce = undefined;
    await session.save();

    return NextResponse.json({ address: session.address });
}

export async function DELETE() {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ ok: true });
}
