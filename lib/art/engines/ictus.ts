// @ts-nocheck
/*
 * Ictus — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/b_ictus.js). Continuous seed-driven composition. Deterministic
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


/* ICTUS — sumi gesture, DARK signature (reverse Kline / Soulages).
 * A few BOLD calligraphic strokes / slabs / beams — broad, fast,
 * architectural — most of them BONE/WHITE gesture crashing across an
 * INK / CHAR / SLATE near-black ground (white-on-black Kline/Soulages),
 * with 1–2 classic black-on-bone frames for breath. Dry-brush edges,
 * weight. Power lives in the mark itself. PURE NON-OBJECTIVE: no
 * letterform, no subject, no scene — only form, value, balance, tension.
 * Influence = Kline / Motherwell / Soulages gesture, but the marks are ours.
 *
 * Surface is never flat clip-art: paper tooth, ink mottle/grain, dry-brush
 * fray, a faint haze sheet and a vignette grade — a fine screenprint / sumi
 * painting, tactile and atmospheric.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palettes — DARK SIGNATURE (reverse Kline). Four are a
     BONE/WHITE (or pale-ochre) gesture on an INK / CHAR / SLATE near-black
     ground; two are the classic black-on-bone for breath. `bone`/`bone2`
     are always the GROUND, `ink`/`ink2` always the GESTURE — so on the dark
     palettes the "bone" slot holds the near-black ground and the "ink" slot
     holds the pale mark. `dark:true` flips the value logic (deepen vs lift,
     and which tone shows through dry-brush patches). An `accent` is a RARE
     single colour intrusion, used on at most one mark and only on some seeds.
     Restrained, weighted, muscular. */
  const PALS = [
    // ── DARK GROUND, PALE GESTURE (Soulages / white-on-black Kline) ──
    { name: 'Bone on Ink',    dark: true,  bone: '#100e0b', bone2: '#1c1813', ink: '#ece3cf', ink2: '#d8ccb2', accent: '#caa04a', accentName: 'Ochre',     accentRare: 0.18 },
    { name: 'Chalk on Char',  dark: true,  bone: '#141414', bone2: '#1f1f20', ink: '#f2efe7', ink2: '#dcd7cb', accent: '#c98a44', accentName: 'Gamboge',   accentRare: 0.14 },
    { name: 'Slate & Ash',    dark: true,  bone: '#12161b', bone2: '#1d242c', ink: '#e6ebec', ink2: '#cdd5d6', accent: '#5f9bc6', accentName: 'Cold Blue', accentRare: 0.18 },
    { name: 'Ochre on Pitch', dark: true,  bone: '#0c0b09', bone2: '#16140f', ink: '#d7b06a', ink2: '#e9e0cb', accent: '#b8513a', accentName: 'Oxblood',   accentRare: 0.16 },
    // ── CLASSIC BLACK-ON-BONE (kept for breath) ──
    { name: 'Sumi on Kozo',   dark: false, bone: '#efe9dc', bone2: '#e3dccb', ink: '#14110d', ink2: '#2b261f', accent: '#9a5a23', accentName: 'Ochre',     accentRare: 0.18 },
    { name: 'Pure Sumi',      dark: false, bone: '#f3efe6', bone2: '#e8e2d4', ink: '#0c0a08', ink2: '#211c17', accent: '#1c1714', accentName: 'None',      accentRare: 0.0 },
  ];

  /* Six structurally-DISTINCT compositional modes — genuinely different
     gesture architectures, not one layout recoloured. */
  const MODES = ['Cleave', 'Scaffold', 'Bridge', 'Pivot', 'Stamp', 'Sweep'];
  // FORMATS kept only as a coarse trait bucket; the real aspect is CONTINUOUS
  // (see draw) so no two pieces share an identical canvas shape.
  const FORMATS = [[1040, 1280], [1180, 1180], [1280, 1020]]; // portrait / square / landscape

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  // jitter a palette hue in HSL so two same-palette pieces differ in colour
  // VALUE, never leaving the palette-world (tiny hue drift, modest L/S wander).
  function jitterHex(hex, r, dh, ds, dl) {
    const c = K.h2r(hex);
    // rgb→hsl
    const rr = c[0] / 255, gg = c[1] / 255, bb = c[2] / 255;
    const mx = Math.max(rr, gg, bb), mn = Math.min(rr, gg, bb);
    let h = 0, s = 0; const l = (mx + mn) / 2;
    const d = mx - mn;
    if (d > 1e-6) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0));
      else if (mx === gg) h = (bb - rr) / d + 2;
      else h = (rr - gg) / d + 4;
      h *= 60;
    }
    const nh = h + (r() - 0.5) * 2 * dh;
    const ns = K.clamp(s + (r() - 0.5) * 2 * ds, 0, 1);
    const nl = K.clamp(l + (r() - 0.5) * 2 * dl, 0.02, 0.98);
    return K.hsl2hex(nh, ns, nl);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);
    // ── SHARED RNG PREFIX (traits() mirrors EXACTLY this order) ──────────
    let pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    // does this seed get the rare colour intrusion?
    const useAccent = r() < pal.accentRare;
    // ── end shared prefix; everything below is draw-only continuous state ─

    // CONTINUOUS FORMAT: bias toward the picked bucket but let the exact aspect
    // wander hard, so portrait/square/landscape are families, not 3 fixed shapes.
    const baseAsp = fmt[0] / fmt[1];
    const aspect = K.clamp(baseAsp * (0.8 + r() * 0.42) + (r() - 0.5) * 0.12, 0.66, 1.55);
    const longEdge = 1180 + Math.floor((r() - 0.5) * 220); // 1070..1290
    let W, H;
    if (aspect >= 1) { W = longEdge; H = Math.round(longEdge / aspect); }
    else { H = longEdge; W = Math.round(longEdge * aspect); }
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // GLOBAL SCALE / DENSITY — vary the size of the whole gesture family and how
    // much it fills the field, hard, so two same-mode pieces read at different
    // zoom. gScale multiplies every mark dimension; the crop/zoom transform
    // below re-frames the composition (some tight & cropped, some airy & small).
    const gScale = 0.74 + r() * 0.62;          // 0.74..1.36 overall mark scale
    const density = 0.7 + r() * 0.7;           // affects optional-element odds / counts
    const zoom = 0.82 + r() * 0.5;             // 0.82..1.32 camera zoom on the comp
    const panX = (r() - 0.5) * 0.26 * W;       // off-centre framing
    const panY = (r() - 0.5) * 0.26 * H;
    const compRot = (r() - 0.5) * 0.16;        // slight whole-comp rotation (±9°)

    // PER-PIECE COLOUR-VALUE JITTER (stays inside the palette-world). Strokes
    // and ground get slightly different value/temperature each seed, so two
    // same-palette pieces never share an identical ink/ground value.
    const jBone  = jitterHex(pal.bone,  r, 5, 0.04, pal.dark ? 0.025 : 0.03);
    const jBone2 = jitterHex(pal.bone2, r, 5, 0.04, pal.dark ? 0.03 : 0.035);
    const jInk   = jitterHex(pal.ink,   r, 4, 0.05, pal.dark ? 0.05 : 0.04);
    const jInk2  = jitterHex(pal.ink2,  r, 4, 0.05, 0.045);
    const jAccent = pal.accent ? jitterHex(pal.accent, r, 7, 0.07, 0.05) : pal.accent;
    // work on a jittered copy of the palette so all downstream refs pick it up
    pal = Object.assign({}, pal, { bone: jBone, bone2: jBone2, ink: jInk, ink2: jInk2, accent: jAccent });

    // ── VALUE DIRECTION (dark-signature aware) ──
    // On a dark ground the gesture is PALE: deepen it toward WHITE for punch and
    // let the DARK GROUND show through dry-brush patches. On a light ground the
    // gesture is dark: deepen toward BLACK and let the bone show through.
    const darkGround = !!pal.dark;
    const gestureDeep = darkGround ? '#ffffff' : '#000000'; // pull the mark toward
    const dryShow = pal.bone2;                               // what dry patches reveal = ground

    // ── PAPER GROUND: warm bone with subtle two-tone wash + tooth ──
    paintGround(x, W, H, pal, noise, r);

    // ── helper: a single dry-brush calligraphic stroke between two points ──
    // Broad, fast, with frayed dry edges and internal ink density variation.
    function brushStroke(x0, y0, x1, y1, width, col, opts) {
      opts = opts || {};
      const dx = x1 - x0, dy = y1 - y0;
      const len = Math.hypot(dx, dy) || 1;
      const ux = dx / len, uy = dy / len;      // along-stroke unit
      const nx = -uy, ny = ux;                  // across-stroke normal
      const steps = Math.max(48, Math.floor(len / 3));
      const taperIn = opts.taperIn != null ? opts.taperIn : 0.12;
      const taperOut = opts.taperOut != null ? opts.taperOut : 0.16;
      const dryAmt = opts.dry != null ? opts.dry : 0.5;     // dry-brush fray strength
      const wob = opts.wob != null ? opts.wob : 0.06;        // path wobble
      const phase = r() * 100;

      x.save();
      x.globalCompositeOperation = opts.blend || 'source-over';

      // build the filled stroke body as a polygon spine, then fray the edges
      // by stamping many short tapered ribs (gives weight + dry edges).
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        // longitudinal taper (calligraphic press → lift)
        let env = 1;
        if (t < taperIn) env = Math.pow(t / taperIn, 0.7);
        else if (t > 1 - taperOut) env = Math.pow((1 - t) / taperOut, 0.8);
        // belly: thicker mid-stroke
        env *= 0.78 + 0.22 * Math.sin(Math.PI * t);
        // organic width breathing
        const breathe = 1 + 0.16 * noise.fbm((t * 6 + phase), phase * 0.3, 3);
        const halfW = (width * 0.5) * env * breathe;
        if (halfW < 0.4) continue;

        // path wobble — hand imperfection, drift off the ideal line
        const drift = (noise.fbm(t * 3.2 + phase, phase, 4)) * width * wob * len * 0.012;
        const cxp = x0 + dx * t + nx * drift;
        const cyp = y0 + dy * t + ny * drift;

        // ink density: dense black core, occasional thin/skipped dry patches.
        const dens = K.clamp(0.62 + 0.4 * noise.fbm(t * 9 + phase, 4.3, 4), 0, 1);
        const a = (opts.alpha != null ? opts.alpha : 1) * (0.9 + 0.1 * dens);
        // deepen non-accent gesture toward its value extreme so strokes match
        // the muscular value of the slab beams (accent colour kept pure). On a
        // dark ground that means toward white (pale mark), else toward black.
        const ribCol = (col === pal.accent) ? col : K.mix(col, gestureDeep, darkGround ? 0.28 : 0.4);

        // main rib (the solid body)
        x.fillStyle = K.rgba(ribCol, a);
        x.beginPath();
        x.moveTo(cxp + nx * halfW, cyp + ny * halfW);
        x.lineTo(cxp - nx * halfW, cyp - ny * halfW);
        const t2 = Math.min(1, t + 1 / steps);
        const env2drift = (noise.fbm(t2 * 3.2 + phase, phase, 4)) * width * wob * len * 0.012;
        const c2x = x0 + dx * t2 + nx * env2drift, c2y = y0 + dy * t2 + ny * env2drift;
        let env2 = 1;
        if (t2 < taperIn) env2 = Math.pow(t2 / taperIn, 0.7);
        else if (t2 > 1 - taperOut) env2 = Math.pow((1 - t2) / taperOut, 0.8);
        env2 *= 0.78 + 0.22 * Math.sin(Math.PI * t2);
        const halfW2 = (width * 0.5) * env2 * (1 + 0.16 * noise.fbm(t2 * 6 + phase, phase * 0.3, 3));
        x.lineTo(c2x - nx * halfW2, c2y - ny * halfW2);
        x.lineTo(c2x + nx * halfW2, c2y + ny * halfW2);
        x.closePath();
        x.fill();
      }

      // dry-brush fray: streaks of skipped ink along edges and tail
      const frayN = Math.floor(len * dryAmt * 0.5);
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < frayN; i++) {
        const t = r();
        let env = 1;
        if (t < taperIn) env = t / taperIn;
        else if (t > 1 - taperOut) env = (1 - t) / taperOut;
        env *= 0.78 + 0.22 * Math.sin(Math.PI * t);
        const halfW = (width * 0.5) * env;
        // bias frays toward the trailing/leading edge (dry skip)
        const edge = (r() < 0.5 ? -1 : 1);
        const off = edge * halfW * (0.55 + r() * 0.5);
        const px = x0 + dx * t + nx * off;
        const py = y0 + dy * t + ny * off;
        const fl = 4 + r() * 22 * dryAmt;
        const fw = 0.5 + r() * 2.2;
        const cut = 0.10 + r() * 0.4;
        x.globalAlpha = cut;
        x.fillStyle = '#000';
        x.save();
        x.translate(px, py);
        x.rotate(Math.atan2(uy, ux));
        x.fillRect(-fl / 2, -fw / 2, fl, fw);
        x.restore();
      }
      x.globalAlpha = 1;
      x.restore();
    }

    // ── helper: a broad SLAB/BEAM laid as a fast brush mass ──
    // NOT a vector rectangle: an irregular hand-laid contour (the long edges
    // breathe), filled with overlapping broad brush passes so the surface has
    // ink density variation, plus dry-brush skip + frayed ends. Reads as a
    // beam swung in one stroke, the same ink language as brushStroke.
    function slab(cx, cy, w, h, ang, col, opts) {
      opts = opts || {};
      const alpha = opts.alpha != null ? opts.alpha : 1;
      x.save();
      x.translate(cx, cy);
      x.rotate(ang);
      const ph = r() * 60;
      // irregular contour: top and bottom long edges wobble independently;
      // the two short ends taper a touch (brush enters/leaves the mass).
      const segs = Math.max(20, Math.floor(w / 14));
      const topEdge = [], botEdge = [];
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const px = -w / 2 + w * t;
        // gentle end-taper so the mass isn't a hard rectangle
        let endEnv = 1;
        const et = 0.06 + r() * 0.04;
        if (t < et) endEnv = 0.6 + 0.4 * (t / et);
        else if (t > 1 - et) endEnv = 0.6 + 0.4 * ((1 - t) / et);
        const wob = h * 0.5 * endEnv;
        const dT = wob * (1 + 0.18 * noise.fbm(t * 5 + ph, ph, 3));
        const dB = wob * (1 + 0.18 * noise.fbm(t * 5 + ph + 20, ph + 7, 3));
        topEdge.push([px, -dT]);
        botEdge.push([px, dB]);
      }
      // fill the mass
      x.globalCompositeOperation = opts.blend || 'source-over';
      x.fillStyle = K.rgba(col, alpha);
      x.beginPath();
      x.moveTo(topEdge[0][0], topEdge[0][1]);
      for (const p of topEdge) x.lineTo(p[0], p[1]);
      for (let i = botEdge.length - 1; i >= 0; i--) x.lineTo(botEdge[i][0], botEdge[i][1]);
      x.closePath();
      x.fill();

      // INTERIOR: dense core with ORGANIC ink-density variation — an fbm mottle
      // field (NOT parallel streaks: no wood-grain). Where the loaded brush
      // dragged dry, the GROUND shows faintly through.
      x.save();
      x.clip();
      // deepen the core toward the gesture's value extreme (black on a light
      // ground, white on a dark ground); accent kept pure.
      x.globalCompositeOperation = 'source-atop';
      x.fillStyle = K.rgba(K.mix(col, gestureDeep, col === pal.accent ? 0.0 : (darkGround ? 0.3 : 0.45)), 0.5);
      x.fillRect(-w / 2, -h / 2, w, h);
      // dry-patch reveal: fbm-driven blobs along the drag direction let the
      // ground tone bleed through the loaded brush.
      const cell = Math.max(3, Math.floor(Math.min(w, h) / 60));
      const aspect = Math.max(1, w / h); // stretch the noise along the beam = drag streaks, not grain
      for (let yy = -h / 2; yy < h / 2; yy += cell) {
        for (let xx = -w / 2; xx < w / 2; xx += cell) {
          const n = (noise.fbm((xx / aspect) / (h * 0.5) + ph, yy / (h * 0.5) + ph + 11, 4) + 1) / 2;
          if (n > 0.62) {
            const t = K.clamp((n - 0.62) / 0.38, 0, 1);
            x.fillStyle = K.rgba(dryShow, t * 0.18);
            x.fillRect(xx, yy, cell + 1, cell + 1);
          }
        }
      }
      x.restore();

      // dry-brush skip along both long edges + occasional internal scratch
      x.globalCompositeOperation = 'destination-out';
      const skipN = Math.floor(w / 4);
      for (let i = 0; i < skipN; i++) {
        const t = r();
        const side = r() < 0.5 ? -1 : 1;
        const px = -w / 2 + w * t;
        const base = side < 0 ? -h / 2 : h / 2;
        const bite = r() * h * (0.18 + r() * 0.18);
        x.globalAlpha = 0.12 + r() * 0.4;
        x.fillStyle = '#000';
        x.fillRect(px, side < 0 ? base : base - bite, 0.8 + r() * 3.2, bite);
      }
      // a few faint internal dry streaks (un-inked paper showing through)
      for (let i = 0; i < Math.floor(w / 30); i++) {
        const yy = -h / 2 + r() * h;
        x.globalAlpha = 0.05 + r() * 0.12;
        x.fillStyle = '#000';
        x.fillRect(-w / 2 + r() * w * 0.3, yy, w * (0.2 + r() * 0.5), 0.6 + r() * 1.6);
      }
      x.globalAlpha = 1;
      x.restore();
    }

    // ── helper: a percussive STAMP / blot — an irregular brushy splat, NOT a
    //    disc: elongated along a random axis with strong asymmetric wobble, so
    //    it reads as a struck mark, never a planet/dot. ──
    function blot(cx, cy, rad, col, alpha) {
      x.save();
      x.translate(cx, cy);
      const axis = r() * Math.PI;          // elongation direction
      x.rotate(axis);
      const elong = 1.25 + r() * 0.7;      // squash the perpendicular axis
      const ph = r() * 30;
      x.fillStyle = K.rgba(col, alpha != null ? alpha : 1);
      const segs = 26;
      x.beginPath();
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const ca = Math.cos(a), sa = Math.sin(a);
        // multi-octave lumpiness + a hard bias so one side bulges (struck edge)
        const wob = 1 + 0.34 * noise.fbm(ca * 2.4 + ph, sa * 2.4 + ph, 4)
                      + 0.12 * Math.sin(a * 3 + ph) + (r() - 0.5) * 0.14;
        const rr = rad * Math.max(0.45, wob);
        const px = ca * rr * elong, py = sa * rr;
        if (i === 0) x.moveTo(px, py); else x.lineTo(px, py);
      }
      x.closePath();
      x.fill();
      // dry-skip bite out of the trailing edge
      x.globalCompositeOperation = 'destination-out';
      for (let i = 0; i < 14; i++) {
        x.globalAlpha = 0.1 + r() * 0.35;
        x.fillStyle = '#000';
        const a = r() * Math.PI * 2;
        const d = rad * (0.7 + r() * 0.5);
        x.beginPath();
        x.arc(Math.cos(a) * d * elong, Math.sin(a) * d, 0.6 + r() * 2.4, 0, 7);
        x.fill();
      }
      x.globalAlpha = 1;
      x.globalCompositeOperation = 'source-over';
      // a few spatter flecks flung off the long axis
      for (let i = 0; i < 9; i++) {
        const d = rad * (1.2 + r() * 1.6);
        x.fillStyle = K.rgba(col, 0.2 + r() * 0.4);
        x.beginPath();
        x.arc((r() - 0.5) * 2 * d * elong, (r() - 0.5) * 2 * d, 0.6 + r() * 2.0, 0, 7);
        x.fill();
      }
      x.restore();
    }

    const ink = pal.ink;
    // pick which mark (if any) gets the accent colour, painted last for punch
    const accentCol = pal.accent;

    // CAMERA: re-frame the whole composition continuously — zoom in/out, pan
    // off-centre, and rotate slightly — about the canvas centre. The ground &
    // grade stay full-bleed (drawn outside this transform); only the gesture
    // family is reframed, so two same-mode pieces sit at different crop/scale.
    x.save();
    x.translate(W / 2 + panX, H / 2 + panY);
    x.rotate(compRot);
    x.scale(zoom, zoom);
    x.translate(-W / 2, -H / 2);

    // margins — designed negative space; ASYMMETRIC (independent per side) so the
    // gesture sits in a different sub-frame each seed; gScale grows/shrinks marks.
    const mxL = W * (0.06 + r() * 0.07), mxR = W * (0.06 + r() * 0.07);
    const myT = H * (0.06 + r() * 0.07), myB = H * (0.06 + r() * 0.07);
    const mx = mxL, my = myT;
    const iw = W - mxL - mxR, ih = H - myT - myB;
    const G = gScale; // shorthand: apply to every salient mark dimension below

    // ── COMPOSE per MODE ──────────────────────────────────────────────
    if (mode === 'Cleave') {
      // 2–3 massive strokes CRASHING into one off-centre node — Kline's violent
      // meeting of beams. Deliberately ASYMMETRIC: irregular angular spacing,
      // varied per-arm weight & reach, and arms biased to drive IN from a
      // dominant quadrant rather than radiate evenly (no star/asterisk).
      const node = { x: mx + iw * (0.28 + r() * 0.44), y: my + ih * (0.3 + r() * 0.4) };
      const nStk = 2 + (r() < 0.4 + density * 0.3 ? 1 : 0);
      const baseAng = r() * Math.PI * 2;
      const spread = 0.5 + r() * 0.85; // how tightly arms cluster (small = fan)
      for (let i = 0; i < nStk; i++) {
        // uneven angular spacing inside a fan, not a clean radial division
        const ang = baseAng + (i - (nStk - 1) / 2) * (1.0 + r() * 1.1) * spread + (r() - 0.5) * 0.5;
        const reach = S * (0.4 + r() * 0.6) * G;      // long incoming arm
        // most strokes barely overshoot; only sometimes punch through
        const ext = (r() < 0.4) ? S * (0.12 + r() * 0.2) * G : S * (0.0 + r() * 0.06) * G;
        const x0 = node.x - Math.cos(ang) * reach;
        const y0 = node.y - Math.sin(ang) * reach;
        const x1 = node.x + Math.cos(ang) * ext;
        const y1 = node.y + Math.sin(ang) * ext;
        const w = S * (0.05 + r() * 0.095) * G * (i === 0 ? 1.1 + r() * 0.2 : 0.8 + r() * 0.35); // first arm heaviest
        brushStroke(x0, y0, x1, y1, w, ink, { dry: 0.5 + r() * 0.4, wob: 0.05 + r() * 0.05, taperIn: 0.06 + r() * 0.1, taperOut: 0.2 + r() * 0.14 });
      }
      // ink the crash node solid for weight
      blot(node.x, node.y, S * (0.035 + r() * 0.04) * G, ink, 1);
      if (useAccent) blot(node.x + (r() - 0.5) * S * 0.14, node.y + (r() - 0.5) * S * 0.14, S * (0.024 + r() * 0.02) * G, accentCol, 0.92);

    } else if (mode === 'Scaffold') {
      // 2–3 heavy beams collapsing into a LEANING pile — all clearly DIAGONAL
      // (never axis-aligned: that makes letterforms), roughly parallel-ish but
      // fanned, stacked & overlapping like fallen girders. Suprematist tilt.
      // No verticals, no horizontals, no crossing-at-centres → no glyph read.
      const nBeam = 2 + (r() < 0.35 + density * 0.35 ? 1 : 0);
      let accentTaken = false;
      // a dominant diagonal axis, kept well off the vertical/horizontal
      const sign = r() < 0.5 ? 1 : -1;
      const baseLean = sign * (0.45 + r() * 0.7); // ~26°..66° off horizontal
      // pile anchor, off-centre
      const ax0 = mx + iw * (0.3 + r() * 0.34), ay0 = my + ih * (0.3 + r() * 0.34);
      // perpendicular to the lean = the direction we stack beams along
      const stackAng = baseLean + Math.PI / 2;
      // a SINGLE small monotonic fan across the stack (hand-of-cards), so beams
      // stay parallel-ish girders and never converge to a vertex (no "V"/glyph).
      const fanDir = (r() < 0.5 ? 1 : -1) * (0.06 + r() * 0.14);
      for (let i = 0; i < nBeam; i++) {
        // each beam shares the family lean, fanned monotonically by index + a tiny
        // jitter; never near 0/90°.
        let lean = baseLean + (i - (nBeam - 1) / 2) * fanDir + (r() - 0.5) * 0.12;
        // guard: if a beam drifts toward axis-aligned, nudge it back
        const near = Math.abs(((lean % Math.PI) + Math.PI) % Math.PI);
        if (near < 0.35 || Math.abs(near - Math.PI / 2) < 0.3) lean += sign * 0.4;
        const len = S * (0.5 + r() * 0.58) * G * (i === 0 ? 1.05 + r() * 0.2 : 0.62 + r() * 0.45);
        const thick = S * (0.055 + r() * 0.085) * G * (i === 0 ? 1.1 + r() * 0.2 : 0.8 + r() * 0.35);
        // stagger beams along the stacking direction + jitter along their length
        const stagger = (i - (nBeam - 1) / 2) * (thick * (1.3 + r() * 0.8) + S * (0.03 + r() * 0.08));
        const slide = (r() - 0.5) * len * 0.5;
        const cx2 = ax0 + Math.cos(stackAng) * stagger + Math.cos(lean) * slide;
        const cy2 = ay0 + Math.sin(stackAng) * stagger + Math.sin(lean) * slide;
        const col = (useAccent && !accentTaken && r() < 0.45) ? (accentTaken = true, accentCol) : ink;
        slab(cx2, cy2, len, thick, lean, col, { alpha: 1 });
      }
      // one short counter-diagonal brush brace for tension (also kept off-axis)
      if (r() < 0.35 + density * 0.35) {
        const an = -baseLean + sign * (r() - 0.5) * 0.4;
        const bx = ax0 + (r() - 0.5) * iw * 0.2, by2 = ay0 + (r() - 0.5) * ih * 0.2;
        const ln = S * (0.22 + r() * 0.26) * G;
        brushStroke(bx - Math.cos(an) * ln * 0.5, by2 - Math.sin(an) * ln * 0.5,
                    bx + Math.cos(an) * ln * 0.5, by2 + Math.sin(an) * ln * 0.5,
                    S * (0.03 + r() * 0.04) * G, ink, { dry: 0.6, taperIn: 0.18, taperOut: 0.2 });
      }

    } else if (mode === 'Bridge') {
      // one DOMINANT spanning beam, deliberately TILTED off the horizontal,
      // crossed by a short heavy bar set off-centre at a CONTRARY angle so the
      // pair never reads as a "+" or a "t" — two masses in dynamic balance,
      // with a great wedge of negative space. The most architectural mode.
      const tilt = (r() - 0.5) * 0.55 + (r() < 0.5 ? 0 : (r() < 0.5 ? 0.18 : -0.18));
      const by = my + ih * (0.3 + r() * 0.4);
      const h = S * (0.08 + r() * 0.09) * G;
      // span length is now a real variable: some bridges traverse the whole
      // field, some are clearly shorter than full-width.
      const spanW = iw * (0.74 + r() * 0.34) * G;
      const bcx = W * 0.5 + (r() - 0.5) * iw * 0.18, bcy = by;
      const spanCol = (useAccent && r() < 0.35) ? accentCol : ink;
      slab(bcx, bcy, spanW, h, tilt, spanCol, { alpha: 1 });
      // a short, fat counter-bar offset to one third, NOT centred, NOT square
      // to the beam — a contrary tilt creates torque rather than a cross.
      let accentTaken = spanCol !== ink;
      const side = r() < 0.5 ? -1 : 1;
      const ccx = bcx + side * spanW * (0.22 + r() * 0.14);
      // bias the counter-bar AWAY from perpendicular (avoid a "+"/"T"): keep
      // it in the 25–60° band relative to the beam.
      const counterAng = tilt + (r() < 0.5 ? 1 : -1) * (0.45 + r() * 0.6);
      const cOff = (r() < 0.5 ? -1 : 1) * h * (0.8 + r() * 1.4);
      const cw = S * (0.22 + r() * 0.28) * G, ch = S * (0.06 + r() * 0.06) * G;
      const ccol = (useAccent && !accentTaken && r() < 0.55) ? (accentTaken = true, accentCol) : ink;
      slab(ccx, bcy + cOff, cw, ch, counterAng, ccol, { alpha: 1 });
      // optional small punctuating blot far in the open field for balance
      if (r() < 0.3 + density * 0.35) {
        const bx2 = bcx - side * spanW * (0.3 + r() * 0.14);
        const by2 = bcy - cOff * (0.6 + r() * 0.8);
        const bcol = (useAccent && !accentTaken && r() < 0.4) ? (accentTaken = true, accentCol) : ink;
        blot(bx2, by2, S * (0.02 + r() * 0.025) * G, bcol, 0.95);
      }

    } else if (mode === 'Pivot') {
      // an L-bend / dog-leg beam: one long DOMINANT arm and a heavy second arm
      // that folds at a near-right angle and is rendered as a SLAB MASS (not a
      // thin matching wing). The elbow sits at a corner of the field and the
      // dominant arm is anchored toward an edge so the fold opens like a bracket
      // / girder joint — never a symmetric upward V (bird).
      const corner = K.rint(r, 0, 3); // 0=TL 1=TR 2=BR 3=BL — elbow toward a corner
      const px = mx + iw * (corner === 1 || corner === 2 ? 0.6 + r() * 0.18 : 0.22 + r() * 0.18);
      const py = my + ih * (corner >= 2 ? 0.6 + r() * 0.18 : 0.22 + r() * 0.18);
      // dominant arm fires roughly toward the opposite side (across the field)
      const toCx = W * 0.5 - px, toCy = H * 0.5 - py;
      const a1 = Math.atan2(toCy, toCx) + (r() - 0.5) * 0.5;
      // the fold turns to ONE side → an angular knee, not a splay. Widen the
      // bend range so it isn't a tidy ~90° tick; let it open shallow or fold
      // hard so the pair never settles into a checkmark/V symbol.
      const bend = (r() < 0.5 ? 1 : -1) * (Math.PI * (0.3 + r() * 0.42));
      const a2 = a1 + bend;
      // strong length asymmetry — one arm clearly dominates the other
      const l1 = S * (0.4 + r() * 0.4) * G;
      const l2 = l1 * (0.38 + r() * 0.38);
      const w = S * (0.07 + r() * 0.08) * G;
      // dominant arm as a brush beam
      brushStroke(px, py, px + Math.cos(a1) * l1, py + Math.sin(a1) * l1, w, ink, { dry: 0.45, taperIn: 0.04, taperOut: 0.2, wob: 0.05 });
      // second arm as a SLAB (mass, gives the joint architectural weight)
      const m2x = px + Math.cos(a2) * l2 * 0.5, m2y = py + Math.sin(a2) * l2 * 0.5;
      slab(m2x, m2y, l2, w * (0.9 + r() * 0.35), a2, ink, { alpha: 1 });
      if (useAccent) {
        blot(px + Math.cos(a1) * l1 * 0.6, py + Math.sin(a1) * l1 * 0.6, S * (0.016 + r() * 0.014) * G, accentCol, 0.9);
      }

    } else if (mode === 'Stamp') {
      // percussive field: one DOMINANT heavy mark anchors the composition, with
      // a few smaller marks answering it in rhythmic, varied scale — a drumbeat,
      // not a row. Strong scale hierarchy + a loose syncopated grid (order vs
      // chaos). Heavy negative space.
      const n = 3 + ((r() * (2 + density * 2.4)) | 0); // 3..7, density-driven count
      const cols = n <= 3 ? n : 2 + (r() < 0.5 ? 0 : 1);
      const rows = Math.ceil(n / cols);
      const order = K.shuffle(Array.from({ length: n }, (_, i) => i), r);
      const bigIdx = order[0]; // the dominant beat
      const accentIdx = useAccent ? order[1 % n] : -1;
      const jit = 0.1 + r() * 0.16; // grid jitter strength varies per piece
      let placed = 0;
      for (let gy = 0; gy < rows && placed < n; gy++) {
        for (let gx = 0; gx < cols && placed < n; gx++) {
          const cxp = mx + iw * ((gx + 0.5) / cols) + (r() - 0.5) * iw * jit;
          const cyp = my + ih * ((gy + 0.5) / rows) + (r() - 0.5) * ih * jit;
          const col = placed === accentIdx ? accentCol : ink;
          const big = placed === bigIdx;
          const sc = big ? (1.7 + r() * 1.1) : (0.45 + r() * 0.7);
          // the dominant beat is ALWAYS a real beam; others favour slabs, with
          // blots only as occasional small punctuation.
          if (big || r() < 0.72) {
            const w = S * (0.11 + r() * 0.11) * G * sc, h = S * (0.04 + r() * 0.055) * G * (big ? 1.5 : 1);
            slab(cxp, cyp, w, h, (r() - 0.5) * 1.6, col, { alpha: 1 });
          } else {
            // heavy splat punctuation (small)
            blot(cxp, cyp, S * (0.028 + r() * 0.035) * G * sc, col, 1);
          }
          placed++;
        }
      }

    } else { // 'Sweep' — one long fast diagonal lash across the field with a
      // secondary short counter-stroke; speed and air. The most "fast" mode.
      const dir = r() < 0.5 ? 1 : -1;
      const y0 = my + ih * (0.06 + r() * 0.26);
      const y1 = my + ih * (0.64 + r() * 0.3);
      const x0 = dir > 0 ? mx + iw * (r() * 0.14) : mx + iw * (0.86 + r() * 0.14);
      const x1 = dir > 0 ? mx + iw * (0.86 + r() * 0.14) : mx + iw * (r() * 0.14);
      const w = S * (0.065 + r() * 0.085) * G;
      brushStroke(x0, y0, x1, y1, w, ink, { dry: 0.7 + r() * 0.3, taperIn: 0.06, taperOut: 0.28, wob: 0.06 });
      // a PARALLEL echo lash, offset to one side and shorter — a second swing
      // of the same arm, NOT a crossing stroke (crossings/tails read as a
      // bird/fish). Sometimes omitted entirely: a lone muscular lash is strong.
      if (r() < 0.4 + density * 0.3) {
        const baseAng = Math.atan2(y1 - y0, x1 - x0);
        const nx2 = -Math.sin(baseAng), ny2 = Math.cos(baseAng);
        const offSide = (r() < 0.5 ? 1 : -1);
        const off = S * (0.13 + r() * 0.12) * offSide;
        // echo runs alongside, covering a sub-span of the main lash
        const a = 0.1 + r() * 0.2, b = 0.55 + r() * 0.3;
        const ex0 = x0 + (x1 - x0) * a + nx2 * off, ey0 = y0 + (y1 - y0) * a + ny2 * off;
        const ex1 = x0 + (x1 - x0) * b + nx2 * off, ey1 = y0 + (y1 - y0) * b + ny2 * off;
        const col = (useAccent && r() < 0.5) ? accentCol : ink;
        brushStroke(ex0, ey0, ex1, ey1, w * (0.45 + r() * 0.25), col, { dry: 0.7, taperIn: 0.16, taperOut: 0.3, wob: 0.06 });
      }
    }

    // end CAMERA transform — atmosphere & grade are full-bleed.
    x.restore();

    // ── INK BLEED / HALO: faint warm-grey bleed around the marks reads as
    //    ink soaking into paper — kills the clip-art flatness (very subtle). ──
    // (applied by re-drawing a blurred dark wash under nothing; instead we add
    //  a global soft shadow pass approximated by mottle around dark pixels.)

    // ── ATMOSPHERE & TEXTURE GRADE ────────────────────────────────────
    // faint cool/warm haze sheet for atmosphere & depth
    const hazeCol = K.mix(pal.bone, pal.ink, 0.08);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.10, S * 1.05, 'multiply');
    // paper tooth + ink grain
    K.grain(x, W, H, 4.2, r);
    // broad printed mottle over whole sheet (riso/screenprint tooth)
    K.mottle(x, 0, 0, W, H, pal.bone, 34, r, 'overlay');
    // soft vignette grade — pulls focus, adds the gallery atmosphere
    K.vignette(x, W, H, 0.22);

    return { aspect: W / H };
  }

  // warm bone ground with a subtle diagonal two-tone wash + fibre tooth
  function paintGround(x, W, H, pal, noise, r) {
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, pal.bone);
    g.addColorStop(0.5 + (r() - 0.5) * 0.3, K.mix(pal.bone, pal.bone2, 0.5));
    g.addColorStop(1, pal.bone2);
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // very faint uneven wash (paper unevenness / ink ghost)
    const S = Math.min(W, H);
    const ph = r() * 40;
    x.save();
    x.globalCompositeOperation = 'multiply';
    const step = Math.max(4, Math.floor(S / 150));
    for (let yy = 0; yy < H; yy += step) {
      for (let xx = 0; xx < W; xx += step) {
        const n = noise.fbm(xx / (S * 0.5) + ph, yy / (S * 0.5) + ph, 4);
        const a = K.clamp(0.04 + n * 0.06, 0, 0.12);
        if (a < 0.012) continue;
        x.fillStyle = K.rgba(pal.bone2, a);
        x.fillRect(xx, yy, step + 1, step + 1);
      }
    }
    x.restore();
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const useAccent = r() < pal.accentRare;
    return {
      Palette: pal.name,
      Mode: mode,
      Format: f,
      Accent: useAccent ? pal.accentName : 'None',
    };
  }

  return { name: 'b_ictus', draw, traits };
})();


export const ictusTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderIctus: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const ICTUS_ASPECTS: readonly number[] = [1.3,1,0.78];
export const ictusSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Ochre on Pitch",
        "Pure Sumi",
        "Chalk on Char",
        "Sumi on Kozo",
        "Bone on Ink",
        "Slate & Ash"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Bridge",
        "Pivot",
        "Stamp",
        "Sweep",
        "Cleave",
        "Scaffold"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Portrait",
        "Landscape",
        "Square"
      ]
    },
    {
      "name": "Accent",
      "values": [
        "None",
        "Gamboge",
        "Oxblood",
        "Ochre",
        "Cold Blue"
      ]
    }
  ]
};
