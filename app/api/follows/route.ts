import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, type FollowRow } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface FollowRequestBody {
  target: string;
}

export type FollowResponse = FollowRow;

export interface UnfollowResponse {
  ok: true;
  follower_address: string;
  following_address: string;
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
    const { data, error } = await supabase
      .from('follows')
      .upsert(
        {
          follower_address: address,
          following_address: target,
          created_at: new Date().toISOString(),
        },
        { onConflict: 'follower_address,following_address' }
      )
      .select()
      .single();

    if (error) return serverError(error.message);
    const response: FollowResponse = data;
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
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_address', address)
      .eq('following_address', target);

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
