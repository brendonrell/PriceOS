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
import { useToast } from '../../lib/state/ToastContext';
import SpriteFace from '../SpriteFace';
import { projectSpriteFace } from '../../lib/project/projectSprite';
import { parseEtch, commitEtch, resolveProject } from '../../lib/stone/etch';
import { matchCast, type CastTarget } from '../../lib/stone/cast';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useSort } from '../../lib/state/SortContext';
import { useModal } from '../../lib/state/ModalContext';
import { useWorkspaces } from '../../lib/state/WorkspacesContext';
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
    const open = stage === 'open';
    const setOpen = (v: boolean) => setStage(v ? 'open' : 'hidden');
    const [value, setValue] = useState('');
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [searching, setSearching] = useState(false);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    /** The stone's own confirmation line after a commit ("✓ ETCHED · …"). */
    const [etched, setEtched] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    const searchingNow = value.trim().length > 0;

    /* ETCH — a verb word turns the line into a creation plan; bare words
       stay GO/FIND. Pure parse, runs every keystroke. */
    const etchPlan = useMemo(() => parseEtch(value), [value]);

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
        /* An ETCH line never hits search — the preview chip owns the panel
           (and "todo: buy prisms" is not a search query). */
        if (q.length < 2 || parseEtch(q)) {
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
        const m = /^(.+?)\s+floor\??$/i.exec(value.trim());
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
    }, [value, results]);

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

    /* ── open: tapping the peek pill. focus() runs synchronously inside
       the gesture handler so iOS raises the keyboard. ── */
    const openStone = () => {
        inputRef.current?.focus();
        setStage('open');
    };

    /* Reveal gesture — the stone is INVISIBLE at rest. A swipe UP that
       starts near the bottom edge summons the skinny peek pill. Window
       listeners (no DOM strip, so nothing under the edge loses its taps);
       the start zone sits above the iOS home-indicator band so the system
       gesture keeps winning the very edge. Desktop: gliding the pointer
       onto the bottom edge peeks it too. */
    const revealTouch = useRef<{ y: number } | null>(null);
    useEffect(() => {
        if (stage !== 'hidden') return;
        const onTouchStart = (e: TouchEvent) => {
            const y = e.touches[0]?.clientY;
            if (y == null) return;
            revealTouch.current =
                y > window.innerHeight - 96 ? { y } : null;
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

    /* Any tap outside the vessel puts the stone away (peek or open). */
    const vesselRef = useRef<HTMLDivElement | null>(null);
    const peekRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        if (stage === 'hidden') return;
        const onDown = (e: PointerEvent) => {
            const t = e.target as Node;
            if (vesselRef.current?.contains(t) || peekRef.current?.contains(t)) return;
            setStage('hidden');
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [stage]);

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
            {/* the peek pill — the stone surfacing (swipe-up summons it) */}
            <div
                ref={peekRef}
                className={`stone-peek${stage === 'peek' ? '' : ' stone-peek--hidden'}`}
                id="commandStoneBar"
                role="button"
                tabIndex={stage === 'peek' ? 0 : -1}
                aria-label="The Command Stone"
                onClick={openStone}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openStone();
                    }
                }}
            >
                <span className="stone-peek-glyph">{STONE_GLYPH}</span>
            </div>

            {/* the floating vessel — deck of widgets above, the pill you
                type into below. Mounted always so focus() can fire inside
                the opening gesture (iOS keyboard). */}
            <div
                ref={vesselRef}
                className={`stone-float${open ? ' stone-float--open' : ''}`}
                id="commandStonePanel"
                aria-hidden={!open}
                onPointerDown={onStagePointerDown}
                onPointerMove={onStagePointerMove}
                onPointerUp={clearPress}
                onPointerCancel={clearPress}
            >
                    <div className="stone-deck stone-results">
                        {searchingNow && (pageHits.length > 0 || r) && (
                            <div className="stone-widget stone-widget-results">
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

                                {/* answer AND act — the anchor offer rides
                                    a floor answer, one tap to carve it. */}
                                {anchorOffer && (
                                    <div
                                        className="stone-etch-chip stone-offer-chip"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => {
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
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') e.preventDefault();
                                        }}
                                    >
                                        {`↧${VS15} anchor it at ◊${anchorOffer.price}?`}
                                    </div>
                                )}

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
                                    <div className="global-result-item gsr-empty">{`⌕${VS15} reading the stone…`}</div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* the pill — you type right in it; ⌘ carved on the left,
                        the flashing block alone until the first character */}
                    <div className="stone-pill">
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
                                        if (etchPlan) doEtch();
                                        else if (castHit) doCast(castHit);
                                        else enterToGo();
                                    }
                                }}
                            />
                        </div>
                    </div>
            </div>
        </>
    );
}
