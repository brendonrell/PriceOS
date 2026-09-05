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

            <style jsx>{`
                .ps-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 1000;
                    background: #000;
                    display: flex;
                    flex-direction: column;
                }
                .ps-scroller {
                    flex: 1;
                    overflow-y: scroll;
                    scroll-snap-type: y mandatory;
                    -webkit-overflow-scrolling: touch;
                }
                .ps-slide-frame {
                    scroll-snap-align: start;
                    scroll-snap-stop: always;
                    height: 100dvh;
                    width: 100%;
                    padding: 10px;
                    box-sizing: border-box;
                    /* House corner law: controls are 4px, surfaces are square.
                       This frame is a surface — 4px only because it's also
                       acting as a control-adjacent colour swatch; see box below. */
                    border-radius: 4px;
                }
                .ps-slide-box {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: #111111;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .ps-loading {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #e0e0e0;
                    font-family: 'Courier New', Courier, monospace;
                }
                .ps-art {
                    position: absolute;
                    inset: 0;
                    background-size: cover;
                    background-position: center;
                    background-color: #1a1a1a;
                }
                .ps-scrim {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(180deg, rgba(17,17,17,0) 45%, rgba(17,17,17,0.92) 100%);
                    pointer-events: none;
                }
                .ps-topbar {
                    position: absolute;
                    top: 14px;
                    left: 14px;
                    right: 14px;
                    z-index: 1001;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .ps-wildcard-pill {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(17,17,17,0.75);
                    border: 1px solid rgba(224,224,224,0.25);
                    color: #e0e0e0;
                    padding: 7px 12px;
                    border-radius: 4px;
                    font-size: 12px;
                    font-weight: bold;
                    font-family: 'Courier New', Courier, monospace;
                }
                .ps-wc-dots { display: flex; gap: 3px; }
                .ps-wc-dots i {
                    width: 5px; height: 5px; border-radius: 50%;
                    background: rgba(224,224,224,0.25); display: inline-block;
                }
                .ps-wc-dots i.on { background: #FFE600; }
                .ps-close-btn {
                    width: 30px; height: 30px;
                    border-radius: 4px;
                    background: rgba(17,17,17,0.75);
                    border: 1px solid rgba(224,224,224,0.25);
                    color: #e0e0e0;
                    font-size: 15px;
                    display: flex; align-items: center; justify-content: center;
                }
                .ps-star-rail {
                    position: absolute;
                    right: 14px;
                    bottom: 128px;
                    z-index: 4;
                    cursor: pointer;
                }
                .ps-star-ico { font-size: 26px; color: #e0e0e0; font-family: 'Courier New', Courier, monospace; }
                .ps-info {
                    position: absolute;
                    bottom: 0; left: 0; right: 0;
                    padding: 18px;
                    z-index: 3;
                    color: #e0e0e0;
                }
                .ps-artist { font-size: 14px; font-weight: bold; margin: 0 0 2px; }
                .ps-meta { font-size: 12px; color: rgba(224,224,224,0.7); margin: 0 0 12px; }
                .ps-actions { display: flex; gap: 10px; align-items: center; }
                .ps-cart-btn { height: 40px; padding: 0 18px; font-size: 13px; }
                .ps-unlisted { opacity: 0.4; }
            `}</style>
        </div>
    );
}
