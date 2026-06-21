// @ts-nocheck
/* AUTO-GENERATED from tools/halo/king/plasma3.js by tools/halo/king/gen_ts.mjs — do not hand-edit.
   Self-contained: inlines the halo art kit + the frozen engine, exports the
   standard EngineFn/TraitsFn/Schema/aspects. Deterministic in tokenId. */
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const KIT = /* Browser-side art kit for the halo R&D harness. Superset of the repo's
   lib/art/engines/ai/extra/_kit.ts plus noise helpers for haze/texture.
   Loaded as a plain <script> into the render page; defines window.KIT. */
(function () {
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

  return {mulberry32,rng,pick,rint,shuffle,randn,clamp,h2r,r2h,mix,lum,rgba,hsl2hex,grain,vignette,mottle,makeNoise,bloom,hazeSheet,scanlines,chromaSplit,iridescent,sheen,curl,softShadow,chromeRamp,PHI:1.61803398875,INVPHI:0.61803398875};
})();
;

/* PLASMA3 — luminous volumetric energy, evolved to the jury's concrete notes.
 *
 * v3 over v2. The jury's three structural problems with v2:
 *   A. ONE motif dominated. The node+tendril generator (Single Core /
 *      Constellation / Plume / Discharge — all "a glowing node with filaments")
 *      was ~two-thirds of supply and read as the same picture recolored.
 *   B. Aurora Bands was flat horizontal wallpaper — an anti-pattern.
 *   C. ~70% of grounds were blue/violet/purple — a lavender rut.
 *
 * v3 fixes, in order:
 *   A. The node+tendril family is now CAPPED to ~25-30% of supply. In its place
 *      are THREE genuinely new composition generators built straight from
 *      AESTHETIC.md vocabulary, each filling the frame a structurally different
 *      way:
 *        • FLUID MASS   — large poured-pigment color bodies with watercolor
 *                         bleed edges (alcohol-ink abstract, no node, no tendril).
 *        • HOLO SWEEP   — holographic gradient sweeps on a DIAGONAL with bleed
 *                         edges + irregular spacing (replaces Aurora Bands).
 *        • PRISM SHARDS — angular refracting glass facets, each a hue split,
 *                         scattered off-center with interference-moiré shimmer.
 *      Surviving energy motifs: SPARK (the capped node+tendril, now anchored off
 *      a thirds point with full-bleed tendrils off one edge), CONSTELLATION,
 *      NEBULA, PLUME, DISCHARGE.
 *   B. Aurora Bands is GONE. HOLO SWEEP is its diagonal, bleed-edged replacement.
 *   C. PALS is re-weighted: grounds span lime / tangerine / mint / hot-pink /
 *      saffron / cobalt / coral / teal, and the pick list under-weights the
 *      blue/violet entries so the lavender rut is broken. Heroes (Verdant Flare
 *      greens, Golden Citrine plume, Candy Mist pink) are expanded with siblings.
 *
 * KEEP from v2: luminous living-light quality, BRIGHT saturated grounds (never a
 *   void — the fix is hue-spread, not darkening), bespoke glow palettes,
 *   globalThis.FORCE_PAL, deterministic, varied aspects, rare events, <=1280px,
 *   fast coarse-grid haze.
 *
 * Deterministic from seed only. ALL trait-determining randomness is drawn in
 * params() in a FIXED order so traits() and draw() never disagree.
 */
