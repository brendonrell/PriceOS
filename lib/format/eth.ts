/*
 * ETH price display rule (Brendon 2026-07-08): show 4 digits of the amount, with
 * the decimal point wherever it naturally falls — that's the level of detail.
 *   23.45 ETH · 234.6 ETH · .2234 ETH · 22.22 ETH
 * The leading "0." shows everywhere EXCEPT fiat mode (where it's stripped).
 */

/** Format an ETH amount to the 4-digit rule. Keeps the leading "0." (e.g. "0.2234"). */
export function formatEth(n: number): string {
    if (!isFinite(n) || n === 0) return '0';
    const abs = Math.abs(n);
    // 1000+ is already ≥4 integer digits — round to whole so we never spill past 4.
    if (abs >= 1000) return String(Math.round(n));
    // 4 significant figures floats the decimal to the right magnitude; toPrecision
    // pads trailing zeros (0.0022 → "0.002200"), so trim them back off.
    let s = n.toPrecision(4);
    if (s.includes('e')) s = n.toFixed(4);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
}

/** Drop the leading zero before the decimal — "0.2234" → ".2234" (fiat mode). */
export function stripLeadingZero(s: string): string {
    return s.replace(/^(-?)0\./, '$1.');
}

/** The 4-digit ETH amount, with the leading 0 stripped when `fiatMode`. */
export function formatEthAmount(n: number, fiatMode: boolean): string {
    const s = formatEth(n);
    return fiatMode ? stripLeadingZero(s) : s;
}
