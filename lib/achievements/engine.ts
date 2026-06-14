/**
 * ════════════════════════════════════════════════════════════════════════
 *  PriceOS — ACHIEVEMENTS ENGINE  (server-side, generic, catalog-driven)
 * ════════════════════════════════════════════════════════════════════════
 *
 * THE WHOLE POINT: this engine evaluates an arbitrarily large catalog with
 * NO per-achievement code. A new catalog row that uses an existing trigger
 * path needs ZERO engine changes. The engine knows about trigger *grammar*
 * (a flat `path OP num` DSL + a handful of named specials), never about
 * individual achievements.
 *
 * HOW IT WORKS
 *   1. buildFootprint() — ONE bounded batch of reads against Supabase that
 *      summarises everything the catalog could ask about a user into a flat,
 *      numeric "footprint" (plus the set of token numbers they hold). No N+1:
 *      adding catalog rows never adds a query.
 *   2. evalTrigger() — parses each trigger string and answers true/false
 *      against the footprint. Numeric comparisons (`path OP num`) cover every
 *      ladder/counter/eth/rank/streak trigger generically. A small set of
 *      named specials (token-number membership, math properties, oil.rider,
 *      anoint specials, meta.*) handle the non-numeric conditions.
 *   3. evaluateFootprint() — runs every catalog trigger, unions with the
 *      already-unlocked set (unlocks are permanent), returns the satisfied set.
 *   4. persistEvaluation() — the write path: evaluate, INSERT newly-unlocked
 *      rows, recompute price_score + price_rank, UPDATE the user. Idempotent.
 *
 * CLIENT-GRANTED triggers (ui. / odin. / brendon. / time. / date. / combo. /
 * spell. / action.) are NEVER satisfied by evalTrigger — they're detected in
 * the browser and unlocked only via the evaluate route's clientGrants
 * whitelist (CLIENT_GRANTABLE, exported below).
 *
 * Unknown or unparseable triggers return false and never throw — the catalog
 * is allowed to hold aspirational eggs with no data source yet.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase';
import {
  ACHIEVEMENTS,
  ACHIEVEMENTS_BY_ID,
  type Achievement,
  type AchievementCategory,
} from './catalog';
import { LADDER_ACHIEVEMENTS } from './catalogs/ladders';
import { scoreToRank } from './tiers';
import { projectLevel } from '@/lib/anoint/levels';

type SB = SupabaseClient<Database>;

// ─────────────────────────────────────────────────────────────────────────────
// The full evaluated catalog. The core catalog plus the ladder catalog — the
// engine evaluates BOTH so the long-climb ladders unlock too. catalog.ts is the
// canonical merge point for the UI; until that wiring lands we union here so the
// engine is complete on its own. Deduped by id (core wins on collision; ids are
// designed not to collide — ladders are `l_`-prefixed).
// ─────────────────────────────────────────────────────────────────────────────
export const ALL_ACHIEVEMENTS: readonly Achievement[] = (() => {
  const seen = new Set<string>();
  const merged: Achievement[] = [];
  for (const a of [...ACHIEVEMENTS, ...LADDER_ACHIEVEMENTS]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    merged.push(a);
  }
  return merged;
})();

const ALL_BY_ID: ReadonlyMap<string, Achievement> = new Map(
  ALL_ACHIEVEMENTS.map((a) => [a.id, a])
);

// ─────────────────────────────────────────────────────────────────────────────
// 1. UserFootprint — the flat snapshot every trigger reads from.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A flat, numeric summary of a user keyed to the trigger DSL paths. Every
 * `path OP num` trigger resolves its `path` against `numeric()` over this
 * object. Booleans are stored as 0/1 so they read through the same numeric path
 * (`anoint.placed>=1` works, and `anoint.placed` bare reads truthy).
 *
 * `heldTokenNumbers` is the only non-scalar member — the set of token NUMBERS
 * the user currently holds, used by `holdings.tokenNumber==N` membership and the
 * math-property keys (prime/perfect/…).
 */
export interface UserFootprint {
  // ── PRIMARY · minting ──────────────────────────────────────────────────────
  'mint.count': number;
  'mint.distinctProjects': number;
  'mint.maxPerProject': number;
  'primary.totalEth': number;

  // ── TRADING · secondary market ─────────────────────────────────────────────
  'secondary.totalEth': number;
  'volume.totalEth': number;
  'trades.count': number;
  'buy.count': number;
  'sale.count': number;
  'list.count': number;
  'offerMade.count': number;
  'offerMade.acceptedCount': number;
  'offerAccepted.count': number;

  // ── SOCIAL · the people graph ──────────────────────────────────────────────
  'following.count': number;
  'followers.count': number;
  'mutuals.count': number;

  // ── PROJECTS · following projects ──────────────────────────────────────────
  'projectFollows.count': number;

  // ── ANOINTING ──────────────────────────────────────────────────────────────
  /** 0/1 — does the user have an Anointment placed at all. */
  'anoint.placed': number;
  /** Days the current Anointment has been held (since placed_at). */
  'anoint.heldDays': number;
  /** Level (0/1/2) of the project the user has anointed. */
  'anoint.projectLevel': number;
  /** 0/1 — the user's conduit Output is its project's Prime Relic. */
  'anoint.conduitIsPrimeRelic': number;
  /** 0/1 — the user anointed their project before it reached The Cult. */
  'anoint.earlyToCult': number;
  /** Count of distinct other-users who chose an Output THIS user owns as their
   *  conduit (for `conduit_blessed`). */
  'anoint.conduitReceived': number;

