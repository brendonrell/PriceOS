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

export type ModalName =
    | 'output'
    | 'collectors'
    | 'followers'
    | 'priceSprite'
    | 'familiar'
    | 'priceos';

interface OpenModalState {
    name: ModalName;
    /** Output id when name === 'output'; tab key when name === 'followers'; ignored otherwise. */
    payload?: number | string;
}

interface ModalContextValue {
    openModal: OpenModalState | null;
    /** The currently-displayed output id in the OutputPreview. */
    currentModalId: number | null;
    open: (name: ModalName, payload?: number | string) => void;
    close: () => void;
    /** Set the OutputPreview's output id (for prev/next nav). */
    setCurrentModalId: (id: number | null) => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
    const [openModal, setOpenModal] = useState<OpenModalState | null>(null);
    const [currentModalId, setCurrentModalId] = useState<number | null>(null);

    const open = useCallback((name: ModalName, payload?: number | string) => {
        setOpenModal({ name, payload });
        if (name === 'output' && typeof payload === 'number') {
            setCurrentModalId(payload);
        }
    }, []);

    const close = useCallback(() => {
        setOpenModal(null);
        setCurrentModalId(null);
    }, []);

    // Body class lock — applied while any modal is open.
    useEffect(() => {
        if (openModal) {
            document.body.classList.add('modal-open');
        } else {
            document.body.classList.remove('modal-open');
        }
        return () => {
            document.body.classList.remove('modal-open');
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
        () => ({ openModal, currentModalId, open, close, setCurrentModalId }),
        [openModal, currentModalId, open, close]
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
