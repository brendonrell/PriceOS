// @ts-nocheck
/*
 * Contour Interval — countyline-ai, cartographic lane.
 *
 * A real topographic survey map. A deterministic height field is traced with
 * marching-squares into clean iso-elevation lines — thin intermediates with a
 * BOLD index contour every 5th carrying elevation numbers — over a muted
 * hypsometric tint with gentle hillshade. The map technique is the keeper.
 *
 * v3 (2026-06-19): COMPOSITION REBUILD. The jury verdict was "zero grasp of
 * composition — one big thing in the middle, every seed the same". Fixed by
 * making LAYOUT a primary trait with 6 STRUCTURALLY different arrangements,
 * none of which centre one massif. The height field is now built into a chosen
 * REGION of the frame (one side, two massifs, a strip, a corner) rather than a
 * centred blob, and map furniture (neatline, scale bar, north arrow, title
 * block, locator inset, section strip) appears per-layout, not on every seed.
 * Palettes widened to 10 with deliberately separated dominant hues.
 *
 * Layouts:
 *   Survey Plate — formal framed sheet: neatline, margin, title block, scale
 *                  bar, north arrow. Land on a phi anchor inside the sheet.
 *   Full Bleed   — terrain edge to edge, NO frame, allover dense contours.
 *   Coastal Crop — landmass on ONE side, the rest open flat lowland/sea; big
 *                  negative space, asymmetric.
 *   Twin Massif  — two distinct landforms split by a valley/fault across frame.
 *   Plan + Section — plan map upper ~2/3, a cross-section elevation strip across
 *                  the bottom (the cut through the terrain).
 *   Detail Inset — zoomed corner of terrain + a small framed locator inset.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ── Palettes — 10, BOLD CARTOGRAPHIC COLOUR ──────────────────────────────
 * paper (sheet/ground), ink (line colour), 5-stop hypsometric ramp lowland→
 * highland. Each palette is its OWN colour world — high chroma so the elevation
 * bands stay vivid through the paper-wash + hillshade, with a deliberate mix of
 * LIGHT grounds (parchment / blueprint-cyan / snow / mint / sand) and DARK
 * grounds (abyssal navy / ink-blue / black / midnight-violet) so a 9-up sheet
 * reads as many colour identities, never one murky scheme.
 *   light: USGS · Sepia · Blueprint Cyan · Alpine Snow · Desert Relief
 *   dark : Bathymetric · Blue Print(dark) · Volcanic · Aurora · Neon Relief */
const PALS = [
  // LIGHT GROUNDS
  { name: 'USGS Land',     paper: '#f3ecd2', ink: '#3a2a12', ramp: ['#1f8a4c', '#7fc23a', '#e8d24a', '#e0962a', '#9c4a18'] },
  { name: 'Sepia Survey',  paper: '#f1e2bf', ink: '#3d2710', ramp: ['#b5651d', '#cf8a2c', '#e0aa45', '#c97a2a', '#7a3d12'] },
  { name: 'Blueprint Cyan',paper: '#1fc4e0', ink: '#ffffff', ramp: ['#0e8fb8', '#3fb6d8', '#6fd0e8', '#aee6f4', '#ffffff'] },
  { name: 'Alpine Snow',   paper: '#eef4f0', ink: '#163d2a', ramp: ['#108a55', '#46c07a', '#8fd9a6', '#cfeede', '#ffffff'] },
  { name: 'Desert Relief', paper: '#f6e7cf', ink: '#5a2410', ramp: ['#d98a1f', '#e8b13a', '#f0d56a', '#e0703a', '#a52a1c'] },
  // DARK GROUNDS
  { name: 'Bathymetric',   paper: '#03182e', ink: '#dff3ff', ramp: ['#06335f', '#0b6fb0', '#1aa6da', '#5fd6ee', '#c8f6ff'] },
  { name: 'Blue Print',    paper: '#06234d', ink: '#eaf4ff', ramp: ['#0a4ca0', '#1f74d6', '#4f9cef', '#9cc8ff', '#ffffff'] },
  { name: 'Volcanic',      paper: '#160a0a', ink: '#ffe9d6', ramp: ['#5a1a12', '#a32915', '#e0561a', '#f59e2a', '#ffe04a'] },
  { name: 'Aurora',        paper: '#0a1426', ink: '#e6fff4', ramp: ['#123a6e', '#16a6b0', '#2fd6a0', '#9cf06a', '#e8ff7a'] },
  { name: 'Neon Relief',   paper: '#120a26', ink: '#f0e6ff', ramp: ['#3a1f8a', '#7b2fd6', '#c83fd0', '#f0509a', '#ffd24a'] },
];

const FMTS = [
  { W: 1180, H: 1180, t: 'Square' },
  { W: 1040, H: 1280, t: 'Portrait' },
  { W: 1280, H: 1040, t: 'Landscape' },
];

