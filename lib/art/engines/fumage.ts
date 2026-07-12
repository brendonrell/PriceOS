// @ts-nocheck
/*
 * Fumage — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/z_fumage.js). Continuous seed-driven composition. Deterministic
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


/* FUMAGE — SOOT DRAWINGS.
 * The drifting carbon a candle flame leaves as it is passed under paper:
 * soft soot blooms, smoke-shadow gradients, scorched halos and feathered
 * carbon drifts that settle into an ambiguous, uncanny stain — bare warm
 * paper breathing through the gaps.
 *
 * ONE MECHANIC: deposit. Carbon is laid down as thousands of soft, additive
 * (darkening) puffs whose density follows a drift field. Where the flame
 * lingered the deposit is near-black; at the feathered edges it thins to a
 * warm grey haze and the paper shows through.
 *
 * This is a CONTINUOUS system, not a template picker. There are loose
 * structural "families" (how the cores are arranged), but EVERY salient
 * parameter — count, position, size, proportion, rotation, spacing, drift,
 * curvature, focal point, crop, global zoom, density, format, AND the carbon
 * colour values themselves — is sampled continuously from the seed. Two seeds
 * landing the same family still come out wildly different: different element
 * counts, scales, asymmetry, focal placement, how full the frame is, how warm
 * the soot runs, where the crop sits. No two pieces twin.
 *
 * SURREAL = real-but-off: soot drifting into the shape of something, left by
 * a flame that seems to have drawn on purpose. Pure field, no scene.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette. KIT preloaded. All randomness via r(). */
