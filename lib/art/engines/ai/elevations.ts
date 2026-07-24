// @ts-nocheck
/*
 * Elevations — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shade, paperNoise, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

function facade(cv,seed){
  const r=rng(seed);
  const bays=rint(r,3,8), floors=rint(r,4,11);
  const rare= r()<0.04;
  const mode= rare ? ['day','dusk','night'][Math.floor(r()*3)] : (r()<0.5?'ink':'blueprint');
  const style=pick(['2pane','arch','grid4','strip','ribbon','oriel'],r);
  const roof=pick(['tank','antenna','bulkhead','parapet','skylight'],r);
  // —— end trait draws; everything below draws freely ——
  const draft= mode==='ink'||mode==='blueprint';
  const blue= mode==='blueprint';
  const bayW=118, flH=92;
  const Mx= blue?176:120, Mtop= draft?150:120, Mbot= blue?252:150;
  const BW=bays*bayW, BH=floors*flH;
  const W=BW+2*Mx, H=BH+Mtop+Mbot;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sky= mode==='ink'?'#f7f4ec'
           : blue?'#15355c'
           : mode==='day'?pick(['#6ecbe8','#8fd8f0','#3aa8d8'],r)
           : mode==='dusk'?pick(['#ff9a3d','#ff6e50','#e8a83a'],r)
           : pick(['#141a4d','#1a0f3a','#0c1430'],r);
  const body=pick(['#d96a3b','#e0a818','#1f8a8a','#e84e5e','#2b4bd8','#8a2bb8','#c83264','#3a9c4a'],r);
  const inkc= blue?'#dfe9f5': mode==='night'?'#0a0a14': mode==='ink'?'#2b2b33':'#22222e';
  const grid= blue?'rgba(150,195,240,0.15)':'rgba(120,100,70,0.10)';
  const accent= blue?'#7fd4ff':'#b8452e';
  const lit='#ffd96b';
  x.fillStyle=sky; x.fillRect(0,0,W,H);
  const gx=Mx, gy=Mtop;
  // ---- background per mode ----
  if(draft){
    paperNoise(x,r,W,H, blue?'180,210,245':'60,60,80',600);
    x.strokeStyle=grid; x.lineWidth=1;
    for(let v=18;v<W-18;v+=46){x.beginPath();x.moveTo(v,18);x.lineTo(v,H-18);x.stroke();}
    for(let hh=18;hh<H-18;hh+=46){x.beginPath();x.moveTo(18,hh);x.lineTo(W-18,hh);x.stroke();}
    x.strokeStyle=inkc; x.lineWidth=2.4; x.strokeRect(16,16,W-32,H-32);
    x.lineWidth=1; x.strokeRect(24,24,W-48,H-48);
  } else if(mode==='night'){
    x.fillStyle='#fff';
    for(let i=0;i<90;i++){x.globalAlpha=0.3+r()*0.6;x.fillRect(r()*W,r()*(H-200),1.6,1.6);}
    x.globalAlpha=1;
    x.beginPath();x.arc(W*0.82,90,30,0,6.29);x.fillStyle='#fff3c8';x.fill();
  } else if(mode==='day'){
    x.fillStyle='#fff'; x.globalAlpha=0.85;
    for(let i=0;i<2;i++){const cxx=W*(0.2+r()*0.6),cyy=60+r()*70;
      for(let k=0;k<4;k++){x.beginPath();x.arc(cxx+k*26-40,cyy+(k%2)*8,20+((k*7)%12),0,6.29);x.fill();}}
    x.globalAlpha=1;
  } else {
    x.beginPath();x.arc(W*(0.2+r()*0.6),120,38,0,6.29);x.fillStyle='#fff0b8';x.fill();
  }
  // ---- blueprint column grid (behind building) ----
  if(blue){
    x.strokeStyle='rgba(150,195,240,0.28)'; x.lineWidth=1; x.setLineDash([3,6]);
    for(let b=0;b<=bays;b++){const cxg=gx+b*bayW;x.beginPath();x.moveTo(cxg,gy-40);x.lineTo(cxg,gy+BH+30);x.stroke();}
    x.setLineDash([]);
  }
  // ---- building body (coloured only) ----
  if(!draft){
    x.fillStyle= mode==='night'?shade(body,-70):body;
    x.fillRect(gx,gy,BW,BH);
    x.fillStyle='rgba(0,0,0,0.16)'; x.fillRect(gx+BW*0.72,gy,BW*0.28,BH);
  }
  x.strokeStyle=inkc; x.lineWidth=2.2; x.strokeRect(gx,gy,BW,BH); x.lineWidth=1;
  // cornice / string courses
  if(!draft) x.fillStyle= mode==='night'?shade(body,-50):shade(body,30);
  for(let i=1;i<=3;i++){
    if(!draft) x.fillRect(gx-6*i,gy-7*i,BW+12*i,7);
    x.strokeRect(gx-6*i,gy-7*i,BW+12*i,7);
  }
  // floor lines + a slim string course halfway up (added depth)
  for(let f=1;f<floors;f++){
    x.lineWidth= (f===Math.floor(floors/2))?1.6:0.8;
    x.beginPath();x.moveTo(gx,gy+f*flH);x.lineTo(gx+BW,gy+f*flH);x.stroke();
  }
  x.lineWidth=1;
  const doorBay=rint(r,0,bays-1);
  const oddF=rint(r,1,Math.max(1,floors-2)), oddB=rint(r,0,bays-1);
  const glass= mode==='night' ? null : (mode==='dusk'?'#7a3a4a':'#1d3a5e');
  // window painter shared by all draft + coloured modes
  function paneFill(){ return draft? null : (mode==='night' ? (Math.random()<0?lit:'#10101e') : glass); }
  for(let f=0;f<floors;f++){
    // ribbon: one continuous band per floor (skip per-bay panes, except ground)
    if(style==='ribbon' && f!==floors-1){
      const wy=gy+f*flH+20, wh=flH-40, rxA=gx+10, rxB=gx+BW-10;
      const fc= draft? null : (mode==='night'?'#10101e':glass);
      if(fc){x.fillStyle=fc;x.fillRect(rxA,wy,rxB-rxA,wh);}
      x.lineWidth=1.2; x.strokeRect(rxA,wy,rxB-rxA,wh);
      for(let b=0;b<=bays;b++){const mxx=gx+b*bayW; if(mxx<=rxA||mxx>=rxB)continue;
        if(mode==='night'&&r()<0.5){x.fillStyle=lit;x.fillRect(Math.max(rxA,mxx-bayW/2+10),wy+1,bayW-20,wh-2);}
        x.beginPath();x.moveTo(mxx,wy);x.lineTo(mxx,wy+wh);x.stroke();}
      continue;
    }
    for(let b=0;b<bays;b++){
      const ground=f===floors-1;
      let wx=gx+b*bayW+26, wy=gy+f*flH+18, ww=bayW-52, wh=flH-38;
      if(f===oddF&&b===oddB) wy+=flH*0.45;
      x.lineWidth=1.2;
      // ---- ground floor: storefront / arcade / entrance ----
      if(ground){
        const cxb=gx+b*bayW+bayW/2;
        if(b===doorBay){
          if(!draft){x.fillStyle=inkc; x.fillRect(cxb-26,gy+BH-72,52,72);}
          x.strokeRect(cxb-26,gy+BH-72,52,72);
          if(draft){x.beginPath();x.moveTo(cxb,gy+BH-72);x.lineTo(cxb,gy+BH);x.stroke();}
          for(let t=0;t<3;t++) x.strokeRect(cxb-34-t*6,gy+BH+t*7,68+t*12,7);
          continue;
        }
        // shopfront glazing
        const sfx=gx+b*bayW+12, sfw=bayW-24, sfy=gy+BH-flH+22, sfh=flH-40;
        const fc= draft? null : (mode==='night'?(r()<0.5?lit:'#10101e'):'#0f2a44');
        if(fc){x.fillStyle=fc;x.fillRect(sfx,sfy,sfw,sfh);}
        x.strokeRect(sfx,sfy,sfw,sfh);
        x.beginPath();x.moveTo(sfx,sfy+sfh*0.62);x.lineTo(sfx+sfw,sfy+sfh*0.62);x.stroke();
        // signage band
        x.lineWidth=0.8; x.strokeRect(sfx,gy+BH-flH+8,sfw,12);
        continue;
      }
      const isLit= mode==='night' && r()<0.55;
      const fillCol= draft? null : (mode==='night' ? (isLit?lit:'#10101e') : glass);
      if(fillCol) x.fillStyle=fillCol;
      if(style==='arch'){
        x.beginPath();
        x.moveTo(wx,wy+wh);x.lineTo(wx,wy+ww/2);
        x.arc(wx+ww/2,wy+ww/2,ww/2,Math.PI,0);
        x.lineTo(wx+ww,wy+wh);x.closePath();
        if(fillCol)x.fill(); x.stroke();
        x.beginPath();x.moveTo(wx+ww/2,wy);x.lineTo(wx+ww/2,wy+wh);x.stroke();
      } else if(style==='strip'){
        if(fillCol)x.fillRect(gx+b*bayW+10,wy+8,bayW-20,wh-16);
        x.strokeRect(gx+b*bayW+10,wy+8,bayW-20,wh-16);
      } else if(style==='oriel'){
        // projecting bay window: trapezoid box with little sloped sill
        const ox=wx-6, ow=ww+12;
        if(fillCol)x.fillRect(ox,wy,ow,wh);
        x.strokeRect(ox,wy,ow,wh);
        x.beginPath();x.moveTo(ox,wy+wh);x.lineTo(ox-7,wy+wh+10);x.lineTo(ox+ow+7,wy+wh+10);x.lineTo(ox+ow,wy+wh);x.stroke();
        x.beginPath();x.moveTo(ox+ow/3,wy);x.lineTo(ox+ow/3,wy+wh);x.moveTo(ox+2*ow/3,wy);x.lineTo(ox+2*ow/3,wy+wh);x.stroke();
      } else {
        if(fillCol)x.fillRect(wx,wy,ww,wh);
        x.strokeRect(wx,wy,ww,wh);
        x.beginPath();x.moveTo(wx+ww/2,wy);x.lineTo(wx+ww/2,wy+wh);
        if(style==='grid4'){x.moveTo(wx,wy+wh/2);x.lineTo(wx+ww,wy+wh/2);}
        else {x.moveTo(wx,wy+wh*0.6);x.lineTo(wx+ww,wy+wh*0.6);}
        x.stroke();
        // sill ticks under non-arch windows (drafting detail)
        if(blue){x.lineWidth=0.8;x.beginPath();x.moveTo(wx-4,wy+wh+3);x.lineTo(wx+ww+4,wy+wh+3);x.stroke();x.lineWidth=1.2;}
      }
      x.lineWidth=0.8; x.beginPath();x.moveTo(wx-6,wy+wh+4);x.lineTo(wx+ww+6,wy+wh+4);x.stroke();
    }
  }
  // ---- awnings (coloured) ----
  if(!draft){
    const awn=pick(['#e8e2d0',shade(body,60),'#d61a3c','#1d4fb8'],r);
    for(let b=0;b<bays;b++){
      if(b===doorBay) continue;
      if(r()<0.6){
        const ax=gx+b*bayW+8, aw=bayW-16, ay=gy+BH-flH+10;
        for(let t=0;t<Math.floor(aw/16);t++){
          x.fillStyle= t%2? awn : '#fff';
          x.beginPath(); x.moveTo(ax+t*16,ay); x.lineTo(ax+Math.min(aw,(t+1)*16),ay);
          x.lineTo(ax+Math.min(aw,(t+1)*16)+6,ay+22); x.lineTo(ax+t*16+6,ay+22); x.closePath(); x.fill();
        }
        x.strokeStyle=inkc; x.lineWidth=1; x.strokeRect(ax+3,ay,aw+6,22);
      }
    }
  }
  // ---- fire escape (kept) ----
  if(r()<0.7){
    const f=rint(r,1,Math.max(1,floors-3)), b=rint(r,0,bays-1);
    const dx=gx+b*bayW+bayW/2, dy=gy+f*flH;
    x.lineWidth=1.4; x.strokeStyle=inkc; x.strokeRect(dx-20,dy+flH-66,40,48);
    for(let t=0;t<4;t++) x.strokeRect(dx-26+t*4,dy+flH-18+t*5,52-t*8,5);
  }
  // ---- roof structure (5 types) ----
  const rx=gx+BW*(0.2+r()*0.6);
  x.lineWidth=1.4; x.strokeStyle=inkc;
  if(!draft) x.fillStyle=shade(body,-30);
  if(roof==='tank'){
    x.beginPath();x.moveTo(rx-26,gy-21);x.lineTo(rx-20,gy-78);x.lineTo(rx+20,gy-78);x.lineTo(rx+26,gy-21);x.stroke();
    if(!draft)x.fillRect(rx-24,gy-78,48,40);
    x.strokeRect(rx-24,gy-78,48,40);
    x.beginPath();x.moveTo(rx-24,gy-78);x.lineTo(rx,gy-100);x.lineTo(rx+24,gy-78);
    if(!draft)x.fill(); x.stroke();
  } else if(roof==='antenna'){
    x.beginPath();x.moveTo(rx,gy-21);x.lineTo(rx,gy-110);x.stroke();
    for(let t=1;t<4;t++){x.beginPath();x.moveTo(rx-14+t*3,gy-30-t*22);x.lineTo(rx+14-t*3,gy-30-t*22);x.stroke();}
  } else if(roof==='parapet'){
    // raised capped parapet wall with crenel gaps
    if(!draft)x.fillRect(gx-4,gy-30,BW+8,30);
    x.strokeRect(gx-4,gy-30,BW+8,30);
    for(let t=gx+10;t<gx+BW-10;t+=46){x.strokeRect(t,gy-44,22,16);}
    x.beginPath();x.moveTo(gx-10,gy-30);x.lineTo(gx+BW+10,gy-30);x.stroke();
  } else if(roof==='skylight'){
    // sawtooth north-light roof
    const n=Math.max(3,Math.floor(BW/120));
    for(let t=0;t<n;t++){const sxk=gx+12+t*(BW-24)/n, sw=(BW-24)/n;
      x.beginPath();x.moveTo(sxk,gy-6);x.lineTo(sxk,gy-46);x.lineTo(sxk+sw*0.7,gy-18);x.lineTo(sxk+sw*0.7,gy-6);x.stroke();
      if(!draft){x.fillStyle='rgba(180,220,255,0.5)';x.beginPath();x.moveTo(sxk,gy-46);x.lineTo(sxk,gy-8);x.lineTo(sxk+10,gy-12);x.lineTo(sxk+10,gy-42);x.closePath();x.fill();}}
  } else {
    if(!draft)x.fillRect(rx-34,gy-62,68,41);
    x.strokeRect(rx-34,gy-62,68,41);
  }
  // ---- ground + apparatus ----
  if(draft){
    x.strokeStyle=inkc;
    x.lineWidth=2.4; x.beginPath();x.moveTo(Mx*0.4,gy+BH);x.lineTo(W-Mx*0.4,gy+BH);x.stroke();
    x.lineWidth=0.8;
    for(let t=Mx*0.4;t<W-Mx*0.4;t+=14){x.beginPath();x.moveTo(t,gy+BH);x.lineTo(t-10,gy+BH+12);x.stroke();}
    // left vertical dimension string
    const dlx=gx-44;
    x.lineWidth=1; x.beginPath();x.moveTo(dlx,gy);x.lineTo(dlx,gy+BH);x.stroke();
    for(let f=0;f<=floors;f++){x.beginPath();x.moveTo(dlx-6,gy+f*flH);x.lineTo(dlx+6,gy+f*flH);x.stroke();}
    x.fillStyle=inkc; x.font='14px "Courier New",monospace'; x.textAlign='center';
    x.save();x.translate(dlx-18,gy+BH/2);x.rotate(-Math.PI/2);
    x.fillText((floors*3.1).toFixed(1)+' M',0,0);x.restore();
    if(blue){
      // top horizontal dimension string
      const dty=gy-46;
      x.beginPath();x.moveTo(gx,dty);x.lineTo(gx+BW,dty);x.stroke();
      for(let b=0;b<=bays;b++){const cxg=gx+b*bayW;x.beginPath();x.moveTo(cxg,dty-6);x.lineTo(cxg,dty+6);x.stroke();}
      x.font='12px "Courier New",monospace';
      for(let b=0;b<bays;b++){x.fillText('3.6',gx+b*bayW+bayW/2,dty-8);}
      // column bubbles
      for(let b=0;b<bays;b++){const cxg=gx+b*bayW+bayW/2, cby=gy-72;
        x.beginPath();x.arc(cxg,cby,13,0,6.29);x.stroke();
        x.fillText(String(b+1),cxg,cby+4);}
      // detail callout bubble on a window
      const cf=rint(r,1,Math.max(1,floors-2)), cb2=rint(r,0,bays-1);
      const cxp=gx+cb2*bayW+bayW/2, cyp=gy+cf*flH+flH/2;
      x.beginPath();x.arc(cxp,cyp,22,0,6.29);x.stroke();
      x.beginPath();x.moveTo(cxp+16,cyp-15);x.lineTo(cxp+70,cyp-46);x.stroke();
      x.font='bold 12px "Courier New",monospace';
      x.beginPath();x.moveTo(cxp,cyp-22);x.lineTo(cxp,cyp+22);x.stroke();
      x.fillText(String(rint(r,1,9)),cxp,cyp-6);x.fillText('A-3'+rint(r,11,99),cxp,cyp+16);
      // north arrow + graphic scale bar (bottom-left)
      const nax=46, nay=H-150;
      x.beginPath();x.moveTo(nax,nay+26);x.lineTo(nax,nay-14);x.stroke();
      x.beginPath();x.moveTo(nax-8,nay-2);x.lineTo(nax,nay-14);x.lineTo(nax+8,nay-2);x.stroke();
      x.font='bold 13px "Courier New",monospace';x.fillText('N',nax,nay-20);
      const sbx=34, sby=H-96, seg=26;
      for(let s=0;s<4;s++){x.fillStyle= s%2?sky:inkc; x.fillRect(sbx+s*seg,sby,seg,8); x.strokeRect(sbx+s*seg,sby,seg,8);}
      x.fillStyle=inkc; x.font='11px "Courier New",monospace'; x.textAlign='left';
      x.fillText('0',sbx-2,sby+22); x.fillText('20M',sbx+4*seg-14,sby+22);
      // title block (bottom-right)
      const PROJECTS=['MERIDIAN BLOCK','SALT WHARF LOFTS','PALE GATE COURT','LONG NOW TOWER','VESPER ARCADE','SOUTH REACH WORKS','LYRIC TERRACE','THE HONEST WEIGHTS'];
      const DRAWINGS=['FRONT ELEVATION','SIDE ELEVATION','STREET ELEVATION','REAR ELEVATION','NORTH ELEVATION','PARTY-WALL ELEVATION'];
      const tbW=Math.min(326,BW*0.7), tbH=104, tbx=W-30-tbW, tby=H-30-tbH;
      x.fillStyle='rgba(8,26,48,0.55)'; x.fillRect(tbx,tby,tbW,tbH);
      x.strokeStyle=inkc; x.lineWidth=1.6; x.strokeRect(tbx,tby,tbW,tbH); x.lineWidth=0.8;
      x.beginPath();x.moveTo(tbx,tby+tbH*0.5);x.lineTo(tbx+tbW,tby+tbH*0.5);x.stroke();
      x.beginPath();x.moveTo(tbx+tbW*0.6,tby+tbH*0.5);x.lineTo(tbx+tbW*0.6,tby+tbH);x.stroke();
      x.fillStyle=inkc; x.textAlign='left';
      x.font='bold 16px "Courier New",monospace'; x.fillText(pick(PROJECTS,r),tbx+10,tby+26);
      x.font='12px "Courier New",monospace'; x.fillText(pick(DRAWINGS,r),tbx+10,tby+44);
      x.fillText('SCALE 1:'+pick(['50','100','100','200'],r),tbx+10,tby+tbH*0.5+20);
      x.fillText('DRAWN '+pick(['E.M.','R.F.','V.K.','S.O.','D.L.'],r),tbx+10,tby+tbH*0.5+38);
      x.textAlign='right';
      x.font='bold 22px "Courier New",monospace'; x.fillText('A-'+rint(r,101,499),tbx+tbW-12,tby+tbH-32);
      x.font='11px "Courier New",monospace'; x.fillText('SHT '+rint(r,1,9)+' OF '+rint(r,9,24),tbx+tbW-12,tby+tbH-12);
    } else {
      // ink keeps its classic caption
      x.fillStyle=inkc; x.font='17px "Courier New",monospace'; x.textAlign='center';
      x.fillText('ELEVATION '+pick(['A','B','C','D'],r)+' — BLDG. '+rint(r,1,99),W/2,H-46);
    }
  } else {
    x.fillStyle= mode==='night'?'#0c0c18':'#3a3a44';
    x.fillRect(0,gy+BH,W,H-(gy+BH));
    x.strokeStyle= mode==='night'?'#2a2a3a':'#666672'; x.lineWidth=0.8;
    for(let t=20;t<W-20;t+=14){x.beginPath();x.moveTo(t,gy+BH);x.lineTo(t-10,gy+BH+12);x.stroke();}
    if(r()<0.5){x.fillStyle= mode==='night'?'#cfd2e8':'#f2f2ea';
      x.font='17px "Courier New",monospace'; x.textAlign='center';
      x.fillText('ELEVATION '+pick(['A','B','C','D'],r)+' — BLDG. '+rint(r,1,99),W/2,H-46);}
  }
}

/* PYRO — "Use Once, Remember Always" */
function castFacade(seed){
  const r=rng(seed);
  const bays=rint(r,3,8), floors=rint(r,4,11);
  const rare=r()<0.04;
  const mode= rare ? ['day','dusk','night'][Math.floor(r()*3)] : (r()<0.5?'ink':'blueprint');
  const style=pick(['2pane','arch','grid4','strip','ribbon','oriel'],r);
  const roof=pick(['tank','antenna','bulkhead','parapet','skylight'],r);
  return {bays,floors,mode,style,roof};
}

