// @ts-nocheck
/*
 * Noise From Below — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, paperNoise, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* 8. CORE — strata, classic paper or UV mineral log */
function core(cv,seed){
  const r=rng(seed);
  const two=r()<0.35;
  const W=two?880:560, H=1400;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const uv=r()<0.45;
  const paper= uv?'#0d1016':'#f3eee0', inkc= uv?'#cfe8ff':'#33302a';
  x.fillStyle=paper; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H, uv?'180,220,255':'90,70,40',700);
  const LITHS= uv?[
    {n:'MALACHITE',c:'#1fb874',t:'dots'},
    {n:'AZURITE',c:'#2b6bd8',t:'dash'},
    {n:'SULFUR',c:'#ffd514',t:'brick'},
    {n:'COAL',c:'#15151c',t:'solid'},
    {n:'CINNABAR',c:'#e03224',t:'diag'},
    {n:'FLUORITE',c:'#9a4be0',t:'pebble'},
    {n:'OPALINE',c:'#36c8c0',t:'x'},
  ]:[
    {n:'SANDSTONE',c:'#e8c878',t:'dots'},
    {n:'SHALE',c:'#8aa4b8',t:'dash'},
    {n:'LIMESTONE',c:'#d8d0b0',t:'brick'},
    {n:'COAL',c:'#2e2b28',t:'solid'},
    {n:'RED CLAY',c:'#d4734a',t:'diag'},
    {n:'GRAVEL',c:'#c2b9a4',t:'pebble'},
    {n:'ASH',c:'#b9b3a8',t:'x'},
  ];
  function drawCol(cx0,cw,colSeed){
    const rr=rng(colSeed);
    const cy0=130, ch=H-280;
    const layers=[]; let acc=0;
    const nl=rint(rr,9,15);
    for(let i=0;i<nl;i++){layers.push({h:6+Math.pow(rr(),1.6)*150,l:pick(LITHS,rr)});acc+=layers[layers.length-1].h;}
    layers.forEach(l=>l.h=l.h/acc*ch);
    const faulted=rr()<0.4, faultY=cy0+ch*(0.3+rr()*0.4), faultOff=18+rr()*26;
    function sx(yy){return faulted&&yy>faultY?faultOff:0;}
    let y=cy0;
    layers.forEach((l)=>{
      const y1=y, y2=y+l.h, s1=sx(y1+1), s2=sx(y2-1);
      x.fillStyle=l.l.c;
      x.beginPath();
      x.moveTo(cx0+s1,y1);x.lineTo(cx0+cw+s1,y1);
      x.lineTo(cx0+cw+s2,y2);x.lineTo(cx0+s2,y2);x.closePath();x.fill();
      x.save();x.beginPath();
      x.moveTo(cx0+s1,y1);x.lineTo(cx0+cw+s1,y1);x.lineTo(cx0+cw+s2,y2);x.lineTo(cx0+s2,y2);x.closePath();x.clip();
      const tex= uv?'rgba(10,12,18,0.5)':'rgba(40,35,25,0.5)';
      x.strokeStyle=tex; x.fillStyle=tex; x.lineWidth=0.8;
      const s=(y1+y2)/2>faultY&&faulted?faultOff:0;
      if(l.l.t==='dots'){for(let i=0;i<l.h*cw/110;i++){x.fillRect(cx0+s+rr()*cw,y1+rr()*l.h,1.6,1.6);}}
      if(l.l.t==='dash'){for(let yy=y1+5;yy<y2;yy+=9){for(let bx=cx0+s+6+(yy%18);bx<cx0+s+cw-12;bx+=26){x.beginPath();x.moveTo(bx,yy);x.lineTo(bx+14,yy);x.stroke();}}}
      if(l.l.t==='brick'){for(let yy=y1;yy<y2;yy+=14){x.beginPath();x.moveTo(cx0+s,yy);x.lineTo(cx0+s+cw,yy);x.stroke();for(let bx=cx0+s+((yy/14)%2)*30;bx<cx0+s+cw;bx+=60){x.beginPath();x.moveTo(bx,yy);x.lineTo(bx,Math.min(yy+14,y2));x.stroke();}}}
      if(l.l.t==='diag'){for(let bx=cx0+s-l.h;bx<cx0+s+cw;bx+=12){x.beginPath();x.moveTo(bx,y2);x.lineTo(bx+l.h,y1);x.stroke();}}
      if(l.l.t==='pebble'){for(let i=0;i<l.h*cw/700;i++){x.beginPath();x.arc(cx0+s+6+rr()*(cw-12),y1+4+rr()*(l.h-8),2+rr()*3.5,0,6.29);x.stroke();}}
      if(l.l.t==='x'){for(let i=0;i<l.h*cw/600;i++){const ax=cx0+s+6+rr()*(cw-12),ay=y1+4+rr()*(l.h-8);x.beginPath();x.moveTo(ax-3,ay-3);x.lineTo(ax+3,ay+3);x.moveTo(ax-3,ay+3);x.lineTo(ax+3,ay-3);x.stroke();}}
      x.restore();
      x.strokeStyle=inkc; x.lineWidth=1.1;
      x.beginPath();
      for(let bx=0;bx<=cw;bx+=8){
        const yy=y2+Math.sin(bx*0.08+y2)*2.2;
        bx===0?x.moveTo(cx0+sx(y2-1)+bx,yy):x.lineTo(cx0+sx(y2-1)+bx,yy);
      }
      x.stroke();
      y=y2;
    });
    if(faulted){
      x.strokeStyle=inkc;x.lineWidth=2;
      x.beginPath();x.moveTo(cx0-8,faultY-10);x.lineTo(cx0+cw+faultOff+8,faultY+12);x.stroke();
    }
    x.strokeStyle=inkc; x.lineWidth=2;
    x.strokeRect(cx0,cy0,cw,ch);
    return layers;
  }
  const cy0=130, ch=H-280;
  const cw= two?200:240;
  const cx0= two?150:170;
  const layers=drawCol(cx0,cw,seed*3+1);
  if(two) drawCol(cx0+cw+120,cw,seed*3+2);
  x.strokeStyle=inkc; x.fillStyle=inkc;
  x.lineWidth=1; x.font='15px "Courier New",monospace'; x.textAlign='right';
  x.beginPath();x.moveTo(cx0-26,cy0);x.lineTo(cx0-26,cy0+ch);x.stroke();
  const d0=rint(r,80,900), tickM=12;
  for(let g=0;g<=10;g++){
    const yy=cy0+ch*g/10;
    x.beginPath();x.moveTo(cx0-34,yy);x.lineTo(cx0-26,yy);x.stroke();
    x.fillText((d0+g*tickM).toFixed(0),cx0-42,yy+5);
  }
  if(!two){
    x.textAlign='left'; x.font='15px "Courier New",monospace';
    let yy=cy0;
    layers.forEach(l=>{
      if(l.h>52){
        x.beginPath();x.moveTo(cx0+cw+6,yy+l.h/2);x.lineTo(cx0+cw+58,yy+l.h/2);x.stroke();
        x.fillText(l.l.n,cx0+cw+64,yy+l.h/2+5);
      }
      yy+=l.h;
    });
  }
  x.textAlign='center'; x.font='24px "Courier New",monospace';
  x.fillText('BOREHOLE '+String.fromCharCode(65+rint(r,0,25))+String.fromCharCode(65+rint(r,0,25))+'-'+rint(r,1,99).toString().padStart(2,'0'),W/2,64);
  x.font='15px "Courier New",monospace';
  x.fillText('SHEET '+rint(r,1,9)+'/'+rint(r,9,24)+' · DRILLED '+rint(r,1902,2041),W/2,92);

}
/* ============ 10 new colour-forward projects ============ */

/* 9. STAMP — postage of imaginary nations */
function castCore(seed){
  const r=rng(seed);
  const two=r()<0.35;
  const uv=r()<0.45;
  return {two,uv};
}

/* ── Noise From Below ───────────────────────────────────────────────────── */
export const belowTraits: TraitsFn = (id) => {
  const c = castCore(id);
  return { Columns: c.two ? 'Twin' : 'Single', Lamp: c.uv ? 'UV' : 'Field' };
};
export const belowSchema: TraitSchema = {
  traits: [
    { name: 'Columns', values: ['Single', 'Twin'] },
    { name: 'Lamp', values: ['Field', 'UV'] },
  ],
};
export const renderBelow = blit(core, belowTraits);
export const BELOW_ASPECTS = [0.4, 0.63] as const;
