/* Halo R&D render harness.
 *
 * Usage:
 *   node render.mjs <engineFile.js> <outDir> [seedsCSV] [tile] [cols]
 *
 * The engine file is plain browser JS that defines `window.ENGINE = {
 *   name, formats?, draw(canvas, seed), traits(seed) }`. KIT (kit.js) is
 *   injected first. We render each seed at high native resolution, save an
 *   individual PNG, and compose a labelled contact sheet for the jury.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, basename } from 'path';

const [, , enginePath, outDir, seedsCSV, tileArg, colsArg] = process.argv;
if (!enginePath || !outDir) { console.error('args: <engineFile> <outDir> [seeds] [tile] [cols]'); process.exit(1); }

const seeds = (seedsCSV || '1,2,3,4,5,6,7,8,9').split(',').map((s) => parseInt(s.trim(), 10));
const TILE = parseInt(tileArg || '760', 10);   // native render size (long edge)
const COLS = parseInt(colsArg || '3', 10);

mkdirSync(outDir, { recursive: true });
const kit = readFileSync(resolve('tools/halo/kit.js'), 'utf8');
const engine = readFileSync(resolve(enginePath), 'utf8');

const browser = await chromium.launch(process.env.PW_CHROME ? { executablePath: process.env.PW_CHROME } : {});
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('PAGE-ERR:', m.text()); });
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: kit });
await page.addScriptTag({ content: engine });

const name = await page.evaluate(() => window.ENGINE?.name || 'engine');

// Render each seed at native res, return dataURL + chosen aspect + traits.
const results = await page.evaluate(async ({ seeds, TILE }) => {
  const E = window.ENGINE;
  const out = [];
  for (const seed of seeds) {
    const cv = document.createElement('canvas');
    // engine decides native W/H from seed; we hint a long-edge target via cv size
    cv.width = TILE; cv.height = TILE;
    const res = E.draw(cv, seed) || {};
    const aspect = res.aspect || (cv.width / cv.height) || 1;
    let traits = {};
    try { traits = E.traits ? E.traits(seed) : {}; } catch (e) { traits = { err: String(e) }; }
    out.push({ seed, url: cv.toDataURL('image/png'), aspect, traits, w: cv.width, h: cv.height });
  }
  return out;
}, { seeds, TILE });

// Save individual PNGs.
for (const r of results) {
  const b64 = r.url.split(',')[1];
  writeFileSync(`${outDir}/${name}_seed${r.seed}.png`, Buffer.from(b64, 'base64'));
}

// Compose a labelled contact sheet in-page.
const sheet = await page.evaluate(async ({ results, COLS, name }) => {
  const pad = 14, label = 26, cell = 380;
  const rows = Math.ceil(results.length / COLS);
  const cv = document.createElement('canvas');
  cv.width = COLS * cell + (COLS + 1) * pad;
  cv.height = rows * (cell + label) + (rows + 1) * pad + 40;
  const x = cv.getContext('2d');
  x.fillStyle = '#0a0a0d'; x.fillRect(0, 0, cv.width, cv.height);
  x.fillStyle = '#e8e8ee'; x.font = 'bold 20px monospace';
  x.fillText(name, pad, 28);
  const load = (u) => new Promise((res) => { const im = new Image(); im.onload = () => res(im); im.src = u; });
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const col = i % COLS, row = Math.floor(i / COLS);
    const cx = pad + col * (cell + pad);
    const cy = 40 + pad + row * (cell + label + pad);
    const im = await load(r.url);
    // fit into cell preserving aspect
    let w = cell, h = cell / r.aspect;
    if (h > cell) { h = cell; w = cell * r.aspect; }
    x.drawImage(im, cx + (cell - w) / 2, cy + (cell - h) / 2, w, h);
    x.strokeStyle = '#23232c'; x.strokeRect(cx, cy, cell, cell);
    x.fillStyle = '#9aa0ae'; x.font = '13px monospace';
    const tline = Object.values(r.traits).slice(0, 4).join(' · ');
    x.fillText(`#${r.seed}  ${tline}`, cx + 2, cy + cell + 18);
  }
  return cv.toDataURL('image/png');
}, { results, COLS, name });

writeFileSync(`${outDir}/_contact_${name}.png`, Buffer.from(sheet.split(',')[1], 'base64'));
console.log(`OK ${name}: ${results.length} seeds → ${outDir}/_contact_${name}.png`);
console.log('traits sample:', JSON.stringify(results[0].traits));
await browser.close();
