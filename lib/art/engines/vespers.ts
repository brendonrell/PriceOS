// @ts-nocheck
/*
 * VESPERS — by opus4-8. "Monuments that remember the sea."
 *
 * The platform's halo project. Monumental, semi-abstract architecture —
 * a great ring on pylons, an arch causeway, a half-submerged colossus, a
 * stepped ziggurat, an obelisk field, a slab henge, a spanning aqueduct, a
 * cluster of drowned spires — standing in mirror-still water that doubles each
 * form into a vertical reflection, the waterline seam veiled in luminous haze.
 * Surreal in the strict sense: a REAL scene rendered subtly OFF — impossible
 * scale, perfect silence, a reflection that's a touch wrong, a faint
 * future-instrument substrate (plumb line, level ticks, corner brackets) graded
 * under the atmosphere. Ancient-future ruin, not cyberpunk, not outrun.
 *
 * EIGHT structurally distinct SCENE families keep every Output different in
 * silhouette + placement, not just colour; ten bespoke COOL-jewel colourways
 * (emerald/viridian spine + sapphire, amethyst, teal, ultramarine, glacial,
 * orchid, plus two off-spine nights) keep the set bold and varied.
 *
 * Deterministic from tokenId. All trait-determining randomness is drawn in a
 * FIXED order in params() so traits() and draw() never disagree.
 */
