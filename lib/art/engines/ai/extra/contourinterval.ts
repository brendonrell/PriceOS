// @ts-nocheck
/*
 * Contour Interval — countyline-ai, cartographic lane.
 *
 * A real topographic survey map. A deterministic height field is built from ONE
 * dominant landform (basin or massif) plus a few subordinate folds, then traced
 * with marching-squares into clean iso-elevation lines: thin intermediates with
 * a BOLD index contour every 5th, carrying elevation numbers. A muted
 * hypsometric tint sits FAR back (low contrast, gentle hillshade) so the lines
 * are unambiguously the hero — a plotted map, not a smudge. Map furniture
 * (neat-line, coordinate ticks, scale bar, north arrow) is varied per seed so
 * the frame is earned, not a stamp. Paper tooth on top.
 *
 * v2 (2026-06-19): jury fix pass — layer separation, line hierarchy + labels,
 * varied furniture, legible land/thermal ramps, one guaranteed focal landform,
 * wider cool-palette spread (slate-teal + violet added).
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ── Palettes ─────────────────────────────────────────────────────────────
 * paper (sheet), ink (line colour), and a 5-stop hypsometric ramp lowland→
 * highland. Two families: warm "land" ramps (green→tan→brown) and cool ramps
 * (bathy / blueprint / slate-teal / violet) — kept distinct, not close cousins. */
const PALS = [
  { name: 'USGS Land',    paper: '#f4ecd8', ink: '#4f3f24', ramp: ['#2f6b4a', '#6fa063', '#c7cf86', '#d8b066', '#bd7e49'] },
  { name: 'Bathymetric',  paper: '#0b2236', ink: '#cfe6f2', ramp: ['#0a2c4a', '#155b86', '#2f93bc', '#86cad9', '#e6f4f4'] },
  { name: 'Sepia Survey', paper: '#f0e3c9', ink: '#473320', ramp: ['#7a5a39', '#9c7c50', '#bc9d6c', '#d6c194', '#efe2c4'] },
  { name: 'Blueprint',    paper: '#0d2748', ink: '#d6e8ff', ramp: ['#0f2c52', '#1b477e', '#2d68ad', '#6699d4', '#bcd9f5'] },
  { name: 'Topo Green',   paper: '#10362d', ink: '#cdeccf', ramp: ['#0f3a30', '#1f6149', '#469a6a', '#92c98e', '#e2f0c6'] },
  { name: 'Slate Teal',   paper: '#13262b', ink: '#cfe9e6', ramp: ['#16363c', '#1f5c5e', '#2f8f86', '#79c0b1', '#dcefe6'] },
  { name: 'Violet Relief',paper: '#1a1430', ink: '#e6dcff', ramp: ['#241a44', '#42306f', '#6b4ba0', '#a585d6', '#e3d2f2'] },
  { name: 'Ash & Ochre',  paper: '#e8e2d4', ink: '#34302b', ramp: ['#46433f', '#7b7165', '#ab977a', '#d0b47e', '#ecdca8'] },
];

const FMTS = [
  { W: 1180, H: 1180, t: 'Square' },
  { W: 1040, H: 1280, t: 'Portrait' },
  { W: 1280, H: 1040, t: 'Landscape' },
];

const RELIEFS = ['Basin', 'Rolling', 'Massif', 'Caldera'];  // dominant landform character
const DENS    = ['Sparse', 'Standard', 'Dense'];            // contour interval
const FRAMES  = ['Neatline', 'Ticked', 'Bleed'];            // map-furniture frame treatment

/* phi-based focal anchors — vary peak placement off-centre, never dead-centre */
const ANCHORS = [
  [INVPHI, INVPHI], [1 - INVPHI, INVPHI], [INVPHI, 1 - INVPHI], [1 - INVPHI, 1 - INVPHI],
  [0.5, INVPHI], [INVPHI, 0.5],
];

