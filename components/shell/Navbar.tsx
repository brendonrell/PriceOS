/*
 * Navbar — Launch Cut, stripped to wallet-era surface.
 *
 * Slots (left → right):
 *   1. PeteyLogo       — left side, PD wordmark, click rotates and
 *                        opens the home/$PRICE bubble.
 *   2. UserMenuButtons — right side. Wraps the .user-menu-wrapper
 *                        cluster (cart, .btn-user Connect/address pill,
 *                        DropdownStack). Wallet-wired: btn-user opens
 *                        the RainbowKit modal when disconnected and
 *                        toggles the menu when authenticated.
 *
 * Build #11 (Launch Cut wallet + Top Bar strip) — TopBarRow + Ticker
 * un-mounted from the launch surface. Sim chrome they owned (calendar
 * row, incognito pill, hammer pill, RPC ping, grail pills, Bloomberg
 * tape) is post-launch and lives outside the launch-cut scope. The
 * components themselves stay on disk so a future build can re-mount
 * them without re-implementing.
 *
 * Stripped from this Navbar:
 *   - <TopBarRow />   (calendar / incognito / hammer / RPC / grails)
 *   - <Ticker />      (Bloomberg-style scrolling tape mid-navbar)
 *
 * Kept:
 *   - <PeteyLogo />        (PD wordmark — core identity)
 *   - <UserMenuButtons />  (cart + Connect + dropdown stack)
 */

import { PeteyLogo } from './PeteyLogo';
import { UserMenuButtons } from './UserMenuButtons';

export function Navbar() {
    return (
        <nav className="navbar">
            <PeteyLogo />
            <UserMenuButtons />
        </nav>
    );
}
