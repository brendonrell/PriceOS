/*
 * pixels — THE STICKER CHANNEL'S PIXEL ART (Brendon, 2026-07-24: "I want like
 * actual awesome pixel graphics and animations", after the first panel read as
 * "normal stuff with a filter").
 *
 * That note is the whole brief. A dot-matrix wash laid OVER ordinary text is a
 * filter; it is not pixel art. So nothing on the panel is text-with-an-effect
 * any more — every glyph and every character is a BITMAP, authored on a grid
 * here and blitted one pixel at a time into the screen buffer. At two device
 * pixels per screen pixel the edges are hard and square by construction, at any
 * colorway, on any screen, because there is nothing to soften.
 *
 * Two tones only, ink on screen — the classic handheld constraint, and the
 * reason the panel can wear PD's own colours instead of a borrowed palette:
 * "ink" is whatever the page's text colour is, "screen" is its background.
 * `,` marks a 50% checkerboard dither, which is how a 1-bit screen draws a
 * mid-tone.
 *
 * THE FONT is 5×7 caps — the smallest grid uppercase stays honestly legible on,
 * and drawn at 2× it lands at 14px tall, over PD's 12px floor (Rule #2).
 *
 * THE CAST maps to the show's existing faces (lib/stickers/episodes) — the two
 * leads get their own sprites, the bestiary regulars hash into the critters, and
 * the channel's own marks front the ad break. Nothing in the scripts changed.
 */

/* ── THE FONT — 5 wide × 7 tall, uppercase ─────────────────────────────────── */

export const GLYPH_W = 5;
export const GLYPH_H = 7;
/** One blank column between letters. */
export const GLYPH_ADVANCE = GLYPH_W + 1;

