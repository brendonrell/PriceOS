/*
 * collectionAnalysis — a graduated PROJECT's aggregate "character sheet": the
 * same shape as an Output's (lib/output/attributes), but read across the whole
 * minted set instead of one piece (Brendon, 2026-06-25). A project graduates at
 * 18 mints; from then on its Attributes tab gains a Form (collection averages),
 * a Palette spectrum, a Spread (trait / fate / rarest + most-average piece) and
 * a Collective Fingerprint, layered onto the existing project attributes.
 *
 * Split of duties:
 *   - The DETERMINISTIC half (trait / fate spread, rarest + most-average piece,
 *     the collective entropy barcode) is pure — derived from (slug, id) for the
 *     minted range, no pixels. Lives here.
 *   - The SAMPLED half (palette mix, brightness / saturation / complexity
 *     averages) needs real rendered pixels and is resolved client-side
 *     (CollectionAttributes), then handed to buildCollectionGroups as input.
 */

import type { AttrGroup, AttrTile } from '../output/attributes';
import { buildProjectAttributes } from './projectAttributes';
import { primaryTrait, traitRarity, fateRarity, colorRarity, overallRarity, type Freq } from '../output/rarity';
import { fateDetail, brightnessBand, saturationBand, complexityBand, toneMood, colorTemperature, BUCKET_HEX } from '../output/derive';
import { outputColorBucket } from '../art/outputColor';
import { entropyGrid, ENTROPY_CELLS } from '../output/entropyGlyph';

/** How many of the lowest editions a fresh graduate renders ON DEMAND so its
    portrait is complete the moment it graduates (Brendon, 2026-06-25). Beyond
    this, fingerprints fill in the existing lazy way as the gallery is browsed. */
export const COLLECTION_FORCE_SAMPLE = 22;

export interface SpreadValue { value: string; count: number; pct: number; }

export interface CollectionSpread {
    /** Primary artist-trait split (e.g. Palette), or null if the project has none. */
    trait: { name: string; top: SpreadValue; rarest: SpreadValue; distinct: number } | null;
    /** Fate split across the minted set. */
    fate: { top: SpreadValue; rarest: SpreadValue; distinct: number };
    /** Minted edition with the highest overall rarity score (1..100). */
    rarest: { id: number; score: number } | null;
    /** Minted edition closest to the project's average (lowest rarity score). */
    average: { id: number; score: number } | null;
    /** 16×16 majority-vote barcode across every minted piece's entropy glyph. */
    collectiveGrid: boolean[];
}

function topAndRarest(tally: Map<string, number>, total: number): { top: SpreadValue; rarest: SpreadValue; distinct: number } {
    let top: SpreadValue = { value: '—', count: 0, pct: 0 };
    let rarest: SpreadValue = { value: '—', count: Infinity, pct: 0 };
    for (const [value, count] of tally) {
        if (count > top.count) top = { value, count, pct: count / total };
        if (count < rarest.count) rarest = { value, count, pct: count / total };
    }
    if (!isFinite(rarest.count)) rarest = { ...top };
    return { top, rarest, distinct: tally.size };
}

/** Per-edition overall rarity score, reusing the same axes as the Output panel. */
function rarityScore(slug: string, id: number): number {
    const pt = primaryTrait(slug, id);
    const tf: Freq | null = pt ? traitRarity(slug, pt.name, pt.value) : null;
    const ff = fateRarity(slug, fateDetail(slug, id).fate);
    const bucket = outputColorBucket(slug, id);
    const cf = bucket ? colorRarity(slug, bucket) : null;
    return overallRarity([tf, ff, cf])?.score ?? 0;
}

/** The deterministic half — tallies + standouts + the collective barcode across
    the minted range 1..mintedCount. Pure; safe to memoise on (slug, mintedCount). */
export function computeCollectionSpread(slug: string, mintedCount: number): CollectionSpread {
    const total = Math.max(0, mintedCount);

    const traitTally = new Map<string, number>();
    const fateTally = new Map<string, number>();
    const cellOn = new Int32Array(ENTROPY_CELLS);
    let traitName: string | null = null;
    let rarest: { id: number; score: number } | null = null;
    let average: { id: number; score: number } | null = null;

    for (let id = 1; id <= total; id++) {
        const pt = primaryTrait(slug, id);
        if (pt) {
            traitName = pt.name;
            traitTally.set(pt.value, (traitTally.get(pt.value) ?? 0) + 1);
        }
        const fate = fateDetail(slug, id).fate;
        fateTally.set(fate, (fateTally.get(fate) ?? 0) + 1);

        const grid = entropyGrid(slug, id);
        for (let i = 0; i < ENTROPY_CELLS; i++) if (grid[i]) cellOn[i] += 1;

        const score = rarityScore(slug, id);
        if (!rarest || score > rarest.score) rarest = { id, score };
        if (!average || score < average.score) average = { id, score };
    }

    const collectiveGrid: boolean[] = new Array(ENTROPY_CELLS);
    for (let i = 0; i < ENTROPY_CELLS; i++) collectiveGrid[i] = cellOn[i] * 2 >= total;

    return {
        trait: traitName ? { name: traitName, ...topAndRarest(traitTally, total) } : null,
        fate: topAndRarest(fateTally, total),
        rarest,
        average,
        collectiveGrid,
    };
}

