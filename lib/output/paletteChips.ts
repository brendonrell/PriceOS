'use client';

/*
 * paletteChips — the piece's ACTUAL colours as hexes, for the character
 * sheet's tappable Swatches tile. Renders the piece once, offscreen, through
 * the app's own deterministic engine (paintOutput — the same painter every
 * thumb uses), then reads the top colours from the real pixels. No network,
 * no CORS taint, $0. Fail-soft null if the engine can't paint here.
 */

import { paintOutput } from '../state/ProjectContext';

export interface PaletteChip {
    hex: string;
    share: number; // 0..1 of opaque pixels
}

const cache = new Map<string, PaletteChip[] | null>();

export function samplePaletteChips(slug: string, id: number): PaletteChip[] | null {
    const key = `${slug}:${id}`;
    if (cache.has(key)) return cache.get(key) ?? null;
    const chips = sample(slug, id);
    cache.set(key, chips);
    return chips;
}

function sample(slug: string, id: number): PaletteChip[] | null {
    if (typeof document === 'undefined') return null;
    try {
        const canvas = document.createElement('canvas');
        paintOutput(canvas, slug, id, 96);
        const w = canvas.width, h = canvas.height;
        if (!w || !h) return null;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return null;
        const data = ctx.getImageData(0, 0, w, h).data;

        // Quantise to 512 bins (3 bits/channel), remembering each bin's REAL
        // average colour so a chip is a colour from the art, not a bin centre.
        const count = new Map<number, { n: number; r: number; g: number; b: number }>();
        let opaque = 0;
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 128) continue;
            opaque += 1;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            const bin = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
            const c = count.get(bin);
            if (c) { c.n += 1; c.r += r; c.g += g; c.b += b; }
            else count.set(bin, { n: 1, r, g, b });
        }
        if (opaque === 0) return null;

        const chips = [...count.values()]
            .sort((a, b) => b.n - a.n)
            .slice(0, 5)
            .map((c) => ({
                hex: rgbHex(c.r / c.n, c.g / c.n, c.b / c.n),
                share: c.n / opaque,
            }))
            .filter((c) => c.share >= 0.04);
        return chips.length > 0 ? chips : null;
    } catch {
        return null;
    }
}

function rgbHex(r: number, g: number, b: number): string {
    const p = (v: number) => Math.round(v).toString(16).padStart(2, '0');
    return `#${p(r)}${p(g)}${p(b)}`.toUpperCase();
}
