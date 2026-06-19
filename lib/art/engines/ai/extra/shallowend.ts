// @ts-nocheck
/*
 * SHALLOWEND — Direction A: "Caustics".
 * The wavering net of refracted sunlight on a tiled pool floor. A blue-green
 * water gradient sits over a faint tile grid; layered sine-warped bright curves
 * are drawn additively ('lighter'/'screen') to build the shifting caustic mesh,
 * with dappled sun highlights pooling on top. Edges softened, grain + vignette
 * keep it photographic rather than vector. Sun-drenched, summery, hypnotic.
 *
 * Artist: deepend-ai ("Nobody's Swimming"). Stay in the water/pool/light lane.
 * Deterministic from seed only — no Date/Math.random/network/DOM beyond canvas.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ---------------- palettes ----------------
   deep  = darkest water (grout/depth), water = mid body, shallow = bright floor,
   tile  = grout line tint, caustic = the refracted-light colour, sun = top dapple. */
const PALS = [
  { name:'Chlorine',   deep:'#0a5a6e', water:'#1592a8', shallow:'#5fd6d0', tile:'#0e6f7e', caustic:'#cffaf0', sun:'#ffffff' },
  { name:'Lagoon',     deep:'#0a4d5e', water:'#0f8fb0', shallow:'#39c7c2', tile:'#0b5e6c', caustic:'#bff4ea', sun:'#e9fffb' },
  { name:'Miami',      deep:'#0c6e8f', water:'#16a0c4', shallow:'#7be0d2', tile:'#0f7fa0', caustic:'#fff1c2', sun:'#fff7df' },
  { name:'Deep Blue',  deep:'#073a66', water:'#0d6aa8', shallow:'#3aa6dc', tile:'#0a4f86', caustic:'#cfeeff', sun:'#f2fbff' },
  { name:'Sunset Deck',deep:'#185a72', water:'#2f93a6', shallow:'#9fd6c4', tile:'#236d80', caustic:'#ffd9a0', sun:'#ffe9c2' },
  { name:'Tile White', deep:'#2b7c8c', water:'#5db3bc', shallow:'#bfeee6', tile:'#3a8e9a', caustic:'#ffffff', sun:'#ffffff' },
  { name:'Emerald',    deep:'#0a5a4a', water:'#119a78', shallow:'#5fd9a8', tile:'#0c6c58', caustic:'#e6fff0', sun:'#f4fff8' },
];

const FMTS = [
  { W:1080, H:1080, t:'Square' },
  { W:1000, H:1240, t:'Portrait' },
  { W:1240, H:1000, t:'Landscape' },
];

const TIMES   = ['High Noon','Afternoon','Golden Hour'];      // sun colour + dapple warmth
const DENS    = ['Sparse','Woven','Dense'];                   // caustic mesh density
const TILES   = ['Mosaic','Square','Plain'];                  // floor grid scale (Plain = none)
const SURFACES= ['Still','Lapping','Choppy'];                 // ripple warp amplitude

/* ---------------- params (fixed draw order) ---------------- */
function paramsOf(r){
  const palI  = Math.floor(r()*PALS.length);
  const fmt   = pick(FMTS, r);
  const timeI = Math.floor(r()*TIMES.length);
  const densI = Math.floor(r()*DENS.length);
  const tileI = Math.floor(r()*TILES.length);
  const surfI = Math.floor(r()*SURFACES.length);
  // continuous knobs — drawn AFTER all labelled traits so label order is fixed
  const lightAngle = r()*Math.PI*2;            // direction the net leans
  const hueShift   = (r()-0.5)*16;             // per-token water hue nudge
  const causticScale = 0.7 + r()*0.9;          // overall cell size of the mesh
  const depth      = 0.35 + r()*0.5;           // how dark the depth gradient gets
  const dappleN    = rint(r, 5, 12);           // number of bright sun pools
  const seedJit    = r()*1000;                 // phase jitter for the warps
  return { palI, fmt, timeI, densI, tileI, surfI, lightAngle, hueShift, causticScale, depth, dappleN, seedJit };
}

