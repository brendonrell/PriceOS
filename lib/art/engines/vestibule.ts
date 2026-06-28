// @ts-nocheck
/* VESTIBULE — metaphysical plaza (de Chirico, made strange).
 * Empty sunlit squares: receding arcades, a lone monument, raking low-sun
 * shadows that fall the wrong way, a too-distant tower, a tiny solitary figure.
 * SURREAL = real-but-off: correct architecture, impossible stillness & light.
 * Hazy, textured, muted Mediterranean palettes — nothing neon, nothing abstract.
 *
 * Straight production port of the R&D engine tools/halo/s01_vestibule.js.
 * Art unchanged; window.KIT/window.ENGINE/window.FORCE_PAL removed; palette by
 * rng only. Deterministic in tokenId.
 */
import * as Kit from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const K = Kit;

/* Six bespoke palettes — all terracotta/ochre/teal-shadow/cream family, but
   each a different hour/weather so the SET is varied, not one look reskinned. */
const PALS = [
  { name: 'Siena Dusk',   sky: ['#e8b27a', '#d98a5c', '#7c4b54'], ground: '#caa074', wall: '#d98e63', shade: '#3c2f43', shadow: 'rgba(40,28,46,0.40)', ink: '#2b2030', sun: '#ffe6b0' },
  { name: 'Ochre Noon',   sky: ['#cfe0dd', '#bcd0cf', '#9fb6b8'], ground: '#d8c596', wall: '#e6d2a4', shade: '#5c5340', shadow: 'rgba(70,60,42,0.34)', ink: '#3a3526', sun: '#fff4d2' },
  { name: 'Cobalt Hour',  sky: ['#3a4f74', '#5d6f93', '#9fa6b6'], ground: '#8b7f86', wall: '#a98f7e', shade: '#1c2236', shadow: 'rgba(18,22,42,0.50)', ink: '#12182a', sun: '#ffd9a0' },
  { name: 'Bone Sirocco', sky: ['#e7ddca', '#d8c8ad', '#b39c84'], ground: '#cdb89a', wall: '#ddc7a6', shade: '#6e5b4c', shadow: 'rgba(90,72,56,0.30)', ink: '#4b3d31', sun: '#fbf0d6' },
  { name: 'Verdigris',    sky: ['#bcd3c4', '#9bbcaa', '#6f9486'], ground: '#b6a98a', wall: '#c2a886', shade: '#33453e', shadow: 'rgba(30,52,46,0.38)', ink: '#22332c', sun: '#ffe9bd' },
  { name: 'Night Plaza',  sky: ['#1b2440', '#2c3553', '#54607f'], ground: '#4a4452', wall: '#6b5a5a', shade: '#0d1224', shadow: 'rgba(6,9,22,0.55)', ink: '#0a0e1c', sun: '#cfe0ff' },
];

const MODES = ['Colonnade', 'Canyon', 'Monument', 'Far Tower', 'Bleached Square'];
const FORMATS = [[1000, 1250], [1180, 1180], [1300, 1000]]; // portrait / square / landscape

