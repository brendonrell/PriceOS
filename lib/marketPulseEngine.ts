'use client';

/*
 * marketPulseEngine — Market Pulse Colorway.
 *
 * Same breathing math as hazeEngine's `pulse` variation (lightness/
 * saturation sine, no hue shift — "not red/green, a lighter/darker version
 * of whatever color happens to be there"), but:
 *   1. NOT gated to Haze colorway — runs on top of whatever colorway/hex
 *      is currently active. Caller supplies baseHex + a narrow bg-only
 *      writer (see applyMarketPulseSample in ColorwayContext) so it never
 *      touches button/pill polarity for the active colorway.
 *   2. Speed + amplitude scale with a 0..1 `activity` score (recent market
 *      event volume) — livelier market, slightly livelier pulse. Both ends
 *      of the range are deliberately subtle (Brendon: "tasteful... doesn't
 *      distract... can legit be used in the bg while browsing normally").
 *
 * Marketplace-page-only by convention of the caller (MarketplacePageBody);
 * this module has no page awareness of its own.
 */

import { hexToRgb, rgbToHsl, hslToHex } from './hazeEngine';

type ApplyHex = (hex: string) => void;

// Quiet market → slow + faint. Busy market → a touch quicker + a touch
// deeper. Both ends stay well inside hazeEngine's own pulse range
// (0.10 sat / 0.12 light at its most extreme) so this reads calmer.
const PERIOD_QUIET_MS = 5200;
const PERIOD_BUSY_MS = 2800;
const SAT_QUIET = 0.045;
const SAT_BUSY = 0.085;
const LIGHT_QUIET = 0.055;
const LIGHT_BUSY = 0.095;

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.max(0, Math.min(1, t));

let _rafId: number | null = null;
let _applyHex: ApplyHex | null = null;
let _lastHex: string | null = null;

function stop(): void {
    if (_rafId !== null) {
        cancelAnimationFrame(_rafId);
        _rafId = null;
    }
    _lastHex = null;
}

/** Start (or retune) the market pulse loop around `baseHex`. Safe to call
 *  again with a fresh baseHex/activity — restarts cleanly. */
export function enableMarketPulse(activity: number, baseHex: string, applyHex: ApplyHex): void {
    stop();
    _applyHex = applyHex;
    const [r, g, b] = hexToRgb(baseHex);
    const [h, s, l] = rgbToHsl(r, g, b);
    const period = lerp(PERIOD_QUIET_MS, PERIOD_BUSY_MS, activity);
    const satAmp = lerp(SAT_QUIET, SAT_BUSY, activity);
    const lightAmp = lerp(LIGHT_QUIET, LIGHT_BUSY, activity);
    const start = performance.now();
    const frame = (now: number) => {
        if (_applyHex !== applyHex) return;
        const t = ((now - start) % period) / period;
        const wave = (Math.sin(t * Math.PI * 2) + 1) / 2;
        const hex = hslToHex(h, s + wave * satAmp, l + wave * lightAmp);
        if (hex !== _lastHex) {
            _lastHex = hex;
            applyHex(hex);
        }
        _rafId = requestAnimationFrame(frame);
    };
    _rafId = requestAnimationFrame(frame);
}

/** Stop the loop and restore the flat base color. */
export function disableMarketPulse(baseHex: string, applyHex: ApplyHex): void {
    stop();
    _applyHex = null;
    applyHex(baseHex);
}
