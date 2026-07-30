'use client';

/*
 * FmLcd — the USB face's readout as a REAL dot-matrix LCD (Brendon,
 * 2026-07-28: "return to black screen always for USB but I want real lcd like
 * we have in the sticker store this time").
 *
 * ── IT IS THE STICKER STORE'S SCREEN, NOT A LOOKALIKE (Rule #0) ────────────
 * Every character is blitted from the SAME bitmap font the Sticker Channel
 * draws with (lib/stickers/pixels) onto the same kind of low-resolution buffer,
 * two device pixels to the screen pixel. There is no text here and no CSS
 * effect over text — the pixels are the pixels. That is the whole difference
 * between this and a font with a filter on it.
 *
 * ── ALWAYS BLACK, LIT PIXELS ──────────────────────────────────────────────
 * Unlike the panel in the shop, this screen does NOT wear the colorway: it is
 * black glass with a lit readout, always, on every page (his standing call for
 * the USB face). The unlit cells are drawn too, faintly — a real segment LCD
 * shows its whole matrix, and that ghost grid is most of what sells it.
 *
 * ── THE EQ IS DRIVEN BY PLAYBACK, NOT BY A TIMER ──────────────────────────
 * The bars live in this same buffer. They move only while the sound is really
 * advancing: the component watches the player's own clock, so a paused or
 * stalled station shows a flat, still meter instead of a decorative loop that
 * lies about playing. What it CANNOT be is a true spectrum — the audio lives
 * inside YouTube's cross-origin player and no analyser can reach it. So the
 * heights are seeded from the elapsed position rather than invented, and they
 * stop dead the instant playback does.
 */

import { useEffect, useRef } from 'react';
import { GLYPH_H, GLYPH_W, GLYPH_ADVANCE, glyphFor } from '../../lib/stickers/pixels';

/** ⛔ THE PANEL IS SIZED TO THE PLAYER, NOT TO THE SHOP (Brendon, 2026-07-30:
 *  "make the lcd screen actually sized to the player and not the sticker store,
 *  that was lazy work"). The shop's panel is a big surface and draws two CSS
 *  pixels per screen pixel; lifting that number onto a 30px-tall glass left room
 *  for THREE characters and two-and-a-bit rows — the readout was clipped from the
 *  day it shipped. One CSS pixel per screen pixel is this screen's own scale: the
 *  full three rows fit with the meter, and the matrix is still the shop's exact
 *  bitmap font, blitted the same way (Rule #0). */
const PX = 1;
/** Lit segment. */
const ON = 'rgba(226, 246, 214, 1)';
/** The unlit matrix, faint but present — the ghost grid of a real LCD. */
const OFF = 'rgba(226, 246, 214, 0.07)';
const GLASS = '#05070a';
/** Bars in the meter. */
const BARS = 5;

