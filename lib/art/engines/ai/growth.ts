// @ts-nocheck
/*
 * Growth — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const DG_PALS=[
  {name:'Abyss', bg:'#05070c', ink:'#00e5c8', acc:'#7df9ff', dark:true},
  {name:'Gilded', bg:'#0e0c08', ink:'#c9962e', acc:'#f6ead0', dark:true},
  {name:'Ember', bg:'#0a0402', ink:'#ff7a3a', acc:'#ffd6ac', dark:true},
  {name:'Bone Black', bg:'#0c0c0e', ink:'#e8e6dd', acc:'#9a8a6a', dark:true},
  {name:'Viridian', bg:'#04100c', ink:'#39ffa0', acc:'#d6ffe8', dark:true},
  {name:'Ink', bg:'#f3efe5', ink:'#1a1713', acc:'#7a2a22'},
  {name:'Sepia', bg:'#efe4d0', ink:'#3a2616', acc:'#8a5a2a'},
];
const DG_FMTS=[{W:1100,H:1100,t:'Square'},{W:940,H:1200,t:'Portrait'},{W:1200,H:940,t:'Landscape'}];
const DG_FORMS=['coral','coral','colony','tendril'];
function growth(cv,seed){
  const r=rng(seed);
  const palI= Math.floor(r()*DG_PALS.length);
  const fmt=pick(DG_FMTS,r);
  const form=pick(DG_FORMS,r);
  // ---- end trait draws ----
  const P=DG_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H; const x=cv.getContext('2d'); const S=Math.min(W,H);
  const cx=W/2, cy=H/2;
  const maxEdge=S*0.0075, minDist=S*0.004, repulR=S*0.019, repR2=repulR*repulR;
  const kAttr=0.11, kAlign=0.13, kRepul=0.62, maxF=S*0.0045;
  const budget= form==='colony'? 1700 : form==='tendril'? 1100 : 1500;
  // seed paths
  const paths=[];
  function ring(rcx,rcy,rad,n){const p=[];for(let i=0;i<n;i++){const a=i/n*6.283;p.push({x:rcx+Math.cos(a)*rad+(r()-0.5)*2,y:rcy+Math.sin(a)*rad+(r()-0.5)*2});}return {nodes:p,closed:true};}
  if(form==='colony'){const nC=rint(r,3,6);for(let i=0;i<nC;i++)paths.push(ring(cx+(r()-0.5)*S*0.4,cy+(r()-0.5)*S*0.4,S*0.04,22));}
  else if(form==='tendril'){const p=[];const n0=18;for(let i=0;i<n0;i++)p.push({x:cx-S*0.2+i*(S*0.4/n0),y:cy+(r()-0.5)*4});paths.push({nodes:p,closed:false});}
  else paths.push(ring(cx,cy,S*0.06,30));
  function count(){let c=0;for(const pa of paths)c+=pa.nodes.length;return c;}
  const cell=repulR;
  for(let step=0;step<560;step++){
    // grid hash
    const grid=new Map();
    for(const pa of paths)for(const nd of pa.nodes){const key=(((nd.x/cell)|0)+2048)*8192+(((nd.y/cell)|0)+2048);let a=grid.get(key);if(!a){a=[];grid.set(key,a);}a.push(nd);}
    for(const pa of paths){const nodes=pa.nodes,L=nodes.length;
      for(let i=0;i<L;i++){const nd=nodes[i];const a=nodes[(i-1+L)%L],b=nodes[(i+1)%L];
        if(!pa.closed&&(i===0||i===L-1)){nd.dx=0;nd.dy=0;continue;}
        let ax=( (a.x+b.x)/2-nd.x)*kAttr, ay=((a.y+b.y)/2-nd.y)*kAttr;
        // alignment: pull toward line a-b (projection)
        const abx=b.x-a.x,aby=b.y-a.y,ab2=abx*abx+aby*aby||1;const t=((nd.x-a.x)*abx+(nd.y-a.y)*aby)/ab2;const projx=a.x+abx*t,projy=a.y+aby*t;ax+=(projx-nd.x)*kAlign;ay+=(projy-nd.y)*kAlign;
        // repulsion
        const gx=(nd.x/cell)|0,gy=(nd.y/cell)|0;let rx=0,ry=0;
        for(let oy=-1;oy<=1;oy++)for(let ox=-1;ox<=1;ox++){const arr=grid.get((gx+ox+2048)*8192+(gy+oy+2048));if(!arr)continue;for(const o of arr){if(o===nd)continue;const ddx=nd.x-o.x,ddy=nd.y-o.y,d2=ddx*ddx+ddy*ddy;if(d2<repR2&&d2>0){const d=Math.sqrt(d2);const f=(1-d/repulR);rx+=ddx/d*f;ry+=ddy/d*f;}}}
        ax+=rx*kRepul*maxF*4; ay+=ry*kRepul*maxF*4;
        const m=Math.hypot(ax,ay);if(m>maxF){ax=ax/m*maxF;ay=ay/m*maxF;}
        nd.dx=ax;nd.dy=ay;}
    }
    for(const pa of paths)for(const nd of pa.nodes){nd.x+=nd.dx;nd.y+=nd.dy;}
    // insertion
    if(step%3===0 && count()<budget){for(const pa of paths){const nodes=pa.nodes;for(let i=nodes.length-1;i>=0;i--){const a=nodes[i],b=nodes[(i+1)%nodes.length];if(!pa.closed&&i===nodes.length-1)continue;const d=Math.hypot(b.x-a.x,b.y-a.y);if(d>maxEdge){nodes.splice(i+1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});}}}}
    if(count()>=budget && step%4===0){/* relax remaining steps */}
  }
  // render
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  // paper grain
  x.save();x.globalAlpha=0.04;x.globalCompositeOperation=P.dark?'screen':'multiply';for(let i=0;i<W*H/1400;i++){x.fillStyle=P.dark?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  x.lineCap='round';x.lineJoin='round';
  x.globalCompositeOperation=P.dark?'lighter':'multiply';
  for(const pa of paths){const nodes=pa.nodes;
    if(P.dark){x.strokeStyle=P.ink;x.shadowColor=P.ink;x.shadowBlur=6;}
    // shadow/halo pass
    x.strokeStyle=P.dark?P.ink:'rgba(0,0,0,0.12)';x.lineWidth=S*(P.dark?0.004:0.006);x.globalAlpha=P.dark?0.5:0.5;
    smooth(nodes,pa.closed);x.stroke();
    // core
    x.shadowBlur=P.dark?5:0;x.strokeStyle=P.ink;x.lineWidth=S*0.0024;x.globalAlpha=P.dark?0.95:0.72;smooth(nodes,pa.closed);x.stroke();
  }
  function smooth(nodes,closed){x.beginPath();const L=nodes.length;if(L<2)return;x.moveTo(nodes[0].x,nodes[0].y);for(let i=1;i<L;i++){const a=nodes[i],b=nodes[(i+1)%L];x.quadraticCurveTo(a.x,a.y,(a.x+b.x)/2,(a.y+b.y)/2);}if(closed)x.closePath();}
  x.shadowBlur=0;x.globalAlpha=1;x.globalCompositeOperation='source-over';
  // rare accent: a few strands in accent colour
  x.globalCompositeOperation=P.dark?'lighter':'multiply';x.strokeStyle=P.acc;x.globalAlpha=0.5;x.lineWidth=S*0.0024;
  if(paths[0]){const nodes=paths[0].nodes;x.beginPath();for(let i=0;i<nodes.length;i+=1){if(i> nodes.length*0.7){const a=nodes[i],b=nodes[(i+1)%nodes.length];if(i===Math.ceil(nodes.length*0.7))x.moveTo(a.x,a.y);else x.lineTo(a.x,a.y);}}x.stroke();}
  x.globalAlpha=1;x.globalCompositeOperation='source-over';
  // vignette
  const vg=x.createRadialGradient(cx,cy,S*0.36,cx,cy,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,P.dark?'rgba(0,0,0,0.5)':'rgba(40,30,20,0.14)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castGrowth(seed){
  const r=rng(seed);
  const palI= Math.floor(r()*DG_PALS.length);
  const fmt=pick(DG_FMTS,r);
  const form=pick(DG_FORMS,r);
  return {palette:DG_PALS[palI].name, format:fmt.t, form:form.charAt(0).toUpperCase()+form.slice(1)};
}

/* PIGMENT — "Pigment" (homage to Erik Swahn): pointillist fields coloured by
   Itten harmonies. Forms drawn as scattered dots, never flat fills. Modes:
   walk (rectilinear regions), axon (axonometric blocks), field (soft bodies). */

/* Growth */
export const growthTraits: TraitsFn = (id) => { const c = castGrowth(id) as any; return { Palette: c.palette, Format: c.format, Form: c.form }; };
export const growthSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Abyss','Gilded','Ember','Bone Black','Viridian','Ink','Sepia'] },
  { name: 'Format', values: ['Square','Portrait','Landscape'] },
  { name: 'Form', values: ['Coral','Colony','Tendril'] },
] };
export const renderGrowth = blit(growth, growthTraits);
export const GROWTH_ASPECTS = [1, 0.78, 1.28] as const;
