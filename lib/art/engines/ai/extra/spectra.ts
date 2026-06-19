// @ts-nocheck
/*
 * SPECTRA — by divisionist-ai. "White light refracted through glass."
 *
 * v3 rebuild (2026-06-19). The prior version had ONE composition: a fan from a
 * single prism near the centre, so every seed read the same. v3 makes
 * COMPOSITION the primary trait. A `Layout` axis selects one of SIX structurally
 * distinct arrangements — each is a different way light meets glass, not the same
 * blob relocated:
 *
 *   1. Corner Prism  — one prism jammed in a corner, a long asymmetric fan
 *                      thrown diagonally across the frame, vast empty space
 *                      opposite. Maximum negative space.
 *   2. Scatter       — 3–7 small prisms on phi / rule-of-thirds points, each
 *                      casting its own little spectrum: a constellation, no hero.
 *   3. Edge Beam     — a collimated beam enters from one edge, strikes an
 *                      off-centre prism, bands sweep across — horizontal /
 *                      diagonal emphasis.
 *   4. Spectral Field— extreme macro: NO discrete prism. The whole frame is
 *                      layered translucent spectrum bands + caustic ribbons as a
 *                      colour field (Rothko-via-prism). Minimal negative space.
 *   5. Stack         — horizontal striated spectral bands stacked like strata: a
 *                      horizon composition.
 *   6. Grid          — a 2×2 / 3×2 grid of prism cells, each a small refraction
 *                      tile: a contact-sheet of light.
 *
 * The art technique is unchanged: ordered spectral bands (violet→red, never a
 * smeared rainbow), soft caustic ribbons, faint glass prism bodies, volumetric
 * haze and grain over an atmospheric indigo ground harmonised with #241a52.
 * Brightness is capped below pure white so colour survives — light through glass,
 * not RGB lasers.
 *
 * Artist lineage: divisionist-ai works in OPTICAL COLOUR — separated, ordered
 * hue bands the eye re-fuses, rather than pre-mixed pigment.
 *
 * Deterministic from tokenId only. ALL trait-determining randomness is drawn in
 * paramsOf() in a FIXED order so traits() and draw() never disagree.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ── Palettes — 10 JEWEL-BRIGHT spectra: refracted light, maximally luminous ──
 * COLOUR IDENTITY: white light split by a prism — the most saturated, high-
 * chroma piece in the set. Brilliant full rainbows + saturated jewel near-monos.
 * span  : which slice of violet(280)→red(0) the prism throws (h0 = violet end,
 *         h1 = red end, walked in order; degrees may wrap through 360/0).
 * sat/lt: HIGH chroma, bright cores — jewel light through glass, not a haze.
 * ground: VARIED — near-black, deep jewel grounds, and a couple bright/misty
 *         light grounds, so a 9-seed sheet shows clearly different schemes.
 * cap   : peak band lightness ceiling (kept <1 so the brightest core glows). */
