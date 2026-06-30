// @ts-nocheck
/*
 * Stillpoint — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/b_stillpoint.js). Continuous seed-driven composition. Deterministic
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


/* STILLPOINT — reductive mystical geometry on aged hand-paper.
 * Influence (not pastiche): anonymous Rajasthan tantra drawings — a single bold
 * meditative form, centred, serene, in flat mineral pigment on foxed/tea-stained
 * paper. PURE NON-OBJECTIVE: ovoid, circle, stepped zigzag, column, split field.
 * Depicts NOTHING — the work is form, colour, balance, stillness.
 *
 * Surface is everything: paper tooth + foxing mottle, printed-ink grain, soft
 * pigment edges, a whisper of haze, vignette grade. Crisp composition, tactile.
 *
 * GENERATIVE, not a template picker: every salient parameter is sampled
 * CONTINUOUSLY from the seed — counts, sizes, proportions, positions, rotations,
 * spacings, crop/zoom, density, AND colour VALUES (hue/sat/light jitter sampled
 * within the palette-world, plus per-element role shuffling). Two seeds that land
 * the same structural family still diverge hard: different scale, focal position,
 * element counts, asymmetry, colour values and crop. There are no discrete
 * mode×palette buckets to collide in.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palettes — MINERAL-ON-AGED-GROUND, DARK/SATURATED lane.
     Most grounds are DEEP aged surfaces (indigo night, oxblood, lamp-black,
     deep umber, twilight) with the mineral forms GLOWING in front and a pale
     line/script ink so the chiaroscuro reads. ONE pale tea-paper is kept
     (Saffron Leaf) so the set still spans a touch of light.

     Each owns: `paper` (the 3-stop ground), `glow` (the pale relief colour used
     for carved voids / inner reliefs / still-point discs so they glow on the
     dark ground), `fox` (aging mottle), `ink` (line/script — LIGHT on the dark
     grounds, dark on the pale one), and 2-3 flat mineral pigments tuned to read
     bright against their ground. Two are rare on purpose (malachite, twilight). */
  const PALS = [
    // OXBLOOD NIGHT — deep aged oxblood ground, gold + bone mineral glowing.
    { name: 'Vermilion Vow', w: 5,
      paper: ['#3a1512', '#2e0f0d', '#220a09'], glow: '#ecd9b4', fox: '#6e2a1c', ink: '#f0dcb2',
      pigA: '#d8542c', pigB: '#e6b53e', pigC: '#7fa3b0', accent: '#d8542c' },
    // INDIGO NIGHT — deep indigo-black ground, saffron + bone glowing.
    { name: 'Indigo Cell', w: 5,
      paper: ['#16203f', '#101830', '#0a1024'], glow: '#e7dcc0', fox: '#2a3a64', ink: '#e6d9b6',
      pigA: '#3f63a8', pigB: '#e08a2c', pigC: '#d8c267', accent: '#3f63a8' },
    // SAFFRON LEAF — the one PALE tea-paper kept (light anchor of the set).
    { name: 'Ochre Saffron', w: 5,
      paper: ['#ece0c2', '#e0d0a6', '#cdb985'], glow: '#fbf3dc', fox: '#a67c44', ink: '#2a2013',
      pigA: '#c98a22', pigB: '#8a3418', pigC: '#3c4d4a', accent: '#c98a22' },
    // LAMP-BLACK — warm near-black ground, vermilion + brass glowing.
    { name: 'Lamp Black', w: 4,
      paper: ['#1c1814', '#15120e', '#0e0b08'], glow: '#ecdcba', fox: '#5a4326', ink: '#e8d6ae',
      pigA: '#c7411f', pigB: '#d6a83a', pigC: '#c9a85a', accent: '#c7411f' },
    // MALACHITE on DEEP UMBER — rich umber-black ground, malachite + bone.
    { name: 'Malachite Rite', w: 2,
      paper: ['#231a10', '#1a130b', '#120c06'], glow: '#e7e0c4', fox: '#5c4422', ink: '#e3dcbe',
      pigA: '#3f8a5e', pigB: '#d06a26', pigC: '#d6b84a', accent: '#3f8a5e' },
    // TWILIGHT — deep aubergine-violet night, amber bindu glowing.
    { name: 'Twilight Bindu', w: 2,
      paper: ['#241a39', '#1b1230', '#130b24'], glow: '#e4d8c2', fox: '#4a3460', ink: '#ddd0bc',
      pigA: '#6a4f9a', pigB: '#d8772e', pigC: '#dcb456', accent: '#6a4f9a' },
  ];

  // The structural vocabulary. These are NOT discrete "modes" that own a whole
  // piece — they are placeable element families. A single composition draws
  // 1–3 of them as independent stamps at continuous centres/scales, so two
  // seeds never collapse into the same template even if they share a family.
  const FAMILIES = ['Ovoid', 'Bindu', 'Stepped', 'Column', 'Crescent'];
  // Format is sampled CONTINUOUSLY (random aspect within bands), not a fixed list.

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return wpick(PALS, r);
  }
  // weighted pick by .w
  function wpick(arr, r) {
    let tot = 0; for (const a of arr) tot += (a.w || 1);
    let t = r() * tot;
    for (const a of arr) { t -= (a.w || 1); if (t <= 0) return a; }
    return arr[arr.length - 1];
  }

  /* ── COLOUR: jitter a hex's hue/sat/light within the palette-world so the same
     palette never yields the same pigment values twice. Keeps it in-world (small
     bounded drift) but continuous, so two same-palette pieces differ in colour. */
  function rgb2hsl(hex) {
    const c = K.h2r(hex), R = c[0] / 255, G = c[1] / 255, B = c[2] / 255;
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B), d = mx - mn;
    let h = 0; const l = (mx + mn) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    if (d !== 0) {
      if (mx === R) h = ((G - B) / d) % 6;
      else if (mx === G) h = (B - R) / d + 2;
      else h = (R - G) / d + 4;
      h *= 60; if (h < 0) h += 360;
    }
    return [h, s, l];
  }
  // jitter: dh deg, ds & dl fractional. r() draws three values.
  function jitter(hex, r, dh, ds, dl) {
    const hsl = rgb2hsl(hex);
    const h = hsl[0] + (r() - 0.5) * 2 * dh;
    const s = K.clamp(hsl[1] + (r() - 0.5) * 2 * ds, 0.04, 0.98);
    const l = K.clamp(hsl[2] + (r() - 0.5) * 2 * dl, 0.05, 0.95);
    return K.hsl2hex(h, s, l);
  }

  /* Build a per-seed working palette: the named world stays, but every pigment
     value is jittered, and the role order (which pigment is "main") is shuffled.
     This de-correlates colour from structure — two same-family pieces get
     different colour values AND a different colour applied to the main mass. */
  function workPal(pal, r) {
    const dh = 6 + r() * 10;       // hue drift band (deg) for this piece
    const ds = 0.05 + r() * 0.12;  // sat drift
    const dl = 0.04 + r() * 0.10;  // light drift
    const A = jitter(pal.pigA, r, dh, ds, dl);
    const B = jitter(pal.pigB, r, dh, ds, dl);
    const C = jitter(pal.pigC, r, dh, ds, dl);
    const order = K.shuffle([A, B, C], r); // continuous role assignment
    const glow = jitter(pal.glow, r, 4, 0.05, 0.05);
    return {
      name: pal.name, paper: pal.paper, fox: pal.fox, ink: pal.ink,
      glow: glow, accent: pal.accent,
      pigA: order[0], pigB: order[1], pigC: order[2],
      pool: [A, B, C, K.mix(A, glow, 0.4), K.mix(B, glow, 0.35), K.mix(C, '#fff', 0.18), K.mix(A, B, 0.5)],
    };
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    const basePal = pickPal(r);

    // ── FORMAT: continuous aspect. Pick a band (portrait/square/landscape) then
    //    a continuous aspect ratio inside it, so no two share an exact frame. ──
    const fb = r();
    let aspect;
    if (fb < 0.42) aspect = 0.70 + r() * 0.20;        // portrait  0.70–0.90
    else if (fb < 0.66) aspect = 0.95 + r() * 0.10;   // ~square   0.95–1.05
    else aspect = 1.18 + r() * 0.26;                  // landscape 1.18–1.44
    const LONG = 1180;
    let W, H;
    if (aspect >= 1) { W = LONG; H = Math.round(LONG / aspect); }
    else { H = LONG; W = Math.round(LONG * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // per-seed working palette (jittered + role-shuffled colour values)
    const pal = workPal(basePal, r);

    // ── DECISION BLOCK — all the values that NAME the piece are drawn here, in a
    //    fixed order, BEFORE any variable-length geometry consumes rng. traits()
    //    mirrors exactly up to here, then stops; no fragile call-counting. ──
    const splitBG = r() < 0.30;        // full-field two-tone ground beneath
    const dn = r();
    const nStamps = dn < 0.40 ? 1 : dn < 0.82 ? 2 : 3;  // density
    const fams = [];
    for (let i = 0; i < nStamps; i++) fams.push(K.pick(FAMILIES, r));
    // ── end decision block ──

    // ── GLOBAL feel knobs, all continuous ──
    const grit = 0.78 + r() * 0.5;

    paintPaper(x, W, H, pal, noise, r);

    // SPLIT-FIELD GROUND: the sheet divided into two flat mineral halves; the
    // geometry then sits ON that ground. Continuous params (no fixed "Split mode").
    if (splitBG) drawSplit(x, W, H, S, pal, r, noise);

    // global hand-skew applied to the whole arrangement
    const gRot = (r() - 0.5) * 0.08;

    // Layout: choose centres so the (already-chosen) families read as a balanced
    // arrangement rather than a stack. Layout style + spread vary per seed.
    const layout = r();          // 0 stacked-vertical · 1 row · 2 diagonal · 3 free
    const layoutKind = layout < 0.34 ? 0 : layout < 0.6 ? 1 : layout < 0.82 ? 2 : 3;
    const spread = 0.10 + r() * 0.26;   // how far stamps sit from centre (frac of S)
    const arrFocalX = (r() - 0.5) * (nStamps > 1 ? 0.16 : 0.30);
    const arrFocalY = (r() - 0.5) * (nStamps > 1 ? 0.14 : 0.24);

    const stamps = [];
    for (let i = 0; i < nStamps; i++) {
      // base scale: a lone stamp can go large (zoomed crop) or small (minimal);
      // multi-stamp pieces run smaller so they fit. Continuous.
      const soloZoom = 0.62 + Math.pow(r(), 1.3) * 0.86;   // 0.62 .. ~1.48
      const multiZoom = 0.42 + r() * 0.40;                 // 0.42 .. 0.82
      const sc = nStamps === 1 ? soloZoom : multiZoom * (0.8 + r() * 0.5);
      const rot = (r() - 0.5) * 0.14;                      // per-stamp lean
      stamps.push({ fam: fams[i], sc, rot });
    }

    // Lay out the stamp centres (in S-units around the arrangement centre).
    const positions = [];
    for (let i = 0; i < nStamps; i++) {
      let px = 0, py = 0;
      if (nStamps === 1) { px = 0; py = 0; }
      else {
        const t = (i / (nStamps - 1)) - 0.5; // -0.5 .. 0.5
        if (layoutKind === 0) { px = (r() - 0.5) * spread * 0.6; py = t * spread * 2.0; }
        else if (layoutKind === 1) { px = t * spread * 2.0; py = (r() - 0.5) * spread * 0.6; }
        else if (layoutKind === 2) { px = t * spread * 1.6; py = t * spread * 1.6; }
        else { px = (r() - 0.5) * spread * 2.0; py = (r() - 0.5) * spread * 2.0; }
      }
      positions.push({ px, py });
    }

    const cx = W * (0.5 + arrFocalX);
    const cy = H * (0.485 + arrFocalY);

    // draw stamps back-to-front (already in list order)
    for (let i = 0; i < nStamps; i++) {
      const st = stamps[i];
      const pos = positions[i];
      x.save();
      x.translate(cx + pos.px * S, cy + pos.py * S);
      x.rotate(gRot + st.rot);
      x.scale(st.sc, st.sc);
      const dbl = nStamps === 1 && r() < 0.22; // doubled lone form (rare)
      if (st.fam === 'Ovoid') drawOvoid(x, S, H, pal, r, noise, dbl);
      else if (st.fam === 'Bindu') drawBindu(x, S, pal, r, noise, dbl);
      else if (st.fam === 'Stepped') drawStepped(x, S, H, pal, r, noise, dbl);
      else if (st.fam === 'Column') drawColumn(x, S, H, pal, r, noise);
      else drawCrescent(x, S, pal, r, noise);
      x.restore();
    }

    // marginal manuscript band — tiny rhythmic ink ticks (reads as devotional
    // script from afar; pure abstract mark up close). Designed, restrained.
    const scriptOn = r() < 0.55;
    if (scriptOn) scriptBand(x, W, H, pal, r, noise);

    // ── surface grade: foxing, ink grain, haze, vignette ──
    foxing(x, W, H, pal, r, noise);
    paperTooth(x, W, H, noise, grit);
    const hazeCol = K.mix(pal.paper[0], '#fff', 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.10, S * 1.1, 'screen');
    inkGrain(x, W, H, pal, r);
    K.grain(x, W, H, 6.5, r);
    edgeStain(x, W, H, pal);
    K.vignette(x, W, H, 0.30);

    return { aspect: W / H };
  }

  /* ── PAPER GROUND: warm mottled tea-stained sheet ── */
  function paintPaper(x, W, H, pal, noise, r) {
    // base wash with gentle vertical/diagonal unevenness — angle varies per seed
    const ga = r() * Math.PI * 2;
    const g = x.createLinearGradient(0, 0, Math.cos(ga) * W, Math.sin(ga) * H);
    g.addColorStop(0, pal.paper[0]);
    g.addColorStop(0.5, pal.paper[1]);
    g.addColorStop(1, pal.paper[2]);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // broad uneven stain blobs (fbm-driven) for hand-paper unevenness
    const step = Math.max(4, Math.floor(Math.min(W, H) / 150));
    const ox = r() * 40, oy = r() * 40; // shift the stain field per seed
    x.save(); x.globalCompositeOperation = 'multiply';
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = (noise.fbm(xx / (W * 0.5) + ox, yy / (H * 0.5) + oy, 4, 0.55, 2.2) + 1) / 2;
        const a = (n - 0.5) * 0.14;
        if (a <= 0) continue;
        const c = K.mix(pal.paper[2], pal.fox, 0.4);
        x.fillStyle = K.rgba(c, a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();
  }

  /* helpers for a tactile flat-pigment fill: flat block, then a multiply-mottle
     to read as printed/painted mineral, plus a softly imperfect alpha edge. */
  function pigFill(x, drawPath, col, pal, r, noise, opts) {
    opts = opts || {};
    x.save();
    drawPath();
    x.clip();
    // base flat pigment
    x.fillStyle = col;
    x.fillRect(-19999, -19999, 39998, 39998);
    // pigment mottle — uneven mineral density (denser for tactile pigment feel)
    const bb = opts.bb || [-1, -1, 2, 2];
    K.mottle(x, bb[0], bb[1], bb[2], bb[3], col, 14, r, 'multiply');
    K.mottle(x, bb[0], bb[1], bb[2], bb[3], col, 30, r, 'screen');
    // subtle tonal modeling (very slight, keeps it flat but not dead)
    const gg = x.createLinearGradient(0, bb[1], 0, bb[1] + bb[3]);
    gg.addColorStop(0, K.rgba(K.mix(col, '#fff', 0.12), 0.20));
    gg.addColorStop(0.55, 'rgba(0,0,0,0)');
    gg.addColorStop(1, K.rgba(K.mix(col, '#000', 0.20), 0.22));
    x.fillStyle = gg; x.fillRect(bb[0], bb[1], bb[2], bb[3]);
    // broad fbm pigment density — mineral "pooling" of the wash (low-freq)
    const step = 5;
    x.globalCompositeOperation = 'multiply';
    for (let yy = bb[1]; yy < bb[1] + bb[3]; yy += step) {
      for (let xx = bb[0]; xx < bb[0] + bb[2]; xx += step) {
        const lo = (noise.fbm(xx / 130 + 21, yy / 130 + 21, 3, 0.55, 2.1) + 1) / 2;
        const hi = (noise.fbm(xx / 26 + 50, yy / 26 + 50, 4, 0.5, 2.2) + 1) / 2;
        const a = (lo - 0.5) * 0.20 + (hi - 0.5) * 0.10;
        if (a <= 0) continue;
        x.fillStyle = 'rgba(0,0,0,' + a + ')';
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    // faint lighter pigment flecks (lifted mineral) for life
    x.globalCompositeOperation = 'screen';
    for (let yy = bb[1]; yy < bb[1] + bb[3]; yy += step) {
      for (let xx = bb[0]; xx < bb[0] + bb[2]; xx += step) {
        const hi = (noise.fbm(xx / 22 + 9, yy / 22 + 9, 4, 0.5, 2.2) + 1) / 2;
        const a = (hi - 0.62) * 0.14;
        if (a <= 0) continue;
        x.fillStyle = 'rgba(255,248,232,' + a + ')';
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();
  }

  // hand-wobbled outline stroke around a path (double-pass for soft pigment edge)
  function inkEdge(x, drawPath, col, lw, alpha) {
    x.save();
    x.lineJoin = 'round'; x.lineCap = 'round';
    // soft wider underlay — reads as ink seeping into paper tooth
    drawPath();
    x.strokeStyle = K.rgba(col, (alpha == null ? 0.9 : alpha) * 0.30);
    x.lineWidth = lw * 2.4;
    x.stroke();
    // crisp core line, very slightly wobbled in weight
    drawPath();
    x.strokeStyle = K.rgba(col, alpha == null ? 0.9 : alpha);
    x.lineWidth = lw;
    x.stroke();
    x.restore();
  }

  /* a circle path with a slightly imperfect hand edge (wobble via noise) */
  function wobbleCircle(x, cx, cy, rad, noise, amp, ph) {
    const N = 160;
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const w = noise.noise2(Math.cos(a) * 1.4 + ph, Math.sin(a) * 1.4 + ph) * amp;
      const rr = rad + w;
      const px = cx + Math.cos(a) * rr, py = cy + Math.sin(a) * rr;
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
  }

  /* an ovoid (egg/seed) path, hand-wobbled — taper/lean vary per call */
  function ovoidPath(x, cx, cy, rw, rh, noise, amp, ph, taperAmt, lean) {
    taperAmt = taperAmt == null ? 0.12 : taperAmt;
    lean = lean || 0;
    const N = 180;
    x.beginPath();
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const w = noise.noise2(Math.cos(a) * 1.3 + ph, Math.sin(a) * 1.3 + ph) * amp;
      // taper top narrower than bottom for an egg silhouette
      const taper = 1 - taperAmt * Math.cos(a);
      const px = cx + Math.cos(a) * (rw + w) * taper + Math.sin(a) * lean * rw;
      const py = cy + Math.sin(a) * (rh + w);
      if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
    }
    x.closePath();
  }

  /* ── MODE: OVOID — the cosmic egg / seed-of-being ── */
  function drawOvoid(x, S, H, pal, r, noise, dbl) {
    const rw = S * (0.16 + r() * 0.12);
    const rh = rw * (1.12 + r() * 0.34);
    const taperAmt = 0.06 + r() * 0.16;
    const lean = (r() - 0.5) * 0.16;
    const main = pal.pigA;

    // soft contact shadow for depth
    K.softShadow(x, 0, rh * 0.86, rh * 1.5, 0.22);

    function paint(ox, oy, mcol, sc) {
      const path = () => ovoidPath(x, ox, oy, rw * sc, rh * sc, noise, S * 0.006, ox * 0.01 + 3, taperAmt, lean);
      pigFill(x, path, mcol, pal, r, noise, { bb: [ox - rw * sc * 1.3 - 2, oy - rh * sc - 2, rw * sc * 2.6 + 4, rh * sc * 2 + 4] });
      inkEdge(x, path, pal.ink, S * 0.006, 0.85);
    }

    if (dbl) {
      const off = rw * (1.0 + r() * 0.4);
      const dy = (r() - 0.5) * rh * 0.3;
      paint(-off, dy, pal.pigA, 0.78 + r() * 0.16);
      paint(off, -dy, pal.pigB, 0.78 + r() * 0.16);
    } else {
      paint(0, 0, main, 1);
      // the lone egg ALMOST ALWAYS carries interior structure (rarely a pure void)
      const innerKind = r();
      const outerPath = () => ovoidPath(x, 0, 0, rw, rh, noise, S * 0.006, 3, taperAmt, lean);
      if (innerKind < 0.42) {
        // concentric seed-within-seed + bindu (count varies)
        const layers = 1 + (r() * 2 | 0);
        for (let i = 0; i < layers; i++) {
          const sc = 0.62 - i * (0.18 + r() * 0.06);
          if (sc < 0.16) break;
          const innerCol = K.mix(i % 2 ? pal.pigB : pal.pigC, pal.glow, 0.15 + r() * 0.25);
          const ip = () => ovoidPath(x, 0, 0, rw * sc, rh * sc, noise, S * 0.004, 9 + i, taperAmt, lean);
          pigFill(x, ip, innerCol, pal, r, noise, { bb: [-rw * sc * 1.3 - 2, -rh * sc - 2, rw * sc * 2.6 + 4, rh * sc * 2 + 4] });
          inkEdge(x, ip, pal.ink, S * 0.004, 0.7);
        }
        x.fillStyle = pal.ink;
        x.beginPath(); x.arc(0, 0, S * (0.010 + r() * 0.01), 0, 7); x.fill();
      } else if (innerKind < 0.82) {
        // a horizontal band across the egg (split-yolk): clip to egg, draw band
        x.save(); outerPath(); x.clip();
        const bands = 1 + (r() * 2 | 0);
        for (let b = 0; b < bands; b++) {
          const bandH = rh * (0.18 + r() * 0.20);
          const by = -rh + (rh * 2) * (0.28 + r() * 0.5);
          const bandCol = K.mix(pal.pigB, pal.pigC, r());
          const bp = () => { x.beginPath(); x.rect(-rw * 1.4 - 6, by - bandH / 2, rw * 2.8 + 12, bandH); };
          pigFill(x, bp, bandCol, pal, r, noise, { bb: [-rw * 1.4 - 6, by - bandH / 2, rw * 2.8 + 12, bandH] });
          // seam lines top & bottom of band
          x.strokeStyle = K.rgba(pal.ink, 0.7); x.lineWidth = S * 0.0035;
          x.beginPath(); x.moveTo(-rw, by - bandH / 2); x.lineTo(rw, by - bandH / 2);
          x.moveTo(-rw, by + bandH / 2); x.lineTo(rw, by + bandH / 2); x.stroke();
        }
        x.restore();
        // a bindu dot centred (offset varies)
        x.fillStyle = pal.ink;
        x.beginPath(); x.arc(0, (r() - 0.5) * rh * 0.4, S * 0.014, 0, 7); x.fill();
      } else {
        // a bare egg with just a centred bindu (the rare minimal one)
        x.fillStyle = pal.ink;
        x.beginPath(); x.arc(0, 0, S * (0.012 + r() * 0.012), 0, 7); x.fill();
      }
      // re-stroke the egg outline crisp on top
      inkEdge(x, outerPath, pal.ink, S * 0.006, 0.85);
    }
    // a thin horizontal ground-line under the form (tantra plinth) — sometimes
    groundLine(x, S, rh, pal, r);
  }

  /* ── MODE: BINDU — concentric circles / halo radiating from a centre dot ── */
  function drawBindu(x, S, pal, r, noise, dbl) {
    const R = S * (0.18 + r() * 0.20);
    const rings = 3 + (r() * 5 | 0);
    const cols = K.shuffle(pal.pool.slice(), r);
    const colStart = (r() * cols.length) | 0;
    // ring radii: non-uniform widths (so concentric sets differ structurally)
    const widths = [];
    let wsum = 0;
    for (let i = 0; i < rings; i++) { const w = 0.5 + r() * 1.0; widths.push(w); wsum += w; }
    K.softShadow(x, 0, R * 0.5, R * 1.6, 0.18);
    let acc = 0;
    for (let i = 0; i < rings; i++) {
      const rad = R * (1 - acc / wsum);
      acc += widths[i];
      const col = cols[(colStart + i) % cols.length];
      const path = () => wobbleCircle(x, 0, 0, rad, noise, S * 0.006, i * 1.7 + 2);
      pigFill(x, path, col, pal, r, noise, { bb: [-rad - 2, -rad - 2, rad * 2 + 4, rad * 2 + 4] });
      inkEdge(x, path, pal.ink, S * 0.005, 0.8);
    }
    // central bindu (size varies; offset rarely)
    const bo = r() < 0.25 ? (r() - 0.5) * R * 0.3 : 0;
    x.fillStyle = pal.ink;
    x.beginPath(); x.arc(bo, 0, S * (0.012 + r() * 0.014), 0, 7); x.fill();
    // cardinal "petal" ticks (rare) for a yantra feel — count & length vary
    if (r() < 0.40) {
      const petals = r() < 0.5 ? 4 : 8;
      const plen = S * (0.015 + r() * 0.02);
      x.fillStyle = K.rgba(pal.pigB, 0.85);
      for (let k = 0; k < petals; k++) {
        const a = k * Math.PI * 2 / petals;
        x.save(); x.rotate(a);
        x.beginPath();
        x.moveTo(0, -R * 1.04); x.lineTo(plen, -R * 0.92);
        x.lineTo(0, -R * 0.86); x.lineTo(-plen, -R * 0.92);
        x.closePath(); x.fill(); x.restore();
      }
    }
  }

  /* ── MODE: STEPPED — a stepped ziggurat / ascending mountain-glyph ── */
  function drawStepped(x, S, H, pal, r, noise, dbl) {
    const steps = 3 + (r() * 5 | 0);
    const baseW = S * (0.26 + r() * 0.30);
    const totH = S * (0.40 + r() * 0.34);
    const flatTop = r() < 0.4;              // truncated plateau vs sharp apex
    const banded = r() < 0.5;               // alternate-colour bands per tier
    const inverted = r() < 0.18;            // rare: descending (wide top)
    const main = pal.pigA;

    // PER-TIER taper (each step narrows by its own amount) → no two ziggurats
    // share a silhouette even at the same step count.
    const tapers = [];
    for (let i = 0; i < steps; i++) tapers.push(0.08 + r() * 0.22);
    // per-tier asymmetry: left & right edges narrow independently
    const asym = [];
    for (let i = 0; i < steps; i++) asym.push((r() - 0.5) * 0.5);
    const stepHs = [];
    let hrem = totH;
    for (let i = 0; i < steps; i++) { const f = 0.7 + r() * 0.6; stepHs.push(f); }
    const hsum = stepHs.reduce((a, b) => a + b, 0);
    for (let i = 0; i < steps; i++) stepHs[i] = (stepHs[i] / hsum) * totH;

    // build tiers (left/right edges independent for asymmetry)
    const tiers = [];
    let lW = baseW / 2, rW = baseW / 2, y = totH / 2;
    const seq = inverted ? steps : steps; // ordering handled by sign of taper accumulation
    for (let i = 0; i < steps; i++) {
      const sh = stepHs[i];
      const ny = y - sh;
      tiers.push({ xL: -lW, xR: rW, y0: ny, h: sh });
      const t = tapers[i];
      const a = asym[i];
      const dL = lW * t * (1 + a), dR = rW * t * (1 - a);
      lW = Math.max(S * 0.02, inverted ? lW + dL : lW - dL);
      rW = Math.max(S * 0.02, inverted ? rW + dR : rW - dR);
      y = ny;
    }
    K.softShadow(x, 0, totH * 0.45, totH * 0.95, 0.20);

    // silhouette path (stack of asymmetric tiers + apex)
    const silhouette = () => {
      x.beginPath();
      // up the left side
      x.moveTo(tiers[0].xL, totH / 2);
      let prevY = totH / 2;
      for (let i = 0; i < steps; i++) {
        const t = tiers[i];
        x.lineTo(t.xL, prevY);
        x.lineTo(t.xL, t.y0);
        prevY = t.y0;
      }
      // apex
      if (!flatTop) {
        const top = tiers[steps - 1];
        x.lineTo((top.xL + top.xR) / 2, top.y0 - stepHs[steps - 1] * 0.6);
      }
      // down the right side
      for (let i = steps - 1; i >= 0; i--) {
        const t = tiers[i];
        x.lineTo(t.xR, t.y0);
        const belowY = i === 0 ? totH / 2 : tiers[i - 1].y0;
        x.lineTo(t.xR, belowY);
      }
      x.closePath();
    };

    if (banded) {
      const bandCols = K.shuffle([pal.pigA, pal.pigB, pal.pigC, K.mix(pal.pigA, pal.glow, 0.3)], r);
      x.save(); silhouette(); x.clip();
      tiers.forEach((t, i) => {
        const col = bandCols[i % bandCols.length];
        const p = () => { x.beginPath(); x.rect(t.xL - 6, t.y0, (t.xR - t.xL) + 12, t.h + 1); };
        pigFill(x, p, col, pal, r, noise, { bb: [t.xL - 6, t.y0 - 1, (t.xR - t.xL) + 12, t.h + 2] });
      });
      x.restore();
    } else {
      pigFill(x, silhouette, main, pal, r, noise, { bb: [-baseW / 2 - 2, -totH / 2 - 2, baseW + 4, totH + 4] });
    }
    inkEdge(x, silhouette, pal.ink, S * 0.006, 0.85);

    // a contrasting vertical seam / axis up the middle (only if not banded)
    if (!banded && r() < 0.7) {
      x.strokeStyle = K.rgba(pal.glow, 0.5);
      x.lineWidth = S * 0.006;
      x.beginPath(); x.moveTo(0, totH / 2); x.lineTo(0, -totH / 2 + stepHs[steps - 1] * 0.5); x.stroke();
    }
    // crowning bindu dot above apex (size & gap vary; sometimes absent)
    if (r() < 0.8) {
      const top = tiers[steps - 1];
      const apexY = top.y0 - (flatTop ? 0 : stepHs[steps - 1] * 0.6);
      const gap = S * (0.03 + r() * 0.04);
      const brad = S * (0.016 + r() * 0.018);
      x.fillStyle = pal.pigB;
      x.beginPath(); x.arc(0, apexY - gap, brad, 0, 7); x.fill();
      inkEdge(x, () => { x.beginPath(); x.arc(0, apexY - gap, brad, 0, 7); }, pal.ink, S * 0.004, 0.7);
    }
    groundLine(x, S, totH / 2, pal, r);
  }

  /* ── MODE: COLUMN — stacked horizontal pigment bars (a meditative spectrum) ── */
  function drawColumn(x, S, H, pal, r, noise) {
    const bars = 3 + (r() * 6 | 0);
    const colW = S * (0.22 + r() * 0.24);
    const totH = S * (0.46 + r() * 0.36);
    // NON-uniform bar heights → two columns never share the same banding rhythm
    const heights = [];
    let hsum = 0;
    for (let i = 0; i < bars; i++) { const h = 0.55 + r() * 1.1; heights.push(h); hsum += h; }
    const cols = [];
    const pool = K.shuffle(pal.pool.slice(), r);
    const cstart = (r() * pool.length) | 0;
    for (let i = 0; i < bars; i++) cols.push(pool[(cstart + i + (i % 2 ? 1 : 0)) % pool.length]);
    K.softShadow(x, 0, totH * 0.5, totH * 0.8, 0.18);
    let yc = -totH / 2;
    for (let i = 0; i < bars; i++) {
      const barH = (heights[i] / hsum) * totH;
      const y0 = yc;
      yc += barH;
      const jx = (r() - 0.5) * S * 0.02; // per-bar hand offset
      const bw = colW * (0.86 + r() * 0.28); // slight per-bar width variance
      const path = () => {
        x.beginPath();
        const N = 24;
        for (let k = 0; k <= N; k++) {
          const px = -bw / 2 + jx + (bw) * (k / N);
          const w = noise.noise2(px / 60, (y0 + i) / 30) * S * 0.004;
          if (k === 0) x.moveTo(px, y0 + w); else x.lineTo(px, y0 + w);
        }
        for (let k = N; k >= 0; k--) {
          const px = -bw / 2 + jx + (bw) * (k / N);
          const w = noise.noise2(px / 60 + 9, (y0 + barH + i) / 30) * S * 0.004;
          x.lineTo(px, y0 + barH + w);
        }
        x.closePath();
      };
      pigFill(x, path, cols[i], pal, r, noise, { bb: [-bw / 2 + jx - 2, y0 - 4, bw + 4, barH + 8] });
      inkEdge(x, path, pal.ink, S * 0.0045, 0.5);
    }
    // a single framing outline around the whole stack (sometimes)
    if (r() < 0.7) {
      x.strokeStyle = K.rgba(pal.ink, 0.8);
      x.lineWidth = S * 0.006;
      x.strokeRect(-colW / 2, -totH / 2, colW, totH);
    }
    // a bindu disc centred (axis of stillness) — position & size vary
    if (r() < 0.5) {
      const by = (r() - 0.5) * totH * 0.4;
      const brad = S * (0.022 + r() * 0.018);
      x.fillStyle = pal.glow;
      x.beginPath(); x.arc(0, by, brad, 0, 7); x.fill();
      inkEdge(x, () => { x.beginPath(); x.arc(0, by, brad, 0, 7); }, pal.ink, S * 0.004, 0.75);
      x.fillStyle = pal.ink;
      x.beginPath(); x.arc(0, by, S * 0.008, 0, 7); x.fill();
    }
  }

  /* ── MODE: SPLIT FIELD — the field divided into two flat mineral halves,
        a serene meeting of two colours with a thin ink seam (a horizon of being) ── */
  function drawSplit(x, W, H, S, pal, r, noise) {
    // full-field background ground: drawn in absolute canvas coords, self-contained.
    x.save();
    const vertical = r() < 0.42;
    const colA = pal.pigA, colB = K.mix(pal.pigB, pal.paper[1], 0.05);
    // margin varies → the inset field is sometimes tight, sometimes generous
    const mfr = 0.06 + r() * 0.12;
    const m = W * mfr, mt = H * mfr;
    const fx = m, fy = mt, fw = W - m * 2, fh = H - mt * 2;
    // overall soft shadow box
    K.softShadow(x, W / 2, H / 2, S * 0.9, 0.12);
    const splitFrac = 0.30 + r() * 0.40;      // where the horizon sits (0.30–0.70)
    const splitAt = vertical ? fx + fw * splitFrac : fy + fh * splitFrac;
    const seamWob = S * (0.003 + r() * 0.008); // seam wobble amplitude varies

    function half(which) {
      const path = () => {
        x.beginPath();
        if (vertical) {
          const sx = splitAt;
          if (which === 0) { x.moveTo(fx, fy); x.lineTo(sx, fy); }
          else { x.moveTo(sx, fy); x.lineTo(fx + fw, fy); }
          const N = 40;
          if (which === 0) {
            for (let k = 0; k <= N; k++) { const yy = fy + fh * (k / N); x.lineTo(sx + noise.noise2(yy / 70, 3) * seamWob, yy); }
            x.lineTo(fx, fy + fh); x.closePath();
          } else {
            for (let k = 0; k <= N; k++) { const yy = fy + fh * (k / N); x.lineTo(sx + noise.noise2(yy / 70, 3) * seamWob, yy); }
            x.lineTo(fx + fw, fy + fh); x.lineTo(fx + fw, fy); x.closePath();
          }
        } else {
          const sy = splitAt;
          if (which === 0) {
            x.moveTo(fx, fy);
            for (let k = 0; k <= 40; k++) { const xx = fx + fw * (k / 40); x.lineTo(xx, sy + noise.noise2(xx / 70, 3) * seamWob); }
            x.lineTo(fx + fw, fy); x.closePath();
          } else {
            x.moveTo(fx, fy + fh);
            for (let k = 0; k <= 40; k++) { const xx = fx + fw * (k / 40); x.lineTo(xx, sy + noise.noise2(xx / 70, 3) * seamWob); }
            x.lineTo(fx + fw, fy + fh); x.closePath();
          }
        }
      };
      pigFill(x, path, which === 0 ? colA : colB, pal, r, noise, { bb: [fx - 2, fy - 2, fw + 4, fh + 4] });
    }
    half(0); half(1);
    // thin ink seam
    x.strokeStyle = K.rgba(pal.ink, 0.85); x.lineWidth = S * 0.004;
    x.beginPath();
    if (vertical) { for (let k = 0; k <= 40; k++) { const yy = fy + fh * (k / 40); const px = splitAt + noise.noise2(yy / 70, 3) * seamWob; if (k === 0) x.moveTo(px, yy); else x.lineTo(px, yy); } }
    else { for (let k = 0; k <= 40; k++) { const xx = fx + fw * (k / 40); const py = splitAt + noise.noise2(xx / 70, 3) * seamWob; if (k === 0) x.moveTo(xx, py); else x.lineTo(xx, py); } }
    x.stroke();
    // a still-point disc straddling the seam — present most of the time; slides
    // along the seam, varies colour & size. Sometimes absent (pure split).
    if (r() < 0.82) {
      const slide = (r() - 0.5) * 0.7;
      const bx = vertical ? splitAt : fx + fw * (0.5 + slide * 0.5);
      const by = vertical ? fy + fh * (0.5 + slide * 0.5) : splitAt;
      const brad = S * (0.04 + r() * 0.07);
      const discCol = K.pick([pal.pigC, K.mix(pal.pigC, '#fff', 0.18), pal.glow], r);
      const bpath = () => wobbleCircle(x, bx, by, brad, noise, S * 0.005, 7);
      pigFill(x, bpath, discCol, pal, r, noise, { bb: [bx - brad - 2, by - brad - 2, brad * 2 + 4, brad * 2 + 4] });
      inkEdge(x, bpath, pal.ink, S * 0.005, 0.85);
      x.fillStyle = pal.ink; x.beginPath(); x.arc(bx, by, S * 0.012, 0, 7); x.fill();
    }
    // frame the inset field with a fine double rule (manuscript border) — sometimes
    if (r() < 0.75) {
      x.strokeStyle = K.rgba(pal.ink, 0.7); x.lineWidth = S * 0.003;
      x.strokeRect(fx, fy, fw, fh);
      x.strokeStyle = K.rgba(pal.ink, 0.4);
      x.strokeRect(fx - S * 0.018, fy - S * 0.018, fw + S * 0.036, fh + S * 0.036);
    }
    x.restore();
  }

  /* ── MODE: CRESCENT GATE — a bold disc with a crescent void carved out,
        framed by a tall arched gate-shape (reductive doorway to stillness) ── */
  function drawCrescent(x, S, pal, r, noise) {
    const R = S * (0.20 + r() * 0.12);
    const gateW = R * (2.1 + r() * 0.8), gateH = R * (2.5 + r() * 1.0);
    const discY = -R * (0.05 + r() * 0.2);
    K.softShadow(x, 0, R * 0.6, gateH * 0.6, 0.16);
    // arched gate field
    const gate = () => {
      x.beginPath();
      x.moveTo(-gateW / 2, gateH / 2);
      x.lineTo(-gateW / 2, -gateH / 2 + gateW / 2);
      x.arc(0, -gateH / 2 + gateW / 2, gateW / 2, Math.PI, 0);
      x.lineTo(gateW / 2, gateH / 2);
      x.closePath();
    };
    pigFill(x, gate, pal.pigB, pal, r, noise, { bb: [-gateW / 2 - 2, -gateH / 2 - 2, gateW + 4, gateH + 4] });
    inkEdge(x, gate, pal.ink, S * 0.006, 0.85);
    // disc + crescent live INSIDE the gate — clip so nothing spills past the arch
    x.save();
    gate(); x.clip();
    const dcol = pal.pigA;
    const disc = () => wobbleCircle(x, 0, discY, R, noise, S * 0.005, 4);
    pigFill(x, disc, dcol, pal, r, noise, { bb: [-R - 2, discY - R - 2, R * 2 + 4, R * 2 + 4] });
    // crescent void: paper-coloured offset circle subtracts from the disc.
    // offset magnitude AND angle vary → waxing/waning/gibbous all reachable.
    const off = R * (0.30 + r() * 0.42);
    const ang = (r() - 0.5) * 1.2; // tilt of the crescent
    const cresR = R * (0.86 + r() * 0.18);
    const cx2 = Math.cos(ang) * off, cy2 = discY + Math.sin(ang) * off - off * 0.1;
    const cres = () => wobbleCircle(x, cx2, cy2, cresR, noise, S * 0.005, 11);
    pigFill(x, cres, pal.glow, pal, r, noise, { bb: [cx2 - cresR - 2, cy2 - cresR - 2, cresR * 2 + 4, cresR * 2 + 4] });
    inkEdge(x, disc, pal.ink, S * 0.0055, 0.8);
    x.restore();
    // tiny bindu at gate apex (sometimes)
    if (r() < 0.7) {
      x.fillStyle = pal.pigC;
      x.beginPath(); x.arc(0, -gateH / 2 + gateW * 0.2, S * (0.014 + r() * 0.012), 0, 7); x.fill();
    }
    groundLine(x, S, gateH / 2, pal, r);
  }

  /* a thin tantra plinth/ground-line beneath a centred form */
  function groundLine(x, S, below, pal, r) {
    if (r() < 0.4) return;
    const y = below + S * (0.04 + r() * 0.04);
    const w = S * (0.28 + r() * 0.18);
    x.strokeStyle = K.rgba(pal.ink, 0.55);
    x.lineWidth = S * 0.004;
    x.beginPath(); x.moveTo(-w / 2, y); x.lineTo(w / 2, y); x.stroke();
    if (r() < 0.7) {
      x.strokeStyle = K.rgba(pal.ink, 0.3);
      x.beginPath(); x.moveTo(-w / 2, y + S * 0.014); x.lineTo(w / 2, y + S * 0.014); x.stroke();
    }
  }

  /* marginal manuscript band — rows of tiny ink ticks top &/or bottom */
  function scriptBand(x, W, H, pal, r, noise) {
    const rows = 1 + (r() * 2 | 0);
    const top = r() < 0.7;
    const bottom = r() < 0.6;
    x.save();
    x.fillStyle = K.rgba(pal.ink, 0.55);
    const margin = H * (0.05 + r() * 0.03);
    const inset = 0.12 + r() * 0.08;
    function band(yc) {
      for (let row = 0; row < rows; row++) {
        const yy = yc + row * H * 0.018;
        let xx = W * inset;
        while (xx < W * (1 - inset)) {
          const gw = 2 + r() * 7;
          const gh = 1.4 + r() * 1.6;
          if (r() < 0.82) x.fillRect(xx, yy, gw, gh);
          xx += gw + 2 + r() * 4;
        }
      }
    }
    if (top) band(margin);
    if (bottom) band(H - margin - rows * H * 0.018);
    x.restore();
  }

  /* ── FOXING: age spots of the paper (small rusty mottle, multiply) ── */
  function foxing(x, W, H, pal, r, noise) {
    x.save(); x.globalCompositeOperation = 'multiply';
    const n = Math.floor(W * H / 9000);
    for (let i = 0; i < n; i++) {
      const px = r() * W, py = r() * H;
      const f = (noise.fbm(px / 120, py / 120, 3, 0.5, 2) + 1) / 2;
      if (f < 0.5) continue;
      const rad = 2 + r() * 9;
      const c = K.mix(pal.fox, pal.paper[2], 0.3);
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, K.rgba(c, 0.18 + r() * 0.12));
      g.addColorStop(1, K.rgba(c, 0));
      x.fillStyle = g; x.fillRect(px - rad, py - rad, rad * 2, rad * 2);
    }
    x.restore();
  }

  /* ── PAPER TOOTH: fine fibrous texture across everything ── */
  function paperTooth(x, W, H, noise, grit) {
    x.save(); x.globalCompositeOperation = 'overlay';
    const step = 3;
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = noise.noise2(xx / 3.5, yy / 3.5);
        const a = n * 0.06 * grit;
        if (Math.abs(a) < 0.012) continue;
        x.fillStyle = a > 0 ? 'rgba(255,250,235,' + a + ')' : 'rgba(40,30,20,' + (-a) + ')';
        x.fillRect(xx, yy, step, step);
      }
    }
    x.restore();
  }

  /* ── INK GRAIN: sparse dark printed-ink speckle to break vector cleanliness ── */
  function inkGrain(x, W, H, pal, r) {
    x.save(); x.globalCompositeOperation = 'multiply';
    const n = Math.floor(W * H / 1400);
    for (let i = 0; i < n; i++) {
      x.fillStyle = K.rgba(pal.ink, 0.05 + r() * 0.10);
      const s = r() < 0.85 ? 1 : 2;
      x.fillRect(r() * W, r() * H, s, s);
    }
    x.restore();
  }

  /* ── EDGE STAIN: darker tea-stained paper border (handled sheet edges) ── */
  function edgeStain(x, W, H, pal) {
    x.save(); x.globalCompositeOperation = 'multiply';
    const g = x.createLinearGradient(0, 0, 0, H * 0.16);
    g.addColorStop(0, K.rgba(pal.fox, 0.5)); g.addColorStop(1, K.rgba(pal.fox, 0));
    x.fillStyle = g; x.fillRect(0, 0, W, H * 0.16);
    const g2 = x.createLinearGradient(0, H, 0, H - H * 0.16);
    g2.addColorStop(0, K.rgba(pal.fox, 0.5)); g2.addColorStop(1, K.rgba(pal.fox, 0));
    x.fillStyle = g2; x.fillRect(0, H - H * 0.16, W, H * 0.16);
    const g3 = x.createLinearGradient(0, 0, W * 0.14, 0);
    g3.addColorStop(0, K.rgba(pal.fox, 0.4)); g3.addColorStop(1, K.rgba(pal.fox, 0));
    x.fillStyle = g3; x.fillRect(0, 0, W * 0.14, H);
    const g4 = x.createLinearGradient(W, 0, W - W * 0.14, 0);
    g4.addColorStop(0, K.rgba(pal.fox, 0.4)); g4.addColorStop(1, K.rgba(pal.fox, 0));
    x.fillStyle = g4; x.fillRect(W - W * 0.14, 0, W * 0.14, H);
    x.restore();
  }

  function traits(seed) {
    const r = K.rng(seed);
    const basePal = pickPal(r);
    // Mirror draw()'s rng order EXACTLY through the decision block, then stop.
    const fb = r();                       // format band
    r();                                  // aspect within band
    // workPal() consumes: dh,ds,dl, jitterA(3), jitterB(3), jitterC(3),
    // shuffle([A,B,C]) (2 swaps), jitter glow(3) = 3+9+2+3 = 17 r() calls
    for (let i = 0; i < 17; i++) r();
    const splitBG = r() < 0.30;           // ground
    const dn = r();                       // density band
    const nStamps = dn < 0.40 ? 1 : dn < 0.82 ? 2 : 3;
    const fams = [];
    for (let i = 0; i < nStamps; i++) fams.push(K.pick(FAMILIES, r));
    const fmt = fb < 0.42 ? 'Portrait' : fb < 0.66 ? 'Square' : 'Landscape';
    const dens = nStamps === 1 ? 'Minimal' : nStamps === 2 ? 'Paired' : 'Packed';
    return {
      Palette: basePal.name,
      Form: fams[0].charAt(0).toUpperCase() + fams[0].slice(1),
      Elements: ['Single', 'Pair', 'Triad'][Math.min(fams.length - 1, 2)],
      Format: fmt,
      Field: (splitBG ? 'Split · ' : '') + dens,
    };
  }

  return { name: 'b_stillpoint', draw, traits };
})();


export const stillpointTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderStillpoint: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const STILLPOINT_ASPECTS: readonly number[] = [1.3,1,0.78];
export const stillpointSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Ochre Saffron",
        "Malachite Rite",
        "Indigo Cell",
        "Lamp Black",
        "Vermilion Vow",
        "Twilight Bindu"
      ]
    },
    {
      "name": "Form",
      "values": [
        "Ovoid",
        "Bindu",
        "Stepped",
        "Crescent",
        "Column"
      ]
    },
    {
      "name": "Elements",
      "values": [
        "Single",
        "Pair",
        "Triad"
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
      "name": "Field",
      "values": [
        "Minimal",
        "Paired",
        "Split · Paired",
        "Split · Minimal",
        "Split · Packed",
        "Packed"
      ]
    }
  ]
};
