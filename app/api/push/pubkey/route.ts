// GET /api/push/pubkey — the VAPID PUBLIC key for this deployment.
//
// Public by design: this is the applicationServerKey every browser subscribes
// with. It exists so the client never depends on the key being inlined at BUILD
// time (a Cloudflare build-variable that has silently gone missing twice, leaving
// every device on the 'unsupported' path). The worker always has the key at
// runtime because lib/push/webpush.ts signs sends with the same value — reading
// it here in the same order keeps the signing pair from ever drifting.

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export function GET() {
  const key =
    process.env.NEXT_PUBLIC_WEBPUSH_KEY ||
    process.env.VAPID_PUBLIC_KEY ||
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    '';
  return NextResponse.json({ key });
}
