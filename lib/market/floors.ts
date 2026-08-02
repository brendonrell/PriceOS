/*
 * liveFloors — THE floor read (data audit, 2026-08-02).
 *
 * A project's floor is the lowest ACTIVE, UNEXPIRED listing — the exact
 * read the Output market route has always made. The stored
 * projects.floor_price_eth column has had NO writer since 2026-07-03
 * (the zero-mints reset nulled it and nothing maintains it), so every
 * surface that read it — conviction calls, portfolio targets,
 * counterparty valuations, search, the stone's trend card — was pricing
 * against a dead number. They all read through here now.
 *
 * One indexed query over listings, min per project client-side —
 * launch-scale listings make this cheap everywhere it's called.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/** Lowest live listing per project. `slugs` narrows the read; omitted =
 *  every project with a live listing. Projects with no live listing are
 *  simply absent from the map — a floor of 0 is never invented. */
export async function liveFloors(
    db: SupabaseClient,
    slugs?: readonly string[],
): Promise<Map<string, number>> {
    const now = Math.floor(Date.now() / 1000);
    let q = db
        .from('listings')
        .select('project_id, price_eth')
        .eq('active', true)
        .or(`end_time.is.null,end_time.gt.${now}`);
    if (slugs && slugs.length > 0) q = q.in('project_id', slugs as string[]);
    const { data, error } = await q;
    if (error) throw new Error(error.message);
    const floors = new Map<string, number>();
    for (const row of (data ?? []) as Array<{ project_id: string; price_eth: number | string | null }>) {
        const p = Number(row.price_eth);
        if (!Number.isFinite(p) || p <= 0) continue;
        const cur = floors.get(row.project_id);
        if (cur === undefined || p < cur) floors.set(row.project_id, p);
    }
    return floors;
}

/** One project's live floor, or null when nothing is listed. */
export async function liveFloor(db: SupabaseClient, slug: string): Promise<number | null> {
    const floors = await liveFloors(db, [slug]);
    return floors.get(slug) ?? null;
}
