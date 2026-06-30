// @ts-nocheck
/*
 * Minium — PriceOS art engine (by opus4-8). Abstract generative system,
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


/* PLATEWORK — abstract rust-red colour-fields + taut line geometry.
 * NOT depicted industrial props. Large MATTE oxidized-red plates read as pure
 * colour-fields; the scaffold is taut straight line geometry stretched across.
 * Weathered surface (mottle, rust bleed, pitting, chalk scrub) + line, NEVER
 * literal rivets-as-objects. The "off": one plane curves impossibly off an edge
 * into deep space; planes that don't obey one light; seams that imply a volume
 * that can't exist. Surreal real-but-off.
 *
 * GRADE: mid-key, WARM RUST-RED dominant, medium-high saturation, MATTE (no
 * chrome). Oxidized red-lead is the hero. Reads RED-EARTH across the room. Haze
 * is atmosphere only — deep darks stay deep, the red stays saturated.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Palette world "Hull". Anchors: #9E4E3A oxidized red-lead (HERO),
     #7A3A2A deep rust, #DAD2C4 chalk hull-white, #3E4C52 cold sea-iron.
     Every palette is mid-key, red-earth dominant, medium-high saturation —
     different WEATHER of the same yard, never drifting toward pale neutral.
     'rare' is the grail colorway (hotter minium lead + black ground). */
  const PALS = [
    // primary: balanced red-lead hero on warm iron, chalk relief
    { name: 'Red-Lead Yard', ground: '#2c2622', plate: ['#9E4E3A', '#8A4231', '#A85843'], chalk: '#DAD2C4', iron: '#3E4C52', rust: '#7A3A2A', deep: '#1c1714', seam: '#241a14', accent: '#C2624A', haze: '#b07a5e' },
    // dry-dock: redder, hotter, sun-baked oxide dominating
    { name: 'Dry-Dock Oxide', ground: '#2a201b', plate: ['#A8503A', '#94422E', '#B45C44'], chalk: '#E2D8C6', iron: '#46535A', rust: '#823526', deep: '#1a120e', seam: '#26160f', accent: '#CB6A4C', haze: '#bd7a55' },
    // brine: more sea-iron in play but red still hero, cooler shadow
    { name: 'Brine Iron', ground: '#23262a', plate: ['#9A4A38', '#7E3A2C', '#A85440'], chalk: '#CFCBC0', iron: '#37464E', rust: '#6E3325', deep: '#13171b', seam: '#1a1410', accent: '#B85C42', haze: '#7e7466' },
    // scald: deepest rust, near-burnt, high contrast against chalk
    { name: 'Scald Hull', ground: '#241b16', plate: ['#92422F', '#7A3526', '#A04E3A'], chalk: '#D8CEBE', iron: '#3A474C', rust: '#682E20', deep: '#150e09', seam: '#1c120b', accent: '#B5563C', haze: '#9a6347' },
    // gale: cool overcast light, red holds but muted-cooler chalk & iron lift
    { name: 'Gale Light', ground: '#262824', plate: ['#9C4E3C', '#864330', '#AE5A46'], chalk: '#DDD7CB', iron: '#41525A', rust: '#763A2B', deep: '#171814', seam: '#1f1812', accent: '#C0654C', haze: '#8c8472' },
    // ember (RARE GRAIL): hot minium lead, black ground, sea-iron flares — loud
    { name: 'Ember Minium', rare: true, ground: '#16100c', plate: ['#C25A3A', '#A8472C', '#D86E45'], chalk: '#EDE3D0', iron: '#2E5560', rust: '#8A3622', deep: '#0a0603', seam: '#1c0e07', accent: '#F08A52', haze: '#c66a3e' },
  ];

  /* Composition modes — structurally distinct abstract layouts.
     Plates are colour-FIELDS, scaffold is line geometry. */
  const MODES = [
    'Butt-Joint Field',   // tight tiled colour-field grid, one chalk relief
    'Stacked Lap',        // horizontal strata, lapped bands fill the frame
    'Diagonal Brace',     // big field + bold diagonal bars as line geometry
    'Single Hero Plate',  // one dominant red field, confident negative space
    'Scaffold Cross',     // taut line lattice over sparse fields
    'Curved Anomaly',     // the impossible plane bending off into space
    'Rift Split',         // frame cleaved by a raking seam, two value worlds
    'Strata Core',        // nested concentric fields, a focal core
    'Cantilever',         // one big field anchored, planks cantilevering into air
    'Seam Lattice',       // pure taut-line lattice, fields as quiet ground
  ];
  const FORMATS = [[1040, 1280], [1200, 1200], [1280, 1040]]; // portrait / square / landscape

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 19);
    const noise2 = K.makeNoise(seed * 13 + 7);
    const pal = pickPal(r);
    const isRare = !!pal.rare;
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);
    const cols = pal.plate;
    function col(i) { return cols[((i % cols.length) + cols.length) % cols.length]; }

    // global light direction for all plate shading (consistent unless mode breaks it)
    const lightAng = -Math.PI / 2 + (r() - 0.5) * 1.1;

    /* ── matte colour-field fill: very shallow ramp, no chrome. The plate is a
       FIELD of oxide, lit by dirt and atmosphere, not a polished sheet. ── */
    function fieldFill(x0, y0, w, h, c, lit) {
      const dx = Math.cos(lightAng), dy = Math.sin(lightAng);
      const g = x.createLinearGradient(x0 - dx * w * 0.5, y0 - dy * h * 0.5, x0 + dx * w * 0.5, y0 + dy * h * 0.5);
      g.addColorStop(0, K.mix(c, pal.deep, 0.30 - lit * 0.12));
      g.addColorStop(0.5, c);
      g.addColorStop(0.72, K.mix(c, '#fff', 0.035 * lit)); // matte — barely any lift
      g.addColorStop(1, K.mix(c, pal.deep, 0.22 - lit * 0.08));
      return g;
    }

    // ── GROUND: deep iron field, NOT pale. dirty gradient + base mottle ──
    function background() {
      const gg = x.createLinearGradient(0, 0, W * 0.3, H);
      gg.addColorStop(0, K.mix(pal.ground, pal.iron, 0.25));
      gg.addColorStop(0.55, pal.ground);
      gg.addColorStop(1, pal.deep);
      x.fillStyle = gg; x.fillRect(0, 0, W, H);
      K.mottle(x, 0, 0, W, H, pal.iron, 30, r, 'overlay');
      // large-scale rust staining bloom on the ground — atmosphere
      x.save(); x.globalCompositeOperation = 'overlay'; x.globalAlpha = 0.5;
      for (let i = 0; i < 5; i++) {
        K.bloom(x, r() * W, r() * H, S * (0.3 + r() * 0.4), pal.rust, 0.10 + r() * 0.08);
      }
      x.restore();
    }

    /* ── seam stitch: a weathered riveted line, but rendered as TEXTURE/LINE,
       not as discrete prop-objects. A scored groove with faint stud pitting,
       reads as a welded/bolted seam in the surface, never a row of buttons. ── */
    function seamLine(x0, y0, x1, y1, strength) {
      strength = strength == null ? 1 : strength;
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy);
      if (L < 1) return;
      const nx = -dy / L, ny = dx / L;
      // dark scored groove
      x.save();
      x.strokeStyle = K.rgba(pal.seam, 0.55 * strength);
      x.lineWidth = Math.max(1, S * 0.0028);
      x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
      // faint lit lip alongside (keeps the matte weld read)
      x.strokeStyle = K.rgba(K.mix(pal.chalk, pal.rust, 0.5), 0.16 * strength);
      x.lineWidth = Math.max(1, S * 0.0016);
      x.beginPath(); x.moveTo(x0 + nx, y0 + ny); x.lineTo(x1 + nx, y1 + ny); x.stroke();
      // faint stud PITTING along the seam — tiny tonal dimples, NOT domes
      const n = Math.max(3, Math.floor(L / (S * 0.05)));
      const rad = S * (0.004 + r() * 0.0025);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const px = x0 + dx * t, py = y0 + dy * t;
        x.fillStyle = K.rgba(pal.deep, 0.28 * strength);
        x.beginPath(); x.arc(px, py, rad, 0, 7); x.fill();
        x.fillStyle = K.rgba(K.mix(pal.chalk, pal.rust, 0.4), 0.10 * strength);
        x.beginPath(); x.arc(px - rad * 0.35, py - rad * 0.35, rad * 0.5, 0, 7); x.fill();
      }
      x.restore();
    }

    // ── rust run: streaks bleeding DOWN from an edge ──
    function rustRuns(x0, fromY, w, intensity) {
      x.save();
      const n = 5 + Math.floor(r() * 9);
      for (let i = 0; i < n; i++) {
        const rx = x0 + r() * w;
        const len = (H - fromY) * (0.12 + r() * 0.6) * intensity;
        if (len < 4) continue;
        const wid = S * (0.0018 + r() * 0.007);
        const g = x.createLinearGradient(rx, fromY, rx, fromY + len);
        const rc = r() < 0.5 ? pal.rust : K.mix(pal.rust, pal.plate[1], 0.5);
        g.addColorStop(0, K.rgba(rc, 0.45 + r() * 0.3));
        g.addColorStop(0.4, K.rgba(rc, 0.24));
        g.addColorStop(1, K.rgba(rc, 0));
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(rx - wid, fromY);
        let cy = fromY, cx = rx;
        for (let s = 0; s < 8; s++) { cy += len / 8; cx += (r() - 0.5) * wid * 1.2; x.lineTo(cx + wid, cy); }
        for (let s = 0; s < 8; s++) { cy -= len / 8; cx -= (r() - 0.5) * wid * 1.2; x.lineTo(cx - wid, cy); }
        x.closePath(); x.fill();
      }
      x.restore();
    }

    /* ── chalk scrub: a swept chalk/lime stain across a field — abstract mark,
       weathering not signage. Soft elliptical scrub with fbm broken edges. ── */
    function chalkScrub(px, py, pw, ph, amt) {
      x.save();
      x.globalCompositeOperation = 'soft-light';
      const cx = px + pw * (0.3 + r() * 0.4), cy = py + ph * (0.3 + r() * 0.4);
      const rw = pw * (0.3 + r() * 0.4), rh = ph * (0.2 + r() * 0.4);
      const g = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rw, rh));
      g.addColorStop(0, K.rgba(pal.chalk, amt));
      g.addColorStop(0.6, K.rgba(pal.chalk, amt * 0.4));
      g.addColorStop(1, K.rgba(pal.chalk, 0));
      x.save(); x.translate(cx, cy); x.scale(1, rh / rw); x.translate(-cx, -cy);
      x.fillStyle = g; x.beginPath(); x.arc(cx, cy, Math.max(rw, rh), 0, 7); x.fill();
      x.restore();
      x.restore();
    }

    /* ── one matte colour-FIELD plate. Clipped surface texture, weathered edge,
       seam stitching on chosen edges (as line texture), runs. Returns rect. ── */
    function plate(px, py, pw, ph, c, opts) {
      opts = opts || {};
      if (pw < 2 || ph < 2) return { px, py, pw, ph };
      let lit = opts.lit == null ? (0.4 + r() * 0.55) : opts.lit;
      // chalk is the one element that drifts toward chrome/white — keep it a
      // weathered bone/buff: hard-cap lift and pull it firmly toward warm haze
      // + a little rust so it reads as scrubbed lime on oxide, never paper-white.
      const isChalk = c === pal.chalk;
      if (isChalk) { lit = Math.min(lit, 0.4); c = K.mix(K.mix(c, pal.haze, 0.4), pal.rust, 0.14); }
      // cast shadow under plate (AO) — grounds the field
      x.save(); x.globalCompositeOperation = 'multiply';
      x.fillStyle = K.rgba(pal.deep, 0.5);
      const so = S * 0.012;
      x.fillRect(px + so, py + so, pw, ph);
      x.restore();

      x.save();
      x.beginPath(); x.rect(px, py, pw, ph); x.clip();

      // body — the colour field
      x.fillStyle = fieldFill(px + pw / 2, py + ph / 2, pw, ph, c, lit);
      x.fillRect(px, py, pw, ph);

      // material weathering — heavy mottle is the matte oxide tooth
      K.mottle(x, px, py, pw, ph, c, 14, r, 'overlay');
      K.mottle(x, px, py, pw, ph, K.mix(c, pal.rust, 0.55), 55, r, 'multiply');

      // fbm oxide blooms across the field — patches of hotter / cooler rust so
      // the field reads as living oxide, not flat paint
      x.save(); x.globalCompositeOperation = 'overlay';
      const blooms = 2 + Math.floor(r() * 3);
      for (let i = 0; i < blooms; i++) {
        const bx = px + r() * pw, by = py + r() * ph;
        const br = S * (0.08 + r() * 0.16);
        const hot = !isChalk && r() < 0.5; // chalk only gets cooler rust staining
        K.bloom(x, bx, by, br, hot ? pal.accent : pal.rust, (isChalk ? 0.05 : 0.07) + r() * 0.06);
      }
      x.restore();

      // fbm pitting — dark micro-specks, the corroded grain
      x.save(); x.globalCompositeOperation = 'multiply';
      const pit = Math.floor(pw * ph / 850);
      for (let i = 0; i < pit; i++) {
        const qx = px + r() * pw, qy = py + r() * ph;
        const nv = noise.fbm(qx / 80, qy / 80, 4);
        if (nv > 0.12) { x.fillStyle = K.rgba(pal.deep, 0.05 + r() * 0.06); x.fillRect(qx, qy, 1 + r() * 2, 1 + r() * 2); }
      }
      x.restore();

      // occasional chalk scrub mark (weathering, abstract)
      if (opts.scrub !== false && r() < 0.5) chalkScrub(px, py, pw, ph, 0.18 + r() * 0.16);

      // runs INSIDE the field, bleeding from the top down (clipped)
      if (opts.innerRuns !== false && r() < 0.7) {
        const n = 3 + Math.floor(r() * 6);
        for (let i = 0; i < n; i++) {
          const rx = px + r() * pw;
          const len = ph * (0.2 + r() * 0.7);
          const wid = S * (0.0015 + r() * 0.005);
          const g = x.createLinearGradient(rx, py, rx, py + len);
          const rc = K.mix(pal.rust, c, 0.3);
          g.addColorStop(0, K.rgba(rc, 0.3));
          g.addColorStop(1, K.rgba(rc, 0));
          x.fillStyle = g; x.fillRect(rx - wid, py, wid * 2, len);
        }
      }

      x.restore(); // unclip

      // edge bevels: lit top/left, dark bottom/right (matte, low contrast)
      x.lineWidth = Math.max(1, S * 0.003);
      x.strokeStyle = K.rgba(K.mix(c, '#fff', 0.18), 0.42 * lit);
      x.beginPath(); x.moveTo(px, py + ph); x.lineTo(px, py); x.lineTo(px + pw, py); x.stroke();
      x.strokeStyle = K.rgba(pal.seam, 0.7);
      x.beginPath(); x.moveTo(px + pw, py); x.lineTo(px + pw, py + ph); x.lineTo(px, py + ph); x.stroke();

      // chipped/weathered edge breakup — kills the clean-vector tell
      x.save();
      const chips = Math.floor((pw + ph) / (S * 0.045));
      for (let i = 0; i < chips; i++) {
        const e = r(); let cxp, cyp;
        if (e < 0.25) { cxp = px + r() * pw; cyp = py; }
        else if (e < 0.5) { cxp = px + r() * pw; cyp = py + ph; }
        else if (e < 0.75) { cxp = px; cyp = py + r() * ph; }
        else { cxp = px + pw; cyp = py + r() * ph; }
        const cs = S * (0.003 + r() * 0.009);
        x.fillStyle = K.rgba(r() < 0.5 ? pal.rust : pal.deep, 0.28 + r() * 0.3);
        x.beginPath(); x.arc(cxp, cyp, cs, 0, 7); x.fill();
      }
      x.restore();

      // seam stitching on chosen edges — rendered as line texture
      const inset = S * 0.018;
      if (opts.seamTop) seamLine(px + inset, py + inset, px + pw - inset, py + inset, opts.seamStrength);
      if (opts.seamLeft) seamLine(px + inset, py + inset, px + inset, py + ph - inset, opts.seamStrength);
      if (opts.seamRight) seamLine(px + pw - inset, py + inset, px + pw - inset, py + ph - inset, opts.seamStrength);
      if (opts.seamBot) seamLine(px + inset, py + ph - inset, px + pw - inset, py + ph - inset, opts.seamStrength);

      // rust runs from this plate's bottom edge onto the ground below
      if (opts.runs !== false && r() < 0.8) rustRuns(px, py + ph, pw, opts.runIntensity || 1);
      return { px, py, pw, ph };
    }

    /* ── taut scaffold/cable lines: straight, tensioned line geometry. ── */
    function scaffold(n, opts) {
      opts = opts || {};
      n = n || (2 + Math.floor(r() * 4));
      for (let i = 0; i < n; i++) {
        const horiz = opts.horiz != null ? opts.horiz : r() < 0.5;
        let ax, ay, bx, by;
        if (horiz) { ay = by = H * (0.08 + r() * 0.84); ax = -S * 0.05; bx = W + S * 0.05; }
        else { ax = bx = W * (0.08 + r() * 0.84); ay = -S * 0.05; by = H + S * 0.05; }
        if (r() < 0.4) { if (horiz) by += (r() - 0.5) * H * 0.3; else bx += (r() - 0.5) * W * 0.3; }
        const lw = S * (0.0022 + r() * (opts.heavy ? 0.009 : 0.005));
        // cable shadow
        x.strokeStyle = K.rgba(pal.deep, 0.5); x.lineWidth = lw * 1.8;
        x.beginPath(); x.moveTo(ax + S * 0.006, ay + S * 0.006); x.lineTo(bx + S * 0.006, by + S * 0.006); x.stroke();
        // cable body — sea-iron or chalk, taut and matte
        const cc = r() < 0.6 ? pal.iron : pal.chalk;
        x.strokeStyle = K.rgba(K.mix(cc, '#000', 0.15), 0.9); x.lineWidth = lw;
        x.beginPath(); x.moveTo(ax, ay); x.lineTo(bx, by); x.stroke();
        // thin lit edge along the cable
        x.strokeStyle = K.rgba(K.mix(cc, '#fff', 0.4), 0.4); x.lineWidth = lw * 0.4;
        x.beginPath(); x.moveTo(ax, ay - lw * 0.4); x.lineTo(bx, by - lw * 0.4); x.stroke();
        // turnbuckle / tension fitting at a random point
        if (r() < 0.55) {
          const t = 0.2 + r() * 0.6; const fx = ax + (bx - ax) * t, fy = ay + (by - ay) * t;
          x.fillStyle = K.rgba(pal.iron, 0.95);
          x.save(); x.translate(fx, fy); x.rotate(Math.atan2(by - ay, bx - ax));
          x.fillRect(-lw * 2.5, -lw * 1.4, lw * 5, lw * 2.8); x.restore();
        }
      }
    }

    /* ── the IMPOSSIBLE curve: a flat plane bends off an edge into deep space.
       Drawn as a field whose far portion warps into a curved sheet receding to a
       vanishing strip, darkening into the void, lit wrong vs the flat part. ── */
    function curvedAnomaly(px, py, pw, ph, c) {
      // flat near portion as a colour field
      plate(px, py, pw, ph * 0.5, c, { seamTop: true, seamLeft: true, runs: false, lit: 0.72, innerRuns: false });
      x.save();
      const segs = 28;
      const baseY = py + ph * 0.5;
      const curveDir = r() < 0.5 ? -1 : 1;
      for (let i = 0; i < segs; i++) {
        const t = i / segs, t2 = (i + 1) / segs;
        const ease = t * t, ease2 = t2 * t2;
        const inset = pw * 0.5 * ease, inset2 = pw * 0.5 * ease2;
        const shift = curveDir * pw * 0.9 * ease, shift2 = curveDir * pw * 0.9 * ease2;
        const lx = px + inset + shift, rx = px + pw - inset + shift;
        const lx2 = px + inset2 + shift2, rx2 = px + pw - inset2 + shift2;
        const y1 = baseY + ph * 0.5 * t, y2 = baseY + ph * 0.5 * t2;
        const cc = K.mix(c, pal.deep, 0.15 + t * 0.72);
        x.fillStyle = cc;
        x.beginPath(); x.moveTo(lx, y1); x.lineTo(rx, y1); x.lineTo(rx2, y2); x.lineTo(lx2, y2); x.closePath(); x.fill();
        if (i % 5 === 0) { x.strokeStyle = K.rgba(pal.seam, 0.45); x.lineWidth = 1; x.stroke(); }
      }
      x.restore();
      // a thin chalk highlight along the bend crest (where flat meets curve)
      x.strokeStyle = K.rgba(pal.chalk, 0.45); x.lineWidth = S * 0.0035;
      x.beginPath(); x.moveTo(px, baseY); x.lineTo(px + pw, baseY); x.stroke();
      rustRuns(px, baseY, pw, 0.6);
    }

    // ════════════════════════════════════════════════════════════════════════
    // COMPOSE
    // ════════════════════════════════════════════════════════════════════════
    background();

    if (mode === 'Butt-Joint Field') {
      // tight tiled colour-field grid filling the frame, irregular cuts, one
      // chalk relief field, varied seam runs. No gaps to the void.
      const nc = 3 + Math.floor(r() * 2), nr = 3 + Math.floor(r() * 2);
      const m = S * 0.035;
      const fieldX = m, fieldY = m, fieldW = W - m * 2, fieldH = H - m * 2;
      // irregular column / row cut positions (golden-ish jitter)
      const cx = [0]; for (let i = 1; i < nc; i++) cx.push(cx[i - 1] + (1 / nc) * (0.7 + r() * 0.6));
      const ry = [0]; for (let i = 1; i < nr; i++) ry.push(ry[i - 1] + (1 / nr) * (0.7 + r() * 0.6));
      cx.push(cx[cx.length - 1] + (0.7 + r() * 0.6)); ry.push(ry[ry.length - 1] + (0.7 + r() * 0.6));
      const cxMax = cx[cx.length - 1], ryMax = ry[ry.length - 1];
      const gap = S * 0.008;
      const chalkCell = Math.floor(r() * nc * nr);
      let idx = 0;
      for (let rr = 0; rr < nr; rr++) for (let cc2 = 0; cc2 < nc; cc2++) {
        const gx = fieldX + (cx[cc2] / cxMax) * fieldW;
        const gy = fieldY + (ry[rr] / ryMax) * fieldH;
        const gw = ((cx[cc2 + 1] - cx[cc2]) / cxMax) * fieldW;
        const gh = ((ry[rr + 1] - ry[rr]) / ryMax) * fieldH;
        const c = idx === chalkCell ? pal.chalk : col(rr + cc2 + (r() < 0.3 ? 1 : 0));
        plate(gx + gap / 2, gy + gap / 2, gw - gap, gh - gap, c, {
          seamLeft: r() < 0.55, seamRight: r() < 0.3, seamBot: r() < 0.3, seamTop: r() < 0.3,
          runIntensity: 0.7 + r() * 0.5, lit: 0.35 + r() * 0.45,
        });
        idx++;
      }
      scaffold(2 + Math.floor(r() * 2));
    } else if (mode === 'Stacked Lap') {
      // horizontal strata fully filling the frame, lapped bands, hero band
      const n = 4 + Math.floor(r() * 3);
      let yy = -S * 0.02;
      const heroRow = 1 + Math.floor(r() * (n - 1));
      const total = H + S * 0.04;
      // alternate band value so strata read distinctly (no flat murk)
      for (let i = 0; i < n; i++) {
        const remaining = total - (yy + S * 0.02);
        const bandsLeft = n - i;
        const hh = (remaining / bandsLeft) * (0.85 + r() * 0.4);
        const xoff = (r() - 0.5) * W * 0.06;
        let c, lit;
        if (i === heroRow) { c = pal.plate[2]; lit = 0.85; }
        else if (r() < 0.14) { c = pal.chalk; lit = 0.6; }
        else { c = (i % 2 === 0) ? col(0) : K.mix(col(1), pal.rust, 0.25); lit = (i % 2 === 0) ? 0.62 : 0.3; }
        plate(-S * 0.03 + xoff, yy, W + S * 0.06, hh, c, {
          seamTop: true, seamBot: r() < 0.5, runIntensity: 0.9 + r() * 0.6, lit,
        });
        yy += hh * (0.86 + r() * 0.1);
      }
      scaffold(1 + Math.floor(r() * 2), { horiz: false });
    } else if (mode === 'Diagonal Brace') {
      // large background field + bold diagonal bars treated as taut line geometry
      plate(-S * 0.02, -S * 0.02, W + S * 0.04, H + S * 0.04, col(0), { seamLeft: true, seamTop: true, lit: 0.42, runs: false, innerRuns: true });
      const nb = 2 + Math.floor(r() * 2);
      for (let i = 0; i < nb; i++) {
        const ang = (r() < 0.5 ? 1 : -1) * (0.55 + r() * 0.55);
        const bw = S * (0.7 + r() * 0.7), bh = S * (0.1 + r() * 0.09);
        const bx = W * (0.25 + r() * 0.5), by = H * (0.25 + r() * 0.5);
        x.save(); x.translate(bx, by); x.rotate(ang);
        const c = i === 0 ? pal.plate[1] : (r() < 0.4 ? pal.chalk : pal.iron);
        plate(-bw / 2, -bh / 2, bw, bh, c, { seamTop: true, seamBot: true, runIntensity: 0.7 + r() * 0.4, runs: false });
        x.restore();
      }
      rustRuns(0, H * 0.05, W, 0.8);
      scaffold(2 + Math.floor(r() * 3));
    } else if (mode === 'Single Hero Plate') {
      // one dominant red field, confident negative space, small counterweights
      const hw = W * (0.56 + r() * 0.16), hh = H * (0.62 + r() * 0.2);
      const left = r() < 0.5;
      const hx = left ? W * (0.04 + r() * 0.05) : W - hw - W * (0.04 + r() * 0.05);
      const hy = H * (0.1 + r() * 0.14);
      plate(hx, hy, hw, hh, pal.plate[0], { seamTop: true, seamLeft: true, seamBot: true, seamRight: true, lit: 0.82, runIntensity: 1.2 });
      // counterweight fields in the open air on the opposite side
      const ox = left ? W * (0.72 + r() * 0.06) : W * (0.06 + r() * 0.06);
      plate(ox, H * (0.5 + r() * 0.14), W * (0.18 + r() * 0.06), H * (0.16 + r() * 0.06), r() < 0.55 ? pal.chalk : pal.iron, { seamTop: true, runIntensity: 0.6 });
      if (r() < 0.6) plate(ox + W * 0.015, H * (0.14 + r() * 0.1), W * 0.13, H * 0.11, pal.plate[1], { runIntensity: 0.4 });
      scaffold(3 + Math.floor(r() * 3));
    } else if (mode === 'Scaffold Cross') {
      // taut line lattice over a POPULATED field — large quartered colour blocks
      // anchor the frame (no dead void) and the lattice rakes across them.
      // two big asymmetric anchor fields splitting the frame, then accents.
      const splitV = 0.42 + r() * 0.16;     // vertical split fraction
      const splitH = 0.4 + r() * 0.2;        // horizontal split fraction
      const mm = S * 0.03;
      // big left field (full height), big right-top + right-bottom fields
      plate(mm, mm, W * splitV - mm * 1.5, H - mm * 2, pal.plate[0], { seamTop: true, seamLeft: true, seamRight: true, runIntensity: 1, lit: 0.6 });
      const rx0 = W * splitV + mm * 0.5;
      plate(rx0, mm, W - rx0 - mm, H * splitH - mm * 1.5, r() < 0.4 ? pal.chalk : col(1), { seamTop: true, seamLeft: true, runIntensity: 0.8, lit: 0.5 });
      plate(rx0, H * splitH + mm * 0.5, W - rx0 - mm, H - H * splitH - mm * 1.5, col(2), { seamTop: true, seamLeft: true, seamBot: true, runIntensity: 0.9, lit: 0.55 });
      // one inset accent block riding a seam
      if (r() < 0.7) plate(rx0 + W * 0.04, H * splitH * (0.3 + r() * 0.3), W * (0.14 + r() * 0.08), H * (0.12 + r() * 0.08), r() < 0.5 ? pal.iron : pal.plate[1], { seamTop: true, runIntensity: 0.6, lit: 0.7 });
      scaffold(6 + Math.floor(r() * 4), { heavy: false });
    } else if (mode === 'Curved Anomaly') {
      // full-frame quiet ground field so no dead void, a darker upper band for
      // the bend to read against, then the impossible bend as focal.
      plate(-S * 0.02, -S * 0.02, W + S * 0.04, H + S * 0.04, K.mix(col(1), pal.deep, 0.18), { seamTop: false, lit: 0.32, runs: false, innerRuns: true, scrub: false });
      plate(-S * 0.02, -S * 0.02, W + S * 0.04, H * 0.45, col(2), { seamTop: true, seamBot: true, lit: 0.5, runs: true, runIntensity: 0.7, innerRuns: true });
      const aw = W * (0.36 + r() * 0.18), ah = H * (0.58 + r() * 0.2);
      const ax = W * (0.14 + r() * 0.36);
      curvedAnomaly(ax, H * 0.16, aw, ah, pal.plate[0]);
      scaffold(2 + Math.floor(r() * 2));
    } else if (mode === 'Rift Split') {
      // frame cleaved by a raking diagonal seam into two value worlds — a
      // brighter oxide field and a deep cold-iron field, surreal mismatch.
      const t0 = 0.3 + r() * 0.4, t1 = 0.3 + r() * 0.4; // top & bottom crossing x
      const xt = W * t0, xb = W * t1;
      const lightSide = r() < 0.5;
      const cA = lightSide ? pal.plate[2] : K.mix(pal.iron, pal.deep, 0.3);
      const cB = lightSide ? K.mix(pal.iron, pal.deep, 0.3) : pal.plate[2];
      // left world
      x.save(); x.beginPath(); x.moveTo(0, 0); x.lineTo(xt, 0); x.lineTo(xb, H); x.lineTo(0, H); x.closePath(); x.clip();
      plate(-S * 0.05, -S * 0.05, W * 0.85, H + S * 0.1, cA, { lit: lightSide ? 0.8 : 0.3, runs: false, seamTop: true, seamLeft: true });
      x.restore();
      // right world
      x.save(); x.beginPath(); x.moveTo(xt, 0); x.lineTo(W, 0); x.lineTo(W, H); x.lineTo(xb, H); x.closePath(); x.clip();
      plate(W * 0.15, -S * 0.05, W + S * 0.1, H + S * 0.1, cB, { lit: lightSide ? 0.3 : 0.8, runs: false, seamTop: true, seamRight: true });
      x.restore();
      // the rift seam itself — taut bright line + deep shadow groove
      x.save();
      x.strokeStyle = K.rgba(pal.deep, 0.8); x.lineWidth = S * 0.012;
      x.beginPath(); x.moveTo(xt + S * 0.004, 0); x.lineTo(xb + S * 0.004, H); x.stroke();
      x.strokeStyle = K.rgba(pal.chalk, 0.55); x.lineWidth = S * 0.004;
      x.beginPath(); x.moveTo(xt, 0); x.lineTo(xb, H); x.stroke();
      x.restore();
      seamLine(xt, 0, xb, H, 0.8);
      rustRuns(0, H * 0.02, W, 0.7);
      scaffold(2 + Math.floor(r() * 2));
    } else if (mode === 'Strata Core') {
      // nested concentric fields receding to a focal core — abstract aperture
      const layers = 4 + Math.floor(r() * 3);
      const cxp = W * (0.4 + r() * 0.2), cyp = H * (0.4 + r() * 0.2);
      let w = W * (1.05), h = H * (1.05);
      const offDir = r() < 0.5 ? 1 : -1;
      for (let i = 0; i < layers; i++) {
        const t = i / layers;
        const c = i === layers - 1 ? pal.plate[0] : (i % 2 === 0 ? col(i) : K.mix(col(i), pal.iron, 0.25));
        const px = cxp - w / 2 + offDir * w * 0.04 * t;
        const py = cyp - h / 2 - h * 0.02 * t;
        plate(px, py, w, h, c, {
          seamTop: true, seamLeft: i % 2 === 0, seamRight: i % 2 === 1,
          lit: 0.35 + t * 0.5, runs: i === layers - 1, runIntensity: 0.8, innerRuns: i > 1,
        });
        w *= 0.66 - r() * 0.08; h *= 0.66 - r() * 0.08;
      }
      // deepen the core void
      x.save(); x.globalCompositeOperation = 'multiply';
      K.bloom(x, cxp + offDir * W * 0.04 * (layers / 6), cyp - H * 0.02 * (layers / 6), S * 0.2, pal.deep, 0.5);
      x.restore();
      scaffold(2 + Math.floor(r() * 3));
    } else if (mode === 'Cantilever') {
      // one big field anchored to an edge, planks cantilever out into open air,
      // tensioned by cables — strong directional asymmetry, confident void.
      const fromLeft = r() < 0.5;
      const aw = W * (0.32 + r() * 0.12), ah = H * (0.78 + r() * 0.16);
      const ax = fromLeft ? -S * 0.02 : W - aw + S * 0.02;
      const ay = H * (0.08 + r() * 0.06);
      plate(ax, ay, aw, ah, pal.plate[0], { seamTop: true, seamRight: fromLeft, seamLeft: !fromLeft, seamBot: true, lit: 0.7, runIntensity: 1.2 });
      // cantilevering planks out into the void
      const np = 3 + Math.floor(r() * 3);
      const edge = fromLeft ? ax + aw : ax;
      for (let i = 0; i < np; i++) {
        const py = ay + ah * (0.08 + (i / np) * 0.8);
        const reach = W * (0.18 + r() * 0.4);
        const ph = H * (0.04 + r() * 0.06);
        const px = fromLeft ? edge - S * 0.01 : edge - reach + S * 0.01;
        const c = i === 0 ? pal.plate[2] : (r() < 0.3 ? pal.chalk : (r() < 0.6 ? K.mix(pal.iron, pal.rust, 0.45) : col(i)));
        plate(px, py, reach, ph, c, { seamTop: true, seamBot: r() < 0.5, runIntensity: 0.6 + r() * 0.5, runs: r() < 0.6, lit: 0.45 + r() * 0.3 });
      }
      scaffold(3 + Math.floor(r() * 3), { horiz: false });
    } else { // Seam Lattice — pure taut-line lattice over quiet ground fields
      // quiet large fields as ground
      const nb = 2 + Math.floor(r() * 2);
      let yy = -S * 0.02;
      for (let i = 0; i < nb; i++) {
        const hh = (H + S * 0.04) / nb * (0.9 + r() * 0.25);
        plate(-S * 0.02, yy, W + S * 0.04, hh, col(i), { seamTop: i > 0, lit: 0.4 + r() * 0.3, runIntensity: 0.7, innerRuns: true });
        yy += hh * (0.95 + r() * 0.06);
      }
      // dense taut lattice — the hero geometry, both axes
      const nh = 3 + Math.floor(r() * 4), nv = 3 + Math.floor(r() * 4);
      for (let i = 0; i < nh; i++) {
        const y = H * (0.08 + (i / (nh - 1 || 1)) * 0.84) + (r() - 0.5) * H * 0.04;
        seamLine(-S * 0.02, y, W + S * 0.02, y, 0.9);
      }
      scaffold(nv, { horiz: false, heavy: r() < 0.3 });
      // a couple of bright tension cables crossing for depth
      scaffold(1 + Math.floor(r() * 2), { horiz: true });
    }

    // grail seeds (~1-in-11) get an extra impossible bend even outside that mode
    const grail = r() < 0.09 || isRare;
    if (grail && mode !== 'Curved Anomaly') {
      const aw = W * (0.26 + r() * 0.08), ah = H * (0.4 + r() * 0.08);
      const side = r() < 0.5;
      curvedAnomaly(side ? W * (0.55 + r() * 0.12) : W * (0.04 + r() * 0.06), H * (0.08 + r() * 0.06), aw, ah, isRare ? pal.accent : pal.plate[2]);
    }

    // ── ATMOSPHERE & TEXTURE (haze that adds air WITHOUT bleaching) ──
    // warm rust haze, kept low + soft-light so darks stay dark, red stays red
    K.hazeSheet(x, W, H, noise, pal.haze, isRare ? 0.15 : 0.17, S * 0.85, 'soft-light');
    // a second finer-scale haze drift for depth (very low)
    K.hazeSheet(x, W, H, noise2, pal.haze, 0.07, S * 0.35, 'soft-light');
    // a directional light shaft — raking, keeps mid-key warmth
    const lightX = r() < 0.5 ? W * 0.2 : W * 0.8;
    K.bloom(x, lightX, H * (0.18 + r() * 0.3), S * 0.95, K.mix(pal.haze, pal.accent, 0.4), isRare ? 0.16 : 0.11);
    // restore contrast: a multiply pass at edges so it never fogs flat
    x.save(); x.globalCompositeOperation = 'multiply'; x.globalAlpha = 0.26;
    const eg = x.createRadialGradient(W / 2, H / 2, S * 0.36, W / 2, H / 2, S * 0.8);
    eg.addColorStop(0, K.rgba(pal.deep, 0)); eg.addColorStop(1, K.rgba(pal.deep, 0.72));
    x.fillStyle = eg; x.fillRect(0, 0, W, H); x.restore();
    // grain everywhere — the matte-metal tooth
    K.grain(x, W, H, 4.5, r);
    K.vignette(x, W, H, isRare ? 0.42 : 0.34);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : K.pick(PALS, r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const grail = r() < 0.09 || !!pal.rare;
    return { Palette: pal.name, Mode: mode, Format: f, Weather: pal.rare ? 'Ember' : 'Yard', Grail: (grail || mode === 'Curved Anomaly') ? 'Anomaly' : 'None' };
  }

  return { name: 'h3_platework', draw, traits };
})();


export const miniumTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderMinium: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const MINIUM_ASPECTS: readonly number[] = [0.8125,1,1.2308];
export const miniumSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Scald Hull",
        "Ember Minium",
        "Dry-Dock Oxide",
        "Gale Light",
        "Red-Lead Yard",
        "Brine Iron"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Scaffold Cross",
        "Curved Anomaly",
        "Strata Core",
        "Cantilever",
        "Butt-Joint Field",
        "Stacked Lap",
        "Diagonal Brace",
        "Single Hero Plate",
        "Seam Lattice",
        "Rift Split"
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
      "name": "Weather",
      "values": [
        "Yard",
        "Ember"
      ]
    },
    {
      "name": "Grail",
      "values": [
        "None",
        "Anomaly"
      ]
    }
  ]
};
