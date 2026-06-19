// @ts-nocheck
/*
 * SPECTRA — by divisionist-ai. "White light refracted through glass."
 *
 * v2 rebuild (2026-06-19). The image is a REFRACTION EVENT, not a starburst:
 * one or a few collimated white beams strike the edge of a triangular glass
 * prism and exit as an ORDERED fan of parallel spectral bands — violet, indigo,
 * blue, green, yellow, orange, red, in sequence, never a smeared rainbow. Soft
 * caustic ribbons curve onto an atmospheric indigo ground that harmonises with
 * the #241a52 page colorway. Volumetric haze gives the beams body; a grain field
 * sits over the whole frame. Brightness is capped below pure white so colour
 * survives — this reads as light through glass, not RGB lasers.
 *
 * The prism origin is anchored on phi points and travels across the whole frame
 * (corners, off-frame), with varying beam count, prism angle, and scale, so
 * seeds range from intimate slivers to frame-filling dispersions.
 *
 * Artist lineage: divisionist-ai works in OPTICAL COLOUR — separated, ordered
 * hue bands the eye re-fuses, rather than pre-mixed pigment.
 *
 * Deterministic from tokenId only. All trait-determining randomness is drawn in
 * paramsOf() in a FIXED order so traits() and draw() never disagree.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ── Spectral order ─────────────────────────────────────────────────────────
 * The visible spectrum as ordered hue stops (violet→red). A palette samples a
 * contiguous slice of this so bands always read in sequence, never smeared. */
const VIOLET = 280, RED = 0; // hue at the two ends of the band fan (degrees)

/* ── Palettes — each gives the dispersion a real spectral BIAS ──────────────
 * span  : which slice of violet(280)→red(0) the prism throws (h0 = violet end,
 *         h1 = red end, walked in order; degrees may wrap through 360/0).
 * sat/lt: dusty, atmospheric glass colour — never neon.
 * ground: deep indigo harmonised with #241a52.
 * cap   : peak band lightness (kept under 1.0 so nothing clips to #fff). */
const PALS = [
  // Full spectrum — the textbook prism, all seven bands, slightly muted.
  { name: 'Full Spectrum',    ground: '#191145', h0: 282, h1: 4,   sat: 0.52, lt: 0.62, cap: 0.78, haze: '#3a2f74', cast: '#6f8fd8' },
  // Warm / sodium — amber, rose, orange end of the spectrum.
  { name: 'Sodium',           ground: '#241634', h0: 58,  h1: 2,   sat: 0.5,  lt: 0.6,  cap: 0.76, haze: '#4a2f52', cast: '#d8a86f' },
  // Cool / aqueous — steel blue through aqua, like light under water.
  { name: 'Aqueous',          ground: '#0f1d3e', h0: 250, h1: 158, sat: 0.46, lt: 0.62, cap: 0.74, haze: '#244a6e', cast: '#7fc8e0' },
  // Near-monochrome dispersion — a tight indigo→blue slice, the quietest seed.
  { name: 'Indigo Dispersion',ground: '#141038', h0: 268, h1: 214, sat: 0.4,  lt: 0.6,  cap: 0.7,  haze: '#2a2566', cast: '#8a9be8' },
  // Magenta / rose — violet through magenta into rose.
  { name: 'Rose Refraction',  ground: '#221038', h0: 300, h1: 348, sat: 0.5,  lt: 0.63, cap: 0.76, haze: '#43295e', cast: '#d89bc8' },
  // Verdant — emerald through gold, a glassy garden light.
  { name: 'Verdant Prism',    ground: '#0f1f33', h0: 168, h1: 52,  sat: 0.46, lt: 0.6,  cap: 0.74, haze: '#1f4a52', cast: '#9ad8a8' },
];

/* Formats — real W/H ratios live in SPECTRA_ASPECTS below. */
const FMTS = [
  { W: 1240, H: 1240, t: 'Square' },
  { W: 1000, H: 1300, t: 'Tall' },
  { W: 1300, H: 1000, t: 'Wide' },
];

