// @ts-nocheck
/*
 * AI sample projects — engine core. 22 deterministic canvas engines ported
 * verbatim from the approved demo bench (pd-sample-demos). Plain JS under
 * @ts-nocheck by design: this is frozen art code — the typed boundary,
 * trait schemas and EngineFn wrappers live in ./index.ts.
 *
 * The cast* functions replicate each engine's leading rng draws exactly
 * (machine-verified, 40 seeds/engine) so traitsOf() never disagrees with
 * render(). DO NOT reorder rng draws in an engine without updating its
 * cast — the verification harness lives in the demo bench repo.
 */
/* ---------------- shared RNG + utils (all engines) ---------------- */
function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function rng(seed){return mulberry32(((Math.imul(seed>>>0,2654435761))>>>0)||1);}
function pick(a,r){return a[Math.floor(r()*a.length)];}
function rint(r,a,b){return a+Math.floor(r()*(b-a+1));}
function shuffle(a,r){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=x[i];x[i]=x[j];x[j]=t;}return x;}
function hash2(x,y){let h=0x811c9dc5;const s=x+','+y;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}return (h>>>0)/4294967296;}
function randn(r){return r()+r()+r()+r()-2;}
function shade(col,amt){const v=parseInt(col.slice(1),16);let R=(v>>16)+amt,G=((v>>8)&255)+amt,B=(v&255)+amt;
  R=Math.max(0,Math.min(255,R));G=Math.max(0,Math.min(255,G));B=Math.max(0,Math.min(255,B));
  return 'rgb('+R+','+G+','+B+')';}
/* deterministic paper mottle */
function paperNoise(x,r,W,H,dark,n){for(let i=0;i<n;i++){x.fillStyle='rgba('+dark+','+(r()*0.03)+')';x.fillRect(r()*W,r()*H,1.5,1.5);}}
/* Shrink a font until `text` fits `maxW` (down to 55% of base), keeping every
   character. `make(px)` builds the full font string. Pure (no rng draws), so it
   never shifts an engine's deterministic stream. Sets and returns the fitted font. */
function fitText(x,text,maxW,make,basePx){let px=basePx;x.font=make(px);const floor=Math.max(8,Math.round(basePx*0.55));while(px>floor&&x.measureText(text).width>maxW){px-=1;x.font=make(px);}return px;}
/* ============ the original 8, colour-cranked + higher variance ============ */

/* 3. PLAT — surveys with zoning washes + coloured papers */
function plat(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1100,H:1100}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sch=pick([
    {paper:'#f0f4f6',ink:'#3a3128',water:'#9fd9e8',wash:['#ffd514','#ff5500','#1fb8a0']},
    {paper:'#dff2e4',ink:'#0f4a2e',water:'#6fc8e8',wash:['#ff2b6e','#ffaa00','#2b4bd8']},
    {paper:'#ffe9d6',ink:'#7a1d2e',water:'#5ab8d8',wash:['#0f8a3c','#ffd514','#7a00cc']},
    {paper:'#e4ecff',ink:'#1d2a6a',water:'#36c8c0',wash:['#ff4d2e','#ffc814','#d61a8c']},
  ],r);
  x.fillStyle=sch.paper; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H,'90,70,40',800);
  const M=70, mapX=M, mapY=110, mapW=W-2*M, mapH=H-290;
  let rects=[{x:mapX,y:mapY,w:mapW,h:mapH}];
  const target=rint(r,4,28);
  while(rects.length<target){
    rects.sort((a,b)=>b.w*b.h-a.w*a.h);
    const q=rects.shift(), f=0.35+r()*0.3;
    if(q.w>q.h){rects.push({x:q.x,y:q.y,w:q.w*f,h:q.h},{x:q.x+q.w*f,y:q.y,w:q.w*(1-f),h:q.h});}
    else {rects.push({x:q.x,y:q.y,w:q.w,h:q.h*f},{x:q.x,y:q.y+q.h*f,w:q.w,h:q.h*(1-f)});}
  }
  const J=10;
  const jx=(px,py)=>px+(hash2(Math.round(px),Math.round(py))-0.5)*2*J;
  const jy=(px,py)=>py+(hash2(Math.round(py),Math.round(px))-0.5)*2*J;
  function poly(q){
    return [[q.x,q.y],[q.x+q.w,q.y],[q.x+q.w,q.y+q.h],[q.x,q.y+q.h]].map(p=>[jx(p[0],p[1]),jy(p[0],p[1])]);
  }
  const nums=shuffle(rects.map((_,i)=>i+1),r);
  rects.forEach((q,i)=>{
    const pl=poly(q);
    // zoning wash
    if(r()<0.72){
      x.fillStyle=pick(sch.wash,r); x.globalAlpha=0.34;
      x.beginPath(); pl.forEach((p,k)=>k===0?x.moveTo(p[0],p[1]):x.lineTo(p[0],p[1]));
      x.closePath(); x.fill(); x.globalAlpha=1;
    }
    x.strokeStyle=sch.ink; x.fillStyle=sch.ink;
    x.lineWidth=1.6; x.beginPath();
    pl.forEach((p,k)=>k===0?x.moveTo(p[0],p[1]):x.lineTo(p[0],p[1]));
    x.closePath(); x.stroke();
    pl.forEach(p=>{x.beginPath();x.arc(p[0],p[1],3,0,6.29);x.stroke();});
    const cx=q.x+q.w/2, cy=q.y+q.h/2;
    const fs2=Math.max(15,Math.min(48,Math.sqrt(q.w*q.h)/9));
    x.textAlign='center'; x.font='italic '+Math.round(fs2)+'px Georgia,serif';
    x.fillText('LOT '+nums[i],cx,cy-6);
    if(fs2>19){
      x.font='italic '+Math.round(fs2*0.62)+'px Georgia,serif';
      x.fillText((q.w*q.h/52000).toFixed(2)+' AC.',cx,cy+fs2*0.85);
    }
  });
  const hasRiver=r()<0.85;
  const ry0=mapY+mapH*(0.25+r()*0.5), amp=40+r()*50, ph=r()*6.28, wdt=20+r()*90;
  function bank(off){
    x.beginPath();
    for(let s=-20;s<=mapW+20;s+=8){
      const yy=ry0+Math.sin(s*0.006+ph)*amp+Math.sin(s*0.017+ph*2)*amp*0.35+off;
      if(s===-20)x.moveTo(mapX+s,yy);else x.lineTo(mapX+s,yy);
    }
  }
  if(hasRiver){
  x.save();
  x.beginPath(); x.rect(mapX,mapY,mapW,mapH); x.clip();
  x.fillStyle=sch.water;
  x.beginPath();
  for(let s=-20;s<=mapW+20;s+=8){const yy=ry0+Math.sin(s*0.006+ph)*amp+Math.sin(s*0.017+ph*2)*amp*0.35-wdt/2;s===-20?x.moveTo(mapX+s,yy):x.lineTo(mapX+s,yy);}
  for(let s=mapW+20;s>=-20;s-=8){const yy=ry0+Math.sin(s*0.006+ph)*amp+Math.sin(s*0.017+ph*2)*amp*0.35+wdt/2;x.lineTo(mapX+s,yy);}
  x.closePath(); x.fill();
  x.strokeStyle=sch.ink; x.lineWidth=1.4; bank(-wdt/2); x.stroke(); bank(wdt/2); x.stroke();
  x.lineWidth=0.6; for(let k=1;k<4;k++){bank(-wdt/2+k*wdt/4); x.globalAlpha=0.5; x.stroke(); x.globalAlpha=1;}
  x.restore();
  }
  x.strokeStyle=sch.ink; x.fillStyle=sch.ink;
  x.lineWidth=2.4; x.strokeRect(mapX,mapY,mapW,mapH);
  x.font='15px Georgia,serif'; x.textAlign='center';
  x.fillText('N '+rint(r,1,89)+'°'+rint(r,10,59)+'′ E — '+(mapW*0.92).toFixed(1)+' FT',mapX+mapW/2,mapY-12);
  x.save(); x.translate(mapX-14,mapY+mapH/2); x.rotate(-Math.PI/2);
  x.fillText('S '+rint(r,1,89)+'°'+rint(r,10,59)+'′ W — '+(mapH*0.92).toFixed(1)+' FT',0,0); x.restore();
  const nx=W-130, ny=170;
  x.beginPath(); x.arc(nx,ny,34,0,6.29); x.lineWidth=1.4; x.stroke();
  x.beginPath(); x.moveTo(nx,ny+26); x.lineTo(nx-9,ny+2); x.lineTo(nx,ny-26); x.lineTo(nx+9,ny+2); x.closePath(); x.fill();
  x.font='bold 22px Georgia,serif'; x.fillText('N',nx,ny-44);
  const name=pick(['HALCYON','WINTERFIELD','LOWER MERIDIAN','PROVIDENCE BEND','SALT GARDEN','VANISHING POINT','GREATER NOWHERE'],r);
  x.textAlign='center';
  x.font='30px Georgia,serif'; x.fillText('PLAT OF SURVEY',W/2,H-126);
  x.font='italic 24px Georgia,serif'; x.fillText('“'+name+' ADDITION”',W/2,H-92);
  x.font='16px Georgia,serif';
  x.fillText('SCALE 1″ = 100 FT · SURVEYED '+pick(['MAY','JUNE','OCT.','APR.'],r)+' '+rint(r,1871,1958)+' · '+pick(['E. SALT','J. CROW','M. VESPER','A. LOAM'],r)+', COUNTY SURVEYOR',W/2,H-58);
  x.lineWidth=1; x.strokeRect(M,H-166,W-2*M,130);
}

/* 5. RECEIPTS — wide/skinny, coloured papers + coloured ink */
function receipt(cv,seed){
  const r=rng(seed);
  const W=pick([380,560,560,920],r), s=W/560;
  const stock=pick([
    {paper:'#fbfaf4',ink:'40,40,46'},
    {paper:'#fff3b8',ink:'140,30,90'},
    {paper:'#ffd9e6',ink:'30,30,160'},
    {paper:'#d6ecff',ink:'160,30,30'},
    {paper:'#e8ffd9',ink:'20,90,40'},
    {paper:'#fbfaf4',ink:'90,20,140'},
  ],r);
  // half the till is ordinary groceries — the strange items share the receipt
  const NAMES=['SUNSET (PARTIAL)','ONE GOOD IDEA','BENEFIT OF THE DOUBT','A PLACE IN LINE','EYE CONTACT','THE LAST WORD','MILD REGRET','AN HOUR, GENTLY USED','SECOND CHANCE','PLAUSIBLE ALIBI','THE MOON (RENTAL)','ROOM TEMPERATURE','FORGOTTEN PASSWORD','APPLAUSE, CANNED','TOMORROW (DEPOSIT)'];
  const PLAIN=['MILK 2% 1L','BATTERIES AA 4PK','LOTTO QP','BREAD WHT SLCD','ICE 5LB','TAPE, CLEAR','LIGHTER REFILL','ENVELOPES #10','SOAP BAR 2CT','COFFEE GRND 340G','MATCHES','BLEACH 1L','NAILS 2IN 50CT','TWINE 30M'];
  const n=rint(r,3,22);
  const chosen=shuffle(shuffle(NAMES,r).slice(0,Math.ceil(n/2)).concat(shuffle(PLAIN,r).slice(0,Math.floor(n/2))),r);
  let sub=0; const items=[];
  chosen.forEach(nm=>{const q=r()<0.15?2:1, pr=+(0.25+r()*58).toFixed(2); sub+=q*pr; items.push({nm,q,pr});});
  const taxR=0.04+r()*0.07, tax=sub*taxR, tot=sub+tax;
  const lineH=34*s;
  const H=Math.round((210+n*34+170+120+110)*s+80);
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  x.fillStyle='#0c0c10'; x.fillRect(0,0,W,H);
  x.save();
  x.translate(W/2,H/2); x.rotate((r()-0.5)*0.03); x.translate(-W/2,-H/2);
  const px0=40*s, px1=W-40*s;
  x.beginPath(); x.moveTo(px0,46*s);
  for(let t=px0;t<=px1;t+=14*s) x.lineTo(t,(40+r()*14)*s);
  x.lineTo(px1,H-46*s);
  for(let t=px1;t>=px0;t-=14*s) x.lineTo(t,H-(40+r()*14)*s);
  x.closePath();
  x.fillStyle=stock.paper; x.shadowColor='rgba(0,0,0,0.6)'; x.shadowBlur=24; x.fill(); x.shadowBlur=0;
  for(let i=0;i<26;i++){x.fillStyle='rgba(120,120,110,'+(r()*0.05)+')';x.fillRect(px0+r()*(px1-px0),60*s,2,H-120*s);}
  const ink=a=>'rgba('+stock.ink+','+a+')';
  const mono=q=>{x.font=Math.round(q*s)+'px "Courier New",monospace';};
  let y=120*s;
  const store=pick(['MERCY GENERAL STORE','THE INVISIBLE HAND','ROYAL STANDARD CO.','DAWN & SONS','LAST CHANCE OUTLET','GOOD ENOUGH MART','PROVIDENCE SUNDRIES','HONEST WEIGHT','TERMINAL LUX','THE LONG NOW BODEGA'],r);
  x.textAlign='center'; x.fillStyle=ink(0.9); mono(26);
  x.fillText(store,W/2,y); y+=30*s;
  mono(17); x.fillStyle=ink(0.7);
  x.fillText(rint(r,2,990)+' '+pick(['LOWER MERIDIAN RD','SALT GARDEN AVE','VANISHING PT','EAST OF EAST ST','MEMORY LN'],r),W/2,y); y+=24*s;
  x.fillText('REG 0'+rint(r,1,8)+' · CLERK: '+pick(['MILO','EDIE','RAY','NOBODY','V.','THE OWL'],r),W/2,y); y+=24*s;
  x.fillText(rint(r,1,12)+'/'+rint(r,1,28)+'/'+rint(r,1989,2044)+'  '+rint(r,0,23).toString().padStart(2,'0')+':'+rint(r,0,59).toString().padStart(2,'0'),W/2,y); y+=20*s;
  x.fillText('················································',W/2,y); y+=30*s;
  mono(19);
  items.forEach(it=>{
    const a=0.55+r()*0.4;
    x.fillStyle=ink(a); x.textAlign='left';
    x.fillText(it.q+'x '+it.nm.slice(0,W>700?34:24),px0+28*s,y);
    x.textAlign='right'; x.fillText((it.q*it.pr).toFixed(2),px1-28*s,y);
    y+=lineH;
  });
  y+=8*s; x.textAlign='center'; x.fillStyle=ink(0.7); mono(17);
  x.fillText('················································',W/2,y); y+=32*s;
  const row=(l,v,b)=>{x.fillStyle=ink(b?0.95:0.7);x.textAlign='left';mono(b?22:19);x.fillText(l,px0+28*s,y);x.textAlign='right';x.fillText(v,px1-28*s,y);y+=(b?38:30)*s;};
  row('SUBTOTAL',sub.toFixed(2));
  row('TAX ('+(taxR*100).toFixed(1)+'%)',tax.toFixed(2));
  row('TOTAL',tot.toFixed(2),true);
  row(pick(['CASH','CARD ****'+rint(r,1000,9999),'STORE CREDIT','EXACT CHANGE','BARTER'],r),tot.toFixed(2));
  y+=14*s; let bx=px0+60*s;
  x.fillStyle=ink(0.9);
  while(bx<px1-70*s){const bw=rint(r,1,4)*2*s;x.fillRect(bx,y,bw,72*s);bx+=bw+rint(r,2,7)*s;}
  y+=100*s; x.textAlign='center'; mono(16); x.fillStyle=ink(0.7);
  x.fillText(pick(['THANK YOU — NO REFUNDS ON TIME','RETURNS ACCEPTED IN DREAMS ONLY','YOU WERE HERE','HAVE THE DAY YOU DESERVE','ALL SALES ARE MEMORIES','PLEASE COME BACK AS YOURSELF'],r),W/2,y);
  x.restore();
}

/* 7. LOOM — electric textiles */
function loom(cv,seed){
  const r=rng(seed), W=1000;
  const H=pick([840,1180,1000],r), T=pick([5,6,8,11,14],r);
  cv.width=W; cv.height=H+70;
  const x=cv.getContext('2d');
  x.fillStyle='#0c0c10'; x.fillRect(0,0,W,H+70);
  const pal=pick([
    {g:'#22325e',d:'#e8e2d0',a:'#a23b34'},
    {g:'#1a0533',d:'#ff2bd1',a:'#00e5c0'},
    {g:'#0d1c4a',d:'#ffd514',a:'#ff4d2e'},
    {g:'#7a2a22',d:'#e8d9b8',a:'#27343f'},
    {g:'#0f3a2e',d:'#c8ff00',a:'#ff2b6e'},
    {g:'#2b0d5e',d:'#ff7a2b',a:'#36c8c0'},
    {g:'#0c2a4a',d:'#7fd8c8',a:'#ffd514'},
    {g:'#3a0a1c',d:'#ff9ad1',a:'#c8ff00'},
    {g:'#102014',d:'#e8e2d0',a:'#ff5500'},
    {g:'#1c1c24',d:'#00e5ff',a:'#d61a3c'},
  ],r);
  const cols=Math.floor(W/T), rows=Math.floor(H/T);
  const off=[]; let o=0;
  for(let c=0;c<cols;c++){o+=(r()-0.5)*1.6;o*=0.92;off.push(o);}
  const P=rint(r,14,64), thr=P*(0.26+r()*0.22);
  const twill=r()<0.5;
  const motif=pick(['diamond','chevron','band','block'],r);
  function isDesign(c,row){
    const yy=row+off[c];
    if(motif==='diamond') return (Math.abs((yy%P)-P/2)+Math.abs((c%P)-P/2))<thr;
    if(motif==='chevron') return Math.abs(((yy+Math.abs((c%(P*2))-P)*0.8)%P)-P/2)<thr*0.5;
    if(motif==='block') return ((Math.floor(yy/P)+Math.floor(c/P))%2)===0;
    return Math.abs((yy%P)-P/2)<thr*0.45;
  }
  const accP=0.08+r()*0.32;
  const bands=[]; let bp=0;
  while(bp<rows){const len=rint(r,3,26);const isAcc=r()<accP;bands.push({s:bp,e:bp+len,acc:isAcc});bp+=len;}
  function weftAcc(row){for(const b of bands){if(row>=b.s&&row<b.e)return b.acc;}return false;}
  for(let row=0;row<rows;row++){
    for(let c=0;c<cols;c++){
      const warpTop= twill ? ((c+row*2)%4<2) : ((c+row)%2===0);
      const edge=c<2||c>cols-3;
      let col;
      if(warpTop) col= edge?pal.a : (isDesign(c,row)?pal.d:pal.g);
      else col= weftAcc(row)?pal.a:shade(pal.g,-14);
      const jit=Math.floor((hash2(c,row)-0.5)*26);
      x.fillStyle=shade(col,jit);
      x.fillRect(c*T,row*T,T-1,T-1);
    }
  }
  for(let row=0;row<rows;row+=2){x.fillStyle='rgba(255,255,255,0.018)';x.fillRect(0,row*T,W,T);}
  for(let c=0;c<cols;c++){
    const fc= c<2||c>cols-3 ? pal.a : (isDesign(c,rows-1)?pal.d:pal.g);
    x.strokeStyle=shade(fc,Math.floor((hash2(c,9999)-0.5)*30));
    x.lineWidth=T*0.45;
    x.beginPath();
    const bxx=c*T+T/2;
    x.moveTo(bxx,H);
    x.quadraticCurveTo(bxx+(hash2(c,777)-0.5)*22,H+34,bxx+(hash2(c,555)-0.5)*30,H+62);
    x.stroke();
  }
}

