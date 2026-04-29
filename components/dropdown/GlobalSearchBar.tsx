'use client';

/*
 * GlobalSearchBar
 *
 * The top section of the main user-dropdown panel:
 *   - Left:  globe icon + "Global Search" label (dormant) — clicking
 *            swaps to an active search input
 *   - Right: ▰ menutape · ⥹ topbarcal · ▦ calendar icon row
 *
 * In step 3 the search results aren't wired (no data layer to search
 * yet); typing in the active state just shows nothing. Clicking the
 * three icons cycles their respective pdNotifs flags so the UI state
 * is real even though some downstream effects (e.g. the actual top-
 * bar calendar appearance) land in later steps.
 */

import { useState } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useDropdown } from '../../lib/state/DropdownContext';

function GlobeIcon({ id }: { id?: string }) {
    return (
        <svg
            id={id}
            className="globe-icon"
            viewBox="0 0 100 100"
            width="22" height="22"
            fill="none" stroke="currentColor"
            strokeWidth="5" strokeLinecap="round"
            aria-hidden="true"
        >
            <ellipse cx="50" cy="50" rx="44" ry="44" />
            <ellipse cx="50" cy="50" rx="18" ry="44" transform="rotate(20 50 50)" />
            <ellipse cx="50" cy="50" rx="36" ry="44" transform="rotate(20 50 50)" />
            <ellipse cx="50" cy="32" rx="38" ry="10" transform="rotate(10 50 50)" />
            <ellipse cx="50" cy="50" rx="44" ry="12" transform="rotate(10 50 50)" />
            <ellipse cx="50" cy="68" rx="38" ry="10" transform="rotate(10 50 50)" />
        </svg>
    );
}

export function GlobalSearchBar() {
    const { notifs, update } = usePdNotifs();
    const { setView } = useDropdown();
    const [active, setActive] = useState(false);
    const [value, setValue] = useState('');

    // Cycle menu tape mode 0 → 3 → 4 → 0 (skips desktop-only 1, 2)
    const cycleMenuTape = () => {
        const cycle: Array<0 | 3 | 4> = [0, 3, 4];
        const idx = cycle.indexOf(notifs.menutape);
        const next = cycle[(idx + 1) % cycle.length];
        update({ menutape: next });
    };

    const toggleTopBarCalendar = () => {
        update({ topBarCalendar: !notifs.topBarCalendar });
    };

    const openCalendar = () => {
        setView('calendar');
    };

    return (
        <div className="global-search-wrap">
            <div
                id="gasWidgetRow"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                {!active && (
                    <div
                        className="search-dormant-label"
                        id="searchDormant"
                        onClick={() => setActive(true)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setActive(true);
                            }
                        }}
                    >
                        <GlobeIcon />
                        <span className="search-dormant-text">Global Search</span>
                    </div>
                )}

                {active && (
                    <div
                        className="global-search-field"
                        id="searchActive"
                        style={{ flex: 1 }}
                    >
                        <GlobeIcon id="globeIcon" />
                        <input
                            className="global-search-input"
                            id="globalSearchInput"
                            type="text"
                            placeholder="type to search pd"
                            autoComplete="off"
                            enterKeyHint="done"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onBlur={() => {
                                if (!value.trim()) setActive(false);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                if (e.key === 'Escape') {
                                    setValue('');
                                    setActive(false);
                                }
                            }}
                            autoFocus
                        />
                    </div>
                )}

                {!active && (
                    <span className="top-menu-icons">
                        <span
                            className={`dm-icon dm-icon-menutape${notifs.menutape !== 0 ? ' active' : ''}`}
                            id="sn-menutape-top"
                            role="button"
                            tabIndex={0}
                            title="Menu Tape"
                            onClick={cycleMenuTape}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    cycleMenuTape();
                                }
                            }}
                        >
                            ▰{'\uFE0E'}
                        </span>
                        <span
                            className={`dm-icon dm-icon-topbarcal${notifs.topBarCalendar ? ' active' : ''}`}
                            id="dm-topbarcal"
                            role="button"
                            tabIndex={0}
                            title="Top Bar Calendar"
                            onClick={toggleTopBarCalendar}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleTopBarCalendar();
                                }
                            }}
                        >
                            ⥹{'\uFE0E'}
                        </span>
                        <span
                            className="dm-icon dm-icon-calendar"
                            id="dm-calendar"
                            role="button"
                            tabIndex={0}
                            title="Calendar"
                            onClick={openCalendar}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    openCalendar();
                                }
                            }}
                        >
                            ▦{'\uFE0E'}
                        </span>
                    </span>
                )}
            </div>

            <div className="global-search-results" id="globalSearchResults" />
        </div>
    );
}
