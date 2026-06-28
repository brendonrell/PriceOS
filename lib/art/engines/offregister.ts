// @ts-nocheck
/*
 * OFF REGISTER — risograph / screenprint spot-ink aesthetic.
 * Ported to production from tools/halo/s07_risograph.js (2026-06-28). Flat
 * spot-ink layers printed slightly OFF-REGISTER on textured paper. Each ink is
 * its own screen (halftone DOTS, fine LINES, stochastic GRAIN, or a flat SOLID
 * flood) at a distinct angle; overlaps MULTIPLY into mixed third/fourth colours.
 * Bold simple geometry — arcs, blobs, bars, rings, columns, grids, a fragment
 * of huge type — with confident negative space. SURREAL = real-but-off: the
 * registration drift ghosts/doubles a form. Clean riso, never messy.
 *
 * Deterministic in tokenId. Trait-determining randomness is drawn in a fixed
 * order so offRegisterTraits() and draw() never disagree.
 */
import { rng, pick, rint, mix, rgba, h2r, grain, vignette, mottle, makeNoise, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const K = { rng, pick, rint, mix, rgba, h2r, grain, vignette, mottle, makeNoise };

/* Riso spot-ink worlds: warm paper stock + 2 OR 3 named inks. */
const PALS = [
  { name: 'Fluoro',  paper: '#f3ead6', inks: [ { name: 'Fluoro Pink', hex: '#ff48a0' }, { name: 'Blue', hex: '#2046b0' } ] },
  { name: 'Citrus',  paper: '#f1ead2', inks: [ { name: 'Orange', hex: '#f26b21' }, { name: 'Teal', hex: '#1c8a86' } ] },
  { name: 'Grape',   paper: '#f4eccf', inks: [ { name: 'Yellow', hex: '#f4c20d' }, { name: 'Purple', hex: '#5b2a86' } ] },
  { name: 'Forest',  paper: '#eee7d1', inks: [ { name: 'Green', hex: '#2f8f4e' }, { name: 'Black', hex: '#1a1a1a' } ] },
  { name: 'Brick',   paper: '#f0e6d0', inks: [ { name: 'Red', hex: '#cf3b2e' }, { name: 'Steel', hex: '#5d6b78' } ] },
  { name: 'Sky',     paper: '#f2ead4', inks: [ { name: 'Brown', hex: '#6b4a2b' }, { name: 'Sky', hex: '#4aa7d6' } ] },
  { name: 'Cobalt',  paper: '#ece6d6', inks: [ { name: 'Fluoro Green', hex: '#5fc94a' }, { name: 'Cobalt', hex: '#243f9e' } ] },
  { name: 'Ember',   paper: '#f4ecdb', inks: [ { name: 'Crimson', hex: '#d6263b' }, { name: 'Charcoal', hex: '#24262b' } ] },
  { name: 'Lagoon',  paper: '#eef0e2', inks: [ { name: 'Aqua', hex: '#16b3c2' }, { name: 'Magenta', hex: '#d23a8f' } ] },
  { name: 'Carnival', paper: '#f4ead2', inks: [ { name: 'Fluoro Pink', hex: '#ff48a0' }, { name: 'Yellow', hex: '#f4c20d' }, { name: 'Blue', hex: '#2046b0' } ] },
  { name: 'Press',    paper: '#f0e9d6', inks: [ { name: 'Red', hex: '#cf3b2e' }, { name: 'Teal', hex: '#1c8a86' }, { name: 'Black', hex: '#1a1a1a' } ] },
  { name: 'Bazaar',   paper: '#f2ecd8', inks: [ { name: 'Orange', hex: '#f26b21' }, { name: 'Purple', hex: '#5b2a86' }, { name: 'Sky', hex: '#4aa7d6' } ] },
  { name: 'Grove',    paper: '#eee7cf', inks: [ { name: 'Green', hex: '#2f8f4e' }, { name: 'Gold', hex: '#e0a51f' }, { name: 'Oxblood', hex: '#7a2222' } ] },
];

const MODES = ['Overprint', 'Drift', 'Halftone', 'Cutout', 'Poster', 'Streak',
               'Concentric', 'Columns', 'Grid', 'Diagonal'];
const SCREENS = ['Dot', 'Line', 'Grain', 'Solid'];
const FORMATS = [[1040, 1300], [1180, 1180], [1300, 1040]]; // portrait / square / landscape
const GLYPHS = ['R', 'O', 'A', 'G', '7', '&', '?', 'Σ', '∞', '§', '!', 'Q', 'X', '∆', '%'];

function fastHash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return ((n >>> 0) % 1000) / 1000; }

