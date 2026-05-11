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

import { useEffect, useState } from 'react';
import { useDropdown } from '../../lib/state/DropdownContext';
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useConnectModal } from '@rainbow-me/rainbowkit';

export function LinksView() {
    const { setView, closeMenu } = useDropdown();
    const { open } = useModal();
    const { siweAddress, signOut } = useAuth();
    const { openConnectModal } = useConnectModal();

    const isAuthed = !!siweAddress;

    /* Profile link target. Uses live SIWE address when authenticated;
       falls back to `/brendon` when not. The fallback is unreachable
       in the gated logged-out state (pointer-events: none + no href
       when not authed) but kept as a defensive default. */
    const profileHref = siweAddress ? `/${siweAddress}` : '/brendon';

    /* F63 / BUG-33 — mock gas widget cycling.
       Cycles through ten plausible gwei values every 15 seconds and
       skips the update when the tab is hidden. Initial index is
       randomized so dropdown reopens don't always start at the same
       value. visibilitychange forces an immediate refresh when the tab
       returns so a long-hidden value isn't stuck on screen. */
    const FAKE_GWEI = [0.031, 0.042, 0.057, 0.063, 0.079, 0.044, 0.038, 0.052, 0.071, 0.059];
    const [gasIdx, setGasIdx] = useState(() => Math.floor(Math.random() * FAKE_GWEI.length));
    useEffect(() => {
        const tick = () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            setGasIdx(i => (i + 1) % FAKE_GWEI.length);
        };
        const id = setInterval(tick, 15000);
        const onVis = () => { if (!document.hidden) tick(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    const gasValue = FAKE_GWEI[gasIdx].toFixed(3);

    const handleLogOut = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        await signOut();
        closeMenu();
    };

    const handleConnectWallet = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        /* openConnectModal is undefined while RainbowKit is initialising;
           guard with `?.()`. */
        openConnectModal?.();
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
                        tabIndex={isAuthed ? 0 : -1}
                        title="Followers"
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (!isAuthed) return;
                            open('followers', 'followers');
                        }}
                        onKeyDown={(e) => {
                            if (!isAuthed) return;
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
                        tabIndex={isAuthed ? 0 : -1}
                        title="Following"
                        style={{ marginLeft: 12 }}
                        onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (!isAuthed) return;
                            open('followers', 'following');
                        }}
                        onKeyDown={(e) => {
                            if (!isAuthed) return;
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
            </div>

            <a
                href="https://discord.pricediscussion.com"
                target="_blank"
                rel="noopener noreferrer"
            >
                Discord
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
                    title="Estimated gas price"
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
