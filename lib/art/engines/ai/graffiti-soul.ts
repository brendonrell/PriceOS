// @ts-nocheck
/*
 * Graffiti Soul — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shade, star, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const GRAF_PALS=[
  {name:'Tokyo-to', wall:'#191921', ink:['#ff2e63','#08d9d6','#ffde00','#ff7a2b','#f5f5f5']},
  {name:'Rudie', wall:'#efe6d2', ink:['#d62828','#003049','#f77f00','#118ab2','#06d6a0']},
  {name:'Concrete', wall:'#3a3a40', ink:['#ffd400','#ff2e63','#23d5ab','#ffffff','#ff7a2b']},
  {name:'Funk', wall:'#120a1f', ink:['#f900bf','#fffb00','#00fff5','#ff6d00','#ffffff']},
  {name:'Acid', wall:'#0c1406', ink:['#c8ff00','#ff006e','#00e5ff','#ffaa00','#ffffff']},
  {name:'Bubblegum', wall:'#ffe3ef', ink:['#ff0a6c','#7b2ff7','#00b4d8','#ffd000','#222222']},
  {name:'Heatwave', wall:'#2a0a00', ink:['#ff5400','#ffd000','#ff006e','#00f5d4','#fff']},
  {name:'Ice Cream', wall:'#fff6ea', ink:['#ff7eb6','#7afcff','#feff9c','#a685e2','#2b2b2b']},
  {name:'Midnight Tag', wall:'#0a0a14', ink:['#00ff9f','#ff2d6d','#ffe600','#16a4ff','#fff']},
  {name:'Brick', wall:'#5a2a22', ink:['#ffd60a','#06d6a0','#ef476f','#ffffff','#118ab2']},
  {name:'Vapor Wall', wall:'#241a52', ink:['#ff71ce','#01cdfe','#05ffa1','#fffb96','#fff']},
  {name:'Mono Pop', wall:'#101010', ink:['#ffffff','#ff3b3b','#f5f5f5','#ffd000','#cccccc']},
];
const GRAF_FMTS=[{W:1080,H:1080,t:'Square'},{W:920,H:1280,t:'Portrait'},{W:1280,H:920,t:'Landscape'},{W:760,H:1300,t:'Tall'},{W:1500,H:760,t:'Wide'}];
const GRAF_MODES=['piece','bombing','arrows','splash','character'];
function graffiti(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*GRAF_PALS.length);
  const fmtI=Math.floor(r()*GRAF_FMTS.length);
  const mode=pick(GRAF_MODES,r);
  const n= mode==='character'?1 : mode==='bombing'? rint(r,9,17) : mode==='arrows'? rint(r,8,20) : mode==='splash'? rint(r,4,9) : rint(r,3,5);
  // ---- end trait draws ----
  const P=GRAF_PALS[palI], F=GRAF_FMTS[fmtI]; const W=F.W,H=F.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const light=P.wall>'#888888';
  const OUT='#0d0d12';
  const col=()=>pick(P.ink,r);
  // wall: gradient + grime + grain
  const wg=x.createLinearGradient(0,0,W*0.3,H); wg.addColorStop(0,shade(P.wall,light?6:18)); wg.addColorStop(1,shade(P.wall,light?-12:-14)); x.fillStyle=wg; x.fillRect(0,0,W,H);
  for(let i=0;i<W*H/1400;i++){x.globalAlpha=0.03+r()*0.05;x.fillStyle=r()<0.5?'#000':'#fff';x.fillRect(r()*W,r()*H,2,2);} x.globalAlpha=1;
  for(let i=0;i<26;i++){x.globalAlpha=0.05+r()*0.06;x.fillStyle='#000';x.fillRect(r()*W,r()*H,r()*200,r()*8);} x.globalAlpha=1;
  function spray(cx,cy,rad,c,dens){x.save();for(let i=0;i<rad*(dens||1.6);i++){const a=r()*6.29,d=Math.pow(r(),0.5)*rad;x.globalAlpha=0.05+r()*0.18;x.fillStyle=c;x.fillRect(cx+Math.cos(a)*d,cy+Math.sin(a)*d,2.2,2.2);}x.restore();}
  function drip(px,py,len,c){x.fillStyle=c;x.fillRect(px-3.5,py,7,len);x.beginPath();x.arc(px,py+len,5.5,0,6.29);x.fill();x.lineWidth=2.5;x.strokeStyle=OUT;x.beginPath();x.arc(px,py+len,5.5,0,6.29);x.stroke();}
  function star(cx,cy,R,c){x.beginPath();for(let i=0;i<4;i++){const a=i*1.5708;x.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);const b=a+0.785;x.lineTo(cx+Math.cos(b)*R*0.3,cy+Math.sin(b)*R*0.3);}x.closePath();x.fillStyle=c;x.fill();x.lineWidth=Math.max(2,R*0.09);x.strokeStyle=OUT;x.stroke();}
  function celBlob(cx,cy,R,c,drips){
    const k=rint(r,7,11),rad=[];for(let i=0;i<k;i++)rad.push(R*(0.72+r()*0.5));
    function pathIt(ox,oy){x.beginPath();for(let i=0;i<=k;i++){const a=i/k*6.283,rr=rad[i%k],px=cx+ox+Math.cos(a)*rr,py=cy+oy+Math.sin(a)*rr;if(i===0)x.moveTo(px,py);else{const pa=(i-1)/k*6.283,prr=rad[(i-1)%k],ppx=cx+ox+Math.cos(pa)*prr,ppy=cy+oy+Math.sin(pa)*prr;x.quadraticCurveTo(ppx,ppy,(ppx+px)/2,(ppy+py)/2);}}x.closePath();}
    pathIt(R*0.13,R*0.16);x.fillStyle='rgba(0,0,0,0.32)';x.fill();
    if(drips)for(let d=0;d<rint(r,1,4);d++){const a=1.2+r()*0.8;drip(cx+Math.cos(a)*R*0.7,cy+Math.sin(a)*R*0.7,R*(0.3+r()*0.7),c);}
    pathIt(0,0);x.fillStyle=c;x.fill();
    x.save();pathIt(0,0);x.clip();x.fillStyle='rgba(0,0,0,0.20)';x.beginPath();x.arc(cx+R*0.55,cy+R*0.55,R*1.15,0,6.29);x.fill();
    x.fillStyle='rgba(255,255,255,0.55)';x.beginPath();x.ellipse(cx-R*0.32,cy-R*0.42,R*0.30,R*0.17,-0.5,0,6.29);x.fill();x.restore();
    pathIt(0,0);x.lineWidth=Math.max(4,R*0.13);x.lineJoin='round';x.strokeStyle=OUT;x.stroke();
  }
  function arrow(cx,cy,L,th,ang,c){const t=th,pts=[[-L/2,-t/2],[L/6,-t/2],[L/6,-t],[L/2,0],[L/6,t],[L/6,t/2],[-L/2,t/2]];
    x.save();x.translate(cx,cy);x.rotate(ang);
    x.save();x.translate(L*0.05+8,L*0.05+10);x.fillStyle='rgba(0,0,0,0.3)';x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill();x.restore();
    x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fillStyle=c;x.fill();
    x.lineJoin='round';x.lineWidth=Math.max(4,th*0.18);x.strokeStyle=OUT;x.stroke();
    x.strokeStyle='rgba(255,255,255,0.55)';x.lineWidth=Math.max(2,th*0.08);x.beginPath();x.moveTo(-L*0.42,-t*0.28);x.lineTo(L*0.1,-t*0.28);x.stroke();x.restore();}
  function splat(cx,cy,R,c){x.fillStyle=c;for(let i=0;i<rint(r,8,16);i++){const a=r()*6.29,d=R*(0.6+r()*0.7),rr=R*(0.06+r()*0.18);x.beginPath();x.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,rr,0,6.29);x.fill();}celBlob(cx,cy,R*0.75,c,true);}
  // optional spray haze behind focal art
  function haze(cx,cy,R){spray(cx,cy,R,col(),0.8);}

  if(mode==='piece'){
    const cy=H*(0.42+r()*0.12),R=Math.min(W,H)*(0.16+r()*0.05),span=W*0.8,x0=W*0.5-span/2;
    haze(W*0.5,cy,Math.min(W,H)*0.4);
    for(let i=0;i<n;i++){const cx=x0+span*(i+0.5)/n+(r()-0.5)*30;celBlob(cx,cy+(r()-0.5)*R*0.5,R*(0.85+r()*0.4),P.ink[i%P.ink.length],true);}
    for(let i=0;i<rint(r,3,7);i++)star(W*r(),H*r(),Math.min(W,H)*(0.02+r()*0.04),col());
    if(r()<0.7)arrow(W*(0.5+ (r()-0.5)*0.4),cy-R*1.5,W*0.3,W*0.1,-0.3+r()*0.6,col());
  } else if(mode==='bombing'){
    for(let i=0;i<n;i++){const t=r();if(t<0.5)celBlob(W*r(),H*r(),Math.min(W,H)*(0.07+r()*0.09),col(),r()<0.6);else if(t<0.8)arrow(W*r(),H*r(),Math.min(W,H)*(0.18+r()*0.18),Math.min(W,H)*0.07,r()*6.29,col());else star(W*r(),H*r(),Math.min(W,H)*(0.03+r()*0.05),col());}
  } else if(mode==='arrows'){
    const flow=r()<0.5,base=(r()-0.5)*1.4;for(let i=0;i<n;i++){const L=Math.min(W,H)*(0.2+r()*0.34);arrow(r()*W,r()*H,L,L*(0.34+r()*0.14),flow?base+(r()-0.5)*0.5:r()*6.29,col());}
    for(let i=0;i<rint(r,2,5);i++)star(W*r(),H*r(),Math.min(W,H)*(0.025+r()*0.04),col());
  } else if(mode==='splash'){
    for(let i=0;i<n;i++)splat(W*(0.2+r()*0.6),H*(0.2+r()*0.6),Math.min(W,H)*(0.1+r()*0.12),col());
    for(let i=0;i<rint(r,3,8);i++)drip(W*r(),H*(0.1+r()*0.4),Math.min(W,H)*(0.08+r()*0.2),col());
  } else { // character — bold abstract mascot
    const cx=W*0.5,cy=H*0.46,R=Math.min(W,H)*0.26;haze(cx,cy,R*1.6);
    const body=P.ink[0];celBlob(cx,cy,R,body,true);
    // eyes
    for(const s of [-1,1]){x.fillStyle='#fff';x.beginPath();x.ellipse(cx+s*R*0.34,cy-R*0.18,R*0.22,R*0.27,0,0,6.29);x.fill();x.lineWidth=Math.max(3,R*0.05);x.strokeStyle=OUT;x.stroke();x.fillStyle=OUT;x.beginPath();x.arc(cx+s*R*0.34+R*0.05,cy-R*0.12,R*0.10,0,6.29);x.fill();}
    // mouth
    x.lineWidth=Math.max(4,R*0.08);x.strokeStyle=OUT;x.beginPath();x.arc(cx,cy+R*0.28,R*0.34,0.2,Math.PI-0.2);x.stroke();
    // arrow ears / limbs
    arrow(cx-R*1.1,cy,R*0.9,R*0.34,3.4,P.ink[1]);arrow(cx+R*1.1,cy,R*0.9,R*0.34,-0.2,P.ink[2%P.ink.length]);
    for(let i=0;i<rint(r,3,6);i++)star(W*r(),H*r(),Math.min(W,H)*(0.025+r()*0.04),col());
  }
  // finish: light vignette + grain
  const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*0.34,W/2,H/2,Math.max(W,H)*0.74);vg.addColorStop(0,'transparent');vg.addColorStop(1,light?'rgba(0,0,0,0.22)':'rgba(0,0,0,0.5)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castGraffiti(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*GRAF_PALS.length);
  const fmtI=Math.floor(r()*GRAF_FMTS.length);
  const mode=pick(GRAF_MODES,r);
  const n= mode==='character'?1 : mode==='bombing'? rint(r,9,17) : mode==='arrows'? rint(r,8,20) : mode==='splash'? rint(r,4,9) : rint(r,3,5);
  return {palette:GRAF_PALS[palI].name, format:GRAF_FMTS[fmtI].t, mode, density: n<=4?'Few':n<=12?'Many':'Swarm'};
}

/* TELETEXT — "Teletext" (Andreas Gysin / ertdfgcvb homage): a fixed monospace
   grid where one field function per cell indexes a glyph brightness ramp.
   Fixed grid, characters in motion. Shared arrays keep engine + cast in lockstep. */

/* Graffiti Soul */
export const graffitiTraits: TraitsFn = (id) => { const c = castGraffiti(id) as any; return { Palette: c.palette, Format: c.format, Mode: cap(c.mode), Density: c.density }; };
export const graffitiSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Tokyo-to','Rudie','Concrete','Funk','Acid','Bubblegum','Heatwave','Ice Cream','Midnight Tag','Brick','Vapor Wall','Mono Pop'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall','Wide'] },
  { name: 'Mode', values: ['Piece','Bombing','Arrows','Splash','Character'] },
  { name: 'Density', values: ['Few','Many','Swarm'] },
] };
export const renderGraffiti = blit(graffiti, graffitiTraits);
export const GRAFFITI_ASPECTS = [1, 0.72, 1.39, 0.58, 1.97] as const;
