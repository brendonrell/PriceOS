/*
 * Terminal Network — by opus4-8. A quietly two-in-one collection: every Output
 * is one of two cohabiting systems on bright, saturated grounds (never black) —
 *
 *   TERMINAL — a bold operator's console: glyph rain, HUD readout panels,
 *              reticles, big BREACH/ALERT/ACCESS type, on hazard-yellow, amber,
 *              acid, signal-red, teal, Klein-blue, or light concrete/print.
 *   NETWORK  — a crisp wire-and-node schematic: meshes, spines, PCB circuits,
 *              constellations and bursts drawn as dark line-work on the same
 *              vivid grounds (blueprint, concrete, acid, amber, red, viola,
 *              teal, magenta).
 *
 * The `System` trait says which a given Output is; the two share format + a
 * bright palette language so the set reads as one body of work. Deterministic in
 * tokenId — params() fixes the frozen RNG prefix so traitsOf() and render()
 * agree. Painted at native resolution offscreen, blitted to the requested width.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

type Ctx = CanvasRenderingContext2D;
type R = () => number;

interface TPal { name: string; bg: string; dim: string; hot: string; txt: string; alt: string; warn: string; }
interface NPal { name: string; bg: string; fog: string; edge: string; node: string; hot: string; pkt: string; }
interface Node { x: number; y: number; depth: number; r: number; hub: boolean; col: string; }

/* ── palettes — every ground bright or saturated, NONE black/near-black ─────── */
const TPALS: TPal[] = [
  { name: 'Hazard',        bg: '#f2d400', dim: '#7a6c00', hot: '#e2231a', txt: '#0c0c00', alt: '#0c0c00', warn: '#e2231a' },
  { name: 'Bone OS',       bg: '#dde1e6', dim: '#8a93a0', hot: '#0a5cff', txt: '#11151c', alt: '#11151c', warn: '#e2231a' },
  { name: 'Amber Flood',   bg: '#e07814', dim: '#7a3e00', hot: '#103a6a', txt: '#2a1200', alt: '#fff2c0', warn: '#d61a2b' },
  { name: 'Acid Wash',     bg: '#c6e618', dim: '#5a7012', hot: '#ff2d8a', txt: '#13280a', alt: '#13280a', warn: '#ff2d8a' },
  { name: 'Cyan Print',    bg: '#d6ebef', dim: '#7aa6ae', hot: '#e2231a', txt: '#06242c', alt: '#06242c', warn: '#d61a2b' },
  { name: 'Signal Red',    bg: '#d61a2b', dim: '#7a0c14', hot: '#ffd400', txt: '#fff0e0', alt: '#fff0e0', warn: '#ffffff' },
  { name: 'Electric Teal', bg: '#16c0c0', dim: '#0a5a5a', hot: '#ff2d8a', txt: '#06303a', alt: '#06303a', warn: '#ffffff' },
  { name: 'Klein Blue',    bg: '#1f44d0', dim: '#0a2080', hot: '#ffd400', txt: '#eaf0ff', alt: '#eaf0ff', warn: '#ff5db0' },
];
const NPALS: NPal[] = [
  { name: 'Blueprint',   bg: '#dde7ec', fog: '#c2d2da', edge: '#16455f', node: '#0a2a3a', hot: '#e2231a', pkt: '#0a66ff' },
  { name: 'Concrete',    bg: '#d6d9de', fog: '#bcc0c8', edge: '#1a2230', node: '#0a0e16', hot: '#0a5cff', pkt: '#e2231a' },
  { name: 'Acid',        bg: '#c6e618', fog: '#a6c810', edge: '#2a4a0a', node: '#13280a', hot: '#ff2d8a', pkt: '#0a3a14' },
  { name: 'Amber Day',   bg: '#e08a1a', fog: '#c06e10', edge: '#5a2e00', node: '#2a1400', hot: '#103a6a', pkt: '#b01020' },
  { name: 'Signal Red',  bg: '#d61a2b', fog: '#a81020', edge: '#ffe9d0', node: '#fff0e0', hot: '#ffd400', pkt: '#2a0006' },
  { name: 'Viola',       bg: '#7a3ad0', fog: '#5a2aa0', edge: '#e6d8ff', node: '#ffffff', hot: '#ffe11f', pkt: '#2af0ff' },
  { name: 'Teal Sea',    bg: '#14b0b0', fog: '#0e8a8a', edge: '#06303a', node: '#062028', hot: '#ff2d8a', pkt: '#fff0c0' },
  { name: 'Magenta Day', bg: '#e01f8a', fog: '#b01070', edge: '#3a0420', node: '#2a0418', hot: '#2af0ff', pkt: '#ffe11f' },
];

