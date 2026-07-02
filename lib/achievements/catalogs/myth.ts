/**
 * ════════════════════════════════════════════════════════════════════════
 *  PriceOS — MYTH ACHIEVEMENTS  (the Odin arc — hinted, never hardcore)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Brendon's brief (2026-07-02): Odin appears as a character in the deeper,
 * more accomplished achievements — but PD is a gen-art platform, not a
 * heathen one. So: a SMALL set, Odin-explicit (the Wanderer himself, his
 * ravens, his famous stories), mythology hinted at rather than catalogued.
 * No rune alphabets, no realm pilgrimages, no deep-cut deities.
 *
 * Same `Achievement` shape, same trigger DSL, zero engine changes — every
 * trigger is an existing footprint path (see ../engine.ts).
 *
 * CONVENTIONS
 *   • ids prefixed `m_`, unique snake_case, never reused.
 *   • Nothing ≥ 1000 points — Mjölnir (core) owns the 1000 capstone.
 *   • No 666 anywhere. Blurbs in Odin's register: patient, wry, long-game.
 */

import type { Achievement } from '../catalog';

export const MYTH_ACHIEVEMENTS: readonly Achievement[] = [
  // ── His ravens · thought and memory ───────────────────────────────────
  { id: 'm_huginn', name: 'Huginn', blurb: 'Thought flies out each dawn. Follow 75 minds across the platform — see what the raven sees.', points: 15, category: 'myth', trigger: 'following.count>=75' },
  { id: 'm_muninn', name: 'Muninn', blurb: 'Memory returns each dusk. Keep an album 40 deep — a raven’s ledger of what mattered.', points: 15, category: 'myth', trigger: 'albums.maxItems>=40' },

  // ── His kit · the famous stories, mapped to real deeds ───────────────
  { id: 'm_wolves_fed', name: 'The Wolves Are Fed', blurb: 'The old man keeps two wolves and gives them everything on his plate. 150 trades — hunger and appetite, both satisfied.', points: 300, category: 'myth', trigger: 'trades.count>=150' },
  { id: 'm_sleipnir', name: 'Sleipnir', blurb: 'The old man’s horse has eight legs — fastest there is. Hold 8 pieces from one project and ride.', points: 50, category: 'myth', trigger: 'holdings.maxPerProject>=8' },
  { id: 'm_gungnir', name: 'Gungnir', blurb: 'The old man carries a spear that never misses. 50 of your offers found their mark.', points: 300, category: 'myth', trigger: 'offerMade.acceptedCount>=50' },
  { id: 'm_mimirs_well', name: 'Mímir’s Well', blurb: 'Wisdom has a price and you paid it — 3 ETH into primary, no flinching. The old man respects a fair trade.', points: 380, category: 'myth', trigger: 'primary.totalEth>=3' },
  { id: 'm_eye_given', name: 'The Eye Given', blurb: 'He gave an eye for a single drink of wisdom. You gave 9 ETH to the makers. He calls it even.', points: 620, category: 'myth', secret: true, trigger: 'primary.totalEth>=9' },
  { id: 'm_hanged_god', name: 'Nine Nights on the Tree', blurb: 'The old man once hung nine times twenty-seven nights for knowledge. A 243-day streak — sacrificed to yourself.', points: 25, category: 'myth', secret: true, trigger: 'streak.days>=243' },

  // ── His halls · the accomplished late game ────────────────────────────
  { id: 'm_valhalla', name: 'Valhalla', blurb: 'The hall of the chosen. Ten thousand score — you were carried in.', points: 400, category: 'myth', trigger: 'score.total>=10000' },
  { id: 'm_high_seat', name: 'The High Seat', blurb: 'There is a chair that sees everything. Sit in the top five of the leaderboard.', points: 460, category: 'myth', trigger: 'leaderboard.bestRank<=5' },
  { id: 'm_world_tree', name: 'The World-Tree', blurb: 'One tree holds every branch. Hold pieces from 35 projects — you’ve climbed most of it.', points: 380, category: 'myth', trigger: 'holdings.distinctProjects>=35' },
  { id: 'm_long_winter', name: 'The Long Winter', blurb: 'Two hundred pieces held through every season. The old man wintered worse, but he nods.', points: 380, category: 'myth', trigger: 'holdings.total>=200' },
  { id: 'm_wanderers_road', name: 'The Wanderer’s Road', blurb: '500 days on the road. Odin travels in worn boots, and now so do you.', points: 280, category: 'myth', trigger: 'tenure.days>=500' },
  { id: 'm_old_mans_approval', name: 'The Old Man’s Approval', blurb: '40 ETH in total volume. He leans on his staff, looks at your ledger a long time, and says nothing. That’s the approval.', points: 520, category: 'myth', trigger: 'volume.totalEth>=40' },
  { id: 'm_allfathers_regard', name: 'The Allfather’s Regard', blurb: 'The one-eyed gaze rests on you and does not move on. Almost no one earns this.', points: 700, category: 'myth', secret: true, trigger: 'score.total>=30000' },
] as const;
