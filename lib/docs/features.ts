/*
 * The PriceOS Feature Atlas registry — the canonical numbered index of PD's
 * own named features, imported from the ClickUp Master Feature List
 * (2026-07-10; deduped same day — one entry per feature: the five "(spell)"
 * rows folded into their Global UI features; Price Lens / Setup Code /
 * Completionism / PriceStreak / Sticker-mode / Wishlist-Pings repeats folded
 * into their canonical rows; grab-bag overlaps trimmed).
 * Numbers are 4-digit catalog IDs (#0001…) in the founding
 * Atlas order; Brendon re-orders once before the numbering locks, then the
 * registry is append-only — new features take the next number, numbers are
 * never reused or reassigned. The name is the stable key alongside the
 * number. Scope: PD's own named features only — no web/PWA plumbing, no
 * projects or artists.
 */

export type AtlasFeature = {
    n: number;
    name: string;
    glyph?: string;
    section: string;
    /* Extra tag beyond the section, where the Atlas itself assigns one. */
    tag?: 'PROPOSED' | 'KEEPER' | 'CANDIDATE';
};

export const ATLAS_SECTIONS = [
    'Global UI',
    'OS Tools',
    'Spell Book',
    'Home / Discovery',
    'Project Page',
    'Output Page',
    'Profile Page',
    'Artist Page',
    'Settings / MY PD',
    'Pings',
    'Platform Systems',
    'Curation, Identity & Chrome',
    'King Mode',
    'WOW Tier',
    'PD Studio',
] as const;

const F = (n: number, name: string, section: string, glyph?: string, tag?: AtlasFeature['tag']): AtlasFeature =>
    ({ n, name, section, ...(glyph ? { glyph } : {}), ...(tag ? { tag } : {}) });

