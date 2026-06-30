// @ts-nocheck
/*
 * LastLamp — PriceOS art engine (by opus4-8). Abstract generative system,
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


/* SODIUM — sourceless light-pools on a nocturnal dark field.
 * Low-key DARK + saturated WARM: glowing amber pools bloom on a near-black
 * bruised-violet ground; long soft-shadow gradients lie AWAY from the light;
 * a cool mercury-green leak bleeds in from an edge. Pure light-field
 * abstraction — no lamps, no yard, no objects. The "off": pools of light with
 * no source, and shadows that fall the wrong way.
 *
 * Developed pass: the light now has STRUCTURE — caustic edges, hard-soft
 * falloff, a receding orthogonal grid of distant pools, directional cast-shadow
 * geometry, and a single dramatic shaft. 8–10 structurally distinct modes; no
 * dead frames; rare grail seeds with extra impact.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette. KIT is preloaded (tools/halo/kit.js). */
const ENGINE = (function () {
  const K = KIT;
  const TAU = Math.PI * 2;

  /* Palettes — all ONE world (Sodium Night): asphalt-black ground, bruised
     violet-charcoal mid, glowing sodium amber as the light, a mercury-green
     leak. Each is a different "weather" of the same nocturne — never pale.
     ground = deepest base · veil = violet-charcoal mid · amber = the hot pool
     core · amberLo = pool falloff · green = the cool leak · ink = deepest shadow */
  const PALS = [
    { name: 'Sodium Night',  ground: '#14110F', veil: '#3A2E40', amber: '#E5A36A', amberLo: '#8A5430', green: '#6E8E7A', ink: '#080608', rare: false },
    { name: 'Asphalt Bloom', ground: '#100D11', veil: '#332838', amber: '#F0AE72', amberLo: '#965A2E', green: '#5F8472', ink: '#06050A', rare: false },
    { name: 'Bruised Dusk',  ground: '#15101A', veil: '#43304C', amber: '#E09A66', amberLo: '#7E4C2E', green: '#789A82', ink: '#0A0710', rare: false },
    { name: 'Mercury Leak',  ground: '#0F1310', veil: '#2E3A38', amber: '#E5A36A', amberLo: '#7C5232', green: '#86B294', ink: '#060A08', rare: false },
    { name: 'Ember Tar',     ground: '#130D0C', veil: '#3E2C2C', amber: '#F2A35E', amberLo: '#9A4F26', green: '#5C7E6C', ink: '#080403', rare: false },
    { name: 'Cold Lantern',  ground: '#11121A', veil: '#312E48', amber: '#D8A074', amberLo: '#72502E', green: '#6E9CA0', ink: '#06070E', rare: false },
    // RARE GRAIL — a violent split: deep cyan-teal leak fighting a white-hot amber.
    { name: 'Vapor Grail',   ground: '#0C0E14', veil: '#283848', amber: '#FFC98E', amberLo: '#A85A2A', green: '#46C7C0', ink: '#04060A', rare: true },
    // RARE GRAIL — sodium-vapor sulphur: acid-gold light over a black-green murk.
    { name: 'Sulphur Grail', ground: '#0B0E08', veil: '#2C3820', amber: '#FFD27A', amberLo: '#B07620', green: '#9ED24A', ink: '#040603', rare: true },
  ];

  const MODES = [
    'Pool Field', 'Single Bloom', 'Twin Pools', 'Lying Shadows', 'Tidal Wash',
    'Leak Curtain', 'Receding Grid', 'Light Shaft', 'Caustic Veil', 'Colonnade',
  ];
  const FORMATS = [[1040, 1300], [1200, 1200], [1300, 1020]]; // portrait / square / landscape

  function pickPal(r, allowRare) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    const common = PALS.filter((p) => !p.rare);
    const rares = PALS.filter((p) => p.rare);
    if (allowRare && rares.length) return K.pick(rares, r);
    return K.pick(common, r);
  }

  /* ── A sourceless amber light pool with STRUCTURE ──────────────────────────
     Hot saturated core, wide warm falloff, and an optional caustic rim — a
     brightening ring at the pool's edge where the light "catches", so the pool
     reads as a focused thing with an edge instead of a dead blur. `hard` raises
     the core contrast and tightens the falloff (focused light), `caustic`
     paints the bright rim. */
  function pool(x, cx, cy, rad, pal, intensity, squash, ang, opt) {
    opt = opt || {};
    const hard = opt.hard == null ? 0.4 : opt.hard;     // 0 soft … 1 focused
    const caustic = opt.caustic || 0;                    // rim strength
    const tint = opt.tint || pal.amber;
    x.save();
    x.translate(cx, cy); x.rotate(ang || 0); x.scale(1, squash || 1); x.translate(-cx, -cy);
    // wide ambient warm falloff (low alpha, big)
    K.bloom(x, cx, cy, rad * (1.9 - hard * 0.5), pal.amberLo, 0.18 * intensity);
    K.bloom(x, cx, cy, rad * (1.25 - hard * 0.25), tint, (0.30 + hard * 0.12) * intensity);
    // hot saturated core — tighter & brighter when focused
    x.globalCompositeOperation = 'lighter';
    const coreR = rad * (0.7 - hard * 0.28);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, coreR);
    // warm white-hot center — bias toward a warm cream, not neutral #fff, so the
    // additive core never reads cool/blue against the amber field.
    const hotW = K.mix('#fff', tint, 0.18);
    g.addColorStop(0, K.rgba(K.mix(tint, hotW, 0.30 + hard * 0.25), (0.55 + hard * 0.25) * intensity));
    g.addColorStop(0.35, K.rgba(tint, (0.40 + hard * 0.15) * intensity));
    g.addColorStop(1, K.rgba(tint, 0));
    x.fillStyle = g; x.fillRect(cx - rad * 1.4, cy - rad * 1.4, rad * 2.8, rad * 2.8);
    // caustic rim — a thin bright annulus at the falloff radius
    if (caustic > 0.01) {
      const rr = rad * (0.92 - hard * 0.12);
      const rg = x.createRadialGradient(cx, cy, rr * 0.72, cx, cy, rr * 1.08);
      rg.addColorStop(0, K.rgba(tint, 0));
      rg.addColorStop(0.55, K.rgba(K.mix(tint, '#fff', 0.4), 0.22 * caustic * intensity));
      rg.addColorStop(0.78, K.rgba(K.mix(tint, '#fff', 0.15), 0.10 * caustic * intensity));
      rg.addColorStop(1, K.rgba(tint, 0));
      x.fillStyle = rg; x.fillRect(cx - rr * 1.3, cy - rr * 1.3, rr * 2.6, rr * 2.6);
    }
    x.restore();
  }

  /* A long soft-shadow gradient lying along a direction — a darkening smear
     that reads as a shadow with no caster, falling AWAY from a pool. */
  function lyingShadow(x, px, py, len, wide, ang, pal, amt) {
    x.save();
    x.translate(px, py); x.rotate(ang);
    x.globalCompositeOperation = 'multiply';
    x.translate(len * 0.42, 0);
    x.scale(1, (wide * 0.62) / (len * 0.62));
    const g = x.createRadialGradient(0, 0, 0, 0, 0, len * 0.62);
    g.addColorStop(0, K.rgba(pal.ink, amt));
    g.addColorStop(0.45, K.rgba(pal.ink, amt * 0.55));
    g.addColorStop(0.8, K.rgba(pal.ink, amt * 0.16));
    g.addColorStop(1, K.rgba(pal.ink, 0));
    x.fillStyle = g;
    x.beginPath(); x.arc(0, 0, len * 0.62, 0, 7); x.fill();
    x.restore();
  }

  /* A hard-edged DIRECTIONAL cast shadow: a long tapering wedge of darkness
     lying away from a pool, with a defined leading edge — the "lying geometry"
     the brief asks for. It still feathers at its far end so it never reads as
     a solid object, but it has direction and a crisp near edge. */
  function castWedge(x, ox, oy, ang, len, w0, w1, pal, amt) {
    x.save();
    x.translate(ox, oy); x.rotate(ang);
    x.globalCompositeOperation = 'multiply';
    // shape: tapering quad from near (w0) to far (w1)
    const grd = x.createLinearGradient(0, 0, len, 0);
    grd.addColorStop(0, K.rgba(pal.ink, amt));
    grd.addColorStop(0.18, K.rgba(pal.ink, amt * 0.92));
    grd.addColorStop(0.6, K.rgba(pal.ink, amt * 0.42));
    grd.addColorStop(1, K.rgba(pal.ink, 0));
    x.fillStyle = grd;
    x.beginPath();
    x.moveTo(0, -w0); x.lineTo(len, -w1); x.lineTo(len, w1); x.lineTo(0, w0); x.closePath();
    // soft the long edges with a blur-ish feather: draw, then a faint wider pass
    x.fill();
    x.globalAlpha = 0.5;
    x.beginPath();
    x.moveTo(0, -w0 * 1.5); x.lineTo(len, -w1 * 1.5); x.lineTo(len, w1 * 1.5); x.lineTo(0, w0 * 1.5); x.closePath();
    x.fill();
    x.restore();
  }

  /* A dramatic light SHAFT — a long soft beam of warm light raking across the
     field from an off-frame source, additive so it glows. Feathered both sides. */
  function shaft(x, cx, cy, ang, len, halfW, pal, intensity, W, H) {
    x.save();
    x.translate(cx, cy); x.rotate(ang);
    x.globalCompositeOperation = 'lighter';
    // cross-section gradient (perpendicular to beam) for soft edges
    const cg = x.createLinearGradient(0, -halfW, 0, halfW);
    cg.addColorStop(0, K.rgba(pal.amber, 0));
    cg.addColorStop(0.5, K.rgba(pal.amber, 0.30 * intensity));
    cg.addColorStop(1, K.rgba(pal.amber, 0));
    // along-beam falloff so it fades into haze at the far end
    x.save();
    x.fillStyle = cg;
    x.fillRect(-len * 0.1, -halfW, len, halfW * 2);
    // hot core line down the beam middle
    const hg = x.createLinearGradient(0, -halfW * 0.34, 0, halfW * 0.34);
    hg.addColorStop(0, K.rgba(pal.amber, 0));
    hg.addColorStop(0.5, K.rgba(K.mix(pal.amber, '#fff', 0.4), 0.32 * intensity));
    hg.addColorStop(1, K.rgba(pal.amber, 0));
    x.fillStyle = hg; x.fillRect(-len * 0.1, -halfW * 0.34, len, halfW * 0.68);
    x.restore();
    // along-beam fade (multiply a transparent->ink toward far end) handled by caller
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 1);

    // RARE grail seed (~1 in 11): forces a grail palette + extra contrast.
    const isRare = r() < 0.09;
    const pal = pickPal(r, isRare);

    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // ── DEEP NOCTURNAL GROUND (keep it dark) ──
    const bg = x.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, pal.ink);
    bg.addColorStop(0.45, pal.ground);
    bg.addColorStop(1, K.mix(pal.ground, pal.veil, 0.45));
    x.fillStyle = bg; x.fillRect(0, 0, W, H);

    // bruised violet-charcoal cloud banks (low, large fbm patches) — atmosphere.
    {
      const step = Math.max(4, Math.floor(S / 160));
      x.save(); x.globalCompositeOperation = 'screen';
      const vc = K.h2r(K.mix(pal.veil, pal.ground, 0.35));
      for (let yy = 0; yy < H; yy += step) {
        for (let xx = 0; xx < W; xx += step) {
          const n = (noise.fbm(xx / (S * 0.55), yy / (S * 0.55) + 11, 5, 0.55, 2.1) + 1) / 2;
          const a = K.clamp((n - 0.4) * 0.5, 0, 0.22);
          if (a < 0.012) continue;
          x.fillStyle = 'rgba(' + vc[0] + ',' + vc[1] + ',' + vc[2] + ',' + a + ')';
          x.fillRect(xx, yy, step + 1, step + 1);
        }
      }
      x.restore();
    }

    // composition seeds
    let leakSide = r() < 0.5 ? -1 : 1;
    const horizonY = H * (0.46 + r() * 0.2);

    // collect pools so shadows can lie away from them; carry per-pool options
    const pools = [];
    function addPool(cx, cy, rad, inten, squash, ang, opt) {
      pools.push({ cx, cy, rad, inten, squash, ang: ang || 0, opt: opt || {} });
    }

    // A single global "wrong" light direction — pools cast shadows THIS way.
    // (Sourceless light + a coherent wrong shadow direction = the surreal "off".)
    const lightAng = r() * TAU;             // notional source bearing
    const shadowAng = lightAng + Math.PI + (r() - 0.5) * 0.4; // shadows fall opposite-ish
    let usedShaft = false;
    let extraGreen = isRare;

    // ── COMPOSE per mode ──────────────────────────────────────────────────
    if (mode === 'Single Bloom') {
      const cx = W * (leakSide < 0 ? 0.62 : 0.38) + (r() - 0.5) * W * 0.08;
      const cy = horizonY + (r() - 0.5) * H * 0.1;
      addPool(cx, cy, S * (0.32 + r() * 0.1), 1.0, 0.62 + r() * 0.18, (r() - 0.5) * 0.5,
        { hard: 0.55 + r() * 0.3, caustic: 0.6 + r() * 0.5 });
      // a faint distant satellite, smaller & dimmer (depth)
      if (r() < 0.7) addPool(W * (r() < 0.5 ? 0.2 : 0.82), H * (0.18 + r() * 0.2), S * (0.09 + r() * 0.05), 0.42, 0.7, 0, { hard: 0.7, caustic: 0.3 });

    } else if (mode === 'Twin Pools') {
      const y1 = horizonY + (r() - 0.5) * H * 0.16;
      addPool(W * (0.30 + r() * 0.06), y1, S * (0.21 + r() * 0.08), 0.95, 0.6 + r() * 0.2, 0, { hard: 0.5 + r() * 0.3, caustic: 0.5 + r() * 0.4 });
      addPool(W * (0.70 - r() * 0.06), y1 + (r() - 0.5) * H * 0.18, S * (0.15 + r() * 0.07), 0.72, 0.6 + r() * 0.2, 0, { hard: 0.55 + r() * 0.3, caustic: 0.4 + r() * 0.4 });

    } else if (mode === 'Pool Field') {
      const n = 4 + (r() * 3 | 0);
      for (let i = 0; i < n; i++) {
        const t = i / n;
        const cy = H * (0.26 + t * 0.52) + (r() - 0.5) * H * 0.08;
        const cx = W * (0.14 + r() * 0.72);
        const sc = 1 - t * 0.5;
        addPool(cx, cy, S * (0.11 + r() * 0.15) * sc, (0.55 + r() * 0.45) * sc, 0.55 + r() * 0.25, (r() - 0.5) * 0.6,
          { hard: 0.4 + t * 0.4, caustic: 0.3 + r() * 0.5 });
      }

    } else if (mode === 'Lying Shadows') {
      addPool(W * (0.5 + (r() - 0.5) * 0.4), horizonY, S * (0.25 + r() * 0.08), 1.0, 0.55 + r() * 0.15, 0, { hard: 0.6 + r() * 0.3, caustic: 0.6 + r() * 0.4 });
      if (r() < 0.7) addPool(W * (0.2 + r() * 0.6), H * (0.24 + r() * 0.2), S * (0.1 + r() * 0.06), 0.5, 0.7, 0, { hard: 0.6, caustic: 0.3 });

    } else if (mode === 'Tidal Wash') {
      const by = H * (0.58 + r() * 0.16);
      x.save(); x.globalCompositeOperation = 'lighter';
      const bw = x.createLinearGradient(0, by - S * 0.28, 0, by + S * 0.2);
      bw.addColorStop(0, K.rgba(pal.amber, 0));
      bw.addColorStop(0.55, K.rgba(pal.amberLo, 0.28));
      bw.addColorStop(0.8, K.rgba(pal.amber, 0.36));
      bw.addColorStop(1, K.rgba(pal.amber, 0));
      x.fillStyle = bw; x.fillRect(0, by - S * 0.3, W, S * 0.55);
      x.restore();
      const n = 2 + (r() * 2 | 0);
      for (let i = 0; i < n; i++) addPool(W * (0.18 + (i + r() * 0.6) / n * 0.64), by + (r() - 0.5) * H * 0.05, S * (0.13 + r() * 0.08), 0.78, 0.4 + r() * 0.15, 0, { hard: 0.55, caustic: 0.5 });

    } else if (mode === 'Leak Curtain') {
      // amber pool sits opposite the leak edge and ANSWERS the green curtain.
      const cx = W * (leakSide < 0 ? 0.72 : 0.28);
      // force the curtain to sweep from the edge AWAY from the amber pool so the
      // green sheet always reads dramatically against the dark, never washing the pool.
      leakSide = cx > W * 0.5 ? -1 : 1;
      addPool(cx, horizonY + (r() - 0.5) * H * 0.12, S * (0.26 + r() * 0.08), 1.05, 0.58, 0, { hard: 0.66, caustic: 0.72, tint: pal.amber });
      // a second amber answer-pool nearer center for two-tone tension
      addPool(W * 0.5 + (r() - 0.5) * W * 0.16, H * (0.42 + r() * 0.22), S * (0.15 + r() * 0.07), 0.7, 0.6, 0, { hard: 0.62, caustic: 0.5 });
      extraGreen = true;
      cv._curtain = true;

    } else if (mode === 'Receding Grid') {
      // a faint ORTHOGONAL grid of distant pools receding to a vanishing point:
      // perspective rows, each row smaller & dimmer & higher → deep recession.
      const vpx = W * (0.35 + r() * 0.3);     // vanishing point x
      const vpy = H * (0.30 + r() * 0.12);
      const rows = 4 + (r() * 2 | 0);
      const cols = 3 + (r() * 2 | 0);
      const baseY = H * 0.92;
      for (let ri = 0; ri < rows; ri++) {
        const t = ri / (rows - 1);              // 0 near … 1 far
        const rowY = baseY + (vpy - baseY) * Math.pow(t, 0.8);
        const spread = (1 - t) * W * 0.52 + W * 0.04; // columns converge toward vp
        const sc = (1 - t * 0.78);
        for (let ci = 0; ci < cols; ci++) {
          const u = cols === 1 ? 0 : (ci / (cols - 1) - 0.5);
          const cxp = vpx + u * spread * 2;
          if (cxp < -W * 0.1 || cxp > W * 1.1) continue;
          const jit = (r() - 0.5) * 0.06;
          addPool(cxp + jit * W, rowY, S * (0.055 + 0.07 * sc) * (0.85 + r() * 0.3),
            (0.45 + 0.6 * sc), 0.42 + r() * 0.12, 0,
            { hard: 0.7 + t * 0.25, caustic: 0.55 + r() * 0.3 });
        }
      }

    } else if (mode === 'Light Shaft') {
      // a single dramatic raking shaft + a pool where it lands.
      usedShaft = true;
      const sang = (r() < 0.5 ? 1 : -1) * (Math.PI * (0.18 + r() * 0.18)); // steep-ish
      const land = { x: W * (0.3 + r() * 0.4), y: H * (0.58 + r() * 0.22) };
      addPool(land.x, land.y, S * (0.2 + r() * 0.08), 1.0, 0.5 + r() * 0.15, 0, { hard: 0.7, caustic: 0.7 });
      // small spill pools near the landing
      if (r() < 0.6) addPool(land.x + (r() - 0.5) * W * 0.2, land.y + (r() - 0.3) * H * 0.1, S * (0.08 + r() * 0.05), 0.45, 0.6, 0, { hard: 0.6, caustic: 0.3 });
      // store the shaft to paint after shadows but with the light
      cv._shaft = { x: land.x, y: land.y, ang: sang - Math.PI / 2, len: S * 1.5, halfW: S * (0.07 + r() * 0.05) };

    } else if (mode === 'Caustic Veil') {
      // overlapping translucent caustic ribbons of light — like light through
      // rippled water / glass: several thin curved bands, plus a couple pools.
      addPool(W * (0.3 + r() * 0.4), horizonY, S * (0.22 + r() * 0.08), 0.9, 0.55, 0, { hard: 0.55, caustic: 0.7 });
      if (r() < 0.7) addPool(W * (0.15 + r() * 0.7), H * (0.3 + r() * 0.3), S * (0.1 + r() * 0.06), 0.5, 0.6, 0, { hard: 0.6, caustic: 0.4 });
      cv._caustic = true;

    } else { // Colonnade — a row of vertical light columns with strong cast geometry
      const n = 3 + (r() * 3 | 0);
      const baseY = horizonY + (r() - 0.5) * H * 0.1;
      for (let i = 0; i < n; i++) {
        const cx = W * (0.12 + (i + 0.5) / n * 0.76) + (r() - 0.5) * W * 0.03;
        const cy = baseY + (r() - 0.5) * H * 0.06;
        const sc = 0.7 + r() * 0.5;
        addPool(cx, cy, S * (0.1 + r() * 0.06) * sc, (0.6 + r() * 0.4), 0.45 + r() * 0.15, 0, { hard: 0.65 + r() * 0.2, caustic: 0.5 + r() * 0.3 });
      }
      cv._colonnade = true;
    }

    // ── PAINT cast shadow GEOMETRY first (under the light), away from pools ──
    // Directional hard-soft wedges give the "lying shadow with direction".
    const wedgeModes = (mode === 'Lying Shadows' || mode === 'Colonnade' || mode === 'Single Bloom' || mode === 'Light Shaft');
    if (wedgeModes && pools.length) {
      const big = pools.slice().sort((a, b) => (b.rad * b.inten) - (a.rad * a.inten));
      const nW = mode === 'Lying Shadows' ? Math.min(big.length, 2 + (r() * 2 | 0)) : Math.min(big.length, 1 + (r() * 2 | 0));
      for (let i = 0; i < nW; i++) {
        const p = big[i];
        const ox = p.cx + Math.cos(shadowAng) * p.rad * 0.5;
        const oy = p.cy + Math.sin(shadowAng) * p.rad * 0.5;
        const len = S * (0.5 + r() * 0.55);
        castWedge(x, ox, oy, shadowAng + (r() - 0.5) * 0.12, len, p.rad * 0.34, p.rad * (0.9 + r() * 0.7), pal, 0.4 + r() * 0.2);
      }
    }

    // ── PAINT soft lying-shadow smears (atmosphere of darkness under light) ──
    const nShadow = mode === 'Lying Shadows' ? 3 + (r() * 2 | 0) : 2 + (r() * 2 | 0);
    for (let i = 0; i < nShadow; i++) {
      const p = pools.length ? pools[(r() * pools.length) | 0] : { cx: W * 0.5, cy: horizonY, rad: S * 0.2 };
      const ox = p.cx + Math.cos(shadowAng) * p.rad * 0.4;
      const oy = p.cy + Math.sin(shadowAng) * p.rad * 0.2 + p.rad * (0.2 + r() * 0.3);
      const len = S * (0.45 + r() * 0.5);
      const wide = p.rad * (0.7 + r() * 0.8);
      lyingShadow(x, ox, oy, len, wide, shadowAng + (r() - 0.5) * 0.25, pal, 0.3 + r() * 0.2);
    }

    // ── PAINT the dramatic shaft (additive), before pools so the pool sits hot on top ──
    if (cv._shaft) {
      const sf = cv._shaft;
      shaft(x, sf.x, sf.y, sf.ang, sf.len, sf.halfW, pal, isRare ? 1.15 : 0.95, W, H);
      // a few floating dust motes inside the shaft for body
      x.save(); x.globalCompositeOperation = 'lighter';
      x.translate(sf.x, sf.y); x.rotate(sf.ang);
      const md = 60 + (r() * 40 | 0);
      for (let i = 0; i < md; i++) {
        const dx = (r() - 0.1) * sf.len;
        const dy = (r() - 0.5) * sf.halfW * 1.6;
        const a = (1 - K.clamp(dx / sf.len, 0, 1)) * 0.18 * r();
        if (a < 0.01) continue;
        x.fillStyle = K.rgba(K.mix(pal.amber, '#fff', 0.3), a);
        x.fillRect(dx, dy, 0.8 + r() * 1.6, 0.8 + r() * 1.6);
      }
      x.restore();
    }

    // ── PAINT caustic ribbons (Caustic Veil mode) ──
    if (cv._caustic) {
      x.save(); x.globalCompositeOperation = 'lighter';
      const ribbons = 4 + (r() * 3 | 0);
      for (let b = 0; b < ribbons; b++) {
        const y0 = H * (0.35 + r() * 0.45);
        const amp = S * (0.04 + r() * 0.06);
        const freq = 1.5 + r() * 3;
        const phase = r() * TAU;
        const thick = S * (0.008 + r() * 0.014);
        const aw = 0.10 + r() * 0.12;
        x.beginPath();
        let first = true;
        for (let px = -10; px <= W + 10; px += Math.max(3, S / 220)) {
          const yy = y0 + Math.sin(px / W * TAU * freq + phase) * amp + noise.fbm(px / (S * 0.4), b * 3.1, 3) * amp * 0.8;
          if (first) { x.moveTo(px, yy); first = false; } else x.lineTo(px, yy);
        }
        x.lineWidth = thick;
        x.strokeStyle = K.rgba(K.mix(pal.amber, '#fff', 0.25 + r() * 0.2), aw);
        x.shadowColor = K.rgba(pal.amber, aw * 0.9);
        x.shadowBlur = thick * 4;
        x.stroke();
      }
      x.restore();
    }

    // ── PAINT vertical light columns (Colonnade) — soft glowing pillars rising
    //    from each base pool. Built additively: many stacked horizontal soft
    //    gradient slices give a feathered-edge column that fades upward. ──
    if (cv._colonnade) {
      x.save(); x.globalCompositeOperation = 'lighter';
      for (const p of pools) {
        const colH = p.rad * (3.6 + r() * 2.0);
        const colW = p.rad * (0.42 + r() * 0.22);
        const topY = p.cy - colH;
        // soft-edged vertical bar: horizontal gradient (transparent→warm→transparent)
        // whose alpha fades to 0 at the top via a clip-less manual vertical ramp.
        const slices = 26;
        for (let s = 0; s < slices; s++) {
          const tt = s / (slices - 1);            // 0 top … 1 base
          const yy = topY + tt * colH;
          const sh = colH / slices + 1;
          const aBase = 0.16 * p.inten * Math.pow(tt, 1.4); // brighter at base
          const lg = x.createLinearGradient(p.cx - colW, 0, p.cx + colW, 0);
          const warm = K.mix(pal.amber, '#fff', 0.12 + tt * 0.18);
          lg.addColorStop(0, K.rgba(warm, 0));
          lg.addColorStop(0.5, K.rgba(warm, aBase));
          lg.addColorStop(1, K.rgba(warm, 0));
          x.fillStyle = lg;
          x.fillRect(p.cx - colW, yy, colW * 2, sh);
        }
      }
      x.restore();
    }

    // ── PAINT the light pools (additive glow over the dark) ──
    for (const p of pools) pool(x, p.cx, p.cy, p.rad, pal, p.inten, p.squash, p.ang, p.opt);

    // ── THE MERCURY-GREEN LEAK — cool bleed from one edge ──
    {
      const lx = leakSide < 0 ? 0 : W;
      const ly = H * (0.2 + r() * 0.6);
      const lrad = S * (0.4 + r() * 0.35) * (extraGreen ? 1.25 : 1);
      x.save(); x.globalCompositeOperation = 'lighter';
      const g = x.createRadialGradient(lx, ly, 0, lx, ly, lrad);
      g.addColorStop(0, K.rgba(pal.green, (extraGreen ? 0.42 : 0.30)));
      g.addColorStop(0.4, K.rgba(pal.green, (extraGreen ? 0.20 : 0.13)));
      g.addColorStop(1, K.rgba(pal.green, 0));
      x.fillStyle = g; x.fillRect(lx - lrad, ly - lrad, lrad * 2, lrad * 2);
      x.restore();
      if (mode === 'Leak Curtain') {
        // a broad green CURTAIN sweeping in from the leak edge — strong & wide,
        // a real sheet of cold light rather than a faint wash.
        x.save(); x.globalCompositeOperation = 'lighter';
        const cw = W * 0.66;
        const cg = x.createLinearGradient(lx, 0, lx + leakSide * cw, 0);
        cg.addColorStop(0, K.rgba(K.mix(pal.green, '#fff', 0.08), 0.46));
        cg.addColorStop(0.28, K.rgba(pal.green, 0.26));
        cg.addColorStop(0.6, K.rgba(pal.green, 0.10));
        cg.addColorStop(1, K.rgba(pal.green, 0));
        x.fillStyle = cg; x.fillRect(Math.min(lx, lx + leakSide * cw), 0, cw, H);
        x.restore();
        // a low green floor-glow across the WHOLE base so the far side never dies
        x.save(); x.globalCompositeOperation = 'lighter';
        const fg = x.createLinearGradient(0, H * 0.62, 0, H);
        fg.addColorStop(0, K.rgba(pal.green, 0));
        fg.addColorStop(1, K.rgba(pal.green, 0.12));
        x.fillStyle = fg; x.fillRect(0, H * 0.62, W, H * 0.38);
        x.restore();
        // bright vertical mercury streaks dripping down the curtain — the texture
        // that makes the leak read as a falling sheet of cold light.
        x.save(); x.globalCompositeOperation = 'lighter';
        const ns = 5 + (r() * 4 | 0);
        for (let i = 0; i < ns; i++) {
          const sx = lx + leakSide * W * (0.02 + r() * 0.42);
          const sw = S * (0.005 + r() * 0.013);
          const top = H * r() * 0.25;
          const sg = x.createLinearGradient(0, top, 0, H);
          const sc = K.mix(pal.green, '#fff', 0.12 + r() * 0.18);
          sg.addColorStop(0, K.rgba(sc, 0));
          sg.addColorStop(0.35, K.rgba(sc, 0.16 + r() * 0.12));
          sg.addColorStop(0.75, K.rgba(sc, 0.08 + r() * 0.06));
          sg.addColorStop(1, K.rgba(sc, 0));
          x.fillStyle = sg; x.fillRect(sx - sw, top, sw * 2, H - top);
        }
        x.restore();
      }
    }

    // ── MATERIAL TEXTURE on the whole field (mottle, grain) ──
    K.mottle(x, 0, 0, W, H, pal.veil, 30, r, 'overlay');
    // a faint amber dust drifting in the lit zones
    {
      x.save(); x.globalCompositeOperation = 'lighter';
      const nd = (W * H) / 5200 | 0;
      for (let i = 0; i < nd; i++) {
        const dx = r() * W, dy = r() * H;
        let near = 0;
        for (const p of pools) { const d = Math.hypot(dx - p.cx, dy - p.cy); near = Math.max(near, 1 - K.clamp(d / (p.rad * 1.6), 0, 1)); }
        if (near < 0.06) continue;
        x.fillStyle = K.rgba(K.mix(pal.amber, '#fff', 0.2), 0.05 + near * 0.12 * r());
        const s = 0.6 + r() * 1.6;
        x.fillRect(dx, dy, s, s);
      }
      x.restore();
    }

    // ── ATMOSPHERIC HAZE (does NOT bleach) ──
    const hazeCol = K.mix(pal.veil, pal.ground, 0.3);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.16, S * 0.85, 'screen');
    {
      x.save(); x.globalCompositeOperation = 'lighter';
      const wh = x.createLinearGradient(0, H * 0.55, 0, H);
      wh.addColorStop(0, K.rgba(pal.amberLo, 0));
      wh.addColorStop(1, K.rgba(pal.amberLo, 0.10));
      x.fillStyle = wh; x.fillRect(0, H * 0.55, W, H * 0.45);
      x.restore();
    }

    // ── DEEPEN THE DARKS BACK ──
    {
      x.save(); x.globalCompositeOperation = 'multiply';
      const dk = x.createLinearGradient(0, 0, 0, H);
      dk.addColorStop(0, K.rgba(pal.ink, 0.55));
      dk.addColorStop(0.35, K.rgba(pal.ink, 0.12));
      dk.addColorStop(0.7, 'rgba(0,0,0,0)');
      x.fillStyle = dk; x.fillRect(0, 0, W, H);
      x.restore();
    }

    K.grain(x, W, H, 4.2, r);
    K.vignette(x, W, H, isRare ? 0.52 : 0.46);

    // rare grail gets one extra hot specular kiss for high impact
    if (isRare && pools.length) {
      const p = pools[0];
      K.sheen(x, p.cx, p.cy - p.rad * 0.1, p.rad * 0.8, K.mix(pal.amber, '#fff', 0.45), 0.5);
    }

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const isRare = r() < 0.09;
    const pal = undefined
      ? (PALS.find((p) => p.name === undefined) || PALS[0])
      : (isRare ? K.pick(PALS.filter((p) => p.rare), r) : K.pick(PALS.filter((p) => !p.rare), r));
    const mode = K.pick(MODES, r);
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] > fmt[1] ? 'Landscape' : fmt[0] === fmt[1] ? 'Square' : 'Portrait';
    return { Palette: pal.name, Mode: mode, Format: f, Grail: isRare ? 'Yes' : 'No' };
  }

  return { name: 'h3_sodium', draw, traits };
})();


export const lastLampTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderLastLamp: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const LASTLAMP_ASPECTS: readonly number[] = [0.8,1,1.2745];
export const lastLampSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Bruised Dusk",
        "Mercury Leak",
        "Ember Tar",
        "Cold Lantern",
        "Sodium Night",
        "Asphalt Bloom",
        "Sulphur Grail",
        "Vapor Grail"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Twin Pools",
        "Light Shaft",
        "Tidal Wash",
        "Colonnade",
        "Lying Shadows",
        "Receding Grid",
        "Leak Curtain",
        "Single Bloom",
        "Caustic Veil",
        "Pool Field"
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
      "name": "Grail",
      "values": [
        "No",
        "Yes"
      ]
    }
  ]
};
