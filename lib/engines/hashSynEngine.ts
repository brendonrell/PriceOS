'use client';

/*
 * hashSynEngine — F53 (BUG-18).
 *
 * Hash Synesthesia: sample colours from visible artwork canvases and
 * blend them into the UI accent. Sim refs:
 *   sim.html 12534-12559   hashSynSampleColor (centred 60x60 patch,
 *                          brightness 20-235 gate, max-min<25 skip)
 *   sim.html 12562-12565   hashSynToHex (3 channels, 2-char hex each)
 *   sim.html 12568-12592   resample (.edition-canvas pool, up to 10
 *                          samples, channel-mean blend)
 *   sim.html 12606-12610   scroll listener (debounced 400ms)
 *   sim.html 12614-12631   setTheme patch (seed + retry cascade)
 *
 * The engine is a module-singleton driven by a callback the consumer
 * registers via enableHashSyn(applyHex). When sampling produces a hex,
 * the engine calls applyHex — ThemeContext owns what that means
 * (typically: writes --bg-color / --text-color / --accent etc. via
 * applyBgHex). This separation keeps the engine free of React-context
 * coupling while letting ThemeContext control the actual var writes.
 *
 * No localStorage. No persistence. Sim 12617-12618 explicitly removes
 * `pd_settings_theme` when hashsyn activates because the theme needs
 * live canvases each session — refresh always boots back to Dot.
 *
 * Pause behaviour: the scroll listener is `passive: true` and the
 * resample bails when document.hidden — same as sim's implicit guard
 * (sim's hashSynResample doesn't bail on hidden but the canvases
 * aren't repainting either, so the result is the same). We bail
 * proactively so the timer cascade doesn't burn cycles in background
 * tabs.
 */

interface RGB {
    r: number;
    g: number;
    b: number;
}

let _onApplyHex: ((hex: string) => void) | null = null;
let _scrollHandler: (() => void) | null = null;
let _scrollDebounceId: ReturnType<typeof setTimeout> | null = null;
const _retryTimers: Array<ReturnType<typeof setTimeout>> = [];

/* Sim 12534-12559 — sample a centred 60x60 patch from a canvas, mean
   the non-near-gray non-near-extremes pixels. Returns null when the
   canvas is too small, the read fails, or fewer than 6 valid pixels
   pass the gates (sim 12558 `count > 5`). */
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
        // Sim 12549 strides by 16 (every 4th pixel) — fast and
        // statistically equivalent for a 60x60 patch.
        for (let i = 0; i < data.length; i += 16) {
            const pr = data[i], pg = data[i + 1], pb = data[i + 2];
            const brightness = (pr + pg + pb) / 3;
            if (brightness < 20 || brightness > 235) continue;
            const maxC = Math.max(pr, pg, pb);
            const minC = Math.min(pr, pg, pb);
            // Skip near-gray patches (sim 12555). PD's HSL placeholder
            // canvases are colour-saturated so the threshold catches
            // the mute / hammer overlays which are gray scrim.
            if (maxC - minC < 25) continue;
            r += pr; g += pg; b += pb; count++;
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
                ('0' +
                    Math.max(0, Math.min(255, v))
                        .toString(16)).slice(-2)
            )
            .join('')
    );
}

/* Sim 12568-12592 — pool .edition-canvas elements, prefer the .visible
   ones (BUILD 35 virtualizer adds the class on intersection), fall
   back to any with non-trivial width. Sample up to 10, average. */
function resample(): void {
    if (!_onApplyHex) return;
    if (typeof document === 'undefined') return;
    if (document.hidden) return;

    const all = Array.from(
        document.querySelectorAll<HTMLCanvasElement>('.edition-canvas')
    );
    let pool = all.filter(
        (c) => c.classList.contains('visible') && c.width > 4
    );
    if (pool.length === 0) {
        pool = all.filter((c) => c.width > 4);
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

/** Public — kick a manual resample. ThemeContext can call this if
 *  the user re-picks hashsyn while it's already active. */
export function hashSynResample(): void {
    resample();
}

/**
 * Register the apply callback and attach the scroll listener + retry
 * cascade. Sim 12624-12627 — retry sampling at 200/600/1200/2500ms
 * because the canvases need a moment to paint after activation.
 *
 * Calling enable while already enabled re-runs the retry cascade and
 * leaves the listener attached once. Idempotent.
 */
export function enableHashSyn(applyHex: (hex: string) => void): void {
    _onApplyHex = applyHex;

    if (typeof window === 'undefined') return;

    // Attach scroll listener once. The handler reads the current
    // _onApplyHex closure on every fire so flipping the callback or
    // disabling the engine takes effect immediately.
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

    // Retry cascade — sim 12624-12627. New cascade per enable() call;
    // any prior pending retries are cleared first so we don't pile up.
    _retryTimers.forEach((t) => clearTimeout(t));
    _retryTimers.length = 0;
    [200, 600, 1200, 2500].forEach((delay) => {
        const t = setTimeout(() => resample(), delay);
        _retryTimers.push(t);
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
    if (_scrollHandler && typeof window !== 'undefined') {
        window.removeEventListener('scroll', _scrollHandler);
        _scrollHandler = null;
    }
}