export const ATLAS: AtlasFeature[] = [
    // ── Global UI / Persistent Layers ──
    F(1, 'Ambient Strip / Ambient Light', 'Global UI', '☼'),
    F(2, 'Aura', 'Global UI', '⦿'),
    F(3, 'Content Standards Blocklist', 'Global UI'),
    F(4, 'Digital Familiar', 'Global UI', '⚝'),
    F(5, 'Grail Pins', 'Global UI', '⟟'),
    F(6, 'The Hammer', 'Global UI', '⟙'),
    F(7, 'Hash Synesthesia', 'Global UI'),
    F(8, 'Incognito Proxy', 'Global UI', '⚇'),
    F(9, 'Market Pulse', 'Global UI'),
    F(10, 'Menu Tape', 'Global UI', '▰'),
    F(11, 'Nemesis', 'Global UI'),
    F(12, 'NPC Cast', 'Global UI'),
    F(13, 'Price Ghost / Price Memory', 'Global UI', 'ᗝ'),
    F(14, 'RPC Ping', 'Global UI', '⌁'),
    F(15, 'Sentiment Weather', 'Global UI', '⛆'),
    F(16, 'The Signal', 'Global UI'),
    F(17, 'Sigil', 'Global UI'),
    F(18, 'Stargazing', 'Global UI', '⍟'),
    F(19, 'The Tape', 'Global UI', '⏥'),
    F(20, 'Top Bar Calendar', 'Global UI', '⥹'),
    F(21, 'Vellum Mode ⌯ · CSV Export ⎘ · Omen Filter ☈ · Feed primitives · Audio dimension', 'Global UI'),
    F(22, 'The Watch', 'Global UI'),
    // ── OS Tools (Sandbox Layer) ──
    F(23, 'The Anchor', 'OS Tools'),
    F(24, 'The Bench', 'OS Tools'),
    F(25, 'Budget', 'OS Tools'),
    F(26, 'The Calc', 'OS Tools'),
    F(27, 'The Calendar', 'OS Tools'),
    F(28, 'Cart', 'OS Tools'),
    F(29, 'The Gap', 'OS Tools'),
    F(30, "I'm The Thread", 'OS Tools'),
    F(31, 'Local Index', 'OS Tools'),
    F(32, 'Setup Code', 'OS Tools'),
    F(33, 'The Witness', 'OS Tools'),
    F(34, 'Workspaces', 'OS Tools'),
    // ── Spell Book ──
    F(35, 'Arbitrage Map', 'Spell Book', '⇄'),
    F(36, 'Cartel', 'Spell Book', '⟁'),
    F(37, 'Celestial Tracker', 'Spell Book', '♃'),
    F(38, 'Deactivate', 'Spell Book', '⊖'),
    F(39, 'Gossip Protocol', 'Spell Book', '⑃'),
    F(40, 'Gravity', 'Spell Book', '↡'),
    F(41, 'Offer Shield', 'Spell Book', '⍲'),
    F(42, 'Panopticon', 'Spell Book', '⎌'),
    F(43, "Proposed pills — Null Pointer · Counterweight · Root Cellar · Prophet's Ledger · Lurk Mode", 'Spell Book', undefined, 'PROPOSED'),
    F(44, 'Spite Book', 'Spell Book', '⌧'),
    F(45, 'Sybil Net', 'Spell Book', '∾'),
    F(46, 'Tarot Spread', 'Spell Book', '▯▯▯'),
    F(47, 'Tribunal', 'Spell Book', '⚖'),
    // ── Home / Discovery ──
    F(48, 'Bounty Board', 'Home / Discovery'),
    F(49, 'Chain Breaker · Co-sign · Shared Dream · The Procession ⇶ · Epoch Shifter ⧖ · Discovery-modes batch', 'Home / Discovery'),
    F(50, 'Forge Queue', 'Home / Discovery'),
    F(51, 'Global Search', 'Home / Discovery'),
    F(52, 'Home', 'Home / Discovery'),
    F(53, 'Iconostasis', 'Home / Discovery', '⌸'),
    F(54, 'Lane Runner', 'Home / Discovery'),
    F(55, 'New Gen Art', 'Home / Discovery'),
    F(56, 'Project milestones in feed — First Blood · Lucky 22 · Century Club · Halo · Per Mille · Archetype · Hi-Def + Uploaded · Graduated · Ascension', 'Home / Discovery'),
    F(57, 'Recall', 'Home / Discovery'),
    F(58, 'Search inline answers', 'Home / Discovery'),
    F(59, 'Search power grammar', 'Home / Discovery'),
    F(60, 'Search PAGES nav', 'Home / Discovery'),
    F(61, 'Shuffle', 'Home / Discovery'),
    F(62, 'Taste Cluster · Taste Radius', 'Home / Discovery'),
    // ── Project Page ──
    F(63, 'Aggregate Price Target heatmap', 'Project Page'),
    F(64, 'Albums', 'Project Page'),
    F(65, 'Arweave thumbnail upload', 'Project Page'),
    F(66, 'ATH / Holder Map', 'Project Page'),
    F(67, 'The Audience', 'Project Page'),
    F(68, 'Batch List / Re-List / Make Offer', 'Project Page'),
    F(69, 'The Bloodline', 'Project Page', '◈'),
    F(70, 'Breadcrumbs', 'Project Page'),
    F(71, 'The Certificate ⊞ · Cartography ◫', 'Project Page'),
    F(72, 'Disagreement Score', 'Project Page'),
    F(73, 'Feed signals — Sniped · Velocity · Departure · Cascade · Diaspora · Goodbye · Price Gravity · Debate Density', 'Project Page'),
    F(74, 'First Blood · Time to First Offer', 'Project Page'),
    F(75, 'Fog', 'Project Page'),
    F(76, 'The Genome', 'Project Page', '≎'),
    F(77, 'Grid + sort', 'Project Page'),
    F(78, 'Grid presets', 'Project Page', '⏚'),
    F(79, 'Mint overlay — The Radar', 'Project Page', '⊕'),
    F(80, 'Network filters — Me · Following · Followers · Mutuals · Top Holders · New Wallets · PriceRank · Counterparties', 'Project Page'),
    F(81, 'Offers book (project-level)', 'Project Page'),
    F(82, 'Price Lens', 'Project Page', '◎'),
    F(83, 'Price-intelligence suite — Price Record · Stairs · Momentum · Canyon · Verdict · Consensus · Whisper · Appraisal · Wake · Holdout · Outlier · Contrarian Index · Offer Archaeology · Floor Argument · Setter-vs-Taker', 'Project Page'),
    F(84, 'Price Story (project-level)', 'Project Page'),
    F(85, "Recent pill — My Breadcrumbs + What's Hot", 'Project Page'),
    F(86, 'The Replay', 'Project Page', '⏴'),
    F(87, 'Sentiment', 'Project Page', '⚼'),
    F(88, 'Shareable sort links', 'Project Page'),
    F(89, 'Showcase / Artworks / +More tabs', 'Project Page'),
    F(90, 'Tab memory', 'Project Page'),
    F(91, 'Trait offers + standing bids on trait pills', 'Project Page'),
    // ── Output Page (single token) ──
    F(92, 'COUNTER offers', 'Output Page'),
    F(93, 'The Darkroom ◉ · The Lens (loupe) · Direction · The Shadow (paper)', 'Output Page'),
    F(94, 'EDIT — price-in-place', 'Output Page'),
    F(95, 'Fill Budget', 'Output Page'),
    F(96, 'Fullscreen artwork', 'Output Page'),
    F(97, 'Hero stats row', 'Output Page'),
    F(98, 'Live market data read', 'Output Page'),
    F(99, 'Output activity feed / timeline', 'Output Page'),
    F(100, 'Output Attributes / Character Sheet — Identity · Fingerprint · Sky · Almanac · Oracle · Rarity · Lab', 'Output Page'),
    F(101, 'Output backlog', 'Output Page'),
    F(102, 'Output follows', 'Output Page'),
    F(103, 'Output Rarity', 'Output Page'),
    F(104, 'Output True Name', 'Output Page'),
    F(105, 'Offers panel', 'Output Page'),
    F(106, 'Ownership/listing-aware CTA', 'Output Page'),
    F(107, 'Owners / Collectors modal', 'Output Page'),
    F(108, 'Price Story (Output-level)', 'Output Page'),
    F(109, 'Sweep', 'Output Page'),
    F(110, 'Trait offer picker', 'Output Page'),
    // ── Profile Page ──
    F(111, 'Achievements wall', 'Profile Page'),
    F(112, 'Add-to-Showcase picker', 'Profile Page'),
    F(113, 'Albums display', 'Profile Page'),
    F(114, 'Collected tab', 'Profile Page'),
    F(115, 'Completionism', 'Profile Page'),
    F(116, 'Followers modal', 'Profile Page'),
    F(117, 'Generative Colorway', 'Profile Page'),
    F(118, 'Identity hero', 'Profile Page'),
    F(119, 'Now-Minting mini-carousel', 'Profile Page'),
    F(120, 'Pinned artists · pinned soundtracks', 'Profile Page'),
    F(121, 'Portfolio', 'Profile Page'),
    F(122, 'PriceRank / PriceScore / PriceStreak badge', 'Profile Page'),
    F(123, 'PriceSprite Modal', 'Profile Page'),
    F(124, 'Profile activity feed', 'Profile Page'),
    F(125, 'Seal Score · The Radar · Trade Record · Pilgrimage · Apprentice', 'Profile Page'),
    F(126, 'Showcase', 'Profile Page'),
    F(127, 'Stars / Wishlist', 'Profile Page'),
    F(128, 'Sticker display area', 'Profile Page'),
    F(129, 'Zen Garden', 'Profile Page'),
    // ── Artist Page ──
    F(130, 'Artist Showcase', 'Artist Page'),
    F(131, 'Body-of-work display + project links', 'Artist Page'),
    F(132, 'Official artist badge + whitelist', 'Artist Page'),
    F(133, "Pin to Top · The Thread · Director's Commentary · Artist Heartbeat · Palette of the Day · KOL · The Patron · Copycat + Copytrade", 'Artist Page'),
    // ── Settings / MY PD ──
    F(134, 'Default Sort row', 'Settings / MY PD'),
    F(135, 'Familiar customization panel', 'Settings / MY PD'),
    F(136, 'MY PD display modes — Pure Light · Pure Dark · Price Logo · Anon · Zen · Zero Context · ASCII-ID · Back Button · Auto-Scroll', 'Settings / MY PD'),
    F(137, 'My Pings category toggles + pingtoasts', 'Settings / MY PD'),
    F(138, 'Redacted mode + Silent Mode', 'Settings / MY PD'),
    F(139, 'Spell Book trigger', 'Settings / MY PD'),
    F(140, 'Theme picker', 'Settings / MY PD'),
    // ── Pings (Notifications) ──
    F(141, 'Broadcast firehose', 'Pings'),
    F(142, 'Directed inbox — follow · project-follow · output-follow · achievement · streak · mint · sale · offer · offer-accepted · counter · transfer · wishlist-hit · watch-hit', 'Pings'),
    F(143, 'Named ping concepts — Price Crossing · Collision · Floor Breach · Whale Splash · Circle Alpha · New Voice · The Return · The Silence · The Standoff · Harmonic ∿ · Dormant Awakening · Taste Collision · Silent Alarm · Ignored Grail · Paper Plane Inbox', 'Pings'),
    F(144, 'Pingtoasts', 'Pings'),
    F(145, 'Tiered archival / retention', 'Pings'),
    F(146, 'Unread badge + PINGS panel', 'Pings'),
    // ── Platform Systems ──
    F(147, 'Achievements catalog', 'Platform Systems'),
    F(148, 'Anointment + Egregore', 'Platform Systems'),
    F(149, 'Calendar system', 'Platform Systems'),
    F(150, 'Discord link + membership badge', 'Platform Systems'),
    F(151, 'Fingerprint', 'Platform Systems', '⌾'),
    F(152, 'Leaderboard', 'Platform Systems'),
    F(153, 'Mood Ring / Epoch', 'Platform Systems'),
    F(154, 'Odin & Brendon', 'Platform Systems'),
    F(155, 'Output Attributes engine', 'Platform Systems'),
    F(156, 'PriceDay', 'Platform Systems'),
    F(157, 'PriceRank / PriceScore / PriceStreak', 'Platform Systems'),
    F(158, 'PriceSprite identity', 'Platform Systems'),
    F(159, 'Argue', 'Platform Systems'),
    F(160, 'Secondary Market', 'Platform Systems'),
    F(161, 'Showcase Engine', 'Platform Systems'),
    F(162, 'Social graph', 'Platform Systems'),
    F(163, 'Sticker economy', 'Platform Systems'),
    // ── Curation, Identity & Chrome ──
    F(164, 'Changelog modal', 'Curation, Identity & Chrome'),
    F(165, 'Gas Tracker', 'Curation, Identity & Chrome'),
    F(166, 'Gen Curated', 'Curation, Identity & Chrome'),
    F(167, 'Ghost Feed', 'Curation, Identity & Chrome'),
    F(168, 'Haze', 'Curation, Identity & Chrome'),
    F(169, 'Logo library', 'Curation, Identity & Chrome'),
    F(170, 'Notes', 'Curation, Identity & Chrome'),
    F(171, 'Per-project deep-link views', 'Curation, Identity & Chrome'),
    /* #0172 RETIRED 2026-08-03 (Brendon): Petey is the MASCOT — brand side,
       not app side — and was never a feature. The number is never reused. */
    F(173, 'Starred presets', 'Curation, Identity & Chrome'),
    F(174, 'Starred soundtracks / Starred projects', 'Curation, Identity & Chrome'),
    F(175, 'Tabstract', 'Curation, Identity & Chrome'),
    F(176, 'Trait Stars', 'Curation, Identity & Chrome'),
    // ── King Mode — the signature-feature hunt ──
    F(177, 'The Conviction / Call Ledger', 'King Mode', undefined, 'KEEPER'),
    F(178, 'Deep Zoom', 'King Mode', undefined, 'KEEPER'),
    F(179, 'Rarity Labs', 'King Mode', undefined, 'KEEPER'),
    F(180, 'The Receipt', 'King Mode', undefined, 'KEEPER'),
    F(181, 'The Tide — Pledge Wars + Sigils', 'King Mode', undefined, 'KEEPER'),
    F(182, 'The Bell', 'King Mode', undefined, 'CANDIDATE'),
    F(183, 'The Ledger of Grudges', 'King Mode', undefined, 'CANDIDATE'),
    F(184, 'The Marginalia', 'King Mode', undefined, 'CANDIDATE'),
    F(185, 'The Standing', 'King Mode', undefined, 'CANDIDATE'),
    F(186, 'The Vault', 'King Mode', undefined, 'CANDIDATE'),
    F(187, 'The Whisper', 'King Mode', undefined, 'CANDIDATE'),
    // ── WOW Tier — stretch / showstopper ──
    F(188, 'The Bequeath', 'WOW Tier'),
    F(189, 'The Dispatch', 'WOW Tier', '❡'),
    F(190, 'The Dossier', 'WOW Tier'),
    F(191, 'Takeover', 'WOW Tier'),
    F(192, 'The Kindred', 'WOW Tier'),
    F(193, 'The Lantern', 'WOW Tier'),
    F(194, 'The Ledger', 'WOW Tier'),
    F(195, 'The Library', 'WOW Tier'),
    F(196, 'The Long View', 'WOW Tier'),
    F(197, 'The Portrait', 'WOW Tier'),
    F(198, 'The Shroud', 'WOW Tier'),
    F(199, 'The Threshold', 'WOW Tier'),
    F(200, 'The Understudy', 'WOW Tier'),
    // ── Post-founding appends (the registry is append-only from here) ──
    F(201, 'ASCII Backup', 'Output Page', '⍞'),
    // ── 2026-07-25 catch-up append — everything shipped between 2026-07-10
    //    and 2026-07-25 that the Atlas had never captured. Every entry was
    //    verified against the real code before it joined the catalog.
    //    Numbers are permanent; the registry stays append-only.
    // ── Global UI ──
    F(202, 'The Command Stone', 'Global UI', '⌘'),
    F(203, 'The PD Miniplayer', 'Global UI', '♫'),
    F(204, 'Profile Tags', 'Global UI'),
    F(205, 'PD User Number', 'Global UI'),
    F(206, 'Fiat Mode + Currencies', 'Global UI'),
    F(207, 'Sound Layer', 'Global UI', '⚟'),
    F(208, 'Quiet Hours', 'Global UI', '⏾'),
    // ── OS Tools ──
    F(209, 'Lists', 'OS Tools', '≡'),
    F(210, 'Workflows', 'OS Tools', '☇'),
    F(211, 'The Sentinel', 'OS Tools'),
    F(212, 'PD Wrapped', 'OS Tools'),
    F(213, 'Spaces — workspace mood presets', 'OS Tools'),
    // ── Spell Book ──
    F(214, 'Degen', 'Spell Book', '⚔'),
    F(215, 'Echo Chamber', 'Spell Book', '≫'),
    F(216, 'The ???? pill', 'Spell Book'),
    // ── Home / Discovery ──
    F(217, 'Composer', 'Home / Discovery', '⊚'),
    F(218, 'Programs — the Spectrum · the Loosener', 'Home / Discovery'),
    // ── Project Page ──
    F(219, "The Gnome — the Project's keeper", 'Project Page'),
    F(220, 'The Mint Room', 'Project Page'),
    F(221, 'OWNERS list', 'Project Page'),
    F(222, 'Price Targets — sealed monthly calls', 'Project Page'),
    F(223, 'Subtraits', 'Project Page'),
    F(224, 'Artist Showcase layouts', 'Project Page'),
    // ── Output Page ──
    F(225, 'The Neighbourhood', 'Output Page'),
    F(226, 'Time-as-distance timeline', 'Output Page'),
    F(227, 'Rarity Receipt', 'Output Page'),
    // ── Profile Page ──
    F(228, 'Targets', 'Profile Page', '⬚'),
    F(229, 'Counterparties', 'Profile Page'),
    F(230, 'The Friend Inspector — the Wire · the Constellation · lenses', 'Profile Page'),
    F(231, 'The Identity Plate', 'Profile Page'),
    F(232, "The Completionist's Ledger · The Close", 'Profile Page'),
    F(233, 'Name Font', 'Profile Page'),
    F(234, 'Showcase Move Mode', 'Profile Page'),
    // ── PD Studio ──
    F(235, 'PD Studio', 'PD Studio'),
    F(236, 'Drafts + Test Runs', 'PD Studio'),
    F(237, 'Trait Scan + Subtrait Editor', 'PD Studio'),
    F(238, 'Preflight + Publish', 'PD Studio'),
    F(239, 'The Artist Dashboard', 'PD Studio'),
    F(240, 'The Drop Kit', 'PD Studio'),
    F(241, 'EARNED', 'PD Studio'),
    F(242, 'Vouch', 'PD Studio'),
    F(243, 'Sticker Studio', 'PD Studio'),
    F(244, 'God Mode', 'PD Studio'),
    F(245, 'Soundtrack Manager', 'PD Studio'),
    // ── Pings ──
    F(246, 'Artist Push', 'Pings', '✺'),
    F(247, '3D Pingtoasts — native lock-screen push', 'Pings'),
    F(248, 'Trade pings', 'Pings', '⇌'),
    // ── Platform Systems ──
    F(249, 'The Factions — the colour war', 'Platform Systems', '⚐'),
    F(250, 'The Sigil Forge', 'Platform Systems'),
    F(251, 'The Book of Conquests', 'Platform Systems', '≣'),
    F(252, 'The Gnomes — the real-fake NFT collection', 'Platform Systems'),
    F(253, 'The Awakening', 'Platform Systems'),
    F(254, 'the gnomewallet', 'Platform Systems', '⍙'),
    F(255, 'the mushroom market', 'Platform Systems'),
    F(256, 'Fair Draw', 'Platform Systems'),
    F(257, 'The Digest — the email edition · The Stamp', 'Platform Systems'),
    F(258, 'PDMCP — the PD MCP server', 'Platform Systems'),
    F(259, 'The Sticker Channel', 'Platform Systems'),
    F(260, 'The Exchange', 'Platform Systems', '⇌'),
    F(261, 'The Rewind', 'Platform Systems', '◄'),
    /* Append-only from here (2026-08-01) — the Atlas takes the next number,
       numbers are never reused or reassigned. */
    F(262, 'Colorpedia', 'OS Tools', '◉'),
    F(263, 'Golf Score · The Clubhouse', 'Project Page', '⛳'),
    F(264, 'Projects Pro', 'Home / Discovery', '⬚'),
    F(265, 'Formula', 'Curation, Identity & Chrome'),
];