/* 8. CORE — strata, classic paper or UV mineral log */
function core(cv,seed){
  const r=rng(seed);
  const two=r()<0.35;
  const W=two?880:560, H=1400;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const uv=r()<0.45;
  const paper= uv?'#0d1016':'#f3eee0', inkc= uv?'#cfe8ff':'#33302a';
  x.fillStyle=paper; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H, uv?'180,220,255':'90,70,40',700);
  const LITHS= uv?[
    {n:'MALACHITE',c:'#1fb874',t:'dots'},
    {n:'AZURITE',c:'#2b6bd8',t:'dash'},
    {n:'SULFUR',c:'#ffd514',t:'brick'},
    {n:'COAL',c:'#15151c',t:'solid'},
    {n:'CINNABAR',c:'#e03224',t:'diag'},
    {n:'FLUORITE',c:'#9a4be0',t:'pebble'},
    {n:'OPALINE',c:'#36c8c0',t:'x'},
  ]:[
    {n:'SANDSTONE',c:'#e8c878',t:'dots'},
    {n:'SHALE',c:'#8aa4b8',t:'dash'},
    {n:'LIMESTONE',c:'#d8d0b0',t:'brick'},
    {n:'COAL',c:'#2e2b28',t:'solid'},
    {n:'RED CLAY',c:'#d4734a',t:'diag'},
    {n:'GRAVEL',c:'#c2b9a4',t:'pebble'},
    {n:'ASH',c:'#b9b3a8',t:'x'},
  ];
  function drawCol(cx0,cw,colSeed){
    const rr=rng(colSeed);
    const cy0=130, ch=H-280;
    const layers=[]; let acc=0;
    const nl=rint(rr,9,15);
    for(let i=0;i<nl;i++){layers.push({h:6+Math.pow(rr(),1.6)*150,l:pick(LITHS,rr)});acc+=layers[layers.length-1].h;}
    layers.forEach(l=>l.h=l.h/acc*ch);
    const faulted=rr()<0.4, faultY=cy0+ch*(0.3+rr()*0.4), faultOff=18+rr()*26;
    function sx(yy){return faulted&&yy>faultY?faultOff:0;}
    let y=cy0;
    layers.forEach((l)=>{
      const y1=y, y2=y+l.h, s1=sx(y1+1), s2=sx(y2-1);
      x.fillStyle=l.l.c;
      x.beginPath();
      x.moveTo(cx0+s1,y1);x.lineTo(cx0+cw+s1,y1);
      x.lineTo(cx0+cw+s2,y2);x.lineTo(cx0+s2,y2);x.closePath();x.fill();
      x.save();x.beginPath();
      x.moveTo(cx0+s1,y1);x.lineTo(cx0+cw+s1,y1);x.lineTo(cx0+cw+s2,y2);x.lineTo(cx0+s2,y2);x.closePath();x.clip();
      const tex= uv?'rgba(10,12,18,0.5)':'rgba(40,35,25,0.5)';
      x.strokeStyle=tex; x.fillStyle=tex; x.lineWidth=0.8;
      const s=(y1+y2)/2>faultY&&faulted?faultOff:0;
      if(l.l.t==='dots'){for(let i=0;i<l.h*cw/110;i++){x.fillRect(cx0+s+rr()*cw,y1+rr()*l.h,1.6,1.6);}}
      if(l.l.t==='dash'){for(let yy=y1+5;yy<y2;yy+=9){for(let bx=cx0+s+6+(yy%18);bx<cx0+s+cw-12;bx+=26){x.beginPath();x.moveTo(bx,yy);x.lineTo(bx+14,yy);x.stroke();}}}
      if(l.l.t==='brick'){for(let yy=y1;yy<y2;yy+=14){x.beginPath();x.moveTo(cx0+s,yy);x.lineTo(cx0+s+cw,yy);x.stroke();for(let bx=cx0+s+((yy/14)%2)*30;bx<cx0+s+cw;bx+=60){x.beginPath();x.moveTo(bx,yy);x.lineTo(bx,Math.min(yy+14,y2));x.stroke();}}}
      if(l.l.t==='diag'){for(let bx=cx0+s-l.h;bx<cx0+s+cw;bx+=12){x.beginPath();x.moveTo(bx,y2);x.lineTo(bx+l.h,y1);x.stroke();}}
      if(l.l.t==='pebble'){for(let i=0;i<l.h*cw/700;i++){x.beginPath();x.arc(cx0+s+6+rr()*(cw-12),y1+4+rr()*(l.h-8),2+rr()*3.5,0,6.29);x.stroke();}}
      if(l.l.t==='x'){for(let i=0;i<l.h*cw/600;i++){const ax=cx0+s+6+rr()*(cw-12),ay=y1+4+rr()*(l.h-8);x.beginPath();x.moveTo(ax-3,ay-3);x.lineTo(ax+3,ay+3);x.moveTo(ax-3,ay+3);x.lineTo(ax+3,ay-3);x.stroke();}}
      x.restore();
      x.strokeStyle=inkc; x.lineWidth=1.1;
      x.beginPath();
      for(let bx=0;bx<=cw;bx+=8){
        const yy=y2+Math.sin(bx*0.08+y2)*2.2;
        bx===0?x.moveTo(cx0+sx(y2-1)+bx,yy):x.lineTo(cx0+sx(y2-1)+bx,yy);
      }
      x.stroke();
      y=y2;
    });
    if(faulted){
      x.strokeStyle=inkc;x.lineWidth=2;
      x.beginPath();x.moveTo(cx0-8,faultY-10);x.lineTo(cx0+cw+faultOff+8,faultY+12);x.stroke();
    }
    x.strokeStyle=inkc; x.lineWidth=2;
    x.strokeRect(cx0,cy0,cw,ch);
    return layers;
  }
  const cy0=130, ch=H-280;
  const cw= two?200:240;
  const cx0= two?150:170;
  const layers=drawCol(cx0,cw,seed*3+1);
  if(two) drawCol(cx0+cw+120,cw,seed*3+2);
  x.strokeStyle=inkc; x.fillStyle=inkc;
  x.lineWidth=1; x.font='15px "Courier New",monospace'; x.textAlign='right';
  x.beginPath();x.moveTo(cx0-26,cy0);x.lineTo(cx0-26,cy0+ch);x.stroke();
  const d0=rint(r,80,900), tickM=12;
  for(let g=0;g<=10;g++){
    const yy=cy0+ch*g/10;
    x.beginPath();x.moveTo(cx0-34,yy);x.lineTo(cx0-26,yy);x.stroke();
    x.fillText((d0+g*tickM).toFixed(0),cx0-42,yy+5);
  }
  if(!two){
    x.textAlign='left'; x.font='15px "Courier New",monospace';
    let yy=cy0;
    layers.forEach(l=>{
      if(l.h>52){
        x.beginPath();x.moveTo(cx0+cw+6,yy+l.h/2);x.lineTo(cx0+cw+58,yy+l.h/2);x.stroke();
        x.fillText(l.l.n,cx0+cw+64,yy+l.h/2+5);
      }
      yy+=l.h;
    });
  }
  x.textAlign='center'; x.font='24px "Courier New",monospace';
  x.fillText('BOREHOLE '+String.fromCharCode(65+rint(r,0,25))+String.fromCharCode(65+rint(r,0,25))+'-'+rint(r,1,99).toString().padStart(2,'0'),W/2,64);
  x.font='15px "Courier New",monospace';
  x.fillText('SHEET '+rint(r,1,9)+'/'+rint(r,9,24)+' · DRILLED '+rint(r,1902,2041),W/2,92);

}
/* ============ 10 new colour-forward projects ============ */

/* 9. STAMP — postage of imaginary nations */
function stamp(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:760,H:920},{W:920,H:760},{W:840,H:840}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const album=pick(['#1c2440','#1c1c24','#10221c'],r);
  x.fillStyle=album; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H,'255,240,200',500);
  const field=pick(['#d61a3c','#1d4fb8','#0f8a3c','#ff7a2b','#7a00cc','#d61a8c','#ffaa00','#008f8f'],r);
  const inkc=pick(['#fff8e8','#14141c'],r);
  const M=90;
  const sx0=M, sy0=M, sw=W-2*M, sh=H-2*M;
  // perforated white blank
  x.fillStyle='#f4f0e2';
  x.fillRect(sx0,sy0,sw,sh);
  x.fillStyle=album;
  const per=pick([18,22,28],r);
  for(let t=sx0+per/2;t<sx0+sw;t+=per){
    x.beginPath();x.arc(t,sy0,7,0,6.29);x.fill();
    x.beginPath();x.arc(t,sy0+sh,7,0,6.29);x.fill();
  }
  for(let t=sy0+per/2;t<sy0+sh;t+=per){
    x.beginPath();x.arc(sx0,t,7,0,6.29);x.fill();
    x.beginPath();x.arc(sx0+sw,t,7,0,6.29);x.fill();
  }
  // colour field
  const m2=26;
  x.fillStyle=field; x.fillRect(sx0+m2,sy0+m2,sw-2*m2,sh-2*m2);
  // engraving shading lines across field
  x.strokeStyle='rgba(0,0,0,0.18)'; x.lineWidth=1;
  for(let yy=sy0+m2+4;yy<sy0+sh-m2;yy+=4){x.beginPath();x.moveTo(sx0+m2,yy);x.lineTo(sx0+sw-m2,yy);x.stroke();}
  // inner frame — house styles vary
  const fr=pick(['double','thick','dash'],r);
  x.strokeStyle=inkc;
  if(fr==='double'){
    x.lineWidth=3; x.strokeRect(sx0+m2+10,sy0+m2+10,sw-2*m2-20,sh-2*m2-20);
    x.lineWidth=1; x.strokeRect(sx0+m2+16,sy0+m2+16,sw-2*m2-32,sh-2*m2-32);
  } else if(fr==='thick'){
    x.lineWidth=8; x.strokeRect(sx0+m2+14,sy0+m2+14,sw-2*m2-28,sh-2*m2-28);
  } else {
    x.lineWidth=2.4; x.setLineDash([12,8]);
    x.strokeRect(sx0+m2+12,sy0+m2+12,sw-2*m2-24,sh-2*m2-24); x.setLineDash([]);
  }
  // vignette
  const ccx=W/2, ccy=H/2+6;
  const motif=pick(['peak','ship','beacon','bird','cog','wave','star2','tree'],r);
  x.strokeStyle=inkc; x.fillStyle=inkc; x.lineWidth=2.4;
  if(motif==='peak'){
    x.beginPath();x.moveTo(ccx-130,ccy+80);x.lineTo(ccx-30,ccy-90);x.lineTo(ccx+20,ccy-10);x.lineTo(ccx+60,ccy-60);x.lineTo(ccx+140,ccy+80);x.closePath();x.stroke();
    x.beginPath();x.moveTo(ccx-52,ccy-52);x.lineTo(ccx-30,ccy-90);x.lineTo(ccx-6,ccy-50);x.lineTo(ccx-20,ccy-38);x.closePath();x.fill();
    x.beginPath();x.arc(ccx+90,ccy-80,26,0,6.29);x.stroke();
    for(let i=0;i<12;i++){const a=i/12*6.283;x.beginPath();x.moveTo(ccx+90+Math.cos(a)*32,ccy-80+Math.sin(a)*32);x.lineTo(ccx+90+Math.cos(a)*44,ccy-80+Math.sin(a)*44);x.stroke();}
  } else if(motif==='ship'){
    x.beginPath();x.moveTo(ccx-110,ccy+40);x.lineTo(ccx+110,ccy+40);x.lineTo(ccx+78,ccy+78);x.lineTo(ccx-78,ccy+78);x.closePath();x.fill();
    x.beginPath();x.moveTo(ccx-20,ccy+38);x.lineTo(ccx-20,ccy-86);x.lineTo(ccx-88,ccy+30);x.closePath();x.stroke();
    x.beginPath();x.moveTo(ccx-8,ccy+38);x.lineTo(ccx-8,ccy-96);x.lineTo(ccx+86,ccy+26);x.closePath();x.stroke();
    for(let i=0;i<3;i++){x.beginPath();x.moveTo(ccx-130+i*8,ccy+58+i*8);x.lineTo(ccx+130-i*8,ccy+58+i*8);x.stroke();}
  } else if(motif==='beacon'){
    x.beginPath();x.moveTo(ccx-30,ccy+84);x.lineTo(ccx-18,ccy-60);x.lineTo(ccx+18,ccy-60);x.lineTo(ccx+30,ccy+84);x.closePath();x.stroke();
    for(let i=0;i<4;i++){x.beginPath();x.moveTo(ccx-27+i*2,ccy+50-i*30);x.lineTo(ccx+27-i*2,ccy+50-i*30);x.stroke();}
    x.strokeRect(ccx-14,ccy-86,28,26);
    x.beginPath();x.moveTo(ccx-22,ccy-73);x.lineTo(ccx-78,ccy-95);x.moveTo(ccx+22,ccy-73);x.lineTo(ccx+78,ccy-95);x.stroke();
    x.beginPath();x.moveTo(ccx-90,ccy+84);x.lineTo(ccx+90,ccy+84);x.stroke();
  } else if(motif==='bird'){
    x.beginPath();x.moveTo(ccx-100,ccy);x.quadraticCurveTo(ccx-40,ccy-90,ccx+6,ccy-18);x.quadraticCurveTo(ccx+50,ccy-80,ccx+104,ccy-50);x.quadraticCurveTo(ccx+60,ccy-30,ccx+40,ccy+10);x.quadraticCurveTo(ccx+10,ccy+60,ccx-40,ccy+50);x.quadraticCurveTo(ccx-80,ccy+40,ccx-100,ccy);x.closePath();x.stroke();
    x.beginPath();x.arc(ccx+18,ccy-4,4,0,6.29);x.fill();
  } else if(motif==='wave'){
    x.lineWidth=5;
    for(let i=0;i<3;i++){
      x.beginPath();
      x.moveTo(ccx-130,ccy-30+i*42);
      for(let t=0;t<=260;t+=10) x.lineTo(ccx-130+t,ccy-30+i*42+Math.sin(t/26+i)*14);
      x.stroke();
    }
    x.beginPath();x.arc(ccx+80,ccy-80,26,0,6.29);x.stroke();
  } else if(motif==='star2'){
    star(x,ccx,ccy-10,72,5);
    x.lineWidth=2;
    x.beginPath();x.arc(ccx,ccy-10,92,0,6.29);x.stroke();
  } else if(motif==='tree'){
    for(let i=0;i<3;i++){
      x.beginPath();
      x.moveTo(ccx-90+i*26,ccy+60-i*44); x.lineTo(ccx,ccy-110-i*8); x.lineTo(ccx+90-i*26,ccy+60-i*44);
      x.closePath(); x.stroke();
    }
    x.fillRect(ccx-9,ccy+60,18,30);
  } else {
    x.beginPath();x.arc(ccx,ccy,64,0,6.29);x.stroke();
    for(let i=0;i<10;i++){const a=i/10*6.283;
      x.beginPath();x.moveTo(ccx+Math.cos(a)*64,ccy+Math.sin(a)*64);x.lineTo(ccx+Math.cos(a)*86,ccy+Math.sin(a)*86);x.stroke();}
    x.beginPath();x.arc(ccx,ccy,30,0,6.29);x.stroke();
  }
  // country + value
  const nation=pick(['NIEBLA','SOUTH REACH','MERIDIA','VESPERTINE REPUBLIC','LACERTA','THE LESSER MOONS','PROVIDENCIA'],r);
  x.fillStyle=inkc; x.textAlign='center';
  x.font='bold 38px Georgia,serif';
  x.fillText(nation,W/2,sy0+m2+62);
  const val=pick([1,2,4,5,10,15,25,40,80],r);
  x.font='bold 64px Georgia,serif';
  x.fillText(val,sx0+m2+58,sy0+sh-m2-38);
  x.font='17px Georgia,serif';
  x.fillText(pick(['POSTAGE','CORREOS','POSTES','AIR MAIL'],r),W/2,sy0+sh-m2-36);
  // overprint sometimes
  if(r()<0.3){
    x.save(); x.translate(W/2,H/2); x.rotate(-0.3);
    x.font='bold 56px "Courier New",monospace';
    x.fillStyle='rgba(214,26,60,0.75)';
    x.fillText(pick(['SPECIMEN','1 FLORIN','VOID','OCCUPATION'],r),0,0);
    x.restore();
  }
}

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
function matchbook(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:840,H:1100},{W:1100,H:840}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sch=pick([
    {bg:'#cfe8f0',a:'#d61a3c',b:'#1d4fb8',ink:'#1c1024'},
    {bg:'#d8f0d8',a:'#0f8a3c',b:'#ff5500',ink:'#142014'},
    {bg:'#fbe8e0',a:'#7a00cc',b:'#ffaa00',ink:'#240a30'},
    {bg:'#e2f0e8',a:'#e0202e',b:'#14649c',ink:'#101c24'},
    {bg:'#f2f2f4',a:'#d61a8c',b:'#0fa8a0',ink:'#2a0a1c'},
    {bg:'#b8a8e8',a:'#2a1040',b:'#ffd514',ink:'#1c1024'},
    {bg:'#ffd6e4',a:'#0a3d7a',b:'#0fa8a0',ink:'#2a0a1c'},
    {bg:'#d8f0f4',a:'#ff5500',b:'#1d2bd6',ink:'#102024'},
    {bg:'#f2f2e0',a:'#0f8a3c',b:'#d61a8c',ink:'#142014'},
    {bg:'#1c2440',a:'#ffd514',b:'#ff2b6e',ink:'#f2ead0'},
  ],r);
  x.fillStyle='#181318'; x.fillRect(0,0,W,H);
  const M=70;
  x.fillStyle=sch.bg; x.fillRect(M,M,W-2*M,H-2*M);
  paperNoise(x,r,W,H,'80,50,20',700);
  const mis=()=> (r()-0.5)*9; // misregistration offset
  // border decorations
  x.strokeStyle=sch.a; x.lineWidth=8; x.strokeRect(M+18+mis(),M+18+mis(),W-2*M-36,H-2*M-36);
  x.strokeStyle=sch.ink; x.lineWidth=2.4; x.strokeRect(M+18,M+18,W-2*M-36,H-2*M-36);
  x.strokeStyle=sch.b; x.lineWidth=2; x.setLineDash([12,6]);
  x.strokeRect(M+38,M+38,W-2*M-76,H-2*M-76); x.setLineDash([]);
  const ccx=W/2, ccy=H/2+10, R=Math.min(W,H)*0.21;
  const motif=pick(['sun','moon','eye','anchor','bolt','elephant'],r);
  // colour blob behind motif, offset (cheap print)
  x.fillStyle=sch.b; x.globalAlpha=0.85;
  x.beginPath(); x.arc(ccx+mis()*1.6,ccy+mis()*1.6,R*1.25,0,6.29); x.fill(); x.globalAlpha=1;
  x.strokeStyle=sch.ink; x.fillStyle=sch.a; x.lineWidth=4;
  if(motif==='sun'){
    const ox=mis(),oy=mis();
    x.beginPath(); x.arc(ccx+ox,ccy+oy,R*0.62,0,6.29); x.fill();
    x.beginPath(); x.arc(ccx,ccy,R*0.62,0,6.29); x.stroke();
    for(let i=0;i<16;i++){const a=i/16*6.283;
      x.beginPath();x.moveTo(ccx+Math.cos(a)*R*0.74,ccy+Math.sin(a)*R*0.74);
      x.lineTo(ccx+Math.cos(a)*R*(i%2?0.95:1.1),ccy+Math.sin(a)*R*(i%2?0.95:1.1));x.stroke();}
    // face
    x.fillStyle=sch.ink;
    x.beginPath();x.arc(ccx-R*0.2,ccy-R*0.1,5,0,6.29);x.fill();
    x.beginPath();x.arc(ccx+R*0.2,ccy-R*0.1,5,0,6.29);x.fill();
    x.lineWidth=3;x.beginPath();x.arc(ccx,ccy+R*0.12,R*0.22,0.3,2.84);x.stroke();
  } else if(motif==='moon'){
    const ox=mis(),oy=mis();
    x.beginPath(); x.arc(ccx+ox,ccy+oy,R*0.66,0,6.29); x.fill();
    x.fillStyle=sch.bg;
    x.beginPath(); x.arc(ccx+R*0.3+ox,ccy-R*0.12+oy,R*0.52,0,6.29); x.fill();
    x.strokeStyle=sch.ink;x.lineWidth=4;
    x.beginPath(); x.arc(ccx,ccy,R*0.66,1.2,5.2); x.stroke();
    // star
    x.fillStyle=sch.ink;
    star(x,ccx+R*0.55,ccy-R*0.4,R*0.16,5);
  } else if(motif==='eye'){
    const ox=mis(),oy=mis();
    x.beginPath();x.moveTo(ccx-R+ox,ccy+oy);x.quadraticCurveTo(ccx+ox,ccy-R*0.85+oy,ccx+R+ox,ccy+oy);x.quadraticCurveTo(ccx+ox,ccy+R*0.85+oy,ccx-R+ox,ccy+oy);x.closePath();x.fill();
    x.strokeStyle=sch.ink;
    x.beginPath();x.moveTo(ccx-R,ccy);x.quadraticCurveTo(ccx,ccy-R*0.85,ccx+R,ccy);x.quadraticCurveTo(ccx,ccy+R*0.85,ccx-R,ccy);x.closePath();x.stroke();
    x.fillStyle=sch.ink; x.beginPath();x.arc(ccx,ccy,R*0.34,0,6.29);x.fill();
    x.fillStyle=sch.bg; x.beginPath();x.arc(ccx+R*0.1,ccy-R*0.1,R*0.09,0,6.29);x.fill();
    for(let i=0;i<10;i++){const a=i/10*6.283;
      x.strokeStyle=sch.ink;x.lineWidth=3;
      x.beginPath();x.moveTo(ccx+Math.cos(a)*R*1.06,ccy+Math.sin(a)*R*0.92);
      x.lineTo(ccx+Math.cos(a)*R*1.2,ccy+Math.sin(a)*R*1.05);x.stroke();}
  } else if(motif==='anchor'){
    const ox=mis(),oy=mis();
    x.lineWidth=R*0.16; x.strokeStyle=sch.a; x.lineCap='round';
    x.beginPath();x.moveTo(ccx+ox,ccy-R*0.7+oy);x.lineTo(ccx+ox,ccy+R*0.5+oy);x.stroke();
    x.beginPath();x.arc(ccx+ox,ccy+R*0.3+oy,R*0.55,0.3,2.84);x.stroke();
    x.beginPath();x.arc(ccx+ox,ccy-R*0.78+oy,R*0.16,0,6.29);x.stroke();
    x.lineWidth=R*0.1;x.beginPath();x.moveTo(ccx-R*0.4+ox,ccy-R*0.36+oy);x.lineTo(ccx+R*0.4+ox,ccy-R*0.36+oy);x.stroke();
    x.lineWidth=4; x.strokeStyle=sch.ink; x.lineCap='butt';
    x.beginPath();x.moveTo(ccx,ccy-R*0.7);x.lineTo(ccx,ccy+R*0.5);x.stroke();
    x.beginPath();x.arc(ccx,ccy+R*0.3,R*0.55,0.3,2.84);x.stroke();
  } else if(motif==='bolt'){
    const ox=mis(),oy=mis();
    function boltPath(dx,dy){
      x.beginPath();
      x.moveTo(ccx-R*0.18+dx,ccy-R*0.9+dy);x.lineTo(ccx+R*0.34+dx,ccy-R*0.9+dy);
      x.lineTo(ccx+R*0.04+dx,ccy-R*0.15+dy);x.lineTo(ccx+R*0.4+dx,ccy-R*0.15+dy);
      x.lineTo(ccx-R*0.25+dx,ccy+R*0.9+dy);x.lineTo(ccx+R*0.0+dx,ccy+R*0.1+dy);
      x.lineTo(ccx-R*0.34+dx,ccy+R*0.1+dy);x.closePath();
    }
    boltPath(ox,oy); x.fill();
    boltPath(0,0); x.stroke();
  } else { // elephant, blocky silhouette
    const ox=mis(),oy=mis();
    function ele(dx,dy,fill){
      x.beginPath();
      x.moveTo(ccx-R*0.9+dx,ccy+R*0.6+dy);
      x.lineTo(ccx-R*0.9+dx,ccy-R*0.1+dy);
      x.quadraticCurveTo(ccx-R*0.8+dx,ccy-R*0.7+dy,ccx-R*0.1+dx,ccy-R*0.7+dy);
      x.quadraticCurveTo(ccx+R*0.5+dx,ccy-R*0.75+dy,ccx+R*0.62+dx,ccy-R*0.3+dy);
      x.quadraticCurveTo(ccx+R*0.95+dx,ccy-R*0.25+dy,ccx+R*0.9+dx,ccy+R*0.25+dy);
      x.lineTo(ccx+R*0.78+dx,ccy+R*0.2+dy);
      x.lineTo(ccx+R*0.74+dx,ccy+R*0.62+dy);
      x.lineTo(ccx+R*0.5+dx,ccy+R*0.62+dy);
      x.lineTo(ccx+R*0.46+dx,ccy+R*0.18+dy);
      x.lineTo(ccx-R*0.5+dx,ccy+R*0.18+dy);
      x.lineTo(ccx-R*0.56+dx,ccy+R*0.62+dy);
      x.lineTo(ccx-R*0.78+dx,ccy+R*0.62+dy);
      x.closePath();
      if(fill)x.fill();else x.stroke();
    }
    ele(ox,oy,true); ele(0,0,false);
    x.fillStyle=sch.bg; x.beginPath();x.arc(ccx-R*0.45,ccy-R*0.35,4.5,0,6.29);x.fill();
  }
  // type
  const brand=pick(['GOLDEN EYE','TWO ANCHORS','LUCKY METEOR','ROYAL ELEPHANT','NIGHT SUN','THE COMET','HONEST WEIGHT'],r);
  x.fillStyle=sch.ink; x.textAlign='center';
  x.font='bold '+Math.round(W*0.065)+'px Georgia,serif';
  x.fillText(brand,W/2,M+96);
  x.fillStyle=sch.a;
  x.font='bold '+Math.round(W*0.026)+'px Georgia,serif';
  x.fillText('SAFETY MATCHES',W/2,H-M-90);
  x.fillStyle=sch.ink; x.font=Math.round(W*0.019)+'px Georgia,serif';
  x.fillText('AVG. CONTENTS '+rint(r,38,52),W/2,H-M-56);
  // price badge
  x.fillStyle=sch.b;
  star(x,W-M-72,M+86,46,12);
  x.fillStyle=sch.bg; x.font='bold 26px Georgia,serif';
  x.fillText(rint(r,1,15)+'¢',W-M-72,M+95);
}
function star(x,cx,cy,R,n){
  x.beginPath();
  for(let i=0;i<n*2;i++){
    const a=i/(n*2)*6.283-1.5708, rr=i%2?R*0.45:R;
    const px=cx+Math.cos(a)*rr, py=cy+Math.sin(a)*rr;
    i===0?x.moveTo(px,py):x.lineTo(px,py);
  }
  x.closePath(); x.fill();
}

