/*
 * Quicksilver — by opus4-8. Sister project to the Electrum halo.
 *
 * Abstract liquid-chrome / ferrofluid. The lead look: dense, spiky encrusted
 * metal masses — every body wears a full 360° ferrofluid spike crown (Rosensweig
 * cones) plus ridged/beaded skin and a stubble carpet, so nothing reads as a
 * clean smooth ball. Each mode is a packed colony filling the frame with metal
 * incident: Crown (one dominant spike-crown + supporting colony), Colony (dense
 * all-over field), Reef (encrusted ridge wall), Flow (diagonal spiked chrome
 * river + spiked pools), Macro (tight crop of two merging spike-encrusted
 * masses). Saturated jewel grounds, heavy iridescent + specular sheen.
 *
 * Deterministic in tokenId — params() fixes the frozen RNG prefix so traitsOf()
 * and render() agree. Painted at native resolution offscreen, blitted to the
 * requested width. Direct port of the approved R&D engine tools/halo/quicksilver3.js
 * (the "big spiky" jury/CEO pick); KIT helpers inlined here so it is self-contained.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

type Ctx = CanvasRenderingContext2D;
type R = () => number;
interface Noise { noise2(x: number, y: number): number; fbm(x: number, y: number, oct?: number, gain?: number, lac?: number): number; }

interface Pal { name: string; g0: string; g1: string; metal: string; irid: number; spec: string; dark: boolean; }

const PALS: Pal[] = [
  { name: 'Aurum', g0: '#f6d479', g1: '#b8731a', metal: '#caa23a', irid: 0.10, spec: '#fff4cf', dark: false },
  { name: 'Mercury', g0: '#eef2f8', g1: '#5b6884', metal: '#aeb8c8', irid: 0.55, spec: '#ffffff', dark: false },
  { name: 'Plasma', g0: '#ff7ae0', g1: '#7d18b8', metal: '#d05ad6', irid: 0.78, spec: '#ffe1ff', dark: false },
  { name: 'Lagoon', g0: '#5ff0d6', g1: '#0c6f8f', metal: '#36c4c0', irid: 0.42, spec: '#e6fffb', dark: false },
  { name: 'Coral', g0: '#ff9a6b', g1: '#c01f55', metal: '#e8584f', irid: 0.04, spec: '#fff0e6', dark: false },
  { name: 'Acid', g0: '#dfff4a', g1: '#3a8f1f', metal: '#a6d62a', irid: 0.30, spec: '#f5ffd6', dark: false },
  { name: 'Cobalt', g0: '#7db8ff', g1: '#1830b8', metal: '#3f7be0', irid: 0.60, spec: '#e6f0ff', dark: false },
  { name: 'Obsidian', g0: '#2b3040', g1: '#070810', metal: '#5b6480', irid: 0.66, spec: '#dfe6ff', dark: true },
  { name: 'Oilslick', g0: '#241038', g1: '#06030c', metal: '#7a4bd0', irid: 0.85, spec: '#ffe6ff', dark: true },
];

const FMTS = [
  { W: 1400, H: 1400, t: 'Square' },
  { W: 1500, H: 1120, t: 'Landscape' },
  { W: 1120, H: 1500, t: 'Portrait' },
] as const;

const MODE_BAG = ['Crown', 'Crown', 'Crown', 'Colony', 'Colony', 'Colony', 'Reef', 'Reef', 'Flow', 'Flow', 'Macro', 'Macro'];
const FINISH = ['High Polish', 'Brushed', 'Wet'];

export const QUICKSILVER_ASPECTS: readonly number[] = [1, 1500 / 1120, 1120 / 1500];
const INVPHI = 0.61803398875;

interface Params {
  pal: Pal; fmt: typeof FMTS[number]; mode: string; finish: string; iridStrength: number; lightAng: number;
  g0: string; g1: string; metal: string; irid: number; spec: string; dark: boolean;
}

/* FROZEN DRAW ORDER — palette, format, mode, finish, iridStrength, lightAng. */
function params(r: R): Params {
  const pal = pick(PALS, r);
  const fmt = pick(FMTS, r);
  const mode = pick(MODE_BAG, r);
  const finish = pick(FINISH, r);
  const iridStrength = 0.55 + r() * 0.45;
  const lightAng = -Math.PI / 2 + (r() - 0.5) * 1.1;
  return { pal, fmt, mode, finish, iridStrength, lightAng, g0: pal.g0, g1: pal.g1, metal: pal.metal, irid: pal.irid, spec: pal.spec, dark: pal.dark };
}

function traitsFrom(p: Params): OutputTraits {
  return { Palette: p.pal.name, Format: p.fmt.t, Mode: p.mode, Finish: p.finish };
}

export const quicksilverTraits: TraitsFn = (tokenId) => traitsFrom(params(seededRng(tokenId)));

