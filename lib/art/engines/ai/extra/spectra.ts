// @ts-nocheck
/*
 * SPECTRA — Direction A: "Refraction".
 *
 * White light split into spectrum bands and caustics by simulated glass/prisms.
 * The image reads as beams of light entering invisible prismatic bodies and
 * fanning out into dispersed spectral wedges, refracted rainbow streaks that
 * bend through the glass, and additive caustic glints scattered where the light
 * focuses. Everything is built with additive light ('screen'/'lighter') on a
 * deep indigo ground (#241a52 page colorway), so colours add up to luminous,
 * jewel-like, optical layers rather than flat fills.
 *
 * Artist lineage: divisionist-ai works in OPTICAL COLOUR. Honored here by
 * dispersing every white beam into separated hue bands (no pre-mixed colour)
 * and letting the additive blend re-fuse them in the viewer's eye.
 *
 * Deterministic from tokenId only. All trait-determining randomness is drawn
 * in paramsOf() in a FIXED order so traits() and draw() never disagree.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ── Palettes ──────────────────────────────────────────────────────────────
 * Each palette: a deep ground harmonizing with #241a52, plus a spectral hue
 * span (h0..h0+span degrees) the prisms disperse across, and a white-point for
 * the incoming beam. Named for the optical mood. */
const PALS = [
  { name: 'Full Spectrum', ground: '#150f33', h0: 0,   span: 320, white: '#fff6ff', sat: 0.95, glow: '#bfe8ff' },
  { name: 'Cool Dispersion', ground: '#101b3a', h0: 175, span: 150, white: '#eafcff', sat: 0.92, glow: '#9fe6ff' },
  { name: 'Warm Caustic',  ground: '#231233', h0: 330, span: 130, white: '#fff2e6', sat: 0.96, glow: '#ffcf8f' },
  { name: 'Halcyon',       ground: '#0e1430', h0: 200, span: 110, white: '#f0f8ff', sat: 0.85, glow: '#a9d8ff' },
  { name: 'Magenta Refraction', ground: '#1d0f30', h0: 270, span: 170, white: '#fdeaff', sat: 0.98, glow: '#e6a8ff' },
  { name: 'Emerald Prism', ground: '#0c1f24', h0: 120, span: 160, white: '#eafff4', sat: 0.9,  glow: '#9affd0' },
  { name: 'Aurora',        ground: '#0f1338', h0: 90,  span: 210, white: '#f3fbff', sat: 0.9,  glow: '#aef0d8' },
];

const FMTS = [
  { W: 1080, H: 1080, t: 'Square' },
  { W: 1000, H: 1240, t: 'Portrait' },
  { W: 1240, H: 1000, t: 'Landscape' },
];

const MODES = ['Fan', 'Cascade', 'Convergence'];   // how prism beams are arranged
const DENS  = ['Sparse', 'Layered', 'Saturated'];  // how many beams/caustics
const FOCUS = ['Single', 'Twin', 'Field'];         // number of prism bodies

/* ── Param draw (FIXED ORDER) ───────────────────────────────────────────── */
function paramsOf(r) {
  const palI  = Math.floor(r() * PALS.length);
  const fmt   = pick(FMTS, r);
  const mode  = pick(MODES, r);
  const dens  = pick(DENS, r);
  const focus = pick(FOCUS, r);
  return { palI, fmt, mode, dens, focus };
}

function labels(p) {
  return {
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    Mode:    p.mode,
    Density: p.dens,
    Focus:   p.focus,
  };
}

/* spectral hue at parametric t (0..1) across the palette span */
function specHue(P, t) { return P.h0 + t * P.span; }

/* a single dispersed beam: a thin white core that fans into N hue slivers,
   all additive. origin (ox,oy), aimed at angle a, length len, fan spread.  */