/* 15. PACKET — seed packets, guaranteed to grow */
function packet(cv,seed){
  const r=rng(seed), W=840, H=1100;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  x.fillStyle='#1a1612'; x.fillRect(0,0,W,H);
  const sch=pick([
    {bg:'#ffaa00',pl:'#d61a3c',lf:'#0f8a3c',ink:'#2a1408'},
    {bg:'#2bb8e8',pl:'#ffd514',lf:'#0f6a3c',ink:'#0a1c2a'},
    {bg:'#e84e5e',pl:'#ffe9c8',lf:'#14501c',ink:'#2a0a10'},
    {bg:'#0f8a3c',pl:'#ff7a2b',lf:'#c8ff00',ink:'#0a2010'},
    {bg:'#bcd8f0',pl:'#c83264',lf:'#3a9c4a',ink:'#241810'},
    {bg:'#b8a8e8',pl:'#ffd514',lf:'#0f6a3c',ink:'#1c1024'},
    {bg:'#14141c',pl:'#ff7a2b',lf:'#c8ff00',ink:'#f2ead0'},
    {bg:'#7fd8c8',pl:'#d61a3c',lf:'#10501c',ink:'#0a2024'},
  ],r);
  const M=60;
  // packet with flap
  x.fillStyle=sch.bg;
  x.fillRect(M,M+40,W-2*M,H-2*M-40);
  x.fillStyle=shade(sch.bg,-22);
  x.beginPath(); x.moveTo(M,M+40); x.lineTo(W/2,M); x.lineTo(W-M,M+40); x.closePath(); x.fill();
  x.strokeStyle=sch.ink; x.lineWidth=2.4;
  x.strokeRect(M,M+40,W-2*M,H-2*M-40);
  x.beginPath(); x.moveTo(M,M+40); x.lineTo(W/2,M); x.lineTo(W-M,M+40); x.stroke();
  paperNoise(x,r,W,H,'60,40,20',500);
  const plant=pick(['radish','carrot','sunflower','tulip','tomato','peas','chili','beet','corn'],r);
  const ccx=W/2, ccy=H*0.52;
  x.lineWidth=4;
  if(plant==='radish'){
    x.fillStyle=sch.pl;
    x.beginPath();x.arc(ccx,ccy+30,120,0,6.29);x.fill();
    x.strokeStyle=sch.ink;x.beginPath();x.arc(ccx,ccy+30,120,0,6.29);x.stroke();
    x.strokeStyle=sch.ink; x.lineWidth=5;
    x.beginPath();x.moveTo(ccx,ccy+150);x.quadraticCurveTo(ccx+8,ccy+185,ccx-4,ccy+200);x.stroke();
    x.fillStyle=sch.lf; x.lineWidth=4;
    for(let i=-1;i<=1;i++){
      x.beginPath();x.moveTo(ccx,ccy-80);
      x.quadraticCurveTo(ccx+i*90,ccy-200,ccx+i*36,ccy-216);
      x.quadraticCurveTo(ccx+i*10-12,ccy-160,ccx-8,ccy-82);x.closePath();x.fill();
      x.strokeStyle=sch.ink;x.stroke();
    }
    x.fillStyle='rgba(255,255,255,0.35)';
    x.beginPath();x.arc(ccx-42,ccy-6,30,0,6.29);x.fill();
  } else if(plant==='carrot'){
    x.fillStyle=sch.pl;
    x.beginPath();x.moveTo(ccx-66,ccy-70);x.quadraticCurveTo(ccx,ccy-110,ccx+66,ccy-70);x.lineTo(ccx+8,ccy+190);x.quadraticCurveTo(ccx,ccy+205,ccx-8,ccy+190);x.closePath();x.fill();
    x.strokeStyle=sch.ink;x.stroke();
    x.lineWidth=3;
    for(let i=0;i<4;i++){const yy=ccy-20+i*52;
      x.beginPath();x.moveTo(ccx-52+i*7,yy);x.lineTo(ccx+52-i*7,yy);x.stroke();}
    x.fillStyle=sch.lf;x.lineWidth=4;
    for(let i=-1;i<=1;i++){
      x.beginPath();x.moveTo(ccx+i*16,ccy-92);
      x.quadraticCurveTo(ccx+i*110,ccy-190,ccx+i*60,ccy-230);
      x.quadraticCurveTo(ccx+i*16-10,ccy-170,ccx+i*4-8,ccy-94);x.closePath();x.fill();
      x.strokeStyle=sch.ink;x.stroke();
    }
  } else if(plant==='sunflower'){
    x.fillStyle=sch.pl;
    for(let i=0;i<16;i++){const a=i/16*6.283;
      x.beginPath();
      x.ellipse(ccx+Math.cos(a)*120,ccy+Math.sin(a)*120,52,22,a,0,6.29);
      x.fill();x.strokeStyle=sch.ink;x.lineWidth=2.6;x.stroke();}
    x.fillStyle=shade(sch.ink,30);
    x.beginPath();x.arc(ccx,ccy,86,0,6.29);x.fill();
    x.strokeStyle=sch.ink;x.lineWidth=4;x.stroke();
    x.fillStyle=sch.bg;
    for(let i=0;i<40;i++){const a=hash2(i,1)*6.283, rr=hash2(i,2)*70;
      x.fillRect(ccx+Math.cos(a)*rr-2,ccy+Math.sin(a)*rr-2,4,4);}
  } else if(plant==='tulip'){
    x.strokeStyle=sch.lf; x.lineWidth=10;
    x.beginPath();x.moveTo(ccx,ccy+20);x.quadraticCurveTo(ccx-10,ccy+140,ccx,ccy+210);x.stroke();
    x.fillStyle=sch.lf;
    x.beginPath();x.moveTo(ccx-4,ccy+120);x.quadraticCurveTo(ccx-130,ccy+90,ccx-150,ccy+190);x.quadraticCurveTo(ccx-60,ccy+200,ccx-4,ccy+150);x.closePath();x.fill();
    x.fillStyle=sch.pl; x.lineWidth=4;
    x.beginPath();
    x.moveTo(ccx-90,ccy-30);
    x.quadraticCurveTo(ccx-100,ccy-160,ccx-40,ccy-60);
    x.quadraticCurveTo(ccx,ccy-180,ccx+40,ccy-60);
    x.quadraticCurveTo(ccx+100,ccy-160,ccx+90,ccy-30);
    x.quadraticCurveTo(ccx+60,ccy+60,ccx,ccy+60);
    x.quadraticCurveTo(ccx-60,ccy+60,ccx-90,ccy-30);
    x.closePath(); x.fill();
    x.strokeStyle=sch.ink; x.stroke();
  } else if(plant==='tomato'){
    x.fillStyle=sch.pl;
    x.beginPath();x.arc(ccx,ccy+20,130,0,6.29);x.fill();
    x.strokeStyle=sch.ink;x.lineWidth=4;x.stroke();
    x.beginPath();x.arc(ccx-100,ccy-30,40,0,6.29);
    x.fillStyle='rgba(255,255,255,0.3)';x.fill();
    x.fillStyle=sch.lf;
    for(let i=0;i<6;i++){const a=i/6*6.283;
      x.beginPath();
      x.moveTo(ccx,ccy-104);
      x.quadraticCurveTo(ccx+Math.cos(a)*54,ccy-104+Math.sin(a)*22-14,ccx+Math.cos(a)*80,ccy-104+Math.sin(a)*30);
      x.quadraticCurveTo(ccx+Math.cos(a)*30,ccy-104+Math.sin(a)*12+8,ccx,ccy-96);
      x.closePath();x.fill();}
    x.strokeStyle=sch.ink;x.lineWidth=3;
    x.beginPath();x.moveTo(ccx,ccy-104);x.lineTo(ccx,ccy-150);x.stroke();
  } else if(plant==='chili'){
    x.fillStyle=sch.pl; x.strokeStyle=sch.ink; x.lineWidth=4;
    x.beginPath();
    x.moveTo(ccx-30,ccy-120);
    x.bezierCurveTo(ccx+150,ccy-110,ccx+130,ccy+150,ccx-60,ccy+180);
    x.bezierCurveTo(ccx+40,ccy+80,ccx+10,ccy-60,ccx-50,ccy-94);
    x.closePath(); x.fill(); x.stroke();
    x.strokeStyle=sch.lf; x.lineWidth=9;
    x.beginPath(); x.moveTo(ccx-40,ccy-105); x.quadraticCurveTo(ccx-70,ccy-160,ccx-30,ccy-190); x.stroke();
  } else if(plant==='beet'){
    x.fillStyle=sch.pl;
    x.beginPath(); x.moveTo(ccx-110,ccy-20);
    x.quadraticCurveTo(ccx,ccy-110,ccx+110,ccy-20);
    x.quadraticCurveTo(ccx+70,ccy+90,ccx+12,ccy+170);
    x.quadraticCurveTo(ccx-2,ccy+190,ccx-12,ccy+170);
    x.quadraticCurveTo(ccx-70,ccy+90,ccx-110,ccy-20);
    x.closePath(); x.fill();
    x.strokeStyle=sch.ink; x.lineWidth=4; x.stroke();
    x.fillStyle=sch.lf;
    for(let i=-1;i<=1;i++){
      x.beginPath(); x.moveTo(ccx+i*14,ccy-70);
      x.quadraticCurveTo(ccx+i*90,ccy-180,ccx+i*40,ccy-230);
      x.quadraticCurveTo(ccx+i*8-10,ccy-160,ccx-8,ccy-74); x.closePath(); x.fill();
      x.strokeStyle=sch.ink; x.stroke();
    }
  } else if(plant==='corn'){
    x.fillStyle=sch.pl;
    x.beginPath(); x.ellipse(ccx,ccy+10,86,170,0,0,6.29); x.fill();
    x.strokeStyle=sch.ink; x.lineWidth=4; x.stroke();
    x.strokeStyle=sch.ink; x.lineWidth=2.4;
    for(let i=-2;i<=2;i++){
      x.beginPath(); x.moveTo(ccx+i*30,ccy-156); x.quadraticCurveTo(ccx+i*36,ccy+10,ccx+i*30,ccy+176); x.stroke();
    }
    for(let j=-3;j<=3;j++){
      x.beginPath(); x.moveTo(ccx-82,ccy+10+j*44); x.quadraticCurveTo(ccx,ccy+22+j*44,ccx+82,ccy+10+j*44); x.stroke();
    }
    x.fillStyle=sch.lf;
    x.beginPath(); x.moveTo(ccx-70,ccy+150);
    x.quadraticCurveTo(ccx-160,ccy+40,ccx-90,ccy-140);
    x.quadraticCurveTo(ccx-110,ccy+40,ccx-40,ccy+160); x.closePath(); x.fill();
    x.strokeStyle=sch.ink; x.stroke();
    x.beginPath(); x.moveTo(ccx+70,ccy+150);
    x.quadraticCurveTo(ccx+160,ccy+40,ccx+90,ccy-140);
    x.quadraticCurveTo(ccx+110,ccy+40,ccx+40,ccy+160); x.closePath(); x.fill(); x.stroke();
  } else { // peas
    x.fillStyle=sch.lf; x.strokeStyle=sch.ink; x.lineWidth=4;
    x.beginPath();
    x.moveTo(ccx-140,ccy-60);
    x.quadraticCurveTo(ccx,ccy-160,ccx+150,ccy-40);
    x.quadraticCurveTo(ccx+10,ccy+30,ccx-140,ccy-60);
    x.closePath();x.fill();x.stroke();
    x.fillStyle=sch.pl;
    for(let i=0;i<5;i++){
      x.beginPath();x.arc(ccx-80+i*46,ccy-58+Math.sin(i)*16,26,0,6.29);x.fill();
      x.strokeStyle=sch.ink;x.lineWidth=2.6;x.stroke();
    }
    x.strokeStyle=sch.lf;x.lineWidth=5;
    x.beginPath();x.moveTo(ccx+150,ccy-40);x.quadraticCurveTo(ccx+190,ccy+40,ccx+150,ccy+120);x.stroke();
  }
  // type — name follows the plant actually drawn
  const NAME_BY_PLANT={
    radish:['CRIMSON RADISH','WINTERFIELD RADISH'],
    carrot:['MAMMOTH CARROT','TELEGRAPH CARROT'],
    sunflower:['MOONRISE SUNFLOWER','GIANT SUNFLOWER'],
    tulip:['MOONRISE TULIP','VESPER TULIP'],
    tomato:['HONEST TOMATO','PROVIDENCE TOMATO'],
    peas:['TELEGRAPH PEAS','HALCYON PEAS'],
    chili:['VOLCANO CHILI','RED SEMAPHORE CHILI'],
    beet:['WINTERFIELD BEET','DEEP MERIDIAN BEET'],
    corn:['GOLDEN HOUR CORN','PROVIDENCE CORN'],
  };
  const name=pick(NAME_BY_PLANT[plant],r);
  x.fillStyle=sch.ink; x.textAlign='center';
  x.font='bold 30px Georgia,serif';
  x.fillText(pick(['GIANT','EARLIEST OF ALL','PRIZE','IMPROVED','TRIUMPH'],r),W/2,M+118);
  x.font='bold 52px Georgia,serif';
  x.fillText(name.split(' ')[0],W/2,M+182);
  x.fillText(name.split(' ').slice(1).join(' ')||'STRAIN',W/2,M+240);
  x.font='italic 21px Georgia,serif'; x.fillStyle=sch.ink; x.textAlign='center';
  x.fillText('GUARANTEED TO GROW · PACKED FOR '+rint(r,1948,2044),W/2,H-M-66);
  // price circle
  x.fillStyle=sch.pl===sch.ink?sch.lf:sch.pl;
  x.beginPath();x.arc(W-M-78,M+118,52,0,6.29);x.fill();
  x.strokeStyle=sch.ink;x.lineWidth=3;x.stroke();
  x.fillStyle=sch.ink==='#2a1408'&&sch.pl==='#d61a3c'?'#fff':sch.ink;
  x.fillStyle='#fff';
  x.font='bold 30px Georgia,serif';
  x.fillText(rint(r,5,25)+'¢',W-M-78,M+128);
}

/* ============ round three (recomposed): masks, pools, kits ============ */

/* ============ round four: abstract systems ============ */
function hex2rgb(h){const v=parseInt(h.slice(1),16);return [v>>16,(v>>8)&255,v&255];}

/* 24. INTERFERENCE — moiré plates, the image lives between the lines */
function interference(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1100,H:1100},{W:1240,H:1000}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sch=pick([
    {bg:'#0a0a12',c:['#00e5ff','#ff2bd1']},
    {bg:'#0c0c10',c:['#c8ff00','#7a2bff']},
    {bg:'#eef2f4',c:['#d61a3c','#1d2bd6']},
    {bg:'#10041c',c:['#ffd514','#ff2b6e']},
    {bg:'#041410',c:['#00ffa1','#ff7a2b']},
    {bg:'#e6f0e8',c:['#0f8a3c','#d61a8c']},
    {bg:'#0c1430',c:['#7fd8c8','#ffd514']},
    {bg:'#1c0a14',c:['#ff9ad1','#c8ff00']},
    {bg:'#f2f2f4',c:['#ff5500','#10306a']},
  ],r);
  x.fillStyle=sch.bg; x.fillRect(0,0,W,H);
  const diag=Math.hypot(W,H);
  const combo=pick(['rings','ringfan','fans','ringgrid'],r);
  function rings(cx,cy,p,col,lw){
    x.strokeStyle=col; x.lineWidth=lw;
    for(let rr=p/2;rr<diag*1.2;rr+=p){
      x.beginPath(); x.arc(cx,cy,rr,0,6.29); x.stroke();
    }
  }
  function fan(cx,cy,n,col,lw,ph){
    x.strokeStyle=col; x.lineWidth=lw;
    for(let i=0;i<n;i++){
      const a=ph+i/n*6.283;
      x.beginPath(); x.moveTo(cx,cy);
      x.lineTo(cx+Math.cos(a)*diag*1.3,cy+Math.sin(a)*diag*1.3); x.stroke();
    }
  }
  function grid(angle,p,col,lw){
    x.strokeStyle=col; x.lineWidth=lw;
    const dx=Math.cos(angle),dy=Math.sin(angle);
    const nx=-dy,ny=dx, cx=W/2,cy=H/2;
    for(let o=-diag;o<diag;o+=p){
      x.beginPath();
      x.moveTo(cx+nx*o-dx*diag,cy+ny*o-dy*diag);
      x.lineTo(cx+nx*o+dx*diag,cy+ny*o+dy*diag); x.stroke();
    }
  }
  const lw=2.2+r()*1.8;
  const p1=10+r()*8;
  const cx1=W*(0.3+r()*0.4), cy1=H*(0.3+r()*0.4);
  if(combo==='rings'){
    const off=30+r()*220, oa=r()*6.28;
    rings(cx1,cy1,p1,sch.c[0],lw);
    rings(cx1+Math.cos(oa)*off,cy1+Math.sin(oa)*off,p1*(0.96+r()*0.08),sch.c[1],lw);
  } else if(combo==='ringfan'){
    rings(cx1,cy1,p1,sch.c[0],lw);
    fan(W-cx1,H-cy1,rint(r,90,180),sch.c[1],lw,r());
  } else if(combo==='fans'){
    const n=rint(r,100,200);
    fan(cx1,cy1,n,sch.c[0],lw,0);
    fan(cx1+(r()-0.5)*160,cy1+(r()-0.5)*160,n,sch.c[1],lw,0.01+r()*0.03);
  } else {
    const ga=r()*3.14;
    grid(ga,p1,sch.c[0],lw);
    rings(cx1,cy1,p1*1.02,sch.c[1],lw);
  }
  // plate edge
  x.strokeStyle=sch.bg; x.lineWidth=70; x.strokeRect(-20,-20,W+40,H+40);
  x.strokeStyle= sch.bg==='#eef2f4'||sch.bg==='#e6f0e8' ? '#2c2a24':'#e8e2cc';
  x.lineWidth=2; x.strokeRect(38,38,W-76,H-76);
}

