'use client';

/*
 * colorStore — the client cache + persistence for per-output DOMINANT colour.
 *
 * The bucket for a piece comes from one of two places:
 *   1. the `outputs` table (a real pixel sample, stored at mint / backfilled) —
 *      works for EVERY engine, and is what Brendon can heal directly in the DB;
 *   2. live palette-math (outputColor) — instant, but Prisms-only.
 *
 * resolveBucket() prefers the stored sample, falls back to palette-math. As
 * pieces paint, ArtworkCard samples any that aren't stored yet and reports them
 * here (fire-and-forget), so the table self-populates (covers new mints AND a
 * one-time backfill as the gallery is browsed). A tiny subscribe/version hook
 * (useStoredColors) lets the grouping recompute when stored colours arrive.
 */

import { useEffect, useReducer } from 'react';
import { outputColorBucket, type ColorBucket } from './outputColor';

const cache = new Map<string, ColorBucket>(); // `${slug}:${id}` -> stored bucket
const reported = new Set<string>();           // POST dedupe (per session)
const loadedSlugs = new Set<string>();        // GET dedupe (per session)
let version = 0;
const listeners = new Set<() => void>();
function bump() { version += 1; listeners.forEach((l) => l()); }

const VALID = new Set<string>([
    'Hothurt', 'Red', 'Orange', 'Yellow', 'Green', 'Blue',
    'Purple', 'Pink', 'Brown', 'Beige', 'Grey', 'Black', 'White',
]);

/** Stored (DB-sampled) bucket for a piece, or null if not loaded/sampled yet. */
export function storedBucket(slug: string, id: number): ColorBucket | null {
    return cache.get(`${slug}:${id}`) ?? null;
}

/** Resolve a piece's bucket for grouping: stored sample (any engine) → live
    palette-math (Prisms) → null ("Other"). */
export function resolveBucket(slug: string, id: number): ColorBucket | null {
    return storedBucket(slug, id) ?? outputColorBucket(slug, id);
}

/** True when a piece has no colour yet — the caller should sample + report it. */
export function needsColorSample(slug: string, id: number): boolean {
    const k = `${slug}:${id}`;
    return !cache.has(k) && !reported.has(k);
}

/** Persist a freshly-sampled bucket (fire-and-forget) + cache it locally. */
export function reportBucket(slug: string, id: number, bucket: ColorBucket | null): void {
    if (!bucket || !VALID.has(bucket)) return;
    const k = `${slug}:${id}`;
    if (cache.has(k) || reported.has(k)) return;
    reported.add(k);
    cache.set(k, bucket);
    /* NO re-render here (Brendon, 2026-06-16). Sampling happens on every card
       paint; bumping per-paint stormed the gallery with re-renders and stalled
       the group-cycle. Stored colours apply on the next load via loadColors()
       (one bump for the whole batch). Cycling stays independent + reliable. */
    try {
        fetch('/api/outputs/color', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ slug, id, bucket }),
            keepalive: true,
        }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
}

async function loadColors(slugs: string[]): Promise<void> {
    const fresh = slugs.filter((s) => s && !loadedSlugs.has(s));
    if (fresh.length === 0) return;
    fresh.forEach((s) => loadedSlugs.add(s));
    try {
        const res = await fetch(`/api/outputs/colors?slugs=${encodeURIComponent(fresh.join(','))}`);
        if (!res.ok) return;
        const rows = (await res.json()) as { slug: string; id: number; bucket: string }[];
        let changed = false;
        for (const r of rows) {
            if (VALID.has(r.bucket)) {
                cache.set(`${r.slug}:${r.id}`, r.bucket as ColorBucket);
                changed = true;
            }
        }
        if (changed) bump();
    } catch { /* ignore */ }
}

/** Load stored colours for the given slugs; re-render the caller when they
    arrive. Returns a version number to drop into a grouping memo's deps so the
    sections recompute once real colours land. */
export function useStoredColors(slugs: string[]): number {
    const [, force] = useReducer((x: number) => x + 1, 0);
    useEffect(() => {
        listeners.add(force);
        return () => { listeners.delete(force); };
    }, []);
    const key = slugs.join(',');
    useEffect(() => {
        if (slugs.length) void loadColors(slugs);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return version;
}