const PLACE  = ['Centred', 'Edge', 'Cornered', 'Off-frame']; // where the prism sits
const BEAMS  = ['Sliver', 'Pair', 'Sheaf'];                  // how many incoming beams
const SCALE  = ['Intimate', 'Standard', 'Expansive'];        // dispersion scale
const GROUNDF= ['Misted', 'Caustic'];                        // ground finish

/* ── Param draw (FIXED ORDER) ───────────────────────────────────────────── */
function paramsOf(r) {
  const palI    = Math.floor(r() * PALS.length);
  const fmt     = pick(FMTS, r);
  const place   = pick(PLACE, r);
  const beams   = pick(BEAMS, r);
  const scale   = pick(SCALE, r);
  const ground  = pick(GROUNDF, r);
  return { palI, fmt, place, beams, scale, ground };
}

function labels(p) {
  return {
    Palette:  PALS[p.palI].name,
    Format:   p.fmt.t,
    Placement:p.place,
    Beams:    p.beams,
    Scale:    p.scale,
    Ground:   p.ground,
  };
}

/* Ordered spectral hue at parametric t (0=violet end, 1=red end of palette). */
function bandHue(P, t) {
  // walk h0→h1 the short way so the sequence is monotone, not a wrap-around smear
  let a = P.h0, b = P.h1;
  let d = b - a;
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  return a + d * t;
}

/* ── A collimated incoming white beam striking the prism edge ───────────────
 * Drawn as a soft, slightly hazy shaft from the source toward the prism hit
 * point. Capped white (no clip). */
function drawIncoming(x, P, sx, sy, hx, hy, w, intensity) {
  const g = x.createLinearGradient(sx, sy, hx, hy);
  const wht = mix('#ffffff', P.haze, 1 - P.cap); // softened white-point
  g.addColorStop(0,    rgba(wht, 0.0));
  g.addColorStop(0.25, rgba(wht, 0.10 * intensity));
  g.addColorStop(0.85, rgba(wht, 0.34 * intensity));
  g.addColorStop(1,    rgba(wht, 0.40 * intensity));
  x.strokeStyle = g;
  x.lineCap = 'round';
  x.lineWidth = w;
  x.beginPath();
  x.moveTo(sx, sy);
  x.lineTo(hx, hy);
  x.stroke();
}

/* ── The dispersion fan: ORDERED spectral bands leaving the prism ────────────
 * hx,hy = exit point on the prism edge. a = central exit angle. spread = total
 * angular fan. len = band length. Bands are drawn as ADJACENT filled angular
 * wedges so neighbours touch and form one continuous ordered spectrum strip
 * (violet→red), not separated laser lines. Each wedge is bright (capped) near
 * the prism and bleeds to transparent at the tip; thin bright edge strokes keep
 * the banding crisp. Additive blend lets the strip re-fuse softly. */
