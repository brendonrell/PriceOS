'use client';

/*
 * LinksView
 *
 * The default view inside the main user-dropdown panel:
 *   - Profile (with follower / following counts; links to /{siweAddress}
 *              when authenticated, falls back to /brendon if not)
 *   - Discord
 *   - Artists   (clicking swaps the user-dropdown to the Artists panel)
 *   - Portfolio (similar)
 *   - Settings  (with inline gas widget; clicks swap to Settings panel)
 *   - Log Out   (calls AuthContext.signOut → DELETE session + wagmi
 *                disconnect + close menu)
 *     — OR —
 *   - Connect Wallet (logged-out, S2) — fires the RainbowKit modal via
 *                useConnectModal in place of Log Out.
 *
 * Artists / Portfolio / Settings / Calendar panels swap into the same
 * dropdown slot via DropdownContext.setView, keeping the dropdown
 * footprint stable.
 *
 * Follower / following counts stay mocked at 850 / 2.2k — they wire to
 * real values when the indexer + follow graph land. Same FollowersModal
 * pattern (modal already exists, harmless pre-launch).
 *
 * S2 logged-out preview:
 *   When !isAuthed, the Profile row and Portfolio link get the
 *   `auth-gated` class (opacity 0.4 + pointer-events: none + user-
 *   select: none — see app/globals.css). They remain visible so the
 *   logged-out user sees the menu's full shape, but they don't fire
 *   anything. The bottom CTA swaps from Log Out to Connect Wallet,
 *   which fires the RainbowKit modal directly.
 *
 * ── PARKED DEVIATION FROM SIM (2026-05-02, Brendon) ─────────────────
 * The Profile link USES `flex: 1` deliberately. Sim does NOT — sim's
 * profile row leaves the link at natural width, which clusters the
 * follower / following stats next to the "Profile" label (12px gap
 * from .nav-follower-stats margin-left). Brendon prefers the layout
 * where the link expands to fill the row, pushing the stats hard
 * against the right edge of the dropdown panel. This is intentional.
 * Do not "restore parity with sim" by removing flex: 1 — the
 * deviation is deliberate and Brendon-approved. If sim ever changes
 * to match this, delete this comment block.
 * ────────────────────────────────────────────────────────────────────
 */

import { useDropdown } from '../../lib/state/DropdownContext';
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useGasData } from '../../lib/hooks/useGasData';

