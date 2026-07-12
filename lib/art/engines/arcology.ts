/*
 * Arcology — by opus4-8. The platform's halo piece.
 *
 * An epic, hazy cyberpunk megastructure seen THROUGH an operator's terminal: a
 * vertical megacity of tiered "arcology" towers, bridges and lit canyons recedes
 * into volumetric fog, window-grids and holo-signage glowing — overlaid with a
 * braindance HUD (glyph rain, a hero readout panel, an occasional target
 * reticle) and graded onto CRT phosphor (scanlines, chromatic aberration, grain,
 * a non-optional atmospheric falloff that keeps the void towering above). It is
 * the fusion that out-scored four standalone directions in a multi-round jury:
 * an epic SCENE and an authentic cyberpunk-terminal, in one frame.
 *
 * Painted at native resolution to an offscreen canvas, then blitted to the
 * requested width (multi-format, so aspect is per-token). Static + deterministic
 * in tokenId: params() fixes the frozen RNG prefix so traitsOf() and render()
 * never disagree.
 */

import { seededRng, pick, mulberry32, seedFromToken } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

type Ctx = CanvasRenderingContext2D;
type R = () => number;

interface Palette {
  name: string; bg: string; fog: string; glow: string;
  win: string; sign: string; hud: string; alert: string;
}

/* Eight custom cyberpunk-terminal colorways (NOT outrun) — curated and tuned
   across two jury rounds. Deep Cyber is the signature. */
const PALS: Palette[] = [
  { name: 'Reactor',     bg: '#04080a', fog: '#0a3a2e', glow: '#39ff9e', win: '#7dffc8', sign: '#ffcf3d', hud: '#5bff9e', alert: '#ff4d6d' },
  { name: 'Deep Cyber',  bg: '#04060f', fog: '#0b2545', glow: '#1fb6ff', win: '#7de8ff', sign: '#ff3df0', hud: '#3de0e8', alert: '#ffd23d' },
  { name: 'Sodium',      bg: '#0a0703', fog: '#2b1600', glow: '#ff9a1f', win: '#ffd089', sign: '#34e0d0', hud: '#ffc000', alert: '#ff3d3d' },
  { name: 'Toxic',       bg: '#070d02', fog: '#26400a', glow: '#b6ff1f', win: '#e6ff7d', sign: '#ff2dba', hud: '#c6ff00', alert: '#1fd6ff' },
  { name: 'Ultraviolet', bg: '#070416', fog: '#22115a', glow: '#9b5dff', win: '#c79bff', sign: '#ff3d8a', hud: '#a76bff', alert: '#3df0ff' },
  { name: 'Phosphor',    bg: '#02160b', fog: '#0b3d2e', glow: '#1fbf6b', win: '#c8ffe0', sign: '#ff5d5d', hud: '#5bff9e', alert: '#ffe23d' },
  { name: 'Magenta',     bg: '#0a000c', fog: '#2a0535', glow: '#ff2da0', win: '#ff9be8', sign: '#ff8a3d', hud: '#ff4fd8', alert: '#ffe23d' },
  { name: 'Ice Break',   bg: '#02040c', fog: '#0a2440', glow: '#1f8fff', win: '#eaf4ff', sign: '#ff5db0', hud: '#7ac8ff', alert: '#ffc23d' },
];

const FMTS = [
  { W: 1200, H: 1500, t: 'Monolith' },
  { W: 1500, H: 1160, t: 'Vista' },
  { W: 1320, H: 1320, t: 'Square' },
] as const;
const ATMOS = ['Reactor Dawn', 'Deep Smog', 'Eclipse', 'Acid Fog'] as const;
const STRUCT = ['Spire', 'Terraces', 'Canyon', 'Sprawl'] as const;
const MODE = ['Recon', 'Trace', 'Breach', 'Ghost'] as const;
/* Event is the rare chase axis — most Outputs are 'None'. */
const EVENTS = ['None', 'None', 'None', 'None', 'Ascension Beam', 'Alert', 'Blackout', 'Comet'] as const;
const GLY = '0123456789ABCDEF░▒▓│┤╣║╗╝╚╔╩╦╠═╬⌐¬◊◆▮▯ｱｲｳｴｵｶｷｸﾊﾋﾌﾍﾎ';

