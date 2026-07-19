'use client';

/*
 * THE COMMAND STONE ⌘ — PD's AI character (docs/briefs/command-stone.md).
 *
 * Power + intelligence where the other characters (Familiar, Gnome, Petey,
 * the NPC cast) are personality. $0 SIMULATED: no model, no per-call cost —
 * the "intelligence" is intent parsing + full access to PD's own data.
 *
 * Stage 1 (this file): the vessel + GO/FIND.
 *   - Logged-in only. A thin bar pinned at the bottom, hovering above
 *     Safari's chrome / the iOS home indicator (safe-area).
 *   - SWIPE UP on the bar (or tap) → the stone opens full-height with a
 *     flashing typing indicator and NO prompt text (Brendon's call: empty
 *     idle — pure black stone, silent until touched).
 *   - LONG-PRESS the open stage → collapses back to the thin bar.
 *   - GO/FIND ride the real Global Search (/api/search + the exported
 *     .gsr row anatomy from GlobalSearchBar — Rule #0, one door): live
 *     results, inline answers, pages, Enter = top hit.
 *
 * Later stages (the brief): ETCH (natural-language creation with the
 * preview chip) · CAST (spells + workspaces by name) · the widget deck
 * ("almost WatchOS in nature") · Ask PD folded in · docs search.
 *
 * The panel stays mounted while closed (translateY(100%)) so the input
 * exists at gesture time — focus() fires synchronously inside the tap/
 * swipe handler, which is what makes iOS raise the keyboard.
 */

import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/state/AuthContext';
import SpriteFace from '../SpriteFace';
import { projectSpriteFace } from '../../lib/project/projectSprite';
import {
    ArtThumb,
    SearchUserRow,
    PAGE_ROWS,
    SECTION_PREVIEW,
    pieceName,
} from '../dropdown/GlobalSearchBar';
import type { SearchResponse } from '../../app/api/search/route';

const VS15 = '︎';
/** The Stone's mark — ⌘ (U+2318), Brendon-approved 2026-07-19.
    Device-verify on iPhone per the #1 glyph gate (docs/GLYPHS.md). */
const STONE_GLYPH = `⌘${VS15}`;

/** Upward travel (px) on the bar that reads as "swipe up" → open. */
const SWIPE_OPEN_PX = 24;
/** Press-and-hold time (ms) on the open stage that collapses the stone. */
const LONG_PRESS_MS = 550;
/** Finger drift (px) that cancels a long-press (it became a scroll). */
const LONG_PRESS_DRIFT_PX = 8;

