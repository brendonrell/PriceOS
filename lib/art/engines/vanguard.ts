// @ts-nocheck
/*
 * Vanguard — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/b_vanguard.js). Continuous seed-driven composition. Deterministic
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


/* VANGUARD — non-objective Constructivist composition.
 * Bold intersecting DIAGONAL BARS, a large CIRCLE, crossing LINES and a WEDGE
 * locked into a dynamic off-axis layout with strong directional thrust. Hard,
 * energetic, machine-age geometry — pure form, NO subject. (Rodchenko / Lissitzky
 * undercurrent, but the work is ours.) Palette world: RED / BLACK / CREAM / STEEL.
 *
 * NOT flat clip-art: every shape carries printed-ink mottle, paper tooth, a faint
 * haze sheet, a vignette grade and slightly imperfect hand edges — a fine
 * screenprint, tactile and atmospheric, while staying crisp non-objective.
 *
 * Variation contract: every salient parameter — counts, positions, sizes,
 * proportions, ratios, rotations, spacings, asymmetry, focal placement, crop/
 * zoom, density, format and colour VALUES — varies CONTINUOUSLY with the seed.
 * Structure is fully de-correlated from palette (palette only colours forms; a
 * global rng-driven control field decides every measurement). Two same-mode,
 * same-palette pieces still differ hard. No discrete "looks".
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palettes — RED / BLACK / CREAM / STEEL world, now pitched
     DARK + SATURATED: half sit on dark grounds (ink black, deep oxblood,
     gunmetal) with cream/scarlet forms, the rest keep cream. Constructivist
     works on black. The set reads bold and dark-capable, not a cream project. */
  const PALS = [
    // ── DARK grounds (cream / scarlet forms) ──
    { name: 'Oxblood Manifesto',   bg: '#2a0f0d', ink: '#ece2cf', red: '#e0492a', steel: '#9aa0a3', tooth: '#160605', accents: ['#ece2cf', '#e0492a'] },
    { name: 'Ink Vanguard',        bg: '#14110f', ink: '#ece3d2', red: '#d8341d', steel: '#8b9196', tooth: '#050403', accents: ['#ece3d2', '#d8341d'] },
    { name: 'Gunmetal Drive',      bg: '#23282b', ink: '#e7dcc6', red: '#cf3320', steel: '#aeb4b8', tooth: '#101416', accents: ['#e7dcc6', '#cf3320'] },
    // ── CREAM grounds (black / scarlet forms) ──
    { name: 'Iron Proletariat',    bg: '#ded6c4', ink: '#100d0c', red: '#b8281a', steel: '#565d62', tooth: '#100d0c', accents: ['#100d0c', '#b8281a'] },
    { name: 'Bone & Cinnabar',     bg: '#efe8d8', ink: '#1a1614', red: '#e2492a', steel: '#8a9094', tooth: '#1a1614', accents: ['#1a1614', '#e2492a'] },
    { name: 'Ember Constructivist',bg: '#f0e7d4', ink: '#19120f', red: '#e8501f', steel: '#959a9c', tooth: '#19120f', accents: ['#19120f', '#e8501f'] },
  ];
  const isDark = (p) => K.lum(p.bg) < 0.4;

  const MODES = ['Wedge Thrust', 'Eclipse Cross', 'Lattice Drive', 'Severed Disc', 'Beam Cluster', 'Counterpoint'];

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* Jitter a hex's value within the palette-world: small hue rotate toward a
     neighbour, plus lightness/saturation nudge. Keeps the colour family but
     makes two same-palette pieces carry visibly different ink/red/steel values
     so structure isn't the only thing distinguishing them. amt in 0..1. */
  function jitterCol(col, r, amt) {
    amt = amt == null ? 1 : amt;
    const c = K.h2r(col);
    // pull toward white or black by a small signed amount → value shift
    const lShift = (r() - 0.5) * 0.16 * amt;
    let out = lShift > 0 ? K.mix(col, '#ffffff', lShift) : K.mix(col, '#000000', -lShift);
    // tiny warm/cool cross-mix → hue drift inside family
    const warm = r() < 0.5 ? '#ff7a3c' : '#3c6bff';
    out = K.mix(out, warm, (r() * 0.07) * amt);
    return out;
  }

  /* ── hand-edge helpers ─────────────────────────────────────────────────── */
  function inkPoly(x, pts, col, r, jit) {
    jit = jit == null ? 1.6 : jit;
    x.beginPath();
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      const dx = (r() - 0.5) * jit, dy = (r() - 0.5) * jit;
      if (i === 0) x.moveTo(p[0] + dx, p[1] + dy); else x.lineTo(p[0] + dx, p[1] + dy);
    }
    x.closePath();
    x.fillStyle = col; x.fill();
  }

  function barPts(cx, cy, ang, L, T) {
    const ux = Math.cos(ang), uy = Math.sin(ang);
    const px = -uy, py = ux;
    const hl = L / 2, ht = T / 2;
    return [
      [cx - ux * hl - px * ht, cy - uy * hl - py * ht],
      [cx + ux * hl - px * ht, cy + uy * hl - py * ht],
      [cx + ux * hl + px * ht, cy + uy * hl + py * ht],
      [cx - ux * hl + px * ht, cy - uy * hl + py * ht],
    ];
  }

  function drawBar(x, cx, cy, ang, L, T, col, r) {
    const pts = barPts(cx, cy, ang, L, T);
    x.save();
    K.softShadow(x, cx + Math.cos(ang + 1.6) * T * 0.4, cy + Math.sin(ang + 1.6) * T * 0.4, Math.max(L, T) * 0.6, 0.10);
    x.restore();
    inkPoly(x, pts, col, r, Math.min(3, T * 0.05 + 1));
    return pts;
  }

  // Wedge with an independent half-spread on each base side (asymmetric taper).
  function drawWedge(x, ax, ay, ang, L, spreadA, spreadB, col, r) {
    if (spreadB == null) spreadB = spreadA;
    const tipx = ax + Math.cos(ang) * L, tipy = ay + Math.sin(ang) * L;
    const px = -Math.sin(ang), py = Math.cos(ang);
    const pts = [
      [ax + px * spreadA, ay + py * spreadA],
      [ax - px * spreadB, ay - py * spreadB],
      [tipx, tipy],
    ];
    inkPoly(x, pts, col, r, 2.2);
    return pts;
  }

  let NOISE = null;
  /* Batched screenprint tooth: mottle + flecks + noise sheen as bucketed path
     fills under the polygon clip — no per-dot fillRects, no pixel buffers. */
  function texturePoly(x, pts, col, r, density, noise) {
    noise = noise || NOISE;
    let minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
    for (const p of pts) { minx = Math.min(minx, p[0]); miny = Math.min(miny, p[1]); maxx = Math.max(maxx, p[0]); maxy = Math.max(maxy, p[1]); }
    const w = maxx - minx, h = maxy - miny;
    if (w < 1 || h < 1) return;
    x.save();
    x.beginPath();
    for (let i = 0; i < pts.length; i++) { if (i === 0) x.moveTo(pts[i][0], pts[i][1]); else x.lineTo(pts[i][0], pts[i][1]); }
    x.closePath(); x.clip();
    /* Dots landing outside the polygon were always clipped invisible — a
       point-in-polygon test skips them BEFORE they enter a path, so thin
       diagonal bars stop paying for their huge bounding boxes. rng order
       per dot is unchanged. */
    const pip = (px, py) => {
      let inside = false;
      for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
        const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
        if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    };
    const NB = 8;
    /* mottle pass (poly-aware, same budget + rng order as K.mottle) */
    {
      const md = (density || 30) * 0.7;
      const n = Math.floor(w * h / md);
      const mpaths = new Array(2 * NB).fill(null);
      for (let i = 0; i < n; i++) {
        const dark = r() < 0.5;
        const s = 0.8 + r() * 2.2;
        const a = 0.04 + r() * 0.09;
        const fx = minx + r() * w, fy = miny + r() * h;
        if (!pip(fx + s / 2, fy + s / 2)) continue;
        const bi = Math.min(NB - 1, ((a - 0.04) / 0.09 * NB) | 0);
        const k = (dark ? 0 : NB) + bi;
        (mpaths[k] || (mpaths[k] = new Path2D())).rect(fx, fy, s, s);
      }
      x.save();
      x.globalCompositeOperation = 'overlay';
      const cd = K.mix(col, '#000', 0.34), cl = K.mix(col, '#fff', 0.32);
      for (let k = 0; k < 2 * NB; k++) {
        const p = mpaths[k];
        if (!p) continue;
        x.fillStyle = K.rgba(k < NB ? cd : cl, 0.04 + ((k % NB) + 0.5) / NB * 0.09);
        x.fill(p);
      }
      x.restore();
    }
    /* flecks — same budget + rng order as ever, bucketed into 16 fills */
    const fpaths = new Array(2 * NB).fill(null);
    const flecks = Math.floor(w * h / 90);
    for (let i = 0; i < flecks; i++) {
      const fx = minx + r() * w, fy = miny + r() * h;
      const up = r() < 0.5;
      const s = 0.7 + r() * 1.8;
      const a = 0.05 + r() * 0.07;
      if (!pip(fx + s / 2, fy + s / 2)) continue;
      const bi = Math.min(NB - 1, ((a - 0.05) / 0.07 * NB) | 0);
      const k = (up ? NB : 0) + bi;
      (fpaths[k] || (fpaths[k] = new Path2D())).rect(fx, fy, s, s);
    }
    const cUp = K.mix(col, '#ffffff', 0.22), cDn = K.mix(col, '#000000', 0.28);
    for (let k = 0; k < 2 * NB; k++) {
      const p = fpaths[k];
      if (!p) continue;
      x.fillStyle = K.rgba(k < NB ? cDn : cUp, 0.05 + ((k % NB) + 0.5) / NB * 0.07);
      x.fill(p);
    }
    /* noise sheen — cells bucketed the same way, composited overlay */
    if (noise) {
      const step = Math.max(6, Math.floor(Math.min(w, h) / 22));
      const npaths = new Array(2 * NB).fill(null);
      for (let yy = miny; yy < maxy; yy += step) {
        for (let xx = minx; xx < maxx; xx += step) {
          if (!pip(xx + step / 2, yy + step / 2)) continue;
          const n = noise.fbm(xx / 90, yy / 90, 3, 0.55, 2.2);
          const a = Math.abs(n) * 0.10;
          if (a < 0.012) continue;
          const bi = Math.min(NB - 1, ((a - 0.012) / 0.088 * NB) | 0);
          const k = (n < 0 ? 0 : NB) + bi;
          (npaths[k] || (npaths[k] = new Path2D())).rect(xx, yy, step + 1, step + 1);
        }
      }
      x.globalCompositeOperation = 'overlay';
      for (let k = 0; k < 2 * NB; k++) {
        const p = npaths[k];
        if (!p) continue;
        const g = k < NB ? 0 : 255;
        x.fillStyle = 'rgba(' + g + ',' + g + ',' + g + ',' + (0.012 + ((k % NB) + 0.5) / NB * 0.088) + ')';
        x.fill(p);
      }
    }
    x.restore();
  }

  function inkCircle(x, cx, cy, rad, col, r, fill) {
    const n = 80;
    x.beginPath();
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = rad + (r() - 0.5) * Math.max(1.2, rad * 0.006);
      const xx = cx + Math.cos(a) * rr, yy = cy + Math.sin(a) * rr;
      if (i === 0) x.moveTo(xx, yy); else x.lineTo(xx, yy);
    }
    x.closePath();
    if (fill) { x.fillStyle = col; x.fill(); } else { x.strokeStyle = col; x.stroke(); }
  }

  // filled disc polygon helper (returns pts for texturing)
  function discPts(cx, cy, rad, segs) {
    segs = segs || 64;
    const p = [];
    for (let i = 0; i <= segs; i++) { const a = i / segs * 6.283185; p.push([cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]); }
    return p;
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    NOISE = noise;
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);

    /* ── CONTINUOUS GLOBAL CONTROL FIELD ──────────────────────────────────
       Every measurement below derives from these seed-driven knobs, NOT from
       per-mode constants. This is what de-correlates structure from palette
       and guarantees two same-mode/same-palette pieces differ hard. */

    // FORMAT: continuous aspect, not 3 discrete tiles. Bias to portrait/sq/land
    // bands but with a continuous ratio inside each band.
    const fband = r();
    let aspect;
    if (fband < 0.4) aspect = 0.66 + r() * 0.26;        // portrait 0.66–0.92
    else if (fband < 0.66) aspect = 0.94 + r() * 0.12;  // near-square 0.94–1.06
    else aspect = 1.12 + r() * 0.42;                    // landscape 1.12–1.54
    const longEdge = 1180 + Math.floor(r() * 140);      // 1180–1320 long edge
    let W, H;
    if (aspect >= 1) { W = longEdge; H = Math.round(longEdge / aspect); }
    else { H = longEdge; W = Math.round(longEdge * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H), D = Math.hypot(W, H);

    // GLOBAL SCALE / DENSITY / CROP — hard variance so some are sparse & vast,
    // others dense & tight.
    const scale = 0.74 + r() * 0.70;        // 0.74–1.44 master size multiplier
    const density = 0.55 + r() * 0.95;       // 0.55–1.50 element-count multiplier
    const crop = 0.82 + r() * 0.48;          // 0.82–1.30 zoom (>1 pushes off-edge)
    const asym = (r() - 0.5) * 2;            // -1..1 left/right weight bias

    // GLOBAL ROTATION of the whole composition — breaks the locked diagonal.
    const rot = (r() - 0.5) * 0.9;           // ±~26°

    // FOCAL placement — fully free across the canvas, not a fixed third.
    const fxN = 0.20 + r() * 0.60;
    const fyN = 0.20 + r() * 0.60;
    const fx = W * fxN, fy = H * fyN;

    // primary thrust angle — diagonal, biased away from horiz/vert, full range.
    const quad = r() < 0.5 ? -1 : 1;
    const baseAng = (Math.PI * (0.12 + r() * 0.30)) * quad + (r() < 0.5 ? 0 : Math.PI) + rot;

    // value-jittered palette colours (so colour VALUES vary within the world)
    const ink = jitterCol(pal.ink, r, 0.8);
    const red = jitterCol(pal.red, r, 0.7);
    const steel = jitterCol(pal.steel, r, 0.9);

    // ── PAPER GROUND ──
    const dark = isDark(pal);
    const tooth = pal.tooth || K.mix(pal.bg, pal.ink, 0.18);
    x.fillStyle = pal.bg; x.fillRect(0, 0, W, H);
    const gang = r() < 0.5 ? 1 : -1;
    const gx2 = W * (0.4 + r() * 0.6), gy2 = gang > 0 ? H : 0;
    const pg = x.createLinearGradient(W * r() * 0.3, 0, gx2, gy2);
    if (dark) {
      pg.addColorStop(0, K.rgba(K.mix(pal.bg, pal.steel, 0.16), 0.0));
      pg.addColorStop(0.4 + r() * 0.3, K.rgba(K.mix(pal.bg, pal.steel, 0.16), 0.20));
      pg.addColorStop(1, K.rgba(K.mix(pal.bg, '#000000', 0.5), 0.30));
    } else {
      pg.addColorStop(0, K.rgba(K.mix(pal.bg, '#ffffff', 0.55), 0.0));
      pg.addColorStop(0.4 + r() * 0.3, K.rgba(K.mix(pal.bg, '#ffffff', 0.4), 0.55));
      pg.addColorStop(1, K.rgba(K.mix(pal.bg, pal.steel, 0.18), 0.14));
    }
    x.fillStyle = pg; x.fillRect(0, 0, W, H);
    K.mottle(x, 0, 0, W, H, tooth, 80, r, 'multiply');
    if (dark) K.mottle(x, 0, 0, W, H, K.mix(pal.bg, pal.ink, 0.5), 55, r, 'screen');

    // crossing-line helper
    function crossLine(cx, cy, ang, len, w, col, alpha) {
      x.save();
      x.globalAlpha = alpha == null ? 1 : alpha;
      x.lineCap = 'butt';
      x.strokeStyle = col; x.lineWidth = w;
      const ux = Math.cos(ang), uy = Math.sin(ang);
      const seg = 6;
      x.beginPath();
      for (let i = 0; i <= seg; i++) {
        const t = i / seg - 0.5;
        const jx = (r() - 0.5) * w * 0.25, jy = (r() - 0.5) * w * 0.25;
        const xx = cx + ux * len * t + jx, yy = cy + uy * len * t + jy;
        if (i === 0) x.moveTo(xx, yy); else x.lineTo(xx, yy);
      }
      x.stroke();
      x.restore();
    }

    // common focal disc radius, scaled by master scale + crop
    let discR = S * (0.16 + r() * 0.14) * scale;
    let dcx = fx, dcy = fy;

    // ═══════════ MODE COMPOSITIONS (all measurements now ride the knobs) ═══
    if (mode === 'Wedge Thrust') {
      dcx = fx; dcy = fy; discR = S * (0.12 + r() * 0.12) * scale;
      const discCol = r() < 0.58 ? red : ink;
      const dp = discPts(dcx, dcy, discR);
      inkCircle(x, dcx, dcy, discR, discCol, r, true);
      texturePoly(x, dp, discCol, r, 24);
      // giant wedge — apex side, target point, length, taper all continuous
      const apexEdgeX = (asym < 0 ? 0.02 : 0.98) + (r() - 0.5) * 0.1;
      const apex = [W * apexEdgeX, H * (0.6 + r() * 0.36)];
      const tgt = [W * (0.3 + r() * 0.5), H * (0.05 + r() * 0.3)];
      const wAng = Math.atan2(tgt[1] - apex[1], tgt[0] - apex[0]);
      const wLen = D * (0.62 + r() * 0.42) * crop;
      const sA = S * (0.08 + r() * 0.16) * scale, sB = S * (0.08 + r() * 0.16) * scale;
      const wpts = drawWedge(x, apex[0], apex[1], wAng, wLen, sA, sB, ink, r);
      texturePoly(x, wpts, ink, r, 26);
      // 1–2 crossing red/steel bars at continuous offsets
      const nb = 1 + (r() < (0.4 + density * 0.3) ? 1 : 0);
      for (let i = 0; i < nb; i++) {
        const bc = i === 0 ? red : steel;
        const bx = W * (0.4 + r() * 0.3), by = H * (0.4 + r() * 0.3);
        const ba = baseAng + (i ? (r() - 0.5) * 1.4 : (r() - 0.5) * 0.5);
        const bT = S * (0.03 + r() * 0.05) * scale;
        const bp = drawBar(x, bx, by, ba, D * (0.6 + r() * 0.35), bT, bc, r);
        texturePoly(x, bp, bc, r, 22);
      }
      const lines = 1 + Math.round(density * 1.6);
      for (let i = 0; i < lines; i++) {
        crossLine(W * (0.3 + r() * 0.4), H * (0.3 + r() * 0.4), baseAng + Math.PI / 2 + (r() - 0.5) * 0.6, D, Math.max(2, S * (0.003 + r() * 0.005)), r() < 0.5 ? steel : ink, 0.5 + r() * 0.45);
      }

    } else if (mode === 'Eclipse Cross') {
      const c = [W * (0.36 + r() * 0.30 + asym * 0.06), H * (0.36 + r() * 0.30)];
      const a1 = baseAng, a2 = baseAng + Math.PI / 2 + (r() - 0.5) * 0.7;
      const T1 = S * (0.06 + r() * 0.08) * scale, T2 = S * (0.035 + r() * 0.06) * scale;
      const bb1 = drawBar(x, c[0], c[1], a1, D * (0.8 + r() * 0.3), T1, ink, r); texturePoly(x, bb1, ink, r, 26);
      const bb2 = drawBar(x, c[0], c[1], a2, D * (0.8 + r() * 0.3), T2, red, r); texturePoly(x, bb2, red, r, 22);
      discR = S * (0.11 + r() * 0.19) * scale;
      // disc can sit at the cross or be displaced (continuous, wide range)
      const dox = (r() - 0.5) * S * 0.42, doy = (r() - 0.5) * S * 0.42;
      const dcc = [c[0] + dox, c[1] + doy];
      const dcol = r() < 0.5 ? red : steel;
      const dp = discPts(dcc[0], dcc[1], discR);
      inkCircle(x, dcc[0], dcc[1], discR, dcol, r, true);
      texturePoly(x, dp, dcol, r, 24);
      // re-stamp ink bar for the eclipse cut
      inkPoly(x, bb1, ink, r, 2); texturePoly(x, bb1, ink, r, 26);
      // optional orbiting ring at continuous radius/offset
      if (r() < 0.7) {
        x.save(); x.lineWidth = Math.max(2.5, S * (0.005 + r() * 0.006));
        inkCircle(x, dcc[0] + (r() - 0.5) * S * 0.16, dcc[1] - (r() - 0.5) * S * 0.16, discR * (1.15 + r() * 0.5), K.rgba(steel, 0.7 + r() * 0.25), r, false);
        x.restore();
      }
      dcx = dcc[0]; dcy = dcc[1];

    } else if (mode === 'Lattice Drive') {
      const n = 3 + Math.round(density * 4 + r() * 2);   // 3–9 bars
      const ang = baseAng;
      const px = -Math.sin(ang), py = Math.cos(ang);
      const cxn = W * (0.4 + r() * 0.2 + asym * 0.08), cyn = H * (0.4 + r() * 0.2);
      // non-uniform spacing → rhythm
      const gaps = []; let span = 0;
      for (let i = 0; i < n - 1; i++) { const g = S * (0.045 + r() * 0.11) * scale; gaps.push(g); span += g; }
      const offs = [-span * (0.35 + r() * 0.3)]; for (let i = 0; i < gaps.length; i++) offs.push(offs[i] + gaps[i]);
      const heavyIdx = (r() * n) | 0;
      let redIdx = (r() * n) | 0; if (redIdx === heavyIdx) redIdx = (redIdx + 1) % n;
      for (let i = 0; i < n; i++) {
        const cx = cxn + px * offs[i] + (r() - 0.5) * 10;
        const cy = cyn + py * offs[i] + (r() - 0.5) * 10;
        const aJit = ang + (r() - 0.5) * 0.06;  // each bar slightly off-parallel
        let col, T;
        if (i === heavyIdx) { col = ink; T = S * (0.07 + r() * 0.05) * scale; }
        else if (i === redIdx) { col = red; T = S * (0.035 + r() * 0.035) * scale; }
        else { col = i % 2 ? K.mix(ink, steel, 0.15 + r() * 0.2) : K.mix(ink, steel, 0.35 + r() * 0.25); T = S * (0.01 + r() * 0.025) * scale; }
        const bp = drawBar(x, cx, cy, aJit, D * (0.85 + r() * 0.25) * crop, T, col, r);
        texturePoly(x, bp, col, r, 26);
      }
      const m = 1 + Math.round(density * 2 + r());
      for (let j = 0; j < m; j++) {
        crossLine(W * (0.25 + r() * 0.5), H * (0.25 + r() * 0.5), ang + Math.PI / 2 + (r() - 0.5) * 0.4, D, Math.max(2, S * (0.003 + r() * 0.007)), r() < 0.5 ? steel : ink, 0.6 + r() * 0.3);
      }
      // focal disc anywhere, continuous
      dcx = W * (0.22 + r() * 0.56); dcy = H * (0.22 + r() * 0.56); discR = S * (0.08 + r() * 0.09) * scale;
      const dp = discPts(dcx, dcy, discR);
      inkCircle(x, dcx, dcy, discR, r() < 0.7 ? red : ink, r, true); texturePoly(x, dp, red, r, 22);

    } else if (mode === 'Severed Disc') {
      dcx = W * (0.3 + r() * 0.4 + asym * 0.06); dcy = H * (0.3 + r() * 0.36);
      discR = S * (0.2 + r() * 0.13) * scale * crop;
      const dcol = r() < 0.5 ? red : ink;
      const dp = discPts(dcx, dcy, discR, 72);
      inkCircle(x, dcx, dcy, discR, dcol, r, true); texturePoly(x, dp, dcol, r, 22);
      // severing bar — continuous offset, thickness, angle
      const sang = baseAng + (r() - 0.5) * 0.3;
      const T = S * (0.02 + r() * 0.05) * scale;
      const sOff = (r() - 0.5) * discR * 0.8;
      const barCol = dcol === red ? ink : red;
      const sb = drawBar(x, dcx + Math.cos(sang + 1.57) * sOff, dcy + Math.sin(sang + 1.57) * sOff, sang, D * (0.9 + r() * 0.25), T, barCol, r);
      texturePoly(x, sb, barCol, r, 24);
      crossLine(dcx, dcy, sang + Math.PI / 2 + (r() - 0.5) * 0.4, discR * (1.8 + r() * 1.2), Math.max(2, S * (0.003 + r() * 0.004)), steel, 0.7 + r() * 0.25);
      // counter-dots in negative space — count & placement continuous
      const dots = r() < 0.7 ? 1 + (r() < 0.4 ? 1 : 0) : 0;
      for (let i = 0; i < dots; i++) {
        const far = discR + S * (0.1 + r() * 0.22);
        const da = sang + (i ? Math.PI : 0) + (r() - 0.5) * 0.5;
        const adx = dcx + Math.cos(da) * far, ady = dcy + Math.sin(da) * far;
        const acx = K.clamp(adx, S * 0.06, W - S * 0.06), acy = K.clamp(ady, S * 0.06, H - S * 0.06);
        inkCircle(x, acx, acy, S * (0.012 + r() * 0.022), r() < 0.5 ? red : ink, r, true);
      }

    } else if (mode === 'Beam Cluster') {
      const node = [W * (0.15 + r() * 0.55 + asym * 0.08), H * (0.2 + r() * 0.6)];
      const k = 4 + Math.round(density * 5 + r() * 2);   // 4–11 beams
      const spreadA = 0.7 + r() * 1.5;                   // fan width, wide range
      const base = baseAng + (r() - 0.5) * 1.2;          // fan centre rotates
      // beam-length profile is continuous PER FAN: uneven taper across the fan so
      // two fans never share the same envelope (kills the "fan in the void" twin).
      const Lbase = 0.42 + r() * 0.5, Lspan = 0.18 + r() * 0.6, Lskew = (r() - 0.5) * 2;
      // a continuously-placed heavy counter-bar crosses the empty field at a free
      // position/angle, present most of the time → breaks the bare-ground gestalt.
      const counter = r() < 0.78;
      const redBeam = (r() * k) | 0;
      let capA = 0, capL = 0;
      for (let i = 0; i < k; i++) {
        const t = k > 1 ? i / (k - 1) : 0.5;             // 0..1 along the fan
        const a = base + (t - 0.5) * spreadA + (r() - 0.5) * 0.12;
        // length rides a skewed profile + jitter → ragged, per-seed envelope
        const env = Lbase + Lspan * (t + Lskew * (t - 0.5) * (t - 0.5) * 4) * 0.5 * (0.6 + r() * 0.8);
        const L = D * K.clamp(env, 0.32, 1.18) * crop;
        const cx = node[0] + Math.cos(a) * L * 0.5, cy = node[1] + Math.sin(a) * L * 0.5;
        const col = i === redBeam ? red : (i % 3 === 0 ? K.mix(ink, steel, 0.2 + r() * 0.3) : ink);
        const T = i === redBeam ? S * (0.035 + r() * 0.03) * scale : S * (0.008 + r() * 0.026) * scale;
        const bp = drawBar(x, cx, cy, a, L, T, col, r); texturePoly(x, bp, col, r, 28);
        if (i === redBeam) { capA = a; capL = L; }
      }
      // counter-bar across the void at a free placement — continuous everything
      if (counter) {
        const ccx = W * (0.25 + r() * 0.5), ccy = H * (0.25 + r() * 0.5);
        const ca = base + Math.PI / 2 + (r() - 0.5) * 1.3;
        const cT = S * (0.02 + r() * 0.06) * scale;
        const ccol = r() < 0.4 ? red : (r() < 0.6 ? steel : ink);
        const cb = drawBar(x, ccx, ccy, ca, D * (0.6 + r() * 0.55) * crop, cT, ccol, r);
        texturePoly(x, cb, ccol, r, 26);
      }
      // disc caps the red beam — placement derives from that beam
      if (r() < 0.85) {
        const ex = node[0] + Math.cos(capA) * capL, ey = node[1] + Math.sin(capA) * capL;
        const rr = S * (0.07 + r() * 0.08) * scale;
        const dp = discPts(ex, ey, rr, 60);
        inkCircle(x, ex, ey, rr, r() < 0.5 ? ink : red, r, true); texturePoly(x, dp, ink, r, 24);
        dcx = ex; dcy = ey; discR = rr;
      } else { dcx = node[0]; dcy = node[1]; discR = S * 0.05; }
      inkCircle(x, node[0], node[1], S * (0.02 + r() * 0.03) * scale, red, r, true);

    } else { // Counterpoint
      const a1 = baseAng;
      const hbx = W * (0.25 + r() * 0.25 + asym * 0.06), hby = H * (0.3 + r() * 0.3);
      const heavy = drawBar(x, hbx, hby, a1, D * (0.7 + r() * 0.3), S * (0.06 + r() * 0.06) * scale, ink, r);
      texturePoly(x, heavy, ink, r, 26);
      // opposing red wedge — apex/target/taper continuous
      const apex = [W * (0.78 + r() * 0.2), H * (0.05 + r() * 0.35)];
      const tgt = [W * (0.1 + r() * 0.4), H * (0.55 + r() * 0.35)];
      const wAng = Math.atan2(tgt[1] - apex[1], tgt[0] - apex[0]);
      const wp = drawWedge(x, apex[0], apex[1], wAng, D * (0.55 + r() * 0.3) * crop, S * (0.07 + r() * 0.1) * scale, S * (0.07 + r() * 0.1) * scale, red, r);
      texturePoly(x, wp, red, r, 24);
      // fulcrum disc anywhere, continuous
      dcx = W * (0.38 + r() * 0.24); dcy = H * (0.38 + r() * 0.24); discR = S * (0.09 + r() * 0.08) * scale;
      const dp = discPts(dcx, dcy, discR);
      inkCircle(x, dcx, dcy, discR, r() < 0.6 ? steel : red, r, true); texturePoly(x, dp, steel, r, 22);
      const tl = 1 + Math.round(density * 1.5);
      for (let i = 0; i < tl; i++) {
        crossLine(W * (0.35 + r() * 0.3), H * (0.35 + r() * 0.3), a1 + (i ? 0.05 : Math.PI / 2) + (r() - 0.5) * 0.4, D * (0.8 + r() * 0.3), Math.max(2, S * (0.003 + r() * 0.004)), i ? red : ink, 0.6 + r() * 0.3);
      }
    }

    // ── rare structural spice: small ink/red square locked to the thrust axis ──
    if (r() < (0.22 + density * 0.2)) {
      const sq = S * (0.02 + r() * 0.03) * scale;
      const off = discR + sq * (1.2 + r() * 2.2);
      const sx = dcx + Math.cos(baseAng) * off, sy = dcy + Math.sin(baseAng) * off;
      const sqAng = baseAng + (r() - 0.5) * 0.4;
      const sp = barPts(sx, sy, sqAng, sq, sq * (0.7 + r() * 0.6));
      inkPoly(x, sp, r() < 0.5 ? ink : red, r, 1.2); texturePoly(x, sp, ink, r, 30);
    }

    // ── ATMOSPHERE & SCREENPRINT GRADE (unchanged grade, light per-seed drift) ──
    const hazeCol = K.mix(pal.bg, pal.steel, 0.5);
    K.hazeSheet(x, W, H, noise, hazeCol, dark ? 0.08 : 0.12, S * (0.7 + r() * 0.3), 'multiply');
    K.hazeSheet(x, W, H, noise, dark ? K.mix(pal.bg, pal.steel, 0.5) : K.mix(pal.bg, '#ffffff', 0.6), dark ? 0.05 : 0.08, S * (1.05 + r() * 0.35), 'screen');
    K.grain(x, W, H, 4.5, r);
    K.vignette(x, W, H, (dark || pal.name === 'Iron Proletariat') ? 0.34 : 0.26);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    // mirror draw()'s next rng consumer (the format band) to label format
    const fband = r();
    let aspect;
    if (fband < 0.4) aspect = 0.66 + r() * 0.26;
    else if (fband < 0.66) aspect = 0.94 + r() * 0.12;
    else aspect = 1.12 + r() * 0.42;
    const f = aspect > 1.06 ? 'Landscape' : aspect < 0.94 ? 'Portrait' : 'Square';
    return { Palette: pal.name, Mode: mode, Format: f };
  }

  return { name: 'b_vanguard', draw, traits };
})();


export const vanguardTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderVanguard: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const VANGUARD_ASPECTS: readonly number[] = [1.3,1,0.78];
export const vanguardSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Iron Proletariat",
        "Ember Constructivist",
        "Ink Vanguard",
        "Bone & Cinnabar",
        "Oxblood Manifesto",
        "Gunmetal Drive"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Lattice Drive",
        "Severed Disc",
        "Beam Cluster",
        "Counterpoint",
        "Wedge Thrust",
        "Eclipse Cross"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Portrait",
        "Landscape",
        "Square"
      ]
    }
  ]
};
