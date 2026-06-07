/*
 * POST /api/auth/nonce
 *
 * First step of the SIWE flow. Generates a fresh EIP-4361 nonce,
 * writes it into the iron-session cookie under `session.nonce`, and
 * returns it to the client. The client then folds the nonce into the
 * SIWE message they'll sign, and POSTs both back to /api/auth/siwe
 * for verification.
 *
 * Nonce is single-use: /api/auth/siwe clears `session.nonce` after a
 * successful verify. A second POST to /api/auth/siwe with the same
 * message will fail because the expected nonce is gone. Replays
 * across cookies are blocked by SameSite=Lax + the cookie being
 * httpOnly + the address binding inside the message itself.
 *
 * `siwe`'s `generateNonce()` returns a 17-char alphanumeric string
 * (per EIP-4361 spec: "an at least 8-character random alphanumeric
 * string"). Cryptographically random via the platform's RNG.
 */

import { NextResponse } from 'next/server';
import { generateNonce } from 'siwe';
import { getSession } from '@/lib/auth/siwe';

export const dynamic = 'force-dynamic';

export async function POST() {
    const nonce = generateNonce();
    const session = await getSession();
    session.nonce = nonce;
    await session.save();
    return NextResponse.json({ nonce });
}
