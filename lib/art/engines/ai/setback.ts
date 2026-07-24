// @ts-nocheck
/*
 * Setback — axonometric brutalist massing — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, mix, rgba, grain, vignette, mottle, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const SB_PALS=[
  {name:'Raw Concrete', sky:['#b9c6d4','#e8c49a'], grnd:'#6f675a', top:'#ece6da', lt:'#d3cab8', rt:'#6f6859', edge:'#534c3d', acc:'#e0552e', dark:false},
  {name:'Travertine',   sky:['#f6e2b4','#e89c5c'], grnd:'#8a6e44', top:'#fbf2dc', lt:'#f0d8a6', rt:'#9c7c46', edge:'#6e5328', acc:'#2f8f86', dark:false},
  {name:'Oxidized',     sky:['#c6e2d6','#eebb7e'], grnd:'#5d6a60', top:'#eef0e6', lt:'#c2cdbd', rt:'#5d7468', edge:'#3a564c', acc:'#e07a36', dark:false},
  {name:'Dusk',         sky:['#5d61a0','#f0a878'], grnd:'#2a2e4a', top:'#c8c2e0', lt:'#9c98c4', rt:'#54547a', edge:'#2e2e48', acc:'#ffc18f', dark:true},
  {name:'Blueprint',    sky:['#15406e','#0a1d33'], grnd:'#0a1626', top:'#cfe2f2', lt:'#7ab0e0', rt:'#356092', edge:'#e8f3ff', acc:'#ffc23a', dark:true},
  {name:'Ash Rose',     sky:['#f2d6e0','#e8a486'], grnd:'#7a6065', top:'#f7eae8', lt:'#e2bcc2', rt:'#8d6a71', edge:'#5e474d', acc:'#3d6f8c', dark:false},
  {name:'Graphite',     sky:['#3a3d44','#22242a'], grnd:'#15171c', top:'#b9bcc4', lt:'#7e828c', rt:'#42464f', edge:'#cfd4dc', acc:'#ff7a4a', dark:true},
  {name:'Béton Brut',   sky:['#9a948a','#6f6960'], grnd:'#3f3a33', top:'#d8d2c6', lt:'#a39b8d', rt:'#6a6253', edge:'#3c352a', acc:'#d2542f', dark:false},
  {name:'Patina Bronze',sky:['#2a3330','#141a18'], grnd:'#0c1210', top:'#bfc8b8', lt:'#7e9483', rt:'#48685a', edge:'#cfe8d8', acc:'#e8a23a', dark:true},
  {name:'Nocturne',     sky:['#3a3550','#171426'], grnd:'#0e0c18', top:'#cfc6e0', lt:'#8f86ab', rt:'#544c70', edge:'#d8cff0', acc:'#ffb070', dark:true},
];
const SB_FMTS=[{W:1080,H:1320,t:'Portrait'},{W:1080,H:1080,t:'Square'},{W:1320,H:1040,t:'Landscape'}];
function setback(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*SB_PALS.length);
  const fmt=pick(SB_FMTS,r);
  const towerCount=pick([1,1,2,2,3],r);
  const sun=r()<0.5?1:-1;
  const aperture=pick(['Blank','Slits','Grid','Punched'],r);
  // ---- end trait draws ----
  const P=SB_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d'); const dark=P.dark;
  const sg=x.createLinearGradient(0,0,0,H);sg.addColorStop(0,P.sky[0]);sg.addColorStop(0.7,P.sky[1]);sg.addColorStop(1,mix(P.sky[1],dark?'#000':'#fff',0.1));x.fillStyle=sg;x.fillRect(0,0,W,H);
  const horizon=H*0.72;
  const gg=x.createLinearGradient(0,horizon,0,H);gg.addColorStop(0,mix(P.grnd,P.sky[1],0.2));gg.addColorStop(1,mix(P.grnd,'#000',0.45));x.fillStyle=gg;x.fillRect(0,horizon-1,W,H-horizon+1);
  const sgx=sun>0?W*0.16:W*0.84;const sgl=x.createRadialGradient(sgx,horizon-H*0.32,0,sgx,horizon-H*0.32,W*0.7);sgl.addColorStop(0,rgba(P.acc,dark?0.18:0.12));sgl.addColorStop(1,rgba(P.acc,0));x.fillStyle=sgl;x.fillRect(0,0,W,H);

  const tw0=towerCount===1?W*0.125:towerCount===2?W*0.098:W*0.075;
  function bilin(a,b,c,d,u,v){const bot=[a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u];const top=[d[0]+(c[0]-d[0])*u,d[1]+(c[1]-d[1])*u];return [bot[0]+(top[0]-bot[0])*v,bot[1]+(top[1]-bot[1])*v];}
  function quadPath(pts){x.beginPath();x.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length;i++)x.lineTo(pts[i][0],pts[i][1]);x.closePath();}
  // fill a face quad with a vertical gradient (top→bottom colours)
  function gradFace(pts,topCol,botCol){let ymin=1e9,ymax=-1e9;for(const p of pts){if(p[1]<ymin)ymin=p[1];if(p[1]>ymax)ymax=p[1];}const g=x.createLinearGradient(0,ymin,0,ymax);g.addColorStop(0,topCol);g.addColorStop(1,botCol);quadPath(pts);x.fillStyle=g;x.fill();}
  function drawBox(gx,ccy,fw,fd,h,tw,P,edge,apert,occl){
    const th=tw*Math.tan(Math.PI/6);
    const corner=(i,j)=>[i*tw-j*tw, i*th+j*th];
    const cx=((fw-fd)/2)*tw, cy=((fw+fd)/2)*th;
    const T=(p)=>[p[0]-cx+gx, p[1]-cy+ccy];
    const P00=T(corner(0,0)),Pf0=T(corner(fw,0)),Pff=T(corner(fw,fd)),P0f=T(corner(0,fd));
    const up=p=>[p[0],p[1]-h];
    const t00=up(P00),tf0=up(Pf0),tff=up(Pff),t0f=up(P0f);
    const rightFace=[Pf0,Pff,tff,tf0];
    const leftFace=[P0f,Pff,tff,t0f];
    const litR= sun>0, litL= sun<0;
    // contact AO: dark wedge on the base footprint (crevice where this box meets the one below)
    if(occl){x.save();x.globalAlpha=0.22;quadPath([P00,Pf0,Pff,P0f]);x.fillStyle='#000';x.fill();x.restore();}
    // faces with per-face vertical gradient (sky bounce up top, ground bounce at base)
    // golden-hour warmth on the lit face, cool sky-bounce in the shadow → colour, not grey
    const litTop=mix(mix(P.lt,'#fff',0.05),P.acc,0.08), litBot=mix(P.lt,'#000',0.14);
    const shTop=mix(P.rt,P.sky[0],0.16), shBot=mix(P.rt,'#000',0.2);
    gradFace(rightFace, litR?litTop:shTop, litR?litBot:shBot);
    gradFace(leftFace,  litL?litTop:shTop, litL?litBot:shBot);
    // top face: bright, slight gradient
    gradFace([t00,tf0,tff,t0f], mix(P.top,'#fff',0.08), P.top);
    // aggregate + board-form per visible face (clip to face)
    for(const F of [rightFace,leftFace]){x.save();quadPath(F);x.clip();
      const a=F[0],b=F[1],c=F[2],d=F[3];
      // board-form striations following the face
      x.globalAlpha=0.12;x.strokeStyle=dark?'#fff':'#000';x.lineWidth=1;
      for(let s=0.08;s<1;s+=0.1){const p1=[a[0]+(d[0]-a[0])*s,a[1]+(d[1]-a[1])*s],p2=[b[0]+(c[0]-b[0])*s,b[1]+(c[1]-b[1])*s];x.beginPath();x.moveTo(p1[0],p1[1]);x.lineTo(p2[0],p2[1]);x.stroke();}
      x.restore();
      // aggregate speckle
      let ymin=1e9,ymax=-1e9,xmin=1e9,xmax=-1e9;for(const p of F){ymin=Math.min(ymin,p[1]);ymax=Math.max(ymax,p[1]);xmin=Math.min(xmin,p[0]);xmax=Math.max(xmax,p[0]);}
      x.save();quadPath(F);x.clip();mottle(x,xmin,ymin,xmax-xmin,ymax-ymin, F===rightFace?(litR?P.lt:P.rt):(litL?P.lt:P.rt),140,r,'overlay');x.restore();
    }
    if(apert!=='Blank'){
      const faces=[{F:rightFace,lit:litR},{F:leftFace,lit:litL}];
      const cols=apert==='Slits'?2:apert==='Grid'?4:3, rows=apert==='Slits'?5:apert==='Grid'?5:3;
      for(const {F,lit} of faces){const a=F[0],b=F[1],c=F[2],d=F[3];
        for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
          const u0=(i+0.26)/cols,u1=(i+0.74)/cols,v0=(j+0.22)/rows,v1=(j+0.74)/rows;
          const q0=bilin(a,b,c,d,u0,v0),q1=bilin(a,b,c,d,u1,v0),q2=bilin(a,b,c,d,u1,v1),q3=bilin(a,b,c,d,u0,v1);
          x.beginPath();x.moveTo(q0[0],q0[1]);x.lineTo(q1[0],q1[1]);x.lineTo(q2[0],q2[1]);x.lineTo(q3[0],q3[1]);x.closePath();
          const onLit = lit && r()<0.45;
          x.fillStyle= onLit? rgba(P.acc,0.5): rgba(edge,0.5);x.fill();
        }
      }
    }
    // edge: lit edges get a light inner highlight, shade a dark line (bevel the light)
    x.strokeStyle=rgba(mix(P.top,'#fff',0.2),0.6);x.lineWidth=1.2;x.beginPath();x.moveTo(t00[0],t00[1]);x.lineTo(tf0[0],tf0[1]);x.lineTo(tff[0],tff[1]);x.lineTo(t0f[0],t0f[1]);x.closePath();x.stroke();
    x.strokeStyle=rgba(edge,0.5);x.lineWidth=1;x.beginPath();x.moveTo(Pff[0],Pff[1]);x.lineTo(tff[0],tff[1]);x.stroke();
  }
  // off-centre placement (break the mirror axis)
  let slots;
  if(towerCount===1) slots=[r()<0.5?0.40:0.60];
  else if(towerCount===2) slots=r()<0.5?[0.30,0.58]:[0.42,0.70];
  else slots=[0.24,0.49,0.74];
  const towers=slots.map((s)=>({s,levels:rint(r,3,7),fw:rint(r,2,3),fd:rint(r,2,3),scale:0.8+r()*0.45})).sort((a,b)=>a.s-b.s);
  // ground cast shadows
  x.save();x.globalAlpha=dark?0.34:0.22;
  for(const t of towers){const gx=W*t.s, gy=horizon+H*0.03, tw=tw0*t.scale, th=tw*Math.tan(Math.PI/6); const len=tw*t.levels*0.9;
    const dir=-sun;x.fillStyle='#000';x.beginPath();x.moveTo(gx-tw,gy);x.lineTo(gx+tw,gy);x.lineTo(gx+tw+dir*len, gy+th*3.2);x.lineTo(gx-tw+dir*len, gy+th*3.2);x.closePath();x.fill();}
  x.restore();
  for(const t of towers){
    const gx=W*t.s, gy=horizon+H*0.0, tw=tw0*t.scale;
    let fw=t.fw, fd=t.fd, ccy=gy;
    for(let L=0;L<t.levels;L++){
      const h=H*(0.052+0.022*((t.levels-L)/t.levels))*(0.92+r()*0.4);
      drawBox(gx,ccy,fw,fd,h,tw,P,P.edge,aperture, L>0);
      ccy = ccy - h;
      if(r()<0.7 && fw>1) fw-=1; if(r()<0.45 && fd>1) fd-=1; if(fw<1)fw=1; if(fd<1)fd=1;
    }
  }
  // atmospheric haze lightening tower tops toward sky
  const hz=x.createLinearGradient(0,horizon-H*0.24,0,horizon+H*0.02);hz.addColorStop(0,rgba(P.sky[0],dark?0.4:0.3));hz.addColorStop(1,'rgba(255,255,255,0)');x.fillStyle=hz;x.globalCompositeOperation='screen';x.fillRect(0,horizon-H*0.34,W,H*0.34);x.globalCompositeOperation='source-over';
  grain(x,W,H,1000,r);
  vignette(x,W,H,dark?0.42:0.24);
}
function castSetback(seed){const r=rng(seed);const palI=Math.floor(r()*SB_PALS.length);const fmt=pick(SB_FMTS,r);const towerCount=pick([1,1,2,2,3],r);const sun=r()<0.5?1:-1;const aperture=pick(['Blank','Slits','Grid','Punched'],r);return {palette:SB_PALS[palI].name, format:fmt.t, massing:towerCount===1?'Monolith':towerCount===2?'Twin':'Skyline', light:sun>0?'West':'East', aperture};}

/* ========================================================================
 * 2. SIMULTANEOUS — interacting colour fields. Real angled halftone optical
 *    mix, riso misregistration fringe, ink mottle inside flats, a hard
 *    contrasting boundary keyline (the actual simultaneous-contrast edge),
 *    figure on a phi point. 5 comps: Bands/Nested/Bisect/Disc/Stack.
 * ====================================================================== */

