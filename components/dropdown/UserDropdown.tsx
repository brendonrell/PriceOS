'use client';

/*
 * UserDropdown — Launch Cut surface.
 *
 * Top of the dropdown stack. Hosts the Global Search bar and the
 * default LinksView panel below it.
 *
 * Build #11 strip — the four secondary views that used to swap into
 * this slot via clicks inside LinksView are un-mounted:
 *
 *   - SettingsView   (full Settings panel — wallet/MY PD/themes/sort/
 *                     pings/spell-book/workspace; post-launch)
 *   - ArtistsView    (Artists A-Z directory — post-launch)
 *   - PortfolioView  (Portfolios panel — post-launch)
 *   - CalendarPanel  (month grid + day column — post-launch)
 *
 * LinksView's nav entries that pointed to those views (Artists /
 * Portfolio / Settings) are also stripped — see LinksView.tsx. With
 * the entries gone there's no way to set view !== 'links' from the
 * UI, so this component renders LinksView unconditionally.
 *
 * GlobalSearchBar is kept — search is core launch surface (browse
 * projects + outputs by id, address, handle).
 *
 * The DropdownContext still owns `view` state — we just stop reading
 * it. Components on disk that mutate `view` (none currently mounted
 * in launch surface) continue to work; the view value just doesn't
 * drive any rendering until those components remount.
 */

import { GlobalSearchBar } from './GlobalSearchBar';
import { LinksView } from './LinksView';

export function UserDropdown() {
    return (
        <div className="user-dropdown">
            <GlobalSearchBar />
            <LinksView />
        </div>
    );
}
