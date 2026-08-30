'use client';

/*
 * StickerLcd — the marketplace line as a handheld screen, and the stage THE
 * STICKER CHANNEL plays on (Brendon, 2026-07-24).
 *
 * ── WHY THIS IS A CANVAS AND NOT STYLED TEXT (Brendon, 2026-07-24) ────────
 * The first cut was ordinary text under a dot-matrix wash, and his read was
 * exact: "this is normal stuff with a filter. I want like actual awesome pixel
 * graphics and animations." So the panel is now a real low-resolution screen —
 * a buffer two device pixels to the screen pixel, every glyph and every
 * character blitted from a bitmap in lib/stickers/pixels, and all 22
 * transitions rewritten as per-pixel operations on that buffer instead of CSS
 * over a div. Nothing here is text with an effect on it.
 *
 * ── IT WEARS THE THEME, NOT A BORROWED PALETTE (Brendon, 2026-07-24) ──────
 * Ink is the page's own text colour and the screen is its background, read live
 * so the panel repaints with every colorway (the DMG green it launched in is
 * gone). Two tones is the constraint that makes that possible — mid-tones are
 * dithered, the way a 1-bit screen has always drawn them.
 *
 * ── NOTHING IS EVER CLIPPED (Brendon, 2026-07-24: "make sure the full content
 * shows") ─ a line too long for the screen wraps, and a beat too long for two
 * lines PAGES, with the classic blinking marker. The old single clipped row
 * could silently eat half a sentence; this cannot.
 *
 * ── COMMERCIALS ONLY (Brendon, 2026-07-28: "remove the episodes, commercials
 * only and we want LOTS of them") ─ the daily episode is off the air. What runs
 * now is the ad break and nothing else: the bumper, then EVERY spot eligible
 * for the face you're on — shuffled fresh on each visit so the order is never
 * the same twice — then the hand-back, forever. The one rule of the copy still
 * holds: the spots sell the chase, never the return.
 *
 * Motion honours prefers-reduced-motion: the show still plays, it just cuts.
 */

import { useCallback, useEffect, useRef } from 'react';
import { adBreak, eligibleSpots, AD_BUMPER, AD_RETURN } from '../../lib/stickers/ads';
import { LEADS, type Beat } from '../../lib/stickers/episodes';
import {
    GLYPH_H, GLYPH_W, GLYPH_ADVANCE, SPRITE_SIZE, SPRITES,
    glyphFor, spriteForFace, wrapLines, paginate,
} from '../../lib/stickers/pixels';

/** Title / bumper cards hold a beat longer than a line of dialogue. */
const CARD_MS = 2400;
/** How long one line of an ad holds. */
const AD_MS = 3200;
/** No page is ever on screen for less than this, however short its beat. */
const MIN_PAGE_MS = 1400;
/** How long a transition runs. Short — it's punctuation, not the show. */
const TRANS_MS = 420;
/** Per character of the type-on. */
const TYPE_MS = 24;

/** CSS pixels per screen pixel. Two is the whole look: hard square edges that
 *  no amount of scaling can soften, and caps that land at 14px tall. */
const PX = 2;

/* The 22 transitions (Brendon's count, 2026-07-24) — now real pixel moves:
   each one either RESAMPLES the frame (slide, zoom, glitch, pixelate) or MASKS
   it (wipe, iris, bars, stagger), computed per pixel as the beat lands. */
const MOVES = [
    'wipe', 'blink', 'slide', 'hop', 'curtain', 'shutter', 'typeout', 'dropin',
    'flip', 'squash', 'zoom', 'iris', 'pixel', 'scan', 'rollup', 'glitch',
    'bars', 'sweep', 'bounce', 'spin', 'shrink', 'stagger',
] as const;
type Move = (typeof MOVES)[number];

type Frame = Beat & { slate?: boolean; ad?: boolean; title?: string };

/* ── Colour ────────────────────────────────────────────────────────────────
   The panel reads the live colorway off the page rather than holding colours of
   its own, so a recolour anywhere repaints the screen with everything else. */
