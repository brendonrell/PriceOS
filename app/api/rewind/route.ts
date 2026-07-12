// The Rewind ◄ — as-of reads. Read-only by construction (GET only; the
// as-of flag never reaches a write route).
//   GET ?day=N              → home surface as it stood at end of Day N
//   GET ?day=N&slug=oracle  → one project's as-of state (stats + minted ids
//                             + owners-then) for the rewound project page
import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { serverError, badRequest } from '@/lib/errors';
import { buildRewindHome, buildRewindStates, clampRewindDay, rewindDayDate } from '@/lib/rewind/asOf.server';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const url = new URL(req.url);
    const day = clampRewindDay(url.searchParams.get('day'));
    const slug = url.searchParams.get('slug')?.toLowerCase() ?? null;
    const db = getSupabaseService();

    if (slug) {
      if (!getProject(slug)) return badRequest('Unknown project');
      const states = await buildRewindStates(db, day);
      const s = states.get(slug);
      if (!s) return badRequest('Unknown project');
      return NextResponse.json(
        { day, date: rewindDayDate(day), ...s },
        { headers: { 'cache-control': 'public, max-age=300' } },
      );
    }

    const home = await buildRewindHome(db, day);
    return NextResponse.json(home, {
      // Past days never change — cache hard. (Today's partial day gets a
      // short TTL via is_today on the client's refresh behaviour.)
      headers: { 'cache-control': home.is_today ? 'public, max-age=60' : 'public, max-age=3600' },
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
