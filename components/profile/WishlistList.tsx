'use client';

/*
 * WishlistList — the profile +More → Wishlists surface.
 *
 * Wishlist is the "what I want to BUY" list: same compact, sortable/filterable
 * ROW shape as Starred, but financially focused — each row shows the live price
 * and a quick Add-to-Cart for listed pieces, plus one-tap remove. Tapping a row
 * opens the Artwork modal (where the full Buy / Make-Offer flow lives).
 *
 * Rows are grouped by Project under one ProjectProvider each (no DOM node) so
 * each row can read its live listing price/owner from the same reconciled source
 * the gallery uses — without a bespoke endpoint.
 *
 * Private + own-profile only (Wishlist is private, like Stars).
 */

import { useMemo, useState } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { useOutputMeta } from '../../lib/hooks/useOutputMeta';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import { outputTraits, getProject } from '../../lib/project/registry';
import { toggleWishlist } from '../../lib/pins/wishlistStore';
import OutputThumb from './OutputThumb';
import GhostRows from './GhostRows';

export interface WishlistItem {
    slug: string;
    id: number;
}

type SortKey = 'recent' | 'id' | 'project';

const SORTS: { key: SortKey; label: string }[] = [
    { key: 'recent',  label: 'Recent'  },
    { key: 'id',      label: '# ID'    },
    { key: 'project', label: 'Project' },
];

export default function WishlistList({
    items,
    searchOpen = false,
    query = '',
    onQueryChange,
    onCloseSearch,
}: {
    items: WishlistItem[];
    /* Search is controlled by the +More sub-nav's ⌕ icon (shared across the
       searchable +More sub-tabs), same as StarredList. */
    searchOpen?: boolean;
    query?: string;
    onQueryChange?: (q: string) => void;
    onCloseSearch?: () => void;
}) {
    const { showToast } = useToast();
    const [sortKey, setSortKey] = useState<SortKey>('recent');

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
                    };
                }),
        [items],
    );

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? rows.filter((r) => `${r.project} ${r.artist} #${r.id}`.toLowerCase().includes(q))
            : rows;
        const sorted = [...filtered];
        if (sortKey === 'id') sorted.sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));
        else if (sortKey === 'project') sorted.sort((a, b) => a.project.localeCompare(b.project) || a.id - b.id);
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sorted;
    }, [rows, query, sortKey]);

    /* Group the sorted/filtered rows by Project (first-appearance order) so each
       group mounts one ProjectProvider. */
    const groups = useMemo(() => {
        const m = new Map<string, typeof visible>();
        for (const r of visible) {
            const arr = m.get(r.slug) ?? [];
            arr.push(r);
            m.set(r.slug, arr);
        }
        return [...m.entries()];
    }, [visible]);

    return (
        <section className="starred-list" aria-label="Wishlist">
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
                            <span className="sort-lbl">{s.label}</span>
                        </span>
                    ))}
                </div>
            </div>

            {/* Search row — revealed by the +More sub-nav's ⌕ icon, same as Starred. */}
            <div className={`search-row${searchOpen ? ' open' : ''}`}>
                <input
                    className="search-input"
                    type="text"
                    placeholder="Filter wishlist — @project, @artist, # id…"
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

            <div className="starred-rows">
                {groups.map(([slug, groupRows]) => (
                    <ProjectProvider key={slug} slug={slug}>
                        {groupRows.map((r) => (
                            <WishlistRow key={`${r.slug}:${r.id}`} slug={r.slug} id={r.id} project={r.project} artist={r.artist} />
                        ))}
                    </ProjectProvider>
                ))}
                {/* Empty = ghost rows, no copy (Brendon 2026-06-10: show,
                    don't tell — the row shapes imply "this fills up"). */}
                {visible.length === 0 && <GhostRows variant="wishlist" />}
            </div>
        </section>
    );
}

function WishlistRow({
    slug,
    id,
    project,
    artist,
}: {
    slug: string;
    id: number;
    project: string;
    artist: string;
}) {
    const { open } = useModal();
    const { showToast } = useToast();
    const { add: cartAdd, has: cartHas } = useCart();
    const meta = useOutputMeta(id);

    const listed = meta?.price != null;
    const owned = meta?.isOwnedByBrendon ?? false;
    const inCart = cartHas(slug, id);

    const handleRemove = (e: React.MouseEvent) => {
        e.stopPropagation();
        toggleWishlist(slug, id);
        showToast('Wishlist: REMOVED');
    };

    const handleCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (inCart) { showToast('Cart: ALREADY ADDED'); return; }
        cartAdd(slug, id);
        showToast('Cart: ADDED');
    };

    return (
        <div
            className="starred-row"
            role="button"
            tabIndex={0}
            onClick={() => open('output', id, slug)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open('output', id, slug); } }}
        >
            <OutputThumb slug={slug} id={id} />
            <div className="starred-row-meta">
                <span className="starred-row-id">#{id}</span>
                <span className="starred-row-sub">{project}{artist ? ` · ${artist}` : ''}</span>
            </div>
            <span className="wishlist-row-price">{listed ? meta!.price : 'Not listed'}</span>
            {listed && !owned && (
                <span
                    className={`wishlist-row-cart${inCart ? ' in-cart' : ''}`}
                    role="button"
                    tabIndex={0}
                    title={inCart ? 'In cart' : 'Add to cart'}
                    aria-label={inCart ? 'In cart' : 'Add to cart'}
                    onClick={handleCart}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCart(e as unknown as React.MouseEvent); } }}
                >
                    {inCart ? '✓ Cart' : '▢ Cart'}
                </span>
            )}
            <span
                className="starred-row-unstar"
                role="button"
                tabIndex={0}
                title="Remove from Wishlist"
                aria-label="Remove from Wishlist"
                onClick={handleRemove}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRemove(e as unknown as React.MouseEvent); } }}
            >
                ✕&#xFE0E;
            </span>
        </div>
    );
}
