// @ts-nocheck
/*
 * Diffusion — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, fbm2, rdHexLerp, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const RD_PALS=[
  {name:'Gold Leaf', stops:['#0d0b08','#3a2810','#6b4a1f','#c9962e','#f6ead0']},
  {name:'Prussian', stops:['#0a1420','#13314a','#2a6aa0','#7fb0d8','#e6f1fb']},
  {name:'Oxblood', stops:['#140a0a','#3a1414','#6e2424','#b05a4a','#ecceb8']},
  {name:'Verdigris', stops:['#08140f','#0f3a2a','#1f6e50','#5fae8a','#d6f2e4']},
  {name:'Silver', stops:['#0a0a0c','#26262c','#5a5a64','#a4a4ae','#f2f2f6']},
  {name:'Copper', stops:['#140805','#3a1808','#8a3a14','#d07a3a','#ffd6ac']},
];
const RD_FMTS=[{W:1080,H:1080,t:'Square'},{W:920,H:1180,t:'Portrait'},{W:1180,H:920,t:'Landscape'}];
const RD_PATS=[{name:'Fingerprint',f:0.037,k:0.061},{name:'Labyrinth',f:0.029,k:0.057},{name:'Coral',f:0.0545,k:0.062},{name:'Spots',f:0.030,k:0.062},{name:'Stripes',f:0.032,k:0.059},{name:'Mitosis',f:0.026,k:0.055}];
function rdRamp(stops,t){t=t<0?0:t>1?1:t;const n=stops.length-1,ti=t*n,i=Math.min(n-1,Math.floor(ti));return rdHexLerp(stops[i],stops[i+1],ti-i);}
function diffusion(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*RD_PALS.length);
  const fmt=pick(RD_FMTS,r);
  const pat=pick(RD_PATS,r);
  const seedMode=pick(['scatter','bloom','line','marbled','rings'],r);
  const relief=0.7+r()*0.9;
  // ---- end trait draws ----
  const P=RD_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  const N=130, NN=N*N; let A=new Float32Array(NN), B=new Float32Array(NN), A2=new Float32Array(NN), B2=new Float32Array(NN);
  for(let i=0;i<NN;i++)A[i]=1;
  const ix=(xx,yy)=>((yy+N)%N)*N+((xx+N)%N);
  // seed B
  if(seedMode==='bloom'){for(let yy=-8;yy<=8;yy++)for(let xx=-8;xx<=8;xx++)if(xx*xx+yy*yy<64)B[ix(N/2+xx,N/2+yy)]=0.5;}
  else if(seedMode==='line'){const ly=Math.floor(N*(0.3+r()*0.4));for(let xx=0;xx<N;xx++)for(let w=-2;w<=2;w++)B[ix(xx,ly+w)]=0.5;}
  else if(seedMode==='marbled'){for(let yy=0;yy<N;yy++)for(let xx=0;xx<N;xx++)if(fbm2(xx*0.05+seed,yy*0.05)>0.62)B[ix(xx,yy)]=0.5;}
  else if(seedMode==='rings'){for(let rr=12;rr<N*0.5;rr+=14)for(let a=0;a<6.283;a+=0.04)B[ix(Math.round(N/2+Math.cos(a)*rr),Math.round(N/2+Math.sin(a)*rr))]=0.5;}
  else {for(let s=0;s<rint(r,14,34);s++){const cxk=Math.floor(r()*N),cyk=Math.floor(r()*N);for(let yy=-3;yy<=3;yy++)for(let xx=-3;xx<=3;xx++)B[ix(cxk+xx,cyk+yy)]=0.5;}}
  const f=pat.f+(r()-0.5)*0.004, k=pat.k+(r()-0.5)*0.0025, Da=1, Db=0.5;
  const steps=950;
  for(let s=0;s<steps;s++){
    for(let y=0;y<N;y++){const row=y*N,up=((y-1+N)%N)*N,dn=((y+1)%N)*N;
    for(let xq=0;xq<N;xq++){const xl=(xq-1+N)%N,xr=(xq+1)%N;const c=row+xq;const a=A[c],b=B[c];
      const lA=A[row+xl]*0.2+A[row+xr]*0.2+A[up+xq]*0.2+A[dn+xq]*0.2+A[up+xl]*0.05+A[up+xr]*0.05+A[dn+xl]*0.05+A[dn+xr]*0.05-a;
      const lB=B[row+xl]*0.2+B[row+xr]*0.2+B[up+xq]*0.2+B[dn+xq]*0.2+B[up+xl]*0.05+B[up+xr]*0.05+B[dn+xl]*0.05+B[dn+xr]*0.05-b;
      const abb=a*b*b; let na=a+(Da*lA-abb+f*(1-a)), nb=b+(Db*lB+abb-(k+f)*b);
      A2[c]=na<0?0:na>1?1:na; B2[c]=nb<0?0:nb>1?1:nb;}}
    let t=A;A=A2;A2=t;t=B;B=B2;B2=t;
  }
  // render as lit metallic relief
  const cpx=W/N, cpy=H/N; const lx=-0.45,ly=-0.72,lz=0.52;
  for(let y=0;y<N;y++)for(let xq=0;xq<N;xq++){const b=B[y*N+xq];
    const gx=B[ix(xq+1,y)]-B[ix(xq-1,y)], gy=B[ix(xq,y+1)]-B[ix(xq,y-1)];
    let nx=-gx*relief*6, ny=-gy*relief*6, nz=1; const il=1/Math.hypot(nx,ny,nz); nx*=il;ny*=il;nz*=il;
    const diff=Math.max(0,nx*lx+ny*ly+nz*lz); const spec=Math.pow(diff,28)*0.7;
    const t=b*0.55+diff*0.5+spec; x.fillStyle=rdRamp(P.stops,t); x.fillRect(xq*cpx,y*cpy,cpx+1,cpy+1);}
  // grain + vignette
  x.save();x.globalAlpha=0.04;x.globalCompositeOperation='overlay';for(let i=0;i<W*H/900;i++){x.fillStyle=r()<0.5?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  const vg=x.createRadialGradient(W/2,H/2,S*0.36,W/2,H/2,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.5)');x.fillStyle=vg;x.fillRect(0,0,W,H);
  x.strokeStyle='rgba(255,255,255,0.08)';x.lineWidth=1;x.strokeRect(W*0.04,H*0.04,W*0.92,H*0.92);
}
function castDiffusion(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*RD_PALS.length);
  const fmt=pick(RD_FMTS,r);
  const pat=pick(RD_PATS,r);
  const seedMode=pick(['scatter','bloom','line','marbled','rings'],r);
  return {palette:RD_PALS[palI].name, format:fmt.t, pattern:pat.name, seeding:seedMode};
}

/* GROWTH — "Growth" (halo): differential growth. A seed curve folds in on
   itself — nodes attract along the path, repel neighbours (spatial hash), and
   new nodes insert where edges stretch — producing brain-coral convolutions.
   Forms: coral (closed), colony (many rings packing), tendril (open). Ink on
   paper, rare gilded treatment. cast mirrors the leads. */

/* Diffusion */
export const diffusionTraits: TraitsFn = (id) => { const c = castDiffusion(id) as any; return { Palette: c.palette, Format: c.format, Pattern: c.pattern, Seeding: cap(c.seeding) }; };
export const diffusionSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Gold Leaf','Prussian','Oxblood','Verdigris','Silver','Copper'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Pattern', values: ['Fingerprint','Labyrinth','Coral','Spots','Stripes','Mitosis'] },
  { name: 'Seeding', values: ['Scatter','Bloom','Line','Marbled','Rings'] },
] };
export const renderDiffusion = blit(diffusion, diffusionTraits);
export const DIFFUSION_ASPECTS = [1, 0.78, 1.28] as const;
