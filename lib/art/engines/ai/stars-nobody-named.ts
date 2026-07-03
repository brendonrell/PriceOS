// @ts-nocheck
/*
 * Stars Nobody Named — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, hash2, paperNoise, star, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

/* STARS NOBODY NAMED — fields, planispheres, horizons */
function ephemeris(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1050,H:1050}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sch=pick([
    {sky:'#0c1030',ink:'#e8e2cc',star:['#fff8e0','#ffd24a','#7fd4ff'],acc:'#ff3d6e'},
    {sky:'#1a0533',ink:'#e8d8ff',star:['#fff','#ff9ad1','#ffd24a'],acc:'#00e5c0'},
    {sky:'#001a14',ink:'#cfeee0',star:['#e0fff4','#7fffd4','#ffd24a'],acc:'#ff7a2b'},
    {sky:'#f1ead6',ink:'#2c2a24',star:['#2c2a24'],acc:'#c0202e',day:true},
    {sky:'#06142e',ink:'#d8e8ff',star:['#fff','#7fb8ff','#ffe27a'],acc:'#ffd514'},
    {sky:'#10081c',ink:'#e0d0f0',star:['#fff','#c8a8ff','#7fd4ff'],acc:'#c8ff00'},
  ],r);
  const comp=pick(['field','field','plani','horizon'],r);
  x.fillStyle=sch.sky; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H,sch.day?'80,60,30':'220,220,255',700);
  const sscale=pick([0.8,1,1.35],r);
  const nst=rint(r,160,520);

  function drawStars(stars){
    stars.sort((a,b)=>b.m-a.m);
    stars.forEach(s=>{
      const rad=(0.6+s.m*3.6)*sscale;
      x.fillStyle=s.c; x.beginPath(); x.arc(s.x,s.y,rad,0,6.29); x.fill();
      if(s.m>0.72){
        x.strokeStyle=s.c; x.lineWidth=0.8;
        const L=rad*3.4;
        x.beginPath();
        x.moveTo(s.x-L,s.y);x.lineTo(s.x+L,s.y);
        x.moveTo(s.x,s.y-L);x.lineTo(s.x,s.y+L);
        x.stroke();
      }
    });
  }
  function constellate(stars,minN,maxN){
    const central=stars.filter(s=>s.m>0.4).slice(0,rint(r,minN,maxN));
    if(central.length>2){
      const used=[central[0]]; const rest=central.slice(1);
      x.strokeStyle=sch.acc; x.lineWidth=1.5; x.globalAlpha=0.8;
      while(rest.length){
        const from=used[used.length-1];
        rest.sort((a,b)=>((a.x-from.x)**2+(a.y-from.y)**2)-((b.x-from.x)**2+(b.y-from.y)**2));
        const to=rest.shift();
        x.beginPath(); x.moveTo(from.x,from.y); x.lineTo(to.x,to.y); x.stroke();
        used.push(to);
      }
      x.globalAlpha=1;
    }
  }

  if(comp==='plani'){
    const cx=W/2, cy=H/2, R=Math.min(W,H)*0.42;
    // radial grid
    x.strokeStyle=sch.ink; x.globalAlpha=0.3; x.lineWidth=0.8;
    for(let i=1;i<=4;i++){x.beginPath();x.arc(cx,cy,R*i/4,0,6.29);x.stroke();}
    for(let i=0;i<12;i++){const a=i/12*6.283;
      x.beginPath();x.moveTo(cx,cy);x.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);x.stroke();}
    x.globalAlpha=1;
    x.save(); x.beginPath(); x.arc(cx,cy,R,0,6.29); x.clip();
    const stars=[];
    for(let i=0;i<nst;i++){
      const a=r()*6.283, rr=Math.sqrt(r())*R;
      stars.push({x:cx+Math.cos(a)*rr,y:cy+Math.sin(a)*rr,m:Math.pow(r(),2.6),c:pick(sch.star,r)});
    }
    drawStars(stars);
    constellate(stars.filter(s=>Math.hypot(s.x-cx,s.y-cy)<R*0.75),6,10);
    x.restore();
    x.strokeStyle=sch.ink; x.lineWidth=3;
    x.beginPath(); x.arc(cx,cy,R,0,6.29); x.stroke();
    x.lineWidth=1; x.beginPath(); x.arc(cx,cy,R+10,0,6.29); x.stroke();
    // pole star
    x.fillStyle=sch.acc; star(x,cx,cy,9*sscale,4);
  } else if(comp==='horizon'){
    const hy=H*(0.68+r()*0.12);
    const stars=[];
    for(let i=0;i<nst;i++){
      stars.push({x:r()*W,y:r()*hy*0.97,m:Math.pow(r(),2.6),c:pick(sch.star,r)});
    }
    drawStars(stars);
    constellate(stars.filter(s=>s.y<hy*0.8&&s.x>W*0.15&&s.x<W*0.85),6,11);
    // ground silhouette
    x.fillStyle= sch.day?'#3a3128':'#02060c';
    x.beginPath(); x.moveTo(0,hy);
    for(let t=0;t<=W;t+=60) x.lineTo(t,hy-hash2(t,seed%89)*70);
    x.lineTo(W,H); x.lineTo(0,H); x.closePath(); x.fill();
    // one lit window on the hill
    if(!sch.day&&r()<0.5){
      x.fillStyle='#ffd96b';
      x.fillRect(W*(0.2+r()*0.6),hy+20+r()*40,10,14);
    }
  } else {
    const M=64;
    x.strokeStyle=sch.ink; x.globalAlpha=0.3; x.lineWidth=0.8;
    for(let i=1;i<6;i++){
      const fx=M+(W-2*M)*i/6, bow=(i-3)*26;
      x.beginPath(); x.moveTo(fx,M); x.quadraticCurveTo(fx+bow,H/2,fx,H-M); x.stroke();
    }
    for(let i=1;i<7;i++){
      const fy=M+(H-2*M)*i/7, bow=(i-3.5)*20;
      x.beginPath(); x.moveTo(M,fy); x.quadraticCurveTo(W/2,fy+bow,W-M,fy); x.stroke();
    }
    x.globalAlpha=1;
    const stars=[];
    for(let i=0;i<nst;i++){
      stars.push({x:M+r()*(W-2*M),y:M+r()*(H-2*M),m:Math.pow(r(),2.6),c:pick(sch.star,r)});
    }
    drawStars(stars);
    constellate(stars.filter(s=>s.x>W*0.2&&s.x<W*0.8&&s.y>H*0.18&&s.y<H*0.75),7,12);
    // ecliptic
    if(r()<0.6){
      x.strokeStyle=sch.acc; x.lineWidth=1.6; x.setLineDash([10,7]);
      const ey=H*(0.3+r()*0.3);
      x.beginPath(); x.moveTo(M,ey+60); x.quadraticCurveTo(W/2,ey-110,W-M,ey+40); x.stroke();
      x.setLineDash([]);
    }
    if(r()<0.45){
      const cons=pick(['CORVUS MINOR','LACERTA AUSTRALIS','VESPERTILIO','NOCTUA','MENSA OBSCURA'],r);
      x.textAlign='center'; x.fillStyle=sch.ink;
      x.font='24px Georgia,serif'; x.fillText('TABULA '+pick(['II','VII','IX','XIV'],r)+' · '+cons,W/2,H-44);
    }
    x.strokeStyle=sch.ink; x.lineWidth=2; x.strokeRect(M-22,M-22,W-2*M+44,H-2*M+44);
  }
}

