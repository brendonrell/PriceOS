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

/* Petey = the SAME logo rotated 90° CCW, its own colour band (mirrors the Petey
   sticker sheet). `rotated` tells StickerArt + the corner logo to turn it. */
const PETEY_HUES = genHues(23, 'pp', { sat: 80, lights: [58, 48, 67], phase: 15 });
const PROFILE_PETEY: Sticker[] = [
    { id: 'plogo-petey-classic', sheet: 'petey', kind: 'logo', rotated: true, name: 'Petey — Classic', color: PRICE_RED, cutout: PRICE_YELLOW },
    ...PETEY_HUES.map<Sticker>((h) => ({
        id: `plogo-petey-${h.key}`,
        sheet: 'petey',
        kind: 'logo',
        rotated: true,
        name: `Petey — ${h.name}`,
        color: h.hex,
        cutout: cutoutFor(h.hex),
    })),
];

/* Holo = the iridescent finish (one upright, one Petey). `holo` swaps the fill
   for the rainbow gradient; there's no colour variation, so just the two. */
const PROFILE_HOLO: Sticker[] = [
    { id: 'plogo-holo',       sheet: 'holo', kind: 'logo', name: 'Holo',       color: '#FFFFFF', cutout: '#1A1A1A', holo: true },
    { id: 'plogo-holo-petey', sheet: 'holo', kind: 'logo', name: 'Holo Petey', color: '#FFFFFF', cutout: '#1A1A1A', holo: true, rotated: true },
];

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
    ...PROFILE_PETEY,
    ...PROFILE_HOLO,
];

/** Carousel order for the Profile Logo picker (Brendon 2026-06-23): the two
 *  $PRICE variants, then the bubble colour ring, then the Petey set, then the
 *  holo finishes at the very end. The OFF / global toggle (a logo in a dashed
 *  ring) is prepended by the UI, not listed here. */
export const PROFILE_LOGO_CAROUSEL: Sticker[] = [
    ...PROFILE_LOGOS.filter((s) => s.kind === 'price'),
    ...PROFILE_LOGOS.filter((s) => s.kind === 'logo' && !s.rotated && !s.holo),
    ...PROFILE_LOGOS.filter((s) => s.kind === 'logo' && s.rotated && !s.holo),
    ...PROFILE_LOGOS.filter((s) => s.holo),
];

/** The OFF / global-toggle tile's art: the bubble logo painted in the PAGE's
 *  OWN colorway (bubble = current text colour, per-mille = bg) — i.e. exactly
 *  what the corner logo shows with no Profile Logo set. The UI shows it faded
 *  inside a dashed ring. Not a storable pick (the OFF tile clears to null). */
export const PROFILE_LOGO_OFF: Sticker = {
    id: 'plogo-off',
    sheet: 'genesis',
    kind: 'logo',
    name: 'Default logo',
    color: 'currentColor',
    cutout: 'var(--bg-color)',
};

/** Fast id → sticker lookup (the corner-logo override + the save-path validator
 *  both resolve a stored pick by id). */
export const PROFILE_LOGOS_BY_ID: ReadonlyMap<string, Sticker> = new Map(
    PROFILE_LOGOS.map((s) => [s.id, s]),
);

/** A stored profile-logo pick is valid iff it's null (off) or a known id. */
export function isValidProfileLogo(id: unknown): id is string | null {
    return id === null || (typeof id === 'string' && PROFILE_LOGOS_BY_ID.has(id));
}