/* ── inlined KIT helpers ─────────────────────────────────────────────────────── */
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const rint = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const randn = (r: R) => r() + r() + r() + r() - 2;
function h2r(h: string): [number, number, number] { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function r2h(c: number[]): string { const f = (n: number) => ('0' + Math.round(clamp(n, 0, 255)).toString(16)).slice(-2); return '#' + f(c[0]) + f(c[1]) + f(c[2]); }
function mix(a: string, b: string, t: number): string { const A = h2r(a), B = h2r(b); return r2h([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }
function rgba(h: string, a: number): string { const c = h2r(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function hsl2hex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360; s = clamp(s, 0, 1); l = clamp(l, 0, 1);
  const c = (1 - Math.abs(2 * l - 1)) * s, xx = c * (1 - Math.abs((h / 60) % 2 - 1)), m = l - c / 2;
  let R0 = 0, G0 = 0, B0 = 0;
  if (h < 60) { R0 = c; G0 = xx; } else if (h < 120) { R0 = xx; G0 = c; } else if (h < 180) { G0 = c; B0 = xx; }
  else if (h < 240) { G0 = xx; B0 = c; } else if (h < 300) { R0 = xx; B0 = c; } else { R0 = c; B0 = xx; }
  return r2h([(R0 + m) * 255, (G0 + m) * 255, (B0 + m) * 255]);
}
function iridescent(phase: number, sat: number, light: number): string { return hsl2hex((phase * 360 % 360 + 360) % 360, sat == null ? 0.85 : sat, light == null ? 0.6 : light); }
function grain(x: Ctx, W: number, H: number, amt: number, r: R) { const n = Math.floor(W * H / amt); for (let i = 0; i < n; i++) { const g = r() < 0.5 ? 0 : 255; x.fillStyle = `rgba(${g},${g},${g},${0.015 + r() * 0.05})`; x.fillRect(r() * W, r() * H, 1, 1); } }
function vignette(x: Ctx, W: number, H: number, s: number) { const g = x.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${s})`); x.fillStyle = g; x.fillRect(0, 0, W, H); }
function mottle(x: Ctx, x0: number, y0: number, w: number, h: number, col: string, density: number, r: R, blend: GlobalCompositeOperation) { x.save(); x.globalCompositeOperation = blend || 'overlay'; const n = Math.floor(w * h / density); for (let i = 0; i < n; i++) { const dark = r() < 0.5; const c = dark ? mix(col, '#000', 0.34) : mix(col, '#fff', 0.32); const s = 0.8 + r() * 2.2; x.fillStyle = rgba(c, 0.04 + r() * 0.09); x.fillRect(x0 + r() * w, y0 + r() * h, s, s); } x.restore(); }
function bloom(x: Ctx, cx: number, cy: number, rad: number, col: string, a0: number) { x.save(); x.globalCompositeOperation = 'lighter'; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, rgba(col, a0)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore(); }
function sheen(x: Ctx, cx: number, cy: number, rad: number, col: string, a0: number) { x.save(); x.globalCompositeOperation = 'lighter'; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, rgba(col, a0)); g.addColorStop(0.4, rgba(col, a0 * 0.35)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore(); }
function softShadow(x: Ctx, cx: number, cy: number, rad: number, a: number) { x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, `rgba(0,0,0,${a})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore(); }
function makeNoise(seed: number): Noise {
  const r = seededRng(seed);
  const perm = new Uint8Array(512); const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const grad = (hh: number, xx: number, yy: number) => { const u = (hh & 1) ? xx : -xx, v = (hh & 2) ? yy : -yy; return u + v; };
  function noise2(x: number, y: number) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1], ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    return lerp(lerp(grad(aa, x, y), grad(ba, x - 1, y), u), lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u), v);
  }
  function fbm(x: number, y: number, oct?: number, gain?: number, lac?: number) { oct = oct || 4; gain = gain || 0.5; lac = lac || 2; let a = 0, f = 1, amp = 0.5, n = 0; for (let i = 0; i < oct; i++) { a += amp * noise2(x * f, y * f); n += amp; amp *= gain; f *= lac; } return a / n; }
  return { noise2, fbm };
}
function hazeSheet(x: Ctx, W: number, H: number, noise: Noise, col: string, opacity: number, scale: number, blend: GlobalCompositeOperation) {
  x.save(); x.globalCompositeOperation = blend || 'screen';
  const step = Math.max(3, Math.floor(Math.min(W, H) / 180)); const c = h2r(col);
  for (let yy = 0; yy < H; yy += step) for (let xx = 0; xx < W; xx += step) {
    const n = (noise.fbm(xx / scale, yy / scale, 5, 0.55, 2.1) + 1) / 2;
    const a = clamp(n * n * opacity, 0, 1); if (a < 0.01) continue;
    x.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`; x.fillRect(xx, yy, step + 1, step + 1);
  }
  x.restore();
}
function curl(noise: Noise, x: number, y: number, eps: number): [number, number] { eps = eps || 1; const n1 = noise.fbm(x / 100, (y + eps) / 100, 4), n2 = noise.fbm(x / 100, (y - eps) / 100, 4); const n3 = noise.fbm((x + eps) / 100, y / 100, 4), n4 = noise.fbm((x - eps) / 100, y / 100, 4); return [(n1 - n2) / (2 * eps), -(n3 - n4) / (2 * eps)]; }
function chromaSplit(x: Ctx, W: number, H: number, off: number) {
  try {
    const img = x.getImageData(0, 0, W, H); const d = img.data; const out = x.createImageData(W, H); const o = out.data; const dx = off | 0;
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) { const idx = (y * W + i) * 4; const rx = Math.min(W - 1, i + dx), bx = Math.max(0, i - dx); o[idx] = d[(y * W + rx) * 4]; o[idx + 1] = d[idx + 1]; o[idx + 2] = d[(y * W + bx) * 4 + 2]; o[idx + 3] = 255; }
    x.putImageData(out, 0, 0);
  } catch (e) { /* skip */ }
}

/* ── organic blob outline ── */
function blobPath(x: Ctx, cx: number, cy: number, rad: number, wob: number, noise: Noise, ph: number) {
  const steps = 56; x.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const nr = rad * (1 + wob * 0.5 * noise.noise2(Math.cos(a) * 1.5 + ph, Math.sin(a) * 1.5 + ph * 0.7));
    const px = cx + Math.cos(a) * nr, py = cy + Math.sin(a) * nr;
    if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
  }
  x.closePath();
}

/* ── chrome body (core under the spike crown) ── */
function chromeBlob(x: Ctx, P: Params, cx: number, cy: number, rad: number, light: number, iridStr: number, finish: string, r: R, seedPhase: number, noise: Noise, wob: number, ridge: boolean) {
  wob = wob == null ? 0.20 : wob;
  const ph = (cx * 0.013 + cy * 0.017) % 6.28;
  softShadow(x, cx, cy + rad * 0.42, rad * 1.6, 0.45);
  x.save();
  blobPath(x, cx, cy, rad, wob, noise, ph); x.clip();
  const tilt = Math.sin(ph * 1.7) * 0.5;
  const gdx = Math.sin(tilt) * rad, gdy = Math.cos(tilt) * rad;
  const g = x.createLinearGradient(cx - gdx, cy - gdy, cx + gdx, cy + gdy);
  g.addColorStop(0.00, mix(P.metal, '#05060a', 0.70));
  g.addColorStop(0.16, mix(P.metal, '#ffffff', 0.32));
  g.addColorStop(0.38, mix(P.metal, '#04050a', 0.42));
  g.addColorStop(0.50, mix(P.metal, '#ffffff', 0.96));
  g.addColorStop(0.56, mix(P.metal, '#ffffff', 0.55));
  g.addColorStop(0.74, mix(P.metal, '#05060c', 0.55));
  g.addColorStop(1.00, mix(P.metal, '#ffffff', 0.30));
  x.fillStyle = g; x.fillRect(cx - rad * 1.6, cy - rad * 1.6, rad * 3.2, rad * 3.2);
  x.globalCompositeOperation = 'overlay';
  const eg = x.createLinearGradient(cx, cy - rad, cx, cy + rad);
  eg.addColorStop(0, rgba(P.g0, 0.0));
  eg.addColorStop(0.55, rgba(P.g0, 0.45));
  eg.addColorStop(1, rgba(P.g1, 0.55));
  x.fillStyle = eg; x.fillRect(cx - rad * 1.6, cy - rad * 1.6, rad * 3.2, rad * 3.2);
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const phase = seedPhase + t * 1.5 + P.irid + ph * 0.05;
    const col = iridescent(phase, 0.92, 0.58);
    const yy = cy - rad + t * rad * 2;
    x.fillStyle = rgba(col, 0.06 + iridStr * 0.12);
    x.fillRect(cx - rad * 1.6, yy, rad * 3.2, rad * 2 / bands + 1);
  }
  if (ridge !== false && rad > 16) {
    const folds = rint(r, 7, 12);
    for (let i = 0; i < folds; i++) {
      const rr = rad * (0.18 + r() * 0.74);
      const a0 = r() * Math.PI * 2;
      const span = (0.5 + r() * 1.4);
      const drawFold = (off: number, col: string, alpha: number, lw: number) => {
        x.globalCompositeOperation = 'soft-light';
        x.strokeStyle = rgba(col, alpha); x.lineWidth = Math.max(1, rad * lw); x.lineCap = 'round';
        x.beginPath();
        const steps = 18;
        for (let s = 0; s <= steps; s++) {
          const a = a0 + (s / steps) * span;
          const wr = rr * (1 + 0.16 * noise.noise2(Math.cos(a) * 2.6 + ph + i, Math.sin(a) * 2.6 + i)) + off;
          const px = cx + Math.cos(a) * wr, py = cy + Math.sin(a) * wr;
          if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.stroke();
      };
      drawFold(rad * 0.022, '#ffffff', 0.28, 0.04);
      drawFold(0, '#000000', 0.32, 0.045);
    }
    const lx = Math.cos(light), ly = Math.sin(light);
    const beads = Math.floor(rad * 0.3);
    for (let i = 0; i < beads; i++) {
      const a = r() * Math.PI * 2, dd = (0.55 + r() * 0.35) * rad;
      const bx = cx + Math.cos(a) * dd, by = cy + Math.sin(a) * dd;
      const br = rad * (0.02 + r() * 0.03);
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = rgba('#000', 0.20);
      x.beginPath(); x.arc(bx - lx * br * 0.4, by - ly * br * 0.4, br, 0, 6.283); x.fill();
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba(P.spec, 0.32 + r() * 0.2);
      x.beginPath(); x.arc(bx + lx * br * 0.4, by + ly * br * 0.4, br * 0.5, 0, 6.283); x.fill();
    }
  }
  if (finish === 'Brushed') {
    x.globalCompositeOperation = 'soft-light';
    for (let i = -rad; i < rad; i += 2) {
      x.fillStyle = rgba(i % 4 < 2 ? '#ffffff' : '#000000', 0.05);
      x.fillRect(cx + i, cy - rad * 1.6, 1, rad * 3.2);
    }
  }
  x.restore();
  x.save();
  blobPath(x, cx, cy, rad, wob, noise, ph);
  x.lineWidth = Math.max(1.5, rad * 0.05);
  x.strokeStyle = rgba(mix(P.metal, '#000', 0.72), 0.55);
  x.stroke();
  x.globalCompositeOperation = 'lighter';
  blobPath(x, cx, cy, rad * 0.965, wob, noise, ph);
  x.lineWidth = Math.max(1.4, rad * 0.045);
  x.strokeStyle = rgba(iridescent(seedPhase + 0.3 + P.irid, 0.96, 0.66), 0.55 + iridStr * 0.3);
  x.stroke();
  x.restore();
  const hx = cx + Math.cos(light) * rad * 0.46;
  const hy = cy + Math.sin(light) * rad * 0.46;
  sheen(x, hx, hy, rad * 0.5, P.spec, 0.6);
  sheen(x, hx, hy, rad * 0.14, '#ffffff', 0.95);
}

/* ── ferrofluid spike (Rosensweig cone) ── */
function spike(x: Ctx, P: Params, bx: number, by: number, len: number, baseW: number, ang: number, light: number, iridStr: number, r: R, seedPhase: number, noise: Noise, shadow: boolean) {
  const bend = (r() - 0.5) * len * 0.35;
  const ux = Math.cos(ang), uy = Math.sin(ang);
  const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2);
  const tx = bx + ux * len + px * bend, ty = by + uy * len + py * bend;
  const mx = bx + ux * len * 0.5 + px * bend * 0.5, my = by + uy * len * 0.5 + py * bend * 0.5;
  if (shadow !== false) softShadow(x, bx, by + baseW * 0.4, baseW * 2.2, 0.32);
  x.save();
  x.beginPath();
  x.moveTo(bx + px * baseW, by + py * baseW);
  x.bezierCurveTo(bx + ux * len * 0.18 + px * baseW * 0.9, by + uy * len * 0.18 + py * baseW * 0.9, mx + px * baseW * 0.22, my + py * baseW * 0.22, tx, ty);
  x.bezierCurveTo(mx - px * baseW * 0.22, my - py * baseW * 0.22, bx + ux * len * 0.18 - px * baseW * 0.9, by + uy * len * 0.18 - py * baseW * 0.9, bx - px * baseW, by - py * baseW);
  x.closePath();
  x.clip();
  const g = x.createLinearGradient(bx + px * baseW, by + py * baseW, bx - px * baseW, by - py * baseW);
  g.addColorStop(0.0, mix(P.metal, '#05060a', 0.6));
  g.addColorStop(0.4, mix(P.metal, '#ffffff', 0.95));
  g.addColorStop(0.6, mix(P.metal, '#06070c', 0.42));
  g.addColorStop(1.0, mix(P.metal, '#ffffff', 0.35));
  const bb = baseW * 2 + len;
  x.fillStyle = g;
  x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
  x.globalCompositeOperation = 'overlay';
  const ag = x.createLinearGradient(bx, by, tx, ty);
  ag.addColorStop(0, rgba(P.g1, 0.4));
  ag.addColorStop(0.7, rgba('#000000', 0.0));
  ag.addColorStop(1, rgba(P.spec, 0.35));
  x.fillStyle = ag;
  x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
  x.fillStyle = rgba(iridescent(seedPhase + P.irid + 0.2, 0.92, 0.6), 0.13 * iridStr);
  x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
  x.restore();
  x.save(); x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(P.spec, 0.4); x.lineWidth = Math.max(1, baseW * 0.14); x.lineCap = 'round';
  x.beginPath();
  x.moveTo(bx + px * baseW * 0.45, by + py * baseW * 0.45);
  x.quadraticCurveTo(mx + px * baseW * 0.12, my + py * baseW * 0.12, bx + ux * len * 0.82 + px * bend * 0.82, by + uy * len * 0.82 + py * bend * 0.82);
  x.stroke();
  x.restore();
}

/* ── FERRO BODY: chrome mass that always wears a spike crown + ridged skin ── */
function ferroBody(x: Ctx, P: Params, cx: number, cy: number, rad: number, light: number, iridStr: number, finish: string, r: R, seedPhase: number, noise: Noise, opts: { spikeAmt?: number; wob?: number; upBias?: number }) {
  opts = opts || {};
  const spikeAmt = opts.spikeAmt == null ? 1 : opts.spikeAmt;
  const wob = opts.wob == null ? 0.24 : opts.wob;
  const upBias = opts.upBias == null ? 1 : opts.upBias;
  const nBack = Math.round(rint(r, 16, 22) * spikeAmt);
  const backSpikes: { a: number; len: number; bw: number; bx: number; by: number; up: number }[] = [];
  for (let i = 0; i < nBack; i++) {
    const a = (i / nBack) * Math.PI * 2 + (r() - 0.5) * (Math.PI / nBack) * 1.4;
    const up = (-Math.sin(a) + 1) / 2;
    const len = rad * (0.75 + up * upBias * 1.15 + Math.abs(randn(r)) * 0.45);
    const bw = rad * (0.13 + r() * 0.08) * (0.75 + up * 0.4);
    const bx = cx + Math.cos(a) * rad * 0.82, by = cy + Math.sin(a) * rad * 0.78;
    backSpikes.push({ a, len, bw, bx, by, up });
  }
  for (const s of backSpikes) if (Math.sin(s.a) > 0.15) spike(x, P, s.bx, s.by, s.len, s.bw, s.a, light, iridStr, r, seedPhase, noise, true);
  chromeBlob(x, P, cx, cy, rad, light, iridStr, finish, r, seedPhase, noise, wob, true);
  const front = backSpikes.filter((s) => Math.sin(s.a) <= 0.15).sort((s1, s2) => s1.by - s2.by);
  for (const s of front) {
    spike(x, P, s.bx, s.by, s.len, s.bw, s.a, light, iridStr, r, seedPhase, noise, false);
    if (r() < 0.4) {
      const da = (r() - 0.5) * 0.6;
      spike(x, P, s.bx + Math.cos(s.a) * s.len * 0.18, s.by + Math.sin(s.a) * s.len * 0.18, s.len * (0.4 + r() * 0.35), s.bw * 0.7, s.a + da, light, iridStr, r, seedPhase, noise, false);
    }
  }
  const nFr = Math.round((26 + rad * 0.22) * spikeAmt);
  for (let i = 0; i < nFr; i++) {
    const a = (i / nFr) * Math.PI * 2 + (r() - 0.5) * 0.22;
    const up = (-Math.sin(a) + 1) / 2;
    const len = rad * (0.16 + up * 0.26 + Math.abs(randn(r)) * 0.18);
    const bw = rad * (0.04 + r() * 0.035);
    const bx = cx + Math.cos(a) * rad * 0.95, by = cy + Math.sin(a) * rad * 0.92;
    spike(x, P, bx, by, len, bw, a, light, iridStr, r, seedPhase, noise, false);
  }
  const nStub = Math.round(rad * rad * 0.012 * spikeAmt);
  for (let i = 0; i < nStub; i++) {
    const a = r() * Math.PI * 2;
    const up = (-Math.sin(a) + 1) / 2;
    if (r() > 0.35 + up * 0.6) continue;
    const dd = (0.25 + Math.sqrt(r()) * 0.65) * rad;
    const bx = cx + Math.cos(a) * dd, by = cy + Math.sin(a) * dd;
    const len = rad * (0.08 + r() * 0.16);
    const bw = rad * (0.025 + r() * 0.03);
    spike(x, P, bx, by, len, bw, a + (r() - 0.5) * 0.45, light, iridStr, r, seedPhase, noise, false);
  }
  const hx = cx + Math.cos(light) * rad * 0.4, hy = cy + Math.sin(light) * rad * 0.4;
  sheen(x, hx, hy, rad * 0.24, P.spec, 0.28);
}

function groundReflection(x: Ctx, gx: number, gy: number, gw: number) {
  x.save();
  x.globalCompositeOperation = 'multiply';
  const sg = x.createRadialGradient(gx, gy, 0, gx, gy, gw);
  sg.addColorStop(0, 'rgba(0,0,0,0.30)');
  sg.addColorStop(0.6, 'rgba(0,0,0,0.12)');
  sg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = sg;
  x.save(); x.translate(gx, gy); x.scale(1, 0.32); x.translate(-gx, -gy);
  x.fillRect(gx - gw, gy - gw, gw * 2, gw * 2); x.restore();
  x.restore();
}

function paint(canvas: HTMLCanvasElement, tokenId: number): Params {
  const r = seededRng(tokenId);
  const P = params(r);
  const W = P.fmt.W, H = P.fmt.H;
  canvas.width = W; canvas.height = H;
  const x = canvas.getContext('2d');
  if (!x) return P;
  const noise = makeNoise(tokenId ^ 0x9e37);
  const seedPhase = r();
  const minD = Math.min(W, H);
  const IS = P.iridStrength;

  const gg = x.createLinearGradient(0, 0, W * 0.2, H);
  gg.addColorStop(0, mix(P.g0, '#ffffff', P.dark ? 0.04 : 0.12));
  gg.addColorStop(0.55, P.g0);
  gg.addColorStop(1, P.g1);
  x.fillStyle = gg; x.fillRect(0, 0, W, H);
  const lcx = W * (0.35 + r() * 0.3), lcy = H * (0.3 + r() * 0.25);
  bloom(x, lcx, lcy, minD * 0.9, mix(P.g0, '#ffffff', 0.5), P.dark ? 0.18 : 0.32);
  hazeSheet(x, W, H, noise, mix(P.g1, '#ffffff', 0.3), P.dark ? 0.10 : 0.16, minD * 0.55, 'screen');

  const light = P.lightAng;
  const thirdsX = r() < 0.5 ? W * (1 - INVPHI) : W * INVPHI;
  const fx = thirdsX;
  const fy = H * (0.40 + r() * 0.12);

  function colony(centers: { bx: number; by: number; rad: number }[]) {
    centers.sort((a, b) => b.rad - a.rad);
    for (const c of centers) {
      if (c.rad < minD * 0.03) {
        chromeBlob(x as Ctx, P, c.bx, c.by, c.rad, light, IS, P.finish, r, seedPhase + c.bx * 0.001, noise, 0.3, c.rad > 18);
      } else {
        ferroBody(x as Ctx, P, c.bx, c.by, c.rad, light, IS, P.finish, r, seedPhase + c.bx * 0.001, noise, { spikeAmt: 1.0 + r() * 0.3, wob: 0.28 + r() * 0.14, upBias: 0.9 + r() * 0.9 });
      }
    }
  }

  if (P.mode === 'Crown') {
    const Rr = minD * (0.20 + r() * 0.05);
    const ccx = fx, ccy = H * (0.50 + r() * 0.08);
    groundReflection(x, ccx, ccy + Rr * 0.95, Rr * 2.1);
    const sup: { bx: number; by: number; rad: number }[] = [];
    const supN = rint(r, 10, 14);
    for (let i = 0; i < supN; i++) {
      const bx = W * (0.08 + r() * 0.84), by = H * (0.12 + r() * 0.80);
      if (Math.hypot(bx - ccx, by - ccy) < Rr * 1.3) continue;
      sup.push({ bx, by, rad: minD * (0.04 + Math.pow(r(), 1.5) * 0.10) });
    }
    colony(sup);
    ferroBody(x, P, ccx, ccy, Rr, light, IS, P.finish, r, seedPhase, noise, { spikeAmt: 1.4, wob: 0.26, upBias: 1.5 });
    for (let i = 0; i < rint(r, 5, 8); i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.0, dd = Rr * (1.6 + r() * 1.4);
      chromeBlob(x, P, ccx + Math.cos(a) * dd, ccy + Math.sin(a) * dd, Rr * (0.05 + r() * 0.08), light, IS, P.finish, r, seedPhase + 0.1, noise, 0.3, false);
    }
  } else if (P.mode === 'Colony') {
    const centers: { bx: number; by: number; rad: number }[] = [];
    centers.push({ bx: fx, by: fy, rad: minD * (0.15 + r() * 0.05) });
    centers.push({ bx: W - fx + (r() - 0.5) * W * 0.1, by: H * (0.62 + r() * 0.12), rad: minD * (0.12 + r() * 0.05) });
    const cols = 4, rows = 4;
    for (let gx = 0; gx < cols; gx++) {
      for (let gy = 0; gy < rows; gy++) {
        const bx = W * ((gx + 0.5) / cols) + (r() - 0.5) * W / cols * 0.9;
        const by = H * ((gy + 0.5) / rows) + (r() - 0.5) * H / rows * 0.9;
        centers.push({ bx, by, rad: minD * (0.04 + Math.pow(r(), 1.4) * 0.085) });
      }
    }
    colony(centers);
  } else if (P.mode === 'Reef') {
    const baseY = H * (0.45 + (r() - 0.5) * 0.12);
    const amp = H * (0.14 + r() * 0.08);
    const n = rint(r, 11, 15);
    const reef: { bx: number; by: number; rad: number }[] = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const bx = W * (t * 1.06 - 0.03);
      const by = baseY + Math.sin(t * Math.PI * (1.5 + r() * 1.5) + seedPhase * 6) * amp + (r() - 0.5) * H * 0.06;
      reef.push({ bx, by, rad: minD * (0.085 + Math.pow(r(), 1.2) * 0.075) });
    }
    for (let i = 0; i < rint(r, 8, 12); i++) {
      reef.push({ bx: W * (0.04 + r() * 0.92), by: H * (0.7 + r() * 0.26), rad: minD * (0.035 + Math.pow(r(), 1.5) * 0.06) });
    }
    for (let i = 0; i < rint(r, 4, 6); i++) {
      reef.push({ bx: W * (0.04 + r() * 0.92), by: H * (0.06 + r() * 0.22), rad: minD * (0.03 + Math.pow(r(), 1.6) * 0.05) });
    }
    colony(reef);
  } else if (P.mode === 'Flow') {
    const dir = r() < 0.5 ? 1 : -1;
    const river = (sx: number, sy: number, axisAng: number, baseW: number, span: number, steps: number, perturb: number, phaseOff: number, withPools: boolean) => {
      const ux = Math.cos(axisAng), uy = Math.sin(axisAng);
      const pxp = -uy, pyp = ux;
      let px = sx, py = sy; const segs: [number, number][] = [];
      const stepLen = span / steps;
      for (let s = 0; s < steps; s++) {
        segs.push([px, py]);
        const c = curl(noise, px * 1.1, py * 1.1, 1.6);
        const lateral = (c[0] + c[1]) * 0.5 * perturb;
        px += ux * stepLen + pxp * lateral;
        py += uy * stepLen + pyp * lateral;
        if (px < -W * 0.6 || px > W * 1.6 || py < -H * 0.6 || py > H * 1.6) break;
      }
      if (segs.length < 4) return;
      const mid = segs[Math.floor(segs.length / 2)];
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(0,0,0,0.32)';
      x.lineWidth = baseW * 1.4; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(segs[0][0] + 8, segs[0][1] + 12);
      for (const s of segs) x.lineTo(s[0] + 8, s[1] + 12); x.stroke(); x.restore();
      const cg = x.createLinearGradient(mid[0] - pxp * baseW, mid[1] - pyp * baseW, mid[0] + pxp * baseW, mid[1] + pyp * baseW);
      cg.addColorStop(0, mix(P.metal, '#05060a', 0.5));
      cg.addColorStop(0.42, mix(P.metal, '#ffffff', 0.92));
      cg.addColorStop(0.62, mix(P.metal, '#06070c', 0.3));
      cg.addColorStop(1, mix(P.metal, '#ffffff', 0.45));
      x.save(); x.strokeStyle = cg; x.lineWidth = baseW; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(segs[0][0], segs[0][1]);
      for (const s of segs) x.lineTo(s[0], s[1]); x.stroke();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = rgba(P.spec, 0.5); x.lineWidth = baseW * 0.2;
      x.beginPath(); x.moveTo(segs[0][0] - pxp * baseW * 0.18, segs[0][1] - pyp * baseW * 0.18);
      for (const s of segs) x.lineTo(s[0] - pxp * baseW * 0.18, s[1] - pyp * baseW * 0.18); x.stroke();
      x.strokeStyle = rgba(iridescent(seedPhase + phaseOff + P.irid, 0.95, 0.65), 0.55 * IS);
      x.lineWidth = baseW * 0.28;
      x.beginPath(); x.moveTo(segs[0][0] + pxp * baseW * 0.2, segs[0][1] + pyp * baseW * 0.2);
      for (const s of segs) x.lineTo(s[0] + pxp * baseW * 0.2, s[1] + pyp * baseW * 0.2); x.stroke();
      x.restore();
      for (let i = 4; i < segs.length - 4; i += 3) {
        const s = segs[i];
        if (s[0] < -baseW || s[0] > W + baseW || s[1] < -baseW || s[1] > H + baseW) continue;
        if (r() < 0.45) continue;
        const sa = Math.atan2(-pyp, -pxp);
        const len = baseW * (0.8 + r() * 1.6);
        spike(x, P, s[0] - pxp * baseW * 0.3, s[1] - pyp * baseW * 0.3, len, baseW * (0.2 + r() * 0.18), sa + (r() - 0.5) * 0.5, light, IS, r, seedPhase, noise, false);
      }
      if (withPools) {
        const inFrame = segs.filter((s) => s[0] > -baseW && s[0] < W + baseW && s[1] > -baseW && s[1] < H + baseW);
        const pool = inFrame.length ? inFrame : segs;
        for (let b = 0; b < rint(r, 3, 5); b++) {
          const sp = pool[Math.floor(r() * pool.length)];
          ferroBody(x, P, sp[0], sp[1], baseW * (1.0 + r() * 1.2), light, IS, P.finish, r, seedPhase, noise, { spikeAmt: 1.1, wob: 0.24, upBias: 1.2 });
        }
      }
    };
    const mainW = minD * (0.11 + r() * 0.05);
    const baseAng = (0.13 + r() * 0.12) * Math.PI;
    const axisAng = dir > 0 ? baseAng : Math.PI - baseAng;
    const ux = Math.cos(axisAng), uy = Math.sin(axisAng);
    const back = Math.hypot(W, H) * 0.62;
    const span = back * 2.2;
    const cxF = W * 0.5, cyF = H * 0.5;
    const sx = cxF - ux * back, sy = cyF - uy * back;
    river(sx, sy, axisAng, mainW, span, 260, mainW * 0.5, 0.0, true);
    for (let t = 0; t < rint(r, 2, 3); t++) {
      const ta = axisAng + (r() - 0.5) * 0.55;
      const offp = (r() - 0.5) * minD * 0.55;
      const uxt = Math.cos(ta), uyt = Math.sin(ta);
      const tsx = cxF - uxt * back - (-uyt) * offp;
      const tsy = cyF - uyt * back - (uxt) * offp;
      river(tsx, tsy, ta, mainW * (0.4 + r() * 0.3), span, 260, mainW * 0.5, 0.3 + t * 0.2, t === 0);
    }
    const scat: { bx: number; by: number; rad: number }[] = [];
    for (let i = 0; i < rint(r, 8, 12); i++) {
      scat.push({ bx: W * (0.05 + r() * 0.9), by: H * (0.05 + r() * 0.9), rad: minD * (0.035 + Math.pow(r(), 1.6) * 0.06) });
    }
    colony(scat);
  } else { // Macro
    const sep = minD * (0.26 + r() * 0.06);
    const mergeAng = r() * Math.PI;
    const mx = Math.cos(mergeAng), my = Math.sin(mergeAng);
    const cX = W * (0.5 + (r() - 0.5) * 0.12), cY = H * (0.5 + (r() - 0.5) * 0.12);
    const R1 = minD * (0.32 + r() * 0.07);
    const R2 = R1 * (0.78 + r() * 0.18);
    const a1x = cX - mx * sep, a1y = cY - my * sep;
    const a2x = cX + mx * sep, a2y = cY + my * sep;
    groundReflection(x, cX, cY + R1 * 0.7, R1 * 2.0);
    x.save();
    const ng = x.createLinearGradient(a1x, a1y, a2x, a2y);
    ng.addColorStop(0, mix(P.metal, '#ffffff', 0.5));
    ng.addColorStop(0.5, mix(P.metal, '#06070c', 0.25));
    ng.addColorStop(1, mix(P.metal, '#ffffff', 0.5));
    x.strokeStyle = ng; x.lineWidth = Math.min(R1, R2) * 1.15; x.lineCap = 'round';
    x.beginPath(); x.moveTo(a1x, a1y); x.lineTo(a2x, a2y); x.stroke();
    x.restore();
    const sats: { bx: number; by: number; rad: number }[] = [];
    for (let i = 0; i < rint(r, 7, 10); i++) {
      const a = r() * Math.PI * 2, dd = (R1 + R2) * (0.9 + r() * 0.8);
      sats.push({ bx: cX + Math.cos(a) * dd, by: cY + Math.sin(a) * dd, rad: minD * (0.04 + Math.pow(r(), 1.5) * 0.08) });
    }
    colony(sats);
    ferroBody(x, P, a2x, a2y, R2, light, IS, P.finish, r, seedPhase + 0.04, noise, { spikeAmt: 1.2, wob: 0.26, upBias: 1.1 });
    ferroBody(x, P, a1x, a1y, R1, light, IS, P.finish, r, seedPhase, noise, { spikeAmt: 1.3, wob: 0.26, upBias: 1.2 });
    for (let i = 0; i < rint(r, 4, 6); i++) {
      const t = 0.32 + r() * 0.36;
      const px = a1x + (a2x - a1x) * t + (r() - 0.5) * R1 * 0.4;
      const py = a1y + (a2y - a1y) * t + (r() - 0.5) * R1 * 0.4;
      chromeBlob(x, P, px, py, minD * (0.03 + r() * 0.05), light, IS, P.finish, r, seedPhase, noise, 0.28, true);
    }
  }

  hazeSheet(x, W, H, noise, mix(P.g0, '#ffffff', 0.4), P.dark ? 0.06 : 0.10, minD * 0.4, 'screen');
  bloom(x, lcx, lcy, minD * 0.6, P.spec, 0.12);
  mottle(x, 0, 0, W, H, P.metal, 2600, r, 'overlay');
  chromaSplit(x, W, H, 1);
  grain(x, W, H, 26, r);
  vignette(x, W, H, P.dark ? 0.42 : 0.26);
  return P;
}

export const renderQuicksilver: EngineFn = (canvas, tokenId, width) => {
  const off = document.createElement('canvas');
  const p = paint(off, tokenId);
  const W = Math.max(1, Math.floor(width));
  const H = Math.max(1, Math.round((W * off.height) / off.width));
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(off, 0, 0, W, H);
  return { aspect: off.width / off.height, traits: traitsFrom(p) };
};

export const quicksilverSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format', values: ['Square', 'Landscape', 'Portrait'] },
    { name: 'Mode', values: ['Crown', 'Colony', 'Reef', 'Flow', 'Macro'] },
    { name: 'Finish', values: ['High Polish', 'Brushed', 'Wet'] },
  ],
};
