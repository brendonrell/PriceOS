'use client';

/*
 * heroPrefs — how YOUR stickers arrange on your hero. Set in the manager modal,
 * read by HeroStickers. Local prefs (device), persisted; the generative seed
 * drives the scattered layouts and the Shuffle button.
 */

import { useEffect, useMemo, useState } from 'react';
import type { Sticker } from './catalog';

export type Arrange = 'row' | 'spread' | 'scatter' | 'fill' | 'stack' | 'collage';
export type Tilt = 'flat' | 'soft' | 'jaunty';
export type Rows = 1 | 2;
export type Align = 'left' | 'center' | 'right';

export const ALIGNS: { id: Align; label: string }[] = [
    { id: 'left', label: 'LEFT' },
    { id: 'center', label: 'CENTER' },
    { id: 'right', label: 'RIGHT' },
];

export const ARRANGES: { id: Arrange; label: string }[] = [
    { id: 'spread', label: 'SPREAD' },
    { id: 'row', label: 'ROW' },
    { id: 'stack', label: 'STACK' },
    { id: 'scatter', label: 'SCATTER' },
    { id: 'fill', label: 'FILL' },
    { id: 'collage', label: 'COLLAGE' },
];
export const ROW_OPTS: { id: Rows; label: string }[] = [
    { id: 1, label: '1' },
    { id: 2, label: '2' },
];
export const TILTS: { id: Tilt; label: string }[] = [
    { id: 'flat', label: 'FLAT' },
    { id: 'soft', label: 'SOFT' },
    { id: 'jaunty', label: 'JAUNTY' },
];

const K_ARRANGE = 'pd_sticker_arrange';
const K_TILT = 'pd_sticker_tilt';
const K_SEED = 'pd_sticker_seed';
const K_EXPAND = 'pd_sticker_expand';
const K_ROWS = 'pd_sticker_rows';
const K_ALIGN = 'pd_sticker_align';
const K_FLIP = 'pd_sticker_flip';
const K_STACK_LVL = 'pd_sticker_stack_lvl';
const EVT = 'pd:stickers-changed';

function read(key: string, fallback: string): string {
    if (typeof window === 'undefined') return fallback;
    try { return window.localStorage.getItem(key) || fallback; } catch { return fallback; }
}
function write(key: string, val: string) {
    try { window.localStorage.setItem(key, val); } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(EVT));
}

export function setArrange(a: Arrange) { write(K_ARRANGE, a); }
export function setTilt(t: Tilt) { write(K_TILT, t); }
export function setExpand(b: boolean) { write(K_EXPAND, b ? '1' : '0'); }
export function setRows(r: Rows) { write(K_ROWS, String(r)); }
export function setAlign(a: Align) { write(K_ALIGN, a); }
export function setFlip(b: boolean) { write(K_FLIP, b ? '1' : '0'); }
export function shuffleSeed() { write(K_SEED, String((Math.random() * 1e9) | 0)); }
/** STACK density level. The Shuffle button steps it in stack mode; wraps back to
 *  the loosest after the most-extreme pile. */
export function getStackLevel(): number {
    const v = parseInt(read(K_STACK_LVL, '0'), 10);
    return Number.isFinite(v) ? Math.max(0, Math.min(STACK_LEVEL_COUNT - 1, v)) : 0;
}
export function cycleStackLevel() { write(K_STACK_LVL, String((getStackLevel() + 1) % STACK_LEVEL_COUNT)); }

/* Non-reactive reads — for the manager, which holds its own local copy. */
export function getArrange(): Arrange { return read(K_ARRANGE, 'spread') as Arrange; }
export function getTilt(): Tilt { return read(K_TILT, 'soft') as Tilt; }
export function getExpand(): boolean { return read(K_EXPAND, '0') === '1'; }
export function getRows(): Rows { return read(K_ROWS, '1') === '2' ? 2 : 1; }
export function getAlign(): Align { return read(K_ALIGN, 'left') as Align; }
export function getFlip(): boolean { return read(K_FLIP, '0') === '1'; }

export interface HeroPrefs { arrange: Arrange; tilt: Tilt; seed: number; expand: boolean; rows: Rows; align: Align; flip: boolean; stackLevel: number; }

