/**
 * PriceSprite slot pools — post-audit.
 *
 * STANDIN-LOCKED pool sizes (do NOT change after launch):
 *   BRACKETS: 11  — 26051 % 11 = 3 → ('(',')')
 *   EYES:     30  — 42821 % 30 = 11 → '•'
 *   INSTIGATOR_ARMS: 12 — 19197 % 12 = 9 → 'ง'
 *   INSTIGATOR_MOUTHS: 20 — 17883 % 20 = 3 → '_'
 *   INSTIGATOR_BROWS: 12 — 49447 % 12 = 7 → (grave,acute)
 *   INSTIGATOR_TRAILS: 12 — 28927 % 12 = 7 → ''
 *
 *   INSTIGATOR_TURN_ARMS[1] = 'ヽ' LOAD-BEARING:
 *     Math.floor(19197/12) % 2 = 1599 % 2 = 1 → ヽ ✓
 *
 * Non-standin pools (Observer/Hacker/Mystic arms/mouths/trails) may
 * change pre-launch; lock all sizes at mainnet deploy.
 *
 * Shades: 7th hash chunk (hex[24:28]). SHADES_POOL has 32 nulls +
 * 7 lens options ≈ 18% of wallets get shades. Arms move outside
 * brackets; ⌐ earpiece appears inside bracketL. No brow on lens.
 *
 * Mystic arm rule: all primary + turn arms are DOUBLED (e.g. ✦✦)
 * for the visual arm-length that reads as "wizard casting."
 */

export interface VibeSlots {
    brackets: readonly (readonly [string, string])[];
    arms:     readonly string[];
    /** 2 turn-arm variants. Hash-derived for turns; random per action anim. */
    turnArms: readonly string[];
    eyes:     readonly string[];
    brows:    readonly (readonly [string, string])[];
    mouths:   readonly string[];
    trails:   readonly string[];
}

// ─── Shared ───────────────────────────────────────────────────────────

/* 11 pairs — SIZE LOCKED. brackets[3] = ('(',')') STANDIN LOCK. */
const BRACKETS: readonly (readonly [string, string])[] = [
    ['[', ']'],           // 0
    ['{', '}'],           // 1
    ['<', '>'],           // 2
    ['(', ')'],           // 3  ── STANDIN LOCK
    ['\u27E8','\u27E9'],  // 4  ⟨⟩
    ['\u27EA','\u27EB'],  // 5  ⟪⟫
    ['\u2985','\u2986'],  // 6  ⦅⦆
    ['\u3010','\u3011'],  // 7  【】
    ['\u300A','\u300B'],  // 8  《》
    ['\u27E6','\u27E7'],  // 9  ⟦⟧
    ['\u0F3C','\u0F3D'],  // 10 ༼༽
];

/* 30 eyes — SIZE LOCKED. eyes[11] = '•' STANDIN LOCK. */
const EYES: readonly string[] = [
    '\u00B0','o','O','\u00B7','\u25E6','\u3147','\u25C9','\u2299',
    '\u229A','\u25CF','\u25CB','\u2022',   // 0-11  (11='•' STANDIN LOCK)
    '\u233E','\u23E3','\u235F','\u2742',   // 12-15
    '\u229B','\u229C','\u2298','\u25EC',   // 16-19
    '\u238A','\u25A3','\u25A2','\u25BC',   // 20-23
    '\u25BD','\u00A2','$','\u20BF',        // 24-27
    '\u00A5','\u00A3',                     // 28-29
];

/* Shades pool (7th hash chunk hex[24:28]).
   null = no shades; string = lens char (arms outside, ⌐ inside bracketL). */
export const SHADES_POOL: readonly (string | null)[] = [
    null,null,null,null,null,null,null,null,
    null,null,null,null,null,null,null,null,
    null,null,null,null,null,null,null,null,
    null,null,null,null,null,null,null,null, // 32 × null
    '\u229E',  // ⊞
    '\u22A1',  // ⊡
    '\u25A6',  // ▦
    '\u2E0E',  // ⸎
    '\u263B',  // ☻  (note: emoji risk on some platforms)
    '\u239A',  // ⎚
    '\u2298',  // ⊘
];
export const SHADES_EARPIECE = '\u2310'; // ⌐

