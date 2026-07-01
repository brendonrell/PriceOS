// @ts-nocheck
/*
 * Appointment — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/h4_appointment.js). Continuous seed-driven surreal "real-but-off"
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


/* THE APPOINTMENT — a single freestanding object, alone on an infinite ground
 * plane in soft fog, casting a long shadow toward a low light. Magritte
 * stillness, uncanny solitude. SURREAL = real-but-off: one familiar object,
 * one law broken (a door standing in open ground, a mirror showing the wrong
 * thing, sky pouring through an empty frame). Calm, never trippy.
 *
 * Palette world: dusty rose, bone, taupe, long violet-grey shadow.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six bespoke palettes — all dusty-rose / bone / taupe / violet-grey family,
     each a different light & hour so the SET is varied, never one reskin.
     bg = top sky, hz = haze band, ground = plane, obj = object body,
     objHi = lit face, objLo = shade face, shadow = long cast, glow = low light. */
  const PALS = [
    { name: 'Rose Vestige',  bg:'#e7d4cb', hzc:'#e9d9d0', ground:'#cdb6ac', obj:'#c98b86', objHi:'#e0a9a2', objLo:'#7d5a59', shadow:'#5a4d57', glow:'#f3ddc9', ink:'#42363f' },
    { name: 'Bone Antechamber', bg:'#e9e0d4', hzc:'#efe7dc', ground:'#cfc3b3', obj:'#d8bfb4', objHi:'#ece0d6', objLo:'#8a7670', shadow:'#5e555c', glow:'#f6ecda', ink:'#4a3f47' },
    { name: 'Taupe Hour',    bg:'#d6c8bd', hzc:'#dccfc4', ground:'#b6a799', obj:'#8a7670', objHi:'#ab978d', objLo:'#564a4c', shadow:'#4a3f47', glow:'#e6d2bf', ink:'#352c33' },
    { name: 'Violet Dusk',   bg:'#bcaebb', hzc:'#c7b9c2', ground:'#9b8a92', obj:'#a07f86', objHi:'#c39aa0', objLo:'#4a3f47', shadow:'#3a313d', glow:'#e9cdbf', ink:'#2a232e' },
    { name: 'Ashen Morning', bg:'#dad6ce', hzc:'#e3dfd7', ground:'#bcb6ac', obj:'#b0a39a', objHi:'#d4cabf', objLo:'#6d6159', shadow:'#56505a', glow:'#efe6d6', ink:'#3d3740' },
    { name: 'Foglight',      bg:'#9f9aa0', hzc:'#b3aeae', ground:'#878088', obj:'#bda49c', objHi:'#dcc4ba', objLo:'#544b53', shadow:'#34303a', glow:'#cdb6a4', ink:'#211d26' },
  ];

  const MODES = ['Door', 'Curtain', 'Wardrobe', 'Standing Mirror', 'Empty Frame', 'Pair'];
  const FORMATS = [[1040, 1330], [1180, 1180]]; // portrait (0.78) / square

  function pickPal(r) {
    // ALWAYS consume the pick so the rng draw order is identical with/without
    // FORCE_PAL (and identical to traits()). FORCE_PAL only overrides the result.
    const picked = K.pick(PALS, r);
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return picked;
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 23);
    // ── HEADER rng draw order MUST match traits() EXACTLY (pal,mode,fmt,lightSide) ──
    const pal = pickPal(r);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const lightSide = r() < 0.5 ? -1 : 1;
    // ── everything below is draw-only; traits() does NOT read past lightSide ──
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // horizon — wide range so the camera framing genuinely changes seed to seed
    const hz = H * (0.24 + r() * 0.26);
    // low light source on the chosen side, position jittered hard across the band
    const lightX = lightSide < 0 ? W * (0.04 + r() * 0.22) : W * (0.74 + r() * 0.22);
    const lightY = hz * (0.40 + r() * 0.55);
    // object placement: real x/y wander, not a dead-centre constant. It drifts
    // opposite the light (so shadow has room) but the offset varies a lot.
    const objCx = W * (0.50 - lightSide * (0.02 + r() * 0.20));
    // global scale multiplier — some outputs are intimate close-ups, some tiny
    // and far, most in between
    const objScale = 0.74 + r() * 0.62;
    const dir = lightX < objCx ? 1 : -1;             // shadow direction

    // ===================== SKY / FOG FIELD =====================
    const g = x.createLinearGradient(0, 0, 0, hz + H * 0.10);
    g.addColorStop(0, pal.bg);
    g.addColorStop(0.7, K.mix(pal.bg, pal.hzc, 0.6));
    g.addColorStop(1, pal.hzc);
    x.fillStyle = g; x.fillRect(0, 0, W, hz + H * 0.12);

    // diffuse low glow where the light hides behind the fog
    K.bloom(x, lightX, lightY, S * (0.55 + r() * 0.30), pal.glow, 0.42);
    K.bloom(x, lightX, lightY, S * 0.22, pal.glow, 0.30);

    // ===================== GROUND PLANE =====================
    const gg = x.createLinearGradient(0, hz, 0, H);
    gg.addColorStop(0, K.mix(pal.ground, pal.hzc, 0.55)); // hazy at horizon
    gg.addColorStop(0.35, pal.ground);
    gg.addColorStop(1, K.mix(pal.ground, pal.ink, 0.20)); // ground darkens to foreground
    x.fillStyle = gg; x.fillRect(0, hz, W, H - hz);

    // subtle receding floor seams toward a vanishing point — VP wanders off the
    // light, seam count + spread + base anchor all seeded so the perspective
    // read differs every output
    const vpx = lightX + (r() - 0.5) * W * 0.2, vpy = hz + (r() - 0.5) * H * 0.04;
    const seamN = 5 + (r() * 5 | 0);
    const seamSpread = W / (5.0 + r() * 2.6);
    const seamBase = W * (0.4 + r() * 0.2);
    x.save(); x.strokeStyle = K.rgba(pal.ink, 0.05 + r() * 0.03); x.lineWidth = 1.0 + r() * 0.6;
    for (let i = -seamN; i <= seamN; i++) {
      const fx = seamBase + i * seamSpread;
      x.beginPath(); x.moveTo(fx, H); x.lineTo(vpx, vpy + 4); x.stroke();
    }
    x.restore();
    // faint ground mottle for material grit
    K.mottle(x, 0, hz, W, H - hz, pal.ground, 60, r, 'overlay');

    // distant ghost forms — faint far-off silhouettes on the horizon, seeded
    // count/position/size, dissolving into haze. Adds depth + uniqueness.
    const ghostN = (r() * 3.4 | 0); // 0..3 distant shapes
    x.save();
    for (let gi = 0; gi < ghostN; gi++) {
      const gx2 = W * (0.08 + r() * 0.84);
      const gw2 = S * (0.012 + r() * 0.04);
      const gh2 = (H - hz) * (0.05 + r() * 0.10);
      const gy2 = hz + (H - hz) * (0.01 + r() * 0.06);
      x.fillStyle = K.rgba(K.mix(pal.ground, pal.ink, 0.4), 0.05 + r() * 0.06);
      x.fillRect(gx2 - gw2 / 2, gy2 - gh2, gw2, gh2);
    }
    x.restore();

    // ===================== SHARED HELPERS =====================
    // long raking cast shadow: from the object base, projected AWAY from the low
    // light and TOWARD the foreground/viewer (down the picture), splaying wider
    // and fainter as it nears us, dissolving into the ground fog.
    function castShadow(baseCx, baseY, fw, len, soft) {
      x.save();
      const sp = soft || fw * 0.5;
      // tip moves sideways (away from light) AND down toward the viewer
      const tipX = baseCx + dir * len * 0.62;
      const tipY = Math.min(H - 2, baseY + len * 0.78);
      const grad = x.createLinearGradient(baseCx, baseY, tipX, tipY);
      grad.addColorStop(0, K.rgba(pal.shadow, 0.52));
      grad.addColorStop(0.5, K.rgba(pal.shadow, 0.24));
      grad.addColorStop(1, K.rgba(pal.shadow, 0.0));
      x.fillStyle = grad;
      x.beginPath();
      x.moveTo(baseCx - fw * 0.42, baseY);
      x.lineTo(baseCx + fw * 0.42, baseY);
      x.lineTo(tipX + sp * 1.6, tipY);              // splays wide near the viewer
      x.lineTo(tipX - sp * 1.6, tipY);
      x.closePath(); x.fill();
      // contact darkening right at the base
      x.fillStyle = K.rgba(pal.shadow, 0.42);
      x.beginPath();
      x.ellipse(baseCx, baseY, fw * 0.55, fw * 0.10, 0, 0, 7);
      x.fill();
      x.restore();
    }

    // a thin material panel (door / mirror / frame stile) with lit + shade faces
    function panel(px, py, pw, ph, depth, bodyCol, hiCol, loCol) {
      // lit front face: a gentle matte side-to-side gradient — only ONE edge
      // catches light, the rest is flat body colour, so it reads as painted
      // wood/plaster (a symmetric bright-centre ramp reads as polished chrome).
      const lg = x.createLinearGradient(px, py, px + pw, py);
      const litLeft = dir < 0; // light from left → left edge brighter
      const hiMix = K.mix(bodyCol, hiCol, 0.40);
      const loMix = K.mix(bodyCol, loCol, 0.30);
      if (litLeft) {
        lg.addColorStop(0, hiMix); lg.addColorStop(0.30, bodyCol);
        lg.addColorStop(0.85, bodyCol); lg.addColorStop(1, loMix);
      } else {
        lg.addColorStop(0, loMix); lg.addColorStop(0.15, bodyCol);
        lg.addColorStop(0.70, bodyCol); lg.addColorStop(1, hiMix);
      }
      x.fillStyle = lg; x.fillRect(px, py, pw, ph);
      // thin side face for body
      x.fillStyle = K.mix(loCol, pal.ink, 0.2);
      const sx = dir < 0 ? px + pw : px - depth;
      x.fillRect(sx, py, depth, ph);
      // top edge
      x.fillStyle = K.mix(hiCol, '#ffffff', 0.10);
      x.beginPath();
      x.moveTo(px, py);
      x.lineTo(px + pw, py);
      x.lineTo(px + pw + (dir < 0 ? depth : 0) - (dir < 0 ? 0 : depth), py - depth * 0.55);
      x.lineTo(px + (dir < 0 ? depth : 0) - (dir < 0 ? 0 : depth), py - depth * 0.55);
      x.closePath(); x.fill();
      // faint vertical grain to matte the surface and break any gradient sheen
      x.save(); x.globalAlpha = 0.06; x.strokeStyle = K.rgba(loCol, 0.5); x.lineWidth = 1;
      for (let gx = px + 2; gx < px + pw; gx += 3 + ((gx * 7) % 5)) {
        x.beginPath(); x.moveTo(gx, py + 1); x.lineTo(gx, py + ph - 1); x.stroke();
      }
      x.restore();
      K.mottle(x, px, py, pw, ph, bodyCol, 34, r, 'overlay');
    }

    // ground footprint y where the object stands — wide range so some pieces sit
    // high/far, some low/near the viewer
    const standY = hz + (H - hz) * (0.20 + r() * 0.42);

    // ===================== COMPOSE PER MODE =====================
    if (mode === 'Door') {
      // a freestanding door + frame, ajar, opening onto nothing
      const dw = S * (0.16 + r() * 0.12) * objScale;
      const dh = (H - hz) * (0.52 + r() * 0.26) * objScale;
      const dx0 = objCx - dw / 2, dy0 = standY - dh;
      const fr = dw * (0.07 + r() * 0.06); // frame thickness varies
      castShadow(objCx, standY, dw, dh * (1.4 + r() * 1.4), dw * (0.3 + r() * 0.3));
      // door frame (jamb + lintel)
      panel(dx0 - fr, dy0 - fr, fr, dh + fr, fr * 0.5, pal.obj, pal.objHi, pal.objLo);
      panel(dx0 + dw, dy0 - fr, fr, dh + fr, fr * 0.5, pal.obj, pal.objHi, pal.objLo);
      panel(dx0 - fr, dy0 - fr, dw + fr * 2, fr, fr * 0.5, pal.obj, pal.objHi, pal.objLo);
      // the doorway opens onto MORE of the same world — a mini fog horizon
      // (uncanny: a door in open ground that leads to identical open ground),
      // slightly darker and cooler so it still reads as an interior threshold
      const ihz = dy0 + dh * (0.46 + r() * 0.08); // inner horizon
      const sg2 = x.createLinearGradient(dx0, dy0, dx0, ihz);
      sg2.addColorStop(0, K.mix(pal.bg, pal.ink, 0.22));
      sg2.addColorStop(1, K.mix(pal.hzc, pal.ink, 0.18));
      x.fillStyle = sg2; x.fillRect(dx0, dy0, dw, ihz - dy0 + 1);
      const gg2 = x.createLinearGradient(dx0, ihz, dx0, dy0 + dh);
      gg2.addColorStop(0, K.mix(pal.ground, pal.ink, 0.30));
      gg2.addColorStop(1, K.mix(pal.ground, pal.ink, 0.50));
      x.fillStyle = gg2; x.fillRect(dx0, ihz, dw, dy0 + dh - ihz);
      // a faint inner glow + threshold shadow at the foot
      x.fillStyle = K.rgba(pal.glow, 0.10); x.fillRect(dx0, ihz - dh * 0.06, dw, dh * 0.12);
      x.fillStyle = K.rgba(pal.shadow, 0.30); x.fillRect(dx0, dy0 + dh - dh * 0.05, dw, dh * 0.05);
      // the door panel itself, swung ajar (a parallelogram leaning toward us)
      const open = (0.30 + r() * 0.35) * dw;
      const hingeLeft = dir > 0; // hinge on the shadow side
      x.save();
      x.fillStyle = K.mix(pal.obj, pal.objLo, 0.25);
      x.beginPath();
      if (hingeLeft) {
        x.moveTo(dx0, dy0); x.lineTo(dx0 - open, dy0 + dh * 0.06);
        x.lineTo(dx0 - open, dy0 + dh * 1.0); x.lineTo(dx0, dy0 + dh);
      } else {
        x.moveTo(dx0 + dw, dy0); x.lineTo(dx0 + dw + open, dy0 + dh * 0.06);
        x.lineTo(dx0 + dw + open, dy0 + dh * 1.0); x.lineTo(dx0 + dw, dy0 + dh);
      }
      x.closePath(); x.fill();
      // panel inset lines
      x.strokeStyle = K.rgba(pal.ink, 0.25); x.lineWidth = 2;
      const pxs = hingeLeft ? dx0 - open : dx0 + dw;
      x.strokeRect(pxs + (hingeLeft ? open * 0.18 : open * 0.2), dy0 + dh * 0.10, open * 0.6, dh * 0.34);
      x.strokeRect(pxs + (hingeLeft ? open * 0.18 : open * 0.2), dy0 + dh * 0.52, open * 0.6, dh * 0.34);
      // knob
      x.fillStyle = K.mix(pal.objHi, '#ffffff', 0.2);
      x.beginPath(); x.arc(pxs + (hingeLeft ? open * 0.86 : open * 0.86), dy0 + dh * 0.5, dw * 0.025, 0, 7); x.fill();
      x.restore();

    } else if (mode === 'Curtain') {
      // a single heavy drape hanging from nothing, rippling, hem above the ground
      const cw = S * (0.22 + r() * 0.16) * objScale;
      const ch = (H - hz) * (0.58 + r() * 0.26) * objScale;
      const cx0 = objCx - cw / 2, cy0 = standY - ch;
      castShadow(objCx, standY, cw * 0.9, ch * (1.2 + r() * 1.1), cw * (0.4 + r() * 0.3));
      const folds = 5 + (r() * 8 | 0); // 5..12 folds — drape density varies a lot
      const fw = cw / folds;
      // hanging rail (a thin bar floating)
      x.fillStyle = K.mix(pal.objLo, pal.ink, 0.2);
      x.fillRect(cx0 - cw * 0.04, cy0 - ch * 0.02, cw + cw * 0.08, ch * 0.018);
      for (let i = 0; i < folds; i++) {
        const fx = cx0 + i * fw;
        const phase = noise.noise2(i * 0.6, seed * 0.1);
        const lit = (i / folds);
        // each fold: a vertical lobe shaded by a sine, hem dips with noise
        const hemDip = ch * (0.0 + (Math.sin(i * 1.7 + phase * 3) * 0.04 + 0.04));
        const shade = 0.5 + 0.5 * Math.sin(i * 1.3 + (dir < 0 ? 0 : Math.PI));
        const col = K.mix(K.mix(pal.objLo, pal.objHi, lit), pal.obj, 0.4);
        const fc = K.mix(col, dir < 0 ? pal.objHi : pal.objLo, shade * 0.5);
        x.fillStyle = fc;
        x.beginPath();
        x.moveTo(fx, cy0);
        x.lineTo(fx + fw, cy0);
        x.bezierCurveTo(fx + fw, cy0 + ch * 0.5, fx + fw * 1.1, cy0 + ch - hemDip, fx + fw * 0.5, cy0 + ch - hemDip);
        x.bezierCurveTo(fx - fw * 0.1, cy0 + ch - hemDip, fx, cy0 + ch * 0.5, fx, cy0);
        x.closePath(); x.fill();
        // crease highlight down the lobe
        x.strokeStyle = K.rgba(K.mix(pal.objHi, '#ffffff', 0.25), 0.28 * shade);
        x.lineWidth = fw * 0.10;
        x.beginPath(); x.moveTo(fx + fw * 0.5, cy0 + ch * 0.04); x.lineTo(fx + fw * 0.5, cy0 + ch * 0.86); x.stroke();
        // crease shadow between folds
        x.strokeStyle = K.rgba(pal.shadow, 0.32); x.lineWidth = fw * 0.12;
        x.beginPath(); x.moveTo(fx, cy0 + ch * 0.04); x.lineTo(fx, cy0 + ch * 0.9); x.stroke();
      }
      K.mottle(x, cx0, cy0, cw, ch, pal.obj, 40, r, 'overlay');

    } else if (mode === 'Wardrobe') {
      // a tall standing wardrobe, one door slightly open onto darkness
      const ww = S * (0.20 + r() * 0.13) * objScale;
      const wh = (H - hz) * (0.50 + r() * 0.28) * objScale;
      const wx0 = objCx - ww / 2, wy0 = standY - wh;
      const depth = ww * (0.09 + r() * 0.10);
      castShadow(objCx, standY, ww, wh * (1.3 + r() * 1.2), ww * (0.35 + r() * 0.25));
      // body
      panel(wx0, wy0, ww, wh, depth, pal.obj, pal.objHi, pal.objLo);
      // two door panels
      const mid = wx0 + ww / 2;
      x.strokeStyle = K.rgba(pal.ink, 0.30); x.lineWidth = 2.5;
      x.strokeRect(wx0 + ww * 0.06, wy0 + wh * 0.06, ww * 0.40, wh * 0.86);
      // right door, ajar — a dark wedge of interior
      const ajar = ww * (0.10 + r() * 0.10);
      x.fillStyle = K.mix(pal.ink, '#000000', 0.3);
      x.beginPath();
      x.moveTo(mid, wy0 + wh * 0.06);
      x.lineTo(mid + ajar, wy0 + wh * 0.02);
      x.lineTo(mid + ajar, wy0 + wh * 0.94);
      x.lineTo(mid, wy0 + wh * 0.92);
      x.closePath(); x.fill();
      // the swung door face
      x.fillStyle = K.mix(pal.objLo, pal.obj, 0.4);
      x.beginPath();
      x.moveTo(mid + ajar, wy0 + wh * 0.02);
      x.lineTo(wx0 + ww * 0.94 + ajar * 0.5, wy0 + wh * 0.05);
      x.lineTo(wx0 + ww * 0.94 + ajar * 0.5, wy0 + wh * 0.95);
      x.lineTo(mid + ajar, wy0 + wh * 0.94);
      x.closePath(); x.fill();
      // little feet
      x.fillStyle = pal.objLo;
      x.fillRect(wx0 + ww * 0.04, wy0 + wh, ww * 0.10, wh * 0.03);
      x.fillRect(wx0 + ww * 0.86, wy0 + wh, ww * 0.10, wh * 0.03);
      // knobs
      x.fillStyle = K.mix(pal.objHi, '#ffffff', 0.2);
      x.beginPath(); x.arc(mid - ww * 0.04, wy0 + wh * 0.5, ww * 0.022, 0, 7); x.fill();
      x.beginPath(); x.arc(wx0 + ww * 0.9 + ajar * 0.5, wy0 + wh * 0.5, ww * 0.022, 0, 7); x.fill();

    } else if (mode === 'Standing Mirror') {
      // a cheval mirror on a frame — reflecting the WRONG thing (a far-off door,
      // or sky, while it stands on the ground). The broken law.
      const mw = S * (0.16 + r() * 0.12) * objScale;
      const mh = (H - hz) * (0.48 + r() * 0.26) * objScale;
      const mx0 = objCx - mw / 2, my0 = standY - mh;
      const fr = mw * (0.05 + r() * 0.05);
      castShadow(objCx, standY, mw, mh * (1.3 + r() * 1.1), mw * (0.3 + r() * 0.25));
      // ornate-ish frame (oval-topped rectangle)
      x.fillStyle = K.mix(pal.obj, pal.objLo, 0.2);
      x.beginPath();
      x.moveTo(mx0 - fr, my0 + mh * 0.18);
      x.quadraticCurveTo(mx0 - fr, my0 - fr, objCx, my0 - fr);
      x.quadraticCurveTo(mx0 + mw + fr, my0 - fr, mx0 + mw + fr, my0 + mh * 0.18);
      x.lineTo(mx0 + mw + fr, my0 + mh + fr);
      x.lineTo(mx0 - fr, my0 + mh + fr);
      x.closePath(); x.fill();
      // glass region
      x.save();
      x.beginPath();
      x.moveTo(mx0, my0 + mh * 0.18);
      x.quadraticCurveTo(mx0, my0, objCx, my0);
      x.quadraticCurveTo(mx0 + mw, my0, mx0 + mw, my0 + mh * 0.18);
      x.lineTo(mx0 + mw, my0 + mh);
      x.lineTo(mx0, my0 + mh);
      x.closePath();
      x.clip();
      // glass base wash: a cooler, paler sky than the real scene (wrong reflection)
      const mg = x.createLinearGradient(mx0, my0, mx0, my0 + mh);
      mg.addColorStop(0, K.mix(pal.glow, pal.bg, 0.3));
      mg.addColorStop(0.55, K.mix(pal.hzc, pal.bg, 0.5));
      mg.addColorStop(1, K.mix(pal.ground, pal.hzc, 0.4));
      x.fillStyle = mg; x.fillRect(mx0, my0 - fr, mw, mh + fr * 2);
      // a faint reflected horizon INSIDE the glass — but higher than the real one;
      // its height inside the glass wanders
      const rHz = 0.30 + r() * 0.22;
      x.fillStyle = K.rgba(K.mix(pal.ground, pal.hzc, 0.5), 0.7);
      x.fillRect(mx0, my0 + mh * rHz, mw, mh * (1 - rHz));
      // reflected WRONG thing: a tiny lone door standing inside the glass, with
      // its OWN long shadow raking the OPPOSITE way from the real scene's light.
      // its size + placement inside the glass are seeded so no two match.
      const rdw = mw * (0.24 + r() * 0.22), rdh = mh * (0.30 + r() * 0.18);
      const rdx = mx0 + mw * (0.16 + r() * 0.5) - rdw / 2, rdy = my0 + mh * rHz + mh * (0.02 + r() * 0.08) - rdh;
      // its shadow goes the wrong direction (toward the light, not away)
      x.fillStyle = K.rgba(pal.shadow, 0.34);
      x.beginPath();
      x.moveTo(rdx, rdy + rdh);
      x.lineTo(rdx + rdw, rdy + rdh);
      x.lineTo(rdx + rdw - dir * rdw * 1.6, rdy + rdh + rdh * 0.30);
      x.lineTo(rdx - dir * rdw * 1.6, rdy + rdh + rdh * 0.30);
      x.closePath(); x.fill();
      // the little door, lit on the side facing AWAY from the real light
      x.fillStyle = K.mix(pal.objHi, pal.obj, 0.4);
      x.fillRect(rdx, rdy, rdw, rdh);
      x.fillStyle = K.mix(pal.objLo, pal.ink, 0.3);
      x.fillRect(rdx + rdw * 0.10, rdy + rdh * 0.08, rdw * 0.80, rdh * 0.84);
      x.fillStyle = K.mix(pal.objHi, '#ffffff', 0.2);
      x.beginPath(); x.arc(rdx + rdw * 0.8, rdy + rdh * 0.5, rdw * 0.05, 0, 7); x.fill();
      // glass sheen streak
      x.strokeStyle = K.rgba('#ffffff', 0.12); x.lineWidth = mw * 0.05;
      x.beginPath(); x.moveTo(mx0 + mw * 0.22, my0); x.lineTo(mx0 + mw * 0.5, my0 + mh); x.stroke();
      x.restore();
      // frame highlight
      x.strokeStyle = K.rgba(pal.objHi, 0.5); x.lineWidth = fr * 0.4;
      x.beginPath();
      x.moveTo(mx0 - fr * 0.5, my0 + mh * 0.18);
      x.quadraticCurveTo(mx0 - fr * 0.5, my0 - fr * 0.5, objCx, my0 - fr * 0.5);
      x.stroke();
      // little splayed feet
      x.strokeStyle = K.mix(pal.obj, pal.objLo, 0.2); x.lineWidth = fr * 0.6;
      x.beginPath(); x.moveTo(objCx - mw * 0.1, my0 + mh + fr); x.lineTo(objCx - mw * 0.28, standY); x.stroke();
      x.beginPath(); x.moveTo(objCx + mw * 0.1, my0 + mh + fr); x.lineTo(objCx + mw * 0.28, standY); x.stroke();

    } else if (mode === 'Empty Frame') {
      // a large empty picture frame standing in the ground — but the sky seen
      // THROUGH it is a different, brighter sky than the one around it.
      const fw2 = S * (0.22 + r() * 0.18) * objScale;
      const fh2 = (H - hz) * (0.44 + r() * 0.30) * objScale;
      const fx0 = objCx - fw2 / 2, fy0 = standY - fh2;
      const tk = fw2 * (0.05 + r() * 0.05); // frame thickness varies
      castShadow(objCx, standY, fw2, fh2 * (1.3 + r() * 1.1), fw2 * (0.3 + r() * 0.25));
      // the "other sky" inside the frame: brighter, with a small sun and a cloud
      x.save();
      x.beginPath(); x.rect(fx0 + tk, fy0 + tk, fw2 - tk * 2, fh2 - tk * 2); x.clip();
      const ig = x.createLinearGradient(0, fy0, 0, fy0 + fh2);
      ig.addColorStop(0, K.mix(pal.glow, '#ffffff', 0.25));
      ig.addColorStop(0.6, pal.glow);
      ig.addColorStop(1, K.mix(pal.glow, pal.obj, 0.4));
      x.fillStyle = ig; x.fillRect(fx0, fy0, fw2, fh2);
      // inner sun, offset opposite the real light — concentric warm discs with
      // falling alpha (radial-gradient-to-transparent produces a blue artefact
      // over the bright inner sky, so we stack solid fills instead)
      const sunR = 0.04 + r() * 0.06; // sun size varies
      const isx = objCx - dir * fw2 * (0.10 + r() * 0.24), isy = fy0 + fh2 * (0.18 + r() * 0.28);
      const sunCol = K.mix(pal.glow, '#ffffff', 0.5);
      x.save();
      for (let k = 8; k >= 0; k--) {
        const rr = fw2 * sunR + (fw2 * 0.30) * (k / 8);
        const aa = 0.12 * (1 - k / 9) + 0.04;
        x.fillStyle = K.rgba(K.mix(sunCol, '#ffffff', 1 - k / 8 * 0.6), aa);
        x.beginPath(); x.arc(isx, isy, rr, 0, 7); x.fill();
      }
      x.restore();
      // 1..3 small pale clouds, scattered through the false sky
      const clouds = 1 + (r() * 3 | 0);
      for (let ci = 0; ci < clouds; ci++) {
        x.fillStyle = K.rgba('#ffffff', 0.30 + r() * 0.25);
        const clx = fx0 + fw2 * (0.15 + r() * 0.7), cly = fy0 + fh2 * (0.40 + r() * 0.4);
        const clw = fw2 * (0.09 + r() * 0.12);
        x.beginPath(); x.ellipse(clx, cly, clw, clw * 0.32, 0, 0, 7); x.fill();
        x.beginPath(); x.ellipse(clx + clw * 0.6, cly - clw * 0.12, clw * 0.62, clw * 0.26, 0, 0, 7); x.fill();
      }
      x.restore();
      // the frame (4 bevelled bars)
      panel(fx0, fy0, fw2, tk, tk * 0.5, pal.obj, pal.objHi, pal.objLo);        // top
      panel(fx0, fy0 + fh2 - tk, fw2, tk, tk * 0.5, pal.obj, pal.objHi, pal.objLo); // bottom
      panel(fx0, fy0, tk, fh2, tk * 0.5, pal.obj, pal.objHi, pal.objLo);        // left
      panel(fx0 + fw2 - tk, fy0, tk, fh2, tk * 0.5, pal.obj, pal.objHi, pal.objLo); // right
      // inner bevel line
      x.strokeStyle = K.rgba(pal.ink, 0.3); x.lineWidth = 2;
      x.strokeRect(fx0 + tk, fy0 + tk, fw2 - tk * 2, fh2 - tk * 2);

    } else { // Pair — a small cluster of objects across the ground, in conversation
      const ph = (H - hz) * (0.40 + r() * 0.18) * objScale;
      const pw = S * (0.11 + r() * 0.06) * objScale;
      // both/all cast shadows toward the same light → mismatched lengths (uncanny)
      function littleObject(cx, cStandY, scale) {
        const ow = pw * scale, oh = ph * scale;
        const ox0 = cx - ow / 2, oy0 = cStandY - oh;
        const len = oh * (1.2 + r() * 1.0) * (1 / scale);
        castShadow(cx, cStandY, ow, len, ow * (0.3 + r() * 0.25));
        panel(ox0, oy0, ow, oh, ow * (0.08 + r() * 0.08), pal.obj, pal.objHi, pal.objLo);
        // a single inset rectangle so it reads as a door/cabinet
        x.strokeStyle = K.rgba(pal.ink, 0.28); x.lineWidth = 2;
        x.strokeRect(ox0 + ow * 0.14, oy0 + oh * 0.1, ow * 0.72, oh * 0.8);
        // knob facing roughly inward
        x.fillStyle = K.mix(pal.objHi, '#ffffff', 0.2);
        x.beginPath(); x.arc(ox0 + (cx < W / 2 ? ow * 0.82 : ow * 0.18), oy0 + oh * 0.5, ow * 0.04, 0, 7); x.fill();
      }
      // 2 or 3 members, each with its own x, depth (standY) and scale — a real
      // scatter, not a mirrored pair. Sort by depth so nearer ones draw last.
      const count = r() < 0.62 ? 2 : 3;
      const members = [];
      // spread members across roughly even bands so they reliably read as a
      // cluster, with seeded jitter inside each band
      for (let i = 0; i < count; i++) {
        const band = (i + 0.5) / count;            // 0..1 across the frame
        const cx = W * (0.14 + (band * 0.72) + (r() - 0.5) * 0.18);
        const sY = standY + (r() - 0.5) * (H - hz) * 0.26; // depth stagger
        const sc = 0.66 + r() * 0.60;
        members.push({ cx, sY, sc });
      }
      members.sort((a, b) => a.sY - b.sY);
      for (const m of members) littleObject(m.cx, m.sY, m.sc);
    }

    // ===================== ATMOSPHERE & TEXTURE =====================
    // ground-level fog band sitting the object into the plane
    const fogc = K.mix(pal.hzc, pal.glow, 0.35);
    const fb = x.createLinearGradient(0, standY - H * 0.10, 0, standY + H * 0.08);
    fb.addColorStop(0, K.rgba(fogc, 0));
    fb.addColorStop(0.5, K.rgba(fogc, 0.30));
    fb.addColorStop(1, K.rgba(fogc, 0));
    x.fillStyle = fb; x.fillRect(0, standY - H * 0.12, W, H * 0.22);

    // volumetric haze sheet over everything — the signature air
    const hazeCol = K.mix(pal.hzc, pal.glow, 0.4);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.20, S * 0.85, 'screen');
    // a second, finer haze pass low near the light to make it glow through fog
    K.hazeSheet(x, W, H, noise, pal.glow, 0.10, S * 0.42, 'screen');

    // distant horizon dust to dissolve the ground edge
    const hh = x.createLinearGradient(0, hz - H * 0.04, 0, hz + H * 0.10);
    hh.addColorStop(0, K.rgba(pal.hzc, 0));
    hh.addColorStop(0.5, K.rgba(pal.hzc, 0.55));
    hh.addColorStop(1, K.rgba(pal.hzc, 0));
    x.fillStyle = hh; x.fillRect(0, hz - H * 0.05, W, H * 0.16);

    // film grain + vignette to seat it
    K.grain(x, W, H, 5.0, r);
    K.vignette(x, W, H, pal.name === 'Foglight' || pal.name === 'Violet Dusk' ? 0.42 : 0.32);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    // mirror draw()'s HEADER draw order EXACTLY: pal, mode, fmt, lightSide.
    // (FORCE_PAL still consumes the pick so subsequent reads stay aligned.)
    const palPick = K.pick(PALS, r);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || palPick) : palPick;
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const lightSide = r() < 0.5 ? 'West Light' : 'East Light';
    const f = fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Object: mode, Format: f, Light: lightSide };
  }

  return { name: 'h4_appointment', draw, traits };
})();


export const appointmentTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderAppointment: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const APPOINTMENT_ASPECTS: readonly number[] = [0.782,1];
export const appointmentSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Violet Dusk",
        "Foglight",
        "Bone Antechamber",
        "Ashen Morning",
        "Rose Vestige",
        "Taupe Hour"
      ]
    },
    {
      "name": "Object",
      "values": [
        "Wardrobe",
        "Standing Mirror",
        "Empty Frame",
        "Pair",
        "Door",
        "Curtain"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Portrait",
        "Square"
      ]
    },
    {
      "name": "Light",
      "values": [
        "East Light",
        "West Light"
      ]
    }
  ]
};
