// @ts-nocheck
/*
 * Konkret — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shuffle, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const KON_PALS=[
  {name:'De Stijl', bg:'#f1ece0', ink:'#15120d', cols:['#c0392b','#21408a','#e6b80e']},
  {name:'Bauhaus', bg:'#ece5d6', ink:'#1a1a18', cols:['#b8402f','#2d6a9f','#e0a92e']},
  {name:'Concrete', bg:'#e7e4db', ink:'#23211e', cols:['#a8472f','#3f7d6e','#caa23a','#46577a']},
  {name:'Graphite', bg:'#eae8e1', ink:'#1d1d1d', cols:['#3a3a3a','#727272','#a6a39c']},
  {name:'Ochre & Slate', bg:'#efe7d4', ink:'#2b2a26', cols:['#b8742a','#3f5a6b','#7e8b6e']},
  {name:'Oxblood', bg:'#ebe4d6', ink:'#221414', cols:['#6e1e22','#a89b86','#3b4a52']},
  {name:'Indigo & Cream', bg:'#f0ead8', ink:'#1b2a41', cols:['#1b2a41','#b08d57','#7d6b8a']},
  {name:'Sage', bg:'#e8e7dc', ink:'#2a2c27', cols:['#7e8b6e','#b8742a','#46504a']},
];
const KON_FMTS=[{W:1100,H:1100,t:'Square'},{W:940,H:1180,t:'Portrait'},{W:1180,H:940,t:'Landscape'},{W:860,H:1240,t:'Tall'}];
const KON_MODES=['grid','destijl','concentric','lines','bauhaus','columns'];
function konkret(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*KON_PALS.length);
  const fmt=pick(KON_FMTS,r);
  const mode=pick(KON_MODES,r);
  const dens=rint(r,1,3);
  // ---- end trait draws ----
  const P=KON_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  // generous asymmetric margins (canon-ish): more bottom/right
  const mL=Math.round(W*0.11), mR=Math.round(W*0.13), mT=Math.round(H*0.10), mB=Math.round(H*0.15);
  const X0=mL, Y0=mT, CW=W-mL-mR, CH=H-mT-mB;
  const col=()=>pick(P.cols,r);
  if(mode==='grid'){
    // Lohse modular colour grid
    const G=4+dens+ (r()<0.5?1:0), g2=Math.max(3,Math.round(G*CH/CW));
    const cw=CW/G, ch=CH/g2, gut=Math.max(2,cw*0.06);
    const a=rint(r,1,4), b=rint(r,1,4);
    for(let j=0;j<g2;j++)for(let i=0;i<G;i++){
      const v=((i*a+j*b)%(P.cols.length+2));
      const cx=X0+i*cw, cy=Y0+j*ch;
      if(v<P.cols.length){x.fillStyle=P.cols[v]; x.fillRect(cx+gut,cy+gut,cw-2*gut,ch-2*gut);}
      else if(v===P.cols.length){x.fillStyle=P.ink;x.beginPath();x.arc(cx+cw/2,cy+ch/2,Math.min(cw,ch)/2-gut,0,6.29);x.fill();}
      // else: paper (empty) — the breathing space
    }
  } else if(mode==='destijl'){
    // Mondrian: recursive splits, primaries in a few cells
    let cells=[{x:X0,y:Y0,w:CW,h:CH}];
    const splits=3+dens;
    for(let s=0;s<splits;s++){cells.sort((p,q)=>q.w*q.h-p.w*p.h);const c=cells.shift();const horiz=c.w>c.h? false:true; const f=0.35+r()*0.3;
      if(c.w>=c.h){cells.push({x:c.x,y:c.y,w:c.w*f,h:c.h},{x:c.x+c.w*f,y:c.y,w:c.w*(1-f),h:c.h});}
      else{cells.push({x:c.x,y:c.y,w:c.w,h:c.h*f},{x:c.x,y:c.y+c.h*f,w:c.w,h:c.h*(1-f)});}}
    const nFill=rint(r,2,4); const order=shuffle(cells.map((_,i)=>i),r);
    cells.forEach((c,i)=>{const fillIt=order.indexOf(i)<nFill; x.fillStyle= fillIt? col() : P.bg; x.fillRect(c.x,c.y,c.w,c.h);});
    // thick black lines
    x.strokeStyle=P.ink; x.lineWidth=Math.max(6,W*0.012);
    cells.forEach(c=>x.strokeRect(c.x,c.y,c.w,c.h));
    x.strokeRect(X0,Y0,CW,CH);
  } else if(mode==='concentric'){
    // Vera Molnár: grid of nested squares with growing désordre
    const G=4+dens, cw=CW/G, cell=cw*0.84;
    const g2=Math.max(3,Math.round(CH/cw));
    for(let j=0;j<g2;j++)for(let i=0;i<G;i++){
      const cx=X0+i*cw+cw/2, cy=Y0+j*cw+cw/2; if(cy>Y0+CH)continue;
      const dis=(i/G)*(j/g2); // disorder grows across the field
      const rings=rint(r,3,6); const c=r()<0.18?col():P.ink;
      x.strokeStyle=c; x.lineWidth=Math.max(1,cw*0.02);
      for(let k=rings;k>=1;k--){const sz=cell*k/rings;
        x.save(); x.translate(cx+(r()-0.5)*dis*cw*0.5, cy+(r()-0.5)*dis*cw*0.5); x.rotate((r()-0.5)*dis*0.9);
        x.strokeRect(-sz/2,-sz/2,sz,sz); x.restore();}
    }
  } else if(mode==='lines'){
    // Swiss line field with one rotated intervention band
    const n=Math.round((CH)/(8+ (3-dens)*5));
    const gap=CH/n; const accent=col();
    const bandA=rint(r,2,n-3), bandB=Math.min(n-1,bandA+rint(r,2,6));
    for(let i=0;i<=n;i++){const y=Y0+i*gap; const inBand=i>=bandA&&i<=bandB;
      x.strokeStyle= inBand? accent : P.ink; x.lineWidth= inBand? Math.max(2,H*0.004):1;
      x.save(); if(inBand){x.translate(X0+CW/2,y); x.rotate((r()-0.5)*0.12); x.beginPath();x.moveTo(-CW/2,0);x.lineTo(CW/2,0);x.stroke();} else {x.beginPath();x.moveTo(X0,y);x.lineTo(X0+CW,y);x.stroke();} x.restore();}
  } else if(mode==='bauhaus'){
    // composed primitives in asymmetric balance
    const cxn=X0+CW*(0.4+r()*0.2), cyn=Y0+CH*(0.4+r()*0.2);
    // big disc
    x.fillStyle=col(); x.beginPath();x.arc(cxn,cyn,CW*(0.16+r()*0.08),0,6.29);x.fill();
    // triangle
    x.save();x.translate(X0+CW*(0.25+r()*0.5),Y0+CH*(0.3+r()*0.5));x.rotate(r()*6.29);x.fillStyle=col();const ts=CW*(0.12+r()*0.1);x.beginPath();x.moveTo(0,-ts);x.lineTo(ts*0.9,ts*0.7);x.lineTo(-ts*0.9,ts*0.7);x.closePath();x.globalAlpha=0.92;x.fill();x.restore();x.globalAlpha=1;
    // bar
    x.save();x.translate(X0+CW*(0.2+r()*0.6),Y0+CH*(0.2+r()*0.6));x.rotate((r()<0.5?0:1.5708)+(r()-0.5)*0.4);x.fillStyle=P.ink;x.fillRect(-CW*0.22,-W*0.012,CW*0.44,W*0.024);x.restore();
    // thin long line
    x.strokeStyle=P.ink;x.lineWidth=Math.max(2,W*0.004);x.beginPath();x.moveTo(X0,Y0+CH*r());x.lineTo(X0+CW,Y0+CH*r());x.stroke();
    // small accent square
    x.fillStyle=col();const ss=CW*0.06;x.fillRect(X0+CW*r(),Y0+CH*r(),ss,ss);
  } else { // columns — Lohse/Gerstner rhythm
    let cx=X0; const colsArr=[];
    while(cx<X0+CW-4){const w=CW*(0.03+r()*0.10); colsArr.push({x:cx,w:Math.min(w,X0+CW-cx)}); cx+=w+CW*0.012;}
    colsArr.forEach((c,i)=>{ const fillIt=r()<0.62; x.fillStyle= fillIt? (r()<0.7?col():P.ink) : P.bg; const h=CH*(0.55+r()*0.45); const top=Y0+(r()<0.5?0:CH-h); if(fillIt)x.fillRect(c.x,top,c.w,h);});
  }
  // ---- finish: subtle paper grain + faint plate-mark ----
  x.save();x.globalAlpha=0.035;x.globalCompositeOperation='multiply';for(let i=0;i<W*H/1200;i++){x.fillStyle='#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  x.strokeStyle='rgba(0,0,0,0.10)';x.lineWidth=1;x.strokeRect(mL*0.5,mT*0.5,W-mL*0.5-mR*0.5,H-mT*0.5-mB*0.5);
}
function castKonkret(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*KON_PALS.length);
  const fmt=pick(KON_FMTS,r);
  const mode=pick(KON_MODES,r);
  return {palette:KON_PALS[palI].name, format:fmt.t, system:mode};
}

/* RUDXANE — "Ode to Rudxane": a fine-press pronunciation specimen for PD's
   first member, whose name nobody can say. Each edition sets RUDXANE once with
   letterpress deboss + a DIFFERENT plausible pronunciation (IPA + respelling),
   a deadpan gloss, and a dry "var." footnote — the joke is that the set never
   agrees. Editorial type, fine-press palettes, paper + plate-mark. Classy. */

/* Konkret */
export const konkretTraits: TraitsFn = (id) => { const c = castKonkret(id) as any; return { Palette: c.palette, Format: c.format, System: cap(c.system) }; };
export const konkretSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['De Stijl','Bauhaus','Concrete','Graphite','Ochre & Slate','Oxblood','Indigo & Cream','Sage'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'System', values: ['Grid','Destijl','Concentric','Lines','Bauhaus','Columns'] },
] };
export const renderKonkret = blit(konkret, konkretTraits);
export const KONKRET_ASPECTS = [1, 0.8, 1.26, 0.69] as const;
