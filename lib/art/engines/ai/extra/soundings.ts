// @ts-nocheck
/*
 * SOUNDINGS — Direction A ("Sonar"), by fathom-ai.
 *
 * A bathymetric sonar return on an abyssal blue-black ground (#05131e): a
 * phosphor instrument face with concentric ping rings, a rotating sweep wedge
 * trailing a fading afterglow, a returned seabed contour profile, scattered
 * contacts/blips with bloom, depth gridlines and a fine bearing reticle.
 * Nocturnal, alive, instrument — same DEPTH/sounding lane as "Noise From Below".
 *
 * Deterministic from seed only. Additive 'screen'/'lighter' glow for the
 * luminous returns over the dark sea; radial gradients for ping decay.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ── Palettes ─────────────────────────────────────────────────────────────
   ground = sea/face base, deep = far-field, phos = the luminous trace,
   hot = blip/sweep-edge highlight, grid = faint gridline tint. */
const PALS = [
  { name: 'Phosphor',    ground: '#05131e', deep: '#06222b', phos: '#36ffb0', hot: '#aaffd8', grid: '#1d5c4a' },
  { name: 'Amber CRT',   ground: '#06121b', deep: '#0d1f23', phos: '#ffb43c', hot: '#ffe7a8', grid: '#6a4a1c' },
  { name: 'Ice Trench',  ground: '#05131e', deep: '#082534', phos: '#5fd0ff', hot: '#d6f3ff', grid: '#235873' },
  { name: 'Sodium',      ground: '#070f17', deep: '#161611', phos: '#ffd24a', hot: '#fff2c0', grid: '#5c4a1e' },
  { name: 'Deep Violet', ground: '#070b1c', deep: '#120a2e', phos: '#b489ff', hot: '#ecdcff', grid: '#3a2c63' },
  { name: 'Abyss Teal',  ground: '#04131c', deep: '#04282c', phos: '#2ee0c6', hot: '#bafff2', grid: '#1c6055' },
  { name: 'Crimson Lab', ground: '#0d0710', deep: '#240910', phos: '#ff5a78', hot: '#ffc6cf', grid: '#6e2330' },
];

const FMTS = [
  { W: 1180, H: 1180, t: 'Square' },
  { W: 1040, H: 1280, t: 'Portrait' },
  { W: 1280, H: 1040, t: 'Landscape' },
];

/* Instrument modes — change the whole read of the face. */
const MODES = ['Plan Sweep', 'A-Scope', 'Sector Scan', 'Drift'];
/* Contact density buckets. */
const DENS = ['Sparse', 'Scattered', 'Swarm'];
/* Returned depth band. */
const DEPTHS = ['Shelf', 'Slope', 'Trench'];

function paramsOf(r) {
  // FIXED DRAW ORDER — labels() and the schema enumerate exactly these.
  const palI = Math.floor(r() * PALS.length);
  const fmt = pick(FMTS, r);
  const modeI = Math.floor(r() * MODES.length);
  const densI = Math.floor(r() * DENS.length);
  const depthI = Math.floor(r() * DEPTHS.length);

  // Free composition params (do not surface as traits).
  const sweepAng = r() * Math.PI * 2;                       // start bearing
  const sweepDir = r() < 0.5 ? 1 : -1;                       // rotation sense
  const sectorSpan = 0.55 + r() * 0.9;                      // sector-scan width (rad)
  const rings = rint(r, 5, 11);                              // concentric ping rings
  const pings = rint(r, 2, 4);                               // live expanding pings
  const cxJ = (randn(r)) * 0.10;                             // origin jitter x
  const cyJ = (randn(r)) * 0.08;                             // origin jitter y
  const seabedAmp = 0.06 + r() * 0.13;                       // contour roughness
  const seabedBase = 0.62 + r() * 0.16;                      // mean seabed depth (frac of R)
  const seabedSeed = r() * 1000;                             // contour phase pool
  const gridStep = rint(r, 6, 9);                            // radial gridlines / bearing spokes
  const reticle = r() < 0.62;                                // bearing reticle present
  const noiseFloor = 0.4 + r() * 0.5;                        // background return speckle strength
  const contacts = densI === 0 ? rint(r, 4, 9) : densI === 1 ? rint(r, 12, 22) : rint(r, 30, 52);
  const driftBands = rint(r, 7, 13);                         // for Drift mode horizontal sweep lines

  return {
    palI, fmt, modeI, densI, depthI,
    sweepAng, sweepDir, sectorSpan, rings, pings, cxJ, cyJ,
    seabedAmp, seabedBase, seabedSeed, gridStep, reticle, noiseFloor, contacts, driftBands,
  };
}

