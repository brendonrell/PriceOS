/**
 * ════════════════════════════════════════════════════════════════════════
 *  PriceOS — LADDER ACHIEVEMENTS  (the multi-year progression backbone)
 * ════════════════════════════════════════════════════════════════════════
 *
 * The core catalog (../catalog.ts) is the curated, hand-tuned set. THIS file
 * is the long climb: deep tiered ladders across every progression family,
 * extending to genuinely hard, multi-year end-states. Same `Achievement`
 * shape, same trigger DSL, same point philosophy.
 *
 * CONVENTIONS (so this never collides with core):
 *   • Every id is prefixed `l_` and is unique snake_case. None reuse a core id.
 *   • Points scale with difficulty: early 5-25, mid 40-150, late 200-500,
 *     elite 500-900. Primary-spend ladders carry the fattest points per rung.
 *   • NOTHING ≥ 1000 — Mjölnir (core) owns the 1000 capstone.
 *   • No point value and no milestone number equals 666.
 *   • Ladders JUMP (10/25/50/100/250/500/1000) — never spam consecutive ints.
 *   • Visible goals people chase — `secret` only on a couple of surprise
 *     end-states.
 *
 * Trigger DSL (computed paths the generic engine evaluates; OP is >= for
 * counts, <= for ranks/finishes): see ../catalog.ts and the engine.
 */

import type { Achievement } from '../catalog';