function labels(p){
  return {
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    'Time of Day': TIMES[p.timeI],
    Caustics: DENS[p.densI],
    Tile:     TILES[p.tileI],
    Surface:  SURFACES[p.surfI],
  };
}

/* hue nudge a hex toward warm/cool without leaving the family */
function nudge(hex, p){
  // approximate: blend toward a warm or cool reference by hueShift sign
  const warm = '#ffd28a', cool = '#9fe6ff';
  const t = clamp(Math.abs(p.hueShift)/16, 0, 1) * 0.16;
  return mix(hex, p.hueShift > 0 ? warm : cool, t);
}

/* ---------------- paint ---------------- */
function draw(cv, seed){
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI];
  const W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');

  const deep    = nudge(P.deep, p);
  const water   = nudge(P.water, p);
  const shallow = nudge(P.shallow, p);
  const time    = TIMES[p.timeI];
  const dens    = DENS[p.densI];
  const tile    = TILES[p.tileI];
  const surf    = SURFACES[p.surfI];

  // warm the sun/caustic by time of day
  const sunCol = time === 'Golden Hour' ? mix(P.sun, '#ffcf8a', 0.55)
               : time === 'Afternoon'   ? mix(P.sun, '#fff3d6', 0.22)
               : P.sun;
  const causticCol = time === 'Golden Hour' ? mix(P.caustic, '#ffdca0', 0.45)
                   : time === 'Afternoon'   ? mix(P.caustic, '#fff4d0', 0.2)
                   : P.caustic;

  // ---- 1. water depth gradient (diagonal, so the floor recedes) ----
  const ga = p.lightAngle;
  const gx = Math.cos(ga), gy = Math.sin(ga);
  const grad = x.createLinearGradient(
    W/2 - gx*W*0.6, H/2 - gy*H*0.6,
    W/2 + gx*W*0.6, H/2 + gy*H*0.6
  );
  grad.addColorStop(0,   mix(deep, water, 1 - p.depth));
  grad.addColorStop(0.5, water);
  grad.addColorStop(1,   shallow);
  x.fillStyle = grad;
  x.fillRect(0, 0, W, H);

  // soft radial sun-pool brightening (where the most light gathers)
  const sunX = W*(0.3 + (gx*0.5+0.5)*0.4);
  const sunY = H*(0.25 + (gy*0.5+0.5)*0.4);
  const sg = x.createRadialGradient(sunX, sunY, 0, sunX, sunY, Math.max(W,H)*0.75);
  sg.addColorStop(0, rgba(mix(shallow,'#ffffff',0.4), 0.5));
  sg.addColorStop(0.5, rgba(shallow, 0.12));
  sg.addColorStop(1, rgba(shallow, 0));
  x.fillStyle = sg;
  x.fillRect(0, 0, W, H);

  // ---- 2. faint tile grid beneath the water ----
  if (tile !== 'Plain'){
    const cell = (tile === 'Mosaic' ? Math.min(W,H)/22 : Math.min(W,H)/10);
    const groutCol = mix(P.tile, deep, 0.4);
    x.save();
    x.globalAlpha = 0.5;
    x.strokeStyle = rgba(groutCol, 0.35);
    x.lineWidth = Math.max(1, cell*0.05);
    // a gentle perspective skew so tiles look like a receding floor
    const skew = (p.lightAngle/(Math.PI*2) - 0.5) * 0.5;
    for (let gx2 = -cell; gx2 <= W + cell; gx2 += cell){
      x.beginPath();
      x.moveTo(gx2, 0);
      x.lineTo(gx2 + skew*H, H);
      x.stroke();
    }
    for (let gy2 = -cell; gy2 <= H + cell; gy2 += cell){
      x.beginPath();
      x.moveTo(0, gy2);
      x.lineTo(W, gy2 + skew*W*0.4);
      x.stroke();
    }
    // subtle per-tile colour variance + occasional accent tile
    x.globalAlpha = 1;
    for (let yy = 0; yy < H; yy += cell){
      for (let xx = 0; xx < W; xx += cell){
        const v = r();
        if (v < 0.12){
          x.fillStyle = rgba(mix(P.tile, v < 0.04 ? sunCol : deep, 0.3), 0.10 + r()*0.08);
          x.fillRect(xx, yy, cell, cell);
        }
      }
    }
    x.restore();
  }

  // ---- 3. the caustic net: layered sine-warped bright ribbons, additive ----
  // Build a deterministic field of warped polylines that cross and overlap to
  // form the bright net. Density + surface control count and warp amplitude.
  const layerCount = dens === 'Dense' ? 5 : dens === 'Woven' ? 4 : 3;
  const baseLines  = dens === 'Dense' ? 30 : dens === 'Woven' ? 22 : 15;
  const amp = surf === 'Choppy' ? 1.0 : surf === 'Lapping' ? 0.62 : 0.32;
  const span = Math.max(W, H);
  const cellSize = span * 0.085 * p.causticScale;

  x.save();
  x.globalCompositeOperation = 'lighter';
  x.lineCap = 'round';

  // two crossing families of ribbons (the net is woven from two directions)
  for (let fam = 0; fam < 2; fam++){
    const dir = fam === 0 ? p.lightAngle : p.lightAngle + Math.PI*0.5 + (r()-0.5)*0.4;
    const dx = Math.cos(dir), dy = Math.sin(dir);
    const px = -dy, py = dx; // perpendicular spacing axis

    for (let L = 0; L < layerCount; L++){
      const layerT = L / layerCount;
      const freq1 = (1.1 + r()*1.6) / cellSize;
      const freq2 = (2.3 + r()*3.0) / cellSize;
      const ph1 = p.seedJit + r()*Math.PI*2;
      const ph2 = p.seedJit + r()*Math.PI*2;
      const warpA = cellSize * amp * (0.55 + layerT*0.7);
      const lineW = Math.max(1.4, cellSize * (0.07 + layerT*0.12) + r()*2);
      const glow  = (0.05 + r()*0.07) * (1 - layerT*0.4);
      const col   = mix(causticCol, fam ? sunCol : shallow, layerT*0.5);

      const n = baseLines + rint(r, -4, 4);
      const spacing = (span*1.6) / n;
      for (let i = 0; i < n; i++){
        // base offset along perpendicular axis, centred on the canvas
        const off = (i - n/2) * spacing + randn(r)*spacing*0.35;
        const ox = W/2 + px*off;
        const oy = H/2 + py*off;
        // jitter the line's brightness so the mesh "shimmers"
        const bright = clamp(glow * (0.6 + r()*0.9), 0.02, 0.22);
        x.strokeStyle = rgba(col, bright);
        x.lineWidth = lineW;
        x.beginPath();
        const steps = 44;
        const length = span*1.8;
        for (let s = 0; s <= steps; s++){
          const t = s/steps;
          const along = (t - 0.5) * length;
          // double-sine warp gives the irregular wavering caustic curve
          const w1 = Math.sin(along*freq1 + ph1 + off*0.01);
          const w2 = Math.sin(along*freq2 + ph2 - off*0.013);
          const warp = (w1*0.7 + w2*0.3) * warpA;
          const cx = ox + dx*along + px*warp;
          const cy = oy + dy*along + py*warp;
          if (s === 0) x.moveTo(cx, cy); else x.lineTo(cx, cy);
        }
        x.stroke();
      }
    }
  }
  x.restore();

  // ---- 4. caustic intersection hot-spots (the brightest knots of the net) ----
  x.save();
  x.globalCompositeOperation = 'lighter';
  const knots = dens === 'Dense' ? 220 : dens === 'Woven' ? 150 : 90;
  for (let i = 0; i < knots; i++){
    const cx = r()*W, cy = r()*H;
    // bias toward the sun pool (numeric lerp — mix() is for colours only)
    const bx = cx + (sunX - cx)*0.25*r(), by = cy + (sunY - cy)*0.25*r();
    const rad = cellSize * (0.08 + r()*0.22) * (surf === 'Choppy' ? 1.3 : 1);
    const g = x.createRadialGradient(bx, by, 0, bx, by, rad);
    const a = 0.04 + r()*0.12;
    g.addColorStop(0, rgba(causticCol, a));
    g.addColorStop(0.6, rgba(causticCol, a*0.4));
    g.addColorStop(1, rgba(causticCol, 0));
    x.fillStyle = g;
    x.beginPath();
    x.arc(bx, by, rad, 0, Math.PI*2);
    x.fill();
  }
  x.restore();

  // ---- 5. dappled sun highlights — soft warm pools on the surface ----
  x.save();
  x.globalCompositeOperation = time === 'Golden Hour' ? 'screen' : 'lighter';
  for (let i = 0; i < p.dappleN; i++){
    const cx = sunX + randn(r)*W*0.32;
    const cy = sunY + randn(r)*H*0.32;
    const rad = span * (0.07 + r()*0.18);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    const a = 0.06 + r()*0.12;
    g.addColorStop(0, rgba(sunCol, a));
    g.addColorStop(0.55, rgba(sunCol, a*0.35));
    g.addColorStop(1, rgba(sunCol, 0));
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, rad, 0, Math.PI*2);
    x.fill();
  }
  x.restore();

  // ---- 6. surface shimmer streaks (thin horizontal glints near the top) ----
  if (surf !== 'Still'){
    x.save();
    x.globalCompositeOperation = 'lighter';
    const streaks = surf === 'Choppy' ? 26 : 14;
    for (let i = 0; i < streaks; i++){
      const sy = r()*H;
      const sw = W*(0.1 + r()*0.4);
      const sx0 = r()*W;
      x.strokeStyle = rgba(sunCol, 0.03 + r()*0.06);
      x.lineWidth = 1 + r()*2.5;
      x.beginPath();
      const wob = (r()-0.5)*18;
      x.moveTo(sx0, sy);
      x.quadraticCurveTo(sx0+sw*0.5, sy+wob, sx0+sw, sy);
      x.stroke();
    }
    x.restore();
  }

  // ---- 7. depth darkening at far edges (water gets deeper toward one side) ----
  x.save();
  x.globalCompositeOperation = 'multiply';
  const dg = x.createLinearGradient(0, 0, gx*W, gy*H);
  dg.addColorStop(0, rgba(deep, 0.0));
  dg.addColorStop(1, rgba(deep, 0.22*p.depth));
  x.fillStyle = dg;
  x.fillRect(0, 0, W, H);
  x.restore();

  // ---- 8. soften: a faint blue wash to bind the layers into water ----
  x.save();
  x.globalCompositeOperation = 'soft-light';
  x.fillStyle = rgba(water, 0.18);
  x.fillRect(0, 0, W, H);
  x.restore();

  // ---- 9. organic texture so it reads as photographed light, not vector ----
  mottle(x, 0, 0, W, H, water, 1100, r, 'overlay');
  grain(x, W, H, 1400, r);
  vignette(x, W, H, 0.18);
}

/* ---------------- exports ---------------- */
export const shallowTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const shallowSchema: TraitSchema = {
  traits: [
    { name:'Palette',     values: PALS.map(p => p.name) },
    { name:'Format',      values: ['Square','Portrait','Landscape'] },
    { name:'Time of Day', values: TIMES.slice() },
    { name:'Caustics',    values: DENS.slice() },
    { name:'Tile',        values: TILES.slice() },
    { name:'Surface',     values: SURFACES.slice() },
  ],
};

export const renderShallow: EngineFn = blit(draw, shallowTraits);

export const SHALLOW_ASPECTS = [1, 0.81, 1.24] as const;
