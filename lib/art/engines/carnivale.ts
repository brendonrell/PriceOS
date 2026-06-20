// @ts-nocheck
/*
 * CARNIVALE — by @opus4-8. "A whole festival in a single frame."
 *
 * A teeming night carnival: a giant glowing Ferris wheel over a packed crowd,
 * fireworks blooming in a dusk-to-night sky, swooping strings of lanterns, a
 * central bonfire/stage glow, floating paper lanterns, confetti and drifting
 * embers, reflections on wet ground. A POPULATED SCENE — a celebration, not a
 * texture. Layered strictly back-to-front with atmospheric perspective
 * (distant = hazier/lighter, near = darker/saturated).
 *
 * VARIETY is structural. Independent trait axes recombine into thousands of
 * distinct nights:
 *   - Festival/Time : Dusk Opening / Golden Hour / Midnight Peak /
 *                     Firework Finale / Lantern Release / Storm-broken
 *   - Palette       : 10 named saturated schemes (Festa Italiana, Diwali Gold,
 *                     Carnaval Rio, Neon Fair, Hanabi, Mardi Gras, Midsummer,
 *                     Lunar Red, Aurora Fair, Bayou Lantern)
 *   - Layout/Camera : Wheel Left / Wheel Right / Wheel Centre Distant /
 *                     Midway Row / Waterfront / Hilltop Overlook
 *   - Crowd         : Intimate / Gathering / Throng / Massive
 *   - Foreground    : Crowd / Market Stalls / Waterfront Railing /
 *                     Hillside Seating / Lantern Sellers / Stage Front
 *   - Fireworks     : None / Early / Bursting / Finale Barrage
 *   - Format        : Square / Tall / Wide
 *
 * Deterministic from tokenId only. ALL trait-determining randomness is drawn in
 * paramsOf() in a FIXED order so traits() and draw() never disagree.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, PHI, INVPHI, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

/* ── Palettes — 10 saturated festival schemes ───────────────────────────────
 * skyTop/skyBot : dusk-to-night vertical gradient (overridden per Time below).
 * glow          : the warm ambient festival glow on the ground/crowd.
 * hues          : the firework / lantern / light hue wheel (saturated picks).
 * wheel         : the hero structure's rim-light hue family.
 * accent        : bright signature pop used on bunting/flags. */
const PALS = [
  { name: 'Festa Italiana', skyTop: '#1a0d3a', skyBot: '#5e2a5c', glow: '#ffb24d', hues: [8, 30, 145, 210, 350], wheel: 145, accent: '#ff4d5e' },
  { name: 'Diwali Gold',    skyTop: '#200a2e', skyBot: '#7a3410', glow: '#ffcf5c', hues: [38, 18, 320, 285, 50],  wheel: 40,  accent: '#ff7a1a' },
  { name: 'Carnaval Rio',   skyTop: '#160a40', skyBot: '#6e1f5e', glow: '#ffd14d', hues: [52, 140, 320, 200, 8],  wheel: 52,  accent: '#19e08a' },
  { name: 'Neon Fair',      skyTop: '#0a0820', skyBot: '#2a1060', glow: '#ff5cc8', hues: [300, 195, 330, 165, 50], wheel: 300, accent: '#22e6ff' },
  { name: 'Hanabi',         skyTop: '#08081f', skyBot: '#241653', glow: '#ff7a9c', hues: [350, 200, 145, 285, 38], wheel: 200, accent: '#ffd84d' },
  { name: 'Mardi Gras',     skyTop: '#170a36', skyBot: '#3a1466', glow: '#c9a227', hues: [285, 52, 145, 320, 195], wheel: 285, accent: '#ffd33a' },
  { name: 'Midsummer',      skyTop: '#241a4a', skyBot: '#9c5a3a', glow: '#ffb866', hues: [40, 18, 320, 150, 200],  wheel: 40,  accent: '#ff5c7a' },
  { name: 'Lunar Red',      skyTop: '#200620', skyBot: '#7a0e22', glow: '#ffb13a', hues: [8, 38, 0, 345, 50],      wheel: 8,   accent: '#ffd23a' },
  { name: 'Aurora Fair',    skyTop: '#04122e', skyBot: '#0a4a52', glow: '#7affd6', hues: [160, 200, 285, 330, 50], wheel: 165, accent: '#ff66cc' },
  { name: 'Bayou Lantern',  skyTop: '#0a0c22', skyBot: '#243a18', glow: '#ffc24d', hues: [40, 18, 150, 200, 320],  wheel: 45,  accent: '#ff8a3a' },
];

/* Formats — real W/H ratios live in CARNIVALE_ASPECTS below (same order). */
const FMTS = [
  { W: 1240, H: 1240, t: 'Square' },
  { W: 1000, H: 1320, t: 'Tall' },
  { W: 1340, H: 1000, t: 'Wide' },
];

const TIMES = ['Dusk Opening', 'Golden Hour', 'Midnight Peak', 'Firework Finale', 'Lantern Release', 'Storm-broken'];
const LAYOUTS = ['Wheel Left', 'Wheel Right', 'Wheel Centre Distant', 'Midway Row', 'Waterfront', 'Hilltop Overlook'];
const CROWDS = ['Intimate', 'Gathering', 'Throng', 'Massive'];
const FGROUNDS = ['Crowd', 'Market Stalls', 'Waterfront Railing', 'Hillside Seating', 'Lantern Sellers', 'Stage Front'];
const FWORKS = ['None', 'Early', 'Bursting', 'Finale Barrage'];
/* Frame — an artful presentation treatment so each output reads as a PIECE, not
 * a snapshot. Subtle by design: it elevates, never gimmicks. */
const FRAMES = ['None', 'Matte', 'Film Border', 'Inner Glow Vignette'];

/* Per-Time atmosphere overrides — sky tint blend, star density, haze. */
const TIME_CFG = {
  'Dusk Opening':    { blend: 0.0,  star: 0.3, hazeL: 0.30, skyMul: 1.05 },
  'Golden Hour':     { blend: 0.0,  star: 0.15, hazeL: 0.42, skyMul: 1.18, warmTop: '#3a1a4a', warmBot: '#c2702a' },
  'Midnight Peak':   { blend: 0.55, star: 1.0, hazeL: 0.16, skyMul: 0.82 },
  'Firework Finale': { blend: 0.35, star: 0.7, hazeL: 0.22, skyMul: 0.92 },
  'Lantern Release': { blend: 0.30, star: 0.85, hazeL: 0.24, skyMul: 0.9 },
  'Storm-broken':    { blend: 0.45, star: 0.4, hazeL: 0.20, skyMul: 0.86, storm: true },
};

/* ── Param draw (FIXED ORDER) ───────────────────────────────────────────────*/
function paramsOf(r) {
  const time   = pick(TIMES, r);
  const palI   = Math.floor(r() * PALS.length);
  const layout = pick(LAYOUTS, r);
  const crowd  = pick(CROWDS, r);
  // foreground is its own axis (fixes the "same crowd row every frame" read);
  // the Waterfront camera biases toward its railing, but every value is reachable.
  let fground;
  if (layout === 'Waterfront') fground = r() < 0.55 ? 'Waterfront Railing' : pick(FGROUNDS, r);
  else if (layout === 'Hilltop Overlook') fground = r() < 0.4 ? 'Hillside Seating' : pick(FGROUNDS, r);
  else fground = pick(FGROUNDS, r);
  // fireworks correlate loosely with time but remain an independent trait
  let fwork;
  if (time === 'Firework Finale') fwork = r() < 0.7 ? 'Finale Barrage' : 'Bursting';
  else if (time === 'Golden Hour') fwork = r() < 0.6 ? 'None' : 'Early';
  else fwork = pick(FWORKS, r);
  const fmt    = pick(FMTS, r);
  // Frame is drawn LAST so it never perturbs the existing random sequence —
  // every prior axis (and every draw() consumer) keeps its exact stream.
  const frame  = pick(FRAMES, r);
  return { time, palI, layout, crowd, fground, fwork, fmt, frame };
}

function labels(p) {
  return {
    Time:       p.time,
    Palette:    PALS[p.palI].name,
    Camera:     p.layout,
    Crowd:      p.crowd,
    Foreground: p.fground,
    Fireworks:  p.fwork,
    Format:     p.fmt.t,
    Frame:      p.frame,
  };
}

/* ── small helpers ─────────────────────────────────────────────────────────*/
function softGlow(x, gx, gy, rad, col, a0) {
  const g = x.createRadialGradient(gx, gy, 0, gx, gy, rad);
  g.addColorStop(0, rgba(col, a0));
  g.addColorStop(0.4, rgba(col, a0 * 0.45));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.beginPath(); x.arc(gx, gy, rad, 0, Math.PI * 2); x.fill();
}
function dot(x, gx, gy, rad, col, a) {
  x.fillStyle = rgba(col, a);
  x.beginPath(); x.arc(gx, gy, rad, 0, Math.PI * 2); x.fill();
}

/* ── DEPTH OF FIELD: bokeh orbs (near, out of focus) + crisp distant lights ──
 * A photographic bokeh disc: a soft translucent fill, a brighter rim ("ring
 * bokeh", the optical signature of an out-of-focus highlight), palette-coloured.
 * Drawn big in the near foreground so the eye reads true depth past the sharp
 * midground wheel. */
function bokehOrb(x, bx, by, rad, col, a) {
  x.save();
  x.globalCompositeOperation = 'screen';
  // soft body
  const g = x.createRadialGradient(bx, by, 0, bx, by, rad);
  g.addColorStop(0,    rgba(col, a * 0.5));
  g.addColorStop(0.62, rgba(col, a * 0.32));
  g.addColorStop(0.82, rgba(mix(col, '#ffffff', 0.25), a * 0.5));   // brighter ring
  g.addColorStop(0.92, rgba(col, a * 0.28));
  g.addColorStop(1,    rgba(col, 0));
  x.fillStyle = g;
  x.beginPath(); x.arc(bx, by, rad, 0, Math.PI * 2); x.fill();
  x.restore();
}
/* Foreground bokeh field — a few large out-of-focus orbs at the very front,
 * clustered low/sides so they frame rather than cover the scene. */