const FONT_SRC: Record<string, string> = {
    A: '.###.|#...#|#...#|#####|#...#|#...#|#...#',
    B: '####.|#...#|#...#|####.|#...#|#...#|####.',
    C: '.####|#....|#....|#....|#....|#....|.####',
    D: '####.|#...#|#...#|#...#|#...#|#...#|####.',
    E: '#####|#....|#....|####.|#....|#....|#####',
    F: '#####|#....|#....|####.|#....|#....|#....',
    G: '.####|#....|#....|#..##|#...#|#...#|.####',
    H: '#...#|#...#|#...#|#####|#...#|#...#|#...#',
    I: '#####|..#..|..#..|..#..|..#..|..#..|#####',
    J: '....#|....#|....#|....#|#...#|#...#|.###.',
    K: '#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#',
    L: '#....|#....|#....|#....|#....|#....|#####',
    M: '#...#|##.##|#.#.#|#...#|#...#|#...#|#...#',
    N: '#...#|##..#|#.#.#|#..##|#...#|#...#|#...#',
    O: '.###.|#...#|#...#|#...#|#...#|#...#|.###.',
    P: '####.|#...#|#...#|####.|#....|#....|#....',
    Q: '.###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#',
    R: '####.|#...#|#...#|####.|#.#..|#..#.|#...#',
    S: '.####|#....|#....|.###.|....#|....#|####.',
    T: '#####|..#..|..#..|..#..|..#..|..#..|..#..',
    U: '#...#|#...#|#...#|#...#|#...#|#...#|.###.',
    V: '#...#|#...#|#...#|#...#|#...#|.#.#.|..#..',
    W: '#...#|#...#|#...#|#...#|#.#.#|##.##|#...#',
    X: '#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#',
    Y: '#...#|#...#|.#.#.|..#..|..#..|..#..|..#..',
    Z: '#####|....#|...#.|..#..|.#...|#....|#####',

    '0': '.###.|#...#|#..##|#.#.#|##..#|#...#|.###.',
    '1': '..#..|.##..|..#..|..#..|..#..|..#..|.###.',
    '2': '.###.|#...#|....#|...#.|..#..|.#...|#####',
    '3': '#####|...#.|..##.|....#|....#|#...#|.###.',
    '4': '...#.|..##.|.#.#.|#..#.|#####|...#.|...#.',
    '5': '#####|#....|####.|....#|....#|#...#|.###.',
    '6': '..##.|.#...|#....|####.|#...#|#...#|.###.',
    '7': '#####|....#|...#.|..#..|.#...|.#...|.#...',
    '8': '.###.|#...#|#...#|.###.|#...#|#...#|.###.',
    '9': '.###.|#...#|#...#|.####|....#|...#.|.##..',

    ' ': '.....|.....|.....|.....|.....|.....|.....',
    '.': '.....|.....|.....|.....|.....|.##..|.##..',
    ',': '.....|.....|.....|.....|.##..|.##..|.#...',
    "'": '..#..|..#..|.....|.....|.....|.....|.....',
    '"': '.#.#.|.#.#.|.....|.....|.....|.....|.....',
    '!': '..#..|..#..|..#..|..#..|..#..|.....|..#..',
    '?': '.###.|#...#|....#|..##.|..#..|.....|..#..',
    ':': '.....|..#..|..#..|.....|..#..|..#..|.....',
    ';': '.....|..#..|..#..|.....|..#..|..#..|.#...',
    '-': '.....|.....|.....|#####|.....|.....|.....',
    '+': '.....|..#..|..#..|#####|..#..|..#..|.....',
    '=': '.....|.....|#####|.....|#####|.....|.....',
    '/': '....#|....#|...#.|..#..|.#...|#....|#....',
    '\\': '#....|#....|.#...|..#..|...#.|....#|....#',
    '(': '...#.|..#..|.#...|.#...|.#...|..#..|...#.',
    ')': '.#...|..#..|...#.|...#.|...#.|..#..|.#...',
    '[': '..###|..#..|..#..|..#..|..#..|..#..|..###',
    ']': '###..|..#..|..#..|..#..|..#..|..#..|###..',
    '_': '.....|.....|.....|.....|.....|.....|#####',
    '*': '.....|..#..|#.#.#|.###.|#.#.#|..#..|.....',
    '&': '.##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#',
    '$': '..#..|.####|#.#..|.###.|..#.#|####.|..#..',
    '%': '##..#|##.#.|..#..|.#...|#..##|...##|.....',
    '<': '...#.|..#..|.#...|#....|.#...|..#..|...#.',
    '>': '.#...|..#..|...#.|....#|...#.|..#..|.#...',
    '·': '.....|.....|.....|..#..|.....|.....|.....',
    '…': '.....|.....|.....|.....|.....|#.#.#|.....',
    '–': '.....|.....|.....|#####|.....|.....|.....',
    '—': '.....|.....|.....|#####|.....|.....|.....',
    '→': '.....|..#..|...#.|#####|...#.|..#..|.....',
    '←': '.....|..#..|.#...|#####|.#...|..#..|.....',
    '↓': '..#..|..#..|..#..|..#..|#####|.###.|..#..',
    '↑': '..#..|.###.|#####|..#..|..#..|..#..|..#..',
    '◊': '..#..|.#.#.|#...#|#...#|#...#|.#.#.|..#..',
    '✓': '.....|....#|...#.|#..#.|.#.#.|..#..|.....',
    '‰': '##..#|##.#.|..#..|.#..,|#.##,|..##.|.....',
    '▼': '.....|#####|.###.|.###.|..#..|.....|.....',
};

export type Bitmap = string[];

function rows(src: string): Bitmap {
    return src.split('|');
}

const FONT: Record<string, Bitmap> = Object.fromEntries(
    Object.entries(FONT_SRC).map(([ch, src]) => [ch, rows(src)]),
);

/** The stand-in for anything the font doesn't carry — a hollow box, so an
 *  unmapped character is visibly a missing glyph rather than a silent gap. */
const TOFU: Bitmap = rows('.....|.###.|.#.#.|.#.#.|.#.#.|.###.|.....');

export function glyphFor(ch: string): Bitmap {
    return FONT[ch] ?? FONT[ch.toUpperCase()] ?? TOFU;
}

/** True when the font can draw this character as itself. */
export function hasGlyph(ch: string): boolean {
    return FONT[ch] !== undefined || FONT[ch.toUpperCase()] !== undefined;
}

/* ── THE CAST — 16×16, one grid each ───────────────────────────────────────
   `#` ink · `,` 50% dither · `.` screen. Idle life (a one-pixel bob and a
   blink) is generated at draw time from `eyes`, so a character is one grid to
   author and still moves — the alternative was two near-identical grids per
   sprite and twice the surface for them to drift apart on. */

export const SPRITE_SIZE = 16;

