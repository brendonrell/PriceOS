/*
 * Oracle art engine — faithful port of the artist's oraclev3.html.
 *
 * Divination geometry: glyphs arranged by one of several layouts, in one of
 * the colour Modes, with optional connections / frame / background treatment /
 * grain. Square Artwork (aspect 1).
 *
 * Two contracts:
 *   - castOracle(r): consumes a FIXED prefix of the RNG stream to decide every
 *     trait. render() and traitsOf() both call it so they always agree. (Moved
 *     `grain` into the prefix vs the HTML, which decided it mid-draw — needed so
 *     traits are derivable without painting. Oracle is a fresh deploy, so the
 *     exact RNG order is ours to define.)
 *   - The grain pixel noise uses the seeded stream, not Math.random(), so each
 *     Output's Artwork is fully deterministic (frozen-seed contract).
 *
 * Drawing logic below is a direct transcription of the HTML renderer.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, RenderResult, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

type Mode = { bg: string; c1: string; c2: string; c3: string; dim: string };

const MODES: Record<string, Mode> = {
  BONE: { bg: '#050505', c1: '#c0b49c', c2: '#8c7c62', c3: '#d8ccb4', dim: '#221e18' },
  BLOOD: { bg: '#060203', c1: '#a81c1c', c2: '#d42020', c3: '#e85030', dim: '#2a0808' },
  GOLD: { bg: '#040400', c1: '#a07820', c2: '#c89a28', c3: '#e8c840', dim: '#201600' },
  ASH: { bg: '#030409', c1: '#5a7490', c2: '#80a0bc', c3: '#a8c4da', dim: '#161e28' },
  IRON: { bg: '#040405', c1: '#525c68', c2: '#8090a0', c3: '#b0c0cc', dim: '#14181c' },
  EMBER: { bg: '#050200', c1: '#8c2e0e', c2: '#c04018', c3: '#e86828', dim: '#200a00' },
  JADE: { bg: '#030605', c1: '#1a6640', c2: '#24904e', c3: '#40c870', dim: '#0c1c12' },
  COBALT: { bg: '#020408', c1: '#1840a0', c2: '#2060d0', c3: '#5090f0', dim: '#08101e' },
  DUSK: { bg: '#0d0814', c1: '#9070a0', c2: '#b890c8', c3: '#d4b0e0', dim: '#2a1e30' },
  SLATE: { bg: '#07090e', c1: '#506878', c2: '#7090a8', c3: '#a0b8cc', dim: '#141820' },
  MIDNIGHT: { bg: '#020509', c1: '#c8d4e4', c2: '#a0b4cc', c3: '#7890b0', dim: '#0c1828' },
  FOREST: { bg: '#030804', c1: '#3a6830', c2: '#507840', c3: '#70a858', dim: '#0c1a0a' },
  RUST: { bg: '#0a0402', c1: '#8c4418', c2: '#b05828', c3: '#d07840', dim: '#201008' },
};
const MODE_KEYS = Object.keys(MODES);

/* Weighted draw arrays (duplicates = higher odds), exactly as the HTML. */
const ARRS = ['RADIAL', 'RADIAL', 'MANDALA', 'MANDALA', 'GRID', 'CONSTELLATION', 'SPIRAL', 'SIGIL', 'MONOLITH', 'SCATTER', 'TRIPTYCH'];
const CONNS = ['NONE', 'NONE', 'NONE', 'SPOKE', 'CHAIN', 'WEB'];
const FRAMES = ['NONE', 'NONE', 'NONE', 'NONE', 'BORDER', 'DOUBLE', 'COMPASS'];
const BG_TREATS = ['FLAT', 'FLAT', 'FLAT', 'VIGNETTE', 'RADIAL', 'SPLIT'];
const WT_NAMES = ['HAIRLINE', 'STANDARD', 'STANDARD', 'BOLD', 'GRAPHIC'];
const WT_MULT: Record<string, number> = { HAIRLINE: 0.28, STANDARD: 1, BOLD: 2.4, GRAPHIC: 4.6 };
const FILLS = ['OUTLINE', 'OUTLINE', 'OUTLINE', 'MIXED', 'SILHOUETTE'];
const COL_C = ['MONO', 'MONO', 'DUOTONE', 'DUOTONE', 'TRICHROME'];
const DENS_NAMES = ['WHISPER', 'WHISPER', 'SPARSE', 'BALANCED', 'BALANCED', 'DENSE', 'CHAOS'];
const DENS_MAP: Record<string, [number, number]> = {
  WHISPER: [2, 4], SPARSE: [5, 7], BALANCED: [8, 12], DENSE: [13, 20], CHAOS: [22, 40],
};

