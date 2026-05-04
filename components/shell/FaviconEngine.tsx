'use client';

/*
 * FaviconEngine
 *
 * Mount-once component that drives the dynamic favicon. Pure ownership
 * surface — no DOM of its own. Sits inside <PriceOSShell> so it has
 * access to ThemeContext, PdNotifsContext, and DropdownContext.
 *
 * Maps every sim call site for window.updateFavicon to a React trigger:
 *
 *   sim 6875  theme change                  → useEffect on `theme`
 *   sim 9596  priceLogo settings toggle     → useEffect on `notifs.priceLogo`
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

import { useEffect, useState } from 'react';
import { useTheme } from '../../lib/state/ThemeContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useDropdown } from '../../lib/state/DropdownContext';
import { updateFavicon } from '../../lib/favicon/updateFavicon';

const DEFAULT_TEXT = '\u2030';
const ETH_PING_DURATION_MS = 2000;
const ROTATION_EVENT = 'pd:petey-rotated';

/* Read live theme vars off documentElement, same as sim 6734.
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
    const { theme } = useTheme();
    const { notifs } = usePdNotifs();
    const { menuOpen } = useDropdown();

    /* Transient render flags — match sim's module-level globals
       (currentFaviconRotated at 5559, the implicit ETH ping window
       inside the click handler at 6731-6735). Local useState here
       so neither survives a reload, mirroring sim. */
    const [rotated, setRotated] = useState(false);
    const [ethPing, setEthPing] = useState(false);

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

    /* ETH ping on Connect menu open (sim 6731-6735). Fires on the
       false→true edge of menuOpen. The cleanup clears the pending
       restore if menuOpen flips again before the 2s elapses, so a
       quick close+reopen restarts the timer fresh. */
    useEffect(() => {
        if (!menuOpen) return;
        setEthPing(true);
        const t = setTimeout(() => setEthPing(false), ETH_PING_DURATION_MS);
        return () => clearTimeout(t);
    }, [menuOpen]);

    /* Main paint effect. Re-runs on every favicon-relevant state
       change: theme, priceLogo override, easter-egg rotation, ETH
       ping start/end. The engine itself decides which mode wins
       (isEthPing > priceLogoOverride > default bubble+glyph). */
    useEffect(() => {
        const { bg, fg } = readThemeColors();
        updateFavicon({
            bg,
            fg,
            text: DEFAULT_TEXT,
            isAlert: false,
            isEthPing: ethPing,
            isRotated: rotated,
            priceLogoOverride: notifs.priceLogo,
        });
    }, [theme, notifs.priceLogo, rotated, ethPing]);

    return null;
}
