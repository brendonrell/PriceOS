// @ts-nocheck
/*
 * Patina — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/z_patina.js). Continuous seed-driven composition. Deterministic
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


/* PATINA — a corroded, oxidized metal crust seen flat-on.
 * Verdigris creep, rust blooms, mineral scale, pitting and tarnish maps across an
 * aged MATTE plate (never shiny, never liquid chrome). The corrosion organizes
 * itself — faint impossible figures emerge from the oxidation, as if the rot had
 * intent. Pure abstract field/surface: no scene, no horizon, no object.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded.
 *
 * ── DESIGN NOTE (why this is a SYSTEM, not a template picker) ────────────────
 * Earlier this engine chose from a small set of discrete MODES × 6 fixed PALETTES,
 * so two seeds landing the same mode+palette came out near-identical — trait
 * assembly, not generative art. This version removes that failure at the root:
 *   • COLOUR is sampled CONTINUOUSLY. The 6 named worlds are hue/sat/light ANCHORS;
 *     every seed jitters H/S/L of every swatch within the oxidized world, so even
 *     the same world never repeats an exact colour.
 *   • STRUCTURE is governed by INDEPENDENT continuous axes (zoom, coverage,
 *     placement, asymmetry, mass-count, focal scale, drip/vein/island density…),
 *     each from its own rng draw — there is no single "mode" that collapses a
 *     seed into one of N looks. The mode-flavour structural passes still exist,
 *     but they are layered ON TOP of a composition that is already continuously
 *     varied, and each pass randomises its own sub-elements.
 * Net: the visual space is a continuum, not N×M buckets — collisions can't happen.   */
