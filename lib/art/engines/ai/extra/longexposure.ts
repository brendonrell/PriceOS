// @ts-nocheck
/*
 * LongExp — "Long Exposure" by shellcount-ai.
 * Long-exposure LIGHT TRAILS / light-painting on a night ground. The premise
 * is the frame FILLING WITH ACCUMULATED LIGHT: many overlapping trails, each
 * rendered in several additive passes — a wide soft bloom halo, a mid glow,
 * and a thin near-white core — drawn with 'lighter' so light builds into mass.
 * One HERO trail leads, composed around a phi anchor (centre of gravity), not a
 * random scatter. Trails sit IN a medium: a grainy night haze tinted with the
 * page colorway #0b0a14, a low horizon glow, a faint star field. Each trail has
 * a bright head and a fading, tapering tail; spark bursts punctuate the knots.
 *
 * Deterministic from seed only — no Date/Math.random/network/DOM beyond canvas.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ---------------------------------------------------------------------------
 * Palettes — each a distinct long-exposure identity. Colours are OFF-PRIMARY:
 * the page violet #0b0a14 tints the haze; halos carry the hue; cores go
 * near-white. `bg` deep night, `haze` the tint that fills the air, `core` the
 * hot near-white centre, `cols` the trail hues, `accent` a contrast spark hue.
 * ------------------------------------------------------------------------- */
const PALS = [
  { name: 'Tungsten City', bg: '#0b0a14', haze: '#1a130c', core: '#fff4dc', accent: '#9fd0ff',
    cols: ['#ffb347', '#ff8c2e', '#ffce7a', '#e0701c', '#ffd9a0'] },
  { name: 'Sodium Glow',   bg: '#0c0810', haze: '#21150a', core: '#fff0d0', accent: '#ff5e7a',
    cols: ['#ffa028', '#ff7b1c', '#ffc24d', '#d65a14', '#ffd87a'] },
  { name: 'Neon Mixed',    bg: '#08060f', haze: '#160a26', core: '#ffffff', accent: '#37ff9a',
    cols: ['#ff2bd6', '#26e0ff', '#7a4bff', '#ff4f8b', '#46baff'] },
  { name: 'Astro Blue',    bg: '#060912', haze: '#0c1424', core: '#f4fbff', accent: '#ffd27a',
    cols: ['#8fd0ff', '#aebfff', '#cfe6ff', '#6e9cff', '#bfe9ff'] },
  { name: 'Dusty Rose',    bg: '#0d0810', haze: '#1d1018', core: '#fff0f4', accent: '#9fd0ff',
    cols: ['#ff8fb0', '#e07a9c', '#ffb6c8', '#c96f99', '#ffcdd8'] },
  { name: 'Ember Drift',   bg: '#0d0606', haze: '#240b06', core: '#fff1da', accent: '#7fd0ff',
    cols: ['#ff5a1c', '#ff8c3a', '#ffb267', '#e23a12', '#ffd29a'] },
  { name: 'Magnesium',     bg: '#0a0a12', haze: '#15151f', core: '#ffffff', accent: '#bcd0ff',
    cols: ['#eaf2ff', '#cfe0ff', '#ffffff', '#bcd0ff', '#dfe8ff'] },
  { name: 'Violet Dusk',   bg: '#0b0814', haze: '#1c1030', core: '#fff0ff', accent: '#7affd0',
    cols: ['#b86bff', '#ff7be0', '#9a8cff', '#e29bff', '#ff5fae'] },
];

const FMTS = [
  { W: 1080, H: 1080, t: 'Square' },
  { W: 1000, H: 1240, t: 'Portrait' },
  { W: 1240, H: 1000, t: 'Landscape' },
];

// path personality. 'Star Trails' = concentric arcs around a pole.
const MOTIONS  = ['Loops', 'Spirals', 'Sweeps', 'Scribble', 'Star Trails'];
const DENSITY  = ['Woven', 'Swarm', 'Saturated']; // trail-count bands — floored, never sparse
const BLOOM    = ['Tight', 'Soft', 'Halo'];       // bloom width band

