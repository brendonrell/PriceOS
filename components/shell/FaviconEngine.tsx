'use client';

/*
 * FaviconEngine
 *
 * Mount-once component that drives the dynamic favicon. Pure ownership
 * surface — no DOM of its own. Sits inside <PriceOSShell> so it has
 * access to ThemeContext and PdNotifsContext.
 *
 * Responsibilities (matches sim's call sites for window.updateFavicon):
 *
 *   1. On mount + every theme change → repaint with current
 *      --bg-color / --text-color (sim 6875: theme switch repaint).
 *   2. On priceLogo toggle → repaint with the override SVG mode
 *      (sim 9596: Settings → Price Logo toggle).
 *
 * Future hooks (engine fn already supports them, wiring deferred):
 *   - isAlert        — unread-event red bg (sim's currentFaviconAlert)
 *   - isEthPing      — Quick Connect ping flash (sim 6731-6735)
 *   - isRotated      — easter-egg -90° rotate (sim 5530)
 *
 * Why subscribe to `theme` and not just diff CSS vars: ThemeContext
 * applies the new --bg-color / --text-color synchronously inside its
 * setTheme callback, so by the time React schedules our effect, the
 * vars are already in place. We read them directly from
 * documentElement.style — same source sim reads from (sim 6734).
 */

import { useEffect } from 'react';
import { useTheme } from '../../lib/state/ThemeContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { updateFavicon } from '../../lib/favicon/updateFavicon';

/* Sim's module-scope state (sim 5557-5559). For now these are
   constants — alert/rotated/ethPing wiring is deferred to the
   features that trigger them (Connect button, easter-egg logo). */
const DEFAULT_TEXT = '\u2030';
const DEFAULT_ALERT = false;
const DEFAULT_ROTATED = false;

export function FaviconEngine() {
    const { theme } = useTheme();
    const { notifs } = usePdNotifs();

    useEffect(() => {
        /* Read live theme vars off documentElement, same as sim 6734.
           Falls back to getComputedStyle if .style.getPropertyValue
           returns empty (some browsers don't expose CSS-var inline
           reads consistently). */
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

        updateFavicon({
            bg: bg || null,
            fg: fg || null,
            text: DEFAULT_TEXT,
            isAlert: DEFAULT_ALERT,
            isEthPing: false,
            isRotated: DEFAULT_ROTATED,
            priceLogoOverride: notifs.priceLogo,
        });
    }, [theme, notifs.priceLogo]);

    return null;
}
