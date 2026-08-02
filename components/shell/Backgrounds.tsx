'use client';

/*
 * Backgrounds
 *
 * Mounts the two "always present, default off" background layers:
 *   1. #starfield — fixed-position canvas-eligible layer for the
 *      Stargazing spell. CSS in globals.css sets display:none by
 *      default; body.stargazing-mode flips it on.
 *   2. #digital-familiar — fixed-position bottom-left ASCII entity
 *      for the Familiar spell. Default display:none via inline
 *      style; the spell_familiar toggle reveals it once the species
 *      + animation logic is wired in a later build.
 *
 * Build 11 — body-class gated rAF loop:
 *   Build 9's diagnostic flagged this component as the source of an
 *   aggressive on-page-load animation that was pre-empting browser
 *   audio. Build 9's blunt fix was an `enable` prop defaulting to
 *   `false`, which kept the component a no-op everywhere. That hid
 *   the symptom but didn't give the future starfield + familiar
 *   logic a structural place to live without re-introducing the
 *   same problem the next time someone flips Stargazing on.
 *
 *   Build 11 replaces the prop gate with the right-shaped gate: a
 *   single rAF loop that only spins while the body has class
 *   `bg-canvas-on` OR `stargazing-mode` (the latter is the existing
 *   equivalent flag derived from pdNotifs.stargazing in
 *   useBodyClass — grep confirmed no `bg-canvas-on` is wired yet, so
 *   accepting both keeps a clean opt-in escape hatch and the
 *   spell-driven path working end-to-end). With neither class
 *   present at mount — the default state on every page — the
 *   loop never starts. A MutationObserver on body.class flips
 *   start()/stop() when Stargazing toggles in the Spell Book, so
 *   the loop attaches and detaches without remounting the
 *   component. On unmount: rAF is cancelled and the observer is
 *   disconnected. The DOM nodes themselves mount unconditionally
 *   now — they're empty divs gated by CSS visibility, cheap, and
 *   removing the `enable` prop means callers don't have to thread
 *   it through (PriceOSShell already mounts <Backgrounds /> with
 *   no props).
 *
 *   The tick body is intentionally a no-op placeholder. The actual
 *   starfield generator + familiar sprite step land in their own
 *   builds and drop straight into the gated frame slot below.
 *
 * Audio safety (verified):
 *   This component never constructs an AudioContext, never calls
 *   .play() on any element, and never decodes audio data. It only
 *   schedules paint frames via requestAnimationFrame, and only
 *   while a body class is active. It cannot pre-empt the page's
 *   audio focus the way an autoplay <video>/<audio> element or an
 *   AudioContext.resume() call would.
 *
 * Batch G / F56 / BUG-23 — Digital Familiar engine wiring:
 *   This component now subscribes to familiarEngine when
 *   pdNotifs.spell_familiar flips on. Frame snapshot drives the
 *   sprite text, badge text, bubble text + .visible class,
 *   .outlined class, --familiar-outline CSS var, and host display.
 *   Sprite click opens FamiliarModal via ModalContext.open('familiar')
 *   — replaces sim's document-level capture-phase detection at
 *   sim 12877-12886 with a React onClick on the host JSX. The
 *   action-button branch (.btn-mint / .modal-action-btn / etc.)
 *   stays inside the engine's own document listener since those
 *   targets are scattered across many components.
 */

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useModal } from '../../lib/state/ModalContext';
import { useColorway, type ColorwayKey } from '../../lib/state/ColorwayContext';
import {
    enableFamiliar,
    disableFamiliar,
    subscribeFamiliar,
    setFamiliarContext,
    pokeFamiliar,
    type FamiliarFrame,
} from '../../lib/engines/familiarEngine';
import { useAuth } from '../../lib/state/AuthContext';
import { NpcCast } from './NpcCast';
import {
    seedStarfield,
    clearStarfield,
    applyStargazingVars,
} from '../../lib/effects/stargazing';
import {
    startAutoScroll,
    stopAutoScroll,
} from '../../lib/effects/autoscroll';

/* Canonical body-class flags that gate the rAF loop. `bg-canvas-on`
   is the explicit hook the Build 11 spec asks for; `stargazing-mode`
   is the existing flag already derived from pdNotifs.stargazing
   in useBodyClass — accepting both means the existing wiring
   drives the loop without any context plumbing changes. */