const TFMTS = [ { W: 1320, H: 1320, t: 'Screen' }, { W: 1500, H: 1120, t: 'Console' }, { W: 1120, H: 1500, t: 'Stack' } ] as const;
const NFMTS = [ { W: 1340, H: 1340, t: 'Field' }, { W: 1500, H: 1120, t: 'Span' }, { W: 1120, H: 1500, t: 'Column' } ] as const;
const TLAYOUTS = ['Boot', 'Flood', 'Breach', 'Dossier', 'Map', 'Alert'] as const;
const NTOPO = ['Core', 'Mesh', 'Spine', 'Circuit', 'Constellation', 'Burst'] as const;
// weighted topology pool: cap the "mesh blob", favour the distinct topologies.
const NTOPO_POOL = ['Core', 'Mesh', 'Spine', 'Spine', 'Circuit', 'Circuit', 'Circuit', 'Constellation', 'Constellation', 'Burst', 'Burst'];
const GLY = '0123456789ABCDEF░▒▓█▌▐│┤╡╢╖╕╣║╗╝┐└┴┬├─┼╞╟╚╔╩╦╠═╬⌐¬∷∴◊◆◇▮▯ｱｲｳｴｵｶｷｸｹｺﾊﾋﾌﾍﾎ';

export const TERMINAL_NETWORK_ASPECTS: readonly number[] = [1, 1500 / 1120, 1120 / 1500];

type Params =
  | { system: 'Terminal'; pal: TPal; fmt: typeof TFMTS[number]; layout: string; cols: number }
  | { system: 'Network'; pal: NPal; fmt: typeof NFMTS[number]; topo: string; nodes: number };

/* FROZEN DRAW ORDER — System first, then the per-system prefix. */
function params(r: R): Params {
  const system = r() < 0.5 ? 'Terminal' : 'Network';
  if (system === 'Terminal') {
    return { system, pal: pick(TPALS, r), fmt: pick(TFMTS, r), layout: pick([...TLAYOUTS], r), cols: rint(r, 14, 30) };
  }
  return { system, pal: pick(NPALS, r), fmt: pick(NFMTS, r), topo: pick(NTOPO_POOL, r), nodes: rint(r, 240, 480) };
}

function traitsFrom(p: Params): OutputTraits {
  if (p.system === 'Terminal') {
    return { System: 'Terminal', Palette: p.pal.name, Format: p.fmt.t, Layout: p.layout, Density: p.cols >= 22 ? 'Dense' : 'Sparse' };
  }
  return { System: 'Network', Palette: p.pal.name, Format: p.fmt.t, Topology: p.topo, Scale: p.nodes >= 280 ? 'Dense' : 'Open' };
}

export const terminalNetworkTraits: TraitsFn = (tokenId) => traitsFrom(params(seededRng(tokenId)));

