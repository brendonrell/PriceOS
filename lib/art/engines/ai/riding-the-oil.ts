// @ts-nocheck
/*
 * Riding The Oil (Discord) — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shuffle, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const DIS_THEMES=[
  {label:'Blurple', rail:'#1e1f22', side:'#2b2d31', chat:'#313338', accent:'#5865f2', text:'#dbdee1', sub:'#949ba4', name:'#f2f3f5', dark:true},
  {label:'Midnight', rail:'#0d0d10', side:'#161719', chat:'#1c1d20', accent:'#5865f2', text:'#e3e5e8', sub:'#80848e', name:'#ffffff', dark:true},
  {label:'Light', rail:'#dcdde1', side:'#f2f3f5', chat:'#ffffff', accent:'#5865f2', text:'#313338', sub:'#5c5e66', name:'#060607', dark:false},
  {label:'Crude', rail:'#0a0a08', side:'#15120d', chat:'#1b1712', accent:'#e0a000', text:'#efe6d2', sub:'#9a8a6a', name:'#fff3d6', dark:true},
  {label:'Mint', rail:'#0d201a', side:'#13281f', chat:'#173026', accent:'#23d5ab', text:'#dff5ec', sub:'#74a08e', name:'#eafff7', dark:true},
  {label:'Rose', rail:'#231016', side:'#2c141b', chat:'#331620', accent:'#eb459e', text:'#ffe0ee', sub:'#b07a90', name:'#fff0f7', dark:true},
];
const DIS_COMPS=['sales','channel','members','emoji','servers'];
const DIS_USERS=[
  {n:'rudxane', c:'#f23f43'},{n:'satoshi', c:'#5865f2'},{n:'gm.eth', c:'#3ba55d'},{n:'degen', c:'#faa61a'},
  {n:'milady', c:'#eb459e'},{n:'anon', c:'#949ba4'},{n:'probably', c:'#00a8fc'},{n:'bagholder', c:'#9b59b6'},
  {n:'few', c:'#1abc9c'},{n:'nocoiner', c:'#e67e22'},{n:'wagmi', c:'#2ecc71'},{n:'liquidated', c:'#e74c3c'},
];
const DIS_CHANNELS=['announcements','rules','price-discussion','gm','artwork-sales','the-oil-rig','charts','wen','alpha','shitposting','off-topic','memes','introductions','bot-spam','mod-chat'];
const DIS_REACTS=['🔥','🚀','💀','😂','👀','🧂','📈','💎','🫡','😭','🤝','🌊'];
const DIS_SALEPROJ=['PRISMS','ORACLE','Elevations','Every Light In Town','Teletext','Avalanche','Turf War','Hard Water','Crosstown','Delisted'];
function discord(cv,seed){
  const r=rng(seed);
  const comp=pick(DIS_COMPS,r);
  const themeI= r()<0.45 ? 0 : 1+Math.floor(r()*(DIS_THEMES.length-1));
  const dens=rint(r,1,3);
  const rare=r()<0.1;
  // ---- end trait draws ----
  const T=DIS_THEMES[themeI]; const AC=T.accent;
  const fmt=({sales:{W:1500,H:940},channel:{W:1500,H:940},members:{W:900,H:1340},emoji:{W:1080,H:1080},servers:{W:840,H:1340}})[comp];
  const W=fmt.W,H=fmt.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const SANS='"gg sans","Helvetica Neue",Helvetica,Arial,sans-serif';
  const EMO='"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  const rr=(X,Y,Wd,Hd,rad)=>{const d=Math.min(rad,Wd/2,Hd/2);x.beginPath();x.moveTo(X+d,Y);x.arcTo(X+Wd,Y,X+Wd,Y+Hd,d);x.arcTo(X+Wd,Y+Hd,X,Y+Hd,d);x.arcTo(X,Y+Hd,X,Y,d);x.arcTo(X,Y,X+Wd,Y,d);x.closePath();};
  const emo=(g,X,Y,sz,al)=>{x.font=sz+'px '+EMO;x.textAlign=al||'left';x.textBaseline='alphabetic';x.fillText(g,X,Y);};
  function avatar(cx,cy,R,col,ch,isEmoji){x.fillStyle=col;x.beginPath();x.arc(cx,cy,R,0,6.29);x.fill();x.textAlign='center';x.textBaseline='middle';if(isEmoji){x.font=Math.round(R*1.2)+'px '+EMO;x.fillText(ch,cx,cy+1);}else{x.fillStyle='#fff';x.font='bold '+Math.round(R*0.95)+'px '+SANS;x.fillText((ch||'?')[0].toUpperCase(),cx,cy+1);}x.textBaseline='alphabetic';}
  function dotc(s){return {online:'#23a55a',idle:'#f0b232',dnd:'#f23f43',offline:'#80848e'}[s];}
  function statusDot(cx,cy,rd,st,ring){if(ring){x.fillStyle=ring;x.beginPath();x.arc(cx,cy,rd+2.6,0,6.29);x.fill();}x.fillStyle=dotc(st);x.beginPath();x.arc(cx,cy,rd,0,6.29);x.fill();}
  function wrap(t,maxW){const w=t.split(' ');const o=[];let ln='';for(const word of w){const tt=ln?ln+' '+word:word;if(x.measureText(tt).width>maxW&&ln){o.push(ln);ln=word;}else ln=tt;}if(ln)o.push(ln);return o;}
  function artSwatch(ax,ay,aw,ah,sd){const ar=rng(sd|0);const pals=[['#ff2e63','#08d9d6','#ffde00'],['#7b2ff7','#f72585','#4cc9f0'],['#0f8a3c','#ffd514','#e0202e'],['#1d4fb8','#00e5ff','#ff7a2b'],['#e85d04','#6a040f','#ffba08']];const P2=pals[Math.floor(ar()*pals.length)];x.save();rr(ax,ay,aw,ah,8);x.clip();const g=x.createLinearGradient(ax,ay,ax+aw,ay+ah);g.addColorStop(0,P2[0]);g.addColorStop(1,'#0a0a12');x.fillStyle=g;x.fillRect(ax,ay,aw,ah);for(let i=0;i<14;i++){x.globalAlpha=0.5+ar()*0.5;x.fillStyle=P2[Math.floor(ar()*P2.length)];const t=ar();if(t<0.5){x.beginPath();x.arc(ax+ar()*aw,ay+ar()*ah,8+ar()*aw*0.25,0,6.29);x.fill();}else{x.save();x.translate(ax+ar()*aw,ay+ar()*ah);x.rotate(ar()*6.29);x.fillRect(-aw*0.2,-4,aw*0.4,8+ar()*20);x.restore();}}x.globalAlpha=1;x.restore();}
  function reactRow(rx,ry,n,cap){const order=shuffle(DIS_REACTS,r).slice(0,n);if(rare||r()<0.5)order.unshift('OIL');let cx=rx;for(const e of order){const big=e==='OIL';const cnt=rint(r,2,cap);const lbl=String(cnt);x.font='13px '+SANS;const wlbl=x.measureText(lbl).width;const pw=(big?50:30)+wlbl+16;if(cx+pw>W-rx)break;x.fillStyle=T.dark?'rgba(255,255,255,0.06)':'rgba(0,0,0,0.05)';rr(cx,ry,pw,30,8);x.fill();x.strokeStyle=AC+'55';x.lineWidth=1;rr(cx,ry,pw,30,8);x.stroke();if(big){emo('🏄',cx+7,ry+23,21);emo('🛢️',cx+22,ry+23,18);}else{emo(e,cx+6,ry+23,21);}x.fillStyle=AC;x.font='bold 13px '+SANS;x.textAlign='left';x.fillText(lbl,cx+(big?50:30)+2,ry+20);cx+=pw+8;}return cx;}

  x.fillStyle=T.chat; x.fillRect(0,0,W,H);

  if(comp==='sales'){
    // DESKTOP sales-feed (COVID-era PD): rail + channels + main embeds + members
    const rail=72, side=240, ml=200, mlx=W-ml, mx=rail+side;
    x.fillStyle=T.rail; x.fillRect(0,0,rail,H);
    for(let i=0;i<9;i++){const sy=20+i*64;if(sy>H-60)break;const active=i===0;x.fillStyle=active?AC:(T.dark?'#313338':'#dcdde1');rr(rail/2-24,sy,48,48,active?16:24);x.fill();if(active){avatar(rail/2,sy+24,22,AC,'🏄',true);x.fillStyle=T.name;x.fillRect(2,sy+14,4,20);}else{x.fillStyle=T.sub;x.font='bold 18px '+SANS;x.textAlign='center';x.textBaseline='middle';x.fillText(String.fromCharCode(65+i),rail/2,sy+24);x.textBaseline='alphabetic';}}
    x.fillStyle=T.side;x.fillRect(rail,0,side,H);
    x.fillStyle=T.name;x.font='bold 16px '+SANS;x.textAlign='left';x.fillText('PRICE DISCUSSION',rail+16,38);x.fillStyle=T.sub;x.fillText('▾',rail+side-26,38);
    x.strokeStyle=T.dark?'rgba(0,0,0,0.3)':'#e0e1e5';x.beginPath();x.moveTo(rail,52);x.lineTo(rail+side,52);x.stroke();
    let cy=78;x.fillStyle=T.sub;x.font='12px '+SANS;x.fillText('TEXT CHANNELS',rail+16,cy);cy+=26;
    for(let i=0;i<DIS_CHANNELS.length&&cy<H-30;i++){const act=DIS_CHANNELS[i]==='artwork-sales';if(act){x.fillStyle=T.dark?'rgba(255,255,255,0.08)':'#e0e1e5';rr(rail+8,cy-16,side-16,30,6);x.fill();}x.fillStyle=act?T.name:T.sub;x.font=(act?'bold ':'')+'15px '+SANS;x.fillText('#  '+DIS_CHANNELS[i],rail+20,cy+4);cy+=34;}
    x.fillStyle=T.chat;x.fillRect(mx,0,W-mx,H);
    x.fillStyle=T.side;x.fillRect(mx,0,W-mx,52);
    x.fillStyle=T.sub;x.font='22px '+SANS;x.fillText('#',mx+18,34);emo('🛢️',mx+38,35,18);x.fillStyle=T.name;x.font='bold 17px '+SANS;x.fillText('artwork-sales',mx+64,32);
    x.fillStyle=T.side;x.fillRect(mlx,52,ml,H-52);
    x.fillStyle=T.sub;x.font='12px '+SANS;x.fillText('ONLINE — '+rint(r,1,6)+','+String(rint(r,0,999)).padStart(3,'0'),mlx+16,80);
    let my=104;for(let i=0;i<14&&my<H-20;i++){const u=DIS_USERS[i%DIS_USERS.length];avatar(mlx+30,my,16,u.c,u.n,false);statusDot(mlx+40,my+10,5,pick(['online','online','idle','dnd'],r),T.side);x.fillStyle=i%4===0?u.c:T.text;x.font='15px '+SANS;x.textAlign='left';x.fillText(u.n,mlx+54,my+5);my+=38;}
    const colW=mlx-mx-48; let y=80;
    for(let c=0;c<3&&y<H-150;c++){
      avatar(mx+38,y+14,18,AC,'P',false);
      x.fillStyle=T.name;x.font='bold 16px '+SANS;x.textAlign='left';x.fillText('PD Marketplace',mx+66,y+12);
      x.fillStyle=AC;rr(mx+168,y+1,34,16,4);x.fill();x.fillStyle='#fff';x.font='bold 10px '+SANS;x.fillText('BOT',mx+174,y+13);
      x.fillStyle=T.sub;x.font='12px '+SANS;x.fillText('Today at '+rint(r,1,12)+':'+String(rint(r,0,59)).padStart(2,'0'),mx+212,y+12);
      const ex=mx+66,ey=y+24,ew=Math.min(colW,480),eh=170,thumb=140,proj=pick(DIS_SALEPROJ,r),id=rint(r,1,888),price=(0.05+r()*4).toFixed(2);
      x.fillStyle=T.dark?'#2b2d31':'#f2f3f5';rr(ex,ey,ew,eh,8);x.fill();x.fillStyle=AC;x.fillRect(ex,ey,4,eh);
      x.fillStyle=AC;x.font='bold 16px '+SANS;x.textAlign='left';x.fillText(proj+' #'+id,ex+20,ey+30);
      x.fillStyle=T.sub;x.font='12px '+SANS;x.fillText('SELLER',ex+20,ey+58);x.fillText('PRICE',ex+180,ey+58);
      x.fillStyle=T.text;x.font='14px '+SANS;x.fillText(pick(DIS_USERS,r).n+'.eth',ex+20,ey+78);x.fillText('Ξ '+price,ex+180,ey+78);
      x.fillStyle='#23a55a';x.font='bold 17px '+SANS;x.fillText('SOLD',ex+20,ey+116);
      x.fillStyle=T.sub;x.font='12px '+SANS;x.fillText('view on PD',ex+20,ey+140);
      artSwatch(ex+ew-thumb-14,ey+15,thumb,thumb,seed*53+c*97);
      y=ey+eh+12; reactRow(ex,y,rint(r,5,8),99); y+=48;
    }
    return;
  }
  if(comp==='channel'){
    const rail=72, side=240;
    x.fillStyle=T.rail; x.fillRect(0,0,rail,H);
    // server icons
    for(let i=0;i<9;i++){const sy=20+i*64; if(sy>H-60)break; const active=i===0;
      x.fillStyle=active?AC:(T.dark?'#313338':'#dcdde1'); rr(rail/2-24,sy,48,48,active?16:24); x.fill();
      if(active){avatar(rail/2,sy+24,22,AC,'🏄',true);x.fillStyle=T.name;x.fillRect(2,sy+14,4,20);} else {x.fillStyle=T.sub;x.font='bold 18px '+SANS;x.textAlign='center';x.textBaseline='middle';x.fillText(String.fromCharCode(65+i),rail/2,sy+24);x.textBaseline='alphabetic';}}
    // channel sidebar
    x.fillStyle=T.side; x.fillRect(rail,0,side,H);
    x.fillStyle=T.name; x.font='bold 16px '+SANS; x.textAlign='left'; x.fillText('PRICE DISCUSSION',rail+16,38); x.fillStyle=T.sub; x.fillText('▾',rail+side-26,38);
    x.strokeStyle=T.dark?'rgba(0,0,0,0.3)':'#e0e1e5'; x.beginPath();x.moveTo(rail,52);x.lineTo(rail+side,52);x.stroke();
    let cy=78; x.fillStyle=T.sub; x.font='12px '+SANS; x.fillText('TEXT CHANNELS',rail+16,cy); cy+=26;
    for(let i=0;i<DIS_CHANNELS.length && cy<H-30;i++){const act=DIS_CHANNELS[i]==='artwork-sales';if(act){x.fillStyle=T.dark?'rgba(255,255,255,0.08)':'#e0e1e5';rr(rail+8,cy-16,side-16,30,6);x.fill();}x.fillStyle=act?T.name:T.sub;x.font=(act?'bold ':'')+'15px '+SANS;x.fillText('#  '+DIS_CHANNELS[i],rail+20,cy+4);cy+=34;}
    // main header
    const mx=rail+side; x.fillStyle=T.chat; x.fillRect(mx,0,W-mx,H);
    x.fillStyle=T.side; x.fillRect(mx,0,W-mx,52);
    x.fillStyle=T.sub;x.font='22px '+SANS;x.fillText('#',mx+18,34);x.fillStyle=T.name;x.font='bold 17px '+SANS;x.fillText('price-discussion',mx+38,32);
    // member list right
    const ml=200, mlx=W-ml; x.fillStyle=T.side; x.fillRect(mlx,52,ml,H-52);
    x.fillStyle=T.sub;x.font='12px '+SANS;x.fillText('ONLINE — '+(rint(r,1,6)+',')+String(rint(r,0,999)).padStart(3,'0'),mlx+16,80);
    let my=104; for(let i=0;i<14 && my<H-20;i++){const u=DIS_USERS[i%DIS_USERS.length];avatar(mlx+30,my,16,u.c,u.n,false);statusDot(mlx+40,my+10,5,pick(['online','online','idle','dnd'],r),T.side);x.fillStyle=i%4===0?u.c:T.text;x.font='15px '+SANS;x.textAlign='left';x.fillText(u.n,mlx+54,my+5);my+=38;}
    // messages
    let y=72; let prev=-1;
    while(y<H-40){const u=DIS_USERS[Math.floor(r()*DIS_USERS.length)];const grouped=prev===DIS_USERS.indexOf(u)&&r()<0.4;prev=DIS_USERS.indexOf(u);
      if(!grouped)avatar(mx+38,y+16,20,u.c,u.n,false);
      if(!grouped){x.fillStyle=u.c;x.font='bold 15px '+SANS;x.textAlign='left';x.fillText(u.n,mx+66,y+10);x.fillStyle=T.sub;x.font='11px '+SANS;x.fillText('Today',mx+66+x.measureText(u.n).width+10,y+10);}
      const msg=pick(['gm','wen','up only','floor is melting','riding the oil','+1','ratio','probably nothing','lfg','who sent this','real','ath soon','send it','few','this is the one','sold too early'],r);
      x.fillStyle=T.text;x.font='15px '+SANS;x.textAlign='left';
      const lines=wrap(msg,W-mx-ml-90);lines.forEach((l,li)=>x.fillText(l,mx+66,y+(grouped?4:30)+li*20));
      y+=(grouped?0:18)+lines.length*20+10;
      if(r()<0.25){reactRow(mx+66,y-4,rint(r,2,4),60);y+=40;}}
    return;
  }
  if(comp==='members'){
    const hh=54;x.fillStyle=T.side;x.fillRect(0,0,W,hh);
    emo('🏄',22,hh/2+8,20);x.fillStyle=T.name;x.font='bold 19px '+SANS;x.textAlign='left';x.fillText('PRICE DISCUSSION',54,hh/2+7);
    let y=hh+34;const groups=[['ADMIN',1,'#f23f43'],['MODS',rint(r,2,4),'#faa61a'],['OG',rint(r,4,7),'#5865f2'],['ONLINE',rint(r,8,12),'#23a55a']];
    for(const[g,cnt,gc]of groups){if(y>H-40)break;x.fillStyle=gc;x.font='bold 13px '+SANS;x.fillText(g+' — '+cnt,28,y);y+=30;
      for(let i=0;i<cnt&&y<H-30;i++){const u=DIS_USERS[(i+g.length)%DIS_USERS.length];avatar(44,y,18,u.c,u.n,false);statusDot(56,y+12,6,g==='ONLINE'?pick(['online','idle','dnd'],r):'online',T.chat);x.fillStyle=u.c;x.font='16px '+SANS;x.textAlign='left';x.fillText(u.n+(i%3===0?'.eth':''),70,y+5);x.fillStyle=T.sub;x.font='12px '+SANS;x.fillText(pick(['playing charts','listening lo-fi','riding the oil','wen lambo','probably nothing'],r),70,y+22);y+=46;}y+=10;}
    return;
  }
  if(comp==='emoji'){
    const hh=64;x.fillStyle=T.side;x.fillRect(0,0,W,hh);
    x.fillStyle=T.name;x.font='bold 22px '+SANS;x.textAlign='left';x.fillText('EMOJI',26,hh/2+8);
    x.fillStyle=T.sub;x.font='14px '+SANS;x.fillText(':price-discussion:',150,hh/2+7);
    const all=['🔥','🚀','💀','😂','👀','🧂','📈','💎','🫡','😭','🤝','🌊','🏄','🛢️','🤡','🥲','💅','🗿','📉','🫠','😳','🧠','👑','⛽'];
    const cols=6,gx=(W-cols*150)/2+20,gy=hh+50,cell=150;let k=0;
    for(let row=0;row<5;row++)for(let cc=0;cc<cols;cc++){const e=all[k%all.length];const px=gx+cc*cell,py=gy+row*cell;
      if(rare&&(e==='🏄'||e==='🛢️')){x.fillStyle=AC+'33';rr(px-34,py-44,68,68,16);x.fill();}
      emo(e,px,py,56,'center');x.fillStyle=T.sub;x.font='11px '+SANS;x.textAlign='center';x.fillText(':'+pick(['fire','pog','rip','lol','gm','wen','oil','surf','few','real'],r)+':',px,py+34);k++;}
    // featured oil combo
    x.fillStyle=T.name;x.font='bold 16px '+SANS;x.textAlign='center';x.fillText('FREQUENTLY USED',W/2,H-70);
    emo('🏄',W/2-30,H-26,46);emo('🛢️',W/2+6,H-30,40);
    return;
  }
  // servers — the rail blown up, many servers, PD active
  {
    x.fillStyle=T.rail;x.fillRect(0,0,W,H);
    const cols=3,cell=W/cols;let k=0;
    for(let row=0;row<8;row++)for(let cc=0;cc<cols;cc++){const cx=cell*(cc+0.5),cy=120+row*150;if(cy>H-70)break;const active=k===0;
      x.fillStyle=active?AC:'#2b2d31';rr(cx-50,cy-50,100,100,active?28:50);x.fill();
      if(active){avatar(cx,cy,44,AC,'🏄',true);x.fillStyle='#fff';rr(8,cy-22,6,44,3);x.fill();}
      else{x.fillStyle='#dbdee1';x.font='bold 34px '+SANS;x.textAlign='center';x.textBaseline='middle';x.fillText(pick(['PD','GM','OS','XYZ','DAO','WEN','OIL','APE','ETH','TEZ'],r),cx,cy);x.textBaseline='alphabetic';}
      if(r()<0.5){x.fillStyle='#f23f43';x.beginPath();x.arc(cx+38,cy+38,14,0,6.29);x.fill();x.fillStyle='#fff';x.font='bold 13px '+SANS;x.textAlign='center';x.fillText(String(rint(r,1,99)),cx+38,cy+43);}
      k++;}
    x.fillStyle=T.name;x.font='bold 22px '+SANS;x.textAlign='center';x.fillText('PRICE DISCUSSION',W/2,64);
    return;
  }
}
function castDiscord(seed){
  const r=rng(seed);
  const comp=pick(DIS_COMPS,r);
  const themeI= r()<0.45 ? 0 : 1+Math.floor(r()*(DIS_THEMES.length-1));
  const dens=rint(r,1,3);
  return {comp, theme:DIS_THEMES[themeI].label, dens};
}

/* Riding The Oil (Discord) */
export const discordTraits: TraitsFn = (id) => { const c = castDiscord(id) as any; return { Layout: cap(c.comp), Theme: c.theme, Density: c.dens === 1 ? 'Quiet' : c.dens === 2 ? 'Busy' : 'Packed' }; };
export const discordSchema: TraitSchema = { traits: [
  { name: 'Layout', values: ['Sales','Channel','Members','Emoji','Servers'],
    subtraits: [
      { name: 'Rooms', values: ['Channel', 'Members', 'Servers'] },
      { name: 'Feed', values: ['Sales', 'Emoji'] },
    ] },
  { name: 'Theme', values: ['Blurple','Midnight','Light','Crude','Mint','Rose'],
    subtraits: [
      { name: 'Dark', values: ['Blurple', 'Midnight', 'Crude'] },
      { name: 'Light', values: ['Light', 'Mint', 'Rose'] },
    ] },
  { name: 'Density', values: ['Quiet','Busy','Packed'] },
] };
export const renderDiscord = blit(discord, discordTraits);
export const DISCORD_ASPECTS = [1.6, 0.67, 1, 0.63] as const;
