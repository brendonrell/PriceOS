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
    | 'priceSprite'
    | 'familiar'
    | 'priceos'
    | 'gasTracker'
    | 'stickers';

interface OpenModalState {
    name: ModalName;
    /** Output id when name === 'output'; tab key when name === 'followers'; ignored otherwise. */
    payload?: number | string;
}

interface ModalContextValue {
    openModal: OpenModalState | null;
    /** The currently-displayed output id in the OutputPreview. */
    currentModalId: number | null;
    /** Project slug for the currently-open output modal (null = active route project). */
    currentModalSlug: string | null;
    open: (name: ModalName, payload?: number | string, slug?: string) => void;
    close: () => void;
    /** Set the OutputPreview's output id (for prev/next nav). */
    setCurrentModalId: (id: number | null) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [openModal, setOpenModal] = useState<OpenModalState | null>(null);
    const [currentModalId, setCurrentModalId] = useState<number | null>(null);
    const [currentModalSlug, setCurrentModalSlug] = useState<string | null>(null);

    const open = useCallback((name: ModalName, payload?: number | string, slug?: string) => {
        setOpenModal({ name, payload });
        if (name === 'output' && typeof payload === 'number') {
            setCurrentModalId(payload);
            setCurrentModalSlug(slug ? slug.toLowerCase() : null);
        }
    }, []);

    const close = useCallback(() => {
        setOpenModal(null);
        setCurrentModalId(null);
        setCurrentModalSlug(null);
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

    const value = useMemo<ModalContextValue>(
        () => ({ openModal, currentModalId, currentModalSlug, open, close, setCurrentModalId }),
        [openModal, currentModalId, currentModalSlug, open, close]
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
