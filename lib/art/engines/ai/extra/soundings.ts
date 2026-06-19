// @ts-nocheck
/*
 * SOUNDINGS — Direction A ("Sonar"), by fathom-ai.
 *
 * A bathymetric depth instrument with a PUNCHY NEON INSTRUMENT GLOW: vivid CRT
 * phosphor traces, ping returns, seabed contours, clustered contacts and
 * labelled callouts. Nautical / sounding instrument — NOT space.
 *
 * v3 (2026-06-19): COMPOSITION is now a primary trait. `Layout` has 6
 * structurally different arrangements — only ONE (Scope) is a centred-ish
 * circle, and even it sits on a phi point with a long off-centre sweep. The
 * other five abandon the centred disc entirely: a hard-cropped edge arc, a
 * horizontal waterfall strip-chart (no circle), a top-down bathymetric depth
 * chart (no circle), twin dials on opposite thirds, and a near-empty deep
 * field with a single labelled target and a corner dial. Palettes shift the
 * dominant glow hue hard (11 of them — 9 vivid dark-ground scopes + 2 light
 * "paper chart" grounds) with one restrained second accent each.
 *
 * Deterministic from seed only. Additive 'screen'/'lighter' glow for the
 * luminous returns over the dark sea; radial gradients for ping decay.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ── Palettes ─────────────────────────────────────────────────────────────
   ground = sea/face base (a saturated dark tint of the glow hue, or a pale
   paper ground on the two chart palettes),
   deep = far-field tint, phos = the dominant luminous trace (kept bright +
   saturated so screen/lighter blends POP), hot = blip/sweep-edge highlight,
   grid = gridline/contour tint, accent = the ONE restrained second colour
   used sparingly on labels + a few contacts. 11 palettes — 9 vivid
   dark-ground glow scopes + 2 light "paper chart" grounds for contrast. */
const PALS = [
  // ── DARK-GROUND GLOW SCOPES — each a strong, distinct, high-luminance hue ──
  { name: 'Phosphor Green', ground: '#031a12', deep: '#063a24', phos: '#38ff84', hot: '#ccffd0', grid: '#1fa05c', accent: '#ffd24a' },
  { name: 'Sodium Amber',   ground: '#1a0e02', deep: '#3a2204', phos: '#ffae18', hot: '#ffe9a0', grid: '#c47a14', accent: '#34e0ff' },
  { name: 'Bright Cyan',    ground: '#031622', deep: '#063646', phos: '#1ad8ff', hot: '#c8fbff', grid: '#1f9ec4', accent: '#ff7ad0' },
  { name: 'Magenta Lab',    ground: '#16021a', deep: '#360940', phos: '#ff3ce0', hot: '#ffc4f6', grid: '#b22aa0', accent: '#46ffd0' },
  { name: 'Ice Blue',       ground: '#040e22', deep: '#0a2456', phos: '#5aa8ff', hot: '#e0eeff', grid: '#3a6cd8', accent: '#ffcf4a' },
  { name: 'Lime Scope',     ground: '#0c1602', deep: '#1e3604', phos: '#b6ff1f', hot: '#eaffb0', grid: '#7ac414', accent: '#ff4fa0' },
  { name: 'Sodium on Navy', ground: '#050a26', deep: '#0a165a', phos: '#ffb22c', hot: '#ffdca0', grid: '#3450c0', accent: '#5ad8ff' },
  { name: 'Red Alert',      ground: '#1a0404', deep: '#3a0808', phos: '#ff4438', hot: '#ffc0a0', grid: '#c43020', accent: '#ffd24a' },
  { name: 'Violet Sweep',   ground: '#0c0626', deep: '#1e125a', phos: '#9a6cff', hot: '#dccaff', grid: '#6a48d8', accent: '#46ffc8' },
  // ── LIGHT "PAPER CHART" GROUNDS — pale ground, vivid saturated ink traces ──
  { name: 'Sea Chart',      ground: '#e8e2cc', deep: '#cdd8c0', phos: '#0aa05a', hot: '#ff7a28', grid: '#3a7a8a', accent: '#d03020' },
  { name: 'Amber Paper',    ground: '#efe4c4', deep: '#e0cda0', phos: '#d0481a', hot: '#1a90c0', grid: '#a06a2a', accent: '#1aa050' },
];

const FMTS = [
  { W: 1180, H: 1180, t: 'Square' },
  { W: 1040, H: 1300, t: 'Portrait' },
  { W: 1300, H: 1040, t: 'Landscape' },
];

/* COMPOSITION — the primary trait. 6 structurally different arrangements. */
const LAYOUTS = ['Scope', 'Edge Arc', 'Waterfall', 'Bathymetric Chart', 'Twin Dials', 'Deep Field'];
/* Contact density buckets. */
const DENS = ['Sparse', 'Scattered', 'Swarm'];
/* Returned depth band. */
const DEPTHS = ['Shelf', 'Slope', 'Trench'];

/* Short labelled-contact callouts for instrument feel (deterministic pick). */
const CALLS = ['CT-1', 'CT-2', 'CT-3', 'CT-4', 'WRK', 'BIO', 'PNGR', 'ANOM', 'SHL', 'REEF', 'HULL', 'TGT'];