/* NOBODY'S SWIMMING — a hundred backyards */
function castEphemeris(seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1050,H:1050}],r);
  const si=Math.floor(r()*6);
  const comp=pick(['field','field','plani','horizon'],r);
  return {fmt,si,comp};
}

/* ── Stars Nobody Named ─────────────────────────────────────────────────── */
const SKY = ['Midnight', 'Violet', 'Pine', 'Daylight', 'Harbour', 'Plum'];
const STARS_COMP: Record<string, string> = { field: 'Field', plani: 'Planisphere', horizon: 'Horizon' };
export const starsTraits: TraitsFn = (id) => {
  const c = castEphemeris(id);
  return { Sky: SKY[c.si], Composition: STARS_COMP[c.comp] };
};
export const starsSchema: TraitSchema = {
  traits: [
    { name: 'Sky', values: SKY,
      subtraits: [
        { name: 'Night', values: ['Midnight', 'Violet', 'Pine', 'Harbour', 'Plum'] },
        { name: 'Day', values: ['Daylight'] },
      ] },
    { name: 'Composition', values: ['Field', 'Planisphere', 'Horizon'] },
  ],
};
export const renderStars = blit(ephemeris, starsTraits);
export const STARS_ASPECTS = [0.81, 1.24, 1] as const;
