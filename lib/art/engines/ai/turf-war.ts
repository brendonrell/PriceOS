// @ts-nocheck
/*
 * Turf War — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, hex2rgb, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* TURF WAR — cyclic cellular automaton; spirals conquer everything */
function turfwar(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1100,H:1100},{W:1240,H:1000}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const cell=5;
  const gw=Math.ceil(W/cell), gh=Math.ceil(H/cell);
  const k=rint(r,8,15);
  // cohesive cycle palette: 3 anchors, interpolated around the loop
  const ANCH=[
    ['#10041c','#ff2bd1','#ffd514'],
    ['#0a1c3a','#00e5ff','#c8ff00'],
    ['#14080a','#ff5500','#7fd8c8'],
    ['#04140e','#0f9a3c','#f2ead6'],
    ['#0c0c14','#7a2bff','#ff7a2b'],
    ['#001a14','#ffd514','#d61a3c'],
  ];
  const anchors=pick(ANCH,r).map(hex2rgb);
  function colAt(i){
    const t=i/k*anchors.length;
    const a=anchors[Math.floor(t)%anchors.length];
    const b=anchors[(Math.floor(t)+1)%anchors.length];
    const f=t-Math.floor(t);
    return [Math.round(a[0]+(b[0]-a[0])*f),Math.round(a[1]+(b[1]-a[1])*f),Math.round(a[2]+(b[2]-a[2])*f)];
  }
  const pal=[]; for(let i=0;i<k;i++) pal.push(colAt(i));
  let g=new Uint8Array(gw*gh), g2=new Uint8Array(gw*gh);
  for(let i=0;i<g.length;i++) g[i]=Math.floor(r()*k);
  const steps=rint(r,50,150);
  for(let s=0;s<steps;s++){
    for(let yy=0;yy<gh;yy++){
      for(let xx=0;xx<gw;xx++){
        const i=yy*gw+xx, v=g[i], want=(v+1)%k;
        g2[i]=v;
        if(g[yy*gw+((xx+1)%gw)]===want||g[yy*gw+((xx+gw-1)%gw)]===want||
           g[((yy+1)%gh)*gw+xx]===want||g[((yy+gh-1)%gh)*gw+xx]===want) g2[i]=want;
      }
    }
    const tmp=g; g=g2; g2=tmp;
  }
  for(let yy=0;yy<gh;yy++){
    for(let xx=0;xx<gw;xx++){
      const c=pal[g[yy*gw+xx]];
      x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
      x.fillRect(xx*cell,yy*cell,cell,cell);
    }
  }
}

/* AVALANCHE — abelian sandpile; drop a mountain of grains, watch the law */
function castTurfwar(seed){
  const r=rng(seed);
  r(); // fmt
  const k=rint(r,8,15);
  const ai=Math.floor(r()*6);
  return {k,ai};
}

/* ── Turf War ───────────────────────────────────────────────────────────── */
const CYCLE = ['Pink Gold', 'Electric', 'Ember Teal', 'Meadow', 'Violet Orange', 'Gold Crimson'];
export const turfWarTraits: TraitsFn = (id) => {
  const c = castTurfwar(id);
  return { Factions: String(c.k), Cycle: CYCLE[c.ai] };
};
export const turfWarSchema: TraitSchema = {
  traits: [
    { name: 'Factions', values: ['8', '9', '10', '11', '12', '13', '14', '15'] },
    { name: 'Cycle', values: CYCLE },
  ],
};
export const renderTurfWar = blit(turfwar, turfWarTraits);
export const TURFWAR_ASPECTS = [0.81, 1, 1.24] as const;
