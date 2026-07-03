// @ts-nocheck
/*
 * Automaton — cellular-automaton engine built in the core blob but never
 * exported or wired to a project. Preserved verbatim from the retired
 * core.ts (2026-07-03) so the frozen art code isn't lost; exports kept so
 * the file is importable the day it gets a project.
 */
import { pick, rdHexLerp, rng } from './_kit';

const CA_PALS=[
  {name:'Teal', bg:'#0a0a0e', a:'#00e5c8', b:'#0a4a44'},
  {name:'Amber', bg:'#0c0a06', a:'#ffb000', b:'#5a3208'},
  {name:'Iris', bg:'#0a0414', a:'#b388ff', b:'#3a1a6a'},
  {name:'Acid', bg:'#04100a', a:'#9ef01a', b:'#1f5a14'},
  {name:'Mono', bg:'#0a0a0c', a:'#f0f0f4', b:'#3a3a42'},
  {name:'Ink', bg:'#efe9dd', a:'#1a1713', b:'#9a8a6a'},
];
const CA_FMTS=[{W:1080,H:1080,t:'Square'},{W:920,H:1200,t:'Portrait'},{W:1200,H:920,t:'Landscape'}];
const CA_RULES=[30,90,110,150,54,18,182,22,73,45];
function automaton(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*CA_PALS.length);
  const fmt=pick(CA_FMTS,r);
  const rule=pick(CA_RULES,r);
  const start=pick(['single','single','random'],r);
  // ---- end trait draws ----
  const P=CA_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d');
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  const N=pick([130,170,220],r), cpx=W/N, rows=Math.ceil(H/cpx);
  let row=new Uint8Array(N); if(start==='single')row[N>>1]=1; else for(let i=0;i<N;i++)row[i]=r()<0.5?1:0;
  const rb=[]; for(let b=0;b<8;b++)rb[b]=(rule>>b)&1;
  for(let gy=0;gy<rows;gy++){
    for(let i=0;i<N;i++){if(row[i]){const t=gy/rows;x.fillStyle=rdHexLerp(P.a,P.b,t*0.85);x.fillRect(i*cpx,gy*cpx,cpx+0.6,cpx+0.6);}}
    const nx=new Uint8Array(N);for(let i=0;i<N;i++){const l=row[(i-1+N)%N],c=row[i],rr=row[(i+1)%N];nx[i]=rb[(l<<2)|(c<<1)|rr];}row=nx;
  }
  x.save();x.globalAlpha=0.04;x.globalCompositeOperation=P.bg<'#888888'?'screen':'multiply';for(let i=0;i<W*H/1400;i++){x.fillStyle=P.bg<'#888888'?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
}
function castAutomaton(seed){const r=rng(seed);const palI=Math.floor(r()*CA_PALS.length);const fmt=pick(CA_FMTS,r);const rule=pick(CA_RULES,r);const start=pick(['single','random'],r);return {palette:CA_PALS[palI].name, format:fmt.t, rule:'Rule '+rule, seed:start==='single'?'Singularity':'Primordial'};}

/* QUASICRYSTAL — "Quasicrystal": N-fold plane-wave interference quantised into
   crisp symmetric bands (intricate + structured, Avalanche-spirit). */

export { automaton, castAutomaton };
