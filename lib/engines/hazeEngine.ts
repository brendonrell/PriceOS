'use client';

/*
 * hazeEngine — Haze Mode variation engine.
 *
 * Four variations, all driven off a user-chosen base hex:
 *
 *   tint      — cycles the hue ±30° in 4 steps (analogous shift),
 *               applies immediately as a one-shot (no animation loop).
 *               Each call to enable() advances one step.
 *
 *   drift     — slowly rotates hue ±40° around the base over ~30s,
 *               looping. rAF-driven sine wave on hue offset.
 *
 *   pulse     — oscillates between base hex and a slightly lighter /
 *               more-saturated version on a ~4s sine cycle.
 *
 *   chromatic — full hue-wheel rotation locked to the base colour's
 *               saturation and lightness. One full revolution ~20s.
 *
 * All variations:
 *   - Accept the current base hex at enable() time.
 *   - Call the registered applyHex callback (ThemeContext.applyBgHex).
 *   - Stop cleanly via disable() — used when the user picks a
 *     different theme or switches variation.
 *   - Are stateless across sessions; ThemeContext re-enables on boot
 *     when haze is the saved theme and a variation is the saved variation.
 *
 * HSL helpers are local — no dependency on any colour library.
 */

type ApplyHex = (hex: string) => void;

// ── HSL ↔ RGB helpers ────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace('#', '');
    return [
        parseInt(h.substring(0, 2), 16),
        parseInt(h.substring(2, 4), 16),
        parseInt(h.substring(4, 6), 16),
    ];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h: number;
    switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        default: h = ((r - g) / d + 4) / 6;
    }
    return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
    h = ((h % 360) + 360) % 360;
    s = Math.max(0, Math.min(1, s));
    l = Math.max(0, Math.min(1, l));
    const hh = h / 360;
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const toC = (t: number) => {
        t = ((t % 1) + 1) % 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };
    const r = Math.round(toC(hh + 1 / 3) * 255);
    const g = Math.round(toC(hh) * 255);
    const bb = Math.round(toC(hh - 1 / 3) * 255);
    return (
        '#' +
        [r, g, bb]
            .map((v) => ('0' + Math.max(0, Math.min(255, v)).toString(16)).slice(-2))
            .join('')
    ).toUpperCase();
}

// ── Engine state ──────────────────────────────────────────────────────

let _applyHex: ApplyHex | null = null;
let _rafId: number | null = null;
let _tintStep = 0;

function stopLoop() {
    if (_rafId !== null) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
    }
}

// ── Tint ──────────────────────────────────────────────────────────────
// 4 analogous hue steps: base, +30°, +60°, −30°. Each enable() call
// advances one step and applies immediately (no loop).

const TINT_OFFSETS = [0, 30, 60, -30];

function enableTint(baseHex: string, applyHex: ApplyHex) {
    stopLoop();
    _applyHex = applyHex;
    const [r, g, b] = hexToRgb(baseHex);
    const [h, s, l] = rgbToHsl(r, g, b);
    _tintStep = (_tintStep + 1) % TINT_OFFSETS.length;
    applyHex(hslToHex(h + TINT_OFFSETS[_tintStep], s, l));
}

// ── Drift ─────────────────────────────────────────────────────────────
// Hue oscillates ±40° around base over ~30s via sine wave.

function enableDrift(baseHex: string, applyHex: ApplyHex) {
    stopLoop();
    _applyHex = applyHex;
    const [r, g, b] = hexToRgb(baseHex);
    const [h, s, l] = rgbToHsl(r, g, b);
    const start = performance.now();
    const PERIOD = 30000; // 30s full cycle

    const frame = (now: number) => {
        if (_applyHex !== applyHex) return;
        const t = ((now - start) % PERIOD) / PERIOD;
        const offset = Math.sin(t * Math.PI * 2) * 40;
        applyHex(hslToHex(h + offset, s, l));
        _rafId = requestAnimationFrame(frame);
    };
    _rafId = requestAnimationFrame(frame);
}

// ── Pulse ─────────────────────────────────────────────────────────────
// Lightness oscillates between base l and base l + 0.12 over ~4s.
// Saturation bumps slightly (+0.1) at peak.

function enablePulse(baseHex: string, applyHex: ApplyHex) {
    stopLoop();
    _applyHex = applyHex;
    const [r, g, b] = hexToRgb(baseHex);
    const [h, s, l] = rgbToHsl(r, g, b);
    const start = performance.now();
    const PERIOD = 4000; // 4s cycle

    const frame = (now: number) => {
        if (_applyHex !== applyHex) return;
        const t = ((now - start) % PERIOD) / PERIOD;
        const wave = (Math.sin(t * Math.PI * 2) + 1) / 2; // 0→1→0
        const lv = l + wave * 0.12;
        const sv = s + wave * 0.10;
        applyHex(hslToHex(h, sv, lv));
        _rafId = requestAnimationFrame(frame);
    };
    _rafId = requestAnimationFrame(frame);
}

// ── Chromatic ─────────────────────────────────────────────────────────
// Full hue rotation locked to base saturation + lightness. ~20s/rev.

function enableChromatic(baseHex: string, applyHex: ApplyHex) {
    stopLoop();
    _applyHex = applyHex;
    const [r, g, b] = hexToRgb(baseHex);
    const [, s, l] = rgbToHsl(r, g, b);
    const start = performance.now();
    const PERIOD = 20000; // 20s full revolution

    const frame = (now: number) => {
        if (_applyHex !== applyHex) return;
        const t = ((now - start) % PERIOD) / PERIOD;
        applyHex(hslToHex(t * 360, s, l));
        _rafId = requestAnimationFrame(frame);
    };
    _rafId = requestAnimationFrame(frame);
}

// ── Public API ────────────────────────────────────────────────────────

export type HazeVariation = 'tint' | 'drift' | 'pulse' | 'chromatic';

/**
 * Enable a variation. Safe to call while another is running —
 * stopLoop() tears down the previous rAF before starting the new one.
 * baseHex is the user's saved Haze colour (read from localStorage by
 * the caller — ThemeContext or ThemePicker).
 */
export function enableHazeVariation(
    variation: HazeVariation,
    baseHex: string,
    applyHex: ApplyHex
): void {
    _tintStep = 0; // reset tint step on any fresh enable
    switch (variation) {
        case 'tint':      enableTint(baseHex, applyHex);      break;
        case 'drift':     enableDrift(baseHex, applyHex);     break;
        case 'pulse':     enablePulse(baseHex, applyHex);     break;
        case 'chromatic': enableChromatic(baseHex, applyHex); break;
    }
}

/** Tear down any running variation and restore the base hex. */
export function disableHazeVariation(baseHex: string, applyHex: ApplyHex): void {
    stopLoop();
    _applyHex = null;
    _tintStep = 0;
    // Restore the base colour immediately.
    applyHex(baseHex);
}

/** True when a variation loop is currently running. */
export function hazeVariationActive(): boolean {
    return _rafId !== null;
}
