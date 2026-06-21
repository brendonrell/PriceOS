'use client';

/*
 * HeroStickers — the profile owner's stickers on their hero, arranged per the
 * manager's settings (Spread / Row / 2 Rows / Scatter / Fill + tilt + shuffle).
 *
 * Width: by default the row is clamped to the tab row's width (its right edge =
 * the +More button), so on wide / landscape screens it doesn't run off. A
 * landscape EXPAND button releases that clamp and fills the extra space with
 * more stickers.
 *
 * Renders nothing unless the owner holds (active) stickers. Tapping your OWN
 * arrangement opens the manager modal.
 */

import { useEffect, useMemo, useState } from 'react';
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
    const [expanded, setExpanded] = useState(false);
    const [clampW, setClampW] = useState<number | null>(null);

    // Track the tab row's width so the stickers stop at the +More edge.
    useEffect(() => {
        const measure = () => {
            const el = document.getElementById('profileTabsRow');
            if (el) setClampW(el.getBoundingClientRect().width || null);
        };
        measure();
        const el = document.getElementById('profileTabsRow');
        const ro = el && 'ResizeObserver' in window ? new ResizeObserver(measure) : null;
        if (ro && el) ro.observe(el);
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
        };
    }, []);

    const active = useMemo(
        () => owned.filter((s) => isActive(s, offSheets, offIds)),
        [owned, offSheets, offIds],
    );

    const { rows, cap, scatter } = arrangeShape(arrange);
    // Expanding fills the wider space with more stickers.
    const effCap = expanded ? Math.min(active.length, Math.max(cap, 18)) : cap;

    const picked = useMemo(() => {
        if (!scatter) return active.slice(0, effCap);
        const pool = [...active];
        const rnd = rngFrom(seed);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(rnd() * (i + 1));
            [pool[i], pool[j]] = [pool[j]!, pool[i]!];
        }
        return pool.slice(0, effCap);
    }, [active, scatter, effCap, seed]);

    const manager = isOwn ? (
        <StickerManagerModal open={mgrOpen} onClose={() => setMgrOpen(false)} handle={(ownerHandle ?? '').replace(/^@/, '')} />
    ) : null;

    if (notifs.sticker || active.length === 0) return manager;

    const perRow = Math.ceil(picked.length / rows);
    const rowChunks = Array.from({ length: rows }, (_, r) => picked.slice(r * perRow, (r + 1) * perRow));
    const baseTilt = tiltDeg(tilt);
    const jrnd = rngFrom(seed + 7);
    const sz = (k: string) => (k === 'face' || k === 'output' ? 50 : 40);

    const rowsEl = (
        <div
            className={`hero-stickers-rows arr-${arrange}`}
            style={{ maxWidth: expanded ? undefined : (clampW ?? undefined) }}
        >
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
                <button type="button" className="hero-stickers-tap" title="Arrange your stickers" onClick={() => setMgrOpen(true)}>
                    {rowsEl}
                </button>
            ) : (
                rowsEl
            )}
            <button
                type="button"
                className="hero-sticker-expand"
                title={expanded ? 'Fit to width' : 'Expand stickers'}
                aria-pressed={expanded}
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
            >
                {expanded ? '⤡︎' : '⤢︎'}
            </button>
            {manager}
        </div>
    );
}
