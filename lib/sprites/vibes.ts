/**
 * PriceSprite vibe identifiers + user-facing labels.
 *
 * The Atlas (Storage Philosophy + PD Systems Architecture) specs four
 * distinct "vibes from wallet hash". Each vibe defines its own slot
 * arrays (brackets, arms, eyes, brows, mouths, trails) in
 * lib/sprites/data.ts under the design-seed redesign (CEO-locked
 * 2026-05-13); a wallet address + vibe combine deterministically to
 * produce one of ~46M unique sprites across the 4 vibes.
 *
 * Canonical ids ARE the archetype names — they match the live DB
 * CHECK constraint on `users.price_sprite` verbatim:
 *   price_sprite IN ('observer','instigator','hacker','mystic').
 * The order of PRICE_SPRITE_VIBES is load-bearing: vibeToIndex maps it
 * positionally onto the 0-3 SPRITE_DATA arrays, so the order MUST stay
 * observer, instigator, hacker, mystic (instigator = index 1 = the
 * design-seed standin). Display labels can change freely; the ids
 * cannot without a DB migration + CHECK constraint rewrite. Locked to
 * exactly these 4 values at the DB level.
 *
 * Display labels + stance locks (CEO-locked 2026-05-13, user-facing
 * in AccountCreateModal quadrants):
 *   observer   → Observer    (arms-down deadpan, trail empty)
 *   instigator → Instigator  (dukes up — design-seed standin lives here)
 *   hacker     → Hacker      (tech/syntax arms, trail ─ ═ ┄ ~)
 *   mystic     → Mystic      (casting arms, trail ∿ ⌇ 〜 ⟿ ⤳)
 */

export const PRICE_SPRITE_VIBES = [
    'observer',
    'instigator',
    'hacker',
    'mystic',
] as const;

export type PriceSpriteVibe = (typeof PRICE_SPRITE_VIBES)[number];

/**
 * User-facing archetype label per vibe. Used in the signup modal
 * quadrants and anywhere the user sees a vibe name. Order matches
 * PRICE_SPRITE_VIBES — vibe_N maps to VIBE_LABELS[vibe_N].
 */
export const VIBE_LABELS: Readonly<Record<PriceSpriteVibe, string>> = {
    observer: 'Observer',
    instigator: 'Instigator',
    hacker: 'Hacker',
    mystic: 'Mystic',
};

/**
 * Convert an archetype vibe id to its 0-indexed array offset for use
 * against lib/sprites/data.ts SPRITE_DATA (order-locked, see header).
 */
export function vibeToIndex(vibe: PriceSpriteVibe): 0 | 1 | 2 | 3 {
    switch (vibe) {
        case 'observer':   return 0;
        case 'instigator': return 1;
        case 'hacker':     return 2;
        case 'mystic':     return 3;
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
