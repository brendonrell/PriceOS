// @ts-nocheck
/*
 * Scissors, No Plan — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shuffle, paperNoise, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* 27. CUTOUT — scissors, paper, no plan */
function cutout(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1100,H:1100}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sch=pick([
    {bg:'#1d4fb8',p:['#ffd514','#ff2bd1','#f2ead0','#0f8a3c']},
    {bg:'#e8f0f4',p:['#d61a3c','#1d2bd6','#0f8a3c','#14141c']},
    {bg:'#d61a3c',p:['#f2ead0','#ffd514','#14141c','#0fa8a0']},
    {bg:'#14141c',p:['#ff5500','#00e5c0','#ffd514','#ff2bd1']},
    {bg:'#0f8a3c',p:['#ffe9c8','#ff7a2b','#d61a8c','#1d2bd6']},
    {bg:'#ffaa00',p:['#14141c','#d61a3c','#f2ead0','#1d4fb8']},
    {bg:'#f2f2f4',p:['#ff5500','#14141c','#1d2bd6','#ff2bd1']},
    {bg:'#2a1040',p:['#c8ff00','#ff7a2b','#e8d8ff','#00e5c0']},
    {bg:'#0a3d7a',p:['#ffc8a8','#ffd514','#d61a3c','#f2ead0']},
    {bg:'#ffd6e4',p:['#14141c','#7a00cc','#0f8a3c','#d61a3c']},
  ],r);
  x.fillStyle=sch.bg; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H,'0,0,0',600);
  function blob(cx,cy,R,squash,rot){
    const n=rint(r,7,11);
    const pts=[];
    for(let i=0;i<n;i++){
      const a=i/n*6.283;
      const rr=R*(0.55+r()*0.65);
      pts.push([cx+Math.cos(a+rot)*rr,cy+Math.sin(a+rot)*rr*squash]);
    }
    x.beginPath();
    for(let i=0;i<n;i++){
      const p0=pts[i], p1=pts[(i+1)%n];
      const mx=(p0[0]+p1[0])/2, my=(p0[1]+p1[1])/2;
      if(i===0) x.moveTo((pts[n-1][0]+p0[0])/2,(pts[n-1][1]+p0[1])/2);
      x.quadraticCurveTo(p0[0],p0[1],mx,my);
    }
    x.closePath();
  }
  function sliver(x1,y1,x2,y2,w){
    const mx=(x1+x2)/2+(r()-0.5)*160, my=(y1+y2)/2+(r()-0.5)*160;
    x.beginPath();
    x.moveTo(x1,y1);
    x.quadraticCurveTo(mx,my,x2,y2);
    x.quadraticCurveTo(mx+w,my+w*0.4,x1+w*0.6,y1+w);
    x.closePath();
  }
  // shape vocabulary: blobs, bars, rings, crescents, fronds — scissors get bored too
  function bar(cx,cy,R,squash,rot){
    x.save(); x.translate(cx,cy); x.rotate(rot);
    x.beginPath(); x.rect(-R*1.1,-R*0.3*squash,R*2.2,R*0.6*squash);
    x.restore();
  }
  function ring(cx,cy,R){
    x.beginPath();
    x.arc(cx,cy,R,0,6.283);
    x.arc(cx,cy,R*0.5,0,6.283,true);
  }
  function crescent(cx,cy,R,rot){
    x.save(); x.translate(cx,cy); x.rotate(rot);
    x.beginPath();
    x.arc(0,0,R,0.5,5.78);
    x.quadraticCurveTo(R*0.25,0,Math.cos(0.5)*R,Math.sin(0.5)*R);
    x.restore();
  }
  function frond(cx,cy,R,rot){
    x.save(); x.translate(cx,cy); x.rotate(rot);
    x.beginPath();
    x.moveTo(0,-R);
    x.quadraticCurveTo(R*0.62,0,0,R);
    x.quadraticCurveTo(-R*0.62,0,0,-R);
    x.restore();
  }
  function shape(cx,cy,R,squash,rot){
    const t=pick(['blob','blob','bar','ring','crescent','frond','frond'],r);
    if(t==='bar') bar(cx,cy,R,squash,rot);
    else if(t==='ring') ring(cx,cy,R*0.8);
    else if(t==='crescent') crescent(cx,cy,R*0.85,rot);
    else if(t==='frond') frond(cx,cy,R*1.05,rot);
    else blob(cx,cy,R,squash,rot);
  }
  const cols=shuffle(sch.p,r);
  const comp=pick(['anchor','anchor','scatter','totem'],r);
  x.save();
  x.shadowColor='rgba(0,0,0,0.25)'; x.shadowBlur=18; x.shadowOffsetX=10; x.shadowOffsetY=12;
  let nm=0;
  if(comp==='anchor'){
    x.fillStyle=cols[0];
    blob(W*(0.3+r()*0.4),H*(0.3+r()*0.4),Math.min(W,H)*0.42,0.8+r()*0.4,r()*6.28); x.fill();
    nm=rint(r,2,4);
    for(let i=0;i<nm;i++){
      x.fillStyle=cols[(i+1)%cols.length];
      shape(W*(0.12+r()*0.76),H*(0.12+r()*0.76),Math.min(W,H)*(0.14+r()*0.16),0.7+r()*0.6,r()*6.28);
      x.fill();
    }
  } else if(comp==='scatter'){
    nm=rint(r,8,14);
    for(let i=0;i<nm;i++){
      x.fillStyle=cols[i%cols.length];
      shape(W*(0.08+r()*0.84),H*(0.08+r()*0.84),Math.min(W,H)*(0.07+r()*0.12),0.7+r()*0.6,r()*6.28);
      x.fill();
    }
  } else { // totem — a stacked spine of shapes
    const tx=W*(0.35+r()*0.3);
    const nseg=rint(r,4,6);
    for(let i=0;i<nseg;i++){
      x.fillStyle=cols[i%cols.length];
      const yy=H*(0.12+(i+0.5)*0.76/nseg);
      shape(tx+(r()-0.5)*60,yy,Math.min(W,H)*(0.1+r()*0.13),0.55+r()*0.5,r()*6.28);
      x.fill();
    }
    nm=nseg;
  }
  if(r()<0.7){
    x.fillStyle=cols[(nm+1)%cols.length];
    sliver(W*r()*0.3,H*(0.1+r()*0.8),W*(0.7+r()*0.3),H*(0.1+r()*0.8),30+r()*50);
    x.fill();
  }
  x.restore();
  // seeds (no shadow)
  const sc=pick(cols,r);
  const nd=rint(r,4,12);
  const dx0=W*(0.15+r()*0.7), dy0=H*(0.15+r()*0.7);
  for(let i=0;i<nd;i++){
    x.fillStyle=sc;
    const a=r()*6.283, dd=20+r()*150;
    blob(dx0+Math.cos(a)*dd,dy0+Math.sin(a)*dd,10+r()*16,1,r()*6.28);
    x.fill();
  }
}

