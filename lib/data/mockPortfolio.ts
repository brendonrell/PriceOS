/*
 * Mock Portfolio — sim line 10770-10846 ported.
 *
 * Two tabs (portfolio = "Main", shadow = "Shadow"). Each tab has three
 * sections: LONG-FORM (tree of artist → projects → outputs), STICKER
 * (same tree shape), ENS (flat list of pricediscussion.eth subdomain
 * names).
 *
 * Floors are hardcoded; in production these come from the indexer. Token
 * arrays are the pre-image of every owned edition number under that
 * project — sim renders one row per token id when the project is
 * expanded.
 *
 * 2026-05 nomenclature note: the ENS subdomain tier is rooted at
 * pricediscussion.eth (PD owns this name). The earlier sim copy
 * referred to a $PRICE.eth root which was never registered to PD;
 * pricediscussion.eth is the live root going forward.
 */

export interface PortfolioTokenRef {
    /** Edition / token id, e.g. 56 for Chromie #56. */
    id: number;
}

export interface PortfolioProject {
    name: string;
    /** Floor in ETH at moment of mock generation. */
    floor: number;
    /** Tokens this wallet holds in the project. */
    tokens: number[];
}

export interface PortfolioArtist {
    name: string;
    projects: PortfolioProject[];
}

export interface PortfolioEnsName {
    label: string;
    /** Listed price for this ENS subdomain in ETH (PD's pricediscussion.eth tier). */
    price: number;
}

export type PortfolioCategory =
    | { name: 'LONG-FORM'; type: 'tree'; artists: PortfolioArtist[] }
    | { name: 'STICKER';   type: 'tree'; artists: PortfolioArtist[] }
    | { name: 'ENS';       type: 'flat'; names: PortfolioEnsName[] };

export type PortfolioTab = 'portfolio' | 'shadow';

export const PORTFOLIO_DATA: Record<PortfolioTab, PortfolioCategory[]> = {
    portfolio: [
        {
            name: 'LONG-FORM', type: 'tree',
            artists: [
                { name: '@claude',       projects: [
                    { name: 'Strata',              floor: 0.015, tokens: [1, 2, 3, 22, 67, 112, 158, 201] },
                ]},
                { name: '@snowfro',      projects: [
                    { name: 'Chromie Squiggles',   floor: 12.0,  tokens: [56] },
                ]},
                { name: '@piterpasma',   projects: [
                    { name: 'Dutchtide',           floor: 1.8,   tokens: [47] },
                ]},
                { name: '@xcopy',        projects: [
                    { name: 'MAX PAIN',            floor: 4.2,   tokens: [1042] },
                ]},
                { name: '@tylerxhobbs',  projects: [
                    { name: 'Fidenza',             floor: 58.0,  tokens: [313] },
                ]},
            ],
        },
        {
            name: 'STICKER', type: 'tree',
            artists: [
                { name: '@claude',       projects: [
                    { name: 'Kiki',                floor: 0.022, tokens: [22, 147, 203] },
                ]},
                { name: '@jackbutcher',  projects: [
                    { name: 'Checks',              floor: 0.18,  tokens: [4721, 5102] },
                ]},
            ],
        },
        {
            // Sim line 10808 ported. Root domain updated from $PRICE.eth
            // (unregistered) to pricediscussion.eth (PD-owned).
            name: 'ENS', type: 'flat',
            names: [
                { label: 'brendon.pricediscussion.eth',     price: 0.85 },
                { label: 'brendonrell.pricediscussion.eth', price: 0.42 },
                { label: 'pd.pricediscussion.eth',          price: 2.10 },
            ],
        },
    ],
    shadow: [
        {
            name: 'LONG-FORM', type: 'tree',
            artists: [
                { name: '@dmitricherniak', projects: [
                    { name: 'Ringers',             floor: 48.0,  tokens: [172, 545] },
                ]},
                { name: '@matto',          projects: [
                    { name: 'Autoglyphs',          floor: 310.0, tokens: [202] },
                ]},
                { name: '@kjetilgolid',    projects: [
                    { name: 'Archetype',           floor: 3.1,   tokens: [88, 216] },
                ]},
            ],
        },
        {
            name: 'STICKER', type: 'tree',
            artists: [
                { name: '@xcopy',          projects: [
                    { name: 'Grifters',            floor: 0.35,  tokens: [6600, 7777] },
                ]},
            ],
        },
        {
            name: 'ENS', type: 'flat',
            names: [
                { label: 'snowfro.pricediscussion.eth',     price: 1.25 },
                { label: 'opus.pricediscussion.eth',        price: 0.95 },
            ],
        },
    ],
};

/**
 * Sum the estimated value of a tab's holdings:
 *   tree   → Σ (floor × tokens.length) over every project
 *   flat   → Σ price over every name
 */
export function sumPortfolioValue(tab: PortfolioTab): number {
    let total = 0;
    for (const cat of PORTFOLIO_DATA[tab]) {
        if (cat.type === 'tree') {
            for (const artist of cat.artists) {
                for (const col of artist.projects) {
                    total += col.floor * col.tokens.length;
                }
            }
        } else {
            for (const n of cat.names) total += n.price;
        }
    }
    return total;
}
