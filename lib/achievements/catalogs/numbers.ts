/**
 * ════════════════════════════════════════════════════════════════════════
 *  PriceOS — NUMBER ACHIEVEMENTS  (the token-number easter-egg bank)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Hidden, deadpan, screenshot-bait — the same register as core's "Nice."
 * Every trigger is either exact token-number ownership (`holdings.tokenNumber==N`,
 * already generic in the engine) or one of the engine's ready-built math
 * property checks (perfect / triangular / square / cube / fibonacci /
 * power-of-two / palindrome — prime is already in core). Zero engine changes.
 *
 * CONVENTIONS
 *   • ids prefixed `n_`, unique, never reused. All rows `secret: true`.
 *   • Token numbers respect the CONTRACT RANGE 22–9,999 (locked 2026-07-01,
 *     pd-contracts) — no egg below #22, none above #9999.
 *   • No 666, and no number that exists only as a 666 joke.
 *   • Points small-to-medium — these are joy, not rank. (They're on-chain
 *     holdings, so they do score — kept modest so eggs never outweigh deeds.)
 */

import type { Achievement } from '../catalog';

const egg = (
  n: number,
  name: string,
  blurb: string,
  points: number
): Achievement => ({
  id: `n_token_${n}`,
  name,
  blurb,
  points,
  category: 'lore',
  secret: true,
  trigger: `holdings.tokenNumber==${n}`,
});

