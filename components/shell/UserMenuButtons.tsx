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

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname } from 'next/navigation';
import {
    getWalletEnsName,
    getWalletEnsNameServer,
    openConnectModal,
    subscribeWalletBus,
} from '../../lib/wallet/walletBus';
import { useDropdown } from '../../lib/state/DropdownContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useModal } from '../../lib/state/ModalContext';
import { useCart } from '../../lib/state/CartContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { DropdownStack } from '../dropdown/DropdownStack';
import SpriteEyeSlot from '../SpriteEyeSlot';
import SigilArt from '../SigilArt';
import { useFaction } from '../../lib/factions/useFaction';
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

/* Open-menu row width budget — pinned to .dropdown-stack's own width
   (app/globals.css) so the pill row never reads longer/wider than the
   menu it sits above. ROW_GAP mirrors .user-menu-wrapper's flex gap. */
const MENU_ROW_WIDTH = 310;
const ROW_GAP = 8;
/* .btn-user chrome that isn't the @name text: .user-icon width (14) +
   its gap to .user-text (8) + .btn-user's own l/r padding (10+10). The
   PriceRank badge is measured live via badgeRef (below), never assumed
   fixed-width — it renders a single circled-digit glyph for tiers 1-10
   but falls back to real two-digit text ("11", "23"...) above that, so
   the live measurement is what keeps the row budget correct either way. */
const PILL_CHROME_WIDTH = 42;

