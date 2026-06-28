// @ts-nocheck
/*
 * MONSOON — by @opus4-8. The platform HALO project.
 *
 * A dense neon hill-town in a tropical monsoon downpour at night. Stacked
 * buildings climb a slope; every wet surface mirrors sign-light; rain falls as
 * diagonal streaks; steam rises off rooftops; umbrellas are scattered light-dots
 * in the streets. Surreal (real-but-off): in one band the rain falls UPWARD, or
 * the wet-street reflection shows a shifted / recoloured city, a block floats,
 * a single sign dwarfs the town, two moons hang. Semi-abstract — legible as a
 * rain-soaked city at a glance, dissolving into neon texture up close.
 *
 * PALETTE family — HOT WET NEON: hot-magenta / jade / cyan signs over a
 * monsoon-dark teal ground. Six colorways shift the storm's dominant hue. The
 * signature colour is hot magenta (#ff2d9b).
 *
 * Depth: BG = hazy distant hill of dim window-grids, MID = dense climbing
 * stacked blocks with bright signs, FG = wet street + reflection pool +
 * umbrellas. Reflection = downward-streaked, broken, jittered neon smears.
 *
 * Chosen as the halo via a 12-direction jury bake-off (NHL-style bracket) — it
 * won every round. Deterministic from tokenId only; all trait-determining
 * randomness is drawn in params() in a fixed order so traits() and draw() agree.
 */
import { rng, pick, rint, clamp, mix, rgba, h2r, grain, vignette, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

/* ── extra helpers (haze / bloom / fog / shadow) not in the shared kit ─────── */
function makeNoise(seed) {
  const r = rng(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = p[i]; p[i] = p[j]; p[j] = t; }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  function fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function grad(h, x, y) { const u = (h & 1) ? x : -x, v = (h & 2) ? y : -y; return u + v; }
  function noise2(x, y) {
    const X = Math.floor(x) & 255, Y = Math.floor(y) & 255;
    x -= Math.floor(x); y -= Math.floor(y);
    const u = fade(x), v = fade(y);
    const aa = perm[perm[X] + Y], ab = perm[perm[X] + Y + 1], ba = perm[perm[X + 1] + Y], bb = perm[perm[X + 1] + Y + 1];
    return lerp(lerp(grad(aa, x, y), grad(ba, x - 1, y), u), lerp(grad(ab, x, y - 1), grad(bb, x - 1, y - 1), u), v);
  }
  function fbm(x, y, oct, gain, lac) { oct = oct || 4; gain = gain || 0.5; lac = lac || 2; let a = 0, f = 1, amp = 0.5, n = 0; for (let i = 0; i < oct; i++) { a += amp * noise2(x * f, y * f); n += amp; amp *= gain; f *= lac; } return a / n; }
  return { noise2, fbm };
}
function bloom(x, cx, cy, rad, col, a0) { x.save(); x.globalCompositeOperation = 'lighter'; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, rgba(col, a0)); g.addColorStop(1, rgba(col, 0)); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore(); }
function softShadow(x, cx, cy, rad, a) { x.save(); x.globalCompositeOperation = 'multiply'; const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, 'rgba(0,0,0,' + a + ')'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2); x.restore(); }
function hazeSheet(x, W, H, noise, col, opacity, scale, blend) {
  x.save(); x.globalCompositeOperation = blend || 'screen';
  const step = Math.max(3, Math.floor(Math.min(W, H) / 180));
  const c = h2r(col);
  for (let yy = 0; yy < H; yy += step) {
    for (let xx = 0; xx < W; xx += step) {
      const n = (noise.fbm(xx / scale, yy / scale, 5, 0.55, 2.1) + 1) / 2;
      const a = clamp(n * n * opacity, 0, 1);
      if (a < 0.01) continue;
      x.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
      x.fillRect(xx, yy, step + 1, step + 1);
    }
  }
  x.restore();
}

