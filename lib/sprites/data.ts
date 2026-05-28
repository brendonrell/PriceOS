/**
 * PriceSprite slot pools — post-audit expanded set.
 *
 * Pool sizes (pre-launch; may change until mainnet deploy, then locked):
 *   BRACKETS 14 · EYES 50 · arms/mouths per-vibe below.
 *
 * LOAD-BEARING — do NOT alter after launch:
 *   brackets[3] = ("(",")")  standin bracket
 *   eyes[11]    = "•"        standin eye
 *   brows[7]    = ("̀","́")   standin brow (grave/acute MAD inward)
 *   INSTIGATOR_TURN_ARMS[1] = 'ヽ'
 *     Brendon wallet chunkArms=19197:
 *       Math.floor(19197/15) % 2 = 1599 % 2 = 1 → ヽ ✓ (sim AWAKE_L arm)
 *
 * Shades: 7th hash chunk hex[24:28] (always available, ETH=40 hex chars).
 *   SHADES_POOL: 32 nulls + 7 lens options ≈ 18% wallets get shades.
 *   Shades mode: armL moves outside bracketL (no ARM_SPACE),
 *   ⌐ earpiece inserted inside bracketL. Lens replaces eyes; no brow.
 *
 * Mystic arm rule: ALL primary and turn arms are DOUBLED (e.g. ✦✦)
 *   for visual arm-length that reads as "wizard casting."
 */

export interface VibeSlots {
    brackets:  readonly (readonly [string, string])[];
    arms:      readonly string[];
    /** 2 variants. Hash-derived for turns; random per action animation. */
    turnArms:  readonly string[];
    eyes:      readonly string[];
    brows:     readonly (readonly [string, string])[];
    mouths:    readonly string[];
    trails:    readonly string[];
}

// ─── Shared pools ────────────────────────────────────────────────────

const BRACKETS: readonly (readonly [string, string])[] = [
    ['[',  ']'],            // 0
    ['{',  '}'],            // 1
    ['<',  '>'],            // 2
    ['(',  ')'],            // 3  ── STANDIN LOCK
    ['\u27E8','\u27E9'],    // 4  ⟨⟩
    ['\u27EA','\u27EB'],    // 5  ⟪⟫
    ['\u2985','\u2986'],    // 6  ⦅⦆
    ['\u3010','\u3011'],    // 7  【】
    ['\u300A','\u300B'],    // 8  《》
    ['\u27E6','\u27E7'],    // 9  ⟦⟧
    ['\u0F3C','\u0F3D'],    // 10 ༼༽
    ['\u2987','\u2988'],    // 11 ⦇⦈  Gemini
    ['\u2989','\u298A'],    // 12 ⦉⦊  Gemini
    ['\u29BC','\u29BD'],    // 13 ⧼⧽  Gemini
];

/* 50 eyes. eyes[11]="•" STANDIN LOCK.
   ⊘(18→shades) ⎚(removed→shades) p(removed→Hacker arm) excluded.
   4 broken-unicode suspects (⭖⮊⮉⮛) excluded. */
const EYES: readonly string[] = [
    '\u00B0','o','O','\u00B7','\u25E6','\u3147','\u25C9','\u2299',
    '\u229A','\u25CF','\u25CB','\u2022',    // 0-11 (11=• STANDIN LOCK)
    '\u233E','\u23E3','\u235F','\u2742',    // 12-15
    '\u229B','\u229C','\u25EC','\u238A',    // 16-19  (⊘ slot 18 repacked)
    '\u25A3','\u25A2','\u25BC','\u25BD',    // 20-23
    '\u00A2','$','\u20BF','\u00A5','\u00A3',// 24-28
    '\u25D5','\u25D4','\u25D1','\u25D0',    // 29-32  ◕◔◑◐
    '\u00F8','\u00D7',                      // 33-34  ø ×
    '^','@','q',                            // 35-37  (p moved to Hacker arm)
    '\u03B5','\u228D','\u25CC',             // 38-40  ε ⊍ ◌
    '\u2727','\u27D0','\u22C6',             // 41-43  ✧ ⟐ ⋆
    '\u238B','\u2BFD',                      // 44-45  ⎋ ⯽ (moved from shades)
    '\u2364','\u2365','\u2256','\u25D8',    // 46-49  ⍤ ⍥ ≖ ◘  Gemini
];

/* Shades pool (7th hash chunk). null=no shades; string=lens char.
   32 nulls + 7 options ≈ 18% wallets. Earpiece ⌐ always inside bracketL. */
