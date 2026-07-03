// @ts-nocheck
/*
 * Loud On Cheap Paper — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, hex2rgb, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* LOUD ON CHEAP PAPER — full print shop: bayer, dots, lines, diagonal screens */
function dither(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1080,H:1080},{W:760,H:1240}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const RAMPS=[
    ['#0c0c14','#7a0a2e','#d61a3c','#ff7a2b','#ffd514'],
    ['#10041c','#1d2bd6','#00b8c8','#c8ff00'],
    ['#140414','#7a2bff','#ff2bd1','#ffc8e8'],
    ['#04140e','#0f6a4a','#00ffa1','#f2ead6'],
    ['#0a0a12','#1d4fb8','#00e5ff','#fff8e0'],
    ['#1c0a04','#c43a20','#ffaa00','#fff3c8'],
    ['#0c1430','#1d8fd8','#7fd8c8','#f2f2f2'],
    ['#1c0420','#d61a8c','#ff7a2b','#ffe9a8'],
    ['#020a14','#0f8a3c','#c8ff00','#f2f2e0'],
    ['#14001c','#5a2ea6','#ff2b6e','#ffd2e8'],
  ];
  const ramp=pick(RAMPS,r).map(hex2rgb);
  const B=pick([6,8,8,12,16],r);
  const style=pick(['bayer','bayer','dots','lines','diag'],r);
  const M=[
    [0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],
    [12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],
    [3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],
    [15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]];
  const comp=pick(['orb','twin','horizon','diag','well','bars','rings','wave'],r);
  const ox=W*(0.25+r()*0.5), oy=H*(0.25+r()*0.5);
  const ox2=W*(0.2+r()*0.6), oy2=H*(0.5+r()*0.4);
  const diagL=Math.hypot(W,H);
  const hy=H*(0.4+r()*0.3), hw=60+r()*160, ga=r()*0.8-0.4;
  const kk=rint(r,2,5), wl1=120+r()*240, wl2=90+r()*200;
  function field(px,py){
    if(comp==='orb') return Math.hypot(px-ox,py-oy)/(diagL*0.62);
    if(comp==='twin'){
      const a=Math.hypot(px-ox,py-oy), b=Math.hypot(px-ox2,py-oy2);
      return Math.min(a,b)/(diagL*0.55);
    }
    if(comp==='horizon') return Math.max(0,Math.min(1,(py-hy)/H+0.5))+0.12*Math.sin(px/hw);
    if(comp==='well') return 1-Math.hypot(px-ox,py-oy)/(diagL*0.58);
    if(comp==='bars') return ((px/W*kk)%1)*0.75+ (py/H)*0.25;
    if(comp==='rings') return ((Math.hypot(px-ox,py-oy)/(diagL/kk))%1);
    if(comp==='wave') return 0.5+0.5*Math.sin(px/wl1*6.28 + Math.sin(py/wl2*6.28)*2);
    return ((px-W/2)*Math.cos(ga)+(py-H/2)*Math.sin(ga))/diagL+0.5;
  }
  const cols=Math.ceil(W/B), rows=Math.ceil(H/B);
  const paper=ramp[ramp.length-1], inkD=ramp[0];
  if(style==='dots'||style==='lines'||style==='diag'){
    x.fillStyle='rgb('+paper[0]+','+paper[1]+','+paper[2]+')';
    x.fillRect(0,0,W,H);
  }
  for(let cy=0;cy<rows;cy++){
    for(let cxn=0;cxn<cols;cxn++){
      const px=cxn*B+B/2, py=cy*B+B/2;
      let f=Math.max(0,Math.min(0.999,field(px,py)));
      const t=f*(ramp.length-1);
      let idx=Math.floor(t);
      const frac=t-idx;
      if(style==='bayer'){
        const th=(M[cy%8][cxn%8]+0.5)/64;
        if(frac>th) idx++;
        const c=ramp[Math.min(idx,ramp.length-1)];
        x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
        x.fillRect(cxn*B,cy*B,B,B);
      } else if(style==='dots'){
        // halftone: dot size = darkness; colour from the ramp's mid inks
        const dark=1-f;
        const c=ramp[Math.max(0,Math.min(ramp.length-2,idx))];
        x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
        x.beginPath(); x.arc(px,py,dark*B*0.62,0,6.29); x.fill();
      } else if(style==='lines'){
        const dark=1-f;
        const c=ramp[Math.max(0,Math.min(ramp.length-2,idx))];
        x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
        x.fillRect(cxn*B,py-dark*B*0.55,B,Math.max(0.5,dark*B*1.1));
      } else { // diag
        const dark=1-f;
        const c=ramp[Math.max(0,Math.min(ramp.length-2,idx))];
        x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
        x.save(); x.translate(px,py); x.rotate(0.785);
        x.fillRect(-B*0.75,-dark*B*0.5,B*1.5,Math.max(0.5,dark*B));
        x.restore();
      }
    }
  }
}

/* TURF WAR — cyclic cellular automaton; spirals conquer everything */
function castDither(seed){
  const r=rng(seed);
  r(); // fmt
  const ri=Math.floor(r()*10);
  r(); // B
  const style=pick(['bayer','bayer','dots','lines','diag'],r);
  const comp=pick(['orb','twin','horizon','diag','well','bars','rings','wave'],r);
  return {ri,style,comp};
}

/* ── Loud On Cheap Paper ────────────────────────────────────────────────── */
const SCREEN: Record<string, string> = { bayer: 'Bayer', dots: 'Dots', lines: 'Lines', diag: 'Diagonal' };
const DITHER_COMP: Record<string, string> = {
  orb: 'Orb', twin: 'Twin', horizon: 'Horizon', diag: 'Diagonal', well: 'Well', bars: 'Bars', rings: 'Rings', wave: 'Wave',
};
const RAMP = ['Ember', 'Reef', 'Orchid', 'Jade', 'Glacier', 'Rust', 'Harbour', 'Punch', 'Field', 'Berry'];
export const cheapPaperTraits: TraitsFn = (id) => {
  const c = castDither(id);
  return { Screen: SCREEN[c.style], Composition: DITHER_COMP[c.comp], Ramp: RAMP[c.ri] };
};
export const cheapPaperSchema: TraitSchema = {
  traits: [
    { name: 'Screen', values: ['Bayer', 'Dots', 'Lines', 'Diagonal'] },
    { name: 'Composition', values: ['Orb', 'Twin', 'Horizon', 'Diagonal', 'Well', 'Bars', 'Rings', 'Wave'] },
    { name: 'Ramp', values: RAMP,
      subtraits: [
        { name: 'Hot', values: ['Ember', 'Rust', 'Punch', 'Berry'] },
        { name: 'Cool', values: ['Reef', 'Glacier', 'Harbour', 'Jade'] },
        { name: 'Neon', values: ['Orchid', 'Field'] },
      ] },
  ],
};
export const renderCheapPaper = blit(dither, cheapPaperTraits);
export const CHEAPPAPER_ASPECTS = [0.81, 1.24, 1, 0.61] as const;
