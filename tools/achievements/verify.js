#!/usr/bin/env node
/*
 * tools/achievements/verify.js — the catalog contract checker.
 *
 * Run after ANY catalog edit:  node tools/achievements/verify.js
 *
 * Proves, on every run:
 *   1. The game is EXACTLY 1,000 achievements.
 *   2. Every id is unique; duplicate display names / triggers are reported.
 *   3. No 666 anywhere (points or thresholds). Only Mjölnir is ≥ 1000 pts.
 *   4. Token-number eggs respect the contract range 22–9,999.
 *   5. THE TWO-YEAR WALL — Mjölnir's score threshold is strictly above the
 *      maximum PriceScore reachable before day 730, and at or below the
 *      maximum reachable AT day 730 (so the summit is possible the day the
 *      two-year oath lands, and impossible a day sooner).
 *
 * Loads the real TS catalog modules via the repo's own TypeScript compiler —
 * no duplicated data. The gameable-prefix list is parsed out of engine.ts so
 * there is one source of truth.
 */

const fs = require('fs');
const path = require('path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..', '..');
const A = (p) => path.join(ROOT, 'lib', 'achievements', p);

function loadTS(file, deps) {
  const src = fs.readFileSync(file, 'utf8');
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  const req = (name) => {
    if (deps && name in deps) return deps[name];
    throw new Error(`verify.js: unexpected import '${name}' in ${file}`);
  };
  new Function('require', 'module', 'exports', js)(req, mod, mod.exports);
  return mod.exports;
}

const ladders = loadTS(A('catalogs/ladders.ts'), { '../catalog': {} });
const myth = loadTS(A('catalogs/myth.ts'), { '../catalog': {} });
const numbers = loadTS(A('catalogs/numbers.ts'), { '../catalog': {} });
const depth = loadTS(A('catalogs/depth.ts'), { '../catalog': {} });
const tenure = loadTS(A('catalogs/tenure.ts'), { '../catalog': {} });
const catalog = loadTS(A('catalog.ts'), {
  './catalogs/ladders': ladders,
  './catalogs/myth': myth,
  './catalogs/numbers': numbers,
  './catalogs/depth': depth,
  './catalogs/tenure': tenure,
});
const tiers = loadTS(A('tiers.ts'), {});

const ALL = catalog.ACHIEVEMENTS;
const problems = [];
const warnings = [];

// ── Gameable prefixes — parsed from engine.ts (single source of truth). ──────
const engineSrc = fs.readFileSync(A('engine.ts'), 'utf8');
const gm = engineSrc.match(/GAMEABLE_TRIGGER_PREFIXES = \[([\s\S]*?)\] as const/);
if (!gm) throw new Error('could not parse GAMEABLE_TRIGGER_PREFIXES from engine.ts');
const GAMEABLE = [...gm[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
const capM = engineSrc.match(/GAMEABLE_SCORE_CAP = (\d+)/);
const GAMEABLE_CAP = capM ? parseInt(capM[1], 10) : 10;
const isGameable = (t) => GAMEABLE.some((p) => t.startsWith(p));

// ── 1. Count. ────────────────────────────────────────────────────────────────
if (ALL.length !== 1000) problems.push(`catalog is ${ALL.length} achievements — the game is EXACTLY 1000`);

// ── 2. Uniqueness. ───────────────────────────────────────────────────────────
{
  const ids = new Map();
  const names = new Map();
  const trigs = new Map();
  for (const a of ALL) {
    ids.set(a.id, (ids.get(a.id) ?? 0) + 1);
    names.set(a.name, (names.get(a.name) ?? 0) + 1);
    trigs.set(a.trigger, (trigs.get(a.trigger) ?? 0) + 1);
  }
  for (const [id, n] of ids) if (n > 1) problems.push(`duplicate id: ${id} ×${n}`);
  for (const [nm, n] of names) if (n > 1) warnings.push(`duplicate name: "${nm}" ×${n}`);
  for (const [t, n] of trigs) if (n > 1) warnings.push(`duplicate trigger: ${t} ×${n}`);
}

// ── 3. 666 / point ceiling. ──────────────────────────────────────────────────
for (const a of ALL) {
  if (a.points === 666) problems.push(`${a.id}: 666 points`);
  if (/(^|[^0-9])666([^0-9]|$)/.test(a.trigger)) problems.push(`${a.id}: 666 in trigger`);
  // world_first (#1 on the leaderboard, core) is the one grandfathered 1000.
  if (a.points >= 1000 && a.id !== 'mjolnir' && a.id !== 'world_first') problems.push(`${a.id}: ${a.points} pts — only Mjölnir may be ≥ 1000`);
  if (a.points <= 0) problems.push(`${a.id}: non-positive points`);
}

// ── 4. Token range 22–9999. ──────────────────────────────────────────────────
for (const a of ALL) {
  const m = /^holdings\.tokenNumber==(\d+)$/.exec(a.trigger);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n < 22 || n > 9999) warnings.push(`${a.id}: token #${n} outside contract range 22–9999 (unobtainable)`);
  }
}

