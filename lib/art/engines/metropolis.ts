// @ts-nocheck
/*
 * METROPOLIS — opus4-8. A generative megacity across the full day cycle.
 * ONE project, a 4-value Time axis: Dawn / Day / Dusk / Night. Night renders the
 * neon-cyberpunk look (dark grounds, lit windows, moons/aurora/storm); Dawn/Day/
 * Dusk render the luminous look (saturated sky-dominant grounds, glass facades,
 * sun). Each look is kept verbatim in its own scope and dispatched by Time, so
 * both are pixel-exact. Deterministic from tokenId: paramsOf draws Time FIRST.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, PHI, INVPHI, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

/* ── NIGHT look (self-contained) ─────────────────────────────────────────── */
const NIGHT = (function () {
// @ts-nocheck
/*
 * METROPOLIS — by opus4-8. "A neon megacity, seen from across the world."
 *
 * A generative cinematic establishing shot of a vast sci-fi / cyberpunk city.
 * This is a DEPICTED SCENE, not an abstract field: a dramatic saturated sky, a
 * layered skyline of dozens of towers each speckled with grids of lit windows,
 * neon signage, elevated transit lines, streaks of flying-car traffic, sweeping
 * searchlights, rooftop glow, volumetric haze between depth layers, and a hero
 * foreground anchor (a mega-tower, a waterfront with a rippled reflection, or a
 * near rooftop edge silhouette).
 *
 * Composition is built strictly back-to-front with atmospheric perspective:
 *   sky → distant haze towers (hazy/desaturated/light) → mid skyline → near
 *   skyline (dark/saturated) → transit + traffic + searchlights → foreground
 *   anchor → bloom + grain + vignette finish.
 *
 * Determinism is sacred. EVERY trait-determining choice is drawn in paramsOf(r)
 * in a FIXED ORDER, so traits() and draw() never disagree. Seed = rng(tokenId).
 * Same tokenId → identical art + traits, forever, on every machine.
 */

/* ════════════════════════════════════════════════════════════════════════════
 * TRAIT VOCABULARIES
 * ══════════════════════════════════════════════════════════════════════════ */

/* Sky / Time-of-day — sets the whole mood. Each has a distinct gradient recipe,
 * sky-light colour (lights distant haze), and celestial feature. */
const SKIES = [
  // name        top        mid        horizon    glow(sky light)  feature
  { name: 'Sunset',     top: '#2a0f5a', mid: '#b0285a', hor: '#ffb04a', glow: '#ff6a2a', feat: 'sun'    },
  { name: 'Midnight',   top: '#040824', mid: '#102a70', hor: '#2a56b0', glow: '#4a6aff', feat: 'moon'   },
  { name: 'Aurora',     top: '#03102a', mid: '#0a3a55', hor: '#1a6a6a', glow: '#22ffcc', feat: 'aurora' },
  { name: 'Storm',      top: '#0c0a22', mid: '#3a2a5a', hor: '#6a4a9a', glow: '#b09aff', feat: 'storm'  },
  { name: 'Smog Dawn',  top: '#3a1a50', mid: '#c05a5a', hor: '#ffc060', glow: '#ffaa4a', feat: 'sun'    },
  { name: 'Blood Moon', top: '#1a0212', mid: '#6a0824', hor: '#c0203a', glow: '#ff4040', feat: 'moon'   },
  { name: 'Toxic Dusk', top: '#0a1a12', mid: '#1a5a30', hor: '#5ab040', glow: '#9aff4a', feat: 'sun'    },
  { name: 'Twin Moons', top: '#040a28', mid: '#142a6a', hor: '#2a4ab0', glow: '#6a8aff', feat: 'twin'   },
];

/* Neon palettes — saturated dual/tri accent schemes used for windows, signage,
 * traffic, rooftop glow. hot = warm sign, cool = cool sign, pop = accent. */
const PALS = [
  { name: 'Neon Tokyo',      hot: '#ff2d6e', cool: '#22e0ff', pop: '#ffd23a', win: '#ffd58a' },
  { name: 'Cyber Magenta',   hot: '#ff1fa0', cool: '#7a2dff', pop: '#22e0ff', win: '#ffb0f0' },
  { name: 'Toxic Green',     hot: '#aaff22', cool: '#16d0a0', pop: '#ffea2a', win: '#caffb0' },
  { name: 'Amber Noir',      hot: '#ffae2a', cool: '#ff5a2a', pop: '#ffe089', win: '#ffd08a' },
  { name: 'Ice Cyan',        hot: '#22fff0', cool: '#2a8aff', pop: '#d0f8ff', win: '#bfe8ff' },
  { name: 'Vaporwave',       hot: '#ff5fd2', cool: '#36e0ff', pop: '#b06bff', win: '#ffd0f4' },
  { name: 'Crimson',         hot: '#ff2a3c', cool: '#ff7a2a', pop: '#ffd23a', win: '#ff9a8a' },
  { name: 'Electric Indigo', hot: '#6a3aff', cool: '#2adfff', pop: '#ff3ad0', win: '#bfb0ff' },
  { name: 'Acid Sodium',     hot: '#ffd21a', cool: '#ff7a1a', pop: '#fff18a', win: '#ffe6a0' },
  { name: 'Hologram',        hot: '#3affd0', cool: '#a03aff', pop: '#ff3a8a', win: '#c8fff0' },
];

/* Camera / layout — structurally distinct compositions. */
const CAMERAS = ['Waterfront', 'Aerial Overlook', 'Street Canyon', 'Skyline Panorama'];

/* Density — how packed the skyline is. */
const DENSITY = ['Sparse Outpost', 'Standard City', 'Hyperdense'];

/* Hero landmark feature. */
const LANDMARKS = ['Mega Spire', 'Twin Towers', 'Arcology Dome', 'Space Elevator', 'None'];

/* Formats. */
const FMTS = [
  { W: 1240, H: 1240, t: 'Square' },
  { W: 1000, H: 1400, t: 'Tall'   },
  { W: 1500, H: 1000, t: 'Wide'   },
];

/* ── Param draw — FIXED ORDER. Never reorder. ────────────────────────────── */
function paramsOf(r) {
  const skyI    = Math.floor(r() * SKIES.length);
  const palI    = Math.floor(r() * PALS.length);
  const camera  = pick(CAMERAS, r);
  const density = pick(DENSITY, r);
  const landmark= pick(LANDMARKS, r);
  const fmt     = pick(FMTS, r);
  return { skyI, palI, camera, density, landmark, fmt };
}

function labels(p) {
  return {
    Sky:      SKIES[p.skyI].name,
    Palette:  PALS[p.palI].name,
    Camera:   p.camera,
    Density:  p.density,
    Landmark: p.landmark,
    Format:   p.fmt.t,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
 * SKY
 * ══════════════════════════════════════════════════════════════════════════ */

function paintSky(x, S, W, H, horizonY, r) {
  // vertical gradient: top → mid → horizon
  const g = x.createLinearGradient(0, 0, 0, horizonY);
  g.addColorStop(0,    S.top);
  g.addColorStop(0.55, S.mid);
  g.addColorStop(1,    S.hor);
  x.fillStyle = g;
  x.fillRect(0, 0, W, horizonY + 2);

  // stars (skip for bright dawns to keep it clean)
  if (S.feat !== 'aurora') {
    const nStars = Math.floor(W * horizonY / 2600);
    for (let i = 0; i < nStars; i++) {
      const sx = r() * W, sy = r() * horizonY * 0.85;
      const fade = 1 - sy / (horizonY * 0.85);
      const a = (0.15 + r() * 0.6) * fade * fade;
      const sz = r() < 0.92 ? 1 : 1.6;
      x.fillStyle = rgba('#ffffff', a);
      x.fillRect(sx, sy, sz, sz);
    }
  }

  // celestial feature
  const cf = S.feat;
  if (cf === 'sun') {
    const sunX = W * (0.2 + r() * 0.6), sunY = horizonY * (0.62 + r() * 0.22);
    const rad = S0_min(W, H) * (0.12 + r() * 0.06);
    radialGlow(x, sunX, sunY, rad * 2.6, S.hor, 0.5);
    radialGlow(x, sunX, sunY, rad, mix(S.hor, '#ffffff', 0.5), 0.95);
  } else if (cf === 'moon' || cf === 'twin') {
    const moons = cf === 'twin' ? 2 : 1;
    for (let m = 0; m < moons; m++) {
      const mx = W * (0.18 + r() * 0.64);
      const my = horizonY * (0.18 + r() * 0.4);
      const rad = S0_min(W, H) * (0.05 + r() * 0.045) * (m === 1 ? 0.7 : 1);
      const moonCol = cf === 'twin' ? mix('#ffffff', S.glow, 0.4) : (S.name === 'Blood Moon' ? '#ff5a4a' : '#dfe8ff');
      radialGlow(x, mx, my, rad * 3.2, S.glow, 0.4);
      x.fillStyle = moonCol;
      x.beginPath(); x.arc(mx, my, rad, 0, Math.PI * 2); x.fill();
      // subtle crater shading
      x.fillStyle = rgba(mix(moonCol, '#000', 0.3), 0.5);
      x.beginPath(); x.arc(mx + rad * 0.3, my - rad * 0.25, rad * 0.55, 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = 'screen';
      x.fillStyle = moonCol;
      x.beginPath(); x.arc(mx, my, rad, 0, Math.PI * 2); x.fill();
      x.globalCompositeOperation = 'source-over';
    }
  } else if (cf === 'aurora') {
    x.save();
    x.globalCompositeOperation = 'screen';
    const bands = rint(r, 3, 5);
    for (let b = 0; b < bands; b++) {
      const baseY = horizonY * (0.2 + 0.5 * (b / bands)) + randn(r) * horizonY * 0.05;
      const hue = 120 + b * 40 + randn(r) * 30;
      const col = hsl2hex(hue, 0.85, 0.55);
      x.strokeStyle = rgba(col, 0.0);
      const steps = 40;
      x.beginPath();
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = t * W;
        const py = baseY + Math.sin(t * Math.PI * (2 + b) + b) * horizonY * 0.08;
        if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      // draw as vertical glow curtains
      for (let s = 0; s <= steps; s++) {
        const t = s / steps;
        const px = t * W;
        const py = baseY + Math.sin(t * Math.PI * (2 + b) + b) * horizonY * 0.08;
        const gg = x.createLinearGradient(px, py - horizonY * 0.18, px, py + horizonY * 0.05);
        gg.addColorStop(0, rgba(col, 0));
        gg.addColorStop(0.7, rgba(col, 0.22));
        gg.addColorStop(1, rgba(col, 0));
        x.fillStyle = gg;
        x.fillRect(px - W / steps, py - horizonY * 0.18, W / steps + 1, horizonY * 0.23);
      }
    }
    x.restore();
  } else if (cf === 'storm') {
    // clouds
    x.save();
    x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 8; i++) {
      const cx = r() * W, cy = horizonY * (0.1 + r() * 0.5), cr = S0_min(W, H) * (0.15 + r() * 0.2);
      radialGlow(x, cx, cy, cr, mix(S.mid, '#fff', 0.2), 0.12);
    }
    x.restore();
    // lightning bolt
    if (r() < 0.85) {
      const bx = W * (0.2 + r() * 0.6);
      let by = 0; let cx = bx;
      x.strokeStyle = rgba('#eaf0ff', 0.9);
      x.lineWidth = 2.2;
      x.shadowColor = '#aab8ff'; x.shadowBlur = 18;
      x.beginPath(); x.moveTo(cx, by);
      const segs = rint(r, 6, 10);
      const endY = horizonY * (0.55 + r() * 0.35);
      for (let s = 1; s <= segs; s++) {
        by = (endY) * (s / segs);
        cx += randn(r) * W * 0.04;
        x.lineTo(cx, by);
      }
      x.stroke();
      x.shadowBlur = 0;
      radialGlow(x, bx, horizonY * 0.2, S0_min(W, H) * 0.5, '#aab8ff', 0.18);
    }
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * HELPERS
 * ══════════════════════════════════════════════════════════════════════════ */

function S0_min(W, H) { return Math.min(W, H); }

function radialGlow(x, cx, cy, rad, col, a) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.4, rgba(col, a * 0.4));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  x.restore();
}

/* A single building rectangle silhouette with optional roof shape + windows. */
function drawBuilding(x, P, bx, by, bw, bh, baseCol, winCol, winLit, depth, silhouette, r) {
  // body
  x.fillStyle = baseCol;
  x.fillRect(bx, by, bw, bh);

  // roof feature
  const roof = silhouette;
  if (roof === 'antenna') {
    const ax = bx + bw * (0.3 + r() * 0.4);
    x.strokeStyle = baseCol; x.lineWidth = Math.max(1, bw * 0.04);
    x.beginPath(); x.moveTo(ax, by); x.lineTo(ax, by - bh * (0.1 + r() * 0.25)); x.stroke();
    // red blink at tip handled by caller via list
  } else if (roof === 'step') {
    // ziggurat: stack a couple narrower blocks
    let sw = bw, sx = bx, sy = by;
    for (let s = 0; s < 2; s++) {
      sw *= 0.6; sx = bx + (bw - sw) / 2; sy -= bh * 0.12;
      x.fillStyle = baseCol;
      x.fillRect(sx, sy, sw, bh * 0.12 + 2);
    }
  } else if (roof === 'spire') {
    x.fillStyle = baseCol;
    x.beginPath();
    x.moveTo(bx, by); x.lineTo(bx + bw / 2, by - bh * (0.2 + r() * 0.3)); x.lineTo(bx + bw, by);
    x.closePath(); x.fill();
  } else if (roof === 'dome') {
    x.fillStyle = baseCol;
    x.beginPath(); x.arc(bx + bw / 2, by, bw / 2, Math.PI, 0); x.fill();
  } else if (roof === 'slant') {
    x.fillStyle = baseCol;
    x.beginPath();
    x.moveTo(bx, by); x.lineTo(bx + bw, by - bh * 0.14); x.lineTo(bx + bw, by); x.closePath(); x.fill();
  }

  // windows — grid of lit dots. density falls with depth (distant = sparser glow)
  if (winLit > 0 && bw > 6 && bh > 10) {
    const cell = clamp(bw / (3 + Math.floor(r() * 4)), 3, 9);
    const cols = Math.max(1, Math.floor(bw / cell) - 1);
    const rowH = clamp(cell * (1.3 + r() * 0.6), 4, 12);
    const rows = Math.max(1, Math.floor(bh / rowH) - 1);
    const mx = (bw - cols * cell) / 2;
    const wpx = Math.max(1, cell * 0.5);
    const wpy = Math.max(1, rowH * 0.42);
    for (let cyi = 0; cyi < rows; cyi++) {
      for (let cxi = 0; cxi < cols; cxi++) {
        if (r() > winLit) continue;
        const wx = bx + mx + cxi * cell + cell * 0.25;
        const wy = by + 4 + cyi * rowH + rowH * 0.3;
        // colour: mostly window-warm, occasional neon accent
        let c = winCol;
        const roll = r();
        if (roll < 0.08) c = P.hot;
        else if (roll < 0.14) c = P.cool;
        const a = (0.5 + r() * 0.5) * (depth);
        x.fillStyle = rgba(c, a);
        x.fillRect(wx, wy, wpx, wpy);
      }
    }
  }
}

/* A vertical neon sign bar (kanji-style stacked segments) on a building face. */
function drawSignBar(x, P, bx, by, bh, col, r) {
  const w = clamp(bx * 0 + 5 + r() * 6, 4, 12);
  const segs = rint(r, 3, 7);
  const segH = (bh * (0.3 + r() * 0.4)) / segs;
  const startY = by + bh * (0.1 + r() * 0.3);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let s = 0; s < segs; s++) {
    const sy = startY + s * segH * 1.25;
    x.shadowColor = col; x.shadowBlur = 8;
    x.fillStyle = rgba(col, 0.85);
    x.fillRect(bx, sy, w, segH * 0.7);
  }
  x.shadowBlur = 0;
  x.restore();
}

/* A horizontal neon signage strip / billboard glow on a rooftop or face. */
function drawNeonStrip(x, P, sx, sy, sw, col, r) {
  const sh = clamp(sw * 0.12, 3, 10);
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.shadowColor = col; x.shadowBlur = 12;
  x.fillStyle = rgba(col, 0.9);
  x.fillRect(sx, sy, sw, sh);
  x.shadowBlur = 0;
  // glow halo
  radialGlow(x, sx + sw / 2, sy + sh / 2, sw * 0.9, col, 0.18);
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * SKYLINE LAYERS
 * ══════════════════════════════════════════════════════════════════════════ */

/* Paint one skyline layer. depthT 0=farthest 1=nearest. baseColFar/Near let the
 * caller set atmospheric perspective tint. */
function paintSkylineLayer(x, P, Sky, W, H, baseY, depthT, count, maxH, baseCol, winLit, neonAmt, r) {
  // walk across, placing buildings of varied widths back to front within layer
  let cursor = -W * 0.02;
  const buildings = [];
  while (cursor < W * 1.02) {
    const bw = W * (0.02 + r() * 0.06) * (0.7 + depthT * 0.6);
    const bh = maxH * (0.25 + r() * 0.75);
    const bx = cursor;
    const by = baseY - bh;
    buildings.push({ bx, by, bw, bh });
    cursor += bw * (0.85 + r() * 0.4);
  }
  // sort: draw is left-to-right already; overlap creates depth within layer
  for (const b of buildings) {
    const sil = pickSilhouette(r);
    drawBuilding(x, P, b.bx, b.by, b.bw, b.bh, baseCol, P.win, winLit, 0.5 + depthT * 0.5, sil, r);
    b.sil = sil;
  }
  // neon + accents proportional to nearness
  for (const b of buildings) {
    if (r() < neonAmt * 0.5 && b.bw > 8) {
      const col = pick([P.hot, P.cool, P.pop], r);
      if (r() < 0.5) drawSignBar(x, P, b.bx + b.bw * (0.1 + r() * 0.7), b.by, b.bh, col, r);
      else drawNeonStrip(x, P, b.bx + 2, b.by + b.bh * (0.05 + r() * 0.5), b.bw - 4, col, r);
    }
    // rooftop glow halo on some near buildings
    if (depthT > 0.5 && r() < neonAmt * 0.4) {
      radialGlow(x, b.bx + b.bw / 2, b.by, b.bw * 1.2, pick([P.hot, P.cool, P.pop], r), 0.12);
    }
    // antenna blink
    if (b.sil === 'antenna' && r() < 0.5) {
      const ax = b.bx + b.bw * 0.5;
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba('#ff3a3a', 0.9);
      x.beginPath(); x.arc(ax, b.by - b.bh * 0.18, Math.max(1.2, b.bw * 0.06), 0, Math.PI * 2); x.fill();
      radialGlow(x, ax, b.by - b.bh * 0.18, b.bw * 0.6, '#ff3a3a', 0.3);
      x.restore();
    }
  }
  return buildings;
}

function pickSilhouette(r) {
  const roll = r();
  if (roll < 0.30) return 'flat';
  if (roll < 0.48) return 'antenna';
  if (roll < 0.62) return 'step';
  if (roll < 0.74) return 'spire';
  if (roll < 0.84) return 'slant';
  if (roll < 0.92) return 'dome';
  return 'flat';
}

/* ════════════════════════════════════════════════════════════════════════════
 * TRANSIT / TRAFFIC / SEARCHLIGHTS
 * ══════════════════════════════════════════════════════════════════════════ */

function drawTraffic(x, P, W, H, horizonY, n, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const warm = r() < 0.5;
    const col = warm ? P.pop : P.cool;
    const y = horizonY * (0.45 + r() * 0.5);
    const x0 = r() * W;
    const len = W * (0.06 + r() * 0.22);
    const dir = r() < 0.5 ? 1 : -1;
    const slope = randn(r) * 0.06;
    const g = x.createLinearGradient(x0, y, x0 + dir * len, y + slope * len);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.7, rgba(col, 0.5));
    g.addColorStop(1, rgba(mix(col, '#fff', 0.4), 0.8));
    x.strokeStyle = g;
    x.lineWidth = 0.8 + r() * 1.4;
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + dir * len, y + slope * len); x.stroke();
  }
  x.restore();
}

/* Elevated maglev / skybridge lines between layers. */
function drawTransit(x, P, W, H, horizonY, r) {
  const lines = rint(r, 1, 3);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < lines; i++) {
    const y = horizonY * (0.62 + r() * 0.32);
    const col = pick([P.cool, P.hot, P.pop], r);
    const amp = H * (0.006 + r() * 0.014);
    const phase = r() * 6;
    // the rail
    x.strokeStyle = rgba(mix(col, '#fff', 0.2), 0.35);
    x.lineWidth = 1.4 + r();
    x.beginPath();
    const steps = 60;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps; const px = t * W;
      const py = y + Math.sin(t * 4 + phase) * amp;
      if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.stroke();
    // light pods running on it
    const pods = rint(r, 3, 7);
    for (let p = 0; p < pods; p++) {
      const t = r(); const px = t * W; const py = y + Math.sin(t * 4 + phase) * amp;
      x.fillStyle = rgba(mix(col, '#fff', 0.5), 0.9);
      x.fillRect(px - 3, py - 1.4, 6, 2.8);
      radialGlow(x, px, py, 14, col, 0.4);
    }
    // support pylons
    x.strokeStyle = rgba(col, 0.14);
    x.lineWidth = 1;
    for (let s = 0; s < 6; s++) {
      const t = (s + 0.5) / 6; const px = t * W; const py = y + Math.sin(t * 4 + phase) * amp;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + H * 0.1); x.stroke();
    }
  }
  x.restore();
}

