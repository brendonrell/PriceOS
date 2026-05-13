/**
 * PriceSprite composer — pure, deterministic.
 *
 * Takes a wallet address + vibe + animation state and returns the
 * composed sprite string + its parts. All math is deterministic:
 * same wallet + same vibe → same sprite, every time.
 *
 * Composition (8 slots in order):
 *   [crown] [armL] [bracketL] [eyeL] [mouth] [eyeR] [bracketR] [armR]
 *
 * Hash chunking (per Gemini V3 spec, CEO-locked):
 *   strip 0x, take first 20 hex chars, slice into 5 × 4-char chunks:
 *     chunk[0] = brackets
 *     chunk[1] = eyes
 *     chunk[2] = mouth
 *     chunk[3] = arms
 *     chunk[4] = crown
 *   each chunk → parseInt(chunk, 16) % slotArray.length → slot index.
 *
 * Animation overrides (CEO-locked 2026-05-13):
 *   awake    → original composed sprite
 *   blinking → eyeL='-', eyeR='-' (both eyes closed)
 *   yawning  → mouth='o' (open mouth)
 *   sleeping → middle band (eyeL+mouth+eyeR) replaced with ' zzz '
 *
 * Sleep substitution returns parts.eyeL='', parts.mouth=' zzz ',
 * parts.eyeR='' so callers wrapping parts in spans still get a sane
 * shape. The fullString reads `[crown][armL][bracketL] zzz [bracketR][armR]`.
 *
 * Mirroring is the consumer's job (CSS scaleX(-1)) — the composer
 * never flips glyphs. Brackets and asymmetric arms render correctly
 * under scaleX(-1) without character swaps.
 */

import { SPRITE_DATA } from './data';
import { vibeToIndex, type PriceSpriteVibe } from './vibes';

export type SpriteAnimState = 'awake' | 'blinking' | 'yawning' | 'sleeping';

export interface SpriteParts {
    crown: string;
    armL: string;
    bracketL: string;
    eyeL: string;
    mouth: string;
    eyeR: string;
    bracketR: string;
    armR: string;
}

export interface ComposedSprite {
    fullString: string;
    parts: SpriteParts;
}

/**
 * Strip leading 0x (case-insensitive) and lower-case the rest so the
 * composition is checksum-independent. Returns null when the address
 * has fewer than 20 usable hex chars.
 */
function _normaliseAddress(walletAddress: string): string | null {
    const stripped = walletAddress.toLowerCase().replace(/^0x/, '');
    if (stripped.length < 20) return null;
    if (!/^[0-9a-f]+$/.test(stripped.slice(0, 20))) return null;
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
    const chunkEyes     = parseInt(hex.substring(4, 8), 16);
    const chunkMouth    = parseInt(hex.substring(8, 12), 16);
    const chunkArms     = parseInt(hex.substring(12, 16), 16);
    const chunkCrown    = parseInt(hex.substring(16, 20), 16);

    const bracket = slots.brackets[chunkBrackets % slots.brackets.length];
    const eye     = slots.eyes[chunkEyes % slots.eyes.length];
    const mouth   = slots.mouths[chunkMouth % slots.mouths.length];
    const arm     = slots.arms[chunkArms % slots.arms.length];
    const crown   = slots.crowns[chunkCrown % slots.crowns.length];

    /* Base parts at awake state */
    let parts: SpriteParts = {
        crown,
        armL: arm[0],
        bracketL: bracket[0],
        eyeL: eye[0],
        mouth,
        eyeR: eye[1],
        bracketR: bracket[1],
        armR: arm[1],
    };

    /* Animation overrides. The full string is rebuilt at the end so
       any override (or combination) reflects in fullString without
       needing to re-derive parts. */
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
            parts = { ...parts, eyeL: '', mouth: ' zzz ', eyeR: '' };
            break;
    }

    const fullString =
        parts.crown
        + parts.armL
        + parts.bracketL
        + parts.eyeL
        + parts.mouth
        + parts.eyeR
        + parts.bracketR
        + parts.armR;

    return { fullString, parts };
}
