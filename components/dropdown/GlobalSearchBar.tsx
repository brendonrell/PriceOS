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
 * D25→LIVE (2026-07-02): real results replace the sim's dummy rows. While
 *      the input is non-empty, the bar debounce-fetches /api/search and
 *      renders the response broken down by section — PROJECTS / COLLECTORS /
 *      ARTWORKS — inside .global-search-results:
 *        - section headers reuse .settings-header (PortfolioView/ArtistsView
 *          pattern), rows stay .global-result-item;
 *        - collector rows reuse CollectedPair (sprite+@name) + the Followers
 *          Manager's compact stats chips (.fm-stat: ⬚ collected · ⟠ spent ·
 *          ⚬ followers), sized down one step in the results context;
 *        - artwork rows carry the piece's Reads-As / fingerprint words, so a
 *          natural-language match shows WHY it matched;
 *        - rows navigate like ArtistsView rows (router.push) — projects to
 *          /art/{slug}, collectors to /{handle}, artworks to /art/{slug}/{id}.
 *      While the fetch is in flight the row pulses (.fm-loading — §9, always
 *      feel moving forward). The container keeps .has-results so the reveal
 *      rule applies (max-height raised for the sectioned list).
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

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/navigation';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useDropdown } from '../../lib/state/DropdownContext';
import CalendarHeaderInline from '../CalendarHeaderInline';
import SpriteFace from '../SpriteFace';
import { useSpriteFace } from '../../lib/hooks/useSpriteFace';
import { fmtFollowers } from '../../lib/social/useArtistSocial';
import { getRecentGlobal } from '../../lib/pins/breadcrumbStore';
import { getProject } from '../../lib/project/registry';
import type { SearchResponse, SearchUserResult } from '../../app/api/search/route';

const VS15 = '︎';

/** 0x1234…5678 — the compact address face for handle-less wallets. */
function shortAddress(addr: string): string {
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** "Prisms #7" — the app's piece-naming convention (ArtworkCard's grail
    toasts): sentence-cased project name, then the edition number. */
function pieceName(title: string, id: string | number): string {
    return `${title.charAt(0)}${title.slice(1).toLowerCase()} #${id}`;
}

/* One collector row, formatted FOR search (Brendon, 2026-07-02: no ID
   Rectangle in here — just the PriceSprite, the @name, the ✺ badge and the
   three profile stats, all in the results' own courier voice). */
