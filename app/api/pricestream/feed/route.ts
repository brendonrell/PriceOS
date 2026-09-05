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

export const dynamic = 'force-dynamic';

const POOL_SIZE = 200;   // rows pulled before shuffling
const DEFAULT_COUNT = 20;

export interface PriceStreamCard {
    slug: string;
    tokenId: number;
    artist: string | null;
    projectName: string | null;
    dominantColor: string | null;
    listed: boolean;
    priceEth: number | null;
}

function shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

export async function GET(req: Request) {
    const url = new URL(req.url);
    const count = Math.min(Math.max(Number(url.searchParams.get('count')) || DEFAULT_COUNT, 1), 50);

    const db = getSupabaseService();

    const [outputsRes, listingsRes] = await Promise.all([
        db
            .from('outputs')
            .select('project_id, token_id, artist, project_name, dominant_color')
            .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
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

    const cards: PriceStreamCard[] = shuffle(rows)
        .slice(0, count)
        .map((r) => {
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
            };
        })
        .filter((c) => Number.isFinite(c.tokenId));

    return NextResponse.json({ cards });
}
