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

import { useEffect, useMemo, useRef, useState } from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { ART_IMAGE_BASE, artImageUrl, artThumbUrl } from '../../lib/project/registry';
import { BUCKET_HEX } from '../../lib/output/derive';
import { isStarred, toggleStar, subscribeStarred } from '../../lib/pins/starStore';
import OutputFollowButton from '../artwork/OutputFollowButton';
import type { PriceStreamCard } from '../../app/api/pricestream/feed/route';

const FALLBACK_COLOR = '#111111';

/* Shared by Slide (per-card data-color attr) and the feed root (initial
   frame colour before the IntersectionObserver has picked an active card) —
   one source of truth, so the two never disagree. */
function colorwayOf(card: Pick<PriceStreamCard, 'dominantColor'>): string {
    return (card.dominantColor && BUCKET_HEX[card.dominantColor]) || FALLBACK_COLOR;
}

function Slide({ card }: { card: PriceStreamCard }) {
    const colorway = colorwayOf(card);

    /* This is a full-bleed hero slide, not a grid tile — same real-art
       source as OutputPreview's modal (Rule #0 — reuse, never reinvent):
       the stored high-res master leads, with the plain .png as a re-pin
       fallback. The ~256px grid thumb is NOT a fill candidate here — at
       full-screen size it was the source of the blur/crop complaint —
       it only paints instantly underneath while the master loads in,
       exactly like the modal's loading panel. */
    const candidates = useMemo(() => {
        if (!ART_IMAGE_BASE) return [] as string[];
        return [artImageUrl(card.slug, card.tokenId), `${ART_IMAGE_BASE}/${card.slug}/${card.tokenId}.png`]
            .filter((u): u is string => !!u);
    }, [card.slug, card.tokenId]);
    const [stage, setStage] = useState(0);
    const [loaded, setLoaded] = useState(false);
    const imgSrc = candidates[stage] ?? null;
    const thumbSrc = artThumbUrl(card.slug, card.tokenId);
    useEffect(() => { setLoaded(false); setStage(0); }, [card.slug, card.tokenId]);

    return (
        // No outer ps-slide-frame div here on purpose: the coloured/rounded
        // frame is now ONE persistent element in the feed root, not part of
        // the scroll-snapped slide, so it never travels with the swipe (see
        // PriceStreamFeed below). data-color/data-slug/data-token are read
        // by that root's IntersectionObserver, which drives BOTH the frame
        // colour and the persistent star/info/actions overlay — the only
        // thing that moves on swipe is the art itself underneath. */}
        <div
            className="ps-slide-box"
            data-color={colorway}
            data-slug={card.slug}
            data-token={card.tokenId}
        >
            {thumbSrc && !loaded && (
                <img
                    className="ps-art ps-art-thumb"
                    src={thumbSrc}
                    alt=""
                    aria-hidden="true"
                    decoding="async"
                    draggable={false}
                />
            )}
            {imgSrc && (
                <img
                    className={`ps-art${loaded ? ' ps-art-loaded' : ''}`}
                    src={imgSrc}
                    alt={`${card.projectName ?? card.slug} #${card.tokenId} — artwork`}
                    loading="lazy"
                    decoding="async"
                    draggable={false}
                    onLoad={() => setLoaded(true)}
                    onError={() => setStage((s) => s + 1)}
                />
            )}
            <div className="ps-scrim" />
        </div>
    );
}

/* The persistent action layer: star, artist/meta, follow + cart. Rendered
   ONCE at the feed root (not per-slide) so it never travels with the swipe
   — only its content swaps to match whichever card is currently active,
   the same way ps-frame's background-color already does. */
