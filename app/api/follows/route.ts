import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface FollowRequestBody {
  target: string;
}

/**
 * POST response shape — surfaces both the address pair the caller supplied
 * AND the resolved @name pair actually written to the row. The schema is
 * keyed on @name post-Nomenclature-Sweep, but consumers still think in
 * addresses, so we echo both.
 */
export interface FollowResponse {
  follower_address: string;
  following_address: string;
  follower_name: string;
  following_name: string;
  created_at: string;
}

export interface UnfollowResponse {
  ok: true;
  follower_address: string;
  following_address: string;
}

/**
 * Resolve a wallet address → users.handle. Returns null when the wallet
 * has no row OR has a row but has not yet claimed an @name (pre-claim).
 *
 * Mirrors `resolveHandle` in PriceOS-indexer/src/lib/writes.ts so the
 * API and indexer share identical pre-claim semantics.
 */
async function resolveHandle(
  supabase: ReturnType<typeof getSupabaseService>,
  address: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('handle')
    .eq('address', address)
    .maybeSingle();
  if (error) throw new Error(error.message);
  // Cast around Supabase typed-client `never` inference on column-list selects.
  const row = data as { handle: string | null } | null;
  return row?.handle ?? null;
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: FollowRequestBody;
  try {
    body = (await req.json()) as FollowRequestBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const target = body.target?.toLowerCase();
  if (!target || !ADDRESS_RE.test(target)) {
    return badRequest('Invalid or missing `target` address');
  }
  if (target === address) {
    return badRequest('Cannot follow self');
  }

  try {
    const supabase = getSupabaseService();

    const [followerName, followingName] = await Promise.all([
      resolveHandle(supabase, address),
      resolveHandle(supabase, target),
    ]);

    // Pre-claim: either party has no @name yet. Mirror indexer
    // insertFollow semantics — silently skip, no row written.
    if (followerName === null || followingName === null) {
      return new NextResponse(null, { status: 204 });
    }

    const payload = {
      follower_name: followerName,
      following_name: followingName,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('follows')
      .upsert(payload as never, {
        onConflict: 'follower_name,following_name',
      })
      .select()
      .single();

    if (error) return serverError(error.message);

    const row = data as {
      follower_name: string;
      following_name: string;
      created_at: string;
    };
    const response: FollowResponse = {
      follower_address: address,
      following_address: target,
      follower_name: row.follower_name,
      following_name: row.following_name,
      created_at: row.created_at,
    };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export const DELETE = requireAuth(async (req, _ctx, address) => {
  const target = new URL(req.url).searchParams.get('target')?.toLowerCase();
  if (!target || !ADDRESS_RE.test(target)) {
    return badRequest('Invalid or missing `?target=` address');
  }

  try {
    const supabase = getSupabaseService();

    const [followerName, followingName] = await Promise.all([
      resolveHandle(supabase, address),
      resolveHandle(supabase, target),
    ]);

    // Pre-claim: no row could exist under @name keys. Nothing to delete.
    if (followerName === null || followingName === null) {
      return new NextResponse(null, { status: 204 });
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_name', followerName)
      .eq('following_name', followingName);

    if (error) return serverError(error.message);

    const response: UnfollowResponse = {
      ok: true,
      follower_address: address,
      following_address: target,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