function drawSearchlights(x, P, W, horizonY, n, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const bx = W * (0.1 + r() * 0.8);
    const by = horizonY * (0.9 + r() * 0.08);
    const ang = -Math.PI / 2 + randn(r) * 0.7;
    const len = horizonY * (0.6 + r() * 0.5);
    const spread = 0.04 + r() * 0.06;
    const col = pick([P.cool, P.pop, '#ffffff'], r);
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    const g = x.createLinearGradient(bx, by, ex, ey);
    g.addColorStop(0, rgba(col, 0.32));
    g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g;
    const px1 = bx + Math.cos(ang - spread) * len, py1 = by + Math.sin(ang - spread) * len;
    const px2 = bx + Math.cos(ang + spread) * len, py2 = by + Math.sin(ang + spread) * len;
    x.beginPath(); x.moveTo(bx, by); x.lineTo(px1, py1); x.lineTo(px2, py2); x.closePath(); x.fill();
  }
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * HERO LANDMARK
 * ══════════════════════════════════════════════════════════════════════════ */

function drawLandmark(x, P, Sky, kind, W, H, horizonY, r) {
  if (kind === 'None') return;
  const baseCol = '#05060c';
  if (kind === 'Mega Spire') {
    const cx = W * (0.3 + r() * 0.4);
    const baseW = W * (0.06 + r() * 0.04);
    const topY = horizonY * (0.05 + r() * 0.12);
    // tapering tower
    x.fillStyle = baseCol;
    x.beginPath();
    x.moveTo(cx - baseW / 2, horizonY);
    x.lineTo(cx - baseW * 0.12, topY + horizonY * 0.08);
    x.lineTo(cx, topY);
    x.lineTo(cx + baseW * 0.12, topY + horizonY * 0.08);
    x.lineTo(cx + baseW / 2, horizonY);
    x.closePath(); x.fill();
    // windows + vertical neon edge
    drawBuilding(x, P, cx - baseW / 2, topY + horizonY * 0.1, baseW, horizonY - (topY + horizonY * 0.1), baseCol, P.win, 0.5, 1, 'flat', r);
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(P.hot, 0.7); x.lineWidth = 2.5;
    x.shadowColor = P.hot; x.shadowBlur = 14;
    x.beginPath(); x.moveTo(cx, topY); x.lineTo(cx, horizonY); x.stroke();
    x.shadowBlur = 0; x.restore();
    radialGlow(x, cx, topY, baseW * 2.4, P.hot, 0.4);
    x.fillStyle = rgba('#ff3a3a', 0.9);
    x.beginPath(); x.arc(cx, topY, 3, 0, Math.PI * 2); x.fill();
  } else if (kind === 'Twin Towers') {
    const cx = W * (0.34 + r() * 0.3);
    const gap = W * (0.07 + r() * 0.02);
    const tw = W * (0.06 + r() * 0.025);
    const th = horizonY * (0.92 + r() * 0.06);
    for (const dx of [-gap, gap]) {
      const bx = cx + dx - tw / 2;
      drawBuilding(x, P, bx, horizonY - th, tw, th, '#04050b', P.win, 0.6, 1, 'antenna', r);
      // bright vertical neon edge strips on both sides of each tower
      x.save(); x.globalCompositeOperation = 'lighter';
      for (const ex of [bx, bx + tw]) {
        x.strokeStyle = rgba(P.cool, 0.55); x.lineWidth = 2.2;
        x.shadowColor = P.cool; x.shadowBlur = 10;
        x.beginPath(); x.moveTo(ex, horizonY - th); x.lineTo(ex, horizonY); x.stroke();
      }
      x.shadowBlur = 0; x.restore();
      drawSignBar(x, P, bx + tw * 0.5, horizonY - th, th, P.hot, r);
      // crown glow + antenna blink
      radialGlow(x, bx + tw / 2, horizonY - th, tw * 2, P.hot, 0.35);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba('#ff3a3a', 0.95);
      x.beginPath(); x.arc(bx + tw / 2, horizonY - th - tw * 0.3, 2.6, 0, Math.PI * 2); x.fill();
      x.restore();
    }
    // glowing connecting skybridge(s)
    x.save(); x.globalCompositeOperation = 'lighter';
    const bridges = rint(r, 1, 3);
    for (let bi = 0; bi < bridges; bi++) {
      const by = horizonY - th * (0.35 + r() * 0.45);
      x.strokeStyle = rgba(P.pop, 0.7); x.lineWidth = 3 + r() * 2;
      x.shadowColor = P.pop; x.shadowBlur = 12;
      x.beginPath(); x.moveTo(cx - gap, by); x.lineTo(cx + gap, by); x.stroke();
    }
    x.shadowBlur = 0; x.restore();
  } else if (kind === 'Arcology Dome') {
    const cx = W * (0.3 + r() * 0.4);
    const rad = W * (0.12 + r() * 0.08);
    const cy = horizonY;
    // dome body
    const g = x.createRadialGradient(cx, cy - rad * 0.3, rad * 0.1, cx, cy, rad * 1.2);
    g.addColorStop(0, mix(baseCol, P.cool, 0.25));
    g.addColorStop(1, baseCol);
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, rad, Math.PI, 0); x.fill();
    // geodesic glow ribs
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(P.cool, 0.4); x.lineWidth = 1.4;
    for (let i = 1; i < 7; i++) {
      const a = Math.PI + (i / 7) * Math.PI;
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.stroke();
    }
    for (let ring = 1; ring < 3; ring++) {
      x.beginPath(); x.arc(cx, cy, rad * ring / 3, Math.PI, 0); x.stroke();
    }
    x.restore();
    radialGlow(x, cx, cy - rad * 0.4, rad * 1.6, P.cool, 0.22);
  } else if (kind === 'Space Elevator') {
    const cx = W * (0.25 + r() * 0.5);
    // tether to top of frame
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createLinearGradient(cx, 0, cx, horizonY);
    g.addColorStop(0, rgba(P.cool, 0.0));
    g.addColorStop(0.5, rgba(P.cool, 0.35));
    g.addColorStop(1, rgba(P.cool, 0.7));
    x.strokeStyle = g; x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx + W * 0.02, 0); x.lineTo(cx, horizonY); x.stroke();
    // climber pods
    for (let i = 0; i < 4; i++) {
      const t = r(); const py = t * horizonY; const px = cx + W * 0.02 * (1 - t);
      x.fillStyle = rgba(mix(P.cool, '#fff', 0.5), 0.9);
      x.fillRect(px - 3, py - 2, 6, 4);
      radialGlow(x, px, py, 12, P.cool, 0.4);
    }
    x.shadowBlur = 0; x.restore();
    // anchor base tower
    drawBuilding(x, P, cx - W * 0.025, horizonY - horizonY * 0.4, W * 0.05, horizonY * 0.4, baseCol, P.win, 0.5, 1, 'flat', r);
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * MASTER DRAW
 * ══════════════════════════════════════════════════════════════════════════ */

