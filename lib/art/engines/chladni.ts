// @ts-nocheck
/*
 * Chladni — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/z_chladni.js). Continuous seed-driven composition. Deterministic
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


/* CHLADNI — cymatic standing-wave figures.
 * Fine powder migrates off the antinodes and piles along the NODAL LINES of a
 * vibrating plate, gathering into intricate symmetric standing-wave figures.
 * Crisp ridge-lines of piled grain over a swept bare slate, loose grains mid-jump.
 * Pure abstract field — no scene. SURREAL = sand holding an impossible symmetric
 * figure by a vibration you cannot see. Warm sand/bone powder on dark graphite slate
 * (one or two seeds invert: dark powder on pale plate).
 *
 * GENERATIVE, NOT A TEMPLATE: there are no discrete "modes". Every salient
 * parameter — plate scale/zoom/crop, focal position, the standing-wave numbers,
 * the radial / lattice / shear / superposition WEIGHTS, the band width, grain
 * density, and the colour VALUES (hue/sat/light jitter within the world) — varies
 * continuously with the seed. Two seeds never land in the same bucket.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* ── PALETTE WORLD: granular powder on slate. plate = base plate; sheen = faint
     metallic gloss on the bare swept plate; powderLo/Hi = packed grain in shadow→light
     (the pile gets a lit ridge crest); loose = mid-jump grains; ink = deepest crevice;
     inverted: true → dark powder gathers on a pale plate. ── */
  const PALS = [
    { name: 'Bone on Graphite', plate: '#1a1b1e', plate2: '#0e0f12', sheen: '#3a3d44',
      powderLo: '#8f8064', powderHi: '#e9dcbd', crest: '#f6ecd2', loose: '#c8b896', ink: '#070708', inv: false },
    { name: 'Sandstorm Slate',  plate: '#23211d', plate2: '#141210', sheen: '#46413a',
      powderLo: '#a4824f', powderHi: '#e8c989', crest: '#f7e3ad', loose: '#c79e63', ink: '#0a0907', inv: false },
    { name: 'Pumice Iron',      plate: '#1c1d20', plate2: '#101113', sheen: '#3d4047',
      powderLo: '#8a8378', powderHi: '#d8cfbf', crest: '#efe7d6', loose: '#b4ac9d', ink: '#08080a', inv: false },
    { name: 'Rust Powder',      plate: '#1e1816', plate2: '#120d0c', sheen: '#43332c',
      powderLo: '#9c6a4a', powderHi: '#dca271', crest: '#efbb8b', loose: '#bd8159', ink: '#0b0706', inv: false },
    { name: 'Chalk on Pitch',   plate: '#191a1d', plate2: '#0c0d10', sheen: '#383b42',
      powderLo: '#9a9b97', powderHi: '#ecedea', crest: '#fbfbf8', loose: '#c3c4bf', ink: '#060608', inv: false },
    /* the rare inversion: dark iron powder gathered on a pale bone plate */
    { name: 'Iron on Bone',     plate: '#d9d2c1', plate2: '#c4bca7', sheen: '#efe9da',
      powderLo: '#4a443c', powderHi: '#1b1814', crest: '#0e0c09', loose: '#6b6256', ink: '#000000', inv: true },
  ];

  // FORMATS span thin-portrait → square → wide-landscape so the frame itself
  // changes hard across seeds (not just three rigid ratios).
  const FORMATS = [[920, 1320], [1040, 1280], [1180, 1180], [1280, 1040], [1340, 900]];

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  // jitter every palette role's hue/sat/light a little so two seeds on the SAME
  // base palette still differ in colour VALUE — the world is preserved, the exact
  // tint is not. amt scales the drift (kept tasteful so it never leaves the world).
  function shiftHSL(hex, dh, ds, dl) {
    const [r0, g0, b0] = K.h2r(hex).map((v) => v / 255);
    const mx = Math.max(r0, g0, b0), mn = Math.min(r0, g0, b0);
    let h = 0; const l = (mx + mn) / 2; const d = mx - mn;
    let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === r0) h = ((g0 - b0) / d) % 6;
      else if (mx === g0) h = (b0 - r0) / d + 2;
      else h = (r0 - g0) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return K.hsl2hex(h + dh, K.clamp(s + ds, 0, 1), K.clamp(l + dl, 0, 1));
  }
  function jitterPal(p, r) {
    const dh = (r() - 0.5) * 26;          // hue drift (deg)
    const ds = (r() - 0.5) * 0.16;        // saturation drift
    const dl = (r() - 0.5) * 0.07;        // lightness drift
    const o = { name: p.name, inv: p.inv };
    for (const k of ['plate', 'plate2', 'sheen', 'powderLo', 'powderHi', 'crest', 'loose', 'ink']) {
      // ink stays near-black/near-white; drift the rest fully
      const sl = (k === 'ink') ? dl * 0.3 : dl;
      o[k] = shiftHSL(p[k], dh, ds, sl);
    }
    return o;
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const basePal = pickPal(r);
    const pal = undefined ? basePal : jitterPal(basePal, r);

    // ── FORMAT: continuous-ish frame choice ──
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const minWH = Math.min(W, H);

    // ── CONTINUOUS COMPOSITION AXES (break the locked centered-square look) ──
    // zoom: small floating plate (minimal, lots of bare slate) ↔ macro crop where
    // the plate bleeds past the frame and we see a zoomed slice of the figure.
    const zoom = r();                                  // 0 minimal .. 1 macro
    const plateSize = minWH * (0.52 + zoom * zoom * 0.95);   // 0.52·min .. ~1.47·min
    // focal: where the plate centre sits — wide drift, can push the plate partly
    // off-frame for an asymmetric crop.
    const fx = 0.16 + r() * 0.68;
    const fy = 0.16 + r() * 0.68;
    const px0 = (W - plateSize) * fx;
    const py0 = (H - plateSize) * fy;
    const cx = px0 + plateSize / 2, cy = py0 + plateSize / 2;

    // ── CONTINUOUS FIELD FORMATION (no discrete modes) ──
    // wave numbers — wider continuous range; the figure fineness varies a lot.
    let m = 2 + (r() * 6 | 0), n = 3 + (r() * 6 | 0);
    if (m === n) n = m + 1 + (r() * 2 | 0);
    if (Math.abs(m - n) > 5) n = m + 2 + (r() * 2 | 0); // avoid lop-sided sparse figures
    // continuous detune — wave numbers drift slightly off integer (plate tuning).
    // kept modest so the bilateral/quadrant symmetry survives.
    const detune = (r() - 0.5) * 0.10;

    // shear: a continuous off-square clamp (0 = perfect symmetry .. strong skew).
    let shear = (r() - 0.5) * (r() < 0.5 ? 0.10 : 0.46);
    // radial weight: 0 = pure square figure .. 1 = flower-like concentric bloom.
    // cubed + capped so the SQUARE figure is the common case and full radial blooms
    // are the rare grail — they no longer crowd the set or repeat a center motif.
    const wRadial = Math.min(1, Math.pow(r(), 2.4) * 1.15);
    if (wRadial > 0.4) shear *= 0.4;        // keep strong blooms clean (no chaotic swirl)
    // off-centre the radial singularity so blooms don't all share a dead-centre star.
    const rcx = 0.5 + (r() - 0.5) * 0.5 * wRadial;
    const rcy = 0.5 + (r() - 0.5) * 0.5 * wRadial;
    // lattice mix: 0 = difference family (nested loops) .. 1 = sum family (checker
    // cells). continuous → every blend of loop-vs-cell character exists.
    const wLattice = r();
    // angular lobe count for the radial component (continuous-ish).
    const lobes = 2 + (r() * 7 | 0);
    const ringK = 1.0 + r() * 1.6;          // radial ring frequency multiplier

    // secondary superposed figure, blended continuously.
    let m2 = 2 + (r() * 6 | 0), n2 = 2 + (r() * 6 | 0);
    if (m2 === n2) n2 = m2 + 2;
    const blend2 = Math.pow(r(), 1.5) * 0.5;   // 0 .. 0.5, biased low

    const a = Math.PI;

    // Chladni field, normalized plate coords u,v in [0,1]. A continuous blend of
    // the authentic vibrating-square solution (sin-form, difference↔sum family)
    // with an optional radial cymatic bloom. No branch picks a "mode" — the
    // weights move smoothly so the family character is a continuum.
    function field(u, v) {
      let ru = u, rv = v;
      if (shear) { ru = u + shear * (v - 0.5); rv = v - shear * (u - 0.5) * 0.5; }
      const M = m + detune, N = n - detune;
      const smu = Math.sin(a * M * ru), snv = Math.sin(a * N * rv);
      const snu = Math.sin(a * N * ru), smv = Math.sin(a * M * rv);
      const diff = smu * snv - snu * smv;     // nested-loop figure
      const sum = smu * snv + snu * smv;      // checkered/lattice cells
      let f = diff * (1 - wLattice) + sum * wLattice;
      if (blend2) {
        const f2 = Math.sin(a * m2 * ru) * Math.sin(a * n2 * rv) - Math.sin(a * n2 * ru) * Math.sin(a * m2 * rv);
        f = f * (1 - blend2) + f2 * blend2;
      }
      if (wRadial > 0.02) {
        const dx = ru - rcx, dy = rv - rcy;
        const rad = Math.sqrt(dx * dx + dy * dy) * 2.0;
        const ang = Math.atan2(dy, dx);
        const fr = Math.cos(rad * a * (m + detune) * ringK) +
                   0.62 * Math.cos(ang * lobes) * Math.cos(rad * a * 1.6);
        f = f * (1 - wRadial) + fr * wRadial;
      }
      return f;
    }

    // ── 1. PLATE: dark slate with subtle vertical gradient + faint sheen ──
    const pg = x.createLinearGradient(0, 0, 0, H);
    pg.addColorStop(0, pal.plate);
    pg.addColorStop(1, pal.plate2);
    x.fillStyle = pg; x.fillRect(0, 0, W, H);

    // soft vignette of the bare plate area (focal pull toward figure)
    x.save();
    const plg = x.createRadialGradient(cx, cy, plateSize * 0.1, cx, cy, plateSize * 0.85);
    plg.addColorStop(0, K.rgba(pal.sheen, 0.16));
    plg.addColorStop(0.55, K.rgba(pal.sheen, 0.05));
    plg.addColorStop(1, K.rgba(pal.ink, 0.0));
    x.globalCompositeOperation = pal.inv ? 'multiply' : 'screen';
    x.fillStyle = plg; x.fillRect(0, 0, W, H);
    x.restore();

    // raking sheen streak across the plate (the "faint gloss") — directional light
    const lightAng = -0.7 + r() * 1.4;
    x.save();
    x.globalCompositeOperation = pal.inv ? 'multiply' : 'lighter';
    const sg = x.createLinearGradient(
      cx - Math.cos(lightAng) * plateSize, cy - Math.sin(lightAng) * plateSize,
      cx + Math.cos(lightAng) * plateSize, cy + Math.sin(lightAng) * plateSize);
    sg.addColorStop(0, K.rgba(pal.sheen, 0));
    sg.addColorStop(0.5, K.rgba(pal.sheen, pal.inv ? 0.0 : 0.10));
    sg.addColorStop(1, K.rgba(pal.sheen, 0));
    x.fillStyle = sg; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 2. SAND FIELD ──
    // We march a dense grid of sample points. At each, compute |field|. Where it's
    // small the powder PILES (we deposit many grains, brightened toward a lit ridge
    // crest, with a thin dark crevice on the shadow side). Where it's large the plate
    // is bare/swept. Antinode basins get a faint swept-clean halo.
    const NODE_W = (0.05 + r() * 0.04);     // nodal band half-width (loose-grain mask)
    // light direction for ridge shading (powder catches light on one side)
    const lx = Math.cos(lightAng + Math.PI), ly = Math.sin(lightAng + Math.PI);

    // precompute field on a coarse grid for gradient (ridge normal → shading)
    const GS = 260; // field grid resolution
    const F = new Float32Array((GS + 1) * (GS + 1));
    for (let j = 0; j <= GS; j++) {
      for (let i = 0; i <= GS; i++) {
        F[j * (GS + 1) + i] = field(i / GS, j / GS);
      }
    }
    function sampleF(u, v) {
      const fi = u * GS, fj = v * GS;
      const i = Math.max(0, Math.min(GS - 1, fi | 0)), j = Math.max(0, Math.min(GS - 1, fj | 0));
      const tu = fi - i, tv = fj - j;
      const a00 = F[j * (GS + 1) + i], a10 = F[j * (GS + 1) + i + 1];
      const a01 = F[(j + 1) * (GS + 1) + i], a11 = F[(j + 1) * (GS + 1) + i + 1];
      return a00 * (1 - tu) * (1 - tv) + a10 * tu * (1 - tv) + a01 * (1 - tu) * tv + a11 * tu * tv;
    }
    function gradF(u, v) {
      const e = 1 / GS;
      const fx2 = sampleF(Math.min(1, u + e), v) - sampleF(Math.max(0, u - e), v);
      const fy2 = sampleF(u, Math.min(1, v + e)) - sampleF(u, Math.max(0, v - e));
      return [fx2, fy2];
    }

    // clip drawing to the plate square (with a hair of feather)
    x.save();
    x.beginPath();
    x.rect(px0, py0, plateSize, plateSize);
    x.clip();

    // distance-to-nearest-nodal-line, in plate-fraction units, via |f|/|∇f|.
    function nodeDist(u, v) {
      const f = sampleF(u, v);
      const gr = gradF(u, v);
      let gl = Math.hypot(gr[0], gr[1]) * GS + 1e-4; // grad per plate-fraction
      if (gl < 2.2) gl = 2.2;                  // floor → stop ridges ballooning at saddles
      return Math.abs(f) / gl;
    }
    const area = plateSize * plateSize;
    // pile half-width in plate fraction — continuous (tight crisp ridges ↔ broad
    // soft piles). drives how packed vs minimal the figure reads.
    const bandW = (0.0042 + r() * 0.0058);
    const jumpFrac = 0.04 + r() * 0.07;
    // DENSITY axis: grains-per-area swings wide → near-empty minimal ↔ packed.
    const density = 0.7 + Math.pow(r(), 1.3) * 2.1;   // ~0.7 .. 2.8

    // ── 2a. PILE SHADOW BED: a faint, slightly-offset dark band under each nodal
    // line so the heaped grain reads as sitting ON the plate. ──
    x.save();
    x.globalCompositeOperation = 'multiply';
    const SG = Math.floor(plateSize / 2.2);
    for (let j = 0; j < SG; j++) {
      const v = (j + 0.5) / SG;
      for (let i = 0; i < SG; i++) {
        const u = (i + 0.5) / SG;
        const su = u - lx * (bandW * 0.6), sv = v - ly * (bandW * 0.6);
        let d = nodeDist(su, sv);
        d *= 1 + noise.fbm(u * 90, v * 90, 3) * 0.2;
        if (d > bandW * 4.2) continue;
        const h = Math.max(0, 1 - d / (bandW * 4.2));
        const al = h * h * (pal.inv ? 0.10 : 0.28);
        const sx = px0 + u * plateSize, sy = py0 + v * plateSize;
        x.fillStyle = K.rgba(pal.ink, al);
        const c = plateSize / SG;
        x.fillRect(sx - c * 0.6, sy - c * 0.6, c * 1.2, c * 1.2);
      }
    }
    x.restore();

    // ── 2b. THE GRAIN PILE: dense stipple of individual grains heaped on the nodal
    // lines, brightened toward a lit ridge crest with a dark crevice on the shadow
    // side → real raised-bead chiaroscuro. ──
    const GRAINS = Math.floor(area * density);
    for (let g = 0; g < GRAINS; g++) {
      const u = r(), v = r();
      let d = nodeDist(u, v);
      d *= 1 + noise.fbm(u * 110, v * 110, 3) * 0.22;
      const onNode = Math.max(0, 1 - d / (bandW * 3.2));
      if (onNode <= 0) continue;                 // bare plate stays bare
      if (r() > onNode * onNode * (0.6 + 0.4 * r())) continue;
      const gr = gradF(u, v);
      const gl = Math.hypot(gr[0], gr[1]) + 1e-6;
      const facing = (gr[0] / gl) * lx + (gr[1] / gl) * ly; // -1 shadow .. +1 lit
      let t = onNode * (0.42 + 0.58 * (0.5 + 0.5 * facing));
      t = K.clamp(t + (r() - 0.5) * 0.16, 0, 1);
      let col;
      if (t < 0.5) col = K.mix(pal.powderLo, pal.powderHi, t * 2);
      else col = K.mix(pal.powderHi, pal.crest, (t - 0.5) * 2 * 0.7);
      if (facing < -0.1) col = K.mix(col, pal.ink, (-facing) * onNode * 0.55);
      const sx = px0 + u * plateSize, sy = py0 + v * plateSize;
      const sz = 0.55 + onNode * (0.7 + r() * 0.5);
      x.fillStyle = K.rgba(col, 0.5 + onNode * 0.42);
      x.fillRect(sx, sy, sz, sz);
    }

    // ── 2c. CREST SPARKLE: sparse bright flecks on the lit flank of the node line. ──
    x.save();
    x.globalCompositeOperation = pal.inv ? 'source-over' : 'lighter';
    const CS = 460;
    for (let pass = 0; pass < 2; pass++) {
      for (let j = 1; j < CS; j++) {
        const v = j / CS;
        let prev = sampleF(0, v), prevU = 0;
        for (let i = 1; i <= CS; i++) {
          const u = i / CS;
          const cur = sampleF(u, v);
          if ((prev < 0) !== (cur < 0)) {
            const tt = prev / (prev - cur);
            const zu = prevU + (u - prevU) * tt;
            const sx = px0 + (pass ? v : zu) * plateSize;
            const sy = py0 + (pass ? zu : v) * plateSize;
            const gx = pass ? sy : sx, gy = pass ? sx : sy;
            const gr = gradF((gx - px0) / plateSize, (gy - py0) / plateSize);
            const gl = Math.hypot(gr[0], gr[1]) + 1e-5;
            const facing = (gr[0] / gl) * lx + (gr[1] / gl) * ly;
            if (facing <= 0.05) { prev = cur; prevU = u; continue; } // lit flank only
            if (r() > 0.45) { prev = cur; prevU = u; continue; }     // broken, sparse
            const bright = (0.10 + 0.34 * facing) * (pal.inv ? 0.5 : 1);
            const jx = (r() - 0.5) * 2.0, jy = (r() - 0.5) * 2.0;
            x.fillStyle = K.rgba(pal.crest, K.clamp(bright, 0, 0.5));
            x.fillRect(gx + jx, gy + jy, 0.8 + r() * 0.5, 0.8 + r() * 0.5);
          }
          prev = cur; prevU = u;
        }
      }
    }
    x.restore();

    // pass C: loose grains MID-JUMP — scattered over the bare plate, faint, some with
    // a tiny motion smear (implied vibration). concentrated near antinodes.
    const LOOSE = Math.floor(area * jumpFrac * 0.02);
    x.save();
    for (let g = 0; g < LOOSE; g++) {
      const u = r(), v = r();
      const af = Math.abs(sampleF(u, v));
      if (af < NODE_W * 1.6) { if (r() > 0.15) continue; }
      const sx = px0 + u * plateSize, sy = py0 + v * plateSize;
      const al = 0.10 + r() * 0.35;
      x.fillStyle = K.rgba(pal.loose, al);
      const sz = 0.6 + r() * 0.9;
      if (r() < 0.25) {
        const ang = r() * 6.283, len = 1.5 + r() * 3.5;
        x.strokeStyle = K.rgba(pal.loose, al * 0.7);
        x.lineWidth = 0.7;
        x.beginPath(); x.moveTo(sx, sy);
        x.lineTo(sx + Math.cos(ang) * len, sy + Math.sin(ang) * len); x.stroke();
      } else {
        x.fillRect(sx, sy, sz, sz);
      }
    }
    x.restore();

    x.restore(); // end plate clip

    // ── 3. PLATE EDGE: a barely-there bevel so the square reads as a physical plate.
    // Only when the plate is actually inside the frame (a macro crop has no edge). ──
    const edgeVisible = plateSize < minWH * 1.02;
    if (edgeVisible) {
      x.save();
      x.strokeStyle = K.rgba(pal.inv ? pal.ink : pal.sheen, pal.inv ? 0.12 : 0.18);
      x.lineWidth = 1.4;
      x.strokeRect(px0 + 0.5, py0 + 0.5, plateSize - 1, plateSize - 1);
      x.restore();
    }

    // ── 4. ATMOSPHERE & TEXTURE (signature hazy/tactile grade) ──
    const hazeCol = pal.inv ? K.mix(pal.plate, '#ffffff', 0.2) : K.mix(pal.sheen, pal.powderLo, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, pal.inv ? 0.10 : 0.16, minWH * 0.85, 'screen');
    K.hazeSheet(x, W, H, noise, pal.inv ? '#cfc7b4' : pal.loose, 0.07, minWH * 0.30, 'screen');

    K.mottle(x, px0, py0, plateSize, plateSize, pal.plate, 30, r, 'overlay');
    K.grain(x, W, H, pal.inv ? 6 : 4.5, r);
    K.vignette(x, W, H, pal.inv ? 0.30 : 0.42);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const basePal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : K.pick(PALS, r);
    // mirror draw()'s rng order EXACTLY through every consumed value.
    if (!undefined) { r(); r(); r(); }  // jitterPal consumes dh, ds, dl (shiftHSL uses no rng)
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const zoom = r();
    r(); r();                                  // fx, fy
    let m = 2 + (r() * 6 | 0), n = 3 + (r() * 6 | 0);
    if (m === n) n = m + 1 + (r() * 2 | 0);
    if (Math.abs(m - n) > 5) n = m + 2 + (r() * 2 | 0);
    const crop = zoom > 0.78 ? 'Macro' : zoom < 0.22 ? 'Minimal' : 'Plate';
    const fineness = (m + n) >= 12 ? 'Fine' : (m + n) <= 7 ? 'Coarse' : 'Medium';
    return { Palette: basePal.name, Crop: crop, Format: f, Figure: (m + n <= 6 ? 'Simple' : m + n <= 11 ? 'Complex' : 'Intricate'), Grain: fineness };
  }

  return { name: 'z_chladni', draw, traits };
})();


export const chladniTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderChladni: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const CHLADNI_ASPECTS: readonly number[] = [1.3,1,0.78];
export const chladniSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Rust Powder",
        "Iron on Bone",
        "Sandstorm Slate",
        "Chalk on Pitch",
        "Bone on Graphite",
        "Pumice Iron"
      ]
    },
    {
      "name": "Crop",
      "values": [
        "Plate",
        "Minimal",
        "Macro"
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
      "name": "Figure",
      "values": [
        "Complex",
        "Intricate",
        "Simple"
      ]
    },
    {
      "name": "Grain",
      "values": [
        "Medium",
        "Coarse",
        "Fine"
      ]
    }
  ]
};
