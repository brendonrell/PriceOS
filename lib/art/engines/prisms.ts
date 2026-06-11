/*
 * Prisms art engine — a fresh, standalone gradient Project. (KIKI is PD's
 * GENESIS PROJECT — Brendon's own art project, set aside for now, living in
 * the kiki-genart repo. Early Prisms builds borrowed placeholder palettes
 * from it; all of that is gone.) The palettes + traits below are authored for
 * PD (Brendon delegated Prisms art: "your own palettes/traits, tasteful but
 * colourful, not rainbow, with real aspect-ratio variance").
 *
 * Each Output is a multi-stop gradient (linear / radial / conic) in one curated
 * palette, at one of several aspect ratios. Deterministic in tokenId via the
 * shared RNG. Trait derivation (castPrisms) is a fixed RNG prefix so render()
 * and traitsOf() always agree.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, RenderResult, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

interface Palette {
  name: string;
  /** Gradient stops, dark base → mid → brighter accent. */
  a: string;
  b: string;
  c: string;
}

/* 14 curated palettes: each a cohesive dark→mid→accent ramp (not a rainbow).
   Grouped into Palette subtraits below by mood. */
const PALETTES: readonly Palette[] = [
  { name: 'EMBER', a: '#1a0b08', b: '#c0431f', c: '#f2a73d' },
  { name: 'DUNE', a: '#1a120b', b: '#9c6b3f', c: '#e8d2a6' },
  { name: 'CLAY', a: '#1c0f0a', b: '#b5532e', c: '#e6b89c' },
  { name: 'WINE', a: '#1a0509', b: '#8c1c3a', c: '#e8718f' },
  { name: 'TIDE', a: '#04141c', b: '#0d6e7a', c: '#6fd6c4' },
  { name: 'SLATE', a: '#0c1014', b: '#475b6b', c: '#aebfcc' },
  { name: 'FROST', a: '#04101e', b: '#1f5fa6', c: '#7fe0ff' },
  { name: 'VERDANT', a: '#03140f', b: '#0f7a5a', c: '#9ff0c4' },
  { name: 'MOSS', a: '#0a1410', b: '#2f6b3a', c: '#a7c957' },
  { name: 'AURORA', a: '#04130f', b: '#1f7a6a', c: '#d9e07a' },
  { name: 'ORCHID', a: '#1c0a1e', b: '#7a2a8c', c: '#e7a6d6' },
  { name: 'PLASMA', a: '#0d0820', b: '#5a2ea6', c: '#ff6f91' },
  { name: 'DUSK', a: '#160a1c', b: '#6a3b7a', c: '#f0b59a' },
  { name: 'CARBON', a: '#050505', b: '#3a3a3a', c: '#c8c8c8' },
];
const PALETTE_NAMES = PALETTES.map((p) => p.name);

/* Aspect ratios (w/h) with display labels, weighted toward square-ish. */
const RATIOS: readonly { ratio: number; label: string; w: number }[] = [
  { ratio: 0.66, label: 'Tall', w: 1 },
  { ratio: 0.8, label: 'Portrait', w: 2 },
  { ratio: 1.0, label: 'Square', w: 3 },
  { ratio: 1.4, label: 'Landscape', w: 3 },
  { ratio: 1.85, label: 'Wide', w: 2 },
  { ratio: 2.5, label: 'Panorama', w: 1 },
];
const ASPECT_LABELS = ['Tall', 'Portrait', 'Square', 'Landscape', 'Wide', 'Panorama'];

/** The project's aspect-ratio palette (w/h) — single source for the registry's
    `aspects` (empty-state ghost grid samples real proportions from this). */
export const PRISMS_ASPECTS: readonly number[] = RATIOS.map((r) => r.ratio);

const FLOWS = ['Linear', 'Linear', 'Linear', 'Radial', 'Radial', 'Conic'];
const FLOW_VALUES = ['Linear', 'Radial', 'Conic'];

interface PrismParams {
  palette: Palette;
  flow: string;
  ratio: number;
  aspect: string;
  grain: boolean;
  angle: number; // degrees, for linear / conic
}

