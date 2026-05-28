/**
 * PriceSprite slot pools — design-seed redesign (CEO-locked 2026-05-13).
 *
 * 6 hash-driven slots: brackets / arms / eyes / brows / mouths / trails.
 * Pool sizes per vibe: 11 / 12 / 30 / 12 / 20 / 12.
 * Permutations: 11 × 12 × 30 × 12 × 20 × 12 = 11,404,800 per vibe.
 * Total across 4 vibes: ~46M unique sprites.
 *
 * Brackets / eyes / brows-first-10 are shared across vibes (same
 * content at the same indices); arms / trails / mouths / brows-last-2
 * are vibe-specific per stance lock. The standin wallet
 * 0x65c34afda745c12745db70ffa809311339279395 under Instigator
 * deterministically lands on:
 *   brackets[3] = ("(", ")")        chunk 65c3 → 26051 % 11 =  3
 *   arms[9]     = "ง"              chunk 4afd → 19197 % 12 =  9
 *   eyes[11]    = "•"              chunk a745 → 42821 % 30 = 11
 *   brows[7]    = ("̀", "́")          chunk c127 → 49447 % 12 =  7
 *   mouths[3]   = "_"              chunk 45db → 17883 % 20 =  3
 *   trails[7]   = ""               chunk 70ff → 28927 % 12 =  7
 * → composed: "(ง •̀_•́)ง" — the design seed the entire pool layout
 * is built around.
 *
 * Turn arm selection (load-bearing — do NOT alter):
 *   turnArmIndex = Math.floor(chunkArms / arms.length) % turnArms.length
 *   For the standin wallet: Math.floor(19197 / 12) % 2 = 1599 % 2 = 1
 *   → INSTIGATOR_TURN_ARMS[1] = 'ヽ' — the sim's AWAKE_L arm exactly.
 *
 * Vibe mapping:
 *   vibe_1 = SPRITE_DATA[0] = Observer    (arms-down deadpan)
 *   vibe_2 = SPRITE_DATA[1] = Instigator  (dukes up — standin lives here)
 *   vibe_3 = SPRITE_DATA[2] = Hacker      (front arm at keys, back trailing cable)
 *   vibe_4 = SPRITE_DATA[3] = Mystic      (front arm raised casting, back arm trailing energy)
 *
 * Asymmetric arm rule: both arms always the SAME character. armL
 * renders inside bracketL (composer adds trailing NBSP); armR
 * renders outside bracketR (no leading space). Positional asymmetry,
 * not character asymmetry. scaleX(-1) mirroring flips the entire
 * sprite as one figure.
 *
 * Turn arms follow the same symmetric rule — both sides flip to the
 * same turn arm char on a glyph-swap turn. CSS-mirror turns leave
 * arms unchanged (arm-stable).
 *
 * Eyebrow combining-diacritic system: each brow entry is a pair of
 * combining marks (browL, browR) that attach to the base eye char to
 * form a single grapheme cluster. Brows are the emote axis — mad,
 * concerned, concentrate, sleepy, quizzical, perked, woozy, alert,
 * sparkle, etc.
 *
 * Market-character vocabulary: currency symbols (¢ $ ₿ ¥ £) live in
 * the eye pool; direction symbols (▲ ▼) in the Instigator/Observer
 * mouth pools; math symbols (+ - % = etc.) in the Hacker mouth pool.
 * Reads as legitimate face features AND signals PD ("Price Discussion")
 * brand without being literal.
 *
 * Do NOT alter the SIZE of any pool — lengths drive the deterministic
 * permutation math; any size change shifts every existing user's
 * sprite. Content reordering within a pool also shifts sprites; only
 * the named standin positions are load-bearing for verification.
 */