  // ── HOLDINGS · current on-chain ownership ──────────────────────────────────
  'holdings.distinctProjects': number;
  'holdings.total': number;
  'holdings.maxPerProject': number;
  /** 0/1 — owns from a project whose max_supply == 1. */
  'holdings.editionOfOne': number;
  /** 0/1 — owns from the earliest-uploaded project on PD. */
  'holdings.firstProject': number;
  /** 0/1 — owns a project's Prime Relic conduit Output. */
  'holdings.primeRelic': number;

  // ── CURATION · settings-envelope counters ──────────────────────────────────
  'stars.count': number;
  'wishlist.count': number;
  'albums.count': number;
  'albums.maxItems': number;
  'showcase.filledSlots': number;

  // ── OG · tenure ────────────────────────────────────────────────────────────
  'tenure.years': number;
  'tenure.days': number;

  // ── RANK · meta ────────────────────────────────────────────────────────────
  'score.total': number;
  'rank.tier': number;

  // ── STREAK ─────────────────────────────────────────────────────────────────
  'streak.days': number;

  // ── ARTIST · creator side ──────────────────────────────────────────────────
  'artist.projects': number;
  'artist.primarySales': number;
  'artist.holders': number;
  'artist.secondaryEth': number;
  'artist.selloutProjects': number;
  'artist.projectFollowers': number;

  // ── LEADERBOARD / SEASON (placeholders — see note in buildFootprint) ───────
  /** Best leaderboard rank ever (smaller = better). Infinity = never ranked.
   *  Stored as a large sentinel so `<= N` reads false until real data lands. */
  'leaderboard.bestRank': number;
  /** Best season finish (smaller = better). Same sentinel convention. */
  'season.bestFinish': number;

  // ── oil.rider (flagship special) ───────────────────────────────────────────
  /** 0/1 — has at least one sale of a piece held ≥365d for ≥3× its basis. */
  'oil.rider': number;

  // ── non-scalar ─────────────────────────────────────────────────────────────
  /** The set of token NUMBERS the user currently holds (across all projects). */
  heldTokenNumbers: Set<number>;
}

// A large sentinel for "best rank" fields so `<= N` never matches before real
// leaderboard/season data exists. Number.MAX_SAFE_INTEGER would also work; this
// reads clearly in logs.
const UNRANKED = 1e15;

// ─────────────────────────────────────────────────────────────────────────────
// Row shapes for the reads (cast with `as` — these tables aren't in the
// generated Database types). Matches the migration + the spec'd columns.
// ─────────────────────────────────────────────────────────────────────────────

interface UserRowLite {
  address: string;
  handle: string | null;
  created_at: string;
  price_score: number | null;
  price_rank: number | null;
  price_streak: number | null;
  streak_best: number | null;
  streak_last_active: string | null;
  settings: unknown;
  showcase: unknown;
}

interface EventRowLite {
  type: string;
  project_id: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  price_eth: string | number | null;
  timestamp: string;
}

interface HolderRowLite {
  project_id: string;
  token_id: string;
  owner_address: string;
}

interface FollowRowLite {
  follower_address: string | null;
  following_address: string | null;
}

interface AnointRowLite {
  user_address: string;
  project_id: string;
  output_token_id: string;
  placed_at: string;
}

