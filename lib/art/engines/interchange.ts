// @ts-nocheck
/*
 * Interchange — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/gen/interchange.js). Layout axis (4-6 structurally distinct
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


/* INTERCHANGE — a surreal transit cathedral.
 * A vast vaulted interchange where nested cathedral arches recede into sodium fog,
 * maglev trains streak through as long-exposure light-ribbons, departure-glyph
 * boards float and dissolve into haze. Read like a Turner painting of a station
 * that never ends. SIX structurally distinct LAYOUTS pick a different picture of
 * the same world: a straight nave, an off-axis arcade, a wide crossing hall, a
 * look UP into the vaulting, a platform-edge close pass, and a far tiny station
 * lost in fog (crushing scale).
 * PALETTE: warm sodium dark — sodium amber / oxblood / deep plum, cream highlights. */
const ENGINE = (function () {
  const K = KIT;

  // Sodium-warm colorways (unchanged palette world).
  const PALS = [
    { name: 'Sodium Nave',   bg: '#1a0f2e', vault: '#241334', lamp: '#ffb02e', trail: '#ffd089', ember: '#6e1326', cream: '#fff0d6' },
    { name: 'Oxblood Dusk',  bg: '#140a1c', vault: '#2a0f1e', lamp: '#ff9a2e', trail: '#ffba6a', ember: '#7a1424', cream: '#ffe6c2' },
    { name: 'Amber Vault',   bg: '#1c1124', vault: '#2e1626', lamp: '#ffbe3d', trail: '#ffe0a0', ember: '#5e1430', cream: '#fff4dc' },
    { name: 'Deep Plum',     bg: '#160a26', vault: '#22102e', lamp: '#ffa83a', trail: '#ffcd86', ember: '#691233', cream: '#ffead0' },
    { name: 'Ember Hall',    bg: '#1e0d1a', vault: '#300f1c', lamp: '#ff8c24', trail: '#ffb060', ember: '#86182c', cream: '#ffdcb0' },
    { name: 'Plum Sodium',   bg: '#120c2a', vault: '#1e1236', lamp: '#ffc24a', trail: '#ffd99a', ember: '#5a1640', cream: '#fff2da' },
  ];

  // Each LAYOUT is a different composition (framing/camera/negative-space).
  const LAYOUTS = ['Nave', 'Arcade', 'Crossing', 'Vaulting', 'Platform', 'Distant'];
  const TIMES = ['Last Train', 'Rush Hour', 'Dead of Night', 'First Light'];
  const FLOWS = ['Streaking', 'Becalmed', 'Crossfire'];

  // Per-layout canvas format (the picture shape changes the read).
  const FMT = {
    Nave:     { W: 1240, H: 1480 },   // tall portrait nave
    Arcade:   { W: 1480, H: 1180 },   // wide, off-axis
    Crossing: { W: 1480, H: 1040 },   // very wide hall
    Vaulting: { W: 1240, H: 1480 },   // tall — looking up
    Platform: { W: 1480, H: 1100 },   // cinemascope-ish, train passing
    Distant:  { W: 1480, H: 1180 },   // wide, crushing scale
  };

  function params(r) {
    const layout = K.pick(LAYOUTS, r);
    return {
      layout,
      pal: K.pick(PALS, r),
      time: K.pick(TIMES, r),
      flow: K.pick(FLOWS, r),
      arches: K.rint(r, 9, 14),
      seedR: r,
    };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Layout: p.layout, Palette: p.pal.name, Hour: p.time, Traffic: p.flow };
  }

  /* ── shared primitives ─────────────────────────────────────────────────── */

  // Pointed cathedral arch outline as a path (gothic: legs → springline → apex).
  function archPath(x, cx, top, halfW, springY, baseY) {
    x.moveTo(cx - halfW, baseY);
    x.lineTo(cx - halfW, springY);
    x.quadraticCurveTo(cx - halfW, top + (springY - top) * 0.18, cx, top);
    x.quadraticCurveTo(cx + halfW, top + (springY - top) * 0.18, cx + halfW, springY);
    x.lineTo(cx + halfW, baseY);
  }

  // Perspective geometry for one arch at depth d (0 = far/at-VP, 1 = near/frame).
  // skew lets the VP sit off to a side (used by Arcade); aspV scales vertical drop.
  function archAt(d, VPX, VPY, W, H, opt) {
    opt = opt || {};
    const wScale = opt.wScale == null ? 1 : opt.wScale;
    const s = Math.pow(d, 1.55);
    const halfW = (W * 0.045 + s * W * 0.70) * wScale;
    const apexTop = VPY - (H * 0.035 + s * H * 0.56) * (opt.upScale || 1);
    const springY = VPY - (H * 0.005 + s * H * 0.16) * (opt.upScale || 1);
    const baseY = VPY + (H * 0.015 + s * (H - VPY) * 1.25) * (opt.downScale || 1);
    const cx = VPX + (opt.skew ? opt.skew * s * W : 0);
    return { d, s, halfW, apexTop, springY, baseY, cx };
  }

  // Base nave gradient — dark ground rising to a hazy lit vanishing core.
  function naveGradient(x, P, W, H, VPY, dawn, night) {
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg, '#000', 0.34));
    g.addColorStop(K.clamp(VPY / H - 0.10, 0.04, 0.9), K.mix(P.bg, P.vault, 0.55));
    g.addColorStop(K.clamp(VPY / H, 0.05, 0.95), K.mix(P.vault, P.lamp, dawn ? 0.32 : night ? 0.10 : 0.22));
    g.addColorStop(K.clamp(VPY / H + 0.12, 0.1, 0.98), K.mix(P.bg, P.ember, 0.32));
    g.addColorStop(1, K.mix(P.bg, '#000', 0.20));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }

  // Draw a tunnel of nested receding arch bands far→near around (VPX,VPY).
  function drawArchTunnel(x, P, W, H, VPX, VPY, N, opt, dawn, night, lampGlow) {
    opt = opt || {};
    const geo = [];
    for (let i = 0; i < N; i++) geo.push(archAt((i + 0.6) / N, VPX, VPY, W, H, opt));

    K.bloom(x, geo[0].cx, VPY, Math.min(W, H) * (dawn ? 0.40 : 0.30), P.lamp, lampGlow);
    K.bloom(x, geo[0].cx, VPY, Math.min(W, H) * 0.13, P.cream, night ? 0.10 : 0.22);

    for (let i = N - 1; i >= 0; i--) {
      const A = geo[i];
      const inner = geo[i - 1];
      const depth = A.d;
      const tone = depth < 0.5
        ? K.mix(K.mix(P.vault, P.lamp, 0.30), P.bg, 0.35)
        : K.mix(P.vault, '#000', 0.35 + depth * 0.4);
      const aFill = 0.55 + depth * 0.40;

      x.save();
      x.beginPath();
      archPath(x, A.cx, A.apexTop, A.halfW, A.springY, A.baseY);
      if (inner) {
        archPath(x, inner.cx, inner.apexTop, inner.halfW, inner.springY, inner.baseY + 1);
      } else {
        const oh = A.halfW * 0.30, ot = A.apexTop + (A.baseY - A.apexTop) * 0.16;
        const os = A.springY + (A.baseY - A.springY) * 0.10;
        archPath(x, A.cx, ot, oh, os, A.baseY + 1);
      }
      x.closePath();
      const bgr = x.createRadialGradient(A.cx, VPY, 0, A.cx, VPY, A.halfW * 1.6);
      bgr.addColorStop(0, K.rgba(K.mix(tone, P.lamp, 0.30 * (1 - depth) + 0.06), aFill));
      bgr.addColorStop(0.55, K.rgba(tone, aFill));
      bgr.addColorStop(1, K.rgba(K.mix(tone, '#000', 0.4), Math.min(1, aFill + 0.12)));
      x.fillStyle = bgr;
      x.fill('evenodd');

      x.beginPath();
      archPath(x, A.cx, A.apexTop, A.halfW, A.springY, A.baseY);
      x.strokeStyle = K.rgba(K.mix(P.lamp, P.cream, 0.25), 0.05 + depth * 0.32);
      x.lineWidth = 0.7 + depth * 2.0;
      x.stroke();
      if (depth > 0.25) {
        x.strokeStyle = K.rgba(P.ember, 0.04 + depth * 0.14);
        x.lineWidth = 0.6 + depth;
        x.stroke();
      }
      x.restore();

      if (depth < 0.6 && i % 2 === 0) {
        x.save();
        x.globalCompositeOperation = 'screen';
        const veilR = Math.max(W, H) * (0.5 - depth * 0.3);
        const vg = x.createRadialGradient(A.cx, VPY, 0, A.cx, VPY, veilR);
        const vc = K.mix(P.vault, P.lamp, 0.18);
        vg.addColorStop(0, K.rgba(vc, (1 - depth) * 0.16 + 0.03));
        vg.addColorStop(1, K.rgba(vc, 0));
        x.fillStyle = vg; x.fillRect(0, 0, W, H);
        x.restore();
      }
    }
    return geo;
  }

  // Converging rail fan + reflective floor light pool around a VP.
  function drawFloor(x, P, W, H, VPX, VPY, night) {
    x.save();
    x.globalCompositeOperation = 'screen';
    const railN = 6;
    for (let i = 0; i <= railN; i++) {
      const t = i / railN;
      const ex = VPX + (t - 0.5) * W * 1.9;
      const cen = 1 - Math.abs(t - 0.5) * 2;
      x.strokeStyle = K.rgba(K.mix(P.vault, P.lamp, 0.5), 0.02 + 0.035 * cen);
      x.lineWidth = 0.8 + cen * 1.2;
      x.beginPath(); x.moveTo(VPX, VPY); x.lineTo(ex, H + 4); x.stroke();
    }
    x.restore();
    x.save();
    x.globalCompositeOperation = 'lighter';
    const rg = x.createRadialGradient(VPX, VPY + (H - VPY) * 0.10, 0,
      VPX, VPY + (H - VPY) * 0.10, Math.max(W, H) * 0.60);
    rg.addColorStop(0, K.rgba(P.lamp, night ? 0.08 : 0.16));
    rg.addColorStop(0.4, K.rgba(P.ember, 0.07));
    rg.addColorStop(1, K.rgba(P.bg, 0));
    x.fillStyle = rg;
    x.fillRect(0, VPY, W, H - VPY);
    const platY = H * 0.80;
    const pg = x.createLinearGradient(0, platY, 0, H);
    pg.addColorStop(0, K.rgba(K.mix(P.ember, P.lamp, 0.4), night ? 0.05 : 0.10));
    pg.addColorStop(0.55, K.rgba(P.ember, night ? 0.06 : 0.11));
    pg.addColorStop(1, K.rgba(K.mix(P.bg, P.ember, 0.5), 0.05));
    x.fillStyle = pg; x.fillRect(0, platY, W, H - platY);
    x.restore();
  }

  // Sodium-vapour lamps in converging rows down a nave toward (VPX,VPY).
  function drawLamps(x, P, W, H, VPX, VPY, r, spreadW) {
    x.save();
    x.globalCompositeOperation = 'lighter';
    const lampRows = K.rint(r, 6, 9);
    for (let i = 0; i < lampRows; i++) {
      const t = Math.pow((i + 1) / (lampRows + 1), 1.7);
      const ly = VPY - (H * 0.015 + t * H * 0.34);
      const rad = 3 + t * 30;
      for (const side of [-1, 1]) {
        const lx = VPX + side * (t * (spreadW || W * 0.32));
        K.bloom(x, lx, ly, rad, P.lamp, 0.5 - t * 0.18);
        x.fillStyle = K.rgba(P.cream, 0.65 - t * 0.32);
        x.beginPath(); x.arc(lx, ly, Math.max(0.6, rad * 0.10), 0, 7); x.fill();
      }
    }
    x.restore();
  }

  // One long-exposure maglev light-ribbon along an arbitrary swept path.
  // pathFn(t)->[x,y,widthScale]; col base; railH thickness.
  function drawRibbon(x, P, pathFn, segs, railH, col, becalmed, noise, salt) {
    const pts = [];
    for (let sI = 0; sI <= segs; sI++) {
      const t = sI / segs;
      const pr = pathFn(t);
      const sway = noise.fbm(salt * 3.7 + t * 4, salt * 0.013 + 7, 3) * railH * 0.30;
      pts.push([pr[0], pr[1] + sway, pr[2] == null ? 1 : pr[2]]);
    }
    const strands = [-0.5, 0, 0.5];
    for (const sOff of strands) {
      for (let pass = 0; pass < 2; pass++) {
        x.beginPath();
        for (let sI = 0; sI < pts.length; sI++) {
          const [px, py, ws] = pts[sI];
          const yo = py + sOff * railH * 0.5 * ws;
          if (sI === 0) x.moveTo(px, yo); else x.lineTo(px, yo);
        }
        const wdt = (pass === 0 ? railH * 0.9 : railH * 0.22);
        const al = (pass === 0 ? 0.045 : 0.16) * (sOff === 0 ? 1 : 0.6) * (becalmed ? 0.55 : 1);
        x.strokeStyle = K.rgba(pass === 0 ? col : K.mix(col, P.cream, 0.4), al);
        x.lineWidth = wdt; x.lineCap = 'round'; x.lineJoin = 'round';
        x.stroke();
      }
    }
    const head = pts[pts.length - 1];
    K.bloom(x, head[0], head[1], railH * 1.5, K.mix(col, P.cream, 0.5), 0.5);
    const mid = pts[Math.floor(pts.length * 0.55)];
    K.bloom(x, mid[0], mid[1], railH * 0.7, col, 0.35);
    for (let sI = 2; sI < pts.length - 1; sI += 2) {
      const [px, py, ws] = pts[sI];
      x.fillStyle = K.rgba(K.mix(col, P.cream, 0.3), 0.4 * (becalmed ? 0.6 : 1));
      const s = railH * 0.18 * ws;
      x.fillRect(px - s * 0.5, py - s * 0.4, s, s * 0.7);
    }
  }

  // Floating departure-glyph boards over the platform near (VPX,VPY).
  function drawBoards(x, P, W, H, VPX, VPY, r, count, spreadX) {
    x.save();
    for (let i = 0; i < count; i++) {
      const dt = Math.pow(0.06 + r() * 0.94, 1.3);
      const side = r() < 0.5 ? -1 : 1;
      const bx = VPX + side * (0.05 + dt) * (spreadX || W) * (0.06 + r() * 0.26);
      const by = VPY - (H * 0.06) - dt * H * 0.16 + (r() - 0.5) * H * 0.05;
      const bw = (7 + dt * 78) * (0.7 + r() * 0.6);
      const bh = bw * (0.30 + r() * 0.26);
      x.globalCompositeOperation = 'source-over';
      x.fillStyle = K.rgba(K.mix(P.bg, P.ember, 0.4), 0.45 + dt * 0.42);
      x.fillRect(bx - bw / 2, by - bh / 2, bw, bh);
      x.strokeStyle = K.rgba(P.lamp, 0.18 + dt * 0.4);
      x.lineWidth = 0.6 + dt; x.strokeRect(bx - bw / 2, by - bh / 2, bw, bh);
      x.globalCompositeOperation = 'lighter';
      const rows = K.rint(r, 2, 4);
      for (let rr = 0; rr < rows; rr++) {
        const ry = by - bh / 2 + (rr + 0.5) * (bh / rows);
        let cxp = bx - bw / 2 + bw * 0.08;
        while (cxp < bx + bw / 2 - bw * 0.08) {
          const gw = bw * (0.04 + r() * 0.13);
          if (r() < 0.72) {
            const gc = r() < 0.22 ? P.cream : P.lamp;
            x.fillStyle = K.rgba(gc, (0.3 + dt * 0.5) * (0.5 + r() * 0.5));
            x.fillRect(cxp, ry - bh * 0.06, gw, bh * 0.12);
          }
          cxp += gw + bw * 0.04;
        }
      }
      K.bloom(x, bx, by, bw * 0.85, P.lamp, 0.08 + dt * 0.13);
      x.globalCompositeOperation = 'screen';
      x.strokeStyle = K.rgba(P.lamp, 0.05 + dt * 0.10);
      x.lineWidth = 0.6;
      x.beginPath(); x.moveTo(bx, by - bh / 2);
      x.lineTo(bx + (r() - 0.5) * bw * 0.2, by - bh / 2 - (18 + dt * 70)); x.stroke();
    }
    x.restore();
  }

  // One platform-crowd silhouette at (fx,fy) with body height fh.
  function drawFigure(x, P, fx, fy, fh, fw, alpha) {
    const col = K.rgba(K.mix(P.bg, '#000', 0.62), alpha);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = col; x.lineCap = 'round'; x.strokeStyle = col;
    x.lineWidth = fw * 0.34;
    x.beginPath();
    x.moveTo(fx - fw * 0.16, fy - fh * 0.42); x.lineTo(fx - fw * 0.22, fy);
    x.moveTo(fx + fw * 0.16, fy - fh * 0.42); x.lineTo(fx + fw * 0.22, fy);
    x.stroke();
    x.beginPath();
    x.moveTo(fx - fw * 0.40, fy - fh * 0.40);
    x.lineTo(fx - fw * 0.30, fy - fh * 0.78);
    x.quadraticCurveTo(fx, fy - fh * 0.86, fx + fw * 0.30, fy - fh * 0.78);
    x.lineTo(fx + fw * 0.40, fy - fh * 0.40);
    x.closePath(); x.fill();
    x.lineWidth = fw * 0.26;
    x.beginPath();
    x.moveTo(fx - fw * 0.34, fy - fh * 0.72); x.lineTo(fx - fw * 0.42, fy - fh * 0.40);
    x.moveTo(fx + fw * 0.34, fy - fh * 0.72); x.lineTo(fx + fw * 0.42, fy - fh * 0.40);
    x.stroke();
    x.beginPath(); x.arc(fx, fy - fh * 0.90, fw * 0.27, 0, 7); x.fill();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.lamp, 0.13);
    x.lineWidth = 1;
    x.beginPath(); x.moveTo(fx + fw * 0.32, fy - fh * 0.78); x.lineTo(fx + fw * 0.42, fy - fh * 0.42); x.stroke();
  }

  // Crowd strung along a lit platform band low in the frame.
  function drawCrowd(x, P, W, H, r, bandY, density) {
    x.save();
    const crowd = density;
    for (let i = 0; i < crowd; i++) {
      const fx = r() * W;
      const giant = r() < 0.07;
      const pd = r();
      const base = giant ? 0.30 + r() * 0.10 : 0.05 + pd * 0.085;
      const fh = H * base;
      const fy = bandY + pd * (H - bandY) * 0.9;
      const fw = fh * (0.16 + r() * 0.05);
      drawFigure(x, P, fx, fy, fh, fw, giant ? 0.5 : 0.9);
    }
    x.restore();
  }

  // Shared atmosphere finish.
  function finish(x, P, W, H, noise, seed, r, flow, night, vig) {
    K.hazeSheet(x, W, H, noise, K.mix(P.lamp, P.cream, 0.2), night ? 0.08 : 0.12, 360, 'screen');
    x.save();
    x.globalCompositeOperation = 'screen';
    const fogG = x.createLinearGradient(0, H * 0.56, 0, H);
    fogG.addColorStop(0, K.rgba(P.vault, 0));
    fogG.addColorStop(1, K.rgba(K.mix(P.vault, P.lamp, 0.16), 0.24));
    x.fillStyle = fogG; x.fillRect(0, H * 0.56, W, H * 0.44);
    x.restore();
    if (flow !== 'Becalmed') K.chromaSplit(x, W, H, 1);
    K.grain(x, W, H, 480, r);
    K.vignette(x, W, H, vig == null ? 0.52 : vig);
  }

  /* ── LAYOUTS ────────────────────────────────────────────────────────────── */

  // 1. NAVE — one-point straight down the nave (the classic head-on tunnel).
  function layoutNave(ctx) {
    const { x, P, W, H, r, noise, seed, night, dawn, lampGlow, flow } = ctx;
    const VPX = W * (0.42 + r() * 0.16), VPY = H * (0.40 + r() * 0.10);
    naveGradient(x, P, W, H, VPY, dawn, night);
    drawArchTunnel(x, P, W, H, VPX, VPY, ctx.arches, {}, dawn, night, lampGlow);
    drawFloor(x, P, W, H, VPX, VPY, night);
    drawLamps(x, P, W, H, VPX, VPY, r, W * 0.32);
    // a few trains sweeping across at depth
    x.save(); x.globalCompositeOperation = 'lighter';
    const n = flow === 'Crossfire' ? K.rint(r, 4, 6) : flow === 'Becalmed' ? 2 : K.rint(r, 3, 5);
    for (let i = 0; i < n; i++) {
      const dep = 0.18 + Math.pow(r(), 1.2) * 0.74;
      const trackY = VPY + Math.pow(dep, 1.5) * (H - VPY) * 0.78;
      const railH = 8 + dep * dep * 70;
      const enter = r() < 0.5 ? -1 : 1;
      const span = W * (0.30 + dep * 0.55);
      const x0 = enter < 0 ? VPX - span : VPX + span * 0.15;
      const x1 = enter < 0 ? VPX + span * 0.15 : VPX + span;
      const col = r() < 0.2 ? P.ember : (r() < 0.5 ? P.trail : P.cream);
      drawRibbon(x, P, (t) => {
        const xx = x0 + (x1 - x0) * t;
        const persp = 1 - Math.min(1, Math.abs(xx - VPX) / (W * 0.55));
        return [xx, trackY - persp * railH * 1.4, 0.45 + persp * 0.55];
      }, 28, railH, col, flow === 'Becalmed', noise, i);
    }
    x.restore();
    drawBoards(x, P, W, H, VPX, VPY, r, K.rint(r, 9, 15), W);
    drawCrowd(x, P, W, H, r, H * 0.84, K.rint(r, 16, 26));
    finish(x, P, W, H, noise, seed, r, flow, night);
  }

  // 2. ARCADE — off-axis diagonal: the VP is pushed to a corner, arches march
  //    away at an angle. Big triangular negative-space sky on one side.
  function layoutArcade(ctx) {
    const { x, P, W, H, r, noise, seed, night, dawn, lampGlow, flow } = ctx;
    const leftSide = r() < 0.5;
    const VPX = leftSide ? W * (0.16 + r() * 0.08) : W * (0.76 + r() * 0.08);
    const VPY = H * (0.34 + r() * 0.10);
    naveGradient(x, P, W, H, VPY, dawn, night);
    const skew = (leftSide ? 1 : -1) * (0.10 + r() * 0.05);
    drawArchTunnel(x, P, W, H, VPX, VPY, ctx.arches, { skew, wScale: 0.78 }, dawn, night, lampGlow);
    drawFloor(x, P, W, H, VPX, VPY, night);
    drawLamps(x, P, W, H, VPX, VPY, r, W * 0.22);
    // trains running diagonally toward the corner VP
    x.save(); x.globalCompositeOperation = 'lighter';
    const n = flow === 'Crossfire' ? K.rint(r, 3, 5) : flow === 'Becalmed' ? 2 : K.rint(r, 2, 4);
    for (let i = 0; i < n; i++) {
      const dep = 0.22 + Math.pow(r(), 1.1) * 0.7;
      const railH = 8 + dep * dep * 64;
      const startX = leftSide ? W * (0.9 + r() * 0.2) : W * (-0.1 - r() * 0.2);
      const startY = VPY + (H - VPY) * (0.3 + r() * 0.5);
      const col = r() < 0.2 ? P.ember : (r() < 0.5 ? P.trail : P.cream);
      drawRibbon(x, P, (t) => {
        const xx = startX + (VPX - startX) * Math.pow(t, 0.85);
        const yy = startY + (VPY - startY) * Math.pow(t, 1.3);
        return [xx, yy, 1 - t * 0.6];
      }, 30, railH, col, flow === 'Becalmed', noise, i + 11);
    }
    x.restore();
    drawBoards(x, P, W, H, VPX, VPY, r, K.rint(r, 7, 12), W * 0.7);
    drawCrowd(x, P, W, H, r, H * 0.82, K.rint(r, 12, 20));
    finish(x, P, W, H, noise, seed, r, flow, night);
  }

  // 3. CROSSING — a vast WIDE hall, low arches framing the top, crossing
  //    light-trains as the HERO sweeping full width across mid-frame.
  function layoutCrossing(ctx) {
    const { x, P, W, H, r, noise, seed, night, dawn, lampGlow, flow } = ctx;
    const VPX = W * (0.40 + r() * 0.20), VPY = H * (0.30 + r() * 0.08);
    naveGradient(x, P, W, H, VPY, dawn, night);
    // a shallow, wide arch tunnel that fills the top third only
    drawArchTunnel(x, P, W, H, VPX, VPY, Math.min(8, ctx.arches),
      { wScale: 1.25, upScale: 0.55, downScale: 0.4 }, dawn, night, lampGlow);
    // big open floor below
    x.save(); x.globalCompositeOperation = 'lighter';
    const rg = x.createRadialGradient(VPX, H * 0.55, 0, VPX, H * 0.55, Math.max(W, H) * 0.7);
    rg.addColorStop(0, K.rgba(P.lamp, night ? 0.1 : 0.18));
    rg.addColorStop(0.5, K.rgba(P.ember, 0.08));
    rg.addColorStop(1, K.rgba(P.bg, 0));
    x.fillStyle = rg; x.fillRect(0, H * 0.3, W, H * 0.7);
    x.restore();
    // HERO: many crossing trains at several heights, full-width, blazing
    x.save(); x.globalCompositeOperation = 'lighter';
    const lanes = K.rint(r, 5, 8);
    for (let i = 0; i < lanes; i++) {
      const ly = H * (0.40 + (i / lanes) * 0.45) + (r() - 0.5) * H * 0.04;
      const dep = K.clamp((ly / H - 0.38) / 0.5, 0.1, 1);
      const railH = 10 + dep * dep * 80;
      const dir = r() < 0.5 ? 1 : -1;
      const bow = (r() - 0.5) * H * 0.06;
      const col = r() < 0.22 ? P.ember : (r() < 0.5 ? P.trail : P.cream);
      drawRibbon(x, P, (t) => {
        const xx = dir > 0 ? W * (-0.1) + W * 1.2 * t : W * 1.1 - W * 1.2 * t;
        const yy = ly + Math.sin(t * Math.PI) * bow;
        return [xx, yy, 0.7 + dep * 0.3];
      }, 34, railH, col, flow === 'Becalmed', noise, i + 21);
    }
    x.restore();
    drawBoards(x, P, W, H, VPX, VPY, r, K.rint(r, 8, 13), W * 1.1);
    // sparse crowd along the very bottom — they're tiny under the crossing trains
    drawCrowd(x, P, W, H, r, H * 0.88, K.rint(r, 10, 18));
    finish(x, P, W, H, noise, seed, r, flow, night);
  }

  // 4. VAULTING — looking UP into the ceiling ribs converging at a high apex,
  //    platforms a thin sliver at the bottom. Crushing overhead scale.
  function layoutVaulting(ctx) {
    const { x, P, W, H, r, noise, seed, night, dawn, lampGlow, flow } = ctx;
    const APX = W * (0.42 + r() * 0.16), APY = H * (0.20 + r() * 0.12);
    // sky/ceiling gradient: lit apex up high, darker toward the platform sliver
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg, '#000', 0.28));
    g.addColorStop(K.clamp(APY / H, 0.1, 0.4), K.mix(P.vault, P.lamp, dawn ? 0.34 : night ? 0.12 : 0.24));
    g.addColorStop(0.66, K.mix(P.bg, P.vault, 0.5));
    g.addColorStop(1, K.mix(P.bg, '#000', 0.3));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // glowing oculus at the apex — kept TIGHT so the rib architecture reads.
    K.bloom(x, APX, APY, Math.min(W, H) * (dawn ? 0.22 : 0.17), P.lamp, lampGlow);
    K.bloom(x, APX, APY, Math.min(W, H) * 0.07, P.cream, night ? 0.14 : 0.30);

    // GOTHIC FAN-VAULTING: a ring of stone PIERS around the rim; from each pier
    // springs a sheaf of ribs that fan inward and meet near the apex. Reads as
    // architecture (bays + webbing), not a uniform sunburst.
    const reach = Math.max(W, H) * 0.62;        // pier ring radius
    const ay = 0.80;                            // vertical squash (oval looking-up)
    const bays = K.rint(r, 6, 9);               // number of vault bays
    const baseAng = r() * Math.PI * 2;
    const pierR = reach * (0.96 + r() * 0.18);  // piers slightly outside the web
    const ribCol = K.mix(P.vault, P.lamp, 0.22);
    function pt(ang, rad) { return [APX + Math.cos(ang) * rad, APY + Math.sin(ang) * rad * ay]; }
    // rib from apex region out to (ang,rad), bowing so it arcs like a vault rib
    function rib(ang, rad, w, a, bow) {
      const [ex, ey] = pt(ang, rad);
      const mAng = ang, mRad = rad * 0.5;
      const mx = APX + Math.cos(mAng) * mRad - Math.cos(ang) * (bow || 0);
      const my = APY + Math.sin(mAng) * mRad * ay - reach * 0.05 - Math.sin(ang) * (bow || 0) * ay;
      const grad = x.createLinearGradient(APX, APY, ex, ey);
      grad.addColorStop(0, K.rgba(K.mix(P.lamp, P.cream, 0.4), a));
      grad.addColorStop(0.45, K.rgba(K.mix(ribCol, P.lamp, 0.25), a * 0.85));
      grad.addColorStop(1, K.rgba(K.mix(P.vault, '#000', 0.4), a * 0.45));
      x.strokeStyle = grad; x.lineWidth = w; x.lineCap = 'round';
      x.beginPath(); x.moveTo(APX, APY); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
    }
    // dark masonry wedges between bays (shadow cells) — laid first so ribs sit on top
    x.save();
    for (let b = 0; b < bays; b++) {
      const ca = baseAng + ((b + 0.5) / bays) * Math.PI * 2;
      const span = (Math.PI * 2 / bays) * 0.5;
      const [a1x, a1y] = pt(ca - span * 0.7, pierR * 1.02);
      const [a2x, a2y] = pt(ca + span * 0.7, pierR * 1.02);
      const wg = x.createRadialGradient(APX, APY, reach * 0.08, APX, APY, reach);
      wg.addColorStop(0, K.rgba(K.mix(P.vault, '#000', 0.5), 0));
      wg.addColorStop(1, K.rgba(K.mix(P.bg, '#000', 0.4), 0.34));
      x.fillStyle = wg;
      x.beginPath(); x.moveTo(APX, APY); x.lineTo(a1x, a1y);
      const [mx, my] = pt(ca, pierR * 1.1);
      x.quadraticCurveTo(mx, my, a2x, a2y); x.closePath(); x.fill();
    }
    x.restore();
    x.save();
    for (let b = 0; b < bays; b++) {
      const ca = baseAng + (b / bays) * Math.PI * 2;
      const span = (Math.PI * 2 / bays) * 0.5;
      // main bay rib (the springer) — heaviest
      rib(ca, pierR, 3.0 + r() * 1.8, 0.72, reach * 0.08);
      // a fan of lighter ribs splaying out within the bay
      const fan = K.rint(r, 3, 5);
      for (let f = 1; f <= fan; f++) {
        const off = (f / (fan + 1) - 0.5) * 2 * span;
        rib(ca + off, pierR * (0.9 + r() * 0.16), 1.3 + r() * 1.2, 0.46 + r() * 0.14, reach * (0.05 + r() * 0.05));
      }
      // a stone pier dab at the springline (rim) + ember underglow
      const [px, py] = pt(ca, pierR);
      x.fillStyle = K.rgba(K.mix(P.vault, '#000', 0.3), 0.5);
      x.beginPath(); x.ellipse(px, py, 7 + r() * 6, 14 + r() * 8, 0, 0, 7); x.fill();
    }
    x.restore();

    // transverse WEB ribs: a few concentric arc-courses tying the bays together
    // (not full ellipses — broken arcs, so it reads as masonry not a target).
    x.save();
    x.globalCompositeOperation = 'screen';
    const courses = K.rint(r, 3, 5);
    for (let c = 1; c <= courses; c++) {
      const rr = (c / (courses + 0.4)) * reach;
      const segs = bays * 2;
      for (let s = 0; s < segs; s++) {
        if (r() < 0.18) continue;               // some web cells left dark
        const a0 = baseAng + (s / segs) * Math.PI * 2;
        const a1 = a0 + (Math.PI * 2 / segs) * 0.86;
        const [sx, sy] = pt(a0, rr), [ex, ey] = pt(a1, rr);
        const mid = (a0 + a1) / 2;
        const [mx, my] = pt(mid, rr * 1.06);    // bow outward slightly
        x.strokeStyle = K.rgba(K.mix(P.lamp, P.cream, 0.3), 0.10 + (1 - c / courses) * 0.16);
        x.lineWidth = 1.0 + (1 - c / courses) * 1.8;
        x.beginPath(); x.moveTo(sx, sy); x.quadraticCurveTo(mx, my, ex, ey); x.stroke();
      }
    }
    x.restore();
    // central boss ring around the oculus
    x.save();
    x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(K.mix(P.lamp, P.cream, 0.4), 0.18);
    x.lineWidth = 2;
    x.beginPath(); x.ellipse(APX, APY, reach * 0.16, reach * 0.16 * ay, 0, 0, 7); x.stroke();
    x.restore();
    // hanging lamps drifting up toward the apex
    x.save(); x.globalCompositeOperation = 'lighter';
    const hl = K.rint(r, 7, 12);
    for (let i = 0; i < hl; i++) {
      const ang = r() * Math.PI * 2;
      const rad = Math.max(W, H) * (0.12 + r() * 0.42);
      const lx = APX + Math.cos(ang) * rad, ly = APY + Math.sin(ang) * rad * 0.78;
      K.bloom(x, lx, ly, 6 + r() * 22, P.lamp, 0.4);
      x.fillStyle = K.rgba(P.cream, 0.5);
      x.beginPath(); x.arc(lx, ly, 1.2 + r() * 2, 0, 7); x.fill();
    }
    x.restore();
    // platform sliver at the very bottom — tiny crowd dwarfed by the vault
    x.save();
    x.globalCompositeOperation = 'source-over';
    const pg = x.createLinearGradient(0, H * 0.86, 0, H);
    pg.addColorStop(0, K.rgba(K.mix(P.ember, P.lamp, 0.35), 0.12));
    pg.addColorStop(1, K.rgba(K.mix(P.bg, P.ember, 0.5), 0.18));
    x.fillStyle = pg; x.fillRect(0, H * 0.86, W, H * 0.14);
    x.restore();
    drawCrowd(x, P, W, H, r, H * 0.92, K.rint(r, 14, 22));
    finish(x, P, W, H, noise, seed, r, flow, night, 0.46);
  }

  // 5. PLATFORM — close platform-edge view: a single huge train blurs past
  //    full-bleed across the frame, big foreground figures, shallow depth.
  function layoutPlatform(ctx) {
    const { x, P, W, H, r, noise, seed, night, dawn, lampGlow, flow } = ctx;
    // low horizon: platform fills lower frame, train fills the upper-mid band
    const horiz = H * (0.62 + r() * 0.08);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg, P.vault, 0.5));
    g.addColorStop(0.42, K.mix(P.vault, P.lamp, dawn ? 0.22 : night ? 0.08 : 0.16));
    g.addColorStop(K.clamp(horiz / H, 0.4, 0.85), K.mix(P.bg, P.ember, 0.34));
    g.addColorStop(1, K.mix(P.bg, '#000', 0.22));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // far wall glow behind the train
    K.bloom(x, W * (0.3 + r() * 0.4), horiz - H * 0.18, Math.min(W, H) * 0.5, P.lamp, lampGlow);
    // shallow arches receding along the far wall (a thin band, sideways)
    x.save();
    const wallArch = K.rint(r, 5, 8);
    for (let i = 0; i < wallArch; i++) {
      const ax = W * (0.05 + (i / wallArch) * 0.95);
      const aw = W * 0.06;
      const top = horiz - H * (0.30 + (i % 2) * 0.02);
      x.beginPath();
      archPath(x, ax, top, aw, horiz - H * 0.10, horiz);
      x.strokeStyle = K.rgba(K.mix(P.vault, P.lamp, 0.3), 0.18);
      x.lineWidth = 1.4; x.stroke();
      x.fillStyle = K.rgba(K.mix(P.bg, P.ember, 0.5), 0.3);
      x.fill();
    }
    x.restore();
    // THE TRAIN: one massive horizontal motion-blur ribbon spanning full width,
    // sitting just above the platform edge. Carriage windows smear into a band.
    const dir = r() < 0.5 ? 1 : -1;
    const trainY = horiz - H * (0.10 + r() * 0.06);
    const railH = H * (0.16 + r() * 0.08);
    x.save(); x.globalCompositeOperation = 'lighter';
    // body slab (dark mass) under the light band
    x.globalCompositeOperation = 'source-over';
    const bodyG = x.createLinearGradient(0, trainY - railH * 0.6, 0, trainY + railH * 0.6);
    bodyG.addColorStop(0, K.rgba(K.mix(P.vault, '#000', 0.4), 0.7));
    bodyG.addColorStop(0.5, K.rgba(K.mix(P.bg, P.ember, 0.3), 0.78));
    bodyG.addColorStop(1, K.rgba(K.mix(P.vault, '#000', 0.55), 0.7));
    x.fillStyle = bodyG; x.fillRect(0, trainY - railH * 0.55, W, railH * 1.1);
    x.globalCompositeOperation = 'lighter';
    const col = r() < 0.4 ? P.trail : P.cream;
    // window light-band: long horizontal blur with bright dashes (carriage lights)
    drawRibbon(x, P, (t) => {
      const xx = dir > 0 ? -W * 0.1 + W * 1.2 * t : W * 1.1 - W * 1.2 * t;
      return [xx, trainY, 1];
    }, 40, railH * 0.5, col, flow === 'Becalmed', noise, 31);
    // a second hotter thin streak for speed
    drawRibbon(x, P, (t) => {
      const xx = dir > 0 ? -W * 0.1 + W * 1.2 * t : W * 1.1 - W * 1.2 * t;
      return [xx, trainY + railH * 0.12, 1];
    }, 40, railH * 0.16, P.cream, flow === 'Becalmed', noise, 32);
    // motion-smear streaks trailing behind
    for (let i = 0; i < 30; i++) {
      const yy = trainY + (r() - 0.5) * railH;
      const sx = r() * W;
      const len = W * (0.05 + r() * 0.2) * dir;
      x.strokeStyle = K.rgba(K.mix(col, P.cream, 0.3), 0.04 + r() * 0.06);
      x.lineWidth = 0.5 + r() * 1.5;
      x.beginPath(); x.moveTo(sx, yy); x.lineTo(sx - len, yy); x.stroke();
    }
    x.restore();
    // platform edge line + safety strip glow
    x.save(); x.globalCompositeOperation = 'lighter';
    x.strokeStyle = K.rgba(P.lamp, 0.4); x.lineWidth = 2.5;
    x.beginPath(); x.moveTo(0, horiz); x.lineTo(W, horiz); x.stroke();
    const eg = x.createLinearGradient(0, horiz, 0, horiz + H * 0.06);
    eg.addColorStop(0, K.rgba(P.lamp, 0.18)); eg.addColorStop(1, K.rgba(P.lamp, 0));
    x.fillStyle = eg; x.fillRect(0, horiz, W, H * 0.06);
    x.restore();
    // BIG foreground figures on the near platform edge (close, looming)
    x.save();
    const fgN = K.rint(r, 4, 7);
    for (let i = 0; i < fgN; i++) {
      const fx = W * (0.08 + (i / fgN) * 0.84) + (r() - 0.5) * W * 0.08;
      const fh = H * (0.30 + r() * 0.22);
      const fy = H * (0.94 + r() * 0.06);
      const fw = fh * (0.17 + r() * 0.05);
      drawFigure(x, P, fx, fy, fh, fw, 0.92);
    }
    x.restore();
    finish(x, P, W, H, noise, seed, r, flow, night, 0.5);
  }

  // 6. DISTANT — a far tiny station lost in fog: vast empty negative space,
  //    a small glowing arch cluster low-centre, crushing scale.
  function layoutDistant(ctx) {
    const { x, P, W, H, r, noise, seed, night, dawn, lampGlow, flow } = ctx;
    // huge atmospheric field — mostly fog/sky, station is small and far
    const horiz = H * (0.58 + r() * 0.08);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg, '#000', 0.30));
    g.addColorStop(0.42, K.mix(P.bg, P.vault, 0.5));
    g.addColorStop(K.clamp(horiz / H, 0.45, 0.8), K.mix(P.vault, P.lamp, dawn ? 0.28 : night ? 0.08 : 0.18));
    g.addColorStop(1, K.mix(P.bg, P.ember, 0.28));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // banded atmospheric fog layers across the whole field (depth haze)
    x.save(); x.globalCompositeOperation = 'screen';
    for (let i = 0; i < 7; i++) {
      const by = horiz - H * 0.25 + i * H * 0.06 + (noise.fbm(i * 2.1, 4, 2)) * H * 0.03;
      const fg = x.createLinearGradient(0, by - H * 0.05, 0, by + H * 0.05);
      const fc = K.mix(P.lamp, P.cream, 0.2 + i * 0.05);
      fg.addColorStop(0, K.rgba(fc, 0));
      fg.addColorStop(0.5, K.rgba(fc, (night ? 0.04 : 0.07) * (1 - i * 0.08)));
      fg.addColorStop(1, K.rgba(fc, 0));
      x.fillStyle = fg; x.fillRect(0, by - H * 0.05, W, H * 0.1);
    }
    x.restore();
    // the FAR station: a small cluster of glowing arches near the horizon
    const stX = W * (0.32 + r() * 0.36), stY = horiz;
    const scale = 0.16 + r() * 0.08;   // tiny
    K.bloom(x, stX, stY - H * 0.04, Math.min(W, H) * scale * 1.6, P.lamp, lampGlow + 0.06);
    x.save();
    const sa = K.rint(r, 4, 7);
    for (let i = sa - 1; i >= 0; i--) {
      const d = (i + 0.6) / sa;
      const hw = W * scale * (0.2 + d * 0.5);
      const top = stY - H * scale * (0.4 + d * 0.5);
      const sp = stY - H * scale * (0.1 + d * 0.15);
      x.beginPath();
      archPath(x, stX, top, hw, sp, stY);
      const tone = d < 0.5 ? K.mix(P.vault, P.lamp, 0.3) : K.mix(P.vault, '#000', 0.4);
      x.fillStyle = K.rgba(tone, 0.5 + d * 0.3);
      x.fill();
      x.strokeStyle = K.rgba(K.mix(P.lamp, P.cream, 0.3), 0.2 + d * 0.3);
      x.lineWidth = 0.8 + d; x.stroke();
    }
    // a couple of tiny lamps at the station
    x.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 5; i++) {
      const lx = stX + (r() - 0.5) * W * scale * 1.4;
      const ly = stY - H * scale * (0.2 + r() * 0.4);
      K.bloom(x, lx, ly, 4 + r() * 10, P.lamp, 0.4);
      x.fillStyle = K.rgba(P.cream, 0.6); x.beginPath(); x.arc(lx, ly, 1, 0, 7); x.fill();
    }
    x.restore();
    // a faint far train threading out of the station into the fog
    x.save(); x.globalCompositeOperation = 'lighter';
    if (flow !== 'Becalmed') {
      const dir = r() < 0.5 ? -1 : 1;
      const railH = 4 + r() * 8;
      const col = r() < 0.4 ? P.trail : P.cream;
      drawRibbon(x, P, (t) => {
        const xx = stX + dir * W * 0.5 * t;
        const yy = stY - H * 0.005 + Math.sin(t * 2) * H * 0.01;
        return [xx, yy, 1 - t * 0.7];
      }, 26, railH, col, false, noise, 41);
    }
    x.restore();
    // crushing foreground: a vast dark ground plane + a few near silhouettes
    // tiny at the bottom to amplify how far the station is.
    x.save(); x.globalCompositeOperation = 'screen';
    const fpr = x.createRadialGradient(stX, stY, 0, stX, stY, Math.max(W, H) * 0.5);
    fpr.addColorStop(0, K.rgba(P.lamp, night ? 0.05 : 0.1));
    fpr.addColorStop(0.5, K.rgba(P.ember, 0.05));
    fpr.addColorStop(1, K.rgba(P.bg, 0));
    x.fillStyle = fpr; x.fillRect(0, horiz, W, H - horiz);
    x.restore();
    // sparse small foreground figures spread very wide (lots of empty floor)
    x.save();
    const fgN = K.rint(r, 5, 9);
    for (let i = 0; i < fgN; i++) {
      const fx = r() * W;
      const fh = H * (0.04 + r() * 0.07);
      const fy = horiz + H * (0.06 + r() * 0.3);
      const fw = fh * (0.18 + r() * 0.05);
      drawFigure(x, P, fx, fy, fh, fw, 0.85);
    }
    x.restore();
    finish(x, P, W, H, noise, seed, r, flow, night, 0.56);
  }

  const RENDER = {
    Nave: layoutNave, Arcade: layoutArcade, Crossing: layoutCrossing,
    Vaulting: layoutVaulting, Platform: layoutPlatform, Distant: layoutDistant,
  };

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r);
    const P = p.pal, f = FMT[p.layout];
    const W = f.W, H = f.H;
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const night = p.time === 'Dead of Night';
    const dawn = p.time === 'First Light';
    const lampGlow = night ? 0.16 : dawn ? 0.34 : 0.26;

    const ctx = { x, P, W, H, r, noise, seed, night, dawn, lampGlow,
      flow: p.flow, arches: p.arches, layout: p.layout };
    RENDER[p.layout](ctx);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 'interchange', draw, traits };
})();


export const interchangeTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderInterchange: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const INTERCHANGE_ASPECTS: readonly number[] = [0.8378,1.2542,1.4231,1.3455];
export const interchangeSchema: TraitSchema = {
  "traits": [
    {
      "name": "Layout",
      "values": [
        "Vaulting",
        "Distant",
        "Arcade",
        "Platform",
        "Nave",
        "Crossing"
      ]
    },
    {
      "name": "Palette",
      "values": [
        "Amber Vault",
        "Deep Plum",
        "Ember Hall",
        "Plum Sodium",
        "Sodium Nave",
        "Oxblood Dusk"
      ]
    },
    {
      "name": "Hour",
      "values": [
        "Last Train",
        "First Light",
        "Rush Hour",
        "Dead of Night"
      ]
    },
    {
      "name": "Traffic",
      "values": [
        "Becalmed",
        "Streaking",
        "Crossfire"
      ]
    }
  ]
};
