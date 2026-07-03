// @ts-nocheck
/*
 * Crossette — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, hash2, shade, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* PYRO — "Use Once, Remember Always" */
function pyro(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:900},{W:1050,H:1050},{W:700,H:1280},{W:1500,H:700}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const bg=pick(['#070310','#0a0618','#020a12','#10020a','#020614'],r);
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  x.fillStyle='#fff';
  for(let i=0;i<70;i++){x.globalAlpha=0.1+r()*0.3;x.fillRect(r()*W,r()*H*0.6,1.4,1.4);}
  x.globalAlpha=1;
  const ground=pick(['hills','city','water','none'],r);
  const label=pick(['tag','none','none','none','none'],r);
  const hy= ground==='water'? H*0.72 : H-160;
  const COLS=['#ffd514','#ff2b6e','#00e5c0','#ff7a2b','#7fd4ff','#c8ff00','#ff2bd1','#fff3c8'];
  const nb=rint(r,1,W>1400?5:3);
  const brs=[];
  for(let b=0;b<nb;b++){
    brs.push({
      bx:W*(nb===1?0.35+r()*0.3:0.18+b*0.6/(nb-1)+r()*0.08),
      by:(ground==='water'?hy:H)*(0.2+r()*0.28),
      R:(nb===1?250:150)+r()*60,
      c1:pick(COLS,r), c2:pick(COLS,r),
      kind:pick(['PEONY','CHRYSANTHEMUM','WILLOW','RING','CROSSETTE'],r),
      s2:Math.floor(r()*1e9),
    });
  }
  function drawBurst(b){
    const br2=rng(b.s2);
    const {bx,by,R,c1,c2,kind}=b;
    x.strokeStyle='rgba(255,240,200,0.5)'; x.lineWidth=2; x.setLineDash([4,9]);
    x.beginPath(); x.moveTo(bx+(br2()-0.5)*60,hy-10); x.quadraticCurveTo(bx-20,by+R,bx,by); x.stroke();
    x.setLineDash([]);
    function glowLine(x1,y1,x2,y2,col){
      x.strokeStyle=col; x.globalAlpha*=0.22; x.lineWidth=7;
      x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke();
      x.globalAlpha/=0.22; x.lineWidth=1.8;
      x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke();
    }
    if(kind==='RING'){
      x.strokeStyle=c1; const ga=x.globalAlpha; x.globalAlpha=ga*0.25; x.lineWidth=10;
      x.beginPath();x.arc(bx,by,R*0.8,0,6.29);x.stroke();
      x.globalAlpha=ga;
      for(let i=0;i<40;i++){const a=i/40*6.283;
        x.fillStyle= i%2?c1:c2;
        x.beginPath();x.arc(bx+Math.cos(a)*R*0.8,by+Math.sin(a)*R*0.8,3.4,0,6.29);x.fill();}
    } else {
      const rays=rint(br2,26,46);
      for(let i=0;i<rays;i++){
        const a=i/rays*6.283+br2()*0.05;
        const len=R*(0.75+br2()*0.3);
        const col= i%3===0?c2:c1;
        if(kind==='WILLOW'){
          x.strokeStyle=col; x.lineWidth=1.8;
          x.beginPath(); x.moveTo(bx,by);
          x.quadraticCurveTo(bx+Math.cos(a)*len*0.7,by+Math.sin(a)*len*0.7,
            bx+Math.cos(a)*len*0.9,by+Math.sin(a)*len*0.5+len*0.55);
          x.stroke();
        } else {
          glowLine(bx,by,bx+Math.cos(a)*len,by+Math.sin(a)*len,col);
          x.fillStyle=col;
          x.beginPath();x.arc(bx+Math.cos(a)*len,by+Math.sin(a)*len,kind==='CHRYSANTHEMUM'?2:3.2,0,6.29);x.fill();
          if(kind==='CROSSETTE'&&i%4===0){
            for(let k=0;k<4;k++){const aa=a+k*1.57+0.78;
              glowLine(bx+Math.cos(a)*len,by+Math.sin(a)*len,
                bx+Math.cos(a)*len+Math.cos(aa)*26,by+Math.sin(a)*len+Math.sin(aa)*26,c2);}
          }
        }
      }
      x.fillStyle=c1; const ga=x.globalAlpha; x.globalAlpha=ga*0.4;
      x.beginPath();x.arc(bx,by,16,0,6.29);x.fill();x.globalAlpha=ga;
      x.fillStyle='#fff';x.beginPath();x.arc(bx,by,5,0,6.29);x.fill();
    }
  }
  brs.forEach(drawBurst);
  if(ground==='water'){
    x.fillStyle=shade(bg,8);
    x.fillRect(0,hy,W,H-hy);
    x.save();
    x.beginPath(); x.rect(0,hy,W,H-hy); x.clip();
    x.translate(0,2*hy); x.scale(1,-1);
    x.globalAlpha=0.22;
    brs.forEach(drawBurst);
    x.globalAlpha=1;
    x.restore();
    x.strokeStyle='rgba(255,255,255,0.12)'; x.lineWidth=1.6;
    for(let i=0;i<8;i++){const yy=hy+12+i*((H-hy-30)/8);
      x.beginPath();x.moveTo(W*r()*0.3,yy);x.lineTo(W-W*r()*0.3,yy);x.stroke();}
  } else if(ground==='city'){
    x.fillStyle='#000';
    for(let t=0;t<W;t+=rint(r,50,110)){
      const hh=rint(r,30,110), bw2=rint(r,34,80);
      x.fillRect(t,H-120-hh,bw2,hh+120);
      x.fillStyle='#ffd96b';
      for(let wy2=H-100-hh;wy2<H-40;wy2+=18) for(let wx2=t+6;wx2<t+bw2-6;wx2+=14)
        if(hash2(wx2,wy2)<0.3) x.fillRect(wx2,wy2,4,6);
      x.fillStyle='#000';
    }
  } else if(ground==='hills'){
    x.fillStyle='#000';
    x.beginPath(); x.moveTo(0,H-160);
    for(let t=0;t<=W;t+=80) x.lineTo(t,H-160-hash2(t,seed%97)*40);
    x.lineTo(W,H); x.lineTo(0,H); x.closePath(); x.fill();
  }
  if(label!=='none'){
    x.strokeStyle='#e8dfc0'; x.lineWidth=2.4; x.strokeRect(36,36,W-72,H-72);
    x.lineWidth=0.8; x.strokeRect(44,44,W-88,H-88);
  }
  const no=rint(r,3,88);
  const title='No. '+no+' — '+pick(['GOLDEN','SILVER','CRIMSON','EMERALD','PHANTOM','ROYAL'],r)+' '+brs[0].kind+' · '+rint(r,2,6)+'″ SHELL';
  if(label==='plate'){
    x.fillStyle='#0c0a14'; x.fillRect(60,H-112,W-120,52);
    x.strokeStyle='#e8dfc0'; x.lineWidth=1.4; x.strokeRect(60,H-112,W-120,52);
    x.fillStyle='#f2ead0'; x.textAlign='center';
    x.font='22px Georgia,serif';
    x.fillText(title,W/2,H-78);
  } else if(label==='tag'){
    x.fillStyle='#f2ead0'; x.textAlign='left';
    x.font='18px Georgia,serif';
    x.fillText(title,64,84);
  }
}

