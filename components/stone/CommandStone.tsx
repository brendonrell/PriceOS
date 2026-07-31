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
 *   - SWIPE DOWN on the pill → minimizes to the dot. ⛔ THE ONLY minimize
 *     gesture (Brendon, 2026-07-27): the stone NEVER minimizes on its own —
 *     no route-change park, no long-press collapse, no Escape. Only the
 *     user's deliberate swipe down (or the typed "minimize" command, his
 *     2026-07-21 order) parks it at the dot.
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

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { parseEtch, commitEtch, resolveProject } from '../../lib/stone/etch';
import { subscribeFm, getFm, fmPlay, fmToggle, fmNext } from '../../lib/fm/fmBus';
import { getProject } from '../../lib/project/registry';
import { matchCast, type CastTarget } from '../../lib/stone/cast';
import { MOODS, MARKET_MOODS, type MoodDef, type MarketMoodDef } from '../../lib/stone/moods';
import { parseWidget } from '../../lib/stone/widgets';
import { runStoneCommand, applyStoneStyle } from '../../lib/stone/stoneStyle';
import { expandFollowUp, type StoneSubject } from '../../lib/stone/memory';
import { writeLastLine } from '../../lib/stone/lastLine';
import { readStage } from '../../lib/npc/awareness';
import { readPieceInView } from '../../lib/npc/inview';
import { deepThought } from '../../lib/stone/deepThought';
import { speak, goodbye, type StoneMoment } from '../../lib/stone/voice';
import { commitEtchBulk } from '../../lib/stone/etch';
import { recordSubject, latestSubject, readSubjectHistory, recallSubject } from '../../lib/stone/subjects';
import { renderPing, pingHref } from '../../lib/pings/render';
import { usePings } from '../../lib/state/PingsContext';
import { useColorway } from '../../lib/state/ColorwayContext';
import { allProjects } from '../../lib/project/registry';
import { WidgetDeck, SearchDeck, NewsDeck, type FooterAct, type NewsItem } from './StoneDeck';
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

/* Typed MINIMIZE (Brendon, 2026-07-21): "minimize" — or a natural variant —
   parks the stone at the dot, exactly like the swipe/long-press gesture. */
const MINIMIZE_RE =
    /^\s*(minimi[sz]e|min|dock|shrink|tuck|stow)(\s+it)?\s*[.!]*\s*$/i;
/* Typed CLOSE: "close" — or a natural variant — fully dismisses the stone.
   Both anchored so real queries never match. */
const CLOSE_RE =
    /^\s*(close|dismiss|hide|exit|quit|leave|done|bye|go\s*away|shut(\s*down)?)(\s+it)?\s*[.!]*\s*$/i;

