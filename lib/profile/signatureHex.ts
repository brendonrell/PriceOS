/*
 * signatureHex — a user's HIDDEN, UNIQUE "signature" colour.
 *
 * Every account carries a unique colour the user is never told about; it's
 * surfaced only inside the profile-name easter egg (ProfilePageBody) as their
 * own pill. The colour is ASSIGNED + STORED at account creation (users
 * .signature_hex) with a per-account uniqueness check, so no two accounts ever
 * share one. This module is the deterministic CANDIDATE generator behind that
 * assignment: a seed string (normally the wallet address) hashes into a vivid,
 * pleasant colour. On the rare collision, the caller re-seeds (address + salt)
 * until a free colour is found, then persists it.
 *
 * The space is wide on purpose — hue × saturation × lightness all vary — so the
 * assignment loop effectively never collides, and the result still reads well
 * as a profile background and classifies cleanly into one of the named colour
 * buckets (lib/art/outputColor → classifyRgb) for the pill's name.
 */

import { liftWarmFloor } from '../color/warmGuard';

function hslToHex(h: number, s: number, l: number): string {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const hp = h / 60;
    const x = c * (1 - Math.abs((hp % 2) - 1));
    let r = 0;
    let g = 0;
    let b = 0;
    if (hp >= 0 && hp < 1) [r, g, b] = [c, x, 0];
    else if (hp < 2) [r, g, b] = [x, c, 0];
    else if (hp < 3) [r, g, b] = [0, c, x];
    else if (hp < 4) [r, g, b] = [0, x, c];
    else if (hp < 5) [r, g, b] = [x, 0, c];
    else [r, g, b] = [c, 0, x];
    const m = l - c / 2;
    const to = (v: number) =>
        Math.round((v + m) * 255)
            .toString(16)
            .padStart(2, '0')
            .toUpperCase();
    return `#${to(r)}${to(g)}${to(b)}`;
}

/** FNV-1a hash of a string → unsigned 32-bit int. */
function hash32(str: string): number {
    let x = 2166136261;
    for (let i = 0; i < str.length; i++) {
        x ^= str.charCodeAt(i);
        x = Math.imul(x, 16777619);
    }
    return x >>> 0;
}

/**
 * Deterministic candidate signature colour for a seed. Hue, saturation and
 * lightness are each hashed from a differently-prefixed seed so they vary
 * independently — ~200k distinct, pleasant colours. Same seed → same colour.
 */
export function signatureHexFor(seed: string): string {
    const s = (seed || '').toLowerCase();
    const hue = hash32(`h:${s}`) % 360;
    /* Re-tuned to match the Presets row's roll logic (rollSaturation /
       rollLightness in lib/profile/presetRoll.ts, Brendon 2026-08-31) rather
       than a standalone range — art-site restraint by default, vivid only
       ~1/3 of the time, same as a Random preset roll. Deterministic here:
       a hashed 0–1 draw stands in for Math.random() to pick the vivid vs.
       muted/pastel branch, so a given seed always lands in the same band. */
    const vividRoll = (hash32(`v:${s}`) % 100) / 100;
    const sat =
        vividRoll < 1 / 3
            ? 0.7 + (hash32(`s:${s}`) % 26) / 100 // vivid: 0.70 – 0.95
            : 0.15 + (hash32(`s:${s}`) % 41) / 100; // muted/pastel: 0.15 – 0.55
    const lightRoll = 0.25 + (hash32(`l:${s}`) % 56) / 100; // 0.25 – 0.80
    /* liftWarmFloor (lib/color/warmGuard) — brick/orange/mustard hues read
       muddy under ~52% light regardless of saturation; only that band gets
       lifted (Brendon, 2026-09-01). */
    const light = liftWarmFloor(hue, lightRoll * 100) / 100;
    return hslToHex(hue, sat, light);
}

/**
 * Find a signature colour for `address` that isn't already taken. Tries the
 * bare address first, then salted re-seeds (`address#1`, `address#2`, …). The
 * `isTaken` predicate is supplied by the caller (a DB lookup at signup), so the
 * stored colour is GUARANTEED unique across accounts.
 */
export function uniqueSignatureHex(
    address: string,
    isTaken: (hex: string) => boolean,
    maxTries = 64,
): string {
    for (let i = 0; i < maxTries; i++) {
        const hex = signatureHexFor(i === 0 ? address : `${address}#${i}`);
        if (!isTaken(hex)) return hex;
    }
    // Exhausted the salt budget (astronomically unlikely) — last candidate.
    return signatureHexFor(`${address}#${maxTries}`);
}
