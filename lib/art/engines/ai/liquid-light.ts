// @ts-nocheck
/*
 * Liquid Light — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, fbm2, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const LL_PALS=[
  {name:'Acid', dark:'#0a0012', cols:['#ff00a0','#00ffd0','#ffe600','#7b2fff','#ff5e00']},
  {name:'Blacklight', dark:'#05000a', cols:['#ff2bd1','#2bff88','#00e5ff','#ffea00','#b14bff']},
  {name:'Oil Slick', dark:'#0a0a14', cols:['#ff71ce','#01cdfe','#05ffa1','#fffb96','#b967ff']},
  {name:'Sunset', dark:'#140208', cols:['#ff6b00','#ff0066','#ffcc00','#9b2fae','#ff3d00']},
  {name:'Jade', dark:'#001410', cols:['#00ffc8','#7dff00','#00b3ff','#e0ff4f','#00ffa0']},
  {name:'Dreampool', dark:'#0a0818', cols:['#a0c4ff','#bdb2ff','#ffc6ff','#caffbf','#9bf6ff']},
];
const LL_FMTS=[{W:1100,H:1100,t:'Square'},{W:920,H:1200,t:'Portrait'},{W:1200,H:920,t:'Landscape'},{W:880,H:1240,t:'Tall'}];
const LL_MODES=['kaleido','oil','tunnel'];
function llHexA(h,a){const v=parseInt(h.slice(1),16);return 'rgba('+((v>>16)&255)+','+((v>>8)&255)+','+(v&255)+','+a+')';}
function liquidlight(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*LL_PALS.length);
  const fmt=pick(LL_FMTS,r);
  const mode=pick(LL_MODES,r);
  const fold=pick([6,8,10,12],r);
  // ---- end trait draws ----
  const P=LL_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  const cx=W/2, cy=H/2, NO=seed*0.01+2, warp=1.3+(seed%5)*0.5, fr=0.9+(seed%4)*0.35, rot=r()*6.283;
  x.fillStyle=P.dark; x.fillRect(0,0,W,H);
  const cell=Math.max(7,S*0.018);
  x.globalCompositeOperation='lighter';
  for(let gy=-cell;gy<H+cell;gy+=cell)for(let gx=-cell;gx<W+cell;gx+=cell){
    const dx=gx-cx, dy=gy-cy, R=Math.hypot(dx,dy), ang=Math.atan2(dy,dx);
    let sx,sy;
    if(mode==='kaleido'){const step=6.283/fold; let a=(((ang-rot)%step)+step)%step; if((Math.floor((ang-rot)/step))%2)a=step-a; sx=Math.cos(a)*R; sy=Math.sin(a)*R;}
    else if(mode==='tunnel'){ sx=Math.log(R+1)*S*0.4; sy=(ang+rot)*S*0.22; }
    else { sx=dx; sy=dy; }
    const u=sx*0.006*fr+NO, v=sy*0.006*fr;
    const q1=fbm2(u,v), q2=fbm2(u+5.2,v+1.3);
    const val=fbm2(u+warp*q1, v+warp*q2);
    const idx=Math.floor(((val*P.cols.length*1.3 + (mode==='tunnel'?R*0.015:0))%P.cols.length)+P.cols.length)%P.cols.length;
    const col=P.cols[idx], al=0.10+val*0.42;
    const g=x.createRadialGradient(gx,gy,0,gx,gy,cell*1.7); g.addColorStop(0,llHexA(col,al)); g.addColorStop(1,llHexA(col,0));
    x.fillStyle=g; x.fillRect(gx-cell*1.7,gy-cell*1.7,cell*3.4,cell*3.4);
  }
  // central bloom
  const cg=x.createRadialGradient(cx,cy,0,cx,cy,S*0.14); cg.addColorStop(0,'rgba(255,255,255,0.45)'); cg.addColorStop(1,'transparent'); x.fillStyle=cg; x.fillRect(0,0,W,H);
  x.globalCompositeOperation='source-over';
  // iridescent rings (kaleido/tunnel)
  if(mode!=='oil'){x.save();x.globalCompositeOperation='lighter';x.globalAlpha=0.25;for(let i=1;i<7;i++){x.strokeStyle=P.cols[i%P.cols.length];x.lineWidth=1.5;x.beginPath();x.arc(cx,cy,S*0.06*i+fbm2(i+NO,3)*S*0.03,0,6.283);x.stroke();}x.restore();x.globalAlpha=1;}
  // grain + vignette
  x.save();x.globalAlpha=0.04;for(let i=0;i<W*H/900;i++){x.fillStyle=r()<0.5?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  const vg=x.createRadialGradient(cx,cy,S*0.34,cx,cy,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.5)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castLiquidlight(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*LL_PALS.length);
  const fmt=pick(LL_FMTS,r);
  const mode=pick(LL_MODES,r);
  const fold=pick([6,8,10,12],r);
  return {palette:LL_PALS[palI].name, format:fmt.t, mode, fold: mode==='kaleido'?fold+'-fold':'—'};
}

/* DIFFUSION — "Diffusion" (halo): Gray-Scott reaction-diffusion settled into
   Turing patterns, then lit as a metallic RELIEF (B as a height field, shaded
   normals + specular), mapped through pigment ramps (gold-leaf, prussian...).
   A real physical process, finished like fine print. cast mirrors the leads. */

/* Liquid Light */
export const liquidlightTraits: TraitsFn = (id) => { const c = castLiquidlight(id) as any; return { Palette: c.palette, Format: c.format, Mode: cap(c.mode), Symmetry: c.fold }; };
export const liquidlightSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Acid','Blacklight','Oil Slick','Sunset','Jade','Dreampool'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'Mode', values: ['Kaleido','Oil','Tunnel'] },
] };
export const renderLiquidlight = blit(liquidlight, liquidlightTraits);
export const LIQUIDLIGHT_ASPECTS = [1, 0.77, 1.3, 0.71] as const;
