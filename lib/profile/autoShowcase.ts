/*
 * autoShowcase — fills a never-customized Showcase from the user's own
 * holdings instead of leaving it 6 empty slots (Brendon, 2026-09-08: "empty
 * showcases are boring... let's help the user make their showcase look full
 * and varied right up until they change it").
 *
 * The pattern mirrors the PROJECT Showcase's existing empty-state fallback
 * (components/project/useProjectGallery.ts: "Until the artist curates,
 * auto-feed the FIRST 6 MINTS") but adds two things a project doesn't need:
 * project-DIVERSITY as the collection grows, and a permanent FREEZE once
 * that diversity target is hit — a project only ever has one "artist", so
 * it never needed either.
 *
 * Rule, in the order Brendon gave it:
 *   1. Start: the user's first 6 mints (chronological, mint_ts ascending).
 *      With one project owned, that's 6 pieces from that one project — same
 *      shape as the project fallback.
 *   2. As they collect from more distinct projects (up to 6), the 6 slots
 *      progressively SPLIT to include one piece from each newly-represented
 *      project — round-robin over each represented project's own
 *      chronological holdings, so early/deep projects still get more than
 *      one slot until every slot has a distinct project behind it.
 *   3. The moment 6 distinct projects are represented, it's exactly one
 *      slot per project — and callers persist that fact (distinctProjects
 *      >= 6) as a permanent freeze; this function is then never called
 *      again for that user (see showcase_auto_locked in /api/me).
 *
 * Ownership of "manual overrides this permanently" and "the freeze" is
 * NOT this function's job — it's a pure computation over holdings, with no
 * knowledge of what's already stored. The caller (GET /api/me) owns the
 * showcase_user_set / showcase_auto_locked gate.
 */

import type { Showcase, ShowcaseSlot } from '@/lib/supabase';

export interface AutoShowcaseHolding {
    slug: string;
    token_id: number;
    /** Mint event Unix seconds — null holdings sort last (rare: a piece
     *  with no recorded MINT event), tiebroken by slug/token_id so the
     *  result is still deterministic. */
    mint_ts: number | null;
}

export interface AutoShowcaseResult {
    slots: Showcase['slots'];
    /** Count of distinct projects represented in the result — the caller
     *  freezes (showcase_auto_locked = true) once this reaches 6. */
    distinctProjects: number;
}

/** Pure: build the auto-fill Showcase from a wallet's current holdings, or
 *  null if the wallet owns nothing yet (nothing to show — leave it empty
 *  rather than force 6 nulls through the write path for no reason). */
export function buildAutoShowcase(holdings: AutoShowcaseHolding[]): AutoShowcaseResult | null {
    if (holdings.length === 0) return null;

    const sorted = [...holdings].sort((a, b) => {
        const at = a.mint_ts ?? Number.MAX_SAFE_INTEGER;
        const bt = b.mint_ts ?? Number.MAX_SAFE_INTEGER;
        if (at !== bt) return at - bt;
        return a.slug === b.slug ? a.token_id - b.token_id : a.slug.localeCompare(b.slug);
    });

    // Group by project, each group already in that project's own
    // chronological order. Map insertion order = each project's FIRST
    // appearance in `sorted` = the project-discovery order across the
    // whole collection.
    const byProject = new Map<string, AutoShowcaseHolding[]>();
    for (const h of sorted) {
        const arr = byProject.get(h.slug);
        if (arr) arr.push(h);
        else byProject.set(h.slug, [h]);
    }

    const discoveryOrder = [...byProject.keys()];
    const represented = discoveryOrder.slice(0, 6);

    // Base pass: one slot per represented project (its own earliest piece).
    const picks: AutoShowcaseHolding[] = represented.map((slug) => byProject.get(slug)![0]);

    // Fill any remaining slots by round-robining EXTRA pieces from the
    // represented projects, in discovery order, oldest-of-the-rest first —
    // this is what makes a 1-project collection fill with that project's
    // first 6 mints, and makes an under-6-projects collection "split"
    // proportionally as new projects show up instead of jumping straight
    // to 1-each before there's anything to fill the rest with.
    let round = 1;
    while (picks.length < 6) {
        let addedAny = false;
        for (const slug of represented) {
            if (picks.length >= 6) break;
            const arr = byProject.get(slug)!;
            if (arr.length > round) {
                picks.push(arr[round]!);
                addedAny = true;
            }
        }
        if (!addedAny) break; // every represented project's holdings exhausted
        round++;
    }

    const filled: (ShowcaseSlot | null)[] = picks
        .slice(0, 6)
        .map((h) => ({ project_id: h.slug, token_id: String(h.token_id) }));
    while (filled.length < 6) filled.push(null);

    return {
        slots: filled as Showcase['slots'],
        distinctProjects: discoveryOrder.length,
    };
}

/** Cheap equality check so the caller can skip a no-op write. */
export function showcaseSlotsEqual(a: Showcase['slots'], b: Showcase['slots']): boolean {
    for (let i = 0; i < 6; i++) {
        const x = a[i];
        const y = b[i];
        if (x === null || y === null) {
            if (x !== y) return false;
            continue;
        }
        if (x.project_id !== y.project_id || x.token_id !== y.token_id) return false;
    }
    return true;
}
