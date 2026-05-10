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
 *   - Connect button    (.btn-user — three wallet states, see below)
 *   - DropdownStack     (renders below .user-menu-wrapper)
 *
 * Click flow:
 *   - Wrapper carries .active when menu open (CSS reveals sprite/badge
 *     and the dropdown stack)
 *   - Click outside menu OR Esc → DropdownContext effect closes it
 *
 * Connect button — three wallet states:
 *   1. Disconnected  → icon-only ⟠. Click opens the RainbowKit modal
 *                      via useConnectModal().openConnectModal(). User-text
 *                      reads "Connect" but CSS hides it when not .expanded.
 *   2. Authenticating → icon-only ⟠. Click is a no-op — the wallet's own
 *                       sign-prompt is already on screen and clicking
 *                       again would be confusing.
 *   3. Authenticated → expanded address pill (sim's 0xf7c0…3690 format).
 *                      Click toggles the dropdown menu open/closed.
 *                      .expanded stays on permanently while signed in so
 *                      the address pill is always visible as the user's
 *                      identity marker.
 *
 * Modal openers (Build 5):
 *   - Cart button → CartContext.openPanel(). .has-items toggles via
 *     items.length > 0 (sim 11748–11754). Count badge: N up to 99, "99+".
 *   - PriceSprite + level badge → ModalContext.open('priceSprite').
 *     Both wrap their click in stopPropagation so the menu doesn't
 *     toggle out from under the modal (sim 4449, 4452).
 *
 * Sprite engine wiring:
 *   - getSpriteFrame() seeds initial face/transform/sleeping state.
 *   - subscribeSprite() re-renders on blink / turn / yawn / sleep frames.
 *   - wakeSprite() fires on menu open so the user sees an awake face
 *     instead of catching the sprite mid-yawn (sim 12213-12219).
 */

import { useEffect, useState } from 'react';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useModal } from '../../lib/state/ModalContext';
import { useCart } from '../../lib/state/CartContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useConnectModal } from '@rainbow-me/rainbowkit';
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
    const { menuOpen, toggleMenu, closeMenu } = useDropdown();
    const { open: openModal } = useModal();
    const { items, openPanel: openCartPanel } = useCart();
    const { siweAddress, isAuthenticating } = useAuth();
    const { openConnectModal } = useConnectModal();

    /* Mirror priceSpriteEngine state into local component state so
       React re-renders on every blink / turn / yawn / sleep frame.
       Sim mutates DOM directly inside render() (sim 12114-12143);
       React port hooks the same engine via subscribeSprite(). */
    const [frame, setFrame] = useState<SpriteFrame>(() => getSpriteFrame());
    useEffect(() => {
        setFrame(getSpriteFrame());
        const unsubscribe = subscribeSprite(() => {
            setFrame(getSpriteFrame());
        });
        return unsubscribe;
    }, []);

    /* Sim 12213-12219 — when the user opens the connect menu, snap a
       sleeping/yawning sprite awake so the user sees an awake face on
       open. resetIdleTimer also fires for an already-awake sprite. */
    useEffect(() => {
        if (menuOpen) wakeSprite();
    }, [menuOpen]);

    const isAuthed = !!siweAddress;

    /* Wrapper carries .active when menu open (CSS reveals sprite +
       badge + dropdown stack). */
    const wrapperClass = `nav-controls user-menu-wrapper${menuOpen ? ' active' : ''}`;

    /* .expanded always-on when authenticated (address pill stays
       visible as the user's identity marker even when the menu is
       closed). Falls back to icon-only when disconnected /
       authenticating. */
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
            return;
        }
        // `openConnectModal` is undefined while RainbowKit is
        // initialising; guard with `?.()`.
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

            {/* PriceSprite — hidden by CSS until .active. Click opens
                the PriceSprite modal (sim 4449). */}
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
                    {frame.face}
                </span>
            </div>

            {/* Level badge — hidden by CSS until .active. Click also
                opens the PriceSprite modal (sim 4452). */}
            <span
                className="ascii-pfp-badge"
                id="asciiPfpBadge"
                aria-label="Level 42"
                title="Level 42"
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                    e.stopPropagation();
                    openModal('priceSprite');
                }}
            >
                ❹❷
            </span>

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
