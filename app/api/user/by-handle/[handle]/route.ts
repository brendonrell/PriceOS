import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon, type UserRow } from '@/lib/supabase';
import { badRequest, notFound, serverError } from '@/lib/errors';
import type { UserProfileResponse } from '@/app/api/user/[address]/route';

export const dynamic = 'force-dynamic';

// Handle shape mirrors lib/slug.ts validation: ASCII alphanumerics,
// underscore, hyphen. Handles are stored lowercase (citext UNIQUE) and
// are permanently 1:1 with a wallet — they never change, so the handle
// is a stable lookup key for the public profile page.
const HANDLE_RE = /^[a-z0-9_-]+$/;

export async function GET(
  _req: NextRequest,
  { params }: { params: { handle: string } }
): Promise<NextResponse> {
  const handle = params.handle.toLowerCase();
  if (!HANDLE_RE.test(handle)) {
    return badRequest('Invalid handle');
  }

  try {
    const supabase = getSupabaseAnon();

    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('*')
      .eq('handle', handle)
      .maybeSingle();

    if (userErr) return serverError(userErr.message);
    if (!user) return notFound('User not found');

    const userRow = user as UserRow;
    // We matched on handle, so it is non-null here.
    const userHandle = userRow.handle as string;

    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_name', userHandle),
      supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_name', userHandle),
    ]);

    if (followersRes.error) return serverError(followersRes.error.message);
    if (followingRes.error) return serverError(followingRes.error.message);

    const response: UserProfileResponse = {
      ...userRow,
      follower_count: followersRes.count ?? 0,
      following_count: followingRes.count ?? 0,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
