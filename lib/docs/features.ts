/*
 * The PriceOS Feature Atlas registry — the canonical numbered index of PD's
 * own named features, imported from the ClickUp Master Feature List
 * (2026-07-10). Numbers are 4-digit catalog IDs (#0001…) in the founding
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
] as const;

const F = (n: number, name: string, section: string, glyph?: string, tag?: AtlasFeature['tag']): AtlasFeature =>
    ({ n, name, section, ...(glyph ? { glyph } : {}), ...(tag ? { tag } : {}) });

export const ATLAS: AtlasFeature[] = [
    // ── Global UI / Persistent Layers ──
    F(1, 'Ambient Strip / Ambient Light', 'Global UI', '☼'),
    F(2, 'Aura', 'Global UI', '⦿'),
    F(3, 'Content Standards Blocklist', 'Global UI'),
    F(4, 'Digital Familiar', 'Global UI', '⚝'),
    F(5, 'Grail Pins', 'Global UI', '⌖'),
    F(6, 'The Hammer', 'Global UI', 'ᚦ'),
    F(7, 'Hash Synesthesia', 'Global UI'),
    F(8, 'Incognito Proxy', 'Global UI', '⚇'),
    F(9, 'Market Pulse', 'Global UI'),
    F(10, 'Menu Tape', 'Global UI', '▰'),
    F(11, 'Nemesis', 'Global UI'),
    F(12, 'NPC Cast', 'Global UI'),
    F(13, 'Price Ghost / Price Memory', 'Global UI', 'ᗝ'),
    F(14, 'RPC Ping', 'Global UI', '⌁'),
    F(15, 'Sentiment Weather', 'Global UI', '◒'),
    F(16, 'The Signal', 'Global UI'),
    F(17, 'Sigil', 'Global UI'),
    F(18, 'Stargazing', 'Global UI', '❇'),
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
    F(35, 'Arbitrage Map', 'Spell Book', '⊞'),
    F(36, 'Aura (spell)', 'Spell Book', '⦿'),
    F(37, 'Cartel', 'Spell Book', '⟁'),
    F(38, 'Celestial Tracker', 'Spell Book', '♃'),
    F(39, 'Deactivate', 'Spell Book', '⊖'),
    F(40, 'Digital Familiar (spell)', 'Spell Book', '⚝'),
    F(41, 'Gossip Protocol', 'Spell Book', '⑃'),
    F(42, 'Gravity', 'Spell Book', '↡'),
    F(43, 'The Hammer (spell)', 'Spell Book', 'ᚦ'),
    F(44, 'Offer Shield', 'Spell Book', '⍲'),
    F(45, 'Panopticon', 'Spell Book', '⎌'),
    F(46, 'Price Ghost (spell)', 'Spell Book', '⦾'),
    F(47, 'Price Lens', 'Spell Book', '⌾'),
    F(48, "Proposed pills — Null Pointer · Counterweight · Root Cellar · Prophet's Ledger · Lurk Mode", 'Spell Book', undefined, 'PROPOSED'),
    F(49, 'Spite Book', 'Spell Book', '⌧'),
    F(50, 'Stargazing (spell)', 'Spell Book', '❇'),
    F(51, 'Sybil Net', 'Spell Book', '∾'),
    F(52, 'Tarot Spread', 'Spell Book', '♤'),
    F(53, 'Tribunal', 'Spell Book', '⚖'),
    // ── Home / Discovery ──
    F(54, 'Bounty Board', 'Home / Discovery'),
    F(55, 'Chain Breaker · Co-sign · Shared Dream · The Procession ⇶ · Epoch Shifter ⧖ · Discovery-modes batch', 'Home / Discovery'),
    F(56, 'Forge Queue', 'Home / Discovery'),
    F(57, 'Global Search', 'Home / Discovery'),
    F(58, 'Home', 'Home / Discovery'),
    F(59, 'Iconostasis', 'Home / Discovery', '⌸'),
    F(60, 'Lane Runner', 'Home / Discovery'),
    F(61, 'New Gen Art', 'Home / Discovery'),
    F(62, 'Project milestones in feed — First Blood · Lucky 22 · Century Club · Halo · Per Mille · Archetype · Hi-Def + Uploaded · Graduated · Ascension', 'Home / Discovery'),
    F(63, 'Recall', 'Home / Discovery'),
    F(64, 'Search inline answers', 'Home / Discovery'),
    F(65, 'Search power grammar', 'Home / Discovery'),
    F(66, 'Search PAGES nav', 'Home / Discovery'),
    F(67, 'Shuffle', 'Home / Discovery'),
    F(68, 'Taste Cluster · Taste Radius', 'Home / Discovery'),
    // ── Project Page ──
    F(69, 'Aggregate Price Target heatmap', 'Project Page'),
    F(70, 'Albums', 'Project Page'),
    F(71, 'Arweave thumbnail upload', 'Project Page'),
    F(72, 'ATH / Holder Map', 'Project Page'),
    F(73, 'The Audience', 'Project Page'),
    F(74, 'Batch List / Re-List / Make Offer', 'Project Page'),
    F(75, 'The Bloodline', 'Project Page', '◈'),
    F(76, 'Breadcrumbs', 'Project Page'),
    F(77, 'The Certificate ⊞ · The Cartography ◫', 'Project Page'),
    F(78, 'Disagreement Score', 'Project Page'),
    F(79, 'Feed signals — Sniped · Velocity · Departure · Cascade · Diaspora · Goodbye · Price Gravity · Debate Density', 'Project Page'),
    F(80, 'First Blood · Time to First Offer', 'Project Page'),
    F(81, 'Fog', 'Project Page'),
    F(82, 'The Genome', 'Project Page', '◎'),
    F(83, 'Grid + sort', 'Project Page'),
    F(84, 'Grid presets', 'Project Page'),
    F(85, 'Mint overlay — The Radar', 'Project Page', '⊕'),
    F(86, 'Network filters — Me · Following · Followers · Mutuals · Top Holders · New Wallets · PriceRank · Counterparties', 'Project Page'),
    F(87, 'Offers book (project-level)', 'Project Page'),
    F(88, 'Price Lens (project)', 'Project Page', '⌾'),
    F(89, 'Price-intelligence suite — Price Record · Stairs · Momentum · Canyon · Verdict · Consensus · Whisper · Appraisal · Wake · Holdout · Outlier · Contrarian Index · Offer Archaeology · Floor Argument · Setter-vs-Taker', 'Project Page'),
    F(90, 'Price Story (project-level)', 'Project Page'),
    F(91, "Recent pill — My Breadcrumbs + What's Hot", 'Project Page'),
    F(92, 'The Replay', 'Project Page', '⟳'),
    F(93, 'Sentiment', 'Project Page'),
    F(94, 'Shareable sort links', 'Project Page'),
    F(95, 'Showcase / Artworks / +More tabs', 'Project Page'),
    F(96, 'Tab memory', 'Project Page'),
    F(97, 'Trait offers + standing bids on trait pills', 'Project Page'),
    // ── Output Page (single token) ──
    F(98, 'COUNTER offers', 'Output Page'),
    F(99, 'The Darkroom ◉ · The Lens (loupe) · Direction · The Shadow (paper)', 'Output Page'),
    F(100, 'EDIT — price-in-place', 'Output Page'),
    F(101, 'Fill Budget', 'Output Page'),
    F(102, 'Fullscreen artwork', 'Output Page'),
    F(103, 'Hero stats row', 'Output Page'),
    F(104, 'Live market data read', 'Output Page'),
    F(105, 'Output activity feed / timeline', 'Output Page'),
    F(106, 'Output Attributes / Character Sheet — Identity · Fingerprint · Sky · Almanac · Oracle · Rarity · Lab', 'Output Page'),
    F(107, 'Output backlog', 'Output Page'),
    F(108, 'Output follows', 'Output Page'),
    F(109, 'Output Rarity', 'Output Page'),
    F(110, 'Output True Name', 'Output Page'),
    F(111, 'Offers panel', 'Output Page'),
    F(112, 'Ownership/listing-aware CTA', 'Output Page'),
    F(113, 'Owners / Collectors modal', 'Output Page'),
    F(114, 'Price Story (Output-level)', 'Output Page'),
    F(115, 'Sweep', 'Output Page'),
    F(116, 'Trait offer picker', 'Output Page'),
    // ── Profile Page ──
    F(117, 'Achievements wall', 'Profile Page'),
    F(118, 'Add-to-Showcase picker', 'Profile Page'),
    F(119, 'Albums display', 'Profile Page'),
    F(120, 'Collected tab', 'Profile Page'),
    F(121, 'Completionism', 'Profile Page'),
    F(122, 'Followers modal', 'Profile Page'),
    F(123, 'Generative Colorway', 'Profile Page'),
    F(124, 'Identity hero', 'Profile Page'),
    F(125, 'Now-Minting mini-carousel', 'Profile Page'),
    F(126, 'Pinned artists · pinned soundtracks · starred presets', 'Profile Page'),
    F(127, 'Portfolio', 'Profile Page'),
    F(128, 'PriceRank / PriceScore / PriceStreak badge', 'Profile Page'),
    F(129, 'PriceStreak row', 'Profile Page'),
    F(130, 'PriceSprite Modal', 'Profile Page'),
    F(131, 'Profile activity feed', 'Profile Page'),
    F(132, 'Seal Score · The Radar · Trade Record · Pilgrimage · Apprentice', 'Profile Page'),
    F(133, 'Showcase', 'Profile Page'),
    F(134, 'Stars / Wishlist', 'Profile Page'),
    F(135, 'Sticker display area', 'Profile Page'),
    F(136, 'Zen Garden', 'Profile Page'),
    // ── Artist Page ──
    F(137, 'Artist Showcase', 'Artist Page'),
    F(138, 'Body-of-work display + project links', 'Artist Page'),
    F(139, 'Official artist badge + whitelist', 'Artist Page'),
    F(140, "Pin to Top · The Thread · Director's Commentary · Artist Heartbeat · Palette of the Day · KOL · The Patron · Copycat + Copytrade", 'Artist Page'),
    // ── Settings / MY PD ──
    F(141, 'Default Sort row', 'Settings / MY PD'),
    F(142, 'Familiar customization panel', 'Settings / MY PD'),
    F(143, 'MY PD display modes — Pure Light · Pure Dark · Price Logo · Anon · Zen · Sticker · Ambient Strip · Zero Context · Price Lens · Sentiment · Cartel · ASCII-ID · Back Button · The Tape · Auto-Scroll', 'Settings / MY PD'),
    F(144, 'My Pings category toggles + pingtoasts', 'Settings / MY PD'),
    F(145, 'Redacted mode + Silent Mode', 'Settings / MY PD'),
    F(146, 'Setup Code + Workspaces switcher', 'Settings / MY PD'),
    F(147, 'Spell Book trigger', 'Settings / MY PD'),
    F(148, 'Sticker mode', 'Settings / MY PD'),
    F(149, 'Theme picker', 'Settings / MY PD'),
    // ── Pings (Notifications) ──
    F(150, 'Broadcast firehose', 'Pings'),
    F(151, 'Directed inbox — follow · project-follow · output-follow · achievement · streak · mint · sale · offer · offer-accepted · counter · transfer · wishlist-hit · watch-hit', 'Pings'),
    F(152, 'Named ping concepts — Price Crossing · Collision · Floor Breach · Whale Splash · Circle Alpha · New Voice · The Return · The Silence · The Standoff · Harmonic ∿ · Dormant Awakening · Taste Collision · Silent Alarm · Ignored Grail · Paper Plane Inbox · Nemesis', 'Pings'),
    F(153, 'Pingtoasts', 'Pings'),
    F(154, 'Tiered archival / retention', 'Pings'),
    F(155, 'Unread badge + PINGS panel', 'Pings'),
    F(156, 'Wishlist Pings', 'Pings'),
    // ── Platform Systems ──
    F(157, 'Achievements catalog', 'Platform Systems'),
    F(158, 'Anointment + Egregore', 'Platform Systems'),
    F(159, 'Calendar system', 'Platform Systems'),
    F(160, 'Completionism engine', 'Platform Systems'),
    F(161, 'Discord link + membership badge', 'Platform Systems'),
    F(162, 'Fingerprint', 'Platform Systems'),
    F(163, 'Leaderboard', 'Platform Systems'),
    F(164, 'Mood Ring / Epoch', 'Platform Systems'),
    F(165, 'Odin & Brendon', 'Platform Systems'),
    F(166, 'Output Attributes engine', 'Platform Systems'),
    F(167, 'PriceDay', 'Platform Systems'),
    F(168, 'PriceRank / PriceScore / PriceStreak', 'Platform Systems'),
    F(169, 'PriceSprite identity', 'Platform Systems'),
    F(170, 'The Radar · The Genome · The Epoch · Argue', 'Platform Systems'),
    F(171, 'Secondary Market', 'Platform Systems'),
    F(172, 'Showcase Engine', 'Platform Systems'),
    F(173, 'Social graph', 'Platform Systems'),
    F(174, 'Sticker economy', 'Platform Systems'),
    // ── Curation, Identity & Chrome ──
    F(175, 'Changelog modal', 'Curation, Identity & Chrome'),
    F(176, 'Gas Tracker', 'Curation, Identity & Chrome'),
    F(177, 'Gen Curated', 'Curation, Identity & Chrome'),
    F(178, 'Ghost Feed', 'Curation, Identity & Chrome'),
    F(179, 'Haze', 'Curation, Identity & Chrome'),
    F(180, 'Logo library', 'Curation, Identity & Chrome'),
    F(181, 'Notes', 'Curation, Identity & Chrome'),
    F(182, 'Per-project deep-link views', 'Curation, Identity & Chrome'),
    F(183, 'Petey', 'Curation, Identity & Chrome'),
    F(184, 'Starred presets', 'Curation, Identity & Chrome'),
    F(185, 'Starred soundtracks / Starred projects', 'Curation, Identity & Chrome'),
    F(186, 'Tabstract', 'Curation, Identity & Chrome'),
    F(187, 'Trait Stars', 'Curation, Identity & Chrome'),
    // ── King Mode — the signature-feature hunt ──
    F(188, 'The Conviction / Call Ledger', 'King Mode', undefined, 'KEEPER'),
    F(189, 'Deep Zoom', 'King Mode', undefined, 'KEEPER'),
    F(190, 'Rarity Labs', 'King Mode', undefined, 'KEEPER'),
    F(191, 'The Receipt', 'King Mode', undefined, 'KEEPER'),
    F(192, 'The Tide — Pledge Wars + Sigils', 'King Mode', undefined, 'KEEPER'),
    F(193, 'The Bell', 'King Mode', undefined, 'CANDIDATE'),
    F(194, 'The Ledger of Grudges', 'King Mode', undefined, 'CANDIDATE'),
    F(195, 'The Marginalia', 'King Mode', undefined, 'CANDIDATE'),
    F(196, 'The Standing', 'King Mode', undefined, 'CANDIDATE'),
    F(197, 'The Vault', 'King Mode', undefined, 'CANDIDATE'),
    F(198, 'The Whisper', 'King Mode', undefined, 'CANDIDATE'),
    // ── WOW Tier — stretch / showstopper ──
    F(199, 'The Bequeath', 'WOW Tier'),
    F(200, 'The Dispatch', 'WOW Tier'),
    F(201, 'The Dossier', 'WOW Tier'),
    F(202, 'Hostile Takeover', 'WOW Tier'),
    F(203, 'The Kindred', 'WOW Tier'),
    F(204, 'The Lantern', 'WOW Tier'),
    F(205, 'The Ledger', 'WOW Tier'),
    F(206, 'The Library', 'WOW Tier'),
    F(207, 'The Long View', 'WOW Tier'),
    F(208, 'The Portrait', 'WOW Tier'),
    F(209, 'The Shroud', 'WOW Tier'),
    F(210, 'The Threshold', 'WOW Tier'),
    F(211, 'The Understudy', 'WOW Tier'),
];

export function atlasId(n: number): string {
    return '#' + String(n).padStart(4, '0');
}

/* The Atlas as plain markdown — served at /docs/features.md and appended to
   /llms-full.txt, so the catalog keeps the sitewide markdown-parity promise. */
export function atlasAsMarkdown(): string {
    const lines: string[] = [
        '# PriceOS Feature Atlas',
        '',
        `${ATLAS.length} named PriceOS features, one continuous catalog (${atlasId(1)} → ${atlasId(ATLAS.length)}), grouped by where each lives. The number is the feature's permanent catalog ID; the name is the stable key.`,
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
