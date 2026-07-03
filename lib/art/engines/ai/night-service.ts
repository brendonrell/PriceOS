// @ts-nocheck
/*
 * Night Service (glow) — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const NEON_PALS=[
  {name:'Synthwave', a:'#2b1055', b:'#0d0221', ink:['#ff2a6d','#05d9e8','#d100ff']},
  {name:'Miami', a:'#241a6b', b:'#0a0030', ink:['#ff6ec7','#01fff5','#ffe600']},
  {name:'Toxic', a:'#0b2a1f', b:'#01100a', ink:['#39ff14','#00fff7','#ccff00']},
  {name:'Blade', a:'#1b1f3b', b:'#05060f', ink:['#ff9e00','#00b4d8','#ff006e']},
  {name:'Ember', a:'#2d0b00', b:'#0a0000', ink:['#ff5400','#ff0054','#ffbd00']},
  {name:'Ultraviolet', a:'#1a0040', b:'#05000f', ink:['#c77dff','#9d4edd','#00f5d4']},
  {name:'Ice', a:'#012a4a', b:'#000814', ink:['#48cae4','#caf0f8','#00b4d8']},
  {name:'Sakura', a:'#3a0ca3', b:'#10002b', ink:['#ff85a1','#ffc2d1','#f72585']},
  {name:'Acid Rain', a:'#1a3300', b:'#04140a', ink:['#9ef01a','#ccff33','#38ff8e']},
  {name:'Magma', a:'#1a0500', b:'#000000', ink:['#ff7900','#ff2d00','#ffba08']},
  {name:'Vapor', a:'#2a1a52', b:'#0b0018', ink:['#ff71ce','#01cdfe','#05ffa1']},
  {name:'Signal', a:'#001a26', b:'#000308', ink:['#00f5d4','#fee440','#f15bb5']},
];
const NEON_FMTS=[{W:1080,H:1080,t:'Square'},{W:920,H:1280,t:'Portrait'},{W:1280,H:920,t:'Landscape'},{W:760,H:1300,t:'Tall'},{W:1500,H:760,t:'Wide'}];
const NEON_MODES=['stream','rain','spiral','orbit'];
function afterglow(cv,seed,dispW){
  const r=rng(seed);
  const palI=Math.floor(r()*NEON_PALS.length);
  const fmtI=Math.floor(r()*NEON_FMTS.length);
  const mode=pick(NEON_MODES,r);
  const n= mode==='spiral'? rint(r,12,24) : mode==='orbit'? rint(r,18,36) : rint(r,6,13);
  const scan=r()<0.55;
  // ---- end trait draws ----
  const P=NEON_PALS[palI], F=NEON_FMTS[fmtI]; const W=F.W,H=F.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  // background vertical gradient
  const bg=x.createLinearGradient(0,0,0,H); bg.addColorStop(0,P.a); bg.addColorStop(1,P.b); x.fillStyle=bg; x.fillRect(0,0,W,H);
  // soft central glow bloom behind everything
  const cx0=W*(0.35+r()*0.3), cy0=H*(0.3+r()*0.4);
  const gl=x.createRadialGradient(cx0,cy0,0,cx0,cy0,Math.max(W,H)*0.7);
  gl.addColorStop(0, P.ink[0]+'22'); gl.addColorStop(1,'transparent'); x.fillStyle=gl; x.fillRect(0,0,W,H);
  const col=()=>P.ink[Math.floor(r()*P.ink.length)];
  function path(pts){x.beginPath();x.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;x.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);}x.lineTo(pts[pts.length-1][0],pts[pts.length-1][1]);}
  // Per-ribbon shadowBlur is the dominant cost and blurs to nothing at
  // thumbnail scale; keep it only at full-view sizes. The layered
  // wide/low-alpha strokes (the neon body itself) stay at every size.
  const HI=!(dispW<500);
  function ribbon(pts,c,wide){
    x.save(); x.globalCompositeOperation='lighter'; x.lineCap='round'; x.lineJoin='round'; x.shadowColor=c;
    [[wide*2.6,0.10],[wide*1.5,0.22],[wide,0.5]].forEach(p=>{x.globalAlpha=p[1];x.lineWidth=p[0];x.strokeStyle=c;x.shadowBlur=HI?wide*2:0;path(pts);x.stroke();});
    x.globalAlpha=0.9; x.lineWidth=Math.max(1,wide*0.26); x.strokeStyle='#ffffff'; x.shadowBlur=HI?wide*0.8:0; path(pts); x.stroke();
    x.restore();
  }
  function dust(){x.save();x.globalCompositeOperation='lighter';for(let i=0;i<Math.max(W,H)/3;i++){const c=col();x.globalAlpha=0.15+r()*0.5;x.fillStyle=c;const s=r()<0.1?2.4:1.2;x.fillRect(r()*W,r()*H,s,s);}x.restore();}
  dust();
  if(mode==='stream'){
    for(let i=0;i<n;i++){const baseY=H*(0.08+0.84*((i+0.5+ (r()-0.5))/n));const amp=H*(0.03+r()*0.13),ph=r()*6.29,fr=0.7+r()*2;const pts=[];for(let s=0;s<=20;s++){const t=s/20;pts.push([t*W*1.02-W*0.01, baseY+Math.sin(ph+t*fr*6.29)*amp*(0.5+t)]);}ribbon(pts,col(),3+r()*11);}
  } else if(mode==='rain'){
    for(let i=0;i<n*1.5;i++){const baseX=W*((i+0.5)/(n*1.5))+(r()-0.5)*40;const amp=W*(0.01+r()*0.05),ph=r()*6.29;const pts=[];for(let s=0;s<=16;s++){const t=s/16;pts.push([baseX+Math.sin(ph+t*6.29)*amp, t*H*1.04-H*0.02]);}ribbon(pts,col(),2+r()*7);}
  } else if(mode==='spiral'){
    const sx=W*(0.42+r()*0.16),sy=H*(0.42+r()*0.16);const cw=r()<0.5?1:-1;
    for(let i=0;i<n;i++){const a0=i/n*6.29,turns=2.5+r()*4,rmax=Math.min(W,H)*(0.4+r()*0.16);const pts=[];const steps=80;for(let s=0;s<=steps;s++){const t=s/steps,ang=a0+cw*t*turns*6.29,rad=t*rmax;pts.push([sx+Math.cos(ang)*rad,sy+Math.sin(ang)*rad]);}ribbon(pts,col(),2+r()*5);}
  } else { // orbit — dense concentric arcs
    const sx=W*(0.42+r()*0.16),sy=H*(0.42+r()*0.16),squash=0.55+r()*0.4;
    for(let i=0;i<n;i++){const rad=Math.min(W,H)*(0.08+i/n*0.44)+(r()-0.5)*16,a0=r()*6.29,sweep=1.2+r()*4.5;const pts=[];const steps=56;for(let s=0;s<=steps;s++){const t=s/steps,ang=a0+t*sweep;pts.push([sx+Math.cos(ang)*rad,sy+Math.sin(ang)*rad*squash]);}ribbon(pts,col(),2+r()*6);}
  }
  // ---- finish: scanlines, grain, vignette ----
  if(scan){x.save();x.globalAlpha=0.06;x.fillStyle='#000';for(let yy=0;yy<H;yy+=3)x.fillRect(0,yy,W,1.4);x.restore();}
  x.save();x.globalAlpha=0.045;for(let i=0;i<W*H/700;i++){const v=r()<0.5?'255,255,255':'0,0,0';x.fillStyle='rgba('+v+',1)';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.75); vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.55)'); x.fillStyle=vg; x.fillRect(0,0,W,H);
}
function castAfterglow(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*NEON_PALS.length);
  const fmtI=Math.floor(r()*NEON_FMTS.length);
  const mode=pick(NEON_MODES,r);
  const n= mode==='spiral'? rint(r,12,24) : mode==='orbit'? rint(r,18,36) : rint(r,6,13);
  return {palette:NEON_PALS[palI].name, format:NEON_FMTS[fmtI].t, mode, density: n<=9?'Sparse':n<=20?'Dense':'Swarm'};
}

/* BREACH — "Breach Protocol": gritty Cyberpunk-2077 interface debris. One
   system (a tech HUD overlay) torn up by glitch: RGB slice displacement,
   scanlines, grime, chromatic type. Variety from palette × format × layout
   (reticle / dashboard / breach-grid / signage) × random data + kanji. */

/* Night Service (glow) */
export const afterglowTraits: TraitsFn = (id) => { const c = castAfterglow(id) as any; return { Palette: c.palette, Format: c.format, Mode: cap(c.mode), Density: c.density }; };
export const afterglowSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Synthwave','Miami','Toxic','Blade','Ember','Ultraviolet','Ice','Sakura','Acid Rain','Magma','Vapor','Signal'] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall','Wide'] },
  { name: 'Mode', values: ['Stream','Rain','Spiral','Orbit'] },
  { name: 'Density', values: ['Sparse','Dense','Swarm'] },
] };
export const renderAfterglow = blit(afterglow, afterglowTraits);
export const AFTERGLOW_ASPECTS = [1, 0.72, 1.39, 0.58, 1.97] as const;