/* ── Elevations ─────────────────────────────────────────────────────────── */
const WINDOW: Record<string, string> = {
  '2pane': 'Two-Pane', arch: 'Arched', grid4: 'Four-Grid', strip: 'Strip',
  ribbon: 'Ribbon', oriel: 'Oriel',
};
const SHEET: Record<string, string> = {
  ink: 'Ink', blueprint: 'Blueprint', day: 'Daylight', dusk: 'Dusk', night: 'Nocturne',
};
const ROOF: Record<string, string> = {
  tank: 'Water Tank', antenna: 'Antenna', bulkhead: 'Bulkhead',
  parapet: 'Parapet', skylight: 'Skylight',
};
export const elevationsTraits: TraitsFn = (id) => {
  const c = castFacade(id);
  const storeys = c.floors <= 5 ? 'Low' : c.floors <= 8 ? 'Mid' : 'High';
  return { Sheet: SHEET[c.mode], Storeys: storeys, Window: WINDOW[c.style], Roof: ROOF[c.roof] };
};
export const elevationsSchema: TraitSchema = {
  traits: [
    { name: 'Sheet', values: ['Ink', 'Blueprint', 'Daylight', 'Dusk', 'Nocturne'],
      subtraits: [
        { name: 'Day', values: ['Blueprint', 'Daylight'] },
        { name: 'Night', values: ['Ink', 'Dusk', 'Nocturne'] },
      ] },
    { name: 'Storeys', values: ['Low', 'Mid', 'High'] },
    { name: 'Window', values: ['Two-Pane', 'Arched', 'Four-Grid', 'Strip', 'Ribbon', 'Oriel'],
      subtraits: [
        { name: 'Rectilinear', values: ['Two-Pane', 'Four-Grid', 'Strip', 'Ribbon'] },
        { name: 'Shaped', values: ['Arched', 'Oriel'] },
      ] },
    { name: 'Roof', values: ['Water Tank', 'Antenna', 'Bulkhead', 'Parapet', 'Skylight'],
      subtraits: [
        { name: 'Plant', values: ['Water Tank', 'Antenna', 'Bulkhead'] },
        { name: 'Roofline', values: ['Parapet', 'Skylight'] },
      ] },
  ],
};
export const renderElevations = blit(facade, elevationsTraits);
export const ELEVATIONS_ASPECTS = [0.8, 1, 1.3] as const;