/* PRIMARY composition trait — 6 structurally different arrangements */
const LAYOUTS = ['Survey Plate', 'Full Bleed', 'Coastal Crop', 'Twin Massif', 'Plan + Section', 'Detail Inset'];
const RELIEFS = ['Basin', 'Rolling', 'Massif', 'Caldera'];  // landform character
const DENS    = ['Sparse', 'Standard', 'Dense'];            // contour interval

/* phi-based focal anchors — vary peak placement off-centre, never dead-centre */
const ANCHORS = [
  [INVPHI, INVPHI], [1 - INVPHI, INVPHI], [INVPHI, 1 - INVPHI], [1 - INVPHI, 1 - INVPHI],
  [0.5, INVPHI], [INVPHI, 0.5],
];

/* ── Trait draws — ONE fixed order, never reorder ─────────────────────────── */
function paramsOf(r) {
  const palI   = Math.floor(r() * PALS.length);
  const fmt    = pick(FMTS, r);
  const layI   = Math.floor(r() * LAYOUTS.length);   // PRIMARY composition
  const relI   = Math.floor(r() * RELIEFS.length);
  const denI   = Math.floor(r() * DENS.length);

  // ── field params (consumed after trait draws, fixed order) ──
  const anchI  = Math.floor(r() * ANCHORS.length);
  const scale  = 0.5 + r() * 0.8;            // focal landform scale 0.5–1.3x
  const folds  = relI === 3 ? 0 : rint(r, 1, 2 + relI);  // subordinate folds
  const warp   = 0.7 + r() * 1.2;            // domain warp strength
  const ridges = relI >= 1 && relI <= 2 ? rint(r, 1, 2) : 0;
  const basinV = relI === 0;                 // invert -> depression basin
  const side   = r() < 0.5 ? 0 : 1;          // coastal: land left/right (or top/bottom on portrait)
  const corner = Math.floor(r() * 4);        // detail-inset locator corner
  const flip   = r() < 0.5;                  // twin-massif diagonal of the fault
  return { palI, fmt, layI, relI, denI, anchI, scale, folds, warp, ridges, basinV, side, corner, flip };
}

function labels(p) {
  return {
    Layout:   LAYOUTS[p.layI],
    Palette:  PALS[p.palI].name,
    Format:   p.fmt.t,
    Relief:   RELIEFS[p.relI],
    Interval: DENS[p.denI],
  };
}

/* ── Height field ──────────────────────────────────────────────────────────
 * Builds a normalised [0,1] height field across the WHOLE map grid, but places
 * its landforms into a layout-defined REGION via `placer`. `placer` returns the
 * list of dominant bumps (centres in [0,1] grid space). This is what kills the
 * "one centred blob" problem — Coastal pushes land to a side, Twin makes two,
 * Section confines land to a band, Inset zooms one corner. */
function buildField(p, r, W, H, placer) {
  const cols = 230, rows = Math.round(230 * H / W);
  const field = new Float32Array(cols * rows);

  const bumps = placer(p, r);  // layout decides dominant landform placement

  // subordinate folds — smaller, scattered within the active land region
  const reg = bumps._region || { x0: 0.1, y0: 0.1, x1: 0.9, y1: 0.9 };
  for (let i = 0; i < p.folds; i++) {
    bumps.push({
      cx: reg.x0 + r() * (reg.x1 - reg.x0),
      cy: reg.y0 + r() * (reg.y1 - reg.y0),
      amp: 0.22 + r() * 0.32,
      sig: (0.07 + r() * 0.10) * p.scale,
      ell: 0.6 + r() * 1.0,
      rot: r() * Math.PI,
      caldera: false,
    });
  }

  // ridge spurs (rolling/massif) — confined to the land region
  const ridgeSegs = [];
  for (let i = 0; i < p.ridges; i++) {
    ridgeSegs.push({
      x0: reg.x0 + r() * (reg.x1 - reg.x0), y0: reg.y0 + r() * (reg.y1 - reg.y0),
      x1: reg.x0 + r() * (reg.x1 - reg.x0), y1: reg.y0 + r() * (reg.y1 - reg.y0),
      amp: 0.2 + r() * 0.32, w: 0.05 + r() * 0.05,
    });
  }

  // faint summed-sine texture (kept LOW so it doesn't smudge the lines)
  const sines = [];
  for (let i = 0; i < 4; i++) {
    sines.push({
      fx: (1 + i * PHI) * (1 + r() * 1.5),
      fy: (1 + i * PHI) * (1 + r() * 1.5),
      ph: r() * Math.PI * 2,
      a: (0.045 - i * 0.008) * (0.7 + r() * 0.5),
    });
  }

  const warpA = p.warp * 0.05;
  let mn = Infinity, mx = -Infinity;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      const u = gx / (cols - 1), v = gy / (rows - 1);
      const wu = u + warpA * Math.sin(5.0 * v + 1.3) + warpA * 0.5 * Math.sin(10.0 * v);
      const wv = v + warpA * Math.cos(5.0 * u + 0.7) + warpA * 0.5 * Math.cos(10.0 * u);
      let h = 0;

      for (const b of bumps) {
        let dx = wu - b.cx, dy = wv - b.cy;
        const cs = Math.cos(b.rot), sn = Math.sin(b.rot);
        const rx = (dx * cs - dy * sn) * b.ell;
        const ry = (dx * sn + dy * cs) / b.ell;
        const d2 = (rx * rx + ry * ry) / (b.sig * b.sig);
        let g = b.amp * Math.exp(-d2);
        if (b.caldera) g *= (1 - 0.9 * Math.exp(-d2 * 6)); // sunken crater rim
        h += g;
      }

      for (const rg of ridgeSegs) {
        const ax2 = wu - rg.x0, ay2 = wv - rg.y0;
        const bx = rg.x1 - rg.x0, by = rg.y1 - rg.y0;
        const t = clamp((ax2 * bx + ay2 * by) / (bx * bx + by * by + 1e-6), 0, 1);
        const px = rg.x0 + bx * t, py = rg.y0 + by * t;
        const dd = (wu - px) * (wu - px) + (wv - py) * (wv - py);
        h += rg.amp * Math.exp(-dd / (rg.w * rg.w));
      }

      let tex = 0;
      for (const s of sines) tex += s.a * Math.sin(s.fx * wu * 6.28 + s.ph) * Math.sin(s.fy * wv * 6.28 + s.ph);
      h += tex;

      field[gy * cols + gx] = h;
      if (h < mn) mn = h;
      if (h > mx) mx = h;
    }
  }

  const span = (mx - mn) || 1;
  for (let i = 0; i < field.length; i++) {
    let n = (field[i] - mn) / span;
    if (p.basinV) n = 1 - n;   // basin relief: dominant form becomes a depression
    field[i] = n;
  }
  return { field, cols, rows };
}

