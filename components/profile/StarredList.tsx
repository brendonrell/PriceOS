'use client';

/*
 * StarredList — the profile +More → Starred surface.
 *
 * Starred is a PERSONAL BOOKMARK list ("like it, star it, find it later"), not
 * a popularity signal and not the gallery grid. It renders as a compact,
 * sortable + filterable ROW list (expected to grow large) with a small preview
 * thumbnail per row; tapping a row opens the usual Artwork modal. Quick unstar
 * lives on each row so add/remove stays effortless.
 *
 * Rows are keyed by Project+token (slug:id) so the same number across Projects
 * never blurs together. Meta (project / artist) is derived deterministically
 * from the registry — no DB round-trip — so the list paints instantly. The
 * thumbnail lazy-paints when it scrolls into view (own IntersectionObserver, so
 * a long list never paints every canvas up front).
 *
 * Wishlist will reuse this row pattern with a buy/price-focused action set.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { paintOutput } from '../../lib/state/ProjectContext';
import { outputTraits, getProject } from '../../lib/project/registry';
import { toggleStar } from '../../lib/pins/starStore';

export interface StarredItem {
    slug: string;
    id: number;
}

type SortKey = 'recent' | 'id' | 'project';

const SORTS: { key: SortKey; label: string }[] = [
    { key: 'recent',  label: 'Recent'  },
    { key: 'id',      label: '# ID'    },
    { key: 'project', label: 'Project' },
];

/* Lazy-painted preview. Paints the generative art only once the thumb scrolls
   near the viewport, so a large list stays cheap. */
function OutputThumb({ slug, id, size = 64 }: { slug: string; id: number; size?: number }) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        let painted = false;
        const paint = () => {
            if (painted) return;
            painted = true;
            try { paintOutput(cv, slug, id, size * 2); } catch { /* unknown slug — leave blank */ }
        };
        const io = new IntersectionObserver(
            (entries) => { if (entries.some((e) => e.isIntersecting)) { paint(); io.disconnect(); } },
            { rootMargin: '300px' },
        );
        io.observe(cv);
        return () => io.disconnect();
    }, [slug, id, size]);
    return (
        <canvas
            ref={ref}
            className="starred-row-thumb-canvas"
            style={{ width: size, height: size, display: 'block', borderRadius: 6, background: 'var(--stat-bg)' }}
        />
    );
}

export default function StarredList({ items }: { items: StarredItem[] }) {
    const { open } = useModal();
    const { showToast } = useToast();
    const [sortKey, setSortKey] = useState<SortKey>('recent');
    const [query, setQuery] = useState('');

    /* Decorate each item with deterministic display meta (project / artist /
       fate) from the registry. `recentIndex` preserves the original star order
       for the default 'Recent' sort. */
    const rows = useMemo(
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

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? rows.filter((r) =>
                  `${r.project} ${r.artist} #${r.id} ${r.fate}`.toLowerCase().includes(q),
              )
            : rows;
        const sorted = [...filtered];
        if (sortKey === 'id') sorted.sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));
        else if (sortKey === 'project') sorted.sort((a, b) => a.project.localeCompare(b.project) || a.id - b.id);
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sorted;
    }, [rows, query, sortKey]);

    const handleUnstar = (e: React.MouseEvent, slug: string, id: number) => {
        e.stopPropagation();
        toggleStar(slug, id);
        showToast(`Removed from Starred`);
    };

    return (
        <section className="starred-list" aria-label="Starred">
            {/* Sort + filter bar */}
            <div className="starred-list-controls">
                <input
                    className="search-input starred-list-search"
                    type="text"
                    placeholder="Filter starred — @project, @artist, # id…"
                    autoComplete="off"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
                />
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
                            <span className="sort-lbl">{s.label}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Rows */}
            <div className="starred-rows">
                {visible.map((r) => (
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
                        {r.fate && <span className="starred-row-fate">{r.fate}</span>}
                        <span
                            className="starred-row-unstar"
                            role="button"
                            tabIndex={0}
                            title="Remove from Starred"
                            aria-label="Remove from Starred"
                            onClick={(e) => handleUnstar(e, r.slug, r.id)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleUnstar(e as unknown as React.MouseEvent, r.slug, r.id);
                                }
                            }}
                        >
                            ★&#xFE0E;
                        </span>
                    </div>
                ))}
                {visible.length === 0 && (
                    <div className="my-notes-empty-state">
                        <span className="my-notes-empty-msg">No starred pieces match that filter</span>
                    </div>
                )}
            </div>
        </section>
    );
}