/* 27. CUTOUT — scissors, paper, no plan */
function cutout(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1100,H:1100}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sch=pick([
    {bg:'#1d4fb8',p:['#ffd514','#ff2bd1','#f2ead0','#0f8a3c']},
    {bg:'#e8f0f4',p:['#d61a3c','#1d2bd6','#0f8a3c','#14141c']},
    {bg:'#d61a3c',p:['#f2ead0','#ffd514','#14141c','#0fa8a0']},
    {bg:'#14141c',p:['#ff5500','#00e5c0','#ffd514','#ff2bd1']},
    {bg:'#0f8a3c',p:['#ffe9c8','#ff7a2b','#d61a8c','#1d2bd6']},
    {bg:'#ffaa00',p:['#14141c','#d61a3c','#f2ead0','#1d4fb8']},
    {bg:'#f2f2f4',p:['#ff5500','#14141c','#1d2bd6','#ff2bd1']},
    {bg:'#2a1040',p:['#c8ff00','#ff7a2b','#e8d8ff','#00e5c0']},
    {bg:'#0a3d7a',p:['#ffc8a8','#ffd514','#d61a3c','#f2ead0']},
    {bg:'#ffd6e4',p:['#14141c','#7a00cc','#0f8a3c','#d61a3c']},
  ],r);
  x.fillStyle=sch.bg; x.fillRect(0,0,W,H);
  paperNoise(x,r,W,H,'0,0,0',600);
  function blob(cx,cy,R,squash,rot){
    const n=rint(r,7,11);
    const pts=[];
    for(let i=0;i<n;i++){
      const a=i/n*6.283;
      const rr=R*(0.55+r()*0.65);
      pts.push([cx+Math.cos(a+rot)*rr,cy+Math.sin(a+rot)*rr*squash]);
    }
    x.beginPath();
    for(let i=0;i<n;i++){
      const p0=pts[i], p1=pts[(i+1)%n];
      const mx=(p0[0]+p1[0])/2, my=(p0[1]+p1[1])/2;
      if(i===0) x.moveTo((pts[n-1][0]+p0[0])/2,(pts[n-1][1]+p0[1])/2);
      x.quadraticCurveTo(p0[0],p0[1],mx,my);
    }
    x.closePath();
  }
  function sliver(x1,y1,x2,y2,w){
    const mx=(x1+x2)/2+(r()-0.5)*160, my=(y1+y2)/2+(r()-0.5)*160;
    x.beginPath();
    x.moveTo(x1,y1);
    x.quadraticCurveTo(mx,my,x2,y2);
    x.quadraticCurveTo(mx+w,my+w*0.4,x1+w*0.6,y1+w);
    x.closePath();
  }
  // shape vocabulary: blobs, bars, rings, crescents, fronds — scissors get bored too
  function bar(cx,cy,R,squash,rot){
    x.save(); x.translate(cx,cy); x.rotate(rot);
    x.beginPath(); x.rect(-R*1.1,-R*0.3*squash,R*2.2,R*0.6*squash);
    x.restore();
  }
  function ring(cx,cy,R){
    x.beginPath();
    x.arc(cx,cy,R,0,6.283);
    x.arc(cx,cy,R*0.5,0,6.283,true);
  }
  function crescent(cx,cy,R,rot){
    x.save(); x.translate(cx,cy); x.rotate(rot);
    x.beginPath();
    x.arc(0,0,R,0.5,5.78);
    x.quadraticCurveTo(R*0.25,0,Math.cos(0.5)*R,Math.sin(0.5)*R);
    x.restore();
  }
  function frond(cx,cy,R,rot){
    x.save(); x.translate(cx,cy); x.rotate(rot);
    x.beginPath();
    x.moveTo(0,-R);
    x.quadraticCurveTo(R*0.62,0,0,R);
    x.quadraticCurveTo(-R*0.62,0,0,-R);
    x.restore();
  }
  function shape(cx,cy,R,squash,rot){
    const t=pick(['blob','blob','bar','ring','crescent','frond','frond'],r);
    if(t==='bar') bar(cx,cy,R,squash,rot);
    else if(t==='ring') ring(cx,cy,R*0.8);
    else if(t==='crescent') crescent(cx,cy,R*0.85,rot);
    else if(t==='frond') frond(cx,cy,R*1.05,rot);
    else blob(cx,cy,R,squash,rot);
  }
  const cols=shuffle(sch.p,r);
  const comp=pick(['anchor','anchor','scatter','totem'],r);
  x.save();
  x.shadowColor='rgba(0,0,0,0.25)'; x.shadowBlur=18; x.shadowOffsetX=10; x.shadowOffsetY=12;
  let nm=0;
  if(comp==='anchor'){
    x.fillStyle=cols[0];
    blob(W*(0.3+r()*0.4),H*(0.3+r()*0.4),Math.min(W,H)*0.42,0.8+r()*0.4,r()*6.28); x.fill();
    nm=rint(r,2,4);
    for(let i=0;i<nm;i++){
      x.fillStyle=cols[(i+1)%cols.length];
      shape(W*(0.12+r()*0.76),H*(0.12+r()*0.76),Math.min(W,H)*(0.14+r()*0.16),0.7+r()*0.6,r()*6.28);
      x.fill();
    }
  } else if(comp==='scatter'){
    nm=rint(r,8,14);
    for(let i=0;i<nm;i++){
      x.fillStyle=cols[i%cols.length];
      shape(W*(0.08+r()*0.84),H*(0.08+r()*0.84),Math.min(W,H)*(0.07+r()*0.12),0.7+r()*0.6,r()*6.28);
      x.fill();
    }
  } else { // totem — a stacked spine of shapes
    const tx=W*(0.35+r()*0.3);
    const nseg=rint(r,4,6);
    for(let i=0;i<nseg;i++){
      x.fillStyle=cols[i%cols.length];
      const yy=H*(0.12+(i+0.5)*0.76/nseg);
      shape(tx+(r()-0.5)*60,yy,Math.min(W,H)*(0.1+r()*0.13),0.55+r()*0.5,r()*6.28);
      x.fill();
    }
    nm=nseg;
  }
  if(r()<0.7){
    x.fillStyle=cols[(nm+1)%cols.length];
    sliver(W*r()*0.3,H*(0.1+r()*0.8),W*(0.7+r()*0.3),H*(0.1+r()*0.8),30+r()*50);
    x.fill();
  }
  x.restore();
  // seeds (no shadow)
  const sc=pick(cols,r);
  const nd=rint(r,4,12);
  const dx0=W*(0.15+r()*0.7), dy0=H*(0.15+r()*0.7);
  for(let i=0;i<nd;i++){
    x.fillStyle=sc;
    const a=r()*6.283, dd=20+r()*150;
    blob(dx0+Math.cos(a)*dd,dy0+Math.sin(a)*dd,10+r()*16,1,r()*6.28);
    x.fill();
  }
}

/* ============ round five v2: four ornament nations + rebuilt abstracts ============ */

/* SPECIMEN — "Full Faith & Credit": four nations, four ORNAMENT SYSTEMS.
   Guilloché belongs to ONE nation. The others: letterpress deco, Swiss flat,
   hatch engraving. No shared decoration between them. */
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
function hardwater(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:900},{W:950,H:950}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const PALS=[
    ['#10041c','#7a00cc','#ff2bd1','#ff7a2b','#ffd514','#fff3c8'],
    ['#0a1c3a','#1d4fb8','#00b8c8','#c8ff00','#f2ead6'],
    ['#14080a','#8a1028','#d61a3c','#ff5500','#ffaa00','#ffe9a8'],
    ['#04140e','#0d6a4e','#0f9a3c','#7fffd4','#f2ead6'],
    ['#f2ead6','#ffd514','#ff7a2b','#d61a3c','#7a0a2e','#14141c'],
    ['#0c0c14','#1d2bd6','#7a2bff','#ff2bd1','#ffc8e8'],
  ];
  let pal=pick(PALS,r);
  if(r()<0.5) pal=pal.slice().reverse();
  const vert=r()<0.35;
  x.save();
  let LW=W, LH=H;
  if(vert){ x.translate(W,0); x.rotate(Math.PI/2); LW=H; LH=W; }
  const nb=rint(r,3,18);
  const bounds=[];
  for(let i=0;i<nb;i++) bounds.push(LH*(0.08+0.84*(i+r()*0.7)/nb));
  bounds.sort((a,b)=>a-b);
  // one optional fault: everything right of it drops
  const faulted=r()<0.45;
  const fx=LW*(0.25+r()*0.5), fd=30+r()*90;
  function edgeY(style,x0,y0,amp,wl,ph){
    let y=y0+(faulted&&x0>fx? fd:0);
    const t=x0/wl*6.283+ph;
    if(style==='saw') return y+amp*(2*((t/6.283)%1)-1);
    if(style==='square') return y+amp*(Math.sin(t)>0?1:-1);
    if(style==='scallop') return y+amp*(Math.abs(Math.sin(t))*2-1);
    if(style==='zig'){const f=(t/3.1415)%2;return y+amp*(f<1?2*f-1:3-2*f);}
    return y;
  }
  x.fillStyle=pal[0]; x.fillRect(-LH,-LH,LW+2*LH,LH*3);
  bounds.forEach((y0,i)=>{
    const style=pick(['flat','saw','square','scallop','zig'],r);
    const amp= style==='flat'?0: 6+r()*Math.min(46,LH/nb*0.55);
    const wl=40+r()*150, ph=r()*6.28;
    function tracePath(off){
      x.beginPath();
      x.moveTo(-4,edgeY(style,0,y0+off,amp,wl,ph));
      for(let xx=0;xx<=LW;xx+=4) x.lineTo(xx,edgeY(style,xx,y0+off,amp,wl,ph));
    }
    x.fillStyle=pal[(i+1)%pal.length];
    tracePath(0);
    x.lineTo(LW+4,LH+LH); x.lineTo(-4,LH+LH); x.closePath(); x.fill();
    // echo pinstripes under some breaks
    if(style!=='flat'&&r()<0.4){
      const sc2=pal[(i+3)%pal.length];
      x.strokeStyle=sc2; x.lineWidth=7;
      for(let e=1;e<=rint(r,2,4);e++){
        tracePath(e*22); x.stroke();
      }
    }
  });
  // celestial accent
  if(r()<0.35){
    x.fillStyle=pal[(nb+2)%pal.length];
    x.beginPath(); x.arc(LW*(0.2+r()*0.6),bounds[0]*(0.5+r()*0.4),40+r()*70,0,6.29); x.fill();
  }
  x.restore();
}

/* ============ round six: deep-variance rewrites + two true systems ============ */

/* DELISTED — every kind of chart a dead asset ever had */
function tape(cv,seed){
  const r=rng(seed);
  const kind=pick(['candles','candles','line','area','phone','bars'],r);
  const theme=pick([
    {bg:'#07090b',up:'#27c08a',dn:'#e0484f',txt:'#cfd6d2',grid:'rgba(160,180,190,0.10)'},
    {bg:'#0b0804',up:'#ffb347',dn:'#9a6420',txt:'#e8c890',grid:'rgba(255,179,71,0.09)'},
    {bg:'#f2efe6',up:'#1c1d22',dn:'#c0202e',txt:'#1c1d22',grid:'rgba(30,30,40,0.10)'},
    {bg:'#0a0014',up:'#ff2bd1',dn:'#00e5ff',txt:'#f0c8ff',grid:'rgba(255,43,209,0.10)'},
    {bg:'#04080a',up:'#c8ff00',dn:'#8a2bff',txt:'#dfffa0',grid:'rgba(200,255,0,0.08)'},
    {bg:'#101c3a',up:'#ffd514',dn:'#ff4d2e',txt:'#ffe9a0',grid:'rgba(255,213,20,0.10)'},
    {bg:'#0e1420',up:'#4d9fff',dn:'#ff5a8a',txt:'#d8e4f0',grid:'rgba(120,160,220,0.10)'},
  ],r);
  const W= kind==='phone'?620:1240;
  const H= kind==='phone'?1240:pick([520,620,840],r);
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  x.fillStyle=theme.bg; x.fillRect(0,0,W,H);
  const n= kind==='phone'?rint(r,60,120):rint(r,70,210);
  let p=20+r()*380, drift=0, vol=0.02;
  const cs=[];
  for(let i=0;i<n;i++){
    if(i%rint(r,14,26)===0){drift=(r()-0.5)*0.02;vol=0.008+r()*0.05;}
    const o=p, c=Math.max(0.5,o*(1+drift+vol*randn(r)));
    const h=Math.max(o,c)*(1+Math.abs(randn(r))*vol*0.6);
    const l=Math.min(o,c)*(1-Math.abs(randn(r))*vol*0.6);
    const v=Math.abs(randn(r))*(0.4+vol*22);
    cs.push({o,h,l,c,v}); p=c;
  }
  let hi=-1e9, lo=1e9, vmax=0;
  cs.forEach(k=>{hi=Math.max(hi,k.h);lo=Math.min(lo,k.l);vmax=Math.max(vmax,k.v);});
  let tick=''; const consn='BCDFGHKLMNPRSTVZ', vow='AEIOU';
  const tl=rint(r,3,4);
  for(let i=0;i<tl;i++) tick+= (i===1? vow[rint(r,0,4)] : consn[rint(r,0,15)]);
  const last=cs[n-1].c, chg=(cs[n-1].c/cs[0].o-1)*100;
  const upAll=chg>=0;

  if(kind==='phone'){
    // defi app card, portrait
    const pad=54;
    x.fillStyle=theme.txt; x.textAlign='left';
    x.font='bold 40px "Courier New",monospace';
    x.fillText('$'+tick,pad,110);
    x.font='bold 92px "Courier New",monospace';
    x.fillText(last.toFixed(2),pad,236);
    x.fillStyle= upAll?theme.up:theme.dn;
    x.font='bold 38px "Courier New",monospace';
    x.fillText((upAll?'▲ +':'▼ ')+chg.toFixed(1)+'%',pad,300);
    // area chart
    const cy0=380, cy1=H-220;
    const px=i=>pad+ i*(W-2*pad)/(n-1);
    const py=v=>cy0+(hi-v)/(hi-lo)*(cy1-cy0);
    const grad=x.createLinearGradient(0,cy0,0,cy1);
    const lc= upAll?theme.up:theme.dn;
    grad.addColorStop(0,lc+'66'); grad.addColorStop(1,lc+'00');
    x.beginPath(); x.moveTo(px(0),py(cs[0].c));
    for(let i=1;i<n;i++) x.lineTo(px(i),py(cs[i].c));
    x.lineTo(px(n-1),cy1); x.lineTo(px(0),cy1); x.closePath();
    x.fillStyle=grad; x.fill();
    x.strokeStyle=lc; x.lineWidth=4; x.lineJoin='round';
    x.beginPath(); x.moveTo(px(0),py(cs[0].c));
    for(let i=1;i<n;i++) x.lineTo(px(i),py(cs[i].c));
    x.stroke();
    // range pills
    const pills=['1D','1W','1M','1Y','ALL'];
    const on=rint(r,0,4);
    pills.forEach((pl,i)=>{
      const bx=pad+i*((W-2*pad)/5), bw=(W-2*pad)/5-12;
      x.fillStyle= i===on? theme.txt:'rgba(128,128,140,0.18)';
      x.beginPath();
      x.roundRect? x.roundRect(bx,H-150,bw,54,27) : x.rect(bx,H-150,bw,54);
      x.fill();
      x.fillStyle= i===on? theme.bg:theme.txt;
      x.font='bold 22px "Courier New",monospace'; x.textAlign='center';
      x.fillText(pl,bx+bw/2,H-115);
    });
    x.textAlign='left';
    return;
  }

  const padL=34, padR=110, padT=H*0.24, padB=24, volH=H*0.13;
  const cw=(W-padL-padR)/n;
  const py=v=>padT+(hi-v)/(hi-lo)*(H-padT-padB-volH-18);
  x.font='16px "Courier New",monospace'; x.textAlign='left'; x.textBaseline='middle';
  for(let g=0;g<=5;g++){
    const v=lo+(hi-lo)*g/5, yy=py(v);
    x.strokeStyle=theme.grid; x.lineWidth=1;
    x.beginPath(); x.moveTo(padL,yy); x.lineTo(W-padR+14,yy); x.stroke();
    x.fillStyle=theme.txt; x.globalAlpha=0.55;
    x.fillText(v.toFixed(2),W-padR+22,yy); x.globalAlpha=1;
  }
  const lc= upAll?theme.up:theme.dn;
  if(kind==='line'||kind==='area'){
    const px=i=>padL+i*cw+cw/2;
    if(kind==='area'){
      const grad=x.createLinearGradient(0,padT,0,H-padB-volH);
      grad.addColorStop(0,lc+'55'); grad.addColorStop(1,lc+'00');
      x.beginPath(); x.moveTo(px(0),py(cs[0].c));
      for(let i=1;i<n;i++) x.lineTo(px(i),py(cs[i].c));
      x.lineTo(px(n-1),H-padB-volH); x.lineTo(px(0),H-padB-volH); x.closePath();
      x.fillStyle=grad; x.fill();
    }
    x.strokeStyle=lc; x.lineWidth=3.4; x.lineJoin='round';
    x.beginPath(); x.moveTo(px(0),py(cs[0].c));
    for(let i=1;i<n;i++) x.lineTo(px(i),py(cs[i].c));
    x.stroke();
  } else if(kind==='bars'){
    for(let i=0;i<n;i++){
      const k=cs[i], up=k.c>=k.o, col=up?theme.up:theme.dn;
      const cx=padL+i*cw+cw/2, bw=Math.max(2,cw*0.55);
      x.fillStyle=col;
      x.fillRect(cx-bw/2,py(k.c),bw,(H-padB-volH-12)-py(k.c));
    }
  } else { // candles
    for(let i=0;i<n;i++){
      const k=cs[i], up=k.c>=k.o, col=up?theme.up:theme.dn;
      const cx=padL+i*cw+cw/2;
      x.strokeStyle=col; x.lineWidth=Math.max(1,cw*0.12);
      x.beginPath(); x.moveTo(cx,py(k.h)); x.lineTo(cx,py(k.l)); x.stroke();
      const bw=Math.max(2,cw*0.62);
      const y1=py(Math.max(k.o,k.c)), y2=py(Math.min(k.o,k.c));
      if(up&&theme.bg==='#f2efe6'){x.fillStyle=theme.bg;x.fillRect(cx-bw/2,y1,bw,Math.max(1.5,y2-y1));x.strokeStyle=col;x.lineWidth=1.6;x.strokeRect(cx-bw/2,y1,bw,Math.max(1.5,y2-y1));}
      else {x.fillStyle=col;x.fillRect(cx-bw/2,y1,bw,Math.max(1.5,y2-y1));}
    }
  }
  if(kind!=='bars'){
    for(let i=0;i<n;i++){
      const k=cs[i], up=k.c>=k.o, col=up?theme.up:theme.dn;
      const cx=padL+i*cw+cw/2, bw=Math.max(2,cw*0.62);
      x.globalAlpha=0.45; x.fillStyle=col;
      x.fillRect(cx-bw/2,H-padB-(k.v/vmax)*volH,bw,(k.v/vmax)*volH);
      x.globalAlpha=1;
    }
  }
  const hs=H/620;
  x.textAlign='left'; x.textBaseline='alphabetic';
  x.fillStyle=theme.txt; x.font='bold '+Math.round(64*hs)+'px "Courier New",monospace';
  x.fillText('$'+tick,padL,78*hs);
  x.font=Math.round(30*hs)+'px "Courier New",monospace';
  x.fillStyle=lc;
  x.fillText(last.toFixed(2)+'  '+(chg>=0?'+':'')+chg.toFixed(1)+'%',padL,118*hs);
}

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
function poolside(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1100,H:1100}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const base=pick(['lawn','deck','deck','lawn'],r);
  const lawn=['#3aa84c','#2f9444','#5cb860'][seed%3];
  const DECKS=['#cfd8dc','#e8d8a8','#7fd8c8','#e8645a','#b8a8e8','#d96a3b'];
  const deck=DECKS[seed%DECKS.length]; r(); r();
  const water=pick(['#1d8fd8','#0fa8c8','#2bb8e8','#0f6a9c','#36c8c0'],r);
  const shA=pick([0.6,1.0,1.4],r);
  const shx=Math.cos(shA)*24, shy=Math.sin(shA)*24;
  // ground
  x.fillStyle= base==='lawn'? lawn : deck;
  x.fillRect(0,0,W,H);
  if(base==='lawn'){
    // mowing stripes
    x.fillStyle='rgba(255,255,255,0.05)';
    const mw=Math.round(W/rint(r,6,10));
    for(let t=0;t<W;t+=mw*2) x.fillRect(t,0,mw,H);
  } else {
    x.strokeStyle='rgba(0,0,0,0.12)'; x.lineWidth=2;
    const tile=rint(r,70,120);
    for(let t=tile;t<W;t+=tile){x.beginPath();x.moveTo(t,0);x.lineTo(t,H);x.stroke();}
    for(let t=tile;t<H;t+=tile){x.beginPath();x.moveTo(0,t);x.lineTo(W,t);x.stroke();}
  }
  // pool geometry — scale + position roam the whole yard
  const ps=0.32+r()*0.4;
  const pw=W*ps, ph=H*ps*(0.6+r()*0.7);
  const px0=W*0.06+r()*(W-pw-W*0.12);
  const py0=H*0.06+r()*(H-ph-H*0.12);
  const kind=pick(['rect','kidney','ell','lap','round'],r);
  function poolPath(off){
    const o=off||0;
    x.beginPath();
    if(kind==='rect'){ x.rect(px0-o,py0-o,pw+2*o,ph+2*o); }
    else if(kind==='lap'){ x.rect(px0-o,py0+ph*0.18-o,pw+2*o,ph*0.62+2*o); }
    else if(kind==='round'){ x.ellipse(px0+pw/2,py0+ph/2,pw/2+o,ph/2+o,0,0,6.29); }
    else if(kind==='ell'){
      x.moveTo(px0-o,py0-o);
      x.lineTo(px0+pw*0.62+o,py0-o); x.lineTo(px0+pw*0.62+o,py0+ph*0.45-o);
      x.lineTo(px0+pw+o,py0+ph*0.45-o); x.lineTo(px0+pw+o,py0+ph+o);
      x.lineTo(px0-o,py0+ph+o); x.closePath();
    } else {
      const cx=px0+pw/2, cy=py0+ph/2;
      x.moveTo(cx-pw*0.5-o,cy);
      x.bezierCurveTo(cx-pw*0.52-o,cy-ph*0.62-o,cx+pw*0.2,cy-ph*0.72-o,cx+pw*0.42+o,cy-ph*0.32-o);
      x.bezierCurveTo(cx+pw*0.56+o,cy-ph*0.05,cx+pw*0.52+o,cy+ph*0.2,cx+pw*0.3+o,cy+ph*0.28);
      x.bezierCurveTo(cx+pw*0.1,cy+ph*0.34,cx+pw*0.05,cy+ph*0.52+o,cx-pw*0.18,cy+ph*0.56+o);
      x.bezierCurveTo(cx-pw*0.46-o,cy+ph*0.6+o,cx-pw*0.52-o,cy+ph*0.25,cx-pw*0.5-o,cy);
      x.closePath();
    }
  }
  // patio apron when pool sits in lawn
  if(base==='lawn'){
    x.fillStyle=pick(['#cfd8dc','#e8d8a8','#d8c8b0'],r);
    poolPath(46+r()*40); x.fill();
  }
  x.fillStyle='#f4f0e2'; poolPath(14); x.fill();
  x.fillStyle=water; poolPath(0); x.fill();
  x.save(); poolPath(0); x.clip();
  x.fillStyle='rgba(0,0,40,0.18)';
  x.fillRect(px0+pw*0.5,py0,pw*0.6,ph*1.2);
  x.strokeStyle='rgba(255,255,255,0.5)'; x.lineWidth=2.2;
  for(let i=0;i<Math.round(18*ps/0.5);i++){
    const sx2=px0+r()*pw, sy2=py0+r()*ph, ln=16+r()*44;
    x.beginPath(); x.moveTo(sx2,sy2);
    x.quadraticCurveTo(sx2+ln*0.5,sy2-7,sx2+ln,sy2);
    x.stroke();
  }
  if(kind==='lap'){
    x.strokeStyle='rgba(255,255,255,0.8)'; x.lineWidth=4;
    for(let i=1;i<5;i++){
      const yy=py0+ph*0.18+i*(ph*0.62)/5;
      x.beginPath(); x.moveTo(px0+8,yy); x.lineTo(px0+pw-8,yy); x.stroke();
    }
  }
  x.restore();
  x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=3; poolPath(0); x.stroke();
  // hot tub
  if(r()<0.4){
    const tx=px0+pw+60<W-80? px0+pw+60 : px0-80;
    const ty=py0+ph*r();
    x.fillStyle='#f4f0e2'; x.beginPath(); x.arc(tx,ty,52,0,6.29); x.fill();
    x.fillStyle=shade(water,-26); x.beginPath(); x.arc(tx,ty,40,0,6.29); x.fill();
    x.strokeStyle='rgba(255,255,255,0.5)'; x.lineWidth=2;
    for(let i=0;i<3;i++){x.beginPath();x.arc(tx,ty,12+i*9,r()*3,r()*3+2.2);x.stroke();}
  }
  // second small pool, rare
  if(r()<0.1){
    const sx2=W*(0.1+r()*0.7), sy2=H*(0.1+r()*0.7);
    x.fillStyle='#f4f0e2'; x.beginPath(); x.ellipse(sx2,sy2,84,60,0,0,6.29); x.fill();
    x.fillStyle=water; x.beginPath(); x.ellipse(sx2,sy2,70,48,0,0,6.29); x.fill();
  }
  // house roof along one edge
  if(r()<0.55){
    const side=pick(['top','bottom','left','right'],r);
    const rc=pick(['#8a8f96','#b0594a','#6a7178','#a89070'],r);
    const depth=Math.min(W,H)*(0.16+r()*0.1);
    x.fillStyle='rgba(0,0,30,0.25)';
    if(side==='top'){x.fillRect(shx,shy,W,depth);}
    if(side==='bottom'){x.fillRect(shx,H-depth+shy,W,depth);}
    if(side==='left'){x.fillRect(shx,shy,depth,H);}
    if(side==='right'){x.fillRect(W-depth+shx,shy,depth,H);}
    x.fillStyle=rc;
    let rx0=0,ry0=0,rw2=W,rh2=depth,horiz=true;
    if(side==='bottom'){ry0=H-depth;}
    if(side==='left'){rw2=depth;rh2=H;horiz=false;}
    if(side==='right'){rx0=W-depth;rw2=depth;rh2=H;horiz=false;}
    x.fillRect(rx0,ry0,rw2,rh2);
    // ridge + seams
    x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=3;
    x.beginPath();
    if(horiz){x.moveTo(rx0,ry0+(side==='top'?rh2-4:4));x.lineTo(rx0+rw2,ry0+(side==='top'?rh2-4:4));}
    else {x.moveTo(rx0+(side==='left'?rw2-4:4),ry0);x.lineTo(rx0+(side==='left'?rw2-4:4),ry0+rh2);}
    x.stroke();
    x.lineWidth=1.2; x.globalAlpha=0.4;
    for(let t=0;t<(horiz?rw2:rh2);t+=44){
      x.beginPath();
      if(horiz){x.moveTo(rx0+t,ry0);x.lineTo(rx0+t,ry0+rh2);}
      else {x.moveTo(rx0,ry0+t);x.lineTo(rx0+rw2,ry0+t);}
      x.stroke();
    }
    x.globalAlpha=1;
  }
  // hedge band
  if(r()<0.4){
    const hside=pick(['top','bottom','left','right'],r);
    x.fillStyle=shade(lawn,-44);
    const hd=34+r()*26;
    if(hside==='top')x.fillRect(0,0,W,hd);
    if(hside==='bottom')x.fillRect(0,H-hd,W,hd);
    if(hside==='left')x.fillRect(0,0,hd,H);
    if(hside==='right')x.fillRect(W-hd,0,hd,H);
  }
  // trees
  const nt=rint(r,0,4);
  for(let i=0;i<nt;i++){
    const tx=W*r(), ty=H*r();
    const tr=34+r()*40;
    x.fillStyle='rgba(0,0,30,0.25)';
    x.beginPath(); x.arc(tx+shx,ty+shy,tr,0,6.29); x.fill();
    const tc=pick(['#2f8a3c','#3a9c4a','#27753a','#4aa455'],r);
    for(let k=0;k<5;k++){
      x.fillStyle=shade(tc,rint(r,-12,22));
      x.beginPath(); x.arc(tx+(r()-0.5)*tr,ty+(r()-0.5)*tr,tr*0.55,0,6.29); x.fill();
    }
  }
  // ladder + board
  x.strokeStyle='#f2f2f2'; x.lineWidth=4;
  const lx=px0+pw*0.12;
  x.beginPath(); x.moveTo(lx,py0-12); x.lineTo(lx,py0+34); x.moveTo(lx+18,py0-12); x.lineTo(lx+18,py0+34); x.stroke();
  if(kind!=='lap'&&kind!=='round'&&r()<0.5){
    x.fillStyle='#f2f2f2';
    x.fillRect(px0+pw*0.45,py0+ph+4,30,80);
  }
  // furniture
  const UC=['#d61a3c','#ffd514','#0f8a3c','#ff2bd1','#1d4fb8','#ff7a2b'];
  const nu=rint(r,0,3);
  for(let i=0;i<nu;i++){
    const ux=W*(0.08+r()*0.84), uy=H*(0.08+r()*0.84);
    const uc=pick(UC,r);
    x.fillStyle='rgba(0,0,30,0.25)';
    x.beginPath(); x.ellipse(ux+shx,uy+shy,54,48,0,0,6.29); x.fill();
    for(let k=0;k<8;k++){
      x.fillStyle= k%2? uc : '#fff';
      x.beginPath(); x.moveTo(ux,uy);
      x.arc(ux,uy,52,k*0.785,(k+1)*0.785); x.closePath(); x.fill();
    }
    x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=2;
    x.beginPath(); x.arc(ux,uy,52,0,6.29); x.stroke();
  }
  const nl=rint(r,0,5);
  for(let i=0;i<nl;i++){
    const ly=H*(0.06+r()*0.86), lx2=W*(0.06+r()*0.86);
    const lc=pick(UC,r);
    x.fillStyle='rgba(0,0,30,0.22)';
    x.fillRect(lx2+shx*0.6,ly+shy*0.6,42,100);
    x.fillStyle=lc; x.fillRect(lx2,ly,42,100);
    x.fillStyle='rgba(255,255,255,0.5)'; x.fillRect(lx2,ly,42,24);
    x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=2; x.strokeRect(lx2,ly,42,100);
  }
}

