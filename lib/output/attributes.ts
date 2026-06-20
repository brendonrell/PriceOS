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
} from './derive';
import { primaryTrait, traitRarity, fateRarity, colorRarity, overallRarity, type Freq } from './rarity';

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
    /** Stored visual fingerprint (sampled pixels), or null. */
    fingerprint: {
        dominant_color: string | null; aspect: string | null;
        brightness: number | null; saturation: number | null; complexity: number | null;
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
        if (project.mintPriceEth != null) identity.push({ glyph: '⟠', label: 'Mint Price', value: `${project.mintPriceEth} ETH` });
        if (project.colorway) identity.push({ glyph: '◉', label: 'Colorway', value: project.colorway.toUpperCase(), swatch: project.colorway });
        if (project.soundtrack) identity.push({ glyph: '♫', label: 'Soundtrack', value: project.soundtrack.label });
    }
    groups.push({ key: 'identity', label: 'Identity', tiles: identity });

    /* ── Form (sampled fingerprint) ───────────────────────────────────── */
    const form: AttrTile[] = [];
    const bucket = fingerprint?.dominant_color ?? outputColorBucket(slug, id) ?? null;
    if (bucket) {
        form.push({ glyph: '◉', label: 'Dominant Colour', value: bucket, swatch: BUCKET_HEX[bucket] });
        form.push({ glyph: '✦', label: 'Temperature', value: colorTemperature(bucket) });
    }
    const orient = orientationOf(fingerprint?.aspect ?? null);
    if (orient) form.push({ glyph: '▭', label: 'Orientation', value: orient });
    const br = fingerprint?.brightness, sa = fingerprint?.saturation, cx = fingerprint?.complexity;
    if (br != null) form.push({ glyph: '◐', label: 'Brightness', value: brightnessBand(br), sub: pct(br) });
    if (sa != null) form.push({ glyph: '❖', label: 'Saturation', value: saturationBand(sa), sub: pct(sa) });
    if (cx != null) form.push({ glyph: '⌗', label: 'Complexity', value: complexityBand(cx), sub: pct(cx) });
    if (br != null && sa != null) form.push({ glyph: '◕', label: 'Tone', value: toneMood(br, sa) });
    if (form.length) groups.push({ key: 'form', label: 'Form', tiles: form });

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

    return groups;
}
