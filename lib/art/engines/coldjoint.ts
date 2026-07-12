// @ts-nocheck
/*
 * ColdJoint — PriceOS art engine (by opus4-8). Abstract generative system,
 * deterministic from tokenId only. KIT helpers bundled; trait schema derived
 * from the engine's own casts. Frozen art — edit the R&D source + re-port.
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


/* SEDIMENT — troweled wet-concrete material study (h3_sediment).
 * A mid-key, COOL grey-green plane of cured concrete: broad curved trowel
 * sweeps, control joints, form-tie holes, exposed aggregate, efflorescent salt
 * bloom, trowel chatter, hairline crack seams — and one HOT saturated rust
 * stain that soaks through the field (sometimes absent, sometimes a network of
 * veins, sometimes only a faint edge stain). Pure material abstraction — no
 * objects, no tools, no scene. The "off": a seam that loops back into itself, a
 * joint that closes a circuit — impossible continuity in an otherwise honest
 * surface.
 *
 * GRADE (mandated, HELD FIXED): mid-key, cool grey-green field, LOW saturation
 * overall, with ONE hot saturated rust accent that genuinely pops. Cool grey +
 * one hot warm stain. Deep darks stay DEEP, the rust stays SATURATED — haze
 * adds air, never bleach.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;
  const TAU = Math.PI * 2;

  /* Anchors (own this world): #8A9488 wet grey-green | #C3C2B4 pale cement |
     #5C6660 dark form-line | #B5502A vivid rust bloom (HOT accent).
     Bespoke palettes — same Green Cement world, different WEATHER, all mid-key
     & cool with a hot rust stain. None drift to pale neutral. The RARE palette
     (Oxide Vein) is reserved for grail seeds. */
  const PALS = [
    { name: 'Green Cement', base: '#8A9488', cement: '#C3C2B4', form: '#4D5751', deep: '#363E3A', rust: '#B5502A', rust2: '#D2693A', wet: '#74807A', rare: false },
    { name: 'Wet Slab',     base: '#79857E', cement: '#AFB3A8', form: '#3F4945', deep: '#2A312E', rust: '#A8481F', rust2: '#C25E2D', wet: '#647069', rare: false },
    { name: 'Sea Mortar',   base: '#8C9B95', cement: '#C6C9BC', form: '#46524E', deep: '#303A37', rust: '#B95428', rust2: '#D67039', wet: '#76867F', rare: false },
    { name: 'Ash Render',   base: '#909488', cement: '#C9C6B6', form: '#52564C', deep: '#3A3D34', rust: '#B04E27', rust2: '#CF6635', wet: '#7C8076', rare: false },
    { name: 'Tidal Float',  base: '#7E8C89', cement: '#B6BCB2', form: '#3C4744', deep: '#283130', rust: '#AD4A24', rust2: '#C96033', wet: '#6A7873', rare: false },
    { name: 'Kiln Damp',    base: '#869189', cement: '#BFC0B0', form: '#48524C', deep: '#333B37', rust: '#BD5526', rust2: '#DC713A', wet: '#727E77', rare: false },
    /* RARE — grail seeds only: the rust takes over as a deep iron-oxide vein. */
    { name: 'Oxide Vein',   base: '#7C817A', cement: '#B0AC9C', form: '#3A3C36', deep: '#26271F', rust: '#C04C1E', rust2: '#E0732B', wet: '#6A6E66', rare: true },
  ];

  /* Ten structurally-distinct composition modes. Each lays the slab down a
     different way — sweeps, orthogonal joints, horizontal pour lifts, tie
     grids, salt bloom fields, spall popouts, board-form ribs, broad drag. */
  const MODES = [
    'Sweep Field',   // broad curved trowel smears across the plane
    'Seam Circuit',  // hairline crack network, one loops into itself
    'Cold Pour',     // horizontal lift lines + bleed water — stratified
    'Joint Grid',    // orthogonal control-joint panels, the slab is gridded
    'Tie Field',     // form-tie hole array recessed into a board-form wall
    'Rust Bloom',    // a dominant iron-oxide stain soaks the field
    'Drag Plane',    // long shallow float-drag, single sweeping gesture
    'Crack Lattice', // dense angular crack lattice with rust weep
    'Efflorescent',  // pale salt bloom crusts crawl across a damp slab
    'Spall Field',   // aggregate popouts + exposed-stone craters
  ];
  const FORMATS = [[1040, 1280], [1180, 1180], [1280, 1040]]; // portrait / square / landscape

  function pickPal(r, allowRare) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    const common = PALS.filter((p) => !p.rare);
    if (allowRare) return PALS.find((p) => p.rare);
    return K.pick(common, r);
  }

  /* ── A single broad curved trowel sweep: a thick band of cement smeared along
     a gentle arc, with a bright pulled leading edge and a dragged trailing
     shadow. Feathered, never a clean vector. ── */
  function trowelSweep(x, cx, cy, len, wid, ang, curve, col, edgeCol, shadeCol, alpha, r) {
    const steps = Math.max(36, Math.floor(len / 6));
    x.save();
    x.globalCompositeOperation = 'source-over';
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = ang + Math.sin((t - 0.5) * Math.PI) * curve;
      const px = cx + Math.cos(a) * (t - 0.5) * len;
      const py = cy + Math.sin(a) * (t - 0.5) * len;
      const taper = Math.sin(t * Math.PI);
      const w = wid * (0.35 + 0.65 * taper);
      const nrm = a + Math.PI / 2;
      const bodyA = alpha * (0.5 + 0.5 * taper);
      x.fillStyle = K.rgba(col, bodyA * 0.5);
      x.beginPath();
      x.ellipse(px, py, w * 0.6, w * 0.22, nrm, 0, 7);
      x.fill();
      const ex = px + Math.cos(nrm) * w * 0.42;
      const ey = py + Math.sin(nrm) * w * 0.42;
      x.fillStyle = K.rgba(edgeCol, bodyA * 0.4 * (0.4 + r() * 0.6));
      x.beginPath();
      x.ellipse(ex, ey, w * 0.34, w * 0.07, nrm, 0, 7);
      x.fill();
      const sx = px - Math.cos(nrm) * w * 0.40;
      const sy = py - Math.sin(nrm) * w * 0.40;
      x.fillStyle = K.rgba(shadeCol, bodyA * 0.30);
      x.beginPath();
      x.ellipse(sx, sy, w * 0.40, w * 0.10, nrm, 0, 7);
      x.fill();
    }
    x.restore();
  }

  /* ── A hairline crack seam: a jittered polyline that can loop back into itself
     (the "off"). Drawn as a dark hairline with a faint pale lip on one side. ── */
  function crackPath(noise, x0, y0, x1, y1, jit, segs, loop, r) {
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      let px = x0 + (x1 - x0) * t;
      let py = y0 + (y1 - y0) * t;
      const nx = noise.fbm(px / 90 + 5, py / 90, 4) * jit;
      const ny = noise.fbm(px / 90, py / 90 + 9, 4) * jit;
      px += nx; py += ny;
      if (loop) {
        const bow = Math.sin(t * Math.PI) * jit * 2.4;
        const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
        px += (-dy / L) * bow;
        py += (dx / L) * bow;
      }
      pts.push([px, py]);
    }
    if (loop) {
      for (let i = 1; i <= Math.floor(segs * 0.4); i++) {
        const t = i / Math.floor(segs * 0.4);
        const a = pts[pts.length - 1];
        pts.push([a[0] + (x0 - a[0]) * t + noise.fbm(i, t * 7, 3) * jit * 0.6,
                  a[1] + (y0 - a[1]) * t + noise.fbm(t * 7, i, 3) * jit * 0.6]);
      }
    }
    return pts;
  }

  function drawCrack(x, pts, darkCol, lipCol, wmax) {
    x.save();
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.strokeStyle = K.rgba(lipCol, 0.5);
    x.lineWidth = wmax * 2.1;
    x.beginPath();
    for (let i = 0; i < pts.length; i++) { const p = pts[i]; i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }
    x.stroke();
    for (let i = 1; i < pts.length; i++) {
      const t = i / pts.length;
      const w = wmax * (0.35 + 0.65 * Math.sin(t * Math.PI));
      x.strokeStyle = K.rgba(darkCol, 0.55 + 0.35 * Math.sin(t * Math.PI));
      x.lineWidth = Math.max(0.6, w);
      x.beginPath(); x.moveTo(pts[i - 1][0], pts[i - 1][1]); x.lineTo(pts[i][0], pts[i][1]); x.stroke();
    }
    x.restore();
  }

  /* ── Rust bloom: an iron-oxide stain that soaks INTO the surface. Layered
     multiply blots + a saturated hot core so it pops through the haze. ── */
  function rustBloom(x, cx, cy, rad, pal, intensity, r) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    let g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, K.rgba(pal.rust, 0.85 * intensity));
    g.addColorStop(0.35, K.rgba(pal.rust, 0.5 * intensity));
    g.addColorStop(0.7, K.rgba(K.mix(pal.rust, pal.form, 0.5), 0.28 * intensity));
    g.addColorStop(1, K.rgba(pal.rust, 0));
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    const n = 60 + Math.floor(r() * 50);
    for (let i = 0; i < n; i++) {
      const a = r() * 7;
      const rr = rad * (0.2 + Math.pow(r(), 0.5) * 0.95);
      const bx = cx + Math.cos(a) * rr, by = cy + Math.sin(a) * rr;
      const dist = rr / rad;
      const blot = r() < 0.5 ? pal.rust : K.mix(pal.rust, pal.deep, 0.4);
      x.fillStyle = K.rgba(blot, (0.10 + r() * 0.18) * intensity * (1 - dist * 0.6));
      x.beginPath(); x.ellipse(bx, by, 3 + r() * 14, 2 + r() * 9, a, 0, 7); x.fill();
    }
    x.restore();
    x.save();
    // hot core sits on top but stays DIFFUSE — a saturated glow that pops
    // through haze without becoming a hard opaque blob
    g = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 0.5);
    g.addColorStop(0, K.rgba(pal.rust2, 0.42 * intensity));
    g.addColorStop(0.35, K.rgba(pal.rust, 0.26 * intensity));
    g.addColorStop(0.7, K.rgba(pal.rust, 0.10 * intensity));
    g.addColorStop(1, K.rgba(pal.rust, 0));
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    x.restore();
  }

  /* ── A rust VEIN: oxide bleeds along a meandering capillary, dark hot core
     with a soaked halo. Reads as iron staining following a hairline. ── */
  function rustVein(x, noise, x0, y0, x1, y1, wid, pal, intensity, r) {
    const segs = 26 + (r() * 18 | 0);
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      let px = x0 + (x1 - x0) * t, py = y0 + (y1 - y0) * t;
      px += noise.fbm(px / 70 + 3, py / 70, 4) * wid * 5;
      py += noise.fbm(px / 70, py / 70 + 7, 4) * wid * 5;
      pts.push([px, py]);
    }
    // soaked halo (multiply) — this is the DOMINANT read: oxide bleeding into
    // the cement either side of a capillary, soft and wide, not a drawn line
    x.save();
    x.globalCompositeOperation = 'multiply';
    x.lineJoin = 'round'; x.lineCap = 'round';
    x.strokeStyle = K.rgba(K.mix(pal.rust, pal.form, 0.5), 0.22 * intensity);
    x.lineWidth = wid * 4.2;
    x.beginPath();
    for (let i = 0; i < pts.length; i++) { const p = pts[i]; i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }
    x.stroke();
    x.strokeStyle = K.rgba(K.mix(pal.rust, pal.form, 0.2), 0.30 * intensity);
    x.lineWidth = wid * 1.9;
    x.beginPath();
    for (let i = 0; i < pts.length; i++) { const p = pts[i]; i ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); }
    x.stroke();
    x.restore();
    // faint hot core, broken — only the wettest stretches glow (not a uniform
    // bright thread; that's what made it read as a worm)
    x.save();
    x.lineCap = 'round';
    for (let i = 1; i < pts.length; i++) {
      if (r() < 0.45) continue;
      x.strokeStyle = K.rgba(pal.rust, 0.32 * intensity);
      x.lineWidth = Math.max(0.6, wid * 0.55);
      x.beginPath(); x.moveTo(pts[i - 1][0], pts[i - 1][1]); x.lineTo(pts[i][0], pts[i][1]); x.stroke();
    }
    x.restore();
    // a few soak blots pooling along the vein
    for (let i = 0; i < pts.length; i += 4) {
      if (r() < 0.55) continue;
      const p = pts[i];
      rustBloom(x, p[0], p[1], wid * (1.8 + r() * 2.4), pal, 0.3 * intensity, r);
    }
    return pts;
  }

  /* ── A faint rust EDGE STAIN: oxide creeping in from one border, weathered. ── */
  function rustEdgeStain(x, W, H, side, pal, intensity, noise, r) {
    x.save();
    x.globalCompositeOperation = 'multiply';
    const depth = Math.min(W, H) * (0.22 + r() * 0.2);
    let g;
    if (side === 0) g = x.createLinearGradient(0, 0, 0, depth);            // top
    else if (side === 1) g = x.createLinearGradient(W, 0, W - depth, 0);   // right
    else if (side === 2) g = x.createLinearGradient(0, H, 0, H - depth);   // bottom
    else g = x.createLinearGradient(0, 0, depth, 0);                       // left
    g.addColorStop(0, K.rgba(pal.rust, 0.34 * intensity));
    g.addColorStop(0.4, K.rgba(K.mix(pal.rust, pal.form, 0.4), 0.16 * intensity));
    g.addColorStop(1, K.rgba(pal.rust, 0));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    x.restore();
    // ragged streaks dripping inward from the edge (weathered run-off)
    const drips = 6 + (r() * 6 | 0);
    for (let i = 0; i < drips; i++) {
      let sx, sy, dx, dy;
      const along = r();
      if (side === 0) { sx = along * W; sy = 0; dx = (r() - 0.5) * 30; dy = depth * (0.4 + r() * 0.9); }
      else if (side === 1) { sx = W; sy = along * H; dx = -depth * (0.4 + r() * 0.9); dy = (r() - 0.5) * 30; }
      else if (side === 2) { sx = along * W; sy = H; dx = (r() - 0.5) * 30; dy = -depth * (0.4 + r() * 0.9); }
      else { sx = 0; sy = along * H; dx = depth * (0.4 + r() * 0.9); dy = (r() - 0.5) * 30; }
      rustVein(x, noise, sx, sy, sx + dx, sy + dy, Math.min(W, H) * (0.004 + r() * 0.005), pal, 0.5 * intensity, r);
    }
  }

  /* ── SURFACE EVENTS — the detail vocabulary that makes each slab its own ── */

  /* Control joint / sawcut: a straight recessed groove — dark valley with a
     bright lip and a soft cast shadow. The grid language of a real slab. */
  function controlJoint(x, x0, y0, x1, y1, pal, S, r, depth) {
    const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L, ny = dx / L;
    const w = S * (0.004 + depth * 0.004);
    x.save();
    x.lineCap = 'butt';
    // soft cast shadow off one side
    x.strokeStyle = K.rgba(pal.deep, 0.18);
    x.lineWidth = w * 4;
    x.beginPath(); x.moveTo(x0 + nx * w * 2, y0 + ny * w * 2); x.lineTo(x1 + nx * w * 2, y1 + ny * w * 2); x.stroke();
    // dark recessed groove
    x.strokeStyle = K.rgba(K.mix(pal.deep, pal.form, 0.3), 0.7);
    x.lineWidth = w * 2;
    x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    // bright tooled lip
    x.strokeStyle = K.rgba(K.mix(pal.cement, '#ffffff', 0.2), 0.4);
    x.lineWidth = w * 0.8;
    x.beginPath(); x.moveTo(x0 - nx * w * 1.3, y0 - ny * w * 1.3); x.lineTo(x1 - nx * w * 1.3, y1 - ny * w * 1.3); x.stroke();
    x.restore();
  }

  /* Form-tie hole: a small recessed circle (snap-tie pocket) — dark cup with a
     bright top lip and frequently a rust weep below it. */
  function tieHole(x, cx, cy, rad, pal, withRust, r) {
    x.save();
    // recessed cup (radial dark)
    let g = x.createRadialGradient(cx, cy + rad * 0.15, 0, cx, cy, rad);
    g.addColorStop(0, K.rgba(pal.deep, 0.85));
    g.addColorStop(0.6, K.rgba(K.mix(pal.deep, pal.form, 0.5), 0.6));
    g.addColorStop(1, K.rgba(pal.form, 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.fill();
    // bright top lip catch-light
    x.strokeStyle = K.rgba(K.mix(pal.cement, '#fff', 0.25), 0.5);
    x.lineWidth = Math.max(0.8, rad * 0.16);
    x.beginPath(); x.arc(cx, cy - rad * 0.06, rad * 0.86, Math.PI * 1.15, Math.PI * 1.85); x.stroke();
    // dark bottom rim
    x.strokeStyle = K.rgba(pal.deep, 0.5);
    x.lineWidth = Math.max(0.6, rad * 0.12);
    x.beginPath(); x.arc(cx, cy, rad * 0.92, Math.PI * 0.2, Math.PI * 0.8); x.stroke();
    x.restore();
    if (withRust) {
      // rust weep soaking down from the tie — a soft stain that fades, not a
      // drawn droplet trail
      x.save();
      x.globalCompositeOperation = 'multiply';
      const dl = rad * (2.5 + r() * 3.5);
      const g2 = x.createLinearGradient(cx, cy, cx + (r() - 0.5) * rad * 0.8, cy + dl);
      g2.addColorStop(0, K.rgba(pal.rust, 0.34));
      g2.addColorStop(0.5, K.rgba(K.mix(pal.rust, pal.form, 0.3), 0.16));
      g2.addColorStop(1, K.rgba(pal.rust, 0));
      x.strokeStyle = g2;
      x.lineWidth = rad * (0.9 + r() * 0.5);
      x.lineCap = 'round';
      x.beginPath(); x.moveTo(cx, cy + rad * 0.5);
      x.quadraticCurveTo(cx + (r() - 0.5) * rad, cy + dl * 0.6, cx + (r() - 0.5) * rad * 0.6, cy + dl); x.stroke();
      x.restore();
      rustBloom(x, cx, cy + rad * 0.3, rad * 1.3, pal, 0.4, r);
    }
  }

  /* Exposed-aggregate / spall patch: a cluster of small stone pebbles revealed
     where the cement skin wore away — light and dark grit packed into a crater. */
  function aggregatePatch(x, cx, cy, rad, pal, r) {
    x.save();
    // shallow crater shadow (soft, soaked into base — keeps the patch reading
    // as worn-open cement, not a hole)
    let g = x.createRadialGradient(cx, cy, rad * 0.2, cx, cy, rad);
    g.addColorStop(0, K.rgba(K.mix(pal.base, pal.form, 0.35), 0.4));
    g.addColorStop(1, K.rgba(pal.base, 0));
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, rad, 0, TAU); x.fill();
    x.restore();
    // packed stones — DENSE, small, grey-toned (never near-black: the cool
    // haze screen-pass tints near-black toward blue, which we must avoid)
    const n = 60 + (r() * 70 | 0);
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, rr = Math.pow(r(), 0.55) * rad * 0.95;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      const s = rad * (0.025 + r() * 0.055);
      const k = r();
      // stone tones all live in the cement→form grey band (mid-key), with the
      // occasional warm/buff aggregate — none go to deep/black
      let c;
      if (k < 0.4) c = K.mix(pal.cement, '#ffffff', 0.1 + r() * 0.25);   // pale quartz
      else if (k < 0.7) c = K.mix(pal.base, pal.form, 0.3 + r() * 0.4);  // grey stone
      else if (k < 0.88) c = K.mix(pal.form, pal.cement, 0.2 + r() * 0.3); // mid grit
      else c = K.mix(pal.cement, pal.rust, 0.18 + r() * 0.12);            // warm buff fleck
      // soft contact shadow (form-grey, not black) gives the embedded look
      x.fillStyle = K.rgba(K.mix(pal.form, pal.deep, 0.4), 0.3);
      x.beginPath(); x.ellipse(px + s * 0.35, py + s * 0.45, s * 1.05, s * 0.85, a, 0, TAU); x.fill();
      x.fillStyle = K.rgba(c, 0.6 + r() * 0.3);
      x.beginPath(); x.ellipse(px, py, s, s * (0.7 + r() * 0.3), a, 0, TAU); x.fill();
      // tiny catchlight on pale stones
      if (k < 0.4 && r() < 0.5) { x.fillStyle = K.rgba('#ffffff', 0.18); x.beginPath(); x.arc(px - s * 0.25, py - s * 0.25, s * 0.3, 0, TAU); x.fill(); }
    }
  }

  /* Efflorescence: a pale crystalline salt crust that crawls across damp
     concrete — soft white-grey bloom, mottled, sits on top (screen/lighter). */
  function efflorescence(x, cx, cy, rad, pal, intensity, r) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const salt = K.mix(pal.cement, '#ffffff', 0.5);
    let g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, K.rgba(salt, 0.18 * intensity));
    g.addColorStop(0.5, K.rgba(salt, 0.09 * intensity));
    g.addColorStop(1, K.rgba(salt, 0));
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    // crusty crystalline flecks
    const n = 50 + (r() * 60 | 0);
    for (let i = 0; i < n; i++) {
      const a = r() * TAU, rr = Math.pow(r(), 0.7) * rad;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      x.fillStyle = K.rgba(salt, (0.04 + r() * 0.10) * intensity * (1 - rr / rad * 0.7));
      const s = 0.6 + r() * 2.2;
      x.fillRect(px, py, s, s);
    }
    x.restore();
  }

  /* Trowel chatter: a rhythmic run of short curved scrape marks left by the
     blade skipping — fine repeated arcs across the float direction. */
  function trowelChatter(x, cx, cy, ang, span, pal, S, r) {
    x.save();
    const n = 8 + (r() * 10 | 0);
    const nrm = ang + Math.PI / 2;
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const px = cx + Math.cos(ang) * (t - 0.5) * span;
      const py = cy + Math.sin(ang) * (t - 0.5) * span;
      const len = S * (0.02 + r() * 0.03);
      const dk = r() < 0.5;
      x.strokeStyle = K.rgba(dk ? pal.form : K.mix(pal.cement, '#fff', 0.3), 0.10 + r() * 0.12);
      x.lineWidth = 0.6 + r() * 1.2;
      x.lineCap = 'round';
      x.beginPath();
      const bx = px + Math.cos(nrm) * len, by = py + Math.sin(nrm) * len;
      const mx = (px + bx) / 2 + Math.cos(ang) * len * 0.4;
      const my = (py + by) / 2 + Math.sin(ang) * len * 0.4;
      x.moveTo(px, py); x.quadraticCurveTo(mx, my, bx, by); x.stroke();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 3);

    // grail roll FIRST so rng order is mirrorable in traits()
    const isGrail = r() < 0.0833; // ~1 in 12
    const pal = pickPal(r, isGrail);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    /* RUST PLAN — decoupled from composition so the hot accent VARIES seed to
       seed: absent / single bloom / multiple veins / faint edge stain / a tie
       weep network. This is the jury's core fix. */
    let rustPlan;
    const rr = r();
    if (isGrail) rustPlan = 'veins';                 // grails: dominant oxide network
    else if (mode === 'Rust Bloom') rustPlan = 'bloom';
    else if (rr < 0.16) rustPlan = 'none';           // a clean slab, no rust at all
    else if (rr < 0.40) rustPlan = 'edge';           // faint stain creeping from an edge
    else if (rr < 0.66) rustPlan = 'veins';          // a network of capillary veins
    else rustPlan = 'bloom';                          // a classic single bloom
    const rustInt = 0.7 + r() * 0.5;

    // ── BASE SLAB: uneven wet-concrete ground, mid-key cool grey-green ──
    const bg = x.createLinearGradient(0, 0, W * 0.2, H);
    bg.addColorStop(0, K.mix(pal.base, pal.cement, 0.15));
    bg.addColorStop(0.5, pal.base);
    bg.addColorStop(1, K.mix(pal.base, pal.wet, 0.5));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    const patch = Math.max(6, Math.floor(S / 150));
    for (let yy = 0; yy < H; yy += patch) {
      for (let xx = 0; xx < W; xx += patch) {
        const n = noise.fbm(xx / (S * 0.6), yy / (S * 0.6), 5, 0.55, 2.1);
        const m = noise.fbm(xx / (S * 0.16) + 4, yy / (S * 0.16) + 2, 3);
        let col;
        if (n < -0.12) col = K.mix(pal.base, pal.deep, Math.min(0.5, -n));
        else if (n > 0.14) col = K.mix(pal.base, pal.cement, Math.min(0.55, n));
        else col = K.mix(pal.base, pal.wet, 0.2 + m * 0.2);
        x.fillStyle = K.rgba(col, 0.5);
        x.fillRect(xx, yy, patch + 1, patch + 1);
      }
    }

    // focal anchor — confident off-centre composition (asymmetry)
    const fcx = W * (0.30 + r() * 0.40);
    const fcy = H * (0.30 + r() * 0.40);

    /* ── PER-MODE STRUCTURE — each mode lays the slab differently. Sweeps are
       now only ONE of several structural languages, not the default. ── */

    // Default sweep parameters (used by sweep-class modes)
    let sweepN, sweepAng, sweepCurve, sweepLenK, sweepWidK, fan;
    const usesSweeps = (mode === 'Sweep Field' || mode === 'Seam Circuit' || mode === 'Rust Bloom' || mode === 'Drag Plane' || mode === 'Crack Lattice');
    if (mode === 'Sweep Field')   { sweepN = 7 + (r() * 3 | 0); sweepAng = r() * Math.PI; sweepCurve = 0.4 + r() * 0.5; sweepLenK = 1.1; sweepWidK = 0.15; fan = 0.5; }
    else if (mode === 'Seam Circuit') { sweepN = 4 + (r() * 2 | 0); sweepAng = r() * Math.PI; sweepCurve = 0.6 + r() * 0.6; sweepLenK = 0.9; sweepWidK = 0.15; fan = 0.7; }
    else if (mode === 'Rust Bloom')   { sweepN = 5 + (r() * 2 | 0); sweepAng = r() * Math.PI; sweepCurve = 0.5 + r() * 0.5; sweepLenK = 1.0; sweepWidK = 0.16; fan = 0.55; }
    else if (mode === 'Drag Plane')   { sweepN = 6 + (r() * 2 | 0); sweepAng = -0.35 + r() * 0.7; sweepCurve = 0.2 + r() * 0.3; sweepLenK = 1.35; sweepWidK = 0.19; fan = 0.25; }
    else                              { sweepN = 5 + (r() * 3 | 0); sweepAng = r() * Math.PI; sweepCurve = 0.35 + r() * 0.45; sweepLenK = 1.0; sweepWidK = 0.14; fan = 0.6; }

    const ngSide = r() < 0.5 ? -1 : 1;
    const driftA = sweepAng + Math.PI / 2;

    if (usesSweeps) {
      for (let i = 0; i < sweepN; i++) {
        const t = i / Math.max(1, sweepN - 1);
        const bt = Math.pow(t, 1.0 + r() * 0.6);
        const ang = sweepAng + (t - 0.5) * fan + (r() - 0.5) * 0.5;
        const curve = sweepCurve * (0.55 + r() * 0.9) * (r() < 0.35 ? -1 : 1);
        const off = (bt - 0.35) * S * 0.95 * ngSide;
        const cx = fcx + Math.cos(driftA) * off + (r() - 0.5) * S * 0.16;
        const cy = fcy + Math.sin(driftA) * off + (r() - 0.5) * S * 0.16;
        const short = r() < 0.35;
        const len = S * (sweepLenK * (short ? 0.30 + r() * 0.30 : 0.75 + r() * 0.6));
        const wid = S * (sweepWidK * (0.6 + r() * 0.8));
        const lt = 0.6 + r() * 0.4;
        const dark = r() < 0.28;
        // hold MID-KEY: cement sweeps lean toward base, not pure white, so the
        // field never reads as bright billowing cloth
        const col = dark ? K.mix(pal.form, pal.base, 0.45) : K.mix(pal.cement, pal.base, 0.45 + r() * 0.28);
        const edge = dark ? K.mix(pal.base, pal.cement, 0.55) : K.mix(pal.cement, '#ffffff', 0.10);
        const shade = K.mix(pal.form, pal.deep, 0.4);
        trowelSweep(x, cx, cy, len, wid, ang, curve, col, edge, shade, lt * 0.82, r);
      }

      // SURFACE DRESSING for sweep-class modes — break the "cloth" read and
      // densify the field with honest concrete events. Light touch, varied.
      // control joint(s): vary between none / one full sweep / a short partial
      // joint / two meeting at a corner — so the joint never becomes the tell.
      const jointRoll = r();
      if (jointRoll < 0.30) {
        // none — let cracks/aggregate carry this slab
      } else if (jointRoll < 0.62) {
        // one joint, often only crossing part of the plane (not always edge-to-edge)
        const ja = sweepAng + (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.3;
        const jcx = W * (0.25 + r() * 0.5), jcy = H * (0.25 + r() * 0.5);
        const partial = r() < 0.5;
        const jl = S * (partial ? 0.3 + r() * 0.35 : 1.4);
        const ox = partial ? (r() - 0.5) * jl : 0, oy = partial ? (r() - 0.5) * jl : 0;
        controlJoint(x, jcx - Math.cos(ja) * jl + ox, jcy - Math.sin(ja) * jl + oy, jcx + Math.cos(ja) * jl + ox, jcy + Math.sin(ja) * jl + oy, pal, S, r, 0.45 + r() * 0.5);
      } else {
        // two joints meeting near a corner (a panel edge)
        const px = W * (0.2 + r() * 0.6), py = H * (0.2 + r() * 0.6);
        const a1 = sweepAng + (r() - 0.5) * 0.3;
        const a2 = a1 + Math.PI / 2 + (r() - 0.5) * 0.2;
        const l1 = S * (0.5 + r() * 0.6), l2 = S * (0.5 + r() * 0.6);
        controlJoint(x, px, py, px + Math.cos(a1) * l1, py + Math.sin(a1) * l1, pal, S, r, 0.5 + r() * 0.4);
        controlJoint(x, px, py, px + Math.cos(a2) * l2, py + Math.sin(a2) * l2, pal, S, r, 0.5 + r() * 0.4);
      }
      // a small cluster of exposed aggregate where the float skinned the surface
      if (r() < 0.6) aggregatePatch(x, fcx + (r() - 0.5) * S * 0.5, fcy + (r() - 0.5) * S * 0.5, S * (0.05 + r() * 0.06), pal, r);
      // a couple of form-tie pockets
      const td = (r() * 3 | 0);
      for (let i = 0; i < td; i++) tieHole(x, W * (0.15 + r() * 0.7), H * (0.15 + r() * 0.7), S * (0.011 + r() * 0.009), pal, rustPlan !== 'none' && r() < 0.4, r);
      // a faint efflorescent crust on damp slabs
      if (r() < 0.45) efflorescence(x, W * (0.15 + r() * 0.7), H * (0.15 + r() * 0.7), S * (0.08 + r() * 0.1), pal, 0.6, r);
    }

    if (mode === 'Cold Pour') {
      // horizontal lift lines: each pour layer is a soft tonal band with a
      // darker bleed-water line at its base. Stratified, level.
      const layers = 5 + (r() * 4 | 0);
      let yy = H * (0.08 + r() * 0.1);
      for (let i = 0; i < layers && yy < H * 0.95; i++) {
        const th = H * (0.07 + r() * 0.12);
        const tilt = (r() - 0.5) * S * 0.05;
        const tone = r() < 0.5 ? K.mix(pal.base, pal.cement, 0.25 + r() * 0.3) : K.mix(pal.base, pal.wet, 0.3);
        // band fill
        x.save();
        const g = x.createLinearGradient(0, yy, 0, yy + th);
        g.addColorStop(0, K.rgba(K.mix(tone, pal.cement, 0.3), 0.30));
        g.addColorStop(0.7, K.rgba(tone, 0.12));
        g.addColorStop(1, K.rgba(K.mix(pal.base, pal.deep, 0.3), 0.30));
        x.fillStyle = g;
        x.beginPath(); x.moveTo(0, yy + tilt); x.lineTo(W, yy - tilt); x.lineTo(W, yy + th - tilt); x.lineTo(0, yy + th + tilt); x.closePath(); x.fill();
        x.restore();
        // bleed-water line at base of the lift (jittered hairline)
        const pts = crackPath(noise, 0, yy + th + tilt, W, yy + th - tilt, S * 0.012, 40, false, r);
        drawCrack(x, pts, pal.deep, K.mix(pal.cement, '#fff', 0.25), Math.max(1, S * 0.0016));
        // faint efflorescent crust riding a lift line sometimes
        if (r() < 0.4) efflorescence(x, r() * W, yy + th * (0.3 + r() * 0.4), S * (0.08 + r() * 0.07), pal, 0.7, r);
        yy += th + H * (0.005 + r() * 0.03);
      }
      // a couple of wide soft floats for body
      for (let i = 0; i < 2; i++) {
        trowelSweep(x, W * r(), fcy + (r() - 0.5) * H * 0.4, S * (1.0 + r() * 0.5), S * 0.13, (r() - 0.5) * 0.18, (r() - 0.5) * 0.2,
          K.mix(pal.cement, pal.base, 0.45), K.mix(pal.cement, '#fff', 0.1), K.mix(pal.form, pal.deep, 0.4), 0.5, r);
      }
      // dressing: aggregate exposure + a tie pocket riding a lift line
      if (r() < 0.7) aggregatePatch(x, W * (0.15 + r() * 0.7), H * (0.2 + r() * 0.6), S * (0.05 + r() * 0.06), pal, r);
      const ct = (r() * 3 | 0);
      for (let i = 0; i < ct; i++) tieHole(x, W * (0.12 + r() * 0.76), H * (0.15 + r() * 0.7), S * (0.012 + r() * 0.009), pal, rustPlan !== 'none' && r() < 0.4, r);
    }

    if (mode === 'Joint Grid') {
      // orthogonal control-joint panels: the slab is divided into a sawcut grid
      // with off-centre spacing. ONE joint loops back (the "off").
      const baseAng = (r() - 0.5) * 0.12; // near-orthogonal, slight skew
      const cols = 2 + (r() * 3 | 0), rowsN = 2 + (r() * 3 | 0);
      // give each panel its own pour tone so the grid isn't a flat field — some
      // panels darker (damp), some paler (cured), one occasionally rust-tinged
      const cx0 = [0]; for (let i = 1; i <= cols; i++) cx0.push(W * (i / (cols + 1))); cx0.push(W);
      const cy0 = [0]; for (let i = 1; i <= rowsN; i++) cy0.push(H * (i / (rowsN + 1))); cy0.push(H);
      x.save();
      for (let ci = 0; ci < cx0.length - 1; ci++) {
        for (let ri = 0; ri < cy0.length - 1; ri++) {
          const k = noise.fbm(ci * 3.1 + 2, ri * 3.1 + 5, 3);
          let tone;
          if (k < -0.1) tone = K.mix(pal.base, pal.deep, 0.3 - k * 0.4);
          else if (k > 0.12) tone = K.mix(pal.base, pal.cement, 0.25 + k * 0.4);
          else tone = K.mix(pal.base, pal.wet, 0.25);
          x.fillStyle = K.rgba(tone, 0.3);
          x.fillRect(cx0[ci], cy0[ri], cx0[ci + 1] - cx0[ci], cy0[ri + 1] - cy0[ri]);
          // a soft directional float inside each panel for life
          trowelChatter(x, (cx0[ci] + cx0[ci + 1]) / 2, (cy0[ri] + cy0[ri + 1]) / 2, baseAng + Math.PI / 2 + (r() - 0.5) * 0.4, (cx0[ci + 1] - cx0[ci]) * 0.7, pal, S, r);
        }
      }
      x.restore();
      // verticals
      for (let i = 1; i <= cols; i++) {
        const px = W * (i / (cols + 1)) + (r() - 0.5) * S * 0.04;
        const x0 = px - Math.sin(baseAng) * H, y0 = -H * 0.1;
        const x1 = px + Math.sin(baseAng) * H, y1 = H * 1.1;
        controlJoint(x, x0, y0, x1, y1, pal, S, r, 0.6 + r() * 0.6);
      }
      // horizontals
      for (let i = 1; i <= rowsN; i++) {
        const py = H * (i / (rowsN + 1)) + (r() - 0.5) * S * 0.04;
        controlJoint(x, -W * 0.1, py - Math.sin(baseAng) * W, W * 1.1, py + Math.sin(baseAng) * W, pal, S, r, 0.6 + r() * 0.6);
      }
      // broad float body so panels aren't empty
      for (let i = 0; i < 3; i++) {
        trowelSweep(x, W * (0.2 + r() * 0.6), H * (0.2 + r() * 0.6), S * (0.6 + r() * 0.5), S * 0.12, r() * Math.PI, (r() - 0.5) * 0.5,
          K.mix(pal.cement, pal.base, 0.4 + r() * 0.2), K.mix(pal.cement, '#fff', 0.18), K.mix(pal.form, pal.deep, 0.4), 0.5, r);
      }
      // a few tie holes punched into the panels
      const tn = 3 + (r() * 4 | 0);
      for (let i = 0; i < tn; i++) {
        tieHole(x, W * (0.15 + r() * 0.7), H * (0.15 + r() * 0.7), S * (0.012 + r() * 0.012), pal, r() < 0.4 && rustPlan !== 'none', r);
      }
    }

    if (mode === 'Tie Field') {
      // board-form wall: faint horizontal board lines + a regular array of
      // form-tie holes (snap-tie pockets). The architectural grid.
      const boards = 6 + (r() * 5 | 0);
      for (let i = 0; i <= boards; i++) {
        const py = H * (i / boards) + (r() - 0.5) * S * 0.02;
        x.save();
        x.strokeStyle = K.rgba(K.mix(pal.form, pal.base, 0.4), 0.18 + r() * 0.12);
        x.lineWidth = 1 + r() * 1.5;
        const pts = crackPath(noise, 0, py, W, py + (r() - 0.5) * S * 0.02, S * 0.006, 30, false, r);
        x.lineCap = 'round';
        x.beginPath(); for (let k = 0; k < pts.length; k++) { const p = pts[k]; k ? x.lineTo(p[0], p[1]) : x.moveTo(p[0], p[1]); } x.stroke();
        x.restore();
      }
      // tie-hole array — staggered grid, off-centre
      const gx = 3 + (r() * 2 | 0), gy = 3 + (r() * 3 | 0);
      const mx = W * (0.12 + r() * 0.06), my = H * (0.12 + r() * 0.06);
      for (let iy = 0; iy < gy; iy++) {
        for (let ix = 0; ix < gx; ix++) {
          const stag = (iy % 2) * (W - 2 * mx) / (gx - 1) * 0.5;
          const px = mx + (W - 2 * mx) * (ix / Math.max(1, gx - 1)) + stag + (r() - 0.5) * S * 0.02;
          const py = my + (H - 2 * my) * (iy / Math.max(1, gy - 1)) + (r() - 0.5) * S * 0.02;
          if (px > W - mx * 0.3) continue;
          const wr = (rustPlan !== 'none') && r() < 0.45;
          tieHole(x, px, py, S * (0.015 + r() * 0.01), pal, wr, r);
        }
      }
      // a couple of soft floats for unevenness
      for (let i = 0; i < 2; i++) {
        trowelSweep(x, W * r(), H * r(), S * (0.7 + r() * 0.4), S * 0.11, r() * Math.PI, (r() - 0.5) * 0.4,
          K.mix(pal.cement, pal.base, 0.4), K.mix(pal.cement, '#fff', 0.15), K.mix(pal.form, pal.deep, 0.4), 0.4, r);
      }
    }

    if (mode === 'Efflorescent') {
      // damp slab with salt crusts crawling across it + a few soft floats
      for (let i = 0; i < 3; i++) {
        trowelSweep(x, W * (0.2 + r() * 0.6), H * (0.2 + r() * 0.6), S * (0.8 + r() * 0.5), S * 0.13, r() * Math.PI, (r() - 0.5) * 0.6,
          K.mix(pal.cement, pal.base, 0.4 + r() * 0.2), K.mix(pal.cement, '#fff', 0.18), K.mix(pal.form, pal.deep, 0.4), 0.55, r);
      }
      const crusts = 4 + (r() * 4 | 0);
      for (let i = 0; i < crusts; i++) {
        const px = W * (0.12 + r() * 0.76), py = H * (0.12 + r() * 0.76);
        efflorescence(x, px, py, S * (0.1 + r() * 0.16), pal, 0.8 + r() * 0.5, r);
      }
      // damp dark pooling under the crusts for contrast
      x.save(); x.globalCompositeOperation = 'multiply';
      for (let i = 0; i < 3; i++) {
        const px = W * r(), py = H * r(), rad = S * (0.18 + r() * 0.18);
        const g = x.createRadialGradient(px, py, 0, px, py, rad);
        g.addColorStop(0, K.rgba(pal.deep, 0.18));
        g.addColorStop(1, K.rgba(pal.deep, 0));
        x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
      }
      x.restore();
    }

    if (mode === 'Spall Field') {
      // exposed aggregate craters + popouts scattered with intent
      for (let i = 0; i < 2; i++) {
        trowelSweep(x, W * (0.2 + r() * 0.6), H * (0.2 + r() * 0.6), S * (0.8 + r() * 0.5), S * 0.13, r() * Math.PI, (r() - 0.5) * 0.5,
          K.mix(pal.cement, pal.base, 0.4), K.mix(pal.cement, '#fff', 0.16), K.mix(pal.form, pal.deep, 0.4), 0.5, r);
      }
      // a dominant crater near focal + satellites
      aggregatePatch(x, fcx, fcy, S * (0.14 + r() * 0.1), pal, r);
      const sp = 4 + (r() * 5 | 0);
      for (let i = 0; i < sp; i++) {
        aggregatePatch(x, W * (0.12 + r() * 0.76), H * (0.12 + r() * 0.76), S * (0.04 + r() * 0.08), pal, r);
      }
      // scattered single popout craters (small dark cups with a pale rim, like
      // an air void or a pulled pebble) — grey-toned, weighted toward focal
      const pop = 14 + (r() * 18 | 0);
      x.save();
      for (let i = 0; i < pop; i++) {
        const biasF = r() < 0.5;
        const px = biasF ? fcx + (r() - 0.5) * S * 0.7 : r() * W;
        const py = biasF ? fcy + (r() - 0.5) * S * 0.7 : r() * H;
        const s = S * (0.006 + r() * 0.012);
        // recessed cup
        const g = x.createRadialGradient(px, py - s * 0.15, 0, px, py, s);
        g.addColorStop(0, K.rgba(K.mix(pal.form, pal.deep, 0.45), 0.55));
        g.addColorStop(1, K.rgba(pal.form, 0));
        x.fillStyle = g; x.beginPath(); x.arc(px, py, s, 0, TAU); x.fill();
        // pale lower rim catch
        x.strokeStyle = K.rgba(K.mix(pal.cement, '#fff', 0.2), 0.3);
        x.lineWidth = Math.max(0.5, s * 0.18);
        x.beginPath(); x.arc(px, py + s * 0.1, s * 0.85, Math.PI * 0.15, Math.PI * 0.85); x.stroke();
      }
      x.restore();
    }

    // ── AGGREGATE GRAIN — fine speckle of sand/stone in the cement (all modes) ──
    x.save();
    const aggN = Math.floor(W * H / 900);
    for (let i = 0; i < aggN; i++) {
      const ax = r() * W, ay = r() * H;
      const big = r() < 0.12;
      const s = big ? 1.5 + r() * 2.5 : 0.6 + r() * 1.1;
      const dk = r() < 0.55;
      const c = dk ? K.mix(pal.form, pal.deep, r() * 0.6) : K.mix(pal.cement, '#ffffff', r() * 0.4);
      x.fillStyle = K.rgba(c, dk ? 0.18 + r() * 0.22 : 0.12 + r() * 0.18);
      x.beginPath(); x.arc(ax, ay, s, 0, 7); x.fill();
    }
    x.restore();

    // ── TROWEL CHATTER — rhythmic blade skip, on most modes for surface life ──
    if (mode !== 'Joint Grid' && mode !== 'Tie Field' && r() < 0.85) {
      const ch = 2 + (r() * 3 | 0);
      for (let i = 0; i < ch; i++) {
        trowelChatter(x, W * (0.2 + r() * 0.6), H * (0.2 + r() * 0.6), sweepAng + (r() - 0.5) * 0.6, S * (0.25 + r() * 0.35), pal, S, r);
      }
    }

    // ── RUST — placed per the decoupled rust plan ──
    if (rustPlan === 'bloom') {
      const mcx = fcx + (r() - 0.5) * S * 0.3, mcy = fcy + (r() - 0.5) * S * 0.3;
      if (mode === 'Rust Bloom') {
        // a SOAKED FIELD, not one blob: a broad faint stain with several
        // overlapping cores of varied size drifting off the anchor + capillary
        // veins feeding it, so the oxide reads as having spread through the slab
        rustBloom(x, mcx, mcy, S * (0.30 + r() * 0.14), pal, rustInt * 0.7, r);
        const cores = 3 + (r() * 3 | 0);
        for (let i = 0; i < cores; i++) {
          const a = r() * TAU, d = S * (0.04 + r() * 0.22);
          rustBloom(x, mcx + Math.cos(a) * d, mcy + Math.sin(a) * d, S * (0.06 + r() * 0.12), pal, rustInt * (0.5 + r() * 0.5), r);
        }
        const vn = 2 + (r() * 3 | 0);
        for (let i = 0; i < vn; i++) {
          const a = r() * TAU, L = S * (0.2 + r() * 0.3);
          rustVein(x, noise, mcx, mcy, mcx + Math.cos(a) * L, mcy + Math.sin(a) * L, S * 0.005, pal, rustInt * 0.8, r);
        }
      } else {
        rustBloom(x, mcx, mcy, S * (0.16 + r() * 0.12), pal, rustInt, r);
        if (r() < 0.4) rustBloom(x, W * (0.15 + r() * 0.7), H * (0.15 + r() * 0.7), S * (0.05 + r() * 0.05), pal, 0.5, r);
      }
    } else if (rustPlan === 'veins') {
      // a meandering network of oxide capillaries radiating from a node
      const nx = fcx + (r() - 0.5) * S * 0.3, ny = fcy + (r() - 0.5) * S * 0.3;
      const vn = (isGrail ? 4 : 2) + (r() * 3 | 0);
      const wbase = S * (isGrail ? 0.007 : 0.005);
      for (let i = 0; i < vn; i++) {
        const a = r() * TAU, L = S * (0.25 + r() * 0.4);
        rustVein(x, noise, nx, ny, nx + Math.cos(a) * L, ny + Math.sin(a) * L, wbase * (0.7 + r() * 0.8), pal, rustInt, r);
      }
      // soak node
      rustBloom(x, nx, ny, S * (isGrail ? 0.14 : 0.09) * (0.8 + r() * 0.5), pal, rustInt * (isGrail ? 1.1 : 0.85), r);
      if (isGrail) {
        // grail: a second distant vein cluster
        const mx2 = W * (0.15 + r() * 0.7), my2 = H * (0.15 + r() * 0.7);
        for (let i = 0; i < 3; i++) {
          const a = r() * TAU, L = S * (0.2 + r() * 0.3);
          rustVein(x, noise, mx2, my2, mx2 + Math.cos(a) * L, my2 + Math.sin(a) * L, wbase * 0.8, pal, rustInt, r);
        }
      }
    } else if (rustPlan === 'edge') {
      rustEdgeStain(x, W, H, r() * 4 | 0, pal, rustInt, noise, r);
      if (r() < 0.4) rustBloom(x, W * (0.2 + r() * 0.6), H * (0.2 + r() * 0.6), S * (0.05 + r() * 0.05), pal, 0.5, r);
    }
    // rustPlan === 'none' → no rust; the cool field stands on texture alone

    // ── CRACK SEAMS — hairline circuit lines. Count/looping by mode ──
    let crackN;
    if (mode === 'Crack Lattice') crackN = 6 + (r() * 4 | 0);
    else if (mode === 'Seam Circuit') crackN = 3 + (r() * 2 | 0);
    else if (mode === 'Joint Grid' || mode === 'Tie Field') crackN = 1 + (r() * 2 | 0);
    else crackN = 2 + (r() * 2 | 0);

    for (let i = 0; i < crackN; i++) {
      const loop = (mode === 'Seam Circuit' || mode === 'Crack Lattice') ? (i === 0 || r() < 0.4) : r() < 0.22;
      let x0, y0, x1, y1;
      if (loop) {
        const lx = fcx + (r() - 0.5) * S * 0.4, ly = fcy + (r() - 0.5) * S * 0.4;
        const span = S * (0.18 + r() * 0.22);
        const a = r() * 7;
        x0 = lx; y0 = ly; x1 = lx + Math.cos(a) * span; y1 = ly + Math.sin(a) * span;
      } else {
        x0 = r() * W; y0 = r() < 0.5 ? 0 : H;
        x1 = r() * W; y1 = r() < 0.5 ? H : 0;
        if (r() < 0.5) { y0 = r() * H; x0 = 0; y1 = r() * H; x1 = W; }
      }
      const jit = S * (0.04 + r() * 0.05);
      const segs = 30 + (r() * 24 | 0);
      const pts = crackPath(noise, x0, y0, x1, y1, jit, segs, loop, r);
      drawCrack(x, pts, pal.deep, K.mix(pal.cement, '#ffffff', 0.25), Math.max(1, S * (0.0016 + r() * 0.002)));
      // rust weeps from a crack only when the seed actually has rust
      if (rustPlan !== 'none' && r() < 0.3) {
        const mp = pts[Math.floor(pts.length * (0.3 + r() * 0.4))];
        rustBloom(x, mp[0], mp[1], S * (0.03 + r() * 0.03), pal, 0.5, r);
      }
    }

    // ── MATERIAL MOTTLE everywhere (premium texture, not flat vector) ──
    K.mottle(x, 0, 0, W, H, pal.base, 18, r, 'overlay');
    K.mottle(x, 0, 0, W, H, pal.cement, 40, r, 'soft-light');
    // troweled directional streak — faint long scrapes following the sweep angle
    x.save();
    x.globalCompositeOperation = 'overlay';
    const scrapes = 40 + (r() * 30 | 0);
    for (let i = 0; i < scrapes; i++) {
      const a = sweepAng + (r() - 0.5) * 0.5;
      const sx = r() * W, sy = r() * H;
      const sl = S * (0.1 + r() * 0.3);
      const c = r() < 0.5 ? K.mix(pal.cement, '#fff', 0.3) : pal.form;
      x.strokeStyle = K.rgba(c, 0.04 + r() * 0.05);
      x.lineWidth = 0.6 + r() * 1.4;
      x.beginPath();
      x.moveTo(sx, sy);
      x.lineTo(sx + Math.cos(a) * sl, sy + Math.sin(a) * sl);
      x.stroke();
    }
    x.restore();

    // ── ATMOSPHERE — cool haze that adds air WITHOUT bleaching ──
    const hazeCol = K.mix(pal.base, pal.wet, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.13, S * 0.85, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(pal.cement, pal.base, 0.5), 0.10, S * 0.45, 'soft-light');

    // restore depth the haze lifted: re-deepen darks with a multiply fbm pass
    x.save();
    x.globalCompositeOperation = 'multiply';
    const dstep = Math.max(5, Math.floor(S / 160));
    for (let yy = 0; yy < H; yy += dstep) {
      for (let xx = 0; xx < W; xx += dstep) {
        const n = noise.fbm(xx / (S * 0.5) + 11, yy / (S * 0.5) + 7, 4);
        if (n < -0.05) {
          x.fillStyle = K.rgba(pal.deep, Math.min(0.22, -n * 0.5));
          x.fillRect(xx, yy, dstep + 1, dstep + 1);
        }
      }
    }
    x.restore();

    K.grain(x, W, H, 4.5, r);
    K.vignette(x, W, H, pal.rare ? 0.4 : 0.32);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const isGrail = r() < 0.0833;
    const pal = undefined
      ? (PALS.find((p) => p.name === undefined) || PALS[0])
      : pickPal(r, isGrail);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    // mirror the rust roll for trait reporting
    const rr = r();
    let rust;
    if (isGrail) rust = 'Veins';
    else if (mode === 'Rust Bloom') rust = 'Bloom';
    else if (rr < 0.16) rust = 'None';
    else if (rr < 0.40) rust = 'Edge';
    else if (rr < 0.66) rust = 'Veins';
    else rust = 'Bloom';
    return { Palette: pal.name, Mode: mode, Format: f, Rust: rust, Grail: isGrail ? 'Yes' : 'No' };
  }

  return { name: 'h3_sediment', draw, traits };
})();


export const coldJointTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderColdJoint: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const COLDJOINT_ASPECTS: readonly number[] = [0.8125,1,1.2308];
export const coldJointSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Sea Mortar",
        "Ash Render",
        "Tidal Float",
        "Kiln Damp",
        "Green Cement",
        "Wet Slab",
        "Oxide Vein"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Cold Pour",
        "Crack Lattice",
        "Tie Field",
        "Spall Field",
        "Joint Grid",
        "Drag Plane",
        "Rust Bloom",
        "Seam Circuit",
        "Efflorescent",
        "Sweep Field"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Square",
        "Portrait",
        "Landscape"
      ]
    },
    {
      "name": "Rust",
      "values": [
        "Bloom",
        "Edge",
        "None",
        "Veins"
      ]
    },
    {
      "name": "Grail",
      "values": [
        "No",
        "Yes"
      ]
    }
  ]
};
