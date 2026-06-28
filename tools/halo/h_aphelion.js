/* HALO direction A — APHELION  ("real but off" impossible skies)
 * A hazy luminous horizon: one-to-three WRONG-coloured suns / ringed bodies
 * hanging over a still plain, with monolithic solids floating above the ground
 * casting soft shadows — Magritte-surreal, semi-abstract, future-evoking.
 * The "off" tell: a faint instrument substrate (horizon reticle ticks, a
 * perspective survey grid on the plain, calibration cross) graded under heavy
 * atmospheric haze. Saturated skies, distinct warm/cool duotone palettes. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* Bespoke "impossible sky" palettes — APHELION's identity is the luminous
     saturated SKY GRADIENT. top→mid→hz = sky stops; plain = ground; suns =
     candidate body hues (wrong on purpose); solid = floating-mass base; haze
     = atmosphere wash; ink = faint instrument marks. All distinct schemes. */
  const PALS = [
    { name: 'Peach Signal', top:'#3a1d6e', mid:'#c8407a', hz:'#ffb15e', plain:'#2a1140', suns:['#7df0ff','#fff0a0','#ff5da0'], solid:'#1a0a2e', haze:'#ff9e6b', ink:'#ffd9b0', dark:true },
    { name: 'Cyan Dusk',    top:'#04204a', mid:'#0e7fa8', hz:'#7ff0d0', plain:'#04161f', suns:['#ff7a3d','#ffe05a','#ff4f8a'], solid:'#021018', haze:'#3fd8c8', ink:'#bdfff0', dark:true },
    { name: 'Ember Plain',  top:'#1a0606', mid:'#7a1410', hz:'#ff8a2a', plain:'#120303', suns:['#ffe24d','#4fd8ff','#ff3d5e'], solid:'#0a0202', haze:'#ff6a2a', ink:'#ffd0a0', dark:true },
    { name: 'Lilac Field',  top:'#241a5e', mid:'#7a5dff', hz:'#ffb6e6', plain:'#150f38', suns:['#9bffd0','#ffe88a','#ff8fd6'], solid:'#0e0926', haze:'#b69bff', ink:'#ecdcff', dark:true },
    { name: 'Acid Horizon', top:'#0a2a10', mid:'#3aa83a', hz:'#d6ff5e', plain:'#05160a', suns:['#ff4fd0','#ffd23d','#5db8ff'], solid:'#03120a', haze:'#9bff6b', ink:'#e8ffc0', dark:true },
    { name: 'Sodium Sea',   top:'#2a1400', mid:'#c86a10', hz:'#ffd86a', plain:'#1a0d02', suns:['#5de0ff','#ff5d6a','#ffffff'], solid:'#100802', haze:'#ffae4d', ink:'#ffe6c0', dark:true },
    { name: 'Rose Quartz',  top:'#4a0f33', mid:'#d63d7a', hz:'#ffd0c0', plain:'#2a0820', suns:['#7de0ff','#fff0b0','#ff709e'], solid:'#1a051a', haze:'#ff8fb0', ink:'#ffe0e8', dark:true },
    { name: 'Glacier Noon', top:'#063a6e', mid:'#3fb6e8', hz:'#e6fbff', plain:'#04243a', suns:['#ffd23d','#ff6a8a','#b0ffe6'], solid:'#02141f', haze:'#9be6ff', ink:'#eafaff', dark:false },
    { name: 'Magma Cyan',   top:'#0a0220', mid:'#5d1aa8', hz:'#ff4f6a', plain:'#08021a', suns:['#3dffd0','#ffe24d','#ff5dc0'], solid:'#050110', haze:'#ff5d8a', ink:'#ffd0e0', dark:true },
    { name: 'Verde Aurora', top:'#04201a', mid:'#0e8a6a', hz:'#9bffb0', plain:'#03130f', suns:['#ff6ad0','#ffe05a','#5dc8ff'], solid:'#02100c', haze:'#4fe0a0', ink:'#d0ffe0', dark:true },
  ];

  const FMTS = [ { W:1320, H:1320, t:'Square' }, { W:1500, H:1120, t:'Vista' }, { W:1140, H:1480, t:'Portal' } ];
  const SKYCFG = ['Twin Suns', 'Ringed Body', 'Eclipse', 'Three Moons', 'Lone Star'];
  const FIELD  = ['Monoliths', 'Drift Slabs', 'Spheres', 'Henge'];
  const HORIZON= ['High', 'Mid', 'Low'];

  function params(r) {
    let pal = K.pick(PALS, r);
    if (window.FORCE_PAL) pal = PALS.find((q)=>q.name===window.FORCE_PAL) || pal;
    const fmt = K.pick(FMTS, r);
    const sky = K.pick(SKYCFG, r);
    const field = K.pick(FIELD, r);
    const hz = K.pick(HORIZON, r);
    return { pal, fmt, sky, field, hz };
  }
  function traits(seed){ const p=params(K.rng(seed)); return { Palette:p.pal.name, Format:p.fmt.t, Sky:p.sky, Field:p.field, Horizon:p.hz }; }

  /* one luminous celestial body: disc + bloom; optional ring (thin-film). */
  function body(x, cx, cy, rad, col, ring, r) {
    K.bloom(x, cx, cy, rad*3.2, col, 0.28);
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, rad);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, col);
    g.addColorStop(0.7, K.mix(col,'#000',0.18)); g.addColorStop(1, K.rgba(col,0.0));
    x.save(); x.globalCompositeOperation='lighter'; x.fillStyle=g;
    x.beginPath(); x.arc(cx,cy,rad,0,7); x.fill(); x.restore();
    if (ring) {
      x.save(); x.globalCompositeOperation='lighter'; x.translate(cx,cy);
      x.rotate((r()-0.5)*1.1); x.scale(1, 0.34);
      for (let i=0;i<4;i++){ const rr=rad*(1.5+i*0.22); x.lineWidth=rad*0.07;
        x.strokeStyle=K.rgba(K.iridescent(0.1+i*0.18,0.9,0.62), 0.5-i*0.08);
        x.beginPath(); x.arc(0,0,rr,0,7); x.stroke(); }
      x.restore();
    }
  }

  /* floating solid (monolith/slab/sphere) with soft ground shadow + rim light. */
  function solid(x, cx, gy, hov, w, h, kind, base, rim, haze, depth, r) {
    const sx=cx, sy=gy;
    // soft cast shadow on the plain (offset, depth-faded)
    K.softShadow(x, sx, sy, w*1.5*(1-depth*0.3), 0.4*(1-depth*0.5));
    const top = gy - hov - h;
    const col = K.mix(base, haze, depth*0.72);              // far = hazed
    const rimc= K.mix(rim, haze, depth*0.72);
    if (kind==='sphere') {
      const g=x.createRadialGradient(cx-w*0.25, top+h*0.3, 0, cx, top+h*0.5, w*0.7);
      g.addColorStop(0, rimc); g.addColorStop(0.5, col); g.addColorStop(1, K.mix(col,'#000',0.4));
      x.fillStyle=g; x.beginPath(); x.arc(cx, top+h*0.5, Math.min(w,h)*0.5, 0,7); x.fill();
    } else {
      x.fillStyle=col; x.fillRect(cx-w/2, top, w, h);
      // lit edge
      x.fillStyle=K.rgba(rimc, 0.85); x.fillRect(cx-w/2, top, Math.max(2,w*0.10), h);
      // faint top face for a 3D read
      x.fillStyle=K.rgba(K.mix(rimc,'#fff',0.2), 0.5-depth*0.3);
      x.beginPath(); x.moveTo(cx-w/2,top); x.lineTo(cx-w/2+w*0.16,top-h*0.07);
      x.lineTo(cx+w/2+w*0.16,top-h*0.07); x.lineTo(cx+w/2,top); x.fill();
    }
  }

  function draw(cv, seed) {
    const r=K.rng(seed); const p=params(r); const P=p.pal;
    const W=p.fmt.W, H=p.fmt.H; cv.width=W; cv.height=H;
    const x=cv.getContext('2d'); const S=Math.min(W,H);
    const noise=K.makeNoise(seed^0x9e37);
    const hzY = H*(p.hz==='High'?0.70:p.hz==='Mid'?0.60:0.50);

    // SKY — vertical saturated gradient
    const sg=x.createLinearGradient(0,0,0,hzY);
    sg.addColorStop(0,P.top); sg.addColorStop(0.55,P.mid); sg.addColorStop(1,P.hz);
    x.fillStyle=sg; x.fillRect(0,0,W,hzY);
    // atmospheric haze bands in the sky
    K.hazeSheet(x,W,hzY,noise,P.haze,0.5,S*0.5,'screen');
    // a low, faint distant silhouette band at the horizon (busy depth)
    x.save(); x.globalCompositeOperation='multiply';
    x.fillStyle=K.rgba(P.solid,0.5);
    let yb=hzY; x.beginPath(); x.moveTo(0,hzY);
    for(let xx=0;xx<=W;xx+=W/22){ const t=xx/W; yb=hzY-(0.5+noise.fbm(xx/180,8,3))*S*0.05*(0.6+0.4*Math.sin(t*9)); x.lineTo(xx,yb);}
    x.lineTo(W,hzY); x.closePath(); x.fill(); x.restore();

    // PLAIN — ground gradient (reflective sheen toward horizon)
    const pg=x.createLinearGradient(0,hzY,0,H);
    pg.addColorStop(0,K.mix(P.hz,P.plain,0.55)); pg.addColorStop(0.25,P.plain); pg.addColorStop(1,K.mix(P.plain,'#000',0.4));
    x.fillStyle=pg; x.fillRect(0,hzY,W,H-hzY);
    // horizon glow line
    K.bloom(x, W*0.5, hzY, W*0.7, P.hz, 0.22);

    // perspective survey grid on the plain (the future-instrument "off" tell)
    x.save(); x.globalCompositeOperation='screen'; x.strokeStyle=K.rgba(P.ink,0.10); x.lineWidth=1;
    const vpx=W*0.5;
    for(let i=-10;i<=10;i++){ x.beginPath(); x.moveTo(vpx+i*W*0.045, hzY); x.lineTo(vpx+i*W*0.5, H); x.stroke(); }
    for(let j=1;j<=9;j++){ const yy=hzY+Math.pow(j/9,2.2)*(H-hzY); x.beginPath(); x.moveTo(0,yy); x.lineTo(W,yy); x.stroke(); }
    x.restore();

    // CELESTIAL bodies — wrong colours, placed on thirds
    const su=P.suns;
    if (p.sky==='Twin Suns'){ body(x,W*0.34,hzY*0.5,S*0.085,su[0],false,r); body(x,W*0.66,hzY*0.36,S*0.05,su[2],false,r); }
    else if (p.sky==='Ringed Body'){ body(x,W*0.62,hzY*0.42,S*0.11,su[0],true,r); body(x,W*0.2,hzY*0.22,S*0.02,su[1],false,r); }
    else if (p.sky==='Eclipse'){ body(x,W*0.5,hzY*0.4,S*0.12,su[2],false,r); x.save(); x.fillStyle=P.solid; x.beginPath(); x.arc(W*0.5,hzY*0.4,S*0.085,0,7); x.fill(); x.restore(); K.bloom(x,W*0.5,hzY*0.4,S*0.5,su[1],0.3); }
    else if (p.sky==='Three Moons'){ body(x,W*0.28,hzY*0.3,S*0.05,su[0],false,r); body(x,W*0.52,hzY*0.5,S*0.07,su[1],false,r); body(x,W*0.74,hzY*0.28,S*0.04,su[2],false,r); }
    else { body(x,W*0.7,hzY*0.34,S*0.1,su[0],false,r); }

    // FLOATING FIELD — rows of solids receding into haze
    const rows=4;
    for(let row=rows-1; row>=0; row--){
      const depth=row/(rows-1);                       // 1 = far, 0 = near
      const yBase=hzY + Math.pow(1-depth,1.6)*(H-hzY)*0.96;
      const count=2+row;
      const scale=(1-depth)*0.9+0.12;
      for(let i=0;i<count;i++){
        const jx=(K.rng(seed*7+row*31+i*13)());
        const cx=W*(0.08+ (i+0.5+ (jx-0.5)*0.5)/count*0.84);
        const w=S*(0.05+jx*0.05)*scale, h=S*(0.10+jx*0.16)*scale;
        const hov=S*0.02*scale*(0.5+jx);
        const kind = p.field==='Spheres' ? 'sphere'
                   : p.field==='Drift Slabs' ? 'slab'
                   : p.field==='Henge' ? (i%3===2?'sphere':'slab') : 'slab';
        solid(x, cx, yBase, hov, w, h, kind, P.solid, P.ink, P.haze, depth, ()=>jx);
      }
    }

    // depth haze over the far plain
    x.save(); x.globalCompositeOperation='screen';
    const hg=x.createLinearGradient(0,hzY,0,H*0.78); hg.addColorStop(0,K.rgba(P.haze,0.5)); hg.addColorStop(1,K.rgba(P.haze,0));
    x.fillStyle=hg; x.fillRect(0,hzY,W,H*0.4); x.restore();

    // instrument substrate — corner brackets + horizon reticle ticks + cal cross
    x.save(); x.strokeStyle=K.rgba(P.ink,0.5); x.lineWidth=1.5;
    const m=S*0.045, b=S*0.05;
    [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([bx,by,sxn,syn])=>{
      x.beginPath(); x.moveTo(bx,by+syn*b); x.lineTo(bx,by); x.lineTo(bx+sxn*b,by); x.stroke(); });
    // horizon ticks
    for(let i=0;i<=20;i++){ const xx=W*i/20; const tall=i%5===0; x.globalAlpha=0.35; x.beginPath(); x.moveTo(xx,hzY); x.lineTo(xx,hzY-(tall?S*0.016:S*0.008)); x.stroke(); }
    x.globalAlpha=0.45; // tiny calibration cross near a sun-third
    const ccx=W*0.5, ccy=hzY; x.beginPath(); x.moveTo(ccx-b*0.4,ccy); x.lineTo(ccx+b*0.4,ccy); x.moveTo(ccx,ccy-b*0.4); x.lineTo(ccx,ccy+b*0.4); x.stroke();
    x.restore();

    // FINISH — grain, faint scanlines, micro chroma split, vignette
    K.scanlines(x,W,H,3,0.05);
    K.grain(x,W,H,520,r);
    K.chromaSplit(x,W,H,1);
    K.vignette(x,W,H,0.5);
    return { aspect: W/H };
  }

  return { name:'A_aphelion', draw, traits };
})();
