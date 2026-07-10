import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/*
 * Minigame best scores (game_scores — Lane Runner first).
 *
 * GET  /api/game-score?game=lane-runner — the top 10, @handles attached.
 *      Anon RLS read; only named accounts chart (an unclaimed wallet can
 *      set a device best, not a world record).
 * POST /api/game-score { game, score } — SIWE-authed submit; the service
 *      row keeps GREATEST(best, score), so replays can only raise it.
 */

const GAMES = new Set(['lane-runner']);
/** Sanity ceiling — Lane Runner scores are +1/row at ≤ ~4 rows/sec; a run
 *  above this is nobody's afternoon, it's a forged request. */
const SCORE_CAP = 100_000;

export interface GameScoreRow {
  handle: string;
  address: string;
  best: number;
}

export interface GameScoreResponse {
  rows: GameScoreRow[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const game = req.nextUrl.searchParams.get('game') ?? '';
  if (!GAMES.has(game)) return badRequest('unknown game');
  try {
    const supabase = getSupabaseAnon();
    const res = await supabase
      .from('game_scores')
      .select('address, best')
      .eq('game', game)
      .gt('best', 0)
      .order('best', { ascending: false })
      .order('updated_at', { ascending: true })
      .limit(10);
    if (res.error) return serverError(res.error.message);

    const scores = (res.data ?? []) as Array<{ address: string; best: number }>;
    if (scores.length === 0) return NextResponse.json({ rows: [] } satisfies GameScoreResponse);

    const users = await supabase
      .from('users')
      .select('address, handle')
      .in('address', scores.map((s) => s.address));
    if (users.error) return serverError(users.error.message);
    const handleByAddr = new Map(
      ((users.data ?? []) as Array<{ address: string; handle: string | null }>)
        .filter((u) => u.handle)
        .map((u) => [u.address.toLowerCase(), u.handle as string]),
    );

    const rows: GameScoreRow[] = scores
      .map((s) => ({
        address: s.address.toLowerCase(),
        best: s.best,
        handle: handleByAddr.get(s.address.toLowerCase()) ?? '',
      }))
      .filter((r) => r.handle !== '');
    return NextResponse.json({ rows } satisfies GameScoreResponse);
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'game score read failed');
  }
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: { game?: unknown; score?: unknown };
  try {
    body = await req.json();
  } catch {
    return badRequest('invalid JSON');
  }
  const game = typeof body.game === 'string' ? body.game : '';
  const score = typeof body.score === 'number' ? Math.floor(body.score) : NaN;
  if (!GAMES.has(game)) return badRequest('unknown game');
  if (!Number.isFinite(score) || score <= 0 || score > SCORE_CAP) return badRequest('invalid score');

  try {
    const supabase = getSupabaseService();
    const addr = address.toLowerCase();
    const existing = await supabase
      .from('game_scores')
      .select('best')
      .eq('game', game)
      .eq('address', addr)
      .maybeSingle();
    if (existing.error) return serverError(existing.error.message);
    const prev = (existing.data as { best: number } | null)?.best ?? 0;
    if (score <= prev) return NextResponse.json({ best: prev });

    // House upsert shape (matches follows/anoint): payload cast + onConflict.
    const payload = { game, address: addr, best: score, updated_at: new Date().toISOString() };
    const up = await supabase
      .from('game_scores')
      .upsert(payload as never, { onConflict: 'game,address' });
    if (up.error) return serverError(up.error.message);
    return NextResponse.json({ best: score });
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'game score write failed');
  }
});
