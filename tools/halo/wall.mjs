/* Tournament wall — render the SAME N seeds from every engine into one big
 * labelled montage so the field can be compared side by side (and so a jury
 * can judge them together). Each engine gets a row of N frames + its title.
 *
 * Usage: node tools/halo/wall.mjs <outPng> <seedsCSV> [enginesCSV]
 *   enginesCSV defaults to the 12 tournament engines (t_*.js).
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve, dirname, basename } from 'path';

const [, , outPng, seedsCSV, enginesCSV] = process.argv;
const out = outPng || '/tmp/wall.png';
const seeds = (seedsCSV || '1,3,5').split(',').map((s) => parseInt(s.trim(), 10));
const DEFAULT = [
  't_solaria', 't_monoliths', 't_terraces', 't_drift', 't_conservatory', 't_orrery',
  't_murmuration', 't_sporedrift', 't_procession', 't_cloudsea', 't_mirrorlands', 't_garden',
].map((n) => `tools/halo/${n}.js`);
const engines = (enginesCSV ? enginesCSV.split(',') : DEFAULT).filter((p) => existsSync(resolve(p)));

mkdirSync(dirname(resolve(out)), { recursive: true });
const kit = readFileSync(resolve('tools/halo/kit.js'), 'utf8');

const browser = await chromium.launch({ executablePath: process.env.PW_EXEC || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('PAGE-ERR:', m.text()); });
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: kit });

const rows = [];
for (const ep of engines) {
  const engine = readFileSync(resolve(ep), 'utf8');
  await page.addScriptTag({ content: engine });
  const row = await page.evaluate(({ seeds }) => {
    const E = window.ENGINE; const name = E.name; const frames = [];
    for (const s of seeds) {
      const cv = document.createElement('canvas'); cv.width = 640; cv.height = 640;
      const res = E.draw(cv, s) || {}; frames.push({ url: cv.toDataURL('image/png'), aspect: res.aspect || 1 });
    }
    return { name, frames };
  }, { seeds });
  rows.push(row);
  console.log('row', row.name, row.frames.length);
}

const sheet = await page.evaluate(async ({ rows, seeds }) => {
  const COLS = seeds.length, cell = 230, pad = 8, label = 24, titleW = 120;
  const cv = document.createElement('canvas');
  cv.width = titleW + COLS * cell + (COLS + 1) * pad;
  cv.height = rows.length * (cell + pad) + pad + 30;
  const x = cv.getContext('2d'); x.fillStyle = '#08080c'; x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = '#e8e8ee'; x.font = 'bold 16px monospace'; x.fillText('HALO TOURNAMENT — seeds ' + seeds.join(','), pad, 20);
  const load = (u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
  for (let r = 0; r < rows.length; r++) {
    const cy = 30 + pad + r * (cell + pad);
    x.fillStyle = '#cfd3da'; x.font = 'bold 14px monospace';
    x.fillText(rows[r].name.replace('t_', ''), 8, cy + cell / 2);
    for (let c = 0; c < rows[r].frames.length; c++) {
      const f = rows[r].frames[c]; const cx = titleW + pad + c * (cell + pad);
      const im = await load(f.url);
      let w = cell, h = cell / f.aspect; if (h > cell) { h = cell; w = cell * f.aspect; }
      x.drawImage(im, cx + (cell - w) / 2, cy + (cell - h) / 2, w, h);
      x.strokeStyle = '#1c1c24'; x.strokeRect(cx, cy, cell, cell);
    }
  }
  return cv.toDataURL('image/jpeg', 0.72);
}, { rows, seeds });

writeFileSync(resolve(out), Buffer.from(sheet.split(',')[1], 'base64'));
console.log('WALL →', out, '(' + rows.length + ' engines × ' + seeds.length + ' seeds)');
await browser.close();
