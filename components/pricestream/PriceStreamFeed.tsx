'use client';

/*
 * PriceStream ⇊ — the vertical swipe feed (Brendon, 2026-09-04).
 *
 * Full-screen modal opened by a single tap on the home "Price Discussion"
 * name (the third gesture, alongside HomeTitleCartography's long-press and
 * triple-tap). Closing it just unmounts the modal — the page underneath was
 * never navigated away from, so you land exactly where you were.
 *
 * TRUE vertical swipe (not a tap-to-advance carousel): CSS scroll-snap on a
 * single scrolling column, one 100dvh slide per candidate. iOS-native swipe
 * physics for free, no gesture library, no JS scroll math.
 *
 * v1 candidate source is /api/pricestream/feed — a flat random sample,
 * INCLUDING pieces you own (Brendon: "for testing purposes, we can expand
 * the algorithm later"). Wildcard dial is wired and persists the level, but
 * doesn't change the query yet — the taste-vector + wildcard-mix pass is a
 * follow-up once the algorithm ships.
 *
 * Real actions only: Starred (★︎/☆, lib/pins/starStore — the actual save
 * feature, NOT a separate bookmark), OutputFollowButton (the real per-output
 * follow CTA), and useCart().add — gated on the real `listed` flag from the
 * `listings` table, exactly like ArtworkCard's hi-cart.
 *
 * Colour treatment: the outer frame wears the piece's own dominant-colour
 * bucket (BUCKET_HEX, lib/output/derive.ts) — "the colourway associated with
 * the artwork" — and BOTH the outer frame and the inner surface use 4px,
 * the house control radius (the trait-pill law, docs/GLYPHS.md). Never
 * 999px; that radius doesn't exist on this platform.
 *
 * Styling lives in app/globals.css (Brendon, 2026-09-05 — the first pass
 * used `<style jsx>`, the only occurrence of scoped CSS-in-JS anywhere in
 * the codebase; it never took effect against the real build, which is why
 * the shipped feed rendered as unstyled, unbounded, stacked divs. Every
 * other component styles through global classes — fixed, no exceptions).
 */

import { useEffect, useRef, useState } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useCart } from '../../lib/state/CartContext';
import { artImageUrl } from '../../lib/project/registry';
import { BUCKET_HEX } from '../../lib/output/derive';
import { isStarred, toggleStar, subscribeStarred } from '../../lib/pins/starStore';
import OutputFollowButton from '../artwork/OutputFollowButton';
import type { PriceStreamCard } from '../../app/api/pricestream/feed/route';

const FALLBACK_COLOR = '#111111';

function Slide({ card }: { card: PriceStreamCard }) {
    const { add, items } = useCart();
    const [starred, setStarred] = useState(false);

    useEffect(() => {
        setStarred(isStarred(card.slug, card.tokenId));
        return subscribeStarred(() => setStarred(isStarred(card.slug, card.tokenId)));
    }, [card.slug, card.tokenId]);

    const inCart = items.some((i) => i.slug === card.slug && i.id === card.tokenId);
    const img = artImageUrl(card.slug, card.tokenId);
    const colorway = (card.dominantColor && BUCKET_HEX[card.dominantColor]) || FALLBACK_COLOR;

    return (
        <div className="ps-slide-frame" style={{ background: colorway }}>
            <div className="ps-slide-box">
                <div
                    className="ps-art"
                    style={img ? { backgroundImage: `url(${img})` } : undefined}
                />
                <div className="ps-scrim" />

                <div
                    className="ps-star-rail"
                    title="Starred"
                    onClick={() => { toggleStar(card.slug, card.tokenId); }}
                >
                    <span className="ps-star-ico">{starred ? '\u2605\uFE0E' : '\u2606\uFE0E'}</span>
                </div>

                <div className="ps-info">
                    <p className="ps-artist">{card.artist ?? 'Unknown artist'}</p>
                    <p className="ps-meta">
                        {card.projectName ?? card.slug} #{card.tokenId}
                        {card.listed && card.priceEth != null ? ` \u00b7 ${card.priceEth} \u25CA` : ''}
                    </p>
                    <div className="ps-actions">
                        <OutputFollowButton
                            outputId={`${card.slug}-${card.tokenId}`}
                            label={`${card.slug}${card.tokenId}`}
                        />
                        {card.listed ? (
                            <button
                                className="btn-mint ps-cart-btn"
                                onClick={() => add(card.slug, card.tokenId)}
                                disabled={inCart}
                            >
                                {inCart ? 'In cart' : 'Add to cart'}
                            </button>
                        ) : (
                            <button className="btn-mint ps-cart-btn ps-unlisted" disabled>
                                Not for sale
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function PriceStreamFeed() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'pricestream';
    const [cards, setCards] = useState<PriceStreamCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [wildcard, setWildcard] = useState(1); // 0,1,2 → level 1,2,3 (not yet wired to the query)
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        fetch('/api/pricestream/feed?count=20', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : { cards: [] }))
            .then((data) => setCards(data.cards ?? []))
            .finally(() => setLoading(false));
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="ps-overlay">
            <div className="ps-topbar">
                <button
                    className="ps-wildcard-pill"
                    onClick={() => setWildcard((w) => (w + 1) % 3)}
                    title="Wildcard level (not yet wired to the algorithm)"
                >
                    <span>PriceStream {'\u21CA\uFE0E'}</span>
                    <span className="ps-wc-dots">
                        {[0, 1, 2].map((i) => (
                            <i key={i} className={i <= wildcard ? 'on' : undefined} />
                        ))}
                    </span>
                </button>
                <button className="ps-close-btn" onClick={close} title="Close">&#10005;</button>
            </div>

            <div className="ps-scroller" ref={containerRef}>
                {loading && cards.length === 0 && (
                    <div className="ps-slide-frame" style={{ background: FALLBACK_COLOR }}>
                        <div className="ps-slide-box ps-loading">Loading&hellip;</div>
                    </div>
                )}
                {cards.map((c) => (
                    <Slide key={`${c.slug}:${c.tokenId}`} card={c} />
                ))}
            </div>
        </div>
    );
}
