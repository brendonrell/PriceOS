/* HALO direction D — ARMILLARY v2  (the floating precision instrument)
 * The most abstract of the set: a great precision MECHANISM — nested tilted
 * rings, a glowing core, orbiting bodies on gauge-arc tracks, radial tick
 * scales — suspended in coloured haze. Surreal "real but off": an exact
 * instrument measuring nothing, hung over a vast world.
 *
 * Jury fixes baked in:
 * (1) ANCHORED TO A WORLD — most scenes carry a far horizon / ground plane,
 *     stacked atmosphere bands and depth fog, plus receding background
 *     mechanisms. The instrument hangs OVER a world; it is not a logo on black.
 * (2) PALETTE DISTINCTNESS — every iridescent ring sweep is CLAMPED to a narrow
 *     band around that palette's own two hue poles (hA→hB), so a magenta↔gold
 *     world sweeps only magenta→gold, a cyan↔violet world only cyan→violet.
 *     The haze GROUNDS are saturated per palette and carry the colour identity;
 *     we never let the rings run the full rainbow. Each palette is a distinct
 *     HOT/electric colour world.
 * (3) SIX structurally distinct SCENE families (a trait), differing hard in
 *     density / scale / negative space: Orrery over Horizon · Gyroscope ·
 *     Gauge Cluster · Solitary · Swarm · Cross-section. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Each palette is one HOT colour WORLD. hA/hB = the two hue poles (degrees)
     the iridescent rings sweep BETWEEN — a narrow band, never the rainbow.
     sat/lite = ring band saturation/lightness. g0/g1 = deep saturated ground
     vignette. h1/h2 = the two haze wash hues (carry the colour identity).
     core = central glow, node = orbiting bodies (a deliberately contrasting
     accent so they read as separate parts), ink = instrument ticks. */
  const PALS = [
    { name:'Magenta',  hA:312, hB:44,  sat:0.95, lite:0.60, g0:'#1c0418', g1:'#060109', h1:'#ff2da0', h2:'#ffb03d', core:'#ff5de0', node:'#3fe6ff', ink:'#ffd0ee' },
    { name:'Gold',     hA:36,  hB:348, sat:0.96, lite:0.58, g0:'#1c1202', g1:'#080400', h1:'#ffb01f', h2:'#ff3d6a', core:'#ffd23d', node:'#3fffd0', ink:'#ffe6b0' },
    { name:'Cyan',     hA:188, hB:280, sat:0.92, lite:0.60, g0:'#021820', g1:'#01070b', h1:'#1fd6ff', h2:'#9b5dff', core:'#5dffe0', node:'#ffd23d', ink:'#cfeeff' },
    { name:'Coral',    hA:14,  hB:46,  sat:0.95, lite:0.60, g0:'#1e0804', g1:'#0a0301', h1:'#ff5d3a', h2:'#ffc83d', core:'#ff7a4d', node:'#3fd6ff', ink:'#ffd6c0' },
    { name:'Violet',   hA:268, hB:330, sat:0.92, lite:0.62, g0:'#11041e', g1:'#05010c', h1:'#9b5dff', h2:'#ff4fa8', core:'#b06aff', node:'#5dffc0', ink:'#e6d6ff' },
    { name:'Lime',     hA:84,  hB:172, sat:0.92, lite:0.58, g0:'#0a1602', g1:'#030700', h1:'#a6ff1f', h2:'#1fd6c0', core:'#d6ff5d', node:'#ff4fd0', ink:'#e8ffc0' },
    { name:'Ember',    hA:24,  hB:350, sat:0.96, lite:0.56, g0:'#1c0602', g1:'#080200', h1:'#ff7a1f', h2:'#ff2d5a', core:'#ffb04d', node:'#3fe6ff', ink:'#ffd0b0' },
    { name:'Ice',      hA:210, hB:170, sat:0.86, lite:0.64, g0:'#04121e', g1:'#01060c', h1:'#3a8aff', h2:'#3fffe0', core:'#9bc6ff', node:'#ffd23d', ink:'#d6e8ff' },
    { name:'Rose',     hA:330, hB:20,  sat:0.92, lite:0.62, g0:'#1c0412', g1:'#080108', h1:'#ff3d8a', h2:'#ffb86a', core:'#ff6aa8', node:'#5dd6ff', ink:'#ffd6e6' },
    { name:'Teal',     hA:166, hB:50,  sat:0.90, lite:0.58, g0:'#02161a', g1:'#010708', h1:'#1fe0c0', h2:'#ffd23d', core:'#3fffe0', node:'#ff5da0', ink:'#cffff4' },
  ];

  const FMTS = [ { W:1340, H:1340, t:'Square' }, { W:1180, H:1480, t:'Portrait' }, { W:1500, H:1140, t:'Wide' } ];
  const SCENE = ['Orrery over Horizon', 'Gyroscope', 'Gauge Cluster', 'Solitary', 'Swarm', 'Cross-section'];
  const RINGS = ['Few', 'Many'];
  const SPIN  = ['Aligned', 'Tumbled'];

  function params(r){
    let pal=K.pick(PALS,r); if(window.FORCE_PAL) pal=PALS.find(q=>q.name===window.FORCE_PAL)||pal;
    const fmt=K.pick(FMTS,r); const scene=K.pick(SCENE,r); const rings=K.pick(RINGS,r); const spin=K.pick(SPIN,r);
    return { pal, fmt, scene, rings, spin };
  }
  function traits(seed){ const p=params(K.rng(seed)); return { Palette:p.pal.name, Format:p.fmt.t, Scene:p.scene, Rings:p.rings, Spin:p.spin }; }

  /* ── palette-clamped iridescence ──────────────────────────────────────
     t in [0,1] maps to a hue on the SHORT arc between the palette's two
     poles hA→hB — never the full wheel. This is the fix that gives every
     palette its own distinct colour world instead of "dark + rainbow". */
  function bandHue(P,t){
    let a=((P.hA%360)+360)%360, b=((P.hB%360)+360)%360;
    let d=b-a; if(d>180)d-=360; if(d<-180)d+=360;   // short way round
    return a + d*t;
  }
  function bandCol(P,t,light){ return K.hsl2hex(bandHue(P,t), P.sat, light==null?P.lite:light); }

  /* a tilted iridescent ring: metal base + palette-band spectral sweep + ticks.
     `phase` shifts where in the band this ring's sweep starts; `span` how much
     of the band it traverses (kept < 1 so rings differ but stay on-palette). */
  function ring(x, cx, cy, rad, tiltY, rot, P, phase, span, lw, ticks, alpha){
    alpha = alpha==null?1:alpha;
    x.save(); x.translate(cx,cy); x.rotate(rot); x.scale(1, tiltY);
    // metal base track (slightly inset dark)
    x.lineWidth=lw*1.7; x.strokeStyle=K.rgba(K.mix(P.g0,'#000',0.3), 0.85*alpha); x.beginPath(); x.arc(0,0,rad,0,7); x.stroke();
    // iridescent sweep clamped to the palette band
    const segs=80;
    for(let i=0;i<segs;i++){ const a0=i/segs*7, a1=(i+1)/segs*7;
      const tt=(phase + (i/segs)*span)%1;
      x.strokeStyle=K.rgba(bandCol(P, tt), 0.9*alpha);
      x.lineWidth=lw; x.beginPath(); x.arc(0,0,rad,a0,a1); x.stroke(); }
    // bright specular lobe
    x.strokeStyle=K.rgba('#ffffff',0.5*alpha); x.lineWidth=lw*0.5; x.beginPath(); x.arc(0,0,rad,-0.6,0.25); x.stroke();
    if(ticks){ x.strokeStyle=K.rgba(P.ink,0.55*alpha); x.lineWidth=1;
      for(let i=0;i<72;i++){ const an=i/72*7; const t=i%6===0?lw*2.0:lw*0.9;
        x.beginPath(); x.moveTo(Math.cos(an)*rad, Math.sin(an)*rad); x.lineTo(Math.cos(an)*(rad+t), Math.sin(an)*(rad+t)); x.stroke(); } }
    x.restore();
  }

  /* an orbiting body on a ring's track + its glow (projected to screen space). */
  function bodyNode(x, cx, cy, rad, tiltY, rot, ang, P, sz, alpha){
    alpha = alpha==null?1:alpha;
    const px=Math.cos(ang)*rad, py=Math.sin(ang)*rad*tiltY;
    const sx=cx + (Math.cos(rot)*px - Math.sin(rot)*py);
    const sy=cy + (Math.sin(rot)*px + Math.cos(rot)*py);
    K.bloom(x,sx,sy,sz*3.2,P.node,0.5*alpha);
    const g=x.createRadialGradient(sx-sz*0.3,sy-sz*0.3,0,sx,sy,sz);
    g.addColorStop(0,'#fff'); g.addColorStop(0.4,P.node); g.addColorStop(1,K.mix(P.node,'#000',0.55));
    x.save(); x.globalAlpha=alpha; x.fillStyle=g; x.beginPath(); x.arc(sx,sy,sz,0,7); x.fill(); x.restore();
    return [sx,sy];
  }

  /* the hero/background MECHANISM. `mode` controls family-specific shape.
     faded → far/atmosphered version (background, lower alpha, no core flare). */
  function mechanism(x, cx, cy, R, P, opts){
    const mode=opts.mode||'armillary';
    const ringsN=opts.rings||'Few', spin=opts.spin||'Aligned';
    const faded=!!opts.faded, alpha=opts.alpha==null?1:opts.alpha;
    const seedR=opts.seedR||K.rng(99);
    const lw=Math.max(2, R*0.03);

    // core glow + flare — kept TIGHT so it reads as a glowing hub, not a blown
    // white sun that swallows the rings.
    K.bloom(x,cx,cy,R*0.55,P.core, (faded?0.18:0.40)*alpha);
    if(!faded){ const cg=x.createRadialGradient(cx,cy,0,cx,cy,R*0.13); cg.addColorStop(0,'#fff'); cg.addColorStop(0.35,P.core); cg.addColorStop(0.75,K.rgba(P.core,0.5)); cg.addColorStop(1,K.rgba(P.core,0)); x.fillStyle=cg; x.save(); x.globalAlpha=alpha; x.beginPath(); x.arc(cx,cy,R*0.13,0,7); x.fill(); x.restore(); }

    if(mode==='gauge'){
      const dials=ringsN==='Many'?6:4;
      // a cluster of dial FACES — each a stacked instrument (outer band + inner
      // scale ring + ticks + sweeping needle) so it reads as gauges, not circles.
      const faces=[];
      for(let d=0; d<dials; d++){ const an=d/dials*6.2831+0.3; faces.push([cx+Math.cos(an)*R*0.66, cy+Math.sin(an)*R*0.66, R*(0.22+(d%3)*0.05), d]); }
      faces.push([cx,cy,R*0.34,99]); // central master dial
      for(const [dx,dy,dr,d] of faces){
        // recessed dark face
        x.save(); x.globalAlpha=alpha; const fg=x.createRadialGradient(dx,dy,0,dx,dy,dr); fg.addColorStop(0,K.rgba(K.mix(P.g0,'#000',0.2),0.85)); fg.addColorStop(1,K.rgba(P.g1,0.4)); x.fillStyle=fg; x.beginPath(); x.arc(dx,dy,dr,0,7); x.fill(); x.restore();
        ring(x,dx,dy,dr,0.97,0,P, (d*0.17)%1, 0.4, lw*0.8, true, alpha);            // bezel
        ring(x,dx,dy,dr*0.62,0.97,0,P, (d*0.17+0.3)%1, 0.35, lw*0.5, false, alpha*0.8); // inner scale
        // needle (sweeping → a measured reading)
        const na=K.rng((d+1)*37)()*7; x.save(); x.globalAlpha=alpha; x.strokeStyle=P.ink; x.lineWidth=lw*0.55; x.beginPath(); x.moveTo(dx,dy); x.lineTo(dx+Math.cos(na)*dr*0.82, dy+Math.sin(na)*dr*0.82); x.stroke(); x.restore();
        bodyNode(x,dx,dy,dr,0.97,0,na,P,R*0.02,alpha);
        // hub pip
        x.save(); x.globalAlpha=alpha; x.fillStyle=P.core; x.beginPath(); x.arc(dx,dy,dr*0.08,0,7); x.fill(); x.restore();
      }
      return;
    }

    const nRings = ringsN==='Many'? (mode==='gyroscope'?7:6) : (mode==='gyroscope'?4:4);
    for(let i=0;i<nRings;i++){
      const t=i/(nRings-1||1);
      const rad=R*(0.96-t*0.64);
      const tilt = mode==='gyroscope' ? (0.22+0.62*Math.abs(Math.sin(i*1.27+0.4)))
                 : mode==='cross'      ? (0.16+0.16*t)                       // shallow slices
                 : 0.30+0.50*t;
      const rot = spin==='Aligned' ? i*0.13 : (seedR()-0.5)*3.1;
      // span/phase: gyroscope tumbles hard so spread each ring further across
      // the band for richer colour variety on the close-up.
      const span = mode==='gyroscope'?0.62:0.45;
      ring(x,cx,cy,rad,tilt,rot,P, (i*0.31)%1, span, lw*(1-t*0.3), i<2, alpha);
      // orbiting bodies on outer rings (orrery / armillary reads)
      if((mode==='orrery'||mode==='armillary') && i<nRings-1){
        const bodies=1+(i%2);
        for(let b=0;b<bodies;b++){ const ang=seedR()*7; bodyNode(x,cx,cy,rad,tilt,rot,ang,P,R*(0.032-t*0.012)+3,alpha); }
      }
    }

    // central axis pin (armillary read) — not on gyroscope (free-tumbling)
    if(mode!=='gyroscope'){ x.save(); x.globalAlpha=alpha; x.strokeStyle=K.rgba(P.ink,0.55); x.lineWidth=lw*0.5;
      const ax=R*1.18; const ag=x.createLinearGradient(cx,cy-ax,cx,cy+ax); ag.addColorStop(0,K.rgba(P.ink,0)); ag.addColorStop(0.3,K.rgba(P.ink,0.55)); ag.addColorStop(0.7,K.rgba(P.ink,0.55)); ag.addColorStop(1,K.rgba(P.ink,0)); x.strokeStyle=ag;
      x.beginPath(); x.moveTo(cx,cy-ax); x.lineTo(cx,cy+ax); x.stroke(); x.restore(); }

    // radial gauge scale around the outermost ring
    if(!faded){ x.save(); x.globalAlpha=alpha; x.strokeStyle=K.rgba(P.ink,0.4); x.lineWidth=1;
      for(let i=0;i<96;i++){ const an=i/96*7; const t=i%8===0?R*0.05:R*0.022;
        x.beginPath(); x.moveTo(cx+Math.cos(an)*R, cy+Math.sin(an)*R); x.lineTo(cx+Math.cos(an)*(R+t), cy+Math.sin(an)*(R+t)); x.stroke(); } x.restore(); }

    // CROSS-SECTION extras: a perpendicular ring plane (the "slice through"),
    // exploded leader lines + radial spokes → reads as a sliced 3D mechanism.
    if(mode==='cross'){
      // upright companion rings cutting through the shallow stack
      for(let k=0;k<3;k++){ const rad=R*(0.9-k*0.28);
        x.save(); x.translate(cx,cy); x.rotate(Math.PI/2); x.scale(1,0.20);
        x.lineWidth=lw*1.4; x.strokeStyle=K.rgba(K.mix(P.g0,'#000',0.3),0.85*alpha); x.beginPath(); x.arc(0,0,rad,0,7); x.stroke();
        const segs=70; for(let i=0;i<segs;i++){ const a0=i/segs*7,a1=(i+1)/segs*7; const tt=(0.2+k*0.2+i/segs*0.4)%1; x.strokeStyle=K.rgba(bandCol(P,tt),0.85*alpha); x.lineWidth=lw; x.beginPath(); x.arc(0,0,rad,a0,a1); x.stroke(); }
        x.restore(); }
      x.save(); x.globalAlpha=alpha; x.strokeStyle=K.rgba(P.h2,0.4); x.lineWidth=lw*0.45; x.setLineDash([4,5]);
      for(let i=0;i<10;i++){ const an=i/10*7; x.beginPath(); x.moveTo(cx,cy); x.lineTo(cx+Math.cos(an)*R*1.2, cy+Math.sin(an)*R*0.4); x.stroke(); }
      x.restore(); }
  }

  /* ── WORLD: far horizon, ground plane, stacked atmosphere, depth fog ── */
  function world(x,W,H,P,noise,hzY,seed){
    // sky bands above horizon (saturated haze grounds carry the colour)
    K.hazeSheet(x,W,hzY,noise,P.h1,0.34,Math.min(W,H)*0.55,'screen');
    K.hazeSheet(x,W,hzY,noise,P.h2,0.20,Math.min(W,H)*0.85,'screen');
    // a contained glow pool on the horizon (not a full-width light bar — that
    // flattened depth). Offset + smaller so the plane keeps its recession.
    const gx=W*(0.42+0.16*K.rng(seed*7)());
    K.bloom(x,gx,hzY,W*0.42,P.h2,0.20);
    K.bloom(x,gx,hzY,W*0.22,P.core,0.12);
    // the ground plane — dark, receding to black at the bottom
    const gg=x.createLinearGradient(0,hzY,0,H);
    gg.addColorStop(0,K.mix(P.g0,P.h2,0.18)); gg.addColorStop(0.18,P.g0); gg.addColorStop(1,K.mix(P.g1,'#000',0.5));
    x.fillStyle=gg; x.fillRect(0,hzY,W,H-hzY);
    // a crisp horizon edge + faint survey perspective lines on the plane
    x.save(); x.strokeStyle=K.rgba(P.ink,0.28); x.lineWidth=1.4; x.beginPath(); x.moveTo(0,hzY); x.lineTo(W,hzY); x.stroke(); x.restore();
    x.save(); x.globalCompositeOperation='screen'; x.strokeStyle=K.rgba(P.h1,0.07); x.lineWidth=1; const vpx=W*0.5;
    for(let i=-14;i<=14;i++){ x.beginPath(); x.moveTo(vpx+i*W*0.04,hzY); x.lineTo(vpx+i*W*0.55,H); x.stroke(); }
    for(let j=1;j<=8;j++){ const yy=hzY+Math.pow(j/8,2.3)*(H-hzY); x.beginPath(); x.moveTo(0,yy); x.lineTo(W,yy); x.stroke(); }
    x.restore();
    // depth fog hugging the horizon (kills the hard plane edge → atmosphere)
    x.save(); x.globalCompositeOperation='screen'; const fg=x.createLinearGradient(0,hzY-H*0.10,0,hzY+H*0.16);
    fg.addColorStop(0,K.rgba(P.h2,0)); fg.addColorStop(0.5,K.rgba(P.h2,0.5)); fg.addColorStop(1,K.rgba(P.h2,0));
    x.fillStyle=fg; x.fillRect(0,hzY-H*0.10,W,H*0.26); x.restore();
  }

  function draw(cv, seed){
    const r=K.rng(seed); const p=params(r); const P=p.pal;
    const W=p.fmt.W,H=p.fmt.H; cv.width=W;cv.height=H;
    const x=cv.getContext('2d'); const S=Math.min(W,H);
    const noise=K.makeNoise(seed^0x33af);

    // deep saturated ground vignette (per-palette colour world)
    const bg=x.createRadialGradient(W*0.5,H*0.42,0,W*0.5,H*0.52,Math.max(W,H)*0.75);
    bg.addColorStop(0,P.g0); bg.addColorStop(1,P.g1); x.fillStyle=bg; x.fillRect(0,0,W,H);

    // Solitary = a void with vast negative space (no horizon, just deep atmosphere).
    const hasHorizon = (p.scene!=='Solitary' && p.scene!=='Gyroscope');
    const hzY = H*(0.62 + (K.rng(seed*3)()-0.5)*0.08);

    if(hasHorizon){
      world(x,W,H,P,noise,hzY,seed);
    } else {
      // atmosphere-only depth (Solitary / Gyroscope close-up) — layered volume
      // so the mechanism hangs in fog, not on a flat field.
      K.hazeSheet(x,W,H,noise,P.h1,0.34,S*0.50,'screen');
      K.hazeSheet(x,W,H,noise,P.h2,0.22,S*0.85,'screen');
      K.hazeSheet(x,W,H,noise,P.h1,0.14,S*1.5,'screen');
      // a soft off-centre light well + drifting curl wisps for atmosphere depth
      const wx=W*(0.40+0.2*K.rng(seed*7)()), wy=H*(0.36+0.2*K.rng(seed*13)());
      K.bloom(x,wx,wy,S*0.7,P.h2,0.14); K.bloom(x,wx,wy,S*0.35,P.core,0.08);
      x.save(); x.globalCompositeOperation='screen';
      for(let i=0;i<26;i++){ const rr=K.rng(seed*17+i*7); let px=rr()*W,py=rr()*H;
        x.strokeStyle=K.rgba(i%2?P.h1:P.h2,0.05+rr()*0.05); x.lineWidth=0.8+rr()*1.4; x.beginPath(); x.moveTo(px,py);
        for(let s2=0;s2<8;s2++){ const v=K.curl(noise,px,py,1); px+=v[0]*40; py+=v[1]*40; x.lineTo(px,py); } x.stroke(); }
      x.restore();
    }

    // ── BACKGROUND satellite mechanisms receding into fog ──
    // density varies hard by scene → epic scale vs minimal void.
    let satN = 0, satBand=[0.12,0.42], satScale=1;
    if(p.scene==='Swarm') { satN = p.rings==='Many'?10:7; satBand=[0.08,0.80]; satScale=1.5; }
    else if(p.scene==='Gauge Cluster') { satN = 4; satBand=[0.14,0.50]; }
    else if(p.scene==='Orrery over Horizon') { satN = 3; satBand=[0.10,hzY/H*0.78]; }
    else if(p.scene==='Cross-section') { satN = 2; satBand=[0.12,0.45]; }
    else if(p.scene==='Solitary') { satN = 1; satBand=[0.10,0.34]; }
    else if(p.scene==='Gyroscope') { satN = 2; satBand=[0.10,0.40]; }

    for(let s=0;s<satN;s++){ const sr=K.rng(seed*5+s*131);
      const sx=W*(0.08+0.84*sr()); const sy=H*(satBand[0]+ (satBand[1]-satBand[0])*sr());
      const sR=S*(0.05+0.07*sr())*satScale; const far=0.20+0.45*sr();
      mechanism(x,sx,sy,sR,P,{mode:'armillary',rings:sr()<0.4?'Many':'Few',spin:'Tumbled',faded:true,alpha:far,seedR:K.rng(seed+s*101)});
    }

    // ── HERO mechanism — scene-specific placement, scale & family ──
    let cx,cy,R,mode;
    if(p.scene==='Orrery over Horizon'){
      cx=W*(0.5+(K.rng(seed*9)()-0.5)*0.10); cy=hzY-S*0.10; R=S*0.30; mode='orrery';
    } else if(p.scene==='Gyroscope'){
      cx=W*0.5; cy=H*0.48; R=S*0.42; mode='gyroscope';                 // close-up, fills frame
    } else if(p.scene==='Gauge Cluster'){
      cx=W*0.5; cy=hzY-S*0.06; R=S*0.30; mode='gauge';
    } else if(p.scene==='Solitary'){
      cx=W*(0.30+0.14*K.rng(seed*9)()); cy=H*(0.34+0.12*K.rng(seed*11)()); R=S*0.21; mode='armillary'; // small, vast void
    } else if(p.scene==='Swarm'){
      cx=W*(0.46+(K.rng(seed*9)()-0.5)*0.12); cy=hzY-S*0.10; R=S*0.30; mode='orrery';   // busy field, hero among many
    } else { // Cross-section
      cx=W*0.5; cy=H*0.46; R=S*0.34; mode='cross';
    }

    mechanism(x,cx,cy,R,P,{mode,rings:p.rings,spin:p.spin,faded:false,alpha:1,seedR:r});

    // foreground atmospheric bloom around the hero + drifting motes
    K.bloom(x,cx,cy,R*1.9,P.core,0.12);
    x.save(); x.globalCompositeOperation='lighter';
    for(let i=0;i<90;i++){ const mx=r()*W,my=r()*H; const d=Math.hypot(mx-cx,my-cy);
      if(d<R*1.8){ x.fillStyle=K.rgba(i%2?P.node:P.h2, 0.05+r()*0.12); x.beginPath(); x.arc(mx,my,0.6+r()*1.9,0,7); x.fill(); } }
    x.restore();

    // a low foreground haze band → depth (something in front of the world)
    if(hasHorizon){ x.save(); x.globalCompositeOperation='screen'; const fh=x.createLinearGradient(0,H*0.84,0,H);
      fh.addColorStop(0,K.rgba(P.h1,0)); fh.addColorStop(1,K.rgba(P.h1,0.22)); x.fillStyle=fh; x.fillRect(0,H*0.84,W,H*0.16); x.restore(); }

    // instrument substrate — corner brackets + frame ticks
    x.save(); x.strokeStyle=K.rgba(P.ink,0.4); x.lineWidth=1.3; x.globalAlpha=0.5;
    const m=S*0.045,b=S*0.05;
    [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([bx,by,sxn,syn])=>{x.beginPath();x.moveTo(bx,by+syn*b);x.lineTo(bx,by);x.lineTo(bx+sxn*b,by);x.stroke();});
    for(let i=0;i<=24;i++){ const xx=W*i/24; x.beginPath(); x.moveTo(xx,H-S*0.03); x.lineTo(xx,H-S*0.03-(i%4===0?S*0.014:S*0.007)); x.stroke(); }
    x.restore();

    K.scanlines(x,W,H,3,0.05);
    K.grain(x,W,H,480,r);
    K.chromaSplit(x,W,H,1);
    K.vignette(x,W,H,0.55);
    return { aspect: W/H };
  }

  return { name:'D2_armillary', draw, traits };
})();
