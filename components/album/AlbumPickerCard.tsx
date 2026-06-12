'use client';

/*
 * AlbumPickerCard — the "secondary add-to-album modal" (Brendon, 2026-06-12).
 *
 * Floats above the multi-select bar (rendered inside .ms-float-bar, same
 * anchoring as the action picker) and lists the viewer's albums plus an
 * inline create row, so add-to-album is one tap when an album exists and
 * two when it doesn't. Own album-picker-* classes — the ms-popup-* family
 * stays exclusive to the action picker by contract (TraitsUI comment).
 *
 * Albums come from lib/pins/albumStore (account-backed, like stars). The
 * caller passes the items to add and owns the toast + close behaviour, so
 * this card stays surface-agnostic (project bar, profile bar, later the
 * single-card icons).
 */

import { useEffect, useState } from 'react';
import {
    addToAlbum,
    createAlbum,
    getAlbums,
    subscribeAlbums,
} from '../../lib/pins/albumStore';
import type { AlbumRecord } from '../../lib/supabase';

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
    const [draft, setDraft] = useState('');

    useEffect(() => {
        setAlbums(getAlbums());
        return subscribeAlbums((next) => setAlbums(next));
    }, []);

    const addTo = (album: AlbumRecord) => {
        const added = addToAlbum(album.id, items);
        if (added == null) return; // album vanished — list will re-render
        onDone(
            added === 0
                ? `${album.name.toUpperCase()}: ALL ALREADY IN`
                : `${album.name.toUpperCase()}: ADDED ${added}`,
        );
    };

    const createAndAdd = () => {
        const record = createAlbum(draft);
        if (!record) {
            onDone('ALBUM: NAME TAKEN OR INVALID');
            return;
        }
        setDraft('');
        addTo(record);
    };

    return (
        <div className="album-picker-card" role="dialog" aria-label="Add to Album">
            <div className="album-picker-header">
                Add to Album
                <button
                    className="album-picker-close"
                    onClick={onClose}
                    aria-label="Close"
                >
                    ✕&#xFE0E;
                </button>
            </div>
            {albums.length === 0 && (
                <div className="album-picker-empty">No albums yet — name one:</div>
            )}
            {albums.map((a) => (
                <button
                    key={a.id}
                    className="album-picker-item"
                    onClick={() => addTo(a)}
                >
                    <span className="album-picker-name">{a.name}</span>
                    <span className="album-picker-count">{a.keys.length}</span>
                </button>
            ))}
            <div className="album-picker-create">
                <input
                    className="album-picker-input"
                    type="text"
                    value={draft}
                    maxLength={40}
                    placeholder="New album…"
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && draft.trim()) {
                            e.preventDefault();
                            createAndAdd();
                        }
                    }}
                />
                <button
                    className="album-picker-create-btn"
                    onClick={createAndAdd}
                    disabled={!draft.trim()}
                >
                    Create
                </button>
            </div>
        </div>
    );
}
