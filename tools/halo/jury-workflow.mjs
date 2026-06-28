export const meta = {
  name: 'halo-jury-tournament',
  description: 'NHL-style bracket: a multi-layer jury seeds 12 halo candidates then runs head-to-head matchups (play-in, quarters, semis, final) to crown a winner',
  phases: [
    { title: 'Seed', detail: '3 judges rank all 12' },
    { title: 'Play-in', detail: 'seeds 5-12, 4 matchups' },
    { title: 'Quarters', detail: '8 to 4' },
    { title: 'Semis', detail: '4 to 2' },
    { title: 'Final', detail: '2 to 1' },
  ],
};

const CANDS = [
  { slug: 'interchange', name: 'INTERCHANGE', pal: 'warm sodium / oxblood / plum' },
  { slug: 'monsoon', name: 'MONSOON', pal: 'hot magenta / jade / night-teal' },
  { slug: 'chloros', name: 'CHLOROS', pal: 'acid chartreuse / magenta / deep teal' },
  { slug: 'playa', name: 'PLAYA', pal: 'bleached peach / alkaline mint / indigo' },
  { slug: 'cinder', name: 'CINDER', pal: 'incandescent orange / aurora green / cold blue' },
  { slug: 'orbital', name: 'ORBITAL', pal: 'coral / turquoise / cream-gold' },
  { slug: 'pressroom', name: 'PRESSROOM', pal: 'riso fluoro pink / blue / yellow on bone' },
  { slug: 'tideworks', name: 'TIDEWORKS', pal: 'petrol cyan / rust orange / violet' },
  { slug: 'concourse', name: 'CONCOURSE', pal: 'peach-gold / sky cyan / lavender' },
  { slug: 'parallax', name: 'PARALLAX', pal: 'ultraviolet / cyan / gold on near-black violet' },
  { slug: 'orderbook', name: 'ORDERBOOK', pal: 'terracotta / cyan / chartreuse data-bands' },
  { slug: 'topiary', name: 'TOPIARY', pal: 'deep emerald / electric blue / hot amber' },
];
const PATH = (s) => `/home/user/PriceOS/tools/halo/out/gen/${s}/_contact_${s}.png`;
const byp = {}; CANDS.forEach((c) => (byp[c.slug] = c));

const BRIEF = `JUDGING BRIEF — this is the platform's HALO project: the single best, most wow generative-art piece on a web3 art platform that prizes SATURATED BOLD COLOUR and busy epic imagery. Score against ALL of:
 1. COLOUR — saturated, bold, and a DISTINCT palette world (the cardinal rule: it must NOT look like the other candidates from across the room).
 2. SCENE — busy, epic, teeming, with real depth (foreground/midground/background, atmospheric perspective). Not flat, not empty.
 3. SURREAL — reads as a believable place/thing but something is off/impossible (not trippy/psychedelic — "real but wrong").
 4. CRAFT — hazy, textured, cool, unique; nothing looks like clean flat vector.
 5. VARIETY — across the 8 seeds the composition genuinely changes (not just recolour).
 6. WOW — would this stop a collector scrolling and read as the BEST piece on the site.
Each candidate's image is an 8-seed contact sheet. Judge the WORK you SEE, not the description.`;

phase('Seed');

const SEED_SCHEMA = {
  type: 'object',
  properties: {
    rankings: {
      type: 'array',
      items: {
        type: 'object',
        properties: { slug: { type: 'string' }, score: { type: 'number' }, note: { type: 'string' } },
        required: ['slug', 'score', 'note'],
      },
    },
  },
  required: ['rankings'],
};

const seedList = CANDS.map((c) => `- ${c.slug} (${c.name}): Read ${PATH(c.slug)}`).join('\n');
const SEED_LENSES = [
  'You weight COLOUR distinctness + saturation + WOW most heavily.',
  'You weight SCENE depth + busyness + craft/haze most heavily.',
  'You weight SURREAL concept + originality + seed variety most heavily.',
];
const seeders = await parallel(SEED_LENSES.map((lens, i) => () => agent(
`You are halo jury seed-judge #${i + 1}. ${lens}

${BRIEF}

Read ALL twelve contact sheets (use the Read tool on each path), then score every candidate 0-10 (one decimal ok) and give a one-line note. Be discriminating — spread the scores, do not bunch them.
Candidates:
${seedList}

Return rankings for all 12.`,
  { label: `seed:judge${i + 1}`, phase: 'Seed', schema: SEED_SCHEMA, effort: 'high' },
).catch(() => null)));