function paramsOf(r) {
  // FIXED DRAW ORDER — never reorder; traits depend on this.
  const palI    = Math.floor(r() * PALS.length);
  const fmt      = pick(FMTS, r);
  const motionI  = Math.floor(r() * MOTIONS.length);
  const densI    = Math.floor(r() * DENSITY.length);
  const bloomI   = Math.floor(r() * BLOOM.length);

  // centre of gravity — phi anchor, biased toward a golden-ratio point, then
  // nudged. Composition orbits THIS, not a uniform scatter.
  const corner = pick([INVPHI, 1 - INVPHI], r);
  const fx = clamp(corner + (r() - 0.5) * 0.18, 0.24, 0.76);
  const fy = clamp((r() < 0.5 ? INVPHI : 1 - INVPHI) + (r() - 0.5) * 0.18, 0.24, 0.76);

  // DENSITY FLOOR — even the lowest band is dense. No bare seeds, ever.
  // Star Trails reads thinner per-arc, so it gets a count boost below.
  const starMode = motionI === 4;
  const base0 = starMode ? rint(r, 26, 34) : rint(r, 16, 22);
  const base1 = starMode ? rint(r, 35, 46) : rint(r, 23, 32);
  const base2 = starMode ? rint(r, 47, 62) : rint(r, 33, 46);
  const trailCount = densI === 0 ? base0 : densI === 1 ? base1 : base2;

  // bloom multiplier from band
  const bloomMul = bloomI === 0 ? 1.3 : bloomI === 1 ? 2.1 : 3.2;

  // global rotation / energy seeds
  const baseRot  = r() * Math.PI * 2;
  const swirl    = (r() - 0.5) * 2.2;
  const sparkAmt = rint(r, 160, 320);
  const horizon  = r() < 0.55;          // low horizon glow band
  const stars    = rint(r, 120, 260);   // faint star field count

  // hero trail tint + a slight global hue bias so the colourway reads cohesive
  const heroMotion = (r() < 0.6) ? motionI : Math.floor(r() * MOTIONS.length);

  return { palI, fmt, motionI, densI, bloomI, fx, fy, trailCount, bloomMul,
           baseRot, swirl, sparkAmt, horizon, stars, heroMotion };
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

/* ---------------------------------------------------------------------------
 * Path generators — each returns points in [0,1] space plus a per-point energy
 * (head bright → tail faded). The trail's HEAD is point 0.
 * scaleMul lets the hero trail run longer/wider.
 * ------------------------------------------------------------------------- */
function genPath(motionI, r, cx, cy, swirl, scaleMul, pole) {
  const pts = [];
  const N = 80 + Math.floor(r() * 90);
  const sc = scaleMul || 1;
  if (motionI === 0) {
    // Loops — lissajous-ish looping ribbons
    const a = (0.10 + r() * 0.24) * sc, b = (0.10 + r() * 0.24) * sc;
    const fa = 1 + Math.floor(r() * 3), fb = 1 + Math.floor(r() * 4);
    const ph = r() * Math.PI * 2, sp = 1 + r() * 2.2;
    for (let i = 0; i <= N; i++) {
      const t = (i / N) * Math.PI * 2 * sp;
      pts.push({ x: cx + a * Math.sin(fa * t + ph), y: cy + b * Math.sin(fb * t) });
    }
  } else if (motionI === 1) {
    // Spirals — radius grows while angle winds
    const turns = 2 + r() * 4, r0 = 0.01 + r() * 0.03, r1 = (0.16 + r() * 0.26) * sc;
    const dir = r() < 0.5 ? 1 : -1, off = r() * Math.PI * 2;
    for (let i = 0; i <= N; i++) {
      const t = i / N, ang = off + dir * t * turns * Math.PI * 2;
      const rad = r0 + (r1 - r0) * t;
      pts.push({ x: cx + rad * Math.cos(ang), y: cy + rad * Math.sin(ang) });
    }
  } else if (motionI === 2) {
    // Sweeps — long arcing motion-blur streak
    const ang = r() * Math.PI * 2, len = (0.5 + r() * 0.6) * sc;
    const bow = (r() - 0.5) * 0.8;
    const sx = cx - Math.cos(ang) * len * 0.5, sy = cy - Math.sin(ang) * len * 0.5;
    const nx = -Math.sin(ang), ny = Math.cos(ang);
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const bend = Math.sin(t * Math.PI) * bow;
      pts.push({ x: sx + Math.cos(ang) * len * t + nx * bend, y: sy + Math.sin(ang) * len * t + ny * bend });
    }
  } else if (motionI === 4) {
    // Star Trails — a concentric arc around the celestial pole. Each trail is a
    // partial circle at its own radius; together they read as star-trail rings.
    const rad = (0.06 + r() * 0.5) * sc;
    const span = (0.5 + r() * 1.6) * (0.7 + (1 - rad)); // inner arcs sweep wider
    const off = r() * Math.PI * 2;
    const dir = 1; // all same direction — coherent rotation
    for (let i = 0; i <= N; i++) {
      const t = i / N, ang = off + dir * t * span;
      pts.push({ x: pole.x + rad * Math.cos(ang), y: pole.y + rad * Math.sin(ang) });
    }
  } else {
    // Scribble — wandering walk with momentum, pulled toward centre of gravity
    let x = cx + (r() - 0.5) * 0.28 * sc, y = cy + (r() - 0.5) * 0.28 * sc;
    let vx = (r() - 0.5) * 0.02, vy = (r() - 0.5) * 0.02;
    for (let i = 0; i <= N; i++) {
      pts.push({ x, y });
      vx += randn(r) * 0.006 + (cx - x) * 0.0010 * swirl;
      vy += randn(r) * 0.006 + (cy - y) * 0.0010 * swirl;
      vx = clamp(vx, -0.03, 0.03); vy = clamp(vy, -0.03, 0.03);
      x += vx; y += vy;
    }
  }
  return pts;
}

