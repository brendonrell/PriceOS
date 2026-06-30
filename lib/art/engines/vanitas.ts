// @ts-nocheck
/*
 * Vanitas — PriceOS art engine (by opus4-8). Abstract generative system,
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


/* PALL — chromatic ink-blooms & tide-stains on a dark baroque ground.
 *
 * LOW-KEY DARK JEWEL. Deep aubergine/oxblood ground; rich tarnished-gold and
 * bottle-green accents that WELL and BLEED through a dark, opulent atmosphere.
 * Abstract staining only — no facets, no flowers, no objects, no scene. Pure
 * field/stain/edge-catch. The "off": a stain simultaneously spreads outward and
 * is drawn back, absorbed into the dark.
 *
 * Value-key: LOW (deep darks held deep). Dominant hue: aubergine/oxblood with
 * saturated gold + bottle-green blooms. Haze adds air, never bleach.
 *
 * Every seed must have a CLEAR FOCAL SUBJECT — a strong welled bloom with a real
 * chromatic event (oxblood welling into gold, verdigris tide edge) and a
 * gold-leaf edge catch that draws the eye. No empty fog. Deep contrast.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;
  const TAU = 6.28318530718;

  /* Bruised Bloom — six weathers of ONE dark jewel world. Every palette stays
     low-key and saturated: deep aubergine/oxblood ground, saturated bloom inks,
     tarnished-gold edge. None drift toward pale neutral. + one RARE grail. */
  const PALS = [
    { name: 'Bruised Bloom', ground: '#2A1426', deep: '#170A16', inks: ['#6E2A26', '#A98B3E', '#1F2E26', '#4A1530'], gold: '#A98B3E', tide: '#7E3A2E', glow: '#C8A24A' },
    { name: 'Oxblood Vespers', ground: '#2A1320', deep: '#160810', inks: ['#7A2620', '#9C2E2A', '#A98B3E', '#46101E'], gold: '#B89248', tide: '#8C2C22', glow: '#D49A52' },
    { name: 'Cellar Verdigris', ground: '#1C2622', deep: '#0E1612', inks: ['#1F2E26', '#2E5240', '#A98B3E', '#3A1A2C'], gold: '#A38A40', tide: '#244236', glow: '#7FB088' },
    { name: 'Aubergine Smoke', ground: '#2E1630', deep: '#160A18', inks: ['#5A2046', '#6E2A26', '#8A6E36', '#241038'], gold: '#9E8240', tide: '#5C2440', glow: '#B488A0' },
    { name: 'Gilded Tarn', ground: '#241224', deep: '#120814', inks: ['#A98B3E', '#6E2A26', '#1F2E26', '#3A1828'], gold: '#C8A24A', tide: '#6E2A26', glow: '#E0BC60' },
    { name: 'Port Wine Dark', ground: '#260F1C', deep: '#140710', inks: ['#5C1426', '#7A2230', '#A07A38', '#341022'], gold: '#A4823C', tide: '#6E1C2A', glow: '#C28A6A' },
  ];
  // RARE grail: a single phosphor bloom breaks the dark — bottle-green + acid gold ignition.
  const RARE = { name: 'Witchfire Reliquary', ground: '#13141C', deep: '#080810', inks: ['#1E5A44', '#2E8A5E', '#C8B04A', '#5A1840'], gold: '#E8C84E', tide: '#1E5A44', glow: '#46E0A0' };

  // 10 structurally-distinct composition modes. 9 common + Reliquary (rare).
  const MODES = ['Welling', 'Tidemark', 'Smoke Column', 'Confluence', 'Absorption', 'Eclipse', 'Veil Rift', 'Corona', 'Estuary'];
  const FORMATS = [[1040, 1280], [1180, 1180], [1280, 1020]]; // portrait / square / landscape

  function pickPal(r) {
    if (undefined) {
      if (undefined === RARE.name) return RARE;
      const p = PALS.find((p) => p.name === undefined); if (p) return p;
    }
    return null;
  }

  // one soft radial dab (the atomic ink particle). Feathered, no hard edge.
  function dab(x, cx, cy, rad, col, a, op) {
    x.globalCompositeOperation = op || 'source-over';
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, K.rgba(col, a));
    g.addColorStop(0.5, K.rgba(col, a * 0.5));
    g.addColorStop(1, K.rgba(col, 0));
    x.fillStyle = g;
    x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
  }

  // ── ink bloom as a DIFFUSION STAMP FIELD — hundreds of soft dabs scattered by
  //    an fbm density mask. Organic, feathered, asymmetric; reads as a wet stain
  //    welling into the ground, never a star/flower.
  //    NOW with a real CHROMATIC EVENT (inner hue → gold/glow), a luminous welled
  //    core for focal punch, a tarnished-gold edge-catch that follows the true
  //    ragged blot rim, and an optional absorption rim drawn back to the dark. ──
  function bloom(x, noise, cx, cy, rad, col, gold, glow, r, alpha, opt) {
    opt = opt || {};
    const drawBack = opt.drawBack;
    const chroma = opt.chroma == null ? 0.5 : opt.chroma;   // how strongly the core wells into gold
    const edge = opt.edge == null ? 1 : opt.edge;            // gold-leaf rim intensity
    const sx = 0.66 + r() * 0.6, sy = 0.66 + r() * 0.6;     // anisotropic stretch
    const nseed = r() * 60;                                  // unique blot shape
    const tilt = (r() - 0.5) * 1.5;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const N = 300 + (r() * 240 | 0);
    const core = K.mix(col, '#000000', 0.10);
    const fld = 1.7 + r() * 1.0;
    // pre-compute the chromatic centre: the bloom wells from ink → tarnished gold.
    const wellCol = K.mix(col, gold, 0.55);
    x.save();
    // track the outermost accepted rim points per angle bucket for the gold edge-catch
    const BK = 96;
    const rim = new Float32Array(BK);
    for (let i = 0; i < N; i++) {
      const aa = r() * TAU;
      const rr0 = Math.pow(r(), 0.55);                       // density falls off outward
      let ux = Math.cos(aa) * rr0, uy = Math.sin(aa) * rr0;
      // fbm density mask: reject points where the field is low → ragged lobed edge
      const m = (noise.fbm(ux * fld + nseed, uy * fld - nseed, 4, 0.55, 2.3) + 1) / 2;
      if (r() > m * 1.18 + 0.16) continue;                   // carve organic voids
      ux *= sx; uy *= sy;
      const rx = ux * ct - uy * st, ry = ux * st + uy * ct;
      const px = cx + rx * rad, py = cy + ry * rad;
      const d = rr0;                                          // 0 centre … 1 rim
      // record rim
      const bk = ((Math.atan2(ry, rx) + Math.PI) / TAU * BK | 0) % BK;
      const rd = Math.hypot(rx, ry);
      if (rd > rim[bk]) rim[bk] = rd;
      const dr = rad * (0.05 + (1 - d) * 0.1) * (0.55 + r() * 0.95);
      if (drawBack && d > 0.58) {
        // absorption: outer particles bleed back to dark (multiply)
        dab(x, px, py, dr * 1.35, K.mix(col, '#000', 0.62), alpha * 0.11 * d, 'multiply');
      } else {
        // CHROMATIC EVENT: centre wells to gold, mid is the ink hue, rim darkens.
        let c, op, a;
        if (d < 0.28) {
          // chromatic event: core wells from ink toward tarnished gold (not neon).
          c = K.mix(wellCol, glow, (0.28 - d) / 0.28 * chroma * 0.55); op = 'screen'; a = 0.045 + (1 - d) * 0.06;
        } else if (d < 0.62) {
          c = K.mix(core, col, (d - 0.28) / 0.34); op = 'source-over'; a = 0.05 + (1 - d) * 0.06;
        } else {
          c = K.mix(col, '#000', (d - 0.62) * 0.7); op = 'source-over'; a = 0.04 + (1 - d) * 0.05;
        }
        dab(x, px, py, dr, c, alpha * a, op);
      }
    }
    // ── WELLED CORE — strong focal punch, oxblood welling into tarnished gold.
    //    Kept saturated and JEWEL-toned, not a neon yellow ball. A luminous heart
    //    is forced even for dark inks so every bloom reads as a clear subject. ──
    dab(x, cx, cy, rad * 0.55, col, alpha * 0.34, 'screen');
    dab(x, cx, cy, rad * 0.34, K.mix(col, wellCol, 0.65), alpha * 0.38, 'screen');
    dab(x, cx, cy, rad * 0.18, K.mix(wellCol, glow, 0.45 + 0.35 * chroma), alpha * 0.4 * (0.55 + chroma), 'screen');
    dab(x, cx, cy, rad * 0.08, K.mix(glow, '#fff', 0.2), alpha * 0.34 * (0.5 + chroma), 'screen');
    // ── tarnished GOLD-LEAF EDGE CATCH that hugs the real ragged rim ──
    if (edge > 0) {
      x.globalCompositeOperation = 'lighter';
      for (let b = 0; b < BK; b++) {
        const rd = rim[b]; if (rd < 0.2) continue;
        // angle of this bucket back in WORLD space (undo the tilt for placement)
        const ang = b / BK * TAU - Math.PI;
        // bucket dir is in rotated frame; place at the rim radius along the tilted axis
        const lx = Math.cos(ang), ly = Math.sin(ang);
        const wx = lx * ct - ly * st, wy = lx * st + ly * ct;
        const ex = cx + wx * rd * rad, ey = cy + wy * rd * rad;
        // gold catch strongest where the rim juts out (the lit lip of the stain)
        const jut = K.clamp((rd - 0.5) * 1.6, 0, 1);
        const ga = 0.05 * edge * (0.3 + jut) * alpha;
        if (ga < 0.004) continue;
        const gr = rad * (0.05 + 0.05 * jut);
        const g = x.createRadialGradient(ex, ey, 0, ex, ey, gr);
        g.addColorStop(0, K.rgba(gold, ga));
        g.addColorStop(0.5, K.rgba(K.mix(gold, glow, 0.4), ga * 0.5));
        g.addColorStop(1, K.rgba(gold, 0));
        x.fillStyle = g; x.fillRect(ex - gr, ey - gr, gr * 2, gr * 2);
      }
    }
    x.restore();
  }

  // smooth flowing GOLD RIM along a path of points. Drawn as ONE continuous
  // quadratic-smoothed path (no stacked-coin beads, no zigzag). Subtle.
  function smoothPath(x, pts) {
    x.beginPath();
    x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length - 1; i++) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
      x.quadraticCurveTo(pts[i][0], pts[i][1], mx, my);
    }
    const n = pts.length;
    x.lineTo(pts[n - 1][0], pts[n - 1][1]);
  }
  function goldRim(x, pts, w0, gold, glow, a) {
    if (pts.length < 3) return;
    x.save(); x.globalCompositeOperation = 'lighter';
    x.lineJoin = 'round'; x.lineCap = 'round';
    // soft underglow — one continuous smooth stroke
    x.strokeStyle = K.rgba(glow, a * 0.3); x.lineWidth = w0 * 2.6;
    smoothPath(x, pts); x.stroke();
    // bright tarnished-gold filament — one continuous smooth stroke
    x.strokeStyle = K.rgba(K.mix(gold, glow, 0.25), a * 0.85); x.lineWidth = w0 * 0.85;
    smoothPath(x, pts); x.stroke();
    // a tighter brighter core run
    x.strokeStyle = K.rgba(K.mix(gold, '#fff', 0.18), a * 0.5); x.lineWidth = w0 * 0.4;
    smoothPath(x, pts); x.stroke();
    x.restore();
  }

  // tide-stain: a directional welled mark with a wet leading edge + dry trail and
  // a SMOOTH gold rim catch (the comb/coin artifact is gone).
  function tidemark(x, noise, x0, y0, len, ang, wid, col, gold, glow, r) {
    x.save();
    const segs = 64;
    const dx = Math.cos(ang), dy = Math.sin(ang);
    const px = -dy, py = dx;
    const rimPts = [];
    for (let s = 0; s < segs; s++) {
      const t = s / segs;
      const fade = 1 - t;
      const breathe = 1 + noise.fbm(t * 5.5, x0 / 300, 4, 0.55, 2.2) * 0.7;
      const w = wid * (0.35 + Math.pow(fade, 0.5) * 1.7) * breathe;
      const wander = px * noise.fbm(t * 4 + 9, y0 / 200, 3) * wid * 1.0;
      const wandery = py * noise.fbm(t * 4 + 3, x0 / 200, 3) * wid * 1.0;
      const cxp = x0 + dx * len * t + wander;
      const cyp = y0 + dy * len * t + wandery;
      // wet body — saturated near the lead, drying toward the trail
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = K.rgba(K.mix(col, '#000', t * 0.5), 0.05 + fade * 0.10);
      x.beginPath(); x.ellipse(cxp, cyp, w, w * 0.6, ang, 0, TAU); x.fill();
      // chromatic core glow inside the wet stain
      if (s % 2 === 0) {
        x.globalCompositeOperation = 'screen';
        x.fillStyle = K.rgba(K.mix(col, gold, 0.3), 0.045 * fade);
        x.beginPath(); x.ellipse(cxp, cyp, w * 0.55, w * 0.4, ang, 0, TAU); x.fill();
      }
      // ragged soaked-in rim dabs
      if (s % 3 === 0) {
        const rimw = w * (0.3 + noise.fbm(t * 9, 1, 2) * 0.4);
        const side = (s % 6 === 0) ? 1 : -1;
        x.globalCompositeOperation = 'source-over';
        x.fillStyle = K.rgba(K.mix(col, '#000', t * 0.4), 0.05 * fade);
        x.beginPath(); x.ellipse(cxp + px * w * side, cyp + py * w * side, rimw, rimw * 0.8, ang, 0, TAU); x.fill();
      }
      // collect the upper-rim path for a single smooth gold catch
      if (s % 4 === 0) rimPts.push([cxp + px * w * 0.92, cyp + py * w * 0.92]);
    }
    // wet leading edge — saturated, slightly raised
    for (let s = 0; s < 8; s++) {
      const t = 0.02 + s / 8 * 0.16;
      const w = wid * (0.5 + t * 1.2);
      const cxp = x0 + dx * len * t, cyp = y0 + dy * len * t;
      x.globalCompositeOperation = 'screen';
      x.fillStyle = K.rgba(col, 0.07);
      x.beginPath(); x.ellipse(cxp, cyp, w, w * 0.64, ang, 0, TAU); x.fill();
    }
    x.restore();
    // ── single smooth tarnished-gold rim catch (subtle, hugs the lit upper edge) ──
    goldRim(x, rimPts, wid * 0.16, gold, glow, 0.09);
  }

  // smoke column — vertical curling stain rising and dissolving
  function smoke(x, noise, cx, baseY, topY, wid, col, gold, r) {
    x.save();
    const segs = 96;
    for (let s = 0; s < segs; s++) {
      const t = s / segs;
      const y = baseY + (topY - baseY) * t;
      const drift = noise.fbm(t * 3.2, cx / 260 + 7, 4, 0.55, 2.3) * wid * (1.6 + t * 2.2);
      const w = wid * (1 - t * 0.55) * (1 + noise.fbm(t * 5, cx / 200, 3) * 0.5);
      const xx = cx + drift;
      const fade = (1 - t) * (t < 0.08 ? t / 0.08 : 1);
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = K.rgba(K.mix(col, '#000', 0.2 + t * 0.5), 0.05 + fade * 0.07);
      x.beginPath(); x.ellipse(xx, y, w, w * 1.15, 0, 0, TAU); x.fill();
      x.globalCompositeOperation = 'screen';
      x.fillStyle = K.rgba(K.mix(col, gold, 0.25 * (1 - t)), 0.03 * fade);
      x.beginPath(); x.ellipse(xx, y, w * 0.6, w * 0.7, 0, 0, TAU); x.fill();
    }
    x.restore();
  }

  // a chromatic corona band — welled hue arc(s) sitting around (cx,cy). Broken
  // and fbm-modulated so it reads as a stain rim catching light, NOT a clean
  // drawn ring. a0/span (turns) optionally limit it to a partial arc.
  function coronaRing(x, noise, cx, cy, rad, col, gold, glow, r, a, a0, span) {
    x.save();
    const steps = 240;
    const wob = r() * 40;
    const start = a0 == null ? 0 : a0;
    const arc = span == null ? TAU : span * TAU;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const ang = start + arc * t;
      const rr = rad * (1 + noise.fbm(Math.cos(ang) * 1.6 + wob, Math.sin(ang) * 1.6 - wob, 4) * 0.18);
      const ex = cx + Math.cos(ang) * rr, ey = cy + Math.sin(ang) * rr;
      // break the band into stain segments — fbm gates presence so it isn't solid
      const pres = (noise.fbm(Math.cos(ang) * 2.4 + wob + 11, Math.sin(ang) * 2.4 - wob, 4) + 1) / 2;
      if (pres < 0.32) continue;
      const band = (Math.sin(ang * 3 + wob) + 1) / 2;
      const c = K.mix(col, gold, band * 0.6);
      const dr = rad * (0.07 + band * 0.06);
      x.globalCompositeOperation = i % 6 === 0 ? 'screen' : 'source-over';
      const g = x.createRadialGradient(ex, ey, 0, ex, ey, dr);
      g.addColorStop(0, K.rgba(c, a * (0.4 + band * 0.6) * pres));
      g.addColorStop(1, K.rgba(c, 0));
      x.fillStyle = g; x.fillRect(ex - dr, ey - dr, dr * 2, dr * 2);
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);

    // RARE grail seed (~1 in 12)
    const isRare = r() < 0.085;
    const forced = pickPal(r);
    const pal = forced || (isRare ? RARE : K.pick(PALS, r));
    const GOLD = pal.gold, GLOW = pal.glow;

    const mode = isRare ? 'Reliquary' : K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── DARK BAROQUE GROUND — deep, never washed. Radial pool of ground over deep. ──
    x.fillStyle = pal.deep; x.fillRect(0, 0, W, H);
    const gx = W * (0.3 + r() * 0.4), gy = H * (0.3 + r() * 0.4);
    const gg = x.createRadialGradient(gx, gy, 0, gx, gy, S * 0.95);
    gg.addColorStop(0, pal.ground);
    gg.addColorStop(0.55, K.mix(pal.ground, pal.deep, 0.45));
    gg.addColorStop(1, pal.deep);
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    // a faint counter-pool to give the ground depth
    x.save(); x.globalCompositeOperation = 'multiply';
    const dg = x.createRadialGradient(W - gx, H - gy, 0, W - gx, H - gy, S * 0.8);
    dg.addColorStop(0, K.rgba(pal.deep, 0.7)); dg.addColorStop(1, K.rgba(pal.deep, 0));
    x.fillStyle = dg; x.fillRect(0, 0, W, H); x.restore();

    // base material mottle on the ground (texture everywhere)
    K.mottle(x, 0, 0, W, H, pal.ground, 70, r, 'overlay');

    // focal point (authored composition — off-centre, golden-ratio-ish)
    const fcx = W * (r() < 0.5 ? 0.34 + r() * 0.12 : 0.54 + r() * 0.12);
    const fcy = H * (0.36 + r() * 0.26);
    const ink = () => K.pick(pal.inks, r);

    // ── COMPOSE per mode ──
    if (mode === 'Welling') {
      // one dominant welling bloom (strong chromatic event) + satellites
      const main = ink();
      bloom(x, noise, fcx, fcy, S * (0.36 + r() * 0.14), main, GOLD, GLOW, r, 1.0, { drawBack: true, chroma: 0.6, edge: 1.2 });
      const sats = 2 + (r() * 3 | 0);
      for (let i = 0; i < sats; i++) {
        const a = r() * TAU, d = S * (0.24 + r() * 0.3);
        bloom(x, noise, fcx + Math.cos(a) * d, fcy + Math.sin(a) * d, S * (0.09 + r() * 0.15), ink(), GOLD, GLOW, r, 0.78, { drawBack: r() < 0.5, chroma: 0.35, edge: 0.7 });
      }
      K.sheen(x, fcx - S * 0.1, fcy - S * 0.1, S * 0.2, GLOW, 0.16);
    } else if (mode === 'Tidemark') {
      const n = 3 + (r() * 3 | 0);
      for (let i = 0; i < n; i++) {
        const y0 = H * (0.2 + i / n * 0.6 + (r() - 0.5) * 0.08);
        const x0 = r() < 0.5 ? W * 0.06 : W * 0.94;
        const ang = (x0 < W / 2 ? 0 : Math.PI) + (r() - 0.5) * 0.4;
        tidemark(x, noise, x0, y0, W * (0.6 + r() * 0.35), ang, S * (0.045 + r() * 0.05), ink(), GOLD, GLOW, r);
      }
      // strong bloom sitting at a confluence so there is a clear subject
      bloom(x, noise, fcx, fcy, S * (0.22 + r() * 0.12), ink(), GOLD, GLOW, r, 0.92, { drawBack: true, chroma: 0.5, edge: 1.1 });
    } else if (mode === 'Smoke Column') {
      // ONE dominant welled base-pool feeding a curling rising stain — a clear
      // single subject, jewel-toned, never a row of pillars or twin smudges.
      const nonGold = pal.inks.filter((c) => c !== GOLD);
      const pickDark = () => K.pick(nonGold.length ? nonGold : pal.inks, r);
      const cx = W * (0.4 + r() * 0.2);
      const col = pickDark();
      // strong welled base pool — the chromatic subject sits at the foot
      bloom(x, noise, cx, H * 0.78, S * (0.34 + r() * 0.1), col, GOLD, GLOW, r, 1.05, { drawBack: true, chroma: 0.62, edge: 1.2 });
      // the rising stain — tighter near the base, dissolving up (clear column read)
      smoke(x, noise, cx, H * 0.78, H * (0.18 + r() * 0.18), S * (0.075 + r() * 0.04), col, GOLD, r);
      smoke(x, noise, cx + (r() - 0.5) * S * 0.08, H * 0.78, H * (0.1 + r() * 0.12), S * (0.05 + r() * 0.03), K.mix(col, pal.tide, 0.4), GOLD, r);
      // a second welled bloom riding up in the column so the mid never reads dead
      const m2 = K.mix(pickDark(), GOLD, 0.15);
      bloom(x, noise, cx + (r() - 0.5) * S * 0.1, H * (0.42 + r() * 0.12), S * (0.16 + r() * 0.07), m2, GOLD, GLOW, r, 0.86, { chroma: 0.5, edge: 0.9 });
      // an optional faint subordinate column to the side for asymmetry
      if (r() < 0.5) {
        const cx2 = cx + (r() < 0.5 ? -1 : 1) * S * (0.26 + r() * 0.1);
        const c2 = pickDark();
        bloom(x, noise, cx2, H * 0.8, S * (0.15 + r() * 0.06), c2, GOLD, GLOW, r, 0.7, { drawBack: true, chroma: 0.35, edge: 0.6 });
        smoke(x, noise, cx2, H * 0.8, H * (0.2 + r() * 0.16), S * (0.05 + r() * 0.03), c2, GOLD, r);
      }
      // gold edge-catch where the pool wells against the dark
      K.sheen(x, cx, H * 0.68, S * 0.18, GLOW, 0.22);
    } else if (mode === 'Confluence') {
      // several mid blooms flowing toward a dominant centre, smooth gold seams
      const n = 4 + (r() * 2 | 0);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + r() * 0.5;
        const d = S * (0.18 + r() * 0.2);
        pts.push([fcx + Math.cos(a) * d, fcy + Math.sin(a) * d]);
      }
      // smooth gold confluence seams flowing into the centre
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const mid = [fcx + (p[0] - fcx) * 0.5 + (r() - 0.5) * S * 0.08, fcy + (p[1] - fcy) * 0.5 + (r() - 0.5) * S * 0.08];
        goldRim(x, [p, mid, [fcx, fcy]], S * 0.018, GOLD, GLOW, 0.09);
      }
      for (const p of pts) bloom(x, noise, p[0], p[1], S * (0.13 + r() * 0.1), ink(), GOLD, GLOW, r, 0.8, { drawBack: r() < 0.4, chroma: 0.4, edge: 0.7 });
      // dominant central bloom — the clear subject
      bloom(x, noise, fcx, fcy, S * (0.24 + r() * 0.1), ink(), GOLD, GLOW, r, 0.98, { drawBack: true, chroma: 0.62, edge: 1.2 });
    } else if (mode === 'Absorption') {
      // a large bloom visibly being drawn BACK into the dark — the "off"
      const main = ink();
      bloom(x, noise, fcx, fcy, S * (0.44 + r() * 0.12), main, GOLD, GLOW, r, 1.0, { drawBack: true, chroma: 0.6, edge: 1.2 });
      // a clustered resist-mass beside it so the field is never sparse
      const side = gx > W / 2 ? -1 : 1;
      bloom(x, noise, fcx - side * S * 0.24, fcy + (r() - 0.5) * S * 0.16, S * (0.24 + r() * 0.1), ink(), GOLD, GLOW, r, 0.9, { chroma: 0.5, edge: 1.0 });
      bloom(x, noise, fcx + side * S * 0.12, fcy + (r() - 0.5) * S * 0.2, S * (0.14 + r() * 0.08), ink(), GOLD, GLOW, r, 0.8, { drawBack: true, chroma: 0.4, edge: 0.7 });
      // a dark counter-bloom eating into it from the deep side — the absorption
      x.save(); x.globalCompositeOperation = 'multiply';
      const ecx = W * 0.5 + side * S * 0.36;
      const eat = x.createRadialGradient(ecx, fcy, 0, ecx, fcy, S * 0.55);
      eat.addColorStop(0, K.rgba(pal.deep, 0.92)); eat.addColorStop(0.55, K.rgba(pal.deep, 0.44)); eat.addColorStop(1, K.rgba(pal.deep, 0));
      x.fillStyle = eat; x.fillRect(0, 0, W, H); x.restore();
      // a verdigris/tide edge welling at the retreating boundary — chromatic event
      const tcol = K.mix(main, pal.tide, 0.5);
      bloom(x, noise, ecx - side * S * 0.18, fcy + (r() - 0.5) * S * 0.12, S * (0.14 + r() * 0.06), tcol, GOLD, GLOW, r, 0.7, { chroma: 0.35, edge: 0.8 });
      // gold residue tide-line marking how far the stain reached before retreat
      tidemark(x, noise, fcx - side * S * 0.3, fcy, S * 0.55, side > 0 ? 0.1 : Math.PI - 0.1, S * 0.02, K.mix(main, GOLD, 0.4), GOLD, GLOW, r);
    } else if (mode === 'Eclipse') {
      // a broad welled stain-mass occulted by a dark void; light catches only
      // along a BROKEN crescent of the rim — reads as absorption, not a drawn ring.
      const main = ink();
      // big surrounding welled mass — strong subject, fills the field
      bloom(x, noise, fcx, fcy, S * (0.46 + r() * 0.12), main, GOLD, GLOW, r, 1.0, { chroma: 0.55, edge: 0.5 });
      bloom(x, noise, fcx + (r() - 0.5) * S * 0.18, fcy + (r() - 0.5) * S * 0.18, S * (0.3 + r() * 0.1), ink(), GOLD, GLOW, r, 0.82, { chroma: 0.45, edge: 0.5 });
      // the dark void eats the centre — ragged, feathered edge (not a clean circle)
      const rr = S * (0.2 + r() * 0.08);
      x.save(); x.globalCompositeOperation = 'multiply';
      const dn = K.makeNoise(seed * 13 + 3);
      const N2 = 360;
      for (let i = 0; i < N2; i++) {
        const ang = i / N2 * TAU;
        const rj = rr * (0.86 + dn.fbm(Math.cos(ang) * 1.8 + 5, Math.sin(ang) * 1.8 - 5, 4) * 0.22);
        for (let k = 0; k < 5; k++) {
          const rad2 = rj * (0.2 + k / 5 * 0.85);
          const ex = fcx + Math.cos(ang) * rad2, ey = fcy + Math.sin(ang) * rad2;
          x.fillStyle = K.rgba(pal.deep, 0.12);
          x.beginPath(); x.arc(ex, ey, rr * 0.16, 0, TAU); x.fill();
        }
      }
      x.restore();
      // solid deep core of the void
      x.save();
      const disc = x.createRadialGradient(fcx, fcy, 0, fcx, fcy, rr);
      disc.addColorStop(0, pal.deep); disc.addColorStop(0.7, pal.deep); disc.addColorStop(1, K.rgba(pal.deep, 0));
      x.fillStyle = disc; x.fillRect(fcx - rr * 1.2, fcy - rr * 1.2, rr * 2.4, rr * 2.4);
      x.restore();
      // BROKEN crescent of light along one side of the rim only — chromatic catch
      const fa = r() * TAU, cspan = 0.28 + r() * 0.18;
      coronaRing(x, noise, fcx, fcy, rr * 1.0, main, GOLD, GLOW, r, 0.5, fa, cspan);
      // the brightest gold lip — a sheen kiss, not a full ring
      x.save(); x.globalCompositeOperation = 'lighter';
      const lx = fcx + Math.cos(fa + cspan * TAU * 0.5) * rr, ly = fcy + Math.sin(fa + cspan * TAU * 0.5) * rr;
      K.sheen(x, lx, ly, S * 0.13, GLOW, 0.4);
      K.sheen(x, lx, ly, S * 0.06, GOLD, 0.34);
      x.restore();
    } else if (mode === 'Veil Rift') {
      // a vertical tide-curtain (stacked horizontal stains) split by a vivid gold seam
      const riftX = W * (0.4 + r() * 0.2);
      const wob = r() * 30;
      // curtain of horizontal welled bands either side of the rift (sparser, calmer)
      const bands = 3 + (r() * 2 | 0);
      for (let b = 0; b < bands; b++) {
        const yy = H * (0.18 + b / bands * 0.64 + (r() - 0.5) * 0.05);
        const side = b % 2 === 0 ? -1 : 1;
        const start = riftX + side * S * (0.02 + r() * 0.03);
        const len = W * (0.26 + r() * 0.24);
        tidemark(x, noise, start, yy, len, side > 0 ? (r() - 0.5) * 0.22 : Math.PI + (r() - 0.5) * 0.22, S * (0.04 + r() * 0.035), ink(), GOLD, GLOW, r);
      }
      // the dark rift itself — a deep cleft
      x.save(); x.globalCompositeOperation = 'multiply';
      const cleft = x.createLinearGradient(riftX - S * 0.1, 0, riftX + S * 0.1, 0);
      cleft.addColorStop(0, K.rgba(pal.deep, 0)); cleft.addColorStop(0.5, pal.deep); cleft.addColorStop(1, K.rgba(pal.deep, 0));
      x.fillStyle = cleft; x.fillRect(riftX - S * 0.12, 0, S * 0.24, H); x.restore();
      // vivid vertical gold seam down the rift, wandering smoothly with the field
      const seamPts = [];
      for (let s = 0; s <= 40; s++) {
        const t = s / 40;
        const yy = H * (0.08 + t * 0.84);
        const xx = riftX + noise.fbm(t * 2.4 + wob, 2, 3) * S * 0.045;
        seamPts.push([xx, yy]);
      }
      goldRim(x, seamPts, S * 0.018, GOLD, GLOW, 0.15);
      // a bloom welling out of the rift as the clear subject
      bloom(x, noise, riftX + (r() - 0.5) * S * 0.06, fcy, S * (0.2 + r() * 0.1), ink(), GOLD, GLOW, r, 0.92, { chroma: 0.6, edge: 1.0 });
    } else if (mode === 'Corona') {
      // concentric chromatic halo blooms around one luminous core — a "sun in the dark"
      const main = ink();
      // central dense core
      bloom(x, noise, fcx, fcy, S * (0.18 + r() * 0.08), main, GOLD, GLOW, r, 1.0, { chroma: 0.7, edge: 0.8 });
      K.bloom(x, fcx, fcy, S * 0.3, GLOW, 0.22);
      K.sheen(x, fcx, fcy, S * 0.1, GLOW, 0.4);
      // 2-3 concentric chromatic rings welling oxblood→verdigris→gold
      const rings = 2 + (r() < 0.5 ? 1 : 0);
      for (let i = 0; i < rings; i++) {
        coronaRing(x, noise, fcx, fcy, S * (0.22 + i * 0.1 + r() * 0.04), ink(), GOLD, GLOW, r, 0.32 - i * 0.06);
      }
      // a smooth gold halo arc
      x.save(); x.globalCompositeOperation = 'lighter';
      const ra = S * (0.28 + r() * 0.06);
      const arc = [];
      const a0 = r() * TAU, span = 1.2 + r() * 2.5;
      for (let s = 0; s <= 28; s++) { const a = a0 + span * s / 28; arc.push([fcx + Math.cos(a) * ra, fcy + Math.sin(a) * ra]); }
      x.restore();
      goldRim(x, arc, S * 0.014, GOLD, GLOW, 0.14);
    } else { // Estuary
      // a branching delta of tide-channels fanning from a welled mouth. More
      // channels of varied length/width → a frayed delta, never a two-leg figure.
      const mx = fcx, my = H * (0.18 + r() * 0.12);
      const baseAng = Math.PI * 0.5 + (r() - 0.5) * 0.4; // generally downward
      const branches = 4 + (r() * 3 | 0);
      // welled mouth bloom — the source, clear subject
      bloom(x, noise, mx, my, S * (0.18 + r() * 0.08), ink(), GOLD, GLOW, r, 0.95, { chroma: 0.62, edge: 1.1 });
      for (let b = 0; b < branches; b++) {
        // jittered spread so channels are not mirror-symmetric
        const spread = (b / (branches - 1) - 0.5) * (1.3 + r() * 0.5) + (r() - 0.5) * 0.25;
        const ang = baseAng + spread;
        const len = H * (0.3 + r() * 0.34);
        const wd = S * (0.02 + r() * 0.028);
        tidemark(x, noise, mx, my, len, ang, wd, ink(), GOLD, GLOW, r);
        // a small bloom pooling where the channel ends
        const ex = mx + Math.cos(ang) * len * 0.82, ey = my + Math.sin(ang) * len * 0.82;
        if (r() < 0.65) bloom(x, noise, ex, ey, S * (0.07 + r() * 0.06), ink(), GOLD, GLOW, r, 0.72, { drawBack: true, chroma: 0.4, edge: 0.6 });
      }
      K.sheen(x, mx, my, S * 0.13, GLOW, 0.18);
    }

    // Reliquary (rare grail) is composed on top of whatever ground/mode-less path
    if (isRare) {
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(pal.deep, 0.5); x.fillRect(0, 0, W, H); x.restore();
      const main = pal.inks[0];
      bloom(x, noise, fcx, fcy, S * (0.36 + r() * 0.1), main, GOLD, GLOW, r, 1.0, { chroma: 0.85, edge: 1.0 });
      K.bloom(x, fcx, fcy, S * 0.45, GLOW, 0.34);
      K.sheen(x, fcx, fcy, S * 0.16, GLOW, 0.55);
      coronaRing(x, noise, fcx, fcy, S * (0.28 + r() * 0.05), pal.inks[1], GOLD, GLOW, r, 0.45);
      for (let i = 0; i < 6; i++) {
        const a = r() * TAU, d = S * (0.2 + r() * 0.35);
        bloom(x, noise, fcx + Math.cos(a) * d, fcy + Math.sin(a) * d, S * (0.05 + r() * 0.07), K.pick(pal.inks, r), GOLD, GLOW, r, 0.72, { chroma: 0.5, edge: 0.6 });
      }
      x.save(); x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(GOLD, 0.16); x.lineWidth = S * 0.006;
      x.beginPath(); x.arc(fcx, fcy, S * (0.3 + r() * 0.06), 0, TAU); x.stroke();
      x.restore();
    }

    // ── universal tarnished-gold edge-catches scattered where blooms meet ground ──
    if (!isRare) {
      x.save(); x.globalCompositeOperation = 'lighter';
      const ne = 3 + (r() * 3 | 0);
      for (let i = 0; i < ne; i++) {
        const a = r() * TAU;
        const rr = S * (0.18 + r() * 0.24);
        const ex = fcx + Math.cos(a) * rr, ey = fcy + Math.sin(a) * rr;
        const g = x.createRadialGradient(ex, ey, 0, ex, ey, S * 0.07);
        g.addColorStop(0, K.rgba(GOLD, 0.18)); g.addColorStop(0.5, K.rgba(K.mix(GOLD, GLOW, 0.4), 0.07)); g.addColorStop(1, K.rgba(GOLD, 0));
        x.fillStyle = g; x.fillRect(ex - S * 0.07, ey - S * 0.07, S * 0.14, S * 0.14);
      }
      x.restore();
    }

    // ── ATMOSPHERE & TEXTURE (haze adds air, must NOT bleach) ──
    const hazeCol = K.mix(pal.ground, pal.deep, 0.3);
    x.save(); x.globalCompositeOperation = 'multiply';
    K.hazeSheet(x, W, H, noise, K.mix(pal.deep, '#000', 0.2), 0.2, S * 0.85, 'multiply');
    x.restore();
    // a faint warm screen haze ONLY near the focal glow — atmosphere not bleach
    const wh = K.mix(pal.tide, GOLD, 0.3);
    x.save(); x.globalCompositeOperation = 'screen';
    const whg = x.createRadialGradient(fcx, fcy, 0, fcx, fcy, S * 0.7);
    whg.addColorStop(0, K.rgba(wh, 0.11)); whg.addColorStop(0.5, K.rgba(wh, 0.04)); whg.addColorStop(1, K.rgba(wh, 0));
    x.fillStyle = whg; x.fillRect(0, 0, W, H); x.restore();

    // re-deepen the corners so nothing reads as fog
    K.vignette(x, W, H, 0.56);
    // final mottle + grain for material tooth everywhere
    K.mottle(x, 0, 0, W, H, pal.ground, 120, r, 'soft-light');
    K.grain(x, W, H, 5.2, r);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const isRare = r() < 0.085;
    let pal;
    if (undefined) {
      pal = undefined === RARE.name ? RARE : (PALS.find((p) => p.name === undefined) || PALS[0]);
    } else {
      pal = isRare ? RARE : K.pick(PALS, r);
    }
    const mode = isRare ? 'Reliquary' : K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Mode: mode, Format: f, Grail: isRare ? 'Witchfire' : 'No' };
  }

  return { name: 'h3_pall', draw, traits };
})();


export const vanitasTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderVanitas: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const VANITAS_ASPECTS: readonly number[] = [0.8125,1,1.2549];
export const vanitasSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Cellar Verdigris",
        "Aubergine Smoke",
        "Gilded Tarn",
        "Port Wine Dark",
        "Bruised Bloom",
        "Oxblood Vespers",
        "Witchfire Reliquary"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Smoke Column",
        "Veil Rift",
        "Absorption",
        "Estuary",
        "Confluence",
        "Eclipse",
        "Welling",
        "Corona",
        "Reliquary",
        "Tidemark"
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
        "Witchfire"
      ]
    }
  ]
};
