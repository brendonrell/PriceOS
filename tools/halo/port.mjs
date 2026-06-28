/* Port halo R&D engines (tools/halo/gen/<slug>.js, window.KIT/window.ENGINE) into
   app engine modules (lib/art/engines/<slug>.ts) that export render<Name> /
   <name>Traits / <name>Schema / <NAME>_ASPECTS via the repo blit() contract.
   KIT is bundled; trait schema is derived by sampling traits() (pure, no canvas);
   aspects are parsed from the engine's W/H format list. */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// slug -> { Name (Pascalish export), display, varbase }
const ENGINES = [
  { slug: 'orbital', base: 'orbital', Base: 'Orbital' },
  { slug: 'pressroom', base: 'pressroom', Base: 'Pressroom' },
  { slug: 'cinder', base: 'cinder', Base: 'Cinder' },
  { slug: 'interchange', base: 'interchange', Base: 'Interchange' },
  { slug: 'topiary', base: 'topiary', Base: 'Topiary' },
  { slug: 'tideworks', base: 'tideworks', Base: 'Tideworks' },
];

// ---- bundle KIT: kit.js is an IIFE that sets window.KIT={...} ----
let kitSrc = readFileSync(resolve('tools/halo/kit.js'), 'utf8');
// drop the opening IIFE line and trailing close, expose as const KIT
kitSrc = kitSrc
  .replace(/\(function \(\) \{/, '/* KIT (bundled from tools/halo/kit.js) */')
  .replace(/\}\)\(\);\s*$/, '')
  .replace('window.KIT=', 'const KIT=');

// run kit + engine in node to derive schema (traits() is pure, no canvas)
function loadEngine(engSrc) {
  const sandbox = { window: {} };
  const run = new Function('window', kitSrc.replace('const KIT=', 'window.KIT=') + '\n' + engSrc + '\n;return window.ENGINE;');
  return run(sandbox.window);
}

function deriveSchema(engine) {
  const order = [];
  const sets = new Map();
  for (let s = 1; s <= 4000; s++) {
    let t;
    try { t = engine.traits(s); } catch (e) { continue; }
    for (const [k, v] of Object.entries(t)) {
      if (!sets.has(k)) { sets.set(k, []); order.push(k); }
      const arr = sets.get(k);
      const val = String(v);
      if (!arr.includes(val)) arr.push(val);
    }
  }
  // keep only string-categorical axes (drop numeric-only like Strata) — but the
  // registry wants every artist trait; keep all, values as strings.
  return { traits: order.map((name) => ({ name, values: sets.get(name) })) };
}

function deriveAspects(engSrc) {
  const set = new Set();
  const re = /W:\s*(\d+)\s*,\s*H:\s*(\d+)/g;
  let m;
  while ((m = re.exec(engSrc))) {
    const a = +(parseInt(m[1], 10) / parseInt(m[2], 10)).toFixed(4);
    set.add(a);
  }
  return set.size ? [...set] : [1.32, 1, 0.78];
}

for (const e of ENGINES) {
  const engSrc = readFileSync(resolve(`tools/halo/gen/${e.slug}.js`), 'utf8');
  const engine = loadEngine(engSrc);
  const schema = deriveSchema(engine);
  const aspects = deriveAspects(engSrc);

  // transform engine source for the module: window.KIT->KIT, capture ENGINE,
  // neutralise any window.* refs.
  const engMod = engSrc
    .replace('window.ENGINE = (function', 'const ENGINE = (function')
    .replace(/window\.KIT/g, 'KIT')
    .replace(/window\.FORCE_PAL/g, 'undefined')
    .replace(/typeof window !== 'undefined' && /g, '');

  const NAME = e.base.toUpperCase();
  const out = `// @ts-nocheck
/*
 * ${e.Base} — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/gen/${e.slug}.js). Layout axis (4-6 structurally distinct
 * compositions) + per-output colour range. Deterministic from tokenId only.
 * KIT helpers are bundled; trait schema derived from the engine's own casts.
 */
import { blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

${kitSrc}

${engMod}

export const ${e.base}Traits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const render${e.Base}: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const ${NAME}_ASPECTS: readonly number[] = ${JSON.stringify(aspects)};
export const ${e.base}Schema: TraitSchema = ${JSON.stringify(schema, null, 2)};
`;
  writeFileSync(resolve(`lib/art/engines/${e.slug}.ts`), out);
  console.log(`OK ${e.slug}.ts  schema:[${schema.traits.map((t) => t.name + ':' + t.values.length).join(', ')}]  aspects:${aspects.length}`);
}
console.log('done');
