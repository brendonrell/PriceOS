/*
 * Quicksilver — LIQUID CHROME / FERROFLUID.
 *
 * Molten metal as pure abstraction: merging metaball pools, ferrofluid spike
 * crowns, flowing chrome rivulets and bead chains. Polished mirror-chrome
 * surfaces with heavy thin-film (oil-slick) iridescence, tight specular sheen,
 * and soft ambient-occlusion under every form. Wet, reflective, alive.
 *
 * Four modes: Crown (a central mound bristling with ferrofluid horns),
 * Coalescence (large metaball blobs merging with chrome necks), Rivulet
 * (chrome streams flowing down a curl field, pooling into beads), and Bead
 * Field (mercury beads strung along curl chains). Three finishes (High Polish,
 * Brushed, Wet).
 *
 * Deterministic in tokenId — params() fixes the frozen RNG prefix so
 * quicksilverTraits() and renderQuicksilver() agree. Painted at native
 * resolution offscreen, blitted to the requested width. Direct port of
 * tools/halo/aurum.js (the judged R&D engine); KIT helpers are inlined here so
 * it is self-contained.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

type Ctx = CanvasRenderingContext2D;
type R = () => number;
interface Noise { noise2(x: number, y: number): number; fbm(x: number, y: number, oct?: number, gain?: number, lac?: number): number; }

interface Pal {
  name: string; g0: string; g1: string; metal: string; irid: number; spec: string; dark: boolean;
}

/* Colorways. Mostly bright/saturated grounds; 2 dark for range. `grad` pairs
   define the ground wash (g0→g1). `metal` is the base hue the chrome ramp
   pulls from; `irid` biases the thin-film band; `spec` is the highlight tint. */
const PALS: Pal[] = [
  { name: 'Aurum',     g0: '#f6d479', g1: '#b8731a', metal: '#caa23a', irid: 0.10, spec: '#fff4cf', dark: false },
  { name: 'Mercury',   g0: '#eef2f8', g1: '#5b6884', metal: '#aeb8c8', irid: 0.55, spec: '#ffffff', dark: false },
  { name: 'Plasma',    g0: '#ff7ae0', g1: '#7d18b8', metal: '#d05ad6', irid: 0.78, spec: '#ffe1ff', dark: false },
  { name: 'Lagoon',    g0: '#5ff0d6', g1: '#0c6f8f', metal: '#36c4c0', irid: 0.42, spec: '#e6fffb', dark: false },
  { name: 'Coral',     g0: '#ff9a6b', g1: '#c01f55', metal: '#e8584f', irid: 0.04, spec: '#fff0e6', dark: false },
  { name: 'Acid',      g0: '#dfff4a', g1: '#3a8f1f', metal: '#a6d62a', irid: 0.30, spec: '#f5ffd6', dark: false },
  { name: 'Cobalt',    g0: '#7db8ff', g1: '#1830b8', metal: '#3f7be0', irid: 0.60, spec: '#e6f0ff', dark: false },
  { name: 'Obsidian',  g0: '#2b3040', g1: '#070810', metal: '#5b6480', irid: 0.66, spec: '#dfe6ff', dark: true },
  { name: 'Oilslick',  g0: '#241038', g1: '#06030c', metal: '#7a4bd0', irid: 0.85, spec: '#ffe6ff', dark: true },
];

const FMTS = [
  { W: 1400, H: 1400, t: 'Square' },
  { W: 1500, H: 1120, t: 'Landscape' },
  { W: 1120, H: 1500, t: 'Portrait' },
] as const;

const MODES = ['Crown', 'Coalescence', 'Rivulet', 'Bead Field'];
const FINISH = ['High Polish', 'Brushed', 'Wet'];

export const QUICKSILVER_ASPECTS: readonly number[] = [1, 1500 / 1120, 1120 / 1500];

