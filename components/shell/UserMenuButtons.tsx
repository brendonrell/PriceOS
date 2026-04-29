'use client';

/*
 * UserMenuButtons
 *
 * The right-side cluster of the navbar:
 *   1. Cart button — square dot-on-bg chrome, default hidden, only
 *      shows when cart has items. Step 2 keeps it hidden (no cart
 *      state yet).
 *   2. PriceSprite — animated ASCII face. Step 2 ships a static
 *      sprite; the blink/turn/yawn/sleep animation is a Step 4+
 *      concern.
 *   3. Level badge (❹❷) — composed dingbat, opens PriceSprite modal
 *      when clicked. Step 2 has no click handler.
 *   4. Connect button — the @brendon pill. Default collapsed (just
 *      the wallet glyph showing); expands on hover to reveal the
 *      handle. Click eventually toggles the Connect Menu dropdown
 *      below it (Step 3).
 *
 * No interactivity in Step 2 — these render as static visual chrome.
 * Click handlers and the dropdown stack land in Step 3. Hover
 * expansion of the connect button is CSS-only and works already.
 */

import { useState } from 'react';

export function UserMenuButtons() {
    // Hover state drives the connect button's collapsed → expanded
    // transition. Could also be a pure CSS :hover, but keeping it as
    // React state lets Step 3 reuse the same .expanded class for the
    // "menu open" state without changing the markup.
    const [hovered, setHovered] = useState(false);

    return (
        <div className="nav-controls user-menu-wrapper">
            {/* Cart — hidden by default; .has-items toggle reveals it.
                Step 2 keeps the markup so step-3 can wire visibility
                without re-adding the element. */}
            <button
                className="btn-cart"
                id="btnCart"
                aria-label="Cart"
                title="Cart"
                type="button"
            >
                <span className="cart-count-badge" id="cartCountBadge">0</span>
            </button>

            {/* PriceSprite — static for now. Animation lands in Step 4+. */}
            <div className="ascii-sprite-wrap" id="asciiSpriteWrap">
                <span className="ascii-sprite" id="asciiSprite">(ง •̀_•́)ง</span>
            </div>

            {/* Level badge — composed multi-circle dingbat. Hidden by
                default in the sim until the sprite identity is computed;
                step 2 ships it visible to match the screenshot mockup. */}
            <span
                className="ascii-pfp-badge"
                id="asciiPfpBadge"
                aria-label="Level 42"
                title="Level 42"
            >
                ❹❷
            </span>

            {/* Connect button — collapsed default, expands on hover */}
            <button
                className={`btn-user${hovered ? ' expanded' : ''}`}
                id="btnUser"
                aria-label="Toggle User Menu"
                title="Toggle User Menu"
                type="button"
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
            >
                <span className="user-icon" aria-hidden="true">
                    {'⟠\uFE0E'}
                </span>
                <span className="user-text">@brendon</span>
            </button>
        </div>
    );
}
