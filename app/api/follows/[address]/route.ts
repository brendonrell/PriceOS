import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface FollowsListResponse {
  address: string;
  followers: string[];
  following: string[];
  follower_count: number;
  following_count: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
): Promise<NextResponse> {
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) {
    return badRequest('Invalid Ethereum address');
  }

  try {
    const supabase = getSupabaseAnon();
    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from('follows')
        .select('follower_address')
        .eq('following_address', address),
      supabase
        .from('follows')
        .select('following_address')
        .eq('follower_address', address),
    ]);

    if (followersRes.error) return serverError(followersRes.error.message);
    if (followingRes.error) return serverError(followingRes.error.message);

    const followers = ((followersRes.data ?? []) as Array<{ follower_address: string }>).map(
      (r) => r.follower_address
    );
    const following = ((followingRes.data ?? []) as Array<{ following_address: string }>).map(
      (r) => r.following_address
    );

    const response: FollowsListResponse = {
      address,
      followers,
      following,
      follower_count: followers.length,
      following_count: following.length,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
