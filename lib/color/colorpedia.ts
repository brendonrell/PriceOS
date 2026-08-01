/*
 * lib/color/colorpedia — the lookup layer.
 *
 * Two jobs:
 *   1. SNAP — take any colour at all (a project's custom colorway, a hex pulled
 *      off a piece of art) and find its nearest neighbour in the baked
 *      vocabulary by perceptual distance. The result carries the distance, so
 *      the panel can be honest about whether the name is exact or merely close.
 *   2. SEARCH — one field that understands the ways people actually name a
 *      colour: a word, a hex, RGB numbers, CMYK numbers, HSL numbers.
 *
 * Nothing here generates anything. Every name and every note comes from the
 * fixed vocabulary; every number comes from the exact maths in ./convert.
 */

import {
    normalizeHex, hexToRgb, rgbToHex, rgbToLab, deltaE2000, rgbToHsl, rgbToCmyk,
    cmykToRgb, hslToRgb, hueFamily, type Lab,
} from './convert';
import { NAMED_COLORS, type NamedColor } from './vocabulary';

/** A vocabulary entry with its LAB precomputed — built once, at module load. */
interface IndexedColor extends NamedColor { lab: Lab }

const INDEX: IndexedColor[] = NAMED_COLORS.map((c) => ({
    ...c,
    hex: normalizeHex(c.hex) ?? c.hex,
    lab: rgbToLab(hexToRgb(c.hex)),
}));

export interface ColorMatch {
    /** The named colour we landed on. */
    color: NamedColor;
    /** Perceptual distance from the queried colour. 0 = the exact same colour. */
    delta: number;
    /** True when the query IS this colour, hex for hex. */
    exact: boolean;
}

/** ΔE bands, in the language the panel speaks. Below ~1 the eye cannot tell
 *  two colours apart at all; by ~10 they are plainly different colours. */
export function matchWord(delta: number): string {
    if (delta < 0.5) return 'exact match';
    if (delta < 2) return 'indistinguishable';
    if (delta < 5) return 'very close';
    if (delta < 10) return 'close';
    if (delta < 20) return 'in the neighbourhood';
    return 'the nearest we have';
}

/** Snap any colour to its nearest named neighbour. */
export function nearestNamed(hex: string): ColorMatch | null {
    const norm = normalizeHex(hex);
    if (!norm) return null;
    const lab = rgbToLab(hexToRgb(norm));
    let best: IndexedColor | null = null;
    let bestD = Infinity;
    for (const c of INDEX) {
        const d = deltaE2000(lab, c.lab);
        if (d < bestD) { bestD = d; best = c; }
    }
    if (!best) return null;
    const { lab: _drop, ...color } = best;
    return { color, delta: bestD, exact: best.hex === norm };
}

/** The named colours sitting closest to this one — its neighbours on the shelf. */
export function neighbours(hex: string, count = 6): ColorMatch[] {
    const norm = normalizeHex(hex);
    if (!norm) return [];
    const lab = rgbToLab(hexToRgb(norm));
    return INDEX
        .map((c) => {
            const { lab: _drop, ...color } = c;
            return { color, delta: deltaE2000(lab, c.lab), exact: c.hex === norm };
        })
        .sort((a, b) => a.delta - b.delta)
        .slice(0, count);
}

/* ── Query parsing — the search bar's understanding ───────────────────── */

export type QueryKind = 'hex' | 'rgb' | 'cmyk' | 'hsl' | 'name' | 'empty';

export interface ParsedQuery {
    kind: QueryKind;
    /** The colour the query resolves to, when it resolves to one. */
    hex?: string;
    /** How the input was read back — shown so the user sees what we understood. */
    read?: string;
}

const NUMS = /-?\d+(?:\.\d+)?/g;

/** Read a typed query as a colour, or as a name to search for.
 *  Accepts: `#f00` · `ff0000` · `rgb(255,0,0)` · `255 0 0` ·
 *  `cmyk(0,100,100,0)` · four bare numbers · `hsl(0,100%,50%)` · `0deg 100% 50%`. */
