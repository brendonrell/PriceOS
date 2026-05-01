'use client';

/*
 * GlobalSearchBar
 *
 * The top section of the main user-dropdown panel:
 *   - Left:  globe icon + "Global Search" label (dormant) — clicking
 *            swaps to an active search input.
 *            When view === 'calendar', the cal-header (◀ APRIL 2026 ▶)
 *            replaces the search row so the top of the dropdown shows
 *            month navigation while the calendar is open.
 *   - Right: ▰ menutape · ⥹ topbarcal · ▦ calendar icon row
 *
 * F20: cal-header swap. Both .cal-header-inline and .search-dormant-label
 *      share min-height: 38px box-sizing: border-box so the top-row height
 *      never changes whether main menu or calendar is active.
 * F21: ▦ icon is now a true toggle (sim toggleCalendar at sim.html line 6489).
 *      Adds .active class while calendar view is open — globals.css:591
 *      .dm-icon.active { opacity: 1 }.
 * F25: icons row (▰ ⥹ ▦) hidden on settings / artists / portfolio views
 *      (sim.html 11129–11130). Only menu-links and calendar surfaces show
 *      the icons row alongside the search bar / cal-header.
 */

import { useState } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useDropdown } from '../../lib/state/DropdownContext';
import CalendarHeaderInline from '../CalendarHeaderInline';

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
    const { view, setView } = useDropdown();
    const [active, setActive] = useState(false);
    const [value, setValue] = useState('');

    const calendarOpen = view === 'calendar';

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

    // F21: true toggle. Tapping ▦ while calendar is open returns to links.
    // Tapping from any other view (links / settings / artists / portfolio)
    // opens the calendar — setView replaces the previous view's mount, so
    // sim's "explicitly close Settings/Artists/Portfolio first" path is
    // implicit in React.
    const toggleCalendar = () => {
        setView(calendarOpen ? 'links' : 'calendar');
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
                {/* F20: cal-header replaces the search row when calendar is open.
                    Otherwise: dormant label until the user activates search. */}
                {calendarOpen ? (
                    <CalendarHeaderInline />
                ) : !active ? (
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
                ) : (
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

                {/* Icons row — visible only on links or calendar view, and only
                    when search isn't actively typing (active typing takes the full row).
                    F25: hidden on settings / artists / portfolio (sim.html 11129–11130).
                    Sim DOM 4487–4491: icons live in the same row as the search/cal-header. */}
                {(view === 'links' || view === 'calendar') && (calendarOpen || !active) && (
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
                        {/* F21: .active while calendar is open + click toggles. */}
                        <span
                            className={`dm-icon dm-icon-calendar${calendarOpen ? ' active' : ''}`}
                            id="dm-calendar"
                            role="button"
                            tabIndex={0}
                            title="Calendar"
                            onClick={toggleCalendar}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleCalendar();
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
