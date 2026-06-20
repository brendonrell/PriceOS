/*
 * Gen Curated — the recipe engine for the profile Showcase.
 *
 * Static = your saved set. Generative = your saved set, reshuffled. Gen Curated
 * IGNORES the saved set and CURATES a fresh themed pull from the profile's whole
 * collected-output set every visit. Fully automatic — set it and forget it.
 *
 * It's RECIPE-DRIVEN. Each "kind" inspects what the wallet actually owns and
 * emits every FEASIBLE set it can make; feasibility + size are per-kind (a
 * single-hue wall wants 5–6, a complementary split 4–6, a tight artist-in-one-
 * colour just 3, a Triple-sign as few as 2). Every feasible recipe across all
 * kinds goes in a hat and one is drawn — a dozen+ kinds × a real collection =
 * hundreds of possible sets, never the same twice.
 *
 * The buried-gem twist: the profile's PriceSprite sometimes CURATES in character
 * — the Mystic pulls astrology, the Instigator pulls clashes, the Hacker pulls
 * chaos, the Observer pulls quiet tones — and signs the set in its own voice.
 *
 * Captions live in ./genCuratedNames. Several kinds (aspect ratio, follows,
 * rarity) light up automatically the moment that data is captured per output.
 */

import { COLOR_BUCKET_ORDER, type ColorBucket } from '../art/outputColor';
import {
    COLOR_NAMES, PAIR_NAMES, ARTIST_NAMES, PROJECT_NAMES, RANDOM_NAMES,
    FAMILY_NAMES, SUN_NAMES, MOON_NAMES, RISING_NAMES,
    ARTIST_COLOR_NAMES, PROJECT_COLOR_NAMES,
    ANALOGOUS_NAMES, ANALOGOUS_WARM_NAMES, ANALOGOUS_COOL_NAMES, TRIADIC_NAMES,
    ELEMENT_NAMES, PRICEDAY_NAMES, RANGE_NAMES, FATE_NAMES,
    ANGEL_NAMES, LOWMINT_NAMES, SAMENUM_NAMES, LISTED_NAMES, HELD_NAMES,
    TRIPLE_NAMES, MODALITY_NAMES, ASPECT_NAMES, FOLLOWING_NAMES, VIBE_CAPTIONS,
} from './genCuratedNames';

export type SpriteVibe = 'observer' | 'instigator' | 'hacker' | 'mystic';

export interface CuratedCandidate {
    slug: string;
    id: number;
    color: ColorBucket | null;
    artist?: string;
    project?: string;
    sun?: string;
    moon?: string;
    rising?: string;
    priceDay?: string;
    fate?: string;
    listed?: boolean;
    /* Light up when captured (see docs/output-visual-capture.md). */
    aspect?: 'square' | 'wide' | 'tall';
    following?: boolean;   // this piece's artist is followed by the profile owner
}
export interface CuratedPick { slug: string; id: number; }
export interface CuratedResult { picks: CuratedPick[]; caption: string; }

interface Recipe { kind: string; picks: CuratedCandidate[]; caption: string; }

/* Colour wheel + families. */
const WARM: ColorBucket[] = ['Hothurt', 'Red', 'Orange', 'Yellow', 'Magenta'];
const COOL: ColorBucket[] = ['Green', 'Blue', 'Purple'];
const NEUTRAL: ColorBucket[] = ['Brown', 'Cream', 'Moon', 'Grey'];
const MONOCHROME: ColorBucket[] = ['Black', 'White', 'Grey'];
const COMPLEMENT: [ColorBucket, ColorBucket][] = [
    ['Red', 'Green'], ['Orange', 'Blue'], ['Yellow', 'Purple'], ['Magenta', 'Green'],
];
const HUE_WHEEL: ColorBucket[] = ['Hothurt', 'Red', 'Orange', 'Yellow', 'Green', 'Blue', 'Purple', 'Magenta'];
const TRIADS: ColorBucket[][] = [['Red', 'Yellow', 'Blue'], ['Orange', 'Green', 'Purple'], ['Hothurt', 'Yellow', 'Blue']];

