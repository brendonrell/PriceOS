/*
 * Boreal — an original piece (opus4-8): the northern lights as a flow field.
 *
 * Vertical-drape streamlines traced through value-noise (curtains hang and
 * billow rather than swirl like a generic flow field), coloured by the real
 * aurora altitude stack — magenta-pink hem at the base, brilliant green body,
 * a faint red/violet crown dissolving into the night. Rendered as glowing
 * ribbons: additive blend, multi-pass strokes, radial bloom pools, dust, and a
 * vignette so the light reads as emissive against a deep sky.
 *
 * Static + deterministic in tokenId. cast() fixes the frozen RNG prefix.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

interface Palette { name: string; sky: [string, string]; hem: string; body: string; crown: string }

const PALETTES: Palette[] = [
    { name: 'Classic',  sky: ['#02040c', '#08142a'], hem: '#ff4fd8', body: '#37ffb0', crown: '#ff3b5c' },
    { name: 'Emerald',  sky: ['#01060a', '#04161a'], hem: '#6affd0', body: '#2ff08a', crown: '#7ab0ff' },
    { name: 'Ultra',    sky: ['#05030f', '#140a2a'], hem: '#ff6ec7', body: '#9b7bff', crown: '#5fe0ff' },
    { name: 'Solar',    sky: ['#0a0402', '#1c0c06'], hem: '#ffd24d', body: '#ff8a3c', crown: '#ff4f7a' },
    { name: 'Ice',      sky: ['#020810', '#06182e'], hem: '#9bf0ff', body: '#5fb0ff', crown: '#b58bff' },
    { name: 'Spectral', sky: ['#040308', '#0c1024'], hem: '#ff5db0', body: '#5effc8', crown: '#ffd06a' },
    { name: 'Rose',     sky: ['#0a0410', '#1a0826'], hem: '#ff86c0', body: '#ff4fd8', crown: '#a07aff' },
];

const VEILS = ['Arc', 'Curtain', 'Corona', 'Storm'] as const;
const DENS = ['Quiet', 'Active', 'Substorm'] as const;

export const BOREAL_ASPECTS: readonly number[] = [1, 1.25];

interface Params {
    palette: Palette;
    veil: typeof VEILS[number];
    density: typeof DENS[number];
    aspect: number;
    seed: number;
    scaleX: number;
    sway: number;
    warp: number;
    fieldRot: number;
}

function cast(r: () => number): Params {
    const palette = pick(PALETTES, r);
    const veil = pick(VEILS, r);
    const density = pick(DENS, r);
    const aspect = pick([1, 1.25], r);
    const seed = r() * 1000;
    const scaleX = 0.0016 + r() * 0.0018;
    // Veil drives the geometry (jury: it was a label that didn't change anything).
    // Arc = tight near-vertical; Curtain = drape; Corona = looser; Storm = chaotic.
    const sway =
        veil === 'Arc' ? 0.45 + r() * 0.4 :
        veil === 'Storm' ? 1.7 + r() * 0.9 :
        veil === 'Corona' ? 1.1 + r() * 0.7 :
        0.9 + r() * 0.7;
    const warp = 0.6 + r() * 1.3;          // domain warp → folding, not combing
    const fieldRot = r() * Math.PI * 2;    // each token samples a different field
    return { palette, veil, density, aspect, seed, scaleX, sway, warp, fieldRot };
}

function traitsFrom(p: Params): OutputTraits {
    return { Palette: p.palette.name, Veil: p.veil, Activity: p.density };
}

export const borealTraits: TraitsFn = (tokenId) => traitsFrom(cast(seededRng(tokenId)));

/* Smooth value noise (hash → bilinear → fbm). Deterministic. */
function hash2(x: number, y: number): number { const h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return h - Math.floor(h); }
function vnoise(x: number, y: number): number {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x: number, y: number): number { let s = 0, amp = 0.5, f = 1; for (let i = 0; i < 4; i++) { s += amp * vnoise(x * f, y * f); f *= 2; amp *= 0.5; } return s; }
function lerpC(a: string, b: string, t: number) {
    const ax = parseInt(a.slice(1, 3), 16), ay = parseInt(a.slice(3, 5), 16), az = parseInt(a.slice(5, 7), 16);
    const bx = parseInt(b.slice(1, 3), 16), by = parseInt(b.slice(3, 5), 16), bz = parseInt(b.slice(5, 7), 16);
    return `rgb(${Math.round(ax + (bx - ax) * t)},${Math.round(ay + (by - ay) * t)},${Math.round(az + (bz - az) * t)})`;
}
function auroraColor(p: Palette, yf: number): string {
    // yf: 0 at hem (bottom of band) → 1 at crown (top).
    if (yf < 0.4) return lerpC(p.hem, p.body, yf / 0.4);
    return lerpC(p.body, p.crown, (yf - 0.4) / 0.6);
}

