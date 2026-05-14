'use client';

/*
 * hashSynEngine — port of sim.html 12534-12631 (Hash Synesthesia).
 *
 * The engine samples colours from visible artwork canvases and blends
 * them into the UI accent. ThemeContext owns the actual hex apply via
 * the callback registered through enableHashSyn(applyHex).
 *
 * Sim references:
 *   sim 12534-12559  hashSynSampleColor — centred 60×60 patch,
 *                    brightness 20-235 gate, max-min<25 near-gray skip,
 *                    needs count>5 valid pixels.
 *   sim 12562-12565  hashSynToHex — 2-char hex per channel.
 *   sim 12568-12592  hashSynResample — pool .output-canvas, prefer
 *                    .visible+width>4, fallback width>4, sample up to
 *                    10, channel-mean blend.
 *   sim 12606-12610  scroll listener, debounced 400ms.
 *   sim 12624-12627  retry cascade — 200/600/1200/2500ms after enable.
 *   sim 8230-8234    paint-notify — virtualizer debounces 300ms after
 *                    each new canvas paint + .visible flip.
 *
 * No viewport filter. Sim's pool is the first 10 .visible canvases in
 * DOM order, full stop. A prior fix added a getBoundingClientRect gate
 * above that filter — when the user picked Hashsyn before scrolling,
 * the in-viewport set could be smaller than the threshold and the
 * pool collapsed empty, so the engine never escaped the seed purple.
 * Reverted here.
 *
 * No localStorage. Sim 12617-12618 explicitly removes pd_settings_theme
 * when hashsyn activates — the theme needs live canvases each session.
 * That removal lives in ThemeContext.setTheme; the engine only handles
 * sampling.
 */

interface RGB {
    r: number;
    g: number;
    b: number;
}

let _onApplyHex: ((hex: string) => void) | null = null;
let _scrollHandler: (() => void) | null = null;
let _scrollDebounceId: ReturnType<typeof setTimeout> | null = null;
let _paintDebounceId: ReturnType<typeof setTimeout> | null = null;
const _retryTimers: Array<ReturnType<typeof setTimeout>> = [];

/* Sim 12534-12559. Centred 60×60 patch, stride-16 mean of pixels that
   pass the brightness (20–235) and saturation (max-min ≥ 25) gates. */
function hashSynSampleColor(canvas: HTMLCanvasElement): RGB | null {
    try {
        const cw = canvas.width || 0;
        const ch = canvas.height || 0;
        if (cw < 4 || ch < 4) return null;
        const ctx = canvas.getContext('2d');
        if (!ctx) return null;

        const sx = Math.max(0, Math.floor(cw / 2) - 30);
        const sy = Math.max(0, Math.floor(ch / 2) - 30);
        const sw = Math.min(60, cw - sx);
        const sh = Math.min(60, ch - sy);
        if (sw < 4 || sh < 4) return null;

        const imgData = ctx.getImageData(sx, sy, sw, sh);
        const data = imgData.data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 16) {
            const pr = data[i];
            const pg = data[i + 1];
            const pb = data[i + 2];
            const brightness = (pr + pg + pb) / 3;
            if (brightness < 20 || brightness > 235) continue;
            const maxC = Math.max(pr, pg, pb);
            const minC = Math.min(pr, pg, pb);
            if (maxC - minC < 25) continue;
            r += pr;
            g += pg;
            b += pb;
            count++;
        }
        if (count <= 5) return null;
        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count),
        };
    } catch {
        return null;
    }
}

/* Sim 12562-12565 — clamped 2-char hex per channel. */
function hashSynToHex(c: RGB): string {
    return (
        '#' +
        [c.r, c.g, c.b]
            .map((v) =>
                ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2)
            )
            .join('')
    );
}

/* Sim 12568-12592 — verbatim. Pool = .output-canvas. Prefer .visible
   with width>4; fall back to any with width>4. Sample first 10,
   channel-mean blend. */
