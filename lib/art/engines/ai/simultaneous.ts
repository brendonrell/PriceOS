// @ts-nocheck
/*
 * Simultaneous — interacting colour fields — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, mix, rgba, grain, vignette, mottle, blit, INVPHI } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

function paperTooth(x,W,H,r){x.save();x.globalCompositeOperation='overlay';for(let i=0;i<W*H/240;i++){const g=r()<0.5?0:255;x.fillStyle='rgba('+g+','+g+','+g+','+(r()*0.06)+')';x.fillRect(r()*W,r()*H,1.3,1.3);}x.restore();}
// multi-octave-ish tinted mottle inside the current clip — the key "texture
// inside the fill" move that reads as material, not vector.
const SM_PALS=[
  {name:'Cadmium / Cyan', harmony:'Complementary', g:'#0f5c63', f:'#e8472b', a:'#e6b24a'},
  {name:'Ultramarine / Amber', harmony:'Complementary', g:'#1d2a86', f:'#f2a416', a:'#e7e1cf'},
  {name:'Magenta / Viridian', harmony:'Complementary', g:'#0a5f48', f:'#be2f72', a:'#f0cf8a'},
  {name:'Sienna / Teal', harmony:'Split', g:'#1f7c84', f:'#c2532a', a:'#e9b04a'},
  {name:'Plum / Chartreuse', harmony:'Split', g:'#492560', f:'#9aa636', a:'#d98aa0'},
  {name:'Ochre Triad', harmony:'Triad', g:'#2a5fb0', f:'#d99a16', a:'#c0345a'},
  {name:'Rose Analogous', harmony:'Analogous', g:'#7a1f5a', f:'#d94f6a', a:'#f2a35a'},
  {name:'Forest Analogous', harmony:'Analogous', g:'#13483a', f:'#3f8f4f', a:'#cfd96a'},
  {name:'Slate / Coral', harmony:'Complementary', g:'#2d3a4a', f:'#e3654f', a:'#ffd9a0'},
  {name:'Oxblood / Sky', harmony:'Complementary', g:'#7a2420', f:'#4aa6c2', a:'#e8c46a'},
];
const SM_FMTS=[{W:1080,H:1080,t:'Square'},{W:1000,H:1240,t:'Portrait'},{W:1240,H:1000,t:'Landscape'}];
const SM_SCAFFOLD=['Field','Split','Quadrant','Bands'];
const SM_MOTIF=['Disc','Fan','Rings','Wedge','Bars'];
function simultaneous(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*SM_PALS.length);
  const fmt=pick(SM_FMTS,r);
  const scaffold=pick(SM_SCAFFOLD,r);
  const motif=pick(SM_MOTIF,r);
  const key=r()<0.5?'High':'Low';
  const grainLvl=pick(['Fine','Medium','Heavy'],r);
  // ---- end trait draws ----
  const P=SM_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d');
  const S=Math.min(W,H); const dark=key==='Low';
  const tone=c=>dark?mix(c,'#fff',0.1):mix(c,'#fff',0.03);
  const deck=[P.f,P.a,mix(P.f,P.a,0.5),mix(P.g,P.a,0.5),mix(P.g,P.f,0.55),P.g].map(tone);
  const ground=dark?mix(P.g,'#000',0.34):mix(P.g,'#fff',0.08);
  const blend=dark?'screen':'multiply';
  const rndCol=()=>deck[Math.floor(r()*deck.length)];
  const gg=x.createLinearGradient(0,0,0,H);gg.addColorStop(0,mix(ground,'#fff',0.05));gg.addColorStop(1,mix(ground,'#000',0.07));x.fillStyle=gg;x.fillRect(0,0,W,H);
  // ink a path: misregistration ghost + flat + interior mottle + optional keyline
  function inked(path,col,doKey,edge){
    x.save();x.globalCompositeOperation=blend;x.globalAlpha=0.42;x.translate((r()-0.5)*S*0.016,(r()-0.5)*S*0.016);x.fillStyle=edge||rndCol();path();x.fill();x.restore();
    x.save();x.globalCompositeOperation=blend;x.globalAlpha=0.84+r()*0.12;x.fillStyle=col;path();x.fill();x.restore();
    x.save();path();x.clip();mottle(x,0,0,W,H,col,560,r,blend);x.restore();
    if(doKey){x.save();x.globalAlpha=0.8;x.lineWidth=Math.max(1.2,S*0.0035);x.strokeStyle=edge||mix(col,'#000',0.4);path();x.stroke();x.restore();}
  }
  function fillField(x0,y0,w,h,col){x.save();x.globalCompositeOperation=blend;x.globalAlpha=0.82;x.beginPath();x.rect(x0,y0,w,h);x.clip();x.fillStyle=col;x.fillRect(x0,y0,w,h);mottle(x,x0,y0,w,h,col,560,r,blend);x.restore();}
  const disc=(px,py,rad,col,k,e)=>inked(()=>{x.beginPath();x.arc(px,py,rad,0,6.29);},col,k,e);
  const bar=(px,py,w,h,ang,col,k,e)=>{const ca=Math.cos(ang),sa=Math.sin(ang);const p=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([X,Y])=>[px+X*ca-Y*sa,py+X*sa+Y*ca]);inked(()=>{x.beginPath();x.moveTo(p[0][0],p[0][1]);for(let i=1;i<4;i++)x.lineTo(p[i][0],p[i][1]);x.closePath();},col,k,e);};
  const wedge=(px,py,rad,a0,a1,col,k,e)=>inked(()=>{x.beginPath();x.moveTo(px,py);x.arc(px,py,rad,a0,a1);x.closePath();},col,k,e);
  function rings(px,py,rad,nb,a0,a1){let rr=rad;const step=rad/nb;for(let i=0;i<nb;i++){const r1=rr,r0=Math.max(0,rr-step);inked(()=>{x.beginPath();x.arc(px,py,r1,a0,a1);x.arc(px,py,r0,a1,a0,true);x.closePath();},deck[i%deck.length], i%2===0);rr-=step;}}
  const half=(ang,off,col)=>bar(W/2+Math.cos(ang+Math.PI/2)*off,H/2+Math.sin(ang+Math.PI/2)*off,S*3.2,S*3.2,ang,col,false);

  // ── scaffold (structural variety) ──
  if(scaffold==='Split'){const n=rint(r,1,2);for(let i=0;i<n;i++)half((r()-0.5)*Math.PI,(0.1+r()*0.4)*S*(r()<0.5?1:-1),rndCol());}
  else if(scaffold==='Quadrant'){const vx=W*(0.32+r()*0.36),hy=H*(0.32+r()*0.36);const cells=[[0,0,vx,hy],[vx,0,W-vx,hy],[0,hy,vx,H-hy],[vx,hy,W-vx,H-hy]];cells.forEach((c,i)=>{if(r()<0.8)fillField(c[0],c[1],c[2],c[3],deck[(i+1)%deck.length]);});}
  else if(scaffold==='Bands'){const n=rint(r,3,5),vert=r()<0.4;const splits=[];let acc=0;for(let i=0;i<n;i++){const w=0.5+r();splits.push(w);acc+=w;}let p=0;for(let i=0;i<n;i++){const len=(vert?W:H)*splits[i]/acc;if(vert)fillField(p,0,len+1,H,deck[i%deck.length]);else fillField(0,p,W,len+1,deck[i%deck.length]);p+=len;}}

  // ── hero motif on a phi anchor ──
  const hx=W*(r()<0.5?INVPHI:1-INVPHI)+(r()-0.5)*W*0.1, hy=H*(r()<0.5?INVPHI:1-INVPHI)+(r()-0.5)*H*0.1;
  const HR=S*(0.24+r()*0.12);
  if(motif==='Disc'){disc(hx,hy,HR,rndCol(),true,rndCol());}
  else if(motif==='Fan'){const a0=r()*6.283;rings(hx,hy,HR*1.4,rint(r,4,7),a0,a0+Math.PI*(0.6+r()*0.9));}
  else if(motif==='Rings'){rings(hx,hy,HR*1.25,rint(r,5,8),0,6.283);}
  else if(motif==='Wedge'){const a0=r()*6.283;wedge(hx,hy,HR*1.6,a0,a0+Math.PI*(0.4+r()*0.5),rndCol(),true,rndCol());}
  else {const n=rint(r,3,6),ang=(r()<0.5?0:Math.PI/2)+(r()-0.5)*0.5;for(let i=0;i<n;i++)bar(hx+(i-(n-1)/2)*S*0.07*Math.cos(ang+Math.PI/2),hy+(i-(n-1)/2)*S*0.07*Math.sin(ang+Math.PI/2),S*(0.5+r()*0.3),S*(0.035+r()*0.04),ang,deck[i%deck.length], r()<0.3);}

  // ── supporting forms ──
  const nS=rint(r,2,3);
  for(let k=0;k<nS;k++){const sx=W*(0.14+r()*0.72),sy=H*(0.14+r()*0.72),sr=S*(0.06+r()*0.13);const t=pick(['disc','wedge','bar','rings'],r);
    if(t==='disc')disc(sx,sy,sr,rndCol(),r()<0.5,rndCol());
    else if(t==='wedge'){const a0=r()*6.283;wedge(sx,sy,sr*1.4,a0,a0+Math.PI*(0.4+r()*0.6),rndCol(),r()<0.4);}
    else if(t==='bar')bar(sx,sy,sr*2.4,sr*0.4,(r()-0.5)*Math.PI,rndCol(),r()<0.3);
    else rings(sx,sy,sr*1.1,rint(r,3,5),0,6.283);}

  // ── small accents (rhythm) ──
  const nd=rint(r,3,7);for(let i=0;i<nd;i++){x.save();x.globalCompositeOperation=blend;x.globalAlpha=0.9;x.fillStyle=P.a;x.beginPath();x.arc(W*(0.1+r()*0.8),H*(0.1+r()*0.8),S*(0.01+r()*0.018),0,6.29);x.fill();x.restore();}
  if(r()<0.6){x.save();x.globalAlpha=0.8;x.strokeStyle=dark?mix(P.a,'#fff',0.2):mix(P.g,'#000',0.2);x.lineWidth=Math.max(1.5,S*0.004);const yy=H*INVPHI;x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy+(r()-0.5)*H*0.1);x.stroke();x.restore();}

  // ── print texture ──
  function screen(col,ang,cell,a){x.save();x.globalCompositeOperation='multiply';x.globalAlpha=a;x.translate(W/2,H/2);x.rotate(ang);x.fillStyle=col;const R=Math.hypot(W,H);for(let yy=-R;yy<R;yy+=cell)for(let xx=-R;xx<R;xx+=cell){x.beginPath();x.arc(xx,yy,cell*0.2,0,6.29);x.fill();}x.restore();}
  const cell=grainLvl==='Heavy'?7:grainLvl==='Medium'?10:14;
  screen(P.f,Math.PI/4,cell,0.05);screen(P.a,Math.PI*5/12,cell*1.15,0.045);
  const amt=grainLvl==='Heavy'?440:grainLvl==='Medium'?800:1500;
  x.save();for(let i=0;i<W*H/amt;i++){x.fillStyle=rgba(r()<0.5?P.f:P.a,0.05+r()*0.06);x.fillRect(r()*W,r()*H,1.6,1.6);}x.restore();
  paperTooth(x,W,H,r);
  grain(x,W,H,1400,r);
  vignette(x,W,H,dark?0.32:0.16);
}
function castSimultaneous(seed){const r=rng(seed);const palI=Math.floor(r()*SM_PALS.length);const fmt=pick(SM_FMTS,r);const scaffold=pick(SM_SCAFFOLD,r);const motif=pick(SM_MOTIF,r);const key=r()<0.5?'High':'Low';const grainLvl=pick(['Fine','Medium','Heavy'],r);return {palette:SM_PALS[palI].name, harmony:SM_PALS[palI].harmony, scaffold, motif, key};}

/* ========================================================================
 * 4. STRATA — pressed-pigment sediment fields. In-band optical mottle (now
 *    on light bands + calm field too), soft-bleed & hard-fault seams, tinted
 *    clustered grit, phi-placed dominant band + negative-space crop.
 *    5 modes: Bedded / Folded / Faulted / Lens / Unconformity.
 * ====================================================================== */