export const ARCOLOGY_ASPECTS: readonly number[] = FMTS.map((f) => f.W / f.H);

interface Params {
  pal: Palette;
  fmt: typeof FMTS[number];
  atmo: typeof ATMOS[number];
  struct: typeof STRUCT[number];
  mode: typeof MODE[number];
  event: typeof EVENTS[number];
}

/* FROZEN DRAW ORDER — params() is the prefix replayed by both traitsOf() and
   render(); changing the order changes every Output. */
function params(r: R): Params {
  const pal = pick(PALS, r);
  const fmt = pick(FMTS, r);
  const atmo = pick(ATMOS, r);
  const struct = pick(STRUCT, r);
  const mode = pick(MODE, r);
  const event = pick(EVENTS, r);
  return { pal, fmt, atmo, struct, mode, event };
}

function traitsFrom(p: Params): OutputTraits {
  return {
    Palette: p.pal.name, Format: p.fmt.t, Atmosphere: p.atmo,
    Structure: p.struct, Overlay: p.mode, Event: p.event,
  };
}

export const arcologyTraits: TraitsFn = (tokenId) => traitsFrom(params(seededRng(tokenId)));

/* ── colour + texture helpers (self-contained, typed) ─────────────────────── */
function h2r(h: string): [number, number, number] { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function r2h(c: number[]): string { const f = (n: number) => ('0' + Math.round(Math.max(0, Math.min(255, n))).toString(16)).slice(-2); return '#' + f(c[0]) + f(c[1]) + f(c[2]); }
function mix(a: string, b: string, t: number): string { const A = h2r(a), B = h2r(b); return r2h([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }
function rgba(h: string, a: number): string { const c = h2r(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
const rint = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const randn = (r: R) => r() + r() + r() + r() - 2;

function makeNoise(tokenId: number) {
  const r = mulberry32(seedFromToken(tokenId) ^ 0x9e3779b9);
  const p = new Uint8Array(256); for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  const perm = new Uint8Array(512); for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const grad = (h: number, x: number, y: number) => ((h & 1) ? x : -x) + ((h & 2) ? y : -y);
  const noise2 = (x: number, y: number) => {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1], ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    return lerp(lerp(grad(aa, x, y), grad(ba, x - 1, y), u), lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u), v);
  };
  const fbm = (x: number, y: number, oct = 5, gain = 0.55, lac = 2.1) => {
    let a = 0, amp = 0.5, f = 1, n = 0;
    for (let i = 0; i < oct; i++) { a += amp * noise2(x * f, y * f); n += amp; amp *= gain; f *= lac; }
    return a / n;
  };
  return { fbm };
}

function bloom(x: Ctx, cx: number, cy: number, rad: number, col: string, a0: number) {
  x.save(); x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, rgba(col, a0)); g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore();
}

function hazeSheet(x: Ctx, W: number, H: number, noise: { fbm: (x: number, y: number) => number }, col: string, opacity: number, scale: number) { const step = Math.max(3, Math.floor(Math.min(W, H) / 180)); const c = h2r(col); const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d'); if (!oc) return; const img = oc.createImageData(W, H); const d = img.data; for (let yy = 0; yy < H; yy += step) { const yE = Math.min(H, yy + step + 1); for (let xx = 0; xx < W; xx += step) { const n = (noise.fbm(xx / scale, yy / scale) + 1) / 2; const a = Math.max(0, Math.min(1, n * n * opacity)); if (a < 0.01) continue; const xE = Math.min(W, xx + step + 1); for (let py = yy; py < yE; py++) { for (let px = xx; px < xE; px++) { const i = (py * W + px) * 4; const da = d[i + 3] / 255; const oa = a + da * (1 - a); if (oa <= 0) continue; d[i] = (c[0] * a + d[i] * da * (1 - a)) / oa; d[i + 1] = (c[1] * a + d[i + 1] * da * (1 - a)) / oa; d[i + 2] = (c[2] * a + d[i + 2] * da * (1 - a)) / oa; d[i + 3] = oa * 255; } } } } oc.putImageData(img, 0, 0); x.save(); x.globalCompositeOperation = 'screen'; x.drawImage(off, 0, 0); x.restore(); off.width = 0; off.height = 0; }

function scanlines(x: Ctx, W: number, H: number, gap: number, a: number) {
  x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgba(0,0,0,${a})`;
  for (let y = 0; y < H; y += gap) x.fillRect(0, y, W, 1);
  x.restore();
}

function chromaSplit(x: Ctx, W: number, H: number, off: number) {
  try {
    const img = x.getImageData(0, 0, W, H); const d = img.data;
    const out = x.createImageData(W, H); const o = out.data; const dx = off | 0;
    for (let y = 0; y < H; y++) {
      for (let i = 0; i < W; i++) {
        const idx = (y * W + i) * 4;
        const rx = Math.min(W - 1, i + dx), bx = Math.max(0, i - dx);
        o[idx] = d[(y * W + rx) * 4]; o[idx + 1] = d[idx + 1]; o[idx + 2] = d[(y * W + bx) * 4 + 2]; o[idx + 3] = 255;
      }
    }
    x.putImageData(out, 0, 0);
  } catch { /* tainted/oversized — skip, never break the paint */ }
}

function _splatRect(d: Uint8ClampedArray, W: number, H: number, fx: number, fy: number, fw: number, fh: number, R2: number, G: number, B: number, a: number) { const x1 = Math.max(0, Math.floor(fx)), y1 = Math.max(0, Math.floor(fy)); const x2 = Math.min(W - 1, Math.ceil(fx + fw) - 1), y2 = Math.min(H - 1, Math.ceil(fy + fh) - 1); for (let py = y1; py <= y2; py++) { const cy = Math.min(py + 1, fy + fh) - Math.max(py, fy); if (cy <= 0) continue; for (let px = x1; px <= x2; px++) { const cx = Math.min(px + 1, fx + fw) - Math.max(px, fx); if (cx <= 0) continue; const sa = a * cx * cy; const i = (py * W + px) * 4; const da = d[i + 3] / 255; const oa = sa + da * (1 - sa); if (oa <= 0) continue; d[i] = (R2 * sa + d[i] * da * (1 - sa)) / oa; d[i + 1] = (G * sa + d[i + 1] * da * (1 - sa)) / oa; d[i + 2] = (B * sa + d[i + 2] * da * (1 - sa)) / oa; d[i + 3] = oa * 255; } } }
function grain(x: Ctx, W: number, H: number, amt: number, r: R) { const n = Math.floor(W * H / amt); if (n <= 0) return; const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d'); if (!oc) return; const img = oc.createImageData(W, H); const d = img.data; for (let i = 0; i < n; i++) { const g = r() < 0.5 ? 0 : 255; const a = 0.015 + r() * 0.05; _splatRect(d, W, H, r() * W, r() * H, 1, 1, g, g, g, a); } oc.putImageData(img, 0, 0); x.drawImage(off, 0, 0); off.width = 0; off.height = 0; }

function vignette(x: Ctx, W: number, H: number, s: number) {
  const g = x.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.25, W / 2, H / 2, Math.max(W, H) * 0.78);
  g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${s})`);
  x.fillStyle = g; x.fillRect(0, 0, W, H);
}

function fogMul(atmo: string): number { return atmo === 'Deep Smog' ? 1.5 : atmo === 'Acid Fog' ? 1.25 : atmo === 'Eclipse' ? 0.85 : 0.75; }

/* ── scene elements ───────────────────────────────────────────────────────── */
function arcoTower(x: Ctx, P: Palette, bx: number, baseY: number, bw: number, bh: number, depth: number, struct: string, r: R) {
  let segY = baseY, remaining = bh, w = bw; const cx = bx + bw / 2;
  const setbacks = struct === 'Terraces' ? rint(r, 3, 6) : struct === 'Spire' ? rint(r, 4, 7) : rint(r, 1, 3);
  const bodyCol = mix(P.bg, P.fog, 0.4 + depth * 0.45);
  for (let s = 0; s < setbacks && remaining > 6; s++) {
    const segH = remaining * (s === setbacks - 1 ? 1 : (0.3 + r() * 0.4));
    const x0 = cx - w / 2;
    x.fillStyle = bodyCol; x.fillRect(x0, segY - segH, w, segH);
    x.strokeStyle = rgba(P.glow, 0.08 + depth * 0.22); x.lineWidth = 1; x.strokeRect(x0 + 0.5, segY - segH + 0.5, w, segH);
    const cw = Math.max(2.2, w / rint(r, 8, 16));
    const ch = Math.max(3, cw * (0.9 + r() * 0.6));
    const onP = 0.16 + depth * 0.4;
    for (let yy = segY - segH + ch; yy < segY - 2; yy += ch + 1) {
      for (let xx = x0 + 2; xx < x0 + w - cw; xx += cw + 1) {
        if (r() > onP) continue;
        const lit = r() < 0.6 ? P.win : (r() < 0.5 ? P.sign : P.glow);
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = rgba(lit, (0.3 + depth * 0.5) * (0.55 + r() * 0.45));
        x.fillRect(xx, yy, cw * 0.66, ch * 0.5);
        x.restore();
      }
    }
    segY -= segH; remaining -= segH;
    w = Math.max(bw * 0.16, w * (struct === 'Spire' ? 0.62 + r() * 0.12 : 0.8 + r() * 0.12));
  }
  if (depth > 0.4 && r() < 0.8) {
    const ah = bh * (0.05 + r() * 0.16);
    x.strokeStyle = rgba(P.win, 0.5); x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(cx, segY); x.lineTo(cx, segY - ah); x.stroke();
    bloom(x, cx, segY - ah, 5 + depth * 14, P.alert, 0.6);
  }
  return { topX: cx, topY: segY };
}

function holoSign(x: Ctx, P: Palette, sx: number, sy: number, sw: number, sh: number, depth: number, r: R) {
  x.save(); x.globalCompositeOperation = 'lighter';
  const col = r() < 0.5 ? P.sign : P.alert;
  bloom(x, sx + sw / 2, sy + sh / 2, Math.max(sw, sh) * 0.9, col, 0.18 * (0.5 + depth));
  x.fillStyle = rgba(col, 0.1); x.fillRect(sx, sy, sw, sh);
  x.strokeStyle = rgba(col, 0.5); x.lineWidth = 1.2; x.strokeRect(sx, sy, sw, sh);
  const rows = rint(r, 1, 3);
  for (let i = 0; i < rows; i++) {
    const ry = sy + (i + 0.5) * (sh / rows); let c = sx + 3;
    while (c < sx + sw - 4) { const w = 2 + r() * sw * 0.16; if (r() < 0.7) { x.fillStyle = rgba(r() < 0.5 ? P.win : col, 0.5 + r() * 0.4); x.fillRect(c, ry - sh * 0.05, w, sh * 0.1); } c += w + 2 + r() * 4; }
  }
  x.restore();
}

function bridge(x: Ctx, P: Palette, x0: number, x1: number, y: number, depth: number, r: R) {
  x.save();
  x.strokeStyle = mix(P.bg, P.fog, 0.5 + depth * 0.3); x.lineWidth = 2 + depth * 4;
  x.beginPath(); x.moveTo(x0, y); x.lineTo(x1, y); x.stroke();
  x.globalCompositeOperation = 'lighter';
  const n = Math.floor(Math.abs(x1 - x0) / (6 + r() * 6));
  for (let i = 0; i < n; i++) { const xx = x0 + (x1 - x0) * (i / n); if (r() < 0.6) { x.fillStyle = rgba(P.win, 0.4 + depth * 0.4); x.fillRect(xx, y - 1, 2, 2); } }
  x.restore();
}

function glyphCol(x: Ctx, P: Palette, cx: number, top: number, bot: number, fs: number, alpha: number, r: R) {
  x.font = `${fs}px monospace`; x.textBaseline = 'top';
  const head = top + r() * (bot - top), len = (bot - top) * (0.4 + r() * 0.6);
  for (let y = top; y < bot; y += fs * 1.08) {
    const d = ((y - head) % len + len) % len / len;
    const a = (1 - d) * alpha;
    if (a < 0.04) continue;
    x.save(); if (d < 0.1) x.globalCompositeOperation = 'lighter';
    x.fillStyle = rgba(d < 0.06 ? P.win : (r() < 0.1 ? P.alert : P.hud), a);
    x.fillText(GLY[Math.floor(r() * GLY.length)], cx, y);
    x.restore();
  }
}

function hudPanel(x: Ctx, P: Palette, px: number, py: number, pw: number, ph: number, r: R) {
  x.save();
  x.fillStyle = rgba(P.bg, 0.5); x.fillRect(px, py, pw, ph);
  x.strokeStyle = rgba(P.hud, 0.55); x.lineWidth = 1.2; x.strokeRect(px, py, pw, ph);
  const b = Math.min(pw, ph) * 0.2; x.lineWidth = 1.8; x.strokeStyle = rgba(P.win, 0.8);
  ([[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]] as const).forEach(([ax, ay, sx, sy]) => { x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke(); });
  const kind = r();
  x.save(); x.globalCompositeOperation = 'lighter';
  if (kind < 0.45) {
    x.strokeStyle = rgba(P.hud, 0.9); x.lineWidth = 1.3; x.beginPath();
    const my = py + ph * 0.55, amp = ph * 0.3;
    for (let i = 0; i <= 70; i++) { const t = i / 70, xx = px + 5 + t * (pw - 10), yy = my + Math.sin(t * Math.PI * (4 + r() * 7) + r()) * amp * Math.sin(t * Math.PI); i === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); }
    x.stroke();
  } else if (kind < 0.75) {
    const n = rint(r, 5, 10), bw = (pw - 10) / n;
    for (let i = 0; i < n; i++) { const bh = (ph * 0.72) * (0.12 + r()); x.fillStyle = rgba(r() < 0.2 ? P.alert : P.hud, 0.6 + r() * 0.4); x.fillRect(px + 5 + i * bw, py + ph - 5 - bh, bw * 0.66, bh); }
  } else {
    const rows = rint(r, 3, 5);
    for (let i = 0; i < rows; i++) { const ry = py + ph * 0.18 + i * (ph * 0.7 / rows); let c = px + 5; while (c < px + pw - 6) { const w = 4 + r() * pw * 0.22, red = r() < 0.16; x.fillStyle = rgba(red ? P.alert : (r() < 0.5 ? P.hud : P.win), red ? 0.7 : 0.35 + r() * 0.4); x.fillRect(c, ry, w, ph * 0.7 / rows * 0.5); c += w + 4 + r() * 7; } }
  }
  x.restore(); x.restore();
}

function reticle(x: Ctx, P: Palette, cx: number, cy: number, rad: number, r: R) {
  x.save(); x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(P.win, 0.7); x.lineWidth = 1.1;
  for (const rr of [rad, rad * 0.62]) { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); }
  const ticks = 60; for (let i = 0; i < ticks; i++) { const a = i / ticks * Math.PI * 2, l = i % 5 === 0 ? rad * 0.1 : rad * 0.04; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * (rad + l), cy + Math.sin(a) * (rad + l)); x.stroke(); }
  x.strokeStyle = rgba(P.hud, 0.55); x.beginPath(); x.moveTo(cx - rad * 1.25, cy); x.lineTo(cx + rad * 1.25, cy); x.moveTo(cx, cy - rad * 1.25); x.lineTo(cx, cy + rad * 1.25); x.stroke();
  const bs = rad * 0.5; x.strokeStyle = rgba(P.win, 0.8); x.lineWidth = 1.4;
  ([[-1, -1], [1, -1], [-1, 1], [1, 1]] as const).forEach(([sx, sy]) => { const ax = cx + sx * rad * 0.7, ay = cy + sy * rad * 0.7; x.beginPath(); x.moveTo(ax - sx * bs * 0.4, ay); x.lineTo(ax, ay); x.lineTo(ax, ay - sy * bs * 0.4); x.stroke(); });
  x.restore();
}

