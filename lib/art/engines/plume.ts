/*
 * Plume — curl-noise smoke / ink-in-water.
 *
 * Tens of thousands of fine filaments advected through a divergence-free
 * curl-noise field, forming turbulent plumes, vortices and veils of haze.
 * Streams are tinted with thin-film iridescence that shifts along flow
 * arclength so the smoke shimmers like fuel on water. Many translucent passes
 * build density + depth; soft bloom where streams bunch. Modes per seed:
 * Rising Plume / Twin Vortices / Drift Veil / Radial Burst. Abstract only.
 *
 * Direct port of tools/halo/plume.js (the judged R&D engine). Determinism is
 * byte-identical: K.rng === seededRng, K.pick === pick, and the draw order
 * (params prefix, then the particle advection loop and noise fields) matches
 * plume.js exactly so a given tokenId renders the image the jury approved.
 * KIT helpers are inlined here so the engine is self-contained. Painted at
 * native resolution offscreen, blitted to the requested width.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

type Ctx = CanvasRenderingContext2D;
type R = () => number;
interface Noise { noise2(x: number, y: number): number; fbm(x: number, y: number, oct?: number, gain?: number, lac?: number): number; }

interface Pal {
  name: string; bg: string; dark: boolean; iri: number; sat: number; light: number; ink: string; glow: string;
}

/* 7 bright/saturated grounds + 2 dark for range. `iri` = iridescence hue
   centre (turns) the thin-film spectrum leans toward; `dark` flips blend. */
const PALS: Pal[] = [
  { name: 'Opal Bloom',   bg: '#f4eefb', dark: false, iri: 0.62, sat: 0.78, light: 0.58, ink: '#3a2d5e', glow: '#a98cff' },
  { name: 'Lagoon',       bg: '#d8f6f2', dark: false, iri: 0.48, sat: 0.82, light: 0.55, ink: '#0d4a55', glow: '#36e6d6' },
  { name: 'Coral Mist',   bg: '#ffe9e2', dark: false, iri: 0.02, sat: 0.85, light: 0.60, ink: '#6e2438', glow: '#ff7a9c' },
  { name: 'Sherbet',      bg: '#fdf0d8', dark: false, iri: 0.12, sat: 0.88, light: 0.60, ink: '#7a4a16', glow: '#ffb24d' },
  { name: 'Iris Field',   bg: '#ece6ff', dark: false, iri: 0.74, sat: 0.80, light: 0.58, ink: '#3b2670', glow: '#c08cff' },
  { name: 'Spring Veil',  bg: '#e6f7df', dark: false, iri: 0.34, sat: 0.80, light: 0.55, ink: '#26521f', glow: '#7ee06a' },
  { name: 'Glacier',      bg: '#e2eefb', dark: false, iri: 0.55, sat: 0.78, light: 0.60, ink: '#1f3a63', glow: '#79b8ff' },
  { name: 'Obsidian Oil', bg: '#06070e', dark: true,  iri: 0.55, sat: 0.92, light: 0.62, ink: '#cfe6ff', glow: '#36d0ff' },
  { name: 'Nebula Ink',   bg: '#0a0518', dark: true,  iri: 0.78, sat: 0.95, light: 0.64, ink: '#f0d8ff', glow: '#c060ff' },
];

const FMTS = [
  { W: 1400, H: 1400, t: 'Square' },
  { W: 1500, H: 1120, t: 'Landscape' },
  { W: 1120, H: 1500, t: 'Portrait' },
] as const;

const MODES = ['Rising Plume', 'Twin Vortices', 'Drift Veil', 'Radial Burst'];
const DENS = ['Wispy', 'Balanced', 'Dense'];
const FLOWS = ['Calm', 'Turbulent', 'Violent'];

export const PLUME_ASPECTS: readonly number[] = [1, 1500 / 1120, 1120 / 1500];

