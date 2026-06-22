'use client';

/*
 * npc/cast — PD's resident characters (the "NPC Cast"), UI-ONLY rough-in.
 *
 * Eight named residents who live OFF-SCREEN and speak from the side walls
 * (Brendon, 2026-06-22). This pass is look-and-feel only: when the NPC spell is
 * on they talk at random, on random timing, with NO awareness of real events —
 * accuracy does not matter yet. The live event-detection layer is a later build.
 *
 * Cast + voice are LOCKED in ClickUp (task 86b9fcp11): offhand, deadpan, cool;
 * each character bends every line through one unbreakable lens. Market voices
 * (Eddie, Mimi) aim at patterns + anonymous wallets only — never a real name.
 *
 * Each resident "speaks" in their own consistent Unicode letterform (the
 * Mathematical Alphanumeric sets people use in handles) — that is how you tell
 * them apart at a glance. Mick is bold fraktur (the gothic one); Steven is
 * monospace (aggressively normal); Celestia bold script (mystic); etc.
 */

export type Wall = 'left' | 'right';

/** Per-character entrance motion — distinct enough to recognise who's talking
 *  from the corner of your eye, before you read the name (Brendon, 2026-06-22). */
export type EntranceAnim =
    | 'glide'   // slow, deliberate slide from the wall (Rocco)
    | 'settle'  // steady drop that settles (Mick)
    | 'snap'    // fast strike in (Mimi)
    | 'plain'   // just appears, no slide (Steven)
    | 'lean'    // tilts in, conspiratorial (Eddie)
    | 'sag'     // heavy drop, low energy (Carl)
    | 'bloom'   // soft scale-up (Romy)
    | 'drift';  // ethereal float-up (Celestia)

export type UnicodeStyle =
    | 'bold'
    | 'bolditalic'
    | 'sansitalic'
    | 'sans'
    | 'mono'
    | 'boldscript'
    | 'boldfraktur'
    | 'doublestruck';

export interface NpcCharacter {
    id: string;
    /** Plain display name (the styled version is derived via styleText). */
    name: string;
    wall: Wall;
    /** Vertical home as a viewport-height %. Staggered so they read as residents. */
    top: number;
    style: UnicodeStyle;
    /** How their bubble enters — a recognisable motion signature. */
    anim: EntranceAnim;
    /** Per-character px nudge to the measured bubble width (some unicode fonts
     *  measure a hair wide). Optional; defaults to 0. */
    widthAdjust?: number;
    lines: string[];
}

/* ── Unicode letterform engine ──────────────────────────────────────────────
   Each style maps A–Z and a–z into a Mathematical Alphanumeric block. Most
   blocks are contiguous (base code point + index); double-struck uppercase has
   reserved holes in the Letterlike Symbols block, handled by an exception map.
   Non-letters (spaces, punctuation, digits, apostrophes) pass through as-is —
   several styles have no digit glyphs, so leaving ASCII digits avoids tofu. */

interface StyleBase {
    upper: number;
    lower: number;
    upperExceptions?: Record<string, string>;
}

const STYLE_BASES: Record<UnicodeStyle, StyleBase> = {
    bold:         { upper: 0x1d400, lower: 0x1d41a },
    bolditalic:   { upper: 0x1d468, lower: 0x1d482 },
    sansitalic:   { upper: 0x1d608, lower: 0x1d622 },
    sans:         { upper: 0x1d5a0, lower: 0x1d5ba },
    mono:         { upper: 0x1d670, lower: 0x1d68a },
    boldscript:   { upper: 0x1d4d0, lower: 0x1d4ea },
    boldfraktur:  { upper: 0x1d56c, lower: 0x1d586 },
    doublestruck: {
        upper: 0x1d538,
        lower: 0x1d552,
        upperExceptions: {
            C: 'ℂ', H: 'ℍ', N: 'ℕ', P: 'ℙ',
            Q: 'ℚ', R: 'ℝ', Z: 'ℤ',
        },
    },
};