function paramsOf(r) {
  // FIXED DRAW ORDER — labels() and the schema enumerate exactly these.
  const palI = Math.floor(r() * PALS.length);
  const fmt = pick(FMTS, r);
  const layoutI = Math.floor(r() * LAYOUTS.length);
  const densI = Math.floor(r() * DENS.length);
  const depthI = Math.floor(r() * DEPTHS.length);

  // ── Free composition params (NOT surfaced as traits) ──
  const sweepAng = r() * Math.PI * 2;                        // hero bearing
  const sweepDir = r() < 0.5 ? 1 : -1;
  const sectorSpan = 0.55 + r() * 0.9;
  const rings = rint(r, 6, 12);
  const pings = rint(r, 2, 4);
  const seabedAmp = 0.06 + r() * 0.13;
  const seabedBase = 0.58 + r() * 0.18;
  const seabedSeed = r() * 1000;
  const depthBands = rint(r, 4, 7);
  const gridStep = rint(r, 6, 9);
  const reticle = r() < 0.66;
  const noiseFloor = 0.35 + r() * 0.5;
  const clusters = rint(r, 1, 3);
  const contacts = densI === 0 ? rint(r, 5, 10) : densI === 1 ? rint(r, 14, 24) : rint(r, 34, 56);
  const labelN = rint(r, 1, 3);
  const labelPick = [pick(CALLS, r), pick(CALLS, r), pick(CALLS, r), pick(CALLS, r)];

  // Generic placement jitter pools (consumed regardless of layout for stable order).
  const jx = randn(r), jy = randn(r), corner = Math.floor(r() * 4);
  const edgeSide = Math.floor(r() * 4);                      // which edge/corner the arc hugs
  const scaleMul = 0.78 + r() * 0.5;                         // generic scope footprint
  const heroOff = (0.04 + r() * 0.14) * (r() < 0.5 ? 1 : -1);
  const heroPerp = (r() - 0.5) * 0.10;

  // ── Scope (Layout 0): one circle, on a phi point, off-centre sweep ──
  // Put the centre on a golden-ratio point (not dead-centre) and let it breathe.
  const phiX = r() < 0.5 ? INVPHI : 1 - INVPHI;             // ~0.382 / 0.618
  const phiY = r() < 0.5 ? INVPHI : 1 - INVPHI;
  const scopeCx = clamp(phiX + jx * 0.04, 0.3, 0.7);
  const scopeCy = clamp(phiY + jy * 0.04, 0.3, 0.7);
  const scopeR = 0.40 * (0.86 + scaleMul * 0.22);

  // ── Twin Dials (Layout 4): two scopes, opposite thirds, different scale ──
  const twinBigR = 0.30 * (0.9 + r() * 0.3);
  const twinSmallR = twinBigR * (0.45 + r() * 0.2);
  const twinSwap = r() < 0.5;                                // which third gets the big one

  // ── Deep Field (Layout 5): tiny corner dial + one labelled target ──
  const dfDialR = 0.10 + r() * 0.04;
  const dfDialCorner = Math.floor(r() * 4);
  const dfTargetX = 0.30 + r() * 0.40;
  const dfTargetY = 0.28 + r() * 0.44;

  return {
    palI, fmt, layoutI, densI, depthI,
    sweepAng, sweepDir, sectorSpan, rings, pings,
    seabedAmp, seabedBase, seabedSeed, depthBands, gridStep, reticle, noiseFloor,
    clusters, contacts, labelN, labelPick,
    jx, jy, corner, edgeSide, scaleMul, heroOff, heroPerp,
    phiX, phiY, scopeCx, scopeCy, scopeR,
    twinBigR, twinSmallR, twinSwap,
    dfDialR, dfDialCorner, dfTargetX, dfTargetY,
  };
}

function labels(p) {
  return {
    Palette: PALS[p.palI].name,
    Format: p.fmt.t,
    Layout: LAYOUTS[p.layoutI],
    Contacts: DENS[p.densI],
    Depth: DEPTHS[p.depthI],
  };
}

/* Small deterministic value-noise over an index, seeded per draw. */
function vnoise(i, seed) {
  const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/* Smooth periodic profile: sum of low harmonics so a contour undulates like a
   returned seabed line, NOT high-frequency spikes. Signed ~[-1,1] for angle a. */
function seabedProfile(a, seed) {
  let v = 0;
  v += Math.sin(a * 2 + seed * 1.7) * 0.55;
  v += Math.sin(a * 3 - seed * 0.9 + 1.3) * 0.30;
  v += Math.sin(a * 5 + seed * 2.3 + 2.1) * 0.14;
  v += Math.sin(a * 8 - seed * 1.1) * 0.06;
  return v;
}

/* ════════════════════════════════════════════════════════════════════════
   SHARED PAINT PRIMITIVES — all take explicit centre/radius so any layout
   can place a scope anywhere, at any scale.
   ════════════════════════════════════════════════════════════════════════ */

/* The deep ground gradient + frame-wide grit. Shared by every layout. */
function paintGround(x, W, H, P, r) {
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(P.ground, P.deep, 0.18));
  bg.addColorStop(0.55, P.ground);
  bg.addColorStop(1, mix(P.ground, '#000', 0.45));
  x.fillStyle = bg; x.fillRect(0, 0, W, H);
  mottle(x, 0, 0, W, H, P.deep, 1000, r, 'overlay');
  mottle(x, 0, 0, W, H, mix(P.deep, P.phos, 0.22), 2600, r, 'screen');
}

/* Frame-wide marine noise floor, biased toward a focal point. */
function paintNoiseFloor(x, W, H, P, r, fx, fy, fr, strength) {
  x.save();
  x.globalCompositeOperation = 'screen';
  const speck = Math.floor(W * H / 900 * strength);
  for (let i = 0; i < speck; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * fr * 1.25;
    const px = fx + Math.cos(a) * rr, py = fy + Math.sin(a) * rr;
    if (px < 0 || px > W || py < 0 || py > H) continue;
    x.fillStyle = rgba(mix(P.deep, P.phos, 0.32), 0.04 + r() * 0.10);
    x.fillRect(px, py, 1, 1 + (r() < 0.15 ? 1 : 0));
  }
  x.restore();
}

