'use client';

/*
 * StarredList — the profile +More → Starred surface.
 *
 * Starred is a PERSONAL BOOKMARK list ("like it, star it, find it later"). It
 * now holds two kinds of bookmark, split by a two-pill filter at the top:
 *
 *   • Outputs — a starred Output (Project + token). Tapping the row opens the
 *     Artwork modal; each row carries a quick Add-to-Wishlist CTA + unstar.
 *   • Traits  — a starred (Project, trait category, value), e.g. Prisms ·
 *     Palette: Hothurt, favourited by long-pressing a trait pill. Each row
 *     carries a Trait Offer CTA (offer flow lands later) + unstar.
 *
 * Rows are a compact, sortable + filterable ROW list with a small preview per
 * row. Meta is derived deterministically from the registry — no DB round-trip —
 * so the list paints instantly.
 */

import { useEffect, useMemo, useState } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { outputTraits, getProject, projectColorway } from '../../lib/project/registry';
import { toggleStar } from '../../lib/pins/starStore';
import { isWishlisted, toggleWishlist, subscribeWishlist } from '../../lib/pins/wishlistStore';
import { toggleTraitStar, type TraitStar } from '../../lib/pins/traitStarStore';
import { removeArtistStar } from '../../lib/pins/artistStarStore';
import { toggleSoundtrackStar, type SoundtrackStar } from '../../lib/pins/soundtrackStarStore';
import { playlistWatchUrl } from '../../lib/project/soundtrack';
import OutputThumb from './OutputThumb';
import GhostRows from './GhostRows';

export interface StarredItem {
    slug: string;
    id: number;
}

type Mode = 'outputs' | 'traits' | 'artists' | 'soundtracks';
type SortKey = 'recent' | 'id' | 'project';

const SORTS: { key: SortKey; label: string }[] = [
    { key: 'recent',  label: 'Recent'  },
    { key: 'id',      label: '# ID'    },
    { key: 'project', label: 'Project' },
];

