// @ts-nocheck
/*
 * SHALLOWEND — "Shallow End" by deepend-ai. Rippling pool-floor sunlight CAUSTICS,
 * composed as a PIECE rather than a seamless swatch.
 *
 * v3 rework — COMPOSITION IS A PRIMARY TRAIT.
 *  The jury slammed the cohort for "no compositional variety — every seed looks
 *  the same, one thing in the middle." This engine now carries a LAYOUT trait with
 *  6 structurally different views, so seeds read like different photographs of a
 *  pool, not one tile recoloured:
 *   1. Overhead  — top-down allover floor caustics, focal bright pool on a phi
 *                  point, darker corners. (the loved original look, fixed.)
 *   2. Deep End  — pool wall meets floor at a waterline seam; caustics on the
 *                  floor below, darker wall above, grout receding in perspective.
 *   3. Sunbeam   — diagonal underwater god-rays cutting from one corner across
 *                  deep water; caustics pooled where they land; lots of dark space.
 *   4. Lane      — lane-lines / tile rows in strong perspective to an off-centre
 *                  vanishing point; caustics riding over them.
 *   5. Macro     — extreme close-up of the caustic net as a near-abstract field,
 *                  one bright knot off-centre, texture-forward.
 *   6. Steps     — pool steps / ladder edge in one corner, water + caustics
 *                  filling the rest; architectural asymmetric crop.
 *  NEVER a dead-centre single bright blob. Focal light anchors on phi points;
 *  bright-water vs deep-shadow balance and light direction vary per seed.
 *
 *  Caustic quality preserved (two crossing warped ribbon families + knots, warm
 *  complementary accent so it reads against the #0a6e7a teal page, photographic
 *  mottle/grain/vignette finish). 10 distinct water moods, wide hue separation.
 *
 * Deterministic from seed only — no Date/Math.random/network/DOM beyond canvas.
 * mix(hexA,hexB,t) is COLOURS ONLY — numeric interpolation uses plain arithmetic.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ---------------- palettes — 10 distinct water MOODS, wide hue separation ----------------
   Each carries its own warm accent (sand/coral/amber) so caustic edges + highlights
   read against the teal page. warmLit moods tint the sun toward the accent. */
const PALS = [
  { name:'Chlorine Pop',   deep:'#0566a8', water:'#00b8e6', shallow:'#5ff4ff', warm:'#ffcf70', sun:'#f4ffff', warmLit:false }, // vivid chlorine cyan
  { name:'Tropic Aqua',    deep:'#018a8c', water:'#06d6c4', shallow:'#74ffe0', warm:'#ffb347', sun:'#fffae0', warmLit:true  }, // tropical aqua
  { name:'Emerald Jade',   deep:'#0a7a4a', water:'#11c46f', shallow:'#5dffae', warm:'#ff9a5a', sun:'#f2fff0', warmLit:false }, // emerald jade
  { name:'Deep Sapphire',  deep:'#04265e', water:'#0b54c8', shallow:'#3f9fff', warm:'#ffb066', sun:'#eaf3ff', warmLit:false }, // deep sapphire
  { name:'High Noon',      deep:'#0792a0', water:'#15d4d0', shallow:'#86ffe6', warm:'#ffd24d', sun:'#fffae6', warmLit:true  }, // turquoise high-noon
  { name:'Sunlit Amber',   deep:'#0c8f8a', water:'#1fc9b0', shallow:'#9bf7c8', warm:'#ffb52e', sun:'#fff2c2', warmLit:true  }, // warm sunlit amber-tint
  { name:'Dawn Rose-Gold', deep:'#3a6e88', water:'#4fb4c4', shallow:'#bdf0e2', warm:'#ff9d7a', sun:'#ffe3cf', warmLit:true  }, // dawn rose-gold
  { name:'Dusk Violet',    deep:'#3a2270', water:'#6a3fc8', shallow:'#b58fff', warm:'#ff7eb0', sun:'#ffe0f2', warmLit:true  }, // dusk violet
  { name:'Night Swim',     deep:'#04132e', water:'#0a3d72', shallow:'#2f86c4', warm:'#e0985a', sun:'#cfe6ff', warmLit:false }, // darker night
  { name:'Storm Slate',    deep:'#1c2e3a', water:'#2f6a82', shallow:'#6fb4c4', warm:'#e0a060', sun:'#e6f2f4', warmLit:false }, // storm slate
];

