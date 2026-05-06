'use client';

/*
 * UserMenuButtons
 *
 * The right-side cluster of the navbar PLUS the dropdown stack itself
 * (which lives inside .user-menu-wrapper because it positions absolutely
 * relative to it).
 *
 * Click flow:
 *   - Connect button click → toggle menu open/closed via DropdownContext
 *   - Wrapper gets .active class when menu is open (CSS reveals sprite,
 *     badge, and the dropdown stack)
 *   - Connect button gets .expanded class so the @brendon text shows
 *   - Click outside menu → DropdownContext's effect closes it
 *   - Pressing Esc → DropdownContext's effect closes it
 *
 * Modal openers (Build 5):
 *   - Cart button (leftmost) → CartContext.openPanel(). The btn-cart
 *     gets .has-items when items.length > 0 (sim 11748–11754) — the CSS
 *     hides the button entirely when empty per Brendon's "regular
 *     ecommerce, not whale trading desk" framing. Count badge shows N
 *     up to 99, then "99+".
 *   - PriceSprite + ❹❷ badge → ModalContext.open('priceSprite'). Both
 *     wrap their click in stopPropagation so the menu doesn't toggle
 *     out from under the modal (sim 4449, 4452).
 *
 * Familiar modal opener lives in SpellBookSection (its pill click
 * routes through ModalContext.open('familiar')) — sim opens it from
 * clicking the actual floating familiar sprite, but the floating
 * sprite isn't ported yet, so Build 5 routes the entry point through
 * the Spell Book pill.
 */

import { useEffect, useState } from 'react';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useModal } from '../../lib/state/ModalContext';
import { useCart } from '../../lib/state/CartContext';
import { DropdownStack } from '../dropdown/DropdownStack';
import {
    getSpriteFrame,
    subscribeSprite,
    wakeSprite,
    type SpriteFrame,
} from '../../lib/engines/priceSpriteEngine';

export function UserMenuButtons() {
    const { menuOpen, toggleMenu } = useDropdown();
    const { open: openModal } = useModal();
    const { items, openPanel: openCartPanel } = useCart();

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

    const wrapperClass = `nav-controls user-menu-wrapper${menuOpen ? ' active' : ''}`;
    const buttonClass = `btn-user${menuOpen ? ' expanded' : ''}`;

    const cartCount = items.length;
    const cartBtnClass = `btn-cart${cartCount > 0 ? ' has-items' : ''}`;
    const cartBadgeText = cartCount > 99 ? '99+' : String(cartCount);

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

            {/* PriceSprite — hidden by CSS until .active. Click opens the
                PriceSprite modal (sim 4449). */}
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

            {/* Level badge — hidden by CSS until .active. Click also opens
                the PriceSprite modal (sim 4452). */}
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

            {/* Connect button — toggles the menu. */}
            <button
                className={buttonClass}
                id="btnUser"
                aria-label="Toggle User Menu"
                aria-expanded={menuOpen}
                title="Toggle User Menu"
                type="button"
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    toggleMenu();
                }}
            >
                <span className="user-icon" aria-hidden="true">
                    {'⟠\uFE0E'}
                </span>
                <span className="user-text">@brendon</span>
            </button>

            <DropdownStack />
        </div>
    );
}
