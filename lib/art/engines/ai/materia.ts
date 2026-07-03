// @ts-nocheck
/*
 * Materia — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shade, fbm2, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const MAT_FMTS=[{W:1080,H:1080,t:'Square'},{W:920,H:1220,t:'Portrait'},{W:1220,H:920,t:'Landscape'},{W:820,H:1240,t:'Tall'}];
const MAT_MARBLE=[
  {name:'Carrara', base:'#f3f1ec', wash:['#e6e4dd','#dadacf'], vein:'#9a9a93', halo:'#cfcdc2', gold:false},
  {name:'Calacatta', base:'#faf8f4', wash:['#efe9dc','#e7e2d2'], vein:'#7d7a72', halo:'#d8cfb6', gold:'#b8893a'},
  {name:'Verde', base:'#1f4536', wash:['#173c2e','#27543f'], vein:'#cfe6d4', halo:'#3f6e54', gold:false},
  {name:'Nero', base:'#16150f', wash:['#1d1c14','#100f0a'], vein:'#e8e6df', halo:'#3a382e', gold:false},
  {name:'Rosa', base:'#e8c7c0', wash:['#dcb4ad','#e9d2cc'], vein:'#8a5a5a', halo:'#caa49c', gold:false},
];
const MAT_GRANITE=[
  {name:'Salt & Pepper', base:'#8a8a88', flecks:['#16161a','#f2f2ee','#b0a8a0'], dark:false},
  {name:'Black Galaxy', base:'#16161a', flecks:['#c9a227','#8a7a4a','#dfe0e2'], dark:true},
  {name:'Baltic Pink', base:'#b89086', flecks:['#3a2a2a','#e8d0c8','#7a6a64'], dark:false},
  {name:'Slate', base:'#3a4148', flecks:['#262b30','#6e7780','#9aa0a4'], dark:true},
  {name:'Travertine', base:'#d8c4a0', flecks:['#b8a078','#efe2c8','#9a8460'], dark:false, pit:true},
];
const MAT_WOOD=[
  {name:'Oak', early:'#c9a06a', late:'#9a7038', ray:true},
  {name:'Walnut', early:'#6b4a30', late:'#3a2616', ray:false},
  {name:'Teak', early:'#b8895a', late:'#875c34', ray:false},
  {name:'Ebony', early:'#2a2420', late:'#0e0b08', ray:false},
  {name:'Pine', early:'#e3c890', late:'#c39a50', ray:false},
  {name:'Cherry', early:'#b56a4a', late:'#8a4530', ray:false},
];
const MAT_GLASS=[
  {name:'Cobalt', a:'#1f49a8', b:'#0a1a4a', hi:'#bcd8ff'},
  {name:'Emerald', a:'#108a5a', b:'#063524', hi:'#aef0d0'},
  {name:'Amber', a:'#c47812', b:'#5a3208', hi:'#ffe0a0'},
  {name:'Rose', a:'#c0467a', b:'#5a1834', hi:'#ffc8e0'},
  {name:'Smoke', a:'#42424c', b:'#161618', hi:'#d8d8e0'},
  {name:'Aqua', a:'#1ab0b0', b:'#084a4a', hi:'#c8fff8'},
  {name:'Violet', a:'#7a32b8', b:'#2a0f4a', hi:'#e0c8ff'},
  {name:'Murano', a:'#d2402c', b:'#3a1008', hi:'#ffd8a0'},
];
const MAT_MODES=['marble','granite','wood','glass'];
function materia(cv,seed){
  const r=rng(seed);
  const mode=pick(MAT_MODES,r);
  const fmt=pick(MAT_FMTS,r);
  const fam= mode==='marble'? Math.floor(r()*MAT_MARBLE.length) : mode==='granite'? Math.floor(r()*MAT_GRANITE.length) : mode==='wood'? Math.floor(r()*MAT_WOOD.length) : Math.floor(r()*MAT_GLASS.length);
  const finish= pick(['Polished','Honed','Matte'],r);
  // ---- end trait draws ----
  const W=fmt.W,H=fmt.H; cv.width=W; cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  const NO=seed*0.013+1; // noise offset per token
  function strokePts(pts){x.beginPath();for(let i=0;i<pts.length;i++){const p=pts[i];if(i===0)x.moveTo(p[0],p[1]);else x.lineTo(p[0],p[1]);}x.stroke();}
  if(mode==='marble'){
    const M=MAT_MARBLE[fam];
    x.fillStyle=M.base; x.fillRect(0,0,W,H);
    // cloudy translucent washes (depth)
    for(let i=0;i<4;i++){const cx=W*fbm2(i*3+NO,7), cy=H*fbm2(i*3+NO,19), rad=S*(0.3+fbm2(i+NO,2)*0.5);const g=x.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,M.wash[i%2]);g.addColorStop(1,'transparent');x.globalAlpha=0.06+fbm2(i,NO)*0.05;x.fillStyle=g;x.fillRect(0,0,W,H);}x.globalAlpha=1;
    x.lineCap='round';x.lineJoin='round';
    function vein(sx,sy,ang,len,wid,gen){let px=sx,py=sy,a=ang;const pts=[[px,py]];const step=S*0.012;
      for(let i=0;i<len;i++){a+=(fbm2(px*0.004+NO,py*0.004)-0.5)*0.22;px+=Math.cos(a)*step;py+=Math.sin(a)*step;pts.push([px,py]);if(px<-20||py<-20||px>W+20||py>H+20)break;}
      x.strokeStyle=M.halo;x.globalAlpha=0.28;x.lineWidth=wid*3.4;strokePts(pts);
      x.strokeStyle=M.vein;x.globalAlpha=0.74;x.lineWidth=wid;strokePts(pts);x.globalAlpha=1;
      if(gen<2)for(let b=0;b<rint(r,1,3);b++){const bi=rint(r,2,Math.max(3,pts.length-2));if(bi<1||bi>=pts.length)continue;vein(pts[bi][0],pts[bi][1],a+(r()-0.5)*0.8,Math.round(len*0.5),wid*0.6,gen+1);}
    }
    const nV=rint(r,3,6);for(let i=0;i<nV;i++){const edge=r();let sx,sy,ang;if(edge<0.5){sx=-10;sy=H*r();ang=(r()-0.5)*0.7;}else{sx=W*r();sy=-10;ang=1.5708+(r()-0.5)*0.7;}vein(sx,sy,ang,rint(r,80,120),Math.max(2,S*0.006*(0.7+r())),0);}
    // gold seams
    if(M.gold){x.strokeStyle=M.gold;for(let i=0;i<rint(r,1,3);i++){let px=W*r(),py=-10,a=1.2+r();const pts=[[px,py]];const step=S*0.014;for(let k=0;k<60;k++){a+=(fbm2(px*0.003+NO,py*0.003)-0.5)*0.8;px+=Math.cos(a)*step;py+=Math.sin(a)*step;pts.push([px,py]);}x.save();x.shadowColor=M.gold;x.shadowBlur=8;x.globalAlpha=0.6;x.lineWidth=Math.max(2,S*0.005);strokePts(pts);x.restore();x.globalAlpha=1;}}
    // secondary hairline haze
    x.strokeStyle=M.vein;x.globalAlpha=0.07;x.lineWidth=1;for(let i=0;i<40;i++){let px=W*r(),py=H*r(),a=r()*6.283;const pts=[[px,py]];for(let k=0;k<8;k++){a+=(fbm2(px*0.01,py*0.01)-0.5);px+=Math.cos(a)*S*0.01;py+=Math.sin(a)*S*0.01;pts.push([px,py]);}strokePts(pts);}x.globalAlpha=1;
  } else if(mode==='granite'){
    const G=MAT_GRANITE[fam];
    x.fillStyle=G.base; x.fillRect(0,0,W,H);
    // mottled substrate
    for(let i=0;i<40;i++){const cx=W*r(),cy=H*r(),rad=S*(0.06+r()*0.18);const g=x.createRadialGradient(cx,cy,0,cx,cy,rad);g.addColorStop(0,shade(G.base,(r()-0.5)*40));g.addColorStop(1,'transparent');x.globalAlpha=0.12+r()*0.12;x.fillStyle=g;x.fillRect(0,0,W,H);}x.globalAlpha=1;
    if(G.pit){for(let b=0;b<7;b++){const by=H*r();for(let i=0;i<rint(r,30,80);i++){const cx=W*r(),cy=by+(r()-0.5)*H*0.08,rr=2+r()*6;const g=x.createRadialGradient(cx,cy,0,cx,cy,rr);g.addColorStop(0,'rgba(60,45,30,0.5)');g.addColorStop(1,'transparent');x.fillStyle=g;x.beginPath();x.arc(cx,cy,rr,0,6.29);x.fill();}}}
    // multi-scale speckle
    const area=W*H;
    for(const [sz,dens,al] of [[2.6,area/900,0.9],[1.6,area/300,0.8],[1.0,area/140,0.5]]){for(let i=0;i<dens;i++){x.globalAlpha=al*(0.5+r()*0.5);x.fillStyle=G.flecks[Math.floor(r()*G.flecks.length)];const s=sz*(0.6+r()*0.8);x.fillRect(r()*W,r()*H,s,s);}}x.globalAlpha=1;
    // a few fractures (slate)
    if(G.dark){x.strokeStyle='rgba(255,255,255,0.06)';x.lineWidth=1;for(let i=0;i<rint(r,2,5);i++){let px=W*r(),py=-5,a=1.3+r()*0.5;const pts=[[px,py]];for(let k=0;k<40;k++){a+=(r()-0.5)*0.4;px+=Math.cos(a)*S*0.02;py+=Math.sin(a)*S*0.02;pts.push([px,py]);}strokePts(pts);}}
  } else if(mode==='wood'){ // wood
    const Wd=MAT_WOOD[fam]; const quarter=r()<0.4;
    x.fillStyle=Wd.early; x.fillRect(0,0,W,H);
    // tonal earlywood drift
    for(let i=0;i<5;i++){const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,shade(Wd.early,8));g.addColorStop(1,shade(Wd.early,-10));x.globalAlpha=0.12;x.fillStyle=g;x.fillRect(0,0,W,H);}x.globalAlpha=1;
    x.lineCap='round';
    const ringSp=S*(0.018+r()*0.02);
    if(quarter){
      // straight grain (quarter-sawn)
      for(let gx=-S*0.1; gx<W+S*0.1; gx+=ringSp){const pts=[];for(let yy=0;yy<=H;yy+=H/40){const wx=gx+(fbm2(gx*0.01+NO,yy*0.006)-0.5)*S*0.05;pts.push([wx,yy]);}x.strokeStyle=Wd.late;x.globalAlpha=0.35+r()*0.25;x.lineWidth=ringSp*(0.18+r()*0.22);strokePts(pts);}x.globalAlpha=1;
      if(Wd.ray){x.strokeStyle=shade(Wd.early,30);x.globalAlpha=0.3;x.lineWidth=2;for(let i=0;i<60;i++){const px=W*r(),py=H*r();x.beginPath();x.moveTo(px,py);x.lineTo(px+(r()-0.5)*30,py+S*0.02);x.stroke();}x.globalAlpha=1;}
    } else {
      // cathedral (flat-sawn) — warped rings around off-canvas center
      const cx=W*(0.5+(r()-0.5)*0.6), cy=H*(1.2+r()*0.6);
      for(let R=ringSp; R<S*2.2; R+=ringSp){const pts=[];for(let t=-1.6;t<=1.6;t+=0.06){const wr=R+(fbm2(Math.cos(t)*R*0.01+NO,Math.sin(t)*R*0.01)-0.5)*S*0.09;const px=cx+Math.cos(t-1.5708)*wr, py=cy+Math.sin(t-1.5708)*wr;pts.push([px,py]);}x.strokeStyle=Wd.late;x.globalAlpha=0.3+r()*0.25;x.lineWidth=ringSp*(0.18+r()*0.2);strokePts(pts);}x.globalAlpha=1;
    }
    // knots
    for(let k=0;k<rint(r,0,2);k++){const kx=W*(0.15+r()*0.7),ky=H*(0.15+r()*0.7),kr=S*(0.02+r()*0.03);for(let ring=kr*3;ring>kr*0.6;ring-=ringSp*0.5){x.strokeStyle=Wd.late;x.globalAlpha=0.4;x.lineWidth=2;x.beginPath();x.ellipse(kx,ky,ring,ring*0.7,r()*0.5,0,6.29);x.stroke();}x.globalAlpha=1;x.fillStyle=shade(Wd.late,-30);x.beginPath();x.ellipse(kx,ky,kr,kr*0.7,0,0,6.29);x.fill();}
    // pores/streaks along grain
    x.globalAlpha=0.25;x.fillStyle=Wd.late;for(let i=0;i<W*H/2200;i++){x.fillRect(r()*W,r()*H,2+r()*5,1);}x.globalAlpha=1;
  } else { // glass
    const Gl=MAT_GLASS[fam];
    const bgg=x.createLinearGradient(0,0,W*0.4,H);bgg.addColorStop(0,shade(Gl.a,25));bgg.addColorStop(0.5,Gl.a);bgg.addColorStop(1,Gl.b);x.fillStyle=bgg;x.fillRect(0,0,W,H);
    // internal colour swirls (domain-warped ribbons)
    x.save();x.globalCompositeOperation='lighter';
    for(let i=0;i<14;i++){const yy=H*fbm2(i*3+NO,1);x.strokeStyle= i%2?Gl.hi:shade(Gl.a,45);x.globalAlpha=0.05+fbm2(i,NO)*0.06;x.lineWidth=S*(0.01+fbm2(i,2)*0.045);x.beginPath();for(let xx=0;xx<=W;xx+=W/40){const wy=yy+(fbm2(xx*0.003+i+NO,7)-0.5)*S*0.32;if(xx===0)x.moveTo(xx,wy);else x.lineTo(xx,wy);}x.stroke();}
    x.restore();x.globalAlpha=1;
    // trapped bubbles
    for(let i=0;i<rint(r,8,24);i++){const bx=r()*W,by=r()*H,br=2+r()*S*0.02;const b3=x.createRadialGradient(bx-br*0.3,by-br*0.3,0,bx,by,br);b3.addColorStop(0,'rgba(255,255,255,0.75)');b3.addColorStop(0.5,'rgba(255,255,255,0.06)');b3.addColorStop(1,'transparent');x.fillStyle=b3;x.beginPath();x.arc(bx,by,br,0,6.29);x.fill();x.strokeStyle='rgba(255,255,255,0.15)';x.lineWidth=1;x.beginPath();x.arc(bx,by,br,0,6.29);x.stroke();}
    // caustic ribbons
    x.save();x.globalCompositeOperation='lighter';x.strokeStyle=Gl.hi;x.globalAlpha=0.35;x.lineWidth=2;for(let i=0;i<5;i++){x.beginPath();for(let xx=0;xx<=W;xx+=W/30){const wy=H*(0.18+i*0.16)+(fbm2(xx*0.005+i*5+NO,3)-0.5)*S*0.09;if(xx===0)x.moveTo(xx,wy);else x.lineTo(xx,wy);}x.stroke();}x.restore();x.globalAlpha=1;
    // big specular gloss streak
    x.save();x.globalCompositeOperation='lighter';x.translate(W*0.5,H*0.5);x.rotate(-0.6);const sgr=x.createLinearGradient(-W*0.5,0,W*0.5,0);sgr.addColorStop(0,'transparent');sgr.addColorStop(0.5,'rgba(255,255,255,0.32)');sgr.addColorStop(0.56,'rgba(255,255,255,0.62)');sgr.addColorStop(0.62,'rgba(255,255,255,0.18)');sgr.addColorStop(1,'transparent');x.fillStyle=sgr;x.fillRect(-W,-S*0.05,2*W,S*0.1);x.restore();
    // bevel rim
    x.strokeStyle='rgba(255,255,255,0.4)';x.lineWidth=3;x.strokeRect(5,5,W-10,H-10);
  }
  // ---- finish / lighting pass (committed top-left light) ----
  if(finish!=='Matte'){
    const lg=x.createLinearGradient(0,0,W*0.7,H);lg.addColorStop(0,'rgba(255,255,255,'+(finish==='Polished'?0.16:0.08)+')');lg.addColorStop(0.5,'transparent');lg.addColorStop(1,'rgba(0,0,0,0.10)');x.save();x.globalCompositeOperation='overlay';x.fillStyle=lg;x.fillRect(0,0,W,H);x.restore();
    if(finish==='Polished'){x.save();x.globalCompositeOperation='lighter';x.globalAlpha=0.10;const sg=x.createLinearGradient(0,0,W,H*0.4);sg.addColorStop(0,'transparent');sg.addColorStop(0.5,'#ffffff');sg.addColorStop(1,'transparent');x.fillStyle=sg;x.fillRect(0,0,W,H);x.restore();}
  } else {x.save();x.globalAlpha=0.05;x.globalCompositeOperation='overlay';for(let i=0;i<W*H/1400;i++){x.fillStyle=r()<0.5?'#000':'#fff';x.fillRect(r()*W,r()*H,1,1);}x.restore();}
  // edge vignette + slab bevel
  const vg=x.createRadialGradient(W/2,H/2,S*0.42,W/2,H/2,Math.max(W,H)*0.7);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.22)');x.fillStyle=vg;x.fillRect(0,0,W,H);
  x.strokeStyle='rgba(255,255,255,0.10)';x.lineWidth=2;x.strokeRect(3,3,W-6,H-6);
}
function castMateria(seed){
  const r=rng(seed);
  const mode=pick(MAT_MODES,r);
  const fmt=pick(MAT_FMTS,r);
  const fam= mode==='marble'? Math.floor(r()*MAT_MARBLE.length) : mode==='granite'? Math.floor(r()*MAT_GRANITE.length) : mode==='wood'? Math.floor(r()*MAT_WOOD.length) : Math.floor(r()*MAT_GLASS.length);
  const finish= pick(['Polished','Honed','Matte'],r);
  const famName= mode==='marble'?MAT_MARBLE[fam].name : mode==='granite'?MAT_GRANITE[fam].name : mode==='wood'?MAT_WOOD[fam].name : MAT_GLASS[fam].name;
  return {material: mode.charAt(0).toUpperCase()+mode.slice(1), stone: famName, format: fmt.t, finish};
}

/* WEFT — "Weft" (homage to Andreas Rau / Loom): imaginary woven cloth. A noise
   flow field guides two thread sets — warp (vertical bias) + weft (horizontal
   bias) — traced as fine streamlines; their low-alpha crossings build the cloth.
   Muted Bauhaus-textile palettes (Albers/Stölzl lineage), paper, faint loom
   grid, occasional broken threads. Uses fBm field. cast mirrors the leads. */

/* Materia */
export const materiaTraits: TraitsFn = (id) => { const c = castMateria(id) as any; return { Material: c.material, Stone: c.stone, Format: c.format, Finish: c.finish }; };
export const materiaSchema: TraitSchema = { traits: [
  { name: 'Material', values: ['Marble','Granite','Wood','Glass'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'Finish', values: ['Polished','Honed','Matte'] },
] };
export const renderMateria = blit(materia, materiaTraits);
export const MATERIA_ASPECTS = [1, 0.75, 1.33, 0.66] as const;
