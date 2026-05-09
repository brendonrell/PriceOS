import { type NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getIronSession, type IronSession, type SessionOptions } from 'iron-session';
import { SiweMessage } from 'siwe';
import { unauthorized } from '@/lib/errors';

// ─────────────────────────────────────────────────────────────────────────────
// SIWE (Sign-In With Ethereum) session.
// ─────────────────────────────────────────────────────────────────────────────
//
// Sessions are stored in a single httpOnly, signed-and-encrypted cookie via
// iron-session. No server-side session store needed.
//
// Lifecycle:
//   1. Client requests a nonce from a future POST /api/auth/nonce route, which
//      writes a fresh nonce into the session.
//   2. Client signs an EIP-4361 message containing that nonce with their wallet.
//   3. Client POSTs { message, signature } to a future POST /api/auth/verify
//      route, which calls verifySiweMessage() below and, on success, writes
//      the recovered address into the session.
//   4. Subsequent write requests pass through requireAuth(), which reads the
//      session via verifySiweSession() and rejects if no address is present.
//
// The /api/auth/nonce and /api/auth/verify route handlers are intentionally
// not part of this scaffold — they ship alongside the wallet-connect UI.
// ─────────────────────────────────────────────────────────────────────────────

export interface SiweSession {
  address?: string;
  nonce?: string;
  issuedAt?: string;
  chainId?: number;
}

const SESSION_COOKIE_NAME = 'pd_siwe_session';

function sessionOptions(): SessionOptions {
  const password = process.env.SIWE_SESSION_SECRET;
  if (!password || password.length < 32) {
    throw new Error(
      'SIWE_SESSION_SECRET is not set or is shorter than 32 chars (required for cookie encryption)'
    );
  }
  return {
    cookieName: SESSION_COOKIE_NAME,
    password,
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    },
  };
}

export async function getSession(): Promise<IronSession<SiweSession>> {
  return getIronSession<SiweSession>(cookies(), sessionOptions());
}

/**
 * Read the SIWE session cookie and return the authenticated address (lowercase),
 * or null if no session is present.
 */
export async function verifySiweSession(_request: NextRequest): Promise<string | null> {
  try {
    const session = await getSession();
    if (!session.address) return null;
    return session.address.toLowerCase();
  } catch {
    return null;
  }
}

/**
 * Verify a raw SIWE { message, signature } pair. Used by the future
 * POST /api/auth/verify route to establish a session. Returns the recovered
 * address (lowercase) and the nonce on success, or null on any failure.
 *
 * The expectedNonce should be the value previously stored in the session by
 * /api/auth/nonce, so replays are rejected.
 */
export async function verifySiweMessage(
  message: string,
  signature: string,
  expectedNonce?: string
): Promise<{ address: string; nonce: string } | null> {
  try {
    const siwe = new SiweMessage(message);
    const result = await siwe.verify({ signature, nonce: expectedNonce });
    if (!result.success) return null;
    return {
      address: result.data.address.toLowerCase(),
      nonce: result.data.nonce,
    };
  } catch {
    return null;
  }
}

/**
 * Wrap a route handler so it only runs when a SIWE session is present.
 * The wrapped handler receives the authenticated address (lowercase) as a
 * third argument.
 *
 * Usage:
 *   export const POST = requireAuth(async (req, ctx, address) => { ... });
 */
export function requireAuth<TParams = Record<string, string>>(
  handler: (
    req: NextRequest,
    ctx: { params: TParams },
    address: string
  ) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest, ctx: { params: TParams }): Promise<NextResponse> => {
    const address = await verifySiweSession(req);
    if (!address) return unauthorized('SIWE session required');
    return handler(req, ctx, address);
  };
}
