/* HALO direction D — ARMILLARY  (the floating instrument / orrery-machine)
 * The most abstract of the four: a great precision mechanism suspended in
 * coloured haze — nested tilted rings, a glowing core, orbiting bodies on
 * gauge-arc tracks, radial tick scales, satellite sub-mechanisms drifting in
 * the depth. "Real but off": an exact instrument measuring nothing, hanging in
 * a void it shouldn't. HOT palette world — magenta / gold / cyan / coral on
 * deep grounds — distinct from the other three directions' colour. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* ARMILLARY identity = a HOT mechanism glowing in deep haze. g0/g1 = deep
     ground vignette; ring = metal arc base; a/b = the two iridescent hue poles
     the rings sweep between; core = central glow; node = orbiting body; ink =
     instrument ticks. Saturated, hot, never the cool jewels of VESPERS. */
  const PALS = [
    { name:'Magenta Core', g0:'#1a0316', g1:'#05010a', ring:'#3a1230', a:'#ff2da0', b:'#ffd23d', core:'#ff5de0', node:'#3fe0ff', ink:'#ffd0ee' },
    { name:'Gold Reactor', g0:'#1a1002', g1:'#080400', ring:'#3a2a06', a:'#ffb01f', b:'#ff3d6a', core:'#ffd23d', node:'#3fffd0', ink:'#ffe6b0' },
    { name:'Cyan Engine',  g0:'#02161c', g1:'#01070a', ring:'#0a2a32', a:'#1fd6ff', b:'#ff4fd0', core:'#5dffe0', node:'#ffd23d', ink:'#cfeeff' },
    { name:'Coral Forge',  g0:'#1c0804', g1:'#0a0301', ring:'#3a1408', a:'#ff5d3a', b:'#ffd23d', core:'#ff7a4d', node:'#3fd0ff', ink:'#ffd6c0' },
    { name:'Violet Drive', g0:'#10041e', g1:'#05010c', ring:'#241040', a:'#9b5dff', b:'#ff4fa0', core:'#b06aff', node:'#5dffc0', ink:'#e6d6ff' },
    { name:'Lime Dynamo',  g0:'#0a1602', g1:'#030700', ring:'#1a3008', a:'#b6ff1f', b:'#1fd6ff', core:'#d6ff5d', node:'#ff4fd0', ink:'#e8ffc0' },
    { name:'Ember Spindle',g0:'#1a0602', g1:'#080200', ring:'#3a1004', a:'#ff7a1f', b:'#ff2d6a', core:'#ffb04d', node:'#3fe0ff', ink:'#ffd0b0' },
    { name:'Ice Magneto',  g0:'#04101e', g1:'#01060c', ring:'#0a2240', a:'#3a8aff', b:'#3fffe0', core:'#7db0ff', node:'#ffd23d', ink:'#d6e8ff' },
    { name:'Rose Gyro',    g0:'#1a0410', g1:'#080108', ring:'#360a26', a:'#ff3d8a', b:'#ffb86a', core:'#ff6aa8', node:'#5dd0ff', ink:'#ffd6e6' },
    { name:'Teal Orrery',  g0:'#02161a', g1:'#010708', ring:'#08303a', a:'#1fe0c0', b:'#ffd23d', core:'#3fffe0', node:'#ff5da0', ink:'#cffff4' },
  ];

  const FMTS = [ { W:1340, H:1340, t:'Square' }, { W:1180, H:1460, t:'Portrait' }, { W:1500, H:1140, t:'Wide' } ];
  const MECH = ['Armillary', 'Orrery', 'Gyroscope', 'Gauge Cluster'];
  const RINGS = ['Few', 'Many'];
  const SPIN = ['Aligned', 'Tumbled'];

  function params(r){
    let pal=K.pick(PALS,r); if(window.FORCE_PAL) pal=PALS.find(q=>q.name===window.FORCE_PAL)||pal;
    const fmt=K.pick(FMTS,r); const mech=K.pick(MECH,r); const rings=K.pick(RINGS,r); const spin=K.pick(SPIN,r);
    return { pal, fmt, mech, rings, spin };
  }
  function traits(seed){ const p=params(K.rng(seed)); return { Palette:p.pal.name, Format:p.fmt.t, Mechanism:p.mech, Rings:p.rings, Spin:p.spin }; }

  // a tilted iridescent ring: ellipse with metal base + spectral sweep + ticks.
  function ring(x, cx, cy, rad, tiltX, rot, P, hue, lw, ticks, r){
    x.save(); x.translate(cx,cy); x.rotate(rot); x.scale(1, tiltX);
    // metal base
    x.lineWidth=lw*1.5; x.strokeStyle=K.mix(P.ring,'#000',0.2); x.beginPath(); x.arc(0,0,rad,0,7); x.stroke();
    // iridescent sweep — segmented arc with shifting hue
    const segs=72; for(let i=0;i<segs;i++){ const a0=i/segs*7, a1=(i+1)/segs*7;
      const ph=hue + i/segs; x.strokeStyle=K.rgba(K.iridescent(ph,0.92,0.6), 0.85);
      x.lineWidth=lw; x.beginPath(); x.arc(0,0,rad,a0,a1); x.stroke(); }
    // bright specular highlight lobe
    x.strokeStyle=K.rgba('#ffffff',0.5); x.lineWidth=lw*0.5; x.beginPath(); x.arc(0,0,rad, -0.6, 0.2); x.stroke();
    if(ticks){ x.strokeStyle=K.rgba(P.ink,0.6); x.lineWidth=1; for(let i=0;i<60;i++){ const an=i/60*7; const t=i%5===0?lw*1.8:lw*0.9; x.beginPath(); x.moveTo(Math.cos(an)*(rad), Math.sin(an)*(rad)); x.lineTo(Math.cos(an)*(rad+t), Math.sin(an)*(rad+t)); x.stroke(); } }
    x.restore();
  }

  // an orbiting body on a track + its glow.
  function bodyNode(x, cx, cy, rad, tiltX, rot, ang, P, sz, r){
    x.save(); x.translate(cx,cy); x.rotate(rot); x.scale(1,tiltX);
    const px=Math.cos(ang)*rad, py=Math.sin(ang)*rad; x.restore();
    // transform point back to screen approx (we drew node in ring space): recompute
    const sx=cx + (Math.cos(rot)*px - Math.sin(rot)*py*tiltX);
    const sy=cy + (Math.sin(rot)*px + Math.cos(rot)*py*tiltX);
    K.bloom(x,sx,sy,sz*3,P.node,0.5);
    const g=x.createRadialGradient(sx-sz*0.3,sy-sz*0.3,0,sx,sy,sz); g.addColorStop(0,'#fff'); g.addColorStop(0.4,P.node); g.addColorStop(1,K.mix(P.node,'#000',0.5));
    x.fillStyle=g; x.beginPath(); x.arc(sx,sy,sz,0,7); x.fill();
  }

  function mechanism(x, cx, cy, R, P, p, scale, r, faded){
    const lw=Math.max(2, R*0.03);
    const nRings = p.rings==='Many'? (p.mech==='Gauge Cluster'?3:6) : (p.mech==='Gauge Cluster'?2:4);
    // core glow
    K.bloom(x,cx,cy,R*0.7,P.core,faded?0.25:0.55);
    if(!faded){ const cg=x.createRadialGradient(cx,cy,0,cx,cy,R*0.16); cg.addColorStop(0,'#fff'); cg.addColorStop(0.5,P.core); cg.addColorStop(1,K.rgba(P.core,0)); x.fillStyle=cg; x.beginPath(); x.arc(cx,cy,R*0.16,0,7); x.fill(); }

    if(p.mech==='Gauge Cluster'){
      // several dial faces instead of nested rings
      const dials=p.rings==='Many'?5:3;
      for(let d=0; d<dials; d++){ const an=d/dials*7+0.3; const dx=cx+Math.cos(an)*R*0.6, dy=cy+Math.sin(an)*R*0.6; const dr=R*(0.22+ (d%2)*0.08);
        ring(x,dx,dy,dr,0.96,0, P, 0.1+d*0.15, lw*0.8, true, r);
        // needle
        x.strokeStyle=P.ink; x.lineWidth=lw*0.5; const na=K.rng(d*9+1)()*7; x.beginPath(); x.moveTo(dx,dy); x.lineTo(dx+Math.cos(na)*dr*0.8, dy+Math.sin(na)*dr*0.8); x.stroke();
        bodyNode(x,dx,dy,dr,0.96,0,na,P,R*0.02,r); }
      return;
    }

    for(let i=0;i<nRings;i++){
      const t=i/(nRings-1||1);
      const rad=R*(0.94-t*0.66);
      const tilt= p.mech==='Gyroscope' ? (0.25+0.6*Math.abs(Math.sin(i*1.3))) : 0.3+0.5*t;
      const rot = p.spin==='Aligned' ? i*0.12 : (K.rng(i*17+3)()-0.5)*3.1;
      ring(x,cx,cy,rad,tilt,rot,P, t*0.5, lw*(1-t*0.3), i<2, r);
      // bodies orbiting on this ring
      if(p.mech==='Orrery' && i%1===0){ const bodies=1+ (i%2); for(let b=0;b<bodies;b++){ const ang=K.rng(i*31+b*7)()*7; bodyNode(x,cx,cy,rad,tilt,rot,ang,P,R*(0.03-t*0.012)+3,r); } }
    }
    // central axis pin + crossbar (armillary read)
    if(p.mech!=='Gyroscope'){ x.strokeStyle=K.rgba(P.ink,0.6); x.lineWidth=lw*0.6; x.beginPath(); x.moveTo(cx,cy-R*1.02); x.lineTo(cx,cy+R*1.02); x.stroke(); }
    // radial gauge ticks around the outermost
    x.save(); x.strokeStyle=K.rgba(P.ink,0.4); x.lineWidth=1; for(let i=0;i<90;i++){ const an=i/90*7; const t=i%9===0?R*0.05:R*0.02; x.beginPath(); x.moveTo(cx+Math.cos(an)*R*1.0, cy+Math.sin(an)*R*1.0); x.lineTo(cx+Math.cos(an)*(R*1.0+t), cy+Math.sin(an)*(R*1.0+t)); x.stroke(); } x.restore();
  }

  function draw(cv, seed){
    const r=K.rng(seed); const p=params(r); const P=p.pal;
    const W=p.fmt.W,H=p.fmt.H; cv.width=W;cv.height=H;
    const x=cv.getContext('2d'); const S=Math.min(W,H);
    const noise=K.makeNoise(seed^0x33af);

    // deep ground with radial vignette glow
    const bg=x.createRadialGradient(W*0.5,H*0.46,0,W*0.5,H*0.5,Math.max(W,H)*0.7);
    bg.addColorStop(0,P.g0); bg.addColorStop(1,P.g1); x.fillStyle=bg; x.fillRect(0,0,W,H);
    // coloured haze clouds (atmosphere the mechanism hangs in)
    K.hazeSheet(x,W,H,noise,P.a,0.32,S*0.5,'screen');
    K.hazeSheet(x,W,H,noise,P.b,0.20,S*0.8,'screen');

    // satellite sub-mechanisms drifting in the depth (busy, far, hazed)
    const sats = p.rings==='Many'?3:2;
    for(let s=0;s<sats;s++){ const sx=W*(0.12+0.76*K.rng(seed*5+s*13)()); const sy=H*(0.12+0.76*K.rng(seed*5+s*29)()); const sr=S*(0.06+0.05*K.rng(seed*5+s*7)());
      mechanism(x,sx,sy,sr,P,{...p,mech:'Armillary',rings:'Few',spin:'Tumbled'}, 1, K.rng(seed+s*101), true); }

    // HERO mechanism, off-centre on thirds
    const cx=W*(p.spin==='Aligned'?0.5:0.44+0.12*K.rng(seed*9)()); const cy=H*(0.46+ (K.rng(seed*11)()-0.5)*0.1);
    const R=S*0.34;
    mechanism(x,cx,cy,R,P,p,1,r,false);

    // foreground atmospheric bloom + drifting motes
    K.bloom(x,cx,cy,R*1.8,P.core,0.12);
    x.save(); x.globalCompositeOperation='lighter'; for(let i=0;i<80;i++){ const mx=r()*W,my=r()*H; const d=Math.hypot(mx-cx,my-cy); if(d<R*1.6){ x.fillStyle=K.rgba(i%2?P.node:P.b, 0.05+r()*0.12); x.beginPath(); x.arc(mx,my,0.6+r()*1.8,0,7); x.fill(); } } x.restore();

    // instrument substrate — corner brackets + frame ticks
    x.save(); x.strokeStyle=K.rgba(P.ink,0.4); x.lineWidth=1.3; x.globalAlpha=0.5;
    const m=S*0.045,b=S*0.05; [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([bx,by,sxn,syn])=>{x.beginPath();x.moveTo(bx,by+syn*b);x.lineTo(bx,by);x.lineTo(bx+sxn*b,by);x.stroke();});
    for(let i=0;i<=24;i++){ const xx=W*i/24; x.beginPath(); x.moveTo(xx,H-S*0.03); x.lineTo(xx,H-S*0.03-(i%4===0?S*0.014:S*0.007)); x.stroke(); }
    x.restore();

    K.scanlines(x,W,H,3,0.05);
    K.grain(x,W,H,480,r);
    K.chromaSplit(x,W,H,1);
    K.vignette(x,W,H,0.55);
    return { aspect: W/H };
  }

  return { name:'D_armillary', draw, traits };
})();