function ActionRail({ card }: { card: PriceStreamCard | null }) {
    const { add, items } = useCart();
    const [starred, setStarred] = useState(false);

    useEffect(() => {
        if (!card) return;
        setStarred(isStarred(card.slug, card.tokenId));
        return subscribeStarred(() => setStarred(isStarred(card.slug, card.tokenId)));
    }, [card?.slug, card?.tokenId]);

    if (!card) return null;
    const inCart = items.some((i) => i.slug === card.slug && i.id === card.tokenId);

    return (
        <>
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
        </>
    );
}

export default function PriceStreamFeed() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'pricestream';
    const [cards, setCards] = useState<PriceStreamCard[]>([]);
    const [loading, setLoading] = useState(false);
    const [wildcard, setWildcard] = useState(1); // 0,1,2 → level 1,2,3 (not yet wired to the query)
    const [frameColor, setFrameColor] = useState(FALLBACK_COLOR);
    const [activeCard, setActiveCard] = useState<PriceStreamCard | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        fetch('/api/pricestream/feed?count=20', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : { cards: [] }))
            .then((data) => setCards(data.cards ?? []))
            .finally(() => setLoading(false));
    }, [isOpen]);

    // First card sets the frame colour + active card immediately on load;
    // from then on the observer below owns both as the active slide changes.
    useEffect(() => {
        if (cards.length) {
            setFrameColor(colorwayOf(cards[0]));
            setActiveCard(cards[0]);
        }
    }, [cards]);

    // The frame itself never moves — only its background-color fades (the
    // same html/body colorway transition used app-wide, app/globals.css:153)
    // — and the star/info/actions rail swaps to match, to whichever card is
    // currently ≥60% in view. Re-runs whenever the slide list changes since
    // slides are only mounted after the fetch.
    useEffect(() => {
        const root = containerRef.current;
        if (!root) return;
        const slides = root.querySelectorAll<HTMLElement>('.ps-slide-box[data-color]');
        if (!slides.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const top = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
                if (!top) return;
                const el = top.target as HTMLElement;
                const color = el.dataset.color;
                if (color) setFrameColor(color);
                const slug = el.dataset.slug;
                const tokenId = el.dataset.token ? Number(el.dataset.token) : null;
                if (slug && tokenId != null) {
                    const match = cards.find((c) => c.slug === slug && c.tokenId === tokenId);
                    if (match) setActiveCard(match);
                }
            },
            { root, threshold: [0.6] },
        );
        slides.forEach((el) => observer.observe(el));
        return () => observer.disconnect();
    }, [cards]);

    if (!isOpen) return null;

    return (
        <div className="ps-overlay">
            <div className="ps-topbar">
                <button
                    className="ps-wildcard-pill"
                    onClick={() => {
                        const next = (wildcard + 1) % 3;
                        setWildcard(next);
                        showToast(`Wildcard: ${next + 1}/3`);
                    }}
                    title="Wildcard level (not yet wired to the algorithm)"
                >
                    <span>PriceStream {'\u21C8\uFE0E'}</span>
                    <span className="ps-wc-dots">
                        {[0, 1, 2].map((i) => (
                            <i key={i} className={i <= wildcard ? 'on' : undefined} />
                        ))}
                    </span>
                </button>
                <button className="ps-close-btn" onClick={close} title="Close">&#10005;</button>
            </div>

            {/* The frame: fixed in place for the life of the feed, padded +
                rounded exactly like before — it just no longer lives inside
                the scroll-snapped slide, so swiping never carries it along. */}
            <div className="ps-frame" style={{ background: frameColor }}>
                <div className="ps-scroller" ref={containerRef}>
                    {loading && cards.length === 0 && (
                        <div className="ps-slide-box ps-loading">Loading&hellip;</div>
                    )}
                    {cards.map((c) => (
                        <Slide key={`${c.slug}:${c.tokenId}`} card={c} />
                    ))}
                </div>
                {/* Persistent overlay, sibling of the scroller — sits above it
                    and never scrolls. Only the art underneath moves; star,
                    artist/meta, follow, and cart stay put and just update. */}
                <ActionRail card={activeCard} />
            </div>
        </div>
    );
}