function pickRatio(r: () => number): { ratio: number; label: string } {
  const total = RATIOS.reduce((s, x) => s + x.w, 0);
  let acc = 0;
  const t = r() * total;
  for (const x of RATIOS) { acc += x.w; if (t <= acc) return { ratio: x.ratio, label: x.label }; }
  return { ratio: RATIOS[2].ratio, label: RATIOS[2].label };
}

/* Frozen RNG prefix → every trait. */
function castPrisms(r: () => number): PrismParams {
  const palette = pick(PALETTES, r);
  const { ratio, label } = pickRatio(r);
  const flow = pick(FLOWS, r);
  const grain = r() > 0.8;
  const angle = Math.floor(r() * 360);
  return { palette, flow, ratio, aspect: label, grain, angle };
}

function paramsToTraits(p: PrismParams): OutputTraits {
  return {
    Palette: p.palette.name,
    Flow: p.flow,
    Aspect: p.aspect,
    Grain: p.grain ? 'Grain' : 'Clean',
  };
}

function paint(canvas: HTMLCanvasElement, width: number, r: () => number, p: PrismParams): void {
  const W = Math.max(1, Math.floor(width));
  const H = Math.max(1, Math.floor(W / p.ratio));
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { a, b, c } = p.palette;

  let grad: CanvasGradient;
  if (p.flow === 'Radial') {
    // Off-centre focus for depth; deterministic offset from the stream.
    const fx = W * (0.35 + r() * 0.3);
    const fy = H * (0.35 + r() * 0.3);
    const rad = Math.hypot(W, H) * (0.6 + r() * 0.25);
    grad = ctx.createRadialGradient(fx, fy, Math.min(W, H) * 0.02, W / 2, H / 2, rad);
  } else if (p.flow === 'Conic' && typeof ctx.createConicGradient === 'function') {
    grad = ctx.createConicGradient((p.angle * Math.PI) / 180, W / 2, H / 2);
  } else {
    // Linear (also the Conic fallback where unsupported).
    const rad = (p.angle * Math.PI) / 180;
    const dx = Math.sin(rad), dy = -Math.cos(rad);
    const cx = W / 2, cy = H / 2;
    const half = (Math.abs(dx) * W + Math.abs(dy) * H) / 2;
    grad = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  }

  // Slight asymmetric mid stop for variety; clamps keep stops ordered.
  const mid = Math.min(0.78, Math.max(0.32, 0.5 + (r() - 0.5) * 0.3));
  grad.addColorStop(0, a);
  grad.addColorStop(mid, b);
  grad.addColorStop(1, c);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (p.grain) {
    const imgD = ctx.getImageData(0, 0, W, H);
    const d = imgD.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 18; // seeded → deterministic
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(imgD, 0, 0);
  }
}

export const renderPrisms: EngineFn = (canvas, tokenId, width): RenderResult => {
  const r = seededRng(tokenId);
  const p = castPrisms(r);
  paint(canvas, width, r, p);
  return { aspect: p.ratio, traits: paramsToTraits(p) };
};

export const prismsTraits: TraitsFn = (tokenId) => paramsToTraits(castPrisms(seededRng(tokenId)));

/* Artist trait schema. Palette carries subtraits (mood buckets); the rest are
   flat. Every palette sits in exactly one bucket. */
export const prismsSchema: TraitSchema = {
  traits: [
    {
      name: 'Palette',
      values: PALETTE_NAMES,
      subtraits: [
        { name: 'Warm', values: ['EMBER', 'DUNE', 'CLAY', 'WINE'] },
        { name: 'Cool', values: ['TIDE', 'SLATE', 'FROST', 'VERDANT'] },
        { name: 'Lush', values: ['MOSS', 'AURORA', 'ORCHID'] },
        { name: 'Dusk', values: ['PLASMA', 'DUSK', 'CARBON'] },
      ],
    },
    { name: 'Flow', values: FLOW_VALUES },
    { name: 'Aspect', values: ASPECT_LABELS },
    { name: 'Grain', values: ['Clean', 'Grain'] },
  ],
};
