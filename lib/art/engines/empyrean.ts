// @ts-nocheck
/*
 * EMPYREAN — opus4-8. The original dark mythic panorama is the STANDARD look;
 * the busy "Ascendant" world (lore realms, harbours, caravans, beacon chains,
 * murk/luminous casts) is the RARE pull (~12%). Each look is kept verbatim in
 * its own scope and dispatched by a Style trait. Deterministic: paramsOf rolls
 * Style FIRST, then delegates to the chosen engine's own draw order.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, shuffle, PHI, INVPHI, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

/* CLASSIC look — the original (standard) */
const CLASSIC = (function () {
// @ts-nocheck
/*
 * EMPYREAN — by opus4-8. "A sweeping establishing shot of a legendary realm."
 *
 * Not an abstract field. A DEPICTED EPIC SCENE, composited in layered depth with
 * atmospheric perspective: a great dramatic SKY (moon / ringed planet / portal /
 * comet / twin suns / aurora) over a receding MOUNTAIN RANGE that fades into haze,
 * a hero CITADEL of many towers / walls / banners / lit windows on a crag, a HOST
 * of tiny banner-bearing figures massing the field below, FLYERS crossing the sky
 * (dragons / airships / griffins), and FIRE & LIGHT — beacon fires, godrays, a
 * burning or glowing horizon — framed by a foreground ridge with a lone standard.
 *
 * Compositing model (back → front), each its own pass:
 *   1. Sky gradient + the Sky Hero event + godrays + stars/aurora.
 *   2. Distant mountain ranges (3-4 receding ridgelines, hazier + lighter far).
 *   3. Atmospheric haze band on the horizon (the air the army marches through).
 *   4. The midground crag + the CITADEL silhouette with towers, banners, windows.
 *   5. Beacon fires, window glow, the citadel's own light bloom.
 *   6. The HOST: ranks of figures + rows of pennants on the causeway/field.
 *   7. Flyers crossing the sky.
 *   8. Foreground ridge silhouette + a lone banner anchoring the scale.
 *   9. Finishing: embers/sparks, vignette, grain.
 *
 * Determinism: every trait drawn in paramsOf(r) in a FIXED ORDER, so traits()
 * and draw() never disagree. Seed = rng(tokenId).
 */

/* ── PALETTES — 10 named, saturated realm schemes ──────────────────────────
 * sky0 = zenith (top), sky1 = horizon band; these drive the whole atmosphere.
 * stone = citadel rock, lit = window/beacon light, accent = banner/flyer/glow.
 * far = the haze colour distant mountains fade INTO (atmospheric perspective). */
const PALS = [
  { name: 'Dragonfire',        sky0: '#2a0606', sky1: '#ff5a16', stone: '#1c1012', lit: '#ffd24a', accent: '#ff7a1e', far: '#c14a22', glow: '#ff8a2a' },
  { name: 'Frost Kingdom',     sky0: '#06122e', sky1: '#7fd8ff', stone: '#12233a', lit: '#cfeaff', accent: '#46b6ff', far: '#6fa8d8', glow: '#a9e6ff' },
  { name: 'Emerald Vale',      sky0: '#04241a', sky1: '#39e08a', stone: '#0e231b', lit: '#d6ffb0', accent: '#46e07a', far: '#3aa878', glow: '#9cff6a' },
  { name: 'Twilight Empire',   sky0: '#1a0833', sky1: '#b048d8', stone: '#180e2a', lit: '#ffd0f4', accent: '#c060ff', far: '#7a52b8', glow: '#e08aff' },
  { name: 'Crimson Siege',     sky0: '#250208', sky1: '#e0203a', stone: '#1a0a0c', lit: '#ffc24a', accent: '#ff3a4a', far: '#b03040', glow: '#ff5a3a' },
  { name: 'Golden Dawn',       sky0: '#3a1a40', sky1: '#ffc24a', stone: '#241420', lit: '#fff0b0', accent: '#ff9a3a', far: '#d88a66', glow: '#ffd86a' },
  { name: 'Void Portal',       sky0: '#0a0218', sky1: '#6a18c0', stone: '#100a1e', lit: '#b07aff', accent: '#9a3aff', far: '#5a3a9a', glow: '#c060ff' },
  { name: 'Amethyst Highlands',sky0: '#160a30', sky1: '#9a6aff', stone: '#181428', lit: '#e0d0ff', accent: '#a87aff', far: '#7a6ac0', glow: '#c0a0ff' },
  { name: 'Aurora Reach',      sky0: '#03142a', sky1: '#2aa8a0', stone: '#0c1c26', lit: '#caffe6', accent: '#3affb0', far: '#3a9aa8', glow: '#7affd0' },
  { name: 'Sunset Citadel',    sky0: '#2a0a30', sky1: '#ff7a3a', stone: '#1c1018', lit: '#ffe0a0', accent: '#ff5a7a', far: '#c86a5a', glow: '#ff9a5a' },
];

/* Formats — W/H ratios live in EMPYREAN_ASPECTS below (same order). */
const FMTS = [
  { W: 1280, H: 1280, t: 'Square' },
  { W: 1040, H: 1340, t: 'Tall' },
  { W: 1440, H: 980,  t: 'Wide' },
];

const REALMS  = ['Dawn March', 'Blood Dusk', 'Aurora Night', 'Storm Siege', 'Eclipse', 'Portal Rift'];
const SKYHERO = ['Great Moon', 'Ringed Planet', 'Portal Rift', 'Comet', 'Twin Suns', 'Aurora'];
const FLYERS  = ['Dragons', 'Airships', 'Griffins', 'None'];
const CAMERA  = ['Citadel Left', 'Valley Causeway', 'Mountain Overlook', 'Coastal Fortress'];
const DENSITY = ['Lone Keep', 'Marching Host', 'Massed Empire'];

/* ── Param draw — FIXED ORDER ──────────────────────────────────────────────*/
function paramsOf(r) {
  const palI   = Math.floor(r() * PALS.length);
  const fmt    = pick(FMTS, r);
  const realm  = pick(REALMS, r);
  const skyHero= pick(SKYHERO, r);
  const flyers = pick(FLYERS, r);
  const camera = pick(CAMERA, r);
  const density= pick(DENSITY, r);
  return { palI, fmt, realm, skyHero, flyers, camera, density };
}

function labels(p) {
  return {
    Palette: PALS[p.palI].name,
    Realm:   p.realm,
    Sky:     p.skyHero,
    Flyers:  p.flyers,
    Camera:  p.camera,
    Host:    p.density,
    Format:  p.fmt.t,
  };
}

/* Realm lighting modifiers — tint the whole scene by time-of-day/weather. */
function realmMod(realm) {
  switch (realm) {
    case 'Dawn March':   return { skyL: 0.06, horizonBoost: 0.30, dark: 0.0,  star: 0.2, storm: 0 };
    case 'Blood Dusk':   return { skyL: -0.02, horizonBoost: 0.40, dark: 0.1, star: 0.4, storm: 0 };
    case 'Aurora Night': return { skyL: -0.10, horizonBoost: 0.10, dark: 0.3, star: 1.0, storm: 0 };
    case 'Storm Siege':  return { skyL: -0.06, horizonBoost: 0.20, dark: 0.35,star: 0.1, storm: 1 };
    case 'Eclipse':      return { skyL: -0.14, horizonBoost: 0.16, dark: 0.4, star: 0.8, storm: 0 };
    case 'Portal Rift':  return { skyL: -0.08, horizonBoost: 0.24, dark: 0.25,star: 0.6, storm: 0 };
    default:             return { skyL: 0, horizonBoost: 0.25, dark: 0.1, star: 0.3, storm: 0 };
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 1 — SKY
 * ═════════════════════════════════════════════════════════════════════════ */
function paintSky(x, P, W, H, horizonY, rm, r) {
  // vertical gradient: deep zenith → bright horizon band
  const g = x.createLinearGradient(0, 0, 0, horizonY);
  g.addColorStop(0,    mix(P.sky0, '#000', clamp(0.1 - rm.skyL, 0, 0.5)));
  g.addColorStop(0.55, mix(P.sky0, P.sky1, 0.35 + rm.horizonBoost * 0.3));
  g.addColorStop(0.88, mix(P.sky1, P.sky0, 0.15));
  g.addColorStop(1,    mix(P.sky1, '#fff', 0.12 + rm.horizonBoost * 0.2));
  x.fillStyle = g;
  x.fillRect(0, 0, W, horizonY + 2);

  // stars
  if (rm.star > 0) {
    const n = Math.floor(W * horizonY / 2600 * rm.star);
    for (let i = 0; i < n; i++) {
      const sx = r() * W, sy = r() * horizonY * 0.8;
      const a = (0.2 + r() * 0.7) * rm.star;
      const s = r() < 0.08 ? 1.8 : 0.9;
      x.fillStyle = rgba(mix('#ffffff', P.lit, 0.3), a);
      x.fillRect(sx, sy, s, s);
    }
  }
}

/* Sky hero events. */
function paintSkyHero(x, P, W, H, horizonY, hero, rm, r) {
  const cx = W * (0.28 + r() * 0.44);
  const cy = horizonY * (0.22 + r() * 0.32);
  const R = Math.min(W, H) * (0.10 + r() * 0.07);

  x.save();
  x.globalCompositeOperation = 'lighter';

  if (hero === 'Great Moon') {
    // soft outer halo
    const hg = x.createRadialGradient(cx, cy, 0, cx, cy, R * 3);
    hg.addColorStop(0, rgba(P.glow, 0.4));
    hg.addColorStop(0.3, rgba(P.glow, 0.12));
    hg.addColorStop(1, rgba(P.glow, 0));
    x.fillStyle = hg; x.fillRect(0, 0, W, horizonY);
    // disc
    x.globalCompositeOperation = 'source-over';
    const dg = x.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    dg.addColorStop(0, mix('#ffffff', P.lit, 0.3));
    dg.addColorStop(0.7, P.lit);
    dg.addColorStop(1, mix(P.lit, P.sky1, 0.5));
    x.fillStyle = dg;
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
    // craters
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2, rr = r() * R * 0.8;
      const mx = cx + Math.cos(a) * rr, my = cy + Math.sin(a) * rr;
      x.fillStyle = rgba(mix(P.lit, '#000', 0.3), 0.18);
      x.beginPath(); x.arc(mx, my, R * (0.04 + r() * 0.08), 0, Math.PI * 2); x.fill();
    }
  } else if (hero === 'Ringed Planet') {
    const hg = x.createRadialGradient(cx, cy, 0, cx, cy, R * 2.6);
    hg.addColorStop(0, rgba(P.glow, 0.3));
    hg.addColorStop(1, rgba(P.glow, 0));
    x.fillStyle = hg; x.fillRect(0, 0, W, horizonY);
    x.globalCompositeOperation = 'source-over';
    const dg = x.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R);
    dg.addColorStop(0, mix('#ffffff', P.accent, 0.2));
    dg.addColorStop(0.6, P.accent);
    dg.addColorStop(1, mix(P.accent, '#000', 0.4));
    x.fillStyle = dg;
    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
    // rings (ellipse stroke)
    x.save();
    x.translate(cx, cy); x.rotate(-0.4);
    for (let i = 0; i < 3; i++) {
      x.strokeStyle = rgba(mix(P.lit, P.accent, i / 3), 0.5 - i * 0.1);
      x.lineWidth = R * (0.06 - i * 0.012);
      x.beginPath(); x.ellipse(0, 0, R * (1.5 + i * 0.18), R * (0.4 + i * 0.05), 0, 0, Math.PI * 2); x.stroke();
    }
    x.restore();
  } else if (hero === 'Portal Rift') {
    // a vertical glowing tear in the sky
    const px = cx, py = cy * 1.1, pw = R * 0.5, ph = R * 2.4;
    const hg = x.createRadialGradient(px, py, 0, px, py, ph);
    hg.addColorStop(0, rgba(P.glow, 0.7));
    hg.addColorStop(0.3, rgba(P.accent, 0.3));
    hg.addColorStop(1, rgba(P.accent, 0));
    x.fillStyle = hg;
    x.beginPath(); x.ellipse(px, py, pw * 2.2, ph, 0, 0, Math.PI * 2); x.fill();
    // bright core
    const cg = x.createLinearGradient(px, py - ph, px, py + ph);
    cg.addColorStop(0, rgba(P.accent, 0));
    cg.addColorStop(0.5, rgba(mix('#ffffff', P.lit, 0.4), 0.9));
    cg.addColorStop(1, rgba(P.accent, 0));
    x.fillStyle = cg;
    x.beginPath(); x.ellipse(px, py, pw * 0.4, ph * 0.95, 0, 0, Math.PI * 2); x.fill();
    // lightning tendrils out of the rift
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + r() * 0.4;
      let lx = px, ly = py, len = R * (0.6 + r() * 1.0);
      x.strokeStyle = rgba(P.glow, 0.4); x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(lx, ly);
      const steps = 5;
      for (let s = 0; s < steps; s++) {
        lx += Math.cos(a) * len / steps + randn(r) * R * 0.08;
        ly += Math.sin(a) * len / steps + randn(r) * R * 0.08;
        x.lineTo(lx, ly);
      }
      x.stroke();
    }
  } else if (hero === 'Comet') {
    const tx = W * (0.7 + r() * 0.2), ty = horizonY * (0.12 + r() * 0.15);
    const ta = Math.PI * 0.78; // pointing down-left
    const tlen = Math.min(W, H) * (0.5 + r() * 0.3);
    const ex = tx + Math.cos(ta) * tlen, ey = ty + Math.sin(ta) * tlen;
    const tg = x.createLinearGradient(tx, ty, ex, ey);
    tg.addColorStop(0, rgba(mix('#ffffff', P.lit, 0.4), 0.9));
    tg.addColorStop(0.4, rgba(P.glow, 0.4));
    tg.addColorStop(1, rgba(P.glow, 0));
    x.strokeStyle = tg; x.lineCap = 'round'; x.lineWidth = R * 0.5;
    x.beginPath(); x.moveTo(tx, ty); x.lineTo(ex, ey); x.stroke();
    // head
    const hg = x.createRadialGradient(tx, ty, 0, tx, ty, R * 0.7);
    hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.4, P.lit); hg.addColorStop(1, rgba(P.glow, 0));
    x.fillStyle = hg; x.beginPath(); x.arc(tx, ty, R * 0.7, 0, Math.PI * 2); x.fill();
  } else if (hero === 'Twin Suns') {
    for (let i = 0; i < 2; i++) {
      const sx = cx + (i === 0 ? -R * 1.3 : R * 1.3);
      const sy = cy + (i === 0 ? 0 : R * 0.5);
      const rr = R * (i === 0 ? 0.9 : 0.6);
      const hg = x.createRadialGradient(sx, sy, 0, sx, sy, rr * 3);
      hg.addColorStop(0, rgba(P.glow, 0.5));
      hg.addColorStop(1, rgba(P.glow, 0));
      x.fillStyle = hg; x.fillRect(0, 0, W, horizonY);
      const dg = x.createRadialGradient(sx, sy, 0, sx, sy, rr);
      dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.6, P.lit); dg.addColorStop(1, P.accent);
      x.fillStyle = dg; x.beginPath(); x.arc(sx, sy, rr, 0, Math.PI * 2); x.fill();
    }
  } else if (hero === 'Aurora') {
    // handled as sky sheets in paintAurora — draw a faint moon too
    const dg = x.createRadialGradient(cx, cy, 0, cx, cy, R * 0.7);
    dg.addColorStop(0, mix('#ffffff', P.lit, 0.2));
    dg.addColorStop(1, mix(P.lit, P.sky0, 0.6));
    x.fillStyle = dg; x.beginPath(); x.arc(cx, cy, R * 0.7, 0, Math.PI * 2); x.fill();
  }
  x.restore();
  return { cx, cy, R };
}

