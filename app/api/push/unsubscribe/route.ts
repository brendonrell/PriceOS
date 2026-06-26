// POST /api/push/unsubscribe — drop this device's "3D Pingtoasts" registration.
//
// Body: { endpoint }. SIWE-gated and scoped to the authed address, so a caller
// can only remove their own device. Best-effort: a missing row is a no-op.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

interface UnsubscribeBody {
  endpoint?: string;
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: UnsubscribeBody;
  try {
    body = (await req.json()) as UnsubscribeBody;
  } catch {
    return badRequest('Invalid JSON body');
  }
  const endpoint = body.endpoint;
  if (!endpoint) return badRequest('`endpoint` is required');

  try {
    const db = getSupabaseService();
    const { error } = await db
      .from('push_subscriptions')
      .delete()
      .eq('user_address', address.toLowerCase())
      .eq('endpoint', endpoint);
    if (error) return serverError(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
