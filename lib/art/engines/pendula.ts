/*
 * Pendula — an original piece (opus4-8).
 *
 * A harmonograph: the trace of two or three coupled, slowly-damping pendulums,
 * one set swinging the pen, another swinging the paper. Near-integer frequency
 * ratios make the figure want to close; a small detune lets it precess, so the
 * curve weaves over itself into a fine silk knot that decays as the pendulums
 * lose energy. Drawn as many translucent passes for the threaded, luminous look.
 *
 * Pure maths, no noise — fully deterministic in tokenId. cast() fixes the
 * frozen RNG prefix shared by render() and traitsOf().
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

interface Palette { name: string; ground: string; inks: string[] }

/* Refined, low-key palettes — luminous threads on a calm ground. No mustard. */
const PALETTES: Palette[] = [
    { name: 'Indigo',   ground: '#080a1c', inks: ['#5fb0ff', '#c08bff', '#46f0d6'] },
    { name: 'Ember',    ground: '#140807', inks: ['#ff7a4d', '#ffd24d', '#ff5d7a'] },
    { name: 'Verdigris',ground: '#06140f', inks: ['#3df0b8', '#9bff6a', '#5ad6ff'] },
    { name: 'Ink',      ground: '#f3eee1', inks: ['#243a8c', '#b0344f', '#1f7a6b'] },
    { name: 'Orchid',   ground: '#100620', inks: ['#ff7ad0', '#a07aff', '#5fe0ff'] },
    { name: 'Aurora',   ground: '#05121a', inks: ['#5effc8', '#7ab0ff', '#ff86e0'] },
];

const HARMONIES: { name: string; fx: [number, number]; fy: [number, number] }[] = [
    { name: 'Unison',  fx: [2, 3], fy: [3, 2] },
    { name: 'Third',   fx: [2, 4], fy: [3, 5] },
    { name: 'Fifth',   fx: [2, 3], fy: [4, 5] },
    { name: 'Spiral',  fx: [3, 4], fy: [4, 6] },
    { name: 'Lattice', fx: [4, 5], fy: [5, 6] },
    { name: 'Rosette', fx: [3, 5], fy: [5, 3] },
];

const DECAYS = ['Slow', 'Even', 'Quick'] as const;
const PASSES = ['Single', 'Woven', 'Chorus'] as const;

export const PENDULA_ASPECTS: readonly number[] = [1];

interface Params {
    palette: Palette;
    harmony: typeof HARMONIES[number];
    decay: typeof DECAYS[number];
    passes: typeof PASSES[number];
    detune: number;
    phase: number;
    rot: number;
}

function cast(r: () => number): Params {
    const palette = pick(PALETTES, r);
    const harmony = pick(HARMONIES, r);
    const decay = pick(DECAYS, r);
    const passes = pick(PASSES, r);
    const detune = 0.002 + r() * 0.02;
    const phase = r() * Math.PI * 2;
    const rot = (r() - 0.5) * 0.5;
    return { palette, harmony, decay, passes, detune, phase, rot };
}

function traitsFrom(p: Params): OutputTraits {
    return {
        Palette: p.palette.name,
        Harmony: p.harmony.name,
        Decay: p.decay,
        Passes: p.passes,
    };
}

export const pendulaTraits: TraitsFn = (tokenId) => traitsFrom(cast(seededRng(tokenId)));