// average the seed scores
const agg = {};
CANDS.forEach((c) => (agg[c.slug] = []));
seeders.filter(Boolean).forEach((s) => s.rankings.forEach((r) => { if (agg[r.slug]) agg[r.slug].push(r.score); }));
const seeded = CANDS.map((c) => ({
  slug: c.slug,
  avg: agg[c.slug].length ? agg[c.slug].reduce((a, b) => a + b, 0) / agg[c.slug].length : 0,
})).sort((a, b) => b.avg - a.avg);
const seeds = seeded.map((s, i) => ({ ...s, seed: i + 1 }));
log(`Seeding complete: ${seeds.map((s) => `${s.seed}.${s.slug}(${s.avg.toFixed(1)})`).join('  ')}`);

const MATCH_SCHEMA = {
  type: 'object',
  properties: { winner: { type: 'string' }, reason: { type: 'string' } },
  required: ['winner', 'reason'],
};
const MATCH_LENSES = [
  'COLOUR & palette distinctness + saturation',
  'COMPOSITION, depth, busyness & craft',
  'SURREAL concept, originality & seed variety',
];

// run one head-to-head matchup → returns the winning slug
async function matchup(aSlug, bSlug, phaseName, tag) {
  const a = byp[aSlug], b = byp[bSlug];
  const votes = await parallel(MATCH_LENSES.map((lens, i) => () => agent(
`You are a halo tournament juror. Your lens: ${lens}.

${BRIEF}

HEAD-TO-HEAD. Read BOTH contact sheets, then pick the ONE that better deserves to be the platform halo, judged through your lens (but the overall brief still applies):
 A = ${a.name} (${a.slug}, palette: ${a.pal}) — Read ${PATH(a.slug)}
 B = ${b.name} (${b.slug}, palette: ${b.pal}) — Read ${PATH(b.slug)}

Return winner as EXACTLY "${a.slug}" or "${b.slug}" and a one-sentence reason.`,
    { label: `${tag}:${a.slug}-v-${b.slug}:j${i + 1}`, phase: phaseName, schema: MATCH_SCHEMA, effort: 'high' },
  ).catch(() => null)));
  let av = 0, bv = 0;
  votes.filter(Boolean).forEach((v) => { if (v.winner === aSlug) av++; else if (v.winner === bSlug) bv++; });
  const winner = av >= bv ? aSlug : bSlug;
  log(`${tag}: ${a.name} ${av}–${bv} ${b.name}  → ${byp[winner].name}`);
  return { winner, aSlug, bSlug, av, bv };
}

const S = (n) => seeds[n - 1].slug; // slug of seed n

phase('Play-in');
// seeds 5-12 play in: 5v12, 6v11, 7v10, 8v9
const playin = await parallel([[5, 12], [6, 11], [7, 10], [8, 9]].map(([h, l]) =>
  () => matchup(S(h), S(l), 'Play-in', `PI ${h}v${l}`)));
const pw = playin.map((m) => m.winner); // winners of the 4 play-ins (in seed order 5..8 bracket)

phase('Quarters');
// 1 vs winner(8v9), 2 vs winner(7v10), 3 vs winner(6v11), 4 vs winner(5v12)
const qf = await parallel([
  () => matchup(S(1), pw[3], 'Quarters', 'QF1'),
  () => matchup(S(2), pw[2], 'Quarters', 'QF2'),
  () => matchup(S(3), pw[1], 'Quarters', 'QF3'),
  () => matchup(S(4), pw[0], 'Quarters', 'QF4'),
]);
const qw = qf.map((m) => m.winner);

phase('Semis');
const sf = await parallel([
  () => matchup(qw[0], qw[3], 'Semis', 'SF1'),
  () => matchup(qw[1], qw[2], 'Semis', 'SF2'),
]);
const sw = sf.map((m) => m.winner);

phase('Final');
const final = await matchup(sw[0], sw[1], 'Final', 'FINAL');

return {
  seeds: seeds.map((s) => ({ seed: s.seed, slug: s.slug, avg: +s.avg.toFixed(2) })),
  playin: playin.map((m) => ({ a: m.aSlug, b: m.bSlug, score: `${m.av}-${m.bv}`, winner: m.winner })),
  quarters: qf.map((m) => ({ a: m.aSlug, b: m.bSlug, score: `${m.av}-${m.bv}`, winner: m.winner })),
  semis: sf.map((m) => ({ a: m.aSlug, b: m.bSlug, score: `${m.av}-${m.bv}`, winner: m.winner })),
  final: { a: final.aSlug, b: final.bSlug, score: `${final.av}-${final.bv}`, winner: final.winner },
  champion: final.winner,
};
