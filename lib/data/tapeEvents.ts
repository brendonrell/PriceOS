/*
 * Tape mock events
 *
 * Sim 13207-13262. Mock feed data driving the Menu Tape rail in the
 * dropdown (and, post-launch, the top-of-page horizontal ticker).
 *
 * Build 25 D10: tape rail had no content because window._pdTapeFeedItems
 * isn't ported yet — the React TapeBox needs structured items it can
 * render. This module exposes WALLETS + EVENTS as typed data plus a
 * tapeFeedItems() helper mirroring sim 13403-13417.
 *
 * Structure preserved from sim:
 *   EVENTS rows: [type, walletIdx (null=system), verb, collection, id, price]
 *   types: buy | list | anoint | mint  → standard weight
 *          offer | ignored | cancel    → soft (non-consummated)
 *          mint                         → bold class
 */

export type TapeEventType =
    | 'buy'
    | 'list'
    | 'anoint'
    | 'mint'
    | 'offer'
    | 'ignored'
    | 'cancel';

export interface TapeWallet {
    name: string;
    sigil: string;
}

export interface TapeFeedItem {
    type: TapeEventType;
    name: string | null;
    sigil: string;
    verb: string;
    coll: string;
    id: number;
    price: string | null;
}

export const WALLETS: TapeWallet[] = [
    { name: '@brendon',      sigil: '✶\uFE0E' },              //  0
    { name: '@snowfro',      sigil: '☀\uFE0E' },              //  1
    { name: '@atlasforge',   sigil: '⚙\uFE0E⚙\uFE0E' },       //  2
    { name: '@matty',        sigil: '⚙\uFE0E' },              //  3
    { name: '@rudxane',      sigil: '☀\uFE0E⚙\uFE0E' },       //  4
    { name: '@thefunnyguys', sigil: '⚡\uFE0E' },              //  5
    { name: '@darold',       sigil: '⚙\uFE0E⚙\uFE0E' },       //  6
    { name: '@trinity',      sigil: '♥\uFE0E' },              //  7
    { name: '@willpop',      sigil: '♦\uFE0E' },              //  8
    { name: '@vitalik',      sigil: '◈\uFE0E' },              //  9
    { name: '@siggi',        sigil: '' },                     // 10
    { name: '@clownvamp',    sigil: '⚙\uFE0E' },              // 11
    { name: '@bayamese',     sigil: '☀\uFE0E' },              // 12
    { name: '@anon1',        sigil: '' },                     // 13
    { name: '@anon2',        sigil: '' },                     // 14
    { name: '@anon3',        sigil: '' },                     // 15
];

type EventRow = [TapeEventType, number | null, string, string, number, string | null];

const EVENTS: EventRow[] = [
    ['buy',     0,    'bought',                  'kiki',                 47,    '0.31 ETH'],
    ['list',    null, 'new listing',             'strata',              882,   '0.04 ETH'],
    ['anoint',  1,    'anointed',                'meridian',             220,   null      ],
    ['offer',   7,    'offered',                 'kiki',                 1024,  '0.22 ETH'],
    ['ignored', 13,   'ignored 0.08 offer on',   'chromies',             88,    null      ],
    ['mint',    2,    'minted',                  'kiki',                 1988,  null      ],
    ['buy',     5,    'bought',                  'fidenza',              3,     '4.20 ETH'],
    ['list',    3,    'listed',                  'ringers',              22,    '1.22 ETH'],
    ['offer',   11,   'offered',                 'strata',              14,    '0.12 ETH'],
    ['cancel',  4,    'cancelled listing',       'glitch monsters',      77,    null      ],
    ['buy',     6,    'bought',                  'chromies',             5612,  '0.55 ETH'],
    ['mint',    3,    'minted',                  'kiki',                 2020,  null      ],
    ['list',    8,    'listed',                  'autoglyphs',           108,   '55 ETH'  ],
    ['anoint',  7,    'anointed',                'fidenza',              442,   null      ],
    ['buy',     12,   'bought',                  'strata',              222,   '0.22 ETH'],
    ['offer',   9,    'offered',                 'meridian',             101,   '0.4 ETH' ],
    ['list',    null, 'new listing',             'glitch monsters',      14,    '2.1 ETH' ],
    ['buy',     14,   'bought',                  'kiki',                 333,   '0.33 ETH'],
    ['ignored', 1,    'ignored 0.5 offer on',    'ringers',              87,    null      ],
    ['mint',    0,    'minted',                  'kiki',                 22,    null      ],
    ['buy',     15,   'bought',                  'chromies',             4432,  '0.88 ETH'],
    ['list',    6,    'listed',                  'strata',              1001,  '0.07 ETH'],
    ['anoint',  8,    'anointed',                'autoglyphs',           102,   null      ],
    ['offer',   2,    'offered',                 'meridian',             55,    '0.6 ETH' ],
    ['buy',     11,   'bought',                  'memories of qilin',    14,    '0.45 ETH'],
    ['list',    5,    'listed',                  'fidenza',              77,    '3.5 ETH' ],
    ['cancel',  10,   'cancelled listing',       'strata',              44,    null      ],
    ['buy',     4,    'bought',                  'ringers',              100,   '0.9 ETH' ],
    ['mint',    1,    'minted',                  'kiki',                 1776,  null      ],
    ['offer',   14,   'offered',                 'chromies',             2200,  '0.25 ETH'],
    ['buy',     12,   'bought',                  'pixelchain',           7,     '0.18 ETH'],
    ['anoint',  0,    'anointed',                'strata',              777,   null      ],
    ['list',    10,   'listed',                  'meridian',             33,    '1.1 ETH' ],
];

/**
 * Sim 13403-13417. Returns EVENTS as structured items for tape rail
 * rendering. Newest-first (sim's EVENTS array is ordered visually so
 * index 0 is the most recent item).
 */
export function tapeFeedItems(): TapeFeedItem[] {
    return EVENTS.map((ev) => {
        const walletIdx = ev[1];
        const w = walletIdx !== null ? WALLETS[walletIdx] : null;
        return {
            type:  ev[0],
            name:  w ? w.name : null,
            sigil: w && w.sigil ? w.sigil : '',
            verb:  ev[2],
            coll:  ev[3],
            id:    ev[4],
            price: ev[5],
        };
    });
}

/** Glyph used in the expanded body list per sim 6028-6035. */
export function tapeBodyIcon(type: TapeEventType): string {
    switch (type) {
        case 'buy':     return '✦';
        case 'list':    return '❒';
        case 'mint':    return '✺';
        case 'offer':   return '◇';
        case 'anoint':  return '☆';
        case 'cancel':  return '⊘';
        case 'ignored': return '⋯';
        default:        return '⏥';
    }
}
