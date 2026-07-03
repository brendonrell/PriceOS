// @ts-nocheck
/*
 * Letters Never Sent — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, paperNoise, star, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* ============ 10 new colour-forward projects ============ */

/* 9. STAMP — postage of imaginary nations */
function stamp(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:760,H:920},{W:920,H:760},{W:840,H:840}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const album=pick(['#1c2440','#1c1c24','#10221c'],r);
  x.fillStyle=album; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H,'255,240,200',500);
  const field=pick(['#d61a3c','#1d4fb8','#0f8a3c','#ff7a2b','#7a00cc','#d61a8c','#ffaa00','#008f8f'],r);
  const inkc=pick(['#fff8e8','#14141c'],r);
  const M=90;
  const sx0=M, sy0=M, sw=W-2*M, sh=H-2*M;
  // perforated white blank
  x.fillStyle='#f4f0e2';
  x.fillRect(sx0,sy0,sw,sh);
  x.fillStyle=album;
  const per=pick([18,22,28],r);
  for(let t=sx0+per/2;t<sx0+sw;t+=per){
    x.beginPath();x.arc(t,sy0,7,0,6.29);x.fill();
    x.beginPath();x.arc(t,sy0+sh,7,0,6.29);x.fill();
  }
  for(let t=sy0+per/2;t<sy0+sh;t+=per){
    x.beginPath();x.arc(sx0,t,7,0,6.29);x.fill();
    x.beginPath();x.arc(sx0+sw,t,7,0,6.29);x.fill();
  }
  // colour field
  const m2=26;
  x.fillStyle=field; x.fillRect(sx0+m2,sy0+m2,sw-2*m2,sh-2*m2);
  // engraving shading lines across field
  x.strokeStyle='rgba(0,0,0,0.18)'; x.lineWidth=1;
  for(let yy=sy0+m2+4;yy<sy0+sh-m2;yy+=4){x.beginPath();x.moveTo(sx0+m2,yy);x.lineTo(sx0+sw-m2,yy);x.stroke();}
  // inner frame — house styles vary
  const fr=pick(['double','thick','dash'],r);
  x.strokeStyle=inkc;
  if(fr==='double'){
    x.lineWidth=3; x.strokeRect(sx0+m2+10,sy0+m2+10,sw-2*m2-20,sh-2*m2-20);
    x.lineWidth=1; x.strokeRect(sx0+m2+16,sy0+m2+16,sw-2*m2-32,sh-2*m2-32);
  } else if(fr==='thick'){
    x.lineWidth=8; x.strokeRect(sx0+m2+14,sy0+m2+14,sw-2*m2-28,sh-2*m2-28);
  } else {
    x.lineWidth=2.4; x.setLineDash([12,8]);
    x.strokeRect(sx0+m2+12,sy0+m2+12,sw-2*m2-24,sh-2*m2-24); x.setLineDash([]);
  }
  // vignette
  const ccx=W/2, ccy=H/2+6;
  const motif=pick(['peak','ship','beacon','bird','cog','wave','star2','tree'],r);
  x.strokeStyle=inkc; x.fillStyle=inkc; x.lineWidth=2.4;
  if(motif==='peak'){
    x.beginPath();x.moveTo(ccx-130,ccy+80);x.lineTo(ccx-30,ccy-90);x.lineTo(ccx+20,ccy-10);x.lineTo(ccx+60,ccy-60);x.lineTo(ccx+140,ccy+80);x.closePath();x.stroke();
    x.beginPath();x.moveTo(ccx-52,ccy-52);x.lineTo(ccx-30,ccy-90);x.lineTo(ccx-6,ccy-50);x.lineTo(ccx-20,ccy-38);x.closePath();x.fill();
    x.beginPath();x.arc(ccx+90,ccy-80,26,0,6.29);x.stroke();
    for(let i=0;i<12;i++){const a=i/12*6.283;x.beginPath();x.moveTo(ccx+90+Math.cos(a)*32,ccy-80+Math.sin(a)*32);x.lineTo(ccx+90+Math.cos(a)*44,ccy-80+Math.sin(a)*44);x.stroke();}
  } else if(motif==='ship'){
    x.beginPath();x.moveTo(ccx-110,ccy+40);x.lineTo(ccx+110,ccy+40);x.lineTo(ccx+78,ccy+78);x.lineTo(ccx-78,ccy+78);x.closePath();x.fill();
    x.beginPath();x.moveTo(ccx-20,ccy+38);x.lineTo(ccx-20,ccy-86);x.lineTo(ccx-88,ccy+30);x.closePath();x.stroke();
    x.beginPath();x.moveTo(ccx-8,ccy+38);x.lineTo(ccx-8,ccy-96);x.lineTo(ccx+86,ccy+26);x.closePath();x.stroke();
    for(let i=0;i<3;i++){x.beginPath();x.moveTo(ccx-130+i*8,ccy+58+i*8);x.lineTo(ccx+130-i*8,ccy+58+i*8);x.stroke();}
  } else if(motif==='beacon'){
    x.beginPath();x.moveTo(ccx-30,ccy+84);x.lineTo(ccx-18,ccy-60);x.lineTo(ccx+18,ccy-60);x.lineTo(ccx+30,ccy+84);x.closePath();x.stroke();
    for(let i=0;i<4;i++){x.beginPath();x.moveTo(ccx-27+i*2,ccy+50-i*30);x.lineTo(ccx+27-i*2,ccy+50-i*30);x.stroke();}
    x.strokeRect(ccx-14,ccy-86,28,26);
    x.beginPath();x.moveTo(ccx-22,ccy-73);x.lineTo(ccx-78,ccy-95);x.moveTo(ccx+22,ccy-73);x.lineTo(ccx+78,ccy-95);x.stroke();
    x.beginPath();x.moveTo(ccx-90,ccy+84);x.lineTo(ccx+90,ccy+84);x.stroke();
  } else if(motif==='bird'){
    x.beginPath();x.moveTo(ccx-100,ccy);x.quadraticCurveTo(ccx-40,ccy-90,ccx+6,ccy-18);x.quadraticCurveTo(ccx+50,ccy-80,ccx+104,ccy-50);x.quadraticCurveTo(ccx+60,ccy-30,ccx+40,ccy+10);x.quadraticCurveTo(ccx+10,ccy+60,ccx-40,ccy+50);x.quadraticCurveTo(ccx-80,ccy+40,ccx-100,ccy);x.closePath();x.stroke();
    x.beginPath();x.arc(ccx+18,ccy-4,4,0,6.29);x.fill();
  } else if(motif==='wave'){
    x.lineWidth=5;
    for(let i=0;i<3;i++){
      x.beginPath();
      x.moveTo(ccx-130,ccy-30+i*42);
      for(let t=0;t<=260;t+=10) x.lineTo(ccx-130+t,ccy-30+i*42+Math.sin(t/26+i)*14);
      x.stroke();
    }
    x.beginPath();x.arc(ccx+80,ccy-80,26,0,6.29);x.stroke();
  } else if(motif==='star2'){
    star(x,ccx,ccy-10,72,5);
    x.lineWidth=2;
    x.beginPath();x.arc(ccx,ccy-10,92,0,6.29);x.stroke();
  } else if(motif==='tree'){
    for(let i=0;i<3;i++){
      x.beginPath();
      x.moveTo(ccx-90+i*26,ccy+60-i*44); x.lineTo(ccx,ccy-110-i*8); x.lineTo(ccx+90-i*26,ccy+60-i*44);
      x.closePath(); x.stroke();
    }
    x.fillRect(ccx-9,ccy+60,18,30);
  } else {
    x.beginPath();x.arc(ccx,ccy,64,0,6.29);x.stroke();
    for(let i=0;i<10;i++){const a=i/10*6.283;
      x.beginPath();x.moveTo(ccx+Math.cos(a)*64,ccy+Math.sin(a)*64);x.lineTo(ccx+Math.cos(a)*86,ccy+Math.sin(a)*86);x.stroke();}
    x.beginPath();x.arc(ccx,ccy,30,0,6.29);x.stroke();
  }
  // country + value
  const nation=pick(['NIEBLA','SOUTH REACH','MERIDIA','VESPERTINE REPUBLIC','LACERTA','THE LESSER MOONS','PROVIDENCIA'],r);
  x.fillStyle=inkc; x.textAlign='center';
  x.font='bold 38px Georgia,serif';
  x.fillText(nation,W/2,sy0+m2+62);
  const val=pick([1,2,4,5,10,15,25,40,80],r);
  x.font='bold 64px Georgia,serif';
  x.fillText(val,sx0+m2+58,sy0+sh-m2-38);
  x.font='17px Georgia,serif';
  x.fillText(pick(['POSTAGE','CORREOS','POSTES','AIR MAIL'],r),W/2,sy0+sh-m2-36);
  // overprint sometimes
  if(r()<0.3){
    x.save(); x.translate(W/2,H/2); x.rotate(-0.3);
    x.font='bold 56px "Courier New",monospace';
    x.fillStyle='rgba(214,26,60,0.75)';
    x.fillText(pick(['SPECIMEN','1 FLORIN','VOID','OCCUPATION'],r),0,0);
    x.restore();
  }
}

