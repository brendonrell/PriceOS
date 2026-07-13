/* Port the 24 halo R&D engines (tools/halo/{b_,z_}*.js) into app engine modules
   lib/art/engines/<slug>.ts via the repo blit() contract. KIT bundled; schema
   derived by sampling traits(); aspects default (engines size canvas continuously). */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ENGINES = [
  ['b_aftergravity','after-gravity','aftergravity','AfterGravity'],
  ['b_vanguard','vanguard','vanguard','Vanguard'],
  ['b_mutiny','quiet-mutiny','quietMutiny','QuietMutiny'],
  ['b_andante','andante','andante','Andante'],
  ['b_threshold','threshold','threshold','Threshold'],
  ['b_ictus','ictus','ictus','Ictus'],
  ['b_reverie','reverie','reverie','Reverie'],
  ['b_cadence','cadence','cadence','Cadence'],
  ['b_aperture','aperture','aperture','Aperture'],
  ['b_interim','interim','interim','Interim'],
  ['b_stillpoint','stillpoint','stillpoint','Stillpoint'],
  ['z_chladni','chladni','chladni','Chladni'],
  ['z_caustics','caustics','caustics','Caustics'],
  ['z_schlieren','schlieren','schlieren','Schlieren'],
  ['z_frostfern','frost-fern','frostFern','FrostFern'],
  ['z_cyanotype','cyanotype','cyanotype','Cyanotype'],
  ['z_kintsugi','kintsugi','kintsugi','Kintsugi'],
  ['z_efflorescence','efflorescence','efflorescence','Efflorescence'],
  ['z_evaporate','evaporate','evaporate','Evaporate'],
  ['z_encaustic','encaustic','encaustic','Encaustic'],
  ['z_patina','patina','patina','Patina'],
  ['z_frottage','frottage','frottage','Frottage'],
  ['z_fumage','fumage','fumage','Fumage'],
];

let kitSrc = readFileSync(resolve('tools/halo/kit.js'), 'utf8');
kitSrc = kitSrc
  .replace(/\(function \(\) \{/, '/* KIT (bundled from tools/halo/kit.js) */')
  .replace(/\}\)\(\);\s*$/, '')
  .replace('window.KIT=', 'const KIT=');

function loadEngine(engSrc) {
  const run = new Function('window', kitSrc.replace('const KIT=', 'window.KIT=') + '\n' + engSrc + '\n;return window.ENGINE;');
  return run({});
}
function deriveSchema(engine) {
  const order = []; const sets = new Map();
  for (let s = 1; s <= 4000; s++) {
    let t; try { t = engine.traits(s); } catch (e) { continue; }
    for (const [k, v] of Object.entries(t)) {
      if (!sets.has(k)) { sets.set(k, []); order.push(k); }
      const arr = sets.get(k); const val = String(v);
      if (!arr.includes(val)) arr.push(val);
    }
  }
  return { traits: order.map((name) => ({ name, values: sets.get(name) })) };
}

const DEFAULT_ASPECTS = [1.3, 1, 0.78];
let ok = 0;
for (const [file, slug, base, Base] of ENGINES) {
  const engSrc = readFileSync(resolve(`tools/halo/${file}.js`), 'utf8');
  let engine;
  try { engine = loadEngine(engSrc); } catch (e) { console.log(`FAIL load ${slug}: ${e.message}`); continue; }
  const schema = deriveSchema(engine);
  const engMod = engSrc
    .replace('window.ENGINE = (function', 'const ENGINE = (function')
    .replace('window.ENGINE=(function', 'const ENGINE = (function')
    .replace(/window\.KIT/g, 'KIT')
    .replace(/window\.FORCE_PAL/g, 'undefined')
    .replace(/typeof window !== 'undefined' && /g, '');
  const NAME = base.replace(/([A-Z])/g, '_$1').toUpperCase().replace(/^_/, '');
  const out = `// @ts-nocheck
/*
 * ${Base} — PriceOS art engine (ported from the halo R&D engine
 * tools/halo/${file}.js). Continuous seed-driven composition. Deterministic
 * from tokenId only. KIT bundled; trait schema derived from the engine's casts.
 */
import { blit } from './ai/extra/_kit';
import type { EngineFn, TraitsFn, TraitSchema } from '../../project/types';

${kitSrc}

${engMod}

export const ${base}Traits: TraitsFn = (tokenId) => ENGINE.traits(tokenId);
export const render${Base}: EngineFn = blit((cv, tokenId) => ENGINE.draw(cv, tokenId), (tokenId) => ENGINE.traits(tokenId));
export const ${NAME}_ASPECTS: readonly number[] = ${JSON.stringify(DEFAULT_ASPECTS)};
export const ${base}Schema: TraitSchema = ${JSON.stringify(schema, null, 2)};
`;
  writeFileSync(resolve(`lib/art/engines/${slug}.ts`), out);
  console.log(`OK ${slug}.ts  [${schema.traits.map((t) => t.name + ':' + t.values.length).join(', ')}]`);
  ok++;
}
console.log(`done ${ok}/${ENGINES.length}`);
