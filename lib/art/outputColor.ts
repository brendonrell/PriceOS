'use client';

/*
 * outputColor — the dominant COLOUR bucket for an Output, derived from its
 * PALETTE math, not from sampling pixels. The art IS a known 3-stop gradient
 * (lib/art/engines/prismsCore), so grouping the gallery by colour costs nothing
 * and never touches a canvas (Brendon, 2026-06-13 — "no lag"). Prisms is the
 * live engine; other engines fall back to null ("Other") until they expose
 * palette colour the same way.
 *
 * Buckets are Brendon's named list. #FF0055 ("Hothurt") is one of the COLOURS,
 * not a separate axis — any palette carrying it lands in the Hothurt bucket.
 */

import { PrismsEngine } from './engines/prismsCore';

export type ColorBucket =
    | 'Hothurt' | 'Red' | 'Orange' | 'Yellow' | 'Green' | 'Blue'
    | 'Purple' | 'Pink' | 'Brown' | 'Beige' | 'Grey' | 'Black' | 'White';

/** Fixed display order for colour group headers. */
export const COLOR_BUCKET_ORDER: ColorBucket[] = [
    'Hothurt', 'Red', 'Orange', 'Yellow', 'Green', 'Blue',
    'Purple', 'Pink', 'Brown', 'Beige', 'Grey', 'Black', 'White',
];

const HOTHURT_HEX = 'FF0055';

/** The three gradient stops for an Output, or null if its engine has none. */
function stopsFor(slug: string, id: number): string[] | null {
    if (slug.toLowerCase() === 'prisms') {
        try {
            const cd = new PrismsEngine(id).calc() as { palette: { stops: string[] } };
            return cd.palette?.stops ?? null;
        } catch {
            return null;
        }
    }
    return null;
}

function hexToRgb(hex: string): [number, number, number] {
    const s = hex.replace('#', '');
    return [
        parseInt(s.slice(0, 2), 16) || 0,
        parseInt(s.slice(2, 4), 16) || 0,
        parseInt(s.slice(4, 6), 16) || 0,
    ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    let h = 0;
    let s = 0;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h /= 6;
    }
    return [h * 360, s, l];
}

function classify(r: number, g: number, b: number): ColorBucket {
    const [h, s, l] = rgbToHsl(r, g, b);
    if (l <= 0.10) return 'Black';
    if (l >= 0.90 && s <= 0.15) return 'White';
    if (s <= 0.15) return 'Grey';
    // Desaturated warm tones read as wood/sand, not pure orange.
    if (s <= 0.45 && h >= 20 && h < 50) return l >= 0.55 ? 'Beige' : 'Brown';
    if (h < 15 || h >= 345) return 'Red';
    if (h < 45) return l < 0.45 ? 'Brown' : 'Orange';
    if (h < 70) return 'Yellow';
    if (h < 165) return 'Green';
    if (h < 255) return 'Blue';
    if (h < 290) return 'Purple';
    if (h < 330) return 'Pink';
    return 'Red';
}

/**
 * Dominant colour bucket for an Output. Hothurt wins if the palette carries the
 * signature hex; otherwise the bucket is the majority of the three stops, or —
 * when all three differ — the bucket of their averaged colour.
 */
export function outputColorBucket(slug: string, id: number): ColorBucket | null {
    const stops = stopsFor(slug, id);
    if (!stops || stops.length === 0) return null;

    if (stops.some((c) => c.replace('#', '').toUpperCase() === HOTHURT_HEX)) {
        return 'Hothurt';
    }

    const perStop = stops.map((c) => {
        const [r, g, b] = hexToRgb(c);
        return classify(r, g, b);
    });
    // Majority vote — "mostly red" when two or more stops agree.
    const tally = new Map<ColorBucket, number>();
    for (const b of perStop) tally.set(b, (tally.get(b) ?? 0) + 1);
    let best: ColorBucket | null = null;
    let bestN = 0;
    for (const [bucket, n] of tally) {
        if (n > bestN) { bestN = n; best = bucket; }
    }
    if (best && bestN >= 2) return best;

    // All three differ — fall back to the averaged colour's bucket.
    let r = 0, g = 0, b = 0;
    for (const c of stops) {
        const [cr, cg, cb] = hexToRgb(c);
        r += cr; g += cg; b += cb;
    }
    const n = stops.length;
    return classify(r / n, g / n, b / n);
}