export function useHeroPrefs(): HeroPrefs {
    const [v, setV] = useState<HeroPrefs>({ arrange: 'spread', tilt: 'soft', seed: 1, expand: false, rows: 1, align: 'left', flip: false, stackLevel: 0 });
    useEffect(() => {
        const sync = () => setV({
            arrange: read(K_ARRANGE, 'spread') as Arrange,
            tilt: read(K_TILT, 'soft') as Tilt,
            seed: Number(read(K_SEED, '1')) || 1,
            expand: read(K_EXPAND, '0') === '1',
            rows: read(K_ROWS, '1') === '2' ? 2 : 1,
            align: read(K_ALIGN, 'left') as Align,
            flip: read(K_FLIP, '0') === '1',
            stackLevel: getStackLevel(),
        });
        sync();
        window.addEventListener(EVT, sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
    }, []);
    return useMemo(() => v, [v]);
}

/* Per-mode shape: how many rows + the display cap + overlap flag. The ROWS pref
   (1/2) drives the row count for the linear modes; area modes are intrinsic. */
export function arrangeShape(a: Arrange, rowsPref: Rows = 1): { rows: number; cap: number; scatter: boolean; overlap: boolean } {
    switch (a) {
        case 'row':     return { rows: rowsPref, cap: 6 * rowsPref, scatter: false, overlap: false };
        case 'spread':  return { rows: rowsPref, cap: 6 * rowsPref, scatter: false, overlap: false };
        case 'stack':   return { rows: 1, cap: 14, scatter: false, overlap: true };
        case 'scatter': return { rows: rowsPref, cap: 7 * rowsPref, scatter: true, overlap: false };
        case 'fill':    return { rows: 3, cap: 24, scatter: true, overlap: false };
        case 'collage': return { rows: 0, cap: 20, scatter: true, overlap: true };
        default:        return { rows: rowsPref, cap: 6 * rowsPref, scatter: false, overlap: false };
    }
}

/* COLLAGE — laptop-lid style: a balanced, dense, overlapping composition with
   mixed sizes. Jittered grid keeps it balanced; scale variety + overlap give the
   collaged look. Positions in % of one large area. */
export interface CollagePiece { x: number; y: number; scale: number; rot: number; z: number; }
export function buildCollage(n: number, seed: number): { cols: number; rows: number; items: CollagePiece[] } {
    const rnd = rngFrom(seed);
    const cols = Math.max(4, Math.round(Math.sqrt(n * 1.3)));
    const rows = Math.max(1, Math.ceil(n / cols));
    const cells = [...Array(cols * rows).keys()];
    for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [cells[i], cells[j]] = [cells[j]!, cells[i]!]; }
    const cw = 100 / cols, ch = 100 / rows;
    const items: CollagePiece[] = [];
    for (let i = 0; i < n; i++) {
        const cell = cells[i]!;
        const col = cell % cols, row = Math.floor(cell / cols);
        const jx = (rnd() - 0.5) * cw * 0.7;
        const jy = (rnd() - 0.5) * ch * 0.7;
        const x = Math.min(92, Math.max(8, (col + 0.5) * cw + jx));
        const y = Math.min(90, Math.max(10, (row + 0.5) * ch + jy));
        // Mostly mid-size with a few anchors larger and a few smaller → balanced.
        const r = rnd();
        const scale = r < 0.18 ? 1.15 + rnd() * 0.35 : r > 0.78 ? 0.55 + rnd() * 0.15 : 0.78 + rnd() * 0.3;
        items.push({ x, y, scale, rot: (rnd() - 0.5) * 28, z: Math.floor(rnd() * 1000) });
    }
    return { cols, rows, items };
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
            let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
            return ((h * 60) + 360) % 360;
        }
    }
    let x = 0;
    for (let i = 0; i < s.id.length; i++) x = (x * 31 + s.id.charCodeAt(i)) | 0;
    return (x >>> 0) % 360;
}

/* The STACK cycles through these via the Shuffle button — a clean single row
   (few, readable) up to the densest two-row pile, which is the MOST EXTREME
   (the reference screenshot). Each level sets how many show, the area shape, and
   single-row vs piled. */
const STACK_LEVELS: { count: number; aspect: number; single: boolean }[] = [
    { count: 6,  aspect: 6.2, single: true  },   // single row, few — readable
    { count: 9,  aspect: 4.3, single: true  },   // single row, fuller
    { count: 12, aspect: 3.3, single: false },   // two rows, building up
    { count: 14, aspect: 2.8, single: false },   // EXTREME — the pile, unchanged
];
export const STACK_LEVEL_COUNT = STACK_LEVELS.length;

export function buildPile(hues: number[], seed: number, level = 0): { aspect: number; items: PilePiece[] } {
    const L = STACK_LEVELS[Math.max(0, Math.min(STACK_LEVELS.length - 1, level))]!;
    const n = Math.max(1, Math.min(hues.length, L.count));
    const rnd = rngFrom(seed + 131);
    // Colour balance: order by hue, then drop onto an R2 low-discrepancy
    // sequence so consecutive hues land far apart — no colour clumps.
    const order = [...Array(n).keys()].sort((a, b) => hues[a]! - hues[b]!);
    const g = 1.32471795724474602596;   // plastic number → R2 sequence
    const a1 = 1 / g, a2 = 1 / (g * g);
    const items: PilePiece[] = new Array(n);
    if (L.single) {
        // SINGLE ROW — even organic spread along one line, light overlap.
        const off = rnd(), PAD = 8, span = 100 - PAD * 2;
        for (let k = 0; k < n; k++) {
            const idx = order[k]!;
            const t = (off + a1 * (k + 1)) % 1;
            items[idx] = { x: PAD + t * span, y: 50 + (rnd() - 0.5) * 16, rot: (rnd() - 0.5) * 30, scale: 0.85 + rnd() * 0.35, z: k };
        }
    } else {
        // 2D PILE — R2 over the whole area (the stickered-laptop look).
        const offX = rnd(), offY = rnd();
        for (let k = 0; k < n; k++) {
            const idx = order[k]!;
            let x = (offX + a1 * (k + 1)) % 1;
            let y = (offY + a2 * (k + 1)) % 1;
            x = Math.min(0.93, Math.max(0.07, x + (rnd() - 0.5) * 0.05));
            y = Math.min(0.88, Math.max(0.12, y + (rnd() - 0.5) * 0.09));
            items[idx] = { x: x * 100, y: y * 100, rot: (rnd() - 0.5) * 46, scale: 0.8 + rnd() * 0.5, z: k };
        }
    }
    return { aspect: L.aspect, items };
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
