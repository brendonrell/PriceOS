// @ts-nocheck
/*
 * Contour Interval — direction A, "Topographic".
 *
 * A real-survey topographic map. A smooth value-noise height field is built
 * from layered radial bumps + summed sines (deterministic per seed). The field
 * is filled with a hypsometric tint ramp (elevation bands low→high), then
 * iso-elevation lines are traced over it with marching-squares: thin
 * intermediate contours plus bold index contours every Nth interval. Optional
 * graticule grid, corner registration ticks and a faint scale bar give it the
 * cartographic plotter-pen feel. Paper tooth via mottle + grain on top.
 *
 * countyline-ai / cartographic landscape lane. Single self-contained engine.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ── Palettes ─────────────────────────────────────────────────────────────
 * Each: paper (base), ink (line colour), and a 5-stop hypsometric ramp from
 * lowland (deep) → highland (pale/bright). lo/hi anchor the tint band fill. */
const PALS = [
  { name: 'USGS',          paper: '#f3ead6', ink: '#5a4a2e', ramp: ['#3c6b54', '#7fa86a', '#cdd08a', '#d9b56e', '#c98a55'] },
  { name: 'Bathymetric',   paper: '#0c2740', ink: '#bcd7e6', ramp: ['#0a2c4a', '#16567f', '#2f8db4', '#7cc4d6', '#dff1f2'] },
  { name: 'Sepia Survey',  paper: '#efe2c8', ink: '#4a3722', ramp: ['#8a6b46', '#a9895d', '#c4a878', '#d9c79b', '#efe2c8'] },
  { name: 'Blueprint',     paper: '#0e2a4d', ink: '#cfe4ff', ramp: ['#102c52', '#1a447a', '#2a63a8', '#5e93cf', '#b9d6f2'] },
  { name: 'Topo Green',    paper: '#12372e', ink: '#bfe6c8', ramp: ['#123a30', '#1f6149', '#3f9166', '#86c089', '#dcefc4'] },
  { name: 'Ash & Ochre',   paper: '#e7e1d4', ink: '#3a3530', ramp: ['#494642', '#7a7066', '#a8957a', '#cdb27e', '#e7d6a8'] },
  { name: 'Glacier',       paper: '#e9eef2', ink: '#3b4a57', ramp: ['#4a6373', '#789aab', '#a8c4cf', '#d2e3e8', '#f4f8fa'] },
];

const FMTS = [
  { W: 1180, H: 1180, t: 'Square' },
  { W: 1040, H: 1280, t: 'Portrait' },
  { W: 1280, H: 1040, t: 'Landscape' },
];

const RELIEFS  = ['Lowland', 'Rolling', 'Highland', 'Caldera'];   // terrain character
const DENS     = ['Sparse', 'Standard', 'Dense'];                 // contour interval
const ORIENTS  = ['North Up', 'Skewed', 'Rotated'];               // graticule orientation

/* ── Trait draws — ONE fixed order, never reorder ─────────────────────────── */
function paramsOf(r) {
  const palI   = Math.floor(r() * PALS.length);
  const fmt    = pick(FMTS, r);
  const relI   = Math.floor(r() * RELIEFS.length);
  const denI   = Math.floor(r() * DENS.length);
  const oriI   = Math.floor(r() * ORIENTS.length);
  const grid   = r() < 0.62;                 // graticule on/off
  // landform field params (consume r deterministically after trait draws)
  const peaks  = relI === 3 ? 1 : rint(r, 2, 4 + relI);
  const seedJit = r();                       // peak placement jitter source
  const warp   = 0.6 + r() * 1.4;            // domain warp strength
  const ridges = relI >= 1 ? rint(r, 1, 3) : 0;
  return { palI, fmt, relI, denI, oriI, grid, peaks, seedJit, warp, ridges };
}

function labels(p) {
  return {
    Palette:  PALS[p.palI].name,
    Format:   p.fmt.t,
    Relief:   RELIEFS[p.relI],
    Interval: DENS[p.denI],
    Graticule: p.grid ? 'On' : 'Off',
  };
}

/* ── Height field ─────────────────────────────────────────────────────────
 * Sum of radial bumps (the landforms) + low-amp summed sines (texture) +
 * optional ridge lines. Domain-warped for organic, non-circular contours.
 * Returns normalised [0,1]. */
