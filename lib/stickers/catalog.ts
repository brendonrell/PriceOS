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

import { allProjects, projectTrueName } from '../project/registry';
import { projectSpriteFace } from '../project/projectSprite';
import { spriteFaceFor } from './sprites';
import { TIERS } from '../familiar/bestiary';

export type SheetId =
    | 'genesis' | 'petey' | 'icon' | 'familiar'
    | 'project' | 'artist' | 'pricesprite' | 'handle' | 'projectname' | 'output'
    | 'achievement' | 'rarity' | 'truename' | 'quip' | 'holo' | 'animated';

export interface Sticker {
    id: string;
    sheet: SheetId;
    kind: 'logo' | 'price' | 'glyph' | 'face' | 'output' | 'anim';
    name: string;
    /** output: the project slug + token id to paint. */
    slug?: string;
    tokenId?: number;
    /** logo: fill with the iridescent holographic gradient. */
    holo?: boolean;
    /** anim: the cycling face frames. */
    frames?: string[];
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

/* ── Familiar sheet — the WHOLE bestiary, every tier (lib/familiar/bestiary) ── */
const FAMILIAR_ENTRIES = TIERS.flatMap((t) => t.entries);
const FAMILIAR_HUES = genHues(FAMILIAR_ENTRIES.length, 'f', { sat: 82, lights: [54, 44, 62], phase: 30 });
const FAMILIARS: Sticker[] = FAMILIAR_ENTRIES.map<Sticker>((e, i) => {
    const hex = FAMILIAR_HUES[i]!.hex;
    return {
        id: `familiar-${e.name.toLowerCase()}`,
        sheet: 'familiar',
        kind: 'face',
        name: e.name,
        glyph: e.art,
        color: hex,
        cutout: cutoutFor(hex),
    };
});

/* ── Project / Artist / PriceSprite sheets — the live sprite system ───────── */
const PROJECT_LIST = allProjects();

const PROJECT_SPRITES: Sticker[] = PROJECT_LIST.map<Sticker>((p) => ({
    id: `project-${p.slug}`,
    sheet: 'project',
    kind: 'face',
    name: p.displayName,
    glyph: projectSpriteFace(p.slug) || '( · _ · )',
    color: p.colorway,
    cutout: cutoutFor(p.colorway),
}));

const ARTIST_HANDLES = [...new Set(PROJECT_LIST.map((p) => p.artistHandle))];
const ARTIST_HUES = genHues(ARTIST_HANDLES.length, 'a', { sat: 80, lights: [52, 44, 60], phase: 200 });
const ARTIST_SPRITES: Sticker[] = ARTIST_HANDLES.map<Sticker>((h, i) => {
    const hex = ARTIST_HUES[i]!.hex;
    return {
        id: `artist-${h}`,
        sheet: 'artist',
        kind: 'face',
        name: `@${h}`,
        glyph: spriteFaceFor(`artist:${h}`),
        color: hex,
        cutout: cutoutFor(hex),
    };
});

/* Community PriceSprites — real, app-referenced handles (the live DB scan that
   would gather these isn't reachable from here; these are generated for known
   people the same way the live sprite renders them). */
const COMMUNITY_HANDLES = ['brendon', 'claude', 'snowfro', 'piterpasma', 'xcopy', 'tylerxhobbs', 'dmitricherniak', 'jackbutcher'];
const COMMUNITY_HUES = genHues(COMMUNITY_HANDLES.length, 'u', { sat: 84, lights: [54, 46, 62], phase: 120 });
const PRICESPRITES: Sticker[] = COMMUNITY_HANDLES.map<Sticker>((h, i) => {
    const hex = COMMUNITY_HUES[i]!.hex;
    return {
        id: `pricesprite-${h}`,
        sheet: 'pricesprite',
        kind: 'face',
        name: `@${h}`,
        glyph: spriteFaceFor(`user:${h}`),
        color: hex,
        cutout: cutoutFor(hex),
    };
});

/* ── Artist @name sheet — the handles as name-tag stickers ───────────────── */
const NAME_HUES = genHues(ARTIST_HANDLES.length, 'n', { sat: 86, lights: [54, 46, 60], phase: 280 });
const ARTIST_NAMES: Sticker[] = ARTIST_HANDLES.map<Sticker>((h, i) => {
    const hex = NAME_HUES[i]!.hex;
    return {
        id: `handle-${h}`,
        sheet: 'handle',
        kind: 'face',
        name: `@${h}`,
        glyph: `@${h}`,
        color: hex,
        cutout: cutoutFor(hex),
    };
});

/* ── Project name sheet — project names as tags, in each signature colour ─── */
const PROJECT_NAMES: Sticker[] = PROJECT_LIST.map<Sticker>((p) => ({
    id: `projectname-${p.slug}`,
    sheet: 'projectname',
    kind: 'face',
    name: p.displayName,
    glyph: p.displayName,
    color: p.colorway,
    cutout: cutoutFor(p.colorway),
}));

/* ── Outputs sheet — real generative artworks, painted small ─────────────── */
const OUTPUTS: Sticker[] = PROJECT_LIST.slice(0, 18).map<Sticker>((p, i) => {
    const tid = (i % 7) + 1;
    return {
        id: `output-${p.slug}-${tid}`,
        sheet: 'output',
        kind: 'output',
        name: `${p.displayName} #${tid}`,
        slug: p.slug,
        tokenId: tid,
    };
});

/* ── Achievements sheet — the category glyphs (docs/GLYPHS.md §4) ──────────── */
const ACH_GLYPHS: { g: string; name: string }[] = [
    { g: '◍', name: 'Minting' }, { g: '⊟', name: 'Trading' }, { g: '⊙', name: 'Social' },
    { g: '⌗', name: 'Projects' }, { g: '✢', name: 'Anointing' }, { g: '◈', name: 'Streak' },
    { g: '✦', name: 'Curation' }, { g: '◉', name: 'Identity' }, { g: '❂', name: 'Rank' },
    { g: '✺', name: 'Artist' }, { g: '⁂', name: 'Lore' }, { g: '⌖', name: 'OG' },
];
const ACH_HUES = genHues(ACH_GLYPHS.length, 'ac', { sat: 84, lights: [50, 60, 42], phase: 210 });
const ACHIEVEMENTS: Sticker[] = ACH_GLYPHS.map<Sticker>((it, i) => {
    const hex = ACH_HUES[i]!.hex;
    return { id: `ach-${it.name.toLowerCase()}`, sheet: 'achievement', kind: 'glyph', name: it.name, glyph: `${it.g}︎`, color: hex, cutout: cutoutFor(hex) };
});

/* ── Rarity sheet — the tiers as name-tags ────────────────────────────────── */
const RARITY_WORDS = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'MYTHIC', 'LEGENDARY', 'GRAIL'];
const RARITY_HUES = genHues(RARITY_WORDS.length, 'rr', { sat: 86, lights: [54, 46, 60], phase: 50 });
const RARITIES: Sticker[] = RARITY_WORDS.map<Sticker>((w, i) => {
    const hex = RARITY_HUES[i]!.hex;
    return { id: `rarity-${w.toLowerCase()}`, sheet: 'rarity', kind: 'face', name: w, glyph: w, color: hex, cutout: cutoutFor(hex) };
}).filter((s) => s.id !== 'rarity-epic'); // EPIC removed; others keep their exact hue (Brendon 2026-06-22)

