// @ts-nocheck
/*
 * Cyanotype — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/z_cyanotype.js). Continuous seed-driven composition. Deterministic
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


/* CYANOTYPE — sun-print photogram (camera-less prussian-blue prints).
 * Objects laid on sensitized paper leave white ghost silhouettes — but the
 * objects that printed are AMBIGUOUS / ABSENT: their shapes match no nameable
 * thing. Soft exposure gradients, brushed paper texture, white halos where
 * light crept under an edge. Pure abstract field — no scene, no horizon.
 *
 * UNCANNY HOOK: sun-printed shadows of objects that were never there.
 *
 * GENERATIVE MODEL (not a template picker): every salient parameter varies
 * CONTINUOUSLY with the seed — global zoom, density, format, focal placement,
 * colour VALUES (hue/value/sat jittered within the prussian world), and the
 * morphology of every imprint. Structural "families" (single-dominant,
 * scattered, drift, grid, fronds, lace, bands, swarm, mirror) are chosen on a
 * continuous compositional axis and then randomised WITHIN the family, so two
 * pieces of the same family still differ hard. No two seeds read alike.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Palette ANCHORS inside the CYANOTYPE world. These are starting points, NOT
     fixed swatches — draw() jitters hue/value/sat around each anchor per seed so
     the actual prussian field, white ghost and halo are continuously varied.
     `deep` = unexposed shadow, `field` = mid prussian, `lit` = sun-bleached
     base, `ghost` = white imprint body, `halo` = edge light-creep, `wash` =
     brush-coat tone. `rare` flags the off-classic (steel/violet). */
  const PALS = [
    { name: 'Prussian',   deep: '#06121f', field: '#0e2f55', lit: '#2d5f8f', ghost: '#eaf2f6', halo: '#bcd6e6', wash: '#13396a', w: 4 },
    { name: 'Delft',      deep: '#091a30', field: '#16467e', lit: '#3f74a8', ghost: '#f1f5f3', halo: '#cfe0ea', wash: '#1c4d86', w: 3 },
    { name: 'Cyan Bath',  deep: '#04161f', field: '#0c3b52', lit: '#2f7f9c', ghost: '#eef6f5', halo: '#aadbe2', wash: '#0f4c64', w: 3 },
    { name: 'Sun Bleach', deep: '#123a52', field: '#3f7ea0', lit: '#7db4cc', ghost: '#f6fbfa', halo: '#d6ecf2', wash: '#4f90af', w: 3 }, // pale, high-key
    { name: 'Midnight',   deep: '#02080f', field: '#071f38', lit: '#1b4368', ghost: '#dfeaf0', halo: '#8fb4cc', wash: '#0a2949', w: 3 }, // near-black, low-key
    { name: 'Indigo Veil',deep: '#0a1024', field: '#1f2b63', lit: '#465290', ghost: '#ecedf6', halo: '#c4c9e6', wash: '#26306e', w: 2 },
    { name: 'Steelplate', deep: '#0c161c', field: '#26424f', lit: '#5a7782', ghost: '#eef1f1', halo: '#c2d2d6', wash: '#314f5b', rare: 1, w: 2 },
    { name: 'Violet Salt',deep: '#11101f', field: '#2a2750', lit: '#56527e', ghost: '#eeecf2', halo: '#cbc6da', wash: '#322f5e', rare: 1, w: 2 },
  ];

  // structural FAMILIES — chosen continuously (see pickFamily). Each is a
  // generator of an arrangement, NOT a finished look; all internals randomise.
  const FAMILIES = ['single', 'scatter', 'drift', 'grid', 'frond', 'lace', 'bands', 'swarm', 'mirror'];

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return wpick(PALS, r);
  }
  function wpick(arr, r) {
    let tot = 0; for (const a of arr) tot += (a.w || 1);
    let t = r() * tot;
    for (const a of arr) { t -= (a.w || 1); if (t <= 0) return a; }
    return arr[arr.length - 1];
  }

  /* ── continuous colour-world jitter ──────────────────────────────────────
     Take the anchor palette and shift every role through HSL by a per-seed
     amount, so the actual blue / value / temperature is unique each render but
     always inside the prussian-cyanotype gamut. Returns a fresh palette obj. */
  function jitterPal(pal, r) {
    const hShift = (r() - 0.5) * 26;       // ±13° hue drift (blue↔cyan↔indigo)
    const tempLin = r();                    // 0 cooler/steel → 1 warmer/violet
    const tempShift = (tempLin - 0.5) * 16;
    const vScale = 0.82 + r() * 0.42;       // global value swing (dark↔pale print)
    const sScale = 0.78 + r() * 0.5;        // saturation swing (muted↔vivid bath)
    const j = {};
    for (const role of ['deep', 'field', 'lit', 'ghost', 'halo', 'wash']) {
      const c = K.h2r(pal[role]);
      const hsl = rgb2hsl(c[0], c[1], c[2]);
      // ghost (white body) stays near-white; only nudge its tint a touch
      const isGhost = role === 'ghost';
      let h = hsl[0] + hShift + tempShift * (isGhost ? 0.3 : 1);
      let s = K.clamp(hsl[1] * (isGhost ? 1 + (sScale - 1) * 0.25 : sScale), 0, 0.95);
      // value: darker roles swing more than the near-white ghost
      const vWeight = isGhost ? 0.25 : 1;
      let l = K.clamp(hsl[2] * (1 + (vScale - 1) * vWeight), 0.02, 0.985);
      j[role] = K.hsl2hex(h, s, l);
    }
    j.name = pal.name; j.rare = pal.rare;
    return j;
  }
  function rgb2hsl(r8, g8, b8) {
    const r = r8 / 255, g = g8 / 255, b = b8 / 255;
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

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const palAnchor = pickPal(r);
    const pal = jitterPal(palAnchor, r);
    const fam = pickFamily(r);

    // ── CONTINUOUS FORMAT: aspect sampled on a continuum, not a 5-swatch list ──
    const aspectExp = (r() - 0.5) * 1.2;        // log-aspect, continuous
    let aspect = Math.exp(aspectExp);            // ~0.55 … ~1.82
    const longEdge = 1180 + (r() * 200 | 0);
    let W, H;
    if (aspect >= 1) { W = longEdge; H = Math.round(longEdge / aspect); }
    else { H = longEdge; W = Math.round(longEdge * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── CONTINUOUS GLOBAL ZOOM/SCALE & DENSITY (de-correlated from family) ──
    // zoom multiplies every imprint size; density modulates how many/how packed.
    const zoom = 0.62 + Math.pow(r(), 1.4) * 1.7;   // 0.62 (macro tiny) … 2.3 (huge crop)
    const density = Math.pow(r(), 1.15);            // 0 near-empty … 1 packed
    // focal point the composition leans toward (breaks centred symmetry)
    const focal = { x: 0.5 + (r() - 0.5) * 0.5, y: 0.5 + (r() - 0.5) * 0.5 };

    // exposure light direction (where the sun fell strongest on the paper)
    const lightAng = r() * Math.PI * 2;
    const lightReach = 0.42 + r() * 0.28;
    const lx = W * 0.5 + Math.cos(lightAng) * W * lightReach;
    const ly = H * 0.5 + Math.sin(lightAng) * H * lightReach;

    // global exposure swing: pale/over-exposed ↔ deep/under-exposed
    const expo = 0.62 + r() * 0.82;
    const gradTilt = 0.34 + r() * 0.5;          // how concentrated the lit pool is

    // ── BASE: prussian field with broad exposure gradient ──
    x.fillStyle = pal.field; x.fillRect(0, 0, W, H);
    const eg = x.createRadialGradient(lx, ly, 0, lx, ly, Math.hypot(W, H) * (0.8 + r() * 0.3));
    eg.addColorStop(0, K.rgba(pal.lit, 0.85 * expo));
    eg.addColorStop(gradTilt, K.rgba(K.mix(pal.lit, pal.field, 0.5), 0.55 * expo));
    eg.addColorStop(Math.min(0.95, gradTilt + 0.36), K.rgba(pal.deep, 0.5 / expo));
    eg.addColorStop(1, K.rgba(pal.deep, Math.min(0.95, 0.92 / expo)));
    x.fillStyle = eg; x.fillRect(0, 0, W, H);

    // uneven hand-coated sensitizer
    coatField(x, W, H, noise, pal, r);

    // ── GHOST IMPRINTS via the chosen family, scaled by zoom & density ──
    const ghosts = layoutFamily(fam, W, H, S, r, { zoom, density, focal, noise });
    ghosts.sort((a, b) => b.s - a.s);
    for (const g of ghosts) {
      if (g.kind === 'frond') drawFrond(x, g, pal, noise, r, S);
      else drawGhost(x, g, pal, noise, r, S);
    }

    // brush-coat border
    brushBorder(x, W, H, pal, r, noise);

    // ── ATMOSPHERE & PAPER TEXTURE ──
    const hazeCol = K.mix(pal.lit, pal.ghost, 0.25);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.12 + r() * 0.1, S * (0.7 + r() * 0.4), 'screen');
    const dg = x.createRadialGradient(lx, ly, S * 0.15, W * 0.5, H * 0.5, Math.hypot(W, H) * 0.62);
    dg.addColorStop(0, 'rgba(0,0,0,0)');
    dg.addColorStop(1, K.rgba(pal.deep, 0.36 + r() * 0.2));
    x.fillStyle = dg; x.fillRect(0, 0, W, H);
    K.mottle(x, 0, 0, W, H, pal.field, 30, r, 'overlay');
    paperFibre(x, W, H, pal, r);
    K.grain(x, W, H, 4.6, r);
    K.vignette(x, W, H, (pal.rare ? 0.30 : 0.36) + (r() - 0.5) * 0.12);

    return { aspect: W / H };
  }

  // ── hand-coated chemistry field: large soft blotches of uneven exposure ──
  function coatField(x, W, H, noise, pal, r) {
    const step = Math.max(4, Math.floor(Math.min(W, H) / 150));
    const scale = Math.min(W, H) * (0.4 + r() * 0.45);
    const ox = r() * 100, oy = r() * 100;
    const darken = 0.35 + r() * 0.3, lighten = 0.28 + r() * 0.28;
    x.save();
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = noise.fbm(xx / scale + ox, yy / scale + oy, 4, 0.55, 2.1);
        const v = (n + 1) / 2;
        if (v > 0.62) {
          x.fillStyle = K.rgba(pal.deep, (v - 0.62) * darken);
          x.fillRect(xx, yy, step + 1, step + 1);
        } else if (v < 0.36) {
          x.fillStyle = K.rgba(pal.lit, (0.36 - v) * lighten);
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
    }
    x.restore();
  }

  // ── GHOST SHAPE GENERATOR ────────────────────────────────────────────────
  // A ghost is a polar contour whose radius is fbm-perturbed. The harmonic
  // amplitudes, notch count, fray and the per-shape "character" all vary, so two
  // ghosts rarely share a silhouette. `morph` (0..1) blends from soft round
  // membrane → jagged fractured plate.
  function ghostPath(x, g, noise, S) {
    const N = 240;
    const seedOff = g.seedOff;
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      let rad = 1;
      rad += g.h1 * Math.cos(a + g.p1);
      rad += g.h2 * Math.cos(a * 2 + g.p2);
      rad += g.h3 * Math.cos(a * 3 + g.p3);
      rad += g.h4 * Math.cos(a * g.h4n + g.p4);
      // sparse sharp notch (torn / fractured edge)
      const notch = Math.cos(a * g.notchN + g.notchPh);
      rad += g.notchAmp * (notch > 0.6 ? (notch - 0.6) * 2.5 : 0) * -1;
      // fbm edge fray, scaled by morph (jaggedness)
      const fx = Math.cos(a) * g.frayFreq + seedOff, fy = Math.sin(a) * g.frayFreq + seedOff * 0.5;
      rad += noise.fbm(fx, fy, 5, 0.62, 2.2) * g.fray;
      rad = Math.max(0.12, rad);
      const rr = rad * g.s;
      const px = g.cx + Math.cos(a) * rr * g.sx;
      const py = g.cy + Math.sin(a) * rr * g.sy;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
  }

  function drawGhost(x, g, pal, noise, r, S) {
    x.save();
    // rotate the whole imprint about its centre (asymmetry, anti-collision)
    x.translate(g.cx, g.cy); x.rotate(g.rot); x.translate(-g.cx, -g.cy);

    // 1) HALO: light crept under the object edge → soft pale-blue glow ring
    x.save();
    x.globalCompositeOperation = 'screen';
    x.shadowColor = pal.halo;
    x.shadowBlur = g.s * (0.28 + 0.24 * (1 - g.opacity)) * g.haloScale;
    x.fillStyle = K.rgba(pal.halo, 0.5 * g.opacity * g.haloScale);
    ghostPath(x, { ...g, s: g.s * 1.04 }, noise, S);
    x.fill();
    x.restore();

    // 2) BODY: white ghost silhouette, soft-edged
    ghostPath(x, g, noise, S);
    x.save();
    x.clip();
    const bg = x.createLinearGradient(g.cx - g.s, g.cy - g.s, g.cx + g.s, g.cy + g.s);
    bg.addColorStop(0, K.rgba(pal.ghost, g.opacity));
    bg.addColorStop(0.55, K.rgba(K.mix(pal.ghost, pal.halo, 0.35), g.opacity * 0.92));
    bg.addColorStop(1, K.rgba(K.mix(pal.halo, pal.field, 0.35), g.opacity * 0.8));
    x.fillStyle = bg;
    x.fillRect(g.cx - g.s * 2, g.cy - g.s * 2, g.s * 4, g.s * 4);
    K.mottle(x, g.cx - g.s * 1.6, g.cy - g.s * 1.6, g.s * 3.2, g.s * 3.2, pal.field, 22, r, 'multiply');
    if (g.veins) {
      x.globalCompositeOperation = 'multiply';
      x.strokeStyle = K.rgba(K.mix(pal.field, pal.ghost, 0.4), 0.16 + r() * 0.08);
      x.lineWidth = Math.max(1, g.s * 0.01);
      const vn = 3 + (r() * 4 | 0);
      const dir = g.veinAng, perp = dir + 1.57;
      for (let i = 0; i < vn; i++) {
        const off = (i / (vn - 1 || 1) - 0.5) * g.s * 1.6;
        const ox = g.cx + Math.cos(perp) * off, oy = g.cy + Math.sin(perp) * off;
        x.beginPath();
        let started = false;
        for (let t = -1.1; t <= 1.1; t += 0.08) {
          const drift = noise.fbm(t * 1.6 + i * 2.3, g.seedOff, 3) * g.s * 0.22;
          const px = ox + Math.cos(dir) * g.s * t + Math.cos(perp) * drift;
          const py = oy + Math.sin(dir) * g.s * t + Math.sin(perp) * drift;
          if (!started) { x.moveTo(px, py); started = true; } else x.lineTo(px, py);
        }
        x.stroke();
      }
    }
    x.restore();

    // 3) pierce holes — light passed through gaps in the absent object
    if (g.holes) {
      x.globalCompositeOperation = 'source-over';
      const hn = g.holes;
      for (let i = 0; i < hn; i++) {
        const a = (i / hn) * Math.PI * 2 + g.seedOff;
        const hr = g.s * (0.1 + r() * 0.18);
        const hx = g.cx + Math.cos(a) * g.s * (0.28 + r() * 0.5);
        const hy = g.cy + Math.sin(a) * g.s * (0.28 + r() * 0.5);
        const hg = x.createRadialGradient(hx, hy, 0, hx, hy, hr);
        hg.addColorStop(0, K.rgba(pal.field, 0.9));
        hg.addColorStop(0.6, K.rgba(K.mix(pal.field, pal.deep, 0.4), 0.7));
        hg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = hg;
        x.beginPath(); x.arc(hx, hy, hr, 0, 7); x.fill();
      }
    }
    x.restore();
  }

  // ── FROND: a line-thin filament photogram — recursive branching skeleton. ──
  function drawFrond(x, g, pal, noise, r, S) {
    const spineW = g.s * (0.04 + r() * 0.055);
    const len = g.s * (1.3 + r() * 1.3);
    const ribs = g.ribs;
    x.save();
    x.globalCompositeOperation = 'screen';
    x.shadowColor = pal.halo;
    x.shadowBlur = g.s * 0.16;
    x.lineCap = 'round'; x.lineJoin = 'round';

    function branch(px, py, ang, length, width, depth) {
      const segs = 10 + (length / S * 30 | 0);
      let cx = px, cy = py, ca = ang;
      const pts = [[cx, cy]];
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        ca += (noise.fbm(t * 2.4 + g.seedOff, depth * 3.1, 3)) * g.curl;
        const step = length / segs;
        cx += Math.cos(ca) * step; cy += Math.sin(ca) * step;
        pts.push([cx, cy]);
      }
      for (let i = 1; i < pts.length; i++) {
        const t = i / pts.length;
        x.strokeStyle = K.rgba(pal.ghost, (0.5 + 0.4 * (1 - t)) * g.opacity);
        x.lineWidth = Math.max(0.6, width * (1 - t * 0.85));
        x.beginPath(); x.moveTo(pts[i - 1][0], pts[i - 1][1]); x.lineTo(pts[i][0], pts[i][1]); x.stroke();
      }
      if (depth < g.depthMax) {
        const off = ribs;
        for (let i = 1; i < pts.length - 1; i += 1) {
          const t = i / pts.length;
          if (t < 0.08) continue;
          if ((i % Math.max(1, (pts.length / off | 0))) !== 0) continue;
          const baseAng = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]);
          const sideLen = length * (0.42 + r() * 0.2) * (1 - t * 0.7);
          for (const sgn of [1, -1]) {
            branch(pts[i][0], pts[i][1], baseAng + sgn * (g.openAng + (r() - 0.5) * 0.3), sideLen, width * 0.55, depth + 1);
          }
        }
      }
    }
    branch(g.cx, g.cy, g.frondAng, len, spineW, 0);
    x.restore();
  }

  // ── ghost / frond factories ─────────────────────────────────────────────
  // Every shape pulls a wide spread of params so same-family pieces still diverge.
  function makeGhost(cx, cy, s, r, opts) {
    opts = opts || {};
    const morph = opts.morph != null ? opts.morph : r();          // 0 round → 1 jagged
    return {
      cx, cy, s,
      sx: opts.sx != null ? opts.sx : 0.6 + r() * 0.85,
      sy: opts.sy != null ? opts.sy : 0.6 + r() * 0.85,
      rot: opts.rot != null ? opts.rot : r() * Math.PI * 2,
      h1: (r() - 0.5) * (0.35 + morph * 0.4),
      p1: r() * Math.PI * 2,
      h2: 0.08 + r() * (0.18 + morph * 0.3),
      p2: r() * Math.PI * 2,
      h3: (r() - 0.5) * (0.18 + morph * 0.28),
      p3: r() * Math.PI * 2,
      h4: (r() - 0.5) * morph * 0.22,
      h4n: 4 + (r() * 4 | 0),
      p4: r() * Math.PI * 2,
      notchN: 1 + (r() * 5 | 0),
      notchPh: r() * Math.PI * 2,
      notchAmp: r() < (0.4 + morph * 0.4) ? (0.15 + r() * 0.4) * (0.5 + morph) : 0,
      fray: (0.1 + r() * 0.2) * (0.6 + morph * 0.9),
      frayFreq: 1.3 + r() * 1.2,
      opacity: opts.opacity != null ? opts.opacity : 0.74 + r() * 0.2,
      haloScale: 0.7 + r() * 0.8,
      seedOff: r() * 50,
      veins: opts.veins != null ? opts.veins : r() < 0.3,
      veinAng: r() * Math.PI * 2,
      holes: opts.holes != null ? opts.holes : (r() < 0.28 ? 1 + (r() * 3 | 0) : 0),
    };
  }

  function makeFrond(cx, cy, s, r, opts) {
    opts = opts || {};
    return {
      kind: 'frond', cx, cy, s,
      frondAng: opts.frondAng != null ? opts.frondAng : r() * Math.PI * 2,
      curl: 0.1 + r() * 0.32,
      openAng: 0.45 + r() * 0.75,
      ribs: 5 + (r() * 8 | 0),
      depthMax: opts.depthMax != null ? opts.depthMax : 1 + (r() < 0.45 ? 1 : 0),
      opacity: opts.opacity != null ? opts.opacity : 0.7 + r() * 0.25,
      seedOff: r() * 50,
    };
  }

  /* Family chosen on a continuous axis so the distribution is smooth, not a
     hard bucket grab. We still consume exactly one r() for determinism. */
  function pickFamily(r) {
    const t = r();
    // weights — single & scatter common, fronds/lace/mirror rarer
    const weights = { single: 1.4, scatter: 1.4, drift: 1.1, grid: 1.0, frond: 0.9, lace: 0.8, bands: 0.9, swarm: 0.9, mirror: 0.7 };
    let tot = 0; for (const f of FAMILIES) tot += weights[f];
    let acc = t * tot;
    for (const f of FAMILIES) { acc -= weights[f]; if (acc <= 0) return f; }
    return 'scatter';
  }

  // ── family layouts: arrangements parameterised by zoom & density ──
  // Returns an array of ghost/frond objects. zoom scales sizes; density scales
  // counts/packing. Focal pulls the centre of mass.
  function layoutFamily(fam, W, H, S, r, ctx) {
    const { zoom, density, focal } = ctx;
    const G = [];
    const fx = W * focal.x, fy = H * focal.y;
    // a base imprint size that already respects continuous zoom
    const baseUnit = S * 0.16 * zoom;

    if (fam === 'single') {
      // one dominant imprint at the focal point + a continuous scatter of satellites
      const big = baseUnit * (1.0 + r() * 1.1);
      G.push(makeGhost(fx + (r() - 0.5) * S * 0.1, fy + (r() - 0.5) * S * 0.1, big, r,
        { veins: r() < 0.6, opacity: 0.84 + r() * 0.12, holes: r() < 0.4 ? 2 + (r() * 4 | 0) : 0 }));
      const sat = Math.round(density * (1 + r() * 4));
      for (let i = 0; i < sat; i++) {
        const a = r() * Math.PI * 2, d = S * (0.18 + r() * 0.5);
        G.push(makeGhost(fx + Math.cos(a) * d, fy + Math.sin(a) * d,
          baseUnit * (0.12 + r() * 0.3), r, {}));
      }
    } else if (fam === 'scatter') {
      // scattered specimens of continuously varied scale, count driven by density
      const n = 2 + Math.round(density * 11) + (r() * 2 | 0);
      // size spread: a few large, many small, all continuous
      for (let i = 0; i < n; i++) {
        const sizeRoll = Math.pow(r(), 1.8);          // skew small
        const sc = baseUnit * (0.16 + sizeRoll * 1.2);
        // cluster loosely around focal but spread wider as density drops
        const spread = 0.3 + (1 - density) * 0.4;
        const px = K.clamp(focal.x + (r() - 0.5) * spread * 2, 0.08, 0.92) * W;
        const py = K.clamp(focal.y + (r() - 0.5) * spread * 2, 0.08, 0.92) * H;
        G.push(makeGhost(px, py, sc, r, {}));
      }
    } else if (fam === 'drift') {
      // a drifting river of imprints, scaling down — implied motion
      const ang = r() * Math.PI * 2;
      const n = 4 + Math.round(density * 7);
      let px = focal.x * W - Math.cos(ang) * S * 0.4;
      let py = focal.y * H - Math.sin(ang) * S * 0.4;
      let sc = baseUnit * (0.7 + r() * 0.7);
      const decay = 0.78 + r() * 0.16;
      for (let i = 0; i < n; i++) {
        G.push(makeGhost(px, py, sc, r, {}));
        const stp = sc * (1.4 + r() * 0.8);
        px += Math.cos(ang) * stp + (r() - 0.5) * sc * 0.7;
        py += Math.sin(ang) * stp + (r() - 0.5) * sc * 0.7;
        sc *= decay + r() * 0.08;
      }
    } else if (fam === 'grid') {
      // loose grid + promoted anchor; cell count & dropout continuous
      const cols = 2 + (r() * 4 | 0), rows = 2 + (r() * 4 | 0);
      const mx = W * (0.12 + r() * 0.08), my = H * (0.12 + r() * 0.08);
      const cw = (W - mx * 2) / (cols - 1 || 1), ch = (H - my * 2) / (rows - 1 || 1);
      const base = baseUnit * (0.28 + r() * 0.18);
      const dropout = 0.55 - density * 0.45;          // denser grids keep more cells
      const ai = (r() * cols | 0), aj = (r() * rows | 0);
      const jitterAmt = 0.2 + r() * 0.4;
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const anchor = (i === ai && j === aj);
        if (!anchor && r() < dropout) continue;
        const jx = (r() - 0.5) * cw * jitterAmt, jy = (r() - 0.5) * ch * jitterAmt;
        const sc = anchor ? base * (2.0 + r() * 1.2) : base * (0.5 + r() * 0.8);
        G.push(makeGhost(mx + i * cw + jx, my + j * ch + jy, sc, r,
          { veins: anchor || r() < 0.3, holes: 0, opacity: anchor ? 0.88 : 0.7 + r() * 0.2 }));
      }
    } else if (fam === 'frond') {
      // line-thin filament photograms — 1..N, sometimes a shared base
      const cluster = r() < 0.5;
      const fscale = zoom;
      if (cluster) {
        const bx = focal.x * W, by = H * (0.55 + r() * 0.32);
        const n = 2 + Math.round(density * 3) + (r() * 2 | 0);
        const base = -Math.PI / 2 + (r() - 0.5) * 1.0;
        for (let i = 0; i < n; i++) {
          const a = base + (i / Math.max(1, n - 1) - 0.5) * (0.9 + r() * 1.0);
          G.push(makeFrond(bx + (r() - 0.5) * S * 0.12, by, S * (0.36 + r() * 0.34) * fscale, r,
            { frondAng: a, depthMax: 1 + (r() < 0.5 ? 1 : 0) }));
        }
      } else {
        G.push(makeFrond(focal.x * W, H * (0.55 + r() * 0.35), S * (0.5 + r() * 0.4) * fscale, r, { depthMax: 2 }));
        if (r() < 0.5) G.push(makeFrond(W * (0.15 + r() * 0.7), H * (0.2 + r() * 0.35), S * (0.22 + r() * 0.2) * fscale, r, {}));
      }
    } else if (fam === 'lace') {
      // a few large imprints riddled with pierce holes — porous photogram
      const n = 1 + Math.round(density * 2);
      const cx0 = focal.x * W, cy0 = focal.y * H;
      for (let i = 0; i < n; i++) {
        const a = r() * Math.PI * 2, d = S * (0.06 + r() * 0.18) * i;
        G.push(makeGhost(cx0 + Math.cos(a) * d, cy0 + Math.sin(a) * d,
          baseUnit * (1.3 + r() * 0.9), r, {
            opacity: 0.7 + r() * 0.18, veins: false, holes: 7 + (r() * 11 | 0),
          }));
      }
    } else if (fam === 'bands') {
      // horizontal (or tilted) pressed strips — wide elongated imprints
      const rows = 2 + Math.round(density * 4);
      const my = H * (0.1 + r() * 0.1);
      const gap = (H - my * 2) / (rows - 1 || 1);
      const tilt = (r() - 0.5) * 0.18;                 // slight slant
      const elong = 1.5 + r() * 1.8;
      for (let j = 0; j < rows; j++) {
        const yy = my + j * gap + (r() - 0.5) * gap * 0.3;
        const cnt = 1 + (r() * 2 | 0);
        for (let k = 0; k < cnt; k++) {
          const cx = W * (0.18 + r() * 0.64);
          G.push(makeGhost(cx, yy + (cx - W / 2) * tilt, baseUnit * (0.8 + r() * 0.7), r, {
            sx: elong * (0.8 + r() * 0.5), sy: 0.3 + r() * 0.22,
            opacity: 0.7 + r() * 0.2, veins: r() < 0.5, holes: 0, rot: tilt + (r() - 0.5) * 0.1,
          }));
        }
      }
    } else if (fam === 'swarm') {
      // packed dense field of tiny imprints — count scales hard with density
      const n = 14 + Math.round(density * 46);
      const tiny = baseUnit * 0.16;
      for (let i = 0; i < n; i++) {
        const big = r() < 0.06;
        const px = K.clamp(focal.x + (r() - 0.5) * 1.7, 0.05, 0.95) * W;
        const py = K.clamp(focal.y + (r() - 0.5) * 1.7, 0.05, 0.95) * H;
        G.push(makeGhost(px, py, big ? baseUnit * (0.45 + r() * 0.4) : tiny * (0.6 + r() * 1.3), r,
          { opacity: 0.64 + r() * 0.28, veins: false, holes: 0 }));
      }
    } else { // mirror — bilateral symmetry against a fold line
      const horiz = r() < 0.3;
      const axis = horiz ? H * (0.42 + r() * 0.16) : W * (0.42 + r() * 0.16);
      const n = 1 + Math.round(density * 4) + (r() * 2 | 0);
      const built = [];
      for (let i = 0; i < n; i++) {
        const along = (horiz ? W : H) * (0.18 + r() * 0.64);
        const offFromAxis = (horiz ? H : W) * (0.03 + r() * 0.28);
        const sc = baseUnit * (0.55 + r() * 0.9);
        const cx = horiz ? along : axis - offFromAxis;
        const cy = horiz ? axis - offFromAxis : along;
        built.push(makeGhost(cx, cy, sc, r, { veins: r() < 0.5, opacity: 0.78 + r() * 0.16 }));
      }
      for (const b of built) {
        G.push(b);
        const mx = horiz ? b.cx : axis * 2 - b.cx;
        const my = horiz ? axis * 2 - b.cy : b.cy;
        G.push({ ...b, cx: mx, cy: my, sx: b.sx, sy: b.sy, rot: -b.rot, p1: b.p1 + Math.PI });
      }
    }
    return G;
  }

  // ── brushed sensitizer border ──
  function brushBorder(x, W, H, pal, r, noise) {
    const m = Math.min(W, H) * (0.035 + r() * 0.035);
    x.save();
    x.globalCompositeOperation = 'screen';
    const strokes = 70 + (r() * 50 | 0);
    for (let i = 0; i < strokes; i++) {
      const side = i % 4;
      let bx, by, bw, bh;
      const t = r();
      const jitter = m * (0.3 + noise.fbm(t * 6, side, 3) * 0.7);
      if (side === 0) { bx = t * W; by = 0; bw = 2 + r() * 6; bh = jitter; }
      else if (side === 1) { bx = t * W; by = H - jitter; bw = 2 + r() * 6; bh = jitter; }
      else if (side === 2) { bx = 0; by = t * H; bw = jitter; bh = 2 + r() * 6; }
      else { bx = W - jitter; by = t * H; bw = jitter; bh = 2 + r() * 6; }
      x.fillStyle = K.rgba(K.mix(pal.lit, pal.ghost, 0.4), 0.05 + r() * 0.08);
      x.fillRect(bx, by, bw, bh);
    }
    x.restore();
    x.save();
    x.globalCompositeOperation = 'overlay';
    const bn = 4 + (r() * 6 | 0);
    for (let i = 0; i < bn; i++) {
      const yy = r() * H, th = H * (0.01 + r() * 0.03);
      const grd = x.createLinearGradient(0, yy, W, yy);
      const c = r() < 0.5 ? pal.lit : pal.deep;
      grd.addColorStop(0, 'rgba(0,0,0,0)');
      grd.addColorStop(0.3 + r() * 0.2, K.rgba(c, 0.06 + r() * 0.05));
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = grd; x.fillRect(0, yy, W, th);
    }
    x.restore();
  }

  // ── fibrous cold-press paper grain ──
  function paperFibre(x, W, H, pal, r) {
    x.save();
    x.globalCompositeOperation = 'overlay';
    const n = Math.floor(W * H / 1600);
    for (let i = 0; i < n; i++) {
      const px = r() * W, py = r() * H;
      const len = 2 + r() * 5;
      const dark = r() < 0.5;
      x.strokeStyle = K.rgba(dark ? pal.deep : pal.ghost, 0.03 + r() * 0.05);
      x.lineWidth = 1;
      x.beginPath(); x.moveTo(px, py); x.lineTo(px + len, py + (r() - 0.5) * 2); x.stroke();
    }
    x.restore();
  }

  // ── traits: PURE, mirrors draw()'s rng consumption order EXACTLY ──
  function traits(seed) {
    const r = K.rng(seed);
    const palAnchor = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : pickPal(r);
    // jitterPal consumes: hShift, tempLin, vScale, sScale  → 4 r() calls
    r(); r(); r(); r();
    const fam = pickFamily(r);
    // aspect (1) + longEdge (1)
    const aspectExp = (r() - 0.5) * 1.2; r();
    const aspect = Math.exp(aspectExp);
    const f = aspect > 1.08 ? 'Landscape' : aspect < 0.92 ? 'Portrait' : 'Square';
    // zoom (1), density (1)
    const zoom = 0.62 + Math.pow(r(), 1.4) * 1.7;
    const density = Math.pow(r(), 1.15);
    // focal x,y (2)
    r(); r();
    // light angle (1)
    const lightAng = r() * Math.PI * 2;
    const dirs = ['E', 'SE', 'S', 'SW', 'W', 'NW', 'N', 'NE'];
    const expose = dirs[Math.round(((lightAng % (Math.PI * 2)) / (Math.PI * 2)) * 8) % 8];
    const FAMLABEL = { single: 'Specimen', scatter: 'Constellation', drift: 'Cascade', grid: 'Lattice', frond: 'Frond', lace: 'Lace', bands: 'Strata', swarm: 'Swarm', mirror: 'Mirror' };
    const scale = zoom > 1.5 ? 'Macro' : zoom < 0.85 ? 'Distant' : 'Mid';
    const dens = density > 0.66 ? 'Packed' : density < 0.33 ? 'Sparse' : 'Open';
    return {
      Palette: palAnchor.name, Form: FAMLABEL[fam] || fam, Format: f,
      Scale: scale, Density: dens, Exposure: expose,
      Tone: palAnchor.rare ? 'Off-Classic' : 'Classic Blue',
    };
  }

  return { name: 'z_cyanotype', draw, traits };
})();


export const cyanotypeTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderCyanotype: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const CYANOTYPE_ASPECTS: readonly number[] = [1.3,1,0.78];
export const cyanotypeSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Sun Bleach",
        "Steelplate",
        "Delft",
        "Indigo Veil",
        "Midnight",
        "Prussian",
        "Cyan Bath",
        "Violet Salt"
      ]
    },
    {
      "name": "Form",
      "values": [
        "Lace",
        "Cascade",
        "Specimen",
        "Swarm",
        "Strata",
        "Constellation",
        "Lattice",
        "Frond",
        "Mirror"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Portrait",
        "Landscape",
        "Square"
      ]
    },
    {
      "name": "Scale",
      "values": [
        "Macro",
        "Distant",
        "Mid"
      ]
    },
    {
      "name": "Density",
      "values": [
        "Open",
        "Sparse",
        "Packed"
      ]
    },
    {
      "name": "Exposure",
      "values": [
        "W",
        "SW",
        "NW",
        "N",
        "SE",
        "S",
        "E",
        "NE"
      ]
    },
    {
      "name": "Tone",
      "values": [
        "Classic Blue",
        "Off-Classic"
      ]
    }
  ]
};
