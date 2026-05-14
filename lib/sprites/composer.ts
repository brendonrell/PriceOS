/**
 * PriceSprite composer — pure, deterministic.
 *
 * Takes a wallet address + vibe + animation state and returns the
 * composed sprite string + its parts. All math is deterministic:
 * same wallet + same vibe → same sprite, every time.
 *
 * Composition (8 render slots in order, 6 data slots driven by hash):
 *   [bracketL] [armL+NBSP] [eyeL+browL] [mouth] [eyeR+browR] [bracketR] [armR] [trail]
 *
 * Hash chunking (per design-seed redesign, CEO-locked 2026-05-13):
 *   strip 0x, take first 24 hex chars, slice into 6 × 4-char chunks:
 *     chunk[0] = brackets    (hex[0:4])
 *     chunk[1] = arms        (hex[4:8])
 *     chunk[2] = eyes        (hex[8:12])
 *     chunk[3] = brows       (hex[12:16])
 *     chunk[4] = mouth       (hex[16:20])
 *     chunk[5] = trail       (hex[20:24])
 *   each chunk → parseInt(chunk, 16) % slotArray.length → slot index.
 *
 * Per-slot composition rules:
 *   armL = arm + NBSP (\u00A0) — the trailing NBSP renders inside
 *     bracketL to give the figure room to "occupy" the bracket.
 *     NBSP because regular spaces collapse under default HTML
 *     whitespace rules.
 *   armR = arm — same character as armL, but no leading whitespace.
 *     Positional asymmetry, symmetric character.
 *   eyeL = eyeBase + browL — combining diacritic stacks on base char
 *     to form a single grapheme cluster (1ch wide in monospace).
 *   eyeR = eyeBase + browR — same construction, browR mark.
 *
 * Animation overrides (CEO-locked):
 *   awake    → original composed sprite
 *   blinking → eyeL='-', eyeR='-' (both eyes closed, brows stripped)
 *   yawning  → mouth='o' (open mouth)
 *   sleeping → eyeL='z', mouth='z', eyeR='z' (three z's, one per slot)
 *
 * The per-slot single-character pattern for sleep matters: consumers
 * render eyes and mouth in a fixed-width inline-block so blink / yawn /
 * sleep don't squish the sprite as character widths change.
 *
 * Mirroring is the consumer's job (CSS scaleX(-1)) — the composer
 * never flips glyphs. The whole sprite mirrors as one figure.
 */

import { SPRITE_DATA } from './data';
import { vibeToIndex, type PriceSpriteVibe } from './vibes';

export type SpriteAnimState = 'awake' | 'blinking' | 'yawning' | 'sleeping';

/** Non-breaking space appended to armL so the bracketL → armL → eyeL
    visual gap survives HTML whitespace collapsing. */
const ARM_SPACE = '\u00A0';

export interface SpriteParts {
    bracketL: string;
    /** Arm char + trailing NBSP — renders inside bracketL. */
    armL: string;
    /** Eye base + browL combining mark — one grapheme cluster. */
    eyeL: string;
    mouth: string;
    /** Eye base + browR combining mark — one grapheme cluster. */
    eyeR: string;
    bracketR: string;
    /** Arm char only — renders outside bracketR. */
    armR: string;
    /** Optional trail char after armR — usually empty for Observer/Instigator. */
    trail: string;
}

export interface ComposedSprite {
    fullString: string;
    parts: SpriteParts;
}

/**
 * Strip leading 0x (case-insensitive) and lower-case the rest so the
 * composition is checksum-independent. Returns null when the address
 * has fewer than 24 usable hex chars (6 × 4-char chunks).
 */
function _normaliseAddress(walletAddress: string): string | null {
    const stripped = walletAddress.toLowerCase().replace(/^0x/, '');
    if (stripped.length < 24) return null;
    if (!/^[0-9a-f]+$/.test(stripped.slice(0, 24))) return null;
    return stripped;
}

/**
 * Compose a deterministic PriceSprite for a wallet+vibe pair under
 * the given animation state.
 *
 * Returns null when the wallet address is malformed (too short or
 * non-hex). Callers should treat null as "no sprite available" and
 * render nothing rather than a fallback glyph.
 */
export function composeSprite(
    walletAddress: string,
    vibe: PriceSpriteVibe,
    animState: SpriteAnimState = 'awake',
): ComposedSprite | null {
    const hex = _normaliseAddress(walletAddress);
    if (hex === null) return null;

    const slots = SPRITE_DATA[vibeToIndex(vibe)];

    const chunkBrackets = parseInt(hex.substring(0, 4), 16);
    const chunkArms     = parseInt(hex.substring(4, 8), 16);
    const chunkEyes     = parseInt(hex.substring(8, 12), 16);
    const chunkBrows    = parseInt(hex.substring(12, 16), 16);
    const chunkMouth    = parseInt(hex.substring(16, 20), 16);
    const chunkTrail    = parseInt(hex.substring(20, 24), 16);

    const bracket = slots.brackets[chunkBrackets % slots.brackets.length];
    const arm     = slots.arms[chunkArms % slots.arms.length];
    const eyeBase = slots.eyes[chunkEyes % slots.eyes.length];
    const brow    = slots.brows[chunkBrows % slots.brows.length];
    const mouth   = slots.mouths[chunkMouth % slots.mouths.length];
    const trail   = slots.trails[chunkTrail % slots.trails.length];

    /* Base parts at awake state. eyeL/eyeR are grapheme clusters
       (base + combining mark). armL carries trailing NBSP. */
    let parts: SpriteParts = {
        bracketL: bracket[0],
        armL: arm + ARM_SPACE,
        eyeL: eyeBase + brow[0],
        mouth,
        eyeR: eyeBase + brow[1],
        bracketR: bracket[1],
        armR: arm,
        trail,
    };

    /* Animation overrides. The full string is rebuilt at the end so
       any override (or combination) reflects in fullString without
       needing to re-derive parts. Eye overrides strip the combining
       brow — the override char is the whole cluster. */
    switch (animState) {
        case 'awake':
            break;
        case 'blinking':
            parts = { ...parts, eyeL: '-', eyeR: '-' };
            break;
        case 'yawning':
            parts = { ...parts, mouth: 'o' };
            break;
        case 'sleeping':
            parts = { ...parts, eyeL: 'z', mouth: 'z', eyeR: 'z' };
            break;
    }

    const fullString =
        parts.bracketL
        + parts.armL
        + parts.eyeL
        + parts.mouth
        + parts.eyeR
        + parts.bracketR
        + parts.armR
        + parts.trail;

    return { fullString, parts };
}