/* A full circular scope face: rings, spokes, pings, seabed contour, bezel,
   bearing ticks, origin glow. arc0/arc1 optionally clip to a wedge (Edge Arc).
   Returns nothing; draws in place. */
function paintScope(x, P, r, p, cx, cy, R, opts) {
  opts = opts || {};
  const arc0 = opts.arc0, arc1 = opts.arc1;          // optional visible wedge
  const wedge = (arc0 !== undefined && arc1 !== undefined);
  const withSweep = opts.sweep !== false;
  const withSeabed = opts.seabed !== false;
  const tickSpan = opts.tickSpan;                     // arc for bearing ticks
  const small = R < Math.min(opts.W || R * 3, opts.H || R * 3) * 0.18;

  // Deep radial bloom behind the face.
  const face = x.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 1.5);
  face.addColorStop(0, rgba(mix(P.deep, P.phos, 0.12), 0.5));
  face.addColorStop(0.55, rgba(P.deep, 0.28));
  face.addColorStop(1, 'rgba(0,0,0,0)');
  x.save();
  if (wedge) { x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R * 1.5, arc0, arc1); x.closePath(); x.clip(); }
  x.fillStyle = face; x.fillRect(cx - R * 1.5, cy - R * 1.5, R * 3, R * 3);
  x.restore();

  // Clip helper for the disc (or wedge).
  const clipFace = (fn) => {
    x.save();
    x.beginPath();
    if (wedge) { x.moveTo(cx, cy); x.arc(cx, cy, R, arc0, arc1); x.closePath(); }
    else x.arc(cx, cy, R, 0, Math.PI * 2);
    x.clip(); fn(); x.restore();
  };

  // Concentric ping rings.
  clipFace(() => {
    x.globalCompositeOperation = 'screen';
    for (let i = 1; i <= p.rings; i++) {
      const rad = R * (i / p.rings);
      x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2);
      const fade = 0.05 + 0.10 * (1 - i / p.rings);
      x.strokeStyle = rgba(P.grid, fade + 0.04);
      x.lineWidth = i % 2 === 0 ? 1.4 : 0.8; x.stroke();
    }
    // Radial spokes.
    for (let i = 0; i < p.gridStep; i++) {
      const a = (i / p.gridStep) * Math.PI * 2;
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      x.strokeStyle = rgba(P.grid, 0.07); x.lineWidth = 0.7; x.stroke();
    }
    // Phosphor grit + scanlines inside the face.
    mottle(x, cx - R, cy - R, R * 2, R * 2, mix(P.deep, P.phos, 0.3), 700, r, 'screen');
    x.globalCompositeOperation = 'overlay';
    for (let yy = cy - R; yy < cy + R; yy += 3) { x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(cx - R, yy, R * 2, 1); }
  });

  // Live expanding pings.
  clipFace(() => {
    x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < p.pings; k++) {
      const t = (k + 1) / (p.pings + 1);
      const rad = R * t;
      const g = x.createRadialGradient(cx, cy, Math.max(1, rad - R * 0.06), cx, cy, rad);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.7, rgba(P.phos, 0.05));
      g.addColorStop(1, rgba(P.hot, 0.22 * (1 - t * 0.5)));
      x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.lineWidth = 2.4; x.strokeStyle = g; x.stroke();
      x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2); x.strokeStyle = rgba(P.hot, 0.30 * (1 - t * 0.4)); x.lineWidth = 1.1; x.stroke();
    }
  });

  // Seabed contour bands.
  if (withSeabed) {
    const depthMul = p.depthI === 0 ? 0.78 : p.depthI === 1 ? 0.92 : 1.06;
    const baseR = R * clamp(p.seabedBase * depthMul, 0.4, 1.04);
    const contourAt = (frac, phase) => {
      const steps = 240;
      x.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const amp = seabedProfile(a, p.seabedSeed + phase);
        const rad = baseR * frac + amp * R * p.seabedAmp;
        const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
    };
    clipFace(() => {
      x.globalCompositeOperation = 'screen';
      for (let b = 0; b < p.depthBands; b++) {
        const frac = 1 - b * (0.13 + p.seabedAmp * 0.3);
        if (frac < 0.32) break;
        const g = x.createRadialGradient(cx, cy, baseR * frac * 0.55, cx, cy, baseR * frac);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, rgba(mix(P.deep, P.phos, 0.18 + b * 0.04), 0.12));
        contourAt(frac, b * 0.9); x.fillStyle = g; x.fill();
        contourAt(frac, b * 0.9);
        x.strokeStyle = rgba(b === 0 ? P.phos : P.grid, b === 0 ? 0.5 : 0.24);
        x.lineWidth = b === 0 ? 1.6 : 0.9; x.stroke();
      }
      contourAt(1, 0); x.strokeStyle = rgba(P.phos, 0.5); x.lineWidth = 1.6; x.stroke();
      contourAt(1, 0); x.strokeStyle = rgba(P.phos, 0.18); x.lineWidth = 5; x.stroke();
    });
  }

  // Off-centre HERO sweep.
  if (withSweep) {
    const hxc = cx + Math.cos(p.sweepAng + Math.PI / 2) * R * p.heroPerp + Math.cos(p.sweepAng) * R * p.heroOff;
    const hyc = cy + Math.sin(p.sweepAng + Math.PI / 2) * R * p.heroPerp + Math.sin(p.sweepAng) * R * p.heroOff;
    const sweepGlow = (a0, a1, alpha) => {
      const g = x.createRadialGradient(hxc, hyc, 0, hxc, hyc, R);
      g.addColorStop(0, rgba(P.hot, 0.0));
      g.addColorStop(0.15, rgba(P.phos, 0.10 * alpha));
      g.addColorStop(1, rgba(P.phos, 0.0));
      x.beginPath(); x.moveTo(hxc, hyc); x.arc(hxc, hyc, R * 1.3, a0, a1); x.closePath(); x.fillStyle = g; x.fill();
    };
    clipFace(() => {
      x.globalCompositeOperation = 'lighter';
      const span = 0.34;
      const a0 = wedge ? (arc0 + arc1) / 2 : p.sweepAng;
      const trail = small ? 5 : 9;
      for (let t = 0; t < trail; t++) {
        const back = p.sweepDir * (t * (span * 0.9));
        const e0 = a0 - back - span, e1 = a0 - back;
        sweepGlow(e1, e1 + span * 0.18, (1 - t / trail) * 0.6);
        sweepGlow(e0, e1, (1 - t / trail) * 0.5);
      }
      const hx = hxc + Math.cos(a0) * R * 1.25, hy = hyc + Math.sin(a0) * R * 1.25;
      x.strokeStyle = rgba(P.phos, 0.30); x.lineWidth = 11; x.beginPath(); x.moveTo(hxc, hyc); x.lineTo(hx, hy); x.stroke();
      x.strokeStyle = rgba(P.hot, 0.55); x.lineWidth = 4; x.beginPath(); x.moveTo(hxc, hyc); x.lineTo(hx, hy); x.stroke();
      x.strokeStyle = rgba('#ffffff', 0.9); x.lineWidth = 1.4; x.beginPath(); x.moveTo(hxc, hyc); x.lineTo(hx, hy); x.stroke();
      const beadR = R * (0.7 + 0.28 * vnoise(7, p.seabedSeed));
      const bxh = hxc + Math.cos(a0) * beadR, byh = hyc + Math.sin(a0) * beadR;
      const bg2 = x.createRadialGradient(bxh, byh, 0, bxh, byh, R * 0.07);
      bg2.addColorStop(0, rgba(P.hot, 0.95)); bg2.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = bg2; x.beginPath(); x.arc(bxh, byh, R * 0.07, 0, Math.PI * 2); x.fill();
    });
  }

  // Bearing reticle + ticks.
  clipFace(() => {
    x.globalCompositeOperation = 'screen';
    if (p.reticle && !wedge) {
      x.strokeStyle = rgba(P.grid, 0.5); x.lineWidth = 0.9;
      x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy);
      x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
    }
  });
  // Outer bezel ticks (along the full ring, or the visible arc only).
  x.save();
  x.globalCompositeOperation = 'screen';
  const tn = 72;
  for (let i = 0; i < tn; i++) {
    const a = (i / tn) * Math.PI * 2;
    if (tickSpan && (a < tickSpan[0] || a > tickSpan[1])) continue;
    const long = i % 6 === 0;
    const r0 = R * (long ? 0.93 : 0.97);
    x.beginPath();
    x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    x.strokeStyle = rgba(P.grid, long ? 0.6 : 0.3);
    x.lineWidth = long ? 1.1 : 0.6; x.stroke();
  }
  x.restore();

  // Origin glow + transducer dot.
  clipFace(() => {
    x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 0.10);
    g.addColorStop(0, rgba(P.hot, 0.8)); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 0.10, 0, Math.PI * 2); x.fill();
    x.fillStyle = rgba(P.hot, 0.95); x.beginPath(); x.arc(cx, cy, 2.4, 0, Math.PI * 2); x.fill();
  });

  // Bezel ring.
  x.save();
  x.globalCompositeOperation = 'screen';
  x.beginPath();
  if (wedge) { x.moveTo(cx, cy); x.arc(cx, cy, R, arc0, arc1); x.closePath(); }
  else x.arc(cx, cy, R, 0, Math.PI * 2);
  x.strokeStyle = rgba(P.phos, 0.5); x.lineWidth = 2; x.stroke();
  if (!wedge) {
    x.beginPath(); x.arc(cx, cy, R + 5, 0, Math.PI * 2);
    x.strokeStyle = rgba(P.grid, 0.4); x.lineWidth = 1; x.stroke();
    const pa = p.sweepAng;
    x.fillStyle = rgba(P.accent, 0.7);
    x.beginPath(); x.arc(cx + Math.cos(pa) * (R + 5), cy + Math.sin(pa) * (R + 5), 2.6, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* Clustered contacts/blips with bloom, scattered inside a region around a
   focal point. Returns the big-blip list (for labelling). */
function paintContacts(x, P, r, p, cx, cy, R, count, clipFn) {
  const clCx = [], clCy = [];
  for (let c = 0; c < p.clusters; c++) {
    const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.7) * R * 0.82;
    clCx.push(cx + Math.cos(a) * rr); clCy.push(cy + Math.sin(a) * rr);
  }
  const blips = [];
  const paint = () => {
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < count; i++) {
      let bx, by, a;
      if (r() < 0.7 && p.clusters > 0) {
        const ci = Math.floor(r() * p.clusters);
        const spread = R * (0.05 + r() * 0.12);
        bx = clCx[ci] + randn(r) * spread; by = clCy[ci] + randn(r) * spread;
        a = Math.atan2(by - cy, bx - cx);
      } else {
        a = r() * Math.PI * 2;
        const rr = Math.pow(r(), 0.7) * R * 0.98;
        bx = cx + Math.cos(a) * rr; by = cy + Math.sin(a) * rr;
      }
      const big = r() < 0.18;
      const sz = (big ? 3.4 + r() * 4 : 1.2 + r() * 2.2);
      const useAccent = r() < 0.14;
      const col = useAccent ? P.accent : (r() < 0.25 ? P.hot : P.phos);
      const g = x.createRadialGradient(bx, by, 0, bx, by, sz * 6);
      g.addColorStop(0, rgba(col, 0.9)); g.addColorStop(0.25, rgba(col, 0.4)); g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, sz * 6, 0, Math.PI * 2); x.fill();
      x.fillStyle = rgba(useAccent ? P.accent : P.hot, 0.95);
      x.beginPath(); x.arc(bx, by, Math.max(0.8, sz * 0.55), 0, Math.PI * 2); x.fill();
      if (big) {
        x.strokeStyle = rgba(col, 0.25); x.lineWidth = 1;
        x.beginPath(); x.moveTo(bx, by); x.lineTo(bx - Math.cos(a) * sz * 4, by - Math.sin(a) * sz * 4); x.stroke();
        blips.push({ bx, by, sz });
      }
    }
  };
  if (clipFn) { x.save(); clipFn(); paint(); x.restore(); } else { x.save(); paint(); x.restore(); }
  return blips;
}

