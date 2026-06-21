'use client';

/*
 * HeroStickers — the profile owner's stickers on their hero.
 *
 * Pass one: the modest default composition — a single row, spread wide, with a
 * whisper of tilt (±4°) so it reads as stickers, not a toolbar. Sits between the
 * stats row and the Follow button.
 *
 * On by default for everyone, but renders NOTHING unless the profile owner
 * actually holds stickers — so every other profile is byte-for-byte unchanged.
 * The viewer's personal hide switch (pdNotifs.sticker, a negative flag) also
 * suppresses it. Richer arrangements + the generative menu land next.
 */

import { useMemo } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { ownedStickers, stickerById, type Sticker } from '../../lib/stickers/catalog';
import { useOwnedStickerIds } from '../../lib/stickers/owned';
import { StickerArt } from './StickerArt';

interface Props {
    ownerHandle: string | null | undefined;
    /** Whether the viewer is looking at their own profile — merges their
        simulated purchases on top of the seeded set. */
    isOwn?: boolean;
}

/* Deterministic whisper-tilt per slot — stable across renders so the wall never
   jitters. Maps an index to roughly ±4°. */
function tiltFor(i: number): number {
    const seq = [-4, 3, -2, 4, -3, 2, -4, 3, -2, 4];
    return seq[i % seq.length]!;
}

export function HeroStickers({ ownerHandle, isOwn }: Props) {
    const { notifs } = usePdNotifs();
    const purchasedIds = useOwnedStickerIds();
    const owned = useMemo(() => {
        const seed = ownedStickers(ownerHandle);
        // On your own profile, your simulated purchases stack on top of the seed.
        if (!isOwn) return seed;
        const map = new Map<string, Sticker>(seed.map((s) => [s.id, s]));
        for (const id of purchasedIds) {
            const s = stickerById(id);
            if (s) map.set(id, s);
        }
        return [...map.values()];
    }, [ownerHandle, isOwn, purchasedIds]);

    // Hidden by the viewer, or the owner holds none → render nothing at all.
    if (notifs.sticker || owned.length === 0) return null;

    return (
        <div className="hero-stickers" aria-label="Stickers">
            <div className="hero-stickers-row">
                {owned.map((s, i) => (
                    <span
                        key={s.id}
                        className="hero-sticker"
                        style={{ transform: `rotate(${tiltFor(i)}deg)` }}
                        title={s.name}
                    >
                        <StickerArt sticker={s} size={40} />
                    </span>
                ))}
            </div>
        </div>
    );
}