export const renderBoreal: EngineFn = (canvas, tokenId, width) => {
    const r = seededRng(tokenId);
    const p = cast(r);
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round(W / p.aspect));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { aspect: p.aspect, traits: traitsFrom(p) };

    // Night sky gradient.
    const sky = ctx.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, p.palette.sky[0]);
    sky.addColorStop(1, p.palette.sky[1]);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W, H);

    // A few stars behind.
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < W / 6; i++) {
        ctx.globalAlpha = 0.1 + r() * 0.5;
        ctx.fillStyle = '#dfe8ff';
        const s = r() < 0.08 ? 1.8 : 0.9;
        ctx.fillRect(r() * W, r() * H * 0.8, s, s);
    }

    // Hero band placement — the curtain hangs through the mid/lower frame.
    const bandTop = H * (0.1 + r() * 0.18);
    const bandBot = H * (0.72 + r() * 0.18);
    const bandH = bandBot - bandTop;
    const lineCount = (p.density === 'Quiet' ? 0.5 : p.density === 'Substorm' ? 1.4 : 0.9) * W * 0.9;
    const focal = 0.3 + r() * 0.4;       // x of the brightest fold

    ctx.lineCap = 'round';
    for (let i = 0; i < lineCount; i++) {
        const sx = r() * W;
        // Intensity peaks near the focal fold, falls toward the edges → negative space.
        const dx = Math.abs(sx / W - focal);
        const intensity = Math.max(0, 1 - dx * (p.veil === 'Corona' ? 2.2 : 3.2)) * (0.4 + fbm(sx * p.scaleX * 3 + p.seed, 7) * 0.9);
        if (intensity < 0.12) continue;

        const steps = Math.round(bandH / 2);
        let x = sx, y = bandBot;
        const pts: [number, number, number][] = [];
        for (let s = 0; s < steps; s++) {
            const yf = 1 - (y - bandTop) / bandH;            // 0 hem → 1 crown
            // Rotate the sample per token (so the field itself differs, not just
            // a window-shift), then domain-warp so curtains fold instead of comb.
            const bx = x * p.scaleX, by = y * 0.004;
            const rx = bx * Math.cos(p.fieldRot) - by * Math.sin(p.fieldRot) + p.seed;
            const ry = bx * Math.sin(p.fieldRot) + by * Math.cos(p.fieldRot) + p.seed;
            const wx = rx + p.warp * (fbm(rx * 0.7 + 11.3, ry * 0.7) - 0.5);
            const wy = ry + p.warp * (fbm(rx * 0.7, ry * 0.7 + 7.1) - 0.5);
            const ang = -Math.PI / 2 + (fbm(wx, wy) - 0.5) * p.sway;
            x += Math.cos(ang) * 2;
            y += Math.sin(ang) * 2;
            if (y < bandTop || x < -20 || x > W + 20) break;
            pts.push([x, y, yf]);
        }
        if (pts.length < 4) continue;

        // Glowing ribbon: wide-faint → thin-bright, additive. Small tiles drop
        // the widest haze pass so a gallery of them stays light.
        const passes: [number, number][] = W < 300 ? [[3, 0.12], [1.2, 0.34]] : [[6.5, 0.05], [3, 0.1], [1.2, 0.32]];
        for (const [lw, a] of passes) {
            ctx.lineWidth = lw * (0.5 + intensity);
            ctx.globalAlpha = a * intensity;
            ctx.beginPath();
            for (let k = 0; k < pts.length; k++) {
                const [px, py] = pts[k];
                if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            // colour at the strand mid-height keeps each ribbon tonally simple.
            ctx.strokeStyle = auroraColor(p.palette, pts[Math.floor(pts.length / 2)][2]);
            ctx.stroke();
        }
    }

    // Diffuse horizon glow under the rays.
    const hg = ctx.createRadialGradient(W * focal, bandBot, 0, W * focal, bandBot, W * 0.6);
    hg.addColorStop(0, p.palette.body + '30');
    hg.addColorStop(1, 'transparent');
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, W, H);

    // Dust motes + vignette.
    for (let i = 0; i < W / 5; i++) {
        ctx.globalAlpha = 0.06 + r() * 0.3;
        ctx.fillStyle = i % 3 ? p.palette.body : p.palette.hem;
        ctx.fillRect(r() * W, bandTop + r() * bandH, 1.1, 1.1);
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    return { aspect: p.aspect, traits: traitsFrom(p) };
};

export const borealSchema: TraitSchema = {
    traits: [
        { name: 'Palette', values: PALETTES.map((x) => x.name),
          subtraits: [
            { name: 'Green', values: ['Classic', 'Emerald'] },
            { name: 'Cool', values: ['Ultra', 'Ice'] },
            { name: 'Warm', values: ['Solar', 'Rose'] },
            { name: 'Full', values: ['Spectral'] },
          ] },
        { name: 'Veil', values: [...VEILS],
          subtraits: [
            { name: 'Banded', values: ['Arc', 'Curtain'] },
            { name: 'Diffuse', values: ['Corona', 'Storm'] },
          ] },
        { name: 'Activity', values: [...DENS],
          subtraits: [
            { name: 'Calm', values: ['Quiet'] },
            { name: 'Charged', values: ['Active', 'Substorm'] },
          ] },
    ],
};