/* PENNANT — "Wait Till Next Year" */
function castPyro(seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:900},{W:1050,H:1050},{W:700,H:1280},{W:1500,H:700}],r);
  r(); // bg
  for(let i=0;i<70;i++){r();r();r();} // star burn
  const ground=pick(['hills','city','water','none'],r);
  pick(['tag','none','none','none','none'],r); // label
  const nb=rint(r,1,fmt.W>1400?5:3);
  return {fmt,ground,nb};
}

/* ── Crossette ──────────────────────────────────────────────────────────── */
const PYRO_FMT: Record<number, string> = { 1000: 'Plate', 1240: 'Wide', 1050: 'Square', 700: 'Tall', 1500: 'Panorama' };
const GROUND: Record<string, string> = { hills: 'Hills', city: 'City', water: 'Water', none: 'Open Sky' };
export const crossetteTraits: TraitsFn = (id) => {
  const c = castPyro(id);
  return { Format: PYRO_FMT[c.fmt.W], Ground: GROUND[c.ground], Shells: String(c.nb) };
};
export const crossetteSchema: TraitSchema = {
  traits: [
    { name: 'Format', values: ['Plate', 'Wide', 'Square', 'Tall', 'Panorama'],
      subtraits: [
        { name: 'Upright', values: ['Plate', 'Square', 'Tall'] },
        { name: 'Broad', values: ['Wide', 'Panorama'] },
      ] },
    { name: 'Ground', values: ['Hills', 'City', 'Water', 'Open Sky'] },
    { name: 'Shells', values: ['1', '2', '3', '4', '5'] },
  ],
};
export const renderCrossette = blit(pyro, crossetteTraits);
export const CROSSETTE_ASPECTS = [0.81, 1.38, 1, 0.55, 2.14] as const;
