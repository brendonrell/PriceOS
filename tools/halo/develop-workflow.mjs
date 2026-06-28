export const meta = {
  name: 'halo-develop-8',
  description: 'Develop the 8 Brendon-chosen halo candidates one step further — add a real Layout axis (4-6 structurally distinct compositions each) so seeds genuinely vary, plus a quality polish; keep each in its own palette lane',
  phases: [{ title: 'Develop', detail: '8 agents upgrade their engine with real compositional variation' }],
};

const KIT_API = `window.KIT helpers (already injected, do NOT redefine): rng(seed)->()=>float, pick(arr,r), rint(r,a,b), shuffle(arr,r), randn(r), clamp(v,a,b), h2r, r2h, mix(a,b,t), lum, rgba(hex,a), hsl2hex, grain(x,W,H,amt,r), vignette(x,W,H,s), mottle, makeNoise(seed)->{noise2,fbm}, bloom(x,cx,cy,rad,col,a0), hazeSheet(x,W,H,noise,col,opacity,scale,blend), scanlines, chromaSplit, iridescent, sheen, curl, softShadow, chromeRamp, PHI, INVPHI.`;

const MANDATE = `THE JOB — develop this EXISTING engine ONE STEP FURTHER. Brendon's note: right now the seeds look like "the same chess pieces moved around the same board." FIX THAT.
 1. Read your current engine file AND its current contact sheet first. Keep what works (palette family, subject, mood) — do NOT start from scratch or change the palette world.
 2. Add a LAYOUT axis: 4-6 STRUCTURALLY DISTINCT compositions, picked by seed. Distinct = a different framing/structure/camera/negative-space balance, NOT the same scene relocated. Some should be busy/full-bleed, some sparse with big negative space, some a single hero element close-up, some a far/tiny-scale read, some a different camera angle. Across 8 seeds a viewer must feel real variety — different PICTURES, not one picture reshuffled.
 3. Keep clearing the bar: SATURATED bold colour, real depth (fore/mid/back, atmospheric perspective), hazy/textured, semi-abstract, surreal (real-but-off), future-evoking. Busy is good but variety + composition matter more now.
 4. Stay DISTINCT from the other 7 projects and from existing site projects (Arcology=cyberpunk city, Leviathan=reef, Carnivale=festival, Electrum/Quicksilver=chrome/crystal, Terminal Network=dashboards, Boreal=aurora).
 5. Expose the Layout choice as a trait (e.g. { Layout: '<name>', ... }).`;

const CONTRACT = `Engine contract (unchanged): the file at tools/halo/gen/<slug>.js defines window.ENGINE = { draw(cv, seed){ const K=window.KIT; ...set cv.width/height (~1240 long edge)...; return {aspect: cv.width/cv.height}; }, traits(seed){ return {Layout:'..', Palette:'..', ...}; } }. Pure function of seed, deterministic, headless, monospace/sans only, no globals but window.ENGINE.`;

const LOOP = `WORK LOOP (do NOT skip): 1) edit tools/halo/gen/<slug>.js. 2) render: \`node tools/halo/shoot.mjs tools/halo/gen/<slug>.js tools/halo/out/gen/<slug> <slug> 1,2,3,4,5,6,7,8 340\`. 3) Read tools/halo/out/gen/<slug>/_contact_<slug>.png and check HONESTLY: do the 8 seeds show genuinely DIFFERENT compositions (not one layout shuffled)? saturated/distinct? depth? any broken/empty frames? 4) fix + re-render. Iterate ≥3 full render+look rounds until the variation is real and every frame is strong.`;