/* Stroke a path additively with width that tapers and energy that fades along
 * its length — a long-exposure trail has a bright HEAD and a fading TAIL.
 * widthMul scales width; alpha is the peak; col is the stroke colour. */
function strokeTrail(x, pts, W, H, col, baseW, alpha) {
  if (pts.length < 2) return;
  x.lineJoin = 'round'; x.lineCap = 'round'; x.strokeStyle = col;
  for (let i = 1; i < pts.length; i++) {
    const t = i / (pts.length - 1);
    // head bright (t→0), tail fade (t→1); plus a mid swell for motion energy
    const headFade = 0.35 + 0.65 * (1 - t);
    const swell    = 0.55 + 0.45 * Math.sin(t * Math.PI);
    x.lineWidth = Math.max(0.4, baseW * (0.4 + 0.6 * swell));
    x.globalAlpha = alpha * headFade * swell;
    x.beginPath();
    x.moveTo(pts[i - 1].x * W, pts[i - 1].y * H);
    x.lineTo(pts[i].x * W, pts[i].y * H);
    x.stroke();
  }
  x.globalAlpha = 1;
}

/* A soft radial glow blob (used for sparks, the hero head, ambient knots). */
function glowDot(x, px, py, rad, inner, outer) {
  const g = x.createRadialGradient(px, py, 0, px, py, rad);
  g.addColorStop(0, inner);
  g.addColorStop(0.3, outer.mid);
  g.addColorStop(1, outer.edge);
  x.fillStyle = g;
  x.beginPath(); x.arc(px, py, rad, 0, Math.PI * 2); x.fill();
}

