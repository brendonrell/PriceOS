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
import { GLYPH_H, GLYPH_ADVANCE, glyphFor, wrapLines } from '../../lib/stickers/pixels';

/** CSS pixels per screen pixel — two, exactly as the shop's panel. */
const PX = 2;
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
}: {
    /** The three readout lines, top to bottom. */
    rows: [string, string, string];
    /** Sound actually advancing right now. */
    playing: boolean;
    /** The player's own clock, in seconds. Drives the meter. */
    getElapsed: () => number;
}) {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const rowsRef = useRef(rows);
    rowsRef.current = rows;
    const playingRef = useRef(playing);
    playingRef.current = playing;
    const elapsedRef = useRef(getElapsed);
    elapsedRef.current = getElapsed;

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

        const resize = () => {
            const r = host.getBoundingClientRect();
            const nw = Math.max(24, Math.floor(r.width / PX));
            const nh = Math.max(10, Math.floor(r.height / PX));
            if (nw === W && nh === H) return;
            W = nw; H = nh;
            canvas.width = W * PX;
            canvas.height = H * PX;
            canvas.style.width = `${W * PX}px`;
            canvas.style.height = `${H * PX}px`;
            scene = new Uint8Array(W * H);
        };

        const px = (x: number, y: number) => {
            if (x < 0 || y < 0 || x >= W || y >= H) return;
            scene![y * W + x] = 1;
        };

        const drawBitmap = (bmp: readonly string[], ox: number, oy: number) => {
            for (let r = 0; r < bmp.length; r++) {
                const row = bmp[r]!;
                for (let c = 0; c < row.length; c++) {
                    if (row[c] === '#') px(ox + c, oy + r);
                }
            }
        };

        const drawText = (text: string, ox: number, oy: number, limit: number) => {
            for (let i = 0; i < text.length && i < limit; i++) {
                drawBitmap(glyphFor(text[i]!), ox + i * GLYPH_ADVANCE, oy);
            }
        };

        /* The meter, right-aligned in the glass. Heights ride the player's real
           position; a still clock is a still meter. */
        const drawMeter = (elapsed: number) => {
            const bw = 2, gap = 1;
            const totalW = BARS * bw + (BARS - 1) * gap;
            const x0 = W - totalW - 1;
            const maxH = Math.min(11, H - 2);
            const base = H - 2;
            for (let b = 0; b < BARS; b++) {
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
            return x0;
        };

        let raf = 0;
        const tick = () => {
            raf = requestAnimationFrame(tick);
            if (!scene || !W) return;
            scene.fill(0);

            const elapsed = (() => { try { return elapsedRef.current() || 0; } catch { return 0; } })();
            const meterX = drawMeter(elapsed);

            /* Three lines stacked with a one-pixel leading, clipped to the
               glass — the readout never spills, exactly like the shop's. */
            const textW = meterX - 3;
            const cols = Math.max(4, Math.floor(textW / GLYPH_ADVANCE));
            const lineH = GLYPH_H + 1;
            const block = 3 * lineH - 1;
            let y = Math.max(1, Math.round((H - block) / 2));
            for (const line of rowsRef.current) {
                /* A line too long simply takes its first screenful — the rows
                   above already ticker their own text in the DOM. */
                const first = wrapLines(line, cols)[0] ?? '';
                drawText(first, 2, y, cols);
                y += lineH;
            }

            /* ── paint ── */
            ctx.fillStyle = GLASS;
            ctx.fillRect(0, 0, W * PX, H * PX);
            for (let yy = 0; yy < H; yy++) {
                for (let xx = 0; xx < W; xx++) {
                    ctx.fillStyle = scene[yy * W + xx] ? ON : OFF;
                    ctx.fillRect(xx * PX, yy * PX, PX - 0.35, PX - 0.35);
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
