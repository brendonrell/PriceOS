'use client';

/*
 * UserDropdown
 *
 * The main panel inside the dropdown stack — the inverted-palette box
 * that hosts the Global Search bar at top and one of five views below:
 *
 *   - links     — Profile / Discord / Artists / Portfolio / Settings / Log Out
 *   - calendar  — month grid + day column (placeholder in step 3)
 *   - settings  — wallet / themes / sort / pings / spell book (placeholder)
 *   - artists   — directory (placeholder)
 *   - portfolio — main / shadow / tree (placeholder)
 *
 * The view is read from DropdownContext. Search bar stays mounted
 * across view swaps so the input keeps focus through state changes.
 *
 * Hidden when one of the panel views is active: the four accordion
 * boxes below (Tape/Pings/Todos/Notes). This is handled in DropdownStack
 * via the same view check.
 */

import { useDropdown } from '../../lib/state/DropdownContext';
import { GlobalSearchBar } from './GlobalSearchBar';
import { LinksView } from './LinksView';
import { PanelPlaceholder } from './PanelPlaceholder';

export function UserDropdown() {
    const { view } = useDropdown();

    return (
        <div className="user-dropdown">
            <GlobalSearchBar />

            {view === 'links' && <LinksView />}

            {view === 'calendar' && (
                <PanelPlaceholder
                    title="Calendar"
                    note="Month grid + day column with events / to-dos lands in Step 4."
                />
            )}

            {view === 'settings' && (
                <PanelPlaceholder
                    title="Settings"
                    note="Wallet, themes, default sort, MY PINGS, Spell Book, and the workspace switcher all land in Step 4."
                />
            )}

            {view === 'artists' && (
                <PanelPlaceholder
                    title="Artists"
                    note="A–Z directory with filter pills (Starred / Notes / Mutuals / Following / Followers / Cooldown / Active) lands in Step 4."
                />
            )}

            {view === 'portfolio' && (
                <PanelPlaceholder
                    title="Portfolio"
                    note="Main / Shadow tabs and the long-form per-collection tree land in Step 4."
                />
            )}
        </div>
    );
}
