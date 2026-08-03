'use client';

/*
 * heroPrefs — how YOUR stickers arrange on your hero. Set in the manager modal,
 * read by HeroStickers. Local prefs (device), persisted; the generative seed
 * drives the scattered layouts and the Shuffle button.
 */

import { useEffect, useMemo, useState } from 'react';
import type { Sticker } from './catalog';
import { pushStickerState } from './owned';

export type Arrange = 'row' | 'spread' | 'scatter' | 'fill' | 'stack' | 'collage' | 'slapped';
export type Tilt = 'flat' | 'soft' | 'jaunty';
export type Rows = 1 | 2 | 3;
export type Align = 'left' | 'center' | 'right';
/** Die-cut border weight for placed stickers (the kiss-cut white edge). */
export type Border = 'off' | 'white' | 'bold';

export const ALIGNS: { id: Align; label: string }[] = [
    { id: 'left', label: 'LEFT' },
    { id: 'center', label: 'CENTER' },
    { id: 'right', label: 'RIGHT' },
];

export const ARRANGES: { id: Arrange; label: string }[] = [
    /* Labelled SPACED, not "SPREAD" — SPREADS are the saved arrangements on
       their own page, and two things called the same word in one menu is a
       trap (Brendon, 2026-07-27). The stored id stays `spread` so every saved
       Setup Code and every existing profile keeps working. */
    { id: 'spread', label: 'SPACED' },
    { id: 'row', label: 'ROW' },
    { id: 'stack', label: 'STACK' },
    { id: 'scatter', label: 'SCATTER' },
    { id: 'fill', label: 'FILL' },
    { id: 'collage', label: 'COLLAGE' },
    { id: 'slapped', label: 'SLAPPED' },
];
export const ROW_OPTS: { id: Rows; label: string }[] = [
    { id: 1, label: '1' },
    { id: 2, label: '2' },
    { id: 3, label: '3' },
];
export const TILTS: { id: Tilt; label: string }[] = [
    { id: 'flat', label: 'FLAT' },
    { id: 'soft', label: 'SOFT' },
    { id: 'jaunty', label: 'JAUNTY' },
];
export const BORDERS: { id: Border; label: string }[] = [
    { id: 'off', label: 'OFF' },
    { id: 'white', label: 'WHITE' },
    { id: 'bold', label: 'BOLD' },
];
/* DENSITY — how packed the STACK pile is. MAX is the densest pile (the one
   previously asked for, kept as the most-extreme). Three options so the row of
   buttons fits on one line. */
export const DENSITIES: { id: number; label: string }[] = [
    { id: 0, label: 'LOW' },
    { id: 1, label: 'MED' },
    { id: 2, label: 'MAX' },
];
const DENSITY_COUNTS = [6, 10, 14];

const K_ARRANGE = 'pd_sticker_arrange';
const K_TILT = 'pd_sticker_tilt';
const K_SEED = 'pd_sticker_seed';
const K_EXPAND = 'pd_sticker_expand';
const K_ROWS = 'pd_sticker_rows';
const K_ALIGN = 'pd_sticker_align';
const K_FLIP = 'pd_sticker_flip';
const K_DENSITY = 'pd_sticker_density';
const K_BORDER = 'pd_sticker_border';
const EVT = 'pd:stickers-changed';

/** Every look key, for the manager's draft snapshot (see lib/stickers/draft). */
export const HERO_PREF_KEYS = [
    K_ARRANGE, K_TILT, K_SEED, K_EXPAND, K_ROWS, K_ALIGN, K_FLIP, K_DENSITY, K_BORDER,
] as const;

