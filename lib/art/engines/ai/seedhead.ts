// @ts-nocheck
/*
 * Seedhead — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, rdHexLerp, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* SEEDHEAD — "Seedhead": golden-angle phyllotaxis dot spiral. */
const SEED_PALS=[
  {name:'Ember', bg:'#0a0604', a:'#ffd23f', b:'#ff3d00'},
  {name:'Ice', bg:'#04080e', a:'#caf0f8', b:'#0077b6'},
  {name:'Verdant', bg:'#04100a', a:'#9ef01a', b:'#007a3c'},
  {name:'Rose', bg:'#0e0410', a:'#ff8ad6', b:'#7b2cbf'},
  {name:'Bone', bg:'#efe9dd', a:'#6e2a28', b:'#1a1713'},
];
const SEED_FMTS=[{W:1080,H:1080,t:'Square'},{W:960,H:1200,t:'Portrait'}];
function seedhead(cv,seed,dispW){
  const r=rng(seed);
  const palI=Math.floor(r()*SEED_PALS.length);
  const fmt=pick(SEED_FMTS,r);
  const n=rint(r,700,2200);
  const shape=pick(['dot','ring','petal'],r);
  // ---- end trait draws ----
  const P=SEED_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H), dark=P.bg<'#888888';
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  const cx=W/2,cy=H*0.5,ga=2.39996,scale=S*0.52/Math.sqrt(n);
  // Per-dot shadowBlur is ~99% of this engine's cost and is near-invisible
  // once downscaled to a thumbnail — keep it only at full-view sizes. The
  // additive 'lighter' blend (the core of the look) stays at every size.
  // Glow rebuilt 2026-07-12 perf pass: dots render clean into an offscreen,
  // then composite twice — once blurred (the halo), once sharp — instead of
  // per-dot shadowBlur (which was ~99% of this engine's cost).
  const oGl=document.createElement('canvas');oGl.width=W;oGl.height=H;const xo=dark?oGl.getContext('2d'):x;
  if(dark){xo.globalCompositeOperation='lighter';}
  for(let i=0;i<n;i++){const a=i*ga,rad=scale*Math.sqrt(i);const px=cx+Math.cos(a)*rad,py=cy+Math.sin(a)*rad;const t=i/n;const col=rdHexLerp(P.a,P.b,t);xo.fillStyle=col;xo.globalAlpha=dark?(0.7+0.3*(1-t)):0.9;const sz=2.2+(1-t)*S*0.012;
    if(shape==='dot'){xo.beginPath();xo.arc(px,py,sz,0,6.29);xo.fill();}
    else if(shape==='ring'){xo.strokeStyle=col;xo.lineWidth=1;xo.beginPath();xo.arc(px,py,sz,0,6.29);xo.stroke();}
    else {xo.save();xo.translate(px,py);xo.rotate(a);xo.beginPath();xo.ellipse(0,0,sz*1.6,sz*0.7,0,0,6.29);xo.fill();xo.restore();}}
  if(dark){x.save();x.globalCompositeOperation='lighter';if(dispW>=500){x.filter='blur(3px)';x.drawImage(oGl,0,0);x.filter='none';}x.drawImage(oGl,0,0);x.restore();}
  oGl.width=0;oGl.height=0;
  x.globalAlpha=1;x.globalCompositeOperation='source-over';
  const vg=x.createRadialGradient(cx,cy,S*0.3,cx,cy,Math.max(W,H)*0.7);vg.addColorStop(0,'transparent');vg.addColorStop(1,dark?'rgba(0,0,0,0.5)':'rgba(40,30,20,0.12)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castSeedhead(seed){const r=rng(seed);const palI=Math.floor(r()*SEED_PALS.length);const fmt=pick(SEED_FMTS,r);const n=rint(r,700,2200);const shape=pick(['dot','ring','petal'],r);return {palette:SEED_PALS[palI].name, format:fmt.t, density:n<1200?'Open':n<1800?'Full':'Packed', mark:shape.charAt(0).toUpperCase()+shape.slice(1)};}

/* FACETS — "Facets": recursive triangular subdivision, stained-glass shards. */

/* Seedhead */
export const seedheadTraits: TraitsFn = (id) => { const c = castSeedhead(id) as any; return { Palette: c.palette, Format: c.format, Density: c.density, Mark: c.mark }; };
export const seedheadSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Ember','Ice','Verdant','Rose','Bone'] },
  { name: 'Format', values: ['Square','Portrait'] },
  { name: 'Density', values: ['Open','Full','Packed'] },
  { name: 'Mark', values: ['Dot','Ring','Petal'] },
] };
export const renderSeedhead = blit(seedhead, seedheadTraits);
export const SEEDHEAD_ASPECTS = [1, 0.8] as const;
