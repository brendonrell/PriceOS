import { NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/recent — the last 200 signups, newest first.
 *
 * A signup is a users row with a claimed @handle (the row is created at claim
 * time by /api/users/create). Same anon (RLS-bound) read off `users` as the
 * leaderboards; the NEW USERS feed renders each row as the full ASCII-ID
 * rectangle via the client's per-handle caches.
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

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = getSupabaseAnon();
    const res = await supabase
      .from('users')
      .select('address, handle, created_at')
      .not('handle', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200);

    if (res.error) return serverError(res.error.message);

    const rows: RecentUserRow[] = ((res.data ?? []) as Array<{
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

    return NextResponse.json({ rows } satisfies RecentUsersResponse);
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'recent users failed');
  }
}
