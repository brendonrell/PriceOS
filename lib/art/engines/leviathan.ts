// @ts-nocheck
/*
 * LEVIATHAN REEF — by opus4-8. "A teeming undersea world, one dive per token."
 *
 * A POPULATED SCENE engine: a dense tropical coral reef rendered as a layered,
 * cinematic underwater establishing shot. Not an abstract field — every token is
 * a different DIVE into a living reef, built from discrete depicted elements:
 * god-rays pouring from the surface, caustic ripple on the water ceiling, forests
 * of branching/fan/brain coral and tube sponges, anemones with glowing tips,
 * swaying kelp columns, rising bubble streams, flocking schools of fish moving as
 * coherent shoals, scattered larger striped reef fish, a hero creature passing in
 * the hazy distance (whale / manta / turtle / jellyfish bloom / shark), a sandy
 * floor with starfish/urchins/shells, and bioluminescent sparkle in the deeps.
 *
 * Depth is the spine: surface light above → atmospheric blue haze with distance →
 * dark deep below. Distant elements desaturate into the water haze; near elements
 * are saturated and dark-silhouetted. Six DEPTH ZONES choose the light gradient,
 * eight+ PALETTES choose the saturated reef scheme, a HERO axis picks the passing
 * creature, a CAMERA axis restructures the composition, and DENSITY scales the
 * teeming-ness from sandflat to packed reef.
 *
 * Deterministic from tokenId only. ALL trait-determining randomness is drawn in
 * paramsOf() in a FIXED order so traits() and draw() never disagree.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

/* ── DEPTH ZONES — the vertical light gradient: surface above, deep below ──────
 * top   : water-ceiling colour near the surface (where god-rays originate).
 * mid    : the body-of-water haze colour (atmospheric perspective tint).
 * deep   : the dark floor/deep colour.
 * sun    : god-ray colour.
 * rayA   : god-ray strength 0..1.  biolum: ambient glow strength for deeps. */
const ZONES = [
  { name: 'Sunlit Shallows',       top: '#46d8ff', mid: '#0a86c8', deep: '#042a5a', sun: '#eaffff', rayA: 0.95, biolum: 0.05 },
  { name: 'Reef Wall',             top: '#16b6e2', mid: '#066098', deep: '#031a44', sun: '#cdf6ff', rayA: 0.80, biolum: 0.08 },
  { name: 'Twilight Zone',         top: '#1a5ca8', mid: '#0c2f6e', deep: '#03081f', sun: '#9fd0ff', rayA: 0.55, biolum: 0.22 },
  { name: 'Midnight Bioluminescent', top: '#072448', mid: '#040f33', deep: '#01030c', sun: '#3a7fff', rayA: 0.30, biolum: 0.58 },
  { name: 'Lagoon',                top: '#28ead0', mid: '#0aa896', deep: '#054a4a', sun: '#f0fff8', rayA: 0.90, biolum: 0.05 },
  { name: 'Kelp Cathedral',        top: '#1fc0a0', mid: '#0a7460', deep: '#042a1c', sun: '#d8ffe8', rayA: 0.85, biolum: 0.10 },
];

/* ── PALETTES — saturated reef colour schemes (coral / sponge / fish hues) ─────
 * Each is a small bag of vivid hues the corals, fish, and anemones draw from.
 * c1..c5 are HSL hue anchors (degrees); the engine adds saturation + light. */
const PALS = [
  { name: 'Tropical Reef',     hues: [18, 38, 320, 285, 175], sat: 0.92, glow: '#ff9a3c' },
  { name: 'Coral Garden',      hues: [10, 28, 345, 300, 50],  sat: 0.95, glow: '#ff6f8f' },
  { name: 'Deep Sapphire',     hues: [205, 225, 260, 190, 300], sat: 0.85, glow: '#4f8cff' },
  { name: 'Bioluminescent',    hues: [165, 185, 280, 320, 95], sat: 0.95, glow: '#5cffd0' },
  { name: 'Sunset Lagoon',     hues: [32, 12, 350, 300, 200], sat: 0.94, glow: '#ffae3a' },
  { name: 'Emerald Kelp',      hues: [95, 130, 160, 45, 320], sat: 0.88, glow: '#9bff5c' },
  { name: 'Amethyst Deep',     hues: [275, 300, 320, 250, 200], sat: 0.90, glow: '#c06bff' },
  { name: 'Electric Anemone',  hues: [320, 290, 175, 200, 50], sat: 0.97, glow: '#ff4fd0' },
  { name: 'Mango Reef',        hues: [40, 22, 8, 300, 170],   sat: 0.95, glow: '#ffc23a' },
  { name: 'Cyan Drift',        hues: [185, 200, 165, 280, 330], sat: 0.90, glow: '#3cf0ff' },
];

/* Formats — real W/H ratios live in LEVIATHAN_ASPECTS below (same order). */
const FMTS = [
  { W: 1240, H: 1240, t: 'Square' },
  { W: 1000, H: 1340, t: 'Tall' },
  { W: 1340, H: 1000, t: 'Wide' },
];

const HEROES  = ['Whale', 'Manta', 'Turtle', 'Jellyfish Bloom', 'Shark', 'None'];
const CAMERAS = ['Floor to Surface', 'Reef Wall', 'Open Water', 'Cavern Arch'];
const DENSITY = ['Sparse Sandflat', 'Reef', 'Teeming'];

/* ── Param draw (FIXED ORDER) ───────────────────────────────────────────────*/
function paramsOf(r) {
  const zoneI   = Math.floor(r() * ZONES.length);
  const palI    = Math.floor(r() * PALS.length);
  const fmt     = pick(FMTS, r);
  const hero    = pick(HEROES, r);
  const camera  = pick(CAMERAS, r);
  const density = pick(DENSITY, r);
  return { zoneI, palI, fmt, hero, camera, density };
}

function labels(p) {
  return {
    Depth:   ZONES[p.zoneI].name,
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    Hero:    p.hero,
    Camera:  p.camera,
    Density: p.density,
  };
}

/* reef colour helper — pick one of the palette hues at a given light */
function reefCol(P, r, light, satMul) {
  const h = pick(P.hues, r);
  return hsl2hex(h + randn(r) * 8, clamp(P.sat * (satMul ?? 1), 0, 1), light);
}

/* atmospheric perspective: fade a colour toward the water haze by depth-into-scene.
 * Eased (sqrt) so near elements barely desaturate and only the far distance hazes —
 * this keeps the reef BOLD instead of washing the whole frame to mid-tone pastel. */
function haze(col, Z, t) {
  return mix(col, Z.mid, clamp(t, 0, 1) ** 1.45 * 0.82);
}

/* ════════════════════════════════════════════════════════════════════════════
 * WATER COLUMN — the base depth gradient + god-rays + surface caustic
 * ══════════════════════════════════════════════════════════════════════════ */
