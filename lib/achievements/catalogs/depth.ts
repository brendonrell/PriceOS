/**
 * ════════════════════════════════════════════════════════════════════════
 *  PriceOS — DEPTH ACHIEVEMENTS  (the ladder bank behind the 1,000)
 * ════════════════════════════════════════════════════════════════════════
 *
 * The long climb, densified: every progression family gets a full ladder of
 * rungs between and beyond the core + ladders modules, so the wall always has
 * a next thing within reach AND a horizon years out. Same `Achievement`
 * shape, same trigger DSL, zero engine changes.
 *
 * FORMAT — each family is a compact table of rungs: [threshold, points, name].
 * Brendon edits names/points right in the tables. The blurb is the family's
 * sentence with the number filled in (a rung can override with a 4th entry).
 *
 * CONVENTIONS
 *   • ids are `d_<family>_<threshold>`, unique, never reused.
 *   • Thresholds JUMP — no consecutive-int spam. No 666 anywhere.
 *   • Nothing ≥ 1000 points — Mjölnir (core) owns the 1000 capstone.
 *   • Free/sybil-able families (social, curation, streak, anoints) still
 *     carry visible points but are score-capped by the engine's gameable
 *     rule — the rank economy only moves on un-fakeable deeds.
 */

import type { Achievement, AchievementCategory } from '../catalog';

type Rung = readonly [threshold: number, points: number, name: string, blurb?: string];

const fmt = (n: number): string => n.toLocaleString('en-US');

function ladder(
  family: string,
  path: string,
  category: AchievementCategory,
  blurbFor: (n: number) => string,
  rungs: readonly Rung[]
): Achievement[] {
  return rungs.map(([n, points, name, blurb]) => ({
    id: `d_${family}_${String(n).replace('.', '_')}`,
    name,
    blurb: blurb ?? blurbFor(n),
    points,
    category,
    trigger: `${path}>=${n}`,
  }));
}

