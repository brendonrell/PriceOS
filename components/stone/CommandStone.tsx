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
 *   - GO/FIND ride the real Global Search (/api/search — Rule #0, one
 *     door): live results, inline answers, pages, Enter = top hit.
 *     Presentation is the stone's own (StoneDeck, stage 4): TARS-voice
 *     answers + glanceable cards, plus the summonable widget deck.
 *
 * Later stages (the brief): ETCH (natural-language creation with the
 * preview chip) · CAST (spells + workspaces by name) · the widget deck
 * ("almost WatchOS in nature") · Ask PD folded in · docs search.
 *
 * The panel stays mounted while closed (translateY(100%)) so the input
 * exists at gesture time — focus() fires synchronously inside the tap/
 * swipe handler, which is what makes iOS raise the keyboard.
 */

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { parseEtch, commitEtch, resolveProject } from '../../lib/stone/etch';
import { subscribeFm, getFm, fmPlay, fmToggle, fmNext } from '../../lib/fm/fmBus';
import { getProject } from '../../lib/project/registry';
import { matchCast, type CastTarget } from '../../lib/stone/cast';
import { parseWidget } from '../../lib/stone/widgets';
import { runStoneCommand, applyStoneStyle } from '../../lib/stone/stoneStyle';
import { expandFollowUp, type StoneSubject } from '../../lib/stone/memory';
import { WidgetDeck, SearchDeck } from './StoneDeck';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useSort } from '../../lib/state/SortContext';
import { useModal } from '../../lib/state/ModalContext';
import { useWorkspaces } from '../../lib/state/WorkspacesContext';
import { PAGE_ROWS } from '../dropdown/GlobalSearchBar';
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
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    /* The vessel's three states (Brendon's spec, corrected 2026-07-20 —
       the full-screen takeover was wrong):
         hidden — NOTHING shows. A swipe up from the bottom edge reveals…
         peek   — …the skinny pill. Tapping it expands to…
         open   — …the floating pill you type right into; results pop up
                  ABOVE it as black widget cards (the watch-style deck). */
    const [stage, setStage] = useState<'hidden' | 'peek' | 'open'>('hidden');

    /* The bottom band is SHARED REAL ESTATE (Brendon, 2026-07-20: the stone
       and the miniplayer must always react to each other). The stone
       broadcasts its stage as body classes; fm.css reads them — the deck
       lifts above the resting bar, and docks away while the tab is out. */
    useEffect(() => {
        document.body.classList.toggle('pd-stone-peek', stage === 'peek');
        document.body.classList.toggle('pd-stone-open', stage === 'open');
        return () => {
            document.body.classList.remove('pd-stone-peek', 'pd-stone-open');
        };
    }, [stage]);

    /* The stealth console's persisted style (accent hex · forced stage)
       repaints on boot — stoneStyle.ts, deliberately absent from the docs. */
    useEffect(() => { applyStoneStyle(); }, []);
    const open = stage === 'open';
    const setOpen = (v: boolean) => setStage(v ? 'open' : 'hidden');
    const [value, setValue] = useState('');
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [searching, setSearching] = useState(false);
    /** The stone's own confirmation line after a commit ("✓ ETCHED · …"). */
    const [etched, setEtched] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const searchingNow = value.trim().length > 0;

    /* The pd miniplayer's live state — the Stone carries a "miniplayer
       mini" widget when a search surfaces soundtracks (one player, driven
       over the fmBus; audio lives in FmBar and survives the stone). */
    const fm = useSyncExternalStore(subscribeFm, getFm, getFm);

    /* ETCH — a verb word turns the line into a creation plan; bare words
       stay GO/FIND. Pure parse, runs every keystroke. Always on the RAW
       line — memory never rewrites a carving. */
    const etchPlan = useMemo(() => parseEtch(value), [value]);

    /* MEMORY (stage 5) — the stone remembers its last subject. "prisms
       floor" then a bare "ath" → the stone hears "prisms ath"; a bare
       "calc 0.5" or "gallery" or "30d" rides the same subject. The heard
       line drives widgets + search; ETCH and CAST stay on the raw line. */
    const [subject, setSubject] = useState<StoneSubject | null>(null);
    const line = useMemo(
        () => expandFollowUp(value, subject) ?? value,
        [value, subject]
    );

    /* THE WIDGET DECK (stage 4) — a summon word calls its hand: calendar ·
       priceday · calc · dossier · gallery · matrix · ascii · docs · glance ·
       trend. ETCH and CAST outrank a summon (a workspace named "calendar"
       stays castable). */
    const widgetPlan = useMemo(() => parseWidget(line), [line]);

    /* CAST — an exact toggle/workspace name flips it. The "spells" are
       just settings with a fun name (Brendon): a cast is a plain toggle +
       the pill's own toast, nothing more. ETCH wins on collision. */
    const { notifs, toggle } = usePdNotifs();
    const { sort, setSort, cycleSort } = useSort();
    const { open: openModal } = useModal();
    const { workspaces, loadWorkspace } = useWorkspaces();
    const castHit = useMemo(
        () => (etchPlan ? null : matchCast(value, workspaces)),
        [value, workspaces, etchPlan]
    );
    /* Cast outranks a summon (a workspace named "calendar" stays castable);
       ETCH outranks both. */
    const activeWidget = useMemo(
        () => (etchPlan || castHit ? null : widgetPlan),
        [etchPlan, castHit, widgetPlan]
    );
    /* MEMORY capture from summoned hands — a dossier's person or a
       summoned project becomes the subject too. */
    useEffect(() => {
        if (!activeWidget) return;
        if (activeWidget.kind === 'dossier') {
            setSubject({ kind: 'user', name: `@${activeWidget.name}` });
        } else if (
            (activeWidget.kind === 'gallery' || activeWidget.kind === 'calc') &&
            activeWidget.title
        ) {
            setSubject({ kind: 'project', name: activeWidget.title });
        } else if (activeWidget.kind === 'trend') {
            setSubject({ kind: 'project', name: activeWidget.title });
        }
    }, [activeWidget]);
    const castActive = (hit: CastTarget): boolean => {
        if (hit.kind === 'spell') return !!notifs[hit.spell.flag];
        if (hit.kind === 'mode') {
            if (hit.key === 'fog') return sort === 'fog';
            const flags = {
                degen: notifs.degen, audience: notifs.audience,
                redacted: notifs.redactedMode, thewatch: notifs.watch,
                npc: notifs.spell_npc, stargazing: notifs.stargazing,
                echo: notifs.echo,
            } as const;
            return flags[hit.key];
        }
        return false;
    };
    const doCast = (hit: CastTarget) => {
        const confirmAnd = (msg: string) => {
            showToast(msg);
            setEtched(`✓ ${msg}`);
            setValue('');
            inputRef.current?.focus();
        };
        if (hit.kind === 'workspace') {
            loadWorkspace(hit.id); // toasts itself (persona flourishes incl.)
            setEtched(`✓ Workspace: ${hit.label.toUpperCase()}`);
            setValue('');
            inputRef.current?.focus();
            return;
        }
        if (hit.kind === 'spell') {
            const s = hit.spell;
            // The pills that open a surface / need consent hand off to
            // their modal — the stone folds so the modal is visible.
            if (s.id === 'spitebook' || s.id === 'tarot' ||
                (s.id === 'panopticon' && !notifs.spell_panopticon)) {
                openModal(
                    s.id === 'spitebook' ? 'spiteBook'
                        : s.id === 'tarot' ? 'tarot'
                        : 'panopticonConfirm'
                );
                setOpen(false);
                setValue('');
                return;
            }
            if (s.id === 'gravitydrop') { confirmAnd('????'); return; }
            const next = !notifs[s.flag];
            toggle(s.flag);
            const flavour: Record<string, string> = {
                cartel: '⟁ You + Your Mutuals = The Cabal ⟁',
                celestial: '☽ Reading the Birth Skies ☽',
                gossip: '⑃ Rumor Has It… ⑃',
                sybilnet: '∾ The Net Is Cast ∾',
                arbitrage: '⇄ Reading the Spreads ⇄',
            };
            if (s.id === 'offershield' && next && typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('pd:offer-shield-cast'));
            }
            confirmAnd(
                next && flavour[s.id]
                    ? flavour[s.id]
                    : `${s.name}: ${next ? 'ON' : 'OFF'}`
            );
            return;
        }
        // hardcoded modes — same flip + toast as their pills
        switch (hit.key) {
            case 'degen': {
                const next = !notifs.degen;
                toggle('degen');
                if (next) setSort('price');
                confirmAnd(`Degen: ${next ? 'ON' : 'OFF'}`);
                return;
            }
            case 'audience': {
                const next = !notifs.audience;
                toggle('audience');
                confirmAnd(`Audience: ${next ? 'ON' : 'OFF'}`);
                return;
            }
            case 'redacted': {
                const next = !notifs.redactedMode;
                toggle('redactedMode');
                confirmAnd(`Redacted Mode: ${next ? 'ON' : 'OFF'}`);
                return;
            }
            case 'thewatch': {
                const next = !notifs.watch;
                toggle('watch');
                confirmAnd(`The Watch: ${next ? 'ON' : 'OFF'}`);
                return;
            }
            case 'npc': {
                const next = !notifs.spell_npc;
                toggle('spell_npc');
                confirmAnd(`NPC Cast: ${next ? 'ON' : 'OFF'}`);
                return;
            }
            case 'stargazing': {
                const next = !notifs.stargazing;
                toggle('stargazing');
                confirmAnd(`Stargazing Mode: ${next ? 'ON' : 'OFF'}`);
                return;
            }
            case 'echo': {
                const next = !notifs.echo;
                toggle('echo');
                confirmAnd(`Echo Chamber: ${next ? 'MUTUALS ONLY' : 'OFF'}`);
                return;
            }
            case 'fog': {
                const next = sort !== 'fog';
                cycleSort('fog');
                confirmAnd(`Fog: ${next ? 'ON' : 'OFF'}`);
                return;
            }
        }
    };

    /* Route change → the stone folds away clean (same manners as every
       overlay in the shell: nothing bleeds onto the next page). */
    useEffect(() => {
        setStage((st) => (st === 'open' ? 'peek' : st));
        setValue('');
    }, [pathname]);

    /* Escape closes (desktop keyboard crowd). */
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setStage('peek');
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

    /* LIVE search — the same debounce/abort discipline as GlobalSearchBar
       (D25): ≥2 chars, 220ms debounce, stale responses can never land. */
    useEffect(() => {
        /* The stone searches what it HEARD (the memory-expanded line) —
           a bare "ath" after "prisms floor" really asks about Prisms. */
        const q = line.trim();
        const raw = value.trim();
        /* An ETCH line never hits search — the preview chip owns the panel
           (and "todo: buy prisms" is not a search query). A widget summon
           owns it too — its card does any reading it needs itself. */
        if (raw.length < 2 || parseEtch(raw) || parseWidget(q)) {
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
    }, [value, line]);

    /* MEMORY capture — the last subject the stone resolved: the top
       project of a search, a dossier's person, or a summoned project
       hand. Persists for the session (that's the point). */
    useEffect(() => {
        if (results?.projects?.[0]) {
            setSubject({ kind: 'project', name: results.projects[0].title });
        } else if (results?.users?.[0]?.handle && (results?.projects?.length ?? 0) === 0) {
            setSubject({ kind: 'user', name: `@${results.users[0].handle}` });
        }
    }, [results]);

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

    /* ETCH commit — carve the plan through the real stores, confirm in
       the stone's own voice (plus the standard toast for the app record),
       clear the line, keep the stone open for the next command. */
    const doEtch = () => {
        if (!etchPlan) return;
        const toast = commitEtch(etchPlan);
        showToast(toast);
        setEtched(`✓ ${toast}`);
        setValue('');
        inputRef.current?.focus();
    };

    /* ANSWER AND ACT (the brief): "Fumage floor?" answers inline AND
       offers to anchor it right there. When the query reads as a floor
       question on a resolvable project and the answer carries an ETH
       number, the offer chip appears under the answers. */
    const anchorOffer = useMemo(() => {
        /* On the heard line, so a remembered-subject "floor" offers too. */
        const m = /^(.+?)\s+floor\??$/i.exec(line.trim());
        if (!m || !results) return null;
        const proj = resolveProject(m[1]);
        if (!proj) return null;
        for (const a of results.answers) {
            const priceM = /(\d+(?:\.\d+)?)\s*(?:ETH|◊)/i.exec(a.text);
            if (priceM) {
                const price = parseFloat(priceM[1]);
                if (price > 0 && isFinite(price)) return { title: proj.title, price };
            }
        }
        return null;
    }, [line, results]);

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
        if (r.soundtracks[0]) {
            const st = getProject(r.soundtracks[0].project_id)?.soundtrack;
            if (st) {
                fmPlay({ playlistId: st.playlistId, label: st.label, slug: r.soundtracks[0].project_id });
                showToast('PD miniplayer: ON AIR');
            } else {
                go(null, `/art/${r.soundtracks[0].project_id}`);
            }
            return;
        }
        if (r.traits[0]) { go(null, `/art/${r.traits[0].project_id}`); return; }
    };

    /* ── open: tapping the peek pill. focus() runs synchronously inside
       the gesture handler so iOS raises the keyboard. ── */
    const openStone = () => {
        inputRef.current?.focus();
        setStage('open');
    };

    /* Reveal gesture — the stone is INVISIBLE at rest. A swipe UP summons
       the bare peek bar. Window listeners (no DOM strip, so nothing under
       the edge loses its taps). 2026-07-20 iOS rework (Brendon: Apple
       dominates the bottom edge — Safari/app-switcher grab any swipe that
       BEGINS at the edge, and a page can never intercept that): the start
       zone is now a BAND lifted clear of the system strip — the swipe
       starts on page content in the lower quarter of the screen, at least
       ~56px above the bottom, so iOS never claims it and the gesture stays
       ours. Desktop: gliding the pointer onto the bottom edge peeks it,
       unchanged. */
    const revealTouch = useRef<{ y: number } | null>(null);
    useEffect(() => {
        if (stage !== 'hidden') return;
        const onTouchStart = (e: TouchEvent) => {
            const y = e.touches[0]?.clientY;
            if (y == null) return;
            const h = window.innerHeight;
            revealTouch.current =
                y > h - 220 && y < h - 56 ? { y } : null;
        };
        const onTouchMove = (e: TouchEvent) => {
            const start = revealTouch.current;
            const now = e.touches[0]?.clientY;
            if (!start || now == null) return;
            if (start.y - now >= SWIPE_OPEN_PX) {
                revealTouch.current = null;
                setStage('peek');
            }
        };
        const onMouseMove = (e: globalThis.MouseEvent) => {
            if (e.clientY >= window.innerHeight - 8) setStage('peek');
        };
        window.addEventListener('touchstart', onTouchStart, { passive: true });
        window.addEventListener('touchmove', onTouchMove, { passive: true });
        window.addEventListener('mousemove', onMouseMove);
        return () => {
            window.removeEventListener('touchstart', onTouchStart);
            window.removeEventListener('touchmove', onTouchMove);
            window.removeEventListener('mousemove', onMouseMove);
        };
    }, [stage]);

    /* The resting pill LIVES there while you scroll (Brendon 2026-07-20).
       An outside tap only folds the OPEN tab back to the resting pill;
       hiding is the swipe-down / long-press. */
    const vesselRef = useRef<HTMLDivElement | null>(null);
    const peekRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (stage !== 'open') return;
        const onDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (vesselRef.current?.contains(t) || peekRef.current?.contains(t)) return;
            setStage('peek');
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [stage]);

    /* Swipes on the pill itself: up opens, down puts it away (resting) or
       minimizes back to resting (open). */
    const pillTouchY = useRef<number | null>(null);
    const onPillTouchStart = (e: React.TouchEvent) => {
        pillTouchY.current = e.touches[0]?.clientY ?? null;
    };
    const makePillTouchMove = (mode: 'peek' | 'open') => (e: React.TouchEvent) => {
        const start = pillTouchY.current;
        const now = e.touches[0]?.clientY;
        if (start == null || now == null) return;
        if (start - now >= SWIPE_OPEN_PX && mode === 'peek') {
            pillTouchY.current = null;
            openStone();
        } else if (now - start >= SWIPE_OPEN_PX) {
            pillTouchY.current = null;
            if (mode === 'open') { inputRef.current?.blur(); setStage('peek'); }
            else setStage('hidden');
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
    /* The tab renders ONLY when it has something to say — an empty open
       stone is just the pill + the flashing block (Brendon's idle). */
    const cmdCardOn =
        (etched && !searchingNow) || !!etchPlan || !!castHit || (searchingNow && searching && !r);
    const hasTab =
        (searchingNow && (pageHits.length > 0 || !!r)) || cmdCardOn || !!activeWidget;

    return (
        <>
            {/* the peek pill — the stone surfacing (swipe-up summons it) */}
            <div
                ref={peekRef}
                className={`stone-peek${stage === 'peek' ? '' : ' stone-peek--hidden'}`}
                id="commandStoneBar"
                role="button"
                tabIndex={stage === 'peek' ? 0 : -1}
                aria-label="The Command Stone"
                onClick={openStone}
                onTouchStart={onPillTouchStart}
                onTouchMove={makePillTouchMove('peek')}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openStone();
                    }
                }}
            >
                {/* No glyph — the resting stone is a bare half-height black
                    bar (Brendon, 2026-07-20). */}
            </div>

            {/* the floating vessel — deck of widgets above, the pill you
                type into below. Mounted always so focus() can fire inside
                the opening gesture (iOS keyboard). */}
            <div
                ref={vesselRef}
                className={`stone-float${open ? ' stone-float--open' : ''}${open && hasTab ? ' stone-float--docked' : ''}`}
                id="commandStonePanel"
                aria-hidden={!open}
                onPointerDown={onStagePointerDown}
                onPointerMove={onStagePointerMove}
                onPointerUp={clearPress}
                onPointerCancel={clearPress}
            >
                    {hasTab && (
                    <div className="stone-deck stone-results">
                        {/* THE WIDGET DECK — a summoned hand owns the tab */}
                        {activeWidget && (
                            <WidgetDeck
                                plan={activeWidget}
                                address={siweAddress}
                                onGo={go}
                                onAct={(t) => showToast(t)}
                            />
                        )}

                        {/* GO/FIND — answers in the TARS voice, results as
                            glanceable cards (StoneDeck's presentation) */}
                        {!activeWidget && searchingNow && (pageHits.length > 0 || r) && (
                            <SearchDeck
                                r={r}
                                pageHits={pageHits}
                                anchorOffer={anchorOffer}
                                onAnchor={() => {
                                    if (!anchorOffer) return;
                                    const toast = commitEtch({
                                        kind: 'anchor',
                                        title: anchorOffer.title,
                                        price: anchorOffer.price,
                                        chip: '',
                                    });
                                    showToast(toast);
                                    setEtched(`✓ ${toast}`);
                                    setValue('');
                                    inputRef.current?.focus();
                                }}
                                onGo={go}
                            />
                        )}

                        {/* miniplayer mini — soundtrack hits become a tiny
                            playable deck; the audio lives in the real
                            miniplayer below (one player, bus-driven) */}
                        {searchingNow && r && r.soundtracks.length > 0 && (
                            <div className="stone-widget sw-card stone-widget-fm">
                                {/* lowercase by Brendon's word-lock — the pd
                                    miniplayer is a lowercase name, always */}
                                <div className="sw-title">
                                    <span className="sw-title-glyph">{`▶${VS15}`}</span>
                                    <span className="sw-title-label sw-title-label--lower">miniplayer mini</span>
                                </div>
                                {r.soundtracks.map((s) => (
                                    <div
                                        key={`s:${s.project_id}`}
                                        className="sw-hit sw-tap"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
                                            const st = getProject(s.project_id)?.soundtrack;
                                            if (!st) { go(null, `/art/${s.project_id}`); return; }
                                            fmPlay({ playlistId: st.playlistId, label: st.label, slug: s.project_id });
                                            showToast('PD miniplayer: ON AIR');
                                        }}
                                    >
                                        <span className="sw-hit-ic">{`▶${VS15}`}</span>
                                        <span className="sw-hit-body">
                                            <span className="sw-hit-main">{s.label}</span>
                                            <span className="sw-hit-sub">{s.project_title}</span>
                                        </span>
                                    </div>
                                ))}
                                {fm.status !== 'idle' && fm.station && (
                                    <div className="stone-fm-transport">
                                        <button type="button" className="stone-fm-key" onClick={fmToggle}>
                                            {fm.status === 'playing' ? 'PAUSE' : `▶${VS15} PLAY`}
                                        </button>
                                        <button type="button" className="stone-fm-key" onClick={fmNext}>NEXT</button>
                                        <span className="stone-fm-now">{fm.trackTitle || fm.station.label}</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* the command widget — carve/cast feedback, always
                            the card nearest the pill */}
                        {((etched && !searchingNow) || etchPlan || castHit || (searchingNow && searching && !r)) && (
                            <div className="stone-widget stone-widget-cmd">
                                {etched && !searchingNow && (
                                    <div className="stone-etched">{etched}</div>
                                )}
                                {/* ETCH preview chip — the plan flashes before
                                    it commits; tap (or Enter) carves it. */}
                                {etchPlan && (
                                    <div
                                        className="stone-etch-chip"
                                        role="button"
                                        tabIndex={0}
                                        onClick={doEtch}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                doEtch();
                                            }
                                        }}
                                    >
                                        {etchPlan.chip}
                                    </div>
                                )}
                                {/* CAST — the matched toggle/persona, one tap */}
                                {castHit && (
                                    <div
                                        className="stone-etch-chip"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => doCast(castHit)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                doCast(castHit);
                                            }
                                        }}
                                    >
                                        {castHit.kind === 'workspace'
                                            ? `Workspace · ${castHit.label} — load?`
                                            : `${'icon' in castHit && castHit.icon ? `${castHit.icon} ` : ''}${castHit.label} — ${castActive(castHit) ? 'off?' : 'cast?'}`}
                                    </div>
                                )}
                                {searchingNow && searching && !r && (
                                    <div className="sw-say">{`⌕${VS15} READING THE STONE…`}</div>
                                )}
                            </div>
                        )}
                    </div>

                    )}

                    {/* the pill — you type right in it; ⌘ carved on the left,
                        the flashing block alone until the first character */}
                    <div
                        className="stone-pill"
                        onTouchStart={onPillTouchStart}
                        onTouchMove={makePillTouchMove('open')}
                    >
                        <span className="stone-pill-glyph">{STONE_GLYPH}</span>
                        <div className="stone-input-row">
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
                                onChange={(e) => {
                                    setValue(e.target.value);
                                    setEtched(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        /* The stealth console outranks all —
                                           it starts with the stone's own
                                           name, nothing else does. */
                                        const stone = runStoneCommand(value);
                                        if (stone) {
                                            showToast(stone.line);
                                            setEtched(`✓ ${stone.line}`);
                                            setValue('');
                                            return;
                                        }
                                        if (etchPlan) doEtch();
                                        else if (castHit) doCast(castHit);
                                        else enterToGo();
                                    }
                                }}
                            />
                        </div>
                        {/* THE THIRD FACE of the PD miniplayer (Brendon,
                            2026-07-20): while the tab is out the deck docks
                            away, and live audio shows as this LED on the
                            stone itself — tap toggles play/pause through
                            the one-player bus. */}
                        {(fm.status === 'playing' || fm.status === 'paused') && (
                            <button
                                type="button"
                                className={`stone-fm-led${fm.status === 'playing' ? ' stone-fm-led--on' : ''}`}
                                onClick={(e) => { e.stopPropagation(); fmToggle(); }}
                                title={fm.status === 'playing' ? 'ON AIR — tap to pause' : 'Paused — tap to play'}
                                aria-label="PD miniplayer"
                            >
                                {fm.status === 'playing' ? `▶${VS15}` : '‖'}
                            </button>
                        )}
                    </div>
            </div>
        </>
    );
}