export function parseQuery(raw: string): ParsedQuery {
    const q = raw.trim();
    if (!q) return { kind: 'empty' };

    /* HEX — with or without the #, 3 or 6 digits. */
    const asHex = normalizeHex(q);
    if (asHex) return { kind: 'hex', hex: asHex, read: asHex };

    const lower = q.toLowerCase();
    const nums = (lower.match(NUMS) ?? []).map(Number);
    const tagged = /^(rgb|cmyk|hsl|hsv|hsb)\b/.exec(lower)?.[1];

    /* CMYK — tagged, or four bare numbers (nothing else takes four). */
    if ((tagged === 'cmyk' && nums.length >= 4) || (!tagged && nums.length === 4)) {
        const [c, m, y, k] = nums;
        if ([c, m, y, k].every((n) => n >= 0 && n <= 100)) {
            const hex = rgbToHex(cmykToRgb({ c, m, y, k }));
            return { kind: 'cmyk', hex, read: `CMYK ${Math.round(c)}, ${Math.round(m)}, ${Math.round(y)}, ${Math.round(k)}` };
        }
    }

    /* HSL / HSV — tagged, or three numbers where the last two carry a % sign. */
    const pctCount = (lower.match(/%/g) ?? []).length;
    if (nums.length >= 3 && (tagged === 'hsl' || tagged === 'hsv' || tagged === 'hsb' || (!tagged && pctCount >= 2))) {
        const [h, s, l] = nums;
        if (h >= 0 && h <= 360 && s >= 0 && s <= 100 && l >= 0 && l <= 100) {
            const hex = rgbToHex(hslToRgb({ h, s, l }));
            return { kind: 'hsl', hex, read: `HSL ${Math.round(h)}°, ${Math.round(s)}%, ${Math.round(l)}%` };
        }
    }

    /* RGB — tagged, or three bare 0–255 numbers. */
    if (nums.length >= 3 && (tagged === 'rgb' || !tagged)) {
        const [r, g, b] = nums;
        if ([r, g, b].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
            const hex = rgbToHex({ r, g, b });
            return { kind: 'rgb', hex, read: `RGB ${r}, ${g}, ${b}` };
        }
    }

    return { kind: 'name' };
}

export interface SearchHit {
    color: NamedColor;
    /** Set when the query was a colour rather than a word — how far this sits. */
    delta?: number;
}

/** Search the vocabulary. A word matches names, aliases and origin; a colour
 *  (hex / RGB / CMYK / HSL) returns the vocabulary sorted by how near it sits. */
export function searchColors(raw: string, limit = 40): { parsed: ParsedQuery; hits: SearchHit[] } {
    const parsed = parseQuery(raw);

    if (parsed.kind === 'empty') return { parsed, hits: [] };

    if (parsed.hex) {
        const hits = neighbours(parsed.hex, limit).map((m) => ({ color: m.color, delta: m.delta }));
        return { parsed, hits };
    }

    const q = raw.trim().toLowerCase();
    const scored: { hit: SearchHit; score: number }[] = [];
    for (const c of INDEX) {
        const name = c.name.toLowerCase();
        const inAlt = c.alt?.some((a) => a.toLowerCase().includes(q)) ?? false;
        let score = -1;
        if (name === q) score = 0;
        else if (name.startsWith(q)) score = 1;
        else if (name.includes(q)) score = 2;
        else if (inAlt) score = 3;
        else if (c.origin.toLowerCase() === q) score = 4;
        else if (hueFamily(c.hex).toLowerCase() === q) score = 5;
        else if (c.note?.toLowerCase().includes(q)) score = 6;
        if (score < 0) continue;
        const { lab: _drop, ...color } = c;
        scored.push({ hit: { color }, score });
    }
    scored.sort((a, b) => a.score - b.score || a.hit.color.name.localeCompare(b.hit.color.name));
    return { parsed, hits: scored.slice(0, limit).map((s) => s.hit) };
}

/* ── The full read for one colour ─────────────────────────────────────── */

export interface ColorReading {
    hex: string;
    match: ColorMatch | null;
    family: string;
}

export function readColor(hex: string): ColorReading | null {
    const norm = normalizeHex(hex);
    if (!norm) return null;
    return { hex: norm, match: nearestNamed(norm), family: hueFamily(norm) };
}

/** Convenience — the copy-ready strings for one colour, in one call. */
export function formatsOf(hex: string) {
    const rgb = hexToRgb(hex);
    return { rgb, hsl: rgbToHsl(rgb), cmyk: rgbToCmyk(rgb) };
}
