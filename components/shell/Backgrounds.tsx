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
import {
    enableFamiliar,
    disableFamiliar,
    subscribeFamiliar,
    type FamiliarFrame,
} from '../../lib/engines/familiarEngine';

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
    outlined: false,
    outlineColor: null,
    visible: false,
};

export function Backgrounds() {
    const rafIdRef = useRef<number | null>(null);
    const { notifs } = usePdNotifs();
    const { open: openModal } = useModal();
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
           cadence comes from setInterval inside familiarEngine.ts. */
        const tick = () => {
            rafIdRef.current = requestAnimationFrame(tick);
        };

        const start = () => {
            if (rafIdRef.current !== null) return;
            rafIdRef.current = requestAnimationFrame(tick);
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
        enableFamiliar();
        const unsub = subscribeFamiliar(setFrame);
        return () => {
            unsub();
            disableFamiliar();
        };
    }, [notifs.spell_familiar]);

    /* Inline style — only set --familiar-outline when an outline is
       active; otherwise leave the CSS var undefined so the rule
       falls through to var(--text-color) per the .familiar-sprite.outlined
       declaration at globals.css 1163+ / sim 3343-3346. */
    const familiarStyle: CSSProperties = {
        display: frame.visible ? '' : 'none',
    };
    if (frame.outlined && frame.outlineColor) {
        (familiarStyle as Record<string, string>)['--familiar-outline'] = frame.outlineColor;
    }

    return (
        <>
            <div id="starfield" aria-hidden="true" />
            <div
                id="digital-familiar"
                aria-hidden="true"
                style={familiarStyle}
                onClick={() => openModal('familiar')}
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
            </div>
        </>
    );
}
