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
 */

import { useDropdown } from '../../lib/state/DropdownContext';

export function LinksView() {
    const { setView } = useDropdown();

    return (
        <div className="dropdown-menu-links" id="dropdownMenuLinks">
            <div id="profileRow">
                <a
                    href="/brendon"
                    style={{
                        fontSize: 13,
                        fontWeight: 'bold',
                        textDecoration: 'none',
                        color: 'inherit',
                        flex: 1,
                    }}
                >
                    Profile
                </a>
                <span className="nav-follower-stats">
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
