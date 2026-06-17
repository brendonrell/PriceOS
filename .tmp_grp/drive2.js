const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.PW_EXEC });
  const p = await b.newPage({ viewport: { width: 390, height: 800 }, deviceScaleFactor: 2 });
  await p.goto('http://localhost:3210/prisms', { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);

  // Why is .sort-group-mod not visible? dump rect + computed styles of it and ancestors.
  const diag = await p.evaluate(() => {
    const el = document.querySelector('.sort-group-mod');
    if (!el) return { found:false };
    const chain = [];
    let n = el;
    for (let i=0;i<5 && n;i++){
      const cs = getComputedStyle(n);
      const r = n.getBoundingClientRect();
      chain.push({ cls:n.className, w:Math.round(r.width), h:Math.round(r.height), disp:cs.display, vis:cs.visibility, fs:cs.fontSize, overflow:cs.overflow });
      n = n.parentElement;
    }
    return { found:true, chain };
  });
  console.log('DIAG', JSON.stringify(diag, null, 1));

  // Drive the cycle by native click on the span (bypasses visibility), observe.
  const snap = () => p.evaluate(() => ({
    glyph: document.querySelector('.sort-group-mod')?.textContent,
    title: document.querySelector('.sort-group-mod')?.getAttribute('title'),
    heads: [...document.querySelectorAll('.gallery-group-header .ggh-label')].map(e=>e.textContent),
  }));
  for (let i=1;i<=5;i++){
    await p.evaluate(() => document.querySelector('.sort-group-mod').click());
    await p.waitForTimeout(450);
    console.log(`TAP${i}`, JSON.stringify(await snap()));
  }
  await b.close();
})();
