// @ts-nocheck
/*
 * PaperCountry — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/h4_papercountry.js). Continuous seed-driven surreal "real-but-off"
 * system; deterministic from tokenId only. KIT bundled; trait schema derived
 * from the engine's own casts. Halo tournament cohort (2026-07).
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


/* PAPER COUNTRY — a landscape that is unmistakably creased paper / folded cloth.
 * Mountains are origami ridges, the horizon is a fold, a torn edge reveals white
 * beneath, fields are pleated. Soft studio light rakes across the folds, carving
 * REAL shadow valleys. SURREAL = real-but-off: a believable landscape whose one
 * broken law is that the whole world is made of paper — calm, tactile, uncanny.
 *
 * Palette world: warm chalk/ivory, graphite fold-shadow, faint blush, deckle cream.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six palettes, all in the chalk/graphite/blush/cream family but each a
     different paper stock + light temperature so the SET reads varied, not
     reskinned. base = mid paper tone; lit = light-struck face; deep = valley
     shadow; ink = darkest crease; blush = faint warm bounce; white = torn
     reveal / brightest highlight; air = haze tint. */
  const PALS = [
    { name: 'Deckle Cream',  base: '#E2D8C6', lit: '#F4ECDD', deep: '#9A8E78', ink: '#6B6052', blush: '#E8D2C4', white: '#FBF6EC', air: '#EFE9DD' },
    { name: 'Graphite Chalk',base: '#C9C2B4', lit: '#E6E0D2', deep: '#7F786A', ink: '#4E4A41', blush: '#D6C8C2', white: '#F4F1E8', air: '#DCD8CE' },
    { name: 'Ivory Studio',  base: '#EFE9DD', lit: '#FBF7EE', deep: '#B7AB97', ink: '#827763', blush: '#F0DDD3', white: '#FFFDF6', air: '#F5F1E8' },
    { name: 'Blush Vellum',  base: '#E7D9CE', lit: '#F6EBE0', deep: '#AE9C8C', ink: '#7C6A5C', blush: '#EBC9BC', white: '#FCF4EC', air: '#F1E4DA' },
    { name: 'Slate Newsprint',base:'#B7AB97', lit: '#D8CDB9', deep: '#76705F', ink: '#403C34', blush: '#C2AFA4', white: '#ECE6D8', air: '#CBC2AF' },
    { name: 'Bone Pleat',    base: '#D8CFBE', lit: '#EFE8D8', deep: '#8A8070', ink: '#5A5247', blush: '#DEC8BC', white: '#F8F2E6', air: '#E4DDCE' },
  ];

  const MODES = ['Folded Range', 'Crumpled Valley', 'Torn Horizon', 'Single Crease', 'Pleated Field', 'Paper Sea'];
  const FORMATS = [[1280, 853], [1180, 1180]]; // wide(1.5) / square

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* shade a paper tone for a facet given how square-on it faces the light.
     d in [-1,1]: +1 fully lit face, 0 grazing, -1 in shadow (valley). */
  function facet(pal, d) {
    if (d >= 0) return K.mix(pal.base, pal.lit, Math.pow(d, 0.85) * 0.92);
    const t = Math.min(1, -d);
    return K.mix(pal.base, K.mix(pal.deep, pal.ink, t * 0.55), Math.pow(t, 0.8));
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

    // raking studio light: low, from one side, slightly warm
    const lightSide = r() < 0.5 ? -1 : 1;       // -1 from left, +1 from right
    // light elevation varies per output (how low/raking vs steep the rake is)
    const lightElev = -(0.18 + r() * 0.34);      // -0.18 steep .. -0.52 low/raking
    const lightDir = [-lightSide, lightElev];    // direction light travels
    const llen = Math.hypot(lightDir[0], lightDir[1]);
    lightDir[0] /= llen; lightDir[1] /= llen;
    const warmCast = K.mix(pal.lit, pal.blush, 0.25);

    // ── base sheet: a soft vertical paper wash, light pooling toward the light ──
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, K.mix(pal.base, pal.lit, 0.30));
    bg.addColorStop(0.55, pal.base);
    bg.addColorStop(1, K.mix(pal.base, pal.deep, 0.30));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // gentle horizontal light pool from the lit side
    const pool = x.createLinearGradient(lightSide < 0 ? 0 : W, 0, lightSide < 0 ? W : 0, 0);
    pool.addColorStop(0, K.rgba(warmCast, 0.30));
    pool.addColorStop(0.5, K.rgba(warmCast, 0.06));
    pool.addColorStop(1, K.rgba(pal.deep, 0.10));
    x.fillStyle = pool; x.fillRect(0, 0, W, H);

    // ───────────────────────────────────────────────────────────────────────
    // PRIMITIVES
    // ───────────────────────────────────────────────────────────────────────

    // a single fold panel: polygon filled with a facet tone + a crisp crease
    // highlight on its top edge and a soft cast-shadow below the ridge.
    function paperFill(poly, tone) {
      x.beginPath();
      x.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) x.lineTo(poly[i][0], poly[i][1]);
      x.closePath();
      x.fillStyle = tone; x.fill();
    }

    // crisp bright line along a ridge (where two lit planes meet the light)
    function creaseHi(ax, ay, bx, by, w, a, col) {
      x.save();
      x.strokeStyle = K.rgba(col || pal.white, a);
      x.lineWidth = w; x.lineCap = 'round';
      x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      x.restore();
    }
    // thin dark line in the very bottom of a valley
    function creaseLo(ax, ay, bx, by, w, a) {
      x.save();
      x.strokeStyle = K.rgba(pal.ink, a);
      x.lineWidth = w; x.lineCap = 'round';
      x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
      x.restore();
    }

    // ── ORIGAMI MOUNTAIN RANGE: a solid folded range from baseY up to peaks.
    // Each summit splits into a broad WINDWARD face (toward light, lit) and a
    // LEEWARD face (away, shadowed). Faces meet neighbours at saddle valleys so
    // the silhouette is one continuous folded paper ridge — no thin black teeth.
    // peakH = peak height above base (px); contrast scales lit/shadow spread.
    function foldedRange(baseY, peakH, peaks, contrast, jitter, tintMix) {
      const n = Math.max(2, peaks);
      const litWindward = lightDir[0] < 0; // light travels left → left faces lit
      // Build an ALTERNATING ridgeline of vertices: summit, saddle, summit, ...
      // x positions are irregular; summit/saddle heights vary strongly so the
      // silhouette reads as a real folded range, not even tents.
      const vx = [], vy = [], isSummit = [];
      const m = n * 2; // total vertices
      let xc = -W * 0.08;
      for (let i = 0; i <= m; i++) {
        const summit = i % 2 === 1; // odd = summit, even = saddle
        // irregular horizontal advance
        const adv = (W * 1.16 / m) * (0.55 + 1.1 * ((noise.fbm(i * 2.3 + seed * 0.7, 11, 3) + 1) / 2) * jitter);
        if (i > 0) xc += adv;
        vx.push(xc);
        let h;
        if (summit) h = peakH * (0.50 + 0.50 * ((noise.fbm(i * 0.8 + seed, 4, 3) + 1) / 2));
        else h = peakH * (0.04 + 0.30 * ((noise.fbm(i * 1.4 + seed * 1.9, 8, 3) + 1) / 2));
        vy.push(baseY - h);
        isSummit.push(summit);
      }
      // normalise so the ridge spans the full width
      const minx = vx[0], maxx = vx[vx.length - 1];
      for (let i = 0; i < vx.length; i++) vx[i] = ((vx[i] - minx) / (maxx - minx)) * (W * 1.12) - W * 0.06;
      // 1) fill the whole mountain body as one continuous silhouette to baseY
      //    (a slightly deep mid tone — the in-shadow bulk of the range)
      x.beginPath(); x.moveTo(vx[0], baseY);
      for (let i = 0; i < vx.length; i++) x.lineTo(vx[i], vy[i]);
      x.lineTo(vx[vx.length - 1], baseY); x.closePath();
      x.fillStyle = K.mix(pal.base, pal.deep, 0.30 + contrast * 0.14); x.fill();
      // 2) the FOLDED FRONT FACES: for each summit, two triangular planes down
      //    to its flanking saddles. The lower edge is the saddle-to-saddle valley
      //    floor, so summits stay connected as one ridge (no freestanding fins).
      for (let i = 1; i < vx.length; i += 2) { // summits at odd indices
        const sx = vx[i], sy = vy[i];
        const lx = vx[i - 1], ly = vy[i - 1];                 // left saddle
        const rx = (i + 1 < vx.length) ? vx[i + 1] : vx[i];   // right saddle
        const ry = (i + 1 < vy.length) ? vy[i + 1] : vy[i];
        const dLeft = (litWindward ? 0.95 : -0.78) * contrast;
        const dRight = (litWindward ? -0.78 : 0.95) * contrast;
        // left face = triangle summit-leftSaddle-(foot below summit on valley line)
        // valley floor point under the summit (interp of the two saddles)
        const footY = (ly + ry) / 2 + peakH * 0.12;
        paperFacet([[lx, ly], [sx, sy], [sx, footY]], dLeft, sx, sy, lx, ly);
        paperFacet([[sx, sy], [rx, ry], [sx, footY]], dRight, sx, sy, rx, ry);
        // crisp lit ridge highlight along the windward flank
        if (litWindward) creaseHi(lx, ly, sx, sy, Math.max(1.3, W * 0.0018), 0.55 * contrast, pal.white);
        else creaseHi(sx, sy, rx, ry, Math.max(1.3, W * 0.0018), 0.55 * contrast, pal.white);
        // thin dark crease down the leeward flank
        if (litWindward) creaseLo(sx, sy, rx, ry, Math.max(1, W * 0.0013), 0.30 * contrast);
        else creaseLo(lx, ly, sx, sy, Math.max(1, W * 0.0013), 0.30 * contrast);
        // vertical fall-line crease from summit into the valley (paper fold spine)
        creaseLo(sx, sy, sx, footY, Math.max(1, W * 0.0011), 0.14 * contrast);
      }
      // 3) soft AO pooling in the saddles / valley floors
      x.save(); x.globalCompositeOperation = 'multiply';
      for (let i = 0; i < vx.length; i += 2) {
        const g = x.createRadialGradient(vx[i], vy[i] + peakH * 0.05, 0, vx[i], vy[i] + peakH * 0.05, peakH * 0.6);
        g.addColorStop(0, K.rgba(pal.ink, 0.24 * contrast));
        g.addColorStop(1, K.rgba(pal.ink, 0));
        x.fillStyle = g; x.fillRect(vx[i] - peakH * 0.6, vy[i] - peakH * 0.55, peakH * 1.2, peakH * 1.2);
      }
      x.restore();
      // 4) atmospheric tint to push a far range back
      if (tintMix > 0) { x.fillStyle = K.rgba(pal.air, tintMix); x.fillRect(0, Math.min(...vy) - 4, W, baseY - Math.min(...vy) + 8); }
      return { vx, vy };
    }

    // fill a facet poly with tone, plus subtle vertical gradient & fiber mottle
    function paperFacet(poly, d, hiX, hiY, loX, loY) {
      const tone = facet(pal, d);
      paperFill(poly, tone);
      // micro gradient down the facet for soft form
      x.save();
      x.beginPath();
      x.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) x.lineTo(poly[i][0], poly[i][1]);
      x.closePath();
      x.clip();
      const minY = Math.min(...poly.map(p => p[1])), maxY = Math.max(...poly.map(p => p[1]));
      const gg = x.createLinearGradient(0, minY, 0, maxY);
      gg.addColorStop(0, K.rgba(d >= 0 ? pal.white : pal.deep, d >= 0 ? 0.10 : 0.16));
      gg.addColorStop(1, K.rgba(pal.deep, 0.14));
      x.fillStyle = gg; x.fillRect(0, minY, W, maxY - minY);
      // paper fiber
      const bx = Math.min(...poly.map(p => p[0])), bw = Math.max(...poly.map(p => p[0])) - bx;
      K.mottle(x, bx, minY, bw, maxY - minY, tone, 30, r, 'overlay');
      x.restore();
    }

    // soft cast shadow strip below a ridgeline onto the band beneath it
    function ridgeShadow(xs, ys, drop, a) {
      x.save(); x.globalCompositeOperation = 'multiply';
      const g = x.createLinearGradient(0, 0, 0, drop);
      // built per-call below
      x.restore();
    }

    // ───────────────────────────────────────────────────────────────────────
    // MODES
    // ───────────────────────────────────────────────────────────────────────

    // shared: a folded horizon line (the sheet creases at the horizon)
    function horizon(hy, amp) {
      x.save();
      // sky-ward sheet slightly lighter, ground sheet slightly deeper
      // draw a soft crease shadow just under the horizon fold
      const g = x.createLinearGradient(0, hy - amp, 0, hy + amp * 3);
      g.addColorStop(0, K.rgba(pal.deep, 0));
      g.addColorStop(0.4, K.rgba(pal.deep, 0.30));
      g.addColorStop(1, K.rgba(pal.deep, 0));
      x.fillStyle = g; x.fillRect(0, hy - amp, W, amp * 4);
      // crisp lit line on the fold
      creaseHi(0, hy, W, hy, Math.max(1, W * 0.0012), 0.4, pal.white);
      x.restore();
    }

    if (mode === 'Folded Range') {
      const hy = H * (0.30 + r() * 0.24);            // horizon roams high↔low
      // overlapping origami ranges, far (high, hazy, low-contrast) → near (tall, crisp)
      const ranges = 3 + (r() * 4 | 0);              // 3..6 overlapping ranges
      const nearLow = 0.70 + r() * 0.30;             // how far down the nearest range sits
      const peakBase = 4 + (r() * 4 | 0);            // base peak count for the back range
      const contrastBias = 0.30 + r() * 0.35;        // overall crispness of the set
      for (let k = 0; k < ranges; k++) {
        const t = ranges > 1 ? k / (ranges - 1) : 1; // 0 far .. 1 near
        // each range's seat & height jittered so they don't stack on a fixed ladder
        const baseY = hy + (H - hy) * (0.06 + t * nearLow) * (0.85 + r() * 0.3);
        const peakH = (H - hy) * (0.24 + t * (0.45 + r() * 0.35)) + H * 0.04;
        const peaks = Math.max(2, (peakBase - k) + (r() * 3 | 0)); // fewer, broader toward front, jittered
        const contrast = contrastBias + t * (0.45 + r() * 0.3);
        const tint = (1 - t) * (0.10 + r() * 0.14);  // far ranges veiled, varying
        foldedRange(baseY, peakH, peaks, contrast, 0.5 + t * 0.5 + r() * 0.4, tint);
      }
      horizon(hy, H * 0.012);
    }

    else if (mode === 'Crumpled Valley') {
      // A continuous CRUSHED-PAPER terrain filling the frame: a perturbed grid
      // triangulated into connected facets, each shaded by its true surface
      // normal under the raking light → a basin of crumpled paper, a real place.
      const hy = H * (0.14 + r() * 0.26);   // creased horizon roams
      // upper sheet wash already painted; deepen toward the basin
      // grid density, crumple scale & jitter all vary so no two basins match
      const cols = 14 + (r() * 10 | 0);     // 14..23
      const rows = 11 + (r() * 8 | 0);      // 11..18
      const crScale = 95 + r() * 90;        // crumple wavelength (px)
      const crOff = r() * 40;               // independent crumple phase
      const jitAmt = 0.30 + r() * 0.35;     // grid-jitter strength
      const persp = 1.15 + r() * 0.5;       // perspective bunching exponent
      const reliefBias = 0.30 + r() * 0.25; // base relief floor
      const gx0 = -W * 0.06, gx1 = W * 1.06, gy0 = hy, gy1 = H * 1.04;
      // height field z (toward viewer = +). crumple = sharp ridged fbm.
      const Z = [], PX = [], PY = [];
      for (let j = 0; j <= rows; j++) {
        Z[j] = []; PX[j] = []; PY[j] = [];
        const tv = j / rows;
        for (let i = 0; i <= cols; i++) {
          const tu = i / cols;
          // perspective: rows bunch toward the horizon
          const yy = gy0 + (gy1 - gy0) * Math.pow(tv, persp);
          // jitter the grid so creases aren't axis-aligned
          const jx = (noise.fbm(i * 0.9 + seed + crOff, j * 0.9, 3)) * (W / cols) * jitAmt;
          const xx = gx0 + (gx1 - gx0) * tu + jx;
          // crumple height: ridged noise (abs) gives sharp paper creases
          let zf = 0, amp = 1, f = 1.4;
          for (let o = 0; o < 4; o++) { zf += amp * (1 - Math.abs(noise.noise2(xx / crScale * f + seed + crOff, yy / crScale * f))); amp *= 0.55; f *= 2.0; }
          PX[j][i] = xx; PY[j][i] = yy;
          Z[j][i] = zf * (reliefBias + tv * 1.1); // more relief toward viewer
        }
      }
      const zscale = Math.min(W, H) * (0.07 + r() * 0.07);
      // draw far→near so nearer facets overlap correctly
      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          // two triangles per quad; displace y by height for relief
          const A = [PX[j][i], PY[j][i] - Z[j][i] * zscale], a0 = Z[j][i];
          const B = [PX[j][i + 1], PY[j][i + 1] - Z[j][i + 1] * zscale], b0 = Z[j][i + 1];
          const C = [PX[j + 1][i], PY[j + 1][i] - Z[j + 1][i] * zscale], c0 = Z[j + 1][i];
          const D = [PX[j + 1][i + 1], PY[j + 1][i + 1] - Z[j + 1][i + 1] * zscale], d0 = Z[j + 1][i + 1];
          for (const [P, Q, R, zp, zq, zr] of [[A, B, C, a0, b0, c0], [B, D, C, b0, d0, c0]]) {
            // surface normal of the triangle in screen-space-with-height
            const ux = Q[0] - P[0], uy = Q[1] - P[1], uz = (zq - zp) * zscale;
            const vx2 = R[0] - P[0], vy2 = R[1] - P[1], vz = (zr - zp) * zscale;
            let nx = uy * vz - uz * vy2, ny = uz * vx2 - ux * vz, nz = ux * vy2 - uy * vx2;
            const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl;
            // light is raking: dot the in-plane normal with light direction
            const d = (nx * (-lightDir[0]) + ny * (-lightDir[1])) * 1.15;
            paperFacet([P, Q, R], K.clamp(d, -1, 1), 0, 0, 0, 0);
          }
        }
      }
      // emphasise the sharp crease ridges with thin lit/dark lines along high-z seams
      x.save(); x.lineCap = 'round';
      for (let j = 0; j <= rows; j++) for (let i = 0; i < cols; i++) {
        if (Z[j][i] > 0.85 && Z[j][i + 1] > 0.85) {
          const A = [PX[j][i], PY[j][i] - Z[j][i] * zscale], B = [PX[j][i + 1], PY[j][i + 1] - Z[j][i + 1] * zscale];
          creaseHi(A[0], A[1], B[0], B[1], Math.max(0.8, W * 0.001), 0.18, pal.white);
        }
      }
      x.restore();
      horizon(hy, H * 0.012);
    }

    else if (mode === 'Torn Horizon') {
      const hy = H * (0.26 + r() * 0.40);            // tear roams high↔low across the frame
      // lower folded land: a near origami range rising to the tear (height/peaks/crispness vary)
      foldedRange(H * (0.98 + r() * 0.10), (H - hy) * (0.80 + r() * 0.35) + H * 0.05,
                  3 + (r() * 4 | 0), 0.7 + r() * 0.4, 0.5 + r() * 0.5, 0);
      // THE RIP: a torn edge across the sheet revealing pure white beneath,
      // with a soft drop shadow making the upper sheet float above.
      const ripY = hy;
      const ripSlope = (r() - 0.5) * H * 0.22;        // the tear tilts, not dead-level
      const ripRough = H * (0.02 + r() * 0.07);       // jaggedness of the tear
      const ripFreq = 0.3 + r() * 0.6;                // tear wavelength
      const ripSeed = seed * 2 + r() * 50;
      const segs = 70;
      const top = [], crumbs = [];
      let yy = ripY;
      for (let i = 0; i <= segs; i++) {
        const tx = (i / segs) * W;
        const slope = ripSlope * (i / segs - 0.5) * 2; // linear tilt across width
        yy = ripY + slope + (noise.fbm(i * ripFreq + ripSeed, 5, 3)) * ripRough + (r() - 0.5) * H * 0.012;
        top.push([tx, yy]);
      }
      // white reveal band (the paper beneath)
      x.save();
      x.beginPath();
      x.moveTo(0, 0);
      for (const p of top) x.lineTo(p[0], p[1]);
      x.lineTo(W, 0); x.closePath();
      // upper sheet sits ABOVE the tear — paint it as a clean lit sheet
      const us = x.createLinearGradient(0, 0, 0, ripY);
      us.addColorStop(0, K.mix(pal.base, pal.lit, 0.34));
      us.addColorStop(1, pal.base);
      x.fillStyle = us; x.fill();
      x.restore();
      // drop shadow of the torn upper edge onto the white beneath
      x.save();
      x.beginPath();
      for (const p of top) x.lineTo(p[0], p[1]);
      x.lineTo(W, ripY + H * 0.06); x.lineTo(0, ripY + H * 0.06); x.closePath();
      x.clip();
      const ds = x.createLinearGradient(0, ripY - H * 0.01, 0, ripY + H * 0.06);
      ds.addColorStop(0, K.rgba(pal.ink, 0.0));
      // first paint the white reveal
      x.restore();
      // white reveal strip just below the tear (brightest in piece)
      x.save();
      x.beginPath();
      x.moveTo(0, top[0][1]);
      for (const p of top) x.lineTo(p[0], p[1]);
      // bottom of reveal = a second torn line lower down (band width varies per output)
      const revW = H * (0.03 + r() * 0.10);
      const revVar = H * (0.02 + r() * 0.05);
      const bot = [];
      for (let i = segs; i >= 0; i--) {
        const tx = (i / segs) * W;
        const by = top[i][1] + revW + revVar * ((noise.fbm(i * 0.4 + seed * 3, 2, 3) + 1) / 2);
        bot.push([tx, by]); x.lineTo(tx, by);
      }
      x.closePath();
      const rv = x.createLinearGradient(0, ripY, 0, ripY + H * 0.1);
      rv.addColorStop(0, pal.white);
      rv.addColorStop(1, K.mix(pal.white, pal.base, 0.4));
      x.fillStyle = rv; x.fill();
      x.restore();
      // crisp torn highlight on the upper lip + soft shadow it casts
      x.save();
      x.lineWidth = Math.max(1, W * 0.0014); x.lineJoin = 'round';
      x.strokeStyle = K.rgba(pal.white, 0.7);
      x.beginPath(); x.moveTo(top[0][0], top[0][1]); for (const p of top) x.lineTo(p[0], p[1]); x.stroke();
      x.strokeStyle = K.rgba(pal.ink, 0.22);
      x.beginPath(); x.moveTo(top[0][0], top[0][1] + 2.5); for (const p of top) x.lineTo(p[0], p[1] + 2.5); x.stroke();
      x.restore();
      // little torn fiber crumbs along the rip
      for (let i = 0; i < 40; i++) {
        const ti = (r() * segs) | 0; const p = top[ti];
        x.fillStyle = K.rgba(r() < 0.5 ? pal.white : pal.deep, 0.3 + r() * 0.3);
        x.fillRect(p[0] + (r() - 0.5) * 6, p[1] + (r() - 0.5) * 5, 1 + r() * 2, 1 + r() * 2);
      }
      horizon(0, 0); // (no-op visual safety)
    }

    else if (mode === 'Single Crease') {
      // one monumental fold dividing the sheet into two big planes, one lit one
      // shadowed, a single razor crease between. Minimal, intimate. The fold's
      // ORIENTATION roams: near-vertical, raking diagonal, or near-horizontal —
      // and it can bow, so two outputs never split the sheet the same way.
      // Entry point P0 on the TOP-or-LEFT edge, exit P1 on the BOTTOM-or-RIGHT.
      const orient = r();                    // 0..1 selects how the fold crosses
      let x0, y0, x1, y1;
      if (orient < 0.5) {                    // crosses top→bottom (vertical-ish/diagonal)
        x0 = W * (0.10 + r() * 0.55); y0 = 0;
        x1 = W * (0.30 + r() * 0.62); y1 = H;
      } else if (orient < 0.78) {            // crosses left→right (horizon-like fold)
        x0 = 0;                  y0 = H * (0.12 + r() * 0.52);
        x1 = W;                  y1 = H * (0.20 + r() * 0.58);
      } else {                               // corner diagonal (top-left → bottom-right span)
        x0 = W * (r() * 0.30);   y0 = H * (r() * 0.30);
        x1 = W * (0.70 + r() * 0.30); y1 = H * (0.70 + r() * 0.30);
      }
      // perpendicular bow so the fold curves rather than ruling straight
      const dxL = x1 - x0, dyL = y1 - y0, Llen = Math.hypot(dxL, dyL) || 1;
      const perp = [-dyL / Llen, dxL / Llen];
      const bow = (r() - 0.5) * Math.min(W, H) * 0.28;
      const bx = (x0 + x1) / 2 + perp[0] * bow, by = (y0 + y1) / 2 + perp[1] * bow;
      // quadratic-bezier sampler for the crease centreline
      const crv = (t) => {
        const u = 1 - t;
        return [u * u * x0 + 2 * u * t * bx + t * t * x1,
                u * u * y0 + 2 * u * t * by + t * t * y1];
      };
      // the two planes meet along the bowed crease — sample the curve as the seam
      const seam = []; const SN = 48;
      for (let i = 0; i <= SN; i++) seam.push(crv(i / SN));
      // plane A = everything on the start-edge side, plane B = the far side
      const A = [[0, 0]].concat(seam).concat([[0, H]]);
      const B = [[W, 0]].concat(seam.slice().reverse()).concat([[W, H]]);
      // which way the fold faces: normal ≈ perpendicular to the seam
      const ridge = r() < 0.55; // true = ridge (both lit-ish), false = valley
      const dA = (perp[0] * lightDir[0] + perp[1] * lightDir[1]) * (ridge ? 0.95 : 0.6);
      const dB = -dA;
      paperFacet(A, ridge ? Math.abs(dA) * 0.9 : -Math.abs(dA) * 0.7, 0, 0, 0, 0);
      paperFacet(B, ridge ? -Math.abs(dB) * 0.8 : Math.abs(dB) * 0.9, 0, 0, 0, 0);
      // big soft form gradient across the sheet for roundness near the crease
      x.save(); x.globalCompositeOperation = 'multiply';
      const cg = x.createLinearGradient(bx - perp[0] * W * 0.3, by - perp[1] * H * 0.3,
                                        bx + perp[0] * W * 0.3, by + perp[1] * H * 0.3);
      cg.addColorStop(0, K.rgba(pal.deep, ridge ? 0.0 : 0.28));
      cg.addColorStop(0.5, K.rgba(pal.deep, 0.0));
      x.fillStyle = cg; x.fillRect(0, 0, W, H);
      x.restore();
      // the crease: bright lit lip + dark valley line, hand-wavering
      x.save(); x.lineCap = 'round';
      const off = [perp[0] * 2, perp[1] * 2];
      for (let i = 1; i <= SN; i++) {
        const p = seam[i - 1], q = seam[i];
        x.strokeStyle = K.rgba(pal.white, ridge ? 0.6 : 0.3);
        x.lineWidth = Math.max(1.4, W * 0.0022);
        x.beginPath(); x.moveTo(p[0] + off[0], p[1] + off[1]); x.lineTo(q[0] + off[0], q[1] + off[1]); x.stroke();
        x.strokeStyle = K.rgba(pal.ink, ridge ? 0.32 : 0.5);
        x.lineWidth = Math.max(1.2, W * 0.0018);
        x.beginPath(); x.moveTo(p[0] - off[0], p[1] - off[1]); x.lineTo(q[0] - off[0], q[1] - off[1]); x.stroke();
      }
      x.restore();
      // a couple of faint secondary creases for tactility
      for (let i = 0; i < 2 + (r() * 2 | 0); i++) {
        const sx = W * r(), sy = H * r();
        creaseLo(sx, sy, sx + (r() - 0.5) * W * 0.4, sy + (r() - 0.5) * H * 0.3, 1, 0.08 + r() * 0.08);
      }
    }

    else if (mode === 'Pleated Field') {
      // a field of accordion pleats running TOWARD a vanishing point — vertical
      // fan-folds, lit slope vs shadow slope per pleat. The VANISHING POINT roams
      // freely (high/low horizon, far off to either side) and the foreground sweep
      // is asymmetric, so the fan never reads as the same centred starburst twice.
      const hy = H * (0.20 + r() * 0.28);                 // horizon roams
      const vpx = W * (0.12 + r() * 0.76);                // VP anywhere across width
      const vpy = hy - H * (r() * 0.12);                  // VP can lift above the fold line
      const groundTop = hy, groundBot = H;
      // base ground plane
      x.fillStyle = K.mix(pal.base, pal.deep, 0.12); x.fillRect(0, groundTop, W, groundBot - groundTop);
      // vertical pleats: each is a wedge from a foreground x to the vanishing pt
      const pleats = 12 + (r() * 16 | 0);                 // 12..27 pleats
      const litWindward = lightDir[0] < 0;
      const litStr = 0.55 + r() * 0.30;                   // crest contrast varies
      const shStr  = -(0.40 + r() * 0.30);
      // foreground sweep: left/right reach are independent → asymmetric fans
      const sweepL = W * (0.12 + r() * 0.30);             // how far past the left edge
      const sweepR = W * (0.12 + r() * 0.30);
      const fx0 = -sweepL, fxSpan = W + sweepL + sweepR;
      // gentle per-output bow of the foreground crest baseline (paper not flat)
      const fgBow = (r() - 0.5) * H * 0.06;
      for (let i = 0; i <= pleats; i++) {
        const t = i / pleats;
        const fxL = fx0 + fxSpan * (i / pleats);          // foreground left edge
        const fxR = fx0 + fxSpan * ((i + 1) / pleats);
        const fxM = (fxL + fxR) / 2;
        const gb = groundBot - fgBow * Math.sin(t * Math.PI); // bowed foreground line
        const crestFx = fxM;
        const litFx = litWindward ? fxL : fxR;
        const shFx  = litWindward ? fxR : fxL;
        // lit face
        paperFill([[litFx, gb], [crestFx, gb], [vpx, vpy]], facet(pal, litStr));
        // shadow face
        paperFill([[crestFx, gb], [shFx, gb], [vpx, vpy]], facet(pal, shStr));
        // crisp crest highlight from foreground to vanishing point
        creaseHi(crestFx, gb, vpx, vpy, Math.max(1, W * 0.0014), 0.42, pal.white);
        // valley shadow line on the seam
        creaseLo(shFx, gb, vpx, vpy, Math.max(1, W * 0.0011), 0.16);
      }
      // ground-fog gather near the horizon for depth
      const gf = x.createLinearGradient(0, hy - H * 0.02, 0, hy + H * 0.14);
      gf.addColorStop(0, K.rgba(pal.air, 0.55)); gf.addColorStop(1, K.rgba(pal.air, 0));
      x.fillStyle = gf; x.fillRect(0, hy - H * 0.02, W, H * 0.16);
      // fiber over the field
      K.mottle(x, 0, groundTop, W, groundBot - groundTop, pal.base, 34, r, 'overlay');
      horizon(hy, H * 0.012);
    }

    else { // Paper Sea — a rippled sheet of paper read as gentle ocean swell
      const hy = H * (0.18 + r() * 0.26);          // sea horizon roams high↔low
      // rippled rows of paper, each a sine-fold catching light on its crest
      const rows = 20 + (r() * 18 | 0);            // 20..37 swell rows
      const perspP = 1.10 + r() * 0.40;            // swell crowding toward horizon
      const ampBias = 0.7 + r() * 1.0;             // overall swell height character
      const baseFreq = 1.5 + r() * 2.5;            // dominant wavelength of the set
      const choppy = 1.2 + r() * 1.6;              // fbm distortion of the crests
      const drift = r() * 30;                      // crest noise phase drift
      for (let i = 0; i < rows; i++) {
        const t = i / rows;
        const yBase = hy + (H - hy) * Math.pow(t, perspP);
        const yBaseN = hy + (H - hy) * Math.pow((i + 1) / rows, perspP);
        const band = yBaseN - yBase;
        const amp = band * (0.5 + t * 1.4) * ampBias;
        const freq = baseFreq + (r() * 3 | 0) + t * 3;
        const ph = r() * 6.28;
        // build the wave crest line
        const pts = [];
        const seg = 90;
        for (let s = 0; s <= seg; s++) {
          const xx = (s / seg) * W;
          const yy = yBase + Math.sin((s / seg) * freq * 6.28 + ph + noise.fbm(xx / 120 + seed + drift, t * 4, 3) * choppy) * amp;
          pts.push([xx, yy]);
        }
        // fill the swell body down to the next row with a lit/shadow gradient
        x.save();
        x.beginPath();
        x.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts) x.lineTo(p[0], p[1]);
        x.lineTo(W, yBase + band * 1.6); x.lineTo(0, yBase + band * 1.6); x.closePath();
        const wg = x.createLinearGradient(0, yBase - amp, 0, yBase + band * 1.6);
        wg.addColorStop(0, facet(pal, 0.55 - t * 0.25));   // lit crest
        wg.addColorStop(0.5, pal.base);
        wg.addColorStop(1, facet(pal, -0.55 - t * 0.2));   // shadow trough
        x.fillStyle = wg; x.fill();
        x.restore();
        // crest highlight following the wave
        x.save(); x.lineCap = 'round'; x.lineJoin = 'round';
        x.strokeStyle = K.rgba(pal.white, 0.28 + t * 0.18);
        x.lineWidth = Math.max(1, W * 0.0012);
        x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (const p of pts) x.lineTo(p[0], p[1]); x.stroke();
        // trough shadow just under
        x.strokeStyle = K.rgba(pal.ink, 0.10 + t * 0.12);
        x.lineWidth = Math.max(1, W * 0.001);
        x.beginPath(); x.moveTo(pts[0][0], pts[0][1] + amp * 0.5 + 2); for (const p of pts) x.lineTo(p[0], p[1] + amp * 0.5 + 2); x.stroke();
        x.restore();
      }
      horizon(hy, H * 0.012);
    }

    // ── upper sheet sky atmosphere for horizon modes (soft, paper-pale) ──
    // (already painted by base wash; add a faint warm bloom toward the light up high)
    if (mode === 'Folded Range' || mode === 'Pleated Field' || mode === 'Paper Sea') {
      // bloom anchored to the lit side but its height & spread roam per output
      const bloomX = lightSide < 0 ? W * (0.08 + r() * 0.18) : W * (0.74 + r() * 0.18);
      const bloomY = H * (0.06 + r() * 0.22);
      K.bloom(x, bloomX, bloomY, Math.min(W, H) * (0.32 + r() * 0.24), warmCast, 0.10 + r() * 0.10);
    }

    // ───────────────────────────────────────────────────────────────────────
    // GLOBAL GRADE: haze, surface mottle, fiber grain, vignette
    // ───────────────────────────────────────────────────────────────────────
    // volumetric paper-dust haze (warm, soft)
    K.hazeSheet(x, W, H, noise, pal.air, 0.20, Math.min(W, H) * 0.95, 'screen');
    // a second, cooler micro-haze in the shadow valleys for depth
    K.hazeSheet(x, W, H, noise, K.mix(pal.deep, pal.air, 0.5), 0.10, Math.min(W, H) * 0.4, 'multiply');
    // overall paper-fiber mottle across the whole sheet
    K.mottle(x, 0, 0, W, H, pal.base, 22, r, 'overlay');
    // faint long fiber striations (laid-paper feel)
    x.save(); x.globalCompositeOperation = 'overlay';
    for (let i = 0; i < W / 14; i++) {
      const lx = r() * W;
      x.strokeStyle = K.rgba(r() < 0.5 ? pal.white : pal.deep, 0.025 + r() * 0.03);
      x.lineWidth = 0.7;
      x.beginPath(); x.moveTo(lx, 0); x.lineTo(lx + (r() - 0.5) * 30, H); x.stroke();
    }
    x.restore();
    // film grain + seat with a soft vignette (focus strength roams per output)
    K.grain(x, W, H, 6, r);
    K.vignette(x, W, H, 0.18 + r() * 0.16);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Wide' : 'Square';
    const light = r() < 0.5 ? 'Light from Left' : 'Light from Right';
    return { Palette: pal.name, Mode: mode, Format: f, Light: light };
  }

  return { name: 'h4_papercountry', draw, traits };
})();


export const paperCountryTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderPaperCountry: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const PAPERCOUNTRY_ASPECTS: readonly number[] = [1.5006,1];
export const paperCountrySchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Blush Vellum",
        "Bone Pleat",
        "Graphite Chalk",
        "Slate Newsprint",
        "Deckle Cream",
        "Ivory Studio"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Torn Horizon",
        "Single Crease",
        "Pleated Field",
        "Paper Sea",
        "Folded Range",
        "Crumpled Valley"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Wide",
        "Square"
      ]
    },
    {
      "name": "Light",
      "values": [
        "Light from Right",
        "Light from Left"
      ]
    }
  ]
};
