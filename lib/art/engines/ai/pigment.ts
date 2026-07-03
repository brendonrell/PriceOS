// @ts-nocheck
/*
 * Pigment — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shade, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const ITTEN=['#f7d800','#f3a000','#ef6c00','#e23b30','#c01f5b','#8e24aa','#5e35b1','#3949ab','#1e88e5','#00897b','#43a047','#9bc53d'];
const PIG_FMTS=[{W:1100,H:1100,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'},{W:880,H:1240,t:'Tall'}];
const PIG_MODES=['walk','axon','field'];
function pigment(cv,seed){
  const r=rng(seed);
  const fmt=pick(PIG_FMTS,r);
  const harmony=pick(['Complementary','Triad','Analogous','Split'],r);
  const mode=pick(PIG_MODES,r);
  const dark=r()<0.4;
  // ---- end trait draws ----
  const W=fmt.W,H=fmt.H; cv.width=W; cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  const base=Math.floor(r()*12); const HM={Complementary:[0,6],Triad:[0,4,8],Analogous:[0,1,11],Split:[0,5,7]}[harmony];
  const cols=HM.map(o=>ITTEN[(base+o)%12]);
  const bg= dark?'#0c0c10':'#efe9da'; x.fillStyle=bg; x.fillRect(0,0,W,H);
  function dots(x0,y0,w,h,col,dens){const n=(w*h)/(dens||24);for(let i=0;i<n;i++){const px=x0+r()*w,py=y0+r()*h;x.globalAlpha=0.35+r()*0.5;x.fillStyle=shade(col,(r()-0.5)*44);x.beginPath();x.arc(px,py,1+r()*2.1,0,6.29);x.fill();}x.globalAlpha=1;}
  if(mode==='walk'){
    let rects=[{x:S*0.08,y:S*0.08,w:W-S*0.16,h:H-S*0.16}];const target=rint(r,8,20);
    while(rects.length<target){rects.sort((a,b)=>b.w*b.h-a.w*a.h);const q=rects.shift(),f=0.35+r()*0.3;if(q.w>q.h)rects.push({x:q.x,y:q.y,w:q.w*f,h:q.h},{x:q.x+q.w*f,y:q.y,w:q.w*(1-f),h:q.h});else rects.push({x:q.x,y:q.y,w:q.w,h:q.h*f},{x:q.x,y:q.y+q.h*f,w:q.w,h:q.h*(1-f)});}
    rects.forEach((q,i)=>{if(r()<0.18)return;dots(q.x+2,q.y+2,q.w-4,q.h-4,cols[i%cols.length],20);});
  } else if(mode==='axon'){
    const u={x:Math.cos(-0.52),y:Math.sin(-0.52)},v={x:Math.cos(3.66),y:Math.sin(3.66)};const sz=S*0.13;
    for(let g=0;g<rint(r,5,11);g++){const ox=W*(0.2+r()*0.6),oy=H*(0.25+r()*0.5),ht=sz*(0.6+r()*1.4);
      const p=(a,b,c)=>({x:ox+u.x*a*sz+v.x*b*sz,y:oy+u.y*a*sz+v.y*b*sz-c*ht});
      // top, left, right faces as dotted quads
      const faces=[[p(0,0,1),p(1,0,1),p(1,1,1),p(0,1,1),cols[0]],[p(0,1,1),p(1,1,1),p(1,1,0),p(0,1,0),cols[1%cols.length]],[p(1,0,1),p(1,1,1),p(1,1,0),p(1,0,0),cols[2%cols.length]]];
      faces.forEach(fc=>{x.save();x.beginPath();x.moveTo(fc[0].x,fc[0].y);for(let i=1;i<4;i++)x.lineTo(fc[i].x,fc[i].y);x.closePath();x.clip();const bb={x:Math.min(fc[0].x,fc[1].x,fc[2].x,fc[3].x),y:Math.min(fc[0].y,fc[1].y,fc[2].y,fc[3].y)};dots(bb.x,bb.y,sz*1.6,ht+sz*1.6,fc[4],16);x.restore();});}
  } else {
    for(let g=0;g<rint(r,4,8);g++){const cxk=W*(0.2+r()*0.6),cyk=H*(0.2+r()*0.6),R=S*(0.1+r()*0.18),col=cols[g%cols.length];const n=R*R/6;for(let i=0;i<n;i++){const a=r()*6.29,d=Math.pow(r(),0.6)*R;x.globalAlpha=0.3+r()*0.5;x.fillStyle=shade(col,(r()-0.5)*40);x.beginPath();x.arc(cxk+Math.cos(a)*d,cyk+Math.sin(a)*d,1+r()*2,0,6.29);x.fill();}x.globalAlpha=1;}
  }
  // grain
  x.save();x.globalAlpha=0.04;x.globalCompositeOperation=dark?'screen':'multiply';for(let i=0;i<W*H/1400;i++){x.fillStyle=dark?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
}
function castPigment(seed){const r=rng(seed);const fmt=pick(PIG_FMTS,r);const harmony=pick(['Complementary','Triad','Analogous','Split'],r);const mode=pick(PIG_MODES,r);const dark=r()<0.4;return {harmony, format:fmt.t, mode:mode.charAt(0).toUpperCase()+mode.slice(1), ground:dark?'Dark':'Paper'};}

/* ISKRA — "Iskra" (homage to Iskra Velitchkova): a single organic form built
   from many fine perturbed lines, order dissolving to chaos. Muted, restraint,
   negative space. Modes: bloom (concentric), rift (paired), veil (line field). */

/* Pigment */
export const pigmentTraits: TraitsFn = (id) => { const c = castPigment(id) as any; return { Harmony: c.harmony, Format: c.format, Mode: c.mode, Ground: c.ground }; };
export const pigmentSchema: TraitSchema = { traits: [
  { name: 'Harmony', values: ['Complementary','Triad','Analogous','Split'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'Mode', values: ['Walk','Axon','Field'] },
  { name: 'Ground', values: ['Dark','Paper'] },
] };
export const renderPigment = blit(pigment, pigmentTraits);
export const PIGMENT_ASPECTS = [1, 0.78, 1.28, 0.71] as const;