function read(key: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback;
    try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function write(key: string, val: string) {
    try { window.localStorage.setItem(key, val); } catch { /* ignore */ }
    /* ⛔ AND IT GOES TO THE ACCOUNT (Brendon, 2026-08-01). Changing the look
       used to touch the device and nothing else — the one part of a decorated
       profile with no copy anywhere else. Same writer as ownership and the
       hand-placed spots, so it obeys the manager's draft gate: nothing is
       published until SAVE, and a discarded look never lands. */
    pushStickerState();
    window.dispatchEvent(new CustomEvent(EVT));
}

export function setArrange(a: Arrange) { write(K_ARRANGE, a); }
export function setTilt(t: Tilt) { write(K_TILT, t); }
export function setExpand(b: boolean) { write(K_EXPAND, b ? '1' : '0'); }
export function setRows(r: Rows) { write(K_ROWS, String(r)); }
export function setAlign(a: Align) { write(K_ALIGN, a); }
export function setFlip(b: boolean) { write(K_FLIP, b ? '1' : '0'); }
export function setBorder(b: Border) { write(K_BORDER, b); }
export function getBorder(): Border { return read(K_BORDER, 'off') as Border; }
export function shuffleSeed() { write(K_SEED, String((Math.random() * 1e9) | 0)); }
/* The seed is part of a saved look: the Setup Code carries it so a code brings
   back the EXACT picture (Brendon, 2026-07-10 — looks were unrecoverable). */
export function setSeed(n: number) { write(K_SEED, String((n >>> 0) || 1)); }
export function getSeed(): number { return Number(read(K_SEED, '1')) || 1; }
/** STACK pile density (0 = LOW … 2 = MAX). Picked from the Density chips. */
export function setDensity(d: number) { write(K_DENSITY, String(d)); }
export function getDensity(): number {
    const v = parseInt(read(K_DENSITY, '0'), 10);
    return Number.isFinite(v) ? Math.max(0, Math.min(DENSITIES.length - 1, v)) : 0;
}

/* Non-reactive reads — for the manager, which holds its own local copy. */
export function getArrange(): Arrange { return read(K_ARRANGE, 'spread') as Arrange; }
export function getTilt(): Tilt { return read(K_TILT, 'soft') as Tilt; }
export function getExpand(): boolean { return read(K_EXPAND, '0') === '1'; }
export function getRows(): Rows { const v = read(K_ROWS, '1'); return v === '3' ? 3 : v === '2' ? 2 : 1; }
export function getAlign(): Align { return read(K_ALIGN, 'left') as Align; }
export function getFlip(): boolean { return read(K_FLIP, '0') === '1'; }

export interface HeroPrefs { arrange: Arrange; tilt: Tilt; seed: number; expand: boolean; rows: Rows; align: Align; flip: boolean; density: number; border: Border; }

export function useHeroPrefs(): HeroPrefs {
    const [v, setV] = useState<HeroPrefs>({ arrange: 'spread', tilt: 'soft', seed: 1, expand: false, rows: 1, align: 'left', flip: false, density: 0, border: 'off' });
    useEffect(() => {
        const sync = () => setV({
            arrange: read(K_ARRANGE, 'spread') as Arrange,
            tilt: read(K_TILT, 'soft') as Tilt,
            seed: Number(read(K_SEED, '1')) || 1,
            expand: read(K_EXPAND, '0') === '1',
            rows: (read(K_ROWS, '1') === '3' ? 3 : read(K_ROWS, '1') === '2' ? 2 : 1) as Rows,
            align: read(K_ALIGN, 'left') as Align,
            flip: read(K_FLIP, '0') === '1',
            density: getDensity(),
            border: read(K_BORDER, 'off') as Border,
        });
        sync();
        window.addEventListener(EVT, sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
    }, []);
    return useMemo(() => v, [v]);
}

/* Per-mode shape: how many rows + the display cap + overlap flag. EVERY mode
   has a proper 1/2/3-row version (Brendon, 2026-07-10): the linear modes chunk
   into that many rows; the area modes (Stack, Collage, Slapped) read Rows as
   the CANVAS HEIGHT — 1 = a shallow band, 3 = a tall lid — and scale how many
   stickers they seat to the room. */
const AREA_ROWS_CAP = [0, 0.6, 1, 1.3]; // [rowsPref] → count multiplier
export function arrangeShape(a: Arrange, rowsPref: Rows = 1): { rows: number; cap: number; scatter: boolean; overlap: boolean } {
    switch (a) {
        case 'row':     return { rows: rowsPref, cap: 6 * rowsPref, scatter: false, overlap: false };
        case 'spread':  return { rows: rowsPref, cap: 6 * rowsPref, scatter: false, overlap: false };
        case 'stack':   return { rows: 1, cap: Math.round(14 * AREA_ROWS_CAP[rowsPref]!), scatter: false, overlap: true };
        case 'scatter': return { rows: rowsPref, cap: 7 * rowsPref, scatter: true, overlap: false };
        case 'fill':    return { rows: rowsPref, cap: 8 * rowsPref, scatter: true, overlap: false };
        case 'collage': return { rows: 0, cap: Math.round(10 * AREA_ROWS_CAP[rowsPref]!), scatter: true, overlap: true };
        case 'slapped': return { rows: 0, cap: Math.round(18 * AREA_ROWS_CAP[rowsPref]!), scatter: true, overlap: true };
        default:        return { rows: rowsPref, cap: 6 * rowsPref, scatter: false, overlap: false };
    }
}

/* The area modes' canvas: width ÷ height per Rows setting — 1 row is a shallow
   strip, 3 rows a tall lid. Density then nudges the same canvas tighter. */
export function areaAspect(rowsPref: Rows, density = 0): number {
    const base = [0, 5.2, 3.0, 2.1][rowsPref]!;
    return base * [1.08, 1, 0.92][Math.max(0, Math.min(2, density))]!;
}

/* ── Shared relaxation — the readability guarantee ─────────────────────────
   Every area mode runs its generative placement through this: pairs closer
   than their minimum separation (in PHYSICAL units — x is scaled by the box
   aspect) push apart over a few iterations. Overlap survives as a KISS, never
   a burial: no sticker ever ends up mostly hidden. This is the line between
   "messy mode" and "just too messy" (Brendon, 2026-07-10, with screenshots). */
interface RelaxPt { x: number; y: number; s: number; w: number; }
/* Stickers are wider than tall — and by very different amounts (a logo is
   ~1.2×, a long @name chip can be 3–4×). Each point carries its own width
   factor `w` (width ÷ height of the rendered sticker) so separation is judged
   on the true footprint and edge margins keep even the widest chip fully on
   the lid. */
const DEFAULT_WIDE = 1.7;
/* Half-extents in normalized units. Stickers render ~50px tall at scale 1 and
   the box is ~370px wide, so half-height ≈ 25·s·aspect/370 of the box height —
   the margins MUST scale with the box shape or tall boxes under-protect. */
function clampPt(p: RelaxPt, aspect: number) {
    /* ⛔ NOTHING HANGS OFF THE LID (Brendon, 2026-08-02, in fury: "MAKE THE
       STICKERS FIT IN THE GODDAMN STICKER SPACE PROPERLY. MOST PEOPLE USE
       PORTRAIT IPHONE").
       The margins used to be CAPPED at 0.4 / 0.47 — so a sticker whose own
       half-extent was bigger than the cap (a long @name chip, or anything at a
       big scale on a narrow portrait box) got clamped to a margin SMALLER than
       itself and its ends sat outside the area. A margin can never exceed half
       the box, so the honest fix is the other way round: when a sticker cannot
       fit at its rolled scale, the STICKER comes down until it does. It is
       always fully inside afterwards, at every screen width. */
    let my = 0.068 * p.s * aspect;
    let mx = 0.068 * p.s * (p.w || DEFAULT_WIDE);
    const worst = Math.max(my, mx);
    if (worst > 0.48) {
        p.s *= 0.48 / worst;
        my = 0.068 * p.s * aspect;
        mx = 0.068 * p.s * (p.w || DEFAULT_WIDE);
    }
    p.x = Math.min(1 - mx, Math.max(mx, p.x));
    p.y = Math.min(1 - my, Math.max(my, p.y));
}
function relax(pts: RelaxPt[], aspect: number, minBase: number, iters: number, rnd: () => number) {
    for (const p of pts) clampPt(p, aspect);
    for (let it = 0; it < iters; it++) {
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const a = pts[i]!, b = pts[j]!;
                const wide = ((a.w || DEFAULT_WIDE) + (b.w || DEFAULT_WIDE)) / 2;
                const minD = minBase * ((a.s + b.s) / 2);
                let dx = ((b.x - a.x) * aspect) / wide;
                let dy = b.y - a.y;
                let d = Math.hypot(dx, dy);
                if (d >= minD) continue;
                if (d < 1e-4) { dx = (rnd() - 0.5); dy = (rnd() - 0.5); d = Math.hypot(dx, dy); }
                const push = (minD - d) / 2 / d;
                a.x -= (dx * push * wide) / aspect; a.y -= dy * push;
                b.x += (dx * push * wide) / aspect; b.y += dy * push;
                clampPt(a, aspect); clampPt(b, aspect);
            }
        }
    }
}