export interface VibeSlots {
    /** 11 bracket pairs [L, R] flanking the face band. */
    brackets: readonly (readonly [string, string])[];
    /** 12 single arm chars — rendered in BOTH L and R positions
        (asymmetric placement, symmetric character). */
    arms: readonly string[];
    /** Turn-arm variants — used when the sprite does a glyph-swap turn
        (facing left, mirrorMode === false). Same character both sides
        (symmetric rule preserved). Selection:
          Math.floor(chunkArms / arms.length) % turnArms.length
        INSTIGATOR_TURN_ARMS[1] = 'ヽ' is load-bearing (standin wallet). */
    turnArms: readonly string[];
    /** 30 single eye base chars — combining brow attaches at compose. */
    eyes: readonly string[];
    /** 12 brow pairs [L, R] — combining diacritics. browL stacks on
        eyeL, browR stacks on eyeR, forming one grapheme cluster each. */
    brows: readonly (readonly [string, string])[];
    /** 20 single mouth chars between the eyes. */
    mouths: readonly string[];
    /** 12 single trail chars after armR — often empty (Observer all,
        Instigator most). */
    trails: readonly string[];
}

/* ─────────────── Shared across all 4 vibes ─────────────── */

/* 11 bracket pairs. brackets[3] = ("(", ")") for standin lock. Mix
   of ASCII, math symbols, and Asian punctuation half-widths. */
const BRACKETS: readonly (readonly [string, string])[] = [
    ['[', ']'],            // 0
    ['{', '}'],            // 1
    ['<', '>'],            // 2
    ['(', ')'],            // 3 ── STANDIN
    ['\u27E8', '\u27E9'],  // 4  ⟨ ⟩
    ['\u27EA', '\u27EB'],  // 5  ⟪ ⟫
    ['\u2985', '\u2986'],  // 6  ⦅ ⦆
    ['\u3010', '\u3011'],  // 7  【 】
    ['\u300A', '\u300B'],  // 8  《 》
    ['\u27E6', '\u27E7'],  // 9  ⟦ ⟧
    ['\u0F3C', '\u0F3D'],  // 10 ༼ ༽
];

/* 30 eye base chars. eyes[11] = "•" for standin. Pareidolia-readable
   circles/dots + geometric shapes + currency symbols (market vocab).
   Combining brow attaches at compose time to form one grapheme cluster. */
const EYES: readonly string[] = [
    '\u00B0',  // 0  °
    'o',       // 1
    'O',       // 2
    '\u00B7',  // 3  ·
    '\u25E6',  // 4  ◦
    '\u3147',  // 5  ㅇ
    '\u25C9',  // 6  ◉
    '\u2299',  // 7  ⊙
    '\u229A',  // 8  ⊚
    '\u25CF',  // 9  ●
    '\u25CB',  // 10 ○
    '\u2022',  // 11 • ── STANDIN
    '\u233E',  // 12 ⌾
    '\u23E3',  // 13 ⏣
    '\u235F',  // 14 ⍟
    '\u2742',  // 15 ❂
    '\u229B',  // 16 ⊛
    '\u229C',  // 17 ⊜
    '\u2298',  // 18 ⊘
    '\u25EC',  // 19 ◬
    '\u238A',  // 20 ⎊
    '\u25A3',  // 21 ▣
    '\u25A2',  // 22 ▢
    '\u25BC',  // 23 ▼
    '\u25BD',  // 24 ▽
    '\u00A2',  // 25 ¢ — currency
    '$',       // 26   — currency
    '\u20BF',  // 27 ₿ — currency
    '\u00A5',  // 28 ¥ — currency
    '\u00A3',  // 29 £ — currency
];

/* 10 shared brow base entries (positions 0-9). Each vibe appends 2
   vibe-specific variants at positions 10-11. brows[7] = ("̀", "́")
   (grave/acute mad inward) is the standin. */
const SHARED_BROWS_BASE: readonly (readonly [string, string])[] = [
    ['', ''],                       // 0 — no brow (relaxed)
    ['\u0301', '\u0300'],           // 1 — acute/grave  (concerned outward)
    ['\u0302', '\u0302'],           // 2 — circumflex   (concentrate)
    ['\u0304', '\u0304'],           // 3 — macron       (flat / sleepy)
    ['\u030C', '\u030C'],           // 4 — caron        (quizzical)
    ['\u0306', '\u0306'],           // 5 — breve        (perked)
    ['\u0303', '\u0303'],           // 6 — tilde        (woozy)
    ['\u0300', '\u0301'],           // 7 — grave/acute  (MAD inward) ── STANDIN
    ['\u0308', '\u0308'],           // 8 — dieresis     (alert)
    ['\u0307', '\u0307'],           // 9 — dot above    (sparkle)
];

