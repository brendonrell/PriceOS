// @ts-nocheck
/*
 * Hard Water — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* HARD WATER — stacked horizons; faults, echo pinstripes, both orientations */
function hardwater(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:900},{W:950,H:950}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const PALS=[
    ['#10041c','#7a00cc','#ff2bd1','#ff7a2b','#ffd514','#fff3c8'],
    ['#0a1c3a','#1d4fb8','#00b8c8','#c8ff00','#f2ead6'],
    ['#14080a','#8a1028','#d61a3c','#ff5500','#ffaa00','#ffe9a8'],
    ['#04140e','#0d6a4e','#0f9a3c','#7fffd4','#f2ead6'],
    ['#f2ead6','#ffd514','#ff7a2b','#d61a3c','#7a0a2e','#14141c'],
    ['#0c0c14','#1d2bd6','#7a2bff','#ff2bd1','#ffc8e8'],
  ];
  let pal=pick(PALS,r);
  if(r()<0.5) pal=pal.slice().reverse();
  const vert=r()<0.35;
  x.save();
  let LW=W, LH=H;
  if(vert){ x.translate(W,0); x.rotate(Math.PI/2); LW=H; LH=W; }
  const nb=rint(r,3,18);
  const bounds=[];
  for(let i=0;i<nb;i++) bounds.push(LH*(0.08+0.84*(i+r()*0.7)/nb));
  bounds.sort((a,b)=>a-b);
  // one optional fault: everything right of it drops
  const faulted=r()<0.45;
  const fx=LW*(0.25+r()*0.5), fd=30+r()*90;
  function edgeY(style,x0,y0,amp,wl,ph){
    let y=y0+(faulted&&x0>fx? fd:0);
    const t=x0/wl*6.283+ph;
    if(style==='saw') return y+amp*(2*((t/6.283)%1)-1);
    if(style==='square') return y+amp*(Math.sin(t)>0?1:-1);
    if(style==='scallop') return y+amp*(Math.abs(Math.sin(t))*2-1);
    if(style==='zig'){const f=(t/3.1415)%2;return y+amp*(f<1?2*f-1:3-2*f);}
    return y;
  }
  x.fillStyle=pal[0]; x.fillRect(-LH,-LH,LW+2*LH,LH*3);
  bounds.forEach((y0,i)=>{
    const style=pick(['flat','saw','square','scallop','zig'],r);
    const amp= style==='flat'?0: 6+r()*Math.min(46,LH/nb*0.55);
    const wl=40+r()*150, ph=r()*6.28;
    function tracePath(off){
      x.beginPath();
      x.moveTo(-4,edgeY(style,0,y0+off,amp,wl,ph));
      for(let xx=0;xx<=LW;xx+=4) x.lineTo(xx,edgeY(style,xx,y0+off,amp,wl,ph));
    }
    x.fillStyle=pal[(i+1)%pal.length];
    tracePath(0);
    x.lineTo(LW+4,LH+LH); x.lineTo(-4,LH+LH); x.closePath(); x.fill();
    // echo pinstripes under some breaks
    if(style!=='flat'&&r()<0.4){
      const sc2=pal[(i+3)%pal.length];
      x.strokeStyle=sc2; x.lineWidth=7;
      for(let e=1;e<=rint(r,2,4);e++){
        tracePath(e*22); x.stroke();
      }
    }
  });
  // celestial accent
  if(r()<0.35){
    x.fillStyle=pal[(nb+2)%pal.length];
    x.beginPath(); x.arc(LW*(0.2+r()*0.6),bounds[0]*(0.5+r()*0.4),40+r()*70,0,6.29); x.fill();
  }
  x.restore();
}

/* ============ round six: deep-variance rewrites + two true systems ============ */

/* DELISTED — every kind of chart a dead asset ever had */
function castHardwater(seed){
  const r=rng(seed);
  r(); // fmt
  const pi2=Math.floor(r()*6);
  r(); // reverse
  const vert=r()<0.35;
  const nb=rint(r,3,18);
  return {pi2,vert,nb};
}

/* ── Hard Water ─────────────────────────────────────────────────────────── */
export const hardWaterTraits: TraitsFn = (id) => {
  const c = castHardwater(id);
  const bands = c.nb <= 6 ? 'Sparse' : c.nb <= 11 ? 'Stacked' : 'Pinstripe';
  return { Flow: c.vert ? 'Column' : 'Horizon', Bands: bands };
};
export const hardWaterSchema: TraitSchema = {
  traits: [
    { name: 'Flow', values: ['Horizon', 'Column'] },
    { name: 'Bands', values: ['Sparse', 'Stacked', 'Pinstripe'] },
  ],
};
export const renderHardWater = blit(hardwater, hardWaterTraits);
export const HARDWATER_ASPECTS = [0.81, 1.38, 1] as const;