/* ── True Names sheet — each project's Glagolitic true name ────────────────── */
const TRUE_HUES = genHues(PROJECT_LIST.length, 'tn', { sat: 80, lights: [52, 44, 60], phase: 160 });
const TRUENAMES: Sticker[] = PROJECT_LIST.map<Sticker>((p, i) => {
    const hex = TRUE_HUES[i]!.hex;
    return { id: `truename-${p.slug}`, sheet: 'truename', kind: 'face', name: p.displayName, glyph: projectTrueName(p.slug), color: hex, cutout: cutoutFor(hex) };
});

/* ── Quips sheet — the familiar one-liners ────────────────────────────────── */
const QUIPS = ['GM', 'GN', 'WAGMI', 'FEW', 'PROBABLY NOTHING', 'STAY HUMBLE', 'HODL', 'SER', 'DEGEN', 'TOUCH GRASS', 'VIBES', 'NGMI'];
const QUIP_HUES = genHues(QUIPS.length, 'qp', { sat: 84, lights: [54, 46, 62], phase: 300 });
const QUIP_STICKERS: Sticker[] = QUIPS.map<Sticker>((q, i) => {
    const hex = QUIP_HUES[i]!.hex;
    return { id: `quip-${i}`, sheet: 'quip', kind: 'face', name: q, glyph: q, color: hex, cutout: cutoutFor(hex) };
});

/* ── Holo sheet — the logo with an iridescent holographic finish ──────────── */
const HOLO: Sticker[] = [
    { id: 'holo-logo-1', rotated: false }, { id: 'holo-petey-1', rotated: true },
    { id: 'holo-logo-2', rotated: false }, { id: 'holo-petey-2', rotated: true },
    { id: 'holo-logo-3', rotated: false }, { id: 'holo-petey-3', rotated: true },
].map<Sticker>((o) => ({ id: o.id, sheet: 'holo', kind: 'logo', name: 'Holo', color: '#FFFFFF', cutout: '#1A1A1A', rotated: o.rotated, holo: true }));

