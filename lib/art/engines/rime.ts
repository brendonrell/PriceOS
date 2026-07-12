// @ts-nocheck
/*
 * Rime — PriceOS art engine (by opus4-8). Abstract generative system,
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


/* GLACIER — frost-crystal articulation across deep prussian fields (h3_glacier).
 * Crisp crystalline branching, faceted lattices, radial frost and columnar
 * seracs spreading over DEEP prussian-dark fields: cold suspended specks,
 * breath-fog, abstract crystal growth from empty centres. NO objects, NO
 * scene — pure form/field/light. Surreal real-but-off.
 *
 * MANDATED GRADE: LOW-KEY DARK prussian ground + HIGH-KEY icy-white frost =
 * HIGH-CONTRAST COLD. The image reads DARK with bright frost, never pale,
 * never murky. Crystal articulation must stay CRISP — no mushy overdraw.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette; KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Anchors of the Glacier world:
     #12283A deep prussian (GROUND) | #1E3A4F prussian shadow
     #A7C9CE pale aqua | #EAF4F6 bright frost white.
     Every palette: a DEEP dark ground + a BRIGHT frost accent. Different
     "weather" of the same cold world — none drift toward pale neutral. The
     LAST entry (Black Ice) is the RARE grail colorway. */
  const PALS = [
    { name: 'Deep Prussian', deep: '#0C1B29', ground: '#12283A', shade: '#1E3A4F', mid: '#3D6E7C', frost: '#A7C9CE', bright: '#EAF4F6', spark: '#FFFFFF', fog: '#244A5E' },
    { name: 'Aqua Crevasse', deep: '#0A1E26', ground: '#10303A', shade: '#1A4452', mid: '#3E8A93', frost: '#9FDCDE', bright: '#E6FBFB', spark: '#FFFFFF', fog: '#1E5460' },
    { name: 'Cobalt Floe',   deep: '#0B1730', ground: '#122446', shade: '#1E3568', mid: '#3C5CA0', frost: '#9FB8E6', bright: '#E8EFFC', spark: '#FFFFFF', fog: '#203A6E' },
    { name: 'Glacier Teal',  deep: '#08222A', ground: '#0E3340', shade: '#164A52', mid: '#2E9088', frost: '#9CE0C8', bright: '#E4FBF1', spark: '#FFFFFF', fog: '#155A55' },
    { name: 'Frost Dawn',    deep: '#101C2E', ground: '#1A2E44', shade: '#2A4866', mid: '#5A7AA0', frost: '#C2D4DE', bright: '#F2F7FA', spark: '#FFE9D6', fog: '#33506E' },
    { name: 'Iron Glacier',  deep: '#0E1620', ground: '#172530', shade: '#243744', mid: '#4E6D78', frost: '#AEC4C8', bright: '#EEF4F5', spark: '#FFFFFF', fog: '#2A4048' },
    // RARE grail colorway — near-black ground, electric cyan frost
    { name: 'Black Ice',     deep: '#04080C', ground: '#070F16', shade: '#0C1C26', mid: '#1C8C9E', frost: '#5FF0F0', bright: '#D6FFFF', spark: '#FFFFFF', fog: '#0A3038', rare: true },
  ];

  const MODES = [
    'Fern Veil', 'Spiral Bloom', 'Drift Field', 'Crevasse Seam',
    'Crystal Lattice', 'Breath Plume', 'Radial Starburst', 'Columnar Seracs',
    'Hex Frost Web', 'Dendrite Cascade',
  ];
  const FORMATS = [[1040, 1280], [1200, 1200], [1280, 1040]]; // portrait / square / landscape

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    // grail palette only on rare draws; otherwise pick from the 6 weather palettes
    const common = PALS.filter((p) => !p.rare);
    return K.pick(common, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);

    // ── rng order (traits MUST mirror) ──
    const rare = r() < 0.10;                          // grail seed?
    let pal = pickPal(r);
    if (rare && !undefined) pal = PALS.find((p) => p.rare);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── DEEP GROUND: dark prussian vertical wash, darker at edges ──
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, K.mix(pal.deep, pal.ground, 0.30));
    bg.addColorStop(0.5, pal.ground);
    bg.addColorStop(1, pal.deep);
    x.fillStyle = bg; x.fillRect(0, 0, W, H);
    // subtle large-scale cold field mottle in the ground (keeps it deep)
    x.save(); x.globalCompositeOperation = 'multiply';
    for (let i = 0; i < 60; i++) {
      const px = r() * W, py = r() * H, pr = S * (0.1 + r() * 0.3);
      K.bloom(x, px, py, pr, pal.deep, 0.04 + r() * 0.05);
    }
    x.restore();

    // authored focal point: off-centre, asymmetric (golden-ratio-ish placement)
    const fcx = W * (r() < 0.5 ? 0.30 + r() * 0.12 : 0.58 + r() * 0.12);
    const fcy = H * (0.32 + r() * 0.36);

    // colour ramp from dark→frost for the crystals (depth shading per branch).
    // Pushed harder toward bright at the tips → high-contrast articulation.
    function frostCol(depth, t) {
      // depth 0 = root (mid/aqua), high depth = bright frost tip
      const a = K.mix(pal.mid, pal.frost, K.clamp(depth, 0, 1));
      return K.mix(a, pal.bright, K.clamp(t, 0, 1) * 0.85);
    }

    // a thin dark "etch" stroke under a crystal stroke → crisp separation from
    // ground & from neighbours (kills the murky overlap-mush look).
    function etch(x0, y0, x1, y1, w) {
      x.strokeStyle = K.rgba(pal.deep, 0.5);
      x.lineWidth = w + 1.6;
      x.lineCap = 'round';
      x.beginPath(); x.moveTo(x0, y0); x.lineTo(x1, y1); x.stroke();
    }

    // ── FROST FERN: recursive crystalline branch with articulated side-spines ──
    // Crisp fractal rib (no mushy overdraw). draws from (sx,sy) along ang, len.
    // `sharp` (0..1) tightens spread + raises contrast for cleaner dendrites.
    // terminal crystalline barb: a short STRAIGHT spine with tiny sub-barbs.
    // straight (no curl) → crisp dendrite tips, never mushy. Replaces deep
    // recursion so big ferns don't overdraw into fabric.
    function barb(bx, by, ang, len, w, depth, detail) {
      const ex = bx + Math.cos(ang) * len, ey = by + Math.sin(ang) * len;
      etch(bx, by, ex, ey, Math.max(0.6, w));
      x.strokeStyle = K.rgba(frostCol(depth + 0.5, 0.85), 0.95);
      x.lineWidth = Math.max(0.5, w); x.lineCap = 'round';
      x.beginPath(); x.moveTo(bx, by); x.lineTo(ex, ey); x.stroke();
      // optional single tiny sub-barb pair midway → light snow-crystal detail.
      // off by default so fishbone fronds stay clean (no fabric build-up).
      if (detail) {
        const mx = bx + Math.cos(ang) * len * 0.55, my = by + Math.sin(ang) * len * 0.55;
        for (const s of [-1, 1]) {
          const a2 = ang + s * 0.55;
          x.strokeStyle = K.rgba(pal.bright, 0.7); x.lineWidth = Math.max(0.4, w * 0.55);
          x.beginPath(); x.moveTo(mx, my); x.lineTo(mx + Math.cos(a2) * len * 0.38, my + Math.sin(a2) * len * 0.38); x.stroke();
        }
      }
      // bright tip spark
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(pal.bright, 0.5);
      x.beginPath(); x.arc(ex, ey, Math.max(0.5, w * 0.8), 0, 7); x.fill();
      x.restore();
    }

    function fern(sx, sy, ang, len, wid, depth, gen, sharp) {
      sharp = sharp == null ? 0.65 : sharp;
      if (gen <= 0 || len < S * 0.011) return;
      const steps = Math.max(4, Math.floor(len / (S * 0.013)));
      let cx0 = sx, cy0 = sy, a = ang;
      const tipT = (5 - gen) / 5;
      // place discrete side-spines at SPARSE regular nodes → clean fishbone
      // dendrite, never a dense feather/fabric. big ribs space barbs wider.
      const nodeEvery = gen >= 5 ? 4 : gen >= 4 ? 3 : 2;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        // gentle curl driven by curl-noise → weightless spiral feel.
        // sharper crystals curl LESS (straighter, more faceted).
        const c = K.curl(noise, cx0 * 1.1, cy0 * 1.1, 1);
        a += c[0] * (0.13 - sharp * 0.09);
        const seg = len / steps;
        const nx = cx0 + Math.cos(a) * seg;
        const ny = cy0 + Math.sin(a) * seg;
        const w = wid * (1 - t * 0.62);
        const col = frostCol(depth + t * 0.45, tipT * (0.32 + t * 0.68));
        // crisp dark etch under the thicker ribs → separation, contrast
        if (w > 0.9) etch(cx0, cy0, nx, ny, Math.max(0.6, w));
        // main rib — crisp bright frost. lower base alpha so stacked ribs in a
        // dense fern don't saturate to a white blob.
        x.strokeStyle = K.rgba(col, 0.48 + 0.40 * tipT * (0.5 + sharp * 0.5));
        x.lineWidth = Math.max(0.5, w);
        x.lineCap = 'round';
        x.beginPath(); x.moveTo(cx0, cy0); x.lineTo(nx, ny); x.stroke();
        // tight glow only on the THICKEST ribs (frost catching light), low spread
        if (w > 1.8) {
          x.save(); x.globalCompositeOperation = 'lighter';
          x.strokeStyle = K.rgba(K.mix(col, pal.bright, 0.6), 0.09);
          x.lineWidth = w * 1.5;
          x.beginPath(); x.moveTo(cx0, cy0); x.lineTo(nx, ny); x.stroke();
          x.restore();
        }
        // discrete side spines at nodes — the crystalline fern law.
        // recurse only while big; the LAST two generations become straight
        // crystalline barbs (no curl, no overdraw) → crisp dendrite tips.
        if (gen >= 2 && i % nodeEvery === 0 && t < 0.92) {
          const sideLen = len * (0.28 + 0.24 * (1 - t));
          const spread = (0.55 + 0.20 * tipT) * (1 - sharp * 0.18);
          for (const sgn of [-1, 1]) {
            // only the TOP generation recurses into a sub-fern; everything below
            // is a straight crystalline barb → skeletal dendrite, never a filled
            // fabric leaf. keeps big structural ferns crisp & high-contrast.
            // gen 5 → recurse one level into sub-fronds; gen<=4 → clean fishbone
            // barbs (detail sub-barbs only on the secondary ribs of a sub-frond).
            if (gen <= 4) barb(nx, ny, a + sgn * spread, sideLen * 0.95, w * 0.62, depth + 0.2, gen === 4);
            else fern(nx, ny, a + sgn * spread, sideLen, w * 0.56, depth + 0.2, gen - 1, sharp);
          }
        }
        cx0 = nx; cy0 = ny;
      }
      // bright crystalline tip spark
      x.save(); x.globalCompositeOperation = 'lighter';
      x.fillStyle = K.rgba(pal.bright, 0.5 * tipT + 0.14);
      x.beginPath(); x.arc(cx0, cy0, Math.max(0.6, wid * 0.7), 0, 7); x.fill();
      x.restore();
    }

    // a radial burst of ferns growing OUTWARD from an empty centre
    function bloom(cx, cy, count, baseLen, gen, angOff, sharp) {
      // empty centre — only a faint, TIGHT cold core glow, no solid mass
      K.bloom(x, cx, cy, baseLen * 0.30, pal.frost, 0.05);
      for (let i = 0; i < count; i++) {
        const ang = angOff + (i / count) * Math.PI * 2 + (r() - 0.5) * 0.4;
        const len = baseLen * (0.6 + r() * 0.7);
        // start a bit OUT from centre → hollow heart
        const r0 = baseLen * (0.10 + r() * 0.12);
        fern(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0, ang, len, 2.4, 0, gen, sharp);
      }
    }

    // ── RADIAL STARBURST FROST: a six-fold faceted snow-crystal star, each arm a
    // crisp straight spine with regular barbs (sharp, high-contrast, NO mush). ──
    function starburst(cx, cy, rad, arms, sharp) {
      arms = arms || 6;
      const baseAng = r() * Math.PI * 2;
      K.bloom(x, cx, cy, rad * 0.22, pal.frost, 0.06);
      for (let k = 0; k < arms; k++) {
        const ang = baseAng + (k / arms) * Math.PI * 2;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        const len = rad * (0.78 + r() * 0.26);
        // main faceted spine
        const ex = cx + dx * len, ey = cy + dy * len;
        etch(cx, cy, ex, ey, 2.4);
        const grad = x.createLinearGradient(cx, cy, ex, ey);
        grad.addColorStop(0, K.rgba(pal.mid, 0.85));
        grad.addColorStop(1, K.rgba(pal.bright, 0.98));
        x.strokeStyle = grad; x.lineWidth = 2.4; x.lineCap = 'round';
        x.beginPath(); x.moveTo(cx, cy); x.lineTo(ex, ey); x.stroke();
        // regular barbs along the spine (faceted dendrite law)
        const barbs = 3 + (r() * 2 | 0);
        for (let b = 1; b <= barbs; b++) {
          const bt = b / (barbs + 1);
          const bx = cx + dx * len * bt, by = cy + dy * len * bt;
          const blen = len * (0.30 + 0.22 * (1 - bt));
          const spread = 0.50 + 0.10 * sharp;
          for (const sgn of [-1, 1]) {
            const ba = ang + sgn * spread;
            const bex = bx + Math.cos(ba) * blen, bey = by + Math.sin(ba) * blen;
            etch(bx, by, bex, bey, 1.2);
            x.strokeStyle = K.rgba(K.mix(pal.frost, pal.bright, bt), 0.9);
            x.lineWidth = 1.2; x.lineCap = 'round';
            x.beginPath(); x.moveTo(bx, by); x.lineTo(bex, bey); x.stroke();
            // secondary mini-barbs → crystal detail
            const m1x = bx + Math.cos(ba) * blen * 0.5, m1y = by + Math.sin(ba) * blen * 0.5;
            for (const s2 of [-1, 1]) {
              const ma = ba + s2 * 0.5;
              x.strokeStyle = K.rgba(pal.bright, 0.7);
              x.lineWidth = 0.7;
              x.beginPath(); x.moveTo(m1x, m1y); x.lineTo(m1x + Math.cos(ma) * blen * 0.32, m1y + Math.sin(ma) * blen * 0.32); x.stroke();
            }
          }
        }
        // bright tip spark
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(pal.bright, 0.55);
        x.beginPath(); x.arc(ex, ey, 1.6, 0, 7); x.fill();
        x.restore();
      }
      // faceted hexagon outline through arm tips → lattice read
      if (arms === 6) {
        x.save(); x.globalCompositeOperation = 'lighter';
        x.strokeStyle = K.rgba(pal.frost, 0.10); x.lineWidth = 1;
        x.beginPath();
        for (let k = 0; k <= arms; k++) {
          const ang = baseAng + (k / arms) * Math.PI * 2;
          const px = cx + Math.cos(ang) * rad * 0.55, py = cy + Math.sin(ang) * rad * 0.55;
          if (k === 0) x.moveTo(px, py); else x.lineTo(px, py);
        }
        x.stroke(); x.restore();
      }
    }

    // ── COLUMNAR SERACS: vertical ice columns (faceted prisms) standing in a
    // field — crisp lit faces + dark shaded faces = high contrast structure. ──
    function serac(cx, top, bot, halfW, lean) {
      const h = bot - top;
      const xt = cx + lean * h, xb = cx;            // slight lean
      // shaded (dark) side face — gives the column volume
      x.fillStyle = K.rgba(pal.shade, 0.85);
      x.beginPath();
      x.moveTo(xt - halfW, top); x.lineTo(xt, top - halfW * 0.5);
      x.lineTo(xb, bot - halfW * 0.5); x.lineTo(xb - halfW, bot);
      x.closePath(); x.fill();
      // lit (bright) front face
      const litGrad = x.createLinearGradient(xt, top, xb, bot);
      litGrad.addColorStop(0, K.rgba(pal.bright, 0.9));
      litGrad.addColorStop(1, K.rgba(pal.mid, 0.75));
      x.fillStyle = litGrad;
      x.beginPath();
      x.moveTo(xt, top - halfW * 0.5); x.lineTo(xt + halfW, top);
      x.lineTo(xb + halfW, bot); x.lineTo(xb, bot - halfW * 0.5);
      x.closePath(); x.fill();
      // crisp bright top facet edge
      x.strokeStyle = K.rgba(pal.spark, 0.7); x.lineWidth = 1.2; x.lineCap = 'round';
      x.beginPath(); x.moveTo(xt - halfW, top); x.lineTo(xt, top - halfW * 0.5); x.lineTo(xt + halfW, top); x.stroke();
      // dark vertical edge between faces → separation
      x.strokeStyle = K.rgba(pal.deep, 0.6); x.lineWidth = 1;
      x.beginPath(); x.moveTo(xt, top - halfW * 0.5); x.lineTo(xb, bot - halfW * 0.5); x.stroke();
      // bright fracture lines down the lit face (crystal detail)
      for (let f = 0; f < 2; f++) {
        const fx = 0.3 + r() * 0.5;
        x.strokeStyle = K.rgba(pal.frost, 0.3); x.lineWidth = 0.7;
        x.beginPath();
        x.moveTo(xt + halfW * fx, top + h * 0.1);
        x.lineTo(xb + halfW * (fx - 0.1), bot - h * 0.05);
        x.stroke();
      }
    }

    // ── suspended cold specks (frost dust in the air) ──
    function specks(n, alpha) {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (let i = 0; i < n; i++) {
        const sx = r() * W, sy = r() * H;
        const sz = r() < 0.85 ? 0.6 + r() * 1.2 : 1.4 + r() * 2.2;
        const c = r() < 0.3 ? pal.frost : pal.bright;
        x.fillStyle = K.rgba(c, (0.12 + r() * 0.5) * alpha);
        x.beginPath(); x.arc(sx, sy, sz, 0, 7); x.fill();
        if (sz > 1.6) K.bloom(x, sx, sy, sz * 5, pal.bright, 0.06 * alpha);
      }
      x.restore();
    }

    // breath-fog band: a soft cold plume drifting across (kept controlled so it
    // never bleaches the frame — low opacity, dark-leaning fog colour).
    function breathFog(cx, cy, w, h, ang, op) {
      op = op || 0.06;
      x.save(); x.globalCompositeOperation = 'screen';
      const steps = 26;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        const px = cx + Math.cos(ang) * (t - 0.5) * w + (noise.fbm(t * 3, seed * 0.1, 3)) * w * 0.2;
        const py = cy + Math.sin(ang) * (t - 0.5) * w + (noise.fbm(t * 3 + 9, seed * 0.1, 3)) * h * 0.5;
        const rr = h * (0.5 + 0.5 * Math.sin(t * Math.PI));
        K.bloom(x, px, py, rr, K.mix(pal.fog, pal.frost, 0.3), op);
      }
      x.restore();
    }

    // ── COMPOSE per mode ──
    if (mode === 'Fern Veil') {
      // a few large CRISP ferns sweeping across a deep field, one dominant.
      // sharper ferns + a clear empty lower field → no murk.
      // ONE dominant LEANING dendrite frond sweeping diagonally across the field
      // (asymmetric, like hoarfrost on glass) + a hero starburst + scattered
      // crisp satellites. diagonal lean breaks the dense vertical-feather blob.
      const leanDir = r() < 0.5 ? 1 : -1;
      const bx = W * (leanDir > 0 ? 0.18 + r() * 0.14 : 0.68 + r() * 0.14);
      const by = H * (0.80 + r() * 0.12);
      const aim = -Math.PI / 2 + leanDir * (0.45 + r() * 0.25); // strong diagonal
      fern(bx, by, aim, S * (0.58 + r() * 0.26), 3.2, 0, 5, 0.92);
      // a hero six-fold star caught in the veil
      starburst(W * (0.45 + r() * 0.3), H * (0.30 + r() * 0.3), S * (0.08 + r() * 0.06), 6, 0.85);
      // scattered crisp satellite crystals, well separated (no clumping)
      for (let i = 0; i < 3 + (r() * 3 | 0); i++) {
        const sxp = W * (0.10 + r() * 0.8), syp = H * (0.18 + r() * 0.7);
        if (r() < 0.4) starburst(sxp, syp, S * (0.035 + r() * 0.03), 6, 0.82);
        else fern(sxp, syp, r() * 6.28, S * (0.12 + r() * 0.12), 1.6, 0.2, 4, 0.88);
      }
    } else if (mode === 'Spiral Bloom') {
      // crisp skeletal frost ferns radiating OUTWARD from a hollow centre on a
      // logarithmic spiral → weightless bloom, NOT a fabric disk. high sharpness
      // + generous spacing keeps every frond articulated and the centre empty.
      const cnt = 6 + (r() * 3 | 0);
      const spin = (r() < 0.5 ? 1 : -1);
      const angOff = r() * 6.28;
      const baseLen = S * (0.34 + r() * 0.16);
      K.bloom(x, fcx, fcy, baseLen * 0.26, pal.frost, 0.06);
      for (let i = 0; i < cnt; i++) {
        const ph = i / cnt;
        const ang = angOff + ph * Math.PI * 2 + spin * ph * 0.9; // spiral twist
        const len = baseLen * (0.82 + r() * 0.4);
        const r0 = baseLen * (0.16 + r() * 0.08); // hollow heart
        fern(fcx + Math.cos(ang) * r0, fcy + Math.sin(ang) * r0, ang + spin * 0.25, len, 2.6, 0, 5, 0.9);
      }
      // a small satellite bloom for asymmetry
      if (r() < 0.6) {
        const sxp = W * (0.2 + r() * 0.6), syp = H * (0.2 + r() * 0.6);
        const sc = 4 + (r() * 2 | 0), so = r() * 6.28, sl = S * (0.13 + r() * 0.07);
        for (let i = 0; i < sc; i++) {
          const ang = so + (i / sc) * Math.PI * 2 + spin * (i / sc) * 0.8;
          fern(sxp + Math.cos(ang) * sl * 0.2, syp + Math.sin(ang) * sl * 0.2, ang, sl, 1.6, 0.2, 4, 0.88);
        }
      }
    } else if (mode === 'Drift Field') {
      // many small CRISP ferns drifting in a current → field of frost.
      // higher sharpness + dark etch keeps each crystal distinct (no fog-mush).
      const N = 16 + (r() * 10 | 0);
      const flow = r() * 6.28;
      for (let i = 0; i < N; i++) {
        const bx = r() * W, by = r() * H;
        const c = K.curl(noise, bx, by, 1);
        const ang = Math.atan2(c[1], c[0]) + flow * 0.1;
        fern(bx, by, ang, S * (0.07 + r() * 0.14), 1.4, 0.25, 3 + (r() < 0.3 ? 1 : 0), 0.82);
      }
      // a few brighter standout crystals catching light
      for (let i = 0; i < 3 + (r() * 3 | 0); i++) {
        starburst(r() * W, r() * H, S * (0.05 + r() * 0.05), 6, 0.8);
      }
    } else if (mode === 'Crevasse Seam') {
      // ferns crystallising along a vertical-ish seam (negative space either side)
      const sx = W * (0.32 + r() * 0.36);
      const segs = 7 + (r() * 5 | 0);
      for (let i = 0; i < segs; i++) {
        const t = i / segs;
        const sy = H * (0.06 + t * 0.88);
        const wob = Math.sin(t * 6 + seed) * W * 0.06 + (noise.fbm(t * 4, 1, 3)) * W * 0.05;
        const side = i % 2 === 0 ? 1 : -1;
        fern(sx + wob, sy, side > 0 ? -0.3 : Math.PI + 0.3, S * (0.17 + r() * 0.18), 2.2, 0.1, 4, 0.9);
      }
      // bright cold seam crack down the middle (high-contrast spine)
      x.save(); x.globalCompositeOperation = 'lighter';
      x.strokeStyle = K.rgba(pal.frost, 0.20); x.lineWidth = 2;
      x.beginPath();
      for (let i = 0; i <= 40; i++) {
        const t = i / 40; const sy = H * (0.03 + t * 0.94);
        const wob = Math.sin(t * 6 + seed) * W * 0.06 + (noise.fbm(t * 4, 1, 3)) * W * 0.05;
        if (i === 0) x.moveTo(sx + wob, sy); else x.lineTo(sx + wob, sy);
      }
      x.stroke(); x.restore();
      const seam = x.createLinearGradient(sx - W * 0.1, 0, sx + W * 0.1, 0);
      seam.addColorStop(0, K.rgba(pal.fog, 0)); seam.addColorStop(0.5, K.rgba(pal.frost, 0.06)); seam.addColorStop(1, K.rgba(pal.fog, 0));
      x.fillStyle = seam; x.fillRect(sx - W * 0.1, 0, W * 0.2, H);
    } else if (mode === 'Crystal Lattice') {
      // a hexagonal-ish scatter of small radial blooms → snow-crystal lattice
      const cols = 3 + (r() * 2 | 0), rows = 3 + (r() * 2 | 0);
      for (let cxi = 0; cxi < cols; cxi++) {
        for (let cyi = 0; cyi < rows; cyi++) {
          if (r() < 0.25) continue; // gaps → negative space
          const gx = W * ((cxi + 0.5) / cols) + (r() - 0.5) * W * 0.08;
          const gy = H * ((cyi + 0.5) / rows) + (r() - 0.5) * H * 0.08;
          // mix blooms & crisp starbursts for variety
          if (r() < 0.45) starburst(gx, gy, S * (0.05 + r() * 0.05), 6, 0.78);
          else bloom(gx, gy, 6, S * (0.06 + r() * 0.05), 3, r() * 6.28, 0.72);
        }
      }
    } else if (mode === 'Radial Starburst') {
      // one or two dominant six-fold frost stars on a deep field + small ones
      starburst(fcx, fcy, S * (0.30 + r() * 0.14), 6, 0.85);
      if (r() < 0.6) starburst(W * (0.2 + r() * 0.6), H * (0.2 + r() * 0.6), S * (0.12 + r() * 0.08), 6, 0.82);
      for (let i = 0; i < 4 + (r() * 4 | 0); i++) {
        starburst(r() * W, r() * H, S * (0.04 + r() * 0.05), 6, 0.8);
      }
    } else if (mode === 'Columnar Seracs') {
      // a row of faceted ice columns standing in the lower field, varied heights
      const n = 4 + (r() * 4 | 0);
      const baseY = H * (0.62 + r() * 0.18);
      // sort by x so nearer (taller) ones can sit front — simple depth read
      const cols = [];
      for (let i = 0; i < n; i++) cols.push({ cx: W * (0.10 + 0.80 * ((i + r() * 0.6) / n)), h: H * (0.22 + r() * 0.34), hw: S * (0.025 + r() * 0.03), lean: (r() - 0.5) * 0.06 });
      cols.sort((a, b) => (a.h - b.h));
      for (const c of cols) serac(c.cx, baseY - c.h, baseY + S * 0.02, c.hw, c.lean);
      // a faint cold ground-glow at the base of the seracs
      K.bloom(x, W * 0.5, baseY, W * 0.5, pal.frost, 0.04);
      // scattered tiny starbursts above for atmosphere
      for (let i = 0; i < 3 + (r() * 3 | 0); i++) starburst(r() * W, H * (0.1 + r() * 0.4), S * 0.035, 6, 0.8);
    } else if (mode === 'Hex Frost Web') {
      // a faceted lattice WEB: nodes connected by bright frost filaments →
      // crystalline network, high-contrast lines over deep ground.
      const gx = 3 + (r() * 2 | 0), gy = 4 + (r() * 2 | 0);
      const nodes = [];
      for (let i = 0; i <= gx; i++) for (let j = 0; j <= gy; j++) {
        const off = (j % 2) * (W / gx) * 0.5;
        nodes.push({
          x: (i / gx) * W + off + (r() - 0.5) * W * 0.05,
          y: (j / gy) * H + (r() - 0.5) * H * 0.05,
          on: r() < 0.82,
        });
      }
      const at = (i, j) => nodes[i * (gy + 1) + j];
      // connect neighbours with etched bright filaments
      for (let i = 0; i <= gx; i++) for (let j = 0; j <= gy; j++) {
        const a = at(i, j); if (!a || !a.on) continue;
        const links = [];
        if (i < gx) links.push(at(i + 1, j));
        if (j < gy) links.push(at(i, j + 1));
        if (i < gx && j < gy && r() < 0.5) links.push(at(i + 1, j + 1));
        for (const b of links) {
          if (!b || !b.on) continue;
          etch(a.x, a.y, b.x, b.y, 1.4);
          const g = x.createLinearGradient(a.x, a.y, b.x, b.y);
          g.addColorStop(0, K.rgba(pal.frost, 0.85)); g.addColorStop(1, K.rgba(pal.bright, 0.9));
          x.strokeStyle = g; x.lineWidth = 1.3; x.lineCap = 'round';
          x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
        }
      }
      // bright crystal node sparks + small starbursts on some nodes
      for (const nd of nodes) {
        if (!nd.on) continue;
        x.save(); x.globalCompositeOperation = 'lighter';
        x.fillStyle = K.rgba(pal.bright, 0.6);
        x.beginPath(); x.arc(nd.x, nd.y, 1.8, 0, 7); x.fill();
        x.restore();
        if (r() < 0.18) starburst(nd.x, nd.y, S * 0.05, 6, 0.82);
      }
    } else if (mode === 'Breath Plume') {
      // a soft cold plume of breath-fog with CRISP frost crystals suspended in
      // it — the fog is faint atmosphere, the crystals are the heroes (no murk).
      breathFog(W * 0.5, fcy, W * 0.7, S * 0.18, (r() - 0.5) * 0.5, 0.045);
      if (r() < 0.6) breathFog(W * (0.3 + r() * 0.4), fcy + H * 0.12, W * 0.45, S * 0.13, (r() - 0.5) * 0.5, 0.04);
      // hero crystals floating in the plume — a dominant starburst + ferns
      starburst(fcx, fcy, S * (0.16 + r() * 0.08), 6, 0.85);
      for (let i = 0; i < 5 + (r() * 4 | 0); i++) {
        const bx = W * (0.18 + r() * 0.64), by = fcy + (r() - 0.5) * H * 0.34;
        if (r() < 0.4) starburst(bx, by, S * (0.04 + r() * 0.04), 6, 0.82);
        else fern(bx, by, -Math.PI / 2 + (r() - 0.5) * 1.4, S * (0.10 + r() * 0.12), 1.5, 0.25, 4, 0.78);
      }
    } else { // Dendrite Cascade
      // ONE dominant hoarfrost dendrite creeping in from a top corner across the
      // glass, with a couple of small satellites → strong asymmetric structure,
      // big clear negative space. high sharpness keeps it skeletal & crisp.
      const fromLeft = r() < 0.5;
      const ax = fromLeft ? W * (0.12 + r() * 0.12) : W * (0.76 + r() * 0.12);
      const aim = fromLeft ? (0.35 + r() * 0.25) : (Math.PI - 0.35 - r() * 0.25); // diagonal down-in
      fern(ax, -S * 0.03, aim, S * (0.62 + r() * 0.22), 3.6, 0, 5, 0.92);
      // a hero star + scatter so the frame never reads thin on pale palettes
      starburst(W * (fromLeft ? 0.62 : 0.30) + (r() - 0.5) * W * 0.12, H * (0.52 + r() * 0.2), S * (0.06 + r() * 0.05), 6, 0.85);
      // small satellite dendrites along the opposite/lower field for balance
      for (let i = 0; i < 1 + (r() * 2 | 0); i++) {
        const sxp = fromLeft ? W * (0.55 + r() * 0.35) : W * (0.10 + r() * 0.35);
        const syp = H * (0.45 + r() * 0.45);
        fern(sxp, syp, (fromLeft ? Math.PI : 0) + (r() - 0.5) * 0.6, S * (0.16 + r() * 0.14), 1.8, 0.2, 4, 0.88);
      }
      // a faint cold glow trailing the main dendrite root
      K.bloom(x, ax, H * 0.05, S * 0.3, pal.frost, 0.05);
    }

    // suspended cold specks everywhere (atmosphere) — more in rare seeds
    specks(rare ? 320 : 180, rare ? 1.1 : 0.85);

    // ── ATMOSPHERE & TEXTURE (haze WITHOUT bleaching) ──
    // cold haze sheet — use a deep-ish cold colour so it adds air, not bleach.
    // a touch lighter than before so crystals stay crisp and ground stays dark.
    const hazeCol = K.mix(pal.fog, pal.shade, 0.45);
    K.hazeSheet(x, W, H, noise, hazeCol, rare ? 0.12 : 0.15, S * 0.85, 'screen');
    // a second, very faint bright haze only for depth
    K.hazeSheet(x, W, H, noise, pal.frost, 0.05, S * 1.4, 'screen');

    // re-deepen the ground edges so the picture stays LOW-KEY DARK (no fog bleach).
    // capped centre brightness (start at 0.86 not pure white) so bright modes
    // can NEVER blow out to a pale frame — this kills the bleached blowout.
    x.save(); x.globalCompositeOperation = 'multiply';
    const deepen = x.createRadialGradient(fcx, fcy, S * 0.18, W / 2, H / 2, Math.max(W, H) * 0.70);
    deepen.addColorStop(0, 'rgba(255,255,255,0.92)');
    deepen.addColorStop(0.65, K.rgba(K.mix(pal.ground, pal.deep, 0.4), 1));
    deepen.addColorStop(1, K.rgba(pal.deep, 1));
    x.fillStyle = deepen; x.fillRect(0, 0, W, H);
    x.restore();

    // global contrast lift: darken the deepest tones a touch more (multiply a
    // subtle dark vignette band of the GROUND colour over the corners) so the
    // dark/bright separation reads strong across the room.
    x.save(); x.globalCompositeOperation = 'multiply';
    const corner = x.createRadialGradient(W / 2, H / 2, S * 0.30, W / 2, H / 2, Math.max(W, H) * 0.85);
    corner.addColorStop(0, 'rgba(255,255,255,1)');
    corner.addColorStop(1, K.rgba(pal.deep, 0.55));
    x.fillStyle = corner; x.fillRect(0, 0, W, H);
    x.restore();

    // material mottle on the whole field (frost crystal grain)
    K.mottle(x, 0, 0, W, H, pal.shade, 30, r, 'overlay');
    K.grain(x, W, H, 4.2, r);
    K.vignette(x, W, H, rare ? 0.5 : 0.44);

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const rare = r() < 0.10;
    let pal = pickPal(r);
    if (rare && !undefined) pal = PALS.find((p) => p.rare);
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    const weatherMap = {
      'Deep Prussian': 'Deep Freeze', 'Aqua Crevasse': 'Meltwater', 'Cobalt Floe': 'Polar Night',
      'Glacier Teal': 'Ice Bloom', 'Frost Dawn': 'First Light', 'Iron Glacier': 'Hard Frost', 'Black Ice': 'Black Ice',
    };
    return { Palette: pal.name, Mode: mode, Format: f, Weather: weatherMap[pal.name], Grail: pal.rare ? 'Yes' : 'No' };
  }

  return { name: 'h3_glacier', draw, traits };
})();


export const rimeTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderRime: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const RIME_ASPECTS: readonly number[] = [0.8125,1,1.2308];
export const rimeSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Cobalt Floe",
        "Glacier Teal",
        "Frost Dawn",
        "Iron Glacier",
        "Deep Prussian",
        "Aqua Crevasse",
        "Black Ice"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Drift Field",
        "Columnar Seracs",
        "Crystal Lattice",
        "Dendrite Cascade",
        "Crevasse Seam",
        "Radial Starburst",
        "Breath Plume",
        "Spiral Bloom",
        "Hex Frost Web",
        "Fern Veil"
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
      "name": "Weather",
      "values": [
        "Polar Night",
        "Ice Bloom",
        "First Light",
        "Hard Frost",
        "Deep Freeze",
        "Meltwater",
        "Black Ice"
      ]
    },
    {
      "name": "Grail",
      "values": [
        "No",
        "Yes"
      ]
    }
  ]
};
