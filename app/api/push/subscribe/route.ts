// POST /api/push/subscribe — register this device for "3D Pingtoasts".
//
// Body: a Web Push subscription { endpoint, keys: { p256dh, auth } } produced by
// the browser after the user grants notification permission. SIWE-gated: the row
// is owned by the authed address. Upsert on endpoint so re-subscribing the same
// device (key rotation, re-grant) updates in place instead of duplicating.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface SubscribeBody {
  subscription?: {
    endpoint?: string;
    keys?: { p256dh?: string; auth?: string };
  };
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: SubscribeBody;
  try {
    body = (await req.json()) as SubscribeBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const sub = body.subscription;
  const endpoint = sub?.endpoint;
  const p256dh = sub?.keys?.p256dh;
  const auth = sub?.keys?.auth;
  if (!endpoint || !p256dh || !auth) {
    return badRequest('A complete push subscription (endpoint + keys) is required');
  }

  try {
    const db = getSupabaseService();
    const ua = req.headers.get('user-agent')?.slice(0, 300) ?? null;
    const { error } = await db
      .from('push_subscriptions')
      .upsert(
        {
          user_address: address.toLowerCase(),
          endpoint,
          p256dh,
          auth,
          user_agent: ua,
          updated_at: new Date().toISOString(),
        } as never,
        { onConflict: 'endpoint' },
      );
    if (error) return serverError(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
