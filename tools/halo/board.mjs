/* Halo tournament — 12-contestant draft board (one hero frame per contestant). */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const PW = process.env.PW_EXEC;
const kit = readFileSync(resolve('tools/halo/kit.js'), 'utf8');

const FIELD = [
  { id:'A1', dir:'APHELION', engine:'h_aphelion_v2.js', pal:'Sodium Sea',   seed:4 },
  { id:'A2', dir:'APHELION', engine:'h_aphelion_v2.js', pal:'Oxblood',      seed:5 },
  { id:'A3', dir:'APHELION', engine:'h_aphelion_v2.js', pal:'Rose Peach',   seed:9 },
  { id:'B1', dir:'MIRADOR',  engine:'h_mirador_v2.js',  pal:'Acid Flat',    seed:3 },
  { id:'B2', dir:'MIRADOR',  engine:'h_mirador_v2.js',  pal:'Rust Mesa',    seed:6 },
  { id:'B3', dir:'MIRADOR',  engine:'h_mirador_v2.js',  pal:'Mauve Dune',   seed:8 },
  { id:'C1', dir:'VESPERS',  engine:'h_vespers_v2.js',  pal:'Ultramarine',  seed:1 },
  { id:'C2', dir:'VESPERS',  engine:'h_vespers_v2.js',  pal:'Emerald Still',seed:6 },
  { id:'C3', dir:'VESPERS',  engine:'h_vespers_v2.js',  pal:'Amethyst Deep',seed:4 },
  { id:'D1', dir:'ARMILLARY',engine:'h_armillary_v2.js',pal:'Magenta',      seed:2 },
  { id:'D2', dir:'ARMILLARY',engine:'h_armillary_v2.js',pal:'Cyan',         seed:5 },
  { id:'D3', dir:'ARMILLARY',engine:'h_armillary_v2.js',pal:'Ember',        seed:9 },
];

const TILE = parseInt(process.env.TILE||'600',10);
const browser = await chromium.launch(PW ? { executablePath: PW } : {});
mkdirSync(resolve('tools/halo/out/FIELD'), { recursive:true });

const frames = [];
for (const c of FIELD) {
  const page = await browser.newPage();
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: kit });
  await page.addScriptTag({ content: readFileSync(resolve('tools/halo', c.engine), 'utf8') });
  const f = await page.evaluate(({ pal, seed, TILE })=>{
    try {
      window.FORCE_PAL = pal;
      const cv=document.createElement('canvas'); cv.width=TILE; cv.height=TILE;
      const res=window.ENGINE.draw(cv,seed)||{};
      return { url:cv.toDataURL('image/png'), aspect:res.aspect||1 };
    } catch(e){ return { err:String(e) }; }
  }, { pal:c.pal, seed:c.seed, TILE });
  if (f.err) console.error(c.id, 'ERR', f.err);
  frames.push({ ...c, ...f });
  writeFileSync(resolve(`tools/halo/out/FIELD/${c.id}.png`), Buffer.from((f.url||'data:,').split(',')[1]||'','base64'));
  await page.close();
}

// compose master board on a fresh page
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const board = await page.evaluate(async ({ frames, TILE })=>{
  const load=(u)=>new Promise(r=>{const im=new Image();im.onload=()=>r(im);im.onerror=()=>r(null);im.src=u;});
  const cell=TILE, label=34, pad=20, colGap=18, rowGap=18, cols=3, rows=4;
  const cv=document.createElement('canvas');
  cv.width = pad*2 + cols*cell + (cols-1)*colGap;
  cv.height = pad*2 + 48 + rows*(cell+label) + (rows-1)*rowGap;
  const x=cv.getContext('2d'); x.fillStyle='#08080c'; x.fillRect(0,0,cv.width,cv.height);
  x.fillStyle='#f0f0f6'; x.font='bold 26px monospace'; x.fillText('HALO — 12-CONTESTANT FIELD   (4 directions × 3 colourways)', pad, 34);
  for (let i=0;i<frames.length;i++){
    const c=frames[i]; const col=i%cols,row=Math.floor(i/cols);
    const x0=pad+col*(cell+colGap), y0=pad+48+row*(cell+label+rowGap);
    const im=await load(c.url); if(im){ let w=cell,h=cell/(c.aspect||1); if(h>cell){h=cell;w=cell*(c.aspect||1);} x.drawImage(im, x0+(cell-w)/2, y0+(cell-h)/2, w, h); }
    x.strokeStyle='#23232c'; x.strokeRect(x0,y0,cell,cell);
    x.fillStyle='#ffd24d'; x.font='bold 18px monospace'; x.fillText(`${c.id} · ${c.dir}`, x0+4, y0+cell+22);
    x.fillStyle='#9aa0ae'; x.font='15px monospace'; x.fillText(`“${c.pal}”`, x0+cell-200, y0+cell+22);
  }
  return cv.toDataURL('image/png');
}, { frames, TILE });
writeFileSync(resolve('tools/halo/out/FIELD/_board.png'), Buffer.from(board.split(',')[1],'base64'));
console.log('OK board → tools/halo/out/FIELD/_board.png ('+frames.filter(f=>f.url).length+'/12 ok)');
await browser.close();