export const NUMBER_ACHIEVEMENTS: readonly Achievement[] = [
  // ── The bank · 22–99 ──────────────────────────────────────────────────
  egg(23, 'His Airness', 'Own token #23. The greatest of all time, and it isn’t close.', 23),
  egg(24, 'Two Dozen', 'Own token #24. Efficient packaging.', 24),
  egg(27, 'The Club', 'Own token #27. Some numbers retire early.', 27),
  egg(33, 'The Master Builder', 'Own token #33 — the master number. The universe’s contractor licence.', 33),
  egg(37, 'The Other Random Number', 'Own token #37. Ask anyone for a random number. Watch.', 37),
  egg(40, 'Over the Hill', 'Own token #40. A very good year, actually.', 40),
  egg(44, 'Double Four', 'Own token #44. Twice as sturdy.', 44),
  egg(47, 'The Recurring Number', 'Own token #47. Once you see it, you cannot stop.', 47),
  egg(50, 'Half Century', 'Own token #50.', 50),
  egg(52, 'Full Deck', 'Own token #52. Playing with one, allegedly.', 52),
  egg(55, 'Double Nickel', 'Own token #55.', 55),
  egg(60, 'One Minute', 'Own token #60. That’s all it took.', 60),
  egg(64, 'Sixty-Four Bits', 'Own token #64. Blowing on the cartridge is optional.', 64),
  egg(66, 'Get Your Kicks', 'Own token #66. The mother road.', 66),
  egg(73, 'The Best Number', 'Own token #73 — the 21st prime; its mirror, 37, is the 12th. Perfection.', 73),
  egg(77, 'Double Luck', 'Own token #77. The universe winked twice.', 77),
  egg(80, 'Around the World', 'Own token #80 days’ worth of token.', 40),
  egg(86, 'Eighty-Sixed', 'Own token #86. Somehow still on the menu.', 43),
  egg(88, 'Eighty-Eight MPH', 'Own token #88. Where you’re going, you don’t need roads.', 88),
  egg(99, 'Ninety-Nine Problems', 'Own token #99. A token ain’t one.', 99),

  // ── The bank · 100–999 ────────────────────────────────────────────────
  egg(100, 'The Century', 'Own token #100.', 50),
  egg(101, 'Intro Course', 'Own token #101. No prerequisites.', 33),
  egg(108, 'The Sacred Count', 'Own token #108 — beads on the mala, and other significances you may recall.', 54),
  egg(111, 'Triple One', 'Own token #111 — the smaller portal. Still open.', 55),
  egg(123, 'Easy As', 'Own token #123.', 41),
  egg(137, 'Fine Structure', 'Own token #137 — physics’ favourite unexplained number.', 68),
  egg(151, 'Under the Truck', 'Own token #151. The hidden one. You heard it from a kid at school.', 51),
  egg(180, 'ONE HUNDRED AND EIGHTY', 'Own token #180. Say it like the darts announcer.', 60),
  egg(200, 'Pass Go', 'Own token #200. Collect it.', 40),
  egg(212, 'Boiling Point', 'Own token #212. Water’s, in Fahrenheit. Yours, in a bidding war.', 42),
  egg(222, 'All Is Well', 'Own token #222 — alignment. Things are arranging themselves.', 66),
  egg(234, 'Going Up', 'Own token #234. In order, please.', 39),
  egg(300, 'This Is Sparta', 'Own token #300. This is a token.', 60),
  egg(321, 'Countdown', 'Own token #321. Liftoff sold separately.', 43),
  egg(333, 'Halfway to Heaven', 'Own token #333 — the ascended masters are watching your wallet approvingly.', 67),
  egg(343, 'Seven Cubed', 'Own token #343.', 49),
  egg(360, 'Full Circle', 'Own token #360. No scope required.', 45),
  egg(365, 'Every Single Day', 'Own token #365.', 52),
  egg(404, 'Not Found', 'Own token #404. It exists. The irony is the art.', 80),
  egg(411, 'The Information', 'Own token #411. Ask it anything.', 41),
  egg(444, 'Protected', 'Own token #444 — angels on every side.', 88),
  egg(451, 'Fahrenheit', 'Own token #451 — the temperature at which paper burns. JPEGs are safe.', 45),
  egg(500, 'The Five Hundred', 'Own token #500. Take the checkered flag.', 50),
  egg(512, 'Half a K', 'Own token #512. Two to the ninth.', 51),
  egg(555, 'Hollywood Number', 'Own token #555. Every phone number in every movie.', 55),
  egg(707, 'The Jet Age', 'Own token #707. Began it.', 47),
  egg(720, 'Double Rotation', 'Own token #720. Land it clean.', 48),
  egg(747, 'Jumbo', 'Own token #747. Queen of the skies.', 74),
  egg(808, 'Drum Machine', 'Own token #808. The kick that built four decades of music.', 80),
  egg(999, 'One Short', 'Own token #999. So close to four digits it hurts.', 99),

  // ── The bank · 1000–9999 (range cap: contracts stop at 9,999) ────────
  egg(1000, 'The Grand', 'Own token #1000.', 100),
  egg(1024, 'Kilobyte', 'Own token #1024 — a true kilobyte, and we will die on this hill.', 64),
  egg(1234, 'In Sequence', 'Own token #1234. The combination on someone’s luggage.', 62),
  egg(1492, 'The Ocean Blue', 'Own token #1492. You discovered it. Others were already here.', 49),
  egg(1969, 'One Small Step', 'Own token #1969. The Eagle has landed in your wallet.', 96),
  egg(1984, 'Big Brother', 'Own token #1984. It’s watching your portfolio.', 84),
  egg(1999, 'Party Like It’s', 'Own token #1999. Tonight we’re gonna trade like it’s.', 99),
  egg(2000, 'Y2K Compliant', 'Own token #2000. Nothing crashed.', 50),
  egg(2001, 'The Monolith', 'Own token #2001. Full of stars.', 67),
  egg(2020, 'Hindsight', 'Own token #2020. You saw it coming, right?', 40),
  egg(2048, 'Merge the Tiles', 'Own token #2048. Two to the eleventh, or one very lost afternoon.', 64),
  egg(2187, 'Detention Block', 'Own token #2187 — three to the seventh, and a cell on the Death Star.', 63),
  egg(2222, 'Double Alignment', 'Own token #2222. The angels are showing off now.', 88),
  egg(2401, 'Seven to the Fourth', 'Own token #2401.', 49),
  egg(3000, 'Love You', 'Own token #3000.', 75),
  egg(3141, 'More Pi', 'Own token #3141 — one digit deeper than the core.', 62),
  egg(3333, 'Triple Trinity', 'Own token #3333.', 99),
  egg(3600, 'One Full Hour', 'Own token #3600 — every second of it.', 36),
  egg(4004, 'The First Chip', 'Own token #4004 — where all of this actually started.', 80),
  egg(4096, 'Four K', 'Own token #4096. Two to the twelfth. Crisp.', 64),
  egg(4815, 'The Numbers', 'Own token #4815. 4 8 15 16 23 42. Don’t enter them into anything.', 108),
  egg(5000, 'Five Racks', 'Own token #5000.', 50),
  egg(5309, 'Jenny', 'Own token #5309. For a good time, hold.', 86),
  egg(5555, 'Quadruple Five', 'Own token #5555. Change is coming, four times over.', 95),
  egg(6174, 'Kaprekar’s Constant', 'Own token #6174 — every four-digit number falls here in seven steps. Look it up. Lose an evening.', 100),
  egg(6969, 'Nice. Nice.', 'Own token #6969. Twice as nice.', 96),
  egg(7777, 'Jackpot', 'Own token #7777. The machine pays out.', 97),
  egg(8008, 'Calculator Humour', 'Own token #8008. Type it. Flip it. You’re welcome.', 80),
  egg(8128, 'The Fourth Perfection', 'Own token #8128 — the fourth perfect number, known since antiquity.', 100),
  egg(9001, 'Over Nine Thousand', 'Own token #9001. WHAT, NINE THOUSAND?!', 90),
  egg(9999, 'The Last Door', 'Own token #9999 — the final number any PD contract will ever mint.', 99),

  // ── Math properties · the engine's ready-built predicates ────────────
  { id: 'n_prop_perfect', name: 'Perfectly Balanced', blurb: 'Own a token whose number is perfect — it equals the sum of its own divisors. As all things should be.', points: 60, category: 'lore', secret: true, trigger: 'holdings.tokenNumberPerfect' },
  { id: 'n_prop_triangular', name: 'Rack ’Em', blurb: 'Own a token whose number is triangular — it stacks into a perfect pyramid.', points: 35, category: 'lore', secret: true, trigger: 'holdings.tokenNumberTriangular' },
  { id: 'n_prop_square', name: 'Perfectly Square', blurb: 'Own a token whose number is a perfect square. Respectable. Dependable. Square.', points: 35, category: 'lore', secret: true, trigger: 'holdings.tokenNumberSquare' },
  { id: 'n_prop_cube', name: 'Cubed', blurb: 'Own a token whose number is a perfect cube. Three dimensions of ownership.', points: 45, category: 'lore', secret: true, trigger: 'holdings.tokenNumberCube' },
  { id: 'n_prop_fibonacci', name: 'Golden Child', blurb: 'Own a token whose number lives in the Fibonacci sequence. Nature approves.', points: 45, category: 'lore', secret: true, trigger: 'holdings.tokenNumberFibonacci' },
  { id: 'n_prop_pow2', name: 'Binary Native', blurb: 'Own a token whose number is a power of two. The machines consider you family.', points: 40, category: 'lore', secret: true, trigger: 'holdings.tokenNumberPowerOfTwo' },
  { id: 'n_prop_palindrome', name: 'Reads Both Ways', blurb: 'Own a token whose number is a palindrome. Elegant coming and going.', points: 40, category: 'lore', secret: true, trigger: 'holdings.tokenNumberPalindrome' },
] as const;
