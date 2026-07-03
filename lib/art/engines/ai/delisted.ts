// @ts-nocheck
/*
 * Delisted — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

function randn(r){return r()+r()+r()+r()-2;}
/* ============ round six: deep-variance rewrites + two true systems ============ */

/* DELISTED — every kind of chart a dead asset ever had */
function tape(cv,seed){
  const r=rng(seed);
  const kind=pick(['candles','candles','line','area','phone','bars'],r);
  const theme=pick([
    {bg:'#07090b',up:'#27c08a',dn:'#e0484f',txt:'#cfd6d2',grid:'rgba(160,180,190,0.10)'},
    {bg:'#0b0804',up:'#ffb347',dn:'#9a6420',txt:'#e8c890',grid:'rgba(255,179,71,0.09)'},
    {bg:'#f2efe6',up:'#1c1d22',dn:'#c0202e',txt:'#1c1d22',grid:'rgba(30,30,40,0.10)'},
    {bg:'#0a0014',up:'#ff2bd1',dn:'#00e5ff',txt:'#f0c8ff',grid:'rgba(255,43,209,0.10)'},
    {bg:'#04080a',up:'#c8ff00',dn:'#8a2bff',txt:'#dfffa0',grid:'rgba(200,255,0,0.08)'},
    {bg:'#101c3a',up:'#ffd514',dn:'#ff4d2e',txt:'#ffe9a0',grid:'rgba(255,213,20,0.10)'},
    {bg:'#0e1420',up:'#4d9fff',dn:'#ff5a8a',txt:'#d8e4f0',grid:'rgba(120,160,220,0.10)'},
  ],r);
  const W= kind==='phone'?620:1240;
  const H= kind==='phone'?1240:pick([520,620,840],r);
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  x.fillStyle=theme.bg; x.fillRect(0,0,W,H);
  const n= kind==='phone'?rint(r,60,120):rint(r,70,210);
  let p=20+r()*380, drift=0, vol=0.02;
  const cs=[];
  for(let i=0;i<n;i++){
    if(i%rint(r,14,26)===0){drift=(r()-0.5)*0.02;vol=0.008+r()*0.05;}
    const o=p, c=Math.max(0.5,o*(1+drift+vol*randn(r)));
    const h=Math.max(o,c)*(1+Math.abs(randn(r))*vol*0.6);
    const l=Math.min(o,c)*(1-Math.abs(randn(r))*vol*0.6);
    const v=Math.abs(randn(r))*(0.4+vol*22);
    cs.push({o,h,l,c,v}); p=c;
  }
  let hi=-1e9, lo=1e9, vmax=0;
  cs.forEach(k=>{hi=Math.max(hi,k.h);lo=Math.min(lo,k.l);vmax=Math.max(vmax,k.v);});
  let tick=''; const consn='BCDFGHKLMNPRSTVZ', vow='AEIOU';
  const tl=rint(r,3,4);
  for(let i=0;i<tl;i++) tick+= (i===1? vow[rint(r,0,4)] : consn[rint(r,0,15)]);
  const last=cs[n-1].c, chg=(cs[n-1].c/cs[0].o-1)*100;
  const upAll=chg>=0;

  if(kind==='phone'){
    // defi app card, portrait
    const pad=54;
    x.fillStyle=theme.txt; x.textAlign='left';
    x.font='bold 40px "Courier New",monospace';
    x.fillText('$'+tick,pad,110);
    x.font='bold 92px "Courier New",monospace';
    x.fillText(last.toFixed(2),pad,236);
    x.fillStyle= upAll?theme.up:theme.dn;
    x.font='bold 38px "Courier New",monospace';
    x.fillText((upAll?'▲ +':'▼ ')+chg.toFixed(1)+'%',pad,300);
    // area chart
    const cy0=380, cy1=H-220;
    const px=i=>pad+ i*(W-2*pad)/(n-1);
    const py=v=>cy0+(hi-v)/(hi-lo)*(cy1-cy0);
    const grad=x.createLinearGradient(0,cy0,0,cy1);
    const lc= upAll?theme.up:theme.dn;
    grad.addColorStop(0,lc+'66'); grad.addColorStop(1,lc+'00');
    x.beginPath(); x.moveTo(px(0),py(cs[0].c));
    for(let i=1;i<n;i++) x.lineTo(px(i),py(cs[i].c));
    x.lineTo(px(n-1),cy1); x.lineTo(px(0),cy1); x.closePath();
    x.fillStyle=grad; x.fill();
    x.strokeStyle=lc; x.lineWidth=4; x.lineJoin='round';
    x.beginPath(); x.moveTo(px(0),py(cs[0].c));
    for(let i=1;i<n;i++) x.lineTo(px(i),py(cs[i].c));
    x.stroke();
    // range pills
    const pills=['1D','1W','1M','1Y','ALL'];
    const on=rint(r,0,4);
    pills.forEach((pl,i)=>{
      const bx=pad+i*((W-2*pad)/5), bw=(W-2*pad)/5-12;
      x.fillStyle= i===on? theme.txt:'rgba(128,128,140,0.18)';
      x.beginPath();
      x.roundRect? x.roundRect(bx,H-150,bw,54,27) : x.rect(bx,H-150,bw,54);
      x.fill();
      x.fillStyle= i===on? theme.bg:theme.txt;
      x.font='bold 22px "Courier New",monospace'; x.textAlign='center';
      x.fillText(pl,bx+bw/2,H-115);
    });
    x.textAlign='left';
    return;
  }

  const padL=34, padR=110, padT=H*0.24, padB=24, volH=H*0.13;
  const cw=(W-padL-padR)/n;
  const py=v=>padT+(hi-v)/(hi-lo)*(H-padT-padB-volH-18);
  x.font='16px "Courier New",monospace'; x.textAlign='left'; x.textBaseline='middle';
  for(let g=0;g<=5;g++){
    const v=lo+(hi-lo)*g/5, yy=py(v);
    x.strokeStyle=theme.grid; x.lineWidth=1;
    x.beginPath(); x.moveTo(padL,yy); x.lineTo(W-padR+14,yy); x.stroke();
    x.fillStyle=theme.txt; x.globalAlpha=0.55;
    x.fillText(v.toFixed(2),W-padR+22,yy); x.globalAlpha=1;
  }
  const lc= upAll?theme.up:theme.dn;
  if(kind==='line'||kind==='area'){
    const px=i=>padL+i*cw+cw/2;
    if(kind==='area'){
      const grad=x.createLinearGradient(0,padT,0,H-padB-volH);
      grad.addColorStop(0,lc+'55'); grad.addColorStop(1,lc+'00');
      x.beginPath(); x.moveTo(px(0),py(cs[0].c));
      for(let i=1;i<n;i++) x.lineTo(px(i),py(cs[i].c));
      x.lineTo(px(n-1),H-padB-volH); x.lineTo(px(0),H-padB-volH); x.closePath();
      x.fillStyle=grad; x.fill();
    }
    x.strokeStyle=lc; x.lineWidth=3.4; x.lineJoin='round';
    x.beginPath(); x.moveTo(px(0),py(cs[0].c));
    for(let i=1;i<n;i++) x.lineTo(px(i),py(cs[i].c));
    x.stroke();
  } else if(kind==='bars'){
    for(let i=0;i<n;i++){
      const k=cs[i], up=k.c>=k.o, col=up?theme.up:theme.dn;
      const cx=padL+i*cw+cw/2, bw=Math.max(2,cw*0.55);
      x.fillStyle=col;
      x.fillRect(cx-bw/2,py(k.c),bw,(H-padB-volH-12)-py(k.c));
    }
  } else { // candles
    for(let i=0;i<n;i++){
      const k=cs[i], up=k.c>=k.o, col=up?theme.up:theme.dn;
      const cx=padL+i*cw+cw/2;
      x.strokeStyle=col; x.lineWidth=Math.max(1,cw*0.12);
      x.beginPath(); x.moveTo(cx,py(k.h)); x.lineTo(cx,py(k.l)); x.stroke();
      const bw=Math.max(2,cw*0.62);
      const y1=py(Math.max(k.o,k.c)), y2=py(Math.min(k.o,k.c));
      if(up&&theme.bg==='#f2efe6'){x.fillStyle=theme.bg;x.fillRect(cx-bw/2,y1,bw,Math.max(1.5,y2-y1));x.strokeStyle=col;x.lineWidth=1.6;x.strokeRect(cx-bw/2,y1,bw,Math.max(1.5,y2-y1));}
      else {x.fillStyle=col;x.fillRect(cx-bw/2,y1,bw,Math.max(1.5,y2-y1));}
    }
  }
  if(kind!=='bars'){
    for(let i=0;i<n;i++){
      const k=cs[i], up=k.c>=k.o, col=up?theme.up:theme.dn;
      const cx=padL+i*cw+cw/2, bw=Math.max(2,cw*0.62);
      x.globalAlpha=0.45; x.fillStyle=col;
      x.fillRect(cx-bw/2,H-padB-(k.v/vmax)*volH,bw,(k.v/vmax)*volH);
      x.globalAlpha=1;
    }
  }
  const hs=H/620;
  x.textAlign='left'; x.textBaseline='alphabetic';
  x.fillStyle=theme.txt; x.font='bold '+Math.round(64*hs)+'px "Courier New",monospace';
  x.fillText('$'+tick,padL,78*hs);
  x.font=Math.round(30*hs)+'px "Courier New",monospace';
  x.fillStyle=lc;
  x.fillText(last.toFixed(2)+'  '+(chg>=0?'+':'')+chg.toFixed(1)+'%',padL,118*hs);
}

