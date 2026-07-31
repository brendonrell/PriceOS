'use client';

/*
 * OutputActionRow — the artwork-modal action buttons (Star · Wishlist · Album ·
 * Note · To-Do · Grail · Shadow · Cart), rendered as a static row just below the Output
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
import TodoVerbBubble from '../shared/TodoVerbBubble';
import { anchorFromEvent, type BubbleAnchor } from '../shared/TailBubble';
import { getStarredKeys, subscribeStarred, toggleStar as storeToggleStar } from '../../lib/pins/starStore';
import { getWishlistKeys, subscribeWishlist, toggleWishlist as storeToggleWishlist } from '../../lib/pins/wishlistStore';
import { readNoteFor } from '../../lib/notes/tokenNotes';
import { shareLink } from '../../lib/pwa/share';
import { useLongPress } from '../../lib/hooks/useLongPress';
import AddToListCard from '../lists/AddToListCard';

export default function OutputActionRow({
    slug, id, listed, owned, searchActive, onToggleSearch,
}: { slug: string; id: number; listed: boolean; owned: boolean; searchActive: boolean; onToggleSearch: () => void }) {
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

    /* Does this Output already have a saved note? Same store + signal the gallery
       card reads, so the action-row button lights up when a note exists.
       Project-exact key first, legacy bare-id fallback (per-project split). */
    /* The To-Do card, anchored on the ❍ that opened it — the SAME card the
       artwork modal runs, so the page offers all four verbs instead of a
       hardcoded BUY. That is why an owner gets it now: LIST and SEND are
       exactly what you want on your own piece (Brendon, 2026-07-31). */
    const [todoAnchor, setTodoAnchor] = useState<BubbleAnchor | null>(null);

    const [noteText, setNoteText] = useState('');
    useEffect(() => {
        const read = () => setNoteText(readNoteFor(slug, id));
        read();
        window.addEventListener('pd:notes-changed', read);
        window.addEventListener('storage', read);
        return () => {
            window.removeEventListener('pd:notes-changed', read);
            window.removeEventListener('storage', read);
        };
    }, [slug, id]);

    const starred = starredKeys.has(`${slug}:${id}`);
    const wishlisted = wishlistKeys.has(`${slug}:${id}`);
    const pinned = pinnedSet.some((p) => p.kind === 'output' && p.slug === slug && p.id === id);
    const hasNote = noteText.trim().length > 0;

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
        const r = await shareLink({ url, title: `${projectTitle} #${id} on Price Discussion` });
        if (r === 'copied') showToast('Link: COPIED');
        else if (r === 'unavailable') showToast('Share: UNAVAILABLE');
    };

    /* HOLD THE STAR → ADD TO LIST (Brendon, 2026-07-26). The tap still stars;
       the hold opens the same sheet the Starred rows use. */
    const [listOpen, setListOpen] = useState(false);
    const holdStar = useLongPress(() => setListOpen(true));

    /* Same square button as the colorway picker below (.pill-colorway): bordered
       box, glyph centred; the `active` state mirrors the colorway active fill. */
    const Btn = ({ glyph, title, active, onClick, extra, dead, hold }: {
        glyph: string; title: string; active?: boolean; onClick: (e: React.MouseEvent) => void; extra?: string;
        /** Press-and-hold handlers spread onto the button. */
        hold?: Record<string, unknown>;
        /* DEAD = the verb doesn't apply to this piece for this viewer (today:
           the acquisition verbs on a piece you already own). Half-opacity and
           inert — the one place fading is allowed, because here the fade IS
           the meaning: a disabled control (CLAUDE.md §Rule 2). */
        dead?: boolean;
    }) => (
        <div
            className={`pill-colorway output-act${active && !dead ? ' active' : ''}${dead ? ' output-act-dead' : ''}${extra ? ` ${extra}` : ''}`}
            role="button"
            tabIndex={dead ? -1 : 0}
            aria-disabled={dead || undefined}
            title={title}
            {...(dead ? null : hold)}
            onClick={dead ? (e) => e.stopPropagation() : onClick}
            onKeyDown={(e) => {
                if (dead) return;
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(e as unknown as React.MouseEvent); }
            }}
        >
            <span>{glyph}</span>
        </div>
    );

    return (
        <div className="output-action-row colorway-pills">
            <Btn glyph={starred ? '★︎' : '☆︎'} title="Star — hold to add to a list" active={starred} onClick={onStar} extra="output-act-star" hold={holdStar} />
            <Btn
                glyph={'✛︎'}
                title={owned ? "You own this — there's nothing to wish for" : wishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}
                active={wishlisted}
                dead={owned}
                onClick={onWishlist}
            />
            <Btn glyph={'◰︎'} title="Add to Album" onClick={(e) => { stop(e); showToast('Added to Album'); }} />
            <Btn glyph={'⊟︎'} title={hasNote ? 'Edit Note' : 'Add Note'} active={hasNote} extra="output-act-note" onClick={(e) => { stop(e); openOutputNoteEditor(id, undefined, slug); }} />
            <Btn
                glyph={'❍︎'}
                title="Make To-Do"
                extra="output-act-todo"
                active={!!todoAnchor}
                onClick={(e) => { stop(e); setTodoAnchor(anchorFromEvent(e)); }}
            />
            <Btn glyph={'⟟︎'} title="Grail Pin" active={pinned} extra="output-act-grail" onClick={onGrail} />
            <button type="button" className="pill-colorway output-share-btn" title="Share" onClick={onShare}>Share</button>
            {listed && (
                <Btn
                    glyph={'▢︎'}
                    title={owned ? "You own this — it's your own listing" : 'Add to Cart'}
                    dead={owned}
                    onClick={onCart}
                />
            )}
            <div
                className={`search-btn${searchActive ? ' active' : ''}`}
                role="button"
                tabIndex={0}
                title="Search the feed"
                onClick={(e) => { stop(e); onToggleSearch(); }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSearch(); } }}
            >
                {'⌕︎'}
            </div>

            {todoAnchor && (
                <TodoVerbBubble
                    anchor={todoAnchor}
                    slug={slug}
                    id={id}
                    title={projectTitle}
                    onDismiss={() => setTodoAnchor(null)}
                />
            )}

            {/* ADD TO LIST — opened by holding the star, closed by the × or the
                backdrop (Rule #-0.4). Same sheet the Starred rows open. */}
            {listOpen && (
                <AddToListCard
                    items={[{ kind: 'output', slug, id }]}
                    wishlisted={wishlisted}
                    onWishlist={() => {
                        const r = storeToggleWishlist(slug, id);
                        return r === 'added' ? 'Wishlist: ADDED' : 'Wishlist: REMOVED';
                    }}
                    onDone={(msg) => { setListOpen(false); showToast(msg); }}
                    onClose={() => setListOpen(false)}
                />
            )}
        </div>
    );
}