export default function CommandStone() {
    const { siweAddress, needsSignup, handle: myHandle } = useAuth();
    const { showToast } = useToast();
    const router = useRouter();
    const pathname = usePathname();

    /* The vessel's three states (Brendon's spec, 2026-07-21 — triple-tap
       rework):
         hidden — NOTHING shows. A TRIPLE-TAP on the page background summons…
         open   — …the floating pill you type right into; results pop up
                  ABOVE it as black widget cards (the watch-style deck).
         dot    — minimized to a single corner dot (the old miniplayer nub);
                  tap it to reopen. Triple-tap the bg again fully closes. */
    const [stage, setStage] = useState<'hidden' | 'open' | 'dot'>('hidden');

    /* The bottom band is SHARED REAL ESTATE (Brendon, 2026-07-20: the stone
       and the miniplayer must always react to each other). The stone
       broadcasts its OPEN stage as a body class; fm.css reads it and docks
       the miniplayer away while the vessel is out. (The minimized stone is a
       corner dot, so it never fights the centered deck.) */
    useEffect(() => {
        document.body.classList.toggle('pd-stone-open', stage === 'open');
        return () => { document.body.classList.remove('pd-stone-open'); };
    }, [stage]);

    /* THE BOTTOM BAND IS SHARED — each gets its own spot (Brendon, 2026-07-26).
       The stone stays anchored where it is and publishes how much of the band
       it occupies; the miniplayer reads this and sits ABOVE it. Nothing is
       resized and nothing is hidden — they simply stack.

       Measured off the live element rather than hardcoded, because the vessel's
       height changes with what's in it (typing view, results, the widgets
       deck). The DOT state reports its full touch pad, not the 9px disc — the
       pad is what the player would actually collide with. */
    useEffect(() => {
        const publish = () => {
            let h = 0;
            if (stage === 'open') {
                /* the vessel plus the 12px it is translated down by */
                h = (vesselRef.current?.getBoundingClientRect().height ?? 0) + 12;
            } else if (stage === 'dot') {
                /* 9px disc + the 14px invisible tap pad below it */
                h = 23;
            }
            /* The 4px breathing gap (halved from 8 — Brendon, 2026-07-27:
               nudge the player closer to the stone) rides INSIDE the published
               value, so it only exists while the stone does — at 0 the player
               sits exactly where it always has, with nothing added. */
            document.body.style.setProperty('--pd-stone-h', h > 0 ? `${Math.round(h) + 4}px` : '0px');
        };
        publish();
        /* The vessel grows and shrinks as results come and go. */
        const ro = vesselRef.current ? new ResizeObserver(publish) : null;
        if (ro && vesselRef.current) ro.observe(vesselRef.current);
        window.addEventListener('resize', publish);
        return () => {
            ro?.disconnect();
            window.removeEventListener('resize', publish);
            document.body.style.setProperty('--pd-stone-h', '0px');
        };
    }, [stage]);

    /* The stealth console's persisted style (accent hex · forced stage)
       repaints on boot — stoneStyle.ts, deliberately absent from the docs. Also
       repaints when the account snapshot hydrates the style (login anywhere). */
    useEffect(() => {
        applyStoneStyle();
        const onChange = () => applyStoneStyle();
        window.addEventListener('pd:stone-style-changed', onChange);
        return () => window.removeEventListener('pd:stone-style-changed', onChange);
    }, []);

    /* THE VOICE — the bubble's TWO-ROW header (Brendon, 2026-07-28): the
       spoken line on top, the drier aside beneath. One module owns every
       line (lib/stone/voice); the pick is seeded by the heard line so it
       never flickers mid-read. Priority: a fresh confirmation > the
       summoned hand > an etch or cast on offer > the search read >
       listening. */
    const speakNow = () => {
        let moment: StoneMoment;
        let seed = line;
        if (etched) {
            moment = { kind: 'etched', text: etched };
            seed = etched;
        } else if (activeWidget) {
            const key = activeWidget.kind === 'firstmint' && activeWidget.mine
                ? 'firstmint_mine'
                : activeWidget.kind;
            moment = { kind: 'widget', widget: key };
        } else if (etchPlan) moment = { kind: 'etch-offer' };
        else if (castHit) moment = { kind: 'cast-offer' };
        else if (thought) moment = { kind: 'thought' };
        else if (searchingNow && results) {
            const n = (results.projects?.length ?? 0) + (results.users?.length ?? 0) + (results.answers?.length ?? 0);
            moment = { kind: n > 0 ? 'found' : 'nothing' };
        } else if (searchingNow && searching) moment = { kind: 'searching' };
        else if (newsOn) moment = { kind: 'news' };
        else moment = { kind: 'listening' };
        return speak(moment, seed);
    };

    const open = stage === 'open';
    const setOpen = (v: boolean) => setStage(v ? 'open' : 'hidden');
    const [value, setValue] = useState('');
    /* THE LAST BUBBLE (Brendon, 2026-07-22) — remember the current line so a
       tap-away → reopen brings the same speech bubble back. Only real (non-empty)
       lines are saved, so clearing/closing never wipes the memory. Account-backed
       (lib/stone/lastLine). */
    useEffect(() => { if (value.trim()) writeLastLine(value); }, [value]);
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [searching, setSearching] = useState(false);
    /** The stone's own confirmation line after a commit ("✓ ETCHED · …"). */
    const [etched, setEtched] = useState<string | null>(null);
    /** DEEP THOUGHT — the TARS × Deep Thought line shown when a typed word
        turns up nothing PD (set by its effect; a word it knows gets a quip). */
    const [thought, setThought] = useState<string | null>(null);
    const thoughtWordRef = useRef<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    /* THE FOOTER — the bubble's one action button, always the last row
       (Brendon's anatomy, 2026-07-28): header speaks · widgets sandwich ·
       the footer acts. Priority: a carving on offer > a cast on offer >
       the summoned hand's registered act > the floor-answer anchor offer. */
    const [widgetAct, setWidgetAct] = useState<FooterAct | null>(null);
    const onFooter = useCallback((a: FooterAct | null) => setWidgetAct(a), []);
    /* The footer can seed the pill (the day widget's "etch a to-do here"). */
    const onSeed = useCallback((text: string) => {
        setValue(text);
        setEtched(null);
        inputRef.current?.focus();
    }, []);

    /* THE NEWS (Brendon, 2026-07-28) — the stone speaks FIRST only with
       real reason: unread pings. On summon, before you type, it leads with
       what happened; the first keystroke stands it down for this visit.
       The parked dot pulses only while it actually knows something. */
    const { state: pings, markAllRead } = usePings();
    const [newsSeen, setNewsSeen] = useState(false);
    useEffect(() => { if (stage === 'open') setNewsSeen(false); }, [stage]);
    const newsItems = useMemo<NewsItem[]>(
        () => pings.items
            .filter((p) => !p.read)
            .slice(0, 5)
            .map((p) => {
                const rp = renderPing(p);
                return { id: rp.id, icon: rp.icon, handle: rp.handle, action: rp.action, href: pingHref(p) };
            }),
        [pings.items],
    );

    /* The triple-tap summon reads live stage + toast through refs so its one
       document listener never re-binds mid-gesture (a re-bind would zero the
       tap count between taps). */
    const stageRef = useRef(stage);
    useEffect(() => { stageRef.current = stage; });
    const showToastRef = useRef(showToast);
    useEffect(() => { showToastRef.current = showToast; });

    /* On a deliberate close, the toast draws the stone's face + one of its
       lines (rolled fresh — lib/stone/voice owns the bench). */
    const goodbyeToast = () => {
        showToast(`${STONE_GLYPH} ${goodbye()} ${STONE_GLYPH}`);
    };

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
    /* LONG MEMORY (2026-07-28) — the subject survives sessions: boots from
       the device history, and every resolved subject is recorded to it. */
    const [subject, setSubject] = useState<StoneSubject | null>(() => latestSubject());
    useEffect(() => { if (subject) recordSubject(subject); }, [subject]);
    const line = useMemo(() => {
        const expanded = expandFollowUp(value, subject);
        if (expanded) return expanded;
        /* RECALL — "that project from tuesday" resolves from the history
           and the stone hears the remembered name. */
        return recallSubject(value, readSubjectHistory()) ?? value;
    }, [value, subject]);

    /* THE WIDGET DECK (stage 4) — a summon word calls its hand: calendar ·
       priceday · calc · dossier · gallery · matrix · ascii · docs · glance ·
       trend. ETCH and CAST outrank a summon (a workspace named "calendar"
       stays castable). SEEING fills the sight-questions ("why is this
       rare" · "good price?") with the piece actually on screen. */
    const widgetPlan = useMemo(() => {
        const p = parseWidget(line);
        if (!p) return null;
        if (p.kind === 'why' && p.slug == null) {
            const piece = readPieceInView();
            if (piece) {
                return {
                    ...p,
                    slug: piece.slug,
                    title: getProject(piece.slug)?.displayName ?? piece.slug,
                    id: piece.id,
                };
            }
        }
        if (p.kind === 'verdict' && p.slug == null) {
            const piece = readPieceInView();
            if (piece) {
                return { ...p, slug: piece.slug, title: getProject(piece.slug)?.displayName ?? piece.slug };
            }
            if (subject?.kind === 'project') {
                const proj = resolveProject(subject.name);
                if (proj) return { ...p, slug: proj.slug, title: proj.title };
            }
        }
        return p;
    }, [line, subject]);

    /* CAST — an exact toggle/workspace name flips it. The "spells" are
       just settings with a fun name (Brendon): a cast is a plain toggle +
       the pill's own toast, nothing more. ETCH wins on collision. */
    const { notifs, toggle } = usePdNotifs();
    const { sort, setSort, cycleSort } = useSort();
    const { open: openModal } = useModal();
    const { workspaces, loadWorkspace } = useWorkspaces();
    /* THE MOODS (Brendon, 2026-07-28) — one castable word bundles colorway
       + ambient light + the DJ (cozy generalized into the registry,
       lib/stone/moods). The same word lifts it; the colorway you were
       wearing BEFORE any mood comes back — switching moods mid-wear keeps
       the original. A mood is worn when the page matches its recipe, so
       only one can be on at a time (each wears its own colorway). */
    const { colorway, setColorway } = useColorway();
    const moodPrevColorway = useRef<typeof colorway>(null);
    const isMoodOn = (m: MoodDef) =>
        colorway === m.colorway && notifs.ambientStrip === m.ambient;
    const wornMood = MOODS.find(isMoodOn) ?? null;
    /* The DJ's pick — a held project's soundtrack, else any soundtracked
       project; rotates with the day so it never gets stale. */
    const djPlay = async () => {
        let slugs: string[] = [];
        try {
            const r = await fetch(`/api/user/${siweAddress?.toLowerCase()}/owned-projects`);
            const d = r.ok ? await r.json() : null;
            slugs = (d?.slugs ?? []) as string[];
        } catch { /* holdings unreadable → the full catalog below */ }
        const withSt = (list: string[]) => list.filter((s) => getProject(s)?.soundtrack);
        let pool = withSt(slugs);
        if (pool.length === 0) pool = allProjects().filter((p) => p.soundtrack).map((p) => p.slug);
        if (pool.length === 0) return false;
        const day = Math.floor(Date.now() / 86_400_000);
        const slug = pool[day % pool.length];
        const st = getProject(slug)?.soundtrack;
        if (!st) return false;
        fmPlay({ playlistId: st.playlistId, label: st.label, slug });
        return true;
    };
    /* Wear / lift a mood — the cozy execution, data-driven. Returns the
       toast line (casing law: the thing that changed screams). */
    const castMood = (m: MoodDef): string => {
        if (isMoodOn(m)) {
            if (notifs.ambientStrip) toggle('ambientStrip');
            setColorway(moodPrevColorway.current ?? null);
            /* A mood that started the DJ hushes them on the way out; a
               mood that left the music alone keeps leaving it alone. */
            if (m.dj === 'play' && fm.status === 'playing') fmToggle();
            return `${m.label}: OFF`;
        }
        /* Entering from bare walls remembers the wear; switching moods
           keeps the ORIGINAL pre-mood colorway for the eventual off. */
        if (!wornMood) moodPrevColorway.current = colorway;
        if (notifs.ambientStrip !== m.ambient) toggle('ambientStrip');
        setColorway(m.colorway);
        if (m.dj === 'play') void djPlay();
        else if (m.dj === 'hush' && fm.status === 'playing') fmToggle();
        return `${m.label}: ON`;
    };
    /* MARKET MOODS (Brendon, 2026-07-28) — the collecting lens: sort +
       real app toggles, orthogonal to the room moods (one of each at
       once). The sort you had comes back when the lens lifts. */
    const marketPrevSort = useRef<typeof sort | null>(null);
    const isMarketMoodOn = (m: MarketMoodDef) =>
        (m.sort == null || sort === m.sort) && m.on.every((f) => !!notifs[f]);
    const wornMarketMood = MARKET_MOODS.find(isMarketMoodOn) ?? null;
    const castMarketMood = (m: MarketMoodDef): string => {
        if (isMarketMoodOn(m)) {
            m.on.forEach((f) => { if (notifs[f]) toggle(f); });
            if (m.sort != null) setSort(marketPrevSort.current ?? 'id');
            return `${m.label}: OFF`;
        }
        /* Switching lenses lifts the worn one's flags first; the ORIGINAL
           pre-lens sort is remembered for the eventual off. */
        if (wornMarketMood) wornMarketMood.on.forEach((f) => { if (notifs[f]) toggle(f); });
        else marketPrevSort.current = sort;
        m.on.forEach((f) => { if (!notifs[f]) toggle(f); });
        if (m.sort != null) setSort(m.sort);
        return `${m.label}: ON`;
    };
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
        } else if (
            (activeWidget.kind === 'release' || activeWidget.kind === 'prophecy' ||
             activeWidget.kind === 'cohort') && activeWidget.title
        ) {
            setSubject({ kind: 'project', name: activeWidget.title });
        } else if (
            (activeWidget.kind === 'why' || activeWidget.kind === 'verdict') &&
            activeWidget.title
        ) {
            setSubject({ kind: 'project', name: activeWidget.title });
        }
    }, [activeWidget]);

    /* SEEING (the cast's eyes, ported to the stone) — on open, the stone
       reads what's on screen EXACTLY as the NPC Cast does: the piece in view
       (lib/npc/inview), else the page it's on (lib/npc/awareness). It adopts
       that as its subject, so a bare "floor" / "calc 0.2" / "gallery" /
       "anchor 0.5" means the very thing you're LOOKING at — no name needed.
       A neutral page (home / search) keeps whatever the stone last
       remembered; a typed subject always wins next. */
    useEffect(() => {
        if (!open) return;
        const piece = readPieceInView();
        if (piece) {
            setSubject({ kind: 'project', name: getProject(piece.slug)?.displayName ?? piece.slug });
            return;
        }
        const st = readStage(pathname);
        if ((st.kind === 'artwork' || st.kind === 'project') && st.slug) {
            setSubject({ kind: 'project', name: getProject(st.slug)?.displayName ?? st.slug });
            return;
        }
        if (st.kind === 'profile' && st.slug) {
            setSubject({ kind: 'user', name: `@${st.slug}` });
        }
    }, [open, pathname]);
    const castActive = (hit: CastTarget): boolean => {
        if (hit.kind === 'spell') return !!notifs[hit.spell.flag];
        if (hit.kind === 'mood') return isMoodOn(hit.mood);
        if (hit.kind === 'marketMood') return isMarketMoodOn(hit.mood);
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
        if (hit.kind === 'mood') {
            confirmAnd(castMood(hit.mood));
            return;
        }
        if (hit.kind === 'marketMood') {
            confirmAnd(castMarketMood(hit.mood));
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

    /* ⛔ Navigating does NOT minimize the stone (Brendon, 2026-07-27 — it was
       parking at the dot on every route change and that auto-minimize was the
       aggravation). It lives above realms: an open stone rides along open.
       Escape-to-dot and the long-press collapse are gone for the same reason —
       the ONLY minimize is the user's deliberate swipe down (or typing
       "minimize"). GO through a result still fully folds it — GO means GO. */

    /* KEYBOARD-AWARE DECK HEIGHT — while the stone is open the soft keyboard
       shrinks the visible area; track the live visual viewport into --stone-vvh
       so the deck's max-height caps to the space that's actually on-screen and
       never spills off the top while typing (Brendon, 2026-07-21). Scoped to a
       var the fixed-position stone reads — it never touches the document's own
       geometry, so it can't trigger the --app-height scroll-nudge (§ above). */
    useEffect(() => {
        if (!open || typeof window === 'undefined') return;
        const vv = window.visualViewport;
        const root = document.documentElement;
        const set = () => {
            root.style.setProperty('--stone-vvh', `${vv ? vv.height : window.innerHeight}px`);
        };
        set();
        vv?.addEventListener('resize', set);
        vv?.addEventListener('scroll', set);
        return () => {
            vv?.removeEventListener('resize', set);
            vv?.removeEventListener('scroll', set);
            root.style.removeProperty('--stone-vvh');
        };
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
        /* The Omniscience summon ("me") owns its line — it must not also offer
           the profile jump; "profile" stays the profile door (Brendon). */
        if (parseWidget(v)?.kind === 'omni') return [];
        return PAGE_ROWS.filter(
            (p) => p.kind === 'route' && p.words.some((w) => w.startsWith(v))
        ).map((p) => ({
            ...p,
            to: p.to === '__profile__'
                ? (myHandle ? `/${myHandle}` : siweAddress ? `/${siweAddress}` : '/')
                : p.to,
        }));
    }, [value, myHandle, siweAddress]);

    /* DEEP THOUGHT — when what you typed isn't an actual PD thing (the search
       came back empty, and it's not a page / command / widget / etch / cast)
       but IS a common word the stone knows, it always has SOMETHING: a
       TARS × Deep Thought line instead of a dead end (Brendon, 2026-07-21).
       Picked once per word so it doesn't flicker while you type; random, no
       repeat-tracking. A stone-console line ("stone …") owns its own answer. */
    useEffect(() => {
        const raw = value.trim();
        const w = raw.toLowerCase();
        if (!raw || etchPlan || castHit || activeWidget || /^stone(\s|$)/i.test(raw)) {
            thoughtWordRef.current = null;
            setThought(null);
            return;
        }
        const res = results;
        const pd =
            pageHits.length > 0 ||
            (res != null &&
                res.projects.length + res.users.length + res.artworks.length +
                res.answers.length + res.soundtracks.length + res.traits.length > 0);
        if (searching || res == null || pd) {
            thoughtWordRef.current = null;
            setThought(null);
            return;
        }
        if (thoughtWordRef.current === w) return; // already musing on this word
        const line = deepThought(w);
        thoughtWordRef.current = line ? w : null;
        setThought(line);
    }, [value, results, pageHits, searching, etchPlan, castHit, activeWidget]);

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
        /* Bulk anchors read holdings + live floors — async, with the
           forward-motion line while it works (§9). */
        if (etchPlan.kind === 'anchor-bulk') {
            if (!siweAddress) return;
            setEtched('✓ READING YOUR HOLDINGS…');
            setValue('');
            inputRef.current?.focus();
            void commitEtchBulk(etchPlan, siweAddress).then((toast) => {
                showToast(toast);
                setEtched(`✓ ${toast}`);
            });
            return;
        }
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
                showToast('miniplayer: ON AIR');
            } else {
                go(null, `/art/${r.soundtracks[0].project_id}`);
            }
            return;
        }
        if (r.traits[0]) { go(null, `/art/${r.traits[0].project_id}`); return; }
    };

    /* ── open: tapping the dot reopens the stone. focus() runs synchronously
       inside the gesture handler so iOS raises the keyboard. ── */
    const openStone = () => {
        inputRef.current?.focus();
        /* The stone reopens with whatever is still in hand this session — it
           never resurrects an old line from a previous visit (Brendon,
           2026-07-26: it was loading with a stale character in the pill). */
        setStage('open');
    };

    /* THE SUMMON — triple-tap the page BACKGROUND (Brendon, 2026-07-21; the ONE
       way in, live on every page). Three quick taps on the bare page background
       toggle the stone — hidden → open (summoned, keyboard up); open or the dot
       → fully closed.

       "Background" (Brendon, 2026-07-22 — "do it properly"): a bare LAYOUT
       surface — the page/section/hero wrappers, gutters, empty space where the
       colorway paint shows. NOT controls, NOT art/media, NOT text, NOT cards or
       overlays. The test is content-aware, not an allow-list of a couple tags
       (that was too strict — it wouldn't fire on the hero at all):
         · reject interactive chrome + the stone/player/menu;
         · reject media (art, thumbs, icons) and known content/overlay surfaces;
         · reject any element that DIRECTLY holds text (a heading, price, label,
           card title) — layout wrappers hold only other elements, never raw
           text, so the hero's own background still counts;
         · everything else = background → summon.

       ⛔ The ARTWORK MODAL is the exception Brendon named: tapping the modal's
       own dim backdrop ALSO summons the stone, and it floats ABOVE the modal
       (z-index 10004 > the modal's 1000) and stays there.

       Uses pointer events (not click) so iOS fires it on bare background too;
       user-scalable=no already kills double-tap-zoom, so Safari can't hijack
       the gesture. */
    useEffect(() => {
        if (!siweAddress || needsSignup) return;
        /* Never-summon chrome: interactive controls + the stone's own surfaces
           + the connect menu (it owns its own triple-tap eggs). */
        const CHROME =
            'a,button,input,textarea,select,[role="button"],[role="link"],[role="tab"],' +
            '[contenteditable],label,summary,[tabindex],' +
            '#commandStonePanel,.stone-dot,.fm-bar,.fm-picker,.user-menu-wrapper';
        /* Content + media + overlays that are NOT background even though some
           are plain divs: art/thumbs/icons, cards/tiles/pills, the mint pill and
           its chooser, portalled confirm overlays, sheets, toasts. */
        const CONTENT =
            'img,canvas,svg,video,picture,pre,code,table,p,h1,h2,h3,h4,h5,h6,li,' +
            '[class*="card"],[class*="tile"],[class*="pill"],[class*="chip"],' +
            '[class*="hero"] [class*="title"],.btn-mint,.mint-chooser,' +
            '.starred-confirm-overlay,.ms-confirm-card,[class*="overlay"],[class*="sheet"],' +
            '[class*="toast"],[class*="popover"],[class*="tooltip"],[class*="badge"]';
        /* The artwork modal's ART + controls — a tap here is for the piece, not
           a summon; only the dim backdrop around them counts. */
        const ART_CONTENT =
            '.modal-canvas-wrap,.ls-canvas-wrap,.modal-info,.modal-bottom-bar,' +
            '.ls-bottom-bar,.details-popover';
        /* True when the element itself holds raw text (a leaf of real content),
           false for pure layout wrappers (which only contain other elements). */
        const holdsText = (el: HTMLElement): boolean => {
            for (const n of Array.from(el.childNodes)) {
                if (n.nodeType === 3 && (n.textContent ?? '').trim().length > 0) return true;
            }
            return false;
        };
        const summonSurface = (el: HTMLElement | null): 'page' | 'modal' | null => {
            if (!el) return null;
            /* The artwork modal's backdrop — summon ABOVE it (Brendon). */
            if (el.closest('#modal, #modalLandscape')) {
                return el.closest(`${CHROME},${ART_CONTENT}`) ? null : 'modal';
            }
            /* body / html / main / starfield are ALWAYS background (checked
               before CHROME so a focus-tabindex on them can't disqualify). */
            if (el === document.body || el === document.documentElement || el.tagName === 'MAIN' || el.id === 'starfield') {
                return 'page';
            }
            /* Controls / the stone / the player / any other open modal. */
            if (el.closest(CHROME) || document.body.classList.contains('modal-open')) return null;
            /* Content, media, overlays, or a text-bearing leaf → not background. */
            if (el.closest(CONTENT) || holdsText(el)) return null;
            /* A bare layout wrapper (hero bg, section, gutter, empty area). */
            return 'page';
        };
        let taps = 0;
        let lastT = 0;
        let lastX = 0;
        let lastY = 0;
        let downX = 0;
        let downY = 0;
        let downT = 0;
        const onDown = (e: PointerEvent) => {
            if (!e.isPrimary) return;
            downX = e.clientX;
            downY = e.clientY;
            downT = e.timeStamp;
        };
        const onUp = (e: PointerEvent) => {
            if (!e.isPrimary) return;
            /* only a clean tap counts — not a scroll, drag, or long hold */
            if (
                e.timeStamp - downT > 400 ||
                Math.abs(e.clientX - downX) > 10 ||
                Math.abs(e.clientY - downY) > 10
            ) {
                taps = 0;
                return;
            }
            if (!summonSurface(e.target as HTMLElement | null)) {
                taps = 0;
                return;
            }
            /* OPEN → a tap on the page does NOTHING. Only the swipe down and
               the long-press put the stone away (Brendon, 2026-07-26 — the
               tap-away was never asked for). */
            if (stageRef.current === 'open') {
                taps = 0;
                return;
            }
            /* a fresh run if the taps drift apart in time or space */
            if (
                e.timeStamp - lastT > 500 ||
                Math.abs(e.clientX - lastX) > 44 ||
                Math.abs(e.clientY - lastY) > 44
            ) {
                taps = 0;
            }
            taps += 1;
            lastT = e.timeStamp;
            lastX = e.clientX;
            lastY = e.clientY;
            if (taps < 3) return;
            taps = 0;
            if (stageRef.current === 'hidden') {
                inputRef.current?.focus(); // synchronous in the gesture → iOS keyboard
                /* Summons empty — no line carried over from a past visit. */
                setStage('open');
                showToastRef.current('', 1800, 250, null, ['Summoned:', 'COMMAND STONE']);
            } else {
                // the dot → fully close.
                inputRef.current?.blur();
                setStage('hidden');
                setValue('');
                showToastRef.current(
                    `${STONE_GLYPH} ${goodbye()} ${STONE_GLYPH}`,
                );
            }
        };
        document.addEventListener('pointerdown', onDown, { passive: true });
        document.addEventListener('pointerup', onUp, { passive: true });
        return () => {
            document.removeEventListener('pointerdown', onDown);
            document.removeEventListener('pointerup', onUp);
        };
    }, [siweAddress, needsSignup]);

    const vesselRef = useRef<HTMLDivElement | null>(null);

    /* Swipe DOWN on the open pill → minimize to the dot. The ONE put-away-to-
       dot gesture (Brendon, 2026-07-27). */
    const pillTouchY = useRef<number | null>(null);
    const onPillTouchStart = (e: React.TouchEvent) => {
        pillTouchY.current = e.touches[0]?.clientY ?? null;
    };
    const onPillTouchMove = (e: React.TouchEvent) => {
        const start = pillTouchY.current;
        const now = e.touches[0]?.clientY;
        if (start == null || now == null) return;
        if (now - start >= SWIPE_OPEN_PX) {
            pillTouchY.current = null;
            inputRef.current?.blur();
            setStage('dot');
        }
    };

    /* Logged-in only (the brief). No account, no stone. */
    if (!siweAddress || needsSignup) return null;

    const r = results;
    /* The tab renders ONLY when it has something to say — an empty open
       stone is just the pill + the flashing block (Brendon's idle). */
    const cmdCardOn =
        (etched && !searchingNow) || !!etchPlan || !!castHit || (searchingNow && searching && !r);
    /* THE NEWS shows only on a quiet open — real unread, nothing typed,
       not yet stood down this visit. */
    const newsOn = open && !searchingNow && !etched && !newsSeen && newsItems.length > 0;
    const hasTab =
        (searchingNow && (pageHits.length > 0 || !!r)) || cmdCardOn || !!activeWidget || !!thought || newsOn;

    /* The footer's one act, by priority: a carving on offer > a cast on
       offer > the summoned hand's registered act > the anchor offer. */
    const footerAct: FooterAct | null = etchPlan
        ? { label: etchPlan.chip, run: doEtch }
        : castHit
            ? {
                label: castHit.kind === 'workspace'
                    ? `Workspace · ${castHit.label} — load?`
                    : `${'icon' in castHit && castHit.icon ? `${castHit.icon} ` : ''}${castHit.label} — ${castActive(castHit) ? 'off?' : 'cast?'}`,
                run: () => doCast(castHit),
            }
            : activeWidget && widgetAct
                ? widgetAct
                : anchorOffer
                    ? {
                        label: `♆${VS15} anchor it at ◊${anchorOffer.price}?`,
                        run: () => {
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
                        },
                    }
                    : newsOn
                        ? {
                            label: '✓ MARK ALL READ',
                            run: () => { markAllRead(); setNewsSeen(true); },
                        }
                        : null;

    return (
        <>
            {/* THE DOT — the stone's minimized form (the retired miniplayer
                nub, resurrected here). Tap it to reopen the full stone. */}
            {stage === 'dot' && (
                <button
                    type="button"
                    className={`stone-dot${pings.unreadCount > 0 ? ' stone-dot--news' : ''}`}
                    id="commandStoneDot"
                    aria-label="The Command Stone — minimized. Tap to open."
                    title="The Command Stone"
                    onClick={openStone}
                />
            )}

            {/* the floating vessel — deck of widgets above, the pill you
                type into below. Mounted always so focus() can fire inside
                the opening gesture (iOS keyboard). */}
            <div
                ref={vesselRef}
                className={`stone-float${open ? ' stone-float--open' : ''}${open && hasTab ? ' stone-float--docked' : ''}`}
                id="commandStonePanel"
                aria-hidden={!open}
            >
                    {hasTab && (
                    <div className="stone-deck stone-results">
                        {/* THE HEADER — the bubble's two rows of dialogue
                            (Brendon's anatomy, 2026-07-28): the spoken line,
                            then the drier aside. One voice, one module. */}
                        {(() => {
                            const sp = speakNow();
                            return (
                                <div className="stone-head">
                                    <div className="stone-head-line">{sp.line}</div>
                                    {sp.sub && <div className="stone-head-sub">{sp.sub}</div>}
                                </div>
                            );
                        })()}

                        {/* THE MIDDLE — the widget sandwich; it scrolls,
                            the header and footer hold their ground. */}
                        <div className="stone-deck-scroll">
                        {/* THE NEWS — the stone speaks first, with reason */}
                        {newsOn && <NewsDeck items={newsItems} onGo={go} />}

                        {/* THE WIDGET DECK — a summoned hand owns the tab */}
                        {activeWidget && (
                            <WidgetDeck
                                plan={activeWidget}
                                address={siweAddress}
                                onGo={go}
                                onAct={(t) => showToast(t)}
                                onFooter={onFooter}
                                onSeed={onSeed}
                                wornMoodKey={wornMood?.key ?? null}
                                onCastMood={(m) => showToast(castMood(m))}
                                wornMarketMoodKey={wornMarketMood?.key ?? null}
                                onCastMarketMood={(m) => showToast(castMarketMood(m))}
                            />
                        )}

                        {/* DEEP THOUGHT — a common word that isn't a PD thing
                            gets a TARS × Deep Thought line, not a dead end. */}
                        {thought && (
                            <div className="stone-widget sw-card">
                                <div className="sw-say sw-say--lead">{thought}</div>
                            </div>
                        )}

                        {/* GO/FIND — answers in the TARS voice, results as
                            glanceable cards (StoneDeck's presentation) */}
                        {!activeWidget && !thought && searchingNow && (pageHits.length > 0 || r) && (
                            <SearchDeck
                                r={r}
                                pageHits={pageHits}
                                query={line}
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
                                            showToast('miniplayer: ON AIR');
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

                        {searchingNow && searching && !r && (
                            <div className="stone-widget stone-widget-cmd">
                                <div className="sw-say">{`⌕${VS15} READING THE STONE…`}</div>
                            </div>
                        )}
                        </div>

                        {/* THE FOOTER — the bubble's one action button,
                            always the last row (Brendon's anatomy):
                            carve > cast > the hand's act > anchor offer. */}
                        {footerAct && (
                            <div
                                className="stone-foot"
                                role="button"
                                tabIndex={0}
                                onClick={footerAct.run}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        footerAct.run();
                                    }
                                }}
                            >
                                {footerAct.label}
                            </div>
                        )}
                    </div>

                    )}

                    {/* the pill — you type right in it; ⌘ carved on the left,
                        the flashing block alone until the first character */}
                    <div
                        className="stone-pill"
                        onTouchStart={onPillTouchStart}
                        onTouchMove={onPillTouchMove}
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
                                    /* first keystroke stands the news down */
                                    if (e.target.value) setNewsSeen(true);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        /* Typed minimize → the dot; typed
                                           close → fully gone. */
                                        if (MINIMIZE_RE.test(value)) {
                                            inputRef.current?.blur();
                                            setStage('dot');
                                            setValue('');
                                            return;
                                        }
                                        if (CLOSE_RE.test(value)) {
                                            inputRef.current?.blur();
                                            setStage('hidden');
                                            setValue('');
                                            goodbyeToast(); // text goodbye · glyphs both sides
                                            return;
                                        }
                                        /* The stealth console outranks all —
                                           it starts with the stone's own
                                           name, nothing else does. */
                                        const stone = runStoneCommand(value);
                                        if (stone) {
                                            if (stone.tint) {
                                                // the recolour toast — the pill
                                                // wears the colour, named, ⌘ both sides
                                                showToast(`${STONE_GLYPH} ${stone.name} ${STONE_GLYPH}`, 1800, 250, null, null, stone.tint);
                                            } else {
                                                showToast(stone.line);
                                            }
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
