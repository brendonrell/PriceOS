'use client';

/*
 * ModalContext
 *
 * Single source of truth for which modal is currently open.
 *
 * The sim manages modals imperatively (openModal, closeModal, openCollectorsModal,
 * etc.). Here we centralise it: any modal-opening action calls open(name, payload),
 * and ModalStack renders the matching component. body.modal-open is applied
 * automatically while any modal is open, which the sim's CSS uses to lock
 * background scrolling and dim chrome.
 *
 * currentModalId is preserved as a separate field because the OutputPreview's
 * prev/next nav increments through output IDs without changing the modal name.
 *
 * Session-only — modals don't persist across reloads on purpose; opening a
 * page should never auto-pop a modal.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { lockBodyScroll, unlockBodyScroll } from './bodyScrollLock';

export type ModalName =
    | 'output'
    | 'collectors'
    | 'followers'
    | 'projectsPro'
    | 'priceSprite'
    | 'familiar'
    | 'priceos'
    | 'aboutPd'
    | 'support'
    | 'gasTracker'
    | 'stickers'
    | 'spiteBook'
    | 'tarot'
    | 'panopticonConfirm'
    | 'leaderboard'
    | 'price-leaderboard'
    | 'golf-leaderboard'
    | 'cartography'
    | 'takeover'
    | 'sigilForge'
    | 'composer'
    | 'gnomewallet'
    /* The two popup surfaces added 2026-07-27 (Brendon): a ping opens where it
       points instead of dead-ending, and a Profile Tag opens the room of people
       wearing it. Both are popups on top of where you are — never a nav away. */
    | 'ping'
    | 'tag'
    /* PURCHASE PAL / PROFIT PAL (Brendon, 2026-07-27) — payload string picks
       the side + optional goal: 'profit' | 'purchase' | 'purchase:<YYYY-MM>'. */
    | 'pal'
    /* PriceOS SUITE (Brendon, 2026-07-27) — the productivity super-app:
       PriceCal · PriceTask · PriceWrite in one modal. Door: long-press the
       TO-DOS header in the connect menu. */
    | 'suite'
    /* PD KEYCHAINS (Brendon, 2026-07-27 — "simulate it for our testers"):
       'depanneur' = the capsule-machine shop (both ⚷ doors), 'keychain' =
       one charm big (payload `${address}` or `${address}:${id}` — the
       profile mini-charm tap). */
    | 'depanneur'
    | 'keychain'
    /* FRIEND INSPECTOR LITE (Brendon, 2026-07-29) — who follows one Output.
       Payload is the global output ref, `{slug}-{tokenId}`. Door: the
       follower count on the Output hero. */
    | 'followersLite';

interface OpenModalState {
    name: ModalName;
    /** Output id when name === 'output'; tab key when name === 'followers'; ignored otherwise. */
    payload?: number | string;
    /** For name === 'followers': the target user (address) whose circle to show —
     *  omitted = the signed-in user's own circle (Brendon, 2026-07-11, view-as). */
    slug?: string;
}

/** One output in the on-screen grid order (slug + token id). The output modal's
 *  prev/next arrows walk this so they follow the grid AS SHOWN — across projects
 *  and carousels — instead of one project's id range (Brendon 2026-06-26). */
export interface OutputRef { slug: string; id: number; }

/** Read every VISIBLE output on the page, in document order — exactly the visual
 *  order (grid top-to-bottom, carousels stacked, list rows in order). Captured at
 *  open-time, before the modal covers the surface. Matches both gallery cards and
 *  list rows (Starred / Wishlist / History) — anything carrying a slug + token id.
 *  Hidden items (filtered out, off-tab, or showcase-collapsed via CSS — the full
 *  list stays mounted) are skipped, so the arrows only walk what's actually seen. */
function readOutputSequence(): OutputRef[] {
    if (typeof document === 'undefined') return [];
    const out: OutputRef[] = [];
    document.querySelectorAll<HTMLElement>('[data-slug][data-mint-id]').forEach((el) => {
        // offsetParent === null ⇒ this item (or an ancestor) is display:none.
        if (el.offsetParent === null) return;
        const slug = el.dataset.slug;
        const id = Number(el.dataset.mintId);
        if (slug && Number.isFinite(id)) out.push({ slug: slug.toLowerCase(), id });
    });
    return out;
}

