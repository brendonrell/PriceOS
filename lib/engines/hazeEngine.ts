'use client';

/*
 * hazeEngine — Haze Mode variation engine.
 *
 * Five states. Pure is the default/resting state (no animation loop).
 * Cycle order: pure → tint → drift → pulse → chromatic → pure → ...
 *
 *   pure      — resting state. Restores base hex, stops any loop.
 *   tint      — one-shot analogous hue shift ±30° (4 steps).
 *   drift     — hue oscillates ±40° around base, ~30s sine loop.
 *   pulse     — lightness/saturation breathes, ~4s sine loop.
 *   chromatic — full hue-wheel rotation at base S+L, ~20s/rev loop.
 *
 * YIQ lock (tint/drift/pulse/chromatic only):
 *   On enable(), snapshot --text-color into data-haze-text on <html>.
 *   applyBgHex() reads this when key==='haze' to skip YIQ recalculation,
 *   preventing buttons flipping black↔white during animation.
 *   Cleared on disableHazeVariation() and when entering pure state.
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

// ── YIQ lock ──────────────────────────────────────────────────────────

function snapshotTextColor(): void {
    if (typeof document === 'undefined') return;
    const current = getComputedStyle(document.documentElement)
        .getPropertyValue('--text-color').trim();
    if (current) document.documentElement.dataset.hazeText = current;
}

function releaseTextColorLock(): void {
    if (typeof document !== 'undefined')
        delete document.documentElement.dataset.hazeText;
}

// ── Engine state ──────────────────────────────────────────────────────

let _applyHex: ApplyHex | null = null;
let _rafId: number | null = null;
let _tintStep = 0;

function stopLoop(): void {
    if (_rafId !== null) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
    }
}

// ── Pure ──────────────────────────────────────────────────────────────

function enablePure(baseHex: string, applyHex: ApplyHex): void {
    stopLoop();
    _applyHex = null;
    releaseTextColorLock();
    applyHex(baseHex);
}

// ── Tint ──────────────────────────────────────────────────────────────

const TINT_OFFSETS = [0, 30, 60, -30];

function enableTint(baseHex: string, applyHex: ApplyHex): void {
    stopLoop();
    _applyHex = applyHex;
    const [r, g, b] = hexToRgb(baseHex);
    const [h, s, l] = rgbToHsl(r, g, b);
    _tintStep = (_tintStep + 1) % TINT_OFFSETS.length;
    applyHex(hslToHex(h + TINT_OFFSETS[_tintStep], s, l));
}

// ── Drift ─────────────────────────────────────────────────────────────

function enableDrift(baseHex: string, applyHex: ApplyHex): void {
    stopLoop();
    _applyHex = applyHex;
    const [r, g, b] = hexToRgb(baseHex);
    const [h, s, l] = rgbToHsl(r, g, b);
    const start = performance.now();
    const PERIOD = 30000;
    const frame = (now: number) => {
        if (_applyHex !== applyHex) return;
        const t = ((now - start) % PERIOD) / PERIOD;
        applyHex(hslToHex(h + Math.sin(t * Math.PI * 2) * 40, s, l));
        _rafId = requestAnimationFrame(frame);
    };
    _rafId = requestAnimationFrame(frame);
}

// ── Pulse ─────────────────────────────────────────────────────────────

function enablePulse(baseHex: string, applyHex: ApplyHex): void {
    stopLoop();
    _applyHex = applyHex;
    const [r, g, b] = hexToRgb(baseHex);
    const [h, s, l] = rgbToHsl(r, g, b);
    const start = performance.now();
    const PERIOD = 4000;
    const frame = (now: number) => {
        if (_applyHex !== applyHex) return;
        const t = ((now - start) % PERIOD) / PERIOD;
        const wave = (Math.sin(t * Math.PI * 2) + 1) / 2;
        applyHex(hslToHex(h, s + wave * 0.10, l + wave * 0.12));
        _rafId = requestAnimationFrame(frame);
    };
    _rafId = requestAnimationFrame(frame);
}

// ── Chromatic ─────────────────────────────────────────────────────────

function enableChromatic(baseHex: string, applyHex: ApplyHex): void {
    stopLoop();
    _applyHex = applyHex;
    const [r, g, b] = hexToRgb(baseHex);
    const [, s, l] = rgbToHsl(r, g, b);
    const start = performance.now();
    const PERIOD = 20000;
    const frame = (now: number) => {
        if (_applyHex !== applyHex) return;
        const t = ((now - start) % PERIOD) / PERIOD;
        applyHex(hslToHex(t * 360, s, l));
        _rafId = requestAnimationFrame(frame);
    };
    _rafId = requestAnimationFrame(frame);
}

// ── Public API ────────────────────────────────────────────────────────

export type HazeVariation = 'pure' | 'tint' | 'drift' | 'pulse' | 'chromatic';

export function enableHazeVariation(
    variation: HazeVariation,
    baseHex: string,
    applyHex: ApplyHex
): void {
    if (variation !== 'pure') snapshotTextColor();
    _tintStep = 0;
    switch (variation) {
        case 'pure':      enablePure(baseHex, applyHex);      break;
        case 'tint':      enableTint(baseHex, applyHex);      break;
        case 'drift':     enableDrift(baseHex, applyHex);     break;
        case 'pulse':     enablePulse(baseHex, applyHex);     break;
        case 'chromatic': enableChromatic(baseHex, applyHex); break;
    }
}

export function disableHazeVariation(baseHex: string, applyHex: ApplyHex): void {
    stopLoop();
    _applyHex = null;
    _tintStep = 0;
    releaseTextColorLock();
    applyHex(baseHex);
}
