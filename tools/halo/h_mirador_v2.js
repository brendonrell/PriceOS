/* HALO direction B — MIRADOR v2  (surreal future-archaeology / signal plain)
 * A vast hazy plain strewn with semi-abstract RELIC INSTRUMENTS — parabolic
 * dishes tilted skyward, lattice antenna masts with beacons, monolith receivers
 * with glowing apertures. "Real but off": silent, scaleless, listening to
 * nothing. Arid/acid warm-earth colour world (sodium, rust, lime, verdigris,
 * mauve, sulfur) + one cold ice-teal seed — never cool blue skies.
 *
 * Jury fixes over v1:
 * (1) SIX structurally distinct SCENE families (not recoloured nudges) that
 *     differ in DENSITY, SCALE, HORIZON HEIGHT and arrangement:
 *       Deep Array · Dish Forest · Lone Sentinel · Antenna Ridge · Buried · Convoy.
 *     Horizon height varies per seed to kill dead sky.
 * (2) 10 distinct named palettes in the arid/acid register (+ one cold).
 * (3) Surreal "wrong" pushed harder: wrong-direction shadows, half-buried
 *     dishes breaking the surface, impossible scale jumps.
 */
window.ENGINE = (function () {
  const K = window.KIT;

  /* MIRADOR identity = ARID GROUND-PLANE under a hazed sky. skT/skB = warm-earth
     or strange-mineral sky stops; gnd = dust ground; metal = relic body; lit =
     sun-struck face; glow = beacon/aperture; haze = dust; ink = instrument
     marks. Distinct from APHELION's luminous warm sky and from any cool-blue-sky
     project — this world is dust, rust, sodium, acid, verdigris, sulfur. */
  const PALS = [
    { name:'Sodium Dust', skT:'#3a1c06', skB:'#e89a3a', gnd:'#6a3a14', metal:'#241204', lit:'#ffd27a', glow:'#ff7a2a', haze:'#e0973f', ink:'#ffe3b0' },
    { name:'Rust Mesa',   skT:'#2a0a08', skB:'#c2502e', gnd:'#5a1f14', metal:'#1c0805', lit:'#ff9d6a', glow:'#ffb03a', haze:'#c25a36', ink:'#ffd6b8' },
    { name:'Acid Flat',   skT:'#1a2a06', skB:'#c6e23a', gnd:'#3a4a10', metal:'#10180a', lit:'#eaff8a', glow:'#ff4fd0', haze:'#a8c63f', ink:'#f0ffc6' },
    { name:'Verdigris',   skT:'#04201e', skB:'#2ea890', gnd:'#0e3a34', metal:'#04140f', lit:'#9bffe0', glow:'#ffb03a', haze:'#2e9a86', ink:'#cffff0' },
    { name:'Mauve Dune',  skT:'#2a1030', skB:'#c66aa0', gnd:'#4a2240', metal:'#180a1c', lit:'#ffc6e6', glow:'#ffd06a', haze:'#b0608f', ink:'#ffe0f0' },
    { name:'Sulfur Sky',  skT:'#3a2a00', skB:'#ffd21a', gnd:'#6a4a08', metal:'#241800', lit:'#fff6a0', glow:'#ff5a2a', haze:'#e0b81f', ink:'#3a2a00' },
    { name:'Ember Ash',   skT:'#1a0604', skB:'#8a2a12', gnd:'#3a160c', metal:'#120402', lit:'#ff8a4d', glow:'#ffd23a', haze:'#7a3320', ink:'#ffcab0' },
    { name:'Bone Salt',   skT:'#4a3a5a', skB:'#e8d6c6', gnd:'#9a8a86', metal:'#2a2230', lit:'#fff4e6', glow:'#ff6a8a', haze:'#d6c2c2', ink:'#3a2e3a' },
    { name:'Tangerine',   skT:'#2a0c00', skB:'#ff8410', gnd:'#5a2a08', metal:'#1c0a00', lit:'#ffd08a', glow:'#ff3a6a', haze:'#d8721a', ink:'#ffe2c0' },
    { name:'Ice Teal',    skT:'#0a2630', skB:'#7fe6e0', gnd:'#2a5258', metal:'#08181c', lit:'#e6ffff', glow:'#ff9a5a', haze:'#8fcdd0', ink:'#063038' },
  ];

  const FMTS = [ { W:1500, H:1080, t:'Pan' }, { W:1320, H:1320, t:'Square' }, { W:1160, H:1460, t:'Tower' } ];
  const SCENE = ['Deep Array', 'Dish Forest', 'Lone Sentinel', 'Antenna Ridge', 'Buried', 'Convoy'];
  const HOUR  = ['Sodium Dawn', 'High Glare', 'Dust Storm', 'Long Shadow'];

  function params(r){
    let pal=K.pick(PALS,r); if(window.FORCE_PAL) pal=PALS.find(q=>q.name===window.FORCE_PAL)||pal;
    const fmt=K.pick(FMTS,r); const scene=K.pick(SCENE,r); const hour=K.pick(HOUR,r);
    // horizon height varies a LOT per seed and per scene, to kill dead sky
    return { pal, fmt, scene, hour };
  }
  function traits(seed){ const p=params(K.rng(seed)); return { Palette:p.pal.name, Format:p.fmt.t, Scene:p.scene, Hour:p.hour }; }

  // perspective helpers
  function gy(H, hzY, depth){ return hzY + (1-Math.pow(depth,1.7))*(H-hzY); }
  function pscale(depth){ return Math.pow(1-depth,1.3)*0.92+0.06; }

  /* ── RELIC DRAW FUNCTIONS (improved from v1) ───────────────────────────── */

  /* a parabolic dish relic on a stalk, tilted skyward. clip lets us bury it. */
  function dish(x, cx, base, sc, P, depth, tilt, wrongShadow, r){
    const col=P.metal, lit=P.lit, glow=P.glow, haze=P.haze;
    const dcol=K.mix(col,haze,depth*0.8), lcol=K.mix(lit,haze,depth*0.7);
    const mastH=230*sc, dishR=140*sc;
    const sxoff = wrongShadow ? dishR*1.4 : dishR*0.2;
    K.softShadow(x, cx+sxoff, base, dishR*1.6, 0.36*(1-depth*0.5));
    // mast
    x.strokeStyle=dcol; x.lineWidth=Math.max(1,8*sc); x.beginPath(); x.moveTo(cx,base); x.lineTo(cx,base-mastH); x.stroke();
    const dy=base-mastH;
    x.save(); x.translate(cx,dy); x.rotate(tilt); x.scale(1, 0.86);
    const g=x.createLinearGradient(-dishR,-dishR,dishR,dishR);
    g.addColorStop(0,K.mix(dcol,'#000',0.3)); g.addColorStop(0.5,lcol); g.addColorStop(1,dcol);
    x.fillStyle=g; x.beginPath(); x.ellipse(0,0,dishR,dishR*0.9,0,0,7); x.fill();
    x.fillStyle=K.rgba(K.mix(dcol,'#000',0.45),0.8); x.beginPath(); x.ellipse(0,0,dishR*0.74,dishR*0.66,0,0,7); x.fill();
    // concentric rim rings (more "instrument")
    x.strokeStyle=K.rgba(lcol,0.4*(1-depth*0.5)); x.lineWidth=Math.max(0.6,1.4*sc);
    for(let k=1;k<=3;k++){ x.beginPath(); x.ellipse(0,0,dishR*0.74*(k/3.2),dishR*0.66*(k/3.2),0,0,7); x.stroke(); }
    K.bloom(x,0,0,dishR*0.7,glow,0.42*(1-depth*0.4));
    x.fillStyle=K.rgba(glow,0.9); x.beginPath(); x.arc(0,-dishR*0.1,Math.max(1.5,3*sc),0,7); x.fill();
    x.strokeStyle=K.rgba(lcol,0.6); x.lineWidth=Math.max(1,2*sc);
    x.beginPath(); x.moveTo(-dishR*0.6,0); x.lineTo(0,-dishR*0.1); x.lineTo(dishR*0.6,0); x.stroke();
    x.restore();
  }

  /* a buried/tilted dish — only the rim breaks the dust surface (surreal). */
  function buriedDish(x, cx, surfaceY, sc, P, depth, tilt, r){
    const haze=P.haze, lit=P.lit, glow=P.glow;
    const dishR=190*sc;
    const dcol=K.mix(P.metal,haze,depth*0.8), lcol=K.mix(lit,haze,depth*0.7);
    x.save();
    // clip to above the surface so the dish reads as half-sunk
    x.beginPath(); x.rect(cx-dishR*1.6, 0, dishR*3.2, surfaceY); x.clip();
    x.translate(cx, surfaceY+dishR*0.55); x.rotate(tilt); x.scale(1,0.5);
    const g=x.createLinearGradient(-dishR,-dishR,dishR,dishR);
    g.addColorStop(0,K.mix(dcol,'#000',0.35)); g.addColorStop(0.5,lcol); g.addColorStop(1,dcol);
    x.fillStyle=g; x.beginPath(); x.ellipse(0,0,dishR,dishR,0,0,7); x.fill();
    x.fillStyle=K.rgba(K.mix(dcol,'#000',0.5),0.85); x.beginPath(); x.ellipse(0,0,dishR*0.74,dishR*0.74,0,0,7); x.fill();
    x.strokeStyle=K.rgba(lcol,0.4); x.lineWidth=Math.max(0.8,2*sc);
    for(let k=1;k<=3;k++){ x.beginPath(); x.ellipse(0,0,dishR*0.74*(k/3.2),dishR*0.74*(k/3.2),0,0,7); x.stroke(); }
    x.fillStyle=K.rgba(glow,0.8); x.beginPath(); x.arc(0,0,Math.max(2,4*sc),0,7); x.fill();
    x.restore();
    // a faint dust mound at the buried lip
    K.bloom(x,cx,surfaceY,dishR*1.4,haze,0.22);
  }

  /* a lattice antenna mast — semi-abstract truss with a beacon. */
  function mast(x, cx, base, sc, P, depth, wrongShadow, r){
    const col=P.metal, lit=P.lit, glow=P.glow, haze=P.haze;
    const dcol=K.mix(col,haze,depth*0.78), lcol=K.mix(lit,haze,depth*0.7);
    const h=360*sc, w=38*sc;
    const sxoff = wrongShadow ? w*3 : w*0.4;
    K.softShadow(x,cx+sxoff,base,w*2,0.3*(1-depth*0.5));
    x.strokeStyle=dcol; x.lineWidth=Math.max(1,3*sc);
    x.beginPath(); x.moveTo(cx-w/2,base); x.lineTo(cx-w*0.12,base-h); x.moveTo(cx+w/2,base); x.lineTo(cx+w*0.12,base-h); x.stroke();
    const segs=8;
    for(let i=0;i<segs;i++){ const t0=i/segs,t1=(i+1)/segs;
      const y0=base-h*t0, y1=base-h*t1;
      const x0l=cx-(w/2)*(1-t0)-w*0.12*t0, x0r=cx+(w/2)*(1-t0)+w*0.12*t0;
      const x1l=cx-(w/2)*(1-t1)-w*0.12*t1, x1r=cx+(w/2)*(1-t1)+w*0.12*t1;
      x.beginPath(); x.moveTo(x0l,y0); x.lineTo(x1r,y1); x.moveTo(x0r,y0); x.lineTo(x1l,y1); x.stroke(); }
    K.bloom(x,cx,base-h,30*sc,glow,0.5*(1-depth*0.4));
    x.fillStyle=glow; x.beginPath(); x.arc(cx,base-h,Math.max(1.5,4*sc),0,7); x.fill();
    x.strokeStyle=K.rgba(lcol,0.7); x.lineWidth=Math.max(1,2.4*sc);
    for(let k=0;k<3;k++){ const yy=base-h*(0.7+k*0.09); const ww=(40-k*8)*sc; x.beginPath(); x.moveTo(cx-ww,yy); x.lineTo(cx+ww,yy); x.stroke(); }
  }

  /* monolithic receiver slab with a lit aperture. */
  function receiver(x, cx, base, sc, P, depth, wrongShadow, r){
    const lit=P.lit, glow=P.glow, haze=P.haze;
    const dcol=K.mix(P.metal,haze,depth*0.78);
    const w=150*sc, h=430*sc;
    const sxoff = wrongShadow ? w*1.6 : w*0.3;
    K.softShadow(x,cx+sxoff,base,w*1.3,0.4*(1-depth*0.5));
    x.fillStyle=dcol; x.fillRect(cx-w/2, base-h, w, h);
    x.fillStyle=K.rgba(K.mix(lit,haze,depth*0.7),0.9); x.fillRect(cx-w/2,base-h,Math.max(2,w*0.12),h);
    // segmentation lines
    x.strokeStyle=K.rgba(K.mix(dcol,'#000',0.5),0.6); x.lineWidth=Math.max(0.6,1.4*sc);
    for(let k=1;k<5;k++){ const yy=base-h*(k/5); x.beginPath(); x.moveTo(cx-w/2,yy); x.lineTo(cx+w/2,yy); x.stroke(); }
    K.bloom(x,cx,base-h*0.62,w*0.9,glow,0.35*(1-depth*0.4));
    x.fillStyle=K.rgba(glow,0.95); x.fillRect(cx-w*0.18, base-h*0.72, w*0.36, h*0.2);
  }

  function drawRelic(x, it, P, r){
    if(it.kind==='dish') dish(x,it.cx,it.base,it.sc,P,it.depth,it.tilt,it.wrong,r);
    else if(it.kind==='mast') mast(x,it.cx,it.base,it.sc,P,it.depth,it.wrong,r);
    else receiver(x,it.cx,it.base,it.sc,P,it.depth,it.wrong,r);
  }

  /* ── SCENE BUILDERS — return an item list (drawn far→near after sort) ───── */

  function sceneItems(scene, seed, W, H, hzY, r){
    const items=[];
    const push=(o)=>items.push(Object.assign({tilt:0,wrong:false},o));
    const pickKind=(rr)=>['dish','mast','receiver'][Math.floor(rr*3)];

    if(scene==='Deep Array'){
      // relics receding to a vanishing point — true depth corridor, two rails
      const rows=9;
      for(let row=0;row<rows;row++){
        const depth=row/(rows-1);
        const base=gy(H,hzY,depth);
        const sc=pscale(depth)*1.05;
        for(const side of [-1,1]){
          const rr=K.rng(seed*17+row*53+(side+1)*7);
          const cx=W*0.5 + side*W*(0.05+(1-depth)*0.40);
          const kind = rr()<0.55?'dish':(rr()<0.6?'mast':'receiver');
          push({cx,base,sc:sc*(0.85+rr()*0.3),depth,kind,tilt:(rr()-0.5)*0.5});
        }
      }
    }

    else if(scene==='Dish Forest'){
      // dense field of dishes at wildly varied scales
      const N=22;
      for(let i=0;i<N;i++){
        const rr=K.rng(seed*13+i*101);
        const depth=Math.pow(rr(),1.25);
        const base=gy(H,hzY,depth);
        const cx=W*(0.04+rr()*0.92);
        // impossible scale jumps: some near-dishes are HUGE, far ones tiny
        const sc=pscale(depth)*(0.6+rr()*1.4);
        push({cx,base,sc,depth,kind: rr()<0.85?'dish':'mast',tilt:(rr()-0.5)*0.9, wrong: rr()<0.18});
      }
    }

    else if(scene==='Lone Sentinel'){
      // one colossal hero relic close-up + vast negative space + tiny far ones.
      // hero pushed OFF-CENTRE (thirds) so the empty sky reads as tension, not dead.
      const heroR=K.rng(seed*29+3);
      const heroKind=['dish','mast','receiver'][Math.floor(heroR()*3)];
      const heroLeft = heroR()<0.5;
      const heroX = heroLeft ? W*(0.20+heroR()*0.12) : W*(0.68+heroR()*0.12);
      // tiny far scatter near horizon, biased to the OPPOSITE side of the hero
      const N=8;
      for(let i=0;i<N;i++){
        const rr=K.rng(seed*31+i*61);
        const depth=0.7+rr()*0.26;
        const base=gy(H,hzY,depth);
        const cx = heroLeft ? W*(0.45+rr()*0.5) : W*(0.05+rr()*0.5);
        push({cx,base,sc:pscale(depth)*0.85,depth,kind:pickKind(rr()),tilt:(rr()-0.5)*0.6});
      }
      // the colossus, drawn last (nearest) — genuinely huge, base below frame
      push({cx:heroX, base:H*1.04, sc:pscale(0.0)*3.4, depth:0.0, kind:heroKind, tilt:(heroR()-0.5)*0.35, wrong:true, hero:true});
    }

    else if(scene==='Antenna Ridge'){
      // towering masts marching UP a diagonal ridge landform (NOT flat).
      // dir = ridge rises to the right(+1) or left(-1). Masts plant ON the slope,
      // growing larger toward the near (low) end. The ridge itself is drawn in
      // draw() via items[0].ridgeMeta so it silhouettes behind the masts.
      const N=10;
      const dir = (K.rng(seed*7+1)()<0.5)?1:-1;
      const climb = H*0.40;                       // total diagonal rise
      const ridgeBaseY = hzY + (H-hzY)*0.34;      // where the low end of the ridge sits
      for(let i=0;i<N;i++){
        const rr=K.rng(seed*19+i*41);
        const t=i/(N-1);
        // u runs 0 at the LOW/near end → 1 at the HIGH/far end of the ridge
        const u = dir>0 ? t : 1-t;
        const slopeY = ridgeBaseY - u*climb;       // climbs up the frame
        const depth = 0.12 + u*0.62;               // far end = more haze
        const cx = W*(0.04 + t*0.92);
        const sc = pscale(depth)*1.25;
        push({cx,base:slopeY,sc,depth,kind: rr()<0.8?'mast':'dish',tilt:(rr()-0.5)*0.35});
      }
      // metadata so draw() can render the ridge silhouette under the masts
      items.ridgeMeta = { dir, climb, ridgeBaseY };
    }

    else if(scene==='Buried'){
      // relics half-sunk/tilted in dust — only rims break the surface. Bigger,
      // bolder rims so they actually read; a couple upright relics for scale-wrong.
      const N=9;
      for(let i=0;i<N;i++){
        const rr=K.rng(seed*23+i*71);
        const depth=Math.pow(rr(),1.0);
        const surfaceY=gy(H,hzY,depth);
        const cx=W*(0.05+rr()*0.9);
        const sc=pscale(depth)*(1.0+rr()*1.1);
        // mostly buried dishes; a few upright relics interspersed for scale-wrong
        if(rr()<0.68) push({cx,base:surfaceY,sc,depth,kind:'buried',tilt:(rr()-0.5)*1.0});
        else push({cx,base:surfaceY,sc:sc*0.8,depth,kind: rr()<0.5?'mast':'receiver',tilt:0, wrong: rr()<0.4});
      }
    }

    else { // Convoy — staggered procession crossing the frame at varied depth/height
      const N=9;
      const baseDepth=0.12;
      for(let i=0;i<N;i++){
        const rr=K.rng(seed*37+i*47);
        const t=i/(N-1);
        // procession marches across; depth zig-zags so heights stagger
        const depth=K.clamp(baseDepth + t*0.6 + (i%2? -0.14:0.14) + (rr()-0.5)*0.12, 0.04, 0.92);
        const base=gy(H,hzY,depth);
        const cx=W*(0.04 + t*0.92);
        const sc=pscale(depth)*1.2;
        // convoy reads as relic instruments marching: bias dishes & masts, bigger
        const kind = rr()<0.5?'dish':(rr()<0.82?'mast':'receiver');
        push({cx,base,sc,depth,kind,tilt:(rr()-0.5)*0.5});
      }
    }

    return items;
  }

  // per-scene horizon multiplier — different scenes sit the horizon very differently
  function horizonMul(scene, r){
    const j=(r()-0.5);
    switch(scene){
      case 'Deep Array':     return 0.40 + j*0.10;  // higher horizon, long corridor
      case 'Dish Forest':    return 0.52 + j*0.12;
      case 'Lone Sentinel':  return 0.30 + j*0.12;  // low horizon, vast sky
      case 'Antenna Ridge':  return 0.58 + j*0.14;  // high — ridge needs room below
      case 'Buried':         return 0.62 + j*0.12;  // high horizon, lots of dust plain
      case 'Convoy':         return 0.46 + j*0.12;
      default:               return 0.48 + j*0.12;
    }
  }

  function draw(cv, seed){
    const r=K.rng(seed); const p=params(r); const P=p.pal;
    const W=p.fmt.W,H=p.fmt.H; cv.width=W;cv.height=H;
    const x=cv.getContext('2d'); const S=Math.min(W,H);
    const noise=K.makeNoise(seed^0x51ed);
    const hzY=H*horizonMul(p.scene, r);

    // SKY
    const sg=x.createLinearGradient(0,0,0,hzY); sg.addColorStop(0,P.skT); sg.addColorStop(1,P.skB);
    x.fillStyle=sg; x.fillRect(0,0,W,hzY);
    K.hazeSheet(x,W,hzY,noise,P.haze,0.5,S*0.45,'screen');
    // low sun/aperture glow — kept tighter & dimmer so it never whites the frame
    const sunx=W*(0.22+0.56*((seed*2654435761>>>0)%1000/1000));
    K.bloom(x,sunx,hzY*0.74,W*0.40,P.lit,p.hour==='High Glare'?0.30:0.20);

    // GROUND
    const pg=x.createLinearGradient(0,hzY,0,H); pg.addColorStop(0,K.mix(P.skB,P.gnd,0.5)); pg.addColorStop(0.2,P.gnd); pg.addColorStop(1,K.mix(P.gnd,'#000',0.5));
    x.fillStyle=pg; x.fillRect(0,hzY,W,H-hzY);
    K.hazeSheet(x,W,H,noise,P.haze,0.3,S*0.6,'overlay');
    K.bloom(x,W*0.5,hzY,W*0.8,P.haze,0.3);
    // soft dune mottling on the plain so it isn't a flat field
    K.mottle(x,0,hzY,W,H-hzY,P.gnd,2600,r,'overlay');

    // survey grid receding (instrument tell)
    x.save(); x.globalCompositeOperation='screen'; x.strokeStyle=K.rgba(P.ink,0.09); x.lineWidth=1; const vpx=W*0.5;
    for(let i=-12;i<=12;i++){ x.beginPath(); x.moveTo(vpx+i*W*0.04,hzY); x.lineTo(vpx+i*W*0.6,H); x.stroke(); }
    for(let j=1;j<=10;j++){ const yy=gy(H,hzY,1-j/10); x.beginPath(); x.moveTo(0,yy); x.lineTo(W,yy); x.stroke(); }
    x.restore();

    // ARRAY — build scene-specific relics
    const items=sceneItems(p.scene, seed, W, H, hzY, r);

    // ANTENNA RIDGE landform — a silhouetted slope the masts plant on
    if(p.scene==='Antenna Ridge' && items.ridgeMeta){
      const {dir,climb,ridgeBaseY}=items.ridgeMeta;
      const ridgeCol=K.mix(P.gnd,'#000',0.32);
      x.save();
      x.fillStyle=ridgeCol; x.beginPath();
      x.moveTo(0,H);
      for(let xx=0;xx<=W;xx+=W/40){
        const t=xx/W; const u = dir>0 ? t : 1-t;
        const n=noise.fbm(xx/220,7,3)*S*0.025;
        x.lineTo(xx, ridgeBaseY - u*climb + n);
      }
      x.lineTo(W,H); x.closePath(); x.fill();
      // a lit ridge edge line
      x.strokeStyle=K.rgba(P.lit,0.18); x.lineWidth=2; x.beginPath();
      for(let xx=0;xx<=W;xx+=W/40){ const t=xx/W; const u=dir>0?t:1-t; const n=noise.fbm(xx/220,7,3)*S*0.025; const yy=ridgeBaseY-u*climb+n; if(xx===0)x.moveTo(xx,yy); else x.lineTo(xx,yy);} x.stroke();
      x.restore();
    }

    // draw upright relics far→near, then buried rims last so they always read
    const upright=items.filter(it=>it.kind!=='buried').sort((a,b)=>b.depth-a.depth);
    const buried =items.filter(it=>it.kind==='buried').sort((a,b)=>b.depth-a.depth);
    for(const it of upright) drawRelic(x,it,P,r);
    for(const it of buried) buriedDish(x,it.cx,it.base,it.sc,P,it.depth,it.tilt,r);

    // dust storm veil — softened so relics survive it (was washing tiles white)
    if(p.hour==='Dust Storm'){ x.save(); x.globalCompositeOperation='screen'; const dv=x.createLinearGradient(0,hzY,0,H); dv.addColorStop(0,K.rgba(P.haze,0.38)); dv.addColorStop(1,K.rgba(P.haze,0.08)); x.fillStyle=dv; x.fillRect(0,hzY,W,H-hzY); x.restore(); }

    // depth haze band along the horizon (separates far relics) — lighter
    x.save(); x.globalCompositeOperation='screen'; const hg=x.createLinearGradient(0,hzY-S*0.04,0,hzY+(H-hzY)*0.35); hg.addColorStop(0,K.rgba(P.haze,0.38)); hg.addColorStop(1,K.rgba(P.haze,0)); x.fillStyle=hg; x.fillRect(0,hzY-S*0.04,W,(H-hzY)*0.4); x.restore();

    // instrument substrate marks: bearing ticks on horizon + corner brackets
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

  return { name:'B2_mirador', draw, traits };
})();
