/*
 * Electrum — by opus4-8. The platform HALO project.
 *
 * Abstract electro-crystalline growth rendered as gleaming precious-metal
 * filigree: dendrites grow by space-colonization toward a noise-shaped
 * attractor cloud, then every limb is painted as an electro-deposited metal
 * cross-section — dark ambient-occlusion flank, a saturated coloured body, an
 * iridescent thin-film band, a bright base-alloy face and a hot specular spine
 * — so the branches read as wet, banded, gleaming metal, not flat ink. Growth
 * fronts fire iridescent glints + bloom. Most colorways are bright saturated
 * JEWEL grounds (branches carry their own vivid hue + a crisp dark separation
 * halo so they pop, never muddy); two rare DARK premium colorways (Nocturne
 * Gold, Obsidian Oil) are the chase range.
 *
 * Four growth modes: Crown (one central tree), Lattice (scattered seeds),
 * Frost (creeping in from the borders), Starburst (radial medallion — RARE).
 * Deterministic in tokenId — params() fixes the frozen RNG prefix so traitsOf()
 * and render() agree. Painted at native resolution offscreen, blitted to the
 * requested width.
 *
 * Selected as the halo via a multi-direction jury bake-off (2026-06-21): it won
 * the collector + composition lenses on originality, per-seed variety and
 * detail; a variation round then imported the sheen + colour-forward grounds the
 * colour/brand lenses wanted. Direct port of tools/halo/rime2.js (the judged
 * R&D engine); KIT helpers are inlined here so it is self-contained.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

type Ctx = CanvasRenderingContext2D;
type R = () => number;
interface Noise { noise2(x: number, y: number): number; fbm(x: number, y: number, oct?: number, gain?: number, lac?: number): number; }

interface Pal {
  name: string; bg: string; metalA: string; metalB: string; spark: string;
  iridA: number; irid: number; dark: boolean;
}

/* ── Colorways. bg = ground. metalA/metalB = metal base hues root→tip.
   iridA = iridescence hue centre (turns), irid = iridescence saturation,
   spark = hottest tip pop. dark = the rare premium dark range. ── */
const PALS: Pal[] = [
  { name: 'Electric Teal', bg: '#0fb6c2', metalA: '#063e52', metalB: '#a9fff0', spark: '#ffffff', iridA: 0.46, irid: 0.92, dark: false },
  { name: 'Magenta Flux', bg: '#d61f8c', metalA: '#4a0a3a', metalB: '#ffd0ef', spark: '#fff2fb', iridA: 0.82, irid: 0.95, dark: false },
  { name: 'Cobalt Arc', bg: '#1b53d6', metalA: '#08163f', metalB: '#bcd4ff', spark: '#f2f7ff', iridA: 0.60, irid: 0.92, dark: false },
  { name: 'Viridian Edge', bg: '#11a05a', metalA: '#073320', metalB: '#b6ffd2', spark: '#f0fff6', iridA: 0.40, irid: 0.90, dark: false },
  { name: 'Amber Gold', bg: '#f2a519', metalA: '#5a3206', metalB: '#fff0bf', spark: '#fffae6', iridA: 0.12, irid: 0.85, dark: false },
  { name: 'Coral Flare', bg: '#f0573a', metalA: '#5c1408', metalB: '#ffd6b0', spark: '#fff1e8', iridA: 0.06, irid: 0.90, dark: false },
  { name: 'Violet Surge', bg: '#7a3cf0', metalA: '#2a0a52', metalB: '#e2cfff', spark: '#f8f2ff', iridA: 0.74, irid: 0.95, dark: false },
  { name: 'Nocturne Gold', bg: '#0d0a06', metalA: '#5a431a', metalB: '#ffd874', spark: '#fff4cf', iridA: 0.13, irid: 0.80, dark: true },
  { name: 'Obsidian Oil', bg: '#0a0c12', metalA: '#2c3a5e', metalB: '#9fd0ff', spark: '#eaf6ff', iridA: 0.58, irid: 0.95, dark: true },
];

const FMTS = [
  { W: 1400, H: 1400, t: 'Square' },
  { W: 1500, H: 1120, t: 'Landscape' },
  { W: 1120, H: 1500, t: 'Portrait' },
] as const;

