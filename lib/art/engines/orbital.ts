// @ts-nocheck
/*
 * Orbital — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/gen/orbital.js). Layout axis (4-6 structurally distinct
 * compositions) + per-output colour range. Deterministic from tokenId only.
 * KIT helpers are bundled; trait schema derived from the engine's own casts.
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


/* ORBITAL — a zero-gravity bazaar tumbling in orbit.
 * Hundreds of small market stalls, cargo pods, lantern-drones and banners
 * drift in a loose swarm over the bright limb of a planet below. No up/down:
 * stalls tilt at every angle, a river of crowd-lights threads through the
 * cluster. A floating souk in space — warm goods against cool space.
 * TROPICAL ORBIT palette: coral / turquoise / cream-gold over a saturated
 * planet-limb glow.  Depth via atmospheric perspective: far stalls hazier,
 * desaturated, smaller; near stalls bold, lit, contrasty.
 *
 * LAYOUT AXIS (the camera/framing changes, not just the palette):
 *   Low Limb      — planet limb low, swarm arcing above in a wide band.
 *   Steep Diagonal— limb a steep corner-to-corner sweep, swarm riding it.
 *   Deep Cluster  — NO planet: deep space, a distant hard sun + lens flare,
 *                   one sparse cluster, big negative space.
 *   Hero Stalls   — tight close-up on 2-3 huge stalls; swarm tiny + hazy behind.
 *   Caravan       — a long ribbon of stalls streaming across the frame.
 *   Far Below     — looking down past the bazaar to a small planet far below. */