/* COLLAGE — the composed one: a few LARGE anchor stickers carry the picture and
   smaller satellites fill around them. Mixed sizes are the identity (Stack is
   same-size; Collage is hierarchy). Kiss overlaps allowed, burial never — the
   shared relaxation guarantees every sticker stays readable. Rows is ignored:
   the collage composes its own area. */
export interface CollagePiece { x: number; y: number; scale: number; rot: number; z: number; }
export function buildCollage(n: number, seed: number, widths: number[] = [], rowsPref: Rows = 2): { cols: number; rows: number; items: CollagePiece[] } {
    const rnd = rngFrom(seed);
    // Rows sets the canvas: 1 = shallow banner, 3 = tall lid.
    const aspect = areaAspect(rowsPref, 1);
    const nA = n >= 9 ? 3 : n >= 5 ? 2 : 1;      // the anchors
    const g = 1.32471795724474602596;             // R2 low-discrepancy sequence
    const a1 = 1 / g, a2 = 1 / (g * g);
    const offX = rnd(), offY = rnd();
    const pts: RelaxPt[] = [];
    for (let k = 0; k < n; k++) {
        const x = 0.08 + ((offX + a1 * (k + 1)) % 1) * 0.84 + (rnd() - 0.5) * 0.04;
        const y = 0.18 + ((offY + a2 * (k + 1)) % 1) * 0.64 + (rnd() - 0.5) * 0.06;
        // Anchors first in R2 order → naturally far apart; satellites in between.
        const s = k < nA ? 1.28 + rnd() * 0.24 : 0.68 + rnd() * 0.3;
        pts.push({ x, y, s, w: widths[k] || DEFAULT_WIDE });
    }
    relax(pts, aspect, 0.5, 30, rnd);
    const items: CollagePiece[] = pts.map((p, k) => ({
        x: p.x * 100, y: p.y * 100, scale: p.s,
        rot: (rnd() - 0.5) * 22,
        z: k < nA ? 1 + Math.floor(rnd() * 3) : 10 + k,   // anchors sit UNDER, never bury
    }));
    return { cols: Math.round(aspect * 10), rows: 10, items };
}

