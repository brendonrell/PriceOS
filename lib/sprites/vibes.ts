/**
 * PriceSprite vibe identifiers.
 *
 * The Atlas (Storage Philosophy + PD Systems Architecture) specs four
 * distinct "vibes from wallet hash" but the engine in
 * lib/engines/priceSpriteEngine.ts ships a single sprite today —
 * `(ง •̀_•́)ง` and its mirror, with blink/turn/yawn/sleep states.
 *
 * v0 stores the user's chosen vibe so the data model is
 * forward-compatible: when the real 4-vibes engine + art lands, the
 * same `users.price_sprite` column maps to distinct sprites with no
 * DB migration. The AccountCreateModal renders 4 quadrants now, all
 * showing the existing sprite; the user's selection still carries a
 * meaningful id.
 *
 * Ids are neutral on purpose. Both the in-code label and the modal
 * UI label can change without touching the column or the CHECK
 * constraint on `users.price_sprite`. Locked to exactly 4 values at
 * the DB level — adding a fifth requires a migration + a CHECK
 * constraint rewrite.
 */

export const PRICE_SPRITE_VIBES = [
    'vibe_1',
    'vibe_2',
    'vibe_3',
    'vibe_4',
] as const;

export type PriceSpriteVibe = (typeof PRICE_SPRITE_VIBES)[number];

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