const PALS = [
  // 1. Prismatic — the textbook full rainbow, now blazing full-chroma.
  { name: 'Prismatic',        ground: '#05030f', h0: 282, h1: 2,   sat: 0.96, lt: 0.62, cap: 0.94, haze: '#5a3fd0', cast: '#8fb0ff' },
  // 2. Solar Flare — amber→orange→scarlet, a molten warm spectrum on near-black.
  { name: 'Solar Flare',      ground: '#0c0400', h0: 58,  h1: 358, sat: 0.98, lt: 0.60, cap: 0.92, haze: '#a8401a', cast: '#ffc24d' },
  // 3. Aqua Prism — cyan→aqua→teal, electric water-light on a deep teal ground.
  { name: 'Aqua Prism',       ground: '#021a26', h0: 196, h1: 150, sat: 0.95, lt: 0.62, cap: 0.94, haze: '#0aa0b8', cast: '#7df0ff' },
  // 4. Sapphire — vivid indigo→blue→azure jewel on a deep sapphire ground.
  { name: 'Sapphire',         ground: '#04103a', h0: 262, h1: 206, sat: 0.95, lt: 0.60, cap: 0.92, haze: '#2a44e0', cast: '#7ea8ff' },
  // 5. Magenta Bloom — violet→magenta→rose, hot pink light on a misty mauve.
  { name: 'Magenta Bloom',    ground: '#2a1340', h0: 300, h1: 344, sat: 0.97, lt: 0.64, cap: 0.94, haze: '#c030a0', cast: '#ff8fe0' },
  // 6. Emerald Prism — chartreuse→emerald→spring-green jewel on deep green.
  { name: 'Emerald Prism',    ground: '#031a10', h0: 95,  h1: 158, sat: 0.96, lt: 0.60, cap: 0.92, haze: '#10b85a', cast: '#7dffc0' },
  // 7. Aurora — full cool-to-warm rainbow (green→aqua→violet→rose) on indigo.
  { name: 'Aurora',           ground: '#0a0628', h0: 150, h1: 330, sat: 0.95, lt: 0.63, cap: 0.94, haze: '#4a30c0', cast: '#90ffd0' },
  // 8. Ruby Garnet — deep crimson→scarlet→ember, garnet jewel on oxblood-black.
  { name: 'Ruby Garnet',      ground: '#160006', h0: 18,  h1: 340, sat: 0.97, lt: 0.58, cap: 0.90, haze: '#c01030', cast: '#ff7060' },
  // 9. Amethyst — bright violet→purple→lilac jewel on a luminous misty lilac.
  { name: 'Amethyst',         ground: '#1a0c33', h0: 278, h1: 312, sat: 0.94, lt: 0.64, cap: 0.94, haze: '#7a30d0', cast: '#c69bff' },
  // 10. Gold Amber — radiant gold→amber→honey on a bright warm misty ground.
  { name: 'Gold Amber',       ground: '#3a2606', h0: 48,  h1: 28,  sat: 0.98, lt: 0.64, cap: 0.95, haze: '#e0a020', cast: '#ffe08a' },
];

/* Formats — real W/H ratios live in SPECTRA_ASPECTS below (same order). */
const FMTS = [
  { W: 1240, H: 1240, t: 'Square' },
  { W: 1000, H: 1300, t: 'Tall' },
  { W: 1300, H: 1000, t: 'Wide' },
];

/* The PRIMARY composition trait — each value is a different draw routine. */
const LAYOUTS = ['Corner Prism', 'Scatter', 'Edge Beam', 'Spectral Field', 'Stack', 'Grid'];

const SCALE  = ['Intimate', 'Standard', 'Expansive']; // hero scale multiplier
const GROUNDF= ['Misted', 'Caustic'];                 // ground finish

/* ── Param draw (FIXED ORDER — Layout FIRST) ──────────────────────────────── */
function paramsOf(r) {
  const layout = pick(LAYOUTS, r);
  const palI   = Math.floor(r() * PALS.length);
  const fmt    = pick(FMTS, r);
  const scale  = pick(SCALE, r);
  const ground = pick(GROUNDF, r);
  return { layout, palI, fmt, scale, ground };
}

function labels(p) {
  return {
    Layout:  p.layout,
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    Scale:   p.scale,
    Ground:  p.ground,
  };
}

/* Ordered spectral hue at parametric t (0=violet end, 1=red end of palette). */
function bandHue(P, t) {
  let a = P.h0, b = P.h1, d = b - a;
  if (d > 180) d -= 360; else if (d < -180) d += 360;
  return a + d * t;
}

