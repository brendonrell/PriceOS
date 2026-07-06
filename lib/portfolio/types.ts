/*
 * Portfolio render-tree shapes — shared by the live assembler
 * (lib/portfolio/livePortfolio) and the PortfolioView renderer.
 *
 * Extracted 2026-07-06 from lib/data/mockPortfolio (deleted): the mock tree
 * was superseded by the live assembler 2026-06-25; only these types were
 * still in use.
 *
 * Two tabs (portfolio = "Main", shadow = "Shadow"). Each tab has three
 * sections: LONG-FORM (tree of artist -> projects -> outputs), STICKER
 * (same tree shape), ENS (flat list of pricediscussion.eth subdomain names).
 */

export interface PortfolioProject {
    name: string;
    /** Floor in ETH (live assembler: mint price until the indexer floors land). */
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
