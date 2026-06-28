export const meta = {
  name: 'halo-refine-6',
  description: 'Palette/colour review pass on the 6 remaining halo projects: give each a DISTINCT colour territory (so projects vary between each other) + tasteful colour range across outputs within each; fix Orbital close-ups looming at the lens. Keep last round\'s layout variety.',
  phases: [{ title: 'Refine', detail: '6 agents review palette/colour + Orbital camera' }],
};

const KIT_API = `window.KIT helpers (injected, don't redefine): rng, pick, rint, shuffle, randn, clamp, h2r, r2h, mix(a,b,t), lum, rgba(hex,a), hsl2hex, grain, vignette, mottle, makeNoise(seed)->{noise2,fbm}, bloom, hazeSheet, scanlines, chromaSplit, iridescent, sheen, curl, softShadow, chromeRamp, PHI, INVPHI.`;

const COMMON = `THE JOB — a PALETTE / COLOUR review pass on this EXISTING engine. Brendon likes the current look; do NOT restart or wreck the world. Two goals:
 A) DISTINCT COLOUR TERRITORY (between projects): this project must own the specific colour territory named below so the 6 projects don't cluster. Keep its identity but make sure its dominant hue + value key match the target — retune the palette set toward it where needed.
 B) TASTEFUL COLOUR RANGE (within project, across outputs): the per-output colorways must give GENUINE colour variation seed-to-seed — the dominant colour should visibly shift between outputs — but HARMONIOUS and tasteful, never random clashing or lazily-recoloured. Aim for ~6 colorways that each feel like a deliberate, designed variant.
 C) KEEP the layout variety from the last pass (4-6 structural compositions). Do not regress it.
 D) Keep clearing the bar: saturated, depth, hazy/textured, semi-abstract, surreal, future-evoking; stay distinct from the other 5 projects and from existing site projects (Arcology=cyberpunk city, Leviathan=reef, etc.).`;

const CONTRACT = `Contract unchanged: tools/halo/gen/<slug>.js defines window.ENGINE = { draw(cv,seed){...set cv.width/height; return {aspect}}, traits(seed){return {Layout,Palette,...}} }. Pure deterministic function of seed, headless.`;

const LOOP = `WORK LOOP (don't skip): 1) edit tools/halo/gen/<slug>.js. 2) render seeds 1-8: \`node tools/halo/shoot.mjs tools/halo/gen/<slug>.js tools/halo/out/gen/<slug> <slug> 1,2,3,4,5,6,7,8 340\`. 3) ALSO render a colour spread to check the range: pick ONE good seed and render a few more seeds that hit different colorways, OR just look across the 8. Read the contact sheet. Check HONESTLY: does the project's dominant colour match its assigned TERRITORY? do the outputs show tasteful, varied colour (not all one tint, not garish)? still strong + varied layouts? 4) fix + re-render. Iterate >=3 rounds.`;

const DIRECTIONS = [
  { slug: 'orbital', name: 'ORBITAL',
    territory: 'COSMIC JEWEL — deep space, but the PLANET LIMB + space tint is a different rich jewel hue per output: teal-ocean world, amber-desert world, violet gas-giant, rose world, ice-blue world, ember world. Goods stay warm coral/gold against whatever the space hue is. Across outputs the dominant colour clearly changes (that IS the colour variation).',
    extra: 'CAMERA FIX (important, Brendon flagged): the close-up / hero-stall layouts look WEIRD because stalls loom right at the lens. Pull the camera back: cap the maximum foreground stall size so the biggest stalls sit at a comfortable mid-distance, never jammed against the viewer. Keep depth and a clear focal cluster, just no object looming huge/awkward at the front.' },
  { slug: 'pressroom', name: 'PRESSROOM',
    territory: 'HIGH-KEY LIGHT — the bright one of the set: warm bone/newsprint paper ground, with a DIFFERENT fluoro spot-ink trio per output (e.g. pink+blue+yellow, teal+orange+ink-black, magenta+green, red+cyan, purple+lime, ultramarine+vermilion). Keep it unmistakably a light riso print, ink trio varying tastefully output to output.',
    extra: '' },
  { slug: 'cinder', name: 'CINDER',
    territory: 'FIRE + AURORA on near-black — the hot one: molten orange/white-hot below, and an AURORA whose hue varies per output (green, cyan, magenta-violet, gold, rose). Molten temperature can also shift (white-orange to deep red). Dominant accent clearly changes output to output while staying fiery-on-dark.',
    extra: '' },
  { slug: 'interchange', name: 'INTERCHANGE',
    territory: 'WARM LAMPLIT HALL — the warm-dominant project: sodium amber is home base, but vary the LAMP TEMPERATURE per output so the whole hall recolours — amber sodium, mercury cyan, green vapour, oxblood/rose, cold steel-blue, magenta. Keep the Turner-haze cathedral mood; the light colour is the variable.',
    extra: '' },
  { slug: 'topiary', name: 'TOPIARY',
    territory: 'EMERALD CIRCUIT NIGHT — the green one: deep-night garden, green-dominant, but vary the GLOW per output — emerald, cyan, teal, violet-hedge, chartreuse, amber-lit. Keep it clearly the green/garden project; the trace/node/glow hue shifts tastefully across outputs.',
    extra: '' },
  { slug: 'tideworks', name: 'TIDEWORKS',
    territory: 'BIG DUSK SKIES — push OFF teal-dominant (it currently reads close to the cosmic/garden cools). Make the huge DUSK SKY the colour star and vary it strongly per output: bruised violet, rust-orange sunset, deep indigo, hot-pink dusk, petrol green, ember. Structures stay petrol/cyan silhouettes + mirror reflection, but the SKY colour is what changes dramatically output to output — that differentiates it from the others.',
    extra: '' },
];

phase('Refine');
const SCHEMA = {
  type: 'object',
  properties: {
    slug: { type: 'string' },
    territory: { type: 'string', description: 'the colour territory it now owns, one line' },
    colorways: { type: 'array', items: { type: 'string' } },
    rounds: { type: 'number' },
    colourCheck: { type: 'string', description: 'honest: does it own a distinct territory + show tasteful varied colour across outputs?' },
    orbitalCameraFixed: { type: 'boolean', description: 'orbital only: are close-ups pulled back? (true for non-orbital)' },
    selfScore: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['slug', 'territory', 'colorways', 'rounds', 'colourCheck', 'selfScore', 'notes'],
};

const results = await parallel(DIRECTIONS.map((d) => () => agent(
`You are doing a palette/colour refinement on ONE existing PriceOS art engine: ${d.name} (slug: ${d.slug}).

${COMMON}

ASSIGNED COLOUR TERRITORY for ${d.name}:
${d.territory}
${d.extra ? '\nSPECIAL FIX:\n' + d.extra : ''}

${CONTRACT}

${KIT_API}

${LOOP}

Read your current engine tools/halo/gen/${d.slug}.js and its render tools/halo/out/gen/${d.slug}/_contact_${d.slug}.png first. Render command:
  node tools/halo/shoot.mjs tools/halo/gen/${d.slug}.js tools/halo/out/gen/${d.slug} ${d.slug} 1,2,3,4,5,6,7,8 340
Keep the layouts; make the COLOUR sing — distinct territory + tasteful varied outputs. ${d.slug === 'orbital' ? 'And FIX the looming close-ups.' : ''} Iterate >=3 rounds. Return structured result.`,
  { label: `refine:${d.slug}`, phase: 'Refine', schema: SCHEMA, effort: 'high' },
).catch(() => null)));

return { refined: results.filter(Boolean) };
