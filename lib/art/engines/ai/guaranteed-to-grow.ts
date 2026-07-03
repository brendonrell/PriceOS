// @ts-nocheck
/*
 * Guaranteed To Grow — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, hash2, shade, paperNoise, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* 15. PACKET — seed packets, guaranteed to grow */
function packet(cv,seed){
  const r=rng(seed), W=840, H=1100;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  x.fillStyle='#1a1612'; x.fillRect(0,0,W,H);
  const sch=pick([
    {bg:'#ffaa00',pl:'#d61a3c',lf:'#0f8a3c',ink:'#2a1408'},
    {bg:'#2bb8e8',pl:'#ffd514',lf:'#0f6a3c',ink:'#0a1c2a'},
    {bg:'#e84e5e',pl:'#ffe9c8',lf:'#14501c',ink:'#2a0a10'},
    {bg:'#0f8a3c',pl:'#ff7a2b',lf:'#c8ff00',ink:'#0a2010'},
    {bg:'#bcd8f0',pl:'#c83264',lf:'#3a9c4a',ink:'#241810'},
    {bg:'#b8a8e8',pl:'#ffd514',lf:'#0f6a3c',ink:'#1c1024'},
    {bg:'#14141c',pl:'#ff7a2b',lf:'#c8ff00',ink:'#f2ead0'},
    {bg:'#7fd8c8',pl:'#d61a3c',lf:'#10501c',ink:'#0a2024'},
  ],r);
  const M=60;
  // packet with flap
  x.fillStyle=sch.bg;
  x.fillRect(M,M+40,W-2*M,H-2*M-40);
  x.fillStyle=shade(sch.bg,-22);
  x.beginPath(); x.moveTo(M,M+40); x.lineTo(W/2,M); x.lineTo(W-M,M+40); x.closePath(); x.fill();
  x.strokeStyle=sch.ink; x.lineWidth=2.4;
  x.strokeRect(M,M+40,W-2*M,H-2*M-40);
  x.beginPath(); x.moveTo(M,M+40); x.lineTo(W/2,M); x.lineTo(W-M,M+40); x.stroke();
  paperNoise(x,r,W,H,'60,40,20',500);
  const plant=pick(['radish','carrot','sunflower','tulip','tomato','peas','chili','beet','corn'],r);
  const ccx=W/2, ccy=H*0.52;
  x.lineWidth=4;
  if(plant==='radish'){
    x.fillStyle=sch.pl;
    x.beginPath();x.arc(ccx,ccy+30,120,0,6.29);x.fill();
    x.strokeStyle=sch.ink;x.beginPath();x.arc(ccx,ccy+30,120,0,6.29);x.stroke();
    x.strokeStyle=sch.ink; x.lineWidth=5;
    x.beginPath();x.moveTo(ccx,ccy+150);x.quadraticCurveTo(ccx+8,ccy+185,ccx-4,ccy+200);x.stroke();
    x.fillStyle=sch.lf; x.lineWidth=4;
    for(let i=-1;i<=1;i++){
      x.beginPath();x.moveTo(ccx,ccy-80);
      x.quadraticCurveTo(ccx+i*90,ccy-200,ccx+i*36,ccy-216);
      x.quadraticCurveTo(ccx+i*10-12,ccy-160,ccx-8,ccy-82);x.closePath();x.fill();
      x.strokeStyle=sch.ink;x.stroke();
    }
    x.fillStyle='rgba(255,255,255,0.35)';
    x.beginPath();x.arc(ccx-42,ccy-6,30,0,6.29);x.fill();
  } else if(plant==='carrot'){
    x.fillStyle=sch.pl;
    x.beginPath();x.moveTo(ccx-66,ccy-70);x.quadraticCurveTo(ccx,ccy-110,ccx+66,ccy-70);x.lineTo(ccx+8,ccy+190);x.quadraticCurveTo(ccx,ccy+205,ccx-8,ccy+190);x.closePath();x.fill();
    x.strokeStyle=sch.ink;x.stroke();
    x.lineWidth=3;
    for(let i=0;i<4;i++){const yy=ccy-20+i*52;
      x.beginPath();x.moveTo(ccx-52+i*7,yy);x.lineTo(ccx+52-i*7,yy);x.stroke();}
    x.fillStyle=sch.lf;x.lineWidth=4;
    for(let i=-1;i<=1;i++){
      x.beginPath();x.moveTo(ccx+i*16,ccy-92);
      x.quadraticCurveTo(ccx+i*110,ccy-190,ccx+i*60,ccy-230);
      x.quadraticCurveTo(ccx+i*16-10,ccy-170,ccx+i*4-8,ccy-94);x.closePath();x.fill();
      x.strokeStyle=sch.ink;x.stroke();
    }
  } else if(plant==='sunflower'){
    x.fillStyle=sch.pl;
    for(let i=0;i<16;i++){const a=i/16*6.283;
      x.beginPath();
      x.ellipse(ccx+Math.cos(a)*120,ccy+Math.sin(a)*120,52,22,a,0,6.29);
      x.fill();x.strokeStyle=sch.ink;x.lineWidth=2.6;x.stroke();}
    x.fillStyle=shade(sch.ink,30);
    x.beginPath();x.arc(ccx,ccy,86,0,6.29);x.fill();
    x.strokeStyle=sch.ink;x.lineWidth=4;x.stroke();
    x.fillStyle=sch.bg;
    for(let i=0;i<40;i++){const a=hash2(i,1)*6.283, rr=hash2(i,2)*70;
      x.fillRect(ccx+Math.cos(a)*rr-2,ccy+Math.sin(a)*rr-2,4,4);}
  } else if(plant==='tulip'){
    x.strokeStyle=sch.lf; x.lineWidth=10;
    x.beginPath();x.moveTo(ccx,ccy+20);x.quadraticCurveTo(ccx-10,ccy+140,ccx,ccy+210);x.stroke();
    x.fillStyle=sch.lf;
    x.beginPath();x.moveTo(ccx-4,ccy+120);x.quadraticCurveTo(ccx-130,ccy+90,ccx-150,ccy+190);x.quadraticCurveTo(ccx-60,ccy+200,ccx-4,ccy+150);x.closePath();x.fill();
    x.fillStyle=sch.pl; x.lineWidth=4;
    x.beginPath();
    x.moveTo(ccx-90,ccy-30);
    x.quadraticCurveTo(ccx-100,ccy-160,ccx-40,ccy-60);
    x.quadraticCurveTo(ccx,ccy-180,ccx+40,ccy-60);
    x.quadraticCurveTo(ccx+100,ccy-160,ccx+90,ccy-30);
    x.quadraticCurveTo(ccx+60,ccy+60,ccx,ccy+60);
    x.quadraticCurveTo(ccx-60,ccy+60,ccx-90,ccy-30);
    x.closePath(); x.fill();
    x.strokeStyle=sch.ink; x.stroke();
  } else if(plant==='tomato'){
    x.fillStyle=sch.pl;
    x.beginPath();x.arc(ccx,ccy+20,130,0,6.29);x.fill();
    x.strokeStyle=sch.ink;x.lineWidth=4;x.stroke();
    x.beginPath();x.arc(ccx-100,ccy-30,40,0,6.29);
    x.fillStyle='rgba(255,255,255,0.3)';x.fill();
    x.fillStyle=sch.lf;
    for(let i=0;i<6;i++){const a=i/6*6.283;
      x.beginPath();
      x.moveTo(ccx,ccy-104);
      x.quadraticCurveTo(ccx+Math.cos(a)*54,ccy-104+Math.sin(a)*22-14,ccx+Math.cos(a)*80,ccy-104+Math.sin(a)*30);
      x.quadraticCurveTo(ccx+Math.cos(a)*30,ccy-104+Math.sin(a)*12+8,ccx,ccy-96);
      x.closePath();x.fill();}
    x.strokeStyle=sch.ink;x.lineWidth=3;
    x.beginPath();x.moveTo(ccx,ccy-104);x.lineTo(ccx,ccy-150);x.stroke();
  } else if(plant==='chili'){
    x.fillStyle=sch.pl; x.strokeStyle=sch.ink; x.lineWidth=4;
    x.beginPath();
    x.moveTo(ccx-30,ccy-120);
    x.bezierCurveTo(ccx+150,ccy-110,ccx+130,ccy+150,ccx-60,ccy+180);
    x.bezierCurveTo(ccx+40,ccy+80,ccx+10,ccy-60,ccx-50,ccy-94);
    x.closePath(); x.fill(); x.stroke();
    x.strokeStyle=sch.lf; x.lineWidth=9;
    x.beginPath(); x.moveTo(ccx-40,ccy-105); x.quadraticCurveTo(ccx-70,ccy-160,ccx-30,ccy-190); x.stroke();
  } else if(plant==='beet'){
    x.fillStyle=sch.pl;
    x.beginPath(); x.moveTo(ccx-110,ccy-20);
    x.quadraticCurveTo(ccx,ccy-110,ccx+110,ccy-20);
    x.quadraticCurveTo(ccx+70,ccy+90,ccx+12,ccy+170);
    x.quadraticCurveTo(ccx-2,ccy+190,ccx-12,ccy+170);
    x.quadraticCurveTo(ccx-70,ccy+90,ccx-110,ccy-20);
    x.closePath(); x.fill();
    x.strokeStyle=sch.ink; x.lineWidth=4; x.stroke();
    x.fillStyle=sch.lf;
    for(let i=-1;i<=1;i++){
      x.beginPath(); x.moveTo(ccx+i*14,ccy-70);
      x.quadraticCurveTo(ccx+i*90,ccy-180,ccx+i*40,ccy-230);
      x.quadraticCurveTo(ccx+i*8-10,ccy-160,ccx-8,ccy-74); x.closePath(); x.fill();
      x.strokeStyle=sch.ink; x.stroke();
    }
  } else if(plant==='corn'){
    x.fillStyle=sch.pl;
    x.beginPath(); x.ellipse(ccx,ccy+10,86,170,0,0,6.29); x.fill();
    x.strokeStyle=sch.ink; x.lineWidth=4; x.stroke();
    x.strokeStyle=sch.ink; x.lineWidth=2.4;
    for(let i=-2;i<=2;i++){
      x.beginPath(); x.moveTo(ccx+i*30,ccy-156); x.quadraticCurveTo(ccx+i*36,ccy+10,ccx+i*30,ccy+176); x.stroke();
    }
    for(let j=-3;j<=3;j++){
      x.beginPath(); x.moveTo(ccx-82,ccy+10+j*44); x.quadraticCurveTo(ccx,ccy+22+j*44,ccx+82,ccy+10+j*44); x.stroke();
    }
    x.fillStyle=sch.lf;
    x.beginPath(); x.moveTo(ccx-70,ccy+150);
    x.quadraticCurveTo(ccx-160,ccy+40,ccx-90,ccy-140);
    x.quadraticCurveTo(ccx-110,ccy+40,ccx-40,ccy+160); x.closePath(); x.fill();
    x.strokeStyle=sch.ink; x.stroke();
    x.beginPath(); x.moveTo(ccx+70,ccy+150);
    x.quadraticCurveTo(ccx+160,ccy+40,ccx+90,ccy-140);
    x.quadraticCurveTo(ccx+110,ccy+40,ccx+40,ccy+160); x.closePath(); x.fill(); x.stroke();
  } else { // peas
    x.fillStyle=sch.lf; x.strokeStyle=sch.ink; x.lineWidth=4;
    x.beginPath();
    x.moveTo(ccx-140,ccy-60);
    x.quadraticCurveTo(ccx,ccy-160,ccx+150,ccy-40);
    x.quadraticCurveTo(ccx+10,ccy+30,ccx-140,ccy-60);
    x.closePath();x.fill();x.stroke();
    x.fillStyle=sch.pl;
    for(let i=0;i<5;i++){
      x.beginPath();x.arc(ccx-80+i*46,ccy-58+Math.sin(i)*16,26,0,6.29);x.fill();
      x.strokeStyle=sch.ink;x.lineWidth=2.6;x.stroke();
    }
    x.strokeStyle=sch.lf;x.lineWidth=5;
    x.beginPath();x.moveTo(ccx+150,ccy-40);x.quadraticCurveTo(ccx+190,ccy+40,ccx+150,ccy+120);x.stroke();
  }
  // type — name follows the plant actually drawn
  const NAME_BY_PLANT={
    radish:['CRIMSON RADISH','WINTERFIELD RADISH'],
    carrot:['MAMMOTH CARROT','TELEGRAPH CARROT'],
    sunflower:['MOONRISE SUNFLOWER','GIANT SUNFLOWER'],
    tulip:['MOONRISE TULIP','VESPER TULIP'],
    tomato:['HONEST TOMATO','PROVIDENCE TOMATO'],
    peas:['TELEGRAPH PEAS','HALCYON PEAS'],
    chili:['VOLCANO CHILI','RED SEMAPHORE CHILI'],
    beet:['WINTERFIELD BEET','DEEP MERIDIAN BEET'],
    corn:['GOLDEN HOUR CORN','PROVIDENCE CORN'],
  };
  const name=pick(NAME_BY_PLANT[plant],r);
  x.fillStyle=sch.ink; x.textAlign='center';
  x.font='bold 30px Georgia,serif';
  x.fillText(pick(['GIANT','EARLIEST OF ALL','PRIZE','IMPROVED','TRIUMPH'],r),W/2,M+118);
  x.font='bold 52px Georgia,serif';
  x.fillText(name.split(' ')[0],W/2,M+182);
  x.fillText(name.split(' ').slice(1).join(' ')||'STRAIN',W/2,M+240);
  x.font='italic 21px Georgia,serif'; x.fillStyle=sch.ink; x.textAlign='center';
  x.fillText('GUARANTEED TO GROW · PACKED FOR '+rint(r,1948,2044),W/2,H-M-66);
  // price circle
  x.fillStyle=sch.pl===sch.ink?sch.lf:sch.pl;
  x.beginPath();x.arc(W-M-78,M+118,52,0,6.29);x.fill();
  x.strokeStyle=sch.ink;x.lineWidth=3;x.stroke();
  x.fillStyle=sch.ink==='#2a1408'&&sch.pl==='#d61a3c'?'#fff':sch.ink;
  x.fillStyle='#fff';
  x.font='bold 30px Georgia,serif';
  x.fillText(rint(r,5,25)+'¢',W-M-78,M+128);
}

