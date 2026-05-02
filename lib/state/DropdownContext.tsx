'use client';

/*
 * DropdownContext
 *
 * Owns two pieces of pure UI state for the Connect Menu:
 *   1. menuOpen — whether the dropdown stack is open
 *   2. view — which panel the main user-dropdown is showing
 *      ('links' is default, others are reachable via clicks inside)
 *
 * Neither piece is persisted — opening the app should never start
 * with the menu open or in some non-default view.
 *
 * Accordion-open state for the Tape / Pings / Todos / Notes boxes
 * lives in PdNotifsContext (matches the sim's pdNotifs object).
 *
 * Outside-click handler — uses mousedown, not click.
 *
 * The earlier click-based version had a bug: when the user clicked
 * an internal link (e.g. Settings) that triggers a setView, React
 * batched the state update and re-rendered before the click event
 * finished bubbling to the document. By the time the document
 * handler ran, the original target node was detached from the DOM,
 * so target.closest('.user-menu-wrapper') returned null and the
 * handler treated the click as "outside" and closed the menu.
 *
 * Switching to mousedown sidesteps the entire race: mousedown fires
 * before the click is even dispatched (let alone bubbled), so the
 * target is always still in the DOM when the handler runs. The
 * handler also queries the wrapper element fresh each time rather
 * than relying on closest() walking up from the target, which is
 * more robust if anything ever does manage to detach mid-flight.
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

export type DropdownView =
    | 'links'      // default — Profile / Discord / Artists / Portfolio / Settings / Log Out
    | 'calendar'   // ▦ icon
    | 'settings'   // Settings link
    | 'artists'    // Artists link
    | 'portfolio'; // Portfolio link

interface DropdownContextValue {
    menuOpen: boolean;
    view: DropdownView;
    openMenu: () => void;
    closeMenu: () => void;
    toggleMenu: () => void;
    setView: (v: DropdownView) => void;
    /** Reset to default view AND close. Used on outside click. */
    reset: () => void;
}

const DropdownContext = createContext<DropdownContextValue | null>(null);

export function DropdownProvider({ children }: { children: ReactNode }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [view, setView] = useState<DropdownView>('links');

    const openMenu = useCallback(() => setMenuOpen(true), []);
    const closeMenu = useCallback(() => setMenuOpen(false), []);
    const toggleMenu = useCallback(() => setMenuOpen((o) => !o), []);
    const reset = useCallback(() => {
        setMenuOpen(false);
        setView('links');
    }, []);

    // Outside-click closes. See top-of-file comment for why mousedown.
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (!target) return;
            const wrapper = document.querySelector('.user-menu-wrapper');
            if (wrapper && wrapper.contains(target)) return;
            setMenuOpen(false);
            setView('links');
        };
        // Defer attach so the same gesture that opened the menu
        // doesn't immediately close it (the connect button's click
        // bubbles to document on the same tick).
        const t = setTimeout(() => {
            document.addEventListener('mousedown', handler);
        }, 0);
        return () => {
            clearTimeout(t);
            document.removeEventListener('mousedown', handler);
        };
    }, [menuOpen]);

    // Escape closes too.
    useEffect(() => {
        if (!menuOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setMenuOpen(false);
                setView('links');
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [menuOpen]);

    const value = useMemo<DropdownContextValue>(
        () => ({ menuOpen, view, openMenu, closeMenu, toggleMenu, setView, reset }),
        [menuOpen, view, openMenu, closeMenu, toggleMenu, reset]
    );

    return <DropdownContext.Provider value={value}>{children}</DropdownContext.Provider>;
}

export function useDropdown(): DropdownContextValue {
    const ctx = useContext(DropdownContext);
    if (!ctx) {
        throw new Error('useDropdown must be used inside <DropdownProvider>');
    }
    return ctx;
}