function screenLayer(W, H, inkHex, angleDeg, cell, maskCtx, screen) {
  const lc = document.createElement('canvas'); lc.width = W; lc.height = H;
  const lx = lc.getContext('2d');
  const md = maskCtx.getImageData(0, 0, W, H).data;
  const ang = angleDeg * Math.PI / 180, ca = Math.cos(ang), sa = Math.sin(ang);
  const cx0 = W / 2, cy0 = H / 2;
  lx.fillStyle = inkHex;

  if (screen === 'Solid') {
    const out = lx.createImageData(W, H);
    const od = out.data;
    const c = K.h2r(inkHex);
    for (let i = 0; i < W * H; i++) {
      const cov = md[i * 4] / 255;
      const a = cov < 0.5 ? 0 : Math.min(1, (cov - 0.45) * 3);
      od[i * 4] = c[0]; od[i * 4 + 1] = c[1]; od[i * 4 + 2] = c[2];
      od[i * 4 + 3] = (a * (0.9 + 0.1 * fastHash(i))) * 255;
    }
    lx.putImageData(out, 0, 0);
    return lc;
  }

  const sampleCov = (ix, iy) => {
    let cov = 0, cnt = 0;
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
      const sx = ix + ox * (cell >> 1), sy = iy + oy * (cell >> 1);
      if (sx < 0 || sx >= W || sy < 0 || sy >= H) continue;
      cov += md[(sy * W + sx) * 4]; cnt++;
    }
    return cnt ? (cov / cnt) / 255 : 0;
  };
  const diag = Math.ceil(Math.sqrt(W * W + H * H)) + cell * 2;

  if (screen === 'Line') {
    lx.strokeStyle = inkHex; lx.lineCap = 'round';
    const maxTh = cell * 0.92;
    for (let gy = -diag; gy <= diag; gy += cell) {
      for (let gx = -diag; gx <= diag; gx += Math.max(2, cell >> 1)) {
        const px = cx0 + (gx * ca - gy * sa);
        const py = cy0 + (gx * sa + gy * ca);
        const ix = px | 0, iy = py | 0;
        if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
        const cov = sampleCov(ix, iy);
        if (cov < 0.05) continue;
        const th = Math.max(0.5, maxTh * cov);
        lx.save(); lx.beginPath(); lx.lineWidth = th;
        const nx = cx0 + ((gx + (cell >> 1)) * ca - gy * sa);
        const ny = cy0 + ((gx + (cell >> 1)) * sa + gy * ca);
        lx.moveTo(px, py); lx.lineTo(nx, ny); lx.stroke(); lx.restore();
      }
    }
    return lc;
  }

  if (screen === 'Grain') {
    for (let gy = 0; gy < H; gy += 2) {
      for (let gx = 0; gx < W; gx += 2) {
        const cov = md[(gy * W + gx) * 4] / 255;
        if (cov < 0.04) continue;
        if (fastHash(gx * 73856093 ^ gy * 19349663) < cov * 0.7) {
          const s = 1 + (fastHash(gx ^ (gy << 5)) < 0.3 ? 1 : 0);
          lx.fillRect(gx, gy, s, s);
        }
      }
    }
    return lc;
  }

  const maxR = cell * 0.72;
  for (let gy = -diag; gy <= diag; gy += cell) {
    for (let gx = -diag; gx <= diag; gx += cell) {
      const px = cx0 + (gx * ca - gy * sa);
      const py = cy0 + (gx * sa + gy * ca);
      if (px < -cell || px > W + cell || py < -cell || py > H + cell) continue;
      const ix = px | 0, iy = py | 0;
      if (ix < 0 || ix >= W || iy < 0 || iy >= H) continue;
      const cov = sampleCov(ix, iy);
      if (cov < 0.04) continue;
      let rad = maxR * Math.sqrt(cov);
      rad *= 0.86 + 0.28 * fastHash(ix * 73856093 ^ iy * 19349663);
      if (rad < 0.35) continue;
      lx.beginPath(); lx.arc(px, py, rad, 0, 7); lx.fill();
    }
  }
  return lc;
}