function paintWater(x, Z, W, H, r) {
  const g = x.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0,    Z.top);
  g.addColorStop(0.16, mix(Z.top, Z.mid, 0.55));
  g.addColorStop(0.46, Z.mid);
  g.addColorStop(0.74, mix(Z.mid, Z.deep, 0.6));
  g.addColorStop(1,    Z.deep);
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);

  // vertical chroma deepening: multiply the lower water darker + richer so the
  // ground reads as a deep saturated body, never a flat pastel wash. Full-height
  // smooth ramp (starts at white = no-op up top) so there's no visible band seam.
  x.save();
  x.globalCompositeOperation = 'multiply';
  const dg = x.createLinearGradient(0, 0, 0, H);
  dg.addColorStop(0,    rgba('#ffffff', 1));
  dg.addColorStop(0.3,  rgba(mix('#ffffff', Z.mid, 0.12), 1));
  dg.addColorStop(0.7,  rgba(mix(Z.deep, Z.mid, 0.55), 1));
  dg.addColorStop(1,    rgba(Z.deep, 1));
  x.fillStyle = dg;
  x.fillRect(0, 0, W, H);
  x.restore();

  // surface caustic ripple band across the top
  x.save();
  x.globalCompositeOperation = 'screen';
  const surfH = H * 0.16;
  for (let i = 0; i < 40; i++) {
    const y = r() * surfH;
    const a = 0.04 + r() * 0.10 * (1 - y / surfH);
    x.strokeStyle = rgba(Z.sun, a);
    x.lineWidth = 1 + r() * 2.5;
    x.beginPath();
    let px = 0, py = y;
    x.moveTo(px, py);
    const segs = 8;
    for (let s = 1; s <= segs; s++) {
      px = (s / segs) * W;
      py = y + Math.sin(s * 1.3 + i) * surfH * 0.12 + randn(r) * 4;
      x.lineTo(px, py);
    }
    x.stroke();
  }
  x.restore();
}

