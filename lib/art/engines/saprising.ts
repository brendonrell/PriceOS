// @ts-nocheck
/*
 * SapRising — PriceOS art engine (by opus4-8). Abstract generative system,
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


/* IMPASTO — palette-knife colour-field abstraction (h3_impasto).
 * Thick paint laid, dragged, troweled, stacked and scraped in broad knife-work;
 * ridged impasto edges catch a low raking light and cast REAL shadows — as if
 * the paint stands inches off the canvas in a space that has no business holding
 * it. Built-up slabs, cross-scraped sgraffito, troweled wedges, loaded ridges,
 * thin scumbled veils, and one heavy gestural pull all share the same knife.
 *
 * MANDATED GRADE: MID-KEY, COOL-GREEN dominant, MEDIUM saturation.
 * Sage/green-grey is the HERO and the paint reads as SOLID GREEN body, not a
 * pale veil; muted amber breaks; dark wet-stone scrape-lines. Reads distinctly
 * GREEN across the room. NOT pale, NOT a beige fog, NOT a mint wash.
 *
 * Pure form/field/material — NO objects, NO scene, NO creature.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Seven bespoke palettes — ALL within the Conservatory Fog anchors:
     #7E8C76 sage (HERO) · #AEB9A6 pale green-grey · #C99A4E amber break ·
     #33382F dark wet-stone. Each is a different WEATHER of the same green
     world — mid-key, medium saturation, never drifting to pale neutral.
       ground = canvas/linen tone (kept low so darks stay deep)
       layers = under-layers revealed by scrape-throughs
       knife  = the broad knife-stroke field colours (sage hero leads)
       amber  = the muted warm break
       stone  = dark wet-stone scrape-lines / deepest value
       lit    = ridge-catch highlight (a hair brighter sage, never white) */
  const PALS = [
    { name: 'Conservatory Fog',
      ground: '#46503F', layers: ['#5A6650', '#3C4436', '#6E7C66'],
      knife: ['#7E8C76', '#8C9A82', '#6B7A62', '#AEB9A6'],
      amber: '#C99A4E', stone: '#2A2E25', lit: '#A6B49A', rare: false },
    { name: 'Glasshouse Damp',
      ground: '#3E4A3C', layers: ['#4E5A48', '#333B30', '#5E6E58'],
      knife: ['#6F8068', '#7E8C76', '#5C6E54', '#9AA890'],
      amber: '#BE8C42', stone: '#23271F', lit: '#9CAE8E', rare: false },
    { name: 'Verdigris Noon',
      ground: '#4E5A46', layers: ['#62705A', '#404A3A', '#7C8C72'],
      knife: ['#88967E', '#7E8C76', '#9CAA90', '#AEB9A6'],
      amber: '#D2A656', stone: '#2E342A', lit: '#B6C2AA', rare: false },
    { name: 'Moss Cellar',
      ground: '#39432F', layers: ['#48543C', '#2C3326', '#56644A'],
      knife: ['#647254', '#74826A', '#566448', '#86927A'],
      amber: '#B0823A', stone: '#1E2118', lit: '#90A07E', rare: false },
    { name: 'Sage Sirocco',
      ground: '#525A48', layers: ['#66705A', '#444C3A', '#7E8A6E'],
      knife: ['#7E8C76', '#92A084', '#6E7C64', '#AEB9A6'],
      amber: '#D8A85A', stone: '#33382F', lit: '#BEC8B0', rare: false },
    { name: 'Fern Ash',
      ground: '#424A3A', layers: ['#525E48', '#373F30', '#646E58'],
      knife: ['#76846C', '#828F78', '#64725A', '#9EAA94'],
      amber: '#C2924A', stone: '#272B22', lit: '#A2AE96', rare: false },
    /* RARE grail palette — the same world after a copper-oxide spill: a hotter
       amber surge cutting hard through deep sage, raised contrast. */
    { name: 'Oxide Bloom',
      ground: '#3A4232', layers: ['#5A5238', '#2E342A', '#6E5A30'],
      knife: ['#7E8C76', '#6B7A62', '#9AA890', '#8C9A82'],
      amber: '#E0A444', stone: '#1C201A', lit: '#C2B07A', rare: true },
  ];

  /* 10 structurally distinct composition modes.
     Originals (reworked, denser): Drag Field, Scrape Terrace, Stack Ridge,
       Wet Pull, Spackle, Rift.
     NEW: Slab Build (built-up impasto blocks), Sgraffito (cross-scraped grid),
       Trowel Wedge (troweled fan of wedges), Gesture (one heavy gestural pull
       over a worked ground). */
  const MODES = ['Drag Field', 'Scrape Terrace', 'Stack Ridge', 'Wet Pull',
    'Spackle', 'Rift', 'Slab Build', 'Sgraffito', 'Trowel Wedge', 'Gesture'];
  const FORMATS = [[1040, 1280], [1180, 1180], [1280, 1040]]; // portrait / square / landscape

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    // grail roll: ~1-in-12 lands the rare Oxide Bloom
    if (r() < 0.085) return PALS[PALS.length - 1];
    return K.pick(PALS.slice(0, PALS.length - 1), r);
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
    const S = Math.min(W, H);

    // global raking-light direction (low, from upper-left-ish) — every ridge's
    // catch and cast shadow obey this so the whole surface reads lit by one sun.
    const lightAng = -Math.PI * (0.62 + r() * 0.22); // up & to the left
    const Lx = Math.cos(lightAng), Ly = Math.sin(lightAng);
    // GREEN-KEYED highlight: the ridge catch leans toward the sage hero, never
    // white — this is what keeps the paint reading as GREEN BODY, not pale mint.
    // We pull every stroke's lit toward this so highlights stay in the green key.
    const litKey = K.mix(pal.lit, pal.knife[0], 0.62);
    // BODY picker: pull every knife colour toward the mid-deep field so no stroke
    // ever starts near-white. Light knife tones (#AEB9A6 etc) bleach when stacked;
    // mixing each toward a mid layer keeps the whole field MID-KEY and GREEN.
    function bodyOf() {
      const c = K.pick(pal.knife, r);
      // the lighter the picked tone, the more we deepen it toward the field
      const L = K.lum(c);
      const deepen = L > 0.5 ? 0.34 : L > 0.42 ? 0.22 : 0.12;
      return K.mix(c, K.mix(pal.knife[2], pal.layers[1], 0.4), deepen);
    }
    // a deeper variant for the wide-sheet modes (Wet Pull / Rift) whose broad
    // overlapping strokes otherwise climb to the top of the value range — keeps
    // the whole edition's value spread tight and unmistakably green.
    function deepBodyOf() {
      return K.mix(bodyOf(), K.mix(pal.knife[2], pal.stone, 0.3), 0.28);
    }

    // ── LINEN GROUND (under-painting, kept deep so darks stay deep) ──
    {
      const g = x.createLinearGradient(0, 0, W * 0.3, H);
      g.addColorStop(0, K.mix(pal.ground, '#fff', 0.04));
      g.addColorStop(0.5, pal.ground);
      g.addColorStop(1, K.mix(pal.ground, pal.stone, 0.45));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }
    // buried under-layers as broad SOFT washes (revealed later by scrapes) —
    // feathered radial pools, not hard rectangles, so they read as wet paint.
    for (let i = 0; i < 8; i++) {
      const c = K.pick(pal.layers, r);
      const bx = r() * W, by = r() * H, br = S * (0.3 + r() * 0.45);
      const g2 = x.createRadialGradient(bx, by, 0, bx, by, br);
      g2.addColorStop(0, K.rgba(c, 0.55 + r() * 0.28));
      g2.addColorStop(0.6, K.rgba(c, 0.26));
      g2.addColorStop(1, K.rgba(c, 0));
      x.save(); x.fillStyle = g2; x.fillRect(0, 0, W, H); x.restore();
    }
    // linen weave: faint directional canvas tooth
    x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.06;
    x.strokeStyle = K.rgba(pal.stone, 1); x.lineWidth = 1;
    for (let y = 0; y < H; y += 3) { x.beginPath(); x.moveTo(0, y); x.lineTo(W, y); x.stroke(); }
    x.restore();

    // ─────────────────────────────────────────────────────────────────────────
    //  KNIFE TECHNIQUE TOOLKIT
    //  Every primitive shares one light direction (Lx,Ly) so ridges, slabs and
    //  wedges all catch and cast consistently. Paint bodies are kept SATURATED
    //  and MID-KEY (the body colour itself, only mildly mixed) so the field
    //  reads as solid green, not a pale veil.
    // ─────────────────────────────────────────────────────────────────────────

    // cast shadow helper: a soft offset blob/band in the light's opposite dir.
    function castBand(pts, depth, alpha) {
      const ox = -Lx * depth, oy = -Ly * depth;
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(pal.stone, alpha);
      x.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        if (i === 0) x.moveTo(p[0] + ox, p[1] + oy); else x.lineTo(p[0] + ox, p[1] + oy);
      }
      x.closePath(); x.fill();
      x.restore();
    }

    /* ── KNIFE STROKE (the dragged blade — reworked: deeper body, controlled
       lit so it never bleaches to mint) ──
       A broad band of paint dragged by a palette knife: a saturated body, a
       ridged lit edge that catches the raking light, a parallel cast shadow,
       and along the drag, scrape-throughs to an under-layer. */
    function knifeStroke(cx, cy, ang, len, wid, body, opts) {
      opts = opts || {};
      const lit = opts.lit || litKey;
      const depth = opts.depth == null ? wid * (0.10 + r() * 0.14) : opts.depth;
      const drift = opts.drift == null ? wid * 0.5 : opts.drift;
      const litAmt = opts.litAmt == null ? 0.45 : opts.litAmt; // how strong the catch is
      const dx = Math.cos(ang), dy = Math.sin(ang);   // along-stroke
      const nx = -dy, ny = dx;                         // across-stroke (ridge normal)
      const steps = Math.max(24, Math.floor(len / 5));
      const wob = (r() - 0.5) * 0.4;                   // gentle curve to the drag
      // which across side faces the light? sign of (n · L); that side gets the
      // catch, the other gets shading — so light is consistent across strokes.
      const litSide = (nx * Lx + ny * Ly) >= 0 ? -1 : 1;

      // cast shadow of the ridge (paint stands off the canvas)
      const shA = opts.castShadow == null ? 0.12 + r() * 0.06 : opts.castShadow;
      x.save();
      x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(pal.stone, shA);
      const so = depth * (1.6 + r() * 1.0), sd = wid * 0.5;
      x.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, al = (t - 0.5) * len;
        const curve = Math.sin(t * Math.PI) * drift * wob;
        const px = cx + dx * al + nx * curve + nx * sd - Lx * so;
        const py = cy + dy * al + ny * curve + ny * sd - Ly * so;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      for (let i = steps; i >= 0; i--) {
        const t = i / steps, al = (t - 0.5) * len;
        const curve = Math.sin(t * Math.PI) * drift * wob;
        const px = cx + dx * al + nx * curve - nx * sd - Lx * so;
        const py = cy + dy * al + ny * curve - ny * sd - Ly * so;
        x.lineTo(px, py);
      }
      x.closePath(); x.fill();
      x.restore();

      // the paint body: overlapping across-stroke ribs = thick buildup.
      const ribs = Math.floor(wid / 2.0);
      const tIn = 0.03 + r() * 0.07, tOut = 0.03 + r() * 0.08;
      for (let rb = -ribs; rb <= ribs; rb++) {
        const off = (rb / ribs) * (wid * 0.5);
        const edge = Math.abs(rb / ribs);
        const onLit = (off * litSide) < 0; // this rib is on the up-light side
        // colour: body stays SATURATED in the middle; only the extreme lit edge
        // brightens (controlled), the trailing edge deepens toward stone.
        let c = body;
        if (edge > 0.82) {
          c = onLit ? K.mix(body, lit, (edge - 0.82) / 0.18 * litAmt)
                    : K.mix(body, pal.stone, (edge - 0.82) / 0.18 * 0.9);
        } else {
          // very mild shading across the body so it reads rounded but stays green
          c = onLit ? K.mix(body, lit, edge * 0.1)
                    : K.mix(body, K.mix(body, pal.stone, 0.5), edge * 0.24);
        }
        // outer ribs go translucent → feathered side edges (no hard plank wall)
        const edgeFade = edge > 0.86 ? 1 - (edge - 0.86) / 0.14 : 1;
        x.save();
        // higher floor opacity → solid, dense body (was bleaching before)
        x.globalAlpha = (0.7 + 0.28 * (1 - edge)) * Math.max(0.14, edgeFade);
        x.strokeStyle = c;
        x.lineWidth = (wid / ribs) * 2.2;
        x.lineCap = 'round';
        x.beginPath();
        let pen = false;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps, al = (t - 0.5) * len;
          const endT = Math.min(t / tIn, (1 - t) / tOut, 1);
          if (endT <= 0 && edge > 0.5) { pen = false; continue; }
          const ribWid = wid * 0.5 * Math.min(1, endT + (1 - edge) * 0.6);
          if (Math.abs(off) > ribWid + (wid / ribs)) { pen = false; continue; }
          const curve = Math.sin(t * Math.PI) * drift * wob;
          const j = (noise.noise2(t * 6 + rb * 0.3, off * 0.02 + cx * 0.001)) * depth * 0.5;
          const px = cx + dx * al + nx * (off + curve) + nx * j;
          const py = cy + dy * al + ny * (off + curve) + ny * j;
          if (!pen) { x.moveTo(px, py); pen = true; } else x.lineTo(px, py);
        }
        x.stroke();
        x.restore();
      }

      // bright catch along the LIT ridge only (specular line where knife lifted).
      // Kept low + green-keyed so it reads as a paint ridge catching light, not
      // a white rim. 'lighter' over a green lit stays in the green key.
      x.save();
      x.globalCompositeOperation = 'screen';
      x.strokeStyle = K.rgba(K.mix(lit, body, 0.5), 0.2 * litAmt + 0.06);
      x.lineWidth = Math.max(1.2, wid * 0.045);
      x.beginPath();
      const lo = litSide * wid * 0.42;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, al = (t - 0.5) * len;
        const curve = Math.sin(t * Math.PI) * drift * wob;
        const fade = Math.sin(t * Math.PI);
        if (fade < 0.25) continue;
        const px = cx + dx * al + nx * (lo + curve);
        const py = cy + dy * al + ny * (lo + curve);
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.stroke();
      x.restore();

      // scrape-throughs: short gouges revealing an under-layer
      const nScr = opts.scrapes == null ? K.rint(r, 0, 3) : opts.scrapes;
      for (let s = 0; s < nScr; s++) {
        const tt = 0.15 + r() * 0.7;
        const al = (tt - 0.5) * len;
        const sc = K.pick(pal.layers, r);
        const sl = wid * (0.5 + r() * 1.2), sw = wid * (0.08 + r() * 0.14);
        x.save();
        x.globalAlpha = 0.85;
        x.strokeStyle = sc;
        x.lineWidth = sw;
        x.lineCap = 'butt';
        const goff = (r() - 0.5) * wid * 0.6;
        x.beginPath();
        x.moveTo(cx + dx * (al - sl / 2) + nx * goff, cy + dy * (al - sl / 2) + ny * goff);
        x.lineTo(cx + dx * (al + sl / 2) + nx * goff, cy + dy * (al + sl / 2) + ny * goff);
        x.stroke();
        x.strokeStyle = K.rgba(pal.stone, 0.5); x.lineWidth = Math.max(1, sw * 0.3);
        x.beginPath();
        x.moveTo(cx + dx * (al - sl / 2) + nx * (goff + sw * 0.6), cy + dy * (al - sl / 2) + ny * (goff + sw * 0.6));
        x.lineTo(cx + dx * (al + sl / 2) + nx * (goff + sw * 0.6), cy + dy * (al + sl / 2) + ny * (goff + sw * 0.6));
        x.stroke();
        x.restore();
      }
    }

    /* ── SLAB: a built-up rectangular block of impasto laid flat with the knife.
       Thick body, a bright top/lit edge, a deep cast shadow on the dark side,
       streaky knife-loading across the face. Reads as a STANDING block of paint
       (the core of the new "built-up slab impasto" vocabulary). */
    function slab(cx, cy, ang, w, h, body, opts) {
      opts = opts || {};
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      const depth = opts.depth == null ? Math.min(w, h) * 0.16 : opts.depth;
      const lit = opts.lit || litKey;
      const corner = (sx, sy) => [cx + dx * sx * w * 0.5 + nx * sy * h * 0.5,
                                  cy + dy * sx * w * 0.5 + ny * sy * h * 0.5];
      const TL = corner(-1, -1), TR = corner(1, -1), BR = corner(1, 1), BL = corner(-1, 1);
      // cast shadow (whole slab footprint, offset away from light)
      castBand([TL, TR, BR, BL], depth * 1.7, 0.2 + r() * 0.08);
      // body fill — base then streaky knife loading
      x.save();
      x.fillStyle = body;
      x.beginPath(); x.moveTo(TL[0], TL[1]); x.lineTo(TR[0], TR[1]);
      x.lineTo(BR[0], BR[1]); x.lineTo(BL[0], BL[1]); x.closePath(); x.fill();
      x.restore();
      // streaky loading across the face: ribs of slightly varied body colour
      const ribs = Math.max(5, Math.floor(h / 6));
      for (let i = 0; i <= ribs; i++) {
        const sy = (i / ribs) * 2 - 1;
        const a = corner(-1, sy), b = corner(1, sy);
        const tone = (noise.noise2(i * 0.5, cx * 0.001) * 0.5);
        const c = tone > 0 ? K.mix(body, lit, tone * 0.3) : K.mix(body, pal.stone, -tone * 0.34);
        x.save();
        x.globalAlpha = 0.5;
        x.strokeStyle = c; x.lineWidth = (h / ribs) * 1.3; x.lineCap = 'butt';
        // slight knife wobble along the face
        x.beginPath();
        const seg = 8;
        for (let s = 0; s <= seg; s++) {
          const t = s / seg;
          const px = a[0] + (b[0] - a[0]) * t + nx * noise.noise2(t * 4 + i, sy) * depth * 0.3;
          const py = a[1] + (b[1] - a[1]) * t + ny * noise.noise2(t * 4 + i, sy) * depth * 0.3;
          if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.stroke();
        x.restore();
      }
      // lit top edge (the raised lip catching light) — the side facing the light
      const litSign = ((nx * Lx + ny * Ly) >= 0) ? -1 : 1;
      const e0 = corner(-1, litSign), e1 = corner(1, litSign);
      x.save(); x.globalCompositeOperation = 'screen';
      x.strokeStyle = K.rgba(K.mix(lit, body, 0.3), 0.4); x.lineWidth = Math.max(1.5, depth * 0.5); x.lineCap = 'round';
      x.beginPath(); x.moveTo(e0[0], e0[1]); x.lineTo(e1[0], e1[1]); x.stroke();
      x.restore();
      // dark trailing edge
      const d0 = corner(-1, -litSign), d1 = corner(1, -litSign);
      x.save(); x.globalCompositeOperation = 'multiply';
      x.strokeStyle = K.rgba(pal.stone, 0.5); x.lineWidth = Math.max(1.5, depth * 0.4);
      x.beginPath(); x.moveTo(d0[0], d0[1]); x.lineTo(d1[0], d1[1]); x.stroke();
      x.restore();
      // occasional scrape-through revealing under-layer
      if ((opts.scrape == null ? r() < 0.5 : opts.scrape)) {
        const sc = K.pick(pal.layers, r);
        const t0 = -0.6 + r() * 0.4, t1 = t0 + 0.5 + r() * 0.6;
        const a = corner(t0, -0.5 + r()), b = corner(t1, -0.5 + r());
        x.save(); x.globalAlpha = 0.8; x.strokeStyle = sc;
        x.lineWidth = Math.min(w, h) * (0.06 + r() * 0.08); x.lineCap = 'round';
        x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke(); x.restore();
      }
    }

    /* ── WEDGE: a troweled triangular dab — thick at the loaded edge, tapering
       to nothing as the knife lifts. The unit of the Trowel Wedge fan. */
    function wedge(cx, cy, ang, len, baseW, body, opts) {
      opts = opts || {};
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      const lit = opts.lit || litKey;
      const depth = baseW * 0.22;
      const tip = [cx + dx * len, cy + dy * len];
      const b0 = [cx - nx * baseW * 0.5, cy - ny * baseW * 0.5];
      const b1 = [cx + nx * baseW * 0.5, cy + ny * baseW * 0.5];
      castBand([b0, b1, tip], depth * 1.6, 0.16 + r() * 0.06);
      // body — gradient from loaded base (full body) to thin tip
      const g = x.createLinearGradient(cx, cy, tip[0], tip[1]);
      g.addColorStop(0, body);
      g.addColorStop(0.7, K.mix(body, pal.layers[0], 0.25));
      g.addColorStop(1, K.rgba(body, 0.25));
      x.save(); x.fillStyle = g;
      x.beginPath(); x.moveTo(b0[0], b0[1]); x.lineTo(b1[0], b1[1]); x.lineTo(tip[0], tip[1]);
      x.closePath(); x.fill(); x.restore();
      // lit catch along the up-light flank
      const litSign = ((nx * Lx + ny * Ly) >= 0) ? -1 : 1;
      const bSide = litSign < 0 ? b0 : b1;
      x.save(); x.globalCompositeOperation = 'screen';
      x.strokeStyle = K.rgba(lit, 0.5); x.lineWidth = Math.max(1.2, depth * 0.4); x.lineCap = 'round';
      x.beginPath(); x.moveTo(bSide[0], bSide[1]); x.lineTo(tip[0], tip[1]); x.stroke(); x.restore();
      // loaded base lip (bright ridge of squeezed paint)
      x.save(); x.globalCompositeOperation = 'screen';
      x.strokeStyle = K.rgba(lit, 0.4); x.lineWidth = Math.max(1.5, depth * 0.6);
      x.beginPath(); x.moveTo(b0[0], b0[1]); x.lineTo(b1[0], b1[1]); x.stroke(); x.restore();
    }

    // a dark wet-stone scrape-line: a hard dragged channel of the deepest value
    function stoneLine(cx, cy, ang, len, wid) {
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      const steps = Math.max(20, Math.floor(len / 6));
      x.save(); x.globalCompositeOperation = 'multiply';
      x.strokeStyle = K.rgba(pal.stone, 0.5); x.lineWidth = wid * 1.6; x.lineCap = 'round';
      x.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, al = (t - 0.5) * len;
        x.lineTo(cx + dx * al - Lx * wid * 0.4, cy + dy * al - Ly * wid * 0.4);
      }
      x.stroke(); x.restore();
      x.save();
      x.strokeStyle = pal.stone; x.lineWidth = wid; x.lineCap = 'round';
      x.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, al = (t - 0.5) * len;
        const j = noise.noise2(t * 5, cy * 0.002) * wid * 0.25;
        x.lineTo(cx + dx * al + nx * j, cy + dy * al + ny * j);
      }
      x.stroke();
      // lit lip on the light side
      const litSign = ((nx * Lx + ny * Ly) >= 0) ? -1 : 1;
      x.globalCompositeOperation = 'screen';
      x.strokeStyle = K.rgba(pal.lit, 0.32); x.lineWidth = Math.max(1, wid * 0.12);
      x.beginPath();
      for (let i = 0; i <= steps; i++) {
        const t = i / steps, al = (t - 0.5) * len;
        x.lineTo(cx + dx * al + nx * (litSign * wid * 0.45), cy + dy * al + ny * (litSign * wid * 0.45));
      }
      x.stroke(); x.restore();
    }

    /* ── SGRAFFITO: comb a set of parallel scrape grooves through wet paint to
       reveal the under-layer in fine lines. The signature of cross-scrape. */
    function sgraffito(cx, cy, ang, fieldW, fieldL, count) {
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      for (let i = 0; i < count; i++) {
        const off = ((i / (count - 1)) - 0.5) * fieldW + (r() - 0.5) * fieldW * 0.03;
        const c = K.pick(pal.layers, r);
        const w = fieldW / count * (0.18 + r() * 0.22);
        // groove (under-layer) + a thin bright lip = combed paint
        x.save();
        x.globalAlpha = 0.85; x.strokeStyle = c; x.lineWidth = w; x.lineCap = 'round';
        x.beginPath();
        const steps = 18;
        for (let s = 0; s <= steps; s++) {
          const t = s / steps, al = (t - 0.5) * fieldL;
          const j = noise.noise2(t * 4 + i, off * 0.01) * w * 0.6;
          x.lineTo(cx + dx * al + nx * (off + j), cy + dy * al + ny * (off + j));
        }
        x.stroke();
        x.globalCompositeOperation = 'screen';
        x.strokeStyle = K.rgba(pal.lit, 0.22); x.lineWidth = Math.max(1, w * 0.4);
        x.beginPath();
        for (let s = 0; s <= steps; s++) {
          const t = s / steps, al = (t - 0.5) * fieldL;
          x.lineTo(cx + dx * al + nx * (off - w * 0.6), cy + dy * al + ny * (off - w * 0.6));
        }
        x.stroke();
        x.restore();
      }
    }

    // a broad worked field of paint laid down as overlapping wide strokes — the
    // "fill the canvas with paint" base several modes sit on, so no dead canvas.
    function paintField(x0, y0, fw, fh, ang, dens) {
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      const n = dens || K.rint(r, 6, 9);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const cx = x0 + nx * (t - 0.5) * fh + dx * (r() - 0.5) * fw * 0.1;
        const cy = y0 + ny * (t - 0.5) * fh + dy * (r() - 0.5) * fw * 0.1;
        knifeStroke(cx, cy, ang + (r() - 0.5) * 0.1, fw * (0.9 + r() * 0.3),
          (fh / n) * (1.5 + r() * 0.6), bodyOf(),
          { scrapes: K.rint(r, 0, 2), litAmt: 0.4, depth: (fh / n) * 0.3 });
      }
    }

    // an amber break: a short hot stroke that interrupts the green field
    function amberBreak(cx, cy, ang, len, wid) {
      knifeStroke(cx, cy, ang, len, wid, pal.amber,
        { lit: K.mix(pal.amber, '#fff', 0.35), scrapes: K.rint(r, 0, 1),
          depth: wid * 0.16, litAmt: 0.6 });
    }

    // ── COMPOSE per mode ──
    const focusX = W * (0.30 + r() * 0.40);
    const focusY = H * (0.32 + r() * 0.36);

    // a deep painted bed under EVERY composition so no murky canvas shows and
    // the picture reads as solid worked paint corner to corner.
    {
      const bedAng = (r() - 0.5) * 0.5;
      const dx = Math.cos(bedAng), dy = Math.sin(bedAng), nx = -dy, ny = dx;
      const n = K.rint(r, 5, 7);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const cx = W * 0.5 + nx * (t - 0.5) * H * 1.2;
        const cy = H * 0.5 + ny * (t - 0.5) * H * 1.2;
        knifeStroke(cx, cy, bedAng, W * 1.5, H / n * 2.0,
          K.mix(K.pick(pal.knife, r), pal.layers[1], 0.45),
          { scrapes: 0, litAmt: 0.16, depth: H / n * 0.2, castShadow: 0.04 });
      }
    }

    if (mode === 'Drag Field') {
      // long parallel horizontal-ish drags, dense band over a worked field
      const baseAng = (r() - 0.5) * 0.35;
      const n = K.rint(r, 9, 13);
      const bandY0 = H * (0.14 + r() * 0.16), bandY1 = bandY0 + H * (0.5 + r() * 0.22);
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const cy = bandY0 + (bandY1 - bandY0) * t + (r() - 0.5) * H * 0.04;
        const cx = W * (0.5 + (r() - 0.5) * 0.16);
        const len = W * (0.8 + r() * 0.35), wid = S * (0.06 + r() * 0.055);
        knifeStroke(cx, cy, baseAng + (r() - 0.5) * 0.1, len, wid, bodyOf(),
          { scrapes: K.rint(r, 0, 2), litAmt: 0.5 });
      }
      amberBreak(W * (0.2 + r() * 0.6), bandY0 + (bandY1 - bandY0) * r(),
        baseAng, W * (0.3 + r() * 0.2), S * 0.05);
      stoneLine(W * (0.1 + r() * 0.7), bandY1 - H * 0.04, baseAng + (r() - 0.5) * 0.1,
        W * (0.5 + r() * 0.3), S * 0.018);

    } else if (mode === 'Scrape Terrace') {
      // stacked horizontal terraces, each scraped flat, amber seam between two
      const n = K.rint(r, 6, 9);
      let y = H * 0.06;
      for (let i = 0; i < n; i++) {
        const h = H * (0.8 / n) * (0.8 + r() * 0.6);
        const c = bodyOf();
        knifeStroke(W * (0.5 + (r() - 0.5) * 0.1), y + h / 2, (r() - 0.5) * 0.06,
          W * (0.9 + r() * 0.2), h * (1.7 + r() * 0.5), c,
          { scrapes: K.rint(r, 1, 3), drift: h, litAmt: 0.45 });
        if (r() < 0.5) stoneLine(W * 0.5, y, (r() - 0.5) * 0.05, W * (0.7 + r() * 0.2), S * 0.012);
        y += h * (0.95 + r() * 0.35);
      }
      amberBreak(W * (0.3 + r() * 0.4), H * (0.3 + r() * 0.4), (r() - 0.5) * 0.1,
        W * (0.4 + r() * 0.2), S * 0.05);

    } else if (mode === 'Stack Ridge') {
      // a tight asymmetric cluster of crossed knife ridges OVERLAPPING into one
      // built-up focal mass — wide strokes that touch, not isolated slats.
      const n = K.rint(r, 12, 17);
      for (let i = 0; i < n; i++) {
        const ang = r() < 0.5 ? (r() - 0.5) * 0.5 : Math.PI / 2 + (r() - 0.5) * 0.5;
        const jx = (r() - 0.5) * S * 0.40, jy = (r() - 0.5) * S * 0.38;
        const len = S * (0.45 + r() * 0.5), wid = S * (0.09 + r() * 0.09);
        knifeStroke(focusX + jx, focusY + jy, ang, len, wid, bodyOf(),
          { scrapes: K.rint(r, 0, 2), litAmt: 0.5 });
      }
      stoneLine(focusX + (r() - 0.5) * S * 0.3, focusY + (r() - 0.5) * S * 0.3,
        r() < 0.5 ? 0.2 : Math.PI / 2, S * (0.5 + r() * 0.3), S * 0.02);
      amberBreak(focusX + (r() - 0.5) * S * 0.4, focusY + (r() - 0.5) * S * 0.4,
        (r() - 0.5) * Math.PI, S * (0.25 + r() * 0.2), S * 0.05);

    } else if (mode === 'Wet Pull') {
      // broad overlapping sweeps off one anchor that MERGE into a dragged sheet.
      // tightened spread (was a thin fan-cliché) → fewer, wider, touching sweeps.
      const ax = r() < 0.5 ? W * 0.14 : W * 0.86, ay = r() < 0.5 ? H * 0.82 : H * 0.18;
      const n = K.rint(r, 5, 7);
      const spread = 0.45 + r() * 0.35; // narrower than before — paint sheet, not a fan
      const base = Math.atan2(H * 0.5 - ay, W * 0.5 - ax);
      for (let i = 0; i < n; i++) {
        const ang = base + (i / (n - 1) - 0.5) * spread;
        const len = S * (0.9 + r() * 0.45), wid = S * (0.13 + r() * 0.08);
        const mx = ax + Math.cos(ang) * len * 0.5, my = ay + Math.sin(ang) * len * 0.5;
        knifeStroke(mx, my, ang, len, wid, deepBodyOf(),
          { drift: wid * 1.6, scrapes: K.rint(r, 1, 3), litAmt: 0.34 });
      }
      amberBreak(ax + Math.cos(base) * S * 0.4, ay + Math.sin(base) * S * 0.4,
        base, S * (0.3 + r() * 0.25), S * 0.05);
      stoneLine(ax + Math.cos(base) * S * 0.6, ay + Math.sin(base) * S * 0.6,
        base + (r() - 0.5) * 0.3, S * (0.5 + r() * 0.3), S * 0.016);

    } else if (mode === 'Spackle') {
      // a CHURNED slab of overlapping short knife-pushes — paint worked into a
      // continuous worried surface (no canvas gaps in the mass), not confetti.
      const n = K.rint(r, 70, 110);
      const flow = (r() - 0.5) * Math.PI;
      for (let i = 0; i < n; i++) {
        const gx = focusX + K.randn(r) * S * 0.27;
        const gy = focusY + K.randn(r) * S * 0.27;
        const ang = flow + (r() - 0.5) * 1.1;
        const len = S * (0.10 + r() * 0.14), wid = S * (0.06 + r() * 0.05);
        const c = r() < 0.12 ? pal.amber : bodyOf();
        knifeStroke(gx, gy, ang, len, wid, c,
          { scrapes: 0, depth: wid * 0.22, drift: wid * 0.6, litAmt: 0.55 });
      }
      stoneLine(focusX, focusY, (r() - 0.5) * Math.PI, S * (0.5 + r() * 0.4), S * 0.016);

    } else if (mode === 'Rift') {
      // two opposing paint masses split by a deep stone rift
      const ang = r() < 0.6 ? Math.PI / 2 + (r() - 0.5) * 0.4 : (r() - 0.5) * 0.4;
      const dx = Math.cos(ang), dy = Math.sin(ang), nx = -dy, ny = dx;
      const riftX = W * (0.4 + r() * 0.2), riftY = H * (0.4 + r() * 0.2);
      for (let side = -1; side <= 1; side += 2) {
        const m = K.rint(r, 6, 9);
        for (let i = 0; i < m; i++) {
          const push = S * (0.10 + i * 0.05) * side;
          const cx = riftX + nx * push + (r() - 0.5) * S * 0.1;
          const cy = riftY + ny * push + (r() - 0.5) * S * 0.1;
          knifeStroke(cx, cy, ang + (r() - 0.5) * 0.2, S * (0.55 + r() * 0.4),
            S * (0.06 + r() * 0.05), deepBodyOf(),
            { scrapes: K.rint(r, 0, 2), litAmt: 0.36 });
        }
      }
      stoneLine(riftX, riftY, ang, S * (0.9 + r() * 0.3), S * (0.035 + r() * 0.02));
      amberBreak(riftX + nx * S * 0.22, riftY + ny * S * 0.22, ang, S * (0.3 + r() * 0.2), S * 0.05);

    } else if (mode === 'Slab Build') {
      // NEW: an architecture of built-up impasto blocks — thick standing slabs
      // that overlap and lean, a few amber-loaded, heavy real cast shadows.
      const cols = K.rint(r, 3, 4), rows = K.rint(r, 3, 5);
      const gx0 = W * (0.16 + r() * 0.1), gx1 = W * (0.84 - r() * 0.1);
      const gy0 = H * (0.14 + r() * 0.08), gy1 = H * (0.86 - r() * 0.08);
      const slabAng = (r() - 0.5) * 0.18;
      const blocks = [];
      for (let cI = 0; cI < cols; cI++) {
        for (let rI = 0; rI < rows; rI++) {
          // jittered grid → leaning, overlapping blocks (not a tidy wall)
          const px = gx0 + (gx1 - gx0) * ((cI + 0.5) / cols) + (r() - 0.5) * W * 0.08;
          const py = gy0 + (gy1 - gy0) * ((rI + 0.5) / rows) + (r() - 0.5) * H * 0.07;
          const w = (gx1 - gx0) / cols * (0.95 + r() * 0.5);
          const h = (gy1 - gy0) / rows * (0.95 + r() * 0.55);
          blocks.push({ px, py, w, h, a: slabAng + (r() - 0.5) * 0.12,
            amber: r() < 0.16 });
        }
      }
      // paint back-to-front by py so cast shadows fall on lower blocks
      blocks.sort((a, b) => a.py - b.py);
      for (const bl of blocks) {
        slab(bl.px, bl.py, bl.a, bl.w, bl.h,
          bl.amber ? K.mix(pal.amber, pal.layers[1], 0.18) : bodyOf(),
          { lit: bl.amber ? K.mix(pal.amber, '#fff', 0.28) : litKey });
      }
      stoneLine(W * (0.2 + r() * 0.6), gy0 + (gy1 - gy0) * (0.2 + r() * 0.6),
        (r() < 0.5 ? 0 : Math.PI / 2) + (r() - 0.5) * 0.1, S * (0.5 + r() * 0.3), S * 0.016);

    } else if (mode === 'Sgraffito') {
      // NEW: broad fields of laid paint combed through with cross-scraped
      // grooves in two crossing directions — a woven, incised surface.
      const baseAng = (r() - 0.5) * 0.3;
      paintField(W * 0.5, H * 0.5, W * 1.05, H * 0.95, baseAng, K.rint(r, 7, 10));
      // first comb direction
      const a1 = baseAng + (r() - 0.5) * 0.2;
      sgraffito(W * 0.5, H * 0.5, a1, W * (0.7 + r() * 0.2), H * (0.85 + r() * 0.2),
        K.rint(r, 14, 22));
      // crossing comb direction
      const a2 = a1 + Math.PI / 2 + (r() - 0.5) * 0.3;
      sgraffito(W * 0.5, H * 0.5, a2, H * (0.6 + r() * 0.25), W * (0.8 + r() * 0.2),
        K.rint(r, 10, 16));
      // a loaded ridge laid back over the comb so it's paint, not just incision
      knifeStroke(focusX, focusY, a1, S * (0.7 + r() * 0.3), S * (0.08 + r() * 0.05),
        bodyOf(), { scrapes: K.rint(r, 0, 1), litAmt: 0.55 });
      amberBreak(W * (0.3 + r() * 0.4), H * (0.3 + r() * 0.4), a1, S * (0.3 + r() * 0.2), S * 0.05);

    } else if (mode === 'Trowel Wedge') {
      // NEW: a troweled rosette/arc of thick wedges loaded at a shared hub and
      // lifted outward — dense at the hub, tapering tips, like a knife fan but
      // with real triangular troweled body (not thin blades).
      const hubX = W * (0.34 + r() * 0.32), hubY = H * (0.36 + r() * 0.30);
      const n = K.rint(r, 9, 14);
      const arc = (0.7 + r() * 1.3) * Math.PI; // partial to near-full rosette
      const a0 = r() * Math.PI * 2;
      for (let i = 0; i < n; i++) {
        const ang = a0 + (i / n) * arc + (r() - 0.5) * 0.08;
        const len = S * (0.30 + r() * 0.34), baseW = S * (0.10 + r() * 0.07);
        const off = S * (0.02 + r() * 0.05); // start slightly off the hub
        wedge(hubX + Math.cos(ang) * off, hubY + Math.sin(ang) * off, ang, len, baseW,
          r() < 0.12 ? K.mix(pal.amber, pal.layers[1], 0.15) : bodyOf(),
          { lit: r() < 0.12 ? K.mix(pal.amber, '#fff', 0.28) : litKey });
      }
      // a built-up hub slab so the centre reads as a loaded knot of paint
      slab(hubX, hubY, (r() - 0.5) * 0.6, S * (0.14 + r() * 0.06), S * (0.12 + r() * 0.05),
        bodyOf(), { scrape: true });
      stoneLine(hubX, hubY, (r() - 0.5) * Math.PI, S * (0.4 + r() * 0.3), S * 0.014);

    } else { // Gesture — NEW: one HEAVY single gestural pull dominating the frame
      // over a quietly worked ground. The grail of restraint: one decisive
      // loaded sweep, a couple of supporting drags, a deep cast shadow.
      const fromX = W * (0.12 + r() * 0.12), fromY = H * (0.18 + r() * 0.5);
      const toX = W * (0.78 + r() * 0.12), toY = H * (0.3 + r() * 0.45);
      const mx = (fromX + toX) / 2, my = (fromY + toY) / 2;
      const gAng = Math.atan2(toY - fromY, toX - fromX);
      const gLen = Math.hypot(toX - fromX, toY - fromY) * 1.05;
      // a faint supporting drag echoing the gesture, behind it
      knifeStroke(mx + (r() - 0.5) * S * 0.1, my + (r() - 0.5) * S * 0.1,
        gAng + (r() - 0.5) * 0.18, gLen * 0.85, S * (0.10 + r() * 0.05),
        bodyOf(), { scrapes: K.rint(r, 0, 2), litAmt: 0.35 });
      // THE stroke — wide, loaded, drifting, a strong lit ridge and deep shadow
      knifeStroke(mx, my, gAng, gLen, S * (0.20 + r() * 0.08),
        bodyOf(),
        { scrapes: K.rint(r, 2, 4), drift: S * 0.16, depth: S * 0.05,
          litAmt: 0.42, castShadow: 0.22 });
      // a hot amber bruise where the knife loaded heaviest
      amberBreak(mx + Math.cos(gAng) * S * (0.1 + r() * 0.2),
        my + Math.sin(gAng) * S * (0.1 + r() * 0.2),
        gAng + (r() - 0.5) * 0.3, S * (0.3 + r() * 0.2), S * 0.055);
      stoneLine(mx + (r() - 0.5) * S * 0.2, my + (r() - 0.5) * S * 0.2,
        gAng + Math.PI / 2 + (r() - 0.5) * 0.4, S * (0.4 + r() * 0.3), S * 0.018);
    }

    // ── ATMOSPHERE & TEXTURE (without bleaching) ──
    // 1) material mottle across the whole surface (oil-paint body grain)
    for (let i = 0; i < 3; i++) {
      K.mottle(x, 0, 0, W, H, i === 0 ? pal.knife[0] : pal.layers[i % pal.layers.length],
        34, r, 'overlay');
    }
    // 2) haze sheet tinted toward sage (cool atmosphere) — kept low + tinted
    //    green so it deepens air without washing the picture to grey.
    const hazeCol = K.mix(pal.knife[0], pal.layers[0], 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, pal.rare ? 0.11 : 0.14, S * 0.85, 'soft-light');
    // a second, very faint screen pass only in the upper region for depth
    {
      const gh = x.createLinearGradient(0, 0, 0, H * 0.6);
      gh.addColorStop(0, K.rgba(K.mix(pal.knife[0], pal.lit, 0.35), 0.06));
      gh.addColorStop(1, K.rgba(hazeCol, 0));
      x.save(); x.globalCompositeOperation = 'screen';
      x.fillStyle = gh; x.fillRect(0, 0, W, H * 0.6); x.restore();
    }
    // 2b) a sage glaze pulling the whole surface back toward the GREEN hero, so
    //     no frame drifts pale/beige — the unifying colour key. This is the
    //     "reads green across the room" lock: a real medium-saturation sage
    //     wash that re-greens any stroke the lights pushed toward grey/mint.
    {
      x.save(); x.globalCompositeOperation = 'soft-light'; x.globalAlpha = 0.28;
      x.fillStyle = pal.knife[0]; x.fillRect(0, 0, W, H);
      x.restore();
      // a second, hue-keyed sage pass to force every value into the green key —
      // this is what guarantees the highlights stay sage, not white.
      x.save(); x.globalCompositeOperation = 'color'; x.globalAlpha = 0.2;
      x.fillStyle = K.mix(pal.knife[0], pal.layers[0], 0.4); x.fillRect(0, 0, W, H);
      x.restore();
    }
    // 3) re-deepen the darks the haze lifted — protect deep values
    {
      const dg = x.createRadialGradient(W * 0.5, H * 0.5, S * 0.2, W * 0.5, H * 0.5, S * 0.85);
      dg.addColorStop(0, 'rgba(0,0,0,0)');
      dg.addColorStop(1, K.rgba(pal.stone, 0.2));
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = dg; x.fillRect(0, 0, W, H); x.restore();
    }
    // 4) grain + vignette
    K.grain(x, W, H, 5, r);
    K.vignette(x, W, H, pal.rare ? 0.4 : 0.34);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    let pal;
    if (undefined) {
      pal = PALS.find((p) => p.name === undefined) || PALS[0];
    } else {
      if (r() < 0.085) pal = PALS[PALS.length - 1];
      else pal = K.pick(PALS.slice(0, PALS.length - 1), r);
    }
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Mode: mode, Format: f, Grail: pal.rare ? 'Oxide Bloom' : 'No' };
  }

  return { name: 'h3_impasto', draw, traits };
})();


export const sapRisingTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderSapRising: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const SAPRISING_ASPECTS: readonly number[] = [0.8125,1,1.2308];
export const sapRisingSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Verdigris Noon",
        "Moss Cellar",
        "Sage Sirocco",
        "Fern Ash",
        "Conservatory Fog",
        "Glasshouse Damp",
        "Oxide Bloom"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Stack Ridge",
        "Sgraffito",
        "Spackle",
        "Gesture",
        "Wet Pull",
        "Slab Build",
        "Rift",
        "Scrape Terrace",
        "Trowel Wedge",
        "Drag Field"
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
      "name": "Grail",
      "values": [
        "No",
        "Oxide Bloom"
      ]
    }
  ]
};
