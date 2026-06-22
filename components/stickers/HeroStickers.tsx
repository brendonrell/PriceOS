'use client';

/*
 * HeroStickers — the profile owner's stickers on their hero, arranged per the
 * manager's settings (layout style + rows + align + tilt + width + shuffle).
 *
 * The sticker AREA is left-aligned with the rest of the hero and ends exactly at
 * the +More button (the tab row's width). The ALIGN pref centres the stickers
 * WITHIN that area (never on the screen). WIDTH=Wide releases the clamp.
 *
 * Renders nothing unless the owner holds (active) stickers. Tapping your OWN
 * arrangement opens the manager modal.
 */

import { Component, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useOwnedFor, useStickerPrefs, isActive } from '../../lib/stickers/owned';
import { useHeroPrefs, arrangeShape, tiltDeg, rngFrom, buildCollage, shouldFlip } from '../../lib/stickers/heroPrefs';
import { StickerArt } from './StickerArt';
import { StickerManagerModal } from './StickerManagerModal';

interface Props {
    ownerHandle: string | null | undefined;
    isOwn?: boolean;
}

/* Output stickers each paint a full generative artwork to a canvas — heavy.
   Never let the hero mount more than a handful at once (that's the crash). */
const MAX_HERO_OUTPUTS = 4;

/* Boundary so a single bad sticker can never take down the whole profile — the
   feature just renders nothing instead of crashing the page. */
class StickerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    constructor(props: { children: ReactNode }) { super(props); this.state = { failed: false }; }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch() { /* swallow — stickers are decorative */ }
    render() { return this.state.failed ? null : this.props.children; }
}

export function HeroStickers(props: Props) {
    return (
        <StickerBoundary>
            <HeroStickersInner {...props} />
        </StickerBoundary>
    );
}

function HeroStickersInner({ ownerHandle, isOwn }: Props) {
    const { notifs } = usePdNotifs();
    const owned = useOwnedFor(ownerHandle, !!isOwn);
    const { offSheets, offIds } = useStickerPrefs();
    const { arrange, tilt, seed, expand, rows: rowsPref, align, flip } = useHeroPrefs();
    const [mgrOpen, setMgrOpen] = useState(false);
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

    const { rows, cap, scatter } = arrangeShape(arrange, rowsPref);
    const effCap = expand ? Math.min(active.length, Math.max(cap, 18)) : cap;

    const picked = useMemo(() => {
        const base = (() => {
            if (!scatter) return active.slice(0, effCap);
            const pool = [...active];
            const rnd = rngFrom(seed);
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(rnd() * (i + 1));
                [pool[i], pool[j]] = [pool[j]!, pool[i]!];
            }
            return pool.slice(0, effCap);
        })();
        // Crash guard: keep only a few painted-art (output) stickers so the hero
        // never mounts a wall of generative canvases at once.
        let o = 0;
        return base.filter((s) => s.kind !== 'output' || o++ < MAX_HERO_OUTPUTS);
    }, [active, scatter, effCap, seed]);

    const manager = isOwn ? (
        <StickerManagerModal open={mgrOpen} onClose={() => setMgrOpen(false)} handle={(ownerHandle ?? '').replace(/^@/, '')} />
    ) : null;

    if (notifs.sticker || active.length === 0) return manager;

    const baseTilt = tiltDeg(tilt);
    const jrnd = rngFrom(seed + 7);
    const sz = (k: string) => (k === 'face' || k === 'output' ? 50 : 40);
    const areaStyle = { maxWidth: expand ? undefined : (clampW ?? undefined) };
    const alignClass = align === 'center' ? 'al-center' : align === 'right' ? 'al-right' : 'al-left';
    const flipOf = (id: string) => (flip && shouldFlip(id, seed) ? 180 : 0);

    // Wrap the chosen body in the tap target (own profile opens the manager).
    const wrap = (body: ReactNode) => (
        <div className="hero-stickers" aria-label="Stickers">
            {isOwn ? (
                <>
                    <button type="button" className="hero-stickers-tap" title="Arrange your stickers" onClick={() => setMgrOpen(true)}>
                        {body}
                    </button>
                    {manager}
                </>
            ) : body}
        </div>
    );

    // COLLAGE — one large composed area: overlapping, mixed sizes, balanced.
    if (arrange === 'collage') {
        const comp = buildCollage(picked.length, seed);
        return wrap(
            <div className="hero-collage" style={{ ...areaStyle, aspectRatio: `${comp.cols} / ${comp.rows}` }}>
                {picked.map((s, i) => {
                    const p = comp.items[i]!;
                    return (
                        <span
                            key={s.id}
                            className="hero-sticker hero-collage-item"
                            style={{ left: `${p.x}%`, top: `${p.y}%`, zIndex: p.z, transform: `translate(-50%, -50%) rotate(${p.rot + flipOf(s.id)}deg) scale(${p.scale})` }}
                            title={s.name}
                        >
                            <StickerArt sticker={s} size={sz(s.kind)} />
                        </span>
                    );
                })}
            </div>,
        );
    }

    // STACK — peeled stickers spread like fanned playing cards: spaced across the
    // area with random jitter (position, height, angle), light overlap.
    if (arrange === 'stack') {
        const n = picked.length;
        const srnd = rngFrom(seed + 99);
        const PAD = 8;
        const span = 100 - PAD * 2;
        const slot = n <= 1 ? 0 : span / (n - 1);
        const rotSpread = baseTilt * 1.4 + 7;
        return wrap(
            <div className={`hero-stack ${alignClass}`} style={areaStyle}>
                {picked.map((s, i) => {
                    const base = n <= 1 ? 50 : PAD + i * slot;
                    const jx = (srnd() - 0.5) * slot * 0.55;
                    const x = Math.max(PAD, Math.min(100 - PAD, base + jx));
                    const top = 50 + (srnd() - 0.5) * 34;
                    const rot = (srnd() - 0.5) * 2 * rotSpread;
                    return (
                        <span
                            key={s.id}
                            className="hero-sticker hero-stack-item"
                            style={{ left: `${x}%`, top: `${top}%`, zIndex: i + 1, transform: `translate(-50%, -50%) rotate(${rot + flipOf(s.id)}deg)` }}
                            title={s.name}
                        >
                            <StickerArt sticker={s} size={sz(s.kind)} />
                        </span>
                    );
                })}
            </div>,
        );
    }

    // Flex rows (spread / row / scatter / fill).
    const perRow = Math.ceil(picked.length / rows);
    const rowChunks = Array.from({ length: rows }, (_, r) => picked.slice(r * perRow, (r + 1) * perRow));

    return wrap(
        <div className={`hero-stickers-rows arr-${arrange} ${alignClass}`} style={areaStyle}>
            {rowChunks.map((chunk, ri) => (
                <div className="hero-stickers-row" key={ri}>
                    {chunk.map((s, i) => {
                        const t = baseTilt === 0 ? 0 : ((i + ri) % 2 === 0 ? -baseTilt : baseTilt);
                        const jy = scatter ? Math.round((jrnd() - 0.5) * 14) : 0;
                        return (
                            <span
                                key={s.id}
                                className="hero-sticker"
                                style={{ transform: `translateY(${jy}px) rotate(${t + flipOf(s.id)}deg)` }}
                                title={s.name}
                            >
                                <StickerArt sticker={s} size={sz(s.kind)} />
                            </span>
                        );
                    })}
                </div>
            ))}
        </div>,
    );
}