export const LADDER_ACHIEVEMENTS: readonly Achievement[] = [
  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · lifetime mint counts
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_mint_10', name: 'Hands On', blurb: 'Mint 10 pieces.', points: 60, category: 'primary', trigger: 'mint.count>=10' },
  { id: 'l_mint_25', name: 'Regular', blurb: 'Mint 25 pieces.', points: 110, category: 'primary', trigger: 'mint.count>=25' },
  { id: 'l_mint_50', name: 'Habitual', blurb: 'Mint 50 pieces.', points: 180, category: 'primary', trigger: 'mint.count>=50' },
  { id: 'l_mint_100', name: 'Centena', blurb: 'Mint 100 pieces.', points: 280, category: 'primary', trigger: 'mint.count>=100' },
  { id: 'l_mint_250', name: 'Devotee', blurb: 'Mint 250 pieces.', points: 420, category: 'primary', trigger: 'mint.count>=250' },
  { id: 'l_mint_500', name: 'Archivist', blurb: 'Mint 500 pieces.', points: 600, category: 'primary', trigger: 'mint.count>=500' },
  { id: 'l_mint_1000', name: 'The Thousand', blurb: 'Mint 1,000 pieces. A library built one primary at a time.', points: 850, category: 'primary', trigger: 'mint.count>=1000' },

  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · distinct projects minted (we have 50 projects — cap near it)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_mint_proj_30', name: 'Wide Net', blurb: 'Mint from 30 different projects.', points: 320, category: 'primary', trigger: 'mint.distinctProjects>=30' },
  { id: 'l_mint_proj_40', name: 'Cartographer', blurb: 'Mint from 40 different projects.', points: 450, category: 'primary', trigger: 'mint.distinctProjects>=40' },
  { id: 'l_mint_proj_50', name: 'The Whole Map', blurb: 'Mint from 50 different projects — the entire roster.', points: 700, category: 'primary', trigger: 'mint.distinctProjects>=50' },

  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · depth — mints from a single project
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_mint_deep_15', name: 'Stockpile', blurb: 'Mint 15 pieces from one project.', points: 130, category: 'primary', trigger: 'mint.maxPerProject>=15' },
  { id: 'l_mint_deep_30', name: 'Deep Vein', blurb: 'Mint 30 pieces from one project.', points: 240, category: 'primary', trigger: 'mint.maxPerProject>=30' },
  { id: 'l_mint_deep_50', name: 'Bedrock', blurb: 'Mint 50 pieces from a single project.', points: 380, category: 'primary', trigger: 'mint.maxPerProject>=50' },
  { id: 'l_mint_deep_100', name: 'The Vault', blurb: 'Mint 100 pieces from one project. Total conviction.', points: 600, category: 'primary', trigger: 'mint.maxPerProject>=100' },

  // ─────────────────────────────────────────────────────────────────────
  //  PRIMARY · total ETH spend — THE FATTEST POINTS (incentivise spend)
  //  ETH ≈ $1,665. USD kept sane: 0.1, 0.5, 2, 5, 10, 25 ETH.
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_prim_eth_010', name: 'First Stake', blurb: '0.1 ETH in total primary spend.', points: 65, category: 'primary', trigger: 'primary.totalEth>=0.1' },
  { id: 'l_prim_eth_050', name: 'Conviction', blurb: '0.5 ETH in total primary spend.', points: 170, category: 'primary', trigger: 'primary.totalEth>=0.5' },
  { id: 'l_prim_eth_2', name: 'Heavy Hand', blurb: '2 ETH in total primary spend.', points: 320, category: 'primary', trigger: 'primary.totalEth>=2' },
  { id: 'l_prim_eth_5', name: 'Benefactor', blurb: '5 ETH in total primary spend.', points: 480, category: 'primary', trigger: 'primary.totalEth>=5' },
  { id: 'l_prim_eth_10', name: 'Maecenas', blurb: '10 ETH in total primary spend. A patron of the whole platform.', points: 700, category: 'primary', trigger: 'primary.totalEth>=10' },
  { id: 'l_prim_eth_25', name: 'House Built On Price', blurb: '25 ETH in lifetime primary spend. Few will ever stand here.', points: 900, category: 'primary', trigger: 'primary.totalEth>=25' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · secondary volume (ETH)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_sec_eth_050', name: 'Warmed Up', blurb: '0.5 ETH in secondary volume.', points: 55, category: 'trading', trigger: 'secondary.totalEth>=0.5' },
  { id: 'l_sec_eth_2', name: 'Liquid', blurb: '2 ETH in secondary volume.', points: 130, category: 'trading', trigger: 'secondary.totalEth>=2' },
  { id: 'l_sec_eth_5', name: 'Market Maker', blurb: '5 ETH in secondary volume.', points: 230, category: 'trading', trigger: 'secondary.totalEth>=5' },
  { id: 'l_sec_eth_10', name: 'Order Flow', blurb: '10 ETH in secondary volume.', points: 360, category: 'trading', trigger: 'secondary.totalEth>=10' },
  { id: 'l_sec_eth_25', name: 'Deep Book', blurb: '25 ETH in secondary volume.', points: 540, category: 'trading', trigger: 'secondary.totalEth>=25' },
  { id: 'l_sec_eth_50', name: 'The Whole Order Book', blurb: '50 ETH moved on the secondary market.', points: 780, category: 'trading', trigger: 'secondary.totalEth>=50' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · total volume (primary + secondary)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_vol_5', name: 'Five Deep', blurb: '5 ETH in total volume.', points: 200, category: 'trading', trigger: 'volume.totalEth>=5' },
  { id: 'l_vol_25', name: 'Heavyweight', blurb: '25 ETH in total volume.', points: 500, category: 'trading', trigger: 'volume.totalEth>=25' },
  { id: 'l_vol_50', name: 'Leviathan', blurb: '50 ETH in total volume across PD.', points: 720, category: 'trading', trigger: 'volume.totalEth>=50' },
  { id: 'l_vol_100', name: 'Tidal', blurb: '100 ETH in total lifetime volume. The tide itself.', points: 880, category: 'trading', trigger: 'volume.totalEth>=100' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · trade counts
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_trades_25', name: 'Working the Book', blurb: 'Complete 25 trades.', points: 120, category: 'trading', trigger: 'trades.count>=25' },
  { id: 'l_trades_100', name: 'Tape Reader', blurb: 'Complete 100 trades.', points: 280, category: 'trading', trigger: 'trades.count>=100' },
  { id: 'l_trades_250', name: 'Velocity', blurb: 'Complete 250 trades.', points: 420, category: 'trading', trigger: 'trades.count>=250' },
  { id: 'l_trades_500', name: 'Flow State', blurb: 'Complete 500 trades.', points: 600, category: 'trading', trigger: 'trades.count>=500' },
  { id: 'l_trades_1000', name: 'A Thousand Crossings', blurb: 'Complete 1,000 trades. The market is muscle memory now.', points: 840, category: 'trading', trigger: 'trades.count>=1000' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · buys
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_buy_10', name: 'Bidder', blurb: 'Buy 10 pieces on the secondary market.', points: 70, category: 'trading', trigger: 'buy.count>=10' },
  { id: 'l_buy_25', name: 'Accumulator', blurb: 'Buy 25 pieces on the secondary market.', points: 140, category: 'trading', trigger: 'buy.count>=25' },
  { id: 'l_buy_100', name: 'Bid Wall', blurb: 'Buy 100 pieces on the secondary market.', points: 300, category: 'trading', trigger: 'buy.count>=100' },
  { id: 'l_buy_250', name: 'Insatiable', blurb: 'Buy 250 pieces on the secondary market.', points: 460, category: 'trading', trigger: 'buy.count>=250' },
  { id: 'l_buy_500', name: 'Sweep Master', blurb: 'Buy 500 pieces on the secondary market.', points: 640, category: 'trading', trigger: 'buy.count>=500' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · sales
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_sale_10', name: 'Seller', blurb: 'Sell 10 pieces.', points: 70, category: 'trading', trigger: 'sale.count>=10' },
  { id: 'l_sale_25', name: 'Distributor', blurb: 'Sell 25 pieces.', points: 140, category: 'trading', trigger: 'sale.count>=25' },
  { id: 'l_sale_100', name: 'Exit Liquidity', blurb: 'Sell 100 pieces.', points: 300, category: 'trading', trigger: 'sale.count>=100' },
  { id: 'l_sale_250', name: 'Wholesaler', blurb: 'Sell 250 pieces.', points: 460, category: 'trading', trigger: 'sale.count>=250' },
  { id: 'l_sale_500', name: 'Clearing House', blurb: 'Sell 500 pieces.', points: 640, category: 'trading', trigger: 'sale.count>=500' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · listings
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_list_10', name: 'Shopkeeper', blurb: 'Create 10 listings.', points: 45, category: 'trading', trigger: 'list.count>=10' },
  { id: 'l_list_50', name: 'Stall Holder', blurb: 'Create 50 listings.', points: 130, category: 'trading', trigger: 'list.count>=50' },
  { id: 'l_list_100', name: 'Storefront', blurb: 'Create 100 listings.', points: 230, category: 'trading', trigger: 'list.count>=100' },
  { id: 'l_list_250', name: 'Always Open', blurb: 'Create 250 listings.', points: 380, category: 'trading', trigger: 'list.count>=250' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · offers made
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_offer_10', name: 'Negotiator', blurb: 'Place 10 offers.', points: 45, category: 'trading', trigger: 'offerMade.count>=10' },
  { id: 'l_offer_50', name: 'Dealmaker', blurb: 'Place 50 offers.', points: 130, category: 'trading', trigger: 'offerMade.count>=50' },
  { id: 'l_offer_100', name: 'Relentless Bidder', blurb: 'Place 100 offers.', points: 230, category: 'trading', trigger: 'offerMade.count>=100' },
  { id: 'l_offer_250', name: 'Offer Cannon', blurb: 'Place 250 offers.', points: 380, category: 'trading', trigger: 'offerMade.count>=250' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · offers made & accepted (your offers landing)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_offer_acc_10', name: 'Closer', blurb: 'Get 10 of your offers accepted.', points: 110, category: 'trading', trigger: 'offerMade.acceptedCount>=10' },
  { id: 'l_offer_acc_25', name: 'Persuasive', blurb: 'Get 25 of your offers accepted.', points: 220, category: 'trading', trigger: 'offerMade.acceptedCount>=25' },
  { id: 'l_offer_acc_100', name: 'Always Lands', blurb: 'Get 100 of your offers accepted.', points: 420, category: 'trading', trigger: 'offerMade.acceptedCount>=100' },

  // ─────────────────────────────────────────────────────────────────────
  //  TRADING · offers accepted (you accepted others' offers)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_accept_10', name: 'Open Door', blurb: 'Accept 10 offers on your pieces.', points: 110, category: 'trading', trigger: 'offerAccepted.count>=10' },
  { id: 'l_accept_25', name: 'Liquid Provider', blurb: 'Accept 25 offers on your pieces.', points: 220, category: 'trading', trigger: 'offerAccepted.count>=25' },
  { id: 'l_accept_100', name: 'Market Backbone', blurb: 'Accept 100 offers on your pieces.', points: 420, category: 'trading', trigger: 'offerAccepted.count>=100' },

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · followers
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_foll_50', name: 'Signal', blurb: 'Reach 50 followers.', points: 120, category: 'social', trigger: 'followers.count>=50' },
  { id: 'l_foll_100', name: 'Audience', blurb: 'Reach 100 followers.', points: 220, category: 'social', trigger: 'followers.count>=100' },
  { id: 'l_foll_250', name: 'Following', blurb: 'Reach 250 followers.', points: 340, category: 'social', trigger: 'followers.count>=250' },
  { id: 'l_foll_500', name: 'Tastemaker', blurb: 'Reach 500 followers.', points: 480, category: 'social', trigger: 'followers.count>=500' },
  { id: 'l_foll_1000', name: 'Household Name', blurb: 'Reach 1,000 followers.', points: 660, category: 'social', trigger: 'followers.count>=1000' },
  { id: 'l_foll_5000', name: 'Movement', blurb: 'Reach 5,000 followers. You are a current, not a ripple.', points: 880, category: 'social', trigger: 'followers.count>=5000' },

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · following
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_following_100', name: 'Connected', blurb: 'Follow 100 people.', points: 80, category: 'social', trigger: 'following.count>=100' },
  { id: 'l_following_250', name: 'Plugged In', blurb: 'Follow 250 people.', points: 150, category: 'social', trigger: 'following.count>=250' },
  { id: 'l_following_500', name: 'The Whole Room', blurb: 'Follow 500 people.', points: 250, category: 'social', trigger: 'following.count>=500' },

  // ─────────────────────────────────────────────────────────────────────
  //  SOCIAL · mutuals
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_mutual_25', name: 'Crew', blurb: 'Reach 25 mutuals.', points: 110, category: 'social', trigger: 'mutuals.count>=25' },
  { id: 'l_mutual_50', name: 'Circle of Trust', blurb: 'Reach 50 mutuals.', points: 200, category: 'social', trigger: 'mutuals.count>=50' },
  { id: 'l_mutual_100', name: 'Family', blurb: 'Reach 100 mutuals. They came back.', points: 360, category: 'social', trigger: 'mutuals.count>=100' },

  // ─────────────────────────────────────────────────────────────────────
  //  PROJECTS · following projects
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_projfoll_25', name: 'Big Watchlist', blurb: 'Follow 25 projects.', points: 90, category: 'projects', trigger: 'projectFollows.count>=25' },
  { id: 'l_projfoll_50', name: 'All Eyes', blurb: 'Follow 50 projects — every one on PD.', points: 200, category: 'projects', trigger: 'projectFollows.count>=50' },

  // ─────────────────────────────────────────────────────────────────────
  //  ANOINTING · given
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_anoint_g_100', name: 'Kingmaker', blurb: 'Anoint 100 pieces.', points: 250, category: 'anointing', trigger: 'anoint.given>=100' },
  { id: 'l_anoint_g_250', name: 'The Canon', blurb: 'Anoint 250 pieces. Your taste is a body of work.', points: 420, category: 'anointing', trigger: 'anoint.given>=250' },
  { id: 'l_anoint_g_500', name: 'Oracle of Taste', blurb: 'Anoint 500 pieces. The canon runs through you.', points: 620, category: 'anointing', trigger: 'anoint.given>=500' },

  // ─────────────────────────────────────────────────────────────────────
  //  ANOINTING · received
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_anoint_r_50', name: 'Acclaimed', blurb: 'Collect 50 anoints across your pieces.', points: 250, category: 'anointing', trigger: 'anoint.received>=50' },
  { id: 'l_anoint_r_100', name: 'Canonized', blurb: 'Collect 100 anoints across your pieces.', points: 420, category: 'anointing', trigger: 'anoint.received>=100' },
  { id: 'l_anoint_r_500', name: 'Sanctified', blurb: 'Collect 500 anoints. The community keeps blessing your work.', points: 720, category: 'anointing', trigger: 'anoint.received>=500' },

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · distinct projects owned
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_own_proj_50', name: 'The Complete Set', blurb: 'Own pieces from 50 different projects — all of PD.', points: 500, category: 'curation', trigger: 'holdings.distinctProjects>=50' },

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · total pieces held
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_held_10', name: 'A Wall', blurb: 'Hold 10 pieces.', points: 40, category: 'curation', trigger: 'holdings.total>=10' },
  { id: 'l_held_50', name: 'A Gallery', blurb: 'Hold 50 pieces.', points: 110, category: 'curation', trigger: 'holdings.total>=50' },
  { id: 'l_held_100', name: 'A Collection', blurb: 'Hold 100 pieces.', points: 220, category: 'curation', trigger: 'holdings.total>=100' },
  { id: 'l_held_500', name: 'An Estate', blurb: 'Hold 500 pieces.', points: 480, category: 'curation', trigger: 'holdings.total>=500' },
  { id: 'l_held_1000', name: 'A Museum', blurb: 'Hold 1,000 pieces. A lifetime of collecting in one wallet.', points: 760, category: 'curation', trigger: 'holdings.total>=1000' },

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · max from one project (depth of conviction)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_hold_deep_10', name: 'Set Builder', blurb: 'Hold 10 pieces from one project.', points: 60, category: 'curation', trigger: 'holdings.maxPerProject>=10' },
  { id: 'l_hold_deep_25', name: 'Major Holder', blurb: 'Hold 25 pieces from one project.', points: 150, category: 'curation', trigger: 'holdings.maxPerProject>=25' },
  { id: 'l_hold_deep_100', name: 'Whale of One', blurb: 'Hold 100 pieces from a single project. You are the floor.', points: 480, category: 'curation', trigger: 'holdings.maxPerProject>=100' },

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · albums
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_album_5', name: 'Shelving', blurb: 'Create 5 albums.', points: 35, category: 'curation', trigger: 'albums.count>=5' },
  { id: 'l_album_10', name: 'Librarian', blurb: 'Create 10 albums.', points: 80, category: 'curation', trigger: 'albums.count>=10' },
  { id: 'l_album_25', name: 'Archivist', blurb: 'Create 25 albums.', points: 180, category: 'curation', trigger: 'albums.count>=25' },
  { id: 'l_album_big_25', name: 'Magnum Opus', blurb: 'Fill an album with 25 pieces.', points: 70, category: 'curation', trigger: 'albums.maxItems>=25' },
  { id: 'l_album_big_50', name: 'Definitive Edition', blurb: 'Fill an album with 50 pieces.', points: 150, category: 'curation', trigger: 'albums.maxItems>=50' },

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · stars
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_stars_100', name: 'Stargazer', blurb: 'Star 100 pieces.', points: 70, category: 'curation', trigger: 'stars.count>=100' },
  { id: 'l_stars_500', name: 'Galaxy Brain', blurb: 'Star 500 pieces.', points: 200, category: 'curation', trigger: 'stars.count>=500' },

  // ─────────────────────────────────────────────────────────────────────
  //  CURATION · wishlist, targets, showcase
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_wishlist_10', name: 'Big Dreams', blurb: 'Wishlist 10 pieces.', points: 25, category: 'curation', trigger: 'wishlist.count>=10' },
  { id: 'l_wishlist_50', name: 'Shopping List', blurb: 'Wishlist 50 pieces.', points: 80, category: 'curation', trigger: 'wishlist.count>=50' },
  { id: 'l_targets_10', name: 'Forecaster', blurb: 'Set 10 price targets.', points: 60, category: 'curation', trigger: 'targets.count>=10' },
  { id: 'l_targets_50', name: 'Quant', blurb: 'Set 50 price targets.', points: 160, category: 'curation', trigger: 'targets.count>=50' },

  // ─────────────────────────────────────────────────────────────────────
  //  STREAK · beyond core (60/100/180/365 are core — these extend)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_streak_500', name: 'Unbroken', blurb: 'Reach a 500-day PriceStreak.', points: 550, category: 'streak', trigger: 'streak.days>=500' },
  { id: 'l_streak_730', name: 'Two-Year Flame', blurb: 'Reach a 730-day PriceStreak. Two years, every single day.', points: 750, category: 'streak', trigger: 'streak.days>=730' },
  { id: 'l_streak_1000', name: 'The Eternal Flame', blurb: 'Reach a 1,000-day PriceStreak. A discipline almost nobody will match.', points: 920, category: 'streak', trigger: 'streak.days>=1000' },

  // ─────────────────────────────────────────────────────────────────────
  //  OG · tenure / anniversaries (core has years 1 & 2)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_tenure_3', name: 'Three Years On', blurb: 'Three years since you joined PD.', points: 250, category: 'og', trigger: 'tenure.years>=3' },
  { id: 'l_tenure_5', name: 'Old Growth', blurb: 'Five years since you joined PD. You watched it become this.', points: 450, category: 'og', trigger: 'tenure.years>=5' },
  { id: 'l_tenure_d_1000', name: 'A Thousand Days', blurb: 'A thousand days since you joined PD.', points: 300, category: 'og', trigger: 'tenure.days>=1000' },

  // ─────────────────────────────────────────────────────────────────────
  //  RANK · PriceScore milestones (1000/5000 core, Mjölnir owns 10000)
  // ─────────────────────────────────────────────────────────────────────

  // ─────────────────────────────────────────────────────────────────────
  //  RANK · PriceRank tiers — fill the gaps (core has 2, 5, 10)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_rank_3', name: 'Ascending', blurb: 'Reach PriceRank 3.', points: 50, category: 'rank', trigger: 'rank.tier>=3' },
  { id: 'l_rank_4', name: 'Proven', blurb: 'Reach PriceRank 4.', points: 75, category: 'rank', trigger: 'rank.tier>=4' },
  { id: 'l_rank_6', name: 'Established', blurb: 'Reach PriceRank 6.', points: 150, category: 'rank', trigger: 'rank.tier>=6' },
  { id: 'l_rank_7', name: 'Distinguished', blurb: 'Reach PriceRank 7.', points: 220, category: 'rank', trigger: 'rank.tier>=7' },
  { id: 'l_rank_8', name: 'Eminent', blurb: 'Reach PriceRank 8.', points: 320, category: 'rank', trigger: 'rank.tier>=8' },
  { id: 'l_rank_9', name: 'Legendary', blurb: 'Reach PriceRank 9 — one step from the apex.', points: 440, category: 'rank', trigger: 'rank.tier>=9' },

  // ─────────────────────────────────────────────────────────────────────
  //  RANK · leaderboard & season ladders
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_lb_1000', name: 'On the Board', blurb: 'Enter the top 1,000 on the leaderboard.', points: 60, category: 'rank', trigger: 'leaderboard.bestRank<=1000' },
  { id: 'l_lb_500', name: 'Rising', blurb: 'Enter the top 500 on the leaderboard.', points: 110, category: 'rank', trigger: 'leaderboard.bestRank<=500' },
  { id: 'l_lb_50', name: 'Top Fifty', blurb: 'Enter the top 50 on the leaderboard.', points: 220, category: 'rank', trigger: 'leaderboard.bestRank<=50' },
  { id: 'l_lb_10', name: 'Top Ten', blurb: 'Enter the top 10 on the leaderboard.', points: 400, category: 'rank', trigger: 'leaderboard.bestRank<=10' },
  { id: 'l_lb_3', name: 'On the Podium', blurb: 'Reach top 3 on the leaderboard.', points: 600, category: 'rank', trigger: 'leaderboard.bestRank<=3' },
  { id: 'l_season_100', name: 'Seasoned', blurb: 'Finish a season in the top 100.', points: 120, category: 'rank', trigger: 'season.bestFinish<=100' },
  { id: 'l_season_25', name: 'Season Contender', blurb: 'Finish a season in the top 25.', points: 280, category: 'rank', trigger: 'season.bestFinish<=25' },
  { id: 'l_season_3', name: 'Season Podium', blurb: 'Finish a season in the top 3.', points: 500, category: 'rank', trigger: 'season.bestFinish<=3' },

  // ─────────────────────────────────────────────────────────────────────
  //  ARTIST · projects uploaded
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_art_proj_3', name: 'Body of Work', blurb: 'Upload 3 projects.', points: 180, category: 'artist', trigger: 'artist.projects>=3' },
  { id: 'l_art_proj_5', name: 'Studio', blurb: 'Upload 5 projects.', points: 300, category: 'artist', trigger: 'artist.projects>=5' },
  { id: 'l_art_proj_10', name: 'Prolific', blurb: 'Upload 10 projects.', points: 480, category: 'artist', trigger: 'artist.projects>=10' },

  // ─────────────────────────────────────────────────────────────────────
  //  ARTIST · primary sales
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_art_sales_25', name: 'Selling', blurb: 'Sell 25 pieces of your own work.', points: 130, category: 'artist', trigger: 'artist.primarySales>=25' },
  { id: 'l_art_sales_100', name: 'In Demand', blurb: 'Sell 100 pieces of your own work.', points: 300, category: 'artist', trigger: 'artist.primarySales>=100' },
  { id: 'l_art_sales_500', name: 'Sought After', blurb: 'Sell 500 pieces of your own work.', points: 560, category: 'artist', trigger: 'artist.primarySales>=500' },
  { id: 'l_art_sales_1000', name: 'A Thousand Sold', blurb: 'Sell 1,000 pieces of your own work. A career in primaries.', points: 820, category: 'artist', trigger: 'artist.primarySales>=1000' },

  // ─────────────────────────────────────────────────────────────────────
  //  ARTIST · holders
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_art_hold_10', name: 'Ten Believers', blurb: 'Reach 10 holders on your work.', points: 90, category: 'artist', trigger: 'artist.holders>=10' },
  { id: 'l_art_hold_50', name: 'A Following', blurb: 'Reach 50 holders on your work.', points: 180, category: 'artist', trigger: 'artist.holders>=50' },
  { id: 'l_art_hold_500', name: 'Widely Held', blurb: 'Reach 500 holders on your work.', points: 480, category: 'artist', trigger: 'artist.holders>=500' },
  { id: 'l_art_hold_1000', name: 'A Thousand Homes', blurb: 'Your work lives in 1,000 different wallets.', points: 760, category: 'artist', trigger: 'artist.holders>=1000' },

  // ─────────────────────────────────────────────────────────────────────
  //  ARTIST · secondary volume on your work
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_art_sec_5', name: 'Resold', blurb: '5 ETH secondary volume on your work.', points: 180, category: 'artist', trigger: 'artist.secondaryEth>=5' },
  { id: 'l_art_sec_25', name: 'Liquid Art', blurb: '25 ETH secondary volume on your work.', points: 420, category: 'artist', trigger: 'artist.secondaryEth>=25' },
  { id: 'l_art_sec_50', name: 'Bona Fide Blue Chip', blurb: '50 ETH secondary volume on your work.', points: 640, category: 'artist', trigger: 'artist.secondaryEth>=50' },
  { id: 'l_art_sec_100', name: 'Generational Work', blurb: '100 ETH secondary volume on your work. Collectors trade it for years.', points: 880, category: 'artist', trigger: 'artist.secondaryEth>=100' },

  // ─────────────────────────────────────────────────────────────────────
  //  ARTIST · sellouts
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_art_sellout_3', name: 'Hat Trick', blurb: 'Sell out 3 of your projects.', points: 450, category: 'artist', trigger: 'artist.selloutProjects>=3' },
  { id: 'l_art_sellout_5', name: 'Reliable Sellout', blurb: 'Sell out 5 of your projects.', points: 650, category: 'artist', trigger: 'artist.selloutProjects>=5' },
  { id: 'l_art_sellout_10', name: 'Untouchable', blurb: 'Sell out 10 of your projects. They mint themselves now.', points: 880, category: 'artist', secret: true, trigger: 'artist.selloutProjects>=10' },

  // ─────────────────────────────────────────────────────────────────────
  //  ARTIST · project-followers (across your projects)
  // ─────────────────────────────────────────────────────────────────────
  { id: 'l_art_pf_100', name: 'Watched', blurb: 'Reach 100 followers across your projects.', points: 120, category: 'artist', trigger: 'artist.projectFollowers>=100' },
  { id: 'l_art_pf_1000', name: 'Anticipated', blurb: 'Reach 1,000 followers across your projects.', points: 480, category: 'artist', trigger: 'artist.projectFollowers>=1000' },
  { id: 'l_art_pf_5000', name: 'Every Drop an Event', blurb: 'Reach 5,000 followers across your projects.', points: 800, category: 'artist', trigger: 'artist.projectFollowers>=5000' },
] as const;
