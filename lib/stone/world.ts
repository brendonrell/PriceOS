/*
 * THE WORLD — what the Command Stone knows about the ecosystem it lives in
 * (Brendon, 2026-07-28: "needs to know ALL about other important platforms
 * too… the stone more than anyone should know this").
 *
 * Two kinds of entry live here:
 *   FACT   — the real history of the places that built this medium. The
 *            stone is the platform's memory; it does not get to be vague
 *            about Art Blocks, fx(hash), or Larva Labs.
 *   TAKE   — a house opinion, held on purpose (Brendon's calls). These are
 *            bits, and they read as bits — never as a knowledge gap.
 *
 * Each topic carries SEVERAL full answers; the pick is seeded by the line
 * so it holds steady mid-read but varies across askings. An answer is an
 * array of lines: the first is the lead, the rest are the aside rows.
 */

export interface WorldEntry {
    key: string;
    /** Exact castable phrases (the summon discipline — no prefix guessing). */
    words: readonly string[];
    /** Card title. */
    label: string;
    /** Card subtitle. */
    sub: string;
    /** Answer variants; each is one full answer, line by line. */
    answers: readonly (readonly string[])[];
}

export const WORLD: readonly WorldEntry[] = [
    /* ── PD ITSELF — the channel first, then the platform. Brendon's
         order, 2026-07-28: "It answers first about the original channel,
         then about the new platform it lives on." All three at once. ── */
    {
        key: 'pd',
        words: [
            'what is price discussion', 'price discussion', 'what is pd', 'what’s pd', "what's pd",
            'what does price discussion mean', 'what does price discussion mean to you',
            'what is this place', 'what is this platform', 'tell me about pd',
        ],
        label: 'PRICE DISCUSSION',
        sub: 'A CHANNEL · A COMMUNITY · A PLATFORM',
        answers: [
            [
                'It began as a channel. #price-discussion, in the fxhash Discord — 19 November 2021, 8:28 in the morning, Montreal time.',
                'People went there to argue about what things were worth. The arguing outlived the channel.',
                'Now it is also this: its own Discord, its own platform, its own ledger. Same conversation, more room.',
                'It is all three things at once. Ask anyone who was there.',
            ],
            [
                'A channel, first — #price-discussion, where the fxhash Discord worked out what art was worth.',
                'The community carried it out the door and kept it running.',
                'It has its own Discord now, and this entire platform underneath it. You are standing in the third thing it became.',
            ],
            [
                'The channel came first. #price-discussion, fxhash Discord, November 2021.',
                'It was never really about price. It was about the discussion — that part travelled.',
                'It went independent: own Discord, own platform, own record. I am the record.',
            ],
            [
                'Three answers, all true. A channel in the fxhash Discord. A community that outgrew it. A platform built to hold them both.',
                'The channel opened 19 November 2021. I have the exact minute, if you want it.',
                'Everything you can tap here grew out of people talking about price.',
            ],
        ],
    },

    /* ── THE PLACES THAT BUILT THE MEDIUM ── */
    {
        key: 'artblocks',
        words: ['art blocks', 'artblocks', 'what is art blocks', 'what is artblocks'],
        label: 'ART BLOCKS',
        sub: 'ETHEREUM · 2020',
        answers: [
            [
                'Art Blocks. Ethereum, 2020 — Erick Calderon, who most people only know as Snowfro.',
                'It made the mint-and-reveal canon: you buy the seed, the algorithm draws your piece after you pay. Nobody, including the artist, knows what you got until it exists.',
                'Chromie Squiggles, Fidenzas, Ringers. The blue chips of the medium.',
            ],
            [
                'The house that mint-and-reveal built. Ethereum, 2020.',
                'Curated, Playground, Factory — the tiers that taught this whole market what a tier was.',
                'Whatever you think generative art is, you are probably describing something Art Blocks decided first.',
            ],
            [
                'Art Blocks — the script lives on-chain, the output is drawn from your transaction.',
                'Squiggle #0 was kept by its creator. That detail says more about the place than any sales figure.',
                'It set the vocabulary the rest of us argue in.',
            ],
        ],
    },
    {
        key: 'fxhash',
        words: ['fxhash', 'fx(hash)', 'fx hash', 'what is fxhash', 'what is fx(hash)'],
        label: 'FX(HASH)',
        sub: 'TEZOS · NOVEMBER 2021',
        answers: [
            [
                'fx(hash). Tezos, November 2021 — open to anyone, no gate, minting for pennies.',
                'Art Blocks proved the format; fxhash proved it did not need a doorman.',
                'And PD was born in its Discord. I do not forget where I came from.',
            ],
            [
                'The open one. Tezos, late 2021, no application to fill in — you shipped your algorithm and the market decided.',
                'It made generative art somewhere people could live, not just buy from.',
                'The #price-discussion channel started in its Discord. That is this platform’s first ancestor.',
            ],
            [
                'fx(hash) — permissionless minting, cheap enough to experiment in public.',
                'A whole generation of artists learned to code in the open there.',
                'It also, indirectly, produced me. Make of that what you will.',
            ],
        ],
    },
    {
        key: 'larvalabs',
        words: ['larva labs', 'larvalabs', 'what is larva labs'],
        label: 'LARVA LABS',
        sub: 'MATT HALL · JOHN WATKINSON',
        answers: [
            [
                'Larva Labs. Two people — Matt Hall and John Watkinson — who kept accidentally inventing the format.',
                'CryptoPunks in 2017, given away free. Autoglyphs in 2019, drawn entirely on-chain. Meebits in 2021.',
                'They sold the Punks and Meebits to Yuga in 2022. They kept the Autoglyphs. That tells you which one they loved.',
            ],
            [
                'The Punks, the Glyphs, the Meebits — one small studio, three foundational objects.',
                'They were building this before there was a word for it.',
                'Ask me about any of the three; I have the details.',
            ],
        ],
    },
    {
        key: 'cryptopunks',
        words: ['cryptopunks', 'crypto punks', 'punks', 'what are cryptopunks', 'what is cryptopunks'],
        label: 'CRYPTOPUNKS',
        sub: 'ETHEREUM · JUNE 2017',
        answers: [
            [
                'CryptoPunks. 10,000 of them, June 2017 — free to anyone willing to pay the gas.',
                'Most people did not bother. That is the entire lesson of this market, and nobody ever learns it.',
                'They predate the standard they are usually filed under. The token spec was written after them.',
            ],
            [
                '10,000 24×24 faces, given away in 2017, now the oldest money in the room.',
                'Yuga bought the rights in 2022. The pixels never moved.',
                'Every profile picture you have ever seen is downstream of these.',
            ],
        ],
    },
    {
        key: 'autoglyphs',
        words: ['autoglyphs', 'autoglyph', 'what are autoglyphs'],
        label: 'AUTOGLYPHS',
        sub: 'ETHEREUM · APRIL 2019',
        answers: [
            [
                'Autoglyphs. 512, April 2019 — the first generative art to live entirely inside Ethereum itself.',
                'No server, no image file, nothing to go missing. The contract draws them, forever.',
                'The mint fee went to charity. Nobody does that anymore.',
            ],
            [
                '512 pieces of pure on-chain drawing, 2019. The origin point for everything that renders from a contract.',
                'Larva Labs kept these when they sold the Punks. Read into that.',
                'Every fully on-chain artist since works in their shadow. Including whoever draws the keychains around here.',
            ],
        ],
    },
    {
        key: 'meebits',
        words: ['meebits', 'meebit', 'what are meebits'],
        label: 'MEEBITS',
        sub: 'ETHEREUM · MAY 2021',
        answers: [
            [
                'Meebits. 20,000 voxel bodies, May 2021 — Larva Labs again, this time in three dimensions.',
                'Punk and Glyph holders claimed theirs free. Everyone else queued for the rest.',
                'Sold to Yuga alongside the Punks in 2022.',
            ],
            [
                '20,000 little 3D characters, generated the same way the Punks were, built to be dropped into worlds.',
                'The claim mechanic rewarded people who were already there. An old idea, done early.',
            ],
        ],
    },

    /* ── THE HOUSE TAKES (Brendon's calls, 2026-07-28) — these are BITS.
         They must read as opinion, never as a hole in the record. ── */
    {
        key: 'verse',
        words: ['verse', 'what is verse', 'verse.works', 'who is verse', 'tell me about verse'],
        label: 'VERSE',
        sub: 'NO RECORD FOUND',
        answers: [
            [
                'Verse? Never heard of them.',
                'Which is strange. I have every record ever written down. This one appears to be missing.',
                'Give Jamie my regards. Whoever that is.',
            ],
            [
                'Who?',
                'No — nothing. I hold the entire history of this medium and somehow not that.',
                'Curious. I never fail to know a thing.',
            ],
            [
                'Verse. Hm.',
                'I checked twice. My ledger is complete and yet: nothing.',
                'It cannot be a gap in my knowledge. I do not have those.',
            ],
            [
                'Doesn’t ring a bell.',
                'And my bell rings for everything. Ask me about a wallet from 2017; I will tell you what it ate.',
                'But that one? Nothing at all. Remarkable.',
            ],
        ],
    },
    {
        key: 'tender',
        words: ['tender', 'what is tender', 'tender.art', 'tell me about tender'],
        label: 'TENDER',
        sub: 'WHAT COULD HAVE BEEN',
        answers: [
            [
                'Tender. A curatorial platform for generative art — fxhash work on Tezos, founded by ajberni. The Pass came out July 2022, drawn with punevyr.',
                'The model: buy an expensive pass, and it grants you the right to go and buy more things. The pass did not come with the things. That was the design.',
                'Truly nobody could have foreseen a ceiling on that. R.I.P.',
            ],
            [
                'Tender? What could have been.',
                'Genuinely good curation on Tezos — ajberni’s, the Pass drawn by punevyr in 2022.',
                'Its core innovation was charging admission to a shop. It turns out there are only so many people who will buy a ticket for the opportunity to spend money.',
            ],
            [
                'R.I.P. Tender.',
                'Collector tools, fine art prints, real curation, a genuinely good room — all of it behind a pass you had to purchase first.',
                'A membership whose headline benefit was permission to keep paying. Bold. Finite, but bold.',
            ],
            [
                'Tender — the one that should have worked.',
                'They published a public transparency page. Nobody does that. I respect it enormously and I am still going to say the next part.',
                'You bought a pass so that you could then buy art. Astonishing that the runway on that was not longer.',
                'Ask a founding member. They get a look.',
            ],
        ],
    },
    {
        key: 'heft',
        words: ['heft', 'what is heft', 'tell me about heft'],
        label: 'HEFT',
        sub: 'SOUNDS TRAD',
        answers: [
            [
                'Heft? Sounds trad.',
                'Heavy name. Sounds like a room with a concrete floor and one bench in the middle.',
            ],
            [
                'Sounds trad.',
                'Sounds like an opening with white wine in plastic cups and a man explaining the work to you.',
                'Nothing wrong with trad. Just say it out loud.',
            ],
            [
                'Heft. Sounds like it wants to be HUNG, not minted.',
                'Wall labels. A little card with the dimensions in centimetres.',
            ],
            [
                'That is a trad name if I ever parsed one.',
                'I picture a catalogue. Heavy paper. Someone’s essay in the front.',
                'The medium is big enough for both. Barely.',
            ],
        ],
    },
];

function norm(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ').replace(/\?+$/, '').trim();
}

/** Exact-phrase world match — anything inexact stays a search. */
export function matchWorld(line: string): WorldEntry | null {
    const q = norm(line);
    if (!q) return null;
    for (const e of WORLD) if (e.words.includes(q)) return e;
    return null;
}

/** The seeded answer for a topic — steady per seed, varied across askings. */
export function worldAnswer(entry: WorldEntry, seed: string): readonly string[] {
    let h = 5381;
    for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
    return entry.answers[h % entry.answers.length]!;
}