/* ─────────────── vibe_1 — Observer (arms-down deadpan) ─────────────── */

/* Both arms render as low / quiet glyphs. Per spec: . , ¸ _ - · °
   plus padding to 12 total. */
const OBSERVER_ARMS: readonly string[] = [
    '.',       // 0
    ',',       // 1
    '\u00B8',  // 2  ¸
    '_',       // 3
    '-',       // 4
    '\u00B7',  // 5  ·
    '\u00B0',  // 6  °
    '\u02D9',  // 7  ˙
    '\u2027',  // 8  ‧
    '\u201A',  // 9  ‚
    '\u201F',  // 10 ‟
    '\u2E33',  // 11 ⸳
];

/* Observer turn arms — glyph-swap turn variants. Deadpan vibe keeps
   a quiet register even mid-turn: '~' is a barely-there sway; "'"
   is a minimal upward flick. Neither breaks the Observer's stillness. */
const OBSERVER_TURN_ARMS: readonly string[] = [
    '~',  // 0 — sway
    "'",  // 1 — upward flick
];

/* Observer trail = empty across all 12 entries per spec ("trail empty"). */
const OBSERVER_TRAILS: readonly string[] = [
    '', '', '', '', '', '', '', '', '', '', '', '',
];

/* Observer mouths — flat/deadpan + direction symbols. mouths[3] = "_". */
const OBSERVER_MOUTHS: readonly string[] = [
    '.',       // 0
    '-',       // 1
    '~',       // 2
    '_',       // 3 ── STANDIN-compatible
    '=',       // 4
    '\u203F',  // 5  ‿
    '\u2323',  // 6  ⌣
    'o',       // 7
    'O',       // 8
    '0',       // 9
    '\u00B7',  // 10 ·
    '\u03C9',  // 11 ω
    '\u222A',  // 12 ∪
    '\u2229',  // 13 ∩
    'u',       // 14
    '\u25BE',  // 15 ▾ — direction
    '\u25BF',  // 16 ▿ — direction
    '\u25B1',  // 17 ▱
    '\u25B0',  // 18 ▰
    ' ',       // 19   — flat-line silence
];

const OBSERVER_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u0331', '\u0331'],  // 10 — macron below (downward emphasis)
    ['\u0332', '\u0332'],  // 11 — low line      (underlined gaze)
];

/* ─────────────── vibe_2 — Instigator (dukes up — STANDIN) ─────────────── */

/* Both arms render combat/instigation glyphs. arms[9] = "ง". */
const INSTIGATOR_ARMS: readonly string[] = [
    '\u1559',  // 0  ᕙ
    '\u1557',  // 1  ᕗ
    '\u1566',  // 2  ᕦ
    '\u1564',  // 3  ᕤ
    '\u0B68',  // 4  ୨
    '\u0B67',  // 5  ୧
    '\u2282',  // 6  ⊂
    '\u2283',  // 7  ⊃
    '\u3064',  // 8  つ
    '\u0E07',  // 9  ง ── STANDIN
    '\u3063',  // 10 っ
    '\u0E05',  // 11 ค
];

/* Instigator turn arms — glyph-swap turn variants. LOAD-BEARING:
   selector = Math.floor(19197 / 12) % 2 = 1. Brendon's wallet MUST
   land on turnArms[1] = 'ヽ' — the exact AWAKE_L arm from the sim
   standin '(ง •̀_•́)ง' → 'ヽ(•́_•̀ヽ)'. Do NOT reorder. */
const INSTIGATOR_TURN_ARMS: readonly string[] = [
    '\u1557',  // 0 ᕗ — leaning forward combat
    '\u30FD',  // 1 ヽ — sim AWAKE_L arm (LOAD-BEARING: standin wallet)
];

/* Instigator trails — mostly empty per spec ("trail mostly empty.
   Standin lives here."). trails[7] = "" for standin lock. */
const INSTIGATOR_TRAILS: readonly string[] = [
    '',        // 0
    '',        // 1
    '',        // 2
    '',        // 3
    '',        // 4
    '',        // 5
    '',        // 6
    '',        // 7 ── STANDIN
    '',        // 8
    '\u203C',  // 9  ‼
    '!',       // 10
    '?',       // 11
];

