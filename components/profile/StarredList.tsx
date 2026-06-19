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
import { ProjectProvider } from '../../lib/state/ProjectContext';
import { useOutputMeta } from '../../lib/hooks/useOutputMeta';
import { outputTraits, getProject, projectColorway } from '../../lib/project/registry';
import { traitMarketStat, projectMarketStat, artistColor } from '../../lib/market/starredMarket';
import { toggleStar } from '../../lib/pins/starStore';
import { isWishlisted, toggleWishlist, subscribeWishlist } from '../../lib/pins/wishlistStore';
import { toggleTraitStar, type TraitStar } from '../../lib/pins/traitStarStore';
import { removeArtistStar } from '../../lib/pins/artistStarStore';
import { toggleSoundtrackStar, type SoundtrackStar } from '../../lib/pins/soundtrackStarStore';
import { removeProjectStar } from '../../lib/pins/projectStarStore';
import { playlistWatchUrl } from '../../lib/project/soundtrack';
import OutputThumb from './OutputThumb';
import GhostRows from './GhostRows';

export interface StarredItem {
    slug: string;
    id: number;
}

type Mode = 'all' | 'artists' | 'outputs' | 'traits' | 'soundtracks' | 'projects';
type SortKey = 'recent' | 'id' | 'project';

export default function StarredList({
    items,
    traits = [],
    artists = [],
    soundtracks = [],
    projects = [],
    searchOpen = false,
    query = '',
    onQueryChange,
    onCloseSearch,
    multiActive = false,
    onExitMulti,
    sortKey = 'recent',
}: {
    items: StarredItem[];
    traits?: ReadonlyArray<TraitStar>;
    artists?: ReadonlyArray<string>;
    soundtracks?: ReadonlyArray<SoundtrackStar>;
    projects?: ReadonlyArray<string>;
    /* Search is controlled by the parent so its ⌕ icon can live up in the
       +More sub-nav beside the Info pill (where Collected's search lives). */
    searchOpen?: boolean;
    query?: string;
    onQueryChange?: (q: string) => void;
    onCloseSearch?: () => void;
    /* Multi-select, driven by the sub-nav's ❐ icon (same spot as search). */
    multiActive?: boolean;
    onExitMulti?: () => void;
    /* Sort, driven by the sub-nav sort-bar (Recent / # ID / Project). */
    sortKey?: SortKey;
}) {
    const { open } = useModal();
    const { showToast } = useToast();
    const [mode, setMode] = useState<Mode>('all');

    /* Multi-select selection — keys match each row's React key. Cleared when
       multi-select turns off or the filter changes. */
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
    useEffect(() => { setSelected(new Set()); }, [multiActive, mode]);
    const toggleSel = (k: string) =>
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(k)) n.delete(k); else n.add(k);
            return n;
        });
    const handleRemoveSelected = () => {
        if (selected.size === 0) return;
        const inMode = (m: Mode) => mode === 'all' || mode === m;
        if (inMode('outputs')) visibleOutputs.forEach((r) => { if (selected.has(`${r.slug}:${r.id}`)) toggleStar(r.slug, r.id); });
        if (inMode('traits')) visibleTraits.forEach((r) => { if (selected.has(`${r.slug}|${r.category}|${r.value}`)) toggleTraitStar(r.slug, r.category, r.value); });
        if (inMode('artists')) visibleArtists.forEach((r) => { if (selected.has(r.name)) removeArtistStar(r.name); });
        if (inMode('soundtracks')) visibleSoundtracks.forEach((r) => { if (selected.has(`${r.slug}|${r.playlistId}`)) toggleSoundtrackStar(r.slug, r.playlistId, r.title); });
        if (inMode('projects')) visibleProjects.forEach((r) => { if (selected.has(`p:${r.slug}`)) removeProjectStar(r.slug); });
        const n = selected.size;
        setSelected(new Set());
        onExitMulti?.();
        showToast(`Removed ${n} from your Starred List`);
    };

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
                    const PLAT = new Set(['Artist', 'Project', 'Fate', 'PriceDay', 'Sun', 'Moon', 'Rising']);
                    const extra = Object.entries(t)
                        .filter(([k, v]) => !PLAT.has(k) && v)
                        .map(([k, v]) => `${k}: ${v}`)
                        .join(' · ');
                    return {
                        ...it,
                        recentIndex: i,
                        project: t.Project ?? `@${it.slug}`,
                        projectName: getProject(it.slug)?.displayName ?? '',
                        artist: t.Artist ?? '',
                        fate: t.Fate ?? '',
                        extra,
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

    /* Group output rows by Project so each group mounts ONE ProjectProvider —
       that's how each row reads its live listing price (and the Buy CTA lights
       up the instant a piece is listed), the same pattern Wishlist uses. */
    const outputGroups = useMemo(() => {
        const m = new Map<string, typeof visibleOutputs>();
        for (const r of visibleOutputs) {
            const arr = m.get(r.slug) ?? [];
            arr.push(r);
            m.set(r.slug, arr);
        }
        return [...m.entries()];
    }, [visibleOutputs]);

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
                    market: traitMarketStat(t.slug, t.category, t.value),
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

    /* ── Project rows ─────────────────────────────────────────────────── */
    const visibleProjects = useMemo(() => {
        const q = query.trim().toLowerCase();
        const rows = projects
            .filter((slug) => getProject(slug) != null)
            .map((slug, i) => ({ slug, name: getProject(slug)?.displayName ?? `@${slug}`, color: projectColorway(slug) ?? 'var(--stat-bg)', market: projectMarketStat(slug), recentIndex: i }));
        const filtered = q ? rows.filter((r) => `${r.name} ${r.slug}`.toLowerCase().includes(q)) : rows;
        const sorted = [...filtered];
        if (sortKey === 'id' || sortKey === 'project') sorted.sort((a, b) => a.name.localeCompare(b.name));
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sorted;
    }, [projects, query, sortKey]);

    const handleUnstar = (e: React.MouseEvent, slug: string, id: number) => {
        e.stopPropagation();
        toggleStar(slug, id);
        showToast('Removed from your Starred Outputs List');
    };

    const handleWishlist = (e: React.MouseEvent, slug: string, id: number) => {
        e.stopPropagation();
        const r = toggleWishlist(slug, id);
        showToast(r === 'added' ? 'Added to your Wishlist (Private)' : 'Removed from your Wishlist');
    };

    const handleTraitUnstar = (e: React.MouseEvent, t: TraitStar) => {
        e.stopPropagation();
        toggleTraitStar(t.slug, t.category, t.value);
        showToast('Removed from your Starred Traits List');
    };

    const handleArtistUnstar = (e: React.MouseEvent, name: string) => {
        e.stopPropagation();
        removeArtistStar(name);
        showToast('Removed from your Starred Artists List');
    };

    const handleSoundtrackUnstar = (e: React.MouseEvent, s: SoundtrackStar) => {
        e.stopPropagation();
        toggleSoundtrackStar(s.slug, s.playlistId, s.title);
        showToast('Removed from your Starred Soundtracks List');
    };

    /* Brendon's order: All Starred › Artists › Projects › Outputs › Traits ›
       Soundtracks. */
    const PILLS: { key: Mode; label: string; count: number }[] = [
        { key: 'all',         label: 'All Starred', count: outputRows.length + traitRows.length + artists.length + soundtracks.length + visibleProjects.length },
        { key: 'artists',     label: 'Artists',     count: artists.length       },
        { key: 'projects',    label: 'Projects',    count: projects.length      },
        { key: 'outputs',     label: 'Outputs',     count: outputRows.length    },
        { key: 'traits',      label: 'Traits',      count: traitRows.length     },
        { key: 'soundtracks', label: 'Soundtracks', count: soundtracks.length   },
    ];

    const totalVisible =
        mode === 'all' ? visibleOutputs.length + visibleTraits.length + visibleArtists.length + visibleSoundtracks.length + visibleProjects.length
        : mode === 'outputs' ? visibleOutputs.length
        : mode === 'traits' ? visibleTraits.length
        : mode === 'artists' ? visibleArtists.length
        : mode === 'soundtracks' ? visibleSoundtracks.length
        : visibleProjects.length;

    return (
        <section className="starred-list" aria-label="Starred">
            {/* Filter pills + the ⌕ search icon (in the +More sub-nav). */}
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

            {/* Search row — collapsed until the ⌕ icon (in the +More sub-nav) is
                tapped (.open). Sorts live in the sub-nav sort-bar now. */}
            <div className={`search-row${searchOpen ? ' open' : ''}`}>
                <input
                    className="search-input"
                    type="text"
                    placeholder={mode === 'traits' ? 'Filter traits — @project, trait, value…' : 'Filter starred — @project, @artist, # id…'}
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

            {/* Rows — each type renders when 'all' or its own filter is active. */}
            <div className="starred-rows">
                {(mode === 'all' || mode === 'outputs') && (
                    <>
                        {outputGroups.map(([slug, groupRows]) => (
                            <ProjectProvider key={slug} slug={slug}>
                                {groupRows.map((r) => (
                                    <StarredOutputRow
                                        key={`${r.slug}:${r.id}`}
                                        slug={r.slug}
                                        id={r.id}
                                        project={r.project}
                                        artist={r.artist}
                                        extra={r.extra || r.fate}
                                        wished={wishKeys.has(`${r.slug}:${r.id}`)}
                                        multiActive={multiActive}
                                        selected={selected.has(`${r.slug}:${r.id}`)}
                                        onToggleSel={() => toggleSel(`${r.slug}:${r.id}`)}
                                        onOpen={() => open('output', r.id, r.slug)}
                                        onWishlist={(e) => handleWishlist(e, r.slug, r.id)}
                                        onUnstar={(e) => handleUnstar(e, r.slug, r.id)}
                                    />
                                ))}
                            </ProjectProvider>
                        ))}
                    </>
                )}
                {(mode === 'all' || mode === 'traits') && (
                    <>
                        {visibleTraits.map((r) => {
                            const selKey = `${r.slug}|${r.category}|${r.value}`;
                            return (
                            <div
                                key={selKey}
                                className={`starred-row trait-row${multiActive ? ' is-selectable' : ''}${multiActive && selected.has(selKey) ? ' is-selected' : ''}`}
                                role={multiActive ? 'button' : undefined}
                                tabIndex={multiActive ? 0 : undefined}
                                onClick={multiActive ? () => toggleSel(selKey) : undefined}
                                onKeyDown={multiActive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSel(selKey); } } : undefined}
                            >
                                <div className="trait-row-tile">
                                    <span className="trait-row-tile-glyph" style={{ color: r.color }}>★&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">@{r.slug} · {r.category}: {r.value}</span>
                                    <span className="starred-row-sub">Trait</span>
                                    <span className="starred-row-sub">Floor:<em>{r.market.floor}</em></span>
                                    <span className="starred-row-sub">Last:<em>{r.market.lastSale}</em></span>
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
                                    <span className="trait-offer-glyph">✦︎</span> Trait Offer
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
                            );
                        })}
                    </>
                )}
                {(mode === 'all' || mode === 'artists') && (
                    <>
                        {visibleArtists.map((r) => {
                            const act = () => multiActive ? toggleSel(r.name) : window.location.assign('/' + r.handle);
                            return (
                            <div
                                key={r.name}
                                className={`starred-row${multiActive && selected.has(r.name) ? ' is-selected' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={act}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }}
                            >
                                <div className="trait-row-tile artist-tile">
                                    <span className="artist-row-tile-glyph" style={{ color: artistColor(r.handle) }}>✺&#xFE0E;</span>
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
                                    ⚯︎ Follow
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
                            );
                        })}
                    </>
                )}
                {(mode === 'all' || mode === 'soundtracks') && (
                    <>
                        {visibleSoundtracks.map((r) => {
                            const selKey = `${r.slug}|${r.playlistId}`;
                            return (
                            <div
                                key={selKey}
                                className={`starred-row trait-row${multiActive ? ' is-selectable' : ''}${multiActive && selected.has(selKey) ? ' is-selected' : ''}`}
                                role={multiActive ? 'button' : undefined}
                                tabIndex={multiActive ? 0 : undefined}
                                onClick={multiActive ? () => toggleSel(selKey) : undefined}
                                onKeyDown={multiActive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSel(selKey); } } : undefined}
                            >
                                <div className="trait-row-tile artist-tile">
                                    <span className="artist-row-tile-glyph soundtrack-tile-glyph" style={{ color: projectColorway(r.slug) ?? undefined }}>▶&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">{r.title}</span>
                                    <span className="starred-row-sub">Soundtrack</span>
                                </div>
                                <span
                                    className="starred-row-cta"
                                    role="button"
                                    tabIndex={0}
                                    title="Play on YouTube"
                                    aria-label="Play"
                                    onClick={() => window.open(playlistWatchUrl(r.playlistId), '_blank', 'noopener,noreferrer')}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.open(playlistWatchUrl(r.playlistId), '_blank', 'noopener,noreferrer'); } }}
                                >
                                    ▶︎ Play
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
                            );
                        })}
                    </>
                )}
                {(mode === 'all' || mode === 'projects') && (
                    <>
                        {visibleProjects.map((r) => {
                            const selKey = `p:${r.slug}`;
                            return (
                            <div
                                key={selKey}
                                className={`starred-row trait-row${multiActive ? ' is-selectable' : ''}${multiActive && selected.has(selKey) ? ' is-selected' : ''}`}
                                role={multiActive ? 'button' : undefined}
                                tabIndex={multiActive ? 0 : undefined}
                                onClick={multiActive ? () => toggleSel(selKey) : undefined}
                                onKeyDown={multiActive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleSel(selKey); } } : undefined}
                            >
                                <div className="trait-row-tile artist-tile">
                                    <span className="artist-row-tile-glyph" style={{ color: r.color }}>⬚&#xFE0E;</span>
                                </div>
                                <div className="starred-row-meta">
                                    <span className="starred-row-id">{r.name}</span>
                                    <span className="starred-row-sub">Project</span>
                                    <span className="starred-row-sub">Floor:<em>{r.market.floor}</em></span>
                                    <span className="starred-row-sub">Last:<em>{r.market.lastSale}</em></span>
                                </div>
                                <span
                                    className="starred-row-cta"
                                    role="button"
                                    tabIndex={0}
                                    title="View project"
                                    aria-label="View project"
                                    onClick={(e) => { e.stopPropagation(); window.location.assign('/art/' + r.slug); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); window.location.assign('/art/' + r.slug); } }}
                                >
                                    ⬚︎ View
                                </span>
                                <span
                                    className="starred-row-unstar"
                                    role="button"
                                    tabIndex={0}
                                    title="Remove from Starred"
                                    aria-label="Remove from Starred"
                                    onClick={(e) => { e.stopPropagation(); removeProjectStar(r.slug); showToast('Removed from your Starred Projects List'); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); removeProjectStar(r.slug); showToast('Removed from your Starred Projects List'); } }}
                                >
                                    ★&#xFE0E;
                                </span>
                            </div>
                            );
                        })}
                    </>
                )}
                {totalVisible === 0 && <GhostRows variant="starred" />}
            </div>
            {multiActive && (
                <div className="ms-float-bar" role="toolbar" aria-label="Multi-select actions">
                    <div className="ms-float-wrap">
                        <button
                            className="ms-float-action"
                            onClick={handleRemoveSelected}
                            disabled={selected.size === 0}
                        >
                            <span className="ms-float-label">Remove</span>
                        </button>
                    </div>
                    <div className="ms-float-count">
                        {selected.size === 0 ? 'Select items' : `${selected.size} selected`}
                    </div>
                </div>
            )}
        </section>
    );
}

/* One starred Output row. Lives inside a ProjectProvider (grouped by slug) so it
   reads its OWN live listing price: listed → a filled Buy CTA showing the price
   (works the moment a piece is fake-listed); not listed → the Add-to-Wishlist
   CTA. Trait values fill the meta lines either way. */
function StarredOutputRow({
    slug,
    id,
    project,
    artist,
    extra,
    wished,
    multiActive,
    selected,
    onToggleSel,
    onOpen,
    onWishlist,
    onUnstar,
}: {
    slug: string;
    id: number;
    project: string;
    artist: string;
    extra: string;
    wished: boolean;
    multiActive: boolean;
    selected: boolean;
    onToggleSel: () => void;
    onOpen: () => void;
    onWishlist: (e: React.MouseEvent) => void;
    onUnstar: (e: React.MouseEvent) => void;
}) {
    const meta = useOutputMeta(id);
    const listed = meta?.price != null;
    const act = () => (multiActive ? onToggleSel() : onOpen());
    return (
        <div
            className={`starred-row${multiActive && selected ? ' is-selected' : ''}`}
            role="button"
            tabIndex={0}
            onClick={act}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }}
        >
            <OutputThumb slug={slug} id={id} />
            <div className="starred-row-meta">
                <span className="starred-row-id is-split">
                    <span className="srl-handle">{project}</span>
                    <span className="srl-suffix">#{id}</span>
                </span>
                <span className="starred-row-sub">Output</span>
                {artist && <span className="starred-row-sub">{artist}</span>}
                {extra && <span className="starred-row-sub">{extra}</span>}
            </div>
            {listed ? (
                <span
                    className="starred-row-cta is-buy"
                    role="button"
                    tabIndex={0}
                    title={`Buy — ${meta!.price}`}
                    aria-label={`Buy for ${meta!.price}`}
                    onClick={(e) => { e.stopPropagation(); onOpen(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onOpen(); } }}
                >
                    {`▢︎ Buy ${meta!.price}`}
                </span>
            ) : (
                <span
                    className={`starred-row-cta${wished ? ' is-on' : ''}`}
                    role="button"
                    tabIndex={0}
                    title={wished ? 'On your wishlist' : 'Add to wishlist'}
                    aria-label={wished ? 'On your wishlist' : 'Add to wishlist'}
                    onClick={onWishlist}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onWishlist(e as unknown as React.MouseEvent); } }}
                >
                    {wished ? '✛︎ Wishlisted' : '✛︎ Wishlist'}
                </span>
            )}
            <span
                className="starred-row-unstar"
                role="button"
                tabIndex={0}
                title="Remove from Starred"
                aria-label="Remove from Starred"
                onClick={onUnstar}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onUnstar(e as unknown as React.MouseEvent); } }}
            >
                ★&#xFE0E;
            </span>
        </div>
    );
}