export default function CommandStone() {
    const { siweAddress, needsSignup, handle: myHandle } = useAuth();
    const router = useRouter();
    const pathname = usePathname();

    const [open, setOpen] = useState(false);
    const [value, setValue] = useState('');
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [searching, setSearching] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const inputRef = useRef<HTMLInputElement | null>(null);

    const searchingNow = value.trim().length > 0;

    /* Route change → the stone folds away clean (same manners as every
       overlay in the shell: nothing bleeds onto the next page). */
    useEffect(() => {
        setOpen(false);
        setValue('');
    }, [pathname]);

    /* Escape closes (desktop keyboard crowd). */
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setOpen(false);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    /* LIVE search — the same debounce/abort discipline as GlobalSearchBar
       (D25): ≥2 chars, 220ms debounce, stale responses can never land. */
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
                    setResults(
                        json ?? {
                            query: q, answers: [], projects: [], users: [],
                            artworks: [], soundtracks: [], traits: [],
                        }
                    );
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

    useEffect(() => { setExpanded({}); }, [value]);

    /* GO — pages by word prefix; routes only in the stone (the dropdown
       panel views stay the dropdown's own doors for now). Profile resolves
       to the signed-in identity, same as the search bar. */
    const pageHits = useMemo(() => {
        const v = value.trim().toLowerCase();
        if (v.length < 2) return [];
        return PAGE_ROWS.filter(
            (p) => p.kind === 'route' && p.words.some((w) => w.startsWith(v))
        ).map((p) => ({
            ...p,
            to: p.to === '__profile__'
                ? (myHandle ? `/${myHandle}` : siweAddress ? `/${siweAddress}` : '/')
                : p.to,
        }));
    }, [value, myHandle, siweAddress]);

    /* Every navigation folds the stone — GO means GO. */
    const go = (e: MouseEvent | null, href: string) => {
        e?.preventDefault();
        router.push(href);
        setOpen(false);
        setValue('');
    };

    /* Enter = go: the top hit wins — pages → answers → projects →
       collectors → outputs → soundtracks → traits (the search bar's own
       priority order, verbatim). */
    const enterToGo = () => {
        if (pageHits[0]) { go(null, pageHits[0].to); return; }
        const r = results;
        if (!r) return;
        if (r.answers[0]?.href) { go(null, r.answers[0].href); return; }
        if (r.projects[0]) { go(null, `/art/${r.projects[0].id}`); return; }
        if (r.users[0]) { go(null, `/${r.users[0].handle ?? r.users[0].address}`); return; }
        if (r.artworks[0]) { go(null, `/art/${r.artworks[0].project_id}/${r.artworks[0].token_id}`); return; }
        if (r.soundtracks[0]) { go(null, `/art/${r.soundtracks[0].project_id}`); return; }
        if (r.traits[0]) { go(null, `/art/${r.traits[0].project_id}`); return; }
    };

    /* ── open: shared by tap + swipe. focus() runs synchronously inside
       the gesture handler so iOS raises the keyboard. ── */
    const openStone = () => {
        inputRef.current?.focus();
        setOpen(true);
    };

    /* Swipe-up on the bar. touch-action: none on the bar means these are
       the only moves the gesture can make — no scroll fight. */
    const barTouchY = useRef<number | null>(null);
    const onBarTouchStart = (e: React.TouchEvent) => {
        barTouchY.current = e.touches[0]?.clientY ?? null;
    };
    const onBarTouchMove = (e: React.TouchEvent) => {
        const start = barTouchY.current;
        const now = e.touches[0]?.clientY;
        if (start == null || now == null) return;
        if (start - now >= SWIPE_OPEN_PX) {
            barTouchY.current = null;
            openStone();
        }
    };

    /* Long-press the open stage → collapse. Presses that start on live
       elements (the input, result rows, buttons) never count — those
       belong to the element. Drift past the threshold cancels (it was a
       scroll); pointerup/cancel clears. */
    const pressTimer = useRef<number | null>(null);
    const pressStart = useRef<{ x: number; y: number } | null>(null);
    const clearPress = () => {
        if (pressTimer.current != null) {
            window.clearTimeout(pressTimer.current);
            pressTimer.current = null;
        }
        pressStart.current = null;
    };
    const onStagePointerDown = (e: React.PointerEvent) => {
        const el = e.target as HTMLElement;
        if (el.closest('input, [role="button"], button, a')) return;
        pressStart.current = { x: e.clientX, y: e.clientY };
        pressTimer.current = window.setTimeout(() => {
            clearPress();
            setOpen(false);
        }, LONG_PRESS_MS);
    };
    const onStagePointerMove = (e: React.PointerEvent) => {
        const s = pressStart.current;
        if (!s) return;
        if (
            Math.abs(e.clientX - s.x) > LONG_PRESS_DRIFT_PX ||
            Math.abs(e.clientY - s.y) > LONG_PRESS_DRIFT_PX
        ) {
            clearPress();
        }
    };

    /* Logged-in only (the brief). No account, no stone. */
    if (!siweAddress || needsSignup) return null;

    const r = results;

    return (
        <>
            {/* the resting bar — the stone asleep */}
            <div
                className={`stone-bar${open ? ' stone-bar--hidden' : ''}`}
                id="commandStoneBar"
                role="button"
                tabIndex={0}
                aria-label="The Command Stone"
                onClick={openStone}
                onTouchStart={onBarTouchStart}
                onTouchMove={onBarTouchMove}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openStone();
                    }
                }}
            >
                <span className="stone-bar-glyph">{STONE_GLYPH}</span>
            </div>

            {/* the open stone */}
            <div
                className={`stone-panel${open ? ' stone-open' : ''}`}
                id="commandStonePanel"
                aria-hidden={!open}
            >
                <div
                    className="stone-stage"
                    onPointerDown={onStagePointerDown}
                    onPointerMove={onStagePointerMove}
                    onPointerUp={clearPress}
                    onPointerCancel={clearPress}
                >
                    <div className="stone-head">
                        <span className="stone-head-glyph">{STONE_GLYPH}</span>
                        <span className="stone-head-title">THE COMMAND STONE</span>
                    </div>

                    <div className="stone-input-row">
                        {/* No prompt text — just the flashing indicator
                            until the first character lands. */}
                        {value === '' && (
                            <span className="stone-caret" aria-hidden="true">▮</span>
                        )}
                        <input
                            ref={inputRef}
                            className="stone-input"
                            id="commandStoneInput"
                            type="text"
                            autoComplete="off"
                            autoCapitalize="off"
                            autoCorrect="off"
                            spellCheck={false}
                            enterKeyHint="go"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    enterToGo();
                                }
                            }}
                        />
                    </div>

                    <div className="stone-results">
                        {searchingNow && searching && !r && (
                            <div className="global-result-item gsr-empty fm-loading">{`⌕${VS15} reading the stone…`}</div>
                        )}
                        {searchingNow && (pageHits.length > 0 || r) && (
                            <>
                                {r && r.answers.map((ans, i) => (
                                    <div
                                        key={`ans:${i}`}
                                        className={`global-result-item gsr-row gsr-answer${ans.href ? '' : ' gsr-empty'}`}
                                        role={ans.href ? 'button' : undefined}
                                        tabIndex={ans.href ? 0 : undefined}
                                        onClick={ans.href ? (e) => go(e, ans.href as string) : undefined}
                                    >
                                        <span className="gsr-main">{ans.text}</span>
                                    </div>
                                ))}

                                {pageHits.length > 0 && (
                                    <div className="settings-header gsr-header">Pages</div>
                                )}
                                {pageHits.map((p) => (
                                    <div
                                        key={`pg:${p.label}`}
                                        className="global-result-item gsr-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => go(e, p.to)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') go(null, p.to);
                                        }}
                                    >
                                        <span className="gsr-main">{p.label}</span>
                                        <span className="gsr-sub">page</span>
                                    </div>
                                ))}

                                {r && r.projects.length > 0 && (
                                    <div className="settings-header gsr-header">Projects</div>
                                )}
                                {r && r.projects
                                    .slice(0, expanded.projects ? undefined : SECTION_PREVIEW)
                                    .map((p) => (
                                    <div
                                        key={`p:${p.id}`}
                                        className="global-result-item gsr-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => go(e, `/art/${p.id}`)}
                                    >
                                        <SpriteFace className="gsr-sprite" face={projectSpriteFace(p.id)} />
                                        <span className="gsr-main">{p.title}</span>
                                        <span className="gsr-sub">
                                            {p.match
                                                ? p.match
                                                : `@${p.artist_handle ?? p.handle ?? ''} · ${p.minted_count}/${p.max_supply}`}
                                        </span>
                                    </div>
                                ))}
                                {r && !expanded.projects && r.projects.length > SECTION_PREVIEW && (
                                    <div
                                        className="global-result-item gsr-empty gsr-more"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setExpanded((x) => ({ ...x, projects: true }))}
                                    >
                                        {`+ ${r.projects.length - SECTION_PREVIEW} more`}
                                    </div>
                                )}

                                {r && r.users.length > 0 && (
                                    <div className="settings-header gsr-header">Collectors</div>
                                )}
                                {r && r.users
                                    .slice(0, expanded.users ? undefined : SECTION_PREVIEW)
                                    .map((u) => (
                                        <SearchUserRow key={`u:${u.address}`} user={u} onGo={go} />
                                    ))}
                                {r && !expanded.users && r.users.length > SECTION_PREVIEW && (
                                    <div
                                        className="global-result-item gsr-empty gsr-more"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setExpanded((x) => ({ ...x, users: true }))}
                                    >
                                        {`+ ${r.users.length - SECTION_PREVIEW} more`}
                                    </div>
                                )}

                                {r && r.artworks.length > 0 && (
                                    <div className="settings-header gsr-header">Outputs</div>
                                )}
                                {r && r.artworks
                                    .slice(0, expanded.artworks ? undefined : SECTION_PREVIEW)
                                    .map((a) => (
                                    <div
                                        key={`a:${a.project_id}:${a.token_id}`}
                                        className="global-result-item gsr-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => go(e, `/art/${a.project_id}/${a.token_id}`)}
                                    >
                                        <ArtThumb slug={a.project_id} id={a.token_id} />
                                        <span className="gsr-main">{pieceName(a.project_title, a.token_id)}</span>
                                        <span className="gsr-sub">
                                            {a.label
                                                ? `${a.label} · ⚬${VS15} ${a.followers}`
                                                : `⚬${VS15} ${a.followers}`}
                                        </span>
                                    </div>
                                ))}
                                {r && !expanded.artworks && r.artworks.length > SECTION_PREVIEW && (
                                    <div
                                        className="global-result-item gsr-empty gsr-more"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => setExpanded((x) => ({ ...x, artworks: true }))}
                                    >
                                        {`+ ${r.artworks.length - SECTION_PREVIEW} more`}
                                    </div>
                                )}

                                {r && r.soundtracks.length > 0 && (
                                    <div className="settings-header gsr-header">Soundtracks</div>
                                )}
                                {r && r.soundtracks.map((s) => (
                                    <div
                                        key={`s:${s.project_id}`}
                                        className="global-result-item gsr-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => go(e, `/art/${s.project_id}`)}
                                    >
                                        <span className="gsr-ic">{`▶${VS15}`}</span>
                                        <span className="gsr-main">{s.label}</span>
                                        <span className="gsr-sub">{s.project_title}</span>
                                    </div>
                                ))}

                                {r && r.traits.length > 0 && (
                                    <div className="settings-header gsr-header">Traits</div>
                                )}
                                {r && r.traits.map((t) => (
                                    <div
                                        key={`t:${t.project_id}:${t.trait_name}:${t.value}`}
                                        className="global-result-item gsr-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={(e) => go(e, `/art/${t.project_id}`)}
                                    >
                                        <span className="gsr-ic">{`⨝${VS15}`}</span>
                                        <span className="gsr-main">{t.value}</span>
                                        <span className="gsr-sub">{`${t.trait_name} · ${t.project_title}`}</span>
                                    </div>
                                ))}

                                {pageHits.length === 0 &&
                                    r &&
                                    r.answers.length === 0 &&
                                    r.projects.length === 0 &&
                                    r.users.length === 0 &&
                                    r.artworks.length === 0 &&
                                    r.soundtracks.length === 0 &&
                                    r.traits.length === 0 &&
                                    !searching && (
                                        <div className="global-result-item gsr-empty">{`⌕${VS15} THE STONE IS SILENT`}</div>
                                    )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
