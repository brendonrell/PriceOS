'use client';

/*
 * UserDropdown
 *
 * Top of the dropdown stack. Hosts the Global Search bar and one of
 * five views below it:
 *
 *   - links     — Profile / Discord / Artists / Portfolio / Settings / Log Out
 *   - settings  — full Settings panel (step 4 — wallet/MY PD/themes/sort/pings/spell-book/workspace)
 *   - calendar  — Calendar panel (step 5 — month grid + day column with events / to-dos)
 *   - artists   — placeholder (lands later)
 *   - portfolio — placeholder (lands later)
 *
 * Search bar stays mounted across view swaps so input keeps focus.
 */

import { useDropdown } from '../../lib/state/DropdownContext';
import { GlobalSearchBar } from './GlobalSearchBar';
import { LinksView } from './LinksView';
import { PanelPlaceholder } from './PanelPlaceholder';
import { SettingsView } from './settings/SettingsView';
import CalendarPanel from '../CalendarPanel';

export function UserDropdown() {
    const { view } = useDropdown();

    return (
        <div className="user-dropdown">
            <GlobalSearchBar />

            {view === 'links' && <LinksView />}

            {view === 'settings' && <SettingsView />}

            {view === 'calendar' && <CalendarPanel />}

            {view === 'artists' && (
                <PanelPlaceholder
                    title="Artists"
                    note="A–Z directory with filter pills (Starred / Notes / Mutuals / Following / Followers / Cooldown / Active) lands in its own dedicated round."
                />
            )}

            {view === 'portfolio' && (
                <PanelPlaceholder
                    title="Portfolio"
                    note="Main / Shadow tabs and the long-form per-collection tree land in their own dedicated round."
                />
            )}
        </div>
    );
}
