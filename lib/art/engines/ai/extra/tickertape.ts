// @ts-nocheck
/*
 * TICKERTAPE — "Ticker Tape" by shellcount-ai (the celebration/pyro artist's 2nd project).
 * A TICKER-TAPE PARADE: paper streamers, confetti and ticker strips raining down a
 * city canyon, with a finance wink — the ticker strips carry tiny price quotes
 * (▲ 4.20 / AAPL 182 / +1.7%), green-up / red-down. Celebratory, kinetic, Americana.
 *
 * COMPOSITION IS A PRIMARY TRAIT. Six structurally different Layouts — no centred
 * single form; focal events anchored on phi points, varied scale/density/negative space:
 *  1. Canyon     — looking up a converging street canyon, paper raining the central gap.
 *  2. Downpour   — full-frame diagonal blizzard, allover field, no single focus.
 *  3. Updraft    — paper caught in a swirling vortex on a phi point, negative space around.
 *  4. Single Strip — hero close-up: one long curling ticker ribbon with legible quotes.
 *  5. Skyline    — low city silhouette along the bottom third, confetti bursting above.
 *  6. Drift Pile — aftermath: paper drifts piled low, a few last strips still falling.
 *
 * Deterministic from seed only — no Date/Math.random/network/DOM beyond canvas.
 * mix(hexA,hexB,t) is COLOURS ONLY — numeric interpolation uses plain arithmetic.
 */
import { rng, pick, rint, randn, clamp, mix, lum, rgba, hsl2hex, grain, vignette, mottle, blit, PHI, INVPHI } from './_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../../../project/types';

/* ---------------- palettes — wide hue separation, each a distinct dominant mood ----------------
   sky = background top, ground = background bottom, ink = the dark for text/silhouettes,
   confetti[] = the paper colours (multi), up = green-up tint, down = red-down tint,
   bright = the hottest highlight, dark flag = is the ground dark (city-dusk default). */
const PALS = [
  // Full Party — every primary blazing on bright newsprint white (LIGHT ground)
  { name:'Full Party', sky:'#ffffff', ground:'#f3eee2', ink:'#161019', bright:'#ffffff',
    up:'#0fae5a', down:'#ee2d52', confetti:['#ff2d6f','#ffcc00','#1bd35e','#16b9ff','#9b30ff','#ff7a1a'], dark:false },
  // Bright Newsprint — hot multicolour scraps on clean broadsheet cream (LIGHT ground)
  { name:'Bright Newsprint', sky:'#fbf7ec', ground:'#e8dfc8', ink:'#15120c', bright:'#ffffff',
    up:'#0e9f50', down:'#d62f3a', confetti:['#e01e63','#ffb300','#1aa84f','#1390e0','#7b2ff7','#ff5a1f'], dark:false },
  // Candy Pop — pink/mint/yellow candy festival on warm white (LIGHT ground)
  { name:'Candy Pop', sky:'#fff4fa', ground:'#ffe6d8', ink:'#3a1030', bright:'#ffffff',
    up:'#19c97a', down:'#ff3d7f', confetti:['#ff5fa2','#7bf0c0','#ffe14d','#5fd0ff','#ff9ec7','#b07bff'], dark:false },
  // Confetti Pop — multi primary on near-black, loud & festive (DARK ground)
  { name:'Confetti Pop', sky:'#141018', ground:'#0a0710', ink:'#050308', bright:'#fffae0',
    up:'#3ddc84', down:'#ff5d7a', confetti:['#ff2d6f','#ffd23f','#27e36a','#1ec8ff','#b15dff','#ff7a1a'], dark:true },
  // Brass & Navy — gleaming brass + bright signal flags on deep navy (DARK ground)
  { name:'Brass & Navy', sky:'#11294a', ground:'#06142a', ink:'#030a18', bright:'#ffe7a8',
    up:'#39e08a', down:'#ff5d63', confetti:['#ffcb3a','#ffe27a','#37c8ff','#ff3d6e','#36e08a','#fff3cf'], dark:true },
  // Hot Primaries — pure RGB+yellow fireworks on midnight blue (DARK ground)
  { name:'Hot Primaries', sky:'#101a36', ground:'#070d22', ink:'#03060f', bright:'#eef6ff',
    up:'#28e36a', down:'#ff3344', confetti:['#ff1f3d','#ffd400','#1fa8ff','#22d65f','#ff7a00','#ffffff'], dark:true },
  // Cyan/Magenta — electric print primaries on indigo (DARK ground)
  { name:'Cyan/Magenta', sky:'#161a3a', ground:'#0a0c22', ink:'#05060f', bright:'#f0fbff',
    up:'#37e6a0', down:'#ff5390', confetti:['#19c8e6','#ff2bd6','#ffe14f','#5cff9e','#8a7bff','#5ce0ff'], dark:true },
  // Gold Rush — opulent gold + jewel sparks on oxblood (DARK ground)
  { name:'Gold Rush', sky:'#4a1616', ground:'#220909', ink:'#120505', bright:'#fff0bf',
    up:'#5fd87a', down:'#ff5a4a', confetti:['#ffd24a','#ffe98a','#ff4b7a','#37d0ff','#7bff9e','#fff0bf'], dark:true },
  // Kraft Carnival — vivid scraps on warm kraft/sepia paper (LIGHT-ish ground)
  { name:'Kraft Carnival', sky:'#d8b483', ground:'#b98d56', ink:'#2a190c', bright:'#fff6e2',
    up:'#0c8f4a', down:'#d8322f', confetti:['#ff2f5e','#ffce1f','#10b85a','#1f9fe0','#8a3bff','#ff6a1f'], dark:false },
  // Dusk Plum — neon party colours over a warm plum-dusk sky (DARK ground)
  { name:'Dusk Plum', sky:'#3a1840', ground:'#1c0a24', ink:'#0c0410', bright:'#ffe9f6',
    up:'#3df0a0', down:'#ff4d8a', confetti:['#ff3d9a','#ffd23f','#3df0a0','#3dc8ff','#c46bff','#ff8a3d'], dark:true },
];

