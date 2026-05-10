'use client';

/*
 * UserMenuButtons — Launch Cut wallet wiring.
 *
 * The right-side cluster of the navbar PLUS the dropdown stack itself
 * (the stack lives inside .user-menu-wrapper because it positions
 * absolutely relative to it).
 *
 * Build #11 strip:
 *   - PriceSprite + ❹❷ level badge un-mounted (post-launch level/
 *     familiar mechanic, not in launch cut surface set). The
 *     priceSpriteEngine + ModalContext('priceSprite') stay on disk
 *     for future re-mount; this component just stops rendering them.
 *
 * Build #11 wallet wiring — three .btn-user states:
 *
 *   1. Disconnected  (no wallet paired, no SIWE session)
 *      ↳ button renders collapsed (icon-only ⟠), `.expanded` off.
 *      ↳ click → useConnectModal().openConnectModal()
 *        Opens RainbowKit's connect modal. RainbowKit then runs the
 *        full connect → SIWE-sign → verify cycle inside that single
 *        modal session, no further user clicks beyond the wallet's
 *        own approval sheets. The auth adapter (wired in
 *        WalletProviders) fires `onAuthenticated(address)` on
 *        verify-success, which flips InnerProviders' siweAddress +
 *        status; AuthContext propagates that to this button and the
 *        button transitions to state 3.
 *
 *   2. Authenticating  (wallet paired, SIWE in flight)
 *      ↳ button renders collapsed icon-only — same shape as state 1
 *        because the user just saw the connect modal close and a
 *        wallet sign-prompt appear. Showing the address pill mid-flight
 *        would be a lie (server hasn't verified yet). Click is a no-op
 *        during this transient state.
 *
 *   3. Authenticated  (SIWE session cookie set)
 *      ↳ button renders expanded with truncated address pill
 *        (`0xf7c0…3690`, sim's 5383 format used in OutputMeta.ownerDisplay).
 *      ↳ click → toggleMenu() (existing dropdown behavior)
 *
 * Address truncation matches OutputPreview.shortAddr — same `0x` head
 * + `\u2026` (…) ellipsis + last 4. Inlined locally because lifting
 * to a shared util is scope creep for one tiny helper.
 *
 * Cart button — unchanged. Cart can have items even when wallet isn't
 * connected (browse + queue purchases, sign in to BUY). `.has-items`
 * still gates display via globals.css; cartCount badge still uses the
 * `99+` overflow rule.
 *
 * The .expanded class is always-on when authenticated. Sim only
 * applies it on menu-open (so the button collapses again when menu
 * closes). For wallet-era PD the address pill is the user's identity
 * marker — it stays expanded permanently while signed in, then
 * collapses to icon-only after sign-out.
 */

import { useDropdown } from '../../lib/state/DropdownContext';
import { useCart } from '../../lib/state/CartContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { DropdownStack } from '../dropdown/DropdownStack';

/* Inline mirror of OutputPreview.shortAddr. Kept local rather than
   shared because the truncation pattern is one line and lifting it
   would touch OutputPreview unnecessarily. */
function shortAddr(addr: string): string {
    if (!addr.startsWith('0x') || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

export function UserMenuButtons() {
    const { menuOpen, toggleMenu, closeMenu } = useDropdown();
    const { items, openPanel: openCartPanel } = useCart();
    const { siweAddress, isAuthenticating } = useAuth();
    const { openConnectModal } = useConnectModal();

    const isAuthed = !!siweAddress;

    /* Wrapper carries .active when menu is open (CSS reveals dropdown
       stack). The cart + sprite + badge sibling reveals are no longer
       relevant since sprite/badge are stripped, but .active still
       drives the .dropdown-stack visibility transition. */
    const wrapperClass = `nav-controls user-menu-wrapper${menuOpen ? ' active' : ''}`;

    /* .expanded always on when authenticated (address pill visible).
       Falls back to menu-open expansion only when authed AND closed —
       same end result, but explicit. When disconnected/authenticating,
       button stays collapsed (icon-only). */
    const buttonClass = `btn-user${isAuthed ? ' expanded' : ''}`;

    const cartCount = items.length;
    const cartBtnClass = `btn-cart${cartCount > 0 ? ' has-items' : ''}`;
    const cartBadgeText = cartCount > 99 ? '99+' : String(cartCount);

    /* Three-state click handler. Disconnected → open RainbowKit modal.
       Authenticating → no-op (transient state; wallet's own sign-prompt
       is already visible). Authenticated → toggle dropdown menu. */
    const handleConnectClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAuthed) {
            toggleMenu();
            return;
        }
        if (isAuthenticating) {
            // Wallet sign-prompt is up; clicking again would be confusing.
            return;
        }
        // Disconnected — open RainbowKit modal. `openConnectModal` is
        // undefined while RainbowKit is initialising; guard with `?.()`.
        openConnectModal?.();
    };

    /* If the menu is open and the user signs out from inside it, the
       siweAddress drops to null. The wrapper would stay .active until
       the next interaction. Close on auth flip-to-null so the dropdown
       collapses immediately. */
    if (!isAuthed && menuOpen) {
        // Defer: setState during render is illegal. closeMenu is stable
        // via useCallback, but invoking it inline still triggers a
        // warning. queueMicrotask defers without the useEffect overhead.
        queueMicrotask(() => closeMenu());
    }

    /* Address pill text. shortAddr handles the truncation; sim 5383
       format is `0xf7c0…3690` which matches our `0x` + 4 + … + 4 = 11
       chars, comfortably under .btn-user.expanded's 150px max-width. */
    const pillText = siweAddress ? shortAddr(siweAddress) : 'Connect';

    return (
        <div className={wrapperClass}>
            {/* Cart — hidden by default; .has-items toggles it on. Click
                opens the slide-up CartPanel via its own context. */}
            <button
                className={cartBtnClass}
                id="btnCart"
                aria-label="Cart"
                title="Cart"
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    openCartPanel();
                }}
            >
                <span className="cart-count-badge" id="cartCountBadge">
                    {cartBadgeText}
                </span>
            </button>

            {/* Connect button — three states (see top-of-file comment). */}
            <button
                className={buttonClass}
                id="btnUser"
                aria-label={isAuthed ? 'Toggle User Menu' : 'Connect Wallet'}
                aria-expanded={isAuthed ? menuOpen : undefined}
                title={isAuthed ? 'Toggle User Menu' : 'Connect Wallet'}
                type="button"
                onClick={handleConnectClick}
            >
                <span className="user-icon" aria-hidden="true">
                    {'⟠\uFE0E'}
                </span>
                <span className="user-text">{pillText}</span>
            </button>

            <DropdownStack />
        </div>
    );
}
