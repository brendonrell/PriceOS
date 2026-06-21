/*
 * Sticker catalog — the simulated sticker NFTs.
 *
 * Every sticker is one of our logos recoloured by the theming engine: the ONLY
 * thing that changes between stickers is a hex (the logo) or a bg/fg pair
 * ($PRICE). Two genesis sheets to start:
 *   - genesis : the REGULAR logo (the one in the corner) in a colour range,
 *               PLUS the $PRICE wordmark in its two canonical variants
 *               (classic red-bubble/yellow-text + inverted yellow/red).
 *   - petey   : the SAME logo rotated 90° counter-clockwise — that rotation is
 *               what turns the logo into Petey the mascot — in all new colours.
 *
 * Ownership is simulated the way minted projects are: a fixed mock set keyed by
 * @handle. Only Brendon owns stickers to start, so every other profile renders
 * exactly as it does today. Real on-chain reads (ERC-1155) wire in later.
 */

export type SheetId = 'genesis' | 'petey';

export interface Sticker {
    id: string;
    sheet: SheetId;
    kind: 'logo' | 'price';
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
}

const PRICE_RED = '#FF0055';
const PRICE_YELLOW = '#FFE600';

interface Hue { key: string; name: string; hex: string; }

/* Genesis logo colours — the brand palette. */
const GENESIS_HUES: readonly Hue[] = [
    { key: 'hot',    name: 'Hot',    hex: '#FF0055' },
    { key: 'blue',   name: 'Blue',   hex: '#3D9EFF' },
    { key: 'haze',   name: 'Haze',   hex: '#25EC00' },
    { key: 'violet', name: 'Violet', hex: '#7B2FFF' },
    { key: 'orange', name: 'Orange', hex: '#FF6600' },
    { key: 'gold',   name: 'Gold',   hex: '#FFE600' },
    { key: 'ink',    name: 'Ink',    hex: '#1A1A1A' },
    { key: 'bone',   name: 'Bone',   hex: '#E0E0E0' },
];

/* Petey colours — all NEW hues, no overlap with Genesis. */
const PETEY_HUES: readonly Hue[] = [
    { key: 'teal',    name: 'Teal',    hex: '#00E5C7' },
    { key: 'magenta', name: 'Magenta', hex: '#FF2D9B' },
    { key: 'lime',    name: 'Lime',    hex: '#B6FF1A' },
    { key: 'amber',   name: 'Amber',   hex: '#FFB000' },
    { key: 'indigo',  name: 'Indigo',  hex: '#3A2DFF' },
    { key: 'coral',   name: 'Coral',   hex: '#FF6F61' },
    { key: 'mint',    name: 'Mint',    hex: '#6BFFB0' },
    { key: 'slate',   name: 'Slate',   hex: '#5B6B7A' },
];

/** YIQ luminance → is this hex a light colour? (same heuristic as the colorway
    text-contrast engine). */
function isLight(hex: string): boolean {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 >= 140;
}

const cutoutFor = (hex: string) => (isLight(hex) ? '#1A1A1A' : '#FFFFFF');

/* ── Genesis sheet — the regular logo (upright) + the two $PRICE variants ─── */
const GENESIS: Sticker[] = [
    ...GENESIS_HUES.map<Sticker>((h) => ({
        id: `genesis-${h.key}`,
        sheet: 'genesis',
        kind: 'logo',
        name: h.key === 'hot' ? 'Logo — Classic' : `Logo — ${h.name}`,
        color: h.hex,
        /* The 'hot' logo wears the brand scheme: Hothurt-red bubble + attention-
           yellow per-mille — same two colours as the $PRICE logos. */
        cutout: h.key === 'hot' ? PRICE_YELLOW : cutoutFor(h.hex),
    })),
    { id: 'genesis-price-classic',  sheet: 'genesis', kind: 'price', name: '$PRICE — Classic',  bg: PRICE_RED, fg: PRICE_YELLOW },
    { id: 'genesis-price-inverted', sheet: 'genesis', kind: 'price', name: '$PRICE — Inverted', bg: PRICE_YELLOW, fg: PRICE_RED },
];

/* ── Petey sheet — the same logo rotated 90° CCW ─────────────────────────── */
const PETEY: Sticker[] = [
    /* One Petey in the brand scheme: Hothurt-red bubble + attention-yellow. */
    { id: 'petey-classic', sheet: 'petey', kind: 'logo', rotated: true, name: 'Petey — Classic', color: PRICE_RED, cutout: PRICE_YELLOW },
    /* ...then all new colours. */
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

export const STICKERS: readonly Sticker[] = [...GENESIS, ...PETEY];

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
    /** A representative sticker for the store card art. */
    cover: Sticker;
}

export const SHEETS: readonly SheetMeta[] = [
    { id: 'genesis', name: 'GENESIS', tag: 'MYTHIC',   count: GENESIS.length, price: '0.010', cover: GENESIS[0]! },
    { id: 'petey',   name: 'PETEY',   tag: 'UNCOMMON', count: PETEY.length,   price: '0.008', cover: PETEY[0]! },
];

export function stickersForSheet(id: SheetId): Sticker[] {
    return STICKERS.filter((s) => s.sheet === id);
}

/* ── Ownership (simulated) ───────────────────────────────────────────────── */
/* Only Brendon owns stickers to start. A curated mix of both sheets — enough to
   spread a modest single row wide across the hero. */
const MOCK_OWNED: Record<string, string[]> = {
    brendon: [
        'genesis-hot',
        'genesis-blue',
        'genesis-price-classic',
        'genesis-price-inverted',
        'petey-classic',
        'petey-magenta',
        'petey-amber',
        'petey-indigo',
    ],
};

/** The stickers a profile owner holds (simulated). Empty for everyone but the
    seeded owners, so their profile is unchanged. */
export function ownedStickers(handle: string | null | undefined): Sticker[] {
    if (!handle) return [];
    const ids = MOCK_OWNED[handle.replace(/^@/, '').toLowerCase()];
    if (!ids) return [];
    return ids.map((id) => BY_ID.get(id)).filter((s): s is Sticker => Boolean(s));
}