function draw(cv, p, r) {
  const Sky = p.sky, P = p.pal;
  const W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);

  // density multipliers
  const dens = p.density === 'Sparse Outpost' ? 0.55 : p.density === 'Hyperdense' ? 1.5 : 1;
  const winLitBase = p.density === 'Sparse Outpost' ? 0.3 : p.density === 'Hyperdense' ? 0.6 : 0.45;

  // camera sets horizon + whether there's a reflection
  const waterfront = p.camera === 'Waterfront';
  const aerial = p.camera === 'Aerial Overlook';
  const canyon = p.camera === 'Street Canyon';

  let horizonY;
  if (waterfront) horizonY = H * (0.5 + r() * 0.08);
  else if (aerial) horizonY = H * (0.34 + r() * 0.08);
  else if (canyon) horizonY = H * (0.3 + r() * 0.06);
  else horizonY = H * (0.55 + r() * 0.1); // panorama

  // 1. SKY
  paintSky(x, Sky, W, H, horizonY, r);

  // atmospheric horizon haze band — towers fade into this
  x.save();
  x.globalCompositeOperation = 'screen';
  const hz = x.createLinearGradient(0, horizonY - H * 0.18, 0, horizonY + H * 0.02);
  hz.addColorStop(0, rgba(Sky.glow, 0));
  hz.addColorStop(1, rgba(Sky.glow, 0.6));
  x.fillStyle = hz;
  x.fillRect(0, horizonY - H * 0.22, W, H * 0.24);
  x.restore();

  // 2-4. SKYLINE LAYERS back-to-front, atmospheric perspective.
  // Distant towers are HAZY/LIGHT (lifted toward the sky glow); near towers are
  // dark and saturated. farCol is a luminous haze so the back rank reads as a
  // city silhouette, not black bars.
  const farCol  = mix(Sky.hor, Sky.glow, 0.55);
  const layerDefs = [
    { dt: 0.0,  baseY: horizonY - H * 0.0,  maxH: H * 0.16, col: mix(farCol, '#ffffff', 0.18), lit: winLitBase * 0.25, neon: 0.12 },
    { dt: 0.33, baseY: horizonY + H * 0.01, maxH: H * 0.26, col: mix(farCol, '#10101e', 0.45),  lit: winLitBase * 0.55, neon: 0.3 },
    { dt: 0.66, baseY: horizonY + H * 0.03, maxH: H * 0.42, col: mix('#08090f', farCol, 0.22),  lit: winLitBase * 0.9,  neon: 0.6 },
    { dt: 1.0,  baseY: horizonY + H * 0.06, maxH: H * 0.58, col: '#040509',                      lit: winLitBase, neon: 0.9 },
  ];

  const layerCounts = [];
  for (const L of layerDefs) {
    paintSkylineLayer(x, P, Sky, W, H, L.baseY, L.dt, 0, L.maxH * (0.8 + dens * 0.3), L.col, L.lit, L.neon, r);
  }

  // 5. HERO LANDMARK (sits in mid-near depth, before nearest foreground)
  drawLandmark(x, P, Sky, p.landmark, W, H, horizonY, r);

  // 6. TRANSIT + TRAFFIC + SEARCHLIGHTS
  drawTransit(x, P, W, H, horizonY, r);
  drawTraffic(x, P, W, H, horizonY, Math.floor((55 + r() * 70) * dens), r);
  if (r() < 0.78) drawSearchlights(x, P, W, horizonY, rint(r, 3, 6), r);

  // ground / foreground below horizon
  if (waterfront) {
    // WATERFRONT: a mirrored, ripple-broken reflection of the city in dark water.
    const waterTop = horizonY;
    const waterH = H - waterTop;
    const wg = x.createLinearGradient(0, waterTop, 0, H);
    wg.addColorStop(0, mix(Sky.hor, '#000008', 0.35));
    wg.addColorStop(1, mix('#02030a', Sky.glow, 0.06));
    x.fillStyle = wg;
    x.fillRect(0, waterTop, W, waterH);
    // 1. flipped skyline silhouette reflection (impressionistic, brighter)
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.translate(0, waterTop * 2);
    x.scale(1, -1);
    x.globalAlpha = 0.4;
    paintSkylineLayer(x, P, Sky, W, H, horizonY + H * 0.05, 1.0, 0, H * 0.5, '#05060c', winLitBase, 0.85, r);
    x.restore();
    // 2. vertical neon column smears — the signature water look: each bright
    //    source drops a wavering coloured streak straight down into the water.
    x.save();
    x.globalCompositeOperation = 'lighter';
    const smears = Math.floor((18 + r() * 22) * (0.6 + dens * 0.4));
    for (let i = 0; i < smears; i++) {
      const sxp = r() * W;
      const roll = r();
      const col = roll < 0.4 ? P.hot : roll < 0.7 ? P.cool : roll < 0.85 ? P.pop : P.win;
      const len = waterH * (0.2 + r() * 0.6);
      const w0 = 2 + r() * 6;
      const g = x.createLinearGradient(sxp, waterTop, sxp, waterTop + len);
      g.addColorStop(0, rgba(col, 0.55));
      g.addColorStop(0.5, rgba(col, 0.18));
      g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g;
      // wavering: draw as a few offset vertical slivers
      let yy = waterTop;
      let xx = sxp;
      while (yy < waterTop + len) {
        const seg = 6 + r() * 10;
        xx += (r() - 0.5) * w0 * 1.2;
        x.fillRect(xx - w0 / 2, yy, w0, seg);
        yy += seg;
      }
    }
    x.restore();
    // 3. ripple breakup: faint horizontal bands, denser/closer near the viewer
    x.save();
    x.globalCompositeOperation = 'source-over';
    let ry = waterTop + 3; let step = 3;
    while (ry < H) {
      const d = (ry - waterTop) / waterH;
      x.fillStyle = rgba(mix('#02030a', Sky.glow, 0.04), 0.18 + d * 0.32);
      x.fillRect(0, ry, W, step * 0.55);
      ry += step; step += 0.5 + r() * 0.6;
    }
    x.restore();
    // 4. horizon waterline glow + sparse shimmer glints
    radialGlow(x, W * (0.3 + r() * 0.4), waterTop, W * 0.5, Sky.glow, 0.18);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 50; i++) {
      const gx = r() * W, gy = waterTop + r() * waterH;
      const col = pick([P.hot, P.cool, P.pop, Sky.glow], r);
      x.fillStyle = rgba(col, 0.1 + r() * 0.3);
      x.fillRect(gx, gy, 2 + r() * 10, 1);
    }
    x.restore();
  } else if (aerial) {
    // city sprawl floor receding to horizon: a perspective street grid of glowing
    // avenues, with city-block lights packed between them.
    const fg = x.createLinearGradient(0, horizonY, 0, H);
    fg.addColorStop(0, mix('#06081a', Sky.glow, 0.16));
    fg.addColorStop(1, '#020310');
    x.fillStyle = fg; x.fillRect(0, horizonY, W, H - horizonY);
    const vpx = W * (0.3 + r() * 0.4);            // vanishing point x
    const groundH = H - horizonY;
    x.save(); x.globalCompositeOperation = 'lighter';
    // block lights packed across the sprawl (atmospheric: dim far, bright near)
    const blockRows = 30;
    for (let ri = 0; ri < blockRows; ri++) {
      const t = ri / blockRows;
      const y = horizonY + Math.pow(t, 2.0) * groundH;
      const rowDepth = 0.15 + t * 0.85;
      const n = Math.floor((30 + t * 90) * dens);
      for (let c = 0; c < n; c++) {
        const gx = r() * W;
        const roll = r();
        const col = roll < 0.72 ? P.win : roll < 0.85 ? P.hot : roll < 0.93 ? P.cool : P.pop;
        const sz = 0.6 + t * 2.6;
        x.fillStyle = rgba(col, (0.18 + r() * 0.4) * rowDepth);
        x.fillRect(gx, y, sz, sz);
      }
    }
    // converging avenues — warm/cool light rivers running to the vanishing point
    const aves = rint(r, 5, 8);
    for (let a = 0; a < aves; a++) {
      const fx0 = W * ((a + 0.5) / aves + (r() - 0.5) * 0.06);
      const warm = r() < 0.5;
      const col = warm ? P.pop : P.cool;
      const g = x.createLinearGradient(vpx, horizonY, fx0, H);
      g.addColorStop(0, rgba(col, 0.0));
      g.addColorStop(0.6, rgba(col, 0.18));
      g.addColorStop(1, rgba(mix(col, '#fff', 0.3), 0.5));
      x.strokeStyle = g;
      x.lineWidth = 1 + 4 * 1; // widens via the path itself below
      // draw as a thin tapering quad
      x.beginPath();
      const nearW = groundH * 0.012 + 2;
      x.moveTo(vpx, horizonY);
      x.lineTo(fx0 - nearW, H);
      x.lineTo(fx0 + nearW, H);
      x.closePath();
      x.fillStyle = g; x.fill();
    }
    // a couple of cross-streets (horizontal light lines, spaced by perspective)
    let cy2 = horizonY + groundH * 0.12; let gapc = groundH * 0.05;
    while (cy2 < H) {
      x.strokeStyle = rgba(mix(P.cool, '#fff', 0.2), 0.12 + (cy2 - horizonY) / groundH * 0.2);
      x.lineWidth = 1 + (cy2 - horizonY) / groundH * 2;
      x.beginPath(); x.moveTo(0, cy2); x.lineTo(W, cy2); x.stroke();
      cy2 += gapc; gapc *= 1.35;
    }
    x.restore();
  } else if (canyon) {
    // STREET CANYON: two towering near walls on the left & right (slight inward
    // lean), a bright neon-lit wet street at the bottom, and a vertical slot of
    // sky + distant skyline up the centre. The walls DOMINATE the frame and are
    // densely lit with windows + big vertical neon signage. Note: the centre slot
    // shows the skyline layers painted earlier, so we only paint the two walls,
    // the street, and a darkening over the lower distant skyline.
    const wallFrac = 0.27 + r() * 0.05;           // each wall's width fraction
    const leanTop = W * (0.05 + r() * 0.03);        // inward lean of the top edge
    const wallCol = mix('#14161f', P.cool, 0.06);
    for (const side of [0, 1]) {
      const dir = side === 0 ? -1 : 1;
      const outerX = side === 0 ? 0 : W;
      const innerBot = side === 0 ? W * wallFrac : W * (1 - wallFrac);
      const innerTop = innerBot + dir * leanTop;    // leans toward centre at top
      // wall face quad
      x.fillStyle = wallCol;
      x.beginPath();
      x.moveTo(outerX, 0); x.lineTo(innerTop, 0); x.lineTo(innerBot, H); x.lineTo(outerX, H);
      x.closePath(); x.fill();
      x.save();
      x.beginPath();
      x.moveTo(outerX, 0); x.lineTo(innerTop, 0); x.lineTo(innerBot, H); x.lineTo(outerX, H); x.closePath();
      x.clip();
      // ambient face shading: brighter near the street-facing inner edge
      const fg2 = x.createLinearGradient(outerX, 0, innerBot, 0);
      fg2.addColorStop(0, rgba('#04050c', 0.55));
      fg2.addColorStop(1, rgba(mix(P.cool, '#000', 0.55), 0.0));
      x.fillStyle = fg2; x.fillRect(Math.min(outerX, innerBot), 0, Math.abs(innerBot - outerX) + 4, H);
      // dense window grid across the whole wall (regular floors + columns)
      x.globalCompositeOperation = 'lighter';
      const floors = 30;
      const rowH = H / floors;
      for (let f = 0; f < floors; f++) {
        const yy = f * rowH + rowH * 0.2;
        const innerX = innerTop + (innerBot - innerTop) * (yy / H);
        const span = Math.abs(innerX - outerX);
        const winN = Math.max(3, Math.floor(span / 16));
        // some floors are darker (offices off) to break the rigid grid
        const floorLit = (Math.min(0.6, winLitBase)) * (r() < 0.2 ? 0.25 : 1);
        for (let wi = 0; wi < winN; wi++) {
          if (r() > floorLit) continue;
          const wx = outerX + (innerX - outerX) * (wi + 0.5) / winN + (r() - 0.5) * 4;
          const roll = r();
          const col = roll < 0.74 ? P.win : roll < 0.88 ? P.hot : P.cool;
          x.fillStyle = rgba(col, 0.45 + r() * 0.5);
          x.fillRect(wx - 2.5, yy + (r() - 0.5) * 2, 5, rowH * 0.5);
        }
      }
      x.restore();
      // bright rim light on the inner edge (street-facing corner)
      x.save(); x.globalCompositeOperation = 'lighter';
      x.strokeStyle = rgba(mix(P.cool, '#fff', 0.35), 0.5); x.lineWidth = 2.5;
      x.shadowColor = P.cool; x.shadowBlur = 8;
      x.beginPath(); x.moveTo(innerTop, 0); x.lineTo(innerBot, H); x.stroke();
      x.shadowBlur = 0; x.restore();
      // big vertical neon signage running up the inner face
      const sn = rint(r, 3, 5);
      for (let s = 0; s < sn; s++) {
        const t = (s + 0.5) / sn;
        const yy = t * H * 0.86;
        const innerX = innerTop + (innerBot - innerTop) * (yy / H);
        const sx2 = innerX - dir * (W * 0.03 + r() * W * 0.02);
        drawSignBar(x, P, sx2, yy, H * 0.22, pick([P.hot, P.cool, P.pop], r), r);
        if (r() < 0.6) drawNeonStrip(x, P, sx2 - W * 0.03, yy + H * 0.04, W * 0.05, pick([P.hot, P.cool], r), r);
      }
    }
    // WET STREET at the bottom: reflective neon floor
    const streetTop = H * (0.82 + r() * 0.06);
    const wg = x.createLinearGradient(0, streetTop, 0, H);
    wg.addColorStop(0, rgba(mix('#04050c', P.cool, 0.1), 0.0));
    wg.addColorStop(0.5, rgba(mix('#04050c', P.hot, 0.12), 0.5));
    wg.addColorStop(1, rgba(mix('#02030a', P.cool, 0.2), 0.85));
    x.fillStyle = wg; x.fillRect(0, streetTop, W, H - streetTop);
    radialGlow(x, W / 2, H, W * 0.6, P.cool, 0.2);
    radialGlow(x, W / 2, streetTop, W * 0.4, P.hot, 0.16);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 50; i++) {
      const gx = r() * W, gy = streetTop + r() * (H - streetTop);
      x.fillStyle = rgba(pick([P.hot, P.cool, P.pop, P.win], r), 0.12 + r() * 0.35);
      x.fillRect(gx, gy, 2 + r() * 14, 1.4);
    }
    x.restore();
  } else {
    // PANORAMA: a big near rooftop edge silhouette anchors the bottom third with
    // parapet rim-light, vents, antennae, water tanks and rooftop neon — a real
    // foreground, not a thin strip.
    const edgeY = H * (0.7 + r() * 0.08);
    // build the jagged rooftop profile
    const prof = [[0, edgeY + (r() - 0.5) * H * 0.04]];
    let cx2 = 0;
    while (cx2 < W) {
      const seg = W * (0.05 + r() * 0.1);
      const hh = edgeY + (r() - 0.5) * H * 0.07;
      prof.push([cx2, hh]); prof.push([cx2 + seg, hh]);
      cx2 += seg;
    }
    prof.push([W, edgeY]);
    x.fillStyle = '#020308';
    x.beginPath();
    x.moveTo(0, H);
    for (const [px, py] of prof) x.lineTo(px, py);
    x.lineTo(W, H); x.closePath(); x.fill();
    // parapet rim light along the top edge
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(mix(P.cool, '#fff', 0.3), 0.5); x.lineWidth = 1.6;
    x.beginPath();
    for (let i = 0; i < prof.length; i++) { const [px, py] = prof[i]; if (i === 0) x.moveTo(px, py); else x.lineTo(px, py); }
    x.stroke();
    x.restore();
    // rooftop clutter: antennae (with blinks), vents, water tanks, neon box
    x.save();
    const clutter = rint(r, 14, 22);
    for (let i = 0; i < clutter; i++) {
      const ax = r() * W;
      // find roof y near ax
      let ry = edgeY;
      for (let j = 1; j < prof.length; j++) { if (prof[j][0] >= ax) { ry = prof[j - 1][1]; break; } }
      const roll = r();
      if (roll < 0.4) {
        // antenna mast
        const ah = H * (0.04 + r() * 0.1);
        x.strokeStyle = '#0a0c14'; x.lineWidth = 1.6 + r() * 1.5;
        x.beginPath(); x.moveTo(ax, ry); x.lineTo(ax, ry - ah); x.stroke();
        if (r() < 0.6) {
          x.save(); x.globalCompositeOperation = 'lighter';
          x.fillStyle = rgba('#ff3a3a', 0.95);
          x.beginPath(); x.arc(ax, ry - ah, 2.2, 0, Math.PI * 2); x.fill();
          radialGlow(x, ax, ry - ah, 16, '#ff3a3a', 0.4);
          x.restore();
        }
      } else if (roll < 0.7) {
        // boxy vent / housing unit
        const bw = W * (0.02 + r() * 0.03), bh = H * (0.02 + r() * 0.03);
        x.fillStyle = '#070912';
        x.fillRect(ax - bw / 2, ry - bh, bw, bh);
        if (r() < 0.5) { x.save(); x.globalCompositeOperation = 'lighter'; drawNeonStrip(x, P, ax - bw / 2, ry - bh * 0.5, bw, pick([P.hot, P.cool], r), r); x.restore(); }
      } else {
        // water tank (cylinder silhouette)
        const tw = W * 0.018 + r() * W * 0.012, th = H * (0.03 + r() * 0.03);
        x.fillStyle = '#080a13';
        x.fillRect(ax - tw / 2, ry - th, tw, th);
        x.beginPath(); x.ellipse(ax, ry - th, tw / 2, tw * 0.18, 0, 0, Math.PI * 2); x.fill();
      }
    }
    x.restore();
    // a big rooftop neon billboard somewhere on the edge
    if (r() < 0.8) {
      const bx = W * (0.15 + r() * 0.5);
      let ry = edgeY;
      for (let j = 1; j < prof.length; j++) { if (prof[j][0] >= bx) { ry = prof[j - 1][1]; break; } }
      const bw = W * (0.1 + r() * 0.12), bh = H * 0.05;
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba(pick([P.hot, P.cool, P.pop], r), 0.22);
      x.fillRect(bx, ry - bh - H * 0.04, bw, bh);
      drawNeonStrip(x, P, bx, ry - bh - H * 0.04, bw, pick([P.hot, P.cool, P.pop], r), r);
      drawNeonStrip(x, P, bx, ry - bh * 0.4 - H * 0.04, bw * 0.7, pick([P.hot, P.cool, P.pop], r), r);
      x.restore();
    }
  }

  // 7. ATMOSPHERE — volumetric haze drifting between layers + overall bloom
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const fx = W * r(), fy = horizonY * (0.4 + r() * 0.6), fr = S * (0.2 + r() * 0.35);
    radialGlow(x, fx, fy, fr, mix(Sky.glow, P.cool, r() * 0.5), 0.06 + r() * 0.05);
  }
  x.restore();

  // global colour bloom over brightest band near horizon
  x.save();
  x.globalCompositeOperation = 'screen';
  const bloom = x.createLinearGradient(0, horizonY - H * 0.1, 0, horizonY + H * 0.05);
  bloom.addColorStop(0, rgba(P.hot, 0));
  bloom.addColorStop(0.6, rgba(mix(P.hot, P.cool, 0.5), 0.1));
  bloom.addColorStop(1, rgba(P.cool, 0));
  x.fillStyle = bloom;
  x.fillRect(0, horizonY - H * 0.1, W, H * 0.15);
  x.restore();

  // finishing
  grain(x, W, H, 700, r);
  vignette(x, W, H, 0.42);
}