/* ── A collimated incoming white beam striking the prism edge ───────────────*/
function drawIncoming(x, P, sx, sy, hx, hy, w, intensity) {
  const g = x.createLinearGradient(sx, sy, hx, hy);
  const wht = mix('#ffffff', P.haze, 1 - P.cap);
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
 * hx,hy = exit point. a = central exit angle. spread = total fan. len = band
 * length. Adjacent filled angular wedges (violet→red) so neighbours touch and
 * form one continuous ordered strip, additive so it re-fuses softly. */
function drawDispersion(x, P, hx, hy, a, spread, len, bands, intensity) {
  const a0 = a - spread / 2;
  for (let b = 0; b < bands; b++) {
    const t0 = b / bands, t1 = (b + 1) / bands;
    const tc = (t0 + t1) / 2;
    const ang0 = a0 + t0 * spread;
    const ang1 = a0 + t1 * spread;
    const hue  = bandHue(P, tc);
    const lt   = Math.min(P.cap, P.lt + 0.07 * Math.cos((tc - 0.5) * Math.PI));
    const col  = hsl2hex(hue, P.sat, lt);
    const l    = len * (0.92 + 0.08 * Math.cos((tc - 0.5) * Math.PI));
    const g = x.createRadialGradient(hx, hy, 0, hx, hy, l);
    g.addColorStop(0,    rgba(mix(col, '#ffffff', 0.22 * P.cap), 0.46 * intensity));
    g.addColorStop(0.12, rgba(col, 0.52 * intensity));
    g.addColorStop(0.55, rgba(col, 0.26 * intensity));
    g.addColorStop(1,    rgba(col, 0.0));
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(hx, hy);
    x.arc(hx, hy, l, ang0, ang1);
    x.closePath();
    x.fill();
  }
  for (let b = 0; b <= bands; b++) {
    const t  = b / bands;
    const ba = a0 + t * spread;
    const hue = bandHue(P, clamp(t, 0, 1));
    const col = hsl2hex(hue, Math.min(1, P.sat + 0.02), Math.min(P.cap, P.lt + 0.10));
    const ex = hx + Math.cos(ba) * len;
    const ey = hy + Math.sin(ba) * len;
    const g = x.createLinearGradient(hx, hy, ex, ey);
    g.addColorStop(0,   rgba(mix(col, '#ffffff', 0.22), 0.34 * intensity));
    g.addColorStop(0.5, rgba(col, 0.22 * intensity));
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
  const col = hsl2hex(hue, P.sat, Math.min(P.cap, P.lt + 0.07));
  const cx = (x0 + x1) / 2 + (r() - 0.5) * (x1 - x0) * 0.4;
  const cy = (y0 + y1) / 2 + (r() - 0.5) * Math.abs(x1 - x0) * 0.5 + Math.abs(y1 - y0) * 0.2;
  const g = x.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0,   rgba(col, 0.0));
  g.addColorStop(0.5, rgba(col, 0.32));
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
  x.strokeStyle = rgba(mix('#ffffff', P.haze, 0.25), 0.4);
  x.lineWidth = Math.max(1.2, rad * 0.02);
  x.stroke();
  x.restore();
}

/* Volumetric haze cone seated at a prism, giving the beams body. */
function hazeCone(x, P, px, py, len, a, spread) {
  x.save();
  x.globalCompositeOperation = 'screen';
  const g = x.createRadialGradient(px, py, 0, px, py, len);
  g.addColorStop(0, rgba(P.haze, 0.18));
  g.addColorStop(0.5, rgba(P.haze, 0.08));
  g.addColorStop(1, rgba(P.haze, 0));
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(px, py);
  x.arc(px, py, len, a - spread * 0.7, a + spread * 0.7);
  x.closePath();
  x.fill();
  x.restore();
}

/* ── One complete refraction unit: incoming shaft + dispersion + prism body.
 * The shared building block every layout composes differently. */
function refractionUnit(x, P, px, py, exitA, fanLen, fanSpread, prad, beamN, r) {
  const inA = exitA + Math.PI + randn(r) * 0.2;
  const prismRot = randn(r) * 1.5;
  const S = fanLen; // local scale reference for line widths

  hazeCone(x, P, px, py, fanLen, exitA, fanSpread);

  // incoming white shafts
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let b = 0; b < beamN; b++) {
    const off = beamN === 1 ? 0 : (b / (beamN - 1) - 0.5);
    const ia  = inA + off * 0.18;
    const dist = fanLen * (0.9 + r() * 0.6);
    const sx = px + Math.cos(ia) * dist;
    const sy = py + Math.sin(ia) * dist;
    const hx = px + Math.cos(exitA + Math.PI / 2) * off * prad * 1.4;
    const hy = py + Math.sin(exitA + Math.PI / 2) * off * prad * 1.4;
    drawIncoming(x, P, sx, sy, hx, hy, Math.max(1.2, prad * 0.14) * (0.7 + r() * 0.6), 0.7 + r() * 0.3);
  }
  x.restore();

  // ordered dispersion fans
  x.save();
  x.globalCompositeOperation = 'lighter';
  const bands = rint(r, 9, 13);
  for (let b = 0; b < beamN; b++) {
    const off = beamN === 1 ? 0 : (b / (beamN - 1) - 0.5);
    const hx = px + Math.cos(exitA + Math.PI / 2) * off * prad * 1.4;
    const hy = py + Math.sin(exitA + Math.PI / 2) * off * prad * 1.4;
    const ea = exitA + off * 0.12;
    const sp = fanSpread * (0.9 + r() * 0.25);
    const ln = fanLen * (0.85 + r() * 0.3);
    drawDispersion(x, P, hx, hy, ea, sp, ln, bands, 0.9 + r() * 0.25);
  }
  x.restore();

  drawPrism(x, P, px, py, prad, prismRot);
  return bands;
}

