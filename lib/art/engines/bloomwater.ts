// @ts-nocheck
/* AUTO-GENERATED from tools/halo/king/ink3.js by tools/halo/king/gen_ts.mjs — do not hand-edit.
   Self-contained: inlines the halo art kit + the frozen engine, exports the
   standard EngineFn/TraitsFn/Schema/aspects. Deterministic in tokenId. */
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const KIT = /* Browser-side art kit for the halo R&D harness. Superset of the repo's
   lib/art/engines/ai/extra/_kit.ts plus noise helpers for haze/texture.
   Loaded as a plain <script> into the render page; defines window.KIT. */
(function () {
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

  return {mulberry32,rng,pick,rint,shuffle,randn,clamp,h2r,r2h,mix,lum,rgba,hsl2hex,grain,vignette,mottle,makeNoise,bloom,hazeSheet,scanlines,chromaSplit,iridescent,sheen,curl,softShadow,chromeRamp,PHI:1.61803398875,INVPHI:0.61803398875};
})();
;

/* INK3 — marbled poured pigment (suminagashi / alcohol-ink), rebuilt as a SYSTEM.
 *
 * The matte FLUID project. NO chrome, NO specular, NO crinkle. Pigment poured on
 * SATURATED WATER (not pale paper), dragged by a current into the marbled feather.
 *
 * THE INK3 PASS (2026-06-21) — the jury's three notes, applied:
 *   1. THE WATER IS THE GROUND. The field itself is driven to a saturated palette
 *      base (hot cyan, cobalt, magenta-blue, lime…) at ~40-55% dominance. Ground
 *      lightness is HARD-FLOORED into the saturated mid-band so no milky cream
 *      seed can generate. Ink rings/veins float as mid + accent on top.
 *   2. PIGMENT, NOT PENCIL. Each ring band is a feathered, BLEEDING pigment stroke
 *      pulling a saturated hue, with a watercolour bloom halo + chromatic bleed at
 *      the crossings. Adjacent ring systems take DIFFERENT hues so the marbling
 *      refracts colour. Lines stay graceful but read as coloured ink, not graphite.
 *   3. NO DEAD-CENTRE POUR. Primary ring system sits on a thirds intersection ~1/3
 *      from an edge; comb/veining runs full-bleed on a diagonal exiting the frame;
 *      a large soft ring mass is counterweighted against a small dense bright stain
 *      opposite. The near-empty Sparse/Calm blank-wash behaviour is removed.
 *
 * THE REBUILD (2026-06-21). The prior engine (p_ink) had ONE composition — an
 * off-centre confluence combed into a single feather — so every seed read as the
 * same stamp recoloured. INK2 makes **LAYOUT the primary trait**: a `Layout` axis
 * (drawn FIRST, in fixed RNG order so traits() and draw() never disagree) selects
 * one of SEVEN structurally distinct marbling arrangements. Each is a different
 * way pigment meets water — not the same blob relocated:
 *
 *   1. Suminagashi — one off-centre stack of concentric ink rings combed into a
 *                    long feather; vast active negative space opposite.
 *   2. Scatter     — many small ink drops / rings strewn across the frame on a
 *                    thirds/phi constellation; no hero.
 *   3. Stone       — dense full-field combed stone-marble: rings everywhere,
 *                    raked hard, minimal negative space (the busy one).
 *   4. Confluence  — a few currents (2–4 ring stacks) meeting off-centre, their
 *                    feathers colliding; counterweight pool opposite.
 *   5. River       — a torn current sweeping edge-to-edge full-bleed; a band of
 *                    marbled filaments crossing the whole canvas on a diagonal.
 *   6. Sparse      — 1–2 large blooms with vast shaped negative space; the calm,
 *                    breathing composition.
 *   7. Nonpareil   — the raked grid/comb pattern: parallel ink lines pulled into
 *                    the classic zig-zag nonpareil chevrons, full-field texture.
 *
 * The number of ink SOURCES, the comb/rake direction + frequency, density, and
 * placement all vary by layout so no two pieces read alike. Composition stays
 * strong: asymmetry, off-centre focal, active negative space (except the
 * deliberately-dense Stone/Nonpareil/Field layouts).
 *
 * BESPOKE PALETTE — named ink-combination identities designed FOR marbled ink.
 * Roles: paper (wet ground / pool, a COLOUR never near-black), inkA (dominant
 * pour), inkB (second pigment that combs against A), inkC (sparing accent),
 * vein (fine floating leaf/ink line), bleed (clean transition hue, anti-mud).
 * `richness` (0..1) leans the whole world more saturated/deeper so the set isn't
 * all pale rice-paper grounds.
 *
 * Deterministic per seed. Varied aspect. Rare chase events. Canvas ≤1280px.
 * Flow traces step-capped; no full-res per-pixel loops. FORCE_PAL honoured.
 */