/* ── Exports ─────────────────────────────────────────────────────────────── */
  return { draw, SKIES, PALS, FMTS, CAMERAS, DENSITY, LANDMARKS };
})();

/* ── DAY look (self-contained) ───────────────────────────────────────────── */
const DAY = (function () {
// @ts-nocheck
/*
 * METROPOLIS — by opus4-8. "A neon megacity, seen from across the world."
 *
 * A generative cinematic establishing shot of a vast sci-fi / cyberpunk city.
 * This is a DEPICTED SCENE, not an abstract field: a dramatic saturated sky, a
 * layered skyline of dozens of towers each speckled with grids of lit windows,
 * neon signage, elevated transit lines, streaks of flying-car traffic, sweeping
 * searchlights, rooftop glow, volumetric haze between depth layers, and a hero
 * foreground anchor (a mega-tower, a waterfront with a rippled reflection, or a
 * near rooftop edge silhouette).
 *
 * Composition is built strictly back-to-front with atmospheric perspective:
 *   sky → distant haze towers (hazy/desaturated/light) → mid skyline → near
 *   skyline (dark/saturated) → transit + traffic + searchlights → foreground
 *   anchor → bloom + grain + vignette finish.
 *
 * Determinism is sacred. EVERY trait-determining choice is drawn in paramsOf(r)
 * in a FIXED ORDER, so traits() and draw() never disagree. Seed = rng(tokenId).
 * Same tokenId → identical art + traits, forever, on every machine.
 */

/* ════════════════════════════════════════════════════════════════════════════
 * TRAIT VOCABULARIES
 * ══════════════════════════════════════════════════════════════════════════ */

/* Sky / Time-of-day — DAYLIGHT→SUNSET. Each is a bold, saturated luminous
 * gradient that FILLS the frame — no black, never muddy. The city reads as bold
 * chromatic silhouettes against this sky.
 *   top/mid/hor = the sky gradient (top of frame → horizon).
 *   glow        = the sun/sky-light colour (lights distant haze + reflections).
 *   silNear     = the colour the NEAREST towers take (rich, chromatic, dark-ish
 *                 but never black — a saturated silhouette).
 *   silFar      = the colour DISTANT towers wash toward (hazy, light, sky-tinted).
 *   feat        = celestial / atmospheric feature. */
const SKIES = [
  // name             top        mid        hor        glow       silNear    silFar     feature
  { name: 'Tangerine Dawn', top: '#ffd36a', mid: '#ff9e4a', hor: '#ff6a8a', glow: '#fff0b0', silNear: '#5a2a4a', silFar: '#ffb486', feat: 'sun'    },
  { name: 'Coral Sunset',   top: '#ff7e6b', mid: '#ff5a8c', hor: '#ffc15a', glow: '#ffe07a', silNear: '#48214f', silFar: '#ff9ea0', feat: 'sun'    },
  { name: 'Turquoise Noon', top: '#34c6e0', mid: '#6fe3d2', hor: '#cdf6d2', glow: '#ffffff', silNear: '#1c5a6a', silFar: '#bdeee0', feat: 'noon'   },
  { name: 'Magenta Dusk',   top: '#6a2aff', mid: '#d23ac0', hor: '#ff7ab0', glow: '#ffb0e6', silNear: '#3a1a52', silFar: '#c884d6', feat: 'sun'    },
  { name: 'Golden Smog',    top: '#ffc24a', mid: '#ff8c3a', hor: '#ffd884', glow: '#fff0a0', silNear: '#5a3320', silFar: '#ffc890', feat: 'sun'    },
  { name: 'Ultraviolet Eve',top: '#3a1f8a', mid: '#7a3ad0', hor: '#ff6ab0', glow: '#c89aff', silNear: '#2a1a52', silFar: '#9a7ad6', feat: 'sun'    },
  { name: 'Cyan Lagoon',    top: '#2ad0c0', mid: '#3ab0e0', hor: '#a0f0e0', glow: '#e0ffff', silNear: '#16485a', silFar: '#a8e4dc', feat: 'noon'   },
  { name: 'Flamingo Haze',  top: '#ff8ad0', mid: '#ff6aa0', hor: '#ffd07a', glow: '#fff0c0', silNear: '#5a2a52', silFar: '#ffb0c4', feat: 'sun'    },
];

/* Accent palettes — saturated dual/tri schemes used for windows (warm glints),
 * signage, traffic, rooftop glow, rim-light. In daylight, windows are warm
 * GLINTS, not the only light source. hot = warm accent, cool = cool accent,
 * pop = bright accent, win = warm window glint. */
const PALS = [
  { name: 'Miami Heat',      hot: '#ff2d6e', cool: '#22e0ff', pop: '#ffd23a', win: '#fff0c0' },
  { name: 'Sunkissed',       hot: '#ff7a2a', cool: '#ffd23a', pop: '#ff4a8a', win: '#fff4d0' },
  { name: 'Lagoon Glass',    hot: '#16d0a0', cool: '#2adfff', pop: '#ffea6a', win: '#e8fff4' },
  { name: 'Coral Reef',      hot: '#ff5a6a', cool: '#ff9a4a', pop: '#ffe089', win: '#fff0d8' },
  { name: 'Sky Glass',       hot: '#ff8ac0', cool: '#5ab0ff', pop: '#fff0a0', win: '#eaf6ff' },
  { name: 'Vaporwave',       hot: '#ff5fd2', cool: '#36e0ff', pop: '#ffd86a', win: '#ffe8f8' },
  { name: 'Citrus Pop',      hot: '#ff6a3a', cool: '#3adf9a', pop: '#ffe23a', win: '#fff6dc' },
  { name: 'Orchid Bloom',    hot: '#c84aff', cool: '#3adfff', pop: '#ff6ab0', win: '#f4e8ff' },
  { name: 'Honey Gold',      hot: '#ffae2a', cool: '#ff6a4a', pop: '#fff18a', win: '#fff2cc' },
  { name: 'Prism Pastel',    hot: '#ff7ad0', cool: '#7ad0ff', pop: '#ffe07a', win: '#fbeeff' },
];

/* Camera / layout — structurally distinct compositions. */
const CAMERAS = ['Waterfront', 'Aerial Overlook', 'Street Canyon', 'Skyline Panorama'];

/* Density — how packed the skyline is. */
const DENSITY = ['Sparse Outpost', 'Standard City', 'Hyperdense'];

/* Hero landmark feature. */
const LANDMARKS = ['Mega Spire', 'Twin Towers', 'Arcology Dome', 'Space Elevator', 'None'];

/* Formats. */
const FMTS = [
  { W: 1240, H: 1240, t: 'Square' },
  { W: 1000, H: 1400, t: 'Tall'   },
  { W: 1500, H: 1000, t: 'Wide'   },
];

/* ── Param draw — FIXED ORDER. Never reorder. ────────────────────────────── */
function paramsOf(r) {
  const skyI    = Math.floor(r() * SKIES.length);
  const palI    = Math.floor(r() * PALS.length);
  const camera  = pick(CAMERAS, r);
  const density = pick(DENSITY, r);
  const landmark= pick(LANDMARKS, r);
  const fmt     = pick(FMTS, r);
  return { skyI, palI, camera, density, landmark, fmt };
}

function labels(p) {
  return {
    Sky:      SKIES[p.skyI].name,
    Palette:  PALS[p.palI].name,
    Camera:   p.camera,
    Density:  p.density,
    Landmark: p.landmark,
    Format:   p.fmt.t,
  };
}

/* ════════════════════════════════════════════════════════════════════════════
 * SKY
 * ══════════════════════════════════════════════════════════════════════════ */

function paintSky(x, S, W, H, horizonY, r) {
  // Bold saturated daylight gradient that fills the upper frame: top → mid →
  // horizon. The horizon is the brightest band (where the sun sits).
  const g = x.createLinearGradient(0, 0, 0, horizonY);
  g.addColorStop(0,    S.top);
  g.addColorStop(0.5,  S.mid);
  g.addColorStop(0.85, S.hor);
  g.addColorStop(1,    mix(S.hor, S.glow, 0.45));
  x.fillStyle = g;
  x.fillRect(0, 0, W, horizonY + 2);

  // High-altitude colour banding — soft horizontal chroma bands (risograph-style)
  // to give the sky depth without dulling it. Drawn with screen so it lifts.
  x.save();
  x.globalCompositeOperation = 'screen';
  const bands = rint(r, 3, 5);
  for (let b = 0; b < bands; b++) {
    const by = horizonY * (0.15 + 0.6 * (b / bands)) + randn(r) * horizonY * 0.04;
    const bh = horizonY * (0.05 + r() * 0.06);
    const col = mix(S.mid, S.glow, 0.3 + r() * 0.4);
    const bg = x.createLinearGradient(0, by - bh, 0, by + bh);
    bg.addColorStop(0, rgba(col, 0));
    bg.addColorStop(0.5, rgba(col, 0.14 + r() * 0.1));
    bg.addColorStop(1, rgba(col, 0));
    x.fillStyle = bg;
    x.fillRect(0, by - bh, W, bh * 2);
  }
  x.restore();

  // celestial feature
  const cf = S.feat;
  if (cf === 'sun') {
    // a big luminous low sun near the horizon — the light source of the scene.
    const sunX = W * (0.2 + r() * 0.6), sunY = horizonY * (0.7 + r() * 0.2);
    const rad = S0_min(W, H) * (0.1 + r() * 0.06);
    radialGlow(x, sunX, sunY, rad * 4.2, S.glow, 0.5);
    radialGlow(x, sunX, sunY, rad * 2.0, mix(S.hor, S.glow, 0.5), 0.7);
    // bright disc
    x.save();
    x.globalCompositeOperation = 'lighter';
    const dg = x.createRadialGradient(sunX, sunY, 0, sunX, sunY, rad);
    dg.addColorStop(0, rgba(mix(S.glow, '#ffffff', 0.6), 0.95));
    dg.addColorStop(0.6, rgba(S.glow, 0.6));
    dg.addColorStop(1, rgba(S.glow, 0));
    x.fillStyle = dg;
    x.fillRect(sunX - rad, sunY - rad, rad * 2, rad * 2);
    x.restore();
  } else if (cf === 'noon') {
    // high bright sun + soft drifting cloud puffs catching light.
    const sunX = W * (0.25 + r() * 0.5), sunY = horizonY * (0.18 + r() * 0.2);
    const rad = S0_min(W, H) * (0.07 + r() * 0.04);
    radialGlow(x, sunX, sunY, rad * 5, S.glow, 0.45);
    x.save();
    x.globalCompositeOperation = 'lighter';
    const dg = x.createRadialGradient(sunX, sunY, 0, sunX, sunY, rad);
    dg.addColorStop(0, rgba('#ffffff', 0.95));
    dg.addColorStop(0.7, rgba(S.glow, 0.5));
    dg.addColorStop(1, rgba(S.glow, 0));
    x.fillStyle = dg;
    x.fillRect(sunX - rad, sunY - rad, rad * 2, rad * 2);
    x.restore();
  }

  // Soft luminous clouds for every sky — a few wide horizontal puffs, lit on
  // their undersides by the sky glow. Keeps the field alive without muddying.
  x.save();
  x.globalCompositeOperation = 'screen';
  const clouds = rint(r, 3, 6);
  for (let i = 0; i < clouds; i++) {
    const cx = r() * W;
    const cy = horizonY * (0.2 + r() * 0.55);
    const cw = S0_min(W, H) * (0.18 + r() * 0.3);
    const ch = cw * (0.18 + r() * 0.12);
    const col = mix(S.glow, '#ffffff', 0.3 + r() * 0.3);
    const cg = x.createRadialGradient(cx, cy, 0, cx, cy, cw);
    cg.addColorStop(0, rgba(col, 0.14 + r() * 0.1));
    cg.addColorStop(0.6, rgba(col, 0.05));
    cg.addColorStop(1, rgba(col, 0));
    x.save();
    x.translate(cx, cy); x.scale(1, ch / cw); x.translate(-cx, -cy);
    x.fillStyle = cg;
    x.fillRect(cx - cw, cy - cw, cw * 2, cw * 2);
    x.restore();
  }
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * HELPERS
 * ══════════════════════════════════════════════════════════════════════════ */

function S0_min(W, H) { return Math.min(W, H); }

function radialGlow(x, cx, cy, rad, col, a) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
  g.addColorStop(0, rgba(col, a));
  g.addColorStop(0.4, rgba(col, a * 0.4));
  g.addColorStop(1, rgba(col, 0));
  x.fillStyle = g;
  x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  x.restore();
}

/* A single building rectangle silhouette with optional roof shape + windows.
 * skyTint = the sky colour these facades catch (set per-draw via _SKYTINT). */
let _SKYTINT = '#ffffff';
let _SKYGLOW = '#ffffff';
function drawBuilding(x, P, bx, by, bw, bh, baseCol, winCol, winLit, depth, silhouette, r) {
  // GLASS FACADE: vertical gradient — warm sky-lit top catching the sky colour,
  // cooler/darker shadow at the base. Gives the silhouette dimension + glass feel.
  const fg = x.createLinearGradient(bx, by, bx, by + bh);
  fg.addColorStop(0, mix(baseCol, _SKYTINT, 0.5 * depth + 0.12));
  fg.addColorStop(0.4, mix(baseCol, _SKYTINT, 0.22 * depth + 0.05));
  fg.addColorStop(1, mix(baseCol, '#000000', 0.12));
  x.fillStyle = fg;
  x.fillRect(bx, by, bw, bh);
  // sky-lit vertical edge (rim-light) on the sun-facing side — a bright thin band
  if (bw > 5) {
    const rg = x.createLinearGradient(bx, by, bx + bw, by);
    rg.addColorStop(0, rgba(mix(_SKYGLOW, '#ffffff', 0.3), 0.0));
    rg.addColorStop(0.92, rgba(mix(_SKYGLOW, '#ffffff', 0.3), 0.0));
    rg.addColorStop(1, rgba(mix(_SKYGLOW, '#ffffff', 0.3), 0.5 * depth));
    x.save(); x.globalCompositeOperation = 'screen';
    x.fillStyle = rg; x.fillRect(bx, by, bw, bh);
    x.restore();
  }

  // roof feature
  const roof = silhouette;
  if (roof === 'antenna') {
    const ax = bx + bw * (0.3 + r() * 0.4);
    x.strokeStyle = baseCol; x.lineWidth = Math.max(1, bw * 0.04);
    x.beginPath(); x.moveTo(ax, by); x.lineTo(ax, by - bh * (0.1 + r() * 0.25)); x.stroke();
    // red blink at tip handled by caller via list
  } else if (roof === 'step') {
    // ziggurat: stack a couple narrower blocks
    let sw = bw, sx = bx, sy = by;
    for (let s = 0; s < 2; s++) {
      sw *= 0.6; sx = bx + (bw - sw) / 2; sy -= bh * 0.12;
      x.fillStyle = baseCol;
      x.fillRect(sx, sy, sw, bh * 0.12 + 2);
    }
  } else if (roof === 'spire') {
    x.fillStyle = baseCol;
    x.beginPath();
    x.moveTo(bx, by); x.lineTo(bx + bw / 2, by - bh * (0.2 + r() * 0.3)); x.lineTo(bx + bw, by);
    x.closePath(); x.fill();
  } else if (roof === 'dome') {
    x.fillStyle = baseCol;
    x.beginPath(); x.arc(bx + bw / 2, by, bw / 2, Math.PI, 0); x.fill();
  } else if (roof === 'slant') {
    x.fillStyle = baseCol;
    x.beginPath();
    x.moveTo(bx, by); x.lineTo(bx + bw, by - bh * 0.14); x.lineTo(bx + bw, by); x.closePath(); x.fill();
  }

  // windows — grid of lit dots. density falls with depth (distant = sparser glow)
  if (winLit > 0 && bw > 6 && bh > 10) {
    const cell = clamp(bw / (3 + Math.floor(r() * 4)), 3, 9);
    const cols = Math.max(1, Math.floor(bw / cell) - 1);
    const rowH = clamp(cell * (1.3 + r() * 0.6), 4, 12);
    const rows = Math.max(1, Math.floor(bh / rowH) - 1);
    const mx = (bw - cols * cell) / 2;
    const wpx = Math.max(1, cell * 0.5);
    const wpy = Math.max(1, rowH * 0.42);
    for (let cyi = 0; cyi < rows; cyi++) {
      for (let cxi = 0; cxi < cols; cxi++) {
        if (r() > winLit) continue;
        const wx = bx + mx + cxi * cell + cell * 0.25;
        const wy = by + 4 + cyi * rowH + rowH * 0.3;
        // colour: mostly window-warm, occasional neon accent
        let c = winCol;
        const roll = r();
        if (roll < 0.08) c = P.hot;
        else if (roll < 0.14) c = P.cool;
        const a = (0.5 + r() * 0.5) * (depth);
        x.fillStyle = rgba(c, a);
        x.fillRect(wx, wy, wpx, wpy);
      }
    }
  }
}

/* A vertical neon sign bar (kanji-style stacked segments) on a building face. */
function drawSignBar(x, P, bx, by, bh, col, r) {
  const w = clamp(bx * 0 + 5 + r() * 6, 4, 12);
  const segs = rint(r, 3, 7);
  const segH = (bh * (0.3 + r() * 0.4)) / segs;
  const startY = by + bh * (0.1 + r() * 0.3);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let s = 0; s < segs; s++) {
    const sy = startY + s * segH * 1.25;
    x.shadowColor = col; x.shadowBlur = 8;
    x.fillStyle = rgba(col, 0.85);
    x.fillRect(bx, sy, w, segH * 0.7);
  }
  x.shadowBlur = 0;
  x.restore();
}

/* A horizontal neon signage strip / billboard glow on a rooftop or face. */
function drawNeonStrip(x, P, sx, sy, sw, col, r) {
  const sh = clamp(sw * 0.12, 3, 10);
  x.save();
  x.globalCompositeOperation = 'lighter';
  x.shadowColor = col; x.shadowBlur = 12;
  x.fillStyle = rgba(col, 0.9);
  x.fillRect(sx, sy, sw, sh);
  x.shadowBlur = 0;
  // glow halo
  radialGlow(x, sx + sw / 2, sy + sh / 2, sw * 0.9, col, 0.18);
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * SKYLINE LAYERS
 * ══════════════════════════════════════════════════════════════════════════ */

/* Paint one skyline layer. depthT 0=farthest 1=nearest. baseColFar/Near let the
 * caller set atmospheric perspective tint. */
function paintSkylineLayer(x, P, Sky, W, H, baseY, depthT, count, maxH, baseCol, winLit, neonAmt, r) {
  // walk across, placing buildings of varied widths back to front within layer
  let cursor = -W * 0.02;
  const buildings = [];
  while (cursor < W * 1.02) {
    const bw = W * (0.02 + r() * 0.06) * (0.7 + depthT * 0.6);
    const bh = maxH * (0.25 + r() * 0.75);
    const bx = cursor;
    const by = baseY - bh;
    buildings.push({ bx, by, bw, bh });
    cursor += bw * (0.85 + r() * 0.4);
  }
  // sort: draw is left-to-right already; overlap creates depth within layer
  for (const b of buildings) {
    const sil = pickSilhouette(r);
    drawBuilding(x, P, b.bx, b.by, b.bw, b.bh, baseCol, P.win, winLit, 0.5 + depthT * 0.5, sil, r);
    b.sil = sil;
  }
  // neon + accents proportional to nearness
  for (const b of buildings) {
    if (r() < neonAmt * 0.5 && b.bw > 8) {
      const col = pick([P.hot, P.cool, P.pop], r);
      if (r() < 0.5) drawSignBar(x, P, b.bx + b.bw * (0.1 + r() * 0.7), b.by, b.bh, col, r);
      else drawNeonStrip(x, P, b.bx + 2, b.by + b.bh * (0.05 + r() * 0.5), b.bw - 4, col, r);
    }
    // rooftop glow halo on some near buildings
    if (depthT > 0.5 && r() < neonAmt * 0.4) {
      radialGlow(x, b.bx + b.bw / 2, b.by, b.bw * 1.2, pick([P.hot, P.cool, P.pop], r), 0.12);
    }
    // antenna blink
    if (b.sil === 'antenna' && r() < 0.5) {
      const ax = b.bx + b.bw * 0.5;
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba('#ff3a3a', 0.9);
      x.beginPath(); x.arc(ax, b.by - b.bh * 0.18, Math.max(1.2, b.bw * 0.06), 0, Math.PI * 2); x.fill();
      radialGlow(x, ax, b.by - b.bh * 0.18, b.bw * 0.6, '#ff3a3a', 0.3);
      x.restore();
    }
  }
  return buildings;
}

function pickSilhouette(r) {
  const roll = r();
  if (roll < 0.30) return 'flat';
  if (roll < 0.48) return 'antenna';
  if (roll < 0.62) return 'step';
  if (roll < 0.74) return 'spire';
  if (roll < 0.84) return 'slant';
  if (roll < 0.92) return 'dome';
  return 'flat';
}

/* ════════════════════════════════════════════════════════════════════════════
 * TRANSIT / TRAFFIC / SEARCHLIGHTS
 * ══════════════════════════════════════════════════════════════════════════ */

function drawTraffic(x, P, W, H, horizonY, n, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const warm = r() < 0.5;
    const col = warm ? P.pop : P.cool;
    const y = horizonY * (0.45 + r() * 0.5);
    const x0 = r() * W;
    const len = W * (0.06 + r() * 0.22);
    const dir = r() < 0.5 ? 1 : -1;
    const slope = randn(r) * 0.06;
    const g = x.createLinearGradient(x0, y, x0 + dir * len, y + slope * len);
    g.addColorStop(0, rgba(col, 0));
    g.addColorStop(0.7, rgba(col, 0.5));
    g.addColorStop(1, rgba(mix(col, '#fff', 0.4), 0.8));
    x.strokeStyle = g;
    x.lineWidth = 0.8 + r() * 1.4;
    x.beginPath(); x.moveTo(x0, y); x.lineTo(x0 + dir * len, y + slope * len); x.stroke();
  }
  x.restore();
}

/* Elevated maglev / skybridge lines between layers. */
function drawTransit(x, P, W, H, horizonY, r) {
  const lines = rint(r, 1, 3);
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < lines; i++) {
    const y = horizonY * (0.62 + r() * 0.32);
    const col = pick([P.cool, P.hot, P.pop], r);
    const amp = H * (0.006 + r() * 0.014);
    const phase = r() * 6;
    // the rail
    x.strokeStyle = rgba(mix(col, '#fff', 0.2), 0.35);
    x.lineWidth = 1.4 + r();
    x.beginPath();
    const steps = 60;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps; const px = t * W;
      const py = y + Math.sin(t * 4 + phase) * amp;
      if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.stroke();
    // light pods running on it
    const pods = rint(r, 3, 7);
    for (let p = 0; p < pods; p++) {
      const t = r(); const px = t * W; const py = y + Math.sin(t * 4 + phase) * amp;
      x.fillStyle = rgba(mix(col, '#fff', 0.5), 0.9);
      x.fillRect(px - 3, py - 1.4, 6, 2.8);
      radialGlow(x, px, py, 14, col, 0.4);
    }
    // support pylons
    x.strokeStyle = rgba(col, 0.14);
    x.lineWidth = 1;
    for (let s = 0; s < 6; s++) {
      const t = (s + 0.5) / 6; const px = t * W; const py = y + Math.sin(t * 4 + phase) * amp;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px, py + H * 0.1); x.stroke();
    }
  }
  x.restore();
}

