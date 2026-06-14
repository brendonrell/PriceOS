// POST /api/pings/read — mark pings read.
//
// Body: { ids: string[] }  → mark those directed pings read
//    or { all: true }      → mark ALL the caller's pings read
//
// Always scoped to recipient_address = caller, so a user can only ever mark
// their OWN pings read even if they pass someone else's ids. Also bumps the
// broadcast watermark (ping_cursors) to now, so the broadcast firewall slice
// (next) treats everything seen up to this moment as read.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const MAX_BATCH = 200;

export interface MarkReadRequestBody {
  ids?: string[];
  all?: boolean;
}

export interface MarkReadResponse {
  ok: true;
  updated: number;
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: MarkReadRequestBody;
  try {
    body = (await req.json()) as MarkReadRequestBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const markAll = body.all === true;
  if (!markAll) {
    if (!Array.isArray(body.ids) || body.ids.length === 0) {
      return badRequest('Provide `ids` (non-empty array) or `all: true`');
    }
    if (body.ids.length > MAX_BATCH) {
      return badRequest(`Cannot mark more than ${MAX_BATCH} pings at once`);
    }
  }

  try {
    const db = getSupabaseService();

    let update = db
      .from('pings')
      .update({ read: true } as never)
      .eq('recipient_address', address)
      .eq('read', false);
    if (!markAll) update = update.in('id', body.ids as string[]);

    const { data, error } = await update.select('id');
    if (error) return serverError(error.message);

    // Bump the broadcast watermark (best-effort; for the firehose slice).
    const nowSec = Math.floor(Date.now() / 1000);
    await db
      .from('ping_cursors')
      .upsert(
        { user_address: address, broadcast_seen_at: nowSec, updated_at: new Date().toISOString() } as never,
        { onConflict: 'user_address' }
      );

    const response: MarkReadResponse = { ok: true, updated: data?.length ?? 0 };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
