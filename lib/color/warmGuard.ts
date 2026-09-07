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
    if (h <= 65) return Math.max(lightPct, 60);
    return lightPct;
}

/*
 * dampLoudHue — pure green (~120°) and magenta (~300°) read far louder/
 * neon-ier than every other hue at the SAME saturation number — HSL's "S"
 * isn't perceptually uniform across the wheel; those two bands are where
 * the eye reads maximum vividness for a given numeric S. Confirmed NOT a
 * frequency bug (Brendon, 2026-09-07: "chooses those colours almost
 * exclusively" — measured across real Mood Ring days and 20k profile
 * rolls: hue selection is flat, ~equal share everywhere). They're just
 * the two bands that register every time, so this trims saturation ONLY
 * inside a ±45° window around each, cosine-tapered to zero effect at the
 * edges — every other hue passes through untouched.
 */
const LOUD_CENTERS = [120, 300];
const LOUD_RADIUS = 45; // deg of falloff each side of a centre
const LOUD_MAX_CUT = 22; // saturation points shaved at dead centre

export function dampLoudHue(hue: number, satPct: number): number {
    const h = ((hue % 360) + 360) % 360;
    let cut = 0;
    for (const c of LOUD_CENTERS) {
        const d = Math.min(Math.abs(h - c), 360 - Math.abs(h - c));
        if (d < LOUD_RADIUS) {
            const weight = 0.5 * (1 + Math.cos((Math.PI * d) / LOUD_RADIUS));
            cut = Math.max(cut, LOUD_MAX_CUT * weight);
        }
    }
    return Math.max(10, satPct - cut);
}
