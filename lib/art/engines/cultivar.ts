/*
 * Cultivar — an homage to fxhash's fx(params) launch piece "YYYSEED" (Zancan).
 *
 * Zancan's signature: dense hand-drawn BOTANICAL line-work — sprouting forms,
 * branching foliage, tangles of fine strokes. fx(params) let the collector tune
 * density / palette / form on top of the frozen hash; here those axes are
 * seed-derived. Pushed toward bright, tasteful colour and a fuller, frame-
 * filling composition (luminous canopies on rich grounds), not just ink on paper.
 *
 * cast() fixes the frozen RNG prefix; render() grows the plant from the same
 * stream so render() and traitsOf() agree.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

interface Palette { name: string; ground: string; trunk: string; leaf: string; bloom: string }

/* Rich grounds with luminous foliage — bright but tasteful, no mustard. A
   couple of classic ink-on-paper sets keep the set cohesive with its roots. */
const PALETTES: Palette[] = [
    { name: 'Spring',    ground: '#f3ecda', trunk: '#3a5a2a', leaf: '#7cc043', bloom: '#ff5d8f' },
    { name: 'Coral',     ground: '#0d3b3a', trunk: '#1f6f63', leaf: '#ff9e6b', bloom: '#ffd166' },
    { name: 'Indigo',    ground: '#10183a', trunk: '#3a5bd0', leaf: '#7ad6ff', bloom: '#ff7ad0' },
    { name: 'Plum',      ground: '#2a1030', trunk: '#7a3b7a', leaf: '#ffb14e', bloom: '#ff5d6c' },
    { name: 'Sumi',      ground: '#efe7d4', trunk: '#1a1712', leaf: '#3a3a30', bloom: '#c0392b' },
    { name: 'Blueprint', ground: '#0f2742', trunk: '#9fc6e8', leaf: '#d6ecff', bloom: '#7ad6ff' },
];

const FORMS = ['Sprout', 'Bush', 'Vine', 'Radial'] as const;
const DENSITY = ['Spare', 'Lush', 'Wild'] as const;
const HABIT = ['Upright', 'Weeping', 'Wind'] as const;

export const CULTIVAR_ASPECTS: readonly number[] = [0.82, 1];

interface Params {
    palette: Palette;
    form: typeof FORMS[number];
    density: typeof DENSITY[number];
    habit: typeof HABIT[number];
    aspect: number;
    bloom: boolean;
}

function cast(r: () => number): Params {
    const palette = pick(PALETTES, r);
    const form = pick(FORMS, r);
    const density = pick(DENSITY, r);
    const habit = pick(HABIT, r);
    const aspect = form === 'Radial' ? 1 : 0.82;
    const bloom = r() < 0.34;
    return { palette, form, density, habit, aspect, bloom };
}

function traitsFrom(p: Params): OutputTraits {
    return {
        Palette: p.palette.name,
        Form: p.form,
        Density: p.density,
        Habit: p.habit,
        Bloom: p.bloom ? 'Yes' : 'No',
    };
}

export const cultivarTraits: TraitsFn = (tokenId) => traitsFrom(cast(seededRng(tokenId)));

function hx(c: string) { return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)]; }
function lerp(a: string, b: string, t: number) {
    const x = hx(a), y = hx(b);
    return `rgb(${Math.round(x[0] + (y[0] - x[0]) * t)},${Math.round(x[1] + (y[1] - x[1]) * t)},${Math.round(x[2] + (y[2] - x[2]) * t)})`;
}

