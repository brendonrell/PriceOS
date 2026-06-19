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

import { useEffect, useMemo, useState } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { useOutputMeta } from '../../lib/hooks/useOutputMeta';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import { outputTraits, getProject } from '../../lib/project/registry';
import { toggleWishlist } from '../../lib/pins/wishlistStore';
import { useStarredPrices, priceOf } from '../../lib/pins/starredPriceStore';
import OutputThumb from './OutputThumb';
import GhostRows from './GhostRows';

export interface WishlistItem {
    slug: string;
    id: number;
}

type SortKey = 'recent' | 'id' | 'project' | 'price';

export default function WishlistList({
    items,
    searchOpen = false,
    query = '',
    onQueryChange,
    onCloseSearch,
    multiActive = false,
    onExitMulti,
    sortKey = 'recent',
    sortDir = 'asc',
}: {
    items: WishlistItem[];
    /* Search is controlled by the +More sub-nav's ⌕ icon (shared across the
       searchable +More sub-tabs), same as StarredList. */
    searchOpen?: boolean;
    query?: string;
    onQueryChange?: (q: string) => void;
    onCloseSearch?: () => void;
    /* Multi-select, driven by the sub-nav's ❐ icon. */
    multiActive?: boolean;
    onExitMulti?: () => void;
    /* Sort, driven by the sub-nav sort-bar (Recent / #ID / Project) — tap the
       active one to flip direction. */
    sortKey?: SortKey;
    sortDir?: 'asc' | 'desc';
}) {
    const { showToast } = useToast();
    const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
    useEffect(() => { setSelected(new Set()); }, [multiActive]);
    const toggleSel = (k: string) =>
        setSelected((prev) => {
            const n = new Set(prev);
            if (n.has(k)) n.delete(k); else n.add(k);
            return n;
        });

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

    const slugs = useMemo(() => [...new Set(rows.map((r) => r.slug))], [rows]);
    const pricesVer = useStarredPrices(slugs);

    const visible = useMemo(() => {
        const q = query.trim().toLowerCase();
        const filtered = q
            ? rows.filter((r) => `${r.project} ${r.artist} #${r.id}`.toLowerCase().includes(q))
            : rows;
        const sorted = [...filtered];
        if (sortKey === 'price') {
            const dirMul = sortDir === 'desc' ? -1 : 1;
            sorted.sort((a, b) => {
                const pa = priceOf(a.slug, a.id);
                const pb = priceOf(b.slug, b.id);
                if (pa == null && pb == null) return a.id - b.id;
                if (pa == null) return 1;
                if (pb == null) return -1;
                return (pa - pb) * dirMul;
            });
            return sorted;
        }
        if (sortKey === 'id') sorted.sort((a, b) => a.id - b.id || a.slug.localeCompare(b.slug));
        else if (sortKey === 'project') sorted.sort((a, b) => a.project.localeCompare(b.project) || a.id - b.id);
        else sorted.sort((a, b) => a.recentIndex - b.recentIndex);
        return sortDir === 'desc' ? [...sorted].reverse() : sorted;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, query, sortKey, sortDir, pricesVer]);

    const handleRemoveSelected = () => {
        if (selected.size === 0) return;
        const n = selected.size;
        visible.forEach((r) => { if (selected.has(`${r.slug}:${r.id}`)) toggleWishlist(r.slug, r.id); });
        setSelected(new Set());
        onExitMulti?.();
        showToast(`Removed ${n} from your Wishlist`);
    };

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
            {/* Search row — revealed by the +More sub-nav's ⌕ icon, same as Starred.
                Sorts live in the sub-nav sort-bar now. */}
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
                            <WishlistRow
                                key={`${r.slug}:${r.id}`}
                                slug={r.slug}
                                id={r.id}
                                project={r.project}
                                artist={r.artist}
                                multiActive={multiActive}
                                selected={selected.has(`${r.slug}:${r.id}`)}
                                onToggleSel={() => toggleSel(`${r.slug}:${r.id}`)}
                            />
                        ))}
                    </ProjectProvider>
                ))}
                {/* Empty = ghost rows, no copy (Brendon 2026-06-10: show,
                    don't tell — the row shapes imply "this fills up"). */}
                {visible.length === 0 && <GhostRows variant="wishlist" />}
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

function WishlistRow({
    slug,
    id,
    project,
    artist,
    multiActive,
    selected,
    onToggleSel,
}: {
    slug: string;
    id: number;
    project: string;
    artist: string;
    multiActive: boolean;
    selected: boolean;
    onToggleSel: () => void;
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
        showToast('Removed from your Wishlist');
    };

    const handleCart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (inCart) { showToast('Cart: ALREADY ADDED'); return; }
        cartAdd(slug, id);
        showToast('Cart: ADDED');
    };

    const act = () => (multiActive ? onToggleSel() : open('output', id, slug));
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
