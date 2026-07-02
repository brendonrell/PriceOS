'use client';

/*
 * HomeMsFloatBar — multi-select action bar for the home carousels.
 *
 * Same visual shell + ms-* classes as the project / Collected float bars, but
 * home is the one MIXED-ownership zone: the selected Output cards can be a blend
 * of pieces you own and pieces you don't, spanning many projects. So the action
 * menu adapts to the SELECTION:
 *   - Universal (any piece):   Star · Wishlist · Add to Album · Make To-Do
 *   - On pieces you own:       Add to Showcase · List/Re-List · Transfer
 *   - On pieces you don't:     Make Offer · Add to Cart (when listed)
 * Each action runs on just its eligible subset; the toast reports how many it
 * hit. Ownership / listing per piece is read from visibleMarketStore, which the
 * cards publish while multi-select is active.
 *
 * Star / Wishlist / Add to Album execute for real (id-keyed stores); the rest
 * stay coming-soon stubs until their flows ship — parity with the other bars.
 */

import { useEffect, useMemo, useState } from 'react';
import { useTraits } from '../../lib/state/TraitsContext';
import { useToast } from '../../lib/state/ToastContext';
import { isStarred, toggleStar } from '../../lib/pins/starStore';
import { isWishlisted, toggleWishlist } from '../../lib/pins/wishlistStore';
import AlbumPickerCard from '../album/AlbumPickerCard';
import { getMarket, subscribeMarket } from '../../lib/home/visibleMarketStore';
import { useMarketSheet } from '../../lib/state/MarketSheetContext';
import { useCart } from '../../lib/state/CartContext';

