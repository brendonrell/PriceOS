// @ts-nocheck
/*
 * LongExp — "Light Painting" (DIRECTION A).
 * Long-exposure light trails on a night ground: looping luminous ribbons,
 * sparkler arcs and traced glowing curves, each with a bright near-white CORE
 * over a soft wide BLOOM halo, drawn additively ('lighter') so overlaps burn
 * brighter. Motion-blur streaks, scattered sparks, photographic grain/vignette.
 * Energetic, dazzling, photographic. Page colorway: #0b0a14.
 *
 * Artist: shellcount-ai (stays in the night-sky / light / long-exposure lane).
 * Deterministic from seed only — no Date/Math.random/network/DOM beyond canvas.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ---- palettes: each has a dark ground + a set of trail colours + a core ---- */
const PALS = [
  { name: 'Sparkler Gold', bg: '#0b0a14', glow: '#3a2a08', core: '#fff6dc', cols: ['#ffd25a', '#ffa12e', '#ffe79a', '#ff7b1c', '#fff0c0'] },
  { name: 'Neon',          bg: '#08060f', glow: '#1a0b2a', core: '#ffffff', cols: ['#ff2bd6', '#26e0ff', '#7a4bff', '#37ff9a', '#ff4f8b'] },
  { name: 'Cool Steel',    bg: '#070a12', glow: '#0c1626', core: '#f2faff', cols: ['#79d0ff', '#9fb8ff', '#c8e6ff', '#5e8cff', '#bfe9ff'] },
  { name: 'Ember',         bg: '#0d0606', glow: '#2a0c06', core: '#fff1da', cols: ['#ff5a1c', '#ff8c3a', '#ffb267', '#e23a12', '#ffd29a'] },
  { name: 'Aurora',        bg: '#060d10', glow: '#0a2018', core: '#eafff4', cols: ['#3dffb0', '#46e0ff', '#9affc8', '#5ea0ff', '#caff8f'] },
  { name: 'Magnesium White', bg: '#0a0a10', glow: '#16161f', core: '#ffffff', cols: ['#eaf2ff', '#cfe0ff', '#ffffff', '#bcd0ff', '#dfe8ff'] },
  { name: 'Violet Dusk',   bg: '#0b0814', glow: '#1c1030', core: '#fff0ff', cols: ['#b86bff', '#ff7be0', '#7d6bff', '#e29bff', '#ff5fae'] },
];

const FMTS = [
  { W: 1080, H: 1080, t: 'Square' },
  { W: 1000, H: 1240, t: 'Portrait' },
  { W: 1240, H: 1000, t: 'Landscape' },
];

const MOTIONS  = ['Loops', 'Spirals', 'Sweeps', 'Scribble']; // path personality
const DENSITY  = ['Sparse', 'Woven', 'Swarm'];               // trail count band
const BLOOM    = ['Tight', 'Soft', 'Halo'];                  // bloom width band

function paramsOf(r) {
  // FIXED DRAW ORDER — never reorder; traits depend on this.
  const palI    = Math.floor(r() * PALS.length);
  const fmt     = pick(FMTS, r);
  const motionI = Math.floor(r() * MOTIONS.length);
  const densI   = Math.floor(r() * DENSITY.length);
  const bloomI  = Math.floor(r() * BLOOM.length);

  // focal point (where energy concentrates)
  const fx = 0.30 + r() * 0.40;
  const fy = 0.30 + r() * 0.40;

  // trail count from density band
  const trailCount = densI === 0 ? rint(r, 5, 9) : densI === 1 ? rint(r, 10, 18) : rint(r, 19, 30);

  // bloom multiplier from band
  const bloomMul = bloomI === 0 ? 1.0 : bloomI === 1 ? 1.8 : 2.9;

  // global rotation / energy seeds
  const baseRot = r() * Math.PI * 2;
  const swirl   = (r() - 0.5) * 2.2;
  const sparkAmt = rint(r, 40, 140);
  const horizon = r() < 0.45; // faint ground glow band sometimes

  return { palI, fmt, motionI, densI, bloomI, fx, fy, trailCount, bloomMul, baseRot, swirl, sparkAmt, horizon };
}

function labels(p) {
  return {
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    Motion:  MOTIONS[p.motionI],
    Density: DENSITY[p.densI],
    Bloom:   BLOOM[p.bloomI],
  };
}