// Starburst weighted RARE — a chase mode, not a default.
const MODES = ['Crown', 'Crown', 'Crown', 'Lattice', 'Lattice', 'Lattice', 'Frost', 'Frost', 'Frost', 'Starburst'];
const DENS = ['Sparse', 'Balanced', 'Balanced', 'Thicket'];

export const ELECTRUM_ASPECTS: readonly number[] = [1, 1500 / 1120, 1120 / 1500];

interface Params { pal: Pal; fmt: typeof FMTS[number]; mode: string; dens: string; }

/* FROZEN DRAW ORDER — palette, format, mode, density. */
function params(r: R): Params {
  const pal = pick(PALS, r);
  const fmt = pick(FMTS, r);
  const mode = pick(MODES, r);
  const dens = pick(DENS, r);
  return { pal, fmt, mode, dens };
}

function traitsFrom(p: Params): OutputTraits {
  return { Palette: p.pal.name, Format: p.fmt.t, Growth: p.mode, Density: p.dens };
}

export const electrumTraits: TraitsFn = (tokenId) => traitsFrom(params(seededRng(tokenId)));

/* ── inlined KIT helpers (self-contained) ───────────────────────────────────── */
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
const rint = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
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
  return hsl2hex((phase * 360 % 360 + 360) % 360, sat == null ? 0.85 : sat, light == null ? 0.6 : light);
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
function chromaSplit(x: Ctx, W: number, H: number, off: number) {
  try {
    const img = x.getImageData(0, 0, W, H); const d = img.data; const out = x.createImageData(W, H); const o = out.data; const dx = off | 0;
    for (let y = 0; y < H; y++) for (let i = 0; i < W; i++) { const idx = (y * W + i) * 4; const rx = Math.min(W - 1, i + dx), bx = Math.max(0, i - dx); o[idx] = d[(y * W + rx) * 4]; o[idx + 1] = d[idx + 1]; o[idx + 2] = d[(y * W + bx) * 4 + 2]; o[idx + 3] = 255; }
    x.putImageData(out, 0, 0);
  } catch (e) { /* tainted/unsupported — skip */ }
}

function densMul(d: string) { return d === 'Sparse' ? 0.82 : d === 'Thicket' ? 1.6 : 1.15; }

interface Node { x: number; y: number; parent: number; gen: number; dir: [number, number] | null; }
interface Edge { a: number; b: number; }

/* ── Space-colonization growth ── */
function grow(seeds: { x: number; y: number; dir?: [number, number] }[], attractors: { x: number; y: number }[], opts: { stepLen: number; attrDist: number; killDist: number; maxNodes: number }, r: R) {
  const { stepLen, attrDist, killDist, maxNodes } = opts;
  const nodes: Node[] = [];
  for (const s of seeds) nodes.push({ x: s.x, y: s.y, parent: -1, gen: 0, dir: s.dir || null });
  const edges: Edge[] = [];
  let attr = attractors.slice();
  let guard = 0;
  while (attr.length && nodes.length < maxNodes && guard++ < 4000) {
    const pull = new Map<number, [number, number, number]>();
    for (let ai = 0; ai < attr.length; ai++) {
      const a = attr[ai];
      let best = -1, bd = attrDist * attrDist;
      for (let ni = 0; ni < nodes.length; ni++) {
        const n = nodes[ni];
        const dx = a.x - n.x, dy = a.y - n.y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = ni; }
      }
      if (best >= 0) {
        const dx = a.x - nodes[best].x, dy = a.y - nodes[best].y, m = Math.hypot(dx, dy) || 1;
        const e = pull.get(best) || [0, 0, 0];
        e[0] += dx / m; e[1] += dy / m; e[2]++;
        pull.set(best, e);
      }
    }
    if (!pull.size) break;
    const added: Node[] = [];
    for (const [ni, e] of pull) {
      const n = nodes[ni];
      let dx = e[0], dy = e[1];
      if (n.dir) { dx = dx * 0.72 + n.dir[0] * 0.28; dy = dy * 0.72 + n.dir[1] * 0.28; }
      const m = Math.hypot(dx, dy) || 1;
      const ux = dx / m, uy = dy / m;
      const jx = -uy, jy = ux;
      const w = (r() - 0.5) * 0.5;
      const nx = n.x + (ux + jx * w) * stepLen;
      const ny = n.y + (uy + jy * w) * stepLen;
      const idx = nodes.length + added.length;
      added.push({ x: nx, y: ny, parent: ni, gen: n.gen + 1, dir: [ux, uy] });
      edges.push({ a: ni, b: idx });
    }
    for (const a of added) nodes.push(a);
    attr = attr.filter((a) => {
      for (const ni of pull.keys()) {
        const n = nodes[ni];
        if ((a.x - n.x) ** 2 + (a.y - n.y) ** 2 < killDist * killDist) return false;
      }
      return true;
    });
  }
  const childCount = new Array(nodes.length).fill(0);
  for (let i = nodes.length - 1; i >= 0; i--) {
    const pp = nodes[i].parent;
    if (pp >= 0) childCount[pp] += 1 + childCount[i];
  }
  return { nodes, edges, childCount };
}

