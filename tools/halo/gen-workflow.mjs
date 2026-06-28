export const meta = {
  name: 'halo-generate-12',
  description: 'Generate 12 distinct semi-abstract surreal cyberpunk art engines for the @opus4-8 halo, each self-rendering and iterating until it clears the bar',
  phases: [{ title: 'Generate', detail: '12 generator agents, each writes + renders + iterates its own engine' }],
};

const KIT_API = `window.KIT helpers (already injected, do NOT redefine):
 rng(seed)->()=>float, pick(arr,r), rint(r,a,b), shuffle(arr,r), randn(r)[-2..2], clamp(v,a,b),
 h2r(hex)->[r,g,b], r2h([r,g,b]), mix(hexA,hexB,t), lum(hex), rgba(hex,alpha), hsl2hex(h,s,l),
 grain(ctx,W,H,amt,r), vignette(ctx,W,H,strength), mottle(ctx,x,y,w,h,col,density,r,blend),
 makeNoise(seed)->{noise2(x,y),fbm(x,y,oct,gain,lac)}  (fbm returns ~[-1,1]),
 bloom(ctx,cx,cy,rad,col,a0) additive glow, hazeSheet(ctx,W,H,noise,col,opacity,scale,blend) the signature volumetric haze,
 scanlines(ctx,W,H,gap,a), chromaSplit(ctx,W,H,offsetPx) chromatic aberration,
 iridescent(phase,sat,light), sheen(ctx,cx,cy,rad,col,a0), curl(noise,x,y,eps)->[dx,dy] flow field,
 softShadow(ctx,cx,cy,rad,a), chromeRamp(ctx,x0,y0,w,h,angle,baseHex), PHI, INVPHI.`;

const CONTRACT = `OUTPUT CONTRACT — write a single browser-side file at tools/halo/gen/<slug>.js that defines:
  window.ENGINE = {
    draw(cv, seed) {            // cv is a fresh <canvas>; YOU set cv.width & cv.height (use ~1240px on the long edge)
       const K = window.KIT; const r = K.rng(seed); const x = cv.getContext('2d');
       ... paint the full scene ...
       return { aspect: cv.width / cv.height };
    },
    traits(seed) { return { Palette: '<name>', /* 3-4 more trait axes */ }; }  // deterministic in seed
  };
Rules: pure function of seed (deterministic). No external assets, no fonts beyond monospace/sans. No window globals except window.ENGINE. Must run headless.`;

const BAR = `THE BAR (this is a HALO piece — the best on the platform; clear it):
 - A SCENE with real DEPTH: distinct foreground / midground / background, atmospheric perspective (far things hazier, desaturated, lower-contrast). NOT a flat dashboard, NOT a flat pattern, NOT centered-single-object.
 - BUSY & EPIC: dense, lots to look at, teeming — but composed, with a focal read.
 - HAZY & TEXTURED: use hazeSheet + bloom + grain + vignette generously. Layered fog. Nothing should look like clean vector flat-color.
 - SURREAL = real but OFF: the scene reads as a believable place/thing, then something is wrong/impossible (scale, gravity, repetition, a fused hybrid). NOT trippy, NOT psychedelic rainbow soup.
 - SEMI-ABSTRACT: legible as the scene at a glance, dissolving into abstract texture up close. Forms can be implied (silhouettes, light, blocks) rather than literally drawn.
 - SATURATED, BOLD COLOR inside your assigned palette family. Deep, rich grounds — avoid muddy grey unless intentional.
 - HIGH SEED VARIATION: across seeds the COMPOSITION must change (different layout, focal position, density, time-of-day within the family) — not just a recolor. Someone scrolling 8 seeds should feel variety.
 - Your project carries 4-6 internal COLORWAYS, all within your palette family (pick by seed). They vary mood but keep the project recognizable and DISTINCT from the other 11 worlds.
 - AVOID re-treading existing platform projects: literal neon city skyline (done), flat terminal/dashboard UI (done), coral reef (done), crystals/dendrites/chrome blobs (done), harmonograph, contour-map lines, fireworks. Your world must feel NEW.`;

const LOOP = `WORK LOOP (do NOT skip — blind generative code looks bad):
 1. Write tools/halo/gen/<slug>.js.
 2. Render: \`node tools/halo/shoot.mjs tools/halo/gen/<slug>.js tools/halo/out/gen/<slug> <slug> 1,2,3,4,5,6,7,8 340\`
 3. READ tools/halo/out/gen/<slug>/_contact_<slug>.png with the Read tool and look hard. Critique honestly vs THE BAR: depth? haze? busy? surreal? palette distinct & saturated? seed variety? any broken/empty/ugly frames?
 4. Fix the engine and re-render. Iterate at LEAST 3 full render+look rounds; keep going until you genuinely clear the bar. Kill empty/flat/broken frames.
 5. Final render must be clean across all 8 seeds.
Return ONLY when the contact sheet looks genuinely strong.`;