/* ── STACK = a PILE — a stickered-laptop / skateboard look ─────────────────────
   Stickers slapped on over time: piled, overlapping, all over the area, NOT a
   fan. Placement is generative + colour-balanced (on brand): each sticker's
   dominant hue is read, the set is ordered by hue, then dropped onto an R2
   low-discrepancy sequence — which fills the area evenly and organically (no
   grid). Because consecutive hues land far apart, every colour is spread across
   the pile instead of clumping → compositional colour balance. Shuffle re-rolls
   the phase + jitter for a fresh composition. */
export interface PilePiece { x: number; y: number; rot: number; scale: number; z: number; }

/** A sticker's dominant hue (0–360); achromatic / unknown art falls back to a
 *  stable pseudo-hue from its id so it still distributes instead of clumping. */
export function stickerHue(s: Sticker): number {
    const hex = s.color ?? s.bg ?? s.cutout ?? s.fg ?? null;
    if (hex && /^#[0-9a-f]{6}$/i.test(hex)) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        if (d > 0.04) {
            const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
            return ((h * 60) + 360) % 360;
        }
    }
    let x = 0;
    for (let i = 0; i < s.id.length; i++) x = (x * 31 + s.id.charCodeAt(i)) | 0;
    return (x >>> 0) % 360;
}

/* DENSITY (a Density chip) sets how many stickers fill the pile. Rows is
   ignored — the pile composes its own area (taller as it packs denser). The
   pile stays PD's "messy mode" — slapped-on rotation, organic spread — but the
   relaxation pass caps the mess at a kiss: nothing ever ends up buried under a
   neighbour (the too-messy piles Brendon screenshot-flagged, 2026-07-10). */
export function buildPile(hues: number[], seed: number, density = 0, widths: number[] = [], rowsPref: Rows = 2): { aspect: number; items: PilePiece[] } {
    const cnt = Math.round(DENSITY_COUNTS[Math.max(0, Math.min(DENSITY_COUNTS.length - 1, density))]! * AREA_ROWS_CAP[rowsPref]!);
    const n = Math.max(1, Math.min(hues.length, cnt));
    const rnd = rngFrom(seed + 131);
    // Rows sets the canvas height; Density packs the same canvas tighter.
    const aspect = areaAspect(rowsPref, density);
    // Colour balance: order by hue, then R2 low-discrepancy placement so
    // consecutive hues land far apart — no colour clumps.
    const order = [...Array(n).keys()].sort((a, b) => hues[a]! - hues[b]!);
    const g = 1.32471795724474602596;   // plastic number → R2 sequence
    const a1 = 1 / g, a2 = 1 / (g * g);
    const offX = rnd(), offY = rnd();
    const pts: RelaxPt[] = [];
    for (let k = 0; k < n; k++) {
        const x = 0.07 + ((offX + a1 * (k + 1)) % 1) * 0.86 + (rnd() - 0.5) * 0.04;
        const y = 0.16 + ((offY + a2 * (k + 1)) % 1) * 0.68 + (rnd() - 0.5) * 0.07;
        pts.push({ x, y, s: 0.88 + rnd() * 0.24, w: widths[order[k]!] || DEFAULT_WIDE });
    }
    relax(pts, aspect, 0.62, 36, rnd);
    const items: PilePiece[] = new Array(n);
    for (let k = 0; k < n; k++) {
        const idx = order[k]!;
        const p = pts[k]!;
        items[idx] = { x: p.x * 100, y: p.y * 100, rot: (rnd() - 0.5) * 32, scale: p.s, z: k };
    }
    return { aspect, items };
}

