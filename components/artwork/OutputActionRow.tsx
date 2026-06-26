'use client';

/*
 * OutputActionRow — the artwork-modal action buttons (Star · Wishlist · Album ·
 * Note · To-Do · Grail · Cart), rendered as a static row just below the Output
 * art on its page. Same glyphs, stores, handlers, and toasts as the gallery
 * card's hover row (components/ArtworkCard.tsx) — lifted so the page reuses the
 * real behaviour, recoloured for the on-page background (not the dark scrim).
 */

import { useEffect, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { useNotePrompt } from '../../lib/state/NotePromptContext';
import { getProject } from '../../lib/project/registry';
import { getGrails, subscribeGrails, togglePin as storeTogglePin, type GrailPin } from '../../lib/pins/grailStore';
import { getStarredKeys, subscribeStarred, toggleStar as storeToggleStar } from '../../lib/pins/starStore';
import { getWishlistKeys, subscribeWishlist, toggleWishlist as storeToggleWishlist } from '../../lib/pins/wishlistStore';

export default function OutputActionRow({
    slug, id, listed,
}: { slug: string; id: number; listed: boolean; owned: boolean }) {
    const { showToast } = useToast();
    const { add: cartAdd, has: cartHas, items: cartItems } = useCart();
    const { openOutputNoteEditor } = useNotePrompt();

    const projectTitle = getProject(slug)?.displayName ?? slug;
    const collName = projectTitle.charAt(0) + projectTitle.slice(1).toLowerCase();

    const [pinnedSet, setPinnedSet] = useState<readonly GrailPin[]>(() => getGrails());
    useEffect(() => { setPinnedSet(getGrails()); return subscribeGrails(setPinnedSet); }, []);
    const [starredKeys, setStarredKeys] = useState<ReadonlySet<string>>(() => getStarredKeys());
    useEffect(() => { setStarredKeys(getStarredKeys()); return subscribeStarred(setStarredKeys); }, []);
    const [wishlistKeys, setWishlistKeys] = useState<ReadonlySet<string>>(() => getWishlistKeys());
    useEffect(() => { setWishlistKeys(getWishlistKeys()); return subscribeWishlist(setWishlistKeys); }, []);

    const starred = starredKeys.has(`${slug}:${id}`);
    const wishlisted = wishlistKeys.has(`${slug}:${id}`);

    const stop = (e: React.MouseEvent) => e.stopPropagation();

    const onStar = (e: React.MouseEvent) => {
        stop(e);
        const r = storeToggleStar(slug, id);
        showToast(r === 'starred' ? 'Added to your Starred Outputs List (Private)' : 'Removed from your Starred Outputs List');
    };
    const onWishlist = (e: React.MouseEvent) => {
        stop(e);
        const r = storeToggleWishlist(slug, id);
        showToast(r === 'added' ? 'Added to your Wishlist (Private)' : 'Removed from your Wishlist');
    };
    const onGrail = (e: React.MouseEvent) => {
        stop(e);
        const r = storeTogglePin(slug, id);
        if (r === 'limit') { showToast('Grail Pin Limit: 10 MAX'); return; }
        showToast(r === 'unpinned' ? `${collName} #${id} DE-PINNED` : `${collName} #${id} GRAIL PINNED`);
    };
    const onCart = (e: React.MouseEvent) => {
        stop(e);
        if (cartHas(slug, id)) { showToast(`${collName} #${id}: ALREADY IN CART`); return; }
        cartAdd(slug, id);
        const next = cartItems.length + 1;
        showToast(`Added to cart · ${next} item${next === 1 ? '' : 's'}`);
    };

    return (
        <div className="output-action-row">
            <span className={`hi-icon${starred ? ' active-star' : ''}`} title="Star" onClick={onStar}>
                {starred ? '★︎' : '☆︎'}
            </span>
            <span className={`hi-icon${wishlisted ? ' active-star' : ''}`} title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'} onClick={onWishlist}>
                {'✛︎'}
            </span>
            <span className="hi-icon" title="Add to Album" onClick={(e) => { stop(e); showToast('Added to Album'); }}>
                {'◰︎'}
            </span>
            <span className="hi-icon hi-note" title="Add Note" onClick={(e) => { stop(e); openOutputNoteEditor(id); }}>
                {'⊟︎'}
            </span>
            <span className="hi-icon hi-todo" title="Make To-Do" onClick={(e) => { stop(e); showToast('Added to To-Dos'); }}>
                {'❍︎'}
            </span>
            <span className="hi-icon hi-grail" title="Grail Pin" onClick={onGrail}>
                {'⟟︎'}
            </span>
            {listed && (
                <span className="hi-icon hi-cart" title="Add to Cart" onClick={onCart}>
                    {'▢︎'}
                </span>
            )}
        </div>
    );
}