interface Params {
  pal: Pal; fmt: typeof FMTS[number]; mode: string; finish: string;
  iridStrength: number; lightAng: number;
  g0: string; g1: string; metal: string; irid: number; spec: string; dark: boolean;
}

/* FROZEN DRAW ORDER — palette, format, mode, finish, iridStrength, lightAng. */
function params(r: R): Params {
  const pal = pick(PALS, r);
  const fmt = pick(FMTS, r);
  const mode = pick(MODES, r);
  const finish = pick(FINISH, r);
  const iridStrength = 0.55 + r() * 0.45; // how much oil-slick on the metal
  const lightAng = -Math.PI / 2 + (r() - 0.5) * 1.1; // global light from upper area
  // flatten palette fields onto P for convenience (g0,g1,metal,irid,spec,dark)
  return { pal, fmt, mode, finish, iridStrength, lightAng,
    g0: pal.g0, g1: pal.g1, metal: pal.metal, irid: pal.irid, spec: pal.spec, dark: pal.dark };
}

function traitsFrom(p: Params): OutputTraits {
  return { Palette: p.pal.name, Format: p.fmt.t, Mode: p.mode, Finish: p.finish };
}

export const quicksilverTraits: TraitsFn = (tokenId) => traitsFrom(params(seededRng(tokenId)));

/* ── inlined KIT helpers (self-contained) ───────────────────────────────────── */
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
function iridescent(phase: number, sat: number, light: number): string {
  const h = ((phase * 360) % 360 + 360) % 360;
  return hsl2hex(h, sat == null ? 0.85 : sat, light == null ? 0.6 : light);
}
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
function curl(noise: Noise, x: number, y: number, eps: number): [number, number] {
  eps = eps || 1;
  const n1 = noise.fbm((x) / 100, (y + eps) / 100, 4), n2 = noise.fbm((x) / 100, (y - eps) / 100, 4);
  const n3 = noise.fbm((x + eps) / 100, (y) / 100, 4), n4 = noise.fbm((x - eps) / 100, (y) / 100, 4);
  return [(n1 - n2) / (2 * eps), -(n3 - n4) / (2 * eps)];
}
function chromaSplit(x: Ctx, W: number, H: number, off: number) {
  try {
    const img = x.getImageData(0, 0, W, H); const d = img.data; const out = x.createImageData(W, H); const o = out.data; const dx = off | 0;
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) { const idx = (y * W + i) * 4; const rx = Math.min(W - 1, i + dx), bx = Math.max(0, i - dx); o[idx] = d[(y * W + rx) * 4]; o[idx + 1] = d[idx + 1]; o[idx + 2] = d[(y * W + bx) * 4 + 2]; o[idx + 3] = 255; }
    x.putImageData(out, 0, 0);
  } catch (e) { /* tainted/unsupported — skip */ }
}

/* trace an organic (noise-perturbed) blob outline so forms read as liquid
   metal pools, not glass marbles. `wob` 0 = circle, higher = more deformed. */
function blobPath(x: Ctx, cx: number, cy: number, rad: number, wob: number, noise: Noise, ph: number) {
  const steps = 48;
  x.beginPath();
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const nr = rad * (1 + wob * 0.5 * noise.noise2(Math.cos(a) * 1.3 + ph, Math.sin(a) * 1.3 + ph * 0.7));
    const px = cx + Math.cos(a) * nr, py = cy + Math.sin(a) * nr;
    if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
  }
  x.closePath();
}

/* ── shaded chrome blob: an organic metal body with mirror-ramp banding, a
   reflected horizon, thin-film iridescence, a tight specular hotspot and a
   soft ambient-occlusion contact shadow. ── */