export function UserMenuButtons() {
    const { menuOpen, toggleMenu } = useDropdown();
    const { notifs } = usePdNotifs();
    const pathname = usePathname();
    const { open: openModal } = useModal();

    /* Back Button Mode — a persistent back arrow parked under the connect
       square, on every page. The artwork full-screen view already carries its
       own always-on back arrow in the same spot, so suppress this one there to
       avoid showing two. */
    /* The Darkroom joined the list 2026-07-28 — it now carries the same
       always-on arrow, so the nav one would be a second, duplicate back. */
    const isFullscreenRoute =
        !!pathname &&
        pathname.startsWith('/art/') &&
        (pathname.endsWith('/full') || pathname.endsWith('/darkroom'));
    const showBackButton = notifs.backButton && !isFullscreenRoute;
    const { items, openPanel: openCartPanel } = useCart();
    const { siweAddress, handle, priceRank, isAuthenticating, sigilForged, sigilHidden } = useAuth();
    const { showToast } = useToast();

    /* ENS resolution — published on the walletBus by the deferred wallet
       stack, which runs the same mainnet-pinned useEnsName lookup this
       component made before the 2026-06-10 split (react-query still owns
       the cache, inside the stack). Null while the stack loads / the
       lookup is in flight — the pillText fallback chain (shortAddr)
       covers that window exactly as it covered the in-flight hook. */
    const ensName = useSyncExternalStore(
        subscribeWalletBus,
        getWalletEnsName,
        getWalletEnsNameServer,
    );

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
    /* Faction ink for the navbar Sigil — the viewer's own flying flag. */
    const ownFactionHex = useFaction()?.hex ?? null;

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
            /* Bus-routed since the wallet-stack split: opens immediately
               when the stack is resident (the common case — it's idle-
               prefetched), queues-and-loads on a cold tap, and falls back
               to the same toast only if the chunk actually failed to load. */
            openConnectModal(() =>
                showToast('Wallet: NOT READY — refresh and try again'),
            );
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

    /* Collision auto-detect — PriceSprite hides first (never the
       PriceRank badge) when a long @name would push the open-menu row
       past MENU_ROW_WIDTH; if it still doesn't fit sprite-less, the
       name truncates with CSS ellipsis (.user-text) instead of growing
       the row further. cartRef/badgeRef/sigilRef measure their REAL
       rendered widths (not guessed constants) so this stays correct if
       any of those elements' own CSS ever changes. textMeasureRef is an
       offscreen twin of .user-text carrying the untruncated pillText —
       its width is what "does the full name fit" is judged against. */
    const cartRef = useRef<HTMLButtonElement>(null);
    const spriteRef = useRef<HTMLDivElement>(null);
    const badgeRef = useRef<HTMLSpanElement>(null);
    const sigilRef = useRef<HTMLSpanElement>(null);
    const textMeasureRef = useRef<HTMLSpanElement>(null);
    /* Sprite's own width never depends on pillText and goes to 0 once
       collapsed (display:none), so cache the last real measurement and
       keep using it while collapsed — that cached number is what lets
       the sprite reappear if the name later gets shorter. */
    const spriteNaturalWidthRef = useRef(0);
    const [hideSprite, setHideSprite] = useState(false);
    const [pillMaxWidth, setPillMaxWidth] = useState<number | undefined>(undefined);

    useLayoutEffect(() => {
        if (!menuOpen) return;
        const cartW = cartCount > 0 && cartRef.current ? cartRef.current.offsetWidth + ROW_GAP : 0;
        const badgeW = frame.hasIdentity && badgeRef.current ? badgeRef.current.offsetWidth + ROW_GAP : 0;
        if (frame.hasIdentity && !hideSprite && spriteRef.current) {
            spriteNaturalWidthRef.current = spriteRef.current.offsetWidth;
        }
        const spriteW = frame.hasIdentity ? spriteNaturalWidthRef.current + ROW_GAP : 0;
        const sigilW = sigilRef.current ? sigilRef.current.offsetWidth + 3 : 0;
        const textW = textMeasureRef.current ? textMeasureRef.current.offsetWidth : 0;
        const pillNaturalW = PILL_CHROME_WIDTH + textW + sigilW;

        const withSprite = cartW + spriteW + badgeW + pillNaturalW;
        const spriteFits = withSprite <= MENU_ROW_WIDTH;
        setHideSprite(!spriteFits);
        /* Always set an explicit max-width while open — CSS's static
           .btn-user.expanded fallback (app/globals.css) is only a
           pre-layout safety net and must never be what actually caps
           the pill, or a long name silently gets clipped back down
           after this effect decided it had room. Budget = full row
           minus whichever siblings are actually reserving space now. */
        setPillMaxWidth(
            Math.max(MENU_ROW_WIDTH - cartW - badgeW - (spriteFits ? spriteW : 0), PILL_CHROME_WIDTH + 20),
        );
    }, [menuOpen, pillText, frame.hasIdentity, cartCount, sigilForged, sigilHidden, isAuthed]);

    return (
        <div className={wrapperClass}>
            {/* Cart — hidden by default; .has-items toggles it on. Click
                opens the slide-up CartPanel via its own context. */}
            <button
                ref={cartRef}
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
                        ref={spriteRef}
                        className={`ascii-sprite-wrap${hideSprite ? ' sprite-collapsed' : ''}`}
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
                                    <span className="ascii-sprite-slot ascii-sprite-slot-bracketL">{frame.parts.bracketL}</span>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-armL">{frame.parts.armL}</span>
                                    <SpriteEyeSlot className="ascii-sprite-slot ascii-sprite-slot-eyeL" text={frame.parts.eyeL} />
                                    <span className="ascii-sprite-slot ascii-sprite-slot-mouth">{frame.parts.mouth}</span>
                                    <SpriteEyeSlot className="ascii-sprite-slot ascii-sprite-slot-eyeR" text={frame.parts.eyeR} />
                                    <span className="ascii-sprite-slot ascii-sprite-slot-bracketR">{frame.parts.bracketR}</span>
                                    <span className="ascii-sprite-slot ascii-sprite-slot-armR">{frame.parts.armR}</span>
                                    {frame.parts.trail && (
                                        <span className="ascii-sprite-slot ascii-sprite-slot-trail">{frame.parts.trail}</span>
                                    )}
                                </>
                            ) : (
                                frame.face
                            )}
                        </span>
                    </div>

                    {/* PriceRank badge — users.price_rank, DEFAULT 0
                        (Brendon 2026-06-10: ONE name, starts at zero).
                        \u24FF unranked, then the Unicode circled-digit
                        glyphs \u2776..\u277F for tiers 1-10. Past 10,
                        there's no single-codepoint circled glyph, so it
                        falls back to plain digits — a real two-character
                        "11", "23", etc. Width is measured live via
                        badgeRef below, not assumed, so the pill-collision
                        math (above) already accounts for the wider
                        two-digit case correctly. */}
                    <span
                        ref={badgeRef}
                        className="ascii-pfp-badge"
                        id="asciiPfpBadge"
                        aria-label={`PriceRank ${priceRank}`}
                        title={`PriceRank ${priceRank}`}
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => {
                            e.stopPropagation();
                            openModal('priceSprite');
                        }}
                    >
                        {priceRank <= 0
                            ? '\u24FF'
                            : priceRank <= 10
                                ? String.fromCodePoint(0x2775 + priceRank)
                                : String(priceRank)}
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
                style={menuOpen && pillMaxWidth !== undefined ? { maxWidth: pillMaxWidth } : undefined}
            >
                <span className="user-icon" aria-hidden="true">
                    {'⟠\uFE0E'}
                </span>
                <span className="user-text">
                    <span className="user-text-inner">{pillText}</span>
                </span>
                {/* THE SIGIL — the forged mark trails the @name (the sprite +
                    rank badge lead it on the left). Faction ink when a flag
                    flies; menu-open only, like the name itself. Neutral falls
                    back to currentColor (the pill's own ink), NOT the bone
                    default — the pill is an inverted/light surface, where
                    bone-white washes out. Hidden entirely when the owner has
                    switched their Sigil off from the Forge (platform-wide). */}
                {menuOpen && isAuthed && sigilForged && !sigilHidden && siweAddress && (
                    <span ref={sigilRef} style={{ display: 'inline-block' }}>
                        <SigilArt
                            address={siweAddress}
                            hex={ownFactionHex ?? 'currentColor'}
                            className="sigil-after-name"
                            title="Your Sigil"
                        />
                    </span>
                )}
            </button>

            {/* Offscreen twin of .user-text — same font metrics, never
                truncated — measured to decide sprite-collapse + pill
                max-width above. Not aria-hidden'd via role since it's
                already inert (fixed off-canvas, no pointer events). */}
            <span
                ref={textMeasureRef}
                aria-hidden="true"
                style={{
                    position: 'fixed',
                    top: -9999,
                    left: -9999,
                    visibility: 'hidden',
                    whiteSpace: 'nowrap',
                    fontFamily: "'Courier New', Courier, monospace",
                    fontSize: 13,
                    fontWeight: 'bold',
                }}
            >
                {pillText}
            </span>

            <DropdownStack />

            {/* Back Button Mode — sits just under the connect square, travels
                with the navbar (sticky) and fades with it (rides the
                .nav-controls opacity). Hidden while the menu is open (the
                dropdown owns that space). Generic browser-back. */}
            {showBackButton && (
                <button
                    className="nav-back-btn"
                    type="button"
                    aria-label="Back"
                    title="Back"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (typeof window !== 'undefined') window.history.back();
                    }}
                >
                    {'⇠⇠︎'}
                </button>
            )}
        </div>
    );
}
