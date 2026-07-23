'use client';

/*
 * AlbumPickerCard — the Add-to-Album bottom sheet (Brendon, 2026-06-12 v2).
 *
 * v2 (Brendon): albums are NUMBERED, never named — "Album #1", "#2", … by
 * position, unlimited count — and the picker is the value-prompt treatment
 * (the Anchor/Floor bottom sheet: dim backdrop + slide-up box, never a
 * full-screen takeover). Scroll the existing albums, tap one to add, or
 * NEW ALBUM creates-and-adds in one tap. Replaces the v1 float-bar card
 * with its name input.
 *
 * Rendered through a portal to <body>: both call sites sit inside the
 * multi-select float bar, whose transform would otherwise become the
 * containing block for this sheet's position: fixed backdrop.
 *
 * Albums come from lib/pins/albumStore (account-backed, like stars). The
 * caller passes the items to add and owns the toast + unmount, so this
 * sheet stays surface-agnostic (project bar, profile bar, later the
 * single-card icons). Open/close animation is the value-prompt pattern:
 * mount → rAF .active (slide-up); dismiss → drop .active, unmount after
 * the 250ms fade.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
    addToAlbum,
    createAlbum,
    getAlbums,
    subscribeAlbums,
} from '../../lib/pins/albumStore';
import type { AlbumRecord } from '../../lib/supabase';

const CLOSE_FADE_MS = 250;

export default function AlbumPickerCard({
    items,
    onDone,
    onClose,
}: {
    /** Outputs to add on album pick. */
    items: ReadonlyArray<{ slug: string; id: number }>;
    /** Called after a successful add — message is toast-ready. */
    onDone: (message: string) => void;
    /** Dismiss without adding. */
    onClose: () => void;
}) {
    const [albums, setAlbums] = useState<ReadonlyArray<AlbumRecord>>(() => getAlbums());
    const [active, setActive] = useState(false);
    const closingRef = useRef(false);

    useEffect(() => {
        setAlbums(getAlbums());
        return subscribeAlbums((next) => setAlbums(next));
    }, []);

    // Slide-up on mount — rAF so .active lands a paint after the mount frame
    // and the CSS transition engages (same dance as ValuePromptModal).
    useEffect(() => {
        const raf = requestAnimationFrame(() => setActive(true));
        return () => cancelAnimationFrame(raf);
    }, []);

    /** Fade the sheet, then hand control back to the caller (who unmounts). */
    const dismiss = (after?: () => void) => {
        if (closingRef.current) return;
        closingRef.current = true;
        setActive(false);
        setTimeout(() => (after ? after() : onClose()), CLOSE_FADE_MS);
    };

    const addTo = (album: AlbumRecord, number: number) => {
        const added = addToAlbum(album.id, items);
        if (added == null) return; // album vanished — list will re-render
        dismiss(() =>
            onDone(
                added === 0
                    ? `Album #${number}: ALL ALREADY IN`
                    : `Album #${number}: ADDED ${added}`,
            ),
        );
    };

    // One tap: create the next numbered album and drop the selection in.
    const createAndAdd = () => {
        const record = createAlbum();
        addTo(record, albums.length + 1);
    };

    return createPortal(
        <div
            className={`value-prompt-wrap mounted${active ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Add to Album"
            onClick={(e) => {
                if (e.target === e.currentTarget) dismiss();
            }}
        >
            <div className="value-prompt-box album-sheet">
                <span
                    className="value-prompt-close-x"
                    onClick={() => dismiss()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            dismiss();
                        }
                    }}
                    title="Close"
                >
                    {'×︎'}
                </span>
                <div className="value-prompt-title">Add to Album</div>
                <div className="album-sheet-list">
                    {albums.length === 0 && (
                        <div className="album-sheet-empty">
                            No albums yet — start your first:
                        </div>
                    )}
                    {albums.map((a, i) => {
                        // Already-in when every picked item is a member (single
                        // item from the modal → just that one).
                        const inThis = items.length > 0 && items.every((it) => a.keys.includes(`${it.slug}:${it.id}`));
                        return (
                            <button
                                key={a.id}
                                type="button"
                                className={`album-sheet-item${inThis ? ' is-in' : ''}`}
                                onClick={() => addTo(a, i + 1)}
                            >
                                <span className="album-sheet-name">
                                    {inThis && (
                                        <span className="album-sheet-in" aria-label="Already in this album">
                                            {'✓︎'}
                                        </span>
                                    )}
                                    Album #{i + 1}
                                </span>
                                <span className="album-sheet-count">{a.keys.length}</span>
                            </button>
                        );
                    })}
                </div>
                <div className="value-prompt-actions">
                    <button
                        type="button"
                        className="value-prompt-btn"
                        onClick={() => dismiss()}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="value-prompt-btn primary"
                        onClick={createAndAdd}
                    >
                        ＋ New Album
                    </button>
                </div>
            </div>
        </div>,
        document.body,
    );
}