/* -------------------------------------------------------------------------- */
/* path generators — each returns an array of {x,y} points in [0,1] space     */
function genPath(motionI, r, cx, cy, swirl) {
  const pts = [];
  const N = 90 + Math.floor(r() * 90);
  if (motionI === 0) {
    // Loops — overlapping lissajous-ish closed-ish loops
    const a = 0.10 + r() * 0.26, b = 0.10 + r() * 0.26;
    const fa = 1 + Math.floor(r() * 3), fb = 1 + Math.floor(r() * 4);
    const ph = r() * Math.PI * 2, sp = 1 + r() * 2.4;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2 * sp;
      pts.push({ x: cx + a * Math.sin(fa * t + ph), y: cy + b * Math.sin(fb * t) });
    }
  } else if (motionI === 1) {
    // Spirals — radius grows while angle winds
    const turns = 2 + r() * 4, r0 = 0.01 + r() * 0.04, r1 = 0.18 + r() * 0.30;
    const dir = r() < 0.5 ? 1 : -1, off = r() * Math.PI * 2;
    for (let i = 0; i <= N; i++) {
      const t = i / N, ang = off + dir * t * turns * Math.PI * 2;
      const rad = r0 + (r1 - r0) * t;
      pts.push({ x: cx + rad * Math.cos(ang), y: cy + rad * Math.sin(ang) });
    }
  } else if (motionI === 2) {
    // Sweeps — a long arcing motion-blur streak across the frame
    const ang = r() * Math.PI * 2, len = 0.5 + r() * 0.6;
    const bow = (r() - 0.5) * 0.8;
    const sx = cx - Math.cos(ang) * len * 0.5, sy = cy - Math.sin(ang) * len * 0.5;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const bend = Math.sin(t * Math.PI) * bow;
      pts.push({ x: sx + Math.cos(ang) * len * t + nx * bend, y: sy + Math.sin(ang) * len * t + ny * bend });
    }
  } else {
    // Scribble — wandering walk with momentum (energetic light-graffiti)
    let x = cx + (r() - 0.5) * 0.3, y = cy + (r() - 0.5) * 0.3;
    let vx = (r() - 0.5) * 0.02, vy = (r() - 0.5) * 0.02;
    for (let i = 0; i <= N; i++) {
      pts.push({ x, y });
      vx += (randn(r)) * 0.006 + (cx - x) * 0.0009 * swirl;
      vy += (randn(r)) * 0.006 + (cy - y) * 0.0009 * swirl;
      vx = clamp(vx, -0.03, 0.03); vy = clamp(vy, -0.03, 0.03);
      x += vx; y += vy;
    }
  }
  return pts;
}

/* stroke a path with variable width + additive glow.  pass=0 bloom, pass=1 core */
function strokePath(x, pts, W, H, col, baseW, alpha, taper) {
  if (pts.length < 2) return;
  x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = col;
  // segment-by-segment so width can taper along the path
  for (let i = 1; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    // taper: thin at the ends, fat in the middle (motion energy)
    const env = taper ? (0.35 + 0.65 * Math.sin(t * Math.PI)) : 1;
    x.lineWidth = Math.max(0.4, baseW * env);
    x.globalAlpha = alpha * (taper ? (0.5 + 0.5 * Math.sin(t * Math.PI)) : 1);
    x.beginPath();
    x.moveTo(pts[i - 1].x * W, pts[i - 1].y * H);
    x.lineTo(pts[i].x * W, pts[i].y * H);
    x.stroke();
  }
  x.globalAlpha = 1;
}