export default function FmLcd({
    rows,
    playing,
    getElapsed,
    bars = BARS,
}: {
    /** The three readout lines, top to bottom. */
    rows: [string, string, string];
    /** Sound actually advancing right now. */
    playing: boolean;
    /** The player's own clock, in seconds. Drives the meter. */
    getElapsed: () => number;
    /** How many bars the meter draws. The deck's glass is wider, so it carries
        twice the USB's count (Brendon, 2026-07-30). */
    bars?: number;
}) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const playingRef = useRef(playing);
    playingRef.current = playing;
    const elapsedRef = useRef(getElapsed);
    elapsedRef.current = getElapsed;
    const barsRef = useRef(bars);
    barsRef.current = bars;

    useEffect(() => {
        const host = hostRef.current;
        const canvas = canvasRef.current;
        if (!host || !canvas) return;
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

        let W = 0, H = 0;
        /* 1 = lit, 0 = dark. One byte per screen pixel, like the shop's. */
        let scene: Uint8Array | null = null;

        /* A one-CSS-pixel cell would be soft on a phone if the buffer were sized
           in CSS pixels, so the CELL SIZE and the BUFFER RESOLUTION are separate:
           cells stay this screen's size, the buffer is drawn at the device's. */
        const dpr = Math.min(3, Math.max(1, window.devicePixelRatio || 1));
        const S = PX * dpr; // device pixels per screen pixel

        const resize = () => {
            const r = host.getBoundingClientRect();
            const nw = Math.max(24, Math.floor(r.width / PX));
            const nh = Math.max(10, Math.floor(r.height / PX));
            if (nw === W && nh === H) return;
            W = nw; H = nh;
            canvas.width = Math.round(W * S);
            canvas.height = Math.round(H * S);
            canvas.style.width = `${W * PX}px`;
            canvas.style.height = `${H * PX}px`;
            scene = new Uint8Array(W * H);
        };

        const px = (x: number, y: number) => {
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            scene![y * W + x] = 1;
        };

        /* Glyphs are clipped to the text window, not to the canvas — the crawl
           below slides letters in and out and neither end may bleed over the
           meter or the bezel. */
        const drawBitmap = (bmp: readonly string[], ox: number, oy: number, clipL: number, clipR: number) => {
            for (let r = 0; r < bmp.length; r++) {
                const row = bmp[r]!;
                for (let c = 0; c < row.length; c++) {
                    const x = ox + c;
                    if (x < clipL || x > clipR) continue;
                    if (row[c] === '#') px(x, oy + r);
                }
            }
        };

        const drawText = (text: string, ox: number, oy: number, clipL: number, clipR: number) => {
            for (let i = 0; i < text.length; i++) {
                const gx = ox + i * GLYPH_ADVANCE;
                if (gx > clipR) break;
                if (gx + GLYPH_W < clipL) continue;
                drawBitmap(glyphFor(text[i]!), gx, oy, clipL, clipR);
            }
        };

        /* ── THE CRAWL (Brendon, 2026-07-30) — the same old-MP3 grammar the deck
           rows already use, drawn in the matrix instead of in CSS: a line that
           FITS sits perfectly still; one too long holds at the start, crawls
           sideways to reveal its tail, holds there, then slides back. The glass
           is only a few characters wide, so without this a title is a stub. It
           runs off the wall clock, not the player's, so a paused station still
           shows you what it is parked on. */
        const crawlOffset = (widthPx: number, span: number, now: number) => {
            const overflow = widthPx - span;
            if (overflow <= 1 || reduced) return 0;
            const shift = overflow + 3;
            const dur = Math.max(7, shift / 11 + 4); // seconds, one direction
            const u = ((now / 1000) % (dur * 2)) / dur;
            const p = u <= 1 ? u : 2 - u; // out, then back
            /* the holds at each end live here, exactly as the CSS keyframes */
            const e = Math.min(1, Math.max(0, (p - 0.16) / 0.68));
            return -Math.round(e * shift);
        };

        /* The meter, right-aligned in the glass. Heights ride the player's real
           position; a still clock is a still meter. */
        const drawMeter = (elapsed: number) => {
            const bw = 2, gap = 1;
            const n = Math.max(1, barsRef.current);
            const totalW = n * bw + (n - 1) * gap;
            const x0 = W - totalW - 1;
            const maxH = Math.min(11, H - 2);
            const base = H - 2;
            for (let b = 0; b < n; b++) {
                /* Each bar reads the clock at its own rate, so they dance
                   against each other instead of pumping in lockstep. */
                const t = elapsed * (1.7 + b * 0.43) + b * 1.9;
                const wave = playingRef.current && !reduced
                    ? (Math.sin(t) * 0.5 + 0.5) * 0.75 + (Math.sin(t * 2.3) * 0.5 + 0.5) * 0.25
                    : 0.18;
                const h = Math.max(1, Math.round(wave * maxH));
                for (let y = 0; y < h; y++) {
                    for (let x = 0; x < bw; x++) px(x0 + b * (bw + gap) + x, base - y);
                }
            }
            /* the highest a bar can EVER reach — any text line sitting entirely
               above this never has to make room for the meter */
            return { x0, top: base - maxH };
        };

        let raf = 0;
        const tick = () => {
            raf = requestAnimationFrame(tick);
            if (!scene || !W) return;
            scene.fill(0);

            const elapsed = (() => { try { return elapsedRef.current() || 0; } catch { return 0; } })();
            const meter = drawMeter(elapsed);

            /* Three lines stacked with a one-pixel leading, clipped to the
               glass — the readout never spills, exactly like the shop's. Each
               line crawls on its own timing when it is too long to fit. */
            const textL = 2;
            const lineH = GLYPH_H + 1;
            const block = 3 * lineH - 1;
            const now = performance.now();
            let y = Math.max(1, Math.round((H - block) / 2));
            for (const line of rowsRef.current) {
                /* A line that clears the meter's tallest bar runs the FULL width
                   of the glass (Brendon, 2026-07-30) — only the lines the bars
                   can actually reach give up the right end. */
                const clears = y + GLYPH_H - 1 < meter.top;
                const textR = clears ? W - 2 : meter.x0 - 3;
                const widthPx = Math.max(0, line.length * GLYPH_ADVANCE - 1);
                drawText(line, textL + crawlOffset(widthPx, textR - textL, now), y, textL, textR);
                y += lineH;
            }

            /* ── paint ── */
            ctx.fillStyle = GLASS;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            /* the cell, minus a hair of gap — the dark grid between segments is
               what makes a matrix read as a matrix */
            const cell = Math.max(1, S - 0.35 * dpr);
            for (let yy = 0; yy < H; yy++) {
                for (let xx = 0; xx < W; xx++) {
                    ctx.fillStyle = scene[yy * W + xx] ? ON : OFF;
                    ctx.fillRect(xx * S, yy * S, cell, cell);
                }
            }
        };

        const ro = new ResizeObserver(resize);
        ro.observe(host);
        resize();
        raf = requestAnimationFrame(tick);
        return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    }, []);

    return (
        <div className="fm-lcd" ref={hostRef} aria-hidden="true">
            <canvas className="fm-lcd-canvas" ref={canvasRef} />
        </div>
    );
}