const CANVAS_ON_CLASSES = ['bg-canvas-on', 'stargazing-mode'];

const EMPTY_FRAME: FamiliarFrame = {
    spriteText: '',
    badgeText: '',
    bubbleText: '',
    bubbleVisible: false,
    thoughtText: '',
    thoughtVisible: false,
    outlined: false,
    outlineColor: null,
    tier: null,
    energy: 'chill',
    visible: false,
};

/* Energy → movement cadence/feel. The host reads frame.energy and frame.tier to
   scurry the familiar; higher tiers move with restraint so it never disturbs
   browsing (a god doesn't scurry). distance/off-screen are scaled by tier. */
const ENERGY_PARAMS: Record<string, {
    gapMin: number; gapVar: number; moveMin: number; moveVar: number;
    offChance: number; offMs: number; backMs: number;
}> = {
    active: { gapMin: 4000, gapVar: 5000, moveMin: 1400, moveVar: 900, offChance: 0.25, offMs: 900, backMs: 700 },
    hyped:  { gapMin: 1400, gapVar: 2200, moveMin: 480,  moveVar: 520, offChance: 0.40, offMs: 520, backMs: 380 },
    greed:  { gapMin: 2800, gapVar: 3000, moveMin: 900,  moveVar: 700, offChance: 0.15, offMs: 800, backMs: 600 },
    fear:   { gapMin: 1100, gapVar: 2600, moveMin: 360,  moveVar: 360, offChance: 0.50, offMs: 440, backMs: 320 },
    ngmi:   { gapMin: 7000, gapVar: 9000, moveMin: 2200, moveVar: 1400, offChance: 0.05, offMs: 1700, backMs: 1500 },
};

/* Per-tier restraint: BitDaemons get the full playful run; the rarer tiers move
   smaller, slower, and never bolt off-screen — classy, non-disruptive. */
const TIER_MOVE: Record<string, { reach: number; slow: number; offOk: boolean }> = {
    bitdaemons: { reach: 1.0,  slow: 1.0, offOk: true },
    titans:     { reach: 0.5,  slow: 1.3, offOk: false },
    ascended:   { reach: 0.4,  slow: 1.4, offOk: false },
    oldgods:    { reach: 0.25, slow: 1.7, offOk: false },
};

