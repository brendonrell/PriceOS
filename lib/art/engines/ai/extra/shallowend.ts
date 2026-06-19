// @ts-nocheck
/*
 * SHALLOWEND — "Shallow End" by deepend-ai. Rippling pool-floor sunlight CAUSTICS,
 * composed as a PIECE rather than a seamless swatch.
 *
 * v2 rework (jury notes addressed):
 *  - FOCAL SYSTEM: a bright sunlit pool-of-light anchored on a phi point that
 *    moves seed to seed (scaled 0.3–1.0x). Caustic density + brightness fall off
 *    with distance from it, so the field has sparse/darker negative space and the
 *    eye lands somewhere. Field is cropped/biased, not edge-to-edge even.
 *  - POOL CUES: a wall→floor bend (the deep end seam) with the floor receding
 *    below it in perspective grout, plus optional angled light shafts and a step
 *    edge. It reads as a pool, not just water texture. Light angle varies/seed.
 *  - PALETTE VARIETY: 6+ genuinely distinct water moods with wide hue
 *    separation (green shallow, deep teal-navy, sunlit warm, dusk violet, night
 *    near-black, dawn warm). Desaturated slightly + a complementary WARM
 *    (sand/coral) at caustic edges + highlights so the piece reads AGAINST the
 *    #0a6e7a teal page instead of dissolving into it.
 *  - PHOTOGRAPHIC: soft vignette + directional light gradient (brighter toward
 *    the sun side), tonal range varies per seed (deep shadow pockets vs bright
 *    caustic hits). Keeps mottle + grain.
 *
 * Deterministic from seed only — no Date/Math.random/network/DOM beyond canvas.
 * mix(hexA,hexB,t) is COLOURS ONLY — numeric interpolation uses plain arithmetic.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ---------------- palettes — distinct water MOODS, wide hue separation ----------------
   Each carries its own warm accent (sand/coral/amber) so caustic edges + highlights
   read against the teal page. Tones kept a notch desaturated on purpose. */
const PALS = [
  // green-shade shallow — yellow-green water, sandy warm
  { name:'Reef Shallows', deep:'#1d6e57', water:'#3a9a72', shallow:'#8fd39a', warm:'#f3d59a', sun:'#fff6df', mood:0 },
  // deep teal → navy, cold and deep
  { name:'Deep End',      deep:'#0a2f4a', water:'#155a72', shallow:'#3f9bb0', warm:'#e8b487', sun:'#eef8ff', mood:1 },
  // sunlit warm-tinted turquoise, strong amber light
  { name:'High Noon',     deep:'#0e6f7e', water:'#26a6ad', shallow:'#79dcc6', warm:'#ffcf86', sun:'#fff3cf', mood:2 },
  // dusk violet caustics over plum water
  { name:'Dusk',          deep:'#2a2750', water:'#4a4f86', shallow:'#8f86c4', warm:'#f3a07f', sun:'#ffe2d6', mood:3 },
  // near-black night water, cold silver light
  { name:'Night Swim',    deep:'#06101c', water:'#0e2638', shallow:'#27566b', warm:'#c98f6a', sun:'#dbeaf2', mood:4 },
  // dawn warm — rose-gold light on pale teal
  { name:'First Light',   deep:'#2a4a5c', water:'#5a8a96', shallow:'#b6ddd2', warm:'#ffbf9a', sun:'#fff0e0', mood:5 },
  // emerald lap pool, jade + coral
  { name:'Jade Lane',     deep:'#0c5040', water:'#159a78', shallow:'#5fd9a8', warm:'#f6a98a', sun:'#f4fff4', mood:0 },
];

const FMTS = [
  { W:1080, H:1080, t:'Square' },
  { W:1000, H:1240, t:'Portrait' },
  { W:1240, H:1000, t:'Landscape' },
];

const DENS    = ['Sparse','Woven','Dense'];                       // caustic mesh density near focus
const FOCUS   = ['Spotlit','Seam','Drift'];                       // what the focal event is
const VIEWS   = ['Floor','Deep End','Step','Shaft'];              // pool structure cue
const SURFACES= ['Still','Lapping','Choppy'];                     // ripple warp amplitude

