// @ts-nocheck
/*
 * Average Contents Forty — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, paperNoise, star, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* 12. MATCHBOOK — cheap-print matchbox labels */
function matchbook(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:840,H:1100},{W:1100,H:840}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sch=pick([
    {bg:'#cfe8f0',a:'#d61a3c',b:'#1d4fb8',ink:'#1c1024'},
    {bg:'#d8f0d8',a:'#0f8a3c',b:'#ff5500',ink:'#142014'},
    {bg:'#fbe8e0',a:'#7a00cc',b:'#ffaa00',ink:'#240a30'},
    {bg:'#e2f0e8',a:'#e0202e',b:'#14649c',ink:'#101c24'},
    {bg:'#f2f2f4',a:'#d61a8c',b:'#0fa8a0',ink:'#2a0a1c'},
    {bg:'#b8a8e8',a:'#2a1040',b:'#ffd514',ink:'#1c1024'},
    {bg:'#ffd6e4',a:'#0a3d7a',b:'#0fa8a0',ink:'#2a0a1c'},
    {bg:'#d8f0f4',a:'#ff5500',b:'#1d2bd6',ink:'#102024'},
    {bg:'#f2f2e0',a:'#0f8a3c',b:'#d61a8c',ink:'#142014'},
    {bg:'#1c2440',a:'#ffd514',b:'#ff2b6e',ink:'#f2ead0'},
  ],r);
  x.fillStyle='#181318'; x.fillRect(0,0,W,H);
  const M=70;
  x.fillStyle=sch.bg; x.fillRect(M,M,W-2*M,H-2*M);
  paperNoise(x,r,W,H,'80,50,20',700);
  const mis=()=> (r()-0.5)*9; // misregistration offset
  // border decorations
  x.strokeStyle=sch.a; x.lineWidth=8; x.strokeRect(M+18+mis(),M+18+mis(),W-2*M-36,H-2*M-36);
  x.strokeStyle=sch.ink; x.lineWidth=2.4; x.strokeRect(M+18,M+18,W-2*M-36,H-2*M-36);
  x.strokeStyle=sch.b; x.lineWidth=2; x.setLineDash([12,6]);
  x.strokeRect(M+38,M+38,W-2*M-76,H-2*M-76); x.setLineDash([]);
  const ccx=W/2, ccy=H/2+10, R=Math.min(W,H)*0.21;
  const motif=pick(['sun','moon','eye','anchor','bolt','elephant'],r);
  // colour blob behind motif, offset (cheap print)
  x.fillStyle=sch.b; x.globalAlpha=0.85;
  x.beginPath(); x.arc(ccx+mis()*1.6,ccy+mis()*1.6,R*1.25,0,6.29); x.fill(); x.globalAlpha=1;
  x.strokeStyle=sch.ink; x.fillStyle=sch.a; x.lineWidth=4;
  if(motif==='sun'){
    const ox=mis(),oy=mis();
    x.beginPath(); x.arc(ccx+ox,ccy+oy,R*0.62,0,6.29); x.fill();
    x.beginPath(); x.arc(ccx,ccy,R*0.62,0,6.29); x.stroke();
    for(let i=0;i<16;i++){const a=i/16*6.283;
      x.beginPath();x.moveTo(ccx+Math.cos(a)*R*0.74,ccy+Math.sin(a)*R*0.74);
      x.lineTo(ccx+Math.cos(a)*R*(i%2?0.95:1.1),ccy+Math.sin(a)*R*(i%2?0.95:1.1));x.stroke();}
    // face
    x.fillStyle=sch.ink;
    x.beginPath();x.arc(ccx-R*0.2,ccy-R*0.1,5,0,6.29);x.fill();
    x.beginPath();x.arc(ccx+R*0.2,ccy-R*0.1,5,0,6.29);x.fill();
    x.lineWidth=3;x.beginPath();x.arc(ccx,ccy+R*0.12,R*0.22,0.3,2.84);x.stroke();
  } else if(motif==='moon'){
    const ox=mis(),oy=mis();
    x.beginPath(); x.arc(ccx+ox,ccy+oy,R*0.66,0,6.29); x.fill();
    x.fillStyle=sch.bg;
    x.beginPath(); x.arc(ccx+R*0.3+ox,ccy-R*0.12+oy,R*0.52,0,6.29); x.fill();
    x.strokeStyle=sch.ink;x.lineWidth=4;
    x.beginPath(); x.arc(ccx,ccy,R*0.66,1.2,5.2); x.stroke();
    // star
    x.fillStyle=sch.ink;
    star(x,ccx+R*0.55,ccy-R*0.4,R*0.16,5);
  } else if(motif==='eye'){
    const ox=mis(),oy=mis();
    x.beginPath();x.moveTo(ccx-R+ox,ccy+oy);x.quadraticCurveTo(ccx+ox,ccy-R*0.85+oy,ccx+R+ox,ccy+oy);x.quadraticCurveTo(ccx+ox,ccy+R*0.85+oy,ccx-R+ox,ccy+oy);x.closePath();x.fill();
    x.strokeStyle=sch.ink;
    x.beginPath();x.moveTo(ccx-R,ccy);x.quadraticCurveTo(ccx,ccy-R*0.85,ccx+R,ccy);x.quadraticCurveTo(ccx,ccy+R*0.85,ccx-R,ccy);x.closePath();x.stroke();
    x.fillStyle=sch.ink; x.beginPath();x.arc(ccx,ccy,R*0.34,0,6.29);x.fill();
    x.fillStyle=sch.bg; x.beginPath();x.arc(ccx+R*0.1,ccy-R*0.1,R*0.09,0,6.29);x.fill();
    for(let i=0;i<10;i++){const a=i/10*6.283;
      x.strokeStyle=sch.ink;x.lineWidth=3;
      x.beginPath();x.moveTo(ccx+Math.cos(a)*R*1.06,ccy+Math.sin(a)*R*0.92);
      x.lineTo(ccx+Math.cos(a)*R*1.2,ccy+Math.sin(a)*R*1.05);x.stroke();}
  } else if(motif==='anchor'){
    const ox=mis(),oy=mis();
    x.lineWidth=R*0.16; x.strokeStyle=sch.a; x.lineCap='round';
    x.beginPath();x.moveTo(ccx+ox,ccy-R*0.7+oy);x.lineTo(ccx+ox,ccy+R*0.5+oy);x.stroke();
    x.beginPath();x.arc(ccx+ox,ccy+R*0.3+oy,R*0.55,0.3,2.84);x.stroke();
    x.beginPath();x.arc(ccx+ox,ccy-R*0.78+oy,R*0.16,0,6.29);x.stroke();
    x.lineWidth=R*0.1;x.beginPath();x.moveTo(ccx-R*0.4+ox,ccy-R*0.36+oy);x.lineTo(ccx+R*0.4+ox,ccy-R*0.36+oy);x.stroke();
    x.lineWidth=4; x.strokeStyle=sch.ink; x.lineCap='butt';
    x.beginPath();x.moveTo(ccx,ccy-R*0.7);x.lineTo(ccx,ccy+R*0.5);x.stroke();
    x.beginPath();x.arc(ccx,ccy+R*0.3,R*0.55,0.3,2.84);x.stroke();
  } else if(motif==='bolt'){
    const ox=mis(),oy=mis();
    function boltPath(dx,dy){
      x.beginPath();
      x.moveTo(ccx-R*0.18+dx,ccy-R*0.9+dy);x.lineTo(ccx+R*0.34+dx,ccy-R*0.9+dy);
      x.lineTo(ccx+R*0.04+dx,ccy-R*0.15+dy);x.lineTo(ccx+R*0.4+dx,ccy-R*0.15+dy);
      x.lineTo(ccx-R*0.25+dx,ccy+R*0.9+dy);x.lineTo(ccx+R*0.0+dx,ccy+R*0.1+dy);
      x.lineTo(ccx-R*0.34+dx,ccy+R*0.1+dy);x.closePath();
    }
    boltPath(ox,oy); x.fill();
    boltPath(0,0); x.stroke();
  } else { // elephant, blocky silhouette
    const ox=mis(),oy=mis();
    function ele(dx,dy,fill){
      x.beginPath();
      x.moveTo(ccx-R*0.9+dx,ccy+R*0.6+dy);
      x.lineTo(ccx-R*0.9+dx,ccy-R*0.1+dy);
      x.quadraticCurveTo(ccx-R*0.8+dx,ccy-R*0.7+dy,ccx-R*0.1+dx,ccy-R*0.7+dy);
      x.quadraticCurveTo(ccx+R*0.5+dx,ccy-R*0.75+dy,ccx+R*0.62+dx,ccy-R*0.3+dy);
      x.quadraticCurveTo(ccx+R*0.95+dx,ccy-R*0.25+dy,ccx+R*0.9+dx,ccy+R*0.25+dy);
      x.lineTo(ccx+R*0.78+dx,ccy+R*0.2+dy);
      x.lineTo(ccx+R*0.74+dx,ccy+R*0.62+dy);
      x.lineTo(ccx+R*0.5+dx,ccy+R*0.62+dy);
      x.lineTo(ccx+R*0.46+dx,ccy+R*0.18+dy);
      x.lineTo(ccx-R*0.5+dx,ccy+R*0.18+dy);
      x.lineTo(ccx-R*0.56+dx,ccy+R*0.62+dy);
      x.lineTo(ccx-R*0.78+dx,ccy+R*0.62+dy);
      x.closePath();
      if(fill)x.fill();else x.stroke();
    }
    ele(ox,oy,true); ele(0,0,false);
    x.fillStyle=sch.bg; x.beginPath();x.arc(ccx-R*0.45,ccy-R*0.35,4.5,0,6.29);x.fill();
  }
  // type
  const brand=pick(['GOLDEN EYE','TWO ANCHORS','LUCKY METEOR','ROYAL ELEPHANT','NIGHT SUN','THE COMET','HONEST WEIGHT'],r);
  x.fillStyle=sch.ink; x.textAlign='center';
  x.font='bold '+Math.round(W*0.065)+'px Georgia,serif';
  x.fillText(brand,W/2,M+96);
  x.fillStyle=sch.a;
  x.font='bold '+Math.round(W*0.026)+'px Georgia,serif';
  x.fillText('SAFETY MATCHES',W/2,H-M-90);
  x.fillStyle=sch.ink; x.font=Math.round(W*0.019)+'px Georgia,serif';
  x.fillText('AVG. CONTENTS '+rint(r,38,52),W/2,H-M-56);
  // price badge
  x.fillStyle=sch.b;
  star(x,W-M-72,M+86,46,12);
  x.fillStyle=sch.bg; x.font='bold 26px Georgia,serif';
  x.fillText(rint(r,1,15)+'¢',W-M-72,M+95);
}
function castMatchbook(seed){
  const r=rng(seed);
  const fmt=pick([{W:840,H:1100},{W:1100,H:840}],r);
  const si=Math.floor(r()*10);
  return {fmt,si};
}

/* ── Average Contents Forty ─────────────────────────────────────────────── */
const MB_SCHEME = ['Sky', 'Mint', 'Blush', 'Sage', 'Snow', 'Lavender', 'Pink', 'Ice', 'Bone', 'Navy'];
export const contentsTraits: TraitsFn = (id) => {
  const c = castMatchbook(id);
  return { Format: c.fmt.W === 840 ? 'Tall' : 'Wide', Scheme: MB_SCHEME[c.si] };
};
export const contentsSchema: TraitSchema = {
  traits: [
    { name: 'Format', values: ['Tall', 'Wide'] },
    { name: 'Scheme', values: MB_SCHEME,
      subtraits: [
        { name: 'Pale', values: ['Sky', 'Mint', 'Snow', 'Ice', 'Bone'] },
        { name: 'Tinted', values: ['Blush', 'Sage', 'Lavender', 'Pink'] },
        { name: 'Dark', values: ['Navy'] },
      ] },
  ],
};
export const renderContents = blit(matchbook, contentsTraits);
export const CONTENTS_ASPECTS = [0.76, 1.31] as const;