export function Backgrounds() {
    const rafIdRef = useRef<number | null>(null);
    const { notifs } = usePdNotifs();
    const { open: openModal } = useModal();
    const { colorway, setColorway } = useColorway();
    const { siweAddress, priceRank } = useAuth();
    /* Familiar long-press (open modal) vs tap (poke) discrimination. */
    const familiarPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const familiarLongPressed = useRef(false);
    /* Familiar scurry — horizontal offset (px) + the duration of the current move. */
    const [scurry, setScurry] = useState<{ x: number; ms: number }>({ x: 0, ms: 600 });
    const starfieldRef = useRef<HTMLDivElement | null>(null);
    /* Holds the colorway key that was active at the moment stargazing
       flipped on. Captured on the ON-edge so flip-off can restore it
       even if the user picked a different colorway mid-stargazing. Sim
       9373 captures the same way (`localStorage.getItem('pd_settings_colorway')`).
       Default 'custom' on first ON to match sim 9435's `|| 'custom'`. */
    const prevThemeRef = useRef<ColorwayKey>(null);
    /* Live mirror of setColorway so the stargazing effect can depend on
       `notifs.stargazing` alone — without this ref, including setColorway
       in the dep array would re-fire the effect every time setColorway
       changes identity (it's `useCallback` keyed on colorway, so it
       changes on every colorway pick), re-seeding the starfield with
       fresh random positions on every mid-stargazing colorway change.
       Sim's _applyStargazingMode only runs on ON/OFF transitions;
       mid-stargazing colorway picks leak the new colorway's vars over the
       stargazing vars (a sim quirk we match). */
    const setThemeRef = useRef(setColorway);
    useEffect(() => { setThemeRef.current = setColorway; }, [setColorway]);
    const [frame, setFrame] = useState<FamiliarFrame>(EMPTY_FRAME);

    useEffect(() => {
        const isCanvasOn = () => {
            const cl = document.body.classList;
            return CANVAS_ON_CLASSES.some((c) => cl.contains(c));
        };

        /* Tick body — placeholder. Future starfield draw work lands
           here, gated by the start/stop pair below so it can never
           run unless the body class explicitly invites it. The
           Familiar engine is independent of this loop — its frame
           cadence comes from setInterval inside familiarEngine.ts.
           ⛔ Battery (2026-08-02): while the body is EMPTY, start()
           schedules NOTHING — an empty rAF loop still wakes the CPU
           60–120×/sec for the whole stargazing session. When real draw
           work lands in tick, restore the requestAnimationFrame lines
           here and in start(). */
        const tick = () => {
            rafIdRef.current = null;
        };
        void tick;

        const start = () => {
            if (rafIdRef.current !== null) return;
            /* no draw work yet — nothing to schedule */
        };

        const stop = () => {
            if (rafIdRef.current !== null) {
                cancelAnimationFrame(rafIdRef.current);
                rafIdRef.current = null;
            }
        };

        const sync = () => {
            if (isCanvasOn()) start();
            else stop();
        };

        /* Initial sync — neither class is present by default, so this
           leaves the loop stopped. Reading body.classList here also
           covers the pre-hydration script case where the class was
           primed synchronously before React mounted. */
        sync();

        /* Watch body.class so toggling Stargazing in the Spell Book
           starts/stops the loop without remounting Backgrounds. */
        const observer = new MutationObserver(sync);
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ['class'],
        });

        return () => {
            stop();
            observer.disconnect();
        };
    }, []);

    /* Stargazing edge effect — the JS half of sim's _applyStargazingMode
       (sim 9367-9437). The CSS half (body.stargazing-mode rules + .star-dot
       + .shooting-star + keyframes) lives in app/globals.css 1184-1235.
       The body.class flip is owned by useBodyClass / the prehydration
       script — NOT this effect — so the class is already present on
       flip-on edges. This effect is purely about populating #starfield
       and writing the runtime vars.

       Depends ONLY on notifs.stargazing so it fires exactly on ON/OFF
       transitions (and once on mount if stargazing is true at boot,
       which is the sim 13037 hydration restore path). Colorway + setColorway
       are read via live refs above; mid-stargazing colorway picks therefore
       don't trigger a re-seed (they would otherwise generate a fresh
       random starfield on every pick).

       ON-edge (notifs.stargazing true after mount or transition):
         1. Capture the current colorway key into prevThemeRef so flip-off
            can restore it (sim 9373). 'custom' fallback per sim 9435.
         2. Seed 380 .star-dot + 3 .shooting-star into #starfield —
            seedStarfield is idempotent so a re-mount with the field
            already populated bails cleanly.
         3. Write 11 root vars + --modal-bg + theme-color meta.

       OFF-edge (notifs.stargazing transitioning true → false):
         1. Clear the starfield container (sim 9434).
         2. setColorway(prevColorway) — re-derives every colorway var in one
            call, identical to sim 9435.

       Boot case (notifs.stargazing already true on first render):
         body.stargazing-mode is already on the body from prehydration;
         this effect mounts the stars and writes vars. The user sees
         the proper purple UI from first paint after hydration completes.

       Cleanup: clear the starfield only if stargazing is actively on
       at unmount time — guards against StrictMode double-mount leaving
       760 stars and against SPA route changes leaving stale stars in
       the DOM if PriceOSShell ever re-mounts mid-stargazing. */
    useEffect(() => {
        const sf = starfieldRef.current;
        if (!sf) return;

        if (notifs.stargazing) {
            /* Sim 9373 verbatim: read the persisted colorway key out of
               localStorage at the moment of ON-edge capture. Reading
               from React state instead would be incorrect on the boot
               path — child useEffects run before parent useEffects in
               React's bottom-up effect order, so on first mount with
               stargazing=true at boot, ColorwayProvider's hydration effect
               hasn't yet written its saved colorway into React state and
               `colorway` is still null. localStorage already holds the
               correct value, so reading it directly is both sim-exact
               and timing-correct. */
            try {
                const saved = localStorage.getItem('pd_settings_colorway');
                prevThemeRef.current = (saved as ColorwayKey) ?? 'custom';
            } catch {
                prevThemeRef.current = 'custom';
            }
            seedStarfield(sf);
            applyStargazingVars();
            return () => {
                /* Cleanup runs on the OFF transition AND on real
                   unmount. Both want the field cleared. The OFF
                   transition's setColorway restore is handled in the
                   else branch below — the closure here was captured
                   when stargazing was ON, so we only need to clear
                   here, not restore. */
                clearStarfield(sf);
            };
        } else if (prevThemeRef.current !== null) {
            /* Sim 9433-9436: clear + setColorway(_stargazingPrevTheme || 'custom'). */
            clearStarfield(sf);
            setThemeRef.current(prevThemeRef.current);
            prevThemeRef.current = null;
        }
    }, [notifs.stargazing]);

    /* Tracks the last `colorway` value the previous render saw so the
       hydration-edge effect can distinguish:
         • Hydration write (null → saved): ColorwayProvider's mount effect
           setting state for the first time. We DO want stargazing vars
           to win here so a returning user with stargazing-on at last
           unload boots into a fully-purple UI (sim 13037 boot path
           runs _applyStargazingMode AFTER setColorway).
         • User pick (saved → other): the picker writing a new colorway
           mid-stargazing. Sim does NOT re-apply stargazing here —
           setColorway is just called once and colorway vars leak through
           the 9 minor slots not pinned by !important. We match this
           sim quirk by NOT re-applying vars on this transition. */
    const lastThemeRef = useRef<ColorwayKey>(null);
    useEffect(() => {
        const prev = lastThemeRef.current;
        lastThemeRef.current = colorway;
        if (!notifs.stargazing) return;
        const wasHydration = prev === null && colorway !== null;
        if (wasHydration) {
            applyStargazingVars();
        }
    }, [notifs.stargazing, colorway]);

    /* Brendon list item 10 — Auto-Scroll lifecycle. Sim 9441-9455 +
       sim 13038 hydration restore. start on flip-on edge, stop on
       flip-off + on unmount. The helper is idempotent so a re-mount
       under StrictMode doesn't double-tick. No body class to manage —
       sim's _applyAutoScroll doesn't set one (Setup Code apply path
       sets `autoscroll-mode` as a decorative marker but nothing in
       CSS reads it). The interval pauses internally when document.hidden,
       so a backgrounded tab doesn't burn CPU. */
    useEffect(() => {
        if (notifs.autoscroll) {
            startAutoScroll();
            return () => stopAutoScroll();
        }
        // Defensive stop on transition into a render where the flag is
        // false — guards against a rapid flip that would otherwise leave
        // the interval running if the previous render's cleanup hasn't
        // fired yet.
        stopAutoScroll();
    }, [notifs.autoscroll]);

    /* Familiar engine lifecycle — gated on pdNotifs.spell_familiar.
       enableFamiliar is sticky-mounted (species/outline picked once
       per page, reused on re-enable per sim 12898), so toggling off
       then on keeps the same companion. The subscribe/unsubscribe
       pair runs on every flip; disable on transition out clears
       timers + listeners. The setFrame callback on mount fires
       synchronously with the current snapshot so the JSX renders
       in lockstep without waiting for the first interval tick. */
    useEffect(() => {
        if (!notifs.spell_familiar) {
            disableFamiliar();
            setFrame(EMPTY_FRAME);
            return;
        }
        setFamiliarContext({ address: siweAddress, rank: priceRank });
        enableFamiliar();
        const unsub = subscribeFamiliar(setFrame);
        return () => {
            unsub();
            disableFamiliar();
        };
    }, [notifs.spell_familiar]);

    /* Keep the familiar's knowledge of you current: feed it your identity +
       rank whenever the auth context settles or changes. Address change while
       enabled re-pulls Omniscience knowledge; rank change recolours dialogue. */
    useEffect(() => {
        setFamiliarContext({ address: siweAddress, rank: priceRank });
    }, [siweAddress, priceRank]);

    /* Scurry — move the familiar along the bottom per its Energy + tier. 'chill'
       (default) stays put. Off-screen darts are clipped by #familiar-layer so the
       viewport never shifts. */
    useEffect(() => {
        const params = ENERGY_PARAMS[frame.energy];
        const moves = !!params && frame.visible && notifs.spell_familiar;
        if (!moves) {
            setScurry({ x: 0, ms: 600 });
            return;
        }
        const tierMove = TIER_MOVE[frame.tier ?? 'bitdaemons'] ?? TIER_MOVE.bitdaemons;
        let cancelled = false;
        let timer: ReturnType<typeof setTimeout>;

        const step = () => {
            if (cancelled || typeof window === 'undefined') return;
            const w = window.innerWidth;
            const maxX = Math.max(40, (w - 160) * tierMove.reach);
            const offRoll = Math.random();
            if (tierMove.offOk && offRoll < params.offChance) {
                // dart off an edge, then quickly scurry back on
                const offTarget = Math.random() < 0.5 ? w + 60 : -180;
                setScurry({ x: offTarget, ms: Math.round(params.offMs * tierMove.slow) });
                timer = setTimeout(() => {
                    if (cancelled) return;
                    setScurry({ x: Math.random() * maxX, ms: Math.round(params.backMs * tierMove.slow) });
                    timer = setTimeout(step, params.gapMin + Math.random() * params.gapVar);
                }, params.offMs + 250);
            } else {
                const ms = Math.round((params.moveMin + Math.random() * params.moveVar) * tierMove.slow);
                setScurry({ x: Math.random() * maxX, ms });
                timer = setTimeout(step, params.gapMin + Math.random() * params.gapVar);
            }
        };

        timer = setTimeout(step, 2500 + Math.random() * 3000);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [frame.energy, frame.tier, frame.visible, notifs.spell_familiar]);

    /* Inline style — only set --familiar-outline when an outline is
       active; otherwise leave the CSS var undefined so the rule
       falls through to var(--text-color) per the .familiar-sprite.outlined
       declaration at globals.css 1163+ / sim 3343-3346. */
    const familiarStyle: CSSProperties = {
        display: frame.visible ? '' : 'none',
        transform: `translateX(${scurry.x}px)`,
        transition: `transform ${scurry.ms}ms ease-in-out`,
    };
    if (frame.outlined && frame.outlineColor) {
        (familiarStyle as Record<string, string>)['--familiar-outline'] = frame.outlineColor;
    }

    /* Long-press opens the modal; a short tap is a poke/pet (the familiar
       reacts in its own way). A press held past the threshold opens the modal
       and suppresses the poke on release (Brendon, 2026-06-22). */
    const onFamiliarDown = () => {
        familiarLongPressed.current = false;
        if (familiarPressTimer.current) clearTimeout(familiarPressTimer.current);
        familiarPressTimer.current = setTimeout(() => {
            familiarLongPressed.current = true;
            openModal('familiar');
        }, 400);
    };
    const onFamiliarUp = () => {
        if (familiarPressTimer.current) {
            clearTimeout(familiarPressTimer.current);
            familiarPressTimer.current = null;
        }
        if (!familiarLongPressed.current) pokeFamiliar();
    };
    const onFamiliarCancel = () => {
        if (familiarPressTimer.current) {
            clearTimeout(familiarPressTimer.current);
            familiarPressTimer.current = null;
        }
        familiarLongPressed.current = false;
    };

    return (
        <>
            <div id="starfield" ref={starfieldRef} aria-hidden="true" />
            <div id="familiar-layer" aria-hidden="true">
            <div
                id="digital-familiar"
                aria-hidden="true"
                data-tier={frame.tier ?? ''}
                style={familiarStyle}
                onPointerDown={onFamiliarDown}
                onPointerUp={onFamiliarUp}
                onPointerLeave={onFamiliarCancel}
                onContextMenu={(e) => e.preventDefault()}
            >
                <span
                    className={`familiar-sprite${frame.outlined ? ' outlined' : ''}`}
                    id="familiarSprite"
                >
                    {frame.spriteText}
                </span>
                <span className="familiar-badge" id="familiarBadge">
                    {frame.badgeText}
                </span>
                <span
                    className={`familiar-bubble${frame.bubbleVisible ? ' visible' : ''}`}
                    id="familiarBubble"
                >
                    {frame.bubbleText}
                </span>
                <span
                    className={`familiar-thought${frame.thoughtVisible ? ' visible' : ''}`}
                    id="familiarThought"
                >
                    {frame.thoughtText}
                </span>
            </div>
            </div>
            <NpcCast />
        </>
    );
}
