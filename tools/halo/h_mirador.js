/* HALO direction B — MIRADOR  (surreal future-archaeology / signal plain)
 * A vast hazy plain at a strange hour, strewn with semi-abstract relic
 * instruments — parabolic dishes tilted skyward, lattice antenna masts, lone
 * monolithic receivers — receding to a low vanishing point in dust haze.
 * "Real but off": the array is silent, scaleless, listening to nothing. A faint
 * survey grid + bearing ticks read it as a future instrument field. Arid,
 * saturated sodium/amber/dust palettes — its own warm-earth colour world. */
window.ENGINE = (function () {
  const K = window.KIT;

  /* MIRADOR identity = ARID GROUND-PLANE under a hazed sky. sky/ground stops are
     warm-earth or strange-mineral; metal = relic body; lit = sun-struck face;
     glow = beacon/aperture; haze = dust; ink = instrument marks. Distinct, NOT
     the blue/purple skies of APHELION — this world is dust, rust, sodium, acid. */
  const PALS = [
    { name:'Sodium Dust', skT:'#3a1c06', skB:'#e89a3a', gnd:'#6a3a14', metal:'#241204', lit:'#ffd27a', glow:'#ff7a2a', haze:'#e0973f', ink:'#ffe3b0', dark:false },
    { name:'Rust Mesa',   skT:'#2a0a08', skB:'#c2502e', gnd:'#5a1f14', metal:'#1c0805', lit:'#ff9d6a', glow:'#ffb03a', haze:'#c25a36', ink:'#ffd6b8', dark:true },
    { name:'Acid Flat',   skT:'#1a2a06', skB:'#c6e23a', gnd:'#3a4a10', metal:'#10180a', lit:'#eaff8a', glow:'#ff4fd0', haze:'#a8c63f', ink:'#f0ffc6', dark:false },
    { name:'Bone Salt',   skT:'#4a3a5a', skB:'#e8d6c6', gnd:'#9a8a86', metal:'#2a2230', lit:'#fff4e6', glow:'#ff6a8a', haze:'#d6c2c2', ink:'#3a2e3a', dark:false },
    { name:'Cobalt Waste',skT:'#06122e', skB:'#2e7ad6', gnd:'#142a4a', metal:'#06101f', lit:'#9bd0ff', glow:'#ffb83a', haze:'#3a78c0', ink:'#d6ecff', dark:true },
    { name:'Ember Ash',   skT:'#1a0604', skB:'#8a2a12', gnd:'#3a160c', metal:'#120402', lit:'#ff8a4d', glow:'#ffd23a', haze:'#7a3320', ink:'#ffcab0', dark:true },
    { name:'Verdigris',   skT:'#04201e', skB:'#2ea890', gnd:'#0e3a34', metal:'#04140f', lit:'#9bffe0', glow:'#ffb03a', haze:'#2e9a86', ink:'#cffff0', dark:true },
    { name:'Mauve Dune',  skT:'#2a1030', skB:'#c66aa0', gnd:'#4a2240', metal:'#180a1c', lit:'#ffc6e6', glow:'#ffd06a', haze:'#b0608f', ink:'#ffe0f0', dark:true },
    { name:'Sulfur Sky',  skT:'#3a2a00', skB:'#ffd21a', gnd:'#6a4a08', metal:'#241800', lit:'#fff6a0', glow:'#ff5a2a', haze:'#e0b81f', ink:'#3a2a00', dark:false },
    { name:'Glacier Dust',skT:'#103048', skB:'#bfe8ee', gnd:'#3a5a66', metal:'#0a1c26', lit:'#eafaff', glow:'#ff7a6a', haze:'#9fc8d2', ink:'#06303a', dark:false },
  ];

  const FMTS = [ { W:1500, H:1080, t:'Pan' }, { W:1320, H:1320, t:'Square' }, { W:1160, H:1460, t:'Tower' } ];
  const ARRAY = ['Dish Field', 'Antenna Forest', 'Lone Receiver', 'Mixed Array'];
  const HOUR  = ['Sodium Dawn', 'High Glare', 'Dust Storm', 'Long Shadow'];
  const DENS  = ['Sparse', 'Dense'];

  function params(r){
    let pal=K.pick(PALS,r); if(window.FORCE_PAL) pal=PALS.find(q=>q.name===window.FORCE_PAL)||pal;
    const fmt=K.pick(FMTS,r); const arr=K.pick(ARRAY,r); const hour=K.pick(HOUR,r); const dens=K.pick(DENS,r);
    return { pal, fmt, arr, hour, dens };
  }
  function traits(seed){ const p=params(K.rng(seed)); return { Palette:p.pal.name, Format:p.fmt.t, Array:p.arr, Hour:p.hour, Density:p.dens }; }

  // perspective: ground y for a depth 0..1 (0 near bottom, 1 at horizon)
  function gy(H, hzY, depth){ return hzY + (1-Math.pow(depth,1.7))*(H-hzY); }
  function pscale(depth){ return Math.pow(1-depth,1.3)*0.92+0.06; }

  /* a parabolic dish relic on a stalk, tilted skyward. */
  function dish(x, cx, base, sc, col, lit, glow, haze, depth, tilt, r){
    const dcol=K.mix(col,haze,depth*0.78), lcol=K.mix(lit,haze,depth*0.7);
    const mastH=230*sc, dishR=140*sc;
    K.softShadow(x, cx, base, dishR*1.6, 0.35*(1-depth*0.5));
    // mast
    x.strokeStyle=dcol; x.lineWidth=Math.max(1,8*sc); x.beginPath(); x.moveTo(cx,base); x.lineTo(cx,base-mastH); x.stroke();
    // dish (ellipse rim + face gradient), tilted skyward (upright read, not a coin)
    const dy=base-mastH;
    x.save(); x.translate(cx,dy); x.rotate(tilt);
    x.scale(1, 0.86);                                  // mostly face-on, slight foreshorten
    const g=x.createLinearGradient(-dishR,-dishR,dishR,dishR);
    g.addColorStop(0,K.mix(dcol,'#000',0.3)); g.addColorStop(0.5,lcol); g.addColorStop(1,dcol);
    x.fillStyle=g; x.beginPath(); x.ellipse(0,0,dishR,dishR*0.9,0,0,7); x.fill();
    // inner cup
    x.fillStyle=K.rgba(K.mix(dcol,'#000',0.45),0.8); x.beginPath(); x.ellipse(0,0,dishR*0.74,dishR*0.66,0,0,7); x.fill();
    // feed glow at focus
    K.bloom(x,0,0,dishR*0.7,glow,0.4*(1-depth*0.4));
    x.fillStyle=K.rgba(glow,0.9); x.beginPath(); x.arc(0,-dishR*0.1,Math.max(1.5,3*sc),0,7); x.fill();
    // feed struts
    x.strokeStyle=K.rgba(lcol,0.6); x.lineWidth=Math.max(1,2*sc);
    x.beginPath(); x.moveTo(-dishR*0.6,0); x.lineTo(0,-dishR*0.1); x.lineTo(dishR*0.6,0); x.stroke();
    x.restore();
  }

  /* a lattice antenna mast — semi-abstract truss with a beacon. */
  function mast(x, cx, base, sc, col, lit, glow, haze, depth, r){
    const dcol=K.mix(col,haze,depth*0.78), lcol=K.mix(lit,haze,depth*0.7);
    const h=360*sc, w=38*sc;
    K.softShadow(x,cx,base,w*2,0.3*(1-depth*0.5));
    x.strokeStyle=dcol; x.lineWidth=Math.max(1,3*sc);
    // legs
    x.beginPath(); x.moveTo(cx-w/2,base); x.lineTo(cx-w*0.12,base-h); x.moveTo(cx+w/2,base); x.lineTo(cx+w*0.12,base-h); x.stroke();
    // cross bracing
    const segs=8;
    for(let i=0;i<segs;i++){ const t0=i/segs,t1=(i+1)/segs;
      const y0=base-h*t0, y1=base-h*t1;
      const x0l=cx-(w/2)*(1-t0)-w*0.12*t0, x0r=cx+(w/2)*(1-t0)+w*0.12*t0;
      const x1l=cx-(w/2)*(1-t1)-w*0.12*t1, x1r=cx+(w/2)*(1-t1)+w*0.12*t1;
      x.beginPath(); x.moveTo(x0l,y0); x.lineTo(x1r,y1); x.moveTo(x0r,y0); x.lineTo(x1l,y1); x.stroke(); }
    // beacon
    K.bloom(x,cx,base-h,30*sc,glow,0.5*(1-depth*0.4));
    x.fillStyle=glow; x.beginPath(); x.arc(cx,base-h,Math.max(1.5,4*sc),0,7); x.fill();
    // a couple yagi cross-bars near top (the "off" antenna read)
    x.strokeStyle=K.rgba(lcol,0.7); x.lineWidth=Math.max(1,2.4*sc);
    for(let k=0;k<3;k++){ const yy=base-h*(0.7+k*0.09); const ww=(40-k*8)*sc; x.beginPath(); x.moveTo(cx-ww,yy); x.lineTo(cx+ww,yy); x.stroke(); }
  }

  /* monolithic receiver slab with a lit aperture. */
  function receiver(x, cx, base, sc, col, lit, glow, haze, depth, r){
    const dcol=K.mix(col,haze,depth*0.78);
    const w=150*sc, h=430*sc;
    K.softShadow(x,cx,base,w*1.3,0.4*(1-depth*0.5));
    x.fillStyle=dcol; x.fillRect(cx-w/2, base-h, w, h);
    x.fillStyle=K.rgba(K.mix(lit,haze,depth*0.7),0.9); x.fillRect(cx-w/2,base-h,Math.max(2,w*0.12),h);
    // aperture slit glowing
    K.bloom(x,cx,base-h*0.62,w*0.9,glow,0.35*(1-depth*0.4));
    x.fillStyle=K.rgba(glow,0.95); x.fillRect(cx-w*0.18, base-h*0.72, w*0.36, h*0.2);
  }

  function draw(cv, seed){
    const r=K.rng(seed); const p=params(r); const P=p.pal;
    const W=p.fmt.W,H=p.fmt.H; cv.width=W;cv.height=H;
    const x=cv.getContext('2d'); const S=Math.min(W,H);
    const noise=K.makeNoise(seed^0x51ed);
    const hzY=H*0.46;

    // SKY
    const sg=x.createLinearGradient(0,0,0,hzY); sg.addColorStop(0,P.skT); sg.addColorStop(1,P.skB);
    x.fillStyle=sg; x.fillRect(0,0,W,hzY);
    K.hazeSheet(x,W,hzY,noise,P.haze,0.55,S*0.45,'screen');
    // a low sun/aperture glow in the sky
    const sunx=W*(0.3+0.4*((seed*2654435761>>>0)%1000/1000));
    K.bloom(x,sunx,hzY*0.7,W*0.5,P.lit,p.hour==='High Glare'?0.4:0.26);

    // GROUND
    const pg=x.createLinearGradient(0,hzY,0,H); pg.addColorStop(0,K.mix(P.skB,P.gnd,0.5)); pg.addColorStop(0.2,P.gnd); pg.addColorStop(1,K.mix(P.gnd,'#000',0.5));
    x.fillStyle=pg; x.fillRect(0,hzY,W,H-hzY);
    // dust drift on the ground
    K.hazeSheet(x,W,H,noise,P.haze,0.3,S*0.6,'overlay');
    K.bloom(x,W*0.5,hzY,W*0.8,P.haze,0.3);

    // survey grid receding (instrument tell)
    x.save(); x.globalCompositeOperation='screen'; x.strokeStyle=K.rgba(P.ink,0.09); x.lineWidth=1; const vpx=W*0.5;
    for(let i=-12;i<=12;i++){ x.beginPath(); x.moveTo(vpx+i*W*0.04,hzY); x.lineTo(vpx+i*W*0.6,H); x.stroke(); }
    for(let j=1;j<=10;j++){ const yy=gy(H,hzY,1-j/10); x.beginPath(); x.moveTo(0,yy); x.lineTo(W,yy); x.stroke(); }
    x.restore();

    // ARRAY — relics from far (hazy) to near (sharp)
    const N = p.dens==='Dense'?16:9;
    const items=[];
    for(let i=0;i<N;i++){
      const rr=K.rng(seed*13+i*101);
      // first 2-3 are big near "hero" relics; rest spread but biased nearer
      const depth = i<3 ? (0.04+rr()*0.22) : Math.pow(rr(),1.5);
      const lane=(rr()-0.5);
      const cx=W*0.5 + lane*W*(0.94*(0.2+ (1-depth)*0.95));
      const base=gy(H,hzY,depth);
      const sc=pscale(depth)*(0.85+rr()*0.5);
      let kind;
      if(p.arr==='Dish Field') kind='dish';
      else if(p.arr==='Antenna Forest') kind='mast';
      else if(p.arr==='Lone Receiver') kind = i===0?'receiver':(rr()<0.5?'mast':'dish');
      else kind = ['dish','mast','receiver'][Math.floor(rr()*3)];
      items.push({cx,base,sc,depth,kind,tilt:(rr()-0.5)*0.7});
    }
    items.sort((a,b)=>b.depth-a.depth);
    for(const it of items){
      if(it.kind==='dish') dish(x,it.cx,it.base,it.sc,P.metal,P.lit,P.glow,P.haze,it.depth,it.tilt,r);
      else if(it.kind==='mast') mast(x,it.cx,it.base,it.sc,P.metal,P.lit,P.glow,P.haze,it.depth,r);
      else receiver(x,it.cx,it.base,it.sc,P.metal,P.lit,P.glow,P.haze,it.depth,r);
    }

    // dust storm veil over everything
    if(p.hour==='Dust Storm'){ x.save(); x.globalCompositeOperation='screen'; const dv=x.createLinearGradient(0,hzY,0,H); dv.addColorStop(0,K.rgba(P.haze,0.6)); dv.addColorStop(1,K.rgba(P.haze,0.15)); x.fillStyle=dv; x.fillRect(0,hzY,W,H-hzY); x.restore(); }

    // instrument substrate marks: bearing ring on horizon + corner brackets
    x.save(); x.strokeStyle=K.rgba(P.ink,0.5); x.lineWidth=1.4;
    for(let i=0;i<=24;i++){ const xx=W*i/24; const tall=i%4===0; x.globalAlpha=0.32; x.beginPath(); x.moveTo(xx,hzY); x.lineTo(xx,hzY-(tall?S*0.018:S*0.009)); x.stroke(); }
    const m=S*0.045,b=S*0.05; x.globalAlpha=0.45;
    [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([bx,by,sxn,syn])=>{x.beginPath();x.moveTo(bx,by+syn*b);x.lineTo(bx,by);x.lineTo(bx+sxn*b,by);x.stroke();});
    x.restore();

    K.scanlines(x,W,H,3,0.05);
    K.grain(x,W,H,480,r);
    K.chromaSplit(x,W,H,1);
    K.vignette(x,W,H,0.52);
    return { aspect: W/H };
  }

  return { name:'B_mirador', draw, traits };
})();
