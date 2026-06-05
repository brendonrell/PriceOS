/**
 * PriceSprite composer — pure, deterministic.
 *
 * TWO-STAGE so a sprite is resolved from the wallet hash exactly ONCE
 * (at signup) and then FROZEN on the user's DB row. Every render after
 * that animates off the stored resolution — the wallet hash is never
 * touched again:
 *
 *   resolveSprite(addr, vibe)  → ResolvedSprite   (hash math; run once, stored)
 *   composeResolved(r, state)  → ComposedSprite   (no hash; run per frame)
 *   composeSprite(addr, vibe, state) = composeResolved(resolveSprite(...))
 *     — thin wrapper kept for callers that have no stored resolution
 *       (e.g. the signup preview, before a row exists).
 *
 * Animation states:
 *   awake    → base sprite
 *   blinking → eyeL='-' eyeR='-'
 *   yawning  → mouth='o', brows → flat macron (no angry yawn)
 *   sleeping → eyeL='z' mouth='z' eyeR='z'
 *   arguing  → Instigator (vi=1) only: turn arms up, MAD brows locked
 *   throwing → all vibes: turn arm; engine applies CSS flip
 *   casting  → Mystic (vi=3) only: energy arms, sparkle-focus brows
 *
 * Brow swap on awake glyph-swap turns (sim-faithful):
 *   browL↔browR when turned=true && animState='awake'.
 *
 * armVariant: undefined=hash-derived (deterministic turns);
 *             0|1=engine random (action animations, 2 poses each).
 *
 * Shades: hex[24:28] → SHADES_POOL. Non-null = arms outside brackets,
 *   ⌐ inside bracketL, lens replaces eyes. Mouth still animates.
 */

import { SPRITE_DATA, SHADES_POOL, SHADES_EARPIECE } from './data';
import { vibeToIndex, type PriceSpriteVibe } from './vibes';

export type SpriteAnimState =
    | 'awake' | 'blinking' | 'yawning' | 'sleeping'
    | 'arguing' | 'throwing' | 'casting'
    | 'void'    // first deep state: ◡‿◡ — peaceful dreaming, warm not dead
    | 'astral'; // second deep state: ∞⌇∞ — cosmic/transcendent. The "wow".

const ARM_SPACE    = '\u00A0';
const BROW_SLEEPY  = '\u0304'; // macron    — yawn
const BROW_MAD_L   = '\u0300'; // grave     — argue left
const BROW_MAD_R   = '\u0301'; // acute     — argue right
const BROW_SPARKLE = '\u0307'; // dot-above — cast

export interface SpriteParts {
    bracketL: string;
    armL:     string;
    eyeL:     string;
    mouth:    string;
    eyeR:     string;
    bracketR: string;
    armR:     string;
    trail:    string;
}

export interface ComposedSprite {
    fullString: string;
    parts:      SpriteParts;
    shadesLens: string | null;
}

/**
 * The frozen, per-user sprite resolution. Holds the picked component
 * VALUES (not indices) so a stored sprite is fully self-contained — it
 * renders identically forever, independent of any later edits to
 * SPRITE_DATA. This is what gets persisted to users.price_sprite_resolved.
 */
export interface ResolvedSprite {
    vi:         0 | 1 | 2 | 3;            // vibe index — gates arguing(1)/casting(3)
    bracket:    readonly [string, string];
    arm:        string;
    turnArms:   readonly string[];       // turn-arm poses for this vibe
    turnArmIdx: number;                  // hash-derived pose for plain (non-action) turns
    eyeBase:    string;
    brow:       readonly [string, string];
    mouth:      string;
    trail:      string;
    lens:       string | null;
}

function _norm(addr: string): string | null {
    const s = addr.toLowerCase().replace(/^0x/, '');
    if (s.length < 24 || !/^[0-9a-f]+$/.test(s.slice(0, 24))) return null;
    return s;
}

/**
 * STAGE 1 — resolve the wallet hash into a frozen component set.
 * Run ONCE (signup) and persist the result. Pure + deterministic.
 */
export function resolveSprite(
    walletAddress: string,
    vibe:          PriceSpriteVibe,
): ResolvedSprite | null {
    const hex = _norm(walletAddress);
    if (!hex) return null;

    const slots = SPRITE_DATA[vibeToIndex(vibe)];
    const vi    = vibeToIndex(vibe);

    const cBr  = parseInt(hex.substring(0,  4), 16);
    const cArm = parseInt(hex.substring(4,  8), 16);
    const cEye = parseInt(hex.substring(8,  12), 16);
    const cBw  = parseInt(hex.substring(12, 16), 16);
    const cMo  = parseInt(hex.substring(16, 20), 16);
    const cTr  = parseInt(hex.substring(20, 24), 16);

    const bracket = slots.brackets[cBr  % slots.brackets.length];
    const arm     = slots.arms    [cArm % slots.arms.length];
    const eyeBase = slots.eyes    [cEye % slots.eyes.length];
    const brow    = slots.brows   [cBw  % slots.brows.length];
    const mouth   = slots.mouths  [cMo  % slots.mouths.length];
    const trail   = slots.trails  [cTr  % slots.trails.length];

    const turnArmIdx =
        Math.floor(cArm / slots.arms.length) % slots.turnArms.length;

    const lens = hex.length >= 28
        ? (SHADES_POOL[parseInt(hex.substring(24, 28), 16) % SHADES_POOL.length] ?? null)
        : null;

    return {
        vi,
        bracket:   [bracket[0], bracket[1]],
        arm,
        turnArms:  [...slots.turnArms],
        turnArmIdx,
        eyeBase,
        brow:      [brow[0], brow[1]],
        mouth,
        trail,
        lens,
    };
}

