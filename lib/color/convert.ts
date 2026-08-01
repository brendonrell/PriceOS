/*
 * lib/color/convert — Colorpedia's maths layer.
 *
 * Every number the Colorpedia shows about a colour is COMPUTED HERE, exactly,
 * from the colour itself: hex · RGB · HSL · HSV · CMYK · LAB · LCH · luminance ·
 * contrast. Pure conversions, no data, no lookup, no guessing — they hold for
 * ANY colour, including one sampled off a piece of art (Brendon, 2026-08-01:
 * "the maths is free and exact — never LLM it").
 *
 * CMYK is the naive (uncalibrated) device conversion — the same one every
 * design tool shows next to a hex. It is a screen-space read, not a press
 * profile, and the panel says so.
 *
 * Nearest-name matching uses CIEDE2000 in LAB, which is why an arbitrary hex
 * still lands on a sensible named neighbour instead of the closest RGB cube
 * corner.
 */

export interface Rgb { r: number; g: number; b: number }
export interface Hsl { h: number; s: number; l: number }
export interface Hsv { h: number; s: number; v: number }
export interface Cmyk { c: number; m: number; y: number; k: number }
export interface Lab { l: number; a: number; b: number }
export interface Lch { l: number; c: number; h: number }

/* ── hex ──────────────────────────────────────────────────────────────── */

/** Normalise any accepted hex spelling to `#RRGGBB` upper-case, or null. */
export function normalizeHex(input: string): string | null {
    let s = input.trim().replace(/^#/, '');
    if (/^[0-9a-fA-F]{3}$/.test(s)) s = s.split('').map((c) => c + c).join('');
    if (!/^[0-9a-fA-F]{6}$/.test(s)) return null;
    return `#${s.toUpperCase()}`;
}

export function hexToRgb(hex: string): Rgb {
    const h = normalizeHex(hex) ?? '#000000';
    return {
        r: parseInt(h.slice(1, 3), 16),
        g: parseInt(h.slice(3, 5), 16),
        b: parseInt(h.slice(5, 7), 16),
    };
}

export function rgbToHex({ r, g, b }: Rgb): string {
    const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

/* ── HSL / HSV ────────────────────────────────────────────────────────── */

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === rn) h = ((gn - bn) / d) % 6;
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    const l = (max + min) / 2;
    const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
    return { h, s: s * 100, l: l * 100 };
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
    const d = max - min;
    let h = 0;
    if (d !== 0) {
        if (max === rn) h = ((gn - bn) / d) % 6;
        else if (max === gn) h = (bn - rn) / d + 2;
        else h = (rn - gn) / d + 4;
        h *= 60;
        if (h < 0) h += 360;
    }
    return { h, s: max === 0 ? 0 : (d / max) * 100, v: max * 100 };
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
    const sn = s / 100, ln = l / 100;
    const c = (1 - Math.abs(2 * ln - 1)) * sn;
    const hp = (((h % 360) + 360) % 360) / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0, g = 0, b = 0;
    if (hp < 1) [r, g, b] = [c, x, 0];
    else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x];
    else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const m = ln - c / 2;
    return { r: Math.round((r + m) * 255), g: Math.round((g + m) * 255), b: Math.round((b + m) * 255) };
}

/* ── CMYK (naive device conversion) ───────────────────────────────────── */

export function rgbToCmyk({ r, g, b }: Rgb): Cmyk {
    const rn = r / 255, gn = g / 255, bn = b / 255;
    const k = 1 - Math.max(rn, gn, bn);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    return {
        c: ((1 - rn - k) / (1 - k)) * 100,
        m: ((1 - gn - k) / (1 - k)) * 100,
        y: ((1 - bn - k) / (1 - k)) * 100,
        k: k * 100,
    };
}

export function cmykToRgb({ c, m, y, k }: Cmyk): Rgb {
    const cn = c / 100, mn = m / 100, yn = y / 100, kn = k / 100;
    return {
        r: Math.round(255 * (1 - cn) * (1 - kn)),
        g: Math.round(255 * (1 - mn) * (1 - kn)),
        b: Math.round(255 * (1 - yn) * (1 - kn)),
    };
}

/* ── LAB / LCH (sRGB → XYZ D65 → CIE L*a*b*) ──────────────────────────── */

