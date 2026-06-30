// @ts-nocheck
/*
 * Threshold — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/b_threshold.js). Continuous seed-driven composition. Deterministic
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


/* THRESHOLD — colour-field & the zip (Newman, made our own).
 * A VAST saturated single colour field, subtly modulated and atmospheric,
 * divided by one or several vertical/horizontal "zip" bands of contrasting
 * colour. Sublime, minimal, immense. PURE non-objective composition: colour,
 * division, value, balance, tension — depicts NOTHING. No scene, no object.
 *
 * Surface is fine-screenprint / oil-field, never flat clip-art: canvas tooth,
 * printed-ink mottle, atmospheric tonal drift across the field, a whisper of
 * haze, slightly imperfect hand edges, vignette grade.
 *
 * GENERATIVE, NOT A TEMPLATE PICKER. There are no discrete "modes". Every
 * salient parameter — field hue/value/sat, zip count, each zip's position /
 * thickness / hue / tonality, orientation mix, format aspect, global zoom,
 * density, focal, asymmetry — varies CONTINUOUSLY with the seed. Two seeds in
 * the same palette WORLD still differ in actual colour and composition, so no
 * two pieces are near-duplicates. The palette "worlds" only set a hue/value
 * neighbourhood; the real colours are sampled live within that neighbourhood.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette WORLD for the colorway jury. KIT preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* ── PALETTE WORLDS, expressed as continuous HSL neighbourhoods ──────────────
     Each world = a FIELD hue band (immense saturated ground) + a small set of
     zip hue bands (the contrasting thresholds). We sample an actual colour
     inside each band per seed, so "Oxblood" seed A and "Oxblood" seed B are
     genuinely different reds with different value/sat — not the same swatch.
     Bands: [hueDeg, hueJitterDeg, satMin,satMax, lightMin,lightMax].          */
  const PALS = [
    { name: 'Oxblood', w: 20,
      field: [358, 14, 0.62, 0.82, 0.14, 0.24],
      zips: [ [42, 12, 0.30, 0.55, 0.74, 0.86],   // bone / ember-gold
              [6, 10, 0.55, 0.78, 0.42, 0.56],    // hot red-orange
              [38, 18, 0.55, 0.85, 0.46, 0.60],   // amber
              [350, 10, 0.20, 0.40, 0.06, 0.12] ] }, // near-black plum
    { name: 'Ultramarine', w: 20,
      field: [226, 16, 0.55, 0.78, 0.20, 0.34],
      zips: [ [44, 14, 0.55, 0.82, 0.50, 0.64],   // gold
              [210, 18, 0.10, 0.28, 0.78, 0.90],  // cool cream
              [228, 14, 0.45, 0.70, 0.08, 0.16],  // deep navy
              [14, 14, 0.50, 0.78, 0.44, 0.58] ] }, // warm terracotta accent
    { name: 'Viridian', w: 16,
      field: [162, 18, 0.52, 0.78, 0.16, 0.30],
      zips: [ [42, 14, 0.55, 0.82, 0.46, 0.60],   // ochre
              [48, 16, 0.12, 0.30, 0.78, 0.90],   // warm bone
              [150, 14, 0.40, 0.65, 0.05, 0.12],  // near-black green
              [12, 14, 0.50, 0.75, 0.42, 0.56] ] }, // rust accent
    { name: 'Cadmium', w: 13,
      field: [16, 14, 0.70, 0.92, 0.42, 0.56],
      zips: [ [224, 18, 0.55, 0.82, 0.24, 0.40],  // deep blue
              [44, 14, 0.10, 0.26, 0.82, 0.92],   // ivory
              [10, 10, 0.40, 0.65, 0.06, 0.12],   // near-black brown
              [172, 22, 0.30, 0.52, 0.36, 0.50] ] }, // teal accent
    { name: 'Umber', w: 15,
      field: [34, 18, 0.58, 0.82, 0.18, 0.30],
      zips: [ [44, 12, 0.55, 0.82, 0.46, 0.60],   // gold
              [206, 16, 0.25, 0.45, 0.20, 0.34],  // slate
              [46, 16, 0.12, 0.28, 0.78, 0.90],   // bone
              [22, 12, 0.40, 0.62, 0.06, 0.12] ] }, // near-black umber
    { name: 'Carbon', w: 6,
      field: [232, 22, 0.10, 0.30, 0.07, 0.13],   // near-black, faint cool cast
      zips: [ [10, 12, 0.55, 0.80, 0.46, 0.58],   // ember
              [42, 18, 0.12, 0.28, 0.74, 0.86],   // bone
              [200, 22, 0.28, 0.48, 0.36, 0.50],  // muted steel
              [0, 0, 0.0, 0.02, 0.02, 0.05] ] },  // void black
  ];

  // weighted palette WORLD pick (some rare on purpose). Consumes exactly ONE r().
  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) { r(); return p; } }
    let tot = 0; for (const p of PALS) tot += p.w;
    let t = r() * tot;
    for (const p of PALS) { t -= p.w; if (t <= 0) return p; }
    return PALS[0];
  }

  // sample a concrete hex from an HSL band [h, hJit, sMin,sMax, lMin,lMax]
  function sampleBand(b, r) {
    const h = b[0] + (r() - 0.5) * 2 * b[1];
    const s = b[2] + r() * (b[3] - b[2]);
    const l = b[4] + r() * (b[5] - b[4]);
    return K.hsl2hex(h, s, l);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    // ── rng order MUST match traits(): pal first, then format, then comp ──
    const pal = pickPal(r);

    // ── FORMAT: continuous aspect, hard-varied across seeds ──
    // long edge ~1180; aspect from tall portrait (0.66) to wide landscape (1.5)
    const aspect = 0.66 + Math.pow(r(), 0.9) * (1.5 - 0.66);
    let W, H;
    if (aspect >= 1) { W = 1240; H = Math.round(1240 / aspect); }
    else { H = 1240; W = Math.round(1240 * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const MN = Math.min(W, H), MX = Math.max(W, H);

    // ── concrete FIELD colours sampled from this world's bands (3 value steps) ──
    const fMid = sampleBand(pal.field, r);
    const fLo = K.mix(fMid, '#000000', 0.30 + r() * 0.14);
    const fHi = K.mix(fMid, '#ffffff', 0.08 + r() * 0.12);
    const field = [fMid, fHi, fLo]; // [mid, light, dark] — keeps old indexing intent

    // pre-sample a palette of concrete zip colours from this world (used live)
    function zipHex(tonal) {
      // tonal zips sit near the field value for quiet, low-contrast tension;
      // contrast zips pull a full band colour.
      if (tonal) {
        const b = pal.zips[Math.floor(r() * pal.zips.length)];
        const c = sampleBand(b, r);
        return K.mix(fMid, c, 0.42 + r() * 0.30);
      }
      // weight toward the loudest bands but allow any
      const idx = Math.floor(Math.pow(r(), 1.3) * pal.zips.length);
      return sampleBand(pal.zips[idx % pal.zips.length], r);
    }

    // ── COMPOSITION CHARACTER — all continuous, no discrete modes ──
    // density: 0 = near-empty minimal (single thin zip), 1 = packed (many zips)
    const density = Math.pow(r(), 1.4);
    // global orientation lean: probability a zip is vertical
    const vertLean = 0.18 + r() * 0.64;
    // global zoom/scale of the field structure (gradient + bloom spread)
    const zoom = 0.78 + r() * 0.6;
    // asymmetry / focal bias: where the composition's weight sits (0..1)
    const focal = r();

    // number of zips: continuous-feeling, biased by density. 1..6.
    const zipCount = 1 + Math.floor(density * 5 + r() * 1.2);

    // ── 1. THE FIELD — immense saturated ground, atmospheric tonal drift ──
    x.fillStyle = fLo;
    x.fillRect(0, 0, W, H);

    // broad diagonal luminous gradient (depth + value structure), angle continuous
    const lightSide = r() < 0.5 ? -1 : 1;
    const ga = (r() - 0.5) * Math.PI; // full continuous angle
    const gcx = W * (0.30 + focal * 0.40), gcy = H * (0.30 + r() * 0.40), gL = MX * (1.0 + zoom * 0.4);
    const gdx = Math.cos(ga) * gL, gdy = Math.sin(ga) * gL;
    const fg = x.createLinearGradient(gcx - gdx / 2 * lightSide, gcy - gdy / 2 * lightSide,
      gcx + gdx / 2 * lightSide, gcy + gdy / 2 * lightSide);
    fg.addColorStop(0, fLo);
    fg.addColorStop(0.5, fMid);
    fg.addColorStop(1, fHi);
    x.fillStyle = fg; x.fillRect(0, 0, W, H);

    // organic cloud-modulation of the field via fbm — atmospheric surface.
    (function modulateField() {
      const step = Math.max(4, Math.floor(MN / 150));
      const sc = MN * (0.40 + r() * 0.55) * zoom;
      const ox = r() * 100, oy = r() * 100;
      const hi = K.mix(fHi, '#ffffff', 0.14);
      const lo = K.mix(fLo, '#000000', 0.28);
      const amp = 0.20 + r() * 0.16; // continuous modulation strength
      x.save();
      for (let yy = 0; yy < H; yy += step) {
        for (let xx = 0; xx < W; xx += step) {
          const n = noise.fbm(xx / sc + ox, yy / sc + oy, 5, 0.55, 2.1);
          if (n > 0.03) {
            x.globalCompositeOperation = 'screen';
            x.fillStyle = K.rgba(hi, K.clamp(n * amp, 0, amp));
          } else if (n < -0.03) {
            x.globalCompositeOperation = 'multiply';
            x.fillStyle = K.rgba(lo, K.clamp(-n * (amp + 0.04), 0, amp + 0.04));
          } else continue;
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
      x.restore();
    })();

    // ── helper: a single ZIP band with imperfect, painterly hand edges ──
    // vertical flag is PER-ZIP now (orientation can mix across a piece, but we
    // keep it mostly coherent via vertLean). pos = centre (0..1 cross axis).
    function zip(pos, thick, col, vertical) {
      const along = vertical ? H : W;
      const cross = vertical ? W : H;
      const half = thick / 2;
      const c = K.clamp(pos * cross, half + cross * 0.004, cross - half - cross * 0.004);
      const wob = MN * (0.0014 + r() * 0.0026);
      const wsc = along / (2.5 + r() * 5);
      const o1 = r() * 50, o2 = r() * 50;
      const seg = Math.max(2, Math.floor(along / 240));

      x.save();
      x.beginPath();
      const lead = [], trail = [];
      for (let p = 0; p <= along; p += seg) {
        const e1 = noise.fbm(p / wsc + o1, o1, 3) * wob;
        const e2 = noise.fbm(p / wsc + o2, 99 + o2, 3) * wob;
        lead.push([c - half + e1, p]);
        trail.push([c + half + e2, p]);
      }
      const map = (cc, pp) => vertical ? [cc, pp] : [pp, cc];
      const [sx, sy] = map(lead[0][0], lead[0][1]);
      x.moveTo(sx, sy);
      for (let i = 1; i < lead.length; i++) { const [mx, my] = map(lead[i][0], lead[i][1]); x.lineTo(mx, my); }
      for (let i = trail.length - 1; i >= 0; i--) { const [mx, my] = map(trail[i][0], trail[i][1]); x.lineTo(mx, my); }
      x.closePath();
      x.clip();

      // fill with subtle internal value drift (continuous direction/strength)
      const d0 = 0.08 + r() * 0.12, d1 = 0.10 + r() * 0.16;
      const zg = vertical ? x.createLinearGradient(0, 0, 0, H) : x.createLinearGradient(0, 0, W, 0);
      zg.addColorStop(0, K.mix(col, '#000000', d0));
      zg.addColorStop(0.5, col);
      zg.addColorStop(1, K.mix(col, '#000000', d1));
      x.fillStyle = zg; x.fillRect(0, 0, W, H);

      // faint specular sheen lengthwise (screenprinted ink ridge), position varies
      const lit = K.mix(col, '#ffffff', 0.26 + r() * 0.12);
      const sheenPos = 0.24 + r() * 0.30;
      x.globalCompositeOperation = 'screen';
      const lg = vertical
        ? x.createLinearGradient(c - half, 0, c + half, 0)
        : x.createLinearGradient(0, c - half, 0, c + half);
      lg.addColorStop(0, K.rgba(lit, 0));
      lg.addColorStop(sheenPos, K.rgba(lit, 0.20 + r() * 0.08));
      lg.addColorStop(K.clamp(sheenPos + 0.18, 0, 1), K.rgba(lit, 0));
      lg.addColorStop(1, K.rgba(lit, 0));
      x.fillStyle = lg; x.fillRect(0, 0, W, H);

      // printed-ink mottle inside the zip for tactile tooth
      x.globalCompositeOperation = 'overlay';
      K.mottle(x, vertical ? c - half : 0, vertical ? 0 : c - half,
        vertical ? thick : W, vertical ? H : thick, col, 34, r, 'overlay');
      x.restore();
    }

    // ── 2. COMPOSE — lay down `zipCount` zips, each fully continuous ──────────
    // We distribute positions across the cross axis with continuous jitter and a
    // focal pull, so a 1-zip piece is a lone Newman threshold and a 5-zip piece
    // is a packed partition — and same-count pieces still differ via position,
    // thickness, hue and tonality randomised per zip. A rare wide "margin/cleft"
    // band emerges naturally when a zip samples a large thickness.

    // pick a coherent base orientation but allow occasional cross-zip
    const baseVert = r() < vertLean;

    // build slot positions: a focal-biased spread, never evenly mechanical
    const positions = [];
    if (zipCount === 1) {
      // lone threshold: off-centre, full continuous range (Onement-like)
      positions.push(0.22 + r() * 0.56);
    } else {
      // spread across the field with golden-ish spacing + heavy jitter + focal lean
      const spread = 0.14 + r() * 0.16; // how much they cluster
      const start = 0.10 + r() * 0.18;
      const span = 0.62 + r() * 0.26;
      for (let i = 0; i < zipCount; i++) {
        const base = start + span * (i / (zipCount - 1));
        const jit = (r() - 0.5) * spread;
        const pull = (focal - base) * (r() * 0.30); // bias toward focal
        positions.push(K.clamp(base + jit + pull, 0.05, 0.95));
      }
    }

    // thickness regime: occasionally one band is wide (margin/cleft feel)
    const wideIdx = r() < 0.45 ? Math.floor(r() * zipCount) : -1;
    const wideAmt = 0.06 + r() * 0.10;       // wide-band fraction of cross axis
    const thinBase = 0.008 + r() * 0.018;    // base thin-zip fraction
    const thinVar = 0.010 + r() * 0.018;

    // optional luminous "doorway" glow behind a chosen gap (value focal), continuous
    if (zipCount >= 2 && r() < 0.5) {
      const cross = baseVert ? W : H;
      const g0 = positions[0] * cross, g1 = positions[positions.length - 1] * cross;
      const a = Math.min(g0, g1), b = Math.max(g0, g1);
      const pg = baseVert ? x.createLinearGradient(a, 0, b, 0) : x.createLinearGradient(0, a, 0, b);
      const glow = K.mix(fMid, '#ffffff', 0.08 + r() * 0.08);
      pg.addColorStop(0, K.rgba(glow, 0));
      pg.addColorStop(0.5, K.rgba(glow, 0.35 + r() * 0.25));
      pg.addColorStop(1, K.rgba(glow, 0));
      x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = pg; x.fillRect(0, 0, W, H); x.restore();
    }

    const cross = baseVert ? W : H;
    for (let i = 0; i < zipCount; i++) {
      const wide = (i === wideIdx);
      const thick = cross * (wide ? wideAmt : (thinBase + r() * thinVar));
      // most zips follow base orientation; rare cross-zip on multi pieces
      const vertical = (zipCount >= 3 && r() < 0.14) ? !baseVert : baseVert;
      // tonality: quieter (tonal) zips more likely on dense pieces & non-focal ones
      const tonal = r() < (0.28 + density * 0.22);
      zip(positions[i], thick, zipHex(tonal), vertical);
    }

    // ── 3. ATMOSPHERE + TACTILE GRADE ──────────────────────────────────────
    const hazeCol = K.mix(fMid, sampleBand(pal.zips[1], r), 0.30);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.07 + r() * 0.06, MN * (0.9 + zoom * 0.4), 'screen');

    // soft luminous bloom on the light side — continuous position/size
    const bx = lightSide < 0 ? W * (0.14 + r() * 0.18) : W * (0.66 + r() * 0.18);
    const by = H * (0.22 + r() * 0.52);
    K.bloom(x, bx, by, MX * (0.5 + zoom * 0.4 + r() * 0.2), K.mix(fHi, '#ffffff', 0.50), 0.12 + r() * 0.08);

    // canvas / paper tooth across everything
    K.mottle(x, 0, 0, W, H, fMid, 80, r, 'overlay');
    K.grain(x, W, H, 4.0, r);
    // vignette grade — heavier on the darkest fields, continuous
    const fl = K.lum(fMid);
    const vig = K.clamp(0.46 - fl * 0.42, 0.24, 0.50) + (r() - 0.5) * 0.06;
    K.vignette(x, W, H, vig);

    return { aspect: W / H };
  }

  // ── traits() MUST mirror draw()'s rng consumption ORDER for the first picks.
  // It only needs the leading deterministic draws to stay in sync; we surface
  // descriptive (bucketed) traits derived from the same continuous values.
  function traits(seed) {
    const r = K.rng(seed);
    const pal = pickPal(r);
    const aspect = 0.66 + Math.pow(r(), 0.9) * (1.5 - 0.66);
    const f = aspect > 1.12 ? 'Landscape' : aspect < 0.9 ? 'Portrait' : 'Square';
    // mirror the field/zip colour samples draw() pulls before composition:
    // fMid(3 r's via sampleBand) ... we don't need exact colours, but we must
    // consume the SAME count to keep density/orientation reads meaningful.
    sampleBand(pal.field, r);        // fMid
    r(); r();                        // fLo, fHi mix factors
    const density = Math.pow(r(), 1.4);
    const vertLean = 0.18 + r() * 0.64;
    r();                             // zoom
    const focal = r();
    const zipCount = 1 + Math.floor(density * 5 + r() * 1.2);
    const dens = density < 0.28 ? 'Minimal' : density > 0.66 ? 'Packed' : 'Balanced';
    return {
      Palette: pal.name,
      Zips: String(zipCount),
      Density: dens,
      Format: f,
    };
  }

  return { name: 'b_threshold', draw, traits };
})();


export const thresholdTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderThreshold: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const THRESHOLD_ASPECTS: readonly number[] = [1.3,1,0.78];
export const thresholdSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Viridian",
        "Umber",
        "Ultramarine",
        "Oxblood",
        "Cadmium",
        "Carbon"
      ]
    },
    {
      "name": "Zips",
      "values": [
        "3",
        "2",
        "5",
        "6",
        "1",
        "4",
        "7"
      ]
    },
    {
      "name": "Density",
      "values": [
        "Balanced",
        "Minimal",
        "Packed"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Square",
        "Landscape",
        "Portrait"
      ]
    }
  ]
};