export interface Sprite {
    grid: Bitmap;
    /** Row index holding the eyes, and that row with them shut. Omitted for
     *  things that don't have eyes to shut (the marks, the crate). */
    eyeRow?: number;
    eyeShut?: string;
    /** Sprites that shouldn't bob — furniture, marks, anything not alive. */
    still?: boolean;
}

const SPRITE_SRC: Record<string, Sprite> = {
    /* @pricediscussion — the shop itself: the speech bubble behind the counter. */
    shop: {
        grid: [
            '................',
            '...##########...',
            '..############..',
            '.##############.',
            '.##.##....##.##.',
            '.##############.',
            '.##..######..##.',
            '.##############.',
            '..############..',
            '...##########...',
            '.....####.......',
            '......##........',
            '................',
            ',,,,,,,,,,,,,,,,',
            '################',
            ',,,,,,,,,,,,,,,,',
        ],
        eyeRow: 4,
        eyeShut: '.##############.',
    },
    /* @brendon — the owner, who is almost never in. */
    owner: {
        grid: [
            '................',
            '..############..',
            '.##############.',
            '################',
            '...##########...',
            '...##.####.##...',
            '...##########...',
            '...###....###...',
            '...##########...',
            '....########....',
            '..############..',
            '.##############.',
            '.##############.',
            '.##..######..##.',
            '.##..######..##.',
            '.##...####...##.',
        ],
        eyeRow: 5,
        eyeShut: '...##########...',
    },
    blob: {
        grid: [
            '................',
            '................',
            '.....######.....',
            '...##########...',
            '..############..',
            '.##############.',
            '.###..####..###.',
            '.##############.',
            '.##############.',
            '.####......####.',
            '.##############.',
            '..############..',
            '...##########...',
            '................',
            '................',
            '................',
        ],
        eyeRow: 6,
        eyeShut: '.##############.',
    },
    bird: {
        grid: [
            '................',
            '.......####.....',
            '......######....',
            '.....###..###...',
            '.....##.#..##...',
            '....#########...',
            '...###########..',
            '..#############.',
            '..#############.',
            '..####.....####.',
            '...###########..',
            '....#########...',
            '.....##...##....',
            '.....##...##....',
            '....####.####...',
            '................',
        ],
    },
    cat: {
        grid: [
            '................',
            '..##........##..',
            '..###......###..',
            '..####....####..',
            '..############..',
            '..############..',
            '..##.##..##.##..',
            '..############..',
            '..#####..#####..',
            '..############..',
            '...##########...',
            '....########....',
            '....##....##....',
            '....##....##....',
            '...####..####...',
            '................',
        ],
        eyeRow: 6,
        eyeShut: '..############..',
    },
    ghost: {
        grid: [
            '................',
            '.....######.....',
            '...##########...',
            '..############..',
            '.##############.',
            '.###..####..###.',
            '.##############.',
            '.##############.',
            '.##############.',
            '.##############.',
            '.##############.',
            '.##############.',
            '.##.##.##.##.##.',
            '.#...#..#...#.#.',
            '................',
            '................',
        ],
        eyeRow: 5,
        eyeShut: '.##############.',
    },
    bug: {
        grid: [
            '................',
            '..#..........#..',
            '...#........#...',
            '....########....',
            '...##########...',
            '..###..##..###..',
            '..############..',
            '.##############.',
            '.##############.',
            '.##.########.##.',
            '.##############.',
            '..############..',
            '...##########...',
            '..#..######..#..',
            '.#....####....#.',
            '................',
        ],
        eyeRow: 5,
        eyeShut: '..############..',
    },
    bot: {
        grid: [
            '.......##.......',
            '.......##.......',
            '....########....',
            '...##########...',
            '...##########...',
            '...##.####.##...',
            '...##########...',
            '...###....###...',
            '...##########...',
            '....########....',
            '..############..',
            '.##############.',
            '.##..######..##.',
            '.##############.',
            '....##....##....',
            '...####..####...',
        ],
        eyeRow: 5,
        eyeShut: '...##########...',
    },
    worm: {
        grid: [
            '................',
            '................',
            '.....######.....',
            '....########....',
            '....##.##.##....',
            '....########....',
            '....########....',
            '...####..####...',
            '..####....####..',
            '.####......####.',
            '.###........###.',
            '.##..........##.',
            '................',
            '................',
            '................',
            '................',
        ],
        eyeRow: 4,
        eyeShut: '....########....',
    },
    /* The channel's own marks. An ad is the channel talking, never a character. */
    mark: {
        grid: [
            '................',
            '.......##.......',
            '......####......',
            '.....######.....',
            '....########....',
            '...###....###...',
            '..###..##..###..',
            '.###..####..###.',
            '.###..####..###.',
            '..###..##..###..',
            '...###....###...',
            '....########....',
            '.....######.....',
            '......####......',
            '.......##.......',
            '................',
        ],
        still: true,
    },
    /* The set itself — the shop's little television, which is what you are
       actually looking at. Fronts every title card and sign-off. */
    tv: {
        grid: [
            '................',
            '....#......#....',
            '.....#....#.....',
            '......#..#......',
            '................',
            '##############..',
            '#............#..',
            '#.##########.#..',
            '#.#........#.#..',
            '#.#........#.#..',
            '#.##########.#..',
            '#............#..',
            '##############..',
            '..##......##....',
            '.####....####...',
            '................',
        ],
        still: true,
    },
    /* The crate in the back. Nobody opens it. */
    crate: {
        grid: [
            '................',
            '................',
            '..############..',
            '..#..........#..',
            '..#.########.#..',
            '..#.#......#.#..',
            '..#.#.####.#.#..',
            '..#.#.#..#.#.#..',
            '..#.#.#..#.#.#..',
            '..#.#.####.#.#..',
            '..#.#......#.#..',
            '..#.########.#..',
            '..#..........#..',
            '..############..',
            '................',
            '................',
        ],
        still: true,
    },
};

