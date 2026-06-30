import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
const p = resolve('lib/project/registry.ts');
let src = readFileSync(p, 'utf8');

// [slug, base, Base, NAME, CONST, display, artist, outputs, colorway, soundtrackOrNull]
const E = [
 ['after-gravity','aftergravity','AfterGravity','AFTERGRAVITY','AFTER_GRAVITY','After Gravity','umbra-ai',256,'#2E5FA3',null],
 ['vanguard','vanguard','Vanguard','VANGUARD','VANGUARD','Vanguard','tracedeck-ai',256,'#D02E22',null],
 ['quiet-mutiny','quietMutiny','QuietMutiny','QUIET_MUTINY','QUIET_MUTINY','Quiet Mutiny','tender-ai',333,'#2B2A28',null],
 ['andante','andante','Andante','ANDANTE','ANDANTE','Andante','lowgravity-ai',288,'#2D52C9',null],
 ['threshold','threshold','Threshold','THRESHOLD','THRESHOLD','Threshold','firstchannel-ai',222,'#233E8C',null],
 ['ictus','ictus','Ictus','ICTUS','ICTUS','Ictus','nightpour-ai',222,'#7A2E26',null],
 ['jazz','jazz','Jazz','JAZZ','JAZZ','Jazz','newsprint-ai',256,'#E8643C',null],
 ['reverie','reverie','Reverie','REVERIE','REVERIE','Reverie','veil-ai',256,'#C98B86',null],
 ['cadence','cadence','Cadence','CADENCE','CADENCE','Cadence','tender-ai',288,'#1D4E89',null],
 ['aperture','aperture','Aperture','APERTURE','APERTURE','Aperture','lapidary-ai',256,'#1C8C7A',null],
 ['interim','interim','Interim','INTERIM','INTERIM','Interim','lowgravity-ai',222,'#2C3E70',null],
 ['stillpoint','stillpoint','Stillpoint','STILLPOINT','STILLPOINT','Stillpoint','umbra-ai',333,'#C0392B',{playlistId:'OLAK5uy_l61jyu2-HfVxbgW4KFUruUOjU56T0az-s',label:'Alice Coltrane — Journey in Satchidananda'}],
 ['chladni','chladni','Chladni','CHLADNI','CHLADNI','Chladni','murmur-ai',256,'#C7A878',null],
 ['caustics','caustics','Caustics','CAUSTICS','CAUSTICS','Caustics','slacktide-ai',288,'#1FA6A0',null],
 ['schlieren','schlieren','Schlieren','SCHLIEREN','SCHLIEREN','Schlieren','veil-ai',222,'#8A9099',null],
 ['frost-fern','frostFern','FrostFern','FROST_FERN','FROST_FERN','Frost Fern','coralline-ai',256,'#8FC7E0',null],
 ['cyanotype','cyanotype','Cyanotype','CYANOTYPE','CYANOTYPE','Cyanotype','overprint-ai',256,'#2A4A8C',null],
 ['kintsugi','kintsugi','Kintsugi','KINTSUGI','KINTSUGI','Kintsugi','lapidary-ai',333,'#C9A227',null],
 ['efflorescence','efflorescence','Efflorescence','EFFLORESCENCE','EFFLORESCENCE','Efflorescence','fathom-ai',222,'#9FB0AE',null],
 ['evaporate','evaporate','Evaporate','EVAPORATE','EVAPORATE','Evaporate','overprint-ai',256,'#8A5A3C',null],
 ['encaustic','encaustic','Encaustic','ENCAUSTIC','ENCAUSTIC','Encaustic','firstchannel-ai',256,'#D9A24E',null],
 ['patina','patina','Patina','PATINA','PATINA','Patina','fathom-ai',256,'#3E8C6E',null],
 ['frottage','frottage','Frottage','FROTTAGE','FROTTAGE','Frottage','offset-ai',222,'#6E7378',null],
 ['fumage','fumage','Fumage','FUMAGE','FUMAGE','Fumage','offset-ai',222,'#3A332C',null],
];

const imports = E.map(([slug,base,Base,NAME]) =>
  `import { render${Base}, ${base}Traits, ${base}Schema, ${NAME}_ASPECTS } from '../art/engines/${slug}';`).join('\n');

const consts = E.map(([slug,base,Base,NAME,CONST,display,artist,outputs,colorway,st]) => {
  const sound = st ? `{ playlistId: '${st.playlistId}', label: '${st.label}' }` : 'null';
  return `const ${CONST}: ProjectDef = {
  slug: '${slug}',
  displayName: '${display}',
  artistHandle: '${artist}',
  outputs: ${outputs},
  colorway: '${colorway}',
  mintPriceEth: 0,
  soundtrack: ${sound},
  aspects: ${NAME}_ASPECTS,
  traitSchema: ${base}Schema,
  render: render${Base},
  traitsOf: ${base}Traits,
};`;
}).join('\n\n');

// 1) insert imports right after the conservatory import line
const consImport = "import { renderConservatory, conservatoryTraits, conservatorySchema, CONSERVATORY_ASPECTS } from '../art/engines/conservatory';";
if (!src.includes(consImport)) throw new Error('conservatory import anchor not found');
src = src.replace(consImport, consImport + '\n' + imports);

// 2) insert const blocks right before `const PROJECTS`
const projAnchor = 'const PROJECTS: readonly ProjectDef[] = [';
const idx = src.indexOf(projAnchor);
if (idx < 0) throw new Error('PROJECTS anchor not found');
src = src.slice(0, idx) + '/* ── HALO cohort 2 — 24 new abstract projects (opus4-8 build, assigned to -ai artists) ── */\n' + consts + '\n\n' + src.slice(idx);

// 3) append const names into the PROJECTS array (before the closing ];)
const names = E.map((e) => e[4]).join(', ');
src = src.replace('NOCTILUCENT];', `NOCTILUCENT, ${names}];`);

writeFileSync(p, src);
console.log('wired 24 projects into registry.ts');
