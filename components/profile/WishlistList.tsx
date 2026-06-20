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

import { Fragment, useEffect, useMemo, useState } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { useOutputMeta } from '../../lib/hooks/useOutputMeta';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import { outputTraits, getProject } from '../../lib/project/registry';
import { toggleWishlist } from '../../lib/pins/wishlistStore';
import { useStarredPrices, priceOf } from '../../lib/pins/starredPriceStore';
import { useArtistSocial, relGlyphOf, relLabelOf, fmtFollowers } from '../../lib/social/useArtistSocial';
import { outputMarketStat } from '../../lib/market/starredMarket';
import { getGrails, subscribeGrails, togglePinItem, grailKey, type GrailPin } from '../../lib/pins/grailStore';
import OutputThumb from './OutputThumb';
import GhostRows from './GhostRows';

export interface WishlistItem {
    slug: string;
    id: number;
}

type SortKey = 'recent' | 'id' | 'project' | 'price' | 'followers';

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
    viewerAddress,
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
    /* The viewer's wallet (own profile = the owner) — lets each row resolve the
       artist's follow relationship (mutual / following / follower), same as the
       Starred artist rows. */
    viewerAddress?: string | null;
}) {
    const { showToast } = useToast();

    /* Live Grail-pin membership — each wishlist row carries the same grail-pin
       toggle starred rows do, pinning a DISTINCT 'wishlist' kind (Brendon
       2026-06-19) so a wishlisted piece pins separately from a starred output. */
    const [grailKeys, setGrailKeys] = useState<ReadonlySet<string>>(new Set());
    useEffect(() => {
        const apply = (p: readonly GrailPin[]) => setGrailKeys(new Set(p.map(grailKey)));
        apply(getGrails());
        return subscribeGrails(apply);
    }, []);
    const handleGrail = (pin: GrailPin) => {
        const r = togglePinItem(pin);
        if (r === 'limit') { showToast('Grail Pins: 10 MAX'); return; }
        showToast(r === 'pinned' ? 'Grail: PINNED' : 'Grail: UNPINNED');
    };

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
                    const PLAT = new Set(['Artist', 'Project', 'Fate', 'PriceDay', 'Sun', 'Moon', 'Rising']);
                    const extraPairs = Object.entries(t)
                        .filter(([k, v]) => !PLAT.has(k) && v)
                        .map(([k, v]) => ({ k, v: String(v) }));
                    return {
                        ...it,
                        recentIndex: i,
                        project: t.Project ?? `@${it.slug}`,
                        artist: t.Artist ?? '',
                        fate: t.Fate ?? '',
                        extraPairs,
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

            <div className={`starred-rows${multiActive ? ' is-multi' : ''}`}>
                {groups.map(([slug, groupRows]) => (
                    <ProjectProvider key={slug} slug={slug}>
                        {groupRows.map((r) => (
                            <WishlistRow
                                key={`${r.slug}:${r.id}`}
                                slug={r.slug}
                                id={r.id}
                                project={r.project}
                                artist={r.artist}
                                fate={r.fate}
                                extraPairs={r.extraPairs}
                                viewerAddress={viewerAddress}
                                multiActive={multiActive}
                                selected={selected.has(`${r.slug}:${r.id}`)}
                                onToggleSel={() => toggleSel(`${r.slug}:${r.id}`)}
                                grailPinned={grailKeys.has(grailKey({ kind: 'wishlist', slug: r.slug, id: r.id }))}
                                onGrail={() => handleGrail({ kind: 'wishlist', slug: r.slug, id: r.id })}
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
    fate,
    extraPairs,
    viewerAddress,
    multiActive,
    selected,
    onToggleSel,
    grailPinned,
    onGrail,
}: {
    slug: string;
    id: number;
    project: string;
    artist: string;
    fate: string;
    extraPairs: { k: string; v: string }[];
    viewerAddress?: string | null;
    multiActive: boolean;
    selected: boolean;
    onToggleSel: () => void;
    grailPinned: boolean;
    onGrail: () => void;
}) {
    const { open } = useModal();
    const { showToast } = useToast();
    const { add: cartAdd, has: cartHas } = useCart();
    const meta = useOutputMeta(id);

    /* The artist's social tags beside their @name — same treatment as Starred:
       the relationship glyph + follower count (Brendon 2026-06-19). The bare
       handle comes from the registry (the Artist trait is the @display). */
    const artistHandle = getProject(slug)?.artistHandle ?? '';
    const { count, rel } = useArtistSocial(artistHandle, viewerAddress);
    const relGlyph = relGlyphOf(rel);
    const relLabel = relLabelOf(rel);

    /* Floor + last sale for the market lines (deterministic dummy, real shape). */
    const market = outputMarketStat(slug, id);

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
            className={`starred-row wishlist-row${multiActive && selected ? ' is-selected' : ''}`}
            role="button"
            tabIndex={0}
            onClick={act}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); } }}
        >
            <OutputThumb slug={slug} id={id} size={88} />
            <div className="starred-row-meta">
                {/* Top row — same as the Starred output rows: @project + #id. */}
                <span className="starred-row-id is-split">
                    <span className="srl-handle">{project}</span>
                    <span className="srl-suffix">#{id}</span>
                </span>
                <span className="starred-row-sub">
                    {extraPairs.length > 0
                        ? extraPairs.map((p, i) => (
                            <Fragment key={p.k}>{i > 0 ? ' · ' : ''}{p.k}: <em>{p.v}</em></Fragment>
                          ))
                        : (fate || ' ')}
                </span>
                <span className="starred-row-sub">
                    by: {artist || '—'}
                    {artist && (
                        <>
                            <span className="artist-tag is-sm" aria-label="artist">{'✺︎'}</span>
                            {relGlyph && (
                                <span className={`artist-social-ico ${rel === 'mutual' ? 'is-mutual-lg' : 'is-bump'}`} title={relLabel} aria-label={relLabel}>{relGlyph}</span>
                            )}
                            {count != null && count > 0 && (
                                <span className="follower-count">{fmtFollowers(count)}</span>
                            )}
                        </>
                    )}
                </span>
                <span className="starred-row-sub">Floor:<em>{market.floor}</em></span>
                <span className="starred-row-sub">Last:<em>{market.lastSale}</em></span>
            </div>
            <div className="wishlist-row-buy">
                {listed ? (
                    <span className="wishlist-row-price">{meta!.price}</span>
                ) : (
                    <span className="wishlist-row-price wishlist-row-price--stack">Not<br />Listed</span>
                )}
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
            </div>
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
            <WishlistGrailDot pinned={grailPinned} onToggle={onGrail} />
        </div>
    );
}

/* Grail-pin toggle on a wishlist row — same icon + spot as the Starred rows'
   (a plain ⟟ above the ✕), pinning a distinct 'wishlist' kind. */
function WishlistGrailDot({ pinned, onToggle }: { pinned: boolean; onToggle: () => void }) {
    return (
        <span
            className={`starred-row-grail${pinned ? ' is-pinned' : ''}`}
            role="button"
            tabIndex={0}
            title={pinned ? 'Unpin from your Grail pins' : 'Grail Pin'}
            aria-label={pinned ? 'Unpin from your Grail pins' : 'Grail Pin'}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggle(); } }}
        >
            {'⟟︎'}
        </span>
    );
}