function draw(cv, seed) {
  const r = K.rng(seed);
  const noise = K.makeNoise(seed * 7 + 13);
  const pal = K.pick(PALS, r);
  const mode = MODES[seed % MODES.length] === undefined ? MODES[0] : K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const W = fmt[0], H = fmt[1];
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  // horizon line: high horizon = lots of ground (de Chirico)
  const hz = H * (0.40 + r() * 0.16);

  // ── SKY (vertical gouache gradient + soft sun + haze) ──
  const g = x.createLinearGradient(0, 0, 0, hz);
  g.addColorStop(0, pal.sky[0]); g.addColorStop(0.6, pal.sky[1]); g.addColorStop(1, pal.sky[2]);
  x.fillStyle = g; x.fillRect(0, 0, W, hz + 2);

  // low sun, off to one side; everything's shadow points away from it
  const sunSide = r() < 0.5 ? -1 : 1;
  const sunX = sunSide < 0 ? W * (0.12 + r() * 0.12) : W * (0.76 + r() * 0.12);
  const sunY = hz * (0.45 + r() * 0.3);
  K.bloom(x, sunX, sunY, Math.min(W, H) * (0.5 + r() * 0.25), pal.sun, 0.5);
  x.save(); x.globalCompositeOperation = 'lighter';
  x.fillStyle = K.rgba(pal.sun, 0.9);
  x.beginPath(); x.arc(sunX, sunY, Math.min(W, H) * (0.035 + r() * 0.03), 0, 7); x.fill();
  x.restore();

  // a single small high cloud or a too-large pale moon (off)
  if (r() < 0.5) {
    const mx = W * (0.2 + r() * 0.6), my = hz * (0.2 + r() * 0.25), mr = Math.min(W, H) * (0.05 + r() * 0.06);
    K.bloom(x, mx, my, mr * 3, '#ffffff', 0.18);
    x.fillStyle = K.rgba('#ffffff', 0.5); x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
  }

  // ── GROUND (warm flagstone plane, receding) ──
  x.fillStyle = pal.ground; x.fillRect(0, hz, W, H - hz);
  // perspective floor tiles to a vanishing point
  const vpx = W * (0.5 + (r() - 0.5) * 0.5), vpy = hz;
  x.save(); x.strokeStyle = K.rgba(pal.ink, 0.10); x.lineWidth = 1.4;
  for (let i = -8; i <= 8; i++) {
    const fx = W / 2 + i * (W / 7);
    x.beginPath(); x.moveTo(fx, H); x.lineTo(vpx, vpy); x.stroke();
  }
  for (let i = 1; i <= 11; i++) {
    const t = i / 12, yy = hz + (H - hz) * t * t;
    x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.globalAlpha = 0.5 * (1 - t) + 0.1; x.stroke();
  }
  x.restore();

  // helper: a solid block with a lit face + shaded face + cast shadow
  function block(bx, by, bw, bh, depth) {
    const dir = sunX < bx ? 1 : -1; // shadow falls away from sun
    // cast shadow (long, raking)
    const slen = bh * (1.6 + r() * 1.6);
    x.fillStyle = pal.shadow;
    x.beginPath();
    x.moveTo(bx, by + bh);
    x.lineTo(bx + bw, by + bh);
    x.lineTo(bx + bw + dir * slen, by + bh + slen * 0.30);
    x.lineTo(bx + dir * slen, by + bh + slen * 0.30);
    x.closePath(); x.fill();
    // body lit face
    x.fillStyle = pal.wall; x.fillRect(bx, by, bw, bh);
    // shaded side face (fake 3D)
    x.fillStyle = pal.shade;
    x.beginPath();
    x.moveTo(bx + (dir < 0 ? 0 : bw), by);
    x.lineTo(bx + (dir < 0 ? 0 : bw) - dir * depth, by - depth * 0.5);
    x.lineTo(bx + (dir < 0 ? 0 : bw) - dir * depth, by + bh - depth * 0.5);
    x.lineTo(bx + (dir < 0 ? 0 : bw), by + bh);
    x.closePath(); x.fill();
    // top face
    x.fillStyle = K.mix(pal.wall, '#ffffff', 0.18);
    x.beginPath();
    x.moveTo(bx, by); x.lineTo(bx + bw, by);
    x.lineTo(bx + bw - dir * depth, by - depth * 0.5);
    x.lineTo(bx - dir * depth, by - depth * 0.5);
    x.closePath(); x.fill();
    // wall mottle texture
    K.mottle(x, bx, by, bw, bh, pal.wall, 26, r, 'overlay');
  }

  // an arcade: row of arches receding toward vp
  function arcade(side) {
    const n = 5 + (r() * 3 | 0);
    const baseY = hz + (H - hz) * 0.12;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const sc = 1 - t * 0.72;
      const ax = side < 0 ? W * 0.04 + t * (vpx - W * 0.04) : W * 0.96 - t * (W * 0.96 - vpx);
      const aw = W * 0.16 * sc, ah = (H - hz) * 0.62 * sc;
      const ay = baseY + (hz - baseY) * 0 + (H - hz) * 0.0 + (1 - sc) * (H - hz) * 0.18;
      // pier
      x.fillStyle = K.mix(pal.wall, pal.shade, 0.15 + t * 0.4);
      x.fillRect(ax, ay, aw * 0.32, ah);
      // arch void (shadowed)
      x.fillStyle = K.mix(pal.shade, pal.ink, 0.4 + t * 0.4);
      x.beginPath();
      x.moveTo(ax + aw * 0.32, ay + ah);
      x.lineTo(ax + aw * 0.32, ay + ah * 0.34);
      x.arc(ax + aw * 0.66, ay + ah * 0.34, aw * 0.34, Math.PI, 0);
      x.lineTo(ax + aw, ay + ah);
      x.closePath(); x.fill();
      // pier shadow on ground
      x.fillStyle = pal.shadow;
      x.fillRect(ax, ay + ah, aw * (1.4), (H - ay - ah) * (0.5 - t * 0.3));
    }
  }

  // ── COMPOSE per mode ──
  if (mode === 'Colonnade') {
    arcade(sunSide); // arcade on shadow-rich side
    // distant tower
    const tw = W * 0.045, th = (H - hz) * 0.5;
    block(vpx - tw / 2 + W * 0.12, hz - th + (H - hz) * 0.05, tw, th, tw * 0.5);
  } else if (mode === 'Canyon') {
    arcade(-1); arcade(1);
  } else if (mode === 'Monument') {
    // central obelisk / plinth + statue hint
    const ow = W * 0.06, oh = (H - hz) * 0.66;
    block(W * (0.42 + (r() - 0.5) * 0.2), hz - oh * 0.1, ow, oh, ow * 0.6);
    // a low plinth nearby
    block(W * (0.6 + r() * 0.12), hz + (H - hz) * 0.18, W * 0.1, (H - hz) * 0.16, W * 0.05);
  } else if (mode === 'Far Tower') {
    // a single tower far off + a tiny puffing-train silhouette on the horizon
    const tw = W * 0.05, th = (H - hz) * 0.62;
    block(W * (0.2 + r() * 0.1), hz - th * 0.1, tw, th, tw * 0.55);
    x.fillStyle = K.rgba(pal.ink, 0.6);
    const trx = W * 0.62, try_ = hz - 4;
    x.fillRect(trx, try_ - 5, W * 0.08, 6);
    K.bloom(x, trx, try_ - 10, 40, '#ffffff', 0.25); // steam puff
  } else { // Bleached Square — almost empty, one impossible long shadow
    // shadow of an object that isn't in frame
    const dir = sunSide;
    x.fillStyle = pal.shadow;
    const ox = W * (0.5 + (r() - 0.5) * 0.3);
    x.beginPath();
    x.moveTo(ox, hz + (H - hz) * 0.3);
    x.lineTo(ox + W * 0.04, hz + (H - hz) * 0.3);
    x.lineTo(ox + W * 0.04 + dir * W * 0.5, H);
    x.lineTo(ox + dir * W * 0.5, H);
    x.closePath(); x.fill();
    // a small low plinth
    block(W * (0.5 + (r() - 0.5) * 0.3) - W * 0.02, hz + (H - hz) * 0.2, W * 0.05, (H - hz) * 0.12, W * 0.03);
  }

  // a tiny lone figure (scale + eeriness) — most seeds
  if (r() < 0.7) {
    const fx = W * (0.3 + r() * 0.45), fy = hz + (H - hz) * (0.3 + r() * 0.4);
    const fh = (H - hz) * 0.07;
    x.fillStyle = K.rgba(pal.ink, 0.78);
    x.beginPath(); x.ellipse(fx, fy, fh * 0.18, fh * 0.5, 0, 0, 7); x.fill();
    x.beginPath(); x.arc(fx, fy - fh * 0.5, fh * 0.14, 0, 7); x.fill();
    // long shadow
    x.fillStyle = pal.shadow;
    const dir = sunX < fx ? 1 : -1;
    x.beginPath(); x.moveTo(fx, fy + fh * 0.45);
    x.lineTo(fx + dir * fh * 3.5, fy + fh * 0.7); x.lineTo(fx + dir * fh * 3.5, fy + fh * 0.95);
    x.lineTo(fx, fy + fh * 0.6); x.closePath(); x.fill();
  }

  // ── ATMOSPHERE & TEXTURE ──
  const hazeCol = K.mix(pal.sky[2], pal.sun, 0.3);
  K.hazeSheet(x, W, H, noise, hazeCol, 0.22, Math.min(W, H) * 0.9, 'screen');
  // ground-level dust haze near horizon
  const gh = x.createLinearGradient(0, hz - H * 0.04, 0, hz + H * 0.12);
  gh.addColorStop(0, K.rgba(hazeCol, 0)); gh.addColorStop(0.5, K.rgba(hazeCol, 0.4)); gh.addColorStop(1, K.rgba(hazeCol, 0));
  x.fillStyle = gh; x.fillRect(0, hz - H * 0.04, W, H * 0.16);
  K.grain(x, W, H, 5.5, r);
  K.vignette(x, W, H, pal.name === 'Night Plaza' ? 0.5 : 0.34);
}

const hourMap = { 'Siena Dusk': 'Dusk', 'Ochre Noon': 'Noon', 'Cobalt Hour': 'Blue Hour', 'Bone Sirocco': 'Sirocco', 'Verdigris': 'Overcast', 'Night Plaza': 'Night' };

export const vestibuleTraits: TraitsFn = (seed) => {
  const r = K.rng(seed);
  const pal = K.pick(PALS, r);
  const mode = K.pick(MODES, r);
  const fmt = K.pick(FORMATS, r);
  const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
  return { Palette: pal.name, Scene: mode, Format: f, Hour: hourMap[pal.name] };
};

export const vestibuleSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Scene',   values: MODES },
    { name: 'Format',  values: ['Portrait', 'Square', 'Landscape'] },
    { name: 'Hour',    values: PALS.map((p) => hourMap[p.name]) },
  ],
};

export const renderVestibule: EngineFn = K.blit((off, id) => { draw(off, id); }, vestibuleTraits);

// W/H of the FORMATS entries (portrait, square, landscape).
export const VESTIBULE_ASPECTS = [1000 / 1250, 1, 1300 / 1000] as const;
