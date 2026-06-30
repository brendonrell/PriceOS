// @ts-nocheck
/*
 * Cadence — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/b_cadence.js). Continuous seed-driven composition. Deterministic
 * from tokenId only. KIT bundled; trait schema derived from the engine's casts.
 */
import { blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

/* Browser-side art kit for the halo R&D harness. Superset of the repo's
   lib/art/engines/ai/extra/_kit.ts plus noise helpers for haze/texture.
   Loaded as a plain <script> into the render page; defines window.KIT. */
/* KIT (bundled from tools/halo/kit.js) */
  function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
  function rng(seed){return mulberry32(((Math.imul(seed>>>0,2654435761))>>>0)||1);}
  function pick(a,r){return a[Math.floor(r()*a.length)];}
  function rint(r,a,b){return a+Math.floor(r()*(b-a+1));}
  function shuffle(a,r){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=x[i];x[i]=x[j];x[j]=t;}return x;}
  function randn(r){return r()+r()+r()+r()-2;}
  function clamp(v,a,b){return v<a?a:v>b?b:v;}
  function h2r(h){const v=parseInt(h.slice(1),16);return [(v>>16)&255,(v>>8)&255,v&255];}
  function r2h(c){const f=n=>('0'+Math.round(clamp(n,0,255)).toString(16)).slice(-2);return '#'+f(c[0])+f(c[1])+f(c[2]);}
  function mix(a,b,t){const A=h2r(a),B=h2r(b);return r2h([A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t]);}
  function lum(h){const c=h2r(h);return (0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255;}
  function rgba(h,a){const c=h2r(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
  function hsl2hex(h,s,l){h=((h%360)+360)%360;s=clamp(s,0,1);l=clamp(l,0,1);const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;let R=0,G=0,B=0;if(h<60){R=c;G=x;}else if(h<120){R=x;G=c;}else if(h<180){G=c;B=x;}else if(h<240){G=x;B=c;}else if(h<300){R=x;B=c;}else{R=c;B=x;}return r2h([(R+m)*255,(G+m)*255,(B+m)*255]);}
  function grain(x,W,H,amt,r){const n=Math.floor(W*H/amt);for(let i=0;i<n;i++){const g=r()<0.5?0:255;x.fillStyle='rgba('+g+','+g+','+g+','+(0.015+r()*0.05)+')';x.fillRect(r()*W,r()*H,1,1);}}
  function vignette(x,W,H,s){const g=x.createRadialGradient(W/2,H*0.46,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.78);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+s+')');x.fillStyle=g;x.fillRect(0,0,W,H);}
  function mottle(x,x0,y0,w,h,col,density,r,blend){x.save();x.globalCompositeOperation=blend||'overlay';const n=Math.floor(w*h/density);for(let i=0;i<n;i++){const dark=r()<0.5;const c=dark?mix(col,'#000',0.34):mix(col,'#fff',0.32);const s=0.8+r()*2.2;x.fillStyle=rgba(c,0.04+r()*0.09);x.fillRect(x0+r()*w,y0+r()*h,s,s);}x.restore();}

  /* ── value-noise / fbm for haze, fog, drift, displacement ── */
  function makeNoise(seed){
    const r=rng(seed);
    const perm=new Uint8Array(512);
    const p=new Uint8Array(256);
    for(let i=0;i<256;i++)p[i]=i;
    for(let i=255;i>0;i--){const j=Math.floor(r()*(i+1));const t=p[i];p[i]=p[j];p[j]=t;}
    for(let i=0;i<512;i++)perm[i]=p[i&255];
    function fade(t){return t*t*t*(t*(t*6-15)+10);}
    function lerp(a,b,t){return a+(b-a)*t;}
    function grad(h,x,y){const u=(h&1)?x:-x,v=(h&2)?y:-y;return u+v;}
    function noise2(x,y){
      const X=Math.floor(x)&255,Y=Math.floor(y)&255;
      x-=Math.floor(x);y-=Math.floor(y);
      const u=fade(x),v=fade(y);
      const aa=perm[perm[X]+Y],ab=perm[perm[X]+Y+1],ba=perm[perm[X+1]+Y],bb=perm[perm[X+1]+Y+1];
      const res=lerp(lerp(grad(aa,x,y),grad(ba,x-1,y),u),lerp(grad(ab,x,y-1),grad(bb,x-1,y-1),u),v);
      return res; // ~[-1,1]
    }
    function fbm(x,y,oct,gain,lac){oct=oct||4;gain=gain||0.5;lac=lac||2;let a=0,f=1,amp=0.5,n=0;for(let i=0;i<oct;i++){a+=amp*noise2(x*f,y*f);n+=amp;amp*=gain;f*=lac;}return a/n;}
    return {noise2,fbm};
  }

  /* Soft additive radial bloom (atmosphere). */
  function bloom(x,cx,cy,rad,col,a0){x.save();x.globalCompositeOperation='lighter';const g=x.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,rgba(col,a0));g.addColorStop(1,rgba(col,0));x.fillStyle=g;x.fillRect(cx-rad,cy-rad,rad*2,rad*2);x.restore();}

  /* Volumetric haze sheet driven by fbm — the signature "hazy" wash. */
  function hazeSheet(x,W,H,noise,col,opacity,scale,blend){
    x.save();x.globalCompositeOperation=blend||'screen';
    const step=Math.max(3,Math.floor(Math.min(W,H)/180));
    const c=h2r(col);
    for(let yy=0;yy<H;yy+=step){
      for(let xx=0;xx<W;xx+=step){
        const n=(noise.fbm(xx/scale,yy/scale,5,0.55,2.1)+1)/2;
        const a=clamp(n*n*opacity,0,1);
        if(a<0.01)continue;
        x.fillStyle='rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';
        x.fillRect(xx,yy,step+1,step+1);
      }
    }
    x.restore();
  }

  /* Scanline / CRT terminal texture. */
  function scanlines(x,W,H,gap,a){x.save();x.globalCompositeOperation='multiply';x.fillStyle='rgba(0,0,0,'+a+')';for(let y=0;y<H;y+=gap){x.fillRect(0,y,W,1);}x.restore();}

  /* ── SHEEN toolkit (halo R&D, abstract/futuristic) ───────────────────────── */
  /* Thin-film / soap-film / oil-slick iridescence. phase in turns (0..1+);
     returns a saturated spectral hex with the characteristic teal→magenta→gold
     band ordering. `tint` (0..1) leans the band toward a base hue for colorways. */
  function iridescent(phase, sat, light){
    const h = ((phase * 360) % 360 + 360) % 360;
    return hsl2hex(h, sat == null ? 0.85 : sat, light == null ? 0.6 : light);
  }
  /* Specular sheen highlight: a tight bright lobe at (cx,cy). */
  function sheen(x,cx,cy,rad,col,a0){x.save();x.globalCompositeOperation='lighter';const g=x.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,rgba(col,a0));g.addColorStop(0.4,rgba(col,a0*0.35));g.addColorStop(1,rgba(col,0));x.fillStyle=g;x.fillRect(cx-rad,cy-rad,rad*2,rad*2);x.restore();}
  /* Curl of a 2D value-noise field → divergence-free flow (smoke/fluid look). */
  function curl(noise,x,y,eps){eps=eps||1;const n1=noise.fbm((x)/100,(y+eps)/100,4),n2=noise.fbm((x)/100,(y-eps)/100,4);const n3=noise.fbm((x+eps)/100,(y)/100,4),n4=noise.fbm((x-eps)/100,(y)/100,4);return [(n1-n2)/(2*eps),-(n3-n4)/(2*eps)];}
  /* Soft drop bloom under a form to fake depth/AO. */
  function softShadow(x,cx,cy,rad,a){x.save();x.globalCompositeOperation='multiply';const g=x.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,'rgba(0,0,0,'+a+')');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.fillRect(cx-rad,cy-rad,rad*2,rad*2);x.restore();}
  /* Linear metallic ramp across an angle — chrome gradient from a base hue. */
  function chromeRamp(x,x0,y0,w,h,ang,base){const cx=x0+w/2,cy=y0+h/2,L=Math.max(w,h);const dx=Math.cos(ang)*L,dy=Math.sin(ang)*L;const g=x.createLinearGradient(cx-dx/2,cy-dy/2,cx+dx/2,cy+dy/2);g.addColorStop(0,mix(base,'#05060a',0.55));g.addColorStop(0.32,mix(base,'#ffffff',0.55));g.addColorStop(0.46,mix(base,'#06070c',0.35));g.addColorStop(0.6,mix(base,'#ffffff',0.85));g.addColorStop(0.78,mix(base,'#04050a',0.6));g.addColorStop(1,mix(base,'#ffffff',0.4));return g;}

  /* Chromatic-aberration split of whatever is already drawn, by px offset. */
  function chromaSplit(x,W,H,off){
    try{
      const img=x.getImageData(0,0,W,H);const d=img.data;const out=x.createImageData(W,H);const o=out.data;
      const dx=off|0;
      for(let y=0;y<H;y++){for(let i=0;i<W;i++){
        const idx=(y*W+i)*4;
        const rx=Math.min(W-1,i+dx),bx=Math.max(0,i-dx);
        o[idx]=d[(y*W+rx)*4];o[idx+1]=d[idx+1];o[idx+2]=d[(y*W+bx)*4+2];o[idx+3]=255;
      }}
      x.putImageData(out,0,0);
    }catch(e){}
  }

  const KIT={mulberry32,rng,pick,rint,shuffle,randn,clamp,h2r,r2h,mix,lum,rgba,hsl2hex,grain,vignette,mottle,makeNoise,bloom,hazeSheet,scanlines,chromaSplit,iridescent,sheen,curl,softShadow,chromeRamp,PHI:1.61803398875,INVPHI:0.61803398875};


