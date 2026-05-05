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
 * F23: --pd-menu-height is now measured at calendar-open time, not
 *      hardcoded. Mirrors sim toggleCalendar (sim.html 6529–6549):
 *
 *      OPEN  → measure #dropdownMenuLinks getBoundingClientRect().height,
 *              write to documentElement --pd-menu-height (1-decimal),
 *              measure .user-dropdown getBoundingClientRect().height,
 *              pin min-height as permanent floor on first successful open
 *              (dataset.heightLocked guard, sim parity), pin strict height
 *              on every open (released on close).
 *      CLOSE → clear strict .user-dropdown style.height; min-height floor
 *              stays so settings/artists/portfolio can grow taller without
 *              snapping smaller than the menu-links footprint.
 *
 *      Measurement happens synchronously in the click handler BEFORE
 *      setView('calendar') runs, because by the time the next render
 *      completes LinksView (#dropdownMenuLinks) has already unmounted
 *      and there is nothing to measure. The min-height floor persists
 *      across subsequent opens via dataset.heightLocked, so opening
 *      calendar from settings/artists/portfolio (where #dropdownMenuLinks
 *      isn't in the DOM and the new measurement is skipped) still keeps
 *      the dropdown at full size after the first links→calendar open.
 *
 * D25: dummy result rows. While the search input is non-empty
 *      (isGlobalSearching), three preview rows render inside
 *      .global-search-results using sim's exact shape (sim.html 8979–8985):
 *        ⌕ @<val> — collector
 *        ⌕ "<val>" — palette match
 *        ⌕ #<rand 1..1000> — token
 *      The container also receives .has-results so the sim CSS rule at
 *      sim line 613 ({ max-height: 120px; overflow-y: auto }) applies.
 * D26: panel hide on type. While isGlobalSearching, the rest of the
 *      dropdown surface is hidden so the search results dominate the
 *      panel (sim.html 8971–8977). The effect imperatively sets:
 *        - #dropdownMenuLinks       → classList.add('hidden')
 *        - .notifications-box (all) → style.display = 'none'
 *        - #settingsPanel           → style.display = 'none'
 *        - #artistsPanel            → style.display = 'none'
 *      Sim's 8973 only hits the first .notifications-box (a documented
 *      bug — sim 8941–8942 calls it out: "ALL .notifications-box hidden
 *      … previously only first was hidden, leaving tapeBox/pingsBox
 *      leaking"). We hit all of them up-front so notes/todos/tape/pings
 *      can't leak through. Cleanup restores classList / display:'' on
 *      the same captured refs whenever isGlobalSearching flips false or
 *      the bar unmounts; React's view state (links/calendar/settings/
 *      artists/portfolio) is untouched, so clearing the input or closing
 *      the dropdown returns the user to whatever surface they were on.
 *      DropdownStack only mounts the accordion boxes on links / calendar
 *      views, so on settings / artists / portfolio the queryAll captures
 *      zero .notifications-box and the effect just hides the panel.
 */

import { useEffect, useRef, useState } from 'react';
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
    // F23: ref on the wrap so we can walk up to .user-dropdown via .closest()
    // without reaching for a global document.querySelector.
    const wrapRef = useRef<HTMLDivElement | null>(null);

    const calendarOpen = view === 'calendar';

    // D25 + D26: any non-empty trimmed input flips the bar into search
    // mode. D25 reads this to render dummy rows; D26 reads it to hide
    // the rest of the dropdown surface. Mirrors sim's `isGlobalSearching`
    // flag (sim.html 8914 + 8968).
    const isGlobalSearching = value.trim().length > 0;

    // D26: panel hide on type. Imperatively reach into the live DOM and
    // toggle visibility on menu-links / accordion boxes / settings panel /
    // artists panel while typing. Refs are captured at the moment the
    // effect runs so cleanup restores the same nodes — even if React
    // re-renders or unmounts the bar mid-search.
    useEffect(() => {
        if (!isGlobalSearching) return;

        const menuLinks = document.getElementById('dropdownMenuLinks');
        const notifsBoxes = Array.from(
            document.querySelectorAll<HTMLElement>('.notifications-box')
        );
        const settingsPanel = document.getElementById('settingsPanel');
        const artistsPanel = document.getElementById('artistsPanel');

        if (menuLinks) menuLinks.classList.add('hidden');
        notifsBoxes.forEach((b) => {
            b.style.display = 'none';
        });
        if (settingsPanel) settingsPanel.style.display = 'none';
        if (artistsPanel) artistsPanel.style.display = 'none';

        return () => {
            if (menuLinks) menuLinks.classList.remove('hidden');
            notifsBoxes.forEach((b) => {
                b.style.display = '';
            });
            if (settingsPanel) settingsPanel.style.display = '';
            if (artistsPanel) artistsPanel.style.display = '';
        };
    }, [isGlobalSearching]);

    // D25: three dummy result rows mirroring sim 8979–8985. Math.random
    // is intentionally re-rolled on every keystroke (each render) — sim
    // does the same inside its handler.
    const dummies = isGlobalSearching
        ? [
              `⌕ @${value} — collector`,
              `⌕ "${value}" — palette match`,
              `⌕ #${Math.floor(Math.random() * 1000) + 1} — token`,
          ]
        : [];

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

    // F21 + F23: true toggle with synchronous height-lock measurement.
    //
    // Tapping ▦ while calendar is open returns to links and releases the
    // strict height lock. Tapping from any other view opens the calendar;
    // setView replaces the previous view's mount, so sim's "explicitly
    // close Settings/Artists/Portfolio first" path is implicit in React.
    //
    // The measurement MUST run before setView('calendar') because LinksView
    // (which renders #dropdownMenuLinks) unmounts on the next render. We
    // reach into the live DOM here — wrapRef → closest('.user-dropdown'),
    // and getElementById('dropdownMenuLinks') for the menu-links element.
    const toggleCalendar = () => {
        const userDd = wrapRef.current?.closest('.user-dropdown') as
            | HTMLElement
            | null;

        if (calendarOpen) {
            // CLOSE → release strict height. min-height floor stays so the
            // dropdown can't snap smaller than the menu-links footprint;
            // settings/artists/portfolio remain free to grow taller.
            if (userDd) userDd.style.height = '';
            setView('links');
            return;
        }

        // OPEN → measure now while #dropdownMenuLinks is still mounted
        // (i.e. when view === 'links'). If the user is on settings, artists,
        // or portfolio, the links element isn't in the DOM and we skip the
        // measurement; the previously-locked min-height keeps the dropdown
        // from contracting on subsequent opens.
        const links = document.getElementById('dropdownMenuLinks');
        if (links && userDd) {
            const h = links.getBoundingClientRect().height;
            if (h > 0) {
                // 1-decimal precision (matches sim 6533) — eliminates
                // sub-pixel jitter without rounding the menu-links and
                // calendar panel to different integer heights.
                const hStr = `${Math.round(h * 10) / 10}px`;
                document.documentElement.style.setProperty(
                    '--pd-menu-height',
                    hStr
                );

                const fullH = userDd.getBoundingClientRect().height;
                const fullHStr = `${Math.round(fullH * 10) / 10}px`;

                // First successful open seeds the permanent min-height
                // floor (dataset.heightLocked guard, sim parity at 6546).
                // Strict height is set on every open and cleared on close.
                if (!userDd.dataset.heightLocked) {
                    userDd.style.minHeight = fullHStr;
                    userDd.dataset.heightLocked = '1';
                }
                userDd.style.height = fullHStr;
            }
        }

        setView('calendar');
    };

    return (
        <div className="global-search-wrap" ref={wrapRef}>
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
                        {/* F21: .active while calendar is open + click toggles.
                            F23: toggleCalendar measures --pd-menu-height before swapping. */}
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

            <div
                className={`global-search-results${isGlobalSearching ? ' has-results' : ''}`}
                id="globalSearchResults"
            >
                {dummies.map((d, i) => (
                    <div key={i} className="global-result-item">
                        {d}
                    </div>
                ))}
            </div>
        </div>
    );
}