export const SHADES_POOL: readonly (string | null)[] = [
    ...Array<null>(32).fill(null),
    '\u229E',  // ⊞
    '\u22A1',  // ⊡
    '\u25A6',  // ▦
    '\u2E0E',  // ⸎
    '\u263B',  // ☻  (suspect emoji risk on some platforms)
    '\u239A',  // ⎚  (moved from regular eyes)
    '\u2298',  // ⊘  (moved from regular eyes)
];

export const SHADES_EARPIECE = '\u2310'; // ⌐

const SHARED_BROWS_BASE: readonly (readonly [string, string])[] = [
    ['',''],                              // 0  none
    ['\u0301','\u0300'],                  // 1  concerned outward
    ['\u0302','\u0302'],                  // 2  circumflex concentrate
    ['\u0304','\u0304'],                  // 3  macron flat/sleepy ← yawn override
    ['\u030C','\u030C'],                  // 4  caron quizzical
    ['\u0306','\u0306'],                  // 5  breve perked
    ['\u0303','\u0303'],                  // 6  tilde woozy
    ['\u0300','\u0301'],                  // 7  grave/acute MAD inward ── STANDIN LOCK
    ['\u0308','\u0308'],                  // 8  dieresis alert
    ['\u0307','\u0307'],                  // 9  dot-above sparkle ← cast override
];

// ─── vibe_1 — Observer ───────────────────────────────────────────────

const OBSERVER_ARMS: readonly string[] = [
    '.', ',', '\u00B8', '_', '-', '\u00B7',
    '\u00B0', '\u02D9', '\u2027', '\u201A', '\u201F', '\u2E33',
];
const OBSERVER_TURN_ARMS: readonly string[] = ['~', "'"];
const OBSERVER_TRAILS: readonly string[] = Array(12).fill('');
const OBSERVER_MOUTHS: readonly string[] = [
    '.', '-', '~', '_', '=', '\u203F', '\u2323',
    'o', '\u03C9', '\u222A', '\u2229', 'u', 'v', ',',
];
const OBSERVER_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u0331','\u0331'],  // 10 macron-below
    ['\u0332','\u0332'],  // 11 low-line
];

// ─── vibe_2 — Instigator ─────────────────────────────────────────────

/* 15 arms: removed ୧ (backwards); added ☞ ☛ ► ⇒ from Gemini.
   Standin wallet primary: 19197 % 15 = 12 → ☛ (composed path only;
   standin kaomoji is hardcoded ง and unaffected). */
const INSTIGATOR_ARMS: readonly string[] = [
    '\u1559',             // 0  ᕙ
    '\u1557',             // 1  ᕗ
    '\u1566',             // 2  ᕦ
    '\u1564',             // 3  ᕤ
    '\u0B68',             // 4  ୨
    '\u2282',             // 5  ⊂  (ᕗ removed at old idx 5)
    '\u2283',             // 6  ⊃
    '\u3064',             // 7  つ
    '\u0E07',             // 8  ง
    '\u3063',             // 9  っ
    '\u0E05',             // 10 ค
    '\u261E',             // 11 ☞  Gemini
    '\u261B',             // 12 ☛  Gemini
    '\u25BA',             // 13 ►  Gemini
    '\u21D2',             // 14 ⇒  Gemini
];
/* LOAD-BEARING: Math.floor(19197/15) % 2 = 1279 % 2 = 1 → ヽ ✓ */
const INSTIGATOR_TURN_ARMS: readonly string[] = [
    '\u1557',  // 0 ᕗ — combat lean
    '\u30FD',  // 1 ヽ — sim AWAKE_L  LOAD-BEARING
];
const INSTIGATOR_TRAILS: readonly string[] = [
    '','','','','','','','','','\u203C','!','?',
];
/* Audited: removed M W Д + non-mouth chars. 益 皿 kept (CEO exception). */
const INSTIGATOR_MOUTHS: readonly string[] = [
    '\u76CA',             // 0  益  CEO exception
    '\u76BF',             // 1  皿  CEO exception
    '_', '=', 'm', 'w',  // 2-5
    '\u2229',             // 6  ∩
    '\u2038',             // 7  ‸
    'v',                  // 8
];
const INSTIGATOR_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u0305','\u0305'],  // 10 overline anger-flash
    ['\u030F','\u030F'],  // 11 dbl-grave brooding
];

// ─── vibe_3 — Hacker ─────────────────────────────────────────────────