/* CADENCE — drawn line-systems (Sol LeWitt lineage, but its own).
 * The field is FILLED by systematic families of straight rules and arc-fans:
 * banks of parallel lines, arc-fans sprung from corners/pivots, bands where the
 * line-direction flips, optical density from pure repetition. A DRAWN SYSTEM —
 * depicts nothing. Pure non-objective composition: line, form, flat colour.
 *
 * Palette world: INK + FLAT HUES — black ink on warm white with flat panels of
 * primary/secondary (red, yellow, blue, grey). Crisp, bright, systematic — given
 * a fine-screenprint surface: paper tooth, printed-ink mottle, soft haze,
 * vignette grade, slightly imperfect hand edges. Tactile, atmospheric, crisp.
 *
 * NO discrete "mode picker". The composition is a CONTINUOUS SYSTEM: the field is
 * partitioned by a seed-driven recursive cut, every region is filled by a
 * line-family whose angle / spacing / weight / curvature / fan-pivot / colour are
 * all sampled CONTINUOUSLY, and global scale, density, focal crop, asymmetry and
 * aspect ratio all vary continuously per seed. Two seeds never collide on a small
 * bucket grid because there is no bucket grid — every salient parameter is a real
 * number drawn from a range.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palette WORLDS, one family (ink rules + flat primary/secondary
     panels). Each names a GROUND + an INK + a continuous HUE SPACE the accents
     are sampled from (base hues in degrees, with per-seed jitter). The ground
     can be warm-white paper, a saturated colour field, or a near-black ink
     ground — so value/register vary hard across seeds, not just per swatch. */
  const PALS = [
    // Flagship De Stijl primaries on cream.
    { name: 'Primary Ground', paper: '#f1ece1', ink: '#16130f',
      hues: [8, 46, 217, 40], sat: [0.74, 0.72, 0.62, 0.06], lit: [0.48, 0.50, 0.40, 0.58], wt: [3, 3, 3, 1] },
    // Warmer, red + ochre dominant.
    { name: 'Vermilion Press', paper: '#f3ebd9', ink: '#1a140d',
      hues: [9, 40, 22, 38], sat: [0.72, 0.78, 0.48, 0.10], lit: [0.47, 0.50, 0.34, 0.58], wt: [4, 3, 1, 1] },
    // Saturated cobalt field, chalk-white rules.
    { name: 'Cobalt Field', paper: '#1d3f82', ink: '#eef2f8',
      hues: [46, 12, 212, 220], sat: [0.80, 0.74, 0.40, 0.55], lit: [0.50, 0.48, 0.66, 0.24], wt: [3, 3, 2, 2] },
    // Lemon/black high key.
    { name: 'Citron Plate', paper: '#f4efdf', ink: '#15130c',
      hues: [48, 30, 214, 44], sat: [0.80, 0.06, 0.56, 0.10], lit: [0.51, 0.16, 0.41, 0.62], wt: [3, 2, 2, 1] },
    // Near-black ink ground, chalk-white rules.
    { name: 'Ink Ground', paper: '#16140f', ink: '#efe9da',
      hues: [44, 40, 38, 36], sat: [0.10, 0.10, 0.08, 0.06], lit: [0.90, 0.70, 0.46, 0.22], wt: [3, 2, 2, 2] },
    // Riso-bright pink-red + sky blue.
    { name: 'Riso Bright', paper: '#f2eee6', ink: '#191510',
      hues: [358, 206, 47, 38], sat: [0.70, 0.58, 0.82, 0.08], lit: [0.58, 0.50, 0.55, 0.55], wt: [3, 3, 2, 1] },
  ];

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    const W = [4, 3, 2, 3, 1, 3];
    let tot = 0; for (const w of W) tot += w;
    let t = r() * tot;
    for (let i = 0; i < PALS.length; i++) { t -= W[i]; if (t < 0) return PALS[i]; }
    return PALS[0];
  }

  // Sample a CONTINUOUS accent colour from the palette's hue space. Picks a base
  // accent by weight, then jitters hue/sat/value within the world so the exact
  // colour VALUE varies seed-to-seed (not just a fixed swatch).
  function sampleAccent(pal, r) {
    let tot = 0; for (const w of pal.wt) tot += w;
    let t = r() * tot, idx = 0;
    for (let i = 0; i < pal.hues.length; i++) { t -= pal.wt[i]; if (t < 0) { idx = i; break; } }
    const h = pal.hues[idx] + (r() - 0.5) * 22;
    const s = K.clamp(pal.sat[idx] + (r() - 0.5) * 0.16, 0, 1);
    const l = K.clamp(pal.lit[idx] + (r() - 0.5) * 0.12, 0, 1);
    return K.hsl2hex(h, s, l);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);

    // ── CONTINUOUS FORMAT: aspect ratio sampled across portrait↔landscape ──
    const aspect = 0.72 + r() * 0.78;            // ~0.72 (tall) … ~1.50 (wide)
    const LONG = 1240;
    let W, H;
    if (aspect >= 1) { W = LONG; H = Math.round(LONG / aspect); }
    else { H = LONG; W = Math.round(LONG * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const DIAG = Math.hypot(W, H);

    // ── CONTINUOUS GLOBAL CHARACTER ──
    // density: near-empty minimal ↔ packed (drives base spacing of every family)
    const density = r();                         // 0 sparse … 1 dense
    const gapBase = S * (0.030 - density * 0.0215) * (0.85 + r() * 0.3); // big→small
    const baseLw = S * (0.0020 + r() * 0.0030);
    // global zoom: the whole drawing is built in a virtual frame, then scaled +
    // offset so some seeds crop in tight (focal zoom) and others sit framed.
    const zoom = 0.78 + r() * 0.95;              // <1 zoomed-out margin … >1 crop-in
    const panX = (r() - 0.5) * W * 0.5 * (zoom > 1 ? 1 : 0.4);
    const panY = (r() - 0.5) * H * 0.5 * (zoom > 1 ? 1 : 0.4);
    // overall asymmetry of the cut tree
    const asym = (r() - 0.5) * 0.5;
    // global rotation jitter of every family's angle
    const angBias = (r() - 0.5) * Math.PI;
    // how many distinct angle "voices" the piece favours (continuous quantize)
    const angSnap = 0.18 + r() * 0.9;            // small→free angles, large→cardinal lean

    // ── COLOUR ROLES (continuous) ──
    const darkLine = K.lum(pal.ink) < 0.5 ? pal.ink : K.mix(pal.paper, '#0d0b08', 0.86);
    const lightLine = K.lum(pal.ink) > 0.5 ? pal.ink : K.mix(pal.paper, '#ffffff', 0.62);
    function lineOn(bg) { return K.lum(bg) > 0.5 ? darkLine : lightLine; }
    // the dominant rule colour: mostly ink, sometimes a continuous accent (only
    // if it contrasts the ground enough).
    let lineCol = pal.ink;
    if (r() >= 0.74) {
      const cand = sampleAccent(pal, r);
      lineCol = Math.abs(K.lum(cand) - K.lum(pal.paper)) > 0.22 ? cand : pal.ink;
    }

    // ── PAPER GROUND ──
    x.fillStyle = pal.paper; x.fillRect(0, 0, W, H);
    const pg = x.createLinearGradient(0, 0, W, H);
    pg.addColorStop(0, K.rgba(K.mix(pal.paper, '#ffffff', 0.5), 0.32 + r() * 0.1));
    pg.addColorStop(1, K.rgba(K.mix(pal.paper, pal.ink, 0.06 + r() * 0.04), 0.28));
    x.fillStyle = pg; x.fillRect(0, 0, W, H);

    // Apply the global zoom/pan transform around centre for the whole system.
    x.save();
    x.translate(W / 2 + panX, H / 2 + panY);
    x.scale(zoom, zoom);
    x.translate(-W / 2, -H / 2);

    // ── DRAW PRIMITIVES ───────────────────────────────────────────────────────
    // a straight rule with a whisper of waver
    function rule(x0, y0, x1, y1, col, lw, a) {
      const segs = 20;
      x.save();
      x.strokeStyle = K.rgba(col, a == null ? 0.92 : a);
      x.lineWidth = lw; x.lineCap = 'round';
      x.beginPath();
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const px = x0 + dx * t, py = y0 + dy * t;
        const nrm = noise.noise2(px * 0.004 + seed, py * 0.004) * lw * 0.55;
        const ox = -dy / L * nrm, oy = dx / L * nrm;
        if (i === 0) x.moveTo(px + ox, py + oy); else x.lineTo(px + ox, py + oy);
      }
      x.stroke();
      x.restore();
    }

    // a flat colour panel with a hand-cut edge + printed-ink mottle
    function panel(px, py, pw, ph, col, alpha) {
      x.save();
      x.beginPath();
      const wob = S * 0.004;
      const n = 5;
      x.moveTo(px, py);
      for (let i = 1; i <= n; i++) { const t = i / n; x.lineTo(px + pw * t, py + noise.noise2(px + pw * t * 0.05, py) * wob); }
      for (let i = 1; i <= n; i++) { const t = i / n; x.lineTo(px + pw, py + ph * t + noise.noise2(px + pw, py + ph * t * 0.05) * wob); }
      for (let i = 1; i <= n; i++) { const t = i / n; x.lineTo(px + pw * (1 - t), py + ph + noise.noise2(px + pw * (1 - t), py + ph) * wob); }
      for (let i = 1; i <= n; i++) { const t = i / n; x.lineTo(px, py + ph * (1 - t) + noise.noise2(px, py + ph * (1 - t)) * wob); }
      x.closePath();
      x.fillStyle = K.rgba(col, alpha == null ? 1 : alpha);
      x.fill();
      x.clip();
      K.mottle(x, px, py, pw, ph, col, 30, r, 'multiply');
      x.restore();
    }

    // a bank of parallel rules clipped to a rect, at an angle, with given spacing.
    function bank(bx, by, bw, bh, ang, gap, col, lw, a) {
      if (gap < 1.2) gap = 1.2;
      x.save();
      x.beginPath(); x.rect(bx, by, bw, bh); x.clip();
      const cx = bx + bw / 2, cy = by + bh / 2;
      const diag = Math.hypot(bw, bh);
      const ca = Math.cos(ang), sa = Math.sin(ang);
      const px = -sa, py = ca;
      const steps = Math.ceil(diag / gap) + 2;
      for (let i = -steps; i <= steps; i++) {
        const ox = cx + px * i * gap, oy = cy + py * i * gap;
        rule(ox - ca * diag, oy - sa * diag, ox + ca * diag, oy + sa * diag, col, lw, a);
      }
      x.restore();
    }

    // an arc-fan sprung from a pivot, sweeping a range of radii, clipped to rect.
    function arcFan(bx, by, bw, bh, cx, cy, r0, r1, gap, a0, a1, col, lw, alpha) {
      if (gap < 1.2) gap = 1.2;
      x.save();
      x.beginPath(); x.rect(bx, by, bw, bh); x.clip();
      x.strokeStyle = K.rgba(col, alpha == null ? 0.85 : alpha);
      x.lineWidth = lw; x.lineCap = 'round';
      for (let rad = r0; rad <= r1; rad += gap) {
        x.beginPath();
        const segs = 72;
        for (let i = 0; i <= segs; i++) {
          const t = i / segs, ang = a0 + (a1 - a0) * t;
          const nrm = noise.noise2(rad * 0.01, ang * 2) * lw * 0.4;
          const rr = rad + nrm;
          const px2 = cx + Math.cos(ang) * rr, py2 = cy + Math.sin(ang) * rr;
          if (i === 0) x.moveTo(px2, py2); else x.lineTo(px2, py2);
        }
        x.stroke();
      }
      x.restore();
    }

    // radiating straight rules (sunburst) from a pivot, clipped to rect.
    function radiate(bx, by, bw, bh, cx, cy, nRays, r0, r1, col, lw, alpha, jitter) {
      x.save();
      x.beginPath(); x.rect(bx, by, bw, bh); x.clip();
      for (let i = 0; i < nRays; i++) {
        const ang = (i / nRays) * Math.PI * 2 + (jitter ? (noise.noise2(i * 0.3, seed) * jitter) : 0);
        rule(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0,
             cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1,
             col, lw * (i % 4 === 0 ? 1.5 : 1), alpha);
      }
      x.restore();
    }

    // snap an angle toward cardinal/diagonal grid by `angSnap` strength.
    function snapAng(a) {
      const grid = Math.PI / 4;
      const snapped = Math.round(a / grid) * grid;
      return a + (snapped - a) * Math.min(1, angSnap * 0.7);
    }

    // ── FILL ONE REGION with a continuously-chosen line-FAMILY ────────────────
    // Each region rolls its own family kind on a continuous [0,1) axis, then all
    // family parameters are continuous. A region may also be a flat colour panel
    // (focal stop / negative space) with optional single accent gesture.
    function fillRegion(bx, by, bw, bh, depth, flatBudget) {
      const area = bw * bh / (W * H);
      // chance this region is a flat colour panel (focal / breathing space)
      const flatChance = 0.10 + flatBudget * 0.32 + (area < 0.06 ? 0.18 : 0);
      const isFlat = r() < flatChance;
      if (isFlat) {
        const fc = sampleAccent(pal, r);
        panel(bx, by, bw, bh, fc, 0.94 + r() * 0.06);
        // maybe a single restrained gesture inside the panel
        const g = r();
        if (g < 0.34) {
          // a quarter / partial arc-fan anchored to a corner of the cell
          const cx = bx + (r() < 0.5 ? 0 : bw);
          const cy = by + (r() < 0.5 ? 0 : bh);
          const a0 = Math.atan2(by + bh / 2 - cy, bx + bw / 2 - cx);
          const span = Math.PI * (0.3 + r() * 0.4);
          arcFan(bx, by, bw, bh, cx, cy, S * 0.03, Math.hypot(bw, bh) * (0.9 + r() * 0.5),
                 gapBase * (1.0 + r() * 1.0), a0 - span / 2, a0 + span / 2, lineOn(fc), baseLw, 0.5 + r() * 0.2);
        } else if (g < 0.5) {
          // a sparse bank of a few rules
          bank(bx, by, bw, bh, snapAng(angBias + (r() - 0.5)), gapBase * (1.6 + r() * 1.4), lineOn(fc), baseLw * (0.8 + r() * 0.4), 0.5 + r() * 0.25);
        }
        return;
      }

      // a line family. kind ∈ continuous axis: banks ↔ flip-banks ↔ arc-fans ↔ radiate
      const kind = r();
      const col = (r() < 0.82) ? lineCol : sampleAccent(pal, r);
      const localLw = baseLw * (0.7 + r() * 0.8);
      const localGap = gapBase * (0.55 + r() * 1.05);
      const a = 0.78 + r() * 0.2;

      if (kind < 0.40) {
        // straight bank at a continuous angle
        const ang = snapAng(angBias + (r() - 0.5) * 1.4);
        bank(bx, by, bw, bh, ang, localGap, col, localLw, a);
      } else if (kind < 0.62) {
        // flip sub-bands inside the region: alternating +/- angle (LeWitt beat)
        const sub = K.rint(r, 2, 5);
        const horiz = bw >= bh ? false : true; // split along the shorter so bands read
        const baseA = (Math.PI / 4) * (0.7 + r() * 0.55);
        for (let s = 0; s < sub; s++) {
          let sx, sy, sw, sh;
          if (horiz) { sx = bx; sw = bw; sy = by + bh * s / sub; sh = bh / sub; }
          else { sy = by; sh = bh; sx = bx + bw * s / sub; sw = bw / sub; }
          const ang = snapAng(angBias + (s % 2 === 0 ? baseA : -baseA));
          bank(sx, sy, sw, sh, ang, localGap * 0.92, col, localLw, a);
        }
      } else if (kind < 0.84) {
        // arc-fan: pivot placed continuously, often just off an edge so arcs
        // read as concentric latitude sweeps, sometimes inside as a rose.
        const offEdge = r() < 0.6;
        let cx, cy;
        if (offEdge) {
          const side = r();
          if (side < 0.5) { cx = bx - bw * (0.1 + r() * 0.5); cy = by + bh * (r()); }
          else { cx = bx + bw * (1.1 + r() * 0.5); cy = by + bh * (r()); }
        } else {
          cx = bx + bw * (0.2 + r() * 0.6); cy = by + bh * (0.2 + r() * 0.6);
        }
        const r0 = Math.max(S * 0.02, Math.hypot(bx - cx, by - cy) * (offEdge ? 0.6 : 0.0));
        const r1 = Math.hypot(Math.max(Math.abs(bx - cx), Math.abs(bx + bw - cx)),
                              Math.max(Math.abs(by - cy), Math.abs(by + bh - cy))) * (1.0 + r() * 0.2);
        const spanFull = offEdge ? Math.PI * (0.4 + r() * 0.4) : Math.PI * (1.2 + r() * 0.8);
        const dir = Math.atan2(by + bh / 2 - cy, bx + bw / 2 - cx);
        arcFan(bx, by, bw, bh, cx, cy, r0, r1, localGap, dir - spanFull / 2, dir + spanFull / 2, col, localLw, a);
      } else {
        // radiate (sunburst) from a continuous interior pivot, with a focal disc
        const cx = bx + bw * (0.3 + r() * 0.4), cy = by + bh * (0.3 + r() * 0.4);
        const discR = Math.min(bw, bh) * (0.05 + r() * 0.16);
        if (r() < 0.8) {
          x.save(); x.beginPath(); x.arc(cx, cy, discR, 0, 7);
          x.fillStyle = sampleAccent(pal, r); x.fill();
          x.clip(); K.mottle(x, cx - discR, cy - discR, discR * 2, discR * 2, pal.ink, 26, r, 'multiply'); x.restore();
        }
        const nRays = K.rint(r, 50, 60 + Math.floor(density * 120));
        const maxR = Math.hypot(bw, bh);
        radiate(bx, by, bw, bh, cx, cy, nRays, discR * 0.96, maxR, col, localLw, a, 0.02 + r() * 0.05);
        // a few concentric rings
        const nRing = K.rint(r, 0, 5);
        for (let i = 1; i <= nRing; i++) {
          const rr = discR + (maxR * (0.4 + r() * 0.3)) * (i / nRing);
          arcFan(bx, by, bw, bh, cx, cy, rr, rr, 1, 0, Math.PI * 2, r() < 0.4 ? sampleAccent(pal, r) : col, localLw * 1.1, 0.45 + r() * 0.2);
        }
      }
    }

    // ── RECURSIVE CONTINUOUS PARTITION of the field ──────────────────────────
    // Split the frame into regions by recursive cuts; cut position is continuous
    // and biased by global asymmetry. Depth, split ratio, and orientation are all
    // seed-driven so the partition geometry never repeats on a small grid.
    const leaves = [];
    function partition(bx, by, bw, bh, depth, maxDepth) {
      const area = bw * bh / (W * H);
      const stopChance = 0.10 + depth * 0.24;
      if (depth >= maxDepth || area < 0.04 || (depth >= 1 && r() < stopChance)) {
        leaves.push([bx, by, bw, bh, depth]);
        return;
      }
      const cutVert = (bw > bh) ? (r() < 0.80) : (r() < 0.20);
      let t = K.clamp(0.5 + asym * 0.6 + (r() - 0.5) * 0.5, 0.24, 0.76);
      if (cutVert) {
        partition(bx, by, bw * t, bh, depth + 1, maxDepth);
        partition(bx + bw * t, by, bw * (1 - t), bh, depth + 1, maxDepth);
      } else {
        partition(bx, by, bw, bh * t, depth + 1, maxDepth);
        partition(bx, by + bh * t, bw, bh * (1 - t), depth + 1, maxDepth);
      }
    }
    // maxDepth scales with how busy this seed wants to be (continuous → 2..5 regions↑)
    const maxDepth = K.rint(r, 1, 4) + (density > 0.6 ? 1 : 0);
    // sometimes a single full-field system (whole-frame minimal/radiant pieces)
    const singleField = r() < 0.16;
    if (singleField) {
      leaves.push([0, 0, W, H, 0]);
    } else {
      partition(0, 0, W, H, 0, maxDepth);
    }

    // flatBudget: a global tendency toward flat panels for THIS seed (so some
    // pieces are line-dense, others breathe with colour fields).
    const flatBudget = r();

    // Fill every region. Draw order shuffled slightly so overlaps feel composed.
    for (let i = 0; i < leaves.length; i++) {
      const L = leaves[i];
      fillRegion(L[0], L[1], L[2], L[3], L[4], flatBudget);
      // hairline divider on the region boundary (registration), sometimes
      if (r() < 0.62) {
        x.save();
        x.strokeStyle = K.rgba(pal.ink, 0.28 + r() * 0.35);
        x.lineWidth = baseLw * (1.1 + r() * 0.7);
        x.strokeRect(L[0], L[1], L[2], L[3]);
        x.restore();
      }
    }

    x.restore(); // undo global zoom/pan

    // ── thin framing keyline (screenprint registration) ──
    if (r() < 0.5) {
      const m = S * (0.025 + r() * 0.03);
      x.save(); x.strokeStyle = K.rgba(pal.ink, 0.4 + r() * 0.2); x.lineWidth = baseLw * 1.1;
      x.strokeRect(m, m, W - 2 * m, H - 2 * m); x.restore();
    }

    // ── ATMOSPHERE & SURFACE (the PD-grade screenprint grade) ──
    const hazeCol = K.mix(pal.paper, sampleAccent(pal, r), 0.18);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.09 + r() * 0.04, S * (0.85 + r() * 0.3), 'multiply');
    K.mottle(x, 0, 0, W, H, pal.ink, 90, r, 'multiply');
    K.mottle(x, 0, 0, W, H, '#ffffff', 120, r, 'screen');
    K.grain(x, W, H, 4.2, r);
    K.vignette(x, W, H, (K.lum(pal.paper) < 0.4) ? 0.16 : 0.20);

    return { aspect: W / H };
  }

  // traits() mirrors draw()'s rng consumption ORDER exactly up to the values it
  // reports, so the reported traits match what the seed actually drew.
  function traits(seed) {
    const r = K.rng(seed);
    K.makeNoise(seed * 7 + 1); // does not consume `r`
    const pal = pickPal(r);
    const aspect = 0.72 + r() * 0.78;
    const fmt = aspect > 1.12 ? 'Landscape' : aspect < 0.9 ? 'Portrait' : 'Square';
    const density = r();
    const dens = density < 0.34 ? 'Sparse' : density < 0.67 ? 'Measured' : 'Dense';
    return { Palette: pal.name, Format: fmt, Density: dens };
  }

  return { name: 'b_cadence', draw, traits };
})();


export const cadenceTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderCadence: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const CADENCE_ASPECTS: readonly number[] = [1.3,1,0.78];
export const cadenceSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Cobalt Field",
        "Riso Bright",
        "Vermilion Press",
        "Ink Ground",
        "Primary Ground",
        "Citron Plate"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Square",
        "Landscape",
        "Portrait"
      ]
    },
    {
      "name": "Density",
      "values": [
        "Sparse",
        "Dense",
        "Measured"
      ]
    }
  ]
};