interface OracleParams {
  modeName: string;
  mode: Mode;
  arrangement: string;
  connection: string;
  dashConn: boolean;
  frameType: string;
  bgTreat: string;
  wtName: string;
  wtMult: number;
  fillMode: string;
  colorCount: string;
  density: string;
  numOuter: number;
  famA: number;
  famB: number;
  famC: number;
  centralG: number;
  sizeVar: boolean;
  rotVar: boolean;
  hasGrain: boolean;
}

/* Frozen RNG prefix → every trait. */
function castOracle(r: () => number): OracleParams {
  const modeName = MODE_KEYS[Math.floor(r() * MODE_KEYS.length)];
  const mode = MODES[modeName];
  const arrangement = pick(ARRS, r);
  const connection = pick(CONNS, r);
  const dashConn = r() > 0.55;
  const frameType = pick(FRAMES, r);
  const bgTreat = pick(BG_TREATS, r);
  const wtName = pick(WT_NAMES, r);
  const wtMult = WT_MULT[wtName];
  const fillMode = pick(FILLS, r);
  const colorCount = pick(COL_C, r);
  const density = pick(DENS_NAMES, r);
  const [dMin, dMax] = DENS_MAP[density];
  const numOuter = dMin + Math.floor(r() * (dMax - dMin + 1));
  const famA = Math.floor(r() * 16);
  const famB = Math.floor(r() * 16);
  const famC = Math.floor(r() * 16);
  const centralG = Math.floor(r() * 16);
  const sizeVar = r() > 0.38;
  const rotVar = r() > 0.32;
  const hasGrain = r() > 0.85;
  return {
    modeName, mode, arrangement, connection, dashConn, frameType, bgTreat,
    wtName, wtMult, fillMode, colorCount, density, numOuter, famA, famB, famC,
    centralG, sizeVar, rotVar, hasGrain,
  };
}

function paramsToTraits(p: OracleParams): OutputTraits {
  return {
    Mode: p.modeName,
    Arrangement: p.arrangement,
    Density: p.density,
    Weight: p.wtName,
    Fill: p.fillMode,
    Color: p.colorCount,
    Background: p.bgTreat === 'FLAT' ? 'Flat' : p.bgTreat,
    Connection: p.connection === 'NONE' ? 'None' : p.connection,
    Frame: p.frameType === 'NONE' ? 'None' : p.frameType,
    Grain: p.hasGrain ? 'Grain' : 'Clean',
  };
}

/* ── Glyph + drawing helpers (transcribed from the HTML) ──────────────────── */

