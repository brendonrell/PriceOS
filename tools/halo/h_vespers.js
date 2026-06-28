/* HALO direction C — VESPERS  (drowned / mirrored architecture)
 * Monumental semi-abstract geometry — towers, arches, slabs, a great ring —
 * standing in mirror-still water that doubles them into a vertical reflection,
 * the seam veiled in luminous haze. "Real but off": impossible scale, perfect
 * silence, a reflection that's subtly wrong. Lit windows + apertures glow.
 * COOL jewel palette world (sapphire / emerald / violet / teal) — the opposite
 * temperature to MIRADOR, so the two never read as the same project. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* VESPERS identity = a COOL waterline mirror. sky/water stops are deep jewel;
     stone = architecture body; lit = sunstruck stone; win = window/aperture
     glow; haze = the luminous seam mist; ink = faint instrument marks. */
  const PALS = [
    { name:'Sapphire Tide', skT:'#02061f', skB:'#1f5ad0', stone:'#0a1430', lit:'#7da8ff', win:'#ffd86a', glow:'#3fe0ff', haze:'#2f6ae0', ink:'#cfe2ff' },
    { name:'Emerald Still', skT:'#021a14', skB:'#10a877', stone:'#06231a', lit:'#7df0c0', win:'#ffe27a', glow:'#39ffb0', haze:'#1fb886', ink:'#cffff0' },
    { name:'Amethyst Deep', skT:'#0a021f', skB:'#7a3de0', stone:'#16082e', lit:'#c69bff', win:'#ffd06a', glow:'#ff5de0', haze:'#7a4fe0', ink:'#ecdcff' },
    { name:'Teal Mirror',   skT:'#02141c', skB:'#1aa8b8', stone:'#06222a', lit:'#9bf0ff', win:'#ffb86a', glow:'#3fffe0', haze:'#1f9ab0', ink:'#d0fbff' },
    { name:'Indigo Vesper', skT:'#04061a', skB:'#3a4fd0', stone:'#0a0e28', lit:'#9bb0ff', win:'#ff9e6a', glow:'#6a8aff', haze:'#3a4fc0', ink:'#dce4ff' },
    { name:'Cobalt Rose',   skT:'#06061f', skB:'#2e6ae0', stone:'#0c1030', lit:'#9bc0ff', win:'#ff6aa0', glow:'#ff5d8a', haze:'#3a6ad0', ink:'#e0e8ff' },
    { name:'Glacial Mint',  skT:'#0a2230', skB:'#7fe0d0', stone:'#0e2a30', lit:'#e6fffa', win:'#ffc06a', glow:'#9bffe6', haze:'#5fc8c0', ink:'#eafffb' },
    { name:'Viridian Night',skT:'#021410', skB:'#0e7a5a', stone:'#04201a', lit:'#6ae0a8', win:'#ffe884', glow:'#2effb0', haze:'#149a6e', ink:'#cdfae0' },
    { name:'Ultramarine',   skT:'#020630', skB:'#1f3df0', stone:'#080a34', lit:'#8a9bff', win:'#ffd86a', glow:'#4f6aff', haze:'#2a44e0', ink:'#dadfff' },
    { name:'Orchid Deep',   skT:'#0c0420', skB:'#a84fd0', stone:'#1a0a2c', lit:'#e6a8ff', win:'#7df0d0', glow:'#ff6ae0', haze:'#9a4fc0', ink:'#f2dcff' },
  ];

  const FMTS = [ { W:1200, H:1460, t:'Stele' }, { W:1340, H:1340, t:'Square' }, { W:1500, H:1120, t:'Wide' } ];
  const SUBJECT = ['Citadel', 'Great Ring', 'Arch Gate', 'Tower Row'];
  const SEAM = ['Calm', 'Mist Veil', 'Glass'];
  const SCALE = ['Near', 'Far'];

  function params(r){
    let pal=K.pick(PALS,r); if(window.FORCE_PAL) pal=PALS.find(q=>q.name===window.FORCE_PAL)||pal;
    const fmt=K.pick(FMTS,r); const subj=K.pick(SUBJECT,r); const seam=K.pick(SEAM,r); const sc=K.pick(SCALE,r);
    return { pal, fmt, subj, seam, sc };
  }
  function traits(seed){ const p=params(K.rng(seed)); return { Palette:p.pal.name, Format:p.fmt.t, Subject:p.subj, Seam:p.seam, Scale:p.sc }; }

  /* Render the architecture above the waterline into a path-recording callback,
     then replay it mirrored+faded below. We draw into an offscreen and blit
     twice for a clean reflection. */
  function buildScene(draw, W, top, h){ /* draw(x, flip) called by caller */ }

  function tower(x,cx,base,w,h,stone,lit,win,glow,r,litcol){
    x.fillStyle=stone; x.fillRect(cx-w/2, base-h, w, h);
    x.fillStyle=K.rgba(lit,0.9); x.fillRect(cx-w/2, base-h, Math.max(2,w*0.10), h); // lit edge
    // window grid glow
    const cols=Math.max(2,Math.floor(w/26)), rows=Math.max(3,Math.floor(h/40));
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){ if(r()<0.45){ const wx=cx-w/2+ (i+0.5)*w/cols, wy=base-h+(j+0.5)*h/rows;
      x.fillStyle=K.rgba(win, 0.4+r()*0.5); x.fillRect(wx-w/cols*0.28, wy-h/rows*0.30, w/cols*0.5, h/rows*0.55);} }
    // crown beacon
    K.bloom(x,cx,base-h,w*0.9,glow,0.3); x.fillStyle=glow; x.beginPath(); x.arc(cx,base-h,Math.max(1.5,w*0.06),0,7); x.fill();
  }

  function scene(x, W, H, hzY, P, p, r){
    const S=Math.min(W,H);
    // distant silhouette skyline behind hero (busy depth)
    x.save(); x.globalCompositeOperation='multiply'; x.fillStyle=K.rgba(P.stone,0.7);
    for(let i=0;i<14;i++){ const bx=W*i/14, bw=W/14*1.1, bh=S*(0.06+0.10*K.rng(99+i)()); x.fillRect(bx,hzY-bh,bw,bh);} x.restore();
    // far towers row
    const far=8; for(let i=0;i<far;i++){ const cx=W*(0.06+i/far*0.88)+ (K.rng(i*7)()-0.5)*30; const w=S*(0.03+0.02*K.rng(i*5)()); const h=S*(0.14+0.16*K.rng(i*3)());
      const col=K.mix(P.stone,P.haze,0.55); x.fillStyle=col; x.fillRect(cx-w/2,hzY-h,w,h);
      x.fillStyle=K.rgba(K.mix(P.win,P.haze,0.4),0.5); for(let j=0;j<5;j++){ if(K.rng(i*13+j)()<0.5) x.fillRect(cx-w*0.2, hzY-h+ (j+0.5)*h/5, w*0.4, h*0.05);} }

    // HERO subject(s)
    const baseH = hzY;
    if(p.subj==='Citadel'){
      const groups=p.sc==='Near'?3:5;
      for(let g=0; g<groups; g++){ const gx=W*(0.18+g/(groups-1)*0.64); const w=S*(0.10-(g%2)*0.03)*(p.sc==='Near'?1.3:0.9); const h=S*(0.34+ (g%2?0.12:0.28))*(p.sc==='Near'?1.25:0.95);
        tower(x,gx,baseH,w,h,P.stone,P.lit,P.win,P.glow,r); } }
    else if(p.subj==='Great Ring'){
      const cx=W*0.5, cy=hzY-S*0.30, rad=S*(p.sc==='Near'?0.34:0.24);
      K.bloom(x,cx,cy,rad*1.6,P.glow,0.3);
      x.lineWidth=S*0.03; x.strokeStyle=K.mix(P.stone,P.lit,0.4); x.beginPath(); x.arc(cx,cy,rad,0,7); x.stroke();
      // inner thin-film ring + aperture nodes
      for(let k=0;k<3;k++){ x.lineWidth=S*0.006; x.strokeStyle=K.rgba(K.iridescent(0.1+k*0.2,0.9,0.62),0.7); x.beginPath(); x.arc(cx,cy,rad*(0.82-k*0.1),0,7); x.stroke(); }
      for(let a=0;a<16;a++){ const an=a/16*7; const px=cx+Math.cos(an)*rad, py=cy+Math.sin(an)*rad; x.fillStyle=K.rgba(P.win,0.8); x.beginPath(); x.arc(px,py,S*0.008,0,7); x.fill(); }
      // support pylons into water
      x.strokeStyle=P.stone; x.lineWidth=S*0.02; x.beginPath(); x.moveTo(cx-rad*0.7,cy+rad*0.6); x.lineTo(cx-rad*0.5,baseH); x.moveTo(cx+rad*0.7,cy+rad*0.6); x.lineTo(cx+rad*0.5,baseH); x.stroke();
    }
    else if(p.subj==='Arch Gate'){
      const cx=W*0.5, w=S*(p.sc==='Near'?0.6:0.42), h=S*(p.sc==='Near'?0.5:0.36), th=w*0.16;
      x.fillStyle=P.stone; x.fillRect(cx-w/2, baseH-h, th, h); x.fillRect(cx+w/2-th, baseH-h, th, h);
      x.beginPath(); x.moveTo(cx-w/2,baseH-h); x.lineTo(cx-w/2,baseH-h-th); x.lineTo(cx+w/2,baseH-h-th); x.lineTo(cx+w/2,baseH-h); x.fill();
      x.fillStyle=K.rgba(P.lit,0.8); x.fillRect(cx-w/2, baseH-h, Math.max(2,th*0.2), h);
      K.bloom(x,cx,baseH-h*0.5,w*0.7,P.glow,0.3);
      // hanging glyph-light strands
      for(let i=0;i<6;i++){ const lx=cx-w*0.3+i*w*0.12; x.strokeStyle=K.rgba(P.win,0.4); x.lineWidth=1.5; x.beginPath(); x.moveTo(lx,baseH-h-th); x.lineTo(lx,baseH-h*0.4); x.stroke(); x.fillStyle=P.win; x.beginPath(); x.arc(lx,baseH-h*0.4,2.5,0,7); x.fill(); }
    }
    else { // Tower Row
      const n=p.sc==='Near'?5:8;
      for(let i=0;i<n;i++){ const cx=W*(0.1+i/(n-1)*0.8); const w=S*(0.05+0.03*K.rng(i*9)())*(p.sc==='Near'?1.2:0.85); const h=S*(0.2+0.3*K.rng(i*4)())*(p.sc==='Near'?1.2:0.9); tower(x,cx,baseH,w,h,P.stone,P.lit,P.win,P.glow,r); }
    }
  }

  function draw(cv, seed){
    const r=K.rng(seed); const p=params(r); const P=p.pal;
    const W=p.fmt.W,H=p.fmt.H; cv.width=W;cv.height=H;
    const x=cv.getContext('2d'); const S=Math.min(W,H);
    const noise=K.makeNoise(seed^0x7c91);
    const hzY=H*0.56;                                  // waterline

    // SKY
    const sg=x.createLinearGradient(0,0,0,hzY); sg.addColorStop(0,P.skT); sg.addColorStop(1,K.mix(P.skB,P.skT,0.25));
    x.fillStyle=sg; x.fillRect(0,0,W,hzY);
    K.hazeSheet(x,W,hzY,noise,P.haze,0.5,S*0.5,'screen');
    K.bloom(x,W*0.5,hzY*0.5,W*0.6,P.skB,0.2);

    // build hero scene above water onto an offscreen for clean mirroring
    const off=document.createElement('canvas'); off.width=W; off.height=Math.ceil(hzY)+2; const ox=off.getContext('2d');
    // re-seed deterministic sub-rng for scene
    scene(ox, W, H, Math.ceil(hzY), P, p, K.rng(seed*3+11));
    // draw upright
    x.drawImage(off,0,0);

    // WATER
    const wg=x.createLinearGradient(0,hzY,0,H); wg.addColorStop(0,K.mix(P.skB,P.stone,0.4)); wg.addColorStop(0.5,K.mix(P.stone,P.skT,0.3)); wg.addColorStop(1,K.mix(P.stone,'#000',0.45));
    x.fillStyle=wg; x.fillRect(0,hzY,W,H-hzY);
    // reflection: flip the scene vertically, faded, wavered by horizontal bands
    x.save(); x.globalAlpha=0.5; x.globalCompositeOperation='lighter';
    const refH=H-hzY; const bands=Math.floor(refH/4);
    for(let b=0;b<bands;b++){ const sy=hzY-1-(b/bands)*hzY*0.92; const dy=hzY+ (b/bands)*refH; const wob=Math.sin(b*0.5+seed)*S*0.004*(p.seam==='Glass'?0.3:1.4);
      x.drawImage(off, 0, Math.max(0,sy), W, hzY/bands+1, wob, dy, W, refH/bands+1); }
    x.restore();
    // water tint + ripple shimmer
    x.save(); x.globalCompositeOperation='screen'; x.fillStyle=K.rgba(P.haze,0.10); for(let i=0;i<60;i++){ const yy=hzY+Math.pow(i/60,1.4)*refH; x.fillRect(0,yy,W,1+ (i/60)*2); } x.restore();

    // luminous SEAM haze at the waterline
    const seamI = p.seam==='Mist Veil'?0.55:p.seam==='Glass'?0.18:0.32;
    x.save(); x.globalCompositeOperation='screen';
    const seg=x.createLinearGradient(0,hzY-S*0.1,0,hzY+S*0.1); seg.addColorStop(0,K.rgba(P.haze,0)); seg.addColorStop(0.5,K.rgba(P.haze,seamI)); seg.addColorStop(1,K.rgba(P.haze,0));
    x.fillStyle=seg; x.fillRect(0,hzY-S*0.1,W,S*0.2); x.restore();
    K.bloom(x,W*0.5,hzY,W*0.7,P.glow,0.18);

    // faint instrument substrate: plumb line + level ticks + corner brackets
    x.save(); x.strokeStyle=K.rgba(P.ink,0.4); x.lineWidth=1; x.globalAlpha=0.5;
    x.beginPath(); x.moveTo(W*0.5,0); x.lineTo(W*0.5,H); x.stroke();              // plumb
    for(let i=0;i<=16;i++){ const yy=H*i/16; x.beginPath(); x.moveTo(0,yy); x.lineTo(S*0.012,yy); x.stroke(); }
    const m=S*0.045,b=S*0.05; [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([bx,by,sxn,syn])=>{x.beginPath();x.moveTo(bx,by+syn*b);x.lineTo(bx,by);x.lineTo(bx+sxn*b,by);x.stroke();});
    x.restore();

    K.scanlines(x,W,H,3,0.045);
    K.grain(x,W,H,520,r);
    K.chromaSplit(x,W,H,1);
    K.vignette(x,W,H,0.52);
    return { aspect: W/H };
  }

  return { name:'C_vespers', draw, traits };
})();
