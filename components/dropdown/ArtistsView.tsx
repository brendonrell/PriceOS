'use client';

/*
 * ArtistsView
 *
 * Sim parity: artistsPanel (sim line 4774-4797) + renderArtistsList /
 * filter / pin / note (sim line 10510-10688).
 *
 * Layout:
 *   ┌──────────────────────────────────────┐
 *   │ ←  (back arrow)                      │  scroll-arrow back to LinksView
 *   │ ARTISTS A-Z                          │  settings-header
 *   │ ┌──────────────────────────────────┐ │
 *   │ │ ☆ @brendon  ⫏  ⚭  ········  ⏼  │ │  pinned rows first, then
 *   │ │ ★ @snowfro  ⫏  ⚭  ········  ⏼  │ │  alphabetical unpinned
 *   │ │  …                               │ │
 *   │ └──────────────────────────────────┘ │  artists-list-container
 *   │ ┌──────────────────────────────────┐ │  artists-filter-sticky
 *   │ │ [ type to filter ]               │ │  artistSearchInput
 *   │ │ ★ Starred  ⫏ Notes  ⚭ Mutuals … │ │  pill-artist-filter chips
 *   │ └──────────────────────────────────┘ │
 *   └──────────────────────────────────────┘
 *
 * Behavior:
 *   - Pin: ☆ ↔ ★ click; toggle persists to localStorage 'pd_artist_pinned'.
 *     Sim caps at 5 pins (line 10554) — we do too. Pinned rows float to
 *     the top, in pin-add order.
 *   - Note: ⫏ click opens the shared NotePromptModal with kind: 'artist'
 *     (extending the discriminated union in NotePromptContext). Notes
 *     persist to 'pd_artist_notes'.
 *   - Filters: chips toggle .active; multiple chips combine as AND logic
 *     (sim line 10643-10657). Search input narrows further.
 *   - Toast: pin/unpin/limit-reached fires showToast() (sim 10552/10554/10556).
 *
 * Filter semantics (sim line 10643-10657):
 *   - rel filters (mutual / following / followers): row passes if rel ∈ active
 *   - status filters (cooldown / active): row passes if status ∈ active
 *   - starred filter: row must be pinned
 *   - notes filter: row must have a note
 *   - search: case-insensitive substring on artist name
 *   All filters AND together; multiple rel chips OR within their group.
 */

import { useCallback, useMemo, useState } from 'react';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useLocalStorage } from '../../lib/hooks/useLocalStorage';
import { useToast } from '../../lib/state/ToastContext';
import { useNotePrompt } from '../../lib/state/NotePromptContext';
import {
    MOCK_ARTISTS,
    REL_ICONS,
    STATUS_ICONS,
    type ArtistRel,
} from '../../lib/data/mockArtists';

const PIN_LIMIT = 5;

type FilterKey =
    | 'starred'
    | 'notes'
    | 'mutual'
    | 'following'
    | 'followers'
    | 'cooldown'
    | 'active';

const FILTER_PILLS: { key: FilterKey; glyph: string; label: string }[] = [
    { key: 'starred',   glyph: '\u2605\uFE0E',  label: 'Starred' },        // ★
    { key: 'notes',     glyph: '\u2ACF\uFE0E',  label: 'Artist Notes' },   // ⫏
    { key: 'mutual',    glyph: '\u26ED\uFE0E',  label: 'Mutuals' },        // ⚭
    { key: 'following', glyph: '\u26EF\uFE0E',  label: 'Following' },      // ⚯
    { key: 'followers', glyph: '\u26AC\uFE0E',  label: 'Followers' },      // ⚬
    { key: 'cooldown',  glyph: '\u23FB\uFE0E',  label: 'Cooldown Mode' },  // ⏻
    { key: 'active',    glyph: '\u23FC\uFE0E',  label: 'Active Mode' },    // ⏼
];

const REL_FILTER_KEYS: FilterKey[] = ['mutual', 'following', 'followers'];
const STATUS_FILTER_KEYS: FilterKey[] = ['cooldown', 'active'];

