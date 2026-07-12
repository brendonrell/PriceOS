// @ts-nocheck
/*
 * Evaporate — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/z_evaporate.js). Continuous seed-driven composition. Deterministic
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


/* EVAPORATE — overlapping drying-stain rings (the coffee-ring effect).
 * A drying droplet deposits its pigment at the contact line: a dark feathered
 * rim, a pale washed centre, faint inner tide-lines where the edge paused as it
 * receded. Many such stains bleed across warm absorbent paper, overlapping and
 * darkening where droplets met. ABSTRACT: pure stained surface, full frame.
 * UNCANNY: rings that nest and align into an order no spilled liquid would leave.
 * Palette world: tea/wine/tannin/sepia ink on warm cream — analog, no neon.
 *
 * NOT A TEMPLATE PICKER. There are no discrete "modes". Every salient parameter
 * — count, scale, density, format, focal position, asymmetry, the spatial
 * placement FIELD, ring proportions, and the pigment VALUES themselves — varies
 * CONTINUOUSLY with the seed. Two seeds never land the same "bucket" because
 * there are no buckets; the placement is a continuous blend of attractor forces
 * (lattice order ↔ radial nesting ↔ tidal sweep ↔ free scatter ↔ pooled cluster)
 * mixed by seed-driven weights, then jittered per-element. Same-looking twins
 * are structurally impossible.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palettes, all inside the STAIN world: warm paper grounds +
     a weighted pigment family (tannin/sepia/wine/ink). `paper` is the buff
     ground; `inks` are the deposit colours (rims read darkest); `grade` is a
     final atmospheric wash. Some are rare on purpose (Oxblood, Verditer). */
  const PALS = [
    { name: 'Tannin',   paper: '#e8dcc2', deep: '#3a2414', inks: ['#6e4a2a', '#8a5e35', '#4d3018', '#a9824f'], grade: '#caa66f', w: 5 },
    { name: 'Sepia Wash',paper: '#ece2cb', deep: '#43301a', inks: ['#7d5a33', '#9c7344', '#5a3d22', '#b89260'], grade: '#d8b87e', w: 5 },
    { name: 'Oxblood',  paper: '#e3d4ba', deep: '#2e1212', inks: ['#6a2a25', '#882f2a', '#451818', '#9e5238'], grade: '#b98a64', w: 3 },
    { name: 'Faint Ink',paper: '#e6ddca', deep: '#23232e', inks: ['#54505e', '#6b6172', '#3a3744', '#7d7382'], grade: '#9fa0a8', w: 2 },
    { name: 'Burgundy', paper: '#e0d2b6', deep: '#33161f', inks: ['#6d2c3c', '#864050', '#481c28', '#9c6258'], grade: '#bf8c6e', w: 4 },
    { name: 'Verditer', paper: '#e7e0c8', deep: '#1d2c28', inks: ['#3f5b50', '#557066', '#2c423a', '#7f8a6a'], grade: '#9fae84', w: 1 },
  ];

  function pickPalW(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    let tot = 0; for (const p of PALS) tot += p.w;
    let t = r() * tot;
    for (const p of PALS) { t -= p.w; if (t <= 0) return p; }
    return PALS[0];
  }

  /* ── colour helpers: jitter a hex in HSL within the palette world so two
     pieces of the same palette never share exact pigment values. Hue drifts a
     few degrees, sat/light wander a little — analog variation, not a new world. */
  function hex2hsl(hex) {
    const c = K.h2r(hex), R = c[0] / 255, G = c[1] / 255, B = c[2] / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
    let h = 0; const l = (mx + mn) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === R) h = ((G - B) / d) % 6;
      else if (mx === G) h = (B - R) / d + 2;
      else h = (R - G) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, s, l];
  }
  function jitterInk(hex, r, hAmt, sAmt, lAmt) {
    const [h, s, l] = hex2hsl(hex);
    return K.hsl2hex(
      h + (r() - 0.5) * 2 * hAmt,
      K.clamp(s + (r() - 0.5) * 2 * sAmt, 0, 1),
      K.clamp(l + (r() - 0.5) * 2 * lAmt, 0, 1)
    );
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPalW(r);

    /* ── CONTINUOUS GLOBAL DNA ────────────────────────────────────────────────
       Every knob below is a smooth function of the seed. No discrete buckets. */

    // FORMAT — continuous aspect, not three fixed sizes. Long edge fixed; the
    // short edge slides continuously from tall portrait to wide landscape.
    const LONG = 1180;
    const aspectPick = r();                       // 0..1 → portrait..landscape
    const ratio = 0.66 + aspectPick * 0.72;       // 0.66 (tall) .. ~1.0 (sq) .. 1.38 (wide)
    let W, H;
    if (ratio >= 1) { W = LONG; H = Math.round(LONG / ratio); }
    else { H = LONG; W = Math.round(LONG * ratio); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const DIAG = Math.hypot(W, H);

    // DENSITY — continuous from near-empty/minimal to packed. Drives count.
    const density = r();                          // 0 sparse .. 1 packed
    // global ZOOM/SCALE — overall size of the stains relative to the frame.
    const zoom = 0.7 + r() * 0.9;                 // 0.7 small/distant .. 1.6 big/cropped
    // base count derived continuously from density (sparse→dense), then zoom-tempered.
    const baseCount = Math.round((2 + density * density * 26) / Math.sqrt(zoom));
    const count = Math.max(1, baseCount);

    // FOCAL — a continuous focal point + a continuous focal-strength (how much
    // one dominant stain anchors the composition). Off-centre by a free amount.
    const fx = W * (0.22 + r() * 0.56);
    const fy = H * (0.22 + r() * 0.56);
    const focalStrength = r();                    // 0 democratic .. 1 one dominant stain
    const focalScale = (0.16 + r() * 0.26) * zoom;// dominant stain radius (× S)

    // SIZE SPREAD — how varied the satellite stains are in size.
    const sizeMin = 0.03 + r() * 0.05;
    const sizeMax = sizeMin + 0.04 + r() * 0.16;

    // ── PLACEMENT FIELD: a CONTINUOUS BLEND of five spatial tendencies, each
    // weighted by a seed-driven scalar. The mix is what de-correlates structure
    // from palette and guarantees every piece's geometry is unique. ──
    const wLattice = Math.pow(r(), 1.6);          // grid order (the uncanny one)
    const wNest    = Math.pow(r(), 1.6);          // share a centre, nested rings
    const wTide    = Math.pow(r(), 1.4);          // strung along a drifting curve
    const wPool    = Math.pow(r(), 1.4);          // gathered/clustered → pooled dark
    const wScatter = 0.25 + r() * 0.9;            // free spread (always some)
    const wSum = wLattice + wNest + wTide + wPool + wScatter || 1;
    const fLat = wLattice / wSum, fNest = wNest / wSum, fTide = wTide / wSum,
          fPool = wPool / wSum, fScat = wScatter / wSum;

    // lattice geometry (continuous cols/rows + jitter even when weak)
    const cols = 2 + (r() * 4 | 0), rows = 2 + (r() * 4 | 0);
    const latJit = 0.04 + r() * 0.6;              // how loose the grid is
    // nest geometry
    const nestCx = W * (0.5 + (r() - 0.5) * 0.5), nestCy = H * (0.5 + (r() - 0.5) * 0.5);
    const nestSpin = r() * Math.PI * 2;
    const nestGrowth = 0.6 + r() * 0.9;
    // tide geometry
    const tideY = H * (0.3 + r() * 0.4), tideAmp = H * (0.04 + r() * 0.22);
    const tidePh = r() * 7, tideFreq = 0.8 + r() * 2.2, tideTilt = (r() - 0.5) * 0.5;
    // pool geometry
    const poolCx = W * (0.3 + r() * 0.4), poolCy = H * (0.3 + r() * 0.4);
    const poolSpread = S * (0.14 + r() * 0.24), poolBias = 0.5 + r() * 0.8;
    // scatter uses a low-freq noise warp so it's organic, not uniform
    const scWarp = 0.4 + r() * 1.6, scSeed = r() * 1000;

    const margin = S * (0.06 + r() * 0.06);

    // per-palette pigment-jitter amplitudes (kept tasteful, world-preserving)
    const hJit = 4 + r() * 8, sJit = 0.05 + r() * 0.08, lJit = 0.04 + r() * 0.06;

    // ── PAPER GROUND: buff base + fibrous tonal variation so it never reads flat ──
    x.fillStyle = pal.paper; x.fillRect(0, 0, W, H);
    {
      const step = Math.max(4, Math.floor(S / 150));
      const warm = K.mix(pal.paper, pal.grade, 0.5);
      const cool = K.mix(pal.paper, pal.deep, 0.10);
      const fScale = 0.4 + r() * 0.5;             // ground warmth scale varies too
      for (let yy = 0; yy < H; yy += step) {
        for (let xx = 0; xx < W; xx += step) {
          const n = noise.fbm(xx / (S * fScale), yy / (S * fScale), 4, 0.55, 2.1);
          const c = n > 0 ? warm : cool;
          x.fillStyle = K.rgba(c, Math.min(0.18, Math.abs(n) * 0.3));
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
    }

    // ── RING-STAIN PRIMITIVE ─────────────────────────────────────────────────
    // A drying droplet: concentric tide-lines, the OUTER rim darkest (coffee-ring),
    // pale washed centre, feathered angular edge. Multiply blend → realistic
    // darkening where stains overlap.
    function stain(cx, cy, rad, opt) {
      opt = opt || {};
      // pigment colour: a jittered ink VALUE, not a fixed swatch.
      const baseInk = opt.ink || K.pick(pal.inks, r);
      const ink = jitterInk(baseInk, r, hJit, sJit, lJit);
      const rimInk = K.mix(ink, pal.deep, 0.45 + r() * 0.25);
      const vw = opt.vw == null ? 1 : opt.vw;
      const strength = (opt.strength == null ? 0.55 + r() * 0.3 : opt.strength) * vw;
      // ragged contact line: per-angle radius offset from a smooth periodic field
      const ph = r() * 7, ph2 = r() * 7, ph3 = r() * 7;
      const wob = opt.wob == null ? 0.03 + r() * 0.08 : opt.wob;
      const lobes = 3 + (r() * 5 | 0);
      // per-stain eccentricity: drops are rarely perfect circles
      const ecc = opt.ecc == null ? (r() - 0.5) * 0.22 : opt.ecc;
      const eAng = r() * Math.PI * 2;
      function edgeR(a) {
        const base = rad * (1 + ecc * Math.cos(2 * (a - eAng)));
        return base * (1 + wob * Math.sin(a * lobes + ph) + wob * 0.5 * Math.sin(a * (lobes * 2 + 1) + ph2)
          + wob * 0.22 * Math.sin(a * (lobes * 4 + 3) + ph3));
      }

      x.save();
      x.globalCompositeOperation = 'multiply';

      // 1) faint full body wash
      {
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
        const body = K.mix(ink, pal.paper, 0.5);
        g.addColorStop(0, K.rgba(K.mix(ink, pal.paper, 0.72), strength * 0.18));
        g.addColorStop(0.62, K.rgba(body, strength * 0.22));
        g.addColorStop(0.9, K.rgba(ink, strength * 0.34));
        g.addColorStop(1, K.rgba(ink, 0));
        x.fillStyle = g;
        x.beginPath();
        for (let i = 0; i <= 96; i++) {
          const a = (i / 96) * Math.PI * 2, rr = edgeR(a);
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.closePath(); x.fill();
      }

      // 1b) SEDIMENT in the centre
      {
        x.save();
        x.beginPath();
        for (let i = 0; i <= 64; i++) {
          const a = (i / 64) * Math.PI * 2, rr = edgeR(a) * 0.82;
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.closePath(); x.clip();
        const sed = Math.floor(rad * rad / 120);
        for (let i = 0; i < sed; i++) {
          const a = r() * Math.PI * 2, d = Math.pow(r(), 0.6) * rad * 0.8;
          const px = cx + Math.cos(a) * d, py = cy + Math.sin(a) * d;
          const s = 0.6 + r() * (rad * 0.012);
          x.fillStyle = K.rgba(K.mix(ink, pal.deep, 0.15), strength * (0.02 + r() * 0.05));
          x.beginPath(); x.arc(px, py, s, 0, 7); x.fill();
        }
        x.restore();
      }

      // 2) inner tide-lines — count varies continuously
      const tides = opt.tides == null ? (1 + (r() * 4 | 0)) : opt.tides;
      for (let t = 0; t < tides; t++) {
        const tr = rad * (0.26 + 0.6 * (t + r() * 0.6) / (tides + 0.4));
        x.lineWidth = Math.max(1, S * (0.0014 + r() * 0.0016));
        x.strokeStyle = K.rgba(K.mix(ink, pal.deep, 0.2), strength * (0.10 + r() * 0.12));
        x.beginPath();
        for (let i = 0; i <= 80; i++) {
          const a = (i / 80) * Math.PI * 2;
          const rr = tr * (1 + wob * 0.6 * Math.sin(a * lobes + ph));
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.closePath(); x.stroke();
      }

      // 3) the RIM — coffee-ring's defining dark feathered band
      const rimW = rad * (0.04 + r() * 0.07);
      const bands = 5;
      for (let b = 0; b < bands; b++) {
        const t = b / (bands - 1);
        const rr0 = rad * (1 - rimW / rad * (1 - t * 0.2));
        x.lineWidth = Math.max(1.2, rimW * (0.5 + t * 0.9) * 0.5);
        const a = strength * (0.10 + t * t * 0.5);
        x.strokeStyle = K.rgba(rimInk, a);
        x.beginPath();
        for (let i = 0; i <= 120; i++) {
          const ang = (i / 120) * Math.PI * 2;
          const rr = edgeR(ang) * (rr0 / rad);
          const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr;
          if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.closePath(); x.stroke();
      }

      // 3b) PIGMENT GRANULARITY on the rim
      {
        const grains = Math.floor(rad * (2.4 + r() * 1.6));
        for (let i = 0; i < grains; i++) {
          const a = r() * Math.PI * 2;
          const er = edgeR(a);
          const off = (r() - 0.5) * rimW * 2.6 - rimW * 0.2;
          const rr = er + off;
          const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
          const s = 0.5 + r() * (rimW * 0.16);
          x.fillStyle = K.rgba(rimInk, strength * (0.05 + r() * 0.22));
          x.beginPath(); x.arc(px, py, s, 0, 7); x.fill();
        }
      }

      // 4) feathered bleed just outside the rim
      {
        const g = x.createRadialGradient(cx, cy, rad * 0.98, cx, cy, rad * (1.12 + wob));
        g.addColorStop(0, K.rgba(rimInk, strength * 0.18));
        g.addColorStop(1, K.rgba(rimInk, 0));
        x.fillStyle = g;
        x.beginPath(); x.arc(cx, cy, rad * (1.14 + wob), 0, 7); x.fill();
      }
      x.restore();
    }

    // ── PLACE STAINS via the continuous blended field ─────────────────────────
    // Build a list of placements. For each stain we pick which tendency drives
    // its position by sampling the blend weights — so a single piece can mix
    // grid order with a tidal drift with free scatter, in any continuous ratio.
    const placements = [];

    // dominant focal stain (its prominence scales with focalStrength)
    if (focalStrength > 0.12 || count <= 2) {
      placements.push({
        cx: fx, cy: fy, rad: S * focalScale,
        strength: 0.6 + focalStrength * 0.35,
        nested: r() < 0.5 + fNest * 0.5,           // dominant may be a nested set
      });
    }

    // shared ink bias for grid/nest coherence within THIS piece (still jittered
    // per-stain inside stain()). chosen continuously.
    const coherent = r() < (fLat + fNest) * 0.9;
    const sharedInk = coherent ? K.pick(pal.inks, r) : null;

    function pickTendency() {
      const t = r();
      if (t < fLat) return 'lat';
      if (t < fLat + fNest) return 'nest';
      if (t < fLat + fNest + fTide) return 'tide';
      if (t < fLat + fNest + fTide + fPool) return 'pool';
      return 'scat';
    }

    // precompute a lattice slot order so lattice stains land on cells
    const latSlots = [];
    for (let ry = 0; ry < rows; ry++) for (let cxn = 0; cxn < cols; cxn++) latSlots.push([cxn, ry]);
    const latOrder = K.shuffle(latSlots, r);
    let latIdx = 0;
    let nestIdx = 0;

    const gw = (W - margin * 2) / cols, gh = (H - margin * 2) / rows;
    const cell = Math.min(gw, gh);

    for (let i = 0; i < count; i++) {
      const tend = pickTendency();
      let cx, cy, rad, strength, ink = sharedInk, wob, vw = 1;
      const sizeT = r();
      rad = S * (sizeMin + (sizeMax - sizeMin) * sizeT) * zoom;

      if (tend === 'lat' && latIdx < latOrder.length) {
        const slot = latOrder[latIdx++];
        const jx = (r() - 0.5) * cell * latJit, jy = (r() - 0.5) * cell * latJit;
        cx = margin + gw * (slot[0] + 0.5) + jx;
        cy = margin + gh * (slot[1] + 0.5) + jy;
        rad = cell * (0.4 + r() * 0.12);
        wob = 0.02 + r() * 0.05;                  // grid rings are calmer
        // diagonal value gradient → chiaroscuro across the grid
        const gx = cols > 1 ? slot[0] / (cols - 1) : 0.5, gy = rows > 1 ? slot[1] / (rows - 1) : 0.5;
        vw = 0.55 + (gx * 0.5 + gy * 0.5) * 0.85;
        strength = 0.6;
      } else if (tend === 'nest') {
        const k = nestIdx++;
        const rr = (0.16 + nestGrowth * 0.9 * ((k % 6) + r() * 0.5) / 6) * S * (0.42 + zoom * 0.1);
        const off = S * 0.02;
        cx = nestCx + Math.cos(nestSpin) * off * (r() - 0.5) * 2;
        cy = nestCy + Math.sin(nestSpin) * off * (r() - 0.5) * 2;
        rad = Math.max(S * 0.05, rr);
        wob = 0.025 + r() * 0.04;
        strength = 0.45 + (k % 6) / 6 * 0.3;
      } else if (tend === 'tide') {
        const t = count > 1 ? i / (count - 1) : 0.5;
        cx = margin + t * (W - margin * 2) + (r() - 0.5) * S * 0.05;
        const drift = Math.sin(t * Math.PI * tideFreq + tidePh) * tideAmp + (t - 0.5) * H * tideTilt;
        cy = tideY + drift;
        strength = 0.5 + r() * 0.3;
        wob = 0.03 + r() * 0.07;
      } else if (tend === 'pool') {
        const a = r() * Math.PI * 2, d = Math.pow(r(), poolBias) * poolSpread;
        cx = poolCx + Math.cos(a) * d;
        cy = poolCy + Math.sin(a) * d;
        strength = 0.5 + r() * 0.35;
        wob = 0.03 + r() * 0.08;
      } else { // scatter — organic noise-warped spread
        const u = r(), v = r();
        const wx = noise.fbm(u * scWarp + scSeed, v * scWarp, 3) * 0.25;
        const wy = noise.fbm(u * scWarp + scSeed + 9, v * scWarp + 9, 3) * 0.25;
        cx = margin + K.clamp(u + wx, 0, 1) * (W - margin * 2);
        cy = margin + K.clamp(v + wy, 0, 1) * (H - margin * 2);
        strength = 0.5 + r() * 0.3;
        wob = 0.03 + r() * 0.08;
      }
      placements.push({ cx, cy, rad, strength, ink, wob, vw });
    }

    // overlap relaxation only when the piece is meant to be sparse/airy —
    // dense/pooled pieces keep their overlaps (that's where the darkening lives).
    const allowOverlap = density > 0.45 || fPool > 0.25 || fNest > 0.3;
    const kept = [];
    for (const p of placements) {
      if (p.nested) { kept.push(p); continue; }
      if (allowOverlap) { kept.push(p); continue; }
      let ok = true;
      for (const q of kept) {
        const d = Math.hypot(p.cx - q.cx, p.cy - q.cy);
        if (d < (p.rad + q.rad) * 0.5) { ok = false; break; }
      }
      if (ok) kept.push(p);
    }

    // draw big-first so small rim detail sits cleanly on top
    kept.sort((a, b) => b.rad - a.rad);
    for (const p of kept) {
      if (p.nested) {
        // a layered nested deposit (re-wetting rings) for the dominant stain
        const inners = 2 + (r() * 2 | 0);
        const jx = (r() - 0.5) * S * 0.02, jy = (r() - 0.5) * S * 0.02;
        const nink = sharedInk || K.pick(pal.inks, r);
        for (let k = inners - 1; k >= 0; k--) {
          const rr = p.rad * (0.34 + 0.66 * (k + 1) / inners);
          stain(p.cx + jx * (k / inners), p.cy + jy * (k / inners), rr,
            { ink: nink, strength: p.strength + (k / inners) * 0.3, wob: 0.04 + r() * 0.05 });
        }
      } else {
        stain(p.cx, p.cy, p.rad, { ink: p.ink, strength: p.strength, wob: p.wob, vw: p.vw });
      }
    }

    // ── DEPTH WASH: focal value gradient so the field isn't flat-lit ──
    {
      const dgx = W * (0.4 + r() * 0.2), dgy = H * (0.38 + r() * 0.2);
      const g = x.createRadialGradient(dgx, dgy, 0, dgx, dgy, DIAG * 0.55);
      g.addColorStop(0, K.rgba(pal.grade, 0));
      g.addColorStop(0.7, K.rgba(K.mix(pal.deep, pal.paper, 0.4), 0.0));
      g.addColorStop(1, K.rgba(pal.deep, 0.14));
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = g; x.fillRect(0, 0, W, H); x.restore();
    }

    // ── ATMOSPHERE & SURFACE TEXTURE ─────────────────────────────────────────
    const hazeCol = K.mix(pal.grade, pal.paper, 0.35);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.16, S * (0.7 + r() * 0.3), 'screen');
    K.mottle(x, 0, 0, W, H, K.mix(pal.paper, pal.deep, 0.25), 20, r, 'overlay');
    {
      const spk = Math.floor(W * H / 9000);
      x.save(); x.globalCompositeOperation = 'multiply';
      for (let i = 0; i < spk; i++) {
        const px = r() * W, py = r() * H, s = 0.6 + r() * 1.6;
        x.fillStyle = K.rgba(K.mix(pal.inks[0], pal.deep, 0.3), 0.04 + r() * 0.08);
        x.beginPath(); x.arc(px, py, s, 0, 7); x.fill();
      }
      x.restore();
    }
    K.grain(x, W, H, 5.5, r);
    K.vignette(x, W, H, pal.name === 'Faint Ink' ? 0.30 : 0.26);

    return { aspect: W / H };
  }

  /* traits() must mirror draw()'s rng draw order up to the points it reads, so
     the labels match the rendered piece. It reads only the early DNA. */
  function traits(seed) {
    const r = K.rng(seed);
    const pal = pickPalW(r);
    // mirror: aspectPick, density, zoom
    const aspectPick = r();
    const density = r();
    const zoom = 0.7 + r() * 0.9;

    const ratio = 0.66 + aspectPick * 0.72;
    const f = ratio > 1.08 ? 'Landscape' : ratio < 0.92 ? 'Portrait' : 'Square';
    const dens = density < 0.25 ? 'Minimal' : density < 0.6 ? 'Open' : density < 0.82 ? 'Dense' : 'Packed';
    const scale = zoom < 0.95 ? 'Distant' : zoom < 1.3 ? 'Mid' : 'Cropped';
    const rare = (pal.name === 'Verditer' || pal.name === 'Faint Ink')
      ? (density < 0.25 ? 'Mythic' : 'Rare')
      : (density < 0.2 || density > 0.9) ? 'Notable' : 'Common';
    return { Palette: pal.name, Density: dens, Scale: scale, Format: f, Rarity: rare };
  }

  return { name: 'z_evaporate', draw, traits };
})();


export const evaporateTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderEvaporate: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const EVAPORATE_ASPECTS: readonly number[] = [1.3,1,0.78];
export const evaporateSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Oxblood",
        "Burgundy",
        "Sepia Wash",
        "Tannin",
        "Faint Ink",
        "Verditer"
      ]
    },
    {
      "name": "Density",
      "values": [
        "Minimal",
        "Dense",
        "Open",
        "Packed"
      ]
    },
    {
      "name": "Scale",
      "values": [
        "Mid",
        "Distant",
        "Cropped"
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
      "name": "Rarity",
      "values": [
        "Common",
        "Notable",
        "Rare",
        "Mythic"
      ]
    }
  ]
};
