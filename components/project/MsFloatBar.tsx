'use client';

/* Split out of components/project/TraitsUI.tsx 2026-07-06 (tech-debt pass)
   — pure move, no behavior change. */

import React from 'react';
import { useTraits } from '../../lib/state/TraitsContext';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { useMarketSheet } from '../../lib/state/MarketSheetContext';
import { useProject } from '../../lib/state/ProjectContext';
import { getGrails, subscribeGrails, MAX_GRAIL_PINS, type GrailPin } from '../../lib/pins/grailStore';
import { isStarred, toggleStar } from '../../lib/pins/starStore';
import { isWishlisted, toggleWishlist } from '../../lib/pins/wishlistStore';
import { addOutputTodo } from '../../lib/todos/todoStore';
import { getActiveBudgetEth } from '../../lib/engines/budgetEngine';
import AlbumPickerCard from '../album/AlbumPickerCard';
import { formatEth } from '../../lib/format/eth';

/* ── MsFloatBar ─────────────────────────────────────────────────────── */
/*
 * Floating bar: left pill = current action label + ▾ opens a popup,
 * right tab = count (click to deselect all).
 * Popup is an independent modal-style list in Courier New — same look
 * as the links view but entirely separate CSS classes (ms-popup-*).
 * No shared classes with any other modal/overlay in the codebase.
 */
