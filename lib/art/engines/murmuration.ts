// @ts-nocheck
/*
 * Murmuration — generated from the locked tournament engine (tools/halo/t_murmuration.js)
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


const ENGINE = (function () {

  // sky1=zenith, sky2=mid sky, sky3=horizon band (cool), accent=flock glow,
  // accent2=flock secondary/highlight, haze=atmosphere wash, ink=ground/murk.
  // Grounds cool & desaturated; accent is the ONLY saturated hue.
  const PALS = [
    { name: 'Ember Steel',    sky1: '#0c1320', sky2: '#1c2c44', sky3: '#33506e', accent: '#ff6a1a', accent2: '#ffc25e', haze: '#5b7da6', ink: '#070b12' },
    { name: 'Acid Slate',     sky1: '#0e1620', sky2: '#1f3140', sky3: '#3a5566', accent: '#b6ff2e', accent2: '#e8ffa0', haze: '#5e84a0', ink: '#070c10' },
    { name: 'Magenta Dusk',   sky1: '#110d22', sky2: '#262044', sky3: '#46476e', accent: '#ff2e8c', accent2: '#ff9ad0', haze: '#6a6fa6', ink: '#08060f' },
    { name: 'Cyan Murk',      sky1: '#08141a', sky2: '#163240', sky3: '#2f5868', accent: '#1ce0ff', accent2: '#a8f6ff', haze: '#4f8298', ink: '#040c10' },
    { name: 'Sodium Steel',   sky1: '#0b1118', sky2: '#1a2838', sky3: '#324a5e', accent: '#ffb01a', accent2: '#ffe69a', haze: '#557390', ink: '#06090e' },
    { name: 'Vermilion Dusk', sky1: '#0d0f1c', sky2: '#212a44', sky3: '#3c4e6e', accent: '#ff3b30', accent2: '#ff9a7a', haze: '#5d76a6', ink: '#07080f' },
    { name: 'Pale Lime Slate',sky1: '#0d111a', sky2: '#1c2838', sky3: '#33495e', accent: '#9cff5a', accent2: '#dcffb0', haze: '#566f8c', ink: '#070b10' },
    { name: 'Iris Steel',     sky1: '#0c0f22', sky2: '#1e2548', sky3: '#3a4274', accent: '#7c5cff', accent2: '#c0b0ff', haze: '#5e6aac', ink: '#06070f' },
  ];
  const FMTS = [ { W: 1500, H: 1000, t: 'Vista' }, { W: 1320, H: 1320, t: 'Window' }, { W: 1040, H: 1440, t: 'Portal' } ];
  // emergent forms the flock gathers toward
  const FORMS = ['Wave', 'Swell', 'Vortex', 'Ribbon', 'Ascend', 'Cascade'];
  const DENS = ['Gathering', 'Dense', 'Dispersing'];

  function params(r) {
    let pal = K.pick(PALS, r);
    const fmt = K.pick(FMTS, r);
    const form = K.pick(FORMS, r);
    const dens = K.pick(DENS, r);
    const flip = r() < 0.5;                 // mirror the field horizontally
    const dusk = r() < 0.5;                 // a faint glow lobe at the horizon
    const scale = 0.55 + r() * 0.5;         // flow-field scale
    return { pal, fmt, form, dens, flip, dusk, scale };
  }
  function traits(seed) {
    const p = params(K.rng(seed));
    return { Palette: p.pal.name, Format: p.fmt.t, Form: p.form, Density: p.dens, Phase: p.dusk ? 'Dusk' : 'Night' };
  }

  /* ── cool twilight-steel sky: zenith→mid→horizon, with a faint cool glow ── */
  function sky(x, P, W, H, hY, dusk) {
    const g = x.createLinearGradient(0, 0, 0, hY * 1.05);
    g.addColorStop(0, K.mix(P.sky1, '#000', 0.25));
    g.addColorStop(0.34, P.sky1);
    g.addColorStop(0.66, P.sky2);
    g.addColorStop(0.92, K.mix(P.sky2, P.sky3, 0.7));
    g.addColorStop(1, P.sky3);
    x.fillStyle = g; x.fillRect(0, 0, W, Math.ceil(hY * 1.05));
    // broad cool scatter seated on the horizon
    x.save(); x.globalCompositeOperation = 'screen';
    const gl = x.createRadialGradient(W * 0.5, hY, 0, W * 0.5, hY, W * 0.8);
    gl.addColorStop(0, K.rgba(P.sky3, 0.30)); gl.addColorStop(0.5, K.rgba(P.sky3, 0.10)); gl.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = gl; x.fillRect(0, 0, W, hY * 1.2);
    // optional faint warm-ish dusk lobe (still cool, just a touch of accent)
    if (dusk) {
      const gd = x.createRadialGradient(W * 0.5, hY, 0, W * 0.5, hY, W * 0.55);
      gd.addColorStop(0, K.rgba(K.mix(P.accent, P.sky3, 0.6), 0.14)); gd.addColorStop(1, 'rgba(0,0,0,0)');
      x.fillStyle = gd; x.fillRect(0, 0, W, hY * 1.2);
    }
    x.restore();
  }

  /* ── volumetric haze sheets: soft cool cloud masses, the signature murk ── */
  function volHaze(x, P, W, hY, noise, r) {
    K.hazeSheet(x, W, Math.floor(hY * 1.05), noise, K.mix(P.haze, P.sky2, 0.3), 0.16, 460 + r() * 220, 'screen');
    K.hazeSheet(x, W, Math.floor(hY * 1.05), noise, K.mix(P.haze, P.sky1, 0.4), 0.10, 300 + r() * 140, 'screen');
    K.hazeSheet(x, W, Math.floor(hY * 1.05), noise, K.mix(P.sky3, P.haze, 0.5), 0.05, 150, 'overlay');
  }

  /* ── attractor field: at any (x,y) returns a unit vector pointing toward /
       along the emergent FORM, plus a 0..1 affinity (how strongly the flock
       packs here). Combined with curl noise to make organic streaming. ── */
  function makeAttractor(form, W, hY, r, opts) {
    opts = opts || {};
    // the heart of the shape — somewhere in the upper-central sky. opts let a
    // distant satellite flock sit smaller / higher / wider-placed.
    const cx = W * (0.5 + (r() - 0.5) * (opts.cxSpread || 0.28));
    const cy = hY * ((opts.cyBase != null ? opts.cyBase : 0.34) + r() * (opts.cyRange != null ? opts.cyRange : 0.24));
    const R = Math.min(W, hY) * ((0.36 + r() * 0.14) * (opts.rMul || 1));
    const tilt = (r() - 0.5) * 0.8;
    const arms = K.rint(r, 2, 3);          // spiral arms for vortex
    const wn = 1.0 + r() * 0.8;            // wave frequency
    return function (px, py) {
      const dx = px - cx, dy = py - cy;
      const d = Math.hypot(dx, dy) + 1e-3;
      let vx, vy, aff;
      if (form === 'Vortex') {
        // logarithmic spiral arms + tangential swirl → a clear galaxy of birds
        const tx = -dy / d, ty = dx / d;       // tangent
        const ix = -dx / d, iy = -dy / d;      // inward
        const swirl = 0.86, inward = 0.30;
        vx = tx * swirl + ix * inward; vy = ty * swirl + iy * inward;
        const ang = Math.atan2(dy, dx);
        // spiral phase: density peaks along arms that wind with radius
        const spiral = Math.cos(arms * (ang - Math.log(d / (R * 0.18) + 1) * 2.4));
        const ring = Math.exp(-Math.pow((d - R * 0.5) / (R * 0.55), 2));
        aff = ring * (0.35 + 0.65 * Math.max(0, spiral)); // bright arms, dim gaps
      } else if (form === 'Ribbon') {
        // a tilting ribbon that gently undulates — packed tightly near its spine
        const ax = Math.cos(tilt), ay = Math.sin(tilt);
        const along = (dx * ax + dy * ay);     // distance along ribbon
        const perp = (dx * -ay + dy * ax);     // distance from spine
        const spine = Math.sin(along / (R * 0.55)) * R * 0.18; // undulation
        // flow runs along the ribbon, banking with the undulation
        const bank = Math.cos(along / (R * 0.55)) * 0.5;
        vx = ax - ay * bank; vy = ay + ax * bank;
        aff = Math.exp(-Math.pow((perp - spine) / (R * 0.16), 2)) *
              Math.exp(-Math.pow(along / (R * 1.5), 2));
      } else if (form === 'Wave') {
        // a cresting wave: a thick band that rises and curls over at the crest
        const phase = (px - cx) / (R * 0.8) * wn + tilt;
        const crestY = cy - Math.sin(phase) * R * 0.42;          // the wave line
        const curl = Math.cos(phase);                            // curling-over factor
        vx = 0.9; vy = -curl * 0.85;                             // rightward, lifting at crest
        const dyc = py - crestY;
        // dense just under the crest, fraying into spray above it
        aff = Math.exp(-Math.pow(dyc / (R * 0.4), 2)) * (dyc < 0 ? 0.55 + 0.45 * Math.max(0, curl) : 1);
      } else if (form === 'Ascend') {
        // an upward-billowing column that lifts and fans/mushrooms at the top
        const fan = Math.max(0, (cy - py)) / (R * 0.9);          // 0 at base, grows upward
        const wid = R * (0.28 + fan * 0.7);                      // column widens upward
        vx = (dx / (wid + 1e-3)) * 0.45 + (r() - 0.5) * 0.1; vy = -0.9;
        aff = Math.exp(-Math.pow(dx / wid, 2)) *
              Math.exp(-Math.pow(Math.max(0, py - cy - R * 0.3) / (R * 0.7), 2));
      } else if (form === 'Cascade') {
        // a broad downward fall — a settling curtain with vertical density
        // streaks, like a flock pouring down out of the high sky
        const colPhase = Math.cos((px - cx) / (R * 0.22) + tilt * 4);
        vx = 0.12 * Math.sin((py) / (R * 0.5)); vy = 0.95;
        aff = Math.exp(-Math.pow((px - cx) / (R * 1.25), 2)) *
              Math.exp(-Math.pow((py - cy) / (R * 1.15), 2)) *
              (0.45 + 0.55 * Math.max(0, colPhase));
      } else { // Swell — an asymmetric crescent swell, like a tilting head/wing
        const ang = Math.atan2(dy, dx) - tilt;
        const lobe = 0.62 + 0.38 * Math.cos(ang);                // bulge toward one side
        const edge = Math.exp(-Math.pow((d - R * lobe) / (R * 0.30), 2)); // a thick rim
        const core = Math.exp(-Math.pow(d / (R * 0.55), 2)) * 0.7;
        vx = -dy / d * 0.6 + 0.4; vy = dx / d * 0.6 - 0.25;      // sweeping along the rim
        aff = Math.max(edge, core);
      }
      const m = Math.hypot(vx, vy) || 1;
      return { vx: vx / m, vy: vy / m, aff: K.clamp(aff, 0, 1), cx, cy, R };
    };
  }

  /* ── the murmuration: tens of thousands of streaked elements seeded by
       affinity (rejection-sampled toward the form), advected along
       attractor+curl, drawn as short directional streaks that fade toward
       the edges of the form. Depth via size/opacity bands. ── */
  function flock(x, P, W, H, hY, noise, attract, p, r) {
    const dirX = p.flip ? -1 : 1;
    const accent = P.accent, accent2 = P.accent2;
    // density target by trait (raised floor so no seed reads thin/empty)
    const densMul = p.dens === 'Dense' ? 1.45 : p.dens === 'Dispersing' ? 1.0 : 1.18;
    const COUNT = Math.floor((W * hY) / 46 * densMul); // ~ tens of thousands at full res

    x.save();
    x.globalCompositeOperation = 'lighter';

    // three depth bands: far (tiny, hazy), mid, near (longer streaks, brighter)
    for (let band = 0; band < 3; band++) {
      const far = band === 0, near = band === 2;
      const bandFrac = far ? 0.42 : band === 1 ? 0.36 : 0.22;
      const n = Math.floor(COUNT * bandFrac);
      const sizeBase = far ? 0.6 : band === 1 ? 0.95 : 1.5;
      const lenBase = far ? 3.4 : band === 1 ? 6.5 : 12.0;   // longer → reads as motion
      const alphaBase = far ? 0.16 : band === 1 ? 0.30 : 0.52;

      let placed = 0, guard = 0;
      const maxGuard = n * 16;
      while (placed < n && guard < maxGuard) {
        guard++;
        // sample a point; bias HARD toward the form via affinity rejection
        const px = r() * W;
        const py = r() * hY * 1.02;
        const f = attract(px, py);
        // steep falloff: dense heart, thin ambient haze of strays outside
        const aff2 = f.aff * f.aff;                 // sharpen the form
        const keep = 0.025 + aff2 * 0.975;
        if (r() > keep) continue;
        placed++;

        // direction = attractor dir blended with curl noise (organic wander).
        // coherent regions follow the form; fringes wander more → fraying.
        const c = K.curl(noise, px * p.scale, py * p.scale, 1.2);
        const wander = 0.35 + (1 - f.aff) * 0.55;   // edges wander, heart is ordered
        let vx = f.vx * dirX * (1 - wander * 0.6) + c[0] * 26 * wander;
        let vy = f.vy * (1 - wander * 0.6) + c[1] * 26 * wander;
        const m = Math.hypot(vx, vy) || 1; vx /= m; vy /= m;

        // streak length scales with motion coherence + a little randomness
        const coh = 0.5 + f.aff * 0.9;
        const len = lenBase * coh * (0.55 + r() * 1.0);
        const sz = sizeBase * (0.7 + r() * 0.7);

        // colour: glowing accent, hot core near the heart, secondary highlight
        const heat = f.aff;
        let col;
        const roll = r();
        if (roll < 0.08 + heat * 0.22) col = accent2;          // bright sparks in dense regions
        else if (roll < 0.55) col = accent;
        else col = K.mix(accent, P.haze, 0.5 - heat * 0.35);   // cooler, sinking into haze at fringes
        const a = alphaBase * (0.35 + heat * 0.95) * (0.6 + r() * 0.6);

        // draw as a tapered streak (mid-motion blur): bright head → faded tail
        const ex = px - vx * len, ey = py - vy * len; // tail behind motion
        if (!far && len > 4) {
          const grad = x.createLinearGradient(px, py, ex, ey);
          grad.addColorStop(0, K.rgba(col, a));
          grad.addColorStop(1, K.rgba(col, 0));
          x.strokeStyle = grad; x.lineWidth = sz; x.lineCap = 'round';
          x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
          if (near) { x.fillStyle = K.rgba(col, a * 0.9); x.beginPath(); x.arc(px, py, sz * 0.65, 0, Math.PI * 2); x.fill(); }
        } else {
          x.strokeStyle = K.rgba(col, a); x.lineWidth = sz; x.lineCap = 'round';
          x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
        }
      }
    }
    x.restore();

    // dense knots — small tight clusters along the form's heart, the "one
    // organism" packing. Each knot finds a high-affinity spot and floods it.
    x.save(); x.globalCompositeOperation = 'lighter';
    const nKnots = K.rint(r, 5, 9);
    let kn = 0, kg = 0;
    while (kn < nKnots && kg < nKnots * 40) {
      kg++;
      const kx = r() * W, ky = r() * hY * 0.95;
      const kf = attract(kx, ky);
      if (kf.aff < 0.6) continue;        // only in the dense heart
      kn++;
      const kr = 14 + r() * 34;
      const cnt = 70 + Math.floor(r() * 130);
      for (let i = 0; i < cnt; i++) {
        const aa = r() * Math.PI * 2, rr = Math.pow(r(), 1.6) * kr;
        const sx = kx + Math.cos(aa) * rr, sy = ky + Math.sin(aa) * rr;
        const f = attract(sx, sy);
        const c = K.curl(noise, sx * p.scale, sy * p.scale, 1.2);
        let vx = f.vx * dirX * 0.7 + c[0] * 26 * 0.4, vy = f.vy * 0.7 + c[1] * 26 * 0.4;
        const m = Math.hypot(vx, vy) || 1; vx /= m; vy /= m;
        const len = 3 + r() * 6;
        const col = r() < 0.3 ? accent2 : accent;
        x.strokeStyle = K.rgba(col, 0.32 + r() * 0.4); x.lineWidth = 0.7 + r() * 0.9; x.lineCap = 'round';
        x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx - vx * len, sy - vy * len); x.stroke();
      }
    }
    x.restore();

    // a soft accent bloom sitting in the heart of the form → reads as glow
    const f0 = attract(attract(W / 2, hY / 2).cx, attract(W / 2, hY / 2).cy);
    K.bloom(x, f0.cx, f0.cy, f0.R * 1.4, P.accent, 0.12);
    K.bloom(x, f0.cx, f0.cy, f0.R * 0.7, P.accent2, 0.10);
  }

  /* ── distant satellite flock: a smaller, fainter swarm set higher/further so
       the sky reads as a deep, populated scene rather than one lone band. ── */
  function satelliteFlock(x, P, W, hY, noise, att, p, r, sz, alpha) {
    const dirX = p.flip ? -1 : 1;
    x.save(); x.globalCompositeOperation = 'lighter';
    const n = Math.floor((W * hY) / 165);
    let placed = 0, guard = 0;
    while (placed < n && guard < n * 16) {
      guard++;
      const px = r() * W, py = r() * hY * 0.92;
      const f = att(px, py); const a2 = f.aff * f.aff;
      if (r() > 0.02 + a2 * 0.78) continue;
      placed++;
      const c = K.curl(noise, px * p.scale, py * p.scale, 1.2);
      const wander = 0.42 + (1 - f.aff) * 0.5;
      let vx = f.vx * dirX * (1 - wander * 0.6) + c[0] * 26 * wander;
      let vy = f.vy * (1 - wander * 0.6) + c[1] * 26 * wander;
      const m = Math.hypot(vx, vy) || 1; vx /= m; vy /= m;
      const len = (3 + r() * 5) * sz, w = (0.5 + r() * 0.6) * sz;
      const col = r() < 0.3 ? P.accent2 : K.mix(P.accent, P.haze, 0.35);
      const ex = px - vx * len, ey = py - vy * len;
      x.strokeStyle = K.rgba(col, alpha * (0.3 + f.aff * 0.8) * (0.55 + r() * 0.55));
      x.lineWidth = w; x.lineCap = 'round';
      x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
    }
    x.restore();
  }

  /* ── low hazy cool horizon + tiny ground markers for scale ── */
  function ground(x, P, W, H, hY, r, noise) {
    // graded cool murk below the horizon
    const gg = x.createLinearGradient(0, hY - 24, 0, H);
    gg.addColorStop(0, K.rgba(K.mix(P.ink, P.sky3, 0.6), 1));
    gg.addColorStop(0.45, K.mix(P.ink, P.sky3, 0.26));
    gg.addColorStop(0.8, K.mix(P.ink, P.haze, 0.16));
    gg.addColorStop(1, K.mix(P.ink, P.sky2, 0.12));
    x.fillStyle = gg; x.fillRect(0, hY - 24, W, H - hY + 24);
    // faint mottled atmosphere in the murk
    K.mottle(x, 0, hY, W, H - hY, P.sky3, 2400, r, 'screen');
    // haze hugging the horizon line
    x.save(); x.globalCompositeOperation = 'screen';
    const hb = x.createLinearGradient(0, hY - H * 0.07, 0, hY + H * 0.05);
    hb.addColorStop(0, 'rgba(0,0,0,0)'); hb.addColorStop(0.55, K.rgba(P.haze, 0.2)); hb.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = hb; x.fillRect(0, hY - H * 0.07, W, H * 0.12); x.restore();

    // low abstract landform silhouette — soft rolling, never a literal skyline
    x.save();
    const sil = K.mix(P.ink, '#000', 0.2);
    x.fillStyle = sil; x.beginPath(); x.moveTo(0, hY);
    for (let xx = 0; xx <= W; xx += 10) {
      const yy = hY - (Math.sin(xx / W * Math.PI * (1 + r() * 1.5)) * 10) - noise.fbm(xx / 150, 7, 2) * 18 - 4;
      x.lineTo(xx, yy);
    }
    x.lineTo(W, H); x.lineTo(0, H); x.closePath(); x.fill();
    x.restore();

    // tiny ground markers for scale — sparse little posts/figures on the ridge
    x.save();
    const nMark = K.rint(r, 6, 14);
    for (let i = 0; i < nMark; i++) {
      const mx = (i + r() * 0.6) / nMark * W;
      const baseY = hY - 6 - noise.fbm(mx / 150, 7, 2) * 18;
      const hh = 2 + r() * 5;
      x.strokeStyle = K.rgba(K.mix(P.ink, '#000', 0.4), 0.7);
      x.lineWidth = 0.8 + r() * 0.6;
      x.beginPath(); x.moveTo(mx, baseY); x.lineTo(mx, baseY - hh); x.stroke();
      // a faint warm spark atop a few (distant beacons)
      if (r() < 0.4) { x.fillStyle = K.rgba(P.accent, 0.4); x.fillRect(mx - 0.5, baseY - hh - 1, 1.2, 1.2); }
    }
    x.restore();
  }

  /* ── distant lone strays + drifting motes for life/scale in empty sky ── */
  function strays(x, P, W, hY, attract, p, r, noise) {
    x.save(); x.globalCompositeOperation = 'lighter';
    const dirX = p.flip ? -1 : 1;
    // a handful of larger, lone individuals breaking from the flock
    for (let i = 0; i < K.rint(r, 14, 30); i++) {
      const px = r() * W, py = r() * hY * 0.95;
      const f = attract(px, py);
      const c = K.curl(noise, px * p.scale, py * p.scale, 1.2);
      let vx = f.vx * dirX * 0.6 + c[0] * 26, vy = f.vy * 0.6 + c[1] * 26;
      const m = Math.hypot(vx, vy) || 1; vx /= m; vy /= m;
      const len = 6 + r() * 9, sz = 1.2 + r() * 1.1;
      const col = r() < 0.4 ? P.accent2 : P.accent;
      const ex = px - vx * len, ey = py - vy * len;
      const grad = x.createLinearGradient(px, py, ex, ey);
      grad.addColorStop(0, K.rgba(col, 0.55)); grad.addColorStop(1, K.rgba(col, 0));
      x.strokeStyle = grad; x.lineWidth = sz; x.lineCap = 'round';
      x.beginPath(); x.moveTo(px, py); x.lineTo(ex, ey); x.stroke();
    }
    // faint cool motes in the deep sky
    for (let i = 0; i < 90; i++) {
      const mx = r() * W, my = r() * hY * 0.9, s = 0.3 + r() * 1.2;
      x.fillStyle = K.rgba(r() < 0.25 ? P.accent : P.haze, 0.06 + r() * 0.2);
      x.beginPath(); x.arc(mx, my, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();
  }

  function draw(cv, seed) {
    const r = K.rng(seed), p = params(r), P = p.pal, W = p.fmt.W, H = p.fmt.H;
    cv.width = W; cv.height = H; const x = cv.getContext('2d');
    const noise = K.makeNoise(seed);
    const hY = H * (p.fmt.t === 'Portal' ? 0.88 : p.fmt.t === 'Window' ? 0.85 : 0.83) + (r() - 0.5) * H * 0.03;

    sky(x, P, W, H, hY, p.dusk);
    volHaze(x, P, W, hY, noise, r);

    const attract = makeAttractor(p.form, W, hY, r);

    // mid haze behind the flock to give it air to glow against
    K.hazeSheet(x, W, Math.floor(hY * 1.02), noise, K.mix(P.haze, P.sky3, 0.4), 0.06, 260, 'screen');

    // 1–2 distant satellite flocks (smaller, higher, fainter) for depth so the
    // sky is a populated scene, never a single lonely band. Drawn behind the hero.
    const nSat = 1 + (r() < 0.8 ? 1 : 0);
    for (let s = 0; s < nSat; s++) {
      const satForm = K.pick(FORMS, r);
      const satAtt = makeAttractor(satForm, W, hY, r, { rMul: 0.44 - s * 0.1, cyBase: 0.1, cyRange: 0.34, cxSpread: 0.78 });
      satelliteFlock(x, P, W, hY, noise, satAtt, p, r, 0.66 - s * 0.12, 0.44 - s * 0.1);
    }

    flock(x, P, W, H, hY, noise, attract, p, r);
    strays(x, P, W, hY, attract, p, r, noise);

    // thin haze veil over the flock to sink the fringes into atmosphere
    K.hazeSheet(x, W, Math.floor(hY * 1.02), noise, K.mix(P.sky2, P.haze, 0.5), 0.04, 320, 'screen');

    ground(x, P, W, H, hY, r, noise);

    // finishing atmosphere
    K.hazeSheet(x, W, H, noise, P.sky3, 0.04, 220, 'screen');
    // sparse painterly dust over the sky (random, not a grid)
    x.save(); x.globalCompositeOperation = 'overlay';
    for (let i = 0; i < Math.floor(W * hY / 1400); i++) {
      const dx = r() * W, dy = r() * hY, s = 0.5 + r() * 2.0;
      const c = r() < 0.5 ? K.mix(P.haze, '#fff', 0.4) : K.mix(P.haze, P.ink, 0.5);
      x.fillStyle = K.rgba(c, 0.03 + r() * 0.05);
      x.beginPath(); x.arc(dx, dy, s, 0, Math.PI * 2); x.fill();
    }
    x.restore();
    K.grain(x, W, H, 520, r);
    K.chromaSplit(x, W, H, 1);
    x.save(); x.globalCompositeOperation = 'multiply'; K.vignette(x, W, H, 0.34); x.restore();
    // gentle top darkening for depth (lighter now, so the scene stays open)
    const tg = x.createLinearGradient(0, 0, 0, H);
    tg.addColorStop(0, K.rgba(K.mix(P.sky1, '#000', 0.4), 0.2)); tg.addColorStop(0.35, 'rgba(0,0,0,0)');
    x.fillStyle = tg; x.fillRect(0, 0, W, H);

    return { aspect: W / H, traits: traits(seed) };
  }
  return { name: 't_murmuration', draw, traits };
})();


export const MURMURATION_ASPECTS: readonly number[] = [1.5,1,0.722];

export const murmurationTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);

export const murmurationSchema: TraitSchema = {
  traits: [
    { name: "Palette", values: ["Sodium Steel","Pale Lime Slate","Magenta Dusk","Acid Slate","Iris Steel","Vermilion Dusk","Ember Steel","Cyan Murk"] },
    { name: "Format", values: ["Window","Portal","Vista"] },
    { name: "Form", values: ["Swell","Ascend","Vortex","Cascade","Ribbon","Wave"] },
    { name: "Density", values: ["Dense","Gathering","Dispersing"] },
    { name: "Phase", values: ["Night","Dusk"] },
  ],
};

export const renderMurmuration: EngineFn = (canvas, tokenId, width) => {
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
