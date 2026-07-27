'use client';

/*
 * HomeTitleCartography — the "Price Discussion" name on the home page,
 * carrying the SAME long-press gesture as every other name on the site
 * (ProjectTitleStar: 460ms hold, 10px drift cancel, context-menu
 * suppressed). The name is the platform's secret compass:
 *   • long-press  → Cartography ◫ (space — the living ecosystem map)
 *   • triple-tap  → The Rewind ◄ (time — docks the OS at yesterday, and the
 *                    same three taps while docked return you to now)
 *
 * The gesture mechanics are copied verbatim from
 * components/project/ProjectTitleStar.tsx (Rule #0 — reuse, never reinvent).
 */

import React from 'react';
import { useModal } from '../../lib/state/ModalContext';
import { useRewindOptional } from '../../lib/state/RewindContext';

export default function HomeTitleCartography() {
    const { open } = useModal();
    const rewind = useRewindOptional();
    /* Triple-tap: three completed taps within 350ms of each other. Taps are
       counted on pointer-up of presses that never long-fired. */
    const tapTimes = React.useRef<number[]>([]);

    const timerRef = React.useRef<number | null>(null);
    const longFired = React.useRef(false);
    const startPt = React.useRef<{ x: number; y: number } | null>(null);
    const clearTimer = () => {
        if (timerRef.current != null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    };
    const onPointerDown = (e: React.PointerEvent) => {
        longFired.current = false;
        startPt.current = { x: e.clientX, y: e.clientY };
        clearTimer();
        timerRef.current = window.setTimeout(() => {
            longFired.current = true;
            timerRef.current = null;
            open('cartography');
        }, 920);   // deliberate longer hold for Cartography — 2× the standard 460ms name-hold (Brendon, 2026-07-14)
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (timerRef.current == null || !startPt.current) return;
        const dx = e.clientX - startPt.current.x;
        const dy = e.clientY - startPt.current.y;
        if (dx * dx + dy * dy > 100) clearTimer();
    };
    const endPress = () => {
        const wasPending = timerRef.current != null;
        clearTimer();
        if (!wasPending || longFired.current) return;
        const now = Date.now();
        const taps = tapTimes.current.filter((t) => now - t < 700);
        taps.push(now);
        tapTimes.current = taps;
        if (taps.length >= 3 && rewind) {
            tapTimes.current = [];
            /* The gesture is a TOGGLE (Brendon, 2026-07-27): the same three taps
               that opened The Rewind close it again, exactly like the bar's ✕. */
            if (rewind.day != null) rewind.returnToNow();
            // Enter The Rewind at yesterday — the scrubber takes it from there.
            else rewind.engage(rewind.today - 1);
        }
    };

    return (
        <span
            className="project-title-star-wrap"
            style={{ position: 'relative', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onContextMenu={(e) => e.preventDefault()}
        >
            <span>Price Discussion</span>
        </span>
    );
}