/* ── Trait draws — ONE fixed order, never reorder ─────────────────────────── */
function paramsOf(r) {
  const palI   = Math.floor(r() * PALS.length);
  const fmt    = pick(FMTS, r);
  const relI   = Math.floor(r() * RELIEFS.length);
  const denI   = Math.floor(r() * DENS.length);
  const frmI   = Math.floor(r() * FRAMES.length);
  const grat   = r() < 0.7;                  // graticule ticks on/off

  // ── field params (consumed after trait draws, fixed order) ──
  const anchI  = Math.floor(r() * ANCHORS.length);
  const scale  = 0.5 + r() * 0.8;            // focal landform scale 0.5–1.3x
  const folds  = relI === 3 ? 0 : rint(r, 1, 2 + relI);  // subordinate folds
  const warp   = 0.7 + r() * 1.2;            // domain warp strength
  const ridges = relI >= 1 && relI <= 2 ? rint(r, 1, 2) : 0;
  const basinV = relI === 0;                 // invert -> depression basin
  return { palI, fmt, relI, denI, frmI, grat, anchI, scale, folds, warp, ridges, basinV };
}

function labels(p) {
  return {
    Palette:  PALS[p.palI].name,
    Format:   p.fmt.t,
    Relief:   RELIEFS[p.relI],
    Interval: DENS[p.denI],
    Frame:    FRAMES[p.frmI],
  };
}

/* ── Height field ─────────────────────────────────────────────────────────
 * ONE dominant landform (placed on a phi anchor, scaled) + a few subordinate
 * folds + faint summed-sine texture. Domain-warped. Basin relief inverts the
 * dominant form to a depression. Returns normalised [0,1]. */
