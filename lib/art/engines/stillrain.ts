// @ts-nocheck
/*
 * StillRain — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/h4_stillrain.js). Continuous seed-driven surreal "real-but-off"
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


/* STILL RAIN — rainfall frozen mid-air, time stopped.
 * Thousands of droplets held in the air over a wet, reflective plain or empty
 * street; the absence of a figure rendered as a dry, human-shaped silhouette on
 * otherwise soaked ground; sheets of stopped rain hanging like a wall; a few
 * enormous lens-drops refracting the scene behind them; a puddle mirroring a
 * grey sky.
 * SURREAL = real-but-off: a wholly believable cold wet scene with ONE law
 * broken — the rain does not fall. It hangs. Calm, melancholy, uncanny.
 * Hazy + textured every frame (haze sheet + grain + mottle + vignette).
 * Nothing neon, nothing trippy. Cold steel / graphite / slate, one cyan glint.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six palettes — one cold wet steel/slate world, each a different weather and
     a different temperature of overcast light, all sharing the single cool cyan
     glint that marks this project. */
  const PALS = [
    { name: 'Cold Steel',   skyTop:'#3a464f', skyLow:'#6e8794', ground:'#44505a', groundLit:'#586872', wet:'#2a3138', drop:'#aec6ce', glint:'#9fdfe6', ink:'#1c2329', haze:'#7e929c', dry:'#5b6168' },
    { name: 'Graphite Rain',skyTop:'#2b3137', skyLow:'#525d65', ground:'#363c42', groundLit:'#4a525a', wet:'#1f242a', drop:'#9cb4bc', glint:'#86d2da', ink:'#13181c', haze:'#6a767e', dry:'#4b5056' },
    { name: 'Slate Dusk',   skyTop:'#343b48', skyLow:'#5e6e7e', ground:'#3d4550', groundLit:'#525d6a', wet:'#242a32', drop:'#a6bcc6', glint:'#8fd6e0', ink:'#181d24', haze:'#73818f', dry:'#525763' },
    { name: 'Pale Sleet',   skyTop:'#566472', skyLow:'#9bb1bd', ground:'#5a6772', groundLit:'#71808b', wet:'#3a434c', drop:'#c8dde3', glint:'#a6e6ee', ink:'#2a323a', haze:'#9db0bb', dry:'#6c7480' },
    { name: 'Ironwater',    skyTop:'#2e353c', skyLow:'#586872', ground:'#3a424a', groundLit:'#4d5760', wet:'#20262c', drop:'#9fb8c0', glint:'#7fccd6', ink:'#141a1f', haze:'#6e7c86', dry:'#4a5057' },
    { name: 'Frost Verge',  skyTop:'#3f4a54', skyLow:'#7e96a2', ground:'#48535d', groundLit:'#5d6a76', wet:'#2c343c', drop:'#bcd4dc', glint:'#a0e2ec', ink:'#1e252b', haze:'#869aa4', dry:'#5a616a' },
  ];

  const MODES = ['Suspended Field', 'Dry Silhouette', 'Hanging Streaks', 'Droplet Lens', 'Puddle Mirror', 'Held Sheet'];
  // portrait (0.8) and wide (1.5), varied per seed
  const FORMATS = [[1000, 1250], [1250, 1000], [1040, 1300], [1280, 853]];

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  // ── a single held droplet: a soft vertical pill with a top-left specular dot ──
  function drop(x, dx, dy, dw, dh, col, glint, alpha, lit) {
    x.save();
    x.globalAlpha = alpha;
    // body — elongated teardrop, fatter at the bottom
    const g = x.createLinearGradient(dx, dy - dh, dx, dy + dh);
    g.addColorStop(0, K.rgba(col, 0.0));
    g.addColorStop(0.45, K.rgba(col, 0.55));
    g.addColorStop(1, K.rgba(col, 0.95));
    x.fillStyle = g;
    x.beginPath();
    x.moveTo(dx, dy - dh);
    x.quadraticCurveTo(dx + dw, dy + dh * 0.2, dx, dy + dh);
    x.quadraticCurveTo(dx - dw, dy + dh * 0.2, dx, dy - dh);
    x.closePath();
    x.fill();
    // specular highlight (top-left)
    if (lit) {
      x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(glint, 0.7);
      x.beginPath();
      x.ellipse(dx - dw * 0.3, dy - dh * 0.2, dw * 0.28, dh * 0.22, -0.4, 0, 7);
      x.fill();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 11);
    const pal = pickPal(r);
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const minWH = Math.min(W, H);

    // horizon: low sky, lots of wet ground (reflective plain) — most modes
    const hz = H * (mode === 'Puddle Mirror' ? 0.30 : (0.34 + r() * 0.14));
    const glintSide = r() < 0.5 ? -1 : 1;        // where the single cyan glint sits
    const glintX = glintSide < 0 ? W * (0.18 + r() * 0.16) : W * (0.66 + r() * 0.16);

    // ============ SKY — flat overcast wash, faint vertical gradient ============
    const sg = x.createLinearGradient(0, 0, 0, hz + H * 0.1);
    sg.addColorStop(0, pal.skyTop);
    sg.addColorStop(1, pal.skyLow);
    x.fillStyle = sg; x.fillRect(0, 0, W, hz + H * 0.1 + 2);

    // a cold cloud bank, fbm-shaped, low over the horizon
    paintClouds(x, W, H, hz, pal, noise, r);

    // the single cyan glint in the sky — a cold break in the cloud
    K.bloom(x, glintX, hz * (0.4 + r() * 0.35), minWH * (0.16 + r() * 0.1), pal.glint, 0.16);

    // ============ GROUND — wet reflective plain / street ============
    paintGround(x, W, H, hz, pal, glintX, noise, r, mode);

    // ============ COMPOSE per mode ============
    if (mode === 'Suspended Field')      suspendedField(x, W, H, hz, pal, glintX, r, noise);
    else if (mode === 'Dry Silhouette')  drySilhouette(x, W, H, hz, pal, glintX, r, noise);
    else if (mode === 'Hanging Streaks') hangingStreaks(x, W, H, hz, pal, glintX, r);
    else if (mode === 'Droplet Lens')    dropletLens(x, W, H, hz, pal, glintX, r, noise);
    else if (mode === 'Puddle Mirror')   puddleMirror(x, W, H, hz, pal, glintX, r, noise);
    else                                 heldSheet(x, W, H, hz, pal, glintX, r);

    // ============ ATMOSPHERE & TEXTURE — every frame ============
    // cold drifting haze
    const hazeCol = K.mix(pal.haze, pal.glint, 0.12);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.20, minWH * 0.85, 'screen');
    // low ground mist band at the horizon
    const gm = x.createLinearGradient(0, hz - H * 0.05, 0, hz + H * 0.14);
    gm.addColorStop(0, K.rgba(hazeCol, 0));
    gm.addColorStop(0.5, K.rgba(hazeCol, 0.42));
    gm.addColorStop(1, K.rgba(hazeCol, 0));
    x.fillStyle = gm; x.fillRect(0, hz - H * 0.05, W, H * 0.19);
    // surface mottle across the whole frame for that film/material grit
    K.mottle(x, 0, 0, W, H, pal.ground, 90, r, 'overlay');
    K.grain(x, W, H, 5.2, r);
    K.vignette(x, W, H, 0.40);

    return { aspect: W / H };
  }

  // ── cold layered cloud bank above the horizon ──
  function paintClouds(x, W, H, hz, pal, noise, r) {
    x.save();
    const bands = 3;
    for (let b = 0; b < bands; b++) {
      const baseY = hz * (0.18 + b * 0.24);
      const col = K.mix(pal.skyLow, pal.skyTop, b / bands);
      x.globalCompositeOperation = b === 0 ? 'screen' : 'source-over';
      x.fillStyle = K.rgba(col, 0.5);
      x.beginPath();
      x.moveTo(0, baseY);
      for (let xx = 0; xx <= W; xx += 8) {
        const n = noise.fbm(xx / 220 + b * 5, b * 3, 4, 0.5, 2);
        x.lineTo(xx, baseY + n * hz * 0.16);
      }
      x.lineTo(W, hz + 4); x.lineTo(0, hz + 4); x.closePath();
      x.fill();
    }
    x.restore();
  }

  // ── wet reflective ground with a smeared vertical reflection of the sky ──
  function paintGround(x, W, H, hz, pal, glintX, noise, r, mode) {
    // base wet slab
    const gg = x.createLinearGradient(0, hz, 0, H);
    gg.addColorStop(0, pal.groundLit);
    gg.addColorStop(0.5, pal.ground);
    gg.addColorStop(1, pal.wet);
    x.fillStyle = gg; x.fillRect(0, hz, W, H - hz);

    // vertical sky reflection streaking down from horizon (wet sheen)
    x.save();
    x.globalCompositeOperation = 'screen';
    const rg = x.createLinearGradient(0, hz, 0, H);
    rg.addColorStop(0, K.rgba(pal.skyLow, 0.5));
    rg.addColorStop(0.35, K.rgba(pal.skyLow, 0.16));
    rg.addColorStop(1, K.rgba(pal.skyLow, 0));
    x.fillStyle = rg; x.fillRect(0, hz, W, H - hz);
    x.restore();

    // a long cool reflection of the glint smeared DOWN the wet ground — a soft
    // vertical streak with a bright narrow core, broken into shimmering glints
    // by ripple modulation. Reads as light running down water, not stripes.
    x.save();
    x.globalCompositeOperation = 'lighter';
    const cw = W * (0.05 + r() * 0.035);
    const phase = r() * 6.28, freq = 0.05 + r() * 0.025;
    const bottom = H * 0.95;
    for (let yy = hz; yy < bottom; yy += 3) {
      const t = (yy - hz) / (H - hz);
      // ripple shimmer along the streak + a few brighter glint beads
      const ripple = 0.55 + 0.45 * Math.sin(yy * freq + phase);
      const bead = Math.pow(0.5 + 0.5 * Math.sin(yy * freq * 0.5 + phase * 1.7), 6);
      const a = (0.20 * (1 - t * 0.6)) * (ripple * 0.6 + bead * 0.8);
      if (a < 0.006) continue;
      const wobble = Math.sin(yy * 0.03 + phase) * cw * 0.5;   // gentle wet drift
      const cxw = cw * (0.5 + t * 1.4);                        // narrow near, spreads far
      const gx = glintX + wobble;
      const g = x.createLinearGradient(gx - cxw, 0, gx + cxw, 0);
      g.addColorStop(0, K.rgba(pal.glint, 0));
      g.addColorStop(0.5, K.rgba(pal.glint, a));
      g.addColorStop(1, K.rgba(pal.glint, 0));
      x.fillStyle = g;
      x.fillRect(gx - cxw, yy, cxw * 2, 4);
    }
    x.restore();

    // faint puddle pools (subtle lighter patches) for non-puddle modes
    if (mode !== 'Puddle Mirror') {
      x.save();
      x.globalCompositeOperation = 'screen';
      const np = 3 + (r() * 3 | 0);
      for (let i = 0; i < np; i++) {
        const px = W * (0.1 + r() * 0.8);
        const py = hz + (H - hz) * (0.25 + r() * 0.6);
        const pr = minOf(W, H) * (0.05 + r() * 0.12);
        const pg = x.createRadialGradient(px, py, 0, px, py, pr);
        pg.addColorStop(0, K.rgba(pal.skyLow, 0.18));
        pg.addColorStop(1, K.rgba(pal.skyLow, 0));
        x.fillStyle = pg;
        x.beginPath(); x.ellipse(px, py, pr, pr * 0.4, 0, 0, 7); x.fill();
      }
      x.restore();
    }

    // subtle horizon line
    x.fillStyle = K.rgba(pal.ink, 0.22);
    x.fillRect(0, hz - 1, W, 2);
  }
  function minOf(a, b) { return a < b ? a : b; }

  // ── a held field of suspended drops with depth (size + alpha by depth) ──
  // returns nothing; used by several modes. avoidRect: {x0,y0,x1,y1} to leave dry.
  function rainField(x, W, H, hz, pal, glintX, r, count, avoid) {
    const top = H * 0.02;
    const bottom = H * 0.94;
    for (let i = 0; i < count; i++) {
      // depth 0 (near, big) .. 1 (far, small)
      const depth = r();
      const dx = r() * W;
      const dy = top + r() * (bottom - top);
      if (avoid && dx > avoid.x0 && dx < avoid.x1 && dy > avoid.y0 && dy < avoid.y1) continue;
      const scale = (1 - depth);
      const dw = (0.7 + scale * 3.2);
      const dh = dw * (2.4 + r() * 1.6);
      const alpha = 0.18 + scale * 0.6;
      // drops nearer the glint pick up a touch more cyan
      const near = 1 - Math.min(1, Math.abs(dx - glintX) / (W * 0.4));
      const col = near > 0.5 ? K.mix(pal.drop, pal.glint, (near - 0.5) * 0.5) : pal.drop;
      drop(x, dx, dy, dw, dh, col, pal.glint, alpha, scale > 0.45);
    }
  }

  function suspendedField(x, W, H, hz, pal, glintX, r, noise) {
    // dense even held rain, strong depth — the canonical "time stopped" frame.
    // density + foreground drop count vary so the field never reads identical.
    rainField(x, W, H, hz, pal, glintX, r, 3000 + (r() * 2600 | 0), null);
    // a few oversized foreground drops to seat the depth — count + placement vary
    const fgN = 8 + (r() * 16 | 0);
    for (let i = 0; i < fgN; i++) {
      const dx = r() * W, dy = H * (0.06 + r() * 0.86);
      const dw = 4 + r() * 6, dh = dw * (2.4 + r() * 1.8);
      drop(x, dx, dy, dw, dh, K.mix(pal.drop, '#fff', 0.1), pal.glint, 0.72 + r() * 0.2, true);
    }
  }

  function drySilhouette(x, W, H, hz, pal, glintX, r, noise) {
    // a human-shaped DRY patch on wet ground — the absence of a figure.
    // EVERYTHING here is seed-driven: size, where it stands, how it's built
    // (proportions, lean, stance, arm/shoulder), and how many figures.
    const groundH = H - hz;
    // 1 figure most of the time, occasionally a second smaller one further off
    const figN = r() < 0.30 ? 2 : 1;
    for (let fi = 0; fi < figN; fi++) {
      const far = fi > 0;                                   // second one reads distant
      const fh = groundH * (far ? (0.30 + r() * 0.16) : (0.50 + r() * 0.34));
      const fx = far ? W * (0.10 + r() * 0.80) : W * (0.22 + r() * 0.56);
      const fy = hz + groundH * (far ? (0.02 + r() * 0.22) : (-0.02 + r() * 0.12));
      const headR = fh * (0.072 + r() * 0.028);
      const bodyW = fh * (0.15 + r() * 0.10);
      const lean = (r() - 0.5) * fh * 0.16;                 // top-of-body horizontal lean
      const hipShift = (r() - 0.5) * bodyW * 0.5;           // contrapposto weight shift
      const stance = 0.04 + r() * 0.18;                     // leg spread at the feet
      const shoulderDrop = headR * (1.7 + r() * 0.9);       // where shoulders sit below head
      const armSwing = (r() - 0.5) * bodyW * 0.9;           // one side lifts (carrying / reaching)
      const waistY = 0.46 + r() * 0.18;
      const sx = lean;                                      // skew applied progressively up the body
      x.save();
      function figurePath() {
        const topY = fy + headR * 0.2;
        x.beginPath();
        // head — sits at the leaned-over top
        x.ellipse(fx + sx, fy + headR, headR, headR * (1.02 + r() * 0.16), 0, 0, 7);
        // left side down
        x.moveTo(fx + sx - bodyW * 0.5, fy + shoulderDrop);
        x.quadraticCurveTo(
          fx + (sx * 0.4) - bodyW * (0.6 + armSwing / bodyW), fy + shoulderDrop + headR * 0.3,
          fx + hipShift - bodyW * (0.5 + stance * 0.4), fy + fh * waistY);
        x.lineTo(fx + hipShift - bodyW * (0.5 + stance), fy + fh);
        x.lineTo(fx + hipShift - bodyW * 0.08, fy + fh);
        x.lineTo(fx + hipShift - bodyW * 0.04, fy + fh * (waistY + 0.1));
        x.lineTo(fx + hipShift + bodyW * 0.04, fy + fh * (waistY + 0.1));
        x.lineTo(fx + hipShift + bodyW * 0.08, fy + fh);
        x.lineTo(fx + hipShift + bodyW * (0.5 + stance), fy + fh);
        x.lineTo(fx + hipShift + bodyW * (0.5 + stance * 0.4), fy + fh * waistY);
        x.quadraticCurveTo(
          fx + (sx * 0.4) + bodyW * (0.6 - armSwing / bodyW), fy + shoulderDrop + headR * 0.3,
          fx + sx + bodyW * 0.5, fy + shoulderDrop);
        x.closePath();
        void topY;
      }
      // contact shadow under the feet to ground the silhouette
      K.softShadow(x, fx + hipShift, fy + fh, bodyW * (1.1 + r() * 0.6), 0.26 + r() * 0.12);
      const dryShade = K.mix(pal.dry, '#fff', far ? 0.0 : r() * 0.08);
      figurePath();
      x.fillStyle = dryShade;
      x.fill();
      // soft dry-edge feather: faint rim, no glow
      figurePath();
      x.strokeStyle = K.rgba(K.mix(dryShade, '#fff', 0.12), 0.18 + r() * 0.1);
      x.lineWidth = 2; x.stroke();
      // matte mottle inside the dry patch (no sheen)
      x.save(); figurePath(); x.clip();
      K.mottle(x, fx - fh * 0.4, fy, fh * 0.8, fh * 1.05, pal.dry, 22, r, 'overlay');
      x.restore();
      x.restore();
      // rain falls AROUND but NOT on this dry silhouette
      const avoid = { x0: fx - fh * 0.34, y0: fy, x1: fx + fh * 0.34, y1: fy + fh };
      rainField(x, W, H, hz, pal, glintX, r, far ? 700 : (1300 + (r() * 700 | 0)), avoid);
    }
  }

  function hangingStreaks(x, W, H, hz, pal, glintX, r) {
    // sheets of vertical streaks held in the air — longer than drops, parallax
    const cols = 60 + (r() * 30 | 0);
    for (let i = 0; i < cols; i++) {
      const depth = r();
      const sx = r() * W;
      const sy = H * (0.02 + r() * 0.6);
      const len = (H * 0.06) * (1 + (1 - depth) * 2.4) * (0.6 + r() * 0.9);
      const w = 0.6 + (1 - depth) * 1.8;
      const alpha = 0.12 + (1 - depth) * 0.45;
      const near = 1 - Math.min(1, Math.abs(sx - glintX) / (W * 0.45));
      const col = near > 0.55 ? K.mix(pal.drop, pal.glint, (near - 0.55) * 0.6) : pal.drop;
      const g = x.createLinearGradient(sx, sy, sx, sy + len);
      g.addColorStop(0, K.rgba(col, 0));
      g.addColorStop(0.5, K.rgba(col, alpha));
      g.addColorStop(1, K.rgba(col, alpha * 0.3));
      x.strokeStyle = g; x.lineWidth = w; x.lineCap = 'round';
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + (r() - 0.5) * 3, sy + len); x.stroke();
    }
    // scatter a few held round drops between the streaks for texture
    rainField(x, W, H, hz, pal, glintX, r, 500, null);
  }

  function dropletLens(x, W, H, hz, pal, glintX, r, noise) {
    // a few ENORMOUS suspended drops that refract/invert the scene behind them
    // first, a faint background field
    rainField(x, W, H, hz, pal, glintX, r, 700 + (r() * 500 | 0), null);
    const n = 2 + (r() * 4 | 0);                  // 2..5 lenses, count varies
    const heroSz = 0.14 + r() * 0.12;             // hero scale varies a lot
    const placed = [];
    for (let i = 0; i < n; i++) {
      // graduated sizes for composition: one hero, smaller companions
      const sz = i === 0 ? heroSz : (0.05 + r() * 0.11);
      const lr = minOf(W, H) * sz;
      const lx = W * (0.12 + r() * 0.76);
      const ly = H * (0.18 + r() * 0.62);         // free vertical placement, not a row
      placed.push({ lx, ly, lr });
    }
    for (const p of placed) {
      const { lx, ly, lr } = p;
      // shadow/seat
      K.softShadow(x, lx, ly + lr * 0.9, lr * 1.4, 0.32);
      // glass body — cool inverted micro-gradient (refraction hint)
      x.save();
      x.beginPath(); x.arc(lx, ly, lr, 0, 7); x.clip();
      // refracted inverted sky/ground inside the lens
      const inv = x.createLinearGradient(0, ly + lr, 0, ly - lr);
      inv.addColorStop(0, pal.skyLow);
      inv.addColorStop(0.5, pal.ground);
      inv.addColorStop(1, pal.wet);
      x.fillStyle = inv; x.fillRect(lx - lr, ly - lr, lr * 2, lr * 2);
      // a tiny inverted held-rain speckle inside (count varies per lens)
      const spk = 40 + (r() * 60 | 0);
      for (let k = 0; k < spk; k++) {
        const ddx = lx + (r() - 0.5) * lr * 1.7;
        const ddy = ly + (r() - 0.5) * lr * 1.7;
        drop(x, ddx, ddy, 0.8 + r() * 1.4, 2 + r() * 2.5, pal.drop, pal.glint, 0.4, true);
      }
      x.restore();
      // rim refraction + specular
      x.save();
      x.strokeStyle = K.rgba(K.mix(pal.drop, '#fff', 0.3), 0.5);
      x.lineWidth = 2.5;
      x.beginPath(); x.arc(lx, ly, lr * 0.98, 0, 7); x.stroke();
      x.restore();
      K.sheen(x, lx - lr * 0.35, ly - lr * 0.4, lr * 0.7, pal.glint, 0.45);
      x.fillStyle = K.rgba('#ffffff', 0.6);
      x.beginPath(); x.ellipse(lx - lr * 0.32, ly - lr * 0.35, lr * 0.12, lr * 0.08, -0.5, 0, 7); x.fill();
    }
  }

  function puddleMirror(x, W, H, hz, pal, glintX, r, noise) {
    // a wide reflective puddle mirroring a grey sky, held drops above it,
    // ripples frozen mid-spread (rings that never finished)
    // the puddle already comes from the low horizon / wet ground; add a big pool.
    // Position, scale, tilt and ring origin all vary so two puddles never frame
    // the same way.
    const px = W * (0.30 + r() * 0.40);
    const py = hz + (H - hz) * (0.40 + r() * 0.32);
    const prw = W * (0.26 + r() * 0.30);
    const prh = (H - hz) * (0.24 + r() * 0.22);
    const ptilt = (r() - 0.5) * 0.5;                 // the pool leans a little
    x.save();
    x.beginPath(); x.ellipse(px, py, prw, prh, ptilt, 0, 7); x.clip();
    // mirrored sky inside the puddle
    const mg = x.createLinearGradient(0, py - prh, 0, py + prh);
    mg.addColorStop(0, pal.wet);
    mg.addColorStop(0.6, K.mix(pal.skyLow, pal.wet, 0.4));
    mg.addColorStop(1, pal.skyLow);
    x.fillStyle = mg; x.fillRect(px - prw, py - prh, prw * 2, prh * 2);
    // reflected glint
    K.bloom(x, glintX, py + prh * 0.2, prw * (0.4 + r() * 0.25), pal.glint, 0.2);
    // frozen concentric ripples — rings caught mid-expansion, origin + spread varied
    const rings = 3 + (r() * 5 | 0);
    const rx = px + (r() - 0.5) * prw * 0.9, ry = py + (r() - 0.5) * prh * 0.7;
    const ringSpread = 0.55 + r() * 0.4;
    const ringSquash = 0.30 + r() * 0.25;
    for (let i = 1; i <= rings; i++) {
      const rr = (i / rings) * prw * ringSpread;
      x.strokeStyle = K.rgba(K.mix(pal.drop, pal.skyLow, 0.4), 0.18 * (1 - i / rings) + 0.05);
      x.lineWidth = 1.2 + (rings - i) * 0.3;
      x.beginPath(); x.ellipse(rx, ry, rr, rr * ringSquash, ptilt, 0, 7); x.stroke();
    }
    x.restore();
    // puddle rim shadow
    x.save();
    x.strokeStyle = K.rgba(pal.ink, 0.25); x.lineWidth = 2;
    x.beginPath(); x.ellipse(px, py, prw, prh, ptilt, 0, 7); x.stroke();
    x.restore();
    // a few smaller satellite pools scattered around, seeded per output
    const sat = 1 + (r() * 3 | 0);
    x.save(); x.globalCompositeOperation = 'screen';
    for (let s = 0; s < sat; s++) {
      const spx = W * (0.1 + r() * 0.8);
      const spy = hz + (H - hz) * (0.2 + r() * 0.7);
      const spr = minOf(W, H) * (0.04 + r() * 0.08);
      const sg = x.createRadialGradient(spx, spy, 0, spx, spy, spr);
      sg.addColorStop(0, K.rgba(pal.skyLow, 0.16));
      sg.addColorStop(1, K.rgba(pal.skyLow, 0));
      x.fillStyle = sg;
      x.beginPath(); x.ellipse(spx, spy, spr, spr * (0.32 + r() * 0.2), (r() - 0.5) * 0.6, 0, 7); x.fill();
    }
    x.restore();
    // held rain above
    rainField(x, W, H, hz, pal, glintX, r, 900 + (r() * 700 | 0), { x0: px - prw, y0: py - prh, x1: px + prw, y1: py + prh });
    // a few held drops hanging exactly over the puddle (about to land, never landing)
    const hangN = 5 + (r() * 8 | 0);
    for (let i = 0; i < hangN; i++) {
      const ddx = px + (r() - 0.5) * prw * 1.4;
      const ddy = py - prh - (r() * H * 0.22);
      const dwr = 2.4 + r() * 3.4;
      drop(x, ddx, ddy, dwr, dwr * (2.5 + r() * 1.4), K.mix(pal.drop, '#fff', 0.12), pal.glint, 0.7 + r() * 0.25, true);
    }
  }

  function heldSheet(x, W, H, hz, pal, glintX, r) {
    // a WALL of stopped rain — a dense vertical sheet, like a hanging curtain,
    // occupying a slab of the frame, with the scene faintly visible through it
    const sheetX0 = W * (0.08 + r() * 0.12);
    const sheetW = W * (0.5 + r() * 0.34);
    const sheetX1 = Math.min(W * 0.96, sheetX0 + sheetW);
    // backing haze so the wall reads as a volume
    x.save();
    x.globalCompositeOperation = 'screen';
    const bg = x.createLinearGradient(sheetX0, 0, sheetX1, 0);
    bg.addColorStop(0, K.rgba(pal.haze, 0));
    bg.addColorStop(0.5, K.rgba(pal.haze, 0.22));
    bg.addColorStop(1, K.rgba(pal.haze, 0));
    x.fillStyle = bg; x.fillRect(sheetX0, 0, sheetX1 - sheetX0, H);
    x.restore();
    // the dense held curtain: many fine vertical filaments + drops
    const lines = 460 + (r() * 180 | 0);
    for (let i = 0; i < lines; i++) {
      const t = r();
      const sx = sheetX0 + t * (sheetX1 - sheetX0);
      const sy = H * (r() * 0.12);
      const len = H * (0.45 + r() * 0.5);
      const depth = r();
      const w = 0.5 + (1 - depth) * 1.6;
      const alpha = 0.12 + (1 - depth) * 0.46;
      const near = 1 - Math.min(1, Math.abs(sx - glintX) / (W * 0.5));
      const col = near > 0.6 ? K.mix(pal.drop, pal.glint, (near - 0.6) * 0.7) : pal.drop;
      const g = x.createLinearGradient(sx, sy, sx, sy + len);
      g.addColorStop(0, K.rgba(col, 0));
      g.addColorStop(0.4, K.rgba(col, alpha));
      g.addColorStop(1, K.rgba(col, 0));
      x.strokeStyle = g; x.lineWidth = w; x.lineCap = 'round';
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx, sy + len); x.stroke();
    }
    // beaded drops studded through the wall — denser, more defined
    for (let i = 0; i < 1300; i++) {
      const sx = sheetX0 + r() * (sheetX1 - sheetX0);
      const sy = H * (0.02 + r() * 0.92);
      const sc = r();
      drop(x, sx, sy, 0.7 + sc * 2.6, (0.7 + sc * 2.6) * 2.8, pal.drop, pal.glint, 0.25 + sc * 0.55, sc > 0.45);
    }
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : K.pick(PALS, r);
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Wide' : 'Portrait';
    // mirror draw()'s rng order: hz consumes one r() except in Puddle Mirror
    if (mode !== 'Puddle Mirror') r();
    const glintSide = r() < 0.5 ? 'Left' : 'Right';
    return { Palette: pal.name, Mode: mode, Format: f, Glint: glintSide };
  }

  return { name: 'h4_stillrain', draw, traits };
})();


export const stillRainTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderStillRain: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const STILLRAIN_ASPECTS: readonly number[] = [0.8,1.25,1.5006];
export const stillRainSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Pale Sleet",
        "Frost Verge",
        "Graphite Rain",
        "Ironwater",
        "Cold Steel",
        "Slate Dusk"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Dry Silhouette",
        "Hanging Streaks",
        "Droplet Lens",
        "Puddle Mirror",
        "Held Sheet",
        "Suspended Field"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Wide",
        "Portrait"
      ]
    },
    {
      "name": "Glint",
      "values": [
        "Right",
        "Left"
      ]
    }
  ]
};
