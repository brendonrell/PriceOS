const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_EXEC });
  const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:3210/prisms', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);

  // enumerate tabs
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#projectTabsRow .pill, .profile-tabs-row .pill')].map(e=>({t:e.textContent.trim(), active:e.className.includes('active')})));
  console.log('TABS', JSON.stringify(tabs));

  // click the Artworks tab (first pill that says Artworks)
  const clicked = await p.evaluate(() => {
    const el = [...document.querySelectorAll('#projectTabsRow .pill, .profile-tabs-row .pill')].find(e=>/artwork/i.test(e.textContent));
    if (el) { el.click(); return el.textContent.trim(); } return null;
  });
  console.log('CLICKED', clicked);
  await p.waitForTimeout(800);
  console.log('sortbar display:', await p.evaluate(()=>getComputedStyle(document.querySelector('.sort-bar')).display));

  const snap = () => p.evaluate(() => ({
    glyph: document.querySelector('.sort-group-mod')?.textContent,
    title: (document.querySelector('.sort-group-mod')?.getAttribute('title')||'').replace(' — tap to cycle',''),
    headers: [...document.querySelectorAll('.gallery-group-header .ggh-label')].map(e=>e.textContent),
    galleryKids: document.getElementById('gallery')?.childElementCount,
  }));
  console.log('BEFORE', JSON.stringify(await snap()));

  for (let i=1;i<=5;i++){
    const t0 = Date.now();
    await p.evaluate(() => document.querySelector('.sort-group-mod').click());
    // poll until headers reflect a grouped state or timeout
    await p.waitForTimeout(500);
    console.log(`TAP${i} (+${Date.now()-t0}ms)`, JSON.stringify(await snap()));
  }
  await p.screenshot({ path:'/home/user/PriceOS/.tmp_grp/artworks_grouped.png' });
  await b.close();
})();