/* Simultaneous — interacting colour fields */
export const simultaneousTraits: TraitsFn = (id) => { const c = castSimultaneous(id) as any; return { Palette: c.palette, Harmony: c.harmony, Scaffold: c.scaffold, Motif: c.motif, Key: c.key }; };
export const simultaneousSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Cadmium / Cyan','Ultramarine / Amber','Magenta / Viridian','Sienna / Teal','Plum / Chartreuse','Ochre Triad','Rose Analogous','Forest Analogous','Slate / Coral','Oxblood / Sky'],
    subtraits: [
      { name: 'Opposed', values: ['Cadmium / Cyan', 'Ultramarine / Amber', 'Magenta / Viridian', 'Sienna / Teal', 'Plum / Chartreuse', 'Slate / Coral', 'Oxblood / Sky'] },
      { name: 'Kindred', values: ['Ochre Triad', 'Rose Analogous', 'Forest Analogous'] },
    ] },
  { name: 'Harmony', values: ['Complementary','Split','Triad','Analogous'],
    subtraits: [
      { name: 'Contrast', values: ['Complementary', 'Split', 'Triad'] },
      { name: 'Adjacent', values: ['Analogous'] },
    ] },
  { name: 'Scaffold', values: ['Field','Split','Quadrant','Bands'] },
  { name: 'Motif', values: ['Disc','Fan','Rings','Wedge','Bars'],
    subtraits: [
      { name: 'Round', values: ['Disc', 'Rings'] },
      { name: 'Angular', values: ['Fan', 'Wedge', 'Bars'] },
    ] },
  { name: 'Key', values: ['High','Low'] },
] };
export const renderSimultaneous = blit(simultaneous, simultaneousTraits);
export const SIMULTANEOUS_ASPECTS = [1, 0.81, 1.24] as const;
