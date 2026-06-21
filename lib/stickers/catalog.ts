/*
 * Sticker catalog — the simulated sticker NFTs.
 *
 * Every sticker is one of our two logos recoloured by the theming engine: the
 * ONLY thing that changes between stickers is a hex (Petey) or a bg/fg pair
 * ($PRICE). Two genesis sheets to start:
 *   - genesis : the $PRICE wordmark — the two canonical variants (normal +
 *               the red-background colour-swap) plus a colour range.
 *   - petey   : the mascot, recoloured across the palette.
 *
 * Ownership is simulated the way minted projects are: a fixed mock set keyed by
 * @handle. Only Brendon owns stickers to start, so every other profile renders
 * exactly as it does today. Real on-chain reads (ERC-1155) wire in later.
 */

export type SheetId = 'genesis' | 'petey';

export interface Sticker {
    id: string;
    sheet: SheetId;
    kind: 'price' | 'petey';
    name: string;
    /** Petey: bubble/dots colour. */
    color?: string;
    /** Petey: the slash-glyph cutout colour (reads against `color`). */
    cutout?: string;
    /** $PRICE: rounded-rect background. */
    bg?: string;
    /** $PRICE: letter colour. */
    fg?: string;
}

/* ── Palette — the theming-engine hexes the logos recolour through ───────── */
const PRICE_RED = '#FF0055';
const PRICE_YELLOW = '#FFE600';

interface Hue { key: string; name: string; hex: string; }
const PALETTE: readonly Hue[] = [
    { key: 'hot',    name: 'Hot',    hex: '#FF0055' },
    { key: 'gold',   name: 'Gold',   hex: '#FFE600' },
    { key: 'orange', name: 'Orange', hex: '#FF6600' },
    { key: 'blue',   name: 'Blue',   hex: '#3D9EFF' },
    { key: 'red',    name: 'Red',    hex: '#FF0033' },
    { key: 'violet', name: 'Violet', hex: '#7B2FFF' },
    { key: 'haze',   name: 'Haze',   hex: '#25EC00' },
    { key: 'ink',    name: 'Ink',    hex: '#1A1A1A' },
    { key: 'bone',   name: 'Bone',   hex: '#E0E0E0' },
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

/* ── Genesis sheet — the $PRICE wordmark ─────────────────────────────────── */
const GENESIS: Sticker[] = [
    // The two canonical variants, first.
    { id: 'genesis-normal', sheet: 'genesis', kind: 'price', name: '$PRICE — Classic', bg: PRICE_RED, fg: PRICE_YELLOW },
    { id: 'genesis-swap',   sheet: 'genesis', kind: 'price', name: '$PRICE — Swap',    bg: PRICE_YELLOW, fg: PRICE_RED },
    // Colour range: only the background hex changes; letters auto-contrast to the
    // brand pair (yellow on dark grounds, red on light) so the wordmark stays legible.
    ...PALETTE
        .filter((h) => h.key !== 'hot' && h.key !== 'gold')
        .map<Sticker>((h) => ({
            id: `genesis-${h.key}`,
            sheet: 'genesis',
            kind: 'price',
            name: `$PRICE — ${h.name}`,
            bg: h.hex,
            fg: isLight(h.hex) ? PRICE_RED : PRICE_YELLOW,
        })),
];

/* ── Petey sheet — the mascot ────────────────────────────────────────────── */
const PETEY: Sticker[] = PALETTE.map<Sticker>((h) => ({
    id: `petey-${h.key}`,
    sheet: 'petey',
    kind: 'petey',
    name: `Petey — ${h.name}`,
    color: h.hex,
    cutout: isLight(h.hex) ? '#1A1A1A' : '#FFFFFF',
}));

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
        'genesis-normal',
        'genesis-swap',
        'genesis-blue',
        'genesis-haze',
        'petey-hot',
        'petey-violet',
        'petey-orange',
        'petey-gold',
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