export function ArtistsView() {
    const { setView } = useDropdown();
    const { showToast } = useToast();
    const { openArtistNoteEditor } = useNotePrompt();

    // Pinned: array (preserves insertion order) backed by localStorage.
    const [pinned, setPinned] = useLocalStorage<string[]>('pd_artist_pinned', []);
    // Notes: map name → text.
    const [notes] = useLocalStorage<Record<string, string>>('pd_artist_notes', {});

    const [search, setSearch] = useState('');
    const [activeFilters, setActiveFilters] = useState<Set<FilterKey>>(new Set());

    const togglePin = useCallback(
        (name: string) => {
            setPinned((prev) => {
                if (prev.includes(name)) {
                    showToast(`Unpinned ${name}`);
                    return prev.filter((n) => n !== name);
                }
                if (prev.length >= PIN_LIMIT) {
                    showToast(`Pin limit reached (${PIN_LIMIT})`);
                    return prev;
                }
                showToast(`Pinned ${name}`);
                return [...prev, name];
            });
        },
        [setPinned, showToast]
    );

    const toggleFilter = useCallback((key: FilterKey) => {
        setActiveFilters((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    }, []);

    const ordered = useMemo(() => {
        const searchLower = search.toLowerCase();
        const activeRels = REL_FILTER_KEYS.filter((k) => activeFilters.has(k)) as ArtistRel[];
        const activeStatuses = STATUS_FILTER_KEYS
            .filter((k) => activeFilters.has(k))
            .map((k) => k as 'cooldown' | 'active');
        const starredOn = activeFilters.has('starred');
        const notesOn = activeFilters.has('notes');

        const filtered = MOCK_ARTISTS.filter((a) => {
            if (searchLower && !a.name.toLowerCase().includes(searchLower)) return false;
            if (activeRels.length > 0 && !activeRels.includes(a.rel)) return false;
            if (activeStatuses.length > 0 && !activeStatuses.includes(a.status)) return false;
            if (starredOn && !pinned.includes(a.name)) return false;
            if (notesOn && !notes[a.name]) return false;
            return true;
        });

        // Pinned rows float to top, in pin-add order; rest stays alphabetical.
        const pinSet = new Set(pinned);
        const pinnedRows = pinned
            .map((name) => filtered.find((a) => a.name === name))
            .filter((a): a is (typeof MOCK_ARTISTS)[number] => Boolean(a));
        const unpinned = filtered.filter((a) => !pinSet.has(a.name));
        return [...pinnedRows, ...unpinned];
    }, [search, activeFilters, pinned, notes]);

    return (
        <div
            id="artistsPanel"
            className="settings-panel"
            style={{ position: 'relative' }}
        >
            <div
                className="scroll-arrow"
                style={{ flexShrink: 0, padding: '4px 10px 0 10px', fontSize: 18 }}
                role="button"
                tabIndex={0}
                onClick={(e) => {
                    e.stopPropagation();
                    setView('links');
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        setView('links');
                    }
                }}
                title="Back"
            >
                {'\u2190\uFE0E'}
            </div>

            <div className="settings-header" style={{ flexShrink: 0 }}>
                ARTISTS A-Z
            </div>

            <div id="artistsList" className="artists-list-container">
                {ordered.length === 0 ? (
                    <div
                        style={{
                            padding: '15px 10px',
                            fontSize: 12,
                            fontFamily: "'Courier New', Courier, monospace",
                            opacity: 0.5,
                            textAlign: 'center',
                        }}
                    >
                        No matches found.
                    </div>
                ) : (
                    ordered.map((a) => {
                        const isPinned = pinned.includes(a.name);
                        const hasNote = Boolean(notes[a.name]);
                        const noteTitle = hasNote
                            ? `Note: ${notes[a.name]!.slice(0, 80)}`
                            : 'Add artist note';
                        const relTitle =
                            a.rel === 'none'
                                ? a.name
                                : `${a.name} — ${a.rel.charAt(0).toUpperCase() + a.rel.slice(1)}`;
                        return (
                            <div
                                key={a.name}
                                className={`artist-row${isPinned ? ' is-pinned' : ''}`}
                                role="button"
                                tabIndex={0}
                                data-rel={a.rel}
                                title={relTitle}
                                onClick={() =>
                                    showToast(`Profile coming soon — ${a.name}`)
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        showToast(`Profile coming soon — ${a.name}`);
                                    }
                                }}
                            >
                                <span
                                    className={`artist-pin-icon${isPinned ? ' active' : ''}`}
                                    title={isPinned ? 'Unpin' : 'Pin to top'}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        togglePin(a.name);
                                    }}
                                >
                                    {isPinned ? '\u2605\uFE0E' : '\u2606\uFE0E'}
                                </span>
                                <span className="artist-name-txt">{a.name}</span>
                                <span
                                    className={`artist-note-icon${hasNote ? ' active' : ''}`}
                                    title={noteTitle}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        openArtistNoteEditor(a.name);
                                    }}
                                >
                                    {'\u2ACF\uFE0E'}
                                </span>
                                {a.rel !== 'none' && (
                                    <span
                                        className="artist-rel-icon"
                                        data-rel-type={a.rel}
                                        title={a.rel.charAt(0).toUpperCase() + a.rel.slice(1)}
                                    >
                                        {REL_ICONS[a.rel]}
                                    </span>
                                )}
                                <div className="artist-leader" />
                                <span
                                    className="artist-status-icon"
                                    title={
                                        a.status === 'active'
                                            ? 'Active Mode'
                                            : 'Cooldown Mode'
                                    }
                                >
                                    {STATUS_ICONS[a.status]}
                                </span>
                            </div>
                        );
                    })
                )}
            </div>

            <div className="artists-filter-sticky">
                <input
                    type="text"
                    id="artistSearchInput"
                    placeholder="[ type to filter ]"
                    autoComplete="off"
                    spellCheck={false}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <div className="artist-filter-pills">
                    {FILTER_PILLS.map((p) => (
                        <div
                            key={p.key}
                            className={`pill-artist-filter${
                                activeFilters.has(p.key) ? ' active' : ''
                            }`}
                            data-rel={p.key}
                            role="button"
                            tabIndex={0}
                            onClick={() => toggleFilter(p.key)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleFilter(p.key);
                                }
                            }}
                        >
                            <span>{p.glyph}</span> {p.label}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
