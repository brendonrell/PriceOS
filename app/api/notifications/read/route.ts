import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const MAX_BATCH = 200;

export interface MarkReadRequestBody {
  ids: string[];
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

  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return badRequest('`ids` must be a non-empty array of notification IDs');
  }
  if (body.ids.length > MAX_BATCH) {
    return badRequest(`Cannot mark more than ${MAX_BATCH} notifications at once`);
  }

  try {
    const supabase = getSupabaseService();
    // Scoped to recipient_address = caller's address so a user can only ever
    // mark their own notifications read, even if they pass someone else's IDs.
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true } as never)
      .in('id', body.ids)
      .eq('recipient_address', address)
      .select('id');

    if (error) return serverError(error.message);

    const response: MarkReadResponse = { ok: true, updated: data?.length ?? 0 };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
