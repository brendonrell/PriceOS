// @ts-nocheck
/*
 * Full Faith & Credit — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, hash2, paperNoise, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

function specimen(cv,seed){
  const r=rng(seed);
  // nations cycle by token — and each nation prints in its OWN ink room
  const layout=['classic','vertical','modern','window'][((seed%4)+4)%4];
  const POOLS={
    classic:[ // engravers: bank-note greens, blacks, one red
      {paper:'#f0f2ec',main:'#14401c',acc:'#1c1c1c',serial:'#b3261e'},
      {paper:'#e8f0e4',main:'#0d3a2e',acc:'#8a1028',serial:'#0d3a2e'},
      {paper:'#eef0f4',main:'#1c2c54',acc:'#14401c',serial:'#b3261e'},
    ],
    vertical:[ // letterpress: hot pinks, teals, crimson
      {paper:'#ffc0d8',main:'#580a2e',acc:'#0a3d7a',serial:'#0d5e40'},
      {paper:'#f2b8c8',main:'#2a1040',acc:'#d61a3c',serial:'#0a3d7a'},
      {paper:'#7fd8c8',main:'#10306a',acc:'#d61a3c',serial:'#10306a'},
      {paper:'#ffd2a8',main:'#7a1535',acc:'#1c5a8c',serial:'#7a1535'},
    ],
    modern:[ // swiss: near-white field, ONE vivid accent
      {paper:'#f4f4f2',main:'#1c1c24',acc:'#e0202e',serial:'#1c1c24'},
      {paper:'#f2f2ee',main:'#1c1c24',acc:'#1d2bd6',serial:'#e0202e'},
      {paper:'#eef2f0',main:'#14141c',acc:'#0f8a3c',serial:'#d61a8c'},
      {paper:'#f6f0ea',main:'#14141c',acc:'#ff5500',serial:'#14141c'},
    ],
    window:[ // hatchers: steel-blue and sepia duotones
      {paper:'#d8e4ec',main:'#1c3a5e',acc:'#8a1028',serial:'#8a1028'},
      {paper:'#e4dcd0',main:'#3a2c1c',acc:'#1c5a8c',serial:'#3a2c1c'},
      {paper:'#dce8e0',main:'#0d3a2e',acc:'#c43a20',serial:'#0d3a2e'},
    ],
  };
  const ink=pick(POOLS[layout],r);
  const den=pick([1,2,5,10,20,50,100,500,1000],r);
  const BANKS=['BANCO DE LA NIEBLA','RESERVE OF THE INTERIOR','FIRST MERIDIAN TRUST','BANK OF THE SOUTH REACH','NATIONAL LYRIC RESERVE','TREASURY OF THE LESSER MOONS','CAISSE DE PROVIDENCIA','STERLING AUTHORITY OF VESPER'];
  const bank=BANKS[((seed*3+1)%BANKS.length+BANKS.length)%BANKS.length];
  const unit=pick(['FLORINS','MARKS','CROWNS','THALERS','LUMENS','GUILDERS','PESOS DEL SUR'],r);
  const ser=String.fromCharCode(65+rint(r,0,25))+' '+String(rint(r,1000000,9999999))+' '+String.fromCharCode(65+rint(r,0,25));
  let W,H;
  if(layout==='vertical'){W=560;H=1240;}
  else if(layout==='modern'){W=1240;H=560;}
  else if(layout==='window'){W=1300;H=520;}
  else {W=pick([1240,1130],r);H= W===1240?560:640;}
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  x.fillStyle=ink.paper; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H,'60,40,20',800);

  if(layout==='classic'){
    /* NATION OF ENGRAVERS — the only one allowed squiggles */
    function rosette(cx,cy,R,col,layers){
      x.strokeStyle=col; x.lineWidth=1.25;
      for(let l=0;l<layers;l++){
        const k1=rint(r,5,12), k2=rint(r,2,6), p1=r()*6.28, p2=r()*6.28;
        const a=0.55+r()*0.15, b=0.18+r()*0.18, c=0.08+r()*0.12;
        x.beginPath();
        for(let t=0;t<=628;t++){
          const th=t/100;
          const rr=R*(a+b*Math.sin(k1*th+p1)+c*Math.sin(k2*th+p2));
          if(t===0)x.moveTo(cx+rr*Math.cos(th),cy+rr*Math.sin(th));
          else x.lineTo(cx+rr*Math.cos(th),cy+rr*Math.sin(th));
        }
        x.stroke();
      }
    }
    function lathe(x0,y0,x1,y1,vert,col){
      x.strokeStyle=col; x.lineWidth=1.1;
      const len=vert?(y1-y0):(x1-x0), mid=vert?(x0+x1)/2:(y0+y1)/2, amp=(vert?(x1-x0):(y1-y0))/2-2;
      for(let k=0;k<8;k++){
        for(const dir of [1,-1]){
          x.beginPath();
          for(let s=0;s<=len;s+=3){
            const v=mid+dir*amp*Math.sin(s*0.055+k*0.8);
            if(s===0)x.moveTo(vert?v:(x0+s),vert?(y0+s):v);
            else x.lineTo(vert?v:(x0+s),vert?(y0+s):v);
          }
          x.stroke();
        }
      }
    }
    x.fillStyle=ink.acc; x.globalAlpha=0.16;
    x.beginPath(); x.arc(W/2,H/2,H*0.42,0,6.29); x.fill(); x.globalAlpha=1;
    lathe(56,16,W-56,48,false,ink.main);
    lathe(56,H-48,W-56,H-16,false,ink.main);
    lathe(16,16,48,H-16,true,ink.acc);
    lathe(W-48,16,W-16,H-16,true,ink.acc);
    rosette(W/2,H/2,H*0.28,ink.main,6);
    rosette(W/2,H/2,H*0.175,ink.acc,4);
    rosette(190,H/2,H*0.17,ink.acc,5);
    rosette(W-190,H/2,H*0.17,ink.main,5);
    x.textAlign='center'; x.textBaseline='middle';
    x.font='bold '+Math.round(H*0.19)+'px Georgia,serif';
    x.fillStyle=ink.acc; x.fillText(den,194,H/2+8);
    x.fillStyle=ink.main; x.fillText(den,190,H/2+4);
    x.fillStyle=ink.main; x.fillText(den,W-194,H/2+8);
    x.fillStyle=ink.acc; x.fillText(den,W-190,H/2+4);
    [[86,76],[W-86,76],[86,H-76],[W-86,H-76]].forEach((p,i)=>{
      x.fillStyle= i%2?ink.main:ink.acc;
      x.fillRect(p[0]-52,p[1]-36,104,72);
      x.fillStyle=ink.paper;
      x.font='bold 46px Georgia,serif';
      x.fillText(den,p[0],p[1]+2);
    });
    x.font='26px Georgia,serif'; x.fillStyle=ink.main;
    x.fillText(bank,W/2,86);
    x.font='italic 20px Georgia,serif';
    x.fillText(den+' '+unit,W/2,H-86);
    x.font='bold 22px "Courier New",monospace'; x.fillStyle=ink.serial;
    x.textAlign='left'; x.fillText(ser,72,128);
    x.textAlign='right'; x.fillText(ser,W-72,H-126);
    x.strokeStyle=ink.main; x.lineWidth=2.4; x.strokeRect(9,9,W-18,H-18);
    x.lineWidth=0.9; x.strokeRect(14,14,W-28,H-28);
  }

  if(layout==='vertical'){
    /* NATION OF LETTERPRESS — flat deco shapes, stamped borders, zero curves */
    // pinstripe ground
    x.strokeStyle=ink.main; x.globalAlpha=0.14; x.lineWidth=1.5;
    for(let yy=0;yy<H;yy+=9){x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy);x.stroke();}
    x.globalAlpha=1;
    // tooth bands top + bottom
    function teeth(y0,dir,col){
      x.fillStyle=col;
      for(let t=0;t<W;t+=40){
        x.beginPath();
        x.moveTo(t,y0); x.lineTo(t+20,y0+26*dir); x.lineTo(t+40,y0); x.closePath(); x.fill();
      }
    }
    x.fillStyle=ink.main; x.fillRect(0,0,W,96);
    x.fillStyle=ink.acc; x.fillRect(0,96,W,14);
    teeth(110,1,ink.main);
    x.fillStyle=ink.main; x.fillRect(0,H-96,W,96);
    x.fillStyle=ink.acc; x.fillRect(0,H-110,W,14);
    teeth(H-110,-1,ink.main);
    // diamond chains on the sides
    x.fillStyle=ink.acc;
    for(let yy=170;yy<H-150;yy+=54){
      for(const sx2 of [40,W-40]){
        x.beginPath();
        x.moveTo(sx2,yy-18); x.lineTo(sx2+14,yy); x.lineTo(sx2,yy+18); x.lineTo(sx2-14,yy); x.closePath(); x.fill();
      }
    }
    // deco sunburst medallion: flat wedges
    const mcx=W/2, mcy=H*0.46;
    for(let i=0;i<24;i++){
      x.fillStyle= i%2? ink.acc : ink.main;
      const a0=i/24*6.283, a1=(i+0.72)/24*6.283;
      x.beginPath(); x.moveTo(mcx,mcy);
      x.arc(mcx,mcy,200,a0,a1); x.closePath(); x.fill();
    }
    // stepped diamond frame around the burst
    x.strokeStyle=ink.main; x.lineWidth=8;
    x.beginPath();
    x.moveTo(mcx,mcy-252); x.lineTo(mcx+212,mcy); x.lineTo(mcx,mcy+252); x.lineTo(mcx-212,mcy); x.closePath(); x.stroke();
    x.lineWidth=3;
    x.beginPath();
    x.moveTo(mcx,mcy-276); x.lineTo(mcx+232,mcy); x.lineTo(mcx,mcy+276); x.lineTo(mcx-232,mcy); x.closePath(); x.stroke();
    // numeral plate
    x.fillStyle=ink.paper;
    x.beginPath(); x.arc(mcx,mcy,108,0,6.29); x.fill();
    x.strokeStyle=ink.main; x.lineWidth=6;
    x.beginPath(); x.arc(mcx,mcy,108,0,6.29); x.stroke();
    x.fillStyle=ink.main; x.textAlign='center'; x.textBaseline='middle';
    x.font='bold 110px Helvetica,Arial,sans-serif';
    x.fillText(den,mcx,mcy+6);
    // chevron stack under medallion
    x.fillStyle=ink.main;
    for(let i=0;i<3;i++){
      const yy=mcy+300+i*46;
      x.beginPath();
      x.moveTo(W/2-130,yy); x.lineTo(W/2,yy+26); x.lineTo(W/2+130,yy); x.lineTo(W/2+130,yy+16); x.lineTo(W/2,yy+42); x.lineTo(W/2-130,yy+16); x.closePath(); x.fill();
    }
    // head + foot type
    x.fillStyle=ink.paper; x.textBaseline='middle';
    x.font='bold 30px Helvetica,Arial,sans-serif';
    x.fillText(bank.split(' ').slice(0,3).join(' '),W/2,48);
    x.font='22px Helvetica,Arial,sans-serif';
    x.fillText(den+' '+unit,W/2,H-48);
    x.save(); x.translate(W-78,H*0.5); x.rotate(-Math.PI/2);
    x.font='bold 20px "Courier New",monospace'; x.fillStyle=ink.serial; x.textAlign='center';
    x.fillText(ser,0,0); x.restore();
    x.strokeStyle=ink.main; x.lineWidth=3; x.strokeRect(8,8,W-16,H-16);
  }

  if(layout==='modern'){
    /* NATION OF GRIDS — Swiss flat, one colossal numeral, no ornament at all */
    x.fillStyle=ink.main; x.globalAlpha=0.07; x.fillRect(0,0,W,H); x.globalAlpha=1;
    x.fillStyle=ink.acc;
    x.textAlign='right'; x.textBaseline='middle';
    x.font='bold '+Math.round(H*1.05)+'px Helvetica,Arial,sans-serif';
    x.fillText(den,W+30,H*0.56);
    x.fillStyle=ink.main;
    for(let yy=46;yy<H-30;yy+=26){
      for(let xx=60;xx<240;xx+=26){
        const rr2=2+4*hash2(xx,yy+seed%31);
        x.beginPath(); x.arc(xx,yy,rr2,0,6.29); x.fill();
      }
    }
    x.fillRect(264,40,3,H-80); // one rule
    x.fillStyle=ink.acc; x.fillRect(254,40,24,24); // one accent square
    x.textAlign='left'; x.textBaseline='alphabetic';
    x.font='bold 30px Helvetica,Arial,sans-serif'; x.fillStyle=ink.main;
    x.fillText(bank,290,80);
    x.font='20px Helvetica,Arial,sans-serif';
    x.fillText(den+' '+unit,290,116);
    x.font='bold 20px "Courier New",monospace'; x.fillStyle=ink.serial;
    x.fillText(ser,290,H-52);
  }

  if(layout==='window'){
    /* NATION OF HATCHERS — line-shaded engraving, no rosettes, no sines */
    x.fillStyle=ink.main; x.fillRect(0,0,W,34); x.fillRect(0,H-34,W,34);
    // coin-dot row inside the bands
    x.fillStyle=ink.paper;
    for(let t=30;t<W-10;t+=36){
      x.beginPath(); x.arc(t,17,6,0,6.29); x.fill();
      x.beginPath(); x.arc(t,H-17,6,0,6.29); x.fill();
    }
    x.fillStyle=ink.acc; x.fillRect(0,38,W,10); x.fillRect(0,H-48,W,10);
    const wx=W*0.30, wy=H/2;
    // concentric ellipse window
    x.strokeStyle=ink.main;
    for(let i=0;i<14;i++){
      x.lineWidth=0.9; x.globalAlpha= i%4===0?0.9:0.5;
      x.beginPath();
      x.ellipse(wx,wy,W*0.205-i*9,H*0.37-i*7,0,0,6.29);
      x.stroke();
    }
    x.globalAlpha=1;
    // hatched mountain vignette inside the window
    x.save();
    x.beginPath(); x.ellipse(wx,wy,W*0.205-14*9+110,H*0.37-14*7+86,0,0,6.29); x.clip();
    function hatch(angle,gap,alpha){
      x.strokeStyle=ink.main; x.lineWidth=1.1; x.globalAlpha=alpha;
      const dxx=Math.cos(angle), dyy=Math.sin(angle);
      for(let o=-W;o<W;o+=gap){
        x.beginPath();
        x.moveTo(wx-dyy*o-dxx*400,wy+dxx*o-dyy*400);
        x.lineTo(wx-dyy*o+dxx*400,wy+dxx*o+dyy*400);
        x.stroke();
      }
      x.globalAlpha=1;
    }
    // sky hatch
    hatch(0.0,9,0.35);
    // mountain silhouette: denser cross-hatch
    x.beginPath();
    x.moveTo(wx-180,wy+90);
    x.lineTo(wx-70,wy-70); x.lineTo(wx-10,wy+6); x.lineTo(wx+52,wy-96); x.lineTo(wx+180,wy+90);
    x.closePath();
    x.save(); x.clip();
    hatch(0.6,5,0.85); hatch(-0.7,9,0.6);
    x.restore();
    // sun disc, knocked clean
    x.fillStyle=ink.paper;
    x.beginPath(); x.arc(wx+95,wy-95,34,0,6.29); x.fill();
    x.strokeStyle=ink.acc; x.lineWidth=3;
    x.beginPath(); x.arc(wx+95,wy-95,34,0,6.29); x.stroke();
    x.restore();
    // right panel: vertical hairlines + numeral
    x.strokeStyle=ink.acc; x.lineWidth=1.2; x.globalAlpha=0.5;
    for(let xx=W*0.62;xx<W-46;xx+=8){
      x.beginPath(); x.moveTo(xx,70); x.lineTo(xx,H-70); x.stroke();
    }
    x.globalAlpha=1;
    x.fillStyle=ink.paper; x.fillRect(W*0.66,H*0.24,W*0.27,H*0.5);
    x.strokeStyle=ink.main; x.lineWidth=2; x.strokeRect(W*0.66,H*0.24,W*0.27,H*0.5);
    x.textAlign='center'; x.textBaseline='middle'; x.fillStyle=ink.main;
    x.font='bold '+Math.round(H*0.34)+'px Georgia,serif';
    x.fillText(den,W*0.795,H*0.49);
    x.textBaseline='alphabetic';
    x.font='22px Georgia,serif';
    x.fillText(bank,W*0.795,H*0.16);
    x.font='italic 18px Georgia,serif'; x.fillStyle=ink.acc;
    x.fillText(unit,W*0.795,H*0.84);
    x.font='bold 21px "Courier New",monospace'; x.fillStyle=ink.serial;
    x.textAlign='left'; x.fillText(ser,56,H-64);
  }
}

