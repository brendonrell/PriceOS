/*
 * buildOutputAttributes — assembles an Output's full "character sheet": every
 * attribute we capture, grouped for display. Pure + deterministic; computes the
 * derivations live (lib/output/derive) and edition-set rarity (lib/output/rarity)
 * so the panel is fully populated even before a row is backfilled. The capture
 * routes persist the SAME values to `outputs`.
 */

import { getProject, projectLanguage } from '../project/registry';
import { golfScore } from '../project/golfScore';
import { outputColorBucket } from '../art/outputColor';
import {
    natalElement, natalModality, natalPolarity, natalRuler, natalHarmony,
    birthWeekday, birthTimeOfDay, birthSeason, lunarPhase, lunarGlyph, lunarIllumination,
    fateDetail, brightnessBand, saturationBand, complexityBand, toneMood,
    colorTemperature, orientationOf, BUCKET_HEX,
    paletteBand, contrastBand, warmthBand, symmetryBand, airBand, textureBand, gravityWord,
    valueKey, colourStory,
    geometryBand, colorfulnessOf, colorfulnessBand, densityOf, densityBand, orderOf, orderBand,
} from './derive';
import { primaryTrait, traitRarity, fateRarity, colorRarity, overallRarity, pdRarityRank, popCount, type Freq } from './rarity';
import { outputIsolation, nearestKin } from './genome';
import { percentileTag, mintOrderOf, ordinal, humanizeDelta, type EditionStats, type EditionAxis } from './editionStats';
import type { HandRead } from './hand';
import { entropyGrid } from './entropyGlyph';

export interface AttrTile {
    glyph: string;
    label: string;
    value: string;
    /** Small secondary line under the value (e.g. a rarity blurb). */
    sub?: string;
    /** Colour swatch chip shown before the value. */
    swatch?: string;
    /** Highlight as a standout (rarest-of-axis / notable). */
    rare?: boolean;
    /** A 16×16 boolean barcode rendered in place of the value (Entropy glyph). */
    grid?: boolean[];
    /** A weighted colour strip (collection palette). Each segment grows by weight. */
    spectrum?: { hex: string; weight: number }[];
    /** Tappable hex chips — the piece's ACTUAL colours; AttrWall copies on tap. */
    chips?: { hex: string; share: number }[];
    /** When set, the tile is tappable and AttrWall calls onTileTap(tapKey). */
    tapKey?: string;
}
export interface AttrGroup {
    key: string;
    label: string;
    tiles: AttrTile[];
}

export interface AttrInput {
    slug: string;
    id: number;
    /** Mint moment in ms (null until known) — gates the sky/almanac groups. */
    mintMs: number | null;
    /** Platform + artist traits from /api/output/[id] (Sun/Moon/Rising/Fate/Palette…). */
    traits: Record<string, string>;
    /** Stored visual fingerprint (sampled pixels), or null. v2 fields
     *  (accent…texture) are absent/null on rows captured before the deep look. */
    fingerprint: {
        dominant_color: string | null; aspect: string | null;
        brightness: number | null; saturation: number | null; complexity: number | null;
        accent_color?: string | null; accent_share?: number | null;
        palette_count?: number | null; contrast?: number | null; warmth?: number | null;
        gravity?: string | null; symmetry?: number | null; air?: number | null;
        texture?: number | null;
        scene?: string | null; shape_count?: number | null; pattern?: string | null;
        geometry?: number | null;
    } | null;
    /** The Output true name (project glyphs + id). */
    trueName: string;
    /** Conviction read (lib/output/hand) from the live ledger — the Hand lens. */
    hand?: HandRead | null;
    /** Attention lens — anoint conduit votes for this piece. */
    attention?: { votes: number } | null;
    /** Edition context (lib/output/editionStats) — percentile tags on the
     *  Fingerprint bands + mint order/speed. Null until fetched; gated. */
    edition?: EditionStats | null;
    /** The piece's ACTUAL rendered colours (lib/output/paletteChips) — the
     *  tappable hex chips. Null until sampled. */
    palette?: { hex: string; share: number }[] | null;
}

const pct = (p: number): string => (p >= 0.1 ? `${Math.round(p * 100)}%` : `${(p * 100).toFixed(1)}%`);
const rareBlurb = (f: Freq): string =>
    `${f.count} of ${f.total} · ${pct(f.pct)}${f.rank === 1 ? ' · rarest' : ''}`;

