// @ts-nocheck
/*
 * Crosstown — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shuffle, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* 10. TRANSIT — metro maps of imaginary cities */
function transit(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1240,H:1000},{W:1000,H:1240},{W:1080,H:1080}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const dark=r()<0.4;
  const bg= dark?'#101218':'#f2f4f4', inkc= dark?'#e8e8f0':'#1c1c24';
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  const COLS=shuffle(['#e0202e','#1d4fb8','#0f9a3c','#ffaa00','#8a2bb8','#ff5a8a','#00b8c8','#ff7a2b','#aacc00'],r);
  const G=pick([40,40,64],r); // grid pitch — 64 reads as a zoomed sector
  const nLines= G>40? rint(r,3,5) : rint(r,4,7);
  const snap=v=>Math.round(v/G)*G;
  const lines=[];
  for(let li=0;li<nLines;li++){
    // octilinear random walk across the canvas
    const horiz=r()<0.5;
    let px= horiz? 80 : snap(160+r()*(W-320));
    let py= horiz? snap(160+r()*(H-380)) : 120;
    const pts=[[px,py]];
    let dir= horiz?0:2; // 0 E,1 SE,2 S,3 NE... use vectors
    const DIRS=[[1,0],[1,1],[0,1],[1,-1],[-1,1]];
    let guard=0;
    // walk until the line truly spans the map — no stubby orphans
    while(px<W-140&&guard++<120){
      const seg=G*rint(r,2,6);
      const d= r()<0.6 ? DIRS[dir] : DIRS[dir=rint(r,0,horiz?3:4)];
      px=snap(px+d[0]*seg); py=snap(py+d[1]*seg);
      if(py<120){py=120;dir=0;} if(py>H-260){py=snap(H-260);dir=0;}
      px=Math.min(px,snap(W-100));
      pts.push([px,py]);
    }
    lines.push({c:COLS[li%COLS.length],pts});
  }
  // draw lines
  x.lineJoin='round'; x.lineCap='round';
  lines.forEach(L=>{
    x.strokeStyle=L.c; x.lineWidth=11;
    x.beginPath();
    L.pts.forEach((p,i)=>i===0?x.moveTo(p[0],p[1]):x.lineTo(p[0],p[1]));
    x.stroke();
  });
  // stations
  const NAMES=['HARBOUR CROSS','VANISHING PT','NORTH LYRIC','SALT GARDEN','OLD MINT','PARLIAMENT','MERCY PARK','LOWER MERIDIAN','TERMINAL LUX','THE NARROWS','FOUNDRY','EAST OF EAST','PALE GATE','MUSEUM OF SMOKE','HALCYON','WINTERFIELD'];
  const used=[]; const placed=[];
  const clear=(px,py)=>placed.every(q=>(q[0]-px)**2+(q[1]-py)**2>150*150);
  lines.forEach(L=>{
    L.pts.forEach((p,i)=>{
      if(i===0||i===L.pts.length-1||r()<0.5){
        x.fillStyle=bg; x.strokeStyle=inkc; x.lineWidth=2.6;
        x.beginPath(); x.arc(p[0],p[1],7,0,6.29); x.fill(); x.stroke();
        if(r()<0.35&&used.length<12&&clear(p[0],p[1])&&p[0]<W-260){
          const nm=NAMES[used.length]; used.push(nm); placed.push(p);
          x.fillStyle=inkc; x.font='bold 15px Helvetica,Arial,sans-serif'; x.textAlign='left';
          x.fillText(nm,p[0]+12,p[1]-10);
        }
      }
    });
  });
  // title + legend
  const city=pick(['MERIDIA','NIEBLA','PROVIDENCIA','VESPER','SALTGARDEN'],r);
  x.fillStyle=inkc; x.textAlign='left';
  x.font='bold 44px Helvetica,Arial,sans-serif';
  x.fillText(city+' METRO',70,86);
  const showLegend=r()<0.65;
  const ly=H-150;
  if(showLegend){
  x.fillRect(60,ly-30,W-120,1);
  const lineNames=['CIRCLE','MERIDIAN','HARBOUR','FOUNDRY','CROSSTOWN','PALE','LYRIC'];
  lines.forEach((L,i)=>{
    const lx=70+(i%4)*290, lyy=ly+10+Math.floor(i/4)*44;
    x.strokeStyle=L.c; x.lineWidth=10; x.lineCap='round';
    x.beginPath(); x.moveTo(lx,lyy); x.lineTo(lx+54,lyy); x.stroke();
    x.fillStyle=inkc; x.font='bold 16px Helvetica,Arial,sans-serif';
    x.fillText(lineNames[i%lineNames.length]+' LINE',lx+66,lyy+6);
  });
  }
}

/* 12. MATCHBOOK — cheap-print matchbox labels */
function castTransit(seed){
  const r=rng(seed);
  r(); // fmt
  const dark=r()<0.4;
  for(let i=8;i>0;i--) Math.floor(r()*(i+1)); // shuffle(9) burn
  const G=pick([40,40,64],r);
  const nLines= G>40? rint(r,3,5) : rint(r,4,7);
  return {dark,G,nLines};
}

/* ── Crosstown ──────────────────────────────────────────────────────────── */
export const crosstownTraits: TraitsFn = (id) => {
  const c = castTransit(id);
  return {
    Paper: c.dark ? 'Night' : 'Day',
    Pitch: c.G > 40 ? 'Sector' : 'Network',
    Lines: String(c.nLines),
  };
};
export const crosstownSchema: TraitSchema = {
  traits: [
    { name: 'Paper', values: ['Day', 'Night'] },
    { name: 'Pitch', values: ['Network', 'Sector'] },
    { name: 'Lines', values: ['3', '4', '5', '6', '7'] },
  ],
};
export const renderCrosstown = blit(transit, crosstownTraits);
export const CROSSTOWN_ASPECTS = [1.24, 0.81, 1] as const;