function bokehForeground(x, P, W, H, n, r) {
  for (let i = 0; i < n; i++) {
    // bias toward the lower third and the side edges (true near foreground)
    const edge = r() < 0.5 ? r() * 0.28 : 0.72 + r() * 0.28;
    const bx = (r() < 0.45 ? edge : r()) * W;
    const by = H * (0.55 + r() * 0.45);
    const rad = Math.min(W, H) * (0.055 + r() * 0.1);
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    bokehOrb(x, bx, by, rad, hsl2hex(hue, 0.8, 0.62), 0.46 + r() * 0.3);
  }
}
/* Tiny crisp distant lights high in the scene — the sharp counterpoint to the
 * soft near bokeh, completing the depth read. */
function distantSparkle(x, P, W, hY, n, r) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const sx = r() * W, sy = hY * (0.2 + r() * 0.7);
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    dot(x, sx, sy, 0.6 + r() * 0.7, hsl2hex(hue, 0.75, 0.7), 0.4 + r() * 0.4);
  }
  x.restore();
}

/* ── VOLUMETRIC GOD-RAYS from a bright source ───────────────────────────────
 * Soft radial light shafts fanning up/out from a hub, additively blended, so a
 * bright source bleeds visible beams into the hazy air. */
function godRays(x, cx, cy, len, baseA, n, col, spreadA, r) {
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const a = baseA + (i / Math.max(1, n - 1) - 0.5) * spreadA + randn(r) * 0.04;
    const ln = len * (0.7 + r() * 0.6);
    const ex = cx + Math.cos(a) * ln, ey = cy + Math.sin(a) * ln;
    const g = x.createLinearGradient(cx, cy, ex, ey);
    g.addColorStop(0, rgba(col, 0.16 * (0.6 + r() * 0.6)));
    g.addColorStop(0.5, rgba(col, 0.06));
    g.addColorStop(1, rgba(col, 0));
    x.strokeStyle = g; x.lineWidth = len * (0.02 + r() * 0.04); x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(ex, ey); x.stroke();
  }
  x.restore();
}

/* ── DRIFTING EMBERS / DUST MOTES catching light ────────────────────────────
 * Glowing motes scattered through the air with bloom — bright sparks low (near
 * the heat) thinning upward, plus fainter floating dust. Adds ambiance + air. */
function emberMotes(x, P, W, H, hY, n, r) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    // weight toward the lower scene (rising from the festival) but reach the sky
    const ey = H * (0.2 + Math.pow(r(), 0.7) * 0.78);
    const ex = r() * W;
    const heat = 1 - (ey / H);                       // higher = cooler/dimmer
    const warm = r() < 0.6;
    const hue = warm ? 25 + r() * 25 : P.hues[rint(r, 0, P.hues.length - 1)];
    const col = hsl2hex(hue, 0.85, 0.62);
    const s = Math.min(W, H) * (0.0012 + r() * 0.0028) * (0.7 + heat * 0.8);
    softGlow(x, ex, ey, s * 4.5, col, 0.18 + heat * 0.25);
    dot(x, ex, ey, s, mix(col, '#fff7e0', 0.4), 0.6 + r() * 0.35);
  }
  x.restore();
}

/* ── SKY: dusk-to-night gradient + stars + smoke ───────────────────────────*/
function paintSky(x, P, W, H, hY, tc, r) {
  let top = P.skyTop, bot = P.skyBot;
  if (tc.warmTop) { top = tc.warmTop; bot = tc.warmBot; }
  top = mix(top, '#000010', tc.blend * 0.8);
  bot = mix(bot, '#000010', tc.blend * 0.3);
  const g = x.createLinearGradient(0, 0, 0, hY);
  g.addColorStop(0, top);
  g.addColorStop(0.55, mix(top, bot, 0.6));
  g.addColorStop(1, bot);
  x.fillStyle = g;
  x.fillRect(0, 0, W, hY + 2);

  // stars
  const nStars = Math.floor(W * hY / 2600 * tc.star);
  for (let i = 0; i < nStars; i++) {
    const sx = r() * W, sy = r() * hY * 0.92;
    const fade = 1 - sy / (hY); // fewer near horizon glow
    const a = (0.25 + r() * 0.6) * fade;
    const s = r() < 0.12 ? 1.6 : 0.9;
    dot(x, sx, sy, s, r() < 0.2 ? '#fff4d0' : '#ffffff', a);
  }
  // a couple of soft drifting smoke clouds (firework residue catching glow)
  x.save();
  x.globalCompositeOperation = 'screen';
  const sm = rint(r, 2, 4);
  for (let i = 0; i < sm; i++) {
    const cx = W * (0.15 + r() * 0.7), cy = hY * (0.12 + r() * 0.5);
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    softGlow(x, cx, cy, Math.min(W, hY) * (0.18 + r() * 0.2), hsl2hex(hue, 0.5, 0.5), 0.07);
  }
  x.restore();
}

/* ── FIREWORKS ─────────────────────────────────────────────────────────────*/
function fireworkBurst(x, P, cx, cy, rad, hue, kind, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const col = hsl2hex(hue, 0.95, 0.62);
  const core = hsl2hex(hue, 0.7, 0.85);
  // central flash glow
  softGlow(x, cx, cy, rad * 1.25, col, 0.5);
  softGlow(x, cx, cy, rad * 0.45, core, 0.7);

  const n = kind === 'willow' ? rint(r, 36, 54) : rint(r, 60, 100);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + r() * 0.05;
    const rr = rad * (0.72 + r() * 0.3);
    const ex = cx + Math.cos(a) * rr;
    let ey = cy + Math.sin(a) * rr;
    if (kind === 'willow') ey += rad * (0.25 + r() * 0.5); // droop
    const g = x.createLinearGradient(cx, cy, ex, ey);
    g.addColorStop(0, rgba(core, 0.0));
    g.addColorStop(0.55, rgba(col, 0.85));
    g.addColorStop(1, rgba(mix(col, '#ffffff', 0.3), 0.95));
    x.strokeStyle = g;
    x.lineWidth = 1.1 + r() * 1.3;
    x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(ex, ey); x.stroke();
    // bright spark tip + occasional secondary crackle
    dot(x, ex, ey, 1.0 + r() * 1.4, '#fffbe8', 0.9);
    if (kind === 'crackle' && r() < 0.5) {
      for (let k = 0; k < 3; k++) {
        const a2 = a + (r() - 0.5) * 0.8;
        const r2 = rad * (0.1 + r() * 0.18);
        dot(x, ex + Math.cos(a2) * r2, ey + Math.sin(a2) * r2, 0.8 + r() * 1.0, core, 0.7);
      }
    }
  }
  x.restore();
}
function fireworkRising(x, P, x0, y0, x1, y1, hue, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const col = hsl2hex(hue, 0.9, 0.6);
  const g = x.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, rgba(col, 0));
  g.addColorStop(0.7, rgba(col, 0.5));
  g.addColorStop(1, rgba('#fffbe8', 0.95));
  x.strokeStyle = g; x.lineWidth = 2; x.lineCap = 'round';
  x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
  dot(x, x1, y1, 2.2, '#fffbe8', 0.95);
  x.restore();
}
function paintFireworks(x, P, W, hY, mode, r) {
  if (mode === 'None') return;
  const counts = { Early: [1, 2], Bursting: [3, 5], 'Finale Barrage': [6, 10] };
  const [a, b] = counts[mode];
  const n = rint(r, a, b);
  const kinds = ['chrys', 'chrys', 'willow', 'crackle'];
  for (let i = 0; i < n; i++) {
    const cx = W * (0.08 + r() * 0.84);
    const cy = hY * (0.08 + r() * 0.52);
    const rad = Math.min(W, hY) * (0.07 + r() * 0.14) * (mode === 'Finale Barrage' ? 1.05 : 1.0);
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    fireworkBurst(x, P, cx, cy, rad, hue, pick(kinds, r), r);
  }
  // a few rising trails toward fresh shells
  const trails = mode === 'Finale Barrage' ? rint(r, 3, 5) : rint(r, 1, 3);
  for (let i = 0; i < trails; i++) {
    const bx = W * (0.1 + r() * 0.8);
    const by = hY * (0.5 + r() * 0.4);
    const tx = bx + randn(r) * W * 0.04;
    const ty = by - hY * (0.18 + r() * 0.22);
    fireworkRising(x, P, bx, by, tx, ty, P.hues[rint(r, 0, P.hues.length - 1)], r);
  }
}

/* ── FERRIS WHEEL — the hero "wow" trick ───────────────────────────────────
 * A long-exposure photograph of a night-fair wheel, NOT a bicycle-wheel icon.
 * Built in dimensional layers:
 *   - slight PERSPECTIVE: the rim is a foreshortened ellipse (squashed
 *     vertically + tilted) so the wheel has a face, not a flat coin.
 *   - the headline LONG-EXPOSURE LIGHT-TRAIL: several concentric translucent
 *     glowing arcs swept around the rim, additively blended, colour-cycling
 *     through the palette — light caught spinning on camera.
 *   - layered rim glow (wide soft halo + bright core), per-cabin bulbs with
 *     bloom, luminous gradient spokes, and a bright hub with a lens-flare
 *     starburst. Everything bleeds light into the air around it. */
