/* Build a single 4x3 montage of all 12 halo candidates (one chosen seed each),
   labelled, so the whole field can be compared at a glance. */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const PICKS = [
  ['interchange', 1], ['monsoon', 2], ['chloros', 1], ['playa', 2],
  ['cinder', 3], ['orbital', 2], ['pressroom', 1], ['tideworks', 2],
  ['concourse', 1], ['parallax', 1], ['orderbook', 1], ['topiary', 1],
];
const kit = readFileSync(resolve('tools/halo/kit.js'), 'utf8');

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: kit });

const frames = [];
for (const [slug, seed] of PICKS) {
  const engine = readFileSync(resolve(`tools/halo/gen/${slug}.js`), 'utf8');
  await page.addScriptTag({ content: engine });
  const f = await page.evaluate(({ seed }) => {
    const cv = document.createElement('canvas');
    window.ENGINE.draw(cv, seed);
    return { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
  }, { seed });
  frames.push({ slug, seed, ...f });
}

const out = await page.evaluate(async ({ frames }) => {
  const COLS = 4, ROWS = 3, cell = 440, pad = 16, lab = 30, head = 44;
  const cv = document.createElement('canvas');
  cv.width = COLS * cell + (COLS + 1) * pad;
  cv.height = head + ROWS * (cell + lab) + (ROWS + 1) * pad;
  const x = cv.getContext('2d');
  x.fillStyle = '#08080b'; x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = '#f0f0f4'; x.font = '700 24px monospace'; x.textBaseline = 'top';
  x.fillText('HALO BAKE-OFF · 12 candidates · @opus4-8', pad, 12);
  await Promise.all(frames.map((fr, i) => new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = pad + col * (cell + pad), cy = head + pad + row * (cell + lab + pad);
      x.fillStyle = '#101015'; x.fillRect(cx, cy, cell, cell);
      const ar = fr.w / fr.h; let dw = cell, dh = cell;
      if (ar > 1) dh = cell / ar; else dw = cell * ar;
      x.drawImage(im, cx + (cell - dw) / 2, cy + (cell - dh) / 2, dw, dh);
      x.fillStyle = '#cfd0d8'; x.font = '700 17px monospace';
      x.fillText(`${i + 1}. ${fr.slug.toUpperCase()}`, cx + 2, cy + cell + 6);
      res();
    };
    im.onerror = () => res();
    im.src = fr.url;
  })), { frames });
  return cv.toDataURL('image/png');
}, { frames });

writeFileSync(resolve('tools/halo/out/gen/_FIELD.png'), Buffer.from(out.split(',')[1], 'base64'));
await browser.close();
console.log('OK montage -> tools/halo/out/gen/_FIELD.png');
