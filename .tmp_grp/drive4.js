const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_EXEC });
  const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:3210/prisms', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1200);
  const info = await p.evaluate(() => {
    const bars = [...document.querySelectorAll('.sort-bar')].map(el=>({display:getComputedStyle(el).display, vis:getComputedStyle(el).visibility, h:Math.round(el.getBoundingClientRect().height)}));
    const sortBtns = [...document.querySelectorAll('.sort-btn')].map(el=>({t:el.textContent.trim(), active:el.className.includes('active'), disp:getComputedStyle(el).display, vis: el.offsetParent!==null}));
    const gallery = document.getElementById('gallery');
    const gStyle = gallery ? {display:getComputedStyle(gallery).display, cls:gallery.className, kids:gallery.childElementCount} : null;
    return { body: document.body.className, bars, sortBtns, gStyle };
  });
  console.log(JSON.stringify(info, null, 1));
  await p.screenshot({ path:'/home/user/PriceOS/.tmp_grp/state.png', fullPage:true });
  await b.close();
})();