/* Aurora curtains. */
function paintAurora(x, P, W, H, horizonY, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const sheets = rint(r, 3, 5);
  for (let s = 0; s < sheets; s++) {
    const baseY = horizonY * (0.2 + r() * 0.4);
    const amp = horizonY * (0.08 + r() * 0.12);
    const hue = (s % 2 === 0) ? P.accent : P.glow;
    x.beginPath();
    x.moveTo(0, baseY);
    const seg = 18;
    for (let i = 0; i <= seg; i++) {
      const px = (i / seg) * W;
      const py = baseY + Math.sin(i * 0.6 + s * 1.7) * amp + randn(r) * amp * 0.2;
      x.lineTo(px, py);
    }
    x.lineTo(W, 0); x.lineTo(0, 0); x.closePath();
    const g = x.createLinearGradient(0, baseY - amp, 0, baseY + amp * 2);
    g.addColorStop(0, rgba(hue, 0));
    g.addColorStop(0.5, rgba(hue, 0.16));
    g.addColorStop(1, rgba(hue, 0));
    x.fillStyle = g; x.fill();
  }
  x.restore();
}

/* Godrays from the sky hero / horizon down through the scene. */
function godrays(x, P, W, horizonY, ox, oy, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const n = rint(r, 5, 9);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.55 + r() * 0.4); // downward fan
    const len = horizonY * (1.0 + r() * 0.8);
    const w = W * (0.015 + r() * 0.04);
    const ex = ox + Math.cos(a) * len, ey = oy + Math.sin(a) * len;
    const g = x.createLinearGradient(ox, oy, ex, ey);
    g.addColorStop(0, rgba(P.glow, 0.10 + r() * 0.06));
    g.addColorStop(1, rgba(P.glow, 0));
    x.strokeStyle = g; x.lineWidth = w; x.lineCap = 'round';
    x.beginPath(); x.moveTo(ox, oy); x.lineTo(ex, ey); x.stroke();
  }
  x.restore();
}

/* Storm clouds + lightning. */
function paintStorm(x, P, W, horizonY, r) {
  x.save();
  for (let i = 0; i < 7; i++) {
    const cx = r() * W, cy = horizonY * (0.1 + r() * 0.4);
    const rw = W * (0.12 + r() * 0.2), rh = rw * 0.4;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rw);
    g.addColorStop(0, rgba(mix(P.sky0, '#000', 0.3), 0.5));
    g.addColorStop(1, rgba(P.sky0, 0));
    x.fillStyle = g;
    x.beginPath(); x.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); x.fill();
  }
  // a couple of lightning bolts
  x.globalCompositeOperation = 'lighter';
  const bolts = rint(r, 1, 2);
  for (let b = 0; b < bolts; b++) {
    let lx = r() * W, ly = horizonY * 0.15;
    x.strokeStyle = rgba(mix('#ffffff', P.lit, 0.4), 0.85); x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(lx, ly);
    for (let s = 0; s < 7; s++) {
      lx += randn(r) * W * 0.04;
      ly += horizonY * 0.07;
      x.lineTo(lx, ly);
    }
    x.stroke();
  }
  x.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 2 — MOUNTAINS (receding ridgelines with atmospheric perspective)
 * ═════════════════════════════════════════════════════════════════════════ */
function ridgeline(x, W, baseY, amp, rough, r, fill, jag) {
  x.beginPath();
  x.moveTo(0, baseY + amp);
  const seg = jag ? rint(r, 8, 14) : rint(r, 4, 7);
  let prevY = baseY;
  const peaks = [];
  for (let i = 0; i <= seg; i++) {
    const px = (i / seg) * W;
    const peak = baseY - amp * (0.4 + r() * 0.9) * (jag ? 1 : 0.7);
    const py = (prevY + (peak - prevY) * 0.7) + randn(r) * amp * rough;
    if (jag && i > 0 && i < seg) {
      // sharp peaks
      const mx = (px + (i - 1) / seg * W) / 2;
      x.lineTo(mx, (prevY + py) / 2 + amp * 0.1);
    }
    x.lineTo(px, py);
    peaks.push([px, py]);
    prevY = py;
  }
  x.lineTo(W, baseY + amp);
  x.closePath();
  x.fillStyle = fill;
  x.fill();
  return peaks;
}

function paintMountains(x, P, W, H, horizonY, rm, r) {
  const layers = 4;
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1); // 0 far → 1 near
    const baseY = horizonY * (0.62 + t * 0.36);
    const amp = horizonY * (0.10 + t * 0.22);
    // atmospheric perspective: far = lighter + hazier (toward sky1/far), near = darker stone
    const fill = mix(mix(P.far, P.sky1, 0.3 * (1 - t)), P.stone, t * 0.85);
    const dimmed = mix(fill, P.sky0, (1 - t) * 0.35);
    ridgeline(x, W, baseY, amp, 0.25, r, dimmed, t > 0.4);
    // snow / lit rim on nearer ridges
    if (t > 0.5) {
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.strokeStyle = rgba(mix(P.lit, P.sky1, 0.4), 0.12);
      x.lineWidth = 1.5;
      x.stroke();
      x.restore();
    }
  }
}

