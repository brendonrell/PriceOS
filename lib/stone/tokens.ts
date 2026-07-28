/*
 * THE TOKEN REGISTRY — the Command Stone's coin vocabulary (Brendon,
 * 2026-07-28: "$PRICE … rich card token prices with logos and even trend
 * cards … show if the user holds it").
 *
 * Each entry is castable by `$symbol` (plus its extra words) and deals a
 * rich card: live price with fiat beside, trend, logo, and the YOU HOLD
 * row for the signed-in wallet. Prices ride DEXScreener's free public API
 * through our own route ($0); a token with no pool reads $0.00 honestly —
 * that is $PRICE until the pool exists, by design.
 *
 * Adding a coin is ONE entry here. Never guess an address: a wrong pin
 * shows a wrong price, which is worse than absence.
 */

export interface TokenDef {
    symbol: string;
    /** Castable words, exact (the summon discipline). `$symbol` always works. */
    words: readonly string[];
    name: string;
    /** DEXScreener chainId the price pair must sit on. */
    chain: 'ethereum' | 'base';
    /** ERC-20 address, or null for native ETH (priced via wrapped ETH). */
    address: `0x${string}` | null;
    decimals: number;
    /** House logo: the ‰ mark or the ◊ ETH lozenge; null → the pair's own image. */
    logo: 'permille' | 'eth' | null;
    /** Card footnote when it matters. */
    note?: string;
}

/** Wrapped ETH — the pricing proxy for native ETH. */
export const WETH_ADDRESS = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2' as const;

export const TOKENS: readonly TokenDef[] = [
    {
        symbol: 'ETH',
        words: ['$eth', 'eth price', 'price of eth'],
        name: 'Ether',
        chain: 'ethereum',
        address: null,
        decimals: 18,
        logo: 'eth',
    },
    {
        symbol: 'PRICE',
        words: ['$price', 'price token', '$price token', 'price of $price'],
        name: '$PRICE — the PD token',
        chain: 'ethereum',
        /* DEPLOYED to mainnet 2026-07-03 (CLAUDE.md §2 · docs/price-token). */
        address: '0x173a012c7c8ca3cfb531dcad84a40c53dbe74638',
        decimals: 18,
        logo: 'permille',
        note: 'No pool yet — $0 by construction, not by failure.',
    },
    {
        symbol: 'FWA',
        words: ['$fwa'],
        name: 'FWA',
        chain: 'ethereum',
        /* The only Ethereum FWA pool on the aggregator (~$880k liquidity),
           pinned 2026-07-28 — flagged for Brendon's confirm in the ship note. */
        address: '0xa0Df17B5Ac76ABaBA36E1450E2cbCd18A620C845',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'FXH',
        words: ['$fxh', 'fxhash token'],
        name: 'fxhash',
        chain: 'base',
        /* Brendon's call 2026-07-28: "show the dust on Base" — verified the
           real one (official fxhash.xyz sites attached, ~$31k fdv). */
        address: '0x5Fc2843838e65eb0B5d33654628F446d54602791',
        decimals: 18,
        logo: null,
    },
    /* ── the TokenWorks strategy family (Brendon, 2026-07-28) ── */
    {
        symbol: 'PNKSTR',
        words: ['$pnkstr', 'punkstrategy'],
        name: 'PunkStrategy',
        chain: 'ethereum',
        /* The CANONICAL PunkStrategy — oldest pool, ten venues, real 24h
           volume, punkstrategy.fun attached. Two higher-"liquidity"
           clones with ZERO volume exist; they are fakes — never repin. */
        address: '0xc50673EDb3A7b94E8CAD8a7d4E0cD68864E33eDF',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'APESTR',
        words: ['$apestr', 'apestrategy'],
        name: 'ApeStrategy',
        chain: 'ethereum',
        /* nftstrategy.fun (the TokenWorks umbrella) attached — verified. */
        address: '0x9EbF91b8D6fF68aA05545301A3D0984EaEE54A03',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'CHKSTR',
        words: ['$chkstr', 'checkstrategy'],
        name: 'CheckStrategy',
        chain: 'ethereum',
        address: '0x2090Dc81F42f6ddD8dEaCE0D3C3339017417b0Dc',
        decimals: 18,
        logo: null,
    },
    /* More family members are one entry each — pin by address only, and
       check volume + official site first: the PNKSTR fake-clone lesson. */
];

function norm(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Exact-word token match — `$symbol` always, plus each entry's words. */
export function matchToken(line: string): TokenDef | null {
    const q = norm(line);
    if (!q) return null;
    for (const t of TOKENS) {
        if (q === `$${t.symbol.toLowerCase()}` || t.words.includes(q)) return t;
    }
    return null;
}