export function buildOutputAttributes(input: AttrInput): AttrGroup[] {
    const { slug, id, mintMs, traits, fingerprint, trueName, hand, attention, edition, palette } = input;
    const project = getProject(slug);
    const supply = project?.outputs ?? null;
    const groups: AttrGroup[] = [];

    /* Percentile tag for a Fingerprint band's sub — "34% · top 8%". Gated on
       the edition context; without it the sub is exactly what it always was. */
    const bandSub = (axis: EditionAxis, v: number, base?: string): string | undefined => {
        const tag = edition ? percentileTag(edition, axis, v) : null;
        const lead = base ?? pct(v);
        return tag ? `${lead} · ${tag}` : lead;
    };

    /* ── Identity ─────────────────────────────────────────────────────── */
    const identity: AttrTile[] = [];
    if (trueName) identity.push({ glyph: '✶', label: 'True Name', value: trueName });
    identity.push({ glyph: '⬚', label: 'Edition', value: supply ? `#${id} / ${supply}` : `#${id}` });
    if (project) {
        identity.push({ glyph: '✺', label: 'Artist', value: `@${project.artistHandle}` });
        identity.push({ glyph: '◈', label: 'Project', value: project.displayName });
        if (project.mintPriceEth != null) identity.push({ glyph: '◊', label: 'Mint Price', value: `${project.mintPriceEth} ETH` });
        if (project.colorway) identity.push({ glyph: '◉', label: 'Colorway', value: project.colorway.toUpperCase(), swatch: project.colorway });
        if (project.soundtrack) identity.push({ glyph: '♫', label: 'Soundtrack', value: project.soundtrack.label });
    }
    groups.push({ key: 'identity', label: 'Identity', tiles: identity });

    /* ── Code (coding language + Golf Score) — mirrors the Project
       attributes sheet's Code section, right after Identity: a gen-art
       platform's attributes should lead with what the piece is actually
       MADE OF (Brendon, 2026-08-18). Project-level stats (one engine per
       project), so they read off `slug` the same as any Identity tile. */
    const codeTiles: AttrTile[] = [
        { glyph: '⌥', label: 'Language', value: projectLanguage(slug) },
    ];
    const golf = golfScore(slug);
    if (golf) {
        codeTiles.push({
            glyph: '◴', label: 'Golf Score', value: `${golf.bytes.toLocaleString()} B`,
            sub: `#${golf.rank} of ${golf.total} · tap for the Clubhouse`,
            rare: golf.rank === 1,
            tapKey: 'golf',
        });
    }
    groups.push({ key: 'code', label: 'Code', tiles: codeTiles });

    /* ── Fingerprint (sampled pixels — the deep look) ─────────────────────
       The piece's full visual read, one wall of tiles. v1 axes first (colour /
       light), then the v2 deep look (palette structure / composition). Every
       tile is gated on its datum so pre-v2 rows degrade to the shorter wall. */
    const form: AttrTile[] = [];
    const bucket = fingerprint?.dominant_color ?? outputColorBucket(slug, id) ?? null;
    const warmth = fingerprint?.warmth;
    /* The quantitative read leads the wall — the sentence a human would say
       ("two blue squares and a yellow circle"), then the adjectives. */
    const scene = fingerprint?.scene;
    if (scene) {
        const shapeCount = fingerprint?.shape_count;
        form.push({
            glyph: '◱', label: 'Reads As', value: scene,
            sub: shapeCount != null && shapeCount > 0 ? `${shapeCount} shape${shapeCount === 1 ? '' : 's'} found` : undefined,
        });
    }
    if (bucket) {
        form.push({ glyph: '◉', label: 'Dominant Colour', value: bucket, swatch: BUCKET_HEX[bucket] });
    }
    const accent = fingerprint?.accent_color;
    if (accent) {
        const ash = fingerprint?.accent_share;
        form.push({ glyph: '◎', label: 'Accent', value: accent, swatch: BUCKET_HEX[accent], sub: ash != null ? pct(ash) : undefined });
    }
    const pc = fingerprint?.palette_count;
    if (pc != null) form.push({ glyph: '▤', label: 'Palette', value: paletteBand(pc), sub: `${pc} colour${pc === 1 ? '' : 's'}` });
    if (bucket) {
        form.push({
            glyph: '✦', label: 'Temperature', value: warmth != null ? warmthBand(warmth) : colorTemperature(bucket),
            sub: warmth != null ? bandSub('warmth', warmth, `${pct(warmth)} warm`) : undefined,
        });
    }
    const br = fingerprint?.brightness, sa = fingerprint?.saturation, cx = fingerprint?.complexity;
    if (br != null) form.push({ glyph: '◐', label: 'Brightness', value: brightnessBand(br), sub: bandSub('brightness', br) });
    if (sa != null) form.push({ glyph: '❖', label: 'Saturation', value: saturationBand(sa), sub: bandSub('saturation', sa) });
    const contrast = fingerprint?.contrast;
    if (contrast != null) form.push({ glyph: '◨', label: 'Contrast', value: contrastBand(contrast), sub: bandSub('contrast', contrast) });
    if (br != null && sa != null) form.push({ glyph: '◕', label: 'Tone', value: toneMood(br, sa) });
    if (cx != null) form.push({ glyph: '⌗', label: 'Complexity', value: complexityBand(cx), sub: bandSub('complexity', cx) });
    const texture = fingerprint?.texture;
    if (texture != null) form.push({ glyph: '▒', label: 'Texture', value: textureBand(texture), sub: bandSub('texture', texture) });
    const air = fingerprint?.air;
    if (air != null) form.push({ glyph: '◌', label: 'Air', value: airBand(air), sub: bandSub('air', air) });
    const gravity = fingerprint?.gravity;
    if (gravity) form.push({ glyph: '◒', label: 'Gravity', value: gravityWord(gravity) });
    const symmetry = fingerprint?.symmetry;
    if (symmetry != null) form.push({ glyph: '◫', label: 'Symmetry', value: symmetryBand(symmetry), sub: bandSub('symmetry', symmetry) });
    const orient = orientationOf(fingerprint?.aspect ?? null);
    if (orient) form.push({ glyph: '▭', label: 'Orientation', value: orient });
    /* v3 (2026-07-04) — higher-order reads composed from the real scalars above.
       Each is gated on its inputs so pre-capture rows omit it (never faked). */
    if (br != null && contrast != null) {
        form.push({ glyph: '◑', label: 'Value Key', value: valueKey(br, contrast) });
    }
    if (bucket && accent) {
        const story = colourStory(bucket, accent);
        if (story) form.push({ glyph: '✧', label: 'Colour Story', value: story, sub: `${bucket} · ${accent}` });
    }
    /* v4 (2026-07-27) — THE TASTE AXES, the Radar's data unlock (Brendon's
       call: the Fingerprint is where taste gets measured). Four poles-pair
       reads: Geometric↔Organic rides the new v4 pixel read; the other three
       are transparent composites of the real scalars above. Gated per axis. */
    const geometry = fingerprint?.geometry;
    if (geometry != null) {
        form.push({ glyph: '∠', label: 'Geometry', value: geometryBand(geometry), sub: `${pct(geometry)} geometric` });
    }
    if (sa != null && pc != null) {
        const c = colorfulnessOf(sa, pc);
        form.push({ glyph: '◧', label: 'Colourfulness', value: colorfulnessBand(c), sub: `${pct(c)} colorful` });
    }
    if (air != null && cx != null) {
        const d = densityOf(air, cx);
        form.push({ glyph: '▓', label: 'Density', value: densityBand(d), sub: `${pct(d)} dense` });
    }
    if (symmetry != null && texture != null) {
        const o = orderOf(symmetry, texture, fingerprint?.pattern);
        form.push({ glyph: '∷', label: 'Order', value: orderBand(o), sub: `${pct(o)} structured` });
    }
    /* Swatches — the piece's ACTUAL colours as tappable hex chips (sampled
       from its real render, lib/output/paletteChips). Tap copies the hex. */
    if (palette && palette.length > 0) {
        form.push({ glyph: '▧', label: 'Swatches', value: '', sub: 'tap a chip to copy its hex', chips: palette });
    }
    if (form.length) groups.push({ key: 'form', label: 'Fingerprint', tiles: form });

    /* ── Sky (natal chart) ────────────────────────────────────────────── */
    const sun = traits.Sun, moon = traits.Moon, rising = traits.Rising;
    if (sun || moon || rising) {
        const sky: AttrTile[] = [];
        if (sun) sky.push({ glyph: '☉', label: 'Sun', value: sun });
        if (moon) sky.push({ glyph: '☽', label: 'Moon', value: moon });
        if (rising) sky.push({ glyph: '↑', label: 'Rising', value: rising });
        if (sun) {
            sky.push({ glyph: '✸', label: 'Element', value: natalElement(sun) });
            sky.push({ glyph: '◇', label: 'Modality', value: natalModality(sun) });
            sky.push({ glyph: '☯', label: 'Polarity', value: natalPolarity(sun) });
            sky.push({ glyph: '♄', label: 'Ruler', value: natalRuler(sun) });
        }
        if (sun && moon) {
            const h = natalHarmony(sun, moon);
            sky.push({ glyph: '⚭', label: 'Sun · Moon', value: h, rare: h === 'Harmonious' });
        }
        groups.push({ key: 'sky', label: 'Sky', tiles: sky });
    }

    /* ── Almanac (mint moment) ────────────────────────────────────────── */
    if (mintMs != null) {
        const alm: AttrTile[] = [];
        /* ✶ is PriceDay's established mark (the search-answer precedent, GLYPHS
           §12). Was ☀ — a glyph the glossary bans outright because iOS renders
           it in colour no matter what we do to it. */
        if (traits.PriceDay) alm.push({ glyph: '✶', label: 'PriceDay', value: traits.PriceDay.replace(/^PriceDay\s*/, '') });
        alm.push({ glyph: '✲', label: 'Weekday', value: birthWeekday(mintMs) });
        alm.push({ glyph: '◷', label: 'Born', value: birthTimeOfDay(mintMs) });
        alm.push({ glyph: '❅', label: 'Season', value: birthSeason(mintMs) });
        alm.push({
            glyph: lunarGlyph(mintMs), label: 'Lunar Phase', value: lunarPhase(mintMs),
            sub: `${Math.round(lunarIllumination(mintMs) * 100)}% lit`,
        });
        /* Mint order + speed — "3rd mint · 2 min after launch" — from the
           edition's REAL mint clock (✦ is the canonical mint glyph). */
        const mo = edition ? mintOrderOf(edition, id) : null;
        if (mo) {
            alm.push({
                glyph: '✦', label: 'Mint Order', value: `${ordinal(mo.order)} mint`,
                sub: mo.order === 1 ? 'opened the mint' : `${humanizeDelta(mo.sinceLaunchMs)} after launch`,
                rare: mo.order === 1,
            });
        }
        groups.push({ key: 'almanac', label: 'Almanac', tiles: alm });
    }

    /* ── Oracle (Fate / I Ching) ──────────────────────────────────────── */
    const fd = fateDetail(slug, id);
    const oracle: AttrTile[] = [
        { glyph: fd.glyph, label: 'Fate', value: fd.fate },
        { glyph: '䷀', label: 'Hexagram', value: `#${fd.hexagram} · ${fd.hexagramName}` },
        { glyph: fd.upperGlyph, label: 'Upper Trigram', value: fd.upper },
        { glyph: fd.lowerGlyph, label: 'Lower Trigram', value: fd.lower },
    ];
    if (fd.stable) {
        oracle.push({ glyph: '◉', label: 'Reading', value: 'Stable', sub: 'no changing lines', rare: true });
    } else {
        oracle.push({ glyph: '⚊', label: 'Changing Lines', value: String(fd.changingCount), sub: `at ${fd.changingLines.join(', ')}` });
        if (fd.transformed) oracle.push({ glyph: '⇄', label: 'Becomes', value: fd.transformed });
    }
    groups.push({ key: 'oracle', label: 'Oracle', tiles: oracle });

    /* ── Rarity (deterministic edition-set tally) ─────────────────────── */
    const rarity: AttrTile[] = [];
    const pt = primaryTrait(slug, id);
    let tf: Freq | null = null;
    if (pt) {
        tf = traitRarity(slug, pt.name, pt.value);
        rarity.push({
            glyph: '◆', label: pt.name, value: pt.cls ? `${pt.value} · ${pt.cls}` : pt.value,
            sub: tf ? rareBlurb(tf) : undefined, rare: tf?.rank === 1,
        });
    }
    const ff = fateRarity(slug, fd.fate);
    if (ff) rarity.push({ glyph: '☯', label: 'Fate Rarity', value: pct(ff.pct), sub: rareBlurb(ff), rare: ff.rank === 1 });
    const cf = bucket ? colorRarity(slug, bucket) : null;
    if (cf) rarity.push({ glyph: '◉', label: 'Colour Rarity', value: pct(cf.pct), sub: rareBlurb(cf), rare: cf.rank === 1 });
    /* Genome isolation — how spatially alone this piece sits in the edition
       set (lib/output/genome), the ◎ read. */
    const iso = outputIsolation(slug, id);
    if (iso) {
        rarity.push({
            glyph: '◎', label: 'Isolation', value: `${iso.score} / 100`,
            sub: iso.oneOfOne
                ? `#${iso.rank} of ${iso.total} · none alike`
                : `#${iso.rank} of ${iso.total} · ${iso.twins} alike`,
            rare: iso.oneOfOne || iso.score >= 70,
        });
    }
    /* Closest Sibling — the piece's nearest genome kin ("closest sibling:
       #88"), straight from the same parameter space the Genome map plots. */
    const kin = nearestKin(slug, id, 1);
    const sib = kin?.kin[0];
    if (sib && kin) {
        rarity.push({
            glyph: '≍', label: 'Closest Sibling', value: `#${sib.id}`,
            sub: sib.distance === 0
                ? 'an exact twin — same full combination'
                : `alike on ${sib.shared} of ${kin.axes} axes`,
            rare: sib.distance === 0,
        });
    }
    /* PD Rarity — the headline: provable art-rarity (trait/Fate/colour) folded
       WITH the genome isolation into one 0–100 read. Leads the group; ❖ is the
       sitewide rarity glyph. */
    const overall = overallRarity([tf, ff, cf]);
    if (overall || iso) {
        const scores: number[] = [];
        if (overall) scores.push(overall.score);
        if (iso) scores.push(iso.score);
        const headline = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        /* The RANK across the whole edition set — "#3 rarest of 105". We
           always computed rarity; now it says where the piece STANDS. */
        const rr = pdRarityRank(slug, id);
        /* POP + NONE HIGHER ride the headline tile (Rarity Labs, 2026-07-26):
           POP n = the piece's smallest-club axis count; rank #1 reads NONE
           HIGHER instead of its rank line. */
        const pop = popCount(slug, id);
        const popBit = pop != null ? ` · POP ${pop}` : '';
        rarity.unshift({
            glyph: '❖', label: 'PD Rarity', value: `${headline} / 100`,
            sub: rr
                ? rr.rank === 1
                    ? `NONE HIGHER · of ${rr.total}${popBit}`
                    : `#${rr.rank} rarest of ${rr.total}${popBit}`
                : overall && iso ? 'trait + genome' : overall ? 'trait-based' : 'genome-based',
            rare: headline >= 70 || (rr != null && rr.rank <= Math.max(1, Math.round(rr.total * 0.05))),
        });
    }
    /* Hand — the conviction / diamond-hands read (the ⌂ holder glyph). Every
       minted piece has a real hold story, so this always resolves. */
    if (hand) {
        const bits: string[] = [`${hand.holdDays}d held`];
        bits.push(hand.neverSold ? 'never sold' : `${hand.flips} flip${hand.flips === 1 ? '' : 's'}`);
        if (hand.neverListed) bits.push('never listed');
        rarity.push({
            glyph: '⌂', label: 'Hands', value: hand.tier, sub: bits.join(' · '),
            rare: hand.tier === 'Original' || hand.tier === 'Diamond',
        });
    }
    /* Attention — pledges routed through this piece (anointing ✢). Only shown
       when it actually carries attention; a plain 0 is just the default. */
    if (attention && attention.votes > 0) {
        rarity.push({
            glyph: '✢', label: 'Attention', value: String(attention.votes),
            sub: 'pledged through it', rare: true,
        });
    }
    if (rarity.length) groups.push({ key: 'rarity', label: 'Rarity', tiles: rarity });

    /* ── Lab ──────────────────────────────────────────────────────────────
       Entropy Visualizer — a 16×16 black/white barcode unique to this piece,
       derived from a hash of its identity (Brendon, 2026-06-24). */
    groups.push({
        key: 'lab',
        label: 'Lab',
        tiles: [
            {
                glyph: '▩', label: 'Entropy Visualizer', value: '',
                sub: '16×16 hash barcode', grid: entropyGrid(slug, id),
            },
        ],
    });

    return groups;
}
