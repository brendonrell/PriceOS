// @ts-nocheck
/*
 * Nobody's Swimming — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shade, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* NOBODY'S SWIMMING — a hundred backyards */
function poolside(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1100,H:1100}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const base=pick(['lawn','deck','deck','lawn'],r);
  const lawn=['#3aa84c','#2f9444','#5cb860'][seed%3];
  const DECKS=['#cfd8dc','#e8d8a8','#7fd8c8','#e8645a','#b8a8e8','#d96a3b'];
  const deck=DECKS[seed%DECKS.length]; r(); r();
  const water=pick(['#1d8fd8','#0fa8c8','#2bb8e8','#0f6a9c','#36c8c0'],r);
  const shA=pick([0.6,1.0,1.4],r);
  const shx=Math.cos(shA)*24, shy=Math.sin(shA)*24;
  // ground
  x.fillStyle= base==='lawn'? lawn : deck;
  x.fillRect(0,0,W,H);
  if(base==='lawn'){
    // mowing stripes
    x.fillStyle='rgba(255,255,255,0.05)';
    const mw=Math.round(W/rint(r,6,10));
    for(let t=0;t<W;t+=mw*2) x.fillRect(t,0,mw,H);
  } else {
    x.strokeStyle='rgba(0,0,0,0.12)'; x.lineWidth=2;
    const tile=rint(r,70,120);
    for(let t=tile;t<W;t+=tile){x.beginPath();x.moveTo(t,0);x.lineTo(t,H);x.stroke();}
    for(let t=tile;t<H;t+=tile){x.beginPath();x.moveTo(0,t);x.lineTo(W,t);x.stroke();}
  }
  // pool geometry — scale + position roam the whole yard
  const ps=0.32+r()*0.4;
  const pw=W*ps, ph=H*ps*(0.6+r()*0.7);
  const px0=W*0.06+r()*(W-pw-W*0.12);
  const py0=H*0.06+r()*(H-ph-H*0.12);
  const kind=pick(['rect','kidney','ell','lap','round'],r);
  function poolPath(off){
    const o=off||0;
    x.beginPath();
    if(kind==='rect'){ x.rect(px0-o,py0-o,pw+2*o,ph+2*o); }
    else if(kind==='lap'){ x.rect(px0-o,py0+ph*0.18-o,pw+2*o,ph*0.62+2*o); }
    else if(kind==='round'){ x.ellipse(px0+pw/2,py0+ph/2,pw/2+o,ph/2+o,0,0,6.29); }
    else if(kind==='ell'){
      x.moveTo(px0-o,py0-o);
      x.lineTo(px0+pw*0.62+o,py0-o); x.lineTo(px0+pw*0.62+o,py0+ph*0.45-o);
      x.lineTo(px0+pw+o,py0+ph*0.45-o); x.lineTo(px0+pw+o,py0+ph+o);
      x.lineTo(px0-o,py0+ph+o); x.closePath();
    } else {
      const cx=px0+pw/2, cy=py0+ph/2;
      x.moveTo(cx-pw*0.5-o,cy);
      x.bezierCurveTo(cx-pw*0.52-o,cy-ph*0.62-o,cx+pw*0.2,cy-ph*0.72-o,cx+pw*0.42+o,cy-ph*0.32-o);
      x.bezierCurveTo(cx+pw*0.56+o,cy-ph*0.05,cx+pw*0.52+o,cy+ph*0.2,cx+pw*0.3+o,cy+ph*0.28);
      x.bezierCurveTo(cx+pw*0.1,cy+ph*0.34,cx+pw*0.05,cy+ph*0.52+o,cx-pw*0.18,cy+ph*0.56+o);
      x.bezierCurveTo(cx-pw*0.46-o,cy+ph*0.6+o,cx-pw*0.52-o,cy+ph*0.25,cx-pw*0.5-o,cy);
      x.closePath();
    }
  }
  // patio apron when pool sits in lawn
  if(base==='lawn'){
    x.fillStyle=pick(['#cfd8dc','#e8d8a8','#d8c8b0'],r);
    poolPath(46+r()*40); x.fill();
  }
  x.fillStyle='#f4f0e2'; poolPath(14); x.fill();
  x.fillStyle=water; poolPath(0); x.fill();
  x.save(); poolPath(0); x.clip();
  x.fillStyle='rgba(0,0,40,0.18)';
  x.fillRect(px0+pw*0.5,py0,pw*0.6,ph*1.2);
  x.strokeStyle='rgba(255,255,255,0.5)'; x.lineWidth=2.2;
  for(let i=0;i<Math.round(18*ps/0.5);i++){
    const sx2=px0+r()*pw, sy2=py0+r()*ph, ln=16+r()*44;
    x.beginPath(); x.moveTo(sx2,sy2);
    x.quadraticCurveTo(sx2+ln*0.5,sy2-7,sx2+ln,sy2);
    x.stroke();
  }
  if(kind==='lap'){
    x.strokeStyle='rgba(255,255,255,0.8)'; x.lineWidth=4;
    for(let i=1;i<5;i++){
      const yy=py0+ph*0.18+i*(ph*0.62)/5;
      x.beginPath(); x.moveTo(px0+8,yy); x.lineTo(px0+pw-8,yy); x.stroke();
    }
  }
  x.restore();
  x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=3; poolPath(0); x.stroke();
  // hot tub
  if(r()<0.4){
    const tx=px0+pw+60<W-80? px0+pw+60 : px0-80;
    const ty=py0+ph*r();
    x.fillStyle='#f4f0e2'; x.beginPath(); x.arc(tx,ty,52,0,6.29); x.fill();
    x.fillStyle=shade(water,-26); x.beginPath(); x.arc(tx,ty,40,0,6.29); x.fill();
    x.strokeStyle='rgba(255,255,255,0.5)'; x.lineWidth=2;
    for(let i=0;i<3;i++){x.beginPath();x.arc(tx,ty,12+i*9,r()*3,r()*3+2.2);x.stroke();}
  }
  // second small pool, rare
  if(r()<0.1){
    const sx2=W*(0.1+r()*0.7), sy2=H*(0.1+r()*0.7);
    x.fillStyle='#f4f0e2'; x.beginPath(); x.ellipse(sx2,sy2,84,60,0,0,6.29); x.fill();
    x.fillStyle=water; x.beginPath(); x.ellipse(sx2,sy2,70,48,0,0,6.29); x.fill();
  }
  // house roof along one edge
  if(r()<0.55){
    const side=pick(['top','bottom','left','right'],r);
    const rc=pick(['#8a8f96','#b0594a','#6a7178','#a89070'],r);
    const depth=Math.min(W,H)*(0.16+r()*0.1);
    x.fillStyle='rgba(0,0,30,0.25)';
    if(side==='top'){x.fillRect(shx,shy,W,depth);}
    if(side==='bottom'){x.fillRect(shx,H-depth+shy,W,depth);}
    if(side==='left'){x.fillRect(shx,shy,depth,H);}
    if(side==='right'){x.fillRect(W-depth+shx,shy,depth,H);}
    x.fillStyle=rc;
    let rx0=0,ry0=0,rw2=W,rh2=depth,horiz=true;
    if(side==='bottom'){ry0=H-depth;}
    if(side==='left'){rw2=depth;rh2=H;horiz=false;}
    if(side==='right'){rx0=W-depth;rw2=depth;rh2=H;horiz=false;}
    x.fillRect(rx0,ry0,rw2,rh2);
    // ridge + seams
    x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=3;
    x.beginPath();
    if(horiz){x.moveTo(rx0,ry0+(side==='top'?rh2-4:4));x.lineTo(rx0+rw2,ry0+(side==='top'?rh2-4:4));}
    else {x.moveTo(rx0+(side==='left'?rw2-4:4),ry0);x.lineTo(rx0+(side==='left'?rw2-4:4),ry0+rh2);}
    x.stroke();
    x.lineWidth=1.2; x.globalAlpha=0.4;
    for(let t=0;t<(horiz?rw2:rh2);t+=44){
      x.beginPath();
      if(horiz){x.moveTo(rx0+t,ry0);x.lineTo(rx0+t,ry0+rh2);}
      else {x.moveTo(rx0,ry0+t);x.lineTo(rx0+rw2,ry0+t);}
      x.stroke();
    }
    x.globalAlpha=1;
  }
  // hedge band
  if(r()<0.4){
    const hside=pick(['top','bottom','left','right'],r);
    x.fillStyle=shade(lawn,-44);
    const hd=34+r()*26;
    if(hside==='top')x.fillRect(0,0,W,hd);
    if(hside==='bottom')x.fillRect(0,H-hd,W,hd);
    if(hside==='left')x.fillRect(0,0,hd,H);
    if(hside==='right')x.fillRect(W-hd,0,hd,H);
  }
  // trees
  const nt=rint(r,0,4);
  for(let i=0;i<nt;i++){
    const tx=W*r(), ty=H*r();
    const tr=34+r()*40;
    x.fillStyle='rgba(0,0,30,0.25)';
    x.beginPath(); x.arc(tx+shx,ty+shy,tr,0,6.29); x.fill();
    const tc=pick(['#2f8a3c','#3a9c4a','#27753a','#4aa455'],r);
    for(let k=0;k<5;k++){
      x.fillStyle=shade(tc,rint(r,-12,22));
      x.beginPath(); x.arc(tx+(r()-0.5)*tr,ty+(r()-0.5)*tr,tr*0.55,0,6.29); x.fill();
    }
  }
  // ladder + board
  x.strokeStyle='#f2f2f2'; x.lineWidth=4;
  const lx=px0+pw*0.12;
  x.beginPath(); x.moveTo(lx,py0-12); x.lineTo(lx,py0+34); x.moveTo(lx+18,py0-12); x.lineTo(lx+18,py0+34); x.stroke();
  if(kind!=='lap'&&kind!=='round'&&r()<0.5){
    x.fillStyle='#f2f2f2';
    x.fillRect(px0+pw*0.45,py0+ph+4,30,80);
  }
  // furniture
  const UC=['#d61a3c','#ffd514','#0f8a3c','#ff2bd1','#1d4fb8','#ff7a2b'];
  const nu=rint(r,0,3);
  for(let i=0;i<nu;i++){
    const ux=W*(0.08+r()*0.84), uy=H*(0.08+r()*0.84);
    const uc=pick(UC,r);
    x.fillStyle='rgba(0,0,30,0.25)';
    x.beginPath(); x.ellipse(ux+shx,uy+shy,54,48,0,0,6.29); x.fill();
    for(let k=0;k<8;k++){
      x.fillStyle= k%2? uc : '#fff';
      x.beginPath(); x.moveTo(ux,uy);
      x.arc(ux,uy,52,k*0.785,(k+1)*0.785); x.closePath(); x.fill();
    }
    x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=2;
    x.beginPath(); x.arc(ux,uy,52,0,6.29); x.stroke();
  }
  const nl=rint(r,0,5);
  for(let i=0;i<nl;i++){
    const ly=H*(0.06+r()*0.86), lx2=W*(0.06+r()*0.86);
    const lc=pick(UC,r);
    x.fillStyle='rgba(0,0,30,0.22)';
    x.fillRect(lx2+shx*0.6,ly+shy*0.6,42,100);
    x.fillStyle=lc; x.fillRect(lx2,ly,42,100);
    x.fillStyle='rgba(255,255,255,0.5)'; x.fillRect(lx2,ly,42,24);
    x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=2; x.strokeRect(lx2,ly,42,100);
  }
}

