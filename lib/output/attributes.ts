/*
 * buildOutputAttributes — assembles an Output's full "character sheet": every
 * attribute we capture, grouped for display. Pure + deterministic; computes the
 * derivations live (lib/output/derive) and edition-set rarity (lib/output/rarity)
 * so the panel is fully populated even before a row is backfilled. The capture
 * routes persist the SAME values to `outputs`.
 */

import { getProject } from '../project/registry';
import { outputColorBucket } from '../art/outputColor';
import {
    natalElement, natalModality, natalPolarity, natalRuler, natalHarmony,
    birthWeekday, birthTimeOfDay, birthSeason, lunarPhase, lunarGlyph, lunarIllumination,
    fateDetail, brightnessBand, saturationBand, complexityBand, toneMood,
    colorTemperature, orientationOf, BUCKET_HEX,
    paletteBand, contrastBand, warmthBand, symmetryBand, airBand, textureBand, gravityWord,
} from './derive';
import { primaryTrait, traitRarity, fateRarity, colorRarity, overallRarity, type Freq } from './rarity';
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
    } | null;
    /** The Output true name (project glyphs + id). */
    trueName: string;
}

const pct = (p: number): string => (p >= 0.1 ? `${Math.round(p * 100)}%` : `${(p * 100).toFixed(1)}%`);
const rareBlurb = (f: Freq): string =>
    `${f.count} of ${f.total} · ${pct(f.pct)}${f.rank === 1 ? ' · rarest' : ''}`;

export function buildOutputAttributes(input: AttrInput): AttrGroup[] {
    const { slug, id, mintMs, traits, fingerprint, trueName } = input;
    const project = getProject(slug);
    const supply = project?.outputs ?? null;
    const groups: AttrGroup[] = [];

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
            sub: warmth != null ? `${pct(warmth)} warm` : undefined,
        });
    }
    const br = fingerprint?.brightness, sa = fingerprint?.saturation, cx = fingerprint?.complexity;
    if (br != null) form.push({ glyph: '◐', label: 'Brightness', value: brightnessBand(br), sub: pct(br) });
    if (sa != null) form.push({ glyph: '❖', label: 'Saturation', value: saturationBand(sa), sub: pct(sa) });
    const contrast = fingerprint?.contrast;
    if (contrast != null) form.push({ glyph: '◨', label: 'Contrast', value: contrastBand(contrast), sub: pct(contrast) });
    if (br != null && sa != null) form.push({ glyph: '◕', label: 'Tone', value: toneMood(br, sa) });
    if (cx != null) form.push({ glyph: '⌗', label: 'Complexity', value: complexityBand(cx), sub: pct(cx) });
    const texture = fingerprint?.texture;
    if (texture != null) form.push({ glyph: '▒', label: 'Texture', value: textureBand(texture), sub: pct(texture) });
    const air = fingerprint?.air;
    if (air != null) form.push({ glyph: '◌', label: 'Air', value: airBand(air), sub: pct(air) });
    const gravity = fingerprint?.gravity;
    if (gravity) form.push({ glyph: '◒', label: 'Gravity', value: gravityWord(gravity) });
    const symmetry = fingerprint?.symmetry;
    if (symmetry != null) form.push({ glyph: '◫', label: 'Symmetry', value: symmetryBand(symmetry), sub: pct(symmetry) });
    const orient = orientationOf(fingerprint?.aspect ?? null);
    if (orient) form.push({ glyph: '▭', label: 'Orientation', value: orient });
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
        if (traits.PriceDay) alm.push({ glyph: '☀', label: 'PriceDay', value: traits.PriceDay.replace(/^PriceDay\s*/, '') });
        alm.push({ glyph: '✲', label: 'Weekday', value: birthWeekday(mintMs) });
        alm.push({ glyph: '◷', label: 'Born', value: birthTimeOfDay(mintMs) });
        alm.push({ glyph: '❅', label: 'Season', value: birthSeason(mintMs) });
        alm.push({
            glyph: lunarGlyph(mintMs), label: 'Lunar Phase', value: lunarPhase(mintMs),
            sub: `${Math.round(lunarIllumination(mintMs) * 100)}% lit`,
        });
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
    const overall = overallRarity([tf, ff, cf]);
    if (overall) rarity.push({ glyph: '❂', label: 'Rarity Score', value: `${overall.score} / 100`, sub: `${overall.bits.toFixed(1)} bits`, rare: overall.score >= 70 });
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
