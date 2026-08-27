import { NextResponse } from 'next/server';
import { serverError } from '@/lib/errors';
import { buildRecentUsers, type RecentUsersResponse } from '@/lib/home/recentUsers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/users/recent — the last 200 signups, newest first. Builder logic
 * lives in lib/home/recentUsers.ts (see that file for why it's not here —
 * this route just calls it).
 */
export async function GET(): Promise<NextResponse> {
  try {
    const rows = await buildRecentUsers();
    return NextResponse.json({ rows } satisfies RecentUsersResponse);
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'recent users failed');
  }
}