export interface CollectionInput {
    slug: string;
    mintedCount: number;
    maxSupply: number;
    uploadedAt: number | null;
    /** Colour-bucket counts across the minted set (resolved client-side), desc. */
    palette: { bucket: string; count: number }[];
    /** Most common bucket, or null when no piece resolves a colour. */
    dominantBucket: string | null;
    /** Sampled averages (0..1) + how many editions contributed each. */
    form: { brightness: number | null; saturation: number | null; complexity: number | null; sampleN: number };
    spread: CollectionSpread;
}

const pct = (p: number): string => (p >= 0.1 ? `${Math.round(p * 100)}%` : `${(p * 100).toFixed(1)}%`);

/**
 * The full ordered group list for a GRADUATED project: the existing project
 * attributes, woven with the new collection groups in the same order an Output
 * uses (Identity → Form → Palette → Sky → Almanac → Oracle → Spread → Lab). The
 * Collective Fingerprint joins the existing Lab group, exactly as an Output's
 * Entropy Visualizer does.
 */
export function buildCollectionGroups(input: CollectionInput): AttrGroup[] {
    const { slug, mintedCount, maxSupply, uploadedAt, palette, dominantBucket, form, spread } = input;
    const base = buildProjectAttributes(slug, uploadedAt, { mintedCount, maxSupply });
    const byKey = (k: string) => base.find((g) => g.key === k);

    /* ── Form (collection averages — mirrors the Output Form group) ─────── */
    const formTiles: AttrTile[] = [];
    if (dominantBucket) {
        formTiles.push({ glyph: '◉', label: 'Dominant Colour', value: dominantBucket, swatch: BUCKET_HEX[dominantBucket] });
        formTiles.push({ glyph: '✦', label: 'Temperature', value: colorTemperature(dominantBucket) });
    }
    const sampleSub = form.sampleN ? `avg of ${form.sampleN} sampled` : undefined;
    if (form.brightness != null) formTiles.push({ glyph: '◐', label: 'Brightness', value: brightnessBand(form.brightness), sub: `${pct(form.brightness)}${sampleSub ? ` · ${sampleSub}` : ''}` });
    if (form.saturation != null) formTiles.push({ glyph: '❖', label: 'Saturation', value: saturationBand(form.saturation), sub: pct(form.saturation) });
    if (form.complexity != null) formTiles.push({ glyph: '⌗', label: 'Complexity', value: complexityBand(form.complexity), sub: pct(form.complexity) });
    if (form.brightness != null && form.saturation != null) formTiles.push({ glyph: '◕', label: 'Tone', value: toneMood(form.brightness, form.saturation) });

    /* ── Palette (the collection's colour mix as one weighted strip) ────── */
    const paletteTiles: AttrTile[] = [];
    if (palette.length) {
        paletteTiles.push({
            glyph: '◭', label: 'Palette', value: `${palette.length} colour${palette.length === 1 ? '' : 's'}`,
            sub: palette.slice(0, 3).map((p) => `${p.bucket} ${p.count}`).join(' · '),
            spectrum: palette.map((p) => ({ hex: BUCKET_HEX[p.bucket] ?? '#888', weight: p.count })),
        });
    }

    /* ── Spread (trait / fate split + standout pieces — mirrors Rarity) ─── */
    const spreadTiles: AttrTile[] = [];
    if (spread.trait) {
        spreadTiles.push({ glyph: '◆', label: spread.trait.name, value: spread.trait.top.value, sub: `most common · ${spread.trait.top.count} of ${mintedCount}` });
        if (spread.trait.rarest.value !== spread.trait.top.value) {
            spreadTiles.push({ glyph: '◇', label: `Rarest ${spread.trait.name}`, value: spread.trait.rarest.value, sub: `${spread.trait.rarest.count} of ${mintedCount} · ${pct(spread.trait.rarest.pct)}`, rare: true });
        }
    }
    spreadTiles.push({ glyph: '☯', label: 'Top Fate', value: spread.fate.top.value, sub: `${spread.fate.top.count} of ${mintedCount} · ${spread.fate.distinct} fates` });
    if (spread.fate.rarest.value !== spread.fate.top.value) {
        spreadTiles.push({ glyph: '⚊', label: 'Rarest Fate', value: spread.fate.rarest.value, sub: `${spread.fate.rarest.count} of ${mintedCount}`, rare: true });
    }
    if (spread.rarest) spreadTiles.push({ glyph: '❂', label: 'Rarest Piece', value: `#${spread.rarest.id}`, sub: `score ${spread.rarest.score} / 100`, rare: true });
    if (spread.average) spreadTiles.push({ glyph: '◎', label: 'Most Average', value: `#${spread.average.id}`, sub: `score ${spread.average.score} / 100` });

    /* ── Lab (graft the Collective Fingerprint beside Golf Score) ───────── */
    const labBase = byKey('lab');
    const labTiles: AttrTile[] = [
        ...(labBase?.tiles ?? []),
        { glyph: '▩', label: 'Collective Fingerprint', value: '', sub: `majority of ${mintedCount} pieces`, grid: spread.collectiveGrid },
    ];

    const groups: AttrGroup[] = [];
    const push = (g?: AttrGroup) => { if (g) groups.push(g); };
    push(byKey('identity'));
    push(byKey('milestones'));
    if (formTiles.length) groups.push({ key: 'cform', label: 'Form', tiles: formTiles });
    if (paletteTiles.length) groups.push({ key: 'cpalette', label: 'Palette', tiles: paletteTiles });
    push(byKey('sky'));
    push(byKey('almanac'));
    push(byKey('oracle'));
    groups.push({ key: 'cspread', label: 'Spread', tiles: spreadTiles });
    groups.push({ key: 'lab', label: 'Lab', tiles: labTiles });
    return groups;
}