function glyph(ctx: CanvasRenderingContext2D, rr: number, type: number, filled: boolean) {
  ctx.beginPath();
  let f = filled;
  switch (type) {
    case 0: ctx.arc(0, 0, rr, 0, Math.PI * 2); break;
    case 1: ctx.moveTo(0, -rr); ctx.lineTo(rr * 0.866, rr * 0.5); ctx.lineTo(-rr * 0.866, rr * 0.5); ctx.closePath(); break;
    case 2: ctx.moveTo(0, -rr); ctx.lineTo(rr * 0.6, 0); ctx.lineTo(0, rr); ctx.lineTo(-rr * 0.6, 0); ctx.closePath(); break;
    case 3: ctx.moveTo(-rr, 0); ctx.lineTo(rr, 0); ctx.moveTo(0, -rr); ctx.lineTo(0, rr); f = false; break;
    case 4: for (let i = 0; i <= 6; i++) { const a = i * Math.PI / 3 - Math.PI / 6; i === 0 ? ctx.moveTo(rr * Math.cos(a), rr * Math.sin(a)) : ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a)); } break;
    case 5: ctx.arc(0, 0, rr * 0.3, 0, Math.PI * 2); f = true; break;
    case 6: for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.moveTo(0, 0); ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a)); } f = false; break;
    case 7: ctx.arc(0, 0, rr, -0.65 * Math.PI, 0.65 * Math.PI); f = false; break;
    case 8: { const p: number[][] = []; for (let i = 0; i < 5; i++) p.push([rr * Math.cos(i * Math.PI * 2 / 5 - Math.PI / 2), rr * Math.sin(i * Math.PI * 2 / 5 - Math.PI / 2)]); ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[2][0], p[2][1]); ctx.lineTo(p[4][0], p[4][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(p[3][0], p[3][1]); ctx.closePath(); break; }
    case 9: ctx.arc(-rr * 0.5, 0, rr, -Math.PI / 3, Math.PI / 3); ctx.arc(rr * 0.5, 0, rr, Math.PI * 2 / 3, Math.PI * 4 / 3); f = false; break;
    case 10: ctx.arc(0, 0, rr, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); ctx.beginPath(); ctx.arc(rr * 0.18, 0, rr * 0.78, Math.PI * 1.1, Math.PI * 1.9); f = false; break;
    case 11: ctx.moveTo(-rr * 0.72, -rr * 0.72); ctx.lineTo(rr * 0.72, rr * 0.72); ctx.moveTo(rr * 0.72, -rr * 0.72); ctx.lineTo(-rr * 0.72, rr * 0.72); f = false; break;
    case 12: ctx.ellipse(0, 0, rr, rr * 0.42, 0, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, rr * 0.18, 0, Math.PI * 2); f = true; break;
    case 13: ctx.arc(0, 0, rr, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0, rr * 0.58, 0, Math.PI * 2); break;
    case 14: { const s = rr * 0.82; ctx.rect(-s, -s, s * 2, s * 2); break; }
    case 15: for (let i = 0; i <= 8; i++) { const a = i * Math.PI / 4 + Math.PI / 8; i === 0 ? ctx.moveTo(rr * Math.cos(a), rr * Math.sin(a)) : ctx.lineTo(rr * Math.cos(a), rr * Math.sin(a)); } break;
  }
  if (f) { ctx.fillStyle = ctx.strokeStyle; ctx.fill(); ctx.stroke(); } else ctx.stroke();
}

function dg(ctx: CanvasRenderingContext2D, cx: number, cy: number, rr: number, type: number, rot: number, filled: boolean) {
  ctx.save(); ctx.translate(cx, cy); if (rot) ctx.rotate(rot); glyph(ctx, rr, type, filled); ctx.restore();
}

function drawConns(ctx: CanvasRenderingContext2D, cx: number, cy: number, pts: number[][], type: string, color: string, dashed: boolean) {
  if (!pts.length) return;
  ctx.strokeStyle = color; ctx.setLineDash(dashed ? [3, 5] : []);
  if (type === 'SPOKE') { ctx.lineWidth = 0.4; pts.forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke(); }); }
  if (type === 'CHAIN') { ctx.lineWidth = 0.4; ctx.beginPath(); pts.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y))); ctx.lineTo(pts[0][0], pts[0][1]); ctx.stroke(); }
  if (type === 'WEB') {
    ctx.lineWidth = 0.28;
    for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) {
      const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1];
      if (dx * dx + dy * dy < 200 * 200) { ctx.beginPath(); ctx.moveTo(pts[i][0], pts[i][1]); ctx.lineTo(pts[j][0], pts[j][1]); ctx.stroke(); }
    }
  }
  ctx.setLineDash([]);
}