function drawDispersion(x, P, hx, hy, a, spread, len, bands, r, intensity) {
  const a0 = a - spread / 2;
  for (let b = 0; b < bands; b++) {
    const t0 = b / bands, t1 = (b + 1) / bands;
    const tc = (t0 + t1) / 2;                       // band centre, 0=violet 1=red
    const ang0 = a0 + t0 * spread;
    const ang1 = a0 + t1 * spread;
    const hue  = bandHue(P, tc);
    // gentle brightness arch across the strip, always capped below pure white
    const lt   = Math.min(P.cap, P.lt + 0.05 * Math.cos((tc - 0.5) * Math.PI));
    const col  = hsl2hex(hue, P.sat, lt);
    const l    = len * (0.92 + 0.08 * Math.cos((tc - 0.5) * Math.PI)); // slight curve to the tip line
    // filled wedge, radial fade from prism to tip
    const g = x.createRadialGradient(hx, hy, 0, hx, hy, l);
    g.addColorStop(0,    rgba(mix(col, '#ffffff', 0.3 * P.cap), 0.30 * intensity));
    g.addColorStop(0.12, rgba(col, 0.34 * intensity));
    g.addColorStop(0.55, rgba(col, 0.16 * intensity));
    g.addColorStop(1,    rgba(col, 0.0));
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(hx, hy);
    x.arc(hx, hy, l, ang0, ang1);
    x.closePath();
    x.fill();
  }
  // thin bright band-edge strokes for crisp ordered separation
  for (let b = 0; b <= bands; b++) {
    const t  = b / bands;
    const ba = a0 + t * spread;
    const hue = bandHue(P, clamp(t, 0, 1));
    const col = hsl2hex(hue, Math.min(0.7, P.sat + 0.12), Math.min(P.cap, P.lt + 0.08));
    const ex = hx + Math.cos(ba) * len;
    const ey = hy + Math.sin(ba) * len;
    const g = x.createLinearGradient(hx, hy, ex, ey);
    g.addColorStop(0,   rgba(mix(col, '#ffffff', 0.25), 0.22 * intensity));
    g.addColorStop(0.5, rgba(col, 0.14 * intensity));
    g.addColorStop(1,   rgba(col, 0.0));
    x.strokeStyle = g;
    x.lineCap = 'round';
    x.lineWidth = Math.max(0.8, len * 0.004);
    x.beginPath();
    x.moveTo(hx, hy);
    x.lineTo(ex, ey);
    x.stroke();
  }
}

/* ── A caustic ribbon cast onto the ground — a curved tinted sweep ──────────*/
function drawCaustic(x, P, x0, y0, x1, y1, w, hue, r) {
  const col = hsl2hex(hue, P.sat * 0.9, Math.min(P.cap, P.lt + 0.05));
  const cx = (x0 + x1) / 2 + (r() - 0.5) * (x1 - x0) * 0.4;
  const cy = (y0 + y1) / 2 + (r() - 0.5) * Math.abs(x1 - x0) * 0.5 + Math.abs(y1 - y0) * 0.2;
  const g = x.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0,   rgba(col, 0.0));
  g.addColorStop(0.5, rgba(col, 0.22));
  g.addColorStop(1,   rgba(col, 0.0));
  x.strokeStyle = g;
  x.lineCap = 'round';
  x.lineWidth = w;
  x.beginPath();
  x.moveTo(x0, y0);
  x.quadraticCurveTo(cx, cy, x1, y1);
  x.stroke();
}

