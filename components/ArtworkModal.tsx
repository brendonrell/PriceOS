'use client';

/*
 * ArtworkModal
 *
 * Sim id #modal — the most-clicked surface on the platform. Mounted
 * once globally (PriceOSShell) so any caller — gallery cards, the
 * /token/[id] route, deep links, the Top Bar Calendar's "open token"
 * buttons — can invoke it via useModal().open('artwork', tokenId).
 *
 * Sim refs:
 *   markup ............. sim.html 5357–5421
 *   openModal/nav ...... sim.html 8725–8825
 *   toggleGrailPin ..... sim.html 12413–12442
 *
 * Surfaces deferred (each rides with its own ship):
 *   - ArtEngine canvas render → seeded HSL placeholder for now;
 *     each id gets a stable colour triplet so prev/next nav still
 *     reads as "different artwork".
 *   - Calc Sheet → ƒ tab is wired but currently shows placeholder
 *     toast. Sheet renderer is the next ship.
 *   - Per-token notes (⊟ pill) → placeholder toast. NotePromptContext
 *     covers day + artist kinds today; token kind extends here later.
 *   - handleModalAction (BUY/LIST/MAKE OFFER trade flow) → placeholder
 *     toast; live wallet wiring is its own workstream.
 *   - hammer-mode mute overlay inside the canvas wrap.
 *
 * Hooks discipline (locked rule from session bootstrap): every hook
 * sits at the top of the component, before any conditional return.
 * The whole component renders the modal element on every render,
 * gating internals on `id != null` rather than early-returning.
 *
 * Data routing: token metadata comes from CollectionContext via
 * useTokenMeta(id). The modal no longer owns the LCG seed math —
 * swapping the indexer in is a single-file change in CollectionContext
 * with zero diff here.
 */

import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
} from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useCalcSheet } from '../lib/state/CalcSheetContext';
import { useCollection } from '../lib/state/CollectionContext';
import { useTokenMeta } from '../lib/hooks/useTokenMeta';
import {
    getGrails,
    subscribeGrails,
    togglePin as storeTogglePin,
} from '../lib/pins/grailStore';

/* iOS variant selector 15 — forces the preceding glyph to render in its
   text-style form (mono, no emoji colour). Required for every Unicode
   glyph the modal paints; matches sim's `&#xFE0E;` everywhere. */
const VS15 = '\uFE0E';

