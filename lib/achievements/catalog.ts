/**
 * ════════════════════════════════════════════════════════════════════════
 *  PriceOS — ACHIEVEMENTS CATALOG  (the editable source of truth)
 * ════════════════════════════════════════════════════════════════════════
 *
 * This file IS the list. Brendon edits names, blurbs, points, and the secret
 * flag right here — nothing else needs to change to retune the catalog. The
 * engine reads this array; the UI reads this array. One file, one truth.
 *
 * HOW THE SYSTEM FITS TOGETHER
 *   • ACHIEVEMENTS  — one-shot unlocks (this file). Each is worth `points`.
 *   • PriceScore    — your number: the SUM of points from unlocked achievements.
 *   • PriceRank     — your tier: PriceScore crossing a threshold levels you up
 *                     (RPG-style). Thresholds live in lib/achievements/tiers.ts.
 *   • PriceStreak   — your current streak's day count. Its own achievements
 *                     below (60-day activation is the surprise level-up).
 *
 * RULES WE LOCKED (2026-06-14 scoping session)
 *   • One-shot only. No achievement is farmable/repeatable — unlock once, done.
 *     "Tiers" (mint 1 / 5 / 15…) are SEPARATE one-shot achievements, not a
 *     repeating counter, so the board can't be farmed.
 *   • Points weighted toward PRIMARY SPEND (minting) — that's the behaviour PD
 *     most wants. Trading/volume next. Social/curation are lighter stackers.
 *   • `secret: true` = hidden until earned (Xbox/Steam style). The easter eggs.
 *     Shown as "???" with a locked blurb until the moment they pop.
 *   • Flipping is GOOD here (price-discussion platform) — trading achievements
 *     reward velocity, never punish it. No "diamond hands" virtue.
 *   • PriceStreak feeds PriceScore but is CAPPED "junior" — see tiers.ts. A
 *     maxed streaker out-ranks a casual spender, never a serious one.
 *
 * EDITING
 *   • Change a name/blurb/points: edit in place. Safe.
 *   • Add one: copy a row, give it a NEW unique `id` (snake_case, never reused),
 *     set category + points + secret. The `trigger` string is the engine hook —
 *     leave it if you're only renaming; ping Claude if you're adding a brand-new
 *     condition that needs detection logic wired.
 *   • Remove one: delete the row. (Already-unlocked rows for removed ids are
 *     ignored gracefully by the engine.)
 *   • `id` is permanent and immutable once shipped — it's how unlocks are
 *     stored per user. Renaming the display `name` is free; never reuse an id.
 */

import { LADDER_ACHIEVEMENTS } from './catalogs/ladders';
import { MYTH_ACHIEVEMENTS } from './catalogs/myth';
import { NUMBER_ACHIEVEMENTS } from './catalogs/numbers';
import { DEPTH_ACHIEVEMENTS } from './catalogs/depth';
import { TENURE_ACHIEVEMENTS } from './catalogs/tenure';

export type AchievementCategory =
  | 'primary' // minting — the fattest points
  | 'trading' // secondary market, volume, flips
  | 'social' // follower/following/mutuals graph (people)
  | 'projects' // following projects
  | 'anointing' // the anointing curation system
  | 'streak' // PriceStreak milestones
  | 'og' // longevity / join-date cohorts
  | 'curation' // albums, stars, wishlist, targets, showcase
  | 'identity' // profile completeness, sprite, plate
  | 'rank' // meta: hitting Score/Rank/leaderboard milestones
  | 'artist' // creator-side (you uploaded the project)
  | 'lore' // pure easter eggs / flavour
  | 'myth'; // the Odin arc — the mythology of the late game

export interface Achievement {
  /** Permanent, immutable, unique. Never reuse or rename. */
  id: string;
  /** Display name. Free to change anytime. */
  name: string;
  /** One-line description shown on the card. */
  blurb: string;
  /** PriceScore awarded on unlock. */
  points: number;
  category: AchievementCategory;
  /** Hidden until earned — shows as "???" beforehand. */
  secret?: boolean;
  /** Engine hook — the machine condition. Edited by Claude, not by hand. */
  trigger: string;
  /** Small ASCII / pixel-art icon — legible at tile size. A short motif (a few
   *  glyphs) that reads as the achievement at a glance, in the spirit of the
   *  ASCII PriceSprites. Optional while the icon pass fills the catalog; every
   *  achievement gets one before ship. */
  icon?: string;
}

