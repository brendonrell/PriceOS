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

    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_address', address),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_address', address),
    ]);

    if (followersRes.error) return serverError(followersRes.error.message);
    if (followingRes.error) return serverError(followingRes.error.message);

    const response: UserProfileResponse = {
      ...user,
      follower_count: followersRes.count ?? 0,
      following_count: followingRes.count ?? 0,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