/* LOUD ON CHEAP PAPER — full print shop: bayer, dots, lines, diagonal screens */
function dither(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1080,H:1080},{W:760,H:1240}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const RAMPS=[
    ['#0c0c14','#7a0a2e','#d61a3c','#ff7a2b','#ffd514'],
    ['#10041c','#1d2bd6','#00b8c8','#c8ff00'],
    ['#140414','#7a2bff','#ff2bd1','#ffc8e8'],
    ['#04140e','#0f6a4a','#00ffa1','#f2ead6'],
    ['#0a0a12','#1d4fb8','#00e5ff','#fff8e0'],
    ['#1c0a04','#c43a20','#ffaa00','#fff3c8'],
    ['#0c1430','#1d8fd8','#7fd8c8','#f2f2f2'],
    ['#1c0420','#d61a8c','#ff7a2b','#ffe9a8'],
    ['#020a14','#0f8a3c','#c8ff00','#f2f2e0'],
    ['#14001c','#5a2ea6','#ff2b6e','#ffd2e8'],
  ];
  const ramp=pick(RAMPS,r).map(hex2rgb);
  const B=pick([6,8,8,12,16],r);
  const style=pick(['bayer','bayer','dots','lines','diag'],r);
  const M=[
    [0,32,8,40,2,34,10,42],[48,16,56,24,50,18,58,26],
    [12,44,4,36,14,46,6,38],[60,28,52,20,62,30,54,22],
    [3,35,11,43,1,33,9,41],[51,19,59,27,49,17,57,25],
    [15,47,7,39,13,45,5,37],[63,31,55,23,61,29,53,21]];
  const comp=pick(['orb','twin','horizon','diag','well','bars','rings','wave'],r);
  const ox=W*(0.25+r()*0.5), oy=H*(0.25+r()*0.5);
  const ox2=W*(0.2+r()*0.6), oy2=H*(0.5+r()*0.4);
  const diagL=Math.hypot(W,H);
  const hy=H*(0.4+r()*0.3), hw=60+r()*160, ga=r()*0.8-0.4;
  const kk=rint(r,2,5), wl1=120+r()*240, wl2=90+r()*200;
  function field(px,py){
    if(comp==='orb') return Math.hypot(px-ox,py-oy)/(diagL*0.62);
    if(comp==='twin'){
      const a=Math.hypot(px-ox,py-oy), b=Math.hypot(px-ox2,py-oy2);
      return Math.min(a,b)/(diagL*0.55);
    }
    if(comp==='horizon') return Math.max(0,Math.min(1,(py-hy)/H+0.5))+0.12*Math.sin(px/hw);
    if(comp==='well') return 1-Math.hypot(px-ox,py-oy)/(diagL*0.58);
    if(comp==='bars') return ((px/W*kk)%1)*0.75+ (py/H)*0.25;
    if(comp==='rings') return ((Math.hypot(px-ox,py-oy)/(diagL/kk))%1);
    if(comp==='wave') return 0.5+0.5*Math.sin(px/wl1*6.28 + Math.sin(py/wl2*6.28)*2);
    return ((px-W/2)*Math.cos(ga)+(py-H/2)*Math.sin(ga))/diagL+0.5;
  }
  const cols=Math.ceil(W/B), rows=Math.ceil(H/B);
  const paper=ramp[ramp.length-1], inkD=ramp[0];
  if(style==='dots'||style==='lines'||style==='diag'){
    x.fillStyle='rgb('+paper[0]+','+paper[1]+','+paper[2]+')';
    x.fillRect(0,0,W,H);
  }
  for(let cy=0;cy<rows;cy++){
    for(let cxn=0;cxn<cols;cxn++){
      const px=cxn*B+B/2, py=cy*B+B/2;
      let f=Math.max(0,Math.min(0.999,field(px,py)));
      const t=f*(ramp.length-1);
      let idx=Math.floor(t);
      const frac=t-idx;
      if(style==='bayer'){
        const th=(M[cy%8][cxn%8]+0.5)/64;
        if(frac>th) idx++;
        const c=ramp[Math.min(idx,ramp.length-1)];
        x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
        x.fillRect(cxn*B,cy*B,B,B);
      } else if(style==='dots'){
        // halftone: dot size = darkness; colour from the ramp's mid inks
        const dark=1-f;
        const c=ramp[Math.max(0,Math.min(ramp.length-2,idx))];
        x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
        x.beginPath(); x.arc(px,py,dark*B*0.62,0,6.29); x.fill();
      } else if(style==='lines'){
        const dark=1-f;
        const c=ramp[Math.max(0,Math.min(ramp.length-2,idx))];
        x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
        x.fillRect(cxn*B,py-dark*B*0.55,B,Math.max(0.5,dark*B*1.1));
      } else { // diag
        const dark=1-f;
        const c=ramp[Math.max(0,Math.min(ramp.length-2,idx))];
        x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
        x.save(); x.translate(px,py); x.rotate(0.785);
        x.fillRect(-B*0.75,-dark*B*0.5,B*1.5,Math.max(0.5,dark*B));
        x.restore();
      }
    }
  }
}

/* TURF WAR — cyclic cellular automaton; spirals conquer everything */
function turfwar(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1100,H:1100},{W:1240,H:1000}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const cell=5;
  const gw=Math.ceil(W/cell), gh=Math.ceil(H/cell);
  const k=rint(r,8,15);
  // cohesive cycle palette: 3 anchors, interpolated around the loop
  const ANCH=[
    ['#10041c','#ff2bd1','#ffd514'],
    ['#0a1c3a','#00e5ff','#c8ff00'],
    ['#14080a','#ff5500','#7fd8c8'],
    ['#04140e','#0f9a3c','#f2ead6'],
    ['#0c0c14','#7a2bff','#ff7a2b'],
    ['#001a14','#ffd514','#d61a3c'],
  ];
  const anchors=pick(ANCH,r).map(hex2rgb);
  function colAt(i){
    const t=i/k*anchors.length;
    const a=anchors[Math.floor(t)%anchors.length];
    const b=anchors[(Math.floor(t)+1)%anchors.length];
    const f=t-Math.floor(t);
    return [Math.round(a[0]+(b[0]-a[0])*f),Math.round(a[1]+(b[1]-a[1])*f),Math.round(a[2]+(b[2]-a[2])*f)];
  }
  const pal=[]; for(let i=0;i<k;i++) pal.push(colAt(i));
  let g=new Uint8Array(gw*gh), g2=new Uint8Array(gw*gh);
  for(let i=0;i<g.length;i++) g[i]=Math.floor(r()*k);
  const steps=rint(r,50,150);
  for(let s=0;s<steps;s++){
    for(let yy=0;yy<gh;yy++){
      for(let xx=0;xx<gw;xx++){
        const i=yy*gw+xx, v=g[i], want=(v+1)%k;
        g2[i]=v;
        if(g[yy*gw+((xx+1)%gw)]===want||g[yy*gw+((xx+gw-1)%gw)]===want||
           g[((yy+1)%gh)*gw+xx]===want||g[((yy+gh-1)%gh)*gw+xx]===want) g2[i]=want;
      }
    }
    const tmp=g; g=g2; g2=tmp;
  }
  for(let yy=0;yy<gh;yy++){
    for(let xx=0;xx<gw;xx++){
      const c=pal[g[yy*gw+xx]];
      x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
      x.fillRect(xx*cell,yy*cell,cell,cell);
    }
  }
}

/* AVALANCHE — abelian sandpile; drop a mountain of grains, watch the law */
function avalanche(cv,seed){
  const r=rng(seed);
  const W=1080, H=1080;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const n=216, cell=5;
  const grid=new Int32Array(n*n);
  const two=r()<0.3;
  const grains=rint(r,24000,72000);
  const cx=Math.floor(n/2), cy=Math.floor(n/2);
  const c1=cy*n+cx;
  grid[c1]+=two? Math.floor(grains*0.6):grains;
  let minX=cx, maxX=cx, minY=cy, maxY=cy;
  if(two){
    const off=rint(r,20,60);
    const r2=cy+off, c2=cx-off;
    grid[r2*n+c2]+=Math.floor(grains*0.4);
    if(c2<minX)minX=c2; if(cx>maxX)maxX=cx;
    if(r2>maxY)maxY=r2;
  }
  // topple — abelian sandpile. The full-grid rescan re-walked all 46,656
  // cells every pass; almost all are zero (the pile is a growing diamond), so
  // that scan was the cost that froze the UI. We keep the SAME accumulating
  // full-pass toppling — only restricting each pass to the active bounding
  // box and expanding it as grains reach an edge. The sandpile's stable
  // configuration is independent of toppling order (abelian), and cells
  // outside the box are always <4, so this yields the byte-IDENTICAL final
  // grid — verified against the old loop across seeds — just faster.
  let guard=0;
  while(guard++<4e7){
    let any=false;
    let nMinX=minX, nMaxX=maxX, nMinY=minY, nMaxY=maxY;
    for(let yy=minY;yy<=maxY;yy++){
      const rb=yy*n;
      for(let xx=minX;xx<=maxX;xx++){
        const i=rb+xx;
        const v=grid[i];
        if(v>=4){
          any=true;
          const d=v>>2;
          grid[i]=v&3;
          if(xx>0){grid[i-1]+=d; if(xx-1<nMinX)nMinX=xx-1;}
          if(xx<n-1){grid[i+1]+=d; if(xx+1>nMaxX)nMaxX=xx+1;}
          if(yy>0){grid[i-n]+=d; if(yy-1<nMinY)nMinY=yy-1;}
          if(yy<n-1){grid[i+n]+=d; if(yy+1>nMaxY)nMaxY=yy+1;}
        }
      }
    }
    minX=nMinX<0?0:nMinX; maxX=nMaxX>n-1?n-1:nMaxX;
    minY=nMinY<0?0:nMinY; maxY=nMaxY>n-1?n-1:nMaxY;
    if(!any) break;
  }
  const PALS=[
    ['#0c0c14','#1d4fb8','#00e5ff','#ffd514'],
    ['#10041c','#7a2bff','#ff2bd1','#c8ff00'],
    ['#04140e','#0f8a3c','#7fffd4','#f2f2e0'],
    ['#14080a','#d61a3c','#ff9a3d','#ffe9a8'],
    ['#f2f2f4','#1d2bd6','#ff5500','#14141c'],
  ];
  const pal=pick(PALS,r).map(hex2rgb);
  x.fillStyle='rgb('+pal[0][0]+','+pal[0][1]+','+pal[0][2]+')';
  x.fillRect(0,0,W,H);
  for(let yy=0;yy<n;yy++){
    for(let xx=0;xx<n;xx++){
      const v=grid[yy*n+xx];
      if(v===0) continue;
      const c=pal[Math.min(3,v)];
      x.fillStyle='rgb('+c[0]+','+c[1]+','+c[2]+')';
      x.fillRect(xx*cell,yy*cell,cell,cell);
    }
  }
}
/* ============ reworked engines: facade, pyro, pennant, fortyfive ============ */

/* FACADE — "Elevations": architectural elevation sheets. Ink + blueprint
   drafts are the backbone. Blueprint carries a full drafting apparatus —
   sheet border, column grid, dimension strings, detail callout, north arrow,
   scale bar and a title block. Day/dusk/night coloured renderings are SUPER
   RARE (~4%). Trait-bearing draws come first, mirrored exactly by castFacade. */