const ENGINE = (function () {
  const K = KIT;

  // COSMIC JEWEL territory: deep space, but the WHOLE field — planet limb,
  // space wash, nebulae, haze — takes a different rich JEWEL hue per output.
  // Goods (stalls / drones / threads) stay warm coral + gold so they always
  // read as warm market lights against whatever the jewel space hue is.
  // `tint` is the signature jewel; `space0/space1` are deep, desaturated
  // versions of that same hue so the dominant colour clearly shifts per output.
  const PALS = [
    // teal-ocean world
    { name: 'Ocean World', tint: '#1fd6c6', space0: '#06262e', space1: '#020c12',
      limb: '#1fc8c0', atmo: '#9ff4e6', warm: '#ff7a5e', gold: '#ffd98a',
      cool: '#3ce8d4', haze: '#1fc0bc' },
    // amber-desert world
    { name: 'Desert World', tint: '#ffae4a', space0: '#2c1a0c', space1: '#0f0804',
      limb: '#ffac46', atmo: '#ffe0a8', warm: '#ff7e52', gold: '#ffe6a0',
      cool: '#ffc070', haze: '#ffb868' },
    // violet gas-giant
    { name: 'Violet Giant', tint: '#9a6cff', space0: '#1c1140', space1: '#0a0620',
      limb: '#a070ff', atmo: '#d4baff', warm: '#ff8a6a', gold: '#ffd9a0',
      cool: '#b894ff', haze: '#9c78f0' },
    // rose world
    { name: 'Rose World', tint: '#ff5a92', space0: '#380e22', space1: '#16050e',
      limb: '#ff4e88', atmo: '#ffc4d4', warm: '#ff8a5e', gold: '#ffdca0',
      cool: '#ff9cc0', haze: '#ff6e96' },
    // ice-blue world
    { name: 'Ice World', tint: '#5aa8ff', space0: '#0a1c3a', space1: '#040a1c',
      limb: '#5aa0ff', atmo: '#c0ddff', warm: '#ff8e5e', gold: '#ffdfa0',
      cool: '#8cc4ff', haze: '#5a9ce8' },
    // ember world
    { name: 'Ember World', tint: '#ff5a4a', space0: '#2c0c10', space1: '#10040a',
      limb: '#ff4e44', atmo: '#ffb088', warm: '#ff7a52', gold: '#ffd28a',
      cool: '#ff8a6a', haze: '#ff6850' },
  ];

  const LAYOUTS = ['Low Limb', 'Steep Diagonal', 'Deep Cluster', 'Hero Stalls', 'Caravan', 'Far Below'];
  const TIMES = ['Day Side', 'Terminator', 'Night Trade'];

  // Per-layout preferred aspect — keeps each composition framed right.
  function fmtFor(layout, r) {
    switch (layout) {
      case 'Low Limb':       return K.pick([{ W: 1240, H: 940 }, { W: 1240, H: 1000 }], r);
      case 'Steep Diagonal': return K.pick([{ W: 1240, H: 1240 }, { W: 1240, H: 1000 }], r);
      case 'Deep Cluster':   return K.pick([{ W: 1240, H: 1240 }, { W: 1240, H: 940 }], r);
      case 'Hero Stalls':    return K.pick([{ W: 1240, H: 1240 }, { W: 980, H: 1240 }], r);
      case 'Caravan':        return K.pick([{ W: 1240, H: 820 }, { W: 1240, H: 700 }], r);
      case 'Far Below':      return K.pick([{ W: 980, H: 1240 }, { W: 1100, H: 1240 }], r);
      default:               return { W: 1240, H: 1240 };
    }
  }

  function params(r) {
    let pal = K.pick(PALS, r);
    if (undefined) pal = PALS.find((q) => q.name === undefined) || pal;
    let layout = K.pick(LAYOUTS, r);
    if (window.FORCE_LAYOUT) layout = window.FORCE_LAYOUT;
    const fmt = fmtFor(layout, r);
    const time = K.pick(TIMES, r);
    const density = 0.7 + r() * 0.6;
    return { pal, fmt, layout, time, density };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return { Layout: p.layout, Palette: p.pal.name, Time: p.time,
      Density: p.density > 1.05 ? 'Teeming' : p.density > 0.85 ? 'Busy' : 'Loose' };
  }

  // ───────────────────────── shared atmosphere ─────────────────────────

  function spaceWash(x, W, H, pal, r, dark) {
    const bg = x.createLinearGradient(0, 0, W * 0.2, H);
    bg.addColorStop(0, dark ? K.mix(pal.space0, '#000', 0.3) : pal.space0);
    bg.addColorStop(1, pal.space1);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    // jewel-tint nebula clouds — the signature hue saturating the whole field
    // so the DOMINANT colour of each output is its world's jewel, not a generic
    // dark. Tinted toward `tint`/`atmo`, lifted enough to read as colour.
    x.save(); x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 13; i++) {
      const nx = r() * W, ny = r() * H * 0.9;
      const nr = Math.min(W, H) * (0.22 + r() * 0.36);
      const pickC = r();
      const ncol = pickC < 0.6
        ? K.mix(pal.tint, pal.space0, 0.3 + r() * 0.25)
        : K.mix(pal.atmo, pal.tint, 0.3 + r() * 0.4);
      const ng = x.createRadialGradient(nx, ny, 0, nx, ny, nr);
      ng.addColorStop(0, K.rgba(ncol, 0.07 + r() * 0.08));
      ng.addColorStop(1, K.rgba(ncol, 0));
      x.fillStyle = ng; x.fillRect(nx - nr, ny - nr, nr * 2, nr * 2);
    }
    x.restore();

    // a broad directional jewel veil so even empty corners carry the hue
    x.save(); x.globalCompositeOperation = 'screen';
    const vg = x.createRadialGradient(W * (0.3 + r() * 0.4), H * (0.2 + r() * 0.3), 0,
      W * 0.5, H * 0.5, Math.max(W, H) * 0.85);
    vg.addColorStop(0, K.rgba(pal.tint, 0.10));
    vg.addColorStop(0.55, K.rgba(K.mix(pal.tint, pal.space0, 0.5), 0.06));
    vg.addColorStop(1, K.rgba(pal.tint, 0));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();
  }

  function starfield(x, W, H, pal, r, density) {
    const nStars = Math.floor(W * H / (1400 / density));
    for (let i = 0; i < nStars; i++) {
      const sxp = r() * W, syp = r() * H;
      const br = r();
      const sz = br > 0.94 ? 1.8 : br > 0.7 ? 1.1 : 0.7;
      const col = br > 0.9 ? pal.gold : br > 0.7 ? '#cfe6ff' : '#9fb0d0';
      x.fillStyle = K.rgba(col, 0.2 + br * 0.6);
      x.fillRect(sxp, syp, sz, sz);
    }
    for (let i = 0; i < 8; i++) {
      K.bloom(x, r() * W, r() * H * 0.8, 8 + r() * 14, i % 2 ? pal.gold : '#dff0ff', 0.05 + r() * 0.06);
    }
  }

  // a planet limb arc with atmosphere bloom; caller supplies the geometry.
  function drawLimb(x, W, H, pal, geo, noise, r) {
    const { cx, cy, R, tilt } = geo;
    const g = x.createRadialGradient(cx, cy, R * 0.62, cx, cy, R * 1.04);
    g.addColorStop(0, K.rgba(K.mix(pal.limb, '#000', 0.55), 0));
    g.addColorStop(0.78, K.rgba(K.mix(pal.limb, '#1a0a18', 0.2), 0.55));
    g.addColorStop(0.94, K.rgba(pal.limb, 0.95));
    g.addColorStop(1.0,  K.rgba(K.mix(pal.limb, '#fff', 0.15), 0.7));
    x.save();
    x.translate(cx, cy); x.rotate(tilt); x.translate(-cx, -cy);
    x.fillStyle = g;
    x.fillRect(-W * 1.5, -H * 1.5, W * 4, H * 4);

    x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.clip();
    x.globalCompositeOperation = 'overlay';
    for (let b = 0; b < 30; b++) {
      const t = b / 30;
      const ringR = R * (0.55 + t * 0.48);
      const n = noise.fbm(t * 3.6 + 5, 2.3, 4);
      const bandCol = K.mix(pal.limb, n > 0 ? pal.atmo : '#1a0610', 0.2 + Math.abs(n) * 0.45);
      x.strokeStyle = K.rgba(bandCol, 0.05 + Math.abs(n) * 0.12);
      x.lineWidth = R * (0.012 + Math.abs(n) * 0.05);
      x.beginPath();
      x.arc(cx, cy, ringR, Math.PI * 1.05, Math.PI * 1.95);
      x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
    for (let s = 0; s < 14; s++) {
      const ang = Math.PI * (1.1 + r() * 0.8);
      const rr = R * (0.6 + r() * 0.42);
      const mx = cx + Math.cos(ang) * rr, my = cy + Math.sin(ang) * rr;
      K.bloom(x, mx, my, R * (0.03 + r() * 0.05), r() < 0.5 ? pal.atmo : K.mix(pal.limb, '#000', 0.4), 0.06);
    }
    x.restore();

    x.save();
    x.translate(cx, cy); x.rotate(tilt); x.translate(-cx, -cy);
    const ga = x.createRadialGradient(cx, cy, R * 0.97, cx, cy, R * 1.18);
    ga.addColorStop(0, K.rgba(pal.atmo, 0));
    ga.addColorStop(0.35, K.rgba(pal.atmo, 0.5));
    ga.addColorStop(0.6, K.rgba(K.mix(pal.atmo, pal.limb, 0.4), 0.28));
    ga.addColorStop(1, K.rgba(pal.atmo, 0));
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = ga;
    x.fillRect(-W, -H, W * 3, H * 3);
    x.restore();
  }

  // a distant hard sun with a lens-flare streak (for the no-planet layout).
  function drawSun(x, W, H, pal, sx, sy, r) {
    const core = K.mix(pal.gold, '#fff', 0.5);
    // big soft halo
    K.bloom(x, sx, sy, Math.min(W, H) * 0.5, K.mix(pal.atmo, pal.gold, 0.4), 0.16);
    K.bloom(x, sx, sy, Math.min(W, H) * 0.22, pal.atmo, 0.22);
    // hot core
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(sx, sy, 0, sx, sy, Math.min(W, H) * 0.07);
    g.addColorStop(0, K.rgba(core, 1));
    g.addColorStop(0.4, K.rgba(K.mix(pal.gold, '#fff', 0.2), 0.8));
    g.addColorStop(1, K.rgba(pal.gold, 0));
    x.fillStyle = g; x.fillRect(sx - W, sy - H, W * 2, H * 2);
    // anamorphic streak
    x.strokeStyle = K.rgba(core, 0.5);
    x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(sx - W * 0.5, sy); x.lineTo(sx + W * 0.5, sy); x.stroke();
    x.strokeStyle = K.rgba(K.mix(pal.cool, '#fff', 0.4), 0.22);
    x.lineWidth = 1.2;
    x.beginPath(); x.moveTo(sx, sy - H * 0.4); x.lineTo(sx, sy + H * 0.4); x.stroke();
    // flare ghosts along the line to frame centre
    const cxF = W / 2, cyF = H / 2;
    for (let i = 1; i <= 5; i++) {
      const t = i / 5 * 1.6;
      const gx = sx + (cxF - sx) * t, gy = sy + (cyF - sy) * t;
      const gr = (6 + r() * 26) * (1 + i * 0.3);
      const gc = i % 2 ? pal.cool : pal.warm;
      x.save(); x.globalCompositeOperation = 'lighter';
      const fg = x.createRadialGradient(gx, gy, 0, gx, gy, gr);
      fg.addColorStop(0, K.rgba(gc, 0.10));
      fg.addColorStop(0.7, K.rgba(gc, 0.04));
      fg.addColorStop(1, K.rgba(gc, 0));
      x.fillStyle = fg; x.fillRect(gx - gr, gy - gr, gr * 2, gr * 2);
      x.restore();
    }
    x.restore();
  }

  // ───────────────────────── stall primitive ─────────────────────────

  function roundRect(x, X, Y, w, h, rad) {
    rad = Math.min(rad, w / 2, h / 2);
    x.beginPath();
    x.moveTo(X + rad, Y);
    x.arcTo(X + w, Y, X + w, Y + h, rad);
    x.arcTo(X + w, Y + h, X, Y + h, rad);
    x.arcTo(X, Y + h, X, Y, rad);
    x.arcTo(X, Y, X + w, Y, rad);
    x.closePath();
  }

  function drawStall(x, sx, sy, size, rot, depth, P, r, detail) {
    const { pal, time } = P;
    const fade = 1 - depth;
    const hazeMix = 0.12 + fade * 0.62;
    const w = size, h = size * (0.6 + r() * 0.7);
    const tone = r();
    let lit = tone < 0.42 ? pal.warm : tone < 0.72 ? pal.gold : pal.cool;
    if (time === 'Night Trade') lit = K.mix(lit, pal.gold, 0.25);

    x.save();
    x.translate(sx, sy);
    x.rotate(rot);

    if (depth > 0.4) K.softShadow(x, 2, 4, size * 1.5, 0.18 * depth);

    const hull = K.mix('#0c0a16', pal.haze, hazeMix * 0.5);
    if (detail && size > 60) {
      // close-up hull: a soft face-light gradient so it catches the planet glow
      const fg = x.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
      fg.addColorStop(0, K.rgba(K.mix(hull, pal.atmo, 0.35), 0.95));
      fg.addColorStop(0.5, K.rgba(K.mix(hull, '#000', 0.1), 0.95));
      fg.addColorStop(1, K.rgba(K.mix(hull, '#000', 0.4), 0.95));
      x.fillStyle = fg;
    } else {
      x.fillStyle = K.rgba(hull, 0.35 + depth * 0.6);
    }
    roundRect(x, -w / 2, -h / 2, w, h, size * 0.12);
    x.fill();

    x.strokeStyle = K.rgba(K.mix(lit, pal.atmo, 0.3), (0.25 + depth * 0.5) * (1 - fade * 0.4));
    x.lineWidth = Math.max(0.6, size * 0.04 * depth);
    roundRect(x, -w / 2, -h / 2, w, h, size * 0.12);
    x.stroke();

    const pw = w * (0.34 + r() * 0.3), ph = h * (0.3 + r() * 0.3);
    const px = -w / 2 + r() * (w - pw), py = -h / 2 + r() * (h - ph);
    const glowA = (0.5 + depth * 0.5) * (0.5 + r() * 0.5);
    x.fillStyle = K.rgba(lit, glowA);
    roundRect(x, px, py, pw, ph, size * 0.08);
    x.fill();

    if (depth > 0.55 && r() < 0.6) {
      x.fillStyle = K.rgba(K.mix(lit, '#fff', 0.3), glowA * 0.8);
      x.fillRect(px + pw * 0.1, py - h * 0.18, pw * 0.7, h * 0.08);
    }

    // extra hull detailing only for big hero stalls (close-up read)
    if (detail && size > 60) {
      // strut / mast
      x.strokeStyle = K.rgba(K.mix(hull, '#fff', 0.2), 0.4 + depth * 0.3);
      x.lineWidth = Math.max(1, size * 0.02);
      x.beginPath(); x.moveTo(0, -h / 2); x.lineTo(0, -h / 2 - size * (0.3 + r() * 0.4)); x.stroke();
      // tiny lit pennant on the mast
      x.fillStyle = K.rgba(lit, 0.7);
      x.fillRect(0, -h / 2 - size * 0.5, size * 0.18, size * 0.1);
      // a row of small windows
      const nWin = 2 + Math.floor(r() * 3);
      for (let k = 0; k < nWin; k++) {
        x.fillStyle = K.rgba(K.mix(lit, '#fff', 0.25), glowA * 0.7);
        x.fillRect(-w / 2 + w * 0.12 + k * (w * 0.7 / nWin), h * 0.18, w * 0.5 / nWin, h * 0.1);
      }
    }

    x.restore();

    if (depth > 0.3) K.bloom(x, sx, sy, size * (0.9 + depth), lit, 0.06 + depth * 0.12);
  }

  // crowd-light threads weaving through a region (curl flow).
  function lightThreads(x, W, H, cx0, cy0, spanX, spanY, P, noise, r, n) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    for (let t = 0; t < n; t++) {
      let lx = cx0 + (r() - 0.5) * spanX;
      let ly = cy0 + (r() - 0.5) * spanY;
      const threadCol = K.mix(t % 2 ? P.pal.cool : P.pal.gold, P.pal.warm, r() * 0.4);
      const steps = 80 + Math.floor(r() * 60);
      let prevx = lx, prevy = ly;
      for (let s = 0; s < steps; s++) {
        const c = K.curl(noise, lx + t * 40, ly + t * 40, 2);
        lx += c[0] * 60 + (r() - 0.5) * 6;
        ly += c[1] * 60 + (r() - 0.5) * 6;
        if (lx < -50 || lx > W + 50 || ly < -50 || ly > H + 50) break;
        const a = 0.06 + 0.10 * Math.sin(s / steps * Math.PI);
        x.strokeStyle = K.rgba(threadCol, a);
        x.lineWidth = 1 + Math.sin(s / steps * Math.PI) * 1.6;
        x.beginPath(); x.moveTo(prevx, prevy); x.lineTo(lx, ly); x.stroke();
        if (s % 4 === 0) {
          x.fillStyle = K.rgba(K.mix(threadCol, '#fff', 0.3), a * 1.6);
          x.fillRect(lx, ly, 1.4, 1.4);
        }
        prevx = lx; prevy = ly;
      }
    }
    x.restore();
  }

  function banners(x, W, H, items, P, r) {
    for (const b of items) {
      const fade = 1 - b.depth;
      x.save();
      x.translate(b.bx, b.by); x.rotate(b.rot);
      const tone = b.tone;
      const col = tone < 0.4 ? P.pal.warm : tone < 0.7 ? P.pal.cool : P.pal.gold;
      x.fillStyle = K.rgba(K.mix(col, P.pal.haze, fade * 0.5), 0.25 + b.depth * 0.55);
      x.fillRect(-b.len / 2, -b.wdt / 2, b.len, b.wdt);
      x.restore();
    }
  }

  function drones(x, W, H, pal, r, n, region) {
    for (let i = 0; i < n; i++) {
      const depth = Math.pow(r(), 1.4);
      let dx, dy;
      if (region) {
        dx = region.x0 + r() * region.w;
        dy = region.y0 + r() * region.h;
      } else { dx = r() * W; dy = r() * H * 0.96; }
      const tone = r();
      const col = tone < 0.4 ? pal.warm : tone < 0.7 ? pal.gold : pal.cool;
      const rad = 2 + depth * depth * 22;
      K.bloom(x, dx, dy, rad, col, 0.08 + depth * 0.18);
      x.fillStyle = K.rgba(K.mix(col, '#fff', 0.4), 0.4 + depth * 0.5);
      x.fillRect(dx - depth, dy - depth, 1 + depth * 2, 1 + depth * 2);
    }
  }

  function hazeAndFinish(x, W, H, pal, noise, r, lowBand) {
    x.save(); x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 22; i++) {
      const fx = r() * W, fy = lowBand ? H * (0.4 + r() * 0.6) : r() * H;
      const fr = Math.min(W, H) * (0.12 + r() * 0.26);
      const fn = (noise.fbm(fx / 200, fy / 200, 3) + 1) / 2;
      const fcol = K.mix(pal.haze, pal.atmo, r() * 0.5);
      const fg = x.createRadialGradient(fx, fy, 0, fx, fy, fr);
      fg.addColorStop(0, K.rgba(fcol, 0.04 + fn * 0.07));
      fg.addColorStop(1, K.rgba(fcol, 0));
      x.fillStyle = fg; x.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
    }
    x.restore();
    if (lowBand) {
      const fog = x.createLinearGradient(0, H * 0.45, 0, H);
      fog.addColorStop(0, K.rgba(pal.haze, 0));
      fog.addColorStop(1, K.rgba(pal.haze, 0.2));
      x.save(); x.globalCompositeOperation = 'screen';
      x.fillStyle = fog; x.fillRect(0, 0, W, H);
      x.restore();
    }
    K.grain(x, W, H, 90, r);
    K.vignette(x, W, H, 0.55);
  }

  // build a swarm: array of {px,py,depth,size,rot}. `shape` callback maps a
  // sample (r0,r1) + index to a position+depth; sizing follows depth.
  function buildSwarm(count, place, r, sizeScale) {
    const items = [];
    for (let i = 0; i < count; i++) {
      const p = place(i / count, r);
      const size = (4 + p.depth * p.depth * 46 * (sizeScale || 1)) * (0.7 + r() * 0.6);
      const rot = (r() - 0.5) * Math.PI;
      items.push({ px: p.px, py: p.py, depth: p.depth, size, rot });
    }
    items.sort((a, b) => a.depth - b.depth);
    return items;
  }

  function buildBanners(count, cx, cy, sx, sy, r) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const depth = Math.pow(r(), 1.3);
      const len = (10 + depth * 60) * (0.6 + r());
      out.push({
        bx: cx + (r() - 0.5) * sx, by: cy + (r() - 0.5) * sy,
        depth, len, wdt: Math.max(1.2, len * 0.06),
        rot: (r() - 0.5) * Math.PI, tone: r(),
      });
    }
    return out;
  }

  // ───────────────────────── the layouts ─────────────────────────

  function draw(cv, seed) {
    const r = K.rng(seed);
    const P = params(r);
    const { fmt, pal, layout, density } = P;
    cv.width = fmt.W; cv.height = fmt.H;
    const W = cv.width, H = cv.height;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);

    if (layout === 'Deep Cluster') {
      // No planet. Big negative space, distant hard sun + lens flare, one
      // sparse loose cluster off to a third.
      spaceWash(x, W, H, pal, r, true);
      starfield(x, W, H, pal, r, 1.4);
      const sunX = W * (r() < 0.5 ? 0.16 : 0.84), sunY = H * (0.18 + r() * 0.22);
      drawSun(x, W, H, pal, sunX, sunY, r);

      // cluster sits opposite the sun, lower third
      const cx0 = sunX < W / 2 ? W * (0.6 + r() * 0.18) : W * (0.22 + r() * 0.18);
      const cy0 = H * (0.55 + r() * 0.2);
      const spread = Math.min(W, H) * 0.34;
      // ambient sun-fill on the cluster so it never reads dim
      K.bloom(x, cx0, cy0, spread * 1.6, K.mix(pal.atmo, pal.haze, 0.4), 0.12);
      lightThreads(x, W, H, cx0, cy0, spread * 1.4, spread * 1.4, P, noise, r, 4 + Math.floor(density * 2));

      const items = buildSwarm(Math.floor(95 * density), (t, rr) => {
        const ang = rr() * Math.PI * 2;
        const rad = Math.pow(rr(), 0.75) * spread;
        return {
          px: cx0 + Math.cos(ang) * rad,
          py: cy0 + Math.sin(ang) * rad * 0.85,
          depth: K.clamp(1 - rad / spread + (rr() - 0.5) * 0.4, 0.04, 1),
        };
      }, r, 0.9);
      banners(x, W, H, buildBanners(Math.floor(22 * density), cx0, cy0, spread * 1.6, spread * 1.4, r), P, r);
      for (const it of items) drawStall(x, it.px, it.py, it.size, it.rot, it.depth, P, r, true);
      // a few hero stalls catching the sun
      for (let i = 0; i < 3; i++) {
        const ang = r() * Math.PI * 2, rad = Math.pow(r(), 0.6) * spread * 0.6;
        drawStall(x, cx0 + Math.cos(ang) * rad, cy0 + Math.sin(ang) * rad * 0.85, 56 + r() * 36, (r() - 0.5) * Math.PI, 0.92 + r() * 0.08, P, r, true);
      }
      drones(x, W, H, pal, r, Math.floor(40 * density), { x0: cx0 - spread, y0: cy0 - spread, w: spread * 2, h: spread * 2 });
      hazeAndFinish(x, W, H, pal, noise, r, false);
      return { aspect: W / H };
    }

    if (layout === 'Hero Stalls') {
      // Tight close-up: 2-3 huge stalls fill the frame; tiny hazy swarm behind.
      spaceWash(x, W, H, pal, r, false);
      starfield(x, W, H, pal, r, 0.8);
      // a faint limb glow low for depth
      drawLimb(x, W, H, pal, { cx: W * 0.5, cy: H * 1.9, R: H * 1.5, tilt: (r() - 0.5) * 0.2 }, noise, r);

      // far tiny swarm, spread wide and hazy
      const items = buildSwarm(Math.floor(120 * density), (t, rr) => ({
        px: rr() * W, py: rr() * H * 0.85,
        depth: Math.pow(rr(), 2.2) * 0.45,
      }), r, 0.6);
      lightThreads(x, W, H, W * 0.5, H * 0.4, W * 0.8, H * 0.6, P, noise, r, 4);
      for (const it of items) drawStall(x, it.px, it.py, it.size, it.rot, it.depth, P, r, false);
      drones(x, W, H, pal, r, Math.floor(30 * density), null);

      // mid haze sheet to separate hero from background
      x.save(); x.globalCompositeOperation = 'screen';
      const sg = x.createRadialGradient(W / 2, H * 0.55, 0, W / 2, H * 0.55, Math.max(W, H) * 0.6);
      sg.addColorStop(0, K.rgba(pal.haze, 0.16));
      sg.addColorStop(1, K.rgba(pal.haze, 0));
      x.fillStyle = sg; x.fillRect(0, 0, W, H);
      x.restore();

      // 2-3 heroes at a COMFORTABLE mid-distance (camera pulled back) — a clear
      // focal cluster, never an object looming huge against the lens. Cap the
      // foreground size so the biggest stall sits mid-frame, not jammed up front.
      const nH = 2 + Math.floor(r() * 2);
      const heroes = [];
      for (let i = 0; i < nH; i++) {
        heroes.push({
          px: W * (0.32 + (i / Math.max(1, nH - 1)) * 0.36 + (r() - 0.5) * 0.1),
          py: H * (0.46 + r() * 0.22),
          size: Math.min(W, H) * (0.17 + r() * 0.05),
          rot: (r() - 0.5) * 0.7,
          depth: 0.9 + r() * 0.08,
        });
      }
      heroes.sort((a, b) => a.size - b.size);
      for (const hh of heroes) drawStall(x, hh.px, hh.py, hh.size, hh.rot, hh.depth, P, r, true);
      // foreground sparkle drones near heroes
      drones(x, W, H, pal, r, 18, { x0: W * 0.15, y0: H * 0.4, w: W * 0.7, h: H * 0.45 });
      hazeAndFinish(x, W, H, pal, noise, r, true);
      return { aspect: W / H };
    }

    if (layout === 'Caravan') {
      // A long ribbon of stalls streaming diagonally across a wide frame.
      spaceWash(x, W, H, pal, r, false);
      starfield(x, W, H, pal, r, 1.0);
      // optional thin distant limb at very bottom
      if (r() < 0.5) drawLimb(x, W, H, pal, { cx: W * 0.5, cy: H * 2.4, R: H * 2.0, tilt: 0 }, noise, r);

      // the ribbon path: a gentle sine sweep from one edge to the other
      const yMid = H * (0.4 + r() * 0.2);
      const amp = H * (0.12 + r() * 0.14);
      const phase = r() * Math.PI * 2;
      const freq = 1 + r() * 1.2;
      const dir = r() < 0.5 ? 1 : -1;
      const pathY = (tx) => yMid + Math.sin(phase + tx * Math.PI * freq) * amp * (dir);
      // perspective: ribbon swells from one end (near) to the other (far)
      const nearLeft = r() < 0.5;

      lightThreads(x, W, H, W * 0.5, yMid, W * 0.9, amp * 3, P, noise, r, 3 + Math.floor(density * 2));

      const count = Math.floor(150 * density);
      const items = [];
      for (let i = 0; i < count; i++) {
        const tx = r();
        const along = nearLeft ? (1 - tx) : tx; // 1 near .. 0 far
        const depth = K.clamp(Math.pow(along, 1.1) * (0.9 + (r() - 0.5) * 0.3), 0.04, 1);
        const py = pathY(tx) + (r() - 0.5) * amp * 1.4;
        const size = (5 + depth * depth * 52) * (0.7 + r() * 0.6);
        items.push({ px: tx * W, py, depth, size, rot: (r() - 0.5) * Math.PI });
      }
      items.sort((a, b) => a.depth - b.depth);
      banners(x, W, H, buildBanners(Math.floor(34 * density), W * 0.5, yMid, W * 0.9, amp * 2.5, r), P, r);
      for (const it of items) drawStall(x, it.px, it.py, it.size, it.rot, it.depth, P, r, it.size > 60);
      // lead caravan stall at the near end — pulled back to a mid-distance size
      const lx = nearLeft ? W * 0.1 : W * 0.9;
      drawStall(x, lx, pathY(nearLeft ? 0 : 1), Math.min(W, H) * 0.15, (r() - 0.5) * 0.6, 0.94, P, r, true);
      drones(x, W, H, pal, r, Math.floor(45 * density), { x0: 0, y0: yMid - amp * 2, w: W, h: amp * 4 });
      hazeAndFinish(x, W, H, pal, noise, r, false);
      return { aspect: W / H };
    }

    if (layout === 'Far Below') {
      // Looking down past the bazaar to a small planet far below. The planet is
      // a small disk near the bottom; stalls scatter receding toward it.
      spaceWash(x, W, H, pal, r, true);
      starfield(x, W, H, pal, r, 1.2);

      // small full planet disk, low and small
      const pcx = W * (0.4 + r() * 0.2), pcy = H * (0.82 + r() * 0.1);
      const pR = Math.min(W, H) * (0.18 + r() * 0.1);
      x.save();
      const pg = x.createRadialGradient(pcx - pR * 0.3, pcy - pR * 0.3, pR * 0.1, pcx, pcy, pR);
      pg.addColorStop(0, K.rgba(K.mix(pal.limb, pal.atmo, 0.4), 0.95));
      pg.addColorStop(0.6, K.rgba(pal.limb, 0.9));
      pg.addColorStop(1, K.rgba(K.mix(pal.limb, '#000', 0.6), 0.95));
      x.beginPath(); x.arc(pcx, pcy, pR, 0, Math.PI * 2); x.fillStyle = pg; x.fill();
      // terminator shade
      x.beginPath(); x.arc(pcx, pcy, pR, 0, Math.PI * 2); x.clip();
      for (let b = 0; b < 16; b++) {
        const n = noise.fbm(b * 0.5 + 2, 1.4, 4);
        x.strokeStyle = K.rgba(K.mix(pal.limb, pal.atmo, 0.3 + Math.abs(n) * 0.4), 0.08);
        x.lineWidth = pR * 0.06;
        x.beginPath(); x.arc(pcx + pR * 0.2, pcy, pR * (0.3 + b * 0.06), 0, Math.PI * 2); x.stroke();
      }
      x.restore();
      // atmosphere rim
      K.bloom(x, pcx, pcy, pR * 1.5, pal.atmo, 0.18);

      // stalls scatter across the upper frame, receding toward the planet:
      // near = top/big, far = small near the planet.
      const count = Math.floor(150 * density);
      const items = [];
      for (let i = 0; i < count; i++) {
        const ty = Math.pow(r(), 0.7); // bias toward top (near)
        const depth = K.clamp((1 - ty) * (0.9 + (r() - 0.5) * 0.3), 0.03, 1);
        // converge horizontally toward the planet as they recede
        const conv = ty;
        const px = (r() * W) * (1 - conv) + (pcx + (r() - 0.5) * pR * 1.2) * conv;
        const py = ty * (pcy - pR * 1.3);
        const size = (4 + depth * depth * 56) * (0.7 + r() * 0.6);
        items.push({ px, py, depth, size, rot: (r() - 0.5) * Math.PI });
      }
      items.sort((a, b) => a.depth - b.depth);
      lightThreads(x, W, H, W * 0.5, H * 0.4, W * 0.8, H * 0.7, P, noise, r, 4 + Math.floor(density * 2));
      banners(x, W, H, buildBanners(Math.floor(30 * density), W * 0.5, H * 0.35, W * 0.8, H * 0.6, r), P, r);
      for (const it of items) drawStall(x, it.px, it.py, it.size, it.rot, it.depth, P, r, it.size > 60);
      // foreground heroes near the top — capped + nudged off the very edge so
      // they read as a focal cluster, not stalls crowding the lens.
      for (let i = 0; i < 3; i++) {
        drawStall(x, W * (0.2 + r() * 0.6), H * (0.09 + r() * 0.16), Math.min(W, H) * (0.085 + r() * 0.035), (r() - 0.5) * Math.PI, 0.92 + r() * 0.05, P, r, true);
      }
      drones(x, W, H, pal, r, Math.floor(45 * density), null);
      hazeAndFinish(x, W, H, pal, noise, r, false);
      return { aspect: W / H };
    }

    // ── Low Limb & Steep Diagonal share the "limb + band of swarm" base ──
    let geo, bandCx, bandCy, bandSpanX, bandSpanY, lowBand;
    if (layout === 'Steep Diagonal') {
      const rising = r() < 0.5;
      geo = rising
        ? { cx: W * 1.4, cy: H * 1.2, R: Math.max(W, H) * 1.3, tilt: -0.5 - r() * 0.2 }
        : { cx: W * -0.4, cy: H * 1.2, R: Math.max(W, H) * 1.3, tilt: 0.5 + r() * 0.2 };
      // swarm rides the diagonal, pushed toward the limb corner so the
      // composition reads as a steep sweep, not a centred cluster.
      bandCx = W * (rising ? 0.34 : 0.66); bandCy = H * (rising ? 0.34 : 0.34);
      bandSpanX = W * 0.62; bandSpanY = H * 0.62;
      lowBand = false;
    } else {
      // Low Limb
      const tilt = (r() - 0.5) * 0.16;
      geo = { cx: W * 0.5, cy: H * 1.55, R: H * 1.25, tilt };
      bandCx = W * (0.4 + r() * 0.2); bandCy = H * (0.34 + r() * 0.16);
      bandSpanX = W * 0.84; bandSpanY = H * 0.5;
      lowBand = true;
    }

    spaceWash(x, W, H, pal, r, false);
    starfield(x, W, H, pal, r, 1.0);
    drawLimb(x, W, H, pal, geo, noise, r);

    lightThreads(x, W, H, bandCx, bandCy, bandSpanX, bandSpanY, P, noise, r, 5 + Math.floor(density * 3));

    const baseCount = Math.floor(170 * density);
    const items = buildSwarm(baseCount, (t, rr) => {
      const inCluster = rr() < 0.6;
      if (inCluster) {
        const ang = rr() * Math.PI * 2;
        const rad = Math.pow(rr(), 0.7) * Math.min(bandSpanX, bandSpanY) * 0.55;
        return {
          px: bandCx + Math.cos(ang) * rad * (0.9 + rr() * 0.4),
          py: bandCy + Math.sin(ang) * rad * (0.7 + rr() * 0.4),
          depth: K.clamp(1 - rad / (Math.min(bandSpanX, bandSpanY) * 0.55) + (rr() - 0.5) * 0.5, 0.02, 1),
        };
      }
      return {
        px: bandCx + (rr() - 0.5) * bandSpanX * 1.3,
        py: bandCy + (rr() - 0.5) * bandSpanY * 1.4,
        depth: Math.pow(rr(), 1.6) * 0.7,
      };
    }, r, 1);

    banners(x, W, H, buildBanners(Math.floor(40 * density), bandCx, bandCy, bandSpanX, bandSpanY, r), P, r);
    for (const it of items) drawStall(x, it.px, it.py, it.size, it.rot, it.depth, P, r, false);
    // hero stalls
    const nHero = 3 + Math.floor(r() * 3);
    for (let i = 0; i < nHero; i++) {
      const ang = r() * Math.PI * 2;
      const rad = Math.pow(r(), 0.6) * Math.min(bandSpanX, bandSpanY) * 0.3;
      drawStall(x, bandCx + Math.cos(ang) * rad, bandCy + Math.sin(ang) * rad * 0.85,
        52 + r() * 38, (r() - 0.5) * Math.PI, 0.9 + r() * 0.1, P, r, true);
    }
    drones(x, W, H, pal, r, Math.floor(90 * density), null);
    hazeAndFinish(x, W, H, pal, noise, r, lowBand);
    return { aspect: W / H };
  }

  return { draw, traits };
})();


export const orbitalTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderOrbital: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const ORBITAL_ASPECTS: readonly number[] = [1.3191,1.24,1,0.7903,1.5122,1.7714,0.8871];
export const orbitalSchema: TraitSchema = {
  "traits": [
    {
      "name": "Layout",
      "values": [
        "Deep Cluster",
        "Hero Stalls",
        "Caravan",
        "Far Below",
        "Low Limb",
        "Steep Diagonal"
      ]
    },
    {
      "name": "Palette",
      "values": [
        "Rose World",
        "Ember World",
        "Desert World",
        "Ice World",
        "Ocean World",
        "Violet Giant"
      ]
    },
    {
      "name": "Time",
      "values": [
        "Terminator",
        "Day Side",
        "Night Trade"
      ]
    },
    {
      "name": "Density",
      "values": [
        "Teeming",
        "Loose",
        "Busy"
      ]
    }
  ]
};