interface ModalContextValue {
    openModal: OpenModalState | null;
    /** The full modal stack, bottom → top. A modal that launched another
     *  sits below the top; consumers that want to STAY VISIBLE underneath the
     *  one on top of them read this instead of `openModal` (Brendon,
     *  2026-07-21 — opening a modal must leave what's underneath unchanged). */
    stack: OpenModalState[];
    /** The currently-displayed output id in the OutputPreview. */
    currentModalId: number | null;
    /** Project slug for the currently-open output modal (null = active route project). */
    currentModalSlug: string | null;
    /** The on-screen grid order captured when the output modal opened — the
     *  prev/next arrows walk this (null = no grid; fall back to per-project nav). */
    outputSequence: OutputRef[] | null;
    open: (name: ModalName, payload?: number | string, slug?: string) => void;
    /** Close the TOP modal only — whatever was underneath comes back
     *  (Brendon, 2026-07-20: launching a modal over a modal must never lose
     *  the one underneath). With nothing stacked this closes everything,
     *  exactly as before. */
    close: () => void;
    /** Close the WHOLE stack — for leaving modal-land entirely (navigation
     *  to a page). */
    closeAll: () => void;
    /** Set the OutputPreview's output id (for prev/next nav within one project). */
    setCurrentModalId: (id: number | null) => void;
    /** Move the output modal to a specific (slug, id) — used to walk the grid
     *  sequence across projects without re-opening the modal. */
    setCurrentModalOutput: (slug: string, id: number) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

/* ⛔ OPENING A MODAL MUST NOT REDRAW THE GALLERY BEHIND IT (Brendon,
   2026-08-01). The full value carries the live stack + which piece the output
   modal is showing, so opening a modal — and every prev/next tap inside it —
   re-ran every component holding this context. A gallery card only ever OPENS
   modals; it never reads the stack. Cards take these actions instead: they
   never change identity, so the grid behind stays untouched. */
export interface ModalActions {
    open: ModalContextValue['open'];
    close: ModalContextValue['close'];
    closeAll: ModalContextValue['closeAll'];
    setCurrentModalId: ModalContextValue['setCurrentModalId'];
    setCurrentModalOutput: ModalContextValue['setCurrentModalOutput'];
}

const ModalActionsContext = createContext<ModalActions | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
    /* The modal STACK (Brendon, 2026-07-20 — the PriceRank leaderboard was
       killing the PriceSprite modal under it). open() pushes, close() pops:
       whatever sat underneath comes back exactly as it was. `openModal`
       stays the TOP of the stack, so every existing consumer reads the
       same single-modal shape it always did. */
    const [stack, setStack] = useState<OpenModalState[]>([]);
    const openModal = stack.length > 0 ? stack[stack.length - 1] : null;
    const [currentModalId, setCurrentModalId] = useState<number | null>(null);
    const [currentModalSlug, setCurrentModalSlug] = useState<string | null>(null);
    const [outputSequence, setOutputSequence] = useState<OutputRef[] | null>(null);
    /* Escape is heard by BOTH this provider and some modals' own handlers —
       one keypress must pop exactly ONE entry. The guard swallows the same-
       tick duplicate close() call (both fire synchronously in one dispatch). */
    const closeGuard = useRef(false);

    /* Live mirrors of the output-modal position — open() freezes these into
       a covered output entry without re-creating its callback per render. */
    const idRef = useRef<number | null>(null);
    const slugRef = useRef<string | null>(null);
    useEffect(() => { idRef.current = currentModalId; slugRef.current = currentModalSlug; }, [currentModalId, currentModalSlug]);

    const open = useCallback((name: ModalName, payload?: number | string, slug?: string) => {
        setStack((s) => {
            /* Before covering an open output modal, freeze its CURRENT piece
               into its stack entry (prev/next may have walked it) so popping
               back restores the piece that was actually on screen. */
            const top = s[s.length - 1];
            const base = top?.name === 'output' && idRef.current != null
                ? [...s.slice(0, -1), { ...top, payload: idRef.current, slug: slugRef.current ?? undefined }]
                : s;
            return [...base, { name, payload, slug }];
        });
        if (name === 'output' && typeof payload === 'number') {
            setCurrentModalId(payload);
            setCurrentModalSlug(slug ? slug.toLowerCase() : null);
            // Snapshot the grid AS SHOWN now, before the modal covers it. Only
            // keep it when there's more than one card to walk.
            const seq = readOutputSequence();
            setOutputSequence(seq.length > 1 ? seq : null);
        }
    }, []);

    const setCurrentModalOutput = useCallback((slug: string, id: number) => {
        setCurrentModalSlug(slug ? slug.toLowerCase() : null);
        setCurrentModalId(id);
    }, []);

    const close = useCallback(() => {
        if (closeGuard.current) return;
        closeGuard.current = true;
        queueMicrotask(() => { closeGuard.current = false; });
        setStack((s) => {
            const next = s.slice(0, -1);
            const top = next[next.length - 1] ?? null;
            if (top?.name === 'output' && typeof top.payload === 'number') {
                // Popping back onto an output modal — restore its piece.
                setCurrentModalId(top.payload);
                setCurrentModalSlug(top.slug ? top.slug.toLowerCase() : null);
            } else {
                setCurrentModalId(null);
                setCurrentModalSlug(null);
                if (next.length === 0) setOutputSequence(null);
            }
            return next;
        });
    }, []);

    const closeAll = useCallback(() => {
        setStack([]);
        setCurrentModalId(null);
        setCurrentModalSlug(null);
        setOutputSequence(null);
    }, []);