export function LinksView() {
    const { setView, closeMenu } = useDropdown();
    const { open } = useModal();
    const { siweAddress, signOut } = useAuth();
    const { showToast } = useToast();
    const { openConnectModal } = useConnectModal();

    const isAuthed = !!siweAddress;

    /* Profile link target. Uses live SIWE address when authenticated;
       falls back to `/brendon` when not. The fallback is unreachable
       in the gated logged-out state (pointer-events: none + no href
       when not authed) but kept as a defensive default. */
    const profileHref = siweAddress ? `/${siweAddress}` : '/brendon';

    /* S3 — real gas data from /api/gas (edge-cached 12s). LinksView only
       mounts while the user dropdown is open, so `useGasData(true)`
       polls only while the user is looking at the menu. Clicking the
       widget opens the GasTrackerModal — full 3-card view. Works
       logged-out per Tier 1 lead-magnet spec. */
    const gas = useGasData(true);
    const gasValue = gas.data
        ? gas.data.standardGwei < 10
            ? gas.data.standardGwei.toFixed(2)
            : gas.data.standardGwei.toFixed(1)
        : '—';

    const handleLogOut = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await signOut();
        closeMenu();
    };

    const handleConnectWallet = () => {
        /* RK's ModalContext only exposes `openConnectModal` as a real
           function when connectionStatus is 'disconnected' or
           'unauthenticated' (node_modules/@rainbow-me/rainbowkit/dist/
           index.js:6355). When it's undefined, the user is already
           in a wallet-connected state we can't open the connect
           modal from. Toast tells them to retry rather than
           swallowing the click. */
        if (!openConnectModal) {
            showToast('Wallet not ready — refresh and try again');
            return;
        }
        /* No closeMenu, no preventDefault, no stopPropagation. RK
           modal renders via createPortal to document.body with
           z-index 2147483646 (rainbowkit/dist/index.css) so it
           layers above the dropdown without needing the dropdown
           out of the way. PR1 shipped a closeMenu() before this
           call; on iOS PWA that suppressed the modal render
           entirely (menu closed, no modal). Original pre-PR1 code
           didn't closeMenu either — the dropdown closes naturally
           when the user interacts with the RK modal (mousedown
           outside .user-menu-wrapper). */
        openConnectModal();
    };

    return (
        <div className="dropdown-menu-links" id="dropdownMenuLinks">
            {/* Profile row — link + follower/following stats split.
                See top-of-file PARKED DEVIATION block on flex: 1.
                S2: gated when !isAuthed (visible preview, inert). */}
            <div
                id="profileRow"
                className={!isAuthed ? 'auth-gated' : undefined}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                {/* PARKED DEVIATION: flex: 1 pushes the stats to the
                    right edge of the row instead of clustering them
                    next to "Profile" (sim's natural layout). */}
                <a
                    href={isAuthed ? profileHref : undefined}
                    style={{ flex: 1 }}
                >
                    Profile
                </a>
                {/* Each side (followers OR following) is a SINGLE click
                    target that wraps the icon + number together. Tapping
                    the icon OR the number opens the same FollowersModal
                    tab. Hover treatment shifts to opacity-only so it
                    stays theme-aware on every theme. */}
                {isAuthed && (
                <span
                    className="nav-follower-stats"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                >
                    <span
                        className="nav-stat-link"
                        role="button"
                        tabIndex={0}
                        title="Followers"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            open('followers', 'followers');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                open('followers', 'followers');
                            }
                        }}
                    >
                        <span className="nav-ico nav-ico-followers">
                            ⚬{'\uFE0E'}
                        </span>
                        {' '}&nbsp;
                        <b>850</b>
                    </span>
                    <span
                        className="nav-stat-link"
                        role="button"
                        tabIndex={0}
                        title="Following"
                        style={{ marginLeft: 12 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            open('followers', 'following');
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                open('followers', 'following');
                            }
                        }}
                    >
                        <span className="nav-ico nav-ico-following">
                            ⚯{'\uFE0E'}
                        </span>
                        {' '}&nbsp;
                        <b>2.2k</b>
                    </span>
                </span>
                )}
            </div>

            <a
                href="https://discord.gg/mJteKZmg28"
                target="_blank"
                rel="noopener noreferrer"
            >
                Discord
            </a>

            <a
                role="button"
                tabIndex={isAuthed ? 0 : -1}
                className={!isAuthed ? 'auth-gated' : undefined}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                    e.preventDefault();
                    if (!isAuthed) return;
                    showToast('Discord linking test entry added');
                }}
                onKeyDown={(e) => {
                    if (!isAuthed) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        showToast('Discord linking test entry added');
                    }
                }}
            >
                Link Discord
            </a>

            <a
                role="button"
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                    e.preventDefault();
                    setView('artists');
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setView('artists');
                    }
                }}
            >
                Artists
            </a>

            <a
                role="button"
                tabIndex={isAuthed ? 0 : -1}
                className={!isAuthed ? 'auth-gated' : undefined}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                    e.preventDefault();
                    if (!isAuthed) return;
                    setView('portfolio');
                }}
                onKeyDown={(e) => {
                    if (!isAuthed) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setView('portfolio');
                    }
                }}
            >
                Portfolio
            </a>

            <a
                role="button"
                tabIndex={0}
                className="settings-row"
                style={{ cursor: 'pointer', justifyContent: 'space-between' }}
                onClick={(e) => {
                    e.preventDefault();
                    setView('settings');
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setView('settings');
                    }
                }}
            >
                <span>Settings</span>
                <span
                    className="gas-widget gas-widget-inline"
                    id="gasWidget"
                    role="button"
                    tabIndex={0}
                    title="Open gas tracker"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        open('gasTracker');
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            open('gasTracker');
                        }
                    }}
                >
                    <span style={{ position: 'relative', top: 2 }}>{gasValue} gwei</span>{' '}
                    <span className="gas-glyph">⍞</span>
                </span>
            </a>

            <div className="dropdown-divider" />

            {isAuthed ? (
                <button
                    className="dropdown-pill"
                    type="button"
                    onClick={handleLogOut}
                >
                    Log Out{' '}
                    <span className="logout-icon">↬{'\uFE0E'}</span>
                </button>
            ) : (
                <button
                    className="dropdown-pill"
                    type="button"
                    onClick={handleConnectWallet}
                    title="Connect a wallet to sign in"
                >
                    Connect Wallet{' '}
                    <span className="logout-icon">⟠{'\uFE0E'}</span>
                </button>
            )}
        </div>
    );
}
