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
 *
 * Viewport sync — also lives here (sim.html 6670–6688). The dropdown
 * stack's max-height is driven by a CSS variable --dropdown-max-h
 * which has to track the visual viewport on iOS 26 (and any other
 * mobile environment where chrome resizes the visual viewport
 * independently of the layout viewport). See the syncMaxHeight
 * useCallback + its two useEffects below.
 *
 * Known workaround — see Post-Sim Backlog P3. There's no CSS-only
 * path today that tracks iOS 26's three URL-bar states reliably;
 * this JS listener gets deleted when the CSS catches up.
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

    // ── iOS 26 Safari bottom-cutoff fix (sim.html 6670–6688) ──
    //
    // CSS-only approaches (svh, dvh, env(safe-area-inset-bottom),
    // fixed padding) can't track iOS 26's three URL-bar configs
    // (top bar / bottom-minimised / bottom-expanded) because the
    // layout viewport != the visual viewport when the keyboard or
    // URL bar is mid-transition. window.visualViewport returns the
    // actual pixel rectangle the user can see — exactly what the
    // dropdown's max-height needs to know.
    //
    // Sets --dropdown-max-h on <html>; consumed by .dropdown-stack
    // in app/globals.css line 407 as
    //   max-height: var(--dropdown-max-h, calc(100dvh - 180px))
    // so if the var is unset (e.g. SSR, first paint before mount,
    // wrapper not yet rendered), the dvh-based fallback keeps the
    // menu visible. Means: even if this whole effect failed to run,
    // the menu still opens.
    const syncMaxHeight = useCallback(() => {
        const stack = document.querySelector('.dropdown-stack');
        const wrapper = document.querySelector('.user-menu-wrapper');
        if (!stack || !wrapper) return;
        const vv = window.visualViewport;
        const vpHeight = vv ? vv.height : window.innerHeight;
        const vpOffsetTop = vv ? vv.offsetTop : 0;
        const rect = (wrapper as HTMLElement).getBoundingClientRect();
        // getBoundingClientRect is in LAYOUT-viewport coords;
        // visualViewport.offsetTop tells us how far the visual vp
        // is shifted. Available space below the wrapper in the
        // visual viewport = (vv bottom) - (wrapper bottom in vv coords).
        const wrapperBottomInVV = rect.bottom - vpOffsetTop;
        const availableBelow = vpHeight - wrapperBottomInVV;
        // 200px floor so the menu never collapses to a sliver in
        // weird viewport states. 20px safety margin so the last
        // scrolled item never butts the visual-viewport edge.
        // env(safe-area-inset-bottom) is already in the stack's
        // padding-bottom — don't double-count.
        const maxH = Math.max(200, Math.floor(availableBelow - 20));
        document.documentElement.style.setProperty(
            '--dropdown-max-h',
            `${maxH}px`
        );
    }, []);

    // Permanent listeners + first-paint sync. Matches sim's window-level
    // bindings (sim.html 6680–6687).
    useEffect(() => {
        const vv = window.visualViewport;
        if (vv) {
            vv.addEventListener('resize', syncMaxHeight);
            vv.addEventListener('scroll', syncMaxHeight);
        }
        window.addEventListener('resize', syncMaxHeight);
        window.addEventListener('orientationchange', syncMaxHeight);

        // First-paint sync, after layout is stable. Double rAF matches sim.
        let raf1 = 0;
        let raf2 = 0;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(syncMaxHeight);
        });

        return () => {
            if (vv) {
                vv.removeEventListener('resize', syncMaxHeight);
                vv.removeEventListener('scroll', syncMaxHeight);
            }
            window.removeEventListener('resize', syncMaxHeight);
            window.removeEventListener('orientationchange', syncMaxHeight);
            if (raf1) cancelAnimationFrame(raf1);
            if (raf2) cancelAnimationFrame(raf2);
        };
    }, [syncMaxHeight]);

    // Re-sync on menu open. Sim parity (sim.html 6712 + 6716) — sim
    // re-calls _syncDropdownMaxHeight inside the connect-button click
    // handler with a double-rAF wrapper. Permanent listeners catch
    // viewport changes between opens, but if the visual viewport
    // shifted without firing an event (observed on iOS 26 mid
    // address-bar minimise/expand transitions), the cached
    // --dropdown-max-h is stale until the next event fires. Re-syncing
    // at open-time guarantees the stack is sized against the visual
    // viewport the user is actually looking at when they see it.
    useEffect(() => {
        if (!menuOpen) return;
        let raf1 = 0;
        let raf2 = 0;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(syncMaxHeight);
        });
        return () => {
            if (raf1) cancelAnimationFrame(raf1);
            if (raf2) cancelAnimationFrame(raf2);
        };
    }, [menuOpen, syncMaxHeight]);

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