export default function ArtworkModal() {
    const { openModal, currentModalId, setCurrentModalId, close } = useModal();
    const { showToast } = useToast();
    const { openCalcSheet } = useCalcSheet();
    const { title, totalEditions, floorEth } = useCollection();

    /* F50 (BUG-02) — grail pins now live in lib/pins/grailStore so
       ArtworkCard's hover icon, the TopBarRow pill row, and this modal
       share one source of truth. Pre-F50 this component owned the
       useLocalStorage hook directly, which left card + bar reading
       stale state. Subscribe-on-mount mirrors the store snapshot into
       local state so the pin button re-renders when other surfaces
       toggle it. */
    const [grailPins, setGrailPins] = useState<readonly number[]>(
        () => getGrails()
    );
    useEffect(() => {
        setGrailPins(getGrails());
        return subscribeGrails((next) => setGrailPins(next));
    }, []);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const isOpen = openModal?.name === 'artwork';
    const id = isOpen ? currentModalId : null;

    /* Token metadata — id-keyed lookup over CollectionContext. Returns
       null when the modal is closed or id is unmapped. */
    const meta = useTokenMeta(id);

    /* Canvas placeholder render. Real ArtEngine wiring is its own ship;
       this paints a stable HSL gradient + radial glow + #id stamp so the
       modal looks alive and prev/next nav reads as distinct tokens. */
    useEffect(() => {
        if (!isOpen || id == null) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        const w = window.innerWidth >= 601 ? 800 : 600;
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
    }, [isOpen, id]);

    /* Scroll-position preservation. ModalContext applies `body.modal-open`,
       and modal.css turns that into `position: fixed` — which would snap
       the page to the top of the viewport on open without the saved-Y
       restore on close. Sim does the same dance in openModal/closeModal
       (sim.html line 8771 + 7446). */
    useEffect(() => {
        if (!isOpen) return;
        const y = window.scrollY;
        document.body.style.top = `-${y}px`;
        return () => {
            document.body.style.top = '';
            window.scrollTo(0, y);
        };
    }, [isOpen]);

    /* Prev/next nav. Sim cycles through the visible-cards array; without
       a gallery yet, we walk the full edition range with wrap-around. */
    const goNext = useCallback(() => {
        if (id == null) return;
        setCurrentModalId(id >= totalEditions ? 1 : id + 1);
    }, [id, totalEditions, setCurrentModalId]);

    const goPrev = useCallback(() => {
        if (id == null) return;
        setCurrentModalId(id <= 1 ? totalEditions : id - 1);
    }, [id, totalEditions, setCurrentModalId]);

    /* Arrow keys for nav. Escape is owned by ModalContext. */
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goNext();
            if (e.key === 'ArrowLeft') goPrev();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, goNext, goPrev]);

    /* Grail pin toggle. Mirrors sim's toggleGrailPin (sim 12413), including
       the 5-pin cap and the "Prisms #N GRAIL PINNED / DE-PINNED" toast.
       F50 (BUG-02): delegates state mutation to grailStore so
       ArtworkCard's hover icon and TopBarRow pills stay in sync. */
    const togglePin = useCallback(() => {
        if (id == null) return;
        const collName =
            title.charAt(0) + title.slice(1).toLowerCase();
        const result = storeTogglePin(id);
        if (result === 'limit') {
            showToast('Grail Pin Limit: 5 max');
            return;
        }
        if (result === 'unpinned') {
            showToast(`${collName} #${id} DE-PINNED`);
            return;
        }
        showToast(`${collName} #${id} GRAIL PINNED`);
    }, [id, title, showToast]);

    /* Backdrop click closes only when the click lands on the modal element
       itself, not bubbled from a child. Mirrors sim's onclick guard at
       sim.html line 8825. */
    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close();
        },
        [close]
    );

    const isPinned = id != null && grailPins.includes(id);

    /* Action button label + Calc-tab visibility. ƒ tab shows ONLY in BUY
       state (sim 8762): LIST has no Calc (cost basis is the real number
       for owned tokens), MAKE OFFER has no Calc (no listing price to
       calc against). */
    let actionLabel: ReactNode = null;
    let hasCalc = false;
    if (meta) {
        if (meta.isOwnedByBrendon) {
            actionLabel = meta.price ? (
                <>
                    LIST{' '}
                    <span className="modal-action-btn-price">
                        &middot; {meta.price}
                    </span>
                </>
            ) : (
                <>LIST</>
            );
        } else if (meta.price) {
            actionLabel = (
                <>
                    BUY{' '}
                    <span className="modal-action-btn-price">
                        &middot; {meta.price}
                    </span>
                </>
            );
            hasCalc = true;
        } else {
            actionLabel = <>MAKE OFFER</>;
        }
    }

    /* Glyphs are written as Unicode literals + VS15 to dodge JSX entity
       parsing surprises and to keep iOS Safari from upgrading them to
       emoji presentation. Matches sim's `&#xFE0E;` discipline. */

    return (
        <div
            id="modal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            onClick={onBackdropClick}
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={close}
                title="Close"
            >
                {`\u00D7${VS15}`}
            </div>

            <div
                className={`modal-pin-hint${isPinned ? ' pinned' : ''}`}
                role="button"
                tabIndex={0}
                onClick={togglePin}
                title="Grail Pin"
            >
                {`\u27DF${VS15}`}
            </div>

            <div className="modal-canvas-wrap">
                <canvas id="modalCanvas" ref={canvasRef} />
            </div>

            {id != null && meta && (
                <>
                    <div className="modal-info">
                        <div className="modal-title" id="mTitle">
                            <span
                                className="hover-link"
                                role="button"
                                tabIndex={0}
                                onClick={close}
                            >
                                {title}
                            </span>
                            {' '}#{id}
                        </div>
                        <div className="modal-artist" id="mArtist">
                            by @claude
                        </div>
                        <div className="modal-stats-row" id="mStatsRow">
                            <span className="modal-stat" id="mOwnerStat">
                                {meta.isOwnedByBrendon ? (
                                    <>
                                        Owned by you{' '}
                                        <span
                                            className="owner-self-check"
                                            aria-label="this is you"
                                        >
                                            &#x2713;
                                        </span>
                                    </>
                                ) : (
                                    `Owned by ${meta.ownerDisplay}`
                                )}
                            </span>
                        </div>
                        <div className="modal-pill-row" id="mPillRow">
                            <span
                                className="modal-pill"
                                title="Star"
                                onClick={() => showToast('Starred')}
                            >
                                {`\u2606${VS15}`}
                            </span>
                            <span
                                className="modal-pill"
                                title="Wishlist"
                                onClick={() => showToast('Added to Wishlist')}
                            >
                                {`\u271B${VS15}`}
                            </span>
                            <span
                                className="modal-pill"
                                title="Add to Album"
                                onClick={() => showToast('Add to Album')}
                            >
                                {`\u25F0${VS15}`}
                            </span>
                            <span
                                className="modal-pill"
                                title="Note"
                                onClick={() => showToast('Note — coming soon')}
                            >
                                {`\u229F${VS15}`}
                            </span>
                            <span
                                className="modal-pill"
                                title="Add to To-Do"
                                onClick={() => showToast('Added to To-Dos')}
                            >
                                {`\u274D${VS15}`}
                            </span>
                            <span
                                className="modal-pill"
                                title="Share"
                                onClick={() => showToast('COPIED')}
                            >
                                {`\u2197${VS15}`}
                            </span>
                        </div>
                    </div>

                    <div className="modal-bottom-bar" id="mBottomBar">
                        <div
                            className="modal-nav-pill"
                            role="button"
                            tabIndex={0}
                            aria-label="Previous"
                            title="Previous"
                            onClick={goPrev}
                        >
                            {`\u25C0${VS15}`}
                        </div>
                        <div
                            className={`modal-action-btn-wrap${hasCalc ? ' has-calc' : ''}`}
                            id="mActionBtnWrap"
                        >
                            <button
                                className="modal-action-btn"
                                id="mActionBtn"
                                onClick={() =>
                                    showToast('Action — coming soon')
                                }
                            >
                                {actionLabel}
                            </button>
                            <button
                                className="modal-action-btn-calc"
                                id="mActionCalc"
                                onClick={() => {
                                    if (id == null || !meta) return;
                                    /* meta.price arrives pre-formatted as
                                       "0.014 ETH" — strip the suffix for
                                       the numeric API. NaN guards a future
                                       indexer hand-off where price could
                                       be malformed. */
                                    const priceNum = meta.price
                                        ? parseFloat(meta.price)
                                        : NaN;
                                    openCalcSheet({
                                        tokenId: id,
                                        collectionTitle: title,
                                        price: Number.isFinite(priceNum)
                                            ? priceNum
                                            : null,
                                        floor: floorEth,
                                    });
                                }}
                                title="The Calc"
                                aria-label="Open The Calc"
                            >
                                &fnof;
                            </button>
                        </div>
                        <div
                            className="modal-nav-pill"
                            role="button"
                            tabIndex={0}
                            aria-label="Next"
                            title="Next"
                            onClick={goNext}
                        >
                            {`\u25B6${VS15}`}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