/* ── paint one branch segment as a gleaming chrome cross-section ── */
function metalSeg(x: Ctx, P: Pal, ax: number, ay: number, bx: number, by: number, width: number, bodyHue: string, irc: string, sparkT: number) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len, ny = dx / len;
  x.lineCap = 'round';
  x.strokeStyle = rgba('#05060c', P.dark ? 0.34 : 0.5);
  x.lineWidth = width * 1.5;
  x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
  x.strokeStyle = rgba(mix(bodyHue, '#04050a', 0.72), 0.82);
  x.lineWidth = width * 1.12;
  x.beginPath(); x.moveTo(ax + nx * width * 0.2, ay + ny * width * 0.2); x.lineTo(bx + nx * width * 0.2, by + ny * width * 0.2); x.stroke();
  x.strokeStyle = rgba(bodyHue, 0.98);
  x.lineWidth = width;
  x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
  x.save(); x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(irc, 0.5);
  x.lineWidth = width * 0.66;
  x.beginPath(); x.moveTo(ax - nx * width * 0.14, ay - ny * width * 0.14); x.lineTo(bx - nx * width * 0.14, by - ny * width * 0.14); x.stroke();
  x.restore();
  x.strokeStyle = rgba(mix(bodyHue, P.metalB, 0.85), 0.95);
  x.lineWidth = width * 0.5;
  x.beginPath(); x.moveTo(ax - nx * width * 0.26, ay - ny * width * 0.26); x.lineTo(bx - nx * width * 0.26, by - ny * width * 0.26); x.stroke();
  x.save(); x.globalCompositeOperation = 'lighter';
  x.strokeStyle = rgba(mix(P.metalB, '#ffffff', 0.9), 0.6 + sparkT * 0.4);
  x.lineWidth = Math.max(0.8, width * 0.28);
  x.beginPath(); x.moveTo(ax - nx * width * 0.4, ay - ny * width * 0.4); x.lineTo(bx - nx * width * 0.4, by - ny * width * 0.4); x.stroke();
  x.restore();
}

