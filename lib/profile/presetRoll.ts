/*
 * lib/profile/presetRoll.ts — Presets row (Random / Match / Pair) roll logic.
 *
 * Pure functions, no React. Colorway and Tag Paint are full-spectrum (any
 * hex is valid on both — see useProfileHex / isValidTagPaint), so rolls pick
 * a vivid random hue rather than sampling a fixed swatch pool. Logo rides
 * along on hue proximity via nearestSolidLogo so it never clashes with a
 * rolled colour that isn't one of the brand presets.
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

/** A vivid, readable random hue — same sat/light band as the logo ring so
 *  rolled colours always land somewhere with a sane light/dark contrast. */
function randomVividHex(): string {
    const h = Math.random() * 360;
    const l = [52, 62, 44][Math.floor(Math.random() * 3)]!;
    return hslHex(h, 88, l);
}

/** Curated harmony offsets (degrees) — complementary, split-complementary,
 *  and triadic. A raw random 90°–270° spread produced muddy neighbours too
 *  often; these are the offsets that reliably read as "chosen", not noise. */
const HARMONY_OFFSETS = [150, 180, 210, 120, 240];

function randomHarmonyHex(fromHue: number): string {
    const base = HARMONY_OFFSETS[Math.floor(Math.random() * HARMONY_OFFSETS.length)]!;
    const jitter = (Math.random() - 0.5) * 12; // ±6° so repeats don't feel identical
    const h = (fromHue + base + jitter + 360) % 360;
    const l = [52, 62, 44][Math.floor(Math.random() * 3)]!;
    return hslHex(h, 88, l);
}

function hexHue(hex: string): number {
    const h = hex.replace('#', '');
    const r = (parseInt(h.slice(0, 2), 16) || 0) / 255;
    const g = (parseInt(h.slice(2, 4), 16) || 0) / 255;
    const b = (parseInt(h.slice(4, 6), 16) || 0) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === min) return 0;
    const d = max - min;
    let hue: number;
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    return hue < 0 ? hue + 360 : hue;
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
    // the main colorway) — a curated-harmony hue, not a raw random spread.
    const main = randomVividHex();
    const accent = randomHarmonyHex(hexHue(main));
    return {
        hex: main,
        tagPaint: accent,
        logoId: logoForHue(logoStyle, accent),
        fontId: randomFontId(),
    };
}
