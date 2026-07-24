// @ts-nocheck
/*
 * Ode to Rudxane — one AI-artist project, split out of the retired core/index
 * blob (2026-07-03). Engine code is FROZEN ART CODE, moved verbatim —
 * the cast* fn replays the engine's leading rng draws exactly; do not
 * reorder draws. Shared deterministic primitives live in ./_kit.
 */
import { rng, pick, blit, cap } from './_kit';
import type { TraitsFn, TraitSchema } from '../../../project/types';

const RDX_PRON=[
  ['/ˈruːd.zeɪn/','ROOD-zayn'],['/rʊdˈʃɑːn/','rudd-SHAHN'],['/ˈruː.deɪn/','ROO-dayn'],
  ['/ˈrʌd.zən/','RUDD-zuhn'],['/rʊdˈzɑːn/','rud-ZAHN'],['/ruːˈdɛkseɪn/','roo-DEX-ayn'],
  ['/ˈrʌd.ʒeɪn/','RUDD-jayn'],['/ruːˈzɑːn/','roo-ZAHN'],['/rʊˈdʒɑːneɪ/','ruh-JAH-nay'],
  ['/ˈruːd.xeɪn/','ROOD-khayn'],['/ruːˈxɑːneɪ/','roo-KHAH-nay'],['/ˈrʌd.ksæn/','RUD-ksan'],
  ['/rəˈdzaɪn/','ruh-DZYNE'],['/ˈruː.dʒən/','ROO-juhn'],['/ruːdˈzɑːnə/','rood-ZAH-nuh'],
  ['/ˌruː.dɛkˈseɪn/','ROO-dek-SAYN'],
];
const RDX_PALS=[
  {name:'Ivory & Ink', bg:'#f4efe4', ink:'#1c1a17', acc:'#8c7a5b', sub:'#6e665a'},
  {name:'Navy & Cream', bg:'#f3eee2', ink:'#1b2a41', acc:'#b08d57', sub:'#4a5a72'},
  {name:'Oxblood & Bone', bg:'#ede7da', ink:'#2a1416', acc:'#6e1e22', sub:'#a89b86'},
  {name:'Sage & Charcoal', bg:'#e7e6dc', ink:'#2b2b28', acc:'#7e8b6e', sub:'#54574e'},
  {name:'Slate & Ecru', bg:'#eae6dc', ink:'#33373b', acc:'#8a8f92', sub:'#6b7176'},
  {name:'Gold Leaf', bg:'#14110e', ink:'#ede3cf', acc:'#c9a227', sub:'#8a6e2f', dark:true},
  {name:'Graphite', bg:'#e6e4df', ink:'#2d2d2d', acc:'#5c5c5c', sub:'#9a9893'},
  {name:'Aubergine', bg:'#ede6d6', ink:'#3b2a3a', acc:'#b5894e', sub:'#6e5a66'},
];
const RDX_FMTS=[{W:980,H:1380,t:'Folio'},{W:880,H:1320,t:'Tall'},{W:1100,H:1100,t:'Square'},{W:1320,H:980,t:'Broadside'}];
const RDX_LAYOUTS=['specimen','plate','ledger','wave'];
const RDX_GLOSS=['n. the first to arrive','prop. n. member №1','n. one who logs on first','n. origin; a beginning','n. the founding voice'];
const RDX_FOOT=['pronunciation contested','one of several accepted readings','usage disputed','var.','no consensus recorded'];
function rudxane(cv,seed){
  const r=rng(seed);
  const palI=Math.floor(r()*RDX_PALS.length);
  const fmt=pick(RDX_FMTS,r);
  const layout=pick(RDX_LAYOUTS,r);
  const pronI=Math.floor(r()*RDX_PRON.length);
  const foil=r()<0.16;
  // ---- end trait draws ----
  const P=RDX_PALS[palI], W=fmt.W, H=fmt.H; cv.width=W; cv.height=H;
  const x=cv.getContext('2d');
  const SER='Georgia,"Times New Roman",serif', GRO='Helvetica,Arial,"Liberation Sans","DejaVu Sans",sans-serif';
  const dark=P.dark;
  x.fillStyle=P.bg; x.fillRect(0,0,W,H);
  const ipa=RDX_PRON[pronI][0], resp=RDX_PRON[pronI][1], gloss=pick(RDX_GLOSS,r), foot=pick(RDX_FOOT,r);
  const goldFill= foil? P.acc : P.ink;
  function deboss(t,fx,fy,font,fill,align){x.font=font;x.textAlign=align||'left';x.textBaseline='alphabetic';
    x.fillStyle= dark?'rgba(0,0,0,0.5)':'rgba(255,255,255,0.6)';x.fillText(t,fx+1,fy+1.4);
    x.fillStyle= dark?'rgba(255,255,255,0.16)':'rgba(0,0,0,0.32)';x.fillText(t,fx-1,fy-1.2);
    x.fillStyle=fill;x.fillText(t,fx,fy);}
  function caps(t,fx,fy,px,track,fill){x.font=px+'px '+GRO;x.textBaseline='alphabetic';x.fillStyle=fill;let cx=fx;for(const ch of t){x.fillText(ch,cx,fy);cx+=x.measureText(ch).width+track;}return cx;}
  function rule(y,x1,x2,al){x.strokeStyle= dark?'rgba(255,255,255,'+(al||0.2)+')':'rgba(0,0,0,'+(al||0.16)+')';x.lineWidth=1;x.beginPath();x.moveTo(x1,Math.round(y)+0.5);x.lineTo(x2,Math.round(y)+0.5);x.stroke();}
  // synth a faint speech waveform from the respelling syllables
  function waveform(cxL,cxR,cy,amp){
    const sylls=resp.split('-'); const N=480; const sig=new Float32Array(N);
    let idx=0; for(let s=0;s<sylls.length;s++){const w=sylls[s]; const slot=N/sylls.length; const stressed=w===w.toUpperCase();
      for(let k=0;k<slot;k++){const u=k/slot; const env=Math.pow(Math.sin(Math.PI*u),0.7)*(stressed?1:0.6);
        let v=0; for(let h=1;h<=3;h++) v+=Math.sin((idx*0.06*h)+s)*(1/h); // voiced formants
        if(k<slot*0.12) v+=( (k*97%7)/7-0.5)*2.2; // consonant burst at onset
        sig[idx]= v*env; idx++; if(idx>=N)break;}
      if(idx>=N)break;}
    let mx=0.0001; for(let i=0;i<N;i++) mx=Math.max(mx,Math.abs(sig[i]));
    x.strokeStyle=P.sub; x.lineWidth=1; x.beginPath();
    for(let i=0;i<N;i++){const px=cxL+(cxR-cxL)*i/(N-1), py=cy - sig[i]/mx*amp; if(i===0)x.moveTo(px,py); else x.lineTo(px,py);} x.stroke();
    // mirror, fainter
    x.strokeStyle= dark?'rgba(255,255,255,0.18)':'rgba(0,0,0,0.14)'; x.beginPath();
    for(let i=0;i<N;i++){const px=cxL+(cxR-cxL)*i/(N-1), py=cy + sig[i]/mx*amp*0.7; if(i===0)x.moveTo(px,py); else x.lineTo(px,py);} x.stroke();
    rule(cy,cxL,cxR,0.1);
  }
  const mL=Math.round(W*0.13), mR=Math.round(W*0.13), mT=Math.round(H*0.12);
  if(layout==='plate'){
    // gallery plate — headword huge, one pronunciation, vast quiet
    let fs=Math.min(W*0.2, (W-mL-mR)/x.measureText? W*0.2:W*0.2);
    x.font='bold '+Math.round(W*0.16)+'px '+SER; while(x.measureText('Rudxane').width>W-mL-mR && fs>20){fs=Math.round(W*0.16*0.95);x.font='bold '+fs+'px '+SER;break;}
    deboss('Rudxane',W/2,H*0.46,'bold '+Math.round(W*0.155)+'px '+SER,goldFill,'center');
    x.fillStyle=P.sub; x.font='italic '+Math.round(W*0.03)+'px '+SER; x.textAlign='center'; x.fillText(ipa,W/2,H*0.46+W*0.07);
    caps(resp,W/2-(resp.length*0.5*(W*0.013)),H*0.46+W*0.12,Math.round(W*0.018),3,P.acc);
    rule(H*0.46+W*0.155,W*0.36,W*0.64,0.18);
    x.fillStyle=P.sub;x.font='italic '+Math.round(W*0.018)+'px '+SER;x.textAlign='center';x.fillText('— '+foot+' —',W/2,H*0.86);
  } else if(layout==='ledger'){
    // two-column: narrow labels left, content right
    const colX=mL+ (W-mL-mR)*0.34;
    deboss('Rudxane',mL,mT+Math.round(W*0.085),'bold '+Math.round(W*0.10)+'px '+SER,goldFill,'left');
    rule(mT+Math.round(W*0.11),mL,W-mR,0.2);
    let y=mT+Math.round(W*0.2);
    const rows=[['PRONUNCIATION',ipa],['RESPELLING',resp],['PART OF SPEECH',gloss],['ORIGIN','contested · '+ (1+Math.floor(r()*99))],['READING','no. '+(pronI+1)+' of '+RDX_PRON.length]];
    for(const [lab,val] of rows){ caps(lab,mL,y,Math.round(W*0.014),2.2,P.sub); x.fillStyle=P.ink; x.font=(lab==='PART OF SPEECH'?'italic ':'')+Math.round(W*0.028)+'px '+ (lab==='PRONUNCIATION'?GRO:SER); x.textAlign='left'; x.fillText(val,colX,y+2); rule(y+Math.round(W*0.03),mL,W-mR,0.1); y+=Math.round(W*0.075);}
    waveform(mL,W-mR,y+Math.round(W*0.05),W*0.04);
    x.fillStyle=P.sub;x.font='italic '+Math.round(W*0.018)+'px '+SER;x.textAlign='left';x.fillText(foot,mL,H-mT*0.5);
  } else if(layout==='wave'){
    deboss('Rudxane',W/2,mT+Math.round(W*0.075),'bold '+Math.round(W*0.085)+'px '+SER,goldFill,'center');
    x.fillStyle=P.sub;x.font='italic '+Math.round(W*0.026)+'px '+SER;x.textAlign='center';x.fillText(ipa,W/2,mT+Math.round(W*0.12));
    waveform(mL,W-mR,H*0.52,H*0.13);
    caps(resp, W/2-(resp.length*0.5*(W*0.013)), H*0.74, Math.round(W*0.018),3,P.acc);
    x.fillStyle=P.sub;x.font='italic '+Math.round(W*0.018)+'px '+SER;x.textAlign='center';x.fillText('— '+foot+' —',W/2,H*0.86);
  } else { // specimen — full dictionary entry
    deboss('Rud·xane',mL,mT+Math.round(W*0.10),'bold '+Math.round(W*0.115)+'px '+SER,goldFill,'left');
    x.fillStyle=P.sub; x.font='italic '+Math.round(W*0.03)+'px '+SER; x.textAlign='left'; x.fillText(gloss,mL,mT+Math.round(W*0.15));
    rule(mT+Math.round(W*0.18),mL,W-mR,0.22);
    let y=mT+Math.round(W*0.26);
    caps('PRONUNCIATION',mL,y,Math.round(W*0.015),2.4,P.sub); y+=Math.round(W*0.045);
    x.fillStyle=P.ink; x.font=Math.round(W*0.05)+'px '+GRO; x.textAlign='left'; x.fillText(ipa,mL,y); y+=Math.round(W*0.06);
    x.fillStyle=P.acc; const rx=caps(resp,mL,y,Math.round(W*0.026),3,P.acc); y+=Math.round(W*0.06);
    rule(y,mL,W-mR,0.12); y+=Math.round(W*0.05);
    waveform(mL,W-mR,y+Math.round(W*0.04),W*0.045); y+=Math.round(W*0.12);
    rule(y,mL,W-mR,0.12); y+=Math.round(W*0.04);
    x.fillStyle=P.sub; x.font='italic '+Math.round(W*0.022)+'px '+SER; x.fillText(foot+'.',mL,y);
    x.textAlign='right'; x.fillStyle=P.sub; x.font=Math.round(W*0.018)+'px '+GRO; x.fillText('var. '+(pronI+1)+'/'+RDX_PRON.length,W-mR,H-mT*0.5);
  }
  // ---- finish: foil sheen (rare), grain, vignette, plate-mark ----
  if(foil){x.save();x.globalCompositeOperation='lighter';x.globalAlpha=0.14;const fg=x.createLinearGradient(0,0,W,H);fg.addColorStop(0,'transparent');fg.addColorStop(0.5,P.acc);fg.addColorStop(1,'transparent');x.fillStyle=fg;x.fillRect(0,0,W,H);x.restore();}
  x.save();x.globalAlpha=0.035;x.globalCompositeOperation= dark?'screen':'multiply';for(let i=0;i<W*H/1100;i++){x.fillStyle= dark?'#fff':'#000';x.fillRect(r()*W,r()*H,1,1);}x.restore();
  const vg=x.createRadialGradient(W/2,H/2,Math.min(W,H)*0.4,W/2,H/2,Math.max(W,H)*0.75);vg.addColorStop(0,'transparent');vg.addColorStop(1, dark?'rgba(0,0,0,0.45)':'rgba(40,30,20,0.12)');x.fillStyle=vg;x.fillRect(0,0,W,H);
  x.strokeStyle= dark?'rgba(255,255,255,0.12)':'rgba(0,0,0,0.12)';x.lineWidth=1;x.strokeRect(W*0.06,H*0.06,W*0.88,H*0.88);
}
function castRudxane(seed){
  const r=rng(seed);
  const palI=Math.floor(r()*RDX_PALS.length);
  const fmt=pick(RDX_FMTS,r);
  const layout=pick(RDX_LAYOUTS,r);
  const pronI=Math.floor(r()*RDX_PRON.length);
  return {palette:RDX_PALS[palI].name, format:fmt.t, layout, reading:RDX_PRON[pronI][1]};
}

