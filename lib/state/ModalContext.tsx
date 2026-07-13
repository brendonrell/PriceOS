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
    | 'panopticonConfirm'
    | 'leaderboard'
    | 'golf-leaderboard'
    | 'cartography'
    | 'takeover'
    | 'sigilForge'
    | 'composer';

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
    /** The currently-displayed output id in the OutputPreview. */
    currentModalId: number | null;
    /** Project slug for the currently-open output modal (null = active route project). */
    currentModalSlug: string | null;
    /** The on-screen grid order captured when the output modal opened — the
     *  prev/next arrows walk this (null = no grid; fall back to per-project nav). */
    outputSequence: OutputRef[] | null;
    open: (name: ModalName, payload?: number | string, slug?: string) => void;
    close: () => void;
    /** Set the OutputPreview's output id (for prev/next nav within one project). */
    setCurrentModalId: (id: number | null) => void;
    /** Move the output modal to a specific (slug, id) — used to walk the grid
     *  sequence across projects without re-opening the modal. */
    setCurrentModalOutput: (slug: string, id: number) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [openModal, setOpenModal] = useState<OpenModalState | null>(null);
    const [currentModalId, setCurrentModalId] = useState<number | null>(null);
    const [currentModalSlug, setCurrentModalSlug] = useState<string | null>(null);
    const [outputSequence, setOutputSequence] = useState<OutputRef[] | null>(null);

    const open = useCallback((name: ModalName, payload?: number | string, slug?: string) => {
        setOpenModal({ name, payload, slug });
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
        setOpenModal(null);
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
        () => ({ openModal, currentModalId, currentModalSlug, outputSequence, open, close, setCurrentModalId, setCurrentModalOutput }),
        [openModal, currentModalId, currentModalSlug, outputSequence, open, close, setCurrentModalOutput]
    );

    return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal(): ModalContextValue {
    const ctx = useContext(ModalContext);
    if (!ctx) {
        throw new Error('useModal must be used inside <ModalProvider>');
    }
    return ctx;
}
