// @ts-nocheck
/*
 * ARMILLARY — by opus4-8. "An exact instrument, measuring nothing."
 *
 * A great precision MECHANISM — nested tilted rings, a glowing core, orbiting
 * bodies on gauge-arc tracks, radial tick scales — suspended in coloured haze,
 * hung over a vast world. The most abstract project on the platform: surreal in
 * the "real but off" sense — a flawless instrument that measures nothing, at an
 * impossible scale, in a void it shouldn't occupy. Future-evoking, not cyberpunk.
 *
 * SIX structurally distinct SCENE families (Orrery over Horizon / Gyroscope /
 * Gauge Cluster / Solitary / Swarm / Cross-section) vary density, scale and
 * negative space; ten bespoke HOT colour worlds each clamp their iridescent
 * ring-sweep to that world's own two hue poles (never a full rainbow), so every
 * palette reads as a distinct electric scheme.
 *
 * Deterministic from tokenId; trait randomness drawn in FIXED order in paramsOf.
 */
import { rng, pick, mix, rgba, hsl2hex, h2r, clamp, grain, vignette, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

/* ── atmosphere helpers inlined (superset of _kit's base set) ─────────────── */
function bloom(x,cx,cy,rad,col,a0){ x.save(); x.globalCompositeOperation='lighter'; const g=x.createRadialGradient(cx,cy,0,cx,cy,rad); g.addColorStop(0,rgba(col,a0)); g.addColorStop(1,rgba(col,0)); x.fillStyle=g; x.fillRect(cx-rad,cy-rad,rad*2,rad*2); x.restore(); }
function scanlines(x,W,H,gap,a){ x.save(); x.globalCompositeOperation='multiply'; x.fillStyle='rgba(0,0,0,'+a+')'; for(let y=0;y<H;y+=gap){ x.fillRect(0,y,W,1);} x.restore(); }
function chromaSplit(x,W,H,off){ try{ const img=x.getImageData(0,0,W,H); const d=img.data; const out=x.createImageData(W,H); const o=out.data; const dx=off|0; for(let y=0;y<H;y++){ for(let i=0;i<W;i++){ const idx=(y*W+i)*4; const rx=Math.min(W-1,i+dx),bx=Math.max(0,i-dx); o[idx]=d[(y*W+rx)*4]; o[idx+1]=d[idx+1]; o[idx+2]=d[(y*W+bx)*4+2]; o[idx+3]=255; }} x.putImageData(out,0,0); }catch(e){} }
function makeNoise(seed){
  const r=rng(seed); const perm=new Uint8Array(512); const p=new Uint8Array(256);
  for(let i=0;i<256;i++)p[i]=i;
  for(let i=255;i>0;i--){ const j=Math.floor(r()*(i+1)); const t=p[i]; p[i]=p[j]; p[j]=t; }
  for(let i=0;i<512;i++)perm[i]=p[i&255];
  function fade(t){return t*t*t*(t*(t*6-15)+10);}
  function lerp(a,b,t){return a+(b-a)*t;}
  function grad(h,x,y){const u=(h&1)?x:-x,v=(h&2)?y:-y;return u+v;}
  function noise2(x,y){ const X=Math.floor(x)&255,Y=Math.floor(y)&255; x-=Math.floor(x);y-=Math.floor(y); const u=fade(x),v=fade(y);
    const aa=perm[perm[X]+Y],ab=perm[perm[X]+Y+1],ba=perm[perm[X+1]+Y],bb=perm[perm[X+1]+Y+1];
    return lerp(lerp(grad(aa,x,y),grad(ba,x-1,y),u),lerp(grad(ab,x,y-1),grad(bb,x-1,y-1),u),v); }
  function fbm(x,y,oct,gain,lac){oct=oct||4;gain=gain||0.5;lac=lac||2;let a=0,f=1,amp=0.5,n=0;for(let i=0;i<oct;i++){a+=amp*noise2(x*f,y*f);n+=amp;amp*=gain;f*=lac;}return a/n;}
  return {noise2,fbm};
}
function hazeSheet(x,W,H,noise,col,opacity,scale,blend){
  x.save(); x.globalCompositeOperation=blend||'screen'; const step=Math.max(3,Math.floor(Math.min(W,H)/180)); const c=h2r(col);
  for(let yy=0;yy<H;yy+=step){ for(let xx=0;xx<W;xx+=step){ const n=(noise.fbm(xx/scale,yy/scale,5,0.55,2.1)+1)/2; const a=clamp(n*n*opacity,0,1); if(a<0.01)continue; x.fillStyle='rgba('+c[0]+','+c[1]+','+c[2]+','+a+')'; x.fillRect(xx,yy,step+1,step+1); } } x.restore();
}
function curl(noise,x,y,eps){ eps=eps||1; const n1=noise.fbm((x)/100,(y+eps)/100,4),n2=noise.fbm((x)/100,(y-eps)/100,4); const n3=noise.fbm((x+eps)/100,(y)/100,4),n4=noise.fbm((x-eps)/100,(y)/100,4); return [(n1-n2)/(2*eps),-(n3-n4)/(2*eps)]; }

/* ── HOT colour worlds. hA/hB = the two hue poles the rings sweep between ─── */
const PALS = [
  { name:'Magenta',  hA:312, hB:44,  sat:0.95, lite:0.60, g0:'#1c0418', g1:'#060109', h1:'#ff2da0', h2:'#ffb03d', core:'#ff5de0', node:'#3fe6ff', ink:'#ffd0ee' },
  { name:'Gold',     hA:36,  hB:348, sat:0.96, lite:0.58, g0:'#1c1202', g1:'#080400', h1:'#ffb01f', h2:'#ff3d6a', core:'#ffd23d', node:'#3fffd0', ink:'#ffe6b0' },
  { name:'Cyan',     hA:188, hB:280, sat:0.92, lite:0.60, g0:'#021820', g1:'#01070b', h1:'#1fd6ff', h2:'#9b5dff', core:'#5dffe0', node:'#ffd23d', ink:'#cfeeff' },
  { name:'Coral',    hA:14,  hB:46,  sat:0.95, lite:0.60, g0:'#1e0804', g1:'#0a0301', h1:'#ff5d3a', h2:'#ffc83d', core:'#ff7a4d', node:'#3fd6ff', ink:'#ffd6c0' },
  { name:'Violet',   hA:268, hB:330, sat:0.92, lite:0.62, g0:'#11041e', g1:'#05010c', h1:'#9b5dff', h2:'#ff4fa8', core:'#b06aff', node:'#5dffc0', ink:'#e6d6ff' },
  { name:'Lime',     hA:84,  hB:172, sat:0.92, lite:0.58, g0:'#0a1602', g1:'#030700', h1:'#a6ff1f', h2:'#1fd6c0', core:'#d6ff5d', node:'#ff4fd0', ink:'#e8ffc0' },
  { name:'Ember',    hA:24,  hB:350, sat:0.96, lite:0.56, g0:'#1c0602', g1:'#080200', h1:'#ff7a1f', h2:'#ff2d5a', core:'#ffb04d', node:'#3fe6ff', ink:'#ffd0b0' },
  { name:'Ice',      hA:210, hB:170, sat:0.86, lite:0.64, g0:'#04121e', g1:'#01060c', h1:'#3a8aff', h2:'#3fffe0', core:'#9bc6ff', node:'#ffd23d', ink:'#d6e8ff' },
  { name:'Rose',     hA:330, hB:20,  sat:0.92, lite:0.62, g0:'#1c0412', g1:'#080108', h1:'#ff3d8a', h2:'#ffb86a', core:'#ff6aa8', node:'#5dd6ff', ink:'#ffd6e6' },
  { name:'Teal',     hA:166, hB:50,  sat:0.90, lite:0.58, g0:'#02161a', g1:'#010708', h1:'#1fe0c0', h2:'#ffd23d', core:'#3fffe0', node:'#ff5da0', ink:'#cffff4' },
];

const FMTS = [ { W:1340, H:1340, t:'Square' }, { W:1180, H:1480, t:'Portrait' }, { W:1500, H:1140, t:'Wide' } ];
const SCENE = ['Orrery over Horizon', 'Gyroscope', 'Gauge Cluster', 'Solitary', 'Swarm', 'Cross-section'];
const RINGS = ['Few', 'Many'];
const SPIN  = ['Aligned', 'Tumbled'];

function paramsOf(r){
  const pal=pick(PALS,r); const fmt=pick(FMTS,r); const scene=pick(SCENE,r); const rings=pick(RINGS,r); const spin=pick(SPIN,r);
  return { pal, fmt, scene, rings, spin };
}
const labels = (p) => ({ Palette:p.pal.name, Format:p.fmt.t, Scene:p.scene, Rings:p.rings, Spin:p.spin });

function bandHue(P,t){ let a=((P.hA%360)+360)%360, b=((P.hB%360)+360)%360; let d=b-a; if(d>180)d-=360; if(d<-180)d+=360; return a + d*t; }
function bandCol(P,t,light){ return hsl2hex(bandHue(P,t), P.sat, light==null?P.lite:light); }

function ring(x, cx, cy, rad, tiltY, rot, P, phase, span, lw, ticks, alpha){
  alpha = alpha==null?1:alpha;
  x.save(); x.translate(cx,cy); x.rotate(rot); x.scale(1, tiltY);
  x.lineWidth=lw*1.7; x.strokeStyle=rgba(mix(P.g0,'#000',0.3), 0.85*alpha); x.beginPath(); x.arc(0,0,rad,0,7); x.stroke();
  const segs=80;
  for(let i=0;i<segs;i++){ const a0=i/segs*7, a1=(i+1)/segs*7; const tt=(phase + (i/segs)*span)%1;
    x.strokeStyle=rgba(bandCol(P, tt), 0.9*alpha); x.lineWidth=lw; x.beginPath(); x.arc(0,0,rad,a0,a1); x.stroke(); }
  x.strokeStyle=rgba('#ffffff',0.5*alpha); x.lineWidth=lw*0.5; x.beginPath(); x.arc(0,0,rad,-0.6,0.25); x.stroke();
  if(ticks){ x.strokeStyle=rgba(P.ink,0.55*alpha); x.lineWidth=1;
    for(let i=0;i<72;i++){ const an=i/72*7; const t=i%6===0?lw*2.0:lw*0.9; x.beginPath(); x.moveTo(Math.cos(an)*rad, Math.sin(an)*rad); x.lineTo(Math.cos(an)*(rad+t), Math.sin(an)*(rad+t)); x.stroke(); } }
  x.restore();
}
function bodyNode(x, cx, cy, rad, tiltY, rot, ang, P, sz, alpha){
  alpha = alpha==null?1:alpha;
  const px=Math.cos(ang)*rad, py=Math.sin(ang)*rad*tiltY;
  const sx=cx + (Math.cos(rot)*px - Math.sin(rot)*py);
  const sy=cy + (Math.sin(rot)*px + Math.cos(rot)*py);
  bloom(x,sx,sy,sz*3.2,P.node,0.5*alpha);
  const g=x.createRadialGradient(sx-sz*0.3,sy-sz*0.3,0,sx,sy,sz); g.addColorStop(0,'#fff'); g.addColorStop(0.4,P.node); g.addColorStop(1,mix(P.node,'#000',0.55));
  x.save(); x.globalAlpha=alpha; x.fillStyle=g; x.beginPath(); x.arc(sx,sy,sz,0,7); x.fill(); x.restore();
  return [sx,sy];
}

function mechanism(x, cx, cy, R, P, opts){
  const mode=opts.mode||'armillary'; const ringsN=opts.rings||'Few', spin=opts.spin||'Aligned';
  const faded=!!opts.faded, alpha=opts.alpha==null?1:opts.alpha; const seedR=opts.seedR||rng(99);
  const lw=Math.max(2, R*0.03);

  bloom(x,cx,cy,R*0.55,P.core, (faded?0.18:0.40)*alpha);
  if(!faded){ const cg=x.createRadialGradient(cx,cy,0,cx,cy,R*0.13); cg.addColorStop(0,'#fff'); cg.addColorStop(0.35,P.core); cg.addColorStop(0.75,rgba(P.core,0.5)); cg.addColorStop(1,rgba(P.core,0)); x.fillStyle=cg; x.save(); x.globalAlpha=alpha; x.beginPath(); x.arc(cx,cy,R*0.13,0,7); x.fill(); x.restore(); }

  if(mode==='gauge'){
    const dials=ringsN==='Many'?6:4; const faces=[];
    for(let d=0; d<dials; d++){ const an=d/dials*6.2831+0.3; faces.push([cx+Math.cos(an)*R*0.66, cy+Math.sin(an)*R*0.66, R*(0.22+(d%3)*0.05), d]); }
    faces.push([cx,cy,R*0.34,99]);
    for(const [dx,dy,dr,d] of faces){
      x.save(); x.globalAlpha=alpha; const fg=x.createRadialGradient(dx,dy,0,dx,dy,dr); fg.addColorStop(0,rgba(mix(P.g0,'#000',0.2),0.85)); fg.addColorStop(1,rgba(P.g1,0.4)); x.fillStyle=fg; x.beginPath(); x.arc(dx,dy,dr,0,7); x.fill(); x.restore();
      ring(x,dx,dy,dr,0.97,0,P, (d*0.17)%1, 0.4, lw*0.8, true, alpha);
      ring(x,dx,dy,dr*0.62,0.97,0,P, (d*0.17+0.3)%1, 0.35, lw*0.5, false, alpha*0.8);
      const na=rng((d+1)*37)()*7; x.save(); x.globalAlpha=alpha; x.strokeStyle=P.ink; x.lineWidth=lw*0.55; x.beginPath(); x.moveTo(dx,dy); x.lineTo(dx+Math.cos(na)*dr*0.82, dy+Math.sin(na)*dr*0.82); x.stroke(); x.restore();
      bodyNode(x,dx,dy,dr,0.97,0,na,P,R*0.02,alpha);
      x.save(); x.globalAlpha=alpha; x.fillStyle=P.core; x.beginPath(); x.arc(dx,dy,dr*0.08,0,7); x.fill(); x.restore();
    }
    return;
  }

  const nRings = ringsN==='Many'? (mode==='gyroscope'?7:6) : (mode==='gyroscope'?4:4);
  for(let i=0;i<nRings;i++){
    const t=i/(nRings-1||1); const rad=R*(0.96-t*0.64);
    const tilt = mode==='gyroscope' ? (0.22+0.62*Math.abs(Math.sin(i*1.27+0.4))) : mode==='cross' ? (0.16+0.16*t) : 0.30+0.50*t;
    const rot = spin==='Aligned' ? i*0.13 : (seedR()-0.5)*3.1;
    const span = mode==='gyroscope'?0.62:0.45;
    ring(x,cx,cy,rad,tilt,rot,P, (i*0.31)%1, span, lw*(1-t*0.3), i<2, alpha);
    if((mode==='orrery'||mode==='armillary') && i<nRings-1){ const bodies=1+(i%2); for(let b=0;b<bodies;b++){ const ang=seedR()*7; bodyNode(x,cx,cy,rad,tilt,rot,ang,P,R*(0.032-t*0.012)+3,alpha); } }
  }

  if(mode!=='gyroscope'){ x.save(); x.globalAlpha=alpha; x.lineWidth=lw*0.5;
    const ax=R*1.18; const ag=x.createLinearGradient(cx,cy-ax,cx,cy+ax); ag.addColorStop(0,rgba(P.ink,0)); ag.addColorStop(0.3,rgba(P.ink,0.55)); ag.addColorStop(0.7,rgba(P.ink,0.55)); ag.addColorStop(1,rgba(P.ink,0)); x.strokeStyle=ag;
    x.beginPath(); x.moveTo(cx,cy-ax); x.lineTo(cx,cy+ax); x.stroke(); x.restore(); }

  if(!faded){ x.save(); x.globalAlpha=alpha; x.strokeStyle=rgba(P.ink,0.4); x.lineWidth=1;
    for(let i=0;i<96;i++){ const an=i/96*7; const t=i%8===0?R*0.05:R*0.022; x.beginPath(); x.moveTo(cx+Math.cos(an)*R, cy+Math.sin(an)*R); x.lineTo(cx+Math.cos(an)*(R+t), cy+Math.sin(an)*(R+t)); x.stroke(); } x.restore(); }

  if(mode==='cross'){
    for(let k=0;k<3;k++){ const rad=R*(0.9-k*0.28); x.save(); x.translate(cx,cy); x.rotate(Math.PI/2); x.scale(1,0.20);
      x.lineWidth=lw*1.4; x.strokeStyle=rgba(mix(P.g0,'#000',0.3),0.85*alpha); x.beginPath(); x.arc(0,0,rad,0,7); x.stroke();
      const segs=70; for(let i=0;i<segs;i++){ const a0=i/segs*7,a1=(i+1)/segs*7; const tt=(0.2+k*0.2+i/segs*0.4)%1; x.strokeStyle=rgba(bandCol(P,tt),0.85*alpha); x.lineWidth=lw; x.beginPath(); x.arc(0,0,rad,a0,a1); x.stroke(); }
      x.restore(); }
    x.save(); x.globalAlpha=alpha; x.strokeStyle=rgba(P.h2,0.4); x.lineWidth=lw*0.45; x.setLineDash([4,5]);
    for(let i=0;i<10;i++){ const an=i/10*7; x.beginPath(); x.moveTo(cx,cy); x.lineTo(cx+Math.cos(an)*R*1.2, cy+Math.sin(an)*R*0.4); x.stroke(); } x.restore(); }
}

function world(x,W,H,P,noise,hzY,seed){
  hazeSheet(x,W,hzY,noise,P.h1,0.34,Math.min(W,H)*0.55,'screen');
  hazeSheet(x,W,hzY,noise,P.h2,0.20,Math.min(W,H)*0.85,'screen');
  const gx=W*(0.42+0.16*rng(seed*7)());
  bloom(x,gx,hzY,W*0.42,P.h2,0.20); bloom(x,gx,hzY,W*0.22,P.core,0.12);
  const gg=x.createLinearGradient(0,hzY,0,H); gg.addColorStop(0,mix(P.g0,P.h2,0.18)); gg.addColorStop(0.18,P.g0); gg.addColorStop(1,mix(P.g1,'#000',0.5)); x.fillStyle=gg; x.fillRect(0,hzY,W,H-hzY);
  x.save(); x.strokeStyle=rgba(P.ink,0.28); x.lineWidth=1.4; x.beginPath(); x.moveTo(0,hzY); x.lineTo(W,hzY); x.stroke(); x.restore();
  x.save(); x.globalCompositeOperation='screen'; x.strokeStyle=rgba(P.h1,0.07); x.lineWidth=1; const vpx=W*0.5;
  for(let i=-14;i<=14;i++){ x.beginPath(); x.moveTo(vpx+i*W*0.04,hzY); x.lineTo(vpx+i*W*0.55,H); x.stroke(); }
  for(let j=1;j<=8;j++){ const yy=hzY+Math.pow(j/8,2.3)*(H-hzY); x.beginPath(); x.moveTo(0,yy); x.lineTo(W,yy); x.stroke(); } x.restore();
  x.save(); x.globalCompositeOperation='screen'; const fg=x.createLinearGradient(0,hzY-H*0.10,0,hzY+H*0.16); fg.addColorStop(0,rgba(P.h2,0)); fg.addColorStop(0.5,rgba(P.h2,0.5)); fg.addColorStop(1,rgba(P.h2,0)); x.fillStyle=fg; x.fillRect(0,hzY-H*0.10,W,H*0.26); x.restore();
}

function draw(cv, seed){
  const r=rng(seed); const p=paramsOf(r); const P=p.pal;
  const W=p.fmt.W,H=p.fmt.H; cv.width=W;cv.height=H;
  const x=cv.getContext('2d'); const S=Math.min(W,H);
  const noise=makeNoise(seed^0x33af);

  const bg=x.createRadialGradient(W*0.5,H*0.42,0,W*0.5,H*0.52,Math.max(W,H)*0.75); bg.addColorStop(0,P.g0); bg.addColorStop(1,P.g1); x.fillStyle=bg; x.fillRect(0,0,W,H);

  const hasHorizon = (p.scene!=='Solitary' && p.scene!=='Gyroscope');
  const hzY = H*(0.62 + (rng(seed*3)()-0.5)*0.08);

  if(hasHorizon){ world(x,W,H,P,noise,hzY,seed); }
  else {
    hazeSheet(x,W,H,noise,P.h1,0.34,S*0.50,'screen'); hazeSheet(x,W,H,noise,P.h2,0.22,S*0.85,'screen'); hazeSheet(x,W,H,noise,P.h1,0.14,S*1.5,'screen');
    const wx=W*(0.40+0.2*rng(seed*7)()), wy=H*(0.36+0.2*rng(seed*13)());
    bloom(x,wx,wy,S*0.7,P.h2,0.14); bloom(x,wx,wy,S*0.35,P.core,0.08);
    x.save(); x.globalCompositeOperation='screen';
    for(let i=0;i<26;i++){ const rr=rng(seed*17+i*7); let px=rr()*W,py=rr()*H; x.strokeStyle=rgba(i%2?P.h1:P.h2,0.05+rr()*0.05); x.lineWidth=0.8+rr()*1.4; x.beginPath(); x.moveTo(px,py);
      for(let s2=0;s2<8;s2++){ const v=curl(noise,px,py,1); px+=v[0]*40; py+=v[1]*40; x.lineTo(px,py); } x.stroke(); }
    x.restore();
  }

  let satN = 0, satBand=[0.12,0.42], satScale=1;
  if(p.scene==='Swarm') { satN = p.rings==='Many'?10:7; satBand=[0.08,0.80]; satScale=1.5; }
  else if(p.scene==='Gauge Cluster') { satN = 4; satBand=[0.14,0.50]; }
  else if(p.scene==='Orrery over Horizon') { satN = 3; satBand=[0.10,hzY/H*0.78]; }
  else if(p.scene==='Cross-section') { satN = 2; satBand=[0.12,0.45]; }
  else if(p.scene==='Solitary') { satN = 1; satBand=[0.10,0.34]; }
  else if(p.scene==='Gyroscope') { satN = 2; satBand=[0.10,0.40]; }

  for(let s=0;s<satN;s++){ const sr=rng(seed*5+s*131); const sx=W*(0.08+0.84*sr()); const sy=H*(satBand[0]+ (satBand[1]-satBand[0])*sr()); const sR=S*(0.05+0.07*sr())*satScale; const far=0.20+0.45*sr();
    mechanism(x,sx,sy,sR,P,{mode:'armillary',rings:sr()<0.4?'Many':'Few',spin:'Tumbled',faded:true,alpha:far,seedR:rng(seed+s*101)}); }

  let cx,cy,R,mode;
  if(p.scene==='Orrery over Horizon'){ cx=W*(0.5+(rng(seed*9)()-0.5)*0.10); cy=hzY-S*0.10; R=S*0.30; mode='orrery'; }
  else if(p.scene==='Gyroscope'){ cx=W*0.5; cy=H*0.48; R=S*0.42; mode='gyroscope'; }
  else if(p.scene==='Gauge Cluster'){ cx=W*0.5; cy=hzY-S*0.06; R=S*0.30; mode='gauge'; }
  else if(p.scene==='Solitary'){ cx=W*(0.30+0.14*rng(seed*9)()); cy=H*(0.34+0.12*rng(seed*11)()); R=S*0.21; mode='armillary'; }
  else if(p.scene==='Swarm'){ cx=W*(0.46+(rng(seed*9)()-0.5)*0.12); cy=hzY-S*0.10; R=S*0.30; mode='orrery'; }
  else { cx=W*0.5; cy=H*0.46; R=S*0.34; mode='cross'; }

  mechanism(x,cx,cy,R,P,{mode,rings:p.rings,spin:p.spin,faded:false,alpha:1,seedR:r});

  bloom(x,cx,cy,R*1.9,P.core,0.12);
  x.save(); x.globalCompositeOperation='lighter';
  for(let i=0;i<90;i++){ const mx=r()*W,my=r()*H; const d=Math.hypot(mx-cx,my-cy); if(d<R*1.8){ x.fillStyle=rgba(i%2?P.node:P.h2, 0.05+r()*0.12); x.beginPath(); x.arc(mx,my,0.6+r()*1.9,0,7); x.fill(); } }
  x.restore();

  if(hasHorizon){ x.save(); x.globalCompositeOperation='screen'; const fh=x.createLinearGradient(0,H*0.84,0,H); fh.addColorStop(0,rgba(P.h1,0)); fh.addColorStop(1,rgba(P.h1,0.22)); x.fillStyle=fh; x.fillRect(0,H*0.84,W,H*0.16); x.restore(); }

  x.save(); x.strokeStyle=rgba(P.ink,0.4); x.lineWidth=1.3; x.globalAlpha=0.5; const m=S*0.045,b=S*0.05;
  [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([bx,by,sxn,syn])=>{x.beginPath();x.moveTo(bx,by+syn*b);x.lineTo(bx,by);x.lineTo(bx+sxn*b,by);x.stroke();});
  for(let i=0;i<=24;i++){ const xx=W*i/24; x.beginPath(); x.moveTo(xx,H-S*0.03); x.lineTo(xx,H-S*0.03-(i%4===0?S*0.014:S*0.007)); x.stroke(); }
  x.restore();

  scanlines(x,W,H,3,0.05); grain(x,W,H,480,r); chromaSplit(x,W,H,1); vignette(x,W,H,0.55);
}

export const armillaryTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const armillarySchema: TraitSchema = {
  traits: [
    { name:'Palette', values: PALS.map((p)=>p.name) },
    { name:'Format',  values: ['Square','Portrait','Wide'] },
    { name:'Scene',   values: SCENE },
    { name:'Rings',   values: RINGS },
    { name:'Spin',    values: SPIN },
  ],
};

export const renderArmillary: EngineFn = blit(draw, armillaryTraits);

// W/H of Square, Portrait, Wide (matches FMTS order).
export const ARMILLARY_ASPECTS = [1, 0.80, 1.32] as const;
