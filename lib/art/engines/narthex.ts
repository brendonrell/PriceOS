// @ts-nocheck
/*
 * Narthex — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/h4_threshold4.js). A freestanding dusk arch that frames a world
 * different from the one around it. Continuous seed-driven system; deterministic
 * from tokenId only. KIT bundled; trait schema derived from the engine's casts.
 * Halo tournament champion (2026-07). Signature colorway: Grail.
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


/* THRESHOLD — a freestanding arch standing in a landscape, the world seen
 * THROUGH the opening a DIFFERENT world than the one around it.
 * SURREAL = real-but-off: one law broken (night inside a noon field, a sea
 * inside a desert, a season that doesn't belong). Calm, uncanny, quiet awe.
 * Palette world: deep plum/aubergine surround, warm sodium glow through the
 * opening, dusk. Hazy + textured every frame — never flat vector.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palettes — all deep-plum/aubergine surround + warm sodium
     interior, but each a different dusk weather/temperature so the SET reads
     varied, never one look reskinned.
       surA/surB/surC : surround sky (top→horizon), aubergine family
       land           : surround ground / earth
       stone          : arch masonry lit face
       stoneShade     : arch masonry shaded face
       glow           : the warm sodium glow that bleeds from the opening
       inA/inB        : the OTHER-world interior gradient (mode recolours it)
       ink            : darkest accent / silhouettes
       star           : star / specular dot colour */
  const PALS = [
    // deep aubergine/plum HERO — warm sodium interior against a rich plum dusk
    { name: 'Aubergine Hero', surA: '#1E1220', surB: '#3A1F3C', surC: '#5E2E52', land: '#2A1628', stone: '#8A6070', stoneShade: '#38202E', glow: '#F0A64E', inA: '#F0A64E', inB: '#7A2E36', ink: '#120A14', star: '#FFE6B8' },
    // colder INDIGO / teal-night — deep blue surround, teal-lit night interior
    { name: 'Indigo Night',   surA: '#141326', surB: '#242246', surC: '#38386A', land: '#191830', stone: '#5E6088', stoneShade: '#20223E', glow: '#6FB2C0', inA: '#173040', inB: '#08101E', ink: '#0A0A18', star: '#BFE6FF' },
    // warm SODIUM / ember dusk — orange-fired surround, molten interior
    { name: 'Sodium Ember',   surA: '#20121A', surB: '#451E26', surC: '#7A3630', land: '#2E161A', stone: '#8A5E54', stoneShade: '#38201E', glow: '#FF9A3C', inA: '#FFB24E', inB: '#8A2A1E', ink: '#160A0C', star: '#FFE0A6' },
    // pale ASH / silver twilight — cool grey-lilac, luminous silver interior
    { name: 'Ash Twilight',   surA: '#1C1A24', surB: '#332E3E', surC: '#544C60', land: '#242030', stone: '#9A909C', stoneShade: '#38323E', glow: '#CFC2D8', inA: '#E4ECF2', inB: '#6E7C96', ink: '#100E16', star: '#F6F9FC' },
    // bold high-contrast GRAIL — near-black plum surround, blazing gold portal
    { name: 'Grail',          surA: '#0E0812', surB: '#241026', surC: '#421838', land: '#160A16', stone: '#7A5A5E', stoneShade: '#2A1420', glow: '#FFC24A', inA: '#FFD24E', inB: '#6A1C1E', ink: '#080407', star: '#FFF0C4' },
    // teal SEA aubergine — plum surround, cool sea-green interior
    { name: 'Aubergine Sea',  surA: '#201628', surB: '#3A2842', surC: '#5A3E58', land: '#2A1E30', stone: '#84687A', stoneShade: '#382638', glow: '#D89464', inA: '#6FA6A0', inB: '#204048', ink: '#140E1A', star: '#DDEEE8' },
    // iris NOCTURNE — violet dusk, cold star-blue night interior
    { name: 'Iris Nocturne',  surA: '#1A1630', surB: '#2E2A54', surC: '#4A4278', land: '#221E3A', stone: '#6C6494', stoneShade: '#2A2648', glow: '#C79ADC', inA: '#141F42', inB: '#080A1E', ink: '#0E0C1C', star: '#CFE0FF' },
  ];

  const MODES = ['Night-in-Day', 'Sea-in-Sand', 'Other Season', 'Double Arch', 'Ruined Arch', 'Mirror Arch'];
  const FORMATS = [[1040, 1300], [1180, 1180]]; // portrait (0.8) / square

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  // ── small drawing helpers ──────────────────────────────────────────────
  function lerp(a, b, t) { return a + (b - a) * t; }

  // build the closed path of an arch OPENING (interior void) as a doorway:
  // straight jambs rising to a head that is either a true semicircle (round)
  // or a gothic two-centred pointed arch (two arcs meeting at an apex).
  // The apex/crown sits at oy regardless of head type, so the stone ring
  // (defined the same way) always fully caps it — no triangle poking out.
  // Draw the curved HEAD of an arch from the left spring point up over the
  // crown to the right spring point. Round = semicircle. Pointed = gothic
  // two-centred arch, sampled as line segments (robust, no arc-direction bugs).
  function archHeadPath(x, ox, oy, halfW, springY, pointed, move) {
    if (move) x.moveTo(ox - halfW, springY);
    if (!pointed) {
      x.arc(ox, springY, halfW, Math.PI, 0, false);
      return;
    }
    const rise = springY - oy;                       // crown height above spring
    // centre offset along the springline so each arc passes through apex(ox,oy)
    const c = (rise * rise - halfW * halfW) / (2 * halfW);
    const cOff = Math.max(0, c);
    const R = halfW + cOff;
    const N = 24;
    // Sample by HEIGHT (y from springY up to apex oy) and solve x on each
    // circle — robust, no angle-wrap. LEFT arc centre at (ox+cOff), take the
    // LEFT intersection (x = centreX - sqrt(...)).
    const lc = ox + cOff;
    for (let i = 1; i <= N; i++) {
      const yy = springY - (rise) * (i / N);
      const dx = Math.sqrt(Math.max(0, R * R - (yy - springY) * (yy - springY)));
      x.lineTo(lc - dx, yy);
    }
    // RIGHT arc centre at (ox-cOff), take RIGHT intersection, y from apex down.
    const rc = ox - cOff;
    for (let i = 1; i <= N; i++) {
      const yy = oy + (rise) * (i / N);
      const dx = Math.sqrt(Math.max(0, R * R - (yy - springY) * (yy - springY)));
      x.lineTo(rc + dx, yy);
    }
  }

  function archOpeningPath(x, ox, oy, ow, oh, pointed) {
    const half = ow / 2;
    const rise = pointed ? half * 1.25 : half;   // pointed heads rise taller
    const springY = oy + rise;                   // crown at oy, spring below
    x.beginPath();
    x.moveTo(ox - half, oy + oh);                // bottom-left
    x.lineTo(ox - half, springY);                // up left jamb
    archHeadPath(x, ox, oy, half, springY, pointed, false);
    x.lineTo(ox + half, oy + oh);                // down right jamb
    x.closePath();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 3);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // horizon height varies WIDE — a low sea-line high in frame, or a high
    // vantage with the ground filling most of the picture.
    const hz = H * (0.42 + r() * 0.34);

    // ════════════════════════════════════════════════════════════════════
    // 1. SURROUND WORLD — the aubergine dusk the arch stands within
    // ════════════════════════════════════════════════════════════════════
    const sky = x.createLinearGradient(0, 0, 0, hz);
    sky.addColorStop(0, pal.surA);
    sky.addColorStop(0.55, pal.surB);
    sky.addColorStop(1, pal.surC);
    x.fillStyle = sky; x.fillRect(0, 0, W, hz + 2);

    // a low, distant dusk light source on the horizon (not the portal glow)
    const sunSide = r() < 0.5 ? -1 : 1;
    const sunX = W * (0.5 + sunSide * (0.22 + r() * 0.14));
    const sunY = hz * (0.9 + r() * 0.06);
    K.bloom(x, sunX, sunY, S * (0.6 + r() * 0.25), K.mix(pal.surC, pal.glow, 0.5), 0.28);

    // ground plane — earth/field receding to the horizon
    const grd = x.createLinearGradient(0, hz, 0, H);
    grd.addColorStop(0, K.mix(pal.land, pal.surC, 0.45));
    grd.addColorStop(0.4, pal.land);
    grd.addColorStop(1, K.mix(pal.land, pal.ink, 0.5));
    x.fillStyle = grd; x.fillRect(0, hz - 1, W, H - hz + 1);

    // faint low rolling-land silhouettes on the surround horizon (depth)
    x.save();
    x.fillStyle = K.rgba(pal.ink, 0.30);
    let py = hz;
    x.beginPath(); x.moveTo(0, hz);
    for (let i = 0; i <= 28; i++) {
      const tx = (i / 28) * W;
      const n = noise.fbm(tx / (W * 0.4) + 11, 4.2, 3);
      x.lineTo(tx, hz - S * 0.02 - n * S * 0.035);
    }
    x.lineTo(W, hz); x.closePath(); x.fill();
    x.restore();

    // ════════════════════════════════════════════════════════════════════
    // 2. ARCH GEOMETRY — placement + opening definition (varies by mode)
    // ════════════════════════════════════════════════════════════════════
    // The arch stands on the ground. Opening is the interior void we'll fill
    // with the OTHER world. Jamb thickness = the stone frame around it.
    const pointed = (mode === 'Other Season') ? r() < 0.55 : r() < 0.35;

    // ── COMPOSITION ARCHETYPE — the single biggest lever on how a frame reads.
    // Four families give the set real range instead of one centred portrait:
    //   0 MONUMENTAL : near, towering gate — fills most of the frame, cropped top
    //   1 PORTRAIT   : the classic centred doorway, medium scale
    //   2 DISTANT    : a small arch set far back, low on a high horizon, lots of air
    //   3 OFFSET     : arch pushed hard to one side, asymmetric negative space
    const comp = r();
    const CT = comp < 0.24 ? 0 : comp < 0.60 ? 1 : comp < 0.82 ? 2 : 3;
    const wide = r();       // secondary width/aspect roll
    const posR = r();       // horizontal position roll
    const baseR = r();      // how high it stands on the ground
    const jambR = r();      // jamb thickness roll

    let ow, ar, ox, oBase;
    if (CT === 0) {          // MONUMENTAL — huge, near, cropped by the top edge
      ow = W * (0.50 + wide * 0.20);              // 0.50..0.70 W
      ar = 1.35 + wide * 0.5;
      ox = W * (0.34 + posR * 0.32);
      oBase = hz + (H - hz) * (0.30 + baseR * 0.45);
    } else if (CT === 1) {   // PORTRAIT — the classic centred-ish doorway
      ow = W * (0.28 + wide * 0.16);              // 0.28..0.44 W
      ar = 1.35 + wide * 0.55;
      ox = W * (0.36 + posR * 0.28);
      oBase = hz + (H - hz) * (0.14 + baseR * 0.30);
    } else if (CT === 2) {   // DISTANT — small, far back, sitting on the horizon
      ow = W * (0.13 + wide * 0.11);              // 0.13..0.24 W
      ar = 1.45 + wide * 0.6;
      ox = W * (0.24 + posR * 0.52);
      oBase = hz + (H - hz) * (0.02 + baseR * 0.14);
    } else {                 // OFFSET — pushed to one edge, big negative space
      ow = W * (0.30 + wide * 0.16);
      ar = 1.4 + wide * 0.6;
      ox = posR < 0.5 ? W * (0.20 + posR * 0.20) : W * (0.60 + (posR - 0.5) * 0.36);
      oBase = hz + (H - hz) * (0.16 + baseR * 0.34);
    }
    const oh = Math.min(H * 0.92, ow * ar);
    const oy = oBase - oh;                        // top of opening rect region
    // jamb (frame) thickness varies per output, thinner for ruins
    const jamb = ow * ((mode === 'Ruined Arch' ? 0.12 : 0.15) + jambR * 0.08);

    // ════════════════════════════════════════════════════════════════════
    // 3. THE OTHER WORLD — painted into a clipped region = the opening
    // ════════════════════════════════════════════════════════════════════
    function paintOtherWorld(clipDoubleInner) {
      x.save();
      archOpeningPath(x, ox, oy, ow, oh, pointed);
      x.clip();

      const half = ow / 2;
      const ix0 = ox - half, iy0 = oy, iw = ow, ih = oh;
      const ihz = oy + oh * (0.40 + r() * 0.34); // interior horizon (its own!)

      if (mode === 'Night-in-Day' || mode === 'Mirror Arch') {
        // a NIGHT sky framed inside a dusk field — DEEP, with stars + a moon.
        // Push the top to near-black so the moon and stars punch with contrast.
        const gn = x.createLinearGradient(0, iy0, 0, iy0 + ih);
        gn.addColorStop(0, K.mix(pal.inB, '#000', 0.42));
        gn.addColorStop(0.5, K.mix(pal.inA, pal.inB, 0.35));
        gn.addColorStop(0.82, K.mix(pal.inA, pal.star, 0.10));
        gn.addColorStop(1, K.mix(pal.inA, '#000', 0.15));
        x.fillStyle = gn; x.fillRect(ix0, iy0, iw, ih);
        // moon — size, both axes of position, and crescent phase all seeded so
        // no two night skies hang the moon in the same spot. Big warm halo so
        // it reads as the clear focal point even in a small distant arch.
        const mr = iw * (0.12 + r() * 0.14);
        const mx = ix0 + iw * (0.16 + r() * 0.68), my = iy0 + ih * (0.10 + r() * 0.40);
        K.bloom(x, mx, my, mr * (3.4 + r() * 1.8), pal.star, 0.5);
        // bright moon disc with a subtle warm-cool falloff
        x.fillStyle = K.rgba(pal.star, 0.98);
        x.beginPath(); x.arc(mx, my, mr, 0, 7); x.fill();
        // crescent / gibbous: shadow disc offset varies → different phase each time.
        // Cut the shadow near-black so the lit limb reads as a crisp crescent.
        const phx = (r() - 0.5) * 1.1, phy = (r() - 0.5) * 0.7;
        x.fillStyle = K.rgba(K.mix(pal.inB, '#000', 0.5), 0.78);
        x.beginPath(); x.arc(mx + mr * phx, my + mr * phy, mr * (0.82 + r() * 0.16), 0, 7); x.fill();
        // a low band of distant night land/cloud at a seeded height (depth)
        if (r() < 0.6) {
          const bandY = iy0 + ih * (0.55 + r() * 0.3);
          x.save(); x.beginPath(); x.moveTo(ix0, bandY);
          for (let k = 0; k <= 16; k++) { const tx = ix0 + iw * (k / 16); x.lineTo(tx, bandY - Math.sin(k * 0.8 + seed) * ih * 0.02 - ih * 0.01); }
          x.lineTo(ix0 + iw, iy0 + ih); x.lineTo(ix0, iy0 + ih); x.closePath();
          x.fillStyle = K.rgba(K.mix(pal.inB, '#000', 0.3), 0.5); x.fill(); x.restore();
        }
        // stars — count, spread, and a seeded faint twinkle of brighter dots
        const ns = 70 + (r() * 130 | 0);
        const starTop = 0.85 + r() * 0.12;
        for (let i = 0; i < ns; i++) {
          const sx = ix0 + r() * iw, sy = iy0 + r() * ih * starTop;
          const sz = r() < 0.88 ? 0.6 + r() * 1.1 : 1.4 + r() * 1.8;
          x.fillStyle = K.rgba(pal.star, 0.35 + r() * 0.6);
          x.beginPath(); x.arc(sx, sy, sz, 0, 7); x.fill();
        }
      } else if (mode === 'Sea-in-Sand') {
        // a SEA through a desert arch — calm water to a low sea-horizon, a
        // LUMINOUS dusk sky above (built from glow so it reads bright vs the
        // deep water below, even on cool night palettes).
        const seaSky = K.mix(pal.glow, pal.inA, 0.35);
        const gs = x.createLinearGradient(0, iy0, 0, ihz);
        gs.addColorStop(0, K.mix(pal.inA, pal.surC, 0.3));
        gs.addColorStop(0.6, K.mix(seaSky, '#fff', 0.06));
        gs.addColorStop(1, K.mix(pal.glow, '#fff', 0.28));
        x.fillStyle = gs; x.fillRect(ix0, iy0, iw, ihz - iy0);
        // a low sun/glint near the sea horizon — horizontal placement seeded so
        // the glittering column lands left, centre, or right of the opening.
        const glx = ix0 + iw * (0.20 + r() * 0.60), gly = ihz - ih * (0.02 + r() * 0.05);
        K.bloom(x, glx, gly, iw * (0.4 + r() * 0.3), pal.glow, 0.4);
        // a few distant islands / sails on the sea horizon (seeded scatter)
        const nIsl = (r() * 3 | 0);
        for (let i = 0; i < nIsl; i++) {
          const isx = ix0 + r() * iw, isw = iw * (0.05 + r() * 0.12), ish = ih * (0.012 + r() * 0.03);
          x.fillStyle = K.rgba(K.mix(pal.inB, pal.ink, 0.4), 0.45);
          x.beginPath(); x.ellipse(isx, ihz - ish * 0.3, isw, ish, 0, Math.PI, 0); x.fill();
        }
        // water — deeper toward the foreground for a strong sky/sea contrast
        const gw = x.createLinearGradient(0, ihz, 0, iy0 + ih);
        gw.addColorStop(0, K.mix(pal.inB, pal.glow, 0.35));
        gw.addColorStop(0.5, pal.inB);
        gw.addColorStop(1, K.mix(pal.inB, '#000', 0.5));
        x.fillStyle = gw; x.fillRect(ix0, ihz, iw, iy0 + ih - ihz);
        // sun glint reflection column + horizontal water bands
        x.save(); x.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 26; i++) {
          const yy = ihz + (iy0 + ih - ihz) * (i / 26);
          const a = 0.06 + 0.10 * (1 - i / 26);
          const wob = (noise.noise2(i * 0.5, seed) ) * iw * 0.04;
          x.fillStyle = K.rgba(pal.glow, a * (0.5 + 0.5 * Math.exp(-Math.pow((glx - (ix0 + iw / 2)) / (iw * 0.5), 2))));
          const cw = iw * (0.10 + 0.5 * (i / 26));
          x.fillRect(glx - cw / 2 + wob, yy, cw, Math.max(1, ih * 0.012));
        }
        x.restore();
      } else if (mode === 'Other Season') {
        // a DIFFERENT SEASON inside — a cold WINTER field & pale sky, regardless
        // of the palette's warm/teal interior. Snow-blue, never sea/sunset.
        const snowSky = K.mix(pal.stone, '#cfe0ec', 0.5);   // pale cold sky
        const snowLo  = K.mix(snowSky, pal.surC, 0.35);     // dusk band at horizon
        const snowField = '#e8edf2';
        const gv = x.createLinearGradient(0, iy0, 0, ihz);
        gv.addColorStop(0, K.mix(snowSky, '#fff', 0.18));
        gv.addColorStop(1, snowLo);
        x.fillStyle = gv; x.fillRect(ix0, iy0, iw, ihz - iy0);
        // pale wan winter sun, low — placement seeded across the cold sky
        const slx = ix0 + iw * (0.18 + r() * 0.64), sly = iy0 + (ihz - iy0) * (0.34 + r() * 0.42);
        K.bloom(x, slx, sly, iw * (0.4 + r() * 0.25), '#fdfbf2', 0.5);
        // snow field, brightest near the foreground
        const gf = x.createLinearGradient(0, ihz, 0, iy0 + ih);
        gf.addColorStop(0, K.mix(snowField, snowLo, 0.4));
        gf.addColorStop(1, K.mix(snowField, '#fff', 0.1));
        x.fillStyle = gf; x.fillRect(ix0, ihz, iw, iy0 + ih - ihz);
        // soft drifts (cool shadow undulations on the snow)
        x.save(); x.globalCompositeOperation = 'multiply';
        for (let i = 0; i < 5; i++) {
          const dy = ihz + (iy0 + ih - ihz) * (0.15 + i * 0.17);
          x.fillStyle = K.rgba(K.mix(snowLo, pal.surB, 0.3), 0.12);
          x.beginPath(); x.moveTo(ix0, dy);
          for (let k = 0; k <= 12; k++) { const tx = ix0 + iw * (k / 12); x.lineTo(tx, dy + Math.sin(k * 1.3 + i) * ih * 0.012); }
          x.lineTo(ix0 + iw, dy + ih * 0.04); x.lineTo(ix0, dy + ih * 0.04); x.closePath(); x.fill();
        }
        x.restore();
        // bare-tree silhouettes — count, spread and scale all seeded; some
        // outputs are a lone tree, others a sparse stand.
        const nt = 1 + (r() * 6 | 0);
        const treeSpread = 0.6 + r() * 0.35;
        const treeOff = (1 - treeSpread) * r();
        for (let i = 0; i < nt; i++) {
          const depth = r();
          const tx = ix0 + iw * (treeOff + r() * treeSpread);
          const ty = ihz + (iy0 + ih - ihz) * (0.18 + depth * 0.6);
          const th = ih * (0.30 - depth * 0.16);
          const a = 0.75 - depth * 0.35;
          x.save(); x.strokeStyle = K.rgba(K.mix(pal.ink, pal.surB, 0.2), a);
          x.lineWidth = Math.max(1, iw * 0.009 * (1 - depth * 0.5));
          x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx, ty - th);
          for (let b = 0; b < 6; b++) {
            const by = ty - th * (0.45 + b * 0.10);
            const dir = b % 2 ? 1 : -1;
            const bl = th * (0.30 - b * 0.025);
            x.moveTo(tx, by); x.lineTo(tx + dir * bl, by - bl * 0.7);
            x.moveTo(tx + dir * bl * 0.55, by - bl * 0.38); x.lineTo(tx + dir * bl * 0.9, by - bl * 0.95);
          }
          x.stroke();
          // tree's faint blue snow-shadow
          x.strokeStyle = K.rgba(K.mix(snowLo, pal.surB, 0.5), a * 0.4); x.lineWidth = Math.max(1, iw * 0.012);
          x.beginPath(); x.moveTo(tx, ty); x.lineTo(tx + th * 0.5, ty + th * 0.06); x.stroke();
          x.restore();
        }
        // falling snow specks
        for (let i = 0; i < 70; i++) {
          x.fillStyle = K.rgba('#ffffff', 0.25 + r() * 0.45);
          x.beginPath(); x.arc(ix0 + r() * iw, iy0 + r() * ih, 0.6 + r() * 1.3, 0, 7); x.fill();
        }
      } else { // Double Arch / Ruined Arch interior — a deep warm sodium dawn.
        // Always warm regardless of the palette's cool inA (night palettes have
        // a dark-teal inA that muddied this) — build from glow + a deep ember base.
        const emberLo = K.mix(pal.inB, '#000', 0.35);
        const gd = x.createLinearGradient(0, iy0, 0, iy0 + ih);
        gd.addColorStop(0, K.mix(pal.glow, pal.surC, 0.35));
        gd.addColorStop(0.55, K.mix(pal.glow, '#fff', 0.12));
        gd.addColorStop(1, emberLo);
        x.fillStyle = gd; x.fillRect(ix0, iy0, iw, ih);
        // a soft sun — horizontal placement seeded so the dawn light is rarely
        // dead-centre; size varies too
        const slx = ix0 + iw * (0.22 + r() * 0.56), sly = iy0 + ih * (0.5 + r() * 0.24);
        K.bloom(x, slx, sly, iw * (0.55 + r() * 0.3), K.mix(pal.glow, '#fff', 0.3), 0.5);
        // a distant horizon line at a seeded height + faint receding land
        const dhz = iy0 + ih * (0.5 + r() * 0.26);
        x.fillStyle = K.rgba(pal.inB, 0.4);
        x.fillRect(ix0, dhz, iw, iy0 + ih - dhz);
        // optional faint far ridge for depth
        if (r() < 0.6) {
          x.fillStyle = K.rgba(K.mix(pal.inB, pal.ink, 0.35), 0.4);
          x.beginPath(); x.moveTo(ix0, dhz);
          for (let k = 0; k <= 14; k++) { const tx = ix0 + iw * (k / 14); x.lineTo(tx, dhz - Math.abs(Math.sin(k * 0.9 + seed)) * ih * 0.04); }
          x.lineTo(ix0 + iw, dhz); x.closePath(); x.fill();
        }
      }

      // interior atmospheric haze — the other world is hazy too, but LIGHTER
      // than before so the deep night/sea darks keep their contrast. Night
      // interiors get the least (they must stay deep); warm worlds a touch more.
      const inHaze = (mode === 'Night-in-Day' || mode === 'Mirror Arch') ? 0.07 : 0.12;
      K.hazeSheet(x, W, H, noise, K.mix(pal.glow, '#fff', 0.2), inHaze, S * 0.7, 'screen');

      // a faint warm glow rim hugging the inside of the opening edge
      x.save();
      x.globalCompositeOperation = 'lighter';
      const rimg = x.createRadialGradient(ox, oy + oh * 0.5, ow * 0.1, ox, oy + oh * 0.5, ow * 0.85);
      rimg.addColorStop(0, K.rgba(pal.glow, 0));
      rimg.addColorStop(0.82, K.rgba(pal.glow, 0));
      rimg.addColorStop(1, K.rgba(pal.glow, 0.22));
      x.fillStyle = rimg; x.fillRect(ix0 - 4, iy0 - 4, iw + 8, ih + 8);
      x.restore();

      x.restore();
    }

    // ════════════════════════════════════════════════════════════════════
    // 4. THE GLOW SPILL — warm sodium light bleeding out onto the surround
    //    (drawn BEFORE the stone so the stone catches it; subtle ground pool)
    // ════════════════════════════════════════════════════════════════════
    function glowSpill() {
      x.save();
      x.globalCompositeOperation = 'lighter';
      // a soft fan of warm light spilling DOWN onto the ground from the opening,
      // brightest right at the threshold, fading out — no hard pool edge.
      const pgx = ox, pgy = oBase - (H - oBase) * 0.02;
      const reach = (H - oBase) * 1.1 + ow * 0.3;
      const pg = x.createRadialGradient(pgx, pgy, ow * 0.05, pgx, pgy, reach);
      pg.addColorStop(0, K.rgba(pal.glow, 0.26));
      pg.addColorStop(0.35, K.rgba(pal.glow, 0.10));
      pg.addColorStop(0.7, K.rgba(pal.glow, 0.03));
      pg.addColorStop(1, K.rgba(pal.glow, 0));
      // clip to below the threshold so the wash only lands on ground, fan-shaped
      x.beginPath(); x.rect(pgx - reach, oBase, reach * 2, H - oBase); x.clip();
      x.fillStyle = pg; x.fillRect(pgx - reach, oBase, reach * 2, reach);
      x.restore();
    }

    // ════════════════════════════════════════════════════════════════════
    // 5. THE ARCH MASONRY — stone frame around the opening, lit by glow
    // ════════════════════════════════════════════════════════════════════
    function drawStone(cx, cy, w, h, jambW, isPointed, ruin) {
      // geometry mirrors archOpeningPath EXACTLY so the ring caps the opening.
      const half = w / 2;
      const oHalf = half + jambW;
      // inner opening: crown at cy, spring below
      const inRise = isPointed ? half * 1.25 : half;
      const inSpring = cy + inRise;
      // outer ring: crown sits jambW above the inner crown, spring jambW lower
      const outCrown = cy - jambW;
      const outHalf = oHalf;
      const outRise = isPointed ? outHalf * 1.25 : outHalf;
      const outSpring = outCrown + outRise;
      const top = outCrown - 2;
      x.save();
      // outer arch outline (CW over the crown)
      x.beginPath();
      x.moveTo(cx - outHalf, cy + h);
      x.lineTo(cx - outHalf, outSpring);
      archHeadPath(x, cx, outCrown, outHalf, outSpring, isPointed, false);
      x.lineTo(cx + outHalf, cy + h);
      // punch the inner opening (REVERSE path: right spring → crown → left
      // spring) → the filled region is the frame ring only.
      x.lineTo(cx + half, cy + h);
      x.lineTo(cx + half, inSpring);
      if (isPointed) {
        const rise = inSpring - cy;
        const c = (rise * rise - half * half) / (2 * half);
        const cOff = Math.max(0, c), R = half + cOff, N = 24;
        // RIGHT arc, right spring → apex (centre cx-cOff, right intersection)
        const rc = cx - cOff;
        for (let i = 1; i <= N; i++) {
          const yy = inSpring - rise * (i / N);
          const dx = Math.sqrt(Math.max(0, R * R - (yy - inSpring) * (yy - inSpring)));
          x.lineTo(rc + dx, yy);
        }
        // LEFT arc, apex → left spring (centre cx+cOff, left intersection)
        const lc = cx + cOff;
        for (let i = 1; i <= N; i++) {
          const yy = cy + rise * (i / N);
          const dx = Math.sqrt(Math.max(0, R * R - (yy - inSpring) * (yy - inSpring)));
          x.lineTo(lc - dx, yy);
        }
      } else {
        x.arc(cx, inSpring, half, 0, Math.PI, true);
      }
      x.lineTo(cx - half, cy + h);
      x.closePath();

      // base stone fill — a vertical gradient: warmer (glow-lit) low, cooler high
      const sg = x.createLinearGradient(0, cy, 0, cy + h);
      sg.addColorStop(0, K.mix(pal.stoneShade, pal.stone, 0.5));
      sg.addColorStop(1, K.mix(pal.stone, pal.glow, 0.18));
      x.fillStyle = sg; x.fill();
      x.clip(); // texture only inside the stone ring

      // shade the OUTER edges (away from the central glow) toward ink
      const shg = x.createRadialGradient(cx, cy + h * 0.5, half * 0.6, cx, cy + h * 0.5, oHalf * 1.6);
      shg.addColorStop(0, K.rgba(pal.stoneShade, 0));
      shg.addColorStop(1, K.rgba(pal.ink, 0.55));
      x.fillStyle = shg; x.fillRect(cx - oHalf - 4, top - 4, oHalf * 2 + 8, h + jambW * 2 + 8);

      // warm glow catching the inner edge of the stone
      x.save(); x.globalCompositeOperation = 'lighter';
      const eg = x.createRadialGradient(cx, cy + h * 0.55, half * 0.2, cx, cy + h * 0.55, half * 1.25);
      eg.addColorStop(0, K.rgba(pal.glow, 0.34));
      eg.addColorStop(1, K.rgba(pal.glow, 0));
      x.fillStyle = eg; x.fillRect(cx - oHalf, top, oHalf * 2, h + jambW * 2);
      x.restore();

      // voussoir / masonry block lines radiating through the head ring.
      // For round: radii from the spring centre. For pointed: radial lines from
      // each of the two arc centres, which reads as proper gothic coursing.
      x.strokeStyle = K.rgba(pal.ink, 0.26); x.lineWidth = Math.max(1, w * 0.006);
      const blocks = 9;
      if (!isPointed) {
        for (let i = 1; i < blocks; i++) {
          const a = Math.PI * (i / blocks);
          const sx = cx + Math.cos(Math.PI - a) * half, sy = inSpring - Math.sin(a) * half;
          const ex = cx + Math.cos(Math.PI - a) * outHalf, ey = outSpring - Math.sin(a) * outHalf;
          x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
        }
      } else {
        const rise = inSpring - cy, c = Math.max(0, (rise * rise - half * half) / (2 * half));
        const R1 = half + c, R2 = outHalf + Math.max(0, (outRise * outRise - outHalf * outHalf) / (2 * outHalf)) + 0; // approx
        // left arc centre (cx+c) draws the left half; right arc centre (cx-c) the right
        for (let side = -1; side <= 1; side += 2) {
          const cen = cx - side * c;
          for (let i = 1; i < 5; i++) {
            const a = (Math.PI / 2) * (i / 5) + (side < 0 ? Math.PI / 2 : 0);
            const aa = side < 0 ? Math.PI - (Math.PI / 2) * (i / 5) : (Math.PI / 2) * (i / 5);
            const sx = cen + Math.cos(aa) * R1, sy = inSpring - Math.sin(aa) * R1;
            const ex = cen + Math.cos(aa) * (R1 + jambW), ey = inSpring - Math.sin(aa) * (R1 + jambW);
            x.beginPath(); x.moveTo(sx, sy); x.lineTo(ex, ey); x.stroke();
          }
        }
      }
      // horizontal coursing on the jambs
      const courses = 9;
      for (let i = 1; i < courses; i++) {
        const yy = Math.max(inSpring, outSpring) + (cy + h - Math.max(inSpring, outSpring)) * (i / courses);
        x.beginPath(); x.moveTo(cx - outHalf, yy); x.lineTo(cx - half, yy); x.stroke();
        x.beginPath(); x.moveTo(cx + half, yy); x.lineTo(cx + outHalf, yy); x.stroke();
      }

      // stone surface mottle
      K.mottle(x, cx - outHalf, top, outHalf * 2, (cy + h) - top, pal.stone, 22, r, 'overlay');

      // RUIN: break the crown — gnaw irregular bites out of the upper ring with
      // surround-coloured wedges so sky shows through the broken masonry.
      if (ruin) {
        x.globalCompositeOperation = 'source-over';
        const nb = 4 + (r() * 3 | 0);
        for (let i = 0; i < nb; i++) {
          const a = Math.PI * (0.08 + (i / nb) * 0.84) + (r() - 0.5) * 0.18;
          const rr = outHalf * (0.82 + r() * 0.30);
          const bx = cx + Math.cos(a) * rr;
          const by = outSpring - Math.sin(a) * rr;
          x.fillStyle = K.rgba(pal.surB, 0.96);
          x.beginPath();
          const cr = outHalf * (0.14 + r() * 0.16);
          x.moveTo(bx, by);
          for (let k = 0; k < 6; k++) {
            const ang = (k / 6) * Math.PI * 2;
            x.lineTo(bx + Math.cos(ang) * cr * (0.5 + r() * 0.9), by + Math.sin(ang) * cr * (0.45 + r() * 0.95));
          }
          x.closePath(); x.fill();
        }
        // a crack running down one jamb
        x.strokeStyle = K.rgba(pal.ink, 0.4); x.lineWidth = Math.max(1.2, w * 0.008);
        const jx = cx + (r() < 0.5 ? -1 : 1) * (half + jambW * 0.5);
        x.beginPath(); x.moveTo(jx, outSpring + h * 0.1);
        let cyk = outSpring + h * 0.1;
        for (let k = 0; k < 6; k++) { cyk += h * 0.09; x.lineTo(jx + (r() - 0.5) * jambW * 0.6, cyk); }
        x.stroke();
      }
      x.restore();

      // soft contact shadow where arch meets ground
      K.softShadow(x, cx, cy + h + jambW * 0.2, outHalf * 1.5, 0.4);
    }

    // ── COMPOSE per mode ────────────────────────────────────────────────
    glowSpill();

    if (mode === 'Double Arch') {
      // a nested, receding inner arch: paint a smaller far arch + world first
      const f = 0.56;
      const fow = ow * f, foh = oh * f;
      const fox = ox, foy = oBase - (oh - foh) * 0.0 - foh; // sits deeper
      // far interior world (reuse the warm-dawn branch via a temporary)
      const savedMode = mode;
      // paint far world directly: warm dawn
      x.save();
      archOpeningPath(x, fox, foy + (oh - foh) * 0.0, fow, foh, pointed);
      x.clip();
      const fg = x.createLinearGradient(0, foy, 0, foy + foh);
      fg.addColorStop(0, K.mix(pal.inA, pal.surC, 0.2));
      fg.addColorStop(0.6, pal.glow);
      fg.addColorStop(1, K.mix(pal.inB, pal.glow, 0.4));
      x.fillStyle = fg; x.fillRect(fox - fow, foy, fow * 2, foh);
      K.bloom(x, fox, foy + foh * 0.62, fow * 0.7, K.mix(pal.glow, '#fff', 0.3), 0.5);
      K.hazeSheet(x, W, H, noise, K.mix(pal.glow, '#fff', 0.2), 0.2, S * 0.6, 'screen');
      x.restore();
      // the near opening shows... the far arch standing in the warm world:
      // paint near world as warm too, then draw the far stone arch inside it
      paintOtherWorld(false);
      // far stone arch silhouette inside the near opening
      x.save();
      archOpeningPath(x, ox, oy, ow, oh, pointed);
      x.clip();
      drawStone(fox, foy, fow, foh, fow * 0.18, pointed, false);
      x.restore();
    } else {
      paintOtherWorld(false);
    }

    drawStone(ox, oy, ow, oh, jamb, pointed, mode === 'Ruined Arch');

    // Mirror Arch: the ground in FRONT of the opening reflects the OTHER world
    // (wrongly — the surround is dusk, but the reflection is night). Subtle.
    if (mode === 'Mirror Arch') {
      x.save();
      const refY = oBase;
      const refH = (H - oBase) * 0.8;
      x.beginPath(); x.rect(ox - ow / 2, refY, ow, refH); x.clip();
      x.globalAlpha = 0.45;
      x.translate(0, refY * 2);
      x.scale(1, -1);
      // re-paint a compressed night world as the reflection
      const rg = x.createLinearGradient(0, oy, 0, oy + oh);
      rg.addColorStop(0, K.mix(pal.inA, '#000', 0.18));
      rg.addColorStop(1, pal.inA);
      x.fillStyle = rg; x.fillRect(ox - ow / 2, oy, ow, oh);
      for (let i = 0; i < 40; i++) {
        x.fillStyle = K.rgba(pal.star, 0.3 + r() * 0.4);
        x.beginPath(); x.arc(ox - ow / 2 + r() * ow, oy + r() * oh, 0.6 + r() * 1.0, 0, 7); x.fill();
      }
      x.restore();
      // ripple darkening over the reflection
      x.save();
      const rip = x.createLinearGradient(0, refY, 0, refY + refH);
      rip.addColorStop(0, K.rgba(pal.land, 0.1));
      rip.addColorStop(1, K.rgba(pal.land, 0.7));
      x.fillStyle = rip; x.fillRect(ox - ow / 2, refY, ow, refH);
      x.restore();
    }

    // a tiny lone figure standing before the threshold (scale + awe) — most seeds
    if (r() < 0.62 && mode !== 'Mirror Arch') {
      const fside = r() < 0.5 ? -1 : 1;
      const fx = ox + fside * ow * (0.55 + r() * 0.25);
      const fy = oBase + (H - oBase) * (0.18 + r() * 0.2);
      const fh = (H - hz) * 0.13;
      x.fillStyle = K.rgba(pal.ink, 0.82);
      x.beginPath(); x.ellipse(fx, fy, fh * 0.16, fh * 0.5, 0, 0, 7); x.fill();
      x.beginPath(); x.arc(fx, fy - fh * 0.52, fh * 0.13, 0, 7); x.fill();
      // long dusk shadow away from the portal glow
      x.fillStyle = K.rgba(pal.ink, 0.35);
      const dir = fx < ox ? -1 : 1;
      x.beginPath(); x.moveTo(fx, fy + fh * 0.45);
      x.lineTo(fx + dir * fh * 3, fy + fh * 0.62); x.lineTo(fx + dir * fh * 3, fy + fh * 0.8);
      x.lineTo(fx, fy + fh * 0.58); x.closePath(); x.fill();
    }

    // ════════════════════════════════════════════════════════════════════
    // 6. ATMOSPHERE & TEXTURE — the signature hazy/film grade
    // ════════════════════════════════════════════════════════════════════
    // overall aubergine haze sheet (cool, sits the whole frame in air).
    // Kept for the signature grade but lighter — it was the main culprit
    // washing the portal flat. The surround still reads hazy; the opening
    // keeps its punch (and gets a focal re-assert below).
    const hazeCol = K.mix(pal.surC, pal.surB, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.13, S * 0.95, 'screen');

    // warm glow bloom radiating from the opening over everything (subtle)
    x.save(); x.globalCompositeOperation = 'lighter';
    const og = x.createRadialGradient(ox, oy + oh * 0.5, ow * 0.2, ox, oy + oh * 0.5, S * 0.7);
    og.addColorStop(0, K.rgba(pal.glow, 0.10));
    og.addColorStop(1, K.rgba(pal.glow, 0));
    x.fillStyle = og; x.fillRect(0, 0, W, H);
    x.restore();

    // ground-level dusk haze near the surround horizon
    const gh = x.createLinearGradient(0, hz - H * 0.05, 0, hz + H * 0.14);
    gh.addColorStop(0, K.rgba(hazeCol, 0));
    gh.addColorStop(0.45, K.rgba(K.mix(hazeCol, pal.glow, 0.25), 0.42));
    gh.addColorStop(1, K.rgba(hazeCol, 0));
    x.fillStyle = gh; x.fillRect(0, hz - H * 0.05, W, H * 0.19);

    // surface mottle over the whole frame (very light, unifies texture)
    K.mottle(x, 0, 0, W, H, pal.surB, 80, r, 'soft-light');

    // ── FOCAL RE-ASSERT — the whole point of Threshold is the lit world
    // GLOWING through the opening. After the flattening haze, clip to the
    // opening and (a) deepen its own edges toward its darks and (b) push a
    // tight luminous core, so every frame keeps a clear, high-contrast focal
    // read no matter how much air sits over the surround.
    x.save();
    archOpeningPath(x, ox, oy, ow, oh, pointed);
    x.clip();
    const isNight = (mode === 'Night-in-Day' || mode === 'Mirror Arch');
    // contrast S-curve via multiply darks on the interior edges…
    x.save(); x.globalCompositeOperation = 'multiply';
    const cs = x.createRadialGradient(ox, oy + oh * 0.42, ow * 0.08, ox, oy + oh * 0.5, ow * 0.95);
    cs.addColorStop(0, 'rgba(255,255,255,1)');
    cs.addColorStop(0.6, K.rgba(isNight ? pal.inB : pal.surB, 0.0));
    cs.addColorStop(1, K.rgba(isNight ? pal.inB : pal.ink, isNight ? 0.28 : 0.32));
    x.fillStyle = cs; x.fillRect(ox - ow, oy - oh * 0.3, ow * 2, oh * 1.4);
    x.restore();
    // …and a luminous core lift so the lit world truly glows.
    x.save(); x.globalCompositeOperation = 'lighter';
    const focalCol = isNight ? K.mix(pal.star, '#fff', 0.2) : K.mix(pal.glow, '#fff', 0.3);
    const fc = x.createRadialGradient(ox, oy + oh * 0.4, ow * 0.02, ox, oy + oh * 0.45, ow * 0.7);
    fc.addColorStop(0, K.rgba(focalCol, isNight ? 0.10 : 0.20));
    fc.addColorStop(0.5, K.rgba(focalCol, isNight ? 0.04 : 0.08));
    fc.addColorStop(1, K.rgba(focalCol, 0));
    x.fillStyle = fc; x.fillRect(ox - ow, oy - oh * 0.3, ow * 2, oh * 1.4);
    x.restore();
    x.restore();

    // film grain + vignette to seat it
    K.grain(x, W, H, 5.2, r);
    K.vignette(x, W, H, 0.42);

    return { aspect: W / H };
  }

  function traits(seed) {
    // MUST mirror draw()'s r() draw order EXACTLY so the cast matches the image:
    // pickPal → pick MODES → pick FORMATS → hz → pointed → comp (→ wide,posR,
    // baseR,jambR consumed but not surfaced).
    const r = K.rng(seed);
    const pal = pickPal(r);                       // 1 r() (FORCE_PAL short-circuits w/o consuming)
    const mode = K.pick(MODES, r);                // 1 r()
    const fmt = K.pick(FORMATS, r);               // 1 r()
    const f = fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    r();                                          // hz consume — keeps alignment
    const pointed = (mode === 'Other Season') ? r() < 0.55 : r() < 0.35;
    const comp = r();                             // composition archetype roll
    const CT = comp < 0.24 ? 'Monumental' : comp < 0.60 ? 'Portrait' : comp < 0.82 ? 'Distant' : 'Offset';
    return { Palette: pal.name, Mode: mode, View: CT, Head: pointed ? 'Pointed' : 'Round' };
  }

  return { name: 'h4_threshold4', draw, traits };
})();


