// @ts-nocheck
/*
 * Weft — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, fbm2, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const WEFT_PALS=[
  {name:'Albers', bg:'#e9e2d0', cols:['#b5462f','#3f5a6b','#caa23a','#7e8b6e','#2b2b28']},
  {name:'Stölzl', bg:'#ece4cf', cols:['#a8472f','#46577a','#c89a3a','#6e7b82','#3a3128']},
  {name:'Clay', bg:'#ece3d2', cols:['#b87a4a','#8a5a3a','#caa86a','#5c4a3a','#9a8a6a']},
  {name:'Indigo', bg:'#e7e2d4', cols:['#26304a','#5b6b8c','#b08d57','#9aa0ae','#3a3a3a']},
  {name:'Rose Dust', bg:'#efe6dc', cols:['#c8a2a0','#9db0a8','#b8742a','#6e5a66','#3a3531']},
  {name:'Sage & Ochre', bg:'#e8e7dc', cols:['#7e8b6e','#b8742a','#46504a','#caa23a','#2a2c27']},
  {name:'Slate Teal', bg:'#e6e4db', cols:['#2f5d5a','#7aa8a0','#caa23a','#46577a','#2b2b28']},
  {name:'Charcoal', bg:'#e4e2da', cols:['#2d2d2d','#6f6f6f','#b5462f','#a6a39c','#46577a']},
];
const WEFT_FMTS=[{W:1100,H:1100,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'},{W:880,H:1240,t:'Tall'}];
function weft(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*WEFT_PALS.length);
  const fmt=pick(WEFT_FMTS,r);
  const dens=pick(['Loose','Medium','Fine'],r);
  const gridOn=r()<0.5;
  const panel=pick(['full','banded'],r);
  const structure=pick(['plain','twill','tartan','ikat'],r);
  // ---- end trait draws ----
  const P=WEFT_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  const NO=seed*0.017+3, freq=0.0016+ (seed%7)*0.0003, kTurn=1.0+ (seed%5)*0.35, aniso=0.7+ ((seed*7)%100)/360;
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  const M=Math.round(S*0.08), X0=M,Y0=M,CW=W-2*M,CH=H-2*M;
  if(gridOn){x.strokeStyle='rgba(0,0,0,0.05)';x.lineWidth=1;for(let gx=X0;gx<=X0+CW;gx+=S*0.03){x.beginPath();x.moveTo(gx,Y0);x.lineTo(gx,Y0+CH);x.stroke();}for(let gy=Y0;gy<=Y0+CH;gy+=S*0.03){x.beginPath();x.moveTo(X0,gy);x.lineTo(X0+CW,gy);x.stroke();}}
  const dsep= dens==='Fine'? S*0.0055 : dens==='Medium'? S*0.009 : S*0.015;
  const step=S*0.01, maxLen=Math.round((dens==='Fine'?2.2:1.8)*S/step);
  function field(px,py,bias){const a=fbm2(px*freq+NO,py*freq)*6.283*kTurn;const bx=Math.cos(bias)*aniso+Math.cos(a)*(1-aniso), by=Math.sin(bias)*aniso+Math.sin(a)*(1-aniso);return Math.atan2(by,bx);}
  function thread(sx,sy,bias,col,alpha,wid){let px=sx,py=sy; const pts=[[px,py]];
    for(let i=0;i<maxLen;i++){const a=field(px,py,bias);px+=Math.cos(a)*step;py+=Math.sin(a)*step;if(px<X0-4||py<Y0-4||px>X0+CW+4||py>Y0+CH+4)break;pts.push([px,py]);if(r()<0.005)break;}
    if(pts.length<2)return; x.strokeStyle=col;x.globalAlpha=alpha;x.lineWidth=wid;x.lineCap='round';x.beginPath();
    for(let i=0;i<pts.length;i++){if(i===0)x.moveTo(pts[i][0],pts[i][1]);else x.lineTo(pts[i][0],pts[i][1]);}x.stroke();x.globalAlpha=1;}
  const wid= dens==='Fine'? 1.1 : dens==='Medium'? 1.6 : 2.2;
  const twW= structure==='twill'?1.5708-0.55:1.5708, twF= structure==='twill'?0.55:0, band=dsep*rint(r,4,8), L=P.cols.length;
  function tcol(p,off){ if(structure==='tartan')return P.cols[((Math.floor(p/band)+off)%L+L)%L]; if(structure==='ikat'){const pp=p+(fbm2(p*0.02+NO,off)-0.5)*band*1.6;return P.cols[((Math.floor(pp/band)+off)%L+L)%L];} return P.cols[((Math.floor(fbm2(p*freq*2+NO,off?9:0.5)*L)+off)%L+L)%L]; }
  for(let sx=X0; sx<=X0+CW; sx+=dsep){ const jitter=(r()-0.5)*dsep*0.4; thread(sx+jitter, Y0-2, twW, tcol(sx,0), 0.42+r()*0.2, wid*(0.8+r()*0.5)); }
  for(let sy=Y0; sy<=Y0+CH; sy+=dsep){ if(panel==='banded' && ((sy/(S*0.12))|0)%2===1) continue; const jitter=(r()-0.5)*dsep*0.4; thread(X0-2, sy+jitter, twF, tcol(sy,2), 0.4+r()*0.2, wid*(0.8+r()*0.5)); }
  x.save();x.globalAlpha=0.04;x.globalCompositeOperation='multiply';for(let i=0;i<W*H/1100;i++){x.fillStyle='#000';x.fillRect(X0+r()*CW,Y0+r()*CH,1,1);}x.restore();
  x.strokeStyle='rgba(0,0,0,0.16)';x.lineWidth=1.5;x.strokeRect(X0,Y0,CW,CH);
}
function castWeft(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*WEFT_PALS.length);
  const fmt=pick(WEFT_FMTS,r);
  const dens=pick(['Loose','Medium','Fine'],r);
  const gridOn=r()<0.5;
  const panel=pick(['full','banded'],r);
  const structure=pick(['plain','twill','tartan','ikat'],r);
  return {palette:WEFT_PALS[palI].name, format:fmt.t, density:dens, weave:structure.charAt(0).toUpperCase()+structure.slice(1), panel:panel==='banded'?'Banded':'Full'};
}

/* PRICEDISCOVERY — "Price Discovery": the order book as a luminous canyon.
   A synthetic limit-order book (cumulative bid/ask depth + walls + volume
   profile) becomes mirrored sedimentary terrain rising away from a glowing
   spread seam. Data drives the macro silhouette; fBm supplies micro texture.
   No axes, no chart — it must read as place. cast mirrors the leads. */

/* Weft */
export const weftTraits: TraitsFn = (id) => { const c = castWeft(id) as any; return { Palette: c.palette, Format: c.format, Density: c.density, Weave: c.weave, Panel: c.panel }; };
export const weftSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Albers','Stölzl','Clay','Indigo','Rose Dust','Sage & Ochre','Slate Teal','Charcoal'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall'] },
  { name: 'Density', values: ['Loose','Medium','Fine'] },
  { name: 'Weave', values: ['Plain','Twill','Tartan','Ikat'] },
  { name: 'Panel', values: ['Full','Banded'] },
] };
export const renderWeft = blit(weft, weftTraits);
export const WEFT_ASPECTS = [1, 0.78, 1.28, 0.71] as const;
