// @ts-nocheck
/*
 * AI sample projects — engine core 2. Three deterministic canvas engines
 * (Setback / Simultaneous / Strata), same contract as ./core.ts: each engine
 * paints (cv, seed) and sets its own size; the typed boundary + trait schemas
 * live in ./index.ts. Plain JS under @ts-nocheck by design — frozen art code.
 */
function mulberry32(a){return function(){let t=(a+=0x6d2b79f5);t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;};}
function rng(seed){return mulberry32(((Math.imul(seed>>>0,2654435761))>>>0)||1);}
function pick(a,r){return a[Math.floor(r()*a.length)];}
function rint(r,a,b){return a+Math.floor(r()*(b-a+1));}
function shuffle(a,r){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));const t=x[i];x[i]=x[j];x[j]=t;}return x;}
function randn(r){return r()+r()+r()+r()-2;}
function clamp(v,a,b){return v<a?a:v>b?b:v;}
function h2r(h){const v=parseInt(h.slice(1),16);return [(v>>16)&255,(v>>8)&255,v&255];}
function r2h(c){const f=n=>('0'+Math.round(clamp(n,0,255)).toString(16)).slice(-2);return '#'+f(c[0])+f(c[1])+f(c[2]);}
function mix(a,b,t){const A=h2r(a),B=h2r(b);return r2h([A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t]);}
function lum(h){const c=h2r(h);return (0.2126*c[0]+0.7152*c[1]+0.0722*c[2])/255;}
function rgba(h,a){const c=h2r(h);return 'rgba('+c[0]+','+c[1]+','+c[2]+','+a+')';}
function grain(x,W,H,amt,r){const n=Math.floor(W*H/amt);for(let i=0;i<n;i++){const g=r()<0.5?0:255;x.fillStyle='rgba('+g+','+g+','+g+','+(0.015+r()*0.05)+')';x.fillRect(r()*W,r()*H,1,1);}}
function vignette(x,W,H,s){const g=x.createRadialGradient(W/2,H*0.46,Math.min(W,H)*0.25,W/2,H/2,Math.max(W,H)*0.75);g.addColorStop(0,'rgba(0,0,0,0)');g.addColorStop(1,'rgba(0,0,0,'+s+')');x.fillStyle=g;x.fillRect(0,0,W,H);}
function paperTooth(x,W,H,r){x.save();x.globalCompositeOperation='overlay';for(let i=0;i<W*H/240;i++){const g=r()<0.5?0:255;x.fillStyle='rgba('+g+','+g+','+g+','+(r()*0.06)+')';x.fillRect(r()*W,r()*H,1.3,1.3);}x.restore();}
// multi-octave-ish tinted mottle inside the current clip — the key "texture
// inside the fill" move that reads as material, not vector.
function mottle(x,x0,y0,w,h,col,density,r,blend){x.save();x.globalCompositeOperation=blend||'overlay';const n=Math.floor(w*h/density);for(let i=0;i<n;i++){const dark=r()<0.5;const c=dark?mix(col,'#000',0.34):mix(col,'#fff',0.32);const s=0.8+r()*2.2;x.fillStyle=rgba(c,0.04+r()*0.09);x.fillRect(x0+r()*w,y0+r()*h,s,s);}x.restore();}
const PHI=1.61803398875, INVPHI=0.61803398875;

