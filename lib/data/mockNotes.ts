/*
 * Mock Notes — 30 entries matching the sim's notes-list defaults.
 * Note text supports markdown markers:
 *   **bold**, _italic_, `code`
 * The MarkdownNote renderer in components/dropdown/NotesBox handles
 * those at render time.
 *
 * MOCK_DEMO_NOTES (chat #5 / Notes feature) — sim 6566-6597 demoNotes
 * map. Keyed by numeric token id, NOT by the list-item id-string.
 * Pre-populated into pd_token_notes when the user opens a note from
 * the connect-menu Notes list (D013). Distinct from MOCK_NOTES above:
 * MOCK_NOTES holds the SHORT list-item display text; MOCK_DEMO_NOTES
 * holds the LONGER expanded note body. Sim deliberately ships them
 * different — the list previews are punchier than the full notes.
 */

export interface NoteItem {
    id: string;            // "#1", "#22", etc.
    icon: string;          // ⊟ glyph with VS-15
    text: string;          // raw markdown
}

export const MOCK_NOTES: NoteItem[] = [
    { id: '#1',    icon: '⊟\uFE0E', text: 'Hold — **waiting** for floor to settle' },
    { id: '#22',   icon: '⊟\uFE0E', text: 'Listed by atlasforge, _check rarity_' },
    { id: '#88',   icon: '⊟\uFE0E', text: '**LAVALAMP** palette. Not selling.' },
    { id: '#147',  icon: '⊟\uFE0E', text: 'Offered `0.12 ETH` — waiting on response' },
    { id: '#203',  icon: '⊟\uFE0E', text: '**Void** + BOSS encounter, rare combo' },
    { id: '#317',  icon: '⊟\uFE0E', text: '**NEONDRIFT** — strong secondary demand' },
    { id: '#412',  icon: '⊟\uFE0E', text: 'Mutual @snowfro hold — _don\'t undercut_' },
    { id: '#500',  icon: '⊟\uFE0E', text: 'Round number, always gets attention' },
    { id: '#555',  icon: '⊟\uFE0E', text: 'Triple digit repeat — _collectors love_' },
    { id: '#777',  icon: '⊟\uFE0E', text: 'Lucky number, `0.4 ETH` floor ask' },
    { id: '#800',  icon: '⊟\uFE0E', text: 'FOLD palette, clean — good hold' },
    { id: '#891',  icon: '⊟\uFE0E', text: '**MACHINEELF** — @gmoney watching' },
    { id: '#919',  icon: '⊟\uFE0E', text: 'Palindrome ID, _niche flex but real_' },
    { id: '#1000', icon: '⊟\uFE0E', text: 'Round milestone, hold for **cultural** value' },
    { id: '#1111', icon: '⊟\uFE0E', text: 'Repeating quad — high collector interest' },
    { id: '#1234', icon: '⊟\uFE0E', text: 'Sequential number, _surprisingly popular_' },
    { id: '#1337', icon: '⊟\uFE0E', text: '**Leet** number, high collector interest' },
    { id: '#1500', icon: '⊟\uFE0E', text: 'Mid-mint round, watch `floor`' },
    { id: '#1701', icon: '⊟\uFE0E', text: 'Trek number for nerds, below floor' },
    { id: '#1888', icon: '⊟\uFE0E', text: '**ULTRALINK** — do not sell below `1 ETH`' },
    { id: '#1969', icon: '⊟\uFE0E', text: 'Moon year — cultural cachet, _keep_' },
    { id: '#2000', icon: '⊟\uFE0E', text: 'Near-end, **scarcity premium** expected' },
    { id: '#2048', icon: '⊟\uFE0E', text: 'Power of 2, _dev community_ knows' },
    { id: '#2100', icon: '⊟\uFE0E', text: '**BTC max supply** echo, collectors notice' },
    { id: '#2121', icon: '⊟\uFE0E', text: 'Mirror pattern, nice edition to show' },
    { id: '#2200', icon: '⊟\uFE0E', text: 'Closing in on final 22, _historical_' },
    { id: '#2210', icon: '⊟\uFE0E', text: 'Only 12 editions above this' },
    { id: '#2219', icon: '⊟\uFE0E', text: '**Penultimate trio** — extremely rare' },
    { id: '#2222', icon: '⊟\uFE0E', text: '#2222 — Final PRISMS. **Never selling this.**' },
];

/*
 * MOCK_DEMO_NOTES — sim 6566-6597 demoNotes map. Keyed by numeric token
 * id. Pre-populated into pd_token_notes when the user taps a list item
 * in the Notes accordion (D013). Sim's openNoteFromList does:
 *   if (!tokenNotes[id] && demoNotes[id]) tokenNotes[id] = demoNotes[id];
 * — i.e. only fills if the user has no existing saved note for that id.
 */
export const MOCK_DEMO_NOTES: Record<number, string> = {
    1:    'Hold — waiting for **floor** to settle after mint rush',
    22:   'Listed by atlasforge, _interesting_ — check rarity',
    88:   'One of my favourites. **LAVALAMP** palette. Not selling.',
    147:  'Offered `0.12 ETH` — waiting on response',
    203:  '**Void** mode + BOSS encounter, rare combo',
    317:  '**NEONDRIFT** — strong secondary demand, watch closely',
    412:  'Mutual collector @snowfro hold — _don\'t undercut_',
    500:  'Round edition number, always gets attention',
    555:  'Triple digit repeat — _collectors love these_',
    777:  'Lucky number edition, priced at `0.4 ETH` floor ask',
    800:  'FOLD palette, clean and minimal — good hold',
    891:  '**MACHINEELF** — @gmoney watching this one',
    919:  'Palindrome ID, _niche flex but real_',
    1000: 'Round 4-digit milestone, hold for **cultural** value',
    1111: 'Repeating quad — _always_ high collector interest',
    1234: 'Sequential number, surprisingly popular with buyers',
    1337: '**Leet** number, high collector interest historically',
    1500: 'Mid-mint round number — watch `floor` movement',
    1701: 'Trek number for the nerds — listed below floor',
    1888: '**ULTRALINK** palette, very rare. Do not sell below `1 ETH`',
    1969: 'Moon year — cultural cachet, _keep hold_',
    2000: 'Near-end edition, **scarcity premium** expected',
    2048: 'Power of 2, _dev community_ knows this one',
    2100: '**BTC max supply** echo — crypto collectors notice',
    2121: 'Mirror pattern, nice edition to show off',
    2200: 'Closing in on final 22 — _historical significance_',
    2210: 'Near end — only 12 editions left above this',
    2219: '**Penultimate trio** — extremely rare placement',
    2222: 'Final edition. The last PRISMS. **Never selling this.**',
};
