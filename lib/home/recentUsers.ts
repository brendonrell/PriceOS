import { getSupabaseAnon } from '@/lib/supabase';

/**
 * The last N signups, newest first.
 *
 * A signup is a users row with a claimed @handle (the row is created at claim
 * time by /api/users/create). Same anon (RLS-bound) read off `users` as the
 * leaderboards; the NEW USERS feed renders each row as the full ASCII-ID
 * rectangle via the client's per-handle caches.
 *
 * Lives here (not in app/api/users/recent/route.ts) so the home page's server
 * render can call it directly to seed NewUsersFeed (Brendon, 2026-08-26 —
 * same "no ghost rows on first paint" pass as the Social Feed). Next.js's
 * typed routes only allow route.ts to export HTTP method handlers, so a
 * plain helper export there fails the build's route-shape check.
 */
export interface RecentUserRow {
  handle: string;
  address: string;
  /** Signup instant (ISO, UTC) — rendered viewer-local. */
  created_at: string;
}

export interface RecentUsersResponse {
  rows: RecentUserRow[];
}

export async function buildRecentUsers(limit: number = 200): Promise<RecentUserRow[]> {
  const supabase = getSupabaseAnon();
  const res = await supabase
    .from('users')
    .select('address, handle, created_at')
    .not('handle', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (res.error) throw new Error(res.error.message);

  return ((res.data ?? []) as Array<{
    address: string;
    handle: string | null;
    created_at: string;
  }>)
    .filter((u) => u.handle !== null)
    .map((u) => ({
      handle: u.handle as string,
      address: u.address.toLowerCase(),
      created_at: u.created_at,
    }));
}