function chromeBlob(x: Ctx, P: Params, cx: number, cy: number, rad: number, light: number, iridStr: number, finish: string, r: R, seedPhase: number, noise: Noise, wob?: number) {
  wob = wob == null ? 0.18 : wob;
  const ph = (cx * 0.013 + cy * 0.017) % 6.28;
  // soft contact shadow below
  softShadow(x, cx, cy + rad * 0.42, rad * 1.6, 0.45);

  x.save();
  blobPath(x, cx, cy, rad, wob, noise, ph); x.clip();

  // base metal body — vertical mirror ramp (dark top, bright belly, dark base)
  const g = x.createLinearGradient(cx, cy - rad, cx, cy + rad);
  g.addColorStop(0.00, mix(P.metal, '#05060a', 0.70));
  g.addColorStop(0.16, mix(P.metal, '#ffffff', 0.32));
  g.addColorStop(0.38, mix(P.metal, '#04050a', 0.42));
  g.addColorStop(0.50, mix(P.metal, '#ffffff', 0.96)); // bright reflected horizon
  g.addColorStop(0.56, mix(P.metal, '#ffffff', 0.55));
  g.addColorStop(0.74, mix(P.metal, '#05060c', 0.55));
  g.addColorStop(1.00, mix(P.metal, '#ffffff', 0.30));
  x.fillStyle = g; x.fillRect(cx - rad * 1.6, cy - rad * 1.6, rad * 3.2, rad * 3.2);

  // reflected environment tint: pull the ground color into the lower belly so
  // the metal mirrors its surroundings (key chrome cue)
  x.globalCompositeOperation = 'overlay';
  const eg = x.createLinearGradient(cx, cy - rad, cx, cy + rad);
  eg.addColorStop(0, rgba(P.g0, 0.0));
  eg.addColorStop(0.55, rgba(P.g0, 0.45));
  eg.addColorStop(1, rgba(P.g1, 0.55));
  x.fillStyle = eg; x.fillRect(cx - rad * 1.6, cy - rad * 1.6, rad * 3.2, rad * 3.2);

  // thin-film iridescent sweep across the body (oil-slick)
  const bands = 9;
  for (let i = 0; i < bands; i++) {
    const t = i / bands;
    const phase = seedPhase + t * 1.5 + P.irid + ph * 0.05;
    const col = iridescent(phase, 0.92, 0.58);
    const yy = cy - rad + t * rad * 2;
    x.fillStyle = rgba(col, 0.06 + iridStr * 0.12);
    x.fillRect(cx - rad * 1.6, yy, rad * 3.2, rad * 2 / bands + 1);
  }

  // brushed finish: faint vertical streaks
  if (finish === 'Brushed') {
    x.globalCompositeOperation = 'soft-light';
    for (let i = -rad; i < rad; i += 2) {
      x.fillStyle = rgba(i % 4 < 2 ? '#ffffff' : '#000000', 0.05);
      x.fillRect(cx + i, cy - rad * 1.6, 1, rad * 3.2);
    }
  }
  x.restore();

  // dark rim terminator
  x.save();
  blobPath(x, cx, cy, rad, wob, noise, ph);
  x.lineWidth = Math.max(1.5, rad * 0.05);
  x.strokeStyle = rgba(mix(P.metal, '#000', 0.72), 0.55);
  x.stroke();
  // iridescent rim-light on the lit edge
  x.globalCompositeOperation = 'lighter';
  blobPath(x, cx, cy, rad * 0.965, wob, noise, ph);
  x.lineWidth = Math.max(1.4, rad * 0.045);
  x.strokeStyle = rgba(iridescent(seedPhase + 0.3 + P.irid, 0.96, 0.66), 0.55 + iridStr * 0.3);
  x.stroke();
  x.restore();

  // tight specular hotspot on the lit upper side
  const hx = cx + Math.cos(light) * rad * 0.46;
  const hy = cy + Math.sin(light) * rad * 0.46;
  sheen(x, hx, hy, rad * 0.5, P.spec, 0.6);
  sheen(x, hx, hy, rad * 0.14, '#ffffff', 0.95);
}

/* ── ferrofluid spike: a curved chrome horn that bulges at the base and tapers
   to a fine point — the signature Rosensweig-instability cone. ── */
