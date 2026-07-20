'use client';

/*
 * ProjectAlbumsTab — the project page's +More ▸ Albums tab, real (was the
 * sim's named-mock cards with empty cells). Shows YOUR albums that hold at
 * least one piece of THIS project, each wearing the covers-wall 2×2 four-art
 * mosaic + label from the profile Albums shelf (AlbumCoverArt — Brendon,
 * 2026-07-20: "fully show the 4 album preview"). Albums stay private and
 * numbered; this is always the viewer's own shelf, filtered to the project.
 */

import { useEffect, useMemo, useState } from 'react';
import { AlbumCoverArt, parseKey, useAlbumsWorth } from './AlbumsPanel';
import { getAlbums, subscribeAlbums } from '../../lib/pins/albumStore';
import type { AlbumRecord } from '../../lib/supabase';

export default function ProjectAlbumsTab({ slug }: { slug: string }) {
    const [albums, setAlbums] = useState<ReadonlyArray<AlbumRecord>>(() => getAlbums());
    useEffect(() => {
        setAlbums(getAlbums());
        return subscribeAlbums((next) => setAlbums(next));
    }, []);

    /* Number by position in the FULL shelf (Album #N is an identity), then
       filter to albums holding a piece of this project. */
    const holding = useMemo(
        () =>
            albums
                .map((album, i) => ({ album, number: i + 1 }))
                .filter(({ album }) =>
                    album.keys.some((k) => parseKey(k)?.slug.toLowerCase() === slug.toLowerCase()),
                ),
        [albums, slug],
    );
    const worthOf = useAlbumsWorth(holding.map((h) => h.album));

    if (holding.length === 0) {
        return <p className="album-empty-note">No albums hold a piece of this project yet.</p>;
    }
    return (
        <div className="albums-covers">
            {holding.map(({ album, number }) => (
                <span
                    key={album.id}
                    className="album-tile output-album-tile"
                    style={{ animationDelay: `${Math.min(number - 1, 8) * 55}ms` }}
                >
                    <AlbumCoverArt album={album} number={number} listedEth={worthOf(album)} />
                </span>
            ))}
        </div>
    );
}
