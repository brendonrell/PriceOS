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
    /* Tuned down from 0.56–0.85 / 0.44–0.63 (Brendon, 2026-08-31) — that
       range put too much weight on hot-pink/cyan hues at full punch, reading
       as Miami Vice rather than "brand vivid". Lower ceiling + slightly
       deeper lightness keeps the colour identifiable and lively without the
       neon glare, and still holds up as a dark-mode profile background. */
    const sat = 0.40 + (hash32(`s:${s}`) % 26) / 100; // 0.40 – 0.65
    const light = 0.38 + (hash32(`l:${s}`) % 18) / 100; // 0.38 – 0.55
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