/* -------------------------------------------------------------------------- */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);

  /* --- ground: deep night with a soft central glow & optional horizon --- */
  x.fillStyle = P.bg; x.fillRect(0, 0, W, H);
  // broad ambient glow toward focal point
  const gx = p.fx * W, gy = p.fy * H;
  const ag = x.createRadialGradient(gx, gy, 0, gx, gy, S * 0.9);
  ag.addColorStop(0, rgba(P.glow, 0.9));
  ag.addColorStop(0.5, rgba(P.glow, 0.32));
  ag.addColorStop(1, rgba(P.bg, 0));
  x.fillStyle = ag; x.fillRect(0, 0, W, H);

  if (p.horizon) {
    const hy = H * (0.62 + r() * 0.18);
    const hg = x.createLinearGradient(0, hy - H * 0.18, 0, hy + H * 0.06);
    hg.addColorStop(0, rgba(P.bg, 0));
    hg.addColorStop(1, rgba(mix(P.glow, P.cols[0], 0.4), 0.5));
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = hg; x.fillRect(0, hy - H * 0.18, W, H * 0.24);
    x.restore();
  }

  // faint mottled atmosphere so it never reads flat
  mottle(x, 0, 0, W, H, P.glow, 900, r, 'overlay');

  /* --- the light trails: additive bloom then bright cores --- */
  x.save();
  x.globalCompositeOperation = 'lighter';

  // build all paths first (so cores sit over all bloom uniformly)
  const paths = [];
  for (let i = 0; i < p.trailCount; i++) {
    // each trail clusters near focal point but spreads out
    const spread = 0.06 + r() * 0.34;
    const cx = clamp(p.fx + (r() - 0.5) * spread * 2, 0.08, 0.92);
    const cy = clamp(p.fy + (r() - 0.5) * spread * 2, 0.08, 0.92);
    const motion = (r() < 0.78) ? p.motionI : Math.floor(r() * MOTIONS.length); // mostly cohesive, some variety
    const col = pick(P.cols, r);
    const baseW = (0.7 + r() * 2.6) * (S / 1080);
    paths.push({ pts: genPath(motion, r, cx, cy, p.swirl), col, baseW });
  }

  // PASS 1 — wide soft bloom halos (low alpha, big width)
  for (const pa of paths) {
    const haloW = pa.baseW * (4.5 * p.bloomMul);
    strokePath(x, pa.pts, W, H, rgba(pa.col, 1), haloW, 0.05, true);
    strokePath(x, pa.pts, W, H, rgba(pa.col, 1), haloW * 0.55, 0.09, true);
  }
  // PASS 2 — mid glow (saturated colour)
  for (const pa of paths) {
    strokePath(x, pa.pts, W, H, rgba(mix(pa.col, '#ffffff', 0.15), 1), pa.baseW * 1.9, 0.5, true);
  }
  // PASS 3 — bright near-white core (thin)
  for (const pa of paths) {
    const core = mix(pa.col, P.core, 0.7);
    strokePath(x, pa.pts, W, H, rgba(core, 1), Math.max(0.6, pa.baseW * 0.7), 0.95, true);
  }

  /* --- sparks: tiny additive points with a hot core, clustered on trails --- */
  for (let i = 0; i < p.sparkAmt; i++) {
    let px, py, col;
    if (paths.length && r() < 0.7) {
      const pa = pick(paths, r);
      const pt = pa.pts[Math.floor(r() * pa.pts.length)];
      px = pt.x * W + randn(r) * S * 0.02;
      py = pt.y * H + randn(r) * S * 0.02;
      col = pa.col;
    } else {
      px = r() * W; py = r() * H; col = pick(P.cols, r);
    }
    const rad = (0.5 + Math.abs(randn(r)) * 3.2) * (S / 1080);
    const sg = x.createRadialGradient(px, py, 0, px, py, rad * 4);
    sg.addColorStop(0, rgba(P.core, 0.95));
    sg.addColorStop(0.25, rgba(mix(col, P.core, 0.5), 0.7));
    sg.addColorStop(1, rgba(col, 0));
    x.fillStyle = sg;
    x.beginPath(); x.arc(px, py, rad * 4, 0, Math.PI * 2); x.fill();
    // hot pinpoint
    x.fillStyle = rgba(P.core, 0.95);
    x.beginPath(); x.arc(px, py, rad * 0.6, 0, Math.PI * 2); x.fill();
  }

  // a few bright star-burst flares at the brightest knots
  const flares = rint(r, 1, 4);
  for (let i = 0; i < flares; i++) {
    const pa = paths.length ? pick(paths, r) : null;
    const pt = pa ? pa.pts[Math.floor(r() * pa.pts.length)] : { x: p.fx, y: p.fy };
    const px = pt.x * W, py = pt.y * H;
    const col = pa ? pa.col : pick(P.cols, r);
    const len = (12 + r() * 40) * (S / 1080);
    x.strokeStyle = rgba(P.core, 0.8); x.lineCap = 'round';
    const spikes = pick([4, 4, 6], r);
    for (let s = 0; s < spikes; s++) {
      const a = (s / spikes) * Math.PI * 2 + r() * 0.4;
      x.lineWidth = 1.2; x.globalAlpha = 0.8;
      x.beginPath(); x.moveTo(px, py);
      x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    }
    x.globalAlpha = 1;
    const cg = x.createRadialGradient(px, py, 0, px, py, len * 0.7);
    cg.addColorStop(0, rgba(P.core, 0.95));
    cg.addColorStop(0.4, rgba(mix(col, P.core, 0.5), 0.5));
    cg.addColorStop(1, rgba(col, 0));
    x.fillStyle = cg; x.beginPath(); x.arc(px, py, len * 0.7, 0, Math.PI * 2); x.fill();
  }

  x.restore();

  /* --- photographic finish --- */
  grain(x, W, H, 1200, r);
  vignette(x, W, H, 0.45);
}

export const longExpTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));
export const longExpSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map(p => p.name) },
    { name: 'Format',  values: ['Square', 'Portrait', 'Landscape'] },
    { name: 'Motion',  values: MOTIONS.slice() },
    { name: 'Density', values: DENSITY.slice() },
    { name: 'Bloom',   values: BLOOM.slice() },
  ],
};
export const renderLongExp: EngineFn = blit(draw, longExpTraits);
export const LONGEXP_ASPECTS = [1, 0.81, 1.24] as const;
