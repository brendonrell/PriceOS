'use client';

/*
 * HomeFacetBar — the sort / filter / search row for the home project feeds.
 *
 * Now Minting became the platform's de-facto Projects directory (Brendon,
 * 2026-06-13): every graduated project (12+ mints) pours in, so it needs the
 * same kind of controls the project Artworks tab has — minus the gallery-only
 * machinery (multi-select, grid presets, the colorway/sort row). What stays:
 * a few sort pills, an Artist filter, and the search glass.
 *
 * Reuses the house pill/search classes wholesale (.traits-ui, .pill.pill-l1,
 * .pill-l3, .search-row, .search-btn) so it inherits the exact styling of the
 * project + profile bars with no new CSS. Pure presentational — all state
 * lives in the parent (HomePageBody) so the same controls drive whichever
 * feed is showing.
 */

import { useState } from 'react';

export type HomeSort = 'newest' | 'oldest' | 'az';

const SORTS: { key: HomeSort; label: string }[] = [
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
    { key: 'az', label: 'A–Z' },
];

export default function HomeFacetBar({
    sort,
    setSort,
    artists,
    artist,
    setArtist,
    query,
    setQuery,
}: {
    sort: HomeSort;
    setSort: (s: HomeSort) => void;
    artists: readonly string[];
    artist: string | null;
    setArtist: (a: string | null) => void;
    query: string;
    setQuery: (q: string) => void;
}) {
    const [artistOpen, setArtistOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    return (
        <>
            <div className="traits-ui" style={{ display: 'flex' }}>
                <div className="traits-header-bar">
                    <div className="stats-container">
                        {SORTS.map((s) => {
                            const active = sort === s.key;
                            return (
                                <div
                                    key={s.key}
                                    className={`pill pill-l1${active ? ' active' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    title={`Sort: ${s.label}`}
                                    onClick={() => setSort(s.key)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSort(s.key);
                                        }
                                    }}
                                >
                                    <span className="stat-name">{s.label}</span>
                                </div>
                            );
                        })}

                        {artists.length > 0 && (
                            <div
                                className={`pill pill-l1${artist ? ' active' : ''}${
                                    artistOpen && !artist ? ' active' : ''
                                }`}
                                role="button"
                                tabIndex={0}
                                title="Filter by artist"
                                onClick={() => setArtistOpen((o) => !o)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setArtistOpen((o) => !o);
                                    }
                                }}
                            >
                                <span className="stat-name">
                                    {artist ? `@${artist}` : 'Artist'}
                                </span>
                            </div>
                        )}

                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 8,
                                flexShrink: 0,
                                marginLeft: 6,
                            }}
                        >
                            <div
                                className={`search-btn${searchOpen ? ' active' : ''}`}
                                role="button"
                                tabIndex={0}
                                title="Search"
                                onClick={() => setSearchOpen((o) => !o)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setSearchOpen((o) => !o);
                                    }
                                }}
                            >
                                ⌕&#xFE0E;
                            </div>
                        </div>
                    </div>
                </div>

                {/* Artist value list — opens under the pills (mirrors the
                    project page's L3 value pills). Selecting the active one
                    clears the filter. */}
                {artistOpen && artists.length > 0 && (
                    <div className="stats-container" style={{ display: 'flex' }}>
                        {artists.map((a) => {
                            const active = artist === a;
                            const dimmed = artist != null && !active;
                            return (
                                <div
                                    key={a}
                                    className={`pill pill-l3${active ? ' active' : ''}${
                                        dimmed ? ' dimmed' : ''
                                    }`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setArtist(active ? null : a)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setArtist(active ? null : a);
                                        }
                                    }}
                                >
                                    <span className="stat-name">↳ @{a}</span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Search row — pops open on the glass (mirrors the project bar). */}
            <div className={`search-row${searchOpen ? ' open' : ''}`}>
                <input
                    className="search-input"
                    type="text"
                    placeholder="project or @artist…"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
                    }}
                />
                <span
                    className="search-clear"
                    role="button"
                    tabIndex={0}
                    title="Clear"
                    onClick={() => {
                        setQuery('');
                        setSearchOpen(false);
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setQuery('');
                            setSearchOpen(false);
                        }
                    }}
                >
                    ✕&#xFE0E;
                </span>
            </div>
        </>
    );
}