/* -------------------------------------------------------------------------- */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);
  const k = S / 1080; // scale factor vs reference

  /* === GROUND: deep night, tinted haze, ambient glow, horizon === */
  x.fillStyle = P.bg; x.fillRect(0, 0, W, H);

  // page-violet wash so #0b0a14 tints the air even in non-violet palettes
  x.save(); x.globalCompositeOperation = 'lighter';
  const pageWash = x.createRadialGradient(W * 0.5, H * 0.5, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.8);
  pageWash.addColorStop(0, rgba('#0b0a14', 0.0));
  pageWash.addColorStop(1, rgba('#0b0a14', 0.55));
  x.fillStyle = pageWash; x.fillRect(0, 0, W, H);
  x.restore();

  // broad ambient haze concentrated toward the centre of gravity
  const gx = p.fx * W, gy = p.fy * H;
  x.save(); x.globalCompositeOperation = 'lighter';
  const ag = x.createRadialGradient(gx, gy, 0, gx, gy, S * 1.05);
  ag.addColorStop(0, rgba(P.haze, 0.75));
  ag.addColorStop(0.45, rgba(mix(P.haze, P.bg, 0.5), 0.30));
  ag.addColorStop(1, rgba(P.bg, 0));
  x.fillStyle = ag; x.fillRect(0, 0, W, H);
  x.restore();

  // low horizon glow band — grounds "night"
  if (p.horizon) {
    const hy = H * (0.66 + r() * 0.16);
    const hg = x.createLinearGradient(0, hy - H * 0.26, 0, hy + H * 0.04);
    hg.addColorStop(0, rgba(P.bg, 0));
    hg.addColorStop(0.7, rgba(mix(P.haze, P.cols[0], 0.35), 0.28));
    hg.addColorStop(1, rgba(mix(P.haze, P.cols[0], 0.55), 0.5));
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = hg; x.fillRect(0, hy - H * 0.26, W, H * 0.3);
    x.restore();
  }

  // faint star field — distant pinpoints sitting in the haze
  x.save(); x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < p.stars; i++) {
    const sx = r() * W, sy = r() * H * (p.horizon ? 0.72 : 1);
    const sr = (0.3 + Math.abs(randn(r)) * 0.9) * k;
    const a = 0.10 + r() * 0.35;
    x.fillStyle = rgba(mix(P.core, P.accent, r() * 0.5), a);
    x.beginPath(); x.arc(sx, sy, sr, 0, Math.PI * 2); x.fill();
  }
  x.restore();

  // grainy mottled atmosphere so the air never reads flat
  mottle(x, 0, 0, W, H, P.haze, 700, r, 'overlay');

  /* === THE LIGHT TRAILS === */
  // celestial pole for Star Trails mode — just off-frame for sweeping arcs
  const pole = { x: clamp(p.fx + (r() - 0.5) * 0.3, 0.15, 0.85),
                 y: clamp(p.fy + (r() - 0.5) * 0.3, 0.15, 0.85) };

  // build all trails up front so passes layer uniformly
  const trails = [];
  for (let i = 0; i < p.trailCount; i++) {
    const spread = 0.05 + r() * 0.32;
    const cx = clamp(p.fx + (r() - 0.5) * spread * 2, 0.08, 0.92);
    const cy = clamp(p.fy + (r() - 0.5) * spread * 2, 0.08, 0.92);
    // mostly cohesive motion, some variety
    const motion = (r() < 0.8) ? p.motionI : Math.floor(r() * MOTIONS.length);
    const col = pick(P.cols, r);
    const baseW = (0.6 + r() * 2.2) * k;
    trails.push({ pts: genPath(motion, r, cx, cy, p.swirl, 1, pole), col, baseW, hero: false });
  }

  // HERO trail — one clear lead: longer, brighter, thicker, near centre of gravity
  {
    const hcol = pick(P.cols, r);
    const hero = {
      pts: genPath(p.heroMotion, r, p.fx, p.fy, p.swirl, 1.5, pole),
      col: hcol, baseW: (3.0 + r() * 2.0) * k, hero: true,
    };
    trails.push(hero);
  }

  x.save();
  x.globalCompositeOperation = 'lighter';

  // PASS 1 — wide soft bloom halos (low alpha, big width) → light accumulates
  for (const tr of trails) {
    const m = tr.hero ? 1.4 : 1;
    const haloW = tr.baseW * (4.2 * p.bloomMul) * m;
    strokeTrail(x, tr.pts, W, H, rgba(tr.col, 1), haloW, 0.045 * m);
    strokeTrail(x, tr.pts, W, H, rgba(tr.col, 1), haloW * 0.55, 0.08 * m);
  }
  // PASS 2 — mid glow (saturated hue, lifted slightly toward white)
  for (const tr of trails) {
    const m = tr.hero ? 1.5 : 1;
    strokeTrail(x, tr.pts, W, H, rgba(mix(tr.col, '#ffffff', 0.18), 1), tr.baseW * 1.9 * (tr.hero ? 1.3 : 1), 0.5 * m);
  }
  // PASS 3 — thin near-white core (the hottest filament)
  for (const tr of trails) {
    const core = mix(tr.col, P.core, tr.hero ? 0.82 : 0.7);
    strokeTrail(x, tr.pts, W, H, rgba(core, 1), Math.max(0.6, tr.baseW * (tr.hero ? 0.85 : 0.65)), tr.hero ? 1.0 : 0.92);
  }

  // hero HEAD — a bright glowing bulb at the start of the lead trail
  {
    const hero = trails[trails.length - 1];
    const hp = hero.pts[0];
    const hx = hp.x * W, hy = hp.y * H;
    const rad = (10 + r() * 8) * k;
    glowDot(x, hx, hy, rad * 3, rgba(P.core, 0.95),
      { mid: rgba(mix(hero.col, P.core, 0.5), 0.6), edge: rgba(hero.col, 0) });
    x.fillStyle = rgba(P.core, 0.95);
    x.beginPath(); x.arc(hx, hy, rad * 0.5, 0, Math.PI * 2); x.fill();
  }

  /* === SPARKS — hot pinpoints with a soft halo, clustered on trails === */
  for (let i = 0; i < p.sparkAmt; i++) {
    let px, py, col;
    if (r() < 0.75) {
      const tr = pick(trails, r);
      const pt = tr.pts[Math.floor(r() * tr.pts.length)];
      px = pt.x * W + randn(r) * S * 0.02;
      py = pt.y * H + randn(r) * S * 0.02;
      col = tr.col;
    } else {
      px = r() * W; py = r() * H; col = pick(P.cols, r);
    }
    const rad = (0.4 + Math.abs(randn(r)) * 2.6) * k;
    glowDot(x, px, py, rad * 4, rgba(P.core, 0.9),
      { mid: rgba(mix(col, P.core, 0.5), 0.65), edge: rgba(col, 0) });
    x.fillStyle = rgba(P.core, 0.9);
    x.beginPath(); x.arc(px, py, rad * 0.55, 0, Math.PI * 2); x.fill();
  }

  /* === SPARK BURSTS — a few bright star-flares at the brightest knots === */
  const flares = rint(r, 2, 5);
  for (let i = 0; i < flares; i++) {
    const tr = pick(trails, r);
    const pt = tr.pts[Math.floor(r() * tr.pts.length)];
    const px = pt.x * W, py = pt.y * H;
    const col = tr.col;
    const len = (14 + r() * 44) * k;
    x.strokeStyle = rgba(P.core, 0.85); x.lineCap = 'round';
    const spikes = pick([4, 4, 6], r);
    for (let s = 0; s < spikes; s++) {
      const a = (s / spikes) * Math.PI * 2 + r() * 0.4;
      x.lineWidth = 1.2 * k; x.globalAlpha = 0.8;
      x.beginPath(); x.moveTo(px, py);
      x.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len); x.stroke();
    }
    x.globalAlpha = 1;
    glowDot(x, px, py, len * 0.75, rgba(P.core, 0.95),
      { mid: rgba(mix(col, P.core, 0.5), 0.5), edge: rgba(col, 0) });
  }

  x.restore();

  /* === PHOTOGRAPHIC FINISH === */
  grain(x, W, H, 1100, r);
  vignette(x, W, H, 0.5);
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