/* ---------------- params (fixed draw order — all labelled traits first) ---------------- */
function paramsOf(r){
  const palI  = Math.floor(r()*PALS.length);
  const fmt   = pick(FMTS, r);
  const densI = Math.floor(r()*DENS.length);
  const focusI= Math.floor(r()*FOCUS.length);
  const viewI = Math.floor(r()*VIEWS.length);
  const surfI = Math.floor(r()*SURFACES.length);
  // continuous knobs — drawn AFTER all labelled traits so label order is fixed
  const lightAngle = r()*Math.PI*2;            // direction the net leans / sun comes from
  const focalScale = 0.3 + r()*0.7;            // 0.3–1.0x size of the focal pool of light
  // focal anchor snapped toward a phi point, jittered, MOVES per seed
  const phiX = (r() < 0.5 ? INVPHI : 1 - INVPHI) + (r()-0.5)*0.18;
  const phiY = (r() < 0.5 ? INVPHI : 1 - INVPHI) + (r()-0.5)*0.18;
  const tonal      = 0.25 + r()*0.6;           // tonal range: shadow depth vs caustic punch
  const causticScale = 0.7 + r()*0.85;         // cell size of the mesh
  const seamY      = 0.32 + r()*0.34;          // wall→floor bend height (for Deep End / Step)
  const seedJit    = r()*1000;                 // phase jitter for the warps
  const accentMix  = 0.18 + r()*0.22;          // how much warm complementary bleeds in
  return { palI, fmt, densI, focusI, viewI, surfI, lightAngle, focalScale, phiX, phiY, tonal, causticScale, seamY, seedJit, accentMix };
}

function labels(p){
  return {
    Palette:  PALS[p.palI].name,
    Format:   p.fmt.t,
    Caustics: DENS[p.densI],
    Focus:    FOCUS[p.focusI],
    View:     VIEWS[p.viewI],
    Surface:  SURFACES[p.surfI],
  };
}

