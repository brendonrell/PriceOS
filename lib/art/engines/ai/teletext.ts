// @ts-nocheck
/*
 * Teletext — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, hash2, shade, grain, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const TT_FMTS=[{W:1080,H:1080,t:'Square'},{W:864,H:1180,t:'Portrait'},{W:1180,H:864,t:'Landscape'},{W:760,H:1320,t:'Tall'},{W:1320,H:760,t:'Wide'}];
const TT_PALS=[
  {name:'Paper', bg:'#f4f1e8', ink:'#16140f', accent:'#16140f', tint:0.00},
  {name:'Noir', bg:'#0b0b0d', ink:'#e8e6dd', accent:'#e8e6dd', tint:0.00},
  {name:'Amber', bg:'#0a0600', ink:'#ffb000', accent:'#ff7a00', tint:0.55},
  {name:'Phosphor', bg:'#000a02', ink:'#33ff66', accent:'#7dffae', tint:0.55},
  {name:'Night', bg:'#06080f', ink:'#7fd8ff', accent:'#ff4d8d', tint:0.40},
  {name:'Violet', bg:'#120a18', ink:'#e0b3ff', accent:'#ffd514', tint:0.40},
  {name:'Slate', bg:'#0d1014', ink:'#cdd6e0', accent:'#ff5a3c', tint:0.30},
  {name:'Inkpaper', bg:'#fff4e6', ink:'#1a2e3a', accent:'#d6452b', tint:0.20},
];
const TT_FIELDS=['rings','sine','interfere','spiral','blobs','ripple'];
const TT_RAMPS=[' .:-=+*#%@',' ░▒▓█',' .·:;+=xX#',' ·-+▖▗▘▝▚▞█',' .,:;iltfLCG0#@',' ─│┼╳▒▓█',' .:!?I#@'];
const TT_CELLS=[12,14,16,18,22];
function ascii(cv,seed){
  const r=rng(seed);
  const fmt=pick(TT_FMTS,r);
  const pal=pick(TT_PALS,r);
  const fieldType=pick(TT_FIELDS,r);
  const ramp=pick(TT_RAMPS,r);
  const cell=pick(TT_CELLS,r);
  const contrast=0.6+r()*1.1;
  const colorMode=pick(['mono','field','accentEdge','duo'],r);
  const scale=0.6+r()*1.5;
  const rot=(r()-0.5)*1.4;
  const grain=r()<0.55;
  const scan=r()<0.45;
  const phase=r()*6.283;
  // ---- end trait draws ----
  const W=fmt.W,H=fmt.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  x.fillStyle=pal.bg; x.fillRect(0,0,W,H);
  const cols=Math.floor(W/cell), rows=Math.floor(H/cell);
  const ox=(W-cols*cell)/2, oy=(H-rows*cell)/2, fs=Math.round(cell*1.18);
  x.font=fs+'px "Courier New",monospace'; x.textAlign='center'; x.textBaseline='middle';
  const cx=cols/2, cy=rows/2, ca=Math.cos(rot), sa=Math.sin(rot), t=phase;
  function field(i,j){
    let u=(i-cx)/cols, v=(j-cy)/rows*(rows/cols);
    const pu=u*ca-v*sa, pv=u*sa+v*ca; u=pu*scale*6.5; v=pv*scale*6.5;
    const d=Math.sqrt(u*u+v*v), ang=Math.atan2(v,u); let f;
    if(fieldType==='rings') f=Math.sin(d*2.4-t)*0.5+0.5;
    else if(fieldType==='sine') f=(Math.sin(u+t)+Math.sin(v*1.3-t*0.7))*0.25+0.5;
    else if(fieldType==='interfere') f=(Math.sin(u*1.7+t)+Math.sin((u+v)*1.1-t)+Math.sin(v*1.4+t*0.6))/3*0.5+0.5;
    else if(fieldType==='spiral') f=Math.sin(d*1.8+ang*4-t)*0.5+0.5;
    else if(fieldType==='blobs'){const s=0.6,gx=u*s,gy=v*s,x0=Math.floor(gx),y0=Math.floor(gy),fx=gx-x0,fy=gy-y0,sm=q=>q*q*(3-2*q),a=hash2(x0,y0),b=hash2(x0+1,y0),c=hash2(x0,y0+1),dd=hash2(x0+1,y0+1),sx=sm(fx),sy=sm(fy);f=(a*(1-sx)+b*sx)*(1-sy)+(c*(1-sx)+dd*sx)*sy;f=0.5+0.5*Math.sin(f*6.283+d*0.8-t);}
    else f=Math.sin(d*3.0-t)*Math.cos(u*0.8+t*0.5)*0.5+0.5;
    f=Math.max(0,Math.min(1,f)); return Math.pow(f,contrast);
  }
  const rl=ramp.length;
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    const f=field(i,j);
    const g=grain?Math.max(0,Math.min(1,f+(hash2(i,j)-0.5)*0.12)):f;
    const gi=Math.min(rl-1,Math.floor(g*rl)), ch=ramp[gi]; if(ch===' ')continue;
    const px=ox+i*cell+cell/2, py=oy+j*cell+cell/2;
    if(colorMode==='mono') x.fillStyle=pal.ink;
    else if(colorMode==='field') x.fillStyle=shade(pal.ink,Math.round((g-0.5)*60*(pal.tint+0.5)));
    else if(colorMode==='accentEdge') x.fillStyle=g>0.82?pal.accent:pal.ink;
    else x.fillStyle=(gi%2&&g>0.4)?pal.accent:pal.ink;
    x.fillText(ch,px,py);
  }
  if(scan){x.fillStyle='rgba(0,0,0,0.10)';for(let yy=0;yy<H;yy+=Math.max(2,Math.round(cell/2)))x.fillRect(0,yy,W,1);}
  if(pal.tint>0.1){const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.7);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,0.34)');x.fillStyle=vg;x.fillRect(0,0,W,H);}
}
function castAscii(seed){
  const r=rng(seed);
  const fmt=pick(TT_FMTS,r);
  const pal=pick(TT_PALS,r);
  const fieldType=pick(TT_FIELDS,r);
  const ramp=pick(TT_RAMPS,r);
  const cell=pick(TT_CELLS,r);
  return {fmtT:fmt.t, field:fieldType, palName:pal.name, density: cell<=12?'Fine':cell<=16?'Medium':'Coarse'};
}

/* CHROME DREAMS — "Chrome Dreams": Y2K logo generator. Liquid-metal/chrome &
   gel wordmarks + emblems, starburst sparkles, holographic sweeps, swooshes,
   orbit rings. Paint order per element: shadow -> bevel -> fill -> outline ->
   glints (the depth recipe). Variety = palette × format × layout × finish ×
   motif × word. Chrome/jagged type is the medium here (allowed). */