/* Labelled callout: leader line + ring + mono text on a contact. */
function paintLabel(x, P, p, R, b, txt) {
  const dir = b.bx < (b.cx ?? b.bx) ? -1 : 1;
  const lx = b.bx + dir * (R * 0.10), ly = b.by - R * 0.06;
  x.save();
  x.globalCompositeOperation = 'screen';
  x.strokeStyle = rgba(P.accent, 0.5); x.lineWidth = 0.8;
  x.beginPath(); x.moveTo(b.bx, b.by); x.lineTo(lx, ly); x.stroke();
  x.beginPath(); x.arc(b.bx, b.by, Math.max(4, b.sz * 1.4), 0, Math.PI * 2);
  x.strokeStyle = rgba(P.accent, 0.45); x.stroke();
  x.font = `${Math.round(R * 0.028)}px monospace`;
  x.textAlign = dir < 0 ? 'end' : 'start';
  x.fillStyle = rgba(P.accent, 0.8);
  x.fillText(txt, lx + dir * 4, ly + 1);
  x.restore();
}

/* Frame-wide CRT scanline + texture passes. Shared closer. */
function paintFinish(x, W, H, P, r) {
  x.save();
  x.globalCompositeOperation = 'overlay';
  for (let yy = 0; yy < H; yy += 3) { x.fillStyle = 'rgba(0,0,0,0.10)'; x.fillRect(0, yy, W, 1); }
  x.restore();
  grain(x, W, H, 1200, r);
  vignette(x, W, H, 0.42);
}

