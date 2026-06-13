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
 *     each id gets a stable color triplet so prev/next nav still
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
 *   - events.token_id holds slug-tokenId strings ("prisms-1"), see
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
import { useProject, paintOutput, buildOutputMetaFor } from '../lib/state/ProjectContext';
import { getProject } from '../lib/project/registry';
import { useOutputMeta } from '../lib/hooks/useOutputMeta';

import { hashSynApplyHex } from '../lib/engines/hashSynEngine';
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
import { recordVisit } from '../lib/pins/breadcrumbStore';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import { useNotePrompt } from '../lib/state/NotePromptContext';
import { useCart } from '../lib/state/CartContext';
/* v1 — type-only import. The route file ships the OutputDetailResponse
   contract (see app/api/output/[id]/route.ts:18); pulling the type here
   keeps the modal's history fetch shape-locked to the API without a
   parallel local definition. EventRow[] arrives transitively. */
import type { OutputDetailResponse } from '../app/api/output/[id]/route';

/* iOS variant selector 15 — forces the preceding glyph to render in its
   text-style form (mono, no emoji color). Required for every Unicode
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
    const { openModal, currentModalId, currentModalSlug, setCurrentModalId, close } = useModal();
    const { showToast } = useToast();
    const { openCalcSheet } = useCalcSheet();
    const { add: cartAdd, has: cartHas, items: cartItems } = useCart();
    /* The output modal is global, so its Project is whatever was passed to
       open('output', id, slug) — falling back to the active route Project. */
    const proj = useProject();
    const slug = currentModalSlug ?? proj.slug;
    const def = getProject(slug);
    const title = def?.displayName ?? proj.title;
    const floorEth = proj.floorEth;
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
    const canvasLsRef = useRef<HTMLCanvasElement>(null);

    const isOpen = openModal?.name === 'output';
    const id = isOpen ? currentModalId : null;

    /* Breadcrumbs — the REAL trail (lib/pins/breadcrumbStore). Every Output
       this modal shows was actually visited by the viewer, including
       prev/next nav hops, so recording here (the one surface all card taps
       funnel into) covers gallery, carousels, shuffle and profile grids. */
    useEffect(() => {
        if (isOpen && id != null) recordVisit(slug, id);
    }, [isOpen, id, slug]);

    /* Note active state — filled/bold icon when a note exists for this token. */
    const [hasNote, setHasNote] = useState(false);
    useEffect(() => {
        const check = () => {
            if (id == null) { setHasNote(false); return; }
            try {
                const raw = localStorage.getItem('pd_token_notes');
                const notes = raw ? JSON.parse(raw) : {};
                setHasNote(!!(notes[id] && String(notes[id]).trim()));
            } catch { setHasNote(false); }
        };
        check();
        window.addEventListener('pd:notes-changed', check);
        return () => window.removeEventListener('pd:notes-changed', check);
    }, [id]);
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

    /* Details popover — toggled by the ↗ pill (renamed "Details").
       Closes on outside click via a document-level mousedown listener
       bound while the popover is open. pillRowRef anchors the popover
       position so it floats above the pill row regardless of screen size. */
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [ownerCopied, setOwnerCopied] = useState(false);
    const [urlCopied, setUrlCopied] = useState(false);
    const ownerCopyTimer = useRef<number | null>(null);
    const urlCopyTimer = useRef<number | null>(null);
    const detailsPopoverRef = useRef<HTMLDivElement | null>(null);
    const detailsPillRef = useRef<HTMLSpanElement | null>(null);
    useEffect(() => {
        if (!detailsOpen) return;
        const handler = (e: MouseEvent) => {
            const t = e.target as HTMLElement | null;
            if (!t) return;
            // Click inside either modal's popover → keep open.
            if (t.closest('.details-popover')) return;
            // Click inside either bottom bar (includes the details pill that
            // toggles it) → keep open; the pill's own onClick handles toggle.
            if (t.closest('#mBottomBar, .ls-bottom-bar')) return;
            setDetailsOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [detailsOpen]);
    useEffect(() => {
        return () => {
            if (swingTimerRef.current != null) {
                window.clearTimeout(swingTimerRef.current);
                swingTimerRef.current = null;
            }
            if (ownerCopyTimer.current != null) {
                window.clearTimeout(ownerCopyTimer.current);
                ownerCopyTimer.current = null;
            }
            if (urlCopyTimer.current != null) {
                window.clearTimeout(urlCopyTimer.current);
                urlCopyTimer.current = null;
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
    const globalMeta = useOutputMeta(id);
    /* When opened with an explicit Project slug, derive meta for that
       (slug, id) so the modal shows the right Artwork/owner/traits even
       though it's mounted outside the route's ProjectProvider. */
    const meta = id != null && currentModalSlug ? buildOutputMetaFor(slug, id) : globalMeta;

    /* v1 — HISTORY surface. Fetches /api/output/[id] on isOpen + id
       change and stores the response (history: EventRow[]) for
       rendering. The cancellation guard prevents a stale fetch from
       overwriting state if the user navigates with prev/next before
       the previous request resolves. AbortController would be an
       upgrade; the cancelled flag is sufficient for v1.

       Slug derivation: ProjectContext exposes `title` ("PRISMS") only;
       the API route expects `{slug}-{tokenId}` shape. Lower-casing
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
    }, [isOpen, id, slug]);

    /* Live market stats for the details panel (owner / last sale / floor).
       Refetches on open and after any market action ('pd:project-refresh'). */
    const [market, setMarket] = useState<{
        owner: string | null;
        owner_handle: string | null;
        last_sale: string | null;
        floor: string | null;
        viewer: { isOwner: boolean } | null;
    } | null>(null);
    useEffect(() => {
        if (!isOpen || id == null) { setMarket(null); return; }
        let cancelled = false;
        const load = () => {
            fetch(`/api/output/${slug}-${id}/market`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setMarket(d); })
                .catch(() => {});
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [isOpen, id, slug]);

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
        /* Sim uses window.innerWidth directly as renderWidth (sim line 8726) — match exactly.
           Use the larger of innerWidth/innerHeight so landscape mobile renders at full width
           rather than the short portrait dimension (which falls into the 600px fallback). */
        const vw = Math.max(window.innerWidth, window.innerHeight);
        const w = vw >= 601 ? vw : 600;
        const ratio = paintOutput(canvas, slug, id, w);
        canvas.classList.add('visible');
        const canvasLs = canvasLsRef.current;
        if (canvasLs) { paintOutput(canvasLs, slug, id, w); canvasLs.classList.add('visible'); }
        hashSynApplyHex(`hsl(${(id * 37) % 360}, 70%, 50%)`);
    }, [isOpen, id, slug]);

    /* Scroll-position preservation now lives in ModalContext's body-lock
       effect so every modal inherits the dance (sim openModal/closeModal
       at sim.html line 8771 + 7446). Previously this effect lived here
       only, which meant other modals (Collectors, Followers, etc.)
       opened from mobile teleported the page to top. Lifted in S1. */

    /* Prev/next cycles EXISTING Outputs ONLY (Brendon 2026-06-12 — it was
       walking the full max-supply range, paging past the minted set into
       Outputs that don't exist yet). The bound is the MINTED count: the
       route Project's lives in ProjectContext; when the modal was opened
       for another Project (home/profile cards), fetch that Project's
       minted count once per open. Until that lands (or if it fails) the
       bound falls back to the current id — nav wraps to #1, never into
       unminted territory. */
    const isForeignProject = slug !== proj.slug;
    const [foreignMinted, setForeignMinted] = useState<number | null>(null);
    useEffect(() => {
        if (!isOpen || !isForeignProject) {
            setForeignMinted(null);
            return;
        }
        let cancelled = false;
        fetch(`/api/project/${slug}/outputs`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { total?: number } | null) => {
                if (!cancelled && j && typeof j.total === 'number') {
                    setForeignMinted(j.total);
                }
            })
            .catch(() => { /* keep the safe fallback */ });
        return () => { cancelled = true; };
    }, [isOpen, isForeignProject, slug]);
    const mintedBound = isForeignProject
        ? (foreignMinted ?? (id ?? 1))
        : proj.totalOutputs;

    /* Sim renders the canvas synchronously inside openModal() — no state
       round-trip. Mirror that by rendering imperatively here before
       setCurrentModalId so the art swaps on the same frame as the press. */
    const renderToCanvas = useCallback((nextId: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const vw = Math.max(window.innerWidth, window.innerHeight);
        const w = vw >= 601 ? vw : 600;
        paintOutput(canvas, slug, nextId, w);
        canvas.classList.add('visible');
        const canvasLs = canvasLsRef.current;
        if (canvasLs) { paintOutput(canvasLs, slug, nextId, w); canvasLs.classList.add('visible'); }
        hashSynApplyHex(`hsl(${(nextId * 37) % 360}, 70%, 50%)`);
    }, [slug]);

    const goNext = useCallback(() => {
        if (id == null) return;
        const nextId = id >= mintedBound ? 1 : id + 1;
        renderToCanvas(nextId);
        setCurrentModalId(nextId);
    }, [id, mintedBound, setCurrentModalId, renderToCanvas]);

    const goPrev = useCallback(() => {
        if (id == null) return;
        const nextId = id <= 1 ? Math.max(1, mintedBound) : id - 1;
        renderToCanvas(nextId);
        setCurrentModalId(nextId);
    }, [id, mintedBound, setCurrentModalId, renderToCanvas]);

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

    /* Backdrop click intentionally does NOT close the modal.
       Only the X (.close-hint) or an outbound navigation action closes it.
       Sim had a backdrop-click guard (sim 8825); we deviate here per
       Brendon: clicking outside the artwork area should do nothing. */
    const onBackdropClick = useCallback(
        (_e: ReactMouseEvent<HTMLDivElement>) => {
            // no-op — intentional
        },
        []
    );

    const isPinned = id != null && grailPins.includes(id);

    /* Action button label + Calc-tab visibility.
       BUY:        ƒ calc tab (buy price analysis)   → adds to cart
       LIST:       ✺ user showcase tab                → add to user showcase
       MAKE OFFER: ƒ calc tab (offer price analysis) → offer flow */
    let actionLabel: ReactNode = null;
    let hasCalc = false;
    let calcIcon = '\u0192';        // ƒ default
    let calcTitle = 'The Calc';
    let calcMode: 'buy' | 'user-showcase' | 'offer' = 'buy';

    if (meta) {
        if (meta.isOwnedByBrendon) {
            actionLabel = <>LIST</>;          // no price on LIST — cost basis is personal
            hasCalc = true;
            calcIcon = '\u2446\uFE0E';         // ⑆ user showcase icon
            calcTitle = 'Add to Your Showcase';
            calcMode = 'user-showcase';
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
            calcMode = 'buy';
        } else {
            actionLabel = <>MAKE OFFER</>;
            hasCalc = true;
            calcTitle = 'Offer Calc';
            calcMode = 'offer';
        }
    }

    /* Glyphs are written as Unicode literals + VS15 to dodge JSX entity
       parsing surprises and to keep iOS Safari from upgrading them to
       emoji presentation. Matches sim's `&#xFE0E;` discipline. */

    /* Shared details-popover body — rendered inside both the portrait
       (#modal) and landscape (#modalLandscape) popover wrappers so the two
       stay in lockstep. Null when there's no active output to describe. */
    const detailsRows =
        id != null && meta ? (
            <>
                {/* Artwork title — Rubik Mono One, centered */}
                <div className="dp-title">
                    {title} #{id}
                </div>
                {/* Artist row */}
                <div className="dp-row">
                    <span className="dp-label">Artist</span>
                    <span className="dp-value">
                        <a href={`/${def?.artistHandle ?? 'opus4-6'}`} className="dp-link" onClick={(e) => e.stopPropagation()}>
                            <span className="dp-value-text">@{def?.artistHandle ?? 'opus4-6'}</span>
                        </a>
                    </span>
                </div>
                {/* Owner row (live) */}
                <div className="dp-row">
                    <span className="dp-label">Owner</span>
                    <span className="dp-value">
                        <span className="dp-value-text dp-addr">
                            {ownerCopied
                                ? 'COPIED!'
                                : market?.viewer?.isOwner
                                    ? 'You'
                                    : market?.owner_handle
                                        ? `@${market.owner_handle}`
                                        : shortAddr(market?.owner ?? meta.ownerFull)}
                        </span>
                        {!market?.viewer?.isOwner && (market?.owner ?? meta.ownerFull) && (
                            <button className="dp-copy-btn" title="Copy address" onClick={(e) => {
                                e.stopPropagation();
                                const write = () => {
                                    if (ownerCopyTimer.current != null) window.clearTimeout(ownerCopyTimer.current);
                                    setOwnerCopied(true);
                                    ownerCopyTimer.current = window.setTimeout(() => { setOwnerCopied(false); ownerCopyTimer.current = null; }, 1500);
                                };
                                navigator.clipboard.writeText((market?.owner ?? meta.ownerFull) ?? '').then(write).catch(write);
                            }}>
                                ⧉{VS15}
                            </button>
                        )}
                    </span>
                </div>
                {/* Last Sale row (live) */}
                <div className="dp-row">
                    <span className="dp-label">Last Sale</span>
                    <span className="dp-value">
                        <span className="dp-value-text">{market?.last_sale ? `${market.last_sale} ETH` : '—'}</span>
                    </span>
                </div>
                {/* Floor row (live) */}
                <div className="dp-row">
                    <span className="dp-label">Floor</span>
                    <span className="dp-value">
                        <span className="dp-value-text">{market?.floor ? `${market.floor} ETH` : '—'}</span>
                    </span>
                </div>
                {/* Artwork Page row */}
                <div className="dp-row">
                    <span className="dp-label">Artwork Page</span>
                    <span className="dp-value">
                        <button className="dp-link-btn" onClick={(e) => { e.stopPropagation(); if (id != null) { setDetailsOpen(false); close(); window.scrollTo(0, 0); router.push(`/art/${slug}/${id}`); } }}>
                            <span className="dp-value-text">Open Full Artwork {`\u2197${VS15}`}</span>
                        </button>
                    </span>
                </div>
                {/* Share URL row */}
                <div className="dp-row">
                    <span className="dp-label">Share URL</span>
                    <span className="dp-value">
                        <button className="dp-link-btn" title="Copy artwork URL" onClick={(e) => {
                            e.stopPropagation();
                            const url = id != null ? `${window.location.origin}/art/${slug}/${id}` : window.location.href;
                            const write = () => {
                                if (urlCopyTimer.current != null) window.clearTimeout(urlCopyTimer.current);
                                setUrlCopied(true);
                                urlCopyTimer.current = window.setTimeout(() => { setUrlCopied(false); urlCopyTimer.current = null; }, 1500);
                            };
                            navigator.clipboard.writeText(url).then(write).catch(write);
                        }}>
                            <span className="dp-value-text">{urlCopied ? 'COPIED!' : 'Copy'}</span>
                        </button>
                        <button className="dp-copy-btn" title="Copy artwork URL" onClick={(e) => {
                            e.stopPropagation();
                            const url = id != null ? `${window.location.origin}/art/${slug}/${id}` : window.location.href;
                            const write = () => {
                                if (urlCopyTimer.current != null) window.clearTimeout(urlCopyTimer.current);
                                setUrlCopied(true);
                                urlCopyTimer.current = window.setTimeout(() => { setUrlCopied(false); urlCopyTimer.current = null; }, 1500);
                            };
                            navigator.clipboard.writeText(url).then(write).catch(write);
                        }}>
                            ⧉{VS15}
                        </button>
                    </span>
                </div>
            </>
        ) : null;

    return (
        <Fragment>
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
                className={`modal-pin-hint${hasNote ? ' pinned' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                    if (currentModalId !== null) openOutputNoteEditor(currentModalId);
                }}
                title={hasNote ? 'Edit Note' : 'Add Note'}
            >
                {`\u229F${VS15}`}
            </div>

            <div className="modal-canvas-wrap">
                <canvas
                    id="modalCanvas"
                    ref={canvasRef}
                    className="output-canvas"
                    onClick={() => {
                        if (id == null) return;
                        close();
                        window.scrollTo(0, 0);
                        router.push(`/art/${slug}/${id}`);
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
                                onClick={() => {
                                    if (id != null) { close(); window.scrollTo(0, 0); router.push(`/art/${slug}/${id}`); }
                                }}
                            >
                                {title}
                            </span>
                            {' '}#{id}
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
                                onClick={() => showToast('Wishlist: ADDED')}
                            >
                                {`\u271B${VS15}`}
                            </span>
                            <span
                                className="modal-pill"
                                title="Add to Album"
                                onClick={() => showToast('Albums: COMING SOON')}
                            >
                                {`\u25F0${VS15}`}
                            </span>
                            <span
                                className={`modal-pill${isPinned ? ' active' : ''}`}
                                title="Grail Pin"
                                onClick={togglePin}
                            >
                                {`\u27DF${VS15}`}
                            </span>
                            <span
                                className="modal-pill"
                                title="Add to To-Do"
                                onClick={() => showToast('To-Dos: ADDED')}
                            >
                                {`\u274D${VS15}`}
                            </span>
                            <span
                                ref={detailsPillRef}
                                className={`modal-pill${detailsOpen ? ' active' : ''}`}
                                title="Details"
                                onClick={() => setDetailsOpen((o) => !o)}
                            >
                                {`\u2197${VS15}`}
                            </span>
                            {detailsOpen && (
                                <div
                                    ref={detailsPopoverRef}
                                    className="details-popover"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {detailsRows}
                                </div>
                            )}
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
                                onClick={() => {
                                    if (calcMode === 'buy' && id != null) {
                                        if (cartHas(slug, id)) {
                                            showToast(`${title} #${id}: ALREADY IN CART`);
                                        } else {
                                            cartAdd(slug, id);
                                            const next = cartItems.length + 1;
                                            showToast(`Added to cart \u00B7 ${next} item${next === 1 ? '' : 's'}`);
                                        }
                                    } else {
                                        showToast('Action: COMING SOON');
                                    }
                                }}
                            >
                                {actionLabel}
                            </button>
                            <button
                                className="modal-action-btn-calc"
                                id="mActionCalc"
                                onClick={() => {
                                    if (calcMode === 'user-showcase') {
                                        showToast('Add to Showcase: COMING SOON');
                                    } else if (calcMode === 'offer') {
                                        showToast('Offer Calc: COMING SOON');
                                    } else if (id != null && meta) {
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
                                    }
                                }}
                                title={calcTitle}
                                aria-label={calcTitle}
                            >
                                {calcIcon}
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

        {/* ── LANDSCAPE MODAL ─────────────────────────────────────────
            Shown only on phone landscape (CSS: @media orientation:landscape +
            max-height:500px). Shares all state and handlers with #modal above.
            Canvas is a separate element (canvasLsRef) painted simultaneously
            in the same render effects. JSX for pills and bottom bar is an
            exact copy — same classNames, same handlers, same everything. */}
        <div
            id="modalLandscape"
            className={`platform-modal ls-modal${isOpen ? ' active' : ''}`}
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
                className={`modal-pin-hint${hasNote ? ' pinned' : ''}`}
                role="button"
                tabIndex={0}
                onClick={() => {
                    if (currentModalId !== null) openOutputNoteEditor(currentModalId);
                }}
                title={hasNote ? 'Edit Note' : 'Add Note'}
            >
                {`\u229F${VS15}`}
            </div>

            <div className="ls-canvas-wrap">
                <canvas
                    id="modalCanvasLs"
                    ref={canvasLsRef}
                    className="output-canvas"
                    onClick={() => {
                        if (id == null) return;
                        close();
                        window.scrollTo(0, 0);
                        router.push(`/art/${slug}/${id}`);
                    }}
                    style={{ cursor: 'pointer' }}
                    title="Open output page"
                />
                <div
                    className={'mute-overlay' + (swinging ? ' punch-hammer' : '')}
                    onClick={handleModalMuteTap}
                >
                    <span
                        className={'mute-label' + (!swinging && isMutedNow ? ' muted-final' : '')}
                    >
                        {swinging ? `\u27D9${VS15}` : isMutedNow ? 'MUTED' : 'Mute'}
                    </span>
                </div>
            </div>

            {detailsOpen && detailsRows && (
                <div
                    className="details-popover ls-details-popover"
                    onClick={(e) => e.stopPropagation()}
                >
                    {detailsRows}
                </div>
            )}

            {id != null && meta && (
                <div className="ls-bottom-bar">
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

                    <span className="modal-pill" title="Star" onClick={() => showToast('Starred')}>
                        {`\u2606${VS15}`}
                    </span>
                    <span className="modal-pill" title="Wishlist" onClick={() => showToast('Wishlist: ADDED')}>
                        {`\u271B${VS15}`}
                    </span>
                    <span className="modal-pill" title="Add to Album" onClick={() => showToast('Albums: COMING SOON')}>
                        {`\u25F0${VS15}`}
                    </span>
                    <span
                        className={`modal-pill${isPinned ? ' active' : ''}`}
                        title="Grail Pin"
                        onClick={togglePin}
                    >
                        {`\u27DF${VS15}`}
                    </span>
                    <span className="modal-pill" title="Add to To-Do" onClick={() => showToast('To-Dos: ADDED')}>
                        {`\u274D${VS15}`}
                    </span>
                    <span
                        className={`modal-pill${detailsOpen ? ' active' : ''}`}
                        title="Details"
                        onClick={() => setDetailsOpen((o) => !o)}
                    >
                        {`\u2197${VS15}`}
                    </span>

                    <div className={`modal-action-btn-wrap${hasCalc ? ' has-calc' : ''}`}>
                        <button
                            className="modal-action-btn"
                            onClick={() => {
                                if (calcMode === 'buy' && id != null) {
                                    if (cartHas(slug, id)) {
                                        showToast(`${title} #${id}: ALREADY IN CART`);
                                    } else {
                                        cartAdd(slug, id);
                                        const next = cartItems.length + 1;
                                        showToast(`Added to cart \u00B7 ${next} item${next === 1 ? '' : 's'}`);
                                    }
                                } else {
                                    showToast('Action: COMING SOON');
                                }
                            }}
                        >
                            {actionLabel}
                        </button>
                        <button
                            className="modal-action-btn-calc"
                            onClick={() => {
                                if (calcMode === 'user-showcase') {
                                    showToast('Add to Showcase: COMING SOON');
                                } else if (calcMode === 'offer') {
                                    showToast('Offer Calc: COMING SOON');
                                } else if (id != null && meta) {
                                    const priceNum = meta.price ? parseFloat(meta.price) : NaN;
                                    openCalcSheet({
                                        tokenId: id,
                                        projectTitle: title,
                                        price: Number.isFinite(priceNum) ? priceNum : null,
                                        floor: floorEth,
                                    });
                                }
                            }}
                            title={calcTitle}
                            aria-label={calcTitle}
                        >
                            {calcIcon}
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
            )}
        </div>
        </Fragment>
    );
}