/** Render `text` in the given Unicode letterform. Letters only; rest verbatim. */
export function styleText(text: string, style: UnicodeStyle): string {
    const base = STYLE_BASES[style];
    let out = '';
    for (const ch of text) {
        if (ch >= 'A' && ch <= 'Z') {
            const ex = base.upperExceptions?.[ch];
            out += ex ?? String.fromCodePoint(base.upper + (ch.charCodeAt(0) - 65));
        } else if (ch >= 'a' && ch <= 'z') {
            out += String.fromCodePoint(base.lower + (ch.charCodeAt(0) - 97));
        } else {
            out += ch;
        }
    }
    return out;
}

/* ── The cast — 8, LOCKED (ClickUp 86b9fcp11) ───────────────────────────────
   Lines are evergreen, in-voice, generic (no real names / projects) — fine for
   the look-and-feel test. Homes are split 4 left / 4 right and staggered down
   each wall so the screen feels inhabited, not stacked. */

export const CAST: NpcCharacter[] = [
    {
        id: 'rocco', name: 'Rocco', wall: 'left', top: 17, style: 'bold', anim: 'glide', widthAdjust: -8,
        lines: [
            "It's good. I don't need you to think so.",
            'Sold mine. Got loud in here.',
            'I was early. You were a press release.',
            "Taste isn't a vote. Stop counting.",
            'I liked it more when nobody did.',
            "You can have it now. I'm done with it.",
        ],
    },
    {
        id: 'mick', name: 'Mick', wall: 'left', top: 39, style: 'boldfraktur', anim: 'settle',
        lines: [
            "Seen a hundred of these weeks. This one's a Tuesday.",
            'Records come and go. I write them down so somebody did.',
            "I've got it written down. You can stop telling me.",
            'Was here before the floor. Be here after.',
            'Nothing new. Just newer people.',
            'It happened. I noted it. Moving on.',
        ],
    },
    {
        id: 'mimi', name: 'Mimi', wall: 'left', top: 60, style: 'bolditalic', anim: 'snap',
        lines: [
            "I'm not chasing it. Comes back to me eventually. They all do.",
            "Scared money's the cheapest money there is.",
            "Let them panic. I'm shopping.",
            'Everyone sells to me eventually.',
            "I don't need it to go up. I need you to blink.",
            'Patience is a weapon nobody respects.',
        ],
    },
    {
        id: 'steven', name: 'Steven', wall: 'left', top: 81, style: 'mono', anim: 'plain',
        lines: [
            "I'm not in the lore. I just liked it.",
            "Big news? Sure. I'm making chili.",
            "I don't know what half of you are talking about.",
            "It's a website. I think it's neat.",
            'Everyone here needs a hobby. I have several.',
            'Cool. Anyway.',
        ],
    },
    {
        id: 'eddie', name: 'Eddie', wall: 'right', top: 24, style: 'sansitalic', anim: 'lean',
        lines: [
            "Two wallets trading the same piece back and forth. That's not a market, that's a conversation.",
            'Floor moves this week. Leave it there.',
            'Somebody knows something. They always do.',
            "Heard a thing. Can't say where. Can't say who.",
            "Three sales, one hour, one hand. You didn't hear it from me.",
            "There's a story under that number. There always is.",
        ],
    },
    {
        id: 'carl', name: 'Carl', wall: 'right', top: 46, style: 'doublestruck', anim: 'sag',
        lines: [
            "It's up. It'll be down. I live in the part between.",
            "Everyone's happy. I'll wait.",
            'Nice green day. For now.',
            "Somebody's going to be holding this at the top.",
            'Good news. Give it a week.',
            "I'd celebrate, but I've seen how these end.",
        ],
    },
    {
        id: 'romy', name: 'Romy', wall: 'right', top: 67, style: 'sans', anim: 'bloom',
        lines: [
            "Let people like things. It's not that deep, and that's the nice part.",
            "First piece is the realest one you'll make. Keep it.",
            'You did fine. Stop refreshing.',
            "It's allowed to just be nice.",
            "Buy the one you'd keep if it went to zero.",
            'Good for them. I mean it.',
        ],
    },
    {
        id: 'celestia', name: 'Celestia', wall: 'right', top: 85, style: 'boldscript', anim: 'drift',
        lines: [
            "Out today. Doesn't feel right. You don't have to get it.",
            'Knew about this one before the price did.',
            'The cards were calm this morning. That is rare.',
            "Something turns this week. I won't say what.",
            "You'll see it later. I see it now.",
            "Don't buy on a Mercury day. You'll know which.",
        ],
    },
];