/* ── SLAPPED — the WOW mode: a real stickered laptop lid ─────────────────────
   Built from studying actual stickered laptops/iPhones (2026-07-10): people
   place stickers ROUGHLY UPRIGHT (±8°, with the odd rebel at 16–28°), pack
   them nearly edge-to-edge with only slivers of lid showing, put the BIG
   statement pieces down first and tuck small ones into the leftover gaps, and
   fill the frame corner to corner. So: a size script (statements → mids →
   smalls), greedy best-gap placement (each sticker lands a whisker from its
   neighbours — near-tangent, never buried), then a light relaxation pass as
   the readability guarantee. Density = how full the lid is. */
export function buildSlapped(count: number, seed: number, density = 0, widths: number[] = [], rowsPref: Rows = 2): { aspect: number; items: PilePiece[] } {
    const counts = [10, 14, 18];
    const n = Math.max(1, Math.min(count, Math.round(counts[Math.max(0, Math.min(2, density))]! * AREA_ROWS_CAP[rowsPref]!)));
    const rnd = rngFrom(seed + 977);
    const aspect = areaAspect(rowsPref, density);
    // Size script — statements first (real lids grow big → small).
    const nBig = n >= 12 ? 3 : 2;
    const nSmall = Math.max(2, Math.round(n * 0.25));
    const sizes: number[] = [];
    for (let i = 0; i < n; i++) {
        sizes.push(i < nBig ? 1.28 + rnd() * 0.22
            : i < n - nSmall ? 0.88 + rnd() * 0.26
            : 0.6 + rnd() * 0.18);
    }
    const placed: RelaxPt[] = [];
    for (let i = 0; i < n; i++) {
        const s = sizes[i]!;
        const w = widths[i] || DEFAULT_WIDE;
        let best: RelaxPt | null = null;
        let bestScore = Infinity;
        const K = placed.length === 0 ? 1 : 22;
        for (let k = 0; k < K; k++) {
            const cand: RelaxPt = { x: 0.04 + rnd() * 0.92, y: 0.1 + rnd() * 0.8, s, w };
            clampPt(cand, aspect);
            let nearest = Infinity;
            for (const p of placed) {
                const wide = ((p.w || DEFAULT_WIDE) + w) / 2;
                const dx = ((p.x - cand.x) * aspect) / wide;
                const dy = p.y - cand.y;
                nearest = Math.min(nearest, Math.hypot(dx, dy) - 0.5 * ((p.s + cand.s) / 2));
            }
            // A whisker of lid between neighbours; overlap punished hard.
            const score = placed.length === 0 ? 0
                : nearest < 0 ? 4 * -nearest
                : Math.abs(nearest - 0.05);
            if (score < bestScore) { bestScore = score; best = cand; }
        }
        placed.push(best!);
    }
    relax(placed, aspect, 0.56, 22, rnd);
    const items: PilePiece[] = placed.map((p, k) => {
        const rebel = rnd() < 0.14;
        const rot = rebel ? (rnd() < 0.5 ? -1 : 1) * (16 + rnd() * 12) : (rnd() * 2 - 1) * 8;
        return { x: p.x * 100, y: p.y * 100, rot, scale: p.s, z: k };
    });
    return { aspect, items };
}

/* Upside-down: ~1 in 4 stickers flip 180°, deterministic per sticker + seed
   (Shuffle re-rolls which ones). */
export function shouldFlip(id: string, seed: number): boolean {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return (((h ^ seed) >>> 0) % 4) === 0;
}

export function tiltDeg(t: Tilt): number {
    return t === 'flat' ? 0 : t === 'jaunty' ? 11 : 4;
}

/* Tiny seeded RNG (mulberry32) for stable per-seed jitter. */
export function rngFrom(seed: number): () => number {
    let a = seed || 1;
    return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
