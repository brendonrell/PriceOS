'use client';

/*
 * useNavFade
 *
 * Sim 6746-6757 — scroll-driven fade for the top-left logo wrap and
 * the right-side nav controls cluster. When the user scrolls past
 * y=150, both .pd-logo-wrap and .nav-controls drop to opacity 0.10
 * (the `.nav-faded` rule at sim 92). Two conditions suppress the
 * fade:
 *   1. Connect Menu open (`.user-menu-wrapper.active` in sim) — when
 *      the dropdown is open we want full opacity so chrome stays
 *      readable while the user scrolls inside the menu.
 *   2. PD logo rotated (`.pd-logo.rotated`) — easter-egg state. Sim
 *      uses the same suppression so the speech-bubble menu doesn't
 *      get faded out from under the user.
 *
 * State sources:
 *   - menuOpen → useDropdown() (DropdownContext owns the active flag)
 *   - rotated  → 'pd:petey-rotated' CustomEvent dispatched by
 *                PeteyLogo on every state change (Build 20 pattern).
 *                We mirror it into a local useState so the listener
 *                can re-evaluate on rotation flip without a re-mount.
 *   - scrollY  → passive 'scroll' listener on window, plus an
 *                immediate evaluation on mount so the initial paint
 *                is correct if the page is reloaded mid-scroll.
 *
 * The hook reaches into the DOM with querySelector each evaluation
 * rather than holding refs — sim does the same (`document.querySelector
 * ('.pd-logo-wrap')` at sim 6748-6750), and the elements are stable
 * shell nodes that mount once at app boot. classList.toggle is safe
 * to call repeatedly with a boolean second arg; no thrash issues.
 *
 * Mounted once in PriceOSShell next to useBodyClass().
 */

import { useEffect, useState } from 'react';
import { useDropdown } from '../state/DropdownContext';

const FADE_THRESHOLD = 150; // sim 6752: `if (y > 150 && ...)`

export function useNavFade() {
    const { menuOpen } = useDropdown();
    const [rotated, setRotated] = useState(false);

    // Mirror the Petey rotation flag locally. PeteyLogo dispatches
    // `pd:petey-rotated` on every `rotated` state change (Build 20).
    useEffect(() => {
        const onRot = (e: Event) => {
            const ce = e as CustomEvent<{ rotated: boolean }>;
            setRotated(!!ce.detail?.rotated);
        };
        document.addEventListener('pd:petey-rotated', onRot);
        return () => document.removeEventListener('pd:petey-rotated', onRot);
    }, []);

    useEffect(() => {
        const evaluate = () => {
            const logoWrap = document.querySelector('.pd-logo-wrap');
            const navCtrls = document.querySelector('.nav-controls');
            if (!logoWrap || !navCtrls) return;
            const shouldFade =
                window.scrollY > FADE_THRESHOLD && !menuOpen && !rotated;
            logoWrap.classList.toggle('nav-faded', shouldFade);
            navCtrls.classList.toggle('nav-faded', shouldFade);
        };

        // Evaluate immediately so a reload mid-scroll picks up the
        // correct state on the first paint.
        evaluate();

        window.addEventListener('scroll', evaluate, { passive: true });
        return () => {
            window.removeEventListener('scroll', evaluate);
        };
    }, [menuOpen, rotated]);
}
