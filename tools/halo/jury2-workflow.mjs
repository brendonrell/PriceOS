export const meta = {
  name: 'halo-jury-v2-noncity',
  description: 'Re-judge the halo among NON-cityscape candidates only (Arcology already owns the cyberpunk city); reward abstract/semi-abstract + surreal + novelty vs the existing catalogue',
  phases: [
    { title: 'Seed', detail: '3 judges rank the 10 eligible' },
    { title: 'Semis', detail: 'top 4 → 2' },
    { title: 'Final', detail: '2 → 1' },
  ],
};

// non-cityscape field only (monsoon + pressroom excluded — they double Arcology)
const CANDS = [
  { slug: 'playa', name: 'PLAYA', pal: 'bleached peach / alkaline mint / indigo', desc: 'surreal salt-flat with monumental antennae, twin suns, mirage' },
  { slug: 'chloros', name: 'CHLOROS', pal: 'acid chartreuse / magenta / deep teal', desc: 'overgrown data-greenhouse, glowing spores, mist' },
  { slug: 'cinder', name: 'CINDER', pal: 'incandescent orange / aurora green / cold blue', desc: 'molten foundry under an aurora, ember storm' },
  { slug: 'orbital', name: 'ORBITAL', pal: 'coral / turquoise / cream-gold', desc: 'zero-g floating bazaar over a planet limb' },
  { slug: 'tideworks', name: 'TIDEWORKS', pal: 'petrol cyan / rust orange / violet', desc: 'half-flooded refinery, mirror reflections, flares' },
  { slug: 'parallax', name: 'PARALLAX', pal: 'ultraviolet / cyan / gold on near-black violet', desc: 'radio telescopes under a projected star-chart overlay' },
  { slug: 'orderbook', name: 'ORDERBOOK', pal: 'terracotta / cyan / chartreuse data-bands', desc: 'canyon whose strata are market data turned geology' },
  { slug: 'topiary', name: 'TOPIARY', pal: 'deep emerald / electric blue / hot amber', desc: 'night garden of circuit-hedge topiary, light-fountains' },
  { slug: 'concourse', name: 'CONCOURSE', pal: 'peach-gold / sky cyan / lavender', desc: 'glass terminal floating in a cloud sea, god-rays' },
  { slug: 'interchange', name: 'INTERCHANGE', pal: 'warm sodium / oxblood / plum', desc: 'transit cathedral, light-trains through fog arches' },
];
const PATH = (s) => `/home/user/PriceOS/tools/halo/out/gen/${s}/_contact_${s}.png`;
const byp = {}; CANDS.forEach((c) => (byp[c.slug] = c));

const EXISTING = `EXISTING projects already on the platform (the halo must NOT resemble any of these — novelty is mandatory):
 - ARCOLOGY: a hazy cyberpunk CITY / megastructure skyline at night. => ANY candidate that reads as a city skyline, building cluster, or megastructure is DISQUALIFIED.
 - Carnivale: night festival / fireworks.  - Leviathan: coral reef / undersea.  - Empyrean: fantasy world/citadel.
 - Electrum & Quicksilver: chrome / crystal / metallic dendrites.  - Terminal Network: terminal/dashboard screens.
 - Boreal: aurora landscape.  - Cultivar: botanical line-work.  - Pendula: harmonograph.  - Test Pattern: broadcast grid.`;

const BRIEF = `JUDGING BRIEF — pick the platform HALO (the single best, most wow generative piece). The platform prizes SATURATED BOLD COLOUR and busy, atmospheric imagery. Brendon's steer for THIS halo, in priority order:
 1. NOVELTY — it must add something NEW. ${'' /* */}Disqualify anything that resembles an existing project (esp. a city skyline = Arcology). This overrides a high score on everything else.
 2. SURREAL — "real but off": a believable place/thing with something impossible about it (NOT trippy/psychedelic).
 3. ABSTRACT / SEMI-ABSTRACT — favoured over the literal/representational; reads as the scene at a glance, dissolves into texture up close.
 4. COLOUR — saturated, bold, a DISTINCT palette world.
 5. SCENE + CRAFT — depth, atmosphere, haze/texture; busy is good but NOT at the cost of 1–3.
 6. FUTURE-EVOKING — cyberpunk-adjacent is fine, but NOT literal/outrun and NOT another neon city.
${EXISTING}
Each candidate's image is an 8-seed contact sheet. Judge the WORK you SEE.`;