function drawSearchlights(x, P, W, horizonY, n, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const bx = W * (0.1 + r() * 0.8);
    const by = horizonY * (0.9 + r() * 0.08);
    const ang = -Math.PI / 2 + randn(r) * 0.7;
    const len = horizonY * (0.6 + r() * 0.5);
    const spread = 0.04 + r() * 0.06;
    const col = pick([P.cool, P.pop, '#ffffff'], r);
    const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
    const g = x.createLinearGradient(bx, by, ex, ey);
    g.addColorStop(0, rgba(col, 0.32));
    g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g;
    const px1 = bx + Math.cos(ang - spread) * len, py1 = by + Math.sin(ang - spread) * len;
    const px2 = bx + Math.cos(ang + spread) * len, py2 = by + Math.sin(ang + spread) * len;
    x.beginPath(); x.moveTo(bx, by); x.lineTo(px1, py1); x.lineTo(px2, py2); x.closePath(); x.fill();
  }
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * HERO LANDMARK
 * ══════════════════════════════════════════════════════════════════════════ */

function drawLandmark(x, P, Sky, kind, W, H, horizonY, r) {
  if (kind === 'None') return;
  // chromatic near-silhouette, never black — richer than the near skyline.
  const baseCol = mix(Sky.silNear, '#000000', 0.18);
  if (kind === 'Mega Spire') {
    const cx = W * (0.3 + r() * 0.4);
    const baseW = W * (0.06 + r() * 0.04);
    const topY = horizonY * (0.05 + r() * 0.12);
    // tapering tower
    x.fillStyle = baseCol;
    x.beginPath();
    x.moveTo(cx - baseW / 2, horizonY);
    x.lineTo(cx - baseW * 0.12, topY + horizonY * 0.08);
    x.lineTo(cx, topY);
    x.lineTo(cx + baseW * 0.12, topY + horizonY * 0.08);
    x.lineTo(cx + baseW / 2, horizonY);
    x.closePath(); x.fill();
    // windows + vertical neon edge
    drawBuilding(x, P, cx - baseW / 2, topY + horizonY * 0.1, baseW, horizonY - (topY + horizonY * 0.1), baseCol, P.win, 0.5, 1, 'flat', r);
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(P.hot, 0.7); x.lineWidth = 2.5;
    x.shadowColor = P.hot; x.shadowBlur = 14;
    x.beginPath(); x.moveTo(cx, topY); x.lineTo(cx, horizonY); x.stroke();
    x.shadowBlur = 0; x.restore();
    radialGlow(x, cx, topY, baseW * 2.4, P.hot, 0.4);
    x.fillStyle = rgba('#ff3a3a', 0.9);
    x.beginPath(); x.arc(cx, topY, 3, 0, Math.PI * 2); x.fill();
  } else if (kind === 'Twin Towers') {
    const cx = W * (0.34 + r() * 0.3);
    const gap = W * (0.07 + r() * 0.02);
    const tw = W * (0.06 + r() * 0.025);
    const th = horizonY * (0.92 + r() * 0.06);
    for (const dx of [-gap, gap]) {
      const bx = cx + dx - tw / 2;
      drawBuilding(x, P, bx, horizonY - th, tw, th, baseCol, P.win, 0.6, 1, 'antenna', r);
      // bright vertical neon edge strips on both sides of each tower
      x.save(); x.globalCompositeOperation = 'lighter';
      for (const ex of [bx, bx + tw]) {
        x.strokeStyle = rgba(P.cool, 0.55); x.lineWidth = 2.2;
        x.shadowColor = P.cool; x.shadowBlur = 10;
        x.beginPath(); x.moveTo(ex, horizonY - th); x.lineTo(ex, horizonY); x.stroke();
      }
      x.shadowBlur = 0; x.restore();
      drawSignBar(x, P, bx + tw * 0.5, horizonY - th, th, P.hot, r);
      // crown glow + antenna blink
      radialGlow(x, bx + tw / 2, horizonY - th, tw * 2, P.hot, 0.35);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba('#ff3a3a', 0.95);
      x.beginPath(); x.arc(bx + tw / 2, horizonY - th - tw * 0.3, 2.6, 0, Math.PI * 2); x.fill();
      x.restore();
    }
    // glowing connecting skybridge(s)
    x.save(); x.globalCompositeOperation = 'lighter';
    const bridges = rint(r, 1, 3);
    for (let bi = 0; bi < bridges; bi++) {
      const by = horizonY - th * (0.35 + r() * 0.45);
      x.strokeStyle = rgba(P.pop, 0.7); x.lineWidth = 3 + r() * 2;
      x.shadowColor = P.pop; x.shadowBlur = 12;
      x.beginPath(); x.moveTo(cx - gap, by); x.lineTo(cx + gap, by); x.stroke();
    }
    x.shadowBlur = 0; x.restore();
  } else if (kind === 'Arcology Dome') {
    const cx = W * (0.3 + r() * 0.4);
    const rad = W * (0.12 + r() * 0.08);
    const cy = horizonY;
    // dome body
    const g = x.createRadialGradient(cx, cy - rad * 0.3, rad * 0.1, cx, cy, rad * 1.2);
    g.addColorStop(0, mix(baseCol, P.cool, 0.25));
    g.addColorStop(1, baseCol);
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, rad, Math.PI, 0); x.fill();
    // geodesic glow ribs
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(P.cool, 0.4); x.lineWidth = 1.4;
    for (let i = 1; i < 7; i++) {
      const a = Math.PI + (i / 7) * Math.PI;
      x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * rad, cy + Math.sin(a) * rad); x.stroke();
    }
    for (let ring = 1; ring < 3; ring++) {
      x.beginPath(); x.arc(cx, cy, rad * ring / 3, Math.PI, 0); x.stroke();
    }
    x.restore();
    radialGlow(x, cx, cy - rad * 0.4, rad * 1.6, P.cool, 0.22);
  } else if (kind === 'Space Elevator') {
    const cx = W * (0.25 + r() * 0.5);
    // tether to top of frame
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createLinearGradient(cx, 0, cx, horizonY);
    g.addColorStop(0, rgba(P.cool, 0.0));
    g.addColorStop(0.5, rgba(P.cool, 0.35));
    g.addColorStop(1, rgba(P.cool, 0.7));
    x.strokeStyle = g; x.lineWidth = 3;
    x.beginPath(); x.moveTo(cx + W * 0.02, 0); x.lineTo(cx, horizonY); x.stroke();
    // climber pods
    for (let i = 0; i < 4; i++) {
      const t = r(); const py = t * horizonY; const px = cx + W * 0.02 * (1 - t);
      x.fillStyle = rgba(mix(P.cool, '#fff', 0.5), 0.9);
      x.fillRect(px - 3, py - 2, 6, 4);
      radialGlow(x, px, py, 12, P.cool, 0.4);
    }
    x.shadowBlur = 0; x.restore();
    // anchor base tower
    drawBuilding(x, P, cx - W * 0.025, horizonY - horizonY * 0.4, W * 0.05, horizonY * 0.4, baseCol, P.win, 0.5, 1, 'flat', r);
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * MASTER DRAW
 * ══════════════════════════════════════════════════════════════════════════ */

function draw(cv, p, r) {
  const Sky = p.sky, P = p.pal;
  const W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);

  // sky colours that facades catch (warm top rim-light + glass tint)
  _SKYTINT = mix(Sky.hor, Sky.glow, 0.4);
  _SKYGLOW = Sky.glow;

  // density multipliers
  const dens = p.density === 'Sparse Outpost' ? 0.55 : p.density === 'Hyperdense' ? 1.5 : 1;
  const winLitBase = p.density === 'Sparse Outpost' ? 0.3 : p.density === 'Hyperdense' ? 0.6 : 0.45;

  // camera sets horizon + whether there's a reflection
  const waterfront = p.camera === 'Waterfront';
  const aerial = p.camera === 'Aerial Overlook';
  const canyon = p.camera === 'Street Canyon';

  let horizonY;
  if (waterfront) horizonY = H * (0.5 + r() * 0.08);
  else if (aerial) horizonY = H * (0.34 + r() * 0.08);
  else if (canyon) horizonY = H * (0.3 + r() * 0.06);
  else horizonY = H * (0.55 + r() * 0.1); // panorama

  // 1. SKY
  paintSky(x, Sky, W, H, horizonY, r);

  // atmospheric horizon haze band — towers fade into this bright sky-glow haze
  x.save();
  x.globalCompositeOperation = 'screen';
  const hz = x.createLinearGradient(0, horizonY - H * 0.18, 0, horizonY + H * 0.02);
  hz.addColorStop(0, rgba(Sky.glow, 0));
  hz.addColorStop(1, rgba(mix(Sky.glow, Sky.hor, 0.4), 0.7));
  x.fillStyle = hz;
  x.fillRect(0, horizonY - H * 0.22, W, H * 0.24);
  x.restore();

  // 2-4. SKYLINE LAYERS back-to-front, atmospheric perspective IN COLOUR.
  // Distant towers wash toward the sky hue (hazy/light/desaturated-but-still-
  // coloured); near towers are richer and darker but ALWAYS chromatic — never
  // black. silFar = the sky-washed far colour, silNear = the rich near silhouette.
  const farCol  = mix(Sky.silFar, Sky.glow, 0.35);
  const layerDefs = [
    { dt: 0.0,  baseY: horizonY - H * 0.0,  maxH: H * 0.16, col: mix(farCol, '#ffffff', 0.22),        lit: winLitBase * 0.22, neon: 0.1 },
    { dt: 0.33, baseY: horizonY + H * 0.01, maxH: H * 0.26, col: mix(farCol, Sky.silNear, 0.4),       lit: winLitBase * 0.5,  neon: 0.28 },
    { dt: 0.66, baseY: horizonY + H * 0.03, maxH: H * 0.42, col: mix(Sky.silNear, farCol, 0.32),      lit: winLitBase * 0.85, neon: 0.55 },
    { dt: 1.0,  baseY: horizonY + H * 0.06, maxH: H * 0.58, col: Sky.silNear,                          lit: winLitBase, neon: 0.85 },
  ];

  const layerCounts = [];
  for (const L of layerDefs) {
    paintSkylineLayer(x, P, Sky, W, H, L.baseY, L.dt, 0, L.maxH * (0.8 + dens * 0.3), L.col, L.lit, L.neon, r);
  }

  // 5. HERO LANDMARK (sits in mid-near depth, before nearest foreground)
  drawLandmark(x, P, Sky, p.landmark, W, H, horizonY, r);

  // 6. TRANSIT + TRAFFIC + SEARCHLIGHTS
  drawTransit(x, P, W, H, horizonY, r);
  drawTraffic(x, P, W, H, horizonY, Math.floor((55 + r() * 70) * dens), r);
  if (r() < 0.78) drawSearchlights(x, P, W, horizonY, rint(r, 3, 6), r);

  // ground / foreground below horizon
  if (waterfront) {
    // WATERFRONT: a mirrored, ripple-broken reflection of the city in dark water.
    const waterTop = horizonY;
    const waterH = H - waterTop;
    // luminous sky-reflecting water: catches the sky gradient, darkening slightly
    // toward the viewer but staying chromatic — never black.
    const wg = x.createLinearGradient(0, waterTop, 0, H);
    wg.addColorStop(0, mix(Sky.hor, Sky.glow, 0.35));
    wg.addColorStop(0.45, mix(Sky.mid, '#0a2a4a', 0.45));
    wg.addColorStop(1, mix(Sky.top, '#06203a', 0.5));
    x.fillStyle = wg;
    x.fillRect(0, waterTop, W, waterH);
    // long sun-reflection: a vertical luminous column from the horizon down,
    // the signature water-sunset glitter path.
    x.save();
    x.globalCompositeOperation = 'lighter';
    const sunRX = W * (0.25 + r() * 0.5);
    const srg = x.createLinearGradient(sunRX, waterTop, sunRX, H);
    srg.addColorStop(0, rgba(Sky.glow, 0.55));
    srg.addColorStop(0.5, rgba(mix(Sky.hor, Sky.glow, 0.5), 0.22));
    srg.addColorStop(1, rgba(Sky.hor, 0));
    x.fillStyle = srg;
    const colW = W * (0.1 + r() * 0.08);
    x.fillRect(sunRX - colW / 2, waterTop, colW, waterH);
    x.restore();
    // 1. flipped skyline silhouette reflection (impressionistic, brighter)
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.translate(0, waterTop * 2);
    x.scale(1, -1);
    x.globalAlpha = 0.4;
    paintSkylineLayer(x, P, Sky, W, H, horizonY + H * 0.05, 1.0, 0, H * 0.5, Sky.silNear, winLitBase, 0.85, r);
    x.restore();
    // 2. vertical neon column smears — the signature water look: each bright
    //    source drops a wavering coloured streak straight down into the water.
    x.save();
    x.globalCompositeOperation = 'lighter';
    const smears = Math.floor((18 + r() * 22) * (0.6 + dens * 0.4));
    for (let i = 0; i < smears; i++) {
      const sxp = r() * W;
      const roll = r();
      const col = roll < 0.4 ? P.hot : roll < 0.7 ? P.cool : roll < 0.85 ? P.pop : P.win;
      const len = waterH * (0.2 + r() * 0.6);
      const w0 = 2 + r() * 6;
      const g = x.createLinearGradient(sxp, waterTop, sxp, waterTop + len);
      g.addColorStop(0, rgba(col, 0.55));
      g.addColorStop(0.5, rgba(col, 0.18));
      g.addColorStop(1, rgba(col, 0));
      x.fillStyle = g;
      // wavering: draw as a few offset vertical slivers
      let yy = waterTop;
      let xx = sxp;
      while (yy < waterTop + len) {
        const seg = 6 + r() * 10;
        xx += (r() - 0.5) * w0 * 1.2;
        x.fillRect(xx - w0 / 2, yy, w0, seg);
        yy += seg;
      }
    }
    x.restore();
    // 3. ripple breakup: faint horizontal bands, denser/closer near the viewer
    x.save();
    x.globalCompositeOperation = 'source-over';
    let ry = waterTop + 3; let step = 3;
    while (ry < H) {
      const d = (ry - waterTop) / waterH;
      // ripple shadow bands: tinted toward the deep sky colour, not black.
      x.fillStyle = rgba(mix(Sky.top, '#06203a', 0.5), 0.14 + d * 0.26);
      x.fillRect(0, ry, W, step * 0.55);
      ry += step; step += 0.5 + r() * 0.6;
    }
    x.restore();
    // 4. horizon waterline glow + sparse shimmer glints
    radialGlow(x, W * (0.3 + r() * 0.4), waterTop, W * 0.5, Sky.glow, 0.18);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 50; i++) {
      const gx = r() * W, gy = waterTop + r() * waterH;
      const col = pick([P.hot, P.cool, P.pop, Sky.glow], r);
      x.fillStyle = rgba(col, 0.1 + r() * 0.3);
      x.fillRect(gx, gy, 2 + r() * 10, 1);
    }
    x.restore();
  } else if (aerial) {
    // city sprawl floor receding to horizon: a perspective street grid of glowing
    // avenues, with city-block lights packed between them.
    const fg = x.createLinearGradient(0, horizonY, 0, H);
    // sun-lit sprawl floor: bright sky-glow haze at the far horizon, deepening to
    // a rich chromatic near-ground (sky-tinted), never black.
    fg.addColorStop(0, mix(Sky.hor, Sky.glow, 0.45));
    fg.addColorStop(0.35, mix(Sky.silFar, Sky.hor, 0.45));
    fg.addColorStop(1, mix(Sky.silNear, Sky.mid, 0.3));
    x.fillStyle = fg; x.fillRect(0, horizonY, W, H - horizonY);
    const vpx = W * (0.3 + r() * 0.4);            // vanishing point x
    const groundH = H - horizonY;
    x.save(); x.globalCompositeOperation = 'lighter';
    // block lights packed across the sprawl (atmospheric: dim far, bright near)
    const blockRows = 30;
    for (let ri = 0; ri < blockRows; ri++) {
      const t = ri / blockRows;
      const y = horizonY + Math.pow(t, 2.0) * groundH;
      const rowDepth = 0.15 + t * 0.85;
      const n = Math.floor((30 + t * 90) * dens);
      for (let c = 0; c < n; c++) {
        const gx = r() * W;
        const roll = r();
        const col = roll < 0.72 ? P.win : roll < 0.85 ? P.hot : roll < 0.93 ? P.cool : P.pop;
        const sz = 0.6 + t * 2.6;
        x.fillStyle = rgba(col, (0.18 + r() * 0.4) * rowDepth);
        x.fillRect(gx, y, sz, sz);
      }
    }
    // converging avenues — warm/cool light rivers running to the vanishing point
    const aves = rint(r, 5, 8);
    for (let a = 0; a < aves; a++) {
      const fx0 = W * ((a + 0.5) / aves + (r() - 0.5) * 0.06);
      const warm = r() < 0.5;
      const col = warm ? P.pop : P.cool;
      const g = x.createLinearGradient(vpx, horizonY, fx0, H);
      g.addColorStop(0, rgba(col, 0.0));
      g.addColorStop(0.6, rgba(col, 0.18));
      g.addColorStop(1, rgba(mix(col, '#fff', 0.3), 0.5));
      x.strokeStyle = g;
      x.lineWidth = 1 + 4 * 1; // widens via the path itself below
      // draw as a thin tapering quad
      x.beginPath();
      const nearW = groundH * 0.012 + 2;
      x.moveTo(vpx, horizonY);
      x.lineTo(fx0 - nearW, H);
      x.lineTo(fx0 + nearW, H);
      x.closePath();
      x.fillStyle = g; x.fill();
    }
    // a couple of cross-streets (horizontal light lines, spaced by perspective)
    let cy2 = horizonY + groundH * 0.12; let gapc = groundH * 0.05;
    while (cy2 < H) {
      x.strokeStyle = rgba(mix(P.cool, '#fff', 0.2), 0.12 + (cy2 - horizonY) / groundH * 0.2);
      x.lineWidth = 1 + (cy2 - horizonY) / groundH * 2;
      x.beginPath(); x.moveTo(0, cy2); x.lineTo(W, cy2); x.stroke();
      cy2 += gapc; gapc *= 1.35;
    }
    x.restore();
  } else if (canyon) {
    // STREET CANYON: two towering near walls on the left & right (slight inward
    // lean), a bright neon-lit wet street at the bottom, and a vertical slot of
    // sky + distant skyline up the centre. The walls DOMINATE the frame and are
    // densely lit with windows + big vertical neon signage. Note: the centre slot
    // shows the skyline layers painted earlier, so we only paint the two walls,
    // the street, and a darkening over the lower distant skyline.
    const wallFrac = 0.27 + r() * 0.05;           // each wall's width fraction
    const leanTop = W * (0.05 + r() * 0.03);        // inward lean of the top edge
    // chromatic glass canyon walls: rich sky-tinted silhouette, never black.
    const wallCol = mix(Sky.silNear, Sky.hor, 0.3);
    for (const side of [0, 1]) {
      const dir = side === 0 ? -1 : 1;
      const outerX = side === 0 ? 0 : W;
      const innerBot = side === 0 ? W * wallFrac : W * (1 - wallFrac);
      const innerTop = innerBot + dir * leanTop;    // leans toward centre at top
      // wall face quad
      x.fillStyle = wallCol;
      x.beginPath();
      x.moveTo(outerX, 0); x.lineTo(innerTop, 0); x.lineTo(innerBot, H); x.lineTo(outerX, H);
      x.closePath(); x.fill();
      x.save();
      x.beginPath();
      x.moveTo(outerX, 0); x.lineTo(innerTop, 0); x.lineTo(innerBot, H); x.lineTo(outerX, H); x.closePath();
      x.clip();
      // glass facade shading: deep sky-tinted shadow at the outer edge, lifting
      // to a sky-glow reflection toward the bright street-facing inner edge.
      const fg2 = x.createLinearGradient(outerX, 0, innerBot, 0);
      fg2.addColorStop(0, rgba(mix(Sky.silNear, '#000000', 0.15), 0.35));
      fg2.addColorStop(0.7, rgba(mix(Sky.silNear, '#000000', 0.15), 0.0));
      x.fillStyle = fg2; x.fillRect(Math.min(outerX, innerBot), 0, Math.abs(innerBot - outerX) + 4, H);
      // sky reflection up the inner glass face
      x.save(); x.globalCompositeOperation = 'screen';
      const skg = x.createLinearGradient(0, 0, 0, H);
      skg.addColorStop(0, rgba(mix(Sky.top, Sky.glow, 0.4), 0.4));
      skg.addColorStop(0.5, rgba(mix(Sky.mid, Sky.glow, 0.35), 0.24));
      skg.addColorStop(1, rgba(Sky.hor, 0.14));
      x.fillStyle = skg; x.fillRect(Math.min(outerX, innerBot), 0, Math.abs(innerBot - outerX) + 4, H);
      x.restore();
      // dense window grid across the whole wall (regular floors + columns)
      x.globalCompositeOperation = 'lighter';
      const floors = 30;
      const rowH = H / floors;
      for (let f = 0; f < floors; f++) {
        const yy = f * rowH + rowH * 0.2;
        const innerX = innerTop + (innerBot - innerTop) * (yy / H);
        const span = Math.abs(innerX - outerX);
        const winN = Math.max(3, Math.floor(span / 16));
        // some floors are darker (offices off) to break the rigid grid
        const floorLit = (Math.min(0.6, winLitBase)) * (r() < 0.2 ? 0.25 : 1);
        for (let wi = 0; wi < winN; wi++) {
          if (r() > floorLit) continue;
          const wx = outerX + (innerX - outerX) * (wi + 0.5) / winN + (r() - 0.5) * 4;
          const roll = r();
          const col = roll < 0.74 ? P.win : roll < 0.88 ? P.hot : P.cool;
          x.fillStyle = rgba(col, 0.45 + r() * 0.5);
          x.fillRect(wx - 2.5, yy + (r() - 0.5) * 2, 5, rowH * 0.5);
        }
      }
      x.restore();
      // bright rim light on the inner edge (street-facing corner)
      x.save(); x.globalCompositeOperation = 'lighter';
      x.strokeStyle = rgba(mix(P.cool, '#fff', 0.35), 0.5); x.lineWidth = 2.5;
      x.shadowColor = P.cool; x.shadowBlur = 8;
      x.beginPath(); x.moveTo(innerTop, 0); x.lineTo(innerBot, H); x.stroke();
      x.shadowBlur = 0; x.restore();
      // big vertical neon signage running up the inner face
      const sn = rint(r, 3, 5);
      for (let s = 0; s < sn; s++) {
        const t = (s + 0.5) / sn;
        const yy = t * H * 0.86;
        const innerX = innerTop + (innerBot - innerTop) * (yy / H);
        const sx2 = innerX - dir * (W * 0.03 + r() * W * 0.02);
        drawSignBar(x, P, sx2, yy, H * 0.22, pick([P.hot, P.cool, P.pop], r), r);
        if (r() < 0.6) drawNeonStrip(x, P, sx2 - W * 0.03, yy + H * 0.04, W * 0.05, pick([P.hot, P.cool], r), r);
      }
    }
    // WET STREET at the bottom: a reflective sky-lit wet floor catching the sky
    // glow + warm sun, staying chromatic rather than going to black.
    const streetTop = H * (0.82 + r() * 0.06);
    x.fillStyle = mix(Sky.silNear, Sky.hor, 0.35);
    x.fillRect(0, streetTop, W, H - streetTop);
    const wg = x.createLinearGradient(0, streetTop, 0, H);
    wg.addColorStop(0, rgba(mix(Sky.glow, Sky.hor, 0.4), 0.5));
    wg.addColorStop(0.5, rgba(mix(Sky.hor, P.hot, 0.3), 0.4));
    wg.addColorStop(1, rgba(mix(Sky.mid, P.cool, 0.25), 0.55));
    x.fillStyle = wg; x.fillRect(0, streetTop, W, H - streetTop);
    radialGlow(x, W / 2, H, W * 0.6, P.cool, 0.2);
    radialGlow(x, W / 2, streetTop, W * 0.4, P.hot, 0.16);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 50; i++) {
      const gx = r() * W, gy = streetTop + r() * (H - streetTop);
      x.fillStyle = rgba(pick([P.hot, P.cool, P.pop, P.win], r), 0.12 + r() * 0.35);
      x.fillRect(gx, gy, 2 + r() * 14, 1.4);
    }
    x.restore();
  } else {
    // PANORAMA: a big near rooftop edge silhouette anchors the bottom third with
    // parapet rim-light, vents, antennae, water tanks and rooftop neon — a real
    // foreground, not a thin strip.
    const edgeY = H * (0.7 + r() * 0.08);
    // build the jagged rooftop profile
    const prof = [[0, edgeY + (r() - 0.5) * H * 0.04]];
    let cx2 = 0;
    while (cx2 < W) {
      const seg = W * (0.05 + r() * 0.1);
      const hh = edgeY + (r() - 0.5) * H * 0.07;
      prof.push([cx2, hh]); prof.push([cx2 + seg, hh]);
      cx2 += seg;
    }
    prof.push([W, edgeY]);
    // rich chromatic foreground silhouette (sky-tinted), never black, with a
    // sky-glow rim catching the top edge.
    const roofCol = mix(Sky.silNear, '#000000', 0.22);
    const rfg = x.createLinearGradient(0, edgeY - H * 0.05, 0, H);
    rfg.addColorStop(0, mix(roofCol, _SKYTINT, 0.18));
    rfg.addColorStop(1, mix(roofCol, '#000000', 0.15));
    x.fillStyle = rfg;
    x.beginPath();
    x.moveTo(0, H);
    for (const [px, py] of prof) x.lineTo(px, py);
    x.lineTo(W, H); x.closePath(); x.fill();
    // parapet rim light along the top edge
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(mix(P.cool, '#fff', 0.3), 0.5); x.lineWidth = 1.6;
    x.beginPath();
    for (let i = 0; i < prof.length; i++) { const [px, py] = prof[i]; if (i === 0) x.moveTo(px, py); else x.lineTo(px, py); }
    x.stroke();
    x.restore();
    // rooftop clutter: antennae (with blinks), vents, water tanks, neon box
    x.save();
    const clutter = rint(r, 14, 22);
    for (let i = 0; i < clutter; i++) {
      const ax = r() * W;
      // find roof y near ax
      let ry = edgeY;
      for (let j = 1; j < prof.length; j++) { if (prof[j][0] >= ax) { ry = prof[j - 1][1]; break; } }
      const roll = r();
      if (roll < 0.4) {
        // antenna mast
        const ah = H * (0.04 + r() * 0.1);
        x.strokeStyle = mix(Sky.silNear, '#000000', 0.35); x.lineWidth = 1.6 + r() * 1.5;
        x.beginPath(); x.moveTo(ax, ry); x.lineTo(ax, ry - ah); x.stroke();
        if (r() < 0.6) {
          x.save(); x.globalCompositeOperation = 'lighter';
          x.fillStyle = rgba('#ff3a3a', 0.95);
          x.beginPath(); x.arc(ax, ry - ah, 2.2, 0, Math.PI * 2); x.fill();
          radialGlow(x, ax, ry - ah, 16, '#ff3a3a', 0.4);
          x.restore();
        }
      } else if (roll < 0.7) {
        // boxy vent / housing unit
        const bw = W * (0.02 + r() * 0.03), bh = H * (0.02 + r() * 0.03);
        x.fillStyle = mix(Sky.silNear, '#000000', 0.3);
        x.fillRect(ax - bw / 2, ry - bh, bw, bh);
        if (r() < 0.5) { x.save(); x.globalCompositeOperation = 'lighter'; drawNeonStrip(x, P, ax - bw / 2, ry - bh * 0.5, bw, pick([P.hot, P.cool], r), r); x.restore(); }
      } else {
        // water tank (cylinder silhouette)
        const tw = W * 0.018 + r() * W * 0.012, th = H * (0.03 + r() * 0.03);
        x.fillStyle = mix(Sky.silNear, '#000000', 0.32);
        x.fillRect(ax - tw / 2, ry - th, tw, th);
        x.beginPath(); x.ellipse(ax, ry - th, tw / 2, tw * 0.18, 0, 0, Math.PI * 2); x.fill();
      }
    }
    x.restore();
    // a big rooftop neon billboard somewhere on the edge
    if (r() < 0.8) {
      const bx = W * (0.15 + r() * 0.5);
      let ry = edgeY;
      for (let j = 1; j < prof.length; j++) { if (prof[j][0] >= bx) { ry = prof[j - 1][1]; break; } }
      const bw = W * (0.1 + r() * 0.12), bh = H * 0.05;
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba(pick([P.hot, P.cool, P.pop], r), 0.22);
      x.fillRect(bx, ry - bh - H * 0.04, bw, bh);
      drawNeonStrip(x, P, bx, ry - bh - H * 0.04, bw, pick([P.hot, P.cool, P.pop], r), r);
      drawNeonStrip(x, P, bx, ry - bh * 0.4 - H * 0.04, bw * 0.7, pick([P.hot, P.cool, P.pop], r), r);
      x.restore();
    }
  }

  // 7. ATMOSPHERE — volumetric haze drifting between layers + overall bloom
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < 5; i++) {
    const fx = W * r(), fy = horizonY * (0.4 + r() * 0.6), fr = S * (0.2 + r() * 0.35);
    radialGlow(x, fx, fy, fr, mix(Sky.glow, P.cool, r() * 0.5), 0.06 + r() * 0.05);
  }
  x.restore();

  // global colour bloom over brightest band near horizon
  x.save();
  x.globalCompositeOperation = 'screen';
  const bloom = x.createLinearGradient(0, horizonY - H * 0.1, 0, horizonY + H * 0.05);
  bloom.addColorStop(0, rgba(P.hot, 0));
  bloom.addColorStop(0.6, rgba(mix(P.hot, P.cool, 0.5), 0.1));
  bloom.addColorStop(1, rgba(P.cool, 0));
  x.fillStyle = bloom;
  x.fillRect(0, horizonY - H * 0.1, W, H * 0.15);
  x.restore();

  // finishing — light grain + a soft vignette (kept low so the field stays
  // luminous and never blackens at the corners).
  grain(x, W, H, 520, r);
  vignette(x, W, H, 0.24);
}

