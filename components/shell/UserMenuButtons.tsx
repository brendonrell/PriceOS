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
 * The cart, sprite, and badge clicks open various modals — those
 * handlers wire up in step 7 with the modal stack. For now they're
 * inert chrome.
 */

import { useDropdown } from '../../lib/state/DropdownContext';
import { DropdownStack } from '../dropdown/DropdownStack';

export function UserMenuButtons() {
    const { menuOpen, toggleMenu } = useDropdown();
    const wrapperClass = `nav-controls user-menu-wrapper${menuOpen ? ' active' : ''}`;
    const buttonClass = `btn-user${menuOpen ? ' expanded' : ''}`;

    return (
        <div className={wrapperClass}>
            {/* Cart — hidden by default; .has-items toggles it on. */}
            <button
                className="btn-cart"
                id="btnCart"
                aria-label="Cart"
                title="Cart"
                type="button"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="cart-count-badge" id="cartCountBadge">
                    0
                </span>
            </button>

            {/* PriceSprite — hidden by CSS until .active. */}
            <div
                className="ascii-sprite-wrap"
                id="asciiSpriteWrap"
                onClick={(e) => e.stopPropagation()}
            >
                <span className="ascii-sprite" id="asciiSprite">
                    (ง •̀_•́)ง
                </span>
            </div>

            {/* Level badge — hidden by CSS until .active. */}
            <span
                className="ascii-pfp-badge"
                id="asciiPfpBadge"
                aria-label="Level 42"
                title="Level 42"
                onClick={(e) => e.stopPropagation()}
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