/* MATERIA — "Materia": realistic natural-material slabs (polished marble, raw
   granite/stone, finished wood) built from value-noise fBm + domain warp.
   Layered low-alpha washes for depth, warped veins / mineral speckle / growth
   rings, then a committed lighting pass (gloss specular or matte tooth). Real,
   not cartoony. Trait draws lead; castMateria mirrors. */

/* Ode to Rudxane */
export const rudxaneTraits: TraitsFn = (id) => { const c = castRudxane(id) as any; return { Palette: c.palette, Format: c.format, Layout: cap(c.layout), Reading: c.reading }; };
export const rudxaneSchema: TraitSchema = { traits: [
  { name: 'Palette', values: ['Ivory & Ink','Navy & Cream','Oxblood & Bone','Sage & Charcoal','Slate & Ecru','Gold Leaf','Graphite','Aubergine'],
    subtraits: [
      { name: 'Monochrome', values: ['Ivory & Ink', 'Slate & Ecru', 'Graphite'] },
      { name: 'Coloured', values: ['Navy & Cream', 'Oxblood & Bone', 'Sage & Charcoal', 'Gold Leaf', 'Aubergine'] },
    ] },
  { name: 'Format', values: ['Folio','Tall','Square','Broadside'],
    subtraits: [
      { name: 'Upright', values: ['Folio', 'Tall', 'Square'] },
      { name: 'Broad', values: ['Broadside'] },
    ] },
  { name: 'Layout', values: ['Specimen','Plate','Ledger','Wave'] },
] };
export const renderRudxane = blit(rudxane, rudxaneTraits);
export const RUDXANE_ASPECTS = [0.71, 0.67, 1, 1.35] as const;
