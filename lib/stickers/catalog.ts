/*
 * Sticker catalog — the simulated sticker NFTs.
 *
 * Every sticker is one of our logos recoloured by the theming engine: the ONLY
 * thing that changes between stickers is a hex (the logo) or a bg/fg pair
 * ($PRICE). Two genesis sheets to start:
 *   - genesis : the REGULAR logo (the one in the corner) across a big colour
 *               range, PLUS the $PRICE wordmark in its two canonical variants
 *               (classic red-bubble/yellow-text + inverted yellow/red).
 *   - petey   : the SAME logo rotated 90° counter-clockwise — that rotation is
 *               what turns the logo into Petey the mascot — in its own colours.
 *
 * Ownership is simulated the way minted projects are: a fixed mock seed keyed by
 * @handle, plus whatever the current user buys (owned.ts). Only Brendon is
 * seeded, so every other profile renders exactly as it does today. Real on-chain
 * reads (ERC-1155) wire in later.
 */

export type SheetId = 'genesis' | 'petey' | 'icon' | 'familiar';

export interface Sticker {
    id: string;
    sheet: SheetId;
    kind: 'logo' | 'price' | 'glyph' | 'face';
    name: string;
    /** logo: bubble/dots colour. */
    color?: string;
    /** logo: the slash-glyph cutout colour (reads against `color`). */
    cutout?: string;
    /** logo: rotate the artwork 90° CCW → Petey the mascot. */
    rotated?: boolean;
    /** $PRICE: rounded-rect background. */
    bg?: string;
    /** $PRICE: letter colour. */
    fg?: string;
    /** glyph: the icon character (VS-15 text glyph) for icon-sheet stickers. */
    glyph?: string;
}

const PRICE_RED = '#FF0055';
const PRICE_YELLOW = '#FFE600';

interface Hue { key: string; name: string; hex: string; }

/* ── Colour generation — many vivid hues round the wheel ─────────────────── */
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

/* ── Genesis sheet — the regular logo (upright) + the two $PRICE variants ─── */
const GENESIS_HUES = genHues(27, 'g', { sat: 88, lights: [52, 62, 44], phase: 6 });
const GENESIS: Sticker[] = [
    /* Brand classic first: Hothurt-red bubble + attention-yellow per-mille. */
    { id: 'genesis-hot', sheet: 'genesis', kind: 'logo', name: 'Logo — Classic', color: PRICE_RED, cutout: PRICE_YELLOW },
    ...GENESIS_HUES.map<Sticker>((h) => ({
        id: `genesis-${h.key}`,
        sheet: 'genesis',
        kind: 'logo',
        name: `Logo — ${h.name}`,
        color: h.hex,
        cutout: cutoutFor(h.hex),
    })),
    { id: 'genesis-price-classic',  sheet: 'genesis', kind: 'price', name: '$PRICE — Classic',  bg: PRICE_RED, fg: PRICE_YELLOW },
    { id: 'genesis-price-inverted', sheet: 'genesis', kind: 'price', name: '$PRICE — Inverted', bg: PRICE_YELLOW, fg: PRICE_RED },
];

/* ── Petey sheet — the same logo rotated 90° CCW, its own colour band ─────── */
const PETEY_HUES = genHues(23, 'p', { sat: 80, lights: [58, 48, 67], phase: 15 });
const PETEY: Sticker[] = [
    /* One Petey in the brand scheme: Hothurt-red bubble + attention-yellow. */
    { id: 'petey-classic', sheet: 'petey', kind: 'logo', rotated: true, name: 'Petey — Classic', color: PRICE_RED, cutout: PRICE_YELLOW },
    ...PETEY_HUES.map<Sticker>((h) => ({
        id: `petey-${h.key}`,
        sheet: 'petey',
        kind: 'logo' as const,
        rotated: true,
        name: `Petey — ${h.name}`,
        color: h.hex,
        cutout: cutoutFor(h.hex),
    })),
];