const ENGINE = (function () {
  const K = KIT;

  /* SATURATED-WATER PALETTES (INK3). `paper` is no longer rice-paper — it is the
   * BATH: a saturated coloured water that owns the field. Every ground is a vivid
   * hue, lightness held in the rich mid-band (never milky). inkA/inkB/inkC are the
   * floated pigments (different hues so the marbling refracts colour); vein is the
   * fine bright leaf-line; bleed is the clean halo/transition hue (anti-mud).
   * richness leans the world deeper. The four jury heroes are preserved verbatim
   * in spirit: Crimson&Cobalt, Grape&Fuchsia, Ultramarine&Saffron, Cobalt&Coral. */
  const PALS = [
    // Hot-cyan bath, indigo + vermilion pours, gold leaf vein.
    { name: 'Cyan & Vermilion', paper: '#0bb6d6', inkA: '#142a8c', inkB: '#ff3b2c', inkC: '#7a2bd6', vein: '#ffe06b', bleed: '#ff9d5c', richness: 0.62 },
    // Deep jade-teal bath, emerald + coral pours, pale-jade veining.
    { name: 'Jade & Coral',       paper: '#0e9e86', inkA: '#063d2a', inkB: '#ff5a55', inkC: '#1d9bd1', vein: '#bff6e2', bleed: '#ffd06b', richness: 0.60 },
    // HERO: ultramarine bath, deep-ink + saffron pours, copper veins.
    { name: 'Ultramarine & Saffron', paper: '#2447d6', inkA: '#0a1a6e', inkB: '#ffae12', inkC: '#ff4f8b', vein: '#ff9a3d', bleed: '#5cd6ff', richness: 0.66 },
    // Magenta-blue bath, teal + hot-pink pours, electric-cyan vein.
    { name: 'Magenta & Teal',     paper: '#c41a8d', inkA: '#0b3a6e', inkB: '#0fc0cc', inkC: '#7c4dff', vein: '#5ff0ff', bleed: '#ffe14d', richness: 0.64 },
    // Cobalt-violet bath, violet + chartreuse pours, gold thread.
    { name: 'Violet & Chartreuse', paper: '#5a2bd6', inkA: '#1a0b5e', inkB: '#aef03d', inkC: '#ff5ec7', vein: '#fff3c0', bleed: '#5ce6ff', richness: 0.66 },
    // HERO: crimson/cobalt — saturated cobalt bath, crimson + ink pours, brass vein.
    { name: 'Crimson & Cobalt',   paper: '#1f54c4', inkA: '#d11e3c', inkB: '#0a1f6e', inkC: '#16b59b', vein: '#ffcf6b', bleed: '#ff8fb0', richness: 0.66 },
    // Tangerine bath, plum + scarlet pours, rose-gold veins (warm world).
    { name: 'Tangerine & Plum',   paper: '#ff6a1e', inkA: '#5a0b7a', inkB: '#d11e3c', inkC: '#ff2e88', vein: '#fff0d0', bleed: '#ffc21f', richness: 0.62 },
    // Emerald bath, deep-ink + amber pours, gold leaf (deep-jewel world).
    { name: 'Emerald & Gold',     paper: '#0f8a5a', inkA: '#063d2a', inkB: '#0a4a6e', inkC: '#ff9d2e', vein: '#ffe06b', bleed: '#7df0c0', richness: 0.66 },
    // HERO: grape/fuchsia — saturated grape bath, ink + fuchsia, electric-cyan bleed.
    { name: 'Grape & Fuchsia',    paper: '#7b2fb8', inkA: '#16124a', inkB: '#ff2bb0', inkC: '#ffd23f', vein: '#ffe6ff', bleed: '#39e6ff', richness: 0.70 },
    // Deep teal bath, scarlet + gold pours, warm ember bleed (jewel world).
    { name: 'Teal & Ember',       paper: '#0e7d7a', inkA: '#06313a', inkB: '#ff5a1e', inkC: '#ffd23f', vein: '#bdfff6', bleed: '#ff9d3d', richness: 0.68 },
    // HERO: cobalt/coral — saturated cobalt bath, ink + coral + chartreuse, peach bleed.
    { name: 'Cobalt & Coral',     paper: '#2f5fd0', inkA: '#0b1f6e', inkB: '#ff5a6e', inkC: '#caff39', vein: '#dfe9ff', bleed: '#ffd06b', richness: 0.68 },
    // Oxblood-rose bath, deep plum + tangerine, gold leaf (warm jewel).
    { name: 'Wine & Tangerine',   paper: '#c42f5a', inkA: '#3a0b2a', inkB: '#ff7a1e', inkC: '#ffd23f', vein: '#ffd9e6', bleed: '#ffb45c', richness: 0.66 },
    // Lime bath, magenta + violet pours, white-lime vein (toxic-sweet).
    { name: 'Lime & Magenta',     paper: '#8fd11e', inkA: '#7a1ea8', inkB: '#ff2bd6', inkC: '#1f54c4', vein: '#f0ffd0', bleed: '#39e6ff', richness: 0.60 },
    // Electric-pink bath, cobalt + cyan pours, lime vein (Edgerunner-bright).
    { name: 'Pink & Cobalt',      paper: '#e8266f', inkA: '#142a8c', inkB: '#00d0e6', inkC: '#caff39', vein: '#ffe6f0', bleed: '#ffd23f', richness: 0.64 },
  ];

  // varied aspect — portrait / landscape / square (square the minority)
  const FMTS = [
    { W: 1024, H: 1280, t: 'Portrait' },   // 4:5
    { W: 1000, H: 1500, t: 'Scroll' },     // 2:3 (suminagashi handscroll feel)
    { W: 1280, H: 853,  t: 'Vista' },      // 3:2
    { W: 1280, H: 720,  t: 'Wide' },       // 16:9
    { W: 1180, H: 1180, t: 'Square' },     // 1:1 (minority)
  ];
  function pickFmt(r) { const x = r(); return x < 0.26 ? FMTS[0] : x < 0.50 ? FMTS[1] : x < 0.72 ? FMTS[2] : x < 0.88 ? FMTS[3] : FMTS[4]; }

  // THE PRIMARY composition trait — each value is a different draw routine.
  const LAYOUTS = ['Suminagashi', 'Scatter', 'Stone', 'Confluence', 'River', 'Sparse', 'Nonpareil'];
  const COMB    = ['Calm', 'Combed', 'Torn'];   // how hard the current pulls
  // rare chase events
  const EVENTS = ['None','None','None','None','None','None','None','Gilded Veil','Eclipse Pool'];

  // ── Param draw (FIXED ORDER — Layout FIRST so traits() ↔ draw() agree) ──────
  function params(r) {
    const layout = K.pick(LAYOUTS, r);
    let pal = K.pick(PALS, r);
    if (globalThis.FORCE_PAL) pal = PALS.find((q) => q.name === globalThis.FORCE_PAL) || pal;
    const fmt = pickFmt(r);
    const comb = K.pick(COMB, r);
    const event = K.pick(EVENTS, r);
    // current strength — how far the curl-flow combs the rings
    const flow = comb === 'Calm' ? 0.8 + r() * 0.35 : comb === 'Combed' ? 1.1 + r() * 0.5 : 1.6 + r() * 0.7;
    const flowScale = 110 + r() * 100;     // curl noise spatial scale
    const drift = r() * Math.PI * 2;       // overall current / rake bias direction
    // rake frequency: how many comb tines across the field (varies the feather)
    const rakeFreq = 1.2 + r() * 2.6;
    return { layout, pal, fmt, comb, event, flow, flowScale, drift, rakeFreq };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Layout: p.layout, Palette: p.pal.name, Format: p.fmt.t, Current: p.comb, Event: p.event };
  }

  // HARD FLOOR the ground into the saturated mid-band: a milky/cream/pastel
  // bath can never generate. Lightness clamped to ~0.36–0.60, saturation lifted.
  function floorGround(hex) {
    const c = K.h2r(hex);
    const r = c[0] / 255, g = c[1] / 255, b = c[2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    let h = 0; const l = (mx + mn) / 2;
    let s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === r) h = ((g - b) / d) % 6;
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    // saturation floor + lightness clamp into the vivid mid-band
    s = K.clamp(Math.max(s, 0.62), 0, 1);
    const L = K.clamp(l, 0.36, 0.60);
    return K.hsl2hex(h, s, L);
  }

  // Apply richness: floor the bath to a saturated colour, deepen pigments.
  function richen(P) {
    const k = P.richness;
    const paper = floorGround(P.paper);
    return {
      paper,
      inkA: K.mix(P.inkA, '#0a0820', 0.10 * k),
      inkB: P.inkB,
      inkC: P.inkC,
      vein: P.vein,
      bleed: P.bleed,
      // a deepened pool edge used for vignettes / shadow settle
      deep: K.mix(paper, P.inkA, 0.22 + 0.18 * k),
      k,
    };
  }

  // ── MARBLING DISPLACEMENT — the heart of suminagashi. Returns displaced
  // position of (px,py) after the current drags the ink: a coherent curl eddy +
  // a strong directional COMB rake along the drift axis. Magnitude is large so
  // rings shear into long filaments. `gain` scales the whole displacement (lets
  // layouts dial the feather up/down). ──────────────────────────────────────
  function marble(noise, px, py, p, W, H, gain) {
    gain = gain == null ? 1 : gain;
    const minWH = Math.min(W, H);
    const sc = p.flowScale;
    const v = K.curl(noise, px / sc * 100, py / sc * 100, 1);
    const eddy = p.flow * minWH * 0.30 * gain;
    let dx = v[0] * eddy, dy = v[1] * eddy;
    const cd = Math.cos(p.drift), sd = Math.sin(p.drift);
    const perp = (-px * sd + py * cd) / minWH;
    const rake = Math.sin(perp * Math.PI * p.rakeFreq) * p.flow * minWH * 0.16 * gain;
    dx += cd * rake; dy += sd * rake;
    return [px + dx, py + dy];
  }

  // Trace a marbled ring into the current path (no stroke). Shared by the
  // feathered pigment stroke so halo + core + chroma sit on the SAME geometry.
  function tracRing(x, noise, ox, oy, rad, p, W, H, gain) {
    const segs = 150;
    x.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const m = marble(noise, ox + Math.cos(a) * rad, oy + Math.sin(a) * rad, p, W, H, gain);
      i === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
    }
    x.closePath();
  }

  // PIGMENT RING (INK3) — not a pencil contour. Three passes on the SAME marbled
  // path: (1) a wide, soft, BLEEDING halo in the bleed/accent hue (the wet-on-wet
  // watercolour bloom), (2) the coloured ink CORE line, (3) a thin chromatic
  // bleed offset (a screen-mode cyan↔magenta shimmer at the stroke) so crossings
  // refract colour. `col` is the core ink; `halo` the bleed hue (a different hue
  // from the core so adjacent rings refract). Lines stay graceful — the core is
  // crisp — but the stroke now reads as saturated coloured ink with a wet edge.
  function combRing(x, noise, ox, oy, rad, p, col, alpha, lw, W, H, gain, halo) {
    halo = halo || col;
    x.lineJoin = 'round'; x.lineCap = 'round';
    // (1) bleeding halo — a wide, soft, SATURATED feathered band painted straight
    // onto the bath (source-over) so it stays coloured pigment, never whitens.
    x.save();
    x.globalCompositeOperation = 'source-over';
    tracRing(x, noise, ox, oy, rad, p, W, H, gain);
    x.lineWidth = lw * 4.4;
    x.strokeStyle = K.rgba(halo, alpha * 0.18);
    x.stroke();
    tracRing(x, noise, ox, oy, rad, p, W, H, gain);
    x.lineWidth = lw * 2.4;
    x.strokeStyle = K.rgba(K.mix(col, halo, 0.5), alpha * 0.34);
    x.stroke();
    x.restore();
    // (2) chromatic bleed — faint complementary offset twins (lighter so they
    // refract a thin spectral shimmer at the edge, kept low so no whitening).
    x.save();
    x.globalCompositeOperation = 'lighter';
    tracRing(x, noise, ox + lw * 0.5, oy, rad, p, W, H, gain);
    x.lineWidth = lw * 0.9;
    x.strokeStyle = K.rgba(K.mix(col, '#ff2bd6', 0.6), alpha * 0.16);
    x.stroke();
    tracRing(x, noise, ox - lw * 0.5, oy, rad, p, W, H, gain);
    x.lineWidth = lw * 0.9;
    x.strokeStyle = K.rgba(K.mix(col, '#39e6ff', 0.6), alpha * 0.16);
    x.stroke();
    x.restore();
    // (3) the coloured ink CORE — crisp, fully saturated, the graceful line.
    tracRing(x, noise, ox, oy, rad, p, W, H, gain);
    x.lineWidth = lw;
    x.strokeStyle = K.rgba(col, Math.min(1, alpha * 1.1));
    x.stroke();
  }

  // Filled combed blob (solid pigment body), marbled.
  function combBlob(x, noise, ox, oy, rad, p, col, alpha, W, H, gain) {
    const segs = 110;
    x.beginPath();
    for (let i = 0; i <= segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      const m = marble(noise, ox + Math.cos(a) * rad, oy + Math.sin(a) * rad, p, W, H, gain);
      i === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
    }
    x.closePath();
    x.fillStyle = K.rgba(col, alpha);
    x.fill();
  }

  // A whole combed concentric ring STACK at a source (the suminagashi drop).
  // INK3: rings alternate between TWO saturated hues, and each ring's bleed halo
  // is pulled from the OTHER hue so neighbouring bands refract colour into one
  // another. ringPair = [coreA, coreB, haloA, haloB].
  function ringStack(x, noise, ox, oy, baseR, gap, n, p, P, ringPair, alphaMul, lwMul, W, H, gain) {
    const cA = ringPair[0], cB = ringPair[1];
    const hA = ringPair[2] || ringPair[1], hB = ringPair[3] || ringPair[0];
    for (let i = 0; i < n; i++) {
      const rad = baseR + i * gap;
      const even = i % 2 === 0;
      const col = even ? cA : cB;
      const halo = even ? hA : hB;
      const alpha = (even ? 0.86 : 0.7) * (1 - 0.34 * i / n) * (alphaMul == null ? 1 : alphaMul);
      const lw = (1.6 + (1 - i / n) * 2.6) * (lwMul == null ? 1 : lwMul);
      combRing(x, noise, ox, oy, rad, p, col, alpha, lw, W, H, gain, halo);
    }
  }

  // Alcohol-ink BLOOM: a marbled cellular pour (filled body + cell contours).
  function bloom(x, noise, bx, by, rad, p, core, edge, alpha, W, H, gain) {
    x.save();
    x.beginPath();
    const segs = 84;
    for (let j = 0; j <= segs; j++) {
      const a = (j / segs) * Math.PI * 2;
      const wob = 1 + 0.14 * noise.fbm(Math.cos(a) * 2.2 + bx * 0.004, Math.sin(a) * 2.2 + by * 0.004, 3);
      const m = marble(noise, bx + Math.cos(a) * rad * wob, by + Math.sin(a) * rad * wob, p, W, H, gain);
      j === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
    }
    x.closePath();
    x.clip();
    const g = x.createRadialGradient(bx, by, rad * 0.05, bx, by, rad * 1.25);
    g.addColorStop(0, K.rgba(core, alpha));
    g.addColorStop(0.55, K.rgba(core, alpha * 0.72));
    g.addColorStop(0.85, K.rgba(edge, alpha * 0.5));
    g.addColorStop(1, K.rgba(edge, 0));
    x.fillStyle = g;
    x.fillRect(bx - rad * 1.4, by - rad * 1.4, rad * 2.8, rad * 2.8);
    x.restore();
    const cells = 3 + Math.floor(rad / 55);
    for (let i = 1; i <= cells; i++) {
      const rr = rad * (0.5 + 0.55 * (i / cells));
      x.beginPath();
      const cs = 72;
      for (let j = 0; j <= cs; j++) {
        const a = (j / cs) * Math.PI * 2;
        const wob = 1 + 0.10 * noise.fbm(Math.cos(a) * 2 + i * 3.1, Math.sin(a) * 2 + by * 0.003, 3);
        const m = marble(noise, bx + Math.cos(a) * rr * wob, by + Math.sin(a) * rr * wob, p, W, H, gain);
        j === 0 ? x.moveTo(m[0], m[1]) : x.lineTo(m[0], m[1]);
      }
      x.closePath();
      x.lineWidth = 1.1;
      x.strokeStyle = K.rgba(edge, alpha * (0.28 + 0.14 * (1 - i / cells)));
      x.lineJoin = 'round';
      x.stroke();
    }
  }

  // Fine floating vein streaming along the current.
  function vein(x, noise, sx, sy, p, col, alpha, len, lw, W, H) {
    const sc = p.flowScale;
    let px = sx, py = sy;
    x.beginPath(); x.moveTo(px, py);
    const steps = Math.min(160, Math.floor(len));
    const cd = Math.cos(p.drift), sd = Math.sin(p.drift);
    for (let i = 0; i < steps; i++) {
      const v = K.curl(noise, px / sc * 100, py / sc * 100, 1);
      const mag = Math.hypot(v[0], v[1]) + 1e-5;
      px += (v[0] / mag) * 2.6 + cd * 0.7;
      py += (v[1] / mag) * 2.6 + sd * 0.7;
      x.lineTo(px, py);
    }
    x.lineWidth = lw;
    x.strokeStyle = K.rgba(col, alpha);
    x.lineCap = 'round';
    x.lineJoin = 'round';
    x.stroke();
  }

  // contrast guard (INK3): if an ink reads too close to the BATH luminance, push
  // it AWAY in luminance while keeping it saturated — toward a deep ink if the
  // bath is light, toward a bright accent if the bath is dark. Never muddies.
  function guarder(R) {
    const pl = K.lum(R.paper);
    return (c) => {
      if (Math.abs(K.lum(c) - pl) >= 0.18) return c;
      return pl > 0.5 ? K.mix(c, R.inkA, 0.5) : K.mix(c, '#ffffff', 0.32);
    };
  }
  // Build a vivid 4-tuple ringPair [coreA, coreB, haloA, haloB] from two inks +
  // their bleed halos, run through the contrast guard.
  function pair(R, guard, a, b, ha, hb) {
    return [guard(a), guard(b), ha || R.bleed, hb || R.vein];
  }
  // VIVID ring palette for a stack — the cores are SATURATED pigment hues
  // (inkB/inkC/bleed/vein), not the deep near-black ink. A `variant` index lets
  // adjacent ring SYSTEMS take different hue combinations so the marbling
  // refracts colour across the canvas. The deep ink (inkA) appears at most once,
  // as the dark counter-band, so rings read as coloured ink not graphite.
  function ringHues(R, guard, variant) {
    // cores are SATURATED pigments only (inkB/inkC + a deepened-bleed); the pale
    // vein/bleed hues are used ONLY as halos, never as the ring core line.
    const v = ((variant % 4) + 4) % 4;
    const satBleed = K.mix(R.bleed, R.inkB, 0.35);  // keep "bleed" core saturated
    const combos = [
      [R.inkB,   R.inkC,   R.bleed, R.vein],
      [R.inkC,   satBleed, R.vein,  R.bleed],
      [satBleed, R.inkB,   R.inkC,  R.bleed],
      [R.inkB,   K.mix(R.inkA, R.inkB, 0.5), R.bleed, R.vein], // one deep-counter band
    ];
    const c = combos[v];
    return [guard(c[0]), guard(c[1]), c[2], c[3]];
  }

  // Scatter a few clean-bleed tendrils + floating veins around a region.
  function dressing(x, noise, cx, cy, spread, p, P, R, W, H, tendN, veinN) {
    const minWH = Math.min(W, H);
    const guard = guarder(R);
    for (let i = 0; i < tendN; i++) {
      const ang = p.r() * Math.PI * 2;
      const dist = (0.02 + p.r() * spread) * minWH;
      const sx = cx + Math.cos(ang) * dist, sy = cy + Math.sin(ang) * dist;
      const col = guard(K.mix(R.bleed, p.r() < 0.5 ? R.inkA : R.inkB, p.r() * 0.4));
      vein(x, noise, sx, sy, p, col, 0.14 + p.r() * 0.16, 28 + p.r() * 46, 1.0 + p.r() * 1.3, W, H);
    }
    for (let i = 0; i < veinN; i++) {
      let sx, sy;
      if (i % 2 === 0) {
        const ang = p.r() * Math.PI * 2, dist = (0.02 + p.r() * spread * 1.2) * minWH;
        sx = cx + Math.cos(ang) * dist; sy = cy + Math.sin(ang) * dist;
      } else {
        const edge = Math.floor(p.r() * 4);
        sx = edge === 0 ? 0 : edge === 1 ? W : p.r() * W;
        sy = edge === 2 ? 0 : edge === 3 ? H : p.r() * H;
      }
      const col = p.r() < 0.7 ? R.vein : K.mix(R.vein, R.inkC, 0.4);
      vein(x, noise, sx, sy, p, col, 0.14 + p.r() * 0.16, 90 + p.r() * 55, 0.6 + p.r() * 1.0, W, H);
    }
  }

  /* ════════════════════════════════════════════════════════════════════════
   * THE SEVEN LAYOUTS — each composes the marbling primitives differently.
   * Each receives (x, noise, p, P, R, W, H) where p.r is the shared RNG.
   * ════════════════════════════════════════════════════════════════════════ */

  // 1. SUMINAGASHI — one off-centre ring stack on a THIRDS intersection, combed
  //    into a long feather running full-bleed on a diagonal, counterweighted by a
  //    small dense bright stain opposite. Never dead-centre.
  function layoutSuminagashi(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    // hard thirds intersection (~1/3 in from an edge), tiny jitter only
    const cx = (r() < 0.5 ? 1 / 3 : 2 / 3) * W + (r() - 0.5) * 0.03 * W;
    const cy = (r() < 0.5 ? 1 / 3 : 2 / 3) * H + (r() - 0.5) * 0.03 * H;
    const guard = guarder(R);
    // negative-space pool opposite
    pool(x, (W - cx) , (H - cy), Math.max(W, H) * 0.6, p, P, R, W, H);
    // a couple of soft pigment bodies under the rings (saturated, not deep-ink)
    for (let i = 0; i < 3; i++) {
      const ang = r() * Math.PI * 2, dist = (0.03 + r() * 0.16) * minWH;
      combBlob(x, noise, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist,
               (0.08 + r() * 0.14) * minWH, p, r() < 0.5 ? R.inkB : R.inkC, 0.16 + r() * 0.12, W, H, 1);
    }
    // 1–2 ring stacks, dense
    const sources = K.rint(r, 1, 2);
    for (let s = 0; s < sources; s++) {
      const ang = r() * Math.PI * 2, dist = (r() * 0.10) * minWH;
      const ox = cx + Math.cos(ang) * dist, oy = cy + Math.sin(ang) * dist;
      const baseR = (0.02 + r() * 0.02) * minWH, gap = (0.016 + r() * 0.015) * minWH;
      const ringPair = ringHues(R, guard, s + Math.floor(r() * 4));
      ringStack(x, noise, ox, oy, baseR, gap, K.rint(r, 10, 16), p, P, ringPair, 1, 1, W, H, 1);
    }
    // blooms nested into the worked region
    for (let i = 0; i < K.rint(r, 2, 4); i++) {
      const ang = r() * Math.PI * 2, dist = (0.03 + r() * 0.18) * minWH;
      const bx = cx + Math.cos(ang) * dist, by = cy + Math.sin(ang) * dist;
      const core = r() < 0.5 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
      bloom(x, noise, bx, by, (0.07 + r() * 0.13) * minWH, p, core, edge, 0.5 + r() * 0.18, W, H, 1);
    }
    // small DENSE bright stain counterweighted opposite (asymmetric balance)
    {
      const fx = (W - cx) + (r() - 0.5) * 0.06 * W, fy = (H - cy) + (r() - 0.5) * 0.06 * H;
      const fsz = (0.04 + r() * 0.035) * minWH;
      const core = r() < 0.5 ? R.inkC : R.bleed, edge = K.mix(core, R.vein, 0.4);
      bloom(x, noise, fx, fy, fsz, p, core, edge, 0.72, W, H, 0.8);
    }
    // full-bleed diagonal feather: veins exiting the frame on the drift axis
    diagFeather(x, noise, cx, cy, p, R, guard, W, H, 14 + Math.floor(p.flow * 8));
    dressing(x, noise, cx, cy, 0.28, p, P, R, W, H, 10 + Math.floor(p.flow * 7), 14 + Math.floor(p.flow * 9));
  }

  // Full-bleed diagonal feather — a sheaf of marbled veins started near the focal
  // and streaming along the drift axis until they EXIT the frame, so nothing is
  // boxed inside the canvas. Pulls saturated hues so the feather reads as colour.
  function diagFeather(x, noise, cx, cy, p, R, guard, W, H, n) {
    const minWH = Math.min(W, H);
    const cd = Math.cos(p.drift), sd = Math.sin(p.drift), pcd = -sd, psd = cd;
    x.save(); x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < n; i++) {
      const off = (p.r() - 0.5) * 0.5 * minWH;
      const back = (0.1 + p.r() * 0.25) * minWH;
      const sx = cx - cd * back + pcd * off, sy = cy - sd * back + psd * off;
      const col = p.r() < 0.5 ? R.vein : guard(K.mix(R.bleed, p.r() < 0.5 ? R.inkB : R.inkC, 0.45));
      vein(x, noise, sx, sy, p, col, 0.16 + p.r() * 0.18, 150 + p.r() * 90, 0.7 + p.r() * 1.3, W, H);
    }
    x.restore();
  }

  // 2. SCATTER — many ink drops/rings strewn across a thirds/phi constellation.
  function layoutScatter(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    const xs = [K.INVPHI, 1 - K.INVPHI, 1 / 3, 2 / 3, 0.5, 0.18, 0.82];
    const ys = [K.INVPHI, 1 - K.INVPHI, 1 / 3, 2 / 3, 0.5, 0.2, 0.8];
    const pts = [];
    for (const ax of xs) for (const ay of ys) pts.push([ax, ay]);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
    const n = K.rint(r, 9, 15);
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i % pts.length];
      const ox = W * (ax + (r() - 0.5) * 0.08), oy = H * (ay + (r() - 0.5) * 0.08);
      const kind = r();
      // power-skew the size: most drops small, a few large → real scatter rhythm
      const ss = r(); const sz = (0.035 + ss * ss * 0.16) * minWH;
      if (kind < 0.78) {
        // ring drop — the dominant element; on a small solid pigment core so it
        // reads as ink, not a pale line. Crisp legible rings, varied size.
        const body = r() < 0.5 ? R.inkA : R.inkB;
        combBlob(x, noise, ox, oy, sz * (0.5 + r() * 0.3), p, body, 0.26 + r() * 0.16, W, H, 0.7);
        const ringPair = ringHues(R, guard, i);
        const baseR = sz * 0.16, gap = sz * (0.14 + r() * 0.08);
        ringStack(x, noise, ox, oy, baseR, gap, K.rint(r, 5, 10), p, P, ringPair, 1.1, 1.0, W, H, 0.7);
      } else {
        // a sheared bloom for incident — higher gain so it stretches into the
        // current rather than sitting as a fuzzy disc.
        const core = r() < 0.4 ? R.inkA : r() < 0.7 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
        bloom(x, noise, ox, oy, sz, p, core, edge, 0.55 + r() * 0.2, W, H, 1.1);
      }
    }
    // connective veins drawing the constellation together
    dressing(x, noise, 0.5 * W, 0.5 * H, 0.46, p, P, R, W, H, 10, 16);
  }

  // 3. STONE — dense full-field combed stone marble: rings everywhere, hard rake,
  //    minimal negative space. The busy, fully-worked piece.
  function layoutStone(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    // a dense grid of overlapping ring stacks blanketing the whole canvas, each
    // seated on its own solid (full-opacity) marbled pigment body so the field
    // reads as worked stone, not soft blobs floating on paper.
    const cols = K.rint(r, 5, 7), rows = K.rint(r, 5, 8);
    for (let cyi = 0; cyi < rows; cyi++) {
      for (let cxi = 0; cxi < cols; cxi++) {
        const ox = W * ((cxi + 0.5 + (r() - 0.5) * 0.7) / cols);
        const oy = H * ((cyi + 0.5 + (r() - 0.5) * 0.7) / rows);
        const sz = minWH * (0.05 + r() * 0.06);
        const body = [R.inkA, R.inkB, R.inkC][Math.floor(r() * 3)];
        // solid pigment core, marbled — gives the field weight + colour
        combBlob(x, noise, ox, oy, sz * (0.7 + r() * 0.4), p, body, 0.32 + r() * 0.18, W, H, 1.0);
        // crisp combed rings on top (coloured, not just pale bleed)
        const ringPair = ringHues(R, guard, cxi + cyi);
        ringStack(x, noise, ox, oy, sz * 0.18, sz * (0.16 + r() * 0.08), K.rint(r, 5, 9), p, P, ringPair, 1.05, 1.0, W, H, 0.85);
      }
    }
    dressing(x, noise, 0.5 * W, 0.5 * H, 0.55, p, P, R, W, H, 16, 22);
  }

  // 4. CONFLUENCE — a few currents meeting off-centre, feathers colliding.
  function layoutConfluence(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    const cx = (r() < 0.5 ? 0.38 : 0.62) * W, cy = (r() < 0.5 ? 0.4 : 0.6) * H;
    pool(x, (W - cx), (H - cy), Math.max(W, H) * 0.55, p, P, R, W, H);
    // bodies clustered around the meeting point
    for (let i = 0; i < K.rint(r, 4, 7); i++) {
      const ang = r() * Math.PI * 2, dist = (0.04 + r() * 0.24) * minWH;
      const col = [R.inkA, R.inkB, R.inkC][Math.floor(r() * 3)];
      combBlob(x, noise, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist,
               (0.07 + r() * 0.15) * minWH, p, col, 0.16 + r() * 0.14, W, H, 1);
    }
    // 2–4 ring stacks at distinct offsets — the colliding currents
    const sources = K.rint(r, 2, 4);
    for (let s = 0; s < sources; s++) {
      const ang = (s / sources) * Math.PI * 2 + r() * 0.8;
      const dist = (0.08 + r() * 0.18) * minWH;
      const ox = cx + Math.cos(ang) * dist, oy = cy + Math.sin(ang) * dist;
      const ringPair = ringHues(R, guard, s);
      ringStack(x, noise, ox, oy, minWH * (0.02 + r() * 0.02), minWH * (0.015 + r() * 0.014),
                K.rint(r, 8, 13), p, P, ringPair, 1, 1, W, H, 1);
    }
    for (let i = 0; i < K.rint(r, 3, 5); i++) {
      const ang = r() * Math.PI * 2, dist = (0.03 + r() * 0.2) * minWH;
      const core = r() < 0.5 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
      bloom(x, noise, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist,
            (0.07 + r() * 0.13) * minWH, p, core, edge, 0.5 + r() * 0.18, W, H, 1);
    }
    dressing(x, noise, cx, cy, 0.3, p, P, R, W, H, 12 + Math.floor(p.flow * 8), 16 + Math.floor(p.flow * 9));
  }

  // 5. RIVER — a torn current sweeping edge-to-edge full-bleed (diagonal band).
  function layoutRiver(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    // axis of the river ~ drift; place a band of sources along it
    const ang = p.drift;
    const cd = Math.cos(ang), sd = Math.sin(ang);
    const midx = 0.5 * W + (r() - 0.5) * 0.2 * W, midy = 0.5 * H + (r() - 0.5) * 0.2 * H;
    // perpendicular offset of the band off-centre (asymmetry)
    const pcd = -sd, psd = cd;
    const bandOff = (r() - 0.5) * 0.5 * minWH;
    const bx = midx + pcd * bandOff, by = midy + psd * bandOff;
    // negative space on the far side of the band
    pool(x, midx - pcd * minWH * 0.5, midy - psd * minWH * 0.5, Math.max(W, H) * 0.6, p, P, R, W, H);
    // a chain of ring stacks + bodies strung along the river axis, off both ends
    const span = Math.hypot(W, H) * 0.65;
    const N = K.rint(r, 5, 8);
    for (let i = 0; i < N; i++) {
      const t = (i / (N - 1) - 0.5) * 2;       // -1..1 along the axis
      const ox = bx + cd * t * span + pcd * (r() - 0.5) * 0.18 * minWH;
      const oy = by + sd * t * span + psd * (r() - 0.5) * 0.18 * minWH;
      combBlob(x, noise, ox, oy, (0.08 + r() * 0.14) * minWH, p,
               [R.inkA, R.inkB][Math.floor(r() * 2)], 0.14 + r() * 0.12, W, H, 1.15);
      const ringPair = ringHues(R, guard, i);
      ringStack(x, noise, ox, oy, minWH * 0.02, minWH * (0.018 + r() * 0.012),
                K.rint(r, 7, 12), p, P, ringPair, 0.95, 1, W, H, 1.2);
      if (r() < 0.5) {
        const core = r() < 0.5 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
        bloom(x, noise, ox, oy, (0.06 + r() * 0.1) * minWH, p, core, edge, 0.5, W, H, 1.2);
      }
    }
    // veins streaming along the whole river (started from the upstream edge)
    x.save(); x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 22 + Math.floor(p.flow * 10); i++) {
      const t = (r() - 0.5) * 2;
      const sx = bx + cd * t * span + pcd * (r() - 0.5) * 0.4 * minWH;
      const sy = by + sd * t * span + psd * (r() - 0.5) * 0.4 * minWH;
      const col = r() < 0.6 ? R.vein : guard(K.mix(R.bleed, R.inkA, 0.3));
      vein(x, noise, sx, sy, p, col, 0.14 + r() * 0.16, 110 + r() * 50, 0.6 + r() * 1.1, W, H);
    }
    x.restore();
  }

  // 6. SPARSE — one bold focal on a thirds point + a small DENSE bright stain
  //    counterweighted opposite, breathing (but never BLANK) saturated water
  //    between. INK3 kills the near-empty "lotus" wash; every Sparse seed now
  //    carries a substantial coloured focal and a bright opposing incident.
  function layoutSparse(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    // strong focal on a thirds intersection ~1/3 in from an edge
    const cx = (r() < 0.5 ? 1 / 3 : 2 / 3) * W + (r() - 0.5) * 0.04 * W;
    const cy = (r() < 0.5 ? 1 / 3 : 2 / 3) * H + (r() - 0.5) * 0.04 * H;
    pool(x, (W - cx), (H - cy), Math.max(W, H) * 0.6, p, P, R, W, H);
    // saturated drifting filaments through the negative space — reads as moving
    // dyed water, never a dead field.
    x.save(); x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 7; i++) {
      const sx = (W - cx) + (r() - 0.5) * 0.6 * W, sy = (H - cy) + (r() - 0.5) * 0.6 * H;
      vein(x, noise, sx, sy, p, K.mix(R.bleed, r() < 0.5 ? R.inkB : R.inkC, 0.4), 0.08 + r() * 0.08, 100 + r() * 60, 0.8 + r() * 1.0, W, H);
    }
    x.restore();
    // sub-mode keeps Sparse seeds from reading alike (lotus removed — it blanked):
    //   'feather' — one bold ring stack stretched hard into a long feather
    //   'twin'    — a big focal + a smaller satellite
    const mode = r() < 0.55 ? 'feather' : 'twin';
    const big = mode === 'twin' ? 2 : 1;
    for (let i = 0; i < big; i++) {
      const isSat = i === 1;
      const ox = cx + (r() - 0.5) * 0.12 * W + (isSat ? (r() - 0.5) * 0.3 * W : 0);
      const oy = cy + (r() - 0.5) * 0.12 * H + (isSat ? (r() - 0.5) * 0.3 * H : 0);
      const sz = (isSat ? 0.07 + r() * 0.05 : 0.17 + r() * 0.11) * minWH;
      const gain = mode === 'feather' ? 1.4 : 0.8;
      const ringPair = ringHues(R, guard, i + (isSat ? 2 : 0));
      combBlob(x, noise, ox, oy, sz * 1.05, p, r() < 0.5 ? R.inkB : R.inkC, 0.18 + r() * 0.12, W, H, gain);
      ringStack(x, noise, ox, oy, sz * 0.12, sz * (0.1 + r() * 0.07), K.rint(r, 8, 14), p, P, ringPair, 1.05, 1, W, H, gain);
      const core = r() < 0.5 ? R.inkB : R.inkC, edge = K.mix(core, R.bleed, 0.45);
      bloom(x, noise, ox, oy, sz, p, core, edge, 0.5 + r() * 0.18, W, H, gain);
    }
    // a small DENSE bright stain counterweighted opposite — the asymmetric balance.
    {
      const fx = (W - cx) + (r() - 0.5) * 0.08 * W, fy = (H - cy) + (r() - 0.5) * 0.08 * H;
      const fsz = (0.05 + r() * 0.04) * minWH;
      const core = r() < 0.5 ? R.inkC : R.bleed, edge = K.mix(core, R.vein, 0.4);
      bloom(x, noise, fx, fy, fsz, p, core, edge, 0.7, W, H, 0.8);
      const ringPair = ringHues(R, guard, 3);
      ringStack(x, noise, fx, fy, fsz * 0.2, fsz * 0.22, K.rint(r, 4, 6), p, P, ringPair, 1.1, 0.9, W, H, 0.8);
    }
    dressing(x, noise, cx, cy, 0.26, p, P, R, W, H, 5, 7);
  }

  // 7. NONPAREIL — the raked grid/comb: parallel ink lines pulled into chevrons.
  function layoutNonpareil(x, noise, p, P, R, W, H) {
    const r = p.r, minWH = Math.min(W, H);
    const guard = guarder(R);
    // direction of the parallel base lines (then raked perpendicular)
    const ang = p.drift;
    const cd = Math.cos(ang), sd = Math.sin(ang);
    const diag = Math.hypot(W, H);
    const lineGap = minWH * (0.014 + r() * 0.012);  // tighter spacing → real comb
    const nLines = Math.ceil((diag * 1.4) / lineGap);
    const cxm = W / 2, cym = H / 2;
    // alternating ink colours for the parallel lines
    const cA = guard(R.inkA), cB = guard(R.inkB), cBl = R.bleed;
    const cols = [cA, cBl, cB, cBl];
    // DEDICATED CHEVRON RAKE — the nonpareil signature. After laying parallel
    // base lines, a comb pulled PERPENDICULAR to them drags each line into the
    // classic zig-zag. A high-frequency sinusoid along the line axis (period =
    // combPeriod) pushed perpendicular, amplitude ~ a fraction of lineGap so
    // neighbours interleave into chevrons. Plus a gentle curl so it's organic.
    const combPeriod = minWH * (0.06 + r() * 0.08);   // chevron wavelength
    const amp = lineGap * (1.6 + r() * 1.4);          // chevron throw
    const phaseDrift = (r() - 0.5) * 2;               // slow phase walk → waviness
    x.save(); x.globalCompositeOperation = 'source-over';
    for (let li = 0; li < nLines; li++) {
      const off = (li - nLines / 2) * lineGap;
      const ox = cxm + (-sd) * off, oy = cym + (cd) * off;
      const col = cols[li % cols.length];
      const alpha = (li % 2 === 0) ? 0.8 : 0.6;
      const lw = (li % 4 === 0) ? 2.4 : 1.6;
      x.beginPath();
      const segs = 260;
      for (let i = 0; i <= segs; i++) {
        const t = (i / segs - 0.5) * 2;
        const along = t * diag * 0.7;                 // distance along the line
        let lx = ox + cd * along, ly = oy + sd * along;
        // perpendicular chevron displacement (high frequency)
        const wob = noise.fbm(lx / 260, ly / 260, 3) * phaseDrift;
        const ch = Math.sin((along / combPeriod) * Math.PI * 2 + wob * 3) * amp;
        lx += (-sd) * ch; ly += (cd) * ch;
        // a touch of curl eddy for organic break-up (small)
        const v = K.curl(noise, lx / p.flowScale * 100, ly / p.flowScale * 100, 1);
        lx += v[0] * minWH * 0.04 * p.flow; ly += v[1] * minWH * 0.04 * p.flow;
        i === 0 ? x.moveTo(lx, ly) : x.lineTo(lx, ly);
      }
      x.lineWidth = lw;
      x.strokeStyle = K.rgba(col, alpha);
      x.lineJoin = 'round'; x.lineCap = 'round';
      x.stroke();
    }
    x.restore();
    // a few drops sitting on the comb for incident
    for (let i = 0; i < K.rint(r, 2, 5); i++) {
      const ox = W * (0.2 + r() * 0.6), oy = H * (0.2 + r() * 0.6);
      const core = r() < 0.5 ? R.inkC : R.inkB, edge = K.mix(core, R.bleed, 0.45);
      bloom(x, noise, ox, oy, (0.05 + r() * 0.07) * minWH, p, core, edge, 0.5, W, H, 1.0);
    }
    dressing(x, noise, cxm, cym, 0.4, p, P, R, W, H, 6, 10);
  }

  // Shaped negative-space pool (INK3): a soft DEEPENING of the bath, not a
  // lightening — keeps the negative space saturated coloured water, never milky.
  // A gentle saturated current of inkB/bleed swept through it (screen) so the
  // breathing field still carries colour and motion.
  function pool(x, px, py, rad, p, P, R, W, H) {
    x.save(); x.globalCompositeOperation = 'multiply';
    const cg = x.createRadialGradient(px, py, 0, px, py, rad);
    cg.addColorStop(0, K.rgba(K.mix('#ffffff', R.deep, 0.30), 1));
    cg.addColorStop(0.6, K.rgba(K.mix('#ffffff', R.deep, 0.14), 1));
    cg.addColorStop(1, 'rgba(255,255,255,1)');
    x.fillStyle = cg; x.fillRect(0, 0, W, H);
    x.restore();
    x.save(); x.globalCompositeOperation = 'screen';
    const sg = x.createRadialGradient(px, py, 0, px, py, rad * 0.9);
    sg.addColorStop(0, K.rgba(K.mix(R.paper, R.bleed, 0.6), 0.10));
    sg.addColorStop(1, K.rgba(R.paper, 0));
    x.fillStyle = sg; x.fillRect(0, 0, W, H);
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r);
    p.r = r;                                  // expose the RNG to layouts
    const P = p.pal, R = richen(P);
    const W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const minWH = Math.min(W, H);

    // ── THE WATER IS THE GROUND (INK3) — a SATURATED coloured bath owning the
    // field. Diagonal two-tone wash: a brighter pour-edge bleeding into the deep
    // pool, both saturated. Never milky.
    const gg = x.createLinearGradient(0, 0, W, H);
    gg.addColorStop(0, K.mix(R.paper, R.bleed, 0.22));
    gg.addColorStop(0.5, R.paper);
    gg.addColorStop(1, K.mix(R.paper, R.inkA, 0.30 + 0.14 * R.k));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);

    // large-scale pigment DRIFT in the water itself — broad saturated currents of
    // bleed/inkB hue swept on a diagonal so the bath reads as MOVING dyed water,
    // not a flat fill. Screen so it lifts colour, never darkens to mud.
    x.save(); x.globalCompositeOperation = 'screen';
    const dStep = Math.max(5, Math.floor(minWH / 130));
    const driftA = K.h2r(K.mix(R.paper, R.bleed, 0.55));
    const driftB = K.h2r(K.mix(R.paper, R.inkB, 0.5));
    for (let yy = 0; yy < H; yy += dStep) {
      for (let xx = 0; xx < W; xx += dStep) {
        const n = (noise.fbm(xx / 320 + 4, yy / 320 - 2, 4) + 1) / 2;
        const a = K.clamp((n - 0.5) * 0.34, 0, 0.20);
        if (a < 0.012) continue;
        const c = n > 0.55 ? driftA : driftB;
        x.fillStyle = 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
        x.fillRect(xx, yy, dStep + 1, dStep + 1);
      }
    }
    x.restore();

    // subtle fbm deepening so the pool has tonal body (multiply, light)
    x.save(); x.globalCompositeOperation = 'multiply';
    const stainStep = Math.max(4, Math.floor(minWH / 150));
    const stainCol = K.h2r(K.mix(R.paper, R.inkA, 0.22));
    for (let yy = 0; yy < H; yy += stainStep) {
      for (let xx = 0; xx < W; xx += stainStep) {
        const n = (noise.fbm(xx / 240, yy / 240, 4) + 1) / 2;
        const a = K.clamp((n - 0.5) * 0.16, 0, 0.12);
        if (a < 0.01) continue;
        x.fillStyle = 'rgba(' + stainCol[0] + ',' + stainCol[1] + ',' + stainCol[2] + ',' + a + ')';
        x.fillRect(xx, yy, stainStep + 1, stainStep + 1);
      }
    }
    x.restore();

    // ── THE LAYOUT — the primary structural axis ──
    switch (p.layout) {
      case 'Suminagashi': layoutSuminagashi(x, noise, p, P, R, W, H); break;
      case 'Scatter':     layoutScatter(x, noise, p, P, R, W, H); break;
      case 'Stone':       layoutStone(x, noise, p, P, R, W, H); break;
      case 'Confluence':  layoutConfluence(x, noise, p, P, R, W, H); break;
      case 'River':       layoutRiver(x, noise, p, P, R, W, H); break;
      case 'Sparse':      layoutSparse(x, noise, p, P, R, W, H); break;
      case 'Nonpareil':   layoutNonpareil(x, noise, p, P, R, W, H); break;
    }

    // ── RARE CHASE EVENTS ──
    const cx = 0.5 * W, cy = 0.5 * H;
    if (p.event === 'Gilded Veil') {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 60; i++) {
        const ang = r() * Math.PI * 2, dist = (r() * 0.4) * minWH;
        vein(x, noise, cx + Math.cos(ang) * dist, cy + Math.sin(ang) * dist, p, R.vein, 0.08 + r() * 0.1, 80 + r() * 60, 0.5 + r() * 0.8, W, H);
      }
      K.bloom(x, cx, cy, minWH * 0.4, R.vein, 0.10);
      x.restore();
    } else if (p.event === 'Eclipse Pool') {
      // off-centre on a thirds point (never dead-centre)
      const ex = (r() < 0.5 ? 1 / 3 : 2 / 3) * W, ey = (r() < 0.5 ? 1 / 3 : 2 / 3) * H;
      const er = minWH * 0.18;
      combBlob(x, noise, ex, ey, er, p, K.mix(R.inkA, '#10122a', 0.4), 0.62, W, H, 1);
      for (let i = 0; i < 6; i++) combRing(x, noise, ex, ey, er + i * minWH * 0.012, p, R.bleed, 0.5 * (1 - i / 8), 1.8, W, H, 1, R.vein);
    }

    // ── MATTE FINISH — paper tooth + grain + soft coloured edge settle (never black).
    K.mottle(x, 0, 0, W, H, R.inkA, 6500, r, 'soft-light');
    K.grain(x, W, H, 1500, r);
    // soft coloured edge settle — pigment pools slightly darker toward the FRAME
    // EDGES only (a gentle paper vignette toward the inked-paper hue, never black).
    // Kept light + edge-confined so it never washes the worked centre to pale.
    x.save(); x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(cx, cy, Math.max(W, H) * 0.45, cx, cy, Math.max(W, H) * 0.95);
    vg.addColorStop(0, 'rgba(255,255,255,1)');
    vg.addColorStop(1, K.rgba(K.mix('#ffffff', R.deep, 0.55), 1));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'ink3', draw, traits };
})();