function facade(cv,seed){
  const r=rng(seed);
  const bays=rint(r,3,8), floors=rint(r,4,11);
  const rare= r()<0.04;
  const mode= rare ? ['day','dusk','night'][Math.floor(r()*3)] : (r()<0.5?'ink':'blueprint');
  const style=pick(['2pane','arch','grid4','strip','ribbon','oriel'],r);
  const roof=pick(['tank','antenna','bulkhead','parapet','skylight'],r);
  // —— end trait draws; everything below draws freely ——
  const draft= mode==='ink'||mode==='blueprint';
  const blue= mode==='blueprint';
  const bayW=118, flH=92;
  const Mx= blue?176:120, Mtop= draft?150:120, Mbot= blue?252:150;
  const BW=bays*bayW, BH=floors*flH;
  const W=BW+2*Mx, H=BH+Mtop+Mbot;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const sky= mode==='ink'?'#f7f4ec'
           : blue?'#15355c'
           : mode==='day'?pick(['#6ecbe8','#8fd8f0','#3aa8d8'],r)
           : mode==='dusk'?pick(['#ff9a3d','#ff6e50','#e8a83a'],r)
           : pick(['#141a4d','#1a0f3a','#0c1430'],r);
  const body=pick(['#d96a3b','#e0a818','#1f8a8a','#e84e5e','#2b4bd8','#8a2bb8','#c83264','#3a9c4a'],r);
  const inkc= blue?'#dfe9f5': mode==='night'?'#0a0a14': mode==='ink'?'#2b2b33':'#22222e';
  const grid= blue?'rgba(150,195,240,0.15)':'rgba(120,100,70,0.10)';
  const accent= blue?'#7fd4ff':'#b8452e';
  const lit='#ffd96b';
  x.fillStyle=sky; x.fillRect(0,0,W,H);
  const gx=Mx, gy=Mtop;
  // ---- background per mode ----
  if(draft){
    paperNoise(x,r,W,H, blue?'180,210,245':'60,60,80',600);
    x.strokeStyle=grid; x.lineWidth=1;
    for(let v=18;v<W-18;v+=46){x.beginPath();x.moveTo(v,18);x.lineTo(v,H-18);x.stroke();}
    for(let hh=18;hh<H-18;hh+=46){x.beginPath();x.moveTo(18,hh);x.lineTo(W-18,hh);x.stroke();}
    x.strokeStyle=inkc; x.lineWidth=2.4; x.strokeRect(16,16,W-32,H-32);
    x.lineWidth=1; x.strokeRect(24,24,W-48,H-48);
  } else if(mode==='night'){
    x.fillStyle='#fff';
    for(let i=0;i<90;i++){x.globalAlpha=0.3+r()*0.6;x.fillRect(r()*W,r()*(H-200),1.6,1.6);}
    x.globalAlpha=1;
    x.beginPath();x.arc(W*0.82,90,30,0,6.29);x.fillStyle='#fff3c8';x.fill();
  } else if(mode==='day'){
    x.fillStyle='#fff'; x.globalAlpha=0.85;
    for(let i=0;i<2;i++){const cxx=W*(0.2+r()*0.6),cyy=60+r()*70;
      for(let k=0;k<4;k++){x.beginPath();x.arc(cxx+k*26-40,cyy+(k%2)*8,20+((k*7)%12),0,6.29);x.fill();}}
    x.globalAlpha=1;
  } else {
    x.beginPath();x.arc(W*(0.2+r()*0.6),120,38,0,6.29);x.fillStyle='#fff0b8';x.fill();
  }
  // ---- blueprint column grid (behind building) ----
  if(blue){
    x.strokeStyle='rgba(150,195,240,0.28)'; x.lineWidth=1; x.setLineDash([3,6]);
    for(let b=0;b<=bays;b++){const cxg=gx+b*bayW;x.beginPath();x.moveTo(cxg,gy-40);x.lineTo(cxg,gy+BH+30);x.stroke();}
    x.setLineDash([]);
  }
  // ---- building body (coloured only) ----
  if(!draft){
    x.fillStyle= mode==='night'?shade(body,-70):body;
    x.fillRect(gx,gy,BW,BH);
    x.fillStyle='rgba(0,0,0,0.16)'; x.fillRect(gx+BW*0.72,gy,BW*0.28,BH);
  }
  x.strokeStyle=inkc; x.lineWidth=2.2; x.strokeRect(gx,gy,BW,BH); x.lineWidth=1;
  // cornice / string courses
  if(!draft) x.fillStyle= mode==='night'?shade(body,-50):shade(body,30);
  for(let i=1;i<=3;i++){
    if(!draft) x.fillRect(gx-6*i,gy-7*i,BW+12*i,7);
    x.strokeRect(gx-6*i,gy-7*i,BW+12*i,7);
  }
  // floor lines + a slim string course halfway up (added depth)
  for(let f=1;f<floors;f++){
    x.lineWidth= (f===Math.floor(floors/2))?1.6:0.8;
    x.beginPath();x.moveTo(gx,gy+f*flH);x.lineTo(gx+BW,gy+f*flH);x.stroke();
  }
  x.lineWidth=1;
  const doorBay=rint(r,0,bays-1);
  const oddF=rint(r,1,Math.max(1,floors-2)), oddB=rint(r,0,bays-1);
  const glass= mode==='night' ? null : (mode==='dusk'?'#7a3a4a':'#1d3a5e');
  // window painter shared by all draft + coloured modes
  function paneFill(){ return draft? null : (mode==='night' ? (Math.random()<0?lit:'#10101e') : glass); }
  for(let f=0;f<floors;f++){
    // ribbon: one continuous band per floor (skip per-bay panes, except ground)
    if(style==='ribbon' && f!==floors-1){
      const wy=gy+f*flH+20, wh=flH-40, rxA=gx+10, rxB=gx+BW-10;
      const fc= draft? null : (mode==='night'?'#10101e':glass);
      if(fc){x.fillStyle=fc;x.fillRect(rxA,wy,rxB-rxA,wh);}
      x.lineWidth=1.2; x.strokeRect(rxA,wy,rxB-rxA,wh);
      for(let b=0;b<=bays;b++){const mxx=gx+b*bayW; if(mxx<=rxA||mxx>=rxB)continue;
        if(mode==='night'&&r()<0.5){x.fillStyle=lit;x.fillRect(Math.max(rxA,mxx-bayW/2+10),wy+1,bayW-20,wh-2);}
        x.beginPath();x.moveTo(mxx,wy);x.lineTo(mxx,wy+wh);x.stroke();}
      continue;
    }
    for(let b=0;b<bays;b++){
      const ground=f===floors-1;
      let wx=gx+b*bayW+26, wy=gy+f*flH+18, ww=bayW-52, wh=flH-38;
      if(f===oddF&&b===oddB) wy+=flH*0.45;
      x.lineWidth=1.2;
      // ---- ground floor: storefront / arcade / entrance ----
      if(ground){
        const cxb=gx+b*bayW+bayW/2;
        if(b===doorBay){
          if(!draft){x.fillStyle=inkc; x.fillRect(cxb-26,gy+BH-72,52,72);}
          x.strokeRect(cxb-26,gy+BH-72,52,72);
          if(draft){x.beginPath();x.moveTo(cxb,gy+BH-72);x.lineTo(cxb,gy+BH);x.stroke();}
          for(let t=0;t<3;t++) x.strokeRect(cxb-34-t*6,gy+BH+t*7,68+t*12,7);
          continue;
        }
        // shopfront glazing
        const sfx=gx+b*bayW+12, sfw=bayW-24, sfy=gy+BH-flH+22, sfh=flH-40;
        const fc= draft? null : (mode==='night'?(r()<0.5?lit:'#10101e'):'#0f2a44');
        if(fc){x.fillStyle=fc;x.fillRect(sfx,sfy,sfw,sfh);}
        x.strokeRect(sfx,sfy,sfw,sfh);
        x.beginPath();x.moveTo(sfx,sfy+sfh*0.62);x.lineTo(sfx+sfw,sfy+sfh*0.62);x.stroke();
        // signage band
        x.lineWidth=0.8; x.strokeRect(sfx,gy+BH-flH+8,sfw,12);
        continue;
      }
      const isLit= mode==='night' && r()<0.55;
      const fillCol= draft? null : (mode==='night' ? (isLit?lit:'#10101e') : glass);
      if(fillCol) x.fillStyle=fillCol;
      if(style==='arch'){
        x.beginPath();
        x.moveTo(wx,wy+wh);x.lineTo(wx,wy+ww/2);
        x.arc(wx+ww/2,wy+ww/2,ww/2,Math.PI,0);
        x.lineTo(wx+ww,wy+wh);x.closePath();
        if(fillCol)x.fill(); x.stroke();
        x.beginPath();x.moveTo(wx+ww/2,wy);x.lineTo(wx+ww/2,wy+wh);x.stroke();
      } else if(style==='strip'){
        if(fillCol)x.fillRect(gx+b*bayW+10,wy+8,bayW-20,wh-16);
        x.strokeRect(gx+b*bayW+10,wy+8,bayW-20,wh-16);
      } else if(style==='oriel'){
        // projecting bay window: trapezoid box with little sloped sill
        const ox=wx-6, ow=ww+12;
        if(fillCol)x.fillRect(ox,wy,ow,wh);
        x.strokeRect(ox,wy,ow,wh);
        x.beginPath();x.moveTo(ox,wy+wh);x.lineTo(ox-7,wy+wh+10);x.lineTo(ox+ow+7,wy+wh+10);x.lineTo(ox+ow,wy+wh);x.stroke();
        x.beginPath();x.moveTo(ox+ow/3,wy);x.lineTo(ox+ow/3,wy+wh);x.moveTo(ox+2*ow/3,wy);x.lineTo(ox+2*ow/3,wy+wh);x.stroke();
      } else {
        if(fillCol)x.fillRect(wx,wy,ww,wh);
        x.strokeRect(wx,wy,ww,wh);
        x.beginPath();x.moveTo(wx+ww/2,wy);x.lineTo(wx+ww/2,wy+wh);
        if(style==='grid4'){x.moveTo(wx,wy+wh/2);x.lineTo(wx+ww,wy+wh/2);}
        else {x.moveTo(wx,wy+wh*0.6);x.lineTo(wx+ww,wy+wh*0.6);}
        x.stroke();
        // sill ticks under non-arch windows (drafting detail)
        if(blue){x.lineWidth=0.8;x.beginPath();x.moveTo(wx-4,wy+wh+3);x.lineTo(wx+ww+4,wy+wh+3);x.stroke();x.lineWidth=1.2;}
      }
      x.lineWidth=0.8; x.beginPath();x.moveTo(wx-6,wy+wh+4);x.lineTo(wx+ww+6,wy+wh+4);x.stroke();
    }
  }
  // ---- awnings (coloured) ----
  if(!draft){
    const awn=pick(['#e8e2d0',shade(body,60),'#d61a3c','#1d4fb8'],r);
    for(let b=0;b<bays;b++){
      if(b===doorBay) continue;
      if(r()<0.6){
        const ax=gx+b*bayW+8, aw=bayW-16, ay=gy+BH-flH+10;
        for(let t=0;t<Math.floor(aw/16);t++){
          x.fillStyle= t%2? awn : '#fff';
          x.beginPath(); x.moveTo(ax+t*16,ay); x.lineTo(ax+Math.min(aw,(t+1)*16),ay);
          x.lineTo(ax+Math.min(aw,(t+1)*16)+6,ay+22); x.lineTo(ax+t*16+6,ay+22); x.closePath(); x.fill();
        }
        x.strokeStyle=inkc; x.lineWidth=1; x.strokeRect(ax+3,ay,aw+6,22);
      }
    }
  }
  // ---- fire escape (kept) ----
  if(r()<0.7){
    const f=rint(r,1,Math.max(1,floors-3)), b=rint(r,0,bays-1);
    const dx=gx+b*bayW+bayW/2, dy=gy+f*flH;
    x.lineWidth=1.4; x.strokeStyle=inkc; x.strokeRect(dx-20,dy+flH-66,40,48);
    for(let t=0;t<4;t++) x.strokeRect(dx-26+t*4,dy+flH-18+t*5,52-t*8,5);
  }
  // ---- roof structure (5 types) ----
  const rx=gx+BW*(0.2+r()*0.6);
  x.lineWidth=1.4; x.strokeStyle=inkc;
  if(!draft) x.fillStyle=shade(body,-30);
  if(roof==='tank'){
    x.beginPath();x.moveTo(rx-26,gy-21);x.lineTo(rx-20,gy-78);x.lineTo(rx+20,gy-78);x.lineTo(rx+26,gy-21);x.stroke();
    if(!draft)x.fillRect(rx-24,gy-78,48,40);
    x.strokeRect(rx-24,gy-78,48,40);
    x.beginPath();x.moveTo(rx-24,gy-78);x.lineTo(rx,gy-100);x.lineTo(rx+24,gy-78);
    if(!draft)x.fill(); x.stroke();
  } else if(roof==='antenna'){
    x.beginPath();x.moveTo(rx,gy-21);x.lineTo(rx,gy-110);x.stroke();
    for(let t=1;t<4;t++){x.beginPath();x.moveTo(rx-14+t*3,gy-30-t*22);x.lineTo(rx+14-t*3,gy-30-t*22);x.stroke();}
  } else if(roof==='parapet'){
    // raised capped parapet wall with crenel gaps
    if(!draft)x.fillRect(gx-4,gy-30,BW+8,30);
    x.strokeRect(gx-4,gy-30,BW+8,30);
    for(let t=gx+10;t<gx+BW-10;t+=46){x.strokeRect(t,gy-44,22,16);}
    x.beginPath();x.moveTo(gx-10,gy-30);x.lineTo(gx+BW+10,gy-30);x.stroke();
  } else if(roof==='skylight'){
    // sawtooth north-light roof
    const n=Math.max(3,Math.floor(BW/120));
    for(let t=0;t<n;t++){const sxk=gx+12+t*(BW-24)/n, sw=(BW-24)/n;
      x.beginPath();x.moveTo(sxk,gy-6);x.lineTo(sxk,gy-46);x.lineTo(sxk+sw*0.7,gy-18);x.lineTo(sxk+sw*0.7,gy-6);x.stroke();
      if(!draft){x.fillStyle='rgba(180,220,255,0.5)';x.beginPath();x.moveTo(sxk,gy-46);x.lineTo(sxk,gy-8);x.lineTo(sxk+10,gy-12);x.lineTo(sxk+10,gy-42);x.closePath();x.fill();}}
  } else {
    if(!draft)x.fillRect(rx-34,gy-62,68,41);
    x.strokeRect(rx-34,gy-62,68,41);
  }
  // ---- ground + apparatus ----
  if(draft){
    x.strokeStyle=inkc;
    x.lineWidth=2.4; x.beginPath();x.moveTo(Mx*0.4,gy+BH);x.lineTo(W-Mx*0.4,gy+BH);x.stroke();
    x.lineWidth=0.8;
    for(let t=Mx*0.4;t<W-Mx*0.4;t+=14){x.beginPath();x.moveTo(t,gy+BH);x.lineTo(t-10,gy+BH+12);x.stroke();}
    // left vertical dimension string
    const dlx=gx-44;
    x.lineWidth=1; x.beginPath();x.moveTo(dlx,gy);x.lineTo(dlx,gy+BH);x.stroke();
    for(let f=0;f<=floors;f++){x.beginPath();x.moveTo(dlx-6,gy+f*flH);x.lineTo(dlx+6,gy+f*flH);x.stroke();}
    x.fillStyle=inkc; x.font='14px "Courier New",monospace'; x.textAlign='center';
    x.save();x.translate(dlx-18,gy+BH/2);x.rotate(-Math.PI/2);
    x.fillText((floors*3.1).toFixed(1)+' M',0,0);x.restore();
    if(blue){
      // top horizontal dimension string
      const dty=gy-46;
      x.beginPath();x.moveTo(gx,dty);x.lineTo(gx+BW,dty);x.stroke();
      for(let b=0;b<=bays;b++){const cxg=gx+b*bayW;x.beginPath();x.moveTo(cxg,dty-6);x.lineTo(cxg,dty+6);x.stroke();}
      x.font='12px "Courier New",monospace';
      for(let b=0;b<bays;b++){x.fillText('3.6',gx+b*bayW+bayW/2,dty-8);}
      // column bubbles
      for(let b=0;b<bays;b++){const cxg=gx+b*bayW+bayW/2, cby=gy-72;
        x.beginPath();x.arc(cxg,cby,13,0,6.29);x.stroke();
        x.fillText(String(b+1),cxg,cby+4);}
      // detail callout bubble on a window
      const cf=rint(r,1,Math.max(1,floors-2)), cb2=rint(r,0,bays-1);
      const cxp=gx+cb2*bayW+bayW/2, cyp=gy+cf*flH+flH/2;
      x.beginPath();x.arc(cxp,cyp,22,0,6.29);x.stroke();
      x.beginPath();x.moveTo(cxp+16,cyp-15);x.lineTo(cxp+70,cyp-46);x.stroke();
      x.font='bold 12px "Courier New",monospace';
      x.beginPath();x.moveTo(cxp,cyp-22);x.lineTo(cxp,cyp+22);x.stroke();
      x.fillText(String(rint(r,1,9)),cxp,cyp-6);x.fillText('A-3'+rint(r,11,99),cxp,cyp+16);
      // north arrow + graphic scale bar (bottom-left)
      const nax=46, nay=H-150;
      x.beginPath();x.moveTo(nax,nay+26);x.lineTo(nax,nay-14);x.stroke();
      x.beginPath();x.moveTo(nax-8,nay-2);x.lineTo(nax,nay-14);x.lineTo(nax+8,nay-2);x.stroke();
      x.font='bold 13px "Courier New",monospace';x.fillText('N',nax,nay-20);
      const sbx=34, sby=H-96, seg=26;
      for(let s=0;s<4;s++){x.fillStyle= s%2?sky:inkc; x.fillRect(sbx+s*seg,sby,seg,8); x.strokeRect(sbx+s*seg,sby,seg,8);}
      x.fillStyle=inkc; x.font='11px "Courier New",monospace'; x.textAlign='left';
      x.fillText('0',sbx-2,sby+22); x.fillText('20M',sbx+4*seg-14,sby+22);
      // title block (bottom-right)
      const PROJECTS=['MERIDIAN BLOCK','SALT WHARF LOFTS','PALE GATE COURT','LONG NOW TOWER','VESPER ARCADE','SOUTH REACH WORKS','LYRIC TERRACE','THE HONEST WEIGHTS'];
      const DRAWINGS=['FRONT ELEVATION','SIDE ELEVATION','STREET ELEVATION','REAR ELEVATION','NORTH ELEVATION','PARTY-WALL ELEVATION'];
      const tbW=Math.min(326,BW*0.7), tbH=104, tbx=W-30-tbW, tby=H-30-tbH;
      x.fillStyle='rgba(8,26,48,0.55)'; x.fillRect(tbx,tby,tbW,tbH);
      x.strokeStyle=inkc; x.lineWidth=1.6; x.strokeRect(tbx,tby,tbW,tbH); x.lineWidth=0.8;
      x.beginPath();x.moveTo(tbx,tby+tbH*0.5);x.lineTo(tbx+tbW,tby+tbH*0.5);x.stroke();
      x.beginPath();x.moveTo(tbx+tbW*0.6,tby+tbH*0.5);x.lineTo(tbx+tbW*0.6,tby+tbH);x.stroke();
      x.fillStyle=inkc; x.textAlign='left';
      x.font='bold 16px "Courier New",monospace'; x.fillText(pick(PROJECTS,r),tbx+10,tby+26);
      x.font='12px "Courier New",monospace'; x.fillText(pick(DRAWINGS,r),tbx+10,tby+44);
      x.fillText('SCALE 1:'+pick(['50','100','100','200'],r),tbx+10,tby+tbH*0.5+20);
      x.fillText('DRAWN '+pick(['E.M.','R.F.','V.K.','S.O.','D.L.'],r),tbx+10,tby+tbH*0.5+38);
      x.textAlign='right';
      x.font='bold 22px "Courier New",monospace'; x.fillText('A-'+rint(r,101,499),tbx+tbW-12,tby+tbH-32);
      x.font='11px "Courier New",monospace'; x.fillText('SHT '+rint(r,1,9)+' OF '+rint(r,9,24),tbx+tbW-12,tby+tbH-12);
    } else {
      // ink keeps its classic caption
      x.fillStyle=inkc; x.font='17px "Courier New",monospace'; x.textAlign='center';
      x.fillText('ELEVATION '+pick(['A','B','C','D'],r)+' — BLDG. '+rint(r,1,99),W/2,H-46);
    }
  } else {
    x.fillStyle= mode==='night'?'#0c0c18':'#3a3a44';
    x.fillRect(0,gy+BH,W,H-(gy+BH));
    x.strokeStyle= mode==='night'?'#2a2a3a':'#666672'; x.lineWidth=0.8;
    for(let t=20;t<W-20;t+=14){x.beginPath();x.moveTo(t,gy+BH);x.lineTo(t-10,gy+BH+12);x.stroke();}
    if(r()<0.5){x.fillStyle= mode==='night'?'#cfd2e8':'#f2f2ea';
      x.font='17px "Courier New",monospace'; x.textAlign='center';
      x.fillText('ELEVATION '+pick(['A','B','C','D'],r)+' — BLDG. '+rint(r,1,99),W/2,H-46);}
  }
}

