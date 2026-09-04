'use client';

/*
 * OutputAlbumsTab — the Artwork page's Albums tab, real (was a placeholder).
 * Shows EVERY album on PD that holds this piece as the covers-wall tiles — the
 * full 2×2 four-art mosaic + label the profile Albums shelf wears
 * (AlbumCoverArt, Brendon 2026-07-20: "fully show the 4 album preview") —
 * each naming its maker, plus ＋ Album which opens the canonical Add-to-Album
 * sheet. Numbered only — no writing anywhere (Brendon).
 *
 * 2026-08-02 (Brendon): albums are PUBLIC, so this tab reads the whole
 * platform's shelves, not just the viewer's. Only the viewer's OWN tiles carry
 * the ✕ — you can't pull a piece out of someone else's album.
 */

import { useEffect, useMemo, useState } from 'react';
import AlbumPickerCard from './AlbumPickerCard';
import { AlbumCoverArt, useAlbumsWorth } from './AlbumsPanel';
import { useToast } from '../../lib/state/ToastContext';
import { useAuth } from '../../lib/state/AuthContext';
import {
    albumsContaining,
    removeFromAlbum,
    subscribeAlbums,
} from '../../lib/pins/albumStore';
import type { ProjectAlbumRow } from '../../app/api/project/[slug]/albums/route';

const VS15 = '︎';

export default function OutputAlbumsTab({ slug, id }: { slug: string; id: number }) {
    const { showToast } = useToast();
    /* The viewer's own label, for their albums the public read hasn't picked
       up yet (an unclaimed wallet has no @name to publish under). */
    const { handle, siweAddress } = useAuth();
    const myLabel = handle
        ? `@${handle.toUpperCase()}`
        : siweAddress
          ? `${siweAddress.slice(0, 6)}…${siweAddress.slice(-4)}`
          : null;
    const [mine, setMine] = useState(() => albumsContaining(slug, id));
    const [pickerOpen, setPickerOpen] = useState(false);

    useEffect(() => {
        setMine(albumsContaining(slug, id));
        return subscribeAlbums(() => setMine(albumsContaining(slug, id)));
    }, [slug, id]);

    /* EVERY album on PD holding this piece, with its maker. */
    const [publicRows, setPublicRows] = useState<ReadonlyArray<ProjectAlbumRow>>([]);
    useEffect(() => {
        let cancelled = false;
        setPublicRows([]);
        fetch(`/api/project/${slug}/albums?token=${id}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !Array.isArray(d?.albums)) return;
                setPublicRows(d.albums as ProjectAlbumRow[]);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [slug, id]);

    /* The wall: the viewer's own albums first (they're the ones you can act
       on), then everyone else's — deduped on the album's own id. */
    const containing = useMemo(() => {
        const mineIds = new Set(mine.map((m) => m.album.id));
        const rows = mine.map((m) => ({
            key: `me:${m.album.id}`,
            album: m.album,
            number: m.number,
            owner: myLabel,
            ownerAddress: siweAddress ?? null,
            own: true,
        }));
        for (const r of publicRows) {
            if (mineIds.has(r.album.id)) continue;
            rows.push({
                key: `${r.owner_address}:${r.album.id}`,
                album: r.album,
                number: r.position,
                owner: `@${r.owner_handle.toUpperCase()}`,
                ownerAddress: r.owner_address,
                own: false,
            });
        }
        return rows;
    }, [mine, publicRows, myLabel, siweAddress]);
    const worthOf = useAlbumsWorth(containing.map((c) => c.album));

    return (
        <div className="output-albums-wrap">
            {containing.length > 0 && (
                <div className="albums-covers output-albums-covers">
                    {containing.map(({ key, album, number, owner, ownerAddress, own }, i) => (
                        <span
                            key={key}
                            className="album-tile output-album-tile"
                            style={{ animationDelay: `${Math.min(i, 8) * 55}ms` }}
                        >
                            <AlbumCoverArt album={album} number={number} listedEth={worthOf(album)} owner={owner} ownerAddress={ownerAddress} />
                            {own && (
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
                            )}
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
