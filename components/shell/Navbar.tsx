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
 * Ticker remains deferred — lands back in once the launch is open and
 * the surfaces below the fold ship.
 */

import { PeteyLogo } from './PeteyLogo';
import { TopBarCalendar } from './TopBarCalendar';
import { UserMenuButtons } from './UserMenuButtons';

export function Navbar() {
    return (
        <nav className="navbar">
            <TopBarCalendar />
            <PeteyLogo />
            <UserMenuButtons />
        </nav>
    );
}