/* 10. TRANSIT — metro maps of imaginary cities */
function castStamp(seed){
  const r=rng(seed);
  r(); // fmt pick
  r(); // album pick
  for(let i=0;i<500;i++){r();r();r();} // paperNoise burn
  const fi=Math.floor(r()*8); // field
  r(); // inkc
  r(); // per
  const fr=pick(['double','thick','dash'],r);
  const motif=pick(['peak','ship','beacon','bird','cog','wave','star2','tree'],r);
  return {fi,fr,motif};
}

/* ── Letters Never Sent ─────────────────────────────────────────────────── */
const FIELD = ['Crimson', 'Cobalt', 'Green', 'Orange', 'Violet', 'Magenta', 'Amber', 'Teal'];
const FRAME: Record<string, string> = { double: 'Double', thick: 'Bold', dash: 'Dashed' };
const STAMP_MOTIF: Record<string, string> = {
  peak: 'Peak', ship: 'Ship', beacon: 'Beacon', bird: 'Bird', cog: 'Cog', wave: 'Wave', star2: 'Star', tree: 'Pine',
};
export const lettersTraits: TraitsFn = (id) => {
  const c = castStamp(id);
  return { Field: FIELD[c.fi], Frame: FRAME[c.fr], Motif: STAMP_MOTIF[c.motif] };
};
export const lettersSchema: TraitSchema = {
  traits: [
    { name: 'Field', values: FIELD,
      subtraits: [
        { name: 'Warm', values: ['Crimson', 'Orange', 'Amber', 'Magenta'] },
        { name: 'Cool', values: ['Cobalt', 'Green', 'Violet', 'Teal'] },
      ] },
    { name: 'Frame', values: ['Double', 'Bold', 'Dashed'] },
    { name: 'Motif', values: ['Peak', 'Ship', 'Beacon', 'Bird', 'Cog', 'Wave', 'Star', 'Pine'],
      subtraits: [
        { name: 'Land', values: ['Peak', 'Pine', 'Cog'] },
        { name: 'Sea', values: ['Ship', 'Beacon', 'Wave'] },
        { name: 'Sky', values: ['Bird', 'Star'] },
      ] },
  ],
};
export const renderLetters = blit(stamp, lettersTraits);
export const LETTERS_ASPECTS = [0.83, 1.21, 1] as const;