const DIRECTIONS = [
  { slug: 'interchange', name: 'INTERCHANGE',
    scene: 'A surreal transit cathedral: a vast vaulted interchange hall where maglev trains streak through as long-exposure light-ribbons between cathedral arches and hanging departure-glyph boards. Impossible scale, fog pooling in the nave, platforms receding into haze. Read it like a Turner painting of a station that never ends.',
    palette: 'WARM SODIUM DARK — sodium amber #ffb02e / oxblood #6e1326 / deep plum #1a0f2e ground, cream highlights. Lit like sodium-vapour lamps in fog.',
    archetype: 'one-point-perspective interior depth, arches receding to a vanishing point, light-streaks as the busy element',
    tech: 'Arches as nested darkening silhouettes for depth; train light-trails via additive bloom streaks with motion blur; hazeSheet amber low + vignette; floating board panels as small glyph blocks getting hazier with distance.' },
  { slug: 'monsoon', name: 'MONSOON',
    scene: 'A dense neon hill-town in a tropical monsoon downpour at night. Stacked buildings climbing a slope, every wet surface mirroring sign-light, rain as diagonal streaks, steam rising off rooftops, umbrellas as scattered light-dots in the streets. Surreal: the rain falls upward in one band, or the reflections show a different city.',
    palette: 'HOT WET NEON — magenta #ff2d9b / jade #18d08a / night-teal #06202a ground, with cyan and hot-pink sign glow. Saturated, rain-soaked.',
    archetype: 'vertical stacked wet skyline on a slope, reflections doubling the lower half',
    tech: 'Buildings as layered blocks climbing; diagonal rain streaks (alpha lines) over everything; wet reflection = vertically-flipped blurred copy of sign glow in foreground; bloom on every sign; steam via hazeSheet jade/teal.' },
  { slug: 'chloros', name: 'CHLOROS',
    scene: 'A derelict data-center reclaimed by a glowing jungle: server racks fused with overgrown vines, fiber-optic cables sprouting like roots, bioluminescent spores drifting, condensation mist. Surreal: the plants are clearly half-machine; cables grow leaves. A greenhouse that computes.',
    palette: 'ACID BOTANICAL — chartreuse #c6ff2e / hot magenta #ff2eb0 bloom / deep teal #07251f ground. Electric green dominant, magenta spore accents.',
    archetype: 'dense all-over interior field with a corridor of depth between rack-rows',
    tech: 'Rack silhouettes as vertical slabs in rows receding (hazier far); vines as curl-flow noise lines climbing slabs; spores = bloom dots drifting; volumetric chartreuse hazeSheet; magenta glints; heavy grain + condensation mottle.' },
  { slug: 'playa', name: 'PLAYA',
    scene: 'A cracked white salt-flat stretching to the horizon under twin suns, studded with monumental radio antennae and tilted monoliths casting impossibly long shadows. Mirage shimmer, dust haze, a lone figure-scale element for scale. Surreal: two suns, shadows pointing different ways, a monolith floating a few inches off the ground.',
    palette: 'BLEACHED DESERT FUTURE — bleached peach #ffd9a8 / alkaline mint #8fe0c8 / shadow indigo #2a2350. High-key, sun-blown, pale but saturated accents.',
    archetype: 'wide low horizon, lots of negative sky, sparse monumental verticals — minimal but detailed (the restraint piece)',
    tech: 'Salt ground = pale fbm with crack lines; long shadow gradients; antennae as thin dark verticals with guy-wires; mirage = horizontal wavy displacement band near horizon; twin sun blooms; dust hazeSheet peach. Keep it eerie-empty yet refined.' },
  { slug: 'cinder', name: 'CINDER',
    scene: 'A colossal molten foundry at night: pour-streams of glowing metal, ladles and gantry cranes in silhouette, a storm of embers rising into an aurora overhead. Surreal: the embers freeze mid-air into a constellation; the aurora bleeds into the molten pour. Heat, smoke, danger.',
    palette: 'INCANDESCENT vs AURORA — white-hot orange #ff7a18 / molten yellow-white #ffe7a8 / aurora green #38f5b0 / cold steel blue-black #0a1422 ground. Fire below, cold light above.',
    archetype: 'vertical: dark industrial silhouettes low, ember storm rising, aurora sky top',
    tech: 'Molten pours = bright additive vertical streaks with bloom; embers = thousands of glowing dots rising, hazier/cooler with height; crane silhouettes; aurora = soft vertical green/cyan hazeSheet curtains top; heavy smoke fbm; vignette.' },
  { slug: 'orbital', name: 'ORBITAL',
    scene: 'A teeming zero-gravity bazaar tumbling in orbit: hundreds of small market stalls, cargo pods, lantern-drones and banners drifting in a loose swarm over the bright limb of a planet below. Surreal: no up/down, stalls at every angle, a river of crowd-lights threading through. A floating souk in space.',
    palette: 'TROPICAL ORBIT — coral #ff5e5e / turquoise #2ee0d0 / cream-gold #ffe0a0, over a saturated planet-limb glow. Warm goods against cool space.',
    archetype: 'floating cluster/swarm over a curved planet horizon (the curve low or diagonal)',
    tech: 'Planet limb = big saturated gradient arc with atmosphere bloom at the edge; stalls = small tilted lit boxes scattered with depth-scaling; drones = bloom dots; banners = thin tilted strips; connecting light-threads; star grain; haze over the limb.' },
  { slug: 'pressroom', name: 'PRESSROOM',
    scene: 'A dense isometric metropolis printed as a mis-registered risograph: stacked buildings, overpasses, tiny figures — but the color layers are shifted off-register, halftone dots show, ink over-saturates and bleeds. Surreal: the misprint IS the world; a whole district is printed twice, ghosted.',
    palette: 'RISO FLUORO — fluoro pink #ff48a0 / riso blue #2a4bff / riso yellow #ffd21e, on warm bone #efe7d6 paper. Flat-bright inks, NOT hazy-dark — its texture is PRINT (halftone+grain+misregister), the odd one out on purpose.',
    archetype: 'dense isometric papercut city, all-over, slightly tilted',
    tech: 'Iso building blocks (parallelogram faces) in 3 ink layers each offset 3-8px (misregister); halftone = dot grid via small circles with size by value; multiply blend for ink overlap; paper grain; occasional double-printed ghost district. This one trades haze for PRINT texture — make it unmistakably a misprint.' },
  { slug: 'tideworks', name: 'TIDEWORKS',
    scene: 'A half-flooded oil refinery at dusk, the tide risen into the plant so towers, pipes, spheres and flare-stacks stand in a perfectly still mirror of floodwater. Surreal: the reflection is sharper than the real thing; a flare burns underwater. Industrial sublime, heavy dusk haze.',
    palette: 'PETROL DUSK — petrol cyan #1ec8c8 / rust orange #ff6a2a / bruised violet #3a1f5c sky / near-black water. Cyan structures, orange flares, violet sky.',
    archetype: 'horizon split mid-frame: structures above, mirror reflection below',
    tech: 'Refinery = layered pipe/tower/sphere silhouettes on the horizon line; reflection = flipped, slightly blurred + rippled copy below; flare stacks = orange bloom plumes (and one inverted underwater); dusk hazeSheet violet→cyan; star/dust grain; mist at the waterline.' },
  { slug: 'concourse', name: 'CONCOURSE',
    scene: 'An airport concourse floating in an endless cloud sea at golden hour: departure gates, jet-bridges and glass walls perched on a cloud-island, contrails crisscrossing, god-rays through fog, a flock of craft. Surreal: the runway just ends in sky; gates open onto clouds; a plane parked at the gate is the size of a moth.',
    palette: 'GOLDEN CLOUDPORT — peach-gold #ffcf7a / sky cyan #6fd6ff / soft lavender #b9a6e8, luminous and high-key. Warm light, cool shadows, dreamy.',
    archetype: 'soft mid-horizon, architecture mid-ground on a cloud plateau, deep sky',
    tech: 'Cloud sea = layered fbm in peach/lavender with god-ray light shafts; concourse = pale glass-and-girder structure mid-frame, hazy; contrails = thin fading arcs; craft = small silhouettes/bloom; lots of atmosphere, gentle bloom, soft grain. The serene one.' },
  { slug: 'parallax', name: 'PARALLAX',
    scene: 'A foggy hillside array of radio telescopes at night, all tilted skyward, with a luminous star-map / constellation diagram projected as a translucent overlay across the whole frame — register lines, coordinate grids, labelled points. Surreal: the dishes listen to a sky that is clearly a diagram, not real stars; constellations connect into a face.',
    palette: 'OBSERVATORY UV — ultraviolet purple #8a3cff / electric cyan #2ee6ff / gold star-points #ffd86b on near-black violet #0b0820. Deep night, glowing line-work.',
    archetype: 'radial/overlay: a real foggy scene UNDER a glowing technical star-chart overlay',
    tech: 'Hill + dish silhouettes low, fog hazeSheet between them; overlay = thin cyan/gold constellation lines + grid + small labelled nodes drawn over the top with screen blend, fading where fog is thick; a central radial coordinate rose; bloom on bright nodes; grain. Two layers fighting: real fog vs diagram.' },
  { slug: 'orderbook', name: 'ORDERBOOK',
    scene: 'A deep eroded canyon whose rock strata ARE frozen market data — layered bands of price-ladders, candlestick columns and order-book depth turned to sandstone geology, weathered and wind-carved, hazy sun-shafts in the gorge. Surreal: the canyon is literally made of charts; a river of glowing ticker runs at the bottom. On-brand for a price platform.',
    palette: 'CANYON DATA — terracotta #d2693c / cyan #2ec8e0 vein / chartreuse #b6e028 band / dusty violet #4a2f4a shadow. Warm rock, cool data veins.',
    archetype: 'cross-section strata — horizontal data-geology bands with a canyon gorge cut through',
    tech: 'Horizontal strata bands of varying height/color; within bands, embed candlestick/ladder micro-texture eroded by fbm displacement; carve a gorge (dark V) with sun-shaft haze; glowing ticker river at base; dust haze; grain. Reads as both canyon and chart.' },
  { slug: 'topiary', name: 'TOPIARY',
    scene: 'A formal night garden where the hedges are grown into glowing circuit-board topiary: trimmed geometric forms threaded with light-traces, light-fountains spraying particles, drone-fireflies, gravel paths receding, low mist. Surreal: the hedges are clearly PCB-green circuitry grown organic; a fountain sprays upward light that falls as data.',
    palette: 'GARDEN CIRCUIT NIGHT — deep emerald #0f7a4a / electric blue #2a6bff trace / hot amber #ffb02e lights / near-black green ground. Lush dark with electric accents.',
    archetype: 'ground-level garden depth — symmetrical paths receding, topiary forms flanking',
    tech: 'Topiary = rounded hedge blobs filled with circuit-trace line-work + glowing nodes; symmetrical path receding to center (depth, hazier far); light-fountains = upward bloom particle sprays; fireflies = drifting amber bloom dots; low mist hazeSheet emerald; vignette. Lush + electric.' },
];