    /* Body class lock + scroll-Y preservation.

       modal.css sets `body.modal-open { position: fixed; }` so the
       background can't scroll while a modal is open. The side effect
       of `position: fixed` is that the page snaps to the top of the
       viewport on open and loses the user's scroll position on close.
       The fix is the sim's openModal/closeModal dance (sim.html 8771
       + 7446): cache `window.scrollY` on open, write it as a negative
       `body.style.top` so the page visually stays put, then on close
       remove the class + reset `top` and `scrollTo(0, y)` to restore.

       This dance previously lived only inside OutputPreview, which
       meant every other modal (Collectors, Followers, PriceSprite,
       Familiar, Priceos) opened from mobile teleported the user to
       page-top and left them there on close — i.e. "mobile modals
       broken entirely." Lifting it into the shared primitive here
       means every modal — current and future — inherits the
       behaviour without needing its own copy. */
    useEffect(() => {
        if (!openModal) return;
        const y = window.scrollY;
        document.body.style.top = `-${y}px`;
        lockBodyScroll();
        return () => {
            unlockBodyScroll();
            document.body.style.top = '';
            window.scrollTo(0, y);
        };
    }, [openModal]);

    // Escape closes whatever's open.
    useEffect(() => {
        if (!openModal) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') close();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [openModal, close]);

    /* Focus management — same lifted-primitive move as the scroll dance above:
       one implementation, every modal inherits it. On open, move focus INTO
       the dialog (screen readers announce it; keyboard users aren't left
       tabbing the hidden page behind it); on close/switch, hand focus back to
       whatever had it. Programmatic focus after a tap draws no ring — the
       ring only shows for keyboard users (:focus-visible heuristics). */
    useEffect(() => {
        if (!openModal) return;
        const prev = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        // Two frames: the matching modal component mounts after this state flip.
        const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
            const dlg = document.querySelector<HTMLElement>('.platform-modal.active')
                ?? document.querySelector<HTMLElement>('[role="dialog"]');
            if (dlg && !dlg.contains(document.activeElement)) {
                if (!dlg.hasAttribute('tabindex')) dlg.setAttribute('tabindex', '-1');
                dlg.focus({ preventScroll: true });
            }
        }));
        return () => {
            cancelAnimationFrame(raf);
            if (prev && document.contains(prev)) prev.focus({ preventScroll: true });
        };
    }, [openModal]);

    const value = useMemo<ModalContextValue>(
        () => ({ openModal, stack, currentModalId, currentModalSlug, outputSequence, open, close, closeAll, setCurrentModalId, setCurrentModalOutput }),
        [openModal, stack, currentModalId, currentModalSlug, outputSequence, open, close, closeAll, setCurrentModalOutput]
    );

    /* Actions only — every one is a stable callback, so this never changes. */
    const actions = useMemo<ModalActions>(
        () => ({ open, close, closeAll, setCurrentModalId, setCurrentModalOutput }),
        [open, close, closeAll, setCurrentModalOutput]
    );

    return (
        <ModalContext.Provider value={value}>
            <ModalActionsContext.Provider value={actions}>{children}</ModalActionsContext.Provider>
        </ModalContext.Provider>
    );
}

/** Open/close handles without the live modal state — see ModalActions above. */
export function useModalActions(): ModalActions {
    const ctx = useContext(ModalActionsContext);
    if (!ctx) {
        throw new Error('useModalActions must be used inside <ModalProvider>');
    }
    return ctx;
}

export function useModal(): ModalContextValue {
    const ctx = useContext(ModalContext);
    if (!ctx) {
        throw new Error('useModal must be used inside <ModalProvider>');
    }
    return ctx;
}

/**
 * SITE-WIDE RULE (Brendon, 2026-07-21): opening a modal over another modal
 * leaves the one underneath exactly as it was — visible, unchanged, just
 * covered. Every modal gates its visibility on this hook instead of
 * `openModal?.name === name`:
 *   - `isOpen` is true whenever the modal is ANYWHERE in the stack (so a modal
 *     that launched another stays rendered beneath it), not only when it's the
 *     top. With a single modal open this is identical to the old top-only check,
 *     so nothing changes outside a genuine stack.
 *   - `isTopStacked` is true only for the top modal WHILE others sit beneath it.
 *     The modal tags its root with `data-stack-top` when this is set; a single
 *     global CSS rule lifts that element above every modal's hardcoded z-index
 *     so the top always sits on top regardless of the pair's natural ordering.
 *     The ones beneath keep their z and show through (their backdrops are dimmed
 *     by the top's), which is the whole point.
 */
export function useModalLayer(name: ModalName): { isOpen: boolean; isTop: boolean; isTopStacked: boolean } {
    const { openModal, stack } = useModal();
    const isOpen = stack.some((m) => m.name === name);
    const isTop = openModal?.name === name;
    return { isOpen, isTop, isTopStacked: isTop && stack.length > 1 };
}
