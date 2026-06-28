import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
const kit = readFileSync('tools/halo/kit.js','utf8');
const engine = readFileSync('tools/halo/s11_vellum.js','utf8');
const browser = await chromium.launch({ executablePath: process.env.PW_CHROME });
const page = await browser.newPage();
page.on('console', m=>{if(m.type()==='error')console.error('ERR',m.text());});
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({content:kit});
await page.addScriptTag({content:engine});
// force every mode on Blueprint, and a couple palettes
const jobs = [
  ['Blueprint','Elevation',11],['Blueprint','Plan',12],['Blueprint','Section',13],
  ['Blueprint','Overlay',14],['Drafting','Elevation',15],['Graphite','Elevation',16],
];
const results = await page.evaluate(async (jobs)=>{
  const E=window.ENGINE; const out=[];
  for(const [pal,mode,seed] of jobs){
    window.FORCE_PAL=pal;
    // brute-force a seed that lands on desired mode by scanning
    let s=seed;
    for(let k=0;k<400;k++){ if(E.traits(seed*1000+k).Mode===mode){s=seed*1000+k;break;} }
    const cv=document.createElement('canvas'); cv.width=720;cv.height=720;
    const res=E.draw(cv,s)||{};
    out.push({label:pal+' / '+mode, url:cv.toDataURL('image/png'), aspect:res.aspect});
  }
  window.FORCE_PAL=null;
  return out;
},jobs);
// compose simple sheet
const sheet = await page.evaluate(async (results)=>{
  const cell=380,pad=14,COLS=3; const rows=Math.ceil(results.length/COLS);
  const cv=document.createElement('canvas'); cv.width=COLS*cell+(COLS+1)*pad; cv.height=rows*(cell+26)+(rows+1)*pad;
  const x=cv.getContext('2d'); x.fillStyle='#0a0a0d'; x.fillRect(0,0,cv.width,cv.height);
  const load=u=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.src=u;});
  for(let i=0;i<results.length;i++){const rr=results[i];const col=i%COLS,row=(i/COLS)|0;
    const cx=pad+col*(cell+pad),cy=pad+row*(cell+26+pad);const im=await load(rr.url);
    let w=cell,h=cell/rr.aspect; if(h>cell){h=cell;w=cell*rr.aspect;}
    x.drawImage(im,cx+(cell-w)/2,cy+(cell-h)/2,w,h);
    x.fillStyle='#9aa0ae';x.font='13px monospace';x.fillText(rr.label,cx+2,cy+cell+18);}
  return cv.toDataURL('image/png');
},results);
writeFileSync('/tmp/claude-0/-home-user-PriceOS/92baa617-8b4e-534f-820e-1e1f150b8193/scratchpad/out/S11/_force.png',Buffer.from(sheet.split(',')[1],'base64'));
console.log('done');
await browser.close();