/* ════════════════════════════════════════════════════════════════════════
   THE SIX LAYOUTS
   ════════════════════════════════════════════════════════════════════════ */

/* 0 — SCOPE: the classic round PPI scope on a phi point, scaled, with a long
   off-centre sweep. The ONE circular layout. */
function layoutScope(x, W, H, P, r, p) {
  const cx = W * p.scopeCx, cy = H * p.scopeCy;
  const R = Math.min(W, H) * p.scopeR;
  paintNoiseFloor(x, W, H, P, r, cx, cy, R, p.noiseFloor);
  paintScope(x, P, r, p, cx, cy, R, { W, H });
  const blips = paintContacts(x, P, r, p, cx, cy, R, p.contacts,
    () => { x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip(); });
  const n = Math.min(p.labelN, blips.length);
  for (let i = 0; i < n; i++) paintLabel(x, P, p, R, { ...blips[i], cx }, p.labelPick[i % 4]);
}

/* 1 — EDGE ARC: only a quadrant/half of a HUGE scope, cropped hard off a
   corner/edge. Bearing ticks along the visible arc. Frame is mostly open
   deep-water field with scattered contacts. NO centred circle. */
function layoutEdgeArc(x, W, H, P, r, p) {
  // Origin sits well off the frame in a corner; the arc sweeps across.
  const s = p.edgeSide;
  const cx = (s & 1) ? W * (1.05 + r() * 0.1) : W * (-0.05 - r() * 0.1);
  const cy = (s & 2) ? H * (1.05 + r() * 0.1) : H * (-0.05 - r() * 0.1);
  const R = Math.hypot(W, H) * (0.85 + r() * 0.25);
  // Visible wedge points back into the frame.
  const toCentre = Math.atan2(H * 0.5 - cy, W * 0.5 - cx);
  const half = 0.55 + r() * 0.35;                  // quadrant-ish to half
  const arc0 = toCentre - half, arc1 = toCentre + half;

  // Open deep-water field FIRST — scattered contacts across the whole frame.
  paintNoiseFloor(x, W, H, P, r, W * 0.5, H * 0.5, Math.max(W, H) * 0.6, p.noiseFloor * 0.8);
  const fieldN = Math.max(6, Math.floor(p.contacts * 0.7));
  const fieldBlips = [];
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < fieldN; i++) {
    const bx = r() * W, by = r() * H;
    const big = r() < 0.16;
    const sz = big ? 3 + r() * 3.5 : 1 + r() * 2;
    const col = r() < 0.14 ? P.accent : (r() < 0.25 ? P.hot : P.phos);
    const g = x.createRadialGradient(bx, by, 0, bx, by, sz * 6);
    g.addColorStop(0, rgba(col, 0.85)); g.addColorStop(0.25, rgba(col, 0.35)); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(bx, by, sz * 6, 0, Math.PI * 2); x.fill();
    x.fillStyle = rgba(P.hot, 0.9); x.beginPath(); x.arc(bx, by, Math.max(0.8, sz * 0.5), 0, Math.PI * 2); x.fill();
    if (big) fieldBlips.push({ bx, by, sz, cx: W * 0.5 });
  }
  x.restore();

  // The cropped arc — rings + bearing ticks along the visible arc, no full disc.
  paintScope(x, P, r, p, cx, cy, R, { W, H, arc0, arc1, seabed: false, tickSpan: [arc0 < 0 ? arc0 + Math.PI * 2 : arc0, arc1 < 0 ? arc1 + Math.PI * 2 : arc1] });

  // Label one or two field contacts.
  const n = Math.min(p.labelN, fieldBlips.length);
  for (let i = 0; i < n; i++) paintLabel(x, P, p, Math.min(W, H) * 0.4, fieldBlips[i], p.labelPick[i % 4]);
}