/**
 * STAGE 2 — compose a frame from an already-resolved sprite. NO hash,
 * NO SPRITE_DATA lookup. This is what the engine plays every frame.
 */
export function composeResolved(
    r:          ResolvedSprite,
    animState:  SpriteAnimState = 'awake',
    turned      = false,
    armVariant?: 0 | 1,
): ComposedSprite {
    const vi = r.vi;

    const taIdx   = armVariant !== undefined ? armVariant : r.turnArmIdx;
    const turnArm = r.turnArms[taIdx] ?? r.turnArms[0] ?? r.arm;
    const active  = turned ? turnArm : r.arm;
    const lens    = r.lens;

    // ── Shades ──────────────────────────────────────────────────────
    if (lens !== null) {
        let mo = r.mouth;
        if (animState === 'yawning')  mo = 'o';
        if (animState === 'sleeping') mo = 'z';
        const full = active + r.bracket[0] + SHADES_EARPIECE + lens + mo + lens + r.bracket[1] + active + r.trail;
        return {
            fullString: full,
            parts: { bracketL: r.bracket[0], armL: active, eyeL: lens,
                     mouth: mo, eyeR: lens, bracketR: r.bracket[1], armR: active, trail: r.trail },
            shadesLens: lens,
        };
    }

    // ── Normal ───────────────────────────────────────────────────────
    const swap = turned && animState === 'awake'; // brow-swap on glyph-swap turns
    let parts: SpriteParts = {
        bracketL: r.bracket[0],
        armL:     active + ARM_SPACE,
        eyeL:     r.eyeBase + (swap ? r.brow[1] : r.brow[0]),
        mouth:    r.mouth,
        eyeR:     r.eyeBase + (swap ? r.brow[0] : r.brow[1]),
        bracketR: r.bracket[1],
        armR:     active,
        trail:    r.trail,
    };

    switch (animState) {
        case 'awake':    break;
        case 'blinking': parts = { ...parts, eyeL: '-', eyeR: '-' }; break;
        case 'yawning':
            parts = { ...parts, mouth: 'o',
                eyeL: r.eyeBase + BROW_SLEEPY, eyeR: r.eyeBase + BROW_SLEEPY };
            break;
        case 'sleeping': parts = { ...parts, eyeL: 'z', mouth: 'z', eyeR: 'z' }; break;
        case 'arguing':
            if (vi !== 1) break;
            parts = { ...parts, armL: turnArm + ARM_SPACE, armR: turnArm,
                eyeL: r.eyeBase + BROW_MAD_L, eyeR: r.eyeBase + BROW_MAD_R };
            break;
        case 'throwing':
            parts = { ...parts, armL: turnArm + ARM_SPACE, armR: turnArm };
            break;
        case 'casting':
            if (vi !== 3) break;
            parts = { ...parts, armL: turnArm + ARM_SPACE, armR: turnArm,
                eyeL: r.eyeBase + BROW_SPARKLE, eyeR: r.eyeBase + BROW_SPARKLE };
            break;
        case 'void':
            // Dreaming — peaceful, warm, not dead. ◡ = closed half-circle eye.
            parts = { ...parts,
                armL: r.arm + ARM_SPACE, armR: r.arm,
                eyeL: '\u25E1',   // ◡ lower half-circle — peaceful closed eye
                mouth: '\u203F',  // ‿ undertie — gentle dreaming smile
                eyeR: '\u25E1' }; // ◡
            break;
        case 'astral':
            // Transcendent — ∞ eyes, ⌇ mouth, double brackets = vibrating frame.
            // All vibes. The "wow" easter egg. Arms at rest.
            parts = { ...parts,
                bracketL: r.bracket[0] + r.bracket[0],  // (( double
                bracketR: r.bracket[1] + r.bracket[1],  // )) double
                armL: r.arm + ARM_SPACE, armR: r.arm,
                eyeL: '\u221E',   // ∞ infinity
                mouth: '\u2307',  // ⌇ wavy line
                eyeR: '\u221E' }; // ∞
            break;
    }

    return {
        fullString: parts.bracketL + parts.armL + parts.eyeL +
                    parts.mouth + parts.eyeR + parts.bracketR + parts.armR + parts.trail,
        parts,
        shadesLens: null,
    };
}

/**
 * One-shot resolve + compose. Behaviour-identical to the pre-refactor
 * composeSprite. Use only where there is no stored resolution to read.
 */
export function composeSprite(
    walletAddress: string,
    vibe:          PriceSpriteVibe,
    animState:     SpriteAnimState = 'awake',
    turned         = false,
    armVariant?:   0 | 1,
): ComposedSprite | null {
    const r = resolveSprite(walletAddress, vibe);
    if (!r) return null;
    return composeResolved(r, animState, turned, armVariant);
}