const ENGINE = (function () {
  const K = KIT;

  /* ── PALETTE WORLD: SOOT ──────────────────────────────────────────────
     carbon black + warm greys drifting over cream / buff / faint sepia
     paper; the occasional scorch-amber. Smoky warm monochrome.
     paper = base sheet · papyrus light/dark = paper grade endpoints ·
     soot = deepest carbon · smoke = mid warm grey · scorch = rare amber. */
  const PALS = [
    { name: 'Tallow',     paper: '#e9ddc4', pHi: '#f3ebd6', pLo: '#cdbb9a', soot: '#15110d', smoke: '#5a4f44', scorch: '#9a5a25', warm: 0.06 },
    { name: 'Bone Char',  paper: '#e4dccb', pHi: '#efe9da', pLo: '#c4b9a4', soot: '#100f10', smoke: '#52504c', scorch: '#7d5230', warm: 0.02 },
    { name: 'Sepia Smoke',paper: '#e7d6b6', pHi: '#f1e4c8', pLo: '#c8b187', soot: '#1c130b', smoke: '#6a5236', scorch: '#a8631f', warm: 0.12 },
    { name: 'Foxed Cream',paper: '#ece3cf', pHi: '#f6efdd', pLo: '#d2c3a3', soot: '#1a1410', smoke: '#63564a', scorch: '#8f5a2c', warm: 0.07, foxed: true },
    { name: 'Cold Ash',   paper: '#dfdacb', pHi: '#ebe7da', pLo: '#bdb6a4', soot: '#0e0e10', smoke: '#4c4d4e', scorch: '#6f5840', warm: -0.04 },
    { name: 'Amber Scorch',paper:'#e8d8b0', pHi: '#f2e6c4', pLo: '#c9af80', soot: '#1d1308', smoke: '#6e5232', scorch: '#c0701e', warm: 0.16, hot: true },
  ];

  /* Loose structural families — these are NOT discrete templates; each one's
     internals are heavily randomised and several global continuous controls
     (zoom, density, crop, focal jitter, colour jitter) ride on top, so two
     pieces from the same family share almost nothing. */
  const FAMILIES = ['Bloom', 'Cleft', 'Column', 'Settle', 'Veil', 'Aureole'];

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* shift a hex colour in HSL space — jitters the carbon-world tone per seed
     so soot/smoke/scorch VALUES vary continuously, not just a fixed swatch. */
  function jit(hex, dh, ds, dl) {
    const c = K.h2r(hex);
    const rr = c[0] / 255, gg = c[1] / 255, bb = c[2] / 255;
    const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    const d = mx - mn;
    if (d > 1e-6) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0));
      else if (mx === gg) h = (bb - rr) / d + 2;
      else h = (rr - gg) / d + 4;
      h *= 60;
    }
    return K.hsl2hex(h + dh, K.clamp(s + ds, 0, 1), K.clamp(l + dl, 0, 1));
  }

  /* deposit darkening: paint one soft carbon puff. */
  function puff(x, px, py, rad, col, a) {
    const g = x.createRadialGradient(px, py, 0, px, py, rad);
    g.addColorStop(0, K.rgba(col, a));
    g.addColorStop(0.5, K.rgba(col, a * 0.55));
    g.addColorStop(1, K.rgba(col, 0));
    x.fillStyle = g;
    x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const drift = K.makeNoise(seed * 7 + 91);
    const pal = pickPal(r);
    const family = K.pick(FAMILIES, r);

    /* ── CONTINUOUS FORMAT ──────────────────────────────────────────────
       aspect ratio sampled on a continuum, not 3 fixed buckets. */
    const aspect = 0.66 + r() * 0.84;          // 0.66 (tall) .. 1.50 (wide)
    const LONG = 1180;
    let W, H;
    if (aspect >= 1) { W = LONG; H = Math.round(LONG / aspect); }
    else { H = LONG; W = Math.round(LONG * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const MIN = Math.min(W, H);

    /* ── CONTINUOUS GLOBAL CONTROLS — these de-correlate family from look ──
       zoom: how big the deposit sits in the frame (intimate crop ↔ small &
       lost in paper). density: near-empty minimal ↔ packed & heavy.
       focal: where the mass sits — anywhere, not locked to centre. */
    const zoom = 0.62 + r() * 1.05;            // 0.62 small/minimal .. 1.67 big crop
    const densityMul = 0.45 + Math.pow(r(), 0.85) * 1.35; // 0.45 sparse .. 1.8 packed
    const fillBias = r();                      // shifts the stochastic-keep threshold
    const fx = 0.26 + r() * 0.48;              // focal x as frac of W (wide range)
    const fy = 0.24 + r() * 0.50;              // focal y as frac of H
    const cx = W * fx, cy = H * fy;

    // colour-world jitter (continuous): pull the carbon tones around in hue,
    // saturation, value so no two pieces share an identical soot/smoke/scorch.
    const hShift = (r() - 0.5) * 18;           // ±9° hue drift
    const sShift = (r() - 0.5) * 0.16;
    const lShift = (r() - 0.5) * 0.07;
    const soot   = jit(pal.soot,   hShift * 0.6, sShift * 0.5, lShift);
    const smoke  = jit(pal.smoke,  hShift,       sShift,       lShift * 1.2);
    const scorch = jit(pal.scorch, hShift * 0.4, sShift * 0.6, lShift * 0.6);
    const scorchLean = (pal.hot ? 0.5 : (pal.warm > 0.08 ? 0.28 : 0.12)) * (0.6 + r() * 0.9);

    function carbon(d) {
      if (d < 0.34) return K.mix(smoke, soot, d / 0.34 * 0.5);
      let c = K.mix(smoke, soot, K.clamp((d - 0.2) / 0.8, 0, 1));
      if (d > 0.4 && d < 0.78) c = K.mix(c, scorch, scorchLean * (0.55 - Math.abs(d - 0.58)) * 1.4);
      return c;
    }

    /* ── 1. PAPER SHEET ──────────────────────────────────────────────────
       warm uneven sheet: tonal gradient + low-freq fbm. Light rakes from a
       random side; sheet tone itself jittered slightly per seed. */
    const lightAng = r() * Math.PI * 2;
    const lx = W / 2 + Math.cos(lightAng) * W * 0.42;
    const ly = H / 2 + Math.sin(lightAng) * H * 0.42;
    const paper = jit(pal.paper, hShift * 0.3, sShift * 0.3, lShift * 0.4);
    const pHi = jit(pal.pHi, hShift * 0.3, sShift * 0.3, lShift * 0.4);
    const pLo = jit(pal.pLo, hShift * 0.3, sShift * 0.3, lShift * 0.4);
    const pg = x.createRadialGradient(lx, ly, 0, lx, ly, MIN * (1.05 + r() * 0.4));
    pg.addColorStop(0, pHi);
    pg.addColorStop(0.55, paper);
    pg.addColorStop(1, pLo);
    x.fillStyle = pg; x.fillRect(0, 0, W, H);
    x.save(); x.globalCompositeOperation = 'multiply';
    const ps = Math.max(4, Math.floor(MIN / 150));
    const grainScale = MIN * (0.45 + r() * 0.25);
    for (let yy = 0; yy < H; yy += ps) {
      for (let xx = 0; xx < W; xx += ps) {
        const n = (noise.fbm(xx / grainScale, yy / grainScale, 4, 0.55, 2.1) + 1) / 2;
        const a = (0.5 - n) * 0.14;
        if (a <= 0) continue;
        x.fillStyle = K.rgba(pLo, a);
        x.fillRect(xx, yy, ps + 1, ps + 1);
      }
    }
    x.restore();

    /* ── 2. THE DEPOSIT — assemble cores for the chosen family, with every
       sub-parameter randomised so same-family pieces still diverge hard. */
    const cores = [];
    function addCore(px, py, reach, w) { cores.push({ x: px, y: py, reach, w }); }

    let driftAng = lightAng + Math.PI + (r() - 0.5) * 1.1;
    let bandY = 0, bandReach = 0;
    const S = zoom;                            // scale shorthand

    if (family === 'Bloom') {
      const mainR = MIN * (0.20 + r() * 0.18) * S;
      addCore(cx, cy, mainR, 1);
      // a continuously variable swarm of satellites: anywhere from a clean
      // single mass to a busy cluster, at random angles/distances/scales.
      const sat = (r() * 6 | 0);
      for (let i = 0; i < sat; i++) {
        const a = r() * Math.PI * 2;
        const dd = mainR * (0.5 + r() * 1.4);
        addCore(cx + Math.cos(a) * dd, cy + Math.sin(a) * dd,
                mainR * (0.25 + r() * 0.55), 0.25 + r() * 0.55);
      }
    } else if (family === 'Cleft') {
      const sep = MIN * (0.10 + r() * 0.16) * S;
      const tilt = r() * Math.PI * 2;          // any axis now, not vertical-only
      const ux = Math.cos(tilt), uy = Math.sin(tilt);
      const big = (0.18 + r() * 0.12) * S, small = big * (0.45 + r() * 0.55);
      addCore(cx - ux * sep, cy - uy * sep, MIN * big, 1);
      addCore(cx + ux * sep, cy + uy * sep, MIN * small, 0.7 + r() * 0.25);
      const extra = (r() * 3 | 0);
      for (let i = 0; i < extra; i++) {
        const sa = tilt + (r() - 0.5) * Math.PI;
        const sd = sep * (0.8 + r() * 1.3);
        addCore(cx + Math.cos(sa) * sd, cy + Math.sin(sa) * sd, MIN * (0.07 + r() * 0.09) * S, 0.3 + r() * 0.3);
      }
      if (r() < 0.6) addCore(cx, cy, MIN * (0.07 + r() * 0.07) * S, 0.25 + r() * 0.2);
    } else if (family === 'Column') {
      driftAng = -Math.PI / 2 + (r() - 0.5) * 0.7;
      const baseFrac = 0.62 + r() * 0.26, topFrac = 0.10 + r() * 0.30;
      const base = H * baseFrac, top = H * topFrac;
      const steps = 7 + (r() * 5 | 0);
      // bias sway/curve away from zero so a near-straight teardrop is rare —
      // each column leans and bends a distinct way.
      const swaySign = r() < 0.5 ? -1 : 1, curveSign = r() < 0.5 ? -1 : 1;
      const sway = swaySign * W * (0.10 + r() * 0.40);
      const curve = curveSign * W * (0.10 + r() * 0.34);
      const dense = 0.5 + r() * 0.7;
      const widthMul = (0.7 + r() * 0.8) * S;
      // taper profile varies: bottom-heavy plume, even stalk, or top-heavy mush.
      const taper = 0.04 + r() * 0.16;
      const bulge = 0.5 + r() * 0.6;            // where the column fattens
      const forked = r() > 0.62;
      const forkAt = 0.45 + r() * 0.3, forkSpread = W * (0.08 + r() * 0.16);
      const wobble = W * (0.02 + r() * 0.06);
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const spineX = cx + sway * t + curve * Math.sin(t * Math.PI) + (r() - 0.5) * wobble;
        const py = base + (top - base) * t;
        const bell = 0.6 + 0.5 * Math.sin(K.clamp((t / bulge) * Math.PI, 0, Math.PI));
        const reach = MIN * (0.21 - t * taper) * widthMul * bell * (0.8 + r() * 0.45);
        const w = (1 - t * 0.5) * dense;
        if (forked && t > forkAt) {
          const ft = (t - forkAt) / (1 - forkAt);
          addCore(spineX - forkSpread * ft, py, reach * 0.72, w * 0.8);
          addCore(spineX + forkSpread * ft * 0.7, py, reach * 0.6, w * 0.6);
        } else {
          addCore(spineX, py, reach, w);
        }
      }
    } else if (family === 'Settle') {
      bandY = H * (0.50 + r() * 0.26);
      bandReach = H - bandY;
      const n = 4 + (r() * 6 | 0);
      const spread = 0.5 + r() * 0.42;
      for (let i = 0; i < n; i++) {
        const px = W * (0.5 + (r() - 0.5) * spread * 2);
        const py = bandY + r() * bandReach * (0.4 + r() * 0.5);
        addCore(px, py, MIN * (0.11 + r() * 0.18) * S, 0.4 + r() * 0.6);
      }
      driftAng = -Math.PI / 2 + (r() - 0.5) * 0.7;
    } else if (family === 'Veil') {
      const knots = 2 + (r() * 4 | 0);
      const axis = r() * Math.PI * 2;
      const span = MIN * (0.5 + r() * 0.7);
      const denseIdx = r() * knots | 0;
      for (let i = 0; i < knots; i++) {
        const t = knots === 1 ? 0 : (i / (knots - 1) - 0.5);
        const jx = (r() - 0.5) * MIN * 0.12, jy = (r() - 0.5) * MIN * 0.12;
        const px = cx + Math.cos(axis) * t * span + jx;
        const py = cy + Math.sin(axis) * t * span + jy;
        addCore(px, py, MIN * (0.14 + r() * 0.18) * S, (i === denseIdx) ? 0.8 + r() * 0.3 : 0.3 + r() * 0.3);
      }
    } else { // Aureole
      const R = MIN * (0.16 + r() * 0.14) * S;
      const lobes = 8 + (r() * 7 | 0);
      const heavyArc = r() * Math.PI * 2;
      const ellip = 0.62 + r() * 0.5;
      const rot = r() * Math.PI * 2;
      const arcSpan = 0.7 + r() * 0.3;          // partial vs full ring
      const arcStart = r() * Math.PI * 2;
      const breaky = 0.3 + r() * 0.5;
      for (let i = 0; i < lobes; i++) {
        const a = arcStart + (i / lobes) * Math.PI * 2 * arcSpan + (r() - 0.5) * 0.3;
        const rr = R * (0.85 + r() * 0.28);
        const px = cx + Math.cos(a + rot) * rr, py = cy + Math.sin(a + rot) * rr * ellip;
        const w = (breaky + (1 - breaky) * (0.5 + 0.5 * Math.cos(a - heavyArc))) + r() * 0.2;
        addCore(px, py, MIN * (0.12 + r() * 0.08) * S, w);
      }
      if (r() < 0.5) addCore(cx, cy, MIN * 0.12 * S, 0.12 + r() * 0.12);
    }

    // density sampler — soft core falloffs warped by an fbm drift field.
    const warpAmp = MIN * (0.05 + r() * 0.07);
    const breakScale = MIN * (0.13 + r() * 0.08);
    const erodeAmt = 0.12 + r() * 0.14;
    function density(px, py) {
      const wn = drift.fbm(px / (MIN * 0.42), py / (MIN * 0.42), 3, 0.6, 2.0);
      const wpx = px + Math.cos(driftAng) * wn * warpAmp + Math.sin(driftAng) * wn * warpAmp * 0.4;
      const wpy = py + Math.sin(driftAng) * wn * warpAmp - Math.cos(driftAng) * wn * warpAmp * 0.4;
      let d = 0;
      for (const c of cores) {
        const dx = wpx - c.x, dy = wpy - c.y;
        const dist = Math.sqrt(dx * dx + dy * dy) / c.reach;
        if (dist > 1.3) continue;
        d += Math.exp(-dist * dist * 2.1) * c.w;
      }
      const fn = (noise.fbm(px / breakScale, py / breakScale, 5, 0.6, 2.2) + 1) / 2;
      d *= 0.55 + fn * 0.75;
      const en = (noise.fbm(px / (MIN * 0.07) + 40, py / (MIN * 0.07) - 20, 4, 0.55, 2.3) + 1) / 2;
      d -= (1 - K.clamp(d, 0, 1)) * en * erodeAmt;
      return K.clamp(d * densityMul, 0, 1);
    }

    // 2a. SCORCH HALO underlay — warm amber heat-stain under the densest carbon
    {
      let bx = cx, by = cy, br = MIN * (0.22 + r() * 0.14) * S;
      if (family === 'Column') { by = H * (0.6 + r() * 0.16); }
      if (family === 'Settle') { by = bandY + bandReach * (0.3 + r() * 0.3); br = MIN * 0.34 * S; }
      const sa = (pal.hot ? 0.30 : 0.16) * (0.6 + r() * 0.6);
      x.save(); x.globalCompositeOperation = 'multiply';
      const g = x.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, K.rgba(scorch, sa));
      g.addColorStop(0.6, K.rgba(scorch, sa * 0.4));
      g.addColorStop(1, K.rgba(scorch, 0));
      x.fillStyle = g; x.fillRect(bx - br, by - br, br * 2, br * 2);
      x.restore();
    }

    // 2b. DEPOSIT PASS — march a jittered grid; keep/darken by D.
    x.save();
    x.globalCompositeOperation = 'multiply';
    const cell = Math.max(2.4, MIN / 360);
    const cols = Math.ceil(W / cell), rowsN = Math.ceil(H / cell);
    const carveScale = MIN * (0.24 + r() * 0.14);
    const keepThresh = 1.15 + fillBias * 0.5;   // continuous rim density
    for (let gy = 0; gy < rowsN; gy++) {
      for (let gx = 0; gx < cols; gx++) {
        const px = gx * cell + (r() - 0.5) * cell * 1.6;
        const py = gy * cell + (r() - 0.5) * cell * 1.6;
        let d = density(px, py);
        if (d < 0.04) continue;
        const mod = (noise.fbm(px / carveScale - 11, py / carveScale + 7, 4, 0.6, 2.0) + 1) / 2;
        const interior = K.clamp((d - 0.4) / 0.6, 0, 1);
        d *= 1 - interior * (0.34 - mod * 0.42);
        d = K.clamp(d, 0, 1);
        if (r() > d * keepThresh + 0.06) continue;
        const rad = cell * (1.0 + d * 3.0) * (0.7 + r() * 0.7);
        const a = K.clamp(d * 0.40 + 0.04, 0, 0.46) * (0.6 + r() * 0.5);
        puff(x, px, py, rad, carbon(d), a);
      }
    }
    x.restore();

    // 2c. DEEP CORE PASS — concentrated darker touches at the densest points.
    x.save();
    x.globalCompositeOperation = 'multiply';
    for (const c of cores) {
      if (c.w < 0.7) continue;
      const dc = density(c.x, c.y);
      if (dc < 0.5) continue;
      const n = 10 + (r() * 16 | 0);
      for (let i = 0; i < n; i++) {
        const ang = r() * Math.PI * 2, rr = Math.pow(r(), 1.9) * c.reach * 0.34;
        const px = c.x + Math.cos(ang) * rr, py = c.y + Math.sin(ang) * rr;
        const d = density(px, py);
        if (d < 0.62) continue;
        puff(x, px, py, c.reach * (0.05 + r() * 0.09), soot, 0.07 + d * 0.10);
      }
    }
    x.restore();

    /* ── 3. FOXING (rare) — faint sepia age-spots on bare paper ── */
    if (pal.foxed) {
      x.save(); x.globalCompositeOperation = 'multiply';
      const n = 30 + (r() * 30 | 0);
      for (let i = 0; i < n; i++) {
        const px = r() * W, py = r() * H, rr = MIN * (0.004 + r() * 0.016);
        if (density(px, py) > 0.3) continue;
        const g = x.createRadialGradient(px, py, 0, px, py, rr);
        g.addColorStop(0, K.rgba(scorch, 0.06 + r() * 0.05));
        g.addColorStop(1, K.rgba(scorch, 0));
        x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2);
      }
      x.restore();
    }

    /* ── 4. ATMOSPHERE: a low smoke haze over the whole sheet ── */
    const hazeCol = K.mix(smoke, paper, 0.4);
    x.save(); x.globalCompositeOperation = 'multiply';
    K.hazeSheet(x, W, H, drift, hazeCol, 0.08 + r() * 0.05, MIN * (0.7 + r() * 0.3), 'multiply');
    x.restore();
    {
      const a = (family === 'Veil' ? 0.10 : 0.06) * (0.7 + r() * 0.6);
      x.save(); x.globalCompositeOperation = 'multiply';
      const gx = x.createLinearGradient(cx - Math.cos(driftAng) * MIN, cy - Math.sin(driftAng) * MIN,
                                        cx + Math.cos(driftAng) * MIN, cy + Math.sin(driftAng) * MIN);
      gx.addColorStop(0, K.rgba(smoke, 0));
      gx.addColorStop(0.5, K.rgba(smoke, a));
      gx.addColorStop(1, K.rgba(smoke, 0));
      x.fillStyle = gx; x.fillRect(0, 0, W, H);
      x.restore();
    }

    /* ── 5. SURFACE TEXTURE: paper tooth + fine grain ── */
    K.mottle(x, 0, 0, W, H, paper, 34, r, 'overlay');
    K.grain(x, W, H, 4.2, r);

    /* ── 6. GRADE: warm-shadow vignette pulling toward the corners ── */
    x.save();
    const vStr = 0.22 + r() * 0.16;
    const vg = x.createRadialGradient(W / 2, H * 0.47, MIN * (0.24 + r() * 0.1), W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, K.rgba(K.mix(soot, pLo, 0.30), vStr));
    x.fillStyle = vg; x.globalCompositeOperation = 'multiply';
    x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H };
  }

  /* traits() must mirror draw()'s rng consumption order up to the values it
     reports, so the printed traits match the rendered piece. */
  function traits(seed) {
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : K.pick(PALS, r);
    const family = K.pick(FAMILIES, r);
    const aspect = 0.66 + r() * 0.84;
    const f = aspect > 1.12 ? 'Landscape' : aspect < 0.9 ? 'Portrait' : 'Square';
    const zoom = 0.62 + r() * 1.05;
    const densityMul = 0.45 + Math.pow(r(), 0.85) * 1.35;
    const dens = densityMul < 0.8 ? 'Sparse' : densityMul > 1.35 ? 'Heavy' : 'Mid';
    const scale = zoom < 0.85 ? 'Distant' : zoom > 1.35 ? 'Close' : 'Mid';
    return { Palette: pal.name, Form: family, Format: f, Density: dens, Scale: scale };
  }

  return { name: 'z_fumage', draw, traits };
})();


export const fumageTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderFumage: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const FUMAGE_ASPECTS: readonly number[] = [1.3,1,0.78];
export const fumageSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Foxed Cream",
        "Amber Scorch",
        "Bone Char",
        "Cold Ash",
        "Tallow",
        "Sepia Smoke"
      ]
    },
    {
      "name": "Form",
      "values": [
        "Column",
        "Settle",
        "Veil",
        "Aureole",
        "Bloom",
        "Cleft"
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
      "name": "Density",
      "values": [
        "Heavy",
        "Sparse",
        "Mid"
      ]
    },
    {
      "name": "Scale",
      "values": [
        "Mid",
        "Distant",
        "Close"
      ]
    }
  ]
};
