'use client';

/*
 * AddToListCard — the ADD TO LIST sheet (Brendon, 2026-07-24).
 *
 * Opened by the ADD TO LIST CTA on a Starred row (which replaced the old
 * ✛ Wishlist CTA). Built on the value-prompt bottom sheet — the same shell the
 * Calendar/Workflows sheets and the Album picker already use (Rule #0: dim
 * backdrop + slide-up box, portal to body, mount → rAF .active, drop .active →
 * unmount after the fade). Nothing new invented for the chrome.
 *
 * The order Brendon specified, top to bottom:
 *   1. WISHLIST — ALWAYS the top option, wearing PD's ✛ wishlist glyph. Lists
 *      never displace it; the "want to buy" pile stays one tap away. It's the
 *      one row that can't apply to a non-Output pick (there's no wishlisting a
 *      Project or an Artist), so it stands down for those.
 *   2. The user's own lists, each showing a tick when this piece is already in.
 *   3. NEW LIST — names it and drops the piece straight in, one go.
 *
 * The door (Rule #-0.4): the CTA opens it, the × / backdrop closes it. Nothing
 * here is default-on.
 *
 * The caller owns the toast and the unmount, so this sheet stays surface-
 * agnostic — the same way AlbumPickerCard does.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    addToList,
    createList,
    getLists,
    listKeyOf,
    subscribeLists,
    LIST_NAME_MAX,
    type ListMember,
} from '../../lib/pins/listStore';
import type { ListRecord } from '../../lib/supabase';

const CLOSE_FADE_MS = 250;

export default function AddToListCard({
    items,
    wishlisted,
    onWishlist,
    onDone,
    onClose,
}: {
    /** Starred things to add on pick — any kind (Output, Project, Trait,
     *  Artist, Soundtrack, Transaction). */
    items: ReadonlyArray<ListMember>;
    /** Whether every picked item is already on the wishlist (drives the tick). */
    wishlisted: boolean;
    /** Top option — the caller runs its own wishlist toggle + returns the toast.
     *  Null when the pick isn't an Output: nothing but an Output can be
     *  wishlisted, so the row doesn't render. */
    onWishlist: (() => string) | null;
    /** Called after a pick — message is toast-ready. */
    onDone: (message: string) => void;
    /** Dismiss without adding. */
    onClose: () => void;
}) {
    const [lists, setLists] = useState<ReadonlyArray<ListRecord>>(() => getLists());
    const [active, setActive] = useState(false);
    const [naming, setNaming] = useState(false);
    const [name, setName] = useState('');
    const closingRef = useRef(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLists(getLists());
        return subscribeLists(setLists);
    }, []);

    // Slide-up on mount — rAF so .active lands a paint after the mount frame.
    useEffect(() => {
        const raf = requestAnimationFrame(() => setActive(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    useEffect(() => { if (naming) inputRef.current?.focus(); }, [naming]);

    const dismiss = (after?: () => void) => {
        if (closingRef.current) return;
        closingRef.current = true;
        setActive(false);
        setTimeout(() => (after ? after() : onClose()), CLOSE_FADE_MS);
    };

    useEffect(() => {
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pickWishlist = () => {
        if (!onWishlist) return;
        const msg = onWishlist();
        dismiss(() => onDone(msg));
    };

    const pickList = (list: ListRecord) => {
        const added = addToList(list.id, items);
        if (added == null) return; // list vanished — the rows will re-render
        // Toast casing (§9): the label stays normal case, the STATE screams.
        dismiss(() =>
            onDone(added === 0 ? `${list.name}: ALREADY IN` : `${list.name}: ADDED ${added}`),
        );
    };

    /* Name it, create it, drop the selection in — one go. */
    const commitNew = () => {
        const record = createList(name);
        if (!record) return; // empty name — the input just stays open
        const added = addToList(record.id, items) ?? 0;
        dismiss(() => onDone(`${record.name}: ADDED ${added}`));
    };

    return createPortal(
        <div
            className={`value-prompt-wrap mounted${active ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Add to List"
            onClick={(e) => { if (e.target === e.currentTarget) dismiss(); }}
        >
            <div className="value-prompt-box list-sheet">
                <span
                    className="value-prompt-close-x"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={() => dismiss()}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); dismiss(); }
                    }}
                >
                    {'×︎'}
                </span>
                <div className="value-prompt-title">Add to List</div>

                <div className="list-sheet-list">
                    {/* 1 — WISHLIST, always first, always there (whenever the
                        pick CAN be wishlisted — only an Output can). It wears
                        the wishlist glyph, PD's ✛ (Brendon, 2026-07-25). */}
                    {onWishlist && (
                        <button
                            type="button"
                            className={`list-sheet-item is-wishlist${wishlisted ? ' is-in' : ''}`}
                            onClick={pickWishlist}
                        >
                            <span className="list-sheet-name">
                                {wishlisted && (
                                    <span className="list-sheet-in" aria-label="Already on your wishlist">{'✓︎'}</span>
                                )}
                                <span className="list-sheet-glyph" aria-hidden="true">{'✛︎'}</span>
                                Wishlist
                            </span>
                            <span className="list-sheet-count">{wishlisted ? 'ON' : ''}</span>
                        </button>
                    )}

                    {/* 2 — the user's own lists. */}
                    {lists.map((l) => {
                        const inThis = items.length > 0
                            && items.every((it) => l.keys.includes(listKeyOf(it)));
                        return (
                            <button
                                key={l.id}
                                type="button"
                                className={`list-sheet-item${inThis ? ' is-in' : ''}`}
                                onClick={() => pickList(l)}
                            >
                                <span className="list-sheet-name">
                                    {inThis && (
                                        <span className="list-sheet-in" aria-label="Already in this list">{'✓︎'}</span>
                                    )}
                                    {l.name}
                                </span>
                                <span className="list-sheet-count">{l.keys.length}</span>
                            </button>
                        );
                    })}

                    {/* 3 — NEW LIST: name it and it takes the piece with it. */}
                    {naming ? (
                        <div className="list-sheet-new">
                            <input
                                ref={inputRef}
                                className="value-prompt-input"
                                value={name}
                                maxLength={LIST_NAME_MAX}
                                placeholder="Name this list"
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); commitNew(); }
                                    if (e.key === 'Escape') { e.preventDefault(); setNaming(false); setName(''); }
                                }}
                            />
                            <button
                                type="button"
                                className="value-prompt-btn primary"
                                disabled={!name.trim()}
                                onClick={commitNew}
                            >
                                CREATE
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            className="list-sheet-item list-sheet-newbtn"
                            onClick={() => setNaming(true)}
                        >
                            <span className="list-sheet-name">New List</span>
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body,
    );
}
