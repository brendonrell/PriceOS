/*
 * signatureHex — a user's HIDDEN "signature" colour.
 *
 * Every account carries a unique colour the user is never told about; it's
 * surfaced only inside the profile-name easter egg (ProfilePageBody) as their
 * own pill. The value is derived DETERMINISTICALLY from the wallet address, so
 * it's stable, unique-per-user, and needs no stored column / backfill — every
 * existing account already "has" one the first time the egg is opened.
 *
 * The address hashes into a vivid hue at a fixed pleasant saturation/lightness
 * so the colour reads well as a profile background and classifies cleanly into
 * one of the named colour buckets (lib/art/outputColor → classifyRgb) for the
 * pill's name.
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
 * The hidden signature hex for an account. Pins overridden handles; otherwise
 * derives a vivid, stable colour from the wallet address.
 */
export function signatureHexFor(address: string): string {
    const hue = hash32((address || '').toLowerCase()) % 360;
    return hslToHex(hue, 0.72, 0.52);
}
