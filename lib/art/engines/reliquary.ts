/*
 * Reliquary — an original piece (opus4-8): a backlit stained-glass rose window.
 *
 * N-fold radial symmetry — concentric rings of glass "cells" (petals, lenses,
 * dots) around a central boss, in curated jewel palettes on near-black leading.
 * The glass reads as BACKLIT: every cell is a radial gradient that glows hot at
 * its core and falls to a deep rim, composited additively over a soft central
 * backlight, with the dark leading drawn on top so light blooms around it.
 * Ring bandwidth varies (busy filigree ↔ calm band) for rose-window rhythm.
 *
 * Static + deterministic in tokenId. cast() fixes the frozen RNG prefix.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

interface Palette { name: string; ground: string; lead: string; jewels: string[] }

const PALETTES: Palette[] = [
    { name: 'Chartres', ground: '#0a0a12', lead: '#0d0b14', jewels: ['#1B4DD8', '#2A6BE8', '#E8A019', '#F4C842'] },
    { name: 'Regal',    ground: '#0d0709', lead: '#100a0c', jewels: ['#C81E3A', '#8E1230', '#0E8F5E', '#E8A93B'] },
    { name: 'Mystic',   ground: '#0a0712', lead: '#0e0a16', jewels: ['#7B3FE4', '#9D5BF0', '#0C9C9C', '#22C7C7'] },
    { name: 'Twilight', ground: '#08080f', lead: '#0c0c16', jewels: ['#3A3F9E', '#6E3A7E', '#1E7A82', '#C46A2A'] },
    { name: 'Aurora',   ground: '#06090f', lead: '#0b0d15', jewels: ['#2A5BD8', '#10A6A0', '#19A36A', '#D02644'] },
    { name: 'Ember',    ground: '#0f0805', lead: '#130b08', jewels: ['#D0461f', '#E8A82A', '#7a1f8e', '#f4c842'] },
];

const RINGS = [4, 5, 6] as const;
const CORES = ['Rosette', 'Star', 'Oculus'] as const;

export const RELIQUARY_ASPECTS: readonly number[] = [1];

interface Params {
    palette: Palette;
    n: number;            // symmetry order
    ringCount: number;
    core: typeof CORES[number];
    starK: number;
}

function cast(r: () => number): Params {
    const palette = pick(PALETTES, r);
    const n = pick([8, 10, 12, 16], r);
    const ringCount = pick(RINGS, r);
    const core = pick(CORES, r);
    const starK = pick([2, 3], r);
    return { palette, n, ringCount, core, starK };
}

function traitsFrom(p: Params): OutputTraits {
    return { Palette: p.palette.name, Symmetry: `${p.n}-fold`, Rings: String(p.ringCount), Core: p.core };
}

export const reliquaryTraits: TraitsFn = (tokenId) => traitsFrom(cast(seededRng(tokenId)));

function lerpHex(a: string, b: string, t: number) {
    const ax = parseInt(a.slice(1, 3), 16), ay = parseInt(a.slice(3, 5), 16), az = parseInt(a.slice(5, 7), 16);
    const bx = parseInt(b.slice(1, 3), 16), by = parseInt(b.slice(3, 5), 16), bz = parseInt(b.slice(5, 7), 16);
    return `rgb(${Math.round(ax + (bx - ax) * t)},${Math.round(ay + (by - ay) * t)},${Math.round(az + (bz - az) * t)})`;
}

export const renderReliquary: EngineFn = (canvas, tokenId, width) => {
    const r = seededRng(tokenId);
    const p = cast(r);
    const W = Math.max(1, Math.floor(width));
    const H = W;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { aspect: 1, traits: traitsFrom(p) };
    const pal = p.palette;
    const cx = W / 2, cy = H / 2;
    const Rmax = W * 0.46;

    ctx.fillStyle = pal.ground;
    ctx.fillRect(0, 0, W, H);

    // Soft global backlight behind the glass (the sun behind the wall).
    const back = ctx.createRadialGradient(cx, cy, 0, cx, cy, Rmax * 1.05);
    back.addColorStop(0, pal.jewels[0] + '55');
    back.addColorStop(0.6, pal.jewels[0] + '16');
    back.addColorStop(1, 'transparent');
    ctx.fillStyle = back;
    ctx.fillRect(0, 0, W, H);

    // Ring radii — non-linear so detail packs inward, with varied bandwidth.
    const radii: number[] = [];
    for (let i = 0; i <= p.ringCount; i++) radii.push(Rmax * Math.pow(i / p.ringCount, 1.22));

    const lead = pal.lead;
    const leadW = Math.max(1.2, W * 0.004);
    // shadowBlur is the pricey halation — only on big single-view renders, never
    // on the small tiles that crowd the gallery (dozens at once must stay light).
    const glow = W >= 300;

    function glassCell(path: () => void, cxr: number, cyr: number, rad: number, jewel: string) {
        ctx!.save();
        ctx!.globalCompositeOperation = 'lighter';
        const g = ctx!.createRadialGradient(cxr, cyr, 0, cxr, cyr, rad);
        g.addColorStop(0, lerpHex(jewel, '#ffffff', 0.5));
        g.addColorStop(0.5, jewel);
        g.addColorStop(1, lerpHex(jewel, '#000000', 0.62));
        ctx!.fillStyle = g;
        if (glow) { ctx!.shadowColor = jewel; ctx!.shadowBlur = rad * 0.5; }
        path(); ctx!.fill();
        ctx!.restore();
        // Leading on top.
        ctx!.lineWidth = leadW;
        ctx!.strokeStyle = lead;
        path(); ctx!.stroke();
    }

    // Petal (radial lens) from inner radius ri to outer ro, half-angle ha, at angle a.
    function petal(ri: number, ro: number, a: number, ha: number) {
        const p0 = [cx + Math.cos(a) * ri, cy + Math.sin(a) * ri];
        const p1 = [cx + Math.cos(a) * ro, cy + Math.sin(a) * ro];
        const mr = (ri + ro) / 2;
        const cA = [cx + Math.cos(a - ha) * mr, cy + Math.sin(a - ha) * mr];
        const cB = [cx + Math.cos(a + ha) * mr, cy + Math.sin(a + ha) * mr];
        ctx!.beginPath();
        ctx!.moveTo(p0[0], p0[1]);
        ctx!.quadraticCurveTo(cA[0], cA[1], p1[0], p1[1]);
        ctx!.quadraticCurveTo(cB[0], cB[1], p0[0], p0[1]);
        ctx!.closePath();
    }

    // Rings of cells — alternate petal rings with dot/lozenge rings for rhythm.
    for (let ring = 0; ring < p.ringCount; ring++) {
        const ri = radii[ring], ro = radii[ring + 1];
        const mid = (ri + ro) / 2;
        const count = p.n * (ring % 2 === 0 ? 1 : 2);
        const jewelA = pal.jewels[ring % pal.jewels.length];
        const jewelB = pal.jewels[(ring + 1) % pal.jewels.length];
        const ha = (Math.PI / count) * 0.92;

        if (ring === p.ringCount - 1) {
            // Outer ring of round "lights".
            for (let j = 0; j < count; j++) {
                const a = (j / count) * Math.PI * 2;
                const px = cx + Math.cos(a) * mid, py = cy + Math.sin(a) * mid;
                const rad = (ro - ri) * 0.34;
                glassCell(() => { ctx!.beginPath(); ctx!.arc(px, py, rad, 0, Math.PI * 2); }, px, py, rad, j % 2 ? jewelB : jewelA);
            }
        } else {
            for (let j = 0; j < count; j++) {
                const a = (j / count) * Math.PI * 2 + (ring % 2) * (Math.PI / count);
                const jewel = j % 2 ? jewelB : jewelA;
                const cxr = cx + Math.cos(a) * mid, cyr = cy + Math.sin(a) * mid;
                glassCell(() => petal(ri + leadW, ro - leadW, a, ha), cxr, cyr, (ro - ri) * 0.6, jewel);
            }
        }
        // Came circle separating rings.
        ctx.lineWidth = leadW * (ring === 0 ? 1 : 1.3);
        ctx.strokeStyle = lead;
        ctx.beginPath(); ctx.arc(cx, cy, ro, 0, Math.PI * 2); ctx.stroke();
    }

    // Central core.
    const r0 = radii[1] * 0.9;
    if (p.core === 'Oculus') {
        glassCell(() => { ctx!.beginPath(); ctx!.arc(cx, cy, r0, 0, Math.PI * 2); }, cx, cy, r0, pal.jewels[2 % pal.jewels.length]);
    } else if (p.core === 'Star') {
        const pts = p.n;
        glassCell(() => {
            ctx!.beginPath();
            for (let j = 0; j <= pts; j++) {
                const a = (j * p.starK / pts) * Math.PI * 2;
                const x = cx + Math.cos(a) * r0, y = cy + Math.sin(a) * r0;
                if (j === 0) ctx!.moveTo(x, y); else ctx!.lineTo(x, y);
            }
        }, cx, cy, r0, pal.jewels[3 % pal.jewels.length]);
    } else {
        // Rosette — a ring of small petals around a bright boss.
        for (let j = 0; j < p.n; j++) {
            const a = (j / p.n) * Math.PI * 2;
            glassCell(() => petal(r0 * 0.3, r0, a, (Math.PI / p.n) * 0.9), cx, cy, r0, j % 2 ? pal.jewels[0] : pal.jewels[2 % pal.jewels.length]);
        }
    }
    // Bright boss at dead center.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const boss = ctx.createRadialGradient(cx, cy, 0, cx, cy, r0 * 0.45);
    boss.addColorStop(0, '#fff8e8');
    boss.addColorStop(0.5, lerpHex(pal.jewels[3 % pal.jewels.length], '#ffffff', 0.3));
    boss.addColorStop(1, 'transparent');
    ctx.fillStyle = boss;
    ctx.beginPath(); ctx.arc(cx, cy, r0 * 0.45, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Heavy outer bezel + vignette.
    ctx.globalCompositeOperation = 'source-over';
    ctx.lineWidth = W * 0.02;
    ctx.strokeStyle = lead;
    ctx.beginPath(); ctx.arc(cx, cy, Rmax, 0, Math.PI * 2); ctx.stroke();
    const vg = ctx.createRadialGradient(cx, cy, Rmax * 0.7, cx, cy, Rmax * 1.25);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, 'rgba(0,0,0,0.7)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    return { aspect: 1, traits: traitsFrom(p) };
};

export const reliquarySchema: TraitSchema = {
    traits: [
        { name: 'Palette', values: PALETTES.map((x) => x.name),
          subtraits: [
            { name: 'Cool', values: ['Chartres', 'Regal', 'Mystic', 'Twilight'] },
            { name: 'Warm', values: ['Aurora', 'Ember'] },
          ] },
        { name: 'Symmetry', values: ['8-fold', '10-fold', '12-fold', '16-fold'],
          subtraits: [
            { name: 'Simple', values: ['8-fold', '10-fold'] },
            { name: 'Complex', values: ['12-fold', '16-fold'] },
          ] },
        { name: 'Rings', values: RINGS.map(String) },
        { name: 'Core', values: [...CORES],
          subtraits: [
            { name: 'Figured', values: ['Rosette', 'Star'] },
            { name: 'Open', values: ['Oculus'] },
          ] },
    ],
};
