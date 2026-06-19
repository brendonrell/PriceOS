/*
 * winBrow — Windows-only sprite eyebrow positioning (Brendon 2026-06-10).
 *
 * THE CONSTRAINT, verbatim: the fix CANNOT touch iOS or possibly even
 * Apple devices overall. Everything here is inert unless the user agent
 * is Windows, and the detection happens AFTER mount so server HTML and
 * first paint are byte-identical on every platform.
 *
 * The bug: the sprite's eyebrows are combining marks (U+0300 etc.)
 * attached to the eye glyph. Windows' Courier New doesn't anchor
 * combining marks over a non-letter base — the brows render offset
 * (his screenshot: detached marks floating beside the eyes). On iOS
 * the marks anchor perfectly and NOTHING may change there.
 *
 * The fix (Windows only): pull the brow out of the text run and overlay
 * its SPACING twin (e.g. combining grave U+0300 → modifier grave U+02CB
 * — same mark shape, same font, reliable standalone rendering) centered
 * above the eye via absolute positioning. Font stays Courier New; the
 * eye glyph is untouched. Brows with no reliable spacing twin in the
 * WGL4 set fall back to today's rendering — never a worse state.
 */

/** Mounted-client check only — never call during render. */
export function isWindowsUA(): boolean {
    if (typeof navigator === 'undefined') return false;
    return /Windows/i.test(navigator.userAgent);
}

/* Combining mark → spacing twin (same visual mark, standalone glyph).
   Only marks whose twin is in WGL4 (guaranteed in Windows Courier New)
   are mapped; anything else falls back to inline rendering. */
const SPACING_TWIN: Record<string, string> = {
    '̀': 'ˋ', // grave        → ˋ
    '́': 'ˊ', // acute        → ˊ
    '̂': 'ˆ', // circumflex   → ˆ
    '̃': '˜', // tilde        → ˜
    '̄': 'ˉ', // macron       → ˉ
    '̅': '‾', // overline     → ‾
    '̆': '˘', // breve        → ˘
    '̇': '˙', // dot above    → ˙
    '̈': '¨', // dieresis     → ¨
    '̌': 'ˇ', // caron        → ˇ
};

export interface SplitEye {
    /** The eye glyph with the brow removed. */
    eye: string;
    /** Spacing twin of the brow, or null when not safely mappable. */
    brow: string | null;
}

/**
 * Split an eye-slot string ("•̀" = eye + combining brow) into the bare
 * eye and the brow's spacing twin. Returns brow: null when the slot has
 * no brow or the brow has no WGL4 twin (caller renders unchanged).
 */
export function splitEyeSlot(slot: string): SplitEye {
    const points = Array.from(slot);
    if (points.length < 2) return { eye: slot, brow: null };
    const last = points[points.length - 1];
    const twin = SPACING_TWIN[last];
    if (!twin) return { eye: slot, brow: null };
    return { eye: points.slice(0, -1).join(''), brow: twin };
}

export type FaceSeg =
    | { kind: 'text'; text: string }
    | { kind: 'eye'; eye: string; brow: string };

/**
 * Split a FULL composed face string into renderable segments: plain text
 * runs, plus eye+brow slots whose combining brow has a WGL4 spacing twin.
 * Lets the ID Rectangle apply the same Windows brow overlay the connect-menu
 * sprite gets per-slot, generalised to the whole string (Brendon 2026-06-19).
 * A combining mark with no twin stays in the text run (rendered verbatim).
 */
export function splitFace(face: string): FaceSeg[] {
    const pts = Array.from(face);
    const segs: FaceSeg[] = [];
    let buf = '';
    const flush = () => { if (buf) { segs.push({ kind: 'text', text: buf }); buf = ''; } };
    for (let i = 0; i < pts.length; i++) {
        const next = pts[i + 1];
        const twin = next ? SPACING_TWIN[next] : undefined;
        if (twin) {
            flush();
            segs.push({ kind: 'eye', eye: pts[i], brow: twin });
            i += 1; // consume the combining brow
            continue;
        }
        buf += pts[i];
    }
    flush();
    return segs;
}