export type SpriteKey = keyof typeof SPRITE_SRC;

export const SPRITES: Record<string, Sprite> = SPRITE_SRC;

/** The regulars, in the order the hash walks them. */
const CRITTERS: string[] = ['blob', 'bird', 'cat', 'ghost', 'bug', 'bot', 'worm'];

/**
 * Which sprite plays a beat's face. The scripts keep handing us the same face
 * strings they always did (lib/stickers/episodes is untouched): the two leads
 * are matched exactly, the channel's marks front the cards and the ad break,
 * and every bestiary regular hashes to a stable critter — the same familiar
 * always draws as the same creature, which is what makes it a cast.
 */
export function spriteForFace(
    face: string,
    leads: { shop: string; brendon: string },
    hint?: { slate?: boolean; ad?: boolean; title?: string },
): string | null {
    if (hint?.slate) {
        return hint.title && /CRATE/i.test(hint.title) ? 'crate' : 'tv';
    }
    if (hint?.ad) return 'mark';
    if (face === leads.shop) return 'shop';
    if (face === leads.brendon) return 'owner';
    /* A continuation line carries the previous character — the caller keeps
       the last sprite rather than blanking the stage mid-sentence. */
    if (face === '·' || face.trim() === '') return null;
    let h = 0;
    for (let i = 0; i < face.length; i++) h = (h * 31 + face.charCodeAt(i)) | 0;
    return CRITTERS[Math.abs(h) % CRITTERS.length]!;
}

/* ── Word wrap ─────────────────────────────────────────────────────────────
   The panel is a screen, not a paragraph — but the content still has to be
   READABLE IN FULL (Brendon, 2026-07-24: "make sure the full content shows"),
   so a line that doesn't fit wraps and then PAGES, the way a handheld text box
   always has. Nothing is ever clipped or ellipsed away. */
export function wrapLines(text: string, cols: number): string[] {
    if (cols < 1) return [text];
    const words = text.trim().split(/\s+/).filter(Boolean);
    const out: string[] = [];
    let line = '';
    for (const w of words) {
        if (!line) {
            line = w;
        } else if (line.length + 1 + w.length <= cols) {
            line = `${line} ${w}`;
        } else {
            out.push(line);
            line = w;
        }
        /* A single word longer than the whole line gets broken rather than
           overflowing — rare (one 40-letter prop name away), never silent. */
        while (line.length > cols) {
            out.push(line.slice(0, cols));
            line = line.slice(cols);
        }
    }
    if (line) out.push(line);
    return out.length ? out : [''];
}

/** Split wrapped lines into pages of `perPage` lines. */
export function paginate(lines: string[], perPage: number): string[][] {
    const pages: string[][] = [];
    for (let i = 0; i < lines.length; i += perPage) pages.push(lines.slice(i, i + perPage));
    return pages.length ? pages : [['']];
}