/* ============ round three (recomposed): masks, pools, kits ============ */

/* ============ round four: abstract systems ============ */
function castPacket(seed){
  const r=rng(seed);
  const si=Math.floor(r()*8);
  for(let i=0;i<500;i++){r();r();r();} // paperNoise burn
  const plant=pick(['radish','carrot','sunflower','tulip','tomato','peas','chili','beet','corn'],r);
  return {si,plant};
}

/* ── Guaranteed To Grow ─────────────────────────────────────────────────── */
const PK_SCHEME = ['Amber', 'Sky', 'Coral', 'Green', 'Powder', 'Lavender', 'Night', 'Aqua'];
export const growTraits: TraitsFn = (id) => {
  const c = castPacket(id);
  return { Plant: cap(c.plant), Scheme: PK_SCHEME[c.si] };
};
export const growSchema: TraitSchema = {
  traits: [
    { name: 'Plant', values: ['Radish', 'Carrot', 'Sunflower', 'Tulip', 'Tomato', 'Peas', 'Chili', 'Beet', 'Corn'],
      subtraits: [
        { name: 'Root', values: ['Radish', 'Carrot', 'Beet'] },
        { name: 'Vine', values: ['Tomato', 'Peas', 'Chili'] },
        { name: 'Bloom', values: ['Sunflower', 'Tulip', 'Corn'] },
      ] },
    { name: 'Scheme', values: PK_SCHEME },
  ],
};
export const renderGrow = blit(packet, growTraits);
export const GROW_ASPECTS = [0.76] as const;
