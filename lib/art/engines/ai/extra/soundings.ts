// @ts-nocheck
/*
 * SOUNDINGS — Direction A ("Sonar"), by fathom-ai.
 *
 * A bathymetric sonar return on an abyssal blue-black ground (#05131e): a
 * phosphor instrument face with concentric ping rings, an off-centre sweep ray
 * trailing a fading afterglow, layered seabed depth bands, clustered
 * contacts/blips with bloom, a few labelled contacts, a depth-scale bezel and a
 * fine bearing reticle. Nocturnal, alive, instrument — same DEPTH/sounding lane
 * as "Noise From Below".
 *
 * v2 (2026-06-19): broke the centred-circle lock — the scope now SCALES per
 * seed (tight detail → small distant dial) and the origin can crop off an edge
 * or corner. The bright sweep is a real off-centre hero, the inner field is
 * built out (depth bands, contours, clustering, labels), palettes shift
 * dominant hue with a restrained second accent, and the glow/grit fills the
 * whole frame.
 *
 * Deterministic from seed only. Additive 'screen'/'lighter' glow for the
 * luminous returns over the dark sea; radial gradients for ping decay.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ── Palettes ─────────────────────────────────────────────────────────────
   ground = sea/face base (harmonised toward #05131e), deep = far-field,
   phos = the dominant luminous trace, hot = blip/sweep-edge highlight,
   grid = faint gridline tint, accent = the ONE restrained second colour
   (ice-blue / rust / amber pin) used sparingly on labels + a few contacts. */