/* ── Animated sheet — sprites that breathe (cycling frames) ────────────────── */
const ANIM_FRAMES: { name: string; frames: string[] }[] = [
    { name: 'Wisp', frames: ['( ¤ )', '( ☼ )', '( ¤ )'] },
    { name: 'Watcher', frames: ['[ ◉ ]', '[ ◎ ]', '[ ◉ ]'] },
    { name: 'Slime', frames: ['(~o~)', '(~O~)', '(~o~)'] },
    { name: 'Spider', frames: ['/|o.o|\\', '\\|o.o|/', '/|o.o|\\'] },
    { name: 'Orbit', frames: ['(◯·)', '(·◯)', '(◯·)'] },
];
const ANIM_HUES = genHues(ANIM_FRAMES.length, 'an', { sat: 82, lights: [54, 44, 62], phase: 90 });
const ANIMATED: Sticker[] = ANIM_FRAMES.map<Sticker>((it, i) => {
    const hex = ANIM_HUES[i]!.hex;
    return { id: `anim-${it.name.toLowerCase()}`, sheet: 'animated', kind: 'anim', name: it.name, frames: it.frames, color: hex, cutout: cutoutFor(hex) };
});

export const STICKERS: readonly Sticker[] = [
    ...GENESIS, ...PETEY, ...ICONS, ...FAMILIARS,
    ...PROJECT_SPRITES, ...ARTIST_SPRITES, ...PRICESPRITES,
    ...ARTIST_NAMES, ...PROJECT_NAMES, ...OUTPUTS,
    ...ACHIEVEMENTS, ...RARITIES, ...TRUENAMES, ...QUIP_STICKERS, ...HOLO, ...ANIMATED,
];

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
    { id: 'project', name: 'PROJECTS', tag: 'MYTHIC',   count: PROJECT_SPRITES.length, price: '0.016', cover: PROJECT_SPRITES[0]! },
    { id: 'artist',  name: 'ARTISTS',  tag: 'MYTHIC',   count: ARTIST_SPRITES.length,  price: '0.014', cover: ARTIST_SPRITES[0]! },
    { id: 'pricesprite', name: 'PRICESPRITES', tag: 'RARE', count: PRICESPRITES.length, price: '0.010', cover: PRICESPRITES[0]! },
    { id: 'handle', name: 'ARTIST NAMES', tag: 'COMMON', count: ARTIST_NAMES.length, price: '0.006', cover: ARTIST_NAMES[0]! },
    { id: 'projectname', name: 'PROJECT NAMES', tag: 'COMMON', count: PROJECT_NAMES.length, price: '0.008', cover: PROJECT_NAMES[0]! },
    { id: 'output', name: 'OUTPUTS', tag: 'MYTHIC', count: OUTPUTS.length, price: '0.020', cover: OUTPUTS[0]! },
    { id: 'achievement', name: 'ACHIEVEMENTS', tag: 'RARE', count: ACHIEVEMENTS.length, price: '0.012', cover: ACHIEVEMENTS[0]! },
    { id: 'rarity', name: 'RARITY', tag: 'UNCOMMON', count: RARITIES.length, price: '0.010', cover: RARITIES[0]! },
    { id: 'truename', name: 'TRUE NAMES', tag: 'MYTHIC', count: TRUENAMES.length, price: '0.016', cover: TRUENAMES[0]! },
    { id: 'quip', name: 'QUIPS', tag: 'COMMON', count: QUIP_STICKERS.length, price: '0.006', cover: QUIP_STICKERS[0]! },
    { id: 'holo', name: 'HOLO', tag: 'MYTHIC', count: HOLO.length, price: '0.024', cover: HOLO[0]! },
    { id: 'animated', name: 'ANIMATED', tag: 'MYTHIC', count: ANIMATED.length, price: '0.022', cover: ANIMATED[0]! },
];

export function stickersForSheet(id: SheetId): Sticker[] {
    return STICKERS.filter((s) => s.sheet === id);
}

/* ── Ownership (simulated seed) ──────────────────────────────────────────── */
/* Zeroed out — no profile is seeded; everyone (Brendon included) starts with no
   stickers and builds their set by buying. (Brendon 2026-06-22.) */
const MOCK_OWNED: Record<string, string[]> = {};

export function ownedStickers(handle: string | null | undefined): Sticker[] {
    if (!handle) return [];
    const ids = MOCK_OWNED[handle.replace(/^@/, '').toLowerCase()];
    if (!ids) return [];
    return ids.map((id) => BY_ID.get(id)).filter((s): s is Sticker => Boolean(s));
}