function spike(x: Ctx, P: Params, bx: number, by: number, len: number, baseW: number, ang: number, light: number, iridStr: number, r: R, seedPhase: number, noise: Noise) {
  // curve the spike sideways a touch for organic life
  const bend = (r() - 0.5) * len * 0.35;
  const ux = Math.cos(ang), uy = Math.sin(ang);            // axis
  const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2); // perp
  const tx = bx + ux * len + px * bend, ty = by + uy * len + py * bend;
  const mx = bx + ux * len * 0.5 + px * bend * 0.5, my = by + uy * len * 0.5 + py * bend * 0.5;
  // contact shadow at the base
  softShadow(x, bx, by + baseW * 0.4, baseW * 2.2, 0.32);
  x.save();
  // body: a bulged base (concave flanks) sweeping to a sharp tip
  x.beginPath();
  x.moveTo(bx + px * baseW, by + py * baseW);
  // right flank curves inward then to tip
  x.bezierCurveTo(
    bx + ux * len * 0.18 + px * baseW * 0.9, by + uy * len * 0.18 + py * baseW * 0.9,
    mx + px * baseW * 0.22, my + py * baseW * 0.22,
    tx, ty);
  // left flank back to base
  x.bezierCurveTo(
    mx - px * baseW * 0.22, my - py * baseW * 0.22,
    bx + ux * len * 0.18 - px * baseW * 0.9, by + uy * len * 0.18 - py * baseW * 0.9,
    bx - px * baseW, by - py * baseW);
  x.closePath();
  x.clip();
  // chrome cross-section ramp (perpendicular to axis) — dark/bright/dark/bright
  const g = x.createLinearGradient(bx + px * baseW, by + py * baseW, bx - px * baseW, by - py * baseW);
  g.addColorStop(0.0, mix(P.metal, '#05060a', 0.6));
  g.addColorStop(0.4, mix(P.metal, '#ffffff', 0.95));
  g.addColorStop(0.6, mix(P.metal, '#06070c', 0.42));
  g.addColorStop(1.0, mix(P.metal, '#ffffff', 0.35));
  const bb = baseW * 2 + len;
  x.fillStyle = g;
  x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
  // vertical (along-axis) dark-to-light so the tip catches light
  x.globalCompositeOperation = 'overlay';
  const ag = x.createLinearGradient(bx, by, tx, ty);
  ag.addColorStop(0, rgba(P.g1, 0.4));
  ag.addColorStop(0.7, rgba('#000000', 0.0));
  ag.addColorStop(1, rgba(P.spec, 0.35));
  x.fillStyle = ag;
  x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
  // iridescent film
  x.fillStyle = rgba(iridescent(seedPhase + P.irid + 0.2, 0.92, 0.6), 0.13 * iridStr);
  x.fillRect(Math.min(bx, tx, mx) - bb, Math.min(by, ty, my) - bb, bb * 2, bb * 2);
  x.restore();
  // crisp specular highlight running up one flank (stops short of the tip so
  // the point stays dark/sharp — no LED-pin glints)
  x.save(); x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(P.spec, 0.4); x.lineWidth = Math.max(1, baseW * 0.14); x.lineCap = 'round';
  x.beginPath();
  x.moveTo(bx + px * baseW * 0.45, by + py * baseW * 0.45);
  x.quadraticCurveTo(mx + px * baseW * 0.12, my + py * baseW * 0.12,
    bx + ux * len * 0.82 + px * bend * 0.82, by + uy * len * 0.82 + py * bend * 0.82);
  x.stroke();
  x.restore();
}

