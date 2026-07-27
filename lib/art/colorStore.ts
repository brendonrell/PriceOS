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
import { COLOR_BUCKET_ORDER, outputColorBucket, type ColorBucket } from './outputColor';
import type { AspectKind, Fingerprint } from './sampleColor';

const cache = new Map<string, ColorBucket>(); // `${slug}:${id}` -> stored bucket
const reported = new Set<string>();           // POST dedupe (per session)
const loadedSlugs = new Set<string>();        // GET dedupe (per session)

/* The rest of the visual fingerprint (everything beyond the colour bucket),
   cached + served alongside the colour from the same rows. v2 fields are null
   on rows captured before the deep look. */
export interface StoredFingerprint {
    aspect: AspectKind | null;
    brightness: number | null;
    saturation: number | null;
    complexity: number | null;
    accent: string | null;
    paletteCount: number | null;
    contrast: number | null;
    warmth: number | null;
    gravity: string | null;
    symmetry: number | null;
    air: number | null;
    texture: number | null;
    scene: string | null;
    shapeCount: number | null;
    pattern: string | null;
    geometry: number | null;
}
const fpCache = new Map<string, StoredFingerprint>();
export function resolveFingerprint(slug: string, id: number): StoredFingerprint | null {
    return fpCache.get(`${slug}:${id}`) ?? null;
}

/* The stored platform traits for a piece (the durable copy of registry
   outputTraits + the Output true name + rarity + mint moment). Computed once
   server-side and saved; the UI still computes live as the fallback until a
   row is filled, so these never disagree. */
export interface StoredTraits {
    artist: string | null;
    project: string | null;       // the @slug platform trait value
    trueName: string | null;
    priceDay: string | null;
    sun: string | null;
    moon: string | null;
    rising: string | null;
    fate: string | null;
    rarity: string | null;
    mintedAt: string | null;
}
const traitCache = new Map<string, StoredTraits>();
const traitsReported = new Set<string>();         // POST dedupe (per session)
export function resolveStoredTraits(slug: string, id: number): StoredTraits | null {
    return traitCache.get(`${slug}:${id}`) ?? null;
}
let version = 0;
const listeners = new Set<() => void>();
function bump() { version += 1; listeners.forEach((l) => l()); }

/* Derived from the one canonical bucket list (outputColor) so the storage
   gate can never drift from the classifier again. */
const VALID = new Set<string>(COLOR_BUCKET_ORDER);

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

/** Persist a freshly-sampled FULL fingerprint (colour + aspect + brightness +
 *  saturation + complexity) in one fire-and-forget POST + cache it locally.
 *  Same per-session dedupe + no-re-render policy as reportBucket. */
export function reportFingerprint(slug: string, id: number, fp: Fingerprint | null): void {
    if (!fp) return;
    const k = `${slug}:${id}`;
    if (reported.has(k)) return;
    reported.add(k);
    if (fp.bucket && VALID.has(fp.bucket)) cache.set(k, fp.bucket);
    fpCache.set(k, {
        aspect: fp.aspect,
        brightness: fp.brightness,
        saturation: fp.saturation,
        complexity: fp.complexity,
        accent: fp.accent,
        paletteCount: fp.paletteCount,
        contrast: fp.contrast,
        warmth: fp.warmth,
        gravity: fp.gravity,
        symmetry: fp.symmetry,
        air: fp.air,
        texture: fp.texture,
        scene: fp.scene,
        shapeCount: fp.shapeCount,
        pattern: fp.pattern,
        geometry: fp.geometry,
    });
    try {
        fetch('/api/outputs/color', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
                slug, id,
                bucket: fp.bucket,
                aspect: fp.aspect,
                brightness: fp.brightness,
                saturation: fp.saturation,
                complexity: fp.complexity,
                accent: fp.accent,
                accentShare: fp.accentShare,
                paletteCount: fp.paletteCount,
                contrast: fp.contrast,
                warmth: fp.warmth,
                gravity: fp.gravity,
                symmetry: fp.symmetry,
                air: fp.air,
                texture: fp.texture,
                scene: fp.scene,
                shapeCount: fp.shapeCount,
                pattern: fp.pattern,
                shapes: fp.shapes,
                geometry: fp.geometry,
            }),
            keepalive: true,
        }).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
}

/** Persist an Output's platform traits once (fire-and-forget). Independent of
 *  the colour gate so it backfills even tokens that already have a colour. The
 *  server computes the values from the row's mint moment + registry. */
export function reportTraits(slug: string, id: number): void {
    const k = `${slug}:${id}`;
    if (traitCache.has(k) || traitsReported.has(k)) return;
    traitsReported.add(k);
    try {
        fetch('/api/outputs/traits', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ slug, id }),
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
        const rows = (await res.json()) as {
            slug: string; id: number; bucket: string;
            aspect?: AspectKind | null; brightness?: number | null;
            saturation?: number | null; complexity?: number | null;
            accent?: string | null; paletteCount?: number | null; contrast?: number | null;
            warmth?: number | null; gravity?: string | null; symmetry?: number | null;
            air?: number | null; texture?: number | null;
            scene?: string | null; shapeCount?: number | null; pattern?: string | null;
            geometry?: number | null;
            rarity?: string | null; artist?: string | null; project_name?: string | null;
            true_name?: string | null; price_day?: string | null;
            natal_sun?: string | null; natal_moon?: string | null; natal_rising?: string | null;
            fate?: string | null; minted_at?: string | null;
        }[];
        let changed = false;
        for (const r of rows) {
            if (VALID.has(r.bucket)) {
                cache.set(`${r.slug}:${r.id}`, r.bucket as ColorBucket);
                changed = true;
            }
            if (r.aspect != null || r.brightness != null || r.saturation != null || r.complexity != null) {
                fpCache.set(`${r.slug}:${r.id}`, {
                    aspect: r.aspect ?? null,
                    brightness: r.brightness ?? null,
                    saturation: r.saturation ?? null,
                    complexity: r.complexity ?? null,
                    accent: r.accent ?? null,
                    paletteCount: r.paletteCount ?? null,
                    contrast: r.contrast ?? null,
                    warmth: r.warmth ?? null,
                    gravity: r.gravity ?? null,
                    symmetry: r.symmetry ?? null,
                    air: r.air ?? null,
                    texture: r.texture ?? null,
                    scene: r.scene ?? null,
                    shapeCount: r.shapeCount ?? null,
                    pattern: r.pattern ?? null,
                    geometry: r.geometry ?? null,
                });
                changed = true;
            }
            // Stored platform traits — present once a row has been backfilled.
            if (r.artist != null || r.fate != null || r.true_name != null || r.rarity != null) {
                traitCache.set(`${r.slug}:${r.id}`, {
                    artist: r.artist ?? null,
                    project: r.project_name ?? null,
                    trueName: r.true_name ?? null,
                    priceDay: r.price_day ?? null,
                    sun: r.natal_sun ?? null,
                    moon: r.natal_moon ?? null,
                    rising: r.natal_rising ?? null,
                    fate: r.fate ?? null,
                    rarity: r.rarity ?? null,
                    mintedAt: r.minted_at ?? null,
                });
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