function drawFrame(ctx: CanvasRenderingContext2D, W: number, H: number, type: string, c1: string, dim: string) {
  if (type === 'BORDER') {
    const m = W * 0.038;
    ctx.strokeStyle = dim; ctx.lineWidth = 0.5; ctx.strokeRect(m, m, W - m * 2, H - m * 2);
    const cs = W * 0.022;
    ([[m, m], [W - m, m], [m, H - m], [W - m, H - m]] as number[][]).forEach(([x, y]) => {
      const sx = x === m ? 1 : -1, sy = y === m ? 1 : -1;
      ctx.beginPath(); ctx.strokeStyle = c1; ctx.lineWidth = 0.8;
      ctx.moveTo(x + sx * cs, y); ctx.lineTo(x, y); ctx.lineTo(x, y + sy * cs); ctx.stroke();
    });
  }
  if (type === 'DOUBLE') {
    const m1 = W * 0.027, m2 = W * 0.043;
    ctx.strokeStyle = dim; ctx.lineWidth = 0.4;
    ctx.strokeRect(m1, m1, W - m1 * 2, H - m1 * 2); ctx.strokeRect(m2, m2, W - m2 * 2, H - m2 * 2);
  }
  if (type === 'COMPASS') {
    const R = W * 0.462;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, R, 0, Math.PI * 2); ctx.strokeStyle = dim; ctx.lineWidth = 0.5; ctx.stroke();
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2 - Math.PI / 2, isC = i % 6 === 0, isM = i % 3 === 0;
      const len = isC ? W * 0.022 : isM ? W * 0.013 : W * 0.007;
      ctx.beginPath();
      ctx.moveTo(W / 2 + (R - len) * Math.cos(a), H / 2 + (R - len) * Math.sin(a));
      ctx.lineTo(W / 2 + R * Math.cos(a), H / 2 + R * Math.sin(a));
      ctx.strokeStyle = isC ? c1 : dim; ctx.lineWidth = isC ? 0.9 : 0.4; ctx.stroke();
    }
  }
}

function drawBg(ctx: CanvasRenderingContext2D, W: number, H: number, type: string, bgColor: string, c2: string) {
  ctx.fillStyle = bgColor; ctx.fillRect(0, 0, W, H);
  if (type === 'VIGNETTE') {
    const g = ctx.createRadialGradient(W / 2, H / 2, W * 0.08, W / 2, H / 2, W * 0.72);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (type === 'RADIAL') {
    const rd = parseInt(c2.slice(1, 3), 16), g2 = parseInt(c2.slice(3, 5), 16), b = parseInt(c2.slice(5, 7), 16);
    const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.58);
    g.addColorStop(0, `rgba(${rd},${g2},${b},0.18)`); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
  if (type === 'SPLIT') {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, 'rgba(255,255,255,0.04)'); g.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  }
}

interface Pt { px: number; py: number; gType: number; col: string; sz: number; rot: number; fill: boolean }

