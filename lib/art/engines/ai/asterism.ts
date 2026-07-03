// @ts-nocheck
/*
 * Asterism — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shade, star, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* ASTERISM — "Asterism": a generative star chart with drawn constellations. */
const AST_PALS=[
  {name:'Deep Space', bg:'#05060e', star:'#eaf2ff', line:'#5a7bd8'},
  {name:'Nebula', bg:'#0a0614', star:'#ffe6f5', line:'#b388ff'},
  {name:'Amber Sky', bg:'#0c0805', star:'#fff0d0', line:'#e0a000'},
  {name:'Verdant', bg:'#04100c', star:'#e8fff4', line:'#39ffa0'},
  {name:'Antique', bg:'#171208', star:'#f3e3b0', line:'#c9962e'},
];
const AST_FMTS=[{W:1080,H:1080,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'},{W:1500,H:840,t:'Panorama'}];
function asterism(cv,seed,dispW){
  const r=rng(seed);
  const palI=Math.floor(r()*AST_PALS.length);
  const fmt=pick(AST_FMTS,r);
  const dens=pick(['Sparse','Field','Dense'],r);
  // ---- end trait draws ----
  const P=AST_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  // Per-star / per-line shadowBlur glow — invisible once downscaled to a
  // thumbnail; keep it only at full-view sizes. HI is false for the
  // homepage/gallery previews and true for the artwork modal.
  const HI=!(dispW<500);
  const bgg=x.createRadialGradient(W*0.5,H*0.4,0,W*0.5,H*0.5,Math.max(W,H)*0.8);bgg.addColorStop(0,shade(P.bg,12));bgg.addColorStop(1,P.bg);x.fillStyle=bgg;x.fillRect(0,0,W,H);
  // dust
  const N= dens==='Sparse'?W*H/1400: dens==='Field'?W*H/700:W*H/380;
  const stars=[];for(let i=0;i<N;i++){const px=r()*W,py=r()*H,br=Math.pow(r(),3);stars.push([px,py,br]);x.globalAlpha=0.3+br*0.7;x.fillStyle=P.star;x.beginPath();x.arc(px,py,0.5+br*2,0,6.29);x.fill();if(br>0.85){x.save();x.globalCompositeOperation='lighter';x.shadowColor=P.star;x.shadowBlur=HI?8:0;x.beginPath();x.arc(px,py,1.5+br*2.5,0,6.29);x.fill();x.restore();}}x.globalAlpha=1;
  // constellations: connect bright stars near a few anchors
  const bright=stars.filter(s=>s[2]>0.42);const nCon=rint(r,4,8);
  x.save();x.strokeStyle=P.line;x.lineWidth=1.8;x.globalAlpha=0.8;x.shadowColor=P.line;x.shadowBlur=HI?6:0;
  for(let c=0;c<nCon && bright.length>3;c++){let cur=bright[Math.floor(r()*bright.length)];const steps=rint(r,3,7);x.beginPath();x.moveTo(cur[0],cur[1]);for(let s=0;s<steps;s++){let best=null,bd=1e9;for(const b of bright){if(b===cur)continue;const d=Math.hypot(b[0]-cur[0],b[1]-cur[1]);if(d<bd&&d<S*0.42){bd=d;best=b;}}if(!best)break;x.lineTo(best[0],best[1]);cur=best;}x.stroke();}
  x.restore();x.globalAlpha=1;
  x.save();x.globalAlpha=0.04;for(let i=0;i<W*H/1400;i++){x.fillStyle='#fff';x.fillRect(r()*W,r()*H,1,1);}x.restore();
}
function castAsterism(seed){const r=rng(seed);const palI=Math.floor(r()*AST_PALS.length);const fmt=pick(AST_FMTS,r);const dens=pick(['Sparse','Field','Dense'],r);return {palette:AST_PALS[palI].name, format:fmt.t, density:dens};}

/* MOIRE — "Moiré": two overlaid line systems beating into interference. */

/* Asterism */
export const asterismTraits: TraitsFn = (id) => { const c = castAsterism(id) as any; return { Palette: c.palette, Format: c.format, Density: c.density }; };
export const asterismSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Deep Space','Nebula','Amber Sky','Verdant','Antique'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Panorama'] },
  { name: 'Density', values: ['Sparse','Field','Dense'] },
] };
export const renderAsterism = blit(asterism, asterismTraits);
export const ASTERISM_ASPECTS = [1, 0.78, 1.28, 1.79] as const;
