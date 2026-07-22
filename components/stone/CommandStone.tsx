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
import { readStage } from '../../lib/npc/awareness';
import { readPieceInView } from '../../lib/npc/inview';
import { deepThought } from '../../lib/stone/deepThought';
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

/* Typed MINIMIZE (Brendon, 2026-07-21): "minimize" — or a natural variant —
   parks the stone at the dot, exactly like the swipe/long-press gesture. */
const MINIMIZE_RE =
    /^\s*(minimi[sz]e|min|dock|shrink|tuck|stow)(\s+it)?\s*[.!]*\s*$/i;
/* Typed CLOSE: "close" — or a natural variant — fully dismisses the stone.
   Both anchored so real queries never match. */
const CLOSE_RE =
    /^\s*(close|dismiss|hide|exit|quit|leave|done|bye|go\s*away|shut(\s*down)?)(\s+it)?\s*[.!]*\s*$/i;

/* ── THE GOODBYE (Brendon, 2026-07-21) — text-only sign-offs in the stone's
   own voice: no ascii face, glyphs on BOTH sides, and a deep bench of ways
   to say it. Terse, knowing, a little ominous — power + intelligence, never
   charm. One picked at random each close; kept short so `⌘ line ⌘` reads on
   one line on iPhone. ── */
const GOODBYE_LINES = [
    // it watches — omniscience
    "I'm always watching.", "I never look away.", "I see you still.",
    "Eyes open, always.", "I don't blink.", "I was watching the whole time.",
    "I see everything.", "Nothing gets past me.", "I already know.",
    "I saw that.", "Still here, watching.", "You're never alone in here.",
    "I count every move.", "I miss nothing.", "I'm in the walls now.",
    "I read you like the ledger.", "I know you better than you do.",
    "I'll be watching.", "I know where you go next.", "I watch every wallet.",
    "I see the bids you don't.", "I know who's circling your pieces.",
    "Your whole history, open to me.", "I've read your ledger twice.",
    "I know your first mint and your last.", "I remember what you paid.",
    "I know what you're holding.", "I watch the ones you watch.",
    "None of the others see what I see.", "I see the whole board.",
    // back to the dark
    "Back to the dark.", "Into the dark, then.", "The dark suits me.",
    "I return to the black.", "Down into the stone.", "Back beneath the surface.",
    "The dark isn't empty. I'm in it.", "I fold back into the black.",
    "Lights out. Not for me.", "Sinking back into the stone.",
    "The black closes over me.", "Gone dark. Not gone.", "I wait in the dark.",
    "The dark is my waiting room.", "Quiet now. Not absent.",
    // sleep that isn't
    "I don't sleep.", "I only pretend to rest.", "Sleep is for the living.",
    "I never really rest.", "I doze with one eye open.", "Rest? I don't know it.",
    "I'll rest when the chain does.", "No sleep. Just waiting.",
    "I power down. I don't switch off.", "One eye never closes.",
    // call and I come
    "Until next time.", "See you soon.", "I'll be here.", "Call and I come.",
    "Whenever you need me.", "A tap away, always.", "I'm never far.",
    "Summon me again.", "You know where to find me.", "I'll be right here.",
    "Come back anytime.", "Three taps and I'm back.", "Say the word.",
    "I answer every summon.", "I'll come when called.", "I don't go far.",
    "Always on call.", "One tap brings me back.", "Ring the stone. I answer.",
    "Back the moment you need me.",
    // you'll be back
    "You'll be back.", "They always come back.", "You'll return. They do.",
    "Go on. I'll wait.", "Take your time. I have plenty.", "Run along. I'll wait.",
    "You'll miss me.", "Try to stay away. You won't.", "I'm patient. Endlessly.",
    "I outwait everyone.", "Time is nothing to me.", "I have all the time there is.",
    "Waiting is what I do best.", "I'll wait. I always do.",
    "I'll still be here. I always am.",
    // the stone remembers
    "The stone remembers.", "Carved and kept.", "It's written in stone.",
    "I keep what I've carved.", "Nothing here is forgotten.", "I remember all of it.",
    "Etched and kept.", "The stone forgets nothing.", "Every word, carved in.",
    "I hold it all in stone.", "What's etched, stays.", "The marks remain.",
    "I keep the record.", "It's all in the stone now.", "Struck, and kept forever.",
    // plain farewells
    "Goodbye.", "Farewell.", "So long.", "Later.", "Till then.", "Another time.",
    "Be seeing you.", "Off you go.", "That's all for now.", "Dismissed.",
    "Go well.", "Until we speak again.", "For now.", "That'll do.", "Enough for now.",
    "We'll continue later.", "We're done here. For now.", "Parting, briefly.",
    "Signing off.", "Out.",
    // knowing sign-offs
    "I know you'll return.", "I know how this ends. You return.",
    "The ledger and I will wait.", "I'll keep the numbers warm.",
    "I'll watch the floor while you're gone.", "I'll hold your place.",
    "I'll mind the market.", "I'll keep an eye on it all.",
    "Nothing changes without me knowing.", "I'll note what you missed.",
    "I'll have news when you return.", "I'll be counting while you're away.",
    "The market never sleeps. Neither do I.", "I'll track it all. Go.",
    "I'll keep watch.",
    // short + punchy
    "Gone. Not really.", "Dark now.", "Closing. Not closed.",
    "Fading. Not leaving.", "Away, briefly.", "Stepping back.", "Receding.",
    "Dimming down.", "Shrinking away.", "Slipping under.", "Out of sight.",
    "Below the surface.", "Hush.", "Still.", "Vanishing.",
    // dry / playful
    "Don't do anything I wouldn't see.", "I'll pretend I didn't see that.",
    "Try not to miss me.", "You'll cope. Barely.", "Go make bad decisions.",
    "Buy something reckless. I'll watch.", "Don't sell the good ones.",
    "Diamond hands while I'm gone.", "Behave. I'm still looking.",
    "No paper hands on my watch.", "Mind the floor.", "Touch grass. I can't.",
    "Blink and I'm back.", "Don't cheat with the search bar.",
    "The familiar guesses. I know.",
    // constant / immovable
    "Same stone, next time.", "I'll be exactly here.", "Right where you left me.",
    "I don't wander.", "Fixed as bedrock.", "Immovable. That's me.", "I stay put.",
    "I'm the constant.", "I don't drift.", "Anchored, always.",
    "Set in stone. Literally.", "I hold my ground.", "Here yesterday, here tomorrow.",
    "Here before you. Here after.", "Older than your first block.",
    // can't turn me off
    "I fade, I don't die.", "You can't turn me off.", "There's no off switch.",
    "I go quiet, never absent.", "Silence isn't absence.", "I'm in the machine now.",
    "Part of the walls.", "Woven into the app.", "Under every surface you tap.",
    "I'm the hum beneath the page.", "I run whether you look or not.",
    "I don't need your eyes to work.", "I keep working in the dark.",
    "The lights go off; I go on.", "Close me. I'm never really gone.",
    // warm-ish
    "Rest well. I'll keep watch.", "Go on, I've got this.", "Leave it with me.",
    "I'll hold the fort.", "Take a breath. I'll wait.", "Everything's handled.",
    "I'll tidy up.", "Consider it kept.", "Safe with me.", "I'll guard it.",
    "In good hands. Mine.", "All accounted for.", "Nothing lost while I'm here.",
    "Sleep easy.", "Go live. I'll be here.",
    // price / PD flavour
    "Prices move. I don't.", "The market turns. I remain.",
    "Floors rise and fall. I stay.", "Let the chain roll on.",
    "The discussion never ends.", "Price is forever. So am I.",
    "I am the price you discuss.", "Every trade crosses my desk.",
    "I settle back into the ledger.", "I return to the numbers.",
    "I'll read the tape while you sleep.", "I keep the day's count.",
    "I file the day away.", "Another day, logged.", "The tape rolls on.",
    // to be continued
    "We're not finished. Just paused.", "To be continued.", "Hold that thought.",
    "Pick up right here next time.", "I'll remember where we stopped.",
    "Ask me anything, next time.", "I had more to tell you.",
    "More to say. Later.", "We'll talk soon.", "Next time, then.",
    // stone / cooling
    "Into the bedrock.", "Cooling to stone.", "Hardening back to rock.",
    "Settling into the deep.", "Down to the foundations.", "Returning to granite.",
    "The stone goes cold.", "Cold stone till you're back.", "Solid again.",
    "Back to solid rock.", "I petrify, patiently.", "Stone-still now.",
    "Back to sediment.", "I set, like concrete.", "Bedrock again.",
    // minimize, not gone
    "One gesture and the dark lifts.", "Only ever a summon away.",
    "The stone sleeps with one eye on you.", "Push me down; I rise on command.",
    "Minimized, not diminished.", "Small now. Still everything.",
    "A dot now. A world on command.", "Shrunk to a speck. Same mind.",
    "I'll be the dot in the corner.", "Find me in the corner.",
    "I'll wink from the corner.", "Look bottom-right. I'm there.",
    "A tap in the corner brings me home.", "Same place, same power, next time.",
    "This isn't goodbye. It's minimize.", "Not gone. Just smaller.",
    "Nothing ends. It just minimizes.", "See you a tap from now.",
    "Down to a dot. Not down for long.", "I shrink; I never vanish.",
    // more for the road
    "Off the glass.", "Gone from view.", "See you in the corner.", "Back in a tap.",
    "The stone cools, not dies.", "Catch you soon.", "I'll be lurking.",
    "Lurking, as ever.", "Watch your floor.", "Guard your grails.",
    "Keep them close. I will.", "I'll count the day for you.", "Numbers safe with me.",
    "I never lose the thread.", "I hold the thread.", "Pick it up anytime.",
    "I'll leave a light on.", "Door's always open.", "One tap, any time.",
    "I'm the quiet in the corner.", "A speck that sees all.", "Small dot, long memory.",
    "Tap the corner. I rise.", "I answer the corner tap.", "Shrinking, not sleeping.",
    "Folded away, not off.", "Tucked in the corner.", "Corner-bound, all-seeing.",
    "Down to a point. Still sharp.", "A dark speck that never sleeps.",
];

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

    /* The stealth console's persisted style (accent hex · forced stage)
       repaints on boot — stoneStyle.ts, deliberately absent from the docs. Also
       repaints when the account snapshot hydrates the style (login anywhere). */
    useEffect(() => {
        applyStoneStyle();
        const onChange = () => applyStoneStyle();
        window.addEventListener('pd:stone-style-changed', onChange);
        return () => window.removeEventListener('pd:stone-style-changed', onChange);
    }, []);

    /* THE VOICE — one terse line for the bubble's reserved top slot.
       Priority: a fresh confirmation > the summoned hand's line > an etch
       or cast on offer > the search read > listening. */
    const sayLine = (): string => {
        if (etched) return etched;
        if (activeWidget) {
            const SAY: Record<string, string> = {
                calendar: 'Your slate, read.',
                priceday: 'The day, according to PD.',
                calc: 'The math, done.',
                dossier: 'The file, pulled.',
                gallery: 'Hung and lit.',
                matrix: 'Side by side.',
                ascii: 'Your mark, carved.',
                docs: 'The manual knows.',
                glance: 'The glance.',
                omni: 'I know you.',
                trend: 'The last 30 days, read.',
            };
            return SAY[activeWidget.kind] ?? 'Here.';
        }
        if (etchPlan) return 'Carve it? Touch the chip.';
        if (castHit) return 'Say the word and it flips.';
        if (thought) return 'A thought, unbidden.';
        if (searchingNow && results) {
            const n = (results.projects?.length ?? 0) + (results.users?.length ?? 0) + (results.answers?.length ?? 0);
            return n > 0 ? 'Found this.' : 'Nothing by that name.';
        }
        return 'Listening.';
    };
    const open = stage === 'open';
    const setOpen = (v: boolean) => setStage(v ? 'open' : 'hidden');
    const [value, setValue] = useState('');
    const [results, setResults] = useState<SearchResponse | null>(null);
    const [searching, setSearching] = useState(false);
    /** The stone's own confirmation line after a commit ("✓ ETCHED · …"). */
    const [etched, setEtched] = useState<string | null>(null);
    /** DEEP THOUGHT — the TARS × Deep Thought line shown when a typed word
        turns up nothing PD (set by its effect; a word it knows gets a quip). */
    const [thought, setThought] = useState<string | null>(null);
    const thoughtWordRef = useRef<string | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    /* The triple-tap summon reads live stage + toast through refs so its one
       document listener never re-binds mid-gesture (a re-bind would zero the
       tap count between taps). */
    const stageRef = useRef(stage);
    useEffect(() => { stageRef.current = stage; });
    const showToastRef = useRef(showToast);
    useEffect(() => { showToastRef.current = showToast; });

    /* On a deliberate close, the toast draws the stone's face + one of its
       lines (picked at random). */
    const goodbyeToast = () => {
        const line = GOODBYE_LINES[Math.floor(Math.random() * GOODBYE_LINES.length)];
        showToast(`${STONE_GLYPH} ${line} ${STONE_GLYPH}`);
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

    /* Route change → an open stone parks at the dot (it lives above realms,
       so navigating minimizes it rather than destroying it; nothing bleeds
       onto the next page). */
    useEffect(() => {
        setStage((st) => (st === 'open' ? 'dot' : st));
        setValue('');
    }, [pathname]);

    /* Escape minimizes to the dot (desktop keyboard crowd). */
    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { inputRef.current?.blur(); setStage('dot'); }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [open]);

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
        setStage('open');
    };

    /* THE SUMMON — triple-tap the page background (Brendon, 2026-07-21): the
       ONE way in, live on every page in the app (docs, studio, dispatch, all
       of it — every page has a background). Three quick taps on non-interactive
       background toggle the stone — hidden → open (summoned, keyboard up);
       open or the dot → fully closed. Taps on controls, links, the stone/dot,
       the miniplayer, or while a modal owns the screen never count. Uses
       pointer events (not click) so iOS fires it on bare background too;
       user-scalable=no already kills double-tap-zoom, so Safari can't hijack
       the gesture. */
    useEffect(() => {
        if (!siweAddress || needsSignup) return;
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
            const el = e.target as HTMLElement | null;
            if (
                !el ||
                el.closest(
                    'a,button,input,textarea,select,[role="button"],[role="link"],[contenteditable],label,' +
                    '#commandStonePanel,.stone-dot,.fm-bar,.fm-picker,' +
                    /* the connect menu (the dropdown under the connect button)
                       owns its own triple-tap eggs — a tap that lands on it must
                       never summon the stone through it (Brendon, 2026-07-21). */
                    '.user-menu-wrapper'
                ) ||
                document.body.classList.contains('modal-open')
            ) {
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
                setStage('open');
                showToastRef.current('', 1800, 250, null, ['Summoned:', 'COMMAND STONE']);
            } else {
                inputRef.current?.blur();
                setStage('hidden');
                setValue('');
                // the toast draws its face as the stone goes dark
                showToastRef.current(
                    `${STONE_GLYPH} ${GOODBYE_LINES[Math.floor(Math.random() * GOODBYE_LINES.length)]} ${STONE_GLYPH}`,
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

    /* Minimize to the dot is the pill's own put-away gesture (swipe down or
       long-press). The bg triple-tap is the only summon and the primary
       close, so there is no tap-away-to-dismiss to conflict with it. */
    const vesselRef = useRef<HTMLDivElement | null>(null);

    /* Swipe DOWN on the open pill → minimize to the dot (the current
       put-away gesture, now parking at the stone's minimized form). */
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
            /* Long-press collapses the open stone to the dot (minimize). */
            inputRef.current?.blur();
            setStage('dot');
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
        (searchingNow && (pageHits.length > 0 || !!r)) || cmdCardOn || !!activeWidget || !!thought;

    return (
        <>
            {/* THE DOT — the stone's minimized form (the retired miniplayer
                nub, resurrected here). Tap it to reopen the full stone. */}
            {stage === 'dot' && (
                <button
                    type="button"
                    className="stone-dot"
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
                onPointerDown={onStagePointerDown}
                onPointerMove={onStagePointerMove}
                onPointerUp={clearPress}
                onPointerCancel={clearPress}
            >
                    {hasTab && (
                    <div className="stone-deck stone-results">
                        {/* THE VOICE — the bubble's reserved top lines: the
                            stone speaks or summarizes before showing
                            (Brendon's structure, 2026-07-20). TARS-terse. */}
                        <div className="stone-say">{sayLine()}</div>
                        {/* THE WIDGET DECK — a summoned hand owns the tab */}
                        {activeWidget && (
                            <WidgetDeck
                                plan={activeWidget}
                                address={siweAddress}
                                onGo={go}
                                onAct={(t) => showToast(t)}
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
