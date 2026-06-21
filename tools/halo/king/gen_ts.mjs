/* Generate a self-contained TS engine module for the app from a tools/halo
   browser engine (window.ENGINE) + kit.js. Samples the engine to bake a static
   trait schema + aspects, inlines the kit, and wires the standard EngineFn.

   Usage: node tools/halo/king/gen_ts.mjs <srcEngine.js> <slug> <PascalName> <CONST_PREFIX>
   e.g.   node tools/halo/king/gen_ts.mjs tools/halo/king/foil3.js lustre Lustre LUSTRE
   Writes: lib/art/engines/<slug>.ts
*/
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const [, , srcArg, slug, Pascal, CONST] = process.argv;
if (!srcArg || !slug || !Pascal || !CONST) { console.error('args: <src> <slug> <Pascal> <CONST>'); process.exit(1); }

const kitText = readFileSync(resolve('tools/halo/kit.js'), 'utf8');
const engText = readFileSync(resolve(srcArg), 'utf8');

const browser = await chromium.launch(process.env.PW_EXEC ? { executablePath: process.env.PW_EXEC } : {});
const page = await browser.newPage();
await page.setContent('<!doctype html><html><body></body></html>');
await page.addScriptTag({ content: kitText });
await page.addScriptTag({ content: engText });

// Sample schema (pure traits) + aspects (cheap draws).
const { schema, aspects } = await page.evaluate(() => {
  const E = window.ENGINE;
  const order = [];
  const sets = {};
  for (let i = 1; i <= 4000; i++) {
    const t = E.traits(i);
    for (const k of Object.keys(t)) {
      if (!(k in sets)) { sets[k] = new Set(); order.push(k); }
      sets[k].add(String(t[k]));
    }
  }
  const schema = order.map((k) => ({ name: k, values: [...sets[k]] }));
  const asp = new Set();
  for (let i = 1; i <= 60; i++) {
    const cv = document.createElement('canvas');
    const r = E.draw(cv, i) || {};
    const a = r.aspect || (cv.width / cv.height) || 1;
    asp.add(Math.round(a * 1000) / 1000);
  }
  return { schema, aspects: [...asp].sort((p, q) => p - q) };
});
await browser.close();

// Transform kit: `(function(){ ... window.KIT={...}; })();` -> `(() => { ... return {...}; })()`
const kitBody = kitText.replace(/window\.KIT\s*=/, 'return ');
// Transform engine: window.ENGINE = (...)  -> const ENGINE = (...); window.KIT -> KIT
let engBody = engText.replace(/window\.ENGINE\s*=\s*\(function/, 'const ENGINE = (function');
engBody = engBody.replace(/window\.KIT/g, 'KIT');

const out = `// @ts-nocheck
/* AUTO-GENERATED from ${srcArg} by tools/halo/king/gen_ts.mjs — do not hand-edit.
   Self-contained: inlines the halo art kit + the frozen engine, exports the
   standard EngineFn/TraitsFn/Schema/aspects. Deterministic in tokenId. */
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

const KIT = ${kitBody};

${engBody}

function makeRender(raw, traitsOf) {
  return (canvas, tokenId, width) => {
    const off = document.createElement('canvas');
    raw(off, tokenId);
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round((W * off.height) / off.width));
    canvas.width = W; canvas.height = H;
    const c = canvas.getContext('2d');
    if (c) c.drawImage(off, 0, 0, W, H);
    return { aspect: off.width / off.height, traits: traitsOf(tokenId) };
  };
}

export const render${Pascal}: EngineFn = makeRender(ENGINE.draw, ENGINE.traits);
export const ${slug}Traits: TraitsFn = (id) => ENGINE.traits(id);
export const ${slug}Schema: TraitSchema = ${JSON.stringify(schema, null, 2)};
export const ${CONST}_ASPECTS: readonly number[] = ${JSON.stringify(aspects)};
`;

writeFileSync(resolve(`lib/art/engines/${slug}.ts`), out);
console.log(`OK -> lib/art/engines/${slug}.ts | traits: ${schema.map((s) => s.name + '(' + s.values.length + ')').join(', ')} | aspects: ${aspects.join(',')}`);