/* ── helpers (typed, self-contained) ───────────────────────────────────────── */
function h2r(h: string): [number, number, number] { const v = parseInt(h.slice(1), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; }
function r2h(c: number[]): string { const f = (n: number) => ('0' + Math.round(Math.max(0, Math.min(255, n))).toString(16)).slice(-2); return '#' + f(c[0]) + f(c[1]) + f(c[2]); }
function mix(a: string, b: string, t: number): string { const A = h2r(a), B = h2r(b); return r2h([A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]); }
function rgba(h: string, a: number): string { const c = h2r(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
const rint = (r: R, a: number, b: number) => a + Math.floor(r() * (b - a + 1));
const randn = (r: R) => r() + r() + r() + r() - 2;

function halftone(x: Ctx, W: number, H: number, ink: string, r: R) {
  x.save(); x.globalCompositeOperation = 'multiply'; const g = 6;
  for (let y = 0; y < H; y += g) for (let xx = 0; xx < W; xx += g) { x.fillStyle = rgba(ink, 0.04 + r() * 0.05); x.beginPath(); x.arc(xx, y, 0.4 + r() * 1.0, 0, Math.PI * 2); x.fill(); }
  x.restore();
}
function _splatRect(d: Uint8ClampedArray, W: number, H: number, fx: number, fy: number, fw: number, fh: number, R2: number, G: number, B: number, a: number) { const x1 = Math.max(0, Math.floor(fx)), y1 = Math.max(0, Math.floor(fy)); const x2 = Math.min(W - 1, Math.ceil(fx + fw) - 1), y2 = Math.min(H - 1, Math.ceil(fy + fh) - 1); for (let py = y1; py <= y2; py++) { const cy = Math.min(py + 1, fy + fh) - Math.max(py, fy); if (cy <= 0) continue; for (let px = x1; px <= x2; px++) { const cx = Math.min(px + 1, fx + fw) - Math.max(px, fx); if (cx <= 0) continue; const sa = a * cx * cy; const i = (py * W + px) * 4; const da = d[i + 3] / 255; const oa = sa + da * (1 - sa); if (oa <= 0) continue; d[i] = (R2 * sa + d[i] * da * (1 - sa)) / oa; d[i + 1] = (G * sa + d[i + 1] * da * (1 - sa)) / oa; d[i + 2] = (B * sa + d[i + 2] * da * (1 - sa)) / oa; d[i + 3] = oa * 255; } } }
function grain(x: Ctx, W: number, H: number, amt: number, r: R) { const n = Math.floor(W * H / amt); if (n <= 0) return; const off = document.createElement('canvas'); off.width = W; off.height = H; const oc = off.getContext('2d'); if (!oc) return; const img = oc.createImageData(W, H); const d = img.data; for (let i = 0; i < n; i++) { const g = r() < 0.5 ? 0 : 255; const a = 0.012 + r() * 0.04; _splatRect(d, W, H, r() * W, r() * H, 1, 1, g, g, g, a); } oc.putImageData(img, 0, 0); x.drawImage(off, 0, 0); off.width = 0; off.height = 0; }
function scanlines(x: Ctx, W: number, H: number, gap: number, a: number) { x.save(); x.globalCompositeOperation = 'multiply'; x.fillStyle = `rgba(0,0,0,${a})`; for (let y = 0; y < H; y += gap) x.fillRect(0, y, W, 1); x.restore(); }
function vignetteMul(x: Ctx, W: number, H: number, s: number) { x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(W / 2, H * 0.46, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, `rgba(0,0,0,${1 - s})`); x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore(); }

/* ════════════════════ TERMINAL ════════════════════ */
function tGround(x: Ctx, P: TPal, W: number, H: number, r: R) {
  x.fillStyle = P.bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = rgba(P.txt, 0.08); x.lineWidth = 1; const gg = W / 30;
  for (let i = 0; i < W; i += gg) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let j = 0; j < H; j += gg) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
  for (let i = 0; i < rint(r, 1, 3); i++) { x.fillStyle = rgba(i === 0 ? P.hot : P.txt, 0.9); const bw = W * (0.18 + r() * 0.3), bh = H * (0.02 + r() * 0.03); x.fillRect(W * (0.05 + r() * 0.4), H * (0.04 + r() * 0.86), bw, bh); }
}
function tGlyphRain(x: Ctx, P: { txt: string; alt: string; warn: string }, W: number, H: number, cols: number, alpha: number, r: R) {
  const cw = W / cols, fs = cw * 0.82; x.font = `${fs}px monospace`; x.textBaseline = 'top';
  for (let c = 0; c < cols; c++) { const cx = c * cw + cw * 0.12; const head = r() * H, len = H * (0.4 + r() * 0.9), step = fs * 1.06;
    for (let y = -H * 0.2; y < H; y += step) { const d = ((y - head) % len + len) % len / len; const a = (1 - d) * alpha * (0.5 + r() * 0.5); if (a < 0.05) continue;
      const col = d < 0.06 ? P.alt : (r() < 0.12 ? P.warn : P.txt); x.fillStyle = rgba(col, a * (d < 0.06 ? 1 : 0.7)); x.fillText(GLY[Math.floor(r() * GLY.length)], cx, y); } }
}
function tPanel(x: Ctx, P: TPal, px: number, py: number, pw: number, ph: number, r: R, big: boolean) {
  x.save();
  x.fillStyle = rgba('#ffffff', P.bg === '#dde1e6' || P.bg === '#d6ebef' ? 0.5 : 0.16); x.fillRect(px, py, pw, ph);
  x.strokeStyle = rgba(P.txt, 0.9); x.lineWidth = big ? 3 : 1.8; x.strokeRect(px, py, pw, ph);
  const b = Math.min(pw, ph) * 0.16; x.lineWidth = big ? 3 : 2; x.strokeStyle = rgba(P.hot, 0.9);
  ([[px, py, 1, 1], [px + pw, py, -1, 1], [px, py + ph, 1, -1], [px + pw, py + ph, -1, -1]] as const).forEach(([ax, ay, sx, sy]) => { x.beginPath(); x.moveTo(ax + sx * b, ay); x.lineTo(ax, ay); x.lineTo(ax, ay + sy * b); x.stroke(); });
  x.fillStyle = rgba(P.hot, 0.9); x.fillRect(px, py, pw, ph * 0.1);
  const kind = r();
  if (kind < 0.38) { x.strokeStyle = rgba(P.hot, 0.95); x.lineWidth = big ? 2.4 : 1.6; x.beginPath(); const my = py + ph * 0.58, amp = ph * 0.32; for (let i = 0; i <= 90; i++) { const t = i / 90, xx = px + 6 + t * (pw - 12), yy = my + Math.sin(t * Math.PI * (4 + r() * 9) + r()) * amp * Math.sin(t * Math.PI); i === 0 ? x.moveTo(xx, yy) : x.lineTo(xx, yy); } x.stroke(); }
  else if (kind < 0.7) { const n = rint(r, 6, 13), bw = (pw - 12) / n; for (let i = 0; i < n; i++) { const bh = (ph * 0.72) * (0.1 + r()); x.fillStyle = rgba(r() < 0.22 ? P.warn : P.txt, 0.85); x.fillRect(px + 6 + i * bw, py + ph - 6 - bh, bw * 0.7, bh); } }
  else { const rows = rint(r, 3, 6); for (let i = 0; i < rows; i++) { const ry = py + ph * 0.2 + i * (ph * 0.7 / rows); let c = px + 6; while (c < px + pw - 8) { const w = 4 + r() * pw * 0.24, red = r() < 0.18; x.fillStyle = rgba(red ? P.warn : (r() < 0.5 ? P.txt : P.hot), red ? 0.85 : 0.45 + r() * 0.4); x.fillRect(c, ry, w, ph * 0.7 / rows * 0.5); c += w + 4 + r() * 8; } } }
  x.restore();
}
/* Small status label (not the old giant word — Brendon 2026-06-20). */
function tBig(x: Ctx, W: number, H: number, str: string, col: string, r: R) {
  const fs = W * 0.034; x.font = `bold ${fs}px monospace`; x.textBaseline = 'top'; x.textAlign = 'left';
  const tx = W * (0.06 + r() * 0.18), ty = H * (0.08 + r() * 0.46);
  x.fillStyle = rgba(col, 1); x.fillText(str, tx, ty);
  const w = x.measureText(str).width;
  x.strokeStyle = rgba(col, 0.7); x.lineWidth = 2; x.beginPath(); x.moveTo(tx, ty + fs * 1.2); x.lineTo(tx + w, ty + fs * 1.2); x.stroke();
}
function tReticle(x: Ctx, P: TPal, cx: number, cy: number, rad: number, r: R) {
  x.save(); x.strokeStyle = rgba(P.txt, 0.85); x.lineWidth = 2;
  for (const rr of [rad, rad * 0.62, rad * 0.3]) { x.beginPath(); x.arc(cx, cy, rr, 0, Math.PI * 2); x.stroke(); }
  const ticks = 48; for (let i = 0; i < ticks; i++) { const a = i / ticks * Math.PI * 2, l = i % 4 === 0 ? rad * 0.12 : rad * 0.05; x.beginPath(); x.moveTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.lineTo(cx + Math.cos(a) * (rad + l), cy + Math.sin(a) * (rad + l)); x.stroke(); }
  x.strokeStyle = rgba(P.hot, 0.7); x.beginPath(); x.moveTo(cx - rad * 1.3, cy); x.lineTo(cx + rad * 1.3, cy); x.moveTo(cx, cy - rad * 1.3); x.lineTo(cx, cy + rad * 1.3); x.stroke();
  x.restore();
}
function tGridScatter(W: number, H: number, n: number, r: R, fn: (px: number, py: number, pw: number, ph: number) => void) {
  const cols = rint(r, 3, 5), rows = rint(r, 3, 5), pad = W * 0.05; const cw = (W - pad * 2) / cols, ch = (H - pad * 2) / rows;
  const cells: [number, number][] = []; for (let cy = 0; cy < rows; cy++) for (let cx = 0; cx < cols; cx++) cells.push([cx, cy]);
  for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = cells[i]; cells[i] = cells[j]; cells[j] = t; }
  for (let i = 0; i < Math.min(n, cells.length); i++) { const [cx, cy] = cells[i]; fn(pad + cx * cw + cw * 0.06, pad + cy * ch + ch * 0.06, cw * 0.88, ch * 0.88); }
}
function drawTerminal(x: Ctx, P: TPal, W: number, H: number, layout: string, cols: number, r: R) {
  tGround(x, P, W, H, r);
  switch (layout) {
    case 'Boot':
      tGlyphRain(x, { txt: P.dim, alt: P.txt, warn: P.dim }, W, H, Math.floor(cols * 0.5), 0.5, r);
      tBig(x, W, H, pick(['BOOT', 'INIT', 'LOAD', 'WAKE', 'ONLINE'], r), P.hot, r);
      for (let i = 0; i < 2; i++) { const bw = W * 0.5, bx = W * 0.25, by = H * (0.62 + i * 0.08); x.strokeStyle = rgba(P.txt, 0.8); x.lineWidth = 2; x.strokeRect(bx, by, bw, H * 0.02); x.fillStyle = rgba(P.hot, 0.85); x.fillRect(bx, by, bw * r(), H * 0.02); }
      break;
    case 'Flood':
      tGlyphRain(x, { txt: P.dim, alt: P.txt, warn: P.dim }, W, H, cols, 0.55, r);
      tGlyphRain(x, P, W, H, Math.floor(cols * 0.8), 0.8, r);
      if (r() < 0.6) tPanel(x, P, W * 0.3, H * 0.4, W * 0.4, H * 0.2, r, true);
      break;
    case 'Breach':
      tGlyphRain(x, P, W, H, Math.floor(cols * 0.7), 0.7, r);
      for (let i = 0; i < rint(r, 8, 16); i++) { const bx = r() * W, by = r() * H, bw = W * (0.05 + r() * 0.25), bh = H * (0.01 + r() * 0.05); x.fillStyle = rgba(r() < 0.3 ? P.warn : P.hot, 0.85); x.fillRect(bx, by, bw, bh); }
      tBig(x, W, H, pick(['BREACH', 'ACCESS', '!ERR', 'NULL'], r), P.warn, r);
      break;
    case 'Dossier':
      tGlyphRain(x, { txt: P.dim, alt: P.txt, warn: P.dim }, W, H, Math.floor(cols * 0.5), 0.3, r);
      tPanel(x, P, W * 0.06, H * 0.08, W * 0.42, H * 0.5, r, true);
      tGridScatter(W, H, rint(r, 4, 7), r, (px, py, pw, ph) => tPanel(x, P, px, py, pw, ph, r, false));
      if (r() < 0.6) tReticle(x, P, W * 0.72, H * 0.7, W * 0.15, r);
      break;
    case 'Map': {
      x.strokeStyle = rgba(P.dim, 0.6); x.lineWidth = 1; const g = W / 24;
      for (let i = 0; i < W; i += g) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
      for (let j = 0; j < H; j += g) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
      for (let i = 0; i < rint(r, 26, 48); i++) { const nx = r() * W, ny = r() * H; x.fillStyle = rgba(r() < 0.2 ? P.warn : P.hot, 0.95); x.beginPath(); x.arc(nx, ny, 2.4 + r() * 2.6, 0, Math.PI * 2); x.fill(); if (r() < 0.6) { const tx = r() * W, ty = r() * H; x.strokeStyle = rgba(P.txt, 0.3); x.beginPath(); x.moveTo(nx, ny); x.lineTo(tx, ty); x.stroke(); } }
      tReticle(x, P, W * (0.3 + r() * 0.4), H * (0.3 + r() * 0.4), W * 0.13, r);
      tGridScatter(W, H, rint(r, 3, 5), r, (px, py, pw, ph) => tPanel(x, P, px, py, pw, ph * 0.6, r, false));
      break;
    }
    case 'Alert':
      x.fillStyle = rgba(P.warn, 0.12); x.fillRect(0, 0, W, H);
      for (let i = 0; i < H; i += H * 0.12) { x.fillStyle = rgba(i % (H * 0.24) < H * 0.12 ? P.warn : P.hot, 0.12); x.fillRect(0, i, W, H * 0.06); }
      tGlyphRain(x, { txt: P.warn, alt: P.alt, warn: P.warn }, W, H, Math.floor(cols * 0.6), 0.5, r);
      tBig(x, W, H, pick(['ALERT', 'WARN', 'LOCK', '⚠'], r), P.warn, r);
      tPanel(x, P, W * 0.2, H * 0.66, W * 0.6, H * 0.16, r, true);
      break;
  }
  scanlines(x, W, H, 3, 0.05); halftone(x, W, H, P.txt, r); grain(x, W, H, 900, r); vignetteMul(x, W, H, 0.84);
}

/* ════════════════════ NETWORK ════════════════════ */
function nGround(x: Ctx, P: NPal, W: number, H: number) {
  x.fillStyle = P.bg; x.fillRect(0, 0, W, H);
  x.strokeStyle = rgba(P.edge, 0.06); x.lineWidth = 1; const gg = W / 28;
  for (let i = 0; i < W; i += gg) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, H); x.stroke(); }
  for (let j = 0; j < H; j += gg) { x.beginPath(); x.moveTo(0, j); x.lineTo(W, j); x.stroke(); }
}
function nEdge(x: Ctx, P: NPal, a: Node, b: Node, alpha: number, lw: number, curve: boolean, r: R) {
  x.strokeStyle = rgba(P.edge, Math.min(0.85, alpha + 0.25)); x.lineWidth = lw; x.beginPath();
  if (curve) { const mx = (a.x + b.x) / 2 + randn(r) * 26, my = (a.y + b.y) / 2 + randn(r) * 26; x.moveTo(a.x, a.y); x.quadraticCurveTo(mx, my, b.x, b.y); } else { x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); }
  x.stroke();
  if (r() < 0.28) { const t = r(); x.fillStyle = rgba(P.pkt, 0.95); x.beginPath(); x.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 2.4, 0, Math.PI * 2); x.fill(); }
}
function nNode(x: Ctx, P: NPal, n: Node) {
  x.fillStyle = rgba(n.hub ? P.hot : n.col, 0.95); x.beginPath(); x.arc(n.x, n.y, n.r * 1.1, 0, Math.PI * 2); x.fill();
  if (n.hub) { x.strokeStyle = rgba(P.hot, 0.9); x.lineWidth = 2; x.beginPath(); x.arc(n.x, n.y, n.r * 2.3, 0, Math.PI * 2); x.stroke(); }
}
function drawNetwork(x: Ctx, P: NPal, W: number, H: number, topo: string, nodeCount: number, r: R) {
  const cx = W / 2, cy = H / 2, S = Math.min(W, H);
  nGround(x, P, W, H);
  if (topo === 'Circuit') {
    const step = S / rint(r, 16, 26); const traces = rint(r, 70, 120);
    for (let i = 0; i < traces; i++) { let px = Math.round(r() * W / step) * step, py = Math.round(r() * H / step) * step; x.strokeStyle = rgba(P.edge, 0.5 + r() * 0.3); x.lineWidth = 1 + r() * 2; x.beginPath(); x.moveTo(px, py); const segs = rint(r, 2, 6); for (let s = 0; s < segs; s++) { if (r() < 0.5) px += (r() < 0.5 ? -1 : 1) * step * rint(r, 1, 4); else py += (r() < 0.5 ? -1 : 1) * step * rint(r, 1, 4); x.lineTo(px, py); } x.stroke(); x.fillStyle = rgba(r() < 0.3 ? P.pkt : P.node, 0.95); x.beginPath(); x.arc(px, py, 2 + r() * 2, 0, Math.PI * 2); x.fill(); }
    for (let i = 0; i < rint(r, 14, 30); i++) { const px = Math.round(r() * W / step) * step, py = Math.round(r() * H / step) * step; x.strokeStyle = rgba(P.hot, 0.85); x.lineWidth = 2; x.beginPath(); x.arc(px, py, step * 0.3, 0, Math.PI * 2); x.stroke(); }
    halftone(x, W, H, P.edge, r); grain(x, W, H, 1000, r); vignetteMul(x, W, H, 0.86); return;
  }
  const nodes: Node[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const tier = rint(r, 0, 2), depth = tier / 2; let nx: number, ny: number;
    if (topo === 'Core') { const a = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * S * 0.48; nx = cx + Math.cos(a) * rad; ny = cy + Math.sin(a) * rad; }
    else if (topo === 'Spine') { const t = r(); nx = W * (0.1 + t * 0.8) + randn(r) * W * 0.05; ny = cy + Math.sin(t * Math.PI * 3 + r()) * H * 0.3 + randn(r) * H * 0.06; }
    else if (topo === 'Burst') { const a = r() * Math.PI * 2, rad = Math.pow(r(), 1.6) * S * 0.5; nx = cx + Math.cos(a) * rad; ny = cy + Math.sin(a) * rad; }
    else if (topo === 'Constellation') { const ci = Math.floor(r() * 6); const a = ci / 6 * Math.PI * 2; const ccx = cx + Math.cos(a) * S * 0.3, ccy = cy + Math.sin(a) * S * 0.3; nx = ccx + randn(r) * S * 0.12; ny = ccy + randn(r) * S * 0.12; }
    else { nx = W * (0.06 + r() * 0.88); ny = H * (0.06 + r() * 0.88); }
    nodes.push({ x: nx, y: ny, depth, r: (1.6 + r() * 4.5) * (0.5 + depth), hub: false, col: P.node });
  }
  const hubCount = topo === 'Core' || topo === 'Burst' ? 1 : rint(r, 4, 9);
  for (let i = 0; i < hubCount; i++) { const n = nodes[Math.floor(r() * nodes.length)]; n.hub = true; n.r *= 2.5; n.depth = 1; }
  if (topo === 'Core' || topo === 'Burst') { nodes[0].x = cx; nodes[0].y = cy; nodes[0].hub = true; nodes[0].r = 15; }
  for (let i = 0; i < nodes.length; i++) {
    const a = nodes[i];
    if (topo === 'Burst') { nEdge(x, P, a, nodes[0], 0.12 + a.depth * 0.25, 0.5 + a.depth, false, r); continue; }
    const k = a.hub ? rint(r, 6, 11) : rint(r, 3, 5);
    const near = nodes.map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 })).filter((o) => o.j !== i).sort((u, v) => u.d - v.d).slice(0, k);
    for (const o of near) { const b = nodes[o.j], depth = (a.depth + b.depth) / 2; nEdge(x, P, a, b, (0.18 + depth * 0.3) * (a.hub || b.hub ? 1.5 : 1), 0.5 + depth * 1.3, r() < 0.35, r); }
  }
  if (topo === 'Constellation') { const cen: Node[] = []; for (let ci = 0; ci < 6; ci++) { const a = ci / 6 * Math.PI * 2; cen.push({ x: cx + Math.cos(a) * S * 0.3, y: cy + Math.sin(a) * S * 0.3, depth: 1, r: 0, hub: false, col: P.node }); } for (let i = 0; i < cen.length; i++) for (let j = i + 1; j < cen.length; j++) { if (r() < 0.45) nEdge(x, P, cen[i], cen[j], 0.18, 1, true, r); } }
  nodes.sort((u, v) => u.depth - v.depth); for (const n of nodes) nNode(x, P, n);
  halftone(x, W, H, P.edge, r); grain(x, W, H, 1000, r); vignetteMul(x, W, H, 0.86);
}

