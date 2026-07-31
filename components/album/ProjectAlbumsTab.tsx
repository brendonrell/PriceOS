'use client';

/*
 * ProjectAlbumsTab — the project page's +More ▸ Albums tab, real (was the
 * sim's named-mock cards with empty cells). Shows YOUR albums that hold at
 * least one piece of THIS project, each wearing the covers-wall 2×2 four-art
 * mosaic + label from the profile Albums shelf (AlbumCoverArt — Brendon,
 * 2026-07-20: "fully show the 4 album preview"). Albums stay private and
 * numbered; this is always the viewer's own shelf, filtered to the project.
 *
 * 2026-07-31 (Brendon): the tab also PROMPTS the action. Under the shelf sits
 * your holdings from this collection — or, when you hold none, the first four
 * minted pieces — as the album-piece grid, tap-to-pick, with the ＋ ADD TO
 * ALBUM button opening the canonical Add-to-Album sheet.
 */

import { useEffect, useMemo, useState } from 'react';
import AlbumPickerCard from './AlbumPickerCard';
import { AlbumCoverArt, parseKey, useAlbumsWorth } from './AlbumsPanel';
import OutputThumb from '../profile/OutputThumb';
import { getAlbums, subscribeAlbums } from '../../lib/pins/albumStore';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { useProject } from '../../lib/state/ProjectContext';
import type { AlbumRecord } from '../../lib/supabase';

const VS15 = '︎';

export default function ProjectAlbumsTab({ slug }: { slug: string }) {
    const project = useProject();
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
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

    /* Your holdings in THIS project — the pieces the prompt offers first. */
    const [ownedIds, setOwnedIds] = useState<number[]>([]);
    useEffect(() => {
        if (!siweAddress) { setOwnedIds([]); return; }
        let cancelled = false;
        fetch(`/api/user/${siweAddress.toLowerCase()}/outputs`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d?.holdings) return;
                const mine: number[] = [];
                for (const h of d.holdings as { slug: string; token_id: number }[]) {
                    if (h.slug === slug) mine.push(h.token_id);
                }
                mine.sort((a, b) => a - b);
                setOwnedIds(mine);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [siweAddress, slug]);

    /* Own none of it → suggest the first four minted pieces. */
    const suggested = ownedIds.length === 0;
    const pieces = useMemo(() => {
        if (ownedIds.length > 0) return ownedIds;
        const n = Math.min(4, project.totalOutputs);
        return Array.from({ length: n }, (_, i) => i + 1);
    }, [ownedIds, project.totalOutputs]);

    const [picked, setPicked] = useState<ReadonlyArray<number>>([]);
    useEffect(() => { setPicked([]); }, [slug, siweAddress]);
    const toAdd = (picked.length > 0 ? picked : pieces).map((id) => ({ slug, id }));
    const [pickerOpen, setPickerOpen] = useState(false);

    return (
        <div className="output-albums-wrap">
            {holding.length > 0 ? (
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
            ) : (
                <p className="album-empty-note" style={{ padding: '4px 2px 0' }}>
                    No albums hold a piece of this project yet.
                </p>
            )}

            {pieces.length > 0 && (
                <>
                    <p className="album-empty-note" style={{ padding: '2px 2px 0' }}>
                        {suggested
                            ? 'You hold none of this project yet — start an album with these:'
                            : 'Your pieces from this project — tap to pick, then drop them in an album:'}
                    </p>
                    <div className="album-pieces">
                        {pieces.map((id, i) => {
                            const isSel = picked.includes(id);
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    className={`album-piece${isSel ? ' selected' : ''}`}
                                    style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                                    title={`#${id}`}
                                    onClick={() =>
                                        setPicked((prev) =>
                                            prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
                                        )
                                    }
                                >
                                    <OutputThumb slug={slug} id={id} size={130} crop />
                                    <span className="album-check">{isSel ? '▣' : '❐'}{VS15}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="output-albums-row">
                        <button
                            type="button"
                            className="output-album-chip output-album-add"
                            onClick={() => setPickerOpen(true)}
                        >
                            ＋ ADD TO ALBUM{picked.length > 0 ? ` · ${picked.length}` : ''}
                        </button>
                    </div>
                </>
            )}

            {pickerOpen && (
                <AlbumPickerCard
                    items={toAdd}
                    onDone={(msg) => { setPickerOpen(false); setPicked([]); showToast(msg); }}
                    onClose={() => setPickerOpen(false)}
                />
            )}
        </div>
    );
}