/* Instigator mouths — aggressive/charged kanji + direction symbols.
   mouths[3] = "_" for standin lock. */
const INSTIGATOR_MOUTHS: readonly string[] = [
    '\u76CA',  // 0  益
    '\u76BF',  // 1  皿
    '\u0414',  // 2  Д
    '_',       // 3 ── STANDIN
    '\u25B2',  // 4  ▲ — direction
    '\u25BC',  // 5  ▼ — direction
    '=',       // 6
    'm',       // 7
    'M',       // 8
    'w',       // 9
    'W',       // 10
    '\u2038',  // 11 ‸
    '\u2229',  // 12 ∩
    '\u25B0',  // 13 ▰
    '\u25B1',  // 14 ▱
    '\u25B8',  // 15 ▸
    '\u25C2',  // 16 ◂
    '\u2200',  // 17 ∀
    '\u203C',  // 18 ‼
    '\u2030',  // 19 ‰
];

const INSTIGATOR_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u0305', '\u0305'],  // 10 — overline      (anger flash)
    ['\u030F', '\u030F'],  // 11 — double grave  (brooding)
];

/* ─────────────── vibe_3 — Hacker (tech/syntax) ─────────────── */

/* Both arms render tech/syntax glyphs per spec (> _ ¬ ⌐ < padded to 12). */
const HACKER_ARMS: readonly string[] = [
    '>',       // 0
    '<',       // 1
    '_',       // 2
    '\u00AC',  // 3  ¬
    '\u2310',  // 4  ⌐
    '|',       // 5
    '\u00A6',  // 6  ¦
    '/',       // 7
    '\\',      // 8
    '=',       // 9
    '+',       // 10
    '*',       // 11
];

/* Hacker turn arms — glyph-swap turn variants. Both are outside the
   primary arm pool: '{' reads as a reaching/opening gesture; '~'
   signals approximation/motion. Both feel native to the code vibe
   and read as clearly different from the primary arm on a turn. */
const HACKER_TURN_ARMS: readonly string[] = [
    '{',  // 0 — reaching/opening bracket
    '~',  // 1 — motion/wave
];

/* Hacker trails — tech lines per spec (─ ═ ┄ ~ extended). */
const HACKER_TRAILS: readonly string[] = [
    '\u2500',  // 0  ─
    '\u2550',  // 1  ═
    '\u2504',  // 2  ┄
    '\u2505',  // 3  ┅
    '\u2501',  // 4  ━
    '~',       // 5
    '\u2248',  // 6  ≈
    '\u223C',  // 7  ∼
    '_',       // 8
    '.',       // 9
    '..',      // 10
    '...',     // 11
];

/* Hacker mouths — math symbols + punctuation tokens. */
const HACKER_MOUTHS: readonly string[] = [
    '.',       // 0
    '-',       // 1
    '%',       // 2  — math
    '_',       // 3
    '+',       // 4  — math
    '=',       // 5
    '~',       // 6
    '*',       // 7
    '#',       // 8
    ':',       // 9
    ';',       // 10
    '/',       // 11
    '\\',      // 12
    '|',       // 13
    '!',       // 14
    '?',       // 15
    '&',       // 16
    '@',       // 17
    '$',       // 18
    '^',       // 19
];

const HACKER_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u033E', '\u033E'],  // 10 — vertical tilde (glitch)
    ['\u0346', '\u0346'],  // 11 — bridge above   (overhead bar)
];

/* ─────────────── vibe_4 — Mystic (esoteric/runic) ─────────────── */

/* Both arms render stars/sparkles per spec (✦ ✧ ✺ ❋ ☆ ✱ ✤ ✥ extended). */
const MYSTIC_ARMS: readonly string[] = [
    '\u2726',  // 0  ✦
    '\u2727',  // 1  ✧
    '\u273A',  // 2  ✺
    '\u274B',  // 3  ❋
    '\u2606',  // 4  ☆
    '\u2731',  // 5  ✱
    '\u2724',  // 6  ✤
    '\u2725',  // 7  ✥
    '\u2736',  // 8  ✶
    '\u2737',  // 9  ✷
    '\u2738',  // 10 ✸
    '\u2739',  // 11 ✹
];

