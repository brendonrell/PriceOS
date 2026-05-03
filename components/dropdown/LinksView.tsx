'use client';

/*
 * LinksView
 *
 * The default view inside the main user-dropdown panel:
 *   - Profile (with follower / following counts)
 *   - Discord
 *   - Artists  (clicking swaps the user-dropdown to the Artists panel)
 *   - Portfolio (similar)
 *   - Settings (with inline gas widget)
 *   - Log Out
 *
 * Artists / Portfolio / Settings / Calendar are reached via clicks
 * here; their panels swap into the same slot, keeping the dropdown
 * footprint stable.
 *
 * The mock follower / following counts come from the brief's screenshot
 * data (850 / 2.2k); real values land when wallet + indexer wire up.
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

import { useState } from 'react';
import { useDropdown } from '../../lib/state/DropdownContext';

export function LinksView() {
    const { setView } = useDropdown();
    const [profileHover, setProfileHover] = useState(false);

    return (
        <div className="dropdown-menu-links" id="dropdownMenuLinks">
            {/* F33: row container styles match sim 4508 (flex / padding / border-left placeholder / 30px height).
                F34: hover state paints borderLeftColor + background, mirrors sim 4509 inline mouseenter/leave handlers. */}
            <div
                id="profileRow"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 10px',
                    borderLeft: `2px solid ${profileHover ? 'var(--bg-color)' : 'transparent'}`,
                    background: profileHover ? 'rgba(128,128,128,0.2)' : '',
                    height: 30,
                    boxSizing: 'border-box',
                }}
            >
                {/* PARKED DEVIATION: flex: 1 pushes the stats to the
                    right edge of the row instead of clustering them
                    next to "Profile" (sim's natural layout). */}
                <a
                    href="/brendon"
                    style={{
                        fontSize: 13,
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        color: 'inherit',
                        transition: 'all 0.2s',
                        borderLeft: 'none',
                        padding: 0,
                        flex: 1,
                    }}
                    onMouseEnter={() => setProfileHover(true)}
                    onMouseLeave={() => setProfileHover(false)}
                >
                    Profile
                </a>
                {/* F35: stopPropagation + preventDefault prevents stats clicks from bubbling
                    to the row and triggering Profile navigation (sim 4510). */}
                <span
                    className="nav-follower-stats"
                    onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                    }}
                >
                    <span className="nav-ico nav-ico-followers" title="Followers">
                        ⚬{'\uFE0E'}
                    </span>{' '}
                    &nbsp;<b>850</b>
                    <span
                        className="nav-ico nav-ico-following"
                        style={{ marginLeft: 12 }}
                        title="Following"
                    >
                        ⚯{'\uFE0E'}
                    </span>{' '}
                    &nbsp;<b>2.2k</b>
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
                    <span style={{ position: 'relative', top: 2 }}>0.057 gwei</span>{' '}
                    <span className="gas-glyph">⍞</span>
                </span>
            </a>

            <div className="dropdown-divider" />

            <button className="dropdown-pill" type="button">
                Log Out{' '}
                <span className="logout-icon">↬{'\uFE0E'}</span>
            </button>
        </div>
    );
}
