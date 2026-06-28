/* Halo R&D renderer (playwright-core + bundled chromium).
   Usage: node tools/halo/shoot.mjs <enginePath> <outDir> <label> <seedsCSV> [cell]
   Injects kit.js + the engine (window.ENGINE.draw(cv,seed) / .traits(seed)),
   renders each seed at the engine's chosen size, writes per-seed PNGs and a
   labelled contact sheet (_contact_<label>.png). */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const [, , enginePath, outDir, label, seedsCSV, cellArg] = process.argv;
const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const seeds = (seedsCSV || '1,2,3,4,5,6,7,8,9,10,11,12').split(',').map((s) => parseInt(s, 10));
const cell = parseInt(cellArg || '380', 10);
mkdirSync(outDir, { recursive: true });

const kit = readFileSync(resolve('tools/halo/kit.js'), 'utf8');
const engine = readFileSync(resolve(enginePath), 'utf8');

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: kit });
await page.addScriptTag({ content: engine });

const results = await page.evaluate((seeds) => {
  const out = [];
  for (const seed of seeds) {
    const cv = document.createElement('canvas');
    const res = window.ENGINE.draw(cv, seed) || {};
    let traits = {};
    try { traits = window.ENGINE.traits ? window.ENGINE.traits(seed) : {}; } catch (e) {}
    out.push({ seed, url: cv.toDataURL('image/png'), w: cv.width, h: cv.height, traits });
  }
  return out;
}, seeds);

for (const r of results) {
  writeFileSync(resolve(outDir, `${label}_seed${r.seed}.png`), Buffer.from(r.url.split(',')[1], 'base64'));
}

// contact sheet
const sheet = await page.evaluate(async ({ results, label, cell }) => {
  const COLS = Math.min(4, results.length);
  const pad = 12, lab = 22, rows = Math.ceil(results.length / COLS);
  const cv = document.createElement('canvas');
  cv.width = COLS * cell + (COLS + 1) * pad;
  cv.height = rows * (cell + lab) + (rows + 1) * pad + 30;
  const x = cv.getContext('2d');
  x.fillStyle = '#0a0a0c'; x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = '#e8e8ec'; x.font = '700 16px monospace'; x.textBaseline = 'top';
  x.fillText(label, pad, 8);
  await Promise.all(results.map((r, i) => new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = pad + col * (cell + pad), cy = 30 + pad + row * (cell + lab + pad);
      const ar = r.w / r.h; let dw = cell, dh = cell;
      if (ar > 1) dh = cell / ar; else dw = cell * ar;
      x.drawImage(im, cx + (cell - dw) / 2, cy + (cell - dh) / 2, dw, dh);
      x.fillStyle = '#aeb0b8'; x.font = '12px monospace';
      const t = Object.values(r.traits).slice(0, 4).join(' · ');
      x.fillText(`#${r.seed}  ${t}`.slice(0, 62), cx, cy + cell + 4);
      res();
    };
    im.onerror = () => res();
    im.src = r.url;
  })), { results, label, cell });
  return cv.toDataURL('image/png');
}, { results, label, cell });

writeFileSync(resolve(outDir, `_contact_${label}.png`), Buffer.from(sheet.split(',')[1], 'base64'));
await browser.close();
console.log(`OK ${label}: ${results.length} seeds -> ${outDir}`);
