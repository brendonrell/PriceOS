// @ts-nocheck
/*
 * Noctilucent — PriceOS art engine (by opus4-8). Abstract generative system,
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


/* NOCTILUCENT — luminous cold light over a vast dark plane.
 * Electric silver-blue luminous structures — bands, drapes, curtains, columns,
 * broken ribbons, filament fields — ripple and feather across an immense
 * near-black field; a faint peach glow breathes at one edge; the light casts
 * cold into nothing. Night-sky abstraction — high contrast between deep black
 * field and bright luminous form. NO horizon, NO ground, NO objects.
 * ABSTRACT: pure field / luminous structure / light / atmosphere.
 *
 * MANDATED GRADE: low-key near-black with electric silver-blue luminous form.
 * Reads DARK and cold-glowing. Haze adds air, it does NOT bleach.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Bespoke palettes — all anchored in the Noctilucent world:
     #0B0E14 deep black ground, #1A2138 twilight indigo, #B9CBD9 electric
     silver-blue, #D7A98A faint peach edge. Each is a different "weather" of
     the SAME cold night — never drifting pale/neutral. ground stays deep,
     band/glow stay saturated-cold. */
  const PALS = [
    // base world: near-black ground, twilight mids, electric silver-blue bands, peach edge
    { name: 'Noctilucent',   ground: '#0B0E14', deep: '#070910', mid: '#1A2138', band: '#B9CBD9', hot: '#E6F0F8', edge: '#D7A98A', rare: false },
    // colder, steel: ground a touch bluer, bands harder/whiter, almost no peach
    { name: 'Polar Steel',   ground: '#080B12', deep: '#05070C', mid: '#16203A', band: '#A8C4DE', hot: '#EAF4FF', edge: '#9FB6C8', rare: false },
    // teal-leaning night: indigo pushed toward deep cyan-green, bands cool teal-silver
    { name: 'Glacier Drift',  ground: '#070D11', deep: '#040809', mid: '#102A32', band: '#AED2D4', hot: '#E2F6F4', edge: '#CDA98E', rare: false },
    // warmer dusk: more peach at the edge, indigo warmer, bands silver with a faint warm cast
    { name: 'Ashen Aurora',  ground: '#0C0D12', deep: '#08080D', mid: '#241F33', band: '#C4C2CE', hot: '#F1EAEA', edge: '#E0A985', rare: false },
    // deepest, most contrast: blackest ground, narrow brilliant bands
    { name: 'Abyss Bloom',   ground: '#060810', deep: '#03040A', mid: '#131A30', band: '#BFD2E2', hot: '#F2F8FF', edge: '#C99A88', rare: false },
    // violet night: indigo toward violet, bands cool lilac-silver
    { name: 'Indigo Veil',   ground: '#0A0A14', deep: '#06060E', mid: '#221C3A', band: '#BBC0E0', hot: '#EDEAF8', edge: '#D5A693', rare: false },
    // RARE GRAIL — electric ion: bands flare cyan-white, edge a vivid sodium-amber. high impact.
    { name: 'Ion Storm',     ground: '#05080F', deep: '#02040A', mid: '#0E2440', band: '#9FE6F0', hot: '#F4FFFF', edge: '#F0B070', rare: true },
  ];

  // Structurally-distinct composition modes (9). Each is its own generator.
  const MODES = [
    'Stratus',        // calm parallel bands clustered in one third
    'Ripple Veil',    // many thin tightly-rippled bands — a veil
    'Aurora Drift',   // a few broad billowing bands, angled
    'Draped Sheet',   // long sagging catenary sheets, slack like hung cloth
    'Arc Curtain',    // radial-arc curtains sweeping from an off-frame focus
    'Aurora Columns', // vertical luminous columns raining down (curtain rays)
    'Broken Ribbon',  // feathered ribbons torn into drifting fragments
    'Strata Split',   // one dense low band vs a field of high thin filaments
    'Deep Calm',      // minimal: 1–2 wide soft forms, vast dark
  ];
  const FORMATS = [[1040, 1300], [1200, 1200], [1300, 1000]]; // portrait / square / landscape

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    // rare grail: ~1-in-8 seeds get the Ion Storm palette
    if (r() < 0.12) return PALS[6];
    return K.pick(PALS.slice(0, 6), r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const minWH = Math.min(W, H);
    // a few seeds are extra "grail" — louder light, an aurora flare event
    const grail = pal.rare || r() < 0.1;

    // ── DEEP DARK FIELD — vertical gradient, deepest at top/bottom, indigo lift in the mid.
    const fld = x.createLinearGradient(0, 0, 0, H);
    const lift = 0.25 + r() * 0.3;            // where the indigo lift sits vertically
    fld.addColorStop(0, pal.deep);
    fld.addColorStop(Math.max(0.02, lift - 0.18), pal.ground);
    fld.addColorStop(lift, K.mix(pal.ground, pal.mid, 0.7));
    fld.addColorStop(Math.min(0.98, lift + 0.22), pal.ground);
    fld.addColorStop(1, pal.deep);
    x.fillStyle = fld; x.fillRect(0, 0, W, H);

    // faint indigo nebular mottle in the field (very low, just air in the dark)
    K.hazeSheet(x, W, H, noise, pal.mid, 0.16, minWH * (0.7 + r() * 0.5), 'screen');
    // a slow large-scale glow drift — a soft cold bloom somewhere in the field, off-center
    const gbx = W * (0.2 + r() * 0.6), gby = H * (0.2 + r() * 0.6);
    K.bloom(x, gbx, gby, minWH * (0.8 + r() * 0.5), K.mix(pal.mid, pal.band, 0.3), 0.05 + r() * 0.04);

    // ── faint PEACH glow breathing at ONE edge ──
    const edgeTop = r() < 0.5;
    const ex = W * (0.18 + r() * 0.64);
    const ey = edgeTop ? H * (-0.02 + r() * 0.08) : H * (0.94 + r() * 0.08);
    const eBoost = grail ? 1.7 : 1.0;
    K.bloom(x, ex, ey, minWH * (0.7 + r() * 0.4), pal.edge, (0.13 + r() * 0.05) * eBoost);
    K.bloom(x, ex, ey, minWH * (0.32 + r() * 0.2), K.mix(pal.edge, '#ffffff', 0.2), (0.10 + r() * 0.05) * eBoost);
    x.save(); x.globalCompositeOperation = 'lighter';
    const eg = x.createLinearGradient(0, edgeTop ? 0 : H, 0, edgeTop ? H * 0.22 : H * 0.78);
    eg.addColorStop(0, K.rgba(pal.edge, (0.10 + r() * 0.04) * eBoost));
    eg.addColorStop(1, K.rgba(pal.edge, 0));
    x.fillStyle = eg; x.fillRect(0, edgeTop ? 0 : H * 0.78, W, H * 0.22); x.restore();

    /* ── CORE STRUCTURE PAINTER ──
       A luminous structure traced along a PATH. The path is a parametric curve
       across the frame; thickness, intensity, density-gating, ripple and a hot
       core are evaluated per sample. This generalizes the old horizontal band
       to any orientation/shape: horizontal, angled, sagging, arced, vertical.

       pathFn(t) -> {cx, cy, nx, ny}  // point + unit normal (the offset direction)
       t runs 0..1 along the structure. len = sample count.
       opts: { th, intensity, col, ripple, vp, cast, hotCore } */
    function structure(pathFn, len, opts) {
      const th0 = opts.th, intensity = opts.intensity, col = opts.col;
      const ripple = opts.ripple, vp = opts.vp;
      const cast = opts.cast == null ? 1 : opts.cast;     // outward cast-light strength
      const hotCore = opts.hotCore !== false;
      // collect samples first so we can stroke continuous quads (no disc pile-up)
      const pts = [];
      for (let i = 0; i <= len; i++) {
        const t = i / len;
        const P = pathFn(t);
        const u = t * vp.span;
        const n1 = noise.fbm(u / vp.wav, vp.ph, 4, 0.55, 2.1);
        const n2 = noise.fbm(u / (vp.wav * 0.4) + 30, vp.ph + 7, 3, 0.5, 2.2);
        const off = (n1 * 2.2 + n2 * 0.7) * th0 * ripple;
        const cx = P.cx + P.nx * off;
        const cy = P.cy + P.ny * off;
        const localTh = th0 * (0.45 + (noise.fbm(u / vp.wav + 11, vp.ph + 3, 3) + 1) * 0.6) * (P.thMul || 1);
        const dens = (noise.fbm(u / (vp.wav * 0.7) + 7, vp.ph + 2, 3) + 1) / 2;
        const taper = P.taper == null ? 1 : P.taper;
        // SMOOTH density gate: fade across a soft band around the threshold so
        // fragments feather in/out (no hard square cut at the boundary)
        const fw = 0.14;                                   // feather width
        const gate = K.clamp((dens - (vp.gap - fw)) / (2 * fw), 0, 1);
        const live = gate > 0.04;
        const a = intensity * (0.28 + dens * 0.62) * taper * (gate * gate);
        pts.push({ cx, cy, nx: P.nx, ny: P.ny, th: localTh, a, dens, live });
      }
      // ── cast-light: a broad soft spill on the OUTWARD side (cold light into nothing).
      // Centered radial gradient, drawn as a circle (no square clip artifacts).
      if (cast > 0) {
        x.save(); x.globalCompositeOperation = 'lighter';
        for (let i = 0; i < pts.length; i += 4) {
          const p = pts[i]; if (!p.live) continue;
          const cl = th0 * (3.4 + ripple * 1.6);
          const bx = p.cx + p.nx * cl * 0.45, by = p.cy + p.ny * cl * 0.45;
          const cg = x.createRadialGradient(bx, by, 0, bx, by, cl);
          cg.addColorStop(0, K.rgba(col, p.a * 0.07 * cast));
          cg.addColorStop(1, K.rgba(col, 0));
          x.fillStyle = cg;
          x.beginPath(); x.arc(bx, by, cl, 0, 7); x.fill();
        }
        x.restore();
      }
      // ── the luminous body: continuous feathered band built from per-segment
      // quads with a soft cross-section. Drawn ADDITIVE but with low per-pass
      // alpha + a separable soft edge, so it stays cold-coloured (no white-out).
      x.save(); x.globalCompositeOperation = 'lighter';
      // two cross-section shells: a wide soft halo, then a tighter brighter core
      const shells = [{ w: 1.0, a: 0.55, c: col }, { w: 0.42, a: 0.85, c: col }];
      for (const sh of shells) {
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i], q = pts[i + 1];
          if (!p.live || !q.live) continue;
          const wA = p.th * sh.w, wB = q.th * sh.w;
          const aMid = (p.a + q.a) * 0.5 * sh.a;
          if (aMid < 0.012) continue;
          // perpendicular gradient across the segment mid (normal direction)
          const mx = (p.cx + q.cx) / 2, my = (p.cy + q.cy) / 2;
          const wMid = (wA + wB) / 2;
          const gx0 = mx - p.nx * wMid, gy0 = my - p.ny * wMid;
          const gx1 = mx + p.nx * wMid, gy1 = my + p.ny * wMid;
          const grad = x.createLinearGradient(gx0, gy0, gx1, gy1);
          grad.addColorStop(0, K.rgba(sh.c, 0));
          grad.addColorStop(0.5, K.rgba(sh.c, aMid));
          grad.addColorStop(1, K.rgba(sh.c, 0));
          x.fillStyle = grad;
          x.beginPath();
          x.moveTo(p.cx - p.nx * wA, p.cy - p.ny * wA);
          x.lineTo(q.cx - q.nx * wB, q.cy - q.ny * wB);
          x.lineTo(q.cx + q.nx * wB, q.cy + q.ny * wB);
          x.lineTo(p.cx + p.nx * wA, p.cy + p.ny * wA);
          x.closePath(); x.fill();
        }
      }
      // ── hot core filament — a thin bright thread on bright structures
      if (hotCore && intensity > 0.5) {
        for (let i = 0; i < pts.length - 1; i++) {
          const p = pts[i], q = pts[i + 1];
          if (!p.live || !q.live || p.dens < vp.gap + 0.16) continue;
          const wA = p.th * 0.14, wB = q.th * 0.14;
          x.fillStyle = K.rgba(vp.hot, ((p.a + q.a) * 0.5) * 0.5);
          x.beginPath();
          x.moveTo(p.cx - p.nx * wA, p.cy - p.ny * wA);
          x.lineTo(q.cx - q.nx * wB, q.cy - q.ny * wB);
          x.lineTo(q.cx + q.nx * wB, q.cy + q.ny * wB);
          x.lineTo(p.cx + p.nx * wA, p.cy + p.ny * wA);
          x.closePath(); x.fill();
        }
      }
      x.restore();
    }

    function vparams(span) {
      return {
        span: span || minWH,
        wav: minWH * (0.18 + r() * 0.7),
        ph: r() * 40,
        gap: 0.02 + r() * 0.22,
        hot: pal.hot,
      };
    }

    // ── PATH FACTORIES ───────────────────────────────────────────────────────
    // Horizontal band at baseline y, optional slope.
    function pathHoriz(y, slope) {
      slope = slope || 0;
      return (t) => ({ cx: t * W, cy: y + (t - 0.5) * W * slope, nx: 0, ny: 1 });
    }
    // Sagging catenary sheet: dips in the middle like hung cloth. sag>0 sags down.
    function pathDrape(y, sag, slope) {
      slope = slope || 0;
      return (t) => {
        const s = Math.sin(t * Math.PI);          // 0 at ends, 1 mid
        return { cx: t * W, cy: y + s * sag + (t - 0.5) * W * slope, nx: 0, ny: 1, taper: 0.4 + s * 0.6 };
      };
    }
    // Radial arc curtain: an arc segment of a big circle centered at (fx,fy).
    function pathArc(fx, fy, rad, a0, a1) {
      return (t) => {
        const ang = a0 + (a1 - a0) * t;
        const cx = fx + Math.cos(ang) * rad, cy = fy + Math.sin(ang) * rad;
        // normal points radially outward
        return { cx, cy, nx: Math.cos(ang), ny: Math.sin(ang) };
      };
    }
    // Vertical column (aurora ray) at x, from y0 down to y1, swaying with noise.
    function pathColumn(cx0, y0, y1, sway) {
      return (t) => {
        const cy = y0 + (y1 - y0) * t;
        const wob = Math.sin(t * 3.1 + cx0) * sway;
        // fade in at top, fade out at bottom (rays hang from above)
        const taper = Math.min(1, t * 4) * Math.min(1, (1 - t) * 2.2);
        return { cx: cx0 + wob, cy, nx: 1, ny: 0, taper, thMul: 0.7 + (1 - t) * 0.6 };
      };
    }

    // ── COMPOSE per mode ──
    if (mode === 'Stratus') {
      const n = 4 + (r() * 3 | 0);
      const top = H * (0.18 + r() * 0.4);
      const spread = H * (0.22 + r() * 0.2);
      const slope = (r() - 0.5) * 0.06;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1 || 1);
        const by = top + t * spread + (r() - 0.5) * H * 0.02;
        const th = minWH * (0.012 + r() * 0.02);
        const inten = 0.4 + (1 - Math.abs(t - 0.4)) * 0.45 + r() * 0.1;
        structure(pathHoriz(by, slope), 230, { th, intensity: K.clamp(inten, 0.2, 0.95), col: pal.band, ripple: 0.5 + r() * 0.4, vp: vparams(W), cast: 0.8 });
      }
    } else if (mode === 'Ripple Veil') {
      const n = 7 + (r() * 5 | 0);
      const top = H * (0.12 + r() * 0.2);
      const spread = H * (0.4 + r() * 0.22);
      const slope = (r() - 0.5) * 0.05;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1 || 1);
        const by = top + t * spread;
        const th = minWH * (0.008 + r() * 0.012);
        structure(pathHoriz(by, slope), 260, { th, intensity: 0.3 + r() * 0.45, col: pal.band, ripple: 0.9 + r() * 0.6, vp: vparams(W), cast: 0.5, hotCore: false });
      }
    } else if (mode === 'Aurora Drift') {
      const n = 3 + (r() * 2 | 0);
      const slope = (r() - 0.5) * 0.12;       // the whole drift is tilted
      for (let i = 0; i < n; i++) {
        const by = H * (0.2 + i * (0.16 + r() * 0.06) + r() * 0.04);
        const th = minWH * (0.026 + r() * 0.03) * (grail ? 1.12 : 1);
        structure(pathHoriz(by, slope), 240, { th, intensity: 0.5 + r() * 0.35, col: pal.band, ripple: 1.1 + r() * 0.7, vp: vparams(W), cast: 1.0 });
      }
    } else if (mode === 'Draped Sheet') {
      // long sagging sheets hung at different heights, slack catenary curves
      const n = 2 + (r() * 3 | 0);
      const slope = (r() - 0.5) * 0.05;
      for (let i = 0; i < n; i++) {
        const by = H * (0.18 + i * (0.18 + r() * 0.08) + r() * 0.05);
        const sag = H * (0.06 + r() * 0.18) * (r() < 0.5 ? 1 : -1);  // some sag up (billow)
        const th = minWH * (0.014 + r() * 0.026);
        structure(pathDrape(by, sag, slope), 240, { th, intensity: 0.45 + r() * 0.4, col: pal.band, ripple: 0.6 + r() * 0.5, vp: vparams(W), cast: 1.0 });
      }
    } else if (mode === 'Arc Curtain') {
      // radial-arc curtains: concentric arcs bowing across the frame from a focus
      // placed beyond one edge (top/bottom). The arcs sweep the full width.
      const below = r() < 0.5;                  // focus below (arcs bow up) or above
      const fx = W * (0.35 + r() * 0.3);         // focus roughly horizontally centered
      // CLOSER focus → visible bow. distance ~0.45–0.85 of H past the edge.
      const fdist = H * (0.45 + r() * 0.4);
      const fy = below ? H + fdist : -fdist;
      // smallest radius reaches well into the frame so the bow shows
      const baseR = fdist + H * (0.2 + r() * 0.25);
      const n = 3 + (r() * 4 | 0);
      // angular half-span that covers the frame width at this radius
      const half = Math.atan2(W * (0.6 + r() * 0.14), baseR) + 0.04;
      const aCenter = below ? -Math.PI / 2 : Math.PI / 2;   // toward the frame
      const tilt = (r() - 0.5) * 0.45;                      // whole curtain leans
      for (let i = 0; i < n; i++) {
        const rad = baseR + i * minWH * (0.05 + r() * 0.06) + r() * minWH * 0.02;
        const a0 = aCenter - half + tilt, a1 = aCenter + half + tilt;
        const th = minWH * (0.011 + r() * 0.02);
        structure(pathArc(fx, fy, rad, a0 + (r() - 0.5) * 0.04, a1 + (r() - 0.5) * 0.04), 250,
          { th, intensity: 0.46 + r() * 0.42, col: pal.band, ripple: 0.55 + r() * 0.45, vp: vparams(rad * (a1 - a0)), cast: 0.9 });
      }
    } else if (mode === 'Aurora Columns') {
      // vertical luminous columns raining down from an upper band — curtain rays.
      // a faint horizontal crown band ties the tops together (aurora base).
      const crownY = H * (0.16 + r() * 0.16);
      structure(pathHoriz(crownY, (r() - 0.5) * 0.04), 220,
        { th: minWH * 0.012, intensity: 0.35 + r() * 0.25, col: pal.band, ripple: 0.6 + r() * 0.4, vp: vparams(W), cast: 0.3, hotCore: false });
      const n = 7 + (r() * 9 | 0);
      const y1max = H * (0.6 + r() * 0.3);
      for (let i = 0; i < n; i++) {
        const cx0 = W * (0.06 + (i / (n - 1 || 1)) * 0.88 + (r() - 0.5) * 0.04);
        const y0 = crownY + (r() - 0.5) * H * 0.03;
        const y1 = crownY + (y1max - crownY) * (0.5 + r() * 0.5);
        const th = minWH * (0.007 + r() * 0.013);
        const sway = minWH * (0.01 + r() * 0.03);
        structure(pathColumn(cx0, y0, y1, sway), 180,
          { th, intensity: 0.45 + r() * 0.45, col: pal.band, ripple: 0.5 + r() * 0.5, vp: vparams(y1 - y0), cast: 0.35 });
      }
    } else if (mode === 'Broken Ribbon') {
      // feathered ribbons torn into drifting fragments at varied angles/heights.
      const n = 4 + (r() * 4 | 0);
      for (let i = 0; i < n; i++) {
        const by = H * (0.12 + r() * 0.74);
        const slope = (r() - 0.5) * 0.18;       // strong individual tilt per ribbon
        const th = minWH * (0.01 + r() * 0.02);
        // high gap → very torn / fragmentary
        const vp = vparams(W); vp.gap = 0.22 + r() * 0.3;
        structure(pathHoriz(by, slope), 220, { th, intensity: 0.45 + r() * 0.45, col: pal.band, ripple: 1.2 + r() * 0.9, vp, cast: 0.7 });
      }
    } else if (mode === 'Strata Split') {
      // one dense bright low band vs a field of high thin filaments (scale contrast)
      const lowY = H * (0.66 + r() * 0.14);
      structure(pathHoriz(lowY, (r() - 0.5) * 0.04), 260,
        { th: minWH * (0.026 + r() * 0.026), intensity: 0.55 + r() * 0.3, col: pal.band, ripple: 0.7 + r() * 0.5, vp: vparams(W), cast: 1.1 });
      const n = 6 + (r() * 6 | 0);
      const top = H * (0.1 + r() * 0.12);
      const spread = H * (0.32 + r() * 0.12);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1 || 1);
        const by = top + t * spread;
        structure(pathHoriz(by, (r() - 0.5) * 0.05), 240,
          { th: minWH * (0.004 + r() * 0.006), intensity: 0.25 + r() * 0.3, col: pal.band, ripple: 1.0 + r() * 0.7, vp: vparams(W), cast: 0.2, hotCore: false });
      }
    } else { // Deep Calm
      const n = 1 + (r() < 0.5 ? 1 : 0);
      for (let i = 0; i < n; i++) {
        const by = H * (0.34 + i * 0.2 + r() * 0.12);
        const th = minWH * (0.035 + r() * 0.04);
        const sag = (r() < 0.4) ? H * (0.04 + r() * 0.08) : 0;  // sometimes a slow drape
        const p = sag ? pathDrape(by, sag, 0) : pathHoriz(by, (r() - 0.5) * 0.03);
        structure(p, 230, { th, intensity: 0.45 + r() * 0.3, col: pal.band, ripple: 0.7 + r() * 0.5, vp: vparams(W), cast: 1.0 });
      }
    }

    // ── GRAIL FLARE: a restrained cold flare event on grail seeds (not a white-out) ──
    if (grail) {
      const fy = H * (0.3 + r() * 0.4);
      const fx = W * (0.3 + r() * 0.4);
      K.bloom(x, fx, fy, minWH * (0.28 + r() * 0.18), K.mix(pal.band, pal.mid, 0.35), 0.07 + r() * 0.03);
      K.bloom(x, fx, fy, minWH * (0.09 + r() * 0.06), K.mix(pal.hot, pal.band, 0.5), 0.09);
    }

    // ── a scatter of faint cold "stars" in the deep field (very sparse, subtle) ──
    const stars = 30 + (r() * 50 | 0);
    x.save(); x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < stars; i++) {
      const sx = r() * W, sy = r() * H;
      const sa = 0.04 + r() * 0.12;
      const sr = r() < 0.92 ? 0.6 : 1.2;
      x.fillStyle = K.rgba(K.mix(pal.band, '#ffffff', 0.4), sa);
      x.beginPath(); x.arc(sx, sy, sr, 0, 7); x.fill();
    }
    x.restore();

    // ── ATMOSPHERE & TEXTURE (without bleaching) ──
    const hazeCol = K.mix(pal.mid, pal.band, 0.25);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.12, minWH * 1.1, 'screen');
    K.mottle(x, 0, 0, W, H, pal.mid, 60, r, 'overlay');
    K.grain(x, W, H, 5.5, r);
    K.vignette(x, W, H, 0.5);
    // a final multiply pass at top & bottom to re-deepen the darks the haze lifted
    const dk = x.createLinearGradient(0, 0, 0, H);
    dk.addColorStop(0, K.rgba(pal.deep, 0.5));
    dk.addColorStop(0.5, 'rgba(0,0,0,0)');
    dk.addColorStop(1, K.rgba(pal.deep, 0.55));
    x.save(); x.globalCompositeOperation = 'multiply';
    x.fillStyle = dk; x.fillRect(0, 0, W, H); x.restore();

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    // mirror draw()'s rng order: pickPal consumes the rare-roll then K.pick
    let pal;
    if (undefined) {
      pal = PALS.find((p) => p.name === undefined) || PALS[0];
    } else {
      pal = (r() < 0.12) ? PALS[6] : K.pick(PALS.slice(0, 6), r);
    }
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    // grail flag: rare palette OR the extra grail roll (mirror draw())
    const isGrail = pal.rare || r() < 0.1;
    return { Palette: pal.name, Mode: mode, Format: f, Rarity: isGrail ? 'Grail' : 'Standard' };
  }

  return { name: 'h3_noctilucent', draw, traits };
})();


export const noctilucentTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderNoctilucent: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const NOCTILUCENT_ASPECTS: readonly number[] = [0.8,1,1.3];
export const noctilucentSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Glacier Drift",
        "Ashen Aurora",
        "Abyss Bloom",
        "Indigo Veil",
        "Noctilucent",
        "Polar Steel",
        "Ion Storm"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Aurora Drift",
        "Broken Ribbon",
        "Arc Curtain",
        "Deep Calm",
        "Draped Sheet",
        "Aurora Columns",
        "Stratus",
        "Strata Split",
        "Ripple Veil"
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
      "name": "Rarity",
      "values": [
        "Standard",
        "Grail"
      ]
    }
  ]
};
