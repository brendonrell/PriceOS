// @ts-nocheck
/*
 * Moiré — engine built but never wired to a project (no index section, no
 * registry entry). Preserved verbatim from the retired core.ts blob
 * (2026-07-03) so the frozen art code isn't lost; export kept so the
 * file is importable the day it gets a project.
 */
import { rng, pick } from './_kit';

/* MOIRE — "Moiré": two overlaid line systems beating into interference. */
const MOI_PALS=[
  {name:'Mono', bg:'#0a0a0c', a:'#f0f0f4', b:'#f0f0f4'},
  {name:'Duo', bg:'#06060c', a:'#00e5ff', b:'#ff2a6d'},
  {name:'Sun', bg:'#0c0a04', a:'#ffd23f', b:'#ff5400'},
  {name:'Ink', bg:'#efe9dd', a:'#1a1713', b:'#6e2a28'},
  {name:'Iris', bg:'#0a0414', a:'#b388ff', b:'#39ffd0'},
];
const MOI_FMTS=[{W:1080,H:1080,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'}];
function moire(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*MOI_PALS.length);
  const fmt=pick(MOI_FMTS,r);
  const kind=pick(['rings','lines','grid'],r);
  // ---- end trait draws ----
  const P=MOI_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H), dark=P.bg<'#888888';
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  function layer(col,ox,oy,rot,sp){x.save();if(dark){x.globalCompositeOperation='lighter';}x.strokeStyle=col;x.globalAlpha=dark?0.7:0.55;x.lineWidth=1.7;x.translate(W/2+ox,H/2+oy);x.rotate(rot);
    if(kind==='rings'){for(let rr=sp;rr<Math.max(W,H);rr+=sp){x.beginPath();x.arc(0,0,rr,0,6.283);x.stroke();}}
    else if(kind==='lines'){for(let yy=-H;yy<H;yy+=sp){x.beginPath();x.moveTo(-W,yy);x.lineTo(W,yy);x.stroke();}}
    else {for(let yy=-H;yy<H;yy+=sp){x.beginPath();x.moveTo(-W,yy);x.lineTo(W,yy);x.stroke();}for(let xx=-W;xx<W;xx+=sp){x.beginPath();x.moveTo(xx,-H);x.lineTo(xx,H);x.stroke();}}
    x.restore();x.globalAlpha=1;}
  const sp=S*(0.012+r()*0.02);
  layer(P.a,0,0,0,sp);
  layer(P.b,(r()-0.5)*S*0.08,(r()-0.5)*S*0.08, kind==='rings'?0.04+r()*0.06:(0.06+r()*0.16), sp*1.08);
  const vg=x.createRadialGradient(W/2,H/2,S*0.3,W/2,H/2,Math.max(W,H)*0.7);vg.addColorStop(0,'transparent');vg.addColorStop(1,dark?'rgba(0,0,0,0.5)':'rgba(40,30,20,0.12)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castMoire(seed){const r=rng(seed);const palI=Math.floor(r()*MOI_PALS.length);const fmt=pick(MOI_FMTS,r);const kind=pick(['rings','lines','grid'],r);return {palette:MOI_PALS[palI].name, format:fmt.t, pattern:kind.charAt(0).toUpperCase()+kind.slice(1)};}

/* SEEDHEAD — "Seedhead": golden-angle phyllotaxis dot spiral. */

export { castMoire, moire };