/* ── Layout placers ────────────────────────────────────────────────────────
 * Each returns the dominant-bump list (with a ._region for subordinate folds).
 * Centres are in [0,1] grid space. NONE of them centres a single massif. */
function makeBump(cx, cy, p, r, ampBoost) {
  return {
    cx: clamp(cx, 0.06, 0.94), cy: clamp(cy, 0.06, 0.94),
    amp: 1.0 + (p.relI === 2 ? 0.4 : 0) + (p.relI === 3 ? 0.3 : 0) + (ampBoost || 0),
    sig: (0.20 + r() * 0.12) * p.scale,
    ell: 0.6 + r() * 1.0,
    rot: r() * Math.PI,
    caldera: p.relI === 3,
  };
}

function placeStandard(p, r) {
  // phi anchor, off-centre by construction
  const [ax, ay] = ANCHORS[p.anchI];
  const b = makeBump(ax + (r() - 0.5) * 0.1, ay + (r() - 0.5) * 0.1, p, r);
  const arr = [b];
  arr._region = { x0: 0.12, y0: 0.12, x1: 0.88, y1: 0.88 };
  return arr;
}

function placeBleed(p, r) {
  // allover: a few comparable forms spread across the whole field, none dominant
  const arr = [];
  const pts = [[0.28, 0.32], [0.72, 0.4], [0.5, 0.74], [0.18, 0.78], [0.82, 0.74]];
  const n = 3 + Math.floor(r() * 2);
  for (let i = 0; i < n; i++) {
    const [bx, by] = pts[i % pts.length];
    const b = makeBump(bx + (r() - 0.5) * 0.16, by + (r() - 0.5) * 0.16, p, r, -0.25);
    b.sig = (0.16 + r() * 0.10) * p.scale;
    arr.push(b);
  }
  arr._region = { x0: 0.05, y0: 0.05, x1: 0.95, y1: 0.95 };
  return arr;
}

function placeCoastal(p, r) {
  // landmass crowded to ONE side; the rest stays flat lowland (negative space)
  const portrait = p.fmt.H > p.fmt.W;
  const arr = [];
  if (portrait) {
    const top = p.side === 0;                 // land top or bottom
    const cy = top ? 0.26 : 0.74;
    arr.push(makeBump(0.42, cy, p, r, 0.2));
    arr.push(makeBump(0.6, cy + (top ? 0.14 : -0.14), p, r, -0.1));
    arr._region = top ? { x0: 0.1, y0: 0.08, x1: 0.9, y1: 0.42 } : { x0: 0.1, y0: 0.58, x1: 0.9, y1: 0.92 };
  } else {
    const left = p.side === 0;                 // land left or right
    const cx = left ? 0.26 : 0.74;
    arr.push(makeBump(cx, 0.46, p, r, 0.2));
    arr.push(makeBump(cx + (left ? 0.14 : -0.14), 0.66, p, r, -0.1));
    arr._region = left ? { x0: 0.08, y0: 0.1, x1: 0.42, y1: 0.9 } : { x0: 0.58, y0: 0.1, x1: 0.92, y1: 0.9 };
  }
  return arr;
}

