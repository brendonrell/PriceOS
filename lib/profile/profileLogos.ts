/*
 * Profile Logo feature — its OWN logo set (Brendon 2026-06-23).
 *
 * These are the PD logos: the regular speech-bubble logo across a vivid colour
 * range, plus the two $PRICE wordmark variants — the same set the Genesis
 * sticker sheet ships. They live HERE, owned by the Profile Logo feature, so it
 * never just reaches into the sticker store's catalog: the feature owns its data
 * and can evolve on its own from here.
 *
 * Each entry wears the shared Sticker shape so the existing StickerArt renderer
 * paints it unchanged (no new art code). Colour generation is self-contained.
 */

import type { Sticker } from '../stickers/catalog';

const PRICE_RED = '#FF0055';
const PRICE_YELLOW = '#FFE600';

interface Hue { key: string; name: string; hex: string; }

function hslHex(h: number, s: number, l: number): string {
    const sat = s / 100, lig = l / 100;
    const a = sat * Math.min(lig, 1 - lig);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return lig - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    const hx = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${hx(f(0))}${hx(f(8))}${hx(f(4))}`.toUpperCase();
}

const NAME_RING: [number, string][] = [
    [0, 'Red'], [18, 'Scarlet'], [33, 'Orange'], [45, 'Amber'], [55, 'Gold'],
    [70, 'Lime'], [90, 'Chartreuse'], [120, 'Green'], [150, 'Emerald'], [168, 'Teal'],
    [182, 'Cyan'], [197, 'Sky'], [212, 'Azure'], [228, 'Blue'], [244, 'Indigo'],
    [258, 'Violet'], [275, 'Purple'], [290, 'Magenta'], [312, 'Fuchsia'], [332, 'Pink'], [348, 'Rose'],
];
function hueName(h: number): string {
    let best = NAME_RING[0]!, bestD = 999;
    for (const e of NAME_RING) {
        const d = Math.min(Math.abs(e[0] - h), 360 - Math.abs(e[0] - h));
        if (d < bestD) { bestD = d; best = e; }
    }
    return best[1];
}

/** Spread `n` vivid hues round the wheel; lightness cycles for extra variety. */
function genHues(n: number, prefix: string, opts: { sat: number; lights: number[]; phase: number }): Hue[] {
    const out: Hue[] = [];
    for (let i = 0; i < n; i++) {
        const h = (opts.phase + (i * 360) / n) % 360;
        const l = opts.lights[i % opts.lights.length]!;
        out.push({ key: `${prefix}${i}`, name: hueName(h), hex: hslHex(h, opts.sat, l) });
    }
    return out;
}

function isLight(hex: string): boolean {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 >= 140;
}
const cutoutFor = (hex: string) => (isLight(hex) ? '#1A1A1A' : '#FFFFFF');

const LOGO_HUES = genHues(27, 'pg', { sat: 88, lights: [52, 62, 44], phase: 6 });

/** The Profile Logo set — classic first, then the colour ring, then $PRICE. */
export const PROFILE_LOGOS: Sticker[] = [
    /* Brand classic: Hothurt-red bubble + attention-yellow slash. */
    { id: 'plogo-hot', sheet: 'genesis', kind: 'logo', name: 'Logo — Classic', color: PRICE_RED, cutout: PRICE_YELLOW },
    ...LOGO_HUES.map<Sticker>((h) => ({
        id: `plogo-${h.key}`,
        sheet: 'genesis',
        kind: 'logo',
        name: `Logo — ${h.name}`,
        color: h.hex,
        cutout: cutoutFor(h.hex),
    })),
    { id: 'plogo-price-classic',  sheet: 'genesis', kind: 'price', name: '$PRICE — Classic',  bg: PRICE_RED, fg: PRICE_YELLOW },
    { id: 'plogo-price-inverted', sheet: 'genesis', kind: 'price', name: '$PRICE — Inverted', bg: PRICE_YELLOW, fg: PRICE_RED },
];