/* Zodiac structure. */
const ELEMENTS: Record<'Fire' | 'Earth' | 'Air' | 'Water', string[]> = {
    Fire: ['Aries', 'Leo', 'Sagittarius'],
    Earth: ['Taurus', 'Virgo', 'Capricorn'],
    Air: ['Gemini', 'Libra', 'Aquarius'],
    Water: ['Cancer', 'Scorpio', 'Pisces'],
};
const MODALITIES: Record<'Cardinal' | 'Fixed' | 'Mutable', string[]> = {
    Cardinal: ['Aries', 'Cancer', 'Libra', 'Capricorn'],
    Fixed: ['Taurus', 'Leo', 'Scorpio', 'Aquarius'],
    Mutable: ['Gemini', 'Virgo', 'Sagittarius', 'Pisces'],
};

/* Which kinds each PriceSprite vibe is drawn to when it curates. */
const VIBE_AFFINITY: Record<SpriteVibe, string[]> = {
    observer: ['mono', 'neutral', 'cool', 'monochrome', 'analogous', 'range', 'held', 'aspect'],
    instigator: ['complement', 'triadic', 'rainbow', 'warm', 'samenum', 'listed', 'angel'],
    hacker: ['random', 'rainbow', 'range', 'angel', 'samenum', 'triadic', 'lowmint'],
    mystic: ['sun', 'moon', 'rising', 'element', 'modality', 'triple', 'fate', 'cohort'],
};

const MAX = 6;

function shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}
function randOf<T>(arr: readonly T[]): T | undefined {
    return arr.length ? arr[Math.floor(Math.random() * arr.length)] : undefined;
}
function groupBy(arr: CuratedCandidate[], keyOf: (c: CuratedCandidate) => string | null | undefined) {
    const m = new Map<string, CuratedCandidate[]>();
    for (const c of arr) {
        const k = keyOf(c);
        if (!k) continue;
        const g = m.get(k);
        if (g) g.push(c); else m.set(k, [c]);
    }
    return m;
}
const clean = (s: string) => s.replace(/^@/, '');
const fill = (tmpl: string, vars: Record<string, string>) =>
    tmpl.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const pairKey = (a: string, b: string) => [a, b].sort().join('+');