function ferrisWheel(x, P, cx, cy, R, rimHue, glowCol, r) {
  const spokes = rint(r, 16, 22);
  const rot = r() * Math.PI * 2;
  const rimCol = hsl2hex(rimHue, 0.9, 0.62);
  // The wheel stays a TRUE CIRCLE — keep the spin light-trail, no foreshortening,
  // no tilt (an oval reads wrong). Consume the same two randoms the old perspective
  // used so the rest of the scene composition is pixel-identical.
  r(); r();
  const sy = 1;                           // circle (no vertical squash)
  const tilt = 0;                         // no axial tilt
  // map a wheel angle to a screen point on the perspective ellipse.
  const pt = (ang, rad) => {
    const ux = Math.cos(ang) * rad, uy = Math.sin(ang) * rad * sy;
    return [cx + ux * Math.cos(tilt) - uy * Math.sin(tilt),
            cy + ux * Math.sin(tilt) + uy * Math.cos(tilt)];
  };

  // 1. wide ambient bloom behind the wheel — it lights the air around it.
  x.save();
  x.globalCompositeOperation = 'screen';
  softGlow(x, cx, cy, R * 1.9, glowCol, 0.14);
  softGlow(x, cx, cy, R * 1.15, hsl2hex(rimHue, 0.6, 0.5), 0.12);
  x.restore();

  // 2. support legs (A-frame) to the ground — drawn under the light so the
  //    structure reads as real steel before the light is painted on it.
  x.strokeStyle = rgba('#0a0a12', 0.92);
  x.lineWidth = Math.max(2, R * 0.03);
  x.lineCap = 'round';
  const baseY = cy + R * sy * 1.16;
  for (const dx of [-R * 0.5, R * 0.5]) {
    x.beginPath(); x.moveTo(cx + dx, baseY); x.lineTo(cx, cy); x.stroke();
    x.beginPath(); x.moveTo(cx + dx * 0.45, baseY); x.lineTo(cx, cy); x.stroke();
  }

  // 3. THE LONG-EXPOSURE LIGHT-TRAIL — the headline trick. MANY fine concentric
  //    arcs packed across the whole disc, each sweeping a different fraction of
  //    the way round, colour-cycling through the palette, additively blended —
  //    the smear a camera records when the wheel spins under a long shutter. The
  //    density (not the count) is what sells "light caught spinning on camera".
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.lineCap = 'round';
  const trails = rint(r, 16, 22);
  for (let tIdx = 0; tIdx < trails; tIdx++) {
    const tf = tIdx / Math.max(1, trails - 1);
    const rr = R * (0.16 + 0.86 * tf);                 // fill from hub out past the rim
    const hue = P.hues[tIdx % P.hues.length];
    // bright cores cycle warm→hue; brightness rises toward the rim where bulbs are
    const tcol = hsl2hex(hue, 0.9, 0.58);
    const a0 = rot * 0.5 + tIdx * 1.7 + r() * 1.2;
    const sweep = Math.PI * (1.1 + r() * 0.9);         // each trail a different arc length
    const segs = 110;
    // a soft fat halo ribbon + a bright thin core, both comet-faded along length.
    for (const pass of [{ w: R * 0.03, a: 0.07 }, { w: R * 0.012, a: 0.13 }, { w: R * 0.004, a: 0.4 }]) {
      x.lineWidth = Math.max(0.6, pass.w);
      x.beginPath();
      for (let s = 0; s <= segs; s++) {
        const ang = a0 + (s / segs) * sweep;
        const [px, py] = pt(ang, rr);
        if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      const [sx0, sy0] = pt(a0, rr);
      const [sx1, sy1] = pt(a0 + sweep, rr);
      const g = x.createLinearGradient(sx0, sy0, sx1, sy1);
      g.addColorStop(0,    rgba(tcol, 0));               // comet tail fades in
      g.addColorStop(0.12, rgba(tcol, pass.a * 0.5));
      g.addColorStop(0.75, rgba(mix(tcol, '#ffffff', 0.2), pass.a));
      g.addColorStop(1,    rgba(mix(tcol, '#ffffff', 0.55), pass.a * 1.3)); // bright leading head
      x.strokeStyle = g;
      x.stroke();
    }
  }
  x.restore();

  // 4. spokes — fine luminous gradient lines from hub to rim.
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < spokes; i++) {
    const a = rot + (i / spokes) * Math.PI * 2;
    const [ex, ey] = pt(a, R);
    const g = x.createLinearGradient(cx, cy, ex, ey);
    g.addColorStop(0, rgba(rimCol, 0.18));
    g.addColorStop(0.7, rgba(rimCol, 0.4));
    g.addColorStop(1, rgba(mix(rimCol, '#ffffff', 0.3), 0.7));
    x.strokeStyle = g; x.lineWidth = Math.max(0.8, R * 0.006);
    x.beginPath(); x.moveTo(cx, cy); x.lineTo(ex, ey); x.stroke();
  }
  x.restore();

  // 5. the rim itself — a layered glow: wide soft halo arc + bright core arc,
  //    drawn as the perspective ellipse.
  x.save();
  x.globalCompositeOperation = 'lighter';
  const ellipse = (rad, w, col, a) => {
    x.lineWidth = Math.max(1, w);
    x.strokeStyle = rgba(col, a);
    x.beginPath();
    const segs = 96;
    for (let s = 0; s <= segs; s++) {
      const [px, py] = pt((s / segs) * Math.PI * 2, rad);
      if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.stroke();
  };
  ellipse(R,        R * 0.07,  rimCol, 0.14);                       // wide soft halo
  ellipse(R,        R * 0.022, mix(rimCol, '#fff', 0.2), 0.55);     // bright core
  ellipse(R * 0.9,  R * 0.014, rimCol, 0.4);                        // inner rail
  x.restore();

  // 6. per-cabin glowing bulbs with bloom halos around the rim.
  x.save();
  x.globalCompositeOperation = 'lighter';
  const bulbs = spokes * 3;
  for (let i = 0; i < bulbs; i++) {
    const a = (i / bulbs) * Math.PI * 2;
    const [bx, by] = pt(a, R);
    const hue = (i % 4 === 0) ? P.hues[i % P.hues.length] : rimHue;
    const bcol = hsl2hex(hue, 0.85, 0.72);
    softGlow(x, bx, by, R * 0.045, bcol, 0.5);
    dot(x, bx, by, Math.max(1.2, R * 0.014), mix(bcol, '#ffffff', 0.5), 0.95);
  }
  x.restore();

  // 7. cabins at spoke ends — a bloom halo, a dark gondola body, a lit window.
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < spokes; i++) {
    const a = rot + (i / spokes) * Math.PI * 2;
    const [bx, by] = pt(a, R * 0.97);
    const hue = P.hues[i % P.hues.length];
    softGlow(x, bx, by, R * 0.12, hsl2hex(hue, 0.9, 0.6), 0.4);
  }
  x.restore();
  for (let i = 0; i < spokes; i++) {
    const a = rot + (i / spokes) * Math.PI * 2;
    const [bx, by] = pt(a, R * 0.97);
    const cs = R * 0.05;
    x.fillStyle = rgba('#120c18', 0.72);
    x.beginPath(); x.arc(bx, by + cs * 0.3, cs, 0, Math.PI * 2); x.fill();
    x.fillStyle = rgba(hsl2hex(P.hues[i % P.hues.length], 0.82, 0.62), 0.85);
    x.fillRect(bx - cs * 0.6, by - cs * 0.15, cs * 1.2, cs * 0.7);
  }

  // 8. volumetric god-rays fanning up/out from the hub into the hazy air.
  godRays(x, cx, cy, R * 1.7, -Math.PI / 2, 9, mix(rimCol, '#ffffff', 0.3), Math.PI * 1.1, r);

  // 9. the HUB — a bright glowing core with a soft lens-flare starburst.
  x.save();
  x.globalCompositeOperation = 'lighter';
  softGlow(x, cx, cy, R * 0.34, mix(rimCol, '#ffffff', 0.4), 0.5);
  softGlow(x, cx, cy, R * 0.12, '#fff7e0', 0.7);
  // starburst spikes (lens flare)
  const flareCol = mix(rimCol, '#ffffff', 0.5);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI / 2 + tilt;
    const len = R * (k % 2 === 0 ? 0.55 : 0.34);
    for (const sgn of [1, -1]) {
      const ex = cx + Math.cos(a) * len * sgn, ey = cy + Math.sin(a) * len * sgn;
      const g = x.createLinearGradient(cx, cy, ex, ey);
      g.addColorStop(0, rgba(flareCol, 0.7));
      g.addColorStop(1, rgba(flareCol, 0));
      x.strokeStyle = g; x.lineWidth = Math.max(1, R * 0.01); x.lineCap = 'round';
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(ex, ey); x.stroke();
    }
  }
  x.restore();
  dot(x, cx, cy, R * 0.07, '#1a1422', 0.9);
  dot(x, cx, cy, R * 0.035, mix(rimCol, '#fff', 0.6), 0.95);
}

/* ── BIG-TOP TENT (striped canopy) ─────────────────────────────────────────*/
function bigTop(x, P, cx, baseY, w, h, hueA, r) {
  const stripes = rint(r, 7, 11);
  const colA = hsl2hex(hueA, 0.8, 0.55), colB = '#f4ecd8';
  const topY = baseY - h;
  for (let i = 0; i < stripes; i++) {
    const t0 = i / stripes, t1 = (i + 1) / stripes;
    x.fillStyle = (i % 2 === 0) ? rgba(colA, 0.95) : rgba(colB, 0.9);
    x.beginPath();
    x.moveTo(cx, topY);
    x.lineTo(cx - w / 2 + w * t0, baseY);
    x.lineTo(cx - w / 2 + w * t1, baseY);
    x.closePath(); x.fill();
  }
  // peak flag
  x.strokeStyle = rgba('#100c16', 0.9); x.lineWidth = Math.max(1.5, w * 0.01);
  x.beginPath(); x.moveTo(cx, topY); x.lineTo(cx, topY - h * 0.18); x.stroke();
  x.fillStyle = rgba(P.accent, 0.95);
  x.beginPath(); x.moveTo(cx, topY - h * 0.18); x.lineTo(cx + w * 0.09, topY - h * 0.12); x.lineTo(cx, topY - h * 0.07); x.closePath(); x.fill();
}