function makeInkLayer(W, H, inkHex, angle, cell, offX, offY, paintMask, skips, screen) {
  const mc = document.createElement('canvas'); mc.width = W; mc.height = H;
  const mx = mc.getContext('2d');
  mx.fillStyle = '#000'; mx.fillRect(0, 0, W, H);
  mx.fillStyle = '#fff';
  mx.save(); mx.translate(offX, offY);
  paintMask(mx);
  mx.restore();
  if (skips && skips.length) {
    mx.globalCompositeOperation = 'destination-out';
    for (const s of skips) {
      mx.fillStyle = 'rgba(0,0,0,' + s.a + ')';
      mx.fillRect(s.x, s.y, s.w, s.h);
    }
    mx.globalCompositeOperation = 'source-over';
  }
  return screenLayer(W, H, inkHex, angle, cell, mx, screen);
}

function draw(cv, seed) {
  const r = K.rng(seed);
  const noise = K.makeNoise(seed * 7 + 23);
  const pal = K.pick(PALS, r);
  const mode = K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const W = fmt[0], H = fmt[1];
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const S = Math.min(W, H);
  const nInks = pal.inks.length;

  x.fillStyle = pal.paper; x.fillRect(0, 0, W, H);
  const pg = x.createLinearGradient(0, 0, W, H);
  pg.addColorStop(0, K.mix(pal.paper, '#fff', 0.10));
  pg.addColorStop(0.5, pal.paper);
  pg.addColorStop(1, K.mix(pal.paper, '#000', 0.06));
  x.fillStyle = pg; x.fillRect(0, 0, W, H);

  const cell = Math.max(5, Math.round(S / (118 + r() * 34)));

  const mixScreens = r() < 0.45;
  const baseScreen = K.pick(SCREENS, r);
  const inkScreens = [];
  for (let i = 0; i < nInks; i++) inkScreens.push(mixScreens ? K.pick(SCREENS, r) : baseScreen);

  const baseAng = r() * 30;
  const inkAngs = [baseAng + 15, baseAng + 75, baseAng + 45];

  const driftBase = mode === 'Drift' ? S * (0.022 + r() * 0.02) : S * (0.004 + r() * 0.008);
  function offset() { const a = r() * 6.283; return [Math.cos(a) * driftBase, Math.sin(a) * driftBase]; }
  const inkOffs = []; for (let i = 0; i < nInks; i++) inkOffs.push(offset());

  function disc(mx, cx, cy, rad) { mx.beginPath(); mx.arc(cx, cy, rad, 0, 7); mx.fill(); }
  function ring(mx, cx, cy, rad, th) { mx.save(); mx.lineWidth = th; mx.strokeStyle = '#fff'; mx.beginPath(); mx.arc(cx, cy, rad, 0, 7); mx.stroke(); mx.restore(); }
  function bar(mx, bx, by, bw, bh, rot) { mx.save(); mx.translate(bx, by); mx.rotate(rot || 0); mx.fillRect(-bw / 2, -bh / 2, bw, bh); mx.restore(); }
  function arc(mx, cx, cy, rad, th, a0, a1) { mx.save(); mx.lineWidth = th; mx.strokeStyle = '#fff'; mx.lineCap = 'butt'; mx.beginPath(); mx.arc(cx, cy, rad, a0, a1); mx.stroke(); mx.restore(); }
  function blob(mx, cx, cy, rad, wob) {
    mx.beginPath(); const N = 26;
    for (let i = 0; i <= N; i++) {
      const t = i / N * 6.283;
      const rr = rad * (1 + wob * (noise.noise2(Math.cos(t) * 1.3 + cx * 0.001, Math.sin(t) * 1.3 + cy * 0.001)));
      const px = cx + Math.cos(t) * rr, py = cy + Math.sin(t) * rr;
      i === 0 ? mx.moveTo(px, py) : mx.lineTo(px, py);
    }
    mx.closePath(); mx.fill();
  }
  function glyph(mx, ch, gx, gy, size, rot) {
    mx.save(); mx.translate(gx, gy); mx.rotate(rot || 0);
    mx.font = '900 ' + size + 'px Georgia, "Times New Roman", serif';
    mx.textAlign = 'center'; mx.textBaseline = 'middle';
    mx.fillText(ch, 0, size * 0.04);
    mx.restore();
  }
  function gradientField(mx, dir) {
    const g = mx.createLinearGradient(
      dir === 0 ? 0 : (dir === 1 ? W : 0), dir === 2 ? 0 : 0,
      dir === 0 ? W : (dir === 1 ? 0 : 0), dir === 2 ? H : H);
    g.addColorStop(0, '#fff'); g.addColorStop(1, '#000');
    mx.fillStyle = g; mx.fillRect(0, 0, W, H); mx.fillStyle = '#fff';
  }

  function makeSkips(strong) {
    const arr = []; const n = strong ? K.rint(r, 4, 7) : K.rint(r, 0, 2);
    for (let i = 0; i < n; i++) {
      const horiz = r() < 0.6;
      arr.push(horiz
        ? { x: 0, y: r() * H, w: W, h: 2 + r() * (strong ? 26 : 8), a: 0.12 + r() * (strong ? 0.5 : 0.22) }
        : { x: r() * W, y: 0, w: 2 + r() * (strong ? 22 : 6), h: H, a: 0.1 + r() * (strong ? 0.4 : 0.18) });
    }
    return arr;
  }

  const cxC = W * (0.5 + (r() - 0.5) * 0.16), cyC = H * (0.5 + (r() - 0.5) * 0.16);
  let paints = [];

  if (mode === 'Overprint') {
    const rad = S * (0.27 + r() * 0.06);
    const sep = S * (0.18 + r() * 0.1);
    const pos = [];
    for (let i = 0; i < nInks; i++) {
      const a = (i / nInks) * 6.283 + r() * 0.4;
      pos.push([cxC + Math.cos(a) * sep * 0.55, cyC + Math.sin(a) * sep * 0.55, r() < 0.5]);
    }
    for (let i = 0; i < nInks; i++) {
      const [px, py, isDisc] = pos[i];
      paints.push((mx) => { isDisc ? disc(mx, px, py, rad) : blob(mx, px, py, rad, 0.16); });
    }
  } else if (mode === 'Drift') {
    const rad = S * (0.3 + r() * 0.05);
    const kind = K.rint(r, 0, 2);
    const paint = (mx) => {
      if (kind === 0) disc(mx, cxC, cyC, rad);
      else if (kind === 1) { ring(mx, cxC, cyC, rad, S * 0.1); }
      else blob(mx, cxC, cyC, rad, 0.2);
    };
    const brot = (r() - 0.5) * 1.2, by = H * (0.18 + r() * 0.04);
    for (let i = 0; i < nInks; i++) paints.push((mx) => { paint(mx); bar(mx, W * 0.5, by + i * S * 0.005, W * 0.86, S * 0.045, brot); });
  } else if (mode === 'Halftone') {
    const dir = K.rint(r, 0, 2);
    paints.push((mx) => gradientField(mx, dir));
    const rad = S * (0.2 + r() * 0.06);
    const useRing = r() < 0.5;
    paints.push((mx) => { useRing ? ring(mx, cxC, cyC, rad, S * 0.07) : disc(mx, cxC, cyC, rad); });
    if (nInks > 2) { const rad2 = S * (0.1 + r() * 0.05); const ox = (r() - 0.5) * S * 0.4; paints.push((mx) => disc(mx, cxC + ox, cyC - S * 0.18, rad2)); }
  } else if (mode === 'Cutout') {
    const holes = [];
    const nh = K.rint(r, 2, 4);
    for (let i = 0; i < nh; i++) holes.push({ x: W * (0.2 + r() * 0.6), y: H * (0.2 + r() * 0.6), r: S * (0.08 + r() * 0.14), b: r() < 0.5 });
    paints.push((mx) => {
      const m = S * (0.06 + r() * 0.03);
      mx.fillRect(m, m, W - 2 * m, H - 2 * m);
      mx.save(); mx.globalCompositeOperation = 'destination-out';
      for (const h of holes) { mx.beginPath(); mx.arc(h.x, h.y, h.r, 0, 7); mx.fill(); }
      mx.restore();
    });
    paints.push((mx) => { for (const h of holes) if (h.b) disc(mx, h.x, h.y, h.r * 0.62); });
    if (nInks > 2) paints.push((mx) => { for (const h of holes) if (!h.b) ring(mx, h.x, h.y, h.r * 0.5, S * 0.02); });
  } else if (mode === 'Poster') {
    const ch = K.pick(GLYPHS, r);
    const size = S * (1.05 + r() * 0.35);
    const gx = W * (0.32 + r() * 0.36), gy = H * (0.46 + r() * 0.2);
    const grot = (r() - 0.5) * 0.5;
    paints.push((mx) => glyph(mx, ch, gx, gy, size, grot));
    const rad = S * (0.16 + r() * 0.05);
    const hx = W * (0.2 + r() * 0.6), hy = H * (0.2 + r() * 0.18);
    const heroArc = r() < 0.5;
    paints.push((mx) => { heroArc ? arc(mx, hx, hy + S * 0.3, rad * 1.7, S * 0.06, Math.PI * 1.05, Math.PI * 1.95) : disc(mx, hx, hy, rad); });
    if (nInks > 2) { const ch2 = K.pick(GLYPHS, r); paints.push((mx) => glyph(mx, ch2, W * (0.2 + r() * 0.6), H * (0.7 + r() * 0.18), size * 0.4, (r() - 0.5) * 0.6)); }
  } else if (mode === 'Streak') {
    paints.push((mx) => { bar(mx, W * 0.5, H * (0.4 + r() * 0.2), W * 0.9, S * (0.08 + r() * 0.05), (r() - 0.5) * 0.3); });
    const useArc = r() < 0.6;
    const rad = S * (0.22 + r() * 0.06);
    paints.push((mx) => { useArc ? arc(mx, cxC, cyC, rad, S * 0.05, 0, Math.PI * (1 + r())) : disc(mx, cxC, cyC, rad * 0.7); });
    if (nInks > 2) paints.push((mx) => bar(mx, W * 0.5, H * (0.65 + r() * 0.15), W * 0.7, S * 0.05, (r() - 0.5) * 0.3));
  } else if (mode === 'Concentric') {
    const rings = K.rint(r, 5, 9);
    const big = S * (0.42 + r() * 0.08);
    const th = big / rings * (0.5 + r() * 0.3);
    for (let i = 0; i < nInks; i++) {
      paints.push((mx) => {
        for (let k = i; k < rings; k += nInks) ring(mx, cxC, cyC, big * (1 - k / rings) + th, th);
      });
    }
  } else if (mode === 'Columns') {
    const horiz = r() < 0.4;
    const n = K.rint(r, 4, 8);
    const span = (horiz ? H : W) * 0.92;
    const start = (horiz ? H : W) * 0.04;
    const bw = span / n * (0.5 + r() * 0.25);
    for (let i = 0; i < nInks; i++) {
      const phase = i * (0.18 + r() * 0.1);
      paints.push((mx) => {
        for (let k = 0; k < n; k++) {
          const c = start + span * ((k + 0.5) / n);
          const len = (horiz ? W : H) * (0.5 + r() * 0.4);
          const o = (horiz ? W : H) * 0.5 + Math.sin(k * 1.3 + phase) * (horiz ? W : H) * 0.12;
          if (horiz) mx.fillRect(o - len / 2, c - bw / 2, len, bw);
          else mx.fillRect(c - bw / 2, o - len / 2, bw, len);
        }
      });
    }
  } else if (mode === 'Grid') {
    const cols = K.rint(r, 3, 5), rows = K.rint(r, 3, 5);
    const mg = S * 0.1;
    const cw = (W - mg * 2) / cols, ch = (H - mg * 2) / rows;
    const mark = K.rint(r, 0, 2);
    for (let i = 0; i < nInks; i++) {
      const jx = (i - (nInks - 1) / 2) * cw * 0.12, jy = (i - (nInks - 1) / 2) * ch * 0.12;
      paints.push((mx) => {
        for (let gy = 0; gy < rows; gy++) for (let gx = 0; gx < cols; gx++) {
          const px = mg + cw * (gx + 0.5) + jx, py = mg + ch * (gy + 0.5) + jy;
          const rr = Math.min(cw, ch) * 0.32;
          if (mark === 0) disc(mx, px, py, rr);
          else if (mark === 1) ring(mx, px, py, rr, rr * 0.4);
          else bar(mx, px, py, rr * 1.6, rr * 0.7, (gx + gy) * 0.3);
        }
      });
    }
  } else { // Diagonal
    const n = K.rint(r, 5, 9);
    const slope = (r() - 0.5) * 1.2 + (r() < 0.5 ? 0.7 : -0.7);
    const bw = S * (0.04 + r() * 0.05);
    const span = Math.hypot(W, H);
    for (let i = 0; i < nInks; i++) {
      const sl = slope + (i - (nInks - 1) / 2) * 0.18;
      const ph = i * bw * 0.6;
      paints.push((mx) => {
        mx.save(); mx.translate(W / 2, H / 2); mx.rotate(Math.atan(sl));
        for (let k = -n; k <= n; k++) {
          const o = (k * (span / n)) + ph;
          mx.fillRect(-span, o - bw / 2, span * 2, bw);
        }
        mx.restore();
      });
    }
  }

  while (paints.length < nInks) paints.push((mx) => {});

  x.save();
  x.globalCompositeOperation = 'multiply';
  for (let i = 0; i < nInks; i++) {
    const strongStreak = mode === 'Streak' && (i === 0 || r() < 0.5);
    const skips = makeSkips(strongStreak);
    const layer = makeInkLayer(W, H, pal.inks[i].hex, inkAngs[i % 3], cell, inkOffs[i][0], inkOffs[i][1], paints[i], skips, inkScreens[i]);
    x.globalAlpha = 0.94;
    x.drawImage(layer, 0, 0);
  }
  x.restore();

  K.mottle(x, 0, 0, W, H, pal.inks[0].hex, 60, r, 'multiply');
  K.mottle(x, 0, 0, W, H, K.mix(pal.paper, '#000', 0.3), 90, r, 'multiply');
  K.grain(x, W, H, 3.4, r);

  x.save(); x.globalCompositeOperation = 'multiply';
  const flecks = (W * H) / 9000;
  for (let i = 0; i < flecks; i++) { x.fillStyle = K.rgba('#3a3024', 0.05 + r() * 0.08); x.fillRect(r() * W, r() * H, 1, 1 + (r() < 0.2 ? 1 : 0)); }
  x.restore();

  K.vignette(x, W, H, 0.16);
}