/* Cast a handful of caustic ribbons from a prism onto the ground. */
function castCaustics(x, P, px, py, exitA, fanSpread, fanLen, n, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const t = n > 1 ? i / (n - 1) : 0.5;
    const a0 = exitA - fanSpread / 2 + t * fanSpread + randn(r) * 0.1;
    const r0 = fanLen * (0.5 + r() * 0.4);
    const x0 = px + Math.cos(a0) * r0 * 0.4;
    const y0 = py + Math.sin(a0) * r0 * 0.4;
    const x1 = px + Math.cos(a0) * r0;
    const y1 = py + Math.sin(a0) * r0;
    drawCaustic(x, P, x0, y0, x1, y1, fanLen * (0.01 + r() * 0.02), bandHue(P, t), r);
  }
  x.restore();
}

/* ── Atmospheric ground common to every layout ──────────────────────────────*/
function paintGround(x, P, W, H, S, r) {
  const bg = x.createLinearGradient(0, 0, W * 0.3, H);
  bg.addColorStop(0,   mix(P.ground, '#ffffff', 0.06));
  bg.addColorStop(0.5, P.ground);
  bg.addColorStop(1,   mix(P.ground, '#000008', 0.5));
  x.fillStyle = bg;
  x.fillRect(0, 0, W, H);

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
}

/* ════════════════════════════════════════════════════════════════════════════
 * THE SIX LAYOUTS
 * ══════════════════════════════════════════════════════════════════════════ */

/* 1. CORNER PRISM — prism jammed in one corner, long asymmetric diagonal fan,
 *    huge negative space opposite. */
function layoutCorner(x, P, W, H, S, sm, gf, r) {
  const cx = r() < 0.5 ? 0.08 : 0.92;
  const cy = r() < 0.5 ? 0.08 : 0.92;
  const px = W * cx, py = H * cy;
  // aim the fan toward the far opposite corner — a long diagonal sweep
  const exitA = Math.atan2((H * (1 - cy) - py) + randn(r) * H * 0.1,
                           (W * (1 - cx) - px) + randn(r) * W * 0.1);
  const prad = S * (0.07 + 0.04 * r()) * sm;
  const fanLen = Math.hypot(W, H) * (0.78 + r() * 0.22) * (0.7 + sm * 0.4);
  const fanSpread = 0.55 + r() * 0.35; // narrow, asymmetric reach
  refractionUnit(x, P, px, py, exitA, fanLen, fanSpread, prad, rint(r, 1, 3), r);
  castCaustics(x, P, px, py, exitA, fanSpread, fanLen, gf === 'Caustic' ? rint(r, 5, 8) : rint(r, 2, 3), r);
}

/* 2. SCATTER — 3–7 small prisms on phi / thirds points, each its own spectrum.
 *    A constellation; no hero. */
