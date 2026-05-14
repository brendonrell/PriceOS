'use client';

/*
 * OutputPreview
 *
 * Sim id #modal — the most-clicked surface on the platform. Mounted
 * once globally (PriceOSShell) so any caller — gallery cards, the
 * Output page route, deep links, the Top Bar Calendar's "open output"
 * buttons — can invoke it via useModal().open('output', outputId).
 *
 * Renamed from ArtworkModal in OutputPreview v0 (Launch Cut step 1).
 * Per locked nomenclature: Output = the minted unit (vessel containing
 * artwork + token + metadata); this surface previews that unit on the
 * project page, distinct from the dedicated OutputPage at /{id}.
 *
 * Sim refs:
 *   markup ............. sim.html 5357–5421
 *   openModal/nav ...... sim.html 8725–8825
 *   toggleGrailPin ..... sim.html 12413–12442
 *   modal-fields-wrap .. sim.html 3146–3155 (CSS) + 5423 (collectorsModal exemplar)
 *   btn-mint ........... sim.html 2253–2258 (CSS) + 5149 (project-page hero exemplar)
 *
 * Surfaces deferred (each rides with its own ship):
 *   - ArtEngine canvas render → seeded HSL placeholder for now;
 *     each id gets a stable colour triplet so prev/next nav still
 *     reads as "different artwork".
 *   - Calc Sheet → ƒ tab is wired but currently shows placeholder
 *     toast. Sheet renderer is the next ship.
 *   - handleModalAction (BUY/LIST/MAKE OFFER trade flow) → placeholder
 *     toast; live wallet wiring is its own workstream.
 *
 * D011 (chat #4) — Modal mute overlay wired via muteStore + currentModalId.
 * D015 (chat #5) — Note ⊟ pill wired via NotePromptContext token kind.
 *
 * v1 (Launch Cut step 2, 2026-05-10) — four new surfaces ported into the
 * modal-info column between pill-row and bottom-bar. Sim doesn't have a
 * per-output preview equivalent of these (sim's modal stops at pills);
 * each surface composes from sim's existing modal vocabulary, NOT from
 * new classnames:
 *   - TRAITS  — modal-fields-wrap > modal-fields grid; 3 lbl/val rows
 *               from OutputMeta.traits (Layer / Mineral / Fate). Pulled
 *               in-memory from ProjectContext, no fetch.
 *   - OFFERS  — modal-fields-wrap.collectors-list scrollable list of
 *               lbl/val rows. Mocked inline for v1 (CTO call: dedicated
 *               /api/output/[id]/offers route lands when the offers
 *               feature firms up; mock is deterministic per id via
 *               LCG so prev/next reads as distinct outputs).
 *   - HISTORY — modal-fields-wrap.collectors-list rendered from the
 *               existing /api/output/[id] response.history (EventRow[]).
 *               Fetched on isOpen + id change with cancellation guard;
 *               loading + empty states render in modal-stat style.
 *   - MINT    — btn-mint stub with mint-lbl + mint-price spans. Always
 *               visible regardless of ownership/listing state per spec
 *               ("just the surface"). Click → toast, no wallet wiring.
 *
 * v1 section dividers use sim's .modal-stats-bottom (sim 3159 — dashed
 * border-top + Courier 13px) so headers align with existing modal
 * typography. No new CSS classnames introduced.
 *
 * Open drift (parked, not addressed in v1):
 *   - ProjectContext exposes `title` ("PRISMS") but no `slug`. We
 *     derive slug = title.toLowerCase() inline for the history fetch
 *     URL; lift slug into ProjectState when a second consumer needs it.
 *   - events.token_id holds slug-edition strings ("prisms-1"), see
 *     Step 7b parked open question.
 *
 * Hooks discipline (locked rule from session bootstrap): every hook
 * sits at the top of the component, before any conditional return.
 * The whole component renders the modal element on every render,
 * gating internals on `id != null` rather than early-returning.
 *
 * Data routing: output metadata comes from ProjectContext via
 * useOutputMeta(id). The modal no longer owns the LCG seed math —
 * swapping the indexer in is a single-file change in ProjectContext
 * with zero diff here.
 */

import {
    Fragment,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type MouseEvent as ReactMouseEvent,
    type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useCalcSheet } from '../lib/state/CalcSheetContext';