interface Ink { ink: number; screen: number }

function packRGB(r: number, g: number, b: number): number {
    /* Uint32 view of RGBA bytes — little-endian, which is every platform we
       ship to. */
    return (255 << 24) | (b << 16) | (g << 8) | r;
}

function parseColor(scratch: CanvasRenderingContext2D, value: string, fallback: number): number {
    const v = value.trim();
    if (!v) return fallback;
    try {
        scratch.fillStyle = '#000000';
        scratch.fillStyle = v;
        const norm = scratch.fillStyle as string;
        if (norm.startsWith('#')) {
            const h = norm.length === 4
                ? norm[1]! + norm[1]! + norm[2]! + norm[2]! + norm[3]! + norm[3]!
                : norm.slice(1, 7);
            return packRGB(parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16));
        }
        const m = norm.match(/rgba?\(([^)]+)\)/);
        if (m) {
            const [r, g, b] = m[1]!.split(',').map((n) => parseInt(n.trim(), 10));
            return packRGB(r || 0, g || 0, b || 0);
        }
    } catch { /* fall through */ }
    return fallback;
}

export default function StickerLcd({ mode }: { mode: 'store' | 'market' | 'binder' }) {
    /* ⛔ THE ROTATION HAS TO ACTUALLY ROTATE (Brendon, 2026-07-28: "it played
       the same ones every time... make sure the rotation is actually working
       and it doesn't always just default to a certain one first").
       The old build shuffled ONCE, when the panel mounted — so for as long as
       the shop stayed open you got the same commercials in the same order,
       forever, and the same one always led. Now the running order is rebuilt
       and RE-SHUFFLED every time the carousel wraps, so each pass through the
       break leads with a different spot and plays them in a different order.
       Every eligible spot still gets a slot in every pass — nothing is sampled
       out. */
    const buildFrames = useCallback((): Frame[] => {
        const card = (face: string, line: string): Frame => ({ face, line, ms: CARD_MS, slate: true });
        const ads: Frame[] = adBreak(mode, eligibleSpots(mode).length).flatMap((spot) =>
            spot.lines.map((line, n) => ({
                face: n === 0 ? '◈︎' : '·',
                line,
                ms: AD_MS,
                ad: true,
            })),
        );
        return [
            card('▪︎', AD_BUMPER),
            ...ads,
            card('▪︎', AD_RETURN),
        ];
    }, [mode]);

    const hostRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    /* The running order lives ONLY in the ref — never re-derived on render, so
       a reshuffle the loop just made can't be thrown away by the next repaint. */
    const framesRef = useRef<Frame[]>([]);
    const buildRef = useRef(buildFrames);
    buildRef.current = buildFrames;
    if (framesRef.current.length === 0) framesRef.current = buildFrames();
    /* Set by the loop, called when the face changes — the show for the shop is
       not the show for the marketplace, so it restarts at its own slate. */
    const restartRef = useRef<(() => void) | null>(null);

    /* The whole show runs off refs inside one animation frame loop — React
       never re-renders for a beat, a typed character or a transition step. A
       panel that repaints 60 times a second through the component tree is what
       buries mobile Safari; this one touches a 2.8k-pixel buffer and nothing
       else. */
    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const scratchEl = document.createElement('canvas');
        const scratch = scratchEl.getContext('2d');

        let W = 0, H = 0;
        let img: ImageData | null = null;
        let buf32: Uint32Array | null = null;
        let scene: Uint8Array | null = null;

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

        /* ── Colours, live off the page ───────────────────────────────────── */
        const colours: Ink = { ink: packRGB(255, 255, 255), screen: packRGB(20, 20, 20) };
        const readColours = () => {
            if (!scratch) return;
            const cs = getComputedStyle(host);
            colours.ink = parseColor(scratch, cs.getPropertyValue('--text-color'), colours.ink);
            colours.screen = parseColor(scratch, cs.getPropertyValue('--bg-color'), colours.screen);
        };
        readColours();
        const themeWatch = new MutationObserver(readColours);
        themeWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-colorway'] });

        /* ── Geometry ─────────────────────────────────────────────────────── */
        const resize = () => {
            const r = host.getBoundingClientRect();
            const nw = Math.max(24, Math.ceil(r.width / PX));
            const nh = Math.max(12, Math.ceil(r.height / PX));
            if (nw === W && nh === H) return;
            W = nw; H = nh;
            canvas.width = W;
            canvas.height = H;
            canvas.style.width = `${W * PX}px`;
            canvas.style.height = `${H * PX}px`;
            img = ctx.createImageData(W, H);
            buf32 = new Uint32Array(img.data.buffer);
            scene = new Uint8Array(W * H);
            plan();
        };

        /* ── The running state ────────────────────────────────────────────── */
        let beat = 0;          // which frame of the carousel
        let page = 0;          // which page of that frame's text
        let pages: string[][] = [['']];
        let pageMs = MIN_PAGE_MS;
        let pageStart = performance.now();
        let spriteKey: string | null = 'tv';
        let lastSprite: string = 'tv';
        let textX = 0, textCols = 0;

        /** Work out the layout + pages for the current beat. */
        const plan = () => {
            const f = framesRef.current[beat];
            if (!f || !W) return;
            const key = spriteForFace(f.face, LEADS, { slate: f.slate, ad: f.ad, title: f.title });
            /* A continuation line keeps whoever was already on stage rather
               than blanking it mid-sentence. */
            spriteKey = key ?? lastSprite;
            lastSprite = spriteKey;
            textX = 2 + SPRITE_SIZE + 3;
            textCols = Math.max(4, Math.floor((W - textX - 2 + 1) / GLYPH_ADVANCE));
            pages = paginate(wrapLines(f.line, textCols), 2);
            const total = Math.max(f.ms, pages.length * MIN_PAGE_MS);
            pageMs = Math.round(total / pages.length);
        };

        const advance = (now: number) => {
            if (page + 1 < pages.length) {
                page += 1;
            } else {
                const next = beat + 1;
                if (next >= framesRef.current.length) {
                    /* END OF THE PASS — deal the break again, in a NEW order, so
                       the next time round leads with a different commercial
                       (Brendon, 2026-07-28). */
                    framesRef.current = buildRef.current();
                    beat = 0;
                } else {
                    beat = next;
                }
                page = 0;
                plan();
            }
            pageStart = now;
        };

        /* ── Drawing into the scene buffer ────────────────────────────────── */
        const px = (x: number, y: number, on: number) => {
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            scene![y * W + x] = on;
        };
        /** A 50% checkerboard — how a two-tone screen draws a mid-tone. */
        const dither = (x: number, y: number) => px(x, y, (x + y) & 1 ? 1 : 0);

        const drawBitmap = (rows: readonly string[], ox: number, oy: number, shutRow?: number, shut?: string) => {
            for (let r = 0; r < rows.length; r++) {
                const row = (shutRow === r && shut) ? shut : rows[r]!;
                for (let c = 0; c < row.length; c++) {
                    const ch = row[c]!;
                    if (ch === '#') px(ox + c, oy + r, 1);
                    else if (ch === ',') dither(ox + c, oy + r);
                }
            }
        };

        const drawText = (text: string, ox: number, oy: number, limit: number): number => {
            let n = 0;
            for (let i = 0; i < text.length && n < limit; i++, n++) {
                const g = glyphFor(text[i]!);
                drawBitmap(g, ox + i * GLYPH_ADVANCE, oy);
            }
            return n;
        };

        /* ── The 22 moves, as pixel operations ────────────────────────────── */
        /** Where screen pixel (x,y) reads from mid-transition, or null when it
         *  hasn't landed yet. `t` runs 0→1. */
        const sample = (move: Move, x: number, y: number, t: number): [number, number] | null => {
            const cx = (W - 1) / 2, cy = (H - 1) / 2;
            switch (move) {
                case 'wipe':    return x <= t * W ? [x, y] : null;
                case 'blink':   return (t < 0.22 || (t >= 0.4 && t < 0.58) || t >= 0.74) ? [x, y] : null;
                case 'slide': { const sx = x + Math.round((1 - t) * W); return sx < W ? [sx, y] : null; }
                case 'hop': { const d = Math.round((1 - t) * (1 - t) * H); const sy = y + d; return sy < H ? [x, sy] : null; }
                case 'curtain': return Math.abs(x - cx) <= t * (W / 2) ? [x, y] : null;
                case 'shutter': return (x % 8) < t * 8 ? [x, y] : null;
                case 'typeout': return [x, y];
                case 'dropin': { const sy = y + Math.round((1 - t) * H); return sy < H ? [x, sy] : null; }
                case 'flip': { const s = Math.max(0.08, t); const sy = Math.round((y - cy) / s + cy); return sy >= 0 && sy < H ? [x, sy] : null; }
                case 'squash': { const s = Math.max(0.08, t); const sx = Math.round((x - cx) / s + cx); return sx >= 0 && sx < W ? [sx, y] : null; }
                case 'zoom': {
                    const s = Math.max(0.08, t);
                    const sx = Math.round((x - cx) / s + cx), sy = Math.round((y - cy) / s + cy);
                    return sx >= 0 && sx < W && sy >= 0 && sy < H ? [sx, sy] : null;
                }
                case 'iris': {
                    const dx = (x - cx) / (W / 2), dy = (y - cy) / (H / 2);
                    return Math.hypot(dx, dy) <= t * 1.5 ? [x, y] : null;
                }
                case 'pixel': {
                    const b = Math.max(1, Math.round((1 - t) * 7));
                    return [Math.min(W - 1, Math.floor(x / b) * b + (b >> 1)), Math.min(H - 1, Math.floor(y / b) * b + (b >> 1))];
                }
                case 'scan':    return y <= t * H ? [x, y] : null;
                case 'rollup':  return y >= (1 - t) * H ? [x, y] : null;
                case 'glitch': {
                    const j = Math.round(((((y * 2654435761) >>> 8) % 17) - 8) * (1 - t));
                    const sx = x + j;
                    return sx >= 0 && sx < W ? [sx, y] : null;
                }
                case 'bars': {
                    const even = ((x >> 2) & 1) === 0;
                    return (even ? y <= t * H : y >= (1 - t) * H) ? [x, y] : null;
                }
                case 'sweep':   return (x / W + y / H) / 2 <= t ? [x, y] : null;
                case 'bounce': {
                    const e = 1 - (1 - t) * (1 - t) * (1 - 0.35 * Math.sin(t * Math.PI * 3));
                    const sy = y + Math.round((1 - e) * H);
                    return sy >= 0 && sy < H ? [x, sy] : null;
                }
                case 'spin': {
                    const s = Math.max(0.08, Math.abs(Math.cos((1 - t) * Math.PI)));
                    let sx = Math.round((x - cx) / s + cx);
                    if (t < 0.5) sx = W - 1 - sx;
                    return sx >= 0 && sx < W ? [sx, y] : null;
                }
                case 'shrink':  return (Math.abs(x - cx) >= (1 - t) * (W / 2) || Math.abs(y - cy) >= (1 - t) * (H / 2)) ? [x, y] : null;
                case 'stagger': {
                    const cols = Math.ceil(W / 4), bx = Math.floor(x / 4), by = Math.floor(y / 4);
                    const order = ((bx * 7 + by * 13) % (cols * 4)) / (cols * 4);
                    return order <= t ? [x, y] : null;
                }
                default: return [x, y];
            }
        };

        /* ── The frame loop ───────────────────────────────────────────────── */
        let raf = 0;
        const tick = (now: number) => {
            raf = requestAnimationFrame(tick);
            if (!img || !buf32 || !scene || !W) return;

            const f = framesRef.current[beat];
            if (!f) return;
            const elapsed = now - pageStart;
            if (elapsed >= pageMs) { advance(now); return; }

            /* ── build the scene ── */
            scene.fill(0);

            const spr = spriteKey ? SPRITES[spriteKey] : null;
            if (spr) {
                /* One-pixel bob + a blink on a slow cycle: the whole reason the
                   cast is authored as one grid each and still reads as alive. */
                const bob = spr.still || reduced ? 0 : (Math.floor(now / 520) % 2 === 0 ? 0 : 1);
                const blink = !spr.still && !reduced && (now % 2600) < 130;
                const sy = Math.max(0, Math.round((H - SPRITE_SIZE) / 2) + bob);
                drawBitmap(spr.grid, 2, sy, blink ? spr.eyeRow : undefined, spr.eyeShut);
                /* Ground under anything that doesn't carry its own furniture. */
                if (!spr.still && spriteKey !== 'shop' && spriteKey !== 'owner') {
                    for (let x = 2; x < 2 + SPRITE_SIZE; x++) dither(x, Math.min(H - 1, sy + SPRITE_SIZE));
                }
            }

            const linesOnPage = pages[page] ?? [''];
            const totalChars = linesOnPage.reduce((a, l) => a + l.length, 0);
            const typeFor = Math.min(totalChars * TYPE_MS, pageMs * 0.62);
            const shown = reduced ? totalChars
                : Math.ceil(Math.min(1, typeFor <= 0 ? 1 : elapsed / typeFor) * totalChars);

            /* Two lines, sat either side of the screen's middle. */
            const blockH = linesOnPage.length * GLYPH_H + (linesOnPage.length - 1) * 2;
            let ty = Math.max(1, Math.round((H - blockH) / 2));
            let budget = shown;
            for (const line of linesOnPage) {
                if (budget <= 0) break;
                budget -= drawText(line, textX, ty, budget);
                ty += GLYPH_H + 2;
            }

            /* The page marker — blinking ▼, the way a text box has always said
               "there is more of this". */
            if (page + 1 < pages.length && shown >= totalChars && (Math.floor(now / 380) % 2 === 0)) {
                drawBitmap(glyphFor('▼'), W - GLYPH_W - 2, H - GLYPH_H - 1);
            }

            /* ── compose ── */
            const move: Move = MOVES[beat % MOVES.length]!;
            const t = reduced ? 1 : Math.min(1, elapsed / TRANS_MS);
            /* Screen always wears the page's own colours (see "IT WEARS THE
               THEME" above) — no per-ad invert. It used to flip ink/screen for
               every ad line, and since the channel is commercials-only now
               that meant "inverted" for nearly the whole runtime, with only the
               two brief bumper/return cards in normal colours — reading as a
               random dark/light flicker depending on when you looked (Brendon,
               2026-08-30: "isn't consistent in its theming... switches from
               black to white totally at random"). */
            const ink = colours.ink;
            const screen = colours.screen;

            if (t >= 1) {
                for (let i = 0; i < scene.length; i++) buf32[i] = scene[i] ? ink : screen;
            } else {
                for (let y = 0; y < H; y++) {
                    for (let x = 0; x < W; x++) {
                        const s = sample(move, x, y, t);
                        const on = s ? scene[s[1]! * W + s[0]!] : 0;
                        buf32[y * W + x] = on ? ink : screen;
                    }
                }
            }
            ctx.putImageData(img, 0, 0);
        };

        restartRef.current = () => {
            beat = 0; page = 0;
            plan();
            pageStart = performance.now();
        };

        const ro = new ResizeObserver(resize);
        ro.observe(host);
        resize();
        pageStart = performance.now();
        raf = requestAnimationFrame(tick);

        return () => {
            cancelAnimationFrame(raf);
            ro.disconnect();
            themeWatch.disconnect();
            restartRef.current = null;
        };
    }, []);

    /* A face change is a different shop, so it gets its own freshly-dealt
       break and restarts at the bumper. */
    useEffect(() => {
        framesRef.current = buildFrames();
        restartRef.current?.();
    }, [buildFrames]);

    return (
        <div className="ss-lcd" ref={hostRef} aria-hidden="true">
            <canvas className="ss-lcd-canvas" ref={canvasRef} />
        </div>
    );
}