phase('Generate');

const SCHEMA = {
  type: 'object',
  properties: {
    slug: { type: 'string' },
    name: { type: 'string' },
    file: { type: 'string' },
    paletteName: { type: 'string' },
    colorways: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, bg: { type: 'string' } }, required: ['name', 'bg'] } },
    rounds: { type: 'number', description: 'how many render+look iterations you actually ran' },
    selfScore: { type: 'number', description: '1-10 honest score of the final contact sheet vs THE BAR' },
    notes: { type: 'string', description: '2-3 sentences: what it looks like + what is strongest/weakest' },
  },
  required: ['slug', 'name', 'file', 'paletteName', 'colorways', 'rounds', 'selfScore', 'notes'],
};

const results = await parallel(DIRECTIONS.map((d) => () => agent(
`You are a generative-art director building ONE engine for PriceOS — a web3 generative-art platform. This is for @opus4-8's HALO project (the best piece on the site). Your direction:

# ${d.name}  (slug: ${d.slug})
SCENE: ${d.scene}
PALETTE: ${d.palette}
COMPOSITION ARCHETYPE: ${d.archetype}
TECHNIQUE HINTS: ${d.tech}

${BAR}

${CONTRACT}

${KIT_API}

${LOOP}

Render command (run it with Bash from repo root /home/user/PriceOS):
  node tools/halo/shoot.mjs tools/halo/gen/${d.slug}.js tools/halo/out/gen/${d.slug} ${d.slug} 1,2,3,4,5,6,7,8 340
Then Read tools/halo/out/gen/${d.slug}/_contact_${d.slug}.png and iterate.

Make it genuinely beautiful and distinct. Spend the effort — at least 3 render+look rounds. When done, return your structured result.`,
  { label: `gen:${d.slug}`, phase: 'Generate', schema: SCHEMA, effort: 'high' },
).catch(() => null)));

return { generated: results.filter(Boolean) };
