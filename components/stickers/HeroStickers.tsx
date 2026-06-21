'use client';

/*
 * HeroStickers — the profile owner's stickers on their hero, arranged per the
 * manager's settings (Spread / Row / 2 Rows / Scatter / Fill + tilt + shuffle).
 *
 * Renders nothing unless the owner holds (active) stickers, so other profiles
 * are unchanged. The viewer's hide switch (pdNotifs.sticker) also suppresses it.
 * Tapping your OWN arrangement opens the manager modal.
 */

import { useMemo, useState } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useOwnedFor, useStickerPrefs, isActive } from '../../lib/stickers/owned';
import { useHeroPrefs, arrangeShape, tiltDeg, rngFrom } from '../../lib/stickers/heroPrefs';
import { StickerArt } from './StickerArt';
import { StickerManagerModal } from './StickerManagerModal';

interface Props {
    ownerHandle: string | null | undefined;
    isOwn?: boolean;
}

export function HeroStickers({ ownerHandle, isOwn }: Props) {
    const { notifs } = usePdNotifs();
    const owned = useOwnedFor(ownerHandle, !!isOwn);
    const { offSheets, offIds } = useStickerPrefs();
    const { arrange, tilt, seed } = useHeroPrefs();
    const [mgrOpen, setMgrOpen] = useState(false);

    const active = useMemo(
        () => owned.filter((s) => isActive(s, offSheets, offIds)),
        [owned, offSheets, offIds],
    );

    const { rows, cap, scatter } = arrangeShape(arrange);

    // Tidy modes take a stable slice; scattered modes take a seeded sample.
    const picked = useMemo(() => {
        if (!scatter) return active.slice(0, cap);
        const pool = [...active];
        const rnd = rngFrom(seed);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            [pool[i], pool[j]] = [pool[j]!, pool[i]!];
        }
        return pool.slice(0, cap);
    }, [active, scatter, cap, seed]);

    const manager = isOwn ? (
        <StickerManagerModal open={mgrOpen} onClose={() => setMgrOpen(false)} handle={(ownerHandle ?? '').replace(/^@/, '')} />
    ) : null;

    if (notifs.sticker || active.length === 0) return manager;

    const perRow = Math.ceil(picked.length / rows);
    const rowChunks = Array.from({ length: rows }, (_, r) => picked.slice(r * perRow, (r + 1) * perRow));
    const baseTilt = tiltDeg(tilt);
    const jrnd = rngFrom(seed + 7);
    const sz = (k: string) => (k === 'face' || k === 'output' ? 50 : 40);

    const body = (
        <div className={`hero-stickers-rows arr-${arrange}`}>
            {rowChunks.map((chunk, ri) => (
                <div className="hero-stickers-row" key={ri}>
                    {chunk.map((s, i) => {
                        const t = baseTilt === 0 ? 0 : ((i + ri) % 2 === 0 ? -baseTilt : baseTilt);
                        const jy = scatter ? Math.round((jrnd() - 0.5) * 14) : 0;
                        return (
                            <span
                                key={s.id}
                                className="hero-sticker"
                                style={{ transform: `translateY(${jy}px) rotate(${t}deg)` }}
                                title={s.name}
                            >
                                <StickerArt sticker={s} size={sz(s.kind)} />
                            </span>
                        );
                    })}
                </div>
            ))}
        </div>
    );

    return (
        <div className="hero-stickers" aria-label="Stickers">
            {isOwn ? (
                <>
                    <button type="button" className="hero-stickers-tap" title="Arrange your stickers" onClick={() => setMgrOpen(true)}>
                        {body}
                    </button>
                    {manager}
                </>
            ) : (
                body
            )}
        </div>
    );
}
