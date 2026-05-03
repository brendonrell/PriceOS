/*
 * Navbar — Launch Cut (stripped)
 *
 * Slots in the stripped launch-cut variant:
 *   1. PeteyLogo — left side, PD wordmark, click rotates and opens
 *      the home/$PRICE bubble.
 *   2. TopBarConnect — right side, RainbowKit-backed wallet connect
 *      button. Three states (CONNECT / WRONG NETWORK / address pill).
 *
 * Everything else from the previous Navbar (Ticker, cart, sprite,
 * level badge, dropdown stack) is deferred. Those components remain
 * in the codebase but are not mounted in the launch-cut chrome.
 * They land back in once the launch is open and the surfaces below
 * the fold are shipping (calendar pill, search, dropdown, etc).
 *
 * .navbar's flex layout (justify-content: space-between) handles
 * the left/right split. .nav-controls preserves the right-side
 * cluster styling hooks (gap, pointer-events, hover-fade behaviour
 * from sim line 90 + 897) so this slot reads as the same family of
 * chrome as the eventual full Top Bar.
 */

import { PeteyLogo } from './PeteyLogo';
import { TopBarConnect } from '../chrome/TopBarConnect';

export function Navbar() {
    return (
        <nav className="navbar">
            <PeteyLogo />
            <div className="nav-controls">
                <TopBarConnect />
            </div>
        </nav>
    );
}
