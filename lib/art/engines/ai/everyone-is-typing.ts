// @ts-nocheck
/*
 * Everyone Is Typing — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shuffle, shade, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const CHAT_THEMES=[
  {name:'Daylight', bg:'#eaeef4', head:'#ffffff', them:'#ffffff', txt:'#1a1d24', sub:'#8a93a3', line:'#dde3ec', dark:false},
  {name:'After Dark', bg:'#0f1216', head:'#171c23', them:'#222a34', txt:'#e8ecf2', sub:'#7d8794', line:'#283038', dark:true},
  {name:'Midnight', bg:'#080d1c', head:'#101a34', them:'#16213e', txt:'#dbe6ff', sub:'#67789f', line:'#1b294a', dark:true},
  {name:'Mint', bg:'#e3f3ec', head:'#ffffff', them:'#ffffff', txt:'#0f241c', sub:'#6f9486', line:'#cde6db', dark:false},
  {name:'Paper', bg:'#f1e9db', head:'#fbf6ec', them:'#fbf6ec', txt:'#2a2218', sub:'#9a8a72', line:'#e1d4bf', dark:false},
  {name:'Noir', bg:'#101010', head:'#1b1b1b', them:'#262626', txt:'#f0f0f0', sub:'#8a8a8a', line:'#2f2f2f', dark:true},
  {name:'Bubblegum', bg:'#ffe6f1', head:'#ffffff', them:'#ffffff', txt:'#3a0f24', sub:'#c77399', line:'#ffcfe2', dark:false},
];
const CHAT_ACCENTS=[
  {name:'Ultramarine', c:'#2b6bff'}, {name:'Hot Pink', c:'#ff2d87'}, {name:'Acid', c:'#a6e000'},
  {name:'Tangerine', c:'#ff7a1a'}, {name:'Violet', c:'#8b5cff'}, {name:'Teal', c:'#10c8b0'},
  {name:'Crimson', c:'#ff3b3b'}, {name:'Gold', c:'#f5b600'},
];
const CHAT_COMPS=['thread','hero','lockscreen','split','presence','panorama'];
const CHAT_SPK=['#ff6b6b','#4dabf7','#51cf66','#ffd43b','#cc5de8','#ff922b','#20c997','#f06595','#94d82d','#5c7cfa'];
const CHAT_NAMES=['the price floor','ser club','gm gang','wen lambo','diamond hands','exit liquidity','the group chat','floor sweepers','probably nothing','price discussion','the war room','few','the trenches','no thoughts'];
const CHAT_HANDLES=['anon','satoshi','degen','milady','ser','probably','wagmi','jpeg','frens','gm','toly','punk','bagholder','liquidated','vitalik','nocoiner'];
const CHAT_MSGS=['gm','wen','ser','lfg','floor is melting','up only','down bad','buying this','who sent this','+1','ratio','no way','real','seen','probably nothing','its over','we are so back','few understand','this is the one','ath soon','im in','sold too early','diamond hands','same','lol','fr fr','ok this is bullish','send it','gm gm','wagmi','my body is ready','no chart just vibes','this aged well','delete this'];
function chatroom(cv,seed){
  const r=rng(seed);
  const comp=pick(CHAT_COMPS,r);
  const themeI=Math.floor(r()*CHAT_THEMES.length);
  const accI=Math.floor(r()*CHAT_ACCENTS.length);
  const members=rint(r,2,6);
  const rare=r()<0.08;
  const notice= rare? pick(['Unread','Everyone Typing','Left On Read','Pinned'],r):'None';
  // ---- end trait draws ----
  const T=CHAT_THEMES[themeI], AC=CHAT_ACCENTS[accI].c;
  const fmt=({thread:{W:900,H:1280},hero:{W:1080,H:1080},lockscreen:{W:840,H:1280},split:{W:1300,H:860},presence:{W:1080,H:1080},panorama:{W:1500,H:720}})[comp];
  const W=fmt.W,H=fmt.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const SANS='"Helvetica Neue",Helvetica,Arial,sans-serif';
  function rr(X,Y,Wd,Hd,rad){const rd=Math.min(rad,Wd/2,Hd/2);x.beginPath();x.moveTo(X+rd,Y);x.arcTo(X+Wd,Y,X+Wd,Y+Hd,rd);x.arcTo(X+Wd,Y+Hd,X,Y+Hd,rd);x.arcTo(X,Y+Hd,X,Y,rd);x.arcTo(X,Y,X+Wd,Y,rd);x.closePath();}
  function avatar(cx,cy,R,col,ch){x.fillStyle=col;x.beginPath();x.arc(cx,cy,R,0,6.29);x.fill();x.fillStyle='rgba(255,255,255,0.96)';x.font='bold '+Math.round(R*1.02)+'px '+SANS;x.textAlign='center';x.textBaseline='middle';x.fillText((ch||'?').charAt(0).toUpperCase(),cx,cy+R*0.04);x.textBaseline='alphabetic';}
  function dot(cx,cy,rd,st){const C={online:'#2ec16a',idle:'#f5b500',dnd:'#ff4d4d',offline:'#7a8190'};x.fillStyle=T.bg;x.beginPath();x.arc(cx,cy,rd+2.5,0,6.29);x.fill();x.fillStyle=C[st];x.beginPath();x.arc(cx,cy,rd,0,6.29);x.fill();if(st==='idle'){x.fillStyle=T.bg;x.beginPath();x.arc(cx-rd*0.4,cy-rd*0.4,rd*0.7,0,6.29);x.fill();}}
  function wrap(text,maxW){const w=text.split(' ');const out=[];let ln='';for(const word of w){const t=ln?ln+' '+word:word;if(x.measureText(t).width>maxW&&ln){out.push(ln);ln=word;}else ln=t;}if(ln)out.push(ln);return out;}
  function heart(cx,cy,s){x.beginPath();x.moveTo(cx,cy+s*0.3);x.bezierCurveTo(cx-s,cy-s*0.4,cx-s*0.5,cy-s,cx,cy-s*0.35);x.bezierCurveTo(cx+s*0.5,cy-s,cx+s,cy-s*0.4,cx,cy+s*0.3);x.fill();}
  function reactChip(rx,ry,kind,n){const cw=42;x.fillStyle=T.dark?'rgba(255,255,255,0.10)':'rgba(0,0,0,0.06)';rr(rx,ry,cw,24,12);x.fill();if(kind==='heart'){x.fillStyle='#ff3b6b';heart(rx+13,ry+12,5);}else{x.fillStyle='#ff8a1a';x.beginPath();x.moveTo(rx+13,ry+5);x.quadraticCurveTo(rx+19,ry+12,rx+13,ry+19);x.quadraticCurveTo(rx+7,ry+12,rx+13,ry+5);x.fill();}x.fillStyle=T.sub;x.font='12px '+SANS;x.textAlign='left';x.fillText(String(n),rx+24,ry+16);}
  function clock(){return rint(r,0,1)?(rint(r,1,12)+':'+String(rint(r,0,59)).padStart(2,'0')+' '+pick(['AM','PM'],r)):(String(rint(r,0,23)).padStart(2,'0')+':'+String(rint(r,0,59)).padStart(2,'0'));}
  const spk=shuffle(CHAT_SPK,r).slice(0,members);
  const hnd=shuffle(CHAT_HANDLES,r).slice(0,members);
  x.fillStyle=T.bg; x.fillRect(0,0,W,H);

  function header(hh){
    x.fillStyle=T.head; x.fillRect(0,0,W,hh);
    x.fillStyle='rgba(0,0,0,'+(T.dark?0.4:0.06)+')'; x.fillRect(0,hh-1.5,W,1.5);
    const gname=pick(CHAT_NAMES,r);
    x.fillStyle=AC; rr(22,hh/2-23,46,46,14); x.fill();
    x.fillStyle='#fff'; x.font='bold 22px '+SANS; x.textAlign='center'; x.textBaseline='middle';
    x.fillText('#',45,hh/2+1); x.textBaseline='alphabetic';
    x.fillStyle=T.txt; x.font='bold 26px '+SANS; x.textAlign='left'; x.fillText(gname,84,hh/2-2);
    x.fillStyle=T.sub; x.font='15px '+SANS; x.fillText(members+' members · '+rint(r,1,members)+' online',84,hh/2+22);
    let ax=W-40; for(let i=0;i<Math.min(members,4);i++){x.fillStyle=T.head;x.beginPath();x.arc(ax,hh/2,21,0,6.29);x.fill();avatar(ax,hh/2,18,spk[i],hnd[i]);ax-=30;}
  }

  if(comp==='thread'||comp==='lockscreen'){
    if(comp==='lockscreen'){
      // wallpaper + clock + notification cards
      const g=x.createLinearGradient(0,0,W,H); g.addColorStop(0,AC); g.addColorStop(1,T.dark?'#05060a':shade(AC,-90)); x.fillStyle=g; x.fillRect(0,0,W,H);
      x.fillStyle='rgba(255,255,255,0.5)'; x.font='17px '+SANS; x.textAlign='center'; x.fillText(pick(['Monday','Friday','Saturday','Sunday'],r)+', '+pick(['Jun','Sep','Dec','Mar'],r)+' '+rint(r,1,28),W/2,120);
      x.fillStyle='#fff'; x.font='200 168px '+SANS; x.fillText(clock(),W/2,250);
      const nN= notice==='Everyone Typing'?5:rint(r,3,5);
      let cy=360; for(let i=0;i<nN;i++){const ch=Math.min(H-cy-30,150);
        x.save(); x.shadowColor='rgba(0,0,0,0.25)'; x.shadowBlur=18; x.shadowOffsetY=6;
        x.fillStyle= T.dark?'rgba(30,34,42,0.86)':'rgba(255,255,255,0.86)'; rr(34,cy,W-68,118,26); x.fill(); x.restore();
        x.fillStyle=AC; rr(54,cy+22,40,40,12); x.fill(); x.fillStyle='#fff';x.font='bold 20px '+SANS;x.textAlign='center';x.textBaseline='middle';x.fillText('#',74,cy+43);x.textBaseline='alphabetic';
        x.fillStyle=T.txt; x.font='bold 19px '+SANS; x.textAlign='left'; x.fillText(pick(CHAT_NAMES,r),112,cy+38);
        x.fillStyle=T.sub; x.font='12px '+SANS; x.textAlign='right'; x.fillText(clock(),W-54,cy+38);
        x.fillStyle=T.sub; x.font='16px '+SANS; x.textAlign='left';
        const ln= (notice==='Everyone Typing'&&i===0)? rint(r,2,members)+' people are typing…' : (hnd[i%members]+': '+pick(CHAT_MSGS,r));
        x.fillText(wrap(ln,W-160)[0],112,cy+72); cy+=134;}
      return;
    }
    const hh=92; header(hh);
    let y=hh+34;
    // day divider
    x.fillStyle=T.dark?'rgba(255,255,255,0.08)':'rgba(0,0,0,0.05)'; const dl=pick(['TODAY','YESTERDAY','THIS MORNING','LAST NIGHT'],r); x.font='bold 12px '+SANS; const dw=x.measureText(dl).width+30; rr(W/2-dw/2,y-18,dw,26,13); x.fill(); x.fillStyle=T.sub; x.textAlign='center'; x.fillText(dl,W/2,y); y+=34;
    let prev=-1;
    while(y<H-150){
      const mine=r()<0.42; let si=mine?-1:Math.floor(r()*members); if(!mine&&si===prev&&r()<0.5)si=(si+1)%members; prev=si;
      if(notice==='Unread'&&y>H*0.5&&y<H*0.5+50){x.strokeStyle=AC;x.lineWidth=1.4;x.beginPath();x.moveTo(30,y);x.lineTo(W-30,y);x.stroke();x.fillStyle=AC;x.font='bold 12px '+SANS;x.textAlign='center';x.fillStyle=T.bg;const uw=70;x.fillRect(W/2-uw/2,y-8,uw,16);x.fillStyle=AC;x.fillText('UNREAD',W/2,y+4);y+=30;}
      const text=pick(CHAT_MSGS,r); const maxW=W*0.56;
      x.font='19px '+SANS; const lines=wrap(text,maxW-36); const tw=Math.min(maxW-36,Math.max(...lines.map(l=>x.measureText(l).width)));
      const bw=tw+36, bh=lines.length*26+24;
      const bx= mine? W-30-bw-46 : 76;
      if(!mine) avatar(46,y+bh-16,18,spk[si],hnd[si]);
      x.fillStyle= mine?AC:T.them;
      x.save(); x.shadowColor='rgba(0,0,0,'+(T.dark?0.3:0.08)+')'; x.shadowBlur=8; x.shadowOffsetY=2; rr(bx,y,bw,bh,20); x.fill(); x.restore();
      if(!mine){x.fillStyle=T.sub;x.font='12px '+SANS;x.textAlign='left';x.fillText(hnd[si],bx+6,y-6);}
      x.fillStyle= mine?'#fff':T.txt; x.font='19px '+SANS; x.textAlign='left';
      lines.forEach((l,li)=>x.fillText(l,bx+18,y+28+li*26));
      let ny=y+bh+14;
      if(r()<0.3){reactChip(mine?bx+bw-46:bx+12,y+bh-6,r()<0.5?'heart':'fire',rint(r,1,members));ny+=14;}
      y=ny;
    }
    // typing indicator(s)
    const tN= notice==='Everyone Typing'? Math.min(members,4):1;
    for(let i=0;i<tN;i++){const ty=H-120+i*0; const bx=76; avatar(46,H-100,18,spk[i%members],hnd[i%members]);
      x.fillStyle=T.them; x.save(); x.shadowColor='rgba(0,0,0,0.12)';x.shadowBlur=6; rr(bx,H-118,86,40,20); x.fill(); x.restore();
      x.fillStyle=T.sub; for(let d=0;d<3;d++){x.beginPath();x.arc(bx+24+d*18,H-98,5,0,6.29);x.fill();}
      if(tN>1)break;}
    if(notice==='Everyone Typing'){x.fillStyle=T.sub;x.font='14px '+SANS;x.textAlign='left';x.fillText('everyone is typing…',150,H-94);}
    return;
  }

  if(comp==='hero'){
    const tint=x.createLinearGradient(0,0,0,H); tint.addColorStop(0,T.bg); tint.addColorStop(1,T.dark?shade(AC,-100):shade(AC,80)); x.fillStyle=tint; x.fillRect(0,0,W,H);
    const who=hnd[0], line=pick(['gm','wen','ser','up only','we are so back','its over','few','probably nothing','lfg','send it','wagmi','no way','ratio'],r);
    avatar(W/2,H*0.3,44,spk[0],who);
    x.fillStyle=T.txt; x.font='bold 22px '+SANS; x.textAlign='center'; x.fillText(who,W/2,H*0.3+78);
    x.font='bold 92px '+SANS; const bw=Math.min(W*0.8,x.measureText(line).width+96), bh=190;
    x.fillStyle=AC; x.save(); x.shadowColor='rgba(0,0,0,0.2)';x.shadowBlur=24;x.shadowOffsetY=10; rr(W/2-bw/2,H*0.42,bw,bh,46); x.fill();
    x.beginPath();x.moveTo(W/2-bw/2+40,H*0.42+bh-4);x.lineTo(W/2-bw/2+18,H*0.42+bh+30);x.lineTo(W/2-bw/2+72,H*0.42+bh-4);x.fill(); x.restore();
    x.fillStyle='#fff'; x.textBaseline='middle'; x.fillText(line,W/2,H*0.42+bh/2); x.textBaseline='alphabetic';
    // reactions row
    let rxs=W/2-90; for(const k of ['heart','fire','heart']){reactChip(rxs,H*0.72,k,rint(r,3,members*40+9));rxs+=66;}
    x.fillStyle=T.sub; x.font='15px '+SANS; x.textAlign='center'; x.fillText('Seen by '+rint(r,2,members)+' · '+clock(),W/2,H*0.82);
    return;
  }

  if(comp==='split'){
    const pad=30, pw=(W-pad*3)/2;
    for(let p=0;p<2;p++){const px=pad+p*(pw+pad);
      x.fillStyle=T.head; x.save(); x.shadowColor='rgba(0,0,0,0.3)';x.shadowBlur=20;x.shadowOffsetY=8; rr(px,pad,pw,H-pad*2,40); x.fill(); x.restore();
      x.save(); rr(px,pad,pw,H-pad*2,40); x.clip();
      x.fillStyle=T.bg; x.fillRect(px,pad+70,pw,H);
      x.fillStyle=T.head; x.fillRect(px,pad,pw,70);
      x.fillStyle=T.txt; x.font='bold 19px '+SANS; x.textAlign='center'; x.fillText(pick(CHAT_NAMES,r),px+pw/2,pad+44);
      let y=pad+110; let prev=-1;
      while(y<H-pad-40){const mine=r()<0.45; let si=mine?-1:Math.floor(r()*members); prev=si;
        const text=pick(CHAT_MSGS,r); x.font='16px '+SANS; const maxW=pw*0.62; const lines=wrap(text,maxW-30);
        const tw=Math.min(maxW-30,Math.max(...lines.map(l=>x.measureText(l).width))); const bw=tw+30, bh=lines.length*22+18;
        const bx= mine? px+pw-20-bw : px+50;
        if(!mine) avatar(px+30,y+bh-14,14,spk[si],hnd[si]);
        x.fillStyle= mine?AC:T.them; rr(bx,y,bw,bh,16); x.fill();
        x.fillStyle= mine?'#fff':T.txt; x.font='16px '+SANS; x.textAlign='left'; lines.forEach((l,li)=>x.fillText(l,bx+15,y+24+li*22));
        y+=bh+12;}
      x.restore();
      // notch
      x.fillStyle=T.dark?'#000':'#1a1a1a'; rr(px+pw/2-44,pad+8,88,18,9); x.fill();
    }
    return;
  }

  if(comp==='panorama'){
    const bgg=x.createLinearGradient(0,0,W,0); bgg.addColorStop(0,T.bg); bgg.addColorStop(1,T.dark?shade(AC,-95):shade(AC,90)); x.fillStyle=bgg; x.fillRect(0,0,W,H);
    x.fillStyle=T.txt; x.font='bold 26px '+SANS; x.textAlign='left'; x.fillText(pick(CHAT_NAMES,r),40,56);
    x.fillStyle=T.sub; x.font='15px '+SANS; x.fillText(members+' members',40,80);
    let cx=130, prevX=60, prevY=H/2, i=0; const baseY=H*0.52;
    while(cx<W-200){
      const si=Math.floor(r()*members);
      const yy=baseY+(Math.sin(i*0.9)+(r()-0.5))*H*0.18;
      const text=pick(CHAT_MSGS,r); x.font='18px '+SANS; const tw=Math.min(260,x.measureText(text).width); const bw=tw+36, bh=56;
      x.strokeStyle=T.dark?'rgba(255,255,255,0.22)':'rgba(0,0,0,0.16)'; x.lineWidth=2; x.setLineDash([2,7]);
      x.beginPath(); x.moveTo(prevX,prevY); x.lineTo(cx-6,yy+bh/2); x.stroke(); x.setLineDash([]);
      avatar(cx+14,yy+bh/2,16,spk[si],hnd[si]);
      const bx=cx+36; const mine=i%3===2;
      x.fillStyle= mine?AC:T.them; x.save(); x.shadowColor='rgba(0,0,0,'+(T.dark?0.35:0.12)+')'; x.shadowBlur=10; x.shadowOffsetY=4; rr(bx,yy,bw,bh,18); x.fill(); x.restore();
      x.fillStyle= mine?'#fff':T.txt; x.font='18px '+SANS; x.textAlign='left'; x.textBaseline='middle'; x.fillText(text,bx+18,yy+bh/2); x.textBaseline='alphabetic';
      if(r()<0.3) reactChip(bx+bw-30,yy+bh-6,r()<0.5?'heart':'fire',rint(r,1,9));
      prevX=bx+bw; prevY=yy+bh/2; cx=bx+bw+rint(r,46,96); i++;
    }
    x.fillStyle=T.sub; x.font='14px '+SANS; x.textAlign='right'; x.fillText(clock(),W-30,H-26);
    return;
  }

  // presence — member grid with status
  {
    const hh=96; x.fillStyle=T.head; x.fillRect(0,0,W,hh);
    x.fillStyle=T.txt; x.font='bold 30px '+SANS; x.textAlign='left'; x.fillText(pick(CHAT_NAMES,r),34,hh/2+2);
    const onN=rint(r,1,members);
    x.fillStyle='#2ec16a'; x.beginPath();x.arc(40,hh/2+30,6,0,6.29);x.fill();
    x.fillStyle=T.sub; x.font='16px '+SANS; x.fillText(onN+' of '+(members+rint(r,4,40))+' online',56,hh/2+35);
    const N=members+rint(r,3,18); const cols=4, cellW=(W-60)/cols, top=hh+30;
    const states=['online','online','idle','dnd','offline','offline'];
    for(let i=0;i<N;i++){const c=i%cols, row=(i/cols)|0; const cx=40+c*cellW, cy=top+row*128;
      if(cy>H-90)break;
      const col=CHAT_SPK[i%CHAT_SPK.length]; const ch=CHAT_HANDLES[i%CHAT_HANDLES.length];
      const st= i<onN? pick(['online','online','idle','dnd'],r):pick(states,r);
      avatar(cx+cellW/2,cy+34,36,col,ch);
      dot(cx+cellW/2+26,cy+58,9,st);
      x.fillStyle=T.txt; x.font='bold 16px '+SANS; x.textAlign='center'; x.fillText(ch+(i%5===0?'.eth':''),cx+cellW/2,cy+94);
      x.fillStyle= st==='online'?'#2ec16a':st==='idle'?'#f5b500':st==='dnd'?'#ff4d4d':T.sub; x.font='12px '+SANS; x.fillText(st==='dnd'?'do not disturb':st,cx+cellW/2,cy+112);}
    return;
  }
}
function castChatroom(seed){
  const r=rng(seed);
  const comp=pick(CHAT_COMPS,r);
  const themeI=Math.floor(r()*CHAT_THEMES.length);
  const accI=Math.floor(r()*CHAT_ACCENTS.length);
  const members=rint(r,2,6);
  const rare=r()<0.08;
  const notice= rare? pick(['Unread','Everyone Typing','Left On Read','Pinned'],r):'None';
  return {layout:comp, theme:CHAT_THEMES[themeI].name, accent:CHAT_ACCENTS[accI].name, members: members<=2?'Duo':members<=4?'Small':'Crowd', notice};
}

/* AFTERGLOW — "Night Service": one primitive (a glowing light-ribbon) under
   additive bloom. Simple system, aesthetics-first: smooth bezier trails, neon
   gradients, soft glow, film grain, vignette + scanlines. Variety from
   palette × format × mode (stream/rain/spiral/horizon/orbit) × randomness. */

/* Everyone Is Typing */
export const chatroomTraits: TraitsFn = (id) => { const c = castChatroom(id) as any; return { Layout: cap(c.layout), Theme: c.theme, Accent: c.accent, Members: c.members, Notice: c.notice }; };
export const chatroomSchema: TraitSchema = { traits: [
  { name: 'Layout', values: ['Thread','Hero','Lockscreen','Split','Presence','Panorama'] },
  { name: 'Theme', values: ['Daylight','After Dark','Midnight','Mint','Paper','Noir','Bubblegum'] },
  { name: 'Accent', values: ['Ultramarine','Hot Pink','Acid','Tangerine','Violet','Teal','Crimson','Gold'] },
  { name: 'Members', values: ['Duo','Small','Crowd'] },
  { name: 'Notice', values: ['None','Unread','Everyone Typing','Left On Read','Pinned'] },
] };
export const renderChatroom = blit(chatroom, chatroomTraits);
export const CHATROOM_ASPECTS = [0.7, 1, 0.66, 1.51, 2.08] as const;
