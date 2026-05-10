'use client';

/*
 * DropdownStack — Launch Cut surface.
 *
 * The vertical column that drops down beneath the connect button when
 * the menu is open. Stripped to one mount for launch:
 *
 *   1. UserDropdown — the main inverted-palette panel (LinksView only)
 *
 * Build #11 strip — the four accordion boxes that previously rendered
 * below the user-dropdown on the `links` and `calendar` views are
 * un-mounted from the launch surface:
 *
 *   - TapeBox   (Bloomberg-style scrolling Menu Tape — post-launch)
 *   - PingsBox  (price-alert / ping accordion — post-launch)
 *   - TodosBox  (calendar to-do accordion — post-launch)
 *   - NotesBox  (per-day / per-artist note accordion — post-launch)
 *
 * Components stay on disk (lib/state contexts they depend on still
 * mount in the provider tree) so a future build can re-mount them
 * without re-implementing.
 *
 * The view switcher inside UserDropdown also collapses to a single
 * view (links) for launch — see UserDropdown.tsx. With only one view,
 * the showAccordions gate that conditioned on `view === 'links' ||
 * view === 'calendar'` becomes redundant. Removed entirely; the
 * accordions wouldn't render anyway because their JSX is gone.
 *
 * Visibility of the whole stack is still controlled by
 * .user-menu-wrapper.active via CSS — UserMenuButtons toggles that
 * class on menu-open, and the existing transition rules in
 * globals.css handle the drop animation.
 */

import { UserDropdown } from './UserDropdown';

export function DropdownStack() {
    return (
        <div className="dropdown-stack">
            <UserDropdown />
        </div>
    );
}
