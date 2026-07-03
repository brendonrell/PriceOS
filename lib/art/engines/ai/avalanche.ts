// @ts-nocheck
/*
 * Avalanche — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, hex2rgb, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* AVALANCHE — abelian sandpile; drop a mountain of grains, watch the law */
function avalanche(cv,seed){
  const r=rng(seed);
  const W=1080, H=1080;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const n=216, cell=5;
  const grid=new Int32Array(n*n);
  const two=r()<0.3;
  const grains=rint(r,14000,36000);
  const cx=Math.floor(n/2), cy=Math.floor(n/2);
  const c1=cy*n+cx;
  grid[c1]+=two? Math.floor(grains*0.6):grains;
  let minX=cx, maxX=cx, minY=cy, maxY=cy;
  if(two){
    const off=rint(r,20,60);
    const r2=cy+off, c2=cx-off;
    grid[r2*n+c2]+=Math.floor(grains*0.4);
    if(c2<minX)minX=c2; if(cx>maxX)maxX=cx;
    if(r2>maxY)maxY=r2;
  }
  // topple — abelian sandpile. The full-grid rescan re-walked all 46,656
  // cells every pass; almost all are zero (the pile is a growing diamond), so
  // that scan was the cost that froze the UI. We keep the SAME accumulating
  // full-pass toppling — only restricting each pass to the active bounding
  // box and expanding it as grains reach an edge. The sandpile's stable
  // configuration is independent of toppling order (abelian), and cells
  // outside the box are always <4, so this yields the byte-IDENTICAL final
  // grid — verified against the old loop across seeds — just faster.
  let guard=0;
  while(guard++<4e7){
    let any=false;
    let nMinX=minX, nMaxX=maxX, nMinY=minY, nMaxY=maxY;
    for(let yy=minY;yy<=maxY;yy++){
      const rb=yy*n;
      for(let xx=minX;xx<=maxX;xx++){
        const i=rb+xx;
        const v=grid[i];
        if(v>=4){
          any=true;
          const d=v>>2;
          grid[i]=v&3;
          if(xx>0){grid[i-1]+=d; if(xx-1<nMinX)nMinX=xx-1;}
          if(xx<n-1){grid[i+1]+=d; if(xx+1>nMaxX)nMaxX=xx+1;}
          if(yy>0){grid[i-n]+=d; if(yy-1<nMinY)nMinY=yy-1;}
          if(yy<n-1){grid[i+n]+=d; if(yy+1>nMaxY)nMaxY=yy+1;}
        }
      }
    }
    minX=nMinX<0?0:nMinX; maxX=nMaxX>n-1?n-1:nMaxX;
    minY=nMinY<0?0:nMinY; maxY=nMaxY>n-1?n-1:nMaxY;
    if(!any) break;
  }
  const PALS=[
    ['#0c0c14','#1d4fb8','#00e5ff','#ffd514'],
    ['#10041c','#7a2bff','#ff2bd1','#c8ff00'],
    ['#04140e','#0f8a3c','#7fffd4','#f2f2e0'],
    ['#14080a','#d61a3c','#ff9a3d','#ffe9a8'],
    ['#f2f2f4','#1d2bd6','#ff5500','#14141c'],
  ];
  const pal=pick(PALS,r).map(hex2rgb);
  x.fillStyle='rgb('+pal[0][0]+','+pal[0][1]+','+pal[0][2]+')';
  x.fillRect(0,0,W,H);
  for(let yy=0;yy<n;yy++){
    for(let xx=0;xx<n;xx++){
      const v=grid[yy*n+xx];
      if(v===0) continue;
      const c=pal[Math.min(3,v)];
      x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
      x.fillRect(xx*cell,yy*cell,cell,cell);
    }
  }
}
/* ============ reworked engines: facade, pyro, pennant, fortyfive ============ */

/* FACADE — "Elevations": architectural elevation sheets. Ink + blueprint
   drafts are the backbone. Blueprint carries a full drafting apparatus —
   sheet border, column grid, dimension strings, detail callout, north arrow,
   scale bar and a title block. Day/dusk/night coloured renderings are SUPER
   RARE (~4%). Trait-bearing draws come first, mirrored exactly by castFacade. */
function castAvalanche(seed){
  const r=rng(seed);
  const two=r()<0.3;
  const grains=rint(r,14000,36000);
  return {two,grains};
}

/* ===================== NEW PROJECTS (2026-06-13) =====================
   Built for VARIETY: each engine is one motif rendered through several very
   different compositions + aspect ratios, so a project's outputs never blur
   together. Trait-bearing draws lead; cast* mirrors them exactly. */

/* CHATROOM — "Everyone Is Typing": the group chat as art. One motif (a live
   thread) across six compositions/aspects: full thread, hero bubble, lock-
   screen stack, split conversation, member presence grid, wide panorama. */

/* ── Avalanche ──────────────────────────────────────────────────────────── */
export const avalancheTraits: TraitsFn = (id) => {
  const c = castAvalanche(id);
  const grains = c.grains < 40000 ? 'Light' : c.grains < 56000 ? 'Medium' : 'Heavy';
  return { Piles: c.two ? 'Two' : 'One', Grains: grains };
};
export const avalancheSchema: TraitSchema = {
  traits: [
    { name: 'Piles', values: ['One', 'Two'] },
    { name: 'Grains', values: ['Light', 'Medium', 'Heavy'] },
  ],
};
export const renderAvalanche = blit(avalanche, avalancheTraits);
export const AVALANCHE_ASPECTS = [1] as const;