/* Setback — axonometric brutalist massing */
export const setbackTraits: TraitsFn = (id) => { const c = castSetback(id) as any; return { Palette: c.palette, Format: c.format, Massing: c.massing, Light: c.light, Aperture: c.aperture }; };
export const setbackSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Raw Concrete','Travertine','Oxidized','Dusk','Blueprint','Ash Rose','Graphite','Béton Brut','Patina Bronze','Nocturne'],
    subtraits: [
      { name: 'Stone', values: ['Raw Concrete', 'Travertine', 'Béton Brut', 'Graphite'] },
      { name: 'Weathered', values: ['Oxidized', 'Patina Bronze', 'Ash Rose'] },
      { name: 'Nocturne', values: ['Dusk', 'Blueprint', 'Nocturne'] },
    ] },
  { name: 'Format', values: ['Portrait','Square','Landscape'],
    subtraits: [
      { name: 'Upright', values: ['Portrait', 'Square'] },
      { name: 'Broad', values: ['Landscape'] },
    ] },
  { name: 'Massing', values: ['Monolith','Twin','Skyline'],
    subtraits: [
      { name: 'Singular', values: ['Monolith', 'Twin'] },
      { name: 'Multiple', values: ['Skyline'] },
    ] },
  { name: 'Light', values: ['West','East'] },
  { name: 'Aperture', values: ['Blank','Slits','Grid','Punched'],
    subtraits: [
      { name: 'Solid', values: ['Blank'] },
      { name: 'Perforated', values: ['Slits', 'Grid', 'Punched'] },
    ] },
] };
export const renderSetback = blit(setback, setbackTraits);
export const SETBACK_ASPECTS = [0.82, 1, 1.27] as const;