/* ── colorways — all HOT WET NEON; vary the storm's dominant sign hue ─────── */
const PALS = [
  { name: 'Hot Wet',     sky: '#06202a', ground: '#04161e', deep: '#03252e', mag: '#ff2d9b', jade: '#18d08a', cyan: '#3df0ff', pink: '#ff4fa3', warm: '#ffd23d' },
  { name: 'Jade Storm',  sky: '#04201f', ground: '#03161a', deep: '#053026', mag: '#ff2d9b', jade: '#22e89a', cyan: '#2ff0d6', pink: '#ff5db0', warm: '#ffe06a' },
  { name: 'Magenta Rain',sky: '#1a0a28', ground: '#0f0518', deep: '#26103a', mag: '#ff2db8', jade: '#18d08a', cyan: '#6a5dff', pink: '#ff4fc7', warm: '#ffce4d' },
  { name: 'Deep Teal',   sky: '#031820', ground: '#020e14', deep: '#03222c', mag: '#ff3da0', jade: '#15c894', cyan: '#1fe0ff', pink: '#ff5da8', warm: '#ffcf3d' },
  { name: 'Acid Monsoon',sky: '#0a1c10', ground: '#05120a', deep: '#0c2a16', mag: '#ff2d9b', jade: '#7dff4f', cyan: '#3df0ff', pink: '#ff5da8', warm: '#e6ff5d' },
  { name: 'Bruise',      sky: '#120626', ground: '#0a0418', deep: '#1c0a3a', mag: '#ff2d9b', jade: '#18d0b0', cyan: '#4f8dff', pink: '#ff4fa3', warm: '#ffb84d' },
];
const FMTS = [{ W: 1080, H: 1480, t: 'Slope' }, { W: 1240, H: 1240, t: 'Square' }, { W: 1240, H: 1100, t: 'Wide Hill' }];
const RAINS = ['Downpour', 'Drizzle', 'Squall', 'Upward Band'];
const SLOPES = ['Left Climb', 'Right Climb', 'Twin Ridge'];
const ANOMALIES = ['Mirror City', 'Floating Block', 'Giant Sign', 'Doubled Moon'];

function params(r) {
  return {
    pal: pick(PALS, r),
    fmt: pick(FMTS, r),
    rain: pick(RAINS, r),
    slope: pick(SLOPES, r),
    density: rint(r, 5, 7),
    surreal: pick(ANOMALIES, r),
  };
}

export const monsoonTraits: TraitsFn = (tokenId) => {
  const p = params(rng(tokenId));
  return { Palette: p.pal.name, Format: p.fmt.t, Rain: p.rain, Slope: p.slope, Anomaly: p.surreal };
};

export const monsoonSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Format', values: FMTS.map((f) => f.t) },
    { name: 'Rain', values: RAINS },
    { name: 'Slope', values: SLOPES },
    { name: 'Anomaly', values: ANOMALIES },
  ],
};

/* aspect-ratio palette (w/h) for the empty-state ghost grid */
export const MONSOON_ASPECTS: readonly number[] = [1080 / 1480, 1, 1240 / 1100];

/* A stacked building block climbing the hill. Returns its sign-glow seeds so the
   reflection pass can mirror them. */
