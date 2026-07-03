// @ts-nocheck
/*
 * Quasicrystal — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const QC_PALS=[
  {name:'Cobalt', bg:'#05060e', cols:['#04102a','#1e88e5','#7ec8ff','#eaf6ff']},
  {name:'Ember', bg:'#0c0402', cols:['#1a0600','#ff5400','#ffb000','#ffe6a8']},
  {name:'Verdant', bg:'#04100c', cols:['#04150e','#1f8a5a','#39ff9f','#e8fff4']},
  {name:'Magenta', bg:'#0a0410', cols:['#1a0420','#c01f5b','#ff71ce','#ffe0f5']},
  {name:'Gilt', bg:'#0a0804', cols:['#100a04','#6b4a1f','#c9962e','#f6ead0']},
  {name:'Mono', bg:'#0a0a0c', cols:['#101014','#4a4a52','#9a9aa2','#f0f0f4']},
];
const QC_FMTS=[{W:1080,H:1080,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'}];
function quasicrystal(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*QC_PALS.length);
  const fmt=pick(QC_FMTS,r);
  const sym=pick([5,7,9,11,13],r);
  const bands=pick([5,7,9],r);
  // ---- end trait draws ----
  const P=QC_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  const cell=3, freq=(32+(seed%26))/S, ph=r()*6.283;
  const ang=[];for(let i=0;i<sym;i++)ang.push(i*Math.PI/sym);
  for(let gy=0;gy<H;gy+=cell)for(let gx=0;gx<W;gx+=cell){
    let v=0;const dx=gx-W/2,dy=gy-H/2;for(let i=0;i<sym;i++)v+=Math.cos((dx*Math.cos(ang[i])+dy*Math.sin(ang[i]))*freq+ph);
    let t=(v/sym+1)/2; t=Math.floor(t*bands)/(bands-1); if(t<0)t=0;if(t>1)t=1;
    const idx=Math.min(P.cols.length-1,Math.floor(t*P.cols.length));
    x.fillStyle=P.cols[idx]; x.fillRect(gx,gy,cell+0.6,cell+0.6);
  }
  const vg=x.createRadialGradient(W/2,H/2,S*0.34,W/2,H/2,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.45)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castQuasicrystal(seed){const r=rng(seed);const palI=Math.floor(r()*QC_PALS.length);const fmt=pick(QC_FMTS,r);const sym=pick([5,7,9,11,13],r);const bands=pick([5,7,9],r);return {palette:QC_PALS[palI].name, format:fmt.t, symmetry:sym+'-fold', bands:bands+' bands'};}

/* CIRCUIT — "Circuit": procedural PCB — orthogonal/45° copper traces routed
   between pads + vias on a solder-mask board. Crisp, structured, cyberpunk. */

/* Quasicrystal */
export const quasicrystalTraits: TraitsFn = (id) => { const c = castQuasicrystal(id) as any; return { Palette: c.palette, Format: c.format, Symmetry: c.symmetry, Bands: c.bands }; };
export const quasicrystalSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Cobalt','Ember','Verdant','Magenta','Gilt','Mono'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Symmetry', values: ['5-fold','7-fold','9-fold','11-fold','13-fold'] },
  { name: 'Bands', values: ['5 bands','7 bands','9 bands'] },
] };
export const renderQuasicrystal = blit(quasicrystal, quasicrystalTraits);
export const QUASICRYSTAL_ASPECTS = [1, 0.78, 1.28] as const;
