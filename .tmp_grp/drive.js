const { chromium } = require('playwright-core');
const DIR = '/home/user/PriceOS/.tmp_grp';
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_EXEC });
  const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  const errs = [];
  p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  p.on('pageerror', e => errs.push('PAGEERR: '+e.message));
  await p.goto('http://localhost:3210/prisms', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  const snap = async (tag) => p.evaluate(() => {
    const cards = document.querySelectorAll('#gallery .meta, #gallery [class*="artwork"], #gallery canvas, #gallery img').length;
    const heads = [...document.querySelectorAll('.gallery-group-header .ggh-label')].map(e=>e.textContent);
    const mod = document.querySelector('.sort-group-mod');
    const galleryChildren = document.getElementById('gallery')?.childElementCount ?? -1;
    return { galleryChildren, heads, modGlyph: mod ? mod.textContent : '(none)', modTitle: mod ? mod.getAttribute('title') : null };
  });

  console.log('INIT  ', JSON.stringify(await snap()));
  const mod = await p.$('.sort-group-mod');
  if (!mod) { console.log('NO GROUP MOD FOUND'); console.log('errs', errs.slice(0,5)); await b.close(); return; }

  for (let i=1;i<=6;i++){
    await p.click('.sort-group-mod');
    await p.waitForTimeout(500);
    console.log(`TAP${i} `, JSON.stringify(await snap()));
  }
  // rapid taps
  for (let i=0;i<5;i++){ await p.click('.sort-group-mod'); await p.waitForTimeout(60); }
  await p.waitForTimeout(1200);
  console.log('RAPID ', JSON.stringify(await snap()));
  console.log('ERRS  ', JSON.stringify(errs.slice(0,8)));
  await b.close();
})();
