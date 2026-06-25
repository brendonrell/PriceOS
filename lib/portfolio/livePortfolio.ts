/*
 * Live portfolio assembler (Brendon, 2026-06-25 — "make the portfolio real").
 *
 * Replaces the mock tree (lib/data/mockPortfolio) with a wallet's REAL holdings,
 * shaped into the exact same PortfolioCategory[] the view renders:
 *   - LONG-FORM: the wallet's collected pieces, grouped artist → project →
 *     pieces, valued at each project's LIVE FLOOR, or the MINT PRICE until a
 *     floor exists (Brendon: use mint price for now).
 *   - STICKER: empty — there are no sticker-collectible holdings in the data yet.
 *   - ENS: detects a `*.pricediscussion.eth` name on the wallet's account. Empty
 *     for everyone today; the moment someone registers one it shows (price 0
 *     until a sale price exists).
 *
 * Shadow tab has no real dataset, so the view passes an empty set for it.
 */

import { getProject } from '../project/registry';
import {
    projectMarketStat,
    projectAvg10Eth,
    projectAthEth,
} from '../market/starredMarket';
import type {
    PortfolioCategory,
    PortfolioArtist,
    PortfolioEnsName,
} from '../data/mockPortfolio';

export interface PortfolioHolding {
    slug: string;
    token_id: number;
}

/* The $-button cycle (Brendon 2026-06-25): floor → last sold → 10-sale avg →
   ATH (for fun) → mint → off. Each mode re-values every piece. 'off' hides
   values in the view; we still value the tree at floor underneath. floor/last
   come from the (seeded-until-live) market module, avg10/ATH are for-fun
   stand-ins, mint is the real registry price. */
export type PortfolioValueMode = 'floor' | 'last' | 'avg10' | 'ath' | 'mint' | 'off';

function mintEth(slug: string): number {
    return getProject(slug)?.mintPriceEth ?? 0;
}

/** Value per piece for the active $-mode. floor/last fall back to mint price
    until a real floor exists (Brendon — mint stands in for now). */
function pieceValue(slug: string, mode: PortfolioValueMode): number {
    switch (mode) {
        case 'last': {
            const last = parseFloat(projectMarketStat(slug).lastSale);
            return Number.isFinite(last) && last > 0 ? last : mintEth(slug);
        }
        case 'avg10':
            return projectAvg10Eth(slug);
        case 'ath':
            return projectAthEth(slug);
        case 'mint':
            return mintEth(slug);
        case 'floor':
        case 'off':
        default: {
            const floor = parseFloat(projectMarketStat(slug).floor);
            return Number.isFinite(floor) && floor > 0 ? floor : mintEth(slug);
        }
    }
}

const PD_ENS_RE = /\.pricediscussion\.eth$/i;

/** Build the live LONG-FORM / STICKER / ENS tree from real holdings + ENS name. */
export function buildLivePortfolio(
    holdings: PortfolioHolding[],
    ensName: string | null | undefined,
    mode: PortfolioValueMode = 'floor',
): PortfolioCategory[] {
    // Group holdings: artist handle → project slug → token ids.
    const byArtist = new Map<string, Map<string, number[]>>();
    for (const h of holdings) {
        const proj = getProject(h.slug);
        if (!proj) continue; // unknown slug — skip, never crash the panel
        const artist = '@' + proj.artistHandle;
        let projs = byArtist.get(artist);
        if (!projs) { projs = new Map(); byArtist.set(artist, projs); }
        const toks = projs.get(h.slug) ?? [];
        toks.push(h.token_id);
        projs.set(h.slug, toks);
    }

    const artists: PortfolioArtist[] = [...byArtist.entries()]
        .map(([name, projs]) => ({
            name,
            projects: [...projs.entries()]
                .map(([slug, tokens]) => ({
                    name: getProject(slug)?.displayName ?? slug,
                    floor: pieceValue(slug, mode),
                    tokens: [...tokens].sort((a, b) => a - b),
                }))
                .sort((a, b) => a.name.localeCompare(b.name)),
        }))
        .sort((a, b) => a.name.localeCompare(b.name));

    const ensNames: PortfolioEnsName[] =
        ensName && PD_ENS_RE.test(ensName.trim())
            ? [{ label: ensName.trim().toLowerCase(), price: 0 }]
            : [];

    return [
        { name: 'LONG-FORM', type: 'tree', artists },
        { name: 'STICKER', type: 'tree', artists: [] },
        { name: 'ENS', type: 'flat', names: ensNames },
    ];
}

/** An empty tree set — used for the Shadow tab (no real shadow dataset yet). */
export function emptyPortfolio(): PortfolioCategory[] {
    return [
        { name: 'LONG-FORM', type: 'tree', artists: [] },
        { name: 'STICKER', type: 'tree', artists: [] },
        { name: 'ENS', type: 'flat', names: [] },
    ];
}

/** Σ value of a category list — tree: Σ floor × pieces; flat: Σ price. */
export function sumPortfolioCats(cats: PortfolioCategory[]): number {
    let total = 0;
    for (const cat of cats) {
        if (cat.type === 'tree') {
            for (const a of cat.artists)
                for (const p of a.projects) total += p.floor * p.tokens.length;
        } else {
            for (const n of cat.names) total += n.price;
        }
    }
    return total;
}