const FMTS = [
  { W:1080, H:1080, t:'Square' },
  { W:1000, H:1240, t:'Portrait' },
  { W:1240, H:1000, t:'Landscape' },
];

const LAYOUTS  = ['Overhead','Deep End','Sunbeam','Lane','Macro','Steps']; // PRIMARY compositional trait
const DENS     = ['Sparse','Woven','Dense'];                              // caustic mesh density near focus
const SURFACES = ['Still','Lapping','Choppy'];                            // ripple warp amplitude

/* ---------------- params (fixed draw order — all labelled traits first) ---------------- */
function paramsOf(r){
  const palI   = Math.floor(r()*PALS.length);
  const fmt    = pick(FMTS, r);
  const layI   = Math.floor(r()*LAYOUTS.length);
  const densI  = Math.floor(r()*DENS.length);
  const surfI  = Math.floor(r()*SURFACES.length);
  // continuous knobs — drawn AFTER all labelled traits so label order is fixed
  const lightAngle = r()*Math.PI*2;            // sun / net lean direction
  const focalScale = 0.3 + r()*0.7;            // 0.3–1.0x size of the focal pool of light
  // focal anchor snapped toward a phi point, jittered, MOVES per seed (never centre)
  const phiX = (r() < 0.5 ? INVPHI : 1 - INVPHI) + (r()-0.5)*0.16;
  const phiY = (r() < 0.5 ? INVPHI : 1 - INVPHI) + (r()-0.5)*0.16;
  const tonal      = 0.25 + r()*0.6;           // tonal range: shadow depth vs caustic punch
  const causticScale = 0.7 + r()*0.85;         // cell size of the mesh
  const seamY      = 0.30 + r()*0.34;          // waterline / step seam height
  const seedJit    = r()*1000;                 // phase jitter for the warps
  const accentMix  = 0.18 + r()*0.22;          // how much warm complementary bleeds in
  const corner     = Math.floor(r()*4);        // which corner the beam / steps anchor to
  const vanX       = (r()<0.5 ? 0.22 : 0.78) + (r()-0.5)*0.12; // off-centre vanishing point for Lane
  const macroZoom  = 1.7 + r()*1.3;            // close-up factor for Macro
  return { palI, fmt, layI, densI, surfI, lightAngle, focalScale, phiX, phiY, tonal,
           causticScale, seamY, seedJit, accentMix, corner, vanX, macroZoom };
}

