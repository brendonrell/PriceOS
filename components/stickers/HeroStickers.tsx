'use client';

/*
 * HeroStickers — the profile owner's stickers on their hero.
 *
 * Pass one: the modest default composition — a single row, spread wide, with a
 * whisper of tilt (±4°). Sits between the stats row and the Follow button.
 *
 * On by default for everyone, but renders NOTHING unless the profile owner holds
 * (active) stickers — so every other profile is byte-for-byte unchanged. The
 * viewer's personal hide switch (pdNotifs.sticker) also suppresses it.
 *
 * Tapping your OWN row opens the manager modal (sheets/stickers on-off + store).
 * Richer arrangements + the generative menu land next.
 */

import { useMemo, useState } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useOwnedFor, useStickerPrefs, isActive } from '../../lib/stickers/owned';
import { StickerArt } from './StickerArt';
import { StickerManagerModal } from './StickerManagerModal';

interface Props {
    ownerHandle: string | null | undefined;
    /** Whether the viewer is looking at their own profile. */
    isOwn?: boolean;
}

/* Deterministic whisper-tilt per slot — stable so the wall never jitters. */
function tiltFor(i: number): number {
    const seq = [-4, 3, -2, 4, -3, 2, -4, 3, -2, 4];
    return seq[i % seq.length]!;
}

export function HeroStickers({ ownerHandle, isOwn }: Props) {
    const { notifs } = usePdNotifs();
    const owned = useOwnedFor(ownerHandle, !!isOwn);
    const { offSheets, offIds } = useStickerPrefs();
    const [mgrOpen, setMgrOpen] = useState(false);

    // Only ACTIVE stickers feed the profile.
    const active = useMemo(
        () => owned.filter((s) => isActive(s, offSheets, offIds)),
        [owned, offSheets, offIds],
    );

    // Hidden by the viewer, or nothing active → render nothing at all.
    if (notifs.sticker || active.length === 0) {
        return isOwn ? (
            <StickerManagerModal open={mgrOpen} onClose={() => setMgrOpen(false)} handle={(ownerHandle ?? '').replace(/^@/, '')} />
        ) : null;
    }

    // The profile shows a CAPPED pull from your list — not everything. Owning
    // more fills the sheet denser, but the profile row stays modest.
    const PROFILE_CAP = 6;
    const shown = active.slice(0, PROFILE_CAP);

    const row = (
        <div className="hero-stickers-row">
            {shown.map((s, i) => (
                <span
                    key={s.id}
                    className="hero-sticker"
                    style={{ transform: `rotate(${tiltFor(i)}deg)` }}
                    title={s.name}
                >
                    {/* Faces (sprites / familiars) read smaller, so draw them larger. */}
                    <StickerArt sticker={s} size={s.kind === 'face' || s.kind === 'output' ? 50 : 40} />
                </span>
            ))}
        </div>
    );

    return (
        <div className="hero-stickers" aria-label="Stickers">
            {isOwn ? (
                <>
                    <button
                        type="button"
                        className="hero-stickers-tap"
                        title="Manage your stickers"
                        onClick={() => setMgrOpen(true)}
                    >
                        {row}
                    </button>
                    <StickerManagerModal open={mgrOpen} onClose={() => setMgrOpen(false)} handle={(ownerHandle ?? '').replace(/^@/, '')} />
                </>
            ) : (
                row
            )}
        </div>
    );
}