/* Teletext */
export const asciiTraits: TraitsFn = (id) => { const c = castAscii(id) as any; return { Format: c.fmtT, Field: cap(c.field), Palette: c.palName, Density: c.density }; };
export const asciiSchema: TraitSchema = { traits: [
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall','Wide'],
    subtraits: [
      { name: 'Upright', values: ['Square', 'Portrait', 'Tall'] },
      { name: 'Broad', values: ['Landscape', 'Wide'] },
    ] },
  { name: 'Field', values: ['Rings','Sine','Interfere','Spiral','Blobs','Ripple'],
    subtraits: [
      { name: 'Radial', values: ['Rings', 'Spiral', 'Ripple'] },
      { name: 'Linear', values: ['Sine', 'Interfere'] },
      { name: 'Organic', values: ['Blobs'] },
    ] },
  { name: 'Palette', values: ['Paper','Noir','Amber','Phosphor','Night','Violet','Slate','Inkpaper'],
    subtraits: [
      { name: 'Broadcast', values: ['Amber', 'Phosphor', 'Night', 'Violet'] },
      { name: 'Print', values: ['Paper', 'Noir', 'Slate', 'Inkpaper'] },
    ] },
  { name: 'Density', values: ['Fine','Medium','Coarse'] },
] };
export const renderAscii = blit(ascii, asciiTraits);
export const ASCII_ASPECTS = [1, 0.73, 1.37, 0.58, 1.74] as const;
