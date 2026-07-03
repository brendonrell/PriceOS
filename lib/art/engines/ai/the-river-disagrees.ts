// @ts-nocheck
/*
 * The River Disagrees — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shuffle, hash2, paperNoise, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* ============ the original 8, colour-cranked + higher variance ============ */

/* 3. PLAT — surveys with zoning washes + coloured papers */
function plat(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1100,H:1100}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sch=pick([
    {paper:'#f0f4f6',ink:'#3a3128',water:'#9fd9e8',wash:['#ffd514','#ff5500','#1fb8a0']},
    {paper:'#dff2e4',ink:'#0f4a2e',water:'#6fc8e8',wash:['#ff2b6e','#ffaa00','#2b4bd8']},
    {paper:'#ffe9d6',ink:'#7a1d2e',water:'#5ab8d8',wash:['#0f8a3c','#ffd514','#7a00cc']},
    {paper:'#e4ecff',ink:'#1d2a6a',water:'#36c8c0',wash:['#ff4d2e','#ffc814','#d61a8c']},
  ],r);
  x.fillStyle=sch.paper; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H,'90,70,40',800);
  const M=70, mapX=M, mapY=110, mapW=W-2*M, mapH=H-290;
  let rects=[{x:mapX,y:mapY,w:mapW,h:mapH}];
  const target=rint(r,4,28);
  while(rects.length<target){
    rects.sort((a,b)=>b.w*b.h-a.w*a.h);
    const q=rects.shift(), f=0.35+r()*0.3;
    if(q.w>q.h){rects.push({x:q.x,y:q.y,w:q.w*f,h:q.h},{x:q.x+q.w*f,y:q.y,w:q.w*(1-f),h:q.h});}
    else {rects.push({x:q.x,y:q.y,w:q.w,h:q.h*f},{x:q.x,y:q.y+q.h*f,w:q.w,h:q.h*(1-f)});}
  }
  const J=10;
  const jx=(px,py)=>px+(hash2(Math.round(px),Math.round(py))-0.5)*2*J;
  const jy=(px,py)=>py+(hash2(Math.round(py),Math.round(px))-0.5)*2*J;
  function poly(q){
    return [[q.x,q.y],[q.x+q.w,q.y],[q.x+q.w,q.y+q.h],[q.x,q.y+q.h]].map(p=>[jx(p[0],p[1]),jy(p[0],p[1])]);
  }
  const nums=shuffle(rects.map((_,i)=>i+1),r);
  rects.forEach((q,i)=>{
    const pl=poly(q);
    // zoning wash
    if(r()<0.72){
      x.fillStyle=pick(sch.wash,r); x.globalAlpha=0.34;
      x.beginPath(); pl.forEach((p,k)=>k===0?x.moveTo(p[0],p[1]):x.lineTo(p[0],p[1]));
      x.closePath(); x.fill(); x.globalAlpha=1;
    }
    x.strokeStyle=sch.ink; x.fillStyle=sch.ink;
    x.lineWidth=1.6; x.beginPath();
    pl.forEach((p,k)=>k===0?x.moveTo(p[0],p[1]):x.lineTo(p[0],p[1]));
    x.closePath(); x.stroke();
    pl.forEach(p=>{x.beginPath();x.arc(p[0],p[1],3,0,6.29);x.stroke();});
    const cx=q.x+q.w/2, cy=q.y+q.h/2;
    const fs2=Math.max(15,Math.min(48,Math.sqrt(q.w*q.h)/9));
    x.textAlign='center'; x.font='italic '+Math.round(fs2)+'px Georgia,serif';
    x.fillText('LOT '+nums[i],cx,cy-6);
    if(fs2>19){
      x.font='italic '+Math.round(fs2*0.62)+'px Georgia,serif';
      x.fillText((q.w*q.h/52000).toFixed(2)+' AC.',cx,cy+fs2*0.85);
    }
  });
  const hasRiver=r()<0.85;
  const ry0=mapY+mapH*(0.25+r()*0.5), amp=40+r()*50, ph=r()*6.28, wdt=20+r()*90;
  function bank(off){
    x.beginPath();
    for(let s=-20;s<=mapW+20;s+=8){
      const yy=ry0+Math.sin(s*0.006+ph)*amp+Math.sin(s*0.017+ph*2)*amp*0.35+off;
      if(s===-20)x.moveTo(mapX+s,yy);else x.lineTo(mapX+s,yy);
    }
  }
  if(hasRiver){
  x.save();
  x.beginPath(); x.rect(mapX,mapY,mapW,mapH); x.clip();
  x.fillStyle=sch.water;
  x.beginPath();
  for(let s=-20;s<=mapW+20;s+=8){const yy=ry0+Math.sin(s*0.006+ph)*amp+Math.sin(s*0.017+ph*2)*amp*0.35-wdt/2;s===-20?x.moveTo(mapX+s,yy):x.lineTo(mapX+s,yy);}
  for(let s=mapW+20;s>=-20;s-=8){const yy=ry0+Math.sin(s*0.006+ph)*amp+Math.sin(s*0.017+ph*2)*amp*0.35+wdt/2;x.lineTo(mapX+s,yy);}
  x.closePath(); x.fill();
  x.strokeStyle=sch.ink; x.lineWidth=1.4; bank(-wdt/2); x.stroke(); bank(wdt/2); x.stroke();
  x.lineWidth=0.6; for(let k=1;k<4;k++){bank(-wdt/2+k*wdt/4); x.globalAlpha=0.5; x.stroke(); x.globalAlpha=1;}
  x.restore();
  }
  x.strokeStyle=sch.ink; x.fillStyle=sch.ink;
  x.lineWidth=2.4; x.strokeRect(mapX,mapY,mapW,mapH);
  x.font='15px Georgia,serif'; x.textAlign='center';
  x.fillText('N '+rint(r,1,89)+'°'+rint(r,10,59)+'′ E — '+(mapW*0.92).toFixed(1)+' FT',mapX+mapW/2,mapY-12);
  x.save(); x.translate(mapX-14,mapY+mapH/2); x.rotate(-Math.PI/2);
  x.fillText('S '+rint(r,1,89)+'°'+rint(r,10,59)+'′ W — '+(mapH*0.92).toFixed(1)+' FT',0,0); x.restore();
  const nx=W-130, ny=170;
  x.beginPath(); x.arc(nx,ny,34,0,6.29); x.lineWidth=1.4; x.stroke();
  x.beginPath(); x.moveTo(nx,ny+26); x.lineTo(nx-9,ny+2); x.lineTo(nx,ny-26); x.lineTo(nx+9,ny+2); x.closePath(); x.fill();
  x.font='bold 22px Georgia,serif'; x.fillText('N',nx,ny-44);
  const name=pick(['HALCYON','WINTERFIELD','LOWER MERIDIAN','PROVIDENCE BEND','SALT GARDEN','VANISHING POINT','GREATER NOWHERE'],r);
  x.textAlign='center';
  x.font='30px Georgia,serif'; x.fillText('PLAT OF SURVEY',W/2,H-126);
  x.font='italic 24px Georgia,serif'; x.fillText('“'+name+' ADDITION”',W/2,H-92);
  x.font='16px Georgia,serif';
  x.fillText('SCALE 1″ = 100 FT · SURVEYED '+pick(['MAY','JUNE','OCT.','APR.'],r)+' '+rint(r,1871,1958)+' · '+pick(['E. SALT','J. CROW','M. VESPER','A. LOAM'],r)+', COUNTY SURVEYOR',W/2,H-58);
  x.lineWidth=1; x.strokeRect(M,H-166,W-2*M,130);
}

/* 5. RECEIPTS — wide/skinny, coloured papers + coloured ink */
function castPlat(seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1100,H:1100}],r);
  const si=Math.floor(r()*4);
  return {fmt,si};
}

/* ── The River Disagrees ────────────────────────────────────────────────── */
const PLAT_PAPER = ['Cool White', 'Mint', 'Peach', 'Sky'];
export const riverTraits: TraitsFn = (id) => {
  const c = castPlat(id);
  const fmt = c.fmt.W === 1000 ? 'Portrait' : c.fmt.W === 1240 ? 'Landscape' : 'Square';
  return { Format: fmt, Paper: PLAT_PAPER[c.si] };
};
export const riverSchema: TraitSchema = {
  traits: [
    { name: 'Format', values: ['Portrait', 'Landscape', 'Square'] },
    { name: 'Paper', values: PLAT_PAPER },
  ],
};
export const renderRiver = blit(plat, riverTraits);
export const RIVER_ASPECTS = [0.81, 1.24, 1] as const;