/* ============ round five v2: four ornament nations + rebuilt abstracts ============ */

/* SPECIMEN — "Full Faith & Credit": four nations, four ORNAMENT SYSTEMS.
   Guilloché belongs to ONE nation. The others: letterpress deco, Swiss flat,
   hatch engraving. No shared decoration between them. */
function castCutout(seed){
  const r=rng(seed);
  r(); // fmt
  const si=Math.floor(r()*10);
  for(let i=0;i<600;i++){r();r();r();} // paperNoise burn
  for(let i=3;i>0;i--) Math.floor(r()*(i+1)); // shuffle(4) burn
  const comp=pick(['anchor','anchor','scatter','totem'],r);
  return {si,comp};
}

/* ── Scissors, No Plan ──────────────────────────────────────────────────── */
const CUT_GROUND = ['Royal', 'Ice', 'Crimson', 'Charcoal', 'Green', 'Amber', 'Snow', 'Plum', 'Navy', 'Pink'];
export const scissorsTraits: TraitsFn = (id) => {
  const c = castCutout(id);
  return { Ground: CUT_GROUND[c.si], Layout: cap(c.comp) };
};
export const scissorsSchema: TraitSchema = {
  traits: [
    { name: 'Ground', values: CUT_GROUND,
      subtraits: [
        { name: 'Loud', values: ['Royal', 'Crimson', 'Green', 'Amber', 'Plum', 'Navy', 'Pink'] },
        { name: 'Quiet', values: ['Ice', 'Charcoal', 'Snow'] },
      ] },
    { name: 'Layout', values: ['Anchor', 'Scatter', 'Totem'] },
  ],
};
export const renderScissors = blit(cutout, scissorsTraits);
export const SCISSORS_ASPECTS = [0.81, 1.24, 1] as const;
