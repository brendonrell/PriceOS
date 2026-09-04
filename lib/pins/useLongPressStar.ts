'use client';

/*
 * useLongPressStar — the long-press-to-star gesture shared by every
 * "name you can hold to star" surface (Project title, Output title,
 * PriceDay title, Album/Vault tile labels). Same 460ms hold + 10px
 * cancel-radius + confirm-float as ProjectTitleStar/OutputTitleStar,
 * pulled into one hook so new star surfaces don't hand-clone the
 * pointer plumbing.
 *
 * Caller supplies `toggle`, which does the actual store write and
 * returns 'starred' | 'unstarred'; this hook only owns the gesture +
 * the floating-star confirm animation. Caller renders the ★︎ itself
 * from the `starred` flag it tracks (mirrors the existing components —
 * this hook doesn't own "is it starred", only "did a long-press just
 * fire").
 */

import React from 'react';

export function useLongPressStar(toggle: () => 'starred' | 'unstarred') {
    const timerRef = React.useRef<number | null>(null);
    const longFired = React.useRef(false);
    const startPt = React.useRef<{ x: number; y: number } | null>(null);
    const [floatId, setFloatId] = React.useState(0);
    const [floatDown, setFloatDown] = React.useState(false);

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
            const r = toggle();
            setFloatDown(r !== 'starred');
            setFloatId((n) => n + 1);
        }, 460);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (timerRef.current == null || !startPt.current) return;
        const dx = e.clientX - startPt.current.x;
        const dy = e.clientY - startPt.current.y;
        if (dx * dx + dy * dy > 100) clearTimer();
    };
    const endPress = () => clearTimer();

    return {
        floatId,
        floatDown,
        longFired,
        handlers: {
            onPointerDown,
            onPointerMove,
            onPointerUp: endPress,
            onPointerLeave: endPress,
            onPointerCancel: endPress,
            onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
        },
    };
}