function paint(off: HTMLCanvasElement, tokenId: number): Params {
  const r = seededRng(tokenId);
  const P = params(r);
  const W = P.fmt.W, H = P.fmt.H;
  off.width = W; off.height = H;
  const x = off.getContext('2d');
  if (!x) return P;
  const noise = makeNoise(tokenId ^ 0x9e37);
  const seedPhase = r(); // global thin-film phase for this token
  const minD = Math.min(W, H);

  // ── GROUND: rich vertical wash with a soft radial glow off-center ──
  const gg = x.createLinearGradient(0, 0, W * 0.2, H);
  gg.addColorStop(0, mix(P.g0, '#ffffff', P.dark ? 0.04 : 0.12));
  gg.addColorStop(0.55, P.g0);
  gg.addColorStop(1, P.g1);
  x.fillStyle = gg; x.fillRect(0, 0, W, H);
  // atmospheric radial lift
  const lcx = W * (0.35 + r() * 0.3), lcy = H * (0.3 + r() * 0.25);
  bloom(x, lcx, lcy, minD * 0.9, mix(P.g0, '#ffffff', 0.5), P.dark ? 0.18 : 0.32);
  // gentle haze before forms (depth)
  hazeSheet(x, W, H, noise, mix(P.g1, '#ffffff', 0.3), P.dark ? 0.10 : 0.16, minD * 0.55, 'screen');

  const light = P.lightAng;
  const cx = W * (0.42 + r() * 0.16), cy = H * (0.5 + (r() - 0.5) * 0.12);

  // ── MODE COMPOSITIONS ──
  if (P.mode === 'Crown') {
    // ferrofluid spike crown: a central mound bristling with chrome horns that
    // splay outward & upward — depth-ordered so it reads as a 3D sculpture.
    const R = minD * (0.2 + r() * 0.05);
    const n = rint(r, 11, 16);
    // spikes emerge from the upper hemisphere of the mound and splay UP & OUT
    // (ferrofluid defies gravity upward) — no downward starburst spokes.
    const spikes: { a: number; dir: number; len: number; bw: number; bx: number; by: number }[] = [];
    for (let i = 0; i < n; i++) {
      // distribute emergence angles across the top ~230° arc
      const a = -Math.PI + (i / (n - 1)) * Math.PI * 1.28 - Math.PI * 0.14 + (r() - 0.5) * 0.16;
      // direction biased strongly upward: blend the radial angle with straight up
      const radial = a;
      const dir = Math.atan2(Math.sin(radial) * 0.55 - 0.85, Math.cos(radial) * 0.9);
      const up = (-Math.sin(dir) + 1) / 2;
      const len = R * (1.0 + up * 1.25 + Math.abs(randn(r)) * 0.4);
      const bw = R * (0.13 + r() * 0.07) * (0.7 + up * 0.5);
      const bx = cx + Math.cos(a) * R * 0.66, by = cy + Math.sin(a) * R * 0.58;
      spikes.push({ a, dir, len, bw, bx, by });
    }
    // central mound first (spikes sit on top, rooted in it)
    chromeBlob(x, P, cx, cy, R, light, P.iridStrength, P.finish, r, seedPhase, noise, 0.26);
    // draw spikes sorted by base x for a touch of overlap depth
    spikes.sort((s1, s2) => s1.by - s2.by);
    for (const s of spikes) spike(x, P, s.bx, s.by, s.len, s.bw, s.dir, light, P.iridStrength, r, seedPhase, noise);
    // re-cap the mound's lit hotspot so spikes read as rooted, not floating
    const hx = cx + Math.cos(light) * R * 0.42, hy = cy + Math.sin(light) * R * 0.42;
    sheen(x, hx, hy, R * 0.4, P.spec, 0.4);
    // a few beads flung up off the crown
    for (let i = 0; i < rint(r, 3, 6); i++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.0, dd = R * (1.7 + r() * 1.4);
      chromeBlob(x, P, cx + Math.cos(a) * dd, cy + Math.sin(a) * dd, R * (0.07 + r() * 0.13), light, P.iridStrength, P.finish, r, seedPhase + 0.1, noise, 0.3);
    }
  } else if (P.mode === 'Coalescence') {
    // several large blobs merging — metaball cluster, big to small
    const count = rint(r, 4, 7);
    const sizes: { s: number; i: number }[] = [];
    for (let i = 0; i < count; i++) sizes.push({ s: 0.22 - i * 0.02 + r() * 0.04, i });
    // connective necks (metaball illusion): draw soft chrome links first
    const pts: { bx: number; by: number; R: number }[] = [];
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2, dd = minD * (0.05 + r() * 0.22);
      pts.push({ bx: cx + Math.cos(a) * dd, by: cy + Math.sin(a) * dd, R: minD * sizes[i].s });
    }
    // necks
    x.save(); x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const d = Math.hypot(pts[i].bx - pts[j].bx, pts[i].by - pts[j].by);
        if (d < (pts[i].R + pts[j].R) * 1.05) {
          const mx = (pts[i].bx + pts[j].bx) / 2, my = (pts[i].by + pts[j].by) / 2;
          softShadow(x, mx, my + 6, (pts[i].R + pts[j].R) * 0.4, 0.3);
          const ng = x.createLinearGradient(pts[i].bx, pts[i].by, pts[j].bx, pts[j].by);
          ng.addColorStop(0, mix(P.metal, '#ffffff', 0.5));
          ng.addColorStop(0.5, mix(P.metal, '#06070c', 0.2));
          ng.addColorStop(1, mix(P.metal, '#ffffff', 0.4));
          x.strokeStyle = ng; x.lineWidth = Math.min(pts[i].R, pts[j].R) * 0.9; x.lineCap = 'round';
          x.beginPath(); x.moveTo(pts[i].bx, pts[i].by); x.lineTo(pts[j].bx, pts[j].by); x.stroke();
        }
      }
    }
    x.restore();
    // blobs, big behind
    const ordered = pts.slice().sort((a, b) => b.R - a.R);
    for (const p of ordered) chromeBlob(x, P, p.bx, p.by, p.R, light, P.iridStrength, P.finish, r, seedPhase, noise, 0.16 + r() * 0.12);
  } else if (P.mode === 'Rivulet') {
    // flowing chrome rivulets following the curl field, beads pooling along & at end
    const lanes = rint(r, 4, 7);
    const drift = (r() - 0.5) * 0.6; // global lateral bias
    for (let l = 0; l < lanes; l++) {
      let px = (l / lanes) * W + (r() - 0.5) * W * 0.18, py = -30;
      const segs: [number, number][] = [];
      const steps = 170;
      for (let s = 0; s < steps; s++) {
        segs.push([px, py]);
        const c = curl(noise, px * 1.4, py * 1.4, 1.6);
        px += c[0] * 46 + drift * 4; py += c[1] * 26 + (H / steps) * 1.15;
        if (py > H + 30 || px < -40 || px > W + 40) break;
      }
      if (segs.length < 4) continue;
      // strongly varied widths so streams overlap & feel molten, not a curtain
      const wdt = minD * (0.018 + Math.pow(r(), 1.6) * 0.07);
      // shadow
      x.save(); x.globalCompositeOperation = 'multiply'; x.strokeStyle = 'rgba(0,0,0,0.3)';
      x.lineWidth = wdt * 1.5; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(segs[0][0] + 5, segs[0][1] + 8);
      for (const s of segs) x.lineTo(s[0] + 5, s[1] + 8); x.stroke(); x.restore();
      // chrome core — cross-section ramp gives a tubular wet read
      const ax = segs[0][0];
      const cg = x.createLinearGradient(ax - wdt, 0, ax + wdt, 0);
      cg.addColorStop(0, mix(P.metal, '#05060a', 0.5));
      cg.addColorStop(0.42, mix(P.metal, '#ffffff', 0.92));
      cg.addColorStop(0.62, mix(P.metal, '#06070c', 0.3));
      cg.addColorStop(1, mix(P.metal, '#ffffff', 0.45));
      x.save(); x.strokeStyle = cg; x.lineWidth = wdt; x.lineCap = 'round'; x.lineJoin = 'round';
      x.beginPath(); x.moveTo(segs[0][0], segs[0][1]);
      for (const s of segs) x.lineTo(s[0], s[1]); x.stroke();
      // bright specular spine
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = rgba(P.spec, 0.5);
      x.lineWidth = wdt * 0.22;
      x.beginPath(); x.moveTo(segs[0][0] - wdt * 0.18, segs[0][1]);
      for (const s of segs) x.lineTo(s[0] - wdt * 0.18, s[1]); x.stroke();
      // iridescent thread
      x.strokeStyle = rgba(iridescent(seedPhase + l * 0.13 + P.irid, 0.95, 0.65), 0.55 * P.iridStrength);
      x.lineWidth = wdt * 0.3;
      x.beginPath(); x.moveTo(segs[0][0] + wdt * 0.22, segs[0][1]);
      for (const s of segs) x.lineTo(s[0] + wdt * 0.22, s[1]); x.stroke();
      x.restore();
      // beads pooling along the path + a fat pool at the end
      for (let b = 0; b < rint(r, 1, 3); b++) {
        const si = Math.floor((0.3 + r() * 0.6) * segs.length);
        const sp = segs[Math.min(si, segs.length - 1)];
        chromeBlob(x, P, sp[0], sp[1], wdt * (0.9 + r() * 0.8), light, P.iridStrength, P.finish, r, seedPhase, noise, 0.25);
      }
      const end = segs[segs.length - 1];
      chromeBlob(x, P, end[0], Math.min(end[1], H - wdt * 2), wdt * (1.6 + r() * 1.4), light, P.iridStrength, P.finish, r, seedPhase, noise, 0.22);
    }
  } else { // Bead Field — beads strung along curl chains, like mercury on glass
    const chains = rint(r, 4, 7);
    const beads: { bx: number; by: number; rad: number }[] = [];
    for (let c = 0; c < chains; c++) {
      let px = r() * W, py = r() * H;
      const link = rint(r, 5, 12);
      const baseR = minD * (0.03 + Math.pow(r(), 1.6) * 0.1);
      for (let i = 0; i < link; i++) {
        const cv = curl(noise, px, py, 1.3);
        const step = baseR * (1.4 + r() * 1.2);
        px += cv[0] * step * 1.5 + (r() - 0.5) * step;
        py += cv[1] * step * 1.5 + (r() - 0.5) * step;
        if (px < 0 || px > W || py < 0 || py > H) break;
        beads.push({ bx: px, by: py, rad: baseR * (0.5 + r() * 0.9) });
      }
    }
    // scatter a few loners for variety
    for (let i = 0; i < rint(r, 6, 14); i++)
      beads.push({ bx: r() * W, by: r() * H, rad: minD * (0.015 + Math.pow(r(), 2.4) * 0.09) });
    beads.sort((a, b) => a.rad - b.rad);
    for (const b of beads) chromeBlob(x, P, b.bx, b.by, b.rad, light, P.iridStrength, P.finish, r, seedPhase + b.rad * 0.01, noise, 0.2 + r() * 0.15);
  }

  // ── ATMOSPHERE / TEXTURE FINISH ──
  // foreground haze veil for depth & cool air
  hazeSheet(x, W, H, noise, mix(P.g0, '#ffffff', 0.4), P.dark ? 0.06 : 0.10, minD * 0.4, 'screen');
  // overall sheen lift on the light source
  bloom(x, lcx, lcy, minD * 0.6, P.spec, 0.12);
  mottle(x, 0, 0, W, H, P.metal, 2600, r, 'overlay');
  // very subtle chroma split for futuristic edge
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
    { name: 'Mode', values: ['Crown', 'Coalescence', 'Rivulet', 'Bead Field'] },
    { name: 'Finish', values: ['High Polish', 'Brushed', 'Wet'] },
  ],
};
