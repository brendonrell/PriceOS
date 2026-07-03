// @ts-nocheck
/*
 * Dyed In The Wool — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, hash2, shade, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* 7. LOOM — electric textiles */
function loom(cv,seed){
  const r=rng(seed), W=1000;
  const H=pick([840,1180,1000],r), T=pick([5,6,8,11,14],r);
  cv.width=W; cv.height=H+70;
  const x=cv.getContext('2d');
  x.fillStyle='#0c0c10'; x.fillRect(0,0,W,H+70);
  const pal=pick([
    {g:'#22325e',d:'#e8e2d0',a:'#a23b34'},
    {g:'#1a0533',d:'#ff2bd1',a:'#00e5c0'},
    {g:'#0d1c4a',d:'#ffd514',a:'#ff4d2e'},
    {g:'#7a2a22',d:'#e8d9b8',a:'#27343f'},
    {g:'#0f3a2e',d:'#c8ff00',a:'#ff2b6e'},
    {g:'#2b0d5e',d:'#ff7a2b',a:'#36c8c0'},
    {g:'#0c2a4a',d:'#7fd8c8',a:'#ffd514'},
    {g:'#3a0a1c',d:'#ff9ad1',a:'#c8ff00'},
    {g:'#102014',d:'#e8e2d0',a:'#ff5500'},
    {g:'#1c1c24',d:'#00e5ff',a:'#d61a3c'},
  ],r);
  const cols=Math.floor(W/T), rows=Math.floor(H/T);
  const off=[]; let o=0;
  for(let c=0;c<cols;c++){o+=(r()-0.5)*1.6;o*=0.92;off.push(o);}
  const P=rint(r,14,64), thr=P*(0.26+r()*0.22);
  const twill=r()<0.5;
  const motif=pick(['diamond','chevron','band','block'],r);
  function isDesign(c,row){
    const yy=row+off[c];
    if(motif==='diamond') return (Math.abs((yy%P)-P/2)+Math.abs((c%P)-P/2))<thr;
    if(motif==='chevron') return Math.abs(((yy+Math.abs((c%(P*2))-P)*0.8)%P)-P/2)<thr*0.5;
    if(motif==='block') return ((Math.floor(yy/P)+Math.floor(c/P))%2)===0;
    return Math.abs((yy%P)-P/2)<thr*0.45;
  }
  const accP=0.08+r()*0.32;
  const bands=[]; let bp=0;
  while(bp<rows){const len=rint(r,3,26);const isAcc=r()<accP;bands.push({s:bp,e:bp+len,acc:isAcc});bp+=len;}
  function weftAcc(row){for(const b of bands){if(row>=b.s&&row<b.e)return b.acc;}return false;}
  for(let row=0;row<rows;row++){
    for(let c=0;c<cols;c++){
      const warpTop= twill ? ((c+row*2)%4<2) : ((c+row)%2===0);
      const edge=c<2||c>cols-3;
      let col;
      if(warpTop) col= edge?pal.a : (isDesign(c,row)?pal.d:pal.g);
      else col= weftAcc(row)?pal.a:shade(pal.g,-14);
      const jit=Math.floor((hash2(c,row)-0.5)*26);
      x.fillStyle=shade(col,jit);
      x.fillRect(c*T,row*T,T-1,T-1);
    }
  }
  for(let row=0;row<rows;row+=2){x.fillStyle='rgba(255,255,255,0.018)';x.fillRect(0,row*T,W,T);}
  for(let c=0;c<cols;c++){
    const fc= c<2||c>cols-3 ? pal.a : (isDesign(c,rows-1)?pal.d:pal.g);
    x.strokeStyle=shade(fc,Math.floor((hash2(c,9999)-0.5)*30));
    x.lineWidth=T*0.45;
    x.beginPath();
    const bxx=c*T+T/2;
    x.moveTo(bxx,H);
    x.quadraticCurveTo(bxx+(hash2(c,777)-0.5)*22,H+34,bxx+(hash2(c,555)-0.5)*30,H+62);
    x.stroke();
  }
}

/* 8. CORE — strata, classic paper or UV mineral log */
function castLoom(seed){
  const r=rng(seed);
  const H=pick([840,1180,1000],r), T=pick([5,6,8,11,14],r);
  const pi2=Math.floor(r()*10);
  const cols=Math.floor(1000/T);
  for(let c=0;c<cols;c++) r(); // warp feather offsets
  const P=rint(r,14,64);
  r(); // thr factor
  const twill=r()<0.5;
  const motif=pick(['diamond','chevron','band','block'],r);
  return {T,pi2,twill,motif};
}

/* ── Dyed In The Wool ───────────────────────────────────────────────────── */
const DYELOT = ['Indigo & Madder', 'Electric Orchid', 'Signal Gold', 'Madder & Sand', 'Acid Moss', 'Plum Ember', 'Harbour Gold', 'Rose Acid', 'Bone & Flame', 'Night Signal'];
export const woolTraits: TraitsFn = (id) => {
  const c = castLoom(id);
  const thread = c.T <= 6 ? 'Fine' : c.T === 8 ? 'Standard' : 'Chunky';
  return { 'Dye Lot': DYELOT[c.pi2], Motif: cap(c.motif), Weave: c.twill ? 'Twill' : 'Plain', Thread: thread };
};
export const woolSchema: TraitSchema = {
  traits: [
    { name: 'Dye Lot', values: DYELOT,
      subtraits: [
        { name: 'Classic', values: ['Indigo & Madder', 'Madder & Sand', 'Bone & Flame'] },
        { name: 'Electric', values: ['Electric Orchid', 'Acid Moss', 'Rose Acid', 'Night Signal'] },
        { name: 'Royal', values: ['Signal Gold', 'Plum Ember', 'Harbour Gold'] },
      ] },
    { name: 'Motif', values: ['Diamond', 'Chevron', 'Band', 'Block'] },
    { name: 'Weave', values: ['Plain', 'Twill'] },
    { name: 'Thread', values: ['Fine', 'Standard', 'Chunky'] },
  ],
};
export const renderWool = blit(loom, woolTraits);
export const WOOL_ASPECTS = [0.8, 1.1, 0.93] as const;