/* ── master paint (native resolution) ─────────────────────────────────────── */
function paint(off: HTMLCanvasElement, tokenId: number): Params {
  const r = seededRng(tokenId);
  const p = params(r);
  const P = p.pal, W = p.fmt.W, H = p.fmt.H;
  off.width = W; off.height = H;
  const x = off.getContext('2d');
  if (!x) return p;
  const noise = makeNoise(tokenId);
  const fm = fogMul(p.atmo);

  // sky / void gradient
  const horizon = H * (0.6 + r() * 0.14);
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, mix(P.bg, '#000000', 0.35));
  g.addColorStop(Math.max(0, horizon / H - 0.14), P.bg);
  g.addColorStop(horizon / H, mix(P.fog, P.glow, p.atmo === 'Eclipse' ? 0.05 : 0.2));
  g.addColorStop(1, mix(P.bg, P.fog, 0.55));
  x.fillStyle = g; x.fillRect(0, 0, W, H);

  // reactor glow / eclipse ring on the horizon
  if (p.atmo === 'Eclipse') {
    x.save(); x.globalCompositeOperation = 'lighter';
    const eg = x.createRadialGradient(W * 0.5, horizon * 0.8, W * 0.04, W * 0.5, horizon * 0.8, W * 0.34);
    eg.addColorStop(0, rgba(P.bg, 0)); eg.addColorStop(0.45, rgba(P.alert, 0.12)); eg.addColorStop(0.5, rgba(P.alert, 0.3)); eg.addColorStop(0.56, rgba(P.alert, 0.05)); eg.addColorStop(1, rgba(P.alert, 0));
    x.fillStyle = eg; x.fillRect(0, 0, W, H); x.restore();
  } else bloom(x, W * (0.3 + r() * 0.4), horizon, W * (0.4 + r() * 0.25), P.glow, p.atmo === 'Deep Smog' ? 0.16 : 0.3);

  // depth tiers of arcology (back→front)
  const tiers = 4;
  for (let l = 0; l < tiers; l++) {
    const depth = l / (tiers - 1);
    const baseY = horizon + depth * (H - horizon) * 0.9;
    const maxH = (0.2 + depth * 0.62) * H;
    const wMul = p.struct === 'Spire' ? 0.55 : p.struct === 'Canyon' ? 1.35 : p.struct === 'Sprawl' ? 1.1 : 0.9;
    const tops: { x: number; y: number; bw: number }[] = [];
    let bx = -W * 0.06;
    while (bx < W * 1.04) {
      const bw = (W * (0.05 + r() * 0.1)) * (0.55 + depth) * wMul;
      const bh = maxH * (0.4 + r() * 0.6) * (p.struct === 'Spire' ? 1.2 : 1);
      const t = arcoTower(x, P, bx, baseY, bw, bh, depth, p.struct, r);
      tops.push({ x: t.topX, y: baseY - bh, bw });
      if (depth > 0.4 && r() < 0.26) holoSign(x, P, bx + bw * 0.1, baseY - bh * (0.35 + r() * 0.45), bw * (0.7 + r() * 0.8), bh * (0.1 + r() * 0.1), depth, r);
      bx += bw * (1.04 + r() * 0.45);
    }
    if (depth > 0.4) {
      for (let i = 1; i < tops.length; i++) {
        if (r() < 0.3 && Math.abs(tops[i].x - tops[i - 1].x) < W * 0.22) {
          const topMax = Math.max(tops[i].y, tops[i - 1].y);
          const by = topMax + (baseY - topMax) * (0.2 + r() * 0.5);
          bridge(x, P, tops[i - 1].x, tops[i].x, by, depth, r);
        }
      }
    }
    hazeSheet(x, W, H, noise, mix(P.fog, P.glow, 0.22), ((1 - depth) * 0.5 + 0.14) * fm, 90 + l * 28);
  }

  // foreground cables
  x.save(); x.globalCompositeOperation = 'lighter';
  const cables = rint(r, 5, 11);
  for (let i = 0; i < cables; i++) { const x0 = r() * W, x1 = x0 + (r() - 0.5) * W * 0.5, sag = 40 + r() * 160; x.strokeStyle = rgba(mix(P.bg, P.alert, 0.25), 0.6); x.lineWidth = 0.7 + r() * 1.6; x.beginPath(); x.moveTo(x0, 0); x.quadraticCurveTo((x0 + x1) / 2, sag, x1, H * (0.28 + r() * 0.4)); x.stroke(); }
  x.restore();

  // rare CHASE events
  if (p.event === 'Ascension Beam') {
    const bxp = W * (0.3 + r() * 0.4); x.save(); x.globalCompositeOperation = 'lighter';
    const bg = x.createLinearGradient(bxp, H, bxp, 0); bg.addColorStop(0, rgba(P.alert, 0.5)); bg.addColorStop(1, rgba(P.alert, 0));
    x.fillStyle = bg; x.fillRect(bxp - W * 0.02, 0, W * 0.04, H); bloom(x, bxp, H * 0.4, W * 0.2, P.alert, 0.3); x.restore();
  } else if (p.event === 'Comet') {
    const c0x = r() * W, c0y = r() * horizon; x.save(); x.globalCompositeOperation = 'lighter';
    const cg = x.createLinearGradient(c0x, c0y, c0x + W * 0.3, c0y + H * 0.18); cg.addColorStop(0, rgba(P.win, 0.9)); cg.addColorStop(1, rgba(P.win, 0));
    x.strokeStyle = cg; x.lineWidth = 2.5; x.beginPath(); x.moveTo(c0x, c0y); x.lineTo(c0x + W * 0.3, c0y + H * 0.18); x.stroke(); bloom(x, c0x, c0y, 16, P.win, 0.9); x.restore();
  } else if (p.event === 'Alert') {
    hazeSheet(x, W, H, noise, P.alert, 0.14 * fm, 180);
  }

  // ════ TERMINAL / HUD OVERLAY (the braindance view) ════
  if (p.mode !== 'Ghost') {
    const fs = W * 0.012;
    for (const side of [0.03, 0.965]) { let cxp = W * side; for (let k = 0; k < 2; k++) { glyphCol(x, P, cxp, H * 0.06, H * 0.94, fs, 0.5, r); cxp += fs * 1.1 * (side < 0.5 ? 1 : -1); } }
    // diegetic header readout (asymmetric, top-left)
    x.save(); x.globalCompositeOperation = 'lighter'; x.font = `${fs * 0.95}px monospace`; x.textBaseline = 'top';
    let hx = W * 0.05; const hy = H * 0.045;
    for (let i = 0; i < rint(r, 8, 16); i++) { const seg = GLY[Math.floor(r() * GLY.length)]; x.fillStyle = rgba(r() < 0.15 ? P.alert : P.hud, 0.5 + r() * 0.4); x.fillText(seg, hx, hy); hx += fs * (0.8 + r() * 0.9); }
    x.strokeStyle = rgba(P.hud, 0.4); x.lineWidth = 1; x.beginPath(); x.moveTo(W * 0.05, hy + fs * 1.4); x.lineTo(hx, hy + fs * 1.4); x.stroke(); x.restore();
    // hero readout panel — the one focal anchor
    const hpw = W * (0.26 + r() * 0.08), hph = H * (0.16 + r() * 0.06);
    const heroLeft = r() < 0.5; const hpx = heroLeft ? W * (0.06 + r() * 0.04) : W * (0.62 - r() * 0.04);
    const hpy = r() < 0.5 ? H * (0.1 + r() * 0.08) : H * (0.66 - r() * 0.06);
    hudPanel(x, P, hpx, hpy, hpw, hph, r);
    // satellite panels
    const panels = p.mode === 'Breach' ? rint(r, 2, 4) : rint(r, 1, 2);
    for (let i = 0; i < panels; i++) { const pw = W * (0.13 + r() * 0.13), ph = H * (0.08 + r() * 0.1); const px = W * (0.05 + r() * 0.7), py = H * (0.06 + r() * 0.76); hudPanel(x, P, Math.min(px, W - pw - W * 0.05), Math.min(py, H - ph - H * 0.05), pw, ph, r); }
    // reticle — rare + offset (Trace/Breach only)
    if (p.mode === 'Trace' || p.mode === 'Breach') reticle(x, P, W * (heroLeft ? 0.6 : 0.34) + (r() - 0.5) * W * 0.12, H * (0.3 + r() * 0.32), Math.min(W, H) * (0.1 + r() * 0.06), r);
  }

  // breach glitch tear
  if (p.mode === 'Breach') {
    const slices = rint(r, 5, 11);
    for (let i = 0; i < slices; i++) { const sy = r() * H, sh = 5 + r() * 34, offX = (r() - 0.5) * W * 0.1; try { const im = x.getImageData(0, sy, W, sh); x.putImageData(im, offX, sy); } catch { /* skip */ } }
  }

  // non-optional atmospheric falloff: near-black void up top, fog pooling low
  const vf = x.createLinearGradient(0, 0, 0, H);
  vf.addColorStop(0, rgba(mix(P.bg, '#000000', 0.5), 0.55));
  vf.addColorStop(0.4, rgba(P.bg, 0.0));
  vf.addColorStop(1, rgba(P.bg, 0.0));
  x.fillStyle = vf; x.fillRect(0, 0, W, H);
  x.save(); x.globalCompositeOperation = 'screen';
  const lowFog = x.createLinearGradient(0, H * 0.55, 0, H);
  lowFog.addColorStop(0, rgba(P.fog, 0)); lowFog.addColorStop(1, rgba(mix(P.fog, P.glow, 0.2), 0.32 * fm));
  x.fillStyle = lowFog; x.fillRect(0, H * 0.55, W, H * 0.45); x.restore();

  // CRT / film finish
  scanlines(x, W, H, 3, p.mode === 'Ghost' ? 0.08 : 0.15);
  chromaSplit(x, W, H, p.mode === 'Breach' ? 3 : 1);
  hazeSheet(x, W, H, noise, P.glow, 0.09 * fm, 230);
  grain(x, W, H, 500, r);
  vignette(x, W, H, 0.48);
  return p;
}

/* Paint at native resolution offscreen, blit to the requested width. */
export const renderArcology: EngineFn = (canvas, tokenId, width) => {
  const off = document.createElement('canvas');
  const p = paint(off, tokenId);
  const W = Math.max(1, Math.floor(width));
  const H = Math.max(1, Math.round((W * off.height) / off.width));
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(off, 0, 0, W, H);
  return { aspect: off.width / off.height, traits: traitsFrom(p) };
};

export const arcologySchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((x) => x.name) },
    { name: 'Format', values: FMTS.map((f) => f.t) },
    { name: 'Atmosphere', values: [...ATMOS] },
    { name: 'Structure', values: [...STRUCT] },
    { name: 'Overlay', values: [...MODE] },
    {
      name: 'Event', values: ['None', 'Ascension Beam', 'Alert', 'Blackout', 'Comet'],
      subtraits: [
        { name: 'Common', values: ['None'] },
        { name: 'Chase', values: ['Ascension Beam', 'Alert', 'Blackout', 'Comet'] },
      ],
    },
  ],
};