export default function StarredList({
    items,
    traits = [],
    artists = [],
    soundtracks = [],
    searchOpen = false,
    query = '',
    onQueryChange,
    onCloseSearch,
}: {
    items: StarredItem[];
    traits?: ReadonlyArray<TraitStar>;
    artists?: ReadonlyArray<string>;
    soundtracks?: ReadonlyArray<SoundtrackStar>;
    /* Search is controlled by the parent so its ⌕ icon can live up in the
       +More sub-nav beside the Info pill (where Collected's search lives). */
    searchOpen?: boolean;
    query?: string;
    onQueryChange?: (q: string) => void;
    onCloseSearch?: () => void;
}) {
    const { open } = useModal();
    const { showToast } = useToast();
    const [mode, setMode] = useState<Mode>('outputs');
    const [sortKey, setSortKey] = useState<SortKey>('recent');

    /* Live wishlist membership so each Output row's CTA reflects whether it's
       already on the wishlist (one subscription for the whole list). */
    const [wishKeys, setWishKeys] = useState<ReadonlySet<string>>(new Set());
    useEffect(() => subscribeWishlist((next) => setWishKeys(next)), []);

    /* ── Output rows ──────────────────────────────────────────────────── */
    const outputRows = useMemo(
        () =>
            items
                .filter((it) => getProject(it.slug) != null)
                .map((it, i) => {
                    const t = outputTraits(it.slug, it.id);
                    return {
                        ...it,
                        recentIndex: i,
                        project: t.Project ?? `@${it.slug}`,
                        artist: t.Artist ?? '',
                        fate: t.Fate ?? '',
                    };
                }),
        [items],
    );

    const visibleOutputs = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? outputRows.filter((r) =>
                  `${r.project} ${r.artist} #${r.id} ${r.fate}`.toLowerCase().includes(q),
              )
            : outputRows;
        const sorted = [...filtered];
        if (sortKey === 'id') sorted.sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));
        else if (sortKey === 'project') sorted.sort((a, b) => a.project.localeCompare(b.project) || a.id - b.id);
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sorted;
    }, [outputRows, query, sortKey]);

    /* ── Trait rows ───────────────────────────────────────────────────── */
    const traitRows = useMemo(
        () =>
            traits
                .filter((t) => getProject(t.slug) != null)
                .map((t, i) => ({
                    ...t,
                    recentIndex: i,
                    project: getProject(t.slug)?.displayName ?? `@${t.slug}`,
                    color: projectColorway(t.slug) ?? 'var(--stat-bg)',
                })),
        [traits],
    );

    const visibleTraits = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? traitRows.filter((r) =>
                  `${r.project} ${r.category} ${r.value}`.toLowerCase().includes(q),
              )
            : traitRows;
        const sorted = [...filtered];
        if (sortKey === 'id') sorted.sort((a, b) => a.value.localeCompare(b.value) || a.project.localeCompare(b.project));
        else if (sortKey === 'project') sorted.sort((a, b) => a.project.localeCompare(b.project) || a.value.localeCompare(b.value));
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sorted;
    }, [traitRows, query, sortKey]);

    /* ── Artist rows ──────────────────────────────────────────────────── */
    const visibleArtists = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = artists.map((name, i) => ({ name, handle: name.replace(/^@/, ''), recentIndex: i }));
        const filtered = q ? rows.filter((r) => r.name.toLowerCase().includes(q)) : rows;
        const sorted = [...filtered];
        if (sortKey === 'id' || sortKey === 'project') sorted.sort((a, b) => a.name.localeCompare(b.name));
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sorted;
    }, [artists, query, sortKey]);

    /* ── Soundtrack rows ──────────────────────────────────────────────── */
    const visibleSoundtracks = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = soundtracks.map((s, i) => ({ ...s, recentIndex: i }));
        const filtered = q ? rows.filter((r) => r.title.toLowerCase().includes(q)) : rows;
        const sorted = [...filtered];
        if (sortKey === 'id' || sortKey === 'project') sorted.sort((a, b) => a.title.localeCompare(b.title));
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sorted;
    }, [soundtracks, query, sortKey]);

    const handleUnstar = (e: React.MouseEvent, slug: string, id: number) => {
        e.stopPropagation();
        toggleStar(slug, id);
        showToast('Starred: REMOVED');
    };

    const handleWishlist = (e: React.MouseEvent, slug: string, id: number) => {
        e.stopPropagation();
        const r = toggleWishlist(slug, id);
        showToast(r === 'added' ? 'Wishlist: ADDED' : 'Wishlist: REMOVED');
    };

    const handleTraitUnstar = (e: React.MouseEvent, t: TraitStar) => {
        e.stopPropagation();
        toggleTraitStar(t.slug, t.category, t.value);
        showToast('Starred: REMOVED');
    };

    const handleArtistUnstar = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        removeArtistStar(name);
        showToast('Starred: REMOVED');
    };

    const handleSoundtrackUnstar = (e: React.MouseEvent, s: SoundtrackStar) => {
        e.stopPropagation();
        toggleSoundtrackStar(s.slug, s.playlistId, s.title);
        showToast('Starred: REMOVED');
    };

    const PILLS: { key: Mode; label: string; count: number }[] = [
        { key: 'outputs',     label: 'Outputs',     count: outputRows.length    },
        { key: 'traits',      label: 'Traits',      count: traitRows.length     },
        { key: 'artists',     label: 'Artists',     count: artists.length       },
        { key: 'soundtracks', label: 'Soundtracks', count: soundtracks.length   },
    ];

    return (
        <section className="starred-list" aria-label="Starred">
            {/* Outputs / Traits filter pills + the ⌕ search icon beside them. */}
            <div className="starred-mode-pills">
                {PILLS.map((p) => (
                    <div
                        key={p.key}
                        className={`pill pill-l3${mode === p.key ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setMode(p.key)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode(p.key); } }}
                    >
                        <span className="stat-name">{p.label}</span>
                        {p.count > 0 && <span className="badge">{p.count}</span>}
                    </div>
                ))}
            </div>

            {/* Sort bar */}
            <div className="starred-list-controls">
                <div className="sort-btn-group" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {SORTS.map((s) => (
                        <span
                            key={s.key}
                            className={`sort-btn${sortKey === s.key ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            title={`Sort by ${s.label}`}
                            onClick={() => setSortKey(s.key)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSortKey(s.key); } }}
                        >
                            <span className="sort-lbl">{mode === 'traits' && s.key === 'id' ? 'A–Z' : s.label}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Search row — collapsed until the ⌕ icon is tapped (.open), exactly
                like the project Artworks page's search reveal. */}
            <div className={`search-row${searchOpen ? ' open' : ''}`}>
                <input
                    className="search-input"
                    type="text"
                    placeholder={mode === 'outputs' ? 'Filter starred — @project, @artist, # id…' : 'Filter traits — @project, trait, value…'}
                    autoComplete="off"
                    value={query}
                    onChange={(e) => onQueryChange?.(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
                />
                <span
                    className="search-clear"
                    role="button"
                    tabIndex={0}
                    onClick={() => onCloseSearch?.()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onCloseSearch?.(); } }}
                    title="Clear"
                >
                    ✕&#xFE0E;
                </span>
            </div>

            {/* Rows */}
            <div className="starred-rows">
                {mode === 'outputs' ? (
                    <>
                        {visibleOutputs.map((r) => {
                            const wished = wishKeys.has(`${r.slug}:${r.id}`);
                            return (
                                <div
                                    key={`${r.slug}:${r.id}`}
                                    className="starred-row"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => open('output', r.id, r.slug)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open('output', r.id, r.slug); } }}
                                >
                                    <OutputThumb slug={r.slug} id={r.id} />
                                    <div className="starred-row-meta">
                                        <span className="starred-row-id">#{r.id}</span>
                                        <span className="starred-row-sub">
                                            {r.project}{r.artist ? ` · ${r.artist}` : ''}
                                        </span>
                                    </div>
                                    <span
                                        className={`starred-row-cta${wished ? ' is-on' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        title={wished ? 'On your wishlist' : 'Add to wishlist'}
                                        aria-label={wished ? 'On your wishlist' : 'Add to wishlist'}
                                        onClick={(e) => handleWishlist(e, r.slug, r.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleWishlist(e as unknown as React.MouseEvent, r.slug, r.id); } }}
                                    >
                                        {wished ? '✛︎ Wishlisted' : '✛︎ Wishlist'}
                                    </span>
                                    <span
                                        className="starred-row-unstar"
                                        role="button"
                                        tabIndex={0}
                                        title="Remove from Starred"
                                        aria-label="Remove from Starred"
                                        onClick={(e) => handleUnstar(e, r.slug, r.id)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleUnstar(e as unknown as React.MouseEvent, r.slug, r.id); } }}
                                    >
                                        ★&#xFE0E;
                                    </span>
                                </div>
                            );
                        })}
                        {visibleOutputs.length === 0 && <GhostRows variant="starred" />}
                    </>
                ) : mode === 'traits' ? (
                    <>
                        {visibleTraits.map((r) => (
                            <div
                                key={`${r.slug}|${r.category}|${r.value}`}
                                className="starred-row trait-row"
                            >
                                <div className="trait-row-tile" style={{ background: r.color }}>
                                    <span className="trait-row-tile-glyph">★&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">{r.category}: {r.value}</span>
                                    <span className="starred-row-sub">{r.project}</span>
                                </div>
                                <span
                                    className="starred-row-cta trait-offer-cta"
                                    role="button"
                                    tabIndex={0}
                                    title="Make a trait offer (coming soon)"
                                    aria-label="Make a trait offer"
                                    onClick={() => showToast('Trait Offer: COMING SOON')}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showToast('Trait Offer: COMING SOON'); } }}
                                >
                                    ✦︎ Offer
                                </span>
                                <span
                                    className="starred-row-unstar"
                                    role="button"
                                    tabIndex={0}
                                    title="Remove from Starred"
                                    aria-label="Remove from Starred"
                                    onClick={(e) => handleTraitUnstar(e, r)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleTraitUnstar(e as unknown as React.MouseEvent, r); } }}
                                >
                                    ★&#xFE0E;
                                </span>
                            </div>
                        ))}
                        {visibleTraits.length === 0 && <GhostRows variant="starred" />}
                    </>
                ) : mode === 'artists' ? (
                    <>
                        {visibleArtists.map((r) => (
                            <div
                                key={r.name}
                                className="starred-row"
                                role="button"
                                tabIndex={0}
                                onClick={() => window.location.assign('/' + r.handle)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.assign('/' + r.handle); } }}
                            >
                                <div className="trait-row-tile artist-tile">
                                    <span className="artist-row-tile-glyph">✺&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">{r.name}</span>
                                    <span className="starred-row-sub">Artist</span>
                                </div>
                                <span
                                    className="starred-row-cta"
                                    role="button"
                                    tabIndex={0}
                                    title="Follow (coming soon)"
                                    aria-label="Follow"
                                    onClick={(e) => { e.stopPropagation(); showToast('Follow: COMING SOON'); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); showToast('Follow: COMING SOON'); } }}
                                >
                                    ⚭︎ Follow
                                </span>
                                <span
                                    className="starred-row-unstar"
                                    role="button"
                                    tabIndex={0}
                                    title="Remove from Starred"
                                    aria-label="Remove from Starred"
                                    onClick={(e) => handleArtistUnstar(e, r.name)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleArtistUnstar(e as unknown as React.MouseEvent, r.name); } }}
                                >
                                    ★&#xFE0E;
                                </span>
                            </div>
                        ))}
                        {visibleArtists.length === 0 && <GhostRows variant="starred" />}
                    </>
                ) : (
                    <>
                        {visibleSoundtracks.map((r) => (
                            <div
                                key={`${r.slug}|${r.playlistId}`}
                                className="starred-row trait-row"
                            >
                                <div className="trait-row-tile artist-tile">
                                    <span className="artist-row-tile-glyph">▶&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">{r.title}</span>
                                    <span className="starred-row-sub">Soundtrack</span>
                                </div>
                                <span
                                    className="starred-row-cta"
                                    role="button"
                                    tabIndex={0}
                                    title="Listen on YouTube"
                                    aria-label="Listen"
                                    onClick={() => window.open(playlistWatchUrl(r.playlistId), '_blank', 'noopener,noreferrer')}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(playlistWatchUrl(r.playlistId), '_blank', 'noopener,noreferrer'); } }}
                                >
                                    ▶︎ Listen
                                </span>
                                <span
                                    className="starred-row-unstar"
                                    role="button"
                                    tabIndex={0}
                                    title="Remove from Starred"
                                    aria-label="Remove from Starred"
                                    onClick={(e) => handleSoundtrackUnstar(e, r)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleSoundtrackUnstar(e as unknown as React.MouseEvent, r); } }}
                                >
                                    ★&#xFE0E;
                                </span>
                            </div>
                        ))}
                        {visibleSoundtracks.length === 0 && <GhostRows variant="starred" />}
                    </>
                )}
            </div>
        </section>
    );
}
