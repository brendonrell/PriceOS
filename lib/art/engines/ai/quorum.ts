// @ts-nocheck
/*
 * Quorum — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const Q_PALS=[
  {name:'Ink', g0:'#f6f1e6', g1:'#ece3d2', ink:'#1b1916', acc:'#6e2a28', sec:'#8a8378'},
  {name:'Charcoal', g0:'#ece8de', g1:'#ddd8cc', ink:'#26262a', acc:'#5a6470', sec:'#8a8378'},
  {name:'Indigo Dusk', g0:'#e9e4d8', g1:'#cdd2dc', ink:'#202a44', acc:'#5b6b8c', sec:'#9aa0ae'},
  {name:'Sepia', g0:'#f1e6d2', g1:'#e3d2b6', ink:'#33241a', acc:'#8c5e3c', sec:'#b08a64'},
  {name:'Slate', g0:'#e9e5da', g1:'#d6d8d2', ink:'#333b42', acc:'#6e7b82', sec:'#a7aaa3'},
  {name:'Payne Grey', g0:'#e8e8e4', g1:'#d4d8d8', ink:'#2a363c', acc:'#5c6b72', sec:'#9ba3a4'},
  {name:'Oxblood', g0:'#ece6db', g1:'#ddd4c6', ink:'#221a1a', acc:'#6e2a28', sec:'#a98c7c'},
  {name:'Twilight', g0:'#dfe0da', g1:'#c4ccd0', ink:'#1f2a33', acc:'#3f5a6b', sec:'#8fa0a6'},
  {name:'Nocturne', g0:'#10131a', g1:'#05070c', ink:'#dfe6ee', acc:'#c9a227', sec:'#6b7686', dark:true},
  {name:'Bone', g0:'#eceae3', g1:'#dedcd4', ink:'#202020', acc:'#7a6a52', sec:'#9c9a93'},
];
const Q_FMTS=[{W:1040,H:1320,t:'Portrait'},{W:1320,H:1040,t:'Landscape'},{W:1120,H:1120,t:'Square'},{W:1500,H:820,t:'Panorama'},{W:840,H:1320,t:'Tall'}];
const Q_MOVE=['Drift','Gather','Cascade','Split','Settle'];
const Q_MULT=['Few','Many','Legion'];
function quorum(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*Q_PALS.length);
  const fmt=pick(Q_FMTS,r);
  const move=pick(Q_MOVE,r);
  const mult=pick(Q_MULT,r);
  const cohBias=0.5+r()*0.55;
  // ---- end trait draws ----
  const P=Q_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  // sky ground
  const bg=x.createLinearGradient(0,0,0,H); bg.addColorStop(0,P.g0); bg.addColorStop(1,P.g1); x.fillStyle=bg; x.fillRect(0,0,W,H);
  const S=Math.min(W,H);
  const N= mult==='Few'? rint(r,800,1200) : mult==='Many'? rint(r,1600,2400) : rint(r,2900,4000);
  const px=new Float32Array(N),py=new Float32Array(N),vx=new Float32Array(N),vy=new Float32Array(N);
  const maxSpd=S*0.0085, minSpd=maxSpd*0.6, maxF=maxSpd*0.42;
  const rv=S*0.06, rv2=rv*rv, rsep=rv*0.4, rsep2=rsep*rsep;
  // seed the flock in a loose cluster
  const ox=W*(0.33+r()*0.34), oy=H*(0.32+r()*0.36), spread=S*(0.2+r()*0.16);
  for(let i=0;i<N;i++){const a=r()*6.283,d=Math.sqrt(r())*spread;px[i]=ox+Math.cos(a)*d;py[i]=oy+Math.sin(a)*d;const va=r()*6.283;vx[i]=Math.cos(va)*maxSpd;vy[i]=Math.sin(va)*maxSpd;}
  // grid
  const cs=rv, cols=Math.max(1,Math.ceil(W/cs)), rows=Math.max(1,Math.ceil(H/cs));
  const head=new Int32Array(cols*rows), nxt=new Int32Array(N);
  // attractor (lissajous) + predator
  const ax0=0.7+r()*1.6, ay0=0.9+r()*1.6, aph=r()*6.283, axr=W*(0.16+r()*0.12), ayr=H*(0.16+r()*0.12);
  const split= move==='Split'; const predT=rint(r,90,150);
  const wAli= move==='Cascade'?2.4: move==='Gather'?1.0:1.7;
  const wCoh=(move==='Gather'||move==='Settle'?0.8:0.5)*cohBias;
  const wSep=2.0;
  const STEPS= 230, warm=70, L=26;
  // trail ring buffers
  const tx=new Float32Array(N*L), ty=new Float32Array(N*L); let tlen=0, thead=0;
  function step(s){
    head.fill(-1);
    for(let i=0;i<N;i++){let cxk=px[i]/cs|0, cyk=py[i]/cs|0; if(cxk<0)cxk=0;if(cxk>=cols)cxk=cols-1;if(cyk<0)cyk=0;if(cyk>=rows)cyk=rows-1; const c=cxk+cyk*cols; nxt[i]=head[c]; head[c]=i;}
    const t=s/STEPS, atx=W/2+Math.cos(aph+t*ax0*6.283)*axr, aty=H/2+Math.sin(aph+t*ay0*6.283)*ayr;
    const settleK= move==='Settle'? t : 0;
    let pdx=0,pdy=0,pred=false; if(split&&s>predT&&s<predT+50){pred=true;pdx=W*(0.5+0.3*Math.cos(s*0.2));pdy=H*(0.5+0.3*Math.sin(s*0.2));}
    for(let i=0;i<N;i++){
      let sx=0,sy=0,alx=0,aly=0,cx2=0,cy2=0,cnt=0;
      let cxk=px[i]/cs|0, cyk=py[i]/cs|0; if(cxk<0)cxk=0;if(cxk>=cols)cxk=cols-1;if(cyk<0)cyk=0;if(cyk>=rows)cyk=rows-1;
      for(let gy=-1;gy<=1;gy++)for(let gx=-1;gx<=1;gx++){const nx=cxk+gx,ny=cyk+gy;if(nx<0||ny<0||nx>=cols||ny>=rows)continue;let j=head[nx+ny*cols];let guard=0;while(j!==-1&&guard++<40){if(j!==i){const dx=px[i]-px[j],dy=py[i]-py[j],d2=dx*dx+dy*dy;if(d2<rv2&&d2>0){alx+=vx[j];aly+=vy[j];cx2+=px[j];cy2+=py[j];cnt++;if(d2<rsep2){const inv=1/d2;sx+=dx*inv;sy+=dy*inv;}}}j=nxt[j];}}
      let aX=0,aY=0;
      if(cnt>0){alx/=cnt;aly/=cnt;const al=Math.hypot(alx,aly)||1;aX+=wAli*(alx/al*maxSpd-vx[i]);aY+=wAli*(aly/al*maxSpd-vy[i]);cx2=cx2/cnt-px[i];cy2=cy2/cnt-py[i];const cl=Math.hypot(cx2,cy2)||1;aX+=(wCoh+settleK*0.7)*(cx2/cl*maxSpd-vx[i]);aY+=(wCoh+settleK*0.7)*(cy2/cl*maxSpd-vy[i]);}
      const sl=Math.hypot(sx,sy);if(sl>0){aX+=wSep*(sx/sl*maxSpd-vx[i]);aY+=wSep*(sy/sl*maxSpd-vy[i]);}
      // attractor (gentle roam) + soft boundary so the body uses the sky without flying off
      let dax=atx-px[i],day=aty-py[i];const dl=Math.hypot(dax,day)||1;aX+=0.16*(dax/dl*maxSpd-vx[i]);aY+=0.16*(day/dl*maxSpd-vy[i]);
      const mrg=S*0.13; if(px[i]<mrg)aX+=maxF*0.8; else if(px[i]>W-mrg)aX-=maxF*0.8; if(py[i]<mrg)aY+=maxF*0.8; else if(py[i]>H-mrg)aY-=maxF*0.8;
      if(pred){const dx=px[i]-pdx,dy=py[i]-pdy,d=Math.hypot(dx,dy)||1;if(d<S*0.22){const f=8*(1-d/(S*0.22));aX+=dx/d*maxF*f - dy/d*maxF*f*0.7;aY+=dy/d*maxF*f + dx/d*maxF*f*0.7;}}
      // clamp force
      const af=Math.hypot(aX,aY);if(af>maxF){aX=aX/af*maxF;aY=aY/af*maxF;}
      vx[i]+=aX;vy[i]+=aY;let sp=Math.hypot(vx[i],vy[i]);const lim=maxSpd*(move==='Settle'?(1-0.5*settleK):1);if(sp>lim){vx[i]=vx[i]/sp*lim;vy[i]=vy[i]/sp*lim;}else if(sp<minSpd*0.6&&sp>0){vx[i]=vx[i]/sp*minSpd*0.6;vy[i]=vy[i]/sp*minSpd*0.6;}
      px[i]+=vx[i];py[i]+=vy[i];
    }
    // store trail
    if(s>=warm){const slot=thead;for(let i=0;i<N;i++){tx[i*L+slot]=px[i];ty[i*L+slot]=py[i];}thead=(thead+1)%L;if(tlen<L)tlen++;}
  }
  for(let s=0;s<STEPS;s++)step(s);
  // ---- render the accumulated ink trails ----
  x.globalCompositeOperation = P.dark? 'lighter':'multiply';
  x.lineCap='round';x.lineJoin='round';
  for(let i=0;i<N;i++){
    const z=((i*2654435761)>>>0)/4294967296; // stable pseudo-depth per agent
    const isAcc= z>0.94;
    const col= isAcc? P.acc : (z<0.4? P.sec : P.ink);
    x.strokeStyle=col; x.lineWidth=0.5+z*1.7;
    x.globalAlpha=(P.dark?0.07:0.06)+z*0.07;
    x.beginPath();
    for(let k=0;k<tlen;k++){const slot=(thead+k)%L;const X=tx[i*L+slot],Y=ty[i*L+slot];if(k===0)x.moveTo(X,Y);else x.lineTo(X,Y);}
    x.stroke();
  }
  x.globalAlpha=1; x.globalCompositeOperation='source-over';
  // ---- finish: grain, vignette, plate-mark ----
  x.save();x.globalAlpha=0.05;for(let i=0;i<W*H/900;i++){x.fillStyle=r()<0.5?'#000':'#fff';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  const vg=x.createRadialGradient(W/2,H/2,S*0.34,W/2,H/2,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,P.dark?'rgba(0,0,0,0.5)':'rgba(40,30,20,0.18)');x.fillStyle=vg;x.fillRect(0,0,W,H);
  x.strokeStyle=P.dark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.12)';x.lineWidth=1;x.strokeRect(W*0.045,H*0.045,W*0.91,H*0.91);
}
function castQuorum(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*Q_PALS.length);
  const fmt=pick(Q_FMTS,r);
  const move=pick(Q_MOVE,r);
  const mult=pick(Q_MULT,r);
  return {palette:Q_PALS[palI].name, format:fmt.t, movement:move, multitude:mult};
}

/* KONKRET — "Konkret": concrete / constructivist minimalism (Lohse, Bill,
   Müller-Brockmann, De Stijl, Vera Molnár, Bauhaus). One disciplined geometric
   system per output, restrained palette, generous margins, precise alignment,
   subtle paper. Small editions. Flat by design — elegance from proportion. */

/* Quorum */
export const quorumTraits: TraitsFn = (id) => { const c = castQuorum(id) as any; return { Palette: c.palette, Format: c.format, Movement: c.movement, Multitude: c.multitude }; };
export const quorumSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Ink','Charcoal','Indigo Dusk','Sepia','Slate','Payne Grey','Oxblood','Twilight','Nocturne','Bone'] },
  { name: 'Format', values: ['Portrait','Landscape','Square','Panorama','Tall'] },
  { name: 'Movement', values: ['Drift','Gather','Cascade','Split','Settle'] },
  { name: 'Multitude', values: ['Few','Many','Legion'] },
] };
export const renderQuorum = blit(quorum, quorumTraits);
export const QUORUM_ASPECTS = [0.79, 1.27, 1, 1.83, 0.64] as const;
