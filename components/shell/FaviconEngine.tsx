'use client';

/*
 * FaviconEngine
 *
 * Mount-once component that drives the dynamic favicon. Pure ownership
 * surface — no DOM of its own. Sits inside <PriceOSShell> so it has
 * access to ColorwayContext, PdNotifsContext, and DropdownContext.
 *
 * Maps every sim call site for window.updateFavicon to a React trigger:
 *
 *   sim 6875  colorway change               → useLayoutEffect on `colorway`
 *   sim 9596  priceLogo settings toggle     → useLayoutEffect on `notifs.priceLogo`
 *   sim 5533  easter-egg rotation toggle    → 'pd:petey-rotated' DOM event
 *   sim 6731  Connect menu open (ETH ping)  → useEffect on `menuOpen` +
 *             sim 6734  2s restore            2000ms setTimeout
 *
 * Why a DOM event for rotation instead of lifting state into context:
 * sim keeps `currentFaviconRotated` as a transient module-level flag
 * (sim 5559) that does not persist across reloads. The rotation truth
 * lives in PeteyLogo's local useState — lifting it into PdNotifsContext
 * would mean persisting it to localStorage, which sim does not do.
 * A CustomEvent dispatched from PeteyLogo's effect keeps the state
 * local to its owner while still letting FaviconEngine react to it.
 *
 * ETH ping behavior matches sim 6731-6735 exactly: when the menu
 * opens, paint the big red ⟠ glyph immediately, then 2000ms later
 * paint the normal bubble again. If the menu closes inside that
 * window, the timer still fires the restore — sim has the same
 * behavior. If the user opens, closes, and reopens within 2s, the
 * second open's effect cleanup clears the first timer and starts a
 * fresh one (matches sim's "last open wins" via setTimeout).
 *
 * isAlert (sim's currentFaviconAlert) is reserved by the engine but
 * never raised in sim itself — declared at sim 5558, no assignment
 * ever flips it. We pass `false` here for parity. If a future build
 * wires unread-event tracking, this is the place to read that flag.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useColorway } from '../../lib/state/ColorwayContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useDropdown } from '../../lib/state/DropdownContext';
import { updateFavicon } from '../../lib/favicon/updateFavicon';
import { getActiveProfileLogo, subscribeActiveProfileLogo } from '../../lib/profile/profileLogoActive';
import { PROFILE_LOGOS_BY_ID } from '../../lib/profile/profileLogos';

const DEFAULT_TEXT = '\u2030';
const ETH_PING_DURATION_MS = 2000;
const ROTATION_EVENT = 'pd:petey-rotated';

/* Read live colorway vars off documentElement, same as sim 6734.
   Falls back to getComputedStyle if .style.getPropertyValue
   returns empty (the inline read only sees vars set by JS;
   the CSS :root defaults need the computed view). */
function readThemeColors(): { bg: string | null; fg: string | null } {
    const root = document.documentElement;
    const inlineBg = root.style.getPropertyValue('--bg-color').trim();
    const inlineFg = root.style.getPropertyValue('--text-color').trim();

    let bg = inlineBg;
    let fg = inlineFg;
    if (!bg || !fg) {
        const cs = getComputedStyle(root);
        if (!bg) bg = cs.getPropertyValue('--bg-color').trim();
        if (!fg) fg = cs.getPropertyValue('--text-color').trim();
    }
    return { bg: bg || null, fg: fg || null };
}