function paint(off: HTMLCanvasElement, tokenId: number): Params {
  const r = seededRng(tokenId), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
  off.width = W; off.height = H;
  const x = off.getContext('2d');
  if (!x) return p;
  const noise = makeNoise(tokenId);
  const S = Math.min(W, H);
  const dm = densMul(p.dens);
  const bright = !P.dark;

  const gg = x.createRadialGradient(W * 0.4, H * 0.34, S * 0.05, W * 0.5, H * 0.56, S * 0.98);
  gg.addColorStop(0, mix(P.bg, '#ffffff', bright ? 0.22 : 0.07));
  gg.addColorStop(0.55, P.bg);
  gg.addColorStop(1, mix(P.bg, P.dark ? '#000' : '#04060e', P.dark ? 0.55 : 0.4));
  x.fillStyle = gg; x.fillRect(0, 0, W, H);

  hazeSheet(x, W, H, noise, iridescent(P.iridA + 0.12, 0.7, bright ? 0.62 : 0.5), bright ? 0.1 : 0.12, 240, 'screen');
  mottle(x, 0, 0, W, H, P.bg, 1100, r, bright ? 'soft-light' : 'overlay');

  const seeds: { x: number; y: number; dir?: [number, number] }[] = [];
  let attractors: { x: number; y: number }[] = [];
  const cx = W / 2, cy = H / 2;
  const nAttr = Math.floor((p.mode === 'Frost' ? 2300 : 2000) * dm);

  function pushAttr(px: number, py: number, mask: number) {
    const n = (noise.fbm(px / (S * 0.22), py / (S * 0.22), 4) + 1) / 2;
    if (n < (mask == null ? 0.3 : mask)) return;
    attractors.push({ x: px, y: py });
  }

  if (p.mode === 'Crown') {
    const sx = cx + (r() - 0.5) * W * 0.18, sy = H * (0.9 + r() * 0.05);
    seeds.push({ x: sx, y: sy, dir: [0, -1] });
    const spread = S * (0.38 + r() * 0.1), top = H * (0.05 + r() * 0.06);
    for (let i = 0; i < nAttr; i++) {
      const t = r();
      const px = sx + (r() - 0.5) * spread * 2 * (0.5 + t);
      const py = sy - t * (sy - top);
      pushAttr(px, py, 0.26);
    }
  } else if (p.mode === 'Lattice') {
    const ns = rint(r, 7, 11);
    for (let i = 0; i < ns; i++) seeds.push({ x: W * (0.08 + r() * 0.84), y: H * (0.08 + r() * 0.84) });
    for (let i = 0; i < nAttr; i++) pushAttr(W * (0.04 + r() * 0.92), H * (0.04 + r() * 0.92), 0.24);
  } else if (p.mode === 'Starburst') {
    seeds.push({ x: cx, y: cy });
    const sec = rint(r, 5, 9);
    for (let i = 0; i < sec; i++) { const a = (i / sec) * Math.PI * 2; seeds.push({ x: cx + Math.cos(a) * S * 0.04, y: cy + Math.sin(a) * S * 0.04, dir: [Math.cos(a), Math.sin(a)] }); }
    const rad = S * (0.46 + r() * 0.08);
    for (let i = 0; i < nAttr; i++) {
      const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.55) * rad;
      pushAttr(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 0.28);
    }
  } else { // Frost
    const edges4 = [0, 1, 2, 3];
    const nSeed = rint(r, 12, 20);
    for (let i = 0; i < nSeed; i++) {
      const e = pick(edges4, r), t = r();
      if (e === 0) seeds.push({ x: t * W, y: 0, dir: [0, 1] });
      else if (e === 1) seeds.push({ x: W, y: t * H, dir: [-1, 0] });
      else if (e === 2) seeds.push({ x: t * W, y: H, dir: [0, -1] });
      else seeds.push({ x: 0, y: t * H, dir: [1, 0] });
    }
    for (let i = 0; i < nAttr; i++) {
      const ex = Math.pow(r(), 1.5), side = r() < 0.5 ? ex : 1 - ex;
      const ey = Math.pow(r(), 1.5), side2 = r() < 0.5 ? ey : 1 - ey;
      pushAttr((r() < 0.5 ? side : r()) * W, (r() < 0.5 ? r() : side2) * H, 0.28);
    }
  }

  const stepLen = S * (0.0085 + (1 - Math.min(1, dm)) * 0.003);
  const g = grow(seeds, attractors, {
    stepLen,
    attrDist: S * (p.mode === 'Frost' ? 0.17 : 0.21),
    killDist: stepLen * 1.5,
    maxNodes: Math.floor(4600 * dm),
  }, r);

  const { nodes, edges, childCount } = g;
  const maxChild = Math.max(1, ...childCount);
  const maxGen = Math.max(1, ...nodes.map((n) => n.gen));

  x.save();
  for (let i = 0; i < nodes.length; i++) {
    const c = childCount[i];
    if (c < maxChild * 0.06) continue;
    const t = c / maxChild;
    softShadow(x, nodes[i].x + S * 0.012, nodes[i].y + S * 0.012, S * (0.02 + t * 0.05), 0.06 + t * 0.09);
  }
  x.restore();

  const iPhase = r();
  function segIrid(midx: number, midy: number, gen: number) {
    const along = gen / maxGen;
    const field = (noise.fbm(midx / (S * 0.3), midy / (S * 0.3), 3) + 1) * 0.5;
    const phase = P.iridA + iPhase * 0.06 + along * 0.22 + field * 0.16 - 0.19;
    return iridescent(phase, P.irid, bright ? 0.62 : 0.64);
  }

  const order = edges.slice().sort((e1, e2) => childCount[e2.a] - childCount[e1.a]);
  const trunkW = S * (0.027 + 0.011 * (1 - Math.min(1, dm)));
  for (const e of order) {
    const a = nodes[e.a], b = nodes[e.b];
    const tw = childCount[e.a] / maxChild;
    const width = Math.max(1.1, trunkW * Math.pow(tw, 0.5) + 1.0);
    const gen = b.gen;
    const tipT = clamp(gen / maxGen, 0, 1);
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const irc = segIrid(mx, my, gen);
    const baseMetal = mix(P.metalA, P.metalB, 0.42 + tipT * 0.45);
    const bodyHue = mix(baseMetal, irc, bright ? 0.5 : 0.34);
    const isTip = childCount[e.b] === 0;
    const sparkT = isTip ? 1 : clamp(1 - tw, 0, 1) * 0.5;
    metalSeg(x, P, a.x, a.y, b.x, b.y, width, bodyHue, irc, sparkT);
  }

  const leaves: number[] = [];
  for (let i = 0; i < nodes.length; i++) if (childCount[i] === 0) leaves.push(i);
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let li = 0; li < leaves.length; li++) {
    const i = leaves[li];
    const n = nodes[i];
    const par = n.parent >= 0 ? nodes[n.parent] : null;
    const irc = segIrid(n.x, n.y, n.gen);
    const rad = S * (0.005 + (li % 3 === 0 ? 0.0045 : 0.0016));
    x.save(); x.globalCompositeOperation = 'source-over';
    x.fillStyle = rgba(mix(P.metalA, '#04050a', 0.55), 0.55);
    x.beginPath(); x.arc(n.x, n.y, rad * 0.7, 0, Math.PI * 2); x.fill();
    x.restore();
    const gr = x.createRadialGradient(n.x, n.y, 0, n.x, n.y, rad);
    gr.addColorStop(0, rgba(P.spark, 0.95));
    gr.addColorStop(0.32, rgba(irc, 0.7));
    gr.addColorStop(1, rgba(irc, 0));
    x.fillStyle = gr; x.beginPath(); x.arc(n.x, n.y, rad, 0, Math.PI * 2); x.fill();
    if (par && li % 2 === 0) {
      const dx = n.x - par.x, dy = n.y - par.y, m = Math.hypot(dx, dy) || 1;
      x.strokeStyle = rgba(irc, 0.55);
      x.lineWidth = 1.2;
      x.beginPath(); x.moveTo(n.x, n.y); x.lineTo(n.x + (dx / m) * rad * 2.6, n.y + (dy / m) * rad * 2.6); x.stroke();
    }
  }
  x.restore();

  let scount = 0;
  for (let li = 0; li < leaves.length; li += 7) {
    if (scount++ > 70) break;
    const n = nodes[leaves[li]];
    const irc = segIrid(n.x, n.y, n.gen);
    sheen(x, n.x, n.y, S * (0.012 + r() * 0.016), mix(P.spark, irc, 0.4), 0.16);
    if (li % 3 === 0) bloom(x, n.x, n.y, S * (0.02 + r() * 0.02), irc, 0.12);
  }

  const scx = W * (0.3 + r() * 0.4), scy = H * (0.2 + r() * 0.3);
  sheen(x, scx, scy, S * (0.45 + r() * 0.12), mix(P.spark, P.metalB, 0.3), P.dark ? 0.18 : 0.14);

  hazeSheet(x, W, H, noise, mix(P.metalB, P.spark, 0.4), P.dark ? 0.08 : 0.06, 300, 'screen');
  chromaSplit(x, W, H, 1);
  grain(x, W, H, 620, r);
  vignette(x, W, H, P.dark ? 0.5 : 0.42);
  return p;
}

export const renderElectrum: EngineFn = (canvas, tokenId, width) => {
  const off = document.createElement('canvas');
  const p = paint(off, tokenId);
  const W = Math.max(1, Math.floor(width));
  const H = Math.max(1, Math.round((W * off.height) / off.width));
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(off, 0, 0, W, H);
  return { aspect: off.width / off.height, traits: traitsFrom(p) };
};

export const electrumSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format', values: ['Square', 'Landscape', 'Portrait'] },
    { name: 'Growth', values: ['Crown', 'Lattice', 'Frost', 'Starburst'] },
    { name: 'Density', values: ['Sparse', 'Balanced', 'Thicket'] },
  ],
};
