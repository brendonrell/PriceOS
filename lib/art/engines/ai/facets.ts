// @ts-nocheck
/*
 * Facets — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, shade, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* FACETS — "Facets": recursive triangular subdivision, stained-glass shards. */
const FAC_PALS=[
  {name:'Jewel', bg:'#0a0a10', cols:['#e63946','#457b9d','#2a9d8f','#e9c46a','#9d4edd','#f4a261']},
  {name:'Dusk', bg:'#0c0814', cols:['#ff6b6b','#4ecdc4','#ffe66d','#a06cd5','#ff8c42','#1a936f']},
  {name:'Cool', bg:'#06080e', cols:['#3a86ff','#00e5ff','#8338ec','#06d6a0','#118ab2','#073b4c']},
  {name:'Warm Stone', bg:'#1a120a', cols:['#bc6c25','#dda15e','#606c38','#283618','#a44a3f','#e9c46a']},
  {name:'Mono', bg:'#0a0a0c', cols:['#2a2a2e','#4a4a52','#6e6e76','#9a9aa2','#c8c8d0','#1a1a1e']},
];
const FAC_FMTS=[{W:1080,H:1080,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'}];
function facets(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*FAC_PALS.length);
  const fmt=pick(FAC_FMTS,r);
  const depth=pick([6,7,8,9],r);
  // ---- end trait draws ----
  const P=FAC_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d');
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  function tri(a,b,c,d){if(d<=0){const col=P.cols[Math.floor(r()*P.cols.length)];x.fillStyle=shade(col,(r()-0.5)*24);x.beginPath();x.moveTo(a[0],a[1]);x.lineTo(b[0],b[1]);x.lineTo(c[0],c[1]);x.closePath();x.fill();x.lineWidth=1.4;x.strokeStyle='rgba(0,0,0,0.45)';x.stroke();return;}
    // split longest edge at jittered midpoint
    const e=[[a,b],[b,c],[c,a]];let li=0,lm=0;for(let i=0;i<3;i++){const dd=Math.hypot(e[i][0][0]-e[i][1][0],e[i][0][1]-e[i][1][1]);if(dd>lm){lm=dd;li=i;}}
    const p=e[li][0],q=e[li][1],t=0.4+r()*0.2,m=[p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t];const opp=[a,b,c][(li+2)%3];
    tri(p,m,opp,d-1);tri(m,q,opp,d-1);}
  tri([0,0],[W,0],[0,H],depth);tri([W,0],[W,H],[0,H],depth);
  // subtle light + grain
  const lg=x.createLinearGradient(0,0,W,H);lg.addColorStop(0,'rgba(255,255,255,0.06)');lg.addColorStop(1,'rgba(0,0,0,0.12)');x.save();x.globalCompositeOperation='overlay';x.fillStyle=lg;x.fillRect(0,0,W,H);x.restore();
  x.save();x.globalAlpha=0.04;for(let i=0;i<W*H/1400;i++){x.fillStyle=r()<0.5?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
}
function castFacets(seed){const r=rng(seed);const palI=Math.floor(r()*FAC_PALS.length);const fmt=pick(FAC_FMTS,r);const depth=pick([6,7,8,9],r);return {palette:FAC_PALS[palI].name, format:fmt.t, shards:depth<=6?'Bold':depth<=8?'Fine':'Splinter'};}

/* AUTOMATON — "Automaton": elementary cellular automata grown into crisp pixel
   fractals (Avalanche-spirit: computed, structured, loads instantly). */

/* Facets */
export const facetsTraits: TraitsFn = (id) => { const c = castFacets(id) as any; return { Palette: c.palette, Format: c.format, Shards: c.shards }; };
export const facetsSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Jewel','Dusk','Cool','Warm Stone','Mono'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Shards', values: ['Bold','Fine','Splinter'] },
] };
export const renderFacets = blit(facets, facetsTraits);
export const FACETS_ASPECTS = [1, 0.78, 1.28] as const;