/* ── SWING / CAROUSEL silhouettes (distant rides) ──────────────────────────*/
function swingTower(x, P, cx, baseY, h, hue, r) {
  x.strokeStyle = rgba('#0c0a14', 0.9); x.lineWidth = Math.max(2, h * 0.02);
  x.beginPath(); x.moveTo(cx, baseY); x.lineTo(cx, baseY - h); x.stroke();
  const ringY = baseY - h * 0.82, rad = h * 0.3;
  x.save(); x.globalCompositeOperation = 'lighter';
  softGlow(x, cx, ringY, rad * 1.4, hsl2hex(hue, 0.85, 0.6), 0.3);
  x.restore();
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const sx = cx + Math.cos(a) * rad, sy = ringY + Math.sin(a) * rad * 0.4;
    x.strokeStyle = rgba(hsl2hex(hue, 0.7, 0.6), 0.7); x.lineWidth = 1;
    x.beginPath(); x.moveTo(cx, ringY); x.lineTo(sx, sy + h * 0.18); x.stroke();
    dot(x, sx, sy + h * 0.18, 2, '#100c16', 0.8);
  }
}

/* ── LANTERN STRINGS / BUNTING swooping across the frame ───────────────────*/
function lanternString(x, P, x0, y0, x1, y1, sag, r, bulbHue) {
  const steps = 26;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + sag;
  // wire
  x.strokeStyle = rgba('#0c0a14', 0.55); x.lineWidth = 1.4;
  x.beginPath(); x.moveTo(x0, y0);
  x.quadraticCurveTo(cx, cy, x1, y1); x.stroke();
  // bulbs along the catenary
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const hue = bulbHue != null ? bulbHue : P.hues[i % P.hues.length];
    const col = hsl2hex(hue, 0.85, 0.65);
    softGlow(x, bx, by + 3, 7, col, 0.5);
    dot(x, bx, by + 3, 1.8, mix(col, '#ffffff', 0.4), 0.95);
  }
  x.restore();
}
function buntingString(x, P, x0, y0, x1, y1, sag, r) {
  const steps = 18;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2 + sag;
  x.strokeStyle = rgba('#0c0a14', 0.5); x.lineWidth = 1.2;
  x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(cx, cy, x1, y1); x.stroke();
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const bx = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
    const by = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1;
    const hue = P.hues[i % P.hues.length];
    const s = 7;
    x.fillStyle = rgba(hsl2hex(hue, 0.8, 0.55), 0.85);
    x.beginPath(); x.moveTo(bx - s * 0.5, by); x.lineTo(bx + s * 0.5, by); x.lineTo(bx, by + s); x.closePath(); x.fill();
  }
}

/* ── FLOATING PAPER LANTERNS rising ────────────────────────────────────────*/
function floatingLanterns(x, P, W, hY, n, r) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const lx = W * r();
    const ly = hY * (0.15 + r() * 0.8);
    const s = Math.min(W, hY) * (0.006 + r() * 0.012);
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    const col = hsl2hex(hue, 0.85, 0.62);
    softGlow(x, lx, ly, s * 4, col, 0.4);
    x.fillStyle = rgba(mix(col, '#fff7e0', 0.3), 0.85);
    x.beginPath();
    x.ellipse(lx, ly, s, s * 1.25, 0, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* ── BONFIRE / STAGE glow with light beams ─────────────────────────────────*/
function bonfire(x, P, cx, gy, scale, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  // ground glow pool
  softGlow(x, cx, gy, scale * 2.2, P.glow, 0.4);
  softGlow(x, cx, gy, scale * 0.9, '#ffd060', 0.55);
  // flame tongues
  for (let i = 0; i < 14; i++) {
    const a = -Math.PI / 2 + (r() - 0.5) * 0.9;
    const h = scale * (0.7 + r() * 1.2);
    const ex = cx + Math.cos(a) * h * 0.3;
    const ey = gy + Math.sin(a) * h;
    const hue = 20 + r() * 30;
    const g = x.createLinearGradient(cx, gy, ex, ey);
    g.addColorStop(0, rgba('#ffe08a', 0.8));
    g.addColorStop(0.6, rgba(hsl2hex(hue, 1, 0.55), 0.6));
    g.addColorStop(1, rgba(hsl2hex(hue, 1, 0.5), 0));
    x.strokeStyle = g; x.lineWidth = scale * (0.08 + r() * 0.12); x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx + (r() - 0.5) * scale * 0.4, gy); x.lineTo(ex, ey); x.stroke();
  }
  x.restore();
}
function stageBeams(x, P, cx, topY, gy, n, r) {
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * 1.4;
    const len = (gy - topY) * (1.3 + r() * 0.5);
    const ex = cx + Math.cos(a) * len;
    const ey = topY + Math.sin(a) * len;
    const hue = P.hues[i % P.hues.length];
    const col = hsl2hex(hue, 0.8, 0.6);
    const g = x.createLinearGradient(cx, topY, ex, ey);
    g.addColorStop(0, rgba(col, 0.32));
    g.addColorStop(1, rgba(col, 0));
    x.strokeStyle = g; x.lineWidth = (gy - topY) * 0.05; x.lineCap = 'round';
    x.beginPath(); x.moveTo(cx, topY); x.lineTo(ex, ey); x.stroke();
  }
  x.restore();
}

/* ── CROWD: a packed field of silhouetted figures, drawn back-to-front in rows ─
 * The throng is the heart of the piece — it MUST read as people. Figures are
 * drawn in depth rows from the horizon down: far rows are tiny, hazy, tightly
 * packed (a sea of heads); near rows are large, near-black, overlapping
 * silhouettes that anchor the foreground. A warm rim/uplight catches each head
 * so the crowd glitters under the festival glow. */
/* Warm uplight pool on the foreground ground band — shared by every foreground. */
function groundUplight(x, glowCol, W, groundTop, groundBot) {
  const span = groundBot - groundTop;
  x.save();
  x.globalCompositeOperation = 'screen';
  const gg = x.createLinearGradient(0, groundTop, 0, groundBot);
  gg.addColorStop(0, rgba(glowCol, 0.26));
  gg.addColorStop(0.5, rgba(glowCol, 0.12));
  gg.addColorStop(1, rgba(glowCol, 0.03));
  x.fillStyle = gg; x.fillRect(0, groundTop, W, span);
  x.restore();
}
function crowd(x, P, W, hY, H, density, glowCol, r) {
  const cfg = {
    Intimate:  { rows: 10, fill: 0.85, nearH: 0.10 },
    Gathering: { rows: 15, fill: 1.15, nearH: 0.12 },
    Throng:    { rows: 20, fill: 1.45, nearH: 0.14 },
    Massive:   { rows: 26, fill: 1.7,  nearH: 0.16 },
  }[density];
  const groundTop = hY - Math.min(W, hY) * 0.005;
  const groundBot = H * 0.995;
  const span = groundBot - groundTop;

  groundUplight(x, glowCol, W, groundTop, groundBot);

  // a dark crowd-mass base in the nearest band so the bottom never reads empty
  x.save();
  const baseTop = groundBot - span * cfg.nearH * 2.4;
  const bg = x.createLinearGradient(0, baseTop, 0, groundBot);
  bg.addColorStop(0, rgba('#05040a', 0));
  bg.addColorStop(1, rgba('#05040a', 0.9));
  x.fillStyle = bg; x.fillRect(0, baseTop, W, groundBot - baseTop);
  x.restore();

  const lightCol = mix(glowCol, '#ffffff', 0.35);
  for (let row = 0; row < cfg.rows; row++) {
    const t = row / (cfg.rows - 1);            // 0 far → 1 near
    const fy = groundTop + span * Math.pow(t, 1.35);
    const scale = (0.006 + 0.05 * Math.pow(t, 1.2)) * Math.min(W, H);
    // packed spacing: near rows fewer-but-bigger, far rows many-tiny
    const spacing = scale * (1.05 - 0.25 * t);
    const count = Math.ceil((W / spacing) * cfg.fill);
    const bodyCol = mix('#04030a', P.skyBot, (1 - t) * 0.4);
    const bodyA = 0.6 + 0.38 * t;
    for (let i = 0; i < count; i++) {
      const fx = (i + (r() - 0.2) * 1.4) * (W / count);
      const jy = fy + randn(r) * scale * 0.85;     // stronger height scatter
      const s = scale * (0.62 + r() * 0.85);        // wider size variance
      drawFigure(x, fx, jy, s, rgba(bodyCol, bodyA), lightCol, t, r);
    }
  }

  // raised lights/lanterns held aloft — SPARSE, small, so silhouettes still win
  x.save(); x.globalCompositeOperation = 'lighter';
  const nLights = Math.floor((W / 130) * cfg.fill);
  for (let i = 0; i < nLights; i++) {
    const t = 0.45 + r() * 0.55;             // only nearer rows hold lights
    const fy = groundTop + span * Math.pow(t, 1.35);
    const fx = r() * W;
    const sc = (0.006 + 0.05 * Math.pow(t, 1.2)) * Math.min(W, H);
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    const lcol = hsl2hex(hue, 0.85, 0.66);
    const lx = fx + sc * (r() < 0.5 ? -1 : 1) * 1.2;
    const ly = fy - sc * (2.9 + r() * 1.4);
    softGlow(x, lx, ly, sc * 1.5, lcol, 0.55);
    dot(x, lx, ly, sc * 0.42, mix(lcol, '#fff', 0.5), 0.95);
  }
  x.restore();
}
function drawFigure(x, fx, fy, s, fill, rimCol, t, r) {
  // shoulders + tapered torso silhouette
  x.fillStyle = fill;
  x.beginPath();
  x.moveTo(fx - s * 0.72, fy);
  x.lineTo(fx + s * 0.72, fy);
  x.lineTo(fx + s * 0.42, fy - s * 1.9);
  x.quadraticCurveTo(fx + s * 0.5, fy - s * 2.2, fx + s * 0.28, fy - s * 2.35);
  x.lineTo(fx - s * 0.28, fy - s * 2.35);
  x.quadraticCurveTo(fx - s * 0.5, fy - s * 2.2, fx - s * 0.42, fy - s * 1.9);
  x.closePath(); x.fill();
  // head
  x.beginPath(); x.arc(fx, fy - s * 2.7, s * 0.5, 0, Math.PI * 2); x.fill();
  // a thin warm rim catching the head edge (only when large enough to read)
  if (s > 4) {
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(rimCol, 0.22 + 0.22 * t);
    x.lineWidth = Math.max(0.8, s * 0.12);
    x.beginPath(); x.arc(fx, fy - s * 2.7, s * 0.5, -Math.PI * 0.85, -Math.PI * 0.1); x.stroke();
    x.restore();
  }
}

