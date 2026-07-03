// @ts-nocheck
/*
 * Price Discovery — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, shade, fbm2, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const PD_PALS=[
  {name:'Dusk', top:'#221a3a', bot:'#070510', bid:'#2bd4a8', ask:'#ff5a7a', seam:'#ffe6a8'},
  {name:'Ember', top:'#2a0e08', bot:'#0a0402', bid:'#ffb000', ask:'#ff3d2e', seam:'#fff0c0'},
  {name:'Abyss', top:'#06121c', bot:'#01060c', bid:'#00e5ff', ask:'#3a6bff', seam:'#cfeeff'},
  {name:'Aurora', top:'#0a1a14', bot:'#02080a', bid:'#70ff9f', ask:'#b388ff', seam:'#eaffd0'},
  {name:'Mono', top:'#161616', bot:'#050505', bid:'#d6d6d6', ask:'#8a8a8a', seam:'#ffffff'},
  {name:'Oxide', top:'#241405', bot:'#0a0602', bid:'#e0a000', ask:'#9a4bff', seam:'#ffe0b0'},
];
const PD_FMTS=[{W:1240,H:980,t:'Landscape'},{W:1500,H:820,t:'Panorama'},{W:1080,H:1080,t:'Square'},{W:980,H:1240,t:'Portrait'}];
const PD_REGIME=['Calm','Trending','Volatile','Crash','Squeeze'];
const PD_COMPS=['canyon','canyon','radial','horizon'];
function pricediscovery(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*PD_PALS.length);
  const fmt=pick(PD_FMTS,r);
  const regime=pick(PD_REGIME,r);
  const spread=pick(['Razor','Normal','Yawning'],r);
  const imb=pick(['Bid-heavy','Balanced','Ask-heavy'],r);
  const comp=pick(PD_COMPS,r);
  // ---- end trait draws ----
  const P=PD_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  const NO=seed*0.011+5;
  // dusk sky
  const sky=x.createLinearGradient(0,0,0,H); sky.addColorStop(0,P.top); sky.addColorStop(1,P.bot); x.fillStyle=sky; x.fillRect(0,0,W,H);
  // faint star/dust
  x.globalAlpha=0.5;for(let i=0;i<W*H/5000;i++){x.fillStyle='rgba(255,255,255,'+(0.05+r()*0.12)+')';x.fillRect(r()*W,r()*H*0.6,1,1);}x.globalAlpha=1;
  const amp= regime==='Calm'?0.5: regime==='Trending'?0.7: regime==='Volatile'?1.1: regime==='Crash'?1.4:1.2;
  const wallP= regime==='Squeeze'?0.10: regime==='Volatile'?0.06:0.03;
  const cols=Math.round(W/3);
  const shift= imb==='Bid-heavy'?-0.08: imb==='Ask-heavy'?0.08:0;
  const spr= spread==='Razor'?0.012: spread==='Normal'?0.03:0.06;
  const mid=Math.round(cols*(0.5+shift)), gap=Math.max(2,Math.round(cols*spr));
  const dep=new Float32Array(cols);
  function size(c,side){let s=0.22+fbm2(c*0.05+NO,2)*amp;
    if(r()<wallP)s+=3+r()*6*amp;                 // liquidity wall — sharp mesa
    if(r()<0.045)s=0.02;                          // void / fault gap
    if(regime==='Trending')s*= side<0?(0.55+(c/cols)*1.0):(1.55-(c/cols)*1.0); // skewed book
    return Math.max(0.01,s);}
  let acc=0; for(let c=mid-gap;c>=0;c--){acc+=size(c,-1);dep[c]=acc;}
  acc=0; for(let c=mid+gap;c<cols;c++){acc+=size(c,1);dep[c]=acc;}
  if(regime==='Crash'){const collapse=r()<0.5?-1:1;for(let c=0;c<cols;c++){const side=c<mid?-1:1;if(side===collapse)dep[c]*=0.18+(c<mid?c/Math.max(1,mid):(cols-c)/Math.max(1,cols-mid))*0.35;}}
  let maxd=0.001; for(let c=0;c<cols;c++) maxd=Math.max(maxd,dep[c]);
  if(comp==='radial'){
    const cx=W/2, cy=H/2, baseR=S*0.1, maxR=S*0.43, scaleR=(maxR-baseR)/maxd;
    const rad=new Float32Array(cols);
    for(let c=0;c<cols;c++){const inGap=c>mid-gap&&c<mid+gap; const rough=((fbm2(c*0.06+NO,7)-0.5)*1.6+(fbm2(c*0.3+NO,11)-0.5)*0.7)*S*0.04*amp; rad[c]= inGap? baseR*1.15 : baseR+dep[c]*scaleR+rough;}
    function ringPath(){x.beginPath();for(let c=0;c<=cols;c++){const cc=c%cols;const a=cc/cols*6.283-1.5708;const R=rad[cc];const px=cx+Math.cos(a)*R,py=cy+Math.sin(a)*R;if(c===0)x.moveTo(px,py);else x.lineTo(px,py);}x.closePath();}
    x.save();ringPath();x.clip();
    for(let c=0;c<cols;c++){const a=c/cols*6.283-1.5708;x.fillStyle=c<mid?P.bid:P.ask;x.globalAlpha=0.55;x.beginPath();x.moveTo(cx,cy);x.arc(cx,cy,maxR*1.3,a-0.03,a+6.283/cols+0.03);x.closePath();x.fill();}x.globalAlpha=1;
    const rg=x.createRadialGradient(cx,cy,baseR*0.5,cx,cy,maxR);rg.addColorStop(0,'rgba(0,0,0,0.5)');rg.addColorStop(0.5,'transparent');rg.addColorStop(1,'rgba(0,0,0,0.45)');x.fillStyle=rg;x.fillRect(0,0,W,H);
    x.globalCompositeOperation='multiply';for(let rr=baseR;rr<maxR;rr+=S*0.013){x.strokeStyle='rgba(14,8,4,'+(0.12+fbm2(rr*0.06,NO)*0.14)+')';x.lineWidth=Math.max(1,S*0.0035);x.beginPath();x.arc(cx,cy,rr,0,6.283);x.stroke();}
    x.globalCompositeOperation='source-over';x.restore();
    x.save();x.globalCompositeOperation='lighter';for(const p of [[7,0.12],[3,0.32],[1.4,0.85]]){x.lineWidth=p[0];x.globalAlpha=p[1];x.strokeStyle=P.seam;ringPath();x.stroke();}x.restore();x.globalAlpha=1;
    const ma=mid/cols*6.283-1.5708;
    x.save();x.globalCompositeOperation='lighter';
    const pg=x.createRadialGradient(cx,cy,0,cx,cy,baseR*1.7);pg.addColorStop(0,P.seam);pg.addColorStop(0.6,P.seam);pg.addColorStop(1,'transparent');x.fillStyle=pg;x.beginPath();x.arc(cx,cy,baseR*1.7,0,6.283);x.fill();
    const bm=x.createLinearGradient(cx,cy,cx+Math.cos(ma)*maxR,cy+Math.sin(ma)*maxR);bm.addColorStop(0,P.seam);bm.addColorStop(1,'transparent');x.strokeStyle=bm;x.lineWidth=S*0.012;x.lineCap='round';x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(ma)*maxR,cy+Math.sin(ma)*maxR);x.stroke();
    x.restore();x.globalAlpha=1;
  }
  else if(comp==='horizon'){
    const hy=H*(0.5+r()*0.14), sunX=mid*(W/cols);
    x.save();x.globalCompositeOperation='lighter';const sun=x.createRadialGradient(sunX,hy,0,sunX,hy,S*0.32);sun.addColorStop(0,P.seam);sun.addColorStop(0.35,P.seam);sun.addColorStop(1,'transparent');x.globalAlpha=0.85;x.fillStyle=sun;x.beginPath();x.arc(sunX,hy,S*0.32,0,6.283);x.fill();x.restore();x.globalAlpha=1;
    for(let L=0;L<4;L++){const t=L/3;const col=shade(L<2?P.ask:P.bid,Math.round((1-t)*36-8));const yBase=hy+t*(H-hy)*0.92;const ampL=S*(0.045+t*0.12);
      x.fillStyle=col;x.globalAlpha=0.6+t*0.4;x.beginPath();x.moveTo(0,H);
      for(let xx=0;xx<=W;xx+=W/140){const dd=dep[Math.min(cols-1,Math.floor(xx/W*cols))]/maxd;const yy=yBase-(fbm2(xx*0.004+L*9+NO,3))*ampL-dd*ampL*0.5;x.lineTo(xx,yy);}
      x.lineTo(W,H);x.closePath();x.fill();}
    x.globalAlpha=1;
    x.save();x.globalCompositeOperation='lighter';const beam=x.createLinearGradient(sunX-S*0.025,0,sunX+S*0.025,0);beam.addColorStop(0,'transparent');beam.addColorStop(0.5,P.seam);beam.addColorStop(1,'transparent');x.globalAlpha=0.45;x.fillStyle=beam;x.fillRect(sunX-S*0.025,0,S*0.05,H);x.restore();x.globalAlpha=1;
  }
  else {
  const frameF= regime==='Crash'?0.42:0.5+r()*0.32;
  const scaleH=H*frameF/maxd, base=H*(0.9+r()*0.07);
  const cw=W/cols; const seamX=mid*cw;
  const top=new Float32Array(cols);
  for(let c=0;c<cols;c++){const inGap=c>mid-gap&&c<mid+gap; if(inGap){top[c]=base;continue;} const rough=((fbm2(c*0.07+NO,7)-0.5)*1.7+(fbm2(c*0.22+NO,13)-0.5)*0.85+(fbm2(c*0.5+NO,17)-0.5)*0.4)*S*0.055*amp; let t=base-dep[c]*scaleH+rough; if(t>base-2)t=base-2; if(t<H*0.04)t=H*0.04; top[c]=t;}
  // terrain fill (per-column vertical strips, side-coloured, dark at base)
  for(let c=0;c<cols;c++){const inGap=c>mid-gap&&c<mid+gap; if(inGap)continue; const side= c<mid? P.bid:P.ask; const g=x.createLinearGradient(0,top[c],0,base); g.addColorStop(0,shade(side,30)); g.addColorStop(0.5,side); g.addColorStop(1,P.bot); x.fillStyle=g; x.fillRect(c*cw,top[c],cw+1,base-top[c]);}
  // sedimentary strata: horizontal dark bands clipped to terrain
  x.save(); x.beginPath(); x.moveTo(0,base); for(let c=0;c<cols;c++)x.lineTo(c*cw+cw/2,top[c]); x.lineTo(W,base); x.closePath(); x.clip();
  for(let yy=0;yy<H;yy+=S*0.015){const t=fbm2(yy*0.05,NO);x.globalCompositeOperation='multiply';x.fillStyle='rgba(16,9,4,'+(0.12+t*0.16)+')';x.fillRect(0,yy,W,Math.max(1,S*0.005));x.globalCompositeOperation='lighter';x.fillStyle='rgba(255,238,205,'+(0.015+t*0.045)+')';x.fillRect(0,yy+S*0.008,W,Math.max(1,S*0.0025));}
  x.globalCompositeOperation='lighter';
  const rlL=x.createLinearGradient(seamX-W*0.24,0,seamX,0);rlL.addColorStop(0,'transparent');rlL.addColorStop(1,'rgba(255,236,200,0.13)');x.fillStyle=rlL;x.fillRect(0,0,seamX,base);
  const rlR=x.createLinearGradient(seamX,0,seamX+W*0.24,0);rlR.addColorStop(0,'rgba(255,236,200,0.13)');rlR.addColorStop(1,'transparent');x.fillStyle=rlR;x.fillRect(seamX,0,W-seamX,base);
  x.globalCompositeOperation='source-over'; x.restore();
  // glowing ridge line (additive)
  x.save(); x.globalCompositeOperation='lighter'; x.lineCap='round';
  for(const [lw,al] of [[6,0.12],[3,0.3],[1.4,0.8]]){ x.lineWidth=lw; x.globalAlpha=al; x.beginPath(); let started=false; for(let c=0;c<cols;c++){const inGap=c>mid-gap&&c<mid+gap; if(inGap){started=false;continue;} const col=c<mid?P.bid:P.ask; x.strokeStyle=col; if(!started){x.moveTo(c*cw+cw/2,top[c]);started=true;}else x.lineTo(c*cw+cw/2,top[c]); } x.stroke(); }
  x.restore(); x.globalAlpha=1;
  // central spread seam — hot glowing canyon
  const sg=x.createLinearGradient(seamX-gap*cw*1.4,0,seamX+gap*cw*1.4,0); sg.addColorStop(0,'transparent'); sg.addColorStop(0.5,P.seam); sg.addColorStop(1,'transparent');
  x.save(); x.globalCompositeOperation='lighter'; x.globalAlpha=0.9; x.fillStyle=sg; x.fillRect(seamX-gap*cw*1.4,0,gap*cw*2.8,base);
  x.globalAlpha=1; x.fillStyle=P.seam; x.fillRect(seamX-1,base-H*0.4,2,H*0.4); x.restore();
  // trade prints near ridges (sediment grains)
  x.save(); x.globalCompositeOperation='lighter'; for(let i=0;i<cols*0.5;i++){const c=Math.floor(r()*cols);const inGap=c>mid-gap&&c<mid+gap;if(inGap)continue;const px=c*cw+cw/2, py=top[c]+r()*(base-top[c])*0.4; x.fillStyle= c<mid?P.bid:P.ask; x.globalAlpha=0.2+r()*0.5; const s=r()<0.1?2.4:1.2; x.fillRect(px,py,s,s);} x.restore(); x.globalAlpha=1;
  }
  // atmosphere: grain + vignette
  x.save();x.globalAlpha=0.04;for(let i=0;i<W*H/700;i++){x.fillStyle=r()<0.5?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  const vg=x.createRadialGradient(W/2,H*0.5,S*0.35,W/2,H*0.5,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.55)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castPricediscovery(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*PD_PALS.length);
  const fmt=pick(PD_FMTS,r);
  const regime=pick(PD_REGIME,r);
  const spread=pick(['Razor','Normal','Yawning'],r);
  const imb=pick(['Bid-heavy','Balanced','Ask-heavy'],r);
  const comp=pick(PD_COMPS,r);
  return {palette:PD_PALS[palI].name, format:fmt.t, regime, spread, book:imb, view:comp};
}

/* LIQUIDLIGHT — "Liquid Light": 60s/70s liquid-light-show psychedelia. A
   domain-warped colour field sampled through kaleidoscope symmetry / oil-on-
   water marbling / log-polar vortex, additive glow. Vivid + dreamy (the
   'Dreampool' palette is the Vondelpark vibe). cast mirrors the leads. */

/* Price Discovery */
export const pricediscoveryTraits: TraitsFn = (id) => { const c = castPricediscovery(id) as any; return { Palette: c.palette, Format: c.format, Regime: c.regime, Spread: c.spread, Book: c.book, View: cap(c.view) }; };
export const pricediscoverySchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Dusk','Ember','Abyss','Aurora','Mono','Oxide'] },
  { name: 'Format', values: ['Landscape','Panorama','Square','Portrait'] },
  { name: 'Regime', values: ['Calm','Trending','Volatile','Crash','Squeeze'] },
  { name: 'Spread', values: ['Razor','Normal','Yawning'] },
  { name: 'Book', values: ['Bid-heavy','Balanced','Ask-heavy'] },
  { name: 'View', values: ['Canyon','Radial','Horizon'] },
] };
export const renderPricediscovery = blit(pricediscovery, pricediscoveryTraits);
export const PRICEDISCOVERY_ASPECTS = [1.27, 1.83, 1, 0.79] as const;