/* ── master paint (native resolution) ──────────────────────────────────────── */
function paint(off: HTMLCanvasElement, tokenId: number): Params {
  const r = seededRng(tokenId);
  const p = params(r);
  const W = p.fmt.W, H = p.fmt.H;
  off.width = W; off.height = H;
  const x = off.getContext('2d');
  if (!x) return p;
  if (p.system === 'Terminal') drawTerminal(x, p.pal, W, H, p.layout, p.cols, r);
  else drawNetwork(x, p.pal, W, H, p.topo, p.nodes, r);
  return p;
}

export const renderTerminalNetwork: EngineFn = (canvas, tokenId, width) => {
  const off = document.createElement('canvas');
  const p = paint(off, tokenId);
  const W = Math.max(1, Math.floor(width));
  const H = Math.max(1, Math.round((W * off.height) / off.width));
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(off, 0, 0, W, H);
  return { aspect: off.width / off.height, traits: traitsFrom(p) };
};

const PALETTE_NAMES = Array.from(new Set([...TPALS.map((p) => p.name), ...NPALS.map((p) => p.name)]));

export const terminalNetworkSchema: TraitSchema = {
  traits: [
    { name: 'System', values: ['Terminal', 'Network'] },
    { name: 'Palette', values: PALETTE_NAMES,
      subtraits: [
        { name: 'Warm', values: ['Hazard', 'Amber Flood', 'Signal Red', 'Amber Day', 'Magenta Day'] },
        { name: 'Cool', values: ['Cyan Print', 'Electric Teal', 'Klein Blue', 'Blueprint', 'Teal Sea', 'Viola'] },
        { name: 'Bone & Acid', values: ['Bone OS', 'Acid Wash', 'Concrete', 'Acid'] },
      ] },
    { name: 'Format', values: ['Screen', 'Console', 'Stack', 'Field', 'Span', 'Column'],
      subtraits: [
        { name: 'Upright', values: ['Screen', 'Stack', 'Column'] },
        { name: 'Broad', values: ['Console', 'Field', 'Span'] },
      ] },
    { name: 'Layout', values: [...TLAYOUTS],
      subtraits: [
        { name: 'Read-out', values: ['Boot', 'Dossier', 'Map'] },
        { name: 'Event', values: ['Flood', 'Breach', 'Alert'] },
      ] },
    { name: 'Density', values: ['Dense', 'Sparse'] },
    { name: 'Topology', values: [...NTOPO],
      subtraits: [
        { name: 'Centred', values: ['Core', 'Burst'] },
        { name: 'Linked', values: ['Mesh', 'Spine', 'Circuit', 'Constellation'] },
      ] },
    { name: 'Scale', values: ['Dense', 'Open'] },
  ],
};
