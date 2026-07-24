// @ts-nocheck
/*
 * Breach Protocol — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const CP_PALS=[
  {name:'Hazard', bg:'#0b0b07', p:'#fcee0a', s:'#00f0ff', d:'#ff003c', lt:'#efeee0'},
  {name:'Militech', bg:'#06090a', p:'#00ff9f', s:'#ff2a6d', d:'#ffd000', lt:'#d6e0e0'},
  {name:'Arasaka', bg:'#0c0507', p:'#ff003c', s:'#ff7b00', d:'#00e5ff', lt:'#ececec'},
  {name:'NetWatch', bg:'#02060c', p:'#00d4ff', s:'#3a86ff', d:'#ff006e', lt:'#dff1ff'},
  {name:'Trauma', bg:'#0a0a0a', p:'#ff3838', s:'#ffd000', d:'#00ff9f', lt:'#ffffff'},
  {name:'Voodoo', bg:'#08000c', p:'#b300ff', s:'#00ffc8', d:'#ff00aa', lt:'#f0e6ff'},
  {name:'Toxic', bg:'#04100a', p:'#39ff14', s:'#ccff00', d:'#ff003c', lt:'#e8ffe8'},
  {name:'Kang Tao', bg:'#0a0800', p:'#ffb800', s:'#ff3d00', d:'#00b3ff', lt:'#fff3d6'},
];
const CP_FMTS=[{W:1080,H:1080,t:'Square'},{W:920,H:1280,t:'Portrait'},{W:1280,H:920,t:'Landscape'},{W:760,H:1300,t:'Tall'},{W:1500,H:760,t:'Wide'}];
const CP_LAYOUTS=['reticle','dashboard','breach','signage'];
const CP_KANJI=['電脳','街','危険','接続','侵入','起動','警告','東京','夜','力','記憶','武器','零','神話','鬼','再起動','監視','銃'];
const CP_LAT=['BREACH','ACCESS','DENIED','TRACE','ONLINE','UPLINK','DAEMON','ICE','SUBNET','ROOT','//RUN','NETWATCH','FLATLINE','OVERCLOCK','WARNING','REC','LVL','BUFFER','SEQUENCE','INTRUSION','CYBERDECK','RAM','SCANNING'];
const CP_KATA=['システム','アクセス','キケン','トウキョウ','セツゾク','ネット','サイバー','デンノウ','シンニュウ','キドウ','ケイコク','ブキ','レイ','キオク','メモリ','データ','エラー','ジャック','コード','ロック','ハッキング','ファイア','ウォール','スキャン','ニンゲン','カイロ','デンシ','ムジン','カンシ','ホウカイ'];
function breach(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*CP_PALS.length);
  const fmtI=Math.floor(r()*CP_FMTS.length);
  const layout=pick(CP_LAYOUTS,r);
  const dens=rint(r,1,3);
  // ---- end trait draws ----
  const P=CP_PALS[palI], F=CP_FMTS[fmtI]; const W=F.W,H=F.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const MONO='"Courier New","Noto Sans JP","WenQuanYi Zen Hei",monospace', TECH='"Arial Narrow","Liberation Sans Narrow",Impact,"Noto Sans JP","WenQuanYi Zen Hei",sans-serif';
  const hex=()=>'0123456789ABCDEF'[Math.floor(r()*16)]+'0123456789ABCDEF'[Math.floor(r()*16)];
  const KA=()=>pick(CP_KANJI,r), LA=()=>pick(CP_LAT,r), KT=()=>pick(CP_KATA,r);
  // scatter a ton of tiny Asian-script + data labels as ambient chrome
  function sprinkle(nn){for(let i=0;i<nn;i++){x.globalAlpha=0.18+r()*0.5;x.fillStyle=r()<0.6?P.s:(r()<0.5?P.p:P.lt);x.font=(8+(r()*9|0))+'px '+MONO;x.textAlign='left';const k=r();const s= k<0.4?KT(): k<0.6?KA()+KA(): k<0.8?(hex()+hex()+hex()): LA();x.fillText(s,r()*W,r()*H);}x.globalAlpha=1;}
  // vertical katakana data columns down an edge
  function kataColumn(ex){let yy=70+r()*30;x.textAlign='center';while(yy<H-50){x.globalAlpha=0.3+r()*0.5;x.fillStyle=r()<0.5?P.s:P.p;x.font='15px '+MONO;const w=KT();for(let c=0;c<w.length&&yy<H-50;c++){x.fillText(w[c],ex,yy);yy+=17;}yy+=10;}x.globalAlpha=1;}
  function bgfill(){x.fillStyle=P.bg;x.fillRect(0,0,W,H);
    // grime gradient
    const gg=x.createRadialGradient(W*0.5,H*0.4,0,W*0.5,H*0.5,Math.max(W,H)*0.8);gg.addColorStop(0,P.p+'10');gg.addColorStop(1,'transparent');x.fillStyle=gg;x.fillRect(0,0,W,H);
    // dark noise blocks (grime)
    for(let i=0;i<60;i++){x.globalAlpha=0.04+r()*0.06;x.fillStyle=r()<0.5?'#000':P.p;x.fillRect(r()*W,r()*H,r()*120,r()*4);}x.globalAlpha=1;}
  function ctext(t,X,Y,f,al,main){x.font=f;x.textAlign=al||'left';x.textBaseline='alphabetic';
    x.globalAlpha=0.55;x.fillStyle=P.d;x.fillText(t,X-2.5,Y+1);x.fillStyle=P.s;x.fillText(t,X+2.5,Y-1);x.globalAlpha=1;x.fillStyle=main||P.lt;x.fillText(t,X,Y);}
  function bracket(bx,by,bw,bh,c,len){x.strokeStyle=c;x.lineWidth=2.5;len=len||22;
    [[bx,by,1,1],[bx+bw,by,-1,1],[bx,by+bh,1,-1],[bx+bw,by+bh,-1,-1]].forEach(k=>{x.beginPath();x.moveTo(k[0],k[1]+k[3]*len);x.lineTo(k[0],k[1]);x.lineTo(k[0]+k[2]*len,k[1]);x.stroke();});}
  function hazard(hx,hy,hw,hh,c){x.save();x.beginPath();x.rect(hx,hy,hw,hh);x.clip();x.strokeStyle=c;x.lineWidth=7;for(let i=-hh;i<hw;i+=18){x.beginPath();x.moveTo(hx+i,hy+hh);x.lineTo(hx+i+hh,hy);x.stroke();}x.restore();}
  bgfill();

  if(layout==='reticle'){
    const cx=W*0.5,cy=H*0.46,R=Math.min(W,H)*0.3;
    // ambient grid of tiny ticks behind everything
    x.strokeStyle=P.s+'22';x.lineWidth=1;for(let gx=40;gx<W;gx+=46){x.beginPath();x.moveTo(gx,40);x.lineTo(gx,H-40);x.stroke();}for(let gy=40;gy<H;gy+=46){x.beginPath();x.moveTo(40,gy);x.lineTo(W-40,gy);x.stroke();}
    // dense scatter of scripts everywhere
    sprinkle(Math.round(W*H/9000));
    // hex stream columns down both edges
    kataColumn(W*0.05); kataColumn(W*0.95);
    for(const ex of [W*0.11,W*0.89]){let yy=90;x.textAlign=ex<cx?'left':'right';while(yy<H-60){x.globalAlpha=0.3+r()*0.4;x.fillStyle=P.lt;x.font='12px '+MONO;let row='';for(let k=0;k<3;k++)row+=hex();x.fillText(row,ex,yy);yy+=20;}x.globalAlpha=1;}
    // multiple tick rings (broken, varying)
    [R+18,R*0.78,R*0.55].forEach((RR,ri)=>{x.strokeStyle=ri%2?P.s:P.p;for(let a=0;a<6.29;a+=0.105){if(r()<0.18)continue;x.globalAlpha=0.35+r()*0.6;x.lineWidth=a%0.42<0.11?3:1.3;const r1=RR,r2=RR+(a%0.42<0.11?14:8);x.beginPath();x.moveTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);x.lineTo(cx+Math.cos(a)*r2,cy+Math.sin(a)*r2);x.stroke();}});x.globalAlpha=1;
    // numeric ring labels
    x.fillStyle=P.s;x.font='11px '+MONO;x.textAlign='center';for(let a=0;a<6.29;a+=0.52){x.globalAlpha=0.6;x.save();x.translate(cx+Math.cos(a)*(R+34),cy+Math.sin(a)*(R+34));x.rotate(a+1.57);x.fillText((r()*360|0)+'°',0,0);x.restore();}x.globalAlpha=1;
    // scan sweep
    const sa=r()*6.29;x.strokeStyle=P.s;x.globalAlpha=0.45;x.lineWidth=R;x.save();x.beginPath();x.arc(cx,cy,R*0.5,sa,sa+0.5);x.stroke();x.restore();x.globalAlpha=1;
    // concentric broken circles
    [R*0.62,R*0.4,R*0.24].forEach((rr2,i)=>{x.strokeStyle=i%2?P.s:P.lt;x.lineWidth=1.4;x.setLineDash(i===1?[6,5]:[]);x.beginPath();x.arc(cx,cy,rr2,0.3+r(),5.5);x.stroke();x.setLineDash([]);});
    // crosshatch reticle core
    bracket(cx-46,cy-46,92,92,P.p,18);
    x.strokeStyle=P.lt;x.lineWidth=1.4;[[-1,0],[1,0],[0,-1],[0,1]].forEach(d=>{x.beginPath();x.moveTo(cx+d[0]*16,cy+d[1]*16);x.lineTo(cx+d[0]*78,cy+d[1]*78);x.stroke();});
    x.fillStyle=P.d;for(let i=0;i<4;i++){const a=i*1.5708+0.785;x.fillRect(cx+Math.cos(a)*30-3,cy+Math.sin(a)*30-3,6,6);}
    // many corner labels w/ leaders (kanji + katakana + hex)
    for(let i=0;i<14;i++){const a=r()*6.29,rr=R+24+r()*40,px=cx+Math.cos(a)*rr,py=cy+Math.sin(a)*rr;const ox=px+(px<cx?-1:1)*(40+r()*40);x.strokeStyle=P.s;x.lineWidth=1;x.globalAlpha=0.6;x.beginPath();x.moveTo(px,py);x.lineTo(ox,py);x.stroke();x.fillStyle=P.s;x.beginPath();x.arc(px,py,2.2,0,6.29);x.fill();x.globalAlpha=1;x.fillStyle=r()<0.5?P.s:P.lt;x.font='12px '+MONO;x.textAlign=px<cx?'right':'left';x.fillText((r()<0.4?KT():r()<0.7?KA()+KA():LA())+' '+hex(),ox+(px<cx?-4:4),py+4);}
    // big glitched readout
    ctext(rint(r,10,99)+'%',cx,cy+R+96,'bold '+Math.round(R*0.5)+'px '+TECH,'center',P.p);
    ctext(KT()+' // '+LA(),cx,cy+R+132,'18px '+MONO,'center',P.lt);
    hazard(40,H-70,W-80,22,P.p);
    ctext(KA()+KA()+KT()+' / '+LA(),W/2,66,'bold 30px '+TECH,'center',P.lt);
  } else if(layout==='dashboard'){
    const pad=34;
    // top bar
    x.fillStyle=P.p;x.fillRect(pad,pad,W-pad*2,4);
    ctext(LA()+' '+KA(),pad,pad+44,'bold 34px '+TECH,'left',P.lt);
    x.fillStyle=P.s;x.font='15px '+MONO;x.textAlign='right';x.fillText('['+String(rint(r,0,23)).padStart(2,'0')+':'+String(rint(r,0,59)).padStart(2,'0')+':'+String(rint(r,0,59)).padStart(2,'0')+']',W-pad,pad+30);
    for(let i=0;i<6;i++){x.fillStyle=i<rint(r,2,6)?P.p:P.p+'33';x.fillRect(W-pad-20-i*16,pad+38,11,16);}
    // left meters
    const lx=pad,ly=pad+90,lw=W*0.26;
    for(let i=0;i<7;i++){const y=ly+i*40;x.strokeStyle=P.s+'66';x.strokeRect(lx,y,lw,22);const v=r();x.fillStyle=v>0.85?P.d:P.p;x.fillRect(lx+2,y+2,(lw-4)*v,18);x.fillStyle=P.lt;x.font='12px '+MONO;x.textAlign='left';x.fillText(LA().slice(0,7),lx,y-4);}
    // right hex dump
    const hx0=W-pad-W*0.3,hw=W*0.3;x.fillStyle=P.bg;x.fillStyle=P.s;x.font='15px '+MONO;x.textAlign='left';
    for(let i=0;i<14;i++){let row='';for(let k=0;k<6;k++)row+=hex()+' ';x.globalAlpha=r()<0.15?1:0.6;x.fillStyle=r()<0.1?P.p:P.s;x.fillText('0x'+hex()+hex()+'  '+row,hx0,ly+18+i*26);}x.globalAlpha=1;
    // center big
    ctext(LA(),W/2,H*0.6,'bold '+Math.round(W*0.07)+'px '+TECH,'center',P.p);
    // progress
    const pv=r(),pby=H-pad-70;x.strokeStyle=P.lt;x.lineWidth=2;x.strokeRect(pad,pby,W-pad*2,30);x.fillStyle=P.p;x.fillRect(pad+3,pby+3,(W-pad*2-6)*pv,24);x.fillStyle=P.bg;x.font='bold 16px '+MONO;x.textAlign='center';x.fillText('BREACHING '+Math.round(pv*100)+'%',W/2,pby+21);
    hazard(pad,H-pad-26,W-pad*2,20,P.d);
  } else if(layout==='breach'){
    ctext('BREACH PROTOCOL',W/2,70,'bold 34px '+TECH,'center',P.lt);
    const cols=7,rows=7,gs=Math.min((W-120)/cols,(H-260)/rows),gx0=(W-cols*gs)/2,gy0=130;
    // buffer
    for(let i=0;i<6;i++){x.strokeStyle=P.p;x.lineWidth=1.5;x.strokeRect(gx0+i*(gs*0.6),96,gs*0.5,gs*0.5*0.6);}
    const path={}; let pr=rint(r,0,rows-1),pc=rint(r,0,cols-1);for(let i=0;i<6;i++){path[pr+','+pc]=1;if(i%2)pc=rint(r,0,cols-1);else pr=rint(r,0,rows-1);}
    for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){const X=gx0+gx*gs,Y=gy0+gy*gs;const on=path[gy+','+gx];x.fillStyle=on?P.p:'transparent';if(on){x.globalAlpha=0.18;x.fillRect(X+2,Y+2,gs-6,gs-6);x.globalAlpha=1;}x.strokeStyle=on?P.p:P.s+'40';x.lineWidth=on?2:1;x.strokeRect(X+2,Y+2,gs-6,gs-6);x.fillStyle=on?P.p:P.s+'99';x.font=(on?'bold ':'')+Math.round(gs*0.34)+'px '+MONO;x.textAlign='center';x.fillText(hex(),X+gs/2,Y+gs*0.62);}
    // sequence list
    const sx2=gx0,sy2=gy0+rows*gs+30;x.textAlign='left';
    for(let i=0;i<3;i++){x.fillStyle=P.lt;x.font='14px '+MONO;let s='';for(let k=0;k<rint(r,2,4);k++)s+=hex()+' ';x.fillText('SEQ_'+i+'  '+s,sx2,sy2+i*26);x.fillStyle=P.s;x.fillText(pick(['DATAMINE_V'+rint(r,1,3),'ICEPICK','MASS VULN','CAMERA SHUTDOWN'],r),sx2+W*0.42,sy2+i*26);}
    // timer
    const tv=r();x.fillStyle=P.d;x.fillRect(gx0,gy0-22,cols*gs*tv,6);x.fillStyle=P.lt;x.font='13px '+MONO;x.textAlign='right';x.fillText('TIME REMAINING '+(tv*60|0)+'s',gx0+cols*gs,gy0-28);
  } else { // signage
    const nb=3+dens; let bx=W*0.08;
    for(let i=0;i<nb;i++){const bw=W*(0.13+r()*0.12),bh=H*(0.4+r()*0.45),by=H*(0.06+r()*0.12);const dim=r()<0.3;
      x.save();x.globalAlpha=dim?0.35:1;
      // board
      x.fillStyle='#0d0d10';x.strokeStyle=i%2?P.s:P.p;x.lineWidth=3;x.fillRect(bx,by,bw,bh);x.strokeRect(bx,by,bw,bh);
      x.shadowColor=i%2?P.s:P.p;x.shadowBlur=22;x.strokeRect(bx,by,bw,bh);x.shadowBlur=0;
      // vertical kanji
      x.fillStyle=i%2?P.s:P.p;x.font='bold '+Math.round(bw*0.5)+'px '+TECH;x.textAlign='center';
      const word=KA()+KA()+KA();for(let c=0;c<word.length;c++)x.fillText(word[c],bx+bw/2,by+bw*0.5+c*bw*0.52);
      // latin footer
      x.fillStyle=P.lt;x.font='bold 15px '+MONO;x.save();x.translate(bx+bw*0.5,by+bh-16);x.fillText(LA(),0,0);x.restore();
      // hanging mount
      x.strokeStyle=P.lt;x.lineWidth=2;x.beginPath();x.moveTo(bx+bw/2,by);x.lineTo(bx+bw/2,by-22);x.stroke();
      x.restore();
      bx+=bw+W*(0.02+r()*0.06); if(bx>W*0.82)break;
    }
    // floating latin tickers
    for(let i=0;i<5;i++){x.globalAlpha=0.5;ctext(LA()+' '+hex()+hex(),W*r(),H*(0.85+r()*0.12),'16px '+MONO,'left',P.lt);x.globalAlpha=1;}
  }
  if(layout!=='reticle') sprinkle(Math.round(W*H/16000));
  // ---- glitch slices (RGB tear) ----
  for(let i=0;i<rint(r,5,11);i++){const sy=r()*H,sh=3+r()*24,dx=(r()-0.5)*46;x.drawImage(cv,0,sy,W,sh,dx,sy,W,sh);
    if(r()<0.6){x.save();x.globalCompositeOperation='lighter';x.globalAlpha=0.35;x.drawImage(cv,0,sy,W,sh,dx+7,sy,W,sh);x.restore();}}
  // ---- scanlines, grain, vignette ----
  x.save();x.globalAlpha=0.08;x.fillStyle='#000';for(let yy=0;yy<H;yy+=3)x.fillRect(0,yy,W,1.5);x.restore();
  x.save();x.globalAlpha=0.05;for(let i=0;i<W*H/600;i++){x.fillStyle=r()<0.5?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*0.28,W/2,H/2,Math.max(W,H)*0.72);vg.addColorStop(0,'transparent');vg.addColorStop(1,'rgba(0,0,0,0.6)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castBreach(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*CP_PALS.length);
  const fmtI=Math.floor(r()*CP_FMTS.length);
  const layout=pick(CP_LAYOUTS,r);
  const dens=rint(r,1,3);
  return {palette:CP_PALS[palI].name, format:CP_FMTS[fmtI].t, layout, density: dens===1?'Low':dens===2?'Mid':'High'};
}

/* GRAFFITI — "Graffiti Soul": cel-shaded street graffiti, Jet Set Radio energy.
   Primitives (bubble blob, block arrow, splat, drip, 4-pt star) stamped with
   thick outlines, hard drop-shadow, cel highlight + spray haze on a textured
   wall. Visual-led, no readable type. Variety = palette × format × mode
   (piece/bombing/arrows/splash/character) × randomness. */

/* Breach Protocol */
export const breachTraits: TraitsFn = (id) => { const c = castBreach(id) as any; return { Palette: c.palette, Format: c.format, Layout: cap(c.layout), Density: c.density }; };
export const breachSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Hazard','Militech','Arasaka','NetWatch','Trauma','Voodoo','Toxic','Kang Tao'],
    subtraits: [
      { name: 'Corp', values: ['Militech', 'Arasaka', 'NetWatch', 'Trauma', 'Kang Tao'] },
      { name: 'Street', values: ['Hazard', 'Voodoo', 'Toxic'] },
    ] },
  { name: 'Format', values: ['Square','Portrait','Landscape','Tall','Wide'],
    subtraits: [
      { name: 'Upright', values: ['Square', 'Portrait', 'Tall'] },
      { name: 'Broad', values: ['Landscape', 'Wide'] },
    ] },
  { name: 'Layout', values: ['Reticle','Dashboard','Breach','Signage'] },
  { name: 'Density', values: ['Low','Mid','High'] },
] };
export const renderBreach = blit(breach, breachTraits);
export const BREACH_ASPECTS = [1, 0.72, 1.39, 0.58, 1.97] as const;
