'use client';

/*
 * HomeTitleCartography — the "Price Discussion" name on the home page,
 * carrying the SAME long-press gesture as every other name on the site
 * (ProjectTitleStar: 460ms hold, 10px drift cancel, context-menu
 * suppressed). Here the long-press opens The Cartography ◫ — the living
 * ecosystem map — instead of starring.
 *
 * The gesture mechanics are copied verbatim from
 * components/project/ProjectTitleStar.tsx (Rule #0 — reuse, never reinvent).
 */

import React from 'react';
import { useModal } from '../../lib/state/ModalContext';

export default function HomeTitleCartography() {
    const { open } = useModal();

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
        }, 460);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (timerRef.current == null || !startPt.current) return;
        const dx = e.clientX - startPt.current.x;
        const dy = e.clientY - startPt.current.y;
        if (dx * dx + dy * dy > 100) clearTimer();
    };
    const endPress = () => clearTimer();

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