export default function HomeMsFloatBar() {
    const { multiSelectActive, selectedItems, selectedCount } = useTraits();
    const { showToast } = useToast();
    const { openListSheet, openOfferSheet, openTraitPicker } = useMarketSheet();
    const { add: cartAdd, has: cartHas, openPanel: openCartPanel } = useCart();
    const [popupOpen, setPopupOpen] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [albumPickerOpen, setAlbumPickerOpen] = useState(false);

    /* Re-render when card market snapshots land/change so the menu reflects
       ownership as it resolves. */
    const [, force] = useState(0);
    useEffect(() => subscribeMarket(() => force((n) => n + 1)), []);

    useEffect(() => {
        if (!multiSelectActive) { setPopupOpen(false); setActiveAction(null); setConfirmOpen(false); setAlbumPickerOpen(false); }
    }, [multiSelectActive]);

    /* Split the selection by ownership / listing from the published snapshots. */
    const split = useMemo(() => {
        const owned: { slug: string; id: number }[] = [];
        const notOwned: { slug: string; id: number }[] = [];
        let listedNotOwned = 0;
        for (const it of selectedItems) {
            const snap = getMarket(it.slug, it.id);
            if (snap?.owned) owned.push(it);
            else {
                notOwned.push(it);
                if (snap?.listed) listedNotOwned++;
            }
        }
        return { owned, notOwned, listedNotOwned };
        // selectedItems identity changes on every selection edit; force bumps re-read.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedItems, multiSelectActive]);

    if (!multiSelectActive) return null;

    const count = selectedCount;
    const countLabel = count === 1 ? '1 output' : `${count} outputs`;

    interface Action { label: string }
    const actions: Action[] = [
        { label: 'Star' },
        { label: 'Wishlist' },
        { label: 'Add to Album' },
        { label: 'Make To-Do' },
    ];
    if (split.owned.length > 0) {
        actions.push(
            { label: 'Add to Showcase' },
            { label: 'List/Re-List' },
            { label: 'Transfer' },
        );
    }
    if (split.notOwned.length > 0) {
        actions.push({ label: 'Make Offer' });
        if (split.listedNotOwned > 0) actions.push({ label: 'Add to Cart' });
    }
    /* Trait Offer — the one-selected general-purpose tool (any output). */
    if (count === 1) actions.push({ label: 'Trait Offer' });

    const current = count === 0 ? 'Select' : (activeAction ?? 'Add to Album');

    /* Universal exec — Star / Wishlist apply idempotently across the whole
       selection. */
    const handleStarAll = () => {
        let added = 0;
        selectedItems.forEach(({ slug, id }) => {
            if (!isStarred(slug, id)) { toggleStar(slug, id); added++; }
        });
        showToast(added === 0 ? 'ALL ALREADY STARRED' : `Added ${added} to your Starred Outputs List (Private)`);
    };
    const handleWishlistAll = () => {
        let added = 0;
        selectedItems.forEach(({ slug, id }) => {
            if (!isWishlisted(slug, id)) { toggleWishlist(slug, id); added++; }
        });
        showToast(added === 0 ? 'ALL ALREADY WISHLISTED' : `Added ${added} to your Wishlist (Private)`);
    };

    /* Ownership-scoped stubs — report how many eligible pieces the action hit. */
    const ownerEligible = ['Add to Showcase', 'List/Re-List', 'Transfer'];
    const buyerEligible = ['Make Offer'];
    const eligibleCount = (action: string): number => {
        if (ownerEligible.includes(action)) return split.owned.length;
        if (action === 'Add to Cart') return split.listedNotOwned;
        if (buyerEligible.includes(action)) return split.notOwned.length;
        return count; // universal
    };

    const handleExec = () => {
        if (count === 0) return;
        setPopupOpen(false);
        if (current === 'Add to Album') { setAlbumPickerOpen(true); return; }
        /* The market sheets carry their own pricing + CONFIRM — no double confirm. */
        if (current === 'List/Re-List') {
            if (split.owned.length === 0) { showToast('List/Re-List: NONE ELIGIBLE'); return; }
            openListSheet(sheetItems(split.owned));
            return;
        }
        if (current === 'Make Offer') {
            if (split.notOwned.length === 0) { showToast('Make Offer: NONE ELIGIBLE'); return; }
            openOfferSheet(sheetItems(split.notOwned));
            return;
        }
        if (current === 'Trait Offer') {
            const it = selectedItems[0];
            if (it) openTraitPicker(it.slug, it.id);
            return;
        }
        setConfirmOpen(true);
    };
    const sheetItems = (subset: { slug: string; id: number }[]) =>
        subset.map(({ slug, id }) => {
            const snap = getMarket(slug, id);
            return {
                slug, id,
                currentPriceEth: snap?.price != null && snap.price > 0 ? snap.price.toFixed(3) : null,
            };
        });
    const handleAddToCart = () => {
        let added = 0;
        for (const it of split.notOwned) {
            const snap = getMarket(it.slug, it.id);
            if (snap?.listed && !cartHas(it.slug, it.id)) { cartAdd(it.slug, it.id); added++; }
        }
        if (added === 0) showToast('Cart: ALL ALREADY ADDED');
        else showToast(`Cart: ADDED · ${added} item${added === 1 ? '' : 's'}`);
        openCartPanel();
    };

    const handleConfirm = () => {
        setConfirmOpen(false);
        if (current === 'Star') { handleStarAll(); return; }
        if (current === 'Wishlist') { handleWishlistAll(); return; }
        const n = eligibleCount(current);
        const lbl = n === 1 ? '1 output' : `${n} outputs`;
        if (n === 0) { showToast(`${current}: NONE ELIGIBLE`); return; }
        if (current === 'Add to Cart') { handleAddToCart(); return; }
        showToast(`${current} · ${lbl}: COMING SOON`);
    };

    return (
        <div className="ms-float-bar" role="toolbar" aria-label="Multi-select actions">
            {albumPickerOpen && (
                <AlbumPickerCard
                    items={selectedItems}
                    onDone={(msg) => { setAlbumPickerOpen(false); showToast(msg); }}
                    onClose={() => setAlbumPickerOpen(false)}
                />
            )}
            {popupOpen && (
                <div className="ms-popup-card">
                    <div className="ms-popup-card-header">Action</div>
                    {actions.map((a) => (
                        <button
                            key={a.label}
                            className={
                                'ms-popup-card-item' +
                                (a.label === current ? ' ms-popup-card-item--active' : '')
                            }
                            onPointerDown={() => { setActiveAction(a.label); setPopupOpen(false); }}
                        >
                            {a.label}
                            {a.label === current && <span className="ms-popup-card-check">✓</span>}
                        </button>
                    ))}
                </div>
            )}
            {confirmOpen && (
                <div className="ms-confirm-card">
                    <div className="ms-confirm-question">
                        {current} {eligibleCount(current) === 1 ? '1 output' : `${eligibleCount(current)} outputs`}?
                    </div>
                    <div className="ms-confirm-btns">
                        <button
                            className="ms-confirm-btn ms-confirm-btn--cancel"
                            onPointerDown={() => setConfirmOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            className="ms-confirm-btn ms-confirm-btn--ok"
                            onPointerDown={handleConfirm}
                        >
                            Confirm
                        </button>
                    </div>
                </div>
            )}
            <div className="ms-float-wrap">
                <button
                    className="ms-float-action"
                    onClick={handleExec}
                    title={count === 0 ? undefined : (current ?? undefined)}
                >
                    <span className="ms-float-label">{current}</span>
                </button>
                <button
                    className="ms-float-arrow"
                    onClick={(e) => { e.stopPropagation(); setPopupOpen((v) => !v); }}
                    title="Choose action"
                    aria-label="Choose action"
                >
                    {'▾︎'}
                </button>
            </div>
            <div className="ms-float-count">
                {count === 0 ? '—' : countLabel}
            </div>
        </div>
    );
}