/* PYRO — "Use Once, Remember Always" */
function pyro(cv,seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:900},{W:1050,H:1050},{W:700,H:1280},{W:1500,H:700}],r);
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const bg=pick(['#070310','#0a0618','#020a12','#10020a','#020614'],r);
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  x.fillStyle='#fff';
  for(let i=0;i<70;i++){x.globalAlpha=0.1+r()*0.3;x.fillRect(r()*W,r()*H*0.6,1.4,1.4);}
  x.globalAlpha=1;
  const ground=pick(['hills','city','water','none'],r);
  const label=pick(['tag','none','none','none','none'],r);
  const hy= ground==='water'? H*0.72 : H-160;
  const COLS=['#ffd514','#ff2b6e','#00e5c0','#ff7a2b','#7fd4ff','#c8ff00','#ff2bd1','#fff3c8'];
  const nb=rint(r,1,W>1400?5:3);
  const brs=[];
  for(let b=0;b<nb;b++){
    brs.push({
      bx:W*(nb===1?0.35+r()*0.3:0.18+b*0.6/(nb-1)+r()*0.08),
      by:(ground==='water'?hy:H)*(0.2+r()*0.28),
      R:(nb===1?250:150)+r()*60,
      c1:pick(COLS,r), c2:pick(COLS,r),
      kind:pick(['PEONY','CHRYSANTHEMUM','WILLOW','RING','CROSSETTE'],r),
      s2:Math.floor(r()*1e9),
    });
  }
  function drawBurst(b){
    const br2=rng(b.s2);
    const {bx,by,R,c1,c2,kind}=b;
    x.strokeStyle='rgba(255,240,200,0.5)'; x.lineWidth=2; x.setLineDash([4,9]);
    x.beginPath(); x.moveTo(bx+(br2()-0.5)*60,hy-10); x.quadraticCurveTo(bx-20,by+R,bx,by); x.stroke();
    x.setLineDash([]);
    function glowLine(x1,y1,x2,y2,col){
      x.strokeStyle=col; x.globalAlpha*=0.22; x.lineWidth=7;
      x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke();
      x.globalAlpha/=0.22; x.lineWidth=1.8;
      x.beginPath();x.moveTo(x1,y1);x.lineTo(x2,y2);x.stroke();
    }
    if(kind==='RING'){
      x.strokeStyle=c1; const ga=x.globalAlpha; x.globalAlpha=ga*0.25; x.lineWidth=10;
      x.beginPath();x.arc(bx,by,R*0.8,0,6.29);x.stroke();
      x.globalAlpha=ga;
      for(let i=0;i<40;i++){const a=i/40*6.283;
        x.fillStyle= i%2?c1:c2;
        x.beginPath();x.arc(bx+Math.cos(a)*R*0.8,by+Math.sin(a)*R*0.8,3.4,0,6.29);x.fill();}
    } else {
      const rays=rint(br2,26,46);
      for(let i=0;i<rays;i++){
        const a=i/rays*6.283+br2()*0.05;
        const len=R*(0.75+br2()*0.3);
        const col= i%3===0?c2:c1;
        if(kind==='WILLOW'){
          x.strokeStyle=col; x.lineWidth=1.8;
          x.beginPath(); x.moveTo(bx,by);
          x.quadraticCurveTo(bx+Math.cos(a)*len*0.7,by+Math.sin(a)*len*0.7,
            bx+Math.cos(a)*len*0.9,by+Math.sin(a)*len*0.5+len*0.55);
          x.stroke();
        } else {
          glowLine(bx,by,bx+Math.cos(a)*len,by+Math.sin(a)*len,col);
          x.fillStyle=col;
          x.beginPath();x.arc(bx+Math.cos(a)*len,by+Math.sin(a)*len,kind==='CHRYSANTHEMUM'?2:3.2,0,6.29);x.fill();
          if(kind==='CROSSETTE'&&i%4===0){
            for(let k=0;k<4;k++){const aa=a+k*1.57+0.78;
              glowLine(bx+Math.cos(a)*len,by+Math.sin(a)*len,
                bx+Math.cos(a)*len+Math.cos(aa)*26,by+Math.sin(a)*len+Math.sin(aa)*26,c2);}
          }
        }
      }
      x.fillStyle=c1; const ga=x.globalAlpha; x.globalAlpha=ga*0.4;
      x.beginPath();x.arc(bx,by,16,0,6.29);x.fill();x.globalAlpha=ga;
      x.fillStyle='#fff';x.beginPath();x.arc(bx,by,5,0,6.29);x.fill();
    }
  }
  brs.forEach(drawBurst);
  if(ground==='water'){
    x.fillStyle=shade(bg,8);
    x.fillRect(0,hy,W,H-hy);
    x.save();
    x.beginPath(); x.rect(0,hy,W,H-hy); x.clip();
    x.translate(0,2*hy); x.scale(1,-1);
    x.globalAlpha=0.22;
    brs.forEach(drawBurst);
    x.globalAlpha=1;
    x.restore();
    x.strokeStyle='rgba(255,255,255,0.12)'; x.lineWidth=1.6;
    for(let i=0;i<8;i++){const yy=hy+12+i*((H-hy-30)/8);
      x.beginPath();x.moveTo(W*r()*0.3,yy);x.lineTo(W-W*r()*0.3,yy);x.stroke();}
  } else if(ground==='city'){
    x.fillStyle='#000';
    for(let t=0;t<W;t+=rint(r,50,110)){
      const hh=rint(r,30,110), bw2=rint(r,34,80);
      x.fillRect(t,H-120-hh,bw2,hh+120);
      x.fillStyle='#ffd96b';
      for(let wy2=H-100-hh;wy2<H-40;wy2+=18) for(let wx2=t+6;wx2<t+bw2-6;wx2+=14)
        if(hash2(wx2,wy2)<0.3) x.fillRect(wx2,wy2,4,6);
      x.fillStyle='#000';
    }
  } else if(ground==='hills'){
    x.fillStyle='#000';
    x.beginPath(); x.moveTo(0,H-160);
    for(let t=0;t<=W;t+=80) x.lineTo(t,H-160-hash2(t,seed%97)*40);
    x.lineTo(W,H); x.lineTo(0,H); x.closePath(); x.fill();
  }
  if(label!=='none'){
    x.strokeStyle='#e8dfc0'; x.lineWidth=2.4; x.strokeRect(36,36,W-72,H-72);
    x.lineWidth=0.8; x.strokeRect(44,44,W-88,H-88);
  }
  const no=rint(r,3,88);
  const title='No. '+no+' — '+pick(['GOLDEN','SILVER','CRIMSON','EMERALD','PHANTOM','ROYAL'],r)+' '+brs[0].kind+' · '+rint(r,2,6)+'″ SHELL';
  if(label==='plate'){
    x.fillStyle='#0c0a14'; x.fillRect(60,H-112,W-120,52);
    x.strokeStyle='#e8dfc0'; x.lineWidth=1.4; x.strokeRect(60,H-112,W-120,52);
    x.fillStyle='#f2ead0'; x.textAlign='center';
    x.font='22px Georgia,serif';
    x.fillText(title,W/2,H-78);
  } else if(label==='tag'){
    x.fillStyle='#f2ead0'; x.textAlign='left';
    x.font='18px Georgia,serif';
    x.fillText(title,64,84);
  }
}

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
function fortyfive(cv,seed){
  const r=rng(seed);
  const mode=pick(['flat','flat','sleeve','crop','stack'],r);
  const fmt= mode==='sleeve'? {W:900,H:1100} : mode==='stack'? {W:1240,H:950} : {W:1000,H:1000};
  const W=fmt.W,H=fmt.H;
  cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const BGS=['#7fd8c8','#2bb8e8','#ff7a2b','#1a1a22','#d61a8c','#0f8a3c','#ffd514','#10341c','#6a1428','#bcd8f0'];
  const bg=pick(BGS,r);
  x.fillStyle=bg; x.fillRect(0,0,W,H);
  if(r()<0.35){ // halftone field
    x.fillStyle='rgba(0,0,0,0.13)';
    for(let yy=20;yy<H;yy+=34) for(let xx=20+((yy/34)%2)*17;xx<W;xx+=34){
      x.beginPath();x.arc(xx,yy,3.2,0,6.29);x.fill();}
  }
  const LABS=['#ffd514','#e0202e','#1d4fb8','#ff7a2b','#0f9a3c','#f2e2b8','#d61a8c'];
  const song=pick(['MIDNIGHT ON THE FLOOR','TELL YOUR SISTER','NO MORE WEATHER','KISS THE DIAL','THE LONG WAY ROUND','DON\'T COUNT THE CHANGE','EVERY LIGHT IN TOWN','SORRY I MISSED JUNE'],r);
  const artist=pick(['THE MERIDIANS','RAY FATHOM & THE CORES','THE SALT GARDEN FIVE','EDIE & THE OWLS','THE HONEST WEIGHTS','V. & THE VANISHING'],r);
  const brand=pick(['LYRIC','MERIDIAN','SALT CITY','PALE GATE','LONG NOW','MERCY'],r);
  function drawDisc(ccx,ccy,R,s2,withText){
    const dr=rng(s2);
    const vinyl=pick(['#16161a','#16161a','#16161a','#8c1420','#155a8c','#7a4b0f'],dr);
    x.fillStyle=vinyl;
    x.beginPath(); x.arc(ccx,ccy,R,0,6.29); x.fill();
    for(let g=0;g<26;g++){
      x.strokeStyle='rgba(255,255,255,'+(0.025+(g%5===0?0.02:0))+')';
      x.lineWidth=Math.max(1,R*0.0035);
      x.beginPath(); x.arc(ccx,ccy,R-R*0.035-g*R*0.0225,0,6.29); x.stroke();
    }
    x.save();
    x.beginPath(); x.arc(ccx,ccy,R,0,6.29); x.clip();
    const ang=dr()*6.28;
    x.strokeStyle='rgba(255,255,255,0.06)';
    for(let i=0;i<3;i++){
      x.lineWidth=(26-i*7)*R/400;
      x.beginPath(); x.arc(ccx,ccy,R*0.6,ang+i*0.05,ang+0.7-i*0.05); x.stroke();
      x.beginPath(); x.arc(ccx,ccy,R*0.6,ang+3.14+i*0.05,ang+3.84-i*0.05); x.stroke();
    }
    x.restore();
    let lab=pick(LABS,dr); while(lab===bg)lab=pick(['#e0202e','#1d4fb8'],dr);
    x.fillStyle=lab;
    x.beginPath(); x.arc(ccx,ccy,R*0.36,0,6.29); x.fill();
    x.strokeStyle='rgba(0,0,0,0.3)'; x.lineWidth=1.6;
    x.beginPath(); x.arc(ccx,ccy,R*0.36,0,6.29); x.stroke();
    if(withText){
      const dark=(lab==='#f2e2b8'||lab==='#ffd514');
      const tcol= dark?'#1c1410':'#fff8e8';
      const f=R/400;
      x.fillStyle=tcol; x.textAlign='center';
      x.font='bold '+Math.round(34*f)+'px Georgia,serif';
      x.fillText(brand,ccx,ccy-R*0.2);
      x.font=Math.round(13*f)+'px Georgia,serif';
      x.fillText('RECORDS',ccx,ccy-R*0.2+22*f);
      x.font='bold '+Math.round(24*f)+'px Georgia,serif';
      x.fillText('“'+song+'”',ccx,ccy+34*f);
      x.font='italic '+Math.round(19*f)+'px Georgia,serif';
      x.fillText(artist,ccx,ccy+66*f);
      x.font=Math.round(13*f)+'px "Courier New",monospace';
      x.textAlign='left'; x.fillText('45 RPM',ccx-R*0.3,ccy+R*0.27);
      x.textAlign='right'; x.fillText(pick(['SIDE A','SIDE B'],dr)+' · '+rint(dr,2,4)+':'+rint(dr,10,59),ccx+R*0.3,ccy+R*0.27);
    }
    x.fillStyle=bg;
    x.beginPath(); x.arc(ccx,ccy,R*0.033,0,6.29); x.fill();
    x.strokeStyle='rgba(0,0,0,0.4)'; x.lineWidth=2;
    x.beginPath(); x.arc(ccx,ccy,R*0.033,0,6.29); x.stroke();
  }
  if(mode==='flat'){
    drawDisc(W/2,H/2,400,seed*7+1,true);
  } else if(mode==='crop'){
    drawDisc(W*(0.3+r()*0.4),H*(0.3+r()*0.4),W*0.74,seed*7+1,true);
  } else if(mode==='stack'){
    drawDisc(W*0.26,H*0.42,300,seed*7+1,false);
    drawDisc(W*0.52,H*0.56,300,seed*7+2,false);
    drawDisc(W*0.76,H*0.4,300,seed*7+3,true);
  } else { // sleeve
    drawDisc(W/2,H*0.29,330,seed*7+1,false);
    const sx0=W*0.08, sy0=H*0.42, sw=W*0.84, sh=H*0.5;
    let sc1=pick(LABS,r); while(sc1===bg)sc1=pick(['#e0202e','#1d4fb8'],r);
    let sc2=pick(LABS,r); while(sc2===sc1)sc2=pick(['#ffd514','#f2e2b8','#1a1a22'],r);
    x.fillStyle=sc1; x.fillRect(sx0,sy0,sw,sh);
    const art=pick(['band','circle','bars'],r);
    x.fillStyle=sc2;
    if(art==='band'){
      x.beginPath();x.moveTo(sx0,sy0+sh*0.55);x.lineTo(sx0+sw,sy0+sh*0.25);
      x.lineTo(sx0+sw,sy0+sh*0.55);x.lineTo(sx0,sy0+sh*0.85);x.closePath();x.fill();
    } else if(art==='circle'){
      x.beginPath();x.arc(sx0+sw*0.72,sy0+sh*0.5,sh*0.3,0,6.29);x.fill();
    } else {
      for(let i=0;i<4;i++)x.fillRect(sx0+sw*0.1+i*sw*0.22,sy0+sh*0.12,sw*0.09,sh*0.76);
    }
    x.strokeStyle='rgba(0,0,0,0.4)'; x.lineWidth=4; x.strokeRect(sx0,sy0,sw,sh);
    const dark2=(sc1==='#f2e2b8'||sc1==='#ffd514');
    x.fillStyle= dark2?'#1c1410':'#fff8e8'; x.textAlign='left';
    const tx=sx0+38, tw=sw-76; // left+right inset: keep every line on the sleeve
    fitText(x,'“'+song+'”',tw,(p)=>'bold '+p+'px Georgia,serif',54);
    x.fillText('“'+song+'”',tx,sy0+92);
    fitText(x,artist,tw,(p)=>'italic '+p+'px Georgia,serif',28);
    x.fillText(artist,tx,sy0+138);
    fitText(x,brand+' RECORDS · 45 RPM',tw,(p)=>p+'px "Courier New",monospace',15);
    x.fillText(brand+' RECORDS · 45 RPM',tx,sy0+sh-32);
  }
  if(mode!=='crop'&&r()<0.4){
    x.fillStyle='#fff';
    x.save(); x.translate(W-110,110); x.rotate(0.2);
    x.fillRect(-54,-30,108,60);
    x.fillStyle='#d61a3c'; x.font='bold 28px Helvetica,Arial,sans-serif'; x.textAlign='center';
    x.fillText(pick(['49¢','99¢','2 FOR 1¢','AS IS'],r),0,10);
    x.restore();
  }
}
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
function castTape(seed){
  const r=rng(seed);
  const kind=pick(['candles','candles','line','area','phone','bars'],r);
  const ti=Math.floor(r()*7);
  return {kind,ti};
}
function castPlat(seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1100,H:1100}],r);
  const si=Math.floor(r()*4);
  return {fmt,si};
}
function castEphemeris(seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:1000},{W:1050,H:1050}],r);
  const si=Math.floor(r()*6);
  const comp=pick(['field','field','plani','horizon'],r);
  return {fmt,si,comp};
}
function castReceipt(seed){
  const r=rng(seed);
  const W=pick([380,560,560,920],r);
  const si=Math.floor(r()*6);
  const n=rint(r,3,22);
  return {W,si,n};
}
function castFacade(seed){
  const r=rng(seed);
  const bays=rint(r,3,8), floors=rint(r,4,11);
  const rare=r()<0.04;
  const mode= rare ? ['day','dusk','night'][Math.floor(r()*3)] : (r()<0.5?'ink':'blueprint');
  const style=pick(['2pane','arch','grid4','strip','ribbon','oriel'],r);
  const roof=pick(['tank','antenna','bulkhead','parapet','skylight'],r);
  return {bays,floors,mode,style,roof};
}
function castLoom(seed){
  const r=rng(seed);
  const H=pick([840,1180,1000],r), T=pick([5,6,8,11,14],r);
  const pi2=Math.floor(r()*10);
  const cols=Math.floor(1000/T);
  for(let c=0;c<cols;c++) r(); // warp feather offsets
  const P=rint(r,14,64);
  r(); // thr factor
  const twill=r()<0.5;
  const motif=pick(['diamond','chevron','band','block'],r);
  return {T,pi2,twill,motif};
}
function castCore(seed){
  const r=rng(seed);
  const two=r()<0.35;
  const uv=r()<0.45;
  return {two,uv};
}
function castStamp(seed){
  const r=rng(seed);
  r(); // fmt pick
  r(); // album pick
  for(let i=0;i<500;i++){r();r();r();} // paperNoise burn
  const fi=Math.floor(r()*8); // field
  r(); // inkc
  r(); // per
  const fr=pick(['double','thick','dash'],r);
  const motif=pick(['peak','ship','beacon','bird','cog','wave','star2','tree'],r);
  return {fi,fr,motif};
}
function castTransit(seed){
  const r=rng(seed);
  r(); // fmt
  const dark=r()<0.4;
  for(let i=8;i>0;i--) Math.floor(r()*(i+1)); // shuffle(9) burn
  const G=pick([40,40,64],r);
  const nLines= G>40? rint(r,3,5) : rint(r,4,7);
  return {dark,G,nLines};
}
function castMatchbook(seed){
  const r=rng(seed);
  const fmt=pick([{W:840,H:1100},{W:1100,H:840}],r);
  const si=Math.floor(r()*10);
  return {fmt,si};
}
function castPyro(seed){
  const r=rng(seed);
  const fmt=pick([{W:1000,H:1240},{W:1240,H:900},{W:1050,H:1050},{W:700,H:1280},{W:1500,H:700}],r);
  r(); // bg
  for(let i=0;i<70;i++){r();r();r();} // star burn
  const ground=pick(['hills','city','water','none'],r);
  pick(['tag','none','none','none','none'],r); // label
  const nb=rint(r,1,fmt.W>1400?5:3);
  return {fmt,ground,nb};
}
function castPacket(seed){
  const r=rng(seed);
  const si=Math.floor(r()*8);
  for(let i=0;i<500;i++){r();r();r();} // paperNoise burn
  const plant=pick(['radish','carrot','sunflower','tulip','tomato','peas','chili','beet','corn'],r);
  return {si,plant};
}
function castPennant(seed){
  const r=rng(seed);
  const vert=r()<0.3;
  const bi=Math.floor(r()*10);
  for(let i=0;i<400;i++){r();r();r();} // paperNoise burn
  const fi=Math.floor(r()*9); // felt
  return {vert,bi,fi};
}
function castFortyfive(seed){
  const r=rng(seed);
  const mode=pick(['flat','flat','sleeve','crop','stack'],r);
  const bi=Math.floor(r()*10);
  return {mode,bi};
}
function castPoolside(seed){
  const r=rng(seed);
  r(); // fmt
  const base=pick(['lawn','deck','deck','lawn'],r);
  r(); r(); // decorrelation burns after seed-math deck
  const wi=Math.floor(r()*5); // water
  r(); // shA
  r(); // mow stripe width / tile pitch
  r(); r(); r(); r(); // ps, ph factor, px0, py0
  const kind=pick(['rect','kidney','ell','lap','round'],r);
  return {base,wi,kind};
}
function castInterference(seed){
  const r=rng(seed);
  r(); // fmt
  const si=Math.floor(r()*9);
  const combo=pick(['rings','ringfan','fans','ringgrid'],r);
  return {si,combo};
}
function castDither(seed){
  const r=rng(seed);
  r(); // fmt
  const ri=Math.floor(r()*10);
  r(); // B
  const style=pick(['bayer','bayer','dots','lines','diag'],r);
  const comp=pick(['orb','twin','horizon','diag','well','bars','rings','wave'],r);
  return {ri,style,comp};
}
function castCutout(seed){
  const r=rng(seed);
  r(); // fmt
  const si=Math.floor(r()*10);
  for(let i=0;i<600;i++){r();r();r();} // paperNoise burn
  for(let i=3;i>0;i--) Math.floor(r()*(i+1)); // shuffle(4) burn
  const comp=pick(['anchor','anchor','scatter','totem'],r);
  return {si,comp};
}
function castHardwater(seed){
  const r=rng(seed);
  r(); // fmt
  const pi2=Math.floor(r()*6);
  r(); // reverse
  const vert=r()<0.35;
  const nb=rint(r,3,18);
  return {pi2,vert,nb};
}
function castTurfwar(seed){
  const r=rng(seed);
  r(); // fmt
  const k=rint(r,8,15);
  const ai=Math.floor(r()*6);
  return {k,ai};
}
function castAvalanche(seed){
  const r=rng(seed);
  const two=r()<0.3;
  const grains=rint(r,24000,72000);
  return {two,grains};
}

/* ===================== NEW PROJECTS (2026-06-13) =====================
   Built for VARIETY: each engine is one motif rendered through several very
   different compositions + aspect ratios, so a project's outputs never blur
   together. Trait-bearing draws lead; cast* mirrors them exactly. */

/* CHATROOM — "Everyone Is Typing": the group chat as art. One motif (a live
   thread) across six compositions/aspects: full thread, hero bubble, lock-
   screen stack, split conversation, member presence grid, wide panorama. */
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
  return {comp,themeI,accI,members,notice};
}

/* AFTERGLOW — "Night Service": one primitive (a glowing light-ribbon) under
   additive bloom. Simple system, aesthetics-first: smooth bezier trails, neon
   gradients, soft glow, film grain, vignette + scanlines. Variety from
   palette × format × mode (stream/rain/spiral/horizon/orbit) × randomness. */
