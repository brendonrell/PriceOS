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
 * Build 22 layers added (gallery card surface gaps):
 *   - data-pct attribute on .meta-owner.price-trigger. Sim 8106 stamps a
 *     floor-relative pct that the body.pricelens-mode CSS swaps in via
 *     ::before content: attr(data-pct). Mock floor = 0.042 ETH (sim 8099).
 *     Format mirrors sim 8103: explicit +/- sign, one decimal, % suffix.
 *   - Per-card Aura vars (sim 8064-8067). --aura-angle = (i*137)%360 deg
 *     (golden-angle spread so cards aren't synchronized); --aura-duration
 *     = (10 + (i*23)%60/10)s (mild rotation-speed variation, 10–16s range).
 *     Read by the body.aura-active .edition-card::before conic gradient.
 *   - Hover overlay (sim 8041-8057). 7 icons (Star/Wishlist/Album/Note/
 *     Grail/Cart/Hammer) over a 0.85 black scrim. Cart only for listed
 *     tokens (sim 8050 isListed branch). Note + Hammer hidden by default
 *     (display:none style) — body.notes-mode / body.hammer-mode reveals
 *     them. Click handlers stub to showToast for v1; real wiring (toggleStar,
 *     openNotePrompt, addToCart, etc.) lands when those flows ship.
 *   - Breadcrumb sticker (sim 8072-8082). Small ⬤ dot on the bottom-right
 *     of .canvas-wrapper, mounted only on the 5 ids the page chose for
 *     this session (parent passes isBreadcrumb). Half-on/half-off the
 *     artwork's rounded corner — it's a "recently visited" UI marker, not
 *     part of the art.
 *   - Price Memory ghost (sim 8085-8089). Faded "LAST · {ethVal} Ξ" readout
 *     in the bottom-left of .canvas-wrapper. Always rendered; visible only
 *     when body.pm-active is set (CSS gate). Per-id deterministic seed
 *     mirrors sim verbatim so the readout is stable across reloads.
 *
 * Build 23 layer added (mute overlay):
 *   - Mute overlay (sim 8038-8040). <div class="mute-overlay"><span
 *     class="mute-label">Mute</span></div> always mounted inside
 *     .canvas-wrapper, before .hover-overlay (sim DOM order). CSS gates
 *     visibility on body.hammer-mode — overlay is display:none baseline,
 *     flips to display:flex when hammer-mode is on. The optional `muted`
 *     prop applies the .muted class to the article and swaps the label
 *     to .muted-final ("Muted" boxed-tape glyph) per sim ~2444. No
 *     parent currently passes muted=true — that requires a real toggleMute
 *     handler (sim 7280) which is out of this build's scope. The prop
 *     existing means the toggle wires up later without further markup
 *     changes. Sim 2390-2392: when hammer-mode is OFF, .muted/.hammered
 *     cards vanish from the grid — that rule lands in globals.css this
 *     build too.
 *
 * Out of v0 scope: fog-mode reveal handler lives in the collection page
 * (gallery-wide event delegation per sim 8364-8389), not here.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
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
    /* Build 22 — sim 8072-8082. Page picks 5 random ids per session as
       "recently visited" breadcrumbs and stamps a ⬤ sticker on each.
       The dot mounts on .canvas-wrapper bottom-right (half-on/half-off
       the rounded corner). Optional + defaults to false. */
    isBreadcrumb?: boolean;
    /* Build 23 — sim 7280 + 2390-2392 + 2444. Card's "muted" state. When
       true: article gets .muted class (which hides the card entirely
       outside hammer-mode per sim 2390), and the mute label flips to
       MUTED with .muted-final styling. No parent currently sets this —
       the toggleMute handler that flips it lands when hammer-mode click
       wiring ships. Optional + defaults to false. */
    muted?: boolean;
}

/* sim 8099 — mock floor used for the Price Lens pct readout. Real
   indexer floor wiring lands later; this is the visual demo. */
const MOCK_FLOOR_ETH = 0.042;

