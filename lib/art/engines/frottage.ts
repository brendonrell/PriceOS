// @ts-nocheck
/*
 * Frottage — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/z_frottage.js). Continuous seed-driven composition. Deterministic
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


/* FROTTAGE — graphite rubbings of impossible reliefs.
 *
 * The act of frottage: lay paper over a relief, rub graphite across it; the
 * pencil only catches the high tooth — ridges, grains, mesh, edges — leaving
 * troughs as paper-white. Here the reliefs are IMPOSSIBLE: overlapping rubbed
 * PLATES, each catching a different surface (combed ridges, woven mesh, pitted
 * grain, faceted bosses, drift strata) that could not physically coexist,
 * layered into one relief with registration offsets, smudge and burnish.
 *
 * SURREAL = real-but-off: a true pencil-and-paper phenomenon (the tooth-catch
 * of graphite on a textured plate) made uncanny by stacking surfaces that can't
 * share a slab. Pure FIELD — no scene, no object.
 *
 * Palette world: GRAPHITE — paper white, silver-grey, graphite black, a faint
 * warm or cool undertone per seed. Restrained, hand-made monochrome.
 *
 * GENERATIVE, NOT TEMPLATED: there are no discrete "modes". Every piece mixes a
 * continuous RECIPE of surface families at continuous weights, with every count,
 * frequency, scale, rotation, pressure, contrast, focal geometry, density, zoom,
 * format and colour VALUE sampled from a range off the seed. No two seeds land
 * in the same bucket because there are no buckets.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palette ANCHORS inside the graphite world. Each is paper + a
     graphite ramp (lightest tooth → darkest burnish) + a faint undertone (warm
     pencil-shaving brown / cool steel). These are anchors, NOT the final colour:
     draw() jitters every value (lightness/undertone/temp/key) per seed so the
     world is continuous, never six fixed swatches. `temp` biases the undertone;
     `key` is overall darkness. Some are rare on purpose. */
  const PALS = [
    { name: 'Cartridge HB',  paper: '#e9e6df', tooth: '#b9b6b0', mid: '#7e7d7c', deep: '#34343a', burnish: '#181820', under: '#5b6472', temp: -0.18, key: 0.50, wt: 5 },
    { name: 'Newsprint 2B',  paper: '#e7e0d2', tooth: '#bdb4a2', mid: '#86796a', deep: '#3a342c', burnish: '#211c16', under: '#7a5f44', temp: 0.55, key: 0.52, wt: 4 },
    { name: 'Rag & Silver',  paper: '#efece6', tooth: '#c7c6c4', mid: '#8a8b8e', deep: '#2a2b32', burnish: '#101117', under: '#48566a', temp: -0.35, key: 0.55, wt: 4 },
    { name: 'Powder & Smoke', paper: '#cdc9c1', tooth: '#a09c95', mid: '#6c6863', deep: '#2b2926', burnish: '#0e0d0c', under: '#6a5a4c', temp: 0.25, key: 0.30, wt: 2 },
    { name: 'Silverpoint 6H', paper: '#ece9e2', tooth: '#cfccc5', mid: '#a8a6a3', deep: '#5f6066', burnish: '#3b3c44', under: '#566276', temp: -0.28, key: 0.70, wt: 2 },
    { name: 'Conté Carbon',  paper: '#e3dccb', tooth: '#b6a890', mid: '#7d6e58', deep: '#332a20', burnish: '#1b150e', under: '#8a6038', temp: 0.7, key: 0.44, wt: 3 },
  ];

  function pickPalAnchor(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    let tot = 0; for (const p of PALS) tot += p.wt;
    let v = r() * tot;
    for (const p of PALS) { v -= p.wt; if (v <= 0) return p; }
    return PALS[0];
  }

  /* shift a hex by hue(deg)/sat/light deltas — used to jitter palette VALUES so
     the colour-world is continuous, not six fixed swatches. */
  function jit(hex, dh, ds, dl) {
    const c = K.h2r(hex);
    // to hsl
    const rr = c[0] / 255, gg = c[1] / 255, bb = c[2] / 255;
    const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    if (mx !== mn) {
      const d = mx - mn;
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === rr) h = (gg - bb) / d + (gg < bb ? 6 : 0);
      else if (mx === gg) h = (bb - rr) / d + 2;
      else h = (rr - gg) / d + 4;
      h *= 60;
    }
    return K.hsl2hex(h + dh, K.clamp(s + ds, 0, 1), K.clamp(l + dl, 0, 1));
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const anchor = pickPalAnchor(r);

    /* ── CONTINUOUS PALETTE ──────────────────────────────────────────────
       Build the working palette by jittering the anchor's values per seed.
       Same anchor → still a different real colour every time. */
    const tempJit = (r() - 0.5) * 0.5;          // shove warm/cool
    const keyJit  = (r() - 0.5) * 0.30;          // overall lightness shove
    const hueJit  = (r() - 0.5) * 16;            // undertone hue wander (deg)
    const satJit  = (r() - 0.5) * 0.12;          // undertone saturation
    const lShift  = keyJit * 0.5;                // global value pull on the ramp
    const temp = K.clamp(anchor.temp + tempJit, -1, 1);
    const key  = K.clamp(anchor.key + keyJit, 0.18, 0.82);
    const pal = {
      name: anchor.name,
      paper:   jit(anchor.paper,   hueJit * 0.4, satJit * 0.3,  lShift * 0.4 + (key - anchor.key) * 0.18),
      tooth:   jit(anchor.tooth,   hueJit * 0.5, satJit * 0.4,  lShift * 0.6),
      mid:     jit(anchor.mid,     hueJit,       satJit,        lShift),
      deep:    jit(anchor.deep,    hueJit,       satJit,       -lShift * 0.5),
      burnish: jit(anchor.burnish, hueJit,       satJit * 0.6, -lShift * 0.3),
      under:   jit(anchor.under,   hueJit + tempJit * 22, satJit + Math.abs(tempJit) * 0.18, lShift * 0.3),
      temp, key,
    };
    const tintGain = 0.07 + Math.abs(temp) * 0.10; // continuous undertone strength

    /* shade graphite at intensity t in [0,1]: 0=paper, 1=burnish, tinted by the
       (continuous) undertone, strongest in the midtones. */
    function gph(t) {
      t = K.clamp(t, 0, 1);
      let c;
      if (t < 0.001) c = pal.paper;
      else if (t < 0.34) c = K.mix(pal.paper, pal.tooth, t / 0.34);
      else if (t < 0.62) c = K.mix(pal.tooth, pal.mid, (t - 0.34) / 0.28);
      else if (t < 0.85) c = K.mix(pal.mid, pal.deep, (t - 0.62) / 0.23);
      else c = K.mix(pal.deep, pal.burnish, (t - 0.85) / 0.15);
      const tintAmt = tintGain * Math.sin(Math.PI * t);
      return K.mix(c, pal.under, tintAmt);
    }

    /* ── FORMAT ── continuous aspect, not three fixed shapes. Long edge fixed,
       short edge swept continuously between strong portrait and strong
       landscape so crop/zoom reads differently every seed. */
    const LONG = 1180;
    const aspParam = r();                          // 0..1
    const ratio = 0.66 + aspParam * (1.52 - 0.66); // 0.66 (portrait) → 1.52 (landscape)
    let W, H;
    if (ratio >= 1) { W = LONG; H = Math.round(LONG / ratio); }
    else { H = LONG; W = Math.round(LONG * ratio); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const DIAG = Math.hypot(W, H);

    /* ── GLOBAL ZOOM / DENSITY ── hard per-seed levers.
       zoom scales every spatial frequency (close macro relief ↔ fine far field).
       density drives how full the sheet reads (near-empty minimal ↔ packed). */
    const zoom = Math.pow(2, (r() - 0.5) * 2.0);   // ~0.5×..2× spatial scale
    const FS = S * zoom;                            // feature scale unit
    const density = Math.pow(r(), 0.85);            // 0=minimal .. 1=packed (biased toward fuller)
    const minimal = density < 0.22;                 // near-empty composition this seed

    // ── PAPER GROUND ── slightly uneven sheet, faint tooth everywhere
    x.fillStyle = pal.paper; x.fillRect(0, 0, W, H);
    {
      const pn = K.makeNoise(seed * 13 + 5);
      x.save(); x.globalCompositeOperation = 'multiply';
      const step = Math.max(4, Math.floor(S / 150));
      const paperWander = 0.55 + r() * 0.6;
      for (let yy = 0; yy < H; yy += step) for (let xx = 0; xx < W; xx += step) {
        const n = (pn.fbm(xx / (S * paperWander), yy / (S * paperWander), 3, 0.55, 2) + 1) / 2;
        const a = 0.05 * n;
        x.fillStyle = K.rgba(K.mix(pal.tooth, pal.under, 0.3), a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
      x.restore();
    }

    // global rubbing direction (the hand's stroke axis)
    const rubAng = (-0.5 + r()) * Math.PI; // any stroke axis, continuous

    /* ── FOCAL COMPOSITION ── continuous, varied. The rubbed patch can be a
       single off-centre seat, a wide soft full-bleed, a corner-weighted sweep,
       or (rarely) two foci. Position, size, anisotropy, falloff, floor all
       sampled continuously, so the "where is the graphite" reads differently
       every seed. */
    const nFoci = r() < 0.22 ? 2 : 1;
    const foci = [];
    for (let i = 0; i < nFoci; i++) {
      // thirds-biased placement but free
      const fqx = 0.18 + r() * 0.64;
      const fqy = 0.18 + r() * 0.64;
      foci.push({
        fx: W * fqx, fy: H * fqy,
        asp: 0.4 + r() * 1.3,                 // anisotropy of the patch
        ang: rubAng + (r() - 0.5) * 1.4,      // patch axis (loosely follows stroke)
        reach: 0.85 + r() * 1.5,              // how far it spreads (zoom-out → fuller)
        soft: 0.9 + r() * 1.1,                // falloff softness
      });
    }
    // global spread: minimal seeds keep a tight seat; packed seeds flood the sheet
    const spread = minimal ? (0.5 + density) : (0.95 + density * 1.4);
    const floor = minimal ? 0.0 : (0.04 + density * 0.30); // ambient graphite floor
    const ceil = 1.05 + density * 0.35;
    const focN = K.makeNoise(seed * 23 + 4);
    const raggedAmt = 0.22 + r() * 0.30;
    function focalGain(px, py) {
      let g = floor;
      for (const f of foci) {
        let dx = (px - f.fx) / W, dy = (py - f.fy) / H;
        const u = dx * Math.cos(f.ang) + dy * Math.sin(f.ang);
        const v = -dx * Math.sin(f.ang) + dy * Math.cos(f.ang);
        const d = Math.sqrt(u * u + (v / f.asp) * (v / f.asp));
        const here = (f.reach * spread) - d * (1.7 / f.soft);
        if (here > g) g = here;
      }
      const edge = focN.fbm(px / (W * 0.28), py / (H * 0.28), 3, 0.55, 2) * raggedAmt;
      return K.clamp(g + edge, 0.0, ceil);
    }

    /* ── relief field builders (each an "impossible surface") ──
       All accept a freq/scale already in PIXELS so global zoom flows through. */
    function makeRidges(nseed, freq, shear, warpAmt) {
      const n = K.makeNoise(nseed);
      const sharp = 1.6 + (nseed % 7) * 0.12;
      return function (px, py) {
        const w = n.fbm(px / (FS * 0.7), py / (FS * 0.7), 3, 0.55, 2) * FS * warpAmt;
        const u = px * Math.cos(shear) + py * Math.sin(shear);
        const ridge = Math.sin((u + w) * freq);
        return Math.pow(ridge * 0.5 + 0.5, sharp);
      };
    }
    function makeMesh(nseed, freq, ang, skew) {
      const n = K.makeNoise(nseed);
      return function (px, py) {
        const w = n.fbm(px / (FS * 0.9), py / (FS * 0.9), 2, 0.5, 2) * FS * 0.1;
        const u = px * Math.cos(ang) + py * Math.sin(ang);
        const vv = -px * Math.sin(ang) + py * Math.cos(ang);
        const a = Math.abs(Math.sin((u + w) * freq));
        const b = Math.abs(Math.sin((vv + w) * freq * skew));
        return Math.pow(Math.max(a, b), 2.0) * 0.85 + a * b * 0.4;
      };
    }
    function makeGrain(nseed, scale, fineMul, microMul) {
      const n = K.makeNoise(nseed);
      const n2 = K.makeNoise(nseed * 3 + 7);
      const n3 = K.makeNoise(nseed * 5 + 13);
      return function (px, py) {
        const base = (n.fbm(px / scale, py / scale, 4, 0.6, 2.2) + 1) / 2;
        const fine = 1 - Math.abs(n2.fbm(px / (scale * fineMul), py / (scale * fineMul), 4, 0.55, 2.4));
        const micro = 1 - Math.abs(n3.fbm(px / (scale * microMul), py / (scale * microMul), 3, 0.5, 2.6));
        const tooth = Math.pow(fine, 2.0) * 0.7 + Math.pow(micro, 2.4) * 0.45;
        return K.clamp(tooth * (0.35 + base * 0.95), 0, 1);
      };
    }
    function makeBosses(nseed, cell, distort, facets) {
      const n = K.makeNoise(nseed);
      return function (px, py) {
        const w = n.fbm(px / (FS * 0.8), py / (FS * 0.8), 2, 0.5, 2) * cell * distort;
        const gx = ((px + w) / cell) % 1; const gy = ((py - w) / cell) % 1;
        const cx = (gx < 0 ? gx + 1 : gx) - 0.5;
        const cy = (gy < 0 ? gy + 1 : gy) - 0.5;
        const d = Math.abs(cx) + Math.abs(cy);
        const boss = K.clamp(1 - d * 2.1, 0, 1);
        const faceted = Math.round(boss * facets) / facets;
        return faceted * 0.9 + boss * 0.1;
      };
    }
    function makeContour(nseed, bands, warp) {
      const n = K.makeNoise(nseed);
      return function (px, py) {
        const h = n.fbm(px / (FS * warp), py / (FS * warp), 5, 0.55, 2.1);
        const band = (h + 1) / 2 * bands;
        const f = band - Math.floor(band);
        const line = Math.pow(1 - Math.abs(f - 0.5) * 2, 6);
        return K.clamp(line * 0.9 + (h + 1) / 2 * 0.18, 0, 1);
      };
    }

    /* a field FACTORY: build a random surface of a random family with all
       parameters continuous. Returns {field, kindWeight} where the kind is
       chosen by a continuous weight vector so families BLEND, never bucket. */
    function makeField(idx, big) {
      const k = r();
      const f0 = (0.018 + r() * 0.07) / zoom; // base spatial freq, zoom-aware
      if (k < 0.24) {
        return makeRidges(seed * (idx * 7 + 3) + 11, f0, rubAng + (r() - 0.5) * 2.4, 0.08 + r() * 0.22);
      } else if (k < 0.42) {
        return makeMesh(seed * (idx * 11 + 5) + 17, f0 * (1.0 + r() * 1.0), r() * Math.PI, 0.7 + r() * 0.9);
      } else if (k < 0.66) {
        return makeGrain(seed * (idx * 13 + 2) + 23, FS * (0.03 + r() * 0.07), 0.10 + r() * 0.12, 0.04 + r() * 0.05);
      } else if (k < 0.84) {
        return makeBosses(seed * (idx * 17 + 9) + 29, FS * (0.05 + r() * 0.09), 0.3 + r() * 0.5, K.rint(r, 3, 6));
      } else {
        return makeContour(seed * (idx * 19 + 4) + 31, K.rint(r, 6, 16), 0.35 + r() * 0.3);
      }
    }

    /* ── core: render ONE rubbed plate ── */
    function plate(opts) {
      const { field, offX, offY, pressure, toothScale, anis, blend, clip, contrast } = opts;
      x.save();
      x.globalCompositeOperation = blend || 'multiply';
      if (clip) { x.beginPath(); x.rect(clip[0], clip[1], clip[2], clip[3]); x.clip(); }
      const grid = Math.max(2, Math.floor(toothScale));
      const ca = Math.cos(rubAng), sa = Math.sin(rubAng);
      const jx = noise; // mark jitter source
      for (let py = -grid; py < H + grid; py += grid) {
        for (let px = -grid; px < W + grid; px += grid) {
          const sx = px + offX, sy = py + offY;
          let v = field(sx, sy);
          if (anis > 0) {
            const e = grid * 0.9;
            const vA = field(sx + ca * e, sy + sa * e);
            const grad = Math.abs(v - vA);
            v = v * (1 - anis) + grad * anis * 3.0;
          }
          v = Math.pow(K.clamp(v, 0, 1), contrast || 1.0);
          const fg = focalGain(px, py);
          let t = v * pressure * fg;
          t *= 0.74 + (jx.noise2(px * 0.21 + offX, py * 0.21 + offY) + 1) * 0.5 * 0.5;
          if (t < 0.03) continue;
          t = K.clamp(t, 0, 1);
          const a = K.clamp(t * 0.95, 0, 0.95);
          x.fillStyle = K.rgba(gph(t), a);
          const len = grid * (1.25 + t * 0.7);
          const wid = grid * (0.5 + t * 0.28);
          x.save();
          x.translate(px + jx.noise2(px * 0.5, py * 0.5 + 11) * grid * 0.4, py);
          x.rotate(rubAng);
          x.fillRect(-len / 2, -wid / 2, len, wid);
          x.restore();
        }
      }
      x.restore();
    }

    // clip rect for a "torn plate" band — continuous size/placement/orientation
    function bandClip() {
      if (r() < 0.5) {
        const w = W * (0.28 + r() * 0.42); const x0 = W * (r() * (1 - 0.28));
        return [x0, 0, Math.min(w, W - x0), H];
      } else {
        const h = H * (0.28 + r() * 0.42); const y0 = H * (r() * (1 - 0.28));
        return [0, y0, W, Math.min(h, H - y0)];
      }
    }

    /* ── COMPOSE ── a continuous stack of impossible plates. Plate COUNT, each
       plate's surface family, pressure, tooth scale, anisotropy, contrast,
       registration slip, and band-crop are all sampled per plate. Sometimes the
       same surface is slipped off-register (the ghosted-registration look) — but
       it emerges from the recipe, it is not a fixed mode. */
    const offMag = S * (0.03 + r() * 0.06);
    const off = () => (r() - 0.5) * offMag * 2;

    // plate count scales with density: minimal seeds get 1–2, packed get up to 5
    const nPlates = minimal ? K.rint(r, 1, 2) : K.rint(r, 2, 5);

    // chance this seed is a "registration" study: one surface, several slips
    const isReg = r() < 0.18;
    if (isReg) {
      const fld = makeField(0, true);
      const slips = K.rint(r, 2, 4);
      const baseP = 0.95 + r() * 0.2;
      const slipMag = S * (0.025 + r() * 0.05);
      const contrast0 = 1.0 + r() * 0.3;
      for (let i = 0; i < slips; i++) {
        const kk = i / (slips - 1 || 1);
        plate({
          field: fld,
          offX: (r() - 0.5) * slipMag * (i + 1),
          offY: (r() - 0.5) * slipMag * (i + 1),
          pressure: baseP * (1 - kk * (0.4 + r() * 0.25)),
          toothScale: Math.max(3, S / (210 + r() * 130)) / Math.sqrt(zoom),
          anis: 0.25 + r() * 0.45,
          blend: 'multiply',
          contrast: contrast0 + i * (0.1 + r() * 0.15),
        });
      }
    } else {
      for (let i = 0; i < nPlates; i++) {
        const lead = i === 0;
        const pressure = lead ? (0.85 + r() * 0.3) : (0.35 + r() * 0.55);
        const toothScale = Math.max(3, S / (200 + r() * 170)) / Math.sqrt(zoom);
        const anis = 0.15 + r() * 0.6;
        const contrast = 1.0 + r() * 0.6;
        // lead plate full sheet; some accents cropped to torn bands (kept
        // occasional so the rectangular seam stays a rare accent, not a default)
        const clip = (!lead && r() < 0.34) ? bandClip() : null;
        plate({
          field: makeField(i, lead),
          offX: off(), offY: off(),
          pressure, toothScale, anis,
          blend: 'multiply', contrast, clip,
        });
      }
    }

    /* ── BURNISH ── dense pressed-graphite anchor at a focus. Size, placement,
       density, darkness continuous; suppressed on minimal seeds so they stay
       airy. */
    if (!minimal || r() < 0.4) {
      const f0 = foci[0];
      const bcx = f0.fx + (r() - 0.5) * S * 0.12, bcy = f0.fy + (r() - 0.5) * S * 0.12;
      const br = S * (0.12 + r() * 0.20);
      const bAsp = 0.5 + r() * 1.1;
      K.softShadow(x, bcx, bcy, br * (1.4 + r() * 0.6), 0.08 + (1 - pal.key) * 0.22);
      x.save(); x.globalCompositeOperation = 'multiply';
      x.translate(bcx, bcy); x.rotate(rubAng);
      const bd = Math.floor(50 + r() * 90 * (0.4 + density));
      for (let i = 0; i < bd; i++) {
        const ang = r() * 6.283, rad = Math.pow(r(), 0.6) * br;
        const u = Math.cos(ang) * rad, v = Math.sin(ang) * rad * bAsp;
        const fall = 1 - rad / br;
        if (fall <= 0) continue;
        const a = (0.05 + r() * 0.09) * fall * (1.15 - pal.key * 0.5);
        x.fillStyle = K.rgba(K.mix(pal.deep, pal.burnish, 0.4 + r() * 0.6), a);
        const len = 3 + r() * 7;
        x.fillRect(u - len / 2, v, len, 1 + r() * 1.5);
      }
      x.restore();
    }

    /* ── ERASER LIFT ── graphite removed to reveal paper (negative space).
       Count, length, width, axis, placement continuous; sometimes several
       sweeps. */
    const nErase = r() < 0.3 ? 0 : K.rint(r, 1, 2);
    for (let e = 0; e < nErase; e++) {
      const ex = W * (0.12 + r() * 0.76), ey = H * (0.12 + r() * 0.76);
      const elen = S * (0.4 + r() * 0.7), ewid = S * (0.05 + r() * 0.09);
      const eAng = rubAng + (r() - 0.5) * 0.7;
      x.save();
      x.translate(ex, ey); x.rotate(eAng);
      const dabs = 22 + Math.floor(r() * 14);
      for (let i = 0; i < dabs; i++) {
        const tt = i / (dabs - 1) - 0.5;
        const px = tt * elen + (r() - 0.5) * ewid * 1.2;
        const py = (r() - 0.5) * ewid * 1.1;
        const fall = 1 - Math.abs(tt) * 1.6;
        if (fall <= 0) continue;
        const rr = ewid * (0.6 + r() * 0.7);
        const g = x.createRadialGradient(px, py, 0, px, py, rr);
        const a = 0.10 * fall;
        g.addColorStop(0, K.rgba(pal.paper, a));
        g.addColorStop(1, K.rgba(pal.paper, 0));
        x.fillStyle = g; x.fillRect(px - rr, py - rr, rr * 2, rr * 2);
      }
      x.restore();
    }

    // ── PAPER TOOTH TEXTURE over everything (the medium's own grain) ──
    K.mottle(x, 0, 0, W, H, K.mix(pal.tooth, pal.under, 0.25), 28 + Math.floor(r() * 10), r, 'overlay');
    {
      x.save(); x.globalCompositeOperation = 'multiply';
      const n = Math.floor(W * H / (1100 - density * 400));
      for (let i = 0; i < n; i++) {
        const sx2 = r() * W, sy2 = r() * H;
        const g = focalGain(sx2, sy2);
        if (r() > g * 0.7) continue;
        x.fillStyle = K.rgba(pal.deep, 0.04 + r() * 0.06);
        x.fillRect(sx2, sy2, 1, 1);
      }
      x.restore();
    }

    // ── ATMOSPHERE: graphite-dust haze + vignette grade ──
    const hazeCol = K.mix(pal.paper, pal.under, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.04 + r() * 0.03, FS * (0.7 + r() * 0.5), 'screen');
    K.grain(x, W, H, 4.0, r);
    K.vignette(x, W, H, 0.20 + (1 - pal.key) * 0.16 + r() * 0.06);

    return { aspect: W / H };
  }

  /* describe a seed without rendering — mirrors draw()'s rng draw order exactly
     up to the points it reports, so traits stay deterministic & truthful. */
  function traits(seed) {
    const r = K.rng(seed);
    const anchor = pickPalAnchor(r);
    // palette jitters (consume same rng order as draw)
    const tempJit = (r() - 0.5) * 0.5;
    const keyJit  = (r() - 0.5) * 0.30; r(); r(); r();    // hueJit, satJit, (lShift derived)
    const temp = K.clamp(anchor.temp + tempJit, -1, 1);
    const key = K.clamp(anchor.key + keyJit, 0.18, 0.82);
    // format
    const aspParam = r();
    const ratio = 0.66 + aspParam * (1.52 - 0.66);
    const fmt = ratio > 1.06 ? 'Landscape' : ratio < 0.94 ? 'Portrait' : 'Square';
    // zoom + density
    const zoom = Math.pow(2, (r() - 0.5) * 2.0);
    const density = Math.pow(r(), 0.85);
    const tone = temp > 0.2 ? 'Warm' : temp < -0.2 ? 'Cool' : 'Neutral';
    const scale = zoom > 1.35 ? 'Macro' : zoom < 0.75 ? 'Fine' : 'Mid';
    const fill = density < 0.22 ? 'Minimal' : density > 0.62 ? 'Packed' : 'Balanced';
    const lightness = key > 0.6 ? 'High-key' : key < 0.36 ? 'Low-key' : 'Mid-key';
    return { Palette: anchor.name, Tone: tone, Format: fmt, Scale: scale, Density: fill, Key: lightness };
  }

  return { name: 'z_frottage', draw, traits };
})();


export const frottageTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderFrottage: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const FROTTAGE_ASPECTS: readonly number[] = [1.3,1,0.78];
export const frottageSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Rag & Silver",
        "Conté Carbon",
        "Newsprint 2B",
        "Silverpoint 6H",
        "Cartridge HB",
        "Powder & Smoke"
      ]
    },
    {
      "name": "Tone",
      "values": [
        "Cool",
        "Warm",
        "Neutral"
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
      "name": "Scale",
      "values": [
        "Mid",
        "Macro",
        "Fine"
      ]
    },
    {
      "name": "Density",
      "values": [
        "Packed",
        "Minimal",
        "Balanced"
      ]
    },
    {
      "name": "Key",
      "values": [
        "Mid-key",
        "High-key",
        "Low-key"
      ]
    }
  ]
};
