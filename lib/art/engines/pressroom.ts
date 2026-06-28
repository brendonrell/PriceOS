// @ts-nocheck
/*
 * Pressroom — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/gen/pressroom.js). Layout axis (4-6 structurally distinct
 * compositions) + per-output colour range. Deterministic from tokenId only.
 * KIT helpers are bundled; trait schema derived from the engine's own casts.
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


/* PRESSROOM — a printed metropolis rendered as a mis-registered risograph.
 * Stacked iso buildings, overpasses, halftone dots — but the three ink layers
 * (fluoro pink / riso blue / riso yellow) shift off-register, ink over-saturates
 * and bleeds, and whole districts ghost or jam in the press. The misprint IS the
 * world. Flat-bright PRINT inks on warm bone paper.
 *
 * LAYOUT AXIS (picked by seed) — six structurally distinct PICTURES, not one
 * scene relocated:
 *   Iso Sprawl   — dense full-bleed isometric city, edge to edge.
 *   Hero Tower   — ONE megastructure close-up, sparse base, big paper margin.
 *   Torn Sheet   — city on one side, blank torn newsprint on the other.
 *   Overhead Plan— near-flat top-down plan: blocks + streets + register marks.
 *   Press Jam    — a diagonal band where a district smears / repeats / streaks.
 *   Archipelago  — a few buildings adrift in a sea of paper; tiny far-scale read.
 *
 * PALETTE: RISO FLUORO — fluoro pink #ff48a0 / riso blue #2a4bff / riso yellow
 * #ffd21e, on warm bone #efe7d6, plus sibling ink swaps inside the family. */
