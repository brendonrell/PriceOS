/* Engine determinism harness (Architect Report §3.1 Stage 2 / §4.2).
 *
 * For EVERY project in the registry, renders two sample Outputs (#1, #7):
 *   1. twice each → the two renders must hash IDENTICALLY (determinism), and
 *   2. against tools/engine-hashes/golden.json when it exists → any diff
 *      means the ART CHANGED and the change must not ship without Brendon.
 *
 * Usage:
 *   node tools/engine-hashes/build.mjs   # bundle the registry (esbuild)
 *   node tools/engine-hashes/run.mjs             # verify (fails on any diff)
 *   node tools/engine-hashes/run.mjs --write     # (re)write golden.json
 *
 * Goldens are tagged with the rendering environment (chromium path) — they
 * compare apples-to-apples on the same setup. The primary workflow is
 * before/after within one session: verify green → change code → verify green.
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

const SIZE = Number(process.env.SIZE || 480);
const IDS = [1, 7];
const EXEC = process.env.PW_EXEC || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const GOLDEN = 'tools/engine-hashes/golden.json';
const WRITE = process.argv.includes('--write');

const bundle = readFileSync('tools/engine-hashes/bundle.js', 'utf8');
const browser = await chromium.launch({ executablePath: EXEC });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('PAGE-THROW:', e.message));
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: bundle });

const slugs = await page.evaluate(() => window.__slugs || []);
console.log(`projects: ${slugs.length} · samples per project: ${IDS.length} · size ${SIZE}`);

const hashes = {};
let nondeterministic = 0, failed = 0, n = 0;
for (const s of slugs) {
  for (const id of IDS) {
    const key = `${s}/${id}`;
    try {
      const one = await page.evaluate(({ s, id, SIZE }) => window.__renderPixels(s, id, SIZE), { s, id, SIZE });
      const two = await page.evaluate(({ s, id, SIZE }) => window.__renderPixels(s, id, SIZE), { s, id, SIZE });
      const h1 = createHash('sha256').update(Buffer.from(one.pixels)).update(`${one.w}x${one.h}`).digest('hex').slice(0, 16);
      const h2 = createHash('sha256').update(Buffer.from(two.pixels)).update(`${two.w}x${two.h}`).digest('hex').slice(0, 16);
      if (h1 !== h2) { nondeterministic++; console.error(`NON-DETERMINISTIC: ${key} (${h1} vs ${h2})`); }
      hashes[key] = h1;
    } catch (e) {
      failed++; console.error('RENDER FAIL', key, String(e).slice(0, 120));
    }
    if (++n % 40 === 0) console.log(`${n}/${slugs.length * IDS.length}`);
  }
}
await browser.close();

if (WRITE) {
  writeFileSync(GOLDEN, JSON.stringify({ env: EXEC, size: SIZE, ids: IDS, hashes }, null, 1));
  console.log(`golden.json written: ${Object.keys(hashes).length} hashes`);
} else if (existsSync(GOLDEN)) {
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8'));
  let diffs = 0;
  for (const [key, h] of Object.entries(hashes)) {
    if (golden.hashes[key] && golden.hashes[key] !== h) { diffs++; console.error(`ART CHANGED: ${key}`); }
  }
  console.log(diffs ? `❌ ${diffs} pieces differ from golden` : '✓ all hashes match golden');
  if (diffs) process.exit(1);
}
console.log(`determinism: ${nondeterministic ? `❌ ${nondeterministic} unstable` : '✓ stable'} · render failures: ${failed}`);
if (nondeterministic || failed) process.exit(1);
