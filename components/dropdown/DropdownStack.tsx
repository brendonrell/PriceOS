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
 * The accordion boxes (2-5) stay visible on the default `links` view AND
 * on the `calendar` view — sim explicitly keeps Pings / To-Dos / Notes
 * below the calendar (sim.html line 6132–6133: "Pings / To-Dos / Notes
 * below stay visible"). They hide on `settings` / `artists` / `portfolio`
 * because those panels take the full vertical space.
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
    const showAccordions = view === 'links' || view === 'calendar';

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