const ENGINE = (function () {
  const K = KIT;

  // ── BESPOKE PLASMA LIGHT PALETTES ──────────────────────────────────────────
  // ground : the LUMINOUS atmospheric floor — a BRIGHT saturated colour, the
  //          anti-void base. GROUND HUE FAMILY is annotated for the spread fix.
  // atmo   : mid haze body. halo : cool outer glow. core : hot heart hue.
  // peak   : near-white incandescent tip (thin sparks only). spark : filament accent.
  // HIGH-VOLTAGE NEON — PLASMA's assigned color world. Electric, charged,
  // high-saturation. Every colorway is an electric pairing on a BRIGHT charged
  // ground (never a near-black void); cores are the hottest/brightest version of
  // the ground hue; complementary energies stay VIVID (anti-mud). Reads clearly
  // apart from the siblings' warm-metal / deep-jewel / soft-pastel worlds.
  const PALS = [
    // ── LIME / GREEN family ───────────────────────────────────────────────────
    // acid-lime ground, neon-green hottest core, hot-magenta shear — toxic charge
    { name: 'ACID SURGE',     ground: '#a3e635', atmo: '#caff39', halo: '#ff2d95', core: '#39ff14', peak: '#f4ffd6', spark: '#22d3ee' },
    // neon-green ground, cyan halo — pure voltage green, electric and live
    { name: 'VOLTAGE LIME',   ground: '#7cf000', atmo: '#aaff3d', halo: '#22d3ee', core: '#39ff14', peak: '#eaffe0', spark: '#ff2d95' },
    // charged-teal/green ground, lime core, magenta spark — neon bloom
    { name: 'NEON BLOOM',     ground: '#15e6a0', atmo: '#5cffc8', halo: '#ec4899', core: '#39ff14', peak: '#e6fff6', spark: '#eaff00' },

    // ── CYAN / BLUE family ────────────────────────────────────────────────────
    // electric-cyan ground, brightest cyan core, magenta arc — cold high voltage
    { name: 'CYAN DISCHARGE', ground: '#22d3ee', atmo: '#5ce9ff', halo: '#ff2d95', core: '#00f5ff', peak: '#e6feff', spark: '#a3e635' },
    // electric-blue ground, cyan core, voltage-yellow spark — charged sky
    { name: 'ELECTRO BLUE',   ground: '#2563eb', atmo: '#4f8cff', halo: '#22d3ee', core: '#19e6ff', peak: '#e6f0ff', spark: '#eaff00' },
    // charged azure ground, cyan core, hot-magenta + lime — ion field
    { name: 'ION FIELD',      ground: '#1e9bff', atmo: '#5cc0ff', halo: '#ec4899', core: '#22d3ee', peak: '#e9f6ff', spark: '#39ff14' },

    // ── MAGENTA / PINK family ─────────────────────────────────────────────────
    // hot-magenta ground, shocking-pink core, electric-cyan arc — magenta arc
    { name: 'MAGENTA ARC',    ground: '#ec4899', atmo: '#ff6fc0', halo: '#22d3ee', core: '#ff2d95', peak: '#ffe6f4', spark: '#a3e635' },
    // shocking-pink ground, hottest pink core, cyan halo — shock pulse
    { name: 'SHOCK PULSE',    ground: '#ff2d95', atmo: '#ff6fb8', halo: '#22d3ee', core: '#ff0080', peak: '#ffe6f2', spark: '#eaff00' },
    // charged rose-magenta ground, lime spark, ultraviolet halo — neon fuchsia
    { name: 'FUCHSIA STORM',  ground: '#ff3da6', atmo: '#ff70c4', halo: '#7c3aed', core: '#ff0080', peak: '#ffe6f3', spark: '#39ff14' },

    // ── ULTRAVIOLET family ────────────────────────────────────────────────────
    // ultraviolet ground (bright, not dark), magenta core, cyan — UV storm
    { name: 'ULTRAVIOLET STORM', ground: '#7c3aed', atmo: '#a45cff', halo: '#22d3ee', core: '#c026ff', peak: '#f2e6ff', spark: '#a3e635' },
    // electric violet ground, shocking-pink core, lime spark — plasma violet
    { name: 'PLASMA VIOLET',  ground: '#8b2fff', atmo: '#b06cff', halo: '#ff2d95', core: '#d24bff', peak: '#f3e6ff', spark: '#eaff00' },

    // ── VOLTAGE-YELLOW / ORANGE family ────────────────────────────────────────
    // voltage-yellow ground, hot core, magenta + cyan — charged citrus
    { name: 'VOLTAGE YELLOW', ground: '#eaff00', atmo: '#f5ff66', halo: '#ec4899', core: '#fbff14', peak: '#ffffe0', spark: '#22d3ee' },
    // plasma-orange ground, hottest orange core, cyan arc — high-heat discharge
    { name: 'PLASMA ORANGE',  ground: '#ff5e00', atmo: '#ff8a3d', halo: '#22d3ee', core: '#ff7a00', peak: '#fff0e0', spark: '#a3e635' },

    // full-spectrum: every accent a different neon — for prism/interference work
    { name: 'SPECTRUM SURGE', ground: '#ff2d95', atmo: '#22d3ee', halo: '#a3e635', core: '#eaff00', peak: '#ffffff', spark: '#7c3aed' },
  ];

  // PALETTE PICK WEIGHTS — spread the neon families evenly so no single hue
  // world dominates. Every colorway is high-voltage; the spread keeps the
  // collection reading as electric across lime / cyan / magenta / UV / yellow.
  const PAL_PICK = [
    0, 0,       // ACID SURGE      (lime)
    1,          // VOLTAGE LIME    (lime)
    2,          // NEON BLOOM      (green)
    3, 3,       // CYAN DISCHARGE  (cyan)
    4,          // ELECTRO BLUE    (blue)
    5,          // ION FIELD       (azure)
    6, 6,       // MAGENTA ARC     (magenta)
    7,          // SHOCK PULSE     (pink)
    8,          // FUCHSIA STORM   (fuchsia)
    9, 9,       // ULTRAVIOLET STORM (UV)
    10,         // PLASMA VIOLET   (violet)
    11, 11,     // VOLTAGE YELLOW  (yellow)
    12,         // PLASMA ORANGE   (orange)
    13,         // SPECTRUM SURGE  (rainbow)
  ];

  // Varied formats — long edge <= 1280. Square is the minority.
  const FMTS = [
    { W: 1024, H: 1280, t: 'Tall' },     // 4:5 portrait
    { W: 854,  H: 1280, t: 'Column' },   // 2:3 portrait
    { W: 1280, H: 854,  t: 'Wide' },     // 3:2 landscape
    { W: 1280, H: 720,  t: 'Pano' },     // 16:9 landscape
    { W: 1120, H: 1120, t: 'Square' },   // 1:1 minority
  ];

  // PRIMARY composition trait — each value is a different draw routine. The
  // node+tendril family (Spark / Constellation / Plume / Discharge) is now a
  // MINORITY; the THREE new non-energy motifs (Fluid Mass / Holo Sweep / Prism
  // Shards) plus Nebula carry the rest so pieces are COMPOSED differently.
  const MOTIFS = [
    'Spark',         // capped node+tendril (off-thirds, full-bleed off one edge)
    'Constellation', // multi-node network
    'Fluid Mass', 'Fluid Mass', 'Fluid Mass',   // poured color masses (NEW)
    'Holo Sweep', 'Holo Sweep', 'Holo Sweep',   // diagonal holo gradients (NEW, replaces Aurora)
    'Prism Shards', 'Prism Shards', 'Prism Shards', // refracting facets + moiré (NEW)
    'Nebula', 'Nebula',                          // atmospheric color clouds
    'Plume',         // streaming jets
    'Discharge',     // branching arcs
  ];

  const DENS  = ['Sparse', 'Woven', 'Dense'];     // body density
  const TEMPS = ['Hot Core', 'Cool Core'];        // which hue leads the energy

  // rare chase events: mostly None, occasional brilliant burst / eclipse
  const EVENTS = ['None', 'None', 'None', 'None', 'None', 'None', 'None', 'Energy Burst', 'Eclipse Core'];

  function params(r) {
    // FIXED DRAW ORDER — Motif first so it dominates the identity.
    const motif = K.pick(MOTIFS, r);
    let pal = PALS[K.pick(PAL_PICK, r)];
    if (globalThis.FORCE_PAL) pal = PALS.find((q) => q.name === globalThis.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const dens = K.pick(DENS, r);
    const temp = K.pick(TEMPS, r);
    const event = K.pick(EVENTS, r);
    const fx = r() < 0.5 ? 0.34 : 0.66;
    const fy = r() < 0.5 ? 0.35 : 0.65;
    const ang = (r() < 0.5 ? -1 : 1) * (0.4 + r() * 0.7);
    return { motif, pal, fmt, dens, temp, event, fx, fy, ang };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Layout: p.motif, Palette: p.pal.name, Format: p.fmt.t,
      Density: p.dens, Energy: p.temp, Event: p.event,
    };
  }

  // ── a volumetric glow node: a COLORED plasma heart. ──
  function glowNode(x, cx, cy, rad, core, peak, halo, noise, r, intensity, ang) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const ca = Math.cos(ang || 0), sa = Math.sin(ang || 0);
    const stretch = 1.5;
    const tx = (px, py) => {
      const dx = px - cx, dy = py - cy;
      const along = dx * ca + dy * sa, perp = -dx * sa + dy * ca;
      const a2 = along * stretch, p2 = perp;
      return [cx + a2 * ca - p2 * sa, cy + a2 * sa + p2 * ca];
    };
    {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad * 2.4);
      g.addColorStop(0, K.rgba(halo, 0.0));
      g.addColorStop(0.16, K.rgba(halo, 0.18 * intensity));
      g.addColorStop(0.5, K.rgba(K.mix(halo, core, 0.3), 0.09 * intensity));
      g.addColorStop(1, K.rgba(halo, 0));
      x.fillStyle = g; x.fillRect(cx - rad * 2.4, cy - rad * 2.4, rad * 4.8, rad * 4.8);
    }
    {
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, K.rgba(K.mix(core, peak, 0.16), 0.40 * intensity));
      g.addColorStop(0.08, K.rgba(K.mix(core, peak, 0.04), 0.40 * intensity));
      g.addColorStop(0.30, K.rgba(core, 0.42 * intensity));
      g.addColorStop(0.6, K.rgba(K.mix(core, halo, 0.35), 0.16 * intensity));
      g.addColorStop(0.85, K.rgba(K.mix(core, halo, 0.6), 0.05 * intensity));
      g.addColorStop(1, K.rgba(halo, 0));
      x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    }
    {
      const puffs = 36 + Math.floor(r() * 26);
      for (let i = 0; i < puffs; i++) {
        const aa = r() * Math.PI * 2;
        const rr = Math.pow(r(), 0.62) * rad * 1.05;
        let px = cx + Math.cos(aa) * rr, py = cy + Math.sin(aa) * rr;
        const tp = tx(px, py); px = tp[0]; py = tp[1];
        const n = (noise.fbm(px / 70, py / 70, 5) + 1) / 2;
        const t = rr / (rad * 1.05);
        const a = (0.04 + n * 0.14) * intensity * (1 - t * 0.5);
        if (a < 0.012) continue;
        const pr = rad * (0.08 + n * 0.26) * stretch;
        const hue = t < 0.4 ? K.mix(core, peak, 0.18 + r() * 0.2) : K.mix(core, halo, t * 0.85);
        const g = x.createRadialGradient(px, py, 0, px, py, pr);
        g.addColorStop(0, K.rgba(hue, a));
        g.addColorStop(1, K.rgba(hue, 0));
        x.fillStyle = g; x.beginPath(); x.arc(px, py, pr, 0, Math.PI * 2); x.fill();
      }
    }
    x.restore();
  }

  // ── tiny incandescent spark. ──
  function spark(x, cx, cy, rad, peak, coreHue, a0) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, K.rgba(K.mix(peak, coreHue, 0.35), a0));
    g.addColorStop(0.5, K.rgba(coreHue, a0 * 0.3));
    g.addColorStop(1, K.rgba(coreHue, 0));
    x.fillStyle = g; x.fillRect(cx - rad, cy - rad, rad * 2, rad * 2);
    x.restore();
  }

  // ── filament tendrils of light. ──
  function filaments(x, W, H, noise, col, hi, cx, cy, count, len, spread, r, scale, ang, biasMin) {
    scale = scale || 1; ang = ang || 0; biasMin = biasMin == null ? 0.6 : biasMin;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const perpx = -sa, perpy = ca;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.lineCap = 'round'; x.lineJoin = 'round';
    for (let f = 0; f < count; f++) {
      const along = (r() - 0.78) * spread * 2.4;
      const off = (r() - 0.5) * spread * 1.5;
      let px = cx + ca * along + perpx * off;
      let py = cy + sa * along + perpy * off;
      const startX = px, startY = py;
      const bias = biasMin + r() * 0.14;
      const fan = (r() - 0.5) * 0.9;
      const fca = Math.cos(ang + fan), fsa = Math.sin(ang + fan);
      const pts = [[px, py]];
      for (let i = 0; i < len; i++) {
        const c = K.curl(noise, px + 1300, py + 1300, 1.1);
        const cl = Math.hypot(c[0], c[1]) || 1;
        let vx = fca * bias + (c[0] / cl) * (1 - bias);
        let vy = fsa * bias + (c[1] / cl) * (1 - bias);
        const vl = Math.hypot(vx, vy) || 1; vx /= vl; vy /= vl;
        const sp = 10 + r() * 7;
        px += vx * sp; py += vy * sp;
        if (px < -40 || px > W + 40 || py < -40 || py > H + 40) break;
        pts.push([px, py]);
      }
      if (pts.length < 3) continue;
      const d = Math.hypot(startX - cx, startY - cy);
      const prox = K.clamp(1 - d / (spread * 1.6), 0, 1);
      const useHi = r() < 0.22;
      const w = (0.6 + r() * 1.7 + prox * 2.0) * scale;
      const baseA = (0.20 + r() * 0.28 + prox * 0.18);
      x.strokeStyle = K.rgba(K.mix(col, hi, 0.3), baseA * 0.28);
      x.lineWidth = w * 3.2;
      x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
      x.stroke();
      x.strokeStyle = K.rgba(useHi ? hi : col, baseA);
      x.lineWidth = w;
      x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
      x.stroke();
    }
    x.restore();
  }

  // ── a branching electric arc. ──
  function arc(x, x0, y0, ang, len, col, hi, w, r, depth, noise) {
    if (depth > 5 || len < 8) return;
    let px = x0, py = y0;
    const pts = [[px, py]];
    const steps = Math.max(3, Math.floor(len / 14));
    let a = ang;
    for (let i = 0; i < steps; i++) {
      const c = K.curl(noise, px + 700, py + 700, 1.1);
      a += (c[0] - c[1]) * 0.18 + (r() - 0.5) * 0.5;
      const sp = len / steps;
      px += Math.cos(a) * sp; py += Math.sin(a) * sp;
      pts.push([px, py]);
    }
    x.strokeStyle = K.rgba(K.mix(col, hi, 0.4), 0.22);
    x.lineWidth = w * 3.0;
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.stroke();
    x.strokeStyle = K.rgba(r() < 0.4 ? hi : col, 0.5);
    x.lineWidth = w;
    x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]);
    x.stroke();
    const forks = 1 + Math.floor(r() * 2);
    for (let k = 0; k < forks; k++) {
      const idx = 1 + Math.floor(r() * (pts.length - 1));
      const [bx, by] = pts[idx];
      arc(x, bx, by, a + (r() - 0.5) * 1.4, len * (0.45 + r() * 0.3),
          col, hi, w * 0.66, r, depth + 1, noise);
    }
  }

  // ── caustic shimmer: rippling thin bright bands ──
  function caustics(x, W, H, noise, col, cx, cy, count, r, spreadW, spreadH) {
    spreadW = spreadW || 0.7; spreadH = spreadH || 0.7;
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.lineCap = 'round';
    for (let c0 = 0; c0 < count; c0++) {
      const t0 = r();
      let px = cx + (r() - 0.5) * W * spreadW;
      let py = cy + (r() - 0.5) * H * spreadH;
      x.strokeStyle = K.rgba(col, 0.08 + r() * 0.14);
      x.lineWidth = 0.5 + r() * 1.1;
      x.beginPath(); x.moveTo(px, py);
      const steps = 28 + Math.floor(r() * 24);
      for (let i = 0; i < steps; i++) {
        const ph = noise.fbm(px / 60 + t0 * 10, py / 60, 3) * Math.PI * 2;
        px += Math.cos(ph) * (5 + r() * 4);
        py += Math.sin(ph) * (5 + r() * 4);
        if (px < -20 || px > W + 20 || py < -20 || py > H + 20) break;
        x.lineTo(px, py);
      }
      x.stroke();
    }
    x.restore();
  }

  // ── BRIGHT NEBULAR GROUND — a luminous saturated field, never near-black. ──
  function paintGround(x, W, H, P, r, fx, fy, brightLift) {
    brightLift = brightLift || 0;
    const g = x.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, K.mix(P.ground, P.atmo, 0.15 + r() * 0.1));
    g.addColorStop(0.5, K.mix(P.ground, '#ffffff', 0.04 + brightLift * 0.06));
    g.addColorStop(1, K.mix(P.atmo, P.ground, 0.35));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    K.bloom(x, fx, fy, Math.max(W, H) * 0.8, K.mix(P.atmo, P.halo, 0.4), 0.10 + brightLift * 0.06);
    K.bloom(x, W * (1 - fx / W), H * (1 - fy / H),
            Math.max(W, H) * 0.6, K.mix(P.atmo, P.core, 0.3), 0.08);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // THE MOTIFS
  // ════════════════════════════════════════════════════════════════════════════

  // ── SPARK — the CAPPED node+tendril. Node anchored on a thirds point (never
  //    dead-center), tendrils run full-bleed OFF ONE EDGE. ──
  function motifSpark(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    const tx = r() < 0.5 ? 0.30 : 0.70;
    const ty = r() < 0.5 ? 0.30 : 0.70;
    const fx = W * tx, fy = H * ty;
    const aimA = Math.atan2((ty > 0.5 ? -1 : 1) * (0.5 + r() * 0.6),
                            (tx > 0.5 ? -1 : 1) * (0.7 + r() * 0.5));
    const coreHue = p.temp === 'Cool Core' ? P.halo : P.core;
    const haloHue = p.temp === 'Cool Core' ? P.core : P.halo;
    const coreRad = minWH * (0.16 + r() * 0.05);
    K.bloom(x, fx, fy, coreRad * 2.6, K.mix(haloHue, coreHue, 0.5), 0.16);
    K.bloom(x, fx, fy, coreRad * 1.3, coreHue, 0.20);
    glowNode(x, fx, fy, coreRad, coreHue, coreHue, haloHue, noise, r, 0.62, aimA);
    K.bloom(x, fx, fy, coreRad * 0.5, K.mix(coreHue, P.peak, 0.4), 0.16);
    const filCount = p.dens === 'Dense' ? 56 : p.dens === 'Woven' ? 42 : 30;
    const ca = Math.cos(aimA), sa = Math.sin(aimA);
    const ofx = fx + ca * coreRad * 1.3, ofy = fy + sa * coreRad * 1.3;
    filaments(x, W, H, noise, K.mix(coreHue, P.spark, 0.5), K.mix(P.spark, P.peak, 0.5),
              ofx, ofy, filCount, 150, minWH * 0.5, r, 1.0, aimA, 0.78);
    filaments(x, W, H, noise, K.mix(haloHue, P.spark, 0.4), P.spark,
              ofx, ofy, Math.floor(filCount * 0.45), 120, minWH * 0.58, r, 0.8, aimA, 0.74);
    spark(x, fx, fy, coreRad * 0.08, K.mix(P.peak, coreHue, 0.55), coreHue, 0.10);
    return { fx, fy };
  }

  // ── CONSTELLATION — several glow nodes on phi/thirds points. ──
  function motifConstellation(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    const xs = [0.28, 0.5, 0.72, 1 - K.INVPHI, K.INVPHI];
    const ys = [0.3, 0.52, 0.7, 1 - K.INVPHI, K.INVPHI];
    const pts = [];
    for (const ax of xs) for (const ay of ys) pts.push([ax, ay]);
    for (let i = pts.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); const t = pts[i]; pts[i] = pts[j]; pts[j] = t; }
    const n = 3 + Math.floor(r() * 4);
    let first = null;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i];
      const cx = W * (ax + (r() - 0.5) * 0.06);
      const cy = H * (ay + (r() - 0.5) * 0.06);
      if (!first) first = { fx: cx, fy: cy };
      const big = i === 0;
      const rad = minWH * (big ? 0.13 + r() * 0.05 : 0.05 + r() * 0.06);
      const swap = r() < 0.5;
      const coreHue = swap ? P.core : P.halo;
      const haloHue = swap ? P.halo : P.core;
      glowNode(x, cx, cy, rad, coreHue, P.peak, haloHue, noise, r, big ? 0.85 : 0.6, A + (r() - 0.5));
      filaments(x, W, H, noise, K.mix(coreHue, P.spark, 0.5), P.peak, cx, cy,
                big ? 18 : 8, 60, rad * 2.2, r, 0.8, A + (r() - 0.5) * 0.6, 0.5);
      spark(x, cx, cy, rad * 0.26, P.peak, coreHue, big ? 0.26 : 0.18);
    }
    return first;
  }

  // ── NEBULA — soft volumetric colour clouds, NO discrete core. ──
  function motifNebula(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    const clouds = p.dens === 'Dense' ? 16 : p.dens === 'Woven' ? 13 : 10;
    const cols = [K.mix(P.atmo, P.core, 0.45), K.mix(P.atmo, P.halo, 0.55),
                  K.mix(P.halo, P.peak, 0.35), K.mix(P.core, P.peak, 0.3),
                  K.mix(P.atmo, P.spark, 0.4), P.core, P.halo];
    const lobeX = W * p.fx, lobeY = H * p.fy;
    for (let i = 0; i < clouds; i++) {
      const t = i / clouds;
      const toLobe = r() < 0.55;
      const cx = toLobe ? lobeX + (r() - 0.5) * minWH * 0.6 : W * (0.1 + r() * 0.8);
      const cy = toLobe ? lobeY + (r() - 0.5) * minWH * 0.6 : H * (0.1 + r() * 0.8);
      const rad = minWH * (0.22 + r() * 0.38) * (0.7 + t * 0.5);
      const col = cols[Math.floor(r() * cols.length)];
      K.bloom(x, cx, cy, rad, col, 0.08 + r() * 0.08);
    }
    K.hazeSheet(x, W, H, noise, K.mix(P.atmo, P.halo, 0.4), 0.18, 120, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(P.core, P.peak, 0.3), 0.12, 70, 'screen');
    const seeds = 2 + Math.floor(r() * 2);
    for (let i = 0; i < seeds; i++) {
      const cx = lobeX + (r() - 0.5) * minWH * 0.4, cy = lobeY + (r() - 0.5) * minWH * 0.4;
      K.bloom(x, cx, cy, minWH * (0.1 + r() * 0.08), K.mix(P.peak, P.core, 0.45), 0.13);
    }
    caustics(x, W, H, noise, K.mix(P.spark, P.peak, 0.5), W * 0.5, H * 0.5, 12, r, 0.95, 0.95);
    return { fx: W * 0.5, fy: H * 0.5 };
  }

  // ── PLUME — streaming jets sweeping a strong diagonal, emitter at one edge. ──
  function motifPlume(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    const fromLeft = r() < 0.5, fromTop = r() < 0.5;
    const ex = fromLeft ? W * (0.04 + r() * 0.12) : W * (0.84 + r() * 0.12);
    const ey = fromTop ? H * (0.06 + r() * 0.2) : H * (0.74 + r() * 0.2);
    const aimA = Math.atan2((fromTop ? 1 : -1) * (0.4 + r() * 0.4),
                            (fromLeft ? 1 : -1) * (0.7 + r() * 0.4));
    const coreHue = p.temp === 'Cool Core' ? P.halo : P.core;
    glowNode(x, ex, ey, minWH * (0.1 + r() * 0.05), coreHue, P.peak,
             p.temp === 'Cool Core' ? P.core : P.halo, noise, r, 0.8, aimA);
    const dens = p.dens === 'Dense' ? 1.5 : p.dens === 'Woven' ? 1.1 : 0.8;
    filaments(x, W, H, noise, K.mix(coreHue, P.spark, 0.5), P.peak, ex, ey,
              Math.floor(60 * dens), 150, minWH * 0.55, r, 1.1, aimA, 0.74);
    filaments(x, W, H, noise, K.mix(P.halo, P.peak, 0.4), P.spark, ex, ey,
              Math.floor(34 * dens), 130, minWH * 0.65, r, 0.85, aimA, 0.7);
    filaments(x, W, H, noise, P.peak, P.spark, ex, ey,
              Math.floor(10 * dens), 170, minWH * 0.4, r, 1.5, aimA, 0.8);
    spark(x, ex, ey, minWH * 0.05, P.peak, coreHue, 0.26);
    return { fx: ex, fy: ey };
  }

  // ── DISCHARGE — branching electric arcs forking across a BRIGHT ground. ──
  function motifDischarge(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    const emitters = 2 + Math.floor(r() * 2);
    const dens = p.dens === 'Dense' ? 1.5 : p.dens === 'Woven' ? 1.1 : 0.8;
    const col = K.mix(p.temp === 'Cool Core' ? P.halo : P.core, P.spark, 0.5);
    let first = null;
    x.save(); x.globalCompositeOperation = 'lighter'; x.lineCap = 'round'; x.lineJoin = 'round';
    for (let e = 0; e < emitters; e++) {
      const ex = W * (0.12 + r() * 0.76);
      const ey = H * (0.12 + r() * 0.76);
      if (!first) first = { fx: ex, fy: ey };
      const trunks = Math.floor((3 + r() * 3) * dens);
      for (let t = 0; t < trunks; t++) {
        const a0 = A + (t / trunks) * Math.PI * 2 + (r() - 0.5) * 0.6;
        arc(x, ex, ey, a0, maxWH * (0.4 + r() * 0.4), col, P.peak,
            2.4 + r() * 1.5, r, 0, noise);
      }
      glowNode(x, ex, ey, minWH * (0.06 + r() * 0.04),
               p.temp === 'Cool Core' ? P.halo : P.core, P.peak,
               p.temp === 'Cool Core' ? P.core : P.halo, noise, r, 0.6, A);
      spark(x, ex, ey, minWH * 0.03, P.peak, col, 0.3);
    }
    x.restore();
    return first;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // THREE NEW MOTIFS (the jury's ask — composed differently, no node+tendril)
  // ════════════════════════════════════════════════════════════════════════════

  // ── softBlob: a single poured-pigment lobe with watercolor BLEED edges. ──
  function softBlob(x, cx, cy, rad, col, edge, noise, r, alpha, squash, ang) {
    squash = squash || 1; ang = ang || 0;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    x.save(); x.globalCompositeOperation = 'lighter';
    const drops = 90 + Math.floor(r() * 70);
    for (let i = 0; i < drops; i++) {
      const aa = r() * Math.PI * 2;
      const rr = Math.pow(r(), 0.5);
      const c = K.curl(noise, (cx + Math.cos(aa) * rad), (cy + Math.sin(aa) * rad), 1.2);
      const wob = 0.5 + (noise.fbm((cx + i) / 90, (cy + i) / 90, 4) + 1) * 0.4;
      const ex = Math.cos(aa) * rr * rad * squash * wob + c[0] * rad * 0.12;
      const ey = Math.sin(aa) * rr * rad * wob + c[1] * rad * 0.12;
      const px = cx + ex * ca - ey * sa;
      const py = cy + ex * sa + ey * ca;
      const t = rr;
      const dr = rad * (0.12 + r() * 0.22) * (1.1 - t * 0.4);
      const hue = K.mix(col, edge, K.clamp(t * 1.1 - 0.1 + (r() - 0.5) * 0.2, 0, 1));
      const a = alpha * (0.10 + (1 - t) * 0.22) * (0.6 + wob * 0.6);
      const g = x.createRadialGradient(px, py, 0, px, py, dr);
      g.addColorStop(0, K.rgba(hue, a));
      g.addColorStop(0.6, K.rgba(hue, a * 0.4));
      g.addColorStop(1, K.rgba(hue, 0));
      x.fillStyle = g; x.beginPath(); x.arc(px, py, dr, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }

  // FLUID MASS — large poured color bodies bleeding into each other. NO node,
  // NO tendril — pure poured-ink abstract.
  function motifFluid(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    const ca = Math.cos(A), sa = Math.sin(A);
    const dx = (r() < 0.5 ? 0.30 : 0.68), dy = (r() < 0.5 ? 0.32 : 0.68);
    const fx = W * dx, fy = H * dy;
    const bodyCols = [P.core, K.mix(P.core, P.halo, 0.4), P.halo,
                      K.mix(P.atmo, P.core, 0.5), K.mix(P.halo, P.peak, 0.3), P.spark];
    const edgeCols = [P.spark, P.peak, K.mix(P.halo, P.peak, 0.5),
                      K.mix(P.core, P.peak, 0.4), P.atmo];
    const pickB = () => bodyCols[Math.floor(r() * bodyCols.length)];
    const pickE = () => edgeCols[Math.floor(r() * edgeCols.length)];
    const heavy = p.dens === 'Dense' ? 1.25 : p.dens === 'Woven' ? 1.0 : 0.82;

    const bigR = minWH * (0.34 + r() * 0.12) * heavy;
    softBlob(x, fx + ca * bigR * 0.4, fy + sa * bigR * 0.4, bigR, pickB(), pickE(),
             noise, r, 0.95, 1.7, A);
    softBlob(x, fx - ca * bigR * 0.25 + (r() - 0.5) * minWH * 0.1,
             fy - sa * bigR * 0.25 + (r() - 0.5) * minWH * 0.1,
             bigR * 0.7, pickB(), pickE(), noise, r, 0.8, 1.4, A + (r() - 0.5) * 0.8);

    const sec = 2 + Math.floor(r() * 3);
    for (let i = 0; i < sec; i++) {
      const sx = W * (0.12 + r() * 0.76);
      const sy = H * (0.12 + r() * 0.76);
      const sr = minWH * (0.12 + r() * 0.2) * heavy;
      softBlob(x, sx, sy, sr, pickB(), pickE(), noise, r,
               0.55 + r() * 0.3, 1.0 + r() * 0.9, A + (r() - 0.5) * 1.6);
    }

    const glints = 2 + Math.floor(r() * 2);
    for (let i = 0; i < glints; i++) {
      const gx = W * (0.12 + r() * 0.76), gy = H * (0.12 + r() * 0.76);
      K.bloom(x, gx, gy, minWH * (0.03 + r() * 0.04), K.mix(P.peak, pickB(), 0.5), 0.2 + r() * 0.12);
    }

    caustics(x, W, H, noise, K.mix(P.spark, P.peak, 0.4), fx, fy, 14, r, 0.85, 0.85);
    return { fx, fy };
  }

  // HOLO SWEEP — holographic gradient sweeps on a DIAGONAL with watercolor bleed
  // edges and IRREGULAR spacing. The replacement for Aurora Bands.
  function motifHolo(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    let ang = A;
    const deg = Math.abs((ang * 180 / Math.PI) % 180);
    if (deg < 22 || deg > 158 || (deg > 68 && deg < 112)) ang += (r() < 0.5 ? 1 : -1) * 0.7;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const px = -sa, py = ca;
    const diag = Math.hypot(W, H);
    const sweeps = p.dens === 'Dense' ? 7 : p.dens === 'Woven' ? 5 : 4;
    const phase0 = r();
    const tintCols = [P.core, P.halo, P.spark, K.mix(P.core, P.halo, 0.5),
                      K.mix(P.halo, P.peak, 0.4), P.atmo];
    let off = -diag * 0.55;
    const cx0 = W * 0.5, cy0 = H * 0.5;
    for (let s = 0; s < sweeps && off < diag * 0.55; s++) {
      const gap = diag * (0.10 + r() * 0.16);
      const thick = diag * (0.06 + r() * 0.12);
      off += gap;
      const mx = cx0 + px * off, my = cy0 + py * off;
      x.save(); x.globalCompositeOperation = 'lighter';
      const segs = 26;
      const L = diag * 1.3;
      const tint = tintCols[Math.floor(r() * tintCols.length)];
      const irid = r() < 0.55;
      for (let i = 0; i < segs; i++) {
        const t = i / (segs - 1);
        const along = (t - 0.5) * L;
        const bx = mx + ca * along, by = my + sa * along;
        const hue = irid
          ? K.mix(K.iridescent(phase0 + t * (0.5 + r() * 0.4), 0.8, 0.62), tint, 0.3)
          : K.mix(tint, K.iridescent(phase0 + t * 0.6, 0.85, 0.6), 0.45);
        const wob = 1 + (noise.fbm(bx / 220 + s * 9, by / 220, 4)) * 0.5;
        const th = thick * wob;
        const ex0 = bx - px * th, ey0 = by - py * th;
        const ex1 = bx + px * th, ey1 = by + py * th;
        const g = x.createLinearGradient(ex0, ey0, ex1, ey1);
        const a = 0.05 + (noise.fbm(bx / 120 + s * 5, by / 120, 3) + 1) * 0.09;
        g.addColorStop(0, K.rgba(hue, 0));
        g.addColorStop(0.5, K.rgba(hue, a));
        g.addColorStop(1, K.rgba(hue, 0));
        x.strokeStyle = g;
        x.lineWidth = (L / segs) * 1.5;
        x.lineCap = 'round';
        const along2 = ((i + 1) / (segs - 1) - 0.5) * L;
        x.beginPath();
        x.moveTo(bx, by);
        x.lineTo(mx + ca * along2, my + sa * along2);
        x.stroke();
        if (i % 2 === 0) {
          x.strokeStyle = K.rgba(K.mix(hue, P.peak, 0.5), a * 1.4);
          x.lineWidth = 1 + r() * 1.6;
          x.beginPath(); x.moveTo(bx, by); x.lineTo(mx + ca * along2, my + sa * along2); x.stroke();
        }
      }
      x.restore();
    }
    caustics(x, W, H, noise, K.mix(P.spark, P.peak, 0.4), cx0, cy0, 18, r, 0.95, 0.95);
    const lx = W * (r() < 0.5 ? 0.32 : 0.68), ly = H * (r() < 0.5 ? 0.32 : 0.68);
    K.bloom(x, lx, ly, minWH * 0.4, K.mix(P.peak, P.core, 0.4), 0.12);
    return { fx: lx, fy: ly };
  }

  // PRISM SHARDS — angular refracting glass facets, each a hue split, scattered
  // off-center with interference-moiré shimmer in the gaps.
  function motifPrism(x, W, H, P, p, noise, r, minWH, maxWH, A) {
    x.save(); x.globalCompositeOperation = 'screen';
    const mAng1 = A + (r() - 0.5) * 0.4, mAng2 = mAng1 + (0.12 + r() * 0.18);
    const moireCol = K.mix(P.halo, P.spark, 0.4);
    for (let pass = 0; pass < 2; pass++) {
      const ma = pass === 0 ? mAng1 : mAng2;
      const cca = Math.cos(ma), ssa = Math.sin(ma);
      const ppx = -ssa, ppy = cca;
      const diag = Math.hypot(W, H);
      const gap = 7 + r() * 4;
      x.strokeStyle = K.rgba(moireCol, 0.05);
      x.lineWidth = 1.1;
      for (let o = -diag; o < diag; o += gap) {
        const mx = W / 2 + ppx * o, my = H / 2 + ppy * o;
        x.beginPath();
        x.moveTo(mx - cca * diag, my - ssa * diag);
        x.lineTo(mx + cca * diag, my + ssa * diag);
        x.stroke();
      }
    }
    x.restore();

    const focalX = W * (r() < 0.5 ? 0.32 : 0.68), focalY = H * (r() < 0.5 ? 0.32 : 0.68);
    const count = p.dens === 'Dense' ? 16 : p.dens === 'Woven' ? 12 : 8;
    const phase0 = r();
    for (let i = 0; i < count; i++) {
      const near = r() < 0.55;
      const cx = near ? focalX + (r() - 0.5) * minWH * 0.7 : W * (0.08 + r() * 0.84);
      const cy = near ? focalY + (r() - 0.5) * minWH * 0.7 : H * (0.08 + r() * 0.84);
      const scale = (near ? 0.16 + r() * 0.20 : 0.06 + r() * 0.12) * minWH;
      const rot = r() * Math.PI;
      const verts = 3 + (r() < 0.4 ? 1 : 0);
      const pts = [];
      for (let v = 0; v < verts; v++) {
        const va = rot + (v / verts) * Math.PI * 2 + (r() - 0.5) * 0.8;
        const vr = scale * (0.6 + r() * 0.8);
        pts.push([cx + Math.cos(va) * vr, cy + Math.sin(va) * vr * (0.7 + r() * 0.5)]);
      }
      const hueA = K.iridescent(phase0 + i * 0.13, 0.85, 0.62);
      const hueB = K.iridescent(phase0 + i * 0.13 + 0.18, 0.85, 0.66);
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let s = 0; s < 2; s++) {
        const ox = (s === 0 ? -1 : 1) * scale * 0.05;
        const oy = (s === 0 ? 1 : -1) * scale * 0.05;
        const g = x.createLinearGradient(pts[0][0] + ox, pts[0][1] + oy,
                                         pts[1][0] + ox, pts[1][1] + oy);
        const h = s === 0 ? hueA : hueB;
        g.addColorStop(0, K.rgba(K.mix(h, P.peak, 0.2), 0.26));
        g.addColorStop(1, K.rgba(K.mix(h, P.core, 0.3), 0.07));
        x.fillStyle = g;
        x.beginPath(); x.moveTo(pts[0][0] + ox, pts[0][1] + oy);
        for (let v = 1; v < pts.length; v++) x.lineTo(pts[v][0] + ox, pts[v][1] + oy);
        x.closePath(); x.fill();
      }
      x.strokeStyle = K.rgba(K.mix(P.peak, hueA, 0.4), 0.4);
      x.lineWidth = 0.8 + r() * 1.6;
      x.beginPath(); x.moveTo(pts[0][0], pts[0][1]);
      for (let v = 1; v < pts.length; v++) x.lineTo(pts[v][0], pts[v][1]);
      x.closePath(); x.stroke();
      if (r() < 0.5) K.sheen(x, pts[0][0], pts[0][1], scale * 0.5, P.peak, 0.3);
      x.restore();
    }
    K.bloom(x, focalX, focalY, minWH * 0.45, K.mix(P.atmo, P.core, 0.4), 0.12);
    return { fx: focalX, fy: focalY };
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const minWH = Math.min(W, H), maxWH = Math.max(W, H);
    const A = Math.atan2(p.ang, 1);
    const fx0 = W * p.fx, fy0 = H * p.fy;

    // ── 1. BRIGHT NEBULAR GROUND. Nebula gets the brightest lift; Fluid/Holo a mid.
    const lift = p.motif === 'Nebula' ? 1.0
               : (p.motif === 'Fluid Mass' || p.motif === 'Holo Sweep') ? 0.5
               : 0.2;
    paintGround(x, W, H, P, r, fx0, fy0, lift);

    // ── 2. FAR HAZE PLANE. ──
    K.hazeSheet(x, W, H, noise, K.mix(P.atmo, P.halo, 0.4), 0.14, 150, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(P.ground, P.atmo, 0.7), 0.10, 95, 'screen');

    // ── 3. THE MOTIF — the structural identity of the piece. ──
    let focal;
    switch (p.motif) {
      case 'Spark':         focal = motifSpark(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Constellation': focal = motifConstellation(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Fluid Mass':    focal = motifFluid(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Holo Sweep':    focal = motifHolo(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Prism Shards':  focal = motifPrism(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Nebula':        focal = motifNebula(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Plume':         focal = motifPlume(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      case 'Discharge':     focal = motifDischarge(x, W, H, P, p, noise, r, minWH, maxWH, A); break;
      default:              focal = { fx: fx0, fy: fy0 };
    }
    const fx = focal && focal.fx != null ? focal.fx : fx0;
    const fy = focal && focal.fy != null ? focal.fy : fy0;

    // ── 4. RARE CHASE EVENTS ── (skip where they'd fight the comp)
    const noBurst = p.motif === 'Nebula' || p.motif === 'Holo Sweep' || p.motif === 'Fluid Mass';
    if (p.event === 'Energy Burst' && !noBurst) {
      x.save(); x.globalCompositeOperation = 'lighter';
      const rays = 12 + Math.floor(r() * 10);
      for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI * 2 + r() * 0.4;
        const L = maxWH * (0.35 + r() * 0.55);
        const ex = fx + Math.cos(a0) * L, ey = fy + Math.sin(a0) * L;
        const g = x.createLinearGradient(fx, fy, ex, ey);
        g.addColorStop(0, K.rgba(P.peak, 0.4));
        g.addColorStop(0.3, K.rgba(P.spark, 0.18));
        g.addColorStop(1, K.rgba(P.spark, 0));
        x.strokeStyle = g; x.lineWidth = 1 + r() * 2.2; x.lineCap = 'round';
        x.beginPath(); x.moveTo(fx, fy); x.lineTo(ex, ey); x.stroke();
      }
      x.restore();
      K.bloom(x, fx, fy, maxWH * 0.4, K.mix(P.peak, P.core, 0.3), 0.34);
    } else if (p.event === 'Eclipse Core' && p.motif !== 'Nebula') {
      x.save(); x.globalCompositeOperation = 'source-over';
      const cr = minWH * 0.13;
      const g = x.createRadialGradient(fx, fy, 0, fx, fy, cr);
      g.addColorStop(0, K.rgba(K.mix(P.ground, P.atmo, 0.5), 0.72));
      g.addColorStop(0.7, K.rgba(K.mix(P.ground, P.atmo, 0.5), 0.4));
      g.addColorStop(1, K.rgba(P.ground, 0));
      x.fillStyle = g; x.beginPath(); x.arc(fx, fy, cr, 0, Math.PI * 2); x.fill();
      x.restore();
      x.save(); x.globalCompositeOperation = 'lighter';
      const rg = x.createRadialGradient(fx, fy, cr * 0.8, fx, fy, cr * 1.5);
      rg.addColorStop(0, K.rgba(P.peak, 0));
      rg.addColorStop(0.5, K.rgba(P.peak, 0.6));
      rg.addColorStop(0.65, K.rgba(P.spark, 0.45));
      rg.addColorStop(1, K.rgba(P.halo, 0));
      x.fillStyle = rg; x.fillRect(fx - cr * 1.5, fy - cr * 1.5, cr * 3, cr * 3);
      x.restore();
    }

    // ── 5. FINISH — fine grain, gentle chroma shimmer, COLOR vignette (never black).
    K.mottle(x, 0, 0, W, H, K.mix(P.atmo, P.peak, 0.4), 3200, r, 'soft-light');
    K.grain(x, W, H, 640, r);
    K.chromaSplit(x, W, H, 1);
    {
      const g = x.createRadialGradient(W / 2, H / 2, minWH * 0.34, W / 2, H / 2, maxWH * 0.85);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, K.rgba(K.mix(P.ground, P.atmo, 0.3), 0.22));
      x.fillStyle = g; x.fillRect(0, 0, W, H);
    }

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'plasma3', draw, traits };
})();


function makeRender(raw, traitsOf) {
  return (canvas, tokenId, width) => {
    const off = document.createElement('canvas');
    raw(off, tokenId);
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round((W * off.height) / off.width));
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    if (c) c.drawImage(off, 0, 0, W, H);
    return { aspect: off.width / off.height, traits: traitsOf(tokenId) };
  };
}

export const renderVoltaic: EngineFn = makeRender(ENGINE.draw, ENGINE.traits);
export const voltaicTraits: TraitsFn = (id) => ENGINE.traits(id);
export const voltaicSchema: TraitSchema = [
  {
    "name": "Layout",
    "values": [
      "Prism Shards",
      "Nebula",
      "Fluid Mass",
      "Plume",
      "Spark",
      "Holo Sweep",
      "Discharge",
      "Constellation"
    ]
  },
  {
    "name": "Palette",
    "values": [
      "MAGENTA ARC",
      "SHOCK PULSE",
      "ION FIELD",
      "PLASMA VIOLET",
      "VOLTAGE YELLOW",
      "ACID SURGE",
      "NEON BLOOM",
      "VOLTAGE LIME",
      "CYAN DISCHARGE",
      "ULTRAVIOLET STORM",
      "ELECTRO BLUE",
      "PLASMA ORANGE",
      "FUCHSIA STORM",
      "SPECTRUM SURGE"
    ]
  },
  {
    "name": "Format",
    "values": [
      "Column",
      "Pano",
      "Wide",
      "Square",
      "Tall"
    ]
  },
  {
    "name": "Density",
    "values": [
      "Woven",
      "Sparse",
      "Dense"
    ]
  },
  {
    "name": "Energy",
    "values": [
      "Cool Core",
      "Hot Core"
    ]
  },
  {
    "name": "Event",
    "values": [
      "None",
      "Energy Burst",
      "Eclipse Core"
    ]
  }
];
export const VOLTAIC_ASPECTS: readonly number[] = [0.667,0.8,1,1.499,1.778];
