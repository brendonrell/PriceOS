// @ts-nocheck
/*
 * The Pendulum (harmonograph) — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shade, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* ORBITS — "Orbits": damped harmonograph curves under additive glow. */
const ORB_PALS=[
  {name:'Cyan', bg:'#06060c', ink:['#00e5ff','#ff2a6d','#ffd23f']},
  {name:'Violet', bg:'#0a0410', ink:['#b388ff','#00ffc8','#ff8ad6']},
  {name:'Ember', bg:'#0c0a06', ink:['#ffb000','#ff3d00','#ffe6a8']},
  {name:'Toxic', bg:'#04100c', ink:['#39ff14','#7dffd0','#ccff00']},
  {name:'Ink', bg:'#f1ece2', ink:['#1b2a44','#6e2a28','#b08d57']},
];
const ORB_FMTS=[{W:1080,H:1080,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'}];
function orbits(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*ORB_PALS.length);
  const fmt=pick(ORB_FMTS,r);
  const nC=rint(r,1,3);
  // ---- end trait draws ----
  const P=ORB_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H), dark=P.bg<'#888888';
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  for(let c=0;c<nC;c++){const col=P.ink[c%P.ink.length];
    const a1=1+rint(r,0,4),a2=1+rint(r,0,4),b1=1+rint(r,0,4),b2=1+rint(r,0,4);
    const p1=r()*6.28,p2=r()*6.28,p3=r()*6.28,p4=r()*6.28,d=0.002+r()*0.004,A=S*(0.16+r()*0.12);
    const pts=[];for(let t=0;t<140;t+=0.25){const e=Math.exp(-d*t);const px=W/2+(Math.sin(a1*t+p1)+Math.sin(a2*t+p2))*A*e,py=H/2+(Math.sin(b1*t+p3)+Math.sin(b2*t+p4))*A*e;pts.push([px,py]);}
    x.save();x.lineCap='round';x.lineJoin='round';if(dark){x.globalCompositeOperation='lighter';x.shadowColor=col;}
    [[5,0.1],[2.4,0.25],[1,dark?0.7:0.5]].forEach(q=>{x.strokeStyle=dark?col:shade(col,0);x.globalAlpha=q[1];x.lineWidth=q[0];if(dark)x.shadowBlur=q[0]*2;x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();});x.restore();x.globalAlpha=1;}
  const vg=x.createRadialGradient(W/2,H/2,S*0.3,W/2,H/2,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,dark?'rgba(0,0,0,0.55)':'rgba(40,30,20,0.12)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castOrbits(seed){const r=rng(seed);const palI=Math.floor(r()*ORB_PALS.length);const fmt=pick(ORB_FMTS,r);const nC=rint(r,1,3);return {palette:ORB_PALS[palI].name, format:fmt.t, curves:nC===1?'Single':nC===2?'Pair':'Triple'};}

/* JUNCTION — "Junction": Truchet tilings forming maze loops. */

/* The Pendulum (harmonograph) */
export const orbitsTraits: TraitsFn = (id) => { const c = castOrbits(id) as any; return { Palette: c.palette, Format: c.format, Curves: c.curves }; };
export const orbitsSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Cyan','Violet','Ember','Toxic','Ink'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Curves', values: ['Single','Pair','Triple'] },
] };
export const renderOrbits = blit(orbits, orbitsTraits);
export const ORBITS_ASPECTS = [1, 0.78, 1.28] as const;
