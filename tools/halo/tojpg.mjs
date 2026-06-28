/* Downscale + JPEG-compress PNGs so they're light to view/send.
   Usage: node tools/halo/tojpg.mjs <maxW> <out.jpg> <in1.png> [in2.png ...]
   If multiple inputs, stacks them vertically into one sheet. */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const [, , maxWArg, outPath, ...inputs] = process.argv;
const maxW = parseInt(maxWArg, 10);
const datas = inputs.map((p) => 'data:image/png;base64,' + readFileSync(resolve(p)).toString('base64'));

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
const jpg = await page.evaluate(async ({ datas, maxW }) => {
  const imgs = await Promise.all(datas.map((d) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = d; })));
  const good = imgs.filter(Boolean);
  const scale = (im) => Math.min(1, maxW / im.width);
  const W = Math.max(...good.map((im) => Math.round(im.width * scale(im))));
  const H = good.reduce((s, im) => s + Math.round(im.height * scale(im)) + 6, 0);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const x = cv.getContext('2d'); x.fillStyle = '#0a0a0c'; x.fillRect(0, 0, W, H);
  let y = 0;
  for (const im of good) { const s = scale(im); const w = Math.round(im.width * s), h = Math.round(im.height * s); x.drawImage(im, 0, y, w, h); y += h + 6; }
  return cv.toDataURL('image/jpeg', 0.82);
}, { datas, maxW });
writeFileSync(resolve(outPath), Buffer.from(jpg.split(',')[1], 'base64'));
await browser.close();
console.log('OK ' + outPath);
