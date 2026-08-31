/*
 * lib/profile/presetRoll.ts — Presets row (Random / Match / Pair) roll logic.
 *
 * Pure functions, no React. Colorway and Tag Paint are full-spectrum (any
 * hex is valid on both — see useProfileHex / isValidTagPaint), so rolls pick
 * a random hue rather than sampling a fixed swatch pool. Saturation/lightness
 * roll per rollSaturation/rollLightness — art-site restraint by default,
 * vivid only ~1/3 of the time. Logo rides along via nearestLogoInFamily so
 * it never clashes with whichever colour it's tied to.
 */

import { NAME_FONTS } from './nameFont';
import { nearestLogoInFamily, PROFILE_SOLID, PROFILE_BLANK, PROFILE_PETEY, PROFILE_HOLO } from './profileLogos';

export type PresetMode = 'random' | 'match' | 'pair';

/** Logo-style layer, independent of colour: which finish/orientation family
 *  the rolled logo comes from. Solid/Blank/Petey are hue-matched to the
 *  rolled colour; Holo is a fixed iridescent finish (no hue ring) so it just
 *  rolls between its 3 orientation variants. Sigil is excluded — gated to
 *  forged wallets, not a general preset option. */
const LOGO_STYLES = ['solid', 'blank', 'petey', 'holo'] as const;
type LogoStyle = (typeof LOGO_STYLES)[number];

function randomLogoStyle(): LogoStyle {
    return LOGO_STYLES[Math.floor(Math.random() * LOGO_STYLES.length)]!;
}

function logoForHue(style: LogoStyle, hex: string): string {
    if (style === 'holo') {
        const pool = PROFILE_HOLO;
        return pool[Math.floor(Math.random() * pool.length)]!.id;
    }
    const family = style === 'solid' ? PROFILE_SOLID : style === 'blank' ? PROFILE_BLANK : PROFILE_PETEY;
    return nearestLogoInFamily(family, hex).id;
}

export interface PresetResult {
    hex: string;
    tagPaint: string;
    logoId: string;
    fontId: string | null;
}

function hslHex(h: number, s: number, l: number): string {
    const sat = s / 100, lig = l / 100;
    const a = sat * Math.min(lig, 1 - lig);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return lig - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    const hx = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${hx(f(0))}${hx(f(8))}${hx(f(4))}`.toUpperCase();
}

/** Saturation roll — art-site restraint over neon-by-default: about 1/3 of
 *  rolls land vivid, 2/3 land muted/pastel (Brendon, 2026-08-31: "let's make
 *  saturated like 1/3"). */
function rollSaturation(): number {
    if (Math.random() < 1 / 3) return 70 + Math.random() * 25; // vivid: 70–95%
    return 15 + Math.random() * 40; // muted/pastel: 15–55%
}

function rollLightness(): number {
    return 25 + Math.random() * 55; // 25–80%: dark → light
}

/** A random hue, full-taste range — saturation and lightness roll
 *  independently per rollSaturation/rollLightness above, so results aren't
 *  locked to one neon band (Brendon, 2026-08-31: "stuck in perpetual Miami
 *  mode"). */
function randomVividHex(): string {
    return hslHex(Math.random() * 360, rollSaturation(), rollLightness());
}

/** Curated harmony offsets (degrees) — complementary, split-complementary,
 *  and triadic. A raw random 90°–270° spread produced muddy neighbours too
 *  often; these are the offsets that reliably read as "chosen", not noise. */
const HARMONY_OFFSETS = [150, 180, 210, 120, 240];

function randomHarmonyHex(fromHue: number): string {
    const base = HARMONY_OFFSETS[Math.floor(Math.random() * HARMONY_OFFSETS.length)]!;
    const jitter = (Math.random() - 0.5) * 12; // ±6° so repeats don't feel identical
    const h = (fromHue + base + jitter + 360) % 360;
    return hslHex(h, rollSaturation(), rollLightness());
}

/** Artistic primaries (red / yellow / blue) for the "Primary" pair style. */
const PRIMARY_HUES = [0, 60, 240];

/** Pair mode's colour relationship — picked per roll:
 *  - harmony:  complementary/split-complementary/triadic hue offset (was
 *              the only option before).
 *  - mono:     same hue, opposite lightness bands — "dark green, light
 *              green accent".
 *  - primary:  main + accent both land on the red/yellow/blue triad.
 *  Weighted toward harmony since it's the most broadly flattering, mono and
 *  primary as the more graphic, opinionated options. */
type PairStyle = 'harmony' | 'mono' | 'primary';

function pickPairStyle(): PairStyle {
    const r = Math.random();
    if (r < 0.5) return 'harmony';
    if (r < 0.8) return 'mono';
    return 'primary';
}

function rollPairPalette(): { main: string; accent: string } {
    const style = pickPairStyle();

    if (style === 'primary') {
        const shuffled = [...PRIMARY_HUES].sort(() => Math.random() - 0.5);
        const sat = rollSaturation();
        return {
            main: hslHex(shuffled[0]!, sat, rollLightness()),
            accent: hslHex(shuffled[1]!, sat, rollLightness()),
        };
    }

    if (style === 'mono') {
        const hue = Math.random() * 360;
        const sat = rollSaturation();
        const darkL = 20 + Math.random() * 15;   // 20–35
        const lightL = 65 + Math.random() * 20;  // 65–85
        const mainIsDark = Math.random() < 0.5;
        return {
            main: hslHex(hue, sat, mainIsDark ? darkL : lightL),
            accent: hslHex(hue, sat, mainIsDark ? lightL : darkL),
        };
    }

    // harmony
    const mainHue = Math.random() * 360;
    const main = hslHex(mainHue, rollSaturation(), rollLightness());
    return { main, accent: randomHarmonyHex(mainHue) };
}

function randomFontId(): string {
    const pool = NAME_FONTS.filter((f) => f.id !== 'default');
    return pool[Math.floor(Math.random() * pool.length)]!.id;
}

/** Roll a fresh Presets result for the given mode. Logo style (Solid / Blank
 *  / Petey / Holo) is its own random layer on top of colour in every mode —
 *  Random rolls it per-call independently of the colour rolls, Match/Pair
 *  roll it once and hue-match it to whichever colour that mode ties the
 *  logo to.
 *  - random: all four rolled independently.
 *  - match:  colorway, tag paint, and logo all lock to one rolled hue.
 *  - pair:   colorway is the main; tag paint + logo share a curated-harmony
 *            accent hue (complementary / split-complementary / triadic off
 *            the main), so tags and logo read as one coordinated pop. */
export function rollPreset(mode: PresetMode): PresetResult {
    const logoStyle = randomLogoStyle();

    if (mode === 'random') {
        return {
            hex: randomVividHex(),
            tagPaint: randomVividHex(),
            logoId: logoForHue(randomLogoStyle(), randomVividHex()),
            fontId: randomFontId(),
        };
    }

    if (mode === 'match') {
        const hex = randomVividHex();
        return {
            hex,
            tagPaint: hex,
            logoId: logoForHue(logoStyle, hex),
            fontId: randomFontId(),
        };
    }

    // Pair — colorway is the main; tag paint is the accent, and the logo
    // rides the accent too (tags + logo read as one coordinated pop against
    // the main colorway). rollPairPalette picks the relationship itself
    // (harmony hue offset / monochrome light-dark / primary triad).
    const { main, accent } = rollPairPalette();
    return {
        hex: main,
        tagPaint: accent,
        logoId: logoForHue(logoStyle, accent),
        fontId: randomFontId(),
    };
}