function layoutScatter(x, P, W, H, S, sm, gf, r) {
  // candidate anchor points: phi + rule-of-thirds intersections
  const xs = [INVPHI, 1 - INVPHI, 1 / 3, 2 / 3];
  const ys = [INVPHI, 1 - INVPHI, 1 / 3, 2 / 3];
  const pts = [];
  for (const ax of xs) for (const ay of ys) pts.push([ax, ay]);
  // shuffle deterministically and take n
  for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
  const n = rint(r, 3, 7);
  for (let i = 0; i < n; i++) {
    const [ax, ay] = pts[i];
    const px = W * (ax + randn(r) * 0.03);
    const py = H * (ay + randn(r) * 0.03);
    const exitA = r() * Math.PI * 2;           // each points its own way
    const prad = S * (0.025 + 0.03 * r()) * sm; // small
    const fanLen = S * (0.18 + r() * 0.22) * (0.7 + sm * 0.4);
    const fanSpread = 0.5 + r() * 0.6;
    refractionUnit(x, P, px, py, exitA, fanLen, fanSpread, prad, rint(r, 1, 2), r);
    if (gf === 'Caustic') castCaustics(x, P, px, py, exitA, fanSpread, fanLen, rint(r, 2, 4), r);
  }
}

/* 3. EDGE BEAM — beam enters from one edge, strikes an off-centre prism, bands
 *    sweep across. Horizontal / diagonal emphasis. */
function layoutEdgeBeam(x, P, W, H, S, sm, gf, r) {
  const horizontal = r() < 0.6;
  // prism sits off-centre on a phi line
  const px = W * (horizontal ? (r() < 0.5 ? INVPHI : 1 - INVPHI) : (r() < 0.5 ? 0.32 : 0.68));
  const py = H * (horizontal ? (r() < 0.5 ? 0.4 : 0.6) : (r() < 0.5 ? INVPHI : 1 - INVPHI));
  const prad = S * (0.06 + 0.04 * r()) * sm;
  // incoming beam from the near edge; fan sweeps to the far edge
  const fromLeft = px < W * 0.5;
  const fromTop  = py < H * 0.5;
  const exitA = horizontal
    ? (fromLeft ? 0 : Math.PI) + randn(r) * 0.18
    : (fromTop ? Math.PI / 2 : -Math.PI / 2) + randn(r) * 0.18;
  const fanLen = (horizontal ? W : H) * (0.75 + r() * 0.35) * (0.7 + sm * 0.4);
  const fanSpread = 0.35 + r() * 0.3; // tight — a directional sweep, not a wide cone

  // a strong collimated entry beam across the whole near side
  x.save();
  x.globalCompositeOperation = 'lighter';
  const inA = exitA + Math.PI;
  const sx = px + Math.cos(inA) * (horizontal ? W : H) * 0.9;
  const sy = py + Math.sin(inA) * (horizontal ? W : H) * 0.9;
  drawIncoming(x, P, sx, sy, px, py, Math.max(2, prad * 0.2), 0.85 + r() * 0.15);
  x.restore();

  refractionUnit(x, P, px, py, exitA, fanLen, fanSpread, prad, rint(r, 2, 4), r);
  castCaustics(x, P, px, py, exitA, fanSpread, fanLen, gf === 'Caustic' ? rint(r, 6, 9) : rint(r, 3, 4), r);
}

/* 4. SPECTRAL FIELD — extreme macro, NO discrete prism. Layered translucent
 *    spectrum bands + caustic ribbons fill the frame as a colour field. */