function resample(): void {
    if (!_onApplyHex) return;
    if (typeof document === 'undefined') return;

    const canvases = Array.from(
        document.querySelectorAll<HTMLCanvasElement>('.output-canvas')
    );
    let pool = canvases.filter(
        (c) => c.classList.contains('visible') && c.width > 4
    );
    if (pool.length === 0) {
        pool = canvases.filter((c) => c.width > 4);
    }
    if (pool.length === 0) return;

    const subset = pool.slice(0, 10);
    const samples: RGB[] = [];
    subset.forEach((cvs) => {
        const col = hashSynSampleColor(cvs);
        if (col) samples.push(col);
    });
    if (samples.length === 0) return;

    let r = 0, g = 0, b = 0;
    samples.forEach((s) => {
        r += s.r;
        g += s.g;
        b += s.b;
    });
    const blended: RGB = {
        r: Math.round(r / samples.length),
        g: Math.round(g / samples.length),
        b: Math.round(b / samples.length),
    };
    _onApplyHex(hashSynToHex(blended));
}

/** Public — kick a manual resample. */
export function hashSynResample(): void {
    resample();
}

/**
 * Sim 8230-8234. Called by the canvas virtualizer after a new Output
 * canvas paints + flips .visible. Debounces 300ms then calls resample
 * so a flurry of paints during scroll triggers a single sample pass.
 *
 * No-op when the engine isn't enabled — resample() bails on the same
 * null check, but skipping the timer keeps scroll-time cost at zero
 * for users who never picked hashsyn.
 */
export function hashSynNotifyCanvasPaint(): void {
    if (!_onApplyHex) return;
    if (_paintDebounceId !== null) clearTimeout(_paintDebounceId);
    _paintDebounceId = setTimeout(() => {
        _paintDebounceId = null;
        resample();
    }, 300);
}

/**
 * Apply a hex directly through the registered callback — no canvas
 * sampling. Used for per-card pointer triggers (ArtworkCard hover/tap)
 * and, once ArtworkModal v0 lands, the modal-open lock (sim 8800:
 * openModal calls `_origSetTheme(data.palette.c1)` when hashsyn is the
 * current theme — deterministic, single-frame, zero gate failures on
 * near-gray or near-black canvases). The retry cascade and scroll +
 * paint-notify resamples still run; this is the per-token override
 * that gives hashsyn a reactive surface before the muddy channel-mean
 * locks the bg on static views (Showcase tab, short pages).
 *
 * No-op when the engine isn't enabled.
 */
export function hashSynApplyHex(hex: string): void {
    if (!_onApplyHex) return;
    _onApplyHex(hex);
}

/**
 * Register the apply callback, attach the scroll listener (once),
 * and run the retry cascade. Sim 12624-12627: retry sampling at
 * 200/600/1200/2500ms because canvases need a moment to paint after
 * activation. Idempotent — calling enable while already enabled
 * re-runs the cascade and leaves the listener attached once.
 */
export function enableHashSyn(applyHex: (hex: string) => void): void {
    _onApplyHex = applyHex;
    if (typeof window === 'undefined') return;

    if (!_scrollHandler) {
        _scrollHandler = () => {
            if (!_onApplyHex) return;
            if (_scrollDebounceId !== null) clearTimeout(_scrollDebounceId);
            _scrollDebounceId = setTimeout(() => {
                _scrollDebounceId = null;
                resample();
            }, 400);
        };
        window.addEventListener('scroll', _scrollHandler, { passive: true });
    }

    _retryTimers.forEach((t) => clearTimeout(t));
    _retryTimers.length = 0;
    [200, 600, 1200, 2500].forEach((delay) => {
        _retryTimers.push(setTimeout(() => resample(), delay));
    });
}

/** Tear down the engine — used when the user picks a different theme. */
export function disableHashSyn(): void {
    _onApplyHex = null;
    _retryTimers.forEach((t) => clearTimeout(t));
    _retryTimers.length = 0;
    if (_scrollDebounceId !== null) {
        clearTimeout(_scrollDebounceId);
        _scrollDebounceId = null;
    }
    if (_paintDebounceId !== null) {
        clearTimeout(_paintDebounceId);
        _paintDebounceId = null;
    }
    if (_scrollHandler && typeof window !== 'undefined') {
        window.removeEventListener('scroll', _scrollHandler);
        _scrollHandler = null;
    }
}