function SearchUserRow({
    user,
    onGo,
}: {
    user: SearchUserResult;
    onGo: (e: MouseEvent, href: string) => void;
}) {
    const face = useSpriteFace(user.handle ?? '');
    const name = user.handle
        ? `@${user.handle}`
        : user.ens_name ?? shortAddress(user.address);
    const dest = `/${user.handle ?? user.address}`;
    return (
        <div
            className="global-result-item gsr-row gsr-user"
            role="button"
            tabIndex={0}
            onClick={(e) => onGo(e, dest)}
        >
            {face && <SpriteFace className="gsr-sprite" face={face} />}
            <span className="gsr-main">{name}</span>
            {user.is_artist && <span className="gsr-badge" title="Artist">{`✺${VS15}`}</span>}
            <span className="gsr-sub gsr-stats" title="Collected · Spent · Followers">
                {`⬚${VS15} ${user.collected}  ⟠${VS15} ${user.spent_eth.toFixed(2)}  ⚬${VS15} ${fmtFollowers(user.followers)}`}
            </span>
        </div>
    );
}

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
    const router = useRouter();
    const [active, setActive] = useState(false);
    const [value, setValue] = useState('');
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [searching, setSearching] = useState(false);
    // F23: ref on the wrap so we can walk up to .user-dropdown via .closest()
    // without reaching for a global document.querySelector.
    const wrapRef = useRef<HTMLDivElement | null>(null);

    const calendarOpen = view === 'calendar';

    // D25 + D26: any non-empty trimmed input flips the bar into search
    // mode (live results render; the rest of the dropdown surface hides).
    // Mirrors sim's `isGlobalSearching` flag (sim.html 8914 + 8968).
    const isGlobalSearching = value.trim().length > 0;

    // RECENTLY VIEWED — the breadcrumb trail (the History feature) surfaces
    // the moment search opens, before a single keystroke; typing swaps it for
    // live results. Loaded on activation so the freshest trail always shows.
    const [recent, setRecent] = useState<{ slug: string; id: number }[]>([]);
    useEffect(() => {
        if (active) setRecent(getRecentGlobal(5));
    }, [active]);
    const recentCount = recent.length;

    // D26: panel hide while the search surface is engaged — typing, or the
    // just-opened input showing the RECENTLY VIEWED trail. Imperatively reach
    // into the live DOM and toggle visibility on menu-links / accordion boxes
    // / settings panel / artists panel. Refs are captured at the moment the
    // effect runs so cleanup restores the same nodes — even if React
    // re-renders or unmounts the bar mid-search.
    const engaged = isGlobalSearching || (active && recentCount > 0);
    useEffect(() => {
        if (!engaged) return;

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
    }, [engaged]);

    // LIVE search: debounce-fetch /api/search on every keystroke ≥2 chars.
    // AbortController cancels the in-flight request when the value changes
    // or the bar unmounts; stale responses can never land over fresh ones.
    useEffect(() => {
        const q = value.trim();
        if (q.length < 2) {
            setResults(null);
            setSearching(false);
            return;
        }
        setSearching(true);
        const ctl = new AbortController();
        const t = window.setTimeout(() => {
            fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctl.signal })
                .then((res) => (res.ok ? res.json() : null))
                .then((json: SearchResponse | null) => {
                    if (ctl.signal.aborted) return;
                    setResults(json ?? { query: q, projects: [], users: [], artworks: [] });
                    setSearching(false);
                })
                .catch(() => {
                    if (!ctl.signal.aborted) setSearching(false);
                });
        }, 220);
        return () => {
            window.clearTimeout(t);
            ctl.abort();
        };
    }, [value]);

    // Row navigation — same move as ArtistsView rows (router.push).
    const go = (e: MouseEvent, href: string) => {
        e.preventDefault();
        router.push(href);
    };

    // Browse-history-aware ordering: within each section, pieces (and
    // projects) the viewer actually opened rank first — the trail is the
    // strongest personal relevance signal we have.
    const ordered = useMemo(() => {
        if (!results) return null;
        const trail = getRecentGlobal(100);
        const keys = new Set(trail.map((r) => `${r.slug}:${r.id}`));
        const slugs = new Set(trail.map((r) => r.slug));
        const artworks = [...results.artworks].sort(
            (a, b) =>
                Number(keys.has(`${b.project_id}:${b.token_id}`)) -
                Number(keys.has(`${a.project_id}:${a.token_id}`))
        );
        const projects = [...results.projects].sort(
            (a, b) => Number(slugs.has(b.id)) - Number(slugs.has(a.id))
        );
        return { ...results, artworks, projects };
    }, [results]);

    // Cycle menu tape mode 0 → 3 → 0 (framed mode 4 removed — letters only)
    const cycleMenuTape = () => {
        const cycle: Array<0 | 3> = [0, 3];
        const next = notifs.menutape === 0 ? 3 : 0;
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
                            {'▰\uFE0E'}
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
                className={`global-search-results${engaged ? ' has-results' : ''}`}
                id="globalSearchResults"
                onMouseDown={(e) => e.preventDefault()}
            >
                {engaged && !isGlobalSearching && (
                    <>
                        <div className="settings-header gsr-header">Recently Viewed</div>
                        {recent.map((r) => (
                            <div
                                key={`r:${r.slug}:${r.id}`}
                                className="global-result-item gsr-row"
                                role="button"
                                tabIndex={0}
                                onClick={(e) => go(e, `/art/${r.slug}/${r.id}`)}
                            >
                                <span className="gsr-main">
                                    {pieceName(getProject(r.slug)?.displayName ?? r.slug, r.id)}
                                </span>
                            </div>
                        ))}
                    </>
                )}
                {isGlobalSearching && searching && !ordered && (
                    <div className="global-result-item gsr-empty fm-loading">{`⌕${VS15} searching…`}</div>
                )}
                {isGlobalSearching && ordered && (
                    <>
                        {ordered.projects.length > 0 && (
                            <div className="settings-header gsr-header">Projects</div>
                        )}
                        {ordered.projects.map((p) => (
                            <div
                                key={`p:${p.id}`}
                                className="global-result-item gsr-row"
                                role="button"
                                tabIndex={0}
                                onClick={(e) => go(e, `/art/${p.id}`)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') router.push(`/art/${p.id}`);
                                }}
                            >
                                <span className="gsr-ic">{`⬚${VS15}`}</span>
                                <span className="gsr-main">{p.title}</span>
                                <span className="gsr-sub">
                                    {p.match
                                        ? p.match
                                        : `@${p.artist_handle ?? p.handle ?? ''} · ${p.minted_count}/${p.max_supply}`}
                                </span>
                            </div>
                        ))}

                        {ordered.users.length > 0 && (
                            <div className="settings-header gsr-header">Collectors</div>
                        )}
                        {ordered.users.map((u) => (
                            <SearchUserRow key={`u:${u.address}`} user={u} onGo={go} />
                        ))}

                        {ordered.artworks.length > 0 && (
                            <div className="settings-header gsr-header">Artworks</div>
                        )}
                        {ordered.artworks.map((a) => (
                            <div
                                key={`a:${a.project_id}:${a.token_id}`}
                                className="global-result-item gsr-row"
                                role="button"
                                tabIndex={0}
                                onClick={(e) => go(e, `/art/${a.project_id}/${a.token_id}`)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') router.push(`/art/${a.project_id}/${a.token_id}`);
                                }}
                            >
                                <span className="gsr-main">{pieceName(a.project_title, a.token_id)}</span>
                                <span className="gsr-sub">
                                    {a.label
                                        ? `${a.label} · ⚬${VS15} ${a.followers}`
                                        : `⚬${VS15} ${a.followers}`}
                                </span>
                            </div>
                        ))}

                        {ordered.projects.length === 0 &&
                            ordered.users.length === 0 &&
                            ordered.artworks.length === 0 &&
                            !searching && (
                                <div className="global-result-item gsr-empty">{`⌕${VS15} NO MATCHES`}</div>
                            )}
                    </>
                )}
            </div>
        </div>
    );
}
