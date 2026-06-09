import { getSupabaseAnon, PUBLIC_USER_COLUMNS, type UserRow } from '@/lib/supabase';

/** Profile row plus follower/following counts — the shape both the
 *  /api/user/by-handle route and the server-rendered profile page use. */
export interface UserProfileData extends UserRow {
  follower_count: number;
  following_count: number;
}

// Handle shape mirrors lib/slug.ts: ASCII alphanumerics, underscore, hyphen.
const HANDLE_RE = /^[a-z0-9_-]+$/;
const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

/**
 * Resolve a wallet address to its owner's permanent handle. Addresses are
 * stored lowercase (SIWE session lowercases throughout), so we lowercase the
 * input and match exactly. Returns null when the address is malformed, has no
 * row, or the row has no handle. Throws on a real DB error. Anon client, RLS.
 */
export async function getHandleByAddress(
  rawAddress: string
): Promise<string | null> {
  const address = rawAddress.toLowerCase();
  if (!ADDRESS_RE.test(address)) return null;

  const supabase = getSupabaseAnon();
  const { data, error } = await supabase
    .from('users')
    .select('handle')
    .eq('address', address)
    .maybeSingle();

  if (error) throw new Error(error.message);
  const row = data as { handle: string | null } | null;
  return row?.handle ?? null;
}

/**
 * Look up a public profile by its permanent handle, with follower/following
 * counts. Returns null when the handle is malformed or no row matches.
 * Throws on a real DB error so callers can distinguish "no user" from
 * "lookup failed." Safe server-side (anon client, RLS-bound, reads only).
 */
export async function getUserProfileByHandle(
  rawHandle: string
): Promise<UserProfileData | null> {
  const handle = rawHandle.toLowerCase();
  if (!HANDLE_RE.test(handle)) return null;

  const supabase = getSupabaseAnon();

  const { data: user, error: userErr } = await supabase
    .from('users')
    .select(PUBLIC_USER_COLUMNS)
    .eq('handle', handle)
    .maybeSingle();

  if (userErr) throw new Error(userErr.message);
  if (!user) return null;

  const userRow = user as UserRow;
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

  if (followersRes.error) throw new Error(followersRes.error.message);
  if (followingRes.error) throw new Error(followingRes.error.message);

  return {
    ...userRow,
    follower_count: followersRes.count ?? 0,
    following_count: followingRes.count ?? 0,
  };
}