export function atlasId(n: number): string {
    return '#' + String(n).padStart(4, '0');
}

/* The highest catalog number ever assigned. NOT ATLAS.length — a retired
   number (#0172, Petey) leaves a permanent hole, so the top of the range and
   the entry count are different facts. */
export const ATLAS_MAX_N: number = ATLAS.reduce((m, f) => Math.max(m, f.n), 0);

/* SPOTLIGHT FOR PRICEOS (Brendon, 2026-07-28 — the Stone's original brief,
   closed full-circle): searching a feature name in the Stone surfaces the
   feature AS AN APP — the Suite's icon-in-a-rounded-square with the name
   beneath. Not literally an app, just presented that way; the tile opens
   the numbered directory filtered to it. This is the matcher: substring
   on the name, starts-with ranked first, 3+ chars so mid-word typing
   doesn't flicker tiles. */
export function searchAtlas(query: string, limit = 6): AtlasFeature[] {
    const q = query.trim().toLowerCase();
    if (q.length < 3) return [];
    const starts: AtlasFeature[] = [];
    const contains: AtlasFeature[] = [];
    for (const f of ATLAS) {
        const name = f.name.toLowerCase();
        if (name.startsWith(q)) starts.push(f);
        else if (name.includes(q)) contains.push(f);
    }
    return [...starts, ...contains].slice(0, limit);
}

/* The Atlas as plain markdown — served at /docs/features.md and appended to
   /llms-full.txt, so the catalog keeps the sitewide markdown-parity promise. */
export function atlasAsMarkdown(): string {
    const lines: string[] = [
        '# PriceOS Feature Atlas',
        '',
        `${ATLAS.length} named PriceOS features, one continuous catalog (${atlasId(1)} → ${atlasId(ATLAS_MAX_N)}), grouped by where each lives. The number is the feature's permanent catalog ID; the name is the stable key.`,
        '',
    ];
    let current = '';
    for (const f of ATLAS) {
        if (f.section !== current) {
            current = f.section;
            lines.push(`## ${current}`, '');
        }
        const glyph = f.glyph ? ` ${f.glyph}` : '';
        const tag = f.tag ? ` — ${f.tag}` : '';
        lines.push(`- ${atlasId(f.n)}${glyph} ${f.name}${tag}`);
    }
    lines.push('');
    return lines.join('\n');
}
