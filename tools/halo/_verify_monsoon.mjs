/* Bundle the REAL app engine (lib/art/engines/monsoon.ts) + its kit into a
   browser shim exposing window.ENGINE, so the shipped code path (incl. blit) is
   what gets rendered. Strips TS-only syntax; the engine bodies are plain JS. */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

function strip(src) {
  return src
    .split('\n')
    .filter((l) => !/^\s*import\s/.test(l) && !/@ts-nocheck/.test(l))
    .join('\n')
    .replace(/export\s+/g, '')
    .replace(/:\s*TraitsFn/g, '')
    .replace(/:\s*TraitSchema/g, '')
    .replace(/:\s*EngineFn/g, '')
    .replace(/:\s*readonly number\[\]/g, '');
}

const kit = strip(readFileSync(resolve('lib/art/engines/ai/extra/_kit.ts'), 'utf8'));
const eng = strip(readFileSync(resolve('lib/art/engines/monsoon.ts'), 'utf8'));

const shim = `window.ENGINE = (function(){
${kit}
${eng}
return {
  name: 'monsoon',
  draw: function(cv, seed){ return renderMonsoon(cv, seed, 1240); },
  traits: function(seed){ return monsoonTraits(seed); }
};
})();`;

writeFileSync(resolve('tools/halo/gen/_monsoon_app.js'), shim);
console.log('OK shim -> tools/halo/gen/_monsoon_app.js');