const SHARED_BROWS_BASE: readonly (readonly [string, string])[] = [
    ['',''],                    // 0  none
    ['\u0301','\u0300'],        // 1  concerned outward
    ['\u0302','\u0302'],        // 2  circumflex concentrate
    ['\u0304','\u0304'],        // 3  macron flat/sleepy ← yawn override
    ['\u030C','\u030C'],        // 4  caron quizzical
    ['\u0306','\u0306'],        // 5  breve perked
    ['\u0303','\u0303'],        // 6  tilde woozy
    ['\u0300','\u0301'],        // 7  grave/acute MAD inward ── STANDIN LOCK
    ['\u0308','\u0308'],        // 8  dieresis alert
    ['\u0307','\u0307'],        // 9  dot-above sparkle ← cast override
];

// ─── vibe_1 — Observer ────────────────────────────────────────────────

const OBSERVER_ARMS: readonly string[] = [
    '.', ',', '\u00B8', '_', '-', '\u00B7',
    '\u00B0', '\u02D9', '\u2027', '\u201A', '\u201F', '\u2E33',
];
const OBSERVER_TURN_ARMS: readonly string[] = ['~', "'"];
const OBSERVER_TRAILS: readonly string[] = Array(12).fill('');
/* Audited: removed O 0 · ▾ ▿ ▱ ▰ space. Added v , */
const OBSERVER_MOUTHS: readonly string[] = [
    '.', '-', '~', '_', '=', '\u203F', '\u2323',
    'o', '\u03C9', '\u222A', '\u2229', 'u', 'v', ',',
];
const OBSERVER_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u0331','\u0331'], // 10 macron-below
    ['\u0332','\u0332'], // 11 low-line
];

// ─── vibe_2 — Instigator ──────────────────────────────────────────────

/* 12 arms — SIZE LOCKED. arms[9] = 'ง' STANDIN LOCK.
   idx 5: ୧ replaced with ☞ (was backwards-facing). */
const INSTIGATOR_ARMS: readonly string[] = [
    '\u1559',  // 0  ᕙ
    '\u1557',  // 1  ᕗ
    '\u1566',  // 2  ᕦ
    '\u1564',  // 3  ᕤ
    '\u0B68',  // 4  ୨
    '\u261E',  // 5  ☞  (replaced backwards ୧)
    '\u2282',  // 6  ⊂
    '\u2283',  // 7  ⊃
    '\u3064',  // 8  つ
    '\u0E07',  // 9  ง  ── STANDIN LOCK
    '\u3063',  // 10 っ
    '\u0E05',  // 11 ค
];
/* LOAD-BEARING: Math.floor(19197/12) % 2 = 1599 % 2 = 1 → ヽ ✓ */
const INSTIGATOR_TURN_ARMS: readonly string[] = [
    '\u1557',  // 0  ᕗ — combat lean
    '\u30FD',  // 1  ヽ — sim AWAKE_L  LOAD-BEARING
];
/* 12 trails — SIZE LOCKED. trails[7] = '' STANDIN LOCK. */
const INSTIGATOR_TRAILS: readonly string[] = [
    '','','','','','','','',  // 0-7 (7='' STANDIN LOCK)
    '','\u203C','!','?',      // 8-11
];
/* 20 mouths — SIZE LOCKED. mouths[3] = '_' STANDIN LOCK.
   Bad chars replaced in-place (M→ω W→u Д→o ▲→^ ▼→v non-mouths→mouth chars).
   益 皿 kept at 0,1 (CEO-approved). */
const INSTIGATOR_MOUTHS: readonly string[] = [
    '\u76CA',   // 0  益  CEO exception
    '\u76BF',   // 1  皿  CEO exception
    'o',        // 2  (was Д — too tall)
    '_',        // 3  ── STANDIN LOCK
    '^',        // 4  (was ▲)
    'v',        // 5  (was ▼)
    '=',        // 6
    'm',        // 7
    '\u03C9',   // 8  ω  (was M — too tall)
    'w',        // 9
    'u',        // 10 (was W — too tall)
    '\u2038',   // 11 ‸
    '\u2229',   // 12 ∩
    ',',        // 13 (was ▰)
    '~',        // 14 (was ▱)
    '\u203F',   // 15 ‿  (was ▸)
    '\u2323',   // 16 ⌣  (was ◂)
    '\u222A',   // 17 ∪  (was ∀)
    '.',        // 18 (was ‼)
    '-',        // 19 (was ‰)
];
const INSTIGATOR_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u0305','\u0305'], // 10 overline anger-flash
    ['\u030F','\u030F'], // 11 dbl-grave brooding
];