export function FaviconEngine() {
    const { colorway } = useColorway();
    const { notifs } = usePdNotifs();
    const { menuOpen } = useDropdown();

    /* Transient render flags — match sim's module-level globals
       (currentFaviconRotated at 5559, the implicit ETH ping window
       inside the click handler at 6731-6735). Local useState here
       so neither survives a reload, mirroring sim. */
    const [rotated, setRotated] = useState(false);
    const [ethPing, setEthPing] = useState(false);

    /* The viewed profile's Profile Logo (or null elsewhere). Same store the
       corner logo reads — so the favicon repaints to the owner's pick on a
       profile page and back to the colorway logo when you leave. */
    const activeLogoId = useSyncExternalStore(
        subscribeActiveProfileLogo,
        getActiveProfileLogo,
        () => null,
    );

    /* Subscribe to PeteyLogo's easter-egg rotation. PeteyLogo dispatches
       this event from its own effect every time its local `rotated`
       state changes (including the no-op initial dispatch on mount). */
    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ rotated: boolean }>;
            setRotated(!!ce.detail?.rotated);
        };
        document.addEventListener(ROTATION_EVENT, handler);
        return () => document.removeEventListener(ROTATION_EVENT, handler);
    }, []);

    /* ETH ping on Connect menu open (sim 6731-6735). Sim fires
       updateFavicon with isEthPing=true, then schedules an UNCONDITIONAL
       setTimeout that restores the favicon 2000ms later — the timer
       fires regardless of whether the menu is still open.

       Build 25 D8: prior implementation cancelled the timer in the
       cleanup whenever menuOpen flipped, which meant a quick
       open→close→open within 2s would let the FIRST open's still-
       pending timer fire and prematurely clear the SECOND open's ping
       (Brendon's "shows briefly then disappears"). Fixed here by
       tracking the active timer in a ref: each new false→true edge
       cancels the previous pending restore (so we don't double-clear)
       and starts a fresh 2000ms window. Closing the menu does NOT
       cancel the timer — sim parity. */
    const prevMenuOpenRef = useRef(false);
    const ethPingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        const wasOpen = prevMenuOpenRef.current;
        prevMenuOpenRef.current = menuOpen;
        // Only fire on the false→true edge.
        if (!menuOpen || wasOpen) return;
        if (ethPingTimerRef.current !== null) {
            clearTimeout(ethPingTimerRef.current);
        }
        setEthPing(true);
        ethPingTimerRef.current = setTimeout(() => {
            setEthPing(false);
            ethPingTimerRef.current = null;
        }, ETH_PING_DURATION_MS);
    }, [menuOpen]);

    // Clear any pending restore on unmount.
    useEffect(() => {
        return () => {
            if (ethPingTimerRef.current !== null) {
                clearTimeout(ethPingTimerRef.current);
                ethPingTimerRef.current = null;
            }
        };
    }, []);

    /* The actual repaint: read the live theme vars off :root and redraw.
       Recreated when any of the favicon's render flags change, so every
       caller below paints with the current flags. */
    const paint = useCallback(() => {
        const { bg, fg } = readThemeColors();
        const pl = activeLogoId ? PROFILE_LOGOS_BY_ID.get(activeLogoId) : null;
        const profileLogo = pl
            ? {
                  kind: (pl.kind === 'price' ? 'price' : 'logo') as 'price' | 'logo',
                  color: pl.color,
                  cutout: pl.cutout,
                  bg: pl.bg,
                  fg: pl.fg,
                  holo: pl.holo,
                  blank: pl.blank,
                  glyphOnly: pl.glyphOnly,
                  outline: pl.outline,
              }
            : null;
        updateFavicon({
            bg,
            fg,
            text: DEFAULT_TEXT,
            isAlert: false,
            isEthPing: ethPing,
            // A Petey (rotated) profile logo rests rotated, like the corner.
            isRotated: !!pl?.rotated || rotated,
            priceLogoOverride: notifs.priceLogo,
            /* Mirror the on-page logo swap: applyBgHex flags a red big-colour on
               <body>; read it fresh each paint (this repaints on every bg change). */
            priceLogoSwap: document.body.classList.contains('price-logo-swap'),
            profileLogo,
        });

        // Sync Safari browser chrome color to the live bg — sim line 6859.
        // FaviconEngine already fires on every colorway change so this keeps the
        // URL-bar / status-bar tint in lockstep with the page background.
        if (bg) {
            const tcm = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
            if (tcm) {
                // While Ambient dimming in a BROWSER tab, the chrome tint stays
                // dark — don't stomp it back to the bright colorway on repaint
                // (this engine was the reason the Safari fix never stuck —
                // Brendon, 2026-06-17).
                const dimDark = document.body.classList.contains('ambient-dim-on') && !document.body.classList.contains('is-pwa');
                tcm.setAttribute('content', dimDark ? '#03020a' : bg);
            }
        }
    }, [ethPing, rotated, notifs.priceLogo, activeLogoId]);

    /* Main paint effect. useLayoutEffect makes the cold-load favicon sync
       happen in the same pre-paint window as ColorwayContext's CSS-var write,
       instead of one browser paint later. This closes the "favicon only
       updates after changing colorways" gap on app/page load. The `paint`
       dep covers colorway-flag changes (priceLogo / rotation / ETH ping). */
    useLayoutEffect(() => {
        paint();
    }, [colorway, paint]);

    /* Repaint whenever the live background actually changes. Project / profile
       / home pages all share the 'custom' colorway KEY but derive a DIFFERENT
       background per page, and a profile's real colour is applied a beat AFTER
       mount (once the owner's hex resolves) WITHOUT changing the key — so the
       colorway-keyed effect above never re-fires and the favicon would stay on
       the prehydration default (the off-white profile boot colour) until some
       unrelated state change finally nudged it. Watching --bg-color directly
       catches every background write — route change, deferred profile hex,
       custom-colour edits, animated colorways — and repaints on the next frame.
       Our own paint writes the favicon link + theme-color meta, never the root
       style, so this can't feed back on itself. */
    const lastBgRef = useRef<string | null>(null);
    useEffect(() => {
        const root = document.documentElement;
        let raf = 0;
        const check = () => {
            const bg = root.style.getPropertyValue('--bg-color').trim() || null;
            if (bg === lastBgRef.current) return;
            lastBgRef.current = bg;
            cancelAnimationFrame(raf);
            raf = requestAnimationFrame(() => paint());
        };
        const mo = new MutationObserver(check);
        mo.observe(root, { attributes: true, attributeFilter: ['style'] });
        check(); // catch a bg already set before the observer attached
        return () => { mo.disconnect(); cancelAnimationFrame(raf); };
    }, [paint]);

    return null;
}