/* ── Icon sheet — our canonical glyph vocabulary (docs/GLYPHS.md) ─────────── */
const ICON_GLYPHS: { g: string; name: string }[] = [
    { g: '✶', name: 'Mint' },       { g: '✹', name: 'List' },       { g: '✦', name: 'Offer' },
    { g: '✸', name: 'Transfer' },   { g: '⚭', name: 'Mutual' },     { g: '⇡', name: 'Pingtoasts' },
    { g: '⏾', name: 'Silent' },     { g: '★', name: 'Star' },       { g: '✛', name: 'Wishlist' },
    { g: '◰', name: 'Album' },      { g: '⊟', name: 'Note' },       { g: '❍', name: 'To-Do' },
    { g: '⟟', name: 'Grail' },      { g: '▢', name: 'Cart' },       { g: '⑆', name: 'Showcase' },
    { g: '◈', name: 'Streak' },     { g: '◉', name: 'Identity' },   { g: '❖', name: 'Rarity' },
    { g: '❂', name: 'PriceRank' },  { g: '⍟', name: 'Stargazing' }, { g: '✺', name: 'Artist' },
    { g: '☻', name: 'Collector' },  { g: '⨝', name: 'Trait' },      { g: '▶', name: 'Soundtrack' },
    { g: '⬚', name: 'Project' },    { g: '△', name: 'Ascension' },  { g: '⬢', name: 'Hi-Def' },
    { g: '✧', name: 'Uploaded' },
];
const ICON_HUES = genHues(ICON_GLYPHS.length, 'i', { sat: 84, lights: [50, 60, 42], phase: 0 });
const ICONS: Sticker[] = ICON_GLYPHS.map<Sticker>((it, i) => {
    const hex = ICON_HUES[i]!.hex;
    return {
        id: `icon-${it.name.toLowerCase().replace(/[^a-z0-9]+/g, '')}`,
        sheet: 'icon',
        kind: 'glyph',
        name: it.name,
        glyph: `${it.g}︎`,
        color: hex,
        cutout: cutoutFor(hex),
    };
});

/* ── Familiar sheet — the five digital familiars (familiarEngine species) ─── */
const FAMILIAR_FACES: { name: string; g: string }[] = [
    { name: 'Wisp',    g: '( ¤ )' },
    { name: 'Watcher', g: '[ ◉ ]' },
    { name: 'Slime',   g: '(~o~)' },
    { name: 'Spider',  g: '/|o.o|\\' },
    { name: 'Orbit',   g: '(◯·)' },
];
const FAMILIAR_HUES = genHues(FAMILIAR_FACES.length, 'f', { sat: 82, lights: [54, 44, 62], phase: 30 });
const FAMILIARS: Sticker[] = FAMILIAR_FACES.map<Sticker>((it, i) => {
    const hex = FAMILIAR_HUES[i]!.hex;
    return {
        id: `familiar-${it.name.toLowerCase()}`,
        sheet: 'familiar',
        kind: 'face',
        name: it.name,
        glyph: it.g,
        color: hex,
        cutout: cutoutFor(hex),
    };
});

export const STICKERS: readonly Sticker[] = [...GENESIS, ...PETEY, ...ICONS, ...FAMILIARS];

const BY_ID = new Map(STICKERS.map((s) => [s.id, s]));
export function stickerById(id: string): Sticker | undefined {
    return BY_ID.get(id);
}

export interface SheetMeta {
    id: SheetId;
    name: string;
    tag: string;
    count: number;
    price: string;
    cover: Sticker;
}

export const SHEETS: readonly SheetMeta[] = [
    { id: 'genesis', name: 'GENESIS', tag: 'MYTHIC',   count: GENESIS.length, price: '0.010', cover: GENESIS[0]! },
    { id: 'petey',   name: 'PETEY',   tag: 'UNCOMMON', count: PETEY.length,   price: '0.008', cover: PETEY[0]! },
    { id: 'icon',    name: 'ICONS',   tag: 'COMMON',   count: ICONS.length,   price: '0.006', cover: ICONS[0]! },
    { id: 'familiar', name: 'FAMILIARS', tag: 'RARE',  count: FAMILIARS.length, price: '0.012', cover: FAMILIARS[0]! },
];

export function stickersForSheet(id: SheetId): Sticker[] {
    return STICKERS.filter((s) => s.sheet === id);
}

/* ── Ownership (simulated seed) ──────────────────────────────────────────── */
/* Only Brendon is seeded. A curated mix of both sheets so his hero shows a
   modest spread before he buys anything. */
const MOCK_OWNED: Record<string, string[]> = {
    brendon: [
        'genesis-hot',
        'genesis-g4',
        'genesis-g13',
        'genesis-price-classic',
        'genesis-price-inverted',
        'petey-classic',
        'petey-p6',
        'petey-p15',
    ],
};

export function ownedStickers(handle: string | null | undefined): Sticker[] {
    if (!handle) return [];
    const ids = MOCK_OWNED[handle.replace(/^@/, '').toLowerCase()];
    if (!ids) return [];
    return ids.map((id) => BY_ID.get(id)).filter((s): s is Sticker => Boolean(s));
}