/* 13 arms: added p (moved from eyes pool). */
const HACKER_ARMS: readonly string[] = [
    '>', '<', '_', '\u00AC', '\u2310', '|',
    '\u00A6', '/', '\\', '=', '+', '*', 'p',
];
const HACKER_TURN_ARMS: readonly string[] = ['{', '~'];
const HACKER_TRAILS: readonly string[] = [
    '\u2500','\u2550','\u2504','\u2505','\u2501',
    '~','\u2248','\u223C','_','.','..','...',
];
/* Audited: removed # % & @ $ / \ | ! ? : ; *. Added ≡ from Gemini. */
const HACKER_MOUTHS: readonly string[] = [
    '.', '-', '_', '=', '~', '^', '+', '\u2261',  // ≡
];
const HACKER_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u033E','\u033E'],  // 10 vertical-tilde glitch
    ['\u0346','\u0346'],  // 11 bridge-above
];

// ─── vibe_4 — Mystic ─────────────────────────────────────────────────

/* ALL arms doubled. 15 total: 12 original doubled + ψψ ☽☽ ⊳⊳ from Gemini. */
const MYSTIC_ARMS: readonly string[] = [
    '\u2726\u2726', '\u2727\u2727', '\u273A\u273A', '\u274B\u274B',
    '\u2606\u2606', '\u2731\u2731', '\u2724\u2724', '\u2725\u2725',
    '\u2736\u2736', '\u2737\u2737', '\u2738\u2738', '\u2739\u2739',
    '\u03C8\u03C8', // 12 ψψ  wizard staff  Gemini
    '\u263D\u263D', // 13 ☽☽  crescent wand Gemini
    '\u22B3\u22B3', // 14 ⊳⊳  triangle pts  Gemini
];
/* Turn arms doubled. */
const MYSTIC_TURN_ARMS: readonly string[] = [
    '\u223F\u223F',  // 0 ∿∿ sine-wave energy
    '\u27FF\u27FF',  // 1 ⟿⟿ flowing-arrow momentum
];
const MYSTIC_TRAILS: readonly string[] = [
    '\u223F','\u2307','\u301C','\u27FF','\u2933',
    '\uFF5E','\u224B','\u2972','\u293F','\u297F','\u2726','\u00B7',
];
/* Audited: removed ○ ● △ ▽ ⊥ ⊤ ⌘ ⊕ + duplicate _. */
const MYSTIC_MOUTHS: readonly string[] = [
    '~', '_', '.', '\u2323', '\u203F',
    '\u222A', '\u2229', '\u25C6', '\u25C7', '\u22C4',
];
const MYSTIC_BROW_EXTRAS: readonly (readonly [string, string])[] = [
    ['\u033D','\u033D'],  // 10 x-above hex-mark
    ['\u035B','\u035B'],  // 11 zigzag energy
];

// ─── Assembly ────────────────────────────────────────────────────────

export const SPRITE_DATA: readonly VibeSlots[] = [
    {   // vibe_1 Observer
        brackets: BRACKETS, arms: OBSERVER_ARMS,    turnArms: OBSERVER_TURN_ARMS,
        eyes: EYES, brows: [...SHARED_BROWS_BASE, ...OBSERVER_BROW_EXTRAS],
        mouths: OBSERVER_MOUTHS, trails: OBSERVER_TRAILS,
    },
    {   // vibe_2 Instigator  (STANDIN lives here)
        brackets: BRACKETS, arms: INSTIGATOR_ARMS,  turnArms: INSTIGATOR_TURN_ARMS,
        eyes: EYES, brows: [...SHARED_BROWS_BASE, ...INSTIGATOR_BROW_EXTRAS],
        mouths: INSTIGATOR_MOUTHS, trails: INSTIGATOR_TRAILS,
    },
    {   // vibe_3 Hacker
        brackets: BRACKETS, arms: HACKER_ARMS,      turnArms: HACKER_TURN_ARMS,
        eyes: EYES, brows: [...SHARED_BROWS_BASE, ...HACKER_BROW_EXTRAS],
        mouths: HACKER_MOUTHS, trails: HACKER_TRAILS,
    },
    {   // vibe_4 Mystic
        brackets: BRACKETS, arms: MYSTIC_ARMS,      turnArms: MYSTIC_TURN_ARMS,
        eyes: EYES, brows: [...SHARED_BROWS_BASE, ...MYSTIC_BROW_EXTRAS],
        mouths: MYSTIC_MOUTHS, trails: MYSTIC_TRAILS,
    },
];