const ENGINE = (function () {
  const K = KIT;

  /* ── 6 oxidized-world ANCHORS, expressed in HSL so we can jitter continuously ──
     Each anchor is the CENTRE of a colour neighbourhood; per-seed we sample a
     fresh palette inside it. base = bare aged plate, hi = worn metal catch,
     verd = verdigris, rust = iron-oxide, bloom = efflorescence accent,
     scale = mineral crust, ink = deepest pitting. vWeight = verd↔rust bias. */
  const ANCHORS = [
    { name: 'Verdigris Creep', baseH: 120, baseS: 0.10, baseL: 0.24, verdH: 150, rustH: 18,  hiH: 56,  bloomH: 110, vWeight: 0.64 },
    { name: 'Oxblood Iron',    baseH: 24,  baseS: 0.18, baseL: 0.19, verdH: 150, rustH: 14,  hiH: 38,  bloomH: 26,  vWeight: 0.28 },
    { name: 'Tarnished Brass', baseH: 48,  baseS: 0.26, baseL: 0.21, verdH: 130, rustH: 24,  hiH: 44,  bloomH: 46,  vWeight: 0.42 },
    { name: 'Copper Bloom',    baseH: 28,  baseS: 0.18, baseL: 0.18, verdH: 158, rustH: 12,  hiH: 26,  bloomH: 28,  vWeight: 0.48 },
    { name: 'Sea Patina',      baseH: 168, baseS: 0.13, baseL: 0.20, verdH: 162, rustH: 16,  hiH: 110, bloomH: 132, vWeight: 0.72 },
    { name: 'Iron Scale',      baseH: 30,  baseS: 0.05, baseL: 0.20, verdH: 150, rustH: 14,  hiH: 40,  bloomH: 44,  vWeight: 0.32 },
  ];

  /* MODES are now FLAVOURS layered on a continuously-varied base, not the whole
     composition. They bias structure; they no longer determine the look alone. */
  const MODES = ['Continental', 'Archipelago', 'Drip Front', 'Pitting', 'Ridge Vein', 'Eclipse', 'Tide Line', 'Macro Crust'];

  // smoothstep
  function ss(a, b, t) { t = K.clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  // symmetric jitter in [-m,m]
  function jit(r, m) { return (r() * 2 - 1) * m; }

  /* Build a continuous palette inside the chosen world. Every channel jittered. */
  function buildPal(anchor, r) {
    const hsl = K.hsl2hex;
    // global per-seed shifts so a whole palette leans warmer/cooler/lighter
    const hShift = jit(r, 12);            // overall hue drift of the world
    const lShift = jit(r, 0.05);          // overall lightness drift
    const sMul = 0.80 + r() * 0.45;       // overall saturation multiplier
    const J = (v) => v;                   // identity (readability)
    const base = hsl(anchor.baseH + hShift + jit(r, 8), K.clamp((anchor.baseS + jit(r, 0.05)) * sMul, 0.03, 0.4), K.clamp(anchor.baseL + lShift + jit(r, 0.03), 0.12, 0.32));
    const ink  = hsl(anchor.baseH + hShift + jit(r, 10), K.clamp(anchor.baseS * 0.8 * sMul, 0.02, 0.3), K.clamp(0.06 + lShift * 0.5 + jit(r, 0.015), 0.03, 0.11));
    const hi   = hsl(anchor.hiH + hShift + jit(r, 14), K.clamp((0.34 + jit(r, 0.10)) * sMul, 0.12, 0.6), K.clamp(0.50 + lShift + jit(r, 0.07), 0.34, 0.66));
    const verd = hsl(anchor.verdH + hShift * 0.4 + jit(r, 14), K.clamp((0.34 + jit(r, 0.12)) * sMul, 0.16, 0.6), K.clamp(0.42 + jit(r, 0.08), 0.28, 0.56));
    const rust = hsl(anchor.rustH + hShift * 0.4 + jit(r, 12), K.clamp((0.52 + jit(r, 0.12)) * sMul, 0.28, 0.74), K.clamp(0.42 + jit(r, 0.07), 0.30, 0.54));
    const bloom = hsl(anchor.bloomH + hShift * 0.4 + jit(r, 16), K.clamp((0.42 + jit(r, 0.14)) * sMul, 0.2, 0.7), K.clamp(0.66 + jit(r, 0.08), 0.5, 0.8));
    const scale = hsl(anchor.baseH + hShift + jit(r, 18), K.clamp((0.08 + jit(r, 0.05)) * sMul, 0.02, 0.22), K.clamp(0.46 + jit(r, 0.08), 0.34, 0.6));
    // vWeight also jitters so verd/rust dominance varies within a world
    const vWeight = K.clamp(anchor.vWeight + jit(r, 0.18), 0.12, 0.88);
    return { name: anchor.name, base, hi, verd, rust, bloom, scale, ink, vWeight };
  }

  function pickAnchor(r) {
    if (undefined) { const a = ANCHORS.find((p) => p.name === undefined); if (a) return a; }
    return K.pick(ANCHORS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const noise2 = K.makeNoise(seed * 13 + 5);

    // ── COLOUR: continuous sample inside a world (the cure for colour-twins) ───
    const anchor = pickAnchor(r);
    const pal = buildPal(anchor, r);

    // ── MODE flavour (consumes one draw; mirrored in traits) ───────────────────
    const mode = K.pick(MODES, r);

    // ── FORMAT: continuous aspect, not 3 fixed buckets ─────────────────────────
    // aspect ∈ ~[0.72 .. 1.40], long edge fixed; biases independent of mode.
    const aspect = 0.74 + r() * 0.66;
    const LONG = 1240;
    let W, H;
    if (aspect >= 1) { W = LONG; H = Math.round(LONG / aspect); }
    else { H = LONG; W = Math.round(LONG * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── GLOBAL CONTINUOUS AXES — each its OWN draw, de-correlated from mode ─────
    // ZOOM: wide/zoomed-out (small features, lots of plate) ↔ tight macro.
    // Continuous across the full range; modes only NUDGE it.
    let zoom = 0.45 + Math.pow(r(), 1.15) * 1.55;   // ~0.45 .. 2.0, biased low-mid
    if (mode === 'Macro Crust') zoom = Math.max(zoom, 1.45 + r() * 0.6);
    if (mode === 'Archipelago') zoom = Math.min(zoom, 0.5 + r() * 0.55);
    const featScale = 1 / zoom;

    // COVERAGE: minimal ↔ packed. Independent continuous draw. Floor kept high
    // enough that even the sparsest seed carries a real focal mass (gallery-grade).
    let coverage = 0.36 + Math.pow(r(), 0.92) * 0.58;  // ~0.36 .. 0.94
    if (mode === 'Macro Crust') coverage = Math.max(coverage, 0.78 + r() * 0.2);
    if (mode === 'Archipelago') coverage = Math.min(coverage, 0.18 + r() * 0.42);
    if (mode === 'Eclipse') coverage = K.clamp(coverage, 0.42, 0.82);
    // affinity gate shifts with coverage: low coverage = higher threshold (sparser).
    const affGate = K.clamp(0.36 - coverage * 0.32, 0.04, 0.32);
    const growLo = K.clamp(0.32 - coverage * 0.24, 0.04, 0.30);

    // ── 1. BARE METAL PLATE — matte base with a slow value gradient (chiaroscuro) ──
    const lightAng = r() * Math.PI * 2;
    const lightThrow = 0.22 + r() * 0.24;          // how far off-centre the light sits
    const lcx = W * 0.5 + Math.cos(lightAng) * W * lightThrow;
    const lcy = H * 0.5 + Math.sin(lightAng) * H * lightThrow;
    const plateContrast = 0.55 + r() * 0.4;         // how dramatic the plate gradient is
    {
      const g = x.createRadialGradient(lcx, lcy, 0, lcx, lcy, S * (1.05 + r() * 0.5));
      g.addColorStop(0, K.mix(pal.base, pal.hi, 0.22 + r() * 0.18));
      g.addColorStop(0.5, pal.base);
      g.addColorStop(1, K.mix(pal.base, pal.ink, 0.5 + plateContrast * 0.4));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    // Coarse rolled-metal value mottling — slow fbm in plate luminance.
    {
      const step = Math.max(4, Math.floor(S / 150));
      const mottleAmt = 0.30 + r() * 0.30;
      x.save(); x.globalCompositeOperation = 'soft-light';
      for (let yy = -step; yy < H + step; yy += step) {
        for (let xx = -step; xx < W + step; xx += step) {
          const n = noise.fbm(xx / (S * 0.55 * featScale), yy / (S * 0.55 * featScale), 4, 0.55, 2.0);
          const v = n;
          const c = v > 0 ? K.mix(pal.base, pal.hi, K.clamp(v * 0.9, 0, 1))
                          : K.mix(pal.base, pal.ink, K.clamp(-v * 0.9, 0, 1));
          x.fillStyle = K.rgba(c, mottleAmt);
          x.fillRect(xx - step, yy - step, step * 3, step * 3);
        }
      }
      x.restore();
    }

    // ── 2. THE UNCANNY FIELD: hidden "figure" wells the corrosion obeys ────────
    // PLACEMENT is now a continuous anchor + spread, not a discrete archetype that
    // hard-locks the composition. Mode nudges; the seed decides freely.
    // Continuous focal anchor anywhere in a generous interior+edge band.
    let ax = 0.14 + r() * 0.72;
    let ay = 0.14 + r() * 0.72;
    // independent asymmetry: how lopsided the mass distribution is
    const asym = r();
    // composition family from a continuous roll, mode-biased, but soft.
    let comp; { const cr = r();
      if (mode === 'Tide Line') comp = 'band';
      else if (mode === 'Archipelago') comp = 'scatter';
      else if (mode === 'Eclipse') comp = 'center';
      else if (mode === 'Macro Crust') comp = cr < 0.6 ? 'overflow' : 'edge';
      else if (cr < 0.30) comp = 'scatter';
      else if (cr < 0.50) comp = 'edge';
      else if (cr < 0.66) comp = 'overflow';
      else comp = 'free';
    }
    if (comp === 'center') { ax = 0.5 + jit(r, 0.06); ay = 0.5 + jit(r, 0.06); }
    if (comp === 'band') { ax = 0.5; ay = 0.24 + r() * 0.52; }
    if (comp === 'overflow') { ax = 0.5 + jit(r, 0.22); ay = 0.5 + jit(r, 0.22); }

    // number of wells: continuous, driven by coverage + scatter, plus jitter.
    let nWells;
    if (comp === 'scatter') nWells = 4 + (r() * 9 | 0);
    else if (mode === 'Pitting') nWells = 3 + (r() * 4 | 0);
    else if (comp === 'overflow') nWells = 1 + (r() * 3 | 0);
    else nWells = 2 + (r() * 4 | 0);

    const wells = [];
    const baseSpread = (comp === 'overflow' ? 0.12 : comp === 'free' ? 0.34 : 0.26) / (0.7 + zoom * 0.5);
    for (let i = 0; i < nWells; i++) {
      let wx, wy, wrad;
      if (comp === 'scatter') {
        wx = 0.06 + r() * 0.88; wy = 0.06 + r() * 0.88;
        wrad = S * (0.05 + r() * 0.20) * (0.6 + 0.6 * zoom);
      } else if (comp === 'band') {
        wx = r(); wy = ay + (r() - 0.5) * (0.12 + r() * 0.16);
        wrad = S * (0.12 + r() * 0.24) * zoom;
      } else {
        // cluster around the anchor; asym stretches the cluster on one axis.
        const sx = baseSpread * (0.6 + asym * 1.2);
        const sy = baseSpread * (1.6 - asym * 1.2);
        wx = ax + jit(r, sx);
        wy = ay + jit(r, sy);
        wrad = S * (0.13 + r() * 0.34) * zoom;
      }
      wells.push({
        x: W * K.clamp(wx, -0.05, 1.05),
        y: H * K.clamp(wy, -0.05, 1.05),
        rad: wrad,
        warp: 0.4 + r() * 1.7,
        sign: r() < 0.82 ? 1 : -1,
      });
    }

    // focal well — strongest, ALWAYS positive; size tracks zoom AND coverage so a
    // minimal seed isn't forced into a giant blob and a packed one isn't starved.
    const focal = wells[0];
    focal.sign = 1;
    const focalMin = (comp === 'scatter')
      ? S * (0.12 + coverage * 0.12)
      : S * (0.18 + r() * 0.18) * zoom * (0.7 + coverage * 0.5);
    focal.rad = Math.max(focal.rad, focalMin);
    if (mode === 'Eclipse') focal.rad = S * (0.28 + r() * 0.2) * zoom;
    if (mode === 'Macro Crust') focal.rad = S * (0.55 + r() * 0.45) * zoom;

    const warpScale = S * 0.30 * featScale;
    const warpAmt = 0.10 + r() * 0.14;            // how gnarled the crust edges are
    function affinity(px, py) {
      let a = 0;
      const wx = noise2.fbm(px / warpScale, py / warpScale, 4, 0.55, 2.1);
      const wy = noise2.fbm((px + 311) / warpScale, (py + 137) / warpScale, 4, 0.55, 2.1);
      for (const w of wells) {
        const dx = (px - w.x) + wx * S * warpAmt * w.warp;
        const dy = (py - w.y) + wy * S * warpAmt * w.warp;
        const d = Math.sqrt(dx * dx + dy * dy);
        const f = 1 - ss(w.rad * 0.2, w.rad, d);
        a += w.sign * f;
      }
      return K.clamp(a, 0, 1);
    }

    // ── 3. OXIDATION LAYERS ────────────────────────────────────────────────────
    const tile = Math.max(3, Math.floor(S / 300));
    const jitT = tile * 0.6;
    const crustScale = S * (0.10 + r() * 0.09) * featScale;   // patch size varies
    const selScale = S * (0.16 + r() * 0.12) * featScale;     // verd/rust patch size varies

    // pass A — broad oxide bed.
    {
      x.save();
      for (let yy = 0; yy < H; yy += tile) {
        for (let xx = 0; xx < W; xx += tile) {
          const aff = affinity(xx, yy);
          if (aff < affGate) continue;
          const cN = noise.fbm(xx / crustScale, yy / crustScale, 5, 0.55, 2.2);
          const grow = ss(growLo, 0.60, aff + cN * 0.30);
          if (grow < 0.02) continue;
          const sel = (noise2.fbm(xx / selScale, yy / selScale, 4, 0.5, 2.0) + 1) / 2;
          const isVerd = sel < pal.vWeight;
          let ox = isVerd ? pal.verd : pal.rust;
          const thick = ss(0.10, 0.95, aff) * (0.5 + (cN + 1) / 2 * 0.5);
          const col = K.mix(K.mix(ox, pal.ink, 0.50), K.mix(ox, pal.bloom, 0.10), thick);
          x.fillStyle = K.rgba(col, K.clamp(grow * 0.82, 0, 0.88));
          const px = xx + (noise2.noise2(xx * 0.3, yy * 0.3)) * jitT;
          const py = yy + (noise.noise2(xx * 0.3, yy * 0.3)) * jitT;
          x.fillRect(px, py, tile + 1.4, tile + 1.4);
        }
      }
      x.restore();
    }

    // pass A2 — DARK TROUGHS.
    {
      x.save(); x.globalCompositeOperation = 'multiply';
      const trScale = S * (0.07 + r() * 0.05) * featScale;
      const trGate = Math.max(0.14, affGate + 0.06);
      const trAmt = 0.42 + r() * 0.25;
      for (let yy = 0; yy < H; yy += tile) {
        for (let xx = 0; xx < W; xx += tile) {
          const aff = affinity(xx, yy);
          if (aff < trGate) continue;
          const tN = noise2.fbm(xx / trScale, yy / trScale, 5, 0.6, 2.3);
          const trough = ss(0.0, 0.7, -tN) * ss(trGate, 0.6, aff);
          if (trough < 0.04) continue;
          x.fillStyle = K.rgba(pal.ink, K.clamp(trough * trAmt, 0, 0.6));
          const px = xx + (noise.noise2(xx * 0.4, yy * 0.4)) * jitT;
          const py = yy + (noise2.noise2(xx * 0.4, yy * 0.4)) * jitT;
          x.fillRect(px, py, tile + 1.4, tile + 1.4);
        }
      }
      x.restore();
    }

    // pass B — bloom / efflorescence (rare bright catches).
    {
      x.save(); x.globalCompositeOperation = 'screen';
      const bScale = S * (0.035 + r() * 0.03) * featScale;
      const bloomAmt = 0.18 + r() * 0.16;
      for (let yy = 0; yy < H; yy += tile) {
        for (let xx = 0; xx < W; xx += tile) {
          const aff = affinity(xx, yy);
          const hf = noise.fbm(xx / bScale, yy / bScale, 5, 0.6, 2.3);
          const crest = ss(0.62, 0.97, aff) * ss(0.55, 0.9, (hf + 1) / 2);
          if (crest < 0.06) continue;
          x.fillStyle = K.rgba(pal.bloom, K.clamp(crest * bloomAmt, 0, 0.32));
          const px = xx + (noise2.noise2(xx * 0.3, yy * 0.3)) * jitT;
          const py = yy + (noise.noise2(xx * 0.3, yy * 0.3)) * jitT;
          x.fillRect(px, py, tile + 1.4, tile + 1.4);
        }
      }
      x.restore();
    }

    // pass C — grey mineral scale fringe.
    {
      x.save(); x.globalCompositeOperation = 'soft-light';
      const rScale = S * (0.03 + r() * 0.03) * featScale;
      const rimLo = affGate, rimMid = Math.max(0.28, affGate + 0.12);
      const rimAmt = 0.5 + r() * 0.25;
      for (let yy = 0; yy < H; yy += tile) {
        for (let xx = 0; xx < W; xx += tile) {
          const aff = affinity(xx, yy);
          const rim = ss(rimLo, rimMid, aff) * (1 - ss(0.48, 0.72, aff));
          const sn = noise2.fbm(xx / rScale, yy / rScale, 4, 0.6, 2.4);
          if (rim < 0.05) continue;
          const c = sn > 0 ? K.mix(pal.scale, '#ffffff', 0.18) : pal.ink;
          x.fillStyle = K.rgba(c, K.clamp(rim * rimAmt, 0, 0.65));
          const px = xx + (noise2.noise2(xx * 0.5, yy * 0.5)) * jitT;
          const py = yy + (noise.noise2(xx * 0.5, yy * 0.5)) * jitT;
          x.fillRect(px, py, tile + 1.4, tile + 1.4);
        }
      }
      x.restore();
    }

    // ── 4. MODE-FLAVOUR STRUCTURE — layered on the varied base; each randomises ──
    if (mode === 'Drip Front') {
      x.save();
      const nDrip = (50 + (r() * 100 | 0)) * (0.5 + coverage);
      const dripDir = r() < 0.12 ? -1 : 1;          // rarely, an upward weep
      for (let i = 0; i < nDrip; i++) {
        let px = r() * W;
        let py = H * (0.04 + r() * 0.6);
        const aff0 = affinity(px, py);
        if (aff0 < 0.25) continue;
        const isVerd = r() < pal.vWeight;
        const col = isVerd ? pal.verd : pal.rust;
        const len = 36 + r() * (H * 0.55) * aff0;
        const w0 = (0.8 + r() * 2.4) * (S / 720) * (0.7 + zoom * 0.5);
        let yrun = 0;
        x.globalCompositeOperation = 'multiply';
        while (yrun < len && py < H && py > -10) {
          const wob = noise.fbm(px / (S * 0.08), py / (S * 0.20), 3, 0.5, 2) * (S * 0.012);
          px += wob; py += (2 + r() * 2.5) * dripDir;
          yrun += 2.5;
          const aff = affinity(px, py);
          const t = yrun / len;
          const wid = w0 * (1 - t * 0.7);
          const a = (0.06 + 0.10 * aff) * (1 - t);
          if (a < 0.012) continue;
          x.fillStyle = K.rgba(K.mix(col, pal.ink, 0.30), a);
          x.beginPath(); x.arc(px, py, wid, 0, 7); x.fill();
        }
        x.fillStyle = K.rgba(K.mix(col, pal.ink, 0.45), 0.16);
        x.beginPath(); x.arc(px, K.clamp(py, 2, H - 2), w0 * 1.3, 0, 7); x.fill();
      }
      x.restore();
    } else if (mode === 'Ridge Vein') {
      x.save();
      const nVein = (40 + (r() * 70 | 0)) * (0.5 + coverage);
      const vStep = (18 + r() * 14) * (0.6 + zoom * 0.6);
      const curlStr = 0.9 + r() * 0.8;
      let placed = 0, tries = 0;
      while (placed < nVein && tries < nVein * 8) {
        tries++;
        let px = r() * W, py = r() * H;
        if (affinity(px, py) < 0.14) continue;
        placed++;
        const pts = [[px, py]];
        const steps = 40 + (r() * 80 | 0);
        for (let s = 0; s < steps; s++) {
          const v = K.curl(noise, px, py, curlStr);
          px += v[0] * vStep; py += v[1] * vStep;
          if (px < -20 || px > W + 20 || py < -20 || py > H + 20) break;
          pts.push([px, py]);
        }
        const aff = affinity(pts[pts.length - 1][0], pts[pts.length - 1][1]);
        const lw = (0.7 + r() * 1.8) * (0.7 + zoom * 0.5);
        x.globalCompositeOperation = 'multiply';
        x.strokeStyle = K.rgba(pal.ink, 0.22 + aff * 0.18);
        x.lineWidth = lw * 1.6; x.lineCap = 'round';
        x.beginPath(); x.moveTo(pts[0][0] + 1.2, pts[0][1] + 1.2);
        for (const p of pts) x.lineTo(p[0] + 1.2, p[1] + 1.2);
        x.stroke();
        x.globalCompositeOperation = 'screen';
        x.strokeStyle = K.rgba(K.mix(pal.scale, pal.bloom, 0.6), 0.20 + aff * 0.34);
        x.lineWidth = lw;
        x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) x.lineTo(p[0], p[1]);
        x.stroke();
      }
      x.restore();
    } else if (mode === 'Eclipse') {
      x.save(); x.globalCompositeOperation = 'multiply';
      const voidR = 0.55 + r() * 0.22;
      const g = x.createRadialGradient(focal.x, focal.y, focal.rad * (0.12 + r() * 0.16), focal.x, focal.y, focal.rad * voidR);
      g.addColorStop(0, K.rgba(pal.ink, 0.85));
      g.addColorStop(0.7, K.rgba(pal.ink, 0.4));
      g.addColorStop(1, K.rgba(pal.ink, 0));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.restore();
      // bloom rim on the void edge — only sometimes, and a broken partial arc, so
      // two Eclipse seeds never share the same clean signature ring.
      if (r() < 0.6) {
        x.save(); x.globalCompositeOperation = 'lighter';
        x.strokeStyle = K.rgba(pal.bloom, 0.12 + r() * 0.12);
        x.lineWidth = S * (0.003 + r() * 0.004);
        const a0 = r() * 7, sweep = 1.6 + r() * 4.2;
        x.beginPath(); x.arc(focal.x, focal.y, focal.rad * (voidR - 0.03), a0, a0 + sweep); x.stroke();
        x.restore();
      }
    } else if (mode === 'Archipelago') {
      x.save();
      const nIs = 12 + (r() * 26 | 0);
      for (let i = 0; i < nIs; i++) {
        const bx = W * (0.05 + r() * 0.9), by = H * (0.05 + r() * 0.9);
        const aff = affinity(bx, by);
        if (aff < 0.06 && r() < 0.6) continue;
        const rad = S * (0.015 + r() * 0.07) * (0.6 + zoom);
        const isVerd = r() < pal.vWeight;
        const col = isVerd ? pal.verd : pal.rust;
        x.globalCompositeOperation = 'multiply';
        const g = x.createRadialGradient(bx, by, 0, bx, by, rad);
        g.addColorStop(0, K.rgba(K.mix(col, pal.ink, 0.25), 0.5));
        g.addColorStop(0.7, K.rgba(K.mix(col, pal.ink, 0.45), 0.28));
        g.addColorStop(1, K.rgba(col, 0));
        x.fillStyle = g; x.beginPath(); x.arc(bx, by, rad, 0, 7); x.fill();
        if (r() < 0.4) {
          x.globalCompositeOperation = 'screen';
          x.fillStyle = K.rgba(pal.bloom, 0.16);
          x.beginPath(); x.arc(bx + (r() - 0.5) * rad, by + (r() - 0.5) * rad, rad * 0.35, 0, 7); x.fill();
        }
      }
      x.restore();
    } else if (mode === 'Tide Line') {
      x.save();
      const baseY = focal.y;
      const bandH = S * (0.10 + r() * 0.22);
      x.globalCompositeOperation = 'multiply';
      const nStreak = 70 + (r() * 100 | 0);
      for (let i = 0; i < nStreak; i++) {
        const sx = r() * W;
        const sy = baseY + (noise.fbm(sx / (S * 0.4), 3.1, 3, 0.5, 2) * bandH * 0.6);
        const dropLen = (10 + r() * bandH * 1.2);
        const col = r() < pal.vWeight ? pal.verd : pal.rust;
        const w0 = (0.6 + r() * 1.6) * (S / 720);
        for (let t = 0; t < dropLen; t += 2.5) {
          const a = 0.05 + 0.08 * (1 - t / dropLen);
          x.fillStyle = K.rgba(K.mix(col, pal.ink, 0.35), a);
          x.beginPath(); x.arc(sx + noise2.noise2(sx * 0.2, (sy + t) * 0.2) * 3, sy + t, w0 * (1 - t / dropLen * 0.6), 0, 7); x.fill();
        }
      }
      x.globalCompositeOperation = 'screen';
      for (let i = 0; i < 60; i++) {
        const sx = r() * W;
        const sy = baseY - (4 + r() * bandH * 0.4) + noise.fbm(sx / (S * 0.4), 7.7, 3, 0.5, 2) * bandH * 0.4;
        x.fillStyle = K.rgba(K.mix(pal.scale, pal.bloom, 0.5), 0.10);
        x.beginPath(); x.arc(sx, sy, (0.8 + r() * 2) * (S / 720), 0, 7); x.fill();
      }
      x.restore();
    } else if (mode === 'Macro Crust') {
      x.save();
      x.globalCompositeOperation = 'multiply';
      const nCrack = 8 + (r() * 18 | 0);
      const crackStep = 30 + r() * 24;
      for (let i = 0; i < nCrack; i++) {
        let px = r() * W, py = r() * H;
        const pts = [[px, py]];
        const steps = 24 + (r() * 50 | 0);
        for (let s = 0; s < steps; s++) {
          const v = K.curl(noise2, px, py, 1.2 + r() * 0.6);
          px += v[0] * crackStep; py += v[1] * crackStep;
          if (px < -30 || px > W + 30 || py < -30 || py > H + 30) break;
          pts.push([px, py]);
        }
        x.strokeStyle = K.rgba(pal.ink, 0.22 + r() * 0.12);
        x.lineWidth = (1.6 + r() * 4) * (S / 720); x.lineCap = 'round';
        x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) x.lineTo(p[0], p[1]);
        x.stroke();
      }
      x.restore();
    }
    // 'Continental' & 'Pitting' ride the base oxide passes + pitting below.

    // ── 5. PITTING — eaten-metal texture, density continuous ───────────────────
    {
      const heavy = mode === 'Pitting';
      const pitDens = (heavy ? 380 : 900) * (1.0 + jit(r, 0.25));
      const nPit = Math.floor(W * H / pitDens * (0.4 + coverage * 0.9));
      const pitScale = (0.7 + zoom * 0.6) * (0.8 + r() * 0.4);
      x.save();
      for (let i = 0; i < nPit; i++) {
        const px = r() * W, py = r() * H;
        const aff = affinity(px, py);
        if (r() > 0.12 + aff * 0.8) continue;
        const rad = (0.5 + r() * (heavy ? 3.4 : 2.2)) * (S / 720) * pitScale;
        const deep = r() < 0.6;
        x.globalCompositeOperation = deep ? 'multiply' : 'screen';
        x.fillStyle = deep ? K.rgba(pal.ink, 0.45 + r() * 0.4) : K.rgba(K.mix(pal.hi, pal.bloom, 0.4), 0.12 + r() * 0.18);
        x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
      }
      x.restore();
    }

    // ── 6. TACTILE SURFACE TEXTURE ─────────────────────────────────────────────
    K.mottle(x, 0, 0, W, H, pal.scale, 30, r, 'overlay');
    K.mottle(x, 0, 0, W, H, pal.base, 60, r, 'soft-light');

    // ── 7. ATMOSPHERE ──────────────────────────────────────────────────────────
    const hazeCol = K.mix(pal.base, pal.hi, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.12 + r() * 0.08, S * 0.85 * featScale, 'soft-light');
    K.hazeSheet(x, W, H, noise2, K.mix(pal.verd, pal.scale, 0.5), 0.08 + r() * 0.06, S * 0.45 * featScale, 'overlay');
    K.bloom(x, lcx, lcy, S * 0.6, K.mix(pal.hi, '#ffffff', 0.2), 0.08 + r() * 0.05);

    // ── 8. GRADE ───────────────────────────────────────────────────────────────
    K.grain(x, W, H, 4.4, r);
    K.vignette(x, W, H, 0.32 + r() * 0.14);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    // mirror draw()'s rng order up to the trait-relevant draws:
    // buildPal consumes draws AFTER anchor pick; we only need anchor + mode + aspect.
    const anchor = undefined ? (ANCHORS.find((p) => p.name === undefined) || ANCHORS[0]) : K.pick(ANCHORS, r);
    // replay buildPal's draws to keep rng aligned (we don't need its output here).
    // buildPal order: hShift, lShift, sMul, then per-swatch jitters.
    jit(r, 12); jit(r, 0.05); (0.80 + r() * 0.45);          // hShift,lShift,sMul
    // base: jit8, S jit, L jit
    jit(r, 8); jit(r, 0.05); jit(r, 0.03);
    // ink: jit10, L jit
    jit(r, 10); jit(r, 0.015);
    // hi: jit14, S jit, L jit
    jit(r, 14); jit(r, 0.10); jit(r, 0.07);
    // verd: jit14, S jit, L jit
    jit(r, 14); jit(r, 0.12); jit(r, 0.08);
    // rust: jit12, S jit, L jit
    jit(r, 12); jit(r, 0.12); jit(r, 0.07);
    // bloom: jit16, S jit, L jit
    jit(r, 16); jit(r, 0.14); jit(r, 0.08);
    // scale: jit18, S jit, L jit
    jit(r, 18); jit(r, 0.05); jit(r, 0.08);
    // vWeight jit
    const vWeight = K.clamp(anchor.vWeight + jit(r, 0.18), 0.12, 0.88);
    const mode = K.pick(MODES, r);
    const aspect = 0.74 + r() * 0.66;
    const f = aspect > 1.06 ? 'Landscape' : aspect < 0.94 ? 'Portrait' : 'Square';
    const dom = vWeight >= 0.55 ? 'Verdigris' : vWeight <= 0.36 ? 'Rust' : 'Mixed';
    return { Palette: anchor.name, Mode: mode, Format: f, Oxide: dom };
  }

  return { name: 'z_patina', draw, traits };
})();


export const patinaTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderPatina: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const PATINA_ASPECTS: readonly number[] = [1.3,1,0.78];
export const patinaSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Copper Bloom",
        "Iron Scale",
        "Oxblood Iron",
        "Sea Patina",
        "Verdigris Creep",
        "Tarnished Brass"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Archipelago",
        "Ridge Vein",
        "Tide Line",
        "Eclipse",
        "Continental",
        "Pitting",
        "Macro Crust",
        "Drip Front"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Landscape",
        "Portrait",
        "Square"
      ]
    },
    {
      "name": "Oxide",
      "values": [
        "Verdigris",
        "Mixed",
        "Rust"
      ]
    }
  ]
};