export const narthexTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderNarthex: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const NARTHEX_ASPECTS: readonly number[] = [0.8,1];
export const narthexSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Ash Twilight",
        "Aubergine Sea",
        "Indigo Night",
        "Iris Nocturne",
        "Grail",
        "Aubergine Hero",
        "Sodium Ember"
      ],
      "subtraits": [
        { "name": "Nocturne", "values": ["Ash Twilight", "Indigo Night", "Iris Nocturne"] },
        { "name": "Aubergine", "values": ["Aubergine Sea", "Aubergine Hero"] },
        { "name": "Ember", "values": ["Sodium Ember"] },
        { "name": "Grail", "values": ["Grail"] },
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Other Season",
        "Double Arch",
        "Ruined Arch",
        "Mirror Arch",
        "Night-in-Day",
        "Sea-in-Sand"
      ],
      "subtraits": [
        { "name": "Arches", "values": ["Double Arch", "Ruined Arch", "Mirror Arch"] },
        { "name": "Impossible", "values": ["Other Season", "Night-in-Day", "Sea-in-Sand"] },
      ]
    },
    {
      "name": "View",
      "values": [
        "Distant",
        "Portrait",
        "Monumental",
        "Offset"
      ],
      "subtraits": [
        { "name": "Framed", "values": ["Portrait", "Monumental"] },
        { "name": "Placed", "values": ["Distant", "Offset"] },
      ]
    },
    {
      "name": "Head",
      "values": [
        "Round",
        "Pointed"
      ]
    }
  ]
};
