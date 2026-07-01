// @ts-nocheck
/*
 * SaltMirror — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/h4_saltmirror.js). Continuous seed-driven surreal "real-but-off"
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


/* SALT MIRROR — a bleached salt flat under white haze.
 * SURREAL = real-but-off: a vast, almost-empty white plain; a single distant
 * object (a tower, a chair, a horse, a row of poles) DISSOLVING into heat
 * shimmer and doubled by a thin water-mirror at its base. Extreme high-key
 * haze, barely-there forms, immense emptiness. Almost monochrome white-pink.
 * Calm and uncanny — NOT neon, NOT psychedelic.
 *
 * window.ENGINE = { name, draw(canvas,seed)->{aspect}, traits(seed) }
 * FORCE_PAL overrides the palette for the colorway jury. KIT is preloaded. */
const ENGINE = (function () {
  const K = KIT;

  /* Six palettes — all bleached white-pink / salt-cream / mirage-pale-blue /
     faintest-shadow, but each a different hour & weather of the flat, so the
     SET reads varied, never one image reskinned. Values stay extremely close
     together (high-key); the form is a whisper darker than the haze.
     sky=top of haze, low=horizon haze, salt=flat crust, wet=mirror water,
     form=the distant object body, shadow=faintest grounding, glow=sun warmth */
  const PALS = [
    { name: 'Salt Bloom',   sky: '#F4ECE6', low: '#EBDCD6', salt: '#F1E7E0', wet: '#E5DEDA', form: '#C9BAB1', shadow: '#BCA89E', glow: '#FBF3EC' },
    { name: 'Mirage Blue',  sky: '#EEF0F0', low: '#D8E0E2', salt: '#E9ECEC', wet: '#CDD7D9', form: '#AEB8BA', shadow: '#9FAEB0', glow: '#F5F7F6' },
    { name: 'Cream Flat',   sky: '#F6F0E7', low: '#EFE6D6', salt: '#F3ECE0', wet: '#E6DCC9', form: '#CDBE9F', shadow: '#BCA989', glow: '#FCF6EC' },
    { name: 'Bleached Dawn',sky: '#F4EEEC', low: '#EAD9D9', salt: '#F0E8E6', wet: '#E2D6D6', form: '#C9B6B6', shadow: '#B79E9E', glow: '#FBF2F0' },
    { name: 'White-Out',    sky: '#F7F4F1', low: '#EFEAE5', salt: '#F4F0EC', wet: '#E8E2DC', form: '#D8CCC2', shadow: '#C9BAAE', glow: '#FDFAF6' },
    { name: 'Pale Saline',  sky: '#EFEEE9', low: '#DEE0D8', salt: '#EAEAE3', wet: '#D3D6CC', form: '#B6B7A8', shadow: '#A6A797', glow: '#F6F5EF' },
  ];

  const MODES = ['Dissolving Tower', 'Mirror Doubling', 'Shimmer Band', 'Lone Chair', 'Receding Poles', 'White-Out'];
  const FORMATS = [[1280, 752], [1180, 1180]]; // wide (~1.7), square

  function pickPal(r) {
    if (undefined) { const p = PALS.find((p) => p.name === undefined); if (p) return p; }
    return K.pick(PALS, r);
  }

  function draw(cv, seed) {
    const r = K.rng(seed);
    const noise = K.makeNoise(seed * 7 + 5);
    const pal = pickPal(r);
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const W = fmt[0], H = fmt[1];
    cv.width = W; cv.height = H;
    const x = cv.getContext('2d');
    const S = Math.min(W, H);

    // very high horizon → vast salt foreground; the flat dominates
    const hz = H * (0.40 + r() * 0.10);
    // the thin water-mirror band sits just below the horizon (where forms double)
    const waterTop = hz;
    const waterBot = hz + (H - hz) * (0.20 + r() * 0.12);

    // sun warmth, off to one side, very soft and high-key. Kept high & toward
    // a corner so it never blows out the centre where the form lives.
    const sunSide = r() < 0.5 ? -1 : 1;
    const sunX = W * (0.5 + sunSide * (0.30 + r() * 0.12));
    const sunY = hz * (0.26 + r() * 0.24);

    // ───────────────────────────────────────────────────────────────
    // SKY — a near-white haze, faintly graded, sun-warm to one side.
    // ───────────────────────────────────────────────────────────────
    const sky = x.createLinearGradient(0, 0, 0, hz + H * 0.06);
    sky.addColorStop(0, K.mix(pal.sky, pal.glow, 0.35));
    sky.addColorStop(0.7, pal.sky);
    sky.addColorStop(1, K.mix(pal.sky, pal.low, 0.85));
    x.fillStyle = sky; x.fillRect(0, 0, W, hz + H * 0.07);

    // a bleached sun — not a disc, just a swelling of light in the haze.
    // Pulled back so it warms a corner rather than nuking the frame to white.
    K.bloom(x, sunX, sunY, S * (0.5 + r() * 0.22), pal.glow, 0.28);
    K.bloom(x, sunX, sunY, S * (0.16 + r() * 0.08), '#ffffff', 0.22);

    // dense haze pooling along the horizon (where everything dissolves)
    const hb = x.createLinearGradient(0, hz - H * 0.16, 0, hz + H * 0.06);
    hb.addColorStop(0, K.rgba(pal.low, 0));
    hb.addColorStop(0.6, K.rgba(K.mix(pal.low, pal.glow, 0.4), 0.55));
    hb.addColorStop(1, K.rgba(pal.glow, 0.7));
    x.fillStyle = hb; x.fillRect(0, hz - H * 0.16, W, H * 0.22);

    // ───────────────────────────────────────────────────────────────
    // SALT FLAT — the foreground crust. Pale, faintly polygon-cracked.
    // ───────────────────────────────────────────────────────────────
    const ground = x.createLinearGradient(0, hz, 0, H);
    ground.addColorStop(0, K.mix(pal.salt, pal.glow, 0.5));   // bright at far edge
    ground.addColorStop(0.5, pal.salt);
    ground.addColorStop(1, K.mix(pal.salt, pal.shadow, 0.16)); // faintly grounded foreground
    x.fillStyle = ground; x.fillRect(0, hz, W, H - hz);

    // the wet mirror band — a distinctly darker, wetter sheen where forms
    // reflect. This is the SUBJECT of the project, so it must read clearly:
    // a cool, slightly bluer wet film that grounds the bottom of the flat.
    const wetCol = K.mix(pal.wet, pal.shadow, 0.28);
    const water = x.createLinearGradient(0, waterTop, 0, waterBot);
    water.addColorStop(0, K.rgba(wetCol, 0.0));
    water.addColorStop(0.25, K.rgba(wetCol, 0.78));
    water.addColorStop(0.7, K.rgba(wetCol, 0.55));
    water.addColorStop(1, K.rgba(K.mix(pal.wet, pal.salt, 0.5), 0.0));
    x.fillStyle = water; x.fillRect(0, waterTop, W, waterBot - waterTop);
    // a bright specular sky-glare reflected in the wet film (the sheen)
    const glare = x.createLinearGradient(0, waterTop, 0, waterBot);
    glare.addColorStop(0, K.rgba(pal.glow, 0.0));
    glare.addColorStop(0.18, K.rgba(pal.glow, 0.45));
    glare.addColorStop(0.5, K.rgba(pal.glow, 0.0));
    x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = glare;
    x.fillRect(0, waterTop, W, waterBot - waterTop); x.restore();
    // a single bright specular line along the waterline (wet glare edge)
    x.fillStyle = K.rgba(pal.glow, 0.6);
    x.fillRect(0, waterTop + (waterBot - waterTop) * 0.16, W, Math.max(1, S * 0.003));

    // faint salt-polygon cracks in the near foreground (dry crust), receding
    x.save();
    x.strokeStyle = K.rgba(pal.shadow, 0.10);
    x.lineWidth = 1;
    const crackTop = waterBot + (H - waterBot) * 0.08;
    for (let i = 0; i < 26; i++) {
      const t = i / 26;
      const yy = crackTop + (H - crackTop) * Math.pow(t, 1.4);
      const cells = 4 + Math.floor((yy - crackTop) / (H - crackTop) * 12);
      x.globalAlpha = 0.06 + (yy - crackTop) / (H - crackTop) * 0.16;
      x.beginPath();
      for (let xx = -20; xx < W + 20; xx += 6) {
        const ny = yy + noise.fbm(xx / 90, yy / 90, 3) * (4 + (yy - crackTop) / (H - crackTop) * 14);
        if (xx === -20) x.moveTo(xx, ny); else x.lineTo(xx, ny);
      }
      x.stroke();
      // a few vertical joins
      if (r() < 0.7) {
        for (let c = 0; c < cells; c++) {
          const vx = (c + r() * 0.6) / cells * W;
          const seg = (H - crackTop) / 26 * 0.7;
          x.beginPath(); x.moveTo(vx, yy); x.lineTo(vx + (r() - 0.5) * 14, yy + seg); x.stroke();
        }
      }
    }
    x.restore();

    // ── heat-shimmer renderer: draw a form, sliced into horizontal bands that
    // shift sideways (mirage) and fade upward into the haze. Optionally mirror
    // the same form down into the water as a wavering reflection. ──
    // shape(t) returns [halfWidth(0..1), present(bool)] for a vertical param t
    // (0=base on horizon, 1=top of the object). cx = centre x, baseY = horizon,
    // objH = object height in px, col = body colour, refl = draw reflection.
    function shimmerForm(cx, baseY, objH, halfW, shape, col, refl, dissolve) {
      const topY = baseY - objH;
      const bands = Math.max(40, Math.floor(objH / 3));
      x.save();
      for (let i = 0; i < bands; i++) {
        const t = i / bands;                 // 0 at base, 1 at top
        const yy = baseY - objH * t;
        const s = shape(t);
        if (!s || s[1] === false) continue;
        const hw = s[0] * halfW;
        if (hw <= 0) continue;
        // mirage lateral wobble grows toward the top + with heat (low-frequency
        // so slim forms waver like heat, not snake). Near-rigid at the base —
        // the dissolve happens UP high, the way real heat-shimmer reads.
        const wob = noise.fbm(cx / 60, yy / 40, 2) * objH * 0.05 * (t * t * (0.6 + dissolve * 1.4));
        // upward dissolve: opacity falls off near the top and with the haze
        const fade = (1 - Math.pow(t, 1.4) * (0.55 + dissolve * 0.45));
        const a = K.clamp(fade, 0, 1);
        // colour leans toward haze as it rises (dissolving into white)
        const c = K.mix(col, pal.glow, t * (0.4 + dissolve * 0.45));
        x.fillStyle = K.rgba(c, a * (0.85 + 0.15 * (1 - dissolve)));
        x.fillRect(cx - hw + wob, yy, hw * 2, objH / bands + 1.2);
      }
      x.restore();

      // soft contact darkening where the form meets the flat
      x.fillStyle = K.rgba(pal.shadow, 0.10 * (1 - dissolve));
      const baseHw = shape(0.02)[0] * halfW;
      x.beginPath(); x.ellipse(cx, baseY + objH * 0.01, baseHw * 1.4, objH * 0.02 + 2, 0, 0, 7); x.fill();

      // REFLECTION into the water band — same shape, flipped, wavering. This
      // is the project's signature; it must read clearly, not vanish.
      if (refl) {
        const rH = objH * 0.6;
        const rBands = Math.max(24, Math.floor(rH / 3));
        x.save();
        // clip to the water region so the reflection only lives in the mirror
        x.beginPath(); x.rect(0, waterTop, W, waterBot - waterTop + 2); x.clip();
        for (let i = 0; i < rBands; i++) {
          const t = i / rBands;            // 0 at waterline, downward
          const yy = baseY + rH * t;
          const s = shape(t * 0.95);       // sample the lower part of the form
          if (!s || s[1] === false) continue;
          const hw = s[0] * halfW;
          if (hw <= 0) continue;
          // reflection ripple — stronger horizontal smear than the object
          const rip = Math.sin(yy / 4 + cx) * objH * 0.018 + noise.fbm(cx / 26, yy / 7, 2) * objH * 0.05;
          // fades downward but starts strong at the waterline
          const a = Math.pow(1 - t, 0.8) * 0.6 * (1 - dissolve * 0.35);
          const c = K.mix(col, wetCol, 0.25 + t * 0.45);
          x.fillStyle = K.rgba(c, K.clamp(a, 0, 1));
          x.fillRect(cx - hw + rip, yy, hw * 2 + 1, rH / rBands + 1.6);
        }
        // a couple of bright broken ripple lines across the reflection
        x.globalCompositeOperation = 'screen';
        for (let i = 0; i < 3; i++) {
          const yy = baseY + rH * (0.12 + i * 0.22);
          x.fillStyle = K.rgba(pal.glow, 0.3 - i * 0.07);
          x.fillRect(cx - halfW * 1.3, yy, halfW * 2.6, Math.max(1, S * 0.0025));
        }
        x.restore();
      }
    }

    // a faint far ridge / shoreline at the horizon for some seeds (grounds it)
    if (r() < 0.6) {
      x.save();
      x.fillStyle = K.rgba(K.mix(pal.form, pal.glow, 0.6), 0.4);
      x.beginPath();
      x.moveTo(0, hz);
      for (let xx = 0; xx <= W; xx += 8) {
        const ry = hz - 2 - (noise.fbm(xx / 140, 3.3, 3) + 1) * S * 0.012;
        x.lineTo(xx, ry);
      }
      x.lineTo(W, hz); x.closePath(); x.fill();
      x.restore();
    }

    // ───────────────────────────────────────────────────────────────
    // COMPOSE PER MODE
    // ───────────────────────────────────────────────────────────────
    const baseY = hz;

    if (mode === 'Dissolving Tower') {
      // one slender tower far off, dissolving badly into heat at its top
      const cx = W * (0.5 + (r() - 0.5) * 0.5);
      const objH = (H - hz) * (0.62 + r() * 0.3);
      const halfW = S * (0.012 + r() * 0.01);
      // tower: a narrow shaft, slight taper, a small cap, a couple of setbacks
      const setback = 0.55 + r() * 0.2;
      const shape = (t) => {
        let w = 1 - t * 0.25;                 // slight taper
        if (t > setback) w *= 0.7;            // a setback near the top
        if (t > 0.92) w *= 1.8;               // a small cap/finial
        return [w, true];
      };
      shimmerForm(cx, baseY, objH, halfW, shape, K.mix(pal.form, pal.shadow, 0.45), true, 0.42);

    } else if (mode === 'Mirror Doubling') {
      // a solid blocky object (a monolith / far building) with a STRONG
      // water mirror — emphasis on the doubling. Less dissolve.
      const cx = W * (0.5 + (r() - 0.5) * 0.36);
      const objH = (H - hz) * (0.4 + r() * 0.22);
      const halfW = S * (0.05 + r() * 0.03);
      const notch = r() < 0.5;
      const shape = (t) => {
        if (t > 0.98) return [0, false];
        let w = 1;
        if (notch && t > 0.6 && t < 0.72) w = 0.5;  // a notch in the silhouette
        if (t > 0.86) w = 0.7 - (t - 0.86) * 2;     // a stepped roofline
        return [Math.max(0, w), true];
      };
      // widen the water band so the mirror is the subject
      const mCol = K.mix(pal.form, pal.shadow, 0.55);
      shimmerForm(cx, baseY, objH, halfW, shape, mCol, true, 0.18);
      // a second, much smaller distant twin for scale
      if (r() < 0.7) {
        const cx2 = cx + (r() < 0.5 ? -1 : 1) * W * (0.2 + r() * 0.12);
        shimmerForm(cx2, baseY, objH * 0.45, halfW * 0.5, shape, mCol, true, 0.4);
      }

    } else if (mode === 'Shimmer Band') {
      // the object is torn apart by heat into floating horizontal slices —
      // the most "mirage" mode. A broad low mass that shears into ribbons.
      const cx = W * (0.5 + (r() - 0.5) * 0.3);
      const objH = (H - hz) * (0.5 + r() * 0.22);
      const halfW = S * (0.075 + r() * 0.04);
      const slices = 8 + Math.floor(r() * 5);
      const baseC = K.mix(pal.form, pal.shadow, 0.42);
      x.save();
      for (let i = 0; i < slices; i++) {
        const t0 = i / slices, t1 = (i + 0.55 + r() * 0.25) / slices; // irregular gaps
        const ymid = baseY - objH * (t0 + t1) / 2;
        // each slice tears sideways INDEPENDENTLY — alternating, growing upward.
        // A per-slice random pull (not coherent noise) is what makes it look
        // shattered by heat rather than a tidy stack of steps.
        const pull = (r() - 0.5) * 2;
        const shift = pull * objH * (0.10 + t0 * 0.42) * halfW / (S * 0.09);
        const sliceH = objH * (t1 - t0);
        // ragged, wildly varying widths — some slivers, some broad
        const taper = (0.45 + r() * 0.85) * (1 - t0 * 0.25);
        const hw = halfW * taper;
        const a = (1 - Math.pow(t0, 1.25) * 0.6) * (0.55 + r() * 0.3);
        const c = K.mix(baseC, pal.glow, t0 * 0.55);
        // draw the slice as a soft horizontal smear that also feathers vertically
        const yTop = ymid - sliceH / 2;
        const drawH = Math.max(2, sliceH * (0.55 + r() * 0.3));
        const sg = x.createLinearGradient(cx - hw, 0, cx + hw, 0);
        sg.addColorStop(0, K.rgba(c, 0));
        sg.addColorStop(0.22, K.rgba(c, a));
        sg.addColorStop(0.78, K.rgba(c, a));
        sg.addColorStop(1, K.rgba(c, 0));
        x.fillStyle = sg;
        x.fillRect(cx - hw + shift, yTop, hw * 2, drawH);
        // a brighter thin core line on each slice (the glint of the heat tear)
        if (r() < 0.5) {
          x.fillStyle = K.rgba(K.mix(c, pal.glow, 0.6), a * 0.5);
          x.fillRect(cx - hw * 0.7 + shift, ymid, hw * 1.4, Math.max(1, S * 0.0018));
        }
      }
      x.restore();
      // its smeared reflection — a faint ladder of bright lines in the water
      x.save();
      x.beginPath(); x.rect(0, waterTop, W, waterBot - waterTop); x.clip();
      for (let i = 0; i < 5; i++) {
        const yy = waterTop + (waterBot - waterTop) * (i / 5) + 2;
        x.fillStyle = K.rgba(K.mix(pal.form, pal.wet, 0.4), 0.3 * (1 - i / 5));
        const hw = halfW * (1 - i * 0.1);
        const rip = noise.fbm(i * 2.1, cx / 40, 2) * objH * 0.05;
        x.fillRect(cx - hw + rip, yy, hw * 2, Math.max(1.5, S * 0.004));
      }
      x.restore();

    } else if (mode === 'Lone Chair') {
      // a single ordinary chair stranded in the immense flat — the strongest
      // "real but off" beat (a domestic object in a void). Drawn as a thin
      // dark silhouette, dissolving lightly, with a crisp little reflection.
      const cx = W * (0.42 + r() * 0.16);
      const objH = (H - hz) * (0.30 + r() * 0.12);
      const lw = Math.max(1.5, S * 0.006);   // limb thickness
      const seatY = baseY - objH * 0.5;
      const legSpread = objH * 0.26;
      const col = K.mix(pal.form, pal.shadow, 0.5);
      // draw via small strokes so we can also mirror & dissolve them
      function chair(yBase, flip, dissolve) {
        x.save();
        x.lineCap = 'round'; x.lineJoin = 'round';
        const dir = flip ? -1 : 1;
        const sY = yBase - dir * objH * 0.5;       // seat height
        const backTop = yBase - dir * objH;        // top of backrest
        const haze = (yy) => {
          const tt = Math.abs(yy - yBase) / objH;
          return K.clamp((1 - tt * dissolve) * (flip ? 0.5 : 0.85), 0, 1);
        };
        // back legs + backrest
        const drawLimb = (x0, y0, x1, y1) => {
          const wob = noise.fbm(x0 / 30, y0 / 16, 2) * objH * 0.02 * dissolve;
          x.strokeStyle = K.rgba(K.mix(col, pal.glow, Math.abs(y1 - yBase) / objH * dissolve * 0.6), haze((y0 + y1) / 2));
          x.lineWidth = lw;
          x.beginPath(); x.moveTo(x0 + wob, y0); x.lineTo(x1 + wob, y1); x.stroke();
        };
        // four legs
        drawLimb(cx - legSpread, yBase, cx - legSpread * 0.5, sY);
        drawLimb(cx + legSpread, yBase, cx + legSpread * 0.5, sY);
        drawLimb(cx - legSpread * 0.4, yBase, cx - legSpread * 0.2, sY);
        drawLimb(cx + legSpread * 0.4, yBase, cx + legSpread * 0.2, sY);
        // seat
        drawLimb(cx - legSpread * 0.55, sY, cx + legSpread * 0.55, sY);
        // backrest uprights + top rail
        drawLimb(cx - legSpread * 0.5, sY, cx - legSpread * 0.45, backTop);
        drawLimb(cx + legSpread * 0.5, sY, cx + legSpread * 0.45, backTop);
        drawLimb(cx - legSpread * 0.48, backTop, cx + legSpread * 0.48, backTop);
        drawLimb(cx - legSpread * 0.46, yBase - dir * objH * 0.82, cx + legSpread * 0.46, yBase - dir * objH * 0.82);
        x.restore();
      }
      // contact shadow
      x.fillStyle = K.rgba(pal.shadow, 0.12);
      x.beginPath(); x.ellipse(cx, baseY, legSpread * 1.4, objH * 0.03 + 2, 0, 0, 7); x.fill();
      chair(baseY, false, 0.4);
      // reflection (clipped to water)
      x.save();
      x.beginPath(); x.rect(0, waterTop, W, waterBot - waterTop); x.clip();
      chair(baseY, true, 1.1);
      x.restore();

    } else if (mode === 'Receding Poles') {
      // a long row of thin poles marching to the vanishing point, each fainter
      // and shorter — a measured emptiness. Some doubled in a wet patch.
      const n = 6 + Math.floor(r() * 4);
      const dir = r() < 0.5 ? 1 : -1;                 // marching left→right or r→l
      // the near end sits to one side; the far end recedes toward a high vp.
      const nearX = dir > 0 ? W * 0.16 : W * 0.84;
      const vpx = W * (0.5 - dir * 0.12);
      const wet = r() < 0.75;
      const shape = (tt) => [tt > 0.94 ? 1.7 : 1, true]; // a small knob on top
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        // exponential spacing so near poles are wide apart, far ones bunch — a
        // clear perspective march, not an overlapping blur.
        const px = nearX + (vpx - nearX) * Math.pow(t, 1.5);
        const ph = (H - hz) * (0.52 - t * 0.42) * (0.85 + r() * 0.3);
        const pw = Math.max(1.4, S * 0.009 * (1 - t * 0.62));
        const dissolve = 0.22 + t * 0.62;
        // near poles read solid & dark, far ones fade into the haze
        const col = K.mix(pal.form, pal.shadow, 0.55 - t * 0.3);
        shimmerForm(px, baseY, ph, pw, shape, col, wet && t < 0.6, dissolve);
      }

    } else { // White-Out — nearly empty. A faint trace of an object, mostly haze.
      // the flat is almost featureless; one barely-there form near dissolution.
      const cx = W * (0.5 + (r() - 0.5) * 0.5);
      const objH = (H - hz) * (0.34 + r() * 0.2);
      const halfW = S * (0.02 + r() * 0.03);
      const which = Math.floor(r() * 3);
      const shape = which === 0
        ? (t) => [1 - t * 0.3, true]                      // a faint post
        : which === 1
          ? (t) => [t < 0.5 ? 1 : (t < 0.55 ? 0 : 0.4), true]  // a broken thing
          : (t) => [Math.sin(t * Math.PI) * 1.1 + 0.1, true];  // a soft mound
      // extreme dissolve — it's almost not there
      shimmerForm(cx, baseY, objH, halfW, shape, K.mix(pal.form, pal.glow, 0.3), r() < 0.6, 0.85);
      // maybe a single far speck on the horizon (a bird? a person?)
      if (r() < 0.6) {
        x.fillStyle = K.rgba(pal.shadow, 0.3);
        const sx = W * (0.2 + r() * 0.6);
        x.fillRect(sx, hz - 1, Math.max(1.5, S * 0.004), Math.max(2, S * 0.01));
      }
    }

    // ───────────────────────────────────────────────────────────────
    // GLOBAL ATMOSPHERE & TEXTURE GRADE — the bleached, hazy, salty surface.
    // ───────────────────────────────────────────────────────────────
    // a low rolling heat-haze sheet over the whole flat (the signature wash)
    const hazeCol = K.mix(pal.glow, pal.low, 0.25);
    K.hazeSheet(x, W, H, noise, hazeCol, 0.16, S * 0.7, 'screen');
    // a second, finer haze near the horizon (the shimmering distance)
    K.hazeSheet(x, W, H, K.makeNoise(seed * 13 + 2), '#ffffff', 0.07, S * 0.35, 'screen');

    // salt-crust micro texture on the flat (subtle grit, not muddy)
    K.mottle(x, 0, hz, W, H - hz, pal.salt, 30, r, 'overlay');
    // faint mottle in the sky too so nothing reads as flat vector
    K.mottle(x, 0, 0, W, hz, pal.sky, 44, r, 'soft-light');

    // a wide, gentle bloom from the sun to keep the high-key glow alive
    K.bloom(x, sunX, sunY, S * 0.9, pal.glow, 0.10);

    // overall fine film grain
    K.grain(x, W, H, 6, r);
    // very soft vignette — barely there (high-key images must not get heavy edges)
    K.vignette(x, W, H, 0.12);
    // a faint top-and-bottom white lift so corners stay bleached, not dark
    const lift = x.createLinearGradient(0, 0, 0, H);
    lift.addColorStop(0, K.rgba(pal.glow, 0.10));
    lift.addColorStop(0.5, K.rgba(pal.glow, 0));
    lift.addColorStop(1, K.rgba(pal.glow, 0.06));
    x.save(); x.globalCompositeOperation = 'screen'; x.fillStyle = lift; x.fillRect(0, 0, W, H); x.restore();

    return { aspect: W / H };
  }

  function traits(seed) {
    const r = K.rng(seed);
    const pal = undefined ? (PALS.find((p) => p.name === undefined) || PALS[0]) : K.pick(PALS, r);
    const mode = MODES[seed % MODES.length];
    const fmt = K.pick(FORMATS, r);
    const f = fmt[0] === fmt[1] ? 'Square' : 'Wide';
    return { Palette: pal.name, Mode: mode, Format: f };
  }

  return { name: 'h4_saltmirror', draw, traits };
})();


export const saltMirrorTraits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const renderSaltMirror: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const SALTMIRROR_ASPECTS: readonly number[] = [1.7021,1];
export const saltMirrorSchema: TraitSchema = {
  "traits": [
    {
      "name": "Palette",
      "values": [
        "Bleached Dawn",
        "Pale Saline",
        "Mirage Blue",
        "White-Out",
        "Salt Bloom",
        "Cream Flat"
      ]
    },
    {
      "name": "Mode",
      "values": [
        "Mirror Doubling",
        "Shimmer Band",
        "Lone Chair",
        "Receding Poles",
        "White-Out",
        "Dissolving Tower"
      ]
    },
    {
      "name": "Format",
      "values": [
        "Wide",
        "Square"
      ]
    }
  ]
};