/* A short scatter of small near-silhouette heads along the very base — used by the
 * non-crowd foregrounds so people are always present without templating the row. */
function baseHeads(x, P, W, groundBot, glowCol, n, r) {
  const lightCol = mix(glowCol, '#ffffff', 0.35);
  for (let i = 0; i < n; i++) {
    const fx = (i + 0.5 + (r() - 0.5) * 0.7) * (W / n);
    const s = Math.min(W, groundBot) * (0.012 + r() * 0.02);
    const fy = groundBot - s * (r() * 0.5);
    drawFigure(x, fx, fy, s, rgba('#04030a', 0.94), lightCol, 1, r);
  }
}

/* ── FOREGROUND 2: MARKET / FOOD STALLS — a row of awning-roofed booths with
 *    glowing interiors, strung bulbs and a little keeper at each. Busy + warm. */
function marketStalls(x, P, W, hY, H, glowCol, r) {
  const groundTop = hY - Math.min(W, hY) * 0.01;
  const groundBot = H * 0.995;
  groundUplight(x, glowCol, W, groundTop, groundBot);
  const baseY = groundBot - (groundBot - groundTop) * 0.04;
  const n = rint(r, 4, 7);
  const sw = W / n;
  const sh = (groundBot - groundTop) * (0.52 + r() * 0.16);
  // back wash so the booths sit on a lit field
  x.save(); x.globalCompositeOperation = 'screen';
  softGlow(x, W * 0.5, baseY - sh * 0.5, W * 0.7, glowCol, 0.10);
  x.restore();
  for (let i = 0; i < n; i++) {
    const cx = (i + 0.5) * sw + randn(r) * sw * 0.06;
    const w = sw * (0.82 + r() * 0.12);
    const topY = baseY - sh * (0.92 + r() * 0.1);
    const hue = P.hues[i % P.hues.length];
    const awn = hsl2hex(hue, 0.85, 0.55);
    // warm glowing interior (the open booth front)
    x.save(); x.globalCompositeOperation = 'lighter';
    const ig = x.createLinearGradient(0, topY, 0, baseY);
    ig.addColorStop(0, rgba(mix(P.glow, '#fff', 0.3), 0.5));
    ig.addColorStop(1, rgba(P.glow, 0.12));
    x.fillStyle = ig; x.fillRect(cx - w * 0.42, topY + sh * 0.18, w * 0.84, baseY - topY - sh * 0.18);
    softGlow(x, cx, topY + sh * 0.45, w * 0.7, hsl2hex(hue, 0.8, 0.6), 0.3);
    x.restore();
    // dark stall posts + counter
    x.fillStyle = rgba('#0b0812', 0.92);
    x.fillRect(cx - w * 0.46, topY + sh * 0.16, w * 0.05, baseY - topY);
    x.fillRect(cx + w * 0.41, topY + sh * 0.16, w * 0.05, baseY - topY);
    x.fillRect(cx - w * 0.46, baseY - sh * 0.16, w * 0.92, sh * 0.18); // counter
    // striped awning with a scalloped (rounded-arc) lower lip
    const stripes = rint(r, 5, 8);
    const lipY = topY + sh * 0.16;
    const scallop = sh * 0.07;
    for (let s2 = 0; s2 < stripes; s2++) {
      const x0 = cx - w * 0.5 + w * (s2 / stripes);
      const x1 = cx - w * 0.5 + w * ((s2 + 1) / stripes);
      x.fillStyle = (s2 % 2 === 0) ? rgba(awn, 0.96) : rgba('#f4ecd8', 0.92);
      x.beginPath();
      x.moveTo(x0, topY);
      x.lineTo(x1, topY);
      x.lineTo(x1, lipY);
      x.quadraticCurveTo((x0 + x1) / 2, lipY + scallop, x0, lipY);
      x.closePath(); x.fill();
    }
    // a string of bulbs along the awning lip
    x.save(); x.globalCompositeOperation = 'lighter';
    const bulbs = rint(r, 5, 8);
    for (let b = 0; b < bulbs; b++) {
      const bx = cx - w * 0.46 + (b / (bulbs - 1)) * w * 0.92;
      const bhue = P.hues[(i + b) % P.hues.length];
      const bcol = hsl2hex(bhue, 0.85, 0.66);
      softGlow(x, bx, topY + sh * 0.2, w * 0.09, bcol, 0.6);
      dot(x, bx, topY + sh * 0.2, w * 0.018, mix(bcol, '#fff', 0.5), 0.95);
    }
    x.restore();
    // a keeper silhouette behind the counter
    const ks = w * 0.16;
    drawFigure(x, cx + randn(r) * w * 0.1, baseY - sh * 0.14, ks, rgba('#05040a', 0.96), mix(glowCol, '#fff', 0.4), 1, r);
  }
  // a thin scatter of shopper heads in front of the stalls
  baseHeads(x, P, W, groundBot, glowCol, rint(r, 10, 18), r);
}

/* ── FOREGROUND 3: WATERFRONT RAILING — a near railing with hanging lanterns,
 *    figures leaning, and shimmering pole reflections (water added by reflect()). */
function waterfrontRailing(x, P, W, hY, H, glowCol, r) {
  const groundBot = H * 0.995;
  const railY = hY + (groundBot - hY) * 0.16;
  groundUplight(x, glowCol, W, hY, railY);
  // the railing rail + posts
  x.save();
  x.strokeStyle = rgba('#08070e', 0.95);
  x.lineWidth = Math.max(2.5, W * 0.006);
  x.beginPath(); x.moveTo(0, railY); x.lineTo(W, railY); x.stroke();
  x.lineWidth = Math.max(1.5, W * 0.0035);
  x.beginPath(); x.moveTo(0, railY + H * 0.018); x.lineTo(W, railY + H * 0.018); x.stroke();
  const posts = rint(r, 8, 13);
  for (let i = 0; i <= posts; i++) {
    const px = (i / posts) * W;
    x.lineWidth = Math.max(2, W * 0.005);
    x.beginPath(); x.moveTo(px, railY - H * 0.01); x.lineTo(px, groundBot); x.stroke();
  }
  x.restore();
  // hanging lanterns from the rail
  x.save(); x.globalCompositeOperation = 'lighter';
  const lanterns = rint(r, 6, 11);
  for (let i = 0; i < lanterns; i++) {
    const lx = (i + 0.5) / lanterns * W + randn(r) * W * 0.01;
    const ly = railY + H * (0.03 + r() * 0.05);
    const s = W * (0.01 + r() * 0.008);
    const hue = P.hues[i % P.hues.length];
    const col = hsl2hex(hue, 0.85, 0.62);
    x.strokeStyle = rgba('#0c0a14', 0.6); x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(lx, railY); x.lineTo(lx, ly - s); x.stroke();
    softGlow(x, lx, ly, s * 3, col, 0.55);
    x.fillStyle = rgba(mix(col, '#fff7e0', 0.3), 0.9);
    x.beginPath(); x.ellipse(lx, ly, s, s * 1.3, 0, 0, Math.PI * 2); x.fill();
  }
  x.restore();
  // figures leaning on the railing (heads + shoulders above the rail)
  const lightCol = mix(glowCol, '#ffffff', 0.4);
  const figs = rint(r, 9, 16);
  for (let i = 0; i < figs; i++) {
    const fx = (i + 0.5 + (r() - 0.5) * 0.6) / figs * W;
    const s = W * (0.016 + r() * 0.012);
    drawFigure(x, fx, railY + H * 0.006, s, rgba('#04030a', 0.95), lightCol, 1, r);
  }
}

/* ── FOREGROUND 4: HILLSIDE SEATING — terraced rows of seated silhouettes on a
 *    dark slope, looking up at the show. Reads as a packed amphitheatre. */
