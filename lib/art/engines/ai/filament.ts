// @ts-nocheck
/*
 * Iskra — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, fbm2, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const ISK_PALS=[
  {name:'Graphite', bg:'#efe9dd', ink:'#1d1a16', acc:'#7a2a22'},
  {name:'Slate', bg:'#e7e7df', ink:'#28323a', acc:'#9a6a3a'},
  {name:'Rose Ash', bg:'#efe6df', ink:'#3a2630', acc:'#b06a7a'},
  {name:'Indigo', bg:'#e9e6da', ink:'#1b2a44', acc:'#b08d57'},
  {name:'Noir', bg:'#0d0d10', ink:'#e6e2d6', acc:'#c9962e', dark:true},
  {name:'Pine', bg:'#e6e8de', ink:'#1f3328', acc:'#9c7b4a'},
];
const ISK_FMTS=[{W:1040,H:1300,t:'Folio'},{W:1100,H:1100,t:'Square'},{W:1300,H:1040,t:'Landscape'}];
const ISK_MODES=['bloom','rift','veil'];
function iskra(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*ISK_PALS.length);
  const fmt=pick(ISK_FMTS,r);
  const mode=pick(ISK_MODES,r);
  // ---- end trait draws ----
  const P=ISK_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  x.lineCap='round';
  function form(cx,cy,R0,n,chaosBias){for(let i=0;i<n;i++){const t=i/n;const rad=R0*(0.15+t*0.95);const chaos=Math.pow(t,1.6)*chaosBias;const acc=r()<0.05;x.strokeStyle=acc?P.acc:P.ink;x.globalAlpha=(P.dark?0.5:0.42)*(1-t*0.4)+0.08;x.lineWidth=0.6+(1-t)*0.8;x.beginPath();const steps=80;for(let s=0;s<=steps;s++){const a=s/steps*6.283;const wob=(fbm2(Math.cos(a)*rad*0.02+i*0.3,Math.sin(a)*rad*0.02)-0.5)*chaos*S*0.5;const rr=rad+wob;const px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr*0.96;if(s===0)x.moveTo(px,py);else x.lineTo(px,py);}x.stroke();}x.globalAlpha=1;}
  if(mode==='bloom') form(W*0.5,H*0.46,S*0.34,rint(r,90,160),0.5+r()*0.7);
  else if(mode==='rift'){form(W*0.36,H*0.44,S*0.22,rint(r,60,100),0.4+r()*0.5);form(W*0.66,H*0.56,S*0.2,rint(r,60,100),0.5+r()*0.6);}
  else {const lines=rint(r,40,80);for(let i=0;i<lines;i++){const y0=H*(0.12+0.76*i/lines);const acc=r()<0.05;x.strokeStyle=acc?P.acc:P.ink;x.globalAlpha=0.4;x.lineWidth=0.7;x.beginPath();for(let xx=W*0.1;xx<=W*0.9;xx+=W*0.01){const ch=Math.pow(Math.abs(xx/W-0.5)*2,1.4)*S*0.18;const wy=y0+(fbm2(xx*0.006+i*0.4,y0*0.01)-0.5)*ch;if(xx===W*0.1)x.moveTo(xx,wy);else x.lineTo(xx,wy);}x.stroke();}x.globalAlpha=1;}
  // grain + vignette
  x.save();x.globalAlpha=0.035;x.globalCompositeOperation=P.dark?'screen':'multiply';for(let i=0;i<W*H/1500;i++){x.fillStyle=P.dark?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  const vg=x.createRadialGradient(W/2,H/2,S*0.36,W/2,H/2,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,P.dark?'rgba(0,0,0,0.5)':'rgba(40,30,20,0.12)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castIskra(seed){const r=rng(seed);const palI=Math.floor(r()*ISK_PALS.length);const fmt=pick(ISK_FMTS,r);const mode=pick(ISK_MODES,r);return {palette:ISK_PALS[palI].name, format:fmt.t, form:mode.charAt(0).toUpperCase()+mode.slice(1)};}

/* SIGGI — "Siggi" (homage to Siggi Eggertsson): bold modular grid of geometric
   tiles (quarter-circles, triangles, arcs, stripes) in vibrant curated colour,
   connecting into larger forms. Comps: allover / medallion / bands. */

/* Iskra */
export const iskraTraits: TraitsFn = (id) => { const c = castIskra(id) as any; return { Palette: c.palette, Format: c.format, Form: c.form }; };
export const iskraSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Graphite','Slate','Rose Ash','Indigo','Noir','Pine'] },
  { name: 'Format', values: ['Folio','Square','Landscape'] },
  { name: 'Form', values: ['Bloom','Rift','Veil'] },
] };
export const renderIskra = blit(iskra, iskraTraits);
export const ISKRA_ASPECTS = [0.8, 1, 1.25] as const;
