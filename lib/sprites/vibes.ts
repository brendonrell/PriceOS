/**
 * PriceSprite vibe identifiers + user-facing labels.
 *
 * The Atlas (Storage Philosophy + PD Systems Architecture) specs four
 * distinct "vibes from wallet hash". Each vibe defines its own slot
 * arrays (crowns, arms, brackets, eyes, mouths) in lib/sprites/data.ts;
 * a wallet address + vibe combine deterministically to produce one of
 * ~48M unique sprites.
 *
 * Ids are 1-indexed at the public API (`vibe_1`..`vibe_4`) — Gemini's
 * source spec is 0-3 internally but the platform is locked to 1-4.
 * Both the in-code label and the modal UI label can change without
 * touching the DB column or its CHECK constraint on `users.price_sprite`.
 * Locked to exactly 4 values at the DB level — adding a fifth requires
 * a migration + a CHECK constraint rewrite.
 *
 * Display labels (CEO-locked 2026-05-13, user-facing in
 * AccountCreateModal quadrants):
 *   vibe_1 → Observer    (minimal, deadpan)
 *   vibe_2 → Instigator  (aggressive, sharp)
 *   vibe_3 → Hacker      (structural, syntax)
 *   vibe_4 → Mystic      (esoteric, runic)
 */

export const PRICE_SPRITE_VIBES = [
    'vibe_1',
    'vibe_2',
    'vibe_3',
    'vibe_4',
] as const;

export type PriceSpriteVibe = (typeof PRICE_SPRITE_VIBES)[number];

/**
 * User-facing archetype label per vibe. Used in the signup modal
 * quadrants and anywhere the user sees a vibe name. Order matches
 * PRICE_SPRITE_VIBES — vibe_N maps to VIBE_LABELS[vibe_N].
 */
export const VIBE_LABELS: Readonly<Record<PriceSpriteVibe, string>> = {
    vibe_1: 'Observer',
    vibe_2: 'Instigator',
    vibe_3: 'Hacker',
    vibe_4: 'Mystic',
};

/**
 * Convert a 1-indexed vibe id to a 0-indexed array offset for use
 * against lib/sprites/data.ts SPRITE_DATA.
 */
export function vibeToIndex(vibe: PriceSpriteVibe): 0 | 1 | 2 | 3 {
    switch (vibe) {
        case 'vibe_1': return 0;
        case 'vibe_2': return 1;
        case 'vibe_3': return 2;
        case 'vibe_4': return 3;
    }
}

/**
 * Get the user-facing display label for a vibe id.
 */
export function getVibeLabel(vibe: PriceSpriteVibe): string {
    return VIBE_LABELS[vibe];
}

/**
 * Runtime guard. Use at API boundaries where the request body has not
 * yet been narrowed.
 */
export function isPriceSpriteVibe(v: unknown): v is PriceSpriteVibe {
    return (
        typeof v === 'string'
        && (PRICE_SPRITE_VIBES as readonly string[]).includes(v)
    );
}
