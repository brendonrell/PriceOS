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
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { hashSynResample } from '../engines/hashSynEngine';

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
            // F45 / BUG-19 — ignore outside-click while any modal is open.
            // Native mousedown fires before React stopPropagation can run, so a
            // tap inside an open modal would otherwise close the connect menu
            // out from under it. Sim references the same gate at sim 5493 +
            // 7449 + 7467 etc. via document.body.classList.contains('modal-open').
            if (document.body.classList.contains('modal-open')) return;
            const target = e.target as Node | null;
            if (!target) return;
            const wrapper = document.querySelector('.user-menu-wrapper');
            if (wrapper && wrapper.contains(target)) return;
            const petey = document.querySelector('.pd-logo-wrap');
            if (petey && petey.contains(target)) return;
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

    /* G item 7 — _syncDropdownMaxHeight (sim 6670-6688) port.
       The .dropdown-stack max-height clamps via `var(--dropdown-max-h, calc(100dvh - 180px))`.
       The 180px CSS fallback is a static approximation of the navbar
       footprint; when a top-bar pill (Stargazing / Hammer / Echo / etc)
       flips on, the navbar wraps to multiple rows and the wrapper's
       bottom-edge moves further down the viewport. Without a JS sync,
       the dropdown anchored to the wrapper extends past the viewport
       AND its own clamp doesn't compensate, so accordions get pushed
       below the visible area — the menu reads as "shortened to top
       part" because Pings/Notes/Todos are scrolled off-screen.

       The sync writes a pixel-exact `--dropdown-max-h` based on the
       actual wrapper rect + visualViewport. Listens to viewport
       resize/scroll (iOS URL-bar transitions), window resize/orientation,
       and ResizeObserver on the navbar (top-bar pill row add/remove). */
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const sync = () => {
            const wrapper = document.querySelector('.user-menu-wrapper');
            if (!wrapper) return;
            const vv = window.visualViewport;
            /* iOS on-screen keyboard guard (Brendon repro, 2026-07-06 — the
               Workflows sheet squish). Focusing a text field collapses
               visualViewport.height; re-clamping the menu to that transient
               height crushed the open accordion into the boxes below it, and
               a final event mid-keyboard-dismiss could bake the tiny clamp in
               until refresh. The keyboard never needs a smaller menu — the
               focused sheet is its own fixed layer — so freeze the clamp
               while the keyboard is up; the dismiss resize (delta back under
               threshold) runs a clean recompute and self-heals. */
            if (vv && window.innerHeight - vv.height > 120) return;
            const vpHeight = vv ? vv.height : window.innerHeight;
            const vpOffsetTop = vv ? vv.offsetTop : 0;
            const rect = wrapper.getBoundingClientRect();
            const wrapperBottomInVV = rect.bottom - vpOffsetTop;
            const availableBelow = vpHeight - wrapperBottomInVV;
            const maxH = Math.max(200, Math.floor(availableBelow - 20));
            document.documentElement.style.setProperty(
                '--dropdown-max-h',
                `${maxH}px`
            );
        };

        // Initial sync + double-rAF for first-paint stability (sim 6698).
        sync();
        const r1 = requestAnimationFrame(() => {
            requestAnimationFrame(sync);
        });

        const vv = window.visualViewport;
        if (vv) {
            vv.addEventListener('resize', sync);
            vv.addEventListener('scroll', sync);
        }
        window.addEventListener('resize', sync);
        window.addEventListener('orientationchange', sync);

        // ResizeObserver on the navbar — fires when a top-bar pill row
        // is added/removed, which changes the wrapper's bottom edge
        // without firing visualViewport events.
        //
        // Chat J parking-lot fix: rAF-debounce the observer callback.
        // The pre-fix observer called sync() directly on every fire, and
        // ResizeObserver fires on every layout pass during a navbar
        // reflow — when a top-bar pill mounts (e.g. Hammer toggles on),
        // the navbar's flex-wrap layout settles over multiple browser
        // ticks on iOS Safari, and intermediate fires read a wrapper
        // bottom-edge mid-flight (sometimes near the navbar's transient
        // bottom rather than its final stable bottom). The interstitial
        // measurement wrote a too-small --dropdown-max-h value; if the
        // last fire happened to land mid-reflow, the var stayed clamped
        // near the 200px floor for the remainder of the menu session.
        // Visible repro: connect menu collapses to truncated state
        // showing only WALLET + start of MY PD list when a top-bar pill
        // flips on while the menu is open.
        //
        // The fix coalesces all fires within one frame into a single
        // sync call scheduled via double-rAF — same pattern sim uses for
        // first-paint stability (sim 6699) and the menu-open re-sync
        // below (line 210). The first rAF waits for the current layout
        // pass to commit; the second waits for any cascading layout
        // (e.g., flex-wrap re-flow on the next tick). pendingRaf gates
        // re-entry so a burst of observer fires during a long reflow
        // collapses to one trailing-edge sync.
        let pendingRaf: number | null = null;
        const debouncedSync = () => {
            if (pendingRaf !== null) cancelAnimationFrame(pendingRaf);
            pendingRaf = requestAnimationFrame(() => {
                pendingRaf = requestAnimationFrame(() => {
                    pendingRaf = null;
                    sync();
                });
            });
        };
        let resizeObs: ResizeObserver | null = null;
        const navbar = document.querySelector('.navbar');
        if (navbar && typeof ResizeObserver !== 'undefined') {
            resizeObs = new ResizeObserver(debouncedSync);
            resizeObs.observe(navbar);
        }

        return () => {
            cancelAnimationFrame(r1);
            if (pendingRaf !== null) cancelAnimationFrame(pendingRaf);
            if (vv) {
                vv.removeEventListener('resize', sync);
                vv.removeEventListener('scroll', sync);
            }
            window.removeEventListener('resize', sync);
            window.removeEventListener('orientationchange', sync);
            if (resizeObs) resizeObs.disconnect();
        };
    }, []);

    /* G item 7 (cont.) — re-sync on menu open. The general listener above
       keeps the var fresh as the navbar mutates, but a fresh measurement
       at open time matches sim 6713-6716 and protects against the menu
       opening while a pill-row addition was in-flight. */
    useEffect(() => {
        if (!menuOpen || typeof window === 'undefined') return;
        const sync = () => {
            const wrapper = document.querySelector('.user-menu-wrapper');
            if (!wrapper) return;
            const vv = window.visualViewport;
            /* Same keyboard guard as the general listener above. */
            if (vv && window.innerHeight - vv.height > 120) return;
            const vpHeight = vv ? vv.height : window.innerHeight;
            const vpOffsetTop = vv ? vv.offsetTop : 0;
            const rect = wrapper.getBoundingClientRect();
            const wrapperBottomInVV = rect.bottom - vpOffsetTop;
            const availableBelow = vpHeight - wrapperBottomInVV;
            const maxH = Math.max(200, Math.floor(availableBelow - 20));
            document.documentElement.style.setProperty(
                '--dropdown-max-h',
                `${maxH}px`
            );
        };
        const r = requestAnimationFrame(() => requestAnimationFrame(sync));
        return () => cancelAnimationFrame(r);
    }, [menuOpen]);

    /* Hash Synesthesia re-sample on menu RETRACT (Brendon, 2026-06-13).
       Opening the connect menu lets the iOS browser-chrome tint sample the
       menu's black surface (expected) — but on close the tint stayed stuck
       on black instead of returning to the art behind it. Bottom-sheet
       modals don't have this problem because their close triggers a layout/
       scroll that the engine's listeners catch; the connect menu's retract
       doesn't, so we kick the sample explicitly. Staggered across the
       retract so the freshly-revealed canvases are sampled, not the menu
       still sliding away. hashSynResample is inert unless hashsyn is the
       active colorway. */
    const prevMenuOpenRef = useRef(false);
    useEffect(() => {
        const was = prevMenuOpenRef.current;
        prevMenuOpenRef.current = menuOpen;
        if (!was || menuOpen) return;
        const t1 = setTimeout(hashSynResample, 260);
        const t2 = setTimeout(hashSynResample, 520);
        return () => {
            clearTimeout(t1);
            clearTimeout(t2);
        };
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