const FMTS = [
  { W:1080, H:1080, t:'Square' },
  { W:1040, H:1300, t:'Portrait' },
  { W:1300, H:1040, t:'Landscape' },
];

const LAYOUTS  = ['Canyon','Downpour','Updraft','Single Strip','Skyline','Drift Pile'];
const CONFETTI = ['Sparse','Heavy','Blizzard'];
const STREAMERS= ['Few','Many','Tangled'];

/* tiny price-like quotes for the ticker strips */
const TICKERS = ['AAPL','NYSE','DOW','BTC','ETH','GOLD','S&P','OIL','PRICE','PD','TSLA','NVDA','SPX','VIX','EUR','YEN'];

/* ---------------- params (fixed draw order — all labelled traits first) ---------------- */
function paramsOf(r){
  const palI    = Math.floor(r()*PALS.length);
  const fmt     = pick(FMTS, r);
  const layoutI = Math.floor(r()*LAYOUTS.length);
  const confI   = Math.floor(r()*CONFETTI.length);
  const streamI = Math.floor(r()*STREAMERS.length);
  // continuous knobs — AFTER labelled traits so label order is fixed
  const fall      = (r()*0.5 - 0.25) + (r() < 0.5 ? 0.55 : -0.55); // diagonal fall lean
  const phiX      = (r() < 0.5 ? INVPHI : 1 - INVPHI) + (r()-0.5)*0.14;
  const phiY      = (r() < 0.5 ? INVPHI : 1 - INVPHI) + (r()-0.5)*0.14;
  const vanish    = 0.30 + r()*0.40;            // canyon vanishing point x (off-centre)
  const horizon   = 0.62 + r()*0.14;            // skyline / pile horizon height
  const swirl     = r()*Math.PI*2;              // updraft vortex phase
  const tonal     = 0.5 + r()*0.5;
  const seedJit   = r()*1000;
  const hueShift  = (r()-0.5)*16;               // small per-seed confetti hue nudge
  return { palI, fmt, layoutI, confI, streamI, fall, phiX, phiY, vanish, horizon, swirl, tonal, seedJit, hueShift };
}

