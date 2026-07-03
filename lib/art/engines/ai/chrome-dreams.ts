// @ts-nocheck
/*
 * Chrome Dreams — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shade, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const Y2K_PALS=[
  {name:'Chrome', bg:'#0a1020', chrome:['#d8e8ff','#ffffff','#1a2740','#7d8a9c','#e9eef5','#c0843a'], base:'#9fb4cc', glow:'#bfe3ff'},
  {name:'Sky', bg:'#0a2a4a', chrome:['#dff1ff','#ffffff','#16466e','#4f9fd6','#eaf6ff','#bfe3ff'], base:'#7ec8ff', glow:'#bfe3ff'},
  {name:'Acid Gel', bg:'#0e1a00', chrome:['#eaffb0','#ffffff','#2a5500','#7fae2a','#f2ffcf','#c8ff00'], base:'#8fd11a', glow:'#d4ff3d'},
  {name:'Bubblegum', bg:'#1a0030', chrome:['#ffd6f6','#ffffff','#5a1a8c','#c46cff','#ffe6fb','#ff4fd8'], base:'#ff7eed', glow:'#ff9ad5'},
  {name:'Sunburst', bg:'#2a1400', chrome:['#fff3b0','#ffffff','#7a3500','#e0a800','#fff7d0','#ff8a00'], base:'#ffb000', glow:'#ffd200'},
  {name:'Aqua', bg:'#001a1a', chrome:['#c8fff5','#ffffff','#004a44','#2ad6c0','#e0fff9','#00f5d4'], base:'#10c8b0', glow:'#7afcff'},
  {name:'Steel', bg:'#101418', chrome:['#e8eef5','#ffffff','#20262e','#6b7280','#d6dde6','#a0a8b4'], base:'#aeb6c2', glow:'#dfe6ee'},
  {name:'Holo', bg:'#08081a', chrome:['#bdfcff','#ffffff','#2a1a5a','#b388ff','#e8e0ff','#ff8ad6'], base:'#9affd0', glow:'#bdfcff'},
];
const Y2K_FMTS=[{W:1080,H:1080,t:'Square'},{W:1280,H:880,t:'Landscape'},{W:880,H:1180,t:'Portrait'},{W:1500,H:760,t:'Wide'},{W:760,H:1280,t:'Tall'}];
const Y2K_LAYOUTS=['badge','wordmark','emblem','swoosh'];
const Y2K_FINISH=['chrome','gel','holo'];
const Y2K_MOTIF=['atom','star','blob','burst'];
const Y2K_WORDS=['NOVA','ZENITH','HYPER','VORTEX','PLASMA','TURBO','ULTRA','FUSION','ORBIT','NEXUS','CHROME','MAXX','AQUA','CYBER','GLOSS','FLUX','ZONE','MEGA','VIBE','2000','XTC','RAD','SK8','BLAST'];
function chromedreams(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*Y2K_PALS.length);
  const fmtI=Math.floor(r()*Y2K_FMTS.length);
  const layout=pick(Y2K_LAYOUTS,r);
  const finish=pick(Y2K_FINISH,r);
  const motif=pick(Y2K_MOTIF,r);
  const wordI=Math.floor(r()*Y2K_WORDS.length);
  // ---- end trait draws ----
  const P=Y2K_PALS[palI], F=Y2K_FMTS[fmtI], word=Y2K_WORDS[wordI]; const W=F.W,H=F.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const HOLO=['#7defff','#b388ff','#ff8ad6','#fff2a8','#9affd0','#7defff'];
  function chromeGrad(y0,y1){const g=x.createLinearGradient(0,y0,0,y1),c=P.chrome;g.addColorStop(0,c[0]);g.addColorStop(0.44,c[1]);g.addColorStop(0.5,c[2]);g.addColorStop(0.57,c[3]);g.addColorStop(0.8,c[4]);g.addColorStop(1,c[5]);return g;}
  function holoGrad(x0,x1){const g=x.createLinearGradient(x0,0,x1,0);HOLO.forEach((c,i)=>g.addColorStop(i/(HOLO.length-1),c));return g;}
  function fillFor(y0,y1,x0,x1){return finish==='holo'?holoGrad(x0,x1):finish==='gel'?(function(){const g=x.createLinearGradient(0,y0,0,y1);g.addColorStop(0,shade(P.base,70));g.addColorStop(0.5,P.base);g.addColorStop(1,shade(P.base,-55));return g;})():chromeGrad(y0,y1);}
  function sparkle(cx,cy,R){x.save();x.globalCompositeOperation='lighter';const cg=x.createRadialGradient(cx,cy,0,cx,cy,R);cg.addColorStop(0,'#ffffff');cg.addColorStop(0.4,'#ffffff');cg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=cg;x.beginPath();x.arc(cx,cy,R,0,6.29);x.fill();
    x.fillStyle='#ffffff';for(let k=0;k<2;k++){const rot=k*1.5708;x.save();x.translate(cx,cy);x.rotate(rot);x.beginPath();x.moveTo(0,-R*2.2);x.lineTo(R*0.18,0);x.lineTo(0,R*2.2);x.lineTo(-R*0.18,0);x.closePath();x.fill();x.restore();}
    x.fillStyle='rgba(255,255,255,0.6)';for(let k=0;k<2;k++){const rot=k*1.5708+0.785;x.save();x.translate(cx,cy);x.rotate(rot);x.beginPath();x.moveTo(0,-R*1.1);x.lineTo(R*0.1,0);x.lineTo(0,R*1.1);x.lineTo(-R*0.1,0);x.closePath();x.fill();x.restore();}x.restore();}
  function blobPath(cx,cy,R){x.beginPath();const N=10;for(let i=0;i<=N;i++){const a=i/N*6.283,rr=R*(1+0.16*Math.sin(a*3+seed)+0.1*Math.sin(a*5));const px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr;if(i===0)x.moveTo(px,py);else{const pa=(i-1)/N*6.283,prr=R*(1+0.16*Math.sin(pa*3+seed)+0.1*Math.sin(pa*5));const ppx=cx+Math.cos(pa)*prr,ppy=cy+Math.sin(pa)*prr;x.quadraticCurveTo(ppx,ppy,(ppx+px)/2,(ppy+py)/2);}}x.closePath();}
  function emblemPath(cx,cy,R){if(motif==='blob'){blobPath(cx,cy,R);}else if(motif==='star'||motif==='burst'){const pts=motif==='burst'?12:5;x.beginPath();for(let i=0;i<pts*2;i++){const a=i/(pts*2)*6.283-1.5708,rr=i%2?R*0.46:R;x.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr);}x.closePath();}else{x.beginPath();x.ellipse(cx,cy,R,R*0.82,0,0,6.29);x.closePath();}}
  function emblem(cx,cy,R){
    x.save();x.shadowColor='rgba(0,0,0,0.45)';x.shadowBlur=R*0.3;x.shadowOffsetY=R*0.12;emblemPath(cx,cy,R);x.fillStyle=P.chrome[2];x.fill();x.restore();
    emblemPath(cx,cy,R);x.fillStyle=fillFor(cy-R,cy+R,cx-R,cx+R);x.fill();
    // gloss cap
    x.save();emblemPath(cx,cy,R);x.clip();const hg=x.createLinearGradient(0,cy-R,0,cy);hg.addColorStop(0,'rgba(255,255,255,0.7)');hg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=hg;x.fillRect(cx-R,cy-R,R*2,R);x.restore();
    emblemPath(cx,cy,R);x.lineWidth=Math.max(2,R*0.04);x.strokeStyle='#0a0e16';x.stroke();
    // inner motif
    if(motif==='atom'){x.strokeStyle=P.chrome[1];x.lineWidth=R*0.05;for(let k=0;k<3;k++){x.save();x.translate(cx,cy);x.rotate(k*1.047);x.beginPath();x.ellipse(0,0,R*0.62,R*0.24,0,0,6.29);x.stroke();x.restore();}x.fillStyle=P.glow;x.beginPath();x.arc(cx,cy,R*0.12,0,6.29);x.fill();}
    sparkle(cx-R*0.4,cy-R*0.42,R*0.16);
  }
  function fillWord(wd,cx,cy,size){
    x.font='bold '+size+'px "Arial Black",Impact,"Liberation Sans",sans-serif';x.textAlign='center';x.textBaseline='middle';
    const w=x.measureText(wd).width,y0=cy-size*0.5,y1=cy+size*0.52;
    x.save();x.shadowColor='rgba(0,0,0,0.5)';x.shadowBlur=size*0.14;x.shadowOffsetY=size*0.09;x.fillStyle='rgba(0,0,0,0.5)';x.fillText(wd,cx,cy);x.restore();
    x.fillStyle=P.chrome[2];x.fillText(wd,cx+2.5,cy+2.5);
    x.fillStyle=P.chrome[1];x.fillText(wd,cx-2,cy-2);
    x.fillStyle=fillFor(y0,y1,cx-w/2,cx+w/2);x.fillText(wd,cx,cy);
    if(finish==='gel'){const hg=x.createLinearGradient(0,y0,0,cy);hg.addColorStop(0,'rgba(255,255,255,0.85)');hg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=hg;x.fillText(wd,cx,cy);}
    else{const hg=x.createLinearGradient(0,y0,0,(y0+cy)/2);hg.addColorStop(0,'rgba(255,255,255,0.9)');hg.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=hg;x.fillText(wd,cx,cy-size*0.02);}
    x.lineWidth=Math.max(1.5,size*0.022);x.strokeStyle='#0a0e16';x.strokeText(wd,cx,cy);
    return w;
  }
  function swoosh(cx,cy,wd){x.save();x.globalCompositeOperation='lighter';const g=x.createLinearGradient(cx-wd,cy,cx+wd,cy);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(0.5,P.glow);g.addColorStop(1,'rgba(255,255,255,0)');x.strokeStyle=g;x.lineCap='round';
    [22,10,4].forEach((lw,i)=>{x.globalAlpha=i===2?0.9:0.4;x.lineWidth=lw;x.beginPath();x.moveTo(cx-wd,cy+30);x.quadraticCurveTo(cx,cy-60,cx+wd,cy-10);x.stroke();});x.restore();}
  // ---- background ----
  const bgg=x.createRadialGradient(W*0.5,H*0.42,0,W*0.5,H*0.5,Math.max(W,H)*0.75);bgg.addColorStop(0,shade(P.bg,18));bgg.addColorStop(1,P.bg);x.fillStyle=bgg;x.fillRect(0,0,W,H);
  if(finish==='holo'){x.save();x.globalAlpha=0.16;x.globalCompositeOperation='lighter';x.fillStyle=holoGrad(0,W);x.fillRect(0,0,W,H);x.restore();}
  // faint techno grid
  x.strokeStyle='rgba(255,255,255,0.05)';x.lineWidth=1;for(let gx=0;gx<W;gx+=44){x.beginPath();x.moveTo(gx,0);x.lineTo(gx,H);x.stroke();}for(let gy=0;gy<H;gy+=44){x.beginPath();x.moveTo(0,gy);x.lineTo(W,gy);x.stroke();}
  // central glow
  x.save();x.globalCompositeOperation='lighter';const cg=x.createRadialGradient(W/2,H*0.46,0,W/2,H*0.46,Math.min(W,H)*0.5);cg.addColorStop(0,P.glow+'33');cg.addColorStop(1,'transparent');x.fillStyle=cg;x.fillRect(0,0,W,H);x.restore();
  const S=Math.min(W,H);
  if(layout==='emblem'){
    emblem(W/2,H*0.46,S*0.3);
    if(motif!=='atom'){x.save();x.globalCompositeOperation='lighter';x.strokeStyle=P.glow;x.lineWidth=3;x.globalAlpha=0.7;x.beginPath();x.ellipse(W/2,H*0.46,S*0.42,S*0.16,0.4,0,6.29);x.stroke();x.fillStyle=P.glow;x.beginPath();x.arc(W/2+S*0.42*Math.cos(0.4),H*0.46+S*0.16*Math.sin(0.4),7,0,6.29);x.fill();x.restore();}
  } else if(layout==='wordmark'){
    fillWord(word,W/2,H*0.48,S*(0.2+(word.length<5?0.06:0)));
  } else if(layout==='swoosh'){
    swoosh(W/2,H*0.46,S*0.4);
    fillWord(word,W/2,H*0.5,S*0.18);
  } else { // badge
    emblem(W/2,H*0.36,S*0.2);
    fillWord(word,W/2,H*0.66,S*0.15);
  }
  // sparkle accents (asymmetric, varied)
  const ns=rint(r,3,6);for(let i=0;i<ns;i++){sparkle(W*(0.1+r()*0.8),H*(0.1+r()*0.8),S*(0.012+r()*0.04));}
  // subtle vignette
  const vg=x.createRadialGradient(W/2,H/2,S*0.3,W/2,H/2,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.4)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castChromedreams(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*Y2K_PALS.length);
  const fmtI=Math.floor(r()*Y2K_FMTS.length);
  const layout=pick(Y2K_LAYOUTS,r);
  const finish=pick(Y2K_FINISH,r);
  const motif=pick(Y2K_MOTIF,r);
  const wordI=Math.floor(r()*Y2K_WORDS.length);
  return {palName:Y2K_PALS[palI].name, fmtT:Y2K_FMTS[fmtI].t, layout, finish, motif, word:Y2K_WORDS[wordI]};
}

/* DISCORD — "Riding The Oil": PD started as a Discord server. The hero is the
   sales feed — a marketplace bot posting "SOLD" embeds buried in emoji reacts
   (huge PD lore), with the surfer+oil-barrel meme as the house reaction.
   Busy/established counts. Layouts: sales / channel / members / emoji / servers. */

/* Chrome Dreams */
export const chromedreamsTraits: TraitsFn = (id) => { const c = castChromedreams(id) as any; return { Palette: c.palName, Format: c.fmtT, Layout: cap(c.layout), Finish: cap(c.finish), Motif: cap(c.motif), Word: c.word }; };
export const chromedreamsSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Chrome','Sky','Acid Gel','Bubblegum','Sunburst','Aqua','Steel','Holo'] },
  { name: 'Format', values: ['Square','Landscape','Portrait','Wide','Tall'] },
  { name: 'Layout', values: ['Badge','Wordmark','Emblem','Swoosh'] },
  { name: 'Finish', values: ['Chrome','Gel','Holo'] },
  { name: 'Motif', values: ['Atom','Star','Blob','Burst'] },
] };
export const renderChromedreams = blit(chromedreams, chromedreamsTraits);
export const CHROMEDREAMS_ASPECTS = [1, 1.45, 0.75, 1.97, 0.59] as const;
