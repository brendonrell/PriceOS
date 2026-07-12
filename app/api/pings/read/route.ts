// POST /api/pings/read — mark pings read.
//
// Body: { ids: string[] }        → mark those directed pings read (row-level;
//                                   does NOT touch the broadcast watermark)
//    or { all: true }             → mark ALL the caller's pings read + bump
//                                   the broadcast watermark to now
//    or { broadcast_seen: true }  → bump ONLY the broadcast watermark — sent
//                                   by the client once every unread broadcast
//                                   item in the window has been scrolled past
//
// Always scoped to recipient_address = caller, so a user can only ever mark
// their OWN pings read even if they pass someone else's ids. The watermark is
// deliberately NOT bumped on ids-only calls: read-by-scroll marks rows one by
// one, and a blanket bump would silently flag unscrolled broadcast items.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const MAX_BATCH = 200;

export interface MarkReadRequestBody {
  ids?: string[];
  all?: boolean;
  broadcast_seen?: boolean;
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
  const bumpBroadcast = markAll || body.broadcast_seen === true;
  const hasIds = Array.isArray(body.ids) && body.ids.length > 0;
  if (!markAll && !hasIds && !bumpBroadcast) {
    return badRequest('Provide `ids` (non-empty array), `all: true`, or `broadcast_seen: true`');
  }
  if (hasIds && (body.ids as string[]).length > MAX_BATCH) {
    return badRequest(`Cannot mark more than ${MAX_BATCH} pings at once`);
  }

  try {
    const db = getSupabaseService();

    let updated = 0;
    if (markAll || hasIds) {
      let update = db
        .from('pings')
        .update({ read: true } as never)
        .eq('recipient_address', address)
        .eq('read', false);
      if (!markAll) update = update.in('id', body.ids as string[]);
      const { data, error } = await update.select('id');
      if (error) return serverError(error.message);
      updated = data?.length ?? 0;
    }

    if (bumpBroadcast) {
      const nowSec = Math.floor(Date.now() / 1000);
      await db
        .from('ping_cursors')
        .upsert(
          { user_address: address, broadcast_seen_at: nowSec, updated_at: new Date().toISOString() } as never,
          { onConflict: 'user_address' }
        );
    }

    const response: MarkReadResponse = { ok: true, updated };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