function block(x, P, bx, by, bw, bh, depth, r, signSink) {
  const body = mix(P.ground, P.sky, 0.25 + (1 - depth) * 0.45);
  x.fillStyle = body;
  x.fillRect(bx, by - bh, bw, bh);
  x.save(); x.globalCompositeOperation = 'lighter';
  const rimc = r() < 0.5 ? P.cyan : P.mag;
  x.strokeStyle = rgba(rimc, (0.06 + depth * 0.22));
  x.lineWidth = 1;
  x.strokeRect(bx + 0.5, by - bh + 0.5, bw, bh);
  x.restore();

  const cw = Math.max(3, bw / rint(r, 4, 8));
  const ch = Math.max(4, cw * (0.9 + r() * 0.7));
  const onP = 0.12 + depth * 0.38;
  for (let yy = by - bh + ch; yy < by - 2; yy += ch + 1) {
    for (let xx = bx + 2; xx < bx + bw - cw; xx += cw + 1) {
      if (r() > onP) continue;
      const lit = r() < 0.4 ? P.warm : (r() < 0.5 ? P.cyan : P.jade);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba(lit, (0.22 + depth * 0.5) * (0.5 + r() * 0.5));
      x.fillRect(xx, yy, cw * 0.7, ch * 0.55);
      x.restore();
    }
  }

  if (depth > 0.35 && r() < 0.85) {
    const ns = rint(r, 1, 2);
    for (let s = 0; s < ns; s++) {
      const sx = bx + bw * (0.1 + r() * 0.7);
      const sh = bh * (0.25 + r() * 0.5);
      const sy = by - bh + bh * (0.1 + r() * 0.3);
      const col = r() < 0.45 ? P.mag : (r() < 0.5 ? P.cyan : (r() < 0.6 ? P.jade : P.pink));
      const sw = Math.max(2, bw * (0.04 + r() * 0.05));
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba(col, 0.55 + depth * 0.35);
      x.fillRect(sx, sy, sw, sh);
      for (let gy = sy + 3; gy < sy + sh - 3; gy += 5 + r() * 5) {
        if (r() < 0.6) { x.fillStyle = rgba(r() < 0.5 ? '#ffffff' : col, 0.8); x.fillRect(sx - 1, gy, sw + 2, 1.6); }
      }
      x.restore();
      bloom(x, sx + sw / 2, sy + sh / 2, Math.max(sw, sh) * (0.7 + depth * 0.6), col, 0.28 + depth * 0.22);
      signSink.push({ x: sx + sw / 2, y: sy + sh / 2, rad: Math.max(sw, sh) * (0.8 + depth * 0.5), col, a: 0.3 + depth * 0.2 });
    }
  }
  if (depth > 0.5 && r() < 0.3) {
    const sw = bw * (0.5 + r() * 0.4), sh = bh * (0.08 + r() * 0.07);
    const sx = bx + bw * 0.1, sy = by - bh * (0.3 + r() * 0.4);
    const col = r() < 0.5 ? P.pink : P.cyan;
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = rgba(col, 0.18); x.fillRect(sx, sy, sw, sh);
    x.strokeStyle = rgba(col, 0.6); x.lineWidth = 1.2; x.strokeRect(sx, sy, sw, sh);
    x.restore();
    bloom(x, sx + sw / 2, sy + sh / 2, Math.max(sw, sh) * 0.8, col, 0.3);
    signSink.push({ x: sx + sw / 2, y: sy + sh / 2, rad: Math.max(sw, sh) * 0.8, col, a: 0.3 });
  }
}

function rain(x, P, W, H, r, mode, intensity) {
  x.save(); x.globalCompositeOperation = 'lighter';
  const ang = (-0.32 - r() * 0.12);
  const dx = Math.sin(ang), dy = Math.cos(ang);
  const n = Math.floor(W * H / (mode === 'Drizzle' ? 900 : mode === 'Squall' ? 320 : 500)) * intensity;
  const bandY0 = H * (0.2 + r() * 0.3), bandY1 = bandY0 + H * (0.18 + r() * 0.12);
  if (mode === 'Upward Band') {
    const bg = x.createLinearGradient(0, bandY0, 0, bandY1);
    bg.addColorStop(0, rgba(P.cyan, 0));
    bg.addColorStop(0.5, rgba(P.cyan, 0.13));
    bg.addColorStop(1, rgba(P.cyan, 0));
    x.fillStyle = bg; x.fillRect(0, bandY0, W, bandY1 - bandY0);
    x.strokeStyle = rgba(mix(P.cyan, '#fff', 0.3), 0.22); x.lineWidth = 1.4;
    x.beginPath(); x.moveTo(0, bandY0); x.lineTo(W, bandY0); x.stroke();
    x.beginPath(); x.moveTo(0, bandY1); x.lineTo(W, bandY1); x.stroke();
  }
  for (let i = 0; i < n; i++) {
    const sx = r() * W * 1.2 - W * 0.1;
    const sy = r() * H;
    const len = 14 + r() * (mode === 'Squall' ? 60 : 38);
    let ddx = dx, ddy = dy;
    if (mode === 'Upward Band' && sy > bandY0 && sy < bandY1) { ddy = -dy; ddx = -dx; }
    const col = r() < 0.2 ? P.cyan : (r() < 0.32 ? P.mag : '#dff2ff');
    x.strokeStyle = rgba(col, 0.06 + r() * 0.14);
    x.lineWidth = 0.6 + r() * 1.0;
    x.beginPath();
    x.moveTo(sx, sy);
    x.lineTo(sx + ddx * len, sy + ddy * len);
    x.stroke();
  }
  x.restore();
}