export default function MsFloatBar() {
    const { multiSelectActive, selectedItems, selectedCount, clearSelected } = useTraits();
    const { showToast } = useToast();
    const { add: cartAdd, has: cartHas, openPanel: openCartPanel } = useCart();
    const { openListSheet, openOfferSheet, openTraitPicker } = useMarketSheet();
    const { outputs, slug } = useProject();
    const [pinnedSet, setPinnedSet] = React.useState<readonly GrailPin[]>(() => getGrails());
    const [popupOpen, setPopupOpen] = React.useState(false);
    const [activeAction, setActiveAction] = React.useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [albumPickerOpen, setAlbumPickerOpen] = React.useState(false);

    React.useEffect(() => {
        setPinnedSet(getGrails());
        return subscribeGrails((next) => setPinnedSet(next));
    }, []);

    React.useEffect(() => {
        if (!multiSelectActive) { setPopupOpen(false); setActiveAction(null); setConfirmOpen(false); setAlbumPickerOpen(false); }
    }, [multiSelectActive]);

    if (!multiSelectActive) return null;

    const count = selectedCount;
    const countLabel = count === 1 ? '1 output' : `${count} outputs`;
    /* Single Project here, so every selected key shares this page's slug —
       mapping to bare ids keeps the existing outputs.get(id) lookups intact. */
    const ids = selectedItems.map((it) => it.id);

    const allOwned  = ids.length > 0 && ids.every(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const anyOwned  = ids.some(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const allListed = ids.every(id => outputs.get(id)?.price != null);
    const availablePinSlots = MAX_GRAIL_PINS - pinnedSet.length;
    const grailPinAvailable = allOwned && count > 0 && count <= availablePinSlots;

    const stub = (label: string) => () => {
        if (count === 0) { showToast('Select items first'); return; }
        showToast(`${label} · ${countLabel}: COMING SOON`);
    };

    /* Real save-triad execs (Brendon, 2026-06-12) — Star / Wishlist apply to
       every selected Output that doesn't have the flag yet (idempotent, never
       un-sets); Add to Album opens the picker card instead of a confirm. */
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

    /* Make To-Do — the artwork ❍ across the selection: one BUY to-do per
       selected Output, idempotent (dupes report, never double). */
    const handleTodoAll = () => {
        let added = 0;
        selectedItems.forEach(({ slug: s2, id }) => {
            if (addOutputTodo(s2, id, 'BUY') === 'added') added++;
        });
        showToast(added === 0 ? 'To-Do: ALL ALREADY ADDED' : added === 1 ? 'To-Do: ADDED' : `To-Dos: ADDED · ${added}`);
    };

    const handleAddToCart = () => {
        if (count === 0) { showToast('Select items first'); return; }
        let added = 0;
        selectedItems.forEach(({ slug, id }) => { if (!cartHas(slug, id)) { cartAdd(slug, id); added++; } });
        if (added === 0) showToast('Cart: ALL ALREADY ADDED');
        else showToast(`Cart: ADDED · ${added} item${added === 1 ? '' : 's'}`);
        openCartPanel();
    };

    interface Action { label: string; exec: () => void; }
    const actions: Action[] = [];

    actions.push(
        { label: 'Star',         exec: handleStarAll },
        { label: 'Wishlist',     exec: handleWishlistAll },
        { label: 'Add to Album', exec: () => setAlbumPickerOpen(true) },
        { label: 'Make To-Do',   exec: handleTodoAll },
    );
    const sheetItems = () => selectedItems.map(({ slug: s2, id }) => {
        const price = outputs.get(id)?.price;
        const n = price != null ? parseFloat(price) : NaN;
        return { slug: s2, id, currentPriceEth: Number.isFinite(n) && n > 0 ? n.toFixed(3) : null };
    });
    const handleListSheet  = () => { if (count === 0) { showToast('Select items first'); return; } openListSheet(sheetItems()); };
    const handleOfferSheet = () => { if (count === 0) { showToast('Select items first'); return; } openOfferSheet(sheetItems()); };

    if (!anyOwned && allListed) actions.push({ label: 'Add to Cart',  exec: handleAddToCart });
    if (!anyOwned)              actions.push({ label: 'Make Offer',   exec: handleOfferSheet });
    /* The general-purpose trait-offer tool — exactly ONE selected output
       (Brendon, 2026-07-02): pick a trait off that piece, bid on the trait. */
    if (count === 1)            actions.push({ label: 'Trait Offer',  exec: () => { const it = selectedItems[0]; openTraitPicker(it.slug, it.id); } });
    /* Fill Budget — the Budget spell's checkout: cheapest listed pieces you
       don't own, cumulative up to the ACTIVE budget, straight into the cart. */
    const activeBudget = getActiveBudgetEth();
    if (activeBudget != null && activeBudget > 0) {
        actions.push({
            label: 'Fill Budget',
            exec: () => {
                const candidates: { id: number; eth: number }[] = [];
                outputs.forEach((meta, oid) => {
                    if (meta.isOwnedByBrendon) return;
                    const n = meta.price != null ? parseFloat(meta.price) : NaN;
                    if (Number.isFinite(n) && n > 0 && !cartHas(slug, oid)) candidates.push({ id: oid, eth: n });
                });
                candidates.sort((a, b) => a.eth - b.eth);
                let spent = 0; let added = 0;
                for (const c of candidates) {
                    if (spent + c.eth > activeBudget) break;
                    cartAdd(slug, c.id);
                    spent += c.eth; added++;
                }
                if (added === 0) { showToast('Budget: NOTHING IN REACH'); return; }
                showToast(`Budget: FILLED · ${added} piece${added === 1 ? '' : 's'} · ${formatEth(spent)} ETH`);
                openCartPanel();
            },
        });
    }
    if (allOwned) {
        if (grailPinAvailable)  actions.push({ label: 'Grail Pin',    exec: stub('Grail Pin') });
        actions.push(
            { label: 'List/Re-List', exec: handleListSheet },
            { label: 'Transfer',     exec: stub('Transfer') },
        );
    }
    const current = count === 0
        ? 'Select'
        : (activeAction ?? 'Add to Album');

    const handleSelect = (action: Action) => {
        setActiveAction(action.label);
        setPopupOpen(false);
    };

    const handleExec = () => {
        if (count === 0) return;
        setPopupOpen(false);
        /* Add to Album confirms inside its own picker (choosing the album IS
           the confirmation) — the generic confirm card would be a dead tap.
           Same for the market sheets: pricing + CONFIRM live in the sheet. */
        if (current === 'Add to Album') {
            setAlbumPickerOpen(true);
            return;
        }
        if (current === 'List/Re-List' || current === 'Make Offer' || current === 'Trait Offer') {
            actions.find(a => a.label === current)?.exec();
            return;
        }
        setConfirmOpen(true);
    };

    const handleConfirm = () => {
        setConfirmOpen(false);
        const action = actions.find(a => a.label === current);
        action?.exec();
    };

    return (
        <>
            {/* Floating compound pill */}
            <div className="ms-float-bar" role="toolbar" aria-label="Multi-select actions">
                {/* Add-to-Album picker — floats above the bar like the
                    action picker; choosing an album executes the add. */}
                {albumPickerOpen && (
                    <AlbumPickerCard
                        items={selectedItems}
                        onDone={(msg) => { setAlbumPickerOpen(false); showToast(msg); }}
                        onClose={() => setAlbumPickerOpen(false)}
                    />
                )}
                {/* Anchored action picker — floats above the bar, matches details-popover style */}
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
                                onPointerDown={() => {
                                    setActiveAction(a.label);
                                    setPopupOpen(false);
                                }}
                            >
                                {a.label}
                                {a.label === current && <span className="ms-popup-card-check">✓</span>}
                            </button>
                        ))}
                    </div>
                )}
                {/* Confirmation card — floats above the action pill,
                    same visual style as the action picker. Own classes. */}
                {confirmOpen && (
                    <div className="ms-confirm-card">
                        <div className="ms-confirm-question">
                            {current} {count === 1 ? '1 output' : `${count} outputs`}?
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
                        onClick={(e) => { e.stopPropagation(); setPopupOpen(v => !v); }}
                        title="Choose action"
                        aria-label="Choose action"
                    >
                        {'▾︎'}
                    </button>
                </div>
                {/* Display-only count — no click action */}
                <div className="ms-float-count">
                    {count === 0 ? '—' : countLabel}
                </div>
            </div>
        </>
    );
}

