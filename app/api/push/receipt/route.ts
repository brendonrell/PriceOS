// POST /api/push/receipt — DIAGNOSTIC (2026-07-18, the banner hunt).
//
// The service worker beacons here the INSTANT a push lands on a device, so the
// server can SEE device-side receipt (something no other signal reveals). Open
// by design — the SW carries no session — and harmless: it only writes one
// diagnostic line into the error sink. The presence/absence of a receipt after
// a test send is the whole answer: receipt + no banner = iOS display problem;
// no receipt = the push never reached the device despite Apple's success.
// Remove with the SW beacon once native banners are confirmed working.

import { NextResponse } from 'next/server';
import { recordError } from '@/lib/telemetry/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    /* ignore malformed */
  }
  const ua = req.headers.get('user-agent')?.slice(0, 120) ?? '';
  // A timestamp nonce makes each beacon a distinct row (the sink dedupes by
  // fingerprint; here we want to see EVERY receipt, not a collapsed count).
  await recordError({
    kind: 'client',
    route: '/api/push/receipt',
    message: `[push-receipt ${Date.now()}] ${JSON.stringify(body).slice(0, 300)} ua=${ua}`,
  });
  return NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
}
