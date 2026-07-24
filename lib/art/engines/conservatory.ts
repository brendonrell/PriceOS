// @ts-nocheck
/*
 * Conservatory — generated from the locked tournament engine (tools/halo/t_conservatory.js)
 * by tools/halo/port.mjs. The render logic is copied verbatim; KIT is inlined as
 * a module-local const and the window.* R&D hooks are stripped. Deterministic in
 * tokenId. Frozen art — edit the source engine + re-port, don't hand-tune here.
 */
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const K = (function () {
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

  return {mulberry32,rng,pick,rint,shuffle,randn,clamp,h2r,r2h,mix,lum,rgba,hsl2hex,grain,vignette,mottle,makeNoise,bloom,hazeSheet,scanlines,chromaSplit,iridescent,sheen,curl,softShadow,chromeRamp,PHI:1.61803398875,INVPHI:0.61803398875};
})();


const ENGINE = (function () {

  // bg1=deep canopy shadow (zenith), bg2=mid air/fog, ray=god-ray gold,
  // glass=roof glow tint, bloom1/bloom2=hot flora pops (magenta + coral),
  // stem=fused plant-machine green, ink=deepest silhouette.
  const PALS = [
    { name: 'Emerald Glasshouse', bg1:'#03150f', bg2:'#0a3a2c', ray:'#ffc24a', glass:'#7fe6c0', bloom1:'#ff2e8e', bloom2:'#ff6a4d', stem:'#1f7a5a', ink:'#020c08' },
    { name: 'Verdant Furnace',    bg1:'#04130c', bg2:'#0c4030', ray:'#ffb02e', glass:'#84f0c4', bloom1:'#ff3d72', bloom2:'#ff7e3a', stem:'#247e54', ink:'#020a06' },
    { name: 'Teal Vault',         bg1:'#03161a', bg2:'#0a3c44', ray:'#ffce5e', glass:'#74e8e0', bloom1:'#ff2f9e', bloom2:'#ff5c6e', stem:'#1c7e72', ink:'#020b0d' },
    { name: 'Jade Aurora',        bg1:'#05140e', bg2:'#0e4636', ray:'#ffd76a', glass:'#8af0c8', bloom1:'#e93dff', bloom2:'#ff5a86', stem:'#23895f', ink:'#030d08' },
    { name: 'Malachite Heat',     bg1:'#02120c', bg2:'#0a3a26', ray:'#ffaa1e', glass:'#7eecb4', bloom1:'#ff2b6e', bloom2:'#ff8a2e', stem:'#1e7848', ink:'#010a06' },
    { name: 'Spore Emerald',      bg1:'#04150f', bg2:'#0b3e30', ray:'#f7c64a', glass:'#80ead0', bloom1:'#ff49b0', bloom2:'#ff6650', stem:'#208060', ink:'#020c08' },
    { name: 'Conservatory Dusk',  bg1:'#06130f', bg2:'#103a30', ray:'#ffbe5a', glass:'#8ce8c2', bloom1:'#ff357f', bloom2:'#ff7a52', stem:'#268a62', ink:'#030c08' },
    { name: 'Viridian Bloom',     bg1:'#02140e', bg2:'#08402e', ray:'#ffc838', glass:'#76eebc', bloom1:'#ff2e96', bloom2:'#ff5e44', stem:'#1a7c54', ink:'#010b07' },
  ];

  const FMTS = [ { W: 1500, H: 1000, t: 'Hall' }, { W: 1320, H: 1320, t: 'Atrium' }, { W: 1040, H: 1440, t: 'Spire' } ];
  const VESSELS = ['Bulbs', 'Pods', 'Vessels', 'Valves'];

  // COMPOSITION ARCHETYPES — the camera / scene layout. weighted pick.
  const VIEWS = ['Bed', 'Canopy', 'Aisle', 'Hero', 'Field', 'Chamber', 'Jungle'];
  // ARCHITECTURE — roof type, drives god-ray geometry + how the glass reads.
  const ARCHES = ['Dome', 'Nave', 'Broken Glass', 'Tunnel', 'Terraces'];
  // which bloom form dominates a given output
  const DOMS = ['Star', 'Trumpet', 'Globe', 'Mixed'];

  function params(r) {
    let pal = K.pick(PALS, r);
    const view = K.pick(VIEWS, r);
    const fmt = K.pick(FMTS, r);
    const vessel = K.pick(VESSELS, r);
    // architecture is loosely correlated to view so they make sense together
    let arch;
    if (view === 'Aisle') arch = r() < 0.6 ? 'Tunnel' : 'Nave';
    else if (view === 'Canopy') arch = r() < 0.5 ? 'Dome' : (r() < 0.5 ? 'Nave' : 'Broken Glass');
    else if (view === 'Field') arch = r() < 0.45 ? 'Terraces' : K.pick(ARCHES, r);
    else arch = K.pick(ARCHES, r);
    const dom = K.pick(DOMS, r);
    // density swings WIDE per view; Chamber sparse, Jungle packed
    let density;
    if (view === 'Chamber') density = 0.18 + r() * 0.16;
    else if (view === 'Jungle') density = 0.82 + r() * 0.18;
    else if (view === 'Field') density = 0.55 + r() * 0.3;
    else density = 0.4 + r() * 0.45;
    const rayCount = K.rint(r, 3, 8);
    const event = r() < 0.10 ? K.pick(['Pollen Storm', 'Bloomfall', 'Glass Bloom', 'Eclipse Bloom'], r) : null;
    return { pal, view, arch, fmt, vessel, dom, density, rayCount, event };
  }

  function densityLabel(d) { return d < 0.32 ? 'Sparse' : d < 0.55 ? 'Open' : d < 0.78 ? 'Lush' : 'Teeming'; }

  function traits(seed) {
    const p = params(K.rng(seed));
    const t = {
      Palette: p.pal.name,
      View: p.view,
      Architecture: p.arch,
      Hall: p.fmt.t,
      Flora: p.vessel,
      Bloom: p.dom,
      Density: densityLabel(p.density),
    };
    if (p.event) t.Event = p.event;
    return t;
  }

  /* ── deep air: dark emerald canopy shadow up top, warmer fog toward floor.
       horizon position shifts with the view (low-angle = high horizon). ── */
  function airGradient(x, P, W, H, hz, lightX) {
    lightX = lightX == null ? 0.5 : lightX;
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, K.mix(P.bg1, '#000', 0.25));
    g.addColorStop(0.22, P.bg1);
    g.addColorStop(K.clamp(hz - 0.18, 0.05, 0.7), K.mix(P.bg1, P.bg2, 0.72));
    g.addColorStop(K.clamp(hz + 0.1, 0.6, 0.95), K.mix(P.bg2, P.ray, 0.10));
    g.addColorStop(1, K.mix(P.bg2, P.ink, 0.45));
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    // hot glow lobe high up where the glass roof lets light through (follows lightX)
    x.save(); x.globalCompositeOperation = 'screen';
    const gl = x.createRadialGradient(W * lightX, H * 0.08, 0, W * lightX, H * 0.08, H * 0.7);
    gl.addColorStop(0, K.rgba(P.ray, 0.18)); gl.addColorStop(0.5, K.rgba(P.glass, 0.05)); gl.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W, H); x.restore();
  }

  /* ── the glass roof. ARCHITECTURE drives the lattice geometry. ── */
  function glassRoof(x, P, W, H, r, noise, arch, vanX, roofH) {
    const rh = roofH;
    x.save();
    const g = x.createLinearGradient(0, 0, 0, rh);
    g.addColorStop(0, K.rgba(P.glass, 0.10));
    g.addColorStop(0.6, K.rgba(P.glass, 0.03));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'screen';
    x.fillStyle = g; x.fillRect(0, 0, W, rh);

    if (arch === 'Broken Glass') {
      // panes are missing — patches of brighter raw sky show through
      const patches = K.rint(r, 4, 7);
      for (let i = 0; i < patches; i++) {
        const cx = W * (0.1 + r() * 0.8), cy = rh * (0.1 + r() * 0.7);
        const pw = W * (0.05 + r() * 0.12), ph = rh * (0.12 + r() * 0.3);
        const pg = x.createRadialGradient(cx, cy, 0, cx, cy, Math.max(pw, ph));
        pg.addColorStop(0, K.rgba(K.mix(P.ray, '#fff', 0.4), 0.22));
        pg.addColorStop(0.5, K.rgba(P.glass, 0.10));
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        x.fillStyle = pg; x.beginPath(); x.ellipse(cx, cy, pw, ph, (r() - 0.5) * 0.6, 0, Math.PI * 2); x.fill();
      }
    }

    // mullion lattice — geometry depends on arch
    x.strokeStyle = K.rgba(P.glass, 0.10); x.lineWidth = 1;
    if (arch === 'Tunnel') {
      // concentric arcs receding toward vanishing point (barrel vault end-on)
      const vy = rh * 0.55;
      for (let i = 1; i <= 9; i++) {
        const rr = (i / 9) * Math.max(W, rh) * 0.7;
        x.beginPath(); x.ellipse(W * vanX, vy, rr * 1.3, rr, 0, Math.PI, Math.PI * 2); x.stroke();
      }
      const ribs = K.rint(r, 12, 18);
      for (let i = 0; i <= ribs; i++) {
        const a = Math.PI + (i / ribs) * Math.PI;
        x.beginPath(); x.moveTo(W * vanX, vy);
        x.lineTo(W * vanX + Math.cos(a) * W * 0.9, vy + Math.sin(a) * rh * 1.1); x.stroke();
      }
    } else {
      // radiating mullions from a high vanishing point (dome / nave / terraces)
      const vx = W * vanX, vy = -H * (arch === 'Dome' ? 0.18 : 0.32);
      const bays = K.rint(r, 14, 24);
      for (let i = 0; i <= bays; i++) {
        const fx = (i / bays) * W;
        x.beginPath(); x.moveTo(fx, 0);
        x.quadraticCurveTo((fx + vx) / 2, rh * 0.4, vx + (fx - vx) * 0.35, rh);
        x.stroke();
      }
      const bars = arch === 'Dome' ? 7 : 5;
      for (let j = 1; j <= bars; j++) {
        const fy = (j / (bars + 1)) * rh;
        const sag = arch === 'Dome' ? 0.1 : 0.06;
        x.beginPath();
        for (let xx = 0; xx <= W; xx += 18) { const yy = fy - Math.sin(xx / W * Math.PI) * rh * sag; x.lineTo(xx, yy); }
        x.strokeStyle = K.rgba(P.glass, 0.07); x.stroke();
      }
    }
    x.restore();
  }

  /* ── GOD-RAYS. Shafts emanate from a focus point (top, or a side, or a
       vanishing point) depending on architecture/view. ── */
  function godRays(x, P, W, H, count, r, noise, opts) {
    // opts: {originY, focusX, focusY, spread, dirBias} — focus is where rays
    // converge above/behind; dirBias tilts the whole bundle.
    const o = opts || {};
    const focusX = o.focusX == null ? W * 0.5 : o.focusX;
    const focusY = o.focusY == null ? -H * 0.5 : o.focusY;
    const spread = o.spread == null ? 0.34 : o.spread;
    x.save(); x.globalCompositeOperation = 'screen';
    const geo = [];
    for (let i = 0; i < count; i++) {
      // entry point along the top (or implied source band)
      const topX = W * (0.04 + (i / count) * 0.92 + (r() - 0.5) * 0.06);
      const topY = (o.originY == null ? -H * 0.04 : o.originY);
      // aim FROM focus THROUGH the entry point → consistent perspective fan
      const aimAng = Math.atan2(topX - focusX, topY - focusY * -1 + topY); // approx downward
      const ang = (r() - 0.5) * spread + (topX / W - 0.5) * 0.5 + (o.dirBias || 0);
      const len = H * (1.05 + r() * 0.25);
      const wTop = W * (0.012 + r() * 0.016);
      const wBot = W * (0.06 + r() * 0.08) * (o.fat || 1);
      geo.push({ topX, topY, ang, len, wBot });
      const botX = topX + Math.sin(ang) * len;
      const botY = topY + Math.cos(ang) * len;
      const dxp = Math.cos(ang), dyp = -Math.sin(ang);
      const col = K.mix(P.ray, '#fff', 0.12 + r() * 0.12);
      const intensity = (0.10 + r() * 0.08) * (o.bright || 1);
      const slats = 26;
      for (let s = 0; s < slats; s++) {
        const u = s / (slats - 1) - 0.5;
        const across = Math.cos(u * Math.PI) ** 1.6;
        const sh = (noise.fbm(i * 7.3 + u * 5, 1.7, 3) + 1) / 2;
        const a = intensity * across * (0.55 + sh * 0.6);
        if (a < 0.008) continue;
        const x0t = topX + dxp * u * wTop * 2, y0t = topY + dyp * u * wTop * 2;
        const x0b = botX + dxp * u * wBot * 2, y0b = botY + dyp * u * wBot * 2;
        const gg = x.createLinearGradient(x0t, y0t, x0b, y0b);
        gg.addColorStop(0, K.rgba(col, 0));
        gg.addColorStop(0.1, K.rgba(col, a));
        gg.addColorStop(0.5, K.rgba(col, a * 0.55));
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        x.strokeStyle = gg;
        x.lineWidth = (wBot * 2 / slats) * 1.8;
        x.lineCap = 'round';
        x.beginPath(); x.moveTo(x0t, y0t); x.lineTo(x0b, y0b); x.stroke();
      }
      K.bloom(x, topX + Math.sin(ang) * H * 0.2, topY + Math.cos(ang) * H * 0.2, wBot * 1.4, col, intensity * 0.7);
    }
    x.restore();
    return geo;
  }

  /* ── SIDE god-rays: a hard low sun raking across from one side (used by
       Canopy / Broken Glass). produces dramatic diagonal shafts. ── */
  function rakingRays(x, P, W, H, count, r, noise, fromLeft) {
    x.save(); x.globalCompositeOperation = 'screen';
    const geo = [];
    const sx = fromLeft ? -W * 0.05 : W * 1.05;
    for (let i = 0; i < count; i++) {
      const topX = sx;
      const topY = -H * 0.05 + (i / count) * H * 0.45;
      const ang = (fromLeft ? 1 : -1) * (0.7 + r() * 0.35) + (r() - 0.5) * 0.12; // steep diagonal
      const len = W * (1.3 + r() * 0.3);
      const wBot = W * (0.05 + r() * 0.06);
      geo.push({ topX, topY, ang, len, wBot });
      const botX = topX + Math.sin(ang) * len;
      const botY = topY + Math.cos(ang) * len;
      const dxp = Math.cos(ang), dyp = -Math.sin(ang);
      const col = K.mix(P.ray, '#fff', 0.14 + r() * 0.12);
      const intensity = 0.09 + r() * 0.07;
      const slats = 24;
      for (let s = 0; s < slats; s++) {
        const u = s / (slats - 1) - 0.5;
        const across = Math.cos(u * Math.PI) ** 1.6;
        const sh = (noise.fbm(i * 5.1 + u * 5, 1.7, 3) + 1) / 2;
        const a = intensity * across * (0.55 + sh * 0.6);
        if (a < 0.008) continue;
        const x0t = topX + dxp * u * W * 0.01, y0t = topY + dyp * u * W * 0.01;
        const x0b = botX + dxp * u * wBot * 2, y0b = botY + dyp * u * wBot * 2;
        const gg = x.createLinearGradient(x0t, y0t, x0b, y0b);
        gg.addColorStop(0, K.rgba(col, 0));
        gg.addColorStop(0.12, K.rgba(col, a));
        gg.addColorStop(0.55, K.rgba(col, a * 0.5));
        gg.addColorStop(1, 'rgba(0,0,0,0)');
        x.strokeStyle = gg; x.lineWidth = (wBot * 2 / slats) * 1.8; x.lineCap = 'round';
        x.beginPath(); x.moveTo(x0t, y0t); x.lineTo(x0b, y0b); x.stroke();
      }
    }
    x.restore();
    return geo;
  }

  /* ── volumetric fog: fbm sheets, denser/warmer toward the floor ── */
  function fog(x, P, W, H, noise, r, floorY) {
    K.hazeSheet(x, W, H, noise, K.mix(P.bg2, P.glass, 0.3), 0.13, 420 + r() * 200, 'screen');
    K.hazeSheet(x, W, H, noise, K.mix(P.bg2, P.ray, 0.25), 0.08, 260 + r() * 120, 'screen');
    x.save(); x.globalCompositeOperation = 'screen';
    const fy0 = floorY == null ? H * 0.6 : floorY - H * 0.12;
    const fg = x.createLinearGradient(0, fy0, 0, H);
    fg.addColorStop(0, 'rgba(0,0,0,0)'); fg.addColorStop(1, K.rgba(K.mix(P.glass, P.ray, 0.4), 0.16));
    x.fillStyle = fg; x.fillRect(0, fy0, W, H - fy0); x.restore();
  }

  /* ── a foggy planting bed at floorY (fraction). ── */
  function floorBed(x, P, W, H, noise, r, fyFrac, roughness) {
    const fy = H * fyFrac;
    const rough = roughness == null ? 0.05 : roughness;
    x.save();
    x.beginPath(); x.moveTo(0, H);
    x.lineTo(0, fy);
    for (let xx = 0; xx <= W; xx += 16) {
      const yy = fy + noise.fbm(xx / 240, 9.2, 3) * H * rough + Math.sin(xx / W * Math.PI * 2) * H * 0.012;
      x.lineTo(xx, yy);
    }
    x.lineTo(W, H); x.closePath();
    const g = x.createLinearGradient(0, fy - H * 0.05, 0, H);
    g.addColorStop(0, K.mix(P.bg2, P.ray, 0.12));
    g.addColorStop(0.4, K.mix(P.bg2, P.ink, 0.4));
    g.addColorStop(1, K.mix(P.ink, '#000', 0.2));
    x.fillStyle = g; x.fill();
    x.globalCompositeOperation = 'screen';
    const rim = x.createLinearGradient(0, fy - H * 0.1, 0, fy + H * 0.06);
    rim.addColorStop(0, 'rgba(0,0,0,0)'); rim.addColorStop(0.55, K.rgba(K.mix(P.ray, P.glass, 0.4), 0.14)); rim.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = rim; x.fillRect(0, fy - H * 0.1, W, H * 0.16);
    x.restore();
    K.mottle(x, 0, fy, W, H - fy, P.stem, 1600, r, 'screen');
    return fy;
  }

  /* ── a receding AISLE floor: two perspective edges meeting at a vanishing
       point, with a lit walkway down the middle. used by Aisle/Tunnel. ── */
  function aisleFloor(x, P, W, H, noise, r, vanX, vanY) {
    x.save();
    const vx = W * vanX, vy = H * vanY;
    const fLx = W * 0.06, fRx = W * 0.94, fY = H * 1.02;
    // ground wedge (the two converging floor planes)
    x.beginPath();
    x.moveTo(0, H); x.lineTo(0, vy + (fY - vy) * 0.22);
    x.lineTo(vx, vy); x.lineTo(W, vy + (fY - vy) * 0.22); x.lineTo(W, H); x.closePath();
    const g = x.createLinearGradient(0, vy, 0, H);
    g.addColorStop(0, K.mix(P.bg2, P.ink, 0.42));
    g.addColorStop(0.5, K.mix(P.bg2, P.ink, 0.28));
    g.addColorStop(1, K.mix(P.ink, '#000', 0.1));
    x.fillStyle = g; x.fill();
    // mottled ground texture so it isn't a flat triangle
    K.mottle(x, 0, vy, W, H - vy, P.stem, 2200, r, 'screen');
    // glowing far-end pool at the vanishing point (depth + draws the eye)
    x.globalCompositeOperation = 'screen';
    const ep = x.createRadialGradient(vx, vy, 0, vx, vy, W * 0.22);
    ep.addColorStop(0, K.rgba(K.mix(P.ray, '#fff', 0.4), 0.3));
    ep.addColorStop(0.4, K.rgba(K.mix(P.ray, P.glass, 0.4), 0.12));
    ep.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = ep; x.fillRect(vx - W * 0.22, vy - W * 0.22, W * 0.44, W * 0.44);
    // central lit walkway running from far point to camera
    const pg = x.createLinearGradient(vx, vy, (fLx + fRx) / 2, fY);
    pg.addColorStop(0, K.rgba(K.mix(P.ray, '#fff', 0.35), 0.26));
    pg.addColorStop(0.6, K.rgba(K.mix(P.ray, P.glass, 0.4), 0.1));
    pg.addColorStop(1, K.rgba(K.mix(P.ray, P.glass, 0.4), 0.03));
    x.fillStyle = pg;
    x.beginPath();
    x.moveTo(vx - W * 0.012, vy); x.lineTo(vx + W * 0.012, vy);
    x.lineTo(fRx - W * 0.2, fY); x.lineTo(fLx + W * 0.2, fY); x.closePath(); x.fill();
    // faint paving lines receding (perspective floor rhythm)
    x.strokeStyle = K.rgba(K.mix(P.glass, P.ray, 0.4), 0.08); x.lineWidth = 1;
    for (let i = 1; i <= 7; i++) {
      const t = i / 8; const yy = vy + (H - vy) * (t * t);
      const halfW = (W * 0.12) + (W * 0.5) * (t * t);
      x.beginPath(); x.moveTo(W * 0.5 - halfW, yy); x.lineTo(W * 0.5 + halfW, yy); x.stroke();
    }
    x.restore();
    return { vx, vy };
  }

  /* ── a single biomechanical plant. depth 0=far,1=near. opts.dom biases the
       bloom form; opts.tall stretches height; opts.glow boosts pop. ── */
  function plant(x, P, noise, baseX, baseY, scale, depth, r, opts) {
    opts = opts || {};
    const ink = K.mix(P.ink, P.bg2, (1 - depth) * 0.55);
    const stemCol = K.mix(P.stem, P.bg2, (1 - depth) * 0.5);
    const hot = r() < 0.5 ? P.bloom1 : P.bloom2;
    const tall = opts.tall || 1;
    const h = scale * (120 + r() * 160) * tall;
    const lean = (r() - 0.5) * scale * 50 * (opts.lean || 1);
    const segs = K.rint(r, 4, 7);

    K.softShadow(x, baseX, baseY, scale * 90, 0.3 * depth);

    x.save();
    const pts = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const px = baseX + lean * t + Math.sin(t * 3 + r()) * scale * 18 * t;
      const py = baseY - h * t;
      pts.push([px, py, t]);
    }
    for (let s = 0; s < segs; s++) {
      const a = pts[s], b = pts[s + 1];
      const w0 = scale * (26 - a[2] * 16), w1 = scale * (26 - b[2] * 16);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      x.beginPath();
      x.moveTo(a[0] + Math.cos(ang) * w0, a[1] + Math.sin(ang) * w0);
      x.lineTo(a[0] - Math.cos(ang) * w0, a[1] - Math.sin(ang) * w0);
      x.lineTo(b[0] - Math.cos(ang) * w1, b[1] - Math.sin(ang) * w1);
      x.lineTo(b[0] + Math.cos(ang) * w1, b[1] + Math.sin(ang) * w1);
      x.closePath();
      const gg = x.createLinearGradient(a[0] + Math.cos(ang) * w0, a[1], a[0] - Math.cos(ang) * w0, a[1]);
      gg.addColorStop(0, K.mix(stemCol, P.ink, 0.5));
      gg.addColorStop(0.45, K.mix(stemCol, '#fff', 0.12 * depth));
      gg.addColorStop(1, K.mix(stemCol, P.ink, 0.6));
      x.fillStyle = gg; x.fill();
    }
    x.restore();

    const podN = K.rint(r, 2, 5);
    for (let i = 0; i < podN; i++) {
      const t = 0.25 + r() * 0.6;
      const idx = Math.min(segs - 1, Math.floor(t * segs));
      const a = pts[idx];
      const off = (r() < 0.5 ? -1 : 1) * scale * (22 + r() * 26);
      const px = a[0] + off, py = a[1] - r() * scale * 18;
      const pr = scale * (16 + r() * 26);
      x.save();
      const g = x.createRadialGradient(px - pr * 0.3, py - pr * 0.35, pr * 0.1, px, py, pr);
      const podCol = r() < 0.4 ? hot : K.mix(P.stem, P.glass, 0.4);
      g.addColorStop(0, K.mix(podCol, '#fff', 0.45));
      g.addColorStop(0.55, podCol);
      g.addColorStop(1, K.mix(podCol, P.ink, 0.55));
      x.fillStyle = g;
      x.beginPath();
      x.ellipse(px, py, pr * (0.78 + r() * 0.2), pr * (1 + r() * 0.25), (r() - 0.5) * 0.6, 0, Math.PI * 2);
      x.fill();
      if (podCol === hot) K.bloom(x, px, py, pr * 1.8, hot, 0.22 * depth + 0.06);
      x.strokeStyle = K.rgba(K.mix(podCol, P.ink, 0.6), 0.6); x.lineWidth = scale * 2;
      x.beginPath(); x.ellipse(px, py - pr * 0.7, pr * 0.5, pr * 0.18, 0, 0, Math.PI * 2); x.stroke();
      x.restore();
    }

    const top = pts[segs];
    const br = scale * (24 + r() * 30);
    const glow = opts.glow || 1;
    K.bloom(x, top[0], top[1], br * 3.2, hot, (0.28 * depth + 0.08) * glow);
    // dominant-bloom bias: 70% chance to use the output's dominant form
    let form = r();
    if (opts.dom && opts.dom !== 'Mixed' && r() < 0.7) {
      form = opts.dom === 'Star' ? 0.2 : opts.dom === 'Trumpet' ? 0.55 : 0.9;
    }
    x.save();
    if (form < 0.42) {
      const petals = K.rint(r, 5, 9);
      for (let i = 0; i < petals; i++) {
        const pa = (i / petals) * Math.PI * 2 + r() * 0.3;
        const pl = br * (0.9 + r() * 0.5);
        const tipX = top[0] + Math.cos(pa) * pl, tipY = top[1] + Math.sin(pa) * pl;
        const g = x.createLinearGradient(top[0], top[1], tipX, tipY);
        g.addColorStop(0, K.mix(hot, '#fff', 0.4)); g.addColorStop(0.6, hot); g.addColorStop(1, K.mix(hot, P.ink, 0.4));
        x.fillStyle = g;
        const pw = br * 0.42;
        const mx = (top[0] + tipX) / 2 + Math.cos(pa + Math.PI / 2) * pw;
        const my = (top[1] + tipY) / 2 + Math.sin(pa + Math.PI / 2) * pw;
        const mx2 = (top[0] + tipX) / 2 - Math.cos(pa + Math.PI / 2) * pw;
        const my2 = (top[1] + tipY) / 2 - Math.sin(pa + Math.PI / 2) * pw;
        x.beginPath(); x.moveTo(top[0], top[1]); x.quadraticCurveTo(mx, my, tipX, tipY); x.quadraticCurveTo(mx2, my2, top[0], top[1]); x.fill();
      }
    } else if (form < 0.74) {
      const fa = -Math.PI / 2 + (r() - 0.5) * 0.4;
      const fl = br * (1.4 + r() * 0.6), fw = br * (0.9 + r() * 0.5);
      const tx = top[0] + Math.cos(fa) * fl, ty = top[1] + Math.sin(fa) * fl;
      const g = x.createLinearGradient(top[0], top[1], tx, ty);
      g.addColorStop(0, K.mix(hot, P.ink, 0.5)); g.addColorStop(0.6, hot); g.addColorStop(1, K.mix(hot, '#fff', 0.55));
      x.fillStyle = g;
      const px2 = Math.cos(fa + Math.PI / 2), py2 = Math.sin(fa + Math.PI / 2);
      x.beginPath();
      x.moveTo(top[0] - px2 * br * 0.18, top[1] - py2 * br * 0.18);
      x.quadraticCurveTo(top[0] - px2 * fw, ty - py2 * fw, tx - px2 * fw, ty - py2 * fw);
      x.quadraticCurveTo(tx, ty + fw * 0.4, tx + px2 * fw, ty + py2 * fw);
      x.quadraticCurveTo(top[0] + px2 * fw, ty + py2 * fw, top[0] + px2 * br * 0.18, top[1] + py2 * br * 0.18);
      x.closePath(); x.fill();
      K.bloom(x, tx, ty, fw * 1.3, K.mix(hot, '#fff', 0.4), 0.3);
    } else {
      const beads = K.rint(r, 9, 16);
      for (let i = 0; i < beads; i++) {
        const ba = r() * Math.PI * 2, bd = r() * br * 0.9;
        const bx = top[0] + Math.cos(ba) * bd, by = top[1] + Math.sin(ba) * bd * 0.85;
        const rr = br * (0.18 + r() * 0.22);
        const g = x.createRadialGradient(bx - rr * 0.3, by - rr * 0.3, rr * 0.1, bx, by, rr);
        g.addColorStop(0, K.mix(hot, '#fff', 0.55)); g.addColorStop(0.7, hot); g.addColorStop(1, K.mix(hot, P.ink, 0.45));
        x.fillStyle = g; x.beginPath(); x.arc(bx, by, rr, 0, Math.PI * 2); x.fill();
      }
    }
    const cg = x.createRadialGradient(top[0], top[1], 0, top[0], top[1], br * 0.6);
    cg.addColorStop(0, K.mix(hot, '#fff', 0.7)); cg.addColorStop(1, K.rgba(hot, 0));
    x.fillStyle = cg; x.beginPath(); x.arc(top[0], top[1], br * 0.6, 0, Math.PI * 2); x.fill();
    x.restore();

    const frondN = K.rint(r, 2, 4);
    for (let i = 0; i < frondN; i++) {
      const t = 0.3 + r() * 0.5;
      const idx = Math.min(segs - 1, Math.floor(t * segs));
      const a = pts[idx];
      const dir = r() < 0.5 ? -1 : 1;
      const fl = scale * (60 + r() * 90);
      const fa = dir * (0.3 + r() * 0.8) - Math.PI / 2;
      const tipX = a[0] + Math.cos(fa) * fl, tipY = a[1] + Math.sin(fa) * fl;
      x.save();
      const fw = scale * (16 + r() * 14);
      const mx = (a[0] + tipX) / 2 + Math.cos(fa + Math.PI / 2) * fw * dir;
      const my = (a[1] + tipY) / 2 + Math.sin(fa + Math.PI / 2) * fw * dir;
      const g = x.createLinearGradient(a[0], a[1], tipX, tipY);
      g.addColorStop(0, K.mix(stemCol, P.ink, 0.45));
      g.addColorStop(1, K.mix(stemCol, '#fff', 0.1 * depth));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(a[0], a[1]);
      x.quadraticCurveTo(mx, my, tipX, tipY);
      x.quadraticCurveTo((a[0] + tipX) / 2, (a[1] + tipY) / 2, a[0], a[1]);
      x.fill();
      x.restore();
    }
    return { top, h };
  }

  /* ── a COLOSSAL hero plant-machine: a fat trunk with stacked glass pods,
       valve collars, a crowning bloom. dominates the frame. ── */
  function colossus(x, P, noise, baseX, baseY, scale, r, dom) {
    // keep the trunk a saturated emerald like the smaller stems (not gray)
    const stemCol = K.mix(P.stem, P.glass, 0.12);
    const hot = r() < 0.5 ? P.bloom1 : P.bloom2;
    const h = scale * (520 + r() * 220);
    const segs = K.rint(r, 6, 9);
    const lean = (r() - 0.5) * scale * 60;
    K.softShadow(x, baseX, baseY, scale * 220, 0.4);
    const pts = [];
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const px = baseX + lean * t + Math.sin(t * 2.4 + r()) * scale * 30 * t;
      const py = baseY - h * t;
      pts.push([px, py, t]);
    }
    // fat trunk
    for (let s = 0; s < segs; s++) {
      const a = pts[s], b = pts[s + 1];
      const w0 = scale * (90 - a[2] * 58), w1 = scale * (90 - b[2] * 58);
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
      x.beginPath();
      x.moveTo(a[0] + Math.cos(ang) * w0, a[1] + Math.sin(ang) * w0);
      x.lineTo(a[0] - Math.cos(ang) * w0, a[1] - Math.sin(ang) * w0);
      x.lineTo(b[0] - Math.cos(ang) * w1, b[1] - Math.sin(ang) * w1);
      x.lineTo(b[0] + Math.cos(ang) * w1, b[1] + Math.sin(ang) * w1);
      x.closePath();
      const gg = x.createLinearGradient(a[0] - w0, a[1], a[0] + w0, a[1]);
      gg.addColorStop(0, K.mix(stemCol, P.ink, 0.6));
      gg.addColorStop(0.42, K.mix(stemCol, P.glass, 0.35));
      gg.addColorStop(0.55, K.mix(stemCol, '#fff', 0.12));
      gg.addColorStop(1, K.mix(stemCol, P.ink, 0.68));
      x.fillStyle = gg; x.fill();
      // valve collar ring at each joint
      if (s > 0) {
        x.strokeStyle = K.rgba(K.mix(stemCol, P.ink, 0.7), 0.7); x.lineWidth = scale * 6;
        x.beginPath(); x.ellipse(a[0], a[1], w0 * 1.05, w0 * 0.3, 0, 0, Math.PI * 2); x.stroke();
      }
    }
    // big glass pods bolted to the trunk
    const podN = K.rint(r, 4, 7);
    for (let i = 0; i < podN; i++) {
      const t = 0.2 + (i / podN) * 0.65;
      const idx = Math.min(segs - 1, Math.floor(t * segs));
      const a = pts[idx];
      const off = (i % 2 ? 1 : -1) * scale * (70 + r() * 40);
      const px = a[0] + off, py = a[1];
      const pr = scale * (50 + r() * 50);
      const podCol = r() < 0.45 ? hot : K.mix(P.stem, P.glass, 0.45);
      const g = x.createRadialGradient(px - pr * 0.3, py - pr * 0.35, pr * 0.1, px, py, pr);
      g.addColorStop(0, K.mix(podCol, '#fff', 0.5));
      g.addColorStop(0.55, podCol);
      g.addColorStop(1, K.mix(podCol, P.ink, 0.55));
      x.fillStyle = g; x.beginPath(); x.ellipse(px, py, pr * 0.85, pr * 1.05, (r() - 0.5) * 0.5, 0, Math.PI * 2); x.fill();
      if (podCol === hot) K.bloom(x, px, py, pr * 2.2, hot, 0.3);
    }
    // crown bloom — huge
    const top = pts[segs];
    const br = scale * (90 + r() * 60);
    K.bloom(x, top[0], top[1], br * 3.5, hot, 0.4);
    plant._crown(x, P, noise, top, br, hot, r, dom);
  }
  // crown bloom for the colossus (reuses the trumpet/star/globe vocabulary, big)
  plant._crown = function (x, P, noise, top, br, hot, r, dom) {
    let form = r();
    if (dom && dom !== 'Mixed') form = dom === 'Star' ? 0.2 : dom === 'Trumpet' ? 0.55 : 0.9;
    x.save();
    if (form < 0.42) {
      const petals = K.rint(r, 7, 11);
      for (let i = 0; i < petals; i++) {
        const pa = (i / petals) * Math.PI * 2 + r() * 0.2;
        const pl = br * (1 + r() * 0.5);
        const tipX = top[0] + Math.cos(pa) * pl, tipY = top[1] + Math.sin(pa) * pl;
        const g = x.createLinearGradient(top[0], top[1], tipX, tipY);
        g.addColorStop(0, K.mix(hot, '#fff', 0.45)); g.addColorStop(0.6, hot); g.addColorStop(1, K.mix(hot, P.ink, 0.4));
        x.fillStyle = g;
        const pw = br * 0.4;
        const mx = (top[0] + tipX) / 2 + Math.cos(pa + Math.PI / 2) * pw;
        const my = (top[1] + tipY) / 2 + Math.sin(pa + Math.PI / 2) * pw;
        const mx2 = (top[0] + tipX) / 2 - Math.cos(pa + Math.PI / 2) * pw;
        const my2 = (top[1] + tipY) / 2 - Math.sin(pa + Math.PI / 2) * pw;
        x.beginPath(); x.moveTo(top[0], top[1]); x.quadraticCurveTo(mx, my, tipX, tipY); x.quadraticCurveTo(mx2, my2, top[0], top[1]); x.fill();
      }
    } else if (form < 0.74) {
      const fl = br * 1.8, fw = br * 1.2;
      const tx = top[0], ty = top[1] - fl;
      const g = x.createLinearGradient(top[0], top[1], tx, ty);
      g.addColorStop(0, K.mix(hot, P.ink, 0.5)); g.addColorStop(0.6, hot); g.addColorStop(1, K.mix(hot, '#fff', 0.6));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(top[0] - br * 0.2, top[1]); x.quadraticCurveTo(tx - fw, ty, tx - fw, ty);
      x.quadraticCurveTo(tx, ty + fw * 0.4, tx + fw, ty);
      x.quadraticCurveTo(top[0] + br * 0.2, top[1], top[0] - br * 0.2, top[1]); x.closePath(); x.fill();
      K.bloom(x, tx, ty, fw * 1.3, K.mix(hot, '#fff', 0.4), 0.35);
    } else {
      const beads = K.rint(r, 14, 22);
      for (let i = 0; i < beads; i++) {
        const ba = r() * Math.PI * 2, bd = r() * br;
        const bx = top[0] + Math.cos(ba) * bd, by = top[1] + Math.sin(ba) * bd * 0.85;
        const rr = br * (0.16 + r() * 0.2);
        const g = x.createRadialGradient(bx - rr * 0.3, by - rr * 0.3, rr * 0.1, bx, by, rr);
        g.addColorStop(0, K.mix(hot, '#fff', 0.55)); g.addColorStop(0.7, hot); g.addColorStop(1, K.mix(hot, P.ink, 0.45));
        x.fillStyle = g; x.beginPath(); x.arc(bx, by, rr, 0, Math.PI * 2); x.fill();
      }
    }
    const cg = x.createRadialGradient(top[0], top[1], 0, top[0], top[1], br * 0.7);
    cg.addColorStop(0, K.mix(hot, '#fff', 0.75)); cg.addColorStop(1, K.rgba(hot, 0));
    x.fillStyle = cg; x.beginPath(); x.arc(top[0], top[1], br * 0.7, 0, Math.PI * 2); x.fill();
    x.restore();
  };

  function tubing(x, P, W, H, noise, r, depth) {
    x.save();
    const n = K.rint(r, 2, 4);
    for (let i = 0; i < n; i++) {
      const col = K.mix(P.stem, P.bg2, (1 - depth) * 0.6);
      x.strokeStyle = K.rgba(K.mix(col, P.ink, 0.3), 0.5);
      x.lineWidth = (2 + r() * 5) * (0.5 + depth);
      x.beginPath();
      let px = r() * W, py = H * (0.4 + r() * 0.5);
      x.moveTo(px, py);
      for (let s = 0; s < 8; s++) {
        const nx = px + (r() - 0.4) * W * 0.18;
        const ny = py - r() * H * 0.12;
        x.quadraticCurveTo(px + (r() - 0.5) * 60, (py + ny) / 2, nx, ny);
        px = nx; py = ny;
      }
      x.stroke();
    }
    x.restore();
  }

  /* ── HANGING canopy growth from the top. count scales with density. ── */
  function hangers(x, P, W, H, noise, r, n) {
    n = n == null ? K.rint(r, 5, 9) : n;
    for (let i = 0; i < n; i++) {
      const ox = W * (0.04 + (i / n) * 0.92 + (r() - 0.5) * 0.08);
      const len = H * (0.18 + r() * 0.4);
      const depth = 0.3 + r() * 0.35;
      const col = K.mix(P.stem, P.bg1, (1 - depth) * 0.5);
      x.save();
      x.strokeStyle = K.rgba(K.mix(col, P.ink, 0.35), 0.55);
      x.lineWidth = 2 + r() * 4; x.lineCap = 'round';
      x.beginPath(); x.moveTo(ox, 0);
      const sway = (r() - 0.5) * W * 0.08;
      let px = ox, py = 0;
      const segs = 6;
      for (let s = 1; s <= segs; s++) {
        const t = s / segs;
        const nx = ox + sway * t + Math.sin(t * 4 + i) * W * 0.02;
        const ny = len * t;
        x.quadraticCurveTo(px + (r() - 0.5) * 20, (py + ny) / 2, nx, ny);
        px = nx; py = ny;
      }
      x.stroke();
      const bells = K.rint(r, 2, 5);
      for (let b = 0; b < bells; b++) {
        const t = 0.4 + r() * 0.6;
        const bx = ox + sway * t + Math.sin(t * 4 + i) * W * 0.02;
        const by = len * t;
        const br = (8 + r() * 16) * (0.6 + depth);
        const hot = r() < 0.45 ? (r() < 0.5 ? P.bloom1 : P.bloom2) : K.mix(P.stem, P.glass, 0.4);
        const g = x.createRadialGradient(bx, by - br * 0.3, br * 0.1, bx, by, br);
        g.addColorStop(0, K.mix(hot, '#fff', 0.4));
        g.addColorStop(0.6, K.mix(hot, P.bg2, (1 - depth) * 0.3));
        g.addColorStop(1, K.mix(hot, P.ink, 0.5));
        x.fillStyle = g;
        x.beginPath();
        x.moveTo(bx, by - br * 1.1);
        x.quadraticCurveTo(bx + br, by - br * 0.2, bx, by + br * 0.9);
        x.quadraticCurveTo(bx - br, by - br * 0.2, bx, by - br * 1.1);
        x.fill();
        if (hot === P.bloom1 || hot === P.bloom2) K.bloom(x, bx, by, br * 2.2, hot, 0.14 + depth * 0.1);
      }
      x.restore();
    }
  }

  /* ── FOREGROUND framing foliage: a large out-of-focus plant rooted just past
       a BOTTOM corner, its broad leaves arcing up and over the frame edge. Soft
       dark green (not pure black), feathered, slightly translucent so it reads
       as near foliage the camera sits behind — not a hard geometric dart. ── */
  function framingFrond(x, P, W, H, r, side) {
    x.save();
    // root anchored low at the corner, off-frame
    const baseX = side < 0 ? -W * 0.04 : W * 1.04;
    const baseY = H * (0.96 + r() * 0.1);
    const col = K.mix(P.stem, P.ink, 0.62);     // dark emerald, NOT black
    const blades = K.rint(r, 4, 7);
    for (let i = 0; i < blades; i++) {
      // sweep UP and inward from the bottom corner, arcing over the edge
      const fl = H * (0.55 + r() * 0.5);
      const baseAng = side < 0 ? (-Math.PI * 0.62) : (-Math.PI * 0.38);
      const fa = baseAng + (r() - 0.5) * 0.7;
      const tipX = baseX + Math.cos(fa) * fl;
      const tipY = baseY + Math.sin(fa) * fl;
      const fw = W * (0.045 + r() * 0.06);
      // bow the blade so it curves like a frond rather than a straight spike
      const bow = (side < 0 ? 1 : -1) * fw * (1.4 + r());
      const mx = (baseX + tipX) / 2 + Math.cos(fa + Math.PI / 2) * fw + bow;
      const my = (baseY + tipY) / 2 + Math.sin(fa + Math.PI / 2) * fw;
      // soft shaded fill, faintly translucent at the tip
      const g = x.createLinearGradient(baseX, baseY, tipX, tipY);
      g.addColorStop(0, K.rgba(K.mix(col, P.ink, 0.4), 0.96));
      g.addColorStop(0.7, K.rgba(col, 0.9));
      g.addColorStop(1, K.rgba(K.mix(col, P.bg2, 0.5), 0.7));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(baseX, baseY);
      x.quadraticCurveTo(mx, my, tipX, tipY);
      x.quadraticCurveTo((baseX + tipX) / 2 - bow, (baseY + tipY) / 2 + fw * 0.4, baseX, baseY);
      x.fill();
      // faint central vein highlight
      x.strokeStyle = K.rgba(K.mix(col, P.glass, 0.3), 0.18); x.lineWidth = 2;
      x.beginPath(); x.moveTo(baseX, baseY); x.quadraticCurveTo(mx, my, tipX, tipY); x.stroke();
    }
    // a couple of hot bells nestled in the near foliage for a pop
    const bells = K.rint(r, 1, 3);
    for (let b = 0; b < bells; b++) {
      const bx = baseX + (side < 0 ? 1 : -1) * W * (0.06 + r() * 0.12);
      const by = baseY - H * (0.1 + r() * 0.3);
      const br = W * (0.018 + r() * 0.022);
      const hot = r() < 0.5 ? P.bloom1 : P.bloom2;
      K.bloom(x, bx, by, br * 3.2, hot, 0.32);
      const g = x.createRadialGradient(bx, by - br * 0.3, br * 0.1, bx, by, br);
      g.addColorStop(0, K.mix(hot, '#fff', 0.5)); g.addColorStop(0.6, hot); g.addColorStop(1, K.mix(hot, P.ink, 0.5));
      x.fillStyle = g; x.beginPath(); x.arc(bx, by, br, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }

  function pollen(x, P, W, H, rays, r, mult) {
    mult = mult || 1;
    x.save(); x.globalCompositeOperation = 'lighter';
    const amb = Math.floor(150 * mult);
    for (let i = 0; i < amb; i++) {
      const mx = r() * W, my = r() * H;
      const s = r() * 1.8 + 0.3;
      const c = r() < 0.4 ? P.ray : (r() < 0.6 ? P.glass : P.bloom1);
      x.fillStyle = K.rgba(c, 0.05 + r() * 0.22);
      x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill();
    }
    for (const ray of rays) {
      const drops = Math.floor(K.rint(r, 30, 55) * mult);
      for (let i = 0; i < drops; i++) {
        const t = r();
        const cx = ray.topX + Math.sin(ray.ang) * ray.len * t + (r() - 0.5) * ray.wBot * 1.6 * (0.3 + t);
        const cy = ray.topY + Math.cos(ray.ang) * ray.len * t;
        const s = r() * 2.6 + 0.4;
        const c = r() < 0.6 ? K.mix(P.ray, '#fff', 0.3) : P.glass;
        x.fillStyle = K.rgba(c, 0.18 + r() * 0.5);
        x.beginPath(); x.arc(cx, cy, s, 0, Math.PI * 2); x.fill();
      }
    }
    x.restore();
  }

  /* ── finishing atmosphere (shared) ── */
  function finish(x, P, W, H, r, noise) {
    K.mottle(x, 0, 0, W, H, P.bg2, 2600, r, 'overlay');
    K.grain(x, W, H, 520, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.36); x.restore();
    const tg = x.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, K.rgba(K.mix(P.bg1, '#000', 0.5), 0.3)); tg.addColorStop(0.35, 'rgba(0,0,0,0)');
    x.fillStyle = tg; x.fillRect(0, 0, W, H);
  }

  // helper: spread plant count from density target over a min/max envelope
  function dcount(density, min, max) { return Math.round(min + (max - min) * density); }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const D = p.density;
    const eclipse = p.event === 'Eclipse Bloom';
    const plantOpts = (extra) => Object.assign({ dom: p.dom, glow: eclipse ? 1.5 : 1 }, extra);

    // ============================================================ CANOPY (up)
    if (p.view === 'Canopy') {
      const hz = 0.92; // horizon very low — we look UP
      const lightX = 0.3 + r() * 0.4;
      airGradient(x, P, W, H, hz, lightX);
      const roofH = H * (0.55 + r() * 0.15);
      glassRoof(x, P, W, H, r, noise, p.arch, lightX, roofH);
      // rays pour from high above, near-vertical, slightly converging
      const rays = godRays(x, P, W, H, p.rayCount + 1, r, noise, { spread: 0.5, fat: 1.3, bright: 1.2, focusX: W * lightX });
      // towering plants shooting UP past the top edge, rooted low/off-frame
      hangers(x, P, W, H, noise, r, dcount(D, 4, 10));
      fog(x, P, W, H, noise, r, H * 0.85);
      const towers = dcount(D, 4, 9);
      for (let i = 0; i < towers; i++) {
        const bx = (i / towers) * W + (r() - 0.5) * W * 0.16;
        const by = H * (1.02 + r() * 0.08);
        const sc = 1.4 + r() * 0.7;
        plant(x, P, noise, bx, by, sc, 0.85 + r() * 0.15, r, plantOpts({ tall: 2.4 + r() * 1.4, lean: 0.4 }));
      }
      // a few mid towers behind
      const mid = dcount(D, 3, 7);
      for (let i = 0; i < mid; i++) {
        plant(x, P, noise, r() * W, H * (0.95 + r() * 0.1), 0.8 + r() * 0.4, 0.45 + r() * 0.2, r, plantOpts({ tall: 1.8 }));
      }
      pollen(x, P, W, H, rays, r, p.event === 'Pollen Storm' ? 2.2 : 1);
      x.save(); x.globalCompositeOperation = 'screen';
      K.hazeSheet(x, W, Math.floor(H * 0.6), noise, P.ray, 0.06, 260, 'screen'); x.restore();
      finish(x, P, W, H, r, noise);
      return { aspect: W / H, traits: traits(seed) };
    }

    // =================================================== AISLE / corridor view
    if (p.view === 'Aisle') {
      const vanX = 0.38 + r() * 0.24, vanY = 0.42 + r() * 0.08;
      const hz = vanY;
      airGradient(x, P, W, H, hz, vanX);
      const roofH = H * (vanY + 0.12);
      glassRoof(x, P, W, H, r, noise, p.arch, vanX, roofH);
      // rays converge toward the vanishing point — down the corridor
      const rays = godRays(x, P, W, H, p.rayCount, r, noise, { spread: 0.22, focusX: W * vanX, focusY: H * vanY, bright: 1.1 });
      fog(x, P, W, H, noise, r, H * vanY + H * 0.05);
      const van = aisleFloor(x, P, W, H, noise, r, vanX, vanY);
      // rows of plant-machines marching down BOTH sides, scaling with distance
      const rows = dcount(D, 5, 9);
      for (let row = rows; row >= 1; row--) {
        const t = row / rows;             // 1 far → toward 0 near
        const depthZ = 1 - t;             // near rows drawn last
        const ry = van.vy + (H - van.vy) * (1 - t * t);
        const sc = 0.3 + (1 - t) * 1.7;
        // left file: lerp from vanishing point (far) out to the near-left edge
        const lx = (W * vanX) + (W * 0.02 - W * vanX) * (1 - t) + (r() - 0.5) * W * 0.02;
        plant(x, P, noise, lx, ry, sc, 0.25 + depthZ * 0.7, r, plantOpts({}));
        // right file
        const rx = (W * vanX) + (W * 0.98 - W * vanX) * (1 - t) + (r() - 0.5) * W * 0.02;
        plant(x, P, noise, rx, ry, sc, 0.25 + depthZ * 0.7, r, plantOpts({}));
        // occasional centre specimen far down the aisle
        if (row > rows * 0.5 && r() < 0.4) {
          plant(x, P, noise, W * vanX + (r() - 0.5) * W * 0.05, ry, sc * 0.6, 0.2 + depthZ * 0.4, r, plantOpts({}));
        }
      }
      tubing(x, P, W, H, noise, r, 0.6);
      pollen(x, P, W, H, rays, r, p.event === 'Pollen Storm' ? 2.2 : 1);
      if (r() < 0.5) framingFrond(x, P, W, H, r, -1);
      if (r() < 0.5) framingFrond(x, P, W, H, r, 1);
      finish(x, P, W, H, r, noise);
      return { aspect: W / H, traits: traits(seed) };
    }

    // ===================================================== HERO colossus view
    if (p.view === 'Hero') {
      const hz = 0.7 + r() * 0.06;
      const heroSide = r() < 0.5 ? -1 : 1;
      const lightX = heroSide < 0 ? 0.62 + r() * 0.15 : 0.23 + r() * 0.15;
      airGradient(x, P, W, H, hz, lightX);
      const roofH = H * (0.32 + r() * 0.08);
      glassRoof(x, P, W, H, r, noise, p.arch, lightX, roofH);
      const rays = godRays(x, P, W, H, p.rayCount, r, noise, { spread: 0.3, focusX: W * lightX, bright: 1.15 });
      hangers(x, P, W, H, noise, r, dcount(D, 3, 7));
      fog(x, P, W, H, noise, r, H * hz);
      // background small plants
      const farN = dcount(D, 6, 14);
      for (let i = 0; i < farN; i++) {
        plant(x, P, noise, r() * W, H * (0.62 + r() * 0.12), 0.36 + r() * 0.18, 0.22 + r() * 0.14, r, plantOpts({}));
      }
      const fy = floorBed(x, P, W, H, noise, r, hz, 0.05);
      // mid companions clustered around the hero base
      const heroX = W * (heroSide < 0 ? 0.32 + r() * 0.08 : 0.6 + r() * 0.08);
      const midN = dcount(D, 4, 9);
      for (let i = 0; i < midN; i++) {
        const bx = r() * W;
        plant(x, P, noise, bx, fy + (r() - 0.3) * H * 0.06, 0.6 + r() * 0.3, 0.5 + r() * 0.2, r, plantOpts({}));
      }
      // THE COLOSSUS
      colossus(x, P, noise, heroX, H * 1.0, 1.1 + r() * 0.4, r, p.dom);
      // re-glow its rays in front
      tubing(x, P, W, H, noise, r, 0.85);
      pollen(x, P, W, H, rays, r, p.event === 'Pollen Storm' ? 2.2 : 1);
      if (r() < 0.55) framingFrond(x, P, W, H, r, -heroSide);
      finish(x, P, W, H, r, noise);
      return { aspect: W / H, traits: traits(seed) };
    }

    // ===================================================== FIELD (rows → fog)
    if (p.view === 'Field') {
      const hz = 0.4 + r() * 0.08;
      airGradient(x, P, W, H, hz, 0.5);
      const roofH = H * (hz + 0.05);
      glassRoof(x, P, W, H, r, noise, p.arch, 0.45 + r() * 0.1, roofH);
      const rays = godRays(x, P, W, H, p.rayCount, r, noise, { spread: 0.28, bright: 1.1 });
      fog(x, P, W, H, noise, r, H * hz);
      // distinct rows receding from horizon to bottom, each its own fog band
      const ROWS = 5;
      for (let row = 0; row < ROWS; row++) {
        const t = row / (ROWS - 1);           // 0 far → 1 near
        const ry = H * (hz + 0.04) + (H - H * (hz + 0.04)) * (t * 1.4 - t * t * 0.4);
        const depthZ = 0.15 + t * 0.78;
        const sc = 0.34 + t * t * 1.5;
        const perRow = dcount(D, 4, 9) + row;
        for (let i = 0; i < perRow; i++) {
          const bx = ((i + (row % 2) * 0.5) / perRow) * W + (r() - 0.5) * W * 0.04;
          plant(x, P, noise, bx, ry + (r() - 0.5) * H * 0.02, sc * (0.8 + r() * 0.4), depthZ, r, plantOpts({}));
        }
        // fog band between rows to separate them
        if (row < ROWS - 1) {
          x.save(); x.globalCompositeOperation = 'screen';
          const fb = x.createLinearGradient(0, ry - H * 0.03, 0, ry + H * 0.06);
          fb.addColorStop(0, 'rgba(0,0,0,0)');
          fb.addColorStop(0.5, K.rgba(K.mix(P.bg2, P.glass, 0.4), 0.12));
          fb.addColorStop(1, 'rgba(0,0,0,0)');
          x.fillStyle = fb; x.fillRect(0, ry - H * 0.03, W, H * 0.09); x.restore();
        }
      }
      tubing(x, P, W, H, noise, r, 0.8);
      pollen(x, P, W, H, rays, r, p.event === 'Pollen Storm' ? 2.2 : 1);
      finish(x, P, W, H, r, noise);
      return { aspect: W / H, traits: traits(seed) };
    }

    // ===================================================== CHAMBER (sparse) &
    // ===================================================== JUNGLE (packed) &
    // ===================================================== BED (default)
    // these share the frontal bed skeleton but differ hard in density/heights.
    const hz = p.view === 'Jungle' ? 0.62 + r() * 0.06 : 0.72 + r() * 0.05;
    const lightX = 0.4 + r() * 0.2;
    airGradient(x, P, W, H, hz, lightX);
    const roofH = H * (0.30 + r() * 0.08);
    glassRoof(x, P, W, H, r, noise, p.arch, lightX, roofH);
    let rays;
    if (p.arch === 'Broken Glass' && r() < 0.6) {
      rays = rakingRays(x, P, W, H, p.rayCount, r, noise, r() < 0.5);
    } else {
      rays = godRays(x, P, W, H, p.rayCount, r, noise, { spread: 0.34, focusX: W * lightX });
    }
    hangers(x, P, W, H, noise, r, dcount(D, 3, 11));
    fog(x, P, W, H, noise, r, H * hz);

    const farN = dcount(D, 4, 18);
    for (let i = 0; i < farN; i++) {
      const bx = r() * W, by = H * (hz - 0.12 + r() * 0.12);
      plant(x, P, noise, bx, by, 0.36 + r() * 0.16, 0.22 + r() * 0.14, r, plantOpts({}));
    }
    K.hazeSheet(x, W, H, noise, K.mix(P.bg2, P.glass, 0.45), 0.13, 320, 'screen');

    const fy = floorBed(x, P, W, H, noise, r, hz, 0.05);
    tubing(x, P, W, H, noise, r, 0.4);

    const midN = dcount(D, 2, 14);
    for (let i = 0; i < midN; i++) {
      const bx = r() * W, by = fy + (r() - 0.3) * H * 0.06;
      const tall = p.view === 'Jungle' ? 1.1 + r() * 0.5 : (0.9 + r() * 0.4);
      plant(x, P, noise, bx, by, 0.7 + r() * 0.28, 0.55 + r() * 0.2, r, plantOpts({ tall }));
    }
    K.hazeSheet(x, W, H, noise, K.mix(P.bg2, P.ray, 0.3), 0.06, 220, 'screen');

    const nearN = dcount(D, p.view === 'Chamber' ? 1 : 3, p.view === 'Jungle' ? 11 : 8);
    const hero = K.rint(r, 0, Math.max(0, nearN - 1));
    for (let i = 0; i < nearN; i++) {
      const bx = (i / Math.max(1, nearN)) * W + (r() - 0.5) * W * 0.14;
      const by = H * (0.98 + r() * 0.08);
      const tall = p.view === 'Jungle' ? 1.2 + r() * 0.6 : (0.85 + r() * 0.5);
      const sc = (i === hero ? 1.55 + r() * 0.5 : 1.15 + r() * 0.45);
      plant(x, P, noise, bx, by, sc, 0.88 + r() * 0.12, r, plantOpts({ tall }));
    }

    tubing(x, P, W, H, noise, r, 0.85);
    pollen(x, P, W, H, rays, r, p.event === 'Pollen Storm' ? 2.4 : 1);

    // chamber gets an asymmetric framing frond on one side to fill the quiet
    if (p.view === 'Chamber' && r() < 0.7) framingFrond(x, P, W, H, r, r() < 0.5 ? -1 : 1);
    if (p.view === 'Jungle') { if (r() < 0.6) framingFrond(x, P, W, H, r, -1); if (r() < 0.6) framingFrond(x, P, W, H, r, 1); }

    x.save(); x.globalCompositeOperation = 'screen';
    K.hazeSheet(x, W, Math.floor(H * 0.5), noise, P.ray, 0.05, 260, 'screen'); x.restore();
    finish(x, P, W, H, r, noise);

    return { aspect: W / H, traits: traits(seed) };
  }

  return { name: 't_conservatory', draw, traits };
})();


