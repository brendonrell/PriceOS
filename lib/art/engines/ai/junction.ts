// @ts-nocheck
/*
 * Junction — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* JUNCTION — "Junction": Truchet tilings forming maze loops. */
const JCT_PALS=[
  {name:'Neon', bg:'#08080e', line:'#00e5c8', alt:'#ff2a6d'},
  {name:'Amber', bg:'#0c0a06', line:'#ffb000', alt:'#ff3d00'},
  {name:'Mono', bg:'#0a0a0c', line:'#e8e8ee', alt:'#8a8a92'},
  {name:'Ink', bg:'#efe9dd', line:'#1a1713', alt:'#7a2a22'},
  {name:'Iris', bg:'#0a0414', line:'#b388ff', alt:'#00e5ff'},
];
const JCT_FMTS=[{W:1080,H:1080,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'}];
function junction(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*JCT_PALS.length);
  const fmt=pick(JCT_FMTS,r);
  const G=pick([8,10,12,16],r);
  const style=pick(['arcs','diag','mix'],r);
  // ---- end trait draws ----
  const P=JCT_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d');
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  const cw=W/G, rows=Math.round(G*H/W), ch=H/rows, lw=Math.max(2,cw*0.16), dark=P.bg<'#888888';
  x.lineWidth=lw; x.lineCap='round';
  for(let gy=0;gy<rows;gy++)for(let gx=0;gx<G;gx++){const X0=gx*cw,Y0=gy*ch;const flip=r()<0.5;const useArc= style==='arcs'||(style==='mix'&&r()<0.6);
    x.strokeStyle= r()<0.18?P.alt:P.line; if(dark){x.save();x.shadowColor=x.strokeStyle;x.shadowBlur=lw*1.5;}
    if(useArc){if(flip){x.beginPath();x.arc(X0,Y0,cw/2,0,1.5708);x.stroke();x.beginPath();x.arc(X0+cw,Y0+ch,cw/2,3.1416,4.712);x.stroke();}else{x.beginPath();x.arc(X0+cw,Y0,cw/2,1.5708,3.1416);x.stroke();x.beginPath();x.arc(X0,Y0+ch,cw/2,4.712,6.283);x.stroke();}}
    else {x.beginPath();if(flip){x.moveTo(X0,Y0);x.lineTo(X0+cw,Y0+ch);}else{x.moveTo(X0+cw,Y0);x.lineTo(X0,Y0+ch);}x.stroke();}
    if(dark)x.restore();}
  x.save();x.globalAlpha=0.04;for(let i=0;i<W*H/1200;i++){x.fillStyle=dark?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
}
function castJunction(seed){const r=rng(seed);const palI=Math.floor(r()*JCT_PALS.length);const fmt=pick(JCT_FMTS,r);const G=pick([8,10,12,16],r);const style=pick(['arcs','diag','mix'],r);return {palette:JCT_PALS[palI].name, format:fmt.t, grid:G+'×', style:style.charAt(0).toUpperCase()+style.slice(1)};}

/* ASTERISM — "Asterism": a generative star chart with drawn constellations. */

/* Junction */
export const junctionTraits: TraitsFn = (id) => { const c = castJunction(id) as any; return { Palette: c.palette, Format: c.format, Grid: c.grid, Style: c.style }; };
export const junctionSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Neon','Amber','Mono','Ink','Iris'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Grid', values: ['8×','10×','12×','16×'] },
  { name: 'Style', values: ['Arcs','Diag','Mix'] },
] };
export const renderJunction = blit(junction, junctionTraits);
export const JUNCTION_ASPECTS = [1, 0.78, 1.28] as const;
