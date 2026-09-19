/*
 * /api/pricestream/feed — candidate pool for PriceStream, the vertical feed.
 *
 * v1 (Brendon, 2026-09-04): "just show random outputs even ones I own, for
 * testing purposes — we can expand the algorithm later." No taste-vector
 * ranking yet, no ownership exclusion — a flat random sample across every
 * non-hidden project, real `listed` status from the `listings` table so the
 * feed's cart button is never wrong. The taste-vector version (fingerprint
 * distance to a viewer's holdings, wildcard-mixed) is a follow-up pass —
 * this route is the shape the client will keep calling either way.
 */

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { HIDDEN_PROJECTS_NOT_IN } from '@/lib/platform/hiddenProjects';
import { normalizePlaylistId } from '@/lib/project/soundtrack';

export const dynamic = 'force-dynamic';

const POOL_SIZE = 5000;  // rows pulled before grouping — generous so a naive
                          // row-order LIMIT can't starve smaller projects
                          // (Brendon, 2026-09-17)
const DEFAULT_COUNT = 20;
const MAX_PER_PROJECT = 8; // cap pulled per project so one deep collection
                            // can't crowd out the round-robin draw below

export interface PriceStreamCard {
    slug: string;
    tokenId: number;
    artist: string | null;
    projectName: string | null;
    dominantColor: string | null;
    listed: boolean;
    priceEth: number | null;
    offersCount: number;
    /** The project's soundtrack as the DB has it (`projects.soundtrack`, bare
     *  playlist id) — the SAME source the output page reads. null = the project
     *  has none; undefined = the lookup failed (client falls back to the registry).
     *  (Brendon, 2026-09-19: the note must work on every output that has one.) */
    soundtrack?: string | null;
}

function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

const ASPECTS = new Set(['tall', 'wide']);