export const offRegisterTraits: TraitsFn = (id) => {
  const r = K.rng(id);
  const pal = K.pick(PALS, r);
  const mode = K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
  r(); // cell
  const mixScreens = r() < 0.45;
  const baseScreen = K.pick(SCREENS, r);
  for (let i = 0; i < pal.inks.length; i++) (mixScreens ? K.pick(SCREENS, r) : baseScreen);
  const screen = mixScreens ? 'Mixed' : baseScreen;
  return {
    Palette: pal.name,
    Mode: mode,
    Format: f,
    Screen: screen,
    Inks: pal.inks.map((i) => i.name).join(' + '),
  };
};

export const offRegisterSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Mode',    values: MODES },
    { name: 'Format',  values: ['Portrait', 'Square', 'Landscape'] },
    { name: 'Screen',  values: ['Dot', 'Line', 'Grain', 'Solid', 'Mixed'] },
    { name: 'Inks',    values: PALS.map((p) => p.inks.map((i) => i.name).join(' + ')) },
  ],
};

export const renderOffRegister: EngineFn = blit((off, id) => { draw(off, id); }, offRegisterTraits);

// W/H of Portrait, Square, Landscape (matches FORMATS order).
export const OFFREGISTER_ASPECTS = [1040 / 1300, 1, 1300 / 1040] as const;
