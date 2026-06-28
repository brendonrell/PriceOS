// @ts-nocheck
/*
 * INTERFERENCE — soft optical moiré.
 * Straight port from tools/halo/s12_moire.js (2026-06-28, approved as-is). Two
 * or more fine printed grids (lines / dot-screens) overlaid and gently WARPED by
 * a smooth displacement field, so the moiré beats emerge from the math and FLOW
 * around invisible forms — a bulge with no object, a ripple where nothing
 * dropped, an interference that briefly RESOLVES into a faint ghost (a face, a
 * coin, a word) then dissolves. SURREAL = real-but-off: a correct printed
 * screen, bending around nothing. Hazy, low-contrast, hypnotic.
 *
 * Rendered analytically per-pixel (ImageData) so beats bloom into soft tonal
 * bands with no aliasing.
 *
 * Deterministic in tokenId. interferenceTraits() mirrors draw()'s rng order.
 */
import { rng, pick, h2r, lum, mix, grain, vignette, mottle, makeNoise, bloom, hazeSheet, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const K = { rng, pick, h2r, lum, mix, grain, vignette, mottle, makeNoise, bloom, hazeSheet };

const PALS = [
  { name: 'Sodium', ground: '#2b2722', tA: '#e0a85a', tB: '#7f93b4', glow: '#f4d49a', depth: 0.9 },
  { name: 'Tide',   ground: '#dfe7e6', tA: '#3f8d8a', tB: '#c9b48c', glow: '#ffffff', depth: 0.7 },
  { name: 'Ash',    ground: '#e9e3d6', tA: '#8a857c', tB: '#2a2622', glow: '#ffffff', depth: 0.8 },
  { name: 'Dusk',   ground: '#222838', tA: '#9a86a6', tB: '#d8c187', glow: '#cdbce0', depth: 0.95 },
  { name: 'Bone',   ground: '#efe9df', tA: '#bdb6aa', tB: '#9a9389', glow: '#ffffff', depth: 0.55 },
  { name: 'Oil',    ground: '#191b20', tA: '#5f8d86', tB: '#8a6f93', glow: '#bfe0d6', depth: 1.0 },
];

const MODES = ['Beat', 'Lens', 'Ripple', 'Glass', 'Watermark', 'Weave'];
const FORMATS = [[1040, 1300], [1200, 1200], [1300, 1040]]; // portrait / square / landscape

function ghostField(kind, u, v) {
  if (kind === 'coin') {
    const dx = u - 0.5, dy = v - 0.5, d = Math.sqrt(dx * dx + dy * dy);
    const ring = Math.exp(-Math.pow((d - 0.27) / 0.05, 2));
    const disc = Math.exp(-Math.pow(d / 0.30, 2));
    return disc * 0.6 + ring * 0.7;
  }
  if (kind === 'face') {
    const dx = u - 0.5, dy = (v - 0.47);
    const head = Math.exp(-(dx * dx / 0.045 + dy * dy / 0.075));
    const eyeL = Math.exp(-((u - 0.42) ** 2 + (v - 0.44) ** 2) / 0.0016);
    const eyeR = Math.exp(-((u - 0.58) ** 2 + (v - 0.44) ** 2) / 0.0016);
    const mouth = Math.exp(-((u - 0.5) ** 2 / 0.006 + (v - 0.60) ** 2 / 0.0009));
    return head * 0.8 - (eyeL + eyeR) * 0.7 - mouth * 0.6;
  }
  if (kind === 'orb') {
    const dx = u - 0.5, dy = v - 0.5, d = Math.sqrt(dx * dx + dy * dy);
    return Math.exp(-Math.pow(d / 0.28, 2)) * 1.0;
  }
  const bars = Math.cos((v - 0.5) * 26) * Math.exp(-Math.pow((v - 0.5) / 0.16, 2));
  const body = Math.exp(-Math.pow((u - 0.5) / 0.24, 2));
  return bars * body * 0.8;
}

function draw(cv, seed) {
  const r = K.rng(seed);
  const noise = K.makeNoise(seed * 7 + 1);
  const pal = (r(), PALS[(seed * 5 + 2) % PALS.length]);
  const mode = MODES[(seed + (seed / MODES.length | 0)) % MODES.length];
  r();
  const fmt = K.pick(FORMATS, r);
  const W = fmt[0], H = fmt[1];
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const minWH = Math.min(W, H);

  const cell = minWH / (130 + r() * 90);
  const fGrid = (Math.PI * 2) / cell;
  const baseAng = (r() - 0.5) * 0.5;
  const dAng = (0.5 + r() * 1.4) * Math.PI / 180;
  const scaleB = 1 + (0.5 + r() * 2.5) / 100;
  const dotScreen = r() < 0.42;
  const thirdGrid = r() < 0.34;
  const ang3 = baseAng - dAng * (1.7 + r());

  const cx = 0.5 + (r() - 0.5) * 0.36, cy = 0.5 + (r() - 0.5) * 0.36;
  const lensR = 0.22 + r() * 0.18;
  const lensAmt = (mode === 'Lens' ? 1 : 0.35) * (0.5 + r() * 0.6) * pal.depth;
  const rippleN = 6 + (r() * 6 | 0);
  const ripPhase = r() * Math.PI * 2;
  const glassAmt = 0.5 + r() * 0.7;
  const flowAmt = (mode === 'Beat' ? 0.25 : 0.6) * (0.6 + r() * 0.8);
  const flowScale = 1.6 + r() * 1.8;
  const ghostKind = K.pick(['coin', 'face', 'orb', 'glyph'], r);
  const ghostAmt = mode === 'Watermark' ? (2.6 + r() * 1.0) : (r() < 0.45 ? 0.5 : 0);
  const isWeave = mode === 'Weave';

  const gnd = K.h2r(pal.ground);
  const cA = K.h2r(pal.tA);
  const cB = K.h2r(pal.tB);
  const cG = K.h2r(pal.glow);
  const dark = K.lum(pal.ground) < 0.42;

  const beatGain = 0.5 + r() * 0.22;

  const img = x.createImageData(W, H);
  const D = img.data;
  const ca = Math.cos(baseAng), sa = Math.sin(baseAng);
  const ca2 = Math.cos(baseAng + dAng), sa2 = Math.sin(baseAng + dAng);
  const ca3 = Math.cos(ang3), sa3 = Math.sin(ang3);

  function screen(X, Y, c, s, freq, ph, dot) {
    const u = (X * c - Y * s) * freq + ph;
    if (dot) {
      const v = (X * s + Y * c) * freq + ph;
      return (0.5 + 0.5 * Math.cos(u)) * (0.5 + 0.5 * Math.cos(v));
    }
    return 0.5 + 0.5 * Math.cos(u);
  }

  for (let py = 0; py < H; py++) {
    const v0 = py / H;
    for (let px = 0; px < W; px++) {
      const u0 = px / W;
      let du = 0, dv = 0;
      const ddx = u0 - cx, ddy = (v0 - cy) * (H / W);
      const dist = Math.sqrt(ddx * ddx + ddy * ddy);

      if (mode === 'Lens' || lensAmt) {
        const g = Math.exp(-Math.pow(dist / lensR, 2));
        const k = lensAmt * 0.10 * g;
        du += ddx * k; dv += ddy * k;
      }
      if (mode === 'Ripple') {
        const w = Math.cos(dist * rippleN * Math.PI - ripPhase) * Math.exp(-dist * 2.2);
        const k = 0.045 * w;
        du += (ddx / (dist + 1e-3)) * k; dv += (ddy / (dist + 1e-3)) * k;
      }
      if (mode === 'Glass') {
        const wy = noise.fbm(v0 * 5.0, u0 * 1.2, 4, 0.55, 2.1);
        du += glassAmt * 0.035 * (Math.sin(v0 * 22 + wy * 3) + wy);
        dv += glassAmt * 0.010 * Math.cos(u0 * 9 + wy * 2);
      }
      const fx = noise.fbm(u0 * flowScale, v0 * flowScale, 4, 0.55, 2.1);
      const fy = noise.fbm(u0 * flowScale + 11.3, v0 * flowScale + 4.7, 4, 0.55, 2.1);
      du += flowAmt * 0.022 * fx;
      dv += flowAmt * 0.022 * fy;

      const X = (px + du * W);
      const Y = (py + dv * H);

      let ph2extra = 0, ph1extra = 0, ghostLift = 0;
      if (ghostAmt) {
        const gv = ghostField(ghostKind, u0, v0);
        ph2extra = gv * ghostAmt * 1.7;
        ph1extra = -gv * ghostAmt * 0.4;
        ghostLift = gv;
      }

      const c2 = isWeave ? -sa2 : ca2, s2 = isWeave ? ca2 : sa2;
      const g1 = screen(X, Y, ca, sa, fGrid, ph1extra, dotScreen);
      const g2 = screen(X, Y, c2, s2, fGrid * scaleB, Math.PI * 0.5 + ph2extra, dotScreen);
      let g3 = 0;
      if (thirdGrid) g3 = screen(X, Y, ca3, sa3, fGrid * (2 - scaleB), 1.7, dotScreen);

      let R, G, B;
      const beat = g1 * g2;
      if (dark) {
        const a1 = g1 * beatGain * 0.16, a2 = g2 * beatGain * 0.16, a3 = g3 * beatGain * 0.12;
        const bg = beat * 0.42;
        R = gnd[0] + cA[0] * a1 + cB[0] * a2 + cG[0] * bg;
        G = gnd[1] + cA[1] * a1 + cB[1] * a2 + cG[1] * bg;
        B = gnd[2] + cA[2] * a1 + cB[2] * a2 + cG[2] * bg;
        if (thirdGrid) { R += cG[0] * a3; G += cG[1] * a3; B += cG[2] * a3; }
      } else {
        const ink = pal.name === 'Bone' ? 0.5 : 0.72;
        const i1 = (1 - g1) * beatGain, i2 = (1 - g2) * beatGain;
        const i3 = thirdGrid ? (1 - g3) * beatGain * 0.6 : 0;
        R = gnd[0] - (gnd[0] - cA[0]) * i1 * ink - (gnd[0] - cB[0]) * i2 * ink - (gnd[0] - cB[0]) * i3 * 0.4;
        G = gnd[1] - (gnd[1] - cA[1]) * i1 * ink - (gnd[1] - cB[1]) * i2 * ink - (gnd[1] - cB[1]) * i3 * 0.4;
        B = gnd[2] - (gnd[2] - cA[2]) * i1 * ink - (gnd[2] - cB[2]) * i2 * ink - (gnd[2] - cB[2]) * i3 * 0.4;
      }

      if (ghostLift) {
        const gl = ghostLift * (dark ? 14 : -12);
        R += gl; G += gl; B += gl;
      }

      const o = (py * W + px) * 4;
      D[o] = R < 0 ? 0 : R > 255 ? 255 : R;
      D[o + 1] = G < 0 ? 0 : G > 255 ? 255 : G;
      D[o + 2] = B < 0 ? 0 : B > 255 ? 255 : B;
      D[o + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);

  x.save();
  x.globalAlpha = 0.30;
  x.globalCompositeOperation = 'source-over';
  const bo = Math.max(1, Math.round(minWH / 700));
  x.drawImage(cv, bo, 0); x.drawImage(cv, -bo, 0);
  x.drawImage(cv, 0, bo); x.drawImage(cv, 0, -bo);
  x.restore();

  if (ghostAmt > 0.8 || mode === 'Lens' || mode === 'Ripple') {
    K.bloom(x, cx * W, cy * H, minWH * (0.34 + r() * 0.16), pal.glow, dark ? 0.06 : 0.07);
  }
  const hazeCol = dark ? K.mix(pal.ground, pal.glow, 0.35) : K.mix(pal.ground, '#ffffff', 0.4);
  K.hazeSheet(x, W, H, noise, hazeCol, dark ? 0.09 : 0.20, minWH * 0.95, dark ? 'screen' : 'soft-light');

  K.mottle(x, 0, 0, W, H, K.mix(pal.ground, pal.tA, 0.3), 60, r, dark ? 'screen' : 'overlay');

  K.grain(x, W, H, 6.5, r);
  K.vignette(x, W, H, dark ? 0.42 : 0.26);
}

export const interferenceTraits: TraitsFn = (id) => {
  const r = K.rng(id);
  const pal = (r(), PALS[(id * 5 + 2) % PALS.length]);
  const mode = MODES[(id + (id / MODES.length | 0)) % MODES.length];
  r();
  const fmt = K.pick(FORMATS, r);
  const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
  r(); // cell
  const screenKind = r() < 0.42 ? 'Dot' : 'Line';
  return { Palette: pal.name, Mode: mode, Format: f, Screen: screenKind };
};

export const interferenceSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Mode',    values: MODES },
    { name: 'Format',  values: ['Portrait', 'Square', 'Landscape'] },
    { name: 'Screen',  values: ['Dot', 'Line'] },
  ],
};

export const renderInterference: EngineFn = blit((off, id) => { draw(off, id); }, interferenceTraits);

// W/H of Portrait, Square, Landscape (matches FORMATS order).
export const INTERFERENCE_ASPECTS = [1040 / 1300, 1, 1300 / 1040] as const;