/* GOD-RAYS — crepuscular shafts pouring down from the surface */
function godRays(x, Z, W, H, r, strength) {
  if (strength <= 0.02) return;
  x.save();
  x.globalCompositeOperation = 'screen';
  // rays converge from a high sun point off-frame, splaying down + outward
  const sunX = W * (0.2 + r() * 0.6);
  const n = rint(r, 8, 14);
  for (let i = 0; i < n; i++) {
    const sx = sunX + (r() - 0.5) * W * 0.5;   // origin near surface
    const spread = W * (0.015 + r() * 0.05);
    const tilt = (sx - sunX) * 1.4 + (r() - 0.5) * W * 0.1; // splay from sun
    const len = H * (0.8 + r() * 0.3);
    const a = strength * (0.14 + r() * 0.18);
    const x0 = sx - spread, x1 = sx + spread;
    const bx0 = sx - spread * 3.2 + tilt, bx1 = sx + spread * 3.2 + tilt;
    const g = x.createLinearGradient(0, 0, 0, len);
    g.addColorStop(0,    rgba(Z.sun, a));
    g.addColorStop(0.35, rgba(Z.sun, a * 0.6));
    g.addColorStop(1,    rgba(Z.sun, 0));
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(x0, 0);
    x.lineTo(x1, 0);
    x.lineTo(bx1, len);
    x.lineTo(bx0, len);
    x.closePath();
    x.fill();
  }
  // a bright sky-glow bloom at the surface where rays originate
  const bloom = x.createRadialGradient(sunX, -H * 0.05, 0, sunX, -H * 0.05, H * 0.5);
  bloom.addColorStop(0, rgba(Z.sun, strength * 0.35));
  bloom.addColorStop(1, rgba(Z.sun, 0));
  x.fillStyle = bloom;
  x.fillRect(0, 0, W, H * 0.6);
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * HERO CREATURES — a large silhouette / glow passing in the hazy distance
 * ══════════════════════════════════════════════════════════════════════════ */
function heroWhale(x, Z, P, W, H, r) {
  const cy = H * (0.28 + r() * 0.18);
  const cx = W * (0.2 + r() * 0.6);
  const len = W * (0.5 + r() * 0.3);
  const ht = len * 0.28;
  const dir = r() < 0.5 ? 1 : -1;
  const col = haze('#0a1828', Z, 0.55);
  x.save();
  x.globalAlpha = 0.7;
  x.translate(cx, cy);
  x.scale(dir, 1);
  x.fillStyle = col;
  // body
  x.beginPath();
  x.moveTo(-len * 0.5, 0);
  x.bezierCurveTo(-len * 0.3, -ht * 0.8, len * 0.2, -ht * 0.7, len * 0.5, -ht * 0.12);
  x.bezierCurveTo(len * 0.5, ht * 0.1, len * 0.2, ht * 0.55, -len * 0.2, ht * 0.45);
  x.bezierCurveTo(-len * 0.38, ht * 0.4, -len * 0.46, ht * 0.2, -len * 0.5, 0);
  x.closePath();
  x.fill();
  // tail fluke
  x.beginPath();
  x.moveTo(-len * 0.46, 0);
  x.lineTo(-len * 0.62, -ht * 0.5);
  x.lineTo(-len * 0.5, 0);
  x.lineTo(-len * 0.62, ht * 0.5);
  x.closePath();
  x.fill();
  // pectoral fin
  x.beginPath();
  x.moveTo(len * 0.05, ht * 0.3);
  x.lineTo(len * 0.0, ht * 0.85);
  x.lineTo(len * 0.2, ht * 0.4);
  x.closePath();
  x.fill();
  x.restore();
}

function heroManta(x, Z, P, W, H, r) {
  const cy = H * (0.26 + r() * 0.2);
  const cx = W * (0.25 + r() * 0.5);
  const span = W * (0.45 + r() * 0.35);
  const col = haze('#08121f', Z, 0.5);
  x.save();
  x.globalAlpha = 0.72;
  x.translate(cx, cy);
  x.rotate((r() - 0.5) * 0.3);
  x.fillStyle = col;
  // wide diamond wings
  x.beginPath();
  x.moveTo(0, -span * 0.16);
  x.bezierCurveTo(span * 0.3, -span * 0.22, span * 0.5, -span * 0.02, span * 0.5, span * 0.1);
  x.bezierCurveTo(span * 0.35, span * 0.06, span * 0.18, span * 0.12, 0, span * 0.2);
  x.bezierCurveTo(-span * 0.18, span * 0.12, -span * 0.35, span * 0.06, -span * 0.5, span * 0.1);
  x.bezierCurveTo(-span * 0.5, -span * 0.02, -span * 0.3, -span * 0.22, 0, -span * 0.16);
  x.closePath();
  x.fill();
  // tail
  x.strokeStyle = col;
  x.lineWidth = span * 0.012;
  x.beginPath();
  x.moveTo(0, span * 0.18);
  x.lineTo(0, span * 0.5);
  x.stroke();
  // cephalic fins
  x.beginPath();
  x.moveTo(-span * 0.06, -span * 0.14);
  x.lineTo(-span * 0.12, -span * 0.26);
  x.lineTo(-span * 0.02, -span * 0.14);
  x.moveTo(span * 0.06, -span * 0.14);
  x.lineTo(span * 0.12, -span * 0.26);
  x.lineTo(span * 0.02, -span * 0.14);
  x.fill();
  x.restore();
}

function heroTurtle(x, Z, P, W, H, r) {
  const cy = H * (0.3 + r() * 0.18);
  const cx = W * (0.25 + r() * 0.5);
  const sz = W * (0.16 + r() * 0.1);
  const col = haze('#0a1a16', Z, 0.5);
  const dir = r() < 0.5 ? 1 : -1;
  x.save();
  x.globalAlpha = 0.72;
  x.translate(cx, cy);
  x.scale(dir, 1);
  x.rotate((r() - 0.5) * 0.3);
  x.fillStyle = col;
  // front flippers — long wing-like paddles, drawn first (behind shell)
  x.save();
  x.translate(sz * 0.55, -sz * 0.55); x.rotate(-0.9);
  x.beginPath(); x.ellipse(0, 0, sz * 0.85, sz * 0.26, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  x.save();
  x.translate(sz * 0.55, sz * 0.55); x.rotate(0.9);
  x.beginPath(); x.ellipse(0, 0, sz * 0.85, sz * 0.26, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  // rear flippers
  x.save();
  x.translate(-sz * 0.75, -sz * 0.5); x.rotate(0.6);
  x.beginPath(); x.ellipse(0, 0, sz * 0.45, sz * 0.18, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  x.save();
  x.translate(-sz * 0.75, sz * 0.5); x.rotate(-0.6);
  x.beginPath(); x.ellipse(0, 0, sz * 0.45, sz * 0.18, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  // shell (over flipper roots)
  x.beginPath();
  x.ellipse(0, 0, sz, sz * 0.82, 0, 0, Math.PI * 2);
  x.fill();
  // shell scute pattern (subtle lighter lines)
  x.strokeStyle = rgba(mix(col, '#7fd0c0', 0.5), 0.4);
  x.lineWidth = Math.max(1, sz * 0.03);
  for (let i = 0; i < 3; i++) {
    x.beginPath(); x.ellipse(0, 0, sz * (0.35 + i * 0.3), sz * (0.28 + i * 0.25), 0, 0, Math.PI * 2); x.stroke();
  }
  // head
  x.fillStyle = col;
  x.beginPath();
  x.ellipse(sz * 1.12, -sz * 0.05, sz * 0.3, sz * 0.24, 0, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

function heroJelly(x, Z, P, W, H, r) {
  // a bloom of several glowing jellyfish drifting in the mid-water
  const n = rint(r, 4, 8);
  x.save();
  x.globalCompositeOperation = 'screen';
  for (let i = 0; i < n; i++) {
    const cx = W * (0.1 + r() * 0.8);
    const cy = H * (0.2 + r() * 0.45);
    const sz = W * (0.04 + r() * 0.06);
    const hue = pick(P.hues, r);
    const col = hsl2hex(hue, P.sat, 0.62);
    // bell glow
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, sz * 2.4);
    g.addColorStop(0, rgba(col, 0.55));
    g.addColorStop(0.4, rgba(col, 0.25));
    g.addColorStop(1, rgba(col, 0));
    x.fillStyle = g;
    x.beginPath();
    x.ellipse(cx, cy, sz, sz * 0.82, 0, 0, Math.PI * 2);
    x.fill();
    // bell dome solid core
    x.fillStyle = rgba(mix(col, '#ffffff', 0.3), 0.5);
    x.beginPath();
    x.arc(cx, cy, sz * 0.7, Math.PI, 0);
    x.fill();
    // tentacles
    x.strokeStyle = rgba(col, 0.45);
    x.lineWidth = Math.max(1, sz * 0.06);
    for (let t = 0; t < 6; t++) {
      const tx = cx + (t / 5 - 0.5) * sz * 1.1;
      x.beginPath();
      x.moveTo(tx, cy + sz * 0.2);
      let yy = cy + sz * 0.2;
      let xx = tx;
      for (let s = 1; s <= 5; s++) {
        yy += sz * 0.5;
        xx += Math.sin(s * 1.5 + i) * sz * 0.18;
        x.lineTo(xx, yy);
      }
      x.stroke();
    }
  }
  x.restore();
}

function heroShark(x, Z, P, W, H, r) {
  const cy = H * (0.24 + r() * 0.18);
  const cx = W * (0.2 + r() * 0.6);
  const len = W * (0.4 + r() * 0.28);
  const ht = len * 0.2;
  const dir = r() < 0.5 ? 1 : -1;
  const col = haze('#0a141f', Z, 0.45);
  x.save();
  x.globalAlpha = 0.75;
  x.translate(cx, cy);
  x.scale(dir, 1);
  x.rotate((r() - 0.5) * 0.2);
  x.fillStyle = col;
  // body
  x.beginPath();
  x.moveTo(-len * 0.5, 0);
  x.bezierCurveTo(-len * 0.2, -ht, len * 0.25, -ht * 0.9, len * 0.5, -ht * 0.1);
  x.bezierCurveTo(len * 0.52, 0, len * 0.52, ht * 0.05, len * 0.5, ht * 0.15);
  x.bezierCurveTo(len * 0.2, ht * 0.7, -len * 0.2, ht * 0.7, -len * 0.5, 0);
  x.closePath();
  x.fill();
  // dorsal fin
  x.beginPath();
  x.moveTo(len * 0.0, -ht * 0.85);
  x.lineTo(-len * 0.12, -ht * 1.9);
  x.lineTo(-len * 0.18, -ht * 0.8);
  x.closePath();
  x.fill();
  // tail
  x.beginPath();
  x.moveTo(-len * 0.46, 0);
  x.lineTo(-len * 0.66, -ht * 1.4);
  x.lineTo(-len * 0.54, 0);
  x.lineTo(-len * 0.64, ht * 1.0);
  x.closePath();
  x.fill();
  // pectoral
  x.beginPath();
  x.moveTo(len * 0.1, ht * 0.3);
  x.lineTo(len * 0.0, ht * 1.1);
  x.lineTo(len * 0.24, ht * 0.4);
  x.closePath();
  x.fill();
  x.restore();
}

function drawHero(x, Z, P, W, H, hero, r) {
  switch (hero) {
    case 'Whale':          heroWhale(x, Z, P, W, H, r); break;
    case 'Manta':          heroManta(x, Z, P, W, H, r); break;
    case 'Turtle':         heroTurtle(x, Z, P, W, H, r); break;
    case 'Jellyfish Bloom':heroJelly(x, Z, P, W, H, r); break;
    case 'Shark':          heroShark(x, Z, P, W, H, r); break;
    case 'None':           break;
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * FISH SCHOOLS — flocking shoals + scattered larger reef fish
 * ══════════════════════════════════════════════════════════════════════════ */
function littleFish(x, cx, cy, sz, ang, col) {
  x.save();
  x.translate(cx, cy);
  x.rotate(ang);
  x.fillStyle = col;
  // body (a touch more elongated / fish-like)
  x.beginPath();
  x.ellipse(0, 0, sz * 1.15, sz * 0.5, 0, 0, Math.PI * 2);
  x.fill();
  // forked tail
  x.beginPath();
  x.moveTo(-sz * 1.0, 0);
  x.lineTo(-sz * 1.8, -sz * 0.7);
  x.lineTo(-sz * 1.4, 0);
  x.lineTo(-sz * 1.8, sz * 0.7);
  x.closePath();
  x.fill();
  x.restore();
}

function school(x, Z, P, W, H, r, depthT, count) {
  // a coherent shoal: an elongated band of fish all sharing a TIGHT heading, with
  // a dense gaussian core that thins toward the edges (density falloff) so it
  // reads as ONE streaming body of many fish, not scattered dots.
  const cx = W * (0.1 + r() * 0.8);
  const cy = H * (0.15 + r() * 0.55);
  // gentle arc to the shoal so the whole body banks together as it swims
  const heading = (r() - 0.5) * 0.9 + (r() < 0.5 ? 0 : Math.PI);
  const bank = (r() - 0.5) * 0.5;   // total heading change tip-to-tail of shoal
  const ca = Math.cos(heading), sa = Math.sin(heading);
  // the shoal is long along its heading, thin across — a streaming ribbon
  const along = W * (0.16 + r() * 0.24);
  const across = H * (0.035 + r() * 0.06);
  const baseSz = W * (0.0058 + r() * 0.0065) * (1 - depthT * 0.32);
  const hue = pick(P.hues, r);
  let col = haze(hsl2hex(hue, P.sat, 0.52 + depthT * 0.08), Z, depthT * 0.65);
  let lit = haze(hsl2hex(hue, P.sat, 0.7), Z, depthT * 0.5);
  let dk  = haze(hsl2hex(hue, P.sat, 0.34), Z, depthT * 0.6);
  x.save();
  x.globalAlpha = clamp(0.92 - depthT * 0.3, 0.45, 0.95);
  // faint directional cohesion streak — the body's "wake", binds the dots visually
  x.save();
  x.globalCompositeOperation = 'screen';
  const wk = x.createLinearGradient(cx - along * ca, cy - along * sa, cx + along * ca, cy + along * sa);
  wk.addColorStop(0, rgba(col, 0)); wk.addColorStop(0.5, rgba(col, 0.1)); wk.addColorStop(1, rgba(col, 0));
  x.fillStyle = wk;
  x.save(); x.translate(cx, cy); x.rotate(heading);
  x.beginPath(); x.ellipse(0, 0, along * 1.05, across * 1.3, 0, 0, Math.PI * 2); x.fill();
  x.restore(); x.restore();
  for (let i = 0; i < count; i++) {
    // along axis: gaussian core, but pull samples toward centre for a denser body
    const ug = randn(r) * 0.3;
    const u = Math.sign(ug) * Math.abs(ug) ** 1.25; // density falloff toward edges
    // across falloff scales with distance from core → lens-shaped dense body
    const edge = clamp(1 - Math.abs(u) * 0.7, 0.25, 1);
    const v = randn(r) * 0.32 * edge;
    const fx = cx + (u * along) * ca - (v * across) * sa;
    const fy = cy + (u * along) * sa + (v * across) * ca;
    const sz = baseSz * (0.72 + r() * 0.5) * (0.75 + edge * 0.3);
    // every fish banks with its position along the shoal → aligned, arcing body
    const ang = heading + u * bank + randn(r) * 0.08;
    const tone = r() < 0.22 ? lit : (r() < 0.3 ? dk : col);
    littleFish(x, fx, fy, sz, ang, tone);
  }
  x.restore();
}

/* a larger individual reef fish with stripes/spots */
function reefFish(x, Z, P, W, H, r, depthT) {
  const cx = W * (0.1 + r() * 0.8);
  const cy = H * (0.2 + r() * 0.55);
  const sz = W * (0.016 + r() * 0.022) * (1 - depthT * 0.35);
  const ang = (r() - 0.5) * 0.7 + (r() < 0.5 ? 0 : Math.PI);
  const hue = pick(P.hues, r);
  let body = hsl2hex(hue, P.sat, 0.55);
  let stripe = hsl2hex((hue + 180) % 360, P.sat * 0.8, 0.4);
  body = haze(body, Z, depthT * 0.5);
  stripe = haze(stripe, Z, depthT * 0.5);
  x.save();
  x.globalAlpha = clamp(0.92 - depthT * 0.3, 0.4, 0.92);
  x.translate(cx, cy);
  x.rotate(ang);
  // body
  x.fillStyle = body;
  x.beginPath();
  x.ellipse(0, 0, sz, sz * 0.62, 0, 0, Math.PI * 2);
  x.fill();
  // tail
  x.beginPath();
  x.moveTo(-sz * 0.85, 0);
  x.lineTo(-sz * 1.6, -sz * 0.8);
  x.lineTo(-sz * 1.6, sz * 0.8);
  x.closePath();
  x.fill();
  // dorsal
  x.beginPath();
  x.moveTo(-sz * 0.2, -sz * 0.55);
  x.lineTo(sz * 0.1, -sz * 1.0);
  x.lineTo(sz * 0.35, -sz * 0.45);
  x.closePath();
  x.fill();
  // stripes
  x.strokeStyle = stripe;
  x.lineWidth = sz * 0.16;
  for (let s = 0; s < 3; s++) {
    const sxp = -sz * 0.4 + s * sz * 0.5;
    x.beginPath();
    x.moveTo(sxp, -sz * 0.5);
    x.lineTo(sxp, sz * 0.5);
    x.stroke();
  }
  // eye
  x.fillStyle = '#ffffff';
  x.beginPath();
  x.arc(sz * 0.55, -sz * 0.08, sz * 0.12, 0, Math.PI * 2);
  x.fill();
  x.fillStyle = '#000';
  x.beginPath();
  x.arc(sz * 0.58, -sz * 0.08, sz * 0.06, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * CORAL & REEF STRUCTURE — branching, fan, brain, tube sponge, anemone, kelp
 * ══════════════════════════════════════════════════════════════════════════ */

/* recursive branching staghorn coral — each segment is a shaded capsule: a dark
 * occluding understroke + a lit overstroke offset toward the light, giving the
 * branch real roundness instead of a flat line. */
function branchCoral(x, x0, y0, ang, len, depth, col, tipCol, dkCol, wid) {
  if (depth <= 0 || len < 4) return;
  const x1 = x0 + Math.cos(ang) * len;
  const y1 = y0 + Math.sin(ang) * len;
  x.lineCap = 'round';
  // dark base (occlusion / underside)
  x.strokeStyle = dkCol;
  x.lineWidth = wid;
  x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
  // lit core, slightly thinner + nudged up-left toward the light
  x.strokeStyle = col;
  x.lineWidth = wid * 0.6;
  x.beginPath();
  x.moveTo(x0 - wid * 0.14, y0 - wid * 0.14);
  x.lineTo(x1 - wid * 0.14, y1 - wid * 0.14);
  x.stroke();
  // glowing tip nub
  if (depth <= 1) {
    const g = x.createRadialGradient(x1 - wid * 0.1, y1 - wid * 0.1, 0, x1, y1, Math.max(2, wid));
    g.addColorStop(0, mix(tipCol, '#ffffff', 0.35));
    g.addColorStop(1, tipCol);
    x.fillStyle = g;
    x.beginPath(); x.arc(x1, y1, Math.max(1.6, wid * 0.72), 0, Math.PI * 2); x.fill();
  }
  for (let b = 0; b < 2; b++) {
    branchCoral(x, x1, y1, ang + (b === 0 ? -0.45 : 0.45) + (b - 0.5) * 0.2, len * 0.74, depth - 1, col, tipCol, dkCol, wid * 0.72);
  }
}

function staghorn(x, Z, P, W, H, r, gx, gy, scale, depthT) {
  const hue = pick(P.hues, r);
  let col = haze(hsl2hex(hue, P.sat, 0.5), Z, depthT * 0.55);
  let dk  = haze(hsl2hex(hue, P.sat * 0.9, 0.26), Z, depthT * 0.6);
  let tip = haze(hsl2hex(hue, P.sat, 0.74), Z, depthT * 0.4);
  const stalks = rint(r, 5, 9);
  const baseLen = H * (0.08 + r() * 0.08) * scale;
  // soft contact shadow pooling at the base so the colony sits ON the floor
  x.save();
  x.globalAlpha = 0.35 * (1 - depthT * 0.5);
  const sh = x.createRadialGradient(gx, gy, 0, gx, gy, W * 0.05 * scale);
  sh.addColorStop(0, rgba('#000810', 0.5));
  sh.addColorStop(1, rgba('#000810', 0));
  x.fillStyle = sh;
  x.beginPath(); x.ellipse(gx, gy, W * 0.05 * scale, W * 0.018 * scale, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  for (let s = 0; s < stalks; s++) {
    const ox = gx + (r() - 0.5) * W * 0.06 * scale;
    const ang = -Math.PI / 2 + (r() - 0.5) * 0.8;
    branchCoral(x, ox, gy, ang, baseLen * (0.65 + r() * 0.7), rint(r, 4, 5), col, tip, dk, Math.max(2.4, W * 0.0085 * scale));
  }
}

/* sea fan — a flat lacy fan of radiating curved ribs */
function seaFan(x, Z, P, W, H, r, gx, gy, scale, depthT) {
  const hue = pick(P.hues, r);
  let col = hsl2hex(hue, P.sat, 0.46);
  col = haze(col, Z, depthT * 0.55);
  const h = H * (0.1 + r() * 0.1) * scale;
  const wfan = h * (0.8 + r() * 0.5);
  const ribs = rint(r, 9, 16);
  const lean = (r() - 0.5) * 0.5;
  x.save();
  x.translate(gx, gy);
  x.rotate(lean);
  x.strokeStyle = col;
  x.lineCap = 'round';
  for (let i = 0; i < ribs; i++) {
    const t = i / (ribs - 1);
    const ang = -Math.PI / 2 + (t - 0.5) * 1.5;
    const len = h * (0.7 + 0.3 * Math.sin(t * Math.PI));
    x.lineWidth = Math.max(1, W * 0.004 * scale * (1 - t * 0.3 + 0.3));
    // curved rib
    const ex = Math.cos(ang) * len;
    const ey = Math.sin(ang) * len;
    const cxp = Math.cos(ang) * len * 0.5 + (t - 0.5) * wfan * 0.4;
    const cyp = Math.sin(ang) * len * 0.5;
    x.beginPath();
    x.moveTo(0, 0);
    x.quadraticCurveTo(cxp, cyp, ex, ey);
    x.stroke();
    // cross-veins
    x.lineWidth = Math.max(0.6, W * 0.0015 * scale);
    for (let v = 0.3; v < 1; v += 0.3) {
      x.beginPath();
      x.arc(0, 0, len * v, ang - 0.04, ang + 0.04);
      x.stroke();
    }
  }
  x.restore();
}

/* brain coral mound — a domed blob with squiggly surface grooves */
function brainCoral(x, Z, P, W, H, r, gx, gy, scale, depthT) {
  const hue = pick(P.hues, r);
  let col = hsl2hex(hue, P.sat * 0.85, 0.45);
  let col2 = hsl2hex(hue, P.sat, 0.6);
  col = haze(col, Z, depthT * 0.55);
  col2 = haze(col2, Z, depthT * 0.5);
  const rad = W * (0.04 + r() * 0.05) * scale;
  let dk = haze(hsl2hex(hue, P.sat * 0.9, 0.22), Z, depthT * 0.55);
  x.save();
  x.translate(gx, gy);
  // contact shadow so the mound sits on the floor, not floats
  x.save();
  x.globalAlpha = 0.4 * (1 - depthT * 0.5);
  const sh = x.createRadialGradient(0, rad * 0.45, 0, 0, rad * 0.45, rad * 1.1);
  sh.addColorStop(0, rgba('#000810', 0.55)); sh.addColorStop(1, rgba('#000810', 0));
  x.fillStyle = sh;
  x.beginPath(); x.ellipse(0, rad * 0.45, rad * 1.05, rad * 0.3, 0, 0, Math.PI * 2); x.fill();
  x.restore();
  // dome — strong directional shading: hot highlight upper-left → dark underside
  const g = x.createRadialGradient(-rad * 0.4, -rad * 0.55, rad * 0.05, -rad * 0.1, -rad * 0.1, rad * 1.25);
  g.addColorStop(0, mix(col2, '#ffffff', 0.25));
  g.addColorStop(0.45, col2);
  g.addColorStop(0.8, col);
  g.addColorStop(1, dk);
  x.fillStyle = g;
  x.beginPath();
  x.ellipse(0, -rad * 0.2, rad, rad * 0.8, 0, 0, Math.PI * 2);
  x.fill();
  // rim light along the lit edge
  x.save();
  x.globalCompositeOperation = 'screen';
  x.strokeStyle = rgba(mix(col2, '#ffffff', 0.4), 0.4);
  x.lineWidth = Math.max(1, rad * 0.05);
  x.beginPath();
  x.ellipse(0, -rad * 0.2, rad * 0.97, rad * 0.78, 0, Math.PI * 0.95, Math.PI * 1.75);
  x.stroke();
  x.restore();
  // maze-like brain grooves: many tight meandering ridges clipped to the dome
  x.save();
  x.beginPath();
  x.ellipse(0, -rad * 0.2, rad, rad * 0.8, 0, 0, Math.PI * 2);
  x.clip();
  const groove = rgba(mix(col, '#000', 0.5), 0.55);
  const ridge  = rgba(mix(col2, '#fff', 0.2), 0.4);
  const lines = rint(r, 11, 18);
  for (let i = 0; i < lines; i++) {
    const yy = -rad * 1.0 + (i / lines) * rad * 1.8;
    const phase = i * 1.7 + r() * 2;
    const amp = rad * (0.07 + r() * 0.06);
    // ridge highlight then groove shadow for a corrugated read
    for (let pass = 0; pass < 2; pass++) {
      x.strokeStyle = pass === 0 ? ridge : groove;
      x.lineWidth = Math.max(1, rad * 0.045);
      x.beginPath();
      let px = -rad * 1.1, py = yy + (pass === 0 ? -rad * 0.03 : 0);
      x.moveTo(px, py);
      for (let s = 1; s <= 16; s++) {
        px = -rad * 1.1 + (s / 16) * rad * 2.2;
        py = yy + Math.sin(s * 0.9 + phase) * amp + (pass === 0 ? -rad * 0.03 : 0);
        x.lineTo(px, py);
      }
      x.stroke();
    }
  }
  x.restore();
  x.restore();
}

/* tube sponges — a cluster of vertical tubes */
function tubeSponge(x, Z, P, W, H, r, gx, gy, scale, depthT) {
  const hue = pick(P.hues, r);
  let col = hsl2hex(hue, P.sat, 0.5);
  let rim = hsl2hex(hue, P.sat, 0.68);
  col = haze(col, Z, depthT * 0.55);
  rim = haze(rim, Z, depthT * 0.45);
  const tubes = rint(r, 3, 6);
  for (let i = 0; i < tubes; i++) {
    const tw = W * (0.012 + r() * 0.012) * scale;
    const th = H * (0.06 + r() * 0.08) * scale;
    const ox = gx + (i - tubes / 2) * tw * 1.3 + (r() - 0.5) * tw;
    const lean = (r() - 0.5) * 0.2;
    x.save();
    x.translate(ox, gy);
    x.rotate(lean);
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(-tw / 2, 0);
    x.lineTo(-tw / 2, -th);
    x.lineTo(tw / 2, -th);
    x.lineTo(tw / 2, 0);
    x.closePath();
    x.fill();
    // rim opening
    x.fillStyle = rim;
    x.beginPath();
    x.ellipse(0, -th, tw / 2, tw * 0.22, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = mix(col, '#000', 0.5);
    x.beginPath();
    x.ellipse(0, -th, tw * 0.3, tw * 0.13, 0, 0, Math.PI * 2);
    x.fill();
    x.restore();
  }
}

/* anemone — a fleshy shaded oral disc crowned by two depth-sorted layers of
 * glowing tentacles (back layer dimmer, front layer lit). No flat clip-art orb:
 * the body is a shaded dome and the tentacles have rim-lit gradient tips. */
function anemone(x, Z, P, W, H, r, gx, gy, scale, depthT, biolum) {
  const hue = pick(P.hues, r);
  const hue2 = (hue + 24) % 360;
  let bodyDk = haze(hsl2hex(hue, P.sat, 0.30), Z, depthT * 0.5);
  let bodyLt = haze(hsl2hex(hue, P.sat, 0.58), Z, depthT * 0.4);
  let col    = haze(hsl2hex(hue, P.sat, 0.5), Z, depthT * 0.5);
  let tip    = haze(hsl2hex(hue2, P.sat, 0.78), Z, depthT * 0.3);
  const rad = W * (0.025 + r() * 0.025) * scale;
  const arms = rint(r, 18, 30);
  x.save();
  x.translate(gx, gy);

  // glow halo — for biolum zones AND for the hot Electric-Anemone read
  const glowA = (biolum > 0.1 ? 0.32 * biolum + 0.1 : 0.12) * (1 - depthT * 0.5);
  if (glowA > 0.02) {
    const g = x.createRadialGradient(0, -rad * 0.2, 0, 0, -rad * 0.2, rad * 2.1);
    g.addColorStop(0, rgba(tip, glowA));
    g.addColorStop(1, rgba(tip, 0));
    x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = g;
    x.beginPath(); x.arc(0, -rad * 0.2, rad * 2.1, 0, Math.PI * 2); x.fill(); x.restore();
  }

  // BACK tentacle layer — dimmer, splays wider, sits behind the body
  x.lineCap = 'round';
  for (let i = 0; i < arms; i++) {
    const a = -Math.PI - 0.2 + (i / arms) * (Math.PI + 0.4);
    const len = rad * (0.9 + r() * 0.7);
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len - rad * 0.25;
    const cx2 = Math.cos(a) * len * 0.6 + randn(r) * rad * 0.12;
    const cy2 = Math.sin(a) * len * 0.6;
    x.strokeStyle = mix(col, Z.mid, 0.4);
    x.lineWidth = Math.max(1, rad * 0.06);
    x.beginPath(); x.moveTo(0, -rad * 0.1); x.quadraticCurveTo(cx2, cy2, ex, ey); x.stroke();
  }

  // fleshy oral-disc body — a shaded dome, light from upper-left
  const bg = x.createRadialGradient(-rad * 0.3, -rad * 0.5, rad * 0.05, 0, 0, rad * 0.95);
  bg.addColorStop(0, bodyLt);
  bg.addColorStop(0.6, col);
  bg.addColorStop(1, bodyDk);
  x.fillStyle = bg;
  x.beginPath();
  x.ellipse(0, -rad * 0.12, rad * 0.62, rad * 0.5, 0, 0, Math.PI * 2);
  x.fill();
  // central mouth
  x.fillStyle = rgba(mix(bodyDk, '#000', 0.5), 0.6);
  x.beginPath();
  x.ellipse(0, -rad * 0.12, rad * 0.2, rad * 0.15, 0, 0, Math.PI * 2);
  x.fill();

  // FRONT tentacle layer — lit, with bright gradient tips
  for (let i = 0; i < arms; i++) {
    const a = -Math.PI + (i / arms) * Math.PI;
    const len = rad * (0.7 + r() * 0.6);
    const ex = Math.cos(a) * len, ey = Math.sin(a) * len - rad * 0.2;
    const cx2 = Math.cos(a) * len * 0.6 + randn(r) * rad * 0.1;
    const cy2 = Math.sin(a) * len * 0.6;
    const tg = x.createLinearGradient(0, -rad * 0.12, ex, ey);
    tg.addColorStop(0, col);
    tg.addColorStop(1, tip);
    x.strokeStyle = tg;
    x.lineWidth = Math.max(1.2, rad * 0.075);
    x.beginPath(); x.moveTo(0, -rad * 0.12); x.quadraticCurveTo(cx2, cy2, ex, ey); x.stroke();
    // glowing bulb tip
    const tr = Math.max(1.4, rad * 0.085);
    const tgr = x.createRadialGradient(ex, ey, 0, ex, ey, tr * 1.8);
    tgr.addColorStop(0, mix(tip, '#ffffff', 0.4));
    tgr.addColorStop(0.5, tip);
    tgr.addColorStop(1, rgba(tip, 0));
    x.fillStyle = tgr;
    x.beginPath(); x.arc(ex, ey, tr * 1.8, 0, Math.PI * 2); x.fill();
  }
  x.restore();
}

/* kelp / sea-grass — tall swaying columns */
function kelp(x, Z, P, W, H, r, gx, scaleH, depthT) {
  const hue = pick([95, 130, 75, 150], r);
  let col = hsl2hex(hue, 0.7, 0.32);
  col = haze(col, Z, depthT * 0.5);
  const h = H * scaleH;
  const sway = (r() - 0.5) * W * 0.06;
  const segs = 14;
  x.strokeStyle = col;
  x.lineCap = 'round';
  x.lineWidth = Math.max(2, W * 0.006 * (1 - depthT * 0.3));
  x.beginPath();
  let px = gx, py = H;
  x.moveTo(px, py);
  for (let s = 1; s <= segs; s++) {
    const t = s / segs;
    px = gx + Math.sin(t * 2.4) * sway + sway * t;
    py = H - t * h;
    x.lineTo(px, py);
  }
  x.stroke();
  // leaf blades
  x.lineWidth = Math.max(1, W * 0.003);
  for (let s = 3; s < segs; s += 2) {
    const t = s / segs;
    const bx = gx + Math.sin(t * 2.4) * sway + sway * t;
    const by = H - t * h;
    const side = s % 2 === 0 ? 1 : -1;
    x.beginPath();
    x.moveTo(bx, by);
    x.quadraticCurveTo(bx + side * W * 0.02, by - h * 0.04, bx + side * W * 0.04, by - h * 0.02);
    x.stroke();
  }
}

/* bubble stream — rising column of bubbles */
function bubbles(x, Z, W, H, r, gx, gy) {
  x.save();
  x.globalCompositeOperation = 'screen';
  const n = rint(r, 8, 18);
  let px = gx, py = gy;
  for (let i = 0; i < n; i++) {
    const sz = W * (0.002 + r() * 0.005);
    px = gx + Math.sin(i * 0.8) * W * 0.012;
    py = gy - (i / n) * gy * 0.95;
    x.strokeStyle = rgba('#dffaff', 0.35);
    x.fillStyle = rgba('#bfeeff', 0.12);
    x.lineWidth = 1;
    x.beginPath();
    x.arc(px, py, sz, 0, Math.PI * 2);
    x.fill();
    x.stroke();
  }
  x.restore();
}

/* floor detail — starfish, urchins, shells */
function starfish(x, P, r, cx, cy, sz, col) {
  x.save();
  x.translate(cx, cy);
  x.rotate(r() * Math.PI);
  x.fillStyle = col;
  x.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const rad = i % 2 === 0 ? sz : sz * 0.42;
    const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
    if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
  }
  x.closePath();
  x.fill();
  x.restore();
}

function urchin(x, r, cx, cy, sz, col) {
  x.save();
  x.translate(cx, cy);
  x.strokeStyle = col;
  x.lineWidth = Math.max(1, sz * 0.08);
  x.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    x.beginPath();
    x.moveTo(0, 0);
    x.lineTo(Math.cos(a) * sz, Math.sin(a) * sz);
    x.stroke();
  }
  x.fillStyle = mix(col, '#000', 0.3);
  x.beginPath();
  x.arc(0, 0, sz * 0.4, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

/* the sandy/rocky floor */
function paintFloor(x, Z, P, W, H, r, floorY, depthT) {
  let sand = haze(hsl2hex(40, 0.35, 0.45), Z, 0.55 + depthT * 0.2);
  const g = x.createLinearGradient(0, floorY - H * 0.1, 0, H);
  g.addColorStop(0, rgba(sand, 0));
  g.addColorStop(0.4, rgba(sand, 0.85));
  g.addColorStop(1, mix(sand, Z.deep, 0.4));
  x.fillStyle = g;
  // undulating floor top edge
  x.beginPath();
  x.moveTo(0, H);
  x.lineTo(0, floorY);
  let py = floorY;
  for (let s = 0; s <= 12; s++) {
    const px = (s / 12) * W;
    py = floorY + Math.sin(s * 0.9) * H * 0.015 + randn(r) * H * 0.01;
    x.lineTo(px, py);
  }
  x.lineTo(W, H);
  x.closePath();
  x.fill();

  // scattered floor critters
  const det = rint(r, 4, 9);
  for (let i = 0; i < det; i++) {
    const cx = W * r();
    const cy = floorY + H * (0.02 + r() * 0.14);
    const which = rint(r, 0, 2);
    if (which === 0) starfish(x, P, r, cx, cy, W * (0.012 + r() * 0.014), haze(hsl2hex(pick(P.hues, r), P.sat, 0.55), Z, 0.3));
    else if (which === 1) urchin(x, r, cx, cy, W * (0.01 + r() * 0.012), haze(hsl2hex(280, 0.6, 0.4), Z, 0.3));
    else {
      // shell — a small spiral hump
      x.fillStyle = haze(hsl2hex(35, 0.4, 0.7), Z, 0.3);
      x.beginPath();
      x.ellipse(cx, cy, W * 0.012, W * 0.009, r() * Math.PI, 0, Math.PI * 2);
      x.fill();
    }
  }
}

/* plankton / biolum sparkle in the deeps */
function planktonSparkle(x, P, W, H, r, biolum) {
  if (biolum < 0.12) return;
  x.save();
  x.globalCompositeOperation = 'screen';
  const n = Math.floor(W * H / 9000 * biolum * 4);
  for (let i = 0; i < n; i++) {
    const cx = W * r(), cy = H * (0.2 + r() * 0.8);
    const sz = 0.6 + r() * 1.8;
    const hue = pick(P.hues, r);
    x.fillStyle = rgba(hsl2hex(hue, 0.8, 0.7), 0.3 + r() * 0.5);
    x.beginPath();
    x.arc(cx, cy, sz, 0, Math.PI * 2);
    x.fill();
  }
  x.restore();
}

/* ════════════════════════════════════════════════════════════════════════════
 * AMBIENT FILL — distant reef ridge + drifting particulate so NO frame is empty
 * ══════════════════════════════════════════════════════════════════════════ */

/* a continuous hazy reef silhouette receding along the floor line — the horizon
 * is always populated. Two layered lumps of meandering crests, far ones hazier. */
function distantRidge(x, Z, P, W, H, r, floorY) {
  x.save();
  for (let layer = 0; layer < 2; layer++) {
    const t = layer === 0 ? 0.85 : 0.62;          // far layer hazier
    const baseY = floorY - H * (layer === 0 ? 0.02 : 0.06);
    const amp = H * (layer === 0 ? 0.04 : 0.07);
    const lumps = 9 + layer * 3;
    // colour: a deep reef hue hazed heavily into the water so it sits in distance
    let col = haze(hsl2hex(pick(P.hues, r), P.sat * 0.7, 0.4), Z, t);
    col = mix(col, Z.mid, 0.25);
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(0, H);
    x.lineTo(0, baseY);
    for (let s = 0; s <= lumps; s++) {
      const px = (s / lumps) * W;
      // overlapping crests (abs of sines) → reef-like silhouette, not a smooth hill
      const crest = Math.abs(Math.sin(s * 1.7 + layer * 2 + r() * 0.6));
      const py = baseY - crest * amp - Math.abs(Math.sin(s * 0.5 + layer)) * amp * 0.5;
      x.lineTo(px, py);
    }
    x.lineTo(W, H);
    x.closePath();
    x.fill();
  }
  x.restore();
}

/* marine snow + faint distant micro-shoals drifting through the water column.
 * Keeps the open water alive on every token; density-independent floor of life. */
function drifters(x, Z, P, W, H, r, biolum) {
  x.save();
  x.globalCompositeOperation = 'screen';
  // marine snow — fine suspended particulate catching the light
  const snow = Math.floor(W * H / 5200);
  for (let i = 0; i < snow; i++) {
    const cx = W * r(), cy = H * (0.08 + r() * 0.88);
    const depthT = cy / H;
    const sz = 0.5 + r() * 1.6;
    const a = (0.05 + r() * 0.16) * (1 - depthT * 0.3);
    x.fillStyle = rgba(mix(Z.sun, '#ffffff', 0.3), a);
    x.beginPath();
    x.arc(cx, cy, sz, 0, Math.PI * 2);
    x.fill();
  }
  x.restore();

  // a few very-distant micro-shoals: tiny dim fish clusters deep in the haze,
  // so even an "empty" open-water frame has life moving in the far blue.
  const farShoals = rint(r, 2, 4);
  for (let i = 0; i < farShoals; i++) {
    const cx = W * (0.1 + r() * 0.8);
    const cy = H * (0.18 + r() * 0.5);
    const heading = (r() - 0.5) * 0.8 + (r() < 0.5 ? 0 : Math.PI);
    const ca = Math.cos(heading), sa = Math.sin(heading);
    const along = W * (0.08 + r() * 0.1);
    const across = H * (0.02 + r() * 0.03);
    const cnt = rint(r, 18, 40);
    const col = haze(hsl2hex(pick(P.hues, r), P.sat * 0.6, 0.5), Z, 0.8);
    x.save();
    x.globalAlpha = 0.5;
    x.fillStyle = col;
    for (let f = 0; f < cnt; f++) {
      const u = randn(r) * 0.3, v = randn(r) * 0.3;
      const fx = cx + u * along * ca - v * across * sa;
      const fy = cy + u * along * sa + v * across * ca;
      const sz = 0.8 + r() * 1.0;
      x.beginPath();
      x.ellipse(fx, fy, sz * 1.4, sz * 0.6, heading, 0, Math.PI * 2);
      x.fill();
    }
    x.restore();
  }
}

/* ════════════════════════════════════════════════════════════════════════════
 * COMPOSITION — place the reef gardens, columns, schools per camera
 * ══════════════════════════════════════════════════════════════════════════ */
function placeReef(x, Z, P, W, H, r, camera, density, biolum) {
  // Density is CALMER vs BUSIER, never EMPTY — sparse keeps a populated floor.
  const dens = density === 'Sparse Sandflat' ? 0.9 : density === 'Reef' ? 1.4 : 2.2;

  // floor line depends on camera. Open Water keeps a visible reef band at the
  // base (was pushed almost off-frame, which created the empty-void frames).
  let floorY;
  if (camera === 'Floor to Surface') floorY = H * (0.6 + r() * 0.1);
  else if (camera === 'Reef Wall')   floorY = H * (0.76 + r() * 0.1);
  else if (camera === 'Open Water')  floorY = H * (0.78 + r() * 0.08);
  else                                floorY = H * (0.68 + r() * 0.1); // cavern

  // ── FAR DISTANT REEF RIDGE — a continuous hazy silhouette band along the
  //    floor so the horizon is never empty water. Reads as a reef wall receding
  //    into the haze; guarantees a populated background on EVERY token. ──
  distantRidge(x, Z, P, W, H, r, floorY);

  // ── BACKGROUND reef silhouettes (hazy, distant) ──
  const bgN = Math.round(rint(r, 4, 7) * dens);
  for (let i = 0; i < bgN; i++) {
    const gx = W * r();
    const gy = floorY + H * (r() * 0.04);
    const which = rint(r, 0, 4);
    const depthT = 0.68 + r() * 0.25;
    const sc = 0.7 + r() * 0.5;
    if (which === 0) staghorn(x, Z, P, W, H, r, gx, gy, sc, depthT);
    else if (which === 1) seaFan(x, Z, P, W, H, r, gx, gy, sc, depthT);
    else if (which === 2) brainCoral(x, Z, P, W, H, r, gx, gy, sc, depthT);
    else if (which === 3) tubeSponge(x, Z, P, W, H, r, gx, gy, sc, depthT);
    else anemone(x, Z, P, W, H, r, gx, gy, sc, depthT, biolum);
  }

  // ── DRIFTING PARTICULATE — marine snow + distant micro-shoals fill the open
  //    mid-water on every token so it always reads as a living column, not void. ──
  drifters(x, Z, P, W, H, r, biolum);

  // ── MIDGROUND schools of fish — spread across the whole water column ──
  const schoolN = Math.round(rint(r, 4, 6) * dens);
  for (let i = 0; i < schoolN; i++) {
    const cnt = Math.round(rint(r, 50, 120) * dens);
    school(x, Z, P, W, H, r, 0.35 + r() * 0.35, cnt);
  }
  // scattered loner fish filling the open mid-water so it never reads empty.
  // kept SMALL + pushed into haze so they read as distant reef life, not giants.
  const loners = Math.round(rint(r, 8, 16) * dens);
  for (let i = 0; i < loners; i++) reefFish(x, Z, P, W, H, r, 0.45 + r() * 0.4);

  // ── kelp columns (esp. Kelp Cathedral camera) ──
  const kelpN = camera === 'Reef Wall' ? Math.round(rint(r, 4, 9) * dens) : Math.round(rint(r, 1, 4) * dens);
  for (let i = 0; i < kelpN; i++) {
    kelp(x, Z, P, W, H, r, W * r(), 0.5 + r() * 0.4, 0.3 + r() * 0.4);
  }

  // ── FOREGROUND reef gardens (saturated, dark, large) ──
  const fgN = Math.round(rint(r, 4, 8) * dens);
  for (let i = 0; i < fgN; i++) {
    const gx = W * (0.05 + r() * 0.9);
    const gy = floorY + H * (0.04 + r() * 0.18);
    const which = rint(r, 0, 4);
    const depthT = 0.0 + r() * 0.25;
    const sc = 1.1 + r() * 0.8;
    if (which === 0) staghorn(x, Z, P, W, H, r, gx, gy, sc, depthT);
    else if (which === 1) seaFan(x, Z, P, W, H, r, gx, gy, sc, depthT);
    else if (which === 2) brainCoral(x, Z, P, W, H, r, gx, gy, sc, depthT);
    else if (which === 3) tubeSponge(x, Z, P, W, H, r, gx, gy, sc, depthT);
    else anemone(x, Z, P, W, H, r, gx, gy, sc, depthT, biolum);
  }

  // ── scattered larger reef fish ──
  const bigFishN = Math.round(rint(r, 3, 7) * dens);
  for (let i = 0; i < bigFishN; i++) reefFish(x, Z, P, W, H, r, r() * 0.4);

  // ── bubble streams ──
  const bubN = Math.round(rint(r, 2, 5) * dens);
  for (let i = 0; i < bubN; i++) bubbles(x, Z, W, H, r, W * r(), floorY + H * 0.05);

  return floorY;
}

/* ── Master draw ─────────────────────────────────────────────────────────── */
function draw(cv, seed) {
  const r = rng(seed);
  const p = paramsOf(r);
  const Z = ZONES[p.zoneI], P = PALS[p.palI], W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  // 1. water column + surface caustic
  paintWater(x, Z, W, H, r);

  // 2. god-rays from the surface
  godRays(x, Z, W, H, r, Z.rayA);

  // 3. hero creature in the hazy distance (behind the reef)
  drawHero(x, Z, P, W, H, p.hero, r);

  // 4. distant plankton/biolum haze sparkle (deep zones)
  planktonSparkle(x, P, W, H, r, Z.biolum);

  // 5. the reef itself — bg silhouettes → schools → kelp → fg gardens → fish
  const floorY = placeReef(x, Z, P, W, H, r, p.camera, p.density, Z.biolum);

  // 6. the sandy floor with critters (drawn over fg bases to seat them)
  paintFloor(x, Z, P, W, H, r, floorY, 0.2);

  // re-seat a few foreground anemones/coral ON the floor for grounding
  const seatN = p.density === 'Sparse Sandflat' ? 2 : p.density === 'Reef' ? 4 : 6;
  for (let i = 0; i < seatN; i++) {
    const gx = W * (0.05 + r() * 0.9);
    const gy = floorY + H * (0.05 + r() * 0.16);
    const which = rint(r, 0, 3);
    const sc = 1.2 + r() * 0.7;
    if (which === 0) staghorn(x, Z, P, W, H, r, gx, gy, sc, 0.1);
    else if (which === 1) anemone(x, Z, P, W, H, r, gx, gy, sc, 0.1, Z.biolum);
    else if (which === 2) brainCoral(x, Z, P, W, H, r, gx, gy, sc, 0.1);
    else tubeSponge(x, Z, P, W, H, r, gx, gy, sc, 0.1);
  }

  // 7. a near foreground school crossing in front (large, saturated)
  if (p.density !== 'Sparse Sandflat') {
    school(x, Z, P, W, H, r, 0.05, Math.round(rint(r, 50, 90)));
  }

  // 8. finishing — atmospheric depth grade that stays SATURATED:
  // a faint screen haze high up (where light is), a multiply deepening low down.
  x.save();
  x.globalCompositeOperation = 'screen';
  const hz = x.createLinearGradient(0, 0, 0, H * 0.55);
  hz.addColorStop(0, rgba(Z.mid, 0.06));
  hz.addColorStop(1, rgba(Z.mid, 0.0));
  x.fillStyle = hz;
  x.fillRect(0, 0, W, H * 0.55);
  x.restore();

  x.save();
  x.globalCompositeOperation = 'multiply';
  const dp = x.createLinearGradient(0, 0, 0, H);
  dp.addColorStop(0,   rgba('#ffffff', 1));
  dp.addColorStop(0.5, rgba('#ffffff', 1));
  dp.addColorStop(1,   rgba(mix(Z.deep, '#01030a', 0.35), 1));
  x.fillStyle = dp;
  x.fillRect(0, 0, W, H);
  x.restore();

  // global chroma lift — pull a touch of contrast/saturation so the whole reef
  // reads bold, not pastel (overlay a soft-light pass of the palette glow).
  x.save();
  x.globalCompositeOperation = 'overlay';
  x.fillStyle = rgba(P.glow, 0.06);
  x.fillRect(0, 0, W, H);
  x.restore();

  grain(x, W, H, 900, r);
  vignette(x, W, H, 0.46);
}

export const leviathanTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const leviathanSchema: TraitSchema = {
  traits: [
    { name: 'Depth', values: ZONES.map((z) => z.name),
      subtraits: [
        { name: 'Sunlit', values: ['Sunlit Shallows', 'Reef Wall', 'Lagoon', 'Kelp Cathedral'] },
        { name: 'Dark', values: ['Twilight Zone', 'Midnight Bioluminescent'] },
      ] },
    { name: 'Palette', values: PALS.map((p) => p.name),
      subtraits: [
        { name: 'Warm', values: ['Tropical Reef', 'Coral Garden', 'Sunset Lagoon', 'Mango Reef'] },
        { name: 'Cool', values: ['Deep Sapphire', 'Bioluminescent', 'Emerald Kelp', 'Amethyst Deep', 'Electric Anemone', 'Cyan Drift'] },
      ] },
    { name: 'Format', values: ['Square', 'Tall', 'Wide'],
      subtraits: [
        { name: 'Upright', values: ['Square', 'Tall'] },
        { name: 'Broad', values: ['Wide'] },
      ] },
    { name: 'Hero', values: HEROES,
      subtraits: [
        { name: 'Giants', values: ['Whale', 'Manta', 'Shark'] },
        { name: 'Drifters', values: ['Turtle', 'Jellyfish Bloom'] },
        { name: 'Empty Water', values: ['None'] },
      ] },
    { name: 'Camera',  values: CAMERAS },
    { name: 'Density', values: DENSITY,
      subtraits: [
        { name: 'Open', values: ['Sparse Sandflat'] },
        { name: 'Alive', values: ['Reef', 'Teeming'] },
      ] },
  ],
};

export const renderLeviathan: EngineFn = blit(draw, leviathanTraits);

// W/H of Square, Tall, Wide (matches FMTS order).
export const LEVIATHAN_ASPECTS = [1, 0.746, 1.34] as const;