function placeTwin(p, r) {
  // two distinct massifs split by a valley/fault running across the frame
  const arr = [];
  if (p.flip) {  // fault runs roughly vertical → land left & right
    arr.push(makeBump(0.24, 0.4 + (r() - 0.5) * 0.2, p, r, 0.1));
    arr.push(makeBump(0.76, 0.6 + (r() - 0.5) * 0.2, p, r, 0.05));
  } else {       // fault runs roughly horizontal → land top & bottom
    arr.push(makeBump(0.4 + (r() - 0.5) * 0.2, 0.24, p, r, 0.1));
    arr.push(makeBump(0.6 + (r() - 0.5) * 0.2, 0.76, p, r, 0.05));
  }
  arr._region = { x0: 0.1, y0: 0.1, x1: 0.9, y1: 0.9 };
  return arr;
}

function placeSection(p, r) {
  // plan map confined to upper region (section strip drawn separately below)
  const [ax, ay] = ANCHORS[p.anchI];
  const cy = clamp(ay * 0.62, 0.12, 0.5);   // keep land in the top ~2/3
  const b = makeBump(ax + (r() - 0.5) * 0.1, cy, p, r);
  b.sig = (0.16 + r() * 0.10) * p.scale;
  const arr = [b];
  arr._region = { x0: 0.12, y0: 0.08, x1: 0.88, y1: 0.6 };
  return arr;
}

function placeInset(p, r) {
  // zoomed terrain: ONE large form bleeding off a corner edge, big scale
  const corners = [[0.0, 0.0], [1.0, 0.0], [0.0, 1.0], [1.0, 1.0]];
  const [cx, cy] = corners[p.corner];
  const b = makeBump(cx + (cx < 0.5 ? 0.32 : -0.32), cy + (cy < 0.5 ? 0.32 : -0.32), p, r, 0.3);
  b.sig = (0.34 + r() * 0.12) * p.scale;   // zoomed in → fewer, fatter contours
  const arr = [b];
  arr._region = { x0: 0.1, y0: 0.1, x1: 0.9, y1: 0.9 };
  return arr;
}

const PLACERS = [placeStandard, placeBleed, placeCoastal, placeTwin, placeSection, placeInset];

/* bilinear sample from normalised grid */
function sampleAt(field, cols, rows, fx, fy) {
  const gx = clamp(fx * (cols - 1), 0, cols - 1.001);
  const gy = clamp(fy * (rows - 1), 0, rows - 1.001);
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const tx = gx - x0, ty = gy - y0;
  const a = field[y0 * cols + x0], b = field[y0 * cols + x0 + 1];
  const c = field[(y0 + 1) * cols + x0], d = field[(y0 + 1) * cols + x0 + 1];
  return a * (1 - tx) * (1 - ty) + b * tx * (1 - ty) + c * (1 - tx) * ty + d * tx * ty;
}

/* hypsometric ramp colour for elevation t in [0,1] */
function rampColor(P, t) {
  const ramp = P.ramp;
  const u = clamp(t, 0, 1) * (ramp.length - 1);
  const i = Math.floor(u);
  if (i >= ramp.length - 1) return ramp[ramp.length - 1];
  return mix(ramp[i], ramp[i + 1], u - i);
}

/* ── Marching squares: emit line segments for one iso level ───────────────── */
function isoSegments(field, cols, rows, level, ox, oy, sx, sy) {
  const segs = [];
  const v = (cx, cy) => field[cy * cols + cx];
  const lerp = (a, b) => (level - a) / ((b - a) || 1e-6);
  for (let cy = 0; cy < rows - 1; cy++) {
    for (let cx = 0; cx < cols - 1; cx++) {
      const tl = v(cx, cy), tr = v(cx + 1, cy), br = v(cx + 1, cy + 1), bl = v(cx, cy + 1);
      let idx = 0;
      if (tl > level) idx |= 8;
      if (tr > level) idx |= 4;
      if (br > level) idx |= 2;
      if (bl > level) idx |= 1;
      if (idx === 0 || idx === 15) continue;
      const X = cx, Y = cy;
      const top    = () => [ox + (X + lerp(tl, tr)) * sx, oy + Y * sy];
      const right  = () => [ox + (X + 1) * sx, oy + (Y + lerp(tr, br)) * sy];
      const bottom = () => [ox + (X + lerp(bl, br)) * sx, oy + (Y + 1) * sy];
      const left   = () => [ox + X * sx, oy + (Y + lerp(tl, bl)) * sy];
      const push = (a, b) => segs.push([a[0], a[1], b[0], b[1]]);
      switch (idx) {
        case 1: case 14: push(left(), bottom()); break;
        case 2: case 13: push(bottom(), right()); break;
        case 3: case 12: push(left(), right()); break;
        case 4: case 11: push(top(), right()); break;
        case 6: case 9:  push(top(), bottom()); break;
        case 7: case 8:  push(left(), top()); break;
        case 5:  push(left(), top()); push(bottom(), right()); break;
        case 10: push(left(), bottom()); push(top(), right()); break;
      }
    }
  }
  return segs;
}

