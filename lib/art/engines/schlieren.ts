// @ts-nocheck
/*
 * Schlieren — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/z_schlieren.js). Continuous seed-driven composition. Deterministic
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


/* SCHLIEREN — a shadowgraph of invisible air.
 *
 * Density gradients in air (heat shimmer, a rising plume of warm air, a
 * standing shockwave) are invisible — until a knife-edge schlieren rig turns
 * the GRADIENT of refractive index into smooth ghostly grey banding. One side
 * of every density ridge lights, the other darkens, against an even back-lit
 * field. We paint that literally: build a smooth scalar density field (rising
 * tongues, folding ribbons, lens cells, standing fronts, overturning swirl),
 * then render its directional derivative against a knife-edge axis, mapped to
 * luminous silver-grey.
 *
 * SURREAL = real-but-off: heat and pressure with no source, drawn in pure
 * grey light. Not smoke (no billow, no curl-soot) — smooth refraction.
 *
 * PALETTE WORLD — MONOCHROME SILVER: charcoal field, luminous silver/graphite
 * gradients, a faint warm or cool bias per seed. Hazy, photographic.
 *
 * ── HOW THIS STAYS GENERATIVE, NOT A TEMPLATE ──
 * There are NO discrete "modes" and NO fixed palette swatches. Every salient
 * parameter is sampled CONTINUOUSLY from the seed:
 *   • the palette (field/silver/graphite/bias) is jittered in value, hue and
 *     saturation within the silver world — a continuum, not 6 chips;
 *   • the density field is a CONTINUOUS MIXTURE of five structural components
 *     (rising plume, standing fronts, lens cells, overturning convection,
 *     thermal strata), each weighted by its own independent draw — so two
 *     pieces almost never share a structure vector;
 *   • global ZOOM, DENSITY (near-empty minimal ↔ packed), FOCAL position,
 *     asymmetry, knife angle, gain and FORMAT (continuous aspect) all vary
 *     hard and independently across seeds.
 * Result: a continuum of distinct pieces, never a near-duplicate.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* ── PALETTE WORLD (continuous) ──
     The silver world is defined by a small set of named anchors purely so
     FORCE_PAL / traits have human labels. The ACTUAL colours used to draw are
     synthesised per-seed inside makePal() from continuous ranges, so two seeds
     that land near the same anchor still differ in field darkness, silver
     brightness, graphite depth and bias tint. Pitch (the rare near-black grail)
     is the only structurally distinct one; everything else is a continuum. */
  const PAL_ANCHORS = ['Mercury', 'Pewter', 'Cold Steel', 'Argentine', 'Ember Ash', 'Pitch'];

  function hexToHsl(hex) {
    const c = K.h2r(hex); let r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b); let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn; s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0); else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }

  /* Synthesise a continuous monochrome-silver palette from the seed rng.
     Returns the same shape the renderer expects: field/silver/graphite/bias
     hexes + biasAmt + warm flag + a human name for traits. */
  function makePal(r) {
    if (undefined) {
      const forced = forcedPal(undefined);
      if (forced) return forced;
    }
    // bias direction: a continuous hue choice biased toward cool steels, with a
    // minority warm (ember) tail and a neutral centre.
    const biasRoll = r();
    let biasHue, warm;
    if (biasRoll < 0.18) { biasHue = 32 + r() * 18; warm = true; }       // warm ember (amber)
    else if (biasRoll < 0.30) { biasHue = 0; warm = false; }              // neutral (no chroma)
    else { biasHue = 205 + r() * 35; warm = false; }                      // cool steel/argent
    const biasSat = biasHue === 0 ? 0 : (warm ? 0.18 + r() * 0.16 : 0.10 + r() * 0.18);
    const biasAmt = 0.03 + r() * 0.10;

    // field darkness: continuous charcoal, with a rare near-black "pitch" tail.
    const pitch = r() < 0.12;                 // rare grail
    const fieldL = pitch ? 0.030 + r() * 0.020 : 0.060 + r() * 0.050;
    // silver brightness lobe — continuous, always genuinely luminous.
    const silverL = (pitch ? 0.70 + r() * 0.12 : 0.84 + r() * 0.14);
    const silverS = warm ? 0.06 + r() * 0.05 : (biasHue === 0 ? 0.0 : 0.02 + r() * 0.05);
    // graphite depth.
    const graphiteL = 0.012 + r() * 0.020;

    const fieldHue = warm ? 30 : (biasHue === 0 ? 220 : biasHue);
    const fieldSat = warm ? 0.10 + r() * 0.06 : (biasHue === 0 ? 0.04 : 0.05 + r() * 0.05);
    const silverHue = warm ? 36 : (biasHue === 0 ? 222 : biasHue);

    const field = K.hsl2hex(fieldHue, fieldSat, fieldL);
    const silver = K.hsl2hex(silverHue, silverS, silverL);
    const graphite = K.hsl2hex(warm ? 28 : 230, 0.10, graphiteL);
    const bias = K.hsl2hex(biasHue, Math.min(0.5, biasSat * 2.2), Math.min(0.92, silverL + 0.06));

    // pick the nearest anchor name for traits (purely cosmetic labelling)
    let name;
    if (pitch) name = 'Pitch';
    else if (warm) name = 'Ember Ash';
    else if (biasHue === 0) name = 'Pewter';
    else if (silverL > 0.90) name = 'Mercury';
    else if (biasSat > 0.20) name = 'Cold Steel';
    else name = 'Argentine';

    return { name, field, silver, graphite, bias, biasAmt, warm, pitch };
  }

  // Deterministic palette anchors for FORCE_PAL (kept so overrides still work).
  function forcedPal(nm) {
    const A = {
      'Mercury':    { name: 'Mercury',    field: '#16171b', silver: '#e9ecf2', graphite: '#05060a', bias: '#f2f4fb', biasAmt: 0.04, warm: false, pitch: false },
      'Pewter':     { name: 'Pewter',     field: '#191a1c', silver: '#d3d6dc', graphite: '#070708', bias: '#dadde3', biasAmt: 0.03, warm: false, pitch: false },
      'Cold Steel': { name: 'Cold Steel', field: '#13161c', silver: '#d7dee9', graphite: '#04060c', bias: '#bcd0ec', biasAmt: 0.10, warm: false, pitch: false },
      'Argentine':  { name: 'Argentine',  field: '#15171b', silver: '#dde2ea', graphite: '#05070b', bias: '#cdd9ec', biasAmt: 0.07, warm: false, pitch: false },
      'Ember Ash':  { name: 'Ember Ash',  field: '#191713', silver: '#ece3d6', graphite: '#0a0805', bias: '#f0d9b6', biasAmt: 0.11, warm: true,  pitch: false },
      'Pitch':      { name: 'Pitch',      field: '#0d0e10', silver: '#aeb3bd', graphite: '#020203', bias: '#c2c6cf', biasAmt: 0.05, warm: false, pitch: true  },
    };
    return A[nm] || null;
  }

  /* Smooth, deterministic continuous weighting of the five structural
     components. Each weight is an independent draw raised to a power so most
     pieces are dominated by one or two families (clear identity) while still
     carrying continuous traces of the others (no two same-dominant pieces look
     alike). Returns a normalised-ish weight object; one family is boosted to be
     the clear lead. */
  function structureMix(r) {
    // raw per-family energies, skewed so some are usually small
    let w = {
      plume:   Math.pow(r(), 1.6),
      front:   Math.pow(r(), 2.0),
      cell:    Math.pow(r(), 1.4),
      conv:    Math.pow(r(), 1.5),
      layer:   Math.pow(r(), 2.2),
    };
    // pick a lead family continuously and boost it so the piece has a spine
    const keys = ['plume', 'front', 'cell', 'conv', 'layer'];
    const lead = keys[Math.floor(r() * keys.length)];
    w[lead] += 0.7 + r() * 0.8;
    // normalise to a comfortable total
    let tot = 0; for (const k of keys) tot += w[k];
    const target = 1.0;
    for (const k of keys) w[k] = (w[k] / tot) * target;
    w._lead = lead;
    return w;
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const nB = K.makeNoise(seed * 7 + 91);   // second field — folds / detail
    const nC = K.makeNoise(seed * 7 + 173);  // third field — independent warp

    const pal = makePal(r);

    /* ── CONTINUOUS FORMAT ──
       aspect sampled on a continuum from tall portrait to wide landscape,
       not 3 fixed shapes. Long edge ~1180. */
    const aspect = 0.74 + r() * 0.78;            // 0.74 (portrait) … 1.52 (landscape)
    let W, H;
    if (aspect >= 1) { W = 1180; H = Math.round(1180 / aspect); }
    else { H = 1180; W = Math.round(1180 * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const MN = Math.min(W, H);

    const mix = structureMix(r);

    /* ── GLOBAL ZOOM / SCALE ──
       continuous field-of-view: small zoom = sweeping wide view of the whole
       column, large zoom = cropped-in macro of a single fold. */
    const zoom = 0.62 + r() * 1.5;               // 0.62 … 2.12

    /* ── DENSITY (minimal ↔ packed) ──
       drives both the signal gain and how tight the focal envelope is. Low =
       near-empty meditative field with one faint structure; high = the frame
       is full of refraction. */
    const density = Math.pow(r(), 0.85);          // 0..1, slightly toward middle/high
    const gain = (2.4 + density * 2.4) * (0.9 + r() * 0.45);

    /* ── FOCAL POSITION & ASYMMETRY ──
       where structure concentrates, anywhere in-frame, plus how strongly the
       envelope pulls toward it (loose = whole frame active, tight = islanded). */
    const focX = 0.22 + r() * 0.56;
    const focY = 0.20 + r() * 0.58;
    const focTight = 0.5 + (1 - density) * 2.2 + r() * 1.4;   // sparser → tighter island

    /* knife-edge axis — the rig's sensitivity direction — fully continuous. */
    const kAng = r() * Math.PI;
    const kx = Math.cos(kAng), ky = Math.sin(kAng);
    const warmGlass = pal.warm;

    // per-seed continuous geometry params (independent draws, all used)
    const plumeX0  = focX + (r() - 0.5) * 0.18;
    const plumeW   = MN * (0.05 + r() * 0.09) / zoom;          // tongue half-width
    const plumeLean= (r() - 0.5) * 1.4;                        // lateral lean of the rise
    const baseY    = H * (0.55 + r() * 0.32);                  // birth height
    const foldAmp  = 0.4 + r() * 1.8;                          // how much it folds
    const frontN   = 1 + Math.floor(r() * 4);                  // 1..4 standing fronts
    const frontTilt= (r() - 0.5) * 1.1;
    const frontBow = 0.05 + r() * 0.22;
    const cellSc   = (0.10 + r() * 0.55) / zoom;               // lens-cell frequency (big blobs ↔ fine crinkle)
    const cellWarp = 0.2 + r() * 0.7;
    const cellOct  = 1 + Math.floor(r() * 4);                  // 1 (smooth lenses) … 4 (busy crinkle)
    const cellGain = 0.42 + r() * 0.22;
    const convSwirl= 3.0 + r() * 10.0;
    const convAmp  = 0.08 + r() * 0.22;
    const convFreq = (1.0 + r() * 2.2) * zoom;
    const layerN   = 1.2 + r() * 3.6;                          // strata count
    const layerWob = 0.3 + r() * 0.7;
    const layerTilt= (r() - 0.5) * 0.5;
    const phase    = r() * 100;                                // global noise phase offset
    const grainAmt = 4.0 + r() * 3.0;
    const mottleN  = 40 + Math.floor(r() * 50);
    const hazeAmt  = 0.11 + r() * 0.10;

    /* ── BACK-LIT FIELD ──
       Even charcoal ground with a gentle large-scale brightness lobe (the rig's
       illuminated aperture) placed near the focal point, darker toward edges. */
    {
      const cxg = W * (focX * 0.6 + 0.2 + (r() - 0.5) * 0.12);
      const cyg = H * (focY * 0.6 + 0.2 + (r() - 0.5) * 0.12);
      const apR = MN * (0.8 + r() * 0.5);
      const g = x.createRadialGradient(cxg, cyg, 0, cxg, cyg, apR);
      g.addColorStop(0, K.mix(pal.field, pal.silver, 0.10 + density * 0.10));
      g.addColorStop(0.55, pal.field);
      g.addColorStop(1, K.mix(pal.field, '#000', 0.55));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    /* wandering rise centerline for the plume component (folds as it ascends). */
    function plumeCenter(py) {
      const t = K.clamp((baseY - py) / H, 0, 1.3);
      const s = noise.fbm(t * 1.8 + 3.0 + phase, 11.0, 4, 0.5, 2.1);
      const s2 = nB.fbm(t * 4.0 + 1.0, 7.0 + phase, 3, 0.5, 2.1);
      return W * plumeX0 + plumeLean * t * MN * 0.16 + s * plumeW * 2.2 * t * foldAmp + s2 * plumeW * 0.9 * t;
    }

    /* rho — smooth scalar refractive density, ~[-1,1]-ish, built as a CONTINUOUS
       WEIGHTED MIXTURE of all five structural families. The focal envelope keeps
       most of the frame calm (designed negative space) and concentrates energy
       toward the focal point. zoom scales the sampling coordinates. */
    function rho(px, py) {
      // zoomed, focal-centred sampling coords
      const u = ((px / MN) - focX * (W / MN)) * zoom + focX * (W / MN);
      const v = ((py / MN) - focY * (H / MN)) * zoom + focY * (H / MN);
      let acc = 0;

      // PLUME — rising column that widens & ribbons
      if (mix.plume > 0.02) {
        const cx = plumeCenter(py);
        const t = K.clamp((baseY - py) / H, 0, 1.3);
        const wid = plumeW * (0.55 + t * 2.0);
        const d = (px - cx) / wid;
        const env = Math.exp(-d * d * 0.85) * K.clamp(t * 1.5, 0, 1) * Math.exp(-Math.max(0, t - 0.92) * 2.2);
        const ribbon = Math.sin((d * 1.6 + noise.fbm(t * 2.2 + 5.0 + phase, 9.0, 3) * 2.4 * foldAmp + t * 2.0) * Math.PI);
        const drift = noise.fbm(px / (plumeW * 3.4) + 17.0, py / (plumeW * 4.2) - t * 1.4, 3, 0.5, 2.0);
        acc += mix.plume * env * (0.9 + 0.55 * ribbon * t + 0.45 * drift);
      }

      // FRONTS — a few smooth standing shock fronts, gently bowed / tilted
      if (mix.front > 0.02) {
        const warp = noise.fbm(u * 1.0 + 5.0 + phase, v * 1.0, 4, 0.5, 2.1) * 0.5;
        let a = 0;
        for (let k = 0; k < frontN; k++) {
          const fy = (0.22 + 0.58 * (k + 0.5) / frontN);
          const bow = (u - focX) * (frontBow + 0.08 * noise.fbm(k * 3.1 + phase, 1.0, 2)) + (u - focX) * frontTilt * 0.2;
          const dd = (v - (fy + warp * 0.18) - bow) / (0.045 + 0.035 * k);
          a += Math.tanh(-dd) * Math.exp(-dd * dd * 0.12);
        }
        acc += mix.front * a * 0.8;
      }

      // CELLS — soft convex/concave refraction lenses
      if (mix.cell > 0.02) {
        const wx = u + noise.fbm(u * 1.6 + 4.0 + phase, v * 1.6, 4, 0.55, 2.0) * cellWarp;
        const wy = v + nB.fbm(u * 1.6, v * 1.6 + 4.0 + phase, 4, 0.55, 2.0) * cellWarp;
        const c = noise.fbm(wx / cellSc, wy / cellSc, cellOct, cellGain, 2.2);
        acc += mix.cell * c * 1.5;
      }

      // CONVECTION — overturning swirl advection
      if (mix.conv > 0.02) {
        const ang = nC.fbm(u * 0.9 + convSwirl, v * 0.9 + phase, 4, 0.55, 2.0) * Math.PI * 2.4;
        const sx = u + Math.cos(ang) * convAmp;
        const sy = v + Math.sin(ang) * convAmp;
        const f = noise.fbm(sx * convFreq * 0.6, sy * convFreq * 0.6 + 3.0, 5, 0.55, 2.0);
        acc += mix.conv * f * 1.5;
      }

      // LAYERS — thermal strata that wobble & decay with height
      if (mix.layer > 0.02) {
        const wob = nB.fbm(u * 1.1 + 2.0 + phase, v * 0.55, 4, 0.55, 2.0) * 0.6 * layerWob
                  + nC.fbm(u * 2.2, v * 1.1 + 6.0, 3, 0.5, 2.0) * 0.18;
        const hh = py / H;
        const decay = K.clamp((hh - 0.10) / 0.9, 0, 1);
        acc += mix.layer * Math.sin((v * (H / MN) + wob + layerTilt * u) * layerN * Math.PI) * decay * decay * 1.05;
      }

      // FOCAL ENVELOPE — concentrate energy, keep corners calm (negative space)
      const rx = (px / W) - focX, ry = (py / H) - focY;
      const rad2 = (rx * rx + ry * ry) * focTight;
      const fenv = (1 - density) * Math.exp(-rad2 * 3.0) + density * (0.5 + 0.5 * Math.exp(-rad2 * 1.4));
      return acc * fenv;
    }

    /* directional derivative of rho along the knife normal → schlieren signal. */
    const eps = MN * 0.0075;
    function signal(px, py) {
      const a = rho(px + kx * eps, py + ky * eps);
      const b = rho(px - kx * eps, py - ky * eps);
      return (a - b);
    }

    /* ── RASTERISE (continuous-tone, smooth) ── */
    const LW = Math.max(160, Math.round(W / 4));
    const LH = Math.max(160, Math.round(H / 4));
    const sx = W / LW, sy = H / LH;

    const buf = new Float32Array(LW * LH);
    let mx = 1e-6;
    for (let j = 0; j < LH; j++) {
      for (let i = 0; i < LW; i++) {
        const s = signal((i + 0.5) * sx, (j + 0.5) * sy);
        buf[j * LW + i] = s;
        const as = Math.abs(s); if (as > mx) mx = as;
      }
    }
    const norm = 1 / mx;
    const amp = 0.94;
    const gK = gain * 0.62;

    const silverC = K.h2r(pal.silver);
    const biasC = K.h2r(K.mix(pal.silver, pal.bias, 0.85));
    const graphiteC = K.h2r(pal.graphite);
    const fieldC = K.h2r(pal.field);

    const off = document.createElement('canvas');
    off.width = LW; off.height = LH;
    const ox = off.getContext('2d');
    const img = ox.createImageData(LW, LH);
    const D = img.data;
    for (let p = 0; p < LW * LH; p++) {
      const sn = buf[p] * norm * gK;
      const mag = Math.abs(sn);
      let a = (mag / (1 + mag)) * amp;
      a = a * a * (3 - 2 * a);
      let cr, cg, cb;
      if (sn >= 0) {
        const tb = Math.min(1, a * pal.biasAmt * 14);
        cr = silverC[0] + (biasC[0] - silverC[0]) * tb;
        cg = silverC[1] + (biasC[1] - silverC[1]) * tb;
        cb = silverC[2] + (biasC[2] - silverC[2]) * tb;
      } else {
        cr = graphiteC[0]; cg = graphiteC[1]; cb = graphiteC[2];
      }
      const k = p * 4;
      D[k]     = fieldC[0] + (cr - fieldC[0]) * a;
      D[k + 1] = fieldC[1] + (cg - fieldC[1]) * a;
      D[k + 2] = fieldC[2] + (cb - fieldC[2]) * a;
      D[k + 3] = 255;
    }
    ox.putImageData(img, 0, 0);

    x.save();
    x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
    x.globalCompositeOperation = 'multiply';
    x.globalAlpha = 0.55;
    x.drawImage(off, 0, 0, W, H);
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 0.9;
    x.drawImage(off, 0, 0, W, H);
    x.restore();
    x.globalAlpha = 1;

    /* ── KNIFE-EDGE RIM ──
       the signature thin specular thread where the gradient peaks. Drawn when
       the piece carries enough crisp structure (plume/front/conv lead), skipped
       for soft cell/layer-dominated pieces. */
    const rimOK = (mix.plume + mix.front + mix.conv) > (mix.cell + mix.layer) * 0.8;
    if (rimOK) {
      const rim = document.createElement('canvas');
      rim.width = LW; rim.height = LH;
      const rx = rim.getContext('2d');
      const rimg = rx.createImageData(LW, LH);
      const RD = rimg.data;
      const rimC = K.h2r(K.mix(pal.silver, '#ffffff', 0.5));
      for (let j = 1; j < LH - 1; j++) {
        for (let i = 1; i < LW - 1; i++) {
          const c = buf[j * LW + i] * norm;
          const up = buf[(j - 1) * LW + i] * norm, dn = buf[(j + 1) * LW + i] * norm;
          const lf = buf[j * LW + i - 1] * norm, rt = buf[j * LW + i + 1] * norm;
          let a = 0;
          if (c > 0.58 && c > up && c > dn && c >= lf && c >= rt) {
            a = K.clamp((c - 0.58) * 0.5, 0, 0.34);
          }
          const k = (j * LW + i) * 4;
          RD[k] = rimC[0]; RD[k + 1] = rimC[1]; RD[k + 2] = rimC[2];
          RD[k + 3] = (a * 255) | 0;
        }
      }
      rx.putImageData(rimg, 0, 0);
      x.save();
      x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high';
      x.globalCompositeOperation = 'lighter';
      x.globalAlpha = 0.7;
      x.drawImage(rim, 0, 0, W, H);
      x.restore();
      x.globalAlpha = 1;
    }

    /* ── ATMOSPHERE & TEXTURE ── */
    const hazeCol = K.mix(pal.field, pal.silver, warmGlass ? 0.22 : 0.18);
    K.hazeSheet(x, W, H, noise, hazeCol, hazeAmt, MN * (0.7 + r() * 0.35), 'screen');
    K.hazeSheet(x, W, H, nB, K.mix(pal.field, pal.bias, 0.5), hazeAmt * 0.45, MN * 0.5, 'screen');

    K.bloom(x, W * focX, H * focY, MN * (0.55 + r() * 0.3), K.mix(pal.silver, pal.bias, 0.3), warmGlass ? 0.05 : 0.04);

    K.mottle(x, 0, 0, W, H, K.mix(pal.field, pal.silver, 0.3), mottleN, r, 'overlay');
    K.grain(x, W, H, grainAmt, r);

    K.vignette(x, W, H, pal.pitch ? 0.5 : 0.36);

    return { aspect: W / H };
  }

  /* traits() — mirrors draw()'s rng draw ORDER exactly up to the point each
     trait is decided, so the labels match the rendered piece. */
  function traits(seed) {
    const r = K.rng(seed);
    const pal = makePal(r);            // consumes same draws as draw()
    const aspect = 0.74 + r() * 0.78;  // format draw (matches draw)
    const fmt = aspect > 1.18 ? 'Landscape' : aspect < 0.86 ? 'Portrait' : 'Square';
    const mix = structureMix(r);       // structure draws (matches draw)
    const leadName = { plume: 'Plume', front: 'Shockfront', cell: 'Lens Cells', conv: 'Convection', layer: 'Thermal Layers' }[mix._lead];
    const zoom = 0.62 + r() * 1.5;
    const density = Math.pow(r(), 0.85);
    const scale = zoom > 1.5 ? 'Macro' : zoom < 0.85 ? 'Wide' : 'Mid';
    const dens = density < 0.33 ? 'Minimal' : density > 0.66 ? 'Dense' : 'Balanced';
    const bias = pal.warm ? 'Warm' : (pal.name === 'Pewter' || pal.name === 'Mercury' ? 'Neutral' : 'Cool');
    return { Palette: pal.name, Structure: leadName, Format: fmt, Scale: scale, Density: dens, Bias: bias };
  }

  return { name: 'z_schlieren', draw, traits };
})();


export const schlierenTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderSchlieren: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const SCHLIEREN_ASPECTS: readonly number[] = [1.3,1,0.78];
export const schlierenSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Argentine",
        "Cold Steel",
        "Pewter",
        "Mercury",
        "Ember Ash",
        "Pitch"
      ]
    },
    {
      "name": "Structure",
      "values": [
        "Lens Cells",
        "Plume",
        "Convection",
        "Shockfront",
        "Thermal Layers"
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
        "Mid",
        "Macro",
        "Wide"
      ]
    },
    {
      "name": "Density",
      "values": [
        "Dense",
        "Balanced",
        "Minimal"
      ]
    },
    {
      "name": "Bias",
      "values": [
        "Cool",
        "Neutral",
        "Warm"
      ]
    }
  ]
};
