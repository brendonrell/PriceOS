// @ts-nocheck
/*
 * FrostFern — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/z_frostfern.js). Continuous seed-driven composition. Deterministic
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
  function grain(x,W,H,amt,r){const n=Math.floor(W*H/amt);if(n<=0)return;const NB=8;const paths=new Array(2*NB).fill(null);for(let i=0;i<n;i++){const gi=r()<0.5?0:1;const a=0.015+r()*0.05;const fx=r()*W,fy=r()*H;const bi=Math.min(NB-1,((a-0.015)/0.05*NB)|0);const k=gi*NB+bi;(paths[k]||(paths[k]=new Path2D())).rect(fx,fy,1,1);}for(let k=0;k<2*NB;k++){const p=paths[k];if(!p)continue;const g=k<NB?0:255;x.fillStyle='rgba('+g+','+g+','+g+','+(0.015+((k%NB)+0.5)/NB*0.05)+')';x.fill(p);}}
  function vignette(x,W,H,s){const g=x.createRadialGradient(W/2,H*0.46,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.78);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+s+')');x.fillStyle=g;x.fillRect(0,0,W,H);}
  function mottle(x,x0,y0,w,h,col,density,r,blend){const n=Math.floor(w*h/density);if(n<=0)return;const NB=8;const paths=new Array(2*NB).fill(null);for(let i=0;i<n;i++){const dark=r()<0.5;const s=0.8+r()*2.2;const a=0.04+r()*0.09;const fx=x0+r()*w,fy=y0+r()*h;const bi=Math.min(NB-1,((a-0.04)/0.09*NB)|0);const k=(dark?0:NB)+bi;(paths[k]||(paths[k]=new Path2D())).rect(fx,fy,s,s);}x.save();x.globalCompositeOperation=blend||'overlay';const cd=mix(col,'#000',0.34),cl=mix(col,'#fff',0.32);for(let k=0;k<2*NB;k++){const p=paths[k];if(!p)continue;x.fillStyle=rgba(k<NB?cd:cl,0.04+((k%NB)+0.5)/NB*0.09);x.fill(p);}x.restore();}

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
  function hazeSheet(x,W,H,noise,col,opacity,scale,blend){const step=Math.max(3,Math.floor(Math.min(W,H)/180));const c=h2r(col);const off=document.createElement('canvas');off.width=W;off.height=H;const oc=off.getContext('2d');if(!oc)return;const img=oc.createImageData(W,H);const d=img.data;for(let yy=0;yy<H;yy+=step){const y2=Math.min(H,yy+step+1);for(let xx=0;xx<W;xx+=step){const n=(noise.fbm(xx/scale,yy/scale,5,0.55,2.1)+1)/2;const a=clamp(n*n*opacity,0,1);if(a<0.01)continue;const x2=Math.min(W,xx+step+1);for(let py=yy;py<y2;py++){for(let px=xx;px<x2;px++){const i=(py*W+px)*4;const sa=a;const da=d[i+3]/255;const oa=sa+da*(1-sa);if(oa<=0)continue;d[i]=(c[0]*sa+d[i]*da*(1-sa))/oa;d[i+1]=(c[1]*sa+d[i+1]*da*(1-sa))/oa;d[i+2]=(c[2]*sa+d[i+2]*da*(1-sa))/oa;d[i+3]=oa*255;}}}}oc.putImageData(img,0,0);x.save();x.globalCompositeOperation=blend||'screen';x.drawImage(off,0,0);x.restore();off.width=0;off.height=0;}

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


/* FROST FERN — dendritic ice crystals growing across a cold pane.
 * Fern-like frost ferns branch and interlock from nucleation points, fine
 * feathered crystal fronds spreading over a dark misted glass. Pure abstract
 * FIELD — no horizon, no scene. The uncanny: frost that branches with too much
 * intent, growing a forest on glass.
 *
 * PALETTE WORLD — COLD CRYSTAL: icy white & pale cyan ferns on deep ink-blue /
 * near-black frosted glass, a breath of silver. Cold and luminous.
 *
 * This is a CONTINUOUS generative system, NOT a template picker. There are no
 * discrete "modes" — composition, density, scale, format, growth habit, and
 * even the palette's hue/value/sat are all sampled CONTINUOUSLY from the seed.
 * Two seeds never land the same "bucket" because there are no buckets: every
 * salient parameter is a real number drawn from a range and the structure is
 * assembled from those numbers. Nucleation placement is a continuous blend of
 * radial / edge-front / scattered tendencies rather than a switch.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette (hue-jitter still applies) for the colorway jury.
 * KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palette anchors, all inside the cold-crystal world. Each is a
     STARTING POINT — draw() jitters every channel's hue/value/sat continuously
     per seed, so "Glacier Ink" seed A and seed B are never the same blue. */
  const PALS = [
    // common — the signature: pale-cyan ferns on deep ink blue
    { name: 'Glacier Ink', w: 5,
      bg0: '#070c16', bg1: '#0d1726', bgglow: '#15243a',
      core: '#eaf6ff', edge: '#a9d6ee', glow: '#bfe6ff', silver: '#dfeaf2',
      haze: '#16344f' },
    // common — colder, cyan-forward
    { name: 'Cryo Veil', w: 4,
      bg0: '#050a12', bg1: '#0a1620', bgglow: '#0f2630',
      core: '#f0fbff', edge: '#8fd6da', glow: '#a6eef0', silver: '#cfe6e6',
      haze: '#0e3a40' },
    // common — silver / steel breath, lower chroma
    { name: 'Silver Breath', w: 4,
      bg0: '#080b10', bg1: '#121822', bgglow: '#1b2430',
      core: '#f4f7fa', edge: '#c2cdd8', glow: '#d6e2ec', silver: '#e7edf2',
      haze: '#24303d' },
    // less common — deep midnight, near-black, ferns glow brighter against it
    { name: 'Midnight Pane', w: 3,
      bg0: '#03060c', bg1: '#070d16', bgglow: '#0a1320',
      core: '#eef8ff', edge: '#86b8e0', glow: '#9fd0ff', silver: '#c4d4e2',
      haze: '#0c2440' },
    // rarer — a breath of teal-cyan, slightly warmer ink toward indigo
    { name: 'Frozen Tide', w: 2,
      bg0: '#06101a', bg1: '#0b1e2a', bgglow: '#103040',
      core: '#ecfdff', edge: '#7fd2cf', glow: '#9ef0ea', silver: '#cdeae6',
      haze: '#0d4248' },
    // rare grail — pale indigo glass, ferns nearly white-hot, max chiaroscuro
    { name: 'Hoarfrost', w: 1,
      bg0: '#040810', bg1: '#0a1322', bgglow: '#142136',
      core: '#ffffff', edge: '#b8d8f2', glow: '#e2f1ff', silver: '#eef4fa',
      haze: '#1a3a5c' },
  ];

  function pickWeighted(arr, r) {
    let tot = 0; for (const a of arr) tot += (a.w || 1);
    let t = r() * tot;
    for (const a of arr) { t -= (a.w || 1); if (t <= 0) return a; }
    return arr[arr.length - 1];
  }
  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return pickWeighted(PALS, r);
  }

  // ── colour helpers: continuous per-seed jitter of a palette anchor ──
  // shifts hue, lightness and saturation of a hex by small amounts so two
  // pieces in the same palette anchor still differ in actual colour VALUES.
  function rgb2hsl(c) {
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function jitterHex(hex, dh, ds, dl) {
    const hsl = rgb2hsl(K.h2r(hex));
    return K.hsl2hex(hsl[0] + dh, K.clamp(hsl[1] + ds, 0, 1), K.clamp(hsl[2] + dl, 0, 1));
  }
  // build a per-seed jittered copy of the palette. Keeps the world (cold blue)
  // but moves the actual blue/teal/value so no two seeds share exact colour.
  function jitterPal(p, r) {
    const dh = (r() - 0.5) * 26;      // hue drift ±13° — blue↔teal↔indigo, stays cold
    const ds = (r() - 0.5) * 0.22;    // saturation drift
    const dlGround = (r() - 0.5) * 0.05;
    const dlFern = (r() - 0.5) * 0.06;
    const dsFern = (r() - 0.5) * 0.16;
    return {
      name: p.name,
      bg0: jitterHex(p.bg0, dh, ds * 0.5, dlGround),
      bg1: jitterHex(p.bg1, dh, ds * 0.5, dlGround),
      bgglow: jitterHex(p.bgglow, dh, ds * 0.6, dlGround + (r() - 0.5) * 0.04),
      core: jitterHex(p.core, dh * 0.6, dsFern * 0.4, dlFern * 0.5),
      edge: jitterHex(p.edge, dh, dsFern, dlFern),
      glow: jitterHex(p.glow, dh, dsFern * 0.7, dlFern),
      silver: jitterHex(p.silver, dh * 0.7, ds * 0.5, dlFern * 0.5),
      haze: jitterHex(p.haze, dh, ds, dlGround),
    };
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const palAnchor = pickPal(r);
    const pal = jitterPal(palAnchor, r);

    // ── CONTINUOUS FORMAT ── aspect is a real number, not 3 buckets ──
    // bias toward near-square but allow strong portrait / landscape crops.
    const aspectRoll = K.randn(r) * 0.5;            // ~[-1,1] gaussian-ish
    const aspect = K.clamp(1 + aspectRoll * 0.62, 0.62, 1.62);
    const LONG = 1180;
    let W, H;
    if (aspect >= 1) { W = Math.round(LONG); H = Math.round(LONG / aspect); }
    else { H = Math.round(LONG); W = Math.round(LONG * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const D = Math.min(W, H);
    const DIAG = Math.hypot(W, H);

    // ── CONTINUOUS GLOBAL CONTROLS (every salient knob is a real number) ──
    // global scale/zoom: how big the structure is vs the pane (crop/zoom feel)
    const zoom = 0.62 + Math.pow(r(), 1.3) * 1.55;        // 0.62 .. 2.17
    // density: near-empty minimal .. packed. Skewed so both extremes appear.
    const density = Math.pow(r(), 0.85);                   // 0..1, slightly low-biased
    // how the nuclei are placed: a CONTINUOUS blend of three tendencies rather
    // than a discrete mode. Each weight is independent, then normalised.
    // exponents kept equal so no single tendency systematically dominates —
    // the dominant family varies seed to seed (true blooms, fronts, rings,
    // scatters all surface), while sub-weights still blend continuously.
    let wRadial = Math.pow(r(), 1.5);      // pull toward one central focus
    let wEdge = Math.pow(r(), 1.5);        // pull nuclei to ONE edge (a front)
    let wScatter = Math.pow(r(), 1.5);     // spread across the whole pane
    let wRing = Math.pow(r(), 1.7);        // arrange on a ring (empty centre)
    const wsum = wRadial + wEdge + wScatter + wRing + 1e-6;
    wRadial /= wsum; wEdge /= wsum; wScatter /= wsum; wRing /= wsum;

    // focal asymmetry: where the visual weight sits (continuous, never centred
    // unless it happens to land there)
    const focalX = 0.18 + r() * 0.64;
    const focalY = 0.18 + r() * 0.64;
    // how many nucleation points — continuous-ish count scaled by density
    const nucCount = Math.max(1, Math.round((1 + density * 11) * (0.6 + r() * 0.8)));
    // brittleness: 0 = soft feathered fern, 1 = sharp angular shard habit. A
    // continuous spectrum, not a Shatter/not-Shatter switch.
    const brittle = Math.pow(r(), 1.6);
    // overall fern reach relative to pane, modulated by zoom. Floored so even
    // the sparsest / most brittle seed still grows a confident structure (the
    // worst seed must stay gallery-grade — no faint wisps).
    const reachBase = Math.max(D * 0.18, D * (0.16 + r() * 0.26) * zoom);

    // ── 1. FROSTED-GLASS GROUND ── deep ink-blue radial, off-centre glow ──
    const gcx = W * (0.30 + r() * 0.40), gcy = H * (0.28 + r() * 0.44);
    const groundR = D * (0.78 + r() * 0.4);
    const bg = x.createRadialGradient(gcx, gcy, D * (0.02 + r() * 0.08), gcx, gcy, groundR);
    bg.addColorStop(0, pal.bgglow);
    bg.addColorStop(0.36 + r() * 0.16, pal.bg1);
    bg.addColorStop(1, pal.bg0);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // mist breathing on the pane — low-freq fbm in the dark
    K.hazeSheet(x, W, H, noise, pal.bgglow, 0.14 + r() * 0.12, D * (0.7 + r() * 0.4), 'screen');

    // ── per-seed growth-habit constants (continuous) ──
    const RAMI = 0.42 + r() * 0.40;    // pinna angle off the rachis (~24..47°)
    const SHED = 0.60 + r() * 0.22;    // how much shorter sub-branches are
    const CURVE = (0.35 + r() * 1.05) * (1 - brittle * 0.7); // trunk wander; brittle=straighter
    const PINNA = Math.round(3 + r() * 7 * (1 - brittle * 0.5)); // barbs/seg; brittle sheds fewer
    const PINLEN = 0.6 + r() * 0.7;    // barb length relative to seg
    const PINJIT = 0.06 + r() * 0.26;  // per-barb angular jitter — breaks symmetry
    const ASYM = (r() - 0.5) * 0.5;    // left/right barb-length asymmetry
    const BRANCHP = 0.06 + r() * 0.22; // probability of a true secondary branch
    const fernGlowA = 0.16 + r() * 0.18; // nucleus bloom strength

    // ── crystal drawing primitives ───────────────────────────────────────
    function frond(x0, y0, x1, y1, w0, w1, depth, alphaMul) {
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (len < 0.5) return;
      const am = alphaMul == null ? 1 : alphaMul;
      const d = depth / 8;
      if (w0 > 0.9) {
        x.save();
        x.globalCompositeOperation = 'lighter';
        x.strokeStyle = K.rgba(pal.glow, (0.035 + 0.05 * (1 - d)) * am);
        x.lineWidth = w0 * 2.0 + 0.8;
        x.lineCap = 'round';
        x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
        x.restore();
      }
      x.strokeStyle = K.rgba(pal.edge, (0.42 + 0.2 * (1 - d)) * am);
      x.lineWidth = Math.max(0.35, (w0 + w1) * 0.5);
      x.lineCap = 'round';
      x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
      x.strokeStyle = K.rgba(pal.core, (0.3 + 0.3 * (1 - d)) * am);
      x.lineWidth = Math.max(0.3, w1 * 0.5);
      x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    }

    // a single feathered pinna: a fine barb that itself sheds tiny sub-barbs.
    function pinna(bx, by, ang, len, w, depth) {
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      frond(bx, by, ex, ey, w, w * 0.18, depth + 2);
      if (len > D * 0.018 && depth < 3 && brittle < 0.6) {
        const sub = 2 + (r() * 2 | 0);
        for (let k = 0; k < sub; k++) {
          const t = (k + 1) / (sub + 1);
          const sx = bx + (ex - bx) * t, sy = by + (ey - by) * t;
          const sl = len * 0.34 * (1 - t * 0.5);
          frond(sx, sy, sx + Math.cos(ang + RAMI * 0.9) * sl, sy + Math.sin(ang + RAMI * 0.9) * sl, w * 0.32, w * 0.08, depth + 3);
          frond(sx, sy, sx + Math.cos(ang - RAMI * 0.9) * sl, sy + Math.sin(ang - RAMI * 0.9) * sl, w * 0.32, w * 0.08, depth + 3);
        }
      }
    }

    // recursive dendrite. `kink` (from brittleness) makes the rachis crystalline
    // and straight at high values, feathered and wandering at low values — one
    // continuous control instead of a separate Shatter routine.
    function grow(px, py, ang, length, width, depth, side) {
      if (depth > 4 || length < D * 0.018 || width < 0.36) return;
      const segLenTarget = D * (0.012 + brittle * 0.02);
      const segs = Math.max(4, Math.round(length / segLenTarget));
      const segLen = length / segs;
      let cx = px, cy = py, a = ang, w = width;
      for (let s = 0; s < segs; s++) {
        const prog = s / segs;
        const nf = noise.fbm(cx / (D * 0.45), cy / (D * 0.45), 3, 0.55, 2.0);
        // brittle pieces kink crystallinely; soft pieces wander on the field
        const kink = Math.sin(s * 1.3 + ang) * 0.05 * brittle;
        a += nf * CURVE * 0.14 * (side || 1) + kink;
        const nx = cx + Math.cos(a) * segLen;
        const ny = cy + Math.sin(a) * segLen;
        const w2 = w * (0.93 - brittle * 0.05);
        frond(cx, cy, nx, ny, w, w2, depth);

        const taper = 1 - prog * 0.7;
        const pinW = Math.max(0.3, w2 * 0.5 * taper);
        const nBarbs = Math.max(1, Math.round(PINNA * (brittle > 0.5 ? 0.45 : 1)));
        const barbAng = brittle > 0.5 ? 1.05 : RAMI; // hexagonal habit when brittle
        for (let f = 0; f < nBarbs; f++) {
          const ft = (f + 0.5) / nBarbs;
          const bx = cx + (nx - cx) * ft, by = cy + (ny - cy) * ft;
          const bl = segLen * PINLEN * (1.7 + (1 - depth * 0.18)) * taper;
          const jit = (r() - 0.5) * PINJIT;
          pinna(bx, by, a + barbAng + jit, bl * (1 + ASYM), pinW, depth);
          pinna(bx, by, a - barbAng + jit, bl * (1 - ASYM), pinW, depth);
        }

        if (depth < 3 && prog > 0.12 && prog < 0.82 && r() < BRANCHP) {
          const dir = r() < 0.5 ? 1 : -1;
          const subLen = length * SHED * (0.5 + r() * 0.35) * (1 - prog * 0.4);
          grow(nx, ny, a + dir * RAMI * 0.85, subLen, w2 * 0.6, depth + 1, dir);
        }
        cx = nx; cy = ny; w = w2;
      }
    }

    // nucleation point → fern radiating in chosen directions. spread, count,
    // base angle all flow in continuously from the caller.
    function nucleate(nx, ny, baseAng, spread, count, length, width, aMul) {
      K.bloom(x, nx, ny, length * 0.09, pal.glow, fernGlowA * (aMul || 1));
      for (let i = 0; i < count; i++) {
        const t = count > 1 ? i / (count - 1) - 0.5 : 0;
        const a = baseAng + t * spread + (r() - 0.5) * 0.22;
        const L = length * (0.62 + r() * 0.7);
        x.save(); if (aMul != null && aMul < 1) x.globalAlpha = aMul;
        grow(nx, ny, a, L, width, 0, (i % 2) ? 1 : -1);
        x.restore();
      }
    }

    // ── 2. COMPOSE — continuous placement field ──────────────────────────
    // Each nucleus's position is a CONTINUOUS blend of four spatial tendencies
    // (radial-to-focus, edge-front, scattered, ring) weighted per seed. No
    // discrete mode. The same seed's weights also shape spread/count/reach so
    // two pieces never assemble identically.
    const baseW = D * 0.0024 + 0.8;
    // ring geometry (used when wRing has weight)
    const ringCx = W * (0.42 + r() * 0.16), ringCy = H * (0.42 + r() * 0.16);
    const ringRad = D * (0.34 + r() * 0.16);
    const ringPhase = r() * 6.28;
    // edge-front geometry
    const edgeSide = r() * 4 | 0; // 0=bottom 1=top 2=left 3=right
    const edgeInAng = [-Math.PI / 2, Math.PI / 2, 0, Math.PI][edgeSide];
    const edgeSpan0 = 0.08 + r() * 0.22, edgeSpan1 = 1 - (0.08 + r() * 0.22);
    // focus point for radial tendency
    const fx0 = W * focalX, fy0 = H * focalY;

    // for each nucleus pick its tendency by sampling the weight distribution,
    // then derive its position/orientation continuously.
    function pickTendency() {
      let t = r();
      if ((t -= wRadial) < 0) return 0;
      if ((t -= wEdge) < 0) return 1;
      if ((t -= wScatter) < 0) return 2;
      return 3;
    }

    for (let i = 0; i < nucCount; i++) {
      const ti = nucCount > 1 ? i / (nucCount - 1) : 0;
      const tend = pickTendency();
      let nx, ny, baseAng, spread, reachMul, count, aMul = 1;
      if (tend === 0) {
        // radial cluster around the focus — tight scatter, outward fans
        const rr = Math.pow(r(), 0.7) * D * 0.22 * (0.4 + zoom * 0.4);
        const aa = r() * 6.28;
        nx = fx0 + Math.cos(aa) * rr; ny = fy0 + Math.sin(aa) * rr;
        // first nucleus is the dominant bloom; rest are satellites
        if (i === 0) { baseAng = r() * 6.28; spread = 6.28; reachMul = 1.3; count = 5 + (r() * 4 | 0); }
        else { baseAng = aa; spread = 1.0 + r() * 2.5; reachMul = 0.55 + r() * 0.5; count = 1 + (r() * 3 | 0); aMul = 0.45 + r() * 0.4; }
      } else if (tend === 1) {
        // edge front — strung along one edge, reaching inward
        const along = edgeSpan0 + ti * (edgeSpan1 - edgeSpan0) + (r() - 0.5) * 0.1;
        if (edgeSide < 2) { nx = W * along; ny = edgeSide === 0 ? H * (0.9 + r() * 0.1) : H * (-0.02 + r() * 0.1); }
        else { ny = H * along; nx = edgeSide === 2 ? W * (-0.02 + r() * 0.1) : W * (0.9 + r() * 0.1); }
        baseAng = edgeInAng + (r() - 0.5) * 0.5;
        spread = 0.5 + r() * 1.0; reachMul = 0.9 + r() * 0.7;
        count = 1 + (r() * 3 | 0); aMul = 0.5 + r() * 0.45;
      } else if (tend === 2) {
        // scattered across the whole pane, pulled gently toward focus so it
        // never hugs the dead corners
        let fxx = 0.08 + r() * 0.84, fyy = 0.08 + r() * 0.84;
        fxx += (focalX - fxx) * 0.25; fyy += (focalY - fyy) * 0.25;
        nx = W * fxx; ny = H * fyy;
        baseAng = r() * 6.28; spread = 2.0 + r() * 3.5; reachMul = 0.4 + r() * 0.55;
        count = 1 + (r() * 3 | 0); aMul = 0.5 + r() * 0.45;
      } else {
        // ring — on the circle, growing inward toward the empty centre
        const aa = ringPhase + (i / Math.max(1, nucCount)) * 6.28 + (r() - 0.5) * 0.25;
        nx = ringCx + Math.cos(aa) * ringRad; ny = ringCy + Math.sin(aa) * ringRad;
        baseAng = aa + Math.PI + (r() - 0.5) * 0.4;
        spread = 0.6 + r() * 1.2; reachMul = 0.6 + r() * 0.55;
        count = 1 + (r() * 2 | 0); aMul = 0.55 + r() * 0.4;
      }
      const reach = reachBase * reachMul;
      const wid = baseW * (0.7 + r() * 0.8) * (i === 0 && tend === 0 ? 1.4 : 1);
      nucleate(nx, ny, baseAng, spread, count, reach, wid, aMul);
    }

    // ── 3. SURFACE TEXTURE — frosted glass grain & mottle ────────────────
    x.save(); x.globalCompositeOperation = 'overlay';
    K.mottle(x, 0, 0, W, H, pal.silver, 90, r, 'overlay');
    x.restore();

    // ── 4. ATMOSPHERE — layered haze + cold vignette grade ───────────────
    K.hazeSheet(x, W, H, noise, pal.haze, 0.12 + r() * 0.1, D * (0.45 + r() * 0.25), 'screen');
    x.save(); x.globalCompositeOperation = 'multiply';
    const veil = x.createRadialGradient(gcx, gcy, D * 0.2, gcx, gcy, D * 0.9);
    veil.addColorStop(0, 'rgba(255,255,255,0)');
    veil.addColorStop(1, K.rgba(pal.bg0, 0.5 + r() * 0.14));
    x.fillStyle = veil; x.fillRect(0, 0, W, H);
    x.restore();

    K.grain(x, W, H, 5.0, r);
    K.vignette(x, W, H, 0.38 + r() * 0.1);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const palAnchor = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : pickWeighted(PALS, r);
    // mirror draw()'s rng order: jitterPal consumes 6 values
    r(); r(); r(); r(); r(); r();
    // format
    const aspectRoll = K.randn(r) * 0.5;
    const aspect = K.clamp(1 + aspectRoll * 0.62, 0.62, 1.62);
    const f = aspect > 1.08 ? 'Landscape' : aspect < 0.92 ? 'Portrait' : 'Square';
    // continuous controls (consume in draw()'s order for descriptive traits)
    const zoom = 0.62 + Math.pow(r(), 1.3) * 1.55;
    const density = Math.pow(r(), 0.85);
    const wRadial = Math.pow(r(), 1.5), wEdge = Math.pow(r(), 1.5),
      wScatter = Math.pow(r(), 1.5), wRing = Math.pow(r(), 1.7);
    r(); r(); // focalX, focalY
    r(); // nucCount roll
    const brittle = Math.pow(r(), 1.6);
    // describe the dominant spatial tendency for a human-readable trait
    const tends = [['Radial', wRadial], ['Front', wEdge], ['Scatter', wScatter], ['Ring', wRing]];
    tends.sort((a, b) => b[1] - a[1]);
    const form = tends[0][0];
    const dens = density < 0.33 ? 'Sparse' : density < 0.66 ? 'Open' : 'Dense';
    const habit = brittle > 0.6 ? 'Brittle' : brittle > 0.3 ? 'Mixed' : 'Feathered';
    const scl = zoom < 1.0 ? 'Wide' : zoom < 1.55 ? 'Mid' : 'Close';
    return { Palette: palAnchor.name, Form: form, Density: dens, Habit: habit, Scale: scl, Format: f };
  }

  return { name: 'z_frostfern', draw, traits };
})();


export const frostFernTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderFrostFern: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const FROST_FERN_ASPECTS: readonly number[] = [1.3,1,0.78];
export const frostFernSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Silver Breath",
        "Frozen Tide",
        "Cryo Veil",
        "Midnight Pane",
        "Glacier Ink",
        "Hoarfrost"
      ]
    },
    {
      "name": "Form",
      "values": [
        "Front",
        "Scatter",
        "Ring",
        "Radial"
      ]
    },
    {
      "name": "Density",
      "values": [
        "Open",
        "Dense",
        "Sparse"
      ]
    },
    {
      "name": "Habit",
      "values": [
        "Brittle",
        "Feathered",
        "Mixed"
      ]
    },
    {
      "name": "Scale",
      "values": [
        "Mid",
        "Close",
        "Wide"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Portrait",
        "Square",
        "Landscape"
      ]
    }
  ]
};
