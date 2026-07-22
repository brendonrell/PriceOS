/*
 * lib/profile/nameFont.ts — the @name Unicode font styles.
 *
 * A user can restyle the LETTERS of their @name into a Unicode pseudo-font
 * (𝐛𝐨𝐥𝐝, 𝓼𝓬𝓻𝓲𝓹𝓽, ꜱᴍᴀʟʟ ᴄᴀᴘꜱ, ˢᵘᵖᵉʳ, …). These blocks only cover A–Z / a–z /
 * 0–9, so PUNCTUATION — including the "@" — is left exactly as-is (Brendon
 * 2026-07-19: the @ stays a clean anchor; only the handle text transforms). The
 * underlying handle is never touched — this styles the DISPLAY only, so search,
 * @-mentions and the real record keep working.
 *
 * PD handles are lowercase ASCII (/^[a-z0-9_-]+$/), so the capital "holes" some
 * of these blocks have never bite a real @name. Every glyph used here is a plain
 * letter/symbol — NONE carry emoji presentation (verified: no char matches
 * \p{Emoji_Presentation} or \p{Extended_Pictographic}), so nothing renders as a
 * colour emoji. The exotic upside-down glyphs still carry the standard PD glyph
 * gate (device-verify as monochrome text on iPhone) like every glyph we ship.
 */

const cp = (n: number) => String.fromCodePoint(n);

/* Subscript — only a subset of lowercase letters exist (the rest pass through)
   plus complete digits. Best on numbers; some letters stay plain. */
const SUB: Record<string, string> = {
    a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ',
    o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ',
    '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉',
};

/* Upside-down — lowercase flips are well-supported (IPA/Latin-ext); the string
   is reversed so it reads bottom-up. Capitals rarely occur in a handle. */
const FLIP: Record<string, string> = {
    a: 'ɐ', b: 'q', c: 'ɔ', d: 'p', e: 'ǝ', f: 'ɟ', g: 'ƃ', h: 'ɥ', i: 'ᴉ',
    j: 'ɾ', k: 'ʞ', l: 'ʅ', m: 'ɯ', n: 'u', o: 'o', p: 'd', q: 'b', r: 'ɹ',
    s: 's', t: 'ʇ', u: 'n', v: 'ʌ', w: 'ʍ', x: 'x', y: 'ʎ', z: 'z',
    A: '∀', B: ' q', C: 'Ɔ', D: 'p', E: 'Ǝ', F: 'Ⅎ', G: '⅁', H: 'H', I: 'I',
    J: 'ſ', K: 'ʞ', L: '˥', M: 'W', N: 'N', O: 'O', P: 'd', Q: 'Ò', R: 'ɹ',
    S: 'S', T: '┴', U: '∩', V: 'Λ', W: 'M', X: 'X', Y: '⅄', Z: 'Z',
    '0': '0', '1': 'Ɩ', '2': 'ᄅ', '3': 'Ɛ', '4': 'ㄣ', '5': 'ϛ', '6': '9', '7': 'ㄥ', '8': '8', '9': '6',
};

interface FontDef {
    id: string;
    label: string;
    /** Offset-based (contiguous blocks): codepoint of 'A' / 'a' / '0'. */
    upper?: number;
    lower?: number;
    digit?: number;
    /** Per-character overrides / block holes. */
    except?: Record<string, string>;
    /** Table-based (scattered blocks): direct char → glyph map. */
    tbl?: Record<string, string>;
    /** Combining mark appended to each letter/digit (strike / underline). */
    combine?: string;
    /** Special whole-string transforms. */
    transform?: 'upsidedown' | 'spaced';
}