/* ========================================================================
 * 1. SETBACK — axonometric brutalist massing. Per-face lit gradients,
 *    crevice ambient occlusion, aggregate, board-form, raking light, long
 *    shadow, atmospheric tops. Off-centre placement.
 * ====================================================================== */
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
const SM_PALS=[
  {name:'Cadmium / Cyan', harmony:'Complementary', g:'#0f5c63', f:'#e8472b', a:'#e6b24a'},
  {name:'Ultramarine / Amber', harmony:'Complementary', g:'#1d2a86', f:'#f2a416', a:'#e7e1cf'},
  {name:'Magenta / Viridian', harmony:'Complementary', g:'#0a5f48', f:'#be2f72', a:'#f0cf8a'},
  {name:'Sienna / Teal', harmony:'Split', g:'#1f7c84', f:'#c2532a', a:'#e9b04a'},
  {name:'Plum / Chartreuse', harmony:'Split', g:'#492560', f:'#9aa636', a:'#d98aa0'},
  {name:'Ochre Triad', harmony:'Triad', g:'#2a5fb0', f:'#d99a16', a:'#c0345a'},
  {name:'Rose Analogous', harmony:'Analogous', g:'#7a1f5a', f:'#d94f6a', a:'#f2a35a'},
  {name:'Forest Analogous', harmony:'Analogous', g:'#13483a', f:'#3f8f4f', a:'#cfd96a'},
  {name:'Slate / Coral', harmony:'Complementary', g:'#2d3a4a', f:'#e3654f', a:'#ffd9a0'},
  {name:'Oxblood / Sky', harmony:'Complementary', g:'#7a2420', f:'#4aa6c2', a:'#e8c46a'},
];
const SM_FMTS=[{W:1080,H:1080,t:'Square'},{W:1000,H:1240,t:'Portrait'},{W:1240,H:1000,t:'Landscape'}];
const SM_SCAFFOLD=['Field','Split','Quadrant','Bands'];
const SM_MOTIF=['Disc','Fan','Rings','Wedge','Bars'];
function simultaneous(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*SM_PALS.length);
  const fmt=pick(SM_FMTS,r);
  const scaffold=pick(SM_SCAFFOLD,r);
  const motif=pick(SM_MOTIF,r);
  const key=r()<0.5?'High':'Low';
  const grainLvl=pick(['Fine','Medium','Heavy'],r);
  // ---- end trait draws ----
  const P=SM_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d');
  const S=Math.min(W,H); const dark=key==='Low';
  const tone=c=>dark?mix(c,'#fff',0.1):mix(c,'#fff',0.03);
  const deck=[P.f,P.a,mix(P.f,P.a,0.5),mix(P.g,P.a,0.5),mix(P.g,P.f,0.55),P.g].map(tone);
  const ground=dark?mix(P.g,'#000',0.34):mix(P.g,'#fff',0.08);
  const blend=dark?'screen':'multiply';
  const rndCol=()=>deck[Math.floor(r()*deck.length)];
  const gg=x.createLinearGradient(0,0,0,H);gg.addColorStop(0,mix(ground,'#fff',0.05));gg.addColorStop(1,mix(ground,'#000',0.07));x.fillStyle=gg;x.fillRect(0,0,W,H);
  // ink a path: misregistration ghost + flat + interior mottle + optional keyline
  function inked(path,col,doKey,edge){
    x.save();x.globalCompositeOperation=blend;x.globalAlpha=0.42;x.translate((r()-0.5)*S*0.016,(r()-0.5)*S*0.016);x.fillStyle=edge||rndCol();path();x.fill();x.restore();
    x.save();x.globalCompositeOperation=blend;x.globalAlpha=0.84+r()*0.12;x.fillStyle=col;path();x.fill();x.restore();
    x.save();path();x.clip();mottle(x,0,0,W,H,col,560,r,blend);x.restore();
    if(doKey){x.save();x.globalAlpha=0.8;x.lineWidth=Math.max(1.2,S*0.0035);x.strokeStyle=edge||mix(col,'#000',0.4);path();x.stroke();x.restore();}
  }
  function fillField(x0,y0,w,h,col){x.save();x.globalCompositeOperation=blend;x.globalAlpha=0.82;x.beginPath();x.rect(x0,y0,w,h);x.clip();x.fillStyle=col;x.fillRect(x0,y0,w,h);mottle(x,x0,y0,w,h,col,560,r,blend);x.restore();}
  const disc=(px,py,rad,col,k,e)=>inked(()=>{x.beginPath();x.arc(px,py,rad,0,6.29);},col,k,e);
  const bar=(px,py,w,h,ang,col,k,e)=>{const ca=Math.cos(ang),sa=Math.sin(ang);const p=[[-w/2,-h/2],[w/2,-h/2],[w/2,h/2],[-w/2,h/2]].map(([X,Y])=>[px+X*ca-Y*sa,py+X*sa+Y*ca]);inked(()=>{x.beginPath();x.moveTo(p[0][0],p[0][1]);for(let i=1;i<4;i++)x.lineTo(p[i][0],p[i][1]);x.closePath();},col,k,e);};
  const wedge=(px,py,rad,a0,a1,col,k,e)=>inked(()=>{x.beginPath();x.moveTo(px,py);x.arc(px,py,rad,a0,a1);x.closePath();},col,k,e);
  function rings(px,py,rad,nb,a0,a1){let rr=rad;const step=rad/nb;for(let i=0;i<nb;i++){const r1=rr,r0=Math.max(0,rr-step);inked(()=>{x.beginPath();x.arc(px,py,r1,a0,a1);x.arc(px,py,r0,a1,a0,true);x.closePath();},deck[i%deck.length], i%2===0);rr-=step;}}
  const half=(ang,off,col)=>bar(W/2+Math.cos(ang+Math.PI/2)*off,H/2+Math.sin(ang+Math.PI/2)*off,S*3.2,S*3.2,ang,col,false);

  // ── scaffold (structural variety) ──
  if(scaffold==='Split'){const n=rint(r,1,2);for(let i=0;i<n;i++)half((r()-0.5)*Math.PI,(0.1+r()*0.4)*S*(r()<0.5?1:-1),rndCol());}
  else if(scaffold==='Quadrant'){const vx=W*(0.32+r()*0.36),hy=H*(0.32+r()*0.36);const cells=[[0,0,vx,hy],[vx,0,W-vx,hy],[0,hy,vx,H-hy],[vx,hy,W-vx,H-hy]];cells.forEach((c,i)=>{if(r()<0.8)fillField(c[0],c[1],c[2],c[3],deck[(i+1)%deck.length]);});}
  else if(scaffold==='Bands'){const n=rint(r,3,5),vert=r()<0.4;const splits=[];let acc=0;for(let i=0;i<n;i++){const w=0.5+r();splits.push(w);acc+=w;}let p=0;for(let i=0;i<n;i++){const len=(vert?W:H)*splits[i]/acc;if(vert)fillField(p,0,len+1,H,deck[i%deck.length]);else fillField(0,p,W,len+1,deck[i%deck.length]);p+=len;}}

  // ── hero motif on a phi anchor ──
  const hx=W*(r()<0.5?INVPHI:1-INVPHI)+(r()-0.5)*W*0.1, hy=H*(r()<0.5?INVPHI:1-INVPHI)+(r()-0.5)*H*0.1;
  const HR=S*(0.24+r()*0.12);
  if(motif==='Disc'){disc(hx,hy,HR,rndCol(),true,rndCol());}
  else if(motif==='Fan'){const a0=r()*6.283;rings(hx,hy,HR*1.4,rint(r,4,7),a0,a0+Math.PI*(0.6+r()*0.9));}
  else if(motif==='Rings'){rings(hx,hy,HR*1.25,rint(r,5,8),0,6.283);}
  else if(motif==='Wedge'){const a0=r()*6.283;wedge(hx,hy,HR*1.6,a0,a0+Math.PI*(0.4+r()*0.5),rndCol(),true,rndCol());}
  else {const n=rint(r,3,6),ang=(r()<0.5?0:Math.PI/2)+(r()-0.5)*0.5;for(let i=0;i<n;i++)bar(hx+(i-(n-1)/2)*S*0.07*Math.cos(ang+Math.PI/2),hy+(i-(n-1)/2)*S*0.07*Math.sin(ang+Math.PI/2),S*(0.5+r()*0.3),S*(0.035+r()*0.04),ang,deck[i%deck.length], r()<0.3);}

  // ── supporting forms ──
  const nS=rint(r,2,3);
  for(let k=0;k<nS;k++){const sx=W*(0.14+r()*0.72),sy=H*(0.14+r()*0.72),sr=S*(0.06+r()*0.13);const t=pick(['disc','wedge','bar','rings'],r);
    if(t==='disc')disc(sx,sy,sr,rndCol(),r()<0.5,rndCol());
    else if(t==='wedge'){const a0=r()*6.283;wedge(sx,sy,sr*1.4,a0,a0+Math.PI*(0.4+r()*0.6),rndCol(),r()<0.4);}
    else if(t==='bar')bar(sx,sy,sr*2.4,sr*0.4,(r()-0.5)*Math.PI,rndCol(),r()<0.3);
    else rings(sx,sy,sr*1.1,rint(r,3,5),0,6.283);}

  // ── small accents (rhythm) ──
  const nd=rint(r,3,7);for(let i=0;i<nd;i++){x.save();x.globalCompositeOperation=blend;x.globalAlpha=0.9;x.fillStyle=P.a;x.beginPath();x.arc(W*(0.1+r()*0.8),H*(0.1+r()*0.8),S*(0.01+r()*0.018),0,6.29);x.fill();x.restore();}
  if(r()<0.6){x.save();x.globalAlpha=0.8;x.strokeStyle=dark?mix(P.a,'#fff',0.2):mix(P.g,'#000',0.2);x.lineWidth=Math.max(1.5,S*0.004);const yy=H*INVPHI;x.beginPath();x.moveTo(0,yy);x.lineTo(W,yy+(r()-0.5)*H*0.1);x.stroke();x.restore();}

  // ── print texture ──
  function screen(col,ang,cell,a){x.save();x.globalCompositeOperation='multiply';x.globalAlpha=a;x.translate(W/2,H/2);x.rotate(ang);x.fillStyle=col;const R=Math.hypot(W,H);for(let yy=-R;yy<R;yy+=cell)for(let xx=-R;xx<R;xx+=cell){x.beginPath();x.arc(xx,yy,cell*0.2,0,6.29);x.fill();}x.restore();}
  const cell=grainLvl==='Heavy'?7:grainLvl==='Medium'?10:14;
  screen(P.f,Math.PI/4,cell,0.05);screen(P.a,Math.PI*5/12,cell*1.15,0.045);
  const amt=grainLvl==='Heavy'?440:grainLvl==='Medium'?800:1500;
  x.save();for(let i=0;i<W*H/amt;i++){x.fillStyle=rgba(r()<0.5?P.f:P.a,0.05+r()*0.06);x.fillRect(r()*W,r()*H,1.6,1.6);}x.restore();
  paperTooth(x,W,H,r);
  grain(x,W,H,1400,r);
  vignette(x,W,H,dark?0.32:0.16);
}
function castSimultaneous(seed){const r=rng(seed);const palI=Math.floor(r()*SM_PALS.length);const fmt=pick(SM_FMTS,r);const scaffold=pick(SM_SCAFFOLD,r);const motif=pick(SM_MOTIF,r);const key=r()<0.5?'High':'Low';const grainLvl=pick(['Fine','Medium','Heavy'],r);return {palette:SM_PALS[palI].name, harmony:SM_PALS[palI].harmony, scaffold, motif, key};}

