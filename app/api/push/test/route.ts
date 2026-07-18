// GET /api/push/test — DIAGNOSTIC (2026-07-18, the banner hunt).
//
// Sends a raw test push to EVERY device the authed caller has registered,
// bypassing the preference gate, and returns the push service's exact
// per-device response inline. Visit it while signed in on the device you want
// to test: the HTTP body shows whether the send left the server cleanly, and
// (if native push is healthy) the phone shows a "Test push" banner within
// a second or two. Self-only — never touches another account's devices.

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { sendTestPush } from '@/lib/push/webpush';
import { serverError } from '@/lib/errors';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (_req, _ctx, address) => {
  try {
    const result = await sendTestPush(address);
    return NextResponse.json(result, { headers: { 'cache-control': 'no-store' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'test push failed');
  }
});
