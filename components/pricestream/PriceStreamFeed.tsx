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
 * v2 candidate source is /api/pricestream/feed — a flat random sample,
 * INCLUDING pieces you own (Brendon: "for testing purposes, we can expand
 * the algorithm later"). Wildcard dial is wired and persists the level, but
 * doesn't change the query yet — the taste-vector + wildcard-mix pass is a
 * follow-up once the algorithm ships. Portrait/landscape (Brendon,
 * 2026-09-16): the pool now follows the device's live orientation —
 * ?aspect=wide when the viewport tilts landscape, tall by default — same
 * shape either way.
 *
 * Real actions only: Starred (★︎/☆, lib/pins/starStore — the actual save
 * feature, NOT a separate bookmark, same float-confirm animation as
 * OutputTitleStar/SoundtrackStarButton elsewhere), Share (↗︎, lib/pwa/share —
 * same glyph + shareLink() as every other share point, never the ▶ play
 * icon), FollowButton (the real per-ARTIST follow, Brendon 2026-09-16 —
 * previously followed the output; a piece's follow-worthy identity is the
 * person who made it), and useCart().add — gated on the real `listed` flag
 * from the `listings` table, exactly like ArtworkCard's hi-cart.
 *
 * Layout: edge-to-edge, actual TikTok style — no frame border, no padding,
 * no rounded corners (Brendon, 2026-09-14: the colorway-border frame
 * "isn't working," reverted).
 *
 * Colour treatment: the piece's own PROJECT colorway (projectColorway(),
 * lib/project/registry.ts — fixed 2026-09-16, was misreading a generic
 * pixel-bucket swatch instead of the project's real signature hex) themes
 * the BUTTONS instead of the frame — wildcard pill, close, star, share,
 * follow, CTA — via --ps-accent/--ps-accent-fg custom props set on
 * .ps-overlay (app/globals.css), so every button updates together the same
 * way the app-wide bg colorway fades, and none of them travel with the
 * swipe (they live outside .ps-scroller). Fg contrast per button uses the
 * same isLight() check as lib/profile/profileLogos.ts — see topbarFgFor
 * below.
 *
 * Art: full-res master is preloaded one slide ahead of the active card so
 * it's already decoded by the time you swipe to it — the blurred 256px
 * thumb was never the bug, waiting on the network for it was (Brendon,
 * 2026-09-14: "artwork is blurry again").
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
import { useMarketSheet } from '../../lib/state/MarketSheetContext';
import { useFiat } from '../../lib/state/FiatContext';
import { formatEth } from '../../lib/format/eth';
import { ART_IMAGE_BASE, artImageUrl, artThumbUrl, getProject, projectColorway } from '../../lib/project/registry';
import { isStarred, toggleStar, subscribeStarred } from '../../lib/pins/starStore';
import { useUserIdentity } from '../../lib/hooks/useUserRank';
import { shareLink } from '../../lib/pwa/share';
import AsciiId from '../hero/AsciiId';
import FollowButton from '../profile/FollowButton';
import type { PriceStreamCard } from '../../app/api/pricestream/feed/route';

const FALLBACK_COLOR = '#111111';

/* Same on-colorway contrast check as lib/profile/profileLogos.ts and
   lib/stickers/catalog.ts (each keeps its own copy rather than sharing one —
   established pattern in this codebase, not new here). YIQ luminance,
   140/255 threshold. */
function isLight(hex: string): boolean {
    const h = hex.replace('#', '');
    const r = parseInt(h.slice(0, 2), 16) || 0;
    const g = parseInt(h.slice(2, 4), 16) || 0;
    const b = parseInt(h.slice(4, 6), 16) || 0;
    return (r * 299 + g * 587 + b * 114) / 1000 >= 140;
}
const topbarFgFor = (hex: string) => (isLight(hex) ? '#1A1A1A' : '#e0e0e0');

/* Shared by Slide (per-card data-color attr) and the feed root (initial
   frame colour before the IntersectionObserver has picked an active card) —
   one source of truth, so the two never disagree.
 *
 * Fixed (Brendon, 2026-09-16: "colorways are only correct like half the
 * time"): this was reading card.dominantColor — a per-TOKEN pixel-sampled
 * bucket name (one of ~14 generic buckets, e.g. "Blue") — through BUCKET_HEX,
 * a cosmetic swatch table for THAT bucket. Two different projects landing in
 * the same bucket got the same generic swatch, not their own colour — the
 * "hash synesthesia" symptom. projectColorway(slug) is the actual answer:
 * the project's own signature hex (DB override, registry fallback as the
 * rest of the app already reads it via lib/project/registry). */
function colorwayOf(card: Pick<PriceStreamCard, 'slug'>): string {
    return projectColorway(card.slug) ?? FALLBACK_COLOR;
}

function Slide({ card, priority }: { card: PriceStreamCard; priority: boolean }) {
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
                    loading={priority ? 'eager' : 'lazy'}
                    fetchPriority={priority ? 'high' : 'auto'}
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
    const { add, items, has: cartHas } = useCart();
    const { showToast } = useToast();
    const { openOfferSheet, openOffersPanel } = useMarketSheet();
    const { ethToFiat } = useFiat();
    const [starred, setStarred] = useState(false);
    // Star confirm float — same rising/sinking ★ used everywhere else a star
    // toggles (OutputTitleStar, SoundtrackStarButton, trait pills): a fresh
    // key remounts the span so its animation replays every tap.
    const [floatId, setFloatId] = useState(0);
    const [floatDown, setFloatDown] = useState(false);

    useEffect(() => {
        if (!card) return;
        setStarred(isStarred(card.slug, card.tokenId));
        return subscribeStarred(() => setStarred(isStarred(card.slug, card.tokenId)));
    }, [card?.slug, card?.tokenId]);

    // Artist follow target: the real per-output artist, same registry lookup
    // ArtworkPageBody uses for the artist lockup — resolved to an address via
    // useUserIdentity so FollowButton (the real user→user follow) can target it.
    const artistHandle = card ? (getProject(card.slug)?.artistHandle ?? 'opus4-6') : null;
    const artistIdentity = useUserIdentity(artistHandle);

    if (!card) return null;
    const inCart = items.some((i) => i.slug === card.slug && i.id === card.tokenId);

    /* Exact CTA the artwork modal shows a non-owner (components/artwork/
       ArtworkPageBody.tsx onCta/ctaLabel) — BUY · price when listed, else
       MAKE OFFER, never a dead "Not for sale" (Brendon, 2026-09-07: "show
       the exact CTA from the artwork modal"). PriceStream doesn't exclude
       your own pieces yet (see the route's v1 note), so the owner-only
       LIST/UNLIST branch isn't reachable here — those two cover it. */
    const onCta = () => {
        if (card.listed) {
            if (cartHas(card.slug, card.tokenId)) {
                showToast(`${card.projectName ?? card.slug} #${card.tokenId}: ALREADY IN CART`);
            } else {
                add(card.slug, card.tokenId);
                const next = items.length + 1;
                showToast(`Added to cart \u00b7 ${next} item${next === 1 ? '' : 's'}`);
            }
        } else {
            openOfferSheet([{ slug: card.slug, id: card.tokenId }]);
        }
    };

    const onShare = async () => {
        const url = typeof window !== 'undefined'
            ? `${window.location.origin}/art/${card.slug}/${card.tokenId}`
            : `/art/${card.slug}/${card.tokenId}`;
        const r = await shareLink({ url, title: `${card.projectName ?? card.slug} #${card.tokenId} on Price Discussion` });
        if (r === 'copied') showToast('Link: COPIED');
        else if (r === 'unavailable') showToast('Share: UNAVAILABLE');
    };

    const onStar = () => {
        const r = toggleStar(card.slug, card.tokenId);
        setFloatDown(r !== 'starred');
        setFloatId((n) => n + 1);
        showToast(r === 'starred' ? 'Added to your Starred Outputs List (Private)' : 'Removed from your Starred Outputs List');
    };

    return (
        <>
            <div className="ps-rail-stack">
                <div className="ps-share-rail" title="Share" onClick={onShare}>
                    <span className="ps-share-ico">{'\u2197\uFE0E'}</span>
                </div>
                <div className="ps-star-rail" title="Starred" onClick={onStar}>
                    <span className={`ps-star-ico${starred ? ' is-filled' : ''}`}>{starred ? '\u2605\uFE0E' : '\u2606\uFE0E'}</span>
                    {floatId > 0 && (
                        <span key={floatId} className={`project-name-star-float${floatDown ? ' is-down' : ''}`} aria-hidden="true">
                            {'\u2605\uFE0E'}
                        </span>
                    )}
                </div>
            </div>

            <div className="ps-info">
                <p className="ps-meta">
                    {card.projectName ?? card.slug} <span className="ps-meta-id">#{card.tokenId}</span>
                    {card.listed && card.priceEth != null ? ` \u00b7 ${card.priceEth} \u25CA` : ''}
                </p>
                <p className="ps-artist">
                    by {artistHandle ? <AsciiId handle={artistHandle} /> : 'Unknown artist'}
                </p>
                <div className="ps-actions">
                    {artistIdentity.address && artistHandle && (
                        <FollowButton targetAddress={artistIdentity.address} targetHandle={artistHandle} />
                    )}
                    <button className="btn-mint" onClick={onCta} disabled={inCart && card.listed}>
                        {card.listed ? (
                            <>
                                <span className="mint-lbl">{inCart ? 'IN CART' : 'BUY'}</span>
                                {!inCart && (
                                    <span className="mint-price">
                                        ({formatEth(Number(card.priceEth))} ETH)
                                        {ethToFiat(Number(card.priceEth)) && (
                                            <span className="modal-action-btn-fiat"> {ethToFiat(Number(card.priceEth))}</span>
                                        )}
                                    </span>
                                )}
                            </>
                        ) : (
                            <span className="mint-lbl">MAKE OFFER</span>
                        )}
                    </button>
                    {card.offersCount > 0 && (
                        <button
                            type="button"
                            className="btn-soundtrack mk-offers-glyph-btn"
                            onClick={() => openOffersPanel(card.slug, card.tokenId)}
                            title={`${card.offersCount} open ${card.offersCount === 1 ? 'offer' : 'offers'}`}
                        >
                            {'\u2736\uFE0E'}
                            <span className="mk-offers-badge">
                                <span className="mk-offers-badge-num">{card.offersCount}</span>
                            </span>
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
    const [accentColor, setAccentColor] = useState(FALLBACK_COLOR);
    const accentFg = useMemo(() => topbarFgFor(accentColor), [accentColor]);
    const [activeCard, setActiveCard] = useState<PriceStreamCard | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    // Portrait/landscape candidate pools (Brendon, 2026-09-16): mobile tilt
    // into landscape swaps the feed to landscape-only art, same swipe
    // mechanics — matches the 'aspect' bucket already captured per output
    // (lib/output/derive.ts orientationOf) and the route's existing filter.
    const [aspect, setAspect] = useState<'tall' | 'wide'>('tall');
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mq = window.matchMedia('(orientation: landscape)');
        setAspect(mq.matches ? 'wide' : 'tall');
        const onChange = (e: MediaQueryListEvent) => setAspect(e.matches ? 'wide' : 'tall');
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);
        fetch(`/api/pricestream/feed?count=20&aspect=${aspect}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : { cards: [] }))
            .then((data) => setCards(data.cards ?? []))
            .finally(() => setLoading(false));
    }, [isOpen, aspect]);

    // First card sets the button accent + active card immediately on load;
    // from then on the observer below owns both as the active slide changes.
    useEffect(() => {
        if (cards.length) {
            setAccentColor(colorwayOf(cards[0]));
            setActiveCard(cards[0]);
        }
    }, [cards]);

    // Buttons never move — only their background-color fades (the same
    // html/body colorway transition used app-wide, app/globals.css:153) —
    // and the star/info/actions rail swaps to match, to whichever card is
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
                if (color) setAccentColor(color);
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

    // Preload the master image one slide ahead of whichever is active, so
    // it's already decoded by the time a fast TikTok-style swipe reaches it
    // — this is the actual fix for the recurring blur complaint (see the
    // file-header comment); the thumb was never the problem.
    useEffect(() => {
        if (!activeCard || !ART_IMAGE_BASE) return;
        const idx = cards.findIndex((c) => c.slug === activeCard.slug && c.tokenId === activeCard.tokenId);
        if (idx === -1) return;
        const next = cards[idx + 1];
        if (!next) return;
        const url = artImageUrl(next.slug, next.tokenId);
        if (url) { const img = new Image(); img.src = url; }
    }, [activeCard, cards]);

    if (!isOpen) return null;

    return (
        <div
            className="ps-overlay"
            style={{
                ['--ps-accent' as string]: accentColor,
                ['--ps-accent-fg' as string]: accentFg,
            } as React.CSSProperties}
        >
            <div className="ps-topbar">
                <button
                    className="ps-wildcard-pill"
                    onClick={() => {
                        const next = (wildcard + 1) % 3;
                        setWildcard(next);
                        showToast(`PriceStream Algo Wildcard: LEVEL ${next + 1}`);
                    }}
                    title="Wildcard level (not yet wired to the algorithm)"
                >
                    <span className="ps-wc-glyph">{'\u21C8\uFE0E'}</span>
                    <span>PriceStream</span>
                    <span className="ps-wc-dots">
                        {[0, 1, 2].map((i) => (
                            <i key={i} className={i <= wildcard ? 'on' : undefined} />
                        ))}
                    </span>
                </button>
                <button className="ps-close-btn" onClick={close} title="Close">&#10005;</button>
            </div>

            {/* The frame: fixed in place for the life of the feed, edge-to-edge
                now (no padding/radius/colour) — it just no longer lives inside
                the scroll-snapped slide, so swiping never carries it along. */}
            <div className="ps-frame">
                <div className="ps-scroller" ref={containerRef}>
                    {loading && cards.length === 0 && (
                        <div className="ps-slide-box ps-loading">Loading&hellip;</div>
                    )}
                    {cards.map((c, i) => (
                        <Slide key={`${c.slug}:${c.tokenId}`} card={c} priority={i === 0} />
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