export default function ArtworkCard({
    id,
    showcasePick = false,
    isBreadcrumb = false,
    muted = false,
}: ArtworkCardProps) {
    const { open } = useModal();
    const { showToast } = useToast();
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

    /* Build 22 — sim 8100-8104. Floor-relative pct stamped as data-pct
       on .meta-owner.price-trigger. Body.pricelens-mode CSS swaps the
       price text for this pct via ::before content: attr(data-pct).
       parseFloat() strips the " ETH" suffix from the formatted price
       string ("0.123 ETH" → 0.123). Sim only computes/stamps for listed
       tokens, and our React only renders data-pct inside the listed
       branch, so the empty-string init is just for the unused path. */
    let pctStr = '';
    if (listed && meta?.price) {
        const rawEth = parseFloat(meta.price);
        const pct = ((rawEth / MOCK_FLOOR_ETH) - 1) * 100;
        pctStr = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
    }

    /* Build 22 — sim 8064-8067. Per-card Aura vars stamped inline on
       .edition-card. Without these every card animates at the same
       angle and speed (synchronized halos look mechanical, not
       organic). The body.aura-active .edition-card::before conic
       gradient reads them. id (not array index) is used as the seed
       so the variation is stable across reloads + sort/filter changes
       — sim seeds off the loop variable i which equals the token id
       in render order. */
    const auraAngle = (id * 137) % 360;
    const auraDuration = (10 + ((id * 23) % 60) / 10).toFixed(2) + 's';
    const articleStyle: CSSProperties = {
        ['--aura-angle' as string]: auraAngle + 'deg',
        ['--aura-duration' as string]: auraDuration,
    };

    /* Build 22 — sim 8041-8057. Hover overlay icons. v1 wiring stubs to
       showToast; real handlers (toggleStar, openNotePrompt, etc.) wire
       up when those flows ship. event.stopPropagation on every icon —
       otherwise the click bubbles to .edition-content and opens the
       modal. Note + Hammer carry display:none inline (sim 8048, 8056);
       body.notes-mode / body.hammer-mode flips them visible via CSS. */
    const stubAction = (label: string) => (e: React.MouseEvent) => {
        e.stopPropagation();
        showToast(label);
    };

    /* Build 22 — sim 8085. Price Memory ghost seed. Deterministic per id
       so the "last sale" readout is stable across reloads + filter / sort
       changes. CSS gates visibility on body.pm-active (sim 3690). */
    const lastSaleEth = (0.04 + ((id * 47 + 13) % 420) / 1000).toFixed(3);

    /* Build 23 — sim 7280-7290 + 2444-2457. When muted, the article
       carries .muted (which hides it outside hammer-mode per sim 2390),
       and the label text flips to "Muted" with .muted-final styling
       (boxed-tape tag, sim 2444-2457). */
    const articleClass =
        'edition-card' +
        (showcasePick ? ' showcase-pick' : '') +
        (muted ? ' muted' : '');

    return (
        <article
            className={articleClass}
            data-mint-id={id}
            style={articleStyle}
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
                    {/* Build 23 — sim 8038-8040 mute overlay. Always
                        mounted; CSS gates visibility on body.hammer-mode.
                        Sits before .hover-overlay in DOM order to match
                        sim's renderFeed append sequence. Label text is
                        "Mute" baseline; flips to "Muted" + .muted-final
                        when the parent passes muted=true (sim 7280-7290). */}
                    <div className="mute-overlay">
                        <span
                            className={
                                'mute-label' + (muted ? ' muted-final' : '')
                            }
                        >
                            {muted ? 'Muted' : 'Mute'}
                        </span>
                    </div>
                    {/* Build 22 — sim 8041-8057 hover overlay. */}
                    <div className="hover-overlay">
                        <div className="hover-bg" />
                        <div className="hover-icons">
                            <span
                                className="hi-icon"
                                title="Star"
                                data-starred="false"
                                onClick={stubAction('Starred')}
                            >
                                {'\u2606\uFE0E'}
                            </span>
                            <span
                                className="hi-icon"
                                title="Wishlist"
                                onClick={stubAction('Added to Wishlist')}
                            >
                                {'\u271B\uFE0E'}
                            </span>
                            <span
                                className="hi-icon"
                                title="Add to Album"
                                onClick={stubAction('Added to Album')}
                            >
                                {'\u25F0\uFE0E'}
                            </span>
                            <span
                                className="hi-icon hi-note"
                                title="Add Note"
                                style={{ display: 'none' }}
                                onClick={stubAction('Note prompt')}
                            >
                                {'\u229F\uFE0E'}
                            </span>
                            <span
                                className="hi-icon hi-grail"
                                title="Grail Pin"
                                onClick={stubAction('Grail pinned')}
                            >
                                {'\u27DF\uFE0E'}
                            </span>
                            {listed && (
                                <span
                                    className="hi-icon hi-cart"
                                    title="Add to Cart"
                                    onClick={stubAction('Added to Cart')}
                                >
                                    {'\u25A2\uFE0E'}
                                </span>
                            )}
                            <span
                                className="hi-icon hi-hammer"
                                title="Mute (Hammer)"
                                style={{ display: 'none' }}
                                onClick={stubAction('Muted')}
                            >
                                {'\u16A6\uFE0E'}
                            </span>
                        </div>
                    </div>
                    {/* Build 22 — sim 8077-8081 breadcrumb sticker. ⬤ on
                        bottom-right of .canvas-wrapper for the 5 ids the
                        page picked this session. CSS .canvas-wrapper:has(.breadcrumb-crumb)
                        flips overflow to visible so the dot can bleed past
                        the rounded corner (half-on/half-off). */}
                    {isBreadcrumb && (
                        <span
                            className="breadcrumb-crumb bc-br"
                            title="Breadcrumb · recently visited"
                        >
                            {'\u2B24'}
                        </span>
                    )}
                    {/* Build 22 — sim 8086-8089 price-memory ghost. Always
                        rendered; CSS gates visibility on body.pm-active.
                        Per-id deterministic seed — stable across reloads. */}
                    <span className="price-memory-ghost">
                        LAST · {lastSaleEth} Ξ
                    </span>
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
                            data-pct={pctStr}
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