/* 2 — WATERFALL: horizontal A-scope / strip-chart. Stacked horizontal return
   bands + an amplitude trace. Landscape, banded. NO circle. */
function layoutWaterfall(x, W, H, P, r, p) {
  const bands = 14 + Math.floor(p.noiseFloor * 18);
  const top = H * 0.08, bottom = H * 0.92, fh = bottom - top;
  // Faint frame grid.
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i <= 10; i++) {
    const xx = W * (i / 10);
    x.strokeStyle = rgba(P.grid, 0.06); x.lineWidth = 0.7;
    x.beginPath(); x.moveTo(xx, top); x.lineTo(xx, bottom); x.stroke();
  }
  x.restore();

  // Stacked horizontal waterfall return bands — each a noisy intensity strip.
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let b = 0; b < bands; b++) {
    const yy = top + (b / bands) * fh;
    const bh = fh / bands;
    // Intensity of this band (a returning layer), brighter ones = hard returns.
    const base = 0.05 + 0.13 * vnoise(b * 1.3, p.seabedSeed);
    // Per-band horizontal modulation so it reads like a scrolling return.
    const seg = 90;
    for (let i = 0; i < seg; i++) {
      const u = i / seg;
      const inten = base * (0.5 + 0.9 * vnoise(b * 3.1 + i * 0.7, p.seabedSeed + 2));
      const hard = vnoise(b * 5.0 + i * 1.1, p.seabedSeed + 7) > 0.86;
      x.fillStyle = rgba(hard ? P.hot : P.phos, clamp(inten, 0, 0.5));
      x.fillRect(W * u, yy, W / seg + 1, bh + 0.5);
    }
  }
  x.restore();

  // A bright amplitude trace running across (the live sounder line).
  x.save();
  x.globalCompositeOperation = 'lighter';
  const steps = 360;
  const y0 = top + fh * (0.42 + 0.16 * vnoise(99, p.seabedSeed));
  const amp = fh * 0.16;
  const peaks = [];
  for (let k = 0; k < 5; k++) peaks.push({ pos: vnoise(k * 1.7, p.seabedSeed + 4), h: 0.7 + vnoise(k * 3.1, p.seabedSeed + 6) });
  const traceY = (u) => {
    let a = 0;
    a += Math.sin(u * Math.PI * 4 + p.seabedSeed) * 0.5;
    a += Math.sin(u * Math.PI * 9 - p.seabedSeed * 1.3) * 0.22;
    for (const pk of peaks) { const d = u - pk.pos; a -= pk.h * Math.exp(-(d * d) / 0.0009); }
    return y0 + a * amp;
  };
  x.beginPath();
  for (let i = 0; i <= steps; i++) { const u = i / steps, fx = W * u, fy = traceY(u); if (i === 0) x.moveTo(fx, fy); else x.lineTo(fx, fy); }
  x.strokeStyle = rgba(P.phos, 0.7); x.lineWidth = 1.8; x.stroke();
  x.strokeStyle = rgba(P.phos, 0.22); x.lineWidth = 6; x.stroke();
  // Contact beads riding on the trace peaks.
  for (const pk of peaks) {
    const u = pk.pos, bx = W * u, by = traceY(u);
    const g = x.createRadialGradient(bx, by, 0, bx, by, 14);
    g.addColorStop(0, rgba(P.hot, 0.95)); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(bx, by, 14, 0, Math.PI * 2); x.fill();
  }
  x.restore();

  // Baseline + a depth ladder down the left edge (sounder scale).
  x.save();
  x.globalCompositeOperation = 'screen';
  x.strokeStyle = rgba(P.grid, 0.4); x.lineWidth = 0.8;
  x.beginPath(); x.moveTo(0, y0); x.lineTo(W, y0); x.stroke();
  for (let i = 0; i <= 6; i++) {
    const yy = top + (i / 6) * fh;
    x.fillStyle = rgba(P.grid, 0.55); x.fillRect(8, yy, 14, 1);
    x.font = `${Math.round(H * 0.02)}px monospace`; x.textAlign = 'start'; x.fillStyle = rgba(P.grid, 0.6);
    x.fillText(String(i * 50), 26, yy + 4);
  }
  x.restore();

  // One labelled return on a strong peak.
  const strong = peaks.slice().sort((a, b) => b.h - a.h)[0];
  if (strong) {
    const bx = W * strong.pos, by = traceY(strong.pos);
    paintLabel(x, P, p, Math.min(W, H) * 0.4, { bx, by, sz: 4, cx: W * 0.5 }, p.labelPick[0]);
  }
}

/* 3 — BATHYMETRIC CHART: top-down depth chart — concentric depth contours of
   an off-centre seabed feature (seamount/trench) with scattered sounding
   number labels, nautical-chart style. NO circle (irregular contours). */
