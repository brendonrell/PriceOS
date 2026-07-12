// @ts-nocheck
/*
 * AfterGravity — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/b_aftergravity.js). Continuous seed-driven composition. Deterministic
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


/* AFTER GRAVITY — pure non-objective Suprematist abstraction.
 * A few weighted geometric forms — bars, a square, a disc, a cross, thin lines —
 * suspended in dynamic diagonal tension across a vast textured pale void.
 * Sparse, off-balance, suspended energy, generous designed emptiness.
 * Shape on field; depicts NOTHING. Influence = Malevich, but the work is its own.
 *
 * Bone-void ground (warm white / oatmeal), forms in black, brick red, ochre,
 * muted cobalt. 2–4 accents per piece. Surface is a fine screenprint /
 * risograph: paper tooth, printed-ink mottle, soft haze, vignette grade,
 * slightly imperfect hand edges. TACTILE & atmospheric, crisp composition.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* ── PALETTES — all inside ONE world: bone/oatmeal void + restrained
     primaries. Each piece draws 2–4 accents from `ink` (the ordered accent
     bank, strongest/darkest first). Weighted by HSB thinking, never garish,
     a couple deliberately rare/austere. ─────────────────────────────────── */
  const PALS = [
    // workhorse — full Suprematist quartet on warm oatmeal
    { name: 'Bone Manifesto', w: 0.26,
      bg: '#ece4d4', bg2: '#e3d8c2', tooth: '#d8ccb2',
      ink: ['#1a1611', '#a6321f', '#c98a24', '#34557e'], shadow: 'rgba(40,30,22,0.16)' },
    // brick-led, warm, fewer cools
    { name: 'Red Lead', w: 0.20,
      bg: '#efe7d8', bg2: '#e7dcc8', tooth: '#dccfb4',
      ink: ['#171310', '#9c2c1a', '#bf7d1e', '#7c3b2a'], shadow: 'rgba(45,25,18,0.17)' },
    // cobalt-led, cool oatmeal — calmer, sparser
    { name: 'Cold Plenum', w: 0.18,
      bg: '#e9e6dc', bg2: '#dfdac9', tooth: '#d3cdb8',
      ink: ['#14161c', '#2f4f78', '#a6471f', '#bf912e'], shadow: 'rgba(24,30,42,0.18)' },
    // ochre & black, almost no red/blue — austere, earthen
    { name: 'Ochre Fast', w: 0.16,
      bg: '#f0e8d6', bg2: '#e8dcc2', tooth: '#dccdaa',
      ink: ['#1c1610', '#bf8a22', '#8a5a1c', '#5e4d33'], shadow: 'rgba(50,35,18,0.16)' },
    // RARE — near-monochrome: black on bleached bone, one whisper accent
    { name: 'White Negation', w: 0.10,
      bg: '#f4efe4', bg2: '#ece5d4', tooth: '#e0d7c2',
      ink: ['#100d0a', '#2c2722', '#9a3320', '#7d756a'], shadow: 'rgba(30,24,18,0.14)' },
    // RARE — TRUE DARK: deep near-black charcoal void; the one dark frame.
    // Forms float LIGHT/BRIGHT against it (ink bank is light-first so the
    // dominant "black" reads as warm bone, accents as luminous primaries).
    { name: 'Dusk Void', w: 0.10,
      bg: '#1a1822', bg2: '#13111a', tooth: '#2a2734',
      ink: ['#ece2cf', '#d9572f', '#e0a93a', '#5d86c2'], shadow: 'rgba(0,0,0,0.40)' },
  ];

  const MODES = ['Diagonal Thrust', 'Suspension', 'Black Square', 'Constellation', 'Beam Field', 'Pivot'];
  const FORMATS = [[1040, 1280], [1180, 1180], [1280, 1040]]; // portrait / square / landscape

  function pickWeighted(r) {
    let t = 0; for (const p of PALS) t += p.w;
    let u = r() * t;
    for (const p of PALS) { u -= p.w; if (u <= 0) return p; }
    return PALS[0];
  }
  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return pickWeighted(r);
  }

  /* ── tactile primitives ──────────────────────────────────────────────── */

  // Slightly imperfect hand edge: jitter polygon vertices a touch.
  function jit(r, amt) { return (r() - 0.5) * 2 * amt; }

  // Colour-VALUE jitter inside the palette-world: nudge a palette hex's
  // lightness (and a whisper of hue) so the SAME accent reads slightly
  // different piece-to-piece — printed-ink batch variance, never a new colour.
  // amt scales the wobble; light forms lean lighter, dark forms darker.
  function jitCol(col, r, amt) {
    amt = amt == null ? 1 : amt;
    const L = K.lum(col);
    // value drift: pull toward white or black by a small, signed amount
    const dv = (r() - 0.5) * 0.18 * amt;
    const out = dv >= 0 ? K.mix(col, '#ffffff', dv) : K.mix(col, '#000000', -dv);
    // faint warm/cool temperature drift so reds/ochres/cobalts don't lock
    const tw = (r() - 0.5) * 0.07 * amt;
    return tw >= 0 ? K.mix(out, '#caa15e', tw) : K.mix(out, '#3b5b86', -tw);
  }

  // Fill a quad/poly path. pts = [[x,y],...].
  function poly(x, pts) {
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.closePath();
  }

  // A printed-ink rectangle (possibly rotated), with subtle hand-jittered edge,
  // tonal ink texture (mottle), a soft contact shadow, and a faint screenprint
  // misregistration ghost in a second accent. cx,cy = centre. ang in radians.
  function inkBar(x, cx, cy, w, h, ang, col, pal, r, opts) {
    opts = opts || {};
    const ca = Math.cos(ang), sa = Math.sin(ang);
    // corner offsets in local frame, hand-jittered
    const j = Math.max(1.2, Math.min(w, h) * 0.012);
    const corners = [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]];
    const wp = corners.map(([lx, ly]) => {
      const jx = lx + jit(r, j), jy = ly + jit(r, j);
      return [cx + jx * ca - jy * sa, cy + jx * sa + jy * ca];
    });

    // contact shadow (soft, offset down-right) for suspended depth
    if (opts.shadow !== false) {
      x.save();
      const off = Math.max(4, Math.min(w, h) * 0.05);
      x.translate(off * 0.7, off);
      x.fillStyle = pal.shadow;
      poly(x, wp); x.fill();
      x.restore();
    }

    // misregistration ghost (screenprint feel): faint second-colour offset edge
    if (opts.ghost) {
      x.save();
      const gx = (r() - 0.5) * 6, gy = (r() - 0.5) * 6;
      x.translate(gx, gy);
      x.globalAlpha = 0.14;
      x.fillStyle = opts.ghost;
      poly(x, wp); x.fill();
      x.restore();
    }

    // body
    x.save();
    poly(x, wp); x.fill(); x.fillStyle = col; poly(x, wp); x.fill();
    // clip to body and lay printed-ink tonal texture + a value gradient
    x.clip();
    // value structure: ink isn't flat — a soft light-to-dark across the form
    const gx0 = cx - w * 0.6 * ca, gy0 = cy - w * 0.6 * sa;
    const gx1 = cx + w * 0.6 * ca, gy1 = cy + w * 0.6 * sa;
    const grad = x.createLinearGradient(gx0, gy0, gx1, gy1);
    const dark = K.mix(col, '#000000', 0.30), lite = K.mix(col, '#ffffff', 0.16);
    grad.addColorStop(0, K.rgba(lite, 0.0));
    grad.addColorStop(0.5, K.rgba(lite, 0.10));
    grad.addColorStop(1, K.rgba(dark, 0.28));
    x.fillStyle = grad;
    x.fillRect(cx - w, cy - h, w * 2, h * 2);
    // printed-ink mottle (uneven pigment laydown). mottle draws ~area/density
    // dots; we target a fixed soft COUNT so large forms don't turn into a mesh.
    const region = (w * 2) * (h * 2);
    const targetDots = K.clamp(Math.sqrt(w * h) * 0.9, 30, 220);
    K.mottle(x, cx - w, cy - h, w * 2, h * 2, col, region / targetDots, r, 'overlay');
    // a couple of thin scrape/roller streaks
    if (r() < 0.55) {
      x.globalAlpha = 0.045; x.strokeStyle = K.mix(col, '#000', 0.5); x.lineWidth = 1;
      for (let s = 0; s < 3; s++) {
        const t = -h / 2 + r() * h;
        x.beginPath();
        x.moveTo(cx - w * ca - t * sa, cy - w * sa + t * ca);
        x.lineTo(cx + w * ca - t * sa, cy + w * sa + t * ca);
        x.stroke();
      }
    }
    x.restore();
  }

  // A printed disc with the same surface treatment.
  function inkDisc(x, cx, cy, rad, col, pal, r, opts) {
    opts = opts || {};
    if (opts.shadow !== false) {
      x.save(); const off = Math.max(4, rad * 0.08);
      x.translate(off * 0.7, off); x.fillStyle = pal.shadow;
      x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill(); x.restore();
    }
    if (opts.ghost) {
      x.save(); x.translate((r() - 0.5) * 6, (r() - 0.5) * 6);
      x.globalAlpha = 0.14; x.fillStyle = opts.ghost;
      x.beginPath(); x.arc(cx, cy, rad, 0, 7); x.fill(); x.restore();
    }
    x.save();
    x.fillStyle = col; x.beginPath();
    // hand-wobbled circle
    const seg = 64, j = Math.max(0.8, rad * 0.01);
    for (let i = 0; i <= seg; i++) {
      const a = i / seg * Math.PI * 2;
      const rr = rad + jit(r, j);
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath(); x.fill();
    x.clip();
    const grad = x.createLinearGradient(cx - rad, cy - rad, cx + rad, cy + rad);
    grad.addColorStop(0, K.rgba(K.mix(col, '#fff', 0.18), 0.12));
    grad.addColorStop(1, K.rgba(K.mix(col, '#000', 0.34), 0.30));
    x.fillStyle = grad; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    const dRegion = (rad * 2) * (rad * 2);
    const dDots = K.clamp(rad * 1.6, 30, 200);
    K.mottle(x, cx - rad, cy - rad, rad * 2, rad * 2, col, dRegion / dDots, r, 'overlay');
    x.restore();
  }

  // A thin line (graphic tension vector). Optional dotted/end-dot.
  function inkLine(x, x0, y0, x1, y1, wdt, col, r, endDot) {
    x.save();
    x.strokeStyle = K.rgba(col, 0.92); x.lineWidth = wdt; x.lineCap = 'round';
    // micro-wobble: split into a few segments
    const segs = 5; x.beginPath();
    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const px = x0 + (x1 - x0) * t + jit(r, wdt * 0.6);
      const py = y0 + (y1 - y0) * t + jit(r, wdt * 0.6);
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.stroke();
    if (endDot) {
      const dr = wdt * (1.4 + r() * 1.2);
      x.fillStyle = col; x.beginPath(); x.arc(x1, y1, dr, 0, 7); x.fill();
    }
    x.restore();
  }

  // A cross / plus of two bars.
  function inkCross(x, cx, cy, len, thick, ang, col, pal, r) {
    inkBar(x, cx, cy, len, thick, ang, col, pal, r, { shadow: true });
    inkBar(x, cx, cy, thick, len, ang, col, pal, r, { shadow: false });
  }

  /* ── DRAW ────────────────────────────────────────────────────────────── */
  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);
    const fmt = K.pick(FORMATS, r);
    const mode = K.pick(MODES, r);
    // accent bank for this piece: 2–4 colours drawn in order (black-equivalent
    // always present; primaries layered by count). These three picks + accN
    // mirror traits() EXACTLY — keep their rng order; everything continuous
    // comes after.
    const accN = 2 + (r() < 0.5 ? 0 : 1) + (r() < 0.45 ? 0 : 1); // 2–4
    const acc0 = pal.ink.slice(0, Math.min(accN, pal.ink.length));
    const black0 = pal.ink[0];

    // continuous CROP/ASPECT jitter on top of the discrete format: the same
    // format family still renders at a different proportion every seed, so two
    // "Square" pieces aren't pixel-identical canvases.
    const aspJit = 1 + (r() - 0.5) * 0.22;            // ±11% proportion
    const sizeJit = 0.90 + r() * 0.20;                 // ±10% overall canvas size
    const W = Math.round(fmt[0] * sizeJit * Math.sqrt(aspJit));
    const H = Math.round(fmt[1] * sizeJit / Math.sqrt(aspJit));
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    /* ── CONTINUOUS GLOBAL CONTROLS — every salient dial moves with the seed
       so two same-mode/same-palette pieces still differ a LOT. De-correlated
       from palette: structure dials are their own rng draws. ─────────────── */
    const gScale  = 0.66 + r() * 0.74;   // 0.66–1.40 global form-size multiplier
    const gDens   = 0.70 + r() * 0.85;   // 0.70–1.55 element-count multiplier
    const gAsym   = 0.55 + r() * 0.95;   // 0.55–1.50 spread / off-balance push
    const gRot    = (r() - 0.5) * 0.7;   // extra global rotation bias (rad)
    const gColJit = 0.6 + r() * 1.1;     // 0.6–1.7 colour-value jitter strength
    const gGhost  = 0.25 + r() * 0.6;    // probability/strength of misreg ghosts

    // per-piece jittered accent bank (palette-world preserved, values drift)
    const acc = acc0.map((c) => jitCol(c, r, gColJit));
    const black = jitCol(black0, r, gColJit * 0.6);
    // helper to pull a (further-jittered) accent on demand inside a mode
    const A = (i) => acc[((i % acc.length) + acc.length) % acc.length] || black;

    /* ── BONE VOID GROUND: warm gouache wash, not flat ── */
    const bg = x.createLinearGradient(0, 0, W * 0.35, H);
    bg.addColorStop(0, pal.bg);
    bg.addColorStop(0.55, K.mix(pal.bg, pal.bg2, 0.5));
    bg.addColorStop(1, pal.bg2);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // broad uneven tonal drift across the void (fbm), kept very subtle
    {
      const step = Math.max(4, Math.floor(S / 150));
      for (let yy = 0; yy < H; yy += step) {
        for (let xx = 0; xx < W; xx += step) {
          const n = noise.fbm(xx / (S * 0.7), yy / (S * 0.7), 4, 0.55, 2.1);
          const a = K.clamp(Math.abs(n) * 0.10, 0, 0.12);
          const c = n < 0 ? pal.tooth : K.mix(pal.bg, '#ffffff', 0.5);
          x.fillStyle = K.rgba(c, a);
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
    }

    // composition anchor + diagonal axis (everything hangs off this).
    // axis angle now spans a wider continuous arc, plus the global rot bias.
    const axisAng = (r() < 0.5 ? 1 : -1) * (Math.PI * (0.10 + r() * 0.34)) + gRot * 0.5;
    const cax = Math.cos(axisAng), say = Math.sin(axisAng);
    // focal point deliberately OFF-CENTRE for off-balance tension; the spread
    // around frame-centre scales with gAsym so balance varies continuously.
    const fx = W * (0.5 + (r() - 0.5) * 0.40 * gAsym);
    const fy = H * (0.5 + (r() - 0.5) * 0.44 * gAsym);

    // shared helper: place along the diagonal axis at signed distance d (px)
    function onAxis(d, perp) {
      perp = perp || 0;
      return [fx + cax * d - say * perp, fy + say * d + cax * perp];
    }
    // keep a form's CENTRE inside a designed margin so its bounding radius
    // `rad` clears the frame — turns accidental crops into composed negative
    // space. marg = extra inset beyond the radius (fraction of S).
    const MARG = S * 0.05;
    function keepIn(px, py, rad) {
      const lo = rad + MARG, hiX = W - rad - MARG, hiY = H - rad - MARG;
      return [K.clamp(px, lo, Math.max(lo, hiX)), K.clamp(py, lo, Math.max(lo, hiY))];
    }

    /* ── COMPOSE PER MODE ── */
    if (mode === 'Diagonal Thrust') {
      // a dominant long bar slashing across, a square braced against it,
      // a small disc and a couple of tension lines trailing the thrust.
      const barLen = S * (0.62 + r() * 0.46) * gScale;
      const barTh = S * (0.035 + r() * 0.055) * (0.7 + gScale * 0.4);
      const [bx, by] = onAxis(S * (r() - 0.5) * 0.30 * gAsym);
      inkBar(x, bx, by, barLen, barTh, axisAng, black, pal, r,
        { ghost: r() < gGhost ? A(1) : null });
      // square braced at one end, slightly rotated against the bar
      const sq = S * (0.12 + r() * 0.16) * gScale;
      const [sx, sy] = onAxis(barLen * (0.18 + r() * 0.26), barTh * (r() < 0.5 ? -1 : 1) * (2 + r() * 3) * gAsym);
      inkBar(x, sx, sy, sq, sq * (0.7 + r() * 0.6), axisAng + gRot + (r() - 0.5) * 0.8, A(1), pal, r,
        { ghost: r() < gGhost ? A(2) : null });
      // a counter-weight disc, far side, smaller
      const [dx, dy] = onAxis(-barLen * (0.22 + r() * 0.28), barTh * (r() < 0.5 ? 1 : -1) * (2.5 + r() * 4) * gAsym);
      inkDisc(x, dx, dy, sq * (0.24 + r() * 0.32), A(2), pal, r, {});
      // tension lines fanning from the thrust tip
      const [tx, ty] = onAxis(barLen * (0.4 + r() * 0.2));
      const ln = Math.max(1, Math.round((1 + r() * 3) * gDens));
      for (let i = 0; i < ln; i++) {
        const a2 = axisAng + (r() - 0.5) * 1.4;
        const L = S * (0.12 + r() * 0.34) * gScale;
        inkLine(x, tx, ty, tx + Math.cos(a2) * L, ty + Math.sin(a2) * L,
          S * (0.003 + r() * 0.006), black, r, r() < 0.5);
      }
    }

    else if (mode === 'Suspension') {
      // 2–6 forms of graded size suspended in a loose diagonal cascade,
      // wide breathing gaps — the "after gravity, mid-fall, frozen" idea.
      const n = K.clamp(Math.round((2 + r() * 4) * gDens), 2, 6);
      let d = -S * (0.42 + r() * 0.1);
      const span = S * (0.62 + r() * 0.5) * (0.8 + gScale * 0.4);
      const grade = 0.02 + r() * 0.10;   // continuous size taper down the cascade
      const accSeq = K.shuffle([black, A(1), A(2), A(3)], r);
      for (let i = 0; i < n; i++) {
        const t = n > 1 ? i / (n - 1) : 0.5;
        d = -span / 2 + span * t;
        const perp = (r() - 0.5) * S * 0.34 * gAsym;
        const sz = S * (0.24 - t * grade) * (0.5 + r() * 0.9) * gScale;
        const [px, py] = keepIn(...onAxis(d, perp), sz * 0.8);
        const col = accSeq[i % accSeq.length];
        const kind = r();
        const ang = axisAng + gRot * 0.6 + (r() - 0.5) * 0.7;
        if (kind < 0.42) inkBar(x, px, py, sz * (1.2 + r() * 1.4), sz * (0.3 + r() * 0.5), ang, col, pal, r, { ghost: r() < gGhost ? A(1) : null });
        else if (kind < 0.72) inkBar(x, px, py, sz, sz * (0.8 + r() * 0.5), ang, col, pal, r, {});
        else inkDisc(x, px, py, sz * (0.4 + r() * 0.2), col, pal, r, {});
      }
      // 1–2 hairline threads linking forms (implied trajectory)
      const threads = r() < 0.5 ? 1 : 2;
      for (let t = 0; t < threads; t++) {
        const [a0x, a0y] = onAxis(-span * (0.2 + r() * 0.2), (r() - 0.5) * S * 0.1);
        const [a1x, a1y] = onAxis(span * (0.2 + r() * 0.25), (r() - 0.5) * S * 0.1);
        inkLine(x, a0x, a0y, a1x, a1y, S * (0.0025 + r() * 0.002), black, r, false);
      }
    }

    else if (mode === 'Black Square') {
      // the austere grail: one large square, off-centre, slightly canted,
      // commanding a vast void — plus a small counterpoint accent or two.
      const sq = S * (0.28 + r() * 0.26) * (0.85 + gScale * 0.2);
      // continuous off-centre placement, weighted by gAsym, plus an aspect
      // wobble so it isn't always a perfect square.
      const sx = W * (0.5 + (r() - 0.5) * 0.34 * gAsym);
      const sy = H * (0.5 + (r() - 0.5) * 0.36 * gAsym);
      const cant = (r() - 0.5) * (0.10 + Math.abs(gRot) * 0.6);
      inkBar(x, sx, sy, sq, sq * (0.88 + r() * 0.24), cant, black, pal, r,
        { ghost: r() < gGhost ? A(1) : null });
      // 0–2 small counterweights scattered in the opposite breathing space
      const cw = Math.round((0.6 + r() * 1.8) * gDens);
      for (let k = 0; k < cw; k++) {
        const cx2 = sx + (sx < W * 0.5 ? 1 : -1) * W * (0.18 + r() * 0.28) * gAsym + (r() - 0.5) * W * 0.1;
        const cy2 = sy + (sy < H * 0.5 ? 1 : -1) * H * (0.16 + r() * 0.28) * gAsym + (r() - 0.5) * H * 0.1;
        const [px, py] = keepIn(cx2, cy2, sq * 0.2);
        const col = A(1 + k);
        if (r() < 0.45) inkDisc(x, px, py, sq * (0.05 + r() * 0.09), col, pal, r, {});
        else inkBar(x, px, py, sq * (0.2 + r() * 0.3), sq * (0.04 + r() * 0.06), (r() - 0.5) * 1.8, col, pal, r, {});
      }
    }

    else if (mode === 'Constellation') {
      // scattered small forms + connecting hairlines: weighted points of a
      // suspended system, mostly empty, one or two heavier anchors.
      const n = K.clamp(Math.round((4 + r() * 5) * gDens), 3, 11);
      // pre-decide sizes so we can clamp each point by its own bounding radius
      const sizes = [], bigs = [];
      const bigCount = K.clamp(Math.round((0.6 + r() * 2) * gDens), 1, 3);
      const pts = [];
      // distribute on a jittered golden-angle spiral so the scatter FILLS the
      // field; spiral radius reach + centre drift scale with gAsym/gScale.
      const ccx = W * (0.5 + (r() - 0.5) * 0.18 * gAsym), ccy = H * (0.5 + (r() - 0.5) * 0.18 * gAsym);
      const ga = 2.39996; // golden angle
      const a0 = r() * Math.PI * 2;
      const reach = (0.34 + r() * 0.16) * (0.85 + gAsym * 0.3);
      const jitter = (0.05 + r() * 0.08);
      for (let i = 0; i < n; i++) {
        const big = i < bigCount;
        const sz = (big ? S * (0.11 + r() * 0.10) : S * (0.025 + r() * 0.06)) * gScale;
        sizes.push(sz); bigs.push(big);
        const a = a0 + i * ga + (r() - 0.5) * 0.7;
        const rad = Math.sqrt((i + 0.5) / n) * Math.min(W, H) * reach;
        const px = ccx + Math.cos(a) * rad + (r() - 0.5) * S * jitter;
        const py = ccy + Math.sin(a) * rad + (r() - 0.5) * S * jitter;
        pts.push(keepIn(px, py, sz * 0.9));
      }
      // connecting threads first (under the forms)
      const threadP = 0.35 + r() * 0.4;
      for (let i = 0; i < pts.length - 1; i++) {
        if (r() < threadP) inkLine(x, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1], S * (0.0022 + r() * 0.0014), black, r, false);
      }
      // forms: mostly small, 1–3 anchors large
      for (let i = 0; i < pts.length; i++) {
        const big = bigs[i];
        const sz = sizes[i];
        const col = A(i);
        const kind = r();
        if (big) {
          if (kind < 0.5) inkBar(x, pts[i][0], pts[i][1], sz, sz * (0.8 + r() * 0.5), (r() - 0.5) * 0.7, col, pal, r, { ghost: r() < gGhost ? A(i + 1) : null });
          else inkDisc(x, pts[i][0], pts[i][1], sz * (0.48 + r() * 0.14), col, pal, r, {});
        } else {
          if (kind < 0.4) inkDisc(x, pts[i][0], pts[i][1], sz, col, pal, r, { shadow: false });
          else inkBar(x, pts[i][0], pts[i][1], sz * (1 + r() * 2.4), sz * (0.35 + r() * 0.45), (r() - 0.5) * 2.0, col, pal, r, { shadow: false });
        }
      }
    }

    else if (mode === 'Beam Field') {
      // a few parallel/near-parallel bars of unequal weight raking the field,
      // a cross or disc crossing their grain — order-vs-chaos.
      const n = K.clamp(Math.round((2.5 + r() * 3) * gDens), 2, 7);
      const gap = S * (0.10 + r() * 0.14) * (0.7 + gAsym * 0.5);
      const fan = (r() - 0.5) * 0.25;   // continuous fanning of the beam grain
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * gap + (r() - 0.5) * gap * 0.6 * gAsym;
        const [bx, by] = onAxis((r() - 0.5) * S * 0.2 * gAsym, off);
        const L = S * (0.46 + r() * 0.62) * (0.8 + gScale * 0.4);
        const th = S * (0.012 + r() * 0.06) * (0.7 + gScale * 0.4);
        const col = i === ((n / 2) | 0) ? A(1) : (r() < 0.7 ? black : A(2));
        inkBar(x, bx, by, L, th, axisAng + gRot * 0.3 + fan * (i - (n - 1) / 2) + (r() - 0.5) * 0.06, col, pal, r,
          { ghost: r() < gGhost ? A(2) : null });
      }
      // a cross or disc crossing the grain at the focal
      const [px, py] = onAxis((r() - 0.5) * S * 0.4 * gAsym, (r() - 0.5) * gap);
      if (r() < 0.5) inkCross(x, px, py, S * (0.14 + r() * 0.16) * gScale, S * (0.028 + r() * 0.028) * gScale, axisAng + Math.PI / 2 + (r() - 0.5) * 0.4, A(-1), pal, r);
      else inkDisc(x, px, py, S * (0.06 + r() * 0.09) * gScale, A(-1), pal, r, {});
    }

    else { // 'Pivot'
      // a cross/plus pinned off-centre as the fulcrum, with a long bar and a
      // disc balanced around it like a frozen mobile.
      // pivot placed continuously off-centre, weighted by gAsym
      const px = W * (0.5 + (r() - 0.5) * 0.34 * gAsym), py = H * (0.5 + (r() - 0.5) * 0.36 * gAsym);
      const crossLen = S * (0.20 + r() * 0.22) * gScale;
      const crossTh = S * (0.032 + r() * 0.03) * gScale;
      inkCross(x, px, py, crossLen, crossTh, axisAng + gRot * 0.5, black, pal, r);
      // balancing long bar swung off one arm
      const armAng = axisAng + gRot + (r() < 0.5 ? 1 : -1) * (Math.PI * (0.20 + r() * 0.34));
      const armLen = S * (0.34 + r() * 0.40) * gScale;
      const armCx = px + Math.cos(armAng) * armLen * 0.5;
      const armCy = py + Math.sin(armAng) * armLen * 0.5;
      inkBar(x, armCx, armCy, armLen, S * (0.026 + r() * 0.03) * gScale, armAng, A(1), pal, r, { ghost: r() < gGhost ? A(2) : null });
      // counter disc on the opposite side
      const dAng = armAng + Math.PI + (r() - 0.5) * 0.5;
      const dDist = S * (0.18 + r() * 0.24) * gAsym;
      const dRad = S * (0.05 + r() * 0.07) * gScale;
      const [dpx, dpy] = keepIn(px + Math.cos(dAng) * dDist, py + Math.sin(dAng) * dDist, dRad);
      inkDisc(x, dpx, dpy, dRad, A(2), pal, r, {});
      // 1–2 thin tension lines continuing the bar past the pivot
      const pl = r() < 0.4 ? 2 : 1;
      for (let i = 0; i < pl; i++) {
        const la = armAng + Math.PI + (r() - 0.5) * 0.4 * i;
        inkLine(x, px, py, px + Math.cos(la) * armLen * (0.4 + r() * 0.3), py + Math.sin(la) * armLen * (0.4 + r() * 0.3), S * (0.003 + r() * 0.002), black, r, r() < 0.6);
      }
    }

    /* ── SURFACE GRADE: paper tooth, haze, vignette, grain ── */
    // canvas/paper tooth: broad faint mottle over the whole field (random, soft)
    K.mottle(x, 0, 0, W, H, pal.tooth, 130, r, 'multiply');
    // smooth tonal settling of the void via a soft diagonal gradient (no grid)
    {
      const sg = x.createLinearGradient(0, 0, W, H);
      sg.addColorStop(0, K.rgba(pal.tooth, 0.0));
      sg.addColorStop(0.7, K.rgba(pal.tooth, 0.0));
      sg.addColorStop(1, K.rgba(pal.tooth, 0.14));
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = sg; x.fillRect(0, 0, W, H); x.restore();
    }
    // fine print grain
    K.grain(x, W, H, 6.5, r);
    // vignette grade — gentle, a touch heavier on the dusk void
    K.vignette(x, W, H, pal.name === 'Dusk Void' ? 0.30 : 0.18);

    return { aspect: W / H };
  }

  /* ── TRAITS (pure; mirror draw()'s rng draw order up through the picks) ── */
  function traits(seed) {
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : pickWeighted(r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    const mode = K.pick(MODES, r);
    const accN = 2 + (r() < 0.5 ? 0 : 1) + (r() < 0.45 ? 0 : 1);
    const f = W > H ? 'Landscape' : W === H ? 'Square' : 'Portrait';
    return { Palette: pal.name, Mode: mode, Format: f, Accents: accN };
  }

  return { name: 'b_aftergravity', draw, traits };
})();


export const aftergravityTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderAfterGravity: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const AFTERGRAVITY_ASPECTS: readonly number[] = [1.3,1,0.78];
export const aftergravitySchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Cold Plenum",
        "White Negation",
        "Red Lead",
        "Ochre Fast",
        "Bone Manifesto",
        "Dusk Void"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Suspension",
        "Beam Field",
        "Black Square",
        "Pivot",
        "Constellation",
        "Diagonal Thrust"
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
      "name": "Accents",
      "values": [
        "4",
        "2",
        "3"
      ]
    }
  ]
};