function layoutField(x, P, W, H, S, sm, gf, r) {
  const diag = Math.hypot(W, H);
  // broad overlapping spectral wedges from points pushed off-frame, so the bands
  // read as huge slices crossing the whole canvas with no visible apex.
  const passes = rint(r, 3, 5);
  for (let i = 0; i < passes; i++) {
    const side = rint(r, 0, 3);
    let px, py, a;
    if (side === 0)      { px = -diag * 0.3; py = H * (0.2 + r() * 0.6); a = 0; }
    else if (side === 1) { px = W + diag * 0.3; py = H * (0.2 + r() * 0.6); a = Math.PI; }
    else if (side === 2) { px = W * (0.2 + r() * 0.6); py = -diag * 0.3; a = Math.PI / 2; }
    else                 { px = W * (0.2 + r() * 0.6); py = H + diag * 0.3; a = -Math.PI / 2; }
    a += randn(r) * 0.4;
    const len = diag * (1.1 + r() * 0.5);
    const spread = 0.5 + r() * 0.5;
    x.save();
    x.globalCompositeOperation = 'lighter';
    drawDispersion(x, P, px, py, a, spread, len, rint(r, 7, 11), 0.62 + r() * 0.22);
    x.restore();
  }
  // a dense wash of long caustic ribbons across the frame to fill negative space
  x.save();
  x.globalCompositeOperation = 'lighter';
  const ribbons = rint(r, 14, 22);
  for (let i = 0; i < ribbons; i++) {
    const t = i / (ribbons - 1);
    const y = H * (0.05 + 0.9 * t) + randn(r) * H * 0.05;
    const x0 = -W * 0.1, x1 = W * 1.1;
    drawCaustic(x, P, x0, y + randn(r) * H * 0.06, x1, y + randn(r) * H * 0.06,
                H * (0.02 + r() * 0.05), bandHue(P, clamp(t + randn(r) * 0.1, 0, 1)), r);
  }
  x.restore();
  // soft full-frame colour bloom so it reads as a saturated field, not lines
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < 3; i++) {
    const hue = bandHue(P, r());
    const fx = W * r(), fy = H * r(), fr = diag * (0.4 + r() * 0.4);
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, fr);
    g.addColorStop(0, rgba(hsl2hex(hue, P.sat, P.lt), 0.22));
    g.addColorStop(1, rgba(hsl2hex(hue, P.sat, P.lt), 0));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
  }
  x.restore();
}

/* 5. STACK — horizontal striated spectral bands stacked like strata: a horizon
 *    composition. */
function layoutStack(x, P, W, H, S, sm, gf, r) {
  const n = rint(r, 7, 13);
  // uneven strata heights so it's geological, not a flat gradient
  const weights = [];
  let total = 0;
  for (let i = 0; i < n; i++) { const w = 0.5 + r(); weights.push(w); total += w; }
  let y = 0;
  for (let i = 0; i < n; i++) {
    const h = (weights[i] / total) * H;
    const t = i / (n - 1);
    const hue = bandHue(P, t);
    const lt = Math.min(P.cap, P.lt + 0.05 * Math.cos((t - 0.5) * Math.PI));
    const col = hsl2hex(hue, P.sat, lt);
    // each stratum: a horizontal translucent band with a soft glow seam
    const g = x.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0,   rgba(col, 0.48));
    g.addColorStop(0.5, rgba(col, 0.28));
    g.addColorStop(1,   rgba(mix(col, P.ground, 0.4), 0.16));
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = g;
    x.fillRect(0, y, W, h + 1);
    // bright seam at the top edge of the stratum
    const sg = x.createLinearGradient(0, 0, W, 0);
    sg.addColorStop(0,   rgba(mix(col, '#ffffff', 0.2), 0.0));
    sg.addColorStop(0.5, rgba(mix(col, '#ffffff', 0.3), 0.22));
    sg.addColorStop(1,   rgba(mix(col, '#ffffff', 0.2), 0.0));
    x.strokeStyle = sg;
    x.lineWidth = Math.max(1, H * 0.0025);
    x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke();
    x.restore();
    y += h;
  }
  // a few long horizontal caustic ribbons drifting across the strata
  if (gf === 'Caustic') {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const rib = rint(r, 4, 7);
    for (let i = 0; i < rib; i++) {
      const yy = H * (0.1 + r() * 0.8);
      drawCaustic(x, P, -W * 0.1, yy, W * 1.1, yy + randn(r) * H * 0.04,
                  H * (0.01 + r() * 0.03), bandHue(P, r()), r);
    }
    x.restore();
  }
}