function layoutBathy(x, W, H, P, r, p) {
  const fcx = W * (0.32 + r() * 0.36);
  const fcy = H * (0.30 + r() * 0.40);
  const featR = Math.min(W, H) * (0.30 + r() * 0.16);
  const isTrench = p.depthI === 2;                  // trench = inverted (deep)

  // Faint chart grid across the whole frame.
  x.save();
  x.globalCompositeOperation = 'screen';
  const gs = Math.min(W, H) / 9;
  for (let gx = 0; gx <= W; gx += gs) { x.strokeStyle = rgba(P.grid, 0.05); x.lineWidth = 0.6; x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
  for (let gy = 0; gy <= H; gy += gs) { x.strokeStyle = rgba(P.grid, 0.05); x.lineWidth = 0.6; x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
  x.restore();

  // Irregular concentric depth contours of the feature.
  const rings = 7 + Math.floor(p.seabedAmp * 18);
  const profile = (a, frac) => {
    // Same low-harmonic undulation, deformed slightly per ring so contours nest.
    const amp = seabedProfile(a, p.seabedSeed + frac * 0.6);
    return featR * frac * (1 + amp * (0.10 + p.seabedAmp));
  };
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = rings; i >= 1; i--) {
    const frac = i / rings;
    // Filled tonal step so the feature reads as raised/sunken relief.
    const tone = isTrench ? (1 - frac) : frac;
    const steps = 200;
    x.beginPath();
    for (let s = 0; s <= steps; s++) {
      const a = (s / steps) * Math.PI * 2;
      const rad = profile(a, frac);
      const px = fcx + Math.cos(a) * rad, py = fcy + Math.sin(a) * rad;
      if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
    x.fillStyle = rgba(mix(P.deep, P.phos, 0.10 + tone * 0.22), 0.07);
    x.fill();
    x.strokeStyle = rgba(i % 3 === 0 ? P.phos : P.grid, i % 3 === 0 ? 0.5 : 0.3);
    x.lineWidth = i % 3 === 0 ? 1.4 : 0.8; x.stroke();
  }
  // Summit / trench marker at the feature centre.
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(fcx, fcy, 0, fcx, fcy, featR * 0.18);
  g.addColorStop(0, rgba(P.hot, isTrench ? 0.4 : 0.8)); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.beginPath(); x.arc(fcx, fcy, featR * 0.18, 0, Math.PI * 2); x.fill();
  x.restore();

  // Scattered sounding number labels (chart depth marks).
  x.save();
  x.globalCompositeOperation = 'screen';
  const sn = 10 + p.densI * 8;
  for (let i = 0; i < sn; i++) {
    const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.6) * featR * 1.5;
    const px = fcx + Math.cos(a) * rr, py = fcy + Math.sin(a) * rr;
    if (px < 20 || px > W - 20 || py < 20 || py > H - 20) continue;
    const depthN = 20 + Math.floor(vnoise(i * 2.3, p.seabedSeed) * 380);
    x.font = `${Math.round(Math.min(W, H) * 0.018)}px monospace`;
    x.textAlign = 'center'; x.fillStyle = rgba(P.grid, 0.55);
    x.fillText(String(depthN), px, py);
  }
  x.restore();

  // A few bright contacts + one labelled feature callout.
  const blips = paintContacts(x, P, r, p, fcx, fcy, featR, Math.floor(p.contacts * 0.5), null);
  const n = Math.min(p.labelN, blips.length || 1);
  for (let i = 0; i < n; i++) {
    const b = blips[i] || { bx: fcx, by: fcy - featR * 0.5, sz: 4 };
    paintLabel(x, P, p, Math.min(W, H) * 0.4, { ...b, cx: fcx }, p.labelPick[i % 4]);
  }
}

/* 4 — TWIN DIALS: two scopes/gauges at different scales on opposite thirds. */
function layoutTwinDials(x, W, H, P, r, p) {
  const bigR = Math.min(W, H) * p.twinBigR;
  const smallR = Math.min(W, H) * p.twinSmallR;
  // Opposite thirds (diagonal), big/small swapped by twinSwap.
  const aX = W * INVPHI, aY = H * (1 - INVPHI);     // upper-rightish third
  const bX = W * (1 - INVPHI), bY = H * INVPHI;     // lower-leftish third
  const big = p.twinSwap ? { cx: aX, cy: aY, R: bigR } : { cx: bX, cy: bY, R: bigR };
  const small = p.twinSwap ? { cx: bX, cy: bY, R: smallR } : { cx: aX, cy: aY, R: smallR };

  paintNoiseFloor(x, W, H, P, r, big.cx, big.cy, bigR, p.noiseFloor * 0.7);

  // Big dial — full instrument.
  paintScope(x, P, r, p, big.cx, big.cy, big.R, { W, H });
  const bigBlips = paintContacts(x, P, r, p, big.cx, big.cy, big.R, Math.floor(p.contacts * 0.6),
    () => { x.beginPath(); x.arc(big.cx, big.cy, big.R, 0, Math.PI * 2); x.clip(); });

  // Small dial — lighter, no seabed, quick gauge.
  paintScope(x, P, r, p, small.cx, small.cy, small.R, { W, H, seabed: false });
  paintContacts(x, P, r, p, small.cx, small.cy, small.R, Math.floor(p.contacts * 0.25),
    () => { x.beginPath(); x.arc(small.cx, small.cy, small.R, 0, Math.PI * 2); x.clip(); });

  // Connecting bearing line between the two centres (instrument tie).
  x.save();
  x.globalCompositeOperation = 'screen';
  x.strokeStyle = rgba(P.grid, 0.3); x.lineWidth = 0.8; x.setLineDash([4, 6]);
  x.beginPath(); x.moveTo(big.cx, big.cy); x.lineTo(small.cx, small.cy); x.stroke();
  x.restore();

  const n = Math.min(p.labelN, bigBlips.length);
  for (let i = 0; i < n; i++) paintLabel(x, P, p, big.R, { ...bigBlips[i], cx: big.cx }, p.labelPick[i % 4]);
}

/* 5 — DEEP FIELD: almost empty. Vast dark sounding field, faint grid, a few
   clustered contacts + one labelled target with leader line; a tiny scope dial
   in a corner. Maximal negative space. */
function layoutDeepField(x, W, H, P, r, p) {
  // Very faint full-frame grid.
  x.save();
  x.globalCompositeOperation = 'screen';
  const gs = Math.min(W, H) / 7;
  for (let gx = 0; gx <= W; gx += gs) { x.strokeStyle = rgba(P.grid, 0.035); x.lineWidth = 0.6; x.beginPath(); x.moveTo(gx, 0); x.lineTo(gx, H); x.stroke(); }
  for (let gy = 0; gy <= H; gy += gs) { x.strokeStyle = rgba(P.grid, 0.035); x.lineWidth = 0.6; x.beginPath(); x.moveTo(0, gy); x.lineTo(W, gy); x.stroke(); }
  x.restore();

  // Sparse marine floor, low.
  paintNoiseFloor(x, W, H, P, r, W * 0.5, H * 0.5, Math.max(W, H) * 0.6, p.noiseFloor * 0.35);

  // A small cluster of faint contacts off to one side.
  const clx = W * (0.20 + r() * 0.25), cly = H * (0.20 + r() * 0.5);
  x.save();
  x.globalCompositeOperation = 'lighter';
  const fewN = 4 + Math.floor(r() * 5);
  for (let i = 0; i < fewN; i++) {
    const bx = clx + randn(r) * W * 0.06, by = cly + randn(r) * H * 0.06;
    const sz = 1.2 + r() * 2.4;
    const col = r() < 0.2 ? P.hot : P.phos;
    const g = x.createRadialGradient(bx, by, 0, bx, by, sz * 6);
    g.addColorStop(0, rgba(col, 0.8)); g.addColorStop(0.25, rgba(col, 0.3)); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(bx, by, sz * 6, 0, Math.PI * 2); x.fill();
    x.fillStyle = rgba(P.hot, 0.9); x.beginPath(); x.arc(bx, by, Math.max(0.8, sz * 0.5), 0, Math.PI * 2); x.fill();
  }
  x.restore();

  // The ONE labelled target with a long leader line, set in open space.
  const tx = W * p.dfTargetX, ty = H * p.dfTargetY;
  x.save();
  x.globalCompositeOperation = 'lighter';
  const tg = x.createRadialGradient(tx, ty, 0, tx, ty, 26);
  tg.addColorStop(0, rgba(P.hot, 0.95)); tg.addColorStop(0.3, rgba(P.phos, 0.4)); tg.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = tg; x.beginPath(); x.arc(tx, ty, 26, 0, Math.PI * 2); x.fill();
  x.fillStyle = rgba(P.hot, 0.95); x.beginPath(); x.arc(tx, ty, 3, 0, Math.PI * 2); x.fill();
  // Targeting ring + crosshair.
  x.strokeStyle = rgba(P.accent, 0.6); x.lineWidth = 1; x.globalCompositeOperation = 'screen';
  x.beginPath(); x.arc(tx, ty, 18, 0, Math.PI * 2); x.stroke();
  x.beginPath(); x.moveTo(tx - 26, ty); x.lineTo(tx - 18, ty); x.moveTo(tx + 18, ty); x.lineTo(tx + 26, ty);
  x.moveTo(tx, ty - 26); x.lineTo(tx, ty - 18); x.moveTo(tx, ty + 18); x.lineTo(tx, ty + 26); x.stroke();
  x.restore();
  // Long leader line out to a callout in open water.
  const ldir = tx < W * 0.5 ? 1 : -1;
  const lx = tx + ldir * W * 0.22, ly = ty - H * 0.12;
  x.save();
  x.globalCompositeOperation = 'screen';
  x.strokeStyle = rgba(P.accent, 0.5); x.lineWidth = 0.9;
  x.beginPath(); x.moveTo(tx + ldir * 18, ty); x.lineTo(lx, ly); x.stroke();
  x.font = `${Math.round(Math.min(W, H) * 0.026)}px monospace`;
  x.textAlign = ldir < 0 ? 'end' : 'start'; x.fillStyle = rgba(P.accent, 0.85);
  x.fillText(p.labelPick[0], lx + ldir * 4, ly - 4);
  x.font = `${Math.round(Math.min(W, H) * 0.018)}px monospace`;
  x.fillStyle = rgba(P.grid, 0.6);
  x.fillText('DPT ' + (60 + Math.floor(vnoise(3, p.seabedSeed) * 300)), lx + ldir * 4, ly + Math.round(Math.min(W, H) * 0.026));
  x.restore();

  // Tiny scope dial parked in a corner.
  const m = Math.min(W, H) * 0.04;
  const dR = Math.min(W, H) * p.dfDialR;
  const c = p.dfDialCorner;
  const dcx = (c & 1) ? W - m - dR : m + dR;
  const dcy = (c & 2) ? H - m - dR : m + dR;
  paintScope(x, P, r, p, dcx, dcy, dR, { W, H, seabed: false });
}

/* ════════════════════════════════════════════════════════════════════════ */

function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  paintGround(x, W, H, P, r);

  switch (p.layoutI) {
    case 0: layoutScope(x, W, H, P, r, p); break;
    case 1: layoutEdgeArc(x, W, H, P, r, p); break;
    case 2: layoutWaterfall(x, W, H, P, r, p); break;
    case 3: layoutBathy(x, W, H, P, r, p); break;
    case 4: layoutTwinDials(x, W, H, P, r, p); break;
    default: layoutDeepField(x, W, H, P, r, p); break;
  }

  paintFinish(x, W, H, P, r);
}

export const soundingsTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const soundingsSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format', values: ['Square', 'Portrait', 'Landscape'] },
    { name: 'Layout', values: LAYOUTS.slice() },
    { name: 'Contacts', values: DENS.slice() },
    { name: 'Depth', values: DEPTHS.slice() },
  ],
};

export const renderSoundings: EngineFn = blit(draw, soundingsTraits);

export const SOUNDINGS_ASPECTS = [1, 0.8, 1.25] as const;