/* STARS NOBODY NAMED — fields, planispheres, horizons */
function castTape(seed){
  const r=rng(seed);
  const kind=pick(['candles','candles','line','area','phone','bars'],r);
  const ti=Math.floor(r()*7);
  return {kind,ti};
}

/* ── Delisted ───────────────────────────────────────────────────────────── */
const CHART: Record<string, string> = {
  candles: 'Candles', line: 'Line', area: 'Area', phone: 'Phone', bars: 'Bars',
};
const TAPE_PAL = ['Terminal', 'Amber', 'Print', 'Vapor', 'Acid', 'Midnight', 'Harbour'];
export const delistedTraits: TraitsFn = (id) => {
  const c = castTape(id);
  return { Chart: CHART[c.kind], Palette: TAPE_PAL[c.ti] };
};
export const delistedSchema: TraitSchema = {
  traits: [
    { name: 'Chart', values: ['Candles', 'Line', 'Area', 'Phone', 'Bars'] },
    { name: 'Palette', values: TAPE_PAL,
      subtraits: [
        { name: 'Screen', values: ['Terminal', 'Amber', 'Vapor', 'Acid', 'Midnight', 'Harbour'] },
        { name: 'Paper', values: ['Print'] },
      ] },
  ],
};
export const renderDelisted = blit(tape, delistedTraits);
export const DELISTED_ASPECTS = [2.38, 2, 1.48, 0.5] as const;