/* ── Exports ─────────────────────────────────────────────────────────────── */
  return { draw, SKIES, PALS };
})();

/* ── Unified Time layer ──────────────────────────────────────────────────── */
const TIMES = ['Dawn', 'Day', 'Dusk', 'Night'];
const _DAWN = new Set(['Tangerine Dawn', 'Golden Smog', 'Flamingo Haze']);
const _DAY  = new Set(['Turquoise Noon', 'Cyan Lagoon']);
const _DUSK = new Set(['Coral Sunset', 'Magenta Dusk', 'Ultraviolet Eve']);
const DAY_BY_TIME = {
  Dawn: DAY.SKIES.filter((s) => _DAWN.has(s.name)),
  Day:  DAY.SKIES.filter((s) => _DAY.has(s.name)),
  Dusk: DAY.SKIES.filter((s) => _DUSK.has(s.name)),
};
const ALL_SKY_NAMES = [...NIGHT.SKIES, ...DAY.SKIES].map((s) => s.name);
const ALL_PAL_NAMES = [...new Set([...NIGHT.PALS, ...DAY.PALS].map((p) => p.name))];

function paramsOf(r) {
  const time = TIMES[Math.floor(r() * TIMES.length)];
  const night = time === 'Night';
  const skyPool = night ? NIGHT.SKIES : DAY_BY_TIME[time];
  const palPool = night ? NIGHT.PALS : DAY.PALS;
  const sky = skyPool[Math.floor(r() * skyPool.length)];
  const pal = palPool[Math.floor(r() * palPool.length)];
  const camera   = NIGHT.CAMERAS[Math.floor(r() * NIGHT.CAMERAS.length)];
  const density  = NIGHT.DENSITY[Math.floor(r() * NIGHT.DENSITY.length)];
  const landmark = NIGHT.LANDMARKS[Math.floor(r() * NIGHT.LANDMARKS.length)];
  const fmt      = NIGHT.FMTS[Math.floor(r() * NIGHT.FMTS.length)];
  return { time, night, sky, pal, camera, density, landmark, fmt };
}

function labels(p) {
  return {
    Time:     p.time,
    Sky:      p.sky.name,
    Palette:  p.pal.name,
    Camera:   p.camera,
    Density:  p.density,
    Landmark: p.landmark,
    Format:   p.fmt.t,
  };
}

function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  (p.night ? NIGHT.draw : DAY.draw)(cv, p, r);
}

export const metropolisTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const metropolisSchema: TraitSchema = {
  traits: [
    { name: 'Time',     values: ['Dawn', 'Day', 'Dusk', 'Night'] },
    { name: 'Sky',      values: ALL_SKY_NAMES },
    { name: 'Palette',  values: ALL_PAL_NAMES },
    { name: 'Camera',   values: NIGHT.CAMERAS },
    { name: 'Density',  values: NIGHT.DENSITY },
    { name: 'Landmark', values: NIGHT.LANDMARKS },
    { name: 'Format',   values: ['Square', 'Tall', 'Wide'] },
  ],
};

export const renderMetropolis: EngineFn = blit(draw, metropolisTraits);

export const METROPOLIS_ASPECTS = NIGHT.FMTS.map((f) => f.W / f.H);
