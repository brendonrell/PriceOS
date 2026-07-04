/* Headless render runner. Injects the bundled real engines into a blank page,
 * renders every visible piece (each project's signature Output #1 + all minted
 * Outputs) to a PNG, and writes an aspect manifest. Output → tools/simrender/out.
 *
 *   node tools/simrender/run.mjs
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';

const SIZE = Number(process.env.SIZE || 1080);
const OUT = 'tools/simrender/out';
const EXEC = process.env.PW_EXEC || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

const bundle = readFileSync('tools/simrender/bundle.js', 'utf8');
const minted = JSON.parse(readFileSync('tools/simrender/minted.json', 'utf8'));

const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('PAGE-ERR:', m.text()); });
page.on('pageerror', (e) => console.error('PAGE-THROW:', e.message));
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: bundle });

const slugs = await page.evaluate(() => window.__slugs || []);
console.log('projects:', slugs.length);

// Job set: every project's signature Output #1 + every minted (slug, id).
const jobs = new Map();
for (const s of slugs) jobs.set(`${s}/1`, [s, 1]);
for (const [s, ids] of Object.entries(minted)) for (const id of ids) jobs.set(`${s}/${id}`, [s, id]);
console.log('images to render:', jobs.size);

const manifest = {};
let n = 0, fail = 0;
for (const [key, [s, id]] of jobs) {
  try {
    const r = await page.evaluate(({ s, id, SIZE }) => window.__renderPiece(s, id, SIZE), { s, id, SIZE });
    mkdirSync(`${OUT}/${s}`, { recursive: true });
    writeFileSync(`${OUT}/${s}/${id}.png`, Buffer.from(r.url.split(',')[1], 'base64'));
    manifest[key] = { aspect: r.aspect, w: r.w, h: r.h };
  } catch (e) {
    fail++; console.error('FAIL', key, String(e).slice(0, 120));
  }
  if (++n % 25 === 0) console.log(n, '/', jobs.size);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(`${OUT}/_manifest.json`, JSON.stringify(manifest, null, 0));
console.log(`DONE ${n} rendered, ${fail} failed → ${OUT}`);
await browser.close();
