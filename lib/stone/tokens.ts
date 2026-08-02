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
    /* ── the fxhash ARTCOIN family (Brendon, 2026-08-02) ──
       Every tracked artcoin from the fx-artcoin-feed master list (the
       PD_FEEDS_fx-artcoin-feed Pools sheet — the sheet is the source of
       truth for WHICH coins; IGNORE rows excluded). Addresses are the
       sheet's pinned Base token contracts, never guessed. All price on
       Base like $FXH above; the card wears each pair's own image.
       Summon = $symbol (the automatic form) — extra words are Brendon's
       to add. New artcoins land in the sheet first, then one entry here. */
    {
        symbol: '1AB',
        words: [],
        name: '1AB',
        chain: 'base',
        address: '0x0c81ef098423ea882f2db86b455a1542c6877ce7',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'agora',
        words: [],
        name: 'agora',
        chain: 'base',
        address: '0x78982a3e58e4e5df431a8b170229eb90148fcbec',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'BS',
        words: [],
        name: 'BS',
        chain: 'base',
        address: '0x5d32c0373f84e12321ed1bd44dc0c0060d69e20a',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'BZOR',
        words: [],
        name: 'BZOR',
        chain: 'base',
        address: '0xedcc96e8abbcb9ca3fc934086c5012327e86677c',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'ciphrd',
        words: [],
        name: 'ciphrd',
        chain: 'base',
        address: '0x0e903c3bbf5ed7179b7d1da391a3ceea303134e0',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'DIST',
        words: [],
        name: 'DIST',
        chain: 'base',
        address: '0x41b9fe106b298d5d57420461576f1d51c74f0674',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'DMT',
        words: [],
        name: 'DMT',
        chain: 'base',
        address: '0x6aa6a493fb1ec1eb2d81cfdfe9210ae271a58589',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'DNA',
        words: [],
        name: 'DNA',
        chain: 'base',
        address: '0x9848015eee253e5efd36e5069c335ad05ee7a3ef',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'EBOY',
        words: [],
        name: 'EBOY',
        chain: 'base',
        address: '0xf9bc1e5bf79bbf09c940afc063ed563b0f4a3c95',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'EMA',
        words: [],
        name: 'EMA',
        chain: 'base',
        address: '0xbbdd6e2adb906de1876bddb96166ff3ad5509826',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'FUCKYEA',
        words: [],
        name: 'FUCKYEA',
        chain: 'base',
        address: '0x4fca6239315641cd82aee526def1077d36b3f473',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'fvckbtc',
        words: [],
        name: 'fvckbtc',
        chain: 'base',
        address: '0xd48f88917b74c3fd739259c9a3964ab1f02787b8',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'GALO',
        words: [],
        name: 'GALO',
        chain: 'base',
        address: '0xea3b0233d176d03d1484d75f46fe0fa611f4b07c',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'GR€€D',
        words: [],
        name: 'GR€€D',
        chain: 'base',
        address: '0xb5b08d1e4353ab149c753cba79ed7930ecb4ed84',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'luanotx',
        words: [],
        name: 'luanotx',
        chain: 'base',
        address: '0xd3640d22823af39ab0ac1a24c45b678752a09097',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'UNIK',
        words: [],
        name: 'UNIK',
        chain: 'base',
        address: '0x8135dadf29cb4ea4a397ba5ae57dafa8df12f71f',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'WANDERER',
        words: [],
        name: 'WANDERER',
        chain: 'base',
        address: '0xf5fe61a0bcc4c9f27c5ec9cd9ffff44cb18d4118',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'idart',
        words: [],
        name: 'idart',
        chain: 'base',
        address: '0x088e1330bc0982b61c8c6620d5718c05e4eac0c0',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'lomz',
        words: [],
        name: 'lomz',
        chain: 'base',
        address: '0x4a66297805369fc03fff4400dee3e3cda7174502',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'ððððð',
        words: [],
        name: 'ððððð',
        chain: 'base',
        address: '0x64bb9a1487ce7e649d617e1fcbb28eb76a87356d',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'monocoin',
        words: [],
        name: 'monocoin',
        chain: 'base',
        address: '0x01fd26d06b98903bffd768bd7c8e2527ded476e7',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'nekro',
        words: [],
        name: 'nekro',
        chain: 'base',
        address: '0x8df25b857466829dea719eef51e274527801ddad',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'OZK',
        words: [],
        name: 'OZK',
        chain: 'base',
        address: '0xe77466c560dcb7d36d9ff3a8a9ee0f00824fbc5d',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'p1xel',
        words: [],
        name: 'p1xel',
        chain: 'base',
        address: '0x499e5db42db458797a8afbaa3bb32b2c46a147fa',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'PIXELBOY',
        words: [],
        name: 'PIXELBOY',
        chain: 'base',
        address: '0x7bacf554b881e9eef2d6975bd2ae523991ceae23',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'PLUS',
        words: [],
        name: 'PLUS',
        chain: 'base',
        address: '0xc8ed8ad280d61769b3346405172607fe3543be91',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'PRINCESS',
        words: [],
        name: 'PRINCESS',
        chain: 'base',
        address: '0x2aa115a53e8c1d11b9be6ef364f8836ca25bd0b9',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'punevyr',
        words: [],
        name: 'punevyr',
        chain: 'base',
        address: '0xf5fb6db52a4e2b1be84aac61ef85d41cb8bb89ba',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'PUNKCAN',
        words: [],
        name: 'PUNKCAN',
        chain: 'base',
        address: '0xf17b568e449b5941a802acd0bf42a98828e6b194',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'QTNN',
        words: [],
        name: 'QTNN',
        chain: 'base',
        address: '0xbfcc8f408e50a58f920873d774531d62ede48811',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'R1B2',
        words: [],
        name: 'R1B2',
        chain: 'base',
        address: '0x1efcefbe4c7c7610a4a69fa4618eb3d366885c59',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'SCOPY',
        words: [],
        name: 'SCOPY',
        chain: 'base',
        address: '0x887700c2247ff77dd42b1994f70b0542f0c63994',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'SKYLINE',
        words: [],
        name: 'SKYLINE',
        chain: 'base',
        address: '0xfba218c23fffb3e7efd3aa136e49eeb028387753',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'SLIPS',
        words: [],
        name: 'SLIPS',
        chain: 'base',
        address: '0x43bbff35b91e721c2359e9f837688cf83b6dbbf1',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'SURI',
        words: [],
        name: 'SURI',
        chain: 'base',
        address: '0xb09e0d291d47d9c29961596c79db535b4ef8289a',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'SYMPHONY',
        words: [],
        name: 'SYMPHONY',
        chain: 'base',
        address: '0xe6ef81ab6373b7b0d79bd8986d6d3596cb5386f9',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'TDZ',
        words: [],
        name: 'TDZ',
        chain: 'base',
        address: '0x5bfb7b8ece2fa202d31fff39af48fd8e7250b8ed',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'text',
        words: [],
        name: 'text',
        chain: 'base',
        address: '0x165a69797d7e04fc105696ae166f45868c36f5be',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'V4',
        words: [],
        name: 'V4',
        chain: 'base',
        address: '0x90abaca4dd04914cda2e0936f1ac3915de1723e6',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'VEK',
        words: [],
        name: 'VEK',
        chain: 'base',
        address: '0xecd93de834aaba7a7dbda6486663b24ea25ec719',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'VOLATILE',
        words: [],
        name: 'VOLATILE',
        chain: 'base',
        address: '0xd91302ce25b6e1f2894003e1dfa91271341c7519',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'wrens',
        words: [],
        name: 'wrens',
        chain: 'base',
        address: '0x09246bf8a87eb970512cedd57eb7a2ba5e87062b',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'XSAHA',
        words: [],
        name: 'XSAHA',
        chain: 'base',
        address: '0xe18ce1eff3f4f8607c89a013b478409170e28ff8',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'YUUGO',
        words: [],
        name: 'YUUGO',
        chain: 'base',
        address: '0x19ec23f2be07498af9ee6da98c9fbc1fb0c5440a',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'yyyueeeeeeee',
        words: [],
        name: 'yyyueeeeeeee',
        chain: 'base',
        address: '0xe674ba5c290956465777064700f2446be69f0b42',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'nubplus',
        words: [],
        name: 'nubplus',
        chain: 'base',
        address: '0x246a27cb4bfc1d40d52260b83b0b19cea0fe8b64',
        decimals: 18,
        logo: null,
    },
    {
        symbol: '3-s',
        words: [],
        name: '3-s',
        chain: 'base',
        address: '0x8747e87afc7355ec86fb580c85d5610e0999fb9b',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'The Swimmers',
        words: [],
        name: 'The Swimmers',
        chain: 'base',
        address: '0xcb7be1d26176ccd28eb22f7965749033a46ef6a5',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'ALTR',
        words: [],
        name: 'ALTR',
        chain: 'base',
        address: '0x54c27a55ae4d417454f371f6c5af16065ba6def7',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'BIBLIO',
        words: [],
        name: 'BIBLIO',
        chain: 'base',
        address: '0x6b96de5bdddb655131899b45457e881247f61d6e',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'NEYMO',
        words: [],
        name: 'NEYMO',
        chain: 'base',
        address: '0xb2391b90300fdf80ad453bc30de8e6aa534e50f9',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'HAR',
        words: [],
        name: 'HAR',
        chain: 'base',
        address: '0x033a877fb37caf6f552ff3fb386bb671d7b53bdb',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'Kenz',
        words: [],
        name: 'Kenz',
        chain: 'base',
        address: '0x9f2fc116d563dfbe641327f2f0239a829fabd387',
        decimals: 18,
        logo: null,
    },
    {
        symbol: 'LBPR',
        words: [],
        name: 'LBPR',
        chain: 'base',
        address: '0x321db30069633eaabe5dc61c3584698a54129edc',
        decimals: 18,
        logo: null,
    },
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
