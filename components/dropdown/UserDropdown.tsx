'use client';

/*
 * UserDropdown
 *
 * Top of the dropdown stack. Hosts the Global Search bar and one of
 * five views below it:
 *
 *   - links     — Profile / Discord / Artists / Portfolio / Settings / Log Out
 *   - settings  — full Settings panel (wallet/MY PD/themes/sort/pings/spell-book/workspace)
 *   - calendar  — Calendar panel (month grid + day column with events / to-dos)
 *   - artists   — Artists A-Z directory (filter pills + pin/note + scroll list)
 *   - portfolio — Portfolios panel (Budgets + Main/Shadow tabs + tree + filters)
 *
 * Search bar stays mounted across view swaps so input keeps focus.
 *
 * S4 page 3234 — all-views min-height lock (sim 6530-6549, sim carve-out):
 *   On first paint of the `links` view, measure #dropdownMenuLinks'
 *   getBoundingClientRect height, write --pd-menu-height on the
 *   document root, and pin the parent .user-dropdown's minHeight to
 *   the dropdown's full natural height. lockedRef ensures the lock
 *   fires exactly once per mount — subsequent view swaps (settings /
 *   artists / portfolio / calendar) inherit the floor and stay at
 *   least as tall as the links view. The CalendarPanel's existing
 *   re-measure at toggleCalendar (sim 6489-6549, ported into
 *   CalendarPanel) still owns its own height handling — this lock
 *   only sets the *floor*.
 */

import { useLayoutEffect, useRef } from 'react';
import { useDropdown } from '../../lib/state/DropdownContext';
import { GlobalSearchBar } from './GlobalSearchBar';
import { LinksView } from './LinksView';
import { SettingsView } from './settings/SettingsView';
import { ArtistsView } from './ArtistsView';
import { PortfolioView } from './PortfolioView';
import CalendarPanel from '../CalendarPanel';

export function UserDropdown() {
    const { view } = useDropdown();
    const userDdRef = useRef<HTMLDivElement | null>(null);
    const lockedRef = useRef(false);

    /* Sim 6530-6549 port — first time `view === 'links'` lands a
       paintable layout, measure and pin. fractional rect height
       avoids the integer-rounding sub-pixel drift sim 6532 calls out.
       useLayoutEffect captures pre-paint so the dropdown doesn't
       flash at its smaller pre-lock height. */
    useLayoutEffect(() => {
        if (lockedRef.current) return;
        if (view !== 'links') return;
        const userDd = userDdRef.current;
        if (!userDd) return;
        const links = userDd.querySelector('#dropdownMenuLinks') as HTMLElement | null;
        if (!links) return;
        const linksH = links.getBoundingClientRect().height;
        if (linksH <= 0) return;
        const fullH = userDd.getBoundingClientRect().height;
        const linksHStr = `${Math.round(linksH * 10) / 10}px`;
        const fullHStr = `${Math.round(fullH * 10) / 10}px`;
        document.documentElement.style.setProperty('--pd-menu-height', linksHStr);
        userDd.style.minHeight = fullHStr;
        lockedRef.current = true;
    }, [view]);

    return (
        <div ref={userDdRef} className="user-dropdown">
            <GlobalSearchBar />

            {view === 'links' && <LinksView />}
            {view === 'settings' && <SettingsView />}
            {view === 'calendar' && <CalendarPanel />}
            {view === 'artists' && <ArtistsView />}
            {view === 'portfolio' && <PortfolioView />}
        </div>
    );
}