phase('Seed');
const SEED_SCHEMA = {
  type: 'object',
  properties: {
    rankings: { type: 'array', items: { type: 'object', properties: { slug: { type: 'string' }, score: { type: 'number' }, dq: { type: 'boolean' }, note: { type: 'string' } }, required: ['slug', 'score', 'dq', 'note'] } },
  },
  required: ['rankings'],
};
const seedList = CANDS.map((c) => `- ${c.slug} (${c.name}, ${c.desc}): Read ${PATH(c.slug)}`).join('\n');
const SEED_LENSES = [
  'You weight NOVELTY + surreal most heavily — punish anything derivative or city-like hard.',
  'You weight ABSTRACT/semi-abstract quality + colour distinctness most heavily.',
  'You weight overall WOW + craft + future-evoking mood most heavily.',
];
const seeders = await parallel(SEED_LENSES.map((lens, i) => () => agent(
`You are halo re-judge #${i + 1}. ${lens}

${BRIEF}

Read ALL ten contact sheets, then score each 0-10 and set dq=true for any that read as a city skyline / building cluster (Arcology's territory) or clearly duplicate an existing project. Spread the scores.
Candidates:
${seedList}

Return rankings for all 10.`,
  { label: `seed:judge${i + 1}`, phase: 'Seed', schema: SEED_SCHEMA, effort: 'high' },
).catch(() => null)));

const agg = {}; CANDS.forEach((c) => (agg[c.slug] = { s: [], dq: 0 }));
seeders.filter(Boolean).forEach((s) => s.rankings.forEach((r) => { if (agg[r.slug]) { agg[r.slug].s.push(r.dq ? 0 : r.score); if (r.dq) agg[r.slug].dq++; } }));
const seeded = CANDS.map((c) => ({
  slug: c.slug,
  avg: agg[c.slug].s.length ? agg[c.slug].s.reduce((a, b) => a + b, 0) / agg[c.slug].s.length : 0,
  dq: agg[c.slug].dq,
})).sort((a, b) => b.avg - a.avg);
log(`Re-seed: ${seeded.map((s) => `${s.slug}(${s.avg.toFixed(1)}${s.dq ? ' DQ' + s.dq : ''})`).join('  ')}`);
const top4 = seeded.slice(0, 4);

const MATCH_SCHEMA = { type: 'object', properties: { winner: { type: 'string' }, reason: { type: 'string' } }, required: ['winner', 'reason'] };
const MATCH_LENSES = ['NOVELTY + surreal', 'ABSTRACT quality + colour', 'WOW + craft + future mood'];
async function matchup(aSlug, bSlug, phaseName, tag) {
  const a = byp[aSlug], b = byp[bSlug];
  const votes = await parallel(MATCH_LENSES.map((lens, i) => () => agent(
`You are a halo juror. Lens: ${lens}.

${BRIEF}

HEAD-TO-HEAD. Read BOTH sheets, pick the ONE that better deserves to be the platform halo:
 A = ${a.name} (${a.slug}, ${a.desc}) — Read ${PATH(a.slug)}
 B = ${b.name} (${b.slug}, ${b.desc}) — Read ${PATH(b.slug)}
Return winner EXACTLY "${a.slug}" or "${b.slug}" + a one-sentence reason.`,
    { label: `${tag}:${a.slug}-v-${b.slug}:j${i + 1}`, phase: phaseName, schema: MATCH_SCHEMA, effort: 'high' },
  ).catch(() => null)));
  let av = 0, bv = 0;
  votes.filter(Boolean).forEach((v) => { if (v.winner === aSlug) av++; else if (v.winner === bSlug) bv++; });
  const winner = av >= bv ? aSlug : bSlug;
  log(`${tag}: ${a.name} ${av}–${bv} ${b.name} → ${byp[winner].name}`);
  return { winner, aSlug, bSlug, av, bv };
}

phase('Semis');
const sf = await parallel([
  () => matchup(top4[0].slug, top4[3].slug, 'Semis', 'SF1'),
  () => matchup(top4[1].slug, top4[2].slug, 'Semis', 'SF2'),
]);
const sw = sf.map((m) => m.winner);

phase('Final');
const final = await matchup(sw[0], sw[1], 'Final', 'FINAL');

return {
  seeds: seeded.map((s, i) => ({ rank: i + 1, slug: s.slug, avg: +s.avg.toFixed(2), dq: s.dq })),
  semis: sf.map((m) => ({ a: m.aSlug, b: m.bSlug, score: `${m.av}-${m.bv}`, winner: m.winner })),
  final: { a: final.aSlug, b: final.bSlug, score: `${final.av}-${final.bv}`, winner: final.winner },
  champion: final.winner,
};