/* raw painter — sets its own native size; blit() blits to the requested width */
function raw(cv, tokenId) {
  const r = rng(tokenId), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const noise = makeNoise(tokenId);

  const water = H * (0.60 + r() * 0.12);

  const g = x.createLinearGradient(0, 0, 0, water);
  g.addColorStop(0, mix(P.sky, '#000', 0.35));
  g.addColorStop(0.55, P.sky);
  g.addColorStop(1, mix(P.sky, P.deep, 0.6));
  x.fillStyle = g; x.fillRect(0, 0, W, water);
  x.fillStyle = mix(P.ground, '#000', 0.2); x.fillRect(0, water, W, H - water);

  hazeSheet(x, W, water, noise, mix(P.sky, P.mag, 0.18), 0.4, 130, 'screen');
  const glowX = p.slope === 'Right Climb' ? W * 0.7 : p.slope === 'Left Climb' ? W * 0.3 : W * 0.5;
  bloom(x, glowX, water * 0.78, W * 0.55, mix(P.mag, P.jade, 0.4), 0.16);

  if (p.surreal === 'Doubled Moon') {
    const my = H * (0.16 + r() * 0.1);
    for (let m = 0; m < 2; m++) {
      const mx = W * (0.3 + m * 0.34) + (r() - 0.5) * 40;
      bloom(x, mx, my, 70 + m * 20, mix(P.warm, P.cyan, m * 0.5), 0.5);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba(mix(P.warm, '#fff', 0.4), 0.5);
      x.beginPath(); x.arc(mx, my, 24 - m * 6, 0, 7); x.fill(); x.restore();
    }
  }

  const signSink = [];

  const slopeDir = p.slope === 'Right Climb' ? 1 : p.slope === 'Left Climb' ? -1 : 0;
  function hillY(t) {
    if (p.slope === 'Twin Ridge') return water - Math.sin(t * Math.PI) * H * 0.18 - H * 0.02;
    const climb = slopeDir > 0 ? t : (1 - t);
    return water - climb * H * 0.30 - H * 0.02;
  }

  {
    let bx = -W * 0.04;
    while (bx < W * 1.02) {
      const t = clamp(bx / W, 0, 1);
      const baseY = hillY(t) - H * 0.06 - r() * H * 0.04;
      const bw = W * (0.03 + r() * 0.05);
      const bh = H * (0.06 + r() * 0.12);
      block(x, P, bx, baseY, bw, bh, 0.18 + r() * 0.12, r, signSink);
      bx += bw * (0.9 + r() * 0.4);
    }
    hazeSheet(x, W, water, noise, mix(P.sky, P.deep, 0.5), 0.5, 160, 'screen');
  }

  const ROWS = 3;
  for (let row = 0; row < ROWS; row++) {
    const depth = 0.45 + (row / (ROWS - 1)) * 0.5;
    const yOff = -H * (0.10 - row * 0.05);
    let bx = -W * 0.06;
    while (bx < W * 1.04) {
      const t = clamp(bx / W, 0, 1);
      const baseY = hillY(t) + yOff + row * H * 0.03;
      const bw = W * (0.05 + r() * 0.08) * (0.7 + depth * 0.6);
      const bh = H * (0.14 + r() * 0.24) * (0.7 + depth * 0.55);
      block(x, P, bx, baseY, bw, bh, depth, r, signSink);
      bx += bw * (0.82 + r() * 0.35);
    }
    if (row < ROWS - 1) hazeSheet(x, W, water, noise, mix(P.sky, P.mag, 0.12), 0.22, 110 + row * 30, 'screen');
  }

  if (p.surreal === 'Giant Sign') {
    const gx = W * (0.15 + r() * 0.55), gy = H * (0.08 + r() * 0.12);
    const gw = W * (0.05 + r() * 0.04), gh = (water - gy) * (0.55 + r() * 0.25);
    const col = r() < 0.5 ? P.mag : P.cyan;
    x.save(); x.globalCompositeOperation = 'lighter';
    x.fillStyle = rgba(col, 0.42); x.fillRect(gx, gy, gw, gh);
    for (let gyy = gy + 6; gyy < gy + gh; gyy += 12 + r() * 8) { x.fillStyle = rgba('#fff', 0.7); x.fillRect(gx - 2, gyy, gw + 4, 2.5); }
    x.restore();
    bloom(x, gx + gw / 2, gy + gh / 2, gh * 0.6, col, 0.35);
    signSink.push({ x: gx + gw / 2, y: gy + gh / 2, rad: gh * 0.45, col, a: 0.42 });
  }
  if (p.surreal === 'Floating Block') {
    const fx = W * (0.3 + r() * 0.4), fy = H * (0.2 + r() * 0.15);
    const fw = W * 0.12, fh = H * 0.1;
    block(x, P, fx, fy + fh, fw, fh, 0.85, r, signSink);
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(P.cyan, 0.2); x.lineWidth = 1;
    for (let c = 0; c < 5; c++) { x.beginPath(); x.moveTo(fx + r() * fw, fy + fh); x.lineTo(fx + r() * fw, fy + fh + H * 0.12); x.stroke(); }
    x.restore();
  }

  {
    const shift = p.surreal === 'Mirror City' ? (r() < 0.5 ? -1 : 1) * W * (0.18 + r() * 0.20) : 0;
    const wetH = H - water;
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (const s of signSink) {
      const into = clamp((water - s.y) / water, 0, 1);
      const fade = 0.5 + into * 0.5;
      let col = s.col;
      if (p.surreal === 'Mirror City' && r() < 0.7) col = mix(s.col, P.jade, 0.6);
      const colW = clamp(s.rad * 0.16, 3, 26);
      const colH = clamp(wetH * (0.4 + into * 0.55), 40, wetH * 1.1);
      const top = water + 2;
      const grd = x.createLinearGradient(0, top, 0, top + colH);
      grd.addColorStop(0, rgba(col, s.a * fade * 0.42));
      grd.addColorStop(0.35, rgba(col, s.a * fade * 0.20));
      grd.addColorStop(1, rgba(col, 0));
      for (let w = 0; w < 3; w++) {
        const ww = colW * (1 + w * 1.6);
        x.globalAlpha = w === 0 ? 0.85 : (0.34 - w * 0.1);
        x.fillStyle = grd;
        x.fillRect(s.x + shift - ww, top, ww * 2, colH);
      }
      x.globalAlpha = 1;
      bloom(x, s.x + shift, top + 4, colW * 1.6, col, s.a * fade * 0.32);
    }
    x.restore();

    x.save(); x.globalCompositeOperation = 'multiply';
    for (let ry = water; ry < H; ry += 3 + r() * 5) {
      const a = 0.08 + r() * 0.16;
      x.fillStyle = 'rgba(0,0,0,' + a + ')';
      x.fillRect(0, ry, W, 0.8 + r() * 1.6);
    }
    x.restore();
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < rint(r, 30, 60); i++) {
      const ry = water + r() * wetH;
      const rx = r() * W;
      x.fillStyle = rgba(r() < 0.5 ? P.cyan : P.mag, 0.05 + r() * 0.12);
      x.fillRect(rx, ry, 4 + r() * 30, 0.8);
    }
    x.restore();
  }

  {
    const wg = x.createLinearGradient(0, water, 0, H);
    wg.addColorStop(0, rgba(mix(P.deep, P.mag, 0.22), 0.4));
    wg.addColorStop(0.6, rgba(mix(P.ground, P.cyan, 0.1), 0.12));
    wg.addColorStop(1, rgba(P.ground, 0.0));
    x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = wg; x.fillRect(0, water, W, H - water); x.restore();
  }
  {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const mg = x.createLinearGradient(0, water - H * 0.04, 0, water + H * 0.02);
    mg.addColorStop(0, rgba(mix(P.mag, P.cyan, 0.5), 0));
    mg.addColorStop(0.7, rgba(mix(P.mag, P.cyan, 0.5), 0.10));
    mg.addColorStop(1, rgba(mix(P.mag, P.cyan, 0.5), 0));
    x.fillStyle = mg; x.fillRect(0, water - H * 0.04, W, H * 0.06);
    x.restore();
  }

  {
    const um = rint(r, 12, 22);
    for (let i = 0; i < um; i++) {
      const uy = water + (r() * r()) * (H - water) * 0.9 + 6;
      const persp = (uy - water) / (H - water);
      const ux = r() * W;
      const sz = 5 + persp * 22;
      const col = r() < 0.3 ? P.warm : (r() < 0.5 ? P.mag : (r() < 0.65 ? P.cyan : P.jade));
      softShadow(x, ux, uy + sz * 0.3, sz * 2.2, 0.4);
      x.fillStyle = rgba('#05080a', 0.92);
      x.beginPath(); x.arc(ux, uy, sz, Math.PI, 0); x.fill();
      x.fillRect(ux - sz, uy, sz * 2, 1.5);
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba('#ffffff', 0.7); x.beginPath(); x.arc(ux, uy + sz * 0.35, sz * 0.14, 0, 7); x.fill();
      x.fillStyle = rgba(col, 0.9); x.beginPath(); x.arc(ux, uy + sz * 0.35, sz * 0.3, 0, 7); x.fill();
      x.restore();
      bloom(x, ux, uy + sz * 0.35, sz * 1.9, col, 0.55);
      bloom(x, ux, uy + sz * 1.4, sz * 1.5, col, 0.22);
    }
  }

  {
    x.save(); x.globalCompositeOperation = 'screen';
    const steamCol = mix(P.jade, P.deep, 0.4);
    for (let s = 0; s < rint(r, 4, 7); s++) {
      const sx = r() * W, sy = water - H * (0.05 + r() * 0.3);
      const sw = W * (0.1 + r() * 0.15), sh = H * (0.08 + r() * 0.12);
      const grd = x.createRadialGradient(sx, sy, 0, sx, sy, Math.max(sw, sh));
      const n = (noise.fbm(sx / 120, sy / 120, 4) + 1) / 2;
      grd.addColorStop(0, rgba(steamCol, 0.12 + n * 0.1));
      grd.addColorStop(1, rgba(steamCol, 0));
      x.fillStyle = grd; x.fillRect(sx - sw, sy - sh, sw * 2, sh * 2);
    }
    x.restore();
  }

  rain(x, P, W, H, r, p.rain, 1);

  {
    x.save(); x.globalCompositeOperation = 'lighter';
    const ang = -0.34;
    const dx = Math.sin(ang), dy = Math.cos(ang);
    const n = Math.floor(W / 6);
    for (let i = 0; i < n; i++) {
      const sx = r() * W * 1.2 - W * 0.1, sy = r() * H;
      const len = 40 + r() * 90;
      x.strokeStyle = rgba('#dff4ff', 0.05 + r() * 0.1);
      x.lineWidth = 1 + r() * 1.4;
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + dx * len, sy + dy * len); x.stroke();
    }
    x.restore();
  }

  hazeSheet(x, W, H, noise, mix(P.sky, P.mag, 0.2), 0.12, 240, 'screen');
  bloom(x, glowX, water * 0.7, W * 0.4, P.mag, 0.06);
  grain(x, W, H, 480, r);
  vignette(x, W, H, 0.5);
}

export const renderMonsoon: EngineFn = blit(raw, monsoonTraits);
