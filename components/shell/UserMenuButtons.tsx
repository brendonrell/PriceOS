'use client';

/*
 * UserMenuButtons
 *
 * The right-side cluster of the navbar PLUS the dropdown stack itself
 * (the stack lives inside .user-menu-wrapper because it positions
 * absolutely relative to it).
 *
 * Children left → right:
 *   - Cart button       (.btn-cart, hidden by CSS until .has-items)
 *   - PriceSprite       (.ascii-sprite-wrap, hidden by CSS until .active)
 *   - Level badge       (.ascii-pfp-badge ❹❷, hidden by CSS until .active)
 *   - Connect button    (.btn-user — two display states, see below)
 *   - DropdownStack     (renders below .user-menu-wrapper)
 *
 * Click flow:
 *   - Wrapper carries .active when menu open (CSS reveals sprite/badge
 *     and the dropdown stack)
 *   - Click outside menu OR Esc → DropdownContext effect closes it
 *
 * Connect button — click behavior depends on auth state and menu state:
 *
 *   Closed (any auth state)   → icon-only (sim 6700-6708). Click
 *                               opens the menu.
 *   Open + authed             → .expanded shows ENS/shortAddr. Click
 *                               toggles the menu shut.
 *   Open + disconnected       → .expanded shows "Connect" text.
 *                               Click fires openConnectModal — the
 *                               pre-S2 wallet-launch path. PR1
 *                               accidentally made this a pure menu-
 *                               toggler; PR1.2 restores the launch
 *                               wiring. The bottom Connect Wallet
 *                               CTA inside LinksView is the same
 *                               flow; two entry points, both fire
 *                               openConnectModal.
 *   Authenticating            → click is a no-op — the wallet's own
 *                               sign-prompt is already on screen.
 *
 * User-text priority (top → bottom):
 *   1. @handle   — claimed PD handle for the SIWE-auth'd address.
 *                  Sourced from useAuth().handle, which derives from
 *                  the user-row fetch InnerProviders runs on every
 *                  siweAddress change. Renders with a leading '@' to
 *                  match the rest of PD's nomenclature (profile URL is
 *                  /{handle}, mention chips render @handle, etc.).
 *                  Wired live in Real User Accounts v0; AccountCreateModal
 *                  gates SIWE-authed users from reaching this surface
 *                  without a handle.
 *   2. ENS name  — wagmi's useEnsName lookup against the connected
 *                  address on chainId 1. Async; renders as the
 *                  truncated address while resolving, then swaps to
 *                  the ENS string when the lookup returns. Falls
 *                  through to here when handle is null (legacy rows
 *                  with handle=null, or the brief post-SIWE window
 *                  before the user-row GET resolves).
 *   3. shortAddr — 0xf7c0…3690 fallback when no ENS is set or the
 *                  lookup is in flight / returned null.
 *   4. "Connect" — disconnected fallback. Renders inside the open
 *                  menu only — top-bar pill stays icon-only when
 *                  closed regardless of auth.
 *
 * Modal openers:
 *   - Cart button → CartContext.openPanel(). .has-items toggles via
 *     items.length > 0. Count badge: N up to 99, "99+".
 *   - PriceSprite + level badge → ModalContext.open('priceSprite').
 *     Both wrap their click in stopPropagation so the menu doesn't
 *     toggle out from under the modal.
 *
 * Sprite engine wiring:
 *   - getSpriteFrame() seeds initial face/transform/sleeping state.
 *   - subscribeSprite() re-renders on blink / turn / yawn / sleep frames.
 *   - wakeSprite() fires on menu open so the user sees an awake face
 *     instead of catching the sprite mid-yawn.
 *
 * NOTE — auto-close-on-disconnect removed (S2). The dropdown has a
 * dedicated logged-out shape (Profile + Portfolio gated, Log Out
 * replaced with Connect Wallet CTA), so the menu can stay open
 * through an auth flip in either direction without ejecting the user.
 */

import { useEffect, useState } from 'react';
import { useEnsName } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useModal } from '../../lib/state/ModalContext';
import { useCart } from '../../lib/state/CartContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { DropdownStack } from '../dropdown/DropdownStack';
import {
    getSpriteFrame,
    subscribeSprite,
    wakeSprite,
    type SpriteFrame,
} from '../../lib/engines/priceSpriteEngine';

/* Inline mirror of OutputPreview.shortAddr. Kept local rather than
   shared because the truncation pattern is one line and lifting it
   would touch OutputPreview unnecessarily. */
function shortAddr(addr: string): string {
    if (!addr.startsWith('0x') || addr.length < 10) return addr;
    return `${addr.slice(0, 6)}\u2026${addr.slice(-4)}`;
}

