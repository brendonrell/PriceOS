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
  ...ladder('mint', 'mint.count', 'primary', (n) => `Mint ${fmt(n)} pieces.`, [
    [2, 15, 'Double Tap'],
    [3, 20, 'Three Off the Press'],
    [5, 35, 'A Handful'],
    [15, 80, 'Warming Up'],
    [20, 95, 'A Score of Mints'],
    [30, 125, 'Thirty Fresh'],
    [40, 155, 'Forty Deep'],
    [60, 200, 'Sixty Strong'],
    [75, 230, 'Committed'],
    [85, 250, 'Eighty-Five'],
    [125, 310, 'Mint Condition'],
    [150, 340, 'Presses On'],
    [175, 365, 'Printing'],
    [200, 390, 'Two Hundred Club'],
    [225, 405, 'Two Twenty-Five'],
    [275, 440, 'The Long Run'],
    [300, 460, 'Three Hundred Mints'],
    [350, 495, 'Mint Machine'],
    [400, 530, 'Four Hundred Strong'],
    [450, 565, 'Relentless'],
    [550, 620, 'The Foundry'],
    [600, 645, 'Six Hundred Mints'],
    [650, 665, 'Coining'],
    [700, 690, 'Seven Hundred Mints'],
    [750, 710, 'The Press Never Sleeps'],
    [800, 730, 'Eight Hundred Mints'],
    [850, 750, 'Nearly Nine'],
    [900, 770, 'Nine Hundred Mints'],
    [950, 790, 'The Approach'],
    [1100, 860, 'Past a Thousand Mints'],
    [1250, 880, 'Twelve Fifty'],
    [1500, 900, 'Fifteen Hundred Mints'],
    [1750, 920, 'The Great Library'],
    [2000, 940, 'Two Thousand Mints'],
    [2500, 960, 'The Mint Eternal', 'Mint 2,500 pieces. The press is part of you now.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · distinct projects minted
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('mintproj', 'mint.distinctProjects', 'primary', (n) => `Mint from ${n} different projects.`, [
    [2, 20, 'Second Taste'],
    [3, 30, 'Triple Sampler'],
    [4, 40, 'Four Corners'],
    [6, 55, 'Six Ways In'],
    [8, 70, 'Eight Doors'],
    [10, 90, 'Ten Doors'],
    [12, 110, 'A Dozen Doors'],
    [18, 175, 'Eighteen Rooms'],
    [20, 200, 'Twenty Rooms'],
    [22, 230, 'Twenty-Two Flavours'],
    [28, 305, 'Twenty-Eight Wide'],
    [32, 350, 'Thirty-Two Doors'],
    [35, 385, 'Thirty-Five Wide'],
    [38, 420, 'Thirty-Eight In'],
    [42, 480, 'Forty-Two Exactly'],
    [45, 530, 'Forty-Five Deep'],
    [48, 600, 'Two Shy of All'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · mints from a single project (depth of conviction)
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('mintdeep', 'mint.maxPerProject', 'primary', (n) => `Mint ${fmt(n)} pieces from a single project.`, [
    [2, 15, 'Twice Committed'],
    [3, 25, 'Thrice In'],
    [4, 35, 'Four Down'],
    [6, 55, 'Six of One'],
    [8, 75, 'Great Eight'],
    [10, 95, 'Ten of a Kind'],
    [12, 110, 'Twelve of One'],
    [20, 170, 'Twenty of One'],
    [25, 205, 'Quarter Hundred'],
    [35, 275, 'Thirty-Five Down'],
    [40, 310, 'Forty of a Kind'],
    [45, 345, 'Forty-Five Straight'],
    [60, 430, 'Sixty In'],
    [70, 470, 'Seventy Deep'],
    [80, 510, 'Eighty of One'],
    [90, 555, 'Ninety Committed'],
    [125, 650, 'A Hundred Twenty-Five'],
    [150, 700, 'The One-Fifty'],
    [175, 740, 'One Seventy-Five Deep'],
    [200, 790, 'Two Hundred of One'],
    [250, 850, 'Two-Fifty Conviction'],
    [300, 900, 'The Whole Edition', 'Mint 300 pieces from a single project. At some point it became yours.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · total ETH into primary — THE FATTEST POINTS
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('primeth', 'primary.totalEth', 'primary', (n) => `${n} ETH in total primary spend.`, [
    [0.02, 20, 'Skin in the Game'],
    [0.05, 35, 'First Coin'],
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
    [0.1, 20, 'Dipped a Toe'],
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
    [0.5, 30, 'First Ripple'],
    [1, 55, 'One Total'],
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
    [5, 35, 'Five Crossings'],
    [15, 90, 'Fifteen Crossings'],
    [20, 105, 'Twenty Crossings'],
    [30, 135, 'Thirty Crossings'],
    [40, 165, 'Forty Crossings'],
    [60, 215, 'Sixty Crossings'],
    [75, 245, 'Seventy-Five Crossings'],
    [80, 255, 'Eighty Crossings'],
    [125, 320, 'A Hundred Twenty-Five Crossings'],
    [175, 375, 'One Seventy-Five Crossings'],
    [200, 395, 'Two Hundred Crossings'],
    [300, 460, 'Three Hundred Crossings'],
    [350, 490, 'Three-Fifty Crossings'],
    [400, 525, 'Four Hundred Crossings'],
    [450, 560, 'Four-Fifty Crossings'],
    [600, 650, 'Six Hundred Crossings'],
    [700, 690, 'Seven Hundred Crossings'],
    [800, 730, 'Eight Hundred Crossings'],
    [900, 780, 'Nine Hundred Crossings'],
    [1250, 870, 'Twelve-Fifty Crossings'],
    [1500, 910, 'The Fifteen Hundred', 'Complete 1,500 trades. The order book dreams about you.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · buys
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('buy', 'buy.count', 'trading', (n) => `Buy ${fmt(n)} pieces on the secondary market.`, [
    [3, 25, 'Three Bought'],
    [5, 40, 'Five Bought'],
    [15, 85, 'Fifteen Bought'],
    [20, 105, 'Twenty Bought'],
    [30, 145, 'Thirty Bought'],
    [40, 180, 'Forty Bought'],
    [50, 210, 'Fifty Bought'],
    [60, 235, 'Sixty Bought'],
    [75, 265, 'Seventy-Five Bought'],
    [80, 275, 'Eighty Bought'],
    [125, 335, 'A Hundred Twenty-Five Bought'],
    [150, 360, 'A Hundred Fifty Bought'],
    [175, 385, 'One Seventy-Five Bought'],
    [200, 410, 'Two Hundred Bought'],
    [300, 490, 'Three Hundred Bought'],
    [350, 520, 'Three-Fifty Bought'],
    [400, 555, 'Four Hundred Bought'],
    [450, 590, 'Four-Fifty Bought'],
    [600, 680, 'Six Hundred Bought'],
    [750, 740, 'The Vacuum', 'Buy 750 pieces on the secondary market. Floors fear you.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · sales
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('sale', 'sale.count', 'trading', (n) => `Sell ${fmt(n)} pieces.`, [
    [3, 25, 'Three Sold'],
    [5, 40, 'Five Sold'],
    [15, 85, 'Fifteen Sold'],
    [20, 105, 'Twenty Sold'],
    [30, 145, 'Thirty Sold'],
    [40, 180, 'Forty Sold'],
    [50, 210, 'Fifty Sold'],
    [60, 235, 'Sixty Sold'],
    [75, 265, 'Seventy-Five Sold'],
    [80, 275, 'Eighty Sold'],
    [125, 335, 'A Hundred Twenty-Five Sold'],
    [150, 360, 'A Hundred Fifty Sold'],
    [175, 385, 'One Seventy-Five Sold'],
    [200, 410, 'Two Hundred Sold'],
    [300, 490, 'Three Hundred Sold'],
    [350, 520, 'Three-Fifty Sold'],
    [400, 555, 'Four Hundred Sold'],
    [450, 590, 'Four-Fifty Sold'],
    [600, 680, 'Six Hundred Sold'],
    [750, 740, 'Always Another Buyer', 'Sell 750 pieces. Supply finds you charming.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · listings
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('list', 'list.count', 'trading', (n) => `Create ${fmt(n)} listings.`, [
    [3, 15, 'Three Listed'],
    [5, 25, 'Five Listed'],
    [15, 55, 'Fifteen Listed'],
    [20, 70, 'Twenty Listed'],
    [25, 80, 'Twenty-Five Listed'],
    [30, 90, 'Thirty Listed'],
    [40, 110, 'Forty Listed'],
    [60, 150, 'Sixty Listed'],
    [75, 170, 'Seventy-Five Listed'],
    [80, 180, 'Eighty Listed'],
    [125, 250, 'A Hundred Twenty-Five Listed'],
    [150, 280, 'A Hundred Fifty Listed'],
    [175, 305, 'One Seventy-Five Listed'],
    [200, 330, 'Two Hundred Listed'],
    [300, 410, 'Three Hundred Listed'],
    [350, 440, 'Three-Fifty Listed'],
    [400, 470, 'Four Hundred Listed'],
    [500, 530, 'Five Hundred Listed'],
    [600, 580, 'Six Hundred Listed'],
    [750, 640, 'The Everything Store', 'Create 750 listings. If you own it, it has a price tag.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · offers made
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('offer', 'offerMade.count', 'trading', (n) => `Place ${fmt(n)} offers.`, [
    [3, 15, 'Three Offers Out'],
    [5, 25, 'Five Offers Out'],
    [15, 55, 'Fifteen Offers Out'],
    [20, 70, 'Twenty Offers Out'],
    [25, 80, 'Twenty-Five Offers Out'],
    [30, 90, 'Thirty Offers Out'],
    [40, 110, 'Forty Offers Out'],
    [60, 150, 'Sixty Offers Out'],
    [75, 170, 'Seventy-Five Offers Out'],
    [80, 180, 'Eighty Offers Out'],
    [125, 250, 'A Hundred Twenty-Five Offers'],
    [150, 280, 'A Hundred Fifty Offers'],
    [175, 305, 'One Seventy-Five Offers'],
    [200, 330, 'Two Hundred Offers'],
    [300, 410, 'Three Hundred Offers'],
    [400, 480, 'The Standing Bid', 'Place 400 offers. Owners check their pings and sigh your name.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · your offers accepted
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('offeracc', 'offerMade.acceptedCount', 'trading', (n) => `Get ${fmt(n)} of your offers accepted.`, [
    [3, 55, 'Three Landed'],
    [5, 75, 'Five Landed'],
    [15, 145, 'Fifteen Landed'],
    [20, 180, 'Twenty Landed'],
    [30, 250, 'Thirty Landed'],
    [40, 310, 'Forty Landed'],
    [60, 355, 'Sixty Landed'],
    [75, 390, 'Seventy-Five Landed'],
    [150, 490, 'A Hundred Fifty Landed'],
    [200, 550, 'Two Hundred Landed'],
    [250, 610, 'Nothing Escapes', 'Get 250 of your offers accepted. Your number was simply correct.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · offers you accepted
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('accept', 'offerAccepted.count', 'trading', (n) => `Accept ${fmt(n)} offers on your pieces.`, [
    [3, 55, 'Three Taken'],
    [5, 75, 'Five Taken'],
    [15, 145, 'Fifteen Taken'],
    [20, 180, 'Twenty Taken'],
    [30, 250, 'Thirty Taken'],
    [40, 310, 'Forty Taken'],
    [50, 340, 'Fifty Taken'],
    [60, 365, 'Sixty Taken'],
    [75, 395, 'Seventy-Five Taken'],
    [150, 495, 'A Hundred Fifty Taken'],
    [200, 555, 'Two Hundred Taken'],
    [250, 615, 'Everything Has a Price', 'Accept 250 offers. And you always knew yours.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · followers
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('followers', 'followers.count', 'social', (n) => `Reach ${fmt(n)} followers.`, [
    [2, 10, 'Two Listening'],
    [3, 12, 'Three Listening'],
    [5, 18, 'Five Listening'],
    [15, 50, 'Fifteen Listening'],
    [20, 65, 'Twenty Listening'],
    [25, 75, 'Twenty-Five Listening'],
    [30, 85, 'Thirty Listening'],
    [40, 105, 'Forty Listening'],
    [60, 140, 'Sixty Listening'],
    [75, 160, 'Seventy-Five Listening'],
    [80, 170, 'Eighty Listening'],
    [125, 240, 'A Hundred Twenty-Five Listening'],
    [150, 260, 'A Hundred Fifty Listening'],
    [175, 285, 'One Seventy-Five Listening'],
    [200, 305, 'Two Hundred Listening'],
    [300, 370, 'Three Hundred Listening'],
    [350, 395, 'Three-Fifty Listening'],
    [400, 425, 'Four Hundred Listening'],
    [600, 530, 'Six Hundred Listening'],
    [750, 580, 'Seven-Fifty Listening'],
    [1500, 720, 'Fifteen Hundred Listening'],
    [2000, 770, 'Two Thousand Listening'],
    [2500, 800, 'Twenty-Five Hundred Listening'],
    [3000, 830, 'Three Thousand Listening'],
    [4000, 860, 'Four Thousand Strong', 'Reach 4,000 followers. When you type, the platform leans in.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · following
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('following', 'following.count', 'social', (n) => `Follow ${fmt(n)} people.`, [
    [3, 10, 'Three Followed'],
    [5, 14, 'Five Followed'],
    [15, 30, 'Fifteen Followed'],
    [20, 35, 'Twenty Followed'],
    [25, 40, 'Twenty-Five Followed'],
    [30, 45, 'Thirty Followed'],
    [40, 55, 'Forty Followed'],
    [60, 65, 'Sixty Followed'],
    [80, 75, 'Eighty Followed'],
    [125, 95, 'A Hundred Twenty-Five Followed'],
    [150, 105, 'A Hundred Fifty Followed'],
    [175, 115, 'One Seventy-Five Followed'],
    [200, 125, 'Two Hundred Followed'],
    [300, 165, 'Three Hundred Followed'],
    [350, 180, 'Three-Fifty Followed'],
    [400, 200, 'Four Hundred Followed'],
    [600, 260, 'Six Hundred Followed'],
    [750, 300, 'The Census', 'Follow 750 people. You are the platform’s working memory.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · mutuals
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('mutuals', 'mutuals.count', 'social', (n) => `Reach ${fmt(n)} mutuals.`, [
    [3, 25, 'Three Mutuals'],
    [5, 35, 'Five Mutuals'],
    [15, 75, 'Fifteen Mutuals'],
    [20, 90, 'Twenty Mutuals'],
    [30, 125, 'Thirty Mutuals'],
    [40, 155, 'Forty Mutuals'],
    [60, 225, 'Sixty Mutuals'],
    [75, 275, 'Seventy-Five Mutuals'],
    [80, 290, 'Eighty Mutuals'],
    [125, 390, 'A Hundred Twenty-Five Mutuals'],
    [150, 430, 'A Hundred Fifty Mutuals'],
    [175, 460, 'One Seventy-Five Mutuals'],
    [200, 490, 'Two Hundred Mutuals'],
    [250, 540, 'Two-Fifty Mutuals'],
    [300, 580, 'Three Hundred Mutuals'],
    [400, 640, 'All Roads Lead Back', 'Reach 400 mutuals. Everyone you know, knows you back.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  PROJECTS · projects followed
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('projfoll', 'projectFollows.count', 'projects', (n) => `Follow ${n} projects.`, [
    [3, 20, 'Three Watched'],
    [5, 28, 'Five Watched'],
    [8, 35, 'Eight Watched'],
    [12, 50, 'Twelve Watched'],
    [15, 60, 'Fifteen Watched'],
    [20, 75, 'Twenty Watched'],
    [30, 110, 'Thirty Watched'],
    [35, 130, 'Thirty-Five Watched'],
    [40, 150, 'Forty Watched'],
    [45, 170, 'Forty-Five Watched'],
    [48, 190, 'Almost All Eyes', 'Follow 48 projects — two shy of the whole roster.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · total pieces held
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('held', 'holdings.total', 'curation', (n) => `Hold ${fmt(n)} pieces.`, [
    [3, 15, 'Three Held'],
    [5, 25, 'Five Held'],
    [15, 55, 'Fifteen Held'],
    [20, 70, 'Twenty Held'],
    [25, 80, 'Twenty-Five Held'],
    [30, 90, 'Thirty Held'],
    [40, 100, 'Forty Held'],
    [60, 130, 'Sixty Held'],
    [75, 155, 'Seventy-Five Held'],
    [80, 165, 'Eighty Held'],
    [125, 245, 'A Hundred Twenty-Five Held'],
    [150, 275, 'A Hundred Fifty Held'],
    [175, 300, 'One Seventy-Five Held'],
    [250, 360, 'Two-Fifty Held'],
    [300, 395, 'Three Hundred Held'],
    [350, 420, 'Three-Fifty Held'],
    [400, 445, 'Four Hundred Held'],
    [450, 465, 'Four-Fifty Held'],
    [600, 540, 'Six Hundred Held'],
    [700, 590, 'Seven Hundred Held'],
    [750, 615, 'Seven-Fifty Held'],
    [800, 640, 'Eight Hundred Held'],
    [900, 700, 'Nine Hundred Held'],
    [1250, 800, 'Twelve-Fifty Held'],
    [1500, 850, 'Fifteen Hundred Held'],
    [2000, 910, 'Two Thousand Under One Roof', 'Hold 2,000 pieces. That’s not a collection, that’s an institution.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · distinct projects held
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('heldproj', 'holdings.distinctProjects', 'curation', (n) => `Own pieces from ${n} different projects.`, [
    [2, 15, 'Two Projects Held'],
    [3, 22, 'Three Projects Held'],
    [4, 30, 'Four Projects Held'],
    [5, 38, 'Five Projects Held'],
    [6, 45, 'Six Projects Held'],
    [8, 60, 'Eight Projects Held'],
    [12, 95, 'Twelve Projects Held'],
    [15, 120, 'Fifteen Projects Held'],
    [18, 150, 'Eighteen Projects Held'],
    [20, 165, 'Twenty Projects Held'],
    [22, 185, 'Twenty-Two Projects Held'],
    [28, 235, 'Twenty-Eight Projects Held'],
    [30, 255, 'Thirty Projects Held'],
    [32, 275, 'Thirty-Two Projects Held'],
    [38, 330, 'Thirty-Eight Projects Held'],
    [40, 350, 'Forty Projects Held'],
    [42, 375, 'Forty-Two Projects Held'],
    [45, 410, 'Forty-Five Projects Held'],
    [48, 460, 'Two Shy of Everything', 'Own pieces from 48 different projects.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · held from a single project
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('helddeep', 'holdings.maxPerProject', 'curation', (n) => `Hold ${fmt(n)} pieces from one project.`, [
    [2, 12, 'Two of a Kind'],
    [3, 18, 'Three of a Kind'],
    [4, 25, 'Four of a Kind'],
    [5, 32, 'Five of a Kind'],
    [6, 38, 'Six of a Kind'],
    [12, 75, 'Twelve of a Kind'],
    [15, 95, 'Fifteen of a Kind'],
    [20, 125, 'Twenty of a Kind'],
    [30, 175, 'Thirty of a Kind'],
    [35, 200, 'Thirty-Five of a Kind'],
    [40, 225, 'Forty of a Kind Held'],
    [45, 250, 'Forty-Five of a Kind'],
    [60, 320, 'Sixty of a Kind'],
    [70, 355, 'Seventy of a Kind'],
    [75, 375, 'Seventy-Five of a Kind'],
    [80, 395, 'Eighty of a Kind'],
    [90, 435, 'Ninety of a Kind'],
    [125, 540, 'A Hundred Twenty-Five of One'],
    [150, 590, 'A Hundred Fifty of One'],
    [175, 635, 'One Seventy-Five of One'],
    [200, 680, 'Two Hundred of a Kind'],
    [250, 740, 'Two-Fifty of a Kind'],
    [300, 800, 'You ARE the Project', 'Hold 300 pieces from a single project. The artist asks YOU how it’s going.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · stars
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('stars', 'stars.count', 'curation', (n) => `Star ${fmt(n)} pieces.`, [
    [5, 10, 'Five Starred'],
    [10, 15, 'Ten Starred'],
    [15, 20, 'Fifteen Starred'],
    [40, 40, 'Forty Starred'],
    [50, 45, 'Fifty Starred'],
    [60, 50, 'Sixty Starred'],
    [75, 60, 'Seventy-Five Starred'],
    [150, 85, 'A Hundred Fifty Starred'],
    [200, 100, 'Two Hundred Starred'],
    [250, 115, 'Two-Fifty Starred'],
    [300, 130, 'Three Hundred Starred'],
    [400, 160, 'Four Hundred Starred'],
    [750, 240, 'The Night Sky', 'Star 750 pieces. You are personally responsible for a constellation.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · wishlist
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('wish', 'wishlist.count', 'curation', (n) => `Wishlist ${fmt(n)} pieces.`, [
    [3, 8, 'Three Wished'],
    [5, 12, 'Five Wished'],
    [15, 30, 'Fifteen Wished'],
    [20, 38, 'Twenty Wished'],
    [25, 45, 'Twenty-Five Wished'],
    [30, 50, 'Thirty Wished'],
    [40, 60, 'Forty Wished'],
    [60, 75, 'Sixty Wished'],
    [75, 85, 'Seventy-Five Wished'],
    [100, 100, 'A Hundred Wished'],
    [150, 125, 'A Hundred Fifty Wished'],
    [200, 150, 'Two Hundred Wished'],
    [250, 175, 'Wants for Nothing, Wants Everything', 'Wishlist 250 pieces. Ambition is a collection too.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · albums
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('albums', 'albums.count', 'curation', (n) => `Create ${n} albums.`, [
    [2, 12, 'Two Shelves'],
    [3, 18, 'Three Shelves'],
    [8, 55, 'Eight Shelves'],
    [12, 90, 'Twelve Shelves'],
    [15, 110, 'Fifteen Shelves'],
    [20, 145, 'Twenty Shelves'],
    [30, 210, 'Thirty Shelves'],
    [40, 265, 'Forty Shelves'],
    [50, 320, 'The Stacks', 'Create 50 albums. Somewhere in there is a wing with your name on it.'],
  ]),
  ...ladder('albumbig', 'albums.maxItems', 'curation', (n) => `Fill an album with ${n} pieces.`, [
    [5, 15, 'Album of Five'],
    [15, 50, 'Album of Fifteen'],
    [20, 60, 'Album of Twenty'],
    [30, 85, 'Album of Thirty'],
    [60, 175, 'Album of Sixty'],
    [75, 210, 'Album of Seventy-Five'],
    [100, 260, 'The Box Set', 'Fill an album with 100 pieces.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · price targets
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('targets', 'targets.count', 'curation', (n) => `Set ${n} price targets.`, [
    [3, 22, 'Three Calls'],
    [5, 30, 'Five Calls'],
    [15, 70, 'Fifteen Calls'],
    [20, 85, 'Twenty Calls'],
    [25, 95, 'Twenty-Five Calls'],
    [30, 105, 'Thirty Calls'],
    [40, 125, 'Forty Calls'],
    [60, 175, 'Sixty Calls'],
    [75, 200, 'Seventy-Five Calls'],
    [100, 235, 'A Hundred Calls'],
    [150, 290, 'The Research Desk', 'Set 150 price targets. Analysts get paid for less.'],
  ]),
  ...ladder('targethit', 'targets.hit', 'curation', (n) => `${n} of your price targets get hit.`, [
    [2, 130, 'Called It Twice'],
    [3, 160, 'Called It Thrice'],
    [5, 210, 'Five Called Right'],
    [10, 290, 'Ten Called Right'],
    [15, 350, 'Fifteen Called Right'],
    [20, 400, 'Twenty Called Right'],
    [25, 445, 'Twenty-Five Called Right'],
    [50, 590, 'The Oracle', '50 of your price targets hit. At this point it’s insider trading with the future.'],
  ]),

  // ─────────────────────────────────────────────────────────────────────
  //  ANOINTING · given / received
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('anointg', 'anoint.given', 'anointing', (n) => `Anoint ${fmt(n)} pieces.`, [
    [5, 25, 'Five Blessed'],
    [10, 40, 'Ten Blessed'],
    [25, 80, 'Twenty-Five Blessed'],
    [50, 140, 'Fifty Blessed'],
    [75, 190, 'Seventy-Five Blessed'],
    [150, 320, 'A Hundred Fifty Blessed'],
    [200, 375, 'Two Hundred Blessed'],
    [300, 470, 'Three Hundred Blessed'],
    [400, 550, 'Four Hundred Blessed'],
    [750, 720, 'The Blessing Engine', 'Anoint 750 pieces. Taste at industrial scale.'],
  ]),
  ...ladder('anointr', 'anoint.received', 'anointing', (n) => `Collect ${fmt(n)} anoints across your pieces.`, [
    [5, 45, 'Five Blessings In'],
    [10, 70, 'Ten Blessings In'],
    [15, 90, 'Fifteen Blessings In'],
    [25, 125, 'Twenty-Five Blessings In'],
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
    [3, 10, 'Three Days Running'],
    [7, 20, 'One Week Running'],
    [14, 35, 'Two Weeks Running'],
    [21, 50, 'Three Weeks Running'],
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
    [100, 10, 'Off Zero'],
    [250, 15, 'Quarter K'],
    [500, 25, 'Five Hundred Score'],
    [750, 35, 'Seven-Fifty Score'],
    [1500, 60, 'Fifteen Hundred Score'],
    [2000, 75, 'Two Thousand Score'],
    [3000, 100, 'Three Thousand Score'],
    [3500, 110, 'Thirty-Five Hundred Score'],
    [4500, 130, 'Forty-Five Hundred Score'],
    [5500, 160, 'Fifty-Five Hundred Score'],
    [6000, 170, 'Six Thousand Score'],
    [6500, 180, 'Sixty-Five Hundred Score'],
    [8000, 210, 'Eight Thousand Score'],
    [8500, 220, 'Eighty-Five Hundred Score'],
    [9000, 230, 'Nine Thousand Score'],
    [9500, 240, 'Ninety-Five Hundred Score'],
    [11000, 260, 'Eleven Thousand Score'],
    [12000, 270, 'Twelve Thousand Score'],
    [12500, 280, 'Twelve-Five Score'],
    [14000, 300, 'Fourteen Thousand Score'],
    [16000, 320, 'Sixteen Thousand Score'],
    [18000, 340, 'Eighteen Thousand Score'],
    [20000, 360, 'Twenty Thousand Score'],
    [22000, 380, 'Twenty-Two Thousand Score'],
    [25000, 400, 'Twenty-Five Thousand Score'],
    [28000, 420, 'Twenty-Eight Thousand Score'],
    [32000, 450, 'Thirty-Two Thousand Score'],
    [35000, 480, 'Thirty-Five Thousand Score'],
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

  // ─────────────────────────────────────────────────────────────────────
  //  IDENTITY · showcase
  // ─────────────────────────────────────────────────────────────────────
  ...ladder('showcase', 'showcase.filledSlots', 'curation', (n) => `Fill ${n} showcase slots.`, [
    [3, 20, 'Half the Shelf'],
  ]),
];
