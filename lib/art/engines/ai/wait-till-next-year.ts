// @ts-nocheck
/*
 * Wait Till Next Year — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, shade, paperNoise, star, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* PENNANT — "Wait Till Next Year" */
function pennant(cv,seed){
  const r=rng(seed);
  const vert=r()<0.3;
  const W= vert?700:1240, H= vert?1240:620;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const bg=pick(['#1c1824','#241a14','#14201c','#bcd8f0','#e8eef2','#10341c','#1d2a6a','#3a1020','#cfe0d8','#6a1428'],r);
  const light= bg==='#f2e2b8'||bg==='#e8dfc8'||bg==='#cfe0d8';
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H, light?'60,40,20':'255,240,210',400);
  const felt=pick(['#d61a3c','#1d4fb8','#0f8a3c','#ff7a2b','#7a00cc','#14649c','#c83264','#ffaa00','#14141c'],r);
  const trim=pick(['#f2ead0','#ffd514','#fff'],r);
  x.save();
  let LW=W, LH=H;
  if(vert){ x.translate(W,0); x.rotate(Math.PI/2); LW=H; LH=W; }
  const flip= !vert && r()<0.3;
  const px0=flip?LW-90:90, px1=flip?110:LW-110, pm=flip?-1:1;
  const py0=LH*0.2, ph=LH*0.48;
  x.strokeStyle='#c8a85a'; x.lineWidth=10; x.lineCap='round';
  x.beginPath(); x.moveTo(px0,LH*0.1); x.lineTo(px0,LH*0.9); x.stroke();
  x.fillStyle=felt;
  x.beginPath();
  x.moveTo(px0+pm*8,py0); x.lineTo(px1,py0+ph/2); x.lineTo(px0+pm*8,py0+ph);
  x.closePath(); x.fill();
  x.strokeStyle='rgba(0,0,0,0.35)'; x.lineWidth=3; x.stroke();
  if(r()<0.4){
    x.fillStyle=shade(felt,-44);
    x.beginPath();
    x.moveTo(px0+pm*8,py0+ph/2); x.lineTo(px1,py0+ph/2); x.lineTo(px0+pm*8,py0+ph);
    x.closePath(); x.fill();
  }
  // hoist band + tassels (tassels only when hanging sideways looks right)
  x.fillStyle=trim;
  x.fillRect(px0+(pm>0?8:-26),py0-8,18,ph+16);
  if(!vert){
    for(let i=0;i<3;i++){
      const ty=py0+20+i*(ph-40)/2;
      x.strokeStyle=trim; x.lineWidth=3;
      x.beginPath();x.moveTo(px0-pm*6,ty);x.lineTo(px0-pm*26,ty+18);x.stroke();
      x.fillStyle=trim;
      x.beginPath();x.arc(px0-pm*30,ty+24,8,0,6.29);x.fill();
    }
  }
  const city=pick(['MERIDIAN','NIEBLA','SALT GARDEN','PROVIDENCE','WINTERFIELD','EAST OF EAST','HALCYON','LOWER BAY','RED HARBOUR','CALDERA','NORTH LYRIC','PALE GATE','FOUNDRY','TWIN WELLS','MIRROR LAKE','PORT VESPER','GRANITE','SUMMIT','OXBOW','THE NARROWS'],r);
  const team=pick(['ROCKETS','OWLS','ATOMS','JACKALS','COMETS','PILOTS','MONARCHS','FOUNDERS','MINERS','WOLVES','HORNETS','SAINTS','PIRATES','MUSTANGS','BEARS','HAWKS','RAMS','STAGS','OTTERS','BISON','THUNDER','STORM','KINGS','DUKES','SCOUTS','RANGERS','LUMBERJACKS','MARINERS','METEORS','PHANTOMS','HERONS','MOOSE','PIKE','BADGERS','ORCAS','HUSKIES','ELKS','LOONS','GRIZZLIES','VOYAGEURS'],r);
  x.save();
  const tx0=px0+pm*88, ty0=py0+ph/2;
  x.translate(tx0,ty0);
  if(flip){x.scale(-1,1);}
  x.textAlign='left'; x.textBaseline='middle';
  x.fillStyle=trim;
  x.font='bold 26px Georgia,serif';
  x.fillText(city,0,-ph*0.19);
  x.font='bold '+Math.round(ph*0.28)+'px Georgia,serif';
  let lx=0;
  for(let i=0;i<team.length;i++){
    const sc=1-(i/team.length)*0.42;
    const adv=x.measureText(team[i]).width; // real letter width — no pile-ups
    x.save(); x.translate(lx,0); x.scale(sc,sc);
    x.fillText(team[i],0,8);
    x.restore();
    lx+=adv*sc+5;
  }
  x.restore();
  x.fillStyle=trim;
  star(x,px0+pm*46,py0+ph/2,26,5);
  x.restore();
}

/* FORTY-FIVE — "Every Light In Town" */
function castPennant(seed){
  const r=rng(seed);
  const vert=r()<0.3;
  const bi=Math.floor(r()*10);
  for(let i=0;i<400;i++){r();r();r();} // paperNoise burn
  const fi=Math.floor(r()*9); // felt
  return {vert,bi,fi};
}

/* ── Wait Till Next Year ────────────────────────────────────────────────── */
const WALL = ['Charcoal', 'Walnut', 'Forest', 'Sky', 'Fog', 'Pine', 'Navy', 'Oxblood', 'Mist', 'Wine'];
const FELT = ['Crimson', 'Royal', 'Green', 'Orange', 'Violet', 'Steel', 'Berry', 'Gold', 'Black'];
export const nextYearTraits: TraitsFn = (id) => {
  const c = castPennant(id);
  return { Hang: c.vert ? 'Drop' : 'Banner', Wall: WALL[c.bi], Felt: FELT[c.fi] };
};
export const nextYearSchema: TraitSchema = {
  traits: [
    { name: 'Hang', values: ['Banner', 'Drop'] },
    { name: 'Wall', values: WALL,
      subtraits: [
        { name: 'Dark', values: ['Charcoal', 'Walnut', 'Forest', 'Pine', 'Navy', 'Oxblood', 'Wine'] },
        { name: 'Light', values: ['Sky', 'Fog', 'Mist'] },
      ] },
    { name: 'Felt', values: FELT },
  ],
};
export const renderNextYear = blit(pennant, nextYearTraits);
export const NEXTYEAR_ASPECTS = [2, 0.56] as const;