export function UserMenuButtons() {
    const { menuOpen, toggleMenu } = useDropdown();
    const { open: openModal } = useModal();
    const { items, openPanel: openCartPanel } = useCart();
    const { siweAddress, handle, accountLevel, isAuthenticating } = useAuth();
    const { openConnectModal } = useConnectModal();
    const { showToast } = useToast();

    /* ENS resolution. wagmi's useEnsName hits mainnet (chainId 1
       pinned — ENS lives on mainnet regardless of which chain a user
       is connected to). The hook is enabled only when we have an
       address; otherwise it short-circuits to undefined and the
       pillText fallback chain handles it. Cache lives in react-query
       so re-renders don't re-fetch. */
    const { data: ensName } = useEnsName({
        address: siweAddress ? (siweAddress as `0x${string}`) : undefined,
        chainId: 1,
        query: { enabled: !!siweAddress },
    });

    /* Mirror priceSpriteEngine state into local component state so
       React re-renders on every blink / turn / yawn / sleep frame.
       Sim mutates DOM directly inside render(); React port hooks the
       same engine via subscribeSprite(). */
    const [frame, setFrame] = useState<SpriteFrame>(() => getSpriteFrame());
    useEffect(() => {
        setFrame(getSpriteFrame());
        const unsubscribe = subscribeSprite(() => {
            setFrame(getSpriteFrame());
        });
        return unsubscribe;
    }, []);

    /* When the user opens the connect menu, snap a sleeping/yawning
       sprite awake so the user sees an awake face on open.
       resetIdleTimer also fires for an already-awake sprite. */
    useEffect(() => {
        if (menuOpen) wakeSprite();
    }, [menuOpen]);

    const isAuthed = !!siweAddress;

    /* Wrapper carries .active when menu open (CSS reveals sprite +
       badge + dropdown stack). */
    const wrapperClass = `nav-controls user-menu-wrapper${menuOpen ? ' active' : ''}`;

    /* .expanded shows the .user-text. Tracks menuOpen ONLY — sim
       6700-6708 toggles .expanded in lockstep with .active (menu open
       state) regardless of auth. So both logged-in and logged-out
       states render icon-only when the menu is closed; the user-text
       (ENS / shortAddr / "Connect" fallback) only fades in once the
       menu opens. */
    const buttonClass = `btn-user${menuOpen ? ' expanded' : ''}`;

    const cartCount = items.length;
    const cartBtnClass = `btn-cart${cartCount > 0 ? ' has-items' : ''}`;
    const cartBadgeText = cartCount > 99 ? '99+' : String(cartCount);

    /* Click handler — dual path based on auth + menu state.
       - Disconnected + menu open: pill shows "Connect" text. Click
         fires openConnectModal (the pre-S2 wallet-launch path
         Brendon flagged as broken after PR1).
       - All other cases: toggle menu. Authed-state-with-menu-open
         still uses the pill as the close affordance.
       - isAuthenticating window stays a no-op (wallet's own
         sign-prompt is already on screen). */
    const handleConnectClick = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (isAuthenticating) return;
        if (!isAuthed && menuOpen) {
            if (!openConnectModal) {
                showToast('Wallet not ready — refresh and try again');
                return;
            }
            openConnectModal();
            return;
        }
        toggleMenu();
    };

    /* User-text priority chain — see top-of-file comment block.
       @handle wins when claimed (Real User Accounts v0); falls back
       through ENS → shortAddr → "Connect" otherwise. The leading '@'
       is rendered inline to match the rest of PD's @-prefixed
       nomenclature (profile URL slugs, mention chips, etc.). */
    const pillText = handle
        ? `@${handle}`
        : ensName ?? (siweAddress ? shortAddr(siweAddress) : 'Connect');

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

            {/* PriceSprite + level badge — both gated on identity.
                frame.hasIdentity flips true once the AuthContext-side
                effect calls setMainSpriteIdentity() with the SIWE'd
                wallet + the user's claimed price_sprite. Pre-claim
                wallets (SIWE'd but no @name yet) and logged-out
                visitors get neither — the engine has no identity to
                render and no level to label. */}
            {frame.hasIdentity && (
                <>
                    <div
                        className="ascii-sprite-wrap"
                        id="asciiSpriteWrap"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            openModal('priceSprite');
                        }}
                    >
                        <span
                            className={`ascii-sprite${frame.sleeping ? ' sleeping' : ''}`}
                            id="asciiSprite"
                            style={{ transform: frame.transform, display: 'inline-block' }}
                        >
                            {frame.parts ? (
                                <>
                                    {frame.parts.crown && (
                                        <span className="ascii-sprite-slot ascii-sprite-slot-crown">{frame.parts.crown}</span>
                                    )}
                                    <span className="ascii-sprite-slot ascii-sprite-slot-armL">{frame.parts.armL}</span>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-bracketL">{frame.parts.bracketL}</span>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-eyeL">{frame.parts.eyeL}</span>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-mouth">{frame.parts.mouth}</span>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-eyeR">{frame.parts.eyeR}</span>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-bracketR">{frame.parts.bracketR}</span>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-armR">{frame.parts.armR}</span>
                                </>
                            ) : (
                                frame.face
                            )}
                        </span>
                    </div>

                    <span
                        className="ascii-pfp-badge"
                        id="asciiPfpBadge"
                        aria-label={`Level ${accountLevel}`}
                        title={`Level ${accountLevel}`}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            openModal('priceSprite');
                        }}
                    >
                        {accountLevel === 0 ? '\u24FF' : '\u2776'}
                    </span>
                </>
            )}

            {/* Connect button — toggles menu in all auth states. */}
            <button
                className={buttonClass}
                id="btnUser"
                aria-label={isAuthed ? 'Toggle User Menu' : 'Open Menu'}
                aria-expanded={menuOpen}
                title={isAuthed ? 'Toggle User Menu' : 'Open Menu'}
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