function hillsideSeating(x, P, W, hY, H, glowCol, r) {
  const groundTop = hY - Math.min(W, hY) * 0.005;
  const groundBot = H * 0.995;
  const span = groundBot - groundTop;
  groundUplight(x, glowCol, W, groundTop, groundBot);
  // dark slope mass rising to the right/left
  x.save();
  const slope = (r() < 0.5 ? 1 : -1);
  const mg = x.createLinearGradient(0, groundTop, 0, groundBot);
  mg.addColorStop(0, rgba('#06050d', 0.4));
  mg.addColorStop(1, rgba('#03020a', 0.95));
  x.fillStyle = mg; x.fillRect(0, groundTop, W, span);
  x.restore();
  const lightCol = mix(glowCol, '#ffffff', 0.35);
  const rows = rint(r, 9, 13);
  for (let row = 0; row < rows; row++) {
    const t = row / (rows - 1);                 // 0 far(up) → 1 near(down)
    // terrace baseline tilts across the slope
    const baseFy = groundTop + span * (0.1 + 0.9 * Math.pow(t, 1.1));
    const tilt = slope * span * 0.05 * (1 - t);
    const s = Math.min(W, H) * (0.01 + 0.04 * Math.pow(t, 1.1));
    const spacing = s * 1.5;
    const count = Math.ceil(W / spacing) + 1;
    // faint warm seam of light between terraces
    if (row > 0) {
      x.save(); x.globalCompositeOperation = 'screen';
      x.strokeStyle = rgba(glowCol, 0.12 + 0.1 * t); x.lineWidth = Math.max(1, s * 0.15);
      x.beginPath(); x.moveTo(0, baseFy - s * 1.4 + tilt); x.lineTo(W, baseFy - s * 1.4 - tilt); x.stroke();
      x.restore();
    }
    for (let i = 0; i < count; i++) {
      const fx = (i + (r() - 0.3) * 0.6) * spacing;
      const fy = baseFy + (fx / W - 0.5) * 2 * tilt + randn(r) * s * 0.4;
      // seated: squat torso (use small s and a lowered head)
      const bodyCol = mix('#04030a', P.skyBot, (1 - t) * 0.35);
      x.fillStyle = rgba(bodyCol, 0.78 + 0.2 * t);
      x.beginPath();
      x.moveTo(fx - s * 0.8, fy);
      x.lineTo(fx + s * 0.8, fy);
      x.lineTo(fx + s * 0.5, fy - s * 1.15);
      x.lineTo(fx - s * 0.5, fy - s * 1.15);
      x.closePath(); x.fill();
      x.beginPath(); x.arc(fx, fy - s * 1.5, s * 0.45, 0, Math.PI * 2); x.fill();
      if (s > 4) {
        x.save(); x.globalCompositeOperation = 'lighter';
        x.strokeStyle = rgba(lightCol, 0.2 + 0.2 * t); x.lineWidth = Math.max(0.8, s * 0.12);
        x.beginPath(); x.arc(fx, fy - s * 1.5, s * 0.45, -Math.PI * 0.85, -Math.PI * 0.1); x.stroke();
        x.restore();
      }
    }
  }
  // a few held phone/lantern sparks among the seated
  x.save(); x.globalCompositeOperation = 'lighter';
  const sparks = rint(r, 8, 16);
  for (let i = 0; i < sparks; i++) {
    const sx = r() * W, sy = groundTop + span * (0.3 + r() * 0.65);
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    softGlow(x, sx, sy, span * 0.02, hsl2hex(hue, 0.85, 0.66), 0.5);
  }
  x.restore();
}

/* ── FOREGROUND 5: LANTERN SELLERS — carts heaped with glowing paper lanterns,
 *    sellers, and clusters of lanterns held aloft. The richest, glowiest base. */