/* HARD WATER — stacked horizons; faults, echo pinstripes, both orientations */
// Trait casts — replicate each engine's LEADING rng draws exactly (including
// deterministic burns), so traitsOf() agrees with render() without painting.
// Verified by harness: cast pick/rint sequence must prefix-match the engine's.
// Each cast returns raw picked params; label mapping happens at the registry.

function castSpecimen(seed){
  const r=rng(seed);
  const layout=['classic','vertical','modern','window'][((seed%4)+4)%4];
  r(); // ink pick
  const den=pick([1,2,5,10,20,50,100,500,1000],r);
  const BANKS=['BANCO DE LA NIEBLA','RESERVE OF THE INTERIOR','FIRST MERIDIAN TRUST','BANK OF THE SOUTH REACH','NATIONAL LYRIC RESERVE','TREASURY OF THE LESSER MOONS','CAISSE DE PROVIDENCIA','STERLING AUTHORITY OF VESPER'];
  const bank=BANKS[((seed*3+1)%BANKS.length+BANKS.length)%BANKS.length];
  return {layout,den,bank};
}

/* ── Full Faith & Credit ────────────────────────────────────────────────── */
const NATION: Record<string, string> = {
  classic: 'Engravers', vertical: 'Letterpress', modern: 'Grids', window: 'Hatchers',
};
const BANKS = ['BANCO DE LA NIEBLA', 'RESERVE OF THE INTERIOR', 'FIRST MERIDIAN TRUST', 'BANK OF THE SOUTH REACH', 'NATIONAL LYRIC RESERVE', 'TREASURY OF THE LESSER MOONS', 'CAISSE DE PROVIDENCIA', 'STERLING AUTHORITY OF VESPER'];
export const faithTraits: TraitsFn = (id) => {
  const c = castSpecimen(id);
  return { Nation: NATION[c.layout], Denomination: String(c.den), Issuer: c.bank };
};
export const faithSchema: TraitSchema = {
  traits: [
    { name: 'Nation', values: ['Engravers', 'Letterpress', 'Grids', 'Hatchers'] },
    { name: 'Denomination', values: ['1', '2', '5', '10', '20', '50', '100', '500', '1000'],
      subtraits: [
        { name: 'Pocket', values: ['1', '2', '5', '10'] },
        { name: 'Vault', values: ['20', '50', '100', '500', '1000'] },
      ] },
    { name: 'Issuer', values: BANKS },
  ],
};
export const renderFaith = blit(specimen, faithTraits);
export const FAITH_ASPECTS = [2.21, 0.45, 2.21, 2.5, 1.77] as const;
