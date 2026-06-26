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
import { shareLink } from '../../lib/pwa/share';

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
    const onShare = async (e: React.MouseEvent) => {
        stop(e);
        const url = typeof window !== 'undefined' ? `${window.location.origin}/art/${slug}/${id}` : `/art/${slug}/${id}`;
        const r = await shareLink({ url, title: `${collName} #${id} on Price Discussion` });
        if (r === 'copied') showToast('Link: COPIED');
        else if (r === 'unavailable') showToast('Share: UNAVAILABLE');
    };

    /* Same square button as the colorway picker below (.pill-colorway): bordered
       box, glyph centred; the `active` state mirrors the colorway active fill. */
    const Btn = ({ glyph, title, active, onClick, extra }: {
        glyph: string; title: string; active?: boolean; onClick: (e: React.MouseEvent) => void; extra?: string;
    }) => (
        <div
            className={`pill-colorway output-act${active ? ' active' : ''}${extra ? ` ${extra}` : ''}`}
            role="button"
            tabIndex={0}
            title={title}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e as unknown as React.MouseEvent); } }}
        >
            <span>{glyph}</span>
        </div>
    );

    return (
        <div className="output-action-row colorway-pills">
            <Btn glyph={starred ? '★︎' : '☆︎'} title="Star" active={starred} onClick={onStar} extra="output-act-star" />
            <Btn glyph={'✛︎'} title={wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'} active={wishlisted} onClick={onWishlist} />
            <Btn glyph={'◰︎'} title="Add to Album" onClick={(e) => { stop(e); showToast('Added to Album'); }} />
            <Btn glyph={'⊟︎'} title="Add Note" extra="output-act-note" onClick={(e) => { stop(e); openOutputNoteEditor(id); }} />
            <Btn glyph={'❍︎'} title="Make To-Do" extra="output-act-todo" onClick={(e) => { stop(e); showToast('Added to To-Dos'); }} />
            <Btn glyph={'⟟︎'} title="Grail Pin" extra="output-act-grail" onClick={onGrail} />
            <button type="button" className="pill-colorway output-share-btn" title="Share" onClick={onShare}>Share</button>
            {listed && <Btn glyph={'▢︎'} title="Add to Cart" onClick={onCart} />}
        </div>
    );
}
