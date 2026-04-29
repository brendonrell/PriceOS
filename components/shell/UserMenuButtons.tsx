'use client';

/*
 * UserMenuButtons
 *
 * The right-side cluster of the navbar. In step 2 we ship just the
 * collapsed connect button — the sprite + badge are hidden by default
 * in CSS and only reveal when the Connect Menu opens (step 3).
 *
 * No click handler in step 2 — the button does nothing yet. Step 3
 * adds the open/close behaviour together with the dropdown contents
 * so the whole "click the button → menu opens with sprite + handle
 * + dropdown" flow lands in one coherent piece.
 */
export function UserMenuButtons() {
    return (
        <div className="nav-controls user-menu-wrapper">
            {/* Cart — hidden by default; .has-items toggles it on. */}
            <button
                className="btn-cart"
                id="btnCart"
                aria-label="Cart"
                title="Cart"
                type="button"
            >
                <span className="cart-count-badge" id="cartCountBadge">0</span>
            </button>

            {/* PriceSprite — hidden by CSS default. Revealed when
                .menu-open is added to the wrapper in step 3. */}
            <div className="ascii-sprite-wrap" id="asciiSpriteWrap">
                <span className="ascii-sprite" id="asciiSprite">(ง •̀_•́)ง</span>
            </div>

            {/* Level badge — hidden by CSS default. Revealed when
                .menu-open is added to the wrapper in step 3. */}
            <span
                className="ascii-pfp-badge"
                id="asciiPfpBadge"
                aria-label="Level 42"
                title="Level 42"
            >
                ❹❷
            </span>

            {/* Connect button — collapsed default (just the wallet
                glyph). Step 3 wires the click handler + .expanded class. */}
            <button
                className="btn-user"
                id="btnUser"
                aria-label="Toggle User Menu"
                title="Toggle User Menu"
                type="button"
            >
                <span className="user-icon" aria-hidden="true">
                    {'⟠\uFE0E'}
                </span>
                <span className="user-text">@brendon</span>
            </button>
        </div>
    );
}
