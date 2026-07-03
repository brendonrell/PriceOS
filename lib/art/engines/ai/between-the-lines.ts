// @ts-nocheck
/*
 * Between The Lines — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* 24. INTERFERENCE — moiré plates, the image lives between the lines */
function interference(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1100,H:1100},{W:1240,H:1000}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sch=pick([
    {bg:'#0a0a12',c:['#00e5ff','#ff2bd1']},
    {bg:'#0c0c10',c:['#c8ff00','#7a2bff']},
    {bg:'#eef2f4',c:['#d61a3c','#1d2bd6']},
    {bg:'#10041c',c:['#ffd514','#ff2b6e']},
    {bg:'#041410',c:['#00ffa1','#ff7a2b']},
    {bg:'#e6f0e8',c:['#0f8a3c','#d61a8c']},
    {bg:'#0c1430',c:['#7fd8c8','#ffd514']},
    {bg:'#1c0a14',c:['#ff9ad1','#c8ff00']},
    {bg:'#f2f2f4',c:['#ff5500','#10306a']},
  ],r);
  x.fillStyle=sch.bg; x.fillRect(0,0,W,H);
  const diag=Math.hypot(W,H);
  const combo=pick(['rings','ringfan','fans','ringgrid'],r);
  function rings(cx,cy,p,col,lw){
    x.strokeStyle=col; x.lineWidth=lw;
    for(let rr=p/2;rr<diag*1.2;rr+=p){
      x.beginPath(); x.arc(cx,cy,rr,0,6.29); x.stroke();
    }
  }
  function fan(cx,cy,n,col,lw,ph){
    x.strokeStyle=col; x.lineWidth=lw;
    for(let i=0;i<n;i++){
      const a=ph+i/n*6.283;
      x.beginPath(); x.moveTo(cx,cy);
      x.lineTo(cx+Math.cos(a)*diag*1.3,cy+Math.sin(a)*diag*1.3); x.stroke();
    }
  }
  function grid(angle,p,col,lw){
    x.strokeStyle=col; x.lineWidth=lw;
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const nx=-dy,ny=dx, cx=W/2,cy=H/2;
    for(let o=-diag;o<diag;o+=p){
      x.beginPath();
      x.moveTo(cx+nx*o-dx*diag,cy+ny*o-dy*diag);
      x.lineTo(cx+nx*o+dx*diag,cy+ny*o+dy*diag); x.stroke();
    }
  }
  const lw=2.2+r()*1.8;
  const p1=10+r()*8;
  const cx1=W*(0.3+r()*0.4), cy1=H*(0.3+r()*0.4);
  if(combo==='rings'){
    const off=30+r()*220, oa=r()*6.28;
    rings(cx1,cy1,p1,sch.c[0],lw);
    rings(cx1+Math.cos(oa)*off,cy1+Math.sin(oa)*off,p1*(0.96+r()*0.08),sch.c[1],lw);
  } else if(combo==='ringfan'){
    rings(cx1,cy1,p1,sch.c[0],lw);
    fan(W-cx1,H-cy1,rint(r,90,180),sch.c[1],lw,r());
  } else if(combo==='fans'){
    const n=rint(r,100,200);
    fan(cx1,cy1,n,sch.c[0],lw,0);
    fan(cx1+(r()-0.5)*160,cy1+(r()-0.5)*160,n,sch.c[1],lw,0.01+r()*0.03);
  } else {
    const ga=r()*3.14;
    grid(ga,p1,sch.c[0],lw);
    rings(cx1,cy1,p1*1.02,sch.c[1],lw);
  }
  // plate edge
  x.strokeStyle=sch.bg; x.lineWidth=70; x.strokeRect(-20,-20,W+40,H+40);
  x.strokeStyle= sch.bg==='#eef2f4'||sch.bg==='#e6f0e8' ? '#2c2a24':'#e8e2cc';
  x.lineWidth=2; x.strokeRect(38,38,W-76,H-76);
}

/* 27. CUTOUT — scissors, paper, no plan */
function castInterference(seed){
  const r=rng(seed);
  r(); // fmt
  const si=Math.floor(r()*9);
  const combo=pick(['rings','ringfan','fans','ringgrid'],r);
  return {si,combo};
}

/* ── Between The Lines ──────────────────────────────────────────────────── */
const PLATES: Record<string, string> = {
  rings: 'Rings × Rings', ringfan: 'Rings × Fan', fans: 'Fan × Fan', ringgrid: 'Rings × Grid',
};
const BTL_SCHEME = ['Cyan/Magenta', 'Acid/Violet', 'Red/Blue', 'Gold/Rose', 'Mint/Orange', 'Green/Magenta', 'Teal/Gold', 'Rose/Acid', 'Orange/Navy'];
export const betweenTraits: TraitsFn = (id) => {
  const c = castInterference(id);
  return { Plates: PLATES[c.combo], Scheme: BTL_SCHEME[c.si] };
};
export const betweenSchema: TraitSchema = {
  traits: [
    { name: 'Plates', values: ['Rings × Rings', 'Rings × Fan', 'Fan × Fan', 'Rings × Grid'] },
    { name: 'Scheme', values: BTL_SCHEME },
  ],
};
export const renderBetween = blit(interference, betweenTraits);
export const BETWEEN_ASPECTS = [0.81, 1, 1.24] as const;
