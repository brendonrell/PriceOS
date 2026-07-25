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
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type TouchEvent as ReactTouchEvent,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useCalcSheet } from '../lib/state/CalcSheetContext';
import { useMarketSheet } from '../lib/state/MarketSheetContext';
import { cancelListing } from '../lib/market/marketClient';
import { getWalletClientOnDemand } from '../lib/wallet/walletClientOnDemand';
import { useProject, buildOutputMetaFor } from '../lib/state/ProjectContext';
import { getProject, artImageUrl, artThumbUrl, ART_IMAGE_BASE } from '../lib/project/registry';
import { useOutputMeta } from '../lib/hooks/useOutputMeta';
import { formatEth } from '../lib/format/eth';
import { useFiat } from '../lib/state/FiatContext';

import { hashSynLockToElement } from '../lib/engines/hashSynEngine';
import { outputPaletteHex } from '../lib/art/outputColor';
import {
    getGrails,
    subscribeGrails,
    togglePin as storeTogglePin,
    type GrailPin,
} from '../lib/pins/grailStore';
import { toggleShowcase, getShowcaseItems, replaceInShowcase } from '../lib/pins/userShowcaseStore';
import {
    isShadowMode,
    subscribeShadowMode,
    getShadowPositions,
    subscribeShadow,
    toggleShadow as storeToggleShadow,
    type ShadowPosition,
} from '../lib/pins/shadowStore';
import { getStarredKeys, toggleStar as storeToggleStar, subscribeStarred } from '../lib/pins/starStore';
import { addOutputTodo, getTodos, subscribeTodos, type TodoVerb, type TodoPriority } from '../lib/todos/todoStore';
import { getWishlistKeys, toggleWishlist as storeToggleWishlist, subscribeWishlist } from '../lib/pins/wishlistStore';
import { albumsContaining, subscribeAlbums } from '../lib/pins/albumStore';
import AlbumPickerCard from './album/AlbumPickerCard';
import OutputThumb from './profile/OutputThumb';
import DegenSlab from './DegenSlab';
import { useSpiteMatcher } from '../lib/pins/spiteStore';
import {
    getMutedKeys,
    isMuted as storeIsMuted,
    subscribeMuted,
    toggleMute as storeToggleMute,
} from '../lib/pins/muteStore';
import { recordVisit, isRecordingEnabled } from '../lib/pins/breadcrumbStore';
import { recordOutputView } from '../lib/output/views';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import AsciiArtImage from './AsciiArtImage';
import { publishPieceInView, clearPieceInView } from '../lib/npc/inview';
import { sampleCanvasFingerprint } from '../lib/art/sampleColor';
import { useNotePrompt } from '../lib/state/NotePromptContext';
import { readNoteFor } from '../lib/notes/tokenNotes';
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

/* Short due-date label for the To-Do composer chip — "2026-07-10" → "Jul 10"
   (the same shape TodosBox uses). */
const TODO_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function fmtTodoDue(due: string): string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
    if (!m) return due;
    return `${TODO_MONTHS[Number(m[2]) - 1] ?? ''} ${Number(m[3])}`;
}

/* Anchor for a tail-bubble — the trigger pill's viewport top + horizontal
   centre, captured at open. */
type BubbleAnchor = { top: number; cx: number };
function anchorFromEvent(e: ReactMouseEvent): BubbleAnchor {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    return { top: r.top, cx: r.left + r.width / 2 };
}

/* TailBubble — an inline speech-bubble card that floats above its trigger with
   a little tail, reusing the fiat-picker / 3D-pingtoast placement verbatim: a
   body portal, clamped on-screen, tail (--p3d-tail-dx) aimed back at the pill,
   dismiss on outside tap / scroll / resize. No screen-dimming backdrop. */
function TailBubble({
    anchor,
    className,
    onDismiss,
    children,
    dismissOnScroll = true,
}: {
    anchor: BubbleAnchor;
    className: string;
    onDismiss: () => void;
    children: ReactNode;
    /* The To-Do bubble carries native date/time inputs — an iOS scroll-into-view
       must NOT dismiss it, so it opts out. */
    dismissOnScroll?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [layout, setLayout] = useState<{ centerX: number; tailDx: number } | null>(null);

    /* Clamp on-screen once measured, then aim the tail back at the trigger. */
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const half = el.offsetWidth / 2;
        const margin = 8;
        const vw = window.innerWidth;
        const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
        const centerX = clamp(anchor.cx, margin + half, vw - margin - half);
        const tailDx = clamp(anchor.cx - centerX, -(half - 12), half - 12);
        setLayout({ centerX, tailDx });
    }, [anchor]);

    /* An outside tap closes the bubble ONLY — we swallow the trailing click so
       it never falls through to the artwork (or any pill) underneath (Brendon,
       2026-07-23). Same click-swallow the hold-drag engine uses. */
    useEffect(() => {
        const onDown = (e: PointerEvent) => {
            if (ref.current?.contains(e.target as Node)) return;
            const swallow = (ce: Event) => {
                ce.stopPropagation();
                ce.preventDefault();
                window.removeEventListener('click', swallow, true);
            };
            window.addEventListener('click', swallow, true);
            window.setTimeout(() => window.removeEventListener('click', swallow, true), 500);
            onDismiss();
        };
        const dismiss = () => onDismiss();
        document.addEventListener('pointerdown', onDown, true);
        if (dismissOnScroll) window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        return () => {
            document.removeEventListener('pointerdown', onDown, true);
            if (dismissOnScroll) window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
        };
    }, [onDismiss, dismissOnScroll]);

    if (typeof document === 'undefined') return null;
    return createPortal(
        <div
            ref={ref}
            className={`tail-bubble ${className}`}
            role="dialog"
            aria-modal="true"
            style={{
                position: 'fixed',
                top: anchor.top,
                left: layout?.centerX ?? anchor.cx,
                transform: 'translate(-50%, calc(-100% - 10px))',
                visibility: layout ? 'visible' : 'hidden',
                zIndex: 100000,
                ['--p3d-tail-dx' as string]: `${layout?.tailDx ?? 0}px`,
            } as CSSProperties}
        >
            {children}
        </div>,
        document.body,
    );
}