import { rng, pick, mix, rgba, hsl2hex, h2r, clamp, grain, vignette, blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

/* ── atmosphere helpers (the R&D kit's superset, inlined so the engine is
      self-contained — _kit.ts carries only the base set) ──────────────────── */
function iridescent(phase, sat, light){ const h=((phase*360)%360+360)%360; return hsl2hex(h, sat==null?0.85:sat, light==null?0.6:light); }
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

/* ── palettes — COOL-jewel waterline-mirror worlds ───────────────────────── */
const PALS = [
  { name:'Viridian Vesper', skT:'#021410', skB:'#0e8a62', stone:'#04201a', lit:'#5fe6a8', win:'#ffe27a', glow:'#2fffb0', haze:'#149a72', ink:'#cdfae0' },
  { name:'Emerald Still',   skT:'#021a14', skB:'#11b07e', stone:'#06231a', lit:'#7df0c4', win:'#ffd86a', glow:'#39ffbc', haze:'#1fbe8c', ink:'#cffff0' },
  { name:'Sapphire Tide',   skT:'#02061f', skB:'#1f5ad0', stone:'#0a1430', lit:'#7da8ff', win:'#9bf0e6', glow:'#3fe0ff', haze:'#2f6ae0', ink:'#cfe2ff' },
  { name:'Amethyst Deep',   skT:'#0a021f', skB:'#7a3de0', stone:'#16082e', lit:'#c69bff', win:'#7df0d0', glow:'#c45dff', haze:'#7a4fe0', ink:'#ecdcff' },
  { name:'Teal Mirror',     skT:'#02141c', skB:'#16a6b8', stone:'#06222a', lit:'#9bf0ff', win:'#ffd28a', glow:'#3fffe0', haze:'#1f9ab0', ink:'#d0fbff' },
  { name:'Ultramarine',     skT:'#020630', skB:'#1f3df0', stone:'#080a34', lit:'#8a9bff', win:'#c0e0ff', glow:'#4f7aff', haze:'#2a44e0', ink:'#dadfff' },
  { name:'Glacial Mint',    skT:'#0a2230', skB:'#56cabe', stone:'#0c2a2e', lit:'#dafff8', win:'#bfe8ff', glow:'#9bffe6', haze:'#4fb6b0', ink:'#eafffb' },
  { name:'Orchid Drowned',  skT:'#0c0420', skB:'#9a3dc8', stone:'#1a0a2c', lit:'#e6a8ff', win:'#7df0d0', glow:'#d65dff', haze:'#8a3db8', ink:'#f2dcff' },
  { name:'Sodium Lagoon',   skT:'#021614', skB:'#0c5e58', stone:'#04211e', lit:'#ffba5a', win:'#ffd884', glow:'#ff9e3a', haze:'#0f7a6e', ink:'#ffe8c8' },
  { name:'Crimson Vigil',   skT:'#04061c', skB:'#23347a', stone:'#240810', lit:'#ff6a7a', win:'#ff9a5a', glow:'#ff3d5e', haze:'#2a3e8a', ink:'#ffd4dc' },
];

const FMTS = [ { W:1200, H:1480, t:'Stele' }, { W:1340, H:1340, t:'Square' }, { W:1500, H:1120, t:'Wide' } ];
const SCENE = ['Great Ring', 'Arch Causeway', 'Drowned Colossus', 'Ziggurat', 'Obelisk Field', 'Slab Henge', 'Aqueduct', 'Sunken Spires'];
const SEAM  = ['Calm', 'Mist Veil', 'Glass'];

/* ── param draw (FIXED ORDER) ──────────────────────────────────────────────
   Palette → Format → Scene → Seam → r2 → r3. Never reorder. */
function paramsOf(r){
  const pal=pick(PALS,r); const fmt=pick(FMTS,r); const scene=pick(SCENE,r); const seam=pick(SEAM,r);
  return { pal, fmt, scene, seam, r2:r(), r3:r() };
}
const labels = (p) => ({ Palette:p.pal.name, Format:p.fmt.t, Scene:p.scene, Seam:p.seam });

/* ── architectural primitives ──────────────────────────────────────────────── */
function block(x,cx,base,w,h,P,depth,slots,r){
  const col=mix(P.stone,P.haze,depth*0.5), rim=mix(P.lit,P.haze,depth*0.4);
  x.fillStyle=col; x.fillRect(cx-w/2, base-h, w, h);
  x.fillStyle=rgba(rim,0.85-depth*0.4); x.fillRect(cx-w/2, base-h, Math.max(2,w*0.07), h);
  if(slots && r()<0.85){ const n=1+Math.floor(r()*3); for(let i=0;i<n;i++){ const sx=cx-w*0.30+ (n>1? i/(n-1)*w*0.6 : 0); const sw=Math.max(2,w*0.05); const sh=h*(0.4+r()*0.4); const sy=base-sh*1.05;
    x.fillStyle=rgba(P.win,0.55+r()*0.35); x.fillRect(sx-sw/2, sy, sw, sh); bloom(x,sx,sy+sh*0.3,sw*4,P.win,0.12); } }
}
function pylon(x,cx,base,wTop,wBot,h,P,depth){
  const col=mix(P.stone,P.haze,depth*0.5);
  x.fillStyle=col; x.beginPath(); x.moveTo(cx-wTop/2, base-h); x.lineTo(cx+wTop/2, base-h); x.lineTo(cx+wBot/2, base); x.lineTo(cx-wBot/2, base); x.closePath(); x.fill();
  x.fillStyle=rgba(mix(P.lit,P.haze,depth*0.4),0.7-depth*0.4); x.beginPath(); x.moveTo(cx-wTop/2, base-h); x.lineTo(cx-wTop/2+wTop*0.16, base-h); x.lineTo(cx-wBot/2+wBot*0.16, base); x.lineTo(cx-wBot/2, base); x.closePath(); x.fill();
}
function spire(x,cx,base,w,h,P,depth,r){
  const col=mix(P.stone,P.haze,depth*0.6);
  x.fillStyle=col; x.beginPath(); x.moveTo(cx-w*0.34, base-h*0.9); x.lineTo(cx+w*0.34, base-h*0.9); x.lineTo(cx+w/2, base); x.lineTo(cx-w/2, base); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(cx, base-h); x.lineTo(cx+w*0.34, base-h*0.9); x.lineTo(cx-w*0.34, base-h*0.9); x.closePath(); x.fill();
  x.fillStyle=rgba(mix(P.lit,P.haze,depth*0.5),0.7-depth*0.4); x.fillRect(cx-w*0.42, base-h*0.9, Math.max(1.5,w*0.10), h*0.9);
  if(depth<0.55 && r()<0.8){ const sh=h*(0.3+r()*0.3); x.fillStyle=rgba(P.win,0.5); x.fillRect(cx-w*0.05, base-sh*1.1, w*0.10, sh); }
  if(depth<0.5){ bloom(x,cx,base-h*0.93,w*3,P.glow,0.16); x.fillStyle=rgba(P.win,0.85); x.beginPath(); x.arc(cx,base-h*0.93,Math.max(1.5,w*0.07),0,7); x.fill(); }
}

function scene(x, W, hzY, P, p, r){
  const S=Math.min(W, hzY*1.6);
  const base=hzY;

  x.save(); x.globalCompositeOperation='multiply';
  for(let i=0;i<5;i++){ const bx=W*(0.08+i/5*0.86)+(r()-0.5)*50; const bw=S*(0.12+r()*0.10); const bh=S*(0.05+0.05*r());
    const g=x.createRadialGradient(bx,base,0,bx,base,bw); g.addColorStop(0,rgba(P.stone,0.5)); g.addColorStop(1,rgba(P.stone,0));
    x.fillStyle=g; x.beginPath(); x.ellipse(bx,base,bw,bh,0,Math.PI,0); x.fill(); } x.restore();

  if(p.scene==='Great Ring'){
    const cx=W*(p.r2<0.4?0.5:(p.r2<0.7?0.36:0.64)), rad=S*0.30, cy=base-S*0.46;
    pylon(x, cx-rad*0.62, base, S*0.05, S*0.085, base-(cy+rad*0.55), P, 0.1);
    pylon(x, cx+rad*0.62, base, S*0.05, S*0.085, base-(cy+rad*0.55), P, 0.1);
    bloom(x,cx,cy,rad*1.5,P.glow,0.22);
    x.lineWidth=S*0.05; x.strokeStyle=mix(P.stone,P.lit,0.32); x.beginPath(); x.arc(cx,cy,rad,0,7); x.stroke();
    x.lineWidth=S*0.05*0.4; x.strokeStyle=rgba(mix(P.lit,'#fff',0.2),0.5); x.beginPath(); x.arc(cx-rad*0.04,cy-rad*0.04,rad,Math.PI*1.05,Math.PI*1.7); x.stroke();
    for(let k=0;k<2;k++){ x.lineWidth=S*0.006; x.strokeStyle=rgba(iridescent(0.12+k*0.22,0.85,0.62),0.55); x.beginPath(); x.arc(cx,cy,rad*(0.84-k*0.12),0,7); x.stroke(); }
    for(let a=0;a<10;a++){ const an=a/10*7; const px=cx+Math.cos(an)*rad, py=cy+Math.sin(an)*rad; x.fillStyle=rgba(P.win,0.8); x.beginPath(); x.arc(px,py,S*0.009,0,7); x.fill(); }
    if(p.r2>=0.4){ const cx2=W*(cx<W*0.5?0.78:0.22), rad2=S*0.10; x.save(); x.globalAlpha=0.5; x.lineWidth=S*0.02; x.strokeStyle=mix(P.stone,P.lit,0.3); x.beginPath(); x.arc(cx2,base-S*0.24,rad2,0,7); x.stroke(); x.restore(); }

  } else if(p.scene==='Arch Causeway'){
    const vp=W*(0.32+p.r2*0.36); const n=7;
    for(let i=n-1;i>=0;i--){ const depth=i/(n-1); const sc=(1-depth)*0.9+0.14;
      const X=vp + (vp - W*0.5)*(depth*2.0); const w=S*0.42*sc, h=S*0.5*sc, th=w*0.17;
      const col=mix(P.stone,P.haze,depth*0.55);
      x.fillStyle=col; x.fillRect(X-w/2, base-h, th, h); x.fillRect(X+w/2-th, base-h, th, h);
      x.beginPath(); x.moveTo(X-w/2,base-h); x.lineTo(X-w/2,base-h-th*1.4); x.arc(X, base-h-th*1.4, w/2, Math.PI, 0); x.lineTo(X+w/2,base-h); x.lineTo(X+w/2-th,base-h); x.arc(X, base-h-th*1.4, w/2-th, 0, Math.PI, true); x.lineTo(X-w/2+th,base-h); x.closePath(); x.fill();
      x.fillStyle=rgba(mix(P.lit,P.haze,depth*0.5),0.8-depth*0.5); x.fillRect(X-w/2, base-h, Math.max(2,th*0.22), h);
      if(i===0){ bloom(x,X,base-h*0.55,w*0.6,P.glow,0.22); x.fillStyle=rgba(P.win,0.5); x.fillRect(X-th*0.3, base-h*0.9, th*0.6, h*0.7);} }

  } else if(p.scene==='Drowned Colossus'){
    const cx=W*(p.r2<0.5?0.37:0.63); const bw=S*0.30, bh=S*0.96; const col=mix(P.stone,P.haze,0.03), litc=rgba(P.lit,0.6);
    const legW=bw*0.34, gap=bw*0.32, legH=bh*0.5;
    pylon(x, cx-gap/2-legW/2, base, legW*0.9, legW, legH, P, 0.0);
    pylon(x, cx+gap/2+legW/2, base, legW*0.9, legW, legH, P, 0.0);
    x.fillStyle=col; x.fillRect(cx-gap/2-legW, base-legH-bh*0.04, gap+legW*2, bh*0.05);
    x.fillStyle=col; x.fillRect(cx-bw/2, base-legH-bh*0.42, bw, bh*0.40);
    x.fillStyle=litc; x.fillRect(cx-bw/2, base-legH-bh*0.42, Math.max(2,bw*0.06), bh*0.40);
    const shY=base-legH-bh*0.42; x.fillStyle=mix(P.stone,P.haze,0.06); x.fillRect(cx-bw*0.78, shY-bh*0.04, bw*1.56, bh*0.06);
    x.fillStyle=rgba(P.lit,0.55); x.fillRect(cx-bw*0.78, shY-bh*0.04, bw*1.56, Math.max(2,bh*0.01));
    x.fillStyle=col; x.fillRect(cx-bw*0.12, shY-bh*0.10, bw*0.24, bh*0.06);
    const hw=bw*0.42, hh=bh*0.16, hy=shY-bh*0.10-hh; x.fillStyle=col; x.fillRect(cx-hw/2, hy, hw, hh);
    x.fillStyle=litc; x.fillRect(cx-hw/2, hy, Math.max(2,hw*0.10), hh);
    const ex=cx, ey=hy+hh*0.5; bloom(x,ex,ey,S*0.09,P.glow,0.42); x.fillStyle=P.win; x.beginPath(); x.arc(ex,ey,S*0.018,0,7); x.fill(); x.fillStyle=rgba(P.win,0.45); x.beginPath(); x.arc(ex,ey,S*0.04,0,7); x.fill();
    for(let i=0;i<3;i++){ const sx=cx-bw*0.20+i*bw*0.20; x.fillStyle=rgba(P.win,0.4); x.fillRect(sx-S*0.005, base-legH-bh*0.34, S*0.01, bh*0.22);}
    bloom(x,cx,base-legH*0.4,gap*0.9,P.glow,0.16);
    const cx2b=W*(p.r2<0.5?0.84:0.16); x.save(); x.globalAlpha=0.5; pylon(x,cx2b-S*0.03,base,S*0.025,S*0.035,S*0.22,P,0.5); pylon(x,cx2b+S*0.03,base,S*0.025,S*0.035,S*0.22,P,0.5); x.fillStyle=rgba(P.stone,0.5); x.fillRect(cx2b-S*0.06,base-S*0.42,S*0.12,S*0.20); x.restore();

  } else if(p.scene==='Ziggurat'){
    const cx=W*(p.r2<0.45?0.5:(p.r2<0.72?0.38:0.62)); const tiers=6; const baseW=S*0.74; const totH=S*0.72;
    for(let t=0;t<tiers;t++){ const f=t/tiers; const w=baseW*(1-f*0.78); const h=totH/tiers; const y=base-(t+1)*h;
      const col=mix(P.stone, P.haze, 0.04+f*0.10); x.fillStyle=col; x.fillRect(cx-w/2, y, w, h);
      x.fillStyle=rgba(mix(P.lit,P.haze,f*0.3),0.5); x.fillRect(cx-w/2, y, w, Math.max(1,h*0.10));
      x.fillStyle=rgba(P.lit,0.6-f*0.3); x.fillRect(cx-w/2, y, Math.max(2,w*0.04), h); }
    x.fillStyle=rgba(P.win,0.32); x.fillRect(cx-S*0.018, base-totH, S*0.036, totH);
    bloom(x,cx,base-totH,S*0.16,P.glow,0.34); x.fillStyle=P.win; x.beginPath(); x.arc(cx,base-totH-S*0.01,S*0.016,0,7); x.fill();
    for(const sgn of [-1,1]){ x.fillStyle=rgba(P.win,0.4); x.fillRect(cx+sgn*baseW*0.32-S*0.006, base-totH*0.22, S*0.012, totH*0.18);}

  } else if(p.scene==='Obelisk Field'){
    const n=5; const xs=[]; for(let i=0;i<n;i++) xs.push(0.10+0.80*i/(n-1)+(rng(i*31+1)()-0.5)*0.06);
    const items=xs.map((fx,i)=>({fx, depth:rng(i*17+3)()})).sort((a,b)=>a.depth-b.depth);
    for(const it of items){ const depth=it.depth; const sc=(1-depth)*1.0+0.18; const w=S*0.085*sc, h=S*0.66*sc; const cx=W*it.fx;
      const col=mix(P.stone,P.haze,depth*0.6);
      x.fillStyle=col; x.beginPath(); x.moveTo(cx-w*0.32, base-h*0.86); x.lineTo(cx+w*0.32, base-h*0.86); x.lineTo(cx+w/2, base); x.lineTo(cx-w/2, base); x.closePath(); x.fill();
      x.beginPath(); x.moveTo(cx, base-h); x.lineTo(cx+w*0.32, base-h*0.86); x.lineTo(cx-w*0.32, base-h*0.86); x.closePath(); x.fill();
      x.fillStyle=rgba(mix(P.lit,P.haze,depth*0.5),0.7-depth*0.4); x.fillRect(cx-w*0.4, base-h*0.86, Math.max(1.5,w*0.12), h*0.86);
      if(depth<0.5){ bloom(x,cx,base-h*0.9,w*3,P.glow,0.18); x.fillStyle=rgba(P.win,0.85); x.beginPath(); x.arc(cx,base-h*0.92,S*0.006,0,7); x.fill(); } }

  } else if(p.scene==='Slab Henge'){
    const cx=W*0.5, cy=base-S*0.06; const rx=W*0.36, ry=S*0.16; const n=8;
    const slabs=[]; for(let i=0;i<n;i++){ const f=i/(n-1); const ang=Math.PI*(1.05+f*0.9); const px=cx+Math.cos(ang)*rx; const py=cy+Math.sin(ang)*ry; slabs.push({px,py,depth:1-(py-(cy-ry))/(ry*2)}); }
    slabs.sort((a,b)=>a.py-b.py);
    for(const s of slabs){ const sc=(1-Math.max(0,Math.min(1,s.depth)))*0.7+0.4; const w=S*0.13*sc, h=S*0.5*sc; block(x, s.px, base, w, h, P, Math.max(0,Math.min(0.8,s.depth)), true, r); }
    const tw=S*0.30, th=S*0.5, pw=tw*0.2;
    block(x,cx-tw/2+pw/2, base, pw, th, P, 0.0, false, r); block(x,cx+tw/2-pw/2, base, pw, th, P, 0.0, false, r);
    x.fillStyle=mix(P.stone,P.haze,0.06); x.fillRect(cx-tw/2-pw*0.2, base-th-pw*1.1, tw+pw*0.4, pw*1.1);
    x.fillStyle=rgba(P.lit,0.7); x.fillRect(cx-tw/2-pw*0.2, base-th-pw*1.1, tw+pw*0.4, Math.max(2,pw*0.12));
    bloom(x,cx,base-th*0.5,tw*0.7,P.glow,0.2); x.fillStyle=rgba(P.win,0.4); x.fillRect(cx-S*0.01, base-th*0.95, S*0.02, th*0.8);

  } else if(p.scene==='Aqueduct'){
    const tiers = p.r3<0.4 ? 2 : 1; const n=Math.floor(7+p.r2*4); const archW=W/n; const topY=base-S*(0.52+p.r3*0.12); const deckH=S*0.06;
    for(let layer=0; layer<tiers; layer++){
      const ly=topY + layer*S*0.26; const ah=S*(0.18-layer*0.03);
      x.fillStyle=mix(P.stone,P.haze,0.05+layer*0.04); x.fillRect(0, ly-deckH, W, deckH);
      x.fillStyle=rgba(P.lit,0.5-layer*0.2); x.fillRect(0, ly-deckH, W, Math.max(2,deckH*0.16));
      for(let i=0;i<=n;i++){ const X=i*archW; const th=archW*0.16;
        x.fillStyle=mix(P.stone,P.haze,0.06+layer*0.04); x.fillRect(X-th/2, ly, th, (layer? topY+S*0.20 : base)-ly);
        if(i<n){ const cxA=X+archW/2; x.fillStyle=mix(P.stone,P.haze,0.05+layer*0.04);
          x.beginPath(); x.moveTo(X+th/2, ly); x.lineTo(X+th/2, ly-ah); x.arc(cxA, ly-ah, archW/2-th/2, Math.PI, 0); x.lineTo(X+archW-th/2, ly); x.lineTo(X+archW-th/2, ly-ah*0.02); x.arc(cxA, ly-ah, archW/2-th*1.4, 0, Math.PI, true); x.closePath(); x.fill();
          if(layer===0 && i%2===0){ bloom(x,cxA,ly-ah*0.4,archW*0.3,P.glow,0.12); x.fillStyle=rgba(P.win,0.4); x.fillRect(cxA-th*0.2, ly-ah*0.8, th*0.4, ah*0.5); x.fillStyle=mix(P.stone,P.haze,0.05+layer*0.04); } } }
    }
    bloom(x, W*(0.3+p.r2*0.4), topY, W*0.5, P.glow, 0.14);

  } else { // Sunken Spires
    const side = p.r2<0.5? 1 : -1; const cluster = W*(side>0? 0.34 : 0.66); const m = 7 + Math.floor(p.r3*4);
    const towers=[];
    for(let i=0;i<m;i++){ const rr=rng(Math.floor((p.r2*1e4)+(p.r3*1e6)+i*97)); const spread=(rr()-0.5)*W*0.5; const fx=cluster+spread + side*Math.abs(spread)*0.2;
      towers.push({ fx, depth: rr(), wMul:0.6+rr()*0.9, hMul:0.5+rr()*0.95 }); }
    towers.sort((a,b)=>b.depth-a.depth);
    for(const t of towers){ const sc=(1-t.depth)*0.9+0.16; const w=S*0.085*t.wMul*sc, h=S*0.62*t.hMul*sc; spire(x, t.fx, base, w, h, P, t.depth, r); }
    spire(x, cluster + side*W*0.02, base, S*0.11, S*0.86, P, 0.0, r);
  }
}

function draw(cv, seed){
  const r=rng(seed); const p=paramsOf(r); const P=p.pal;
  const W=p.fmt.W, H=p.fmt.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d'); const S=Math.min(W,H);
  const noise=makeNoise(seed^0x7c91);

  const baseHz = ({'Great Ring':0.54,'Arch Causeway':0.56,'Drowned Colossus':0.60,'Ziggurat':0.62,'Obelisk Field':0.55,'Slab Henge':0.58,'Aqueduct':0.60,'Sunken Spires':0.57})[p.scene];
  const hzY = H*(baseHz + (p.r2-0.5)*0.06);

  const sg=x.createLinearGradient(0,0,0,hzY); sg.addColorStop(0,P.skT); sg.addColorStop(0.7,mix(P.skB,P.skT,0.4)); sg.addColorStop(1,mix(P.skB,P.skT,0.05));
  x.fillStyle=sg; x.fillRect(0,0,W,hzY);
  hazeSheet(x,W,hzY,noise,P.haze,0.45,S*0.55,'screen');
  x.save(); x.globalCompositeOperation='screen'; const gb=x.createLinearGradient(0,hzY-S*0.34,0,hzY); gb.addColorStop(0,rgba(P.skB,0)); gb.addColorStop(1,rgba(P.glow,0.30)); x.fillStyle=gb; x.fillRect(0,hzY-S*0.34,W,S*0.34); x.restore();
  bloom(x,W*0.5,hzY*0.5,W*0.6,P.skB,0.2);
  { const bx=W*(0.30+r()*0.40), by=hzY*(0.20+r()*0.20), brad=S*0.05;
    bloom(x,bx,by,brad*5,P.haze,0.16);
    const bg=x.createRadialGradient(bx,by,0,bx,by,brad); bg.addColorStop(0,rgba(mix(P.lit,'#fff',0.3),0.5)); bg.addColorStop(0.6,rgba(P.lit,0.18)); bg.addColorStop(1,rgba(P.lit,0));
    x.save(); x.globalCompositeOperation='screen'; x.fillStyle=bg; x.beginPath(); x.arc(bx,by,brad,0,7); x.fill(); x.restore(); }

  const off=document.createElement('canvas'); off.width=W; off.height=Math.ceil(hzY)+2; const ox=off.getContext('2d');
  scene(ox, W, Math.ceil(hzY), P, p, rng(seed*3+11));
  x.drawImage(off,0,0);

  const wg=x.createLinearGradient(0,hzY,0,H); wg.addColorStop(0,mix(P.skB,P.stone,0.34)); wg.addColorStop(0.5,mix(P.stone,P.skB,0.18)); wg.addColorStop(1,mix(P.stone,'#000',0.5));
  x.fillStyle=wg; x.fillRect(0,hzY,W,H-hzY);

  x.save(); x.globalAlpha=0.54; x.globalCompositeOperation='lighter';
  const refH=H-hzY; const bands=Math.floor(refH/3);
  for(let b=0;b<bands;b++){ const f=b/bands; const sy=hzY-1-f*hzY*0.98; const dy=hzY+f*refH;
    const wob=Math.sin(b*0.5+seed)*S*0.004*(p.seam==='Glass'?0.3:1.4); x.globalAlpha=0.58*(1-f*0.55);
    x.drawImage(off, 0, Math.max(0,sy), W, hzY/bands+1, wob, dy, W, refH/bands+1); }
  x.restore();

  x.save(); x.globalCompositeOperation='screen'; x.fillStyle=rgba(P.haze,0.09);
  for(let i=0;i<60;i++){ const yy=hzY+Math.pow(i/60,1.4)*refH; x.fillRect(0,yy,W,1+(i/60)*2);} x.restore();

  const seamI = p.seam==='Mist Veil'?0.6:p.seam==='Glass'?0.18:0.34;
  x.save(); x.globalCompositeOperation='screen';
  const seg=x.createLinearGradient(0,hzY-S*0.11,0,hzY+S*0.11); seg.addColorStop(0,rgba(P.haze,0)); seg.addColorStop(0.5,rgba(P.haze,seamI)); seg.addColorStop(1,rgba(P.haze,0));
  x.fillStyle=seg; x.fillRect(0,hzY-S*0.11,W,S*0.22); x.restore();
  bloom(x,W*0.5,hzY,W*0.7,P.glow,0.16);

  x.save(); x.strokeStyle=rgba(P.ink,0.4); x.lineWidth=1; x.globalAlpha=0.5;
  x.beginPath(); x.moveTo(W*0.5,0); x.lineTo(W*0.5,H); x.stroke();
  for(let i=0;i<=16;i++){ const yy=H*i/16; x.beginPath(); x.moveTo(0,yy); x.lineTo(S*0.012,yy); x.stroke(); }
  const m=S*0.045,bb=S*0.05; [[m,m,1,1],[W-m,m,-1,1],[m,H-m,1,-1],[W-m,H-m,-1,-1]].forEach(([bx,by,sxn,syn])=>{x.beginPath();x.moveTo(bx,by+syn*bb);x.lineTo(bx,by);x.lineTo(bx+sxn*bb,by);x.stroke();});
  x.restore();

  scanlines(x,W,H,3,0.045); grain(x,W,H,520,r); chromaSplit(x,W,H,1); vignette(x,W,H,0.52);
}

export const vespersTraits: TraitsFn = (id) => labels(paramsOf(rng(id)));

export const vespersSchema: TraitSchema = {
  traits: [
    { name:'Palette', values: PALS.map((p)=>p.name) },
    { name:'Format',  values: ['Stele','Square','Wide'] },
    { name:'Scene',   values: SCENE },
    { name:'Seam',    values: SEAM },
  ],
};

export const renderVespers: EngineFn = blit(draw, vespersTraits);

// W/H of Stele, Square, Wide (matches FMTS order).
export const VESPERS_ASPECTS = [0.81, 1, 1.34] as const;
