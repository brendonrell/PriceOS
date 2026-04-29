/*
 * Navbar
 *
 * The sticky chrome at the top of every page. Three top-level slots:
 *   1. PeteyLogo — left side, rotates on click
 *   2. Ticker — flex-fills the middle (empty in Step 2, fills with
 *      live activity events when the indexer wires up later)
 *   3. UserMenuButtons — right side cluster (cart, sprite, badge,
 *      connect button)
 *
 * The Top Bar (grail pins, hammer pill, incognito, RPC ping) lives
 * inside the sim's navbar element above this row. Hidden in the
 * sim by default (style="display:none") and only revealed by feature
 * toggles. Step 2 omits it entirely — it'll land alongside the spell
 * toggles that summon it.
 */

import { PeteyLogo } from './PeteyLogo';
import { Ticker } from './Ticker';
import { UserMenuButtons } from './UserMenuButtons';

export function Navbar() {
    return (
        <nav className="navbar">
            <PeteyLogo />
            <Ticker />
            <UserMenuButtons />
        </nav>
    );
}