export default function OutputPreview() {
    const { openModal, currentModalId, currentModalSlug, outputSequence, setCurrentModalId, setCurrentModalOutput, close, closeAll } = useModal();
    const { showToast } = useToast();
    const { ethToFiat } = useFiat();
    const { openCalcSheet } = useCalcSheet();

    /* SHADOW MODE — while it's on, the side tab becomes the ◐ and this modal
       is how you paper-collect (Brendon, 2026-07-25). Turned on/off only from
       the button in the Portfolio's Shadow tab. */
    const [shadowMode, setShadowMode] = useState(false);
    useEffect(() => { setShadowMode(isShadowMode()); return subscribeShadowMode(setShadowMode); }, []);
    const [shadowPositions, setShadowPositions] = useState<readonly ShadowPosition[]>(() => getShadowPositions());
    useEffect(() => { setShadowPositions(getShadowPositions()); return subscribeShadow(setShadowPositions); }, []);
    const { add: cartAdd, has: cartHas, items: cartItems } = useCart();
    const { openListSheet, openOfferSheet } = useMarketSheet();
    const [unlistBusy, setUnlistBusy] = useState(false);
    const [confirmUnlist, setConfirmUnlist] = useState(false);
    /* Showcase-full swap picker (Brendon, 2026-07-22) — when the 6 slots are
       full, show the current picks so one can be replaced instead of a dead-end
       "FULL" toast. Anchored as a tail-bubble on the trigger (null = closed). */
    const [swapAnchor, setSwapAnchor] = useState<BubbleAnchor | null>(null);
    /* Create-To-Do chooser — a tail-bubble so the user picks the verb instead
       of the app guessing (Brendon, 2026-07-23). Null = closed. The composer's
       date / time / priority selectors ride the bottom of it. */
    const [todoAnchor, setTodoAnchor] = useState<BubbleAnchor | null>(null);
    const [todoDue, setTodoDue] = useState('');
    const [todoDueTime, setTodoDueTime] = useState('');
    const [todoPriority, setTodoPriority] = useState<TodoPriority>(0);
    /* The output modal is global, so its Project is whatever was passed to
       open('output', id, slug) — falling back to the active route Project. */
    const proj = useProject();
    const slug = currentModalSlug ?? proj.slug;
    const def = getProject(slug);
    const title = def?.displayName ?? proj.title;
    const floorEth = proj.floorEth;
    const { notifs } = usePdNotifs();
    const { openOutputNoteEditor } = useNotePrompt();
    /* ASCII Art Mode — per-piece miss flag; reset when the modal walks. */
    const [asciiMiss, setAsciiMiss] = useState(false);
    /* ASCII painted flag — the standin canvas fires no <img> onLoad, so the
       loading ring clears off this in ASCII mode (the stuck-ring bug,
       Brendon 2026-07-10). */
    const [asciiReady, setAsciiReady] = useState(false);

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
    const [grailPins, setGrailPins] = useState<readonly GrailPin[]>(
        () => getGrails()
    );
    useEffect(() => {
        setGrailPins(getGrails());
        return subscribeGrails((next) => setGrailPins(next));
    }, []);

    /* Star + Wishlist sets — same subscribe-on-mount pattern as ArtworkCard,
       so the modal pills reflect + toggle real state (Brendon 2026-06-13). */
    const [starredKeys, setStarredKeys] = useState<ReadonlySet<string>>(() => getStarredKeys());
    useEffect(() => {
        setStarredKeys(getStarredKeys());
        return subscribeStarred((next) => setStarredKeys(next));
    }, []);
    const [wishlistKeys, setWishlistKeys] = useState<ReadonlySet<string>>(() => getWishlistKeys());
    useEffect(() => {
        setWishlistKeys(getWishlistKeys());
        return subscribeWishlist((next) => setWishlistKeys(next));
    }, []);
    /* Add-to-Album opens the picker (the album choice IS the confirm). */
    const [albumPickerOpen, setAlbumPickerOpen] = useState(false);


    /* chat #4 — D011. Modal mute overlay reads its label state from the
       same muteStore that ArtworkCard subscribes to, so the modal label
       and the underlying card's .muted class stay in lockstep. Replaces
       sim's imperative `_applyModalHammer` (sim 7350-7358) — instead of
       calling a sync function on every openModal / hammer-mode toggle,
       React reconciliation paints the right label whenever either
       `currentModalId` or the muted set changes. */
    /* Spite Book — the owner row renders dimmed + struck for a spited handle. */
    const isSpited = useSpiteMatcher();
    const [mutedSet, setMutedSet] = useState<ReadonlySet<string>>(
        () => getMutedKeys()
    );
    useEffect(() => {
        setMutedSet(getMutedKeys());
        return subscribeMuted((next) => setMutedSet(next));
    }, []);

    const imgRef = useRef<HTMLImageElement>(null);
    const imgLsRef = useRef<HTMLImageElement>(null);
    /* The modal shows the stored high-res master as a plain <img> — exactly like
       the grid tiles: browser-cached, instant on reopen, no canvas render dance
       (Brendon 2026-07-07). imgStage walks master → previous-rev master. */
    const [imgLoaded, setImgLoaded] = useState(false);
    const [imgStage, setImgStage] = useState(0);

    const { isOpen, isTopStacked } = useModalLayer('output');
    const id = isOpen ? currentModalId : null;
    useEffect(() => { setAsciiMiss(false); setAsciiReady(false); }, [slug, id]);
    useEffect(() => setAsciiReady(false), [notifs.asciiArt]);

    /* NPC sight — the cast sees the modal piece like any artwork surface
       (Brendon 2026-07-11: "they need to show up in all surfaces… and see
       them"). Fingerprint comes from a small offscreen sample of the loaded
       master; a cross-origin taint or the ASCII path (false colours) simply
       publishes without one — label + project still land. */
    useEffect(() => {
        if (!isOpen || id == null) return;
        let fp: ReturnType<typeof sampleCanvasFingerprint> = null;
        const img = imgRef.current;
        if (img && imgLoaded && !notifs.asciiArt && img.naturalWidth > 0) {
            try {
                const c = document.createElement('canvas');
                const w = 96;
                c.width = w;
                c.height = Math.max(1, Math.round((img.naturalHeight / img.naturalWidth) * w));
                c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
                fp = sampleCanvasFingerprint(c);
            } catch { fp = null; }
        }
        publishPieceInView(slug, id, fp);
        return () => clearPieceInView(slug, id);
    }, [isOpen, id, slug, imgLoaded, notifs.asciiArt]);

    /* The modal image source — the stored high-res master (falls back to the
       previous-rev master during a re-pin), served as a plain <img>. */
    const modalCandidates = useMemo(() => {
        if (id == null || !ART_IMAGE_BASE) return [] as string[];
        return [artImageUrl(slug, id), `${ART_IMAGE_BASE}/${slug}/${id}.png`].filter((u): u is string => !!u);
    }, [slug, id]);
    const modalImgSrc = modalCandidates[imgStage] ?? null;
    /* Speed pass (Brendon, 2026-07-16): while the heavy master is in flight the
       loading panel shows the piece's own ~256px tile thumbnail — the exact
       file the grid card already loaded, so it's a browser-cache hit and paints
       instantly. The ring keeps spinning over it until the master lands. */
    const modalThumbSrc = id != null ? artThumbUrl(slug, id) : null;
    useEffect(() => { setImgLoaded(false); setImgStage(0); }, [slug, id]);
    const onModalImgError = () => {
        if (imgStage === 0 && id != null) {
            try { window.dispatchEvent(new CustomEvent('pd:preview-miss', { detail: { slug, tokenId: id } })); } catch { /* ignore */ }
        }
        setImgStage((s) => s + 1);
    };
    /* Hash Synesthesia modal lock rides the image's own onLoad below — the
       opened piece's REAL sampled colour, sim 8800's palette lock translated
       to stored images. The old synthesized per-id hue is gone (2026-07-20). */

    /* Breadcrumbs — the REAL trail (lib/pins/breadcrumbStore). Every Output
       this modal shows was actually visited by the viewer, including
       prev/next nav hops, so recording here (the one surface all card taps
       funnel into) covers gallery, carousels, shuffle and profile grids. */
    useEffect(() => {
        if (isOpen && id != null) {
            recordVisit(slug, id);
            /* History pillar — record the view into the output_views table (the
               History source). Gated on the History recording toggle. No UI. */
            if (isRecordingEnabled()) recordOutputView(slug, id);
        }
    }, [isOpen, id, slug]);

    /* Note active state — filled/bold icon when a note exists for this token. */
    const [hasNote, setHasNote] = useState(false);
    useEffect(() => {
        const check = () => {
            if (id == null) { setHasNote(false); return; }
            setHasNote(readNoteFor(slug, id).trim().length > 0);
        };
        check();
        window.addEventListener('pd:notes-changed', check);
        return () => window.removeEventListener('pd:notes-changed', check);
    }, [slug, id]);
    /* To-Do active state — the pill lights up if this output already has an open
       to-do (any verb). It never blocks creating more (Brendon, 2026-07-23). */
    const [hasTodo, setHasTodo] = useState(false);
    useEffect(() => {
        const check = () => {
            if (id == null) { setHasTodo(false); return; }
            setHasTodo(getTodos().some(
                (t) => t.kind === 'output' && !t.done && t.source?.slug === slug && t.source?.tokenId === id,
            ));
        };
        check();
        return subscribeTodos(check);
    }, [slug, id]);
    /* Album active state — the pill lights up while the picker is open and
       whenever this output is in ANY album (Brendon, 2026-07-23). */
    const [hasAlbum, setHasAlbum] = useState(false);
    useEffect(() => {
        const check = () => {
            setHasAlbum(id != null && albumsContaining(slug, id).length > 0);
        };
        check();
        return subscribeAlbums(check);
    }, [slug, id]);
    const isMutedNow = id != null && mutedSet.has(`${slug}:${id}`);

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
            // The Details pill owns its own toggle. The portrait pill lives in
            // the pill row (not the bottom bar), so without this guard the
            // mousedown-close fires first and the pill's click re-opens it —
            // the panel never shut on a second tap (Brendon, 2026-06-13).
            if (detailsPillRef.current && detailsPillRef.current.contains(t)) return;
            // Click inside either bottom bar (includes the details pill that
            // toggles it) → keep open; the pill's own onClick handles toggle.
            if (t.closest('#mBottomBar, .ls-bottom-bar')) return;
            // Outside tap → close ONLY the popover; swallow the trailing click so
            // it never falls through to the artwork underneath (Brendon, 2026-07-23).
            const swallow = (ce: Event) => {
                ce.stopPropagation();
                ce.preventDefault();
                window.removeEventListener('click', swallow, true);
            };
            window.addEventListener('click', swallow, true);
            window.setTimeout(() => window.removeEventListener('click', swallow, true), 500);
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
        const wasMuted = storeIsMuted(slug, id);
        storeToggleMute(slug, id);
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
        listing: { price_eth: string } | null;
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

    /* Speed pass (2026-07-16): once the current master is on screen, quietly
       warm the prev/next neighbours' masters (the exact files the ‹ › walk
       would fetch) so scanning the modal is instant. Browser-cache only — no
       state, no repaint; ASCII mode never fetches masters. */
    useEffect(() => {
        if (!isOpen || id == null || !imgLoaded || notifs.asciiArt) return;
        if (!Number.isFinite(mintedBound) || mintedBound <= 1) return;
        const nextId = id >= mintedBound ? 1 : id + 1;
        const prevId = id <= 1 ? Math.max(1, mintedBound) : id - 1;
        for (const nId of new Set([nextId, prevId])) {
            if (nId === id) continue;
            const u = artImageUrl(slug, nId);
            if (!u) continue;
            const im = new Image();
            im.decoding = 'async';
            im.src = u;
        }
    }, [isOpen, id, slug, imgLoaded, notifs.asciiArt, mintedBound]);

    /* Nav (prev/next) swaps the piece by changing the modal id — the <img>
       src follows it and the browser shows the cached image instantly. The
       hashsyn lock rides the img onLoad (fires on every src swap, cached
       included), so nav needs no imperative accent call (2026-07-20 — the
       synthesized per-id hue that lived here is gone). */

    /* Walk the captured grid sequence (the grid AS SHOWN — across projects and
       carousels) when one was captured at open and the current piece is in it.
       step = +1 (next) or -1 (prev), wrapping at the ends. Returns true if it
       handled it. */
    const stepSequence = useCallback((step: 1 | -1): boolean => {
        if (id == null || !outputSequence) return false;
        const here = slug.toLowerCase();
        const pos = outputSequence.findIndex((s) => s.slug === here && s.id === id);
        if (pos < 0) return false;
        const t = outputSequence[(pos + step + outputSequence.length) % outputSequence.length];
        setCurrentModalOutput(t.slug, t.id);
        return true;
    }, [id, slug, outputSequence, setCurrentModalOutput]);

    const goNext = useCallback(() => {
        if (id == null) return;
        if (stepSequence(1)) return;
        const nextId = id >= mintedBound ? 1 : id + 1;
        setCurrentModalId(nextId);
    }, [id, mintedBound, setCurrentModalId, stepSequence]);

    const goPrev = useCallback(() => {
        if (id == null) return;
        if (stepSequence(-1)) return;
        const nextId = id <= 1 ? Math.max(1, mintedBound) : id - 1;
        setCurrentModalId(nextId);
    }, [id, mintedBound, setCurrentModalId, stepSequence]);

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

    /* Mobile swipes on the artwork (Brendon 2026-07-23). Horizontal swipe
       walks prev/next — identical to the ◀ ▶ pills and arrow keys — and a
       swipe DOWN dismisses, identical to the × close. Threshold-based, the
       same idiom as the Command Stone pill: a small move stays a TAP and
       falls through to open the full artwork page. Touch-only handlers, so
       desktop pointer behaviour is untouched. body.modal-open already sets
       touch-action:none, so no native scroll/swipe-back competes. */
    const swipeStart = useRef<{ x: number; y: number } | null>(null);
    const didSwipe = useRef(false);
    const onCanvasTouchStart = useCallback((e: ReactTouchEvent) => {
        const t = e.touches[0];
        if (!t) return;
        swipeStart.current = { x: t.clientX, y: t.clientY };
        didSwipe.current = false;
    }, []);
    const onCanvasTouchEnd = useCallback((e: ReactTouchEvent) => {
        const start = swipeStart.current;
        swipeStart.current = null;
        if (!start) return;
        const t = e.changedTouches[0];
        if (!t) return;
        const dx = t.clientX - start.x;
        const dy = t.clientY - start.y;
        const SWIPE_PX = 44;
        if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
            didSwipe.current = true;
            if (dx < 0) goNext();
            else goPrev();
        } else if (dy >= SWIPE_PX && dy > Math.abs(dx)) {
            didSwipe.current = true;
            close();
        }
    }, [goNext, goPrev, close]);

    /* Tap on the artwork opens the full page — but a swipe must NOT also
       navigate, so it's gated on the swipe flag the touch-end sets. */
    const openFullPage = useCallback(() => {
        if (didSwipe.current) { didSwipe.current = false; return; }
        if (id == null) return;
        close();
        window.scrollTo(0, 0);
        router.push(`/art/${slug}/${id}`);
    }, [id, close, router, slug]);

    /* Grail pin toggle. Mirrors sim's toggleGrailPin (sim 12413), including
       the 5-pin cap and the "Prisms #N GRAIL PINNED / DE-PINNED" toast.
       F50 (BUG-02): delegates state mutation to grailStore so
       ArtworkCard's hover icon and TopBarRow pills stay in sync. */
    const togglePin = useCallback(() => {
        if (id == null) return;
        const collName =
            title.charAt(0) + title.slice(1).toLowerCase();
        const result = storeTogglePin(slug, id);
        if (result === 'limit') {
            showToast('Grail Pin Limit: 10 MAX');
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

    const isPinned = id != null && grailPins.some((p) => p.slug === slug && p.id === id);
    const starred = id != null && starredKeys.has(`${slug}:${id}`);
    const wishlisted = id != null && wishlistKeys.has(`${slug}:${id}`);
    const handleStar = () => {
        if (id == null) return;
        const r = storeToggleStar(slug, id);
        showToast(r === 'starred' ? 'Added to your Starred Outputs List (Private)' : 'Removed from your Starred Outputs List');
    };
    const handleWishlist = () => {
        if (id == null) return;
        const r = storeToggleWishlist(slug, id);
        showToast(r === 'added' ? 'Added to your Wishlist (Private)' : 'Removed from your Wishlist');
    };
    const openAlbumPicker = () => { if (id != null) setAlbumPickerOpen(true); };
    /* Same store + toasts as the gallery card's ❍ (ArtworkCard) — the modal
       pill was a toast-only stub until 2026-07-20. */
    /* The To-Do pill opens the Create-To-Do bubble anchored on the tapped pill
       (Brendon 2026-07-23: give them the option, don't auto-guess). Each open
       starts the date / time / priority selectors fresh. */
    const handleTodo = (e: ReactMouseEvent) => {
        if (id == null) return;
        setTodoDue('');
        setTodoDueTime('');
        setTodoPriority(0);
        setTodoAnchor(anchorFromEvent(e));
    };
    const cycleTodoPriority = () => setTodoPriority((p) => (((p + 1) % 4) as TodoPriority));
    const addTodoVerb = (verb: TodoVerb) => {
        if (id == null) return;
        const r = addOutputTodo(slug, id, verb, {
            due: todoDue || null,
            dueTime: todoDue ? (todoDueTime || null) : null,
            priority: todoPriority,
        });
        setTodoAnchor(null);
        showToast(r === 'exists' ? 'To-Do: ALREADY ADDED' : 'To-Do: ADDED');
    };

    /* Shared main-button click — identical in portrait + landscape modals.
       The CTA is ownership/listing-AWARE now, but the secondary marketplace
       itself isn't built yet (Brendon 2026-06-15) — so LIST / UNLIST / MAKE
       OFFER are correct-but-placeholder, awaiting that wiring. BUY (adds the
       listed piece to the cart) and the ⑆ Add-to-Showcase tab work today. */
    const onMainAction = () => {
        if (mainAction === 'buy' && id != null) {
            if (cartHas(slug, id)) {
                showToast(`${title} #${id}: ALREADY IN CART`);
            } else {
                cartAdd(slug, id);
                const next = cartItems.length + 1;
                showToast(`Added to cart · ${next} item${next === 1 ? '' : 's'}`);
            }
        } else if (mainAction === 'list') {
            if (id != null) openListSheet([{ slug, id }]);
        } else if (mainAction === 'unlist') {
            if (id == null || unlistBusy) return;
            setConfirmUnlist(true);
        } else {
            if (id != null) openOfferSheet([{ slug, id }]);
        }
    };

    /* The actual unlist — fired only after the confirm card (the same card the
       mint flow uses). Removing a live listing is a real market write, so it
       gates behind a confirm like every other money action. */
    const runUnlist = () => {
        if (id == null || unlistBusy) return;
        setConfirmUnlist(false);
        setUnlistBusy(true);
        getWalletClientOnDemand()
            .then((wallet) => cancelListing(slug, id, { wallet }))
            .then(() => showToast('Listing: CANCELLED'))
            .catch((err: unknown) => showToast(err instanceof Error ? err.message : 'Cancel: FAILED'))
            .finally(() => setUnlistBusy(false));
    };

    /* Action button label + Calc-tab visibility.
       BUY:        ƒ calc tab (buy price analysis)   → adds to cart
       LIST:       ✺ user showcase tab                → add to user showcase
       MAKE OFFER: ƒ calc tab (offer price analysis) → offer flow */
    let actionLabel: ReactNode = null;
    let hasCalc = false;
    let calcIcon = '\u0192';        // ƒ default
    let calcTitle = 'The Calc';
    let calcMode: 'buy' | 'user-showcase' | 'offer' | 'shadow' = 'buy';
    /* The MAIN button's real action, from LIVE ownership + listing (Brendon
       2026-06-15) — the viewer's own SIWE wallet via the market route, not the
       seeded meta flag. Fall back to meta only until the market read resolves
       so the button is never blank on open. */
    let mainAction: 'buy' | 'list' | 'unlist' | 'offer' = 'buy';

    if (meta) {
        const ownsThis = market?.viewer?.isOwner ?? meta.isOwnedByBrendon;
        const liveListPrice = market ? (market.listing?.price_eth ?? null) : meta.price;
        const isListedNow = liveListPrice != null;
        if (ownsThis) {
            actionLabel = isListedNow ? (unlistBusy ? <>CANCELLING…</> : <>UNLIST</>) : <>LIST</>;
            mainAction = isListedNow ? 'unlist' : 'list';
            hasCalc = true;
            calcIcon = '\u2446\uFE0E';         // ⑆ user showcase icon
            calcTitle = 'Add to Your Showcase';
            calcMode = 'user-showcase';
        } else if (isListedNow) {
            actionLabel = (
                <>
                    BUY{' '}
                    <span className="modal-action-btn-price">
                        &middot; {formatEth(Number(liveListPrice))}
                        {ethToFiat(Number(liveListPrice)) && (
                            <span className="modal-action-btn-fiat"> {ethToFiat(Number(liveListPrice))}</span>
                        )}
                    </span>
                </>
            );
            mainAction = 'buy';
            hasCalc = true;
            calcMode = 'buy';
        } else {
            actionLabel = <>MAKE OFFER</>;
            mainAction = 'offer';
            hasCalc = true;
            calcTitle = 'Offer Calc';
            calcMode = 'offer';
        }

        /* Shadow mode takes the side tab — but never on a piece you already
           own. The Shadow is the position you DIDN'T take; there is nothing to
           paper-trade about something already in your wallet, so an owned
           piece keeps its ⑆ Add-to-Showcase tab. */
        const ownsThisNow = market?.viewer?.isOwner ?? meta.isOwnedByBrendon;
        if (shadowMode && !ownsThisNow) {
            const already = id != null && shadowPositions.some((p) => p.slug === slug && p.id === id);
            hasCalc = true;
            calcIcon = '◐︎';        // ◐ the Shadow mark
            calcTitle = already ? 'Stop shadowing this piece' : 'Shadow — track it as if owned';
            calcMode = 'shadow';
        }
    }

    const shadowedHere = id != null && shadowPositions.some((p) => p.slug === slug && p.id === id);

    /* The side tab's shadow action, shared by the portrait + landscape modals
       so the two never drift. */
    const onShadowTab = () => {
        if (id == null) return;
        const r = storeToggleShadow(slug, id);
        showToast(r === 'opened' ? 'Shadow: TRACKING' : 'Shadow: DROPPED');
    };

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
                        <span className={`dp-value-text dp-addr${market?.owner_handle && isSpited(market.owner_handle) ? ' spited' : ''}`}>
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
                {/* Artwork Page row */}
                <div className="dp-row">
                    <span className="dp-label">Artwork Page</span>
                    <span className="dp-value">
                        <button className="dp-link-btn" onClick={(e) => { e.stopPropagation(); if (id != null) { setDetailsOpen(false); closeAll(); window.scrollTo(0, 0); router.push(`/art/${slug}/${id}`); } }}>
                            <span className="dp-value-text">Full Artwork {`\u2197${VS15}`}</span>
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
        {albumPickerOpen && id != null && (
            <AlbumPickerCard
                items={[{ slug, id }]}
                onDone={(msg) => { showToast(msg); setAlbumPickerOpen(false); }}
                onClose={() => setAlbumPickerOpen(false)}
            />
        )}
        <div
            id="modal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            data-stack-top={isTopStacked || undefined}
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
                    if (currentModalId !== null) openOutputNoteEditor(currentModalId, undefined, slug);
                }}
                title={hasNote ? 'Edit Note' : 'Add Note'}
            >
                {`\u229F${VS15}`}
            </div>

            <div
                className="modal-canvas-wrap"
                onTouchStart={onCanvasTouchStart}
                onTouchEnd={onCanvasTouchEnd}
            >
                {modalImgSrc && notifs.asciiArt && !asciiMiss && id != null && (
                    /* ASCII Art Mode — instant text-backup stand-in; a miss
                       falls through to the stored master below. */
                    <AsciiArtImage
                        domId="modalCanvas"
                        slug={slug}
                        id={id}
                        widthPx={1024}
                        className="output-canvas visible"
                        onMiss={() => setAsciiMiss(true)}
                        onReady={() => setAsciiReady(true)}
                        onClick={openFullPage}
                        title="Open output page"
                        /* Natural size, like the <img> path — the standin's
                           default 100%×100% fill stretched the element past
                           the artwork, so the modal shadow wrapped the box
                           instead of the art (Brendon 2026-07-11). auto lets
                           the #modalCanvas rule size the element to the
                           artifact's own aspect; the shadow conforms. */
                        style={{ cursor: 'pointer', width: 'auto', height: 'auto' }}
                    />
                )}
                {modalImgSrc && !(notifs.asciiArt && !asciiMiss && id != null) && (
                    <img
                        id="modalCanvas"
                        ref={imgRef}
                        className={`output-canvas${imgLoaded ? ' visible' : ''}`}
                        src={modalImgSrc}
                        alt={id != null ? `${slug} #${id} — artwork` : 'Artwork'}
                        decoding="async"
                        fetchPriority="high"
                        draggable={false}
                        onLoad={(e) => {
                            setImgLoaded(true);
                            /* Sim 8800 modal lock — the opened piece's own
                               sampled colour becomes the hashsyn bg; palette
                               math is the gate-miss fallback. No-op under
                               every other colorway. */
                            hashSynLockToElement(
                                e.currentTarget,
                                id != null ? outputPaletteHex(slug, id) : null,
                            );
                        }}
                        onError={onModalImgError}
                        onClick={openFullPage}
                        style={{ cursor: 'pointer' }}
                        title="Open output page"
                    />
                )}
                {/* Full-size loading state — the current background colour + a
                    centered ring, while the high-res image is in flight
                    (Brendon 2026-07-07). In ASCII Art Mode the ring clears the
                    moment the standin paints (asciiReady) — no <img> onLoad
                    fires on that path. */}
                {!(notifs.asciiArt && !asciiMiss && id != null ? asciiReady : imgLoaded) && (
                    <div className="modal-art-loading" aria-hidden="true">
                        {/* The piece itself, from the grid tile already in the
                            browser cache — instant art while the master fetches
                            (speed pass, 2026-07-16). ASCII mode never shows it
                            (the standin path owns that surface). */}
                        {modalThumbSrc && !notifs.asciiArt && (
                            <img
                                className="modal-art-loading-thumb"
                                src={modalThumbSrc}
                                alt=""
                                decoding="async"
                                draggable={false}
                            />
                        )}
                        <span className="pd-ring" />
                    </div>
                )}
                {/* Degen Mode — the modal keeps the shopping numbers, not the
                    art (body.degen-mode CSS already hides the master; this
                    fills the panel with the same data slab the grid wears,
                    scaled up). 2026-07-17: Degen works across the site. */}
                {notifs.degen && id != null && (
                    <DegenSlab slug={slug} id={id} price={meta?.price ?? null} modal />
                )}
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
                                className="hover-link modal-title-link"
                                role="button"
                                tabIndex={0}
                                title="Go to project"
                                onClick={() => { closeAll(); window.scrollTo(0, 0); router.push(`/art/${slug}`); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeAll(); window.scrollTo(0, 0); router.push(`/art/${slug}`); } }}
                            >
                                {title}
                            </span>
                            {' '}
                            <span
                                className="hover-link modal-title-link"
                                role="button"
                                tabIndex={0}
                                title="Go to this output"
                                onClick={() => { if (id != null) { closeAll(); window.scrollTo(0, 0); router.push(`/art/${slug}/${id}`); } }}
                                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && id != null) { e.preventDefault(); closeAll(); window.scrollTo(0, 0); router.push(`/art/${slug}/${id}`); } }}
                            >
                                #{id}
                            </span>
                        </div>
                        <div className="modal-pill-row" id="mPillRow">
                            <span
                                className={`modal-pill modal-pill--star${starred ? ' active' : ''}`}
                                title="Star"
                                onClick={handleStar}
                            >
                                {`${starred ? '\u2605' : '\u2606'}${VS15}`}
                            </span>
                            <span
                                className={`modal-pill${wishlisted ? ' active' : ''}`}
                                title="Wishlist"
                                onClick={handleWishlist}
                            >
                                {`\u271B${VS15}`}
                            </span>
                            <span
                                className={`modal-pill${albumPickerOpen || hasAlbum ? ' active' : ''}`}
                                title="Add to Album"
                                onClick={openAlbumPicker}
                            >
                                {`\u25F0${VS15}`}
                            </span>
                            <span
                                className={`modal-pill modal-pill--grail${isPinned ? ' active' : ''}`}
                                title="Grail Pin"
                                onClick={togglePin}
                            >
                                {`\u27DF${VS15}`}
                            </span>
                            <span
                                className={`modal-pill${hasTodo || todoAnchor ? ' active' : ''}`}
                                title="Add to To-Do"
                                onClick={handleTodo}
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
                                onClick={onMainAction}
                            >
                                {actionLabel}
                            </button>
                            <button
                                className={`modal-action-btn-calc${calcMode === 'user-showcase' ? ' is-showcase' : ''}${calcMode === 'shadow' ? ' is-shadow' : ''}${calcMode === 'shadow' && shadowedHere ? ' active' : ''}`}
                                id="mActionCalc"
                                onClick={(e) => {
                                    if (calcMode === 'shadow') {
                                        onShadowTab();
                                    } else if (calcMode === 'user-showcase') {
                                        if (id != null) {
                                            const anchor = anchorFromEvent(e);
                                            const r = toggleShowcase(slug, id);
                                            if (r === 'full') { setSwapAnchor(anchor); return; }
                                            showToast(r === 'added' ? 'Showcase: ADDED' : 'Showcase: REMOVED');
                                        }
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
                    if (currentModalId !== null) openOutputNoteEditor(currentModalId, undefined, slug);
                }}
                title={hasNote ? 'Edit Note' : 'Add Note'}
            >
                {`\u229F${VS15}`}
            </div>

            <div
                className="ls-canvas-wrap"
                onTouchStart={onCanvasTouchStart}
                onTouchEnd={onCanvasTouchEnd}
            >
                {/* Degen Mode — same data slab, landscape layout. */}
                {notifs.degen && id != null && (
                    <DegenSlab slug={slug} id={id} price={meta?.price ?? null} modal />
                )}
                {modalImgSrc && (
                    <img
                        id="modalCanvasLs"
                        ref={imgLsRef}
                        className={`output-canvas${imgLoaded ? ' visible' : ''}`}
                        src={modalImgSrc}
                        alt={id != null ? `${slug} #${id} — artwork` : 'Artwork'}
                        decoding="async"
                        fetchPriority="high"
                        draggable={false}
                        onLoad={(e) => {
                            setImgLoaded(true);
                            /* Sim 8800 modal lock — the opened piece's own
                               sampled colour becomes the hashsyn bg; palette
                               math is the gate-miss fallback. No-op under
                               every other colorway. */
                            hashSynLockToElement(
                                e.currentTarget,
                                id != null ? outputPaletteHex(slug, id) : null,
                            );
                        }}
                        onError={onModalImgError}
                        onClick={openFullPage}
                        style={{ cursor: 'pointer' }}
                        title="Open output page"
                    />
                )}
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

                    <span className={`modal-pill modal-pill--star${starred ? ' active' : ''}`} title="Star" onClick={handleStar}>
                        {`${starred ? '\u2605' : '\u2606'}${VS15}`}
                    </span>
                    <span className={`modal-pill${wishlisted ? ' active' : ''}`} title="Wishlist" onClick={handleWishlist}>
                        {`\u271B${VS15}`}
                    </span>
                    <span className={`modal-pill${albumPickerOpen || hasAlbum ? ' active' : ''}`} title="Add to Album" onClick={openAlbumPicker}>
                        {`\u25F0${VS15}`}
                    </span>
                    <span
                        className={`modal-pill modal-pill--grail${isPinned ? ' active' : ''}`}
                        title="Grail Pin"
                        onClick={togglePin}
                    >
                        {`\u27DF${VS15}`}
                    </span>
                    <span className={`modal-pill${hasTodo || todoAnchor ? ' active' : ''}`} title="Add to To-Do" onClick={handleTodo}>
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
                            onClick={onMainAction}
                        >
                            {actionLabel}
                        </button>
                        <button
                            className={`modal-action-btn-calc${calcMode === 'user-showcase' ? ' is-showcase' : ''}${calcMode === 'shadow' ? ' is-shadow' : ''}${calcMode === 'shadow' && shadowedHere ? ' active' : ''}`}
                            onClick={() => {
                                if (calcMode === 'shadow') {
                                    onShadowTab();
                                } else if (calcMode === 'user-showcase') {
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
        {/* Create-To-Do bubble — a colored tail-bubble anchored on the tapped
            pill; pick a verb (Brendon, 2026-07-23). */}
        {todoAnchor && id != null && (
            <TailBubble anchor={todoAnchor} className="todo-verb-card" onDismiss={() => setTodoAnchor(null)} dismissOnScroll={false}>
                <div className="ms-confirm-question">
                    Create <u>To-Do</u> for{' '}
                    <em className="todo-verb-piece">{title.charAt(0) + title.slice(1).toLowerCase()} #{id}</em>
                </div>
                {/* Date / time / priority — the composer's own selectors (reused
                    verbatim from TodosBox), sitting up top; the picked verb is
                    filed with them (Brendon, 2026-07-23). */}
                <div className="todo-compose-row">
                    <span className={`todo-chip todo-chip-due${todoDue ? ' set' : ''}`}>
                        <label className="todo-chip-seg" title="Due date">
                            <span className="todo-chip-lbl">{todoDue ? fmtTodoDue(todoDue) : 'due'}</span>
                            <input
                                className="todo-chip-native"
                                type="date"
                                value={todoDue}
                                onChange={(e) => setTodoDue(e.target.value)}
                            />
                        </label>
                        <span className="todo-chip-ico todo-chip-clock">◷</span>
                        <label className="todo-chip-seg" title="Reminder time">
                            <span className="todo-chip-lbl">{todoDueTime || 'time'}</span>
                            <input
                                className="todo-chip-native"
                                type="time"
                                value={todoDueTime}
                                onChange={(e) => setTodoDueTime(e.target.value)}
                            />
                        </label>
                    </span>
                    <button
                        type="button"
                        className={`todo-chip todo-chip-pri${todoPriority > 0 ? ` on p${todoPriority}` : ''}`}
                        title="Priority"
                        onClick={cycleTodoPriority}
                    >
                        <span className="todo-chip-ico">!</span>
                        <span className="todo-chip-lbl">P{todoPriority === 0 ? 1 : todoPriority}</span>
                    </button>
                </div>
                <div className="todo-verb-btns">
                    {(['BUY', 'OFFER', 'LIST', 'SEND'] as TodoVerb[]).map((v) => (
                        <button
                            key={v}
                            type="button"
                            className="todo-verb-btn"
                            onClick={() => addTodoVerb(v)}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            </TailBubble>
        )}
        {/* Showcase-full swap bubble — "Replace?" over the 6 picks as bare
            History squares, 2×3 in showcase order (Brendon, 2026-07-23). */}
        {swapAnchor && id != null && (
            <TailBubble anchor={swapAnchor} className="showcase-swap-card" onDismiss={() => setSwapAnchor(null)}>
                <div className="ms-confirm-question">Showcase full. Replace?</div>
                <div className="showcase-swap-grid">
                    {getShowcaseItems().map((it) => (
                        <button
                            key={`${it.slug}:${it.id}`}
                            type="button"
                            className="showcase-swap-cell"
                            title={`Replace ${getProject(it.slug)?.displayName ?? it.slug} #${it.id}`}
                            onClick={() => {
                                const r = replaceInShowcase(it.slug, it.id, slug, id);
                                setSwapAnchor(null);
                                showToast(
                                    r === 'exists' ? 'Showcase: ALREADY IN'
                                        : r === 'replaced' ? 'Showcase: SWAPPED'
                                            : 'Showcase: UNCHANGED',
                                );
                            }}
                        >
                            <OutputThumb slug={it.slug} id={it.id} size={110} crop />
                        </button>
                    ))}
                </div>
            </TailBubble>
        )}
        {/* Unlist confirm — the same centered card the mint flow uses. */}
        {confirmUnlist && id != null && typeof document !== 'undefined' && createPortal(
            <div className="starred-confirm-overlay" role="dialog" aria-modal="true" style={{ zIndex: 100000 }} onClick={() => setConfirmUnlist(false)}>
                <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                    <div className="ms-confirm-question">Unlist {title} #{id}?</div>
                    <div className="ms-confirm-btns">
                        <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirmUnlist(false)}>Cancel</button>
                        <button type="button" className="ms-confirm-btn ms-confirm-btn--ok" onClick={runUnlist}>Unlist</button>
                    </div>
                </div>
            </div>,
            document.body,
        )}
        </Fragment>
    );
}