/* 6. GRID — a 2×2 / 3×2 grid of prism cells, each a small refraction tile. */
function layoutGrid(x, P, W, H, S, sm, gf, r) {
  const cols = r() < 0.5 ? 2 : 3;
  const rows = 2;
  const pad = Math.min(W, H) * 0.06;
  const cw = (W - pad * 2) / cols;
  const ch = (H - pad * 2) / rows;
  for (let cyi = 0; cyi < rows; cyi++) {
    for (let cxi = 0; cxi < cols; cxi++) {
      const x0 = pad + cxi * cw, y0 = pad + cyi * ch;
      // a faint cell frame so it reads as a contact sheet
      x.save();
      x.globalCompositeOperation = 'screen';
      x.strokeStyle = rgba(P.haze, 0.18);
      x.lineWidth = Math.max(1, S * 0.0015);
      x.strokeRect(x0, y0, cw, ch);
      x.restore();
      // prism anchored off the cell's own phi point, fan kept inside the cell
      const ph = r() < 0.5 ? INVPHI : 1 - INVPHI;
      const pv = r() < 0.5 ? INVPHI : 1 - INVPHI;
      const px = x0 + cw * ph;
      const py = y0 + ch * pv;
      const exitA = r() * Math.PI * 2;
      const cellS = Math.min(cw, ch);
      const prad = cellS * (0.07 + 0.05 * r()) * (0.7 + sm * 0.4);
      const fanLen = cellS * (0.55 + r() * 0.35);
      const fanSpread = 0.6 + r() * 0.6;
      // clip the refraction to its tile
      x.save();
      x.beginPath();
      x.rect(x0, y0, cw, ch);
      x.clip();
      refractionUnit(x, P, px, py, exitA, fanLen, fanSpread, prad, rint(r, 1, 2), r);
      if (gf === 'Caustic') castCaustics(x, P, px, py, exitA, fanSpread, fanLen, rint(r, 2, 3), r);
      x.restore();
    }
  }
}

/* ── Master draw ─────────────────────────────────────────────────────────── */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);
  const sm = p.scale === 'Intimate' ? 0.45 : p.scale === 'Standard' ? 0.85 : 1.3;

  paintGround(x, P, W, H, S, r);

  switch (p.layout) {
    case 'Corner Prism':   layoutCorner(x, P, W, H, S, sm, p.ground, r); break;
    case 'Scatter':        layoutScatter(x, P, W, H, S, sm, p.ground, r); break;
    case 'Edge Beam':      layoutEdgeBeam(x, P, W, H, S, sm, p.ground, r); break;
    case 'Spectral Field': layoutField(x, P, W, H, S, sm, p.ground, r); break;
    case 'Stack':          layoutStack(x, P, W, H, S, sm, p.ground, r); break;
    case 'Grid':           layoutGrid(x, P, W, H, S, sm, p.ground, r); break;
  }

  // optical-colour mottle (divisionist texture), placed for the active layout
  const mzx = W * (0.3 + r() * 0.4), mzy = H * (0.3 + r() * 0.4);
  mottle(x, mzx - S * 0.25, mzy - S * 0.25, S * 0.5, S * 0.5,
         hsl2hex(bandHue(P, 0.5), P.sat, P.lt), 70, r, 'screen');

  // whole-frame finishing texture
  grain(x, W, H, 800, r);
  vignette(x, W, H, p.layout === 'Spectral Field' ? 0.30 : 0.38);
}

export const spectraTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const spectraSchema: TraitSchema = {
  traits: [
    { name: 'Layout',  values: LAYOUTS },
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format',  values: ['Square', 'Tall', 'Wide'] },
    { name: 'Scale',   values: SCALE },
    { name: 'Ground',  values: GROUNDF },
  ],
};

export const renderSpectra: EngineFn = blit(draw, spectraTraits);

// W/H of Square, Tall, Wide (matches FMTS order).
export const SPECTRA_ASPECTS = [1, 0.77, 1.3] as const;