interface Params {
  pal: Pal; fmt: typeof FMTS[number]; mode: string;
  density: string; flow: string;
  noiseScale: number; curlMag: number; iriSpan: number; iriDir: number;
}

/* FROZEN DRAW ORDER — palette, format, mode, density, flow, then the numeric
   knobs in exactly the order plume.js draws them. */
function params(r: R): Params {
  const pal = pick(PALS, r);
  const fmt = pick(FMTS, r);
  const mode = pick(MODES, r);
  return {
    pal, fmt, mode,
    density: pick(DENS, r),
    flow: pick(FLOWS, r),
    noiseScale: 80 + r() * 90,
    curlMag: 1.6 + r() * 1.8,
    iriSpan: 0.22 + r() * 0.40,
    iriDir: r() < 0.5 ? 1 : -1,
  };
}

function traitsFrom(p: Params): OutputTraits {
  return { Palette: p.pal.name, Mode: p.mode, Density: p.density, Flow: p.flow, Format: p.fmt.t };
}

export const plumeTraits: TraitsFn = (tokenId) => traitsFrom(params(seededRng(tokenId)));

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
function _splatRect(d: Uint8ClampedArray, W: number, H: number, fx: number, fy: number, fw: number, fh: number, R2: number, G: number, B: number, a: number) { const x1 = Math.max(0, Math.floor(fx)), y1 = Math.max(0, Math.floor(fy)); const x2 = Math.min(W - 1, Math.ceil(fx + fw) - 1), y2 = Math.min(H - 1, Math.ceil(fy + fh) - 1); for (let py = y1; py <= y2; py++) { const cy = Math.min(py + 1, fy + fh) - Math.max(py, fy); if (cy <= 0) continue; for (let px = x1; px <= x2; px++) { const cx = Math.min(px + 1, fx + fw) - Math.max(px, fx); if (cx <= 0) continue; const sa = a * cx * cy; const i = (py * W + px) * 4; const da = d[i + 3] / 255; const oa = sa + da * (1 - sa); if (oa <= 0) continue; d[i] = (R2 * sa + d[i] * da * (1 - sa)) / oa; d[i + 1] = (G * sa + d[i + 1] * da * (1 - sa)) / oa; d[i + 2] = (B * sa + d[i + 2] * da * (1 - sa)) / oa; d[i + 3] = oa * 255; } } }
function grain(x: Ctx, W: number, H: number, amt: number, r: R) { const n = Math.floor(W * H / amt); if (n <= 0) return; const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d'); if (!oc) return; const img = oc.createImageData(W, H); const d = img.data; for (let i = 0; i < n; i++) { const g = r() < 0.5 ? 0 : 255; const a = 0.015 + r() * 0.05; _splatRect(d, W, H, r() * W, r() * H, 1, 1, g, g, g, a); } oc.putImageData(img, 0, 0); x.drawImage(off, 0, 0); off.width = 0; off.height = 0; }
function vignette(x: Ctx, W: number, H: number, s: number) { const g = x.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.78); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${s})`); x.fillStyle = g; x.fillRect(0, 0, W, H); }
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
/* Curl of a 2D value-noise field → divergence-free flow (smoke/fluid look). */
function curl(noise: Noise, x: number, y: number, eps: number): [number, number] {
  eps = eps || 1;
  const n1 = noise.fbm((x) / 100, (y + eps) / 100, 4), n2 = noise.fbm((x) / 100, (y - eps) / 100, 4);
  const n3 = noise.fbm((x + eps) / 100, (y) / 100, 4), n4 = noise.fbm((x - eps) / 100, (y) / 100, 4);
  return [(n1 - n2) / (2 * eps), -(n3 - n4) / (2 * eps)];
}
function bloom(x: Ctx, cx: number, cy: number, rad: number, col: string, a0: number) { x.save(); x.globalCompositeOperation = 'lighter'; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, rgba(col, a0)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore(); }
function sheen(x: Ctx, cx: number, cy: number, rad: number, col: string, a0: number) { x.save(); x.globalCompositeOperation = 'lighter'; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, rgba(col, a0)); g.addColorStop(0.4, rgba(col, a0 * 0.35)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore(); }
function hazeSheet(x: Ctx, W: number, H: number, noise: Noise, col: string, opacity: number, scale: number, blend: GlobalCompositeOperation) { const step = Math.max(3, Math.floor(Math.min(W, H) / 180)); const c = h2r(col); const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d'); if (!oc) return; const img = oc.createImageData(W, H); const d = img.data; for (let yy = 0; yy < H; yy += step) { const yE = Math.min(H, yy + step + 1); for (let xx = 0; xx < W; xx += step) { const n = (noise.fbm(xx / scale, yy / scale, 5, 0.55, 2.1) + 1) / 2; const a = clamp(n * n * opacity, 0, 1); if (a < 0.01) continue; const xE = Math.min(W, xx + step + 1); for (let py = yy; py < yE; py++) { for (let px = xx; px < xE; px++) { const i = (py * W + px) * 4; const da = d[i + 3] / 255; const oa = a + da * (1 - a); if (oa <= 0) continue; d[i] = (c[0] * a + d[i] * da * (1 - a)) / oa; d[i + 1] = (c[1] * a + d[i + 1] * da * (1 - a)) / oa; d[i + 2] = (c[2] * a + d[i + 2] * da * (1 - a)) / oa; d[i + 3] = oa * 255; } } } } oc.putImageData(img, 0, 0); x.save(); x.globalCompositeOperation = blend || 'screen'; x.drawImage(off, 0, 0); x.restore(); off.width = 0; off.height = 0; }

interface BloomCell { n: number; cx: number; cy: number; col: string; }

function paint(off: HTMLCanvasElement, tokenId: number): Params {
  const r = seededRng(tokenId);
  const p = params(r);
  const P = p.pal, W = p.fmt.W, H = p.fmt.H;
  off.width = W; off.height = H;
  const x = off.getContext('2d');
  if (!x) return p;
  const noise = makeNoise(tokenId);
  // a second, slower noise to warp the field over space → less repetitive
  const noise2 = makeNoise(tokenId ^ 0x9e3779b9);

  // ── ground: subtle vertical wash so smoke has somewhere to sit ──
  const g = x.createLinearGradient(0, 0, W * 0.25, H);
  if (P.dark) {
    g.addColorStop(0, mix(P.bg, P.glow, 0.10));
    g.addColorStop(0.55, P.bg);
    g.addColorStop(1, mix(P.bg, '#000000', 0.45));
  } else {
    g.addColorStop(0, mix(P.bg, '#ffffff', 0.30));
    g.addColorStop(0.6, P.bg);
    g.addColorStop(1, mix(P.bg, P.ink, 0.10));
  }
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  // ── flow field helper: curl + a warping rotation so plumes feel organic ──
  const NS = p.noiseScale, CM = p.curlMag;
  function field(px: number, py: number): [number, number] {
    const c = curl(noise, px / (NS / 100), py / (NS / 100), 1.2);
    const SW = 36; // swirl gain
    const w = noise2.fbm(px / 520, py / 520, 3) * 1.4;
    const ca = Math.cos(w), sa = Math.sin(w);
    let vx = (c[0] * ca - c[1] * sa) * SW;
    let vy = (c[0] * sa + c[1] * ca) * SW;
    if (p.mode === 'Rising Plume') {
      vy -= 0.55;
      vx += Math.sin(py / 180 + px / 90) * 0.30;
    } else if (p.mode === 'Twin Vortices') {
      const cx1 = W * 0.34, cx2 = W * 0.66, cy = H * 0.5;
      const a1 = Math.atan2(py - cy, px - cx1), a2 = Math.atan2(py - cy, px - cx2);
      vx += (-Math.sin(a1) + Math.sin(a2)) * 0.6;
      vy += (Math.cos(a1) - Math.cos(a2)) * 0.6;
    } else if (p.mode === 'Drift Veil') {
      vx += 0.5;
      vy += Math.sin(px / 160 + py / 240) * 0.35;
    } else { // Radial Burst
      const dx = px - W / 2, dy = py - H / 2;
      const dist = Math.hypot(dx, dy) || 1;
      const falloff = Math.min(1, dist / (Math.min(W, H) * 0.42));
      const push = 0.55 * (1 - falloff * 0.7);
      vx += (dx / dist) * push;
      vy += (dy / dist) * push;
    }
    const len = Math.hypot(vx, vy) || 1;
    return [vx / len, vy / len];
  }

  // ── seeding: where particles are born, per mode ──
  function seedPoint(): [number, number] {
    if (p.mode === 'Rising Plume') {
      const sx = W * (0.5 + randn(r) * 0.20);
      const sy = H * (0.62 + r() * 0.36);
      return [sx, sy];
    }
    if (p.mode === 'Twin Vortices') {
      const left = r() < 0.5;
      const cx = left ? W * 0.32 : W * 0.68;
      const rad = (0.04 + r() * 0.34) * Math.min(W, H);
      const a = r() * Math.PI * 2;
      return [cx + Math.cos(a) * rad, H * 0.5 + Math.sin(a) * rad];
    }
    if (p.mode === 'Drift Veil') {
      return [W * (-0.05 + r() * 0.5), H * (0.06 + r() * 0.88)];
    }
    // Radial Burst
    const rad = Math.sqrt(r()) * 0.40 * Math.min(W, H);
    const a = r() * Math.PI * 2;
    return [W / 2 + Math.cos(a) * rad, H / 2 + Math.sin(a) * rad];
  }

  // ── density tuning (capped for sub-minute render) ──
  const densMul = p.density === 'Wispy' ? 0.62 : p.density === 'Dense' ? 1.35 : 1.0;
  const flowSteps = p.flow === 'Calm' ? 1.0 : p.flow === 'Violent' ? 1.5 : 1.2;
  const scaleArea = (W * H) / (1400 * 1400);
  const N = Math.floor(3800 * densMul * scaleArea);     // particle count
  const STEPS = Math.floor(180 * flowSteps);            // life of each filament
  const jitter = p.flow === 'Calm' ? 0.10 : p.flow === 'Violent' ? 0.55 : 0.28;

  const margin = Math.min(W, H) * 0.18;

  // accumulate where strokes bunch → bloom seeds
  const bloomGrid: Record<string, BloomCell> = {};
  const BG = 64; // bloom cell px

  // ── PASSES: a few translucent layers, each its own particle set ──
  const PASSES = P.dark ? 3 : 2;
  x.lineCap = 'round';

  for (let pass = 0; pass < PASSES; pass++) {
    if (P.dark) {
      x.globalCompositeOperation = 'lighter';
    } else {
      x.globalCompositeOperation = pass === 0 ? 'multiply' : 'screen';
    }
    const passAlpha = (P.dark ? 0.055 : 0.075) * (pass === 0 ? 1 : 0.7);
    const passWidth = (P.dark ? 1.0 : 1.15) * (pass === 0 ? 1.0 : 0.8);

    const count = Math.floor(N * (pass === 0 ? 1.0 : 0.7));
    for (let i = 0; i < count; i++) {
      let [px, py] = seedPoint();
      const phase0 = P.iri + (r() - 0.5) * 0.5;
      const span = p.iriSpan * p.iriDir;
      const life = STEPS + rint(r, -30, 30);
      let prevx = px, prevy = py;
      let arc = 0;
      const lw = passWidth * (0.5 + r() * 1.3);

      for (let s = 0; s < life; s++) {
        const [vx, vy] = field(px, py);
        const jx = vx + (r() - 0.5) * jitter;
        const jy = vy + (r() - 0.5) * jitter;
        const nx = px + jx * CM;
        const ny = py + jy * CM;
        arc += CM;

        if (nx < -margin || nx > W + margin || ny < -margin || ny > H + margin) break;

        const phase = phase0 + (arc / (STEPS * CM)) * span;
        let col = iridescent(phase, P.sat, P.light);
        if (P.dark) {
          col = mix(col, P.glow, 0.18);
        } else {
          col = mix(col, P.glow, 0.22);
          col = mix(col, P.ink, 0.24);
        }

        const t = s / life;
        const env = Math.sin(Math.min(1, t * 3)) * (1 - t * t * 0.85);
        const a = passAlpha * (0.5 + env);

        x.strokeStyle = rgba(col, a);
        x.lineWidth = lw;
        x.beginPath();
        x.moveTo(prevx, prevy);
        x.lineTo(nx, ny);
        x.stroke();

        if ((s & 7) === 0) {
          const gx = Math.floor(nx / BG), gy = Math.floor(ny / BG);
          const key = gx + ',' + gy;
          const e = bloomGrid[key] || (bloomGrid[key] = { n: 0, cx: 0, cy: 0, col });
          e.n++; e.cx += nx; e.cy += ny; e.col = col;
        }

        prevx = px = nx; prevy = py = ny;
      }
    }
  }

  // ── soft bloom where streams bunched up (sheen on dense knots) ──
  const cells = Object.values(bloomGrid).filter((e) => e.n >= 18).sort((a, b) => b.n - a.n);
  const topN = Math.min(cells.length, P.dark ? 30 : 22);
  for (let i = 0; i < topN; i++) {
    const e = cells[i];
    const cx = e.cx / e.n, cy = e.cy / e.n;
    const rad = BG * (0.7 + Math.min(1.2, e.n / 40));
    const bc = P.dark ? mix(e.col, '#ffffff', 0.30) : mix(e.col, '#ffffff', 0.40);
    bloom(x, cx, cy, rad, bc, P.dark ? 0.055 : 0.030);
  }

  // ── a few tiny specular sheen lobes (the headline gloss) on top knots ──
  for (let i = 0; i < Math.min(topN, 5); i++) {
    const e = cells[i]; if (!e) break;
    const cx = e.cx / e.n, cy = e.cy / e.n;
    sheen(x, cx - BG * 0.2, cy - BG * 0.2, BG * 0.7, '#ffffff', P.dark ? 0.06 : 0.04);
  }

  // ── atmospheric finish: haze veil, grain, vignette ──
  hazeSheet(x, W, H, noise, P.glow, P.dark ? 0.16 : 0.14, 190, P.dark ? 'screen' : 'soft-light');
  hazeSheet(x, W, H, noise2, iridescent(P.iri + 0.3, 0.7, 0.6), 0.07, 320, P.dark ? 'screen' : 'soft-light');
  grain(x, W, H, P.dark ? 520 : 700, r);
  vignette(x, W, H, P.dark ? 0.42 : 0.20);

  return p;
}

export const renderPlume: EngineFn = (canvas, tokenId, width) => {
  const off = document.createElement('canvas');
  const p = paint(off, tokenId);
  const W = Math.max(1, Math.floor(width));
  const H = Math.max(1, Math.round((W * off.height) / off.width));
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(off, 0, 0, W, H);
  return { aspect: off.width / off.height, traits: traitsFrom(p) };
};

export const plumeSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Mode', values: ['Rising Plume', 'Twin Vortices', 'Drift Veil', 'Radial Burst'] },
    { name: 'Density', values: ['Wispy', 'Balanced', 'Dense'] },
    { name: 'Flow', values: ['Calm', 'Turbulent', 'Violent'] },
    { name: 'Format', values: ['Square', 'Landscape', 'Portrait'] },
  ],
};
