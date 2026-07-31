// What's Hot — the PUBLIC face of the view pillar (Brendon, 2026-07-31).
//   GET ?slug=  → [{ id, viewers }] — the project's hottest Outputs, hottest
//                 first, max 5.
//
// Hot = PEOPLE, not opens. Every viewer of a piece contributes a weight set by
// how recently they were last there; a viewer who keeps re-opening the same
// piece adds only a little on top of their first look, so one person refreshing
// can never out-rank a piece three people actually went to see.
//
// The rows behind this stay private — no viewer name, no per-person count, and
// no timestamp leaves this route. Only the ranking does.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

/** How many pieces the rail shows — the crumb trail's own count. */
const HOT_COUNT = 5;
/** How far back a view still counts as "hot". */
const WINDOW_DAYS = 7;
/** A viewer's own repeat opens are worth this much each, on top of their
 *  first look, up to REPEAT_CAP of them. Keeps the ranking about people. */
const REPEAT_WEIGHT = 0.25;
const REPEAT_CAP = 4;
/** Project-page visits ride the same table under this sentinel id — they are
 *  not pieces, so they never rank. */
const PROJECT_VIEW_ID = 0;

export interface HotOutput { id: number; viewers: number }

/** Freshness: today's look is worth full weight, the week's is worth a
 *  quarter. This is what makes the list MOVE instead of ossifying. */
function recencyWeight(ageMs: number): number {
    const hour = 3600_000;
    if (ageMs <= 24 * hour) return 1;
    if (ageMs <= 72 * hour) return 0.6;
    return 0.3;
}

export async function GET(req: Request) {
    const slug = (new URL(req.url).searchParams.get('slug') ?? '').toLowerCase();
    if (!SLUG_RE.test(slug)) return badRequest('Invalid or missing slug');

    try {
        const supabase = getSupabaseService();
        const { data, error } = await supabase
            .from('output_views')
            .select('token_id, views, last_viewed_at')
            .eq('project_id', slug)
            .neq('token_id', PROJECT_VIEW_ID)
            .order('last_viewed_at', { ascending: false })
            .limit(5000);
        if (error) return serverError(error.message);

        const rows = (data ?? []) as { token_id: number; views: number | null; last_viewed_at: string }[];
        const now = Date.now();
        const cutoff = now - WINDOW_DAYS * 86400_000;

        /* One tally per piece: its score, how many people it drew inside the
           window, and when it was last looked at (the tie-break, and the
           fallback ordering when the window is empty). */
        const tally = new Map<number, { score: number; viewers: number; last: number }>();
        for (const r of rows) {
            const t = Date.parse(r.last_viewed_at);
            if (!Number.isFinite(t)) continue;
            const cur = tally.get(r.token_id) ?? { score: 0, viewers: 0, last: 0 };
            cur.last = Math.max(cur.last, t);
            if (t >= cutoff) {
                const repeats = Math.min(Math.max((r.views ?? 1) - 1, 0), REPEAT_CAP);
                cur.score += recencyWeight(now - t) * (1 + repeats * REPEAT_WEIGHT);
                cur.viewers += 1;
            }
            tally.set(r.token_id, cur);
        }

        const ranked = [...tally.entries()]
            .map(([id, v]) => ({ id, ...v }))
            /* Inside the window first, by heat; everything else falls in
               behind by how recently it was last seen — so a quiet week shows
               the last things people looked at rather than nothing at all. */
            .sort((a, b) => (b.score - a.score) || (b.viewers - a.viewers) || (b.last - a.last))
            .slice(0, HOT_COUNT)
            .map((v): HotOutput => ({ id: v.id, viewers: v.viewers }));

        return NextResponse.json(ranked);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