function srgbToLinear(v: number): number {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

export function rgbToLab({ r, g, b }: Rgb): Lab {
    const rl = srgbToLinear(r), gl = srgbToLinear(g), bl = srgbToLinear(b);
    // sRGB D65 matrix.
    const x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047;
    const y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000;
    const z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883;
    const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (841 / 108) * t + 4 / 29);
    const fx = f(x), fy = f(y), fz = f(z);
    return { l: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

export function labToLch({ l, a, b }: Lab): Lch {
    const c = Math.sqrt(a * a + b * b);
    let h = (Math.atan2(b, a) * 180) / Math.PI;
    if (h < 0) h += 360;
    return { l, c, h };
}

/* ── CIEDE2000 — the perceptual distance that drives name matching ────── */

export function deltaE2000(a: Lab, b: Lab): number {
    const rad = Math.PI / 180, deg = 180 / Math.PI;
    const c1 = Math.sqrt(a.a * a.a + a.b * a.b);
    const c2 = Math.sqrt(b.a * b.a + b.b * b.b);
    const cBar = (c1 + c2) / 2;
    const cBar7 = Math.pow(cBar, 7);
    const g = 0.5 * (1 - Math.sqrt(cBar7 / (cBar7 + Math.pow(25, 7))));
    const a1p = (1 + g) * a.a, a2p = (1 + g) * b.a;
    const c1p = Math.sqrt(a1p * a1p + a.b * a.b);
    const c2p = Math.sqrt(a2p * a2p + b.b * b.b);
    const h1p = c1p === 0 ? 0 : ((Math.atan2(a.b, a1p) * deg) + 360) % 360;
    const h2p = c2p === 0 ? 0 : ((Math.atan2(b.b, a2p) * deg) + 360) % 360;

    const dLp = b.l - a.l;
    const dCp = c2p - c1p;
    let dhp = 0;
    if (c1p * c2p !== 0) {
        dhp = h2p - h1p;
        if (dhp > 180) dhp -= 360;
        else if (dhp < -180) dhp += 360;
    }
    const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin((dhp * rad) / 2);

    const lBarP = (a.l + b.l) / 2;
    const cBarP = (c1p + c2p) / 2;
    let hBarP = h1p + h2p;
    if (c1p * c2p !== 0) {
        if (Math.abs(h1p - h2p) > 180) hBarP += h1p + h2p < 360 ? 360 : -360;
        hBarP /= 2;
    }

    const t = 1
        - 0.17 * Math.cos((hBarP - 30) * rad)
        + 0.24 * Math.cos(2 * hBarP * rad)
        + 0.32 * Math.cos((3 * hBarP + 6) * rad)
        - 0.20 * Math.cos((4 * hBarP - 63) * rad);
    const dTheta = 30 * Math.exp(-Math.pow((hBarP - 275) / 25, 2));
    const cBarP7 = Math.pow(cBarP, 7);
    const rc = 2 * Math.sqrt(cBarP7 / (cBarP7 + Math.pow(25, 7)));
    const sl = 1 + (0.015 * Math.pow(lBarP - 50, 2)) / Math.sqrt(20 + Math.pow(lBarP - 50, 2));
    const sc = 1 + 0.045 * cBarP;
    const sh = 1 + 0.015 * cBarP * t;
    const rt = -Math.sin(2 * dTheta * rad) * rc;

    return Math.sqrt(
        Math.pow(dLp / sl, 2)
        + Math.pow(dCp / sc, 2)
        + Math.pow(dHp / sh, 2)
        + rt * (dCp / sc) * (dHp / sh),
    );
}

/* ── Legibility ───────────────────────────────────────────────────────── */

/** WCAG relative luminance, 0 (black) → 1 (white). */
export function relativeLuminance({ r, g, b }: Rgb): number {
    return 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
}

/** WCAG contrast ratio between two colours, 1 → 21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
    const la = relativeLuminance(a), lb = relativeLuminance(b);
    const hi = Math.max(la, lb), lo = Math.min(la, lb);
    return (hi + 0.05) / (lo + 0.05);
}

/** Which of black / white sits legibly on this colour. */
export function readableInk(rgb: Rgb): '#000000' | '#FFFFFF' {
    return contrastRatio(rgb, { r: 0, g: 0, b: 0 }) >= contrastRatio(rgb, { r: 255, g: 255, b: 255 })
        ? '#000000'
        : '#FFFFFF';
}

/* ── Derived reads ────────────────────────────────────────────────────── */

/** The hue's family word, from its LCH hue angle. Neutrals answer honestly. */
export function hueFamily(hex: string): string {
    const rgb = hexToRgb(hex);
    const { l, c, h } = labToLch(rgbToLab(rgb));
    if (c < 6) {
        if (l < 12) return 'Black';
        if (l > 92) return 'White';
        return 'Grey';
    }
    if (h < 15 || h >= 345) return 'Red';
    if (h < 45) return 'Orange';
    if (h < 75) return 'Yellow';
    if (h < 105) return 'Chartreuse';
    if (h < 165) return 'Green';
    if (h < 195) return 'Teal';
    if (h < 255) return 'Blue';
    if (h < 285) return 'Violet';
    if (h < 315) return 'Purple';
    return 'Magenta';
}

/** Warm / cool / neutral, off the LCH hue angle (chroma-gated). */
export function temperatureWord(hex: string): string {
    const { c, h } = labToLch(rgbToLab(hexToRgb(hex)));
    if (c < 6) return 'Neutral';
    return h >= 90 && h < 270 ? 'Cool' : 'Warm';
}

/** Value band — how light the colour sits. */
export function valueWord(hex: string): string {
    const { l } = rgbToLab(hexToRgb(hex));
    if (l < 15) return 'Near-black';
    if (l < 32) return 'Deep';
    if (l < 50) return 'Dark';
    if (l < 68) return 'Mid';
    if (l < 84) return 'Light';
    if (l < 95) return 'Pale';
    return 'Near-white';
}

/** Saturation band — how pure the hue reads. */
export function chromaWord(hex: string): string {
    const { c } = labToLch(rgbToLab(hexToRgb(hex)));
    if (c < 6) return 'Achromatic';
    if (c < 20) return 'Muted';
    if (c < 45) return 'Moderate';
    if (c < 75) return 'Saturated';
    return 'Vivid';
}

/* ── Harmonies — computed, exact, on the wheel ────────────────────────── */

function spinHue(hex: string, byDeg: number, opts?: { s?: number; l?: number }): string {
    const hsl = rgbToHsl(hexToRgb(hex));
    return rgbToHex(hslToRgb({
        h: (hsl.h + byDeg + 360) % 360,
        s: opts?.s ?? hsl.s,
        l: opts?.l ?? hsl.l,
    }));
}

export interface Harmony { key: string; label: string; hexes: string[] }

export function harmonies(hex: string): Harmony[] {
    const base = normalizeHex(hex) ?? '#000000';
    const hsl = rgbToHsl(hexToRgb(base));
    return [
        { key: 'complement', label: 'Complement', hexes: [base, spinHue(base, 180)] },
        { key: 'triad', label: 'Triad', hexes: [base, spinHue(base, 120), spinHue(base, 240)] },
        { key: 'analogous', label: 'Analogous', hexes: [spinHue(base, -30), base, spinHue(base, 30)] },
        { key: 'split', label: 'Split', hexes: [base, spinHue(base, 150), spinHue(base, 210)] },
        {
            key: 'shades',
            label: 'Shades',
            hexes: [12, 28, 44, 60, 76, 90].map((l) => rgbToHex(hslToRgb({ h: hsl.h, s: hsl.s, l }))),
        },
    ];
}

/* ── Formatting ───────────────────────────────────────────────────────── */

const r0 = (n: number) => Math.round(n);
const r1 = (n: number) => (Math.round(n * 10) / 10).toFixed(1);

export function formatRgb(v: Rgb): string { return `${r0(v.r)}, ${r0(v.g)}, ${r0(v.b)}`; }
export function formatHsl(v: Hsl): string { return `${r0(v.h)}°, ${r0(v.s)}%, ${r0(v.l)}%`; }
export function formatHsv(v: Hsv): string { return `${r0(v.h)}°, ${r0(v.s)}%, ${r0(v.v)}%`; }
export function formatCmyk(v: Cmyk): string { return `${r0(v.c)}, ${r0(v.m)}, ${r0(v.y)}, ${r0(v.k)}`; }
export function formatLab(v: Lab): string { return `${r1(v.l)}, ${r1(v.a)}, ${r1(v.b)}`; }
export function formatLch(v: Lch): string { return `${r1(v.l)}, ${r1(v.c)}, ${r0(v.h)}°`; }
