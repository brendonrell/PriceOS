'use client';

/*
 * DropdownStack
 *
 * The vertical column that drops down beneath the connect button when
 * the menu is open. Contains:
 *   1. UserDropdown — the main inverted-palette panel
 *   2. TapeBox      — Menu Tape (only renders when menutape mode != OFF)
 *   3. PingsBox     — always present
 *   4. TodosBox     — always present
 *   5. NotesBox     — always present
 *
 * The accordion boxes (2-5) are hidden when the user-dropdown is on a
 * sub-panel view (settings/calendar/artists/portfolio) — that matches
 * the sim's behavior of giving sub-panels the full vertical space.
 *
 * Visibility of the whole stack is controlled by .user-menu-wrapper.active
 * via CSS — this component just renders the content unconditionally
 * and lets CSS handle the transition.
 */

import { useDropdown } from '../../lib/state/DropdownContext';
import { UserDropdown } from './UserDropdown';
import { TapeBox } from './TapeBox';
import { PingsBox } from './PingsBox';
import { TodosBox } from './TodosBox';
import { NotesBox } from './NotesBox';

export function DropdownStack() {
    const { view } = useDropdown();
    const showAccordions = view === 'links';

    return (
        <div className="dropdown-stack">
            <UserDropdown />
            {showAccordions && (
                <>
                    <TapeBox />
                    <PingsBox />
                    <TodosBox />
                    <NotesBox />
                </>
            )}
        </div>
    );
}
