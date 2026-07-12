// @ts-nocheck
/*
 * Reverie — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/b_reverie.js). Continuous seed-driven composition. Deterministic
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


/* REVERIE — soak-stain colour-fields on raw linen.
 * Pure non-objective abstraction: thinned translucent washes of rose, amber,
 * teal, lilac and sage soaked into bare oat-linen, overlapping into luminous
 * veils and blooms with feathered, bleeding edges. Bare canvas breathes between.
 * Lyrical, watery, weightless. Influence = Frankenthaler soak-stain, but the
 * work is its own: composed colour-shape, real value structure, designed
 * negative space, controlled imperfection, atmospheric haze + canvas tooth.
 * Depicts NOTHING — it is form, colour, balance, bleed.
 *
 * GENERATIVE, NOT TEMPLATE: every salient parameter (count, position, size,
 * proportion, rotation, spacing, curvature, density, zoom, format, AND colour
 * VALUES — hue/sat/value jittered within the world) varies CONTINUOUSLY with
 * the seed. There is no discrete "mode picker": each piece composes a unique
 * field of pools/pours from continuous distributions, so two seeds are never
 * near-duplicates. The palette-world (oat-linen grounds + soak hues + dusk
 * minority) and the texture/haze/vignette grade are preserved verbatim.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Soft translucent soak-stain-on-linen world. The GROUND spans a
     LIGHT-dominant field with a moody DUSK minority — so the set never reads as
     one pale project from across the room. Four pale oat-linen grounds keep the
     Frankenthaler signature; two DUSK grounds (deep slate, ember-dark) flip the
     value structure so a minority of outputs are genuinely dark.
       `linen` = bare ground; `wash` = the stain hues (translucent);
       `deep`  = the value-anchor mixed into cores (DARKER than linen on pale
                 palettes; LIGHTER/luminous on dusk palettes, so cores still read);
       `glow`  = the warm light pooling where veils overlap.
     `dark:true` flips the stain compositing from multiply (darken) to screen
     (lighten) so the same wash machinery paints LIGHT veils onto a dark ground —
     identical composition, inverted chiaroscuro, full legibility. */
  const PALS = [
    { name: 'Linen Bloom',  wt: 1.1, linen: '#e7ddc7', tooth: '#d8ccb0', wash: ['#d98f9e', '#e6b878', '#cbb6d4', '#9fc2b0', '#7fb0b6'], deep: '#7a5a63', glow: '#f4e6c4' },
    { name: 'Faded Rose',   wt: 1.0, linen: '#ece2cf', tooth: '#ddd1ba', wash: ['#d68a96', '#e0a9ab', '#d7b9cf', '#e7c08a', '#b9c5b2'], deep: '#84545d', glow: '#f6ead0' },
    { name: 'Sage Reverie', wt: 0.9, linen: '#e6e0cb', tooth: '#d6cfb6', wash: ['#a7c0a6', '#8fb6ad', '#c9c08a', '#cfb6c6', '#d59f8f'], deep: '#566053', glow: '#f1ead0' },
    { name: 'Amber Drift',  wt: 0.85, linen: '#ebdfc4', tooth: '#dccdac', wash: ['#e3ad6e', '#dcc07c', '#cf9c8a', '#bfb59c', '#9bb6ad'], deep: '#7c5840', glow: '#f7e9c0' },
    // ── DUSK minority: dark grounds, luminous washes (screen-blended) ──
    { name: 'Dusk Slate',  wt: 0.6, dark: true, linen: '#222a36', tooth: '#33404f', wash: ['#e7a9b4', '#f0c48c', '#b9c8e6', '#cdb6dc', '#8fc6c4'], deep: '#f3e6d0', glow: '#fbeecb' },
    { name: 'Ember Dark',  wt: 0.55, dark: true, linen: '#2a1e1a', tooth: '#3c2c24', wash: ['#ef9d72', '#f2c07a', '#e7a3a0', '#d9b4bf', '#b8c79e'], deep: '#fbe6c4', glow: '#fce3b6' },
  ];

  function pickW(arr, r, key) {
    // weighted pick by .wt
    let tot = 0; for (const a of arr) tot += (a[key] || 1);
    let t = r() * tot;
    for (const a of arr) { t -= (a[key] || 1); if (t <= 0) return a; }
    return arr[arr.length - 1];
  }

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return pickW(PALS, r, 'wt');
  }

  // ── colour helpers ───────────────────────────────────────────────────
  // Convert a palette swatch to HSL so we can jitter hue/sat/value CONTINUOUSLY
  // per pool — two pieces that draw the "same" wash hue still land on different
  // exact colours, killing the swatch-collision twins.
  function hex2hsl(h) {
    const c = K.h2r(h);
    let R = c[0] / 255, G = c[1] / 255, B = c[2] / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
    let H = 0;
    if (d !== 0) {
      if (mx === R) H = ((G - B) / d) % 6;
      else if (mx === G) H = (B - R) / d + 2;
      else H = (R - G) / d + 4;
      H *= 60; if (H < 0) H += 360;
    }
    const L = (mx + mn) / 2;
    const S = d === 0 ? 0 : d / (1 - Math.abs(2 * L - 1));
    return [H, S, L];
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);
    const dark = !!pal.dark;
    const STAIN_OP = dark ? 'screen' : 'multiply';

    // ── CONTINUOUS GLOBAL CHARACTER ──────────────────────────────────────
    // FORMAT: continuous aspect from a wide range (tall portrait → wide
    // landscape), not three buckets. The long edge is fixed; the short edge
    // scales by a continuous ratio.
    const LONG = 1180;
    const aspR = 0.66 + r() * 0.84;            // 0.66 (tall) .. 1.50 (wide)
    let W, H;
    if (aspR >= 1) { W = LONG; H = Math.round(LONG / aspR); }
    else { H = LONG; W = Math.round(LONG * aspR); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const MN = Math.min(W, H), MX = Math.max(W, H);

    // ZOOM / SCALE: a continuous master scale on every form. Low = airy &
    // small-formed, high = forms crop past the edges. De-correlated from format.
    const zoom = 0.70 + r() * 1.05;            // 0.70 .. 1.75

    // DENSITY: continuous element budget from near-empty minimal to packed.
    // Skewed so both extremes occur. Drives counts everywhere below.
    const dRaw = r();
    const density = dRaw * dRaw * (dRaw < 0.5 ? 0.9 : 1.25); // 0 (sparse) .. ~1.25 (packed)
    const budget = 2 + Math.round(density * 9);              // 2 .. ~13 pools

    // OVERALL STRENGTH / value-key of the piece: some seeds are pale & high-key,
    // some are deep & saturated. Continuous, independent of palette.
    const keyDeep = 0.18 + r() * 0.62;         // tonal depth of focal cores
    const baseStrength = 0.78 + r() * 0.5;

    // Per-piece hue rotation + sat/value bias so the *exact colours* drift even
    // within one palette — the swatch is a seed, not a fixed output.
    const hueRot = (r() - 0.5) * 34;           // ±17° global hue drift
    const satBias = 0.78 + r() * 0.5;          // global saturation multiplier
    const valBias = (r() - 0.5) * 0.14;        // global lightness shift

    // ── RAW LINEN GROUND ──────────────────────────────────────────────
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, dark ? K.mix(pal.linen, pal.tooth, 0.5) : K.mix(pal.linen, '#ffffff', 0.05));
    bg.addColorStop(1, dark ? K.mix(pal.linen, '#000000', 0.22) : K.mix(pal.linen, pal.tooth, 0.45));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    // ── per-piece wash colour generator ──────────────────────────────────
    // Build a continuous hue field: take the palette's wash swatches, jitter
    // each into HSL space with the per-piece + per-call biases. Each *pool*
    // requests a colour with its own small jitter so no two pools share an exact
    // value even when leaning on the same swatch family.
    const washHSL = pal.wash.map(hex2hsl);
    // a continuous "lead" position so the piece favours one region of the wash
    // wheel but never the same discrete set across seeds.
    const lead = r() * pal.wash.length;
    const spread = 0.4 + r() * 1.4;            // how far hues fan from the lead

    function washCol(t, jit) {
      // t in [0,1) selects a position around the lead; jit adds per-pool noise.
      jit = jit == null ? 1 : jit;
      const fpos = lead + (t - 0.5) * spread * pal.wash.length;
      const i0 = ((Math.floor(fpos) % washHSL.length) + washHSL.length) % washHSL.length;
      const i1 = (i0 + 1) % washHSL.length;
      const f = fpos - Math.floor(fpos);
      // blend two neighbouring swatch hues for in-between colours
      let h0 = washHSL[i0][0], h1 = washHSL[i1][0];
      // shortest-arc hue blend
      let dh = h1 - h0; if (dh > 180) dh -= 360; if (dh < -180) dh += 360;
      let H = h0 + dh * f;
      let S = washHSL[i0][1] + (washHSL[i1][1] - washHSL[i0][1]) * f;
      let L = washHSL[i0][2] + (washHSL[i1][2] - washHSL[i0][2]) * f;
      // continuous per-piece + per-pool jitter
      H += hueRot + (r() - 0.5) * 26 * jit;
      S = K.clamp(S * satBias * (0.85 + r() * 0.3 * jit), 0.08, 0.95);
      L = K.clamp(L + valBias + (r() - 0.5) * 0.10 * jit, 0.18, 0.92);
      return K.hsl2hex(H, S, L);
    }

    // a single soak pool: a noise-perturbed blob, painted as feathered
    // translucent passes so the edge bleeds rather than cutting.
    function stainPath(cx, cy, rad, irreg, rot, squash) {
      const steps = 96;
      x.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const nx = Math.cos(a), ny = Math.sin(a);
        const n = noise.fbm(nx * irreg + cx * 0.001, ny * irreg + cy * 0.001, 4, 0.55, 2.1);
        const n2 = noise.fbm(nx * irreg * 2.3 + 11, ny * irreg * 2.3 + 7, 3, 0.5, 2.2);
        const rr = rad * (1 + n * 0.42 + n2 * 0.16);
        let px = Math.cos(a) * rr, py = Math.sin(a) * rr * squash;
        const rx = px * Math.cos(rot) - py * Math.sin(rot);
        const ry = px * Math.sin(rot) + py * Math.cos(rot);
        if (i === 0) x.moveTo(cx + rx, cy + ry); else x.lineTo(cx + rx, cy + ry);
      }
      x.closePath();
    }

    // paint one soak pool with feathered bleed. SOFT RADIAL FALLOFF clipped to
    // one organic contour → dense wet centre fading continuously to nothing at
    // the bleeding rim. Faint chromatography ring + luminous core lift complete
    // the watercolour read. ONE contour per pool → no onion artifact.
    function soak(cx, cy, rad, col, strength, irreg, rot, squash, deepCore) {
      irreg = irreg == null ? 0.9 : irreg;
      rot = rot == null ? r() * Math.PI : rot;
      squash = squash == null ? 0.8 + r() * 0.5 : squash;
      deepCore = deepCore || 0;
      const drift = K.mix(col, K.mix(col, pal.deep, 0.14), 0.5);

      // (a) soft outer bleed halo
      x.save();
      x.globalCompositeOperation = STAIN_OP;
      stainPath(cx, cy, rad * 1.12, irreg * 1.1, rot, squash);
      x.clip();
      let g = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 1.18);
      g.addColorStop(0, K.rgba(col, strength * 0.30));
      g.addColorStop(0.55, K.rgba(col, strength * 0.18));
      g.addColorStop(0.85, K.rgba(drift, strength * 0.06));
      g.addColorStop(1, K.rgba(drift, 0));
      x.fillStyle = g; x.fillRect(cx - rad * 1.3, cy - rad * 1.3, rad * 2.6, rad * 2.6);
      x.restore();

      // (b) dense body — stronger central radial; focal pools settle into a
      // genuinely deeper, more saturated wet centre → real tonal range.
      x.save();
      x.globalCompositeOperation = STAIN_OP;
      stainPath(cx, cy, rad * 0.94, irreg, rot, squash);
      x.clip();
      const bcx = cx + (r() - 0.5) * rad * 0.18, bcy = cy + (r() - 0.5) * rad * 0.18;
      const coreCol = K.mix(col, pal.deep, 0.10 + deepCore * 0.40);
      g = x.createRadialGradient(bcx, bcy, 0, bcx, bcy, rad * 1.05);
      g.addColorStop(0, K.rgba(coreCol, strength * (0.34 + deepCore * 0.26)));
      g.addColorStop(0.35, K.rgba(K.mix(col, pal.deep, deepCore * 0.18), strength * (0.26 + deepCore * 0.14)));
      g.addColorStop(0.7, K.rgba(col, strength * 0.20));
      g.addColorStop(1, K.rgba(col, 0));
      x.fillStyle = g; x.fillRect(cx - rad * 1.2, cy - rad * 1.2, rad * 2.4, rad * 2.4);
      x.restore();

      // (c) chromatography rim — faint darker wet edge, clipped to the body
      x.save();
      x.globalCompositeOperation = 'multiply';
      stainPath(cx, cy, rad * 0.96, irreg, rot, squash);
      x.clip();
      stainPath(cx, cy, rad * 0.90, irreg, rot, squash);
      x.lineWidth = rad * 0.12;
      x.strokeStyle = K.rgba(K.mix(col, dark ? '#1a1410' : pal.deep, 0.28), strength * 0.06);
      x.stroke();
      x.restore();

      // (d) luminous core lift — suppressed on deep focal pools
      x.save();
      x.globalCompositeOperation = 'screen';
      K.bloom(x, bcx, bcy, rad * 0.5, K.mix(pal.glow, col, 0.45), strength * 0.16 * (1 - deepCore * 0.7));
      x.restore();
    }

    // a thin pour — single continuous tapered ribbon of thinned colour wandering
    // with noise. ONE closed path (two wobbling edges) filled along its length.
    function pour(cx, cy, len, wide, col, strength, ang, curve) {
      curve = curve == null ? 1 : curve;
      const seg = 40;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const px_ = -Math.sin(ang), py_ = Math.cos(ang);
      const spine = [];
      const phase = r() * 9;
      for (let s = 0; s <= seg; s++) {
        const t = s / seg;
        const wob = noise.fbm(t * 3.0 * curve + cx * 0.003 + phase, cy * 0.003 + 5, 4, 0.55, 2.1);
        const along = (t - 0.5) * len;
        const lateral = wob * wide * 1.8 * curve;
        const w = wide * (0.35 + Math.sin(t * Math.PI) * 1.05) * (1 + wob * 0.25);
        spine.push({ x: cx + ux * along + px_ * lateral, y: cy + uy * along + py_ * lateral, w });
      }
      x.save();
      x.globalCompositeOperation = STAIN_OP;
      x.beginPath();
      for (let s = 0; s < spine.length; s++) { const p = spine[s]; const X = p.x + px_ * p.w, Y = p.y + py_ * p.w; if (s === 0) x.moveTo(X, Y); else x.lineTo(X, Y); }
      for (let s = spine.length - 1; s >= 0; s--) { const p = spine[s]; x.lineTo(p.x - px_ * p.w, p.y - py_ * p.w); }
      x.closePath();
      x.clip();
      const g = x.createLinearGradient(cx - ux * len / 2, cy - uy * len / 2, cx + ux * len / 2, cy + uy * len / 2);
      g.addColorStop(0, K.rgba(K.mix(col, pal.glow, 0.10), 0));
      g.addColorStop(0.18, K.rgba(K.mix(col, pal.glow, 0.10), strength * 0.16));
      g.addColorStop(0.5, K.rgba(col, strength * 0.22));
      g.addColorStop(0.85, K.rgba(K.mix(col, pal.deep, 0.14), strength * 0.18));
      g.addColorStop(1, K.rgba(K.mix(col, pal.deep, 0.14), 0));
      x.fillStyle = g;
      x.fillRect(0, 0, W, H);
      x.restore();
    }

    // ── CONTINUOUS COMPOSITION ───────────────────────────────────────────
    // Instead of N discrete modes, a piece is built from continuous "ingredient"
    // amounts mixed per seed: a band? a set of pours? a focal bloom? a drift of
    // satellites? Each amount is a continuous weight, so the structural family
    // blends rather than snapping to one of six templates.
    const cM = MN * 0.10;

    // focal point — continuous anywhere in a generous central region, never a
    // fixed phi point. Asymmetry vector pushes the weight off-centre per seed.
    const fx = W * (0.26 + r() * 0.48);
    const fy = H * (0.24 + r() * 0.50);
    // a "current" direction the satellites drift along (continuous angle)
    const flowAng = r() * Math.PI * 2;
    const fux = Math.cos(flowAng), fuy = Math.sin(flowAng);

    // ingredient weights (continuous 0..1) — de-correlated random draws
    const wBand   = Math.max(0, r() - 0.45) / 0.55;   // chance & strength of a horizon band
    const wPours  = Math.max(0, r() - 0.40) / 0.60;   // poured ribbons present?
    const wFocal  = 0.55 + r() * 0.45;                // there is almost always a focal bloom
    const wScatter = 0.2 + r() * 0.8;                 // how scattered the satellites are
    const wOverlap = r();                             // twin-veil overlap behaviour

    // base focal radius scales with zoom and is the size reference for the piece
    const fR = MN * (0.16 + r() * 0.14) * zoom;

    // ── (1) optional broad horizon band ──────────────────────────────────
    if (wBand > 0.15) {
      const hzn = H * (0.40 + r() * 0.34);
      const bandHue = washCol(r(), 0.6);
      const bandDir = r() < 0.5 ? 1 : -1; // band fades up or down
      x.save();
      x.globalCompositeOperation = STAIN_OP;
      const seg = 48;
      const wobAmp = H * (0.04 + r() * 0.06);
      x.beginPath();
      if (bandDir > 0) {
        x.moveTo(-20, H + 20);
        x.lineTo(-20, hzn + noise.fbm(0, 9, 4, 0.55, 2.1) * wobAmp);
        for (let s = 0; s <= seg; s++) { const t = s / seg; const wob = noise.fbm(t * 2.6 + 3, 9, 4, 0.55, 2.1); x.lineTo(t * (W + 40) - 20, hzn + wob * wobAmp); }
        x.lineTo(W + 20, H + 20);
      } else {
        x.moveTo(-20, -20);
        x.lineTo(-20, hzn + noise.fbm(0, 9, 4, 0.55, 2.1) * wobAmp);
        for (let s = 0; s <= seg; s++) { const t = s / seg; const wob = noise.fbm(t * 2.6 + 3, 9, 4, 0.55, 2.1); x.lineTo(t * (W + 40) - 20, hzn + wob * wobAmp); }
        x.lineTo(W + 20, -20);
      }
      x.closePath();
      x.clip();
      const span = bandDir > 0 ? (H - hzn) : hzn;
      const g0y = bandDir > 0 ? hzn - H * 0.06 : hzn + H * 0.06;
      const g1y = bandDir > 0 ? H : 0;
      const bg2 = x.createLinearGradient(0, g0y, 0, g1y);
      const bandStr = (0.6 + wBand * 0.5) * baseStrength;
      bg2.addColorStop(0, K.rgba(bandHue, 0));
      bg2.addColorStop(0.12, K.rgba(bandHue, 0.14 * bandStr));
      bg2.addColorStop(0.55, K.rgba(K.mix(bandHue, pal.deep, 0.10), 0.20 * bandStr));
      bg2.addColorStop(1, K.rgba(K.mix(bandHue, pal.deep, 0.10 + keyDeep * 0.18), 0.26 * bandStr));
      x.fillStyle = bg2; x.fillRect(0, Math.min(g0y, g1y), W, span + H * 0.12);
      // lateral second hue so the band isn't flat
      const lw = x.createLinearGradient(0, 0, W, 0);
      const h2 = washCol(r(), 0.7);
      lw.addColorStop(0, K.rgba(bandHue, 0.05));
      lw.addColorStop(0.45 + r() * 0.1, K.rgba(h2, 0.10));
      lw.addColorStop(1, K.rgba(bandHue, 0.05));
      x.fillStyle = lw; x.fillRect(0, Math.min(g0y, g1y), W, span + H * 0.12);
      x.restore();
    }

    // ── (2) optional poured ribbons ──────────────────────────────────────
    if (wPours > 0.15) {
      const baseAng = (Math.PI / 2) + (r() - 0.5) * 1.4; // mostly vertical-ish but free
      const nP = 1 + Math.round(wPours * (1 + density * 3));
      const span = 0.30 + r() * 0.45;
      const x0 = W * (0.5 - span / 2);
      const curve = 0.5 + r() * 1.6;
      for (let i = 0; i < nP; i++) {
        const cx = x0 + (nP > 1 ? (i / (nP - 1)) * W * span : 0) + (r() - 0.5) * W * 0.08;
        const cy = H * (0.5 + (r() - 0.5) * 0.16);
        pour(cx, cy, H * (0.55 + r() * 0.4) * zoom, MN * (0.035 + r() * 0.06) * zoom,
             washCol(i / Math.max(1, nP), 1), (0.8 + r() * 0.4) * baseStrength,
             baseAng + (r() - 0.5) * 0.35, curve);
      }
    }

    // ── (3) a faint atmospheric ground-stain behind the focal mass ────────
    soak(fx + MN * (r() - 0.5) * 0.12, fy + MN * (0.02 + r() * 0.08), fR * (1.15 + r() * 0.3),
         washCol(r(), 0.5), 0.42 * baseStrength, 0.95 + r() * 0.3);

    // ── (4) the focal bloom — always present, continuous size/depth ───────
    soak(fx, fy, fR, washCol(r(), 0.8), baseStrength, 0.82 + r() * 0.2,
         r() * Math.PI, 0.7 + r() * 0.6, keyDeep);

    // ── (5) overlapping veil partner (continuous offset → twin-veil read) ──
    if (wOverlap > 0.25) {
      const off = (0.35 + wOverlap * 0.7);
      const ox = fx + fux * fR * off + (r() - 0.5) * fR * 0.4;
      const oy = fy + fuy * fR * off + (r() - 0.5) * fR * 0.4;
      const oR = fR * (0.6 + r() * 0.55);
      soak(ox, oy, oR, washCol(r(), 0.9), (0.85 + r() * 0.15) * baseStrength, 0.8 + r() * 0.25,
           r() * Math.PI, 0.75 + r() * 0.5, keyDeep * 0.6);
      // the crossing pool — deeper mixed-hue value where the two veils meet
      if (off < 0.95) {
        const mx = (fx + ox) / 2, my = (fy + oy) / 2;
        soak(mx, my, Math.min(fR, oR) * (0.5 + r() * 0.25),
             K.mix(washCol(r(), 0.4), washCol(r(), 0.4), 0.5),
             0.78 * baseStrength, 0.9, r() * Math.PI, 0.8 + r() * 0.4, keyDeep + 0.1);
      }
    }

    // ── (6) drifting satellites — count from density, placement continuous ─
    // distributed along the flow current with continuous scatter; collision-aware
    // so the field always breathes. Sizes taper continuously.
    const nSat = budget;
    const used = [{ x: fx, y: fy, r: fR }];
    let placed = 0, tries = 0;
    while (placed < nSat && tries < nSat * 14) {
      tries++;
      const t = placed / Math.max(1, nSat);
      // drift along the current, fanned out by scatter, plus free jitter
      const along = (t - 0.4) * MX * (0.5 + wScatter * 0.7);
      const lateral = (r() - 0.5) * MN * (0.3 + wScatter * 0.7);
      const px = -fuy, py = fux;
      let cx = fx + fux * along + px * lateral + (r() - 0.5) * MN * 0.18;
      let cy = fy + fuy * along + py * lateral + (r() - 0.5) * MN * 0.18;
      // keep mostly on-canvas but allow occasional bold crop
      const crop = r() < 0.18;
      if (!crop) { cx = K.clamp(cx, cM, W - cM); cy = K.clamp(cy, cM, H - cM); }
      const rad = MN * (0.05 + r() * 0.13) * (1 - t * 0.35) * zoom;
      let ok = true;
      const breathe = 0.55 + wScatter * 0.55; // sparser pieces space pools wider
      for (const u of used) { if (Math.hypot(cx - u.x, cy - u.y) < (rad + u.r) * breathe) { ok = false; break; } }
      if (!ok) continue;
      used.push({ x: cx, y: cy, r: rad });
      const dc = r() < 0.25 ? keyDeep * (0.4 + r() * 0.5) : 0; // occasional deep satellite
      soak(cx, cy, rad, washCol(r(), 1), (0.55 + r() * 0.45) * baseStrength,
           0.85 + r() * 0.4, r() * Math.PI, 0.7 + r() * 0.55, dc);
      placed++;
    }

    // ── (7) a faint far ghost wash anchoring one corner (atmosphere) ──────
    if (r() < 0.7) {
      soak(W * (r() < 0.5 ? 0.12 + r() * 0.12 : 0.76 + r() * 0.12),
           H * (0.12 + r() * 0.76), MN * (0.28 + r() * 0.22) * zoom,
           washCol(r(), 0.5), (0.18 + r() * 0.16) * baseStrength, 1.05 + r() * 0.25);
    }

    // ── CANVAS TOOTH, MOTTLE, HAZE, VIGNETTE (grade preserved verbatim) ───
    x.save();
    x.globalCompositeOperation = dark ? 'screen' : 'multiply';
    x.strokeStyle = K.rgba(pal.tooth, dark ? 0.08 : 0.05);
    x.lineWidth = 1;
    const tg = Math.max(3, Math.floor(MN / 220));
    for (let yy = 0; yy < H; yy += tg) { x.beginPath(); x.moveTo(0, yy + (noise.noise2(yy * 0.05, 1) * 1.2)); x.lineTo(W, yy); x.stroke(); }
    for (let xx = 0; xx < W; xx += tg) { x.globalAlpha = 0.6; x.beginPath(); x.moveTo(xx + (noise.noise2(xx * 0.05, 2) * 1.2), 0); x.lineTo(xx, H); x.stroke(); x.globalAlpha = 1; }
    x.restore();

    K.mottle(x, 0, 0, W, H, K.mix(pal.linen, pal.deep, 0.2), 70, r, 'overlay');

    const hazeCol = K.mix(pal.glow, pal.wash[0], 0.2);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.14, MN * 1.1, 'screen');

    x.save();
    K.bloom(x, fx, fy, MN * (0.7 + r() * 0.4), pal.glow, 0.10);
    x.restore();

    K.grain(x, W, H, 6.5, r);
    x.save();
    x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(W / 2, H * 0.46, MN * 0.3, W / 2, H / 2, Math.max(W, H) * 0.8);
    vg.addColorStop(0, 'rgba(255,255,255,0)');
    vg.addColorStop(1, K.rgba(dark ? K.mix(pal.linen, '#000000', 0.45) : K.mix(pal.tooth, pal.deep, 0.25), dark ? 0.28 : 0.22));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H };
  }

  function traits(seed) {
    // Mirror draw()'s rng draw order EXACTLY up to the point each trait is
    // derived, so traits stay pure & deterministic. We only need to consume the
    // same early draws that set the named characteristics.
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : pickW(PALS, r, 'wt');

    const aspR = 0.66 + r() * 0.84;
    const fmt = aspR >= 1.18 ? 'Landscape' : aspR <= 0.84 ? 'Portrait' : 'Square';

    const zoom = 0.70 + r() * 1.05;
    const scale = zoom < 1.0 ? 'Intimate' : zoom > 1.45 ? 'Immersive' : 'Open';

    const dRaw = r();
    const density = dRaw * dRaw * (dRaw < 0.5 ? 0.9 : 1.25);
    const fill = density < 0.18 ? 'Sparse' : density < 0.55 ? 'Composed' : 'Dense';

    return { Palette: pal.name, Field: fill, Scale: scale, Format: fmt };
  }

  return { name: 'b_reverie', draw, traits };
})();


export const reverieTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderReverie: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const REVERIE_ASPECTS: readonly number[] = [1.3,1,0.78];
export const reverieSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Sage Reverie",
        "Dusk Slate",
        "Faded Rose",
        "Linen Bloom",
        "Ember Dark",
        "Amber Drift"
      ]
    },
    {
      "name": "Field",
      "values": [
        "Composed",
        "Sparse",
        "Dense"
      ]
    },
    {
      "name": "Scale",
      "values": [
        "Intimate",
        "Immersive",
        "Open"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Square",
        "Landscape",
        "Portrait"
      ]
    }
  ]
};