function lanternSellers(x, P, W, hY, H, glowCol, r) {
  const groundTop = hY - Math.min(W, hY) * 0.005;
  const groundBot = H * 0.995;
  const span = groundBot - groundTop;
  groundUplight(x, glowCol, W, groundTop, groundBot);
  // dark near base
  x.save();
  const bg = x.createLinearGradient(0, groundBot - span * 0.4, 0, groundBot);
  bg.addColorStop(0, rgba('#05040a', 0));
  bg.addColorStop(1, rgba('#05040a', 0.9));
  x.fillStyle = bg; x.fillRect(0, groundBot - span * 0.4, W, span * 0.4);
  x.restore();
  const lightCol = mix(glowCol, '#ffffff', 0.4);
  // a few cart clusters across the base
  const carts = rint(r, 3, 5);
  for (let c = 0; c < carts; c++) {
    const cx = (c + 0.5) / carts * W + randn(r) * W * 0.05;
    const baseY = groundBot - span * (0.04 + r() * 0.05);
    const cw = W * (0.12 + r() * 0.06);
    // cart body
    x.fillStyle = rgba('#0a0812', 0.95);
    x.fillRect(cx - cw * 0.5, baseY - span * 0.06, cw, span * 0.08);
    // heaped glowing lanterns on the cart + held aloft above it
    x.save(); x.globalCompositeOperation = 'lighter';
    const lant = rint(r, 14, 24);
    for (let i = 0; i < lant; i++) {
      const ang = r() * Math.PI - Math.PI;            // upper hemisphere heap
      const rr = cw * (0.1 + r() * 0.55);
      const lx = cx + Math.cos(ang) * rr;
      const ly = baseY - span * 0.06 + Math.sin(ang) * rr * 0.8 - span * r() * 0.12;
      const s = cw * (0.04 + r() * 0.05);
      const hue = P.hues[rint(r, 0, P.hues.length - 1)];
      const col = hsl2hex(hue, 0.85, 0.62);
      softGlow(x, lx, ly, s * 3, col, 0.5);
      x.fillStyle = rgba(mix(col, '#fff7e0', 0.3), 0.9);
      x.beginPath(); x.ellipse(lx, ly, s, s * 1.25, 0, 0, Math.PI * 2); x.fill();
    }
    x.restore();
    // the seller silhouette beside the cart
    drawFigure(x, cx + cw * 0.5 + W * 0.01, baseY, W * 0.022, rgba('#04030a', 0.96), lightCol, 1, r);
  }
  // a band of shopper heads weaving between carts
  baseHeads(x, P, W, groundBot, glowCol, rint(r, 14, 22), r);
  // a sprinkle of lanterns already lifting off above the base
  x.save(); x.globalCompositeOperation = 'lighter';
  const rising = rint(r, 8, 16);
  for (let i = 0; i < rising; i++) {
    const lx = r() * W, ly = groundTop - span * 0.1 + r() * span * 0.5;
    const s = W * (0.006 + r() * 0.01);
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    const col = hsl2hex(hue, 0.85, 0.62);
    softGlow(x, lx, ly, s * 3.5, col, 0.45);
    x.fillStyle = rgba(mix(col, '#fff7e0', 0.3), 0.85);
    x.beginPath(); x.ellipse(lx, ly, s, s * 1.25, 0, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* ── FOREGROUND 6: STAGE FRONT — a lit stage band at the base with a backlit
 *    performer, sweeping light cones, and the backs of a near audience. */
function stageFront(x, P, W, hY, H, glowCol, r) {
  const groundTop = hY - Math.min(W, hY) * 0.005;
  const groundBot = H * 0.995;
  const span = groundBot - groundTop;
  groundUplight(x, glowCol, W, groundTop, groundBot);
  const stageTop = groundBot - span * (0.5 + r() * 0.12);
  const cx = W * (0.4 + r() * 0.2);
  // stage glow / bloom behind the performer
  x.save(); x.globalCompositeOperation = 'lighter';
  const sg = x.createLinearGradient(0, stageTop, 0, groundBot);
  sg.addColorStop(0, rgba(mix(P.glow, '#fff', 0.2), 0.4));
  sg.addColorStop(1, rgba(P.glow, 0.08));
  x.fillStyle = sg; x.fillRect(0, stageTop, W, groundBot - stageTop);
  // overhead light cones sweeping from a truss
  const cones = rint(r, 4, 7);
  for (let i = 0; i < cones; i++) {
    const ox = cx + (i / (cones - 1) - 0.5) * W * 0.5;
    const a = -Math.PI / 2 + (i / (cones - 1) - 0.5) * 1.2;
    const len = span * (0.9 + r() * 0.5);
    const ex = ox + Math.cos(a) * len, ey = stageTop + Math.sin(a) * len;
    const hue = P.hues[i % P.hues.length];
    const col = hsl2hex(hue, 0.8, 0.6);
    const g = x.createLinearGradient(ox, stageTop, ex, ey);
    g.addColorStop(0, rgba(col, 0.3)); g.addColorStop(1, rgba(col, 0));
    x.strokeStyle = g; x.lineWidth = span * 0.06; x.lineCap = 'round';
    x.beginPath(); x.moveTo(ox, stageTop); x.lineTo(ex, ey); x.stroke();
  }
  x.restore();
  // backlit performer silhouette centre-stage, larger than the crowd
  const ps = span * 0.16;
  x.save(); x.globalCompositeOperation = 'lighter';
  softGlow(x, cx, stageTop + span * 0.08, ps * 2.4, mix(P.glow, '#fff', 0.3), 0.45);
  x.restore();
  drawFigure(x, cx, stageTop + span * 0.34, ps, rgba('#020108', 0.98), mix(glowCol, '#fff', 0.6), 1, r);
  // a couple of side performers / amps
  for (const sgnx of [-1, 1]) {
    if (r() < 0.7) drawFigure(x, cx + sgnx * W * (0.13 + r() * 0.06), stageTop + span * 0.32,
                              ps * 0.7, rgba('#020108', 0.97), mix(glowCol, '#fff', 0.5), 1, r);
  }
  // dark near-audience: backs of heads/raised arms along the bottom edge. Drawn
  // as distinct rounded heads + shoulders (not one heavy blob) so it reads as a
  // packed front row cheering the stage, backlit by the stage glow.
  const lightCol = mix(glowCol, '#ffffff', 0.3);
  const n = rint(r, 16, 26);
  for (let i = 0; i < n; i++) {
    const fx = (i + 0.5 + (r() - 0.5) * 0.7) / n * W;
    const s = span * (0.035 + r() * 0.04);
    const fy = groundBot + s * 0.6;             // cropped at the bottom edge
    // shoulders
    x.fillStyle = rgba('#020107', 0.97);
    x.beginPath();
    x.moveTo(fx - s * 0.85, fy);
    x.quadraticCurveTo(fx - s * 0.85, fy - s * 1.2, fx - s * 0.45, fy - s * 1.35);
    x.lineTo(fx + s * 0.45, fy - s * 1.35);
    x.quadraticCurveTo(fx + s * 0.85, fy - s * 1.2, fx + s * 0.85, fy);
    x.closePath(); x.fill();
    // head
    x.beginPath(); x.arc(fx, fy - s * 1.75, s * 0.52, 0, Math.PI * 2); x.fill();
    // occasional raised arm holding a light
    if (r() < 0.25) {
      x.strokeStyle = rgba('#020107', 0.95); x.lineWidth = s * 0.22; x.lineCap = 'round';
      const ax = fx + (r() - 0.5) * s, ay = fy - s * (2.3 + r() * 0.6);
      x.beginPath(); x.moveTo(fx, fy - s * 1.2); x.lineTo(ax, ay); x.stroke();
      x.save(); x.globalCompositeOperation = 'lighter';
      const hue = P.hues[rint(r, 0, P.hues.length - 1)];
      softGlow(x, ax, ay, s * 0.9, hsl2hex(hue, 0.85, 0.66), 0.6);
      x.restore();
    }
    // warm backlit rim on the head
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(lightCol, 0.32); x.lineWidth = Math.max(1, s * 0.11);
    x.beginPath(); x.arc(fx, fy - s * 1.75, s * 0.52, -Math.PI * 0.95, -Math.PI * 0.05); x.stroke();
    x.restore();
  }
}

/* Foreground dispatcher — one of six structurally distinct base bands. */
function paintForeground(x, P, W, hY, H, kind, crowdDensity, glowCol, r) {
  switch (kind) {
    case 'Market Stalls':      marketStalls(x, P, W, hY, H, glowCol, r); break;
    case 'Waterfront Railing': waterfrontRailing(x, P, W, hY, H, glowCol, r); break;
    case 'Hillside Seating':   hillsideSeating(x, P, W, hY, H, glowCol, r); break;
    case 'Lantern Sellers':    lanternSellers(x, P, W, hY, H, glowCol, r); break;
    case 'Stage Front':        stageFront(x, P, W, hY, H, glowCol, r); break;
    case 'Crowd':
    default:                   crowd(x, P, W, hY, H, crowdDensity, glowCol, r); break;
  }
}

/* ── distant skyline / treeline silhouette band ────────────────────────────*/
function horizonBand(x, P, W, hY, hueGlow, storm, r) {
  // soft glow band right at the horizon (city/fair lights behind crowd)
  x.save(); x.globalCompositeOperation = 'screen';
  const g = x.createLinearGradient(0, hY - Math.min(W, hY) * 0.14, 0, hY + 4);
  g.addColorStop(0, rgba(hueGlow, 0));
  g.addColorStop(1, rgba(hueGlow, 0.34));
  x.fillStyle = g; x.fillRect(0, hY - Math.min(W, hY) * 0.14, W, Math.min(W, hY) * 0.14 + 4);
  x.restore();
  // a jagged dark treeline/rooftop strip + tiny distant lights
  x.fillStyle = rgba('#06050b', 0.85);
  x.beginPath(); x.moveTo(0, hY + 2);
  let xx = 0;
  while (xx < W) {
    const w = W * (0.02 + r() * 0.05);
    const h = Math.min(W, hY) * (0.01 + r() * 0.05);
    x.lineTo(xx, hY - h);
    x.lineTo(xx + w, hY - h);
    xx += w;
  }
  x.lineTo(W, hY + 2); x.closePath(); x.fill();
  // distant fair lights on the band
  x.save(); x.globalCompositeOperation = 'lighter';
  const n = Math.floor(W / 14);
  for (let i = 0; i < n; i++) {
    const lx = r() * W, ly = hY - Math.min(W, hY) * (0.005 + r() * 0.03);
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    dot(x, lx, ly, 1.1, hsl2hex(hue, 0.7, 0.7), 0.6 + r() * 0.3);
  }
  x.restore();
  if (storm) {
    // a faint distant lightning fork
    if (r() < 0.8) {
      x.save(); x.globalCompositeOperation = 'lighter';
      let px = W * (0.2 + r() * 0.6), py = 0;
      x.strokeStyle = rgba('#cfe0ff', 0.5); x.lineWidth = 1.6;
      x.beginPath(); x.moveTo(px, py);
      for (let k = 0; k < 6; k++) { px += (r() - 0.5) * W * 0.06; py += hY * 0.12; x.lineTo(px, py); }
      x.stroke(); x.restore();
    }
  }
}

/* ── CONFETTI / EMBERS / SPARKS in the air ─────────────────────────────────*/
function confetti(x, P, W, H, hY, r) {
  x.save(); x.globalCompositeOperation = 'lighter';
  const n = Math.floor(W * H / 4200);
  for (let i = 0; i < n; i++) {
    const cx = r() * W, cy = r() * H * 0.85;
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    const col = hsl2hex(hue, 0.9, 0.62);
    if (r() < 0.55) {
      // ember dot
      dot(x, cx, cy, 0.7 + r() * 1.3, col, 0.5 + r() * 0.4);
    } else {
      // confetti fleck
      x.save(); x.translate(cx, cy); x.rotate(r() * Math.PI);
      x.fillStyle = rgba(col, 0.6 + r() * 0.35);
      x.fillRect(-1.4, -0.8, 2.8, 1.6); x.restore();
    }
  }
  x.restore();
}

/* ── REFLECTION on wet ground / water (waterfront) ─────────────────────────*/
function reflect(x, P, W, H, hY, draw, r) {
  // capture a vertically-flipped, blurred, dimmed copy of the sky+structures
  // band just above the waterline into the water band below hY.
  const waterTop = hY;
  const waterBot = H;
  const bandH = waterBot - waterTop;
  // pull the region [hY - bandH .. hY] flipped down
  x.save();
  x.globalAlpha = 0.5;
  x.translate(0, waterTop + bandH);
  x.scale(1, -1);
  x.drawImage(x.canvas, 0, Math.max(0, hY - bandH), W, bandH, 0, 0, W, bandH);
  x.restore();
  // ripple darkening + horizontal streaks
  x.save();
  const wg = x.createLinearGradient(0, waterTop, 0, waterBot);
  wg.addColorStop(0, rgba('#04040a', 0.1));
  wg.addColorStop(1, rgba('#04040a', 0.55));
  x.fillStyle = wg; x.fillRect(0, waterTop, W, bandH);
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < 40; i++) {
    const yy = waterTop + r() * bandH;
    const hue = P.hues[rint(r, 0, P.hues.length - 1)];
    x.strokeStyle = rgba(hsl2hex(hue, 0.7, 0.6), 0.05 + r() * 0.06);
    x.lineWidth = 1 + r() * 2;
    x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy + (r() - 0.5) * 6); x.stroke();
  }
  x.restore();
}

/* ── ARTFUL FRAME / presentation — drawn LAST, over the finished scene ───────
 * Subtle, gallery-grade treatments that present the output as a piece. Keyline
 * colour is pulled from the palette so the frame harmonises with the art. */
function paintFrame(x, P, W, H, kind, r) {
  if (kind === 'None') return;
  const S = Math.min(W, H);
  const keyHue = P.wheel;
  const keyCol = hsl2hex(keyHue, 0.7, 0.62);

  if (kind === 'Matte') {
    // a dark passe-partout inner margin with a thin luminous keyline.
    const m = S * 0.045;
    x.save();
    // dark mat border (covers the bleed, isolates the image)
    x.fillStyle = rgba('#05040a', 0.9);
    x.fillRect(0, 0, W, m);
    x.fillRect(0, H - m, W, m);
    x.fillRect(0, 0, m, H);
    x.fillRect(W - m, 0, m, H);
    // a soft inner bevel shadow so the image sits BELOW the mat
    const inset = m;
    const bw = S * 0.012;
    const bg = x.createLinearGradient(inset, inset, inset + bw, inset + bw);
    bg.addColorStop(0, rgba('#000005', 0.45)); bg.addColorStop(1, rgba('#000005', 0));
    x.fillStyle = bg; x.fillRect(inset, inset, W - inset * 2, bw); x.fillRect(inset, inset, bw, H - inset * 2);
    x.restore();
    // thin luminous keyline framing the image window
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(mix(keyCol, '#ffffff', 0.25), 0.6);
    x.lineWidth = Math.max(1, S * 0.0022);
    x.strokeRect(inset + S * 0.004, inset + S * 0.004, W - (inset + S * 0.004) * 2, H - (inset + S * 0.004) * 2);
    x.restore();
  } else if (kind === 'Film Border') {
    // a subtle photographic black border with rounded soft edges + faint sprocket
    // ticks, like a frame of film. Understated.
    const m = S * 0.03;
    x.save();
    x.fillStyle = rgba('#040308', 0.94);
    x.fillRect(0, 0, W, m); x.fillRect(0, H - m, W, m);
    x.fillRect(0, 0, m, H); x.fillRect(W - m, 0, m, H);
    // a hairline bright edge where film meets image
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(mix(keyCol, '#ffffff', 0.4), 0.3);
    x.lineWidth = Math.max(1, S * 0.0015);
    x.strokeRect(m, m, W - m * 2, H - m * 2);
    x.restore();
    // faint sprocket ticks along top + bottom film margins
    x.save();
    const tick = m * 0.42, gap2 = m * 1.5;
    x.fillStyle = rgba('#1a1822', 0.8);
    for (let px = gap2; px < W - gap2; px += gap2) {
      x.fillRect(px - tick * 0.5, m * 0.28, tick, m * 0.42);
      x.fillRect(px - tick * 0.5, H - m * 0.7, tick, m * 0.42);
    }
    x.restore();
  } else if (kind === 'Inner Glow Vignette') {
    // an elegant inward glow band hugging the frame edge — a halo of the
    // palette's signature colour drawn just inside the border.
    x.save();
    x.globalCompositeOperation = 'screen';
    const t = S * 0.16;
    const sides = [
      [0, 0, W, t, 0, 1],      // top
      [0, H - t, W, t, 0, -1], // bottom
    ];
    // top + bottom inward glow
    for (const [gx, gy, gw, gh, , dir] of sides) {
      const g = x.createLinearGradient(0, dir > 0 ? gy : gy + gh, 0, dir > 0 ? gy + gh : gy);
      g.addColorStop(0, rgba(keyCol, 0.22)); g.addColorStop(1, rgba(keyCol, 0));
      x.fillStyle = g; x.fillRect(gx, gy, gw, gh);
    }
    // left + right inward glow
    for (const dir of [1, -1]) {
      const gx = dir > 0 ? 0 : W - t;
      const g = x.createLinearGradient(dir > 0 ? 0 : W, 0, dir > 0 ? t : W - t, 0);
      g.addColorStop(0, rgba(keyCol, 0.22)); g.addColorStop(1, rgba(keyCol, 0));
      x.fillStyle = g; x.fillRect(gx, 0, t, H);
    }
    x.restore();
    // a fine bright keyline at the very edge
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(mix(keyCol, '#ffffff', 0.3), 0.45);
    x.lineWidth = Math.max(1, S * 0.0025);
    x.strokeRect(S * 0.006, S * 0.006, W - S * 0.012, H - S * 0.012);
    x.restore();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * MASTER DRAW
 * ══════════════════════════════════════════════════════════════════════════ */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);
  const tc = TIME_CFG[p.time];

  // A "calm" frame = little/no pyrotechnic spectacle. These used to fall flat, so
  // they get their OWN richness: more lanterns, denser string lights, extra dusk
  // colour drama — a quiet night should still be gorgeous and busy, not thin.
  const calm = (p.fwork === 'None' || p.fwork === 'Early');

  // horizon line by camera
  const waterfront = p.layout === 'Waterfront';
  const hilltop = p.layout === 'Hilltop Overlook';
  let hY = H * (waterfront ? 0.62 : hilltop ? 0.46 : 0.66);

  const glowCol = mix(P.glow, '#ffffff', 0.0);

  // 1. SKY (back)
  paintSky(x, P, W, H, hY, tc, r);

  // 1b. DUSK COLOUR DRAMA — calm frames get a big soft band of saturated dusk
  // colour low in the sky + a couple of glowing cloud blooms so the sky itself
  // carries spectacle when there are no fireworks to. (Always present, stronger
  // when calm.) Keeps the won jewel-on-near-black identity — additive glow only.
  {
    x.save(); x.globalCompositeOperation = 'screen';
    const dramaA = calm ? 0.5 : 0.26;
    const bandTop = hY * (0.42 + r() * 0.12);
    const dg = x.createLinearGradient(0, bandTop, 0, hY);
    const dh1 = P.hues[rint(r, 0, P.hues.length - 1)];
    dg.addColorStop(0, rgba(hsl2hex(dh1, 0.75, 0.5), 0));
    dg.addColorStop(0.6, rgba(hsl2hex(dh1, 0.85, 0.5), dramaA * 0.6));
    dg.addColorStop(1, rgba(mix(P.glow, hsl2hex(dh1, 0.9, 0.55), 0.5), dramaA));
    x.fillStyle = dg; x.fillRect(0, bandTop, W, hY - bandTop);
    // glowing dusk clouds catching the festival underglow
    const nClouds = calm ? rint(r, 3, 5) : rint(r, 1, 2);
    for (let i = 0; i < nClouds; i++) {
      const cxx = W * (0.1 + r() * 0.8), cyy = hY * (0.3 + r() * 0.5);
      const hue = P.hues[rint(r, 0, P.hues.length - 1)];
      softGlow(x, cxx, cyy, Math.min(W, hY) * (0.16 + r() * 0.18), hsl2hex(hue, 0.7, 0.55), dramaA * 0.4);
    }
    x.restore();
  }

  // 1c. tiny CRISP DISTANT LIGHTS high in the scene — the sharp far counterpoint
  //     to the soft near bokeh added at the front, so the eye reads true depth.
  distantSparkle(x, P, W, hY, Math.floor(W * hY / 9000), r);

  // 2. FIREWORKS (in sky, behind structures)
  paintFireworks(x, P, W, hY, p.fwork, r);

  // 3. horizon glow + distant skyline
  horizonBand(x, P, W, hY, glowCol, tc.storm, r);

  // 4. HERO STRUCTURES — placement by camera
  // HERO must read clearly in EVERY frame: a strong, legible wheel that sits
  // ABOVE the horizon and is never dwarfed/blocked by the side tents. Cameras
  // that used to bury it (Centre Distant / Hilltop / Midway) are enlarged and
  // lifted; side tents are pushed smaller and to the far edges as clear depth.
  const wheelHue = P.wheel;
  let wheelCX, wheelCY, wheelR;
  if (p.layout === 'Wheel Left')          { wheelCX = W * 0.28; wheelR = S * 0.29; wheelCY = hY - wheelR * 0.62; }
  else if (p.layout === 'Wheel Right')    { wheelCX = W * 0.72; wheelR = S * 0.29; wheelCY = hY - wheelR * 0.62; }
  else if (p.layout === 'Wheel Centre Distant') { wheelCX = W * 0.5; wheelR = S * 0.25; wheelCY = hY - wheelR * 0.78; }
  else if (p.layout === 'Midway Row')     { wheelCX = W * (r() < 0.5 ? 0.32 : 0.68); wheelR = S * 0.26; wheelCY = hY - wheelR * 0.6; }
  else if (waterfront)                    { wheelCX = W * (r() < 0.5 ? 0.32 : 0.68); wheelR = S * 0.25; wheelCY = hY - wheelR * 0.66; }
  else /* hilltop */                      { wheelCX = W * 0.5; wheelR = S * 0.23; wheelCY = hY - wheelR * 1.0; }

  // distant rides on the far side of the wheel (depth) — kept small + edge-pushed
  // so they never compete with the hero. The wheel is drawn AFTER them, on top.
  const otherX = wheelCX < W * 0.5 ? W * 0.86 : W * 0.14;
  if (p.layout !== 'Wheel Centre Distant') {
    if (r() < 0.7) bigTop(x, P, otherX, hY, S * 0.18, S * 0.13, P.hues[1], r);
    if (r() < 0.55) swingTower(x, P, otherX + (wheelCX < W * 0.5 ? -1 : 1) * W * 0.09, hY, S * 0.26, P.hues[2], r);
  } else {
    if (r() < 0.8) bigTop(x, P, W * 0.16, hY, S * 0.17, S * 0.12, P.hues[1], r);
    if (r() < 0.8) bigTop(x, P, W * 0.84, hY, S * 0.15, S * 0.11, P.hues[3], r);
    if (r() < 0.6) swingTower(x, P, W * 0.84, hY, S * 0.22, P.hues[2], r);
  }

  // the hero Ferris wheel — drawn last among the structures so nothing covers it
  ferrisWheel(x, P, wheelCX, wheelCY, wheelR, wheelHue, glowCol, r);

  // 5. central bonfire / stage between viewer and structures
  const fireX = W * (0.4 + r() * 0.2);
  const fireGY = hY + (H - hY) * 0.28;
  if (r() < 0.5) {
    bonfire(x, P, fireX, fireGY, S * 0.05, r);
  } else {
    stageBeams(x, P, fireX, hY - S * 0.02, fireGY, rint(r, 4, 6), r);
    softGlow(x, fireX, fireGY, S * 0.12, P.glow, 0.3);
  }

  // 6. LANTERN STRINGS / BUNTING swooping across mid-air
  //    calm frames get noticeably more strands so the air stays busy + glowing.
  const strN = calm ? rint(r, 6, 10) : rint(r, 3, 6);
  for (let i = 0; i < strN; i++) {
    const y = hY * (0.3 + 0.5 * (i / strN)) + randn(r) * H * 0.02;
    const x0 = -W * 0.05, x1 = W * 1.05;
    const sag = S * (0.06 + r() * 0.08);
    if (r() < 0.7) lanternString(x, P, x0, y, x1, y + randn(r) * H * 0.03, sag, r, r() < 0.4 ? P.hues[rint(r, 0, P.hues.length - 1)] : null);
    else buntingString(x, P, x0, y, x1, y + randn(r) * H * 0.03, sag, r);
  }

  // 7. floating paper lanterns (esp. Lantern Release; calm frames get more so a
  //    quiet sky is filled with drifting glow rather than empty dark)
  const lanN = p.time === 'Lantern Release' ? rint(r, 30, 55) : calm ? rint(r, 22, 40) : rint(r, 6, 16);
  floatingLanterns(x, P, W, hY, lanN, r);

  // 8a. waterfront water band — laid BEFORE the foreground so the near railing /
  // figures sit ON TOP of the water and reflect into it (not under it).
  if (waterfront) reflect(x, P, W, H, hY, draw, r);

  // 8b. FOREGROUND (one of six structurally distinct base bands)
  paintForeground(x, P, W, hY, H, p.fground, p.crowd, glowCol, r);

  // 9. confetti / embers in the air
  confetti(x, P, W, H, hY, r);

  // 9b. AMBIANCE: drifting glowing embers / dust motes catching the light, so
  //     every bright source bleeds into living air rather than dead dark.
  emberMotes(x, P, W, H, hY, Math.floor(W * H / 7400), r);

  // 10. DEPTH OF FIELD: large soft out-of-focus BOKEH orbs in the near
  //     foreground — the front plane of the depth read, framing the scene.
  bokehForeground(x, P, W, H, rint(r, 6, 10), r);

  // 11. finishing
  if (tc.storm) {
    // rain streaks
    x.save(); x.globalCompositeOperation = 'screen';
    for (let i = 0; i < W * H / 1600; i++) {
      const rx = r() * W, ry = r() * H;
      x.strokeStyle = rgba('#9fb4d8', 0.05 + r() * 0.06); x.lineWidth = 0.8;
      x.beginPath(); x.moveTo(rx, ry); x.lineTo(rx - 2, ry + 10); x.stroke();
    }
    x.restore();
  }
  grain(x, W, H, 900, r);
  vignette(x, W, H, 0.48);

  // 12. ARTFUL FRAME — drawn last, over the finished, graded scene.
  paintFrame(x, P, W, H, p.frame, r);
}

export const carnivaleTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const carnivaleSchema: TraitSchema = {
  traits: [
    { name: 'Time',       values: TIMES },
    { name: 'Palette',    values: PALS.map((p) => p.name) },
    { name: 'Camera',     values: LAYOUTS },
    { name: 'Crowd',      values: CROWDS },
    { name: 'Foreground', values: FGROUNDS },
    { name: 'Fireworks',  values: FWORKS },
    { name: 'Format',     values: ['Square', 'Tall', 'Wide'] },
    { name: 'Frame',      values: FRAMES },
  ],
};

export const renderCarnivale: EngineFn = blit(draw, carnivaleTraits);

// W/H of Square, Tall, Wide (matches FMTS order).
export const CARNIVALE_ASPECTS = [1, 0.758, 1.34] as const;
