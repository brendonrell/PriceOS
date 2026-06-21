/* K3 colorways runner — honors PW_EXEC (lives in king/ per write constraint). */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const outDir = 'tools/halo/king/out/K3';
const seed = 5;
mkdirSync(outDir, { recursive: true });
const kit = readFileSync(resolve('tools/halo/kit.js'), 'utf8');
const engine = readFileSync(resolve('tools/halo/king/k3_mosh.js'), 'utf8');

const browser = await chromium.launch(process.env.PW_EXEC ? { executablePath: process.env.PW_EXEC } : {});
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: kit });
await page.addScriptTag({ content: engine });

const pals = await page.evaluate(() => {
  const s = new Set(); for (let i = 0; i < 400; i++) s.add(window.ENGINE.traits(i).Palette); return [...s];
});

const results = await page.evaluate(({ seed, pals }) => {
  const out = [];
  for (const pal of pals) {
    window.FORCE_PAL = pal;
    const cv = document.createElement('canvas'); cv.width = 760; cv.height = 760;
    const res = window.ENGINE.draw(cv, seed) || {};
    out.push({ pal, url: cv.toDataURL('image/png'), aspect: res.aspect || 1 });
  }
  window.FORCE_PAL = null;
  return out;
}, { seed, pals });

const sheet = await page.evaluate(async ({ results, seed }) => {
  const COLS = 4, pad = 14, label = 24, cell = 360;
  const rows = Math.ceil(results.length / COLS);
  const cv = document.createElement('canvas');
  cv.width = COLS * cell + (COLS + 1) * pad; cv.height = rows * (cell + label) + (rows + 1) * pad + 36;
  const x = cv.getContext('2d'); x.fillStyle = '#0a0a0d'; x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = '#e8e8ee'; x.font = 'bold 18px monospace'; x.fillText('COLORWAYS — fixed composition (seed ' + seed + ')', pad, 26);
  const load = (u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
  for (let i = 0; i < results.length; i++) {
    const r = results[i], col = i % COLS, row = Math.floor(i / COLS);
    const cx = pad + col * (cell + pad), cy = 36 + pad + row * (cell + label + pad);
    const im = await load(r.url);
    let w = cell, h = cell / r.aspect; if (h > cell) { h = cell; w = cell * r.aspect; }
    x.drawImage(im, cx + (cell - w) / 2, cy + (cell - h) / 2, w, h);
    x.strokeStyle = '#23232c'; x.strokeRect(cx, cy, cell, cell);
    x.fillStyle = '#cfd3da'; x.font = '14px monospace'; x.fillText(r.pal, cx + 2, cy + cell + 17);
  }
  return cv.toDataURL('image/png');
}, { results, seed });

writeFileSync(`${outDir}/_colorways.png`, Buffer.from(sheet.split(',')[1], 'base64'));
console.log('OK colorways →', `${outDir}/_colorways.png`, '(' + results.length + ' palettes)');
await browser.close();
