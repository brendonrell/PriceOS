// @ts-nocheck
/*
 * LongNoon — PriceOS art engine (by opus4-8). Abstract generative system,
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


/* MORANDI — Studio Dust (h3_morandi).
 * Soft tonal blocks (overlapping muted rectangles / columns) that dissolve into
 * long CAST-SHADOW GRADIENTS detached from the block that throws them — the
 * shadows fall the wrong way, untethered from any single light. Pure abstract
 * tonal field: no objects, no still-life, no horizon-with-land. Form, tone,
 * light, material. Morandi-still-life grade applied to abstraction —
 * MID-KEY, WARM, low-medium saturation: warm putty / dusty ochre / ash-rose
 * dominant, DEEP slate-brown darks, a real saturated ochre punch. NOT bleached.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette. KIT preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palettes — ALL inside the Studio Dust anchors
     (#CDBFA8 putty · #B98C52 dusty ochre · #C2A2A0 ash rose · #4A4036 slate-brown).
     Each is a different WEATHER of the SAME warm world — none drift toward a pale
     cool neutral. Every one keeps: a deep slate-brown dark, a warm mid field, and
     a saturated ochre/rose accent for the focal punch.
       bg     = ground wash · fields = tonal block tones · dark = deep dark
       accent = saturated punch · shadow = detached cast-shadow base · glow = warm light */
  const PALS = [
    { name: 'Studio Dust',  bg: '#b8a88e', fields: ['#cdbfa8', '#c2a2a0', '#b98c52', '#a9926e', '#bfae90'], dark: '#4a4036', accent: '#bb842a', shadow: '#564a3c', glow: '#e6d2ad' },
    { name: 'Ochre Kiln',   bg: '#ab8e63', fields: ['#c69a55', '#b98c52', '#c2a08a', '#a87d44', '#cdbfa8'], dark: '#423524', accent: '#c87f22', shadow: '#4e3d28', glow: '#f0d59a' },
    { name: 'Ash Rose',     bg: '#ad9690', fields: ['#c2a2a0', '#caa9a3', '#b98c52', '#b59488', '#cdbfa8'], dark: '#473a39', accent: '#bb6f55', shadow: '#534340', glow: '#e8cdbe' },
    { name: 'Putty Warm',   bg: '#a89d83', fields: ['#cdbfa8', '#c2b496', '#b6a684', '#b98c52', '#c2a2a0'], dark: '#433c30', accent: '#b08832', shadow: '#4d4538', glow: '#ddd0b2' },
    { name: 'Burnt Sienna', bg: '#9a7c5e', fields: ['#b98c52', '#a9744a', '#c2a2a0', '#a87f54', '#caa873'], dark: '#3e3026', accent: '#c4641f', shadow: '#4a382a', glow: '#ecc488' },
    { name: 'Umber Hush',   bg: '#8f7e63', fields: ['#b08a5a', '#cdbfa8', '#9a8466', '#b98c52', '#bba086'], dark: '#352b20', accent: '#b07a2c', shadow: '#433526', glow: '#d8c39a' },
  ];
  /* RARE — grail-only colorway: a deeper, more saturated dusk of the same world
     with a hot ochre/oxblood punch. ~1-in-12 seeds. */
  const RARE = { name: 'Oxblood Dusk', bg: '#6e5a4a', fields: ['#9a6f52', '#7e5a48', '#b98c52', '#8a6450', '#a98562'], dark: '#2a221b', accent: '#d2641a', shadow: '#3a2c22', glow: '#e8a85a', rare: true };

  /* Nine structurally-distinct composition modes. Each is its OWN silhouette
     logic — no shared "table/trestle" tell, hard variation in scale + focal
     placement. 'Monolith','Shelf','Duo','Topple','Horizon' are the new ones. */
  const MODES = ['Monolith', 'Shelf', 'Duo', 'Topple', 'Horizon', 'Stack', 'Colonnade', 'Eclipse', 'Quiet'];
  const FORMATS = [[1040, 1280], [1200, 1200], [1280, 1040]]; // portrait / square / landscape

  function pickPal(r, rare) {
    if (undefined) {
      if (undefined === RARE.name) return RARE;
      const p = PALS.find((p) => p.name === undefined); if (p) return p;
    }
    if (rare) return RARE;
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 3);
    const isRare = r() < 0.085;            // ~1-in-12 grail
    const pal = pickPal(r, isRare);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── GROUND: a warm tonal wash with a slow gradient (never a flat fill) ──
    const diag = r() < 0.5;
    const bg0 = K.mix(pal.bg, pal.dark, 0.14 + r() * 0.10);   // sunk corner
    const bg1 = K.mix(pal.bg, pal.glow, 0.12 + r() * 0.10);   // lit corner
    const gg = diag ? x.createLinearGradient(0, 0, W, H) : x.createLinearGradient(0, 0, 0, H);
    gg.addColorStop(0, bg1); gg.addColorStop(0.55, pal.bg); gg.addColorStop(1, bg0);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // a broad low-lying tonal pool seats the composition + keeps the base DEEP
    const poolY = H * (0.60 + r() * 0.18);
    const pg = x.createLinearGradient(0, poolY - H * 0.22, 0, H);
    pg.addColorStop(0, K.rgba(pal.dark, 0));
    pg.addColorStop(1, K.rgba(pal.dark, 0.46 + r() * 0.12));
    x.fillStyle = pg; x.fillRect(0, poolY - H * 0.22, W, H - (poolY - H * 0.22));
    K.mottle(x, 0, 0, W, H, pal.bg, 40, r, 'overlay');

    // nominal light side — and we DEFY it (shadows often fall the wrong way)
    const lightDir = r() < 0.5 ? -1 : 1;

    /* A soft tonal block: feathered rectangle / column with internal tonal
       gradient + edge feather + chalky mottle. No hard vector edges. */
    function softBlock(bx, by, bw, bh, col, opacity, feather) {
      x.save();
      const steps = 7;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const inset = feather * (1 - t);
        const a = (opacity / steps) * (0.5 + t);
        const tone = K.mix(col, t < 0.5 ? pal.dark : pal.glow, Math.abs(t - 0.5) * 0.5);
        x.fillStyle = K.rgba(tone, a);
        x.fillRect(bx + inset, by + inset, bw - inset * 2, bh - inset * 2);
      }
      // directional tonal gradient across the face (form turning in light)
      const fg = x.createLinearGradient(bx, by, bx + bw, by + bh);
      fg.addColorStop(0, K.rgba(K.mix(col, pal.glow, 0.30), opacity * 0.5));
      fg.addColorStop(0.6, K.rgba(col, 0));
      fg.addColorStop(1, K.rgba(K.mix(col, pal.dark, 0.45), opacity * 0.5));
      x.fillStyle = fg; x.fillRect(bx, by, bw, bh);
      x.restore();
      K.mottle(x, bx, by, bw, bh, col, 26, r, 'overlay');
    }

    /* A rotated soft block (for leaning / toppled forms). Rotates about its own
       centre by `rot` radians, then defers to softBlock in local space so the
       internal tonal gradient + mottle + feather all come along. */
    function leanBlock(bx, by, bw, bh, col, opacity, feather, rot) {
      if (!rot) { softBlock(bx, by, bw, bh, col, opacity, feather); return; }
      x.save();
      x.translate(bx + bw / 2, by + bh / 2);
      x.rotate(rot);
      softBlock(-bw / 2, -bh / 2, bw, bh, col, opacity, feather);
      x.restore();
    }

    /* The DETACHED cast-shadow: a long soft gradient starting somewhere it
       shouldn't (offset from the block, usually the wrong side) and raking
       across the field, fading out. The surreal "off". */
    function castShadow(ax, ay, len, ang, wide, strength) {
      x.save();
      x.globalCompositeOperation = 'multiply';
      const ex = ax + Math.cos(ang) * len, ey = ay + Math.sin(ang) * len;
      // deep slate-brown core fading to the lighter shadow tone — anchors the key
      const core = K.mix(pal.shadow, pal.dark, 0.55);
      const g = x.createLinearGradient(ax, ay, ex, ey);
      g.addColorStop(0, K.rgba(core, strength * 1.15));
      g.addColorStop(0.30, K.rgba(pal.shadow, strength));
      g.addColorStop(0.65, K.rgba(pal.shadow, strength * 0.5));
      g.addColorStop(1, K.rgba(pal.shadow, 0));
      x.fillStyle = g;
      const nx = -Math.sin(ang), ny = Math.cos(ang);
      x.beginPath();
      x.moveTo(ax + nx * wide * 0.5, ay + ny * wide * 0.5);
      x.lineTo(ax - nx * wide * 0.5, ay - ny * wide * 0.5);
      x.lineTo(ex - nx * wide * 1.4, ey - ny * wide * 1.4);
      x.lineTo(ex + nx * wide * 1.4, ey + ny * wide * 1.4);
      x.closePath(); x.fill();
      x.restore();
    }

    // confident negative space: anchor the mass on a third, leave air elsewhere.
    const anchor = r() < 0.5 ? K.INVPHI : 1 - K.INVPHI; // 0.618 or 0.382

    function placeStack(cx, baseY, scale) {
      const n = 3 + (r() * 3 | 0);
      let cyy = baseY;
      for (let i = 0; i < n; i++) {
        const bw = S * (0.10 + r() * 0.14) * scale * (1 - i * 0.06);
        const bh = S * (0.12 + r() * 0.20) * scale * (1 - i * 0.04);
        const off = (r() - 0.5) * bw * 0.7;
        const bx = cx + off - bw / 2;
        const by = cyy - bh;
        const col = K.pick(pal.fields, r);
        const wrong = (r() < 0.6 ? lightDir : -lightDir);
        const sx = bx + bw * (0.2 + r() * 0.6) + wrong * bw * (0.4 + r() * 0.6);
        const sy = by + bh * (0.4 + r() * 0.7);
        castShadow(sx, sy, S * (0.28 + r() * 0.40) * scale,
          (wrong > 0 ? 0.06 : Math.PI - 0.06) + (r() - 0.5) * 0.5,
          bw * (0.7 + r() * 0.5), 0.46 + r() * 0.16);
        softBlock(bx, by, bw, bh, col, 0.92, S * 0.012);
        if (i === (n - 2) && r() < 0.5) {
          const aw = bw * (0.16 + r() * 0.12);
          softBlock(bx + bw * (0.3 + r() * 0.4), by + bh * 0.1, aw, bh * 0.8, pal.accent, 0.85, S * 0.006);
        }
        cyy -= bh * (0.52 + r() * 0.22);
      }
    }

    /* A thin warm rim of light along one vertical edge of a block — the form
       catching the key. Cheap, but it makes a slab read as solid, not flat. */
    function edgeLight(bx, by, bw, bh, side) {
      x.save();
      const lx = side > 0 ? bx + bw : bx;
      const g = x.createLinearGradient(lx - side * bw * 0.18, by, lx, by);
      g.addColorStop(0, K.rgba(pal.glow, 0));
      g.addColorStop(1, K.rgba(pal.glow, 0.30));
      x.fillStyle = g;
      x.fillRect(side > 0 ? bx + bw * 0.82 : bx, by, bw * 0.18, bh);
      x.restore();
    }

    if (mode === 'Monolith') {
      // ONE towering slab dominating the frame + a single immense raking shadow.
      const tall = r() < 0.55;                       // tower vs broad wall
      const bw = S * (tall ? (0.16 + r() * 0.08) : (0.30 + r() * 0.16));
      const bh = S * (tall ? (0.62 + r() * 0.22) : (0.34 + r() * 0.12));
      const bx = W * anchor - bw / 2;
      const by = (poolY + S * 0.03) - bh;
      const col = K.pick(pal.fields, r);
      const wrong = (r() < 0.7 ? lightDir : -lightDir);
      // the long detached shadow leaves the BASE and rakes far across the floor
      castShadow(bx + bw * (0.4 + r() * 0.2), by + bh * (0.86 + r() * 0.12),
        S * (0.62 + r() * 0.34), (wrong > 0 ? 0.02 : Math.PI - 0.02) + (r() - 0.5) * 0.22,
        bw * (1.0 + r() * 0.6), 0.50 + r() * 0.14);
      softBlock(bx, by, bw, bh, col, 0.93, S * 0.012);
      edgeLight(bx, by, bw, bh, wrong > 0 ? -1 : 1);
      // a single small attendant near the base for scale (not always)
      if (r() < 0.6) {
        const sw = bw * (0.34 + r() * 0.2), sh = S * (0.07 + r() * 0.06);
        const sbx = bx + (r() < 0.5 ? -sw * (1.1 + r()) : bw + sw * (0.1 + r() * 0.5));
        softBlock(sbx, (poolY + S * 0.03) - sh, sw, sh, K.pick(pal.fields, r), 0.9, S * 0.01);
      }
      // ochre punch: a slim accent inset on the monolith face
      if (r() < 0.7) {
        const aw = bw * (0.12 + r() * 0.1);
        softBlock(bx + bw * (0.2 + r() * 0.5), by + bh * (0.1 + r() * 0.3), aw, bh * (0.4 + r() * 0.4), pal.accent, 0.85, S * 0.006);
      }
    } else if (mode === 'Shelf') {
      // DENSE overlapping horizontal stack — broad slabs piled with hard overlap,
      // tight value steps, near-filling the lower-mid field. Mass, not pickets.
      const n = 4 + (r() * 3 | 0);
      const cx = W * (0.34 + r() * 0.32);
      let cyy = poolY + S * (0.04 + r() * 0.04);
      for (let i = 0; i < n; i++) {
        const bw = S * (0.34 + r() * 0.24) * (1 - i * 0.05);
        const bh = S * (0.08 + r() * 0.07);
        const bx = cx - bw * (0.4 + r() * 0.2) + (r() - 0.5) * bw * 0.3;
        const by = cyy - bh;
        const col = K.mix(K.pick(pal.fields, r), pal.dark, i / n * 0.28); // recede as it climbs
        const wrong = (r() < 0.6 ? lightDir : -lightDir);
        castShadow(bx + bw * (0.3 + r() * 0.4), by + bh * (0.5 + r() * 0.4),
          S * (0.30 + r() * 0.34), (wrong > 0 ? 0.06 : Math.PI - 0.06) + (r() - 0.5) * 0.4,
          bh * (1.4 + r() * 1.2), 0.40 + r() * 0.14);
        softBlock(bx, by, bw, bh, col, 0.9, S * 0.01);
        if (i === (n - 1 - (r() * 2 | 0)) && r() < 0.7) {
          const aw = bw * (0.18 + r() * 0.14);
          softBlock(bx + bw * (0.2 + r() * 0.4), by + bh * 0.1, aw, bh * 0.8, pal.accent, 0.85, S * 0.005);
        }
        cyy -= bh * (0.62 + r() * 0.26);   // overlap hard
      }
    } else if (mode === 'Duo') {
      // SPARSE pair in vast negative space: two unequal blocks far apart, the air
      // between them is the subject. One large + one small, with crossing shadows.
      const lScale = 1.0, sScale = 0.30 + r() * 0.16;     // sharper size disparity
      const lbw = S * (0.17 + r() * 0.1) * lScale, lbh = S * (0.40 + r() * 0.22) * lScale;
      const lbx = W * (0.18 + r() * 0.12) - lbw / 2, lby = poolY - lbh + S * 0.02;
      const sbw = S * (0.14 + r() * 0.08) * sScale, sbh = S * (0.22 + r() * 0.18) * sScale;
      const sbx = W * (0.74 + r() * 0.1) - sbw / 2, sby = H * (0.30 + r() * 0.34);
      // both shadows rake toward each other / cross (the surreal contradiction)
      castShadow(lbx + lbw * 0.5, lby + lbh * (0.8 + r() * 0.2), S * (0.5 + r() * 0.3),
        0.04 + (r() - 0.5) * 0.2, lbw * (0.9 + r() * 0.5), 0.48 + r() * 0.14);
      castShadow(sbx + sbw * 0.5, sby + sbh * (0.6 + r() * 0.3), S * (0.42 + r() * 0.26),
        Math.PI - 0.04 + (r() - 0.5) * 0.2, sbw * (1.0 + r() * 0.6), 0.42 + r() * 0.14);
      const lcol = K.pick(pal.fields, r);
      softBlock(lbx, lby, lbw, lbh, lcol, 0.93, S * 0.012);
      edgeLight(lbx, lby, lbw, lbh, lightDir);
      softBlock(sbx, sby, sbw, sbh, K.mix(K.pick(pal.fields, r), pal.dark, 0.12), 0.92, S * 0.01);
      edgeLight(sbx, sby, sbw, sbh, -lightDir);
      // a lone ochre note floating in the gulf between them — the charged void's pulse
      const aw = S * (0.05 + r() * 0.04), ah = S * (0.06 + r() * 0.08);
      softBlock(W * (0.45 + r() * 0.12), H * (0.40 + r() * 0.18), aw, ah, pal.accent, 0.82, S * 0.006);
    } else if (mode === 'Topple') {
      // A LEANING / toppled stack: blocks rotated off-axis, tipping, one sliding
      // off another. Diagonal energy — breaks the strict verticality of the set.
      const cx = W * anchor, baseY = poolY + S * 0.03;
      const lean = (r() < 0.5 ? 1 : -1) * (0.12 + r() * 0.20); // global tilt
      let cyy = baseY, cxx = cx;
      const n = 3 + (r() * 2 | 0);
      for (let i = 0; i < n; i++) {
        const bw = S * (0.16 + r() * 0.14) * (1 - i * 0.08);
        const bh = S * (0.14 + r() * 0.14) * (1 - i * 0.05);
        const rot = lean * (0.4 + i * 0.5) + (r() - 0.5) * 0.12; // tips more as it climbs
        const bx = cxx - bw / 2, by = cyy - bh;
        const col = K.pick(pal.fields, r);
        // the shadow falls as if the stack were still upright — the "off"
        castShadow(bx + bw * 0.5, by + bh * (0.7 + r() * 0.3), S * (0.34 + r() * 0.3),
          (lean > 0 ? 0.1 : Math.PI - 0.1) + (r() - 0.5) * 0.3, bw * (0.8 + r() * 0.5), 0.46 + r() * 0.14);
        leanBlock(bx, by, bw, bh, col, 0.92, S * 0.012, rot);
        if (i === n - 1 && r() < 0.7) {
          const aw = bw * (0.18 + r() * 0.12);
          leanBlock(bx + bw * 0.3, by + bh * 0.15, aw, bh * 0.6, pal.accent, 0.85, S * 0.006, rot);
        }
        // each block slides off the one below + climbs
        cxx += lean * bw * (0.8 + r() * 0.8);
        cyy -= bh * (0.46 + r() * 0.2);
      }
    } else if (mode === 'Horizon') {
      // Banded tonal STRATA: a few BOLD horizontal bars with strong value steps —
      // a deep dark band low, warm mids, never a pale even stripe-field. A solid
      // focal slab sits ON the strata so it's anchored, not just wallpaper.
      const n = 3 + (r() * 2 | 0);                  // few, bold bands
      let y = H * (0.04 + r() * 0.04);
      const totalH = H * (0.92 - r() * 0.06);
      // value walk: start mid-warm, drive at least one band deep dark
      const darkBand = 1 + (r() * (n - 1) | 0);
      for (let i = 0; i < n; i++) {
        const frac = 0.7 + r() * 0.9;
        const bh = (totalH / n) * frac;
        let col;
        if (i === darkBand) col = K.mix(pal.dark, pal.shadow, 0.3 + r() * 0.2);          // the deep anchor band
        else if (i === n - 1) col = K.mix(K.pick(pal.fields, r), pal.dark, 0.30);        // grounded base
        else col = K.mix(K.pick(pal.fields, r), i === 0 ? pal.glow : pal.dark, 0.06 + r() * 0.12);
        const inX = (r() - 0.5) * S * 0.05;
        softBlock(-S * 0.04 + inX, y, W + S * 0.08, bh, col, 0.9, S * 0.016);
        // a detached lateral shadow drifting off a band's underside
        if (r() < 0.6) {
          castShadow(W * (0.18 + r() * 0.5), y + bh * (0.92 + r() * 0.16), S * (0.4 + r() * 0.3),
            (r() < 0.5 ? 0.02 : Math.PI - 0.02) + (r() - 0.5) * 0.12, bh * (0.5 + r() * 0.5), 0.34 + r() * 0.14);
        }
        y += bh;
      }
      // FOCAL: a solid upright slab seated across the bands + its long shadow.
      const fbw = S * (0.13 + r() * 0.08), fbh = S * (0.34 + r() * 0.22);
      const fbx = W * anchor - fbw / 2, fby = H * (0.32 + r() * 0.16);
      castShadow(fbx + fbw * 0.5, fby + fbh * (0.7 + r() * 0.3), S * (0.5 + r() * 0.3),
        (lightDir > 0 ? 0.04 : Math.PI - 0.04) + (r() - 0.5) * 0.2, fbw * (1.0 + r() * 0.6), 0.46 + r() * 0.14);
      softBlock(fbx, fby, fbw, fbh, K.pick(pal.fields, r), 0.93, S * 0.012);
      edgeLight(fbx, fby, fbw, fbh, lightDir);
      // ochre note on the slab face
      const aw = fbw * (0.22 + r() * 0.16);
      softBlock(fbx + fbw * (0.2 + r() * 0.4), fby + fbh * (0.15 + r() * 0.3), aw, fbh * (0.3 + r() * 0.3), pal.accent, 0.85, S * 0.006);
    } else if (mode === 'Stack') {
      placeStack(W * anchor, poolY + S * 0.02, 1.05);
      if (r() < 0.7) placeStack(W * (anchor < 0.5 ? 0.78 : 0.24), poolY - S * (0.02 + r() * 0.08), 0.5 + r() * 0.2);
    } else if (mode === 'Colonnade') {
      const n = 4 + (r() * 4 | 0);
      const baseY = poolY + S * 0.04;
      let px = W * (0.10 + r() * 0.08);
      for (let i = 0; i < n; i++) {
        const sc = 1 - (i / n) * (0.4 + r() * 0.3);
        const cw = S * (0.045 + r() * 0.04) * sc;
        const ch = S * (0.42 + r() * 0.28) * sc;
        const by = baseY - ch;
        const col = K.pick(pal.fields, r);
        const wrong = (r() < 0.55 ? lightDir : -lightDir);
        castShadow(px + cw * 0.5 + wrong * cw * (1.5 + r() * 2), by + ch * (0.5 + r() * 0.5),
          S * (0.20 + r() * 0.30) * sc, (wrong > 0 ? 0.1 : Math.PI - 0.1) + (r() - 0.5) * 0.4,
          cw * (1.0 + r() * 0.8), 0.42 + r() * 0.14);
        softBlock(px, by, cw, ch, col, 0.9, S * 0.008);
        if (r() < 0.28) softBlock(px, by + ch * (0.2 + r() * 0.5), cw, ch * 0.12, pal.accent, 0.8, S * 0.005);
        px += cw + S * (0.06 + r() * 0.08) * sc;
        if (px > W * 0.92) break;
      }
    } else if (mode === 'Eclipse') {
      const dx = W * anchor, dy = H * (0.40 + r() * 0.16), dr = S * (0.22 + r() * 0.11);
      const dcol = K.pick(pal.fields, r);
      // seat the disc against DARKNESS: a deep detached slab + cast shadow behind it
      const slX = dx + lightDir * dr * (0.5 + r() * 0.6);
      castShadow(slX, dy + dr * 0.2, S * (0.42 + r() * 0.3),
        (lightDir > 0 ? 0.15 : Math.PI - 0.15) + (r() - 0.5) * 0.3, dr * (1.4 + r() * 0.7), 0.52 + r() * 0.12);
      // a large soft dark field-slab partly behind the disc (the deep anchor)
      softBlock(dx - dr * (1.0 + r() * 0.4), dy - dr * (0.4 + r() * 0.5),
        dr * (1.1 + r() * 0.5), dr * (1.6 + r() * 0.6), K.mix(pal.dark, pal.shadow, 0.4), 0.82, S * 0.02);
      // the tonal disc: hard-seated, lit crescent → DEEP terminator (a real eclipse limb)
      x.save();
      const dgr = x.createRadialGradient(dx - dr * 0.32, dy - dr * 0.32, dr * 0.08, dx + dr * 0.18, dy + dr * 0.18, dr * 1.05);
      dgr.addColorStop(0, K.rgba(K.mix(dcol, pal.glow, 0.20), 0.96));
      dgr.addColorStop(0.42, K.rgba(dcol, 0.95));
      dgr.addColorStop(0.72, K.rgba(K.mix(dcol, pal.dark, 0.55), 0.95));
      dgr.addColorStop(1, K.rgba(K.mix(pal.dark, '#000', 0.25), 0.95)); // deep limb, NOT transparent
      x.fillStyle = dgr; x.beginPath(); x.arc(dx, dy, dr, 0, 7); x.fill();
      x.restore();
      K.mottle(x, dx - dr, dy - dr, dr * 2, dr * 2, dcol, 28, r, 'overlay');
      // a slim ochre column crossing the disc for the saturated punch
      const cw = S * (0.055 + r() * 0.04), ch = S * (0.5 + r() * 0.2);
      softBlock(dx + (r() - 0.5) * dr * 0.7, dy - ch * 0.3,
        cw, ch, r() < 0.5 ? pal.accent : K.pick(pal.fields, r), 0.9, S * 0.008);
    } else { // Quiet — charged minimalism: one strong block, vast air seated against
             // a deep tonal field-mass + one long wrong shadow. Empty, never dead.
      // a large soft DEEP field-mass weighting one side (the charged negative space).
      // Built as a directional gradient slab so it reads as real shadowed depth,
      // never a flat pale rectangle — and it stays DEEP on the lighter palettes.
      const massSide = r() < 0.5 ? -1 : 1;
      const mw = S * (0.56 + r() * 0.3), mh = H * (0.62 + r() * 0.3);
      const mx = massSide > 0 ? W - mw * (0.5 + r() * 0.18) : -mw * (0.5 + r() * 0.18);
      const my = H * (0.30 + r() * 0.18);
      x.save();
      const mg = x.createLinearGradient(massSide > 0 ? mx + mw : mx, 0, massSide > 0 ? mx : mx + mw, 0);
      mg.addColorStop(0, K.rgba(K.mix(pal.dark, '#000', 0.12), 0.66));
      mg.addColorStop(0.55, K.rgba(K.mix(pal.dark, pal.shadow, 0.4), 0.40));
      mg.addColorStop(1, K.rgba(pal.shadow, 0));
      x.fillStyle = mg; x.fillRect(mx, my, mw, mh);
      x.restore();
      K.mottle(x, mx, my, mw, mh, pal.dark, 40, r, 'multiply');
      const bx = W * anchor, by = poolY - S * (0.04 + r() * 0.05);
      const bw = S * (0.12 + r() * 0.07), bh = S * (0.34 + r() * 0.22);   // a touch taller/bolder
      castShadow(bx + (r() < 0.5 ? -1 : 1) * bw * (2 + r() * 2), by + bh * (0.6 + r() * 0.3),
        S * (0.5 + r() * 0.28), (r() - 0.5) * 1.0 + (r() < 0.5 ? Math.PI : 0), bw * (0.8 + r() * 0.5), 0.46 + r() * 0.14);
      softBlock(bx - bw / 2, by - bh, bw, bh, K.pick(pal.fields, r), 0.93, S * 0.012);
      edgeLight(bx - bw / 2, by - bh, bw, bh, -massSide);
      // a guaranteed lone ochre note resting in the air (the single point of warmth)
      const aw = bw * (0.5 + r() * 0.4), ah = S * (0.04 + r() * 0.04);
      softBlock(bx - aw / 2 + (r() - 0.5) * S * 0.34, by + S * (0.05 + r() * 0.07), aw, ah, pal.accent, 0.8, S * 0.008);
    }

    // ── ATMOSPHERE & TEXTURE (haze adds air, NOT bleach) ──
    // a restrained warm haze for air — kept low so it can't lift the key
    const hazeCol = K.mix(pal.bg, pal.glow, 0.34);
    K.hazeSheet(x, W, H, noise, hazeCol, isRare ? 0.07 : 0.085, S * 0.85, 'soft-light');
    // dominant haze pass is a DEEPENING multiply in the dark tone (anti-bleach)
    K.hazeSheet(x, W, H, noise, K.mix(pal.shadow, pal.dark, 0.4), 0.16, S * 0.55, 'multiply');
    // re-seat a deep tonal floor so haze can't wash the base out
    const fl = x.createLinearGradient(0, H * 0.66, 0, H);
    fl.addColorStop(0, K.rgba(pal.dark, 0));
    fl.addColorStop(1, K.rgba(pal.dark, 0.34));
    x.fillStyle = fl; x.fillRect(0, H * 0.66, W, H * 0.34);
    K.grain(x, W, H, 4.5, r);
    K.vignette(x, W, H, isRare ? 0.44 : 0.38);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const isRare = r() < 0.085;
    const pal = undefined
      ? (undefined === RARE.name ? RARE : (PALS.find((p) => p.name === undefined) || PALS[0]))
      : (isRare ? RARE : K.pick(PALS, r));
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Mode: mode, Format: f, Shadow: 'Detached', Rarity: pal.rare ? 'Grail' : 'Standard' };
  }

  return { name: 'h3_morandi', draw, traits };
})();


export const longNoonTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderLongNoon: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const LONGNOON_ASPECTS: readonly number[] = [0.8125,1,1.2308];
export const longNoonSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Ash Rose",
        "Putty Warm",
        "Burnt Sienna",
        "Umber Hush",
        "Studio Dust",
        "Ochre Kiln",
        "Oxblood Dusk"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Duo",
        "Colonnade",
        "Horizon",
        "Quiet",
        "Topple",
        "Stack",
        "Monolith",
        "Eclipse",
        "Shelf"
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
      "name": "Shadow",
      "values": [
        "Detached"
      ]
    },
    {
      "name": "Rarity",
      "values": [
        "Standard",
        "Grail"
      ]
    }
  ]
};
