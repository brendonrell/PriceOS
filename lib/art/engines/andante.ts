// @ts-nocheck
/*
 * Andante — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/b_andante.js). Continuous seed-driven composition. Deterministic
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


/* ANDANTE — a playful balanced CONSTELLATION of pure abstract shapes.
 * Non-objective: circles, concentric rings, triangles, arcs, checkerboard
 * scraps, radiating line-fans and points scattered in lively dynamic
 * equilibrium. Kandinsky / Bauhaus lyricism — musical, weightless, joyful —
 * but the composition is its own. DEPICTS NOTHING: no scene, horizon, object.
 *
 * Palette world: WARM CREAM + JEWELS. Soft ground; curated jewel accents —
 * cobalt, magenta, viridian, gold, black. Lively but composed, never garish.
 *
 * Surface is NOT flat clip-art: every shape carries printed-ink mottle, the
 * ground has paper tooth + grain, shapes have slightly imperfect hand edges,
 * and the whole frame gets a faint haze wash + vignette grade — like a fine
 * screenprint / risograph.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;
  const TAU = Math.PI * 2;

  /* Six bespoke palettes — all in the warm-cream + jewels world, but each a
     different temperature/mood so the SET reads varied, not one look reskinned.
     `ground` = soft paper; `inks` = the weighted jewel set drawn from; `ink`
     = the near-black line/point colour; some palettes lean rare (sparse, or
     near-monochrome jewel) on purpose. */
  /* DARK SIGNATURE LANE: this project reads DARK across the room. The dominant
     grounds are deep charcoal / indigo / aubergine / pine-black, with the jewel
     forms GLOWING on them. `ink` is the line/point colour — on dark grounds it
     must be a warm PALE so threads, points & the near-black jewel slot still
     read (chiaroscuro preserved); on the two retained cream grounds it stays a
     true near-black. The lead jewels are pushed brighter/lighter where needed
     so they sing on charcoal rather than sink. 4 dark + 2 cream. */
  const PALS = [
    { name: 'Andante',     ground: '#201b24', tooth: '#171320', ink: '#efe6d2',
      inks: ['#3f73e0', '#3f73e0', '#e0476a', '#e2bb4e', '#3fb08e', '#efe6d2'] },        // charcoal-indigo ground, bright jewel chord
    { name: 'Cobalt Largo',ground: '#16203c', tooth: '#0f1830', ink: '#e6ecf6',
      inks: ['#3f7be6', '#3f7be6', '#6aa0f0', '#e2bb4e', '#d4577e', '#e6ecf6'] },         // deep indigo ground, cobalt-led glow
    { name: 'Garnet Aria', ground: '#2a1622', tooth: '#1f0f19', ink: '#f1e0d4',
      inks: ['#e0476a', '#e0476a', '#f08aa2', '#e2bb4e', '#3f9fb0', '#f1e0d4'] },         // aubergine ground, garnet/rose glow
    { name: 'Viridian Air',ground: '#10231f', tooth: '#0a1813', ink: '#e9ecdf',
      inks: ['#3fb08e', '#3fb08e', '#6fd0ad', '#e2bb4e', '#5a86e0', '#e9ecdf'] },         // pine-black ground, viridian + gold glow
    { name: 'Gilt Nocturne',ground: '#f3ecdc', tooth: '#e9dcc2', ink: '#2c2630',
      inks: ['#9a7414', '#9a7414', '#c79a2e', '#b8233f', '#2f5fb0', '#5a4a2a'] },         // RARE cream: gilt-led ink on warm cream
    { name: 'Ivory Etude', ground: '#f3ecdc', tooth: '#e9dcc2', ink: '#2c2630',
      inks: ['#2c2630', '#2c2630', '#1b3f9e', '#b8233f', '#c79a2e', '#a89880'] },         // RARE cream: quiet near-monochrome ink
  ];

  const MODES = ['Suspension', 'Cadenza', 'Counterpoint', 'Crescendo', 'Rondo', 'Interval'];
  // Aspect is now CONTINUOUS (see draw): this list only drives the traits read.
  const FORMATS = [[1040, 1280], [1180, 1180], [1280, 1040]]; // portrait / square / landscape

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  /* Hex hue/sat/lum jitter inside the palette WORLD — moves a jewel's exact
     VALUE off its catalogue point (warmer/cooler, lighter/darker) without
     leaving the cream+jewels world. `amt` 0..1 scales the wander. This is what
     keeps two same-palette pieces from sharing identical colour values. */
  function jitterHex(hex, r, amt) {
    const c = K.h2r(hex);
    const max = Math.max(c[0], c[1], c[2]) / 255, min = Math.min(c[0], c[1], c[2]) / 255;
    const l = (max + min) / 2;
    let h, s; const d = max - min;
    if (d < 1e-4) { h = 0; s = 0; }
    else {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      const rr = c[0] / 255, gg = c[1] / 255, bb = c[2] / 255;
      if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0));
      else if (max === gg) h = (bb - rr) / d + 2; else h = (rr - gg) / d + 4;
      h *= 60;
    }
    const hh = h + (r() - 0.5) * 26 * amt;
    const ss = K.clamp(s * (1 + (r() - 0.5) * 0.5 * amt), 0, 1);
    const ll = K.clamp(l + (r() - 0.5) * 0.16 * amt, 0.04, 0.96);
    return K.hsl2hex(hh, ss, ll);
  }

  /* weighted jewel pick — first colour (doubled in `inks`) is the lead hue, so
     each palette has a dominant jewel + supporting accents (restraint).
     `jit` (optional) jitters the picked value within the palette world. */
  function inkOf(pal, r, jit) {
    const base = pal.inks[Math.floor(r() * pal.inks.length)];
    return jit ? jitterHex(base, r, jit) : base;
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const pal = pickPal(r);
    const dark = K.lum(pal.ground) < 0.4;

    const mode = K.pick(MODES, r);
    K.pick(FORMATS, r); // consume one draw to keep traits()'s rng order aligned (format is now continuous)

    // ── CONTINUOUS GLOBAL KNOBS — every salient axis varies smoothly with seed,
    //    de-correlated from palette & mode so two same-family pieces diverge hard.
    // Continuous aspect: a smooth sweep portrait↔landscape, not 3 buckets.
    const aspect = 0.72 + r() * 0.78;                 // 0.72 (tall) .. 1.50 (wide)
    const base = 1180;
    let W = Math.round(base * Math.sqrt(aspect)), H = Math.round(base / Math.sqrt(aspect));
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    const gScale  = 0.7  + r() * 0.66;                 // global form-size multiplier (small intimate .. large bold)
    const gDens   = 0.6  + r() * 0.95;                 // member-count multiplier (airy .. busy)
    const gRot    = (r() - 0.5) * 0.42;                // whole-composition tilt (rad)
    const gZoom   = 0.88 + r() * 0.22;                 // crop: <1 pull back, >1 push in (bounded so mass stays framed)
    const gPanX   = (r() - 0.5) * 0.13;                // off-centre crop pan
    const gPanY   = (r() - 0.5) * 0.13;
    const gAsym   = 0.5 + (r() - 0.5) * 0.56;          // focal placement bias 0.22..0.78 across frame
    const gJit    = 0.55 + r() * 0.45;                 // colour-VALUE jitter strength within palette world
    const cnt = (n) => Math.max(2, Math.round(n * gDens)); // density-scaled integer count helper
    // jittered jewel pick bound to this piece's colour-wander strength
    const ink = (rr) => inkOf(pal, rr || r, gJit);

    // ── GROUND: warm paper with a faint tonal gradient + tooth so it never reads flat ──
    const gg = x.createLinearGradient(0, 0, W * 0.3, H);
    gg.addColorStop(0, K.mix(pal.ground, '#ffffff', dark ? 0.0 : 0.05));
    gg.addColorStop(1, K.mix(pal.ground, dark ? '#000000' : pal.tooth, dark ? 0.25 : 0.55));
    x.fillStyle = gg; x.fillRect(0, 0, W, H);
    K.mottle(x, 0, 0, W, H, pal.tooth, 38, r, 'multiply');     // paper tooth
    // a couple of very soft warm/cool washes for atmosphere (no object read)
    K.bloom(x, W * (0.12 + r() * 0.4), H * (0.16 + r() * 0.42), S * (0.55 + r() * 0.4), K.mix(pal.ground, pal.inks[3], 0.5), dark ? 0.06 : 0.05);
    K.bloom(x, W * (0.55 + r() * 0.38), H * (0.55 + r() * 0.38), S * (0.55 + r() * 0.4), K.mix(pal.ground, pal.inks[0], 0.5), dark ? 0.06 : 0.045);

    // ── GLOBAL COMPOSITION TRANSFORM: rotate + zoom/pan the whole shape field so
    //    crop, framing and orientation vary continuously. Ground & final grade
    //    stay in screen space; only the constellation lives under this transform. */
    x.save();
    x.translate(W / 2 + gPanX * W, H / 2 + gPanY * H);
    x.scale(gZoom, gZoom);
    x.rotate(gRot);
    x.translate(-W / 2, -H / 2);

    // ── hand-edge helpers ─────────────────────────────────────────────────
    // jitter a point slightly off its ideal — wobble for imperfect edges
    function jx(px, py, amt) { const n = noise.noise2(px / 40, py / 40); return amt * n; }

    function inkFill(c, a) { x.fillStyle = K.rgba(c, a == null ? 1 : a); }

    // textured printed disc (filled circle with ink mottle + wobble)
    function disc(cx, cy, rad, c, a) {
      x.save();
      x.beginPath();
      const steps = 48;
      for (let i = 0; i <= steps; i++) {
        const ang = (i / steps) * TAU;
        const w = 1 + 0.012 * noise.noise2(Math.cos(ang) * rad / 22 + cx / 80, Math.sin(ang) * rad / 22 + cy / 80);
        const px = cx + Math.cos(ang) * rad * w, py = cy + Math.sin(ang) * rad * w;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
      inkFill(c, a); x.fill();
      x.clip();
      K.mottle(x, cx - rad, cy - rad, rad * 2, rad * 2, c, 30, r, 'multiply');
      // a faint inner light edge for printed-ink depth
      const ig = x.createRadialGradient(cx - rad * 0.3, cy - rad * 0.3, 0, cx, cy, rad);
      ig.addColorStop(0, K.rgba(K.mix(c, '#ffffff', 0.18), 0.18));
      ig.addColorStop(0.6, 'rgba(0,0,0,0)');
      x.fillStyle = ig; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
      x.restore();
    }

    // concentric rings — open circles (key Kandinsky motif)
    function rings(cx, cy, rad, n, cols) {
      x.save();
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1 || 1);
        const rr = rad * (1 - t * 0.78);
        x.beginPath();
        const steps = 40;
        for (let s = 0; s <= steps; s++) {
          const ang = (s / steps) * TAU;
          const w = 1 + 0.018 * noise.noise2(Math.cos(ang) * rr / 18 + cx, Math.sin(ang) * rr / 18 + cy);
          const px = cx + Math.cos(ang) * rr * w, py = cy + Math.sin(ang) * rr * w;
          if (s === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.closePath();
        if (i === n - 1 && r() < 0.6) { inkFill(cols[i % cols.length], 0.96); x.fill(); }
        else { x.lineWidth = rad * (0.035 + r() * 0.03); x.strokeStyle = K.rgba(cols[i % cols.length], 0.95); x.stroke(); }
      }
      x.restore();
    }

    // textured triangle
    function tri(cx, cy, rad, rot, c, a) {
      x.save();
      x.beginPath();
      for (let i = 0; i < 3; i++) {
        const ang = rot + i * (TAU / 3);
        const px = cx + Math.cos(ang) * rad + jx(cx + i, cy, rad * 0.02);
        const py = cy + Math.sin(ang) * rad + jx(cy, cx + i, rad * 0.02);
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath(); inkFill(c, a == null ? 0.96 : a); x.fill();
      x.clip(); K.mottle(x, cx - rad, cy - rad, rad * 2, rad * 2, c, 28, r, 'multiply');
      x.restore();
    }

    // arc / open crescent stroke
    function arc(cx, cy, rad, a0, a1, wdt, c) {
      x.save();
      x.lineCap = 'round';
      x.lineWidth = wdt; x.strokeStyle = K.rgba(c, 0.95);
      x.beginPath(); x.arc(cx, cy, rad, a0, a1); x.stroke();
      x.restore();
    }

    // checkerboard scrap (a small grid of alternating jewel/ground squares, rotated)
    function checker(cx, cy, sz, cols2, rot) {
      x.save(); x.translate(cx, cy); x.rotate(rot);
      const n = 3 + (r() * 2 | 0);
      const cell = sz / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        if ((i + j) % 2 === 0) {
          const c = cols2[(i * j) % cols2.length];
          inkFill(c, 0.95);
          x.fillRect(-sz / 2 + i * cell, -sz / 2 + j * cell, cell + 0.6, cell + 0.6);
        }
      }
      x.restore();
    }

    // radiating line-fan (a burst of thin lines from a point — "rays").
    // `full` (spread>=TAU) makes an even sunburst; otherwise a directional fan.
    function rays(cx, cy, rad, n, c, spread, dir) {
      x.save(); x.lineCap = 'round';
      const full = spread >= TAU - 0.01;
      for (let i = 0; i < n; i++) {
        const ang = full ? dir + (i / n) * TAU : dir + (i / (n - 1 || 1) - 0.5) * spread;
        x.lineWidth = S * (0.0032 + r() * 0.0025);
        x.strokeStyle = K.rgba(c, 0.82);
        const r0 = rad * (0.16 + r() * 0.08), r1 = rad * (0.62 + r() * 0.32);
        x.beginPath();
        x.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
        x.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
        x.stroke();
      }
      x.restore();
    }

    // a thin connective line between two nodes (gives the "constellation" weave)
    function thread(x0, y0, x1, y1, c, w) {
      x.save(); x.lineCap = 'round';
      x.lineWidth = w; x.strokeStyle = K.rgba(c, 0.5);
      x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
      x.restore();
    }

    // small solid point / dot cluster
    function point(cx, cy, rad, c) { disc(cx, cy, rad, c, 0.96); }

    // soft contact shadow under a form for floating depth
    function lift(cx, cy, rad) { if (!dark) K.softShadow(x, cx + rad * 0.12, cy + rad * 0.16, rad * 1.5, 0.10); }

    // ── a generic "constellation member" placed at a node ──────────────────
    function placeShape(cx, cy, scale, lead) {
      const kind = r();
      const c = r() < 0.66 ? jitterHex(lead, r, gJit) : ink(r);
      const sc = scale * gScale;
      lift(cx, cy, sc);
      if (kind < 0.30) { disc(cx, cy, sc * (0.82 + r() * 0.4), c, 0.96); }
      else if (kind < 0.48) { rings(cx, cy, sc, 2 + (r() * 3 | 0), [c, ink(r), pal.ink]); }
      else if (kind < 0.62) { tri(cx, cy, sc * (0.95 + r() * 0.5), r() * TAU, c); }
      else if (kind < 0.74) { arc(cx, cy, sc, r() * TAU, r() * TAU + Math.PI * (0.6 + r() * 1.1), sc * (0.12 + r() * 0.16), c); }
      else if (kind < 0.85) { checker(cx, cy, sc * (1.2 + r() * 0.7), [c, pal.ink, ink(r)], r() * TAU); }
      else if (kind < 0.94) { rays(cx, cy, sc * (1.4 + r() * 0.7), 4 + (r() * 7 | 0), c, 0.5 + r() * 1.3, r() * TAU); }
      else { point(cx, cy, sc * (0.4 + r() * 0.25), pal.ink); }
    }

    const lead = jitterHex(pal.inks[0], r, gJit * 0.7); // hero hue, value-jittered within world

    // global text/value tracking: we want ONE clear focal hero + supporting cast.
    let nodes = [];

    // ────────────────────────────────────────────────────────────────────────
    // MODE COMPOSITIONS — genuinely different STRUCTURES, not one layout recolour
    // ────────────────────────────────────────────────────────────────────────
    if (mode === 'Suspension') {
      // weightless scatter in dynamic equilibrium around an off-centre focal disc.
      const fx = W * (0.22 + gAsym * 0.56), fy = H * (0.22 + (1 - gAsym) * 0.56 + (r() - 0.5) * 0.18);
      const fr = S * (0.11 + r() * 0.11) * gScale;
      const verticalSquash = 0.78 + r() * 0.4; // anisotropic scatter so the cloud isn't always round
      // halo rays behind hero (sometimes absent for variety)
      if (r() < 0.85) rays(fx, fy, fr * (2.0 + r() * 0.9), cnt(8 + (r() * 8 | 0)), K.mix(lead, pal.ground, 0.3 + r() * 0.2), TAU, r() * TAU);
      const N = cnt(8 + (r() * 7 | 0));
      const spreadMin = 1.3 + r() * 0.7, spreadRng = 1.6 + r() * 2.4;
      for (let i = 0; i < N; i++) {
        const ang = r() * TAU, dist = fr * (spreadMin + r() * spreadRng);
        const cx = fx + Math.cos(ang) * dist, cy = fy + Math.sin(ang) * dist * verticalSquash;
        if (cx < S * 0.04 || cx > W - S * 0.04 || cy < S * 0.04 || cy > H - S * 0.04) continue;
        nodes.push([cx, cy]);
        placeShape(cx, cy, S * (0.028 + r() * 0.085), ink(r));
      }
      // a few connective threads
      const threadP = 0.18 + r() * 0.32;
      for (let i = 0; i < nodes.length; i++) if (r() < threadP) thread(fx, fy, nodes[i][0], nodes[i][1], pal.ink, S * (0.003 + r() * 0.003));
      lift(fx, fy, fr);
      rings(fx, fy, fr, 3 + (r() * 3 | 0), [lead, ink(r), pal.ink]);

    } else if (mode === 'Cadenza') {
      // a sweeping diagonal RUN of shapes — a line of music carried across frame.
      const a0 = (r() < 0.5 ? -1 : 1) * (0.28 + r() * 0.85);   // wider angle range
      const cxs = W * (0.5 + (r() - 0.5) * 0.26), cys = H * (0.5 + (r() - 0.5) * 0.26); // off-centre run
      const dx = Math.cos(a0), dy = Math.sin(a0);
      const N = cnt(6 + (r() * 6 | 0)), span = S * (0.72 + r() * 0.62);
      const wobAmp = (0.04 + r() * 0.16) * (r() < 0.25 ? -1 : 1); // curvature sign + strength varies
      const wobFreq = 0.3 + r() * 0.8;
      const peak = 0.2 + r() * 0.6;                              // where the run swells (not always middle)
      let prev = null;
      // a long guide arc/stave behind the run (sometimes omitted)
      if (r() < 0.8) arc(cxs - dx * span * (0.1 + r() * 0.2), cys - dy * span * (0.1 + r() * 0.2), span * (0.78 + r() * 0.3), a0 - (1.0 + r() * 0.5), a0 + (1.0 + r() * 0.5), S * (0.007 + r() * 0.008), K.mix(pal.ink, pal.ground, 0.25 + r() * 0.2));
      for (let i = 0; i < N; i++) {
        const t = (i / (N - 1)) - 0.5;
        const wob = noise.fbm(i * wobFreq, seed, 3) * S * wobAmp;
        const cx = cxs + dx * t * span - dy * wob;
        const cy = cys + dy * t * span + dx * wob;
        const swell = Math.max(0, 1 - Math.abs((i / (N - 1)) - peak) * 2.2);
        const sc = S * (0.035 + swell * (0.06 + r() * 0.08) + r() * 0.025);
        if (prev) thread(prev[0], prev[1], cx, cy, pal.ink, S * (0.003 + r() * 0.003));
        placeShape(cx, cy, sc, i % 2 ? lead : ink(r));
        prev = [cx, cy];
      }

    } else if (mode === 'Counterpoint') {
      // two opposing CLUSTERS in tension, bridged by threads — call & response.
      // both poles, their sizes, the gap and the bridge are fully continuous.
      const ax = W * (0.2 + gAsym * 0.26), ay = H * (0.22 + r() * 0.28);
      const bx = W * (0.56 + (1 - gAsym) * 0.24), by = H * (0.5 + r() * 0.28);
      const sizeBias = 0.5 + (r() - 0.5) * 0.9;  // which pole is the heavier voice
      function cluster(cx, cy, lead2, weight) {
        const fr = S * (0.07 + weight * 0.1 + r() * 0.03) * gScale;
        lift(cx, cy, fr);
        rings(cx, cy, fr, 2 + (r() * 3 | 0), [lead2, ink(r), pal.ink]);
        const M = cnt(3 + (r() * 5 | 0));
        const spread = 1.3 + r() * 1.6, squash = 0.75 + r() * 0.5;
        for (let i = 0; i < M; i++) {
          const ang = r() * TAU, d = fr * (spread + r() * 1.4);
          const px = cx + Math.cos(ang) * d, py = cy + Math.sin(ang) * d * squash;
          placeShape(px, py, S * (0.026 + r() * 0.05), ink(r));
        }
      }
      // bridge threads — count, reach and fan all vary
      const bridges = 2 + (r() * 4 | 0), reach = 0.18 + r() * 0.22;
      for (let i = 0; i < bridges; i++) {
        const t = bridges > 1 ? i / (bridges - 1) : 0.5;
        const j = (t - 0.5) * (0.06 + r() * 0.08); // slight bowing of the bundle
        thread(ax + (bx - ax) * (reach) - (by - ay) * j, ay + (by - ay) * (reach) + (bx - ax) * j,
               bx - (bx - ax) * (reach) - (by - ay) * j, by - (by - ay) * (reach) + (bx - ax) * j,
               pal.ink, S * (0.003 + r() * 0.003));
      }
      cluster(ax, ay, lead, sizeBias);
      cluster(bx, by, ink(r), 1 - sizeBias);
      // a lone counter-shape in an open quadrant (position varies widely)
      placeShape(W * (0.32 + r() * 0.38), H * (0.68 + r() * 0.18), S * (0.04 + r() * 0.045), ink(r));

    } else if (mode === 'Crescendo') {
      // scale ramp along a gentle rising/falling curve: tiny points growing into
      // big forms — implied build/motion. The loud end carries the ringed hero.
      const fromLeft = r() < 0.5;
      const yStart = 0.4 + r() * 0.4, yEnd = 0.28 + r() * 0.4; // ramp baseline & crest vary freely
      const y0 = H * yStart, y1 = H * yEnd;
      const N = cnt(7 + (r() * 6 | 0));
      const xLo = 0.07 + r() * 0.1, xSpan = 0.62 + r() * 0.18;   // run reach varies
      const curveAmp = (0.02 + r() * 0.08) * (r() < 0.5 ? 1 : -1); // sag/arch of the path
      const growPow = 1.6 + r() * 1.2;                            // how explosive the scale build is
      let prev = null;
      const hxT = fromLeft ? (0.78 + r() * 0.12) : (0.1 + r() * 0.12);
      for (let i = 0; i < N - 1; i++) {
        const t = i / (N - 1);
        const tt = fromLeft ? t : 1 - t;
        const cx = W * (xLo + tt * xSpan);
        const cy = (y0 + (y1 - y0) * t) + Math.sin(t * Math.PI + seed) * H * curveAmp;
        const sc = S * (0.015 + Math.pow(t, growPow) * (0.09 + r() * 0.05)) * gScale;
        if (prev) thread(prev[0], prev[1], cx, cy, pal.ink, S * 0.0025 + sc * 0.02);
        // keep the ramp to compact members so the hero clearly wins
        const k = r();
        if (k < 0.4) point(cx, cy, sc * (0.6 + r() * 0.3), t > 0.5 ? lead : pal.ink);
        else if (k < 0.65) disc(cx, cy, sc, t > 0.5 ? lead : ink(r), 0.96);
        else if (k < 0.85) tri(cx, cy, sc * 1.1, r() * TAU, ink(r));
        else rings(cx, cy, sc, 2 + (r() * 2 | 0), [lead, ink(r), pal.ink]);
        prev = [cx, cy];
      }
      // crowning ringed hero at the loud end with an integrated, contained sunburst
      const hx = W * hxT, hy = y1 + (r() - 0.5) * H * 0.06;
      const hr = S * (0.11 + r() * 0.05) * gScale;
      rays(hx, hy, hr * (1.6 + r() * 0.5), 11 + (r() * 7 | 0), K.mix(lead, pal.ground, dark ? 0.18 + r() * 0.1 : 0.4 + r() * 0.12), TAU, r() * TAU);
      lift(hx, hy, hr);
      rings(hx, hy, hr, 3 + (r() * 3 | 0), [lead, ink(r), pal.ink]);
      if (prev) thread(prev[0], prev[1], hx, hy, pal.ink, S * 0.006);

    } else if (mode === 'Rondo') {
      // a recurring RING of members around a centre — circular theme & returns.
      const cx = W * (0.5 + (r() - 0.5) * 0.22), cy = H * (0.5 + (r() - 0.5) * 0.22);
      const R = S * (0.24 + r() * 0.14) * gZoom;       // orbit radius varies (with a little crop coupling)
      const ell = 0.72 + r() * 0.5;                    // ellipticity: round .. oval orbit
      const ellRot = r() * TAU;                        // oval's own tilt
      const N = cnt(5 + (r() * 6 | 0));
      const rot0 = r() * TAU;
      const wobR = 0.06 + r() * 0.14;
      // the orbit (sometimes a full ring, sometimes a broken arc)
      const broken = r() < 0.35;
      const oa0 = broken ? r() * TAU : 0, oa1 = broken ? oa0 + TAU * (0.55 + r() * 0.35) : TAU;
      x.save(); x.translate(cx, cy); x.rotate(ellRot);
      arc(0, 0, R, oa0, oa1, S * (0.004 + r() * 0.005), K.mix(pal.ink, pal.ground, 0.35 + r() * 0.15));
      x.restore();
      const pts = [];
      const ptRot = ellRot;
      for (let i = 0; i < N; i++) {
        const ang = rot0 + (i / N) * TAU + (noise.noise2(i, seed) * 0.3);
        const rr = R * (1 + noise.noise2(i * 2, seed) * wobR);
        const lx = Math.cos(ang) * rr, ly = Math.sin(ang) * rr * ell;
        const px = cx + lx * Math.cos(ptRot) - ly * Math.sin(ptRot);
        const py = cy + lx * Math.sin(ptRot) + ly * Math.cos(ptRot);
        pts.push([px, py]);
        placeShape(px, py, S * (0.032 + r() * 0.055), i % 2 ? lead : ink(r));
      }
      // connect consecutive members (sometimes skip the closing link to break symmetry)
      const closeRing = r() < 0.7;
      for (let i = 0; i < pts.length - (closeRing ? 0 : 1); i++) thread(pts[i][0], pts[i][1], pts[(i + 1) % pts.length][0], pts[(i + 1) % pts.length][1], pal.ink, S * (0.003 + r() * 0.0025));
      // a quiet centre (occasionally empty for an open eye)
      if (r() < 0.85) placeShape(cx, cy, S * (0.05 + r() * 0.06), lead);

    } else { // Interval — sparse, high-negative-space; a few deliberate forms with lots of air
      const N = 4 + (r() * 3 | 0);
      // composed-emptiness slots, each with a wide jitter so no two layouts lock up
      const slots = [
        [W * (0.18 + r() * 0.22), H * (0.2 + r() * 0.2)],
        [W * (0.6 + r() * 0.24), H * (0.54 + r() * 0.24)],
        [W * (0.4 + r() * 0.3), H * (0.38 + r() * 0.28)],
        [W * (0.66 + r() * 0.2), H * (0.16 + r() * 0.18)],
        [W * (0.16 + r() * 0.18), H * (0.64 + r() * 0.22)],
        [W * (0.46 + r() * 0.2), H * (0.74 + r() * 0.16)],
      ];
      const chosen = K.shuffle(slots, r).slice(0, N);
      // one big hero, rest small — strong value/scale hierarchy
      chosen.forEach((p, i) => {
        const sc = (i === 0 ? S * (0.13 + r() * 0.08) : S * (0.035 + r() * 0.06)) * gScale;
        if (i === 0) { lift(p[0], p[1], sc); rings(p[0], p[1], sc, 3 + (r() * 3 | 0), [lead, ink(r), pal.ink]); }
        else placeShape(p[0], p[1], sc, ink(r));
      });
      // a single long elegant thread linking the hero to a far member (no arc —
      // a bowl arc under the rings reads as a face; a straight line stays abstract)
      if (chosen.length >= 2) {
        const a = chosen[0], b = chosen[1];
        thread(a[0], a[1], b[0], b[1], pal.ink, S * (0.003 + r() * 0.002));
        // a small free crescent placed AWAY from the hero, on its own
        const fa = r() * TAU;
        const fd = S * (0.08 + r() * 0.1);
        const ax2 = b[0] + Math.cos(fa) * fd, ay2 = b[1] + Math.sin(fa) * fd;
        arc(ax2, ay2, S * (0.04 + r() * 0.04), fa - (0.8 + r() * 0.5), fa + (0.9 + r() * 0.6), S * (0.01 + r() * 0.01), ink(r));
      }
      // a sprinkle of tiny points for rhythm
      for (let i = 0; i < cnt(4 + (r() * 4 | 0)); i++) point(W * (0.1 + r() * 0.8), H * (0.1 + r() * 0.8), S * (0.007 + r() * 0.011), pal.ink);
    }

    x.restore(); // end global composition transform — grade applies in screen space

    // ── ATMOSPHERE & TEXTURE GRADE (the screenprint feel) ─────────────────
    // faint coloured haze sheet tying everything into one air
    const hazeCol = K.mix(pal.ground, pal.inks[r() < 0.5 ? 0 : 3], 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, dark ? 0.10 : 0.085, S * 0.85, dark ? 'screen' : 'multiply');
    // a whisper of overall warm bloom for cohesion
    K.bloom(x, W * 0.5, H * 0.42, S * 1.1, K.mix(pal.ground, '#ffffff', dark ? 0.0 : 0.4), dark ? 0.04 : 0.05);
    // printed-ink registration grain + paper grain
    K.grain(x, W, H, 4.2, r);
    K.vignette(x, W, H, dark ? 0.5 : 0.30);

    return { aspect: W / H };
  }

  function traits(seed) {
    // MUST mirror draw()'s rng draw order exactly: pal → mode → (format pick) →
    // aspect → gScale → gDens. Anything past that doesn't affect the traits read.
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    K.pick(FORMATS, r);                       // consumed in draw too (legacy alignment)
    const aspect = 0.72 + r() * 0.78;         // same continuous aspect as draw
    /* gScale */ r();
    const gDens = 0.6 + r() * 0.95;           // same density knob as draw
    const f = aspect > 1.12 ? 'Landscape' : aspect < 0.9 ? 'Portrait' : 'Square';
    // density read blends the mode's base band with the global density knob
    const baseSparse = mode === 'Interval';
    const baseDense = mode === 'Suspension' || mode === 'Crescendo';
    const d = (baseSparse ? 0.2 : baseDense ? 0.8 : 0.5) * 0.5 + (gDens - 0.6) / 0.95 * 0.5;
    const density = d < 0.34 ? 'Sparse' : d > 0.62 ? 'Dense' : 'Balanced';
    return { Palette: pal.name, Mode: mode, Format: f, Density: density };
  }

  return { name: 'b_andante', draw, traits };
})();


export const andanteTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderAndante: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const ANDANTE_ASPECTS: readonly number[] = [1.3,1,0.78];
export const andanteSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Viridian Air",
        "Ivory Etude",
        "Cobalt Largo",
        "Gilt Nocturne",
        "Andante",
        "Garnet Aria"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Counterpoint",
        "Crescendo",
        "Rondo",
        "Interval",
        "Suspension",
        "Cadenza"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Landscape",
        "Square",
        "Portrait"
      ]
    },
    {
      "name": "Density",
      "values": [
        "Balanced",
        "Sparse",
        "Dense"
      ]
    }
  ]
};