const DIRECTIONS = [
  { slug: 'orbital', name: 'ORBITAL',
    layouts: '(a) planet limb low, swarm arcing above; (b) limb as a steep diagonal corner-to-corner; (c) NO planet — deep-space cluster with a distant hard sun + lens flare; (d) tight close-up on 2-3 hero stalls, the rest of the swarm tiny/hazy behind; (e) a long "caravan" ribbon of stalls streaming across the frame; (f) looking down PAST the bazaar to a planet far below.' },
  { slug: 'pressroom', name: 'PRESSROOM',
    layouts: '(a) dense full-bleed iso city; (b) ONE hero megastructure with sparse surroundings + big paper margin; (c) a torn/half-printed sheet — city on one side, blank newsprint on the other; (d) near-flat overhead plan view; (e) a diagonal press-jam where a whole district smears/repeats; (f) a sparse archipelago of a few buildings in a sea of paper. Also vary misregistration severity (tight vs blown-out).' },
  { slug: 'cinder', name: 'CINDER',
    layouts: '(a) wide foundry floor, many pour-streams; (b) ONE colossal hero pour close-up, sparks filling frame; (c) low-angle looking UP at gantry cranes against aurora; (d) ember-storm dominant, foundry a thin strip at the base; (e) aurora sky dominant with just a sliver of molten glow; (f) a receding row of crucibles into fog.' },
  { slug: 'interchange', name: 'INTERCHANGE',
    layouts: '(a) one-point straight down the nave; (b) off-axis diagonal arcade; (c) a vast hall with crossing light-trains as the hero, arches framing; (d) looking UP into the vaulting, platforms below; (e) platform-edge close view, a train blurring past; (f) a far tiny station lost in fog (crushing scale).' },
  { slug: 'concourse', name: 'CONCOURSE',
    layouts: '(a) terminal centred on its cloud plateau; (b) terminal far + tiny, vast empty cloud sea (the restraint frame); (c) close gate with a jet-bridge reaching into void; (d) the runway that ENDS in sky as the hero diagonal; (e) a flock of craft as the subject, terminal a sliver; (f) god-rays dominant, architecture in silhouette.' },
  { slug: 'orderbook', name: 'ORDERBOOK',
    layouts: '(a) gorge-centred V cut; (b) a flat-on canyon WALL — pure horizontal data-strata, no gorge; (c) a meandering river-canyon seen from above; (d) a single towering mesa/butte of data; (e) extreme macro cross-section (one stratum filling the frame); (f) a wide badlands of many eroded data-buttes receding.' },
  { slug: 'topiary', name: 'TOPIARY',
    layouts: '(a) central path receding to a vanishing point; (b) a single hero topiary specimen, close, with circuitry detail; (c) a formal parterre/knot-garden seen from above (plan view); (d) a hedge maze; (e) an allée — a long row of topiary down one side; (f) a light-fountain-dominant scene. Vary density (sparse formal vs teeming).' },
  { slug: 'tideworks', name: 'TIDEWORKS',
    layouts: '(a) wide refinery skyline + full mirror reflection; (b) a single hero cooling-tower close-up; (c) a maze of pipes filling the whole frame (no horizon); (d) the plant far + tiny across a vast flood (big empty water); (e) looking across the tank-tops (high angle); (f) a flare-stack hero, the plant receding into smog.' },
];

phase('Develop');
const SCHEMA = {
  type: 'object',
  properties: {
    slug: { type: 'string' },
    layouts: { type: 'array', items: { type: 'string' }, description: 'the distinct layout names you implemented' },
    rounds: { type: 'number' },
    variationCheck: { type: 'string', description: 'honest 1-2 sentences: do the 8 seeds read as genuinely different compositions now?' },
    selfScore: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['slug', 'layouts', 'rounds', 'variationCheck', 'selfScore', 'notes'],
};

const results = await parallel(DIRECTIONS.map((d) => () => agent(
`You are developing ONE existing generative-art engine for PriceOS (@opus4-8 halo shortlist). Project: ${d.name} (slug: ${d.slug}).

${MANDATE}

LAYOUT IDEAS for ${d.name} (implement at least 4 of these OR equally-distinct ones of your own — they must be structurally different pictures):
${d.layouts}

${CONTRACT}

${KIT_API}

${LOOP}

Your existing engine is tools/halo/gen/${d.slug}.js and its current render is tools/halo/out/gen/${d.slug}/_contact_${d.slug}.png — Read both before editing. Render command:
  node tools/halo/shoot.mjs tools/halo/gen/${d.slug}.js tools/halo/out/gen/${d.slug} ${d.slug} 1,2,3,4,5,6,7,8 340
Spend the effort — at least 3 render+look rounds, and do not stop until the 8 seeds are genuinely DIFFERENT compositions, all strong. Return your structured result.`,
  { label: `dev:${d.slug}`, phase: 'Develop', schema: SCHEMA, effort: 'high' },
).catch(() => null)));

return { developed: results.filter(Boolean) };