function labels(p) {
  return {
    Palette: PALS[p.palI].name,
    Format: p.fmt.t,
    Mode: MODES[p.modeI],
    Contacts: DENS[p.densI],
    Depth: DEPTHS[p.depthI],
  };
}

/* Small deterministic value-noise over an index, seeded per draw. */
function vnoise(i, seed) {
  const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  // ── Sea/face ground: vertical surface→deep gradient + radial face pool ──
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(P.ground, P.deep, 0.15));
  bg.addColorStop(0.55, P.ground);
  bg.addColorStop(1, mix(P.ground, '#000', 0.45));
  x.fillStyle = bg; x.fillRect(0, 0, W, H);

  const cx = W * (0.5 + p.cxJ);
  const cy = H * (0.5 + p.cyJ);
  const R = Math.min(W, H) * 0.46;

  // Deep radial bloom behind the instrument face.
  const face = x.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 1.15);
  face.addColorStop(0, rgba(mix(P.deep, P.phos, 0.10), 0.55));
  face.addColorStop(0.6, rgba(P.deep, 0.28));
  face.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = face; x.fillRect(0, 0, W, H);

  // Soft mottled silt over the deep field.
  mottle(x, 0, 0, W, H, P.deep, 1100, r, 'overlay');

  // ── Background return speckle (marine noise floor) ── additive
  x.save();
  x.globalCompositeOperation = 'screen';
  const speck = Math.floor(W * H / 900 * p.noiseFloor);
  for (let i = 0; i < speck; i++) {
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R;
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    x.fillStyle = rgba(mix(P.deep, P.phos, 0.3), 0.04 + r() * 0.10);
    x.fillRect(px, py, 1, 1 + (r() < 0.15 ? 1 : 0));
  }
  x.restore();

  // ── Concentric depth/ping rings ── faint, evenly spaced
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = 1; i <= p.rings; i++) {
    const rad = R * (i / p.rings);
    x.beginPath();
    x.arc(cx, cy, rad, 0, Math.PI * 2);
    const fade = 0.05 + 0.10 * (1 - i / p.rings);
    x.strokeStyle = rgba(P.grid, fade + 0.04);
    x.lineWidth = i % 2 === 0 ? 1.4 : 0.8;
    x.stroke();
  }
  x.restore();

  // ── Radial bearing spokes / gridlines ──
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < p.gridStep; i++) {
    const a = (i / p.gridStep) * Math.PI * 2;
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    x.strokeStyle = rgba(P.grid, 0.07);
    x.lineWidth = 0.7;
    x.stroke();
  }
  x.restore();

  // Clip subsequent luminous work to the circular face for the instrument feel.
  const drawFace = (fn) => { x.save(); x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip(); fn(); x.restore(); };

  // ── Live expanding pings: bright leading edge + fading interior ──
  drawFace(() => {
    x.globalCompositeOperation = 'lighter';
    for (let k = 0; k < p.pings; k++) {
      const t = (k + 1) / (p.pings + 1);              // staggered radii
      const rad = R * t;
      const g = x.createRadialGradient(cx, cy, Math.max(1, rad - R * 0.06), cx, cy, rad);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(0.7, rgba(P.phos, 0.05));
      g.addColorStop(1, rgba(P.hot, 0.22 * (1 - t * 0.5)));
      x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2);
      x.lineWidth = 2.4; x.strokeStyle = g; x.stroke();
      x.beginPath(); x.arc(cx, cy, rad, 0, Math.PI * 2);
      x.strokeStyle = rgba(P.hot, 0.30 * (1 - t * 0.4)); x.lineWidth = 1.1; x.stroke();
    }
  });

  // ── Returned seabed contour profile (depth band shapes roughness) ──
  // Drawn as a luminous undulating arc band near the chosen depth fraction.
  const depthMul = p.depthI === 0 ? 0.78 : p.depthI === 1 ? 0.92 : 1.06; // shelf shallow → trench deep
  drawFace(() => {
    x.globalCompositeOperation = 'screen';
    const steps = 240;
    const baseR = R * clamp(p.seabedBase * depthMul, 0.4, 1.02);
    x.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      let amp = 0;
      amp += (vnoise(i * 0.7, p.seabedSeed) - 0.5) * 2;
      amp += (vnoise(i * 0.19, p.seabedSeed + 11) - 0.5) * 3.2;
      amp += (vnoise(i * 3.3, p.seabedSeed + 7) - 0.5) * 0.6;
      const rad = baseR + amp * R * p.seabedAmp;
      const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
    x.strokeStyle = rgba(P.phos, 0.5); x.lineWidth = 1.6; x.stroke();
    // glow underlay
    x.strokeStyle = rgba(P.phos, 0.18); x.lineWidth = 5; x.stroke();
    // faint inner echo
    x.beginPath();
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const amp = (vnoise(i * 0.19, p.seabedSeed + 11) - 0.5) * 3.2;
      const rad = baseR * 0.86 + amp * R * p.seabedAmp * 0.7;
      const px = cx + Math.cos(a) * rad, py = cy + Math.sin(a) * rad;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
    x.strokeStyle = rgba(P.grid, 0.28); x.lineWidth = 1; x.stroke();
  });

  // ── Mode-specific sweep ──────────────────────────────────────────────────
  const sweepGlow = (a0, a1, alpha) => {
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R);
    g.addColorStop(0, rgba(P.hot, 0.0));
    g.addColorStop(0.15, rgba(P.phos, 0.10 * alpha));
    g.addColorStop(1, rgba(P.phos, 0.0));
    x.beginPath(); x.moveTo(cx, cy); x.arc(cx, cy, R, a0, a1); x.closePath();
    x.fillStyle = g; x.fill();
  };

  drawFace(() => {
    x.globalCompositeOperation = 'lighter';
    if (p.modeI === 3) {
      // Drift — horizontal raster sweep lines (waterfall) instead of a wedge.
      for (let i = 0; i < p.driftBands; i++) {
        const yy = cy - R + (i / p.driftBands) * R * 2;
        const a = 0.04 + 0.16 * vnoise(i, p.seabedSeed + 3);
        x.fillStyle = rgba(P.phos, a);
        x.fillRect(cx - R, yy, R * 2, 2 + 4 * vnoise(i + 5, p.seabedSeed));
      }
      // a single bright cursor band
      const cyy = cy - R + (0.3 + 0.4 * (p.sweepAng / (Math.PI * 2))) * R * 2;
      x.fillStyle = rgba(P.hot, 0.5); x.fillRect(cx - R, cyy, R * 2, 2);
    } else if (p.modeI === 1) {
      // A-Scope — a returned signal trace across the face (amplitude line).
      const steps = 320;
      x.beginPath();
      const y0 = cy + R * 0.55;
      for (let i = 0; i <= steps; i++) {
        const fx = cx - R + (i / steps) * R * 2;
        let amp = 0;
        amp += (vnoise(i * 0.6, p.seabedSeed) - 0.5) * 1.4;
        amp += (vnoise(i * 0.12, p.seabedSeed + 9) - 0.5) * 3.0;
        // a few spikes = contacts
        const spike = vnoise(i * 7.1, p.seabedSeed + 2);
        if (spike > 0.93) amp -= (spike - 0.9) * 22;
        const fy = y0 + amp * R * 0.12;
        if (i === 0) x.moveTo(fx, fy); else x.lineTo(fx, fy);
      }
      x.strokeStyle = rgba(P.phos, 0.65); x.lineWidth = 1.6; x.stroke();
      x.strokeStyle = rgba(P.phos, 0.20); x.lineWidth = 5; x.stroke();
      // baseline
      x.strokeStyle = rgba(P.grid, 0.4); x.lineWidth = 0.8;
      x.beginPath(); x.moveTo(cx - R, y0); x.lineTo(cx + R, y0); x.stroke();
    } else {
      // Plan Sweep (full rotation wedge) or Sector Scan (narrow oscillating).
      const span = p.modeI === 2 ? p.sectorSpan : 0.34;
      const a0 = p.sweepAng;
      // afterglow trail: several wedges fading behind the leading edge
      const trail = 9;
      for (let t = 0; t < trail; t++) {
        const back = p.sweepDir * (t * (span * 0.9));
        const e0 = a0 - back - span, e1 = a0 - back;
        sweepGlow(e1, e1 + span * 0.18, (1 - t / trail) * 0.6);
        sweepGlow(e0, e1, (1 - t / trail) * 0.5);
      }
      // bright leading edge ray
      x.strokeStyle = rgba(P.hot, 0.85); x.lineWidth = 2;
      x.beginPath(); x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); x.stroke();
      x.strokeStyle = rgba(P.phos, 0.35); x.lineWidth = 6;
      x.beginPath(); x.moveTo(cx, cy);
      x.lineTo(cx + Math.cos(a0) * R, cy + Math.sin(a0) * R); x.stroke();
    }
  });

  // ── Contacts / blips with bloom ──────────────────────────────────────────
  drawFace(() => {
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < p.contacts; i++) {
      const a = r() * Math.PI * 2;
      const rr = Math.pow(r(), 0.7) * R * 0.98;
      const bx = cx + Math.cos(a) * rr, by = cy + Math.sin(a) * rr;
      const big = r() < 0.18;
      const sz = (big ? 3.4 + r() * 4 : 1.2 + r() * 2.2);
      // bloom
      const g = x.createRadialGradient(bx, by, 0, bx, by, sz * 6);
      const col = r() < 0.25 ? P.hot : P.phos;
      g.addColorStop(0, rgba(col, 0.9));
      g.addColorStop(0.25, rgba(col, 0.4));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(bx, by, sz * 6, 0, Math.PI * 2); x.fill();
      // core
      x.fillStyle = rgba(P.hot, 0.95);
      x.beginPath(); x.arc(bx, by, Math.max(0.8, sz * 0.55), 0, Math.PI * 2); x.fill();
      // larger contacts get a comet smear toward the sweep
      if (big) {
        x.strokeStyle = rgba(col, 0.25); x.lineWidth = 1;
        x.beginPath(); x.moveTo(bx, by);
        x.lineTo(bx - Math.cos(a) * sz * 4, by - Math.sin(a) * sz * 4); x.stroke();
      }
    }
  });

  // ── Bearing reticle / crosshair ──
  if (p.reticle) {
    drawFace(() => {
      x.globalCompositeOperation = 'screen';
      x.strokeStyle = rgba(P.grid, 0.5); x.lineWidth = 0.9;
      x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy);
      x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
      // tick marks around the outer ring
      for (let i = 0; i < 72; i++) {
        const a = (i / 72) * Math.PI * 2;
        const long = i % 6 === 0;
        const r0 = R * (long ? 0.94 : 0.97);
        x.beginPath();
        x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
        x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        x.strokeStyle = rgba(P.grid, long ? 0.6 : 0.3);
        x.lineWidth = long ? 1.1 : 0.6; x.stroke();
      }
    });
  }

  // ── Center origin glow + transducer dot ──
  drawFace(() => {
    x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 0.10);
    g.addColorStop(0, rgba(P.hot, 0.8));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 0.10, 0, Math.PI * 2); x.fill();
    x.fillStyle = rgba(P.hot, 0.95); x.beginPath(); x.arc(cx, cy, 2.4, 0, Math.PI * 2); x.fill();
  });

  // ── Outer bezel ring (instrument edge) ──
  x.save();
  x.globalCompositeOperation = 'screen';
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2);
  x.strokeStyle = rgba(P.phos, 0.5); x.lineWidth = 2; x.stroke();
  x.beginPath(); x.arc(cx, cy, R + 4, 0, Math.PI * 2);
  x.strokeStyle = rgba(P.grid, 0.4); x.lineWidth = 1; x.stroke();
  x.restore();

  // ── Scanline / CRT texture over the whole face ──
  x.save();
  x.globalCompositeOperation = 'overlay';
  for (let yy = 0; yy < H; yy += 3) {
    x.fillStyle = 'rgba(0,0,0,0.10)';
    x.fillRect(0, yy, W, 1);
  }
  x.restore();

  // Final texture passes.
  grain(x, W, H, 1200, r);
  vignette(x, W, H, 0.42);
}

export const soundingsTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const soundingsSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format', values: ['Square', 'Portrait', 'Landscape'] },
    { name: 'Mode', values: MODES.slice() },
    { name: 'Contacts', values: DENS.slice() },
    { name: 'Depth', values: DEPTHS.slice() },
  ],
};

export const renderSoundings: EngineFn = blit(draw, soundingsTraits);

export const SOUNDINGS_ASPECTS = [1, 0.8125, 1.2308] as const;