export const CONSERVATORY_ASPECTS: readonly number[] = [1.5,1,0.722];

export const conservatoryTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);

export const conservatorySchema: TraitSchema = {
  traits: [
    { name: "Palette", values: ["Malachite Heat","Conservatory Dusk","Teal Vault","Verdant Furnace","Viridian Bloom","Spore Emerald","Emerald Glasshouse","Jade Aurora"],
      subtraits: [
        { name: 'Hot Green', values: ['Malachite Heat', 'Verdant Furnace', 'Conservatory Dusk'] },
        { name: 'Cool Green', values: ['Teal Vault', 'Viridian Bloom', 'Spore Emerald', 'Emerald Glasshouse', 'Jade Aurora'] },
      ] },
    { name: "View", values: ["Hero","Aisle","Chamber","Jungle","Bed","Canopy","Field"],
      subtraits: [
        { name: 'Close', values: ['Hero', 'Bed', 'Chamber'] },
        { name: 'Wide', values: ['Aisle', 'Jungle', 'Canopy', 'Field'] },
      ] },
    { name: "Architecture", values: ["Terraces","Tunnel","Nave","Dome","Broken Glass"],
      subtraits: [
        { name: 'Intact', values: ['Terraces', 'Tunnel', 'Nave', 'Dome'] },
        { name: 'Ruined', values: ['Broken Glass'] },
      ] },
    { name: "Hall", values: ["Hall","Spire","Atrium"] },
    { name: "Flora", values: ["Vessels","Pods","Bulbs","Valves"] },
    { name: "Bloom", values: ["Globe","Trumpet","Star","Mixed"] },
    { name: "Density", values: ["Lush","Sparse","Teeming","Open"],
      subtraits: [
        { name: 'Open', values: ['Sparse', 'Open'] },
        { name: 'Full', values: ['Lush', 'Teeming'] },
      ] },
    { name: "Event", values: ["Eclipse Bloom","Pollen Storm","Bloomfall","Glass Bloom"],
      subtraits: [
        { name: 'Bloom', values: ['Eclipse Bloom', 'Bloomfall', 'Glass Bloom'] },
        { name: 'Storm', values: ['Pollen Storm'] },
      ] },
  ],
};

export const renderConservatory: EngineFn = (canvas, tokenId, width) => {
  const off = document.createElement('canvas');
  const res = ENGINE.draw(off, tokenId) || {};
  const W = Math.max(1, Math.floor(width));
  const H = Math.max(1, Math.round((W * off.height) / off.width));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(off, 0, 0, W, H);
  return { aspect: res.aspect || off.width / off.height, traits: ENGINE.traits(tokenId) };
};
