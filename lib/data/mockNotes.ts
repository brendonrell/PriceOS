/*
 * Mock Notes — 30 entries matching the sim's notes-list defaults.
 * Note text supports markdown markers:
 *   **bold**, _italic_, `code`
 * The MarkdownNote renderer in components/dropdown/NotesBox handles
 * those at render time.
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
    { id: '#666',  icon: '⊟\uFE0E', text: '**CRUSH** palette, deepest void' },
    { id: '#777',  icon: '⊟\uFE0E', text: 'Lucky number, `0.4 ETH` floor ask' },
    { id: '#800',  icon: '⊟\uFE0E', text: 'FOLD palette, clean — good hold' },
    { id: '#891',  icon: '⊟\uFE0E', text: '**MACHINEELF** — @gmoney watching' },
    { id: '#919',  icon: '⊟\uFE0E', text: 'Palindrome ID, _niche flex but real_' },
    { id: '#1000', icon: '⊟\uFE0E', text: 'Round milestone, hold for **cultural** value' },
    { id: '#1111', icon: '⊟\uFE0E', text: 'Repeating quad — high collector interest' },
    { id: '#1234', icon: '⊟\uFE0E', text: 'Sequential number, _surprisingly popular_' },
    { id: '#1337', icon: '⊟\uFE0E', text: '**Leet** number, high collector interest' },
    { id: '#1500', icon: '⊟\uFE0E', text: 'Mid-collection round, watch `floor`' },
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
