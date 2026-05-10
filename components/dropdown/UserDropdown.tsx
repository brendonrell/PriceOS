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
 */

import { useDropdown } from '../../lib/state/DropdownContext';
import { GlobalSearchBar } from './GlobalSearchBar';
import { LinksView } from './LinksView';
import { SettingsView } from './settings/SettingsView';
import { ArtistsView } from './ArtistsView';
import { PortfolioView } from './PortfolioView';
import CalendarPanel from '../CalendarPanel';

export function UserDropdown() {
    const { view } = useDropdown();

    return (
        <div className="user-dropdown">
            <GlobalSearchBar />

            {view === 'links' && <LinksView />}
            {view === 'settings' && <SettingsView />}
            {view === 'calendar' && <CalendarPanel />}
            {view === 'artists' && <ArtistsView />}
            {view === 'portfolio' && <PortfolioView />}
        </div>
    );
}
