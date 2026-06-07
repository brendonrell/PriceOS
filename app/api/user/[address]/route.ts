import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon, type UserRow } from '@/lib/supabase';
import { badRequest, notFound, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface UserProfileResponse extends UserRow {
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

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('address', address)
      .maybeSingle();

    if (userErr) return serverError(userErr.message);
    if (!user) return notFound('User not found');

    const userRow = user as UserRow;

    // Pre-claim: no handle → no follows possible (follows.* is keyed on
    // @name, not wallet). Skip the follows queries and return zero counts.
    let follower_count = 0;
    let following_count = 0;
    if (userRow.handle !== null) {
      const [followersRes, followingRes] = await Promise.all([
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_name', userRow.handle),
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_name', userRow.handle),
      ]);

      if (followersRes.error) return serverError(followersRes.error.message);
      if (followingRes.error) return serverError(followingRes.error.message);

      follower_count = followersRes.count ?? 0;
      following_count = followingRes.count ?? 0;
    }

    const response: UserProfileResponse = {
      ...userRow,
      follower_count,
      following_count,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