const PALS = [
  { name: 'Phosphor',    ground: '#05131e', deep: '#06222b', phos: '#36ffb0', hot: '#aaffd8', grid: '#1d5c4a', accent: '#8fd4ff' },
  { name: 'Sodium Amber',ground: '#06121b', deep: '#141008', phos: '#ffb43c', hot: '#ffe7a8', grid: '#6a4a1c', accent: '#7fd8ff' },
  { name: 'Ice Trench',  ground: '#05131e', deep: '#082534', phos: '#5fd0ff', hot: '#d6f3ff', grid: '#235873', accent: '#c8a06a' },
  { name: 'Deep Water',  ground: '#05131e', deep: '#0a1a3a', phos: '#5a86ff', hot: '#bcd0ff', grid: '#2a3a73', accent: '#9adfff' },
  { name: 'Faint Phosphor',ground:'#061018',deep: '#0a1c1c', phos: '#6fd9a8', hot: '#bff0d6', grid: '#244b42', accent: '#b07a52' },
  { name: 'Abyss Teal',  ground: '#04131c', deep: '#04282c', phos: '#2ee0c6', hot: '#bafff2', grid: '#1c6055', accent: '#caa46a' },
  { name: 'Rust Buoy',   ground: '#06121b', deep: '#1a1110', phos: '#48d6b0', hot: '#bff0e0', grid: '#235048', accent: '#d07a4a' },
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
/* How the scope sits in the frame — breaks the centred-disc lock. */
const FRAMES = ['Centred', 'Offset', 'Edge Crop', 'Corner Crop', 'Distant Dial'];
/* Scope footprint relative to frame — tight detail vs small distant dial. */
const SCALES = ['Tight', 'Standard', 'Wide'];

/* Short labelled-contact callouts for instrument feel (deterministic pick). */
const CALLS = ['CT-1', 'CT-2', 'CT-3', 'CT-4', 'WRK', 'BIO', 'PNGR', 'ANOM', 'SHL', 'REEF', 'HULL', 'TGT'];

function paramsOf(r) {
  // FIXED DRAW ORDER — labels() and the schema enumerate exactly these.
  const palI = Math.floor(r() * PALS.length);
  const fmt = pick(FMTS, r);
  const modeI = Math.floor(r() * MODES.length);
  const densI = Math.floor(r() * DENS.length);
  const depthI = Math.floor(r() * DEPTHS.length);
  const frameI = Math.floor(r() * FRAMES.length);
  const scaleI = Math.floor(r() * SCALES.length);

  // Free composition params (do not surface as traits).
  const sweepAng = r() * Math.PI * 2;                       // start bearing (sweep hero)
  const sweepDir = r() < 0.5 ? 1 : -1;                       // rotation sense
  const sectorSpan = 0.55 + r() * 0.9;                      // sector-scan width (rad)
  const rings = rint(r, 6, 12);                             // concentric ping rings
  const pings = rint(r, 2, 4);                               // live expanding pings
  const seabedAmp = 0.06 + r() * 0.13;                       // contour roughness
  const seabedBase = 0.58 + r() * 0.18;                      // mean seabed depth (frac of R)
  const seabedSeed = r() * 1000;                             // contour phase pool
  const depthBands = rint(r, 3, 6);                          // layered seabed return bands
  const gridStep = rint(r, 6, 9);                            // radial gridlines / bearing spokes
  const reticle = r() < 0.66;                                // bearing reticle present
  const noiseFloor = 0.4 + r() * 0.5;                        // background return speckle strength
  const clusters = rint(r, 1, 3);                            // contact clusters seeded around the face
  const contacts = densI === 0 ? rint(r, 5, 10) : densI === 1 ? rint(r, 14, 24) : rint(r, 34, 56);
  const labelN = rint(r, 1, 3);                              // labelled contacts
  const labelPick = [pick(CALLS, r), pick(CALLS, r), pick(CALLS, r)];
  const driftBands = rint(r, 7, 13);                         // Drift mode raster lines

  // ── Framing: scope CENTRE + RADIUS in frame fractions (breaks the lock) ──
  // scaleMul runs 0.5–1.4x of the base footprint.
  const scaleMul = scaleI === 0 ? 1.18 + r() * 0.22 : scaleI === 1 ? 0.88 + r() * 0.22 : 0.5 + r() * 0.22;
  // jitter pools (deterministic, consumed regardless of frame for stable order)
  const jx = randn(r), jy = randn(r), corner = Math.floor(r() * 4);

  let fcx = 0.5, fcy = 0.5, rFrac = 0.46 * scaleMul;
  if (frameI === 0) {                 // Centred — small honest jitter
    fcx = 0.5 + jx * 0.05; fcy = 0.5 + jy * 0.04;
  } else if (frameI === 1) {          // Offset — pushed well off centre, fully in frame
    fcx = 0.5 + jx * 0.20; fcy = 0.5 + jy * 0.18;
  } else if (frameI === 2) {          // Edge Crop — origin near an edge, disc spills off
    rFrac = 0.46 * Math.max(scaleMul, 1.05);
    fcx = jx < 0 ? 0.06 + r() * 0.16 : 0.78 + r() * 0.16;
    fcy = 0.32 + r() * 0.36;
  } else if (frameI === 3) {          // Corner Crop — origin in a corner, big arc fills frame
    rFrac = 0.46 * Math.max(scaleMul, 1.2);
    const cxF = (corner & 1) ? 0.86 : 0.14, cyF = (corner & 2) ? 0.86 : 0.14;
    fcx = cxF + jx * 0.05; fcy = cyF + jy * 0.05;
  } else {                            // Distant Dial — small scope, parked off to one side
    rFrac = 0.46 * Math.min(scaleMul, 0.62);
    fcx = jx < 0 ? 0.26 + r() * 0.12 : 0.62 + r() * 0.12;
    fcy = 0.24 + r() * 0.5;
  }

  // The off-centre HERO sweep can pivot off the geometric centre a touch so the
  // bright hand reads asymmetric, not perfectly radial.
  const heroOff = (0.04 + r() * 0.14) * (r() < 0.5 ? 1 : -1);
  const heroPerp = (r() - 0.5) * 0.10;

  return {
    palI, fmt, modeI, densI, depthI, frameI, scaleI,
    sweepAng, sweepDir, sectorSpan, rings, pings,
    seabedAmp, seabedBase, seabedSeed, depthBands, gridStep, reticle, noiseFloor,
    clusters, contacts, labelN, labelPick, driftBands,
    fcx, fcy, rFrac, heroOff, heroPerp,
  };
}

function labels(p) {
  return {
    Palette: PALS[p.palI].name,
    Format: p.fmt.t,
    Mode: MODES[p.modeI],
    Contacts: DENS[p.densI],
    Depth: DEPTHS[p.depthI],
    Framing: FRAMES[p.frameI],
    Scale: SCALES[p.scaleI],
  };
}

/* Small deterministic value-noise over an index, seeded per draw. */
function vnoise(i, seed) {
  const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/* Smooth periodic seabed profile: sum of a few low harmonics so the contour
   undulates like a returned seabed line, NOT high-frequency spikes. Returns a
   signed offset roughly in [-1,1] for an angle a (radians). */
function seabedProfile(a, seed) {
  let v = 0;
  v += Math.sin(a * 2 + seed * 1.7) * 0.55;
  v += Math.sin(a * 3 - seed * 0.9 + 1.3) * 0.30;
  v += Math.sin(a * 5 + seed * 2.3 + 2.1) * 0.14;
  v += Math.sin(a * 8 - seed * 1.1) * 0.06;
  return v;
}

function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  // ── Sea/face ground: vertical surface→deep gradient (fills WHOLE frame) ──
  const bg = x.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, mix(P.ground, P.deep, 0.18));
  bg.addColorStop(0.55, P.ground);
  bg.addColorStop(1, mix(P.ground, '#000', 0.45));
  x.fillStyle = bg; x.fillRect(0, 0, W, H);

  const cx = W * p.fcx;
  const cy = H * p.fcy;
  const R = Math.min(W, H) * p.rFrac;

  // Deep radial bloom behind the instrument face — generous so off-centre /
  // cropped scopes still light the dead corners.
  const face = x.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 1.6);
  face.addColorStop(0, rgba(mix(P.deep, P.phos, 0.12), 0.55));
  face.addColorStop(0.55, rgba(P.deep, 0.30));
  face.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = face; x.fillRect(0, 0, W, H);

  // Whole-frame phosphor mottle so the fill has grit, not flat teal.
  mottle(x, 0, 0, W, H, P.deep, 1000, r, 'overlay');
  mottle(x, 0, 0, W, H, mix(P.deep, P.phos, 0.22), 2600, r, 'screen');

  // ── Background return speckle (marine noise floor) ── additive, frame-wide
  x.save();
  x.globalCompositeOperation = 'screen';
  const speck = Math.floor(W * H / 900 * p.noiseFloor);
  for (let i = 0; i < speck; i++) {
    // bias toward the face but let some spill across the frame
    const a = r() * Math.PI * 2, rr = Math.sqrt(r()) * R * 1.25;
    const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
    if (px < 0 || px > W || py < 0 || py > H) continue;
    x.fillStyle = rgba(mix(P.deep, P.phos, 0.32), 0.04 + r() * 0.10);
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

  // Phosphor mottle + faint scanlines INSIDE the disc — grit, not flat teal.
  drawFace(() => {
    mottle(x, cx - R, cy - R, R * 2, R * 2, mix(P.deep, P.phos, 0.3), 700, r, 'screen');
    x.globalCompositeOperation = 'overlay';
    for (let yy = cy - R; yy < cy + R; yy += 3) {
      x.fillStyle = 'rgba(0,0,0,0.12)';
      x.fillRect(cx - R, yy, R * 2, 1);
    }
  });

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

  // ── Layered seabed return: depth BANDS + contour profile + inner echoes ──
  // depthMul: shelf shallow → trench deep. Bands stack inward as filled
  // gradient returns so the inner field reads layered, not empty.
  const depthMul = p.depthI === 0 ? 0.78 : p.depthI === 1 ? 0.92 : 1.06;
  const baseR = R * clamp(p.seabedBase * depthMul, 0.4, 1.04);
  const contourAt = (frac, phase) => {
    const steps = 360;
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

  drawFace(() => {
    // Filled depth bands stacking inward (layered returns).
    x.globalCompositeOperation = 'screen';
    for (let b = 0; b < p.depthBands; b++) {
      const frac = 1 - b * (0.13 + p.seabedAmp * 0.3);
      if (frac < 0.32) break;
      const g = x.createRadialGradient(cx, cy, baseR * frac * 0.55, cx, cy, baseR * frac);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, rgba(mix(P.deep, P.phos, 0.18 + b * 0.04), 0.12));
      contourAt(frac, b * 0.9);
      x.fillStyle = g; x.fill();
      // contour line on the band edge
      contourAt(frac, b * 0.9);
      x.strokeStyle = rgba(b === 0 ? P.phos : P.grid, b === 0 ? 0.5 : 0.24);
      x.lineWidth = b === 0 ? 1.6 : 0.9; x.stroke();
    }
    // bright seabed glow on the outermost (true) contour
    contourAt(1, 0);
    x.strokeStyle = rgba(P.phos, 0.5); x.lineWidth = 1.6; x.stroke();
    contourAt(1, 0);
    x.strokeStyle = rgba(P.phos, 0.18); x.lineWidth = 5; x.stroke();
  });

  // ── Mode-specific sweep (off-centre HERO hand) ─────────────────────────────
  // The hero pivots slightly off the geometric centre so the bright hand is an
  // asymmetric focal accent rather than perfect radial symmetry.
  const hxc = cx + Math.cos(p.sweepAng + Math.PI / 2) * R * p.heroPerp + Math.cos(p.sweepAng) * R * p.heroOff;
  const hyc = cy + Math.sin(p.sweepAng + Math.PI / 2) * R * p.heroPerp + Math.sin(p.sweepAng) * R * p.heroOff;
  const sweepGlow = (a0, a1, alpha) => {
    const g = x.createRadialGradient(hxc, hyc, 0, hxc, hyc, R);
    g.addColorStop(0, rgba(P.hot, 0.0));
    g.addColorStop(0.15, rgba(P.phos, 0.10 * alpha));
    g.addColorStop(1, rgba(P.phos, 0.0));
    x.beginPath(); x.moveTo(hxc, hyc); x.arc(hxc, hyc, R * 1.3, a0, a1); x.closePath();
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
      // a single bright cursor band (the hero)
      const cyy = cy - R + (0.3 + 0.4 * (p.sweepAng / (Math.PI * 2))) * R * 2;
      x.fillStyle = rgba(P.hot, 0.55); x.fillRect(cx - R, cyy, R * 2, 2);
    } else if (p.modeI === 1) {
      // A-Scope — a returned signal trace across the face (amplitude line).
      const steps = 320;
      x.beginPath();
      const y0 = cy + R * 0.55;
      // smooth low-harmonic return profile + a handful of discrete contact peaks
      const peaks = [];
      for (let k = 0; k < 4; k++) peaks.push({ pos: vnoise(k * 1.7, p.seabedSeed + 2), h: 0.6 + vnoise(k * 3.1, p.seabedSeed + 5) });
      for (let i = 0; i <= steps; i++) {
        const u = i / steps;
        const fx = cx - R + u * R * 2;
        let amp = 0;
        amp += Math.sin(u * Math.PI * 4 + p.seabedSeed) * 0.5;
        amp += Math.sin(u * Math.PI * 9 - p.seabedSeed * 1.3) * 0.22;
        for (const pk of peaks) {
          const d = (u - pk.pos);
          amp -= pk.h * Math.exp(-(d * d) / 0.0009);   // narrow upward contact spike
        }
        const fy = y0 + amp * R * 0.14;
        if (i === 0) x.moveTo(fx, fy); else x.lineTo(fx, fy);
      }
      x.strokeStyle = rgba(P.phos, 0.65); x.lineWidth = 1.6; x.stroke();
      x.strokeStyle = rgba(P.phos, 0.20); x.lineWidth = 5; x.stroke();
      x.strokeStyle = rgba(P.grid, 0.4); x.lineWidth = 0.8;
      x.beginPath(); x.moveTo(cx - R, y0); x.lineTo(cx + R, y0); x.stroke();
    } else {
      // Plan Sweep (full rotation wedge) or Sector Scan (narrow oscillating).
      const span = p.modeI === 2 ? p.sectorSpan : 0.34;
      const a0 = p.sweepAng;
      const trail = 9;
      for (let t = 0; t < trail; t++) {
        const back = p.sweepDir * (t * (span * 0.9));
        const e0 = a0 - back - span, e1 = a0 - back;
        sweepGlow(e1, e1 + span * 0.18, (1 - t / trail) * 0.6);
        sweepGlow(e0, e1, (1 - t / trail) * 0.5);
      }
      // bright leading edge ray — the off-centre clock-hand hero
      const hx = hxc + Math.cos(a0) * R * 1.25, hy = hyc + Math.sin(a0) * R * 1.25;
      x.strokeStyle = rgba(P.phos, 0.30); x.lineWidth = 11;
      x.beginPath(); x.moveTo(hxc, hyc); x.lineTo(hx, hy); x.stroke();
      x.strokeStyle = rgba(P.hot, 0.55); x.lineWidth = 4;
      x.beginPath(); x.moveTo(hxc, hyc); x.lineTo(hx, hy); x.stroke();
      x.strokeStyle = rgba('#ffffff', 0.9); x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(hxc, hyc); x.lineTo(hx, hy); x.stroke();
      // bright ping bead riding the hand's leading edge
      const beadR = R * (0.7 + 0.28 * vnoise(7, p.seabedSeed));
      const bxh = hxc + Math.cos(a0) * beadR, byh = hyc + Math.sin(a0) * beadR;
      const bg2 = x.createRadialGradient(bxh, byh, 0, bxh, byh, R * 0.07);
      bg2.addColorStop(0, rgba(P.hot, 0.95)); bg2.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = bg2; x.beginPath(); x.arc(bxh, byh, R * 0.07, 0, Math.PI * 2); x.fill();
    }
  });

  // ── Contacts / blips with bloom — CLUSTERED + a few labelled ──────────────
  // Seed cluster centres, then scatter most contacts around them with a sparse
  // background sprinkle, so density reads as grouped wrecks/shoals not confetti.
  const clCx = [], clCy = [];
  for (let c = 0; c < p.clusters; c++) {
    const a = r() * Math.PI * 2, rr = Math.pow(r(), 0.7) * R * 0.82;
    clCx.push(cx + Math.cos(a) * rr); clCy.push(cy + Math.sin(a) * rr);
  }
  const blips = [];
  drawFace(() => {
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < p.contacts; i++) {
      let bx, by, a;
      if (r() < 0.7 && p.clusters > 0) {            // clustered
        const ci = Math.floor(r() * p.clusters);
        const spread = R * (0.05 + r() * 0.12);
        bx = clCx[ci] + randn(r) * spread;
        by = clCy[ci] + randn(r) * spread;
        a = Math.atan2(by - cy, bx - cx);
      } else {                                       // background sprinkle
        a = r() * Math.PI * 2;
        const rr = Math.pow(r(), 0.7) * R * 0.98;
        bx = cx + Math.cos(a) * rr; by = cy + Math.sin(a) * rr;
      }
      const big = r() < 0.18;
      const sz = (big ? 3.4 + r() * 4 : 1.2 + r() * 2.2);
      const useAccent = r() < 0.14;
      const col = useAccent ? P.accent : (r() < 0.25 ? P.hot : P.phos);
      const g = x.createRadialGradient(bx, by, 0, bx, by, sz * 6);
      g.addColorStop(0, rgba(col, 0.9));
      g.addColorStop(0.25, rgba(col, 0.4));
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = g;
      x.beginPath(); x.arc(bx, by, sz * 6, 0, Math.PI * 2); x.fill();
      x.fillStyle = rgba(useAccent ? P.accent : P.hot, 0.95);
      x.beginPath(); x.arc(bx, by, Math.max(0.8, sz * 0.55), 0, Math.PI * 2); x.fill();
      if (big) {
        x.strokeStyle = rgba(col, 0.25); x.lineWidth = 1;
        x.beginPath(); x.moveTo(bx, by);
        x.lineTo(bx - Math.cos(a) * sz * 4, by - Math.sin(a) * sz * 4); x.stroke();
        blips.push({ bx, by, sz });
      }
    }
  });

  // ── Labelled contacts — leader + callout box, instrument feel ──
  drawFace(() => {
    x.globalCompositeOperation = 'screen';
    const n = Math.min(p.labelN, blips.length || p.labelN);
    for (let i = 0; i < n; i++) {
      const b = blips[i] || { bx: cx + (r() - 0.5) * R, by: cy + (r() - 0.5) * R, sz: 3 };
      const dir = b.bx < cx ? -1 : 1;
      const lx = b.bx + dir * (R * 0.10), ly = b.by - R * 0.06;
      x.strokeStyle = rgba(P.accent, 0.5); x.lineWidth = 0.8;
      x.beginPath(); x.moveTo(b.bx, b.by); x.lineTo(lx, ly); x.stroke();
      x.beginPath(); x.arc(b.bx, b.by, Math.max(4, b.sz * 1.4), 0, Math.PI * 2);
      x.strokeStyle = rgba(P.accent, 0.45); x.stroke();
      const txt = p.labelPick[i % 3];
      x.font = `${Math.round(R * 0.028)}px monospace`;
      x.textAlign = dir < 0 ? 'end' : 'start';
      x.fillStyle = rgba(P.accent, 0.8);
      x.fillText(txt, lx + dir * 4, ly + 1);
    }
  });

  // ── Bearing reticle / crosshair + DEPTH-SCALE bezel ticks ──
  drawFace(() => {
    x.globalCompositeOperation = 'screen';
    if (p.reticle) {
      x.strokeStyle = rgba(P.grid, 0.5); x.lineWidth = 0.9;
      x.beginPath(); x.moveTo(cx - R, cy); x.lineTo(cx + R, cy);
      x.moveTo(cx, cy - R); x.lineTo(cx, cy + R); x.stroke();
    }
    // bearing ticks around the outer ring
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const long = i % 6 === 0;
      const r0 = R * (long ? 0.93 : 0.97);
      x.beginPath();
      x.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
      x.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
      x.strokeStyle = rgba(P.grid, long ? 0.6 : 0.3);
      x.lineWidth = long ? 1.1 : 0.6; x.stroke();
    }
    // depth-scale ladder up the vertical reticle (range marks)
    for (let i = 1; i <= 4; i++) {
      const rr = R * (i / 4) * 0.92;
      x.fillStyle = rgba(P.grid, 0.55);
      x.fillRect(cx - 3, cy - rr, 6, 1);
      x.font = `${Math.round(R * 0.024)}px monospace`;
      x.textAlign = 'start'; x.fillStyle = rgba(P.grid, 0.6);
      x.fillText(String(i * 25), cx + 6, cy - rr + 1);
    }
  });

  // ── Center origin glow + transducer dot ──
  drawFace(() => {
    x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, R * 0.10);
    g.addColorStop(0, rgba(P.hot, 0.8));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, R * 0.10, 0, Math.PI * 2); x.fill();
    x.fillStyle = rgba(P.hot, 0.95); x.beginPath(); x.arc(cx, cy, 2.4, 0, Math.PI * 2); x.fill();
  });

  // ── Outer bezel ring (instrument edge) — double ring + accent pip ──
  x.save();
  x.globalCompositeOperation = 'screen';
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2);
  x.strokeStyle = rgba(P.phos, 0.5); x.lineWidth = 2; x.stroke();
  x.beginPath(); x.arc(cx, cy, R + 5, 0, Math.PI * 2);
  x.strokeStyle = rgba(P.grid, 0.4); x.lineWidth = 1; x.stroke();
  // a single accent index pip on the bezel (north-by-bearing)
  const pa = p.sweepAng;
  x.fillStyle = rgba(P.accent, 0.7);
  x.beginPath(); x.arc(cx + Math.cos(pa) * (R + 5), cy + Math.sin(pa) * (R + 5), 2.6, 0, Math.PI * 2); x.fill();
  x.restore();

  // ── Scanline / CRT texture over the WHOLE frame ──
  x.save();
  x.globalCompositeOperation = 'overlay';
  for (let yy = 0; yy < H; yy += 3) {
    x.fillStyle = 'rgba(0,0,0,0.10)';
    x.fillRect(0, yy, W, 1);
  }
  x.restore();

  // Final texture passes — full frame.
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
    { name: 'Framing', values: FRAMES.slice() },
    { name: 'Scale', values: SCALES.slice() },
  ],
};

export const renderSoundings: EngineFn = blit(draw, soundingsTraits);

export const SOUNDINGS_ASPECTS = [1, 0.8125, 1.2308] as const;
