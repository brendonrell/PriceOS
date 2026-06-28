/* Render ONE composition (fixed seed) of an engine across every colorway via
   window.FORCE_PAL, so the signature colour can be judged in isolation.
   Usage: node tools/halo/colorstrip.mjs <enginePath> <outPng> <seed> */
import { chromium } from 'playwright-core';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const EXEC = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const [, , enginePath, outPng, seedArg] = process.argv;
const seed = parseInt(seedArg || '3', 10);
const kit = readFileSync(resolve('tools/halo/kit.js'), 'utf8');
const engine = readFileSync(resolve(enginePath), 'utf8');

const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: kit });
await page.addScriptTag({ content: engine });

// discover colorway names by probing seeds
const pals = await page.evaluate(() => {
  const s = []; for (let i = 0; i < 300; i++) { const n = window.ENGINE.traits(i).Palette; if (n && !s.includes(n)) s.push(n); } return s;
});

const frames = await page.evaluate(({ seed, pals }) => {
  const out = [];
  for (const pal of pals) {
    window.FORCE_PAL = pal;
    const cv = document.createElement('canvas');
    window.ENGINE.draw(cv, seed);
    out.push({ pal, url: cv.toDataURL('image/png'), w: cv.width, h: cv.height });
  }
  window.FORCE_PAL = null;
  return out;
}, { seed, pals });

const sheet = await page.evaluate(async ({ frames }) => {
  const COLS = Math.min(3, frames.length), pad = 16, lab = 28, head = 40, cell = 460;
  const rows = Math.ceil(frames.length / COLS);
  const cv = document.createElement('canvas');
  cv.width = COLS * cell + (COLS + 1) * pad;
  cv.height = head + rows * (cell + lab) + (rows + 1) * pad;
  const x = cv.getContext('2d');
  x.fillStyle = '#08080b'; x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = '#f0f0f4'; x.font = '700 22px monospace'; x.textBaseline = 'top';
  x.fillText('MONSOON · signature colorways (same scene)', pad, 12);
  await Promise.all(frames.map((fr, i) => new Promise((res) => {
    const im = new Image();
    im.onload = () => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = pad + col * (cell + pad), cy = head + pad + row * (cell + lab + pad);
      x.fillStyle = '#101015'; x.fillRect(cx, cy, cell, cell);
      const ar = fr.w / fr.h; let dw = cell, dh = cell;
      if (ar > 1) dh = cell / ar; else dw = cell * ar;
      x.drawImage(im, cx + (cell - dw) / 2, cy + (cell - dh) / 2, dw, dh);
      x.fillStyle = '#cfd0d8'; x.font = '700 16px monospace';
      x.fillText(`${i + 1}. ${fr.pal}`, cx + 2, cy + cell + 5);
      res();
    };
    im.onerror = () => res();
    im.src = fr.url;
  })), { frames });
  return cv.toDataURL('image/png');
}, { frames });

writeFileSync(resolve(outPng), Buffer.from(sheet.split(',')[1], 'base64'));
await browser.close();
console.log(`OK colorstrip ${pals.length} pals -> ${outPng}`);