export const renderCultivar: EngineFn = (canvas, tokenId, width) => {
    const r = seededRng(tokenId);
    const p = cast(r);
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round(W / p.aspect));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { aspect: p.aspect, traits: traitsFrom(p) };
    const pal = p.palette;

    // Ground with a soft vertical wash for depth.
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, lerp(pal.ground, '#000000', 0.12));
    grad.addColorStop(1, pal.ground);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Soft light bloom behind the canopy — sun through leaves, the surreal haze.
    const dark = (parseInt(pal.ground.slice(1, 3), 16) + parseInt(pal.ground.slice(3, 5), 16) + parseInt(pal.ground.slice(5, 7), 16)) / 3 < 120;
    const bl = ctx.createRadialGradient(W / 2, H * 0.42, 0, W / 2, H * 0.42, W * 0.66);
    bl.addColorStop(0, pal.leaf + (dark ? '34' : '22'));
    bl.addColorStop(0.55, pal.bloom + '0e');
    bl.addColorStop(1, 'transparent');
    ctx.fillStyle = bl;
    ctx.fillRect(0, 0, W, H);

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const unit = W / 1000;
    // Recursion was exploding (2^depth branches) and choking the page. Cap depth
    // AND put a hard ceiling on total branches so cost is bounded no matter what
    // — the plant still reads lush, it just can't run away (Brendon, 2026-06-16).
    const small = W < 300;
    const maxDepth = (p.density === 'Spare' ? 6 : p.density === 'Lush' ? 7 : 8) - (small ? 2 : 0);
    let budget = small ? 150 : 620;
    const splits = p.density === 'Spare' ? 2 : 3;
    const weep = p.habit === 'Weeping' ? 0.5 : p.habit === 'Wind' ? 0.0 : -0.18;
    const windBias = p.habit === 'Wind' ? 0.45 : 0;

    function leafCluster(x: number, y: number, ang: number, size: number) {
        const fan = 5 + Math.floor(r() * 4);
        ctx!.strokeStyle = lerp(pal.leaf, '#ffffff', 0.18);
        ctx!.lineWidth = Math.max(0.6, size * 0.16);
        for (let i = 0; i < fan; i++) {
            const a = ang + (i / (fan - 1) - 0.5) * 0.9 + (r() - 0.5) * 0.2;
            const s = size * (0.7 + r() * 0.6);
            ctx!.beginPath();
            ctx!.moveTo(x, y);
            ctx!.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s);
            ctx!.stroke();
        }
        if (p.bloom && r() < 0.6) {
            ctx!.save();
            ctx!.fillStyle = pal.bloom;
            ctx!.shadowColor = pal.bloom;
            ctx!.shadowBlur = size * 1.6;     // blossoms glow
            ctx!.beginPath();
            ctx!.arc(x + Math.cos(ang) * size * 0.5, y + Math.sin(ang) * size * 0.5, size * 0.34, 0, Math.PI * 2);
            ctx!.fill();
            ctx!.restore();
        }
    }

    function branch(x: number, y: number, ang: number, len: number, w: number, depth: number, maxD: number) {
        if (depth <= 0 || len < 3.5 * unit || budget <= 0) { leafCluster(x, y, ang, Math.max(6 * unit, len)); return; }
        budget--;
        const segs = 7;
        const curve = (r() - 0.5) * 0.5 + weep * 0.14 + windBias * 0.12;
        let cx = x, cy = y, a = ang;
        const f = 1 - depth / maxD;                 // 0 trunk → 1 tip
        ctx!.strokeStyle = lerp(pal.trunk, pal.leaf, f);
        ctx!.lineWidth = Math.max(0.7, w);
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        for (let s = 0; s < segs; s++) {
            a += curve / segs;
            cx += Math.cos(a) * (len / segs);
            cy += Math.sin(a) * (len / segs);
            ctx!.lineTo(cx, cy);
        }
        ctx!.stroke();
        // Mid-canopy foliage — leaves all along the limbs, not just the tips,
        // so the plant reads lush instead of bare.
        if (depth <= maxD - 3 && r() < 0.85) leafCluster(cx, cy, a + (r() - 0.5) * 1.2, Math.max(7 * unit, len * 0.5));
        const kids = Math.min(splits, 2 + (r() < 0.7 ? 1 : 0));
        const spread = 0.6 + r() * 0.6;
        for (let k = 0; k < kids; k++) {
            const t = kids === 1 ? 0 : (k / (kids - 1) - 0.5);
            const na = a + t * spread + (r() - 0.5) * 0.22 + windBias * 0.14;
            branch(cx, cy, na, len * (0.66 + r() * 0.16), w * 0.72, depth - 1, maxD);
        }
    }

    if (p.form === 'Radial') {
        const cx = W / 2, cy = H / 2;
        const arms = 6 + Math.floor(r() * 5);
        for (let i = 0; i < arms; i++) {
            const a = (i / arms) * Math.PI * 2 + r() * 0.2;
            branch(cx, cy, a, W * 0.2, 2.6 * unit, maxDepth - 1, maxDepth);
        }
    } else if (p.form === 'Bush') {
        const stems = 3 + Math.floor(r() * 3);
        for (let i = 0; i < stems; i++) {
            const bx = W * (0.26 + 0.48 * (stems === 1 ? 0.5 : i / (stems - 1)));
            branch(bx, H * 0.97, -Math.PI / 2 + (r() - 0.5) * 0.6, H * 0.34, 3 * unit, maxDepth, maxDepth);
        }
    } else if (p.form === 'Vine') {
        branch(W * 0.1, H * 0.95, -Math.PI / 2 + 0.55, H * 0.46, 3.4 * unit, maxDepth, maxDepth);
    } else {
        branch(W * 0.5, H * 0.98, -Math.PI / 2, H * 0.42, 3.6 * unit, maxDepth, maxDepth);
    }

    // Floating pollen / spores — additive motes drifting in the light.
    ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter';
    const motes = Math.round(W / 7);
    for (let i = 0; i < motes; i++) {
        ctx.globalAlpha = 0.06 + r() * 0.4;
        ctx.fillStyle = r() < 0.3 ? pal.bloom : pal.leaf;
        const s = r() < 0.1 ? W * 0.005 : W * 0.0022;
        ctx.beginPath();
        ctx.arc(r() * W, r() * H * 0.85, s, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const vg = ctx.createRadialGradient(W / 2, H * 0.45, W * 0.34, W / 2, H * 0.5, W * 0.78);
    vg.addColorStop(0, 'transparent');
    vg.addColorStop(1, dark ? 'rgba(0,0,0,0.42)' : 'rgba(40,30,15,0.16)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    return { aspect: p.aspect, traits: traitsFrom(p) };
};

export const cultivarSchema: TraitSchema = {
    traits: [
        { name: 'Palette', values: PALETTES.map((x) => x.name) },
        { name: 'Form', values: [...FORMS] },
        { name: 'Density', values: [...DENSITY] },
        { name: 'Habit', values: [...HABIT] },
        { name: 'Bloom', values: ['Yes', 'No'] },
    ],
};