function paint(canvas: HTMLCanvasElement, tokenId: number, width: number, r: () => number, p: OracleParams): void {
  const W = Math.max(1, Math.floor(width));
  const H = W; // Oracle is square
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { mode } = p;

  const pickC = (i: number): string => {
    if (p.colorCount === 'MONO') return mode.c1;
    if (p.colorCount === 'DUOTONE') return i === 0 ? mode.c1 : mode.c2;
    return [mode.c1, mode.c2, mode.c3][i % 3];
  };
  const glyphC = (layer: 'inner' | 'outer'): string => {
    const v = r();
    if (v > 0.88) return pickC(2);
    if (v > 0.55) return pickC(1);
    return pickC(layer === 'inner' ? 1 : 0);
  };
  const shouldFill = (): boolean => {
    if (p.fillMode === 'OUTLINE') return false;
    if (p.fillMode === 'SILHOUETTE') return true;
    return r() > 0.55;
  };

  drawBg(ctx, W, H, p.bgTreat, mode.bg, mode.c2);
  drawFrame(ctx, W, H, p.frameType, mode.c1, mode.dim);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';

  const pts: Pt[] = [];
  const baseR = W * 0.052;
  const addPt = (px: number, py: number, g: number, col: string, sz: number, rot: number, fill: boolean) => {
    pts.push({ px, py, gType: g, col, sz, rot, fill });
  };
  const arr = p.arrangement;
  const numOuter = p.numOuter;

  if (arr === 'RADIAL') {
    const rR = W * 0.34;
    ctx.beginPath(); ctx.arc(W / 2, H / 2, rR, 0, Math.PI * 2); ctx.strokeStyle = mode.dim; ctx.lineWidth = 0.4; ctx.stroke();
    for (let i = 0; i < numOuter; i++) {
      const a = (i / numOuter) * Math.PI * 2 - Math.PI / 2;
      const sz = p.sizeVar ? baseR * (0.5 + r() * 0.95) : baseR;
      addPt(W / 2 + rR * Math.cos(a), H / 2 + rR * Math.sin(a), r() > 0.2 ? p.famA : p.famB, glyphC('outer'), sz, p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    }
  } else if (arr === 'MANDALA') {
    const iN = 3 + Math.floor(r() * 3), iR = W * 0.19, oR = W * 0.36;
    [iR, oR].forEach((rad) => { ctx.beginPath(); ctx.arc(W / 2, H / 2, rad, 0, Math.PI * 2); ctx.strokeStyle = mode.dim; ctx.lineWidth = 0.35; ctx.stroke(); });
    for (let i = 0; i < iN; i++) {
      const a = (i / iN) * Math.PI * 2 - Math.PI / 2;
      addPt(W / 2 + iR * Math.cos(a), H / 2 + iR * Math.sin(a), p.famC, pickC(1), p.sizeVar ? baseR * (0.7 + r() * 0.5) : baseR * 0.85, p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    }
    for (let i = 0; i < numOuter; i++) {
      const a = (i / numOuter) * Math.PI * 2 - Math.PI / 2;
      addPt(W / 2 + oR * Math.cos(a), H / 2 + oR * Math.sin(a), r() > 0.25 ? p.famA : p.famB, glyphC('outer'), p.sizeVar ? baseR * (0.45 + r() * 1.1) : baseR, p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    }
  } else if (arr === 'GRID') {
    const cols = 3 + Math.floor(r() * 2), cw = W / (cols + 1), ch = H / (cols + 1);
    const mc = Math.floor(cols / 2);
    for (let row = 0; row < cols; row++) for (let col = 0; col < cols; col++) {
      if (row === mc && col === mc) continue;
      addPt(cw * (col + 1), ch * (row + 1), r() > 0.25 ? p.famA : p.famB, glyphC('outer'), p.sizeVar ? baseR * (0.5 + r() * 0.95) : baseR, p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    }
  } else if (arr === 'CONSTELLATION') {
    const margin = W * 0.11, guard = W * 0.13;
    let att = 0;
    while (pts.length < numOuter && att < 500) {
      att++;
      const px = margin + r() * (W - margin * 2), py = margin + r() * (H - margin * 2);
      const dx = px - W / 2, dy = py - H / 2;
      if (dx * dx + dy * dy < guard * guard) continue;
      let ok = true;
      for (const pt of pts) if (Math.abs(pt.px - px) < W * 0.08 && Math.abs(pt.py - py) < H * 0.08) { ok = false; break; }
      if (ok) addPt(px, py, r() > 0.3 ? p.famA : p.famB, glyphC('outer'), p.sizeVar ? baseR * (0.38 + r() * 1.3) : baseR, p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    }
  } else if (arr === 'SPIRAL') {
    const turns = 1.5 + r() * 1.8, rS = W * 0.07, rE = W * 0.42;
    for (let i = 0; i < numOuter; i++) {
      const t = i / (numOuter - 1 || 1);
      const a = t * turns * Math.PI * 2 - Math.PI / 2, rad = rS + t * (rE - rS);
      addPt(W / 2 + rad * Math.cos(a), H / 2 + rad * Math.sin(a), r() > 0.3 ? p.famA : p.famB, glyphC('outer'), p.sizeVar ? baseR * (0.45 + t * 0.9) : baseR, p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    }
  } else if (arr === 'SIGIL') {
    const layers = 3 + Math.floor(r() * 4);
    for (let l = 0; l < layers; l++) {
      const rad = W * (0.1 + l * 0.058), rot = r() * Math.PI * 2;
      pts.push({ px: W / 2, py: H / 2, gType: Math.floor(r() * 16), col: pickC(l % 3), sz: rad, rot, fill: p.fillMode === 'SILHOUETTE' ? l === 0 : shouldFill() });
    }
    const satN = 4 + Math.floor(r() * 7), satR = W * 0.35;
    for (let i = 0; i < satN; i++) {
      const a = (i / satN) * Math.PI * 2 - Math.PI / 2;
      addPt(W / 2 + satR * Math.cos(a), H / 2 + satR * Math.sin(a), r() > 0.3 ? p.famA : p.famB, glyphC('outer'), baseR * (0.35 + r() * 0.55), p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    }
  } else if (arr === 'MONOLITH') {
    const heroR = W * (0.28 + r() * 0.18);
    pts.push({ px: W / 2, py: H / 2, gType: p.centralG, col: pickC(p.colorCount === 'MONO' ? 0 : 1), sz: heroR, rot: p.rotVar ? r() * Math.PI * 2 : 0, fill: shouldFill() });
    const satN = 2 + Math.floor(r() * 4), satR = W * 0.42;
    for (let i = 0; i < satN; i++) {
      const a = (i / satN) * Math.PI * 2 + r() * 0.6 - Math.PI / 2;
      addPt(W / 2 + satR * Math.cos(a), H / 2 + satR * Math.sin(a), r() > 0.3 ? p.famA : p.famB, glyphC('outer'), baseR * (0.3 + r() * 0.5), p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    }
  } else if (arr === 'SCATTER') {
    const margin = W * 0.06;
    for (let i = 0; i < numOuter; i++) {
      const px = margin + r() * (W - margin * 2), py = margin + r() * (H - margin * 2);
      const sz = p.sizeVar ? baseR * (0.3 + r() * 1.5) : baseR;
      addPt(px, py, r() > 0.25 ? p.famA : p.famB, glyphC('outer'), sz, p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    }
  } else if (arr === 'TRIPTYCH') {
    const gradated = r() > 0.4;
    const positions = [W * 0.22, W * 0.5, W * 0.78];
    const baseScale = 0.28 + r() * 0.18;
    positions.forEach((px, i) => {
      const isMid = i === 1;
      const sz = isMid ? W * baseScale : W * baseScale * (gradated ? 0.42 + r() * 0.22 : baseScale);
      const gType = i === 1 ? p.centralG : r() > 0.5 ? p.famA : p.famB;
      const col = pickC(i % 3);
      addPt(px, H / 2, gType, col, sz, p.rotVar ? r() * Math.PI * 2 : 0, shouldFill());
    });
    ctx.beginPath(); ctx.moveTo(W * 0.08, H / 2); ctx.lineTo(W * 0.92, H / 2); ctx.strokeStyle = mode.dim; ctx.lineWidth = 0.35; ctx.stroke();
  }

  if (p.connection !== 'NONE' && arr !== 'SIGIL' && arr !== 'MONOLITH') {
    const connPts = pts.map((pt) => [pt.px, pt.py]);
    drawConns(ctx, W / 2, H / 2, connPts, p.connection, mode.dim, p.dashConn);
  }

  pts.forEach(({ px, py, gType, col, sz, rot, fill }) => {
    ctx.strokeStyle = col; ctx.fillStyle = col;
    ctx.lineWidth = Math.max(0.25, (0.5 + r() * 0.6) * p.wtMult);
    dg(ctx, px, py, sz, gType, rot, fill);
  });

  if (arr !== 'SIGIL' && arr !== 'MONOLITH') {
    const cR = W * (0.078 + (p.wtName === 'GRAPHIC' ? 0.02 : 0));
    const cFill = p.fillMode === 'SILHOUETTE' || (p.fillMode === 'MIXED' && r() > 0.5);
    ctx.beginPath(); ctx.arc(W / 2, H / 2, cR * 1.7, 0, Math.PI * 2); ctx.strokeStyle = mode.dim; ctx.lineWidth = 0.38; ctx.stroke();
    ctx.strokeStyle = pickC(p.colorCount === 'MONO' ? 0 : 2); ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = 1.5 * p.wtMult;
    dg(ctx, W / 2, H / 2, cR, p.centralG, 0, cFill);
  }

  ctx.beginPath(); ctx.arc(W / 2, H / 2, 1.3, 0, Math.PI * 2); ctx.fillStyle = mode.c2; ctx.fill();

  if (p.hasGrain) {
    const imgD = ctx.getImageData(0, 0, W, H);
    const d = imgD.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (r() - 0.5) * 28; // seeded, not Math.random — deterministic
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
    ctx.putImageData(imgD, 0, 0);
  }
}

/** Oracle is always square — its aspect-ratio palette (w/h) is just [1].
    Single source for the registry's `aspects` (empty-state ghost grid). */
export const ORACLE_ASPECTS: readonly number[] = [1];

export const renderOracle: EngineFn = (canvas, tokenId, width): RenderResult => {
  const r = seededRng(tokenId);
  const p = castOracle(r);
  paint(canvas, tokenId, width, r, p);
  return { aspect: 1, traits: paramsToTraits(p) };
};

export const oracleTraits: TraitsFn = (tokenId) => paramsToTraits(castOracle(seededRng(tokenId)));

/* Artist trait schema. Mode + Arrangement carry subtraits (PD's new feature,
   to be tested on Oracle); the rest are flat. Every value sits in exactly one
   subtrait bucket so the bucket concat reproduces the full pool. */
export const oracleSchema: TraitSchema = {
  traits: [
    {
      name: 'Mode',
      values: MODE_KEYS,
      subtraits: [
        { name: 'Warm', values: ['BLOOD', 'GOLD', 'EMBER', 'RUST', 'BONE'] },
        { name: 'Cool', values: ['ASH', 'IRON', 'COBALT', 'MIDNIGHT', 'SLATE'] },
        { name: 'Verdant', values: ['JADE', 'FOREST'] },
        { name: 'Mystic', values: ['DUSK'] },
      ],
    },
    {
      name: 'Arrangement',
      values: ['RADIAL', 'MANDALA', 'GRID', 'CONSTELLATION', 'SPIRAL', 'SIGIL', 'MONOLITH', 'SCATTER', 'TRIPTYCH'],
      subtraits: [
        { name: 'Centered', values: ['RADIAL', 'MANDALA', 'SPIRAL', 'SIGIL', 'MONOLITH', 'TRIPTYCH'] },
        { name: 'Dispersed', values: ['GRID', 'CONSTELLATION', 'SCATTER'] },
      ],
    },
    { name: 'Density', values: ['WHISPER', 'SPARSE', 'BALANCED', 'DENSE', 'CHAOS'] },
    { name: 'Weight', values: ['HAIRLINE', 'STANDARD', 'BOLD', 'GRAPHIC'] },
    { name: 'Fill', values: ['OUTLINE', 'MIXED', 'SILHOUETTE'] },
    { name: 'Color', values: ['MONO', 'DUOTONE', 'TRICHROME'] },
    { name: 'Background', values: ['Flat', 'VIGNETTE', 'RADIAL', 'SPLIT'] },
    { name: 'Connection', values: ['None', 'SPOKE', 'CHAIN', 'WEB'] },
    { name: 'Frame', values: ['None', 'BORDER', 'DOUBLE', 'COMPASS'] },
    { name: 'Grain', values: ['Clean', 'Grain'] },
  ],
};
