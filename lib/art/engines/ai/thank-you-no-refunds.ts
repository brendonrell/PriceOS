// @ts-nocheck
/*
 * Thank You, No Refunds — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, rint, shuffle, blit } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

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
function castReceipt(seed){
  const r=rng(seed);
  const W=pick([380,560,560,920],r);
  const si=Math.floor(r()*6);
  const n=rint(r,3,22);
  return {W,si,n};
}

/* ── Thank You, No Refunds ──────────────────────────────────────────────── */
const STOCK = ['White', 'Canary', 'Pink', 'Blue', 'Mint', 'Violet Ink'];
export const refundsTraits: TraitsFn = (id) => {
  const c = castReceipt(id);
  const width = c.W === 380 ? 'Slim' : c.W === 920 ? 'Wide' : 'Standard';
  const items = c.n <= 7 ? 'Short' : c.n <= 14 ? 'Standard' : 'Long';
  return { Width: width, Stock: STOCK[c.si], Items: items };
};
export const refundsSchema: TraitSchema = {
  traits: [
    { name: 'Width', values: ['Slim', 'Standard', 'Wide'] },
    { name: 'Stock', values: STOCK,
      subtraits: [
        { name: 'Plain', values: ['White', 'Violet Ink'] },
        { name: 'Tinted', values: ['Canary', 'Pink', 'Blue', 'Mint'] },
      ] },
    { name: 'Items', values: ['Short', 'Standard', 'Long'] },
  ],
};
export const renderRefunds = blit(receipt, refundsTraits);
export const REFUNDS_ASPECTS = [0.42, 0.3, 0.6] as const;