/* ========================================================================
 * 4. STRATA — pressed-pigment sediment fields. In-band optical mottle (now
 *    on light bands + calm field too), soft-bleed & hard-fault seams, tinted
 *    clustered grit, phi-placed dominant band + negative-space crop.
 *    5 modes: Bedded / Folded / Faulted / Lens / Unconformity.
 * ====================================================================== */
const ST_PALS=[
  {name:'Oxide Bed', stops:['#2a1a14','#7a3b22','#c2683a','#e6a558','#ead7b4']},
  {name:'Tidewater', stops:['#0f2230','#1f5f6b','#5a9a96','#a8c2b2','#e4dcc2']},
  {name:'Ironstone', stops:['#1a1416','#5a2230','#9a3b3a','#caa24a','#e6dcc0']},
  {name:'Glacier',   stops:['#10202e','#2f5f7a','#6fa8c4','#cfe2e6','#f0ece0']},
  {name:'Verdigris', stops:['#0e1a16','#1f4a3a','#36805f','#8fb888','#e6e2c8']},
  {name:'Ember Ash', stops:['#14110f','#3a2a26','#8a3a22','#e0622a','#f2c266']},
  {name:'Amethyst',  stops:['#160f22','#3a2a5a','#6a4a8a','#a98fc4','#e6dcd0']},
  {name:'Saltflat',  stops:['#1c1a17','#5c5448','#a89878','#e0cfa0','#f4eeda']},
  {name:'Indigo Vein', stops:['#0a0f22','#1f2f6b','#3f5fb0','#8aa0d4','#e0dcc4']},
  {name:'Burnt Sienna', stops:['#221310','#572617','#a8542e','#d99a5c','#ead7b4']},
  {name:'Malachite',    stops:['#0c1813','#1c3f34','#3a7a5e','#7ba886','#dcd8bc']},
  {name:'Payne Slate',  stops:['#12161c','#33414d','#5e7280','#9aa6ac','#d6d2c4']},
  {name:'Tyrian',       stops:['#1a0e18','#4a1d36','#8a3a52','#c77a72','#e8d2bc']},
];
const ST_FMTS=[{W:1000,H:1300,t:'Portrait'},{W:1120,H:1120,t:'Square'},{W:1300,H:1000,t:'Landscape'}];
const ST_MODES=['Bedded','Folded','Faulted','Lens','Unconformity'];
function strata(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*ST_PALS.length);
  const fmt=pick(ST_FMTS,r);
  const mode=pick(ST_MODES,r);
  const bands=rint(r,5,9);
  const key=r()<0.5?'High':'Low';
  // ---- end trait draws ----
  const P=ST_PALS[palI], W=fmt.W,H=fmt.H; cv.width=W;cv.height=H; const x=cv.getContext('2d');
  function ramp(t){t=clamp(t,0,1);const n=P.stops.length-1,ti=t*n,i=Math.min(n-1,Math.floor(ti));return mix(P.stops[i],P.stops[i+1],ti-i);}
  const flip=key==='High';
  const seedShift=r()*1000, tilt=(r()-0.5)*0.2;
  const crop = r()<0.46;
  const top0 = crop? H*(r()<0.5?0:0.32) : 0;
  const stackH = crop? H*(0.5+r()*0.18) : H;
  if(crop){const calm=ramp(flip?0.06:0.94);const cg=x.createLinearGradient(0,0,0,H);cg.addColorStop(0,mix(calm,'#000',0.05));cg.addColorStop(1,calm);x.fillStyle=cg;x.fillRect(0,0,W,H);
    // give the calm field its own faint mineral texture so it never reads as flat digital
    mottle(x,0,0,W,H,calm,700,r,'overlay');x.save();x.globalAlpha=0.04;x.strokeStyle=lum(calm)<0.5?'#fff':'#000';for(let yy=0;yy<H;yy+=4){x.beginPath();x.moveTo(0,yy+(r()-0.5));x.lineTo(W,yy);x.lineWidth=0.6;x.stroke();}x.restore();}
  const ws=[];for(let i=0;i<bands;i++)ws.push(Math.pow(r(),1.6)*0.7+0.3);
  const domIdx=clamp(Math.round((r()<0.5?0.382:0.618)*(bands-1)),1,bands-2);
  ws[domIdx]*=(1.8+r()*2.2);const acc=ws.reduce((a,b)=>a+b,0);
  const edges=[top0];let y=top0;for(let i=0;i<bands;i++){y+=stackH*ws[i]/acc;edges.push(y);}
  function disp(xx,baseY){
    let d=0;
    if(mode==='Bedded') d=Math.sin(xx*0.004+seedShift)*H*0.006;
    else if(mode==='Folded') d=(Math.sin(xx*0.006+seedShift)+0.45*Math.sin(xx*0.015+seedShift*2))*H*0.05;
    else if(mode==='Faulted') d=Math.sin(xx*0.004+seedShift)*H*0.01 + (xx>W*0.52? H*0.06:0);
    else d=Math.sin(xx*0.004+seedShift)*H*0.008;
    return baseY + d + (xx-W/2)*tilt;
  }
  if(!crop){x.fillStyle=ramp(flip?0:1);x.fillRect(0,0,W,H);}
  for(let i=0;i<bands;i++){
    const tA=i/(bands-1), tB=(i+1)/(bands-1);
    const cTop=ramp(flip?tA:1-tA), cBot=ramp(flip?tB:1-tB);
    const top=edges[i], bot=edges[i+1];
    const midHue=mix(cTop,cBot,0.5);
    const light=lum(midHue)>0.6;
    x.save();
    x.beginPath();
    for(let xx=0;xx<=W;xx+=3){const yy=disp(xx,top);xx===0?x.moveTo(xx,yy):x.lineTo(xx,yy);}
    for(let xx=W;xx>=0;xx-=3){const yy=disp(xx,bot);x.lineTo(xx,yy);}
    x.closePath();x.clip();
    const g=x.createLinearGradient(0,top-H*0.04,0,bot+H*0.04);
    g.addColorStop(0,mix(cTop,cBot,0.12));g.addColorStop(0.45,mix(midHue,'#000',0.05));g.addColorStop(0.55,mix(midHue,'#000',0.05));g.addColorStop(1,mix(cBot,cTop,0.12));
    x.fillStyle=g;x.fillRect(0,top-H*0.1,W,(bot-top)+H*0.2);
    // in-band mottle, stronger on light bands (which otherwise read as smooth gradient)
    mottle(x,0,top-2,W,(bot-top)+4, midHue, light?420:760, r, 'overlay');
    x.restore();
  }
  if(mode==='Lens'){
    const lx=W*INVPHI+(r()-0.5)*W*0.1, ly=H*(1-INVPHI)+(r()-0.5)*H*0.1, lw=W*(0.26+r()*0.14), lh=lw*(0.6+r()*0.3);
    x.save();x.globalAlpha=0.82;x.beginPath();x.ellipse(lx,ly,lw,lh,(r()-0.5)*0.4,0,6.29);x.clip();
    const lg=x.createLinearGradient(lx,ly-lh,lx,ly+lh);lg.addColorStop(0,ramp(0.85));lg.addColorStop(1,ramp(0.15));x.fillStyle=lg;x.fillRect(lx-lw,ly-lh,lw*2,lh*2);
    mottle(x,lx-lw,ly-lh,lw*2,lh*2,ramp(0.5),500,r,'overlay');
    x.restore();
    x.save();x.globalAlpha=0.4;x.strokeStyle=mix(ramp(0.5),'#fff',0.4);x.lineWidth=1.5;x.beginPath();x.ellipse(lx,ly,lw,lh,(r()-0.5)*0.4,0,6.29);x.stroke();x.restore();
  }
  const nSeams=rint(r,2,4);
  for(let s=0;s<nSeams;s++){const bi=rint(r,1,bands-1);const baseCol=ramp(bi/(bands-1));
    if(r()<0.5){
      x.save();x.globalAlpha=0.5+r()*0.4;x.strokeStyle=mix(baseCol,'#000',0.5);x.lineWidth=0.8+r()*2;x.beginPath();for(let xx=0;xx<=W;xx+=4){const yy=disp(xx,edges[bi])+(r()-0.5)*1.5;xx===0?x.moveTo(xx,yy):x.lineTo(xx,yy);}x.stroke();
      x.strokeStyle=mix(baseCol,'#fff',0.4);x.lineWidth=0.8;x.beginPath();for(let xx=0;xx<=W;xx+=4){const yy=disp(xx,edges[bi])-1.5;xx===0?x.moveTo(xx,yy):x.lineTo(xx,yy);}x.stroke();x.restore();
    } else {
      x.save();x.globalAlpha=0.4;x.strokeStyle=mix(baseCol,'#000',0.3);x.lineWidth=8+r()*10;x.filter='blur(8px)';x.beginPath();for(let xx=0;xx<=W;xx+=6){const yy=disp(xx,edges[bi]);xx===0?x.moveTo(xx,yy):x.lineTo(xx,yy);}x.stroke();x.restore();x.filter='none';
    }}
  x.save();const clusters=rint(r,18,30);for(let c=0;c<clusters;c++){const ccx=r()*W,ccy=top0+r()*stackH;const t=clamp((ccy-top0)/stackH,0,1);const base=ramp(flip?t:1-t);const n=rint(r,30,90);for(let i=0;i<n;i++){const px=ccx+randn(r)*W*0.04,py=ccy+randn(r)*H*0.03;const sp=r()<0.5?mix(base,'#000',0.36):mix(base,'#fff',0.34);x.fillStyle=rgba(sp,0.06+r()*0.12);x.fillRect(px,py,1.5,1.5);}}x.restore();
  x.save();x.globalAlpha=0.045;x.strokeStyle=lum(P.stops[0])<0.4?'#fff':'#000';for(let yy=0;yy<H;yy+=3){x.lineWidth=0.6;x.beginPath();x.moveTo(0,yy+(r()-0.5));x.lineTo(W,yy);x.stroke();}x.restore();
  grain(x,W,H,1000,r);
  vignette(x,W,H,key==='Low'?0.32:0.18);
}
function castStrata(seed){const r=rng(seed);const palI=Math.floor(r()*ST_PALS.length);const fmt=pick(ST_FMTS,r);const mode=pick(ST_MODES,r);const bands=rint(r,5,9);const key=r()<0.5?'High':'Low';return {palette:ST_PALS[palI].name, format:fmt.t, structure:mode, strata:String(bands), key};}

export { setback, castSetback, simultaneous, castSimultaneous, strata, castStrata };