function labels(p){
  return {
    Palette:  PALS[p.palI].name,
    Format:   p.fmt.t,
    Layout:   LAYOUTS[p.layoutI],
    Confetti: CONFETTI[p.confI],
    Streamers:STREAMERS[p.streamI],
  };
}

/* ---------------- paint ---------------- */
function draw(cv, seed){
  try {
  const r = rng(seed);
  const p = paramsOf(r);
  const P = PALS[p.palI];
  const W = p.fmt.W, H = p.fmt.H;
  cv.width = W; cv.height = H;
  const x = cv.getContext('2d');
  const span = Math.max(W, H);

  const layout  = LAYOUTS[p.layoutI];
  const conf    = CONFETTI[p.confI];
  const stream  = STREAMERS[p.streamI];
  const ink     = P.ink;
  const bright  = P.bright;

  // confetti palette nudged a touch per-seed (colour-safe: hsl path, not mix on numbers)
  const confCols = P.confetti.map(c => {
    // small warm/cool nudge via overlay of itself — keep deterministic & simple
    return c;
  });
  const pickConf = () => confCols[Math.floor(r()*confCols.length)];

  // focal anchor on a phi point (moves per seed) — used by Updraft / Single Strip
  const fx = W * clamp(p.phiX, 0.16, 0.84);
  const fy = H * clamp(p.phiY, 0.16, 0.84);

  // fall direction (diagonal) shared by raining paper
  const fa = Math.atan2(1, p.fall);          // mostly downward, leaned by p.fall
  const fdx = Math.cos(fa), fdy = Math.sin(fa);

  /* ---- shared low-level paper primitives ---- */
  function confettiPiece(cx, cy, sz, col, rot, a){
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    x.globalAlpha = a;
    const kind = r();
    if (kind < 0.55){
      // rectangle scrap
      x.fillStyle = col;
      x.fillRect(-sz*0.5, -sz*0.22, sz, sz*0.44);
      // fold shadow down the middle
      x.fillStyle = rgba(mix(col,'#000',0.35), 0.35);
      x.fillRect(-sz*0.5, -sz*0.02, sz, sz*0.06);
    } else if (kind < 0.8){
      // round dot
      x.fillStyle = col;
      x.beginPath(); x.ellipse(0,0,sz*0.5,sz*0.42,0,0,Math.PI*2); x.fill();
      x.fillStyle = rgba(mix(col,'#fff',0.5), 0.4);
      x.beginPath(); x.ellipse(-sz*0.14,-sz*0.12,sz*0.2,sz*0.16,0,0,Math.PI*2); x.fill();
    } else {
      // thin slip (curled paper edge-on)
      x.fillStyle = col;
      x.fillRect(-sz*0.5, -sz*0.08, sz, sz*0.16);
    }
    x.restore();
  }

  // a ticker strip: a short paper ribbon carrying a tiny quote
  function tickerStrip(cx, cy, len, h, rot, scale, withText){
    x.save();
    x.translate(cx, cy);
    x.rotate(rot);
    // paper body — slight gradient for sheen
    const g = x.createLinearGradient(-len/2, 0, len/2, 0);
    const paper = P.dark ? mix(bright, '#ffffff', 0.2) : mix(P.sky, '#ffffff', 0.4);
    g.addColorStop(0, rgba(mix(paper,'#000',0.08), 0.96));
    g.addColorStop(0.5, rgba(paper, 0.98));
    g.addColorStop(1, rgba(mix(paper,'#000',0.12), 0.95));
    x.fillStyle = g;
    x.fillRect(-len/2, -h/2, len, h);
    // edge shadow
    x.strokeStyle = rgba(mix(ink,'#000',0.2), 0.25);
    x.lineWidth = Math.max(1, h*0.06);
    x.strokeRect(-len/2, -h/2, len, h);
    // perforation ticks (ticker-tape feel)
    x.fillStyle = rgba(ink, 0.18);
    const ticks = Math.max(3, Math.floor(len / (h*0.9)));
    for (let i=0;i<=ticks;i++){
      const tx = -len/2 + (i/ticks)*len;
      x.fillRect(tx-0.6, -h/2, 1.2, h*0.14);
      x.fillRect(tx-0.6, h/2-h*0.14, 1.2, h*0.14);
    }
    // tiny quote text
    if (withText && h*scale > 9){
      const up = r() < 0.52;
      const tkr = TICKERS[Math.floor(r()*TICKERS.length)];
      const num = (1 + r()*420).toFixed(r()<0.5?0:1);
      const pct = (r()*4.9).toFixed(1);
      const arrow = up ? '▲' : '▼';
      const txt = r()<0.5 ? (arrow + ' ' + pct + '%') : (tkr + ' ' + num);
      x.fillStyle = up ? P.up : P.down;
      x.font = (h*0.62|0) + 'px Menlo, Consolas, monospace';
      x.textBaseline = 'middle';
      x.textAlign = 'center';
      // shadow for legibility
      x.fillStyle = rgba(ink, 0.45);
      x.fillText(txt, 0.8, 0.8);
      x.fillStyle = up ? P.up : P.down;
      x.fillText(txt, 0, 0);
    }
    x.restore();
  }

  // a curling streamer ribbon (bezier) with shading & twist
  function streamerRibbon(x0, y0, dir, length, baseW, col){
    x.save();
    const segs = 7;
    let px0 = x0, py0 = y0;
    let ang = dir;
    const curl = (r()-0.5)*0.9 + (r()<0.5?0.5:-0.5);
    let wid = baseW;
    for (let s=0; s<segs; s++){
      const segLen = length/segs * (0.7 + r()*0.6);
      ang += curl*(0.4 + r()*0.5) * (s%2? -1: 1);
      const nx = px0 + Math.cos(ang)*segLen;
      const ny = py0 + Math.sin(ang)*segLen;
      const cpx = px0 + Math.cos(ang - 0.6)*segLen*0.5;
      const cpy = py0 + Math.sin(ang - 0.6)*segLen*0.5;
      // twist: alternate light/shadow faces of the ribbon
      const face = s % 2 === 0 ? mix(col,'#fff',0.28) : mix(col,'#000',0.32);
      x.strokeStyle = rgba(face, 0.92);
      x.lineCap = 'round';
      x.lineWidth = Math.max(1.5, wid);
      x.beginPath();
      x.moveTo(px0, py0);
      x.quadraticCurveTo(cpx, cpy, nx, ny);
      x.stroke();
      px0 = nx; py0 = ny;
      wid *= 0.86 + r()*0.1;
    }
    x.restore();
  }

  // motion-blur streak behind a falling piece
  function motionStreak(cx, cy, len, col, a){
    x.save();
    x.globalCompositeOperation = P.dark ? 'lighter' : 'multiply';
    x.strokeStyle = rgba(col, a);
    x.lineCap = 'round';
    x.lineWidth = 1 + r()*1.6;
    x.beginPath();
    x.moveTo(cx, cy);
    x.lineTo(cx - fdx*len, cy - fdy*len);
    x.stroke();
    x.restore();
  }

  /* ---- 1. background: sky→ground gradient (dark city-dusk default) ---- */
  {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, P.sky);
    g.addColorStop(0.55, mix(P.sky, P.ground, 0.5));
    g.addColorStop(1, P.ground);
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    // a soft glow toward the focal area (warm celebration light)
    x.save();
    x.globalCompositeOperation = 'lighter';
    const gx2 = layout==='Skyline' ? W*0.5 : fx;
    const gy2 = layout==='Skyline' ? H*p.horizon : fy;
    const gg = x.createRadialGradient(gx2, gy2, 0, gx2, gy2, span*0.7);
    gg.addColorStop(0, rgba(bright, (P.dark?0.10:0.05) + p.tonal*0.06));
    gg.addColorStop(1, rgba(bright, 0));
    x.fillStyle = gg; x.fillRect(0,0,W,H);
    x.restore();
  }

  /* ============================ LAYOUT-SPECIFIC STRUCTURE ============================ */

  // helper to draw a city building face (used by Canyon & Skyline)
  function building(bx, by, bw, bh, faceCol, lit){
    x.fillStyle = faceCol;
    x.fillRect(bx, by, bw, bh);
    // window grid
    const cols = Math.max(2, Math.floor(bw/ (span*0.022)));
    const rows = Math.max(3, Math.floor(bh/ (span*0.03)));
    for (let cI=0;cI<cols;cI++){
      for (let rI=0;rI<rows;rI++){
        if (r() < 0.42) continue;
        const wx = bx + (cI+0.28)*(bw/cols);
        const wy = by + (rI+0.28)*(bh/rows);
        const ww = (bw/cols)*0.44, wh=(bh/rows)*0.5;
        const onLit = r() < (lit?0.55:0.3);
        x.fillStyle = onLit ? rgba(bright, 0.5+r()*0.4) : rgba(mix(faceCol,'#000',0.4), 0.7);
        x.fillRect(wx, wy, ww, wh);
      }
    }
  }

  if (layout === 'Canyon'){
    // two converging walls + central raining gap; off-centre vanishing point
    const vp = W * p.vanish;
    const wallTop = H*0.0, wallBot = H;
    const gapTop = W*0.22, gapBot = W*0.46;     // central gap widens toward viewer
    // left wall (a trapezoid receding to vp)
    x.save();
    const lFace = mix(P.ground, ink, 0.4);
    x.beginPath();
    x.moveTo(0, wallTop); x.lineTo(vp - gapTop*0.5, wallTop);
    x.lineTo(vp - gapBot*0.5, wallBot); x.lineTo(0, wallBot); x.closePath();
    x.clip();
    building(0, 0, W, H, lFace, false);
    // perspective floor lines on the wall toward vp
    x.strokeStyle = rgba(ink, 0.4); x.lineWidth = Math.max(1, span*0.0015);
    for (let i=1;i<10;i++){ const t=i/10; const yy=H*(t*t); x.beginPath(); x.moveTo(0,yy); x.lineTo(vp, wallTop); x.stroke(); }
    x.restore();
    // right wall
    x.save();
    const rFace = mix(P.ground, ink, 0.22);
    x.beginPath();
    x.moveTo(W, wallTop); x.lineTo(vp + gapTop*0.5, wallTop);
    x.lineTo(vp + gapBot*0.5, wallBot); x.lineTo(W, wallBot); x.closePath();
    x.clip();
    building(0, 0, W, H, rFace, true);
    x.strokeStyle = rgba(ink, 0.4); x.lineWidth = Math.max(1, span*0.0015);
    for (let i=1;i<10;i++){ const t=i/10; const yy=H*(t*t); x.beginPath(); x.moveTo(W,yy); x.lineTo(vp, wallTop); x.stroke(); }
    x.restore();
    // bright sky sliver up the gap (toward vp)
    x.save();
    x.globalCompositeOperation = 'lighter';
    const sg = x.createLinearGradient(vp, wallTop, vp, H*0.5);
    sg.addColorStop(0, rgba(bright, 0.5));
    sg.addColorStop(1, rgba(bright, 0));
    x.fillStyle = sg;
    x.beginPath();
    x.moveTo(vp - gapTop*0.5, wallTop); x.lineTo(vp + gapTop*0.5, wallTop);
    x.lineTo(vp + gapBot*0.5, wallBot); x.lineTo(vp - gapBot*0.5, wallBot); x.closePath();
    x.fill();
    x.restore();
  }

  let pileTopFn = null;  // for Drift Pile, the silhouette top of the paper drift
  if (layout === 'Skyline'){
    // low city silhouette along bottom third
    const hY = H * p.horizon;
    // back silhouette layer
    x.fillStyle = mix(P.ground, ink, 0.45);
    let cx2 = 0;
    while (cx2 < W){
      const bw = span*(0.04 + r()*0.07);
      const bh = (H-hY)*(0.4 + r()*0.9);
      building(cx2, H-bh, bw, bh, mix(P.ground, ink, 0.45), false);
      // roof detail
      if (r()<0.4){ x.fillStyle = mix(P.ground, ink, 0.6); x.fillRect(cx2+bw*0.4, H-bh-span*0.02, bw*0.12, span*0.02); }
      cx2 += bw + span*0.002;
    }
    // front silhouette (darker, taller near a phi column)
    cx2 = -span*0.02;
    while (cx2 < W){
      const bw = span*(0.05 + r()*0.09);
      const near = Math.abs((cx2/W) - p.phiX) < 0.12;
      const bh = (H-hY)*(0.5 + r()*0.7) + (near? (H-hY)*0.5 : 0);
      x.fillStyle = ink;
      x.fillRect(cx2, H-bh, bw, bh);
      // a few lit windows
      for (let k=0;k<6;k++){ if(r()<0.5)continue; x.fillStyle=rgba(bright,0.5+r()*0.4); x.fillRect(cx2+r()*bw*0.8+bw*0.1, H-bh+r()*bh*0.8+bh*0.05, bw*0.1, bh*0.03); }
      cx2 += bw + span*0.004;
    }
  }

  if (layout === 'Drift Pile'){
    // drifts of paper piled at the bottom, wavy silhouette top, empty space above
    const baseY = H * p.horizon;
    const pts = [];
    const N = 14;
    for (let i=0;i<=N;i++){
      const xx = (i/N)*W;
      const yy = baseY + Math.sin(i*1.3 + p.seedJit)*H*0.05 + randn(r)*H*0.03 - (Math.abs(i/N-0.5))* -H*0.04;
      pts.push([xx, yy]);
    }
    pileTopFn = (qx) => {
      const t = clamp(qx/W,0,1)*N; const i=Math.floor(t); const f=t-i;
      const a=pts[Math.min(i,N)], b=pts[Math.min(i+1,N)];
      return a[1] + (b[1]-a[1])*f;
    };
    // layered drift fills (back to front, lightening)
    for (let layer=0; layer<3; layer++){
      const off = layer*H*0.05;
      const col = layer===2 ? mix(bright, P.ground, 0.15)
                : layer===1 ? mix(bright, P.ground, 0.4)
                : mix(P.ground, ink, 0.2);
      x.fillStyle = rgba(col, 0.97);
      x.beginPath();
      x.moveTo(0, H);
      for (let i=0;i<=N;i++){ const a=pts[i]; x.lineTo(a[0], a[1]+off + Math.sin(i*0.7+layer)*H*0.01); }
      x.lineTo(W, H); x.closePath(); x.fill();
    }
    // scattered paper scraps embedded in the pile surface
    for (let i=0;i<200;i++){
      const sx = r()*W; const top = pileTopFn(sx);
      const sy = top + r()*(H-top);
      confettiPiece(sx, sy, span*(0.008+r()*0.02), pickConf(), r()*Math.PI*2, 0.5+r()*0.4);
    }
  }

  /* ============================ STREAMERS (curling ribbons) ============================ */
  if (layout !== 'Drift Pile' || stream === 'Tangled'){
    const streamN = stream==='Tangled' ? 26 : stream==='Many' ? 16 : 8;
    for (let i=0;i<streamN;i++){
      let sx, sy, dir, len;
      if (layout === 'Updraft'){
        // streamers spiral out of the vortex
        const ang = p.swirl + (i/streamN)*Math.PI*2;
        const rad = span*(0.05 + r()*0.18);
        sx = fx + Math.cos(ang)*rad; sy = fy + Math.sin(ang)*rad;
        dir = ang + Math.PI*0.5;
        len = span*(0.18 + r()*0.3);
      } else if (layout === 'Single Strip'){
        sx = r()*W; sy = -H*0.05 + r()*H*0.4; dir = fa + (r()-0.5)*0.5; len = span*(0.12+r()*0.2);
      } else {
        sx = r()*W; sy = -H*0.1 + r()*H*0.5; dir = fa + (r()-0.5)*0.6; len = span*(0.16 + r()*0.36);
      }
      streamerRibbon(sx, sy, dir, len, span*(0.006 + r()*0.012), pickConf());
    }
  }

  /* ============================ CONFETTI FIELD ============================ */
  const confBase = conf==='Blizzard' ? 1400 : conf==='Heavy' ? 800 : 380;
  // layout-aware count cap (keep < a few thousand total)
  const confN = Math.min(2200, Math.floor(confBase * (layout==='Single Strip'?0.55 : layout==='Drift Pile'?0.4 : 1)));

  for (let i=0;i<confN;i++){
    let cx, cy, sz, a=1, rot=r()*Math.PI*2;
    const big = r() < 0.12;                 // a few foreground (bigger, motion-blurred) pieces
    sz = span*(big ? 0.018+r()*0.03 : 0.005+r()*0.013);

    if (layout === 'Canyon'){
      // concentrate down the central gap (around vanishing x), thinner at edges
      const vp = W * p.vanish;
      const t = r();
      cx = vp + randn(r)*W*0.16 + (r()-0.5)*W*0.1;
      cy = (t*t)*H;                          // denser toward top (receding into gap)
      // depth fade: smaller & dimmer near the vanishing point
      const depth = clamp(cy/H, 0.05, 1);
      sz *= 0.35 + depth*0.9; a = 0.4 + depth*0.6;
    } else if (layout === 'Downpour'){
      cx = r()*W; cy = r()*H; a = 0.55 + r()*0.45;     // allover field
    } else if (layout === 'Updraft'){
      // spiral distribution around the phi vortex; negative space outside
      const turns = 3.2;
      const tt = Math.pow(r(), 0.7);
      const ang = p.swirl + tt*Math.PI*2*turns + randn(r)*0.4;
      const rad = tt*span*0.42;
      cx = fx + Math.cos(ang)*rad*(0.7+r()*0.6);
      cy = fy + Math.sin(ang)*rad*(0.7+r()*0.6);
      if (cx<0||cx>W||cy<0||cy>H){ if(r()<0.8) continue; }
      a = clamp(1 - tt*0.5, 0.3, 1);
      rot = ang + Math.PI*0.5;
    } else if (layout === 'Single Strip'){
      // sparse confetti behind, biased away from the hero ribbon's phi band
      cx = r()*W; cy = r()*H; a = 0.3 + r()*0.45; sz*=0.8;
    } else if (layout === 'Skyline'){
      // burst above the horizon — none below the skyline
      const hY = H*p.horizon;
      cx = r()*W; cy = r()*hY*1.02;
      // burst denser around a phi column
      if (Math.abs(cx/W - p.phiX) > 0.4 && r()<0.4) continue;
      a = 0.5 + r()*0.5;
    } else { // Drift Pile — only a few last pieces still falling above the pile
      cx = r()*W;
      const top = pileTopFn ? pileTopFn(cx) : H*p.horizon;
      cy = r()*top*0.9;
      if (r() < 0.7) continue;               // sparse in the air
      a = 0.6 + r()*0.4;
    }

    // motion-blur streak for foreground falling pieces (skip in Updraft/Pile-static)
    if (big && layout !== 'Updraft' && layout !== 'Drift Pile' && r()<0.7){
      motionStreak(cx, cy, sz*(2.5+r()*4), pickConf(), 0.08+r()*0.12);
    }
    confettiPiece(cx, cy, sz, pickConf(), rot, a);
  }

  /* ============================ TICKER STRIPS (the signature) ============================ */
  let stripN;
  if (layout === 'Single Strip') stripN = 1;
  else if (layout === 'Downpour') stripN = 26;
  else if (layout === 'Updraft') stripN = 14;
  else if (layout === 'Skyline') stripN = 10;
  else if (layout === 'Drift Pile') stripN = 5;
  else stripN = 16; // Canyon

  if (layout === 'Single Strip'){
    // ONE hero ribbon snaking across the frame with legible quotes, anchored off-centre
    const segs = 9;
    const startX = W*0.05, startY = fy;
    let cx = startX, cy = startY;
    let ang = (r()-0.5)*0.4;
    const stripH = span*0.05;
    // draw the ribbon as a chain of overlapping ticker segments
    for (let s=0; s<segs; s++){
      const segLen = (W*0.92/segs) * (0.85 + r()*0.4);
      ang += (r()-0.5)*0.7;
      const nx = cx + Math.cos(ang)*segLen;
      const ny = cy + Math.sin(ang)*segLen*0.8;
      const midx = (cx+nx)/2, midy=(cy+ny)/2;
      // soft shadow under the ribbon
      x.save();
      x.globalCompositeOperation = 'multiply';
      tickerStrip(midx+span*0.01, midy+span*0.015, segLen*1.04, stripH, ang, 1, false);
      x.restore();
      tickerStrip(midx, midy, segLen*1.04, stripH, ang, 1, true);
      cx = nx; cy = ny;
    }
  } else {
    for (let i=0;i<stripN;i++){
      let cx, cy, rot, len, h;
      h = span*(0.018 + r()*0.022);
      len = h*(3 + r()*6);
      if (layout === 'Updraft'){
        const ang = p.swirl + (i/stripN)*Math.PI*2 + randn(r)*0.5;
        const rad = span*(0.12 + r()*0.28);
        cx = fx + Math.cos(ang)*rad; cy = fy + Math.sin(ang)*rad;
        rot = ang + Math.PI*0.5;
      } else if (layout === 'Skyline'){
        cx = r()*W; cy = r()*H*p.horizon*0.95; rot = fa + (r()-0.5)*1.0;
      } else if (layout === 'Drift Pile'){
        cx = r()*W; const top = pileTopFn?pileTopFn(cx):H*p.horizon; cy = r()*top*0.85; rot = fa+(r()-0.5)*0.8;
      } else if (layout === 'Canyon'){
        const vp = W*p.vanish; cx = vp + randn(r)*W*0.18; cy = r()*H; rot = fa+(r()-0.5)*0.5;
        const depth = clamp(cy/H,0.2,1); len*=depth; h*=depth;
      } else { // Downpour
        cx = r()*W; cy = r()*H; rot = fa + (r()-0.5)*0.7;
      }
      // shadow then strip
      x.save(); x.globalCompositeOperation='multiply';
      tickerStrip(cx+span*0.006, cy+span*0.008, len, h, rot, 1, false);
      x.restore();
      tickerStrip(cx, cy, len, h, rot, 1, h>span*0.026);
    }
  }

  /* ============================ FOREGROUND FOCAL ACCENT ============================ */
  if (layout === 'Updraft'){
    // bright swirl core glow to seat the vortex on the phi point
    x.save();
    x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(fx, fy, 0, fx, fy, span*0.22);
    g.addColorStop(0, rgba(bright, 0.28 + p.tonal*0.18));
    g.addColorStop(0.5, rgba(bright, 0.08));
    g.addColorStop(1, rgba(bright, 0));
    x.fillStyle = g; x.fillRect(0,0,W,H);
    x.restore();
  }

  /* ============================ PHOTOGRAPHIC FINISH ============================ */
  // depth darkening at the frame edges away from the action
  x.save();
  x.globalCompositeOperation = 'multiply';
  const dg = x.createRadialGradient(W/2, H*0.45, span*0.3, W/2, H*0.5, span*0.85);
  dg.addColorStop(0, rgba(P.ground, 0));
  dg.addColorStop(1, rgba(mix(P.ground,'#000',0.3), 0.3 + p.tonal*0.12));
  x.fillStyle = dg; x.fillRect(0,0,W,H);
  x.restore();

  // texture + grain + vignette
  mottle(x, 0, 0, W, H, P.dark ? P.sky : P.ground, 1300, r, 'overlay');
  grain(x, W, H, 1500, r);
  vignette(x, W, H, (P.dark ? 0.28 : 0.16) + p.tonal*0.08);
  } catch(e){ if (typeof console!=='undefined') console.error('TICKERTAPE_DRAW_ERR seed', seed, e && e.message, e && e.stack); throw e; }
}

/* ---------------- exports ---------------- */
export const tickertapeTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const tickertapeSchema: TraitSchema = {
  traits: [
    { name:'Palette',   values: PALS.map(p => p.name) },
    { name:'Format',    values: ['Square','Portrait','Landscape'] },
    { name:'Layout',    values: LAYOUTS.slice() },
    { name:'Confetti',  values: CONFETTI.slice() },
    { name:'Streamers', values: STREAMERS.slice() },
  ],
};

export const renderTickertape: EngineFn = blit(draw, tickertapeTraits);

export const TICKERTAPE_ASPECTS = [1, 0.8, 1.25] as const;