/* Mystic turn arms — glyph-swap turn variants. Energy/wave chars that
   sell the "wizard mid-cast / redirecting spell" read: '∿' is a
   sine-wave (energy in motion); '⟿' is a flowing arrow (momentum).
   Both feel distinct from the static sparkle primary arms — a clear
   visual event on turn that fits the esoteric vibe. */
const MYSTIC_TURN_ARMS: readonly string[] = [
    '\u223F',  // 0 ∿ — sine wave (energy flowing)
    '\u27FF',  // 1 ⟿ — flowing arrow (momentum/direction)
];

/* Mystic trails — energy/wave glyphs per spec (∿ ⌇ 〜 ⟿ ⤳ extended). */
const MYSTIC_TRAILS: readonly string[] = [
    '\u223F',  // 0  ∿
    '\u2307',  // 1  ⌇
    '\u301C',  // 2  〜
    '\u27FF',  // 3  ⟿
    '\u2933',  // 4  ⤳
    '\uFF5E',  // 5  ~
    '\u224B',  // 6  ≋
    '\u2972',  // 7  ⥲
    '\u293F',  // 8  ⤿
    '\u297F',  // 9  ⥿
    '\u2726',  // 10 ✦
    '\u00B7',  // 11 ·
];

/* Mystic mouths — esoteric symbols + curves. */
const MYSTIC_MOUTHS: readonly string[] = [
    '~',       // 0
    '_',       // 1
    '.',       // 2
    '_',       // 3
    '\u2323',  // 4  ⌣
    '\u203F',  // 5  ‿
    '\u222A',  // 6  ∪
    '\u2229',  // 7  ∩
    '\u25C7',  // 8  ◇
    '\u25C6',  // 9  ◆
    '\u25CB',  // 10 ○
    '\u25CF',  // 11 ●
    '\u25BD',  // 12 ▽
    '\u25B3',  // 13 △
    '\u22A5',  // 14 ⊥
    '\u22A4',  // 15 ⊤
    '\u22C4',  // 16 ⋄
    '\u2318',  // 17 ⌘
    '\u2609',  // 18 ☉
    '\u2295',  // 19 ⊕
];

const MYSTIC_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u033D', '\u033D'],  // 10 — x above    (hex mark)
    ['\u035B', '\u035B'],  // 11 — zigzag     (energy)
];

/* ─────────────── SPRITE_DATA assembly ─────────────── */

export const SPRITE_DATA: readonly VibeSlots[] = [
    /* vibe_1 — Observer */
    {
        brackets: BRACKETS,
        arms: OBSERVER_ARMS,
        turnArms: OBSERVER_TURN_ARMS,
        eyes: EYES,
        brows: [...SHARED_BROWS_BASE, ...OBSERVER_BROW_EXTRAS],
        mouths: OBSERVER_MOUTHS,
        trails: OBSERVER_TRAILS,
    },
    /* vibe_2 — Instigator (STANDIN lives here) */
    {
        brackets: BRACKETS,
        arms: INSTIGATOR_ARMS,
        turnArms: INSTIGATOR_TURN_ARMS,
        eyes: EYES,
        brows: [...SHARED_BROWS_BASE, ...INSTIGATOR_BROW_EXTRAS],
        mouths: INSTIGATOR_MOUTHS,
        trails: INSTIGATOR_TRAILS,
    },
    /* vibe_3 — Hacker */
    {
        brackets: BRACKETS,
        arms: HACKER_ARMS,
        turnArms: HACKER_TURN_ARMS,
        eyes: EYES,
        brows: [...SHARED_BROWS_BASE, ...HACKER_BROW_EXTRAS],
        mouths: HACKER_MOUTHS,
        trails: HACKER_TRAILS,
    },
    /* vibe_4 — Mystic */
    {
        brackets: BRACKETS,
        arms: MYSTIC_ARMS,
        turnArms: MYSTIC_TURN_ARMS,
        eyes: EYES,
        brows: [...SHARED_BROWS_BASE, ...MYSTIC_BROW_EXTRAS],
        mouths: MYSTIC_MOUTHS,
        trails: MYSTIC_TRAILS,
    },
];