const NEON_PALS=[
  {name:'Synthwave', a:'#2b1055', b:'#0d0221', ink:['#ff2a6d','#05d9e8','#d100ff']},
  {name:'Miami', a:'#241a6b', b:'#0a0030', ink:['#ff6ec7','#01fff5','#ffe600']},
  {name:'Toxic', a:'#0b2a1f', b:'#01100a', ink:['#39ff14','#00fff7','#ccff00']},
  {name:'Blade', a:'#1b1f3b', b:'#05060f', ink:['#ff9e00','#00b4d8','#ff006e']},
  {name:'Ember', a:'#2d0b00', b:'#0a0000', ink:['#ff5400','#ff0054','#ffbd00']},
  {name:'Ultraviolet', a:'#1a0040', b:'#05000f', ink:['#c77dff','#9d4edd','#00f5d4']},
  {name:'Ice', a:'#012a4a', b:'#000814', ink:['#48cae4','#caf0f8','#00b4d8']},
  {name:'Sakura', a:'#3a0ca3', b:'#10002b', ink:['#ff85a1','#ffc2d1','#f72585']},
  {name:'Acid Rain', a:'#1a3300', b:'#04140a', ink:['#9ef01a','#ccff33','#38ff8e']},
  {name:'Magma', a:'#1a0500', b:'#000000', ink:['#ff7900','#ff2d00','#ffba08']},
  {name:'Vapor', a:'#2a1a52', b:'#0b0018', ink:['#ff71ce','#01cdfe','#05ffa1']},
  {name:'Signal', a:'#001a26', b:'#000308', ink:['#00f5d4','#fee440','#f15bb5']},
];
const NEON_FMTS=[{W:1080,H:1080,t:'Square'},{W:920,H:1280,t:'Portrait'},{W:1280,H:920,t:'Landscape'},{W:760,H:1300,t:'Tall'},{W:1500,H:760,t:'Wide'}];
const NEON_MODES=['stream','rain','spiral','orbit'];
function afterglow(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*NEON_PALS.length);
  const fmtI=Math.floor(r()*NEON_FMTS.length);
  const mode=pick(NEON_MODES,r);
  const n= mode==='spiral'? rint(r,12,24) : mode==='orbit'? rint(r,18,36) : rint(r,6,13);
  const scan=r()<0.55;
  // ---- end trait draws ----
  const P=NEON_PALS[palI], F=NEON_FMTS[fmtI]; const W=F.W,H=F.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  // background vertical gradient
  const bg=x.createLinearGradient(0,0,0,H); bg.addColorStop(0,P.a); bg.addColorStop(1,P.b); x.fillStyle=bg; x.fillRect(0,0,W,H);
  // soft central glow bloom behind everything
  const cx0=W*(0.35+r()*0.3), cy0=H*(0.3+r()*0.4);
  const gl=x.createRadialGradient(cx0,cy0,0,cx0,cy0,Math.max(W,H)*0.7);
  gl.addColorStop(0, P.ink[0]+'22'); gl.addColorStop(1,'transparent'); x.fillStyle=gl; x.fillRect(0,0,W,H);
  const col=()=>P.ink[Math.floor(r()*P.ink.length)];
  function path(pts){x.beginPath();x.moveTo(pts[0][0],pts[0][1]);for(let i=1;i<pts.length-1;i++){const mx=(pts[i][0]+pts[i+1][0])/2,my=(pts[i][1]+pts[i+1][1])/2;x.quadraticCurveTo(pts[i][0],pts[i][1],mx,my);}x.lineTo(pts[pts.length-1][0],pts[pts.length-1][1]);}
  function ribbon(pts,c,wide){
    x.save(); x.globalCompositeOperation='lighter'; x.lineCap='round'; x.lineJoin='round'; x.shadowColor=c;
    [[wide*2.6,0.10],[wide*1.5,0.22],[wide,0.5]].forEach(p=>{x.globalAlpha=p[1];x.lineWidth=p[0];x.strokeStyle=c;x.shadowBlur=wide*2;path(pts);x.stroke();});
    x.globalAlpha=0.9; x.lineWidth=Math.max(1,wide*0.26); x.strokeStyle='#ffffff'; x.shadowBlur=wide*0.8; path(pts); x.stroke();
    x.restore();
  }
  function dust(){x.save();x.globalCompositeOperation='lighter';for(let i=0;i<Math.max(W,H)/3;i++){const c=col();x.globalAlpha=0.15+r()*0.5;x.fillStyle=c;const s=r()<0.1?2.4:1.2;x.fillRect(r()*W,r()*H,s,s);}x.restore();}
  dust();
  if(mode==='stream'){
    for(let i=0;i<n;i++){const baseY=H*(0.08+0.84*((i+0.5+ (r()-0.5))/n));const amp=H*(0.03+r()*0.13),ph=r()*6.29,fr=0.7+r()*2;const pts=[];for(let s=0;s<=20;s++){const t=s/20;pts.push([t*W*1.02-W*0.01, baseY+Math.sin(ph+t*fr*6.29)*amp*(0.5+t)]);}ribbon(pts,col(),3+r()*11);}
  } else if(mode==='rain'){
    for(let i=0;i<n*1.5;i++){const baseX=W*((i+0.5)/(n*1.5))+(r()-0.5)*40;const amp=W*(0.01+r()*0.05),ph=r()*6.29;const pts=[];for(let s=0;s<=16;s++){const t=s/16;pts.push([baseX+Math.sin(ph+t*6.29)*amp, t*H*1.04-H*0.02]);}ribbon(pts,col(),2+r()*7);}
  } else if(mode==='spiral'){
    const sx=W*(0.42+r()*0.16),sy=H*(0.42+r()*0.16);const cw=r()<0.5?1:-1;
    for(let i=0;i<n;i++){const a0=i/n*6.29,turns=2.5+r()*4,rmax=Math.min(W,H)*(0.4+r()*0.16);const pts=[];const steps=80;for(let s=0;s<=steps;s++){const t=s/steps,ang=a0+cw*t*turns*6.29,rad=t*rmax;pts.push([sx+Math.cos(ang)*rad,sy+Math.sin(ang)*rad]);}ribbon(pts,col(),2+r()*5);}
  } else { // orbit — dense concentric arcs
    const sx=W*(0.42+r()*0.16),sy=H*(0.42+r()*0.16),squash=0.55+r()*0.4;
    for(let i=0;i<n;i++){const rad=Math.min(W,H)*(0.08+i/n*0.44)+(r()-0.5)*16,a0=r()*6.29,sweep=1.2+r()*4.5;const pts=[];const steps=56;for(let s=0;s<=steps;s++){const t=s/steps,ang=a0+t*sweep;pts.push([sx+Math.cos(ang)*rad,sy+Math.sin(ang)*rad*squash]);}ribbon(pts,col(),2+r()*6);}
  }
  // ---- finish: scanlines, grain, vignette ----
  if(scan){x.save();x.globalAlpha=0.06;x.fillStyle='#000';for(let yy=0;yy<H;yy+=3)x.fillRect(0,yy,W,1.4);x.restore();}
  x.save();x.globalAlpha=0.045;for(let i=0;i<W*H/700;i++){const v=r()<0.5?'255,255,255':'0,0,0';x.fillStyle='rgba('+v+',1)';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*0.3,W/2,H/2,Math.max(W,H)*0.75); vg.addColorStop(0,'transparent'); vg.addColorStop(1,'rgba(0,0,0,0.55)'); x.fillStyle=vg; x.fillRect(0,0,W,H);
}
function castAfterglow(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*NEON_PALS.length);
  const fmtI=Math.floor(r()*NEON_FMTS.length);
  const mode=pick(NEON_MODES,r);
  const n= mode==='spiral'? rint(r,12,24) : mode==='orbit'? rint(r,18,36) : rint(r,6,13);
  return {palI,fmtI,mode,n};
}

/* BREACH — "Breach Protocol": gritty Cyberpunk-2077 interface debris. One
   system (a tech HUD overlay) torn up by glitch: RGB slice displacement,
   scanlines, grime, chromatic type. Variety from palette × format × layout
   (reticle / dashboard / breach-grid / signage) × random data + kanji. */
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
  return {palI,fmtI,layout,dens};
}

/* GRAFFITI — "Graffiti Soul": cel-shaded street graffiti, Jet Set Radio energy.
   Primitives (bubble blob, block arrow, splat, drip, 4-pt star) stamped with
   thick outlines, hard drop-shadow, cel highlight + spray haze on a textured
   wall. Visual-led, no readable type. Variety = palette × format × mode
   (piece/bombing/arrows/splash/character) × randomness. */
const GRAF_PALS=[
  {name:'Tokyo-to', wall:'#191921', ink:['#ff2e63','#08d9d6','#ffde00','#ff7a2b','#f5f5f5']},
  {name:'Rudie', wall:'#efe6d2', ink:['#d62828','#003049','#f77f00','#118ab2','#06d6a0']},
  {name:'Concrete', wall:'#3a3a40', ink:['#ffd400','#ff2e63','#23d5ab','#ffffff','#ff7a2b']},
  {name:'Funk', wall:'#120a1f', ink:['#f900bf','#fffb00','#00fff5','#ff6d00','#ffffff']},
  {name:'Acid', wall:'#0c1406', ink:['#c8ff00','#ff006e','#00e5ff','#ffaa00','#ffffff']},
  {name:'Bubblegum', wall:'#ffe3ef', ink:['#ff0a6c','#7b2ff7','#00b4d8','#ffd000','#222222']},
  {name:'Heatwave', wall:'#2a0a00', ink:['#ff5400','#ffd000','#ff006e','#00f5d4','#fff']},
  {name:'Ice Cream', wall:'#fff6ea', ink:['#ff7eb6','#7afcff','#feff9c','#a685e2','#2b2b2b']},
  {name:'Midnight Tag', wall:'#0a0a14', ink:['#00ff9f','#ff2d6d','#ffe600','#16a4ff','#fff']},
  {name:'Brick', wall:'#5a2a22', ink:['#ffd60a','#06d6a0','#ef476f','#ffffff','#118ab2']},
  {name:'Vapor Wall', wall:'#241a52', ink:['#ff71ce','#01cdfe','#05ffa1','#fffb96','#fff']},
  {name:'Mono Pop', wall:'#101010', ink:['#ffffff','#ff3b3b','#f5f5f5','#ffd000','#cccccc']},
];
const GRAF_FMTS=[{W:1080,H:1080,t:'Square'},{W:920,H:1280,t:'Portrait'},{W:1280,H:920,t:'Landscape'},{W:760,H:1300,t:'Tall'},{W:1500,H:760,t:'Wide'}];
const GRAF_MODES=['piece','bombing','arrows','splash','character'];
function graffiti(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*GRAF_PALS.length);
  const fmtI=Math.floor(r()*GRAF_FMTS.length);
  const mode=pick(GRAF_MODES,r);
  const n= mode==='character'?1 : mode==='bombing'? rint(r,9,17) : mode==='arrows'? rint(r,8,20) : mode==='splash'? rint(r,4,9) : rint(r,3,5);
  // ---- end trait draws ----
  const P=GRAF_PALS[palI], F=GRAF_FMTS[fmtI]; const W=F.W,H=F.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const light=P.wall>'#888888';
  const OUT='#0d0d12';
  const col=()=>pick(P.ink,r);
  // wall: gradient + grime + grain
  const wg=x.createLinearGradient(0,0,W*0.3,H); wg.addColorStop(0,shade(P.wall,light?6:18)); wg.addColorStop(1,shade(P.wall,light?-12:-14)); x.fillStyle=wg; x.fillRect(0,0,W,H);
  for(let i=0;i<W*H/1400;i++){x.globalAlpha=0.03+r()*0.05;x.fillStyle=r()<0.5?'#000':'#fff';x.fillRect(r()*W,r()*H,2,2);} x.globalAlpha=1;
  for(let i=0;i<26;i++){x.globalAlpha=0.05+r()*0.06;x.fillStyle='#000';x.fillRect(r()*W,r()*H,r()*200,r()*8);} x.globalAlpha=1;
  function spray(cx,cy,rad,c,dens){x.save();for(let i=0;i<rad*(dens||1.6);i++){const a=r()*6.29,d=Math.pow(r(),0.5)*rad;x.globalAlpha=0.05+r()*0.18;x.fillStyle=c;x.fillRect(cx+Math.cos(a)*d,cy+Math.sin(a)*d,2.2,2.2);}x.restore();}
  function drip(px,py,len,c){x.fillStyle=c;x.fillRect(px-3.5,py,7,len);x.beginPath();x.arc(px,py+len,5.5,0,6.29);x.fill();x.lineWidth=2.5;x.strokeStyle=OUT;x.beginPath();x.arc(px,py+len,5.5,0,6.29);x.stroke();}
  function star(cx,cy,R,c){x.beginPath();for(let i=0;i<4;i++){const a=i*1.5708;x.lineTo(cx+Math.cos(a)*R,cy+Math.sin(a)*R);const b=a+0.785;x.lineTo(cx+Math.cos(b)*R*0.3,cy+Math.sin(b)*R*0.3);}x.closePath();x.fillStyle=c;x.fill();x.lineWidth=Math.max(2,R*0.09);x.strokeStyle=OUT;x.stroke();}
  function celBlob(cx,cy,R,c,drips){
    const k=rint(r,7,11),rad=[];for(let i=0;i<k;i++)rad.push(R*(0.72+r()*0.5));
    function pathIt(ox,oy){x.beginPath();for(let i=0;i<=k;i++){const a=i/k*6.283,rr=rad[i%k],px=cx+ox+Math.cos(a)*rr,py=cy+oy+Math.sin(a)*rr;if(i===0)x.moveTo(px,py);else{const pa=(i-1)/k*6.283,prr=rad[(i-1)%k],ppx=cx+ox+Math.cos(pa)*prr,ppy=cy+oy+Math.sin(pa)*prr;x.quadraticCurveTo(ppx,ppy,(ppx+px)/2,(ppy+py)/2);}}x.closePath();}
    pathIt(R*0.13,R*0.16);x.fillStyle='rgba(0,0,0,0.32)';x.fill();
    if(drips)for(let d=0;d<rint(r,1,4);d++){const a=1.2+r()*0.8;drip(cx+Math.cos(a)*R*0.7,cy+Math.sin(a)*R*0.7,R*(0.3+r()*0.7),c);}
    pathIt(0,0);x.fillStyle=c;x.fill();
    x.save();pathIt(0,0);x.clip();x.fillStyle='rgba(0,0,0,0.20)';x.beginPath();x.arc(cx+R*0.55,cy+R*0.55,R*1.15,0,6.29);x.fill();
    x.fillStyle='rgba(255,255,255,0.55)';x.beginPath();x.ellipse(cx-R*0.32,cy-R*0.42,R*0.30,R*0.17,-0.5,0,6.29);x.fill();x.restore();
    pathIt(0,0);x.lineWidth=Math.max(4,R*0.13);x.lineJoin='round';x.strokeStyle=OUT;x.stroke();
  }
  function arrow(cx,cy,L,th,ang,c){const t=th,pts=[[-L/2,-t/2],[L/6,-t/2],[L/6,-t],[L/2,0],[L/6,t],[L/6,t/2],[-L/2,t/2]];
    x.save();x.translate(cx,cy);x.rotate(ang);
    x.save();x.translate(L*0.05+8,L*0.05+10);x.fillStyle='rgba(0,0,0,0.3)';x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fill();x.restore();
    x.beginPath();pts.forEach((p,i)=>i?x.lineTo(p[0],p[1]):x.moveTo(p[0],p[1]));x.closePath();x.fillStyle=c;x.fill();
    x.lineJoin='round';x.lineWidth=Math.max(4,th*0.18);x.strokeStyle=OUT;x.stroke();
    x.strokeStyle='rgba(255,255,255,0.55)';x.lineWidth=Math.max(2,th*0.08);x.beginPath();x.moveTo(-L*0.42,-t*0.28);x.lineTo(L*0.1,-t*0.28);x.stroke();x.restore();}
  function splat(cx,cy,R,c){x.fillStyle=c;for(let i=0;i<rint(r,8,16);i++){const a=r()*6.29,d=R*(0.6+r()*0.7),rr=R*(0.06+r()*0.18);x.beginPath();x.arc(cx+Math.cos(a)*d,cy+Math.sin(a)*d,rr,0,6.29);x.fill();}celBlob(cx,cy,R*0.75,c,true);}
  // optional spray haze behind focal art
  function haze(cx,cy,R){spray(cx,cy,R,col(),0.8);}

  if(mode==='piece'){
    const cy=H*(0.42+r()*0.12),R=Math.min(W,H)*(0.16+r()*0.05),span=W*0.8,x0=W*0.5-span/2;
    haze(W*0.5,cy,Math.min(W,H)*0.4);
    for(let i=0;i<n;i++){const cx=x0+span*(i+0.5)/n+(r()-0.5)*30;celBlob(cx,cy+(r()-0.5)*R*0.5,R*(0.85+r()*0.4),P.ink[i%P.ink.length],true);}
    for(let i=0;i<rint(r,3,7);i++)star(W*r(),H*r(),Math.min(W,H)*(0.02+r()*0.04),col());
    if(r()<0.7)arrow(W*(0.5+ (r()-0.5)*0.4),cy-R*1.5,W*0.3,W*0.1,-0.3+r()*0.6,col());
  } else if(mode==='bombing'){
    for(let i=0;i<n;i++){const t=r();if(t<0.5)celBlob(W*r(),H*r(),Math.min(W,H)*(0.07+r()*0.09),col(),r()<0.6);else if(t<0.8)arrow(W*r(),H*r(),Math.min(W,H)*(0.18+r()*0.18),Math.min(W,H)*0.07,r()*6.29,col());else star(W*r(),H*r(),Math.min(W,H)*(0.03+r()*0.05),col());}
  } else if(mode==='arrows'){
    const flow=r()<0.5,base=(r()-0.5)*1.4;for(let i=0;i<n;i++){const L=Math.min(W,H)*(0.2+r()*0.34);arrow(r()*W,r()*H,L,L*(0.34+r()*0.14),flow?base+(r()-0.5)*0.5:r()*6.29,col());}
    for(let i=0;i<rint(r,2,5);i++)star(W*r(),H*r(),Math.min(W,H)*(0.025+r()*0.04),col());
  } else if(mode==='splash'){
    for(let i=0;i<n;i++)splat(W*(0.2+r()*0.6),H*(0.2+r()*0.6),Math.min(W,H)*(0.1+r()*0.12),col());
    for(let i=0;i<rint(r,3,8);i++)drip(W*r(),H*(0.1+r()*0.4),Math.min(W,H)*(0.08+r()*0.2),col());
  } else { // character — bold abstract mascot
    const cx=W*0.5,cy=H*0.46,R=Math.min(W,H)*0.26;haze(cx,cy,R*1.6);
    const body=P.ink[0];celBlob(cx,cy,R,body,true);
    // eyes
    for(const s of [-1,1]){x.fillStyle='#fff';x.beginPath();x.ellipse(cx+s*R*0.34,cy-R*0.18,R*0.22,R*0.27,0,0,6.29);x.fill();x.lineWidth=Math.max(3,R*0.05);x.strokeStyle=OUT;x.stroke();x.fillStyle=OUT;x.beginPath();x.arc(cx+s*R*0.34+R*0.05,cy-R*0.12,R*0.10,0,6.29);x.fill();}
    // mouth
    x.lineWidth=Math.max(4,R*0.08);x.strokeStyle=OUT;x.beginPath();x.arc(cx,cy+R*0.28,R*0.34,0.2,Math.PI-0.2);x.stroke();
    // arrow ears / limbs
    arrow(cx-R*1.1,cy,R*0.9,R*0.34,3.4,P.ink[1]);arrow(cx+R*1.1,cy,R*0.9,R*0.34,-0.2,P.ink[2%P.ink.length]);
    for(let i=0;i<rint(r,3,6);i++)star(W*r(),H*r(),Math.min(W,H)*(0.025+r()*0.04),col());
  }
  // finish: light vignette + grain
  const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*0.34,W/2,H/2,Math.max(W,H)*0.74);vg.addColorStop(0,'transparent');vg.addColorStop(1,light?'rgba(0,0,0,0.22)':'rgba(0,0,0,0.5)');x.fillStyle=vg;x.fillRect(0,0,W,H);
}
function castGraffiti(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*GRAF_PALS.length);
  const fmtI=Math.floor(r()*GRAF_FMTS.length);
  const mode=pick(GRAF_MODES,r);
  const n= mode==='character'?1 : mode==='bombing'? rint(r,9,17) : mode==='arrows'? rint(r,8,20) : mode==='splash'? rint(r,4,9) : rint(r,3,5);
  return {palI,fmtI,mode,n};
}

/* TELETEXT — "Teletext" (Andreas Gysin / ertdfgcvb homage): a fixed monospace
   grid where one field function per cell indexes a glyph brightness ramp.
   Fixed grid, characters in motion. Shared arrays keep engine + cast in lockstep. */
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

export {
  chatroom, castChatroom,
  afterglow, castAfterglow,
  breach, castBreach,
  graffiti, castGraffiti,
  ascii, castAscii,
  specimen, tape, plat, ephemeris, receipt, facade, loom, core, stamp,
  transit, matchbook, pyro, packet, pennant, fortyfive, poolside,
  interference, dither, cutout, hardwater, turfwar, avalanche,
  castSpecimen, castTape, castPlat, castEphemeris, castReceipt, castFacade,
  castLoom, castCore, castStamp, castTransit, castMatchbook, castPyro,
  castPacket, castPennant, castFortyfive, castPoolside, castInterference,
  castDither, castCutout, castHardwater, castTurfwar, castAvalanche,
};
