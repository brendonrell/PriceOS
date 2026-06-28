/* HALO direction A — APHELION v2  (impossible warm skies, high-variance scenes)
 * Jury fixes: (1) WARM-ONLY palette world — killed the cyan-on-magenta vaporwave
 * tiles; skies/grounds stay warm so A never colour-clashes with VESPERS' cool
 * water; bodies may be any hue (a cold sun in a warm sky reads as "off").
 * (2) SIX structurally distinct SCENE families (not a subtle layout nudge):
 * Procession / Henge / Eclipse / Drift / Twin Horizon / Colossus — different
 * depth, density, scale and negative space. (3) surreal tells: wrong-direction
 * shadows, gravity-off floats, a second disagreeing horizon. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* WARM impossible-sky palettes. top/mid/hz = warm sky stops; plain = ground;
     suns = candidate body hues (some deliberately COLD = the "off"); solid =
     monolith base; haze = atmosphere; ink = instrument marks. No cool-ground
     schemes — APHELION owns WARM LUMINOUS SKY. */
  const PALS = [
    { name:'Sodium Sea',  top:'#2a1400', mid:'#c86a10', hz:'#ffd86a', plain:'#1a0d02', suns:['#5de0ff','#ff5d6a','#ffffff'], solid:'#100802', haze:'#ffae4d', ink:'#ffe6c0' },
    { name:'Ember Plain', top:'#1a0606', mid:'#7a1410', hz:'#ff8a2a', plain:'#120303', suns:['#ffe24d','#4fd8ff','#ff3d5e'], solid:'#0a0202', haze:'#ff6a2a', ink:'#ffd0a0' },
    { name:'Magma Gold',  top:'#1a0312', mid:'#8a1830', hz:'#ffb04d', plain:'#150208', suns:['#ffe24d','#fff0c0','#ff7a3d'], solid:'#0c0106', haze:'#ff6a4d', ink:'#ffd8c0' },
    { name:'Rose Peach',  top:'#3a0f28', mid:'#d63d5a', hz:'#ffd0a0', plain:'#220612', suns:['#7de0ff','#fff0b0','#ff9e6a'], solid:'#160410', haze:'#ff8f7a', ink:'#ffe0d8' },
    { name:'Sulfur Dawn', top:'#2a2000', mid:'#c89a08', hz:'#ffe85a', plain:'#1a1300', suns:['#ff4fd0','#ffffff','#ff7a2a'], solid:'#0e0a00', haze:'#e8c020', ink:'#fff4b0' },
    { name:'Oxblood',     top:'#160204', mid:'#5a0a10', hz:'#e8541a', plain:'#0e0103', suns:['#ffd23d','#3dffd0','#ff8a5d'], solid:'#080101', haze:'#c2401a', ink:'#ffc4a0' },
    { name:'Coral Haze',  top:'#2a0a1a', mid:'#d6506a', hz:'#ffb08a', plain:'#1a0510', suns:['#9bffe0','#fff0b0','#ff7a9e'], solid:'#10040a', haze:'#ff7a8a', ink:'#ffd8d0' },
    { name:'Amber Mesa',  top:'#241000', mid:'#a85610', hz:'#ffc24d', plain:'#180a00', suns:['#ff5db0','#ffffff','#ffd23d'], solid:'#0c0500', haze:'#e8923a', ink:'#ffe0b0' },
    { name:'Bone Noon',   top:'#6a4a3a', mid:'#e0a878', hz:'#fff0e0', plain:'#4a342a', suns:['#ff5d6a','#3a8aff','#ffd23d'], solid:'#2a1c16', haze:'#f0c8a8', ink:'#3a241a' },
    { name:'Acid Sun',    top:'#1a2200', mid:'#8aa808', hz:'#e8ff5a', plain:'#121800', suns:['#ff4fd0','#ffffff','#ff7a2a'], solid:'#0a0e00', haze:'#b6d020', ink:'#f0ffc0' },
  ];

  const FMTS = [ { W:1340, H:1340, t:'Square' }, { W:1500, H:1120, t:'Vista' }, { W:1140, H:1480, t:'Portal' } ];
  const SCENE = ['Procession', 'Henge', 'Eclipse', 'Drift', 'Twin Horizon', 'Colossus'];
  const SKYBODY = ['Ringed', 'Eclipse', 'Twin', 'Triad', 'Lone'];

  function params(r){
    let pal=K.pick(PALS,r); if(window.FORCE_PAL) pal=PALS.find(q=>q.name===window.FORCE_PAL)||pal;
    const fmt=K.pick(FMTS,r); const scene=K.pick(SCENE,r); const bodyc=K.pick(SKYBODY,r);
    const hzMul=0.50+r()*0.22;
    return { pal, fmt, scene, body:bodyc, hzMul };
  }
  function traits(seed){ const p=params(K.rng(seed)); return { Palette:p.pal.name, Format:p.fmt.t, Scene:p.scene, Sky:p.body }; }

  function body(x,cx,cy,rad,col,ring,r){
    K.bloom(x,cx,cy,rad*3.2,col,0.28);
    const g=x.createRadialGradient(cx,cy,0,cx,cy,rad); g.addColorStop(0,'#fff'); g.addColorStop(0.18,col); g.addColorStop(0.7,K.mix(col,'#000',0.18)); g.addColorStop(1,K.rgba(col,0));
    x.save(); x.globalCompositeOperation='lighter'; x.fillStyle=g; x.beginPath(); x.arc(cx,cy,rad,0,7); x.fill(); x.restore();
    if(ring){ x.save(); x.globalCompositeOperation='lighter'; x.translate(cx,cy); x.rotate((r()-0.5)*1.1); x.scale(1,0.34);
      for(let i=0;i<4;i++){ const rr=rad*(1.5+i*0.22); x.lineWidth=rad*0.07; x.strokeStyle=K.rgba(K.iridescent(0.1+i*0.18,0.9,0.62),0.5-i*0.08); x.beginPath(); x.arc(0,0,rr,0,7); x.stroke(); } x.restore(); }
  }
  function skyBodies(x,W,hzY,S,p,r){
    const su=p.pal.suns;
    if(p.body==='Ringed'){ body(x,W*0.62,hzY*0.42,S*0.11,su[0],true,r); body(x,W*0.2,hzY*0.24,S*0.022,su[1],false,r); }
    else if(p.body==='Eclipse'){ body(x,W*0.5,hzY*0.4,S*0.12,su[2],false,r); x.save(); x.fillStyle=p.pal.solid; x.beginPath(); x.arc(W*0.5,hzY*0.4,S*0.085,0,7); x.fill(); x.restore(); K.bloom(x,W*0.5,hzY*0.4,S*0.5,su[1],0.3); }
    else if(p.body==='Twin'){ body(x,W*0.36,hzY*0.46,S*0.085,su[0],false,r); body(x,W*0.66,hzY*0.34,S*0.05,su[2],false,r); }
    else if(p.body==='Triad'){ body(x,W*0.28,hzY*0.3,S*0.045,su[0],false,r); body(x,W*0.52,hzY*0.5,S*0.07,su[1],false,r); body(x,W*0.74,hzY*0.28,S*0.038,su[2],false,r); }
    else body(x,W*0.7,hzY*0.34,S*0.1,su[0],false,r);
  }

  // a monolith / slab / sphere with soft (optionally WRONG-direction) shadow
  function solid(x,cx,gy,hov,w,h,kind,P,depth,wrongShadow,r){
    const col=K.mix(P.solid,P.haze,depth*0.74), rim=K.mix(P.ink,P.haze,depth*0.72);
    const sxoff = wrongShadow? w*1.2 : 0;
    K.softShadow(x,cx+sxoff,gy,w*1.5*(1-depth*0.3),0.4*(1-depth*0.5));
    const top=gy-hov-h;
    if(kind==='sphere'){ const g=x.createRadialGradient(cx-w*0.25,top+h*0.3,0,cx,top+h*0.5,w*0.7); g.addColorStop(0,rim); g.addColorStop(0.5,col); g.addColorStop(1,K.mix(col,'#000',0.4)); x.fillStyle=g; x.beginPath(); x.arc(cx,top+h*0.5,Math.min(w,h)*0.5,0,7); x.fill(); }
    else { x.fillStyle=col; x.fillRect(cx-w/2,top,w,h); x.fillStyle=K.rgba(rim,0.85); x.fillRect(cx-w/2,top,Math.max(2,w*0.10),h);
      x.fillStyle=K.rgba(K.mix(rim,'#fff',0.2),0.5-depth*0.3); x.beginPath(); x.moveTo(cx-w/2,top); x.lineTo(cx-w/2+w*0.16,top-h*0.07); x.lineTo(cx+w/2+w*0.16,top-h*0.07); x.lineTo(cx+w/2,top); x.fill(); }
  }

  function ground(x,W,H,hzY,P){ const pg=x.createLinearGradient(0,hzY,0,H); pg.addColorStop(0,K.mix(P.hz,P.plain,0.55)); pg.addColorStop(0.25,P.plain); pg.addColorStop(1,K.mix(P.plain,'#000',0.4)); x.fillStyle=pg; x.fillRect(0,hzY,W,H-hzY); }
  function surveyGrid(x,W,H,hzY,P){ x.save(); x.globalCompositeOperation='screen'; x.strokeStyle=K.rgba(P.ink,0.09); x.lineWidth=1; const vpx=W*0.5; for(let i=-12;i<=12;i++){ x.beginPath(); x.moveTo(vpx+i*W*0.045,hzY); x.lineTo(vpx+i*W*0.5,H); x.stroke(); } for(let j=1;j<=9;j++){ const yy=hzY+Math.pow(j/9,2.2)*(H-hzY); x.beginPath(); x.moveTo(0,yy); x.lineTo(W,yy); x.stroke(); } x.restore(); }

  function draw(cv,seed){
    const r=K.rng(seed); const p=params(r); const P=p.pal;
    const W=p.fmt.W,H=p.fmt.H; cv.width=W;cv.height=H;
    const x=cv.getContext('2d'); const S=Math.min(W,H);
    const noise=K.makeNoise(seed^0x9e37);
    const hzY=H*p.hzMul;

    // SKY
    const sg=x.createLinearGradient(0,0,0,hzY); sg.addColorStop(0,P.top); sg.addColorStop(0.55,P.mid); sg.addColorStop(1,P.hz);
    x.fillStyle=sg; x.fillRect(0,0,W,hzY);
    K.hazeSheet(x,W,hzY,noise,P.haze,0.5,S*0.5,'screen');

    // distant warm silhouette ridge
    x.save(); x.globalCompositeOperation='multiply'; x.fillStyle=K.rgba(P.solid,0.5); x.beginPath(); x.moveTo(0,hzY);
    for(let xx=0;xx<=W;xx+=W/22){ const yb=hzY-(0.5+noise.fbm(xx/180,8,3))*S*0.05; x.lineTo(xx,yb);} x.lineTo(W,hzY); x.closePath(); x.fill(); x.restore();

    ground(x,W,H,hzY,P);
    K.bloom(x,W*0.5,hzY,W*0.7,P.hz,0.22);
    surveyGrid(x,W,H,hzY,P);

    skyBodies(x,W,hzY,S,p,r);

    // ── SCENE families ──────────────────────────────────────────
    if(p.scene==='Procession'){
      const rows=7;
      for(let row=rows-1;row>=0;row--){ const depth=row/(rows-1); const yB=hzY+Math.pow(1-depth,1.7)*(H-hzY)*0.99; const sc=(1-depth)*1.0+0.08;
        for(const side of [-1,1]){ const cx=W*0.5+side*W*(0.06+(1-depth)*0.42); const w=S*0.06*sc, h=S*0.30*sc; solid(x,cx,yB,S*0.01*sc,w,h,'slab',P,depth,false,r); } }
    } else if(p.scene==='Henge'){
      const cx=W*0.5, cy=hzY+(H-hzY)*0.5, rx=W*0.34, ry=(H-hzY)*0.42; const n=9;
      const items=[]; for(let i=0;i<n;i++){ const an=Math.PI+ i/(n-1)*Math.PI; const px=cx+Math.cos(an)*rx; const py=cy+Math.sin(an)*ry*0.7+ry*0.3; const depth=1-(py-hzY)/(H-hzY); items.push({px,py,depth}); }
      items.sort((a,b)=>a.py-b.py); for(const it of items){ const sc=(1-it.depth)*0.9+0.25; solid(x,it.px,it.py,0,S*0.07*sc,S*0.34*sc,'slab',P,Math.max(0,it.depth),false,r); }
    } else if(p.scene==='Eclipse'){
      solid(x,W*0.5,hzY+(H-hzY)*0.92,0,S*0.16,S*0.5,'slab',P,0.0,false,r);
    } else if(p.scene==='Drift'){
      const n=14; for(let i=0;i<n;i++){ const rr=K.rng(seed*7+i*53); const fx=rr()*W; const fy=hzY*0.2+rr()*(H*0.8); const depth=rr(); const sc=(1-depth)*0.7+0.12; const kind=rr()<0.5?'sphere':'slab'; const w=S*0.06*sc,h=kind==='sphere'?w:S*0.16*sc; solid(x,fx,fy+h,S*0.0,w,h,kind,P,depth,true,()=>rr()); }
    } else if(p.scene==='Twin Horizon'){
      const hz2=hzY-(H*0.16); x.save(); x.globalAlpha=0.6; ground(x,W,hzY,hz2,P); x.restore();
      x.strokeStyle=K.rgba(P.ink,0.3); x.lineWidth=1.5; x.beginPath(); x.moveTo(0,hz2); x.lineTo(W,hz2); x.stroke();
      const rows=4; for(let row=rows-1;row>=0;row--){ const depth=row/(rows-1); const yB=hzY+Math.pow(1-depth,1.6)*(H-hzY)*0.9; const count=2+row; const sc=(1-depth)*0.9+0.12;
        for(let i=0;i<count;i++){ const jx=K.rng(seed*9+row*31+i*13)(); const cx=W*(0.08+(i+0.5+(jx-0.5)*0.5)/count*0.84); solid(x,cx,yB,0,S*0.06*sc,S*0.18*sc,'slab',P,depth,false,()=>jx); } }
    } else { // Colossus
      const cx=W*(0.30+0.4*((seed*2654435761>>>0)%1000/1000));
      for(let i=0;i<8;i++){ const rr=K.rng(seed*3+i*17); const fx=rr()*W; const depth=0.6+rr()*0.35; solid(x,fx,hzY+(H-hzY)*(0.1+rr()*0.3),0,S*0.03,S*0.10,'slab',P,depth,false,()=>rr()); }
      solid(x,cx,H*1.02,0,S*0.22,S*0.95,'slab',P,0.0,false,r);
    }

    // depth haze over far plain
    x.save(); x.globalCompositeOperation='screen'; const hg=x.createLinearGradient(0,hzY,0,H*0.78); hg.addColorStop(0,K.rgba(P.haze,0.5)); hg.addColorStop(1,K.rgba(P.haze,0)); x.fillStyle=hg; x.fillRect(0,hzY,W,H*0.4); x.restore();

    // instrument substrate
    x.save(); x.strokeStyle=K.rgba(P.ink,0.5); x.lineWidth=1.5; const m=S*0.045,b=S*0.05;
    [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([bx,by,sxn,syn])=>{x.beginPath();x.moveTo(bx,by+syn*b);x.lineTo(bx,by);x.lineTo(bx+sxn*b,by);x.stroke();});
    for(let i=0;i<=20;i++){ const xx=W*i/20; x.globalAlpha=0.32; x.beginPath(); x.moveTo(xx,hzY); x.lineTo(xx,hzY-(i%5===0?S*0.016:S*0.008)); x.stroke(); } x.restore();

    K.scanlines(x,W,H,3,0.05); K.grain(x,W,H,520,r); K.chromaSplit(x,W,H,1); K.vignette(x,W,H,0.5);
    return { aspect:W/H };
  }
  return { name:'A2_aphelion', draw, traits };
})();
