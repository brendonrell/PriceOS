'use client';

/*
 * MsActionBar
 *
 * Sticky bar that appears directly below the navbar whenever multi-select
 * mode is active. Stays visible while the user scrolls so they never
 * need to scroll back to the top to act on their selection.
 *
 * Renders the same <MultiSelectRow> content as TraitsUI previously
 * rendered inline. Mounting it here (in PriceOSShell) means it works
 * from any scroll position on the project page.
 *
 * Position model:
 *   position: sticky; top: 0 — sits just below the navbar in DOM order
 *   (navbar is also sticky top:0; source-order stacking means this bar
 *   tucks under the navbar naturally). z-index: 99 (below navbar's 100).
 *
 * Visibility: renders null when !multiSelectActive, so it takes zero
 * layout space when ms mode is off.
 */

import { useEffect, useState } from 'react';
import { useTraits } from '../../lib/state/TraitsContext';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { useProject } from '../../lib/state/ProjectContext';
import {
    getGrails,
    subscribeGrails,
    MAX_GRAIL_PINS,
} from '../../lib/pins/grailStore';

export function MsActionBar() {
    const { multiSelectActive, selectedIds, clearSelected } = useTraits();
    const { showToast } = useToast();
    const { add: cartAdd, has: cartHas, openPanel: openCartPanel } = useCart();
    const { outputs } = useProject();
    const [pinnedSet, setPinnedSet] = useState<readonly number[]>(() => getGrails());

    useEffect(() => {
        setPinnedSet(getGrails());
        return subscribeGrails((next) => setPinnedSet(next));
    }, []);

    if (!multiSelectActive) return null;

    const count = selectedIds.size;
    const countLabel = count === 1 ? '1 output' : `${count} outputs`;
    const ids = Array.from(selectedIds);

    // Classify selection
    const allOwned  = ids.length > 0 && ids.every(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const anyOwned  = ids.some(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const allListed = ids.every(id => outputs.get(id)?.price != null);

    // Grail pin: hide if selection exceeds remaining slots
    const availablePinSlots = MAX_GRAIL_PINS - pinnedSet.length;
    const grailPinAvailable = allOwned && count > 0 && count <= availablePinSlots;

    const stub = (label: string) => () => {
        if (count === 0) { showToast('Select items first'); return; }
        showToast(`${label} \u00b7 ${countLabel} \u2014 coming soon`);
    };

    const handleAddToCart = () => {
        if (count === 0) { showToast('Select items first'); return; }
        let added = 0;
        ids.forEach((id) => {
            if (!cartHas(id)) { cartAdd(id); added++; }
        });
        if (added === 0) {
            showToast('All selected items already in cart');
        } else {
            showToast(`Added ${added} item${added === 1 ? '' : 's'} to cart`);
        }
        openCartPanel();
    };

    interface Action { label: string; onClick: () => void; }
    const actions: Action[] = [];

    // Universal — Add Note excluded (per-item action, not batch)
    actions.push(
        { label: 'Star',         onClick: stub('Star') },
        { label: 'Wishlist',     onClick: stub('Wishlist') },
        { label: 'Add to Album', onClick: stub('Add to Album') },
        { label: 'Make To-Do',   onClick: stub('Make To-Do') },
    );

    // Not-owned only
    if (!anyOwned && allListed) {
        actions.push({ label: 'Add to Cart', onClick: handleAddToCart });
    }
    if (!anyOwned) {
        actions.push({ label: 'Make Offer', onClick: stub('Make Offer') });
    }

    // Owned-only — List + Transfer are separate pills (mutually exclusive
    // per-action; both shown, stubs note conflict when wired for real)
    if (allOwned) {
        if (grailPinAvailable) {
            actions.push({ label: 'Grail Pin', onClick: stub('Grail Pin') });
        }
        actions.push(
            { label: 'List',     onClick: stub('List') },
            { label: 'Transfer', onClick: stub('Transfer') },
        );
    }

    return (
        <div className="ms-sticky-bar">
            <div className="ms-sticky-bar-inner">
                {/* Count — display only */}
                <span className="ms-count-pill">
                    {count === 0 ? 'Select outputs' : countLabel}
                </span>

                {/* Action pills — only show when something is selected */}
                {count > 0 && actions.map((a) => (
                    <button
                        key={a.label}
                        className="ms-action-pill"
                        onClick={a.onClick}
                        title={a.label}
                    >
                        {a.label}
                    </button>
                ))}

                {/* Deselect All — filled pill, rightmost */}
                {count > 0 && (
                    <button
                        className="ms-action-pill ms-deselect-all"
                        onClick={clearSelected}
                        title="Deselect All"
                    >
                        Deselect All
                    </button>
                )}
            </div>
        </div>
    );
}