/* ── Terrain painter: tint + hillshade + contours for a given pixel rect ────
 * Used by every layout. The rect (mx0,my0,mw,mh) is where the map lives; the
 * field is normalised so it fills it. `frac` lets Plan+Section paint into a
 * sub-rect. */
function paintTerrain(x, P, field, cols, rows, mx0, my0, mw, mh, p, r, labelLines) {
  const sx = mw / (cols - 1), sy = mh / (rows - 1);
  const bandCount = p.denI === 0 ? 8 : p.denI === 1 ? 12 : 16;

  // 1. hypsometric tint — pushed back (muted toward paper)
  const fcols = 200, frows = Math.max(2, Math.round(200 * mh / mw));
  const fcw = mw / fcols, fch = mh / frows;
  for (let gy = 0; gy < frows; gy++) {
    for (let gx = 0; gx < fcols; gx++) {
      const t = sampleAt(field, cols, rows, gx / (fcols - 1), gy / (frows - 1));
      const band = Math.floor(t * bandCount) / bandCount;
      let col = rampColor(P, band + 0.5 / bandCount);
      col = mix(col, P.paper, 0.42);
      x.fillStyle = col;
      x.fillRect(mx0 + gx * fcw, my0 + gy * fch, fcw + 1, fch + 1);
    }
  }

  // hillshade (SE light), soft
  x.save();
  x.globalCompositeOperation = 'overlay';
  const hcols = 150, hrows = Math.max(2, Math.round(150 * mh / mw));
  const hcw = mw / hcols, hch = mh / hrows;
  const e = 0.012;
  for (let gy = 0; gy < hrows; gy++) {
    for (let gx = 0; gx < hcols; gx++) {
      const u = gx / (hcols - 1), v = gy / (hrows - 1);
      const dzdx = sampleAt(field, cols, rows, clamp(u + e, 0, 1), v) - sampleAt(field, cols, rows, clamp(u - e, 0, 1), v);
      const dzdy = sampleAt(field, cols, rows, u, clamp(v + e, 0, 1)) - sampleAt(field, cols, rows, u, clamp(v - e, 0, 1));
      const shade = clamp(0.5 + (dzdx + dzdy) * 5, 0, 1);
      const tone = shade > 0.5 ? '#fff' : '#000';
      x.fillStyle = rgba(tone, Math.abs(shade - 0.5) * 0.30);
      x.fillRect(mx0 + gx * hcw, my0 + gy * hch, hcw + 1, hch + 1);
    }
  }
  x.restore();

  mottle(x, mx0, my0, mw, mh, P.paper, 1600, r, 'overlay');

  // 2. contour lines — hierarchical hero layer
  const W = x.canvas.width, H = x.canvas.height;
  const levels = bandCount;
  const indexEvery = 5;
  const baseElev = rint(r, 0, 9) * 100;
  const interval = p.denI === 0 ? 40 : p.denI === 1 ? 20 : 10;
  const thin = Math.max(0.9, Math.min(W, H) * 0.0012);
  const bold = Math.max(2.2, Math.min(W, H) * 0.0032);
  x.lineJoin = 'round'; x.lineCap = 'round';

  for (let i = 1; i < levels; i++) {
    const lvl = i / levels;
    const isIndex = i % indexEvery === 0;
    const segs = isoSegments(field, cols, rows, lvl, mx0, my0, sx, sy);
    if (!segs.length) continue;
    x.strokeStyle = isIndex ? rgba(P.ink, 0.95) : rgba(P.ink, 0.55);
    x.lineWidth = isIndex ? bold : thin;
    x.beginPath();
    for (const s of segs) { x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); }
    x.stroke();

    if (isIndex && labelLines) {
      const elevM = baseElev + i * interval;
      const fontPx = Math.max(11, Math.min(W, H) * 0.013);
      x.font = `${fontPx}px Georgia, "Times New Roman", serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const stride = Math.max(40, Math.floor(segs.length / 3));
      for (let k = Math.floor(stride * 0.5); k < segs.length; k += stride) {
        const s = segs[k];
        const ang = Math.atan2(s[3] - s[1], s[2] - s[0]);
        x.save();
        x.translate(s[0], s[1]);
        x.rotate(Math.abs(ang) > Math.PI / 2 ? ang + Math.PI : ang);
        const tw = x.measureText(String(elevM)).width;
        x.fillStyle = rgba(P.paper, 0.85);
        x.fillRect(-tw / 2 - 2, -fontPx * 0.55, tw + 4, fontPx * 1.1);
        x.fillStyle = rgba(P.ink, 0.95);
        x.fillText(String(elevM), 0, 0);
        x.restore();
      }
    }
  }
  return { bandCount, baseElev, interval };
}

/* ── Furniture helpers ─────────────────────────────────────────────────── */
function neatline(x, P, mx0, my0, mw, mh, W, H, ticked) {
  x.strokeStyle = rgba(P.ink, 0.9);
  x.lineWidth = Math.max(1.6, Math.min(W, H) * 0.002);
  x.strokeRect(mx0, my0, mw, mh);
  if (ticked) {
    const tick = Math.min(W, H) * 0.02;
    const corners = [[mx0, my0], [mx0 + mw, my0], [mx0, my0 + mh], [mx0 + mw, my0 + mh]];
    x.lineWidth = Math.max(1.4, Math.min(W, H) * 0.0018);
    for (const [cx, cy] of corners) {
      x.beginPath();
      x.moveTo(cx - tick, cy); x.lineTo(cx + tick, cy);
      x.moveTo(cx, cy - tick); x.lineTo(cx, cy + tick);
      x.stroke();
    }
  }
}

function scaleBar(x, P, bx, by, w, W, H) {
  const sbH = Math.min(W, H) * 0.011, segsN = 4;
  for (let i = 0; i < segsN; i++) {
    x.fillStyle = i % 2 === 0 ? rgba(P.ink, 0.85) : rgba(P.paper, 0.9);
    x.fillRect(bx + (w / segsN) * i, by, w / segsN, sbH);
  }
  x.strokeStyle = rgba(P.ink, 0.85); x.lineWidth = 1;
  x.strokeRect(bx, by, w, sbH);
  const fp = Math.max(9, Math.min(W, H) * 0.0095);
  x.font = `${fp}px Georgia, serif`;
  x.fillStyle = rgba(P.ink, 0.85);
  x.textAlign = 'left'; x.textBaseline = 'bottom';
  x.fillText('0', bx, by - 2);
  x.textAlign = 'right';
  x.fillText('1 km', bx + w, by - 2);
}

function northArrow(x, P, nx, ny, W, H) {
  const nr = Math.min(W, H) * 0.022;
  x.save(); x.translate(nx, ny - nr);
  x.fillStyle = rgba(P.ink, 0.9); x.strokeStyle = rgba(P.ink, 0.9);
  x.lineWidth = Math.max(1, Math.min(W, H) * 0.0011);
  x.beginPath();
  x.moveTo(0, -nr); x.lineTo(nr * 0.42, 0); x.lineTo(0, nr * 0.5); x.lineTo(-nr * 0.42, 0); x.closePath();
  x.stroke();
  x.beginPath();
  x.moveTo(0, -nr); x.lineTo(nr * 0.42, 0); x.lineTo(0, 0); x.lineTo(-nr * 0.42, 0); x.closePath();
  x.fill();
  const fp = Math.max(9, Math.min(W, H) * 0.011);
  x.font = `bold ${fp}px Georgia, serif`;
  x.fillStyle = rgba(P.ink, 0.95);
  x.textAlign = 'center'; x.textBaseline = 'bottom';
  x.fillText('N', 0, -nr - 2);
  x.restore();
}

function titleBlock(x, P, bx, by, bw, bh, W, H, r) {
  x.fillStyle = rgba(P.paper, 0.92);
  x.fillRect(bx, by, bw, bh);
  x.strokeStyle = rgba(P.ink, 0.9);
  x.lineWidth = Math.max(1.2, Math.min(W, H) * 0.0014);
  x.strokeRect(bx, by, bw, bh);
  x.beginPath();
  x.moveTo(bx, by + bh * 0.5); x.lineTo(bx + bw, by + bh * 0.5); x.stroke();
  const f1 = Math.max(11, bh * 0.26), f2 = Math.max(8, bh * 0.17);
  x.fillStyle = rgba(P.ink, 0.95);
  x.textAlign = 'left'; x.textBaseline = 'middle';
  x.font = `bold ${f1}px Georgia, serif`;
  x.fillText('CONTOUR INTERVAL', bx + bw * 0.05, by + bh * 0.27);
  x.font = `${f2}px Georgia, serif`;
  x.fillStyle = rgba(P.ink, 0.8);
  const sheet = `SHEET ${rint(r, 1, 48)} · ${rint(r, 1, 24)}/${rint(r, 1, 64)}`;
  x.fillText(sheet, bx + bw * 0.05, by + bh * 0.72);
  x.textAlign = 'right';
  x.fillText('countyline-ai', bx + bw * 0.95, by + bh * 0.72);
}

/* cross-section strip: the cut through the terrain, drawn across a bottom band */
function sectionStrip(x, P, field, cols, rows, sx0, sy0, sw, sh, W, H, p) {
  // baseline + a sampled profile across the middle of the field
  x.fillStyle = rgba(P.paper, 0.9);
  x.fillRect(sx0, sy0, sw, sh);
  const samp = 220;
  const prof = new Array(samp);
  const cutRow = 0.42 + 0.16 * INVPHI;   // sample a representative cut line
  for (let i = 0; i < samp; i++) {
    prof[i] = sampleAt(field, cols, rows, i / (samp - 1), cutRow);
  }
  // hypsometric fill under the profile
  for (let i = 0; i < samp - 1; i++) {
    const h0 = prof[i], h1 = prof[i + 1];
    const px0 = sx0 + (i / (samp - 1)) * sw, px1 = sx0 + ((i + 1) / (samp - 1)) * sw;
    const top0 = sy0 + sh * (1 - h0 * 0.82) - sh * 0.08;
    const top1 = sy0 + sh * (1 - h1 * 0.82) - sh * 0.08;
    let col = rampColor(P, (h0 + h1) * 0.5);
    col = mix(col, P.paper, 0.32);
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(px0, top0); x.lineTo(px1, top1);
    x.lineTo(px1, sy0 + sh); x.lineTo(px0, sy0 + sh); x.closePath();
    x.fill();
  }
  // profile line on top
  x.strokeStyle = rgba(P.ink, 0.95);
  x.lineWidth = Math.max(1.6, Math.min(W, H) * 0.0022);
  x.beginPath();
  for (let i = 0; i < samp; i++) {
    const px = sx0 + (i / (samp - 1)) * sw;
    const py = sy0 + sh * (1 - prof[i] * 0.82) - sh * 0.08;
    if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
  }
  x.stroke();
  // section frame + label
  x.strokeStyle = rgba(P.ink, 0.85);
  x.lineWidth = Math.max(1.2, Math.min(W, H) * 0.0014);
  x.strokeRect(sx0, sy0, sw, sh);
  const fp = Math.max(9, Math.min(W, H) * 0.011);
  x.font = `${fp}px Georgia, serif`;
  x.fillStyle = rgba(P.ink, 0.85);
  x.textAlign = 'left'; x.textBaseline = 'top';
  x.fillText("SECTION  A — A'", sx0 + 6, sy0 + 5);
}

/* ── Paint ───────────────────────────────────────────────────────────────── */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const dark = lum(P.paper) < 0.5;
  const lay = p.layI;

  x.fillStyle = P.paper;
  x.fillRect(0, 0, W, H);

  // map rect + whether a frame is drawn — depends on layout
  let mx0, my0, mw, mh, framed = false, ticked = false;
  const m = Math.round(Math.min(W, H) * 0.06);

  if (lay === 0) {                 // Survey Plate — formal framed sheet
    mx0 = m; my0 = m; mw = W - m * 2; mh = H - m * 2; framed = true; ticked = true;
  } else if (lay === 1) {          // Full Bleed — edge to edge, no frame
    mx0 = 0; my0 = 0; mw = W; mh = H;
  } else if (lay === 2) {          // Coastal Crop — bleed terrain, no frame
    mx0 = 0; my0 = 0; mw = W; mh = H;
  } else if (lay === 3) {          // Twin Massif — bleed, no frame
    mx0 = 0; my0 = 0; mw = W; mh = H;
  } else if (lay === 4) {          // Plan + Section — plan upper 2/3
    const split = Math.round(H * 0.68);
    mx0 = m; my0 = m; mw = W - m * 2; mh = split - m * 2;
  } else {                         // Detail Inset — bleed terrain + locator box
    mx0 = 0; my0 = 0; mw = W; mh = H;
  }

  // build field into the layout's region, painted into the map rect
  const placer = PLACERS[lay];
  const { field, cols, rows } = buildField(p, r, mw, mh, placer);

  // clip terrain + labels to the map rect
  x.save();
  x.beginPath(); x.rect(mx0, my0, mw, mh); x.clip();
  paintTerrain(x, P, field, cols, rows, mx0, my0, mw, mh, p, r, true);
  x.restore();

  // ── layout-specific furniture ──
  if (lay === 0) {                 // Survey Plate: full formal furniture
    neatline(x, P, mx0, my0, mw, mh, W, H, ticked);
    const inset = Math.min(W, H) * 0.045;
    scaleBar(x, P, mx0 + inset, my0 + mh - inset, mw * 0.2, W, H);
    northArrow(x, P, mx0 + mw - inset, my0 + inset + Math.min(W, H) * 0.022, W, H);
    const tbw = mw * 0.4, tbh = Math.min(W, H) * 0.075;
    titleBlock(x, P, mx0 + mw - tbw - inset, my0 + mh - tbh - inset, tbw, tbh, W, H, r);
  } else if (lay === 1 || lay === 2 || lay === 3) {
    // Full Bleed / Coastal / Twin — minimal: a discreet scale bar + north only,
    // NO frame. Tucked corners so the terrain stays the subject.
    const inset = Math.min(W, H) * 0.05;
    scaleBar(x, P, inset, H - inset, mw * 0.18, W, H);
    northArrow(x, P, W - inset, inset + Math.min(W, H) * 0.022, W, H);
  } else if (lay === 4) {          // Plan + Section
    neatline(x, P, mx0, my0, mw, mh, W, H, false);
    const inset = Math.min(W, H) * 0.04;
    northArrow(x, P, mx0 + mw - inset, my0 + inset + Math.min(W, H) * 0.022, W, H);
    // section strip across the bottom band
    const split = Math.round(H * 0.68);
    const sx0 = m, sy0 = split + Math.round(m * 0.4), sw = W - m * 2, sh = H - split - m * 1.4;
    sectionStrip(x, P, field, cols, rows, sx0, sy0, sw, sh, W, H, p);
    scaleBar(x, P, mx0, my0 + mh + Math.min(W, H) * 0.025, mw * 0.2, W, H);
  } else {                         // Detail Inset: locator inset in a corner
    const inset = Math.min(W, H) * 0.045;
    scaleBar(x, P, inset, H - inset, mw * 0.18, W, H);
    // small framed locator map in the corner opposite the terrain mass
    const lw = Math.min(W, H) * 0.26, lh = lw * (H / W) * 1.0;
    const oppX = p.corner % 2 === 0 ? W - lw - inset : inset;
    const oppY = p.corner < 2 ? H - lh - inset : inset;
    // locator background sheet
    x.fillStyle = rgba(P.paper, 0.94);
    x.fillRect(oppX, oppY, lw, lh);
    // a coarse mini contour set inside the locator (low band count)
    x.save();
    x.beginPath(); x.rect(oppX, oppY, lw, lh); x.clip();
    const miniBands = 5, msx = lw / (cols - 1), msy = lh / (rows - 1);
    for (let i = 1; i < miniBands; i++) {
      const segs = isoSegments(field, cols, rows, i / miniBands, oppX, oppY, msx, msy);
      x.strokeStyle = rgba(P.ink, i === Math.floor(miniBands / 2) ? 0.9 : 0.55);
      x.lineWidth = i === Math.floor(miniBands / 2) ? 1.8 : 1;
      x.beginPath();
      for (const s of segs) { x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); }
      x.stroke();
    }
    // "you are here" extent rectangle on the locator
    x.strokeStyle = rgba(P.ink, 0.95);
    x.lineWidth = Math.max(1.4, Math.min(W, H) * 0.0016);
    x.strokeRect(oppX + lw * 0.32, oppY + lh * 0.3, lw * 0.34, lh * 0.34);
    x.restore();
    x.strokeStyle = rgba(P.ink, 0.9);
    x.lineWidth = Math.max(1.4, Math.min(W, H) * 0.0018);
    x.strokeRect(oppX, oppY, lw, lh);
    const fp = Math.max(8, Math.min(W, H) * 0.0095);
    x.font = `${fp}px Georgia, serif`;
    x.fillStyle = rgba(P.ink, 0.85);
    x.textAlign = 'left'; x.textBaseline = 'top';
    x.fillText('LOCATOR', oppX + 5, oppY + 4);
  }

  // finish
  grain(x, W, H, 1400, r);
  vignette(x, W, H, dark ? 0.22 : 0.16);
}

/* ── Exports ─────────────────────────────────────────────────────────────── */
export const contourTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const contourSchema: TraitSchema = {
  traits: [
    { name: 'Layout', values: LAYOUTS,
      subtraits: [
        { name: 'Whole Sheet', values: ['Survey Plate', 'Full Bleed', 'Twin Massif'] },
        { name: 'Cropped', values: ['Coastal Crop', 'Plan + Section', 'Detail Inset'] },
      ] },
    { name: 'Palette', values: PALS.map((p) => p.name),
      subtraits: [
        { name: 'Survey', values: ['USGS Land', 'Sepia Survey', 'Blueprint Cyan', 'Blue Print', 'Alpine Snow'] },
        { name: 'Terrain', values: ['Desert Relief', 'Bathymetric', 'Volcanic'] },
        { name: 'Synthetic', values: ['Aurora', 'Neon Relief'] },
      ] },
    { name: 'Format', values: ['Square', 'Portrait', 'Landscape'],
      subtraits: [
        { name: 'Upright', values: ['Square', 'Portrait'] },
        { name: 'Broad', values: ['Landscape'] },
      ] },
    { name: 'Relief', values: RELIEFS,
      subtraits: [
        { name: 'Low Ground', values: ['Basin', 'Rolling'] },
        { name: 'High Ground', values: ['Massif', 'Caldera'] },
      ] },
    { name: 'Interval', values: DENS },
  ],
};

export const renderContour: EngineFn = blit(draw, contourTraits);

export const CONTOUR_ASPECTS = [1, 0.81, 1.24] as const;