const CORE_ACHIEVEMENTS: readonly Achievement[] = [
  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · minting — the heaviest points (incentivise primary spend)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'first_mint', name: 'First Light', blurb: 'Mint your first piece on PD.', points: 50, category: 'primary', trigger: 'mint.count>=1' },
  { id: 'mint_5_projects', name: 'Patron', blurb: 'Mint from 5 different projects.', points: 75, category: 'primary', trigger: 'mint.distinctProjects>=5' },
  { id: 'mint_15_projects', name: 'Collector of Firsts', blurb: 'Mint from 15 different projects.', points: 150, category: 'primary', trigger: 'mint.distinctProjects>=15' },
  { id: 'mint_25_projects', name: 'Full House', blurb: 'Mint from 25 different projects.', points: 300, category: 'primary', trigger: 'mint.distinctProjects>=25' },
  { id: 'mint_deep', name: 'Deep Patron', blurb: 'Mint 5 pieces from a single project.', points: 60, category: 'primary', trigger: 'mint.maxPerProject>=5' },
  { id: 'mint_day_one', name: 'Day One', blurb: 'Mint a project within 24h of its upload.', points: 60, category: 'primary', trigger: 'mint.withinUploadHours<=24' },
  { id: 'mint_whale', name: 'Whale Splash', blurb: 'Spend 0.5+ ETH in a single mint.', points: 150, category: 'primary', trigger: 'mint.singleSpendEth>=0.5' },
  { id: 'mint_closer', name: 'The Closer', blurb: 'Mint the piece that sells a project out.', points: 200, category: 'primary', secret: true, trigger: 'mint.causedSellout' },
  { id: 'primary_1eth', name: 'Primary Believer', blurb: '0.25 ETH in total primary spend.', points: 80, category: 'primary', trigger: 'primary.totalEth>=0.25' },
  { id: 'primary_5eth', name: 'Primary Pillar', blurb: '1 ETH in total primary spend.', points: 200, category: 'primary', trigger: 'primary.totalEth>=1' },
  { id: 'primary_10eth', name: 'Primary Patron Saint', blurb: '5 ETH in total primary spend.', points: 350, category: 'primary', trigger: 'primary.totalEth>=5' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · secondary market — flipping rewarded, never punished
  // ─────────────────────────────────────────────────────────────────────
  { id: 'first_buy', name: 'On the Board', blurb: 'Buy your first piece on the secondary market.', points: 40, category: 'trading', trigger: 'buy.count>=1' },
  { id: 'first_list', name: 'Open for Business', blurb: 'List a piece for sale.', points: 20, category: 'trading', trigger: 'list.count>=1' },
  { id: 'first_sale', name: 'First Exit', blurb: 'Sell a piece to another collector.', points: 40, category: 'trading', trigger: 'sale.count>=1' },
  { id: 'first_offer', name: 'Make an Offer', blurb: 'Place your first offer.', points: 20, category: 'trading', trigger: 'offerMade.count>=1' },
  { id: 'offer_accepted', name: 'Deal Maker', blurb: 'Get one of your offers accepted.', points: 40, category: 'trading', trigger: 'offerMade.acceptedCount>=1' },
  { id: 'accept_offer', name: 'Liquidity Provider', blurb: 'Accept an offer on one of your pieces.', points: 40, category: 'trading', trigger: 'offerAccepted.count>=1' },
  { id: 'quick_flip', name: 'Quick Flip', blurb: 'Sell a piece within an hour of buying it.', points: 60, category: 'trading', trigger: 'flip.fastestMinutes<=60' },
  { id: 'green_candle', name: 'Green Candle', blurb: 'Sell a piece for more than you paid.', points: 75, category: 'trading', trigger: 'flip.profitableCount>=1' },
  { id: 'trades_10', name: 'Active Hands', blurb: 'Complete 10 trades.', points: 80, category: 'trading', trigger: 'trades.count>=10' },
  { id: 'trades_50', name: 'High Frequency', blurb: 'Complete 50 trades.', points: 200, category: 'trading', trigger: 'trades.count>=50' },
  { id: 'volume_1', name: 'Trader', blurb: '0.5 ETH in secondary volume.', points: 60, category: 'trading', trigger: 'secondary.totalEth>=0.5' },
  { id: 'volume_5', name: 'Market Mover', blurb: '2 ETH in secondary volume.', points: 150, category: 'trading', trigger: 'secondary.totalEth>=2' },
  { id: 'volume_25', name: 'Whale', blurb: '10 ETH in total volume.', points: 400, category: 'trading', trigger: 'volume.totalEth>=10' },
  { id: 'sniper', name: 'Sniper', blurb: 'Buy a piece within a minute of it being listed.', points: 80, category: 'trading', secret: true, trigger: 'buy.fastestListMinutes<=1' },
  // OIL RIDER — PD-native lore. Faith + patience + payoff: hold a long while,
  // then sell for a big multiple. Stands alone, truly earned. (Engine: a sale
  // of a piece held >= 365 days for >= 3x its acquisition price. See
  // docs/pricerank-build-notes.md — special evaluator `oil.rider`.)
  { id: 'oil_rider', name: 'Oil Rider', blurb: 'Hold through the long dark, keep the faith, then sell for 3×+ after a year or more. You rode the oil.', points: 300, category: 'trading', trigger: 'oil.rider' },

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · the people graph (followers / following / mutuals)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'claim_name', name: 'Identity', blurb: 'Claim your @name.', points: 25, category: 'social', trigger: 'handle.claimed' },
  { id: 'first_follow', name: 'Reaching Out', blurb: 'Follow someone.', points: 10, category: 'social', trigger: 'following.count>=1' },
  { id: 'first_follower', name: 'Noticed', blurb: 'Get your first follower.', points: 15, category: 'social', trigger: 'followers.count>=1' },
  { id: 'followers_10', name: 'Voice', blurb: 'Reach 10 followers.', points: 40, category: 'social', trigger: 'followers.count>=10' },
  { id: 'followers_50', name: 'Influence', blurb: 'Reach 50 followers.', points: 120, category: 'social', trigger: 'followers.count>=50' },
  { id: 'followers_100', name: 'KOL', blurb: 'Reach 100 followers. You know what you are.', points: 250, category: 'social', trigger: 'followers.count>=100' },
  { id: 'first_mutual', name: 'Kindred', blurb: 'Get your first mutual.', points: 20, category: 'social', trigger: 'mutuals.count>=1' },
  { id: 'mutuals_10', name: 'Inner Circle', blurb: 'Reach 10 mutuals.', points: 60, category: 'social', trigger: 'mutuals.count>=10' },
  { id: 'following_10', name: 'Curious', blurb: 'Follow 10 people.', points: 20, category: 'social', trigger: 'following.count>=10' },
  { id: 'following_50', name: 'Networker', blurb: 'Follow 50 people.', points: 50, category: 'social', trigger: 'following.count>=50' },
  { id: 'punching_up', name: 'Punching Up', blurb: 'Get followed by someone who outranks you.', points: 50, category: 'social', secret: true, trigger: 'followers.byHigherRank>=1' },
  { id: 'patrons_eye', name: "Patron's Eye", blurb: 'Follow an artist whose work you own.', points: 20, category: 'social', trigger: 'following.ownedArtist>=1' },

  // ─────────────────────────────────────────────────────────────────────
  //  PROJECTS · following projects
  // ─────────────────────────────────────────────────────────────────────
  { id: 'follow_project_1', name: 'Tuned In', blurb: 'Follow your first project.', points: 15, category: 'projects', trigger: 'projectFollows.count>=1' },
  { id: 'follow_project_10', name: 'Watchlist', blurb: 'Follow 10 projects.', points: 40, category: 'projects', trigger: 'projectFollows.count>=10' },
  { id: 'early_signal', name: 'Early Signal', blurb: 'Be one of the first 10 to follow a project.', points: 50, category: 'projects', secret: true, trigger: 'projectFollows.earlyCount>=1' },
  { id: 'patient_zero', name: 'Patient Zero', blurb: 'Be the very first follower of any project.', points: 75, category: 'projects', secret: true, trigger: 'projectFollows.firstEver>=1' },

  // ─────────────────────────────────────────────────────────────────────
  //  ANOINTING · the curation / blessing system
  // ─────────────────────────────────────────────────────────────────────
  // ANOINTING — ONE Pledge of Fealty per account (docs/anointment-egregore-spec.md).
  { id: 'anoint_placed', name: 'The Pledge', blurb: 'Place your one Anointment — your Pledge of Fealty to a Project.', points: 40, category: 'anointing', trigger: 'anoint.placed' },
  { id: 'anoint_cult', name: 'Cult Member', blurb: 'A Project you anointed rises to The Cult.', points: 80, category: 'anointing', trigger: 'anoint.projectLevel>=1' },
  { id: 'anoint_egregore', name: 'Egregore', blurb: 'A Project you anointed awakens its Egregore.', points: 200, category: 'anointing', trigger: 'anoint.projectLevel>=2' },
  { id: 'anoint_prime_mover', name: 'Prime Mover', blurb: 'The Output you chose as your conduit becomes the Project’s Prime Relic.', points: 120, category: 'anointing', secret: true, trigger: 'anoint.conduitIsPrimeRelic' },
  { id: 'anoint_fealty', name: 'Fealty', blurb: 'Keep your Anointment on one Project past the 60-day lock.', points: 60, category: 'anointing', trigger: 'anoint.heldDays>=60' },
  { id: 'anoint_faithful', name: 'True Believer', blurb: 'Hold your Anointment on a single Project for a full year.', points: 200, category: 'anointing', trigger: 'anoint.heldDays>=365' },
  { id: 'anoint_early_faith', name: 'Early Faith', blurb: 'Anoint a Project before it reaches The Cult.', points: 150, category: 'anointing', secret: true, trigger: 'anoint.earlyToCult' },
  { id: 'own_prime_relic', name: 'Relic Holder', blurb: 'Own the Prime Relic of a Project.', points: 100, category: 'anointing', secret: true, trigger: 'holdings.primeRelic>=1' },
  { id: 'conduit_blessed', name: 'Blessed', blurb: 'An Output you own is chosen as someone’s conduit.', points: 50, category: 'anointing', trigger: 'anoint.conduitReceived>=1' },

  // ─────────────────────────────────────────────────────────────────────
  //  STREAK · PriceStreak milestones (60 = activation = the surprise)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'streak_60', name: 'Devoted', blurb: 'Reach a 60-day PriceStreak.', points: 150, category: 'streak', trigger: 'streak.days>=60' },
  { id: 'streak_100', name: 'Centurion', blurb: 'Reach a 100-day PriceStreak.', points: 250, category: 'streak', trigger: 'streak.days>=100' },
  { id: 'streak_180', name: 'Half-Year Heart', blurb: 'Reach a 180-day PriceStreak.', points: 400, category: 'streak', trigger: 'streak.days>=180' },
  { id: 'streak_365', name: 'Year of Price', blurb: 'Reach a 365-day PriceStreak.', points: 750, category: 'streak', trigger: 'streak.days>=365' },
  { id: 'phoenix', name: 'Phoenix', blurb: 'Rebuild a 30-day streak after losing a 60+.', points: 100, category: 'streak', secret: true, trigger: 'streak.rebuiltAfter60>=30' },

  // ─────────────────────────────────────────────────────────────────────
  //  OG · longevity / join-date cohorts (the date is already on profiles)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'og_founding', name: 'Founding Member', blurb: "Joined in PD's first cohort.", points: 200, category: 'og', secret: true, trigger: 'joinedBefore.foundingCutoff' },
  { id: 'og_year_one', name: 'Year One', blurb: "Joined within PD's first year.", points: 100, category: 'og', trigger: 'joinedBefore.yearOneCutoff' },
  { id: 'anniversary_1', name: 'One Year In', blurb: 'One year since you joined PD.', points: 80, category: 'og', trigger: 'tenure.years>=1' },
  { id: 'anniversary_2', name: 'Veteran', blurb: 'Two years since you joined PD.', points: 150, category: 'og', trigger: 'tenure.years>=2' },

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · albums, stars, wishlist, targets, showcase
  // ─────────────────────────────────────────────────────────────────────
  { id: 'first_album', name: 'Shelf Life', blurb: 'Create your first album.', points: 15, category: 'curation', trigger: 'albums.count>=1' },
  { id: 'album_filled', name: 'Curated', blurb: 'Fill an album with 10 pieces.', points: 40, category: 'curation', trigger: 'albums.maxItems>=10' },
  { id: 'first_star', name: 'Star Struck', blurb: 'Star a piece.', points: 5, category: 'curation', trigger: 'stars.count>=1' },
  { id: 'stars_25', name: 'Constellation', blurb: 'Star 25 pieces.', points: 30, category: 'curation', trigger: 'stars.count>=25' },
  { id: 'first_wishlist', name: 'Wishful', blurb: 'Add a piece to your wishlist.', points: 5, category: 'curation', trigger: 'wishlist.count>=1' },
  { id: 'manifested', name: 'Manifested', blurb: 'Buy a piece off your own wishlist.', points: 40, category: 'curation', secret: true, trigger: 'wishlist.fulfilled>=1' },
  { id: 'first_target', name: 'Price Caller', blurb: 'Set a price target.', points: 15, category: 'curation', trigger: 'targets.count>=1' },
  { id: 'called_it', name: 'Called It', blurb: 'A price target you set gets hit.', points: 100, category: 'curation', secret: true, trigger: 'targets.hit>=1' },
  { id: 'showcase_full', name: 'Showroom', blurb: 'Fill all six showcase slots.', points: 30, category: 'curation', trigger: 'showcase.filledSlots>=6' },
  { id: 'own_10_projects', name: 'Diversified', blurb: 'Own pieces from 10 different projects.', points: 80, category: 'curation', trigger: 'holdings.distinctProjects>=10' },
  { id: 'own_25_projects', name: 'Encyclopedic', blurb: 'Own pieces from 25 different projects.', points: 200, category: 'curation', trigger: 'holdings.distinctProjects>=25' },

  // ─────────────────────────────────────────────────────────────────────
  //  IDENTITY · profile completeness
  // ─────────────────────────────────────────────────────────────────────
  { id: 'set_sprite', name: 'Soulbound', blurb: 'Choose your PriceSprite.', points: 15, category: 'identity', trigger: 'profile.spriteSet' },
  { id: 'export_plate', name: 'Calling Card', blurb: 'Export your identity plate.', points: 20, category: 'identity', trigger: 'profile.plateExported' },
  { id: 'set_color', name: 'True Colours', blurb: 'Set a custom profile colour.', points: 10, category: 'identity', trigger: 'profile.colorSet' },
  { id: 'discord_link', name: 'Bridged', blurb: 'Link your Discord.', points: 20, category: 'identity', trigger: 'profile.discordLinked' },
  { id: 'full_profile', name: 'Fully Formed', blurb: 'Complete every profile field.', points: 40, category: 'identity', trigger: 'profile.complete' },

  // ─────────────────────────────────────────────────────────────────────
  //  RANK · meta milestones (Score / Rank / leaderboard / seasons)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'rank_2', name: 'Climbing', blurb: 'Reach PriceRank 2.', points: 25, category: 'rank', trigger: 'rank.tier>=2' },
  { id: 'rank_5', name: 'GMI', blurb: "Reach PriceRank 5. You're gonna make it.", points: 100, category: 'rank', trigger: 'rank.tier>=5' },
  { id: 'rank_10', name: 'Apex', blurb: 'Reach the top PriceRank tier.', points: 500, category: 'rank', trigger: 'rank.tier>=10' },
  { id: 'score_1000', name: 'Four Figures', blurb: 'Reach 1,000 PriceScore.', points: 50, category: 'rank', trigger: 'score.total>=1000' },
  { id: 'score_5000', name: 'Stacked', blurb: 'Reach 5,000 PriceScore.', points: 150, category: 'rank', trigger: 'score.total>=5000' },
  { id: 'leaderboard_100', name: 'Ranked', blurb: 'Enter the top 100 on the leaderboard.', points: 100, category: 'rank', trigger: 'leaderboard.bestRank<=100' },
  { id: 'world_first', name: 'World #1', blurb: 'Hit #1 on the leaderboard.', points: 1000, category: 'rank', secret: true, trigger: 'leaderboard.bestRank<=1' },
  { id: 'season_champion', name: 'Champion', blurb: 'Finish a season at #1.', points: 500, category: 'rank', trigger: 'season.bestFinish<=1' },
  { id: 'season_podium', name: 'Podium', blurb: 'Finish a season in the top 10.', points: 200, category: 'rank', trigger: 'season.bestFinish<=10' },
  // MJÖLNIR — the summit of the whole 1,000. The threshold is set by the
  // two-year wall (tools/achievements/verify.js proves it on every edit):
  // unreachable before day 730 no matter the spend, reachable the day the
  // Two-Year Oath lands for a collector who has done essentially everything.
  { id: 'mjolnir', name: 'Mjölnir', blurb: 'Reach 186,000 PriceScore — the whole mountain, essentially everything, two years at the least — and Brendon himself, God of PD, deems you worthy and places the hammer in your hand. The highest honour on PD.', points: 1000, category: 'rank', trigger: 'score.total>=186000' },

  // ─────────────────────────────────────────────────────────────────────
  //  ARTIST · creator-side (you uploaded the project)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'artist_upload', name: 'Genesis', blurb: 'Upload your first project.', points: 100, category: 'artist', trigger: 'artist.projects>=1' },
  { id: 'artist_first_sale', name: "Artist's First", blurb: 'Sell your first piece as a creator.', points: 60, category: 'artist', trigger: 'artist.primarySales>=1' },
  { id: 'artist_sellout', name: 'Sold Out', blurb: 'Sell out one of your projects.', points: 300, category: 'artist', trigger: 'artist.selloutProjects>=1' },
  { id: 'artist_100_holders', name: 'Beloved', blurb: 'Reach 100 holders on your work.', points: 200, category: 'artist', trigger: 'artist.holders>=100' },
  { id: 'artist_volume', name: 'Blue Chip', blurb: '10 ETH secondary volume on your work.', points: 250, category: 'artist', trigger: 'artist.secondaryEth>=10' },
  { id: 'artist_followed_500', name: 'Following', blurb: 'Reach 500 followers across your projects.', points: 250, category: 'artist', trigger: 'artist.projectFollowers>=500' },

  // ─────────────────────────────────────────────────────────────────────
  //  LORE · the easter eggs (all secret) — the screenshot bait
  // ─────────────────────────────────────────────────────────────────────
  { id: 'token_69', name: 'Nice.', blurb: 'Own a token numbered 69.', points: 69, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==69' },
  { id: 'token_67', name: '6-7', blurb: 'Own token #67. Why? Nobody knows. Six seven.', points: 67, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==67' },
  { id: 'token_420', name: 'Blaze It', blurb: 'Own a token numbered 420.', points: 420, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==420' },
  { id: 'token_42', name: 'Deep Thought', blurb: 'Own token #42 — the answer to life, the universe, and everything.', points: 42, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==42' },
  { id: 'token_1337', name: 'Leet', blurb: 'Own a token numbered 1337.', points: 100, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==1337' },
  { id: 'token_1', name: 'The One', blurb: 'Own the #1 token of any project.', points: 50, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==1' },
  // Angel numbers — mystical, magical, encouraged. (No 666. Ever.)
  { id: 'token_777', name: 'Angel Number', blurb: 'Own token #777 — the universe is winking at you.', points: 77, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==777' },
  { id: 'token_888', name: 'Infinite Abundance', blurb: 'Own token #888 — flow and fortune.', points: 88, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==888' },
  { id: 'token_1111', name: 'Make a Wish', blurb: 'Own token #1111 — the portal is open.', points: 111, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==1111' },
  // Personal + numerology.
  { id: 'token_22', name: 'Lucky 22', blurb: 'Own token #22.', points: 22, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==22' },
  { id: 'token_85', name: "Class of '85", blurb: 'Own token #85. A very good year.', points: 85, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==85' },
  { id: 'token_18', name: 'Master Number', blurb: 'Own token #18.', points: 18, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==18' },
  // For the creative coders — math + gen-art number references.
  { id: 'token_144', name: 'Fibonacci', blurb: 'Own token #144 — a perfect square, and a number in the sequence.', points: 21, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==144' },
  { id: 'token_256', name: 'Full Byte', blurb: 'Own token #256 — two to the eighth.', points: 64, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==256' },
  { id: 'token_314', name: 'Pi', blurb: 'Own token #314.', points: 31, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==314' },
  { id: 'token_1618', name: 'Golden Ratio', blurb: 'Own token #1618 — φ, the divine proportion.', points: 16, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==1618' },
  { id: 'token_1729', name: 'Taxicab', blurb: 'Own token #1729 — the smallest number that is the sum of two cubes in two different ways.', points: 100, category: 'lore', secret: true, trigger: 'holdings.tokenNumber==1729' },
  { id: 'midnight_mint', name: 'Witching Hour', blurb: 'Mint between midnight and 1am.', points: 30, category: 'lore', secret: true, trigger: 'mint.hourLocal==0' },
  { id: 'four_twenty', name: 'Right on Time', blurb: 'Take any action at 4:20.', points: 20, category: 'lore', secret: true, trigger: 'action.time==4:20' },
  { id: 'full_moon', name: 'Lunatic', blurb: 'Trade on a full moon.', points: 40, category: 'lore', secret: true, trigger: 'trade.fullMoon' },
  { id: 'konami', name: '↑↑↓↓←→←→BA', blurb: 'Enter the Konami code.', points: 50, category: 'lore', secret: true, trigger: 'ui.konami' },
  { id: 'studious', name: 'Studious', blurb: 'Read the docs.', points: 15, category: 'lore', secret: true, trigger: 'ui.readDocs' },
  { id: 'round_number', name: 'Round Number', blurb: 'Buy a piece for exactly 1.00 ETH.', points: 30, category: 'lore', secret: true, trigger: 'buy.priceEth==1.00' },
  { id: 'floor_sweeper', name: 'Floor Sweeper', blurb: 'Buy a piece at the exact floor price.', points: 40, category: 'lore', secret: true, trigger: 'buy.atFloor' },
  { id: 'spree', name: 'Spree', blurb: 'Make 10 purchases in one day.', points: 80, category: 'lore', secret: true, trigger: 'buy.inDay>=10' },
  { id: 'blessing_rampage', name: 'Blessing Rampage', blurb: 'Anoint 10 pieces in one day.', points: 50, category: 'lore', secret: true, trigger: 'anoint.inDay>=10' },
  { id: 'social_butterfly', name: 'Social Butterfly', blurb: 'Follow 20 people in one day.', points: 40, category: 'lore', secret: true, trigger: 'follow.inDay>=20' },
  { id: 'vain', name: 'Vain', blurb: 'Search your own @name.', points: 5, category: 'lore', secret: true, trigger: 'ui.searchedSelf' },
  { id: 'comeback', name: 'Long Time No See', blurb: 'Return after 30 days away.', points: 20, category: 'lore', secret: true, trigger: 'session.returnedAfterDays>=30' },
  { id: 'nocturnal', name: 'Nocturnal', blurb: 'Rack up 50 actions between 2 and 5am.', points: 40, category: 'lore', secret: true, trigger: 'action.lateNightCount>=50' },
  { id: 'petey', name: "Who's a Good Boy", blurb: 'Find Petey.', points: 30, category: 'lore', secret: true, trigger: 'ui.foundPetey' },
  { id: 'spellbound', name: 'Spellbound', blurb: 'Toggle every spell at least once.', points: 60, category: 'lore', secret: true, trigger: 'spells.allToggled' },
  { id: 'the_cards_know', name: 'The Cards Know', blurb: 'Pull a tarot.', points: 20, category: 'lore', secret: true, trigger: 'spells.tarotPulled' },
  { id: 'mythic', name: 'Mythic', blurb: 'Own a piece that reaches mythic status.', points: 150, category: 'lore', secret: true, trigger: 'holdings.mythic>=1' },
  { id: 'round_trip', name: 'Round Trip', blurb: 'Buy and later sell a piece from the same project.', points: 30, category: 'lore', secret: true, trigger: 'trade.roundTrip>=1' },
  { id: 'whale_watcher', name: 'Whale Watcher', blurb: 'Follow five top-100 users.', points: 40, category: 'lore', secret: true, trigger: 'following.top100>=5' },
  { id: 'origin_story', name: 'Origin Story', blurb: 'Own a piece from the first project minted on PD.', points: 100, category: 'lore', secret: true, trigger: 'holdings.firstProject>=1' },
  { id: 'completionist', name: 'Completionist', blurb: 'Unlock every non-secret achievement.', points: 500, category: 'lore', secret: true, trigger: 'meta.allNonSecretUnlocked' },
  { id: 'agartha', name: 'Agartha', blurb: 'You found the world beneath the world.', points: 88, category: 'lore', secret: true, trigger: 'ui.foundAgartha' },
  { id: 'the_wanderer', name: 'The Wanderer', blurb: 'Odin appeared, and shared his counsel.', points: 77, category: 'lore', secret: true, trigger: 'odin.appeared' },
  // BRENDON — God of PD. Rarer-than-common figure (a tier above Odin). See lib/achievements/brendon.ts.
  { id: 'brendon_audience', name: 'Audience with God', blurb: 'Brendon himself — the Creator of PD — appeared in your hall. Few ever see him.', points: 111, category: 'lore', secret: true, trigger: 'brendon.appeared' },
  { id: 'brendon_worthy', name: 'Deemed Worthy', blurb: 'The Creator weighed your climb and judged it worthy.', points: 222, category: 'lore', secret: true, trigger: 'brendon.blessing' },
  { id: 'brendon_chosen', name: 'The Chosen', blurb: 'Brendon chose you. Almost no one is chosen.', points: 333, category: 'lore', secret: true, trigger: 'brendon.chosen' },
  // Gen-art collecting — for the long-form heads. The ‰ in our logo lives here.
  { id: 'prime_id', name: 'Prime', blurb: 'Own a token whose number is prime.', points: 31, category: 'lore', secret: true, trigger: 'holdings.tokenNumberPrime' },
  { id: 'one_of_one', name: 'One of One', blurb: 'Own a 1-of-1 — an edition of a single piece.', points: 50, category: 'lore', secret: true, trigger: 'holdings.editionOfOne>=1' },
  { id: 'long_form', name: 'Long-Form', blurb: 'Hold 50 pieces from a single project — a true long-form set.', points: 89, category: 'lore', secret: true, trigger: 'holdings.maxPerProject>=50' },
  { id: 'per_mille', name: 'Per Mille', blurb: 'Hold 1,000 pieces — one full per mille of devotion. ‰', points: 250, category: 'lore', secret: true, trigger: 'holdings.total>=1000' },
] as const;

/**
 * The FULL catalog = curated core + the themed batch modules (ladders, myth,
 * numbers, depth, tenure). Deduped on id — first definition wins, so a core
 * entry always beats a batch collision. Both the engine and the UI read THIS,
 * so there's one source of truth. The whole game is 1,000 achievements —
 * verified by tools/achievements/verify.js (run it after ANY catalog edit).
 */
export const ACHIEVEMENTS: readonly Achievement[] = (() => {
  const seen = new Set<string>();
  const out: Achievement[] = [];
  for (const a of [
    ...CORE_ACHIEVEMENTS,
    ...LADDER_ACHIEVEMENTS,
    ...MYTH_ACHIEVEMENTS,
    ...NUMBER_ACHIEVEMENTS,
    ...DEPTH_ACHIEVEMENTS,
    ...TENURE_ACHIEVEMENTS,
  ]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
})();

/** Fast lookup by id. */
export const ACHIEVEMENTS_BY_ID: ReadonlyMap<string, Achievement> = new Map(
  ACHIEVEMENTS.map((a) => [a.id, a])
);

/** Total PriceScore available if every achievement is unlocked. */
export const MAX_PRICE_SCORE: number = ACHIEVEMENTS.reduce((sum, a) => sum + a.points, 0);

/** Count of visible (non-secret) achievements — for "X / Y unlocked" displays. */
export const VISIBLE_COUNT: number = ACHIEVEMENTS.filter((a) => !a.secret).length;