/* LOUD ON CHEAP PAPER — full print shop: bayer, dots, lines, diagonal screens */
function castPoolside(seed){
  const r=rng(seed);
  r(); // fmt
  const base=pick(['lawn','deck','deck','lawn'],r);
  r(); r(); // decorrelation burns after seed-math deck
  const wi=Math.floor(r()*5); // water
  r(); // shA
  r(); // mow stripe width / tile pitch
  r(); r(); r(); r(); // ps, ph factor, px0, py0
  const kind=pick(['rect','kidney','ell','lap','round'],r);
  return {base,wi,kind};
}

/* ── Nobody's Swimming ──────────────────────────────────────────────────── */
const WATER = ['Lake', 'Tide', 'Sky', 'Deep', 'Teal'];
const POOL: Record<string, string> = {
  rect: 'Rectangle', kidney: 'Kidney', ell: 'L-Shape', lap: 'Lap', round: 'Round',
};
export const swimmingTraits: TraitsFn = (id) => {
  const c = castPoolside(id);
  return { Ground: cap(c.base), Water: WATER[c.wi], Pool: POOL[c.kind] };
};
export const swimmingSchema: TraitSchema = {
  traits: [
    { name: 'Ground', values: ['Lawn', 'Deck'] },
    { name: 'Water', values: WATER },
    { name: 'Pool', values: ['Rectangle', 'Kidney', 'L-Shape', 'Lap', 'Round'],
      subtraits: [
        { name: 'Straight', values: ['Rectangle', 'L-Shape', 'Lap'] },
        { name: 'Curved', values: ['Kidney', 'Round'] },
      ] },
  ],
};
export const renderSwimming = blit(poolside, swimmingTraits);
export const SWIMMING_ASPECTS = [0.81, 1.24, 1] as const;