export const DEPTH_ACHIEVEMENTS: readonly Achievement[] = [
  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · lifetime mint count
  // ─────────────────────────────────────────────────────────────────────
  // ⛔ 2026-08-03 DE-SPAM STRETCH (Brendon: "is there no way to push these
  // out further outside of the key ones?"). Every action-count family below
  // was RESPACED: the early filler rungs that popped in a user's first
  // sessions moved out past the curated key milestones (core + ladders,
  // untouched), and the whole family breathes wider. Each family keeps its
  // exact rung COUNT and its exact POINTS sequence — so the catalog stays
  // 1,000, no total moved, and the Mjölnir wall is unchanged (verifier
  // re-proven). Money-gated (ETH), time-gated (streak/tenure), rank and
  // artist families were left alone — those are earned, not spam.
  ...ladder('mint', 'mint.count', 'primary', (n) => `Mint ${fmt(n)} pieces.`, [
    [35, 35, 'Thirty-Five Fresh'],
    [65, 80, 'Sixty-Five Strong'],
    [85, 95, 'Eighty-Five'],
    [135, 125, 'Mint Condition'],
    [165, 155, 'One Sixty-Five'],
    [200, 200, 'Two Hundred Club'],
    [225, 230, 'Two Twenty-Five'],
    [275, 250, 'The Long Run'],
    [300, 310, 'Three Hundred Mints'],
    [350, 340, 'Mint Machine'],
    [400, 365, 'Four Hundred Strong'],
    [450, 390, 'Relentless'],
    [550, 405, 'The Foundry'],
    [600, 440, 'Six Hundred Mints'],
    [650, 460, 'Coining'],
    [700, 495, 'Seven Hundred Mints'],
    [750, 530, 'The Press Never Sleeps'],
    [800, 565, 'Eight Hundred Mints'],
    [850, 620, 'Nearly Nine'],
    [900, 645, 'Nine Hundred Mints'],
    [950, 665, 'The Approach'],
    [1100, 690, 'Past a Thousand Mints'],
    [1250, 710, 'Twelve Fifty'],
    [1400, 730, 'Fourteen Hundred'],
    [1500, 750, 'Fifteen Hundred Mints'],
    [1600, 770, 'Sixteen Hundred'],
    [1750, 790, 'The Great Library'],
    [1900, 860, 'Nineteen Hundred'],
    [2000, 880, 'Two Thousand Mints'],
    [2200, 900, 'Twenty-Two Hundred'],
    [2400, 920, 'Twenty-Four Hundred'],
    [2600, 940, 'Twenty-Six Hundred'],
    [2800, 960, 'The Mint Eternal', 'Mint 2,800 pieces. The press is part of you now.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · distinct projects minted
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('mintproj', 'mint.distinctProjects', 'primary', (n) => `Mint from ${n} different projects.`, [
    [8, 55, 'Eight Doors'],
    [12, 70, 'A Dozen Doors'],
    [18, 90, 'Eighteen Rooms'],
    [22, 110, 'Twenty-Two Flavours'],
    [28, 175, 'Twenty-Eight Wide'],
    [31, 200, 'Thirty-One Doors'],
    [34, 230, 'Thirty-Four In'],
    [36, 305, 'Thirty-Six Wide'],
    [38, 350, 'Thirty-Eight In'],
    [41, 385, 'Forty-One Doors'],
    [43, 420, 'Forty-Three Wide'],
    [46, 480, 'Forty-Six Deep'],
    [48, 530, 'Two Shy of All'],
    [49, 600, 'One Shy of All', 'Mint from 49 different projects — one shy of the whole roster.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · mints from a single project (depth of conviction)
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('mintdeep', 'mint.maxPerProject', 'primary', (n) => `Mint ${fmt(n)} pieces from a single project.`, [
    [12, 55, 'Twelve of One'],
    [20, 75, 'Twenty of One'],
    [25, 95, 'Quarter Hundred'],
    [35, 110, 'Thirty-Five Down'],
    [40, 170, 'Forty of a Kind'],
    [45, 205, 'Forty-Five Straight'],
    [60, 275, 'Sixty In'],
    [70, 310, 'Seventy Deep'],
    [80, 345, 'Eighty of One'],
    [90, 430, 'Ninety Committed'],
    [110, 470, 'A Hundred Ten Deep'],
    [125, 510, 'A Hundred Twenty-Five'],
    [150, 555, 'The One-Fifty'],
    [175, 650, 'One Seventy-Five Deep'],
    [200, 700, 'Two Hundred of One'],
    [225, 740, 'Two Twenty-Five of One'],
    [250, 790, 'Two-Fifty Conviction'],
    [275, 850, 'Two Seventy-Five Deep'],
    [300, 900, 'The Whole Edition', 'Mint 300 pieces from a single project. At some point it became yours.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · total ETH into primary — THE FATTEST POINTS
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('primeth', 'primary.totalEth', 'primary', (n) => `${n} ETH in total primary spend.`, [
    [0.15, 80, 'A Real Position'],
    [0.35, 130, 'Third of the Way'],
    [0.75, 190, 'Three Quarters In'],
    [1.5, 260, 'One and a Half'],
    [2.5, 340, 'Two Point Five'],
    [4, 440, 'Four In'],
    [6, 520, 'Six ETH Deep'],
    [7, 550, 'Lucky Seven In'],
    [8, 580, 'Eight In'],
    [12, 640, 'Twelve Deep'],
    [15, 670, 'Fifteen Strong'],
    [18, 700, 'Eighteen In'],
    [20, 730, 'Twenty ETH of Faith'],
    [30, 780, 'Thirty In'],
    [35, 800, 'Thirty-Five In'],
    [40, 820, 'The Forty'],
    [50, 850, 'Fifty ETH of Conviction'],
    [60, 870, 'Sixty Deep'],
    [75, 890, 'Patron of Patrons'],
    [100, 950, 'The Hundred', '100 ETH in lifetime primary spend. The platform is partly load-bearing on you.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · secondary volume (ETH)
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('seceth', 'secondary.totalEth', 'trading', (n) => `${n} ETH in secondary volume.`, [
    [0.25, 35, 'Quarter Through'],
    [1, 85, 'One Through the Book'],
    [1.5, 110, 'One and a Half Moved'],
    [3, 175, 'Three Through'],
    [4, 205, 'Four Moved'],
    [6, 255, 'Six Through the Book'],
    [7, 275, 'Seven Moved'],
    [8, 295, 'Eight Through'],
    [12, 385, 'Twelve Through'],
    [15, 430, 'Fifteen Moved'],
    [20, 490, 'Twenty Through'],
    [30, 570, 'Thirty Through the Book'],
    [35, 605, 'Thirty-Five Moved'],
    [40, 640, 'Forty Through'],
    [60, 810, 'Sixty Through'],
    [75, 850, 'Seventy-Five Moved'],
    [100, 900, 'A Hundred Through the Book', '100 ETH in secondary volume. You are a market fixture.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · total volume (primary + secondary)
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('voleth', 'volume.totalEth', 'trading', (n) => `${n} ETH in total volume.`, [
    [2, 95, 'Two Total'],
    [3, 130, 'Three Total'],
    [8, 260, 'Eight Total'],
    [12, 330, 'Twelve Total'],
    [15, 370, 'Fifteen Total'],
    [20, 440, 'Twenty Total'],
    [30, 540, 'Thirty Total'],
    [35, 580, 'Thirty-Five Total'],
    [45, 660, 'Forty-Five Total'],
    [60, 750, 'Sixty Total'],
    [70, 780, 'Seventy Total'],
    [80, 810, 'Eighty Total'],
    [90, 845, 'Ninety Total'],
    [125, 895, 'Undertow'],
    [150, 915, 'Current'],
    [200, 935, 'The Flood'],
    [250, 955, 'Storm Surge'],
    [300, 975, 'The Open Sea', '300 ETH in lifetime volume. Charts are drawn around you.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · trade count
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('trades', 'trades.count', 'trading', (n) => `Complete ${fmt(n)} trades.`, [
    [35, 90, 'Thirty-Five Crossings'],
    [65, 105, 'Sixty-Five Crossings'],
    [80, 135, 'Eighty Crossings'],
    [125, 165, 'A Hundred Twenty-Five Crossings'],
    [160, 215, 'A Hundred Sixty Crossings'],
    [175, 245, 'One Seventy-Five Crossings'],
    [200, 255, 'Two Hundred Crossings'],
    [300, 320, 'Three Hundred Crossings'],
    [350, 375, 'Three-Fifty Crossings'],
    [400, 395, 'Four Hundred Crossings'],
    [450, 460, 'Four-Fifty Crossings'],
    [600, 490, 'Six Hundred Crossings'],
    [650, 525, 'Six-Fifty Crossings'],
    [700, 560, 'Seven Hundred Crossings'],
    [800, 650, 'Eight Hundred Crossings'],
    [900, 690, 'Nine Hundred Crossings'],
    [1100, 730, 'Eleven Hundred Crossings'],
    [1250, 780, 'Twelve-Fifty Crossings'],
    [1400, 870, 'Fourteen Hundred Crossings'],
    [1500, 910, 'The Fifteen Hundred', 'Complete 1,500 trades. The order book dreams about you.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · buys
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('buy', 'buy.count', 'trading', (n) => `Buy ${fmt(n)} pieces on the secondary market.`, [
    [35, 85, 'Thirty-Five Bought'],
    [50, 105, 'Fifty Bought'],
    [65, 145, 'Sixty-Five Bought'],
    [80, 180, 'Eighty Bought'],
    [125, 210, 'A Hundred Twenty-Five Bought'],
    [150, 235, 'A Hundred Fifty Bought'],
    [175, 265, 'One Seventy-Five Bought'],
    [200, 275, 'Two Hundred Bought'],
    [300, 335, 'Three Hundred Bought'],
    [350, 360, 'Three-Fifty Bought'],
    [400, 385, 'Four Hundred Bought'],
    [450, 410, 'Four-Fifty Bought'],
    [550, 490, 'Five-Fifty Bought'],
    [600, 520, 'Six Hundred Bought'],
    [650, 555, 'Six-Fifty Bought'],
    [700, 590, 'Seven Hundred Bought'],
    [750, 680, 'The Vacuum', 'Buy 750 pieces on the secondary market. Floors fear you.'],
    [800, 740, 'Eight Hundred Bought'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · sales
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('sale', 'sale.count', 'trading', (n) => `Sell ${fmt(n)} pieces.`, [
    [35, 85, 'Thirty-Five Sold'],
    [50, 105, 'Fifty Sold'],
    [65, 145, 'Sixty-Five Sold'],
    [80, 180, 'Eighty Sold'],
    [125, 210, 'A Hundred Twenty-Five Sold'],
    [150, 235, 'A Hundred Fifty Sold'],
    [175, 265, 'One Seventy-Five Sold'],
    [200, 275, 'Two Hundred Sold'],
    [300, 335, 'Three Hundred Sold'],
    [350, 360, 'Three-Fifty Sold'],
    [400, 385, 'Four Hundred Sold'],
    [450, 410, 'Four-Fifty Sold'],
    [550, 490, 'Five-Fifty Sold'],
    [600, 520, 'Six Hundred Sold'],
    [650, 555, 'Six-Fifty Sold'],
    [700, 590, 'Seven Hundred Sold'],
    [750, 680, 'Always Another Buyer', 'Sell 750 pieces. Supply finds you charming.'],
    [800, 740, 'Eight Hundred Sold'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · listings
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('list', 'list.count', 'trading', (n) => `Create ${fmt(n)} listings.`, [
    [35, 55, 'Thirty-Five Listed'],
    [45, 70, 'Forty-Five Listed'],
    [65, 80, 'Sixty-Five Listed'],
    [80, 90, 'Eighty Listed'],
    [125, 110, 'A Hundred Twenty-Five Listed'],
    [150, 150, 'A Hundred Fifty Listed'],
    [175, 170, 'One Seventy-Five Listed'],
    [200, 180, 'Two Hundred Listed'],
    [300, 250, 'Three Hundred Listed'],
    [350, 280, 'Three-Fifty Listed'],
    [400, 305, 'Four Hundred Listed'],
    [450, 330, 'Four-Fifty Listed'],
    [500, 410, 'Five Hundred Listed'],
    [550, 440, 'Five-Fifty Listed'],
    [600, 470, 'Six Hundred Listed'],
    [650, 530, 'Six-Fifty Listed'],
    [700, 580, 'Seven Hundred Listed'],
    [750, 640, 'The Everything Store', 'Create 750 listings. If you own it, it has a price tag.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · offers made
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('offer', 'offerMade.count', 'trading', (n) => `Place ${fmt(n)} offers.`, [
    [35, 55, 'Thirty-Five Offers Out'],
    [45, 70, 'Forty-Five Offers Out'],
    [65, 80, 'Sixty-Five Offers Out'],
    [80, 90, 'Eighty Offers Out'],
    [125, 110, 'A Hundred Twenty-Five Offers'],
    [150, 150, 'A Hundred Fifty Offers'],
    [175, 170, 'One Seventy-Five Offers'],
    [200, 180, 'Two Hundred Offers'],
    [225, 250, 'Two Twenty-Five Offers'],
    [275, 280, 'Two Seventy-Five Offers'],
    [300, 305, 'Three Hundred Offers'],
    [350, 330, 'Three-Fifty Offers'],
    [400, 410, 'The Standing Bid', 'Place 400 offers. Owners check their pings and sigh your name.'],
    [450, 480, 'Four-Fifty Offers'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · your offers accepted
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('offeracc', 'offerMade.acceptedCount', 'trading', (n) => `Get ${fmt(n)} of your offers accepted.`, [
    [35, 145, 'Thirty-Five Landed'],
    [45, 180, 'Forty-Five Landed'],
    [60, 250, 'Sixty Landed'],
    [75, 310, 'Seventy-Five Landed'],
    [125, 355, 'A Hundred Twenty-Five Landed'],
    [150, 390, 'A Hundred Fifty Landed'],
    [200, 490, 'Two Hundred Landed'],
    [250, 550, 'Nothing Escapes', 'Get 250 of your offers accepted. Your number was simply correct.'],
    [300, 610, 'Three Hundred Landed'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · offers you accepted
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('accept', 'offerAccepted.count', 'trading', (n) => `Accept ${fmt(n)} offers on your pieces.`, [
    [35, 145, 'Thirty-Five Taken'],
    [45, 180, 'Forty-Five Taken'],
    [60, 250, 'Sixty Taken'],
    [75, 310, 'Seventy-Five Taken'],
    [125, 340, 'A Hundred Twenty-Five Taken'],
    [150, 365, 'A Hundred Fifty Taken'],
    [175, 395, 'One Seventy-Five Taken'],
    [200, 495, 'Two Hundred Taken'],
    [250, 555, 'Everything Has a Price', 'Accept 250 offers. And you always knew yours.'],
    [300, 615, 'Three Hundred Taken'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · followers
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('followers', 'followers.count', 'social', (n) => `Reach ${fmt(n)} followers.`, [
    [65, 50, 'Sixty-Five Listening'],
    [80, 65, 'Eighty Listening'],
    [125, 75, 'A Hundred Twenty-Five Listening'],
    [150, 85, 'A Hundred Fifty Listening'],
    [175, 105, 'One Seventy-Five Listening'],
    [200, 140, 'Two Hundred Listening'],
    [300, 160, 'Three Hundred Listening'],
    [350, 170, 'Three-Fifty Listening'],
    [400, 240, 'Four Hundred Listening'],
    [450, 260, 'Four-Fifty Listening'],
    [600, 285, 'Six Hundred Listening'],
    [650, 305, 'Six-Fifty Listening'],
    [750, 370, 'Seven-Fifty Listening'],
    [800, 395, 'Eight Hundred Listening'],
    [1250, 425, 'Twelve-Fifty Listening'],
    [1500, 530, 'Fifteen Hundred Listening'],
    [2000, 580, 'Two Thousand Listening'],
    [2500, 720, 'Twenty-Five Hundred Listening'],
    [3000, 770, 'Three Thousand Listening'],
    [3500, 800, 'Thirty-Five Hundred Listening'],
    [4000, 830, 'Four Thousand Strong', 'Reach 4,000 followers. When you type, the platform leans in.'],
    [4500, 860, 'Forty-Five Hundred Listening'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · following
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('following', 'following.count', 'social', (n) => `Follow ${fmt(n)} people.`, [
    [35, 30, 'Thirty-Five Followed'],
    [65, 35, 'Sixty-Five Followed'],
    [80, 40, 'Eighty Followed'],
    [125, 45, 'A Hundred Twenty-Five Followed'],
    [150, 55, 'A Hundred Fifty Followed'],
    [175, 65, 'One Seventy-Five Followed'],
    [200, 75, 'Two Hundred Followed'],
    [300, 95, 'Three Hundred Followed'],
    [350, 105, 'Three-Fifty Followed'],
    [400, 115, 'Four Hundred Followed'],
    [450, 125, 'Four-Fifty Followed'],
    [550, 165, 'Five-Fifty Followed'],
    [600, 180, 'Six Hundred Followed'],
    [650, 200, 'Six-Fifty Followed'],
    [750, 260, 'The Census', 'Follow 750 people. You are the platform’s working memory.'],
    [800, 300, 'Eight Hundred Followed'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · mutuals
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('mutuals', 'mutuals.count', 'social', (n) => `Reach ${fmt(n)} mutuals.`, [
    [35, 75, 'Thirty-Five Mutuals'],
    [40, 90, 'Forty Mutuals'],
    [60, 125, 'Sixty Mutuals'],
    [75, 155, 'Seventy-Five Mutuals'],
    [125, 225, 'A Hundred Twenty-Five Mutuals'],
    [150, 275, 'A Hundred Fifty Mutuals'],
    [175, 290, 'One Seventy-Five Mutuals'],
    [200, 390, 'Two Hundred Mutuals'],
    [250, 430, 'Two-Fifty Mutuals'],
    [275, 460, 'Two Seventy-Five Mutuals'],
    [300, 490, 'Three Hundred Mutuals'],
    [350, 540, 'Three-Fifty Mutuals'],
    [400, 580, 'All Roads Lead Back', 'Reach 400 mutuals. Everyone you know, knows you back.'],
    [450, 640, 'Four-Fifty Mutuals'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  PROJECTS · projects followed
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('projfoll', 'projectFollows.count', 'projects', (n) => `Follow ${n} projects.`, [
    [12, 35, 'Twelve Watched'],
    [16, 50, 'Sixteen Watched'],
    [20, 60, 'Twenty Watched'],
    [30, 75, 'Thirty Watched'],
    [34, 110, 'Thirty-Four Watched'],
    [38, 130, 'Thirty-Eight Watched'],
    [42, 150, 'Forty-Two Watched'],
    [46, 170, 'Forty-Six Watched'],
    [48, 190, 'Almost All Eyes', 'Follow 48 projects — two shy of the whole roster.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · total pieces held
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('held', 'holdings.total', 'curation', (n) => `Hold ${fmt(n)} pieces.`, [
    [35, 55, 'Thirty-Five Held'],
    [65, 70, 'Sixty-Five Held'],
    [80, 80, 'Eighty Held'],
    [125, 90, 'A Hundred Twenty-Five Held'],
    [150, 100, 'A Hundred Fifty Held'],
    [175, 130, 'One Seventy-Five Held'],
    [225, 155, 'Two Twenty-Five Held'],
    [250, 165, 'Two-Fifty Held'],
    [300, 245, 'Three Hundred Held'],
    [350, 275, 'Three-Fifty Held'],
    [400, 300, 'Four Hundred Held'],
    [450, 360, 'Four-Fifty Held'],
    [600, 395, 'Six Hundred Held'],
    [650, 420, 'Six-Fifty Held'],
    [700, 445, 'Seven Hundred Held'],
    [750, 465, 'Seven-Fifty Held'],
    [800, 540, 'Eight Hundred Held'],
    [900, 590, 'Nine Hundred Held'],
    [950, 615, 'Nine-Fifty Held'],
    [1250, 640, 'Twelve-Fifty Held'],
    [1500, 700, 'Fifteen Hundred Held'],
    [1750, 800, 'Seventeen-Fifty Held'],
    [2000, 850, 'Two Thousand Under One Roof', 'Hold 2,000 pieces. That’s not a collection, that’s an institution.'],
    [2250, 910, 'Twenty-Two Fifty Held'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · distinct projects held
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('heldproj', 'holdings.distinctProjects', 'curation', (n) => `Own pieces from ${n} different projects.`, [
    [8, 45, 'Eight Projects Held'],
    [12, 60, 'Twelve Projects Held'],
    [15, 95, 'Fifteen Projects Held'],
    [18, 120, 'Eighteen Projects Held'],
    [22, 150, 'Twenty-Two Projects Held'],
    [28, 165, 'Twenty-Eight Projects Held'],
    [31, 185, 'Thirty-One Projects Held'],
    [34, 235, 'Thirty-Four Projects Held'],
    [36, 255, 'Thirty-Six Projects Held'],
    [38, 275, 'Thirty-Eight Projects Held'],
    [41, 330, 'Forty-One Projects Held'],
    [44, 350, 'Forty-Four Projects Held'],
    [46, 375, 'Forty-Six Projects Held'],
    [48, 410, 'Two Shy of Everything', 'Own pieces from 48 different projects.'],
    [49, 460, 'One Shy of Everything', 'Own pieces from 49 different projects.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · held from a single project
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('helddeep', 'holdings.maxPerProject', 'curation', (n) => `Hold ${fmt(n)} pieces from one project.`, [
    [15, 38, 'Fifteen of a Kind'],
    [20, 75, 'Twenty of a Kind'],
    [30, 95, 'Thirty of a Kind'],
    [35, 125, 'Thirty-Five of a Kind'],
    [40, 175, 'Forty of a Kind Held'],
    [45, 200, 'Forty-Five of a Kind'],
    [60, 225, 'Sixty of a Kind'],
    [70, 250, 'Seventy of a Kind'],
    [80, 320, 'Eighty of a Kind'],
    [90, 355, 'Ninety of a Kind'],
    [110, 375, 'A Hundred Ten of One'],
    [125, 395, 'A Hundred Twenty-Five of One'],
    [150, 435, 'A Hundred Fifty of One'],
    [175, 540, 'One Seventy-Five of One'],
    [200, 590, 'Two Hundred of a Kind'],
    [225, 635, 'Two Twenty-Five of a Kind'],
    [250, 680, 'Two-Fifty of a Kind'],
    [300, 740, 'You ARE the Project', 'Hold 300 pieces from a single project. The artist asks YOU how it’s going.'],
    [350, 800, 'Three-Fifty of a Kind'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · stars
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('stars', 'stars.count', 'curation', (n) => `Star ${fmt(n)} pieces.`, [
    [50, 20, 'Fifty Starred'],
    [75, 40, 'Seventy-Five Starred'],
    [125, 45, 'A Hundred Twenty-Five Starred'],
    [150, 50, 'A Hundred Fifty Starred'],
    [200, 60, 'Two Hundred Starred'],
    [250, 85, 'Two-Fifty Starred'],
    [300, 100, 'Three Hundred Starred'],
    [350, 115, 'Three-Fifty Starred'],
    [400, 130, 'Four Hundred Starred'],
    [600, 160, 'Six Hundred Starred'],
    [750, 240, 'The Night Sky', 'Star 750 pieces. You are personally responsible for a constellation.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · wishlist
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('wish', 'wishlist.count', 'curation', (n) => `Wishlist ${fmt(n)} pieces.`, [
    [25, 30, 'Twenty-Five Wished'],
    [35, 38, 'Thirty-Five Wished'],
    [45, 45, 'Forty-Five Wished'],
    [65, 50, 'Sixty-Five Wished'],
    [80, 60, 'Eighty Wished'],
    [100, 75, 'A Hundred Wished'],
    [125, 85, 'A Hundred Twenty-Five Wished'],
    [150, 100, 'A Hundred Fifty Wished'],
    [175, 125, 'One Seventy-Five Wished'],
    [200, 150, 'Two Hundred Wished'],
    [250, 175, 'Wants for Nothing, Wants Everything', 'Wishlist 250 pieces. Ambition is a collection too.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · albums
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('albums', 'albums.count', 'curation', (n) => `Create ${n} albums.`, [
    [12, 55, 'Twelve Shelves'],
    [15, 90, 'Fifteen Shelves'],
    [20, 110, 'Twenty Shelves'],
    [30, 145, 'Thirty Shelves'],
    [35, 210, 'Thirty-Five Shelves'],
    [45, 265, 'Forty-Five Shelves'],
    [50, 320, 'The Stacks', 'Create 50 albums. Somewhere in there is a wing with your name on it.'],
  ]),
  ...ladder('albumbig', 'albums.maxItems', 'curation', (n) => `Fill an album with ${n} pieces.`, [
    [20, 50, 'Album of Twenty'],
    [30, 60, 'Album of Thirty'],
    [45, 85, 'Album of Forty-Five'],
    [60, 175, 'Album of Sixty'],
    [80, 210, 'Album of Eighty'],
    [125, 260, 'The Box Set', 'Fill an album with 125 pieces.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · price targets
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('targets', 'targets.count', 'curation', (n) => `Set ${n} price targets.`, [
    [20, 70, 'Twenty Calls'],
    [30, 85, 'Thirty Calls'],
    [40, 95, 'Forty Calls'],
    [60, 105, 'Sixty Calls'],
    [75, 125, 'Seventy-Five Calls'],
    [100, 175, 'A Hundred Calls'],
    [125, 200, 'A Hundred Twenty-Five Calls'],
    [150, 235, 'The Research Desk', 'Set 150 price targets. Analysts get paid for less.'],
    [175, 290, 'One Seventy-Five Calls'],
  ]),
  ...ladder('targethit', 'targets.hit', 'curation', (n) => `${n} of your price targets get hit.`, [
    [10, 210, 'Ten Called Right'],
    [15, 290, 'Fifteen Called Right'],
    [20, 350, 'Twenty Called Right'],
    [30, 400, 'Thirty Called Right'],
    [40, 445, 'Forty Called Right'],
    [50, 590, 'The Oracle', '50 of your price targets hit. At this point it’s insider trading with the future.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  ANOINTING · given / received
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('anointg', 'anoint.given', 'anointing', (n) => `Anoint ${fmt(n)} pieces.`, [
    [25, 40, 'Twenty-Five Blessed'],
    [50, 80, 'Fifty Blessed'],
    [75, 140, 'Seventy-Five Blessed'],
    [150, 190, 'A Hundred Fifty Blessed'],
    [200, 320, 'Two Hundred Blessed'],
    [300, 375, 'Three Hundred Blessed'],
    [400, 470, 'Four Hundred Blessed'],
    [600, 550, 'Six Hundred Blessed'],
    [750, 720, 'The Blessing Engine', 'Anoint 750 pieces. Taste at industrial scale.'],
  ]),
  ...ladder('anointr', 'anoint.received', 'anointing', (n) => `Collect ${fmt(n)} anoints across your pieces.`, [
    [15, 70, 'Fifteen Blessings In'],
    [25, 90, 'Twenty-Five Blessings In'],
    [40, 125, 'Forty Blessings In'],
    [75, 320, 'Seventy-Five Blessings In'],
    [150, 480, 'A Hundred Fifty Blessings In'],
    [200, 540, 'Two Hundred Blessings In'],
    [250, 590, 'Two-Fifty Blessings In'],
    [300, 630, 'Three Hundred Blessings In'],
    [400, 680, 'Four Hundred Blessings In'],
    [750, 800, 'Struck by Lightning Repeatedly', 'Collect 750 anoints. The community has decided you are the good stuff.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  STREAK · densified (60/100/180/365/500/730/1000 live elsewhere)
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('streak', 'streak.days', 'streak', (n) => `Reach a ${fmt(n)}-day PriceStreak.`, [
    [30, 70, 'Thirty Days Running'],
    [45, 100, 'Forty-Five Running'],
    [90, 220, 'Ninety Running'],
    [120, 290, 'A Hundred Twenty Running'],
    [150, 330, 'A Hundred Fifty Running'],
    [200, 420, 'Two Hundred Running'],
    [270, 500, 'Two-Seventy Running'],
    [300, 530, 'Three Hundred Running'],
    [400, 600, 'Four Hundred Running'],
    [450, 630, 'Four-Fifty Running'],
    [550, 680, 'Five-Fifty Running'],
    [600, 700, 'Six Hundred Running'],
    [650, 720, 'Six-Fifty Running'],
    [800, 790, 'Eight Hundred Running'],
    [900, 850, 'Nine Hundred Running'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  RANK · PriceScore milestones (densified)
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('score', 'score.total', 'rank', (n) => `Reach ${fmt(n)} PriceScore.`, [
    [20000, 360, 'Twenty Thousand Score'],
    [40000, 520, 'Forty Thousand Score', 'Reach 40,000 PriceScore. The scoreboard needed new digits.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  RANK · leaderboard + seasons (fill the gaps)
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('lb', 'leaderboard.bestRank', 'rank', (n) => `Enter the top ${fmt(n)} on the leaderboard.`, [
    [750, 80, 'Top 750'],
    [250, 160, 'Top 250'],
    [25, 300, 'Top Twenty-Five'],
  ]).map((a) => ({ ...a, trigger: a.trigger.replace('>=', '<=') })),
  ...ladder('season', 'season.bestFinish', 'rank', (n) => `Finish a season in the top ${n}.`, [
    [50, 200, 'Season Top Fifty'],
    [5, 420, 'Season Top Five'],
  ]).map((a) => ({ ...a, trigger: a.trigger.replace('>=', '<=') })),

  // ─────────────────────────────────────────────────────────────────────
  //  ARTIST · every creator family, densified
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('artproj', 'artist.projects', 'artist', (n) => `Upload ${n} projects.`, [
    [2, 140, 'Second Upload'],
    [4, 240, 'Fourth Upload'],
    [7, 390, 'Seven Projects Up'],
    [15, 560, 'Fifteen Projects Up'],
    [20, 640, 'Twenty Projects Up'],
    [25, 720, 'Twenty-Five Projects Up'],
  ]),
  ...ladder('artsales', 'artist.primarySales', 'artist', (n) => `Sell ${fmt(n)} pieces of your own work.`, [
    [5, 80, 'Five of Yours Sold'],
    [10, 100, 'Ten of Yours Sold'],
    [50, 200, 'Fifty of Yours Sold'],
    [75, 250, 'Seventy-Five of Yours Sold'],
    [150, 350, 'A Hundred Fifty of Yours Sold'],
    [250, 420, 'Two-Fifty of Yours Sold'],
    [300, 450, 'Three Hundred of Yours Sold'],
    [750, 680, 'Seven-Fifty of Yours Sold'],
    [1500, 880, 'Fifteen Hundred of Yours Sold', 'Sell 1,500 pieces of your own work. A genuine career.'],
  ]),
  ...ladder('arthold', 'artist.holders', 'artist', (n) => `Reach ${fmt(n)} holders on your work.`, [
    [5, 60, 'Five Holders'],
    [25, 130, 'Twenty-Five Holders'],
    [75, 230, 'Seventy-Five Holders'],
    [150, 320, 'A Hundred Fifty Holders'],
    [250, 400, 'Two-Fifty Holders'],
    [300, 430, 'Three Hundred Holders'],
    [750, 620, 'Seven-Fifty Holders'],
    [1500, 850, 'Fifteen Hundred Homes', 'Your work lives in 1,500 different wallets.'],
  ]),
  ...ladder('artsec', 'artist.secondaryEth', 'artist', (n) => `${n} ETH secondary volume on your work.`, [
    [1, 90, 'One ETH Resold'],
    [2, 120, 'Two ETH Resold'],
    [3, 150, 'Three ETH Resold'],
    [15, 320, 'Fifteen ETH Resold'],
    [20, 380, 'Twenty ETH Resold'],
    [30, 460, 'Thirty ETH Resold'],
    [40, 560, 'Forty ETH Resold'],
    [60, 700, 'Sixty ETH Resold'],
    [75, 780, 'Seventy-Five ETH Resold'],
    [150, 920, 'A Hundred Fifty Resold'],
    [200, 950, 'The Institution', '200 ETH secondary volume on your work. Museums move slower than your floor.'],
  ]),
  ...ladder('artso', 'artist.selloutProjects', 'artist', (n) => `Sell out ${n} of your projects.`, [
    [2, 380, 'Double Sellout'],
    [4, 550, 'Four Sellouts'],
    [7, 760, 'Seven Sellouts'],
    [15, 930, 'Fifteen Sellouts'],
    [20, 970, 'Twenty Sellouts', 'Sell out 20 of your projects. The mint button is a formality.'],
  ]),
  ...ladder('artpf', 'artist.projectFollowers', 'artist', (n) => `Reach ${fmt(n)} followers across your projects.`, [
    [25, 60, 'Twenty-Five Watching Your Work'],
    [50, 85, 'Fifty Watching Your Work'],
    [250, 220, 'Two-Fifty Watching Your Work'],
    [750, 400, 'Seven-Fifty Watching Your Work'],
    [1500, 560, 'Fifteen Hundred Watching'],
    [2000, 620, 'Two Thousand Watching'],
    [2500, 670, 'Twenty-Five Hundred Watching'],
    [3000, 710, 'Three Thousand Watching'],
    [4000, 770, 'Four Thousand Watching'],
  ]),

  // ═════════════════════════════════════════════════════════════════════
  //  THE FAR CLIMB — 2026-07-12 de-spam rebalance (Brendon's call).
  //  The front-loaded rungs (every "do a thing 1-3 times" trophy, the dense
  //  score-of-score ladder, the day-one tenure stamps) were PURGED and their
  //  slots pushed out here: same families, horizons that take months and
  //  years. The catalog stays exactly 1,000; the wall of unlocks moves from
  //  a user's first hour to where it means something.
  // ═════════════════════════════════════════════════════════════════════
  ...ladder('mintfar', 'mint.count', 'primary', (n) => `Mint ${fmt(n)} pieces.`, [
    [3000, 965, 'Three Thousand Mints'],
    [3500, 970, 'The Endless Press'],
    [4000, 975, 'Four Thousand Mints'],
    [4500, 980, 'The Approach to Five'],
    [5000, 990, 'Five Thousand Mints'],
  ]),
  ...ladder('mintdeepfar', 'mint.maxPerProject', 'primary', (n) => `Mint ${fmt(n)} pieces from a single project.`, [
    [350, 640, 'Three-Fifty Deep'],
    [400, 680, 'The Quarry'],
    [500, 740, 'Five Hundred of One'],
  ]),
  ...ladder('primethfar', 'primary.totalEth', 'primary', (n) => `${n} ETH in total primary spend.`, [
    [125, 930, 'The Underwriter'],
    [150, 945, 'A Hundred Fifty In'],
    [200, 960, 'The Endowment'],
    [250, 985, 'Patron of Record'],
  ]),
  ...ladder('secethfar', 'secondary.totalEth', 'trading', (n) => `${n} ETH in secondary volume.`, [
    [125, 850, 'Deep Liquidity'],
    [150, 870, 'The Resting Order'],
    [200, 900, 'Two Hundred Through'],
    [250, 930, 'The Exchange Itself'],
  ]),
  ...ladder('volethfar', 'volume.totalEth', 'trading', (n) => `${fmt(n)} ETH in total lifetime volume.`, [
    [400, 900, 'Four Hundred Total'],
    [500, 925, 'Half a Thousand'],
    [600, 950, 'Six Hundred Moved'],
    [750, 975, 'The Deep Current'],
  ]),
  ...ladder('tradesfar', 'trades.count', 'trading', (n) => `Complete ${fmt(n)} trades.`, [
    [2000, 880, 'Two Thousand Crossings'],
    [2500, 910, 'The Perpetual Motion'],
    [3000, 940, 'Three Thousand Trades'],
    [5000, 985, 'Five Thousand Trades'],
  ]),
  ...ladder('buyfar', 'buy.count', 'trading', (n) => `Buy ${fmt(n)} pieces on the secondary market.`, [
    [1000, 720, 'A Thousand Buys'],
    [1250, 760, 'Twelve-Fifty Bought'],
    [1500, 800, 'The Great Accumulation'],
    [2000, 860, 'Two Thousand Bought'],
  ]),
  ...ladder('salefar', 'sale.count', 'trading', (n) => `Sell ${fmt(n)} pieces.`, [
    [1000, 720, 'A Thousand Exits'],
    [1250, 760, 'Twelve-Fifty Sold'],
    [1500, 800, 'The Great Distribution'],
    [2000, 860, 'Two Thousand Sold'],
  ]),
  ...ladder('listfar', 'list.count', 'trading', (n) => `Create ${fmt(n)} listings.`, [
    [1000, 560, 'A Thousand Storefronts'],
    [1250, 600, 'Twelve-Fifty Listed'],
    [1500, 650, 'The Eternal Shopfront'],
  ]),
  ...ladder('offerfar', 'offerMade.count', 'trading', (n) => `Place ${fmt(n)} offers.`, [
    [500, 480, 'Five Hundred Offers'],
    [750, 540, 'The Relentless Ask'],
    [1000, 610, 'A Thousand Offers'],
  ]),
  ...ladder('offeraccfar', 'offerMade.acceptedCount', 'trading', (n) => `Get ${fmt(n)} of your offers accepted.`, [
    [350, 560, 'Three-Fifty Landed'],
    [500, 640, 'Five Hundred Handshakes'],
    [750, 730, 'The Closer of Closers'],
  ]),
  ...ladder('acceptfar', 'offerAccepted.count', 'trading', (n) => `Accept ${fmt(n)} offers on your pieces.`, [
    [350, 560, 'Three-Fifty Accepted'],
    [500, 640, 'The Open Exchange'],
    [750, 730, 'Market Pillar'],
  ]),
  ...ladder('followersfar', 'followers.count', 'social', (n) => `Reach ${fmt(n)} followers.`, [
    [7500, 900, 'Seventy-Five Hundred Strong'],
    [10000, 920, 'Ten Thousand Watching'],
    [15000, 950, 'The Gathering'],
    [25000, 985, 'A City of Followers'],
  ]),
  ...ladder('followingfar', 'following.count', 'social', (n) => `Follow ${fmt(n)} people.`, [
    [1000, 320, 'A Thousand Threads'],
    [1500, 380, 'The Wide Net'],
    [2000, 440, 'Everyone, Everywhere'],
  ]),
  ...ladder('mutualsfar', 'mutuals.count', 'social', (n) => `Reach ${fmt(n)} mutuals.`, [
    [500, 520, 'Five Hundred Both Ways'],
    [750, 590, 'The Great Hall'],
    [1000, 680, 'A Thousand Kindred'],
  ]),
  ...ladder('heldfar', 'holdings.total', 'curation', (n) => `Hold ${fmt(n)} pieces.`, [
    [2500, 830, 'Twenty-Five Hundred Held'],
    [3000, 860, 'The Wing'],
    [4000, 900, 'Four Thousand Held'],
    [5000, 950, 'The National Collection'],
  ]),
  ...ladder('helddeepfar', 'holdings.maxPerProject', 'curation', (n) => `Hold ${fmt(n)} pieces from one project.`, [
    [400, 560, 'Four Hundred of One'],
    [500, 620, 'The Majority Position'],
    [600, 680, 'Six Hundred of One'],
    [750, 750, 'The Project Is You'],
  ]),
  ...ladder('starsfar', 'stars.count', 'curation', (n) => `Star ${fmt(n)} pieces.`, [
    [1000, 300, 'A Thousand Stars'],
    [1500, 360, 'The Star Chart'],
    [2000, 420, 'Two Thousand Stars'],
    [2500, 480, 'The Whole Firmament'],
  ]),
  ...ladder('wishfar', 'wishlist.count', 'curation', (n) => `Wishlist ${fmt(n)} pieces.`, [
    [300, 300, 'Three Hundred Wishes'],
    [400, 350, 'The Long Want'],
    [500, 400, 'Five Hundred Wishes'],
  ]),
  ...ladder('albumsfar', 'albums.count', 'curation', (n) => `Create ${fmt(n)} albums.`, [
    [75, 320, 'Seventy-Five Shelves'],
    [100, 380, 'A Hundred Albums'],
    [150, 450, 'The Archive Wing'],
  ]),
  ...ladder('albumbigfar', 'albums.maxItems', 'curation', (n) => `Fill an album with ${fmt(n)} pieces.`, [
    [150, 320, 'The Anthology'],
    [200, 380, 'Two Hundred Bound'],
    [250, 440, 'The Compendium'],
  ]),
  ...ladder('targetsfar', 'targets.count', 'curation', (n) => `Set ${fmt(n)} price targets.`, [
    [200, 300, 'Two Hundred Calls'],
    [250, 340, 'The Standing Forecast'],
    [300, 390, 'Three Hundred Calls'],
  ]),
  ...ladder('targethitfar', 'targets.hit', 'curation', (n) => `${fmt(n)} of your price targets hit.`, [
    [75, 560, 'Seventy-Five Bullseyes'],
    [100, 640, 'A Hundred Called'],
    [150, 730, 'The Oracle of Price'],
  ]),
  ...ladder('anointgfar', 'anoint.given', 'anointing', (n) => `Anoint ${fmt(n)} pieces.`, [
    [1000, 780, 'A Thousand Blessings'],
    [1500, 840, 'The Blessing Rain'],
    [2000, 900, 'Two Thousand Anointed'],
  ]),
  ...ladder('anointrfar', 'anoint.received', 'anointing', (n) => `Collect ${fmt(n)} anoints across your pieces.`, [
    [1000, 800, 'A Thousand Received'],
    [1500, 860, 'The Blessed Estate'],
    [2000, 920, 'Twice a Thousand Blessings'],
  ]),
  ...ladder('streakfar', 'streak.days', 'streak', (n) => `Reach a ${fmt(n)}-day PriceStreak.`, [
    [1200, 940, 'Twelve Hundred Days Straight'],
    [1500, 955, 'The Unbrokenest'],
    [1800, 970, 'Eighteen Hundred Straight'],
    [2000, 990, 'Two Thousand Days of Fire'],
  ]),
  ...ladder('tenuredfar', 'tenure.days', 'og', (n) => `${fmt(n)} days since you joined PD.`, [
    [2000, 730, 'Two Thousand Days Here'],
    [2200, 760, 'Twenty-Two Hundred Days'],
    [2500, 800, 'The Long Residency'],
    [3000, 870, 'Three Thousand Days Here'],
  ]),
  ...ladder('tenureyfar', 'tenure.years', 'og', (n) => `${n} years since you joined PD.`, [
    [12, 930, 'Twelve Years Standing'],
    [15, 970, 'The Fifteenth Year'],
  ]),
  ...ladder('artsalesfar', 'artist.primarySales', 'artist', (n) => `Sell ${fmt(n)} pieces of your own work.`, [
    [2000, 880, 'Two Thousand Sold as Artist'],
    [2500, 920, 'The Body of Work Sells Itself'],
    [3000, 960, 'Three Thousand Primaries'],
  ]),
  ...ladder('artholdfar', 'artist.holders', 'artist', (n) => `Reach ${fmt(n)} holders on your work.`, [
    [2000, 820, 'Two Thousand Homes'],
    [2500, 870, 'The Widely Kept'],
    [3000, 920, 'Three Thousand Homes'],
  ]),
  ...ladder('artsecfar', 'artist.secondaryEth', 'artist', (n) => `${fmt(n)} ETH secondary volume on your work.`, [
    [250, 920, 'The Trading House'],
    [300, 950, 'Three Hundred Through Your Work'],
    [400, 985, 'The Canon Trades Forever'],
  ]),
  ...ladder('artpffar', 'artist.projectFollowers', 'artist', (n) => `Reach ${fmt(n)} followers across your projects.`, [
    [7500, 880, 'Seventy-Five Hundred Waiting'],
    [10000, 930, 'Ten Thousand at the Door'],
  ]),
  ...ladder('artprojfar', 'artist.projects', 'artist', (n) => `Upload ${n} projects.`, [
    [30, 800, 'Thirty Projects Up'],
    [40, 880, 'The Forty-Work Retrospective'],
  ]),
  ...ladder('artsellfar', 'artist.selloutProjects', 'artist', (n) => `Sell out ${n} of your projects.`, [
    [25, 940, 'Twenty-Five Sellouts'],
  ]),
  ...ladder('scorefar', 'score.total', 'rank', (n) => `Reach ${fmt(n)} PriceScore.`, [
    [50000, 560, 'Fifty Thousand Score'],
    [60000, 600, 'Sixty Thousand Score'],
    [75000, 660, 'Seventy-Five Thousand Score'],
    [100000, 740, 'One Hundred Thousand Score'],
    [150000, 850, 'A Hundred Fifty Thousand'],
  ]),
];