/* ---------------- paint ---------------- */
function draw(cv, seed){
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI];
  const W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const span = Math.max(W, H);

  const deep    = P.deep;
  const water   = P.water;
  const shallow = P.shallow;
  const warm    = P.warm;
  const dens    = DENS[p.densI];
  const focus   = FOCUS[p.focusI];
  const view    = VIEWS[p.viewI];
  const surf    = SURFACES[p.surfI];

  // light/caustic colour — sun tinted toward the palette's warm, more so at dusk/dawn/noon
  const warmLit = P.mood === 2 || P.mood === 3 || P.mood === 5;
  const sunCol     = mix(P.sun, warm, warmLit ? 0.32 : 0.12);
  const causticCol = mix(shallow, warm, p.accentMix);     // caustics carry the complementary warm
  const causticHi  = mix(causticCol, sunCol, 0.55);

  // focal anchor (the bright pool of light) — phi point, scaled, moves per seed
  const fx = W * clamp(p.phiX, 0.12, 0.88);
  const fy = H * clamp(p.phiY, 0.12, 0.88);
  const focalR = span * (0.30 + p.focalScale * 0.40);     // pool-of-light radius

  // directional sun vector
  const ga = p.lightAngle;
  const gx = Math.cos(ga), gy = Math.sin(ga);

  // ---- 1. water depth gradient — runs along the sun axis so the floor recedes ----
  const grad = x.createLinearGradient(
    W/2 - gx*W*0.6, H/2 - gy*H*0.6,
    W/2 + gx*W*0.6, H/2 + gy*H*0.6
  );
  grad.addColorStop(0,   mix(deep, water, 0.15));
  grad.addColorStop(0.55, water);
  grad.addColorStop(1,   mix(water, shallow, 0.7));
  x.fillStyle = grad;
  x.fillRect(0, 0, W, H);

  // ---- 1b. POOL STRUCTURE — wall→floor bend + receding floor (the "this is a pool" cue) ----
  // Deep End / Step views draw a darker wall above the seam and a lighter floor below.
  const hasSeam = view === 'Deep End' || view === 'Step';
  const seamPx = H * p.seamY;
  if (hasSeam){
    // wall (above seam) sits in shadow / deeper colour
    const wallG = x.createLinearGradient(0, 0, 0, seamPx);
    wallG.addColorStop(0, rgba(mix(deep,'#000',0.25), 0.85));
    wallG.addColorStop(1, rgba(deep, 0.55));
    x.fillStyle = wallG;
    x.fillRect(0, 0, W, seamPx);
    // a soft refracted-light line at the wall-to-floor bend
    x.save();
    x.globalCompositeOperation = 'lighter';
    const lg = x.createLinearGradient(0, seamPx - H*0.04, 0, seamPx + H*0.04);
    lg.addColorStop(0, rgba(causticHi, 0));
    lg.addColorStop(0.5, rgba(causticHi, 0.18 + p.tonal*0.1));
    lg.addColorStop(1, rgba(causticHi, 0));
    x.fillStyle = lg;
    x.fillRect(0, seamPx - H*0.04, W, H*0.08);
    x.restore();
    // a step edge ledge for Step view
    if (view === 'Step'){
      const stepY = seamPx + H*0.16;
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = rgba(mix(deep,'#000',0.15), 0.28);
      x.fillRect(0, seamPx, W, H*0.16);
      x.restore();
      x.save();
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = rgba(causticHi, 0.12);
      x.fillRect(0, stepY - 3, W, 3);
      x.restore();
    }
  }

  // ---- 2. tile grout in perspective (receding toward the seam / top) ----
  // vanishing point pulled toward the sun side & seam for depth.
  {
    const vpX = W * (0.5 + gx*0.22);
    const vpY = hasSeam ? seamPx : H * (0.5 + gy*0.42 - 0.35);
    const floorTop = hasSeam ? seamPx : 0;
    const groutCol = mix(P.deep, '#000', 0.2);
    const cols = 9, rows = 11;
    x.save();
    x.globalAlpha = 0.5;
    x.strokeStyle = rgba(groutCol, 0.5);
    x.lineWidth = Math.max(1, span*0.0016);
    // vertical grout lines fan from the vanishing point down to the bottom edge
    for (let i = 0; i <= cols; i++){
      const bx = (i / cols) * W;
      x.beginPath();
      x.moveTo(vpX + (bx - vpX)*0.12, vpY);
      x.lineTo(bx, H);
      x.stroke();
    }
    // horizontal grout lines compress toward the vanishing line (perspective)
    for (let j = 0; j <= rows; j++){
      const t = j / rows;
      const yy = floorTop + (H - floorTop) * (t*t);   // quadratic spacing = receding
      x.beginPath();
      x.moveTo(0, yy);
      x.lineTo(W, yy);
      x.stroke();
    }
    x.restore();
  }

  // ---- 3. FOCAL pool-of-light — the bright sunlit hotspot anchored on the phi point ----
  // This is the subject. Density of everything else falls off from it.
  {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, focalR);
    const peak = 0.30 + p.tonal*0.28;
    g.addColorStop(0,    rgba(mix(sunCol, causticHi, 0.3), peak));
    g.addColorStop(0.35, rgba(causticHi, peak*0.45));
    g.addColorStop(0.7,  rgba(causticCol, peak*0.16));
    g.addColorStop(1,    rgba(causticCol, 0));
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    x.restore();
    // darken the far corners away from focus (negative space the eye skips)
    x.save();
    x.globalCompositeOperation = 'multiply';
    const dgC = x.createRadialGradient(fx, fy, focalR*0.5, fx, fy, span*1.05);
    dgC.addColorStop(0, rgba(deep, 0));
    dgC.addColorStop(1, rgba(mix(deep,'#000',0.3), 0.32 + p.tonal*0.2));
    x.fillStyle = dgC;
    x.fillRect(0, 0, W, H);
    x.restore();
  }

  // density helper: 1 near the focal pool, → 0 in the far negative space
  const focalFall = (cx, cy) => {
    const dx2 = (cx - fx) / focalR, dy2 = (cy - fy) / focalR;
    const d = Math.sqrt(dx2*dx2 + dy2*dy2);
    return clamp(1 - d*0.78, 0.06, 1);
  };

  // ---- 4. the caustic net: two crossing families of warped bright ribbons, additive ----
  // Brightness modulated by focalFall so the net concentrates around the subject.
  const layerCount = dens === 'Dense' ? 5 : dens === 'Woven' ? 4 : 3;
  const baseLines  = dens === 'Dense' ? 28 : dens === 'Woven' ? 20 : 13;
  const amp = surf === 'Choppy' ? 1.0 : surf === 'Lapping' ? 0.62 : 0.32;
  const cellSize = span * 0.085 * p.causticScale;

  x.save();
  x.globalCompositeOperation = 'lighter';
  x.lineCap = 'round';
  for (let fam = 0; fam < 2; fam++){
    const dir = fam === 0 ? p.lightAngle : p.lightAngle + Math.PI*0.5 + (r()-0.5)*0.4;
    const dx = Math.cos(dir), dy = Math.sin(dir);
    const px = -dy, py = dx;
    for (let L = 0; L < layerCount; L++){
      const layerT = L / layerCount;
      const freq1 = (1.1 + r()*1.6) / cellSize;
      const freq2 = (2.3 + r()*3.0) / cellSize;
      const ph1 = p.seedJit + r()*Math.PI*2;
      const ph2 = p.seedJit + r()*Math.PI*2;
      const warpA = cellSize * amp * (0.55 + layerT*0.7);
      const lineW = Math.max(1.4, cellSize * (0.06 + layerT*0.1) + r()*2);
      const glow  = (0.05 + r()*0.06) * (1 - layerT*0.4);
      const col   = mix(causticCol, fam ? sunCol : causticHi, layerT*0.5);
      const n = baseLines + rint(r, -4, 4);
      const spacing = (span*1.6) / n;
      for (let i = 0; i < n; i++){
        const off = (i - n/2) * spacing + randn(r)*spacing*0.35;
        const ox = W/2 + px*off;
        const oy = H/2 + py*off;
        const baseBright = clamp(glow * (0.6 + r()*0.9), 0.02, 0.2);
        x.lineWidth = lineW;
        x.beginPath();
        const steps = 44;
        const length = span*1.8;
        // stroke in short segments so brightness can vary with focal proximity
        let prevX = 0, prevY = 0;
        for (let s = 0; s <= steps; s++){
          const t = s/steps;
          const along = (t - 0.5) * length;
          const w1 = Math.sin(along*freq1 + ph1 + off*0.01);
          const w2 = Math.sin(along*freq2 + ph2 - off*0.013);
          const warp = (w1*0.7 + w2*0.3) * warpA;
          const cx = ox + dx*along + px*warp;
          const cy = oy + dy*along + py*warp;
          if (s > 0){
            const midX = (cx+prevX)/2, midY = (cy+prevY)/2;
            const ff = focalFall(midX, midY);
            x.strokeStyle = rgba(col, clamp(baseBright * (0.25 + ff*0.95), 0.01, 0.26));
            x.beginPath();
            x.moveTo(prevX, prevY);
            x.lineTo(cx, cy);
            x.stroke();
          }
          prevX = cx; prevY = cy;
        }
      }
    }
  }
  x.restore();

  // ---- 5. caustic knots — brightest where the net crosses, biased to the focal pool ----
  x.save();
  x.globalCompositeOperation = 'lighter';
  const knotsBase = dens === 'Dense' ? 200 : dens === 'Woven' ? 140 : 80;
  for (let i = 0; i < knotsBase; i++){
    // sample biased toward the focal pool (numeric lerp — NOT mix())
    const rx = r()*W, ry = r()*H;
    const bx = rx + (fx - rx)*0.45*r(), by = ry + (fy - ry)*0.45*r();
    const ff = focalFall(bx, by);
    if (r() > ff*0.95 + 0.05) continue;               // thin out away from focus → negative space
    const rad = cellSize * (0.07 + r()*0.2) * (surf === 'Choppy' ? 1.3 : 1);
    const a = (0.05 + r()*0.13) * (0.4 + ff*0.8);
    const g = x.createRadialGradient(bx, by, 0, bx, by, rad);
    g.addColorStop(0, rgba(causticHi, a));
    g.addColorStop(0.6, rgba(causticCol, a*0.4));
    g.addColorStop(1, rgba(causticCol, 0));
    x.fillStyle = g;
    x.beginPath();
    x.arc(bx, by, rad, 0, Math.PI*2);
    x.fill();
  }
  x.restore();

  // ---- 6. FOCUS event: Spotlit core / Seam of light / Drift of pools ----
  x.save();
  x.globalCompositeOperation = 'screen';
  if (focus === 'Spotlit'){
    // a tight bright core inside the focal pool
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, focalR*0.4);
    g.addColorStop(0, rgba(sunCol, 0.4 + p.tonal*0.25));
    g.addColorStop(0.5, rgba(causticHi, 0.16));
    g.addColorStop(1, rgba(causticHi, 0));
    x.fillStyle = g; x.fillRect(0,0,W,H);
  } else if (focus === 'Seam'){
    // a sunlit pool-floor seam crossing through the focal point along the light axis
    const sx = -gy, sy = gx; // perpendicular to sun → the seam runs across
    x.lineCap = 'round';
    for (let k = 0; k < 3; k++){
      const w = focalR * (0.5 - k*0.13);
      x.strokeStyle = rgba(k === 0 ? sunCol : causticHi, (0.22 - k*0.05) + p.tonal*0.12);
      x.lineWidth = Math.max(2, focalR*(0.06 - k*0.015));
      x.beginPath();
      x.moveTo(fx - sx*w*1.4, fy - sy*w*1.4);
      x.quadraticCurveTo(fx + gx*focalR*0.12, fy + gy*focalR*0.12, fx + sx*w*1.4, fy + sy*w*1.4);
      x.stroke();
    }
  } else {
    // Drift: a short chain of warm sunlit pools leading the eye away from focus
    let cxp = fx, cyp = fy;
    const lead = 4 + Math.floor(p.focalScale*3);
    for (let k = 0; k < lead; k++){
      const rad = focalR * (0.26 - k*0.03) * (0.7 + r()*0.6);
      if (rad <= 0) break;
      const g = x.createRadialGradient(cxp, cyp, 0, cxp, cyp, rad);
      const a = (0.26 - k*0.03) + p.tonal*0.1;
      g.addColorStop(0, rgba(k===0?sunCol:causticHi, a));
      g.addColorStop(0.6, rgba(causticHi, a*0.3));
      g.addColorStop(1, rgba(causticHi, 0));
      x.fillStyle = g;
      x.beginPath(); x.arc(cxp, cyp, rad, 0, Math.PI*2); x.fill();
      cxp += gx*focalR*0.28 + (r()-0.5)*focalR*0.2;
      cyp += gy*focalR*0.28 + (r()-0.5)*focalR*0.2;
    }
  }
  x.restore();

  // ---- 7. angled light SHAFTS down through the water (Shaft view, or warm-lit moods) ----
  if (view === 'Shaft'){
    x.save();
    x.globalCompositeOperation = 'screen';
    const shafts = 4 + rint(r, 0, 3);
    for (let i = 0; i < shafts; i++){
      const baseX = fx + (i - shafts/2) * (focalR*0.5/shafts) + randn(r)*W*0.06;
      const topX  = baseX - gx*W*0.5;
      const wTop = W*(0.02 + r()*0.03), wBot = wTop*2.4;
      const a = (0.05 + r()*0.06) + p.tonal*0.04;
      const lg = x.createLinearGradient(topX, 0, baseX, H);
      lg.addColorStop(0, rgba(sunCol, a));
      lg.addColorStop(1, rgba(sunCol, 0));
      x.fillStyle = lg;
      x.beginPath();
      x.moveTo(topX - wTop, 0); x.lineTo(topX + wTop, 0);
      x.lineTo(baseX + wBot, H); x.lineTo(baseX - wBot, H);
      x.closePath(); x.fill();
    }
    x.restore();
  }

  // ---- 8. surface shimmer streaks (ripple glints) ----
  if (surf !== 'Still'){
    x.save();
    x.globalCompositeOperation = 'lighter';
    const streaks = surf === 'Choppy' ? 24 : 12;
    for (let i = 0; i < streaks; i++){
      const sy = r()*H, sw = W*(0.1 + r()*0.4), sx0 = r()*W;
      const ff = focalFall(sx0 + sw*0.5, sy);
      x.strokeStyle = rgba(sunCol, (0.03 + r()*0.05) * (0.4 + ff*0.7));
      x.lineWidth = 1 + r()*2.5;
      x.beginPath();
      const wob = (r()-0.5)*18;
      x.moveTo(sx0, sy);
      x.quadraticCurveTo(sx0+sw*0.5, sy+wob, sx0+sw, sy);
      x.stroke();
    }
    x.restore();
  }

  // ---- 9. directional light gradient — brighter toward the sun side ----
  x.save();
  x.globalCompositeOperation = 'soft-light';
  const lgr = x.createLinearGradient(W/2 - gx*W*0.5, H/2 - gy*H*0.5, W/2 + gx*W*0.5, H/2 + gy*H*0.5);
  lgr.addColorStop(0, rgba('#000000', 0.18*p.tonal));
  lgr.addColorStop(0.5, rgba('#808080', 0));
  lgr.addColorStop(1, rgba(sunCol, 0.16));
  x.fillStyle = lgr;
  x.fillRect(0, 0, W, H);
  x.restore();

  // ---- 10. warm complementary edge bleed so the piece reads against the teal page ----
  x.save();
  x.globalCompositeOperation = 'overlay';
  const eg = x.createRadialGradient(W/2, H/2, span*0.35, W/2, H/2, span*0.72);
  eg.addColorStop(0, rgba(warm, 0));
  eg.addColorStop(1, rgba(warm, p.accentMix*0.5));
  x.fillStyle = eg;
  x.fillRect(0, 0, W, H);
  x.restore();

  // ---- 11. far-side depth darkening (tonal range — deep shadow pockets) ----
  x.save();
  x.globalCompositeOperation = 'multiply';
  const dg = x.createLinearGradient(W/2 + gx*W*0.5, H/2 + gy*H*0.5, W/2 - gx*W*0.5, H/2 - gy*H*0.5);
  dg.addColorStop(0, rgba(deep, 0));
  dg.addColorStop(1, rgba(mix(deep,'#000',0.2), 0.26*p.tonal + 0.08));
  x.fillStyle = dg;
  x.fillRect(0, 0, W, H);
  x.restore();

  // ---- 12. organic texture + photographic finish ----
  mottle(x, 0, 0, W, H, water, 1100, r, 'overlay');
  grain(x, W, H, 1400, r);
  vignette(x, W, H, 0.2 + p.tonal*0.12);
}

/* ---------------- exports ---------------- */
export const shallowTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const shallowSchema: TraitSchema = {
  traits: [
    { name:'Palette',  values: PALS.map(p => p.name) },
    { name:'Format',   values: ['Square','Portrait','Landscape'] },
    { name:'Caustics', values: DENS.slice() },
    { name:'Focus',    values: FOCUS.slice() },
    { name:'View',     values: VIEWS.slice() },
    { name:'Surface',  values: SURFACES.slice() },
  ],
};

export const renderShallow: EngineFn = blit(draw, shallowTraits);

export const SHALLOW_ASPECTS = [1, 0.81, 1.24] as const;