function drawBeam(x, P, ox, oy, a, len, spread, width, bands, r, intensity) {
  const half = spread / 2;
  for (let b = 0; b < bands; b++) {
    const bt = bands === 1 ? 0.5 : b / (bands - 1);
    // each band offset slightly in angle (dispersion) and tinted by spectral hue
    const ba = a - half + bt * spread;
    const hue = specHue(P, bt);
    const col = hsl2hex(hue, P.sat, 0.55);
    const ex = ox + Math.cos(ba) * len;
    const ey = oy + Math.sin(ba) * len;
    const g = x.createLinearGradient(ox, oy, ex, ey);
    g.addColorStop(0, rgba(P.white, 0.0));
    g.addColorStop(0.06, rgba(P.white, 0.5 * intensity));
    g.addColorStop(0.35, rgba(col, 0.42 * intensity));
    g.addColorStop(1, rgba(col, 0.0));
    x.strokeStyle = g;
    x.lineWidth = width * (0.5 + 0.9 * (1 - Math.abs(bt - 0.5) * 1.2));
    x.beginPath();
    x.moveTo(ox, oy);
    // a gentle bend mid-beam to suggest refraction through glass
    const mx = ox + Math.cos(ba) * len * 0.5 + Math.cos(ba + Math.PI / 2) * (randn(r) * len * 0.04);
    const my = oy + Math.sin(ba) * len * 0.5 + Math.sin(ba + Math.PI / 2) * (randn(r) * len * 0.04);
    x.quadraticCurveTo(mx, my, ex, ey);
    x.stroke();
  }
}

/* a translucent spectral wedge (a prism's exit fan as a filled sweep) */
function drawWedge(x, P, ox, oy, a, len, spread, bands, r, intensity) {
  for (let b = 0; b < bands; b++) {
    const bt = bands === 1 ? 0.5 : b / (bands - 1);
    const a0 = a - spread / 2 + (b / bands) * spread;
    const a1 = a - spread / 2 + ((b + 1) / bands) * spread;
    const hue = specHue(P, bt);
    const col = hsl2hex(hue, P.sat, 0.5);
    const l = len * (0.7 + r() * 0.5);
    const g = x.createRadialGradient(ox, oy, 0, ox, oy, l);
    g.addColorStop(0, rgba(P.white, 0.22 * intensity));
    g.addColorStop(0.25, rgba(col, 0.18 * intensity));
    g.addColorStop(1, rgba(col, 0.0));
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(ox, oy);
    x.arc(ox, oy, l, a0, a1);
    x.closePath();
    x.fill();
  }
}

/* a caustic glint — a small additive bloom where light focuses */
function drawCaustic(x, P, cx, cy, rad, r) {
  const hue = specHue(P, r());
  const col = mix(P.glow, hsl2hex(hue, P.sat, 0.6), 0.5);
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, rgba(P.white, 0.7));
  g.addColorStop(0.4, rgba(col, 0.35));
  g.addColorStop(1, rgba(col, 0.0));
  x.fillStyle = g;
  x.beginPath();
  x.arc(cx, cy, rad, 0, Math.PI * 2);
  x.fill();
  // tiny cross-flare streaks
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * Math.PI;
    const len = rad * (1.4 + r() * 1.4);
    const gg = x.createLinearGradient(cx - Math.cos(ang) * len, cy - Math.sin(ang) * len, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    gg.addColorStop(0, rgba(col, 0));
    gg.addColorStop(0.5, rgba(P.white, 0.5));
    gg.addColorStop(1, rgba(col, 0));
    x.strokeStyle = gg;
    x.lineWidth = 1 + r() * 1.5;
    x.beginPath();
    x.moveTo(cx - Math.cos(ang) * len, cy - Math.sin(ang) * len);
    x.lineTo(cx + Math.cos(ang) * len, cy + Math.sin(ang) * len);
    x.stroke();
  }
}

/* faint suggestion of the prism body itself — a soft translucent facet */
function drawPrismGhost(x, P, cx, cy, rad, a, r) {
  x.save();
  x.globalCompositeOperation = 'screen';
  x.translate(cx, cy);
  x.rotate(a);
  const n = 3; // triangular facet
  const g = x.createLinearGradient(-rad, -rad, rad, rad);
  g.addColorStop(0, rgba(P.glow, 0.05));
  g.addColorStop(0.5, rgba(P.white, 0.12));
  g.addColorStop(1, rgba(P.glow, 0.03));
  x.fillStyle = g;
  x.beginPath();
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(ang) * rad;
    const py = Math.sin(ang) * rad * 1.15;
    if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
  }
  x.closePath();
  x.fill();
  // bright refracting edges
  x.strokeStyle = rgba(P.white, 0.25);
  x.lineWidth = 1.5;
  x.stroke();
  x.restore();
}