// ─── vibe_3 — Hacker ──────────────────────────────────────────────────

/* 13 arms — p added (moved from eye candidates). */
const HACKER_ARMS: readonly string[] = [
    '>','<','_','\u00AC','\u2310','|',
    '\u00A6','/','\\','=','+','*','p',
];
const HACKER_TURN_ARMS: readonly string[] = ['{', '~'];
const HACKER_TRAILS: readonly string[] = [
    '\u2500','\u2550','\u2504','\u2505','\u2501',
    '~','\u2248','\u223C','_','.','..','...',
];
/* Audited: removed # % & @ $ / \ | ! ? : ; * . Added ≡ */
const HACKER_MOUTHS: readonly string[] = [
    '.', '-', '_', '=', '~', '^', '+', '\u2261',
];
const HACKER_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u033E','\u033E'], // 10 vertical-tilde glitch
    ['\u0346','\u0346'], // 11 bridge-above
];

// ─── vibe_4 — Mystic ──────────────────────────────────────────────────

/* 15 arms — ALL doubled for visual arm-length.
   12 original doubled + ψψ ☽☽ ⊳⊳ from Gemini audit. */
const MYSTIC_ARMS: readonly string[] = [
    '\u2726\u2726', '\u2727\u2727', '\u273A\u273A', '\u274B\u274B',
    '\u2606\u2606', '\u2731\u2731', '\u2724\u2724', '\u2725\u2725',
    '\u2736\u2736', '\u2737\u2737', '\u2738\u2738', '\u2739\u2739',
    '\u03C8\u03C8', // 12 ψψ wizard staff
    '\u263D\u263D', // 13 ☽☽ crescent wand
    '\u22B3\u22B3', // 14 ⊳⊳ pointing triangles
];
/* Turn arms doubled. */
const MYSTIC_TURN_ARMS: readonly string[] = [
    '\u223F\u223F',  // 0  ∿∿
    '\u27FF\u27FF',  // 1  ⟿⟿
];
const MYSTIC_TRAILS: readonly string[] = [
    '\u223F','\u2307','\u301C','\u27FF','\u2933',
    '\uFF5E','\u224B','\u2972','\u293F','\u297F','\u2726','\u00B7',
];
/* Audited: removed ○ ● △ ▽ ⊥ ⊤ ⌘ ⊕ + duplicate _. */
const MYSTIC_MOUTHS: readonly string[] = [
    '~','_','.', '\u2323','\u203F',
    '\u222A','\u2229','\u25C6','\u25C7','\u22C4',
];
const MYSTIC_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u033D','\u033D'], // 10 x-above
    ['\u035B','\u035B'], // 11 zigzag
];

// ─── Assembly ─────────────────────────────────────────────────────────

export const SPRITE_DATA: readonly VibeSlots[] = [
    {
        brackets: BRACKETS, arms: OBSERVER_ARMS,    turnArms: OBSERVER_TURN_ARMS,
        eyes: EYES, brows: [...SHARED_BROWS_BASE, ...OBSERVER_BROW_EXTRAS],
        mouths: OBSERVER_MOUTHS, trails: OBSERVER_TRAILS,
    },
    {
        brackets: BRACKETS, arms: INSTIGATOR_ARMS,  turnArms: INSTIGATOR_TURN_ARMS,
        eyes: EYES, brows: [...SHARED_BROWS_BASE, ...INSTIGATOR_BROW_EXTRAS],
        mouths: INSTIGATOR_MOUTHS, trails: INSTIGATOR_TRAILS,
    },
    {
        brackets: BRACKETS, arms: HACKER_ARMS,      turnArms: HACKER_TURN_ARMS,
        eyes: EYES, brows: [...SHARED_BROWS_BASE, ...HACKER_BROW_EXTRAS],
        mouths: HACKER_MOUTHS, trails: HACKER_TRAILS,
    },
    {
        brackets: BRACKETS, arms: MYSTIC_ARMS,      turnArms: MYSTIC_TURN_ARMS,
        eyes: EYES, brows: [...SHARED_BROWS_BASE, ...MYSTIC_BROW_EXTRAS],
        mouths: MYSTIC_MOUTHS, trails: MYSTIC_TRAILS,
    },
];
