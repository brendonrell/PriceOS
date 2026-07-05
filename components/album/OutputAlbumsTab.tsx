'use client';

/*
 * OutputAlbumsTab — the Artwork page's Albums tab, real (was a placeholder).
 * Shows which of YOUR albums hold this piece as numbered chips (tap ✕ to pull
 * it out), plus ＋ Album which opens the canonical Add-to-Album sheet.
 * Numbered only — no writing anywhere (Brendon).
 */

import { useEffect, useState } from 'react';
import AlbumPickerCard from './AlbumPickerCard';
import { useToast } from '../../lib/state/ToastContext';
import {
    albumsContaining,
    removeFromAlbum,
    subscribeAlbums,
} from '../../lib/pins/albumStore';

const VS15 = '︎';

export default function OutputAlbumsTab({ slug, id }: { slug: string; id: number }) {
    const { showToast } = useToast();
    const [containing, setContaining] = useState(() => albumsContaining(slug, id));
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        setContaining(albumsContaining(slug, id));
        return subscribeAlbums(() => setContaining(albumsContaining(slug, id)));
    }, [slug, id]);

    return (
        <div className="output-albums-row">
            {containing.map(({ album, number }) => (
                <span key={album.id} className="output-album-chip">
                    ◰{VS15} ALBUM {number < 10 ? `0${number}` : number}
                    <span
                        className="chip-x"
                        role="button"
                        tabIndex={0}
                        title={`Remove from Album #${number}`}
                        onClick={() => {
                            removeFromAlbum(album.id, [`${slug}:${id}`]);
                            showToast(`Album #${number}: REMOVED`);
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                removeFromAlbum(album.id, [`${slug}:${id}`]);
                                showToast(`Album #${number}: REMOVED`);
                            }
                        }}
                    >
                        ×{VS15}
                    </span>
                </span>
            ))}
            {containing.length === 0 && (
                <span className="album-empty-note" style={{ padding: 0 }}>Not in any albums yet.</span>
            )}
            <button
                type="button"
                className="output-album-chip output-album-add"
                onClick={() => setPickerOpen(true)}
            >
                ＋ ALBUM
            </button>
            {pickerOpen && (
                <AlbumPickerCard
                    items={[{ slug, id }]}
                    onDone={(msg) => { setPickerOpen(false); showToast(msg); }}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </div>
    );
}