function makeRender(raw, traitsOf) {
  return (canvas, tokenId, width) => {
    const off = document.createElement('canvas');
    raw(off, tokenId);
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round((W * off.height) / off.width));
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    if (c) c.drawImage(off, 0, 0, W, H);
    return { aspect: off.width / off.height, traits: traitsOf(tokenId) };
  };
}

export const renderBloomwater: EngineFn = makeRender(ENGINE.draw, ENGINE.traits);
export const bloomwaterTraits: TraitsFn = (id) => ENGINE.traits(id);
export const bloomwaterSchema: TraitSchema = { traits: [
  {
    "name": "Layout",
    "values": [
      "Confluence",
      "Sparse",
      "Scatter",
      "Nonpareil",
      "River",
      "Suminagashi",
      "Stone"
    ],
    "subtraits": [
      { "name": "Combed", "values": ["Nonpareil", "Suminagashi"] },
      { "name": "Flowing", "values": ["Confluence", "River"] },
      { "name": "Dispersed", "values": ["Sparse", "Scatter", "Stone"] },
    ]
  },
  {
    "name": "Palette",
    "values": [
      "Tangerine & Plum",
      "Emerald & Gold",
      "Crimson & Cobalt",
      "Cobalt & Coral",
      "Lime & Magenta",
      "Cyan & Vermilion",
      "Ultramarine & Saffron",
      "Violet & Chartreuse",
      "Grape & Fuchsia",
      "Wine & Tangerine",
      "Magenta & Teal",
      "Pink & Cobalt",
      "Jade & Coral",
      "Teal & Ember"
    ],
    "subtraits": [
      { "name": "Warm-led", "values": ["Tangerine & Plum", "Crimson & Cobalt", "Grape & Fuchsia", "Wine & Tangerine", "Magenta & Teal", "Pink & Cobalt"] },
      { "name": "Cool-led", "values": ["Emerald & Gold", "Cobalt & Coral", "Lime & Magenta", "Cyan & Vermilion", "Ultramarine & Saffron", "Violet & Chartreuse", "Jade & Coral", "Teal & Ember"] },
    ]
  },
  {
    "name": "Format",
    "values": [
      "Portrait",
      "Wide",
      "Scroll",
      "Square",
      "Vista"
    ],
    "subtraits": [
      { "name": "Upright", "values": ["Portrait", "Scroll", "Square"] },
      { "name": "Broad", "values": ["Wide", "Vista"] },
    ]
  },
  {
    "name": "Current",
    "values": [
      "Combed",
      "Calm",
      "Torn"
    ]
  },
  {
    "name": "Event",
    "values": [
      "Eclipse Pool",
      "None",
      "Gilded Veil"
    ],
    "subtraits": [
      { "name": "Plain", "values": ["None"] },
      { "name": "Anomaly", "values": ["Eclipse Pool", "Gilded Veil"] },
    ]
  }
] };
export const BLOOMWATER_ASPECTS: readonly number[] = [0.667,0.8,1,1.501,1.778];
