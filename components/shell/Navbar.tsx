/*
 * Navbar — Launch Cut (sim-faithful)
 *
 * Slots:
 *   1. PeteyLogo       — left side, PD wordmark, click rotates and
 *                        opens the home/$PRICE bubble.
 *   2. UserMenuButtons — right side. Wraps the entire .user-menu-wrapper
 *                        cluster from sim (cart, sprite, level badge,
 *                        .btn-user @brendon button) plus DropdownStack
 *                        beneath it. The wrapper carries .active when
 *                        the menu is open, so cart/sprite/badge reveal
 *                        and the dropdown drops down.
 *
 * Why mount UserMenuButtons here directly instead of TopBarConnect:
 * sim.html has no wallet stack. The "wallet" surface is hardcoded
 * 0x1234...abcd in settings (sim line 4557). The right-side button
 * is .btn-user (sim line 4453–4456), not a CONNECT pill. The launch
 * cut reset ripped RainbowKit/wagmi/viem entirely; the dropdown port
 * (UserDropdown + LinksView + WalletView + accordions) is the real
 * surface and reconnects through this mount.
 *
 * Build 33 D22 — TopBarRow replaces the TopBarCalendar mount. Sim's
 * .top-bar element hosts BOTH the calendar row and the
 * grail/incognito/hammer/RPC row inside one wrapper; TopBarRow
 * renders that wrapper and the second row, with TopBarCalendar
 * embedded for the calendar row. Mounting the wrapper here keeps the
 * navbar flex-wrap behaviour identical and avoids duplicate id="topBar"
 * elements that would result from each component owning its own
 * .top-bar div.
 *
 * D001 — Ticker mounted between PeteyLogo and UserMenuButtons.
 * Sim ref L4431-4433: tape-wrap is third child of .navbar between
 * .pd-logo-wrap and .nav-controls. CSS already ports tape-wrap rules
 * at globals.css 1120-1178 verbatim.
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
