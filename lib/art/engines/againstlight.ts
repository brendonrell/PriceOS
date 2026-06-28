// @ts-nocheck
/*
 * AGAINST LIGHT — layered translucent hard plastic, made strange.
 * Ported to production from tools/halo/s05_polycarbonate.js (2026-06-28).
 * Smoked acrylic, frosted perspex, tinted gel sheets stacked & overlapping so
 * colour MULTIPLIES where they cross. Hazy, satin-textured, premium product
 * design. SURREAL = real-but-off: sheets that pass through each other, a shadow
 * that doesn't match, depth that folds back. Quiet uncanny.
 *
 * Compositions (CEO "this is ART, COMPOSE images"): every mode is a composed
 * frame — a primary mass anchored off-centre, supporting elements at contrasting
 * scale, deliberate negative space, overlap colour-math as the hero. Never a
 * single centred slab.
 *
 * Deterministic in tokenId. againstLightTraits() mirrors draw()'s rng order.
 */
import { rng, pick, rint, shuffle, lum, mix, rgba, grain, vignette, mottle, makeNoise, hazeSheet, sheen, softShadow, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const K = { rng, pick, rint, shuffle, lum, mix, rgba, grain, vignette, mottle, makeNoise, hazeSheet, sheen, softShadow };

const PALS = [
  { name: 'Smoke',       ground: '#d9d9da', haze: '#c4c4c8', edge: '#ffffff',
    tints: ['#4a4750', '#8a6a4a', '#9a9aa4', '#5d5560', '#b59a78'] },
  { name: 'Sea Glass',   ground: '#eef1ec', haze: '#cdd9d2', edge: '#fbfffd',
    tints: ['#6fa899', '#9fc9c1', '#cdbf9a', '#7fb0a6', '#bcd0c2'] },
  { name: 'Rose Quartz', ground: '#f3e9e6', haze: '#e2cdcb', edge: '#fffafa',
    tints: ['#c08a8c', '#dba98c', '#b594a6', '#cf9d9a', '#e0bca6'] },
  { name: 'Graphite Ice', ground: '#1c2026', haze: '#2b3540', edge: '#eaf6ff',
    tints: ['#7fbce0', '#9aa9bf', '#bfe2f2', '#5f7e9c', '#c8d6e0'] },
  { name: 'Tea',          ground: '#e9e0cc', haze: '#d3c4a4', edge: '#fff7e4',
    tints: ['#8a6a3c', '#a98b52', '#7f7a44', '#c2a366', '#6e5a38'] },
  { name: 'Bruise',       ground: '#23222c', haze: '#322f40', edge: '#dfd6ff',
    tints: ['#6a4f8a', '#4a7a82', '#5a5f7a', '#7d5a86', '#3f5d6a'] },
];

const MODES = ['Constellation', 'Cascade', 'Lattice', 'Diptych', 'Drift', 'Eclipse', 'Shelf', 'Spill'];
const FORMATS = [[1040, 1300], [1200, 1200], [1300, 1040]]; // portrait / square / landscape

function draw(cv, seed) {
  const r = K.rng(seed);
  const noise = K.makeNoise(seed * 7 + 1);
  const pal = K.pick(PALS, r);
  const mode = K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const W = fmt[0], H = fmt[1];
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const dark = K.lum(pal.ground) < 0.4;
  const S = Math.min(W, H);

  const lightDir = r() < 0.5 ? -1 : 1;
  const gg = x.createLinearGradient(0, 0, W, H);
  gg.addColorStop(0, K.mix(pal.ground, pal.edge, dark ? 0.10 : 0.18));
  gg.addColorStop(0.55, pal.ground);
  gg.addColorStop(1, K.mix(pal.ground, dark ? '#000000' : pal.haze, 0.45));
  x.fillStyle = gg; x.fillRect(0, 0, W, H);
  K.hazeSheet(x, W, H, noise, pal.haze, dark ? 0.20 : 0.16, S * 1.1, dark ? 'screen' : 'multiply');

  function frostPanel(cx, cy, w, h, rad, rot, tint, depth, kind) {
    const near = depth;
    const bodyA = 0.30 + near * 0.30;
    const blur = (1 - near) * S * 0.018 + S * 0.004;

    x.save();
    x.translate(cx, cy);
    x.rotate(rot);

    function shapePath(ctx, ox, oy, sx, sy) {
      ctx.beginPath();
      if (kind === 'disc') {
        ctx.ellipse(ox, oy, (w / 2) * sx, (h / 2) * sy, 0, 0, 7);
      } else if (kind === 'blob') {
        const aw = (w / 2) * sx, ah = (h / 2) * sy;
        ctx.moveTo(ox, oy - ah);
        ctx.bezierCurveTo(ox + aw * 1.05, oy - ah * 0.9, ox + aw * 1.0, oy + ah * 0.95, ox, oy + ah);
        ctx.bezierCurveTo(ox - aw * 1.0, oy + ah * 0.95, ox - aw * 1.05, oy - ah * 0.9, ox, oy - ah);
      } else {
        const aw = w * sx, ah = h * sy, rr = Math.min(rad, aw / 2, ah / 2);
        const l = ox - aw / 2, t = oy - ah / 2, rt = ox + aw / 2, b = oy + ah / 2;
        ctx.moveTo(l + rr, t);
        ctx.lineTo(rt - rr, t); ctx.arcTo(rt, t, rt, t + rr, rr);
        ctx.lineTo(rt, b - rr); ctx.arcTo(rt, b, rt - rr, b, rr);
        ctx.lineTo(l + rr, b); ctx.arcTo(l, b, l, b - rr, rr);
        ctx.lineTo(l, t + rr); ctx.arcTo(l, t, l + rr, t, rr);
      }
      ctx.closePath();
    }

    x.save();
    x.globalCompositeOperation = 'multiply';
    x.filter = 'blur(' + (blur * 1.6) + 'px)';
    x.globalAlpha = 0.16 + near * 0.18;
    x.fillStyle = K.rgba(dark ? '#000000' : K.mix(tint, '#000000', 0.5), 1);
    shapePath(x, lightDir * S * 0.012 * (0.4 + near), S * 0.014 * (0.4 + near), 1, 1);
    x.fill();
    x.restore();

    x.save();
    x.globalCompositeOperation = dark ? 'screen' : 'multiply';
    x.filter = 'blur(' + blur + 'px)';
    const farTint = K.mix(tint, pal.haze, (1 - near) * 0.55);
    x.globalAlpha = bodyA;
    x.fillStyle = farTint;
    shapePath(x, 0, 0, 1, 1);
    x.fill();
    x.restore();

    x.save();
    shapePath(x, 0, 0, 1, 1);
    x.clip();
    x.globalCompositeOperation = dark ? 'screen' : 'soft-light';
    x.filter = 'blur(' + (blur * 2.2 + S * 0.02) + 'px)';
    const fg = x.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.6);
    fg.addColorStop(0, K.rgba(pal.edge, dark ? 0.22 : 0.30));
    fg.addColorStop(0.6, K.rgba(pal.edge, 0.06));
    fg.addColorStop(1, K.rgba(pal.edge, 0));
    x.fillStyle = fg;
    x.fillRect(-w, -h, w * 2, h * 2);
    x.filter = 'none';
    K.mottle(x, -w, -h, w * 2, h * 2, tint, 70 - near * 30, r, dark ? 'screen' : 'overlay');
    x.restore();

    x.save();
    shapePath(x, 0, 0, 1, 1);
    x.globalCompositeOperation = 'lighter';
    x.lineWidth = Math.max(1.2, S * 0.0016 * (0.6 + near));
    const eg = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    eg.addColorStop(0, K.rgba(pal.edge, (0.42 + near * 0.4) * (lightDir < 0 ? 1 : 0.25)));
    eg.addColorStop(0.5, K.rgba(pal.edge, 0.10));
    eg.addColorStop(1, K.rgba(pal.edge, (0.42 + near * 0.4) * (lightDir < 0 ? 0.25 : 1)));
    x.strokeStyle = eg;
    x.stroke();
    x.globalCompositeOperation = dark ? 'lighter' : 'multiply';
    x.lineWidth = Math.max(1, S * 0.001);
    x.strokeStyle = K.rgba(dark ? pal.edge : K.mix(tint, '#000', 0.4), 0.18);
    x.translate(-lightDir * S * 0.003, S * 0.003);
    shapePath(x, 0, 0, 0.985, 0.985);
    x.stroke();
    x.restore();

    if (near > 0.45) {
      x.save();
      shapePath(x, 0, 0, 1, 1);
      x.clip();
      K.sheen(x, lightDir * w * 0.28, -h * 0.3, Math.max(w, h) * 0.5, pal.edge, 0.10 + near * 0.10);
      x.restore();
    }

    x.restore();
  }

  function hole(hx, hy, hr) {
    x.save();
    K.softShadow(x, hx, hy, hr * 2.4, 0.25);
    x.globalCompositeOperation = dark ? 'screen' : 'multiply';
    x.fillStyle = K.rgba(dark ? '#000' : pal.haze, 0.5);
    x.beginPath(); x.arc(hx, hy, hr, 0, 7); x.fill();
    x.globalCompositeOperation = 'lighter';
    x.lineWidth = Math.max(1, S * 0.0014);
    x.strokeStyle = K.rgba(pal.edge, 0.5);
    x.beginPath(); x.arc(hx - hr * 0.15, hy - hr * 0.15, hr * 0.92, Math.PI * 0.9, Math.PI * 1.9); x.stroke();
    x.restore();
  }

  const tints = K.shuffle(pal.tints, r);
  function tintAt(i) { return tints[i % tints.length]; }

  const PHI = 0.618;
  const anchorXs = [1 - PHI, PHI, 0.33, 0.67];
  const anchorYs = [1 - PHI, PHI, 0.35, 0.66];
  const ax0 = anchorXs[(r() * anchorXs.length) | 0];
  const ay0 = anchorYs[(r() * anchorYs.length) | 0];
  const anchorX = W * ax0, anchorY = H * ay0;
  const cxc = W / 2, cyc = H / 2;

  function cluster(px, py, spreadX, spreadY, count, baseScale, kinds, depthLo, depthHi) {
    const items = [];
    for (let i = 0; i < count; i++) items.push({ d: depthLo + r() * (depthHi - depthLo), i });
    items.sort((a, b) => a.d - b.d);
    items.forEach((it, k) => {
      const a = (k / Math.max(1, count - 1) - 0.5);
      const ox = a * spreadX + (r() - 0.5) * spreadX * 0.5;
      const oy = (r() - 0.5) * spreadY;
      const sc = baseScale * (0.6 + it.d * 0.8);
      frostPanel(px + ox, py + oy, S * sc, S * sc * (0.7 + r() * 0.6),
        S * 0.05, (r() - 0.5) * 0.7, tintAt(it.i + k), it.d, K.pick(kinds, r));
    });
  }

  if (mode === 'Constellation') {
    const focal = K.rint(r, 0, 3);
    const spots = [[1 - PHI, 1 - PHI], [PHI, 1 - PHI], [1 - PHI, PHI], [PHI, PHI]];
    const order = K.shuffle(spots, r);
    order.forEach((sp, i) => {
      const heavy = i === focal;
      const n = heavy ? K.rint(r, 3, 5) : K.rint(r, 1, 2);
      cluster(W * sp[0], H * sp[1],
        S * (heavy ? 0.22 : 0.10), S * (heavy ? 0.18 : 0.08), n,
        heavy ? (0.34 + r() * 0.12) : (0.12 + r() * 0.08),
        ['disc', 'sheet', 'blob'], heavy ? 0.35 : 0.15, heavy ? 0.95 : 0.5);
    });
    hole(W * order[focal][0] + S * 0.06, H * order[focal][1] - S * 0.06, S * 0.012);

  } else if (mode === 'Cascade') {
    const fromLeft = ax0 < 0.5;
    const n = 6 + (r() * 3 | 0);
    const x0 = fromLeft ? -W * 0.05 : W * 1.05, x1 = fromLeft ? W * 0.85 : W * 0.15;
    const y0 = -H * 0.05, y1 = H * 1.02;
    const ang = (fromLeft ? -1 : 1) * (0.2 + r() * 0.2);
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const px = x0 + (x1 - x0) * t + (r() - 0.5) * W * 0.06;
      const py = y0 + (y1 - y0) * t + (r() - 0.5) * H * 0.04;
      const depth = 0.25 + t * 0.7;
      const sc = 0.22 + t * 0.34;
      frostPanel(px, py, S * sc, S * sc * (1.1 + r() * 0.4), S * 0.05, ang + (r() - 0.5) * 0.2,
        tintAt(i), depth, r() < 0.7 ? 'sheet' : 'disc');
    }

  } else if (mode === 'Lattice') {
    const cols = 3 + (r() * 2 | 0), rows = 3 + (r() * 2 | 0);
    const k = r() < 0.5 ? 'disc' : 'sheet';
    const winW = W * (0.62 + r() * 0.12), winH = H * (0.62 + r() * 0.12);
    const ox = (ax0 < 0.5 ? 0.04 : 0.96 - winW / W) * W;
    const oy = (ay0 < 0.5 ? 0.04 : 0.96 - winH / H) * H;
    const cellw = winW / cols, cellh = winH / rows;
    const d = Math.max(cellw, cellh) * (1.35 + r() * 0.30);
    const order = [];
    for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) order.push([gx, gy]);
    K.shuffle(order, r).forEach((g, i) => {
      const gx = g[0], gy = g[1];
      const px = ox + cellw * (gx + 0.5) + (r() - 0.5) * cellw * 0.16;
      const py = oy + cellh * (gy + 0.5) + (r() - 0.5) * cellh * 0.16;
      const depth = 0.3 + r() * 0.7;
      frostPanel(px, py, d, d, S * 0.045, (r() - 0.5) * 0.3, tintAt(gx + gy * 2 + i), depth, k);
    });

  } else if (mode === 'Diptych') {
    const leftFirst = r() < 0.5;
    const colA = W * (leftFirst ? 0.34 : 0.66), colB = W * (leftFirst ? 0.66 : 0.34);
    const sw = W * (0.30 + r() * 0.06), sh = H * (0.7 + r() * 0.12);
    frostPanel(colA, H * (0.5 + (r() - 0.5) * 0.1), sw, sh, S * 0.06,
      (r() - 0.5) * 0.12, tintAt(0), 0.88, 'sheet');
    cluster(colB, H * (0.46 + (r() - 0.5) * 0.16), S * 0.14, S * 0.16,
      K.rint(r, 2, 4), 0.26 + r() * 0.1, ['disc', 'blob'], 0.4, 0.92);
    hole(colA, H * 0.5 - sh * 0.34, S * 0.012);

  } else if (mode === 'Drift') {
    const n = 5 + (r() * 3 | 0);
    const kinds = ['sheet', 'disc', 'blob'];
    const emptyCorner = K.rint(r, 0, 3);
    const ecx = (emptyCorner % 2), ecy = (emptyCorner / 2 | 0);
    const items = [];
    for (let i = 0; i < n; i++) {
      let px = 0.15 + r() * 0.7, py = 0.15 + r() * 0.7;
      if (Math.abs(px - ecx) < 0.32 && Math.abs(py - ecy) < 0.32) { px = 1 - px; py = 1 - py; }
      items.push({ depth: r(), x: px, y: py, i });
    }
    items.sort((a, b) => a.depth - b.depth);
    items.forEach((it) => {
      const sc = 0.14 + it.depth * 0.34;
      frostPanel(W * it.x, H * it.y, S * sc, S * sc * (0.7 + r() * 0.7),
        S * 0.05, (r() - 0.5) * 1.0, tintAt(it.i), it.depth, K.pick(kinds, r));
    });

  } else if (mode === 'Eclipse') {
    const cx2 = anchorX, cy2 = anchorY;
    const big = S * (0.46 + r() * 0.1);
    const sep = big * (0.55 + r() * 0.3);
    const a = r() * 6.283;
    frostPanel(cx2 - Math.cos(a) * sep * 0.5, cy2 - Math.sin(a) * sep * 0.5,
      big, big, S * 0.5, 0, tintAt(0), 0.6, 'disc');
    frostPanel(cx2 + Math.cos(a) * sep * 0.5, cy2 + Math.sin(a) * sep * 0.5,
      big * (0.9 + r() * 0.2), big * (0.9 + r() * 0.2), S * 0.5, 0, tintAt(1), 0.9, 'disc');
    const na = K.rint(r, 2, 4);
    for (let i = 0; i < na; i++) {
      const sa2 = a + Math.PI + (r() - 0.5) * 1.2;
      const dd = big * (1.0 + i * 0.5);
      frostPanel(cx2 + Math.cos(sa2) * dd, cy2 + Math.sin(sa2) * dd,
        S * (0.06 + r() * 0.06), S * (0.06 + r() * 0.06), S * 0.4,
        (r() - 0.5) * 0.6, tintAt(i + 2), 0.3 + r() * 0.3, r() < 0.5 ? 'disc' : 'blob');
    }
    hole(cx2, cy2, S * 0.016);

  } else if (mode === 'Shelf') {
    const high = ay0 < 0.5;
    const shelfY = H * (high ? 0.32 : 0.68);
    const n = 4 + (r() * 3 | 0);
    let cursor = W * (0.06 + r() * 0.06);
    for (let i = 0; i < n && cursor < W * 0.94; i++) {
      const sw = W * (0.14 + r() * 0.16);
      const sh = H * (0.22 + r() * 0.22);
      const depth = 0.4 + r() * 0.55;
      const overlap = sw * (0.25 + r() * 0.25);
      frostPanel(cursor + sw * 0.5, shelfY + (r() - 0.5) * H * 0.05,
        sw, sh, S * 0.05, (r() - 0.5) * 0.12, tintAt(i), depth, r() < 0.6 ? 'sheet' : 'disc');
      cursor += sw - overlap;
    }
    if (r() < 0.7) hole(cursor - W * 0.1, shelfY - H * 0.08, S * 0.012);

  } else { // Spill
    const px0 = anchorX, py0 = anchorY;
    const n = 9 + (r() * 6 | 0);
    const dir = r() * 6.283;
    const items = [];
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1);
      const dd = S * (0.04 + t * 0.5) * (0.6 + r() * 0.8);
      const spread = t * 0.9;
      const a = dir + (r() - 0.5) * spread;
      items.push({ t, x: px0 + Math.cos(a) * dd, y: py0 + Math.sin(a) * dd, i });
    }
    items.sort((a, b) => b.t - a.t);
    items.forEach((it) => {
      const sc = (0.05 + (1 - it.t) * 0.22) * (0.7 + r() * 0.7);
      frostPanel(it.x, it.y, S * sc, S * sc * (0.7 + r() * 0.6), S * 0.04,
        (r() - 0.5) * 1.0, tintAt(it.i), 0.3 + (1 - it.t) * 0.65, K.pick(['disc', 'blob', 'sheet'], r));
    });
    hole(px0, py0, S * 0.014);
  }

  const hazeCol = dark ? K.mix(pal.haze, pal.edge, 0.18) : pal.haze;
  K.hazeSheet(x, W, H, noise, hazeCol, dark ? 0.14 : 0.12, S * 0.55, dark ? 'screen' : 'soft-light');
  K.sheen(x, lightDir < 0 ? W * 0.12 : W * 0.88, H * 0.1, S * 0.7, pal.edge, dark ? 0.05 : 0.07);
  K.grain(x, W, H, 6.5, r);
  K.vignette(x, W, H, dark ? 0.5 : 0.32);
}

export const againstLightTraits: TraitsFn = (id) => {
  const r = K.rng(id);
  const pal = K.pick(PALS, r);
  const mode = K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
  const finishMap = {
    'Smoke': 'Smoked', 'Sea Glass': 'Frosted', 'Rose Quartz': 'Satin',
    'Graphite Ice': 'Tinted', 'Tea': 'Perspex', 'Bruise': 'Smoked',
  };
  return { Palette: pal.name, Mode: mode, Format: f, Finish: finishMap[pal.name] };
};

export const againstLightSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Mode',    values: MODES },
    { name: 'Format',  values: ['Portrait', 'Square', 'Landscape'] },
    { name: 'Finish',  values: ['Smoked', 'Frosted', 'Satin', 'Tinted', 'Perspex'] },
  ],
};

export const renderAgainstLight: EngineFn = blit((off, id) => { draw(off, id); }, againstLightTraits);

// W/H of Portrait, Square, Landscape (matches FORMATS order).
export const AGAINSTLIGHT_ASPECTS = [1040 / 1300, 1, 1300 / 1040] as const;