export const renderPendula: EngineFn = (canvas, tokenId, width) => {
    const r = seededRng(tokenId);
    const p = cast(r);
    const W = Math.max(1, Math.floor(width));
    const H = W;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { aspect: 1, traits: traitsFrom(p) };

    const lum = (parseInt(p.palette.ground.slice(1, 3), 16) * 0.299 +
        parseInt(p.palette.ground.slice(3, 5), 16) * 0.587 +
        parseInt(p.palette.ground.slice(5, 7), 16) * 0.114);
    const light = lum > 140;

    ctx.fillStyle = p.palette.ground;
    ctx.fillRect(0, 0, W, H);
    // Soft aura bloom behind the figure (the "magic haze").
    if (!light) {
        const bl = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H / 2, W * 0.62);
        bl.addColorStop(0, p.palette.inks[0] + '2a');
        bl.addColorStop(0.5, p.palette.inks[1] + '12');
        bl.addColorStop(1, 'transparent');
        ctx.fillStyle = bl;
        ctx.fillRect(0, 0, W, H);
    }
    ctx.translate(W / 2, H / 2);
    ctx.rotate(p.rot);

    const R = W * 0.4;
    // Gentle decay: the trace should fill the frame and weave many times before
    // it loses energy — at STEPS end the envelope is still ~0.2–0.45.
    const STEPS = 12000;
    const d = p.decay === 'Slow' ? 0.00007 : p.decay === 'Quick' ? 0.00026 : 0.00014;
    const passCount = p.passes === 'Single' ? 2 : p.passes === 'Woven' ? 4 : 6;
    const [fx1, fx2] = p.harmony.fx;
    const [fy1, fy2] = p.harmony.fy;
    // Per-pendulum phases + amplitudes (fixed RNG draws after cast).
    const px1 = p.phase, px2 = r() * Math.PI * 2;
    const py1 = r() * Math.PI * 2, py2 = r() * Math.PI * 2;
    const ax1 = 0.6, ax2 = 0.4, ay1 = 0.6, ay2 = 0.4;
    const dt = 0.011;

    ctx.globalCompositeOperation = light ? 'multiply' : 'lighter';
    ctx.lineWidth = Math.max(0.6, W * (light ? 0.0016 : 0.0019));
    if (!light) { ctx.shadowColor = p.palette.inks[0]; ctx.shadowBlur = W * 0.006; }

    for (let pass = 0; pass < passCount; pass++) {
        const ink = p.palette.inks[pass % p.palette.inks.length];
        const ph = pass * 0.5;            // small phase shift per thread
        const det = p.detune * (1 + pass * 0.55);
        ctx.strokeStyle = ink;
        if (!light) ctx.shadowColor = ink;
        ctx.globalAlpha = light ? 0.34 : 0.42;
        ctx.beginPath();
        for (let i = 0; i < STEPS; i++) {
            const t = i * dt;
            const env = Math.exp(-d * i);
            const x =
                (ax1 * Math.sin(fx1 * t + px1 + ph) +
                 ax2 * Math.sin((fx2 + det) * t + px2)) * env;
            const y =
                (ay1 * Math.sin(fy1 * t + py1 + ph) +
                 ay2 * Math.sin((fy2 + det) * t + py2)) * env;
            const sx = x * R, sy = y * R;
            if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
        }
        ctx.stroke();
    }

    // Drifting dust motes + a vignette to deepen the surreal haze.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.shadowBlur = 0;
    if (!light) {
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < W / 4; i++) {
            ctx.globalAlpha = 0.1 + r() * 0.5;
            ctx.fillStyle = p.palette.inks[Math.floor(r() * p.palette.inks.length)];
            const s = r() < 0.12 ? W * 0.006 : W * 0.0026;
            ctx.fillRect(r() * W, r() * H, s, s);
        }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const vg = ctx.createRadialGradient(W / 2, H / 2, W * 0.3, W / 2, H / 2, W * 0.72);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, light ? 'rgba(40,30,20,0.22)' : 'rgba(0,0,0,0.5)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    return { aspect: 1, traits: traitsFrom(p) };
};

export const pendulaSchema: TraitSchema = {
    traits: [
        { name: 'Palette', values: PALETTES.map((x) => x.name) },
        { name: 'Harmony', values: HARMONIES.map((x) => x.name) },
        { name: 'Decay', values: [...DECAYS] },
        { name: 'Passes', values: [...PASSES] },
    ],
};