function labels(p){
  return {
    Palette: PALS[p.palI].name,
    Format:  p.fmt.t,
    Layout:  LAYOUTS[p.layI],
    Caustics:DENS[p.densI],
    Surface: SURFACES[p.surfI],
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
  const layout  = LAYOUTS[p.layI];
  const dens    = DENS[p.densI];
  const surf    = SURFACES[p.surfI];

  // light/caustic colour — sun tinted toward the palette's warm on warmLit moods
  const sunCol     = mix(P.sun, warm, P.warmLit ? 0.32 : 0.12);
  const causticCol = mix(shallow, warm, p.accentMix);     // caustics carry the complementary warm
  const causticHi  = mix(causticCol, sunCol, 0.55);

  // directional sun vector
  const ga = p.lightAngle;
  const gx = Math.cos(ga), gy = Math.sin(ga);

  // corner anchor (for Sunbeam / Steps) — one of four corners
  const cornerXY = [[0,0],[1,0],[1,1],[0,1]][p.corner];
  const cornX = cornerXY[0]*W, cornY = cornerXY[1]*H;

  // focal anchor (the bright pool of light) — phi point, scaled, moves per seed.
  // Each layout overrides this so the focus sits where that composition wants it.
  let fx = W * clamp(p.phiX, 0.12, 0.88);
  let fy = H * clamp(p.phiY, 0.12, 0.88);
  let focalR = span * (0.30 + p.focalScale * 0.40);
  const seamPx = H * p.seamY;

  if (layout === 'Deep End'){
    // focus lands on the lit floor BELOW the waterline seam
    fy = clamp(seamPx + H*0.32, seamPx + H*0.12, H*0.86);
  } else if (layout === 'Sunbeam'){
    // focus where the beam lands — diagonally opposite the corner it falls from
    fx = W*(0.5 + (0.5 - cornerXY[0])*0.7);
    fy = H*(0.5 + (0.5 - cornerXY[1])*0.7);
    focalR = span * (0.22 + p.focalScale*0.3);
  } else if (layout === 'Macro'){
    // a single bright knot, off-centre on a phi point, tight
    focalR = span * (0.18 + p.focalScale*0.22);
  } else if (layout === 'Steps'){
    // focus in the open water away from the step corner
    fx = W*(0.5 + (0.5 - cornerXY[0])*0.6);
    fy = H*(0.5 + (0.5 - cornerXY[1])*0.6);
  }

  // density falloff helper: 1 near focus → low in far negative space
  const focalFall = (cx, cy) => {
    const dx2 = (cx - fx) / focalR, dy2 = (cy - fy) / focalR;
    const d = Math.sqrt(dx2*dx2 + dy2*dy2);
    return clamp(1 - d*0.78, 0.06, 1);
  };

  // ============================================================ 1. WATER BASE
  // depth gradient runs along the sun axis so the floor recedes
  const grad = x.createLinearGradient(
    W/2 - gx*W*0.6, H/2 - gy*H*0.6,
    W/2 + gx*W*0.6, H/2 + gy*H*0.6
  );
  grad.addColorStop(0,   mix(deep, water, 0.15));
  grad.addColorStop(0.55, water);
  grad.addColorStop(1,   mix(water, shallow, 0.7));
  x.fillStyle = grad;
  x.fillRect(0, 0, W, H);

  // Sunbeam wants the base pushed deeper (more negative space / darker field)
  if (layout === 'Sunbeam'){
    x.save(); x.globalCompositeOperation='multiply';
    x.fillStyle = rgba(mix(deep,'#000',0.25), 0.4 + p.tonal*0.2);
    x.fillRect(0,0,W,H); x.restore();
  }

  // ============================================================ 2. STRUCTURE
  // ---- Deep End: darker wall above the waterline seam, lit floor below ----
  if (layout === 'Deep End'){
    const wallG = x.createLinearGradient(0, 0, 0, seamPx);
    wallG.addColorStop(0, rgba(mix(deep,'#000',0.30), 0.92));
    wallG.addColorStop(1, rgba(deep, 0.6));
    x.fillStyle = wallG;
    x.fillRect(0, 0, W, seamPx);
    // refracted-light line at the wall→floor bend
    x.save(); x.globalCompositeOperation='lighter';
    const lg = x.createLinearGradient(0, seamPx - H*0.05, 0, seamPx + H*0.05);
    lg.addColorStop(0, rgba(causticHi, 0));
    lg.addColorStop(0.5, rgba(causticHi, 0.22 + p.tonal*0.12));
    lg.addColorStop(1, rgba(causticHi, 0));
    x.fillStyle = lg; x.fillRect(0, seamPx - H*0.05, W, H*0.1);
    x.restore();
    // faint vertical wall tiling above the seam
    x.save(); x.globalAlpha=0.4;
    x.strokeStyle = rgba(mix(deep,'#000',0.2), 0.5);
    x.lineWidth = Math.max(1, span*0.0014);
    for (let i=1;i<8;i++){ const wx=i/8*W; x.beginPath(); x.moveTo(wx,0); x.lineTo(wx,seamPx); x.stroke(); }
    for (let j=1;j<3;j++){ const wy=j/3*seamPx; x.beginPath(); x.moveTo(0,wy); x.lineTo(W,wy); x.stroke(); }
    x.restore();
  }

  // ---- floor grout in perspective: Overhead / Deep End / Steps get a recede ----
  if (layout === 'Overhead' || layout === 'Deep End' || layout === 'Steps'){
    const floorTop = layout === 'Deep End' ? seamPx : 0;
    const vpX = W * (0.5 + gx*0.22);
    const vpY = layout === 'Deep End' ? seamPx : H * (0.18 + (gy*0.5+0.5)*0.1);
    const groutCol = mix(P.deep, '#000', 0.2);
    const cols = 9, rows = 11;
    x.save(); x.globalAlpha = 0.45;
    x.strokeStyle = rgba(groutCol, 0.5);
    x.lineWidth = Math.max(1, span*0.0016);
    for (let i = 0; i <= cols; i++){
      const bx = (i / cols) * W;
      x.beginPath();
      x.moveTo(vpX + (bx - vpX)*0.12, vpY);
      x.lineTo(bx, H);
      x.stroke();
    }
    for (let j = 0; j <= rows; j++){
      const t = j / rows;
      const yy = floorTop + (H - floorTop) * (t*t);
      x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke();
    }
    x.restore();
  }

  // ---- Lane: strong perspective lane-lines to an OFF-CENTRE vanishing point ----
  if (layout === 'Lane'){
    const vpX = W * p.vanX;
    const vpY = H * (0.30 + (gy*0.5+0.5)*0.12);
    const laneCol = mix(P.deep, '#000', 0.28);
    const laneHi  = mix(shallow, sunCol, 0.4);
    x.save();
    const lanes = 7 + rint(r,0,2);
    for (let i = 0; i <= lanes; i++){
      const bx = (i / lanes) * W * 1.4 - W*0.2;
      // dark grout band
      x.strokeStyle = rgba(laneCol, 0.55);
      x.lineWidth = Math.max(2, span*0.006 * (1 - (vpY/H)*0.3));
      x.beginPath(); x.moveTo(vpX, vpY); x.lineTo(bx, H); x.stroke();
      // bright tile crown beside it (the painted lane line)
      x.save(); x.globalCompositeOperation='lighter';
      x.strokeStyle = rgba(laneHi, 0.1 + p.tonal*0.06);
      x.lineWidth = Math.max(1, span*0.003);
      x.beginPath(); x.moveTo(vpX, vpY); x.lineTo(bx + W*0.02, H); x.stroke();
      x.restore();
    }
    // cross tile rows compressing toward the vanishing line
    x.globalAlpha = 0.4;
    x.strokeStyle = rgba(laneCol, 0.5);
    x.lineWidth = Math.max(1, span*0.0016);
    for (let j = 1; j <= 9; j++){
      const t = j/9;
      const yy = vpY + (H - vpY) * (t*t);
      x.beginPath(); x.moveTo(0, yy); x.lineTo(W, yy); x.stroke();
    }
    x.restore();
  }

  // ============================================================ 3. FOCAL LIGHT
  // bright sunlit pool anchored on the phi/layout focus — the subject; everything falls off from it.
  // Macro skips the broad pool (it IS the close-up net); others paint it.
  if (layout !== 'Macro'){
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
  }
  // darken corners away from focus (negative space the eye skips)
  {
    x.save();
    x.globalCompositeOperation = 'multiply';
    const darkPunch = (layout==='Sunbeam'||layout==='Macro') ? 0.42 : 0.32;
    const dgC = x.createRadialGradient(fx, fy, focalR*0.5, fx, fy, span*1.05);
    dgC.addColorStop(0, rgba(deep, 0));
    dgC.addColorStop(1, rgba(mix(deep,'#000',0.3), darkPunch + p.tonal*0.2));
    x.fillStyle = dgC;
    x.fillRect(0, 0, W, H);
    x.restore();
  }

  // ============================================================ 4. CAUSTIC NET
  // two crossing families of warped bright ribbons, additive; brightness modulated
  // by focalFall so the net concentrates around the subject. Macro zooms the cell
  // size way up for the near-abstract close-up.
  const layerCount = dens === 'Dense' ? 5 : dens === 'Woven' ? 4 : 3;
  const baseLines  = dens === 'Dense' ? 28 : dens === 'Woven' ? 20 : 13;
  const amp = surf === 'Choppy' ? 1.0 : surf === 'Lapping' ? 0.62 : 0.32;
  const macroMul = layout === 'Macro' ? p.macroZoom : 1;
  const cellSize = span * 0.085 * p.causticScale * macroMul;
  // Sunbeam: net only really shows where the beam lands (near focus) — clamp falloff tighter.
  const netFall = (cx, cy) => {
    let ff = focalFall(cx, cy);
    if (layout === 'Sunbeam') ff = clamp(ff*1.15 - 0.12, 0.02, 1);
    return ff;
  };

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
        const steps = 44;
        const length = span*1.8;
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
            // Deep End: kill caustics above the waterline (they live on the floor)
            let gate = 1;
            if (layout === 'Deep End' && midY < seamPx) gate = 0.04;
            const ff = netFall(midX, midY) * gate;
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

  // ============================================================ 5. CAUSTIC KNOTS
  // brightest where the net crosses, biased to the focal pool.
  x.save();
  x.globalCompositeOperation = 'lighter';
  const knotsBase = dens === 'Dense' ? 200 : dens === 'Woven' ? 140 : 80;
  for (let i = 0; i < knotsBase; i++){
    const rx = r()*W, ry = r()*H;
    const bx = rx + (fx - rx)*0.45*r(), by = ry + (fy - ry)*0.45*r();
    if (layout === 'Deep End' && by < seamPx) continue;        // floor only
    const ff = netFall(bx, by);
    if (r() > ff*0.95 + 0.05) continue;
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

  // ============================================================ 6. LAYOUT FOCAL EVENT
  if (layout === 'Macro'){
    // a single bright knot off-centre — the close-up subject
    x.save(); x.globalCompositeOperation='screen';
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, focalR);
    g.addColorStop(0, rgba(sunCol, 0.5 + p.tonal*0.25));
    g.addColorStop(0.4, rgba(causticHi, 0.22));
    g.addColorStop(1, rgba(causticHi, 0));
    x.fillStyle = g; x.fillRect(0,0,W,H);
    x.restore();
  } else {
    // a tight bright core inside the focal pool (gives the eye a landing point)
    x.save(); x.globalCompositeOperation='screen';
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, focalR*0.4);
    g.addColorStop(0, rgba(sunCol, 0.36 + p.tonal*0.22));
    g.addColorStop(0.5, rgba(causticHi, 0.14));
    g.addColorStop(1, rgba(causticHi, 0));
    x.fillStyle = g; x.fillRect(0,0,W,H);
    x.restore();
  }

  // ============================================================ 7. GOD-RAYS / SHAFTS
  // Sunbeam: strong diagonal underwater light shafts from one corner across deep water.
  if (layout === 'Sunbeam'){
    x.save();
    x.globalCompositeOperation = 'screen';
    // beam axis runs from the chosen corner toward the focus
    const ang = Math.atan2(fy - cornY, fx - cornX);
    const ax = Math.cos(ang), ay = Math.sin(ang);
    const perpX = -ay, perpY = ax;
    const shafts = 5 + rint(r, 0, 3);
    const reach = span * 1.5;
    for (let i = 0; i < shafts; i++){
      const spread = (i - shafts/2) * (span*0.05) + randn(r)*span*0.04;
      const sx0 = cornX + perpX*spread;
      const sy0 = cornY + perpY*spread;
      const ex  = cornX + ax*reach + perpX*spread*2.2;
      const ey  = cornY + ay*reach + perpY*spread*2.2;
      const wTop = span*(0.012 + r()*0.02), wBot = wTop*2.6;
      const a = (0.06 + r()*0.07) + p.tonal*0.05;
      const lg = x.createLinearGradient(sx0, sy0, ex, ey);
      lg.addColorStop(0, rgba(sunCol, a));
      lg.addColorStop(0.7, rgba(sunCol, a*0.4));
      lg.addColorStop(1, rgba(sunCol, 0));
      x.fillStyle = lg;
      x.beginPath();
      x.moveTo(sx0 - perpX*wTop, sy0 - perpY*wTop);
      x.lineTo(sx0 + perpX*wTop, sy0 + perpY*wTop);
      x.lineTo(ex  + perpX*wBot, ey  + perpY*wBot);
      x.lineTo(ex  - perpX*wBot, ey  - perpY*wBot);
      x.closePath(); x.fill();
    }
    x.restore();
  }

  // ============================================================ 8. STEPS / EDGE
  // pool steps or ladder edge tucked into one corner; an architectural asymmetric crop.
  if (layout === 'Steps'){
    x.save();
    const flipX = cornerXY[0] === 1 ? -1 : 1;
    const flipY = cornerXY[1] === 1 ? -1 : 1;
    const reg = 0.42;                       // steps occupy ~42% of the short side from the corner
    const sw = W*reg, sh = H*reg;
    const ux = (u) => cornX + flipX*u*sw;   // u in [0,1] outward from corner
    const uy = (v) => cornY + flipY*v*sh;
    // shadowed corner wedge under the steps
    x.globalCompositeOperation='multiply';
    x.fillStyle = rgba(mix(deep,'#000',0.22), 0.42);
    x.beginPath();
    x.moveTo(cornX, cornY); x.lineTo(ux(1.05), cornY); x.lineTo(cornX, uy(1.05));
    x.closePath(); x.fill();
    x.restore();
    // the step treads — receding nested bands, each lit on its front lip
    const treads = 4;
    for (let s = 0; s < treads; s++){
      const t0 = s / treads, t1 = (s+1) / treads;
      const inset = 1 - t0*0.85;             // each tread smaller toward the corner
      x.save();
      x.globalCompositeOperation='multiply';
      x.fillStyle = rgba(mix(deep,'#000',0.12), 0.18 + s*0.04);
      x.beginPath();
      x.moveTo(cornX, uy(t0*inset));
      x.lineTo(ux(t0*inset), cornY);
      x.lineTo(ux(t1*inset), cornY);
      x.lineTo(cornX, uy(t1*inset));
      x.closePath(); x.fill();
      x.restore();
      // lit lip on the tread edge (caustic-lit tile nosing)
      x.save(); x.globalCompositeOperation='lighter';
      x.strokeStyle = rgba(causticHi, 0.18 + p.tonal*0.1);
      x.lineWidth = Math.max(2, span*0.004);
      x.beginPath();
      x.moveTo(cornX, uy(t1*inset));
      x.lineTo(ux(t1*inset), cornY);
      x.stroke();
      x.restore();
    }
    // a slim ladder rail along the very edge for some seeds
    if (r() < 0.5){
      x.save(); x.globalCompositeOperation='screen';
      x.strokeStyle = rgba(sunCol, 0.3);
      x.lineWidth = Math.max(2, span*0.006);
      const rail = 0.12;
      x.beginPath();
      x.moveTo(ux(rail), cornY); x.lineTo(ux(rail), uy(0.9));
      x.moveTo(ux(rail*2.4), cornY); x.lineTo(ux(rail*2.4), uy(0.9));
      x.stroke();
      x.restore();
    }
  }

  // ============================================================ 9. SURFACE SHIMMER
  if (surf !== 'Still'){
    x.save();
    x.globalCompositeOperation = 'lighter';
    const streaks = surf === 'Choppy' ? 24 : 12;
    for (let i = 0; i < streaks; i++){
      const sy = r()*H, sw = W*(0.1 + r()*0.4), sx0 = r()*W;
      if (layout === 'Deep End' && sy < seamPx) continue;
      const ff = netFall(sx0 + sw*0.5, sy);
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

  // ============================================================ 10. PHOTOGRAPHIC FINISH
  // directional light gradient — brighter toward the sun side
  x.save();
  x.globalCompositeOperation = 'soft-light';
  const lgr = x.createLinearGradient(W/2 - gx*W*0.5, H/2 - gy*H*0.5, W/2 + gx*W*0.5, H/2 + gy*H*0.5);
  lgr.addColorStop(0, rgba('#000000', 0.18*p.tonal));
  lgr.addColorStop(0.5, rgba('#808080', 0));
  lgr.addColorStop(1, rgba(sunCol, 0.16));
  x.fillStyle = lgr;
  x.fillRect(0, 0, W, H);
  x.restore();

  // warm complementary edge bleed so the piece reads against the teal page
  x.save();
  x.globalCompositeOperation = 'overlay';
  const eg = x.createRadialGradient(W/2, H/2, span*0.35, W/2, H/2, span*0.72);
  eg.addColorStop(0, rgba(warm, 0));
  eg.addColorStop(1, rgba(warm, p.accentMix*0.5));
  x.fillStyle = eg;
  x.fillRect(0, 0, W, H);
  x.restore();

  // far-side depth darkening (tonal range — deep shadow pockets)
  x.save();
  x.globalCompositeOperation = 'multiply';
  const dg = x.createLinearGradient(W/2 + gx*W*0.5, H/2 + gy*H*0.5, W/2 - gx*W*0.5, H/2 - gy*H*0.5);
  dg.addColorStop(0, rgba(deep, 0));
  dg.addColorStop(1, rgba(mix(deep,'#000',0.2), 0.26*p.tonal + 0.08));
  x.fillStyle = dg;
  x.fillRect(0, 0, W, H);
  x.restore();

  // organic texture + finish
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
    { name:'Layout',   values: LAYOUTS.slice() },
    { name:'Caustics', values: DENS.slice() },
    { name:'Surface',  values: SURFACES.slice() },
  ],
};

export const renderShallow: EngineFn = blit(draw, shallowTraits);

export const SHALLOW_ASPECTS = [1, 0.81, 1.24] as const;
