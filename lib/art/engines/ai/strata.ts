// @ts-nocheck
/*
 * Strata — pressed-pigment sediment fields — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, clamp, h2r, mix, rgba, grain, vignette, mottle, blit, INVPHI } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

function randn(r){return r()+r()+r()+r()-2;}
function lum(h){const c=h2r(h);return (0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255;}
const ST_PALS=[
  {name:'Oxide Bed', stops:['#2a1a14','#7a3b22','#c2683a','#e6a558','#ead7b4']},
  {name:'Tidewater', stops:['#0f2230','#1f5f6b','#5a9a96','#a8c2b2','#e4dcc2']},
  {name:'Ironstone', stops:['#1a1416','#5a2230','#9a3b3a','#caa24a','#e6dcc0']},
  {name:'Glacier',   stops:['#10202e','#2f5f7a','#6fa8c4','#cfe2e6','#f0ece0']},
  {name:'Verdigris', stops:['#0e1a16','#1f4a3a','#36805f','#8fb888','#e6e2c8']},
  {name:'Ember Ash', stops:['#14110f','#3a2a26','#8a3a22','#e0622a','#f2c266']},
  {name:'Amethyst',  stops:['#160f22','#3a2a5a','#6a4a8a','#a98fc4','#e6dcd0']},
  {name:'Saltflat',  stops:['#1c1a17','#5c5448','#a89878','#e0cfa0','#f4eeda']},
  {name:'Indigo Vein', stops:['#0a0f22','#1f2f6b','#3f5fb0','#8aa0d4','#e0dcc4']},
  {name:'Burnt Sienna', stops:['#221310','#572617','#a8542e','#d99a5c','#ead7b4']},
  {name:'Malachite',    stops:['#0c1813','#1c3f34','#3a7a5e','#7ba886','#dcd8bc']},
  {name:'Payne Slate',  stops:['#12161c','#33414d','#5e7280','#9aa6ac','#d6d2c4']},
  {name:'Tyrian',       stops:['#1a0e18','#4a1d36','#8a3a52','#c77a72','#e8d2bc']},
];
const ST_FMTS=[{W:1000,H:1300,t:'Portrait'},{W:1120,H:1120,t:'Square'},{W:1300,H:1000,t:'Landscape'}];
const ST_MODES=['Bedded','Folded','Faulted','Lens','Unconformity'];
function strata(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*ST_PALS.length);
  const fmt=pick(ST_FMTS,r);
  const mode=pick(ST_MODES,r);
  const bands=rint(r,5,9);
  const key=r()<0.5?'High':'Low';
  // ---- end trait draws ----
  const P=ST_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d');
  function ramp(t){t=clamp(t,0,1);const n=P.stops.length-1,ti=t*n,i=Math.min(n-1,Math.floor(ti));return mix(P.stops[i],P.stops[i+1],ti-i);}
  const flip=key==='High';
  const seedShift=r()*1000, tilt=(r()-0.5)*0.2;
  const crop = r()<0.46;
  const top0 = crop? H*(r()<0.5?0:0.32) : 0;
  const stackH = crop? H*(0.5+r()*0.18) : H;
  if(crop){const calm=ramp(flip?0.06:0.94);const cg=x.createLinearGradient(0,0,0,H);cg.addColorStop(0,mix(calm,'#000',0.05));cg.addColorStop(1,calm);x.fillStyle=cg;x.fillRect(0,0,W,H);
    // give the calm field its own faint mineral texture so it never reads as flat digital
    mottle(x,0,0,W,H,calm,700,r,'overlay');x.save();x.globalAlpha=0.04;x.strokeStyle=lum(calm)<0.5?'#fff':'#000';for(let yy=0;yy<H;yy+=4){x.beginPath();x.moveTo(0,yy+(r()-0.5));x.lineTo(W,yy);x.lineWidth=0.6;x.stroke();}x.restore();}
  const ws=[];for(let i=0;i<bands;i++)ws.push(Math.pow(r(),1.6)*0.7+0.3);
  const domIdx=clamp(Math.round((r()<0.5?0.382:0.618)*(bands-1)),1,bands-2);
  ws[domIdx]*=(1.8+r()*2.2);const acc=ws.reduce((a,b)=>a+b,0);
  const edges=[top0];let y=top0;for(let i=0;i<bands;i++){y+=stackH*ws[i]/acc;edges.push(y);}
  function disp(xx,baseY){
    let d=0;
    if(mode==='Bedded') d=Math.sin(xx*0.004+seedShift)*H*0.006;
    else if(mode==='Folded') d=(Math.sin(xx*0.006+seedShift)+0.45*Math.sin(xx*0.015+seedShift*2))*H*0.05;
    else if(mode==='Faulted') d=Math.sin(xx*0.004+seedShift)*H*0.01 + (xx>W*0.52? H*0.06:0);
    else d=Math.sin(xx*0.004+seedShift)*H*0.008;
    return baseY + d + (xx-W/2)*tilt;
  }
  if(!crop){x.fillStyle=ramp(flip?0:1);x.fillRect(0,0,W,H);}
  for(let i=0;i<bands;i++){
    const tA=i/(bands-1), tB=(i+1)/(bands-1);
    const cTop=ramp(flip?tA:1-tA), cBot=ramp(flip?tB:1-tB);
    const top=edges[i], bot=edges[i+1];
    const midHue=mix(cTop,cBot,0.5);
    const light=lum(midHue)>0.6;
    x.save();
    x.beginPath();
    for(let xx=0;xx<=W;xx+=3){const yy=disp(xx,top);xx===0?x.moveTo(xx,yy):x.lineTo(xx,yy);}
    for(let xx=W;xx>=0;xx-=3){const yy=disp(xx,bot);x.lineTo(xx,yy);}
    x.closePath();x.clip();
    const g=x.createLinearGradient(0,top-H*0.04,0,bot+H*0.04);
    g.addColorStop(0,mix(cTop,cBot,0.12));g.addColorStop(0.45,mix(midHue,'#000',0.05));g.addColorStop(0.55,mix(midHue,'#000',0.05));g.addColorStop(1,mix(cBot,cTop,0.12));
    x.fillStyle=g;x.fillRect(0,top-H*0.1,W,(bot-top)+H*0.2);
    // in-band mottle, stronger on light bands (which otherwise read as smooth gradient)
    mottle(x,0,top-2,W,(bot-top)+4, midHue, light?420:760, r, 'overlay');
    x.restore();
  }
  if(mode==='Lens'){
    const lx=W*INVPHI+(r()-0.5)*W*0.1, ly=H*(1-INVPHI)+(r()-0.5)*H*0.1, lw=W*(0.26+r()*0.14), lh=lw*(0.6+r()*0.3);
    x.save();x.globalAlpha=0.82;x.beginPath();x.ellipse(lx,ly,lw,lh,(r()-0.5)*0.4,0,6.29);x.clip();
    const lg=x.createLinearGradient(lx,ly-lh,lx,ly+lh);lg.addColorStop(0,ramp(0.85));lg.addColorStop(1,ramp(0.15));x.fillStyle=lg;x.fillRect(lx-lw,ly-lh,lw*2,lh*2);
    mottle(x,lx-lw,ly-lh,lw*2,lh*2,ramp(0.5),500,r,'overlay');
    x.restore();
    x.save();x.globalAlpha=0.4;x.strokeStyle=mix(ramp(0.5),'#fff',0.4);x.lineWidth=1.5;x.beginPath();x.ellipse(lx,ly,lw,lh,(r()-0.5)*0.4,0,6.29);x.stroke();x.restore();
  }
  const nSeams=rint(r,2,4);
  for(let s=0;s<nSeams;s++){const bi=rint(r,1,bands-1);const baseCol=ramp(bi/(bands-1));
    if(r()<0.5){
      x.save();x.globalAlpha=0.5+r()*0.4;x.strokeStyle=mix(baseCol,'#000',0.5);x.lineWidth=0.8+r()*2;x.beginPath();for(let xx=0;xx<=W;xx+=4){const yy=disp(xx,edges[bi])+(r()-0.5)*1.5;xx===0?x.moveTo(xx,yy):x.lineTo(xx,yy);}x.stroke();
      x.strokeStyle=mix(baseCol,'#fff',0.4);x.lineWidth=0.8;x.beginPath();for(let xx=0;xx<=W;xx+=4){const yy=disp(xx,edges[bi])-1.5;xx===0?x.moveTo(xx,yy):x.lineTo(xx,yy);}x.stroke();x.restore();
    } else {
      x.save();x.globalAlpha=0.4;x.strokeStyle=mix(baseCol,'#000',0.3);x.lineWidth=8+r()*10;x.filter='blur(8px)';x.beginPath();for(let xx=0;xx<=W;xx+=6){const yy=disp(xx,edges[bi]);xx===0?x.moveTo(xx,yy):x.lineTo(xx,yy);}x.stroke();x.restore();x.filter='none';
    }}
  x.save();const clusters=rint(r,18,30);for(let c=0;c<clusters;c++){const ccx=r()*W,ccy=top0+r()*stackH;const t=clamp((ccy-top0)/stackH,0,1);const base=ramp(flip?t:1-t);const n=rint(r,30,90);for(let i=0;i<n;i++){const px=ccx+randn(r)*W*0.04,py=ccy+randn(r)*H*0.03;const sp=r()<0.5?mix(base,'#000',0.36):mix(base,'#fff',0.34);x.fillStyle=rgba(sp,0.06+r()*0.12);x.fillRect(px,py,1.5,1.5);}}x.restore();
  x.save();x.globalAlpha=0.045;x.strokeStyle=lum(P.stops[0])<0.4?'#fff':'#000';for(let yy=0;yy<H;yy+=3){x.lineWidth=0.6;x.beginPath();x.moveTo(0,yy+(r()-0.5));x.lineTo(W,yy);x.stroke();}x.restore();
  grain(x,W,H,1000,r);
  vignette(x,W,H,key==='Low'?0.32:0.18);
}
function castStrata(seed){const r=rng(seed);const palI=Math.floor(r()*ST_PALS.length);const fmt=pick(ST_FMTS,r);const mode=pick(ST_MODES,r);const bands=rint(r,5,9);const key=r()<0.5?'High':'Low';return {palette:ST_PALS[palI].name, format:fmt.t, structure:mode, strata:String(bands), key};}

/* Strata — pressed-pigment sediment fields */
export const strataTraits: TraitsFn = (id) => { const c = castStrata(id) as any; return { Palette: c.palette, Format: c.format, Structure: c.structure, Strata: c.strata, Key: c.key }; };
export const strataSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Oxide Bed','Tidewater','Ironstone','Glacier','Verdigris','Ember Ash','Amethyst','Saltflat','Indigo Vein','Burnt Sienna','Malachite','Payne Slate','Tyrian'] },
  { name: 'Format', values: ['Portrait','Square','Landscape'] },
  { name: 'Structure', values: ['Bedded','Folded','Faulted','Lens','Unconformity'] },
  { name: 'Strata', values: ['5','6','7','8','9'] },
  { name: 'Key', values: ['High','Low'] },
] };
export const renderStrata = blit(strata, strataTraits);
export const STRATA_ASPECTS = [0.77, 1, 1.3] as const;