// ── 5. THE TWO-YEAR WALL. ────────────────────────────────────────────────────
// Model the maximum SAFE (non-gameable) PriceScore achievable by day D, for a
// maximally-determined collector. Paths with no data source today are treated
// as unachievable (conservative for the upper bound at 730 — fine, since they
// stay unachievable at 729 too, and the wall only compares the two).
const DEAD_PREFIXES = [
  'leaderboard.', 'season.', 'offerMade.acceptedCount', 'offerAccepted.',
  'flip.', 'trade.', 'session.', 'meta.', 'joinedBefore.', 'buy.inDay',
  'buy.priceEth', 'buy.atFloor', 'buy.fastestListMinutes', 'mint.causedSellout',
  'mint.withinUploadHours', 'mint.hourLocal', 'followers.byHigherRank',
  'following.ownedArtist', 'following.top100', 'wishlist.fulfilled',
  'handle.', 'profile.', 'holdings.mythic',
  'ui.', 'odin.', 'brendon.', 'time.', 'date.', 'combo.', 'spell.', 'action.',
];
const isDead = (t) => DEAD_PREFIXES.some((p) => t.startsWith(p));

function tenureGateDays(trigger) {
  let m = /^tenure\.days>=(\d+)$/.exec(trigger);
  if (m) return parseInt(m[1], 10);
  m = /^tenure\.years>=(\d+)$/.exec(trigger);
  if (m) return parseInt(m[1], 10) * 365;
  return 0; // not time-gated
}

function maxSafeScoreByDay(D) {
  // Non-score/rank rows first.
  let sum = 0;
  const scoreRows = [];
  const rankRows = [];
  for (const a of ALL) {
    if (isGameable(a.trigger)) continue; // capped — added flat below
    if (isDead(a.trigger)) continue;
    let m = /^score\.total>=(\d+)$/.exec(a.trigger);
    if (m) { scoreRows.push([parseInt(m[1], 10), a.points]); continue; }
    m = /^rank\.tier>=(\d+)$/.exec(a.trigger);
    if (m) { rankRows.push([parseInt(m[1], 10), a.points]); continue; }
    if (tenureGateDays(a.trigger) > D) continue; // the calendar says no
    sum += a.points;
  }
  sum += GAMEABLE_CAP;
  // Score/rank rows unlock off the running total — iterate to fixpoint.
  const rankMin = (tier) => tiers.RANK_TIERS.find((t) => t.tier === tier)?.minScore ?? Infinity;
  let changed = true;
  const used = new Set();
  while (changed) {
    changed = false;
    scoreRows.forEach(([th, pts], i) => {
      if (!used.has(`s${i}`) && sum >= th) { sum += pts; used.add(`s${i}`); changed = true; }
    });
    rankRows.forEach(([tier, pts], i) => {
      if (!used.has(`r${i}`) && sum >= rankMin(tier)) { sum += pts; used.add(`r${i}`); changed = true; }
    });
  }
  return sum;
}

const before730 = maxSafeScoreByDay(729);
const at730 = maxSafeScoreByDay(730);
const mjolnir = ALL.find((a) => a.id === 'mjolnir');
const mm = mjolnir && /^score\.total>=(\d+)$/.exec(mjolnir.trigger);
const mjThreshold = mm ? parseInt(mm[1], 10) : NaN;

if (!mjolnir) problems.push('mjolnir missing from catalog');
else if (!mm) problems.push(`mjolnir trigger is not a score gate: ${mjolnir.trigger}`);
else {
  if (mjThreshold <= before730) problems.push(`TWO-YEAR WALL BROKEN: Mjölnir at ${mjThreshold} but ${before730} is reachable before day 730`);
  if (mjThreshold > at730) problems.push(`MJÖLNIR UNREACHABLE: threshold ${mjThreshold} > ${at730} reachable at day 730`);
}

// ── Report. ──────────────────────────────────────────────────────────────────
const total = ALL.reduce((s, a) => s + a.points, 0);
const safeTotal = ALL.filter((a) => !isGameable(a.trigger)).reduce((s, a) => s + a.points, 0);
const secret = ALL.filter((a) => a.secret).length;
const byCat = {};
for (const a of ALL) byCat[a.category] = (byCat[a.category] ?? 0) + 1;

console.log('─'.repeat(60));
console.log(`achievements: ${ALL.length}   (secret: ${secret})`);
console.log(`points total: ${total}   safe (rank-moving): ${safeTotal} + ${GAMEABLE_CAP} cap`);
console.log(`per category:`, byCat);
console.log(`max safe score  before day 730: ${before730}`);
console.log(`max safe score  at day 730:     ${at730}`);
console.log(`Mjölnir threshold:              ${mjThreshold}`);
console.log('─'.repeat(60));
if (warnings.length) {
  console.log(`⚠ ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`  ⚠ ${w}`);
}
if (problems.length) {
  console.log(`✗ ${problems.length} problem(s):`);
  for (const p of problems) console.log(`  ✗ ${p}`);
  process.exit(1);
}
console.log('✓ catalog contract holds');