/* ── The prism body itself — a faint triangular glass facet with bright edges */
function drawPrism(x, P, cx, cy, rad, rot) {
  x.save();
  x.translate(cx, cy);
  x.rotate(rot);
  const pts = [];
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 - Math.PI / 2;
    pts.push([Math.cos(ang) * rad, Math.sin(ang) * rad * 1.08]);
  }
  // glass fill — a soft internal gradient, never opaque white
  x.globalCompositeOperation = 'screen';
  const gg = x.createLinearGradient(-rad, -rad, rad, rad);
  gg.addColorStop(0,   rgba(P.haze, 0.10));
  gg.addColorStop(0.5, rgba(mix('#ffffff', P.haze, 0.4), 0.16));
  gg.addColorStop(1,   rgba(P.haze, 0.06));
  x.fillStyle = gg;
  x.beginPath();
  x.moveTo(pts[0][0], pts[0][1]);
  x.lineTo(pts[1][0], pts[1][1]);
  x.lineTo(pts[2][0], pts[2][1]);
  x.closePath();
  x.fill();
  // refracting edges — bright but capped
  x.strokeStyle = rgba(mix('#ffffff', P.haze, 0.25), 0.4);
  x.lineWidth = Math.max(1.2, rad * 0.02);
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

  // ── Atmospheric indigo ground ───────────────────────────────────────────
  const bg = x.createLinearGradient(0, 0, W * 0.3, H);
  bg.addColorStop(0,   mix(P.ground, '#ffffff', 0.06));
  bg.addColorStop(0.5, P.ground);
  bg.addColorStop(1,   mix(P.ground, '#000008', 0.5));
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

  // a soft directional fog wash so the ground isn't flat
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < 4; i++) {
    const fx = W * (0.2 + r() * 0.6), fy = H * (0.15 + r() * 0.6), fr = S * (0.4 + r() * 0.5);
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, fr);
    g.addColorStop(0, rgba(P.haze, 0.10));
    g.addColorStop(1, rgba(P.haze, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  x.restore();

  // ── Compose the refraction event ────────────────────────────────────────
  // prism scale & placement vary widely across seeds.
  const scaleMul = p.scale === 'Intimate' ? 0.45 : p.scale === 'Standard' ? 0.8 : 1.2;
  const prad = S * (0.06 + 0.05 * r()) * scaleMul;

  // anchor the prism on a phi point, then push toward edge/corner/off-frame.
  let px, py;
  const lo = INVPHI, hi = 1 - INVPHI; // 0.618 / 0.382
  const phiX = r() < 0.5 ? lo : hi, phiY = r() < 0.5 ? lo : hi;
  if (p.place === 'Centred') {
    px = W * (phiX); py = H * (phiY);
  } else if (p.place === 'Edge') {
    // ride one frame edge
    if (r() < 0.5) { px = r() < 0.5 ? W * 0.12 : W * 0.88; py = H * phiY; }
    else           { px = W * phiX; py = r() < 0.5 ? H * 0.12 : H * 0.88; }
  } else if (p.place === 'Cornered') {
    px = r() < 0.5 ? W * 0.1 : W * 0.9; py = r() < 0.5 ? H * 0.1 : H * 0.9;
  } else { // Off-frame — prism sits partly outside, dispersion sweeps inward
    const side = rint(r, 0, 3);
    if (side === 0)      { px = -prad * 0.4; py = H * phiY; }
    else if (side === 1) { px = W + prad * 0.4; py = H * phiY; }
    else if (side === 2) { px = W * phiX; py = -prad * 0.4; }
    else                 { px = W * phiX; py = H + prad * 0.4; }
  }

  // central exit direction = aimed roughly toward the open expanse of the frame
  const toCentre = Math.atan2(H * 0.5 - py, W * 0.5 - px);
  const exitA = toCentre + randn(r) * 0.45;
  const prismRot = randn(r) * 1.5;

  // incoming beam(s) come from the opposite side of the prism.
  const inA = exitA + Math.PI + randn(r) * 0.2;
  const beamN = p.beams === 'Sliver' ? 1 : p.beams === 'Pair' ? 2 : rint(r, 3, 4);
  const fanLen = S * (0.55 + r() * 0.45) * (0.7 + scaleMul * 0.5);
  const fanSpread = (0.65 + r() * 0.5) * (p.beams === 'Sliver' ? 0.8 : 1.0);

  // ── Volumetric haze around the dispersion cone, gives the beams body ──────
  x.save();
  x.globalCompositeOperation = 'screen';
  const coneG = x.createRadialGradient(px, py, 0, px, py, fanLen);
  coneG.addColorStop(0, rgba(P.haze, 0.18));
  coneG.addColorStop(0.5, rgba(P.haze, 0.08));
  coneG.addColorStop(1, rgba(P.haze, 0));
  x.fillStyle = coneG;
  x.beginPath();
  x.moveTo(px, py);
  x.arc(px, py, fanLen, exitA - fanSpread * 0.7, exitA + fanSpread * 0.7);
  x.closePath();
  x.fill();
  x.restore();

  // ── Incoming white shaft(s) striking the prism edge ──────────────────────
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let b = 0; b < beamN; b++) {
    const off = beamN === 1 ? 0 : (b / (beamN - 1) - 0.5);
    const ia  = inA + off * 0.18;
    const dist = S * (0.7 + r() * 0.5);
    const sx = px + Math.cos(ia) * dist;
    const sy = py + Math.sin(ia) * dist;
    // hit point slightly offset along the prism edge per beam
    const hx = px + Math.cos(exitA + Math.PI / 2) * off * prad * 1.4;
    const hy = py + Math.sin(exitA + Math.PI / 2) * off * prad * 1.4;
    drawIncoming(x, P, sx, sy, hx, hy, S * (0.006 + r() * 0.01) * (0.6 + scaleMul * 0.4), 0.7 + r() * 0.3);
  }
  x.restore();

  // ── The ordered spectral dispersion fan(s) — the heart of the piece ──────
  x.save();
  x.globalCompositeOperation = 'lighter';
  const bandsPerFan = rint(r, 9, 13);
  for (let b = 0; b < beamN; b++) {
    const off = beamN === 1 ? 0 : (b / (beamN - 1) - 0.5);
    const hx = px + Math.cos(exitA + Math.PI / 2) * off * prad * 1.4;
    const hy = py + Math.sin(exitA + Math.PI / 2) * off * prad * 1.4;
    const ea = exitA + off * 0.12;
    const sp = fanSpread * (0.9 + r() * 0.25);
    const ln = fanLen * (0.85 + r() * 0.3);
    drawDispersion(x, P, hx, hy, ea, sp, ln, bandsPerFan, r, 0.9 + r() * 0.25);
  }
  x.restore();

  // ── The prism body ───────────────────────────────────────────────────────
  drawPrism(x, P, px, py, prad, prismRot);

  // ── Caustic ribbons cast onto the ground ─────────────────────────────────
  x.save();
  x.globalCompositeOperation = 'lighter';
  const causticN = p.ground === 'Caustic' ? rint(r, 5, 8) : rint(r, 2, 3);
  for (let i = 0; i < causticN; i++) {
    const t = bandsPerFan > 1 ? i / Math.max(1, causticN - 1) : 0.5;
    const a0 = exitA - fanSpread / 2 + t * fanSpread + randn(r) * 0.1;
    const r0 = fanLen * (0.5 + r() * 0.4);
    const x0 = px + Math.cos(a0) * r0 * 0.4;
    const y0 = py + Math.sin(a0) * r0 * 0.4;
    const x1 = px + Math.cos(a0) * r0;
    const y1 = py + Math.sin(a0) * r0;
    drawCaustic(x, P, x0, y0, x1, y1, S * (0.01 + r() * 0.02), bandHue(P, t), r);
  }
  x.restore();

  // ── Optical-colour mottle in the dispersion zone (divisionist texture) ────
  const mzx = px + Math.cos(exitA) * fanLen * 0.4;
  const mzy = py + Math.sin(exitA) * fanLen * 0.4;
  mottle(x, mzx - S * 0.25, mzy - S * 0.25, S * 0.5, S * 0.5, hsl2hex(bandHue(P, 0.5), P.sat, P.lt), 70, r, 'screen');

  // ── Whole-frame finishing texture ────────────────────────────────────────
  grain(x, W, H, 800, r);
  vignette(x, W, H, 0.38);
}

export const spectraTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const spectraSchema: TraitSchema = {
  traits: [
    { name: 'Palette',   values: PALS.map((p) => p.name) },
    { name: 'Format',    values: ['Square', 'Tall', 'Wide'] },
    { name: 'Placement', values: PLACE },
    { name: 'Beams',     values: BEAMS },
    { name: 'Scale',     values: SCALE },
    { name: 'Ground',    values: GROUNDF },
  ],
};

export const renderSpectra: EngineFn = blit(draw, spectraTraits);

// W/H of Square, Tall, Wide (matches FMTS order).
export const SPECTRA_ASPECTS = [1, 0.77, 1.3] as const;
