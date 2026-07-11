'use client';

/*
 * FriendSpritePopover — the small inline card that pops when you tap a person's
 * PriceSprite in the Friend Inspector (Brendon, 2026-07-11). Same body-portal +
 * tail placement as the Fiat-mode bubble (FiatCurrencyPicker), just taller: it
 * stacks their PriceRank + PriceScore + the three circle stats. Tapping the
 * @name inside takes you to their profile.
 *
 * The person's PriceScore is fetched on open from /api/user/by-handle/<handle>
 * (the exact path the dossier duel uses), then mapped to a PriceRank tier.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { tierFor } from '../lib/achievements/tiers';
import type { CircleStat } from '../lib/social/circleStats';

const VS15 = '︎';

export default function FriendSpritePopover({
    handle,
    anchor,
    stat,
    onClose,
}: {
    handle: string;
    anchor: DOMRect | null;
    stat: CircleStat | undefined;
    onClose: () => void;
}) {
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [score, setScore] = useState<number | null>(null);
    const [layout, setLayout] = useState<{ centerX: number; tailDx: number } | null>(null);

    const h = handle.toLowerCase().replace(/^@/, '');

    // Their PriceScore → PriceRank (same fetch the dossier duel uses).
    useEffect(() => {
        let alive = true;
        fetch(`/api/user/by-handle/${h}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((u) => { if (alive) setScore(typeof u?.price_score === 'number' ? u.price_score : 0); })
            .catch(() => { if (alive) setScore(0); });
        return () => { alive = false; };
    }, [h]);

    // Dismiss on outside tap / scroll / resize (matches the Fiat bubble guard).
    useEffect(() => {
        const onPointerDown = (e: PointerEvent) => {
            if (bubbleRef.current?.contains(e.target as Node)) return;
            onClose();
        };
        const dismiss = () => onClose();
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
        };
    }, [onClose]);

    // Clamp the card on-screen, then aim the tail back at the sprite.
    useEffect(() => {
        if (!anchor || !bubbleRef.current) return;
        const half = bubbleRef.current.offsetWidth / 2;
        const margin = 8;
        const vw = window.innerWidth;
        const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
        const spriteCenterX = anchor.left + anchor.width / 2;
        const centerX = clamp(spriteCenterX, margin + half, vw - margin - half);
        const tailDx = clamp(spriteCenterX - centerX, -(half - 12), half - 12);
        setLayout({ centerX, tailDx });
    }, [anchor, score]);

    if (!anchor || typeof document === 'undefined') return null;

    const tier = score === null ? null : tierFor(score);
    const spriteCenterX = anchor.left + anchor.width / 2;

    return createPortal(
        <div
            ref={bubbleRef}
            className="fi-sprite-pop"
            role="dialog"
            aria-label={`@${h}`}
            style={{
                top: anchor.top,
                left: layout?.centerX ?? spriteCenterX,
                transform: 'translate(-50%, calc(-100% - 10px))',
                visibility: layout ? 'visible' : 'hidden',
                ['--p3d-tail-dx' as string]: `${layout?.tailDx ?? 0}px`,
            } as CSSProperties}
            onClick={(e) => e.stopPropagation()}
        >
            <a className="fi-sprite-pop-name" href={`/${h}`}>@{h}</a>
            <div className="fi-sprite-pop-rank">
                <span className="fi-sprite-pop-rank-ic">{`❂${VS15}`}</span>
                {score === null
                    ? 'PRICERANK: …'
                    : tier
                        ? `${tier.title.toUpperCase()} · RANK ${tier.tier}`
                        : 'UNRANKED'}
            </div>
            <div className="fi-sprite-pop-stats">
                <span title="PriceScore"><span className="fm-stat-ic">{`◍${VS15}`}</span>{score === null ? '—' : score.toLocaleString()}</span>
                <span title="Outputs Collected"><span className="fm-stat-ic">{`⬚${VS15}`}</span>{stat ? stat.collected : '—'}</span>
                <span title="Volume Spent"><span className="fm-stat-ic">{`⟠${VS15}`}</span>{stat ? stat.spentEth.toFixed(2) : '—'}</span>
                <span title="Followers"><span className="fm-stat-ic">{`⚬${VS15}`}</span>{stat ? stat.followers : '—'}</span>
            </div>
        </div>,
        document.body,
    );
}
