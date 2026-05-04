'use client';

/*
 * ArtworkCard
 *
 * Single edition tile in the collection gallery. Sim's gallery is
 * built imperatively in renderFeed (sim ~8155) — each card is an
 * <article class="edition-card"> wrapping a clickable .edition-content
 * with a .canvas-wrapper for the art and a .meta caption row beneath.
 *
 * v0 scope (this build):
 *   - Render sim's flat card structure with sim class names so the
 *     CSS port wires up without touching this component.
 *   - Stable HSL placeholder canvas. Same seeded formula as ArtworkModal
 *     (sim seed = id * 2654435761 >>> 0, three hue derivations, linear +
 *     radial gradient + #id stamp). 400px internal resolution matches
 *     sim's THUMB_WIDTH constant — wrapper scales via CSS.
 *   - Show #id and either the listed price or the truncated owner addr,
 *     matching sim's metaIdStr / metaOwnerStr split (sim ~8092). Listed
 *     tokens get .meta-owner.price-trigger; unlisted get .meta-owner.profile-link.
 *   - On click, open the global ArtworkModal at this id via
 *     useModal().open('artwork', id). The handler lives on .edition-content
 *     (matches sim's contentInner.onclick at ~8009).
 *
 * Out of v0 scope (deferred to later builds, listed so the next ship knows
 * where to layer in): hover overlay icons (Star/Wishlist/Album/Note/Grail/
 * Cart/Hammer), Aura per-card vars, breadcrumb dots, price-memory ghost,
 * mute overlay, badge-owned check next to #id, fog-mode reveal. The DOM
 * shape (article > edition-content > canvas-wrapper) stays open so those
 * layer in without restructuring.
 */

import { useEffect, useRef } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useTokenMeta } from '../lib/hooks/useTokenMeta';

interface ArtworkCardProps {
    id: number;
    /* Build 21 — sim 13113-13130 + globals.css :2690.
       When the parent gallery has `.showcase-mode`, every .edition-card
       is hidden via display:none unless it also carries .showcase-pick.
       The page picks 6 random ids once on mount and passes showcasePick
       through here so the Showcase tab actually renders 6 tiles instead
       of an empty grid. Optional + defaults to false so the Artworks
       tab path is unchanged. */
    showcasePick?: boolean;
}

export default function ArtworkCard({ id, showcasePick = false }: ArtworkCardProps) {
    const { open } = useModal();
    const meta = useTokenMeta(id);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    /* Canvas placeholder — same HSL formula ArtworkModal uses (sim seed
       math, three derived hues, linear + radial gradients, #id stamp).
       400px internal resolution matches sim's THUMB_WIDTH (sim ~8030). */
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const w = 400;
        canvas.width = w;
        canvas.height = w;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const seed = (id * 2654435761) >>> 0;
        const h1 = seed % 360;
        const h2 = ((seed * 13) >>> 0) % 360;
        const h3 = ((seed * 31) >>> 0) % 360;

        const linear = ctx.createLinearGradient(0, 0, 0, w);
        linear.addColorStop(0, `hsl(${h1}, 65%, 58%)`);
        linear.addColorStop(0.5, `hsl(${h2}, 65%, 48%)`);
        linear.addColorStop(1, `hsl(${h3}, 65%, 38%)`);
        ctx.fillStyle = linear;
        ctx.fillRect(0, 0, w, w);

        const radial = ctx.createRadialGradient(
            w * 0.5,
            w * 0.5,
            0,
            w * 0.5,
            w * 0.5,
            w * 0.75
        );
        radial.addColorStop(0, `hsla(${h1}, 85%, 72%, 0.55)`);
        radial.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = radial;
        ctx.fillRect(0, 0, w, w);

        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = `bold ${Math.floor(w / 8)}px "Rubik Mono One", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`#${id}`, w / 2, w / 2);
    }, [id]);

    const handleOpen = () => open('artwork', id);

    /* Sim caption split (sim ~8092):
         - listed   → .meta-owner.price-trigger showing the price
         - unlisted → .meta-owner.profile-link showing the owner display
       The price-trigger onClick re-opens the modal in sim; the .edition-content
       wrapper already opens it on any card click, so the price span just
       stops propagation to avoid double-firing if the future overlay layer
       intercepts events differently. */
    const listed = meta?.price != null;
    const ownerDisplay = meta?.ownerDisplay ?? '';

    return (
        <article
            className={`edition-card${showcasePick ? ' showcase-pick' : ''}`}
            data-mint-id={id}
        >
            <div
                className="edition-content"
                onClick={handleOpen}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOpen();
                    }
                }}
            >
                <div
                    className="canvas-wrapper art-placeholder"
                    data-id={id}
                    style={{ aspectRatio: '1 / 1' }}
                >
                    <canvas
                        ref={canvasRef}
                        style={{ width: '100%', height: '100%', display: 'block' }}
                    />
                </div>
                <div className="meta">
                    {/* Build 21 — sim 8108. The first 3 ids carry an
                        "owned by you" check-mark glyph nested inside
                        .meta-id, after a leading space. Sim hardcodes
                        i <= 3 even though _brendonOwned is a wider set
                        — we mirror sim verbatim for visual parity. */}
                    <span className="meta-id">
                        #{id}
                        {id <= 3 && (
                            <>
                                {' '}
                                <span className="badge-owned" title="Owned by You">
                                    <span className="css-check" />
                                </span>
                            </>
                        )}
                    </span>
                    {listed ? (
                        <span
                            className="meta-owner price-trigger"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleOpen();
                            }}
                        >
                            {meta!.price}
                        </span>
                    ) : (
                        <a
                            className="meta-owner profile-link"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {ownerDisplay}
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}