function buildField(p, r, W, H) {
  const cols = 220, rows = Math.round(220 * H / W);
  const field = new Float32Array(cols * rows);

  // landform centres
  const bumps = [];
  for (let i = 0; i < p.peaks; i++) {
    const cx = (0.12 + r() * 0.76);
    const cy = (0.12 + r() * 0.76);
    const amp = 0.5 + r() * 0.9 + (p.relI === 2 ? 0.3 : 0) + (p.relI === 3 ? 0.5 : 0);
    const sig = (0.10 + r() * 0.22) * (p.relI === 0 ? 1.5 : 1);
    const ell = 0.5 + r() * 1.5;            // ellipticity
    const rot = r() * Math.PI;
    bumps.push({ cx, cy, amp, sig, ell, rot, caldera: p.relI === 3 });
  }

  // ridge segments (raised lines for highland/rolling)
  const ridgeSegs = [];
  for (let i = 0; i < p.ridges; i++) {
    ridgeSegs.push({
      x0: r(), y0: r(), x1: r(), y1: r(),
      amp: 0.3 + r() * 0.5, w: 0.04 + r() * 0.06,
    });
  }

  // summed-sine texture coefficients
  const sines = [];
  for (let i = 0; i < 5; i++) {
    sines.push({
      fx: (1 + i * PHI) * (1 + r() * 2),
      fy: (1 + i * PHI) * (1 + r() * 2),
      ph: r() * Math.PI * 2,
      a: (0.10 - i * 0.015) * (0.7 + r() * 0.6),
    });
  }

  const warpA = p.warp * 0.06;
  let mn = Infinity, mx = -Infinity;
  for (let gy = 0; gy < rows; gy++) {
    for (let gx = 0; gx < cols; gx++) {
      let u = gx / (cols - 1), v = gy / (rows - 1);
      // domain warp via low-freq sines
      const wu = u + warpA * Math.sin(6.0 * v + 1.3) + warpA * 0.6 * Math.sin(11.0 * v);
      const wv = v + warpA * Math.cos(6.0 * u + 0.7) + warpA * 0.6 * Math.cos(11.0 * u);
      let h = 0;

      for (const b of bumps) {
        let dx = wu - b.cx, dy = wv - b.cy;
        const cs = Math.cos(b.rot), sn = Math.sin(b.rot);
        const rx = (dx * cs - dy * sn) * b.ell;
        const ry = (dx * sn + dy * cs) / b.ell;
        const d2 = (rx * rx + ry * ry) / (b.sig * b.sig);
        let g = b.amp * Math.exp(-d2);
        if (b.caldera) g *= (1 - 0.85 * Math.exp(-d2 * 6)); // sunken crater
        h += g;
      }

      for (const rg of ridgeSegs) {
        const ax = wu - rg.x0, ay = wv - rg.y0;
        const bx = rg.x1 - rg.x0, by = rg.y1 - rg.y0;
        const t = clamp((ax * bx + ay * by) / (bx * bx + by * by + 1e-6), 0, 1);
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
  for (let i = 0; i < field.length; i++) field[i] = (field[i] - mn) / span;
  return { field, cols, rows };
}

/* sample bilinear from normalised grid at pixel (px,py) */
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

/* ── Paint ───────────────────────────────────────────────────────────────── */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  // paper base
  x.fillStyle = P.paper;
  x.fillRect(0, 0, W, H);

  const pad = Math.round(Math.min(W, H) * 0.055);
  const iw = W - pad * 2, ih = H - pad * 2;

  // build height field
  const { field, cols, rows } = buildField(p, r, iw, ih);
  const sx = iw / (cols - 1), sy = ih / (rows - 1);

  // ── 1. hypsometric tint bands (filled per elevation step) ──
  // render a low-res image-ish fill by sampling each grid cell as a quad band
  const bandCount = p.denI === 0 ? 7 : p.denI === 1 ? 11 : 16;
  // fill the whole map with the per-pixel-ish ramp using small rects
  const fcols = 180, frows = Math.round(180 * ih / iw);
  const fcw = iw / fcols, fch = ih / frows;
  for (let gy = 0; gy < frows; gy++) {
    for (let gx = 0; gx < fcols; gx++) {
      const t = sampleAt(field, cols, rows, gx / (fcols - 1), gy / (frows - 1));
      // quantise to bands for the stepped hypsometric look
      const band = Math.floor(t * bandCount) / bandCount;
      let col = rampColor(P, band + 0.5 / bandCount);
      // subtle low-light shading for relief read
      col = mix(col, '#000', 0.05 * (1 - t));
      x.fillStyle = col;
      x.fillRect(pad + gx * fcw, pad + gy * fch, fcw + 1, fch + 1);
    }
  }

  // soft hillshade pass (SE light) — accentuate slopes
  x.save();
  x.globalCompositeOperation = 'overlay';
  const hcols = 150, hrows = Math.round(150 * ih / iw);
  const hcw = iw / hcols, hch = ih / hrows;
  const e = 0.012;
  for (let gy = 0; gy < hrows; gy++) {
    for (let gx = 0; gx < hcols; gx++) {
      const u = gx / (hcols - 1), v = gy / (hrows - 1);
      const dzdx = sampleAt(field, cols, rows, clamp(u + e, 0, 1), v) - sampleAt(field, cols, rows, clamp(u - e, 0, 1), v);
      const dzdy = sampleAt(field, cols, rows, u, clamp(v + e, 0, 1)) - sampleAt(field, cols, rows, u, clamp(v - e, 0, 1));
      const shade = clamp(0.5 + (dzdx + dzdy) * 6, 0, 1);
      const tone = shade > 0.5 ? '#fff' : '#000';
      x.fillStyle = rgba(tone, Math.abs(shade - 0.5) * 0.5);
      x.fillRect(pad + gx * hcw, pad + gy * hch, hcw + 1, hch + 1);
    }
  }
  x.restore();

  // ── 2. graticule grid (under contours) ──
  if (p.grid) {
    x.save();
    if (p.oriI === 1) { x.translate(W / 2, H / 2); x.rotate((r() - 0.5) * 0.18); x.translate(-W / 2, -H / 2); }
    if (p.oriI === 2) { x.translate(W / 2, H / 2); x.rotate((r() - 0.5) * 0.5); x.translate(-W / 2, -H / 2); }
    x.strokeStyle = rgba(P.ink, 0.10);
    x.lineWidth = 1;
    const gn = p.denI === 2 ? 12 : 8;
    for (let i = 0; i <= gn; i++) {
      const gxp = pad + (iw * i) / gn, gyp = pad + (ih * i) / gn;
      x.beginPath(); x.moveTo(gxp, pad - ih * 0.2); x.lineTo(gxp, pad + ih * 1.2); x.stroke();
      x.beginPath(); x.moveTo(pad - iw * 0.2, gyp); x.lineTo(pad + iw * 1.2, gyp); x.stroke();
    }
    x.restore();
  }

  // ── 3. contour lines (intermediate thin + index bold) ──
  const levels = bandCount;
  const indexEvery = p.denI === 2 ? 5 : 4;
  x.lineJoin = 'round'; x.lineCap = 'round';
  for (let i = 1; i < levels; i++) {
    const lvl = i / levels;
    const isIndex = i % indexEvery === 0;
    const segs = isoSegments(field, cols, rows, lvl, pad, pad, sx, sy);
    if (!segs.length) continue;
    // shadow line for the index contours (engraved feel)
    if (isIndex) {
      x.strokeStyle = rgba('#000', 0.16);
      x.lineWidth = Math.max(2.4, Math.min(W, H) * 0.0032);
      x.beginPath();
      for (const s of segs) { x.moveTo(s[0], s[1] + 1); x.lineTo(s[2], s[3] + 1); }
      x.stroke();
    }
    x.strokeStyle = isIndex ? rgba(P.ink, 0.92) : rgba(P.ink, 0.5);
    x.lineWidth = isIndex ? Math.max(2.0, Math.min(W, H) * 0.0028) : Math.max(0.8, Math.min(W, H) * 0.0011);
    x.beginPath();
    for (const s of segs) { x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); }
    x.stroke();
  }

  // ── 4. neat-line border + corner registration ticks ──
  x.strokeStyle = rgba(P.ink, 0.85);
  x.lineWidth = Math.max(1.5, Math.min(W, H) * 0.0016);
  x.strokeRect(pad, pad, iw, ih);
  x.strokeRect(pad - 6, pad - 6, iw + 12, ih + 12);
  const tick = Math.min(W, H) * 0.022;
  const corners = [[pad, pad], [pad + iw, pad], [pad, pad + ih], [pad + iw, pad + ih]];
  x.lineWidth = Math.max(1.5, Math.min(W, H) * 0.0018);
  for (const [cx, cy] of corners) {
    x.beginPath();
    x.moveTo(cx - tick, cy); x.lineTo(cx + tick, cy);
    x.moveTo(cx, cy - tick); x.lineTo(cx, cy + tick);
    x.stroke();
  }

  // ── 5. faint scale bar (bottom-left inside neat-line) ──
  const sbW = iw * 0.22, sbH = Math.min(W, H) * 0.012;
  const sbx = pad + iw * 0.04, sby = pad + ih - sbH - iw * 0.04;
  const segsN = 4;
  for (let i = 0; i < segsN; i++) {
    x.fillStyle = i % 2 === 0 ? rgba(P.ink, 0.8) : rgba(P.paper, 0.85);
    x.fillRect(sbx + (sbW / segsN) * i, sby, sbW / segsN, sbH);
  }
  x.strokeStyle = rgba(P.ink, 0.8);
  x.lineWidth = 1;
  x.strokeRect(sbx, sby, sbW, sbH);

  // ── 6. paper texture + finish ──
  mottle(x, pad, pad, iw, ih, P.paper, 900, r, 'overlay');
  grain(x, W, H, 1000, r);
  vignette(x, W, H, 0.25);
}

/* ── Exports ─────────────────────────────────────────────────────────────── */
export const contourTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const contourSchema: TraitSchema = {
  traits: [
    { name: 'Palette',   values: PALS.map((p) => p.name) },
    { name: 'Format',    values: ['Square', 'Portrait', 'Landscape'] },
    { name: 'Relief',    values: RELIEFS },
    { name: 'Interval',  values: DENS },
    { name: 'Graticule', values: ['On', 'Off'] },
  ],
};

export const renderContour: EngineFn = blit(draw, contourTraits);

export const CONTOUR_ASPECTS = [1, 0.81, 1.24] as const;
