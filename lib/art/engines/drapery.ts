// @ts-nocheck
/*
 * DRAPERY — a classical drapery study, made uncanny.
 * Ported to production from tools/halo/s13_drape.js (2026-06-28). Soft cloth /
 * paper folds and shadow, painterly and tonal. SURREAL = real-but-off: the
 * cloth covers a form that is WRONG or ABSENT — a shroud holding a volume that
 * isn't there, folds that defy gravity, a silhouette no object could fit.
 * Raking light sculpts; deep soft valley shadow.
 *
 * Ambition pass (CEO "expand it, get ambitious"): denser + finer folds, a
 * stronger raking light, a secondary specular crest, and a fine-crease detail
 * layer in the frame-filling compositions — richer relief, same surreal shroud.
 *
 * Deterministic in tokenId. draperyTraits() mirrors draw()'s rng order.
 */
import { rng, pick, lum, mix, rgba, grain, vignette, mottle, makeNoise, hazeSheet, sheen, softShadow, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const K = { rng, pick, lum, mix, rgba, grain, vignette, mottle, makeNoise, hazeSheet, sheen, softShadow };

const PALS = [
  { name: 'Plaster', bg: '#c9c0b1', base: '#d9d1c2', hi: '#f1ece0', core: '#9a8f7d', deep: '#6c6051', sheen: '#fbf7ec', ink: '#3f382d', mat: 'linen' },
  { name: 'Ash',     bg: '#b7b8ba', base: '#c6c8ca', hi: '#eceef0', core: '#8a8c90', deep: '#5b5d62', sheen: '#f6f8fa', ink: '#2e3034', mat: 'linen' },
  { name: 'Indigo',  bg: '#2d3550', base: '#3a4566', hi: '#9fb0d6', core: '#222a44', deep: '#141a30', sheen: '#cfe0ff', ink: '#0b0f1e', mat: 'velvet' },
  { name: 'Rose',    bg: '#b89a92', base: '#cbab9f', hi: '#f0d8c8', core: '#9a766c', deep: '#6f4f49', sheen: '#fbe6d6', ink: '#3e2a27', mat: 'silk' },
  { name: 'Bistre',  bg: '#a48d6c', base: '#b69b75', hi: '#e3cca0', core: '#7d6346', deep: '#54402a', sheen: '#f3e0bc', ink: '#332512', mat: 'paper' },
  { name: 'Oxblood', bg: '#5a302e', base: '#6e3a37', hi: '#b66a5c', core: '#451e1d', deep: '#260f10', sheen: '#e6a48c', ink: '#160708', mat: 'velvet' },
];

const MODES = ['Shroud', 'Folds', 'Caught', 'Pooled', 'Veil', 'Knot'];
const FORMATS = [[1040, 1300], [1180, 1180], [1300, 1040]]; // portrait / square / landscape

function matProps(mat) {
  if (mat === 'satin' || mat === 'silk') return { sheen: 0.55, contrast: 1.15, crush: 0.0 };
  if (mat === 'velvet') return { sheen: 0.30, contrast: 1.35, crush: 0.45 };
  if (mat === 'paper') return { sheen: 0.12, contrast: 1.05, crush: 0.0 };
  return { sheen: 0.14, contrast: 0.95, crush: 0.0 };
}

function draw(cv, seed) {
  const r = K.rng(seed);
  const noise = K.makeNoise(seed * 7 + 23);
  const pal = K.pick(PALS, r);
  const mode = K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const W = fmt[0], H = fmt[1];
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const mp = matProps(pal.mat);

  const lightSide = r() < 0.5 ? -1 : 1;
  const lightAng = lightSide * (0.35 + r() * 0.25);
  const rake = 1.15 + r() * 0.35;

  (function ground() {
    const g = x.createLinearGradient(0, 0, lightSide * W * 0.4, H);
    g.addColorStop(0, K.mix(pal.bg, pal.hi, 0.10));
    g.addColorStop(0.55, pal.bg);
    g.addColorStop(1, K.mix(pal.bg, pal.deep, 0.45));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    K.mottle(x, 0, 0, W, H, pal.bg, 40, r, 'overlay');
  })();

  function paintFold(x0, x1, y0, y1, baseHalf, wob, phase, lit, depth, alpha) {
    const STEPS = 64;
    const cxs = [], hws = [];
    for (let i = 0; i <= STEPS; i++) {
      const t = i / STEPS;
      const px = x0 + (x1 - x0) * t;
      const py = y0 + (y1 - y0) * t;
      const drift = noise.fbm(px / (W * 0.5) + phase, py / (H * 0.5), 4, 0.55, 2.1);
      const cx = px + drift * wob;
      const swell = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * Math.PI * (1 + phase * 0.3) + phase * 6));
      const wn = noise.fbm(px / (W * 0.3), py / (H * 0.3) + phase * 2, 3) * 0.3;
      const endTaper = 0.62 + 0.38 * Math.pow(Math.sin(t * Math.PI), 0.45);
      const hw = baseHalf * (swell + wn) * endTaper;
      cxs.push(cx); hws.push(Math.max(2, hw));
    }
    const BANDS = 15;
    for (let b = 0; b < BANDS; b++) {
      const u0 = -1 + (2 * b) / BANDS;
      const u1 = -1 + (2 * (b + 1)) / BANDS;
      const um = (u0 + u1) / 2;
      const litness = (um * lit + 1) / 2;
      const ridgePos = 0.18 * lit;
      const ridge = Math.exp(-Math.pow((um - ridgePos) * 2.4, 2));
      const crest = Math.exp(-Math.pow((um - ridgePos) * 6.5, 2));
      const valley = Math.pow(Math.abs(um), 3.0);
      let tone;
      const litMix = Math.pow(litness, 0.8);
      tone = K.mix(pal.core, pal.base, litMix);
      tone = K.mix(tone, pal.hi, Math.min(1, ridge * 0.85 * mp.contrast * rake * litMix));
      tone = K.mix(tone, pal.hi, crest * 0.4 * mp.contrast * litMix);
      tone = K.mix(tone, pal.deep, Math.min(1, valley * 0.78 * rake));
      if (mp.crush > 0) tone = K.mix(tone, pal.deep, (1 - ridge) * mp.crush * 0.3);

      x.beginPath();
      for (let i = 0; i <= STEPS; i++) {
        const px = cxs[i] + hws[i] * u0;
        const py = y0 + (y1 - y0) * (i / STEPS);
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      for (let i = STEPS; i >= 0; i--) {
        const px = cxs[i] + hws[i] * u1;
        const py = y0 + (y1 - y0) * (i / STEPS);
        x.lineTo(px, py);
      }
      x.closePath();
      x.globalAlpha = alpha;
      x.fillStyle = tone;
      x.fill();
      x.globalAlpha = 1;
    }
    if (mp.sheen > 0.16) {
      x.save();
      x.globalCompositeOperation = 'screen';
      x.beginPath();
      for (let i = 0; i <= STEPS; i++) {
        const px = cxs[i] + hws[i] * (0.18 * lit);
        const py = y0 + (y1 - y0) * (i / STEPS);
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.lineWidth = baseHalf * 0.22;
      x.lineCap = 'round';
      const taper = x.createLinearGradient(x0, y0, x1, y1);
      taper.addColorStop(0, K.rgba(pal.sheen, 0));
      taper.addColorStop(0.5, K.rgba(pal.sheen, mp.sheen * 0.5 * alpha));
      taper.addColorStop(1, K.rgba(pal.sheen, 0));
      x.strokeStyle = taper;
      x.stroke();
      x.restore();
    }
    return cxs;
  }

  function castShadow(cx, cy, rx, ry, a) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    const off = lightSide * rx * 0.45;
    const g = x.createRadialGradient(cx - off, cy, ry * 0.2, cx - off, cy, rx);
    g.addColorStop(0, K.rgba(pal.ink, a));
    g.addColorStop(0.6, K.rgba(pal.ink, a * 0.4));
    g.addColorStop(1, K.rgba(pal.ink, 0));
    x.translate(cx - off, cy); x.scale(1, ry / rx); x.translate(-(cx - off), -cy);
    x.fillStyle = g; x.beginPath(); x.arc(cx - off, cy, rx, 0, 7); x.fill();
    x.restore();
  }

  function curtain(rx0, rx1, ry0, ry1, count, wob, lengthJit) {
    const folds = [];
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const fx = rx0 + (rx1 - rx0) * t;
      const half = ((rx1 - rx0) / count) * (0.62 + r() * 0.5);
      const ph = r() * 10;
      const lit = r() < 0.62 ? lightSide : -lightSide;
      const top = ry0 + (r() - 0.5) * 20;
      const bot = ry1 + (r() - 0.5) * 40 * lengthJit;
      folds.push({ fx, half, ph, lit, top, bot, x1: fx + (r() - 0.5) * wob * 0.6 });
    }
    folds.sort((a, b) => a.half - b.half);
    for (const f of folds) {
      paintFold(f.fx, f.x1, f.top, f.bot, f.half, wob, f.ph, f.lit, 1, 0.92 + r() * 0.08);
    }
  }

  if (mode === 'Folds') {
    castShadow(W * 0.5, H * 0.92, W * 0.5, H * 0.10, 0.45);
    const n = 13 + (r() * 7 | 0);
    curtain(-W * 0.04, W * 1.04, H * (-0.06), H * 1.06, n, W * 0.09, 1.1);
    const fineN = 8 + (r() * 6 | 0);
    for (let i = 0; i < fineN; i++) {
      const fx = W * (0.04 + r() * 0.92);
      const half = W * 0.018 * (0.6 + r() * 0.8);
      const lit = r() < 0.62 ? lightSide : -lightSide;
      paintFold(fx, fx + (r() - 0.5) * W * 0.05, H * (-0.04 + r() * 0.1), H * (0.9 + r() * 0.14),
                half, W * 0.04, r() * 10, lit, 1, 0.5 + r() * 0.3);
    }

  } else if (mode === 'Shroud') {
    const baseY = H * (0.78 + r() * 0.08);
    const peakX = W * (0.40 + r() * 0.20);
    const peakY = H * (0.16 + r() * 0.12);
    const massW = W * (0.46 + r() * 0.16);
    castShadow(peakX + lightSide * W * 0.04, baseY + H * 0.02, massW * 0.95, H * 0.07, 0.5);

    const n = 15 + (r() * 8 | 0);
    const ribs = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const bx = peakX + (t - 0.5) * massW * (1.0 + 0.3 * Math.sin(t * 7));
      const by = baseY + (r() - 0.5) * H * 0.05;
      const tx = peakX + (t - 0.5) * massW * 0.10 + Math.sin(t * 5 + 1) * W * 0.03;
      const ty = peakY + Math.abs(t - 0.5) * H * 0.08;
      const half = massW / n * (0.7 + r() * 0.6);
      const lit = ((bx - peakX) * lightSide < 0) ? lightSide : -lightSide;
      ribs.push({ tx, ty, bx, by, half, ph: r() * 10, lit, depth: Math.abs(t - 0.5) });
    }
    ribs.sort((a, b) => b.depth - a.depth);
    for (const f of ribs) paintFold(f.tx, f.bx, f.ty, f.by, f.half, W * 0.06, f.ph, f.lit, 1, 0.95);
    const fineN = 10 + (r() * 8 | 0);
    for (let i = 0; i < fineN; i++) {
      const t = (i + 0.5) / fineN;
      const bx = peakX + (t - 0.5) * massW * (0.9 + 0.3 * Math.sin(t * 9));
      const tx = peakX + (t - 0.5) * massW * 0.08 + Math.sin(t * 7) * W * 0.02;
      const half = massW / n * (0.28 + r() * 0.3);
      const lit = ((bx - peakX) * lightSide < 0) ? lightSide : -lightSide;
      paintFold(tx, bx, peakY + Math.abs(t - 0.5) * H * 0.06, baseY - H * 0.06 + (r() - 0.5) * H * 0.04,
                half, W * 0.04, r() * 10, lit, 1, 0.45 + r() * 0.3);
    }
    const hemN = 6 + (r() * 3 | 0);
    for (let i = 0; i < hemN; i++) {
      const t = (i + 0.5) / hemN;
      const hx = peakX + (t - 0.5) * massW * 1.05;
      const hw = massW / hemN * (0.9 + r() * 0.5);
      paintFold(hx - hw, hx + hw, baseY - H * 0.04 + (r() - 0.5) * H * 0.03,
                baseY + (r() - 0.5) * H * 0.02, hw * 0.6, W * 0.03, r() * 10, lightSide, 1, 0.95);
    }
    x.save(); x.globalCompositeOperation = 'multiply';
    const hv = x.createRadialGradient(peakX + lightSide * massW * 0.10, peakY + H * 0.10, 4,
      peakX + lightSide * massW * 0.10, peakY + H * 0.10, massW * 0.22);
    hv.addColorStop(0, K.rgba(pal.deep, 0.65)); hv.addColorStop(1, K.rgba(pal.deep, 0));
    x.fillStyle = hv; x.fillRect(0, 0, W, H); x.restore();

  } else if (mode === 'Caught') {
    const flow = lightSide;
    const cy = H * (0.50 + (r() - 0.5) * 0.12);
    const billow = H * (0.20 + r() * 0.08);
    const n = 6 + (r() * 3 | 0);
    const folds = [];
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n;
      const belly = Math.sin(t * Math.PI) * billow * 0.5;
      const yBase = cy + (t - 0.5) * billow * 1.5;
      const x0 = W * (-0.10);
      const x1 = W * (1.10);
      const y0 = yBase + belly + Math.sin(t * 4 + 0.4) * H * 0.03;
      const y1 = yBase - billow * (0.5 + 0.4 * t) - H * 0.12;
      const half = H * 0.085 * (0.9 + r() * 0.6);
      const lit = (t < 0.45) ? lightSide : -lightSide;
      folds.push({ tx: flow < 0 ? x1 : x0, ty: flow < 0 ? y1 : y0,
                   bx: flow < 0 ? x0 : x1, by: flow < 0 ? y0 : y1,
                   half, ph: r() * 10, lit, d: t });
    }
    folds.sort((a, b) => a.d - b.d);
    for (const f of folds) paintFold(f.tx, f.bx, f.ty, f.by, f.half, W * 0.07, f.ph, f.lit, 1, 0.94);

  } else if (mode === 'Pooled') {
    const surfY = H * (0.58 + r() * 0.1);
    castShadow(W * 0.5, surfY + H * 0.16, W * 0.46, H * 0.08, 0.5);
    const n1 = 7 + (r() * 3 | 0);
    curtain(W * 0.18, W * 0.82, -H * 0.04, surfY, n1, W * 0.06, 0.4);
    const cx = W * (0.5 + (r() - 0.5) * 0.1);
    const rings = 5 + (r() * 3 | 0);
    for (let i = rings; i >= 0; i--) {
      const t = i / rings;
      const ry = surfY + (H - surfY) * (0.15 + t * 0.6);
      const rw = W * (0.16 + t * 0.30);
      const ph = r() * 10;
      const lit = lightSide;
      paintFold(cx - rw, cx + rw, ry, ry + (r() - 0.5) * 20, rw * 0.5, W * 0.03, ph, lit, 1, 0.92);
    }

  } else if (mode === 'Veil') {
    const layers = 4 + (r() * 3 | 0);
    for (let L = 0; L < layers; L++) {
      const t = L / layers;
      const yo = H * (0.05 + t * 0.18) + (r() - 0.5) * H * 0.06;
      const n = 5 + (r() * 3 | 0);
      const alpha = 0.30 + t * 0.16;
      for (let i = 0; i < n; i++) {
        const tt = (i + 0.5) / n;
        const fx = W * (0.06 + tt * 0.88) + (r() - 0.5) * W * 0.04;
        const half = W * 0.12 * (0.7 + r() * 0.6);
        const lit = r() < 0.5 ? lightSide : -lightSide;
        paintFold(fx, fx + (r() - 0.5) * W * 0.05, yo, H * (0.96), half, W * 0.10, r() * 10, lit, 1, alpha);
      }
    }
    K.hazeSheet(x, W, H, noise, K.mix(pal.bg, pal.hi, 0.5), 0.20, Math.min(W, H) * 0.7, 'screen');

  } else { // Knot
    const cx = W * (0.5 + (r() - 0.5) * 0.12);
    const cy = H * (0.5 + (r() - 0.5) * 0.10);
    castShadow(cx, cy + H * 0.22, W * 0.34, H * 0.07, 0.5);
    const strands = 6 + (r() * 3 | 0);
    const folds = [];
    for (let s = 0; s < strands; s++) {
      const a0 = (s / strands) * Math.PI + r() * 0.4;
      const reach = H * (0.28 + r() * 0.12);
      const tx = cx + Math.cos(a0) * reach;
      const ty = cy - reach * 0.8 + (r() - 0.5) * H * 0.06;
      const bx = cx - Math.cos(a0) * reach * 0.8;
      const by = cy + reach * 0.9 + (r() - 0.5) * H * 0.06;
      const half = W * 0.10 * (0.85 + r() * 0.5);
      const lit = (Math.cos(a0) * lightSide > 0) ? lightSide : -lightSide;
      folds.push({ tx, ty, bx, by, half, ph: r() * 10, lit, d: s });
    }
    for (const f of folds) paintFold(f.tx, f.bx, f.ty, f.by, f.half, W * 0.10, f.ph, f.lit, 1, 0.96);
    K.softShadow(x, cx, cy, W * 0.16, 0.5);
  }

  if (pal.mat === 'velvet') {
    K.mottle(x, 0, 0, W, H, pal.deep, 30, r, 'multiply');
  } else if (pal.mat === 'paper') {
    K.mottle(x, 0, 0, W, H, pal.base, 22, r, 'overlay');
  } else {
    K.mottle(x, 0, 0, W, H, pal.base, 28, r, 'soft-light');
  }

  const lx = lightSide < 0 ? W * 0.22 : W * 0.78;
  K.sheen(x, lx, H * 0.30, Math.min(W, H) * 0.7, pal.sheen, mp.sheen * 0.16);

  const hazeCol = K.mix(pal.bg, pal.hi, 0.4);
  K.hazeSheet(x, W, H, noise, hazeCol, pal.mat === 'velvet' ? 0.10 : 0.16, Math.min(W, H) * 0.95, 'screen');
  const fh = x.createLinearGradient(0, H * 0.6, 0, H);
  fh.addColorStop(0, K.rgba(K.mix(pal.bg, pal.deep, 0.5), 0));
  fh.addColorStop(1, K.rgba(K.mix(pal.bg, pal.deep, 0.5), 0.28));
  x.fillStyle = fh; x.fillRect(0, H * 0.6, W, H * 0.4);

  K.grain(x, W, H, 5.5, r);
  K.vignette(x, W, H, K.lum(pal.bg) < 0.3 ? 0.5 : 0.34);
}

export const draperyTraits: TraitsFn = (id) => {
  const r = K.rng(id);
  const pal = K.pick(PALS, r);
  const mode = K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
  const matMap = { Plaster: 'Linen', Ash: 'Linen', Indigo: 'Velvet', Rose: 'Silk', Bistre: 'Paper', Oxblood: 'Velvet' };
  return { Palette: pal.name, Mode: mode, Format: f, Material: matMap[pal.name] };
};

export const draperySchema: TraitSchema = {
  traits: [
    { name: 'Palette',  values: PALS.map((p) => p.name) },
    { name: 'Mode',     values: MODES },
    { name: 'Format',   values: ['Portrait', 'Square', 'Landscape'] },
    { name: 'Material', values: ['Linen', 'Velvet', 'Silk', 'Paper'] },
  ],
};

export const renderDrapery: EngineFn = blit((off, id) => { draw(off, id); }, draperyTraits);

// W/H of Portrait, Square, Landscape (matches FORMATS order).
export const DRAPERY_ASPECTS = [1040 / 1300, 1, 1300 / 1040] as const;
