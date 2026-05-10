'use client';

/*
 * LinksView — Launch Cut surface.
 *
 * The default (and only) view inside the main user-dropdown panel:
 *   - Profile     (with follower / following counts; links to
 *                  /{siweAddress} when authenticated)
 *   - Discord     (community plug — pricediscussion.com discord)
 *   - Log Out     (calls AuthContext.signOut → DELETE session +
 *                  wagmi disconnect + close menu)
 *
 * Build #11 strip — these LinksView entries are removed (their target
 * views are also un-mounted from UserDropdown):
 *   - Artists     (Artists A-Z directory — post-launch)
 *   - Portfolio   (Portfolios panel — post-launch)
 *   - Settings    (full Settings panel + inline gas widget — post-launch)
 *
 * Profile link target — was hardcoded to `/brendon` (mock user).
 * Now uses the live SIWE-verified address as the slug. The `[slug]`
 * route renders a stub shell until the profile body migration ships,
 * so the link goes somewhere meaningful instead of a mock handle.
 *
 * Follower / following counts stay mocked at 850 / 2.2k — they wire
 * to real values when the indexer + follow graph land. Same opens
 * FollowersModal pattern (modal exists; pre-launch but harmless).
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

export function LinksView() {
    const { closeMenu } = useDropdown();
    const { open } = useModal();
    const { siweAddress, signOut } = useAuth();

    /* Profile link target. Uses live SIWE address when authenticated;
       falls back to `/brendon` when not (defensive — LinksView only
       renders inside the menu, which only opens when authenticated,
       so this fallback is unreachable in practice). */
    const profileHref = siweAddress ? `/${siweAddress}` : '/brendon';

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
                {/* Each side (followers / following) is a single click
                    target wrapping the icon + number. Hover treatment
                    is opacity-only so it stays theme-aware. Mock counts
                    until the follow graph + indexer land. */}
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