const ENGINE = (function () {
  const K = KIT;

  // RISO SPOT-INK TRIOS — each a deliberate, curated fluoro 3-ink set on warm
  // bone/newsprint paper. The paper stays HIGH-KEY (bright, dominant); the trio
  // shifts the dominant fluoro hue cleanly seed-to-seed. `shade` is the dark
  // toner this trio bleeds toward — kept dark-but-tinted so ink never crushes to
  // dead black and the page reads bright.
  const PALS = [
    // pink + blue + yellow — the classic riso trichromat
    { name: 'CMY Riso',      paper: '#f3ecda', ink: ['#ff4d97', '#2f56ff', '#ffce1f'], shade: '#2a2150' },
    // teal + orange + deep ink-navy (the "ink-black" accent, kept chromatic so
    // it reads as a third colour, not a dead black mass on tall towers)
    { name: 'Teal & Tang',   paper: '#f1ecdc', ink: ['#0fb9c4', '#ff6a2a', '#2b3f6e'], shade: '#1c2e42' },
    // magenta + green
    { name: 'Magenta Field', paper: '#f4eddb', ink: ['#ff3da0', '#15c47e', '#ffd83a'], shade: '#243a30' },
    // red + cyan
    { name: 'Red & Cyan',    paper: '#f2ecd9', ink: ['#ff3b46', '#12bce0', '#ffd24a'], shade: '#1d3640' },
    // purple + lime
    { name: 'Purple Lime',   paper: '#f1ead8', ink: ['#8a3bf2', '#b7e835', '#ff66b0'], shade: '#33245a' },
    // ultramarine + vermilion
    { name: 'Ultra Vermil',  paper: '#f3ecd8', ink: ['#2438e8', '#ff5630', '#ffcf3a'], shade: '#202a4a' },
  ];
  const RUNS = ['First Pull', 'Heavy Ink', 'Faded Run', 'Double Print'];

  // ── LAYOUTS — each defines a wholly different composition + format.
  const LAYOUTS = [
    { name: 'Iso Sprawl',    W: 1320, H: 1180 },
    { name: 'Hero Tower',    W: 1120, H: 1400 },
    { name: 'Torn Sheet',    W: 1400, H: 1080 },
    { name: 'Overhead Plan', W: 1280, H: 1280 },
    { name: 'Press Jam',     W: 1400, H: 1040 },
    { name: 'Archipelago',   W: 1400, H: 1000 },
  ];

  function params(r) {
    const pal = K.pick(PALS, r);
    const lay = K.pick(LAYOUTS, r);
    return {
      pal, lay,
      run: K.pick(RUNS, r),
      mis: 3 + r() * 5,          // misregister magnitude (px) — the signature flaw
      dot: 5 + r() * 3,          // halftone dot pitch
      cols: K.rint(r, 11, 15),
      rows: K.rint(r, 13, 18),
      focalC: 0.25 + r() * 0.5,
      focalR: 0.30 + r() * 0.4,
      ghost: r() < 0.6,
      tiltSign: r() < 0.5 ? -1 : 1,
      misBlown: r() < 0.42,      // tight vs blown-out misregistration this seed
      seedR: r,
    };
  }

  function traits(seed) {
    const p = params(K.rng(seed));
    return {
      Layout: p.lay.name,
      Palette: p.pal.name,
      Run: p.run,
      Registration: p.misBlown ? 'Blown Out' : 'Tight',
      Ghosting: p.ghost ? 'Double-Printed' : 'Clean Pull',
    };
  }

  // ── Halftone dot screen. atop → dots only land where ink already exists.
  function halftoneScreen(x, W, H, pitch, angle, col, strength, r, atop) {
    x.save();
    x.globalCompositeOperation = atop ? 'source-atop' : 'multiply';
    const ca = Math.cos(angle), sa = Math.sin(angle);
    const c = K.h2r(col);
    const fill = 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
    const diag = Math.sqrt(W * W + H * H);
    for (let v = -diag; v < diag; v += pitch) {
      for (let u = -diag; u < diag; u += pitch) {
        const px = W / 2 + u * ca - v * sa;
        const py = H / 2 + u * sa + v * ca;
        if (px < -pitch || px > W + pitch || py < -pitch || py > H + pitch) continue;
        const rad = pitch * (0.10 + 0.18 * strength);
        x.globalAlpha = strength * (0.5 + r() * 0.5);
        x.fillStyle = fill;
        x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
      }
    }
    x.restore();
  }

  function iso(gc, gr, ox, oy, tw, th) {
    return { x: ox + (gc - gr) * tw * 0.5, y: oy + (gc + gr) * th * 0.5 };
  }

  // One iso building, flat-bright, three faces, in ONE ink.
  function isoBox(x, gc, gr, ox, oy, tw, th, h, cols, fp) {
    const b = iso(gc, gr, ox, oy, tw, th);
    const hw = tw * 0.5 * fp, hh = th * 0.5 * fp;
    const tN = { x: b.x, y: b.y - h - hh };
    const tE = { x: b.x + hw, y: b.y - h };
    const tS = { x: b.x, y: b.y - h + hh };
    const tW = { x: b.x - hw, y: b.y - h };
    const bE = { x: b.x + hw, y: b.y };
    const bS = { x: b.x, y: b.y + hh };
    const bW = { x: b.x - hw, y: b.y };
    x.beginPath();
    x.moveTo(tW.x, tW.y); x.lineTo(tS.x, tS.y); x.lineTo(bS.x, bS.y); x.lineTo(bW.x, bW.y); x.closePath();
    x.fillStyle = cols.left; x.fill();
    x.beginPath();
    x.moveTo(tS.x, tS.y); x.lineTo(tE.x, tE.y); x.lineTo(bE.x, bE.y); x.lineTo(bS.x, bS.y); x.closePath();
    x.fillStyle = cols.right; x.fill();
    x.beginPath();
    x.moveTo(tN.x, tN.y); x.lineTo(tE.x, tE.y); x.lineTo(tS.x, tS.y); x.lineTo(tW.x, tW.y); x.closePath();
    x.fillStyle = cols.top; x.fill();
    return { tN, tS, tE, tW, bS, bE, bW, base: b, h, hw, hh };
  }

  // Faces: TOP catches light (mix toward paper → bright), LEFT is the pure spot
  // ink, RIGHT is the shaded face (mix toward the trio's dark toner, but gently
  // so it stays a saturated ink, not a black wall — keeps the page high-key).
  function inkCols(ink, paper, shade) {
    return {
      top: K.mix(ink, paper, 0.54),
      left: ink,
      right: K.mix(ink, shade || '#2a2150', 0.18),
    };
  }

  function chanAssigner(noise) {
    return function (gc, gr) {
      const z = noise.fbm(gc * 0.28 + 40, gr * 0.28 + 70, 2);
      const base = z < -0.18 ? 0 : z > 0.18 ? 1 : 2;
      const jr = noise.noise2(gc * 1.7 + 5, gr * 1.7 + 9);
      if (jr > 0.55) return (base + 1) % 3;
      if (jr < -0.55) return (base + 2) % 3;
      return base;
    };
  }

  // Window stripes on the SE wall of a tall box.
  function windows(x, box, ink, paper, tw, th, fp) {
    if (box.h <= th * 2.2) return;
    x.save();
    x.beginPath();
    x.moveTo(box.tS.x, box.tS.y); x.lineTo(box.tE.x, box.tE.y);
    x.lineTo(box.bE.x, box.bE.y); x.lineTo(box.bS.x, box.bS.y); x.closePath();
    x.clip();
    x.fillStyle = K.mix(ink, paper, 0.55);
    const floors = Math.min(18, Math.floor(box.h / (th * 0.7)));
    for (let f = 1; f < floors; f++) {
      const yy = box.tS.y - box.h + (box.h * f) / floors;
      x.globalAlpha = (f % 2) ? 0.4 : 0.18;
      x.fillRect(box.tW.x, yy, tw * fp, th * 0.05);
    }
    x.globalAlpha = 1; x.restore();
  }

  // ────────────────────────────────────────────────────────────────────────
  // CITY PAINTERS — each returns a function (x, chanFilter) painting ONE plate.
  // Geometry differs per layout so each is a genuinely different picture.
  // ────────────────────────────────────────────────────────────────────────

  // Shared iso-grid city. `cfg` controls scale, footprint, fill thresholds,
  // height profile and placement — letting Sprawl / Hero / Archipelago etc all
  // reuse the grid engine but read as different compositions.
  function gridCity(x, W, H, p, inks, paper, dens, chanFilter, cfg) {
    const tw = W / (cfg.gridW);
    const th = tw * 0.5;
    const fp = cfg.fp;
    const tilt = (cfg.tilt || 0) * p.tiltSign;
    const cols = cfg.cols, rows = cfg.rows;
    const spanY = (cols + rows) * th * 0.5;
    const ox = W * cfg.ox + (rows - cols) * tw * 0.25;
    const oy = H * cfg.oy - spanY * 0.5;

    x.save();
    if (tilt) { x.translate(W / 2, H / 2); x.rotate(tilt); x.translate(-W / 2, -H / 2); }

    const noise = K.makeNoise(((p.seed >>> 0) + 3) >>> 0 || 1);
    const chanOf = chanAssigner(noise);
    const fc = p.focalC * cols, fr = p.focalR * rows;

    const cells = [];
    for (let gr = 0; gr < rows; gr++)
      for (let gc = 0; gc < cols; gc++) cells.push([gc, gr]);
    cells.sort((a, b2) => (a[0] + a[1]) - (b2[0] + b2[1]));

    for (const [gc, gr] of cells) {
      const street = (noise.fbm(gc * 0.5, gr * 0.5, 3) + 1) / 2;
      if (street < cfg.streetCut) continue;
      // sparsity mask — for Archipelago, drop most tiles into the paper sea.
      if (cfg.sparse) {
        const keep = noise.fbm(gc * 0.6 + 80, gr * 0.6 + 30, 3);
        if (keep < cfg.sparse) continue;
      }
      const ch = chanOf(gc, gr);
      if (chanFilter != null && ch !== chanFilter) continue;
      const ink = inks[ch];
      const cl = inkCols(ink, paper, p.pal.shade);
      const dCluster = Math.hypot((gc - fc) / cols, (gr - fr) / rows);
      const falloff = K.clamp(1 - dCluster * (cfg.focalTight || 1.7), 0.05, 1);
      const baseN = (noise.fbm(gc * 0.8 + 11, gr * 0.8 + 5, 4) + 1) / 2;
      let h = th * (cfg.hBase + (baseN * cfg.hNoise + Math.pow(falloff, 1.7) * cfg.hFocal) * (0.6 + dens * 0.5));
      if (street < cfg.streetCut + 0.14) h *= 0.45;
      h = Math.max(th * 0.5, h);
      // contact shadow for grounded/sparse layouts so islands sit on the paper.
      if (cfg.sparse) {
        const b = iso(gc, gr, ox, oy, tw, th);
        x.save();
        x.globalCompositeOperation = 'multiply';
        x.fillStyle = K.rgba(K.mix(paper, '#5a5040', 0.7), 0.16);
        x.beginPath();
        x.ellipse(b.x + th * 0.18, b.y + th * 0.18, tw * fp * 0.5, th * fp * 0.5, 0, 0, 7);
        x.fill(); x.restore();
      }
      const box = isoBox(x, gc, gr, ox, oy, tw, th, h, cl, fp);
      windows(x, box, ink, paper, tw, th, fp);
    }

    // overpasses (skip for sparse/plan-ish layouts)
    if (cfg.passes) {
      const r = K.rng(((p.seed >>> 0) * 2654435761) >>> 0 || 1);
      const passes = K.rint(r, 2, 3);
      for (let pI = 0; pI < passes; pI++) {
        const pch = K.rint(r, 0, 2);
        if (chanFilter != null && pch !== chanFilter) { r(); r(); r(); r(); continue; }
        const ink = inks[pch];
        const gr0 = K.rint(r, 1, rows - 2);
        const gc0 = K.rint(r, 0, 2);
        const len = K.rint(r, Math.floor(cols * 0.45), cols - 1);
        const lift = th * (2.5 + r() * 3.5);
        const a0 = iso(gc0, gr0, ox, oy, tw, th);
        const a1 = iso(gc0 + len, gr0 + (r() < 0.5 ? 0 : 2), ox, oy, tw, th);
        const wdt = th * 0.5;
        x.fillStyle = K.mix(ink, p.pal.shade, 0.28);
        for (let li = 0; li <= 5; li++) {
          const t = li / 5, lx = a0.x + (a1.x - a0.x) * t, ly = a0.y + (a1.y - a0.y) * t;
          x.fillRect(lx - wdt * 0.1, ly - lift + wdt, wdt * 0.2, lift);
        }
        x.fillStyle = ink;
        x.beginPath();
        x.moveTo(a0.x, a0.y - lift); x.lineTo(a1.x, a1.y - lift);
        x.lineTo(a1.x, a1.y - lift + wdt); x.lineTo(a0.x, a0.y - lift + wdt);
        x.closePath(); x.fill();
      }
    }
    x.restore();
  }

  // HERO TOWER — one big iso megastructure, close, off-centre, with a small
  // cluster of low blocks at its feet and lots of empty paper. Built directly
  // (not from the grid) so its silhouette is a deliberate hero shape. The tower
  // is a SOLID continuous stack of tiers (each tier sits exactly on the one
  // below — no gaps), gently stepping in as it rises = a ziggurat skyscraper.
  function heroCity(x, W, H, p, inks, paper, dens, chanFilter) {
    const r = K.rng(((p.seed >>> 0) + 11) >>> 0 || 1);
    const noise = K.makeNoise(((p.seed >>> 0) + 5) >>> 0 || 1);
    const tw = W * 0.46, th = tw * 0.5;
    const baseX = W * (0.42 + p.focalC * 0.16);
    const baseY = H * 0.82;

    // foot cluster: low iso blocks scattered around the base for scale.
    const footCh = chanAssigner(noise);
    for (let i = 0; i < 18; i++) {
      const ang = r() * Math.PI * 2, rad = (0.9 + r() * 1.6);
      const gc = Math.cos(ang) * rad, gr = Math.sin(ang) * rad;
      const ch = footCh(Math.round(gc * 3) + 9, Math.round(gr * 3) + 4);
      if (chanFilter != null && ch !== chanFilter) continue;
      const ink = inks[ch];
      const cl = inkCols(ink, paper, p.pal.shade);
      const ftw = tw * (0.16 + r() * 0.10), fth = ftw * 0.5;
      const fox = baseX + (gc - gr) * ftw * 0.5;
      const foy = baseY + th * 0.45 + (gc + gr) * fth * 0.5;
      const fh = fth * (1.2 + r() * 5);
      const box = isoBox(x, 0, 0, fox, foy, ftw, fth, fh, cl, 0.86);
      windows(x, box, ink, paper, ftw, fth, 0.86);
    }

    // the hero megastructure: a SOLID tiered stack. Each tier is a tall iso
    // block; the next tier sits on its roof, narrower. No vertical gaps.
    const tiers = K.rint(r, 4, 5);
    let cy = baseY, cw = tw, cth = th;
    const totalH = H * (0.62 + r() * 0.12);
    for (let t = 0; t < tiers; t++) {
      const ch = (t + (p.tiltSign > 0 ? 0 : 2)) % 3;
      // last tier shorter (a crown); others share the bulk evenly-ish.
      const frac = (t === tiers - 1) ? 0.16 : (0.84 / (tiers - 1)) * (1 - t * 0.05);
      const tierH = totalH * frac + cth * 1.2;
      if (chanFilter == null || ch === chanFilter) {
        const ink = inks[ch];
        const cl = inkCols(ink, paper, p.pal.shade);
        const box = isoBox(x, 0, 0, baseX, cy, cw, cth, tierH, cl, 0.98);
        windows(x, box, ink, paper, cw, cth, 0.98);
        if (t === tiers - 1) {
          x.strokeStyle = ink; x.lineWidth = Math.max(3, cw * 0.02);
          x.beginPath();
          x.moveTo(box.tN.x, box.tN.y);
          x.lineTo(box.tN.x + (r() - 0.5) * cw * 0.06, box.tN.y - cth * 2.2);
          x.stroke();
        }
      }
      // next tier sits ON this roof (roof top is at cy - tierH), stepped in.
      cy = cy - tierH;
      cw *= (0.80 + r() * 0.08);
      cth = cw * 0.5;
    }
  }

  // OVERHEAD PLAN — near-flat top-down map. City blocks as filled rectangles in
  // the three inks, gridded streets of bare paper between them, plus printer
  // register crosshairs at the margins. Reads completely flat (no iso volume).
  function planCity(x, W, H, p, inks, paper, dens, chanFilter) {
    const noise = K.makeNoise(((p.seed >>> 0) + 7) >>> 0 || 1);
    const chanOf = chanAssigner(noise);
    const margin = W * 0.07;
    const gw = W - margin * 2, gh = H - margin * 2;
    const cols = 9, rows = 9;
    const cellW = gw / cols, cellH = gh / rows;
    const gut = Math.min(cellW, cellH) * 0.16; // street gutter
    for (let gr = 0; gr < rows; gr++) {
      for (let gc = 0; gc < cols; gc++) {
        const v = (noise.fbm(gc * 0.6 + 3, gr * 0.6 + 8, 3) + 1) / 2;
        if (v < 0.22) continue; // open plaza / park = bare paper
        const ch = chanOf(gc, gr);
        if (chanFilter != null && ch !== chanFilter) continue;
        const ink = inks[ch];
        const bx = margin + gc * cellW + gut;
        const by = margin + gr * cellH + gut;
        const bw = cellW - gut * 2, bh = cellH - gut * 2;
        // density of block: split into a few sub-parcels at varying ink density
        const sub = (noise.noise2(gc * 2.1, gr * 2.1) + 1) / 2 > 0.5 ? 2 : 1;
        for (let sx = 0; sx < sub; sx++) {
          for (let sy = 0; sy < sub; sy++) {
            const pw = bw / sub, ph = bh / sub;
            const cov = (noise.fbm(gc * 1.3 + sx + 50, gr * 1.3 + sy + 20, 2) + 1) / 2;
            x.globalAlpha = 0.55 + cov * 0.45;
            x.fillStyle = ink;
            x.fillRect(bx + sx * pw + 1.5, by + sy * ph + 1.5, pw - 3, ph - 3);
            // darker footprint core
            x.globalAlpha = 0.4 * cov;
            x.fillStyle = K.mix(ink, p.pal.shade, 0.42);
            x.fillRect(bx + sx * pw + pw * 0.3, by + sy * ph + ph * 0.3, pw * 0.4, ph * 0.4);
          }
        }
        x.globalAlpha = 1;
      }
    }
    // register crosshairs (one per ink) at the four margins — printer marks
    if (chanFilter != null) {
      const ink = inks[chanFilter];
      x.strokeStyle = ink; x.lineWidth = 2; x.globalAlpha = 0.9;
      const off = chanFilter * 5;
      const marks = [[margin * 0.5 + off, margin * 0.5 + off], [W - margin * 0.5 + off, margin * 0.5 + off],
                     [margin * 0.5 + off, H - margin * 0.5 + off], [W - margin * 0.5 + off, H - margin * 0.5 + off]];
      for (const [mx, my] of marks) {
        x.beginPath(); x.moveTo(mx - 10, my); x.lineTo(mx + 10, my);
        x.moveTo(mx, my - 10); x.lineTo(mx, my + 10); x.stroke();
        x.beginPath(); x.arc(mx, my, 7, 0, 7); x.stroke();
      }
      x.globalAlpha = 1;
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // DRAW
  // ────────────────────────────────────────────────────────────────────────
  function draw(cv, seed) {
    const r = K.rng(seed);
    const p = params(r);
    p.seed = seed;
    const P = p.pal, W = p.lay.W, H = p.lay.H, L = p.lay.name;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');

    const heavy = p.run === 'Heavy Ink';
    const faded = p.run === 'Faded Run';
    const doublePrint = p.run === 'Double Print';
    const densities = faded ? 0.75 : heavy ? 1.2 : 1.0;

    // ── 1. PAPER
    x.fillStyle = P.paper; x.fillRect(0, 0, W, H);
    x.save();
    x.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 30; i++) {
      const bx = r() * W, by = r() * H, br = 120 + r() * 360;
      const g = x.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, K.rgba(K.mix(P.paper, '#bcae8e', 0.5), 0.06));
      g.addColorStop(1, K.rgba(P.paper, 0));
      x.fillStyle = g; x.fillRect(bx - br, by - br, br * 2, br * 2);
    }
    x.restore();

    // choose the painter + clip region for this layout
    let painter, clipFn = null;
    if (L === 'Iso Sprawl') {
      painter = (xx, ci) => gridCity(xx, W, H, p, P.ink, P.paper, densities, ci, {
        gridW: p.cols * 0.78, cols: p.cols + 2, rows: p.rows + 2, fp: 0.80,
        ox: 0.5, oy: 0.60, tilt: 0.04, streetCut: 0.14, passes: true,
        hBase: 0.9, hNoise: 2.4, hFocal: 6.2, focalTight: 1.5,
      });
    } else if (L === 'Hero Tower') {
      painter = (xx, ci) => heroCity(xx, W, H, p, P.ink, P.paper, densities, ci);
    } else if (L === 'Overhead Plan') {
      painter = (xx, ci) => planCity(xx, W, H, p, P.ink, P.paper, densities, ci);
    } else if (L === 'Archipelago') {
      // a few chunky iso islands adrift in a sea of paper — wider tiles, lower
      // skyline, strong sparsity so most of the grid drops out to bare paper.
      painter = (xx, ci) => gridCity(xx, W, H, p, P.ink, P.paper, densities, ci, {
        gridW: p.cols * 0.66, cols: p.cols, rows: p.rows, fp: 0.88,
        ox: 0.5, oy: 0.52, tilt: 0.02, streetCut: 0.14, passes: false,
        hBase: 0.9, hNoise: 1.6, hFocal: 2.2, focalTight: 2.2, sparse: 0.30,
      });
    } else if (L === 'Torn Sheet') {
      // city packed into one vertical half; the other half is bare torn paper.
      const onRight = p.tiltSign > 0;
      painter = (xx, ci) => gridCity(xx, W, H, p, P.ink, P.paper, densities, ci, {
        gridW: p.cols * 1.0, cols: p.cols + 1, rows: p.rows + 3, fp: 0.80,
        ox: onRight ? 0.72 : 0.28, oy: 0.58, tilt: 0.03, streetCut: 0.12,
        passes: true, hBase: 0.9, hNoise: 2.6, hFocal: 6.0, focalTight: 1.6,
      });
    } else { // Press Jam — a band of city that smears/repeats. Keep the base
      // sparser + lower so the directional streak reads instead of a black mass.
      painter = (xx, ci) => gridCity(xx, W, H, p, P.ink, P.paper, densities, ci, {
        gridW: p.cols * 0.92, cols: p.cols + 1, rows: p.rows, fp: 0.82,
        ox: 0.5, oy: 0.54, tilt: 0.03, streetCut: 0.22, passes: false,
        hBase: 0.9, hNoise: 1.8, hFocal: 3.4, focalTight: 1.9, sparse: 0.04,
      });
    }

    // ── 2. THREE INK PLATES, misregistered.
    const ang0 = r() * Math.PI * 2;
    const misScale = p.misBlown ? 2.4 : 0.85;
    const misVecs = [0, 1, 2].map((i) => {
      const a = ang0 + i * (Math.PI * 2 / 3) + (r() - 0.5) * 0.6;
      const m = p.mis * misScale * (0.7 + r() * 0.7);
      return [Math.cos(a) * m, Math.sin(a) * m];
    });

    function plate(ci, dens) {
      const off = document.createElement('canvas');
      off.width = W; off.height = H;
      const ox2 = off.getContext('2d');
      painter(ox2, ci);
      halftoneScreen(ox2, W, H, p.dot + ci * 0.7, (15 + ci * 30) * Math.PI / 180,
        K.mix(P.ink[ci], '#000', 0.4), faded ? 0.18 : 0.26, K.rng(seed + ci * 7 + 1), true);
      return off;
    }

    // Torn Sheet: build a torn paper mask so the blank half stays bare.
    if (L === 'Torn Sheet') {
      const onRight = p.tiltSign > 0;
      // jagged tear edge
      const tearN = K.makeNoise(seed + 21);
      const edgeX = W * (0.46 + (r() - 0.5) * 0.06);
      x.save();
      x.beginPath();
      if (onRight) {
        x.moveTo(W, 0);
        x.lineTo(edgeX, 0);
        for (let yy = 0; yy <= H; yy += 14) {
          const e = edgeX + tearN.fbm(yy * 0.02, 3.3, 3) * W * 0.06 + tearN.noise2(yy * 0.15, 1.1) * 18;
          x.lineTo(e, yy);
        }
        x.lineTo(W, H);
      } else {
        x.moveTo(0, 0);
        x.lineTo(edgeX, 0);
        for (let yy = 0; yy <= H; yy += 14) {
          const e = edgeX + tearN.fbm(yy * 0.02, 3.3, 3) * W * 0.06 + tearN.noise2(yy * 0.15, 1.1) * 18;
          x.lineTo(e, yy);
        }
        x.lineTo(0, H);
      }
      x.closePath();
      x.clip();
      clipFn = true; // mark that we've clipped; restored after plates
    }

    for (let ci = 0; ci < 3; ci++) {
      const off = plate(ci, densities);
      x.save();
      x.globalCompositeOperation = 'multiply';
      // keep the page HIGH-KEY: three overlapping ink plates on multiply crush
      // to mud fast, so each plate prints a touch translucent — the bone paper
      // stays the dominant value and the inks read as clean spot colour.
      x.globalAlpha = faded ? 0.74 : 0.84;
      const [mx, my] = misVecs[ci];
      x.drawImage(off, mx, my);
      x.restore();
    }

    if (clipFn) x.restore(); // end torn-sheet clip

    // Torn Sheet: darken/curl the tear edge so the blank side reads as paper.
    if (L === 'Torn Sheet') {
      const onRight = p.tiltSign > 0;
      const edgeX = W * (0.46 + (r() - 0.5) * 0.0);
      x.save();
      x.globalCompositeOperation = 'multiply';
      const g = x.createLinearGradient(edgeX - W * 0.05, 0, edgeX + W * 0.05, 0);
      const dir = onRight ? [0, 1] : [1, 0];
      g.addColorStop(0, K.rgba(K.mix(P.paper, '#7a6f54', 0.7), 0.18 * dir[0]));
      g.addColorStop(0.5, K.rgba('#000', 0.10));
      g.addColorStop(1, K.rgba(K.mix(P.paper, '#7a6f54', 0.7), 0.18 * dir[1]));
      x.fillStyle = g; x.fillRect(edgeX - W * 0.06, 0, W * 0.12, H);
      x.restore();
    }

    // ── 3. PRESS JAM — re-stamp a diagonal band of all plates, repeated &
    // streaked, so a district smears across the sheet (replaces ghost for Jam).
    if (L === 'Press Jam') {
      const ja = (-35 + r() * 70) * Math.PI / 180;
      const reps = K.rint(r, 4, 7);
      const step = (12 + r() * 22);
      const dx = Math.cos(ja), dy = Math.sin(ja);
      // a diagonal clip band across the middle
      const bandW = H * (0.55 + r() * 0.3);
      x.save();
      x.translate(W / 2, H / 2); x.rotate(ja); x.translate(-W / 2, -H / 2);
      x.beginPath(); x.rect(-W, H / 2 - bandW / 2, W * 3, bandW); x.clip();
      x.translate(W / 2, H / 2); x.rotate(-ja); x.translate(-W / 2, -H / 2);
      for (let ci = 0; ci < 3; ci++) {
        const off = plate(ci, densities * 0.8);
        for (let rep = 1; rep <= reps; rep++) {
          x.save();
          x.globalCompositeOperation = 'multiply';
          // decaying echoes — front copies brighter, trailing ones fade fast so
          // the smear streaks away rather than stacking into black.
          x.globalAlpha = 0.34 * Math.pow(1 - rep / (reps + 1), 1.4);
          x.drawImage(off, dx * step * rep, dy * step * rep);
          x.restore();
        }
      }
      x.restore();
    }

    // ── 3b. GHOST DISTRICT (other layouts) — a clipped sub-region printed twice.
    if ((p.ghost || doublePrint) && L !== 'Press Jam' && L !== 'Torn Sheet') {
      const gx0 = (0.06 + r() * 0.45) * W;
      const gy0 = (0.18 + r() * 0.4) * H;
      const gw = (0.30 + r() * 0.3) * W;
      const gh = (0.3 + r() * 0.32) * H;
      const ghostOff = p.mis * (3.0 + r() * 4.0);
      const ga = r() * Math.PI * 2;
      const gdx = Math.cos(ga) * ghostOff, gdy = Math.sin(ga) * ghostOff;
      for (let ci = 0; ci < 3; ci++) {
        const off = plate(ci, densities * 0.9);
        x.save();
        x.beginPath(); x.rect(gx0, gy0, gw, gh); x.clip();
        x.globalCompositeOperation = 'multiply';
        x.globalAlpha = doublePrint ? 0.38 : 0.28;
        x.drawImage(off, gdx, gdy);
        x.restore();
      }
    }

    // ── 4. TINY FIGURES — only where the ground reads (skip Plan/Archipelago top).
    if (L !== 'Overhead Plan') {
      x.save();
      x.globalCompositeOperation = 'multiply';
      const figN = K.rint(r, 24, 50);
      for (let i = 0; i < figN; i++) {
        const fx = r() * W;
        const fy = H * (0.55 + r() * 0.42);
        const fh = 4 + r() * 7;
        x.globalAlpha = 0.5 + r() * 0.3;
        x.fillStyle = K.pick([P.ink[0], P.ink[1]], r);
        x.fillRect(fx + (r() - 0.5) * p.mis, fy, fh * 0.34, fh);
        x.beginPath();
        x.arc(fx + fh * 0.17 + (r() - 0.5) * p.mis, fy - fh * 0.2, fh * 0.22, 0, 7);
        x.fill();
      }
      x.restore();
    }

    // ── 5. INK BLEED blotches
    if (heavy || r() < 0.5) {
      x.save();
      x.globalCompositeOperation = 'multiply';
      const blots = K.rint(r, 3, 7);
      for (let i = 0; i < blots; i++) {
        const bx = r() * W, by = H * (0.3 + r() * 0.6);
        const br = 30 + r() * 90;
        const bc = K.mix(P.ink[K.rint(r, 0, 2)], P.ink[K.rint(r, 0, 2)], 0.5);
        const g = x.createRadialGradient(bx, by, 0, bx, by, br);
        g.addColorStop(0, K.rgba(bc, heavy ? 0.3 : 0.18));
        g.addColorStop(0.7, K.rgba(bc, 0.08));
        g.addColorStop(1, K.rgba(bc, 0));
        x.fillStyle = g; x.fillRect(bx - br, by - br, br * 2, br * 2);
      }
      x.restore();
    }

    // ── 6. ATMOSPHERIC PERSPECTIVE — far/top fades to paper.
    x.save();
    const fade = x.createLinearGradient(0, 0, 0, H);
    fade.addColorStop(0, K.rgba(P.paper, L === 'Overhead Plan' ? 0.20 : 0.42));
    fade.addColorStop(0.30, K.rgba(P.paper, 0.12));
    fade.addColorStop(0.55, K.rgba(P.paper, 0));
    x.fillStyle = fade; x.fillRect(0, 0, W, H);
    x.restore();

    // ── 6b. HIGH-KEY LIFT — a faint paper wash in 'lighten' so any area the
    // stacked plates crushed toward black floats back up toward bone. Bright ink
    // is untouched (it's already lighter than the wash); only the muddy darks
    // lift. Stronger on the dense full-bleed layouts that crush most.
    const dense = (L === 'Iso Sprawl' || L === 'Press Jam' || L === 'Torn Sheet');
    x.save();
    x.globalCompositeOperation = 'lighten';
    x.globalAlpha = (dense ? 0.22 : 0.12) * (faded ? 1.2 : 1);
    x.fillStyle = K.mix(P.paper, '#000', 0.50); // a dim paper — lifts the darks
    x.fillRect(0, 0, W, H);
    x.restore();
    // a second, hue-tinted lift toward the trio's dominant fluoro so crushed
    // cores read as deep COLOUR (deep pink/orange/teal), never neutral mud.
    if (dense) {
      x.save();
      x.globalCompositeOperation = 'lighten';
      x.globalAlpha = 0.10 * (heavy ? 1.3 : 1);
      x.fillStyle = K.mix(P.ink[0], '#000', 0.58);
      x.fillRect(0, 0, W, H);
      x.restore();
    }

    // ── 7. GLOBAL HALFTONE + chroma + grain + vignette
    halftoneScreen(x, W, H, p.dot * 1.4, 45 * Math.PI / 180,
      K.mix(P.ink[2], '#000', 0.3), 0.05, K.rng(seed + 99));
    if (!faded) K.chromaSplit(x, W, H, Math.round(p.mis * (p.misBlown ? 0.7 : 0.4)));
    K.grain(x, W, H, 380, r);

    x.save();
    x.globalCompositeOperation = 'multiply';
    const vg = x.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35,
      W / 2, H / 2, Math.max(W, H) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, K.rgba(K.mix(P.paper, '#7a6f54', 0.6), 0.22));
    x.fillStyle = vg; x.fillRect(0, 0, W, H);
    x.restore();

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'pressroom', draw, traits };
})();


export const pressroomTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderPressroom: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const PRESSROOM_ASPECTS: readonly number[] = [1.1186,0.8,1.2963,1,1.3462,1.4];
export const pressroomSchema: TraitSchema = {
  "traits": [
    {
      "name": "Layout",
      "values": [
        "Torn Sheet",
        "Overhead Plan",
        "Press Jam",
        "Archipelago",
        "Iso Sprawl",
        "Hero Tower"
      ]
    },
    {
      "name": "Palette",
      "values": [
        "Red & Cyan",
        "Ultra Vermil",
        "Teal & Tang",
        "Purple Lime",
        "CMY Riso",
        "Magenta Field"
      ]
    },
    {
      "name": "Run",
      "values": [
        "First Pull",
        "Double Print",
        "Heavy Ink",
        "Faded Run"
      ]
    },
    {
      "name": "Registration",
      "values": [
        "Tight",
        "Blown Out"
      ]
    },
    {
      "name": "Ghosting",
      "values": [
        "Double-Printed",
        "Clean Pull"
      ]
    }
  ]
};