/* Horizon haze band — the air the host marches through. */
function paintHaze(x, P, W, horizonY, rm, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const bandTop = horizonY * 0.86;
  const g = x.createLinearGradient(0, bandTop, 0, horizonY * 1.08);
  g.addColorStop(0, rgba(P.far, 0));
  g.addColorStop(0.5, rgba(mix(P.far, P.sky1, 0.4), 0.3 + rm.horizonBoost * 0.3));
  g.addColorStop(1, rgba(P.far, 0.0));
  x.fillStyle = g;
  x.fillRect(0, bandTop - horizonY * 0.1, W, horizonY * 0.4);
  x.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 4 — THE CITADEL
 * ═════════════════════════════════════════════════════════════════════════ */
function drawTower(x, P, bx, by, w, h, lit, r) {
  // tower body
  x.fillStyle = P.stone;
  x.fillRect(bx - w / 2, by - h, w, h);
  // crenellations
  const merlons = Math.max(2, Math.floor(w / 6));
  for (let m = 0; m < merlons; m++) {
    if (m % 2 === 0) {
      x.fillRect(bx - w / 2 + m * (w / merlons), by - h - w * 0.18, w / merlons, w * 0.18);
    }
  }
  // conical roof on some
  if (r() < 0.5) {
    x.fillStyle = mix(P.stone, P.accent, 0.4);
    x.beginPath();
    x.moveTo(bx - w * 0.65, by - h);
    x.lineTo(bx + w * 0.65, by - h);
    x.lineTo(bx, by - h - w * 1.1);
    x.closePath(); x.fill();
  }
  // lit windows
  const rows = Math.max(1, Math.floor(h / (w * 0.7)));
  for (let ry = 0; ry < rows; ry++) {
    for (let cxn = 0; cxn < 2; cxn++) {
      if (r() < 0.55) {
        const wx = bx - w * 0.22 + cxn * w * 0.44;
        const wy = by - h + w * 0.4 + ry * (w * 0.7);
        x.fillStyle = rgba(lit, 0.7 + r() * 0.3);
        x.fillRect(wx - w * 0.07, wy, w * 0.14, w * 0.22);
      }
    }
  }
}

function drawBanner(x, P, bx, by, h, col, r) {
  // pole
  x.strokeStyle = mix(P.stone, '#000', 0.3); x.lineWidth = Math.max(1, h * 0.04);
  x.beginPath(); x.moveTo(bx, by); x.lineTo(bx, by - h); x.stroke();
  // pennant (triangular flag)
  const fw = h * 0.5, fh = h * 0.32;
  const sway = randn(r) * fw * 0.2;
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(bx, by - h);
  x.lineTo(bx + fw + sway, by - h + fh * 0.5);
  x.lineTo(bx, by - h + fh);
  x.closePath(); x.fill();
}

function paintCitadel(x, P, W, H, horizonY, cam, density, rm, r) {
  // crag position by camera
  let cragX, cragW;
  if (cam === 'Citadel Left')       { cragX = W * 0.18; cragW = W * 0.42; }
  else if (cam === 'Coastal Fortress'){ cragX = W * 0.74; cragW = W * 0.4; }
  else if (cam === 'Valley Causeway') { cragX = W * 0.5; cragW = W * 0.36; }
  else                                 { cragX = W * 0.5; cragW = W * 0.55; } // overlook = wide spire-city

  const groundY = horizonY * 1.0;
  const baseY = groundY - H * 0.02;
  const cragTop = baseY - H * (0.10 + r() * 0.06);

  // the crag / plateau silhouette
  x.fillStyle = mix(P.stone, '#000', 0.25);
  x.beginPath();
  x.moveTo(cragX - cragW / 2, groundY + H * 0.1);
  x.lineTo(cragX - cragW / 2 + cragW * 0.08, cragTop + H * 0.02);
  x.lineTo(cragX - cragW * 0.2, cragTop);
  x.lineTo(cragX + cragW * 0.25, cragTop - H * 0.01);
  x.lineTo(cragX + cragW / 2 - cragW * 0.05, cragTop + H * 0.03);
  x.lineTo(cragX + cragW / 2, groundY + H * 0.1);
  x.closePath(); x.fill();

  // back curtain wall
  const wallY = cragTop;
  x.fillStyle = mix(P.stone, P.far, 0.1);
  x.fillRect(cragX - cragW * 0.42, wallY, cragW * 0.84, H * 0.05);
  // wall crenellations
  const wm = Math.floor(cragW / (W * 0.02));
  for (let m = 0; m < wm; m++) {
    if (m % 2 === 0) x.fillRect(cragX - cragW * 0.42 + m * (cragW * 0.84 / wm), wallY - H * 0.012, cragW * 0.84 / wm, H * 0.012);
  }

  // towers along the citadel — count scales with density
  const towerN = density === 'Lone Keep' ? rint(r, 3, 4) : density === 'Marching Host' ? rint(r, 5, 8) : rint(r, 8, 12);
  const span = cragW * 0.78;
  const beacons = [];
  for (let i = 0; i < towerN; i++) {
    const t = towerN > 1 ? i / (towerN - 1) : 0.5;
    const tx = cragX - span / 2 + t * span + randn(r) * W * 0.01;
    // central towers taller (a keep silhouette)
    const central = 1 - Math.abs(t - 0.5) * 1.4;
    const th = H * (0.05 + 0.10 * Math.max(0, central) + r() * 0.03);
    const tw = W * (0.018 + 0.014 * Math.max(0, central) + r() * 0.006);
    drawTower(x, P, tx, wallY + H * 0.005, tw, th, P.lit, r);
    // banner on prominent towers
    if (central > 0.3 || r() < 0.4) {
      drawBanner(x, P, tx, wallY - th + H * 0.005, H * (0.03 + r() * 0.02), P.accent, r);
    }
    // beacon fire on a couple of towers
    if (r() < 0.4) beacons.push([tx, wallY - th + H * 0.005]);
  }

  // a tall central spire (the hero keep)
  const keepX = cragX + randn(r) * W * 0.03;
  const keepH = H * (0.16 + r() * 0.06);
  const keepW = W * (0.03 + r() * 0.012);
  drawTower(x, P, keepX, wallY + H * 0.005, keepW, keepH, P.lit, r);
  drawBanner(x, P, keepX, wallY - keepH + H * 0.005, H * 0.05, P.accent, r);
  if (r() < 0.7) beacons.push([keepX, wallY - keepH + H * 0.005]);

  // a connecting bridge to a smaller outpost (overlook / causeway)
  if (cam === 'Mountain Overlook' || cam === 'Valley Causeway') {
    const ox = cragX + cragW * (r() < 0.5 ? -0.7 : 0.7);
    x.strokeStyle = mix(P.stone, '#000', 0.2); x.lineWidth = H * 0.008;
    x.beginPath(); x.moveTo(cragX, wallY + H * 0.03); x.lineTo(ox, wallY + H * 0.05); x.stroke();
    drawTower(x, P, ox, wallY + H * 0.05, W * 0.02, H * 0.07, P.lit, r);
  }

  return { cragX, cragW, wallY, groundY, baseY, beacons };
}

/* Beacon fire + glow on a point. */
function beaconFire(x, P, bx, by, scale, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  // glow
  const g = x.createRadialGradient(bx, by, 0, bx, by, scale * 6);
  g.addColorStop(0, rgba(P.glow, 0.6));
  g.addColorStop(0.4, rgba(P.accent, 0.2));
  g.addColorStop(1, rgba(P.accent, 0));
  x.fillStyle = g;
  x.beginPath(); x.arc(bx, by, scale * 6, 0, Math.PI * 2); x.fill();
  // flame tongues
  for (let i = 0; i < 4; i++) {
    const fx = bx + randn(r) * scale * 0.6;
    const fh = scale * (1.4 + r() * 1.2);
    const fg = x.createLinearGradient(fx, by, fx, by - fh);
    fg.addColorStop(0, rgba(P.lit, 0.9));
    fg.addColorStop(0.5, rgba(P.glow, 0.7));
    fg.addColorStop(1, rgba(P.accent, 0));
    x.fillStyle = fg;
    x.beginPath();
    x.moveTo(fx - scale * 0.4, by);
    x.quadraticCurveTo(fx + randn(r) * scale, by - fh * 0.6, fx, by - fh);
    x.quadraticCurveTo(fx - randn(r) * scale, by - fh * 0.6, fx + scale * 0.4, by);
    x.closePath(); x.fill();
  }
  x.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 6 — THE HOST (army of figures + pennant rows)
 * ═════════════════════════════════════════════════════════════════════════ */
function paintHost(x, P, W, H, cit, density, cam, r) {
  if (density === 'Lone Keep') {
    // sparse — a small honour guard near the gate
    const fieldY = cit.groundY + H * 0.04;
    drawRank(x, P, W * cit.cragX / W, fieldY, W * 0.18, 1, 0.5, P.accent, r, cit);
    return;
  }
  const rows = density === 'Marching Host' ? rint(r, 3, 5) : rint(r, 5, 8);
  const fieldTop = cit.groundY + H * 0.01;
  const fieldBot = H * 0.98;
  for (let row = 0; row < rows; row++) {
    const t = row / Math.max(1, rows - 1);
    const ry = fieldTop + (fieldBot - fieldTop) * t;
    // perspective: nearer rows bigger + darker + wider span
    const fig = H * (0.006 + t * 0.018);
    const count = Math.floor((density === 'Massed Empire' ? 30 : 18) * (0.6 + t * 0.7));
    // causeway funnels toward the gate; field spreads wide
    const spread = cam === 'Valley Causeway'
      ? W * 0.12 + (W * 0.5 - W * 0.12) * t
      : W * (0.5 + t * 0.4);
    const cx = cam === 'Citadel Left' ? W * 0.55 : cam === 'Coastal Fortress' ? W * 0.45 : W * 0.5;
    drawRank(x, P, cx, ry, spread, count, fig, mix(P.stone, '#000', 0.4 + t * 0.3), r, cit, P.accent, t);
  }
}

function drawRank(x, P, cx, y, spread, count, fig, col, r, cit, banner, depth) {
  for (let i = 0; i < count; i++) {
    const fx = cx + (i / Math.max(1, count - 1) - 0.5) * spread + randn(r) * fig;
    const jitter = randn(r) * fig * 0.4;
    // figure: a little dark stroke with a head dot
    x.strokeStyle = col; x.lineWidth = Math.max(0.8, fig * 0.5); x.lineCap = 'round';
    x.beginPath(); x.moveTo(fx, y + jitter); x.lineTo(fx, y - fig * 1.6 + jitter); x.stroke();
    x.fillStyle = col;
    x.beginPath(); x.arc(fx, y - fig * 1.9 + jitter, fig * 0.5, 0, Math.PI * 2); x.fill();
    // every so often a banner-bearer
    if (banner && i % 5 === 2) {
      x.strokeStyle = mix(col, '#000', 0.3); x.lineWidth = Math.max(0.6, fig * 0.3);
      x.beginPath(); x.moveTo(fx, y - fig * 1.6 + jitter); x.lineTo(fx, y - fig * 4 + jitter); x.stroke();
      x.fillStyle = rgba(banner, 0.8);
      const bs = fig * 1.3;
      x.beginPath();
      x.moveTo(fx, y - fig * 4 + jitter);
      x.lineTo(fx + bs, y - fig * 4 + bs * 0.5 + jitter);
      x.lineTo(fx, y - fig * 4 + bs + jitter);
      x.closePath(); x.fill();
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 7 — FLYERS
 * ═════════════════════════════════════════════════════════════════════════ */
function paintFlyers(x, P, W, H, horizonY, kind, r) {
  if (kind === 'None') return;
  const n = rint(r, 4, 8);
  x.save();
  for (let i = 0; i < n; i++) {
    const fx = W * (0.1 + r() * 0.8);
    const fy = horizonY * (0.15 + r() * 0.5);
    const s = Math.min(W, H) * (0.02 + r() * 0.04) * (1 - i / n * 0.4);
    if (kind === 'Dragons') drawDragon(x, P, fx, fy, s, r);
    else if (kind === 'Airships') drawAirship(x, P, fx, fy, s, r);
    else if (kind === 'Griffins') drawGriffin(x, P, fx, fy, s, r);
  }
  x.restore();
}

function drawDragon(x, P, cx, cy, s, r) {
  x.fillStyle = mix(P.stone, '#000', 0.2);
  const flap = randn(r) * 0.4;
  // body
  x.beginPath();
  x.ellipse(cx, cy, s * 0.9, s * 0.3, 0.2, 0, Math.PI * 2); x.fill();
  // wings
  x.beginPath();
  x.moveTo(cx - s * 0.3, cy);
  x.quadraticCurveTo(cx - s * 1.4, cy - s * (1.0 + flap), cx - s * 2.0, cy + s * 0.2);
  x.quadraticCurveTo(cx - s * 1.2, cy + s * 0.2, cx - s * 0.3, cy + s * 0.1);
  x.closePath(); x.fill();
  x.beginPath();
  x.moveTo(cx + s * 0.3, cy);
  x.quadraticCurveTo(cx + s * 1.4, cy - s * (1.0 + flap), cx + s * 2.0, cy + s * 0.2);
  x.quadraticCurveTo(cx + s * 1.2, cy + s * 0.2, cx + s * 0.3, cy + s * 0.1);
  x.closePath(); x.fill();
  // tail
  x.strokeStyle = mix(P.stone, '#000', 0.2); x.lineWidth = s * 0.18;
  x.beginPath(); x.moveTo(cx + s * 0.8, cy); x.quadraticCurveTo(cx + s * 1.8, cy + s * 0.3, cx + s * 2.2, cy - s * 0.2); x.stroke();
}

function drawAirship(x, P, cx, cy, s, r) {
  // balloon
  x.fillStyle = mix(P.accent, P.stone, 0.3);
  x.beginPath(); x.ellipse(cx, cy, s * 1.4, s * 0.7, 0, 0, Math.PI * 2); x.fill();
  // stripe
  x.fillStyle = rgba(P.lit, 0.6);
  x.beginPath(); x.ellipse(cx, cy, s * 1.4, s * 0.24, 0, 0, Math.PI * 2); x.fill();
  // gondola
  x.fillStyle = mix(P.stone, '#000', 0.3);
  x.fillRect(cx - s * 0.5, cy + s * 0.7, s, s * 0.35);
  x.strokeStyle = mix(P.stone, '#000', 0.3); x.lineWidth = Math.max(0.6, s * 0.05);
  x.beginPath(); x.moveTo(cx - s * 0.5, cy + s * 0.6); x.lineTo(cx - s * 0.5, cy + s * 0.7);
  x.moveTo(cx + s * 0.5, cy + s * 0.6); x.lineTo(cx + s * 0.5, cy + s * 0.7); x.stroke();
}

function drawGriffin(x, P, cx, cy, s, r) {
  x.fillStyle = mix(P.stone, '#000', 0.15);
  const flap = randn(r) * 0.5;
  x.beginPath(); x.ellipse(cx, cy, s * 0.6, s * 0.25, 0.1, 0, Math.PI * 2); x.fill();
  // two swept wings (M shape)
  for (const dir of [-1, 1]) {
    x.beginPath();
    x.moveTo(cx, cy);
    x.quadraticCurveTo(cx + dir * s * 0.9, cy - s * (0.9 + flap), cx + dir * s * 1.5, cy - s * 0.3);
    x.lineTo(cx + dir * s * 0.5, cy);
    x.closePath(); x.fill();
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 8 — FOREGROUND RIDGE + lone standard
 * ═════════════════════════════════════════════════════════════════════════ */
function paintForeground(x, P, W, H, r) {
  const ridgeY = H * (0.88 + r() * 0.06);
  x.fillStyle = mix(P.stone, '#000', 0.55);
  x.beginPath();
  x.moveTo(0, H);
  x.lineTo(0, ridgeY + randn(r) * H * 0.02);
  const seg = 8;
  for (let i = 1; i <= seg; i++) {
    x.lineTo((i / seg) * W, ridgeY + randn(r) * H * 0.03);
  }
  x.lineTo(W, H);
  x.closePath(); x.fill();

  // lone banner-bearer figure on the ridge framing the scale
  const fx = W * (r() < 0.5 ? 0.12 + r() * 0.12 : 0.76 + r() * 0.12);
  const fh = H * 0.06;
  const fy = ridgeY + H * 0.005;
  x.fillStyle = '#000';
  x.fillRect(fx - fh * 0.06, fy - fh, fh * 0.12, fh);
  x.beginPath(); x.arc(fx, fy - fh, fh * 0.1, 0, Math.PI * 2); x.fill();
  // standard
  x.strokeStyle = '#000'; x.lineWidth = Math.max(1.2, fh * 0.05);
  x.beginPath(); x.moveTo(fx + fh * 0.2, fy); x.lineTo(fx + fh * 0.2, fy - fh * 1.8); x.stroke();
  x.fillStyle = P.accent;
  x.beginPath();
  x.moveTo(fx + fh * 0.2, fy - fh * 1.8);
  x.lineTo(fx + fh * 0.9, fy - fh * 1.6);
  x.lineTo(fx + fh * 0.2, fy - fh * 1.3);
  x.closePath(); x.fill();
}

/* Floating embers / sparks drifting up. */
function paintEmbers(x, P, W, H, n, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ex = r() * W, ey = H * (0.4 + r() * 0.55);
    const s = 0.6 + r() * 1.6;
    x.fillStyle = rgba(mix(P.glow, P.lit, r()), 0.3 + r() * 0.5);
    x.beginPath(); x.arc(ex, ey, s, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MASTER DRAW
 * ═════════════════════════════════════════════════════════════════════════ */
function draw(cv, p, r) {
  const P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const rm = realmMod(p.realm);

  const horizonY = H * (0.58 + r() * 0.08);

  // 1. SKY
  paintSky(x, P, W, H, horizonY, rm, r);
  if (p.skyHero === 'Aurora' || rm.star >= 1) paintAurora(x, P, W, H, horizonY, r);
  const hero = paintSkyHero(x, P, W, H, horizonY, p.skyHero, rm, r);
  if (rm.storm) paintStorm(x, P, W, horizonY, r);
  godrays(x, P, W, horizonY, hero.cx, hero.cy, r);

  // 2-3. MOUNTAINS + HAZE
  paintMountains(x, P, W, H, horizonY, rm, r);
  paintHaze(x, P, W, horizonY, rm, r);

  // 4-5. CITADEL + beacons
  const cit = paintCitadel(x, P, W, H, horizonY, p.camera, p.density, rm, r);
  for (const [bx, by] of cit.beacons) beaconFire(x, P, bx, by, Math.min(W, H) * 0.012, r);

  // ground plane below the citadel (the field/causeway/sea)
  const gpg = x.createLinearGradient(0, cit.groundY, 0, H);
  gpg.addColorStop(0, mix(P.stone, P.sky1, 0.12 * rm.horizonBoost));
  gpg.addColorStop(1, mix(P.stone, '#000', 0.5));
  x.fillStyle = gpg;
  x.fillRect(0, cit.groundY, W, H - cit.groundY);

  // 6. HOST
  paintHost(x, P, W, H, cit, p.density, p.camera, r);

  // 7. FLYERS
  paintFlyers(x, P, W, H, horizonY, p.flyers, r);

  // 8. FOREGROUND
  paintForeground(x, P, W, H, r);

  // 9. FINISH
  const emberN = Math.floor(W * H / 6000 * (p.realm === 'Storm Siege' || PALS[p.palI].name === 'Dragonfire' ? 1.6 : 0.7));
  paintEmbers(x, P, W, H, emberN, r);
  grain(x, W, H, 900, r);
  vignette(x, W, H, 0.42);
}

const empyreanTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

const empyreanSchema: TraitSchema = {
  traits: [
    { name: 'Palette', values: PALS.map((p) => p.name) },
    { name: 'Realm',   values: REALMS },
    { name: 'Sky',     values: SKYHERO },
    { name: 'Flyers',  values: FLYERS },
    { name: 'Camera',  values: CAMERA },
    { name: 'Host',    values: DENSITY },
    { name: 'Format',  values: ['Square', 'Tall', 'Wide'] },
  ],
};

const renderEmpyrean: EngineFn = blit(draw, empyreanTraits);

// W/H of Square, Tall, Wide (matches FMTS order).
const EMPYREAN_ASPECTS = [1, 0.776, 1.469] as const;

  return { draw, paramsOf, labels, empyreanSchema, EMPYREAN_ASPECTS };
})();

/* ASCENDANT look — the busy rebuilt world (rare) */
const NEW = (function () {
// @ts-nocheck
/*
 * EMPYREAN — by opus4-8. "A little explorable WORLD inside one frame."
 *
 * Not an abstract field, and not just an establishing shot — a DENSE, LEGIBLE,
 * LUMINOUS realm panorama the eye can wander through and keep discovering. One
 * epic wide scene built from many distinct REGIONS layered in atmospheric depth:
 * a hero CITADEL-CITY of many towers / walls / banners / lit windows / gates /
 * bridges on its crag; a HARBOUR with tiny sailing ships and sea-monsters; a
 * winding ROAD with a marching HOST / caravan; a VILLAGE with chimney smoke; an
 * ENCAMPMENT of tents + campfires; a stepped chain of WATCHTOWERS with lit
 * BEACON fires receding into haze; BRIDGES and an AQUEDUCT spanning a ravine;
 * ancient RUINS / standing stones / a colossal STATUE; a WATERFALL; FOREST
 * stands; FARM terraces; WILDLIFE in the sky and sea; mountains fading into
 * coloured haze; and a dramatic SKY OMEN. A rare WONDER (worldtree / floating
 * isle / god-lighthouse) crowns a few mints.
 *
 * COLOUR: saturated, high-chroma, BRIGHT. Vivid jewel skies, golden-hour,
 * aurora, rose, turquoise, vermilion. No near-black, no muddy grounds — grounds
 * are luminous, lifted toward the sky's light, with strong atmospheric colour
 * for depth (distant = pale/hazy toward the sky, near = richer + saturated).
 *
 * Compositing model (back → front), each its own pass:
 *   1. Luminous sky gradient + Sky Omen event + godrays + stars / aurora.
 *   2. Far mountain ranges (receding ridgelines, paler + hazier far).
 *   3. Atmospheric haze bands knitting the distance together.
 *   4. WONDER (rare) behind the city; distant watchtower beacon chain.
 *   5. The bright water plane / valley floor.
 *   6. Midground regions: harbour + ships, forests, farm terraces, ruins,
 *      statue, aqueduct, bridges, waterfall, village, encampment.
 *   7. The hero CITADEL-CITY on its crag (towers, walls, gates, banners, glow).
 *   8. The HOST / caravan on the winding road; ground detail.
 *   9. Flyers + sea wildlife crossing the scene.
 *  10. Foreground frame (terrace / standing stones / a lone herald).
 *  11. Finish: light bloom, embers, soft grain, gentle vignette.
 *
 * Determinism: every trait drawn in paramsOf(r) in a FIXED ORDER, so traits()
 * and draw() never disagree. Seed = rng(tokenId). The schema lists every value.
 */

/* ── REALMS — 12 named, saturated, LUMINOUS colour schemes ──────────────────
 * Each is a whole world's palette. Brightness is mandatory: skies are vivid,
 * grounds are lifted toward `lift` (never near-black), haze `far` carries
 * atmospheric perspective. sky0 = zenith, sky1 = horizon band, sky2 = the
 * brightest light kiss at the horizon. land = lush valley colour, stone = built
 * masonry, lit = window/beacon light, accent = banners/glow, water = sea/river.
 */
const REALMS = [
  { name: 'Auric Reach',     sky0: '#3a1d7a', sky1: '#ff9d3c', sky2: '#ffe8a8', land: '#3fb86a', stone: '#e7c98c', lit: '#fff0b0', accent: '#ff5a8a', water: '#36b6d8', far: '#c79ad8', lift: '#ffcf7a' },
  { name: 'Rosemarch',       sky0: '#7a1d6a', sky1: '#ff6ea0', sky2: '#ffe0d0', land: '#52c08a', stone: '#f0cfb0', lit: '#fff0d6', accent: '#ffd24a', water: '#3aa6d0', far: '#e29ad0', lift: '#ffb2c0' },
  { name: 'Emberfall',       sky0: '#5a1240', sky1: '#ff6a2a', sky2: '#ffd87a', land: '#cf8a3a', stone: '#e7b478', lit: '#ffe6a0', accent: '#ff3a5a', water: '#d06a3a', far: '#e0a070', lift: '#ffb866' },
  { name: 'Amaranth Sea',    sky0: '#2a1a8a', sky1: '#b85aff', sky2: '#ffd4f4', land: '#46c0b0', stone: '#e6cfd6', lit: '#ffe6ff', accent: '#ff7ad0', water: '#3aa8e0', far: '#c8a0f0', lift: '#c8b0f0' },
  { name: 'Goldhaven',       sky0: '#5a2a6a', sky1: '#ffc24a', sky2: '#fff4cc', land: '#7ac84a', stone: '#f0d6a0', lit: '#fff6c8', accent: '#ff7a3a', water: '#3ab0c8', far: '#e6c090', lift: '#ffd87a' },
  { name: 'Vermilion Gate',  sky0: '#6a1a2a', sky1: '#ff7a4a', sky2: '#ffe0a0', land: '#cf9a3a', stone: '#ecc088', lit: '#ffe6b0', accent: '#ffcf4a', water: '#d0743a', far: '#e6a878', lift: '#ffbe7a' },
  { name: 'Lapis Empire',    sky0: '#15208a', sky1: '#4a86ff', sky2: '#cfe0ff', land: '#3ac0c0', stone: '#e6dcc8', lit: '#fff0d6', accent: '#ffc24a', water: '#2a86e6', far: '#9fb6f0', lift: '#a0d8d8' },
  { name: 'Saffron Steppe',  sky0: '#7a3a1a', sky1: '#ffb04a', sky2: '#fff0c0', land: '#c8b03a', stone: '#ecd098', lit: '#fff6c0', accent: '#ff6a4a', water: '#3aaac0', far: '#e6c088', lift: '#ffd87a' },
];

/* Formats — W/H ratios live in EMPYREAN_ASPECTS below (same order). */
const FMTS = [
  { W: 1280, H: 1280, t: 'Square' },
  { W: 1040, H: 1340, t: 'Tall' },
  { W: 1480, H: 980,  t: 'Wide' },
];

/* ── LORE AXES — a world collectors decode ────────────────────────────────── */
const REALM_NAMES = REALMS.map((p) => p.name);

const ERA = ['Golden Age', 'Age of Embers', 'The Long Winter', 'Age of Sail', 'The Sundering', 'The Awakening'];
const SKY_OMEN = ['Great Moon', 'Ringed Planet', 'Portal Rift', 'Comet', 'Twin Suns', 'Aurora', 'Eclipse', 'Clear Heavens'];
const HOUSES = [
  { name: 'House Solara',  col: '#ffcf4a' },
  { name: 'House Cygnus',  col: '#5ad0ff' },
  { name: 'House Vermillon', col: '#ff4a5a' },
  { name: 'House Thorne',  col: '#46e07a' },
  { name: 'House Amethyne', col: '#c060ff' },
  { name: 'House Maris',   col: '#2ad0c0' },
  { name: 'House Aurelian', col: '#ff8a3a' },
  { name: 'House Rosaire', col: '#ff6ea0' },
];
const BEASTS = ['Dragon', 'Leviathan', 'Griffin', 'Wyrm', 'Roc', 'None'];
const SEASONS = ['Spring Bloom', 'High Summer', 'Amber Autumn', 'Deep Winter'];
const SCALE = ['Lone Keep', 'Walled Town', 'Marching Realm', 'Massed Empire'];
const VANTAGE = ['Citadel Left', 'Valley Causeway', 'High Overlook', 'Coastal Reach'];
const WONDERS = ['None', 'None', 'None', 'None', 'None', 'None', 'None', 'Worldtree', 'Floating Isle', 'God-Lighthouse'];

/* ── Param draw — FIXED ORDER (never reorder) ───────────────────────────────*/
function paramsOf(r) {
  const realmI  = Math.floor(r() * REALMS.length);
  const fmt     = pick(FMTS, r);
  const era     = pick(ERA, r);
  const omen    = pick(SKY_OMEN, r);
  const houseI  = Math.floor(r() * HOUSES.length);
  const beast   = pick(BEASTS, r);
  const season  = pick(SEASONS, r);
  const scale   = pick(SCALE, r);
  const vantage = pick(VANTAGE, r);
  const wonder  = pick(WONDERS, r);
  // Cast = the dominant mood. Murk (dark, atmospheric mythic) is STANDARD; the
  // luminous bright-realm look is the SUPER-RARE pull (~10%).
  const cast    = r() < 0.10 ? 'Luminous' : 'Murk';
  return { realmI, fmt, era, omen, houseI, beast, season, scale, vantage, wonder, cast };
}

function labels(p) {
  return {
    Realm:   REALMS[p.realmI].name,
    Era:     p.era,
    Omen:    p.omen,
    House:   HOUSES[p.houseI].name,
    Beast:   p.beast,
    Season:  p.season,
    Scale:   p.scale,
    Vantage: p.vantage,
    Wonder:  p.wonder,
    Cast:    p.cast,
    Format:  p.fmt.t,
  };
}

/* Era lighting modifiers — time-of-day / weather over the whole scene. */
function eraMod(era) {
  switch (era) {
    case 'Golden Age':      return { skyL: 0.10, hzn: 0.42, dark: 0.00, star: 0.15, storm: 0, warm: 0.20 };
    case 'Age of Embers':   return { skyL: 0.02, hzn: 0.46, dark: 0.06, star: 0.30, storm: 0, warm: 0.40 };
    case 'The Long Winter': return { skyL: 0.06, hzn: 0.30, dark: 0.04, star: 0.20, storm: 1, warm: -0.10 };
    case 'Age of Sail':     return { skyL: 0.08, hzn: 0.40, dark: 0.00, star: 0.10, storm: 0, warm: 0.10 };
    case 'The Sundering':   return { skyL: -0.02, hzn: 0.30, dark: 0.14, star: 0.55, storm: 1, warm: 0.15 };
    case 'The Awakening':   return { skyL: 0.00, hzn: 0.34, dark: 0.08, star: 0.70, storm: 0, warm: 0.10 };
    default:                return { skyL: 0.04, hzn: 0.38, dark: 0.05, star: 0.25, storm: 0, warm: 0.10 };
  }
}

/* Season tints the LAND colour (foliage/ground). */
function seasonLand(P, season) {
  switch (season) {
    case 'Spring Bloom': return mix(P.land, '#9fff7a', 0.18);
    case 'High Summer':  return mix(P.land, '#2ea85a', 0.10);
    case 'Amber Autumn': return mix(P.land, '#ff9a3a', 0.34);
    case 'Deep Winter':  return mix(P.land, '#eafaff', 0.46);
    default:             return P.land;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 1 — SKY (always luminous)
 * ═════════════════════════════════════════════════════════════════════════ */
function paintSky(x, P, W, H, horizonY, em, r) {
  const g = x.createLinearGradient(0, 0, 0, horizonY);
  g.addColorStop(0.00, mix(P.sky0, '#fff', clamp(0.04 + em.skyL, 0, 0.4)));
  g.addColorStop(0.42, mix(P.sky0, P.sky1, 0.45 + em.hzn * 0.3));
  g.addColorStop(0.78, mix(P.sky1, P.sky2, 0.40 + em.hzn * 0.3));
  g.addColorStop(1.00, mix(P.sky2, P.sky1, 0.30));
  x.fillStyle = g;
  x.fillRect(0, 0, W, horizonY + 2);

  // a narrow warm glow band hugging the horizon only (not a giant wash)
  const wg = x.createLinearGradient(0, horizonY * 0.7, 0, horizonY);
  wg.addColorStop(0, rgba(P.sky2, 0));
  wg.addColorStop(1, rgba(P.sky2, 0.10 + em.hzn * 0.08));
  x.save(); x.globalCompositeOperation = 'lighter';
  x.fillStyle = wg; x.fillRect(0, horizonY * 0.7, W, horizonY * 0.3 + 2);
  x.restore();

  // soft drifting clouds, lit underside — source-over, layered, restrained
  const clouds = rint(r, 4, 7);
  for (let i = 0; i < clouds; i++) {
    const cy = horizonY * (0.06 + r() * 0.42);
    const cx = r() * W;
    const cw = W * (0.12 + r() * 0.2), ch = cw * (0.14 + r() * 0.08);
    const top = mix(P.sky0, P.sky2, 0.4 + r() * 0.25);
    const under = mix(P.sky1, P.accent, 0.18 * Math.max(0, em.warm));
    x.save();
    for (let b = 0; b < 5; b++) {
      const bx = cx + (b - 2) * cw * 0.26 + randn(r) * cw * 0.1;
      const by = cy + randn(r) * ch * 0.3;
      const br = cw * (0.2 + r() * 0.14);
      const cg = x.createRadialGradient(bx, by - br * 0.2, 0, bx, by, br);
      cg.addColorStop(0, rgba(top, 0.5));
      cg.addColorStop(1, rgba(under, 0));
      x.fillStyle = cg;
      x.beginPath(); x.ellipse(bx, by, br, br * 0.55, 0, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }

  // stars (night-ish eras)
  if (em.star > 0.2) {
    const n = Math.floor(W * horizonY / 3200 * em.star);
    for (let i = 0; i < n; i++) {
      const sx = r() * W, sy = r() * horizonY * 0.7;
      const a = (0.25 + r() * 0.7) * em.star;
      const s = r() < 0.08 ? 1.8 : 0.9;
      x.fillStyle = rgba(mix('#ffffff', P.lit, 0.3), a);
      x.fillRect(sx, sy, s, s);
    }
  }
}

/* Aurora curtains. */
function paintAurora(x, P, W, H, horizonY, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const sheets = rint(r, 4, 6);
  for (let s = 0; s < sheets; s++) {
    const baseY = horizonY * (0.18 + r() * 0.4);
    const amp = horizonY * (0.08 + r() * 0.12);
    const hue = (s % 3 === 0) ? P.accent : (s % 3 === 1) ? P.lit : mix(P.accent, P.sky2, 0.5);
    x.beginPath();
    x.moveTo(0, baseY);
    const seg = 20;
    for (let i = 0; i <= seg; i++) {
      const px = (i / seg) * W;
      const py = baseY + Math.sin(i * 0.6 + s * 1.7) * amp + randn(r) * amp * 0.2;
      x.lineTo(px, py);
    }
    x.lineTo(W, 0); x.lineTo(0, 0); x.closePath();
    const g = x.createLinearGradient(0, baseY - amp, 0, baseY + amp * 2.4);
    g.addColorStop(0, rgba(hue, 0));
    g.addColorStop(0.45, rgba(hue, 0.20));
    g.addColorStop(1, rgba(hue, 0));
    x.fillStyle = g; x.fill();
  }
  x.restore();
}

/* Sky omen events — return the light source position for godrays. */
function paintSkyOmen(x, P, W, H, horizonY, omen, em, r) {
  const cx = W * (0.26 + r() * 0.48);
  const cy = horizonY * (0.20 + r() * 0.32);
  const R = Math.min(W, H) * (0.09 + r() * 0.06);
  x.save();

  if (omen === 'Great Moon') {
    x.globalCompositeOperation = 'lighter';
    const hg = x.createRadialGradient(cx, cy, 0, cx, cy, R * 3.2);
    hg.addColorStop(0, rgba(P.lit, 0.5)); hg.addColorStop(0.3, rgba(P.lit, 0.14)); hg.addColorStop(1, rgba(P.lit, 0));
    x.fillStyle = hg; x.fillRect(0, 0, W, horizonY);
    x.globalCompositeOperation = 'source-over';
    const dg = x.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
    dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.7, P.lit); dg.addColorStop(1, mix(P.lit, P.sky1, 0.4));
    x.fillStyle = dg; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 10; i++) {
      const a = r() * Math.PI * 2, rr = r() * R * 0.8;
      x.fillStyle = rgba(mix(P.lit, '#7a6a4a', 0.5), 0.16);
      x.beginPath(); x.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, R * (0.04 + r() * 0.08), 0, Math.PI * 2); x.fill();
    }
  } else if (omen === 'Ringed Planet') {
    x.globalCompositeOperation = 'lighter';
    const hg = x.createRadialGradient(cx, cy, 0, cx, cy, R * 2.8);
    hg.addColorStop(0, rgba(P.accent, 0.34)); hg.addColorStop(1, rgba(P.accent, 0));
    x.fillStyle = hg; x.fillRect(0, 0, W, horizonY);
    x.globalCompositeOperation = 'source-over';
    const dg = x.createRadialGradient(cx - R * 0.4, cy - R * 0.4, R * 0.1, cx, cy, R);
    dg.addColorStop(0, mix('#ffffff', P.accent, 0.2)); dg.addColorStop(0.6, P.accent); dg.addColorStop(1, mix(P.accent, P.sky0, 0.5));
    x.fillStyle = dg; x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
    x.save(); x.translate(cx, cy); x.rotate(-0.4);
    for (let i = 0; i < 3; i++) {
      x.strokeStyle = rgba(mix(P.lit, P.accent, i / 3), 0.55 - i * 0.1);
      x.lineWidth = R * (0.06 - i * 0.012);
      x.beginPath(); x.ellipse(0, 0, R * (1.5 + i * 0.18), R * (0.4 + i * 0.05), 0, 0, Math.PI * 2); x.stroke();
    }
    x.restore();
  } else if (omen === 'Portal Rift') {
    x.globalCompositeOperation = 'lighter';
    const px = cx, py = cy * 1.1, pw = R * 0.5, ph = R * 2.4;
    const hg = x.createRadialGradient(px, py, 0, px, py, ph);
    hg.addColorStop(0, rgba(P.lit, 0.7)); hg.addColorStop(0.3, rgba(P.accent, 0.32)); hg.addColorStop(1, rgba(P.accent, 0));
    x.fillStyle = hg; x.beginPath(); x.ellipse(px, py, pw * 2.2, ph, 0, 0, Math.PI * 2); x.fill();
    const cg = x.createLinearGradient(px, py - ph, px, py + ph);
    cg.addColorStop(0, rgba(P.accent, 0)); cg.addColorStop(0.5, rgba('#ffffff', 0.92)); cg.addColorStop(1, rgba(P.accent, 0));
    x.fillStyle = cg; x.beginPath(); x.ellipse(px, py, pw * 0.4, ph * 0.95, 0, 0, Math.PI * 2); x.fill();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + r() * 0.4;
      let lx = px, ly = py, len = R * (0.6 + r() * 1.0);
      x.strokeStyle = rgba(P.lit, 0.4); x.lineWidth = 1.4;
      x.beginPath(); x.moveTo(lx, ly);
      for (let s = 0; s < 5; s++) { lx += Math.cos(a) * len / 5 + randn(r) * R * 0.08; ly += Math.sin(a) * len / 5 + randn(r) * R * 0.08; x.lineTo(lx, ly); }
      x.stroke();
    }
  } else if (omen === 'Comet') {
    x.globalCompositeOperation = 'lighter';
    const tx = W * (0.66 + r() * 0.22), ty = horizonY * (0.12 + r() * 0.15);
    const ta = Math.PI * 0.78, tlen = Math.min(W, H) * (0.5 + r() * 0.3);
    const ex = tx + Math.cos(ta) * tlen, ey = ty + Math.sin(ta) * tlen;
    const tg = x.createLinearGradient(tx, ty, ex, ey);
    tg.addColorStop(0, rgba('#ffffff', 0.92)); tg.addColorStop(0.4, rgba(P.lit, 0.4)); tg.addColorStop(1, rgba(P.lit, 0));
    x.strokeStyle = tg; x.lineCap = 'round'; x.lineWidth = R * 0.5;
    x.beginPath(); x.moveTo(tx, ty); x.lineTo(ex, ey); x.stroke();
    const hg = x.createRadialGradient(tx, ty, 0, tx, ty, R * 0.7);
    hg.addColorStop(0, '#ffffff'); hg.addColorStop(0.4, P.lit); hg.addColorStop(1, rgba(P.lit, 0));
    x.fillStyle = hg; x.beginPath(); x.arc(tx, ty, R * 0.7, 0, Math.PI * 2); x.fill();
    return { cx: tx, cy: ty, R };
  } else if (omen === 'Twin Suns') {
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const sx = cx + (i === 0 ? -R * 1.3 : R * 1.3), sy = cy + (i === 0 ? 0 : R * 0.5);
      const rr = R * (i === 0 ? 0.9 : 0.6);
      const hg = x.createRadialGradient(sx, sy, 0, sx, sy, rr * 3.2);
      hg.addColorStop(0, rgba(P.sky2, 0.5)); hg.addColorStop(1, rgba(P.sky2, 0));
      x.fillStyle = hg; x.fillRect(0, 0, W, horizonY);
      const dg = x.createRadialGradient(sx, sy, 0, sx, sy, rr);
      dg.addColorStop(0, '#ffffff'); dg.addColorStop(0.6, P.lit); dg.addColorStop(1, P.accent);
      x.fillStyle = dg; x.beginPath(); x.arc(sx, sy, rr, 0, Math.PI * 2); x.fill();
    }
  } else if (omen === 'Eclipse') {
    x.globalCompositeOperation = 'lighter';
    const hg = x.createRadialGradient(cx, cy, R * 0.7, cx, cy, R * 3.4);
    hg.addColorStop(0, rgba(P.lit, 0.85)); hg.addColorStop(0.16, rgba(P.accent, 0.5)); hg.addColorStop(1, rgba(P.accent, 0));
    x.fillStyle = hg; x.fillRect(0, 0, W, horizonY);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = mix(P.sky0, '#000', 0.5);
    x.beginPath(); x.arc(cx, cy, R * 0.92, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba('#ffffff', 0.9); x.lineWidth = R * 0.05;
    x.beginPath(); x.arc(cx, cy, R * 0.95, 0, Math.PI * 2); x.stroke();
  } else if (omen === 'Aurora' || omen === 'Clear Heavens') {
    x.globalCompositeOperation = 'lighter';
    const dg = x.createRadialGradient(cx, cy, 0, cx, cy, R * 0.8);
    dg.addColorStop(0, mix('#ffffff', P.lit, 0.2)); dg.addColorStop(1, rgba(P.lit, 0));
    x.fillStyle = dg; x.beginPath(); x.arc(cx, cy, R * 0.8, 0, Math.PI * 2); x.fill();
  }
  x.restore();
  return { cx, cy, R };
}

/* Godrays fanning down from the light source. */
function godrays(x, P, W, horizonY, ox, oy, em, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const n = rint(r, 4, 7);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * (0.55 + r() * 0.4);
    const len = horizonY * (0.8 + r() * 0.7);
    const w = W * (0.012 + r() * 0.03);
    const ex = ox + Math.cos(a) * len, ey = oy + Math.sin(a) * len;
    const g = x.createLinearGradient(ox, oy, ex, ey);
    g.addColorStop(0, rgba(P.sky2, 0.05 + r() * 0.04));
    g.addColorStop(1, rgba(P.sky2, 0));
    x.strokeStyle = g; x.lineWidth = w; x.lineCap = 'round';
    x.beginPath(); x.moveTo(ox, oy); x.lineTo(ex, ey); x.stroke();
  }
  x.restore();
}

/* Storm clouds + lightning (winter / sundering). */
function paintStorm(x, P, W, horizonY, r) {
  x.save();
  for (let i = 0; i < 6; i++) {
    const cx = r() * W, cy = horizonY * (0.08 + r() * 0.38);
    const rw = W * (0.12 + r() * 0.2), rh = rw * 0.4;
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rw);
    g.addColorStop(0, rgba(mix(P.sky0, '#2a2a44', 0.5), 0.42)); g.addColorStop(1, rgba(P.sky0, 0));
    x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, rw, rh, 0, 0, Math.PI * 2); x.fill();
  }
  x.globalCompositeOperation = 'lighter';
  const bolts = rint(r, 1, 2);
  for (let b = 0; b < bolts; b++) {
    let lx = r() * W, ly = horizonY * 0.14;
    x.strokeStyle = rgba('#ffffff', 0.85); x.lineWidth = 2.2;
    x.beginPath(); x.moveTo(lx, ly);
    for (let s = 0; s < 7; s++) { lx += randn(r) * W * 0.04; ly += horizonY * 0.07; x.lineTo(lx, ly); }
    x.stroke();
  }
  x.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 2 — MOUNTAINS (receding ridgelines, atmospheric perspective)
 * ═════════════════════════════════════════════════════════════════════════ */
function ridgeline(x, W, baseY, amp, rough, r, fill, jag, snow, snowCol) {
  x.beginPath();
  x.moveTo(0, baseY + amp);
  const seg = jag ? rint(r, 9, 15) : rint(r, 5, 8);
  let prevY = baseY;
  const peaks = [];
  for (let i = 0; i <= seg; i++) {
    const px = (i / seg) * W;
    const peak = baseY - amp * (0.4 + r() * 0.95) * (jag ? 1 : 0.7);
    const py = (prevY + (peak - prevY) * 0.7) + randn(r) * amp * rough;
    if (jag && i > 0 && i < seg) {
      const mx = (px + (i - 1) / seg * W) / 2;
      x.lineTo(mx, (prevY + py) / 2 + amp * 0.1);
    }
    x.lineTo(px, py);
    peaks.push([px, py]);
    prevY = py;
  }
  x.lineTo(W, baseY + amp);
  x.closePath();
  x.fillStyle = fill;
  x.fill();
  // snow caps on near jagged ridges
  if (snow) {
    x.save();
    x.fillStyle = rgba(snowCol, 0.5);
    for (let i = 1; i < peaks.length - 1; i++) {
      const [px, py] = peaks[i];
      if (py < baseY - amp * 0.5) {
        x.beginPath();
        x.moveTo(px, py);
        x.lineTo(px - amp * 0.18, py + amp * 0.28);
        x.lineTo(px + amp * 0.18, py + amp * 0.28);
        x.closePath(); x.fill();
      }
    }
    x.restore();
  }
  return peaks;
}

function paintMountains(x, P, W, H, horizonY, em, season, r) {
  const layers = 4;
  const snowCol = mix(P.sky2, '#ffffff', 0.4);
  for (let i = 0; i < layers; i++) {
    const t = i / (layers - 1); // 0 far → 1 near
    const baseY = horizonY * (0.50 + t * 0.46);
    const amp = horizonY * (0.12 + t * 0.24);
    // atmospheric perspective: far ridges nearly the haze colour; near ridges
    // are DARK + saturated so the world reads with depth (not pale tan).
    const far = mix(P.far, P.sky2, 0.40 * (1 - t));
    const near = mix(mix(P.far, '#090b18', 0.58), P.land, 0.22);
    const fill = mix(far, near, Math.pow(t, 0.82));
    ridgeline(x, W, baseY, amp, 0.25, r, fill, t > 0.35,
      (t > 0.55 && (season === 'Deep Winter' || r() < 0.5)), snowCol);
  }
}

/* Horizon haze band — knits the distance, lifts the value. */
function paintHaze(x, P, W, horizonY, em, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const bandTop = horizonY * 0.78;
  const g = x.createLinearGradient(0, bandTop, 0, horizonY * 1.06);
  g.addColorStop(0, rgba(P.far, 0));
  g.addColorStop(0.5, rgba(mix(P.far, P.sky2, 0.5), 0.16 + em.hzn * 0.12));
  g.addColorStop(1, rgba(P.far, 0));
  x.fillStyle = g;
  x.fillRect(0, bandTop - horizonY * 0.1, W, horizonY * 0.45);
  x.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 4 — WONDER (rare) + distant watchtower beacon chain
 * ═════════════════════════════════════════════════════════════════════════ */
function paintWonder(x, P, W, H, horizonY, wonder, em, r) {
  if (wonder === 'None') return;
  x.save();
  if (wonder === 'Worldtree') {
    // colossal luminous tree spanning much of the frame, behind the city
    const tx = W * (0.30 + r() * 0.4), baseY = horizonY * 1.02, topY = H * 0.08;
    const trunkW = W * 0.03;
    // glow (restrained — must not blow out the sky)
    x.globalCompositeOperation = 'lighter';
    const gg = x.createRadialGradient(tx, horizonY * 0.45, 0, tx, horizonY * 0.45, W * 0.3);
    gg.addColorStop(0, rgba(P.lit, 0.1)); gg.addColorStop(1, rgba(P.lit, 0));
    x.fillStyle = gg; x.fillRect(0, 0, W, horizonY);
    x.globalCompositeOperation = 'source-over';
    // trunk
    const tg = x.createLinearGradient(tx, baseY, tx, topY);
    tg.addColorStop(0, mix(P.stone, '#000', 0.1)); tg.addColorStop(1, mix(P.stone, P.lit, 0.3));
    x.fillStyle = tg;
    x.beginPath();
    x.moveTo(tx - trunkW, baseY); x.lineTo(tx - trunkW * 0.3, topY);
    x.lineTo(tx + trunkW * 0.3, topY); x.lineTo(tx + trunkW, baseY); x.closePath(); x.fill();
    // branches
    x.strokeStyle = mix(P.stone, P.lit, 0.25); x.lineCap = 'round';
    function branch(bx, by, ang, len, w, d) {
      if (d <= 0 || len < 6) return;
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      x.lineWidth = w; x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
      branch(ex, ey, ang - 0.4 - r() * 0.3, len * 0.7, w * 0.7, d - 1);
      branch(ex, ey, ang + 0.4 + r() * 0.3, len * 0.7, w * 0.7, d - 1);
    }
    const crownY = H * 0.32;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI / 2 + (i - 3) * 0.34;
      branch(tx, crownY, a, H * 0.12, trunkW * 0.5, 4);
    }
    // luminous canopy blobs (source-over leaves with subtle glow, not a white-out)
    for (let i = 0; i < 70; i++) {
      const a = r() * Math.PI * 2, rr = r() * W * 0.24;
      const lx = tx + Math.cos(a) * rr, ly = crownY - Math.abs(Math.sin(a)) * rr * 0.7 - r() * H * 0.12;
      x.fillStyle = rgba(mix(P.land, P.lit, 0.4 + r() * 0.3), 0.5);
      x.beginPath(); x.arc(lx, ly, W * (0.012 + r() * 0.03), 0, Math.PI * 2); x.fill();
    }
    // a few bright fireflies in the canopy
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 24; i++) {
      const a = r() * Math.PI * 2, rr = r() * W * 0.22;
      const lx = tx + Math.cos(a) * rr, ly = crownY - Math.abs(Math.sin(a)) * rr * 0.7 - r() * H * 0.1;
      x.fillStyle = rgba(P.accent, 0.4);
      x.beginPath(); x.arc(lx, ly, W * 0.004, 0, Math.PI * 2); x.fill();
    }
  } else if (wonder === 'Floating Isle') {
    const ix = W * (0.5 + randn(r) * 0.18), iy = horizonY * (0.30 + r() * 0.18);
    const iw = W * (0.18 + r() * 0.08);
    // glow under
    x.globalCompositeOperation = 'lighter';
    const gg = x.createRadialGradient(ix, iy + iw * 0.4, 0, ix, iy + iw * 0.4, iw * 1.4);
    gg.addColorStop(0, rgba(P.lit, 0.3)); gg.addColorStop(1, rgba(P.lit, 0));
    x.fillStyle = gg; x.beginPath(); x.arc(ix, iy + iw * 0.4, iw * 1.4, 0, Math.PI * 2); x.fill();
    x.globalCompositeOperation = 'source-over';
    // isle body (inverted craggy cone)
    x.fillStyle = mix(P.stone, P.land, 0.4);
    x.beginPath();
    x.moveTo(ix - iw, iy); x.lineTo(ix + iw, iy);
    x.lineTo(ix + iw * 0.2, iy + iw * 0.9); x.lineTo(ix, iy + iw * 1.2);
    x.lineTo(ix - iw * 0.3, iy + iw * 0.8); x.closePath(); x.fill();
    // green top
    x.fillStyle = mix(P.land, P.lit, 0.2);
    x.beginPath(); x.ellipse(ix, iy, iw, iw * 0.22, 0, 0, Math.PI * 2); x.fill();
    // little spire on top
    x.fillStyle = mix(P.stone, P.lit, 0.3);
    x.fillRect(ix - iw * 0.05, iy - iw * 0.4, iw * 0.1, iw * 0.4);
    // waterfall trailing off
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = rgba(mix(P.water, '#fff', 0.5), 0.5); x.lineWidth = iw * 0.04;
    x.beginPath(); x.moveTo(ix, iy + iw * 1.2); x.lineTo(ix + randn(r) * iw * 0.2, iy + iw * 2.4); x.stroke();
  } else if (wonder === 'God-Lighthouse') {
    const lx = W * (0.5 + randn(r) * 0.22), baseY = horizonY * 1.0;
    const h = H * (0.34 + r() * 0.1), w = W * 0.026;
    // beam
    x.globalCompositeOperation = 'lighter';
    const beamA = -Math.PI / 2 - 0.5 - r() * 0.4;
    const blen = W * 0.6;
    const bx2 = lx + Math.cos(beamA) * blen, by2 = baseY - h + Math.sin(beamA) * blen;
    const bg = x.createLinearGradient(lx, baseY - h, bx2, by2);
    bg.addColorStop(0, rgba(P.lit, 0.55)); bg.addColorStop(1, rgba(P.lit, 0));
    x.strokeStyle = bg; x.lineWidth = w * 2.2; x.lineCap = 'round';
    x.beginPath(); x.moveTo(lx, baseY - h); x.lineTo(bx2, by2); x.stroke();
    x.globalCompositeOperation = 'source-over';
    // tower
    const tg = x.createLinearGradient(lx - w, 0, lx + w, 0);
    tg.addColorStop(0, mix(P.stone, '#000', 0.15)); tg.addColorStop(1, mix(P.stone, P.lit, 0.25));
    x.fillStyle = tg;
    x.beginPath();
    x.moveTo(lx - w * 1.4, baseY); x.lineTo(lx - w * 0.5, baseY - h);
    x.lineTo(lx + w * 0.5, baseY - h); x.lineTo(lx + w * 1.4, baseY); x.closePath(); x.fill();
    // lantern
    x.globalCompositeOperation = 'lighter';
    const lg = x.createRadialGradient(lx, baseY - h, 0, lx, baseY - h, w * 4);
    lg.addColorStop(0, rgba('#ffffff', 0.9)); lg.addColorStop(0.4, rgba(P.lit, 0.5)); lg.addColorStop(1, rgba(P.lit, 0));
    x.fillStyle = lg; x.beginPath(); x.arc(lx, baseY - h, w * 4, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* A chain of small watchtowers + beacons stepping into the distance. */
function paintWatchChain(x, P, W, H, horizonY, em, r) {
  const n = rint(r, 3, 6);
  const beacons = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1);
    const tx = W * (0.06 + t * 0.88) + randn(r) * W * 0.02;
    const ty = horizonY * (0.84 - t * 0.12) + randn(r) * horizonY * 0.02;
    const sc = (0.5 + t * 1.0) * Math.min(W, H) * 0.012;
    const hazed = mix(P.stone, P.far, 0.6 - t * 0.4);
    // small tower
    x.fillStyle = hazed;
    x.fillRect(tx - sc * 0.5, ty - sc * 3, sc, sc * 3);
    x.beginPath(); x.moveTo(tx - sc * 0.7, ty - sc * 3); x.lineTo(tx + sc * 0.7, ty - sc * 3); x.lineTo(tx, ty - sc * 4.2); x.closePath(); x.fill();
    if (r() < 0.7) beacons.push([tx, ty - sc * 3.6, sc * 0.7]);
  }
  return beacons;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * LAYER 5-6 — VALLEY FLOOR + WATER + REGIONS
 * ═════════════════════════════════════════════════════════════════════════ */
function paintGround(x, P, W, H, horizonY, landCol, em, hasWater, r) {
  // lush, LUMINOUS valley floor — lifted toward sky light, never near-black
  const g = x.createLinearGradient(0, horizonY, 0, H);
  g.addColorStop(0, mix(landCol, P.sky2, 0.42));      // far field melts into haze
  g.addColorStop(0.4, mix(landCol, P.lift, 0.25));
  g.addColorStop(1, mix(landCol, P.lift, 0.12));       // near foreground still bright
  x.fillStyle = g;
  x.fillRect(0, horizonY - 1, W, H - horizonY + 1);

  // rolling tonal bands for depth
  x.save(); x.globalCompositeOperation = 'soft-light';
  for (let i = 0; i < 6; i++) {
    const yy = horizonY + (H - horizonY) * (i / 6) + randn(r) * H * 0.01;
    const band = i % 2 === 0 ? mix(landCol, '#ffffff', 0.2) : mix(landCol, '#000', 0.12);
    x.fillStyle = rgba(band, 0.4);
    x.beginPath();
    x.moveTo(0, yy);
    for (let s = 0; s <= 8; s++) x.lineTo(s / 8 * W, yy + Math.sin(s * 0.8 + i) * H * 0.012);
    x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill();
  }
  x.restore();
}

/* A bright water plane (harbour / lake) on one side with sun-glitter. */
function paintWater(x, P, W, H, horizonY, side, em, r) {
  const top = horizonY * 1.0;
  const bot = H * (0.72 + r() * 0.12);
  const x0 = side === 'left' ? 0 : W * 0.5;
  const x1 = side === 'left' ? W * 0.5 : W;
  const g = x.createLinearGradient(0, top, 0, bot);
  g.addColorStop(0, mix(P.water, P.sky2, 0.55));
  g.addColorStop(1, mix(P.water, P.lift, 0.2));
  x.save();
  x.beginPath(); x.rect(x0, top, x1 - x0, bot - top); x.clip();
  x.fillStyle = g; x.fillRect(x0, top, x1 - x0, bot - top);
  // sun-glitter streaks
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 40; i++) {
    const yy = top + (bot - top) * r();
    const ww = (x1 - x0) * (0.02 + r() * 0.1);
    const xx = x0 + r() * (x1 - x0);
    x.fillStyle = rgba(mix(P.sky2, '#ffffff', 0.4), 0.06 + r() * 0.14);
    x.fillRect(xx, yy, ww, 1.4);
  }
  x.restore();
  return { top, bot, x0, x1 };
}

/* Tiny sailing ships on the water. */
function drawShips(x, P, W, H, water, house, n, r) {
  for (let i = 0; i < n; i++) {
    const t = r();
    const sx = water.x0 + (water.x1 - water.x0) * (0.1 + r() * 0.8);
    const sy = water.top + (water.bot - water.top) * (0.1 + t * 0.7);
    const s = (0.4 + t * 1.0) * Math.min(W, H) * 0.018;
    // hull
    x.fillStyle = mix(P.stone, '#000', 0.4);
    x.beginPath();
    x.moveTo(sx - s, sy); x.quadraticCurveTo(sx, sy + s * 0.5, sx + s, sy);
    x.closePath(); x.fill();
    // mast
    x.strokeStyle = mix(P.stone, '#000', 0.4); x.lineWidth = Math.max(0.6, s * 0.1);
    x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx, sy - s * 1.8); x.stroke();
    // sails
    x.fillStyle = rgba(mix('#ffffff', house, 0.3), 0.92);
    x.beginPath();
    x.moveTo(sx, sy - s * 1.7); x.lineTo(sx + s * 0.9, sy - s * 0.3); x.lineTo(sx, sy - s * 0.3); x.closePath(); x.fill();
    x.fillStyle = rgba(house, 0.85);
    x.beginPath();
    x.moveTo(sx, sy - s * 1.7); x.lineTo(sx - s * 0.7, sy - s * 0.3); x.lineTo(sx, sy - s * 0.3); x.closePath(); x.fill();
    // reflection
    x.save(); x.globalAlpha = 0.25;
    x.fillStyle = house; x.fillRect(sx - s * 0.3, sy + s * 0.2, s * 0.6, s * 0.8);
    x.restore();
  }
}

/* A forest stand — clustered conifer/round trees. */
function drawForest(x, P, cx, cy, w, depth, landCol, season, r) {
  const n = Math.floor(w / 6) + 6;
  const dark = mix(landCol, '#0a3a2a', 0.35 - depth * 0.2);
  const leaf = season === 'Amber Autumn' ? mix(dark, '#ff9a3a', 0.4)
             : season === 'Deep Winter' ? mix(dark, '#eafaff', 0.3)
             : mix(dark, '#39e08a', 0.2);
  for (let i = 0; i < n; i++) {
    const tx = cx + (r() - 0.5) * w;
    const ty = cy + (r() - 0.5) * w * 0.3;
    const th = w * (0.05 + r() * 0.09) * (0.6 + depth);
    x.fillStyle = mix(leaf, P.far, (1 - depth) * 0.5);
    if (r() < 0.6) {
      // conifer triangle
      x.beginPath();
      x.moveTo(tx, ty - th); x.lineTo(tx - th * 0.4, ty); x.lineTo(tx + th * 0.4, ty); x.closePath(); x.fill();
    } else {
      x.beginPath(); x.arc(tx, ty - th * 0.5, th * 0.45, 0, Math.PI * 2); x.fill();
    }
  }
}

/* Farm terraces — stepped fields on a hillside. */
function drawTerraces(x, P, cx, cy, w, h, landCol, r) {
  const rows = rint(r, 4, 7);
  for (let i = 0; i < rows; i++) {
    const t = i / rows;
    const yy = cy - h * 0.5 + h * t;
    const tone = i % 2 === 0 ? mix(landCol, '#ffe08a', 0.35) : mix(landCol, '#9fe06a', 0.3);
    x.fillStyle = rgba(tone, 0.85);
    x.beginPath();
    x.moveTo(cx - w * 0.5 * (1 - t * 0.2), yy);
    x.quadraticCurveTo(cx, yy + h * 0.04, cx + w * 0.5 * (1 - t * 0.2), yy);
    x.lineTo(cx + w * 0.5 * (1 - (t + 1 / rows) * 0.2), yy + h / rows);
    x.quadraticCurveTo(cx, yy + h / rows + h * 0.04, cx - w * 0.5 * (1 - (t + 1 / rows) * 0.2), yy + h / rows);
    x.closePath(); x.fill();
    // furrow lines
    x.strokeStyle = rgba(mix(tone, '#000', 0.2), 0.4); x.lineWidth = 0.6;
    x.beginPath(); x.moveTo(cx - w * 0.45, yy + h / rows * 0.5); x.lineTo(cx + w * 0.45, yy + h / rows * 0.5); x.stroke();
  }
}

/* Ancient ruins / standing stones. */
function drawRuins(x, P, cx, cy, s, r) {
  const cols = rint(r, 4, 7);
  for (let i = 0; i < cols; i++) {
    const t = i / (cols - 1);
    const px = cx - s + t * s * 2;
    const broken = r() < 0.4;
    const h = s * (broken ? 0.3 + r() * 0.3 : 0.7 + r() * 0.3);
    x.fillStyle = mix(P.stone, P.lit, 0.15);
    x.fillRect(px - s * 0.08, cy - h, s * 0.16, h);
    // capital
    if (!broken) x.fillRect(px - s * 0.13, cy - h - s * 0.05, s * 0.26, s * 0.05);
  }
  // fallen lintel
  x.save(); x.translate(cx + s * 0.2, cy - s * 0.05); x.rotate(0.1);
  x.fillStyle = mix(P.stone, '#000', 0.1); x.fillRect(-s * 0.5, -s * 0.05, s * 0.7, s * 0.1);
  x.restore();
}

/* A colossal statue / monument. */
function drawStatue(x, P, cx, baseY, h, house, r) {
  const w = h * 0.3;
  // plinth
  x.fillStyle = mix(P.stone, '#000', 0.15);
  x.fillRect(cx - w * 0.7, baseY - h * 0.12, w * 1.4, h * 0.12);
  // body (robed figure silhouette)
  const g = x.createLinearGradient(cx - w, 0, cx + w, 0);
  g.addColorStop(0, mix(P.stone, '#000', 0.1)); g.addColorStop(1, mix(P.stone, P.lit, 0.3));
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(cx - w * 0.5, baseY - h * 0.12);
  x.lineTo(cx - w * 0.32, baseY - h * 0.8);
  x.lineTo(cx - w * 0.12, baseY - h * 0.92);
  x.quadraticCurveTo(cx, baseY - h, cx + w * 0.12, baseY - h * 0.92);
  x.lineTo(cx + w * 0.32, baseY - h * 0.8);
  x.lineTo(cx + w * 0.5, baseY - h * 0.12);
  x.closePath(); x.fill();
  // head
  x.beginPath(); x.arc(cx, baseY - h * 0.86, w * 0.16, 0, Math.PI * 2); x.fill();
  // raised arm with a banner/torch
  x.strokeStyle = g; x.lineWidth = w * 0.12; x.lineCap = 'round';
  x.beginPath(); x.moveTo(cx + w * 0.1, baseY - h * 0.7); x.lineTo(cx + w * 0.5, baseY - h * 0.95); x.stroke();
  x.save(); x.globalCompositeOperation = 'lighter';
  const tg = x.createRadialGradient(cx + w * 0.5, baseY - h * 0.97, 0, cx + w * 0.5, baseY - h * 0.97, w * 0.6);
  tg.addColorStop(0, rgba(house, 0.8)); tg.addColorStop(1, rgba(house, 0));
  x.fillStyle = tg; x.beginPath(); x.arc(cx + w * 0.5, baseY - h * 0.97, w * 0.6, 0, Math.PI * 2); x.fill();
  x.restore();
}

/* An aqueduct / arched bridge spanning a gap. */
function drawAqueduct(x, P, x0, x1, topY, baseY, r) {
  const arches = Math.max(3, Math.floor((x1 - x0) / ((baseY - topY) * 0.9)));
  const aw = (x1 - x0) / arches;
  x.fillStyle = mix(P.stone, P.lit, 0.12);
  // deck
  x.fillRect(x0, topY, x1 - x0, (baseY - topY) * 0.16);
  // piers + arches (cut out arches by drawing piers)
  for (let i = 0; i <= arches; i++) {
    const px = x0 + i * aw;
    x.fillRect(px - aw * 0.12, topY, aw * 0.24, baseY - topY);
  }
  for (let i = 0; i < arches; i++) {
    const px = x0 + i * aw + aw * 0.5;
    x.fillStyle = mix(P.stone, P.lit, 0.04);
    x.beginPath();
    x.arc(px, topY + (baseY - topY) * 0.16, aw * 0.36, 0, Math.PI, false);
    x.fill();
    x.fillStyle = mix(P.stone, P.lit, 0.12);
  }
}

/* A village — cluster of little houses with smoking chimneys. */
function drawVillage(x, P, cx, baseY, w, house, em, r) {
  const n = rint(r, 5, 10);
  const smokes = [];
  for (let i = 0; i < n; i++) {
    const hx = cx + (r() - 0.5) * w;
    const hy = baseY + (r() - 0.5) * w * 0.18;
    const hw = w * (0.05 + r() * 0.04), hh = hw * (0.7 + r() * 0.3);
    // body
    x.fillStyle = mix(P.stone, P.lift, 0.2);
    x.fillRect(hx - hw * 0.5, hy - hh, hw, hh);
    // roof (house-coloured tint, subtle)
    x.fillStyle = mix(P.stone, house, 0.3);
    x.beginPath();
    x.moveTo(hx - hw * 0.62, hy - hh); x.lineTo(hx + hw * 0.62, hy - hh); x.lineTo(hx, hy - hh - hw * 0.5); x.closePath(); x.fill();
    // lit window
    if (em.star > 0.2 || r() < 0.5) {
      x.fillStyle = rgba(P.lit, 0.85);
      x.fillRect(hx - hw * 0.15, hy - hh * 0.55, hw * 0.3, hh * 0.3);
    }
    // chimney + smoke source
    if (r() < 0.7) smokes.push([hx + hw * 0.3, hy - hh - hw * 0.4, hw]);
  }
  return smokes;
}

/* Chimney / campfire smoke plume drifting up. */
function drawSmoke(x, P, sx, sy, w, em, r) {
  x.save();
  x.globalCompositeOperation = 'screen';
  const puffs = rint(r, 4, 7);
  const drift = randn(r) * w * 0.4;
  for (let i = 0; i < puffs; i++) {
    const t = i / puffs;
    const px = sx + drift * t + randn(r) * w * 0.2;
    const py = sy - t * w * 4;
    const pr = w * (0.4 + t * 1.2);
    x.fillStyle = rgba(mix('#ffffff', P.sky2, 0.4), (1 - t) * 0.22);
    x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* An encampment — tents + campfires. */
function drawCamp(x, P, cx, baseY, w, house, r) {
  const n = rint(r, 4, 8);
  const fires = [];
  for (let i = 0; i < n; i++) {
    const tx = cx + (r() - 0.5) * w;
    const ty = baseY + (r() - 0.5) * w * 0.2;
    const tw = w * (0.05 + r() * 0.03), th = tw * 0.9;
    // tent
    x.fillStyle = mix(P.stone, P.lift, 0.3);
    x.beginPath();
    x.moveTo(tx - tw * 0.5, ty); x.lineTo(tx, ty - th); x.lineTo(tx + tw * 0.5, ty); x.closePath(); x.fill();
    // pennant
    x.strokeStyle = mix(P.stone, '#000', 0.3); x.lineWidth = 0.8;
    x.beginPath(); x.moveTo(tx, ty - th); x.lineTo(tx, ty - th - tw * 0.5); x.stroke();
    x.fillStyle = house;
    x.beginPath(); x.moveTo(tx, ty - th - tw * 0.5); x.lineTo(tx + tw * 0.4, ty - th - tw * 0.35); x.lineTo(tx, ty - th - tw * 0.2); x.closePath(); x.fill();
    if (r() < 0.5) fires.push([tx + tw, ty, tw * 0.5]);
  }
  return fires;
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE HERO CITADEL-CITY
 * ═════════════════════════════════════════════════════════════════════════ */
function drawTower(x, P, bx, by, w, h, lit, house, em, r) {
  // body with a subtle lit-side gradient (not flat black)
  const g = x.createLinearGradient(bx - w / 2, 0, bx + w / 2, 0);
  g.addColorStop(0, mix(P.stone, '#000', 0.22));
  g.addColorStop(1, mix(P.stone, P.lit, 0.18));
  x.fillStyle = g;
  x.fillRect(bx - w / 2, by - h, w, h);
  // crenellations
  const merlons = Math.max(2, Math.floor(w / 6));
  x.fillStyle = mix(P.stone, '#000', 0.1);
  for (let m = 0; m < merlons; m++) {
    if (m % 2 === 0) x.fillRect(bx - w / 2 + m * (w / merlons), by - h - w * 0.18, w / merlons, w * 0.18);
  }
  // conical roof on some (house-tinted)
  if (r() < 0.5) {
    x.fillStyle = mix(P.stone, house, 0.5);
    x.beginPath();
    x.moveTo(bx - w * 0.65, by - h); x.lineTo(bx + w * 0.65, by - h); x.lineTo(bx, by - h - w * 1.2); x.closePath(); x.fill();
  }
  // lit windows
  const rows = Math.max(1, Math.floor(h / (w * 0.7)));
  for (let ry = 0; ry < rows; ry++) {
    for (let cxn = 0; cxn < 2; cxn++) {
      if (r() < (em.star > 0.2 ? 0.7 : 0.5)) {
        const wx = bx - w * 0.22 + cxn * w * 0.44;
        const wy = by - h + w * 0.4 + ry * (w * 0.7);
        x.fillStyle = rgba(lit, 0.7 + r() * 0.3);
        x.fillRect(wx - w * 0.07, wy, w * 0.14, w * 0.22);
      }
    }
  }
}

function drawBanner(x, P, bx, by, h, col, r) {
  x.strokeStyle = mix(P.stone, '#000', 0.3); x.lineWidth = Math.max(1, h * 0.04);
  x.beginPath(); x.moveTo(bx, by); x.lineTo(bx, by - h); x.stroke();
  const fw = h * 0.5, fh = h * 0.34;
  const sway = randn(r) * fw * 0.2;
  x.fillStyle = col;
  x.beginPath();
  x.moveTo(bx, by - h); x.lineTo(bx + fw + sway, by - h + fh * 0.5); x.lineTo(bx, by - h + fh); x.closePath(); x.fill();
}

function paintCitadel(x, P, W, H, horizonY, vantage, scale, house, em, r) {
  let cragX, cragW;
  if (vantage === 'Citadel Left')        { cragX = W * 0.26; cragW = W * 0.34; }
  else if (vantage === 'Coastal Reach')  { cragX = W * 0.72; cragW = W * 0.34; }
  else if (vantage === 'Valley Causeway'){ cragX = W * 0.5;  cragW = W * 0.32; }
  else                                    { cragX = W * 0.5;  cragW = W * 0.46; } // overlook = wide spire-city

  const groundY = horizonY * 1.0;
  const baseY = groundY - H * 0.01;
  const cragTop = baseY - H * (0.12 + r() * 0.06);

  // crag silhouette — a DARK saturated rock mass (lit rim only at the very top)
  // so the lit stone towers read against it instead of a pale slab.
  const rock = mix(mix(P.far, '#0b0916', 0.55), P.accent, 0.14);
  const cg = x.createLinearGradient(0, cragTop, 0, groundY + H * 0.1);
  cg.addColorStop(0, mix(rock, P.lit, 0.34));
  cg.addColorStop(0.14, rock);
  cg.addColorStop(1, mix(rock, '#000000', 0.45));
  x.fillStyle = cg;
  x.beginPath();
  x.moveTo(cragX - cragW / 2, groundY + H * 0.12);
  x.lineTo(cragX - cragW / 2 + cragW * 0.08, cragTop + H * 0.02);
  x.lineTo(cragX - cragW * 0.2, cragTop);
  x.lineTo(cragX + cragW * 0.25, cragTop - H * 0.01);
  x.lineTo(cragX + cragW / 2 - cragW * 0.05, cragTop + H * 0.03);
  x.lineTo(cragX + cragW / 2, groundY + H * 0.12);
  x.closePath(); x.fill();
  // rock striations for texture
  x.save(); x.clip();
  x.strokeStyle = rgba(mix(rock, '#000', 0.4), 0.3); x.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const yy = cragTop + (groundY + H * 0.12 - cragTop) * (i / 8);
    x.beginPath(); x.moveTo(cragX - cragW, yy + randn(r) * H * 0.01);
    x.lineTo(cragX + cragW, yy + randn(r) * H * 0.01); x.stroke();
  }
  x.restore();

  // gate at the base of the crag
  x.fillStyle = mix(P.stone, '#000', 0.4);
  const gateW = cragW * 0.08, gateX = cragX, gateY = groundY + H * 0.02;
  x.beginPath();
  x.moveTo(gateX - gateW * 0.5, gateY);
  x.lineTo(gateX - gateW * 0.5, gateY - H * 0.04);
  x.arc(gateX, gateY - H * 0.04, gateW * 0.5, Math.PI, 0);
  x.lineTo(gateX + gateW * 0.5, gateY); x.closePath(); x.fill();
  // gate lantern glow
  x.save(); x.globalCompositeOperation = 'lighter';
  const glg = x.createRadialGradient(gateX, gateY - H * 0.03, 0, gateX, gateY - H * 0.03, gateW);
  glg.addColorStop(0, rgba(P.lit, 0.7)); glg.addColorStop(1, rgba(P.lit, 0));
  x.fillStyle = glg; x.beginPath(); x.arc(gateX, gateY - H * 0.03, gateW, 0, Math.PI * 2); x.fill();
  x.restore();

  // curtain wall
  const wallY = cragTop;
  const wg = x.createLinearGradient(0, wallY, 0, wallY + H * 0.05);
  wg.addColorStop(0, mix(P.stone, P.lit, 0.12)); wg.addColorStop(1, mix(P.stone, '#000', 0.12));
  x.fillStyle = wg;
  x.fillRect(cragX - cragW * 0.42, wallY, cragW * 0.84, H * 0.05);
  const wm = Math.floor(cragW / (W * 0.02));
  x.fillStyle = mix(P.stone, P.lit, 0.12);
  for (let m = 0; m < wm; m++) {
    if (m % 2 === 0) x.fillRect(cragX - cragW * 0.42 + m * (cragW * 0.84 / wm), wallY - H * 0.012, cragW * 0.84 / wm, H * 0.012);
  }

  // towers — count scales with realm size
  const towerN = scale === 'Lone Keep' ? rint(r, 3, 5)
               : scale === 'Walled Town' ? rint(r, 5, 8)
               : scale === 'Marching Realm' ? rint(r, 8, 12)
               : rint(r, 12, 18);
  const span = cragW * 0.8;
  const beacons = [];
  for (let i = 0; i < towerN; i++) {
    const t = towerN > 1 ? i / (towerN - 1) : 0.5;
    const tx = cragX - span / 2 + t * span + randn(r) * W * 0.008;
    const central = 1 - Math.abs(t - 0.5) * 1.4;
    const th = H * (0.05 + 0.11 * Math.max(0, central) + r() * 0.03);
    const tw = W * (0.016 + 0.013 * Math.max(0, central) + r() * 0.005);
    drawTower(x, P, tx, wallY + H * 0.005, tw, th, P.lit, house, em, r);
    if (central > 0.3 || r() < 0.4) drawBanner(x, P, tx, wallY - th + H * 0.005, H * (0.03 + r() * 0.02), house, r);
    if (r() < 0.35) beacons.push([tx, wallY - th + H * 0.005, Math.min(W, H) * 0.01]);
  }

  // hero keep — tall central spire
  const keepX = cragX + randn(r) * W * 0.02;
  const keepH = H * (0.17 + r() * 0.06);
  const keepW = W * (0.028 + r() * 0.012);
  drawTower(x, P, keepX, wallY + H * 0.005, keepW, keepH, P.lit, house, em, r);
  drawBanner(x, P, keepX, wallY - keepH + H * 0.005, H * 0.055, house, r);
  beacons.push([keepX, wallY - keepH + H * 0.005, Math.min(W, H) * 0.013]);

  // city light bloom behind the silhouette
  x.save(); x.globalCompositeOperation = 'lighter';
  const bloom = x.createRadialGradient(cragX, wallY, 0, cragX, wallY, cragW * 0.7);
  bloom.addColorStop(0, rgba(P.lit, 0.14)); bloom.addColorStop(1, rgba(P.lit, 0));
  x.fillStyle = bloom; x.fillRect(cragX - cragW, wallY - H * 0.2, cragW * 2, cragW);
  x.restore();

  return { cragX, cragW, wallY, groundY, baseY, cragTop, beacons };
}

/* A bridge across a ravine, linking the city to an outpost. */
function drawBridge(x, P, x0, y0, x1, y1, r) {
  const sag = Math.abs(x1 - x0) * 0.12;
  // deck
  x.strokeStyle = mix(P.stone, P.lit, 0.1); x.lineWidth = Math.max(2, Math.abs(x1 - x0) * 0.012);
  x.beginPath();
  x.moveTo(x0, y0);
  x.quadraticCurveTo((x0 + x1) / 2, Math.max(y0, y1) + sag, x1, y1);
  x.stroke();
  // suspension posts
  x.lineWidth = Math.max(1, Math.abs(x1 - x0) * 0.005);
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    const mx = x0 + (x1 - x0) * t;
    const my = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (Math.max(y0, y1) + sag) + t * t * y1;
    x.beginPath(); x.moveTo(mx, my); x.lineTo(mx, my - sag * 0.8); x.stroke();
  }
}

/* A waterfall down a cliff. */
function drawWaterfall(x, P, cx, topY, botY, w, r) {
  x.save();
  const g = x.createLinearGradient(cx, topY, cx, botY);
  g.addColorStop(0, rgba(mix(P.water, '#ffffff', 0.6), 0.85));
  g.addColorStop(1, rgba(mix(P.water, '#ffffff', 0.3), 0.5));
  x.fillStyle = g;
  x.beginPath();
  x.moveTo(cx - w * 0.5, topY);
  x.lineTo(cx + w * 0.5, topY);
  x.lineTo(cx + w * 0.7, botY);
  x.lineTo(cx - w * 0.7, botY);
  x.closePath(); x.fill();
  // streaks
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 8; i++) {
    const xx = cx + (r() - 0.5) * w;
    x.strokeStyle = rgba('#ffffff', 0.2 + r() * 0.3); x.lineWidth = 0.8 + r();
    x.beginPath(); x.moveTo(xx, topY); x.lineTo(xx + randn(r) * w * 0.1, botY); x.stroke();
  }
  // mist pool
  const mg = x.createRadialGradient(cx, botY, 0, cx, botY, w * 1.4);
  mg.addColorStop(0, rgba('#ffffff', 0.4)); mg.addColorStop(1, rgba('#ffffff', 0));
  x.fillStyle = mg; x.beginPath(); x.ellipse(cx, botY, w * 1.4, w * 0.5, 0, 0, Math.PI * 2); x.fill();
  x.restore();
}

/* Beacon / campfire flame + glow on a point. */
function beaconFire(x, P, bx, by, scale, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  const g = x.createRadialGradient(bx, by, 0, bx, by, scale * 6);
  g.addColorStop(0, rgba(P.lit, 0.6)); g.addColorStop(0.4, rgba(P.accent, 0.22)); g.addColorStop(1, rgba(P.accent, 0));
  x.fillStyle = g; x.beginPath(); x.arc(bx, by, scale * 6, 0, Math.PI * 2); x.fill();
  for (let i = 0; i < 4; i++) {
    const fx = bx + randn(r) * scale * 0.6;
    const fh = scale * (1.4 + r() * 1.2);
    const fg = x.createLinearGradient(fx, by, fx, by - fh);
    fg.addColorStop(0, rgba('#fff7d0', 0.9)); fg.addColorStop(0.5, rgba(P.accent, 0.7)); fg.addColorStop(1, rgba(P.accent, 0));
    x.fillStyle = fg;
    x.beginPath();
    x.moveTo(fx - scale * 0.4, by);
    x.quadraticCurveTo(fx + randn(r) * scale, by - fh * 0.6, fx, by - fh);
    x.quadraticCurveTo(fx - randn(r) * scale, by - fh * 0.6, fx + scale * 0.4, by);
    x.closePath(); x.fill();
  }
  x.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * THE HOST / CARAVAN on the winding road
 * ═════════════════════════════════════════════════════════════════════════ */
function paintRoad(x, P, W, H, cit, vantage, r) {
  // a luminous winding road from foreground up toward the gate
  const gx = cit.cragX, gy = cit.groundY + H * 0.03;
  const startX = W * (0.3 + r() * 0.4), startY = H * 0.99;
  x.save();
  const rg = x.createLinearGradient(0, gy, 0, startY);
  rg.addColorStop(0, mix(P.lift, P.sky2, 0.3)); rg.addColorStop(1, mix(P.lift, '#ffffff', 0.18));
  x.strokeStyle = rg; x.lineCap = 'round';
  const c1x = (startX + gx) / 2 + (r() - 0.5) * W * 0.3;
  // taper width with distance
  for (let seg = 0; seg < 14; seg++) {
    const t0 = seg / 14, t1 = (seg + 1) / 14;
    const p0 = bez(startX, startY, c1x, (startY + gy) / 2, gx, gy, t0);
    const p1 = bez(startX, startY, c1x, (startY + gy) / 2, gx, gy, t1);
    x.lineWidth = (1 - t0) * W * 0.04 + W * 0.004;
    x.beginPath(); x.moveTo(p0[0], p0[1]); x.lineTo(p1[0], p1[1]); x.stroke();
  }
  x.restore();
  return { startX, startY, c1x, gx, gy };
}
function bez(x0, y0, cx, cy, x1, y1, t) {
  const mt = 1 - t;
  return [mt * mt * x0 + 2 * mt * t * cx + t * t * x1, mt * mt * y0 + 2 * mt * t * cy + t * t * y1];
}

function paintHost(x, P, W, H, cit, road, scale, house, r) {
  if (scale === 'Lone Keep') {
    // sparse honour guard near the gate
    drawMarchers(x, P, road, 0.55, 0.95, 8, house, r);
    return;
  }
  const density = scale === 'Walled Town' ? 16 : scale === 'Marching Realm' ? 34 : 60;
  drawMarchers(x, P, road, 0.1, 0.98, density, house, r);
}

function drawMarchers(x, P, road, t0, t1, count, house, r) {
  for (let i = 0; i < count; i++) {
    const t = t0 + (t1 - t0) * (i / Math.max(1, count - 1)) + randn(r) * 0.01;
    const p = bez(road.startX, road.startY, road.c1x, (road.startY + road.gy) / 2, road.gx, road.gy, t);
    // perspective scale: near (t→1) large, far (t→0) tiny
    const sz = (3 + t * 16);
    const lane = (r() - 0.5) * (6 + t * 30);
    const fx = p[0] + lane, fy = p[1];
    const col = mix(P.stone, '#000', 0.35);
    x.strokeStyle = col; x.lineWidth = Math.max(0.8, sz * 0.28); x.lineCap = 'round';
    x.beginPath(); x.moveTo(fx, fy); x.lineTo(fx, fy - sz); x.stroke();
    x.fillStyle = col;
    x.beginPath(); x.arc(fx, fy - sz * 1.1, sz * 0.22, 0, Math.PI * 2); x.fill();
    // banner-bearers
    if (i % 5 === 2) {
      x.strokeStyle = mix(col, '#000', 0.2); x.lineWidth = Math.max(0.6, sz * 0.16);
      x.beginPath(); x.moveTo(fx, fy - sz); x.lineTo(fx, fy - sz * 2.4); x.stroke();
      x.fillStyle = rgba(house, 0.9);
      x.beginPath();
      x.moveTo(fx, fy - sz * 2.4); x.lineTo(fx + sz * 0.7, fy - sz * 2.1); x.lineTo(fx, fy - sz * 1.9); x.closePath(); x.fill();
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * WILDLIFE — flyers (sky) + the great beast
 * ═════════════════════════════════════════════════════════════════════════ */
function birdSkein(x, P, W, horizonY, r) {
  const n = rint(r, 8, 16);
  const ox = W * (0.2 + r() * 0.5), oy = horizonY * (0.2 + r() * 0.3);
  const col = mix(P.stone, '#000', 0.3);
  for (let i = 0; i < n; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const step = Math.ceil(i / 2);
    const bx = ox + side * step * W * 0.012;
    const by = oy + step * horizonY * 0.012;
    const s = Math.min(W, horizonY) * 0.008 * (1 - step * 0.03);
    x.strokeStyle = col; x.lineWidth = Math.max(0.6, s * 0.3); x.lineCap = 'round';
    x.beginPath();
    x.moveTo(bx - s, by + s * 0.4); x.lineTo(bx, by); x.lineTo(bx + s, by + s * 0.4); x.stroke();
  }
}

function drawDragon(x, P, cx, cy, s, house, r) {
  const g = x.createLinearGradient(cx - s * 2, cy, cx + s * 2, cy);
  g.addColorStop(0, mix(P.stone, house, 0.2)); g.addColorStop(1, mix(P.stone, '#000', 0.2));
  x.fillStyle = g;
  const flap = randn(r) * 0.4;
  x.beginPath(); x.ellipse(cx, cy, s * 0.9, s * 0.3, 0.2, 0, Math.PI * 2); x.fill();
  for (const dir of [-1, 1]) {
    x.beginPath();
    x.moveTo(cx + dir * s * 0.3, cy);
    x.quadraticCurveTo(cx + dir * s * 1.4, cy - s * (1.0 + flap), cx + dir * s * 2.0, cy + s * 0.2);
    x.quadraticCurveTo(cx + dir * s * 1.2, cy + s * 0.2, cx + dir * s * 0.3, cy + s * 0.1);
    x.closePath(); x.fill();
  }
  x.strokeStyle = mix(P.stone, '#000', 0.2); x.lineWidth = s * 0.18; x.lineCap = 'round';
  x.beginPath(); x.moveTo(cx + s * 0.8, cy); x.quadraticCurveTo(cx + s * 1.8, cy + s * 0.3, cx + s * 2.2, cy - s * 0.2); x.stroke();
}

function drawGriffin(x, P, cx, cy, s, r) {
  x.fillStyle = mix(P.stone, '#000', 0.15);
  const flap = randn(r) * 0.5;
  x.beginPath(); x.ellipse(cx, cy, s * 0.6, s * 0.25, 0.1, 0, Math.PI * 2); x.fill();
  for (const dir of [-1, 1]) {
    x.beginPath();
    x.moveTo(cx, cy);
    x.quadraticCurveTo(cx + dir * s * 0.9, cy - s * (0.9 + flap), cx + dir * s * 1.5, cy - s * 0.3);
    x.lineTo(cx + dir * s * 0.5, cy); x.closePath(); x.fill();
  }
}

function drawRoc(x, P, cx, cy, s, r) {
  // huge eagle silhouette
  x.fillStyle = mix(P.stone, '#000', 0.2);
  const flap = randn(r) * 0.3;
  x.beginPath(); x.ellipse(cx, cy, s * 0.5, s * 0.22, 0, 0, Math.PI * 2); x.fill();
  for (const dir of [-1, 1]) {
    x.beginPath();
    x.moveTo(cx, cy);
    x.quadraticCurveTo(cx + dir * s * 1.6, cy - s * (1.2 + flap), cx + dir * s * 2.6, cy + s * 0.5);
    x.quadraticCurveTo(cx + dir * s * 1.4, cy + s * 0.4, cx, cy + s * 0.1);
    x.closePath(); x.fill();
  }
}

function paintFlyers(x, P, W, H, horizonY, beast, house, r) {
  // always a skein of birds for life
  birdSkein(x, P, W, horizonY, r);
  if (beast === 'None') return;
  if (beast === 'Dragon') {
    const n = rint(r, 2, 4);
    for (let i = 0; i < n; i++) {
      const s = Math.min(W, H) * (0.03 + r() * 0.05) * (1 - i * 0.18);
      drawDragon(x, P, W * (0.15 + r() * 0.7), horizonY * (0.18 + r() * 0.4), s, house, r);
    }
  } else if (beast === 'Griffin') {
    const n = rint(r, 3, 6);
    for (let i = 0; i < n; i++) drawGriffin(x, P, W * (0.1 + r() * 0.8), horizonY * (0.2 + r() * 0.45), Math.min(W, H) * (0.02 + r() * 0.03), r);
  } else if (beast === 'Roc') {
    drawRoc(x, P, W * (0.3 + r() * 0.4), horizonY * (0.22 + r() * 0.3), Math.min(W, H) * 0.05, r);
  }
  // Leviathan / Wyrm are drawn in the water/ground passes (see draw()).
}

function drawLeviathan(x, P, water, s, r) {
  // coils breaching the water surface
  const cx = water.x0 + (water.x1 - water.x0) * (0.3 + r() * 0.4);
  const cy = water.top + (water.bot - water.top) * (0.4 + r() * 0.3);
  x.save();
  x.fillStyle = mix(P.water, '#000', 0.35);
  const coils = rint(r, 3, 5);
  for (let i = 0; i < coils; i++) {
    const hx = cx + (i - coils / 2) * s * 1.4;
    x.beginPath(); x.arc(hx, cy, s * (0.5 + r() * 0.3), Math.PI, 0); x.fill();
  }
  // head
  x.beginPath(); x.ellipse(cx - coils / 2 * s * 1.4 - s, cy - s * 0.4, s * 0.6, s * 0.4, -0.4, 0, Math.PI * 2); x.fill();
  // spray
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 10; i++) {
    x.fillStyle = rgba('#ffffff', 0.2 + r() * 0.2);
    x.beginPath(); x.arc(cx + randn(r) * s * 2, cy - s - r() * s * 2, 1 + r() * 2, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

function drawWyrm(x, P, cx, cy, s, house, r) {
  // a serpentine wyrm undulating across the land/sky
  x.save();
  x.strokeStyle = mix(P.stone, house, 0.2); x.lineCap = 'round';
  const segs = 10;
  let px = cx, py = cy;
  for (let i = 0; i < segs; i++) {
    const nx = px + s * 1.2, ny = cy + Math.sin(i * 0.9 + r()) * s * 0.8;
    x.lineWidth = s * (1.0 - i * 0.07);
    x.beginPath(); x.moveTo(px, py); x.lineTo(nx, ny); x.stroke();
    px = nx; py = ny;
  }
  x.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * FOREGROUND FRAME
 * ═════════════════════════════════════════════════════════════════════════ */
function paintForeground(x, P, W, H, landCol, house, season, r) {
  const ridgeY = H * (0.9 + r() * 0.05);
  // luminous foreground rise (still bright — grass/rock catching light), not black
  const fg = x.createLinearGradient(0, ridgeY - H * 0.05, 0, H);
  fg.addColorStop(0, mix(landCol, P.lift, 0.3));
  fg.addColorStop(1, mix(landCol, '#1a2a1a', 0.45));
  x.fillStyle = fg;
  x.beginPath();
  x.moveTo(0, H); x.lineTo(0, ridgeY + randn(r) * H * 0.02);
  const seg = 8;
  for (let i = 1; i <= seg; i++) x.lineTo((i / seg) * W, ridgeY + randn(r) * H * 0.03);
  x.lineTo(W, H); x.closePath(); x.fill();

  // foreground detail: standing stones or grasses + a lone herald
  const tufts = rint(r, 20, 40);
  x.strokeStyle = mix(landCol, '#0a2a0a', 0.4); x.lineCap = 'round';
  for (let i = 0; i < tufts; i++) {
    const gx = r() * W, gy = ridgeY + r() * (H - ridgeY) * 0.6 + H * 0.02;
    const gh = H * (0.01 + r() * 0.02);
    x.lineWidth = 1 + r();
    x.beginPath(); x.moveTo(gx, gy); x.lineTo(gx + randn(r) * gh * 0.5, gy - gh); x.stroke();
  }

  // lone herald with the house standard, anchoring scale
  const fx = W * (r() < 0.5 ? 0.1 + r() * 0.12 : 0.78 + r() * 0.12);
  const fh = H * 0.07;
  const fy = ridgeY + H * 0.02;
  x.fillStyle = mix(P.stone, '#000', 0.5);
  x.fillRect(fx - fh * 0.06, fy - fh, fh * 0.12, fh);
  x.beginPath(); x.arc(fx, fy - fh, fh * 0.1, 0, Math.PI * 2); x.fill();
  x.strokeStyle = mix(P.stone, '#000', 0.5); x.lineWidth = Math.max(1.2, fh * 0.05);
  x.beginPath(); x.moveTo(fx + fh * 0.2, fy); x.lineTo(fx + fh * 0.2, fy - fh * 1.9); x.stroke();
  x.fillStyle = house;
  x.beginPath();
  x.moveTo(fx + fh * 0.2, fy - fh * 1.9); x.lineTo(fx + fh * 0.95, fy - fh * 1.7); x.lineTo(fx + fh * 0.2, fy - fh * 1.35); x.closePath(); x.fill();
}

/* Floating embers / pollen / snow drifting (season-aware). */
function paintMotes(x, P, W, H, n, season, em, r) {
  x.save();
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < n; i++) {
    const ex = r() * W, ey = H * (0.3 + r() * 0.68);
    const s = 0.6 + r() * 1.8;
    let col;
    if (season === 'Deep Winter') col = mix('#ffffff', P.sky2, r() * 0.4);
    else if (season === 'Spring Bloom') col = mix(P.accent, '#ffffff', r() * 0.5);
    else col = mix(P.lit, P.accent, r());
    x.fillStyle = rgba(col, 0.25 + r() * 0.5);
    x.beginPath(); x.arc(ex, ey, s, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* ═══════════════════════════════════════════════════════════════════════════
 * MASTER DRAW
 * ═════════════════════════════════════════════════════════════════════════ */
function draw(cv, p, r) {
  const P = REALMS[p.realmI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const em = eraMod(p.era);
  const house = HOUSES[p.houseI].col;
  const landCol = seasonLand(P, p.season);

  const horizonY = H * (0.54 + r() * 0.08);
  // murk: the STANDARD dark, atmospheric mythic mood. Luminous is the semi-rare
  // bright pull. Eras/eclipse push murk deeper still.
  const murk = p.cast === 'Murk'
    ? Math.min(0.66, 0.44 + em.dark * 1.6 + (p.omen === 'Eclipse' ? 0.1 : 0))
    : Math.max(0.14, Math.min(0.26, 0.14 + em.dark * 1.1 + (p.omen === 'Eclipse' ? 0.14 : 0)));

  // 1. SKY
  paintSky(x, P, W, H, horizonY, em, r);
  if (p.omen === 'Aurora' || em.star >= 0.5) paintAurora(x, P, W, H, horizonY, r);
  const omenPos = paintSkyOmen(x, P, W, H, horizonY, p.omen, em, r);
  if (em.storm) paintStorm(x, P, W, horizonY, r);
  godrays(x, P, W, horizonY, omenPos.cx, omenPos.cy, em, r);

  // 2-3. MOUNTAINS + HAZE
  paintMountains(x, P, W, H, horizonY, em, p.season, r);
  paintHaze(x, P, W, horizonY, em, r);

  // 4. WONDER (rare) + distant watchtower beacon chain
  paintWonder(x, P, W, H, horizonY, p.wonder, em, r);
  const chainBeacons = paintWatchChain(x, P, W, H, horizonY, em, r);

  // 5. GROUND + WATER
  const coastal = p.vantage === 'Coastal Reach' || p.era === 'Age of Sail';
  paintGround(x, P, W, H, horizonY, landCol, em, coastal, r);
  let water = null;
  if (coastal) {
    const side = p.vantage === 'Coastal Reach' ? 'left' : (r() < 0.5 ? 'left' : 'right');
    water = paintWater(x, P, W, H, horizonY, side, em, r);
  }

  // 6. MIDGROUND REGIONS (depth-sorted-ish back→front)
  const gy = horizonY * 1.0;
  // forests on the far hills
  drawForest(x, P, W * (0.12 + r() * 0.2), gy + H * 0.04, W * 0.22, 0.4, landCol, p.season, r);
  drawForest(x, P, W * (0.6 + r() * 0.25), gy + H * 0.05, W * 0.2, 0.5, landCol, p.season, r);
  // farm terraces on a hillside
  if (r() < 0.7) drawTerraces(x, P, W * (0.18 + r() * 0.16), gy + H * 0.12, W * 0.2, H * 0.1, landCol, r);
  // ruins / standing stones
  if (r() < 0.65) drawRuins(x, P, W * (0.62 + r() * 0.24), gy + H * 0.1, Math.min(W, H) * 0.05, r);
  // colossal statue
  if (r() < 0.5) drawStatue(x, P, W * (0.08 + r() * 0.1), gy + H * 0.16, H * 0.18, house, r);
  // aqueduct spanning a dip
  if (r() < 0.55) {
    const ax0 = W * (0.05 + r() * 0.1);
    drawAqueduct(x, P, ax0, ax0 + W * (0.2 + r() * 0.12), gy + H * 0.02, gy + H * 0.1, r);
  }

  // atmospheric depth I — sink the far/mid world so the hero city + foreground
  // read with real depth (the bright sky above the horizon is left untouched).
  {
    const deep = mix(P.sky0, '#05060e', 0.5);
    const dg = x.createLinearGradient(0, horizonY * 0.84, 0, H);
    dg.addColorStop(0, rgba(deep, 0));
    dg.addColorStop(0.6, rgba(deep, 0.14 + murk * 0.3));
    dg.addColorStop(1, rgba(deep, 0.30 + murk * 0.45));
    x.fillStyle = dg; x.fillRect(0, horizonY * 0.82, W, H - horizonY * 0.82);
  }

  // 7. HERO CITADEL-CITY + beacons
  const cit = paintCitadel(x, P, W, H, horizonY, p.vantage, p.scale, house, em, r);
  // bridge to an outpost crag
  if (p.vantage === 'High Overlook' || p.vantage === 'Valley Causeway' || r() < 0.4) {
    const dir = r() < 0.5 ? -1 : 1;
    const ox = cit.cragX + dir * cit.cragW * 0.75;
    drawBridge(x, P, cit.cragX + dir * cit.cragW * 0.42, cit.wallY + H * 0.04, ox, cit.wallY + H * 0.06, r);
    drawTower(x, P, ox, cit.wallY + H * 0.06, W * 0.02, H * 0.07, P.lit, house, em, r);
  }
  // waterfall off the crag (sometimes)
  if (r() < 0.4) drawWaterfall(x, P, cit.cragX + cit.cragW * (r() < 0.5 ? -0.3 : 0.3), cit.cragTop + H * 0.04, cit.groundY + H * 0.06, W * 0.018, r);

  // village + encampment with smoke/fire
  const smokes = drawVillage(x, P, W * (0.4 + r() * 0.3), gy + H * 0.16, W * 0.18, house, em, r);
  for (const [sx, sy, sw] of smokes) drawSmoke(x, P, sx, sy, sw, em, r);
  const fires = drawCamp(x, P, W * (0.66 + r() * 0.2), gy + H * 0.2, W * 0.14, house, r);

  // light all the beacon fires (city + watch chain)
  for (const [bx, by, sc] of cit.beacons) beaconFire(x, P, bx, by, sc, r);
  for (const [bx, by, sc] of chainBeacons) beaconFire(x, P, bx, by, sc, r);
  for (const [fx, fy, fs] of fires) { beaconFire(x, P, fx, fy, fs, r); drawSmoke(x, P, fx, fy - fs, fs * 1.4, em, r); }

  // 8. ROAD + HOST / caravan
  const road = paintRoad(x, P, W, H, cit, p.vantage, r);
  paintHost(x, P, W, H, cit, road, p.scale, house, r);

  // 9. WILDLIFE — flyers + beast
  paintFlyers(x, P, W, H, horizonY, p.beast, house, r);
  if (p.beast === 'Leviathan' && water) drawLeviathan(x, P, water, Math.min(W, H) * 0.02, r);
  else if (p.beast === 'Leviathan' && !water) { /* no sea: show as distant flyer instead */ drawRoc(x, P, W * 0.5, horizonY * 0.3, Math.min(W, H) * 0.04, r); }
  if (p.beast === 'Wyrm') drawWyrm(x, P, W * (0.2 + r() * 0.3), gy + H * 0.08, Math.min(W, H) * 0.012, house, r);

  // 10. FOREGROUND FRAME
  paintForeground(x, P, W, H, landCol, house, p.season, r);

  // atmospheric depth II — a foreground sink to ground the frame + a faint murk
  // veil over the whole scene on the rare moody eras (keeps the sky readable).
  {
    const deep = mix(P.sky0, '#04050c', 0.5);
    const dg = x.createLinearGradient(0, H * 0.62, 0, H);
    dg.addColorStop(0, rgba(deep, 0));
    dg.addColorStop(1, rgba(deep, 0.18 + murk * 0.35));
    x.fillStyle = dg; x.fillRect(0, H * 0.6, W, H * 0.4);
    if (murk > 0.05) {
      // the murk mood: a deep saturated atmospheric veil over the whole frame
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = rgba(mix(P.sky0, '#08060f', 0.35), murk * 0.85);
      x.fillRect(0, 0, W, H);
      x.restore();
      // a touch of cool moonlight re-lift on the upper sky so it reads night, not mud
      x.save(); x.globalCompositeOperation = 'screen';
      const sg = x.createLinearGradient(0, 0, 0, horizonY);
      sg.addColorStop(0, rgba(mix(P.sky1, '#6a7aff', 0.4), murk * 0.18));
      sg.addColorStop(1, rgba(P.sky1, 0));
      x.fillStyle = sg; x.fillRect(0, 0, W, horizonY);
      x.restore();
    }
  }

  // 11. FINISH
  const moteN = Math.floor(W * H / 7000 * (p.era === 'Age of Embers' || P.name === 'Emberfall' ? 1.6 : p.season === 'Deep Winter' ? 1.3 : 0.8));
  paintMotes(x, P, W, H, moteN, p.season, em, r);
  grain(x, W, H, 1100, r);
  vignette(x, W, H, 0.34);
}

const empyreanTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

const empyreanSchema: TraitSchema = {
  traits: [
    { name: 'Realm',   values: REALM_NAMES },
    { name: 'Era',     values: ERA },
    { name: 'Omen',    values: SKY_OMEN },
    { name: 'House',   values: HOUSES.map((h) => h.name) },
    { name: 'Beast',   values: BEASTS },
    { name: 'Season',  values: SEASONS },
    { name: 'Scale',   values: SCALE },
    { name: 'Vantage', values: VANTAGE },
    { name: 'Wonder',  values: ['None', 'Worldtree', 'Floating Isle', 'God-Lighthouse'] },
    { name: 'Cast',    values: ['Murk', 'Luminous'] },
    { name: 'Format',  values: ['Square', 'Tall', 'Wide'] },
  ],
};

const renderEmpyrean: EngineFn = blit(draw, empyreanTraits);

// W/H of Square, Tall, Wide (matches FMTS order).
const EMPYREAN_ASPECTS = [1, 0.776, 1.510] as const;

  return { draw, paramsOf, labels, empyreanSchema, EMPYREAN_ASPECTS };
})();

function paramsOf(r) {
  const style = r() < 0.12 ? 'Ascendant' : 'Classic';
  const eng = style === 'Ascendant' ? NEW : CLASSIC;
  const p = eng.paramsOf(r);
  return { style, eng, p };
}

function labelsM(m) {
  return { Style: m.style, ...m.eng.labels(m.p) };
}

function draw(cv, seed) {
  const r = rng(seed);
  const m = paramsOf(r);
  m.eng.draw(cv, m.p, r);
}

const _byName = new Map();
for (const t of [...CLASSIC.empyreanSchema.traits, ...NEW.empyreanSchema.traits]) {
  const ex = _byName.get(t.name);
  if (!ex) _byName.set(t.name, { name: t.name, values: [...t.values] });
  else for (const v of t.values) if (!ex.values.includes(v)) ex.values.push(v);
}

/* Subtrait buckets (Trait → Subtrait → Value, lib/project/types.ts). Empyrean's
   pools are the UNION of the Classic + Ascendant engines, so the grouping is
   declared here — after the merge — rather than on either half's schema. Every
   value of a bucketed trait sits in exactly one bucket. */
const _SUBTRAITS: Record<string, { name: string; values: string[] }[]> = {
  Palette: [
    { name: 'Warm', values: ['Dragonfire', 'Crimson Siege', 'Golden Dawn', 'Sunset Citadel'] },
    { name: 'Cool', values: ['Frost Kingdom', 'Emerald Vale', 'Twilight Empire', 'Void Portal', 'Amethyst Highlands', 'Aurora Reach'] },
  ],
  Beast: [
    { name: 'Winged', values: ['Dragon', 'Griffin', 'Roc'] },
    { name: 'Earthbound', values: ['Leviathan', 'Wyrm'] },
    { name: 'Unclaimed', values: ['None'] },
  ],
  Season: [
    { name: 'Warm Seasons', values: ['Spring Bloom', 'High Summer'] },
    { name: 'Cold Seasons', values: ['Amber Autumn', 'Deep Winter'] },
  ],
  Omen: [
    { name: 'Celestial', values: ['Great Moon', 'Ringed Planet', 'Twin Suns', 'Aurora'] },
    { name: 'Portent', values: ['Portal Rift', 'Comet', 'Eclipse'] },
    { name: 'Clear', values: ['Clear Heavens'] },
  ],
  Era: [
    { name: 'Ascendant', values: ['Golden Age', 'Age of Sail', 'The Awakening'] },
    { name: 'Waning', values: ['Age of Embers', 'The Long Winter', 'The Sundering'] },
  ],
  Scale: [
    { name: 'Small', values: ['Lone Keep', 'Walled Town'] },
    { name: 'Great', values: ['Marching Realm', 'Massed Empire'] },
  ],
  Format: [
    { name: 'Upright', values: ['Square', 'Tall'] },
    { name: 'Broad', values: ['Wide'] },
  ],
};

export const empyreanTraits: TraitsFn = (id) => labelsM(paramsOf(rng(id)));

export const empyreanSchema: TraitSchema = {
  traits: [
    { name: 'Style', values: ['Classic', 'Ascendant'] },
    ...[..._byName.values()].map((t) =>
      _SUBTRAITS[t.name] ? { ...t, subtraits: _SUBTRAITS[t.name] } : t,
    ),
  ],
};

export const renderEmpyrean: EngineFn = blit(draw, empyreanTraits);

export const EMPYREAN_ASPECTS = CLASSIC.EMPYREAN_ASPECTS;
