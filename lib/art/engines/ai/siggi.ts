// @ts-nocheck
/*
 * Siggi — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const SIG_PALS=[
  ['#0a0a12','#ff4d6d','#ffd23f','#06d6a0','#3a86ff','#fb5607'],
  ['#11071f','#f72585','#7209b7','#4cc9f0','#ffbe0b','#ffffff'],
  ['#102a1a','#ffd23f','#ff6b35','#06aed5','#f15bb5','#fefae0'],
  ['#1a1423','#e0aaff','#c77dff','#9d4edd','#ffd6ff','#7b2cbf'],
  ['#0d1b2a','#e63946','#f1faee','#a8dadc','#457b9d','#ffd60a'],
  ['#241a05','#e07a5f','#f2cc8f','#81b29a','#3d405b','#f4f1de'],
];
const SIG_FMTS=[{W:1100,H:1100,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'}];
const SIG_COMPS=['allover','medallion','bands'];
function siggi(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*SIG_PALS.length);
  const fmt=pick(SIG_FMTS,r);
  const comp=pick(SIG_COMPS,r);
  const G=pick([5,6,7,8],r);
  // ---- end trait draws ----
  const P=SIG_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H; const x=cv.getContext('2d');
  const ink=P[0], cols=P.slice(1);
  x.fillStyle=ink; x.fillRect(0,0,W,H);
  const cw=W/G, ch=H/Math.round(G*H/W); const rows=Math.round(G*H/W);
  function tile(cx,cy,s,t,c1,c2){x.save();x.translate(cx,cy);x.fillStyle=c1;x.fillRect(-s/2,-s/2,s,s);x.fillStyle=c2;const q=t%4,rot=(t/4|0)%4;x.rotate(rot*1.5708);
    if(q===0){x.beginPath();x.moveTo(-s/2,-s/2);x.arc(-s/2,-s/2,s,0,1.5708);x.closePath();x.fill();}
    else if(q===1){x.beginPath();x.moveTo(-s/2,-s/2);x.lineTo(s/2,-s/2);x.lineTo(-s/2,s/2);x.closePath();x.fill();}
    else if(q===2){for(let k=0;k<3;k++)x.fillRect(-s/2+k*s/3,-s/2,s/6,s);}
    else {x.beginPath();x.arc(0,0,s*0.32,0,6.283);x.fill();}
    x.restore();}
  function cellTile(gx,gy){const cx=cw*(gx+0.5),cy=ch*(gy+0.5);const c1=cols[Math.floor(r()*cols.length)];let c2=cols[Math.floor(r()*cols.length)];if(c2===c1)c2=cols[(cols.indexOf(c1)+1)%cols.length];tile(cx,cy,Math.max(cw,ch)+1,rint(r,0,15),c1,c2);}
  if(comp==='medallion'){for(let gy=0;gy<Math.ceil(rows/2);gy++)for(let gx=0;gx<Math.ceil(G/2);gx++){const c1=cols[Math.floor(r()*cols.length)],c2=cols[Math.floor(r()*cols.length)],t=rint(r,0,15);[[gx,gy],[G-1-gx,gy],[gx,rows-1-gy],[G-1-gx,rows-1-gy]].forEach(p=>tile(cw*(p[0]+0.5),ch*(p[1]+0.5),Math.max(cw,ch)+1,t,c1,c2));}}
  else if(comp==='bands'){for(let gy=0;gy<rows;gy++){const c1=cols[gy%cols.length];for(let gx=0;gx<G;gx++){const c2=cols[Math.floor(r()*cols.length)];tile(cw*(gx+0.5),ch*(gy+0.5),Math.max(cw,ch)+1,rint(r,0,15),c1,c2);}}}
  else {for(let gy=0;gy<rows;gy++)for(let gx=0;gx<G;gx++)cellTile(gx,gy);}
  // thin grid seams + grain
  x.strokeStyle=ink;x.globalAlpha=0.25;x.lineWidth=1;for(let gx=0;gx<=G;gx++){x.beginPath();x.moveTo(gx*cw,0);x.lineTo(gx*cw,H);x.stroke();}for(let gy=0;gy<=rows;gy++){x.beginPath();x.moveTo(0,gy*ch);x.lineTo(W,gy*ch);x.stroke();}x.globalAlpha=1;
  x.save();x.globalAlpha=0.04;for(let i=0;i<W*H/1400;i++){x.fillStyle=r()<0.5?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
}
function castSiggi(seed){const r=rng(seed);const palI=Math.floor(r()*SIG_PALS.length);const fmt=pick(SIG_FMTS,r);const comp=pick(SIG_COMPS,r);return {palette:'Set '+(palI+1), format:fmt.t, composition:comp.charAt(0).toUpperCase()+comp.slice(1)};}

/* ORBITS — "Orbits": damped harmonograph curves under additive glow. */

/* Siggi */
export const siggiTraits: TraitsFn = (id) => { const c = castSiggi(id) as any; return { Palette: c.palette, Format: c.format, Composition: c.composition }; };
export const siggiSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Set 1','Set 2','Set 3','Set 4','Set 5','Set 6'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Composition', values: ['Allover','Medallion','Bands'] },
] };
export const renderSiggi = blit(siggi, siggiTraits);
export const SIGGI_ASPECTS = [1, 0.78, 1.28] as const;