import { useProject } from '../lib/state/ProjectContext';
import { useOutputMeta } from '../lib/hooks/useOutputMeta';
import {
    getTokenArtSpec,
    paintPlaceholder,
} from '../lib/art/placeholderRenderer';
import {
    getGrails,
    subscribeGrails,
    togglePin as storeTogglePin,
} from '../lib/pins/grailStore';
import {
    getMutedIds,
    isMuted as storeIsMuted,
    subscribeMuted,
    toggleMute as storeToggleMute,
} from '../lib/pins/muteStore';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import { useNotePrompt } from '../lib/state/NotePromptContext';
/* v1 — type-only import. The route file ships the OutputDetailResponse
   contract (see app/api/output/[id]/route.ts:18); pulling the type here
   keeps the modal's history fetch shape-locked to the API without a
   parallel local definition. EventRow[] arrives transitively. */
import type { OutputDetailResponse } from '../app/api/output/[id]/route';

/* iOS variant selector 15 — forces the preceding glyph to render in its
   text-style form (mono, no emoji colour). Required for every Unicode
   glyph the modal paints; matches sim's `&#xFE0E;` everywhere. */
const VS15 = '\uFE0E';

/* v1 — relative-time formatter for the HISTORY section. Sim's feed uses
   absolute time labels ("12:04 PM") but those only make sense in a
   live ticker; per-output history reads more naturally as relative ago
   since events span days/weeks. Keeps the column compact (≤6 chars). */
function timeAgo(iso: string): string {
    const then = new Date(iso).getTime();
    if (!Number.isFinite(then)) return '—';
    const diffMs = Date.now() - then;
    if (diffMs < 0) return 'now';
    const sec = Math.floor(diffMs / 1000);
    if (sec < 60) return `${sec}s ago`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const day = Math.floor(hr / 24);
    if (day < 30) return `${day}d ago`;
    const mo = Math.floor(day / 30);
    if (mo < 12) return `${mo}mo ago`;
    const yr = Math.floor(day / 365);
    return `${yr}y ago`;
}

/* v1 — abbreviate an Ethereum address for the to/from columns of the
   HISTORY section. Sim's ownerDisplay format is `0xf7c0…3690` (sim
   5383); mirrors the same head/tail truncation. Returns the input
   unchanged for handles or other non-hex strings. */
function shortAddr(addr: string | null | undefined): string {
    if (!addr) return '—';
    if (addr.startsWith('0x') && addr.length > 10) {
        return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
    }
    return addr;
}

/* v1 — deterministic mock offers per output id. Same id → same shape on
   every refresh, matching the OutputMeta LCG discipline. The offers
   API doesn't exist yet (CTO call: mock inline for v1, dedicated
   /api/output/[id]/offers route lands when the offers feature does);
   this seed survives the swap by keeping shape compatible with what
   that route is likely to return. Deletes 0–4 offers per output so
   prev/next nav reads as visibly different. */
const MOCK_OFFER_USERS = [
    '@matty',
    '@gmoney',
    '@cspok',
    '@Darold',
    '@thefunnyguys',
    '@atlasforge',
    '@willpop',
    '@Trinity',
] as const;

interface MockOffer {
    id: string;
    who: string;
    eth: string;
    timestampIso: string;
}

function buildMockOffers(outputId: number): MockOffer[] {
    const seed = (outputId * 2654435761) >>> 0;
    const count = seed % 5; /* 0..4 */
    const now = Date.now();
    return Array.from({ length: count }, (_, i) => {
        const sub = ((seed * (i + 7)) >>> 0);
        const user = MOCK_OFFER_USERS[sub % MOCK_OFFER_USERS.length];
        /* Spread offers across 0.0010..0.0210 ETH in 0.0001 steps. */
        const eth = (((sub % 200) + 10) / 10000).toFixed(4);
        /* Stagger ages 1..72 hours back so the relative-time labels
           render with variety. */
        const hoursBack = ((sub >>> 8) % 72) + 1;
        const timestampIso = new Date(now - hoursBack * 3600_000).toISOString();
        return {
            id: `${outputId}-offer-${i}`,
            who: user,
            eth,
            timestampIso,
        };
    });
}

