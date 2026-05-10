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
 *
 * Artists / Portfolio / Settings / Calendar panels swap into the same
 * dropdown slot via DropdownContext.setView, keeping the dropdown
 * footprint stable.
 *
 * Follower / following counts stay mocked at 850 / 2.2k — they wire to
 * real values when the indexer + follow graph land. Same FollowersModal
 * pattern (modal already exists, harmless pre-launch).
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

export function LinksView() {
    const { setView, closeMenu } = useDropdown();
    const { open } = useModal();
    const { siweAddress, signOut } = useAuth();

    /* Profile link target. Uses live SIWE address when authenticated;
       falls back to `/brendon` when not (defensive — LinksView only
       renders inside an open menu, which only opens when authenticated,
       so this fallback is unreachable in practice). */
    const profileHref = siweAddress ? `/${siweAddress}` : '/brendon';

    /* F63 / BUG-33 — mock gas widget cycling (sim 5703-5712).
       Sim cycles through ten plausible gwei values every 15 seconds and
       skips the update when the tab is hidden. The repo previously hard-
       coded "0.057 gwei", which made every refresh feel identical. Initial
       index is randomized so dropdown reopens don't always start at the
       same value. visibilitychange forces an immediate refresh when the
       tab returns so a long-hidden value isn't stuck on screen. */
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

    return (
        <div className="dropdown-menu-links" id="dropdownMenuLinks">
            {/* Profile row — link + follower/following stats split.
                See top-of-file PARKED DEVIATION block on flex: 1. */}
            <div
                id="profileRow"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                }}
            >
                {/* PARKED DEVIATION: flex: 1 pushes the stats to the
                    right edge of the row instead of clustering them
                    next to "Profile" (sim's natural layout). */}
                <a
                    href={profileHref}
                    style={{ flex: 1 }}
                >
                    Profile
                </a>
                {/* Each side (followers OR following) is a SINGLE click
                    target that wraps the icon + number together. Sim
                    4511-4512 leaves the icons decorative (only the <b>
                    is clickable); we go one step further per Brendon —
                    the whole .nav-stat-link span is the click region,
                    so tapping the icon OR the number opens the same
                    FollowersModal tab. Hover treatment shifts to
                    opacity-only so it stays theme-aware on every
                    theme. */}
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
                tabIndex={0}
                style={{ cursor: 'pointer' }}
                onClick={(e) => {
                    e.preventDefault();
                    setView('portfolio');
                }}
                onKeyDown={(e) => {
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

            <button
                className="dropdown-pill"
                type="button"
                onClick={handleLogOut}
            >
                Log Out{' '}
                <span className="logout-icon">↬{'\uFE0E'}</span>
            </button>
        </div>
    );
}
