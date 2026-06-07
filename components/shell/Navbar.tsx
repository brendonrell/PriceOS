/*
 * Navbar
 *
 * Slots (left → right inside .navbar, with .top-bar above):
 *   1. TopBarRow        — .top-bar wrapper. Sim's calendar row +
 *                         grail/incognito/hammer/RPC row in one element.
 *                         Owns id="topBar" so we never duplicate it from
 *                         child components.
 *   2. PeteyLogo        — PD wordmark, click rotates and opens the
 *                         home/$PRICE bubble.
 *   3. Ticker           — Bloomberg-style scrolling tape mid-navbar.
 *                         Sim ref L4431-4433: third child between
 *                         .pd-logo-wrap and .nav-controls.
 *   4. UserMenuButtons  — right side. Wraps the .user-menu-wrapper
 *                         cluster (cart, PriceSprite, ❹❷ level badge,
 *                         .btn-user Connect/address pill) plus the
 *                         DropdownStack beneath. Wallet-wired: btn-user
 *                         opens the RainbowKit modal when disconnected,
 *                         toggles the menu when authenticated.
 */

import { PeteyLogo } from './PeteyLogo';
import { Ticker } from './Ticker';
import { TopBarRow } from './TopBarRow';
import { UserMenuButtons } from './UserMenuButtons';

export function Navbar() {
    return (
        <nav className="navbar">
            <TopBarRow />
            <PeteyLogo />
            <Ticker />
            <UserMenuButtons />
        </nav>
    );
}