export default function OutputPreview() {
    const { openModal, currentModalId, setCurrentModalId, close } = useModal();
    const { showToast } = useToast();
    const { openCalcSheet } = useCalcSheet();
    const { title, totalOutputs, floorEth } = useProject();
    const { notifs } = usePdNotifs();
    const { openOutputNoteEditor } = useNotePrompt();

    /* Artwork Page v0 (2026-05-12) — the modal canvas is now a
       portal to the full Artwork page at /{globalId}. Clicking the
       canvas closes the modal and routes to the dedicated page.
       The mute-overlay sibling absorbs canvas clicks while
       body.hammer-mode is active (globals.css gates its display),
       so muting and navigation never fire on the same click. */
    const router = useRouter();

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

    /* chat #4 — D011. Modal mute overlay reads its label state from the
       same muteStore that ArtworkCard subscribes to, so the modal label
       and the underlying card's .muted class stay in lockstep. Replaces
       sim's imperative `_applyModalHammer` (sim 7350-7358) — instead of
       calling a sync function on every openModal / hammer-mode toggle,
       React reconciliation paints the right label whenever either
       `currentModalId` or the muted set changes. */
    const [mutedSet, setMutedSet] = useState<ReadonlySet<number>>(
        () => getMutedIds()
    );
    useEffect(() => {
        setMutedSet(getMutedIds());
        return subscribeMuted((next) => setMutedSet(next));
    }, []);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const isOpen = openModal?.name === 'output';
    const id = isOpen ? currentModalId : null;
    const isMutedNow = id != null && mutedSet.has(id);

    /* chat #4 — sim 7370-7385 hammerSwing animation on the modal overlay.
       Same three-phase label model as ArtworkCard: baseline "Mute" → ⟙
       with .punch-hammer for 700ms → settled "MUTED" with .muted-final.
       The unmute path is instantaneous. swinging is a one-shot UI flag
       cleared by a 700ms timer; cleanup on unmount + on currentModalId
       change cancels stale timers so a fast prev/next during the swing
       doesn't strand a half-finished animation. */
    const [swinging, setSwinging] = useState(false);
    const swingTimerRef = useRef<number | null>(null);
    useEffect(() => {
        return () => {
            if (swingTimerRef.current != null) {
                window.clearTimeout(swingTimerRef.current);
                swingTimerRef.current = null;
            }
        };
    }, []);
    /* Cancel an in-flight swing if the user navigates the modal mid-
       animation — prev/next would otherwise show ⟙ briefly on the
       wrong token. Re-derives label from `isMutedNow` cleanly on the
       new id. */
    useEffect(() => {
        if (swingTimerRef.current != null) {
            window.clearTimeout(swingTimerRef.current);
            swingTimerRef.current = null;
        }
        setSwinging(false);
    }, [id]);

    /* sim 7359-7386 _onModalMuteTap. Gates on hammer-mode + a non-null
       current modal id, then defers to the shared muteStore (which keeps
       the underlying card in sync — sim runs `window.toggleMute(id)` from
       inside _onModalMuteTap for the same reason). The Mute → MUTED edge
       fires the hammerSwing; the MUTED → Mute edge is silent (sim 7382-
       7385 sets the label back to "Mute" and bails without animating). */
    const handleModalMuteTap = () => {
        if (!notifs.spell_hammer) return;
        if (id == null) return;
        const wasMuted = storeIsMuted(id);
        storeToggleMute(id);
        if (!wasMuted) {
            if (swingTimerRef.current != null) {
                window.clearTimeout(swingTimerRef.current);
            }
            setSwinging(true);
            swingTimerRef.current = window.setTimeout(() => {
                setSwinging(false);
                swingTimerRef.current = null;
            }, 700);
        }
    };

    /* Output metadata — id-keyed lookup over ProjectContext. Returns
       null when the modal is closed or id is unmapped. */
    const meta = useOutputMeta(id);

    /* v1 — HISTORY surface. Fetches /api/output/[id] on isOpen + id
       change and stores the response (history: EventRow[]) for
       rendering. The cancellation guard prevents a stale fetch from
       overwriting state if the user navigates with prev/next before
       the previous request resolves. AbortController would be an
       upgrade; the cancelled flag is sufficient for v1.

       Slug derivation: ProjectContext exposes `title` ("PRISMS") only;
       the API route expects `{slug}-{edition}` shape. Lower-casing
       title is correct for the demo project — when ProjectContext
       grows beyond a single project, hoist `slug` into ProjectState.

       The detail object also carries trait data, but TRAITS in v1 surface
       from OutputMeta (ProjectContext) since the rendering pipeline is
       already wired against that shape. detail is HISTORY-only here. */
    const [detail, setDetail] = useState<OutputDetailResponse | null>(null);
    const [detailError, setDetailError] = useState(false);
    useEffect(() => {
        if (!isOpen || id == null) {
            setDetail(null);
            setDetailError(false);
            return;
        }
        let cancelled = false;
        setDetail(null);
        setDetailError(false);
        const slug = title.toLowerCase();
        fetch(`/api/output/${slug}-${id}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                return r.json() as Promise<OutputDetailResponse>;
            })
            .then((j) => {
                if (!cancelled) setDetail(j);
            })
            .catch(() => {
                if (!cancelled) setDetailError(true);
            });
        return () => {
            cancelled = true;
        };
    }, [isOpen, id, title]);

    /* v1 — OFFERS surface. Mocked inline (CTO call locked: dedicated
       route lands with the offers feature). useMemo keeps the array
       reference stable per id so the list doesn't reconcile on every
       parent render. */
    const offers = useMemo(
        () => (id == null ? [] : buildMockOffers(id)),
        [id]
    );

    /* Canvas placeholder render. Real ArtEngine wiring is its own ship;
       this paints a stable HSL gradient + radial glow + #id stamp so the
       modal looks alive and prev/next nav reads as distinct tokens. */
    useEffect(() => {
        if (!isOpen || id == null) return;
        const canvas = canvasRef.current;
        if (!canvas) return;

        /* Artwork Swap — same renderer as ArtworkCard, scaled to the
           modal hero canvas. profile.html doesn't paint its modal
           canvas at all (mockup #modalCanvas is declared but never
           written to); the natural port is the same gradient logic at
           higher resolution so gallery → modal handoff shows the same
           piece. Canvas intrinsic dims = w × (w / ratio); the modal
           container has no fixed aspect-ratio rule so the canvas lays
           out at intrinsic size under the modal's max-width / max-
           height clamps. */
        const w = window.innerWidth >= 601 ? 800 : 600;
        const spec = getTokenArtSpec(id);
        const H = Math.round(w / spec.ratio);
        canvas.width = w;
        canvas.height = H;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        paintPlaceholder(ctx, w, H, spec);
    }, [isOpen, id]);

    /* Scroll-position preservation now lives in ModalContext's body-lock
       effect so every modal inherits the dance (sim openModal/closeModal
       at sim.html line 8771 + 7446). Previously this effect lived here
       only, which meant other modals (Collectors, Followers, etc.)
       opened from mobile teleported the page to top. Lifted in S1. */

    /* Prev/next nav. Sim cycles through the visible-cards array; without
       a gallery yet, we walk the full edition range with wrap-around. */
    const goNext = useCallback(() => {
        if (id == null) return;
        setCurrentModalId(id >= totalOutputs ? 1 : id + 1);
    }, [id, totalOutputs, setCurrentModalId]);

    const goPrev = useCallback(() => {
        if (id == null) return;
        setCurrentModalId(id <= 1 ? totalOutputs : id - 1);
    }, [id, totalOutputs, setCurrentModalId]);

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
                <canvas
                    id="modalCanvas"
                    ref={canvasRef}
                    onClick={() => {
                        /* Portal to the dedicated Artwork page. Mute-
                           overlay sibling (display: flex only in
                           hammer-mode per globals.css) absorbs the
                           click before it reaches the canvas while
                           muting is active. */
                        if (id == null) return;
                        close();
                        router.push(`/${id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Open output page"
                />
                {/* chat #4 D011 — sim 5369-5372. Modal-scoped MUTE overlay,
                    visible only when body.hammer-mode is active (gated by
                    globals.css `body.hammer-mode .modal-canvas-wrap
                    .mute-overlay { display: flex }` at sim 2463). Tap
                    toggles mute on the current modal token; sim 7359-7386
                    (_onModalMuteTap) early-returns outside hammer-mode.
                    Label and animation derive from muteStore + local
                    swinging state — see handleModalMuteTap above. */}
                <div
                    className={
                        'mute-overlay' + (swinging ? ' punch-hammer' : '')
                    }
                    id="modalMuteOverlay"
                    onClick={handleModalMuteTap}
                >
                    <span
                        className={
                            'mute-label' +
                            (!swinging && isMutedNow ? ' muted-final' : '')
                        }
                        id="modalMuteLabel"
                    >
                        {swinging
                            ? `\u27D9${VS15}`
                            : isMutedNow
                                ? 'MUTED'
                                : 'Mute'}
                    </span>
                </div>
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
                                onClick={() => {
                                    /* D015 (chat #5) — sim 5395:
                                       openNotePrompt(event, currentModalId).
                                       Output-kind branch of NotePromptContext;
                                       opens with empty initialValue → edit
                                       mode for fresh notes, view-mode for
                                       already-saved (NotePromptModal reads
                                       initialValue from pd_token_notes via
                                       the provider). */
                                    if (currentModalId !== null) {
                                        openOutputNoteEditor(currentModalId);
                                    }
                                }}
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
                                        projectTitle: title,
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
