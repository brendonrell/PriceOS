/*
 * starredMarket — placeholder market readouts for Starred rows.
 *
 * Brendon's call (2026-06-19): wire FLOOR + LAST SALE (traits, projects) now as
 * a DUMMY but with the real shape, so when the live secondary market + fake-
 * listing land we swap the body of these fns for indexer/Supabase reads and
 * every Starred row lights up unchanged. LAST SALE includes the primary mint,
 * so it's never empty — every project/trait has at least its mint behind it.
 *
 * Values are deterministic from a string seed (so a given trait/project always
 * shows the same numbers — no flicker, reads like real data) and anchored to
 * the project's mint price so they're in a believable range. These are NOT real
 * prices; the only contract that matters is the return shape.
 *
 * Output listing/price is NOT faked here — it reads the live ProjectContext via
 * useOutputMeta in the row, so the moment fake-listing ships those rows light up
 * for real with zero change.
 */

import { getProject } from '../project/registry';

/* FNV-1a → stable float in [0,1) from any string. */
function seedFloat(seed: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < seed.length; i++) {
        h ^= seed.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return ((h >>> 0) % 100000) / 100000;
}

/** Format an ETH amount the same way listed prices read elsewhere. */
function eth(v: number): string {
    return `${v.toFixed(v < 1 ? 3 : 2)} ETH`;
}

export interface MarketStat {
    /** Floor ask, formatted ("0.180 ETH"). */
    floor: string;
    /** Last sale (incl. primary mint), formatted. */
    lastSale: string;
}

/* Anchor floor/last to the project's mint price so the numbers feel native to
   each collection (a 0.02 mint floors low; a 0.25 mint floors high). */
function statFromAnchor(seed: string, mintEth: number): MarketStat {
    const base = mintEth > 0 ? mintEth : 0.05;
    const floor = base * (0.7 + seedFloat(seed + '|f') * 1.1);          // ~0.7×–1.8× mint
    const lastSale = floor * (0.85 + seedFloat(seed + '|l') * 1.3);     // around floor
    return { floor: eth(floor), lastSale: eth(lastSale) };
}

/** Dummy floor + last sale for a starred trait (project · category · value). */
export function traitMarketStat(slug: string, category: string, value: string): MarketStat {
    const mint = getProject(slug)?.mintPriceEth ?? 0.05;
    return statFromAnchor(`${slug}|${category}|${value}`, mint);
}

/** Dummy floor + last sale for a starred project. */
export function projectMarketStat(slug: string): MarketStat {
    const mint = getProject(slug)?.mintPriceEth ?? 0.05;
    return statFromAnchor(`project|${slug}`, mint);
}

/* ── Artist colour ───────────────────────────────────────────────────────────
   Brendon's spec: colour the artist tile by the artist's LIVE colorway, else
   their Generative Colorway from their DB row. We don't have a handle→address
   resolver on this surface yet, so derive a stable hue from the handle as the
   stand-in (swap for signature_hex once a lookup exists). Deterministic, so an
   artist keeps the same colour everywhere. */
export function artistColor(handle: string): string {
    const h = handle.replace(/^@/, '').toLowerCase();
    const hue = Math.floor(seedFloat('artist|' + h) * 360);
    return `hsl(${hue}, 70%, 60%)`;
}