function buildField(p, r, W, H) {
  const cols = 230, rows = Math.round(230 * H / W);
  const field = new Float32Array(cols * rows);

  // dominant landform on a phi anchor
  const [ax, ay] = ANCHORS[p.anchI];
  const bumps = [];
  bumps.push({
    cx: clamp(ax + (r() - 0.5) * 0.1, 0.15, 0.85),
    cy: clamp(ay + (r() - 0.5) * 0.1, 0.15, 0.85),
    amp: 1.0 + (p.relI === 2 ? 0.4 : 0) + (p.relI === 3 ? 0.3 : 0),
    sig: (0.20 + r() * 0.12) * p.scale,
    ell: 0.6 + r() * 1.0,
    rot: r() * Math.PI,
    caldera: p.relI === 3,
    dominant: true,
  });
  // subordinate folds — smaller, lower amplitude, scattered
  for (let i = 0; i < p.folds; i++) {
    bumps.push({
      cx: 0.14 + r() * 0.72,
      cy: 0.14 + r() * 0.72,
      amp: 0.25 + r() * 0.35,
      sig: (0.08 + r() * 0.12) * p.scale,
      ell: 0.6 + r() * 1.0,
      rot: r() * Math.PI,
      caldera: false,
      dominant: false,
    });
  }

  // ridge segments (raised spurs for rolling/massif)
  const ridgeSegs = [];
  for (let i = 0; i < p.ridges; i++) {
    ridgeSegs.push({ x0: r(), y0: r(), x1: r(), y1: r(), amp: 0.2 + r() * 0.35, w: 0.05 + r() * 0.05 });
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

/* ── Paint ───────────────────────────────────────────────────────────────── */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const dark = lum(P.paper) < 0.5;

  // paper base
  x.fillStyle = P.paper;
  x.fillRect(0, 0, W, H);

  // Bleed frame draws map to the very edge; others inset to leave a margin.
  const bleed = p.frmI === 2;
  const pad = bleed ? 0 : Math.round(Math.min(W, H) * 0.06);
  const iw = W - pad * 2, ih = H - pad * 2;

  // build height field over the map area
  const { field, cols, rows } = buildField(p, r, iw, ih);
  const sx = iw / (cols - 1), sy = ih / (rows - 1);

  // ── 1. hypsometric tint — pushed FAR back (muted, low contrast) ──
  const bandCount = p.denI === 0 ? 8 : p.denI === 1 ? 12 : 16;
  const fcols = 200, frows = Math.round(200 * ih / iw);
  const fcw = iw / fcols, fch = ih / frows;
  for (let gy = 0; gy < frows; gy++) {
    for (let gx = 0; gx < fcols; gx++) {
      const t = sampleAt(field, cols, rows, gx / (fcols - 1), gy / (frows - 1));
      const band = Math.floor(t * bandCount) / bandCount;
      let col = rampColor(P, band + 0.5 / bandCount);
      // mute toward paper so tint recedes behind the lines (the key layer fix)
      col = mix(col, P.paper, 0.42);
      x.fillStyle = col;
      x.fillRect(pad + gx * fcw, pad + gy * fch, fcw + 1, fch + 1);
    }
  }

  // gentle hillshade (SE light) — soft, just enough to read relief
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
      const shade = clamp(0.5 + (dzdx + dzdy) * 5, 0, 1);
      const tone = shade > 0.5 ? '#fff' : '#000';
      x.fillStyle = rgba(tone, Math.abs(shade - 0.5) * 0.30);
      x.fillRect(pad + gx * hcw, pad + gy * hch, hcw + 1, hch + 1);
    }
  }
  x.restore();

  // faint paper mottle UNDER the lines (texture stays back)
  mottle(x, pad, pad, iw, ih, P.paper, 1600, r, 'overlay');

  // ── 2. graticule ticks along the edges (not a full smothering grid) ──
  if (p.grat && !bleed) {
    x.strokeStyle = rgba(P.ink, 0.55);
    x.lineWidth = Math.max(1, Math.min(W, H) * 0.0012);
    const gn = p.denI === 2 ? 12 : 8;
    const tk = Math.min(W, H) * 0.012;
    for (let i = 1; i < gn; i++) {
      const gxp = pad + (iw * i) / gn, gyp = pad + (ih * i) / gn;
      // top + bottom ticks
      x.beginPath(); x.moveTo(gxp, pad); x.lineTo(gxp, pad + tk); x.stroke();
      x.beginPath(); x.moveTo(gxp, pad + ih); x.lineTo(gxp, pad + ih - tk); x.stroke();
      // left + right ticks
      x.beginPath(); x.moveTo(pad, gyp); x.lineTo(pad + tk, gyp); x.stroke();
      x.beginPath(); x.moveTo(pad + iw, gyp); x.lineTo(pad + iw - tk, gyp); x.stroke();
    }
  }

  // clip contours/labels to the map area so labels don't spill past the sheet
  x.save();
  x.beginPath(); x.rect(pad, pad, iw, ih); x.clip();

  // ── 3. contour lines — clean, hierarchical, the HERO layer ──
  const levels = bandCount;
  const indexEvery = 5;                                  // bold index every 5th
  const baseElev = rint(r, 0, 9) * 100;                  // map datum for labels
  const interval = p.denI === 0 ? 40 : p.denI === 1 ? 20 : 10;  // metres per line
  const thin  = Math.max(0.9, Math.min(W, H) * 0.0012);
  const bold  = Math.max(2.2, Math.min(W, H) * 0.0032);
  x.lineJoin = 'round'; x.lineCap = 'round';

  // collect index segments so we can place labels after
  for (let i = 1; i < levels; i++) {
    const lvl = i / levels;
    const isIndex = i % indexEvery === 0;
    const segs = isoSegments(field, cols, rows, lvl, pad, pad, sx, sy);
    if (!segs.length) continue;
    x.strokeStyle = isIndex ? rgba(P.ink, 0.95) : rgba(P.ink, 0.55);
    x.lineWidth = isIndex ? bold : thin;
    x.beginPath();
    for (const s of segs) { x.moveTo(s[0], s[1]); x.lineTo(s[2], s[3]); }
    x.stroke();

    // elevation labels on index lines
    if (isIndex) {
      const elevM = baseElev + i * interval;
      const fontPx = Math.max(11, Math.min(W, H) * 0.013);
      x.font = `${fontPx}px Georgia, "Times New Roman", serif`;
      x.textAlign = 'center'; x.textBaseline = 'middle';
      const stride = Math.max(40, Math.floor(segs.length / 3));
      for (let k = Math.floor(stride * 0.5); k < segs.length; k += stride) {
        const s = segs[k];
        const lx = s[0], ly = s[1];
        const ang = Math.atan2(s[3] - s[1], s[2] - s[0]);
        x.save();
        x.translate(lx, ly);
        x.rotate(Math.abs(ang) > Math.PI / 2 ? ang + Math.PI : ang);
        // paper halo so the number sits cleanly over the line
        const tw = x.measureText(String(elevM)).width;
        x.fillStyle = rgba(P.paper, 0.85);
        x.fillRect(-tw / 2 - 2, -fontPx * 0.55, tw + 4, fontPx * 1.1);
        x.fillStyle = rgba(P.ink, 0.95);
        x.fillText(String(elevM), 0, 0);
        x.restore();
      }
    }
  }
  x.restore();  // end clip

  // ── 4. map furniture: frame (varied per seed) ──
  if (!bleed) {
    x.strokeStyle = rgba(P.ink, 0.9);
    if (p.frmI === 0) {
      // Neatline: single crisp rule
      x.lineWidth = Math.max(1.6, Math.min(W, H) * 0.002);
      x.strokeRect(pad, pad, iw, ih);
    } else {
      // Ticked: rule + corner registration crosses
      x.lineWidth = Math.max(1.4, Math.min(W, H) * 0.0016);
      x.strokeRect(pad, pad, iw, ih);
      const tick = Math.min(W, H) * 0.02;
      const corners = [[pad, pad], [pad + iw, pad], [pad, pad + ih], [pad + iw, pad + ih]];
      x.lineWidth = Math.max(1.4, Math.min(W, H) * 0.0018);
      for (const [cx, cy] of corners) {
        x.beginPath();
        x.moveTo(cx - tick, cy); x.lineTo(cx + tick, cy);
        x.moveTo(cx, cy - tick); x.lineTo(cx, cy + tick);
        x.stroke();
      }
    }
  }

  // ── 5. scale bar (bottom-left, inside map) ──
  {
    const inset = Math.min(W, H) * 0.045;
    const sbW = iw * 0.2, sbH = Math.min(W, H) * 0.011;
    const sbx = pad + inset, sby = pad + ih - sbH - inset;
    const segsN = 4;
    for (let i = 0; i < segsN; i++) {
      x.fillStyle = i % 2 === 0 ? rgba(P.ink, 0.85) : rgba(P.paper, 0.9);
      x.fillRect(sbx + (sbW / segsN) * i, sby, sbW / segsN, sbH);
    }
    x.strokeStyle = rgba(P.ink, 0.85);
    x.lineWidth = 1;
    x.strokeRect(sbx, sby, sbW, sbH);
    const fp = Math.max(9, Math.min(W, H) * 0.0095);
    x.font = `${fp}px Georgia, serif`;
    x.fillStyle = rgba(P.ink, 0.85);
    x.textAlign = 'left'; x.textBaseline = 'bottom';
    x.fillText('0', sbx, sby - 2);
    x.textAlign = 'right';
    x.fillText('1 km', sbx + sbW, sby - 2);
  }

  // ── 6. north arrow (top-right, inside map) ──
  {
    const inset = Math.min(W, H) * 0.045;
    const nr = Math.min(W, H) * 0.022;
    const nx = pad + iw - inset, ny = pad + inset + nr;
    x.save();
    x.translate(nx, ny);
    x.fillStyle = rgba(P.ink, 0.9);
    x.strokeStyle = rgba(P.ink, 0.9);
    x.lineWidth = Math.max(1, Math.min(W, H) * 0.0011);
    // diamond compass needle: filled north half, hollow south half
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

  // ── 7. finish ──
  grain(x, W, H, 1400, r);
  vignette(x, W, H, dark ? 0.22 : 0.16);
}

/* ── Exports ─────────────────────────────────────────────────────────────── */
export const contourTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const contourSchema: TraitSchema = {
  traits: [
    { name: 'Palette',  values: PALS.map((p) => p.name) },
    { name: 'Format',   values: ['Square', 'Portrait', 'Landscape'] },
    { name: 'Relief',   values: RELIEFS },
    { name: 'Interval', values: DENS },
    { name: 'Frame',    values: FRAMES },
  ],
};

export const renderContour: EngineFn = blit(draw, contourTraits);

export const CONTOUR_ASPECTS = [1, 0.81, 1.24] as const;
