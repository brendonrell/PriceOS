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
 *   equivalent flag derived from pdNotifs.spell_stargazing in
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
 */

import { useEffect, useRef } from 'react';

/* Canonical body-class flags that gate the rAF loop. `bg-canvas-on`
   is the explicit hook the Build 11 spec asks for; `stargazing-mode`
   is the existing flag already derived from pdNotifs.spell_stargazing
   in useBodyClass — accepting both means the existing Spell Book
   wiring drives the loop without any context plumbing changes. */
const CANVAS_ON_CLASSES = ['bg-canvas-on', 'stargazing-mode'];

export function Backgrounds() {
    const rafIdRef = useRef<number | null>(null);

    useEffect(() => {
        const isCanvasOn = () => {
            const cl = document.body.classList;
            return CANVAS_ON_CLASSES.some((c) => cl.contains(c));
        };

        /* Tick body — placeholder. Future starfield + familiar draw
           work lands here, gated by the start/stop pair below so it
           can never run unless the body class explicitly invites it.
           No audio APIs used: no AudioContext, no .play(). */
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

    return (
        <>
            <div id="starfield" aria-hidden="true" />
            <div id="digital-familiar" aria-hidden="true" style={{ display: 'none' }}>
                <span className="familiar-sprite" id="familiarSprite" />
                <span className="familiar-badge" id="familiarBadge" />
                <span className="familiar-bubble" id="familiarBubble" />
            </div>
        </>
    );
}