export async function GET(req: Request) {
    const url = new URL(req.url);
    const count = Math.min(Math.max(Number(url.searchParams.get('count')) || DEFAULT_COUNT, 1), 50);
    // v2 (Brendon, 2026-09-16): portrait/landscape split by client orientation —
    // ?aspect=wide serves the landscape-mobile feed, same pool restriction logic
    // as v1's tall-only default, just the other bucket. Square pieces still
    // aren't a candidate pool for either orientation (blurry-crop reasoning
    // from v1 still applies to them).
    const aspectParam = url.searchParams.get('aspect');
    const aspect = ASPECTS.has(aspectParam ?? '') ? (aspectParam as 'tall' | 'wide') : 'tall';

    const db = getSupabaseService();

    const [outputsRes, listingsRes] = await Promise.all([
        db
            .from('outputs')
            .select('project_id, token_id, artist, project_name, dominant_color')
            .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
            // Real mints only — a project with even 1 mint is eligible, not just
            // graduated (18+) ones. Previously ungated, but a naive LIMIT with
            // no per-project balancing meant only the earliest-inserted rows
            // (established, already-graduated projects) ever filled the pool
            // window, starving newer/smaller drops out entirely (Brendon,
            // 2026-09-17).
            .not('minted_at', 'is', null)
            .eq('aspect', aspect)
            .limit(POOL_SIZE),
        db
            .from('listings')
            .select('project_id, token_id, price_eth')
            .eq('active', true)
            .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
            .limit(2000),
    ]);

    if (outputsRes.error) {
        return NextResponse.json({ error: outputsRes.error.message }, { status: 500 });
    }

    const listedByKey = new Map<string, number>();
    for (const row of (listingsRes.data ?? []) as { project_id: string; token_id: number | string; price_eth: number | string }[]) {
        listedByKey.set(`${String(row.project_id).toLowerCase()}:${Number(row.token_id)}`, Number(row.price_eth));
    }

    const rows = (outputsRes.data ?? []) as {
        project_id: string;
        token_id: number | string;
        artist: string | null;
        project_name: string | null;
        dominant_color: string | null;
    }[];

    // Group by project so every project with a mint gets a fair shot at the
    // draw, then round-robin across projects (shuffled each lap) so cards
    // never come from the same project twice in a row (Brendon, 2026-09-17).
    const byProject = new Map<string, typeof rows>();
    for (const r of rows) {
        if (!Number.isFinite(Number(r.token_id))) continue;
        const slug = String(r.project_id).toLowerCase();
        const arr = byProject.get(slug);
        if (arr) {
            if (arr.length < MAX_PER_PROJECT) arr.push(r);
        } else {
            byProject.set(slug, [r]);
        }
    }
    for (const [slug, arr] of byProject) byProject.set(slug, shuffle(arr));

    const picked: typeof rows = [];
    let lastSlug: string | null = null;
    let remaining = Array.from(byProject.keys());
    while (picked.length < count && remaining.length > 0) {
        remaining = shuffle(remaining);
        // Adjacent-repeat guard: skip a project that matches the previous
        // pick unless it's the only one left with cards.
        let order = remaining;
        if (order.length > 1 && order[0] === lastSlug) {
            order = [...order.slice(1), order[0]];
        }
        for (const slug of order) {
            if (picked.length >= count) break;
            const arr = byProject.get(slug);
            if (!arr || arr.length === 0) continue;
            picked.push(arr.pop()!);
            lastSlug = slug;
        }
        remaining = remaining.filter((slug) => (byProject.get(slug)?.length ?? 0) > 0);
    }

    // Item + collection-scope open offers for just the picked cards — the
    // offers pill mirrors the artwork modal's real count, so it must apply
    // the SAME live filter the modal's /market route uses (expired-but-
    // still-status-open rows were getting counted here, badge showed a
    // count the offers panel then opened to 0 of — Brendon, 2026-09-09).
    // Trait-scope offers are still excluded (would need per-card trait
    // computation for all ~20 cards); item + collection covers the common
    // case without that cost.
    const offersCountByKey = new Map<string, number>();
    const collectionOfferCountByProject = new Map<string, number>();
    if (picked.length) {
        const projectIds = Array.from(new Set(picked.map((r) => String(r.project_id).toLowerCase())));
        const now = Math.floor(Date.now() / 1000);
        const { data: offerRows } = await db
            .from('offers')
            .select('project_id, token_id, scope')
            .eq('status', 'open')
            .in('project_id', projectIds)
            .in('scope', ['item', 'collection'])
            .or(`end_time.is.null,end_time.gt.${now}`);
        for (const o of (offerRows ?? []) as { project_id: string; token_id: string | number | null; scope: string | null }[]) {
            const proj = String(o.project_id).toLowerCase();
            if (o.scope === 'collection') {
                collectionOfferCountByProject.set(proj, (collectionOfferCountByProject.get(proj) ?? 0) + 1);
            } else {
                const key = `${proj}:${Number(o.token_id)}`;
                offersCountByKey.set(key, (offersCountByKey.get(key) ?? 0) + 1);
            }
        }
    }

    // Soundtracks — DB is the truth (the output page's ProjectContext reads the
    // same column and treats a null there as "no soundtrack"), so the note only
    // shows where the project page's SOUNDTRACK button would.
    const soundtrackBySlug = new Map<string, string | null>();
    let soundtrackOk = false;
    if (picked.length) {
        const projectIds = Array.from(new Set(picked.map((r) => String(r.project_id).toLowerCase())));
        const { data: projRows, error: projErr } = await db
            .from('projects')
            .select('id, soundtrack')
            .in('id', projectIds);
        if (!projErr) {
            soundtrackOk = true;
            for (const p of (projRows ?? []) as { id: string; soundtrack: string | null }[]) {
                soundtrackBySlug.set(String(p.id).toLowerCase(), normalizePlaylistId(p.soundtrack));
            }
        }
    }

    const cards: PriceStreamCard[] = picked.map((r) => {
        const slug = String(r.project_id).toLowerCase();
        const tokenId = Number(r.token_id);
        const key = `${slug}:${tokenId}`;
        const priceEth = listedByKey.has(key) ? listedByKey.get(key)! : null;
        return {
            slug,
            tokenId,
            artist: r.artist,
            projectName: r.project_name,
            dominantColor: r.dominant_color,
            listed: priceEth != null,
            priceEth,
            offersCount: (offersCountByKey.get(key) ?? 0) + (collectionOfferCountByProject.get(slug) ?? 0),
            soundtrack: soundtrackOk ? (soundtrackBySlug.get(slug) ?? null) : undefined,
        };
    });

    return NextResponse.json({ cards });
}