export const NAME_FONTS: FontDef[] = [
    { id: 'default', label: 'Default' },
    { id: 'bold', label: 'Bold', upper: 0x1d400, lower: 0x1d41a, digit: 0x1d7ce },
    { id: 'italic', label: 'Italic', upper: 0x1d434, lower: 0x1d44e, except: { h: 'ℎ' } },
    { id: 'bolditalic', label: 'Bold Italic', upper: 0x1d468, lower: 0x1d482 },
    {
        id: 'script', label: 'Script', upper: 0x1d49c, lower: 0x1d4b6,
        except: { B: 'ℬ', E: 'ℰ', F: 'ℱ', H: 'ℋ', I: 'ℐ', L: 'ℒ', M: 'ℳ', R: 'ℛ', e: 'ℯ', g: 'ℊ', o: 'ℴ' },
    },
    { id: 'boldscript', label: 'Bold Script', upper: 0x1d4d0, lower: 0x1d4ea },
    {
        id: 'fraktur', label: 'Fraktur', upper: 0x1d504, lower: 0x1d51e,
        except: { C: 'ℭ', H: 'ℌ', I: 'ℑ', R: 'ℜ', Z: 'ℨ' },
    },
    { id: 'boldfraktur', label: 'Bold Fraktur', upper: 0x1d56c, lower: 0x1d586 },
    {
        id: 'double', label: 'Double-Struck', upper: 0x1d538, lower: 0x1d552, digit: 0x1d7d8,
        except: { C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ', Q: 'ℚ', R: 'ℝ', Z: 'ℤ' },
    },
    { id: 'sans', label: 'Sans', upper: 0x1d5a0, lower: 0x1d5ba, digit: 0x1d7e2 },
    { id: 'sansbold', label: 'Sans Bold', upper: 0x1d5d4, lower: 0x1d5ee, digit: 0x1d7ec },
    { id: 'sansitalic', label: 'Sans Italic', upper: 0x1d608, lower: 0x1d622 },
    { id: 'sansbolditalic', label: 'Sans Bold Italic', upper: 0x1d63c, lower: 0x1d656 },
    { id: 'mono', label: 'Mono', upper: 0x1d670, lower: 0x1d68a, digit: 0x1d7f6 },
    { id: 'fullwidth', label: 'Fullwidth', upper: 0xff21, lower: 0xff41, digit: 0xff10 },
    // Circled: capital M (Ⓜ U+24C2) carries emoji presentation on iOS — force it
    // to text with VS-15 so it can never render as the metro-M emoji. (Handles are
    // lowercase so it can't hit a real @name, but keep the set airtight anyway.)
    { id: 'circled', label: 'Circled', upper: 0x24b6, lower: 0x24d0, except: { M: 'Ⓜ︎', '0': '⓪', '1': '①', '2': '②', '3': '③', '4': '④', '5': '⑤', '6': '⑥', '7': '⑦', '8': '⑧', '9': '⑨' } },
    // ── creative styles (Brendon 2026-07-19: "add all of them";
    //    Small Caps · Superscript · Strikethrough · Underline pulled 2026-07-22) ──
    { id: 'sub', label: 'Subscript', tbl: SUB },
    { id: 'paren', label: 'Parenthesized', lower: 0x249c, except: { '1': '⑴', '2': '⑵', '3': '⑶', '4': '⑷', '5': '⑸', '6': '⑹', '7': '⑺', '8': '⑻', '9': '⑼' } },
    { id: 'spaced', label: 'Spaced', transform: 'spaced' },
    { id: 'upsidedown', label: 'Upside Down', transform: 'upsidedown' },
];

const BY_ID = new Map<string, FontDef>(NAME_FONTS.map((f) => [f.id, f]));

/** null / 'default' / unknown all mean "no styling". */
export function isValidNameFont(id: unknown): id is string {
    return typeof id === 'string' && BY_ID.has(id) && id !== 'default';
}

const isAlnum = (ch: string) =>
    (ch >= 'A' && ch <= 'Z') || (ch >= 'a' && ch <= 'z') || (ch >= '0' && ch <= '9');

/**
 * Restyle the LETTERS + DIGITS of `text` into the given font. Punctuation
 * (including "@") and anything the font doesn't cover pass through untouched.
 * An unknown/default/empty font returns `text` verbatim.
 */
export function styleName(text: string, fontId: string | null | undefined): string {
    if (!fontId || fontId === 'default') return text;
    const font = BY_ID.get(fontId);
    if (!font) return text;

    // Whole-string transforms.
    if (font.transform === 'spaced') {
        const at = text.startsWith('@');
        const body = at ? text.slice(1) : text;
        return (at ? '@' : '') + [...body].join(' ');
    }
    if (font.transform === 'upsidedown') {
        const at = text.startsWith('@');
        const body = at ? text.slice(1) : text;
        let m = '';
        for (const ch of body) m += FLIP[ch] ?? ch;
        return (at ? '@' : '') + [...m].reverse().join('');
    }

    let out = '';
    for (const ch of text) {
        if (font.combine) { out += isAlnum(ch) ? ch + font.combine : ch; continue; }
        if (font.except && ch in font.except) { out += font.except[ch]; continue; }
        if (font.tbl) { out += font.tbl[ch] ?? ch; continue; }
        const code = ch.codePointAt(0)!;
        if (font.upper != null && ch >= 'A' && ch <= 'Z') out += cp(font.upper + (code - 65));
        else if (font.lower != null && ch >= 'a' && ch <= 'z') out += cp(font.lower + (code - 97));
        else if (font.digit != null && ch >= '0' && ch <= '9') out += cp(font.digit + (code - 48));
        else out += ch;
    }
    return out;
}
