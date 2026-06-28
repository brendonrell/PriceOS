/* Port a locked tournament engine (tools/halo/t_X.js, a window.ENGINE + window.KIT
 * browser script) into a self-contained TS engine module for the app
 * (lib/art/engines/X.ts) — faithfully, so the art cannot drift in translation.
 *
 * It inlines KIT as a module-local const, strips the window.* hooks, and derives
 * the trait schema + aspect ratios by actually running the engine. The render
 * logic itself is copied verbatim.
 *
 * Usage: node tools/halo/port.mjs <engineFile> <exportBase> <CONST> <outTs>
 *   e.g. node tools/halo/port.mjs tools/halo/t_murmuration.js murmuration MURMURATION lib/art/engines/murmuration.ts
 */
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const [, , engineFile, base, CONST, outTs] = process.argv;
if (!engineFile || !base || !CONST || !outTs) { console.error('args: <engineFile> <exportBase> <CONST> <outTs>'); process.exit(1); }
const Cap = base[0].toUpperCase() + base.slice(1);

const kitText = readFileSync(resolve('tools/halo/kit.js'), 'utf8');
const engText = readFileSync(resolve(engineFile), 'utf8');

// ── derive schema + aspects by running the engine ──
const browser = await chromium.launch({ executablePath: process.env.PW_EXEC || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.error('PAGE-ERR:', m.text()); });
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: kitText });
await page.addScriptTag({ content: engText });

const meta = await page.evaluate(() => {
  const E = window.ENGINE;
  // schema: union of trait keys (first-seen order) and their values (first-seen order)
  const keys = []; const vals = {};
  for (let s = 1; s <= 1200; s++) {
    const t = E.traits(s);
    for (const k of Object.keys(t)) {
      if (!keys.includes(k)) { keys.push(k); vals[k] = []; }
      const v = String(t[k]);
      if (!vals[k].includes(v)) vals[k].push(v);
    }
  }
  // aspects: unique aspect ratios from actually drawing a spread of seeds
  const asp = new Set();
  for (let s = 1; s <= 40; s++) {
    const cv = document.createElement('canvas'); cv.width = 300; cv.height = 300;
    const res = E.draw(cv, s) || {};
    asp.add(Math.round((res.aspect || cv.width / cv.height) * 1000) / 1000);
  }
  return { keys, vals, aspects: [...asp].sort((a, b) => b - a) };
});
await browser.close();

// ── build KIT block: inline kit.js as a module-local const K ──
let kitBody = kitText.slice(kitText.indexOf('(function'));
kitBody = kitBody.replace('window.KIT={', 'return {');
const kitBlock = 'const K = ' + kitBody;

// ── build ENGINE block: strip window hooks, keep render logic verbatim ──
let engBody = engText.slice(engText.indexOf('(function'));
engBody = engBody.split('\n')
  .filter((l) => !l.includes('window.FORCE_PAL') && !l.includes('const K = window.KIT'))
  .join('\n');
const engineBlock = 'const ENGINE = ' + engBody;

// ── schema literal ──
const schemaTraits = meta.keys.map((k) => `    { name: ${JSON.stringify(k)}, values: ${JSON.stringify(meta.vals[k])} }`).join(',\n');

const ts = `// @ts-nocheck
/*
 * ${Cap} — generated from the locked tournament engine (tools/halo/${engineFile.split('/').pop()})
 * by tools/halo/port.mjs. The render logic is copied verbatim; KIT is inlined as
 * a module-local const and the window.* R&D hooks are stripped. Deterministic in
 * tokenId. Frozen art — edit the source engine + re-port, don't hand-tune here.
 */
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

${kitBlock}

${engineBlock}

export const ${CONST}_ASPECTS: readonly number[] = ${JSON.stringify(meta.aspects)};

export const ${base}Traits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);

export const ${base}Schema: TraitSchema = {
  traits: [
${schemaTraits},
  ],
};

export const render${Cap}: EngineFn = (canvas, tokenId, width) => {
  const off = document.createElement('canvas');
  const res = ENGINE.draw(off, tokenId) || {};
  const W = Math.max(1, Math.floor(width));
  const H = Math.max(1, Math.round((W * off.height) / off.width));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (ctx) ctx.drawImage(off, 0, 0, W, H);
  return { aspect: res.aspect || off.width / off.height, traits: ENGINE.traits(tokenId) };
};
`;

writeFileSync(resolve(outTs), ts);
console.log('PORTED →', outTs);
console.log('  trait keys:', meta.keys.join(', '));
console.log('  aspects:', meta.aspects.join(', '));
