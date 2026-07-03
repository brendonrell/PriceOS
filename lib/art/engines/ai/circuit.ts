// @ts-nocheck
/*
 * Circuit — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shade, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const CIR_PALS=[
  {name:'Green', board:'#0a2a18', trace:'#2bd47a', pad:'#d4b25a', acc:'#7dffb0'},
  {name:'Blue', board:'#08182e', trace:'#3aa8ff', pad:'#d0d8e0', acc:'#9be0ff'},
  {name:'Black', board:'#0a0a0c', trace:'#c8a23a', pad:'#e8c060', acc:'#ffe6a0'},
  {name:'Purple', board:'#180a2a', trace:'#b388ff', pad:'#e0c8ff', acc:'#ff8ad6'},
  {name:'Crimson', board:'#200808', trace:'#ff5a5a', pad:'#ffd0a0', acc:'#ffb0b0'},
];
const CIR_FMTS=[{W:1080,H:1080,t:'Square'},{W:920,H:1200,t:'Portrait'},{W:1200,H:920,t:'Landscape'}];
function circuit(cv,seed,dispW){
  const r=rng(seed);
  const palI=Math.floor(r()*CIR_PALS.length);
  const fmt=pick(CIR_FMTS,r);
  const dens=pick(['Sparse','Dense','Dense'],r);
  // ---- end trait draws ----
  const P=CIR_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  x.fillStyle=P.board; x.fillRect(0,0,W,H);
  // mask texture
  for(let i=0;i<W*H/2200;i++){x.globalAlpha=0.03+r()*0.04;x.fillStyle=shade(P.board,r()<0.5?14:-10);x.fillRect(r()*W,r()*H,2,2);}x.globalAlpha=1;
  const gp=Math.round(S*(dens==='Sparse'?0.06:0.04)), cols=Math.floor(W/gp), rows=Math.floor(H/gp), ox=(W-cols*gp)/2+gp/2, oy=(H-rows*gp)/2+gp/2;
  const node=(cx,cy)=>[ox+cx*gp,oy+cy*gp];
  x.lineCap='round';x.lineJoin='round';
  const nTr=Math.floor(cols*rows*(dens==='Sparse'?0.12:0.22));
  x.save(); x.globalCompositeOperation= P.board<'#888888'?'lighter':'source-over';
  for(let t=0;t<nTr;t++){
    let cx=rint(r,0,cols-1),cy=rint(r,0,rows-1);const len=rint(r,2,8);const pts=[node(cx,cy)];let dir=Math.floor(r()*4);
    for(let s=0;s<len;s++){if(r()<0.4)dir=(dir+(r()<0.5?1:3))%4;const dd=[[1,0],[0,1],[-1,0],[0,-1]][dir];const seg=rint(r,1,4);cx=Math.max(0,Math.min(cols-1,cx+dd[0]*seg));cy=Math.max(0,Math.min(rows-1,cy+dd[1]*seg));pts.push(node(cx,cy));}
    const col= r()<0.16?P.acc:P.trace; x.strokeStyle=col; x.shadowColor= P.board<'#888888'?col:'transparent'; x.shadowBlur= (P.board<'#888888'&&!(dispW<500))?5:0;
    x.lineWidth=Math.max(2,gp*0.18); x.globalAlpha=0.55+r()*0.35; x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.stroke();
    // vias at ends
    [pts[0],pts[pts.length-1]].forEach(p=>{x.fillStyle=P.pad;x.beginPath();x.arc(p[0],p[1],gp*0.22,0,6.29);x.fill();x.fillStyle=P.board;x.beginPath();x.arc(p[0],p[1],gp*0.09,0,6.29);x.fill();});
  }
  x.restore();x.globalAlpha=1;x.shadowBlur=0;
  // a few components (chips) — crisp rects
  for(let i=0;i<rint(r,2,6);i++){const cx=rint(r,1,cols-3),cy=rint(r,1,rows-3),w=rint(r,2,5)*gp,h=rint(r,1,3)*gp;const p=node(cx,cy);x.fillStyle=shade(P.board,-18);x.fillRect(p[0],p[1],w,h);x.strokeStyle=P.pad;x.lineWidth=1.5;x.strokeRect(p[0],p[1],w,h);for(let k=0;k<Math.floor(w/gp);k++){x.fillStyle=P.pad;x.fillRect(p[0]+k*gp+gp*0.3,p[1]-4,gp*0.4,4);x.fillRect(p[0]+k*gp+gp*0.3,p[1]+h,gp*0.4,4);}}
  const vg=x.createRadialGradient(W/2,H/2,S*0.36,W/2,H/2,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.45)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castCircuit(seed){const r=rng(seed);const palI=Math.floor(r()*CIR_PALS.length);const fmt=pick(CIR_FMTS,r);const dens=pick(['Sparse','Dense','Dense'],r);return {palette:CIR_PALS[palI].name, format:fmt.t, density:dens};}

/* Circuit */
export const circuitTraits: TraitsFn = (id) => { const c = castCircuit(id) as any; return { Palette: c.palette, Format: c.format, Density: c.density }; };
export const circuitSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Green','Blue','Black','Purple','Crimson'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Density', values: ['Sparse','Dense'] },
] };
export const renderCircuit = blit(circuit, circuitTraits);
export const CIRCUIT_ASPECTS = [1, 0.78, 1.28] as const;
