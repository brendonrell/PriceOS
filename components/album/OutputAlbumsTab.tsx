'use client';

/*
 * OutputAlbumsTab — the Artwork page's Albums tab, real (was a placeholder).
 * Shows which of YOUR albums hold this piece as the covers-wall tiles — the
 * full 2×2 four-art mosaic + label the profile Albums shelf wears
 * (AlbumCoverArt, Brendon 2026-07-20: "fully show the 4 album preview") —
 * each keeping its ✕ (pull the piece out), plus ＋ Album which opens the
 * canonical Add-to-Album sheet. Numbered only — no writing anywhere (Brendon).
 */

import { useEffect, useState } from 'react';
import AlbumPickerCard from './AlbumPickerCard';
import { AlbumCoverArt, useAlbumsWorth } from './AlbumsPanel';
import { useToast } from '../../lib/state/ToastContext';
import { useAuth } from '../../lib/state/AuthContext';
import {
    albumsContaining,
    removeFromAlbum,
    subscribeAlbums,
} from '../../lib/pins/albumStore';

const VS15 = '︎';

export default function OutputAlbumsTab({ slug, id }: { slug: string; id: number }) {
    const { showToast } = useToast();
    /* Every album on this tab is the VIEWER's own, so the maker's handle is
       the signed-in handle — shown on each tile (Brendon, 2026-07-28). */
    const { handle, siweAddress } = useAuth();
    const owner = handle
        ? `@${handle.toUpperCase()}`
        : siweAddress
          ? `${siweAddress.slice(0, 6)}…${siweAddress.slice(-4)}`
          : null;
    const [containing, setContaining] = useState(() => albumsContaining(slug, id));
    const [pickerOpen, setPickerOpen] = useState(false);
    const worthOf = useAlbumsWorth(containing.map((c) => c.album));

    useEffect(() => {
        setContaining(albumsContaining(slug, id));
        return subscribeAlbums(() => setContaining(albumsContaining(slug, id)));
    }, [slug, id]);

    return (
        <div className="output-albums-wrap">
            {containing.length > 0 && (
                <div className="albums-covers output-albums-covers">
                    {containing.map(({ album, number }) => (
                        <span
                            key={album.id}
                            className="album-tile output-album-tile"
                            style={{ animationDelay: `${Math.min(number - 1, 8) * 55}ms` }}
                        >
                            <AlbumCoverArt album={album} number={number} listedEth={worthOf(album)} owner={owner} />
                            <span
                                className="chip-x output-album-tile-x"
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
                </div>
            )}
            <div className="output-albums-row">
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
            </div>
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
