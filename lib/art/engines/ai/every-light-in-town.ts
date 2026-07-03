// @ts-nocheck
/*
 * Every Light In Town — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

function fitText(x,text,maxW,make,basePx){let px=basePx;x.font=make(px);const floor=Math.max(8,Math.round(basePx*0.55));while(px>floor&&x.measureText(text).width>maxW){px-=1;x.font=make(px);}return px;}
/* ============ the original 8, colour-cranked + higher variance ============ */

/* 3. PLAT — surveys with zoning washes + coloured papers */
/* FORTY-FIVE — "Every Light In Town" */
function fortyfive(cv,seed){
  const r=rng(seed);
  const mode=pick(['flat','flat','sleeve','crop','stack'],r);
  const fmt= mode==='sleeve'? {W:900,H:1100} : mode==='stack'? {W:1240,H:950} : {W:1000,H:1000};
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const BGS=['#7fd8c8','#2bb8e8','#ff7a2b','#1a1a22','#d61a8c','#0f8a3c','#ffd514','#10341c','#6a1428','#bcd8f0'];
  const bg=pick(BGS,r);
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  if(r()<0.35){ // halftone field
    x.fillStyle='rgba(0,0,0,0.13)';
    for(let yy=20;yy<H;yy+=34) for(let xx=20+((yy/34)%2)*17;xx<W;xx+=34){
      x.beginPath();x.arc(xx,yy,3.2,0,6.29);x.fill();}
  }
  const LABS=['#ffd514','#e0202e','#1d4fb8','#ff7a2b','#0f9a3c','#f2e2b8','#d61a8c'];
  const song=pick(['MIDNIGHT ON THE FLOOR','TELL YOUR SISTER','NO MORE WEATHER','KISS THE DIAL','THE LONG WAY ROUND','DON\'T COUNT THE CHANGE','EVERY LIGHT IN TOWN','SORRY I MISSED JUNE'],r);
  const artist=pick(['THE MERIDIANS','RAY FATHOM & THE CORES','THE SALT GARDEN FIVE','EDIE & THE OWLS','THE HONEST WEIGHTS','V. & THE VANISHING'],r);
  const brand=pick(['LYRIC','MERIDIAN','SALT CITY','PALE GATE','LONG NOW','MERCY'],r);
  function drawDisc(ccx,ccy,R,s2,withText){
    const dr=rng(s2);
    const vinyl=pick(['#16161a','#16161a','#16161a','#8c1420','#155a8c','#7a4b0f'],dr);
    x.fillStyle=vinyl;
    x.beginPath(); x.arc(ccx,ccy,R,0,6.29); x.fill();
    for(let g=0;g<26;g++){
      x.strokeStyle='rgba(255,255,255,'+(0.025+(g%5===0?0.02:0))+')';
      x.lineWidth=Math.max(1,R*0.0035);
      x.beginPath(); x.arc(ccx,ccy,R-R*0.035-g*R*0.0225,0,6.29); x.stroke();
    }
    x.save();
    x.beginPath(); x.arc(ccx,ccy,R,0,6.29); x.clip();
    const ang=dr()*6.28;
    x.strokeStyle='rgba(255,255,255,0.06)';
    for(let i=0;i<3;i++){
      x.lineWidth=(26-i*7)*R/400;
      x.beginPath(); x.arc(ccx,ccy,R*0.6,ang+i*0.05,ang+0.7-i*0.05); x.stroke();
      x.beginPath(); x.arc(ccx,ccy,R*0.6,ang+3.14+i*0.05,ang+3.84-i*0.05); x.stroke();
    }
    x.restore();
    let lab=pick(LABS,dr); while(lab===bg)lab=pick(['#e0202e','#1d4fb8'],dr);
    x.fillStyle=lab;
    x.beginPath(); x.arc(ccx,ccy,R*0.36,0,6.29); x.fill();
    x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=1.6;
    x.beginPath(); x.arc(ccx,ccy,R*0.36,0,6.29); x.stroke();
    if(withText){
      const dark=(lab==='#f2e2b8'||lab==='#ffd514');
      const tcol= dark?'#1c1410':'#fff8e8';
      const f=R/400;
      x.fillStyle=tcol; x.textAlign='center';
      x.font='bold '+Math.round(34*f)+'px Georgia,serif';
      x.fillText(brand,ccx,ccy-R*0.2);
      x.font=Math.round(13*f)+'px Georgia,serif';
      x.fillText('RECORDS',ccx,ccy-R*0.2+22*f);
      x.font='bold '+Math.round(24*f)+'px Georgia,serif';
      x.fillText('“'+song+'”',ccx,ccy+34*f);
      x.font='italic '+Math.round(19*f)+'px Georgia,serif';
      x.fillText(artist,ccx,ccy+66*f);
      x.font=Math.round(13*f)+'px "Courier New",monospace';
      x.textAlign='left'; x.fillText('45 RPM',ccx-R*0.3,ccy+R*0.27);
      x.textAlign='right'; x.fillText(pick(['SIDE A','SIDE B'],dr)+' · '+rint(dr,2,4)+':'+rint(dr,10,59),ccx+R*0.3,ccy+R*0.27);
    }
    x.fillStyle=bg;
    x.beginPath(); x.arc(ccx,ccy,R*0.033,0,6.29); x.fill();
    x.strokeStyle='rgba(0,0,0,0.4)'; x.lineWidth=2;
    x.beginPath(); x.arc(ccx,ccy,R*0.033,0,6.29); x.stroke();
  }
  if(mode==='flat'){
    drawDisc(W/2,H/2,400,seed*7+1,true);
  } else if(mode==='crop'){
    drawDisc(W*(0.3+r()*0.4),H*(0.3+r()*0.4),W*0.74,seed*7+1,true);
  } else if(mode==='stack'){
    drawDisc(W*0.26,H*0.42,300,seed*7+1,false);
    drawDisc(W*0.52,H*0.56,300,seed*7+2,false);
    drawDisc(W*0.76,H*0.4,300,seed*7+3,true);
  } else { // sleeve
    drawDisc(W/2,H*0.29,330,seed*7+1,false);
    const sx0=W*0.08, sy0=H*0.42, sw=W*0.84, sh=H*0.5;
    let sc1=pick(LABS,r); while(sc1===bg)sc1=pick(['#e0202e','#1d4fb8'],r);
    let sc2=pick(LABS,r); while(sc2===sc1)sc2=pick(['#ffd514','#f2e2b8','#1a1a22'],r);
    x.fillStyle=sc1; x.fillRect(sx0,sy0,sw,sh);
    const art=pick(['band','circle','bars'],r);
    x.fillStyle=sc2;
    if(art==='band'){
      x.beginPath();x.moveTo(sx0,sy0+sh*0.55);x.lineTo(sx0+sw,sy0+sh*0.25);
      x.lineTo(sx0+sw,sy0+sh*0.55);x.lineTo(sx0,sy0+sh*0.85);x.closePath();x.fill();
    } else if(art==='circle'){
      x.beginPath();x.arc(sx0+sw*0.72,sy0+sh*0.5,sh*0.3,0,6.29);x.fill();
    } else {
      for(let i=0;i<4;i++)x.fillRect(sx0+sw*0.1+i*sw*0.22,sy0+sh*0.12,sw*0.09,sh*0.76);
    }
    x.strokeStyle='rgba(0,0,0,0.4)'; x.lineWidth=4; x.strokeRect(sx0,sy0,sw,sh);
    const dark2=(sc1==='#f2e2b8'||sc1==='#ffd514');
    x.fillStyle= dark2?'#1c1410':'#fff8e8'; x.textAlign='left';
    const tx=sx0+38, tw=sw-76; // left+right inset: keep every line on the sleeve
    fitText(x,'“'+song+'”',tw,(p)=>'bold '+p+'px Georgia,serif',54);
    x.fillText('“'+song+'”',tx,sy0+92);
    fitText(x,artist,tw,(p)=>'italic '+p+'px Georgia,serif',28);
    x.fillText(artist,tx,sy0+138);
    fitText(x,brand+' RECORDS · 45 RPM',tw,(p)=>p+'px "Courier New",monospace',15);
    x.fillText(brand+' RECORDS · 45 RPM',tx,sy0+sh-32);
  }
  if(mode!=='crop'&&r()<0.4){
    x.fillStyle='#fff';
    x.save(); x.translate(W-110,110); x.rotate(0.2);
    x.fillRect(-54,-30,108,60);
    x.fillStyle='#d61a3c'; x.font='bold 28px Helvetica,Arial,sans-serif'; x.textAlign='center';
    x.fillText(pick(['49¢','99¢','2 FOR 1¢','AS IS'],r),0,10);
    x.restore();
  }
}
// Trait casts — replicate each engine's LEADING rng draws exactly (including
// deterministic burns), so traitsOf() agrees with render() without painting.
// Verified by harness: cast pick/rint sequence must prefix-match the engine's.
// Each cast returns raw picked params; label mapping happens at the registry.
function castFortyfive(seed){
  const r=rng(seed);
  const mode=pick(['flat','flat','sleeve','crop','stack'],r);
  const bi=Math.floor(r()*10);
  return {mode,bi};
}

/* ── Every Light In Town ────────────────────────────────────────────────── */
const CUT: Record<string, string> = { flat: 'Disc', sleeve: 'Sleeve', crop: 'Close-Up', stack: 'Stack' };
const BACKDROP = ['Aqua', 'Cyan', 'Orange', 'Charcoal', 'Magenta', 'Green', 'Gold', 'Pine', 'Wine', 'Sky'];
export const everyLightTraits: TraitsFn = (id) => {
  const c = castFortyfive(id);
  return { Cut: CUT[c.mode], Backdrop: BACKDROP[c.bi] };
};
export const everyLightSchema: TraitSchema = {
  traits: [
    { name: 'Cut', values: ['Disc', 'Sleeve', 'Close-Up', 'Stack'] },
    { name: 'Backdrop', values: BACKDROP,
      subtraits: [
        { name: 'Bright', values: ['Aqua', 'Cyan', 'Orange', 'Magenta', 'Gold', 'Sky'] },
        { name: 'Deep', values: ['Charcoal', 'Green', 'Pine', 'Wine'] },
      ] },
  ],
};
export const renderEveryLight = blit(fortyfive, everyLightTraits);
export const EVERYLIGHT_ASPECTS = [1, 0.82, 1.31] as const;
