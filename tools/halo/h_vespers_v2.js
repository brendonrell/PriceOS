/* HALO direction C — VESPERS v2  (drowned / mirrored MONUMENTAL architecture)
 * Monumental SURREAL architecture — a great ring on pylons, an arch causeway,
 * a half-submerged colossus, a stepped ziggurat, an obelisk field, a slab henge
 * — standing in mirror-still water that doubles it into a vertical reflection,
 * the waterline seam veiled in luminous haze. "Real but off": impossible scale,
 * perfect silence, a reflection that's subtly wrong.
 *
 * JURY FIXES (v1 → v2):
 *  (1) DE-CITIFIED. v1's windowed towers read as literal cyberpunk skyline.
 *      The window-grid skyscraper is GONE. Apertures are now sparse, large and
 *      architectural (sacred slots / lit gates / a single beacon), never an
 *      office-window grid. The vibe is ancient-future ruin in still water.
 *  (2) SIX structurally distinct SCENE families — Great Ring / Arch Causeway /
 *      Drowned Colossus / Ziggurat / Obelisk Field / Slab Henge — differing in
 *      scale, symmetry, density, negative space and waterline height. Hero is
 *      centred vs on-thirds per scene; waterline varies.
 *  (3) COOL JEWEL world with real internal variety — emerald/viridian spine
 *      PLUS sapphire, amethyst, teal, ultramarine, glacial, AND two off-spine
 *      night palettes (sodium-amber-on-teal, crimson-on-blue). 10 named pals.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  /* COOL waterline-mirror palettes. skT/skB = sky stops (top→horizon);
     stone = architecture body; lit = sunstruck/edge-lit stone; win = the few
     lit apertures (sparse, architectural); glow = beacon/atmosphere accent;
     haze = the luminous seam mist; ink = faint instrument marks.
     Spine = emerald/viridian; plus jewel siblings; the last two are OFF-SPINE
     nights (warm sodium amber on teal water; deep crimson on blue) for range. */
  const PALS = [
    { name:'Viridian Vesper', skT:'#021410', skB:'#0e8a62', stone:'#04201a', lit:'#5fe6a8', win:'#ffe27a', glow:'#2fffb0', haze:'#149a72', ink:'#cdfae0' },
    { name:'Emerald Still',   skT:'#021a14', skB:'#11b07e', stone:'#06231a', lit:'#7df0c4', win:'#ffd86a', glow:'#39ffbc', haze:'#1fbe8c', ink:'#cffff0' },
    { name:'Sapphire Tide',   skT:'#02061f', skB:'#1f5ad0', stone:'#0a1430', lit:'#7da8ff', win:'#9bf0e6', glow:'#3fe0ff', haze:'#2f6ae0', ink:'#cfe2ff' },
    { name:'Amethyst Deep',   skT:'#0a021f', skB:'#7a3de0', stone:'#16082e', lit:'#c69bff', win:'#7df0d0', glow:'#c45dff', haze:'#7a4fe0', ink:'#ecdcff' },
    { name:'Teal Mirror',     skT:'#02141c', skB:'#16a6b8', stone:'#06222a', lit:'#9bf0ff', win:'#ffd28a', glow:'#3fffe0', haze:'#1f9ab0', ink:'#d0fbff' },
    { name:'Ultramarine',     skT:'#020630', skB:'#1f3df0', stone:'#080a34', lit:'#8a9bff', win:'#c0e0ff', glow:'#4f7aff', haze:'#2a44e0', ink:'#dadfff' },
    { name:'Glacial Mint',    skT:'#0a2230', skB:'#56cabe', stone:'#0c2a2e', lit:'#dafff8', win:'#bfe8ff', glow:'#9bffe6', haze:'#4fb6b0', ink:'#eafffb' },
    { name:'Orchid Drowned',  skT:'#0c0420', skB:'#9a3dc8', stone:'#1a0a2c', lit:'#e6a8ff', win:'#7df0d0', glow:'#d65dff', haze:'#8a3db8', ink:'#f2dcff' },
    /* OFF-SPINE night #1 — warm sodium-amber lights over a deep teal lagoon */
    { name:'Sodium Lagoon',   skT:'#021614', skB:'#0c5e58', stone:'#04211e', lit:'#ffba5a', win:'#ffd884', glow:'#ff9e3a', haze:'#0f7a6e', ink:'#ffe8c8' },
    /* OFF-SPINE night #2 — deep crimson architecture over a cold blue mirror  */
    { name:'Crimson Vigil',   skT:'#04061c', skB:'#23347a', stone:'#240810', lit:'#ff6a7a', win:'#ff9a5a', glow:'#ff3d5e', haze:'#2a3e8a', ink:'#ffd4dc' },
  ];

  const FMTS = [ { W:1200, H:1480, t:'Stele' }, { W:1340, H:1340, t:'Square' }, { W:1500, H:1120, t:'Wide' } ];
  const SCENE = ['Great Ring', 'Arch Causeway', 'Drowned Colossus', 'Ziggurat', 'Obelisk Field', 'Slab Henge'];
  const SEAM  = ['Calm', 'Mist Veil', 'Glass'];

  function params(r){
    let pal=K.pick(PALS,r); if(window.FORCE_PAL) pal=PALS.find(q=>q.name===window.FORCE_PAL)||pal;
    const fmt=K.pick(FMTS,r); const scene=K.pick(SCENE,r); const seam=K.pick(SEAM,r);
    // waterline height varies per scene preference, jittered
    return { pal, fmt, scene, seam, r2:r() };
  }
  function traits(seed){ const p=params(K.rng(seed)); return { Palette:p.pal.name, Format:p.fmt.t, Scene:p.scene, Seam:p.seam }; }

  /* ── architectural primitives (NO window grids — sparse sacred apertures) ── */

  // a solid stone block with a lit edge + soft top bevel; optional tall slot apertures
  function block(x,cx,base,w,h,P,depth,slots,r){
    const col=K.mix(P.stone,P.haze,depth*0.5), rim=K.mix(P.lit,P.haze,depth*0.4);
    x.fillStyle=col; x.fillRect(cx-w/2, base-h, w, h);
    // sunstruck left edge
    x.fillStyle=K.rgba(rim,0.85-depth*0.4); x.fillRect(cx-w/2, base-h, Math.max(2,w*0.07), h);
    // sparse tall lit slots (sacred, not windows): 0-3, large, vertical
    if(slots && r()<0.85){ const n=1+Math.floor(r()*3); for(let i=0;i<n;i++){ const sx=cx-w*0.30+ (n>1? i/(n-1)*w*0.6 : 0); const sw=Math.max(2,w*0.05); const sh=h*(0.4+r()*0.4); const sy=base-sh*1.05;
      x.fillStyle=K.rgba(P.win,0.55+r()*0.35); x.fillRect(sx-sw/2, sy, sw, sh);
      K.bloom(x,sx,sy+sh*0.3,sw*4,P.win,0.12); } }
  }

  // a trapezoid pylon (wider at base) — ancient leg/support
  function pylon(x,cx,base,wTop,wBot,h,P,depth){
    const col=K.mix(P.stone,P.haze,depth*0.5);
    x.fillStyle=col; x.beginPath();
    x.moveTo(cx-wTop/2, base-h); x.lineTo(cx+wTop/2, base-h); x.lineTo(cx+wBot/2, base); x.lineTo(cx-wBot/2, base); x.closePath(); x.fill();
    x.fillStyle=K.rgba(K.mix(P.lit,P.haze,depth*0.4),0.7-depth*0.4); x.beginPath();
    x.moveTo(cx-wTop/2, base-h); x.lineTo(cx-wTop/2+wTop*0.16, base-h); x.lineTo(cx-wBot/2+wBot*0.16, base); x.lineTo(cx-wBot/2, base); x.closePath(); x.fill();
  }

  /* ── the six SCENE families. all draw INTO the offscreen, baseline = waterline.
       each returns nothing; hero geometry only (sky/water/reflection handled by
       draw()). ground reference y = `base` (the waterline). ── */
  function scene(x, W, hzY, P, p, r){
    const S=Math.min(W, hzY*1.6);
    const base=hzY;

    // faint distant ridge — soft hazy domes/mounds (NOT buildings), very low & sparse
    x.save(); x.globalCompositeOperation='multiply';
    for(let i=0;i<5;i++){ const bx=W*(0.08+i/5*0.86)+(r()-0.5)*50; const bw=S*(0.12+r()*0.10); const bh=S*(0.05+0.05*r());
      const g=x.createRadialGradient(bx,base,0,bx,base,bw); g.addColorStop(0,K.rgba(P.stone,0.5)); g.addColorStop(1,K.rgba(P.stone,0));
      x.fillStyle=g; x.beginPath(); x.ellipse(bx,base,bw,bh,0,Math.PI,0); x.fill(); } x.restore();

    if(p.scene==='Great Ring'){
      // colossal ring on two pylons — centred, lots of negative space
      const cx=W*0.5, rad=S*0.30, cy=base-S*0.46;
      // pylons into water first (behind ring fill)
      pylon(x, cx-rad*0.62, base, S*0.05, S*0.085, base-(cy+rad*0.55), P, 0.1);
      pylon(x, cx+rad*0.62, base, S*0.05, S*0.085, base-(cy+rad*0.55), P, 0.1);
      // ring body
      K.bloom(x,cx,cy,rad*1.5,P.glow,0.22);
      x.lineWidth=S*0.05; x.strokeStyle=K.mix(P.stone,P.lit,0.32); x.beginPath(); x.arc(cx,cy,rad,0,7); x.stroke();
      x.lineWidth=S*0.05*0.4; x.strokeStyle=K.rgba(K.mix(P.lit,'#fff',0.2),0.5); x.beginPath(); x.arc(cx-rad*0.04,cy-rad*0.04,rad,Math.PI*1.05,Math.PI*1.7); x.stroke();
      // inner thin-film bands
      for(let k=0;k<2;k++){ x.lineWidth=S*0.006; x.strokeStyle=K.rgba(K.iridescent(0.12+k*0.22,0.85,0.62),0.55); x.beginPath(); x.arc(cx,cy,rad*(0.84-k*0.12),0,7); x.stroke(); }
      // sparse aperture nodes around rim
      for(let a=0;a<10;a++){ const an=a/10*7; const px=cx+Math.cos(an)*rad, py=cy+Math.sin(an)*rad; x.fillStyle=K.rgba(P.win,0.8); x.beginPath(); x.arc(px,py,S*0.009,0,7); x.fill(); }

    } else if(p.scene==='Arch Causeway'){
      // receding row of giant arches marching to a vanishing point on a third
      const vp=W*(0.32+p.r2*0.36); const n=7;
      for(let i=n-1;i>=0;i--){ const depth=i/(n-1); const sc=(1-depth)*0.9+0.14;
        // arches recede along a line from the vanishing point outward toward the wide side
        const X=vp + (vp - W*0.5)*(depth*2.0);
        const w=S*0.42*sc, h=S*0.5*sc, th=w*0.17;
        const col=K.mix(P.stone,P.haze,depth*0.55);
        x.fillStyle=col; x.fillRect(X-w/2, base-h, th, h); x.fillRect(X+w/2-th, base-h, th, h);
        // rounded arch crown (semicircle spanning the opening, sitting on the piers)
        x.beginPath(); x.moveTo(X-w/2,base-h); x.lineTo(X-w/2,base-h-th*1.4);
        x.arc(X, base-h-th*1.4, w/2, Math.PI, 0); x.lineTo(X+w/2,base-h); x.lineTo(X+w/2-th,base-h);
        x.arc(X, base-h-th*1.4, w/2-th, 0, Math.PI, true); x.lineTo(X-w/2+th,base-h); x.closePath(); x.fill();
        x.fillStyle=K.rgba(K.mix(P.lit,P.haze,depth*0.5),0.8-depth*0.5); x.fillRect(X-w/2, base-h, Math.max(2,th*0.22), h);
        if(i===0){ K.bloom(x,X,base-h*0.55,w*0.6,P.glow,0.22); x.fillStyle=K.rgba(P.win,0.5); x.fillRect(X-th*0.3, base-h*0.9, th*0.6, h*0.7);} }

    } else if(p.scene==='Drowned Colossus'){
      // a huge abstract SEATED/STANDING figure-megastructure half-submerged, on a
      // third, dominating. Built as a clear silhouette: head, shoulders, torso,
      // an arched void between two leg-pylons (so it reads as a colossus, not a slab)
      const cx=W*(p.r2<0.5?0.37:0.63);
      const bw=S*0.30, bh=S*0.96, top=base-bh;
      const col=K.mix(P.stone,P.haze,0.03), litc=K.rgba(P.lit,0.6);
      // legs as two tapered pylons with a tall arched gap between them (drowned gate)
      const legW=bw*0.34, gap=bw*0.32, legH=bh*0.5;
      pylon(x, cx-gap/2-legW/2, base, legW*0.9, legW, legH, P, 0.0);
      pylon(x, cx+gap/2+legW/2, base, legW*0.9, legW, legH, P, 0.0);
      // arch crown over the leg gap
      x.fillStyle=col; x.fillRect(cx-gap/2-legW, base-legH-bh*0.04, gap+legW*2, bh*0.05);
      // torso block
      x.fillStyle=col; x.fillRect(cx-bw/2, base-legH-bh*0.42, bw, bh*0.40);
      x.fillStyle=litc; x.fillRect(cx-bw/2, base-legH-bh*0.42, Math.max(2,bw*0.06), bh*0.40);
      // shoulders (wider crossbeam)
      const shY=base-legH-bh*0.42; x.fillStyle=K.mix(P.stone,P.haze,0.06); x.fillRect(cx-bw*0.78, shY-bh*0.04, bw*1.56, bh*0.06);
      x.fillStyle=K.rgba(P.lit,0.55); x.fillRect(cx-bw*0.78, shY-bh*0.04, bw*1.56, Math.max(2,bh*0.01));
      // neck + head
      x.fillStyle=col; x.fillRect(cx-bw*0.12, shY-bh*0.10, bw*0.24, bh*0.06);
      const hw=bw*0.42, hh=bh*0.16, hy=shY-bh*0.10-hh; x.fillStyle=col; x.fillRect(cx-hw/2, hy, hw, hh);
      x.fillStyle=litc; x.fillRect(cx-hw/2, hy, Math.max(2,hw*0.10), hh);
      // single great lit eye/aperture in the head (sacred, glowing)
      const ex=cx, ey=hy+hh*0.5; K.bloom(x,ex,ey,S*0.09,P.glow,0.42); x.fillStyle=P.win; x.beginPath(); x.arc(ex,ey,S*0.018,0,7); x.fill(); x.fillStyle=K.rgba(P.win,0.45); x.beginPath(); x.arc(ex,ey,S*0.04,0,7); x.fill();
      // chest aperture band — a few tall lit slots on the torso
      for(let i=0;i<3;i++){ const sx=cx-bw*0.20+i*bw*0.20; x.fillStyle=K.rgba(P.win,0.4); x.fillRect(sx-S*0.005, base-legH-bh*0.34, S*0.01, bh*0.22);}
      // glow inside the drowned leg-gate
      K.bloom(x,cx,base-legH*0.4,gap*0.9,P.glow,0.16);
      // a second far, smaller colossus opposite (silent companion)
      const cx2b=W*(p.r2<0.5?0.84:0.16);
      x.save(); x.globalAlpha=0.5; pylon(x,cx2b-S*0.03,base,S*0.025,S*0.035,S*0.22,P,0.5); pylon(x,cx2b+S*0.03,base,S*0.025,S*0.035,S*0.22,P,0.5); x.fillStyle=K.rgba(P.stone,0.5); x.fillRect(cx2b-S*0.06,base-S*0.42,S*0.12,S*0.20); x.restore();

    } else if(p.scene==='Ziggurat'){
      // stepped pyramid temple, centred, broad symmetric mass, low waterline feel
      const cx=W*0.5; const tiers=6; const baseW=S*0.74; const totH=S*0.72;
      for(let t=0;t<tiers;t++){ const f=t/tiers; const w=baseW*(1-f*0.78); const h=totH/tiers; const y=base-(t+1)*h;
        const col=K.mix(P.stone, P.haze, 0.04+f*0.10); x.fillStyle=col; x.fillRect(cx-w/2, y, w, h);
        // lit top face of each step
        x.fillStyle=K.rgba(K.mix(P.lit,P.haze,f*0.3),0.5); x.fillRect(cx-w/2, y, w, Math.max(1,h*0.10));
        // left sun edge
        x.fillStyle=K.rgba(P.lit,0.6-f*0.3); x.fillRect(cx-w/2, y, Math.max(2,w*0.04), h); }
      // central stair shaft of light up the front
      x.fillStyle=K.rgba(P.win,0.32); x.fillRect(cx-S*0.018, base-totH, S*0.036, totH);
      // crowning beacon
      K.bloom(x,cx,base-totH,S*0.16,P.glow,0.34); x.fillStyle=P.win; x.beginPath(); x.arc(cx,base-totH-S*0.01,S*0.016,0,7); x.fill();
      // flanking lit slots on the broad base
      for(const sgn of [-1,1]){ x.fillStyle=K.rgba(P.win,0.4); x.fillRect(cx+sgn*baseW*0.32-S*0.006, base-totH*0.22, S*0.012, totH*0.18);}

    } else if(p.scene==='Obelisk Field'){
      // a sparse field of lone tall obelisks at varied depths — much negative space
      const n=5; const xs=[]; for(let i=0;i<n;i++) xs.push(0.10+0.80*i/(n-1)+(K.rng(i*31+1)()-0.5)*0.06);
      const items=xs.map((fx,i)=>({fx, depth:K.rng(i*17+3)()})).sort((a,b)=>a.depth-b.depth);
      for(const it of items){ const depth=it.depth; const sc=(1-depth)*1.0+0.18;
        const w=S*0.05*sc, h=S*0.7*sc; const cx=W*it.fx;
        // tapered obelisk (slim trapezoid + pyramidion)
        const col=K.mix(P.stone,P.haze,depth*0.6);
        x.fillStyle=col; x.beginPath(); x.moveTo(cx-w*0.32, base-h*0.86); x.lineTo(cx+w*0.32, base-h*0.86); x.lineTo(cx+w/2, base); x.lineTo(cx-w/2, base); x.closePath(); x.fill();
        x.beginPath(); x.moveTo(cx, base-h); x.lineTo(cx+w*0.32, base-h*0.86); x.lineTo(cx-w*0.32, base-h*0.86); x.closePath(); x.fill();
        // sun edge
        x.fillStyle=K.rgba(K.mix(P.lit,P.haze,depth*0.5),0.7-depth*0.4); x.fillRect(cx-w*0.4, base-h*0.86, Math.max(1.5,w*0.12), h*0.86);
        // a single lit apex node on near obelisks
        if(depth<0.5){ K.bloom(x,cx,base-h*0.9,w*3,P.glow,0.18); x.fillStyle=K.rgba(P.win,0.85); x.beginPath(); x.arc(cx,base-h*0.92,S*0.006,0,7); x.fill(); } }

    } else { // Slab Henge — a ring of colossal upright slabs in water, centred
      const cx=W*0.5, cy=base-S*0.06; const rx=W*0.36, ry=S*0.16; const n=8;
      // arrange slabs across a front arc, sort by y for correct overlap
      const slabs=[]; for(let i=0;i<n;i++){ const f=i/(n-1); const ang=Math.PI*(1.05+f*0.9); const px=cx+Math.cos(ang)*rx; const py=cy+Math.sin(ang)*ry; slabs.push({px,py,depth:1-(py-(cy-ry))/(ry*2)}); }
      slabs.sort((a,b)=>a.py-b.py);
      for(const s of slabs){ const sc=(1-Math.max(0,Math.min(1,s.depth)))*0.7+0.4; const w=S*0.09*sc, h=S*0.5*sc;
        // each slab stands with base at the waterline (massive, half in water)
        block(x, s.px, base, w, h, P, Math.max(0,Math.min(0.8,s.depth)), true, r); }
      // a centred lintel-crowned trilithon as the hero focus
      const tw=S*0.30, th=S*0.5, pw=tw*0.2;
      block(x,cx-tw/2+pw/2, base, pw, th, P, 0.0, false, r);
      block(x,cx+tw/2-pw/2, base, pw, th, P, 0.0, false, r);
      x.fillStyle=K.mix(P.stone,P.haze,0.06); x.fillRect(cx-tw/2-pw*0.2, base-th-pw*1.1, tw+pw*0.4, pw*1.1);
      x.fillStyle=K.rgba(P.lit,0.7); x.fillRect(cx-tw/2-pw*0.2, base-th-pw*1.1, tw+pw*0.4, Math.max(2,pw*0.12));
      K.bloom(x,cx,base-th*0.5,tw*0.7,P.glow,0.2); x.fillStyle=K.rgba(P.win,0.4); x.fillRect(cx-S*0.01, base-th*0.95, S*0.02, th*0.8);
    }
  }

  function draw(cv, seed){
    const r=K.rng(seed); const p=params(r); const P=p.pal;
    const W=p.fmt.W, H=p.fmt.H; cv.width=W; cv.height=H;
    const x=cv.getContext('2d'); const S=Math.min(W,H);
    const noise=K.makeNoise(seed^0x7c91);

    // waterline varies by scene + jitter (ziggurat/colossus sit lower so mass towers)
    const baseHz = ({'Great Ring':0.54,'Arch Causeway':0.56,'Drowned Colossus':0.60,'Ziggurat':0.62,'Obelisk Field':0.55,'Slab Henge':0.58})[p.scene];
    const hzY = H*(baseHz + (p.r2-0.5)*0.05);

    // SKY
    const sg=x.createLinearGradient(0,0,0,hzY); sg.addColorStop(0,P.skT); sg.addColorStop(1,K.mix(P.skB,P.skT,0.28));
    x.fillStyle=sg; x.fillRect(0,0,W,hzY);
    K.hazeSheet(x,W,hzY,noise,P.haze,0.45,S*0.55,'screen');
    K.bloom(x,W*0.5,hzY*0.46,W*0.6,P.skB,0.18);

    // build hero scene above water onto offscreen for clean mirroring
    const off=document.createElement('canvas'); off.width=W; off.height=Math.ceil(hzY)+2; const ox=off.getContext('2d');
    scene(ox, W, Math.ceil(hzY), P, p, K.rng(seed*3+11));
    x.drawImage(off,0,0);

    // WATER
    const wg=x.createLinearGradient(0,hzY,0,H); wg.addColorStop(0,K.mix(P.skB,P.stone,0.42)); wg.addColorStop(0.5,K.mix(P.stone,P.skT,0.32)); wg.addColorStop(1,K.mix(P.stone,'#000',0.5));
    x.fillStyle=wg; x.fillRect(0,hzY,W,H-hzY);

    // reflection: flipped, faded, wavered bands (subtly WRONG — slight extra wob)
    x.save(); x.globalAlpha=0.54; x.globalCompositeOperation='lighter';
    const refH=H-hzY; const bands=Math.floor(refH/3);
    for(let b=0;b<bands;b++){ const f=b/bands; const sy=hzY-1-f*hzY*0.98; const dy=hzY+f*refH;
      const wob=Math.sin(b*0.5+seed)*S*0.004*(p.seam==='Glass'?0.3:1.4);
      x.globalAlpha=0.58*(1-f*0.55); // fade reflection with depth
      x.drawImage(off, 0, Math.max(0,sy), W, hzY/bands+1, wob, dy, W, refH/bands+1); }
    x.restore();

    // water tint + ripple shimmer
    x.save(); x.globalCompositeOperation='screen'; x.fillStyle=K.rgba(P.haze,0.09);
    for(let i=0;i<60;i++){ const yy=hzY+Math.pow(i/60,1.4)*refH; x.fillRect(0,yy,W,1+(i/60)*2);} x.restore();

    // luminous SEAM haze at the waterline
    const seamI = p.seam==='Mist Veil'?0.6:p.seam==='Glass'?0.18:0.34;
    x.save(); x.globalCompositeOperation='screen';
    const seg=x.createLinearGradient(0,hzY-S*0.11,0,hzY+S*0.11); seg.addColorStop(0,K.rgba(P.haze,0)); seg.addColorStop(0.5,K.rgba(P.haze,seamI)); seg.addColorStop(1,K.rgba(P.haze,0));
    x.fillStyle=seg; x.fillRect(0,hzY-S*0.11,W,S*0.22); x.restore();
    K.bloom(x,W*0.5,hzY,W*0.7,P.glow,0.16);

    // faint instrument substrate: plumb line + level ticks + corner brackets
    x.save(); x.strokeStyle=K.rgba(P.ink,0.4); x.lineWidth=1; x.globalAlpha=0.5;
    x.beginPath(); x.moveTo(W*0.5,0); x.lineTo(W*0.5,H); x.stroke();
    for(let i=0;i<=16;i++){ const yy=H*i/16; x.beginPath(); x.moveTo(0,yy); x.lineTo(S*0.012,yy); x.stroke(); }
    const m=S*0.045,b=S*0.05; [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([bx,by,sxn,syn])=>{x.beginPath();x.moveTo(bx,by+syn*b);x.lineTo(bx,by);x.lineTo(bx+sxn*b,by);x.stroke();});
    x.restore();

    K.scanlines(x,W,H,3,0.045);
    K.grain(x,W,H,520,r);
    K.chromaSplit(x,W,H,1);
    K.vignette(x,W,H,0.52);
    return { aspect: W/H };
  }

  return { name:'C2_vespers', draw, traits };
})();
