/*
 * lib/color/warmGuard — keeps warm hues out of the "Thanksgiving" muddy zone.
 *
 * Brick-red → orange → mustard-yellow (hue ~0–65°) reads as muddy/rust/olive
 * once lightness drops much under ~50%, REGARDLESS of saturation — HSL's
 * yellow-family lightness sits far from where the eye reads "vivid" for that
 * hue, so even a fairly saturated roll can still look dull and brownish there
 * (Brendon, 2026-09-01: "the issue is yellow muted, not saturated — all
 * saturated colours look good, it's muted yellows and brownish-reds that are
 * the ugly zone, the boring Thanksgiving palette"). This only lifts the
 * lightness floor inside that band; every other hue, and any colour already
 * above the floor, passes through untouched.
 */
export function liftWarmFloor(hue: number, lightPct: number): number {
    const h = ((hue % 360) + 360) % 360;
    if (h <= 65) return Math.max(lightPct, 52);
    return lightPct;
}