function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);

  // ── Ground: deep indigo with a subtle nebular wash ──────────────────────
  const bg = x.createRadialGradient(W * 0.5, H * 0.42, S * 0.05, W * 0.5, H * 0.5, S * 0.9);
  bg.addColorStop(0, mix(P.ground, '#000010', 0.15));
  bg.addColorStop(0.6, P.ground);
  bg.addColorStop(1, mix(P.ground, '#000', 0.55));
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

  // faint colour fog clouds (still subtractive-ish, low alpha) to break flatness
  x.save();
  x.globalCompositeOperation = 'screen';
  const fogN = 5;
  for (let i = 0; i < fogN; i++) {
    const fx = r() * W, fy = r() * H, fr = S * (0.25 + r() * 0.4);
    const hue = specHue(P, r());
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, fr);
    g.addColorStop(0, rgba(hsl2hex(hue, P.sat * 0.7, 0.35), 0.10));
    g.addColorStop(1, rgba(P.ground, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  x.restore();

  // ── Prism bodies: phi-anchored origins where beams disperse ─────────────
  const focusN = p.focus === 'Single' ? 1 : p.focus === 'Twin' ? 2 : rint(r, 3, 5);
  const anchors = [];
  for (let i = 0; i < focusN; i++) {
    // distribute on a phi grid, jittered
    const gx = (i % 2 === 0) ? INVPHI : 1 - INVPHI;
    const gy = ((i >> 1) % 2 === 0) ? INVPHI : 1 - INVPHI;
    const ax = (focusN === 1) ? W * (0.32 + r() * 0.36) : W * (gx + (r() - 0.5) * 0.2);
    const ay = (focusN === 1) ? H * (0.34 + r() * 0.32) : H * (gy + (r() - 0.5) * 0.2);
    anchors.push({ x: clamp(ax, W * 0.12, W * 0.88), y: clamp(ay, H * 0.12, H * 0.88) });
  }

  // density → counts
  const densMul = p.dens === 'Sparse' ? 0.55 : p.dens === 'Layered' ? 1.0 : 1.7;

  // ── Wedges (filled spectral sweeps) — painted first, soft and wide ───────
  x.save();
  x.globalCompositeOperation = 'screen';
  for (const an of anchors) {
    const sweeps = Math.round((2 + rint(r, 1, 3)) * densMul);
    for (let s = 0; s < sweeps; s++) {
      let baseA;
      if (p.mode === 'Fan') baseA = -Math.PI / 2 + randn(r) * 0.5 + s * 0.4;
      else if (p.mode === 'Cascade') baseA = Math.PI * (0.15 + 0.7 * (s / Math.max(1, sweeps)));
      else baseA = Math.atan2(H / 2 - an.y, W / 2 - an.x) + randn(r) * 0.3; // Convergence
      const spread = 0.35 + r() * 0.55;
      const len = S * (0.5 + r() * 0.55);
      drawWedge(x, P, an.x, an.y, baseA, len, spread, rint(r, 5, 8), r, 0.9);
    }
  }
  x.restore();

  // ── Beams (dispersed fanned light) — additive, the structural drawing ───
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (const an of anchors) {
    const beams = Math.round((6 + rint(r, 2, 6)) * densMul);
    for (let s = 0; s < beams; s++) {
      let a;
      if (p.mode === 'Fan') {
        a = -Math.PI / 2 + (s / beams - 0.5) * (0.8 + r() * 0.7) + randn(r) * 0.08;
      } else if (p.mode === 'Cascade') {
        a = Math.PI * (0.1 + 0.8 * (s / beams)) + randn(r) * 0.06;
      } else { // Convergence — beams aim toward centre then fan out past it
        const toC = Math.atan2(H / 2 - an.y, W / 2 - an.x);
        a = toC + (s / beams - 0.5) * 0.9 + randn(r) * 0.07;
      }
      const len = S * (0.55 + r() * 0.6);
      const spread = 0.04 + r() * 0.14;
      const width = S * (0.004 + r() * 0.012);
      const bands = rint(r, 6, 11);
      drawBeam(x, P, an.x, an.y, a, len, spread, width, bands, r, 0.6 + r() * 0.5);
    }
  }
  x.restore();

  // ── Long refracted streaks crossing the field (chromatic threads) ───────
  x.save();
  x.globalCompositeOperation = 'lighter';
  const threads = Math.round(rint(r, 6, 14) * densMul);
  for (let i = 0; i < threads; i++) {
    const sx = r() * W, sy = r() * H;
    const a = randn(r) * 0.6 + (p.mode === 'Cascade' ? Math.PI / 2 : 0);
    const len = S * (0.4 + r() * 0.7);
    const hue = specHue(P, r());
    const col = hsl2hex(hue, P.sat, 0.6);
    const ex = sx + Math.cos(a) * len, ey = sy + Math.sin(a) * len;
    const g = x.createLinearGradient(sx, sy, ex, ey);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.5, rgba(col, 0.25 + r() * 0.2));
    g.addColorStop(1, rgba(col, 0));
    x.strokeStyle = g;
    x.lineWidth = 0.6 + r() * 1.8;
    x.beginPath();
    x.moveTo(sx, sy);
    const mx = (sx + ex) / 2 + Math.cos(a + Math.PI / 2) * randn(r) * len * 0.08;
    const my = (sy + ey) / 2 + Math.sin(a + Math.PI / 2) * randn(r) * len * 0.08;
    x.quadraticCurveTo(mx, my, ex, ey);
    x.stroke();
  }
  x.restore();

  // ── Prism ghosts at anchors (faint glass facets) ────────────────────────
  for (const an of anchors) {
    drawPrismGhost(x, P, an.x, an.y, S * (0.05 + r() * 0.06), randn(r) * 1.2, r);
  }

  // ── Caustic glints — focal sparkles, clustered near anchors + scattered ──
  x.save();
  x.globalCompositeOperation = 'lighter';
  const glints = Math.round(rint(r, 18, 40) * densMul);
  for (let i = 0; i < glints; i++) {
    let cx, cy;
    if (r() < 0.6 && anchors.length) {
      const an = pick(anchors, r);
      cx = an.x + randn(r) * S * 0.18;
      cy = an.y + randn(r) * S * 0.18;
    } else {
      cx = r() * W; cy = r() * H;
    }
    const rad = S * (0.004 + Math.pow(r(), 2) * 0.03);
    drawCaustic(x, P, clamp(cx, 0, W), clamp(cy, 0, H), rad, r);
  }
  x.restore();

  // ── Optical-colour texture: spectral mottle in a few zones ──────────────
  for (const an of anchors) {
    const hue = specHue(P, r());
    mottle(x, an.x - S * 0.2, an.y - S * 0.2, S * 0.4, S * 0.4, hsl2hex(hue, P.sat, 0.5), 90, r, 'screen');
  }

  // ── Finishing texture ───────────────────────────────────────────────────
  grain(x, W, H, 1000, r);
  vignette(x, W, H, 0.34);

  // a final faint central bloom to lift the additive light off the ground
  x.save();
  x.globalCompositeOperation = 'screen';
  const cb = x.createRadialGradient(W / 2, H * 0.45, 0, W / 2, H * 0.45, S * 0.6);
  cb.addColorStop(0, rgba(P.glow, 0.06));
  cb.addColorStop(1, rgba(P.glow, 0));
  x.fillStyle = cb;
  x.fillRect(0, 0, W, H);
  x.restore();
}

export const spectraTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const spectraSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format',  values: ['Square', 'Portrait', 'Landscape'] },
    { name: 'Mode',    values: MODES },
    { name: 'Density', values: DENS },
    { name: 'Focus',   values: FOCUS },
  ],
};

export const renderSpectra: EngineFn = blit(draw, spectraTraits);

export const SPECTRA_ASPECTS = [1, 0.81, 1.24] as const; // W/H of Square, Portrait, Landscape
