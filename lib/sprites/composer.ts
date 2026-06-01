/**
 * PriceSprite composer — pure, deterministic.
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

function _norm(addr: string): string | null {
    const s = addr.toLowerCase().replace(/^0x/, '');
    if (s.length < 24 || !/^[0-9a-f]+$/.test(s.slice(0, 24))) return null;
    return s;
}

export function composeSprite(
    walletAddress: string,
    vibe:          PriceSpriteVibe,
    animState:     SpriteAnimState = 'awake',
    turned         = false,
    armVariant?:   0 | 1,
): ComposedSprite | null {
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

    const taIdx  = armVariant !== undefined
        ? armVariant
        : Math.floor(cArm / slots.arms.length) % slots.turnArms.length;
    const turnArm = slots.turnArms[taIdx];
    const active  = turned ? turnArm : arm;

    // ── Shades ──────────────────────────────────────────────────────
    const lens = hex.length >= 28
        ? (SHADES_POOL[parseInt(hex.substring(24, 28), 16) % SHADES_POOL.length] ?? null)
        : null;

    if (lens !== null) {
        let mo = mouth;
        if (animState === 'yawning')  mo = 'o';
        if (animState === 'sleeping') mo = 'z';
        const full = active + bracket[0] + SHADES_EARPIECE + lens + mo + lens + bracket[1] + active + trail;
        return {
            fullString: full,
            parts: { bracketL: bracket[0], armL: active, eyeL: lens,
                     mouth: mo, eyeR: lens, bracketR: bracket[1], armR: active, trail },
            shadesLens: lens,
        };
    }

    // ── Normal ───────────────────────────────────────────────────────
    const swap = turned && animState === 'awake'; // brow-swap on glyph-swap turns
    let parts: SpriteParts = {
        bracketL: bracket[0],
        armL:     active + ARM_SPACE,
        eyeL:     eyeBase + (swap ? brow[1] : brow[0]),
        mouth,
        eyeR:     eyeBase + (swap ? brow[0] : brow[1]),
        bracketR: bracket[1],
        armR:     active,
        trail,
    };

    switch (animState) {
        case 'awake':    break;
        case 'blinking': parts = { ...parts, eyeL: '-', eyeR: '-' }; break;
        case 'yawning':
            parts = { ...parts, mouth: 'o',
                eyeL: eyeBase + BROW_SLEEPY, eyeR: eyeBase + BROW_SLEEPY };
            break;
        case 'sleeping': parts = { ...parts, eyeL: 'z', mouth: 'z', eyeR: 'z' }; break;
        case 'arguing':
            if (vi !== 1) break;
            parts = { ...parts, armL: turnArm + ARM_SPACE, armR: turnArm,
                eyeL: eyeBase + BROW_MAD_L, eyeR: eyeBase + BROW_MAD_R };
            break;
        case 'throwing':
            parts = { ...parts, armL: turnArm + ARM_SPACE, armR: turnArm };
            break;
        case 'casting':
            if (vi !== 3) break;
            parts = { ...parts, armL: turnArm + ARM_SPACE, armR: turnArm,
                eyeL: eyeBase + BROW_SPARKLE, eyeR: eyeBase + BROW_SPARKLE };
            break;
        case 'void':
            // Dreaming — peaceful, warm, not dead. ◡ = closed half-circle eye.
            parts = { ...parts,
                armL: arm + ARM_SPACE, armR: arm,
                eyeL: '\u25E1',   // ◡ lower half-circle — peaceful closed eye
                mouth: '\u203F',  // ‿ undertie — gentle dreaming smile
                eyeR: '\u25E1' }; // ◡
            break;
        case 'astral':
            // Transcendent — ∞ eyes, ⌇ mouth, double brackets = vibrating frame.
            // All vibes. The "wow" easter egg. Arms at rest.
            parts = { ...parts,
                bracketL: bracket[0] + bracket[0],  // (( double
                bracketR: bracket[1] + bracket[1],  // )) double
                armL: arm + ARM_SPACE, armR: arm,
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