const hueIndex = (c: ColorBucket | null) => (c ? HUE_WHEEL.indexOf(c) : -1);
function orderByHue(picks: CuratedCandidate[]): CuratedCandidate[] {
    return [...picks].sort((a, b) => {
        const ia = hueIndex(a.color), ib = hueIndex(b.color);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
}
const isRepdigit = (n: number) => n >= 11 && /^(\d)\1+$/.test(String(n));

/* ── Kinds. Each emits every feasible recipe for the pool. ────────────── */

function monoColor(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    for (const [color, g] of groupBy(pool, (c) => c.color)) {
        if (g.length < 5) continue;
        out.push({ kind: 'mono', picks: shuffle(g).slice(0, MAX), caption: randOf(COLOR_NAMES[color as ColorBucket]) ?? `${color} Set` });
    }
    return out;
}

function complement(pool: CuratedCandidate[]): Recipe[] {
    const byColor = groupBy(pool, (c) => c.color);
    const out: Recipe[] = [];
    for (const [a, b] of COMPLEMENT) {
        const ga = byColor.get(a) ?? [], gb = byColor.get(b) ?? [];
        if (ga.length < 2 || gb.length < 2 || ga.length + gb.length < 4) continue;
        const sa = shuffle(ga), sb = shuffle(gb);
        const n = Math.min(MAX, sa.length + sb.length), half = Math.floor(n / 2);
        const takeB = Math.min(sb.length, half), takeA = Math.min(sa.length, n - takeB);
        out.push({ kind: 'complement', picks: [...sa.slice(0, takeA), ...sb.slice(0, takeB)], caption: randOf(PAIR_NAMES[pairKey(a, b)] ?? []) ?? `${a} & ${b}` });
    }
    return out;
}

function family(pool: CuratedCandidate[], kind: string, set: ColorBucket[], names: readonly string[]): Recipe[] {
    const buckets = new Set<string>(set);
    const inFam = pool.filter((c) => c.color && buckets.has(c.color));
    if (inFam.length < 5 || new Set(inFam.map((c) => c.color)).size < 2) return [];
    return [{ kind, picks: shuffle(inFam).slice(0, MAX), caption: randOf(names) ?? 'A Family' }];
}

function rainbow(pool: CuratedCandidate[]): Recipe[] {
    const byColor = groupBy(pool, (c) => c.color);
    const present = COLOR_BUCKET_ORDER.filter((c) => (byColor.get(c)?.length ?? 0) > 0);
    if (present.length < 5) return [];
    const picks = orderByHue(shuffle(present).slice(0, MAX).map((c) => shuffle(byColor.get(c)!)[0]));
    return [{ kind: 'rainbow', picks, caption: randOf(FAMILY_NAMES.rainbow) ?? 'Full Spectrum' }];
}

function analogous(pool: CuratedCandidate[]): Recipe[] {
    const byColor = groupBy(pool, (c) => c.color);
    const out: Recipe[] = [];
    for (let i = 0; i < HUE_WHEEL.length; i++) {
        const run = [HUE_WHEEL[i], HUE_WHEEL[(i + 1) % HUE_WHEEL.length], HUE_WHEEL[(i + 2) % HUE_WHEEL.length]];
        const items = run.flatMap((c) => byColor.get(c) ?? []);
        if (items.length < 5 || new Set(items.map((c) => c.color)).size < 2) continue;
        const warm = run.every((c) => WARM.includes(c));
        const cool = run.every((c) => c === 'Green' || c === 'Blue' || c === 'Purple');
        const names = warm ? ANALOGOUS_WARM_NAMES : cool ? ANALOGOUS_COOL_NAMES : ANALOGOUS_NAMES;
        out.push({ kind: 'analogous', picks: orderByHue(shuffle(items)).slice(0, MAX), caption: randOf(names) ?? 'Gradient' });
    }
    return out;
}

function triadic(pool: CuratedCandidate[]): Recipe[] {
    const byColor = groupBy(pool, (c) => c.color);
    const out: Recipe[] = [];
    for (const triad of TRIADS) {
        if (triad.filter((c) => (byColor.get(c)?.length ?? 0) > 0).length < 3) continue;
        const items = triad.flatMap((c) => byColor.get(c) ?? []);
        if (items.length < 5) continue;
        out.push({ kind: 'triadic', picks: orderByHue(shuffle(items)).slice(0, MAX), caption: randOf(TRIADIC_NAMES) ?? 'Triad' });
    }
    return out;
}

function byArtist(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    for (const [artist, g] of groupBy(pool, (c) => c.artist)) {
        if (g.length < 5) continue;
        out.push({ kind: 'artist', picks: shuffle(g).slice(0, MAX), caption: fill(randOf(ARTIST_NAMES) ?? 'All {x}', { x: artist }) });
    }
    return out;
}
function byProject(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    for (const [project, g] of groupBy(pool, (c) => c.project)) {
        if (g.length < 5) continue;
        out.push({ kind: 'project', picks: shuffle(g).slice(0, MAX), caption: fill(randOf(PROJECT_NAMES) ?? 'All {x}', { x: project }) });
    }
    return out;
}

function combo(pool: CuratedCandidate[], kind: string, keyOf: (c: CuratedCandidate) => string | null, names: readonly string[]): Recipe[] {
    const out: Recipe[] = [];
    for (const [key, g] of groupBy(pool, keyOf)) {
        if (g.length < 3) continue;
        const [name, color] = key.split('|||');
        out.push({ kind, picks: shuffle(g).slice(0, MAX), caption: fill(randOf(names) ?? '{x} in {c}', { x: name, c: color }) });
    }
    return out;
}

function natalSign(pool: CuratedCandidate[], kind: string, dim: 'sun' | 'moon' | 'rising', names: readonly string[]): Recipe[] {
    const out: Recipe[] = [];
    for (const [sign, g] of groupBy(pool, (c) => c[dim])) {
        if (g.length < 4) continue;
        out.push({ kind, picks: shuffle(g).slice(0, MAX), caption: fill(randOf(names) ?? '{x}', { x: sign }) });
    }
    return out;
}

function element(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    for (const dim of ['sun', 'moon', 'rising'] as const) {
        for (const [el, signs] of Object.entries(ELEMENTS) as ['Fire' | 'Earth' | 'Air' | 'Water', string[]][]) {
            const set = new Set(signs);
            const items = pool.filter((c) => c[dim] && set.has(c[dim]!));
            if (items.length < 4 || new Set(items.map((c) => c[dim])).size < 2) continue;
            out.push({ kind: 'element', picks: shuffle(items).slice(0, MAX), caption: randOf(ELEMENT_NAMES[el]) ?? `${el} Signs` });
        }
    }
    return out;
}
function modality(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    for (const [mod, signs] of Object.entries(MODALITIES) as ['Cardinal' | 'Fixed' | 'Mutable', string[]][]) {
        const set = new Set(signs);
        const items = pool.filter((c) => c.sun && set.has(c.sun));
        if (items.length < 4 || new Set(items.map((c) => c.sun)).size < 2) continue;
        out.push({ kind: 'modality', picks: shuffle(items).slice(0, MAX), caption: randOf(MODALITY_NAMES[mod]) ?? `${mod} Signs` });
    }
    return out;
}
/* The rare one — Sun = Moon = Rising. */
function triple(pool: CuratedCandidate[]): Recipe[] {
    const items = pool.filter((c) => c.sun && c.sun === c.moon && c.moon === c.rising);
    const out: Recipe[] = [];
    for (const [sign, g] of groupBy(items, (c) => c.sun)) {
        if (g.length < 2) continue;
        out.push({ kind: 'triple', picks: shuffle(g).slice(0, MAX), caption: fill(randOf(TRIPLE_NAMES) ?? 'Triple {x}', { x: sign }) });
    }
    return out;
}

function fate(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    for (const [f, g] of groupBy(pool, (c) => c.fate)) {
        if (g.length < 4) continue;
        out.push({ kind: 'fate', picks: shuffle(g).slice(0, MAX), caption: fill(randOf(FATE_NAMES) ?? 'All {x}', { x: f }) });
    }
    return out;
}

function cohort(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    for (const [day, g] of groupBy(pool, (c) => c.priceDay)) {
        if (g.length < 4) continue;
        out.push({ kind: 'cohort', picks: shuffle(g).slice(0, MAX), caption: fill(randOf(PRICEDAY_NAMES) ?? 'Born on {x}', { x: day }) });
    }
    return out;
}

/* token_id magic. */
function tokenMagic(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    const angels = pool.filter((c) => isRepdigit(c.id));
    if (angels.length >= 3) out.push({ kind: 'angel', picks: shuffle(angels).slice(0, MAX), caption: randOf(ANGEL_NAMES) ?? 'Angel Numbers' });
    const lows = pool.filter((c) => c.id >= 1 && c.id <= 9);
    if (lows.length >= 4) out.push({ kind: 'lowmint', picks: shuffle(lows).slice(0, MAX), caption: randOf(LOWMINT_NAMES) ?? 'Single Digits' });
    for (const [num, g] of groupBy(pool, (c) => String(c.id))) {
        if (g.length < 3) continue; // the "#42 club" — same number across projects
        out.push({ kind: 'samenum', picks: shuffle(g).slice(0, MAX), caption: fill(randOf(SAMENUM_NAMES) ?? 'The {x} Club', { x: `#${num}` }) });
    }
    return out;
}

function status(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    const listed = pool.filter((c) => c.listed === true);
    if (listed.length >= 4) out.push({ kind: 'listed', picks: shuffle(listed).slice(0, MAX), caption: randOf(LISTED_NAMES) ?? 'For Sale' });
    const held = pool.filter((c) => c.listed === false);
    if (held.length >= 5) out.push({ kind: 'held', picks: shuffle(held).slice(0, MAX), caption: randOf(HELD_NAMES) ?? 'The Vault' });
    return out;
}

/* Lights up once aspect ratio is captured per output. */
function aspect(pool: CuratedCandidate[]): Recipe[] {
    const out: Recipe[] = [];
    for (const [a, g] of groupBy(pool, (c) => c.aspect)) {
        if (g.length < 4) continue;
        out.push({ kind: 'aspect', picks: shuffle(g).slice(0, MAX), caption: randOf(ASPECT_NAMES[a as 'square' | 'wide' | 'tall']) ?? 'Same Shape' });
    }
    return out;
}
/* Lights up once the owner's follow graph is threaded in. */
function following(pool: CuratedCandidate[]): Recipe[] {
    const items = pool.filter((c) => c.following === true);
    if (items.length < 5) return [];
    return [{ kind: 'following', picks: shuffle(items).slice(0, MAX), caption: randOf(FOLLOWING_NAMES) ?? 'From the Feed' }];
}

/* Maximum variety — one piece per distinct artist. */
function range(pool: CuratedCandidate[]): Recipe[] {
    const byArt = groupBy(pool, (c) => c.artist);
    if (byArt.size < 5) return [];
    const picks = shuffle([...byArt.values()]).slice(0, MAX).map((g) => shuffle(g)[0]);
    if (picks.length < 5) return [];
    return [{ kind: 'range', picks, caption: randOf(RANGE_NAMES) ?? 'The Range' }];
}

function allRecipes(pool: CuratedCandidate[]): Recipe[] {
    return [
        ...monoColor(pool), ...complement(pool),
        ...family(pool, 'warm', WARM, FAMILY_NAMES.warm),
        ...family(pool, 'cool', COOL, FAMILY_NAMES.cool),
        ...family(pool, 'neutral', NEUTRAL, FAMILY_NAMES.neutral),
        ...family(pool, 'monochrome', MONOCHROME, FAMILY_NAMES.monochrome),
        ...rainbow(pool), ...analogous(pool), ...triadic(pool),
        ...byArtist(pool), ...byProject(pool),
        ...combo(pool, 'artistColor', (c) => (c.artist && c.color ? `${c.artist}|||${c.color}` : null), ARTIST_COLOR_NAMES),
        ...combo(pool, 'projectColor', (c) => (c.project && c.color ? `${c.project}|||${c.color}` : null), PROJECT_COLOR_NAMES),
        ...natalSign(pool, 'sun', 'sun', SUN_NAMES),
        ...natalSign(pool, 'moon', 'moon', MOON_NAMES),
        ...natalSign(pool, 'rising', 'rising', RISING_NAMES),
        ...element(pool), ...modality(pool), ...triple(pool),
        ...fate(pool), ...cohort(pool), ...tokenMagic(pool), ...status(pool),
        ...aspect(pool), ...following(pool), ...range(pool),
    ];
}

/**
 * Curate a fresh themed set. Every feasible recipe is generated, then one is
 * drawn at random (each visit differs). When the profile's PriceSprite vibe is
 * supplied, there's a ~40% chance it curates in character — biasing to its
 * favourite kinds and signing the set in its own voice.
 */
export function genCuratedSet(
    pool: CuratedCandidate[],
    opts: { vibe?: SpriteVibe | null; handle?: string | null } = {},
): CuratedResult {
    const recipes = allRecipes(pool);
    const toResult = (r: Recipe, caption?: string): CuratedResult => ({
        picks: r.picks.map((c) => ({ slug: c.slug, id: c.id })),
        caption: caption ?? r.caption,
    });

    if (recipes.length === 0) {
        return { picks: shuffle(pool).slice(0, MAX).map((c) => ({ slug: c.slug, id: c.id })), caption: randOf(RANDOM_NAMES) ?? 'Wildcard' };
    }

    // The PriceSprite steps in to curate, in character.
    if (opts.vibe && Math.random() < 0.4) {
        const want = new Set(VIBE_AFFINITY[opts.vibe]);
        const liked = recipes.filter((r) => want.has(r.kind));
        const chosen = randOf(liked.length ? liked : recipes);
        if (chosen) {
            const voice = fill(randOf(VIBE_CAPTIONS[opts.vibe]) ?? chosen.caption, { handle: clean(opts.handle ?? 'them') });
            return toResult(chosen, voice);
        }
    }

    const chosen = randOf(recipes);
    return chosen ? toResult(chosen) : { picks: [], caption: '' };
}