interface ProjectRowLite {
  id: string;
  artist_address: string | null;
  minted_count: number | null;
  max_supply: number | null;
  uploaded_at: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers.
// ─────────────────────────────────────────────────────────────────────────────

function toEth(v: string | number | null | undefined): number {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'number' ? v : parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

/** Token NUMBER from a token_id. Token ids are stringified integers in PD; a
 *  non-numeric id yields NaN and is skipped by callers. */
function tokenNumber(tokenId: string | null | undefined): number {
  if (tokenId === null || tokenId === undefined) return NaN;
  const n = parseInt(tokenId, 10);
  return Number.isFinite(n) ? n : NaN;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(aMs: number, bMs: number): number {
  return Math.floor((bMs - aMs) / MS_PER_DAY);
}

const lc = (s: string | null | undefined): string => (s ?? '').toLowerCase();

// ─────────────────────────────────────────────────────────────────────────────
// 2. buildFootprint — ONE bounded batch of reads, no per-achievement queries.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read everything the catalog could ask about `address` and fold it into a
 * UserFootprint. Bounded: a fixed set of queries regardless of catalog size.
 *
 * leaderboard.bestRank / season.bestFinish are PLACEHOLDERS — no ranked-history
 * source exists yet (season_standings is a scaffold). They stay at the UNRANKED
 * sentinel so the `<= N` leaderboard/season achievements remain locked until
 * that data lands. Documented, not guessed.
 */
export async function buildFootprint(
  supabase: SB,
  address: string
): Promise<UserFootprint> {
  const addr = lc(address);

  // ── Batch every independent read. ──────────────────────────────────────────
  const [
    userRes,
    eventsRes,
    holdersRes,
    followingRes,
    followersRes,
    projectFollowsRes,
    anointRes,
    projectsRes,
  ] = await Promise.all([
    // The user row (progression + jsonb envelopes).
    (supabase as unknown as SB)
      .from('users' as never)
      .select(
        'address, handle, created_at, price_score, price_rank, price_streak, streak_best, streak_last_active, settings, showcase' as never
      )
      .eq('address' as never, addr as never)
      .maybeSingle(),

    // Every event touching this user (either side) — minting, buys, sales,
    // lists, offers. Bounded by the user's own activity.
    (supabase as unknown as SB)
      .from('events' as never)
      .select(
        'type, project_id, token_id, from_address, to_address, price_eth, timestamp' as never
      )
      .or(`from_address.eq.${addr},to_address.eq.${addr}` as never),

    // Current holdings (live ownership).
    (supabase as unknown as SB)
      .from('holders' as never)
      .select('project_id, token_id, owner_address' as never)
      .eq('owner_address' as never, addr as never),

    // People this user follows.
    (supabase as unknown as SB)
      .from('follows' as never)
      .select('follower_address, following_address' as never)
      .eq('follower_address' as never, addr as never),

    // People who follow this user.
    (supabase as unknown as SB)
      .from('follows' as never)
      .select('follower_address, following_address' as never)
      .eq('following_address' as never, addr as never),

    // Projects this user follows.
    (supabase as unknown as SB)
      .from('project_follows' as never)
      .select('follower_address, project_id' as never)
      .eq('follower_address' as never, addr as never),

    // EVERY anointment row — needed to compute project levels, Prime Relics,
    // conduits-received, and this user's own pledge. Bounded by total platform
    // anointments (one row per account, ceiling = user count).
    (supabase as unknown as SB)
      .from('anointments' as never)
      .select('user_address, project_id, output_token_id, placed_at' as never),

    // Projects (for distinct-project depth, editionOfOne, firstProject, and
    // the artist-side rollups). Bounded by the project roster (~50 in test).
    (supabase as unknown as SB)
      .from('projects' as never)
      .select(
        'id, artist_address, minted_count, max_supply, uploaded_at' as never
      ),
  ]);

  const user = (userRes.data ?? null) as UserRowLite | null;
  const events = ((eventsRes.data ?? []) as unknown) as EventRowLite[];
  const holders = ((holdersRes.data ?? []) as unknown) as HolderRowLite[];
  const following = ((followingRes.data ?? []) as unknown) as FollowRowLite[];
  const followers = ((followersRes.data ?? []) as unknown) as FollowRowLite[];
  const projectFollows = ((projectFollowsRes.data ?? []) as unknown) as Array<{
    project_id: string;
  }>;
  const anointments = ((anointRes.data ?? []) as unknown) as AnointRowLite[];
  const projects = ((projectsRes.data ?? []) as unknown) as ProjectRowLite[];

  const nowMs = Date.now();

  // ── PRIMARY · minting ───────────────────────────────────────────────────────
  // Mint = MINT event with to_address == user.
  const mintEvents = events.filter(
    (e) => e.type === 'MINT' && lc(e.to_address) === addr
  );
  const mintByProject = new Map<string, number>();
  let primaryTotalEth = 0;
  for (const e of mintEvents) {
    mintByProject.set(e.project_id, (mintByProject.get(e.project_id) ?? 0) + 1);
    primaryTotalEth += toEth(e.price_eth);
  }
  const mintCount = mintEvents.length;
  const mintDistinctProjects = mintByProject.size;
  const mintMaxPerProject = mintByProject.size
    ? Math.max(...mintByProject.values())
    : 0;

  // ── TRADING · secondary buys / sales / lists / offers ───────────────────────
  // Per the build spec: secondary buy = XFER with a price to me; sale = XFER
  // with a price from me. LIST/OFFER are their own event types.
  const buyEvents = events.filter(
    (e) => e.type === 'XFER' && lc(e.to_address) === addr && toEth(e.price_eth) > 0
  );
  const saleEvents = events.filter(
    (e) =>
      e.type === 'XFER' && lc(e.from_address) === addr && toEth(e.price_eth) > 0
  );
  const listEvents = events.filter(
    (e) => e.type === 'LIST' && lc(e.from_address) === addr
  );
  // Offers MADE by this user (OFFER from me). acceptedCount / offerAccepted are
  // not derivable from the current event ledger (no accept linkage); left at 0
  // and documented — they unlock once an OFFER_ACCEPTED signal exists.
  const offerMadeEvents = events.filter(
    (e) => e.type === 'OFFER' && lc(e.from_address) === addr
  );

  const secondaryBuyEth = buyEvents.reduce((s, e) => s + toEth(e.price_eth), 0);
  const secondarySaleEth = saleEvents.reduce((s, e) => s + toEth(e.price_eth), 0);
  const secondaryTotalEth = secondaryBuyEth + secondarySaleEth;
  const buyCount = buyEvents.length;
  const saleCount = saleEvents.length;
  const tradesCount = buyCount + saleCount;
  const volumeTotalEth = primaryTotalEth + secondaryTotalEth;

  // ── SOCIAL ──────────────────────────────────────────────────────────────────
  const followingSet = new Set(
    following.map((f) => lc(f.following_address)).filter((a) => a.length > 0)
  );
  const followerSet = new Set(
    followers.map((f) => lc(f.follower_address)).filter((a) => a.length > 0)
  );
  let mutuals = 0;
  for (const a of followingSet) if (followerSet.has(a)) mutuals++;

  // ── HOLDINGS ─────────────────────────────────────────────────────────────────
  const holdByProject = new Map<string, number>();
  const heldTokenNumbers = new Set<number>();
  // (project_id, token_id) pairs the user holds — for primeRelic membership.
  const heldConduitKeys = new Set<string>();
  for (const h of holders) {
    holdByProject.set(h.project_id, (holdByProject.get(h.project_id) ?? 0) + 1);
    const n = tokenNumber(h.token_id);
    if (!Number.isNaN(n)) heldTokenNumbers.add(n);
    heldConduitKeys.add(`${h.project_id}:${h.token_id}`);
  }
  const holdingsTotal = holders.length;
  const holdingsDistinctProjects = holdByProject.size;
  const holdingsMaxPerProject = holdByProject.size
    ? Math.max(...holdByProject.values())
    : 0;

  // editionOfOne — owns from a project whose max_supply == 1.
  const projectById = new Map<string, ProjectRowLite>();
  for (const p of projects) projectById.set(p.id, p);
  let editionOfOne = 0;
  for (const pid of holdByProject.keys()) {
    const p = projectById.get(pid);
    if (p && (p.max_supply ?? 0) === 1) {
      editionOfOne = 1;
      break;
    }
  }

  // firstProject — owns from the earliest-uploaded project on PD.
  let firstProjectId: string | null = null;
  let firstProjectMs = Infinity;
  for (const p of projects) {
    if (!p.uploaded_at) continue;
    const ms = Date.parse(p.uploaded_at);
    if (Number.isFinite(ms) && ms < firstProjectMs) {
      firstProjectMs = ms;
      firstProjectId = p.id;
    }
  }
  const holdingsFirstProject =
    firstProjectId !== null && holdByProject.has(firstProjectId) ? 1 : 0;

  // ── ANOINTING (computed from the full anointments table) ────────────────────
  // Per-project anoint counts → levels. Per-(project, conduit) counts → Prime
  // Relic. All from the single full-table read above.
  const anointCountByProject = new Map<string, number>();
  const conduitCount = new Map<string, number>(); // key: `${pid}:${tokenId}`
  for (const a of anointments) {
    anointCountByProject.set(
      a.project_id,
      (anointCountByProject.get(a.project_id) ?? 0) + 1
    );
    const ck = `${a.project_id}:${a.output_token_id}`;
    conduitCount.set(ck, (conduitCount.get(ck) ?? 0) + 1);
  }
  // The Prime Relic of each project = its most-voted conduit (ties: first seen).
  const primeRelicByProject = new Map<string, string>(); // pid → tokenId
  const primeRelicTopVotes = new Map<string, number>();
  for (const [ck, votes] of conduitCount) {
    const sep = ck.indexOf(':');
    const pid = ck.slice(0, sep);
    const tokenId = ck.slice(sep + 1);
    const best = primeRelicTopVotes.get(pid) ?? -1;
    if (votes > best) {
      primeRelicTopVotes.set(pid, votes);
      primeRelicByProject.set(pid, tokenId);
    }
  }

  const myAnoint = anointments.find((a) => lc(a.user_address) === addr) ?? null;
  const anointPlaced = myAnoint ? 1 : 0;
  let anointHeldDays = 0;
  let anointProjectLevel = 0;
  let anointConduitIsPrimeRelic = 0;
  let anointEarlyToCult = 0;
  if (myAnoint) {
    const placedMs = Date.parse(myAnoint.placed_at);
    if (Number.isFinite(placedMs)) anointHeldDays = Math.max(0, daysBetween(placedMs, nowMs));
    const cnt = anointCountByProject.get(myAnoint.project_id) ?? 0;
    anointProjectLevel = projectLevel(cnt);
    // earlyToCult — the user is one of the anointers and the project is now at
    // The Cult (level ≥ 1); the spec's "anoint before it reached The Cult" can't
    // be proven from a snapshot (no time-ordering of anoints), so we grant the
    // observable form: an anointer of a project that has reached The Cult. This
    // is conservative and documented; a precise ordering check needs a placed_at
    // rank, which the single per-account row can't give without all rows' times.
    if (anointProjectLevel >= 1) anointEarlyToCult = 1;
    if (primeRelicByProject.get(myAnoint.project_id) === myAnoint.output_token_id) {
      anointConduitIsPrimeRelic = 1;
    }
  }

  // conduitReceived — other users chose an Output THIS user owns as their conduit.
  let anointConduitReceived = 0;
  for (const a of anointments) {
    if (lc(a.user_address) === addr) continue;
    if (heldConduitKeys.has(`${a.project_id}:${a.output_token_id}`)) {
      anointConduitReceived++;
    }
  }

  // holdings.primeRelic — the user holds an Output that IS a project's Prime Relic.
  let holdingsPrimeRelic = 0;
  for (const [pid, tokenId] of primeRelicByProject) {
    if (heldConduitKeys.has(`${pid}:${tokenId}`)) {
      holdingsPrimeRelic = 1;
      break;
    }
  }

  // ── CURATION · from the settings jsonb envelope + showcase ──────────────────
  const settings = (user?.settings ?? {}) as {
    starred?: unknown;
    wishlist?: unknown;
    albums?: unknown;
  };
  const starsCount = Array.isArray(settings.starred) ? settings.starred.length : 0;
  const wishlistCount = Array.isArray(settings.wishlist)
    ? settings.wishlist.length
    : 0;
  const albums = Array.isArray(settings.albums)
    ? (settings.albums as Array<{ keys?: unknown }>)
    : [];
  const albumsCount = albums.length;
  const albumsMaxItems = albums.reduce(
    (m, al) => Math.max(m, Array.isArray(al.keys) ? al.keys.length : 0),
    0
  );

  const showcaseSlots = ((user?.showcase ?? {}) as { slots?: unknown }).slots;
  const showcaseFilledSlots = Array.isArray(showcaseSlots)
    ? showcaseSlots.filter((s) => s != null).length
    : 0;

  // ── OG · tenure ──────────────────────────────────────────────────────────────
  let tenureDays = 0;
  let tenureYears = 0;
  if (user?.created_at) {
    const createdMs = Date.parse(user.created_at);
    if (Number.isFinite(createdMs)) {
      tenureDays = Math.max(0, daysBetween(createdMs, nowMs));
      tenureYears = Math.floor(tenureDays / 365);
    }
  }

  // ── RANK / STREAK · straight off the user row ───────────────────────────────
  const scoreTotal = user?.price_score ?? 0;
  const rankTier = user?.price_rank ?? scoreToRank(scoreTotal);
  const streakDays = user?.price_streak ?? 0;

  // ── ARTIST · creator-side rollups ───────────────────────────────────────────
  const myProjects = projects.filter((p) => lc(p.artist_address) === addr);
  const myProjectIds = new Set(myProjects.map((p) => p.id));
  const artistProjects = myProjects.length;

  // Primary sales of my work = MINT events on my projects (any minter).
  // Sellouts = my projects where minted_count >= max_supply (>0).
  let artistPrimarySales = 0;
  let artistSecondaryEth = 0;
  for (const e of events) {
    // events only contain rows touching THIS user (the OR filter), so artist
    // rollups that need ALL events on a project can't be fully derived here.
    // We compute what the user's own event slice supports and document the rest.
    if (!myProjectIds.has(e.project_id)) continue;
    if (e.type === 'MINT') artistPrimarySales++;
    if (e.type === 'XFER' && toEth(e.price_eth) > 0) artistSecondaryEth += toEth(e.price_eth);
  }
  let artistSelloutProjects = 0;
  for (const p of myProjects) {
    const supply = p.max_supply ?? 0;
    if (supply > 0 && (p.minted_count ?? 0) >= supply) artistSelloutProjects++;
  }

  // Holders of my work / followers across my projects — bounded extra reads only
  // when the user actually has projects (most users have none). Kept inside the
  // bounded contract: at most two more queries, and only for creators.
  let artistHolders = 0;
  let artistProjectFollowers = 0;
  if (myProjectIds.size > 0) {
    const ids = Array.from(myProjectIds);
    const [holderRes, pfRes] = await Promise.all([
      (supabase as unknown as SB)
        .from('holders' as never)
        .select('owner_address, project_id' as never)
        .in('project_id' as never, ids as never),
      (supabase as unknown as SB)
        .from('project_follows' as never)
        .select('follower_address, project_id' as never)
        .in('project_id' as never, ids as never),
    ]);
    const hrows = ((holderRes.data ?? []) as unknown) as Array<{
      owner_address: string;
    }>;
    const uniqueHolders = new Set(hrows.map((h) => lc(h.owner_address)));
    artistHolders = uniqueHolders.size;
    const pfrows = ((pfRes.data ?? []) as unknown) as Array<unknown>;
    artistProjectFollowers = pfrows.length;
  }

  // ── oil.rider — the flagship: a sale of a piece held ≥365d for ≥3× basis ────
  const oilRider = computeOilRider(events, addr) ? 1 : 0;

  return {
    'mint.count': mintCount,
    'mint.distinctProjects': mintDistinctProjects,
    'mint.maxPerProject': mintMaxPerProject,
    'primary.totalEth': primaryTotalEth,

    'secondary.totalEth': secondaryTotalEth,
    'volume.totalEth': volumeTotalEth,
    'trades.count': tradesCount,
    'buy.count': buyCount,
    'sale.count': saleCount,
    'list.count': listEvents.length,
    'offerMade.count': offerMadeEvents.length,
    'offerMade.acceptedCount': 0, // no accept linkage in the event ledger yet
    'offerAccepted.count': 0, // no accept linkage in the event ledger yet

    'following.count': followingSet.size,
    'followers.count': followerSet.size,
    'mutuals.count': mutuals,

    'projectFollows.count': new Set(projectFollows.map((p) => p.project_id)).size,

    'anoint.placed': anointPlaced,
    'anoint.heldDays': anointHeldDays,
    'anoint.projectLevel': anointProjectLevel,
    'anoint.conduitIsPrimeRelic': anointConduitIsPrimeRelic,
    'anoint.earlyToCult': anointEarlyToCult,
    'anoint.conduitReceived': anointConduitReceived,

    'holdings.distinctProjects': holdingsDistinctProjects,
    'holdings.total': holdingsTotal,
    'holdings.maxPerProject': holdingsMaxPerProject,
    'holdings.editionOfOne': editionOfOne,
    'holdings.firstProject': holdingsFirstProject,
    'holdings.primeRelic': holdingsPrimeRelic,

    'stars.count': starsCount,
    'wishlist.count': wishlistCount,
    'albums.count': albumsCount,
    'albums.maxItems': albumsMaxItems,
    'showcase.filledSlots': showcaseFilledSlots,

    'tenure.years': tenureYears,
    'tenure.days': tenureDays,

    'score.total': scoreTotal,
    'rank.tier': rankTier,

    'streak.days': streakDays,

    'artist.projects': artistProjects,
    'artist.primarySales': artistPrimarySales,
    'artist.holders': artistHolders,
    'artist.secondaryEth': artistSecondaryEth,
    'artist.selloutProjects': artistSelloutProjects,
    'artist.projectFollowers': artistProjectFollowers,

    'leaderboard.bestRank': UNRANKED,
    'season.bestFinish': UNRANKED,

    'oil.rider': oilRider,

    heldTokenNumbers,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// oil.rider — per-token cost-basis + hold-duration from the event ledger.
//
// A piece is ACQUIRED by the user via a MINT to them (basis = mint price) or an
// XFER buy to them with a price (basis = buy price). It is SOLD when the user
// is the from_address of a priced XFER. For each sale, we pair it with the
// user's MOST RECENT prior acquisition of that (project, token) — that's the lot
// they're selling. The badge unlocks if any such sale was ≥365 days after the
// acquisition AND for ≥3× the acquisition price (basis > 0).
// ─────────────────────────────────────────────────────────────────────────────
function computeOilRider(events: EventRowLite[], addr: string): boolean {
  // Per-token timeline of this user's acquisitions and disposals.
  interface Lot {
    ms: number;
    priceEth: number;
  }
  const acquisitions = new Map<string, Lot[]>(); // key: `${pid}:${tokenId}`
  const sales = new Map<string, Lot[]>();

  for (const e of events) {
    const ms = Date.parse(e.timestamp);
    if (!Number.isFinite(ms)) continue;
    const key = `${e.project_id}:${e.token_id}`;
    const price = toEth(e.price_eth);

    const acquired =
      (e.type === 'MINT' && lc(e.to_address) === addr) ||
      (e.type === 'XFER' && lc(e.to_address) === addr && price > 0);
    if (acquired) {
      const arr = acquisitions.get(key) ?? [];
      arr.push({ ms, priceEth: price });
      acquisitions.set(key, arr);
      continue;
    }
    const sold = e.type === 'XFER' && lc(e.from_address) === addr && price > 0;
    if (sold) {
      const arr = sales.get(key) ?? [];
      arr.push({ ms, priceEth: price });
      sales.set(key, arr);
    }
  }

  for (const [key, saleLots] of sales) {
    const acqLots = (acquisitions.get(key) ?? [])
      .slice()
      .sort((a, b) => a.ms - b.ms);
    if (acqLots.length === 0) continue;
    for (const sale of saleLots) {
      // The lot being sold = the latest acquisition at/before the sale time with
      // a positive basis (a mint at 0 ETH can't yield a "3× basis" multiple).
      let basis: Lot | null = null;
      for (const acq of acqLots) {
        if (acq.ms <= sale.ms && acq.priceEth > 0) basis = acq;
      }
      if (!basis) continue;
      const heldDays = daysBetween(basis.ms, sale.ms);
      if (heldDays >= 365 && sale.priceEth >= 3 * basis.priceEth) return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. evalTrigger — the generic condition evaluator.
// ─────────────────────────────────────────────────────────────────────────────

/** Prefixes whose triggers are NEVER satisfied server-side — they are detected
 *  in the browser and unlocked only via the evaluate route's clientGrants
 *  whitelist. */
const CLIENT_GRANT_PREFIXES = [
  'ui.',
  'odin.',
  'brendon.',
  'time.',
  'date.',
  'combo.',
  'spell.',
  'action.',
] as const;

/** True if a trigger string is client-granted (one of the CLIENT_GRANT_PREFIXES). */
export function isClientGrantedTrigger(trigger: string): boolean {
  return CLIENT_GRANT_PREFIXES.some((p) => trigger.startsWith(p));
}

/**
 * The set of catalog ids whose trigger is client-granted. The evaluate route
 * only honours clientGrants that appear in THIS set — the browser can never
 * grant a server-evaluable achievement.
 */
export const CLIENT_GRANTABLE: ReadonlySet<string> = new Set(
  ALL_ACHIEVEMENTS.filter((a) => isClientGrantedTrigger(a.trigger)).map((a) => a.id)
);

type CmpOp = '>=' | '<=' | '>' | '<' | '==';

const CMP_RE = /^([a-zA-Z][a-zA-Z0-9.]*)\s*(>=|<=|==|>|<)\s*(-?\d+(?:\.\d+)?)$/;

/** A flat numeric lookup over the footprint. Returns undefined for keys that
 *  aren't numeric scalars (e.g. heldTokenNumbers). */
function numeric(f: UserFootprint, path: string): number | undefined {
  const v = (f as unknown as Record<string, unknown>)[path];
  return typeof v === 'number' ? v : undefined;
}

function cmp(a: number, op: CmpOp, b: number): boolean {
  switch (op) {
    case '>=':
      return a >= b;
    case '<=':
      return a <= b;
    case '>':
      return a > b;
    case '<':
      return a < b;
    case '==':
      return a === b;
  }
}

// ── Token-number math properties (the well-known ones). ───────────────────────
function isPrime(n: number): boolean {
  if (n < 2) return false;
  if (n % 2 === 0) return n === 2;
  for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
  return true;
}
function isPerfect(n: number): boolean {
  if (n < 2) return false;
  let sum = 1;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) {
      sum += i;
      const j = n / i;
      if (j !== i) sum += j;
    }
  }
  return sum === n;
}
function isTriangular(n: number): boolean {
  if (n < 1) return false;
  // n = k(k+1)/2 ⇒ 8n+1 is a perfect square.
  const x = 8 * n + 1;
  const r = Math.floor(Math.sqrt(x));
  return r * r === x;
}
function isPerfectSquare(n: number): boolean {
  if (n < 0) return false;
  const r = Math.floor(Math.sqrt(n));
  return r * r === n;
}
function isCube(n: number): boolean {
  if (n < 0) return false;
  const r = Math.round(Math.cbrt(n));
  return r * r * r === n;
}
function isFibonacci(n: number): boolean {
  if (n < 0) return false;
  // n is Fibonacci ⇔ 5n²±4 is a perfect square.
  return isPerfectSquare(5 * n * n + 4) || isPerfectSquare(5 * n * n - 4);
}
function isPowerOfTwo(n: number): boolean {
  return n >= 1 && (n & (n - 1)) === 0;
}
function isPalindrome(n: number): boolean {
  if (n < 0) return false;
  const s = String(n);
  return s === s.split('').reverse().join('');
}

const TOKEN_PROPERTY_PREDICATES: Record<string, (n: number) => boolean> = {
  'holdings.tokenNumberPrime': isPrime,
  'holdings.tokenNumberPerfect': isPerfect,
  'holdings.tokenNumberTriangular': isTriangular,
  'holdings.tokenNumberSquare': isPerfectSquare,
  'holdings.tokenNumberCube': isCube,
  'holdings.tokenNumberFibonacci': isFibonacci,
  'holdings.tokenNumberPowerOfTwo': isPowerOfTwo,
  'holdings.tokenNumberPalindrome': isPalindrome,
};

/** Context passed to evalTrigger for the two-phase meta evaluation. */
export interface EvalContext {
  /** The set of ids satisfied by the base (non-meta) pass. Used by meta.*. */
  baseUnlocked?: ReadonlySet<string>;
}

/**
 * Evaluate one trigger string against a footprint. Pure, never throws.
 *
 * Order of resolution:
 *   1. Client-granted prefixes → always false here (granted via the route).
 *   2. meta.* → from ctx.baseUnlocked (two-phase; false if no base set given).
 *   3. holdings.tokenNumber==N → membership in heldTokenNumbers.
 *   4. token-property boolean keys → math check over heldTokenNumbers.
 *   5. `path OP num` → numeric comparison over the flat footprint.
 *   6. bare scalar path (no operator) → truthy (> 0) numeric check.
 *   7. anything else → false.
 */
export function evalTrigger(
  trigger: string,
  f: UserFootprint,
  ctx: EvalContext = {}
): boolean {
  const t = trigger.trim();

  // 1. Client-granted — never satisfied server-side.
  if (isClientGrantedTrigger(t)) return false;

  // 2. META (two-phase).
  if (t.startsWith('meta.')) {
    return evalMeta(t, ctx.baseUnlocked);
  }

  // 3. holdings.tokenNumber==N (exact token-number ownership).
  const tnMatch = /^holdings\.tokenNumber\s*==\s*(-?\d+)$/.exec(t);
  if (tnMatch) {
    return f.heldTokenNumbers.has(parseInt(tnMatch[1], 10));
  }

  // 4. token-property boolean keys (prime/perfect/…). Bare (no operator) means
  //    "owns at least one token with this property".
  const propPred = TOKEN_PROPERTY_PREDICATES[t];
  if (propPred) {
    for (const n of f.heldTokenNumbers) if (propPred(n)) return true;
    return false;
  }

  // 5. `path OP num` — the generic numeric DSL.
  const m = CMP_RE.exec(t);
  if (m) {
    const [, path, op, numStr] = m;
    const lhs = numeric(f, path);
    if (lhs === undefined) return false; // unknown/non-numeric path → locked
    return cmp(lhs, op as CmpOp, parseFloat(numStr));
  }

  // 6. Bare scalar path (e.g. `anoint.placed`, `oil.rider`) → truthy.
  const bare = numeric(f, t);
  if (bare !== undefined) return bare > 0;

  // 7. Unknown / unparseable → locked, never throw.
  return false;
}

// ── meta.* evaluation (two-phase) ────────────────────────────────────────────
function evalMeta(
  trigger: string,
  baseUnlocked: ReadonlySet<string> | undefined
): boolean {
  if (!baseUnlocked) return false; // meta evaluated only in the second phase

  // meta.unlockedCount>=N
  const countM = /^meta\.unlockedCount\s*(>=|<=|==|>|<)\s*(\d+)$/.exec(trigger);
  if (countM) {
    return cmp(baseUnlocked.size, countM[1] as CmpOp, parseInt(countM[2], 10));
  }

  // meta.categoryComplete.<cat>
  const catM = /^meta\.categoryComplete\.([a-zA-Z]+)$/.exec(trigger);
  if (catM) {
    const cat = catM[1] as AchievementCategory;
    const inCat = ALL_ACHIEVEMENTS.filter((a) => a.category === cat);
    if (inCat.length === 0) return false;
    return inCat.every((a) => baseUnlocked.has(a.id));
  }

  // meta.allNonSecretUnlocked
  if (trigger === 'meta.allNonSecretUnlocked') {
    const nonSecret = ALL_ACHIEVEMENTS.filter((a) => !a.secret);
    return nonSecret.every((a) => baseUnlocked.has(a.id));
  }

  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. evaluateFootprint — run every trigger, union with already-unlocked.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate the whole catalog against a footprint. Two-phase so meta.*
 * achievements can read the base (non-meta) results. Unlocks are PERMANENT:
 * the returned set is the union of `alreadyUnlocked` and everything newly
 * satisfied this pass.
 *
 * `alreadyUnlocked` is folded into the base set BEFORE the meta phase so a
 * completionist meta unlocks correctly off historical unlocks (incl. the
 * client-granted ones the browser previously awarded).
 */
export function evaluateFootprint(
  f: UserFootprint,
  alreadyUnlocked: ReadonlySet<string>
): Set<string> {
  // ── Phase 1: every non-meta trigger. ───────────────────────────────────────
  const base = new Set<string>(alreadyUnlocked);
  for (const a of ALL_ACHIEVEMENTS) {
    if (base.has(a.id)) continue;
    if (a.trigger.startsWith('meta.')) continue; // phase 2
    if (evalTrigger(a.trigger, f)) base.add(a.id);
  }

  // ── Phase 2: meta triggers read the phase-1 set. ───────────────────────────
  const result = new Set<string>(base);
  let changed = true;
  // Loop so a meta that depends on another meta (e.g. unlockedCount crossing a
  // threshold because a category just completed) settles. Bounded by the small
  // number of meta achievements.
  while (changed) {
    changed = false;
    for (const a of ALL_ACHIEVEMENTS) {
      if (!a.trigger.startsWith('meta.')) continue;
      if (result.has(a.id)) continue;
      if (evalTrigger(a.trigger, f, { baseUnlocked: result })) {
        result.add(a.id);
        changed = true;
      }
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. persistEvaluation — the write path. Idempotent.
// ─────────────────────────────────────────────────────────────────────────────

export interface PersistResult {
  /** The achievements newly unlocked THIS call (for unlock pops). */
  newlyUnlocked: Achievement[];
  /** The recomputed PriceScore (sum of all unlocked points). */
  priceScore: number;
  /** The recomputed PriceRank tier. */
  priceRank: number;
}

/**
 * Evaluate `address` and persist the result. Steps:
 *   1. buildFootprint.
 *   2. Load existing user_achievements.
 *   3. evaluateFootprint (+ honour clientGrants ∈ CLIENT_GRANTABLE).
 *   4. INSERT newly-unlocked rows.
 *   5. Recompute price_score (sum points) + price_rank (scoreToRank).
 *   6. UPDATE users.
 *
 * Idempotent: a second call with no new activity unlocks nothing, re-inserts
 * nothing (upsert ignores conflicts), and rewrites the same score/rank.
 *
 * `clientGrants` are achievement ids the browser is asserting (konami, found
 * Petey, Odin/Brendon appearances, etc.). Only ids in CLIENT_GRANTABLE are
 * honoured; everything else is silently dropped (the browser cannot grant a
 * server-evaluable achievement).
 */
export async function persistEvaluation(
  supabase: SB,
  address: string,
  clientGrants?: string[]
): Promise<PersistResult> {
  const addr = lc(address);

  // 1. Footprint.
  const footprint = await buildFootprint(supabase, addr);

  // 2. Existing unlocks.
  const existingRes = await (supabase as unknown as SB)
    .from('user_achievements' as never)
    .select('achievement_id' as never)
    .eq('user_address' as never, addr as never);
  const existingRows = ((existingRes.data ?? []) as unknown) as Array<{
    achievement_id: string;
  }>;
  const already = new Set(existingRows.map((r) => r.achievement_id));

  // 3. Honour client grants (whitelist only) BEFORE evaluation, so meta.* can
  //    count them.
  const grantSeed = new Set(already);
  if (clientGrants && clientGrants.length > 0) {
    for (const id of clientGrants) {
      if (CLIENT_GRANTABLE.has(id)) grantSeed.add(id);
    }
  }

  const satisfied = evaluateFootprint(footprint, grantSeed);

  // 4. Newly-unlocked = satisfied minus what was already persisted. (Honoured
  //    client grants that weren't yet in the table are "new" too.)
  const newlyIds: string[] = [];
  for (const id of satisfied) {
    if (!already.has(id) && ALL_BY_ID.has(id)) newlyIds.push(id);
  }

  const nowIso = new Date().toISOString();
  if (newlyIds.length > 0) {
    const rows = newlyIds.map((id) => ({
      user_address: addr,
      achievement_id: id,
      unlocked_at: nowIso,
    }));
    // Upsert so a concurrent evaluate (e.g. streak ping racing a market action)
    // can't double-insert; the PK(user_address, achievement_id) absorbs it.
    await (supabase as unknown as SB)
      .from('user_achievements' as never)
      .upsert(rows as never, {
        onConflict: 'user_address,achievement_id',
        ignoreDuplicates: true,
      } as never);
  }

  // 5. Recompute score + rank over the FULL satisfied set (only ids that exist
  //    in the catalog count — stale ids for removed achievements are ignored).
  let priceScore = 0;
  for (const id of satisfied) {
    const a = ALL_BY_ID.get(id);
    if (a) priceScore += a.points;
  }
  const priceRank = scoreToRank(priceScore);

  // 6. Persist score + rank on the user row.
  await (supabase as unknown as SB)
    .from('users' as never)
    .update({ price_score: priceScore, price_rank: priceRank } as never)
    .eq('address' as never, addr as never);

  const newlyUnlocked = newlyIds
    .map((id) => ALL_BY_ID.get(id))
    .filter((a): a is Achievement => a !== undefined);

  return { newlyUnlocked, priceScore, priceRank };
}
